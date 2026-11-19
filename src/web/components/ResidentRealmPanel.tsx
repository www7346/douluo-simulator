import './resident-realm.css';
import PersonLink from './PersonLink';
import CharacterPortrait from './CharacterPortrait';
import {useEffect,useId,useRef,useState} from 'react';
import {ActionSection,Button,Progress} from '../components';
import {useGame} from '../game-context';
import {useSceneQuery,useServerQuery} from '../use-game-query';
import {useActionFeedback} from '../use-action-feedback';
import QueryStatus from './QueryStatus';
import ActionFeedback from './ActionFeedback';
import PersonGrowth from './PersonGrowth';
import PersonEquipment from './PersonEquipment';
import {initialRealmSelection,OUTSIDE_REALM_VIEW,realmArrangementPrompt,residentsInRealmRegion} from '../../shared/resident-realm-ui';

const arrangementLabels:Record<string,string>={fixture:'房内固定',hands:'手部装备',legs:'腿部装备',footwear:'鞋履',mouth:'发声装备'};
const fixtureLabels:Record<string,string>={free:'未使用房间固定',cross:'十字架固定',suspended:'悬吊固定',cage:'金属笼'};
const restrictionLabels:Record<string,string>={vision:'视觉观察',hearing:'听觉感知',voice:'发声',gesture:'手部动作',movement:'身体移动',contact:'接触','soul-power':'运转魂力','martial-soul':'使用武魂',ingest:'经口吞服',focus:'保持专注'};
const equipmentLabels:Record<string,Record<string,string>>={hands:{front:'双手在前',back:'双手在后'},legs:{limited:'步幅受限',locked:'双腿固定'},footwear:{heels:'高跟鞋'},mouth:{gag:'口部限制'}};
export interface ResidentRealmPanelProps {realmId?:string;personId?:string;onArrange?:(text?:string)=>void}
export interface ResidentRealmViewProps {realm:any;themes?:any[];initialPersonId?:string;onArrange?:(text?:string)=>void;onSelectPerson?:(id:string)=>void;actionsLoading?:boolean}
const ready=(quote:any)=>quote?.available===true;

