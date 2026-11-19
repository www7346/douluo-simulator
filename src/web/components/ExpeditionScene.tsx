import {useEffect,useRef,useState} from 'react';
import {useSceneQuery} from '../use-game-query';
import QueryStatus from '../components/QueryStatus';
import QuerySurface from '../components/QuerySurface';

import {playerText} from '../../runtime/player-text';
import {useGame} from '../game-context';
import {Button,Modal,ModalActions} from '../components';
import type {PageId} from '../App';
import UiIcon from './UiIcon';
import DungeonSymbol,{type DungeonSymbolKind} from './DungeonSymbol';
import {dungeonMapLayout} from '../dungeon-map-layout';
import {RingChoices,RingInspection} from './RingWorkbench';
import PartyRingAllocation from './PartyRingAllocation';
import {ExpeditionBossWarning} from './ExpeditionRisk';

const LABELS:Record<string,string>={'普通战斗':'魂兽','精英战斗':'精英','首领战斗':'首领','宝箱':'宝箱','火堆':'营火'};
export default function ExpeditionScene({onNavigate:_onNavigate}:{onNavigate:(page:PageId)=>void}) {
  const {state,controller,view}=useGame();
  const expedition=state.远征.当前,room=expedition.currentRoom;
  const facts=useSceneQuery('scene.expedition',{},expedition.id);
  const actions=facts.data?.actions??{availableNodeIds:[],finish:{losses:[]},extract:{available:false,reasons:[],losses:[]}};
  const [ringId,setRingId]=useState(''),[details,setDetails]=useState(false);
  const [departure,setDeparture]=useState<{nodeId?:string;losses:any[]}|null>(null);
  const guard=useRef(false),scroll=useRef<HTMLDivElement>(null);
  const [mapHeight,setMapHeight]=useState(0);
  useEffect(()=>{const el=scroll.current;if(!el)return;const observer=new ResizeObserver(()=>setMapHeight(el.clientHeight));observer.observe(el);return()=>observer.disconnect();},[Boolean(facts.data)]);
  const available=new Set(actions.availableNodeIds);
  const upcomingBosses=actions.availableNodeIds.map((id:string)=>expedition.map.nodes[id]).filter((node:any)=>node.type==='首领战斗');
  const {height,positions,floors}=dungeonMapLayout(expedition.map.layers,mapHeight);
  useEffect(()=>{const point=positions.get(room?.nodeId??actions.availableNodeIds[0]);if(point&&scroll.current)scroll.current.scrollTop=Math.max(0,point.y-scroll.current.clientHeight*.65);},[expedition.id,room?.nodeId,Boolean(facts.data)]);
  const run=async(type:string,payload:Record<string,unknown>={})=>{if(guard.current)return;guard.current=true;try{await controller.dispatch(type,payload);}catch{}finally{guard.current=false;}};
  const depart=async(nodeId?:string,confirmed=false)=>{
    if(guard.current)return;
    const losses=nodeId?actions.finish.losses:actions.extract.losses;
    if(losses.length&&!confirmed){setDeparture({nodeId,losses});return;}
    guard.current=true;setDeparture(null);
    try{if(nodeId)await controller.enterExpeditionRoom(nodeId,confirmed);else await controller.dispatch('expedition.extract',{confirmAbandon:confirmed});}catch{}finally{guard.current=false;}
  };
  const lossText=(loss:any)=>loss.kind==='camp'?'尚未使用的营火':loss.kind==='chest'?'尚未开启的宝箱':`${playerText(loss.name,state,'魂兽')} · ${loss.kind==='ring'?`${loss.years}年魂环${loss.pendingId?'及待选魂技':''}`:'尚未采集的材料'}`;
  const roomLabel=room?LABELS[room.type]:'副本入口';
  const roomProse=playerText(room?.narrative?.sceneDescription,state,room?.type==='火堆'?'温暖的火光驱散林中的寒意。在这里稍作休整，再走向更深的森林。':room?.type==='宝箱'?'林叶掩映的遗迹间，一只宝箱静候来人。此行的收获，留待归途细数。':room?'眼前的道路逐渐清晰，留意周围的踪迹。':'选择地图上亮起的路线，踏入森林深处。');
  if(!facts.data)return <QueryStatus query={facts}/>;
  return <QuerySurface query={facts}><section className="dungeon-scene dungeon-atlas">
    <div className="dungeon-chart">
      <header className="dungeon-heading"><DungeonSymbol kind={room?.type??'普通战斗'}/><h1>{room?`第${room.layer}层`:'入口'} · {actions.availableNodeIds.length?'选择下一处去向':'此行的足迹'}</h1><p>森林深处，<br/>藏着更强大的魂兽，也有意想不到的机缘。</p></header>
      {upcomingBosses.map((node:any)=><ExpeditionBossWarning key={node.id} roster={node.encounter.roster} playerLevel={state.成长.列表[state.角色.主控单位ID]?.魂力等级??1} readiness={actions.readiness}/>)}
      <div className="dungeon-map" ref={scroll} aria-label="副本分叉路线"><div className="dungeon-map__surface" style={{height}}>
        {floors.map(floor=><div className="dungeon-floor" key={floor.layer} style={{top:floor.y}}><b>第{floor.layer}层</b><span>{floor.layer===1?'初始森林':floor.layer===expedition.map.layers.length?'深林之巅':'林间岔路'}</span></div>)}
        <svg className="dungeon-routes" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" aria-hidden="true">{expedition.map.edges.map((edge:any,index:number)=>{const a=positions.get(edge.from)!,b=positions.get(edge.to)!;return <path key={index} d={`M${a.x} ${a.y} C${a.x} ${(a.y+b.y)/2},${b.x} ${(a.y+b.y)/2},${b.x} ${b.y}`} className={available.has(edge.to)&&(expedition.completedNodeIds.includes(edge.from)||room?.nodeId===edge.from)?'is-open':expedition.completedNodeIds.includes(edge.from)&&expedition.completedNodeIds.includes(edge.to)?'is-travelled':''}/>;})}</svg>
        <svg className="dungeon-compass" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="30"/><circle cx="50" cy="50" r="35"/><path d="M50 2 59 41 98 50 59 59 50 98 41 59 2 50 41 41ZM50 50 50 2 41 41ZM50 50 98 50 59 41ZM50 50 50 98 59 59ZM50 50 2 50 41 59Z"/><path d="M22 22 78 78M22 78 78 22"/></svg>
        {expedition.map.layers.flatMap((layer:any)=>layer.nodeIds.map((id:string)=>{const node=expedition.map.nodes[id],point=positions.get(id)!,enabled=available.has(id),current=room?.nodeId===id,complete=node.status==='completed';return <button key={id} style={{left:`${point.x}%`,top:point.y}} disabled={!enabled||view.busy} className={`dungeon-node${complete?' is-complete':''}${enabled?' is-open':''}${current?' is-current':''}`} onClick={()=>void depart(id)} data-testid={`route-${id}`} aria-label={`第${layer.layer}层${LABELS[node.type]}${current?'，当前位置':complete?'，已走过':enabled?'，可前往':'，暂不可前往'}`}><i><DungeonSymbol kind={complete&&!current?'completed':node.type as DungeonSymbolKind}/></i><b>{LABELS[node.type]}</b>{(current||enabled)&&<small>{current?'当前房间':'可前往'}</small>}</button>;}))}
        <div className="dungeon-entry" style={{top:height-19}}>{facts.data.difficultyName} · 已走过 {expedition.completedNodeIds.length} 处</div>
      </div></div>
      <div className="dungeon-legend"><span><i className="legend-current"/>当前房间</span><span><i className="legend-open"/>可前往</span><span><i className="legend-locked"/>不可前往</span><span><DungeonSymbol kind="completed"/>已完成</span>{Object.entries(LABELS).map(([type,label])=><span key={type}><DungeonSymbol kind={type as DungeonSymbolKind}/>{label}</span>)}</div>
    </div>
    <section className={`dungeon-room${expedition.phase==='postcombat'?' dungeon-room--loot':''}`}>
      <div className="dungeon-room__story"><div className="dungeon-room__title"><h2>当前房间 · {roomLabel}</h2>{room&&<button className="dungeon-story-detail" onClick={()=>setDetails(true)} aria-label="查看场景详情"><UiIcon name="book"/></button>}</div><div className={`dungeon-room__vignette${room?.type==='火堆'?' is-camp':room?.type==='宝箱'?' is-chest':''}`} aria-hidden="true"/><p>{roomProse}</p></div>
      <div className="dungeon-room__controls">
        {expedition.phase==='awaiting-narrative'?<div className="field-actions"><p>前方景象正在展开。选择的房间已保留。</p><Button disabled={view.busy} onClick={()=>void controller.resumeExpeditionNarrative().catch(()=>undefined)}>继续探索前方</Button></div>:<>
          {room?.type==='火堆'&&<Button className="dungeon-room-primary" disabled={room.campUsed||view.busy} onClick={()=>void run('expedition.use-camp')}><DungeonSymbol kind="火堆"/><span>{room.campUsed?'已在此休息':'休息 · 恢复三成生命与魂力'}</span><UiIcon name="forward"/></Button>}
          {room?.type==='宝箱'&&<Button className="dungeon-room-primary" disabled={room.opened||view.busy} onClick={()=>void run('expedition.open-chest')}><DungeonSymbol kind="宝箱"/><span>{room.opened?'宝箱已收入此行收获':'开启宝箱'}</span><UiIcon name="forward"/></Button>}
          {expedition.phase==='postcombat'&&<div className="dungeon-loot">{room?.roster?.filter((beast:any)=>state.战斗单位.列表[beast.unitId]?.存活状态==='死亡').map((beast:any)=><div key={beast.unitId}><b>{playerText(beast.name,state,'魂兽')}</b><span>{beast.years}年</span>{room.harvestedUnitIds.includes(beast.unitId)?<span>材料已收取</span>:<Button variant="secondary" disabled={view.busy} onClick={()=>void run('expedition.harvest',{beastUnitId:beast.unitId})}>收取材料</Button>}<Button disabled={view.busy} onClick={()=>setRingId(beast.unitId)}>查看魂环</Button><PartyRingAllocation beastUnitId={beast.unitId}/></div>)}</div>}
          {!room&&<p className="dungeon-room-hint">点击地图上亮起的节点，进入对应房间。</p>}
        </>}
        <ModalActions disabled={facts.loading||Boolean(facts.error)}><Button variant="secondary" disabled={!actions.extract.available||view.busy} onClick={()=>void depart()} data-testid="extract-safely"><DungeonSymbol kind="escape"/><span>{actions.finish.boss?'完成此行，返回入口':'安全撤离'}</span><UiIcon name="forward"/></Button>{!actions.extract.available&&<small>{playerText(actions.extract.reasons[0],state)}</small>}</ModalActions>
      </div>
    </section>
    <RingChoices/>
    {ringId&&<RingInspection key={`${view.profileId}:${ringId}`} beastUnitId={ringId} onClose={()=>setRingId('')}/>}
    <Modal open={Boolean(departure)} title={departure?.nodeId?'前往下一处':'安全撤离，返回入口'} onClose={()=>setDeparture(null)} actions={<><Button variant="ghost" onClick={()=>setDeparture(null)}>返回处理</Button><Button disabled={view.busy} onClick={()=>void depart(departure?.nodeId,true)}>确认放弃并离开</Button></>}><p>离开后，以下尚未取得的收获将留在此处。魂环和待选魂技将消散。</p><ul>{departure?.losses.map((loss,index)=><li key={index}>{lossText(loss)}</li>)}</ul><p>{departure?.nodeId?'已采集的收获仍随行，安全撤离后带回；共同收获返程后自动结算。':'已经采集的材料与物品会带回；共同收获返程后自动结算。'}</p></Modal>
    <Modal open={details} title={playerText(room?.narrative?.sceneTitle,state,'当前房间')} onClose={()=>setDetails(false)}><p>{roomProse}</p></Modal>

  </section></QuerySurface>;
}
