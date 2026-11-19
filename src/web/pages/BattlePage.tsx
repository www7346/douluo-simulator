import BattleQuickSettings from '../components/BattleQuickSettings';
import SupportConfiguration from '../components/SupportConfiguration';
import '../components/support-configuration.css';
import {battleStoryControlsBlocked} from '../../shared/battle-story-controls';
import {collarAppearance} from '../components/BoundPortrait';
import {deviceLockLabel,deviceOperationKey} from '../../shared/device-operation-display';
import {MedicineBattlePanel,MedicineStatePanel} from '../components/ItemDetails';
import BattleReplayButton from '../components/BattleReplayButton';
import {soulYearsLabel} from '../../runtime/ability-sources';
import BattleConsole from '../components/BattleConsole';
import StoryChat from '../components/StoryChat';
import '../battle-story.css';
import {battleTurns} from '../battle-playback';
import {useEffect,useMemo,useRef,useState} from 'react';
import PowerLimitFields,{PowerLimitSummary,RESTRAINT_MODE_LABELS} from '../components/PowerLimitFields';
import {useSceneQuery} from '../use-game-query';
import QueryStatus from '../components/QueryStatus';
import type {BattleViewFrame} from '../../runtime/player-presentation';
import {battleSceneTitle} from '../battle-title';
import {playerText,skillName} from '../../runtime/player-text';
import {ActionSection,Button,Modal,ModalActions} from '../components';
import {BattleBoard} from '../BattleBoard';
import AbilityDetails from '../components/AbilityDetails';
import BattleLog,{BattleRecentLog} from '../components/BattleLog';
import BattleIntel from '../components/BattleIntel';
import BattleUnitPortrait from '../components/BattleUnitPortrait';
import {unitBattleFigure} from '../fantasy-art';
import QuickSoundControl from '../components/QuickSoundControl';
import {useBattlePlayback} from '../use-battle-playback';
import {pendingExpeditionEscape} from '../../runtime/play-scene';

import {currentBattlePlan,defaultBattleBranches} from '../battle-plan';
import {useGame} from '../game-context';
import type {PageId} from '../App';
import {useGameQuery} from '../use-game-query';


const SOURCE_LABELS:Record<string,string>={ordinary:'普通攻击','martial-base':'武魂本能','martial-skill':'武魂技','soul-ring':'魂环技','soul-bone':'魂骨技','soul-device':'魂导器','hidden-weapon':'暗器',consumable:'消耗品',copied:'复制技能','martial-switch':'武魂切换',tactic:'战术'};
type BattlePageProps={onNavigate:(page:PageId)=>void;embedded?:boolean;onPlaybackChange?:(playing:boolean)=>void};
import SummonOrders from '../components/SummonOrders';
export default function BattlePage({onNavigate,embedded=false,onPlaybackChange}:BattlePageProps) {
  const {state,view}=useGame();
  return <BattleScene key={`${view.sessionId}:${state?.战斗?.id ?? ''}`} onNavigate={onNavigate} embedded={embedded} onPlaybackChange={onPlaybackChange}/>;
}