export default function ResidentRealmPanel({realmId,personId,onArrange}:ResidentRealmPanelProps={}){
 const {view}=useGame(),[chosenRealm,setChosenRealm]=useState(''),[quotePersonId,setQuotePersonId]=useState<string|undefined>(personId);
 useEffect(()=>setQuotePersonId(personId),[realmId,personId,view.sessionId]);
 const query=useSceneQuery<any>('presentation.resident-realms',{scope:'overview',...(quotePersonId?{selectedPersonId:quotePersonId}:{})},realmId??'owned-realms');
 if(!query.data)return <QueryStatus query={query}/>;
 const realms=query.data.realms??[],realm=realmId?realms.find((r:any)=>r.id===realmId):realms.find((r:any)=>r.id===chosenRealm)??realms[0];
 if(!realm)return realmId?<p className="muted">当前没有可查看的这处空间。</p>:null;
 return <div className="resident-realm">
  <QueryStatus query={query}/>
  {!realmId&&realms.length>1&&<label className="resident-scroll__realm-choice">查看空间<select value={realm.id} onChange={event=>setChosenRealm(event.target.value)}>{realms.map((r:any)=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>}
  <ResidentRealmView key={view.sessionId+':'+realm.id} realm={realm} themes={query.data.themes??[]} initialPersonId={quotePersonId??personId} onArrange={onArrange} onSelectPerson={setQuotePersonId} actionsLoading={query.loading||Boolean(query.error)}/>
 </div>;
}

/** Present only the server's actual regions, residents and action previews. */
export function ResidentRealmView({realm,themes=[],initialPersonId,onArrange,onSelectPerson,actionsLoading=false}:ResidentRealmViewProps){
 const {state,view,controller}=useGame(),feedback=useActionFeedback(),detailId=useId(),[selection,setSelection]=useState(()=>initialRealmSelection(realm,initialPersonId));
 useEffect(()=>{if(initialPersonId)setSelection(initialRealmSelection(realm,initialPersonId));},[initialPersonId,realm.id]);
 const selectedPerson=realm.slots.find((entry:any)=>entry.personId===selection.personId),followRegion=selectedPerson?.regionId||OUTSIDE_REALM_VIEW;
 const regionId=selectedPerson?followRegion:selection.regionId,region=realm.regions.find((entry:any)=>entry.id===regionId),residents=residentsInRealmRegion(realm,regionId),slot=residents.find((entry:any)=>entry.personId===selection.personId)??residents[0];
 const outside=residentsInRealmRegion(realm,OUTSIDE_REALM_VIEW),theme=region?.environment?.themeId??'courtyard',notifiedPerson=useRef('');
 useEffect(()=>{if(slot?.personId&&notifiedPerson.current!==slot.personId){notifiedPerson.current=slot.personId;onSelectPerson?.(slot.personId);}},[slot?.personId,onSelectPerson]);
 const chooseRegion=(id:string)=>setSelection({regionId:id,personId:residentsInRealmRegion(realm,id)[0]?.personId??''});
 const arrange=()=>onArrange?.(realmArrangementPrompt(realm.name,slot?.name,region?.name));
 return <section className="resident-scroll" data-theme={theme} aria-label={`${realm.name}${realm.permanent?'画卷':'收容空间'}`}>
  <header className="resident-scroll__heading"><div><span className="resident-scroll__eyebrow">{realm.permanent?'独立画境 · 展卷观人':'独立空间 · 居民'}</span><h2>{realm.name}</h2></div><p>{realm.permanent?'已绑定':'已收容'} <b>{realm.slots.length}</b> / {realm.maximum} 人<span>已开放 {realm.unlocked} 席</span></p>{onArrange&&<Button variant="secondary" disabled={view.busy} onClick={arrange}>交给主持人安排</Button>}</header>
  {realm.reason&&<p className="resident-scroll__reason" role="status">{realm.reason}</p>}
  <ActionFeedback feedback={feedback}/>{realm.permanent&&<ActionSection title="邀请入住"><p>伴侣或态度达到 40 的朋友可受邀做客，自由活动和修炼。</p>{(realm.invitees??[]).map((p:any)=><Button key={p.id} disabled={!onArrange||view.busy} onClick={()=>onArrange?.('邀请'+p.name+'自愿入住我的'+realm.name+'的'+(region?.name??'公共区')+'，请她自己决定。')}>邀请{p.name}</Button>)}{(realm.guests??[]).map((p:any)=><div key={p.id}><strong>{p.name} · 住客</strong>{onArrange&&<Button disabled={view.busy} onClick={()=>onArrange('邀请住客'+p.name+'出画随我同行参战，等她自己决定是否加入队伍。')}>邀请出画同行</Button>}<span>{realm.regions.find((a:any)=>a.id===p.regionId)?.name}</span>{region&&region.id!==p.regionId&&<Button onClick={()=>void feedback.run(()=>controller.dispatch('world.intent',{type:'move-realm-guest',realmId:realm.id,targetId:p.id,regionId:region.id}))}>入住{region.name}</Button>}<Button onClick={()=>void feedback.run(()=>controller.dispatch('world.intent',{type:'end-realm-visit',realmId:realm.id,targetId:p.id}))}>送客出画</Button></div>)}</ActionSection>}
  <nav className="resident-scroll__rooms" aria-label="选择画境区域">
   {realm.regions.map((entry:any)=>{const occupants=residentsInRealmRegion(realm,entry.id),roomGuests=(realm.guests??[]).filter((g:any)=>g.regionId===entry.id),names=[...occupants,...roomGuests].map((p:any)=>p.name);return <button key={entry.id} type="button" className={`resident-scroll__room${entry.id==='common'?' is-common':''}`} aria-pressed={regionId===entry.id} aria-controls={detailId} onClick={()=>chooseRegion(entry.id)}><span className="resident-scroll__room-art" data-theme={entry.environment?.themeId??'courtyard'} aria-hidden="true"><i/><i/><i/>{names.length>0&&<b>{names.length}</b>}</span><span className="resident-scroll__room-fixtures">{Array.from(new Set<string>(occupants.map((person:any)=>String(person.arrangement?.fixture??'free')))).filter(fixture=>fixture!=='free').map(fixture=><em key={fixture}>{fixtureLabels[fixture]??'固定'}</em>)}</span><strong>{entry.name}</strong><small>{names.length?names.join('、'):'暂无人物'}</small></button>;})}
   {outside.length>0&&<button type="button" className="resident-scroll__room is-outside" aria-pressed={regionId===OUTSIDE_REALM_VIEW} aria-controls={detailId} onClick={()=>chooseRegion(OUTSIDE_REALM_VIEW)}><span className="resident-scroll__room-art" aria-hidden="true">↗<b>{outside.length}</b></span><strong>出画人物</strong><small>{outside.map((person:any)=>person.name).join('、')}</small></button>}
  </nav>
  <section id={detailId} className="resident-scroll__content" aria-label={region?.name??'出画人物'}>
   <header className="resident-scroll__region-heading"><h3>{region?.name??'出画人物'}</h3><p>{region?.environment?.description??'人物当前在画境外，原席位与实际状态保留。'}</p></header>
   {residents.length>1&&<nav className="resident-scroll__people" aria-label="选择当前区域人物">{residents.map((entry:any)=><button type="button" key={entry.personId} aria-pressed={slot?.personId===entry.personId} onClick={()=>setSelection({regionId,personId:entry.personId})}><CharacterPortrait person={entry.person} state={state} showBinding={false}/><span>{entry.name}</span><small>第{entry.index}席</small></button>)}</nav>}
   {actionsLoading&&<p className="muted" role="status">正在核对可用安排…</p>}
   <fieldset className="resident-scroll__action-scope" disabled={actionsLoading} aria-label="当前人物与区域安排">{slot?<Resident key={slot.id} realm={realm} slot={slot} themes={themes} onArrange={onArrange}/>:<div className="resident-scroll__empty"><span aria-hidden="true">{regionId==='common'?'庭':'静'}</span><h3>此处暂时无人</h3><p>{regionId==='common'?'人物可以在公共区相处。房间与公共区中的人物，仍保留各自真实的装备、许可和经历。':'可在其他区域选择人物，再安排其来这里生活。'}</p>{onArrange&&<Button variant="secondary" disabled={view.busy} onClick={arrange}>告诉主持人</Button>}<ActionSection title={<>手动安排<span>区域环境</span></>} className="resident-scroll__manual"><div className="resident-scroll__manual-content">{region&&<Region realm={realm} region={region} themes={themes}/>}</div></ActionSection></div>}</fieldset>
  </section>
  <footer className="resident-scroll__footer">{realm.permanent?'一环一席，九房一庭；同一人物保留原有经历。':`空间将于世界时间第 ${realm.expiresAt} 分钟结束。`}</footer>
 </section>;
}

function Resident({realm,slot,themes,onArrange}:{realm:any;slot:any;themes:any[];onArrange?:ResidentRealmPanelProps['onArrange']}){
 const [equipmentOpen,setEquipmentOpen]=useState(false);
 const {controller,view,state}=useGame(),feedback=useActionFeedback(),fixture=slot.arrangement?.fixture??'free',arrangement=slot.arrangement??{},shameValue=typeof slot.shame==='number'?slot.shame:slot.shame?.value??slot.shame?.current;
 const equipment=slot.equipment?.length?slot.equipment.map((item:any)=>({key:item.id,text:item.name})):Object.entries(arrangementLabels).filter(([key])=>key!=='fixture'&&arrangement[key]&&arrangement[key]!=='free').map(([key,label])=>{const option=slot.arrangementOptions?.[key]?.find((entry:any)=>entry.id===arrangement[key]),item=(arrangement.items??slot.items??[]).find((entry:any)=>entry.group===key);return {key,text:item?.name??option?.label??equipmentLabels[key]?.[arrangement[key]]??`${label}已生效`};});
 return <article className="resident-scroll__resident">
  <div className="resident-scroll__stage"><div className="resident-scroll__figure"><PersonLink personId={slot.personId}><CharacterPortrait person={slot.person} state={state} large showBinding={false}/></PersonLink><span className="resident-scroll__art-caption">人物原立绘</span>{fixture!=='free'&&<FixtureDiagram fixture={fixture}/>}</div>
   <div className="resident-scroll__identity"><span className="resident-scroll__eyebrow">第{slot.index}席 · {slot.level}级{slot.dead?' · 已死亡':''}</span><h3>{slot.name}</h3>{slot.ringLink&&<p className="resident-scroll__ring">第{slot.index}魂环 · {slot.ringLink.years}年<span>属性增幅 {slot.ringLink.percent}%</span></p>}
    <dl className="resident-scroll__facts"><div><dt>服从度</dt><dd>{slot.obedience??'未知'}<small> / 100</small></dd></div><div><dt>对你的态度</dt><dd>{slot.attitude}</dd></div>{typeof shameValue==='number'&&<div><dt>羞耻</dt><dd>{shameValue}</dd></div>}</dl>
    <div className="resident-scroll__equipment" aria-label="当前固定与装备"><span>{fixtureLabels[fixture]??'当前固定'}</span>{equipment.map((item:any)=><span key={item.key}>{item.text}</span>)}</div>{slot.effectiveRestrictions?.length>0&&<p className="resident-scroll__restrictions">当前受限：{[...new Set<string>(slot.effectiveRestrictions.map((key:string)=>restrictionLabels[key]??'其他活动'))].join('、')}</p>}{fixture!=='free'&&<p className="resident-scroll__illustration-note">右下为固定方式示意；原立绘未改为对应姿态。</p>}
    {slot.health&&<Progress label="生命" value={slot.health.当前} maximum={slot.health.最大} tone="life"/>}
    <div className="resident-scroll__primary"><Button disabled={view.busy||slot.dead||!slot.communication?.available} onClick={()=>void feedback.run(()=>controller.openStoryConversation(slot.personId))}>与{slot.name}私聊</Button>{onArrange&&<Button variant="ghost" disabled={view.busy} onClick={()=>onArrange(realmArrangementPrompt(realm.name,slot.name))}>告诉主持人</Button>}</div>
    {slot.communication?.reason&&<p className="muted" role="status">{slot.communication.reason}</p>}<div className="field-actions"><ActionFeedback feedback={feedback}/><PersonLink className="button button--secondary" personId={slot.personId}>查看状态、治疗与用药</PersonLink><Button variant="secondary" disabled={view.busy||!ready(slot.recovery)} onClick={()=>void feedback.run(()=>controller.dispatch('world.intent',{type:'safe-point-recover',targetId:slot.personId}))}>休整恢复</Button></div>{slot.recovery?.reason&&<p className="muted">{slot.recovery.reason}</p>}<ResidentDeployment realm={realm} slot={slot} showTactics={false}/>
    <ActionSection title="查看与更换装备" open={equipmentOpen} onOpenChange={setEquipmentOpen}>{equipmentOpen&&<PersonEquipment personId={slot.personId}/>}</ActionSection>
   </div>
  </div>
  <ResidentManual realm={realm} slot={slot} themes={themes} onArrange={onArrange}/>
 </article>;
}

/** Neutral diagram, never a claim that the original illustration changed pose. */
export function FixtureDiagram({fixture}:{fixture:string}){
 const cage=fixture==='cage',cross=fixture==='cross',suspended=fixture==='suspended';
 if(!cage&&!cross&&!suspended)return null;
 return <figure className="resident-scroll__fixture" data-fixture={fixture}><svg viewBox="0 0 120 160" role="img" aria-label={`${fixtureLabels[fixture]}姿态示意`}><g className="fixture-structure" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">{cross?<><path d="M60 12V146M15 53H105"/><path d="M51 146H69"/></>:cage?<><path d="M17 143V35Q60 0 103 35V143ZM17 35H103M17 143H103"/>{[32,47,73,88].map(x=><path key={x} d={`M${x} 27V143`}/>)}</>:<><path d="M22 13H98M39 13V42M81 13V42"/><path d="M27 149H93"/></>}</g><g className="fixture-person" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"><circle cx="60" cy={suspended?54:43} r="11" fill="currentColor" stroke="none"/><path d={suspended?'M60 74V109M60 77L39 43M60 77L81 43M60 109L48 139M60 109L72 139':cross?'M60 64V104M60 67L24 54M60 67L96 54M60 104L45 137M60 104L75 137':'M60 63V103M60 68L43 89M60 68L77 89M60 103L48 134M60 103L72 134'}/></g></svg><figcaption>{fixtureLabels[fixture]}<small>设施与姿态示意</small></figcaption></figure>;
}

function ResidentManual({realm:overview,slot:resident,themes,onArrange}:{realm:any;slot:any;themes:any[];onArrange?:ResidentRealmPanelProps['onArrange']}){
 const {controller,view}=useGame(),feedback=useActionFeedback(),[manualOpen,setManualOpen]=useState(false),[regionChoice,setRegionChoice]=useState(resident.regionId||overview.regions[0]?.id);
 const needsDetail=overview.detailScope==='overview';
 const detail=useServerQuery('presentation.resident-realms',{scope:'management',selectedPersonId:resident.personId},{enabled:manualOpen&&needsDetail});
 const realm=detail.data?.realms?.find((r:any)=>r.id===overview.id)??overview,slot=realm.slots?.find((s:any)=>s.personId===resident.personId)??resident,region=realm.regions.find((entry:any)=>entry.id===regionChoice)??realm.regions[0];
 const run=(payload:any)=>feedback.run(()=>controller.dispatch('world.intent',{realmId:realm.id,targetId:slot.personId,...payload}));
 return <ActionSection title={<>手动安排<span>房间、装备、许可与培养</span></>} className="resident-scroll__manual" onOpenChange={setManualOpen}>{manualOpen&&needsDetail&&!detail.data?<QueryStatus query={detail}/>:manualOpen&&<div className="resident-scroll__manual-content"><ActionFeedback feedback={feedback}/>
  {slot.regionId&&<ActionSection title={<>居住与固定</>}><label>所在区域<select value={slot.regionId} disabled={view.busy||!(slot.moveOptions??[]).some(ready)} onChange={event=>void run({type:'arrange-realm-resident',regionId:event.target.value})}>{(slot.moveOptions??[]).map((option:any)=><option key={option.regionId} value={option.regionId} disabled={!ready(option)}>{option.name}{option.reason?' · '+option.reason:''}</option>)}</select></label>{Object.entries(arrangementLabels).map(([key,label])=>{const options=slot.arrangementOptions?.[key]??[];return <label key={key}>{label}<select value={slot.arrangement?.[key]??'free'} disabled={view.busy||!options.some(ready)} onChange={event=>void run({type:'set-realm-arrangement',[key]:event.target.value})}>{options.length?options.map((option:any)=><option key={option.id} value={option.id} disabled={!ready(option)}>{option.label}{option.reason?' · '+option.reason:''}</option>):<option value={slot.arrangement?.[key]??'free'}>当前无可用安排</option>}</select></label>;})}</ActionSection>}
  {slot.regionId&&<ActionSection title={<>活动许可</>}><fieldset><legend>当前许可</legend>{(slot.permissionOptions??[]).map((option:any)=><label className="toggle-row" key={option.key}><input type="checkbox" checked={slot.permissions?.[option.key]??false} disabled={view.busy||!ready(option)} onChange={event=>void run({type:'set-resident-permissions',permissions:{[option.key]:event.target.checked}})}/><span>{option.label}{option.reason&&<small>{option.reason}</small>}</span></label>)}</fieldset>{!(slot.permissionOptions??[]).length&&<p className="muted">当前没有可手动修改的许可。</p>}</ActionSection>}
  <ActionSection title={<>区域主题</>}><label>查看区域<select value={region?.id??''} onChange={event=>setRegionChoice(event.target.value)}>{realm.regions.map((entry:any)=><option key={entry.id} value={entry.id}>{entry.name} · {entry.members.length}人</option>)}</select></label>{region&&<Region key={region.id} realm={realm} region={region} themes={themes}/>}</ActionSection>
  {Object.keys(realm.treatments??{}).length>0&&slot.regionId&&<ActionSection title={<>奖励与处罚</>}><p className="muted">实际经历带来的服从度提升，今日已增长 {slot.gainedToday??0} / {realm.dailyPositiveLimit} 点；真身出战门槛 {slot.realBodyThreshold}。</p> {(slot.kindness??[]).map((e:any)=><p key={e.sourceId}>{e.name} · 态度 {e.before} → {e.after}</p>)}{slot.recentCare&&<p>{slot.recentCare.name} · 态度 {slot.recentCare.before} → {slot.recentCare.after}</p>}{slot.lastObedience&&<p>服从 · {slot.lastObedience.reason} · {slot.lastObedience.before??0} → {slot.lastObedience.after}</p>}
     <div className="field-actions">{(slot.treatmentOptions??[]).filter((option:any)=>option.method!=='shock').map((option:any)=><Button key={option.kind+option.method} variant={option.kind==='reward'?'primary':'secondary'} disabled={view.busy||!ready(option)} onClick={()=>void run({type:option.kind==='reward'?'reward-resident':'punish-resident',method:option.method})}>{option.label}{typeof option.cost==='number'?` · 魂力${option.cost}`:''}</Button>)}</div>{(slot.treatmentOptions??[]).filter((o:any)=>o.kind==='reward'&&!ready(o)).map((o:any)=><p key={o.method}>{o.label} · {o.reason}</p>)}<ResidentShock realm={realm} slot={slot}/></ActionSection>}
  <ActionSection title={<>培养与成长</>}><PersonGrowth personId={slot.personId} expanded/></ActionSection>
  <ResidentAgreement realm={realm} slot={slot} onArrange={onArrange}/><ResidentTactics realm={realm} slot={slot}/>
 </div>}</ActionSection>;
}

function Region({realm,region,themes}:{realm:any;region:any;themes:any[]}){
 const {controller,view}=useGame(),feedback=useActionFeedback(),[description,setDescription]=useState(region.environment.description),[themeId,setThemeId]=useState(region.environment.themeId);
 return <section><p>{region.environment.description}</p><label>环境主题<select value={themeId} disabled={view.busy||!ready(region.reshape)} onChange={event=>setThemeId(event.target.value)}>{themes.map((theme:any)=><option key={theme.id} value={theme.id}>{theme.label}</option>)}</select></label><label>环境描述<textarea maxLength={1200} value={description} disabled={view.busy||!ready(region.reshape)} onChange={event=>setDescription(event.target.value)}/></label><ActionFeedback feedback={feedback}/><Button disabled={view.busy||!ready(region.reshape)||!description.trim()} onClick={()=>void feedback.run(()=>controller.dispatch('world.intent',{type:'reshape-realm',realmId:realm.id,regionId:region.id,environment:{themeId,description}}))}>改变环境</Button><p className="muted">主题与景物描述用于场景呈现，实际能力效果以正式状态为准。</p></section>;
}


export function ResidentDeployment({realm,slot,showTactics=true}:{realm:any;slot:any;showTactics?:boolean}){
 const {controller,view}=useGame(),feedback=useActionFeedback(),run=(input:any)=>feedback.run(()=>controller.dispatch('world.intent',{realmId:realm.id,targetId:slot.personId,...input}));
 return <section className="resident-deployment">{slot.projectionPolicy&&<p className="muted">{slot.projectionPolicy.sharedSoulPower?'本具投影沿用旧规则：施法取画主魂力，召回后再召可使用新规则。':'投影的生命和魂力上限取原人物的80%，保留命中，以自身魂力施法。'}伤害、治疗与护盾{slot.projectionPolicy.percent}%。首次召唤{slot.projectionPolicy.cost}、同场重召{slot.projectionPolicy.resummonCost}魂力，每画主回合每具{slot.projectionPolicy.upkeep}魂力。击散后可在画主下一次行动重召。</p>}<ActionFeedback feedback={feedback}/>{slot.deployment?<><p>{slot.deployment.mode==='body'?'真身':'投影'}{slot.deployment.status==='active'?'正在参战':'已准备出战'}。主动收回时返回。</p><Button disabled={view.busy||!ready(slot.recall)} variant="secondary" onClick={()=>void run({type:'recall-resident'})}>收回出战</Button></>:<div className="field-actions">{(slot.deployOptions??[]).map((option:any)=><div key={option.mode}><Button disabled={view.busy||!ready(option)} onClick={()=>void run({type:'deploy-resident',mode:option.mode})}>{option.mode==='body'?'真身出战':`召出投影 · 输出${slot.projectionPercent}%`}{typeof option.receipt?.cost==='number'?` · 魂力${option.receipt.cost}`:''}</Button>{option.reason&&<p className="muted">{option.reason}</p>}</div>)}</div>}{showTactics&&<ResidentTactics realm={realm} slot={slot}/>}</section>;
}

function ResidentTactics({realm,slot}:{realm:any;slot:any}){
 const {controller,view}=useGame(),feedback=useActionFeedback(),[text,setText]=useState('根据各自能力自主战斗，保留部分魂力应对变故。'),[reservePercent,setReserve]=useState(10);
 return <ActionSection title={<>战前沟通</>}><ActionFeedback feedback={feedback}/><label>战术安排<textarea value={text} maxLength={600} onChange={event=>setText(event.target.value)}/></label><label>魂力保留比例<input type="number" min={0} max={100} value={reservePercent} onChange={event=>setReserve(Number(event.target.value))}/></label><Button disabled={view.busy||!ready(slot.tactics)||!text.trim()} onClick={()=>void feedback.run(()=>controller.dispatch('world.intent',{type:'discuss-resident-tactics',realmId:realm.id,targetId:slot.personId,text,reservePercent}))}>沟通安排</Button></ActionSection>;
}

export function ResidentShock({realm,slot}:{realm:any;slot:any}){
 const {controller,view}=useGame(),feedback=useActionFeedback();if(!realm.treatments?.punish?.shock)return null;
 return <section><ActionFeedback feedback={feedback}/><Button variant="secondary" disabled={view.busy||!ready(slot.shock)} onClick={()=>void feedback.run(()=>controller.dispatch('world.intent',{type:'punish-resident',realmId:realm.id,targetId:slot.personId,method:'shock'}))}>项圈电击 · 魂力{realm.treatments.punish.shock.cost}</Button><p className="muted">{slot.shock?.reason||'电击作用于当前意识载体；雷抗性与护盾正常生效。'}</p></section>;
}

function ResidentAgreement({realm,slot,onArrange}:{realm:any;slot:any;onArrange?:ResidentRealmPanelProps['onArrange']}){
 const {controller,view}=useGame(),feedback=useActionFeedback(),labels:Record<string,string>={proposed:'等待本人回应',active:'履行中',fulfilled:'已履约',breached:'已违约',rejected:'已拒绝',ended:'已结束'};
 return <ActionSection title={<>沟通与协议</>}><ActionFeedback feedback={feedback}/>{(slot.agreements??[]).map((record:any)=><section key={record.id}><p>{record.terms.description} · {record.terms.service.minutes}分钟 · {labels[record.status]}</p>{record.events.filter((event:any)=>event.reason).map((event:any)=><p key={event.id}>{event.reason}</p>)}{record.status==='proposed'&&<><p>{record.responseReason||'等待人物回应，需启用模型。'}</p><Button disabled={view.busy||!!record.responseReason} onClick={()=>void feedback.run(()=>controller.respondPerformanceAgreement(record.id))}>等待回应／重试</Button></>}{['proposed','active'].includes(record.status)&&<Button variant="ghost" disabled={view.busy} onClick={()=>void feedback.run(()=>controller.dispatch('world.intent',{type:'end-performance-agreement',agreementId:record.id}))}>结束协议</Button>}</section>)}{onArrange&&<Button variant="secondary" disabled={view.busy} onClick={()=>onArrange(`我想与${realm.name}中的${slot.name}提出一份协议：`)}>告诉主持人协议内容</Button>}</ActionSection>;
}
