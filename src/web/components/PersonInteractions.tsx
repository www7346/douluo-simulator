import TargetFieldAbilities from './TargetFieldAbilities';
import PersonGrowth from './PersonGrowth';
import {useState,type ReactNode} from 'react';
import {useGame} from '../game-context';
import {useServerQuery} from '../use-game-query';
import {Button} from '../components';
import QueryStatus from './QueryStatus';
import PersonCooperation from './PersonCooperation';
import PersonRewritePanel from './PersonRewritePanel';
import CustodyPerson from './CustodyPerson';
import PersonCombatActions from './PersonCombatActions';
import {MedicineActions} from './ItemDetails';
import CompanionPanel from './CompanionPanel';
import PersonEquipment from './PersonEquipment';
const pages=[['items','使用物品','选择药剂与随身物品'],['abilities','使用能力','查看消耗、条件并施放'],['equipment','装备与器具','查看佩戴物品和装卸操作'],['growth','培养与魂环','安排修炼或分配魂环'],['cooperation','同行与合作','商量同行和配合方式'],['custody','拘束与安置','查看实际权限与收容条件'],['combat','切磋与战斗','切磋、死斗与交战条件']] as const;
export default function PersonInteractions({characterId,onOpen,extraActions,hireDungeonId}:{characterId:string;onOpen?:()=>void;extraActions?:ReactNode;hireDungeonId?:string}){
 const {controller,view}=useGame(),query=useServerQuery('character.interactions',{characterId}),[error,setError]=useState(''),[itemId,setItemId]=useState(''),[page,setPage]=useState('home');if(!query.data)return <QueryStatus query={query}/>;
 const data=query.data,busy=view.busy||!!view.modelTask;
 const quick=async(action:'contact'|'party')=>{setError('');try{await controller.quickStoryAction(characterId,action,onOpen);}catch(e){setError((e as Error).message);}};
 const open=async()=>{setError('');try{await controller.openStoryConversation(characterId);onOpen?.();}catch(e){setError((e as Error).message);}};
 const title=pages.find(entry=>entry[0]===page)?.[1];
 return <section className="person-interactions" aria-label={`${data.name}的互动`}>
  {error&&<p role="alert">{error}</p>}
  {page==='home'?<><div className="person-interaction-primary"><Button disabled={busy||!data.registered&&!!data.block} onClick={()=>void open()}>{data.communication.available?'私聊':'查看私聊记录'}</Button>{data.actions.map((action:any)=><Button key={action.id} variant="secondary" disabled={busy||!!action.reason} title={action.reason||undefined} onClick={()=>void quick(action.id)}>{action.label}</Button>)}</div>
   {data.block&&<p className="muted">{data.block}</p>}{data.member&&<p className="person-membership">{data.member.membership==='long-term'?'长期队友':'临时队友'} · {data.member.present?'当前在场':'暂不在场'}</p>}
   <div className="person-interaction-grid">{pages.filter(([id])=>data.registered||id==='combat').map(([id,label,description])=><button key={id} onClick={()=>{setError('');setPage(id);}}><strong>{label}</strong><span>{description}</span></button>)}</div>
   <div className="person-hire-entry"><CompanionPanel dungeonId={hireDungeonId} characterId={characterId} label="雇佣同行" showUnavailable/></div>{extraActions}{data.registered&&<PersonRewritePanel targetId={data.personId}/>}</>:<>
   <header className="person-interaction-page-heading"><Button variant="ghost" onClick={()=>setPage('home')}>‹ 返回互动</Button><h3>{title}</h3></header>
   {page==='items'&&(data.medicineItems?.length?<><label>选择物品<select value={itemId} onChange={e=>setItemId(e.target.value)}><option value="">选择行囊里的物品</option>{data.medicineItems.map((item:any)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{data.medicineItems.filter((item:any)=>item.id===itemId).map((item:any)=><MedicineActions key={item.id+data.personId} itemId={item.id} options={item.options} fixedTargetId={data.personId}/>)}</>:<p className="muted">行囊里没有可对这位人物使用的药剂或物品。</p>)}
   {page==='abilities'&&<TargetFieldAbilities personId={data.personId} showEmpty inline/>}
   {page==='equipment'&&<PersonEquipment personId={data.personId}/>}
   {page==='growth'&&<PersonGrowth personId={data.personId} expanded/>}
   {page==='cooperation'&&<>{typeof data.attitude==='number'&&<p>对你的态度 <strong>{data.attitude}</strong></p>}<PersonCooperation personId={data.personId} expanded/></>}
   {page==='custody'&&<><TargetFieldAbilities personId={data.personId} captureOnly inline/><PersonCustodyContext personId={data.personId} onClose={()=>onOpen?.()}/></>}
   {page==='combat'&&<PersonCombatActions characterId={characterId} personId={data.personId} name={data.name} combat={data.combat} onOpen={onOpen}/>}
  </>}
 </section>;
}
function PersonCustodyContext({personId,onClose}:{personId:string;onClose:()=>void}){
 const query=useServerQuery<any>('scene.custody',{scope:'entry',selectedPersonId:personId});if(!query.data)return <QueryStatus query={query}/>;if(!query.data.available)return <p className="muted">当前没有可对这位人物进行的拘束或安置操作。</p>;return <CustodyPerson personId={personId} active onClose={onClose}/>;
}