function BattleScene({onNavigate,embedded,onPlaybackChange}:BattlePageProps) {
  const {controller,state,view}=useGame();
  const battle=state.战斗;
  const playerId=state.角色.主控单位ID;
  const actorId=battle?.当前行动单位ID;
  const actor=state.战斗单位?.列表?.[actorId];
  const isPlayerTurn=battle?.状态==='进行中' && battle.扩展?.成员?.[actorId]?.controller==='player';
  const facts=useSceneQuery<{frame:BattleViewFrame;point:any;movement:{walk:number;dash:number};zones:string[]}>('scene.battle',{},battle?.id??'');
  const emptyFrame=useMemo<BattleViewFrame>(()=>({battleId:battle?.id??'',round:0,actorId:'',status:'',units:[]}),[battle?.id]);
  const live=facts.data?.frame??emptyFrame;
  const playback=useBattlePlayback(view.events,live,view.performance);
  useEffect(()=>{onPlaybackChange?.(playback.playing);return()=>onPlaybackChange?.(false);},[playback.playing,onPlaybackChange]);
  const [selectedId,setSelectedId]=useState(playerId);
  const [draft,setPending]=useState<any>(null);
  const autoBattle=Boolean(battle?.扩展?.automation?.enabled);
  const autoStopRequested=view.battlePauseRequested,canTakeOver=autoBattle||Boolean(battle?.扩展?.automation?.waitingStoryTurn);
  const [autoError,setAutoError]=useState('');
  const planContext={sessionId:view.sessionId,battleId:battle?.id,revision:view.snapshot.revision,actorId,isPlayerTurn};
  const draftPlan=currentBattlePlan(draft,planContext);
  const previewQuery=useGameQuery(`battle-preview:${draftPlan?.action.id}:${JSON.stringify(draftPlan?.intent)}`,signal=>controller.previewBattleAction(draftPlan.intent,signal),{enabled:Boolean(draftPlan)});
  const pending=draftPlan?{...draftPlan,preview:previewQuery.data??{ready:false,reason:previewQuery.error??'正在核对目标与魂力消耗…'},targeting:previewQuery.data?.targeting??draftPlan.targeting,copying:previewQuery.data?.copying??draftPlan.copying}:null;
  const pendingItem=state.物品?.实例?.[state.技能?.列表?.[pending?.action.id]?.sourceItemId];
  const [branchId,setBranchId]=useState('');
  const [mode,setMode]=useState<'target'|'move'>('target');
  const [logOpen,setLogOpen]=useState(false);
  const [effectDetailsOpen,setEffectDetailsOpen]=useState(false);
  const planRef=useRef<HTMLElement>(null);
  const fieldRef=useRef<HTMLDivElement>(null);
  const escapeSettlement=useRef('');
  const settlementPending=useRef(false);
  const actionQuery=useSceneQuery<any[]>('battle.actions',{actorId:playerId},battle?.id??'',{enabled:isPlayerTurn&&!autoBattle});
  const deviceQuery=useSceneQuery<any>('presentation.device-operations',{battle:true},battle?.id??'',{enabled:battle?.状态==='进行中'&&!autoBattle&&Boolean(pending&&state.技能?.列表?.[pending.action.id]?.effectGraph?.nodes?.some((n:any)=>['payload.unlock','payload.suppress_lock','payload.rule_break','payload.analyze_lock','payload.create_key','payload.arcane_lock'].includes(n.effectId)))});
  const deviceChoices=(deviceQuery.data?.items??[]).flatMap((item:any)=>item.operations.filter((op:any)=>op.skillId===pending?.action.id).map((op:any)=>({...op,itemId:item.itemId,key:deviceOperationKey(op.intent),label:item.name+' · '+deviceLockLabel(item.locks,op.lockId)})));
  const allActions=useMemo(()=>(actionQuery.data??[]).filter((action:any)=>action.actionType!=='识破伪装').map((action:any)=>{
    const skill=state.技能?.列表?.[action.id],node=skill?.effectGraph?.nodes?.find((n:any)=>n.effectId==='payload.resource_damage');
    const resource=node?live.units.find(unit=>unit.id===playerId)?.resources?.find(pool=>pool.slot===node.params.资源槽&&(!pool.sourceMartialSoulId||pool.sourceMartialSoulId===(skill.sourceMartialSoulId??skill.来源武魂ID))):null;
    return {...action,name:skillName(skill??action,state,'行动'),...(resource?{resourceSummary:`${resource.name} ${resource.current} / ${resource.maximum}`}:{})};
  }),[actionQuery.data,state,live,playerId]);
  const storyPending=battleStoryControlsBlocked(state);
  const locked=storyPending||autoBattle||Boolean(battle?.扩展?.automation?.waitingStoryTurn)||facts.loading||Boolean(facts.error)||view.busy||playback.playing||!isPlayerTurn||actionQuery.loading;
  const turnError=view.battleTurnError?.battleId===battle?.id&&view.battleTurnError?.revision===view.snapshot.revision ? view.battleTurnError.message : null;
  const competitive=battle?.扩展?.竞技;
  const text=(value:unknown,fallback='')=>playerText(value,state,fallback);
  const sourceLabel=(action:any)=>action.sourceKind==='soul-ring'&&action.sourceRingOrdinal>0
    ? `${text(action.sourceMartialSoulName,'武魂')} · 第${action.sourceRingOrdinal}魂环 · ${soulYearsLabel(action.sourceRingYears)}`
    : SOURCE_LABELS[action.sourceKind]??'能力';
  const branches=pending?.preview?.targeting?.branches ?? pending?.targeting?.branches ?? [];
  const branch=branches.find((item:any)=>item.branchId===branchId) ?? branches[0];
  const branchIntent=pending?.intent?.branchTargets?.[branch?.branchId] ?? {};
  const allyChoices=branch?.effectId==='target.allies'?(branch.choices??[]):[];
  const selectedAllyIds:string[]=branchIntent.targetIds??branch?.targetIds??allyChoices.map((choice:any)=>choice.id);
  const selected=playback.frame.units.find(unit=>unit.id===selectedId);
  const activeEvent=playback.event;
  const activeReceipt=activeEvent?.payload as any;
  const lastOwnCast=battleTurns(view.events,battle?.id).filter(event=>event.payload.actorId===playerId&&event.payload.skill).at(-1)?.payload;
  const visibleActor=playback.frame.units.find(unit=>unit.id===(activeEvent?.payload.actorId ?? playback.frame.actorId));

  useEffect(()=>{setPending(null);setMode('target');},[actorId,view.snapshot.revision]);
  useEffect(()=>setEffectDetailsOpen(false),[pending?.action.id,actorId,view.snapshot.revision]);
  useEffect(()=>{if(pending && (pending.action.support||window.matchMedia('(max-width:720px)').matches))planRef.current?.scrollIntoView({block:'start'});},[pending?.action.id]);
  useEffect(()=>{
    if(!storyPending&&!autoBattle&&!autoStopRequested&&!battle?.扩展?.automation?.waitingStoryTurn&&battle?.状态==='进行中'&&!isPlayerTurn&&!view.busy&&!playback.playing&&!turnError&&!facts.loading&&!facts.error) void controller.settleAiTurns().catch(()=>undefined);
  },[storyPending,autoBattle,autoStopRequested,battle?.扩展?.automation?.waitingStoryTurn,battle?.状态,isPlayerTurn,view.busy,playback.playing,view.snapshot.revision,controller,turnError,facts.loading,facts.error]);
  useEffect(()=>{
    if(autoBattle&&!view.busy)void controller.ensureAutomaticBattle().catch(error=>setAutoError((error as Error).message));
  },[storyPending,autoBattle,autoStopRequested,autoError,battle?.状态,view.busy,playback.playing,view.snapshot.revision,controller,facts.loading,facts.error]);
  useEffect(()=>{if(!pending)return;const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setPending(null);};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);},[Boolean(pending)]);

  const evaluate=(current:any,intent:any)=>{
    return {...current,intent,summonChoices:current.preview?.summonChoices??current.summonChoices,preview:{ready:false,reason:'正在核对目标与魂力消耗…'}};
  };
  const chooseAction=(action:any)=>{
    if(locked)return;
    const optionalSelections=defaultBattleBranches(action);
    const intent:any=action.actionType==='切换武魂' ? {actorId,type:'切换武魂',martialSoulId:action.sourceMartialSoulId}
      : action.sourceKind==='tactic' ? {actorId,type:action.actionType,...(action.targetId?{targetId:action.targetId}:{}),...(action.method?{method:action.method}:{}),...(action.residentId?{residentId:action.residentId}:{}),...(action.itemId?{itemId:action.itemId}:{}),...(action.maintenanceSourceId?{maintenanceSourceId:action.maintenanceSourceId}:{}),...(action.statusId?{statusId:action.statusId}:{}),...(action.controlTargetId?{controlTargetId:action.controlTargetId,controlledIntent:action.controlledIntent}:{})}
      : {actorId,type:'技能',skillId:action.id,castRank:action.currentCastRank||action.castOptions?.[0]?.rank,modeId:action.defaultCastMode,branchTargets:optionalSelections};
    if(action.id==='tactic:move')intent.movement={距离区:actor.位置.距离区,战场坐标:facts.data?.point,冲刺:false};
    if(action.restraint){intent.mode='limited';if(action.restraint.supportsFineLimits)intent.limits=action.restraint.limits;}
    const next=evaluate({action,context:planContext},intent);
    setPending(next);setBranchId(action.defaultBranchIds?.[0]??next.targeting?.branches?.[0]?.branchId ?? '');setMode(action.id==='tactic:move' ? 'move' : 'target');setLogOpen(false);
  };
  useEffect(()=>{
    const selectCarriedItem=()=>{
      const itemId=new URLSearchParams(location.hash.split('?')[1]??'').get('item');
      if(!itemId||locked)return;
      const action=allActions.find(entry=>state.技能.列表[entry.id]?.sourceItemId===itemId);
      if(action){chooseAction(action);history.replaceState(null,'','#/battle');}
    };
    selectCarriedItem();window.addEventListener('hashchange',selectCarriedItem);
    return()=>window.removeEventListener('hashchange',selectCarriedItem);
  },[locked,allActions]);
  const changeIntent=(patch:any)=>setPending((current:any)=>current ? evaluate({...current,targeting:pending?.targeting,copying:pending?.copying,summonChoices:pending?.preview.summonChoices??pending?.summonChoices??current.summonChoices},{...current.intent,...patch}) : current);
  const changeCastMode=(modeId:string)=>{
    if(!pending)return;
    const selected=pending.action.modeOptions?.find((option:any)=>option.id===modeId);
    if(selected?.branchIds?.length)setBranchId(selected.branchIds[0]);
    changeIntent({modeId,branchTargets:defaultBattleBranches(pending.action,selected?.branchIds,pending.intent.branchTargets)});
  };
  const changeBranch=(patch:any)=>{
    if(!branch)return;
    const selections={...pending.intent.branchTargets,[branch.branchId]:{...branchIntent,...patch}};
    changeIntent({branchTargets:selections,...(branch.branchId===branches[0]?.branchId ? {targetIds:selections[branch.branchId].targetIds,aimPoint:selections[branch.branchId].aimPoint} : {})});
  };
  const chooseUnit=(id:string)=>{
    setSelectedId(id);
    if(locked||!pending||mode==='move'||(!branch?.needsAim&&!branch?.needsPrimaryTarget))return;
    if(!branch?.choices?.some((choice:any)=>choice.id===id)){const option=branch?.targetOptions?.find((choice:any)=>choice.id===id);changeBranch({targetIds:[],aimPoint:null});controller.notify(text(option?.reason,'当前不能对这位人物施放所选能力'),'info');return;}
    changeBranch({targetIds:[id],aimPoint:null});
  };
  const choosePoint=(point:{x:number;y:number})=>{
    if(locked||!pending)return;
    if(mode==='move')changeIntent({movement:{距离区:actor.位置.距离区,冲刺:false,...pending.intent.movement,战场坐标:point}});
    else if(branch?.needsAim)changeBranch({targetIds:[],aimPoint:point});
  };
  const confirm=async()=>{
    if(locked||!pending?.preview.ready)return;
    try {const intent=pending.intent;await controller.dispatch('battle.action',intent);setPending(null);}catch{}
  };
  const leave=async()=>{
    if(controller.getView().busy||settlementPending.current)return;
    settlementPending.current=true;
    if(playback.playing)playback.skip();
    try {
      if(battle?.状态!=='进行中'&&competitive)await controller.dispatch('arena.reconcile');
      if(battle?.状态!=='进行中'&&!competitive&&state.远征?.当前?.phase==='combat')await controller.dispatch('expedition.resolve-battle');
      onNavigate(competitive?.mode==='solo-competition'?'competition':competitive?.mode==='slaughter-city'?'slaughter':competitive?'world':'adventure');
      if(competitive&&competitive.mode!=='solo-competition'&&competitive.mode!=='slaughter-city')location.hash=`/world?tab=${encodeURIComponent(competitive.mode==='endgame'?'终局挑战':competitive.mode==='slaughter-city'?'杀戮之都':'人物')}`;
    }catch{}finally{settlementPending.current=false;}
  };
  useEffect(()=>{
    const key=`${view.sessionId}:${battle?.id}:${view.snapshot.revision}`;
    if(!pendingExpeditionEscape(state)||view.busy||playback.playing||escapeSettlement.current===key)return;
    escapeSettlement.current=key;
    void leave();
  },[battle?.状态,view.snapshot.revision,view.busy,playback.playing]);
  if(!battle||battle.状态==='未开始')return <div className="battle-empty"><h1>此刻无战事</h1><Button onClick={()=>onNavigate('adventure')}>返回征途</Button></div>;
  if(!facts.data)return <QueryStatus query={facts}/>;
  const effectBranches=pending?.preview?.skill?.effectBranches ?? pending?.action.effectBranches ?? [];
  const copying=pending?.preview.copying ?? pending?.copying;
  const summonChoices=pending?.preview.summonChoices??pending?.summonChoices;
  const inheritedSkillIds:string[]=pending?.intent.summonSkillIds??summonChoices?.defaultSkillIds??[];
  const endstate=state.技能?.列表?.[pending?.action.id]?.effectGraph?.nodes?.find((node:any)=>node.effectId==='payload.resource_endstate')?.params;
  const order=battle.扩展?.先攻顺序 ?? battle.参与者ID列表;
  const actionName=activeReceipt?.skill?skillName(state.技能?.列表?.[activeReceipt.skill.id]??activeReceipt.skill,state,'行动'):text(activeReceipt?.actionType,'行动');
  const clusters=[...new Set(live.units.map(unit=>String(unit.position.站位簇 ?? '')))];

  const playerFrame=playback.frame.units.find(unit=>unit.id===playerId);
  const enemyFrame=selected&&selected.sideId!==playerFrame?.sideId?selected:playback.frame.units.find(unit=>unit.sideId!==playerFrame?.sideId);
  const inspectedFrame=selected&&selected.id!==playerId?selected:enemyFrame;
  const figures=Object.fromEntries(playback.frame.units.map(unit=>[unit.id,unitBattleFigure(state,unit.id,unit.id===playerId?view.figureUrl:'')]));
  const settlementLabel=view.busy?'正在处理战后进度…':competitive?.mode==='solo-competition'?'结算并返回赛事':competitive?.mode==='slaughter-city'?'结算并返回杀戮场':competitive?'结算并返回万象':'处理战后收获';
  const settlementHint=view.busy?'正在处理战后进度，完成后即可继续。':'前往结算，继续你的旅程。';
  if(pending?.action.support)return <section className="combat-support-page" aria-label="持续加持" ref={planRef}>
    <header><div><small>持续支援 · 同伴与投影</small><h1>持续加持</h1></div><Button variant="ghost" onClick={()=>setPending(null)}>返回战场</Button></header>
    <QueryStatus query={previewQuery}/>
    <SupportConfiguration view={pending.preview.support??pending.action.support} selections={pending.intent.supportSelections} onChange={supportSelections=>changeIntent({supportSelections})}/>
    {!pending.preview.ready&&pending.preview.reason&&<p role="status">{text(pending.preview.reason,'正在核对加持')}</p>}
    <ModalActions><Button variant="ghost" onClick={()=>setPending(null)}>取消</Button><Button disabled={locked||!pending.preview.ready} onClick={()=>void confirm()} data-testid="confirm-battle-action">确认加持</Button></ModalActions>
  </section>;
  return <div className={`combat-scene combat-scene--story${pending ? ' combat-scene--planning' : ''}${competitive?' combat-scene--arena':''}`}>
    {battle.状态!=='进行中'&&<ModalActions><span role="status">{settlementHint}</span><Button disabled={view.busy} onClick={()=>void leave()} data-testid="finish-battle">{settlementLabel}</Button></ModalActions>}
    <QueryStatus query={facts}/><header className="combat-header"><div className="combat-title"><small>SOUL RING · BATTLE</small><h1>{battleSceneTitle(battle)}</h1></div><div className="combat-round"><span>第</span><strong>{playback.frame.round}</strong><span>回合</span></div><div className="combat-header__tools"><BattleQuickSettings/><button className="combat-log-toggle" onClick={()=>setLogOpen(!logOpen)} aria-expanded={logOpen}>战斗记录</button><QuickSoundControl/></div></header>
    {battle.状态==='进行中'&&<div><Button disabled={autoStopRequested||!canTakeOver&&(view.busy||playback.playing||facts.loading||Boolean(facts.error))} onClick={()=>{setPending(null);setAutoError('');if(canTakeOver)void controller.pauseAutomaticBattle().catch(e=>setAutoError(e.message));else void controller.dispatch('battle.set-automatic',{enabled:true}).catch(e=>setAutoError(e.message));}}>{autoStopRequested?'正在交还控制…':canTakeOver?'停止自动 · 手动接管':'自动战斗'}</Button>{autoBattle&&<span role="status">自动选择可用行动；当前行动结束后交还控制。</span>}{battle?.扩展?.automation?.steps>=600&&<p role="status">已暂停：本次自动推进达到600次行动，可检查战况后继续。</p>}{autoError&&<p role="alert">{autoError}</p>}</div>}
    {battle?.扩展?.strategy&&<p className="muted" aria-label="当前自动战术">集火：{state.战斗单位.列表[battle.扩展.strategy.focusTargetId]?.名称??'自由选择'}；支援：{state.战斗单位.列表[battle.扩展.strategy.protectTargetId]?.名称??'按战况选择'}；保留魂力：{battle.扩展.strategy.reservePercent}%；{battle.扩展.strategy.retreatPercent?`生命降至${battle.扩展.strategy.retreatPercent}%时尝试撤离`:'未设条件撤离'}。</p>}
    {battle.状态==='已结束'&&<BattleReplayButton/>}
    {battle.状态==='进行中'&&<><MedicineBattlePanel/><MedicineStatePanel/></>}
    {battle?.状态==='进行中'&&battle.参与者ID列表.some((id:string)=>state.战斗单位?.列表[id]?.扩展?.召唤?.接受指令)&&<SummonOrders/>}
    <div className="combat-order" aria-label="行动顺序">{order?.map((id:string,index:number)=>{const unit=playback.frame.units.find(item=>item.id===id);if(!unit)return null;return <button key={id} onClick={()=>chooseUnit(id)} className={id===(activeEvent?.payload.actorId ?? playback.frame.actorId) ? 'is-current' : ''}><span className="combat-order__portrait">{<BattleUnitPortrait name={unit.name} avatarUrl={id===playerId?view.avatarUrl:''} portrait={unit.portrait} figure={figures[id]} appearance={collarAppearance(state,id)}/>}</span><span>{index+1}</span><b>{unit.name}</b>{id===(activeEvent?.payload.actorId ?? playback.frame.actorId)&&<i>行动中</i>}</button>;})}</div>
    <div className={`combat-layout${pending ? ' has-plan' : ''}`}>
      <BattleIntel state={state} unit={inspectedFrame} title={inspectedFrame?.sideId===playerFrame?.sideId?'我方情报':'敌方情报'}/>
      <div className="combat-main" ref={fieldRef}><BattleBoard collars={Object.fromEntries(playback.frame.units.map(unit=>[unit.id,collarAppearance(state,unit.id)]))} movementRadius={actor?(pending?.intent?.movement?.冲刺?facts.data?.movement.dash:facts.data?.movement.walk)??0:0} figures={figures} frame={playback.frame} playerId={playerId} avatarUrl={view.avatarUrl} selectedId={selectedId} onUnit={chooseUnit} onPoint={choosePoint} pending={pending} branch={branch} branchIntent={branchIntent} mode={mode} event={activeEvent} after={playback.after} locked={locked}/>
        <div className="combat-roster" aria-label="战场单位列表">{playback.frame.units.map(unit=><button key={unit.id} onClick={()=>chooseUnit(unit.id)} className={selectedId===unit.id ? 'is-selected' : ''}><span>{unit.name}</span><b>{unit.hp}<small> / {unit.hpMax}</small></b></button>)}</div>
        {pending&&<button className="combat-plan__field-link combat-return-plan" onClick={()=>planRef.current?.scrollIntoView({block:'start'})}>确认目标与行动 ↓</button>}
        <div className="combat-turn-message" data-outcome={!activeEvent&&battle.状态!=='进行中'?battle.扩展?.结果?.outcome:undefined} aria-live="polite">{activeEvent ? <><strong>{visibleActor?.name} · {actionName}</strong><span>{text(activeEvent.summary,'行动已完成')}</span><button onClick={playback.skip}>略过演出{playback.remaining>1 ? `（${playback.remaining}）` : ''}</button></> : <><strong>{battle.状态==='进行中' ? isPlayerTurn ? `${actor?.名称}，轮到你了` : turnError ? '行动暂时中断' : '对手正在行动' : text(battle.扩展?.结果?.outcome,'胜负已分')}</strong><span>{battle.状态==='进行中' ? isPlayerTurn ? '选择行动后，点选目标或调整站位。' : turnError ?? '正在准备下一回合。' : settlementHint}</span>{turnError&&<Button disabled={view.busy} onClick={()=>void controller.settleAiTurns(true).catch(()=>undefined)}>重试对手行动</Button>}</>}</div>
      </div>
      <aside className="combat-sidebar" ref={planRef}>
        {pending ? <section className="combat-plan fantasy-panel" aria-label="行动准备"><header><small>{sourceLabel(pending.action)}</small><button className="icon-button" onClick={()=>setPending(null)} aria-label="取消行动准备">×</button><h2>{skillName(state.技能?.列表?.[pending.action.id]??pending.action,state,'行动')}</h2></header>
          <div className="combat-plan__body"><button className="combat-plan__field-link" onClick={()=>fieldRef.current?.scrollIntoView({block:'start'})}>↑ 返回战场选点</button><dl className="combat-cost"><div><dt>魂力</dt><dd>{pending.preview.soulPowerCost ?? pending.action.soulPowerCost ?? '无法预检'}</dd></div>{pending.preview.availableSoulPower!=null&&<div><dt>当前可用</dt><dd>{pending.preview.availableSoulPower}</dd></div>}{pendingItem&&['consumable','hidden-weapon'].includes(pending.action.sourceKind)&&<div><dt>携带数量</dt><dd>{pendingItem.quantity}</dd></div>}{pending.action.perBattleRemaining!=null&&<div><dt>本场剩余</dt><dd>{pending.action.perBattleRemaining}</dd></div>}{pending.action.perBattleGroupRemaining!=null&&<div><dt>同类本场剩余</dt><dd>{pending.action.perBattleGroupRemaining}</dd></div>}{pending.action.dailyRemaining!=null&&<div><dt>今日剩余</dt><dd>{pending.action.dailyRemaining}</dd></div>}{pending.action.disposable&&<div><dt>使用消耗</dt><dd>一件</dd></div>}</dl>
            {(pending.preview.skill?.elementAmplifications??[]).map((amp:any)=><p key={amp.damageType}>{amp.damageType}属性伤害 +{amp.percent}%（含对应持续伤害，在抗性前结算）<br/><small>来源：{amp.sources.map((source:any)=>text(source.name,'装备')).join('、')}</small></p>)}
            {pending.preview.controlOrder&&<p role="status">{pending.intent.type==='控制命令'?'将下达命令':'受控制，将执行'}：{pending.preview.controlOrder.intent.type}。{pending.preview.controlFailure?`当前无法执行：${pending.preview.controlFailure}；将消耗本回合。`:'行动能否执行及其消耗，以出手时的状态为准。'}</p>}
            {pending.action.description && <p>{text(pending.action.description)}</p>}
            {pending.action.support&&<SupportConfiguration view={pending.preview.support??pending.action.support} selections={pending.intent.supportSelections} onChange={supportSelections=>changeIntent({supportSelections})}/>}
            {pending.intent.type==='挣脱'&&<label>挣脱方法<select aria-label="挣脱方法" value={pending.intent.method??'physical'} onChange={e=>changeIntent({method:e.target.value})}><option value="physical">物理挣脱</option><option value="soul">自身魂力对抗</option></select></label>}
            {deviceChoices.length>0&&<label>器具目标<select aria-label="战斗器具目标" value={pending.intent.targetItemId?deviceOperationKey(pending.intent):''} onChange={e=>{const row=deviceChoices.find((op:any)=>op.key===e.target.value);if(!row)return;const selections=defaultBattleBranches(pending.action,row.branchIds,pending.intent.branchTargets);for(const id of row.branchIds??[])selections[id]={...selections[id],targetIds:row.targets};changeIntent({targetItemId:row.itemId,deviceNodeId:row.nodeId,lockId:row.lockId??undefined,knowledgeId:row.intent.knowledgeId,materials:row.intent.materials,targetIds:row.targets,branchTargets:selections});}}><option value="">选择当前实际器具</option>{deviceChoices.map((op:any)=><option key={op.key} value={op.key} disabled={!op.available}>{op.label}{op.available?'':` · ${op.reason}`}</option>)}</select></label>}
            {pending.preview.deviceOperation?.materials&&<p>实体钥匙材料消耗：{pending.preview.deviceOperation.materials.allocations.map((a:any)=>`${text(state.材料库?.永久?.[a.fingerprint]?.displayName,'材料')} × ${a.quantity}`).join('、')}（价值 {pending.preview.deviceOperation.materials.consumedValue}）</p>}
            {pending.action.restraint&&<><p>佩戴者：{pending.action.restraint.targetName} · 本次占用主行动</p><label>器具模式<select aria-label="战斗器具模式" value={pending.intent.mode} onChange={e=>changeIntent({mode:e.target.value,limits:pending.action.restraint.supportsFineLimits&&e.target.value==='limited'?(pending.intent.limits??pending.action.restraint.limits):undefined,relockAfterMinutes:undefined})}>{pending.action.restraint.modes.map((m:string)=><option key={m} value={m}>{RESTRAINT_MODE_LABELS[m]}</option>)}</select></label>{pending.action.restraint.supportsFineLimits&&pending.intent.mode==='limited'&&<PowerLimitFields limits={pending.intent.limits} choices={pending.action.restraint.choices} supportsDamage={pending.action.restraint.supportsDamage} onChange={limits=>changeIntent({limits})}/>} {pending.action.restraint.autoRelock&&pending.intent.mode!=='locked'&&<label>定时恢复（分钟，0为不设置）<input aria-label="战斗定时恢复分钟" type="number" min="0" max="1440" step="1" value={pending.intent.relockAfterMinutes??0} onChange={e=>changeIntent({relockAfterMinutes:Number(e.target.value)||undefined})}/></label>}<PowerLimitSummary power={pending.preview.restraint?.power}/></>}
            {pending.action.sourceKind==='consumable'&&<label className="toggle-row"><input aria-label="强制给药尝试" type="checkbox" checked={pending.intent.force===true} onChange={e=>changeIntent({force:e.target.checked})}/><span>强行给药需要接近目标。若对方挣脱，药物仍在，但会消耗本次行动和已选费用。</span></label>}
            {(pending.action.modeOptions??[]).length>0&&<label>本次施放方式<select aria-label="本次施放方式" value={pending.intent.modeId} onChange={event=>changeCastMode(event.target.value)}>{pending.action.modeOptions.map((option:any)=><option key={option.id} value={option.id} disabled={!option.available}>{option.name}{option.available?'':` · ${option.reason}`}</option>)}</select></label>}
            {pending.preview.payment&&<div className="ability-costs">{pending.preview.payment.totals.health>0&&<span>消耗生命 {pending.preview.payment.totals.health}</span>}{pending.preview.payment.totals.lifespan>0&&<span>消耗寿命 {pending.preview.payment.totals.lifespan} 分钟{pending.preview.payment.exhaustsLife?' · 本次为耗尽献祭':''}</span>}{pending.preview.payment.items.map((fee:any)=><span key={fee.itemId}>消耗{text(state.物品?.实例?.[fee.itemId]?.name,'物品')} × {fee.quantity}</span>)}</div>}
            {(branches.length>1||branches.some((item:any)=>item.optional))&&<div className="combat-branches" aria-label="技能分支">{branches.map((item:any,index:number)=><span key={item.branchId}><button className={branch?.branchId===item.branchId ? 'is-active' : ''} onClick={()=>{setBranchId(item.branchId);setMode('target');}}>{index+1} · {text(item.label,`效果${index+1}`)}</button>{item.optional&&<label><input type="checkbox" aria-label={`启用${text(item.label,'可选效果')}`} checked={pending.intent.branchTargets?.[item.branchId]?.enabled??item.enabled!==false} onChange={event=>changeIntent({branchTargets:{...pending.intent.branchTargets,[item.branchId]:{...pending.intent.branchTargets?.[item.branchId],enabled:event.target.checked}}})}/>启用</label>}</span>)}</div>}
            {branch&&(branch.needsPrimaryTarget||branch.needsAim)&&<><p>{branch.geometry?.releaseName}{branch.geometry?.rangeZones!=null&&` · 最远${branch.geometry.rangeZones}个距离区`}</p><label>{branch.needsAim ? '以单位位置瞄准' : '主目标'}<select aria-label="技能目标" value={branchIntent.targetIds?.[0] ?? ''} onChange={event=>changeBranch({targetIds:event.target.value ? [event.target.value] : [],aimPoint:null})}><option value="">{branch.needsAim ? '在战场上点选落点' : '选择一名目标'}</option>{(branch.targetOptions ?? branch.choices ?? []).map((choice:any)=><option key={choice.id} value={choice.id} disabled={choice.available===false}>{text(choice.name,'魂师')}{choice.distanceLabel?` · ${choice.distanceLabel}`:''}{choice.reason?` · ${choice.reason}`:''}</option>)}</select></label>{!(branch.choices??[]).length&&<div role="status"><p>当前没有可选目标。</p><ul>{(branch.targetOptions??[]).map((choice:any)=><li key={choice.id}>{text(choice.name,'魂师')}：{choice.reason}</li>)}</ul><Button variant="secondary" onClick={()=>setMode('move')}>调整移动与站位</Button></div>}</>}
            {branch?.effectId==='target.allies'&&<fieldset aria-label="选择加持同伴"><legend>选择加持同伴</legend><p>已选 {selectedAllyIds.length} 人，按实际人数供魂。</p><div className="field-actions"><Button variant="secondary" onClick={()=>changeBranch({targetIds:allyChoices.map((choice:any)=>choice.id),aimPoint:null})}>选择全体</Button><Button variant="ghost" onClick={()=>changeBranch({targetIds:[],aimPoint:null})}>清空选择</Button></div>{allyChoices.map((choice:any)=><label className="toggle-row" key={choice.id}><input type="checkbox" aria-label={`加持${text(choice.name,'同伴')}`} checked={selectedAllyIds.includes(choice.id)} onChange={event=>changeBranch({targetIds:event.target.checked?[...selectedAllyIds,choice.id]:selectedAllyIds.filter(id=>id!==choice.id),aimPoint:null})}/>{text(choice.name,'同伴')}</label>)}</fieldset>}
            {branch?.needsAim&&mode==='target'&&<div className="combat-point-fields"><label>落点横向<input aria-label="技能落点横向" type="number" min="0" max="100" step="0.1" value={branchIntent.aimPoint?.x ?? ''} onChange={event=>choosePoint({x:Number(event.target.value),y:branchIntent.aimPoint?.y ?? 50})}/></label><label>落点纵向<input aria-label="技能落点纵向" type="number" min="0" max="100" step="0.1" value={branchIntent.aimPoint?.y ?? ''} onChange={event=>choosePoint({x:branchIntent.aimPoint?.x ?? 50,y:Number(event.target.value)})}/></label></div>}
            {copying&&<label>复制来源<select aria-label="复制来源" value={pending.intent.copySourceUnitId ?? ''} onChange={event=>changeIntent({copySourceUnitId:event.target.value})}><option value="">选择一名来源</option>{copying.choices.map((choice:any)=><option key={choice.id} value={choice.id} disabled={!choice.available}>{text(choice.name,'魂师')}{choice.distanceLabel?` · ${choice.distanceLabel}`:''}{choice.available ? ` · ${choice.skills.map((skill:any)=>skillName(skill,state,'技能')).join('、')}` : ` · ${text(choice.reason,'无法复制')}`}</option>)}</select></label>}
            {summonChoices&&<fieldset><legend>化身继承与魂力</legend><p>{summonChoices.fixed?`固定继承以下${summonChoices.maximumSkills}项已掌握魂技`:`最多选择 ${summonChoices.maximumSkills} 项`}，冷却与使用次数和本体共享。</p>{summonChoices.options.map((choice:any)=><label key={choice.id}><input type="checkbox" checked={inheritedSkillIds.includes(choice.id)} disabled={summonChoices.fixed||!inheritedSkillIds.includes(choice.id)&&inheritedSkillIds.length>=summonChoices.maximumSkills} onChange={event=>changeIntent({summonSkillIds:event.target.checked?[...inheritedSkillIds,choice.id]:inheritedSkillIds.filter(id=>id!==choice.id)})}/>{skillName(choice,state,'魂技')}{choice.soulPowerCost!==undefined&&<small> · 每次 {choice.soulPowerCost} 魂力{choice.soulPowerCasts===null?'':` · 分配魂力可供 ${choice.soulPowerCasts} 次`}</small>}</label>)}{summonChoices.soulPower&&<><label>实际分配魂力<input aria-label="化身分配魂力" type="number" min="0" max={summonChoices.soulPower.maximum} step="1" value={pending.intent.summonSoulPower??summonChoices.soulPower.default} onChange={event=>changeIntent({summonSoulPower:Number(event.target.value)})}/></label><small>从本体当前魂力转移，最高 {summonChoices.soulPower.maximum} 点。</small><p>本体合计消耗 {summonChoices.soulPower.bodyTotal} 魂力（发动 {pending.preview.soulPowerCost} ＋ 分配 {summonChoices.soulPower.transferTotal}）。</p>{summonChoices.selectionSoulPowerCost!==null&&<p>所选魂技各施展一次需 {summonChoices.selectionSoulPowerCost} 魂力。{summonChoices.selectedSequenceAffordable===false?'当前分配不足以各施展一次，可调整分配或搭配。':'冷却、使用次数与实际目标仍会影响施展。'}</p>}</>}</fieldset>}
            {pending.action.resourceSummary&&<p role="status">{pending.action.resourceSummary} · 发动时消耗全部</p>}
            {endstate&&<p>发动后{endstate.承担者==='本体'?'本体':'施术者'}生命至多保留 {endstate.生命终值} 点，魂力至多保留 {endstate.魂力终值} 点；未命中也承担。</p>}
            {pending.action.castOptions?.length>0&&<div className="cast-rank-panel"><p>技能来源始终是第{pending.action.sourceRingOrdinal}魂环</p><strong>当前释放 {pending.intent.castRank} 环强度 · 原生 {pending.action.nativeCastRank} 环强度</strong><label>本次释放强度<select aria-label="本次施法环阶" value={pending.intent.castRank} onChange={event=>changeIntent({castRank:Number(event.target.value)})}>{(pending.preview.castOptions??pending.action.castOptions).map((option:any)=><option key={option.rank} value={option.rank} disabled={!option.affordable}>{option.rank}环强度 · 魂力{option.cost}{option.rank<pending.action.nativeCastRank?' · 部分力量':option.rank===pending.action.nativeCastRank?' · 完整原生力量':' · 增幅 +'+option.bonus}{!option.affordable?' · '+option.reason:''}</option>)}</select></label><small>当前最高可选 {pending.action.maximumCastRank} 环强度。升级并取得更多魂环后逐步开放；确认施放时消耗魂力。</small>{(pending.preview.castRelease??pending.action.castRelease)?.lockedBranches?.map((branch:any)=><small key={branch.id}>{branch.label}：{branch.unlockText}</small>)}</div>}
            {branch?.needsPrimaryTarget&&!branch.choices?.length&&!previewQuery.loading&&<p role="status">当前没有符合能力条件的目标。请检查射程与站位；如需靠近，可展开“移动与站位”并在战场上点选落点。</p>}
            {pending.preview.upcastBonus>0&&<p>升环增幅 +{pending.preview.upcastBonus}；多目标、多段效果会分摊增幅。</p>}
            {(pending.preview.creationOptions??[]).map((operation:any)=><section key={operation.effectId} className="form-grid"><label>{operation.effectId==='payload.repair_item'?'修复物品':'造物配方'}<select value={operation.choices.find((c:any)=>c.targetItemId===operation.selection.targetItemId&&c.targetItemId||c.recipeId===operation.selection.recipeId&&c.recipeId||c.blueprintId===operation.selection.blueprintId&&c.blueprintId)?.id??''} onChange={e=>{const c=operation.choices.find((v:any)=>v.id===e.target.value);changeIntent({targetItemId:c?.targetItemId,recipeId:c?.recipeId,blueprintId:c?.blueprintId});}}>{operation.choices.map((c:any)=><option key={c.id} value={c.id}>{c.name} · {c.detail}</option>)}</select></label><p>{operation.quote.itemName?`耐久 ${operation.quote.before} → ${operation.quote.after} / ${operation.quote.maximum}`:`制造${operation.quote.productName} × ${operation.quote.quantity}`} · 材料消耗价值 {operation.quote.materials.consumedValue}</p></section>)}
            <ActionSection title="移动与站位" className="combat-movement" open={mode==='move'} onOpenChange={next=>setMode(next?'move':'target')}><label className="toggle-row"><input type="checkbox" checked={Boolean(pending.intent.movement)} onChange={event=>changeIntent({movement:event.target.checked ? {距离区:actor.位置.距离区,战场坐标:facts.data?.point,冲刺:false} : undefined})}/><span>在行动前移动</span></label>
              <label>战术距离区<select aria-label="移动距离区" disabled={!pending.intent.movement} value={pending.intent.movement?.距离区 ?? actor.位置.距离区} onChange={event=>changeIntent({movement:{...pending.intent.movement,距离区:event.target.value,战场坐标:undefined}})}>{(facts.data?.zones??[]).map((zone:string)=><option key={zone}>{zone}</option>)}</select></label>
              <label>站位组<select aria-label="移动站位组" disabled={!pending.intent.movement} value={pending.intent.movement?.站位簇 ?? actor.位置.站位簇 ?? ''} onChange={event=>changeIntent({movement:{...pending.intent.movement,站位簇:event.target.value}})}>{clusters.map((cluster,index)=><option key={cluster} value={cluster}>站位{index+1} · {live.units.filter(unit=>unit.position.站位簇===cluster).map(unit=>unit.name).join('、')}</option>)}<option value={`isolated-${actorId}`}>另选独立站位</option></select></label>
              <label className="toggle-row"><input type="checkbox" disabled={!pending.intent.movement} checked={Boolean(pending.intent.movement?.冲刺)} onChange={event=>changeIntent({movement:{...pending.intent.movement,冲刺:event.target.checked}})}/><span>冲刺</span></label><p>点选战场空地选择落点。仅调整距离区时，靠近会向中央移动，远离会向外侧移动。可移动距离与技能范围随站位变化。</p>
              {pending.intent.movement?.战场坐标&&<span>落点 {pending.intent.movement.战场坐标.x}，{pending.intent.movement.战场坐标.y}</span>}
            </ActionSection>
            {effectBranches.length>0&&<Button variant="ghost" onClick={()=>setEffectDetailsOpen(true)}>查看完整能力效果</Button>}
          </div><div className="combat-plan__verdict" aria-live="polite">{pending.preview.ready ? <p>预计影响：{pending.preview.targets?.map((target:any)=>text(target.name,'魂师')).join('、') || '无需单位目标'}</p> : <p className="combat-plan__reason">{text(pending.preview.reason,'当前无法施放')}</p>}{pending.preview.friendlyFireTargetIds?.length>0&&<p className="danger-text">范围内会波及友方单位。</p>}</div><ModalActions><Button variant="ghost" onClick={()=>setPending(null)}>取消</Button><Button disabled={locked||!pending.preview.ready} onClick={()=>void confirm()} data-testid="confirm-battle-action">确认行动</Button></ModalActions>
        </section> : <><BattleIntel state={state} unit={playerFrame} avatarUrl={view.avatarUrl} figureUrl={view.figureUrl} title="我方角色" compact/><BattleRecentLog events={view.events} state={state} onOpen={()=>setLogOpen(true)}/></>}
      </aside>
    </div>
    {storyPending&&<p role="status">正在处理本场战斗的行动，请完成当前步骤后继续。</p>}
    {actionQuery.loading&&<p role="status">正在查看可用行动…</p>}{actionQuery.error&&<p role="alert">{actionQuery.error}</p>}
    {!autoBattle&&allActions.find(action=>action.id==='tactic:support')&&<div className="combat-support-entry"><button disabled={locked} onClick={()=>chooseAction(allActions.find(action=>action.id==='tactic:support'))}>持续加持 · 选择同伴与技能</button><span>可同时加持在场队友与投影</span></div>}
    {autoBattle?<p role="status">正在自动选择行动。手动接管后可选择魂技与战术。</p>:<BattleConsole key={view.profileId+':'+playerId} state={state} worldId={view.profileId} unitId={playerId} actions={allActions} soulImages={view.soulImages} locked={locked} pending={pending} castReceipt={activeReceipt?.actorId===playerId?activeReceipt:lastOwnCast} playing={Boolean(activeReceipt?.actorId===playerId&&playback.playing)} onChoose={chooseAction} onCancel={()=>{setPending(null);setMode('target');}}/>}
    {!embedded&&state.扩展?.story&&<section className="combat-story" aria-label="战斗故事">
      <StoryChat deferBattleNarration={playback.playing}/>
    </section>}
    <Modal open={Boolean(pending&&effectDetailsOpen)} title={text(pending?.action.name,'能力效果')} onClose={()=>setEffectDetailsOpen(false)}>
      <p>下列为基础效果，最终数值还受属性、目标状态和施法环阶影响。</p>
      {effectBranches.map((item:any,index:number)=><article key={item.id ?? index}><h3>{text(item.label,`效果${index+1}`)}</h3><AbilityDetails skill={{effectSpecs:item.effectSpecs,outputScale:pending?.preview.skill?.outputScale}} showName={false} showCosts={false} showLimits={false}/></article>)}
    </Modal>
    {logOpen&&<BattleLog events={view.events} state={state} onClose={()=>setLogOpen(false)}/>}
  </div>;
}
