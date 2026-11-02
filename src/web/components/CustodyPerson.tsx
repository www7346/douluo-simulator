import TargetFieldAbilities from './TargetFieldAbilities';
import {useEffect,useState} from 'react';
import {useGame} from '../game-context';
import {useSceneQuery} from '../use-game-query';
import {useActionFeedback} from '../use-action-feedback';
import {ActionSection,Button,Modal,Progress} from '../components';
import QuerySurface from './QuerySurface';
import ActionFeedback from './ActionFeedback';
import {PowerLimitSummary} from './PowerLimitFields';
import {PersonWornRestraints} from './WornRestraints';
import {SelfCustodyConsent,CaptiveSearch} from './CustodyPersonalActions';
import CooperationPanel from './CooperationPanel';
import CooperationPreparationPanel from './CooperationPreparationPanel';
import CustodyLogisticsPanel from './CustodyLogisticsPanel';
import CustodyTradePanel from './CustodyTradePanel';
import CustodyAuctionPanel from './CustodyAuctionPanel';
import FieldControlPanel from './FieldControlPanel';
import ControlledGiftPanel from './ControlledGiftPanel';
import SealingPanel,{SealingSelfActions} from './SealingPanel';

const SECTIONS=[['sealing','封神台'],['bindings','拘束'],['placement','安置'],['cooperation','合作'],['disposition','处置']] as const;
export default function CustodyPerson({personId,active,onClose}:{personId:string;active:boolean;onClose:()=>void}){
 const {view,controller}=useGame(),[section,setSection]=useState(''),[visited,setVisited]=useState<string[]>([]),[escape,setEscape]=useState(''),[waitMinutes,setWaitMinutes]=useState(60),feedback=useActionFeedback();
 const query=useSceneQuery<any>('scene.custody',{scope:'person',selectedPersonId:personId},personId,{enabled:active}),p=query.data;
 const [notice,setNotice]=useState('');
 useEffect(()=>{setVisited(v=>v.includes(section)?v:[...v,section]);},[section]);
 const currentSection=p?.sections?.includes(section)?section:p?.sections?.[0]??'';
 const choices=p?.captivity?.choices??[],choice=choices.find((c:any)=>c.statusId===escape)??choices[0];
 const act=async(type:string,payload:any,message:string)=>{if(await feedback.run(()=>controller.dispatch(type,payload)))setNotice(message);};
 return <QuerySurface query={query}>{p&&<><header className="captivity__section-head"><div><small>{p.self?'我的处境':p.custodianName?'关押中':'相关事项'}</small><h3>{p.name}</h3><p>{p.locationName}{p.room&&' · '+p.room}{p.custodianName&&` · 关押者：${p.custodianName}`}</p></div><span className="captivity__state">{p.sealed?(p.sealed.known===false?'封罩关闭':p.sealed.mode==='awake'?'闭罩清醒':'静滞封存'):p.self&&p.captivity?'被囚禁':p.self?'当前处境':p.defeat?'待处置':p.custodianName?'关押中':p.canInitiate?'可安排':'待回应'}</span></header>
  <div className="captivity__condition">{p.resources&&<div className="captivity__vitals"><Progress label="生命" value={p.resources.生命.当前} maximum={p.resources.生命.最大} tone="life"/><Progress label="魂力" value={p.resources.魂力.当前} maximum={p.resources.魂力.最大} tone="soul"/></div>}{p.power&&<PowerLimitSummary power={p.power}/>}</div>
  <ActionFeedback feedback={feedback}/>{notice&&<p className="captivity__notice" role="status">{notice}</p>}
  {p.self&&p.sealed?<SealingSelfActions self={p.sealed} targets={p.conversationTargets} active={active} onClose={onClose}/>:p.self&&p.captivity&&<section className="captivity__task"><h4>尝试脱困</h4>
   {choices.length>0?<><label>脱困方式<select aria-label="脱困方式" value={choice?.statusId??''} onChange={e=>setEscape(e.target.value)}>{choices.map((c:any)=><option key={c.statusId} value={c.statusId}>{c.label}{c.dc?` · 难度${c.dc}`:''}</option>)}</select></label><Button disabled={view.busy} onClick={()=>void act('world.escape-captivity',{statusId:choice.statusId},'这次脱困尝试已结束，请查看当前处境。')}>尝试脱困 · 10分钟</Button></>:<p>眼下还没有可尝试的脱困方式。</p>}
   <div className="field-actions"><Button variant="secondary" disabled={view.busy} onClick={async()=>{if(await feedback.run(()=>controller.openStoryConversation(p.captivity.custodianId,'请放我离开。')))onClose();}}>请求放行</Button><select aria-label="等待时长" value={waitMinutes} onChange={e=>setWaitMinutes(Number(e.target.value))}><option value={60}>一小时</option><option value={1440}>一天</option></select><Button variant="ghost" disabled={view.busy} onClick={()=>void act('world.intent',{type:'captive-daily',minutes:waitMinutes},'等待已结束，请查看周围的变化。')}>等待</Button></div>
  </section>}
  {p.defeat&&<DefeatTask record={p.defeat} devices={p.devices}/>}
  <TargetFieldAbilities personId={personId}/><nav className="captivity__subnav" aria-label={`${p.name}的囚禁互动`}>{SECTIONS.filter(([id])=>p.sections.includes(id)).map(([id,label])=><button key={id} aria-current={currentSection===id?'page':undefined} onClick={()=>setSection(id)}>{label}</button>)}</nav>
  {[...new Set([...visited,currentSection])].filter(s=>s&&p.sections.includes(s)).map(s=><section key={s} hidden={s!==currentSection}><PersonSection scope={s} personId={personId} self={p.self} active={active&&s===currentSection} onClose={onClose}/></section>)}
 </>}</QuerySurface>;
}
function DefeatTask({record,devices}:{record:any;devices:any[]}){
 const {view,controller}=useGame(),[items,setItems]=useState<string[]>([]),[confirm,setConfirm]=useState(false),feedback=useActionFeedback();
 const run=async(type:string)=>{if(await feedback.run(()=>controller.dispatch('world.intent',{type,targetId:record.targetId,defeatId:record.id,...(type==='capture-person'?{restraintItemIds:items}:{})})))setConfirm(false);};
 return <section className="captivity__task"><h4>战后处置</h4><TargetFieldAbilities personId={record.targetId}/><ActionFeedback feedback={feedback}/>{record.reason?<p>{record.reason}</p>:<><fieldset><legend>选择捕获用的拘束器</legend>{devices.map(d=><label key={d.id}><input type="checkbox" checked={items.includes(d.id)} disabled={view.busy||d.durability<=0||d.quantity!==1} onChange={e=>setItems(e.target.checked?[...items,d.id]:items.filter(id=>id!==d.id))}/>{d.name} · 最高{d.maxLevel}级</label>)}{!devices.length&&<p>行囊里还没有拘束器，可到商店准备。</p>}</fieldset><div className="field-actions"><Button disabled={view.busy||!items.length} onClick={()=>void run('capture-person')}>捕获</Button><Button variant="secondary" disabled={view.busy} onClick={()=>void run('spare-person')}>放过</Button><Button variant="ghost" disabled={view.busy} onClick={()=>setConfirm(true)}>处决…</Button></div></>}<Modal open={confirm} title={`处决${record.targetName}`} onClose={()=>setConfirm(false)} actions={<Button disabled={view.busy} onClick={()=>void run('execute-person')}>确认处决</Button>}><p>此人将死亡，留下遗体与随身财物。</p><ActionFeedback feedback={feedback}/></Modal></section>;
}
function PersonSection({scope,personId,self,active,onClose}:{scope:string;personId:string;self:boolean;active:boolean;onClose:()=>void}){
 const {view,controller}=useGame(),[controlOpen,setControlOpen]=useState(false),feedback=useActionFeedback();
 const query=useSceneQuery<any>('scene.custody',{scope,selectedPersonId:personId},scope+personId,{enabled:active}),control=useSceneQuery<any>('scene.custody',{scope:'control',selectedPersonId:personId},'control'+personId,{enabled:active&&controlOpen});
 const f=query.data;
 return <QuerySurface query={query}>{f&&(scope==='sealing'?<SealingPanel active={active} facts={f.sealing} onClose={onClose}/>:scope==='bindings'?<>
  <PersonWornRestraints personId={personId} active={active}/><BindingRequests facts={f} active={active}/>
   {!self&&f.availableDevices?.length>0&&<ActionSection title={<>选择拘束器与装配方式</>} className="captivity__drawer"><ActionFeedback feedback={feedback}/>{f.availableDevices.map((d:any)=><article key={d.itemId}><strong>{d.name}</strong><p>{d.available?'可以装配':d.reason}</p><div className="field-actions"><Button variant="secondary" disabled={view.busy||!d.available} onClick={()=>void feedback.run(()=>controller.dispatch('world.intent',{type:'attach-restraint',targetId:personId,itemId:d.itemId}))}>装配</Button>{!d.available&&<Button variant="ghost" disabled={view.busy||!d.canRequest} onClick={()=>void feedback.run(()=>controller.dispatch('world.intent',{type:'request-restraint-permission',targetId:personId,itemId:d.itemId}))}>请求配合</Button>}</div>{!d.available&&d.requestReason&&<p className="muted">{d.requestReason}</p>}</article>)}</ActionSection>}
   {!self&&!f.availableDevices?.length&&<p className="muted">行囊里还没有可用于此人的拘束器，可先到商店准备；强行装配仍须满足目标状态要求。</p>}
  {!self&&f.hasControl&&<ActionSection title={<>精神与灵魂控制</>} className="captivity__drawer" onOpenChange={setControlOpen}>{controlOpen&&<QuerySurface query={control}>{control.data&&(control.data.fieldControlOptions.length||control.data.fieldOrders.length?<FieldControlPanel key={personId} active={active&&controlOpen} facts={control.data}/>:<p className="captivity__empty">你目前无法向此人下达控制命令。</p>)}</QuerySurface>}</ActionSection>}
 </>:scope==='placement'?<CustodyLogisticsPanel active={active} selectedPersonId={personId} facts={f}/>:scope==='cooperation'?<><CooperationPanel facts={f} targetId={personId} hideProposal={self}/><CooperationPreparationPanel facts={f}/><ControlledGiftPanel gifts={f.gifts}/></>:<>{!self&&f.held.length>0&&<CaptiveSearch active={active} targetId={personId}/>}<CustodyTradePanel facts={f}/><CustodyAuctionPanel active={active} facts={f} onOpen={onClose}/>{f.canManageRelease&&<section className="captivity__task"><h4>放行</h4><p>放此人离开，并拆下你能解除的拘束器。</p>{f.releaseReason&&<p role="status">{f.releaseReason}</p>}<ActionFeedback feedback={feedback}/><Button variant="secondary" disabled={view.busy||!f.canRelease} onClick={()=>void feedback.run(()=>controller.dispatch('world.intent',{type:'release-captive',targetId:personId}))}>释放</Button></section>}{!f.canRelease&&!f.tradeOptions.length&&!f.trades.length&&!f.auctions.length&&<p className="captivity__empty">当前没有可办理的买卖或转交。</p>}</>)}</QuerySurface>;
}
function BindingRequests({facts,active}:{facts:any;active:boolean}){
 const {view,controller}=useGame(),feedback=useActionFeedback();
 const act=(payload:any)=>feedback.run(()=>controller.dispatch('world.intent',payload));
 return <><ActionFeedback feedback={feedback}/>{facts.permissionRequests.filter((p:any)=>p.status==='pending').map((p:any)=><section key={p.id} className="captivity__task"><h4>装配请求</h4><p>{p.operatorName}希望给{p.wearerName}装配{p.itemName}。</p>{p.canRespond?<div className="field-actions">{[true,false].map(accept=><Button key={String(accept)} variant={accept?'primary':'secondary'} disabled={view.busy} onClick={()=>void act({type:'respond-restraint-permission-request',permissionId:p.id,accept,reason:accept?'我同意这次装配。':'我拒绝这次装配。'})}>{accept?'同意这一次':'拒绝'}</Button>)}</div>:<p className="muted">等待对方回应。</p>}</section>)}{facts.permissions.map((p:any)=><p key={p.id}>{p.wearerName}已允许{p.operatorName}装配{p.itemName}一次。{p.canRevoke&&<Button variant="ghost" disabled={view.busy} onClick={()=>void act({type:'revoke-restraint-permission',permissionId:p.id})}>撤回许可</Button>}</p>)}{facts.selectedPersonId===facts.viewerId&&<SelfCustodyConsent active={active} kind="restraints"/>}</>;
}
