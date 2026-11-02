import {committedOutcomeReading} from './committed-effect-reading';
import {compileStoryBattleFacts} from './story-battle-facts';
import {compileStoryBattlePhases} from './story-battle-phases';
import {compileStoryBattleAccount} from './story-battle-account';
import {compileStoryBattleSettlement} from './story-battle-settlement';
import {battleActionConditionsReading} from './story-battle-action-reading';
import {battleLifecycleReading} from './story-battle-lifecycle-reading';
import {battleSkillSourceReading} from './story-battle-skill-source';
import {compileStoryBattleCourse} from './story-battle-course';
import {storyBattleEventUnits} from './story-battle-event-units';
import {hitInterferenceReading} from './hit-interference-reading';

const clone=<T>(v:T):T=>structuredClone(v);
const present=(v:any)=>v!==null&&v!==undefined&&(!Array.isArray(v)||v.length>0);
const pick=(v:any,keys:string[])=>Object.fromEntries(keys.filter(k=>Object.hasOwn(v,k)).map(k=>[k,clone(v[k])]));

/** Only immediate, equivalent, uneventful actions in the same round may share a row.
 * Counts express repetition of these exact results, never sums of shields, states or resources.
 */
export function coalesceAdjacentBattleActions(actions:any[]){
 const rows:any[]=[];
 const boundary=(a:any)=>['stage','movement','stateChanges','statusLifecycle','fieldLifecycle','statusEvents','traitEvents','martialSoulSwitch','retreatAssist','surrender','escape','battleResult','actualOutcomes','desireCheck','disguise','soulChange','exchangeIds','backlash','creationSettlements','periodicEffectSettlements','contractObservation'].some(k=>present(a[k]));
 const comparable=(a:any)=>{const v=clone(a);delete v.sequence;delete v.sourceSequences;delete v.repetitions;delete v.actor.actionIndex;if(v.skill)delete v.skill.castIndex;return JSON.stringify(v);};
 for(const action of actions){
  const previous=rows.at(-1),sequences=previous?.sourceSequences??[previous?.sequence];
  if(previous&&!boundary(previous)&&!boundary(action)&&sequences.at(-1)+1===action.sequence&&comparable(previous)===comparable(action)){
   previous.sourceSequences=[...sequences,action.sequence];previous.repetitions={count:previous.sourceSequences.length,lastActorActionIndex:action.actor.actionIndex,lastCastIndex:action.skill?.castIndex??null};
  }else rows.push(clone(action));
 }
 return rows;
}

/** Narrative events are a reading of settled evidence. Full receipts remain in the report.
 * Local instance names distinguish repeated effects without exposing receipt UUIDs to the author.
 * The reverse mapping is retained beside the frozen package, not a dictionary the author must decode.
 */
