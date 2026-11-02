import {useEffect,useState} from 'react';
import {useSceneQuery} from '../use-game-query';
import {useGame} from '../game-context';
import {unitPortrait} from '../../runtime/visual-identity';
import {PortraitImage} from './PortraitArt';
import {figurePortrait} from '../figure-portraits';
import {unitFigure} from '../fantasy-art';
import QuerySurface from './QuerySurface';
import CustodyPerson from './CustodyPerson';
import SealingPanel from './SealingPanel';

const PAGES=[['people','人物'],['sealing','封神台']] as const;
export default function CustodyPanel({active=true,onClose=()=>{}}:{active?:boolean;onClose?:()=>void}){
 const {state}=useGame(),[page,setPage]=useState('people'),[selected,setSelected]=useState(''),[visited,setVisited]=useState<string[]>([]);
 const query=useSceneQuery<any>('scene.custody',{scope:'index'},'custody-index',{enabled:active}),people=query.data?.people??[];
 const personId=people.some((p:any)=>p.personId===selected)?selected:people[0]?.personId??'';
 const pages=PAGES.filter(([id])=>id!=='sealing'||query.data?.hasSealing),currentPage=pages.some(([id])=>id===page)?page:'people';
 const key=JSON.stringify([currentPage,currentPage==='people'?personId:'']);
 useEffect(()=>{if(query.data&&!query.data.hasSealing&&page==='sealing')setPage('people');},[query.data?.hasSealing,page]);
 useEffect(()=>{if(active)setVisited(v=>v.includes(key)?v:[...v,key]);},[active,key]);
 return <div className="captivity" data-testid="captivity-workspace">
  <nav className="captivity__nav" aria-label="囚禁分类">{pages.map(([id,label])=><button key={id} aria-current={currentPage===id?'page':undefined} onClick={()=>setPage(id)}>{label}{id==='people'&&query.data?.pendingCount>0&&<span className="captivity__badge">{query.data.pendingCount}</span>}</button>)}</nav>
  <QuerySurface query={query}>
   {currentPage==='people'&&<aside className="captivity__roster" aria-label="相关人物"><header><span>相关人物</span><small>{people.length}人</small></header>{people.map((p:any)=><button key={p.personId} className="captivity__person" aria-pressed={personId===p.personId} onClick={()=>setSelected(p.personId)}>{unitPortrait(state,p.personId)&&<PortraitImage art={figurePortrait(unitFigure(state,p.personId)??'')??unitPortrait(state,p.personId)!} name={p.personName}/>}<span><strong>{p.personName}</strong><small>{p.label}</small></span>{p.self&&<em>本人</em>}</button>)}{!people.length&&<p className="captivity__empty">眼下没有与你相关的囚禁或待处置人物。</p>}</aside>}
   <main className="captivity__workspace">{currentPage==='people'&&!personId&&<div className="captivity__welcome"><span aria-hidden="true">◇</span><h3>此刻无事牵绊</h3><p>眼下没有与你相关的拘束或安置事项。</p></div>}
   {visited.map(k=>{const [kind,id]=JSON.parse(k);return <section key={k} hidden={k!==key} className="captivity__view">{kind==='people'?id&&<CustodyPerson personId={id} active={active&&k===key} onClose={onClose}/>:<CustodyObjects kind={kind} active={active&&k===key} onClose={onClose}/>}</section>;})}</main>
  </QuerySurface>
 </div>;
}
function CustodyObjects({kind,active,onClose}:{kind:string;active:boolean;onClose:()=>void}){
 const query=useSceneQuery<any>('scene.custody',{scope:kind},kind,{enabled:active});
 return <QuerySurface query={query}>{query.data&&kind==='sealing'&&<><header className="captivity__section-head"><div><small>囚禁、封存与开罩</small><h3>封神台</h3></div></header><SealingPanel active={active} facts={query.data.sealing} onClose={onClose}/>{!query.data.sealing.self&&!query.data.sealing.devices.length&&<p className="captivity__empty">附近没有可查看的封神台。</p>}</>}</QuerySurface>;
}
