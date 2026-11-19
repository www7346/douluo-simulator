import {useEffect,useLayoutEffect,useMemo,useRef,useState,type CSSProperties} from 'react';
import {competitionLayout,BRACKET_METRICS} from '../../runtime/competition-layout';
import CompetitionPortrait from './CompetitionPortrait';
import UiIcon from './UiIcon';

export default function TournamentBracket({tournament,selectedId,onSelect,onPerson}:{tournament:any;selectedId:string;onSelect:(id:string)=>void;onPerson:(person:any)=>void}) {
 const viewport=useRef<HTMLDivElement>(null),[mobile,setMobile]=useState(()=>window.innerWidth<700);
 const [camera,setCamera]=useState({zoom:1,overview:false});
 const drag=useRef<{x:number;y:number;left:number;top:number}|null>(null);
 const pending=useRef<{x:number;y:number}|null>(null);
 const layout=useMemo(()=>competitionLayout(tournament.rounds,mobile),[tournament.rounds,mobile]);
 const zoom=camera.zoom;
 const center=()=>{const el=viewport.current;return el?{x:(el.scrollLeft+el.clientWidth/2)/zoom,y:(el.scrollTop+el.clientHeight/2)/zoom}:{x:0,y:0};};
 const reveal=(id:string)=>{const node=layout.nodes.find(n=>n.id===id);if(!node)return;pending.current={x:node.x+node.width/2,y:node.y+node.height/2-BRACKET_METRICS.headingRail/2};setCamera({zoom:1,overview:false});};
 const select=(id:string)=>{onSelect(id);reveal(id);};
 const fit=()=>{const el=viewport.current;if(!el)return;pending.current={x:layout.width/2,y:layout.height/2};setCamera({zoom:Math.min(1,el.clientWidth/layout.width,el.clientHeight/layout.height),overview:true});};
 const changeZoom=(delta:number)=>{pending.current=center();const next=Math.max(.35,Math.min(1.5,zoom+delta));setCamera({zoom:next,overview:next<1});};
 useEffect(()=>{const update=()=>setMobile(window.innerWidth<700);window.addEventListener('resize',update);return()=>window.removeEventListener('resize',update);},[]);
 useLayoutEffect(()=>{if(selectedId)reveal(selectedId);},[selectedId,tournament.id]);
 useLayoutEffect(()=>{const el=viewport.current,p=pending.current;if(!el||!p)return;el.scrollTo({left:p.x*zoom-el.clientWidth/2,top:p.y*zoom-el.clientHeight/2});pending.current=null;},[camera,layout]);
 // Resizing never fits the chart or resets zoom. Preserve the point being viewed.
 const live=useRef({zoom,layout});live.current={zoom,layout};
 useLayoutEffect(()=>{
  const el=viewport.current;if(!el)return;
  let width=el.clientWidth,height=el.clientHeight,lastLayout=layout;
  const observer=new ResizeObserver(()=>{
   const latest=live.current;
   let x=(el.scrollLeft+width/2)/latest.zoom,y=(el.scrollTop+height/2)/latest.zoom;
   if(lastLayout!==latest.layout){
    const anchor=lastLayout.nodes.reduce((best,n)=>Math.hypot(n.x+n.width/2-x,n.y+n.height/2-y)<Math.hypot(best.x+best.width/2-x,best.y+best.height/2-y)?n:best,lastLayout.nodes[0]);
    const next=latest.layout.nodes.find(n=>n.id===anchor?.id);if(next){x+=next.x-anchor.x;y+=next.y-anchor.y;}
   }
   el.scrollTo({left:x*latest.zoom-el.clientWidth/2,top:y*latest.zoom-el.clientHeight/2});
   width=el.clientWidth;height=el.clientHeight;lastLayout=latest.layout;
  });observer.observe(el);return()=>observer.disconnect();
 },[tournament.id]);
 const related=new Set([selectedId,...layout.edges.filter(edge=>edge.id===selectedId||edge.to===selectedId).flatMap(edge=>[edge.id,edge.to])]);
 const vars={'--match-width':`${BRACKET_METRICS.width}px`,'--match-label':`${BRACKET_METRICS.label}px`,'--match-row':`${BRACKET_METRICS.row}px`} as CSSProperties;
 const final=layout.nodes.at(-1);
 return <section className={`competition-chart ${camera.overview?'is-overview':''}`} aria-label="十六人淘汰赛程" style={vars}>
  <div className="competition-chart__tools"><div><b>晋级之路</b><span>{camera.overview?'全局总览 · 点击对局放大查看':'拖动查看赛程 · 点击选手查看资料'}</span></div><div>
   <button onClick={()=>changeZoom(-.1)} aria-label="缩小赛程"><UiIcon name="minus"/></button><output aria-label="赛程缩放">{Math.round(zoom*100)}%</output><button onClick={()=>changeZoom(.1)} aria-label="放大赛程"><UiIcon name="plus"/></button>
   <button onClick={fit} aria-pressed={camera.overview}>完整赛程</button><button onClick={()=>{const id=tournament.current?.id??tournament.rounds.flatMap((r:any)=>r.matches).filter((m:any)=>m.players.some((p:any)=>p.isPlayer)).at(-1)?.id;if(id)select(id);}}>定位我的比赛</button>
  </div></div>
  {mobile&&<nav className="competition-chart__rounds" aria-label="选择轮次">{tournament.rounds.map((round:any)=><button key={round.id} onClick={()=>{const node=round.matches.find((m:any)=>m.players.some((p:any)=>p.isPlayer))??round.matches[0];select(node.id);}}>{round.label}</button>)}</nav>}
  <div ref={viewport} className="competition-chart__viewport" tabIndex={0} aria-label="可拖动赛程，使用缩放或轮次按钮查看" onPointerDown={e=>{if(e.pointerType==='touch'||(e.target as HTMLElement).closest('button'))return;const el=viewport.current!;drag.current={x:e.clientX,y:e.clientY,left:el.scrollLeft,top:el.scrollTop};el.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(!drag.current)return;const el=viewport.current!;el.scrollLeft=drag.current.left-(e.clientX-drag.current.x);el.scrollTop=drag.current.top-(e.clientY-drag.current.y);}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
   <div className="competition-chart__scroll-area" style={{width:layout.width*zoom,height:layout.height*zoom}}><div className="competition-chart__heading-rail"><div style={{width:layout.width,height:BRACKET_METRICS.headingRail,transform:`scale(${zoom})`}}>{layout.headings.map(({x,label})=><h3 className="competition-chart__heading" key={x} style={{left:x}}>{label}</h3>)}</div></div><div className="competition-chart__canvas" style={{width:layout.width,height:layout.height,transform:`scale(${zoom})`}}>
    <svg width={layout.width} height={layout.height} aria-hidden="true">{layout.edges.map(edge=><path key={edge.id} data-from={edge.id} data-to={edge.to} data-slot={edge.slot} className={`${edge.resolved?'is-resolved':''} ${edge.player?'is-player':''} ${related.has(edge.id)&&related.has(edge.to)?'is-related':''}`} d={edge.path}/>)}</svg>
    {!mobile&&final&&<div className="competition-chart__trophy" style={{left:final.x,top:115}}><UiIcon name="cup"/><span>{tournament.complete?'本届冠军':'向冠军进发'}</span><strong>{tournament.complete?tournament.champion:'斗魂之巅'}</strong></div>}
    {layout.nodes.map(({match,x,y,width,height})=><article key={match.id} data-match-id={match.id} className={`competition-match ${match.current?'is-current':''} ${match.resolved?'is-resolved':''} ${selectedId===match.id?'is-selected':''}`} style={{left:x,top:y,width,height}}>
     <button className="competition-match__label" aria-label={`查看第${match.number}场 ${match.roundLabel} ${match.status}`} aria-pressed={selectedId===match.id} onClick={()=>select(match.id)}><span>第 {match.number} 场</span><span>{match.current?'你的比赛 · ':''}{match.status}</span></button>
     {match.players.map((person:any,slot:number)=><button key={slot} className={`competition-match__person ${person.won?'is-winner':''} ${person.lost?'is-loser':''}`} disabled={person.waiting&&!camera.overview} title={person.waiting?`${person.name} · ${person.sourceLabel}`:person.name} aria-label={person.waiting?`${person.name} ${person.sourceLabel}`:`查看选手 ${person.name}`} onClick={()=>{select(match.id);if(!camera.overview&&!person.waiting)onPerson(person);}}><span className="competition-avatar"><CompetitionPortrait person={person}/></span><span className="competition-match__identity"><b><span>{person.name}</span>{person.isPlayer&&<em>你</em>}</b><small>{person.waiting?person.sourceLabel:`${person.level} 级${person.won?' · 晋级':person.lost?' · 淘汰':''}`}</small></span><i>{person.won?'胜':person.lost?'负':''}</i></button>)}
    </article>)}
    {!mobile&&final&&<p className="competition-chart__caption" style={{left:final.x-30,top:final.y+final.height+45}}>左右半区会师决赛<br/>金色为你的晋级路线</p>}
   </div></div>
  </div>
  <div className="competition-chart__legend"><span>○ 待开赛</span><span>◆ 当前对局</span><span>✓ 已结束</span><span>{camera.overview?'总览中 · 点击任一对局恢复正常大小':'保持正常大小 · 可左右、上下拖动'}</span></div>
 </section>;
}