export function compileStoryBattleNarrative(report:any){
 const evidence=compileStoryBattleFacts(report),instances=new Map<string,{label:string;kind:string}>(),counts=new Map<string,number>();
 const actions=report.actions.map((a:any)=>({sequence:a.sequence,receiptId:a.receipt.id??null,actionId:a.receipt.actionId??null}));
 const receiptNames=new Map<string,string>();for(const a of actions)for(const id of [a.receiptId,a.actionId])if(id)receiptNames.set(id,`动作${a.sequence}`);
 const instanceKinds:Record<string,string>={statusId:'状态',zoneId:'区域',domainId:'领域'};
 const name=(id:string,kind:string)=>{const current=instances.get(id);if(current)return current.label;const n=(counts.get(kind)??0)+1;counts.set(kind,n);const label=`${kind}${n}`;instances.set(id,{label,kind});return label;};
 // Register typed instance snapshots before rendering any reference, including opening
 // effects and statuses already present when the retained report starts.
 const register=(value:any):void=>{
  if(!value||typeof value!=='object')return;
  if(typeof value.instanceId==='string'&&typeof value.effectId==='string')name(value.instanceId,'状态');
  if(typeof value.id==='string'&&['zone','domain'].includes(value.kind))name(value.id,value.kind==='zone'?'区域':'领域');
  for(const [key,part] of Object.entries(value)){
   if(instanceKinds[key]&&typeof part==='string'&&part)name(part,instanceKinds[key]);
   else register(part);
  }
 };
 register(evidence);
 const identifiers=(v:any,key=''):any=>{
  if(typeof v==='string')return receiptNames.get(v)??instances.get(v)?.label??(instanceKinds[key]&&v?name(v,instanceKinds[key]):v);
  if(Array.isArray(v)){const singular:Record<string,string>={removedStatusIds:'statusId',removedZoneIds:'zoneId',replacedDomainIds:'domainId',suppressorIds:'domainId'};return v.map(x=>identifiers(x,singular[key]??key));}
  if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,identifiers(x,k)]));
  return v;
 };
 const outcomeText=(o:any)=>committedOutcomeReading(o,identifiers);
 const effect=(e:any,targetId:string)=>({effectId:e.effectId,name:e.name,
  results:e.outcomes.map((o:any)=>({...((o.subjectId!==targetId)?{subjectId:o.subjectId}:{}),fact:outcomeText(o)}))});
 const unitNames=new Map([...evidence.opening.units,...evidence.closing.units].map((u:any)=>[u.id,u.name]));
 const displayUnit=(id:string,fallback:string)=>{
  const label=unitNames.get(id)??fallback;
  return [...unitNames.values()].filter(n=>n===label).length>1?`${label}（${id}）`:label;
 };
 const target=(t:any,actor:any)=>{
  const actorName=displayUnit(t.sourceUnitId??actor.actorId,t.sourceUnitId??actor.actorName),targetName=displayUnit(t.targetId,t.targetId);
  const check=t.check,judgments:string[]=[];
  const grazed=Number(check?.interference?.grazePercent)>0;
  if(typeof check?.hit==='boolean')judgments.push(check.hit?'命中':grazed?'未正面命中':'未命中');
  if(typeof check?.saved==='boolean')judgments.push(check.saved?'目标豁免成功':'目标豁免失败');
  if(typeof check?.success==='boolean')judgments.push(check.success?'检定成功':'检定失败');
  if(check?.critical===true)judgments.push('重击');
  const applied=grazed?'仅擦伤伤害段实际结算，其他命中效果未生效':t.affected===true?'本分支实际生效':t.affected===false?'本分支未生效':'未记录生效判定';
  const action=t.sourceSkillId||t.trigger||t.domainId?'产生附带效果':actor.execution.executedSkill?`使用${actor.execution.executedSkill.name}`:`的${actor.execution.requestedActionType}结算`;
  const reading=hitInterferenceReading(check);
  const statement=`${actorName}对${targetName}${action}：${[...judgments,applied,...(t.defeated?['目标被击败']:[])].join('，')}${reading.length?'。'+reading.join('').replace(/。$/u,''):''}`;
  return {...pick(t,['targetId','branchId','affected','defeated','check','sourceUnitId','sourceSkillId','domainId','trigger']),statement,effects:t.effects.map((e:any)=>effect(e,t.targetId))};
 };
 const position=(p:any)=>{
  if(!p)return p;
  return Object.fromEntries(Object.entries(p).filter(([k,v])=>!(['站位簇','地形标签','接战单位ID'].includes(k)&&(v===''||Array.isArray(v)&&!v.length))));
 };
 const movement=(m:any)=>({...pick(m,['distance','dash','terrainPenalty']),from:position(m.from),to:position(m.to)});
 const usedAbilities:any[]=[],abilityKeys=new Map<string,string>();
 const timeline=evidence.actions.map((a:any)=>{
  const x=a.execution,actor={id:a.actorId,name:a.actorName,actionIndex:a.actorActionIndex??a.observedActorActionIndex};
  if(!x)return {sequence:a.sequence,round:a.round,actor,stage:'本动作缺少执行详情'};
  let skill=null;
  if(x.executedSkill){
   const identity={...pick(x.executedSkill,['id','name','sourceKind','sourceNativeOriginId','sourceMartialSoulId','sourceMartialSoulName','sourceRingId','sourceRingOrdinal','sourceRingYears','sourceRingColor','sourceRingTier','nativeCastRank']),...(x.sourceItem?{itemSource:pick(x.sourceItem,['itemId','sourceKind'])}:{}),parts:x.executedSkill.branches.map((b:any)=>pick(b,['id','label','targetPolicy']))};
   const key=JSON.stringify([a.actorId,identity]);let reference=abilityKeys.get(key);
   if(!reference){reference=`招式${usedAbilities.length+1}`;abilityKeys.set(key,reference);usedAbilities.push({reference,actorId:a.actorId,actorName:a.actorName,...identity,useSummary:{sourceSequences:[],count:0,first:{round:a.round,sequence:a.sequence},last:{round:a.round,sequence:a.sequence},paidSoulPower:0,targets:[]}});}
   const usage=usedAbilities.find(item=>item.reference===reference).useSummary;
   usage.sourceSequences.push(a.sequence);usage.count++;usage.last={round:a.round,sequence:a.sequence};
   const paid=x.resources?.actorSoulPower?.spent;
   usage.paidSoulPower=usage.paidSoulPower!==null&&Number.isFinite(paid)?usage.paidSoulPower+paid:null;
   for(const target of x.targetResults){
    let record=usage.targets.find((t:any)=>t.targetId===target.targetId);
    if(!record){record={targetId:target.targetId,targetName:unitNames.get(target.targetId)??target.targetId,hit:0,miss:0,unrecordedHitCheck:0};usage.targets.push(record);}
    record[target.check?.hit===true?'hit':target.check?.hit===false?'miss':'unrecordedHitCheck']++;
   }
   const sourceReading=battleSkillSourceReading(x.executedSkill);
   skill={reference,name:x.executedSkill.name,...pick(x.executedSkill,['soulPowerCost','castRank']),castIndex:a.castIndex??a.observedCastIndex,...(sourceReading?{sourceReading}:{})};
  }
  const details:any={sequence:a.sequence,round:a.round,actor,action:x.requestedActionType,skill,
   ...(x.movement?{movement:movement(x.movement)}:{}),results:x.targetResults.map((t:any)=>target(t,a))};
  for(const key of ['participation','controlOrder','actionStateBefore','stateChanges','statusLifecycle','fieldLifecycle','statusEvents','traitEvents','martialSoulSwitch','retreatAssist','surrender','escape','battleResult','ingestion','restraint','desireCheck','soulChange','exchangeIds','backlash','creationSettlements','periodicEffectSettlements','contractObservation'])if(present(x[key]))details[key]=clone(x[key]);
  if(x.resources){
   const r=x.resources.actorSoulPower;
   if(Object.keys(x.resources).some(k=>k!=='actorSoulPower')||!r||Object.keys(r).some(k=>!['before','spent','after','netChange'].includes(k)))throw Error('战斗资源变化缺少写作编译');
   details.resources=`本次行动者魂力${r.before}→${r.after}，实际支付${r.spent}，净变化${r.netChange}`;
  }
  if(x.sourceItem){
   const item=x.sourceItem;
   const observed=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)?String(value):'未记录';
   details.itemUse={...clone(item),statement:`${a.actorName}实际通过物品施展${x.executedSkill?.name??x.requestedActionType}；物品数量${observed(item.quantityBefore)}→${observed(item.quantity)}，剩余冷却${observed(item.cooldownRemaining)}`};
  }
  // Source sentences can name contributing equipment or action-wide outcomes as well as targets.
  if(x.narrationFacts.length)details.actualOutcomes=clone(x.narrationFacts);
  return details;
 });
 for(const ability of usedAbilities){
  const u=ability.useSummary;
  u.statement=`${displayUnit(ability.actorId,ability.actorName)}在已留存交锋中实际施展【${ability.name}】共${u.count}次，首次第${u.first.round}回合，最后第${u.last.round}回合；${u.paidSoulPower===null?'部分支付记录缺失，累计魂力支出未知':`累计实际支付${u.paidSoulPower}魂力`}`;
  for(const t of u.targets){
   u.statement+=`。作用对象${displayUnit(t.targetId,t.targetName)}：${t.hit+t.miss+t.unrecordedHitCheck}条已结算目标记录`;
   if(t.hit||t.miss)u.statement+=`，命中${t.hit}次、未命中${t.miss}次`;
   if(t.unrecordedHitCheck)u.statement+=`，${t.unrecordedHitCheck}条未记录命中判定`;
  }
 }
 const phaseBoundaries=timeline.flatMap((a:any)=>{
  const reasons:string[]=[];if(a.sequence===report.actions[0]?.sequence)reasons.push('留存交锋开始');
  if(a.statusLifecycle?.length||a.fieldLifecycle?.length||a.stateChanges?.some((c:any)=>['存活状态','参战状态','持有技能','实际行动限制'].includes(c.field)))reasons.push('状态或行动条件变化');
  if(a.disguise)reasons.push('实际伪装检查或解除');if(a.martialSoulSwitch||a.soulChange)reasons.push('切换或收回武魂');if(a.desireCheck)reasons.push('实际克制检定');if(a.exchangeIds?.length||a.backlash)reasons.push('承担交换代价或反噬');if(a.stage||a.actualOutcomes?.length)reasons.push('行动执行情况变化');if(a.battleResult)reasons.push('战斗终结');
  return reasons.length?[{sequence:a.sequence,reasons}]:[];
 });
 const settlement=compileStoryBattleSettlement(report);
 const facts=identifiers({id:evidence.id,status:evidence.status,outcome:evidence.outcome,completeFromStart:evidence.completeFromStart,
  ...(evidence.context?{context:clone(evidence.context)}:{}),
  ...(evidence.classification?{classification:evidence.classification}:{}),
  ...(settlement?{settlement}:{}),
  opening:evidence.opening,openingSettlement:evidence.openingSettlement,usedAbilities,actions:coalesceAdjacentBattleActions(timeline),phaseBoundaries,endingActions:evidence.endingActions,
  closing:evidence.closing,...(evidence.aftermath?{aftermath:evidence.aftermath}:{}),
  evidenceCoverage:{stage:'全部留存动作均已结算',actions:report.actions.length,stateLifecycle:report.actions.filter((a:any)=>Array.isArray(a.receipt.stateChanges)&&Array.isArray(a.receipt.statusLifecycle)).length}});
 facts.account=identifiers(compileStoryBattleAccount(evidence,timeline));
 const eventEnds=new Set<number>(storyBattleEventUnits(facts.account.passages).map(unit=>facts.account.passages[unit.last].sourceSequences.at(-1)));
 const process=compileStoryBattlePhases(facts,report.actions.map((a:any)=>Array.isArray(a.receipt.stateChanges)&&Array.isArray(a.receipt.statusLifecycle)&&Array.isArray(a.receipt.fieldLifecycle)),eventEnds);
 // Capacity boundaries retain full checkpoints; the author also gets their readable
 // event progression even when several phases fit in one request.
 facts.phases=process.phases.map(({opening:_opening,closing:_closing,...phase}:any)=>phase);
 facts.course=compileStoryBattleCourse(facts,process);
 for(const passage of facts.account.passages){
  const selected=new Set(passage.sourceSequences);
  if(process.phases.some((phase:any)=>phase.sourceSequences.some((sequence:number)=>selected.has(sequence))&&(!phase.opening.known||!phase.closing.known)))
   passage.stateObservation='本区间中途状态观察不完整；逐项已知结果保留，未记录的中间数值与状态未知。';
 }
 if(facts.openingSettlement){
  const lifecycle=battleLifecycleReading(facts.openingSettlement,id=>displayUnit(id,id));
  if(lifecycle?.length)facts.openingSettlement.lifecycleReading=lifecycle;
 }
 for(const passage of facts.account.passages)if(passage.event){
  if(passage.event.actionStateBefore){
   const reading=battleActionConditionsReading(passage.event.actionStateBefore);
   if(reading!==null)passage.event.actionConditionsReading=reading;
  }
  const lifecycle=battleLifecycleReading(passage.event,id=>displayUnit(id,id));
  if(lifecycle?.length)passage.event.lifecycleReading=lifecycle;
 }
 return {facts,sources:{battleId:report.id,actions,process,instances:[...instances].map(([id,v])=>({id,...v}))}};
}
