import {compileDisguiseOperation} from './disguise-writing';
import {compileCommittedEffect} from './committed-effect-facts';
export {battleResourceOutcomeReading} from './battle-resource-reading';

const copy=<T>(value:T):T=>structuredClone(value);
const pick=(value:any,keys:string[])=>Object.fromEntries(keys.filter(key=>Object.hasOwn(value,key)).map(key=>[key,copy(value[key])]));
const SOURCE_FIELDS=['statusId','zoneId','domainId','targetId','unitId','sourceUnitId','sourceSkillId','sourceReceiptId','creditedKillerId'];
const CALCULATION_FIELDS=['dice','rawAmount','upcastBonus','elementAmplification'];
const DAMAGE_FIELDS=['damageType','resistance','shieldUsed','hpDamage','equipmentReduction','absorbedAsShield','nonlethalPrevented','nonlethal','shieldOffered','temporaryHpBefore','temporaryHp','shieldUnused','remainingHp'];
const REMOVAL_EVENTS=['expired','consumed','damaged','cleansed','dispelled','revived','domain-removed','domain-suppressed','domain-membership-ended','attack-revealed','broken-free','source-invalidated','source-incapacitated','source-dead','source-soul-unavailable','source-item-lost','source-item-sealed','source-restraint-inactive','source-restraint-removed','target-dead','maintenance-broken','battle-ended','manual','confluence-consumed','charges-consumed','area-dispelled'];
const EVENT_GROUPS:Record<string,{meaning:string;fields:string[]}>=Object.fromEntries([
 ...['tick','hazard-tick'].map(event=>[event,{meaning:'持续效果造成伤害',fields:DAMAGE_FIELDS}] as const),
 ['eternal-wound',{meaning:'持续创伤消耗魂力并造成伤害',fields:[...DAMAGE_FIELDS,'upkeep','paid','shortage','soulPowerBefore','remainingSoulPower']}],
 ['regeneration',{meaning:'持续效果实际恢复生命',fields:['amount','remainingHp']}],
 ['layer-removed',{meaning:'拘束解除一层，其他层数保留',fields:['reason','before','remainingLayers']}],
 ['exchange-ended',{meaning:'交换结束，绑定效果按联动合同解除',fields:['reason']}],
 ['maintenance-paid',{meaning:'实际支付维持魂力',fields:['amount','soulPowerBefore','remainingSoulPower']}],
 ...REMOVAL_EVENTS.map(event=>[event,{meaning:event==='maintenance-broken'?'维持中断':'状态结束',fields:['reason']}] as const),
 ...['item-cooldown','item-skill-cooldown'].map(event=>[event,{meaning:'物品技能冷却推进',fields:['itemId','skillId','remaining']}] as const),
 ...['duration-armed','zone-duration-armed','domain-duration-armed'].map(event=>[event,{meaning:'本回合结束只启动持续时间计数',fields:[]}] as const),
 ['zone-expired',{meaning:'持续区域到期消失',fields:[]}],
 ['domain-ended',{meaning:'领域结束',fields:['reason']}],
 ['intimate-climax',{meaning:'情具刺激到顶，强制高潮',fields:['at','forced']}],
 ['intimate-incontinence',{meaning:'尿意失控，强制失禁',fields:['at','forced','reason']}],
 ['domain-conflict-recomputed',{meaning:'领域对抗后的生效状态',fields:['state','suppressorIds']}],
 ['domain-trigger',{meaning:'领域实际触发效果',fields:['trigger','effects']}],
 ['domain-enter',{meaning:'进入领域范围',fields:[]}],
 ['domain-exit',{meaning:'离开领域范围',fields:[]}],
 ['martial-avatar-ended',{meaning:'武魂真身结束',fields:['reason']}],
 ['summon-skills-removed',{meaning:'召唤单位的继承技能已撤销',fields:['reason','skillIds']}],
 ['summon-expired',{meaning:'召唤单位持续时间结束',fields:[]}],
]);

/** Typed event families, not prose-specific exceptions. New outcome fields must be mapped. */
export function compileBattleStatusEvent(event:Record<string,any>,index:number){
 const definition=EVENT_GROUPS[event.event];
 if(!definition)throw Error(`战斗状态事件缺少编译：${event.event}`);
 const allowed=new Set(['event',...SOURCE_FIELDS,...CALCULATION_FIELDS,...definition.fields]);
 const unknown=Object.keys(event).filter(key=>!allowed.has(key));
 if(unknown.length)throw Error(`战斗状态事件缺少字段编译：${event.event}/${unknown.join(',')}`);
 const outcome=pick(event,definition.fields);
 if(event.event==='domain-trigger')outcome.effects=event.effects.map((effect:any)=>compileCommittedEffect(effect,event.sourceUnitId,event.targetId));
 return {sourceIndex:index,event:event.event,meaning:definition.meaning,source:pick(event,SOURCE_FIELDS),outcome};
}

