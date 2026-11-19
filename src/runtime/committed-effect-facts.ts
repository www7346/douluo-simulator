import {rules} from '../rules';

/** Actual execution data, never an ability's possible effects or prose instructions. */
export interface CommittedEffectFact {
 kind:string; subjectId:string; value:unknown; sourceFields:string[];
}
export interface CommittedEffectFacts {
 effectId:string; name:string; actorId:string; targetId:string;
 outcomes:CommittedEffectFact[];
}

// These fields explain the already settled arithmetic. They are not additional outcomes.
const CALCULATION_FIELDS=new Set(['dice','baseBonus','saveMultiplier','grazeMultiplier','scaling','avatarOutputBonus','upcastBonus','damageBuff','outputScale','deliveryScale','rawAmount','elementAmplification','rolledAmount','unusedAmount','shieldUnused','baseUpkeep']);
const STRUCTURAL_FAMILIES=new Set(['release','targeting','check','contract','trigger','modifier']);
const FAMILIES=new Set(['payload','status','movement','zone','domain','summon','transform','reaction','sustain']);
export function effectExecutionCoverage(){
 return Object.entries(rules.effects.EFFECT_REGISTRY).map(([id,definition]:[string,any])=>({id,family:definition.family,
  scope:id==='status.battle_resource'?'战斗事件规则':id==='payload.resource_endstate'?'施放后代价':id==='realm.deploy'?'独立调遣回执':id.startsWith('passive.')?'能力常驻属性':definition.hitRule?.inline||STRUCTURAL_FAMILIES.has(definition.family)?'施放与检定结构':'执行结果',
  supported:FAMILIES.has(definition.family)||STRUCTURAL_FAMILIES.has(definition.family)}));
}