const STATE_FIELDS:Record<string,string>={life:'存活状态',membership:'参战状态',hp:'生命',hpMax:'生命上限',shield:'护盾',sp:'魂力',spMax:'魂力上限',spLocked:'锁定魂力',spUpkeep:'每回合维持魂力',position:'实际位置',skillIds:'持有技能',constraints:'实际行动限制'};
const PHASES:Record<string,string>={'battle-start':'开战与首回合开始','main-action':'本次主行动','turn-boundary':'本次行动后的回合结算','field-action':'本次战外使用物品'};
const LIFECYCLE:Record<string,string>={applied:'状态生效',refreshed:'状态刷新',removed:'状态解除','duration-armed':'开始计时','duration-decreased':'持续时间减少'};

export function compileBattleLifecycle(receipt:any){
 const stateChanges=(receipt.stateChanges??[]).flatMap((entry:any)=>Object.entries(entry.changes).map(([field,value]:[string,any])=>{
  if(!STATE_FIELDS[field]||!PHASES[entry.phase])throw Error(`战斗状态变化缺少编译：${entry.phase}/${field}`);
  return {subjectId:entry.unitId,phase:PHASES[entry.phase],field:STATE_FIELDS[field],...copy(value)};
 }));
 const statusLifecycle=(receipt.statusLifecycle??[]).map((entry:any)=>{
  if(!LIFECYCLE[entry.event]||!PHASES[entry.phase])throw Error(`状态生命周期缺少编译：${entry.phase}/${entry.event}`);
  return {order:entry.order,subjectId:entry.targetId,phase:PHASES[entry.phase],event:LIFECYCLE[entry.event],reason:entry.reason,status:copy(entry.status)};
 });
 const fieldLifecycle=(receipt.fieldLifecycle??[]).map((entry:any)=>{
  const event=entry.event==='state-changed'?'领域生效状态变化':LIFECYCLE[entry.event];
  if(!event||!PHASES[entry.phase]||!['zone','domain'].includes(entry.field?.kind))throw Error(`区域生命周期缺少编译：${entry.phase}/${entry.event}`);
  return {order:entry.order,phase:PHASES[entry.phase],event,reason:entry.reason,field:copy(entry.field)};
 });
 const traits=(receipt.traitEvents??[]).map((event:any,index:number)=>{
  const fields=event.sourceId==='trait.kill-recovery'?['targetId','requested','restored']:null;
  if(!fields)throw Error(`特性触发缺少编译：${event.sourceId}`);
  const allowed=['sourceId','unitId','trigger','soulPowerBefore','remainingSoulPower',...fields];
  const unknown=Object.keys(event).filter(key=>!allowed.includes(key));
  if(unknown.length)throw Error(`特性触发缺少字段编译：${unknown.join(',')}`);
  return {sourceIndex:index,subjectId:event.unitId,sourceId:event.sourceId,event:event.trigger,outcome:pick(event,['soulPowerBefore','remainingSoulPower',...fields])};
 });
 return {actionStateBefore:copy(receipt.actionStateBefore??null),stateChanges,statusLifecycle,fieldLifecycle,
  ...(receipt.battleResourceEvents?.length?{battleResourceEvents:copy(receipt.battleResourceEvents)}:{}),
  ...(receipt.resourceEndstates?.length?{resourceEndstates:copy(receipt.resourceEndstates)}:{}),
  ...(receipt.participation?{participation:copy(receipt.participation)}:{}),...(receipt.controlOrder?{controlOrder:copy(receipt.controlOrder)}:{}),
  ...(receipt.desireCheck?{desireCheck:pick(receipt.desireCheck,['id','actorId','strength','reason','die','modifier','total','dc','success'])}:{}),
  ...(receipt.disguise?{disguise:compileDisguiseOperation(receipt.disguise)}:{}),
  ...(receipt.soulChange?{soulChange:copy(receipt.soulChange)}:{}),
  ...(receipt.exchangeIds?.length?{exchangeIds:copy(receipt.exchangeIds)}:{}),...(receipt.backlash?{backlash:copy(receipt.backlash)}:{}),
  statusEvents:(receipt.statusEvents??[]).map(compileBattleStatusEvent),traitEvents:traits,
  martialSoulSwitch:copy(receipt.martialSoulSwitch??null),retreatAssist:copy(receipt.retreatAssist??null),surrender:copy(receipt.surrender??null)};
}

export function compileBattleOpening(receipt:any){
 if(!receipt)return null;
 if(receipt.type!=='battle-start')throw Error('开战来源不是开战结算');
 return {receiptId:receipt.id,battleId:receipt.battleId,currentActorId:receipt.currentActorId,
  initiativeOrder:(receipt.initiative??[]).map((entry:any)=>entry.unitId),
  passiveResults:(receipt.passiveEvents??[]).map((entry:any)=>({subjectId:entry.unitId,event:entry.effect,
   offered:entry.offeredAmount,gained:entry.amount,before:entry.temporaryHpBefore,after:entry.temporaryHp})),
  preparedItems:(receipt.preparedItems??[]).map((entry:any)=>({subjectId:entry.unitId,name:entry.name,effects:entry.effects.map((effect:any)=>compileCommittedEffect(effect,entry.unitId,entry.unitId))})),
  ...compileBattleLifecycle(receipt)};
}