/** A missing outcome field is an explicit compiler gap, never silently handed to the writer. */
export function compileCommittedEffect(effect:Record<string,any>,actorId:string,targetId:string):CommittedEffectFacts {
 if(effect.effectId==='contract.oath'){const fields=['effectId','nodeId','contractId','versionHash','forming'];if(Object.keys(effect).some(k=>!fields.includes(k))||typeof effect.contractId!=='string'||typeof effect.versionHash!=='string'||effect.forming!==true)throw Error('誓约安装缺少真实结果');return {effectId:effect.effectId,name:'灵魂誓约',actorId,targetId,outcomes:[{kind:'誓约安装结果',subjectId:targetId,value:{contractId:effect.contractId,versionHash:effect.versionHash,installed:true},sourceFields:['nodeId','contractId','versionHash','forming']}]};}
 const definition=rules.effects.EFFECT_REGISTRY[effect.effectId];
 if(!definition||!FAMILIES.has(definition.family))throw Error(`效果结果缺少编译类型：${effect.effectId}`);
 const outcomes:CommittedEffectFact[]=[],consumed=new Set<string>(['effectId']);
 const has=(key:string)=>Object.hasOwn(effect,key);
 const take=(keys:string[])=>{for(const key of keys)if(has(key))consumed.add(key);};
 const add=(kind:string,subjectId:string,value:unknown,sourceFields:string[])=>{
  take(sourceFields);outcomes.push({kind,subjectId,value:structuredClone(value),sourceFields:sourceFields.filter(has)});
 };
 const fields=(keys:string[])=>Object.fromEntries(keys.filter(has).map(key=>[key,structuredClone(effect[key])]));
 const record=(kind:string,keys:string[],subject=targetId)=>{const remaining=keys.filter(key=>has(key)&&!consumed.has(key));if(remaining.length)add(kind,subject,fields(remaining),remaining);};

 if(effect.effectId==='payload.death')record('真实死亡结果',['nodeId','dead','alreadyDead','healthBefore','remainingHp','deathId']);
 if(['payload.unlock','payload.suppress_lock','payload.rule_break','payload.analyze_lock','payload.create_key','payload.arcane_lock'].includes(effect.effectId)){
  record('器具操作结果',['nodeId','type','itemId','lockId','success','consequence','check','eventId','eventHash','knowledgeId','keyItemId','damage','expiresAt']);
  if(has('basis'))add('器具操作执行来源',actorId,{actorId:effect.actorId,kind:effect.basis.kind,skillId:effect.basis.skill?.id,nodeId:effect.basis.nodeId,paymentOperationId:effect.basis.payment?.operationId},['actorId','basis']);else take(['actorId']);
 }
 if(['realm.capture','realm.store'].includes(effect.effectId))take(['nodeId']);
 if(['realm.capture','realm.store'].includes(effect.effectId)&&has('realmId'))record(effect.permanent===false?'已收入限时独立空间':'已收入独立空间并永久绑定',['realmId','slotId','custodyId','regionId','targetId','permanent','expiresAt','summary']);
 record('未生效原因',['prevented','sources']);
 if(effect.effectId==='status.limited_followup')record('追击次数变化',['event','resourceSlot','charges']);
 if(effect.effectId==='payload.stack_confluence')record('本次合流消费',['consumed','sourceStatusIds'],actorId);
 if(effect.effectId==='payload.resource_damage')record('本次蓄能攻击消费',['resourceSlot','consumed','credited'],actorId);
 if(effect.effectId==='status.next_check_penalty')record('命中后的抵抗结果',['secondarySave','resisted']);
 if(has('soulPowerTransfer'))record('化身实际分配魂力',['soulPowerTransfer'],actorId);
 if(has('detonation'))record('命中后实际引爆状态',['detonation']);
 if(has('keptStronger'))record('保留较强灼烧并刷新期限',['keptStronger']);
 if(has('durationMode'))record('战斗维持期限',['durationMode'],actorId);
 if(has('wallDamage'))record('墙体实际损耗',['wallDamage','damageType']);
 record('装备实际修复',['itemId','itemName','durabilityBefore','durabilityAfter','maxDurability']);
 record('永久造物实际交付',['createdItemIds','itemChanges','productName','quantity','productValueEach'],actorId);
 record('构造实际材料消耗',['materialAllocations','consumedValue'],actorId);
 record('世界构造期限',['constructId','expiresAt','durability'],actorId);
 if(has('hpDamage')){
  // hpDamage is settled damage and can exceed remaining HP: it is NOT a before/after delta.
  record('生命伤害结算',['hpDamage','remainingHp','damageType','shieldUsed','equipmentReduction','nonlethalPrevented','nonlethal']);
  if(has('amount'))take(['amount']); // resistance.finalAmount, not life actually lost
 }
 record('伤害防护结算',['resistance']);
 record('实际护盾变化',['temporaryHpBefore','temporaryHp','offeredAmount','shieldOffered','absorbedAsShield']);
 if(['intimate.stimulate','intimate.climax'].includes(effect.effectId))record('实际效果强度与状态变化',['part','amount','arousal','climax']);
 if(has('amount')){
  const resource:Record<string,string>={'payload.shield':'实际新增护盾','payload.heal':'实际恢复生命','payload.soul_restore':'实际魂力变化','payload.soul_damage':'实际魂力变化','payload.revive':'复活后的生命'};
  if(resource[effect.effectId])record(resource[effect.effectId],['amount']);
  else if(!consumed.has('amount'))throw Error(`效果数值缺少语义：${effect.effectId}/amount`);
 }
 record('效果后的资源',['remainingHp','remainingSoulPower']);
 record('实际恢复资源',['lifeRestored','soulPowerRestored']);
 record('施术者汲取后的生命',['drainHealing','casterRemainingHp'],actorId);
 if(has('statusId')||has('removed'))record('状态实例变化',['statusId','refreshed','previousRemainingRounds','remainingRounds','layers','triggered','removed'],effect.effectId==='copy.skillset'?actorId:targetId);
 record('已解除的状态与区域',['removedStatusIds','removedZoneIds']);
 record('拘束逐层解除结果',['removedLayers']);
 record('复活结果',['revived']);
 if(effect.effectId==='move.approach')record('施放前实际追击',['nodeId','targetId','placement','from','to','maximumDistance','distance','reached'],actorId);
 if(has('movedUnitId'))record('实际位置变化',['movedUnitId','from','to'],effect.movedUnitId);
 if(has('zoneId'))record('区域实例结果',['zoneId','location','remainingRounds']);
 if(has('domainId'))record('领域实例结果',['domainId','location','remainingRounds','durationMode','replacedDomainIds','centerMode','radius','strength','dominanceDie','dominanceTotal','state','suppressorIds']);
 record('召唤物的天生招式',['innateSkillsByUnit'],actorId);
 record('侦察见闻',['report'],actorId);
 record('召唤出的单位及继承技能',['nodeId','summonedUnitIds','inheritedSkillsByUnit'],actorId);
 record('实际复制的技能',['sourceUnitId','copiedSkillIds'],actorId);
 record('已被打断的技能',['counteredSkillId'],actorId);
 record('施术者维持消耗登记',['lockedSoulPower','upkeep'],actorId);
 record('维持所申请的锁定量',['requestedLockedSoulPower'],actorId);
 record('实际变化的武魂形态来源',['event','sourceMartialSoulId','sourceRingId'],actorId);
 if(has('reflection')){
  const reflected=effect.reflection;
  // Reflection damages the original caster and may restore the original target.
  const reflectionFields=['statusId','reflectedRaw','resistance','shieldUsed','hpDamage','equipmentReduction','absorbedAsShield','nonlethalPrevented','nonlethal','shieldOffered','shieldGain','temporaryHpBefore','temporaryHp','shieldUnused','soulPowerBefore','soulGain','remainingSoulPower'];
  const unknown=Object.keys(reflected).filter(k=>!reflectionFields.includes(k));
  if(unknown.length)throw Error(`反射结果缺少字段编译：${unknown.join(',')}`);
  const select=(keys:string[])=>Object.fromEntries(keys.filter(k=>Object.hasOwn(reflected,k)).map(k=>[k,reflected[k]]));
  add('反射对原施术者的伤害',actorId,select(['statusId','resistance','shieldUsed','hpDamage','equipmentReduction','absorbedAsShield','nonlethalPrevented','nonlethal']),['reflection']);
  add('反射持有者的资源转化',targetId,select(['shieldOffered','shieldGain','temporaryHpBefore','temporaryHp','soulPowerBefore','soulGain','remainingSoulPower']),['reflection']);
 }
 const unknown=Object.keys(effect).filter(key=>!consumed.has(key)&&!CALCULATION_FIELDS.has(key));
 if(unknown.length)throw Error(`效果结果缺少字段编译：${effect.effectId}/${unknown.join(',')}`);
 if(!outcomes.length)throw Error(`效果结果没有可确认的实际结果：${effect.effectId}`);
 return {effectId:effect.effectId,name:definition.displayName,actorId,targetId,outcomes};
}
