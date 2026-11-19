(function attachSoulCombatEngine(root, factory) {
  const foundation = root?.SoulCombatFoundation ?? (typeof require === 'function' ? require('./foundation-core.js') : null);
  const effects = root?.SoulEffectCompiler ?? (typeof require === 'function' ? require('./effects-core.js') : null);
  const people = root?.SoulPersonCore ?? (typeof require === 'function' ? require('./person-core.js') : null);
  const actions=root?.SoulActionContext??(typeof require==='function'?require('./action-context-core.js'):null);
  const abilities=root?.SoulAbilityContract??(typeof require==='function'?require('./ability-contract-core.js'):null);
  const controls=root?.SoulControlCore??(typeof require==='function'?require('./control-core.js'):null);
  const influence=root?.SoulInfluenceCore??(typeof require==='function'?require('./influence-core.js'):null);
  const custody=root?.SoulCustodyCore??(typeof require==='function'?require('./custody-core.js'):null);
  const mechanics=root?.SoulBattleMechanics??(typeof require==='function'?require('./battle-mechanics-core.js'):null);
  if(!root?.SoulDeviceLocks&&typeof require==='function')require('./device-lock-core.js');
  if(!root?.SoulDeviceOperations&&typeof require==='function')require('./device-operation-core.js');
  if(!root?.SoulSummonOrders&&typeof require==='function')require('./summon-orders-core.js');
  if(!root?.SoulCreationCore&&typeof require==='function')require('./creation-core.js');
  if(!root?.SoulAbilityExchange && typeof require==='function')require('./ability-exchange-core.js');
  const expeditions=root?.SoulExpeditionContext??(typeof require==='function'?require('../../shared/expedition-context-core.js'):null);
  if(!root?.SoulTargetConditions&&typeof require==='function')require('./target-condition-core.js');
  if(!root?.SoulInteriorSpaces&&typeof require==='function')require('./interior-space-core.js');
  if(!root?.SoulResidentRealms&&typeof require==='function')require('./resident-realm-core.js');
  if(!root?.SoulCombatDeployments&&typeof require==='function')require('./combat-deployment-core.js');
  if(!root?.SoulBattlePreferences&&typeof require==='function')require('../../shared/battle-preferences-core.js');
  const api = factory(foundation, effects, people, actions, abilities, controls,influence,custody,expeditions,mechanics);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SoulCombatEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createSoulCombatEngine(foundation, effects, people, actions, abilities, controls,influence,custody,expeditions,mechanics) {
  'use strict';

  if (!foundation || !effects) throw new Error('SoulCombatEngine requires foundation and effect compiler');

  const projectionCore=globalThis.SoulCombatProjection??(typeof require==='function'?require('./combat-projection-core.js'):null);
  const VERSION = '2.10.0';
  const ACTIVE_BATTLE_STATES = Object.freeze(['进行中']);
  const ZONES = Object.freeze(['接触', '近距', '中距', '远距', '极远']);
  const BATTLEFIELD = Object.freeze({minimum: 0, maximum: 100, zoneLength: 24, lineHalfWidth: 6, coneDegrees: 70});
  const ORDINARY_ATTACK_IDS = Object.freeze(['ordinary.attack', 'basic.attack']);
  const NEGATIVE_STATUS_IDS = Object.freeze([
    'status.bind', 'status.paralysis', 'status.burn', 'status.poison', 'status.armor_break',
    'status.stun', 'status.fear', 'status.charm', 'status.desire', 'status.blind', 'status.silence', 'status.mute','status.limb_bind','status.power_seal','status.mind_control','status.soul_control','status.cognition_shift', 'status.sleep', 'status.slow', 'status.eternal_wound','status.next_check_penalty'
  ]);
  const CONTROL_STATUS_IDS = Object.freeze([
    'status.bind', 'status.paralysis', 'status.stun', 'status.fear', 'status.charm',
    'status.blind', 'status.silence', 'status.mute','status.limb_bind','status.power_seal','status.mind_control','status.soul_control','status.cognition_shift', 'status.sleep', 'status.slow'
  ]);
  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const clamp = (value, minimum, maximum) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return minimum;
    return Math.min(maximum, Math.max(minimum, number));
  };
  const round = value => Math.round(Number(value) || 0);
  const cleanList = value => Array.isArray(value) ? [...new Set(value.map(String).filter(Boolean))] : [];
  const support=globalThis.SoulSupportCore??require('./support-core.js');

  // Synchronous transaction-local evidence; never persisted as a second game state.
  const actionEvidence = new WeakMap();
  const planningClocks = new WeakSet();
  const medicineBranchStates = new WeakSet();
  const contractPenaltyExecutions = new WeakSet();
  // Dependency injection only; no current world or battle is kept in module scope.
  let advanceWorldClock = null;
  function bindWorldClock(advance) {
    if(typeof advance!=='function')throw Error('世界时钟依赖无效');
    if(advanceWorldClock && advanceWorldClock!==advance)throw Error('世界时钟依赖已登记');
    advanceWorldClock=advance;
  }
  function battleNow(state) { return state.世界?.时间 ? people.now(state) : Math.max(0,(state.战斗?.回合??1)-1); }
  function poolSourceAllowed(state,holder,source){
    if(controls.passiveReason(state,holder.id,source))return false;
    const soulId=skillMartialSoulId(source);
    return !soulId||foundation.activeMartialSoulId(state,holder.id)===soulId;
  }
  function emitMechanicEvent(state,actor,skill,event,slot,amount,receipt,targetId=''){
    const updates=mechanics.event(state,actor,skill,event,Number(slot),amount,receipt.id,targetId,(holder,source)=>poolSourceAllowed(state,holder,source));
    if(updates.length)(receipt.battleResourceEvents??=[]).push(...updates);
    return updates;
  }
  function itemEffectAllowed(state,actorId,item){return !controls.itemEffectBlockReason?.(state,actorId,item);}
  function equipmentValue(state,unit,key){return Number(unit.扩展?.装备战斗修正?.[key]??0);}
  function mentalSkill(skill){return !!skill?.effectGraph?.nodes?.some(n=>n.params?.类型&&foundation.canonicalDamageType(n.params.类型)==='精神'||['status.fear','status.charm','status.sleep','status.mind_control','status.cognition_shift'].includes(n.effectId));}
  function mentalProtection(state,unit,skill){return mentalSkill(skill)?Number(activeMartialAvatar(state,unit.id)?.快照?.参数?.精神防护加值??0):0;}
  function avatarRangeBonus(state,actor,skill){
    if(skill?.effectGraph?.nodes?.some(n=>['release.melee','release.touch'].includes(n.effectId)))return 0;
    const avatar=activeMartialAvatar(state,actor.id);
    return avatar&&skillMartialSoulId(skill)===avatar.来源?.武魂ID?Number(avatar.快照?.参数?.同源射程增幅??0):0;
  }
  function battleInstances(state) {
    return [state.战斗,...Object.values(state.世界?.backgroundBattles??{})].filter(b=>b?.id);
  }
  const occupiedBattle=actions.battleOf;
  function assertUnoccupied(state,ids,exceptId='') {
    for(const id of ids){
      const battle=occupiedBattle(state,id,exceptId);
      if(battle)throw Error(`人物或单位${id}正参加战斗${battle.id}`);
      if(state.人物?.列表?.[id])people.assertAlive(state,id);
    }
  }
  function releaseMaintain(state,unitId,sourceId) {
    const ledger=state.战斗.扩展.维持占用??{};
    for(const [id,entry] of Object.entries(ledger)){
      if(unitId&&entry.unitId!==unitId)continue;
      if(sourceId&&entry.sourceId!==sourceId)continue;
      const unit=state.战斗单位.列表[entry.unitId];
      if(unit){(globalThis.SoulCombatDeployments.soulPowerResource(state,unit.id)).锁定=Math.max(0,(globalThis.SoulCombatDeployments.soulPowerResource(state,unit.id)).锁定-entry.lock);(globalThis.SoulCombatDeployments.soulPowerResource(state,unit.id)).持续消耗=Math.max(0,(globalThis.SoulCombatDeployments.soulPowerResource(state,unit.id)).持续消耗-entry.upkeep);}
      // This cast has already released its real occupation; domain cleanup must not release it again.
      for(const domain of Object.values(state.战斗.扩展.领域实例??{}))if(domain.来源?.结算单ID===entry.sourceId&&domain.来源?.单位ID===entry.unitId&&domain.维持)domain.维持.需要=false;
      delete ledger[id];
    }
  }

  // One cast owns one maintenance contract, however many targets it affects.
  // References are read from live effects; cleansing one target does not end the
  // other targets, and a refreshed effect is owned by its new casting receipt.
  function maintenanceRefs(state,sourceId) {
    const refs=[...(globalThis.SoulPersonContracts?.maintenanceRefs(state,sourceId)??[])];
    for(const status of Object.values(state.状态实例?.列表??{}))if(status.来源?.结算单ID===sourceId&&!status.来源?.领域ID)refs.push({kind:'status',id:status.id});
    for(const battle of battleInstances(state)){
      for(const domain of Object.values(battle.扩展?.领域实例??{}))if(domain.来源?.结算单ID===sourceId)refs.push({kind:'domain',id:domain.id,battleId:battle.id});
      for(const zone of Object.values(battle.扩展?.区域效果??{}))if(zone.来源?.结算单ID===sourceId)refs.push({kind:'zone',id:zone.id,battleId:battle.id});
    }
    for(const row of globalThis.SoulCreationCore.constructs(state).filter(r=>r.sourceId===sourceId&&r.status==='active'))refs.push({kind:'construct',id:row.id});
    for(const unit of Object.values(state.战斗单位?.列表??{})){
      if(!unit.扩展?.召唤?.constructId&&unit.扩展?.召唤?.来源结算单ID===sourceId&&unit.存活状态==='存活')refs.push({kind:'summon',id:unit.id});
      if(unit.扩展?.temporaryHealthSource===sourceId&&unit.资源.生命.临时>0)refs.push({kind:'shield',id:unit.id});
    }
    return refs;
  }
  function legacyMaintenanceCost(state,sourceId) {
    let soulPower=0;
    for(const battle of battleInstances(state))for(const entry of Object.values(battle.扩展?.维持占用??{}))if(entry.sourceId===sourceId)soulPower+=entry.upkeep;
    for(const status of Object.values(state.状态实例?.列表??{}))if(status.来源?.结算单ID===sourceId&&status.模板ID==='transform.martial_avatar')soulPower+=Number(status.扩展?.每回合魂力??0);
    return soulPower?[{kind:'soulPower',amount:soulPower}]:[];
  }
  function maintenanceCosts(state,entry){return [...clone(entry.costs),...legacyMaintenanceCost(state,entry.id)];}
  function maintenanceEvent(state,entry,event,reason='',payment=null,receipt=null,itemNames=null) {
    state.扩展.maintenanceEvents??=[];
    const result={id:`${entry.id}:${event}:${entry.payments??0}`,sourceId:entry.id,actorId:entry.actorId,skillId:entry.skillId,battleId:entry.battleId,at:battleNow(state),event,reason,...(payment?{payment:clone(payment)}:{})};
    state.扩展.maintenanceEvents.push(result);
    if(Array.isArray(receipt?.maintenanceEvents))receipt.maintenanceEvents.push(itemNames?{...result,itemNames}:result);
    if(state.扩展.maintenanceEvents.length>200)state.扩展.maintenanceEvents.splice(0,state.扩展.maintenanceEvents.length-200);
    return result;
  }
  function maintenanceFingerprint(entry){return abilities.hash(Object.fromEntries(['id','actorId','skillId','battleId','scope','sourceMartialSoulId','createdAt','costs','hadEffects','requirements'].map(key=>[key,entry[key]])));}
  function registerMaintenance(state,actor,skill,receipt,fieldUse=false) {
    const costs=abilities.describe(skill,{modeId:receipt.payment?.contract.modeId||undefined}).maintenance;
    const ledger=Object.values(state.战斗.扩展?.维持占用??{}).filter(e=>e.sourceId===receipt.id);
    const refs=maintenanceRefs(state,receipt.id);
    const avatar=refs.some(ref=>ref.kind==='status'&&state.状态实例.列表[ref.id]?.模板ID==='transform.martial_avatar');
    if(!costs.length&&!ledger.length&&!avatar&&!refs.some(r=>r.kind==='construct'))return;
    // A resisted/countered cast paid its activation cost but created no contract.
    if(!refs.length){releaseMaintain(state,actor.id,receipt.id);return;}
    state.扩展.abilityMaintenance??={};
    if(state.扩展.abilityMaintenance[receipt.id])throw Error('持续效果来源重复登记');
    const at=battleNow(state);
    const entry={id:receipt.id,actorId:actor.id,skillId:skill.id,battleId:fieldUse?'':state.战斗.id,sourceMartialSoulId:skillMartialSoulId(skill),createdAt:at,nextAt:at+1,requirements:clone(abilities.describe(skill).requirements),costs:clone(costs),payments:0,hadEffects:refs.length>0};
    entry.scope=refs.some(ref=>['construct','person-contract'].includes(ref.kind)||ref.kind==='status'&&controls.persistent(state.状态实例.列表[ref.id]))?'world':'battle';
    if(entry.scope==='world')entry.battleId='';
    entry.contractHash=maintenanceFingerprint(entry);
    state.扩展.abilityMaintenance[entry.id]=entry;
    receipt.maintenance=maintenanceEvent(state,entry,'started');
    pruneMaintenance(state,receipt);
  }
  function stopMaintenance(state,sourceId,reason='manual',receipt=null) {
    const entry=state.扩展?.abilityMaintenance?.[sourceId];if(!entry)return null;
    if(entry.battleId&&entry.battleId!==state.战斗.id&&state.世界?.backgroundBattles?.[entry.battleId]){
      const projection=projectBattle(state,entry.battleId);
      const result=stopMaintenance(projection.state,sourceId,reason,Array.isArray(receipt?.maintenanceEvents)?receipt:null);
      foundation.commitStateDraft(state,restoreBattleProjection(projection.state,projection.frontId));return result;
    }
    // Delete before removal hooks, so nested pruning is harmless.
    delete state.扩展.abilityMaintenance[sourceId];
    const endedSkill=state.技能?.列表?.[entry.skillId],endedOwner=state.战斗单位?.列表?.[entry.actorId];
    if(endedSkill&&endedOwner&&endCooldown(endedSkill)&&state.战斗?.状态==='进行中'&&entry.battleId===state.战斗.id){
      const ownerId=skillUsageOwner(state,endedOwner,endedSkill).id;
      state.战斗.扩展.技能冷却??={};state.战斗.扩展.技能冷却[ownerId]??={};
      state.战斗.扩展.技能冷却[ownerId][skillUsageKey(endedSkill)]=Number(endedSkill.cooldownTurns??0);
    }
    const refs=maintenanceRefs(state,sourceId);
    // Release this source before status refresh can reevaluate the remaining capacity.
    releaseMaintain(state,entry.actorId,sourceId);
    for(const ref of refs){
      if(ref.kind==='person-contract')globalThis.SoulPersonContracts.endSource(state,ref.id,reason);
      else if(ref.kind==='construct')globalThis.SoulCreationCore.endConstruct(state,globalThis.SoulCreationCore.constructs(state).find(r=>r.id===ref.id),reason);
      else if(ref.kind==='domain')removeDomain(state,ref.id,receipt,reason);
      else if(ref.kind==='zone')removeZone(state,ref.id,reason);
      else if(ref.kind==='status')removeStatus(state,ref.id,reason,receipt);
      else if(ref.kind==='shield')foundation.clearTemporaryHealth(state.战斗单位.列表[ref.id]);
      else if(ref.kind==='summon'){
        const unit=state.战斗单位.列表[ref.id];removeSummonedSkills(state,unit,receipt,reason);unit.存活状态='死亡';unit.资源.生命.当前=0;
        if(state.战斗.扩展?.成员?.[ref.id])state.战斗.扩展.成员[ref.id].status='removed';
      }
    }
    if(refs.some(ref=>ref.kind==='domain'))recomputeDomainConflicts(state,receipt);
    return maintenanceEvent(state,entry,'stopped',reason,null,receipt);
  }
  function endExchangeReference(state,ref,receipt=null){
    if(ref.battleId&&ref.battleId!==state.战斗.id&&state.世界?.backgroundBattles?.[ref.battleId]){
      const projection=projectBattle(state,ref.battleId);endExchangeReference(projection.state,ref,receipt);
      foundation.commitStateDraft(state,restoreBattleProjection(projection.state,projection.frontId));return;
    }
    if(ref.kind==='domain')removeDomain(state,ref.id,receipt,'exchange-ended');
    else if(ref.kind==='zone')removeZone(state,ref.id,'exchange-ended');
    else if(ref.kind==='summon'){
      const unit=state.战斗单位.列表[ref.id];if(!unit)return;removeSummonedSkills(state,unit,receipt,'exchange-ended');unit.存活状态='死亡';unit.资源.生命.当前=0;
      if(state.战斗.扩展?.成员?.[ref.id])state.战斗.扩展.成员[ref.id].status='removed';
    }
  }
  function pruneMaintenance(state,receipt=null) {
    settleWorldStatusesAt(state,battleNow(state),receipt);
    for(const domain of Object.values(state.战斗?.扩展?.领域实例??{})){
      const selected=domain.扩展?.选择目标ID列表;if(!Array.isArray(selected))continue;
      const actor=state.战斗单位.列表[domain.来源.单位ID];
      domain.扩展.选择目标ID列表=selected.filter(id=>{const target=state.战斗单位.列表[id],keep=actor&&target&&isActiveParticipant(state,id)&&sameSide(state,actor,target)&&domainContains(state,domain,target);if(!keep){for(const status of activeStatuses(state,id).filter(x=>x.来源?.领域ID===domain.id))removeStatus(state,status,'support-range-left',receipt);if(target?.扩展?.temporaryHealthSource===domain.来源.结算单ID)foundation.clearTemporaryHealth(target);}return keep;});
      if(!domain.扩展.选择目标ID列表.length)stopMaintenance(state,domain.来源.结算单ID,'support-targets-left',receipt);
    }
    for(const status of Object.values(state.状态实例?.列表??{}).filter(x=>x.持续?.模式==='来源维持')){
      const actor=state.战斗单位.列表[status.来源?.单位ID],target=state.战斗单位.列表[status.目标单位ID],skill=support.sourceSkill(state,status.来源?.结算单ID,status.来源?.技能ID);
      if(support.maintain(skill)&&(!actor||!target||!isActiveParticipant(state,target.id)||combatDistance(actor,target)>support.range(state,actor.id,skill)))removeStatus(state,status,'support-range-left',receipt);
    }
    support.refreshCosts(state);
    influence.reconcileOrders(state);
    for(const entry of Object.values(state.扩展?.abilityMaintenance??{})){
      const actor=state.战斗单位.列表[entry.actorId],battle=entry.battleId?battleInstances(state).find(b=>b.id===entry.battleId):null;
      const maintainedSource=support.sourceSkill(state,entry.id,entry.skillId),continuous=maintainedSource?.effectGraph?.nodes?.some(n=>n.params?.持续方式==='来源维持'||n.params?.同源维持减耗百分比!==undefined);
      const reason=globalThis.SoulSealingCore?.active(state,entry.actorId)?'source-sealed':!actor||actor.存活状态!=='存活'||actor.资源.生命.当前<=0?'source-invalidated':
        continuous&&actionImpairment(state,entry.actorId).reason?'source-incapacitated':
        state.技能.列表[entry.skillId]?.sourceItemId&&controls.itemEffectBlockReason?.(state,entry.actorId,state.技能.列表[entry.skillId].sourceItemId)?'item-source-sealed':
        (entry.requirements??[]).includes('focus')&&globalThis.SoulAbilityExchange.desireFacts(state,entry.actorId).focusBlocked?'focus-lost':
        entry.scope==='battle'&&entry.battleId&&battle?.状态!=='进行中'?'battle-ended':
        entry.scope==='battle'&&entry.battleId&&battle?.扩展?.成员?.[entry.actorId]?.status!=='active'?'battle-left':
        entry.scope==='battle'&&entry.sourceMartialSoulId&&foundation.activeMartialSoulId(state,entry.actorId)!==entry.sourceMartialSoulId?'martial-soul-switched':
        state.技能.列表[entry.skillId]&&controls.permissionReason(state,entry.actorId,state.技能.列表[entry.skillId])?'power-permission-restricted':
        entry.hadEffects&&!maintenanceRefs(state,entry.id).length?'effects-ended':'';
      if(reason)stopMaintenance(state,entry.id,reason,receipt);
    }
    reconcilePowerCapacity(state,receipt);
  }
  function reconcilePowerCapacity(state,receipt=null){
    if(!Object.keys(state.扩展?.abilityMaintenance??{}).length)return;
    for(const actor of Object.values(state.战斗单位.列表)){
      const entries=Object.values(state.扩展?.abilityMaintenance??{}).filter(e=>e.actorId===actor.id).reverse().sort((a,b)=>b.createdAt-a.createdAt);
      const lockOf=e=>battleInstances(state).reduce((sum,b)=>sum+Object.values(b.扩展?.维持占用??{}).filter(v=>v.sourceId===e.id&&v.unitId===actor.id).reduce((n,v)=>n+v.lock,0),0)+activeStatuses(state,actor.id,'transform.martial_avatar').filter(v=>v.来源?.结算单ID===e.id).reduce((n,v)=>n+Number(v.扩展?.锁定魂力??0),0);
      for(const entry of entries){
        const active=Object.values(state.扩展?.abilityMaintenance??{}).filter(e=>e.actorId===actor.id),total=active.reduce((n,e)=>n+lockOf(e),0),sp=(globalThis.SoulCombatDeployments.soulPowerResource(state,actor.id));
        const capacity=Math.max(0,sp.当前-controls.soulPowerView(state,actor.id).withheld-Math.max(0,sp.锁定-total));
        if(total<=capacity)break;
        if(lockOf(entry)>0)stopMaintenance(state,entry.id,'power-capacity-restricted',receipt);
      }
    }
  }
  function stopUnfundedMaintenance(state,actor,receipt){
    for(const entry of Object.values(state.扩展?.abilityMaintenance??{}).filter(e=>e.actorId===actor.id)){
      const costs=maintenanceCosts(state,entry),needed=costs.filter(c=>c.kind==='soulPower').reduce((sum,c)=>sum+Number(c.amount??0),0);
      if(needed>controls.availableSoulPower(state,actor.id))stopMaintenance(state,entry.id,'power-exhausted',receipt);
    }
    const avatar=activeMartialAvatar(state,actor.id);
    if(avatar&&Number(avatar.扩展?.每回合魂力??0)>controls.availableSoulPower(state,actor.id))endMartialAvatar(state,actor,'power-exhausted',receipt);
    reconcilePowerCapacity(state,receipt);
  }
  function nextMaintenanceAt(state,until=Number.MAX_SAFE_INTEGER) {
    const times=Object.values(state.扩展?.abilityMaintenance??{}).map(e=>e.nextAt).filter(at=>at<=until);
    return times.length?Math.min(...times):null;
  }
  const DAMAGE_STATUS_IDS=['status.burn','status.poison','status.eternal_wound','status.damage_over_time'];
  const PROOF_STATUS_IDS=['status.damage_over_time',...controls.EFFECT_IDS,...effects.HIT_RULE_IDS.filter(id=>id.startsWith('status.')),'status.limited_followup','status.next_check_penalty','transform.sex','transform.disguise','status.buff','status.slow','status.blind','status.resistance_shift','status.bind','status.sleep','status.stun','status.paralysis','status.silence','status.desire','transform.form','transform.martial_avatar','modifier.next_skill'];
  const requiresStatusProof=(id,p={},toxicProof=null)=>PROOF_STATUS_IDS.includes(id)||!!toxicProof||controls.canPersist(id,p)&&p.持续方式&&p.持续方式!=='回合';
  function worldStatusFingerprint(status){return abilities.hash({effectId:status.模板ID,targetId:status.目标单位ID,source:status.来源,duration:status.持续,params:status.快照?.参数,...(status.模板ID==='status.limb_bind'?{layers:status.层数,layerEvents:status.扩展?.解层记录??[]}:{}),sealedSoul:status.扩展?.封印武魂ID??'',limits:status.扩展?.封印限制??null,sourceContract:status.扩展?.持续来源合同,exchangeRecordId:status.扩展?.exchangeRecordId??null,fixedExchange:status.扩展?.固定交换义务??false,toxicProof:status.扩展?.毒药来源??null,...(Object.hasOwn(status.扩展??{},'施术感知')?{operatorPerception:status.扩展.施术感知}:{}),...(status.扩展?.契约处罚来源?{contractPenalty:status.扩展.契约处罚来源}:{})});}
  function controlSourceFingerprint(status){return abilities.hash({id:status.id,effectId:status.模板ID,targetId:status.目标单位ID,source:status.来源,dc:status.快照?.施加者DC,params:status.快照?.参数,...(status.模板ID==='status.limb_bind'?{layers:status.层数,layerEvents:status.扩展?.解层记录??[]}:{}),appliedAt:status.扩展?.施加分钟,sealedSoul:status.扩展?.封印武魂ID??'',limits:status.扩展?.封印限制??null,sourceContract:status.扩展?.持续来源合同,exchangeRecordId:status.扩展?.exchangeRecordId??null,fixedExchange:status.扩展?.固定交换义务??false,toxicProof:status.扩展?.毒药来源??null,...(Object.hasOwn(status.扩展??{},'施术感知')?{operatorPerception:status.扩展.施术感知}:{}),...(status.扩展?.契约处罚来源?{contractPenalty:status.扩展.契约处罚来源}:{})});}
  function nextWorldPoisonAt(state,through=Number.MAX_SAFE_INTEGER){
    const sealing=globalThis.SoulSealingCore,at=battleNow(state);
    const times=Object.values(state.状态实例?.列表??{}).filter(s=>s.模板ID==='status.poison'&&controls.persistent(s)&&!(sealing?.isStasis(state,s.目标单位ID)&&sealing.internalStatus(s))).map(s=>s.扩展.毒伤时钟.nextAt+(sealing?.internalStatus(s)?sealing.pausedMinutes(state,s.目标单位ID,at,s.持续.appliedAt):0)).filter(t=>t<=through);
    return times.length?Math.min(...times):null;
  }
  function advanceWorldPoisonAt(state,at=battleNow(state),receipt=null){
    for(const status of Object.values(state.状态实例?.列表??{}).filter(s=>s.模板ID==='status.poison'&&controls.persistent(s)).sort((a,b)=>a.id.localeCompare(b.id))){
      const sealing=globalThis.SoulSealingCore;if(sealing?.isStasis(state,status.目标单位ID)&&sealing.internalStatus(status))continue;
      const invalid=controls.sourceInvalidReason(state,status);if(invalid){removeStatus(state,status,invalid,receipt);continue;}
      const effectiveAt=sealing?.statusTime(state,status,at)??at,clock=status.扩展.毒伤时钟,target=state.战斗单位.列表[status.目标单位ID];
      while(target&&target.存活状态!=='死亡'&&clock.nextAt<=effectiveAt&&clock.nextAt<=(status.持续.expiresAt??effectiveAt)){
        const pulseAt=clock.nextAt;clock.lastAt=pulseAt;clock.nextAt++;clock.pulses++;
        const p=status.快照.参数,rng=makeRng(`${state.世界.seed}:world-poison:${status.id}:${clock.pulses}`),dice=rollDice(rng,p.骰数??1,p.骰面??4,'世界分钟毒伤');
        const upcastBonus=consumePersistentUpcast(status),amplified=foundation.amplifyElementDamage(periodicOutputAmount(state,status,dice.total*Math.max(1,status.层数??1)+upcastBonus),status.快照.属性增伤);
        const resistance=resolveResistance(state,target,'毒蚀',amplified.amount,p.穿透档??0,{exchangeSource:status.来源,exchangeAbility:status.扩展?.持续来源合同,sourceUnitId:status.来源.单位ID,outputPermission:status.扩展.输出许可});
        const applied=applyResolvedDamage(state,target,resistance,{sourceUnitId:status.来源.单位ID,damageType:'毒蚀',worldPoison:true,sourceId:status.id});
        const event={id:`${status.id}:${status.持续.appliedAt}:pulse:${clock.pulses}`,appliedAt:status.持续.appliedAt,pulse:clock.pulses,statusProof:clone(status),statusId:status.id,targetId:target.id,sourceUnitId:status.来源.单位ID,at,pulseAt,event:'world-poison-tick',dice,upcastBonus,rawAmount:amplified.amount,resistance,...applied,remainingHp:target.资源.生命.当前,lifeState:target.存活状态};
        const events=state.扩展.worldPoisonEvents??=[];event.previousHash=events.at(-1)?.hash??null;event.hash=abilities.hash(event);events.push(event);if(receipt?.statusEvents){const row={event:'tick',damageType:'毒蚀',sourceSkillId:status.来源.技能ID,sourceReceiptId:status.来源.结算单ID};for(const key of ['statusId','targetId','sourceUnitId','dice','upcastBonus','rawAmount','resistance','shieldUsed','hpDamage','equipmentReduction','absorbedAsShield','nonlethalPrevented','nonlethal','shieldOffered','temporaryHpBefore','temporaryHp','shieldUnused','remainingHp'])if(event[key]!==undefined)row[key]=clone(event[key]);receipt.statusEvents.push(row);}
      }
    }
  }
  function nextWorldRegenerationAt(state,through=Number.MAX_SAFE_INTEGER){
    const sealing=globalThis.SoulSealingCore,at=battleNow(state);
    const times=Object.values(state.状态实例?.列表??{}).filter(v=>v.模板ID==='status.regeneration'&&controls.persistent(v)&&!(sealing?.isStasis(state,v.目标单位ID)&&sealing.internalStatus(v))).map(v=>v.扩展.再生时钟.nextAt+(sealing?.internalStatus(v)?sealing.pausedMinutes(state,v.目标单位ID,at,v.持续.appliedAt):0)).filter(t=>t<=through);
    return times.length?Math.min(...times):null;
  }
  function advanceWorldRegenerationAt(state,at=battleNow(state),receipt=null){
    for(const status of Object.values(state.状态实例?.列表??{}).filter(v=>v.模板ID==='status.regeneration'&&controls.persistent(v)).sort((a,b)=>a.id.localeCompare(b.id))){
      const sealing=globalThis.SoulSealingCore;if(sealing?.isStasis(state,status.目标单位ID)&&sealing.internalStatus(status))continue;
      const invalid=controls.sourceInvalidReason(state,status);if(invalid){removeStatus(state,status,invalid,receipt);continue;}
      const effectiveAt=sealing?.statusTime(state,status,at)??at,clock=status.扩展.再生时钟,target=state.战斗单位.列表[status.目标单位ID];
      while(target&&target.存活状态!=='死亡'&&(!state.人物?.列表?.[target.id]||!people.isDead(state,target.id))&&clock.nextAt<=effectiveAt&&clock.nextAt<=(status.持续.expiresAt??effectiveAt)){
        const pulseAt=clock.nextAt;clock.lastAt=pulseAt;clock.nextAt++;clock.pulses++;
        const params=status.快照.参数,dice=rollDice(makeRng(`${state.世界.seed}:world-regeneration:${status.id}:${clock.pulses}`),params.骰数??1,params.骰面??4,'世界分钟再生');
        const before=target.资源.生命.当前,amount=Math.min(Math.max(0,target.资源.生命.最大-before),Math.floor(periodicOutputAmount(state,status,dice.total+(params.加值??0))*healingMultiplier(state,target)));
        target.资源.生命.当前+=amount;recoverConsciousness(state,target);
        const event={id:`${status.id}:${status.持续.appliedAt}:pulse:${clock.pulses}`,appliedAt:status.持续.appliedAt,pulse:clock.pulses,statusProof:clone(status),statusId:status.id,targetId:target.id,sourceUnitId:status.来源.单位ID,at,pulseAt,event:'world-regeneration-tick',witnessIds:globalThis.SoulCreationCore.witnesses(state,state.人物?.列表?.[target.id]?actions.positionOf(state,target.id):null),dice,before,amount,remainingHp:target.资源.生命.当前};
        const events=state.扩展.worldRegenerationEvents??=[];event.previousHash=events.at(-1)?.hash??null;event.hash=abilities.hash(event);events.push(event);
        receipt?.statusEvents?.push({statusId:status.id,event:'regeneration',dice,upcastBonus:0,amount,targetId:target.id,remainingHp:target.资源.生命.当前,sourceUnitId:status.来源.单位ID,sourceSkillId:status.来源.技能ID});
      }
    }
  }
  function settleWorldStatusesAt(state,at=battleNow(state),receipt=null){
    custody.reconcileDeaths(state);
    for(const status of Object.values(state.状态实例?.列表??{})){
      if(!controls.persistent(status)&&!controls.EFFECT_IDS.includes(status.模板ID))continue;
      const target=state.战斗单位.列表[status.目标单位ID];
      const reason=status.持续.模式==='世界分钟'&&status.持续.expiresAt<=(globalThis.SoulSealingCore?.statusTime(state,status,at)??at)?'expired':status.扩展?.固定交换义务?(!target?'target-dead':state.人物?.列表?.[target.id]?.status==='dead'?'real-person-dead':''):!target||target.存活状态==='死亡'?'target-dead':controls.sourceInvalidReason(state,status);
      if(reason)removeStatus(state,status,reason,receipt);
    }
  }
  // Historical proof is checked at the recorded operation time, independently
  // of whether that source remains active in the present world.
  function validateControlSourceProof(status,targetId,atMinute,contextState=null){
    try{
      if(!status||status.目标单位ID!==targetId||status.状态!=='生效'||!requiresStatusProof(status.模板ID,status.快照?.参数,status.扩展?.毒药来源)||!Number.isSafeInteger(atMinute))return false;
      const duration=status.持续,at=duration.appliedAt,params=status.快照.参数,source=status.扩展?.持续来源合同;
      if(!source||!abilities.verify(source).pass||!effects.validateGraph(source.effectGraph,{ageTier:source.ageTier??'十万年',mechanismCap:source.mechanismCap??'规则'}).pass)return false;
        if(effects.EFFECT_REGISTRY[status.模板ID]?.hitRule){const uses=status.扩展?.剩余次数;if(!Number.isInteger(uses)||uses<1||uses>params.次数)throw Error('命中干涉次数');}
        if(status.模板ID==='status.limb_bind'){let layers=status.扩展.初始层数;if(!Number.isInteger(layers)||layers<1||layers>6)throw Error('初始层数');for(const e of status.扩展.解层记录??[]){if(e.before!==layers||e.after!==layers-1||e.at>atMinute)throw Error('解层记录');layers=e.after;}if(status.层数!==layers||layers<1)throw Error('剩余层数');}
        if(status.模板ID==='status.next_check_penalty'&&(!Number.isSafeInteger(status.扩展.剩余次数)||status.扩展.剩余次数<1||status.扩展.剩余次数>params.次数))throw Error('检定次数');
        if(status.模板ID==='status.limited_followup'&&(!Number.isSafeInteger(status.层数)||status.层数<1||status.层数>params.层数||status.扩展.剩余次数!==status.层数||status.扩展.作用来源!==mechanics.scope(source)||abilities.hash(status.扩展.追击来源合同)!==abilities.hash(source)||!Number.isSafeInteger(status.扩展.回合触发次数??0)||Number(status.扩展.回合触发次数??0)<0||Number(status.扩展.回合触发次数??0)>params.每回合上限))throw Error('追击数量或来源');
        if(status.扩展.来源合同指纹!==controlSourceFingerprint(status)||!Number.isSafeInteger(status.扩展.施加分钟)||status.扩展.施加分钟<0||status.扩展.施加分钟>atMinute)throw Error('冻结来源');
        if(source.持有者单位ID&&source.持有者单位ID!==status.来源.单位ID)throw Error('来源人物');
        const node=source.effectGraph.nodes.find(n=>n.id===status.来源.效果ID),penalty=status.扩展?.契约处罚来源;
        let expected=effectOutputProfile(effects.effectiveWorldNode(source,node?.id),source).node;
        if(effects.deferredNode(source,node?.id)!==Boolean(penalty))throw Error('契约处罚缺少真实触发来源');
        if(penalty){if(!contextState||globalThis.SoulPersonContracts?.validatePenaltyStatus?.(contextState,status,{targetId,atMinute})!==true)throw Error('契约处罚缺少真实永久事件');const derived=effects.deriveTriggerOrigin(source,penalty.derivation?.release,penalty.derivation?.selection);if(!penalty.triggerId||abilities.hash(derived)!==abilities.hash(penalty.derivation))throw Error('契约处罚派生');expected=derived.nodes?.find(n=>n.id===node?.id)??derived.node;}
        if(!node||node.effectId!==status.模板ID||abilities.hash(expected.params)!==abilities.hash(params)||source.id!==status.来源.技能ID||skillMartialSoulId(source)!==status.来源.武魂ID||(source.sourceItemId??'')!==(status.来源.物品ID??''))throw Error('来源参数');
        if(status.模板ID==='transform.martial_avatar'&&duration.模式==='本场战斗'){
          if(duration.战斗ID!==status.来源.战斗ID||!duration.战斗ID||Object.hasOwn(duration,'剩余回合')||Object.hasOwn(duration,'expiresAt'))throw Error('战斗绑定期限');
          return true;
        }
        if((params.持续方式??'回合')==='回合'){
          if(duration.模式!=='目标回合结束'||!Number.isSafeInteger(duration.剩余回合)||duration.剩余回合<1||duration.剩余回合>(params.持续回合??1)||typeof duration.延后首次目标回合结束!=='boolean'||abilities.hash(duration.触发时点)!==abilities.hash(['目标回合开始','目标回合结束'])||Object.hasOwn(duration,'expiresAt')||Object.hasOwn(duration,'appliedAt'))throw Error('回合期限');
          return true;
        }
        if(at!==status.扩展.施加分钟||!Number.isSafeInteger(at)||at<0||at>atMinute||Object.hasOwn(duration,'剩余回合')||abilities.hash(duration)!==abilities.hash(controls.duration(params,at)))throw Error('世界期限');
        if(status.扩展.持续合同指纹!==worldStatusFingerprint(status)||status.清理规则?.战斗结束!==false||status.清理规则?.来源失能!==false)throw Error('冻结合同');
        if(params.来源依赖==='道具有效'&&!status.来源.物品ID||params.来源依赖==='施术武魂'&&!status.来源.武魂ID)throw Error('依赖来源');
        if(duration.expiresAt!==undefined&&duration.expiresAt<=atMinute)throw Error('已到期');
      return true;
    }catch{return false;}
  }
  function frozenDamageSourceValid(entry,effectId){
    const source=entry.扩展?.持续来源合同,origin=entry.来源;if(!source)return true;
    if(!origin||!abilities.verify(source).pass||source.id!==origin.技能ID||source.持有者单位ID&&source.持有者单位ID!==origin.单位ID)return false;
    if(source.sourceItemId&&origin.物品ID&&source.sourceItemId!==origin.物品ID)return false;
    const soulId=source.sourceMartialSoulId??source.来源武魂ID;if(soulId&&origin.武魂ID&&soulId!==origin.武魂ID)return false;
    return source.effectGraph?.nodes?.some(node=>node.id===origin.效果ID&&node.effectId===effectId)??false;
  }
  function validateWorldStatuses(state){
    const errors=[],poisonEvents=state.扩展?.worldPoisonEvents??[];
    let previousHash=null;
    const seenPoisonEvents=new Set();
    for(const event of poisonEvents){
      try{
        const {hash,...body}=event,proof=event.statusProof;
        if(hash!==abilities.hash(body)||event.previousHash!==previousHash||seenPoisonEvents.has(event.id)||event.id!==`${event.statusId}:${event.appliedAt}:pulse:${event.pulse}`||!Number.isSafeInteger(event.pulse)||event.pulse<1||!Number.isSafeInteger(event.at)||event.at>battleNow(state)||event.pulseAt!==event.appliedAt+event.pulse||event.pulseAt>event.at||proof?.模板ID!=='status.poison'||proof.id!==event.statusId||proof.持续.appliedAt!==event.appliedAt||proof.目标单位ID!==event.targetId||proof.来源.单位ID!==event.sourceUnitId||!validateControlSourceProof(proof,event.targetId,event.pulseAt-1))throw Error('毒伤结算来源或事件链');
        const expected=rollDice(makeRng(`${state.世界.seed}:world-poison:${event.statusId}:${event.pulse}`),proof.快照.参数.骰数??1,proof.快照.参数.骰面??4,'世界分钟毒伤');
        if(abilities.hash(expected)!==abilities.hash(event.dice))throw Error('毒伤骰值');
        seenPoisonEvents.add(event.id);previousHash=hash;
      }catch(error){errors.push(`日常毒伤记录${event?.id??''}${error.message}无效`);}
    }
    const regenEvents=state.扩展?.worldRegenerationEvents??[];let regenHash=null;const regenIds=new Set();
    for(const event of regenEvents)try{
      const {hash,...body}=event,p=event.statusProof;
      if(hash!==abilities.hash(body)||event.previousHash!==regenHash||regenIds.has(event.id)||event.id!==`${event.statusId}:${event.appliedAt}:pulse:${event.pulse}`||event.pulseAt!==event.appliedAt+event.pulse||event.at>battleNow(state)||event.pulseAt>event.at||p?.模板ID!=='status.regeneration'||p.id!==event.statusId||p.目标单位ID!==event.targetId||p.来源.单位ID!==event.sourceUnitId||!validateControlSourceProof(p,event.targetId,event.pulseAt-1)||event.amount<0||event.remainingHp!==event.before+event.amount)throw Error('来源、时间或恢复量');
      const dice=rollDice(makeRng(`${state.世界.seed}:world-regeneration:${event.statusId}:${event.pulse}`),p.快照.参数.骰数??1,p.快照.参数.骰面??4,'世界分钟再生');if(abilities.hash(dice)!==abilities.hash(event.dice)||event.amount>dice.total+(p.快照.参数.加值??0))throw Error('再生数值');
      regenIds.add(event.id);regenHash=hash;
    }catch(error){errors.push(`日常再生记录${event?.id??''}${error.message}无效`);}
    for(const [id,status] of Object.entries(state.状态实例?.列表??{})){
      const declared=status.快照?.参数?.持续方式;
      if(['来源维持','来源下回合'].includes(status.持续?.模式)&&(declared===status.持续.模式||['status.amplify','status.invulnerable'].includes(status.模板ID)))continue; // support.validate checks the signed effect and real maintenance ledger
      if(DAMAGE_STATUS_IDS.includes(status.模板ID)&&status.扩展?.持续来源合同&&!requiresStatusProof(status.模板ID,status.快照?.参数,status.扩展?.毒药来源)){if(!frozenDamageSourceValid(status,status.模板ID))errors.push(`持续伤害${id}来源无效`);continue;}
      if(!requiresStatusProof(status.模板ID,status.快照?.参数,status.扩展?.毒药来源)&&!controls.persistent(status)&&!status.扩展?.持续来源合同&&(!declared||declared==='回合'))continue;
      try{
        if(!requiresStatusProof(status.模板ID,status.快照?.参数,status.扩展?.毒药来源)||id!==status.id||status.状态!=='生效')throw Error('期限类型或活动标识');
        const duration=status.持续,at=duration.appliedAt,params=status.快照.参数;
        if(status.模板ID==='status.regeneration'&&controls.persistent(status)){
          const c=status.扩展?.再生时钟,now=globalThis.SoulSealingCore?.statusTime(state,status,battleNow(state))??battleNow(state),events=regenEvents.filter(e=>e.statusId===id&&e.appliedAt===at);
          if(c?.version!==1||!Number.isSafeInteger(c.pulses)||c.pulses<0||c.lastAt!==at+c.pulses||c.nextAt!==c.lastAt+1||c.nextAt<=now||events.length!==c.pulses||events.some((e,i)=>e.pulse!==i+1))throw Error('再生个人分钟时钟');
        }
        if(status.模板ID==='status.poison'&&controls.persistent(status)){
          const c=status.扩展?.毒伤时钟,now=globalThis.SoulSealingCore?.statusTime(state,status,battleNow(state))??battleNow(state);
          if(c?.version!==1||!Number.isSafeInteger(c.pulses)||c.pulses<0||c.lastAt!==at+c.pulses||c.nextAt!==c.lastAt+1||c.lastAt>now||c.lastAt>(duration.expiresAt??now)||c.nextAt<=now)throw Error('毒伤个人分钟时钟');
          const pulses=poisonEvents.filter(e=>e.statusId===id&&e.appliedAt===at);
          if(pulses.length!==c.pulses||pulses.some((e,i)=>e.pulse!==i+1||e.pulseAt!==at+i+1))throw Error('毒伤时钟与实际结算记录');
        }
        const source=status.扩展?.持续来源合同;
        if(!source||!abilities.verify(source).pass||!effects.validateGraph(source.effectGraph,{ageTier:source.ageTier??'十万年',mechanismCap:source.mechanismCap??'规则'}).pass)throw Error('能力来源');
        if(source.sourceKind==='restraint'){
          const item=state.物品?.实例?.[source.sourceItemId];
          if(!item?.attachment||item.attachment.wearerId!==status.目标单位ID||source.持有者单位ID!==(item.attachment.effectActorId??item.attachment.attachedBy)||status.快照.施加者DC!==custody.resolveDevice(item)?.breakDifficulty||abilities.fingerprint(source)!==abilities.fingerprint(custodyDeviceAbility(item,source.持有者单位ID,item.attachment.sourceId)))throw Error('拘束器实际模式');
        }
        if(!validateControlSourceProof(status,status.目标单位ID,globalThis.SoulSealingCore?.statusTime(state,status,battleNow(state))??battleNow(state),state))throw Error('来源/期限合同');
      }catch(error){errors.push(`持续状态${id}${error.message}无效`);}
    }
    return errors;
  }
  function advanceMaintenanceAt(state,at,actorId='',receipt=null) {
    pruneMaintenance(state,receipt);
    const entries=Object.values(state.扩展?.abilityMaintenance??{}).filter(e=>e.nextAt<=at&&(!actorId||e.actorId===actorId)).sort((a,b)=>a.createdAt-b.createdAt||a.id.localeCompare(b.id));
    for(const entry of entries){
      if(!state.扩展.abilityMaintenance[entry.id])continue;
      const costs=maintenanceCosts(state,entry);
      const contract={id:entry.skillId,usageKey:entry.id,soulPowerCost:0,resourceCosts:costs};
      const itemNames=Array.isArray(receipt?.maintenanceEvents)?Object.fromEntries(Object.values(state.物品?.实例??{}).map(i=>[i.id,i.name])):null;
      let payment;
      try{payment=abilities.pay(state,entry.actorId,contract,`${entry.id}:maintenance:${entry.nextAt}`);}
      catch(error){const stopped=stopMaintenance(state,entry.id,'maintenance-broken',receipt);if(stopped)stopped.failure=error.message;continue;}
      entry.payments++;entry.lastPaidAt=entry.nextAt;entry.nextAt++;
      if(entry.scope==='world'){
        const battle=actions.battleOf(state,entry.actorId);
        if(battle){
          battle.扩展.externalWorldPayments??={};
          const spent=battle.扩展.externalWorldPayments[entry.actorId]??={health:0,soulPower:0};
          for(const kind of ['health','soulPower'])spent[kind]+=payment.totals[kind];
        }
      }
      maintenanceEvent(state,entry,'paid','',payment,receipt,itemNames);
      // Existing battle narration has a closed vocabulary; resource details are
      // separately recorded in maintenanceEvents, never invented as damage.
      receipt?.statusEvents?.push({event:'maintenance-paid',unitId:entry.actorId,amount:payment.totals.soulPower,soulPowerBefore:state.战斗单位.列表[entry.actorId].资源.魂力.当前+payment.totals.soulPower,remainingSoulPower:state.战斗单位.列表[entry.actorId].资源.魂力.当前});
    }
  }
  function validateMaintenance(state) {
    const errors=[...support.validate(state)];
    for(const [id,e] of Object.entries(state.扩展?.abilityMaintenance??{})){
      if(!e||e.id!==id||!state.战斗单位?.列表?.[e.actorId]||typeof e.skillId!=='string'||typeof e.battleId!=='string'||typeof e.hadEffects!=='boolean'||!Number.isSafeInteger(e.createdAt)||!Number.isSafeInteger(e.nextAt)||e.nextAt<=e.createdAt||!Number.isSafeInteger(e.payments)||e.payments<0||e.nextAt!==e.createdAt+e.payments+1||state.世界?.时间&&e.nextAt<battleNow(state))errors.push(`持续费用来源或时钟无效：${id}`);
      if(!Array.isArray(e?.costs)||e?.createdAt<0||!['world','battle'].includes(e?.scope)||e?.scope==='battle'&&e?.battleId&&!battleInstances(state).some(b=>b.id===e.battleId))errors.push(`持续费用合同无效：${id}`);
      if(e&&e.contractHash!==maintenanceFingerprint(e))errors.push(`持续费用合同指纹不一致：${id}`);
      const validation=abilities.validate({id:id||'invalid',maintenanceCosts:e?.costs});if(!validation.pass)errors.push(...validation.errors);
    }
    return errors;
  }
  function releaseDeploymentParticipant(state,unitId){if(!globalThis.SoulCombatDeployments.sourceContext(state,unitId)?.deploymentId&&!globalThis.SoulManifestation?.forUnit(state,unitId))throw Error('没有正式出战来源');const battle=[state.战斗,...Object.values(state.世界?.backgroundBattles??{})].find(b=>b.状态==='进行中'&&b.扩展?.成员?.[unitId]?.status==='active');if(!battle)return;const front=state.战斗;state.战斗=battle;try{battle.扩展.成员[unitId].status='removed';releaseParticipant(state,unitId);}finally{state.战斗=front;}}
  function releaseParticipant(state,unitId) {
    globalThis.SoulCombatDeployments.finishParticipant(state,unitId,'离开本场战斗');
    for(const status of Object.values(state.状态实例.列表))if(status.来源?.战斗ID===state.战斗.id&&status.清理规则?.战斗结束&&(status.目标单位ID===unitId||status.来源?.单位ID===unitId&&status.清理规则?.来源失能))removeStatus(state,status,'battle-left');
    for(const domain of Object.values(state.战斗.扩展.领域实例??{}))if(domain.来源?.单位ID===unitId)removeDomain(state,domain.id,null,'battle-left');
    for(const zone of Object.values(state.战斗.扩展.区域效果??{}))if(zone.来源?.单位ID===unitId)removeZone(state,zone.id,'battle-left');
    releaseMaintain(state,unitId);
    if(!occupiedBattle(state,unitId,state.战斗.id))foundation.clearTemporaryHealth(state.战斗单位.列表[unitId]);
    pruneMaintenance(state);
  }

  function recordStatusLifecycle(state, status, event, reason = '') {
    if(controls.persistent(status)&&['applied','removed'].includes(event)){
      state.扩展.worldStatusEvents??=[];
      state.扩展.worldStatusEvents.push({id:`${status.id}:${event}`,statusId:status.id,effectId:status.模板ID,targetId:status.目标单位ID,at:battleNow(state),event,reason,source:clone(status.来源),duration:clone(status.持续)});
      if(state.扩展.worldStatusEvents.length>200)state.扩展.worldStatusEvents.splice(0,state.扩展.worldStatusEvents.length-200);
    }
    const evidence = actionEvidence.get(state);
    if (!evidence) return;
    evidence.receipt.statusLifecycle.push({
      order:++evidence.order, phase:evidence.phase, event, reason,
      targetId:status.目标单位ID, status:{...statusPublicView(state,status),
        triggered:Boolean(status.扩展?.已触发), deferredFirstEnd:Boolean(status.持续?.延后首次目标回合结束)}
    });
  }

  function recordFieldLifecycle(state, field, kind, event, reason = '') {
    const evidence = actionEvidence.get(state);
    if (!evidence) return;
    evidence.receipt.fieldLifecycle.push({order:++evidence.order,phase:evidence.phase,event,reason,
      field:{id:field.id,kind,source:clone(field.来源),params:clone(field.参数),remainingRounds:field.剩余回合,
        state:field.状态,position:clone(kind==='domain'?domainCenter(state,field):{距离区:field.距离区,站位簇:field.站位簇,战场坐标:field.战场坐标}),
        ...(kind==='domain'?{suppressorIds:clone(field.压制者ID列表 ?? []),memberIds:clone(field.成员ID列表 ?? [])}:{})}
    });
  }

  function removeZone(state, zoneId, reason) {
    const zone = state.战斗.扩展.区域效果[zoneId];
    if (!zone) return;
    recordFieldLifecycle(state,zone,'zone','removed',reason);
    delete state.战斗.扩展.区域效果[zoneId];
  }

  function movementImpairment(state, actorId) {
    return controls.actionReason(state,actorId,'move');
  }

  /** Current restrictions, not a promise that an unspecified target/skill is legal. */
  function combatActionConstraints(state, actorId) {
    const unit = state.战斗单位?.列表?.[actorId];
    if (!unit) return null;
    const impairment = actionImpairment(state,actorId);
    const sources = effectId => activeStatuses(state,actorId,effectId).map(status=>({statusId:status.id,sourceUnitId:status.来源?.单位ID ?? ''}));
    return {
      mainAction:impairment, voluntaryMovementReason:movementImpairment(state,actorId),
      silence:sources('status.silence'), cannotApproach:sources('status.fear').filter(v=>actions.perception(state,actorId,v.sourceUnitId)), cannotAttack:sources('status.charm'),
      restrictions:controls.restrictions(state,actorId),
      power:controls.powerFacts(state,actorId),
      influence:influence.facts(state,actorId),
      desire:globalThis.SoulAbilityExchange.desireFacts(state,actorId),
      exchanges:recordsForActor(state,actorId),
      canAttemptBreakFree:controls.breakable(state,actorId).length > 0 && !impairment.surprised,
      activeMartialSoulId:foundation.activeMartialSoulId(state,actorId),
      martialAvatarStatusId:activeMartialAvatar(state,actorId)?.id ?? null
    };
  }
  function recordsForActor(state,id){return Object.values(state.扩展?.abilityExchanges??{}).filter(r=>r.actorId===id&&r.status==='active').map(r=>({id:r.id,mode:r.contract.mode,sourceId:r.sourceId,selfStatusIds:clone(r.selfStatusIds),supportingStatusIds:clone(r.supportingStatusIds),benefitRefs:clone(r.benefitRefs),startedAt:r.startedAt,durationMinutes:r.contract.durationMinutes}));}

  function combatEvidenceSnapshot(state, unitIds = state.战斗.参与者ID列表 ?? []) {
    return Object.fromEntries(unitIds.flatMap(id=>{
      const unit = state.战斗单位.列表[id];
      if (!unit) return [];
      return [[id,{
        life:unit.存活状态, membership:battleMember(state,id)?.status ?? null,
        hp:unit.资源.生命.当前, hpMax:unit.资源.生命.最大, shield:unit.资源.生命.临时,
        sp:(globalThis.SoulCombatDeployments.soulPowerResource(state,unit.id)).当前, spMax:(globalThis.SoulCombatDeployments.soulPowerResource(state,unit.id)).最大, spLocked:(globalThis.SoulCombatDeployments.soulPowerResource(state,unit.id)).锁定, spUpkeep:(globalThis.SoulCombatDeployments.soulPowerResource(state,unit.id)).持续消耗,
        position:clone(unit.位置), skillIds:clone(unit.能力?.技能ID ?? []), constraints:combatActionConstraints(state,id)
      }]];
    }));
  }

  function recordCombatChanges(state, before, receipt, phase, unitIds) {
    const after = combatEvidenceSnapshot(state,unitIds);
    const compared=(unit,key)=>{
      const value=unit?.[key];if(key!=='constraints'||!value?.power)return value;
      const p=value.power;return {...value,power:{soulPowerPercent:p.soulPower.percent,damagePercent:p.damagePercent,maximumCastRank:p.maximumCastRank,sources:p.sources,permissions:p.permissions}};
    };
    for (const unitId of new Set([...Object.keys(before),...Object.keys(after)])) {
      const left = before[unitId], right = after[unitId];
      const changes = Object.fromEntries([...new Set([...Object.keys(left ?? {}),...Object.keys(right ?? {})])]
        .filter(key=>JSON.stringify(compared(left,key)) !== JSON.stringify(compared(right,key)))
        .map(key=>[key,{before:clone(left?.[key] ?? null),after:clone(right?.[key] ?? null)}]));
      if (Object.keys(changes).length) receipt.stateChanges.push({unitId,phase,changes});
    }
    return after;
  }

  function settleFieldItemEvidence(state,receipt,unitIds,settle) {
    const before=combatEvidenceSnapshot(state,unitIds);
    Object.assign(receipt,{actionStateBefore:before,stateChanges:[],statusLifecycle:[],fieldLifecycle:[]});
    actionEvidence.set(state,{receipt,phase:'field-action',order:0});
    try {settle();globalThis.SoulCooperationCore?.reconcile(state);globalThis.SoulCooperationPreparation?.reconcile(state);recordCombatChanges(state,before,receipt,'field-action',unitIds);return {state,receipt};}
    finally {actionEvidence.delete(state);}
  }

  function battleMember(state, unitId) {
    return state.战斗?.扩展?.成员?.[unitId] ?? null;
  }

  function sideIdOf(state, unitOrId) {
    const unit = typeof unitOrId === 'string' ? state.战斗单位.列表[unitOrId] : unitOrId;
    if (!unit) return '';
    return String(battleMember(state, unit.id)?.sideId ?? unit.阵营 ?? '');
  }

  function sameSide(state, left, right) {
    const leftSide = sideIdOf(state, left);
    return Boolean(leftSide) && leftSide === sideIdOf(state, right);
  }

  function isPresentParticipant(state, unitId) {
    const member = battleMember(state, unitId);
    return state.战斗.参与者ID列表.includes(unitId) && (!member || !['escaped', 'removed'].includes(member.status));
  }

  function isActiveParticipant(state, unitId) {
    const unit = state.战斗单位.列表[unitId];
    const member = battleMember(state, unitId);
    return Boolean(unit) && isPresentParticipant(state, unitId) && unit.存活状态 === '存活' && unit.资源.生命.当前 > 0 && (!member || member.status === 'active');
  }

  function activeParticipants(state) {
    return state.战斗.参与者ID列表.map(id => state.战斗单位.列表[id]).filter(unit => unit && isActiveParticipant(state, unit.id));
  }

  function ensureBattleCollections(state) {
    state.战斗.扩展 ??= {};
    state.战斗.扩展.成员 ??= {};
    state.战斗.扩展.队伍 ??= {};
    state.战斗.扩展.撤退协助 ??= {};
    state.战斗.扩展.区域效果 ??= {};
    state.战斗.扩展.领域实例 ??= {};
    state.战斗.扩展.召唤记录 ??= {};
    state.战斗.扩展.击杀记录 ??= [];
    state.战斗.扩展.武魂触发 ??= {};
    state.战斗.扩展.武魂真身使用 ??= {};
    state.战斗.扩展.技能使用次数 ??= {};
    state.战斗.扩展.技能组使用次数 ??= {};
    state.战斗.扩展.规则 ??= {};
    state.战斗.扩展.结算单列表 ??= [];
    state.战斗.扩展.已结算行动 ??= {};
  }

  function normalizedSeed(seed) {
    if (typeof seed === 'number' && Number.isFinite(seed)) return (seed >>> 0) || 0x6d2b79f5;
    let hash = 2166136261;
    for (const char of String(seed ?? '')) {
      hash ^= char.codePointAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) || 0x6d2b79f5;
  }

  function makeRng(seed) {
    const initialSeed = normalizedSeed(seed);
    let state = initialSeed;
    let draws = 0;
    return {
      next() {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        draws += 1;
        return state / 0x100000000;
      },
      die(sides) { return Math.floor(this.next() * sides) + 1; },
      snapshot() { return {seed: initialSeed, state, draws}; }
    };
  }

  function resumeRng(snapshot) {
    const rng = makeRng(snapshot?.state ?? snapshot?.seed ?? 1);
    const baseNext = rng.next.bind(rng);
    let state = normalizedSeed(snapshot?.state ?? snapshot?.seed ?? 1);
    let draws = round(snapshot?.draws ?? 0);
    const initialSeed = normalizedSeed(snapshot?.seed ?? snapshot?.state ?? 1);
    rng.next = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      draws += 1;
      return state / 0x100000000;
    };
    rng.die = sides => Math.floor(rng.next() * sides) + 1;
    rng.snapshot = () => ({seed: initialSeed, state, draws});
    void baseNext;
    return rng;
  }

  function rollDice(rng, count, sides, label) {
    const rolls = Array.from({length: Math.max(0, round(count))}, () => rng.die(Math.max(2, round(sides))));
    return {label, count: rolls.length, sides: Math.max(2, round(sides)), rolls, total: rolls.reduce((sum, value) => sum + value, 0)};
  }

  function activeStatuses(state, unitId, templateId = null) {
    return controls.statusesFor(state,unitId,templateId);
  }

  function statusPublicView(state, statusOrId) {
    const status = typeof statusOrId === 'string' ? state.状态实例?.列表?.[statusOrId] : statusOrId;
    if (!status) return null;
    const sourceUnit = state.战斗单位?.列表?.[status.来源?.单位ID];
    const sourceSkill = state.技能?.列表?.[status.来源?.技能ID];
    const definition = effects.EFFECT_REGISTRY[status.模板ID] ?? {};
    return {
      instanceId:status.id,effectId:status.模板ID,name:status.模板ID==='status.amplify'?`${sourceSkill?.name??'持续加持'} · ${status.快照?.参数?.指标}`:definition.displayName ?? status.模板ID,
      family:status.分类 ?? definition.family ?? 'status',negative:Boolean(status.扩展?.负面),
      layers:Number(status.层数 ?? 1),strength:Number(status.强度 ?? status.快照?.参数?.数值 ?? 0),
      durationMode:status.模板ID==='transform.martial_avatar'?'本场战斗':status.持续?.模式 ?? '',remainingRounds:status.模板ID==='transform.martial_avatar'?0:Number(status.持续?.剩余回合 ?? 0),
      ...(controls.persistent(status)?{appliedAt:status.持续.appliedAt,expiresAt:status.持续.expiresAt??null,remainingMinutes:status.持续.expiresAt===undefined?null:Math.max(0,status.持续.expiresAt-(globalThis.SoulSealingCore?.statusTime(state,status,battleNow(state))??battleNow(state))),sourcePolicy:status.快照?.参数?.来源依赖}:{}),
      usesRemaining:Number(status.扩展?.剩余次数 ?? 0),state:status.状态 ?? '生效',
      sourceUnitId:status.来源?.单位ID ?? '',sourceUnitName:sourceUnit?.名称 ?? status.来源?.单位ID ?? '未知来源',
      sourceSkillId:status.来源?.技能ID ?? '',sourceSkillName:sourceSkill?.name ?? sourceSkill?.名称 ?? status.扩展?.sourceName ?? status.来源?.技能ID ?? '未知技能',
      sourceMartialSoulId:status.来源?.武魂ID ?? '',sourceRingId:status.来源?.魂环ID ?? '',
      sourceEffectId:status.来源?.效果ID ?? '',sourceReceiptId:status.来源?.结算单ID ?? '',
      sealedMartialSoulId:status.扩展?.封印武魂ID??'',
      params:{...clone(status.快照?.参数 ?? {}),...(status.模板ID==='status.amplify'?{数值:support.value(state,status)}:{})}
    };
  }

  function listStatusViews(state, unitId) {
    return activeStatuses(state,unitId).map(status => statusPublicView(state,status)).filter(Boolean);
  }

  function strongestStatusValue(state, unitId, templateId, parameterKey, attribute = null) {
    const values = activeStatuses(state, unitId, templateId)
      .filter(status => attribute === null || status.快照?.参数?.[parameterKey] === attribute)
      .map(status => Number(status.强度 ?? status.快照?.参数?.数值 ?? 0));
    const extra=templateId==='status.buff'&&attribute!==null?support.stat(state,unitId,attribute):0;
    if(extra)return Math.max(extra,...values.filter(n=>n>0))+Math.min(0,...values.filter(n=>n<0));
    // 同绝对值时以后施加者为准；对象插入顺序即状态施加顺序。
    return values.reduce((chosen, value) => Math.abs(value) >= Math.abs(chosen) ? value : chosen, 0);
  }

  function strongestStatusMagnitude(state, unitId, templateId, fallback = 0) {
    return activeStatuses(state, unitId, templateId)
      .reduce((maximum, status) => Math.max(maximum, Number(status.强度 ?? status.快照?.参数?.数值 ?? fallback)), 0);
  }

  function attackStatusModifier(state, unitId, skill) {
    const values = activeStatuses(state, unitId, 'status.buff')
      .filter(status => status.快照?.参数?.属性 === '攻击检定')
      .map(status => Number(status.强度 ?? status.快照?.参数?.数值 ?? 0));
    // Positive sources choose their strongest value; the strongest penalty still applies.
    // Scope-aware maintained support must not turn a negative modifier into zero.
    return Math.max(0, ...values, support.stat(state, unitId, '攻击检定', skill)) + Math.min(0, ...values);
  }

  function refreshParalysisTrigger(state, unitId) {
    const statuses = activeStatuses(state, unitId, 'status.paralysis');
    if (!statuses.length) return false;
    const totalLayers = statuses.reduce((sum, status) => sum + Math.max(0, Number(status.层数 ?? 0)), 0);
    const threshold = statuses.reduce((minimum, status) => Math.min(minimum, Math.max(1, Number(status.快照?.参数?.阈值 ?? 3))), Number.POSITIVE_INFINITY);
    const triggered = totalLayers >= threshold;
    for (const status of statuses) status.扩展.已触发 = triggered;
    return triggered;
  }

  function statusDiscriminator(status) {
    const params = status?.快照?.参数 ?? {};
    return String(params.部位 ?? (params.封印对象?`${params.封印对象}:${params.范围}:${status.扩展?.封印武魂ID??''}`:null) ?? params.防护对象 ?? params.属性 ?? params.类型 ?? params.形态 ?? '');
  }

  function statusGroupKey(status) {
    return `${status?.模板ID ?? ''}|${statusDiscriminator(status)}`;
  }

  function recomputeFlightHeight(state, unitId) {
    const unit = state.战斗单位.列表[unitId];
    if (!unit) return;
    const heights = activeStatuses(state,unitId,'move.flight').map(status => status.快照?.参数?.高度 ?? '低空');
    unit.位置.高度 = heights.includes('高空') ? '高空' : heights.length ? '低空' : '地面';
  }

  function removeStatus(state, statusOrId, reason = 'removed', receipt = null) {
    const status = typeof statusOrId === 'string' ? state.状态实例?.列表?.[statusOrId] : statusOrId;
    if (!status || !state.状态实例?.列表?.[status.id]) return null;
    if(reason==='broken-free'&&status.扩展?.持续来源合同?.sourceKind==='restraint'&&globalThis.SoulHostCore?.canDamage(state,state.物品?.实例?.[status.来源?.物品ID])===false)return null;
    if(status.扩展?.固定交换义务&&!['expired','real-person-dead'].includes(reason))return null;
    recordStatusLifecycle(state,status,'removed',reason);
    globalThis.SoulDisguise?.onRemoved(state,status);
    influence.onRemoved(state,status);
    const unit = state.战斗单位.列表[status.目标单位ID];
    delete state.状态实例.列表[status.id];
    if(status.模板ID==='status.invulnerable'&&status.快照?.参数?.低阶转盾百分比&&unit?.扩展?.temporaryHealthSource===status.来源?.结算单ID)foundation.clearTemporaryHealth(unit);
    // Cross-business events settle at the surrounding action boundary, after
    // all medicine branches have produced their closed replay evidence.
    if(!medicineBranchStates.has(state)){if(influence.CONTROL_IDS.includes(status.模板ID))globalThis.SoulCooperationCore?.reconcile(state);globalThis.SoulCooperationPreparation?.reconcile(state);}
    if(status.扩展?.持续来源合同?.sourceKind==='restraint'&&reason==='broken-free'){
      const item=state.物品?.实例?.[status.来源.物品ID];
      if(item&&globalThis.SoulHostCore?.canDamage(state,item)!==false){if(globalThis.SoulHostCore)globalThis.SoulHostCore.damage(state,item,item.durability);else{item.durability=0;item.condition='破损';}removeCustodyDeviceStatuses(state,item.id,'restraint-disabled',receipt);}
    }
    if(status.模板ID==='status.power_seal')foundation.refreshSoulSeal(state,status.目标单位ID);
    if(status.模板ID==='status.power_seal'&&status.快照?.参数?.封印对象==='装备与道具')globalThis.SoulWorldEngine?.refreshEquipmentInPlace?.(state,status.目标单位ID);
    foundation.refreshBattleAttributeResources(state,unit);
    if (status.模板ID === 'transform.martial_avatar') releaseMartialAvatarMaintenance(state,unit,status);
    if (status.模板ID === 'copy.skillset') removeCopiedSkills(state,unit,status);
    if (status.模板ID === 'move.flight') recomputeFlightHeight(state,status.目标单位ID);
    if (status.模板ID === 'status.paralysis') refreshParalysisTrigger(state,status.目标单位ID);
    receipt?.statusEvents?.push({
      statusId:status.id,event:reason === 'expired' ? 'expired' : reason,reason,
      targetId:status.目标单位ID,sourceUnitId:status.来源?.单位ID ?? '',sourceSkillId:status.来源?.技能ID ?? ''
    });
    globalThis.SoulAbilityExchange.reconcile(state,receipt);
    return status;
  }
  function removeStatusLayer(state,statusOrId,reason='broken-free',receipt=null,removalContext=null){
    const status=typeof statusOrId==='string'?state.状态实例.列表[statusOrId]:statusOrId;
    if(!status||status.扩展?.固定交换义务)return null;
    if(reason==='broken-free'&&status.扩展?.持续来源合同?.sourceKind==='restraint'&&globalThis.SoulHostCore?.canDamage(state,state.物品?.实例?.[status.来源?.物品ID])===false)return null;
    if((status.模板ID!=='status.limb_bind'||status.层数<=1)&&status.扩展?.持续来源合同?.sourceKind==='restraint'&&['cleansed','dispelled'].includes(reason)){if(!removalContext)throw Error('解除道具效果需要正式施法来源');if(removalContext.legacyDeviceRemoval){const removed=removeStatus(state,status,reason,receipt),item=state.物品?.实例?.[status.来源.物品ID];if(item&&globalThis.SoulHostCore?.canDamage(state,item)!==false){globalThis.SoulHostCore.damage(state,item,item.durability);removeCustodyDeviceStatuses(state,item.id,'restraint-disabled',receipt);}return removed;}globalThis.SoulDeviceOperations.removeDeviceEffect(state,status,reason,removalContext);return status;}
    if(status.模板ID!=='status.limb_bind'||status.层数<=1)return removeStatus(state,status,reason,receipt);
    const before=status.层数;status.层数--;
    (status.扩展.解层记录??=[]).push({before,after:status.层数,reason,at:battleNow(state),operationId:receipt?.id??''});
    if(controls.persistent(status))status.扩展.持续合同指纹=worldStatusFingerprint(status);
    status.扩展.来源合同指纹=controlSourceFingerprint(status);
    recordStatusLifecycle(state,status,'layer-removed',reason);
    receipt?.statusEvents?.push({statusId:status.id,event:'layer-removed',reason,before,remainingLayers:status.层数,targetId:status.目标单位ID});
    globalThis.SoulAbilityExchange?.reconcile?.(state,receipt);
    return {...clone(status),removedLayer:true};
  }
  function removeCustodyDeviceStatuses(state,itemId,reason='restraint-removed',receipt=null){
    for(const status of Object.values(state.状态实例?.列表??{}))if(status.扩展?.持续来源合同?.sourceKind==='restraint'&&status.来源?.物品ID===itemId)removeStatus(state,status,reason,receipt);
  }

  function selectStatusGroups(statuses, maximum) {
    const groups = new Map();
    for (const status of statuses) {
      const key = statusGroupKey(status);
      if (!groups.has(key)) groups.set(key,[]);
      groups.get(key).push(status);
    }
    return [...groups.values()].slice(0,Math.max(0,maximum));
  }

  function activeMartialAvatar(state, unitId) {
    return activeStatuses(state, unitId, 'transform.martial_avatar')[0] ?? null;
  }

  function skillMartialSoulId(skill) {
    return String(skill?.扩展?.copyOrigin?.spec?.carrierSoulId || skill?.sourceMartialSoulId || skill?.来源武魂ID || '');
  }

  function skillRingId(skill) {
    return String(skill?.扩展?.copyOrigin?.spec?.carrierSoulId?skill.扩展.copyOrigin.source.sourceRingId:(skill?.sourceRingId ?? skill?.来源魂环ID ?? ''));
  }

  function skillSourcePresentation(state, skill) {
    const sourceMartialSoulId = skillMartialSoulId(skill);
    const sourceRingId = skillRingId(skill);
    const ring = sourceRingId ? state.魂环?.列表?.[sourceRingId] : null;
    return {
      ...(skill?.sourceKind==='native-origin'?{sourceKind:'native-origin',sourceNativeOriginId:skill.sourceNativeOriginId}:{}),
      sourceMartialSoulId,
      sourceMartialSoulName: state.武魂?.列表?.[sourceMartialSoulId]?.名称 ?? '',
      sourceRingId,
      sourceRingOrdinal: Number(ring?.序号 ?? skill?.ringOrdinal ?? skill?.nativeCastRank ?? 0),
      sourceRingYears: Number(ring?.年限 ?? 0),
      sourceRingTier: ring?.年限档 ?? '',
      sourceRingColor: ring?.颜色 ?? ''
    };
  }

  function martialAvatarBonus(state, actor, skill, key) {
    const avatar = activeMartialAvatar(state, actor.id);
    if (!avatar || skillMartialSoulId(skill) !== avatar.来源?.武魂ID) return 0;
    if (key === '基础动作增幅' && skill?.id !== 'martial.base') return 0;
    if (key === '同源魂技增幅' && (skill?.id === 'martial.base' || ['soul-device', 'soul-bone', 'hidden-weapon', 'consumable'].includes(skill?.sourceKind))) return 0;
    return Math.max(0, Number(avatar.快照?.参数?.[key] ?? 0));
  }
  function avatarAreaBonus(state,actor,skill){const avatar=actor&&activeMartialAvatar(state,actor.id),p=avatar?.快照?.参数;return p&&skillMartialSoulId(skill)===avatar.来源?.武魂ID&&skillRingOrdinal(state,skill)===p.范围魂环序号?Number(p.同源范围增幅??0):0;}

  function matchingStatusGuards(state, unit, node, mode) {
    if (!foundation.negativeStatus(node.effectId,node.params)) return [];
    return foundation.defenseSources(state,unit).filter(source => {
      if (source.effectId !== 'status.status_guard' || source.params.模式 !== mode) return false;
      const key = source.params.防护对象;
      return key === node.effectId || key === effects.EFFECT_REGISTRY[node.effectId]?.displayName ||
        (source.kind === 'innate' && ((key === '控制' && CONTROL_STATUS_IDS.includes(node.effectId)) || (key === '持续伤害' && ['status.burn','status.poison','status.damage_over_time'].includes(node.effectId))));
    });
  }
  function statusResistant(state, unit, nodes) {
    return nodes.some(node => matchingStatusGuards(state,unit,node,'抗性').length > 0);
  }

  function attributeModifier(state, unit, attribute) {
    return foundation.battleAttributeView(state,unit).attributes.调整值[attribute]??0;
  }

  function effectiveDefense(state, unit, kind, armorPenetration = 0) {
    const derived=foundation.battleAttributeView(state,unit).derived;
    const base = kind === '魂技' ? derived.魂技防御 : derived.物理防御;
    const armorBreak = kind === '物理'
      ? Math.max(0, ...activeStatuses(state, unit.id, 'status.armor_break').map(status => Number(status.强度 ?? status.快照?.参数?.数值 ?? 0)))
      : 0;
    const buffKey = kind === '魂技' ? '魂技防御' : '物理防御';
    const buff = strongestStatusValue(state, unit.id, 'status.buff', '属性', buffKey);
    const haste = activeStatuses(state, unit.id, 'status.haste').length ? 2 : 0;
    const slow = activeStatuses(state, unit.id, 'status.slow').length ? 2 : 0;
    const avatarDefense = Math.max(0, Number(activeMartialAvatar(state, unit.id)?.快照?.参数?.身心防御加值 ?? 0));
    const attackPenetration = kind === '物理' ? clamp(armorPenetration, 0, 3) : 0;
    return Math.max(5, base - armorBreak - attackPenetration + buff + haste - slow + avatarDefense);
  }

  function abilityBonus(state, unit, effectId, damageType = '物理') {
    const family = foundation.damageTypeFamily(damageType);
    if (effectId === '身法') return attributeModifier(state, unit, '身法');
    if (effectId === '力量' || family === '物理') return attributeModifier(state, unit, '力量');
    if (['精神','灵魂'].includes(family)) return Math.max(attributeModifier(state, unit, '悟性'), attributeModifier(state, unit, '感知'), attributeModifier(state, unit, '意志'));
    return Math.max(attributeModifier(state, unit, '悟性'), attributeModifier(state, unit, '感知'));
  }

  function damageStatusBonus(state, unit) {
    return strongestStatusValue(state, unit.id, 'status.buff', '属性', '伤害加值');
  }

  function physicalAttackAttribute(skill) {
    return skill?.effectGraph?.nodes?.some(node => node.effectId === 'release.projectile') ? '身法' : '力量';
  }

  function isOrdinaryAttack(skillOrId) {
    const id = typeof skillOrId === 'string' ? skillOrId : skillOrId?.id;
    return ORDINARY_ATTACK_IDS.includes(id);
  }

  function skillBlockedByBattleRules(state, skill) {
    if (!state.战斗?.扩展?.规则?.soulSkillsLocked || !skill) return false;
    const sourceKind = String(skill.sourceKind ?? skill.source?.kind ?? '');
    return skill.id === 'martial.base'
      || skill.类型 === '魂技'
      || sourceKind === 'soul-ring'
      || Boolean(skill.来源魂环ID || skill.sourceRingId);
  }

  function ordinaryAttackSkill(actor) {
    const configured = actor.扩展?.普通攻击档案;
    const specs = Array.isArray(configured?.effectSpecs) && configured.effectSpecs.length ? configured.effectSpecs : [
      ['release.melee', {}], ['target.single', {}], ['check.physical_attack', {}],
      ['payload.damage', {类型: '物理', 骰数: actor.单位种类 === '魂兽' ? 1 : 1, 骰面: actor.单位种类 === '魂兽' ? 6 : 4, 加值: 0}]
    ];
    return {
      ...clone(configured??{}),immutableHash:undefined,id: 'ordinary.attack', name: configured?.name ?? (actor.单位种类 === '魂兽' ? '本能攻击' : '徒手攻击'), 类型: '普通攻击',
      sourceKind: 'ordinary', soulPowerCost: configured?.soulPowerCost??0, effectGraph: effects.makeLinearGraph(specs)
    };
  }

  function martialBaseSkill(actor) {
    if (actor.单位种类 === '魂兽') return null;
    const configured = actor.扩展?.武魂基础动作;
    if (!configured?.effectSpecs?.length) return null;
    const result={
      ...clone(configured),immutableHash:undefined,id: 'martial.base', name: configured.name ?? '武魂基础动作', 类型: '武魂基础动作', sourceKind: 'martial-base', soulPowerCost: configured.soulPowerCost??0,
      sourceMartialSoulId: actor.扩展?.武魂战斗修正?.来源武魂ID ?? '', effectGraph: effects.makeLinearGraph(configured.effectSpecs)
    };
    return configured.mode==='disguise'?abilities.seal({...result,持有者单位ID:actor.id}):result;
  }

  function getSkill(state,actor,skillId,castRank){return aiReadSession?aiMemo(state,`skill:${actor.id}:${skillId}:${castRank??''}`,()=>getSkillUncached(state,actor,skillId,castRank)):getSkillUncached(state,actor,skillId,castRank);}
  function getSkillUncached(state, actor, skillId, castRank) {
    if (state.技能?.列表?.[skillId]) { const skill=state.技能.列表[skillId];try{return effects.currentSoulRingCastSkill(state,actor,skill,castRank);}catch(error){if(castRank!==undefined)throw error;return skill;} }
    if (ORDINARY_ATTACK_IDS.includes(skillId)) return ordinaryAttackSkill(actor);
    if (skillId === 'martial.base') return martialBaseSkill(actor);
    return null;
  }

  function externalCooldownRemaining(state, item, skill) {
    const battle=actions.battleOf(state,skill?.持有者单位ID??item?.boundToEntityId??item?.ownerEntityId);
    if(!battle||item?.扩展?.combatState?.battleId!==battle.id)return 0;
    const sourceKind = skill?.sourceKind ?? skill?.source?.kind ?? '';
    if (sourceKind === 'soul-bone') return Number(item?.扩展?.combatState?.cooldownBySkill?.[skill.id] ?? 0);
    return Number(item?.扩展?.combatState?.cooldownRemaining ?? 0);
  }

  function externalSourceItem(state, actor, skill) {
    const sourceKind = skill?.sourceKind ?? skill?.source?.kind ?? '';
    if (!['soul-device', 'soul-bone', 'hidden-weapon', 'consumable'].includes(sourceKind)) return null;
    if(['hidden-weapon','consumable'].includes(sourceKind))controls.assertAction(state,actor.id,'equip');
    const itemId = String(skill?.sourceItemId ?? skill?.source?.itemId ?? '');
    const item = state.物品?.实例?.[itemId];
    if (!item) throw new Error('行动来源物品已经不存在');
    const itemBlocked=controls.itemEffectBlockReason?.(state,actor.id,item);if(itemBlocked)throw Error(itemBlocked);
    if (sourceKind === 'soul-device') {
      const workshop=!!globalThis.SoulOpeningWorkshop?.isItemAuthorized(state,item)||!!globalThis.SoulPaidDesign?.isItemSource(state,item);
      if((workshop?!(Number.isSafeInteger(skill.soulPowerCost)&&skill.soulPowerCost>=0&&Number.isSafeInteger(skill.durabilityCost)&&skill.durabilityCost>=0):!abilities.activeDeviceGraph(skill.effectGraph,{fixedForm:item.payload?.fixedForm})||!(skill.soulPowerCost>0)||!(skill.durabilityCost>0))||!effects.validateGraph(skill.effectGraph,{ageTier:skill.ageTier??'十万年',mechanismCap:skill.mechanismCap??'规则'}).pass)throw Error('主动魂导器须有合法能力合同与真实来源');
      if(!globalThis.SoulOpeningWorkshop?.isAbilitySource(state,item,actor.id)&&(item.type!=='魂导器'||item.ownerEntityId!==actor.id||item.quantity!==1||item.durability<=0||!Object.values(state.装备?.配置?.[actor.id]?.slots??{}).includes(item.id)))throw Error('主动器具须实际装备、持有或佩戴并保持完整来源');
      if(item.durability<Number(skill.durabilityCost??0))throw Error('魂导器耐久不足');
      if(skill.effectGraph.nodes.some(n=>n.params?.来源依赖==='道具有效')&&item.durability<=Number(skill.durabilityCost??0))throw Error('魂导器付款后将损坏，无法维持这次来源效果');
    } else if (sourceKind === 'soul-bone') {
      const config = state.装备?.配置?.[actor.id];
      if (item.boundToEntityId !== actor.id || !Object.values(config?.soulBoneSlots ?? {}).includes(item.id)) throw new Error('魂骨未与行动者融合');
    } else {
      const container = state.容器?.列表?.[item.containerId];
      if (item.ownerEntityId !== actor.id || Number(item.quantity ?? 0) < 1 || container?.ownerEntityId !== actor.id) throw new Error('消耗品不在行动者背包内');
      const expiresAtDay = Number(item.payload?.expiresAtDay ?? Number.MAX_SAFE_INTEGER);
      if (Number(state.世界?.时间?.day ?? 0) > expiresAtDay) throw new Error('消耗品已经过期');
    }
    const cooldownRemaining = externalCooldownRemaining(state,item,skill);
    if (cooldownRemaining > 0) throw new Error(`行动仍在冷却：${cooldownRemaining}回合`);
    return item;
  }

  function consumeExternalSource(state, actor, skill, receipt) {
    const item = externalSourceItem(state, actor, skill);
    if (!item) return;
    const sourceKind = skill.sourceKind ?? skill.source?.kind;
    item.扩展 ??= {};
    const battleId=actions.battleOf(state,actor.id)?.id??null;
    if(item.扩展.combatState?.battleId!==battleId)item.扩展.combatState={battleId,cooldownRemaining:0,cooldownBySkill:{}};
    if (sourceKind === 'soul-bone') {
      item.扩展.combatState.cooldownBySkill ??= {};
      item.扩展.combatState.cooldownBySkill[skill.id] = Math.max(0,round(skill.cooldownTurns ?? 0));
    } else if (!['consumable','hidden-weapon'].includes(sourceKind)) item.扩展.combatState.cooldownRemaining = Math.max(0, round(skill.cooldownTurns ?? 0));
    receipt.sourceItem = {itemId: item.id, sourceKind, quantityBefore:item.quantity, quantity: item.quantity, cooldownRemaining: externalCooldownRemaining(state,item,skill)};
    if(sourceKind==='soul-device'){if(globalThis.SoulHostCore)globalThis.SoulHostCore.damage(state,item,Number(skill.durabilityCost??0),'use-cost');else{item.durability=Math.max(0,item.durability-Number(skill.durabilityCost??0));if(!item.durability)item.condition='破损';}}
    if (['consumable','hidden-weapon'].includes(sourceKind)) {
      item.quantity = Math.max(0, Number(item.quantity ?? 1) - 1);
      receipt.sourceItem.quantity = item.quantity;
      if (item.quantity <= 0) {
        const container = state.容器?.列表?.[item.containerId];
        if (container) container.itemIds = (container.itemIds ?? []).filter(id => id !== item.id);
        const equipment = state.装备?.配置?.[actor.id];
        for (const [slot,itemId] of Object.entries(equipment?.slots ?? {})) if (itemId === item.id) equipment.slots[slot] = '';
        globalThis.SoulCommerceProvenance?.consumed?.(state,item,{kind:'source-use',operationId:receipt.id??`source-use:${item.id}:${skill.id}`,actorId:actor.id,skillId:skill.id,quantity:receipt.sourceItem.quantityBefore});
        delete state.物品.实例[item.id];
        delete state.技能.列表[skill.id];
        actor.能力.技能ID = (actor.能力.技能ID ?? []).filter(id => id !== skill.id);
      }
    }
  }

  function tickExternalCooldowns(state, unit, receipt) {
    for (const item of Object.values(state.物品?.实例 ?? {})) {
      if (item.ownerEntityId !== unit.id && item.boundToEntityId !== unit.id) continue;
      const combatState = item.扩展?.combatState;
      if (!combatState || combatState.battleId!==state.战斗.id) continue;
      if (Number(combatState.cooldownRemaining ?? 0) > 0) {
        combatState.cooldownRemaining = Math.max(0, round(combatState.cooldownRemaining) - 1);
        receipt.statusEvents.push({event: 'item-cooldown', unitId: unit.id, itemId: item.id, remaining: combatState.cooldownRemaining});
      }
      for (const [skillId,remainingInput] of Object.entries(combatState.cooldownBySkill ?? {})) {
        const remaining = Math.max(0,round(remainingInput)-1);
        combatState.cooldownBySkill[skillId] = remaining;
        receipt.statusEvents.push({event:'item-skill-cooldown',unitId:unit.id,itemId:item.id,skillId,remaining});
      }
    }
  }

  function isSoulRingSkill(skill) {
    return effects.soulRingNativeRank(skill)>0;
  }

  function nativeSoulRingRank(state,skill) {
    return effects.soulRingNativeRank(skill)||1;
  }

  function soulRingCastProfile(state, actor, skill, requestedRank) {
    if (!isSoulRingSkill(skill) || effects.skillActivation(skill.effectGraph)==='passive') return {enabled: false, nativeRank: 0, selectedRank: 0, maximumRank: 0, upcastBonus: 0};
    const nativeRank=nativeSoulRingRank(state,skill),source=effects.soulRingCastSource(skill),high=Number(source?.ageYears??0)>=100000;
    const minimumRank=high?effects.soulRingMinimumRank(skill):nativeRank;
    const ownedSoulIds=foundation.ownedMartialSoulIds(state,actor.id);
    const maximumRank=high?effects.soulRingAvailableRank(state,actor,skill):Math.min(controls.maximumCastRank(state,actor.id),Math.max(nativeRank,...ownedSoulIds.map(id=>state.武魂?.列表?.[id]?.魂环ID列表?.length??0)));
    const selectedRank=requestedRank===undefined||requestedRank===null||requestedRank===''?(skill.castOrigin?.rank??Math.min(nativeRank,maximumRank)):Number(requestedRank);
    if(!Number.isInteger(selectedRank)||selectedRank<minimumRank||selectedRank>maximumRank)throw Error(maximumRank<minimumRank?`这项魂技需要至少${minimumRank}环强度，当前最多释放${maximumRank}环强度`:`释放强度须在${minimumRank}至${maximumRank}环之间`);
    const denied=controls.permissionReason(state,actor.id,skill,selectedRank);if(denied)throw Error(denied);
    return {enabled:true,nativeRank,minimumRank,selectedRank,maximumRank,downcast:selectedRank<nativeRank,upcastBonus:Math.max(0,Number(effects.SOUL_RING_UPCAST_TOTAL[selectedRank]??0)-Number(effects.SOUL_RING_UPCAST_TOTAL[nativeRank]??0))};
  }

  function effectiveSoulPowerCost(state, actor, skill, castRank) {
    if (effects.skillActivation(skill?.effectGraph)==='passive') return 0;
    const fixed=support.fixedActivation(skill);if(fixed!==null)return fixed;
    skill=effects.currentSoulRingCastSkill(state,actor,skill,castRank);
    const cast = soulRingCastProfile(state, actor, skill, castRank);
    const rate = cast.enabled ? 0 : clamp(skill?.soulPowerCostRate ?? 0, 0, 1);
    const base = cast.enabled
      ? Math.max(1,Number(skill.soulPowerCost))+Math.max(0,Number(effects.SOUL_RING_CAST_COST[cast.selectedRank])-Number(effects.SOUL_RING_CAST_COST[cast.nativeRank]))
      : Math.max(0, rate > 0 ? Math.ceil((actor?.资源?.魂力?.最大 ?? 0) * rate) : round(skill?.soulPowerCost ?? 0));
    if (!base || isOrdinaryAttack(skill) || ['soul-device', 'soul-bone', 'consumable'].includes(skill?.sourceKind)) return base;
    const modifiers=actor?.扩展?.武魂战斗修正??{};
    const discount = clamp(modifiers.魂力折扣 ?? 0, 0, 0.3);
    const multiplier=clamp(modifiers.魂力消耗倍率??1,1,3);
    return Math.max(1, Math.ceil(base * multiplier * (1 - discount)));
  }

  function soulRingCastOptions(state, actor, skill, branchIds) {
    const cast = soulRingCastProfile(state, actor, skill);
    if (!cast.enabled) return [];
    const available = controls.availableSoulPower(state,actor.id);
    return Array.from({length: cast.maximumRank - (cast.minimumRank??cast.nativeRank) + 1}, (_, index) => {
      const rank = (cast.minimumRank??cast.nativeRank) + index;
      const profile = soulRingCastProfile(state, actor, skill, rank);
      const quote=skillCastAvailability(state,actor,skill,{castRank:rank,...(branchIds?{branchIds}:{})});
      const cost=quote.payment?.totals.soulPower??null;
      return {rank,cost,bonus:profile.upcastBonus,affordable:quote.available,reason:quote.reason,branchIds:quote.branchIds,costs:quote.payment?.contract.costs??[]};
    });
  }

  function skillPaymentOptions(state,actor,skill,options={}) {
    if(effects.skillActivation(skill.effectGraph)==='passive')throw Error('被动能力不需要施放');
    const activeBranches=skillEffectBranches(skill,true),requiredBranches=activeBranches.filter(b=>!b.optional),selectedIds=options.branchIds??(options.fieldUse?activeBranches:requiredBranches.length?requiredBranches:activeBranches.slice(0,1)).map(b=>b.id);
    if(!options.fieldUse&&activeBranches.filter(b=>selectedIds.includes(b.id)).flatMap(b=>b.nodes).some(n=>effects.EFFECT_REGISTRY[n.effectId]?.allowedContexts&&!effects.EFFECT_REGISTRY[n.effectId].allowedContexts.includes('battle')))throw Error('这项用途只能在战斗及必要结算结束后使用');
    const validation=abilities.validate(skill);if(!validation.pass)throw Error(validation.errors.join('；'));
    validateSkillSpecialRequirements(state,actor,skill);
    validateSelectedBattleResources(state,actor,skill,options.branchIds);
    externalSourceItem(state,actor,skill);
    const usage=skillUsageAvailability(state,actor,skill,!!options.fieldUse);
    if(!usage.available)throw Error(usage.reason);
    const modifier=options.fieldUse?null:activeStatuses(state,actor.id,'modifier.next_skill').find(s=>s.来源?.技能ID!==skill.id);
    const perTarget=support.activation(state,actor.id,skill,cleanList(options.targetIds??[actor.id]),options.supportElements);
    const soulPowerCost=Math.max(0,Math.ceil((perTarget??effectiveSoulPowerCost(state,actor,skill,options.castRank))*Number(modifier?.快照?.参数?.魂力消耗倍率??100)/100));
    const blockedRequirements={};
    if(!options.fieldUse&&(options.targetIds??[]).some(id=>id!==actor.id&&state.战斗单位.列表[id]&&combatDistance(actor,state.战斗单位.列表[id])>0))blockedRequirements.contact='目标不在接触距离';
    const ingestion=abilities.describe(skill,{modeId:options.modeId??skill._modeId}).requirements.includes('ingest'),targets=cleanList(options.targetIds??[]);
    const ingestionTargetId=options.ingestionTargetId??(ingestion&&targets.length===1?targets[0]:undefined);
    if(ingestionTargetId&&ingestionTargetId!==actor.id&&!options.fieldUse&&combatDistance(actor,state.战斗单位.列表[ingestionTargetId])>0)blockedRequirements.ingest='给药目标不在接触距离';
    const applicationOptions={...(options.applicationOptions??{}),...(!options.fieldUse&&ingestion&&options.applicationOptions?.force===true?{battleAttempt:true}:{})};
    const maintenanceRegistered=(skill.effectGraph?.nodes??[]).filter(n=>!options.nodeIds||options.nodeIds.includes(n.id)).some(n=>n.effectId==='contract.oath'||(options.fieldUse?controls.canPersist(n.effectId,n.params)&&n.params?.持续方式&&n.params.持续方式!=='回合':['status','zone','domain','summon','transform','reaction'].includes(n.family)||['payload.shield','move.flight','copy.skillset','modifier.next_skill'].includes(n.effectId)));
    return {soulPowerCost,nodeIds:options.nodeIds,activationLock:options.nodeIds&&!skill.effectGraph.nodes.some(n=>n.effectId==='transform.martial_avatar'&&options.nodeIds.includes(n.id))?0:avatarActivationLock(skill,state,actor),modeId:options.modeId??skill._modeId,additionalCosts:options.additionalCosts??[],blockedRequirements,maintenanceRegistered,ingestionTargetId,applicationOptions,preserveOralDose:!!options.preserveOralDose,preparingMedicine:!!options.preparingMedicine};
  }
  function quoteSkillUse(state,actor,skill,options={}) {
    assertContractFormationReady(state,actor,skill,options);
    skill=effects.currentSoulRingCastSkill(state,actor,skill,options.castRank);
    const release=effects.soulRingCastRelease(skill);if(release.reason)throw Error(release.reason);
    const branches=skillEffectBranches(skill,true),defaults=options.fieldUse?branches:branches.filter(b=>!b.optional);
    const paymentOptions={...skillPaymentOptions(state,actor,skill,options),branchIds:options.branchIds??(defaults.length?defaults:branches.slice(0,1)).map(b=>b.id)};
    return aiMemo(state,`payment:${actor.id}:${skill.id}:${skill.castOrigin?.rank??''}:${skill._modeId??''}:${skill.effectGraph.nodes.map(n=>n.id).join(',')}:${JSON.stringify(paymentOptions)}`,()=>{
      aiSpend('quote');return abilities.quote(state,actor.id,skill,paymentOptions);
    });
  }
  // Price the supplied native or derived field skill without looking up rank in
  // an empty world. Actual cast entry points still resolve eligibility first.
  function fieldCostContract(actor,skill,modeId){
    if(effects.skillActivation(skill?.effectGraph)==='passive')return abilities.describe(skill,{modeId,soulPowerCost:0});
    const fixed=skill.castOrigin||effects.soulRingNativeRank(skill)?skill.soulPowerCost:null;return abilities.describe(skill,{modeId,soulPowerCost:fixed===null?effectiveSoulPowerCost({},actor,skill):Math.max(1,Math.ceil(fixed*clamp(actor?.扩展?.武魂战斗修正?.魂力消耗倍率??1,1,3)*(1-clamp(actor?.扩展?.武魂战斗修正?.魂力折扣??0,0,.3))))});
  }
  function tryQuoteSkillUse(state,actor,skill,options={}) {
    try{return {available:true,reason:'',payment:quoteSkillUse(state,actor,skill,options)};}catch(error){return {available:false,reason:error.message,payment:null};}
  }
  // Entry-point availability may choose a payable optional use; execution still
  // quotes the exact explicit selection and never invents an unpriced version.
  function skillCastAvailability(state,actor,skill,options={}) {
    return aiReadSession?aiMemo(state,`quote:${actor.id}:${skill.id}:${skill.castOrigin?.rank??''}:${skill._modeId??''}:${JSON.stringify(options)}`,()=>skillCastAvailabilityUncached(state,actor,skill,options)):skillCastAvailabilityUncached(state,actor,skill,options);
  }
  function skillCastAvailabilityUncached(state,actor,skill,options={}) {
    const manifestation=globalThis.SoulManifestation?.forSoul(state,skill.sourceMartialSoulId??skill.来源武魂ID);
    if(manifestation&&manifestation.actorId===actor.id&&globalThis.SoulManifestation.hasTrait(state.武魂.列表[manifestation.soulId]))return {available:false,reason:'这项魂技由外放武魂释放，请向它下达指令',payment:null,branchIds:[]};
    if(globalThis.SoulCombatDeployments.isDeploySkill(skill,options.branchIds))try{const mode=options.modeId??skill._modeId??skill.defaultCastMode,request=globalThis.SoulCombatDeployments.fromRingSkill(state,actor.id,skill.id,mode),q=globalThis.SoulCombatDeployments.quote(state,request,options.fieldUse?{}:{battleId:state.战斗.id});return {available:true,payment:q.cost,branchIds:['branch-main']};}catch(error){return {available:false,reason:error.message,payment:null,branchIds:[]};}
    try{skill=effects.currentSoulRingCastSkill(state,actor,skill,options.castRank);}catch(error){return {available:false,reason:error.message,payment:null,branchIds:[]};}
    try{validateSkillSpecialRequirements(state,actor,skill);}catch(error){return {available:false,reason:error.message,payment:null,branchIds:[]};}
    const branches=skillEffectBranches(skill),required=branches.filter(branch=>!branch.optional).map(branch=>branch.id);
    if(options.branchIds!==undefined&&(!Array.isArray(options.branchIds)||!options.branchIds.length||new Set(options.branchIds).size!==options.branchIds.length||options.branchIds.some(id=>!branches.some(branch=>branch.id===id))||required.some(id=>!options.branchIds.includes(id))))return {available:false,reason:'主动效果选择缺少必需分支，或包含无效分支',payment:null,branchIds:[]};
    const candidates=options.branchIds?[options.branchIds]:required.length?[required]:branches.map(branch=>[branch.id]);
    let first=null;
    for(const branchIds of candidates){
      const quote={...tryQuoteSkillUse(state,actor,skill,{...options,branchIds}),branchIds:clone(branchIds)};
      if(quote.available)return quote;
      first??=quote;
    }
    return first??{available:false,reason:'这项能力没有主动效果分支',payment:null,branchIds:[]};
  }
  function paySkillUse(state,actor,skill,receipt,options={}) {
    const manifest=globalThis.SoulManifestation?.forSoul(state,skill.sourceMartialSoulId??skill.来源武魂ID);if(manifest&&manifest.actorId===actor.id)throw Error('这项魂技由外放武魂释放，请向它下达指令');
    skill=effects.currentSoulRingCastSkill(state,actor,skill,options.castRank);
    const release=effects.soulRingCastRelease(skill);if(release.reason)throw Error(release.reason);
    const paymentOptions=skillPaymentOptions(state,actor,skill,options),source=externalSourceItem(state,actor,skill);
    const sourceBefore=source?{itemId:source.id,sourceKind:skill.sourceKind,quantityBefore:source.quantity}:null;
    const branchIds=options.branchIds??skillEffectBranches(skill,true).map(b=>b.id);
    const paymentEvidence=skill.exchangeContracts?.length?{actor:clone(actor),fieldUse:!!options.fieldUse,preserveOralDose:!!options.preserveOralDose,castRank:soulRingCastProfile(state,actor,skill,options.castRank).selectedRank,modifier:options.fieldUse?null:clone(activeStatuses(state,actor.id,'modifier.next_skill').find(s=>s.来源?.技能ID!==skill.id)??null),paidItems:clone(Object.values(state.物品.实例).filter(i=>i.ownerEntityId===actor.id)),usageBefore:skillUsageAvailability(state,actor,skill,!!options.fieldUse)}:null;
    if(skill.effectGraph.nodes.some(n=>['contract.oath','status.soul_control','status.mind_control','status.cognition_shift','transform.sex','payload.cleanse','payload.dispel'].includes(n.effectId))){const quote=abilities.quote(state,actor.id,skill,{...paymentOptions,branchIds});receipt.contractReleaseProof={at:battleNow(state),actor:clone(actor),fieldUse:!!options.fieldUse,modifier:options.fieldUse?null:clone(activeStatuses(state,actor.id,'modifier.next_skill').find(s=>s.来源?.技能ID!==skill.id)??null),quote:clone(quote),paidItems:quote.items.map(f=>clone(state.物品.实例[f.itemId])),usageBefore:skillUsageAvailability(state,actor,skill,!!options.fieldUse),sourceItem:clone(source??null),perceptions:globalThis.SoulPersonChangeKnowledge?.releasePerceptions(state,actor.id,options.targetIds??[receipt.targetId??actor.id])??[]};}
    const payment=abilities.pay(state,actor.id,skill,receipt.id,{...paymentOptions,branchIds});
    const usageLedger=validateAndRecordSkillUsage(state,actor,skill,!!options.fieldUse);
    if(sourceBefore){
      if(['consumable','hidden-weapon'].includes(skill.sourceKind))receipt.sourceItem={...sourceBefore,quantity:state.物品.实例[sourceBefore.itemId]?.quantity??0,cooldownRemaining:0};
      else consumeExternalSource(state,actor,skill,receipt);
    }
    const exchangeIds=globalThis.SoulAbilityExchange.pay(state,actor.id,skill,receipt.id,payment,{modeId:payment.contract.modeId,branchIds,paymentEvidence:paymentEvidence?{...paymentEvidence,usageLedger}:null});
    if(exchangeIds.length)receipt.exchangeIds=exchangeIds;
    const backlash=globalThis.SoulAbilityExchange.applyBacklash(state,actor.id,skill,receipt.id);if(backlash)receipt.backlash={statusId:backlash.id,strength:backlash.快照.参数.强度};
    receipt.payment=payment;return {payment,usageLedger};
  }

  function baseRuntimeOutputScale(skill) {
    if (Number.isFinite(Number(skill?._runtimeOutputScale))) return clamp(Number(skill._runtimeOutputScale), 0.2, 3);
    const source=skill?.castOrigin?.source??skill;
    return isSoulRingSkill(skill)&&!['copied','summoned-copy'].includes(source?.sourceKind) ? 1 : clamp(skill?.outputScale ?? 1, 0.2, 3);
  }
  function periodicOutputAmount(state,holder,amount){
    // Sustained copies keep their original sealed contract after the copy ends.
    // Scale the rolled magnitude once, before element and realm adjustments.
    const source=holder.扩展?.持续来源合同??state.技能?.列表?.[holder.来源?.技能ID];
    // Source-maintained regeneration follows the active source buffs; finite
    // independent regeneration keeps its release snapshot after the source ends.
    const healPercent=holder.模板ID==='status.regeneration'&&holder.持续?.模式==='来源维持'
      ?support.percent(state,holder.来源?.单位ID,'heal','',source):Number(holder.快照?.治疗增幅??0);
    return Math.max(0,Math.floor(amount*baseRuntimeOutputScale(source)*(1+healPercent/100)));
  }
  function releasedElementProfile(state,actor,skill,type){
    return skill?._releasedElementProfile??{...foundation.elementDamageProfile(state,actor.id,type),supportPercent:support.percent(state,actor.id,'damage',type,skill)};
  }
  function runtimeSkillScale(state,actor,skill){
    const base=baseRuntimeOutputScale(skill),source=skill?.castOrigin?.source??skill;
    if(source?.sourceKind!=='summoned-copy')return base;
    const parent=state.战斗单位.列表[globalThis.SoulCombatDeployments.sourceContext(state,actor.id)?.prototypeId??actor.扩展?.召唤?.来源单位ID],avatar=parent&&activeMartialAvatar(state,parent.id),origin=mechanics.original(source);
    const percent=Number(avatar?.快照?.参数?.召唤技能效果倍率??0);
    return percent>0&&origin&&skillMartialSoulId(origin)===avatar.来源?.武魂ID?base*percent/Math.max(1,Number(source.扩展?.outputScalePercent??100)):base;
  }

  // The primary magnitude is amplified once. Costs, use limits, targeting and
  // categorical effects stay unchanged; a duration-only flight amplifies time.
  // Both execution and the archive consume this profile, including bound caps.
  function effectOutputProfile(node, skill = null) {
    const scale = skill?.扩展?.copyOrigin?.spec?.discreteScale==='不放大'&&!['payload.damage','payload.drain','payload.residual','payload.heal','payload.shield'].includes(node.effectId)?1:baseRuntimeOutputScale(skill);
    const fields = {
      'payload.cleanse':['最大数量'], 'status.buff':['数值'], 'move.flight':['持续回合'],
      'copy.skillset':['复制比例'], 'modifier.next_skill':['效果倍率','成品效果倍率']
    }[node.effectId] ?? [];
    const params = {...node.params};
    const bounds = effects.EFFECT_REGISTRY[node.effectId]?.parameterBounds ?? {};
    if (scale !== 1) for (const key of fields) {
      if (!Number.isFinite(Number(params[key]))) continue;
      const baseline = node.effectId === 'modifier.next_skill' ? 100 : 0;
      const value = Number(params[key]) - baseline;
      const amplified = baseline + Math.sign(value) * Math.floor(Math.abs(value) * scale);
      params[key] = Array.isArray(bounds[key]) && bounds[key].every(Number.isFinite) ? clamp(amplified,bounds[key][0],bounds[key][1]) : amplified;
    }
    const amountEffects = ['payload.damage','payload.drain','payload.residual','payload.heal','payload.shield','payload.restore','payload.soul_damage','payload.soul_restore'];
    const amountScale = amountEffects.includes(node.effectId) ? scale : 1;
    const displayParams = {...params};
    if (['payload.soul_damage','payload.soul_restore'].includes(node.effectId)) displayParams.数值 = Math.floor(Number(params.数值 ?? 1) * amountScale);
    return {node:scale===1?node:{...node,params},displayParams,amountScale,scale,parameterAmplified:scale!==1&&fields.length>0};
  }

  function effectiveOutputSkill(state,actorId,skill){
    if(!skill||skill._exchangeOutputApplied)return skill;
    return {...skill,_exchangeOutputApplied:true,_runtimeOutputScale:baseRuntimeOutputScale(skill)*globalThis.SoulAbilityExchange.sourceScale(state,actorId,skill)};
  }
  function effectiveOutputProfile(state,actorId,node,skill){
    if(node.effectId==='target.burst'){const bonus=avatarAreaBonus(state,state.战斗单位?.列表?.[actorId],skill);if(bonus)return effectOutputProfile({...node,params:{...node.params,半径区:Number(node.params.半径区??0)+bonus}},skill);}
    if(node.effectId==='status.amplify')return effectOutputProfile({...node,params:{...node.params,数值:support.value(state,{快照:{参数:node.params},来源:{武魂ID:skillMartialSoulId(skill)},扩展:{增幅输出比例:effectOutputProfile(node,skill).scale,持续来源合同:skill}})}},skill);
    const numeric=['payload.damage','payload.drain','payload.residual','payload.heal','payload.shield','payload.restore','payload.soul_damage','payload.soul_restore'].includes(node.effectId);
    return effectOutputProfile(node,numeric?effectiveOutputSkill(state,actorId,skill):skill);
  }

  const UPCAST_NUMERIC_EFFECTS = Object.freeze(new Set([
    'payload.damage', 'payload.residual', 'payload.drain', 'payload.shield', 'payload.heal', 'payload.restore', 'payload.soul_damage', 'payload.soul_restore',
    'status.burn', 'status.poison', 'status.damage_over_time', 'status.regeneration', 'zone.hazard'
  ]));

  function consumeUpcastBonus(skill, node) {
    const context = skill?._upcast;
    if (!context || !UPCAST_NUMERIC_EFFECTS.has(node.effectId) || context.cursor >= context.applications) return 0;
    const index = context.cursor++;
    return context.share + (index < context.remainder ? 1 : 0);
  }

  function persistentUpcastProfile(totalInput, durationInput) {
    const total = Math.max(0, round(totalInput));
    const duration = Math.max(1, round(durationInput));
    return {total, remaining: total, duration, perTrigger: Math.floor(total / duration), remainder: total % duration, triggerIndex: 0};
  }

  function consumePersistentUpcast(holder) {
    const profile = holder?.扩展?.升环数值;
    if (!profile || Number(profile.remaining ?? 0) <= 0) return 0;
    const index = Number(profile.triggerIndex ?? 0);
    const requested = Number(profile.perTrigger ?? 0) + (index < Number(profile.remainder ?? 0) ? 1 : 0);
    const applied = Math.min(Number(profile.remaining ?? 0), Math.max(0, requested));
    profile.remaining = Math.max(0, Number(profile.remaining ?? 0) - applied);
    profile.triggerIndex = index + 1;
    return applied;
  }

  function skillAttributeIds(skill){
    return cleanList((skill?.effectGraph?.nodes??[]).flatMap(node=>foundation.MARTIAL_SOUL_CORE.effectAttributeIds(node.effectId,node.params)));
  }

  function masteredSkill(actor,skill){
    const mastered=new Set(actor?.扩展?.武魂战斗修正?.属性专精??[]);
    return skillAttributeIds(skill).some(id=>mastered.has(id));
  }

  function masteredChannel(actor,skill){
    const mastered=new Set(actor?.扩展?.武魂战斗修正?.机制专修??[]);
    return cleanList(skill?.sourceChannelIds??Object.values(skill?.channelByEffect??{})).some(id=>mastered.has(id));
  }

  function skillMasteryBonus(actor,skill){
    if(!skill||isOrdinaryAttack(skill)||['soul-device','soul-bone','hidden-weapon','consumable'].includes(skill?.sourceKind))return 0;
    return Number(masteredSkill(actor,skill))+Number(masteredChannel(actor,skill));
  }

  function usesAdvancedChannel(skill){
    return cleanList(skill?.sourceChannelIds??Object.values(skill?.channelByEffect??{})).some(id=>foundation.MARTIAL_SOUL_CORE.CHANNEL_REGISTRY[id]?.tier==='高阶机制');
  }

  function martialAvatarEligibility(state, actor, skill) {
    const node = skill?.effectGraph?.nodes?.find(item => item.effectId === 'transform.martial_avatar');
    if (!node) return {pass: true, reasons: [], node: null};
    const reasons = [];
    const soulId = skillMartialSoulId(skill);
    const soul = state.武魂?.列表?.[soulId];
    const sourceRing = state.魂环?.列表?.[skillRingId(skill)] ?? Object.values(state.魂环?.列表 ?? {}).find(ring => ring.魂技ID列表?.includes(skill.id));
    const native=foundation.nativeOriginDefinition(actor);
    const nativeForm=Boolean(native&&skill?.sourceKind==='native-origin'&&skill.sourceNativeOriginId===native.id&&skill.持有者单位ID===actor.id&&actor.能力?.技能ID?.includes(skill.id));
    if (Number(actor?.派生?.有效等级 ?? 0) < 70) reasons.push('武魂真身需要有效等级达到70');
    if (!soul || soul.持有者单位ID !== (globalThis.SoulManifestation?.forUnit(state,actor.id)?.actorId??actor.id)) reasons.push('武魂真身缺少属于行动者的来源武魂');
    if (!nativeForm){
      if ((soul?.魂环ID列表?.length ?? 0) < 7) reasons.push('来源武魂尚未开放并装载七个魂环位');
      if (!sourceRing || sourceRing.武魂ID !== soulId || Number(sourceRing.序号 ?? 0) < 7) reasons.push('武魂真身必须来自该武魂的第七或更高魂环位');
      if ((effects.TIER_RANK[sourceRing?.年限档] ?? -1) < effects.TIER_RANK.万年) reasons.push('武魂真身来源魂环至少需要万年档');
    }
    const sourceChannels = cleanList(skill?.sourceChannelIds ?? Object.values(skill?.channelByEffect ?? {}));
    const allowedChannels=soul?foundation.MARTIAL_SOUL_CORE.channelsForEffect(soul,node.effectId,node.params):[];
    if (!sourceChannels.some(id=>allowedChannels.includes(id))) reasons.push('武魂真身需要来源武魂与已付费合同共同支持对应的形态变化机制');
    const useKey = `${actor.id}:${soulId}`;
    if (state.战斗?.扩展?.武魂真身使用?.[useKey]) reasons.push('该武魂本场战斗已经使用过武魂真身');
    if (activeMartialAvatar(state, actor.id)) reasons.push('行动者已经处于武魂真身状态');
    return {pass: reasons.length === 0, reasons, node, soulId, soul, sourceRing, useKey};
  }

  function assertSkillAllowedByAvatar(state, actor, skill) {
    const avatar = activeMartialAvatar(state, actor.id);
    if (!avatar || avatar.快照?.参数?.禁用其他武魂 === false) return;
    const sourceSoulId = skillMartialSoulId(skill);
    if (sourceSoulId && sourceSoulId !== avatar.来源?.武魂ID) throw new Error('武魂真身持续期间不能调用其他武魂的基础动作或魂技');
  }

  function assertSkillAllowedByActiveSoul(state, actor, skill) {
    const sourceSoulId = skillMartialSoulId(skill);
    if (!sourceSoulId) return;
    const activeSoulId = foundation.activeMartialSoulId(state, actor.id);
    if (sourceSoulId !== activeSoulId) {
      const sourceName = state.武魂?.列表?.[sourceSoulId]?.名称 ?? sourceSoulId;
      const activeName = state.武魂?.列表?.[activeSoulId]?.名称 ?? activeSoulId;
      throw new Error(`${sourceName}未激活；当前武魂为${activeName}`);
    }
  }

  function releaseMartialAvatarMaintenance(state,unit, avatar) {
    if (!unit || !avatar) return;
    (globalThis.SoulCombatDeployments.soulPowerResource(state,unit.id)).锁定 = Math.max(0, Number((globalThis.SoulCombatDeployments.soulPowerResource(state,unit.id)).锁定 ?? 0) - Number(avatar.扩展?.锁定魂力 ?? 0));
    (globalThis.SoulCombatDeployments.soulPowerResource(state,unit.id)).持续消耗 = Math.max(0, Number((globalThis.SoulCombatDeployments.soulPowerResource(state,unit.id)).持续消耗 ?? 0) - Number(avatar.扩展?.每回合魂力 ?? 0));
  }

  function endMartialAvatar(state, unit, reason, receipt = null) {
    const avatar = activeMartialAvatar(state, unit.id);
    if (!avatar) return false;
    const sourceId=avatar.来源?.结算单ID,source=state.技能?.列表?.[avatar.来源?.技能ID];
    // An explicitly maintained avatar is one paid source, including its buffs.
    // Ending the form must not leave the other nodes of that source alive.
    if(endCooldown(source)&&state.扩展?.abilityMaintenance?.[sourceId])stopMaintenance(state,sourceId,reason,receipt);
    else removeStatus(state,avatar,reason,receipt);
    receipt?.statusEvents?.push({event: 'martial-avatar-ended', unitId: unit.id, statusId: avatar.id, reason});
    return true;
  }

  function avatarActivationLock(skill,state=null,actor=null) {
    if(state&&actor&&support.maintain(skill)&&support.sourceRows(state,actor.id).some(e=>e.skillId===skill.id))return 0;
    return effects.graphBranches(skill?.effectGraph).filter(branch=>branch.activation!=='passive').flatMap(branch=>branch.nodes)
      .reduce((sum,node)=>sum+(node.effectId==='transform.martial_avatar'?Number(node.params?.锁定魂力??8):node.effectId==='sustain.maintain'?Number(node.params?.锁定魂力??1):0),0);
  }

  function assertContractFormationReady(state,actor,skill,options={}){
    if(!skill.effectGraph?.nodes?.some(n=>n.effectId==='contract.oath'))return;
    const chosen=options.branchIds===undefined?selectedSkillBranches(skill,options):skillEffectBranches(skill).filter(branch=>options.branchIds.includes(branch.id));
    if(!chosen.some(branch=>branch.nodes.some(n=>n.effectId==='contract.oath')))return;
    const core=globalThis.SoulPersonContracts;
    if(!core?.assertFormationReady)throw Error('灵魂誓约尚未接通签订流程');
    core.assertFormationReady(state,actor.id,skill,options);
  }
  function actionSkillContract(state,intent){const actor=state.战斗单位?.列表?.[intent.actorId??state.角色?.主控单位ID];if(!actor||!['技能','use-field-ability'].includes(intent.type))return null;const skill=getSkill(state,actor,intent.skillId??'ordinary.attack',intent.castRank);if(!skill)return null;const source=cleanSkillContract(skill);return ['ordinary','martial-base'].includes(source.sourceKind)?abilities.seal(source):source;}
  function releasedEffectSource(skill,options={}){const profile=effects.contractGraphProfile(skill,{...options,outputScale:options.outputScale??baseRuntimeOutputScale(skill)});return {version:1,sourceHash:profile.sourceHash,outputScale:profile.outputScale,numericOutputScale:profile.numericOutputScale,upcastBonus:profile.upcastBonus,...(options.numericBonuses?{numericBonuses:clone(options.numericBonuses)}:{}),...(options.upcast?{upcast:clone(options.upcast)}:{})};}
  // B proves a unique settled event and the paid source. This executor never
  // accepts an origin, a quota or a condition supplied by a player command.
  function executeContractPenalty(rawState,request){
    const core=globalThis.SoulPersonContracts;
    if(!core?.requirePenaltyExecution)throw Error('灵魂誓约尚未接通真实触发流程');
    let state=foundation.normalizeState(clone(rawState));
    const proof=core.requirePenaltyExecution(state,request);
    if(!proof?.triggerId||!proof.source||!proof.actorId||!proof.targetId)throw Error('缺少本次真实契约触发证明');
    const source=proof.source,derived=effects.deriveTriggerOrigin(source,proof.release,proof.selection),actor=state.战斗单位.列表[proof.actorId],target=state.战斗单位.列表[proof.targetId];
    if(!actor||!target||target.存活状态==='死亡'||source.持有者单位ID&&source.持有者单位ID!==actor.id)throw Error('契约处罚实际来源或目标无效');
    if(!effects.validateGraph(source.effectGraph,{ageTier:source.ageTier??'十万年',mechanismCap:source.mechanismCap??'规则'}).pass)throw Error('契约处罚完整原图无效');
    const id=`contract-penalty:${proof.triggerId}`,receipt={id,type:'contract-penalty',triggerId:proof.triggerId,actorId:actor.id,targetId:target.id,sourceHash:derived.sourceHash,selection:clone(derived.selection),targets:[]},row={targetId:target.id,skillId:source.id,branchId:derived.branchId,affected:true,effects:[]};
    const runtime={...source,outputScale:1,_runtimeOutputScale:1,_exchangeOutputApplied:true,_sourceContract:clone(source),_fieldUse:!actions.battleOf(state,target.id),_contractPenaltyOrigin:{triggerId:proof.triggerId,derivation:clone(derived)}};
    contractPenaltyExecutions.add(runtime);
    settleFieldItemEvidence(state,receipt,[actor.id,target.id],()=>{const rng=makeRng(id);for(const node of derived.nodes??[derived.node]){const scale=node.effectId==='payload.damage'?derived.damageScale??1:1;runtime.outputScale=scale;runtime._runtimeOutputScale=scale;executeNode(state,actor,target,node,rng,false,id,row,{},runtime);}});
    receipt.targets.push(row);
    if(row.effects.some(e=>e.effectId==='payload.death'&&e.dead)||target.存活状态==='死亡')state=globalThis.SoulWorldEngine.reconcileAftermath(state,receipt).state;
    return {state,receipt};
  }
  function validateSkillSpecialRequirements(state, actor, skill) {
    const blocked=foundation.intrinsicSoulSkillBlockReason(actor,skill);if(blocked)throw new Error(blocked);
    assertSkillAllowedByActiveSoul(state, actor, skill);
    assertSkillAllowedByAvatar(state, actor, skill);
    const eligibility = martialAvatarEligibility(state, actor, skill);
    if (!eligibility.pass) throw new Error(eligibility.reasons.join('；'));
    const summonReason=summonLimitReason(state,actor,skill);if(summonReason)throw Error(summonReason);
    return eligibility;
  }
  function validateSelectedBattleResources(state,actor,skill,branchIds){
    const branches=branchIds===undefined?selectedSkillBranches(skill,{}):skillEffectBranches(skill).filter(branch=>branchIds.includes(branch.id));
    for(const node of branches.flatMap(branch=>branch.nodes))if(node.effectId==='payload.resource_damage'){
      const pool=mechanics.readPool(state,actor,skill,node.params.资源槽,(holder,source)=>poolSourceAllowed(state,holder,source));
      if(!pool||pool.value<Number(node.params.最低层数??1))throw Object.assign(Error('本场累计资源不足'),{code:'battle-resource-insufficient'});
    }
  }

  function zoneDistance(left, right) {
    const a = ZONES.indexOf(left);
    const b = ZONES.indexOf(right);
    if (a < 0 || b < 0) return Number.POSITIVE_INFINITY;
    return Math.abs(a - b);
  }

  // A target must satisfy both its tactical separation and its painted battlefield distance.
  // One range step is the same 24 units used by the existing area geometry; contact has radius 10.
  function combatDistance(left, right) {
    return Math.max(zoneDistance(left.位置.距离区,right.位置.距离区),Math.max(0,(pointDistance(unitPoint(left),unitPoint(right))-10)/BATTLEFIELD.zoneLength));
  }

  function towardPoint(origin, target, amount) {
    const length=pointDistance(origin,target);
    if(length<.000001)return {...origin};
    const ratio=Math.min(1,amount/length);
    return battlePoint({x:origin.x+(target.x-origin.x)*ratio,y:origin.y+(target.y-origin.y)*ratio});
  }

  function closestApproachPosition(actor,target,maximum){
    const from=actor.位置,index=ZONES.indexOf(from.距离区),targetIndex=ZONES.indexOf(target.位置.距离区),delta=targetIndex-index;
    if(index<0||targetIndex<0)throw Error('追击来源没有实际距离区');
    const origin=unitPoint(actor),point=unitPoint(target);
    return {...clone(from),距离区:ZONES[index+Math.sign(delta)*Math.min(maximum,Math.abs(delta))],战场坐标:towardPoint(origin,point,Math.min(maximum*BATTLEFIELD.zoneLength,Math.max(0,pointDistance(origin,point)-10)))};
  }
  function approachPlan(state,actor,target,node){
    const reason=movementImpairment(state,actor.id);if(reason)throw Error(`触及追击不能移动：${reason}`);
    const from=clone(actor.位置),to=closestApproachPosition(actor,target,node.params.距离区);
    if(wallOnPath(state,from,to,'移动'))throw Error('追击路径被墙体阻挡');
    assertVoluntaryPosition(state,actor,from,to);
    return {effectId:node.effectId,nodeId:node.id,targetId:target.id,placement:'action.before-check',from,to,maximumDistance:node.params.距离区*BATTLEFIELD.zoneLength,distance:pointDistance(unitPoint(actor),unitPoint({位置:to})),reached:combatDistance({位置:to},target)<=.000001};
  }

  function isBeneficialSkill(skill) {
    const nodes = skillEffectBranches(skill).flatMap(branch=>branch.nodes);
    return nodes.some(node => effects.effectPolarity(node.effectId,node.params) === 'beneficial') &&
      !nodes.some(node => effects.effectPolarity(node.effectId,node.params) === 'harmful');
  }

  function skillEffectBranches(skill,fullSource=false) {
    return effects.graphBranches((fullSource?skill?.effectGraph:effects.immediateGraph(skill)) ?? {nodes:[]}).filter(branch => branch.activation !== 'passive');
  }

  function selectedSkillBranches(skill,intent={}) {
    const branches=skillEffectBranches(skill),selections=intent.branchTargets??{};
    if(!selections||typeof selections!=='object'||Array.isArray(selections))throw Error('技能分支选择无效');
    for(const [id,selection] of Object.entries(selections)){
      const branch=branches.find(b=>b.id===id);
      if(!branch||!selection||typeof selection!=='object'||Array.isArray(selection)||Object.keys(selection).some(k=>!['enabled','targetIds','aimPoint'].includes(k)))throw Error('技能分支选择包含未知分支或字段');
      if(selection.enabled!==undefined&&typeof selection.enabled!=='boolean')throw Error('技能分支启用须为布尔值');
      if(!branch.optional&&selection.enabled===false)throw Error('必需效果分支不能关闭');
    }
    const selected=branches.map((branch,originalIndex)=>({...branch,originalIndex})).filter(branch=>{
      const choice=selections[branch.id];
      return !branch.optional||choice?.enabled===true||choice?.enabled!==false&&!!choice&&(!!choice.aimPoint||Array.isArray(choice.targetIds)&&choice.targetIds.length>0)||!branches.some(b=>!b.optional)&&!Object.keys(selections).length&&branch.originalIndex===0;
    });
    if(!selected.length)throw Error('至少选择一个主动效果分支');
    return selected;
  }

  function skillForBranch(skill, branch) {
    const ids = new Set(branch.nodes.map(node => node.id));
    return {
      ...skill,
      exchangeContracts:(skill.exchangeContracts??[]).filter(c=>c.benefits?.branchIds?.includes(branch.id)),
      effectGraph:{
        registryVersion:skill.effectGraph?.registryVersion,
        entryNodeId:branch.entryNodeId,
        nodes:branch.nodes,
        edges:(skill.effectGraph?.edges ?? []).filter(edge => ids.has(edge.from) && ids.has(edge.to)),
        maxTriggerDepth:skill.effectGraph?.maxTriggerDepth ?? 8
      }
    };
  }

  function intentForBranch(intent, branch, index, branches=[]) {
    const explicit = intent?.branchTargets?.[branch.id] ?? {};
    const follows=branch.nodes.some(n=>n.effectId==='target.single'&&n.params.沿用首目标);
    const first=branches[0],primary=intent?.branchTargets?.[first?.id]?.targetIds??intent.targetIds;
    if(follows&&explicit.targetIds?.length&&JSON.stringify(explicit.targetIds)!==JSON.stringify(primary))throw Error('此连击必须沿用第一段的同一目标');
    return {
      ...intent,
      targetIds:follows?primary:explicit.targetIds ?? ((branch.originalIndex??index) === 0 ? intent.targetIds : []),
      aimPoint:explicit.aimPoint ?? ((branch.originalIndex??index) === 0 ? intent.aimPoint : null)
    };
  }

  function activeZones(state, kind = null) {
    return [...Object.values(state.战斗?.扩展?.区域效果 ?? {}),...globalThis.SoulCreationCore.activeWalls(state)].filter(zone => zone.状态 !== '已结束'&& (zone.类型!=='wall'||zone.耐久>0) && (!kind || zone.类型 === kind));
  }

  function activeDomains(state) {
    return Object.values(state.战斗?.扩展?.领域实例 ?? {}).filter(domain => domain.状态 === '生效');
  }

  function domainCenter(state, domain) {
    const source = state.战斗单位.列表[domain.来源?.单位ID];
    return domain.参数?.跟随施术者 && source ? source.位置 : domain.中心;
  }

  function domainContains(state, domain, unit) {
    const center = domainCenter(state, domain);
    if (!center || !unit) return false;
    const radius = Number(domain.参数?.半径区 ?? 0);
    if(domain.参数?.定点守卫)return pointDistance(unitPoint({位置:center}),unitPoint(unit))<=10+radius*BATTLEFIELD.zoneLength;
    if (combatDistance({位置:center}, unit) > radius) return false;
    return radius > 0 || !center.站位簇 || center.站位簇 === unit.位置.站位簇;
  }

  function domainFactionEligible(state, domain, source, unit, childNode = null) {
    const explicit = childNode?.params?.领域阵营;
    if (explicit === '所有') return true;
    if (explicit === '敌方') return !sameSide(state, unit, source);
    if (explicit === '友方') return sameSide(state, unit, source);
    const rule = domain.参数?.阵营规则 ?? '自动';
    if (rule === '无差别' || rule === '任意') return true;
    if (rule === '友方') return sameSide(state, unit, source);
    return !sameSide(state, unit, source);
  }

  function zoneContains(zone, unit) {
    if (!zone || !unit) return false;
    if (zone.距离区 !== unit.位置.距离区) return false;
    if (pointDistance(battlePoint(zone.战场坐标),unitPoint(unit))>10) return false;
    return !zone.站位簇 || zone.站位簇 === unit.位置.站位簇;
  }

  function wallOnPath(state,from,to,mode){
    const start=unitPoint({位置:from}),end=unitPoint({位置:to});
    return activeZones(state,'wall').find(zone=>{
      if(!['全部',mode].includes(zone.参数?.阻挡))return false;
      const center=battlePoint(zone.战场坐标),inside=p=>pointDistance(p,center)<9.999;
      if(inside(start)&&inside(end))return false;
      const dx=end.x-start.x,dy=end.y-start.y,length=dx*dx+dy*dy;if(!length)return false;
      const t=clamp(((center.x-start.x)*dx+(center.y-start.y)*dy)/length,0,1);
      return pointDistance(center,{x:start.x+t*dx,y:start.y+t*dy})<10;
    });
  }
  function projectileBlocked(state,actor,target){return !!wallOnPath(state,actor.位置,target.位置,'投射');}
  function movementAllowance(state, actor, dash = false) {
    const haste = strongestStatusMagnitude(state, actor.id, 'status.haste');
    const slow = strongestStatusMagnitude(state, actor.id, 'status.slow');
    const flight = activeStatuses(state, actor.id, 'move.flight').length ? 1 : 0;
    const terrainPenalty = activeZones(state, 'hazard')
      .filter(zone => zoneContains(zone, actor))
      .reduce((sum, zone) => sum + Math.min(0, Number(zone.参数?.移动修正 ?? 0)), 0);
    const maximumBase = Math.max(0, foundation.battleAttributeView(state,actor).derived.移动区 + haste + flight - slow + terrainPenalty);
    const maximum= dash ? maximumBase * 2 : maximumBase;
    return {maximum,coordinateRadius:maximum*BATTLEFIELD.zoneLength,terrainPenalty};
  }

  function moveUnit(state, actor, movement, receipt) {
    if (!movement) return;
    const blocked = movementImpairment(state,actor.id);
    if (blocked) throw new Error(blocked);
    const destination = movement.距离区;
    if (!ZONES.includes(destination)) throw new Error(`非法距离区：${destination}`);
    const zoneSteps = zoneDistance(actor.位置.距离区, destination);
    const {maximum,terrainPenalty}=movementAllowance(state,actor,movement.冲刺);
    const from = clone(actor.位置);
    const oldZoneIndex = Math.max(0, ZONES.indexOf(actor.位置.距离区));
    const point = battlePoint(actor.位置.战场坐标, {x: actor.阵营 === 'player' ? 24 : 76, y: 50});
    const newZoneIndex = Math.max(0, ZONES.indexOf(destination));
    const towardCenter = oldZoneIndex - newZoneIndex;
    const sideDirection = point.x <= 50 ? 1 : -1;
    const destinationPoint = battlePoint(movement.战场坐标, {
      x: clamp(point.x + towardCenter * BATTLEFIELD.zoneLength * sideDirection, 4, 96),
      y: point.y
    });
    const distance=Math.max(zoneSteps,pointDistance(point,destinationPoint)/BATTLEFIELD.zoneLength);
    if(distance>maximum+.000001)throw new Error(`移动超过本回合上限：${distance.toFixed(1)}/${maximum}`);
    const proposed={...actor,位置:{...actor.位置,距离区:destination,战场坐标:destinationPoint}};
    if(wallOnPath(state,from,proposed.位置,'移动'))throw Error('移动路径被墙体阻挡，请绕行、破坏墙体或使用瞬移');
    assertVoluntaryPosition(state,actor,from,proposed.位置);
    actor.位置=proposed.位置;globalThis.SoulPoisonCore?.syncResidents(state);
    if (movement.站位簇 !== undefined) actor.位置.站位簇 = String(movement.站位簇);
    receipt.movement = {from, to: clone(actor.位置), distance, dash: Boolean(movement.冲刺), terrainPenalty};
  }

  function battlePoint(value, fallback = {x: 50, y: 50}) {
    const x = Number(value?.x);
    const y = Number(value?.y);
    return {
      x: clamp(Number.isFinite(x) ? x : fallback.x, BATTLEFIELD.minimum, BATTLEFIELD.maximum),
      y: clamp(Number.isFinite(y) ? y : fallback.y, BATTLEFIELD.minimum, BATTLEFIELD.maximum)
    };
  }

  function unitPoint(unit) {
    const zoneIndex = Math.max(0, ZONES.indexOf(unit?.位置?.距离区));
    const fallbackX = unit?.阵营 === 'player' ? 22 + zoneIndex * 4 : 78 - zoneIndex * 4;
    return battlePoint(unit?.位置?.战场坐标, {x: fallbackX, y: 50});
  }

  function pointDistance(left, right) {
    return Math.hypot(Number(left?.x ?? 0) - Number(right?.x ?? 0), Number(left?.y ?? 0) - Number(right?.y ?? 0));
  }

  function targetingMode(targetNode) {
    if (!targetNode || ['target.self', 'target.aura'].includes(targetNode.effectId)) return 'automatic';
    if (['target.single', 'target.cluster', 'target.chain'].includes(targetNode.effectId)) return 'unit';
    if (targetNode.effectId === 'target.burst') return targetNode.params.以友方为中心?'unit':'point';
    if (['target.line', 'target.cone'].includes(targetNode.effectId)) return 'direction';
    return 'automatic';
  }

  function releaseRangeZones(releaseNode, targetNode) {
    if (releaseNode?.effectId === 'release.touch') return 1;
    if (releaseNode?.effectId === 'release.melee') return 1;
    if (releaseNode?.effectId === 'release.projectile') return Number(releaseNode.params.距离区 ?? 2);
    if (targetNode?.effectId === 'target.cone') return Number(targetNode.params.距离区 ?? 1);
    return 4;
  }

  function pointOnLine(point, origin, aim, maximumLength, halfWidth = BATTLEFIELD.lineHalfWidth) {
    const dx = aim.x - origin.x;
    const dy = aim.y - origin.y;
    const magnitude = Math.hypot(dx, dy);
    if (magnitude < 0.001) return false;
    const ux = dx / magnitude;
    const uy = dy / magnitude;
    const px = point.x - origin.x;
    const py = point.y - origin.y;
    const projection = px * ux + py * uy;
    if (projection < 0 || projection > maximumLength) return false;
    return Math.abs(px * uy - py * ux) <= halfWidth;
  }

  function pointInCone(point, origin, aim, maximumLength, degrees = BATTLEFIELD.coneDegrees) {
    const dx = aim.x - origin.x;
    const dy = aim.y - origin.y;
    const magnitude = Math.hypot(dx, dy);
    if (magnitude < 0.001) return false;
    const px = point.x - origin.x;
    const py = point.y - origin.y;
    const distance = Math.hypot(px, py);
    if (distance < 0.001 || distance > maximumLength) return false;
    const cosine = (px * dx + py * dy) / (distance * magnitude);
    return cosine >= Math.cos((degrees / 2) * Math.PI / 180);
  }

  function resolveTargets(state, actor, skill, intent) {
    const graph = skill.effectGraph;
    const targetNode = graph.nodes.find(node => node.family === 'targeting');
    const releaseNode = graph.nodes.find(node => node.family === 'release');
    const geometry=targetGeometry(releaseNode,graph.nodes.find(n=>n.family==='targeting')),rangeExtra=avatarRangeBonus(state,actor,skill)*BATTLEFIELD.zoneLength;
    if(rangeExtra)for(const key of ['aimRange','length'])geometry[key]+=rangeExtra;
    const requested = cleanList(intent.targetIds);
    const units = state.战斗单位.列表;
    let targetIds = [];
    const beneficial = isBeneficialSkill(skill);
    const allowsDead = graph.nodes.some(node => node.effectId === 'payload.revive');
    const factionRule = targetNode?.params?.阵营规则 ?? '自动';
    const selectionMode = targetNode?.params?.选择模式 ?? '主目标';
    const interpose=graph.nodes.find(n=>n.effectId==='reaction.interpose');
    const factionEligible = unit => {
      if(interpose&&unit.id===actor.id)return false;
      if (targetNode?.effectId === 'target.self') return unit.id === actor.id;
      if (factionRule === '敌方') return !sameSide(state, unit, actor);
      if (factionRule === '友方') return sameSide(state, unit, actor);
      if (factionRule === '任意' || factionRule === '无差别') return true;
      return beneficial ? sameSide(state, unit, actor) : !sameSide(state, unit, actor);
    };
    const baseEligible = unit => Boolean(unit) && isPresentParticipant(state, unit.id) &&
      (allowsDead ? ['死亡','昏迷'].includes(unit.存活状态)||unit.资源.生命.当前<=0 : isActiveParticipant(state, unit.id)) && factionEligible(unit);
    const eligible = unit => baseEligible(unit) && !globalThis.SoulTargetConditions?.skillReason(state,actor.id,unit.id,skill);
    // Single-target casts with a selected unit do not need to rank the entire battlefield.
    let ranked;
    const orderedLegal = () => ranked ??= Object.values(units).filter(eligible).sort((left, right) => {
      if (selectionMode === '自动最低生命') {
        const leftRatio = left.资源.生命.当前 / Math.max(1, left.资源.生命.最大);
        const rightRatio = right.资源.生命.当前 / Math.max(1, right.资源.生命.最大);
        if (leftRatio !== rightRatio) return leftRatio - rightRatio;
      }
      if (selectionMode === '自动最近') {
        const delta = combatDistance(actor,left) - combatDistance(actor,right);
        if (delta) return delta;
      }
      return left.id.localeCompare(right.id);
    });
    const primaryId = requested[0] ?? (selectionMode === '主目标' ? '' : orderedLegal()[0]?.id);
    const actorPoint = unitPoint(actor);
    const primaryPoint = units[primaryId] ? unitPoint(units[primaryId]) : null;
    const anchored=targetNode?.params?.以友方为中心;
    if(anchored&&(!primaryPoint||!eligible(units[primaryId])||!sameSide(state,actor,units[primaryId])||combatDistance(actor,units[primaryId])>geometry.rangeZones))throw Error('请选择射程内的一名同伴作为中心');
    const aimPoint = anchored?primaryPoint:targetNode?.params?.落点==='自身'?actorPoint:battlePoint(intent.aimPoint, primaryPoint ?? actorPoint);
    const mode = targetingMode(targetNode);
    if(graph.nodes.some(n=>n.effectId==='domain.field'&&n.params.定点守卫)&&mode==='point'){
      if(pointDistance(actorPoint,aimPoint)>geometry.aimRange)throw Error('守卫落点超出施放距离');
      return [actor.id];
    }
    if (requested.some(id => !baseEligible(units[id]))) throw new Error(`显式目标不符合阵营或存活规则：${requested.find(id => !baseEligible(units[id]))}`);
    if(targetNode?.effectId==='target.single'&&primaryId){const reason=globalThis.SoulTargetConditions?.skillReason(state,actor.id,primaryId,skill);if(reason)throw Error(reason);}
    if (targetNode?.effectId === 'target.self') {const conditionReason=globalThis.SoulTargetConditions?.skillReason(state,actor.id,actor.id,skill);if(conditionReason)throw Error(conditionReason);targetIds = [actor.id];}
    else if (targetNode?.effectId === 'target.single') targetIds = primaryId ? [primaryId] : [];
    else if(targetNode?.effectId==='target.allies'){
      const maximum=Number(targetNode.params.距离区??3)+avatarRangeBonus(state,actor,skill);
      targetIds=(Array.isArray(intent.targetIds)?requested:orderedLegal().map(u=>u.id)).filter(id=>eligible(units[id])&&combatDistance(actor,units[id])<=maximum);
      if(requested.some(id=>!targetIds.includes(id)))throw Error('所选同伴不在加持距离内');
      if(!targetIds.length)throw Error('范围内没有可以加持的同伴');
    }
    else if (targetNode?.effectId === 'target.cluster') {
      const anchor = units[primaryId];
      if (!anchor) throw new Error('范围技能缺少合法落点目标');
      const anchorPoint = unitPoint(anchor);
      targetIds = Object.values(units)
        .filter(unit => eligible(unit) && pointDistance(unitPoint(unit), anchorPoint) <= 12)
        .slice(0, targetNode.params.最大目标 ?? 2).map(unit => unit.id);
    } else if (targetNode?.effectId === 'target.line') {
      const length = geometry.length;
      targetIds = orderedLegal()
        .filter(unit => pointOnLine(unitPoint(unit), actorPoint, aimPoint, length))
        .slice(0, targetNode.params.最大目标 ?? 2).map(unit => unit.id);
    } else if (targetNode?.effectId === 'target.cone') {
      const length = geometry.length;
      targetIds = orderedLegal()
        .filter(unit => pointInCone(unitPoint(unit), actorPoint, aimPoint, length))
        .sort((left, right) => pointDistance(actorPoint, unitPoint(left)) - pointDistance(actorPoint, unitPoint(right)) || left.id.localeCompare(right.id))
        .slice(0, targetNode.params.最大目标 ?? 2).map(unit => unit.id);
    } else if (targetNode?.effectId === 'target.burst') {
      const coordinateRadius = targetGeometry(releaseNode,targetNode).radius+avatarAreaBonus(state,actor,skill)*BATTLEFIELD.zoneLength;
      targetIds = orderedLegal()
        .filter(unit => pointDistance(unitPoint(unit), aimPoint) <= coordinateRadius)
        .sort((left,right)=>anchored?(Number(right.id===primaryId)-Number(left.id===primaryId)||pointDistance(unitPoint(left),aimPoint)-pointDistance(unitPoint(right),aimPoint)||left.id.localeCompare(right.id)):targetNode.params.本人优先?(Number(right.id===actor.id)-Number(left.id===actor.id)||pointDistance(unitPoint(left),aimPoint)-pointDistance(unitPoint(right),aimPoint)||left.id.localeCompare(right.id)):0)
        .slice(0, targetNode.params.覆盖全部?undefined:targetNode.params.最大目标 ?? 2).map(unit => unit.id);
    } else if (targetNode?.effectId === 'target.chain') {
      const maximum = targetNode.params.最大目标 ?? 2;
      const first = units[primaryId] && eligible(units[primaryId]) ? units[primaryId] : orderedLegal()[0];
      const chosen = first ? [first] : [];
      const jumpRange = 10 + Number(targetNode.params.跳跃区 ?? 0) * BATTLEFIELD.zoneLength;
      while (chosen.length < maximum) {
        const previous = chosen.at(-1);
        const next = orderedLegal()
          .filter(unit => !chosen.some(item => item.id === unit.id) && pointDistance(unitPoint(previous), unitPoint(unit)) <= jumpRange)
          .sort((left, right) => pointDistance(unitPoint(previous), unitPoint(left)) - pointDistance(unitPoint(previous), unitPoint(right)) || left.id.localeCompare(right.id))[0];
        if (!next) break;
        chosen.push(next);
      }
      targetIds = chosen.map(unit => unit.id);
    } else if (targetNode?.effectId === 'target.aura') {
      targetIds = Object.values(units)
        .filter(unit => eligible(unit) && pointDistance(actorPoint, unitPoint(unit)) <= 10 + Number(targetNode.params.距离区 ?? 0) * BATTLEFIELD.zoneLength)
        .map(unit => unit.id);
    } else if (!targetNode && graph.nodes.some(node => node.family === 'reaction')) targetIds = [actor.id];
    if (!targetIds.length) throw new Error('没有合法目标');
    const geometric = anchored || ['point', 'direction'].includes(mode);
    const maximumAimDistance = geometry.aimRange;
    if (geometric && pointDistance(actorPoint, aimPoint) > maximumAimDistance) throw new Error('技能选点超出施放距离');
    for (const id of targetIds) {
      const target = units[id];
      if (!target || (!allowsDead && target.存活状态 !== '存活') || (allowsDead && !baseEligible(target))) throw new Error(`目标不存在或状态不合法：${id}`);
      if(allowsDead&&state.人物?.列表?.[id]?.life?.death){const reason=people.revivalReason(state,id);if(reason)throw Error(reason);}
      if(allowsDead&&!state.人物?.列表?.[id]&&(target.扩展?.remainsId||target.扩展?.projection||target.扩展?.召唤))throw Error('已消散的召唤、投影或已结算遗骸不能复活');
      const ageReason=controls.adultReason(state,id,skill);if(ageReason&&(targetNode?.effectId==='target.single'||targetNode?.effectId==='target.self'||requested.includes(id)))throw Error(ageReason);
      const distance = combatDistance(actor,target);
      const maximum = releaseNode ? releaseRangeZones(releaseNode,targetNode)+(releaseNode.effectId==='release.melee'?0:avatarRangeBonus(state,actor,skill)) : Number.POSITIVE_INFINITY;
      const approach=graph.nodes.find(node=>node.effectId==='move.approach');
      if(approach)approachPlan(state,actor,target,approach);
      else if (!geometric && distance > maximum+.000001) throw new Error(`距离过远，需要靠近至${ZONES[Math.min(4,maximum)]??'技能范围内'}`);
      if (releaseNode?.effectId === 'release.projectile' && !graph.nodes.some(n=>['payload.damage','payload.residual'].includes(n.effectId)) && projectileBlocked(state, actor, target)) throw new Error(`投射路径被墙体阻挡：${id}`);
    }
    if(!beneficial)actions.assertTargets(state,actor.id,{harmfulTargetIds:harmfulTargetsForSkill(state,actor,skill,targetIds)});
    const visualTargets=requested.length?requested:targetNode?.effectId==='target.single'?targetIds:[];
    if(visualTargets.some(id=>id!==actor.id)&&controls.restrictions(state,actor.id).blocked.vision?.length&&visualTargets.some(id=>id!==actor.id&&!actions.perception(state,actor.id,id)))throw Error('失明时不能选择未实际感知的视觉目标');
    return targetIds;
  }

  function targetGeometry(releaseNode,targetNode) {
    return {
      rangeZones: releaseRangeZones(releaseNode,targetNode),
      releaseName: effects.EFFECT_REGISTRY[releaseNode?.effectId]?.displayName ?? '',
      maxTargetDistance: releaseRangeZones(releaseNode,targetNode)*BATTLEFIELD.zoneLength+10,
      range: releaseRangeZones(releaseNode, targetNode) * BATTLEFIELD.zoneLength,
      aimRange: releaseRangeZones(releaseNode, targetNode) * BATTLEFIELD.zoneLength + 10,
      length: Math.max(BATTLEFIELD.zoneLength,targetNode?.effectId === 'target.cone' ? Number(targetNode.params.距离区 ?? 1)*BATTLEFIELD.zoneLength : releaseRangeZones(releaseNode,targetNode)*BATTLEFIELD.zoneLength),
      radius: targetNode?.effectId === 'target.burst' ? 10 + Number(targetNode.params.半径区 ?? 0) * 18 : 0,
      lineHalfWidth: BATTLEFIELD.lineHalfWidth,
      coneDegrees: BATTLEFIELD.coneDegrees
    };
  }

  function targetPreviewChoices(state, actor, skill) {
    const targetNode = skill.effectGraph.nodes.find(node => node.family === 'targeting');
    const releaseNode = skill.effectGraph.nodes.find(node => node.family === 'release');
    const selectionMode = targetNode?.params?.选择模式 ?? '主目标';
    const mode = targetingMode(targetNode);
    const geometry = targetGeometry(releaseNode,targetNode);
    if(targetNode?.effectId==='target.burst')geometry.radius+=avatarAreaBonus(state,actor,skill)*BATTLEFIELD.zoneLength;
    const extra=releaseNode?.effectId==='release.melee'?0:avatarRangeBonus(state,actor,skill);
    if(extra){geometry.rangeZones+=extra;for(const key of ['maxTargetDistance','range','aimRange','length'])geometry[key]+=extra*BATTLEFIELD.zoneLength;}
    const needsPrimaryTarget = !targetNode?.params?.沿用首目标&&targetNode?.effectId!=='target.allies'&&selectionMode === '主目标' && mode === 'unit';
    const needsAim = targetNode?.params?.落点!=='自身'&&selectionMode === '主目标' && ['point', 'direction'].includes(mode);
    if (!needsPrimaryTarget && !needsAim&&targetNode?.effectId!=='target.allies') return {mode, effectId: targetNode?.effectId ?? '', geometry, needsPrimaryTarget: false, needsAim: false, choices: []};

    const targetOptions = Object.values(state.战斗单位.列表)
      .filter(unit=>Boolean(state.战斗?.扩展?.成员?.[unit.id]))
      .sort((left,right)=>left.id.localeCompare(right.id))
      .map(unit => {
        let reason='';
        try {
          resolveTargets(state, actor, skill, {targetIds: [unit.id]});
        } catch(error) { reason=String(error.message).replaceAll(unit.id,unit.名称??'该目标'); }
        return {
        id: unit.id,
        name: unit.名称 ?? unit.id,
        faction: unit.阵营,
        sideId: sideIdOf(state, unit),
        life: {current: unit.资源.生命.当前, maximum: unit.资源.生命.最大},
        position: clone(unit.位置),distance:combatDistance(actor,unit),distanceLabel:ZONES[Math.min(4,Math.ceil(combatDistance(actor,unit)))],
        available:!reason,reason
      };});
    const choices=targetOptions.filter(option=>option.available);
    return {
      mode,
      effectId: targetNode?.effectId ?? '',
      geometry,
      needsPrimaryTarget,
      needsAim,
      battlefield: clone(BATTLEFIELD),
      choices,targetOptions
    };
  }

  function restraintAction(state,actorId,intent,sourceId,receipt=null){
    const item=custody.controlDevice(state,actorId,String(intent.itemId??''),state.战斗.id),target=state.战斗单位.列表[item.attachment.wearerId];
    if(combatDistance(state.战斗单位.列表[actorId],target)>0)throw Error('须在佩戴者的接触距离操作拘束器');
    const result=custody.setDeviceMode(state,{...intent,actorId,battleId:state.战斗.id},sourceId,{applyDevice:applyCustodyDevice,removeDevice:(s,id,reason)=>removeCustodyDeviceStatuses(s,id,reason,receipt)});
    pruneMaintenance(state,receipt);return {...result,power:controls.powerFacts(state,target.id)};
  }
  function supportConfiguration(state,actor,intent,receipt=null,rng=null){
    const view=support.describe(state,actor.id),rows=intent.supportSelections??view.skills.map(sk=>({skillId:sk.id,targetIds:view.sources.find(e=>e.skillId===sk.id)?.targetIds??[]}));
    if(!Array.isArray(rows)||rows.length>view.skills.length||new Set(rows.map(r=>r.skillId)).size!==rows.length)throw Error('请选择不重复的加持层');
    const selections=view.skills.map(sk=>{
      const row=rows.find(r=>r?.skillId===sk.id)??{skillId:sk.id,targetIds:[]},ids=cleanList(row.targetIds);
      if(!Array.isArray(row.targetIds)||ids.length!==row.targetIds.length)throw Error('加持对象不能重复');
      if(ids.some(id=>!view.targets.some(t=>t.id===id&&t.distance<=sk.range)))throw Error('所选加持对象已离场或超出距离');
      const skill=getSkill(state,actor,sk.id);if(!skill)throw Error('没有这项加持能力');
      if(ids.length)validateSkillSpecialRequirements(state,actor,skill);
      const old=support.targetIds(state,actor.id,sk.id),changed=id=>row.elements?.[id]&&support.statuses(state,actor.id,sk.id).some(x=>x.目标单位ID===id&&x.快照?.参数?.指标==='属性伤害'&&x.扩展?.加持属性!==row.elements[id]),added=ids.filter(id=>!old.includes(id)||changed(id));
      return {skillId:sk.id,targetIds:ids,added,old,lock:ids.length?sk.locked:0,activation:support.activation(state,actor.id,skill,ids,row.elements),rawUpkeep:support.upkeep(state,actor.id,skill,ids),elements:row.elements??{}};
    });
    if(rows.some(row=>!view.skills.some(sk=>sk.id===row.skillId)))throw Error('加持层不属于当前武魂');
    const activation=selections.reduce((n,row)=>n+row.activation,0),locked=selections.reduce((n,row)=>n+row.lock,0),newLock=Math.max(0,locked-view.locked),releasedLock=Math.max(0,view.locked-locked),available=controls.availableSoulPower(state,actor.id)+releasedLock;
    const upkeep=Math.ceil(selections.reduce((n,row)=>n+row.rawUpkeep,0)),needsAction=selections.some(row=>row.added.length>0);
    if(activation+newLock>available)throw Error(`魂力不足：启动需要${activation}，新增占用${newLock}，可用${available}`);
    for(const row of selections){const skill=state.技能.列表[row.skillId];for(const id of row.targetIds){const elements=support.strongestElements(state,id);if(skill.effectGraph.nodes.some(n=>n.params?.指标==='属性伤害')&&row.elements[id]&&!elements.includes(row.elements[id]))throw Error('请选择该同伴武魂最强的属性');}}
    const result={...view,selections,activation,locked,upkeep,totalUpkeep:(globalThis.SoulCombatDeployments.soulPowerResource(state,actor.id)).持续消耗-view.upkeep+upkeep,needsAction};
    if(!receipt)return result;
    for(const row of selections)for(const status of support.statuses(state,actor.id,row.skillId))if(!row.targetIds.includes(status.目标单位ID))removeStatus(state,status,'support-selection-removed',receipt);
    pruneMaintenance(state,receipt);
    receipt.supportCasts=[];
    for(const row of selections){
      if(!row.added.length)continue;
      const sub={id:receipt.id+':support:'+row.skillId,type:'combat-action',battleId:receipt.battleId,round:receipt.round,actorId:actor.id,targets:[],statusEvents:[],traitEvents:[],narrationFacts:[],errors:[],stateChanges:[],statusLifecycle:[],fieldLifecycle:[]};
      executeSkill(state,actor,getSkill(state,actor,row.skillId),{type:'技能',actorId:actor.id,skillId:row.skillId,targetIds:row.targetIds,supportElements:row.elements},rng,sub);
      receipt.supportCasts.push(sub);receipt.targets.push(...sub.targets);
    }
    support.refreshCosts(state);receipt.supportConfiguration={activation,locked,upkeep,totalUpkeep:(globalThis.SoulCombatDeployments.soulPowerResource(state,actor.id)).持续消耗,free:!needsAction};
    receipt.narrationFacts.push(`${actor.名称}调整持续加持，启动消耗${activation}魂力，加持每回合消耗${upkeep}魂力`);
    return result;
  }
  function previewUncontrolledAction(rawState, intent = {}) {return previewUncontrolledActionPrepared(foundation.normalizeState(clone(rawState)),intent);}
  function previewUncontrolledActionPrepared(state, intent = {}) {
    try{return previewUncontrolledActionCore(state,intent);}
    catch(error){if(error?.code==='battle-resource-insufficient')return {ready:false,reason:error.message,actorId:intent.actorId,actionType:intent.type??'技能',stateRevision:state.系统.revision};throw error;}
  }
  function previewUncontrolledActionCore(state,intent={}){
    if (!ACTIVE_BATTLE_STATES.includes(state.战斗.状态)) throw new Error('当前没有进行中的战斗');
    if(state.战斗.扩展.clock.pendingRoundStart)throw new Error('本轮尚未到正式开始时刻');
    const actorId = String(intent.actorId ?? '');
    if (actorId !== state.战斗.当前行动单位ID) throw new Error(`尚未轮到单位：${actorId}`);
    const actor = state.战斗单位.列表[actorId];
    if (!actor || !isActiveParticipant(state, actorId)) throw new Error('行动者不存在、已经失能或已经撤离');
    const impairment = actionImpairment(state,actorId);
    if(intent.type==='配置加持'){
      if(impairment.reason)throw Error(`当前因${impairment.reason}无法调整加持`);
      const configuration=supportConfiguration(state,actor,intent);
      return {ready:true,actorId,support:configuration,soulPowerCost:configuration.activation,activationLock:Math.max(0,configuration.locked-configuration.sources.reduce((n,e)=>n+e.locked,0)),availableSoulPower:controls.availableSoulPower(state,actorId),targets:configuration.targets.filter(t=>configuration.selections.some(r=>r.targetIds.includes(t.id)))};
    }
    if (impairment.reason&&!['认输','放弃行动'].includes(intent.type)&&!(intent.type==='挣脱'&&!impairment.surprised)) throw new Error(`当前因${impairment.reason}无法采取主行动`);
    const movementReceipt={};
    if(intent.type!=='认输')moveUnit(state,actor,intent.movement,movementReceipt);
    if (intent.type === '切换武魂') {
      const targetSoulId = String(intent.martialSoulId ?? '');
      if (!foundation.ownedMartialSoulIds(state, actorId).includes(targetSoulId)) throw new Error('目标武魂不属于行动者');
      if (targetSoulId === foundation.activeMartialSoulId(state, actorId)) throw new Error('目标武魂已经激活');
      if (activeMartialAvatar(state, actorId)) throw new Error('武魂真身持续期间不能切换武魂');
      controls.assertAction(state,actorId,'switch-soul',{soulId:targetSoulId});
      return {
        ready: true, stateRevision: state.系统.revision, battleId: state.战斗.id, round: state.战斗.回合, actorId,
        actionType: '切换武魂',movement:movementReceipt.movement??null, previousSoulId: foundation.activeMartialSoulId(state, actorId), martialSoulId: targetSoulId,
        martialSoulName: state.武魂.列表[targetSoulId].名称, costsMainAction: true, targeting: {needsPrimaryTarget: false, needsAim: false, choices: []}
      };
    }
    if(['解除伪装','识破伪装'].includes(intent.type)){
      const q=globalThis.SoulDisguise.quote(state,{...intent,type:intent.type==='解除伪装'?'dismiss-disguise':'inspect-disguise',actorId});
      globalThis.SoulActionContext.resolve(state,{actorId,battleId:state.战斗.id,requirements:[intent.type==='识破伪装'?(intent.method==='contact'?'gesture':'vision'):'focus']});
      return {ready:true,stateRevision:state.系统.revision,battleId:state.战斗.id,actorId,actionType:intent.type,costsMainAction:true,disguise:q,targeting:{needsPrimaryTarget:false,needsAim:false,choices:[]}};
    }
    if(intent.type==='调节拘束'){
      const q=restraintAction(state,actorId,intent,'preview-restraint');
      return {ready:true,actorId,actionType:intent.type,restraint:q,costsMainAction:true,targeting:{needsPrimaryTarget:false,needsAim:false,choices:[]}};
    }
    if(intent.type==='破坏封神台'){
      const q=globalThis.SoulSealingCore.quoteStrike(state,actorId,intent.itemId,state.战斗.id);
      return {ready:true,actorId,actionType:intent.type,itemId:q.item.id,costsMainAction:true,targeting:{needsPrimaryTarget:false,needsAim:false,choices:[]}};
    }
    if ((intent.type ?? '技能') !== '技能') {
      const tactic=listTacticalActions(state,actorId).find(t=>t.actionType===intent.type&&
        (intent.type!=='放弃行动'||t.id===(intent.movement?'tactic:move':'tactic:pass'))&&
        (intent.type!=='挣脱'||!intent.statusId||t.statusId===intent.statusId)&&
        (intent.type!=='停止维持'||t.maintenanceSourceId===intent.maintenanceSourceId));
      if(!tactic||!tactic.available)throw Error(tactic?.reason||'当前没有这项可用的战斗行动');
      return {ready:true,stateRevision:state.系统.revision,battleId:state.战斗.id,round:state.战斗.回合,actorId,actionType:intent.type,
        movement:movementReceipt.movement??null,costsMainAction:true,targeting:{needsPrimaryTarget:false,needsAim:false,choices:[]},
        ...(intent.type==='挣脱'?{breakFree:breakFreeProfile(state,actorId,intent.statusId,{method:intent.method,battleId:state.战斗.id})}:{}),
        ...(intent.type==='逃跑'?{escape:escapeDifficulty(state,actor)}:{})};
    }
    const skill = getSkill(state, actor, intent.skillId ?? 'ordinary.attack',intent.castRank);
    if (!skill) throw new Error(`单位没有技能：${intent.skillId}`);
    if (skillBlockedByBattleRules(state, skill)) throw new Error('地狱杀戮场封禁魂环魂技');
    if (skill.ownerKind === '魂兽' && skill.sourceBeastProfileId && actor.扩展?.魂兽档案ID !== skill.sourceBeastProfileId) throw new Error('魂兽技能来源与行动者不匹配');
    if (skill.持有者单位ID && skill.持有者单位ID !== actor.id) throw new Error('魂技不属于行动者');
    validateSkillSpecialRequirements(state, actor, skill);
    externalSourceItem(state, actor, skill);

    const validation = effects.validateGraph(skill.effectGraph, {ageTier: skill.ageTier ?? '十万年', mechanismCap: skill.mechanismCap ?? '规则'});
    if (effects.skillActivation(skill.effectGraph) === 'passive') throw new Error('被动能力随来源生效，无需施放');
    if (!validation.pass) throw new Error(`技能效果图非法：${validation.errors.join('；')}`);
    const castProfile = soulRingCastProfile(state, actor, skill, intent.castRank);
    const selectedBranches=selectedSkillBranches(skill,intent),selectedBranchIds=selectedBranches.map(b=>b.id);
    const castOptions = soulRingCastOptions(state, actor, {...skill,_modeId:intent.modeId},selectedBranchIds);
    const itemNodes=selectedBranches.flatMap(b=>b.nodes.filter(n=>['payload.repair_item','payload.fabricate'].includes(n.effectId)));
    if(itemNodes.length>1)throw Error('每次行动只能选择一种物品构造用途');
    const creationOptions=itemNodes.map(n=>{const branch=selectedBranches.find(b=>b.nodes.includes(n)),scopedIntent=intentForBranch(intent,branch,branch.originalIndex,selectedBranches),targetId=n.effectId==='payload.fabricate'?actor.id:resolveTargets(state,actor,skillForBranch(skill,branch),scopedIntent)[0],selection=globalThis.SoulCreationCore.resolveItemOptions(state,actor.id,targetId,n,scopedIntent);return {effectId:n.effectId,targetId,selection,maximumQuantity:n.params.最大数量??1,choices:globalThis.SoulCreationCore.itemChoices(state,actor.id,targetId,n),quote:globalThis.SoulCreationCore.previewItemEffect(state,actor.id,targetId,n,selection)};});
    const creationQuotes=creationOptions.map(v=>v.quote);
    const supportTargets=support.chargesByTarget(skill)?resolveTargets(state,actor,skill,intent):undefined;
    const payment=quoteSkillUse(state,actor,skill,{castRank:intent.castRank,modeId:intent.modeId,branchIds:selectedBranchIds,targetIds:supportTargets,supportElements:intent.supportElements});
    const soulPowerCost=payment.totals.soulPower;
    const availableSoulPower = controls.availableSoulPower(state,actor.id);
    const activationLock = avatarActivationLock(skill,state,actor);
    if (availableSoulPower < soulPowerCost + activationLock) throw new Error(`魂力不足：施放需要${soulPowerCost}并额外锁定${activationLock}，可用${availableSoulPower}`);
    try {
      for(const node of selectedBranches.flatMap(branch=>branch.nodes).filter(node=>node.effectId==='summon.entity')){
        validateFixedSummonSelection(state,actor,node.params,skill,intent.summonSkillIds);
        if(Object.hasOwn(node.params,'魂力分配'))summonSoulPowerAllocation(node.params,intent.summonSoulPower,availableSoulPower-soulPowerCost-activationLock);
      }
    } catch(error) {return {ready:false,reason:error.message,actorId,soulPowerCost,availableSoulPower,activationLock};}

    const amplifiedTypes=cleanList((skill.effectGraph.nodes??[]).flatMap(node=>['payload.damage','payload.residual','payload.drain','zone.hazard'].includes(node.effectId)?[foundation.canonicalDamageType(node.params.类型)]:node.effectId==='status.damage_over_time'?[foundation.canonicalDamageType(node.params.类型)]:node.effectId==='status.burn'?['火']:['status.poison','status.eternal_wound'].includes(node.effectId)?['毒蚀']:[]));
    const elementAmplifications=amplifiedTypes.map(type=>foundation.elementDamageProfile(state,actor.id,type)).filter(profile=>profile.percent>0);
    const branches = skillEffectBranches(skill);
    const branchPreviews = branches.map((branch,index) => {
      const branchSkill = skillForBranch(skill,branch);
      const branchIntent = intentForBranch(intent,branch,index,branches);
      return {branch,index,selected:selectedBranchIds.includes(branch.id),skill:branchSkill,intent:branchIntent,targeting:targetPreviewChoices(state,actor,branchSkill)};
    });
    const copyRequirements = branchPreviews.filter(item=>item.selected).flatMap(item => item.branch.nodes.filter(node => node.effectId === 'copy.skillset').map(node => ({node,skill:item.skill})));
    const copying = copyRequirements.length ? {sourceUnitId:String(intent.copySourceUnitId ?? intent.sourceUnitId ?? ''),choices:state.战斗.参与者ID列表.filter(id => id !== actorId).map(id => {
      const source = state.战斗单位.列表[id];
      try {
        const skills = copyRequirements.flatMap(item => copySkillCandidates(state,actor,actor,item.node,{copySourceUnitId:id},item.skill).candidates);
        return {id,name:source.名称,available:true,reason:'',skills:skills.map(skill => ({id:skill.id,name:skill.name ?? skill.名称}))};
      } catch (error) { return {id,name:source?.名称 ?? '魂师',available:false,reason:error.message,skills:[]}; }
    })} : null;
    const targeting = branchPreviews.find(item=>item.selected).targeting;
    const missingBranch = branchPreviews.find(item => {
      const requested = cleanList(item.intent.targetIds);
      const hasAimPoint = Number.isFinite(Number(item.intent.aimPoint?.x)) && Number.isFinite(Number(item.intent.aimPoint?.y));
      return item.selected&&((item.targeting.needsPrimaryTarget && !requested.length) || (item.targeting.needsAim && !hasAimPoint && !requested.length));
    });
    if (missingBranch) {
      return {
        ready: false,
        reason: `${missingBranch.branch.label}：${missingBranch.targeting.needsAim ? '需要在战场上选择落点或施放方向' : missingBranch.targeting.choices.length?'需要选择主目标':'当前没有可选目标，请查看目标旁的原因'}`,
        stateRevision: state.系统.revision,
        battleId: state.战斗.id,
        round: state.战斗.回合,
        actorId,
        skill: {
          id: skill.id,
          name: skill.name ?? skill.名称 ?? skill.id,
          ...skillSourcePresentation(state, skill),
          outputScale:baseRuntimeOutputScale(skill),
          elementAmplifications,
          effectBranches:branchPreviews.map(item=>({id:item.branch.id,label:item.branch.label,optional:item.branch.optional,targetPolicy:item.branch.targetPolicy,effectSpecs:item.branch.nodes.map(node=>[node.effectId,clone(node.params ?? {})])})),
          budget:clone(skill.budget ?? skill.扩展?.预算 ?? null)
        },
        soulPowerCost,
        payment,
        copying,
        castRank: castProfile.selectedRank,
        nativeCastRank: castProfile.nativeRank,
        currentCastRank:castProfile.selectedRank,castRelease:effects.soulRingCastRelease(skill),
        maximumCastRank: castProfile.maximumRank,
        upcastBonus: castProfile.upcastBonus,
        castOptions,
        availableSoulPower,
        targeting:{...targeting,branches:branchPreviews.map(item => ({branchId:item.branch.id,label:item.branch.label,optional:item.branch.optional,enabled:item.selected,targetPolicy:item.branch.targetPolicy,...item.targeting}))}
      };
    }

    const resolvedBranches = branchPreviews.filter(item=>item.selected).map(item => ({...item,targetIds:resolveTargets(state,actor,item.skill,item.intent)}));
    for (const item of resolvedBranches) for (const node of item.branch.nodes.filter(node=>node.effectId==='move.pursuit')) for (const targetId of item.targetIds) {
      const target=state.战斗单位.列表[targetId];
      const appliesMark=item.branch.nodes.slice(0,item.branch.nodes.indexOf(node)).some(effect=>effect.effectId==='status.mark');
      const marked=activeStatuses(state,targetId,'status.mark').some(status=>status.来源?.单位ID===actorId);
      const reason=combatDistance(actor,target)>Number(node.params.距离区??1)?'标记目标超过追击距离':node.params.需要自身标记&&!marked&&!appliesMark?'标记追击要求目标带有施术者自己的有效标记':'';
      if(reason)return {ready:false,reason,actorId,soulPowerCost,targeting};
    }
    for(const item of resolvedBranches)for(const node of item.branch.nodes.filter(n=>['move.teleport','move.pursuit'].includes(n.effectId)))for(const targetId of item.targetIds){
      if(node.effectId==='move.pursuit'){const target=state.战斗单位.列表[targetId],origin=unitPoint(actor),targetPoint=unitPoint(target);assertVoluntaryPosition(state,actor,actor.位置,{...actor.位置,距离区:target.位置.距离区,战场坐标:towardPoint(origin,targetPoint,Math.max(0,pointDistance(origin,targetPoint)-10))});}
      else if(targetId===actorId){const frame=clone(state);moveByEffect(frame,frame.战斗单位.列表[actorId],frame.战斗单位.列表[targetId],node,item.intent,'preview',{effects:[]},item.skill);}
    }
    for (const item of resolvedBranches) for (const node of item.branch.nodes.filter(node => node.effectId === 'copy.skillset')) for (const targetId of item.targetIds) {
      try { copySkillCandidates(state,actor,state.战斗单位.列表[targetId],node,item.intent,item.skill); }
      catch (error) { return {ready:false,reason:error.message,actorId,soulPowerCost,copying,
        targeting:{...targeting,branches:resolvedBranches.map(entry => ({branchId:entry.branch.id,label:entry.branch.label,optional:entry.branch.optional,targetPolicy:entry.branch.targetPolicy,...entry.targeting}))}}; }
    }
    const targetIds = cleanList(resolvedBranches.flatMap(item => item.targetIds));
    const deviceContext=globalThis.SoulDeviceOperations.castContext(state,actorId,skill,selectedBranches.flatMap(b=>b.nodes),targetIds.length===1?targetIds[0]:null,intent,state.战斗.id);
    quoteSkillUse(state,actor,skill,{castRank:intent.castRank,modeId:intent.modeId,branchIds:selectedBranchIds,targetIds,applicationOptions:{force:intent.force,permissionId:intent.permissionId}});
    const targets = targetIds.map(id => {
      const unit = state.战斗单位.列表[id];
      return {
        id,
        name: unit.名称 ?? id,
        faction: unit.阵营,
        sideId: sideIdOf(state, unit),
        life: {current: unit.资源.生命.当前, maximum: unit.资源.生命.最大},
        position: clone(unit.位置)
      };
    });
    const friendlyFireTargetIds = cleanList(resolvedBranches.flatMap(item => isBeneficialSkill(item.skill) ? [] : item.targetIds.filter(id => sideIdOf(state,state.战斗单位.列表[id]) === sideIdOf(state,actor))));
    const targetNode = skill.effectGraph.nodes.find(node => node.family === 'targeting');
    return {
      ready: true,deviceOperation:deviceContext?.quote??null,
      movement:movementReceipt.movement??null,
      approaches:resolvedBranches.flatMap(item=>item.branch.nodes.filter(node=>node.effectId==='move.approach').map(node=>({...approachPlan(state,actor,state.战斗单位.列表[item.targetIds[0]],node),branchId:item.branch.id}))),
      stateRevision: state.系统.revision,
      battleId: state.战斗.id,
      round: state.战斗.回合,
      actorId,
      skill: {
        id: skill.id,
        name: skill.name ?? skill.名称 ?? skill.id,
        ...skillSourcePresentation(state, skill),
        outputScale:baseRuntimeOutputScale(skill),
          elementAmplifications,
        effectBranches:resolvedBranches.map(item=>({id:item.branch.id,label:item.branch.label,optional:item.branch.optional,targetPolicy:item.branch.targetPolicy,effectSpecs:item.branch.nodes.map(node=>[node.effectId,clone(node.params ?? {})])})),
        budget:clone(skill.budget ?? skill.扩展?.预算 ?? null)
      },
      soulPowerCost,
      payment,
      copying,
      creationOptions,
      creationQuotes,
      castRank: castProfile.selectedRank,
      nativeCastRank: castProfile.nativeRank,
      maximumCastRank: castProfile.maximumRank,
      upcastBonus: castProfile.upcastBonus,
      currentCastRank:castProfile.selectedRank,castRelease:effects.soulRingCastRelease(skill),
      castOptions,
      activationLock,
      availableSoulPower,
      targeting: {
        ...targeting,
        effectId: targetNode?.effectId ?? '',
        factionRule: targetNode?.params?.阵营规则 ?? '自动',
        selectionMode: targetNode?.params?.选择模式 ?? '主目标',
        branches:branchPreviews.map(item => ({branchId:item.branch.id,label:item.branch.label,optional:item.branch.optional,enabled:item.selected,targetPolicy:item.branch.targetPolicy,targetIds:resolvedBranches.find(v=>v.branch.id===item.branch.id)?.targetIds??[],...item.targeting}))
      },
      primaryTargetId: cleanList(intent.targetIds)[0] ?? '',
      aimPoint: battlePoint(intent.aimPoint, cleanList(intent.targetIds)[0] ? unitPoint(state.战斗单位.列表[cleanList(intent.targetIds)[0]]) : unitPoint(actor)),
      targetIds,
      branchTargets:Object.fromEntries(resolvedBranches.map(item => [item.branch.id,{targetIds:item.targetIds,aimPoint:item.intent.aimPoint ?? null}])),
      targets,
      friendlyFireTargetIds,
      warning: friendlyFireTargetIds.length ? '该技能会波及己方单位' : ''
    };
  }

  function rollD20(rng, advantage, disadvantage) {
    const first = rng.die(20);
    if (advantage === disadvantage) return {die: first, rolls: [first], mode: 'normal'};
    const second = rng.die(20);
    return advantage
      ? {die: Math.max(first, second), rolls: [first, second], mode: 'advantage'}
      : {die: Math.min(first, second), rolls: [first, second], mode: 'disadvantage'};
  }

  function hitRuleSource(state, unitId, kind, skill = null) {
    const choices=activeStatuses(state,unitId,'status.'+kind).filter(status=>Number(status.扩展?.剩余次数)>0).map(status=>({kind:'status',effectId:status.模板ID,statusId:status.id,sourceUnitId:status.来源?.单位ID,sourceSkillId:status.来源?.技能ID,name:state.技能?.列表?.[status.来源?.技能ID]?.name??effects.EFFECT_REGISTRY[status.模板ID].displayName,params:clone(status.快照?.参数??{}),remainingBefore:status.扩展.剩余次数,_status:status}));
    for(const node of skill?.effectGraph?.nodes??[])if(effects.EFFECT_REGISTRY[node.effectId]?.hitRule?.inline&&effects.EFFECT_REGISTRY[node.effectId].hitRule.kind===kind)choices.push({kind:'skill',effectId:node.effectId,nodeId:node.id,sourceUnitId:unitId,sourceSkillId:skill.id,name:skill.name??node.effectId,params:clone(node.params)});
    return choices.sort((a,b)=>Number(b.params.等级??1)-Number(a.params.等级??1)||Number(b.params.擦伤比例??0)-Number(a.params.擦伤比例??0)||(a.kind==='skill'?-1:0)-(b.kind==='skill'?-1:0)||String(a.statusId??a.nodeId).localeCompare(String(b.statusId??b.nodeId)))[0]??null;
  }
  function hitRuleView(state,actor,target,skill){
    const attacking=['hit_advantage','hit_reroll','sure_hit','critical_guarantee','miss_graze'];
    return {...Object.fromEntries(attacking.map(kind=>[kind,hitRuleSource(state,actor.id,kind,skill)])),hit_disadvantage:hitRuleSource(state,actor.id,'hit_disadvantage'),evasion_reroll:hitRuleSource(state,target.id,'evasion_reroll'),absolute_evasion:hitRuleSource(state,target.id,'absolute_evasion'),critical_guard:hitRuleSource(state,target.id,'critical_guard')};
  }
  function publicHitSource(source){if(!source)return null;const {_status,...view}=source;return clone(view);}
  function consumeHitRuleSources(state,sources=[]){
    for(const source of sources.filter(s=>s.kind==='status')){
      const status=state.状态实例.列表[source.statusId];
      if(!status||status.状态!=='生效'||Number(status.扩展?.剩余次数)!==source.remainingBefore)throw Error('命中干涉的剩余次数已变化');
      status.扩展.剩余次数=source.remainingAfter;
      if(!source.remainingAfter)removeStatus(state,status,'consumed');
    }
  }
  function resolveHitCheck(state,actor,target,skill,rng,modifier,defense,baseAdvantage,baseDisadvantage,options={}){
    const view=options.ignoreHitRules?{}:hitRuleView(state,actor,target,skill),used=new Map(),attempts=[];
    const use=source=>{if(source)used.set(source.statusId??source.nodeId,source);};
    const hitLevel=Number(view.sure_hit?.params.等级??0),evasionLevel=Number(view.absolute_evasion?.params.等级??0);
    const resolution=hitLevel>evasionLevel?'sure-hit':evasionLevel>hitLevel?'absolute-evasion':hitLevel?'cancelled':'ordinary';
    const advantage=baseAdvantage||!!view.hit_advantage,disadvantage=baseDisadvantage||!!view.hit_disadvantage;
    let selected=null,hit=false,critical=false;
    if(hitLevel||evasionLevel){use(view.sure_hit);use(view.absolute_evasion);}
    const roll=reason=>{const result=rollD20(rng,advantage,disadvantage),hit=result.die===20||(result.die!==1&&result.die+modifier>=defense);const a={reason,...result,total:result.die+modifier,hit,natural20:result.die===20,natural1:result.die===1};attempts.push(a);return a;};
    if(resolution==='sure-hit')hit=true;
    else if(resolution!=='absolute-evasion'){
      if(!baseAdvantage)use(view.hit_advantage);if(!baseDisadvantage)use(view.hit_disadvantage);
      selected=roll('initial');
      if(!selected.hit&&view.hit_reroll){use(view.hit_reroll);selected=roll('attack-reroll');}
      if(selected.hit&&view.evasion_reroll){use(view.evasion_reroll);selected=roll('evasion-reroll');}
      hit=selected.hit;critical=selected.natural20;
    }
    const naturalCritical=critical,canCrit=(skill?.effectGraph?.nodes??[]).some(n=>['payload.damage','payload.drain','payload.resource_damage'].includes(n.effectId)&&Number(n.params?.骰数??1)>0);
    let guaranteed=false,suppressed=false;
    if(hit&&canCrit){
      if(!critical&&view.critical_guarantee){use(view.critical_guarantee);critical=true;guaranteed=true;}
      if(critical&&view.critical_guard){use(view.critical_guard);critical=false;suppressed=true;}
    }else critical=false;
    const graze=!hit&&resolution!=='absolute-evasion'&&view.miss_graze&&(skill?.effectGraph?.nodes??[]).some(n=>n.effectId==='payload.damage')?Number(view.miss_graze.params.擦伤比例??25):0;
    if(graze)use(view.miss_graze);
    const sources=[...used.values()].map(source=>{
      const result=publicHitSource(source);
      if(source._status)result.remainingAfter=Math.max(0,source.remainingBefore-1);
      return result;
    });
    if(!options.preview)consumeHitRuleSources(state,sources);
    const special=Object.values(view).some(Boolean);
    return {die:selected?.die??null,rolls:selected?.rolls??[],mode:selected?.mode??'forced',total:selected?.total??null,hit,natural20:selected?.natural20??false,natural1:selected?.natural1??false,critical,
      ...(special?{interference:{version:1,hitLevel,evasionLevel,resolution,attempts,sources,critical:{natural:naturalCritical,guaranteed,suppressed,final:critical},grazePercent:graze}}:{})};
  }

  function realmSourceEligible(skill) {
    const contract = skill?._sourceContract ?? skill;
    const source = mechanics.original(contract) ?? contract;
    if (!source) return false;
    const kind = source?.sourceKind ?? source?.source?.kind ?? '';
    if (['soul-device','consumable','hidden-weapon','restraint','scene'].includes(kind)) return false;
    if (source.sourceItemId) return kind === 'soul-bone';
    return ['ordinary','martial-base','martial-skill','soul-ring','soul-bone','native-origin','beast'].includes(kind)
      || ['ordinary.attack','martial.base'].includes(source.id) || source.类型 === '魂技'
      || Boolean(source.sourceMartialSoulId || source.来源武魂ID || source.sourceRingId || source.来源魂环ID);
  }

  function skillCheckDC(state, actor, skill) {
    const realm = foundation.combatRealm(actor).bonus;
    const avatar=activeMartialAvatar(state,actor.id),bonus=avatar&&skillMartialSoulId(skill)===avatar.来源?.武魂ID?Number(avatar.快照?.参数?.同源难度加值??0):0;
    return foundation.battleAttributeView(state,actor).derived.魂技DC - (realmSourceEligible(skill) ? 0 : realm)+bonus+support.stat(state,actor.id,'魂技DC',skill)-support.stat(state,actor.id,'魂技DC');
  }

  function damageRealmProfile(state, actor, target, skill, resolved = false) {
    if (resolved) return {attackerQuality:1,targetQuality:1,multiplier:1};
    const attackerQuality = actor && realmSourceEligible(skill) ? foundation.combatRealm(actor).quality : 1;
    const targetQuality = foundation.combatRealm(target).quality;
    return {attackerQuality,targetQuality,multiplier:Math.sqrt(attackerQuality / targetQuality)};
  }

  function rollCheck(state, actor, target, checkNode, rng, receiptTarget, skill, options = {}) {
    if (!checkNode) return {affected: true, critical: false};
    const ownPayloads=(skill?.effectGraph?.nodes??[]).filter(n=>!['release','targeting','check','sustain'].includes(effects.EFFECT_REGISTRY[n.effectId]?.family));
    if(actor.id===target.id&&ownPayloads.length&&ownPayloads.every(n=>effects.EFFECT_REGISTRY[n.effectId]?.selfApplication==='voluntary')){receiptTarget.check={type:'automatic-self',accepted:true,reason:'本人主动施用自愿外观效果'};return {affected:true,critical:false};}
    if (isBeneficialSkill(skill) && sameSide(state,actor,target)) {
      receiptTarget.check = {type:'automatic-beneficial',accepted:true,reason:'同阵营纯增益不进行命中或豁免'};
      return {affected:true,critical:false};
    }
    if (checkNode.effectId === 'check.physical_attack' || checkNode.effectId === 'check.soul_attack') {
      const soul = checkNode.effectId === 'check.soul_attack';
      const advantage = activeStatuses(state, actor.id, 'status.invisibility').length > 0;
      const martialModifiers=actor.扩展?.武魂战斗修正??{};
      const obscured = activeZones(state, 'obscure').some(zone => zoneContains(zone, actor) || zoneContains(zone, target));
      const disadvantage = obscured || activeStatuses(state, actor.id, 'status.blind').length > 0 ||
        activeStatuses(state, actor.id, 'status.fear').length > 0 || activeStatuses(state, target.id, 'status.invisibility').length > 0;
      const attackBuff = attackStatusModifier(state, actor.id, skill);
      const basicAccuracy = (skill?.id === 'martial.base' || (actor.单位种类 === '魂兽' && isOrdinaryAttack(skill))) ? Number(actor.扩展?.武魂战斗修正?.基础动作命中 ?? 0) : 0;
      const skillAccuracy = Number(checkNode.params?.命中加值 ?? 0);
      const trained=Number(martialModifiers.检定加值?.[soul?'魂技攻击':'物理攻击']??0);
      const mastery=skillMasteryBonus(actor,skill);
      const currentAvatar=activeMartialAvatar(state,actor.id);
      const avatarAccuracy = Math.max(martialAvatarBonus(state, actor, skill, '基础动作增幅'), martialAvatarBonus(state, actor, skill, '同源魂技增幅'))+(soul&&currentAvatar&&skillMartialSoulId(skill)===currentAvatar.来源?.武魂ID?Number(currentAvatar.快照?.参数?.同源命中加值??0):0);
      const damaged=actor.资源.生命.当前*2<actor.资源.生命.最大?Number(martialModifiers.破损攻击减值??0):0;
      const ownRealm = foundation.combatRealm(actor).bonus;
      const realmAccuracy = realmSourceEligible(skill) ? ownRealm : 0;
      const baseAccuracy = soul
        ? foundation.battleAttributeView(state,actor).derived.魂技命中 - ownRealm + realmAccuracy
        : Math.round(actor.派生.熟练加值 + attributeModifier(state, actor, physicalAttackAttribute(skill)) + realmAccuracy);
      const equipmentAccuracy=(isOrdinaryAttack(skill)||skill?.id==='martial.base')?Number(actor.扩展?.装备战斗修正?.普通攻击命中??0):
        !skill.sourceItemId&&(skill.类型==='魂技'||skill.sourceKind==='soul-ring'||skill.来源魂环ID)?Number(actor.扩展?.装备战斗修正?.魂技攻击命中??0):0;
      const desirePenalty=globalThis.SoulAbilityExchange?.activeCheckPenalty(state,actor.id,'attack')??0;
      const intimatePenalty=-(globalThis.SoulIntimateCore?.wornEffects?.(state,actor.id)?.aimPenalty??0);
      const physiology=globalThis.SoulIntimateCore?.read?.(state,actor.id);
      const refractoryPenalty=physiology&&physiology.不应期至!==null&&battleNow(state)<physiology.不应期至?-2:0;
      const limited=mechanics.checkModifier(activeStatuses(state,actor.id),soul?'魂力攻击':'物理攻击',!options.preview);
      if(!options.preview)for(const item of limited.sources){const s=state.状态实例.列表[item.statusId];if(s?.扩展.剩余次数<=0)removeStatus(state,s,'consumed');}
      const modifier = limited.total+desirePenalty+intimatePenalty+refractoryPenalty+baseAccuracy + attackBuff + basicAccuracy + skillAccuracy + trained + mastery + avatarAccuracy + equipmentAccuracy - damaged;
      const armorPenetration = soul ? 0 : clamp(checkNode.params?.护甲穿透 ?? 0, 0, 3);
      const armorBreak = soul ? 0 : Math.max(0, ...activeStatuses(state, target.id, 'status.armor_break').map(status => Number(status.强度 ?? status.快照?.参数?.数值 ?? 0)));
      const defense = effectiveDefense(state, target, soul ? '魂技' : '物理', armorPenetration)+mentalProtection(state,target,skill);
      const release=skill?.effectGraph?.nodes?.find(n=>n.family==='release');
      const blocked=wallOnPath(state,actor.位置,target.位置,release?.effectId==='release.projectile'?'投射':'移动');
      const result=resolveHitCheck(state,actor,target,skill,rng,modifier,defense,advantage,disadvantage,{...options,ignoreHitRules:!!blocked});
      receiptTarget.check = {type: 'attack', ...result, modifier, defenseType:soul?'魂技':'物理',
        modifierSources:[['基础命中',baseAccuracy],['攻击增益',attackBuff],['武魂本能',basicAccuracy],['技能加值',skillAccuracy],['武魂特性',trained],['熟练掌握',mastery],['武魂真身',avatarAccuracy],['装备命中',equipmentAccuracy],['破损惩罚',-damaged],['欲火惩罚',desirePenalty],['情具干扰',intimatePenalty],['不应期',refractoryPenalty]].filter(([,value])=>value!==0).map(([name,value])=>({name,value})),
        ...(limited.sources.length?{limitedCheckSources:limited.sources}:{}),...(equipmentAccuracy?{equipmentAccuracy}:{}), avatarAccuracy, defense, armorBreak, armorPenetration, resistancePenetration: 0};
      return {affected:result.hit,critical:result.critical};
    }
    if (checkNode.effectId === 'check.save') {
      const attribute = checkNode.params.属性;
      const statusNodes = skill?.effectGraph?.nodes?.filter(node => node.family === 'status') ?? [];
      const advantage = statusResistant(state, target, statusNodes) || cleanList(target.扩展?.武魂战斗修正?.豁免优势).includes(attribute);
      const disadvantage = activeStatuses(state, target.id, 'status.slow').length > 0 && attribute === '身法';
      const roll = rollD20(rng, advantage, disadvantage);
      const die = roll.die;
      const saveBuff = strongestStatusValue(state, target.id, 'status.buff', '属性', '豁免检定');
      const limited=mechanics.checkModifier(activeStatuses(state,target.id),'豁免',!options.preview);
      if(!options.preview)for(const item of limited.sources){const status=state.状态实例.列表[item.statusId];if(status?.扩展.剩余次数<=0)removeStatus(state,status,'consumed');}
      const realmResistance = foundation.combatRealm(target).bonus;
      const modifier = attributeModifier(state, target, attribute) + target.派生.熟练加值 + realmResistance + saveBuff+mentalProtection(state,target,skill)+limited.total;
      const dc = (skill?._releasedMedicineDC??(skillCheckDC(state,actor,skill)+Number(actor.扩展?.武魂战斗修正?.检定加值?.魂技DC??0)+skillMasteryBonus(actor,skill))) + Number(checkNode.params?.难度加值 ?? 0)+globalThis.SoulAbilityExchange.controlBonus(state,actor.id,skill??{});
      const total = die + modifier;
      const saved = die === 20 || (die !== 1 && total >= dc);
      receiptTarget.check = {type: 'save', attribute, die, rolls: roll.rolls, mode: roll.mode, modifier,
        modifierSources:[{name:`${attribute}调整值`,value:attributeModifier(state,target,attribute)},{name:'熟练加值',value:target.派生.熟练加值},...(realmResistance?[{name:'境界抵抗',value:realmResistance}]:[]),{name:'豁免增益',value:saveBuff}],
        ...(limited.sources.length?{limitedCheckSources:limited.sources}:{}),total, dc, saved, successEffect: checkNode.params.成功效果 ?? '无', natural20: die === 20, natural1: die === 1};
      const guardSources=statusNodes.flatMap(node=>matchingStatusGuards(state,target,node,'抗性'));
      if(guardSources.length)receiptTarget.check.statusGuardSources=guardSources;
      return {affected: !saved, critical: false};
    }
    return {affected: true, critical: false};
  }

  function skillRingOrdinal(state, skill) {
    const ring = state.魂环?.列表?.[skillRingId(skill)];
    return Math.max(0, Number(ring?.序号 ?? skill?.ringOrdinal ?? skill?.扩展?.ringOrdinal ?? 0));
  }
  function attackTier(state,skill){
    if(!skill)return 9;
    if(isOrdinaryAttack(skill)||skill.id==='martial.base')return 0;
    const ordinal=skillRingOrdinal(state,skill);if(ordinal)return ordinal;
    return ({十年:1,百年:2,千年:4,万年:7,十万年:9,百万年:9})[skill.ageTier]??9;
  }

  function resolveResistance(state, target, damageType, rawAmount, penetration = 0, context = {}) {
    const source = context.skill ?? context.exchangeAbility ?? state.技能?.列表?.[context.exchangeSource?.技能ID];
    const actor = context.actor ?? state.战斗单位?.列表?.[context.sourceUnitId];
    const realm = damageRealmProfile(state,actor,target,source,context.realmAlreadyResolved === true);
    const scaled = realm.multiplier === 1 ? rawAmount : Math.max(0,Math.floor(rawAmount * realm.multiplier));
    const result = resolveResistanceBase(state,target,damageType,scaled,penetration,context);
    const summon=target.扩展?.召唤,sourceSkill=summon&&state.技能?.列表?.[summon.来源技能ID],created=summon&&Object.values(state.战斗?.扩展?.已结算行动??{}).find(r=>r.id===summon.来源结算单ID);
    const evidence=created?.actorId===summon?.来源单位ID&&created?.skill?.id===sourceSkill?.id&&created?.targets?.some(t=>t.effects?.some(e=>e.effectId==='summon.entity'&&e.nodeId===summon.来源效果ID&&e.summonedUnitIds?.includes(target.id)));
    const sourceNode=evidence&&sourceSkill.effectGraph.nodes.find(n=>n.effectId==='summon.entity'&&n.id===summon.来源效果ID),reduction=context.directArea?Number(sourceNode?.params?.范围减伤百分比??0):0;
    const reduced=reduction&&result.finalAmount>0?{...result,finalAmount:Math.floor(result.finalAmount*(1-reduction/100)),multiplier:result.multiplier*(1-reduction/100),areaReduction:{sourceSkillId:sourceSkill.id,sourceUnitId:summon.来源单位ID,percent:reduction,amountBefore:result.finalAmount}}:result;
    return realm.multiplier === 1 ? reduced : {...reduced,realm,amountBeforeRealm:rawAmount};
  }

  function resolveResistanceBase(state, target, damageType, rawAmount, penetration = 0, context = {}) {
    const type = foundation.canonicalDamageType(damageType);
    if(context.exchangeSource){const source=context.exchangeAbility??state.技能.列表[context.exchangeSource.技能ID];if(source)rawAmount=Math.round(rawAmount*globalThis.SoulAbilityExchange.sourceScale(state,context.exchangeSource.单位ID,source));}
    const outputOwner=context.actor?.id??context.sourceUnitId;
    if(outputOwner)rawAmount=controls.limitedDamage(state,outputOwner,rawAmount,context.outputPermission??context.skill?._outputPermission,context.skill?._damageRemainders,`${outputOwner}:${target.id}:${type}`);
    rawAmount=Math.max(0,Math.ceil(rawAmount*(1-support.percent(state,target.id,'reduction')/100)));
    const defenseEvidence = foundation.defenseSources(state,target).filter(source => source.effectId === 'status.resistance_shift' && foundation.resistanceMatches([source.params.类型],type));
    if(rawAmount===0&&outputOwner&&Math.min(controls.outputSnapshot(state,outputOwner).percent,(context.outputPermission??context.skill?._outputPermission)?.percent??100)<100)return {type,sources:defenseEvidence,rawAmount:0,finalAmount:0,mode:'正常',penetration,multiplier:1,absorbed:0};
    const modes = defenseEvidence.map(source => source.params.模式);
    const invulnerable = activeStatuses(state, target.id, 'status.invulnerable')
      .find(status => {
        if (Number(context.invulnerabilityUses?.get(status.id)??status.扩展?.剩余次数??0) <= 0) return false;
        const params = status.快照?.参数 ?? {};
        const maxOrdinal = Number(params.最大攻击魂技序号 ?? 0);
        const maxLevel = Number(params.最大攻击者等级 ?? 0);
        if (maxOrdinal > 0 && attackTier(state,context.skill??context.exchangeAbility)>maxOrdinal&&!(params.高阶抵挡次数&&Number(context.invulnerabilityUses?.get(status.id+':high')??status.扩展?.剩余高阶次数??params.高阶抵挡次数)>0)) return false;
        if (maxLevel > 0 && (!context.actor || Number(context.actor.派生?.有效等级 ?? 0) > maxLevel)) return false;
        return true;
      });
    if (invulnerable) {
      const params=invulnerable.快照.参数;
      if(params.持续方式==='来源下回合')return {type,sources:defenseEvidence,rawAmount,finalAmount:0,mode:'无敌',penetration,multiplier:0,absorbed:0};
      if(params.高阶抵挡次数){
        const high=attackTier(state,context.skill??context.exchangeAbility)>params.最大攻击魂技序号;
        if(high&&context.invulnerabilityUses)context.invulnerabilityUses.set(invulnerable.id+':high',Number(context.invulnerabilityUses.get(invulnerable.id+':high')??invulnerable.扩展?.剩余高阶次数??params.高阶抵挡次数)-1);
        if(context.consumeInvulnerability!==false){
          if(high)invulnerable.扩展.剩余高阶次数=Number(invulnerable.扩展.剩余高阶次数??params.高阶抵挡次数)-1;
          else if(params.低阶转盾百分比){
            const offered=Math.min(Math.floor(target.资源.生命.最大*params.护盾上限百分比/100),target.资源.生命.临时+Math.floor(rawAmount*params.低阶转盾百分比/100));
            foundation.grantTemporaryHealth(target,offered,invulnerable.来源.结算单ID);
          }
        }
        return {type,sources:defenseEvidence,rawAmount,finalAmount:0,mode:'无敌',penetration,multiplier:0,absorbed:0};
      }
      if(context.invulnerabilityUses)context.invulnerabilityUses.set(invulnerable.id,Number(context.invulnerabilityUses.get(invulnerable.id)??invulnerable.扩展.剩余次数)-1);
      if (context.consumeInvulnerability !== false) {
        invulnerable.扩展.剩余次数 -= 1;
        if (invulnerable.扩展.剩余次数 <= 0) removeStatus(state,invulnerable,'consumed');
      }
      return {type, sources:defenseEvidence, rawAmount, finalAmount: 0, mode: '无敌', penetration, multiplier: 0, absorbed: 0};
    }
    const absorbed = modes.includes('吸收');
    const immune = modes.includes('免疫');
    let resistant = modes.includes('抗性');
    const vulnerable = modes.includes('易伤');
    if (resistant && penetration >= 1) resistant = false;
    if (absorbed) return {type, sources:defenseEvidence, rawAmount, finalAmount: 0, mode: '吸收', penetration, multiplier: 0, absorbed: rawAmount};
    if (immune) return {type, sources:defenseEvidence, rawAmount, finalAmount: 0, mode: '免疫', penetration, multiplier: 0, absorbed: 0};
    if (resistant && vulnerable) return {type, sources:defenseEvidence, rawAmount, finalAmount: rawAmount, mode: '抗性与易伤抵消', penetration, multiplier: 1, absorbed: 0};
    if (resistant) {
      const reduction=Math.max(0,...defenseEvidence.filter(s=>s.params.模式==='抗性').map(s=>Number(s.params.减免百分比??50)));
      const multiplier=1-(reduction||50)/100;
      return {type,sources:defenseEvidence,rawAmount,finalAmount:Math.floor(rawAmount*multiplier),mode:'抗性',penetration,multiplier,absorbed:0};
    }
    if (vulnerable) return {type, sources:defenseEvidence, rawAmount, finalAmount: rawAmount * 2, mode: '易伤', penetration, multiplier: 2, absorbed: 0};
    return {type, sources:defenseEvidence, rawAmount, finalAmount: rawAmount, mode: penetration > 0 ? '穿透后正常' : '正常', penetration, multiplier: 1, absorbed: 0};
  }

  function applyResolvedDamage(state, target, resolution, context = {}) {
    if (resolution.absorbed > 0) {
      const shield = foundation.grantTemporaryHealth(target, resolution.absorbed);
      return {
        shieldUsed: 0, hpDamage: 0, absorbedAsShield: shield.gained,
        shieldOffered: shield.offered, temporaryHpBefore: shield.before, temporaryHp: shield.after, shieldUnused: shield.unused
      };
    }
    const incoming = Math.max(0, round(resolution.finalAmount));
    const group=context.damageGroup??{};
    const allowance=Math.max(0,Number(target.扩展?.装备战斗修正?.固定减伤??0)-Number(group.equipmentReductionUsed??0));
    const equipmentReduction=Math.min(incoming,allowance);
    if(equipmentReduction)group.equipmentReductionUsed=Number(group.equipmentReductionUsed??0)+equipmentReduction;
    const amount=incoming-equipmentReduction;
    const shieldUsed = Math.min(target.资源.生命.临时, amount);
    target.资源.生命.临时 -= shieldUsed;
    const requestedHpDamage = Math.max(0, amount - shieldUsed);
    const source = context.actor ?? state.战斗单位.列表[String(context.sourceUnitId ?? '')];
    const nonlethal = source?.扩展?.非致命伤害 === true && target.单位种类 === '魂兽' && target.资源.生命.当前 > 0;
    const hpDamage = nonlethal
      ? Math.min(requestedHpDamage, Math.max(0, target.资源.生命.当前 - 1))
      : requestedHpDamage;
    const hpBefore = target.资源.生命.当前;
    target.资源.生命.当前 = Math.max(0, hpBefore - hpDamage);
    if (hpDamage > 0) {
      for (const sleep of activeStatuses(state, target.id, 'status.sleep')) removeStatus(state,sleep,'damaged');
    }
    if (target.资源.生命.当前 === 0) {
      target.存活状态 = state.人物?.列表?.[target.id] || state.战斗.扩展?.规则?.nonlethal ? '昏迷' : '死亡';
      if(state.人物?.列表?.[target.id]&&context.worldPoison&&hpBefore===0&&hpDamage>0)people.die(state,target.id,'持续毒伤致死',context.sourceId);
      else if(!context.fieldDamage&&state.人物?.列表?.[target.id]&&state.战斗.状态==='进行中'&&state.战斗.扩展?.battleKind==='lethal'&&state.战斗.扩展?.规则?.fatalOnDefeat)people.die(state,target.id,'登记死斗的致死规则',state.战斗.id);
      if (hpBefore > 0 && context.damageType) {
        target.扩展 ??= {};
        target.扩展.致死伤害类型 = cleanList([...(target.扩展.致死伤害类型 ?? []), foundation.canonicalDamageType(context.damageType)]);
      }
    }
    return {
      shieldUsed, hpDamage, ...(equipmentReduction?{equipmentReduction}:{}), absorbedAsShield: 0,
      nonlethalPrevented: Math.max(0, requestedHpDamage - hpDamage),
      nonlethal: nonlethal && requestedHpDamage > hpDamage
    };
  }

  function resolveSourceDamage(state,{actorId,targetId,damageType,rawAmount,sourceId}){
    const actor=state.战斗单位.列表[actorId],target=state.战斗单位.列表[targetId];
    if(!actor||!target||!sourceId||!Number.isSafeInteger(rawAmount)||rawAmount<1)throw Error('伤害来源、对象或强度无效');
    const before={health:clone(target.资源.生命),lifeState:target.存活状态},resolution=resolveResistance(state,target,damageType,rawAmount,0,{actor,consumeInvulnerability:true});
    const applied=applyResolvedDamage(state,target,resolution,{actor,damageType,sourceId,fieldDamage:true});
    return {sourceId,actorId,targetId,damageType,rawAmount,resolution:clone(resolution),applied:clone(applied),before,after:{health:clone(target.资源.生命),lifeState:target.存活状态}};
  }
  function creditedKillerId(state, sourceUnitId) {
    let currentId = String(sourceUnitId ?? '');
    const seen = new Set();
    while (currentId && !seen.has(currentId)) {
      seen.add(currentId);
      const unit = state.战斗单位.列表[currentId];
      if (!unit) return '';
      const summonerId = String(globalThis.SoulCombatDeployments.sourceContext(state,currentId)?.creditOwnerId??unit.扩展?.召唤?.来源单位ID??'');
      if (!summonerId || summonerId===currentId || !state.战斗单位.列表[summonerId]) return currentId;
      currentId = summonerId;
    }
    return '';
  }

  function recordKill(state, targetId, sourceUnitId, receipt, source = {}) {
    const target = state.战斗单位.列表[targetId];
    if (!target || target.存活状态 !== '死亡') return null;
    const killerId = creditedKillerId(state, sourceUnitId);
    if (!killerId || killerId === targetId) return null;
    const records = state.战斗.扩展.击杀记录;
    const existing = records.find(record => record.targetId === targetId);
    if (existing) return existing;
    const record = {
      targetId,
      killerId,
      directSourceUnitId: String(sourceUnitId ?? ''),
      receiptId: receipt.id,
      round: receipt.round,
      sourceType: source.type ?? 'direct',
      sourceId: source.id ?? '',
      sourceSkillId: source.skillId ?? ''
    };
    records.push(record);
    const killer=state.战斗单位.列表[killerId];
    const recoveryRatio=Number(killer?.扩展?.武魂战斗修正?.击杀回魂比例??0);
    const triggerKey=`${killerId}:kill-soul-recovery`;
    state.战斗.扩展.武魂触发??={};
    if(recoveryRatio>0&&!state.战斗.扩展.武魂触发[triggerKey]){
      const before=(globalThis.SoulCombatDeployments.soulPowerResource(state,killer.id)).当前;
      const requested=Math.max(1,Math.ceil((globalThis.SoulCombatDeployments.soulPowerResource(state,killer.id)).最大*recoveryRatio));
      (globalThis.SoulCombatDeployments.soulPowerResource(state,killer.id)).当前=Math.min((globalThis.SoulCombatDeployments.soulPowerResource(state,killer.id)).最大,before+requested);
      const restored=(globalThis.SoulCombatDeployments.soulPowerResource(state,killer.id)).当前-before;
      state.战斗.扩展.武魂触发[triggerKey]={round:receipt.round,targetId,restored};
      receipt.traitEvents??=[];
      receipt.traitEvents.push({sourceId:'trait.kill-recovery',unitId:killerId,targetId,trigger:'首次击杀',requested,restored,soulPowerBefore:before,remainingSoulPower:(globalThis.SoulCombatDeployments.soulPowerResource(state,killer.id)).当前});
    }
    return record;
  }

  // Both settlement and AI read these modifiers; estimation never consumes a status or a roll.
  function damageModifiers(state, actor, node, skill) {
    const residual = node.effectId === 'payload.residual';
    const damageType = foundation.canonicalDamageType(node.params?.类型);
    const soulModifiers = actor.扩展?.武魂战斗修正 ?? {};
    const martialSoulBonus = ((skill?.id === 'martial.base' || (actor.单位种类 === '魂兽' && isOrdinaryAttack(skill)))
      ? Number(soulModifiers.基础动作威力 ?? 0)
      : isOrdinaryAttack(skill)
        ? 0
        : ['soul-device', 'soul-bone', 'hidden-weapon', 'consumable'].includes(skill?.sourceKind)
          ? 0
           : Number(soulModifiers.魂技威力 ?? 0)) + ((isOrdinaryAttack(skill)||skill?.id==='martial.base')?Number(actor.扩展?.装备战斗修正?.普通攻击伤害??0):0);
    const avatarOutputBonus = residual ? 0 : Math.max(martialAvatarBonus(state, actor, skill, '基础动作增幅'), martialAvatarBonus(state, actor, skill, '同源魂技增幅')) * 2;
    const scalingAttribute = foundation.damageTypeFamily(damageType) === '物理' ? physicalAttackAttribute(skill) : '';
    const scaling = residual ? 0 : abilityBonus(state, actor, scalingAttribute, damageType) + martialSoulBonus;
    const avatar=activeMartialAvatar(state,actor.id);
    const sameSoul=avatar&&skillMartialSoulId(skill)===avatar.来源?.武魂ID;
    const outputScale = baseRuntimeOutputScale(skill)*(sameSoul?1+Number(avatar.快照?.参数?.同源伤害增幅百分比??0)/100:1);
    const deliveryScale = residual ? 1 : foundation.damageTypeFamily(damageType) === '物理'
      ? (physicalAttackAttribute(skill) === '身法' ? 0.97 : 1.03)
      : 1;
    const damageBuff = residual ? 0 : damageStatusBonus(state, actor);
    return {damageType,scaling,avatarOutputBonus,outputScale,deliveryScale,damageBuff};
  }

  function detonationStatuses(state,actor,target,params){
    const effect=params.引爆状态==='灼烧'?'status.burn':params.引爆状态==='中毒'?'status.poison':'';if(!effect)return [];
    return activeStatuses(state,target.id,effect).filter(status=>{const origin=status.扩展?.持续来源合同?.扩展?.copyOrigin?.spec;return status.来源?.单位ID===actor.id||params.状态来源==='自身与所属召唤'&&(state.战斗单位.列表[status.来源?.单位ID]?.扩展?.召唤?.来源单位ID===actor.id||origin?.kind==='summoned-copy'&&origin.sourceUnitId===actor.id&&origin.ownerId===status.来源?.单位ID);}).sort((a,b)=>statusDamageValue(state,b)-statusDamageValue(state,a)||a.id.localeCompare(b.id));
  }
  function statusDamageValue(state,status){const p=status.快照?.参数??{},base=Number(p.骰数??1)*(Number(p.骰面??4)+1)/2+Number(p.加值??0);return foundation.amplifyElementDamage(periodicOutputAmount(state,status,base),status.快照?.属性增伤).amount;}
  function bonusDiceActive(state,target,params){
    if(params.加骰条件==='生命比例')return target.资源.生命.当前*100<=target.资源.生命.最大*params.生命阈值;
    if(params.加骰条件==='减速或束缚')return activeStatuses(state,target.id,'status.slow').length>0||activeStatuses(state,target.id,'status.bind').length>0;
    return false;
  }
  function applyDamage(state, actor, target, node, rng, critical, targetReceipt, skill = null) {
    const params = node.params;
    let detonation=null;
    if(params.引爆状态){const status=detonationStatuses(state,actor,target,params)[0];if(!status)return;detonation={condition:params.引爆状态,statusId:status.id,sourceUnitId:status.来源.单位ID,consumed:!!params.消耗状态};if(params.消耗状态)removeStatus(state,status,'detonated');}
    const residual = node.effectId === 'payload.residual';
    const {damageType,scaling,avatarOutputBonus,outputScale,deliveryScale,damageBuff}=damageModifiers(state,actor,node,skill);
    const diceCount = residual ? 0 : (params.骰数 ?? 1) * (critical ? 2 : 1);
    const dice = residual
      ? {label: `${damageType}微弱残响`, count: 0, sides: 0, rolls: [], total: Number(params.数值 ?? 1), fixed: true}
      : rollDice(rng, diceCount, params.骰面 ?? 4, `${damageType}伤害`);
    const upcastBonus = consumeUpcastBonus(skill, node);
    const extra=bonusDiceActive(state,target,params)?rollDice(rng,params.追加骰数*(critical?2:1),params.追加骰面,'条件追加伤害'):null;
    const extraAmount=extra?extra.total+(params.追加加值??0):0;
    const saveMultiplier = targetReceipt.check?.saved && targetReceipt.check?.successEffect === '伤害减半' ? 0.5 : 1;
    const supportPercent=support.percent(state,actor.id,'damage',damageType,skill),elementProfile=foundation.elementDamageProfile(state,actor.id,damageType);
    const elementAmplification=foundation.amplifyElementDamage(Math.max(0, Math.floor((dice.total + extraAmount + (params.加值 ?? 0) + scaling + avatarOutputBonus + upcastBonus + damageBuff) * saveMultiplier * outputScale * deliveryScale * (skill?._hitGrazeScale??1))),{...elementProfile,supportPercent});
    const rawAmount = elementAmplification.amount;
    if (targetReceipt.check?.type === 'attack') targetReceipt.check.resistancePenetration = clamp(params.穿透档 ?? 0, 0, 1);
    const release=skill?.effectGraph?.nodes?.find(n=>n.family==='release'),wall=wallOnPath(state,actor.位置,target.位置,release?.effectId==='release.projectile'?'投射':'移动');
    if(wall){const wallDamage=globalThis.SoulCreationCore.damageWall(state,wall,rawAmount,actor.id,skill?.id??'ordinary.attack');targetReceipt.effects.push({effectId:node.effectId,prevented:'墙体承担这段攻击',sources:[wall.id],wallDamage,dice,rawAmount,damageType});return;}
    const resolution = resolveResistance(state, target, damageType, rawAmount, params.穿透档 ?? 0, {actor, skill,directArea:!residual&&skill?.effectGraph?.nodes?.some(n=>['target.burst','target.cone','target.line','target.aura'].includes(n.effectId))});
    const applied = applyResolvedDamage(state, target, resolution, {actor, damageType,damageGroup:targetReceipt});
    const result = {
      effectId: node.effectId, damageType, dice,...(skill?._hitGrazeScale?{grazeMultiplier:skill._hitGrazeScale}:{}), baseBonus:Number(params.加值??0), saveMultiplier, scaling, avatarOutputBonus, upcastBonus, damageBuff, outputScale, deliveryScale, rawAmount, ...(elementAmplification.percent?{elementAmplification}:{}), amount: resolution.finalAmount,
      resistance: resolution, ...applied, remainingHp: target.资源.生命.当前
    };
    if(extra)result.conditionalDamage={condition:params.加骰条件,dice:extra,amount:extraAmount};
    if(detonation)result.detonation=detonation;
    targetReceipt.effects.push(result);
    const reflected = activeStatuses(state, target.id, 'reaction.reflect').find(status => {
      const p = status.快照?.参数 ?? {};
      if (Number(status.扩展?.剩余次数 ?? 0) <= 0) return false;
      if (Number(p.最大距离区 ?? 0) > 0 && combatDistance(actor,target) > Number(p.最大距离区)) return false;
      if (Number(p.最大攻击魂技序号 ?? 0) > 0 && skillRingOrdinal(state, skill) > Number(p.最大攻击魂技序号)) return false;
      return Number(applied.hpDamage ?? 0) > 0;
    });
    if (reflected) {
      const p = reflected.快照?.参数 ?? {};
      const reflectedRaw = Math.floor(Number(applied.hpDamage ?? 0) * Number(p.反射百分比 ?? 0) / 100);
      const reflectedResolution = resolveResistance(state, actor, damageType, reflectedRaw, 0, {actor:target,realmAlreadyResolved:true,outputPermission:reflected.扩展?.输出许可,skill:{_damageRemainders:skill?._damageRemainders??{}}});
      const reflectedApplied = applyResolvedDamage(state, actor, reflectedResolution, {actor: target, damageType,damageGroup:(targetReceipt.reflectedReduction??={})});
      const shieldGain = Math.floor(Number(applied.hpDamage ?? 0) * Number(p.吸收转护盾百分比 ?? 0) / 100);
      const soulGain = Math.floor(Number(applied.hpDamage ?? 0) * Number(p.吸收转魂力百分比 ?? 0) / 100);
      const shield = foundation.grantTemporaryHealth(target, shieldGain);
      const soulBefore = (globalThis.SoulCombatDeployments.soulPowerResource(state,target.id)).当前;
      (globalThis.SoulCombatDeployments.soulPowerResource(state,target.id)).当前 = Math.min((globalThis.SoulCombatDeployments.soulPowerResource(state,target.id)).最大, soulBefore + soulGain);
      reflected.扩展.剩余次数 = Math.max(0, Number(reflected.扩展.剩余次数 ?? 1) - 1);
      if (reflected.扩展.剩余次数 <= 0) removeStatus(state,reflected,'consumed');
      result.reflection = {
        statusId: reflected.id, reflectedRaw, resistance: reflectedResolution, ...reflectedApplied,
        shieldOffered: shield.offered, shieldGain: shield.gained, temporaryHpBefore: shield.before, temporaryHp: shield.after, shieldUnused: shield.unused,
        soulPowerBefore:soulBefore, soulGain: (globalThis.SoulCombatDeployments.soulPowerResource(state,target.id)).当前 - soulBefore, remainingSoulPower:(globalThis.SoulCombatDeployments.soulPowerResource(state,target.id)).当前
      };
    }
  }

  function applyStatus(state, actor, target, node, receiptId, targetReceipt, skill = null) {
    const ageReason=controls.adultReason(state,actor.id,node)||controls.adultReason(state,target.id,node);if(ageReason)throw Error(ageReason);
    const params = node.params;
    const elements=params.指标==='属性伤害'?support.strongestElements(state,target.id):[],previousElement=params.指标==='属性伤害'?activeStatuses(state,target.id,'status.amplify').find(x=>x.来源?.单位ID===actor.id&&x.来源?.技能ID===targetReceipt.skillId&&x.来源?.效果ID===node.id)?.扩展?.加持属性:null,selectedElement=params.伤害属性??skill?._supportElements?.[target.id]??previousElement??elements[0]??'';
    if(params.指标==='属性伤害'&&!params.伤害属性&&elements.length&&!elements.includes(selectedElement))throw Error('请选择该人物武魂最强的伤害属性');
    if(node.effectId==='status.burn'&&params.同施术者取最高){
      const prior=activeStatuses(state,target.id,'status.burn').filter(s=>s.来源?.单位ID===actor.id).sort((a,b)=>statusDamageValue(state,b)-statusDamageValue(state,a)||a.id.localeCompare(b.id)),strongest=prior[0],incoming={快照:{参数:params,属性增伤:releasedElementProfile(state,actor,skill,'火')},扩展:{持续来源合同:skill?._sourceContract??skill}};
      if(strongest&&statusDamageValue(state,strongest)>=statusDamageValue(state,incoming)){strongest.持续.剩余回合=Math.max(Number(strongest.持续.剩余回合??0),Number(params.持续回合??1));for(const other of prior.slice(1))removeStatus(state,other,'stronger-burn-retained');targetReceipt.effects.push({effectId:node.effectId,statusId:strongest.id,refreshed:true,keptStronger:true,remainingRounds:strongest.持续.剩余回合});recordStatusLifecycle(state,strongest,'refreshed');return strongest;}
      for(const old of prior)removeStatus(state,old,'burn-replaced');
    }
    const worldDuration=controls.canPersist(node.effectId,params)?controls.duration(params,battleNow(state)):null;
    if(worldDuration){
      if(params.来源依赖==='施术武魂'&&!skillMartialSoulId(skill))throw Error('持续效果缺少施术武魂');
      if(params.来源依赖==='道具有效'&&!state.物品?.实例?.[skill?.sourceItemId])throw Error('持续效果缺少真实道具来源');
    }
    const guards = matchingStatusGuards(state,target,node,'免疫');
    if (guards.length) {
      targetReceipt.effects.push({effectId: node.effectId, prevented: '状态免疫', sources:guards});
      return null;
    }
    if(node.effectId==='status.power_seal'&&params.范围==='当前武魂'&&!foundation.activeMartialSoulId(state,target.id))throw Error('目标没有可封印的当前武魂');
    const definition = effects.EFFECT_REGISTRY[node.effectId];
    const upcastBonus = consumeUpcastBonus(skill, node);
    const upcastProfile = persistentUpcastProfile(upcastBonus, params.持续回合 ?? 1);
    const sameSource = activeStatuses(state,target.id,node.effectId).find(status =>
      definition.stacking.includes('刷新') &&
      status.来源?.战斗ID === (skill?._fieldUse?'':state.战斗.id) &&
      (node.effectId==='status.limited_followup'
        ?status.扩展?.作用来源===mechanics.scope(skill)&&status.快照?.参数?.资源槽===params.资源槽
        :status.来源?.单位ID === actor.id && status.来源?.技能ID === targetReceipt.skillId && status.来源?.效果ID === node.id) &&
      statusDiscriminator(status) === statusDiscriminator({快照:{参数:params},扩展:{封印武魂ID:node.effectId==='status.power_seal'&&params.范围==='当前武魂'?foundation.activeMartialSoulId(state,target.id):''}})
    );
    if (sameSource) {
      sameSource.快照.参数=clone(params);sameSource.强度=params.数值??params.强度??sameSource.强度;
      if(node.effectId==='status.limited_followup'){
        sameSource.层数=params.层数;sameSource.扩展.剩余次数=params.层数;sameSource.扩展.作用来源=mechanics.scope(skill);sameSource.扩展.追击来源合同=cleanSkillContract(skill?._sourceContract??skill);sameSource.扩展.回合触发次数=Math.min(Number(sameSource.扩展.回合触发次数??0),params.每回合上限);
        Object.assign(sameSource.来源,{单位ID:actor.id,武魂ID:skillMartialSoulId(skill),魂环ID:skillRingId(skill),技能ID:targetReceipt.skillId,效果ID:node.id,物品ID:skill?.sourceItemId??''});
      }
      if(requiresStatusProof(node.effectId,params,skill?._toxicProof)||DAMAGE_STATUS_IDS.includes(node.effectId)){const source=clone(skill?._sourceContract??skill);for(const key of Object.keys(source))if(key.startsWith('_'))delete source[key];sameSource.扩展.持续来源合同=source;}
      if(node.effectId==='status.limb_bind'){sameSource.层数=Math.max(sameSource.层数,params.层数??1);sameSource.扩展.初始层数=sameSource.层数;sameSource.扩展.解层记录=[];}
      const before = Number(sameSource.持续?.剩余回合 ?? 0);
      sameSource.持续.剩余回合 = Math.max(before,Number(params.持续回合 ?? 1));
      sameSource.持续.延后首次目标回合结束 = sameSource.持续.延后首次目标回合结束 || actor.id === target.id;
      sameSource.施加回合 = state.战斗.回合;
      sameSource.来源.结算单ID = receiptId;
      if(skill?._toxicProof)sameSource.扩展.毒药来源=clone(skill._toxicProof);
      if(contractPenaltyExecutions.has(skill))sameSource.扩展.契约处罚来源=clone(skill._contractPenaltyOrigin);else delete sameSource.扩展.契约处罚来源;
      if(skill?._releasedMedicineDC!==undefined)sameSource.快照.施加者DC=skill._releasedMedicineDC;
      if(worldDuration){sameSource.持续=worldDuration;sameSource.扩展.持续合同指纹=worldStatusFingerprint(sameSource);}
      if(worldDuration&&node.effectId==='status.regeneration')sameSource.扩展.再生时钟={version:1,lastAt:worldDuration.appliedAt,nextAt:worldDuration.appliedAt+1,pulses:0};
      if(worldDuration&&node.effectId==='status.poison')sameSource.扩展.毒伤时钟={version:1,lastAt:worldDuration.appliedAt,nextAt:worldDuration.appliedAt+1,pulses:0};
      if(requiresStatusProof(node.effectId,params,skill?._toxicProof)){sameSource.扩展.施加分钟=battleNow(state);sameSource.扩展.来源合同指纹=controlSourceFingerprint(sameSource);}
      sameSource.扩展.剩余次数 = Math.max(Number(sameSource.扩展?.剩余次数 ?? 0),Number(params.次数 ?? 0));
      sameSource.扩展.升环数值 = upcastProfile;
      if(node.effectId==='status.amplify')sameSource.扩展.增幅输出比例=effectOutputProfile(node,skill).scale;
      if(params.指标==='属性伤害')sameSource.扩展.加持属性=selectedElement;
      if(params.持续方式==='来源维持')sameSource.持续={模式:'来源维持',战斗ID:state.战斗.id};
      if(params.持续方式==='来源下回合')sameSource.持续={模式:'来源下回合',战斗ID:state.战斗.id};
      if(node.effectId==='status.amplify')sameSource.扩展.增幅快照指纹=support.snapshotHash(sameSource);
      if(DAMAGE_STATUS_IDS.includes(node.effectId))sameSource.快照.属性增伤=releasedElementProfile(state,actor,skill,node.effectId==='status.damage_over_time'?params.类型:node.effectId==='status.burn'?'火':'毒蚀');
      if(node.effectId==='status.regeneration')sameSource.快照.治疗增幅=support.percent(state,actor.id,'heal','',skill);
      targetReceipt.effects.push({effectId:node.effectId,statusId:sameSource.id,upcastBonus,refreshed:true,previousRemainingRounds:before,...(sameSource.持续.剩余回合===undefined?{}:{remainingRounds:sameSource.持续.剩余回合})});
      recordStatusLifecycle(state,sameSource,'refreshed');
      return sameSource;
    }
    const effectToken = node.effectId.replace(/[^a-z0-9]+/gi, '-');
    const nodeToken = String(node.id ?? 'node').replace(/[^a-z0-9]+/gi, '-');
    const id = `status-${receiptId}-${target.id}-${effectToken}-${nodeToken}`;
    const layers = ['status.limb_bind','status.limited_followup'].includes(node.effectId) ? params.层数??1 : node.effectId === 'status.paralysis'
      ? Math.min(99, params.层数 ?? 1)
      : node.effectId === 'status.poison' || node.effectId === 'status.burn'
        ? 1
        : 1;
    const status = {
      id,
      模板ID: node.effectId,
      模板版本: definition.version,
      分类: definition.family,
      来源: {战斗ID: state.战斗.id, 单位ID: actor.id, 武魂ID: skillMartialSoulId(skill), 魂环ID: skillRingId(skill), 技能ID: targetReceipt.skillId, 效果ID: node.id, 结算单ID: receiptId},
      目标单位ID: target.id,
      施加回合: state.战斗.回合,
      持续: {
        模式: '目标回合结束',
        剩余回合: params.持续回合 ?? 1,
        触发时点: ['目标回合开始', '目标回合结束'],
        // 自身在本回合施加的状态不能在同一行动结束时立刻过期。
        // 例如“防御”必须至少覆盖紧随其后的敌方行动。
        延后首次目标回合结束: actor.id === target.id
      },
      层数: layers,
      强度: params.数值 ?? params.属性加值 ?? params.属性增幅档 ?? layers,
      快照: {施加者DC: skill?._releasedMedicineDC??(skill?.sourceKind==='restraint'?custody.resolveDevice(state.物品.实例[skill.sourceItemId]).breakDifficulty:skillCheckDC(state,actor,skill)), 参数: clone(params)},
      清理规则: {
        来源失能: ['reaction.interpose','status.bind', 'status.buff', 'status.fear', 'status.charm', 'status.invisibility', 'status.regeneration', 'status.resistance_shift', 'status.status_guard', 'status.mark', 'copy.skillset', 'modifier.next_skill', 'move.flight', 'transform.form', 'transform.martial_avatar', 'reaction.counter', 'reaction.reflect',...effects.HIT_RULE_IDS.filter(id=>id.startsWith('status.'))].includes(node.effectId),
        战斗结束: node.effectId !== 'status.eternal_wound' || !params.战斗后保留
      },
      状态: '生效',
      扩展: {
        ...(skill?._exchangeRecordId?{exchangeRecordId:skill._exchangeRecordId,固定交换义务:!!skill._fixedExchange}:{}),
        ...(node.effectId==='status.limb_bind'?{初始层数:layers,解层记录:[]}:{}),
        输出许可:skill?._outputPermission??controls.outputSnapshot(state,actor.id),
        ...(skill?._toxicProof?{毒药来源:clone(skill._toxicProof)}:{}),
        ...(contractPenaltyExecutions.has(skill)?{契约处罚来源:clone(skill._contractPenaltyOrigin)}:{}),
        ...(node.effectId==='status.power_seal'&&params.封印对象==='精细'?{封印限制:controls.bindLimits(state,target.id,params.限制)}:{}),
        ...(node.effectId==='status.power_seal'&&params.范围==='当前武魂'?{封印武魂ID:foundation.activeMartialSoulId(state,target.id)}:{}),
        已触发: false,
        剩余次数: node.effectId==='status.limited_followup'?layers:['reaction.interpose','status.next_check_penalty','status.invulnerable', 'reaction.counter', 'reaction.reflect', 'modifier.next_skill',...effects.HIT_RULE_IDS.filter(id=>id.startsWith('status.'))].includes(node.effectId) ? (params.次数 ?? 1) : 0,
        ...(node.effectId==='status.limited_followup'?{作用来源:mechanics.scope(skill),追击来源合同:cleanSkillContract(skill?._sourceContract??skill),追击回合:0,回合触发次数:0}:{}),
        攻击后解除: node.effectId === 'status.invisibility' ? Boolean(params.攻击后解除) : false,
        负面: foundation.negativeStatus(node.effectId, params),
        升环数值: upcastProfile
      }
    };
    state.状态实例.列表[id] = status;
    if(node.effectId==='status.amplify'||params.持续方式==='来源维持'){
      if(!skill?.effectGraph?.nodes?.some(n=>n.effectId==='sustain.maintain'))throw Error('持续加持需要维持来源');
      status.持续={模式:'来源维持',战斗ID:state.战斗.id};status.清理规则={来源失能:true,战斗结束:true};
      status.扩展.持续来源合同=cleanSkillContract(skill?._sourceContract??skill);
      if(node.effectId==='status.amplify')status.扩展.增幅输出比例=effectOutputProfile(node,skill).scale;
      if(params.指标==='属性伤害'){
        status.扩展.加持属性=selectedElement;
      }
    }
    if(params.持续方式==='来源下回合')status.持续={模式:'来源下回合',战斗ID:state.战斗.id};
    if (node.领域实例ID) status.来源.领域ID = node.领域实例ID;
    if(node.effectId==='status.amplify')status.扩展.增幅快照指纹=support.snapshotHash(status);
    if(node.effectId==='status.power_seal')foundation.refreshSoulSeal(state,target.id);
    if(node.effectId==='transform.martial_avatar')status.持续={模式:'本场战斗',战斗ID:state.战斗.id};
    if(node.effectId==='status.power_seal'&&params.封印对象==='装备与道具')globalThis.SoulWorldEngine?.refreshEquipmentInPlace?.(state,target.id);
    if(requiresStatusProof(node.effectId,params,skill?._toxicProof)||DAMAGE_STATUS_IDS.includes(node.effectId)){
      status.来源.物品ID=skill?.sourceItemId??'';
      const source=clone(skill?._sourceContract??skill);for(const key of Object.keys(source))if(key.startsWith('_'))delete source[key];
      status.扩展.持续来源合同=source;
    }
    if(['status.mind_control','status.soul_control','status.cognition_shift'].includes(node.effectId))status.扩展.施术感知=medicineBranchStates.has(state)?null:clone(actionEvidence.get(state)?.receipt.contractReleaseProof?.perceptions?.find(v=>v.targetUnitId===target.id&&v.actorId===actor.id)??null);
    if(worldDuration){
      status.持续=worldDuration;status.清理规则={来源失能:false,战斗结束:false};
      if(node.effectId==='status.regeneration')status.扩展.再生时钟={version:1,lastAt:worldDuration.appliedAt,nextAt:worldDuration.appliedAt+1,pulses:0};
      if(node.effectId==='status.poison')status.扩展.毒伤时钟={version:1,lastAt:worldDuration.appliedAt,nextAt:worldDuration.appliedAt+1,pulses:0};
      if(skill?._fieldUse)status.来源.战斗ID='';
      status.扩展.持续合同指纹=worldStatusFingerprint(status);
    }
    if(DAMAGE_STATUS_IDS.includes(node.effectId))status.快照.属性增伤=releasedElementProfile(state,actor,skill,node.effectId==='status.damage_over_time'?params.类型:node.effectId==='status.burn'?'火':'毒蚀');
    if(node.effectId==='status.regeneration')status.快照.治疗增幅=support.percent(state,actor.id,'heal','',skill);
    foundation.refreshBattleAttributeResources(state,target);
    if(requiresStatusProof(node.effectId,params,skill?._toxicProof)){status.扩展.施加分钟=battleNow(state);status.扩展.来源合同指纹=controlSourceFingerprint(status);}
    influence.onApplied(state,status);
    globalThis.SoulDisguise?.onApplied(state,status);
    globalThis.SoulPersonContracts?.onSoulControlApplied(state,status);
    if(node.effectId==='status.desire')globalThis.SoulAbilityExchange?.onDesireApplied(state,target.id);
    const triggered = node.effectId === 'status.paralysis' ? refreshParalysisTrigger(state,target.id) : false;
    targetReceipt.effects.push({effectId: node.effectId, statusId: id, upcastBonus, layers, triggered, remainingRounds: status.持续.剩余回合});
    recordStatusLifecycle(state,status,'applied');
    if(!skill?._exchangeRecordId)globalThis.SoulAbilityExchange.reconcile(state);
    return status;
  }

  function applyMartialAvatar(state, actor, target, node, receiptId, targetReceipt, skill) {
    const eligibility = martialAvatarEligibility(state, actor, skill);
    if (!eligibility.pass) throw new Error(eligibility.reasons.join('；'));
    if (target.id !== actor.id) throw new Error('武魂真身只能作用于施术者自身');
    const lock = Math.max(0, Number(node.params?.锁定魂力 ?? 8));
    const upkeep = Math.max(0, Number(node.params?.每回合魂力 ?? 2));
    if (controls.availableSoulPower(state,actor.id) < lock) throw new Error(`武魂真身锁定魂力不足：需要${lock}`);
    const status = applyStatus(state, actor, target, node, receiptId, targetReceipt, skill);
    status.扩展.锁定魂力 = lock;
    status.扩展.每回合魂力 = upkeep;
    status.扩展.来源武魂ID = eligibility.soulId;
    status.扩展.来源魂环ID = eligibility.sourceRing?.id??'';
    if(skill.sourceKind==='native-origin')status.扩展.sourceNativeOriginId=skill.sourceNativeOriginId;
    (globalThis.SoulCombatDeployments.soulPowerResource(state,actor.id)).锁定 += lock;
    (globalThis.SoulCombatDeployments.soulPowerResource(state,actor.id)).持续消耗 += upkeep;
    state.战斗.扩展.武魂真身使用[eligibility.useKey] = {round: state.战斗.回合, skillId: skill.id, statusId: status.id};
    targetReceipt.effects.push({effectId: node.effectId, event: 'martial-avatar-activated', sourceMartialSoulId: eligibility.soulId, sourceRingId: eligibility.sourceRing?.id??'', lockedSoulPower: lock, upkeep,durationMode:'本场战斗'});
    return status;
  }

  function cleanseCandidates(state,target,node){
    const category = node.params.类别 ?? '负面';
    return activeStatuses(state, target.id).filter(status => {
      if(status.扩展?.固定交换义务)return false;
      if (category === '任意' || category === '负面') return foundation.negativeStatus(status.模板ID,status.快照?.参数) || status.扩展?.负面;
      if (category === '毒素') return globalThis.SoulPoisonCore?.isToxicStatus(state,status)??status.模板ID==='status.poison';
      if (category === '精神') return ['status.fear','status.charm','status.desire','status.sleep','status.mind_control','status.cognition_shift'].includes(status.模板ID);
      if (category === '灵魂') return status.模板ID==='status.soul_control';
      if (category === '控制') return CONTROL_STATUS_IDS.includes(status.模板ID);
      return false;
    });
  }
  function cleanseStatuses(state, target, node, targetReceipt,removalContext) {
    const maximum = node.params.最大数量 ?? 1;
    const candidates=cleanseCandidates(state,target,node);
    const removedStatusIds=[],removedLayers=[];let remaining=maximum;
    for(const status of candidates)while(remaining>0&&activeStatuses(state,target.id).some(s=>s.id===status.id)){const before=status.层数??1;removeStatusLayer(state,status,'cleansed',targetReceipt,removalContext);remaining--;const active=activeStatuses(state,target.id).some(s=>s.id===status.id);removedLayers.push({statusId:status.id,before,after:active?state.状态实例.列表[status.id]?.层数??0:0});if(!active)removedStatusIds.push(status.id);}
    targetReceipt.effects.push({effectId: node.effectId, removedStatusIds,removedLayers});
  }

  function dispelEffects(state, target, node, targetReceipt,removalContext) {
    const maximum = node.params.最大数量 ?? 1;
    const candidates = activeStatuses(state, target.id)
      .filter(status => !status.扩展?.固定交换义务&&!['status.burn', 'status.poison'].includes(status.模板ID));
    const removedStatusIds=[],removedLayers=[];let remaining=maximum;
    for(const status of candidates)while(remaining>0&&activeStatuses(state,target.id).some(s=>s.id===status.id)){const before=status.层数??1;removeStatusLayer(state,status,'dispelled',targetReceipt,removalContext);remaining--;const active=activeStatuses(state,target.id).some(s=>s.id===status.id);removedLayers.push({statusId:status.id,before,after:active?state.状态实例.列表[status.id]?.层数??0:0});if(!active)removedStatusIds.push(status.id);}
    const zoneIds = activeZones(state).filter(zone => zone.来源?.单位ID === target.id).slice(0,remaining).map(zone => zone.id);
    for (const id of zoneIds) removeZone(state,id,'dispelled');
    targetReceipt.effects.push({effectId: node.effectId, removedStatusIds,removedLayers, removedZoneIds: zoneIds});
  }

  function reviveTarget(state, target, node, targetReceipt, sourceId) {
    if (!['死亡','昏迷'].includes(target.存活状态)&&target.资源.生命.当前>0) {
      targetReceipt.effects.push({effectId: node.effectId, prevented: '目标无需复苏'});
      return;
    }
    const amount = Math.max(1, Math.floor(target.资源.生命.最大 * (node.params.生命百分比 ?? 1) / 100));
    const revival=state.人物?.列表?.[target.id]?.life?.death?people.revive(state,target.id,amount,sourceId):null;
    target.存活状态 = '存活';
    target.资源.生命.当前 = amount;
    const member=state.战斗?.扩展?.成员?.[target.id];if(member?.status==='defeated')member.status='active';
    for (const status of activeStatuses(state, target.id).filter(status=>!controls.persistent(status))) removeStatus(state,status,'revived');
    targetReceipt.effects.push({effectId: node.effectId, revived: true, amount, remainingHp: amount,...(revival?{deathId:revival.deathId}:{})});
  }

  function drainLife(state, actor, target, node, rng, critical, targetReceipt, skill = null) {
    const beforeCount = targetReceipt.effects.length;
    const damageNode = {...node, effectId: 'payload.drain'};
    applyDamage(state, actor, target, damageNode, rng, critical, targetReceipt, skill);
    const damageResult = targetReceipt.effects[beforeCount];
    const healing = Math.floor((damageResult?.hpDamage ?? 0) * (node.params.转化百分比 ?? 25) / 100);
    const actual = Math.min(healing, actor.资源.生命.最大 - actor.资源.生命.当前);
    actor.资源.生命.当前 += actual;
    damageResult.drainHealing = actual;
    damageResult.casterRemainingHp = actor.资源.生命.当前;
  }

  function assertVoluntaryPosition(state,actor,from,to){
    // Contact-range rounding must not hide a real step toward the perceived source.
    for(const sourceId of controls.statusSources(state,actor.id,'status.fear')){const source=state.战斗单位.列表[sourceId];if(actions.perception(state,actor.id,sourceId)&&actions.battleOf(state,sourceId)?.id===state.战斗.id&&pointDistance(unitPoint({...actor,位置:to}),unitPoint(source))<pointDistance(unitPoint({...actor,位置:from}),unitPoint(source))-.000001)throw Error('恐惧状态下不能主动接近已感知的恐惧来源');}
  }

  function moveByEffect(state, actor, target, node, intent, receiptId, targetReceipt, skill = null) {
    const movedUnit = node.effectId === 'move.pursuit' ? actor : target;
    const from = clone(movedUnit.位置);
    const amount = node.params.距离区 ?? 1;
    const origin=unitPoint(actor),targetPoint=unitPoint(target);
    const awayPoint=()=>{
      const dx=targetPoint.x-origin.x,dy=targetPoint.y-origin.y,length=Math.hypot(dx,dy);
      return battlePoint({x:targetPoint.x+(length?dx/length:targetPoint.x>=50?1:-1)*amount*BATTLEFIELD.zoneLength,y:targetPoint.y+(length?dy/length:0)*amount*BATTLEFIELD.zoneLength});
    };
    if(node.effectId==='move.step'){
      const requested=intent?.effectDestination??intent?.destination;
      const point=unitPoint(actor),fallback=battlePoint({x:point.x,y:point.y+(point.y<=50?1:-1)*amount*BATTLEFIELD.zoneLength});
      const destination=requested??{距离区:actor.位置.距离区,战场坐标:fallback};
      const steps=zoneDistance(actor.位置.距离区,destination.距离区),coordinate=battlePoint(destination.战场坐标,fallback);
      if(steps>amount||pointDistance(point,coordinate)>amount*BATTLEFIELD.zoneLength+.000001)throw Error('挪步目的地超过效果距离');
      moveUnit(state,actor,{...destination,战场坐标:coordinate},{});
    } else if (node.effectId === 'move.knockback') {
      const index = Math.max(0, ZONES.indexOf(target.位置.距离区));
      target.位置.距离区 = ZONES[Math.min(ZONES.length - 1, index + amount)];
      target.位置.战场坐标=awayPoint();
    } else if (node.effectId === 'move.pull') {
      if(node.params.援护牵引){
        const next=towardPoint(targetPoint,origin,amount*BATTLEFIELD.zoneLength);
        const foes=activeParticipants(state).filter(u=>!sameSide(state,actor,u));
        const nearest=p=>Math.min(...foes.map(u=>pointDistance(p,unitPoint(u))));
        if(!sameSide(state,actor,target)||combatDistance(actor,target)===0||controls.restrictions(state,target.id).blocked?.movement?.length||
          (intent?.aiDecision&&nearest(next)<=nearest(targetPoint))){
          targetReceipt.effects.push({effectId:node.effectId,prevented:'保持原位',targetId:target.id});return;
        }
      }
      const targetIndex = Math.max(0, ZONES.indexOf(target.位置.距离区));
      const actorIndex = Math.max(0, ZONES.indexOf(actor.位置.距离区));
      const direction = actorIndex === targetIndex ? 0 : actorIndex > targetIndex ? 1 : -1;
      target.位置.距离区 = ZONES[clamp(targetIndex + direction * amount, 0, ZONES.length - 1)];
      target.位置.战场坐标=towardPoint(targetPoint,origin,amount*BATTLEFIELD.zoneLength);
    } else if (node.effectId === 'move.teleport') {
      const requested = intent?.effectDestination ?? intent?.destination ?? {};
      if (node.params.目的 === '接近施术者') {
        target.位置.战场坐标=towardPoint(targetPoint,origin,amount*BATTLEFIELD.zoneLength);
        const delta=ZONES.indexOf(actor.位置.距离区)-ZONES.indexOf(target.位置.距离区);
        target.位置.距离区=ZONES[clamp(ZONES.indexOf(target.位置.距离区)+Math.sign(delta)*Math.min(Math.abs(delta),amount),0,4)];
      }
      else if (node.params.目的 === '远离施术者') {
        const targetIndex = Math.max(0, ZONES.indexOf(target.位置.距离区));
        const actorIndex = Math.max(0, ZONES.indexOf(actor.位置.距离区));
        const direction = targetIndex >= actorIndex ? 1 : -1;
        target.位置.距离区 = ZONES[clamp(targetIndex + direction * amount, 0, ZONES.length - 1)];
        target.位置.战场坐标=awayPoint();
      } else if (ZONES.includes(requested.距离区)) {
        if (zoneDistance(target.位置.距离区, requested.距离区) > amount) throw new Error('瞬移目的地超过效果距离');
        const destinationPoint=battlePoint(requested.战场坐标,{x:targetPoint.x+(ZONES.indexOf(requested.距离区)-ZONES.indexOf(target.位置.距离区))*BATTLEFIELD.zoneLength*(targetPoint.x>=50?1:-1),y:targetPoint.y});
        if(pointDistance(targetPoint,destinationPoint)>amount*BATTLEFIELD.zoneLength+.000001)throw new Error('瞬移目的地超过效果距离');
        target.位置.战场坐标=destinationPoint;
        target.位置.距离区 = requested.距离区;
        if (requested.站位簇 !== undefined) target.位置.站位簇 = String(requested.站位簇);
      }
    } else if (node.effectId === 'move.pursuit') {
      const marked = activeStatuses(state, target.id, 'status.mark').some(status => status.来源?.单位ID === actor.id);
      if (node.params.需要自身标记 && !marked) throw new Error('标记追击要求目标带有施术者自己的有效标记');
      if (combatDistance(actor,target) > amount) throw new Error('标记目标超过追击距离');
      actor.位置.战场坐标=towardPoint(origin,targetPoint,Math.max(0,pointDistance(origin,targetPoint)-10));
      actor.位置.距离区 = target.位置.距离区;
      actor.位置.站位簇 = target.位置.站位簇;
    } else if (node.effectId === 'move.flight') {
      applyStatus(state, actor, target, node, receiptId, targetReceipt, skill);
      recomputeFlightHeight(state,target.id);
    }
    if(['move.knockback','move.pull','move.pursuit'].includes(node.effectId)&&wallOnPath(state,from,movedUnit.位置,'移动')){movedUnit.位置=from;targetReceipt.effects.push({effectId:node.effectId,prevented:'墙体阻挡移动',sources:[]});return;}
    if(movedUnit.id===actor.id&&['move.teleport','move.pursuit'].includes(node.effectId))assertVoluntaryPosition(state,actor,from,movedUnit.位置);
    globalThis.SoulPoisonCore?.syncResidents(state);
    targetReceipt.effects.push({effectId: node.effectId, movedUnitId: movedUnit.id, from, to: clone(movedUnit.位置)});
  }

  function createZone(state, actor, target, node, receiptId, targetReceipt, skill = null) {
    const id = `zone-${receiptId}-${node.id}`;
    const type = node.effectId.split('.')[1];
    const upcastBonus = consumeUpcastBonus(skill, node);
    const zone = {
      id,
      类型: type,
      ...(type==='wall'?{耐久:node.params.耐久}:{}),
      来源: {战斗ID: state.战斗.id, 单位ID: actor.id, 技能ID: targetReceipt.skillId, 效果ID: node.id, 结算单ID: receiptId},
      距离区: target.位置.距离区,
      战场坐标: unitPoint(target),
      站位簇: target.位置.站位簇,
      参数: clone(node.params),
      ...(skill?._exchangeRecordId?{exchangeRecordId:skill._exchangeRecordId,固定交换义务:!!skill._fixedExchange}:{}),
        ...(node.effectId==='status.limb_bind'?{初始层数:layers,解层记录:[]}:{}),
        输出许可:skill?._outputPermission??controls.outputSnapshot(state,actor.id),
        ...(skill?._toxicProof?{毒药来源:clone(skill._toxicProof)}:{}),
      属性增伤:releasedElementProfile(state,actor,skill,node.params.类型),
      剩余回合: node.params.持续回合 ?? 1,
      延后首次来源回合结束: true,
      状态: '生效',
      扩展: {升环数值: persistentUpcastProfile(upcastBonus, node.params.持续回合 ?? 1),...(skill?{持续来源合同:cleanSkillContract(skill?._sourceContract??skill)}:{})}
    };
    if(node.effectId==='zone.wall'&&node.params.持续方式==='世界分钟'){
      const row=globalThis.SoulCreationCore.registerConstruct(state,actor.id,target.id,node,skill,receiptId,skill?._creationPayment,{zone});
      row.battleId=skill?._fieldUse?'':state.战斗.id;zone.constructId=row.id;row.zone.constructId=row.id;
      targetReceipt.effects.push({effectId:node.effectId,zoneId:id,constructId:row.id,expiresAt:row.expiresAt,location:clone(row.scope),durability:zone.耐久});return;
    }
    state.战斗.扩展.区域效果[id]=zone;
    if(effects.effectPolarity(node.effectId,node.params)==='harmful')actions.assertTargets(state,actor.id,{harmfulTargetIds:Object.values(state.战斗单位.列表).filter(u=>isActiveParticipant(state,u.id)&&zoneContains(zone,u)).map(u=>u.id)});
    targetReceipt.effects.push({effectId: node.effectId, zoneId: id, upcastBonus, location: {距离区: target.位置.距离区, 站位簇: target.位置.站位簇}, remainingRounds: state.战斗.扩展.区域效果[id].剩余回合});
    recordFieldLifecycle(state,state.战斗.扩展.区域效果[id],'zone','applied');
  }

  function domainsOverlap(state, left, right) {
    const leftCenter = domainCenter(state, left);
    const rightCenter = domainCenter(state, right);
    return Boolean(leftCenter && rightCenter && combatDistance({位置:leftCenter}, {位置:rightCenter}) <=
      Number(left.参数?.半径区 ?? 0) + Number(right.参数?.半径区 ?? 0));
  }

  function removeDomain(state, domainId, receipt = null, reason = 'ended') {
    const domain = state.战斗?.扩展?.领域实例?.[domainId];
    if (!domain) return false;
    recordFieldLifecycle(state,domain,'domain','removed',reason);
    foundation.releaseDomainMaintenance(state,domain);
    for (const status of Object.values(state.状态实例.列表).filter(item => item.来源?.领域ID === domainId)) removeStatus(state,status,'domain-removed',receipt);
    delete state.战斗.扩展.领域实例[domainId];
    receipt?.statusEvents?.push({event: 'domain-ended', domainId, reason});
    return true;
  }

  function recomputeDomainConflicts(state, receipt = null) {
    state.战斗.扩展.领域实例 ??= {};
    for (const domain of Object.values(state.战斗.扩展.领域实例)) {
      const source = state.战斗单位.列表[domain.来源?.单位ID];
      if (!source || source.存活状态 !== '存活' || !isPresentParticipant(state, source.id)) removeDomain(state, domain.id, receipt, 'source-invalidated');
    }
    const domains = Object.values(state.战斗.扩展.领域实例).sort((left, right) => left.id.localeCompare(right.id));
    const previousStates = Object.fromEntries(domains.map(domain => [domain.id, domain.状态]));
    for (const domain of domains) {
      domain.压制者ID列表 = [];
      domain.当前冲突记录 = [];
    }
    for (let leftIndex = 0; leftIndex < domains.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < domains.length; rightIndex += 1) {
        const left = domains[leftIndex];
        const right = domains[rightIndex];
        const leftSource = state.战斗单位.列表[left.来源?.单位ID];
        const rightSource = state.战斗单位.列表[right.来源?.单位ID];
        if (left.参数?.定点守卫||right.参数?.定点守卫||!leftSource || !rightSource || sameSide(state, leftSource, rightSource) || !domainsOverlap(state, left, right)) continue;
        const leftTotal = Number(left.支配总值 ?? 0);
        const rightTotal = Number(right.支配总值 ?? 0);
        const winner = leftTotal > rightTotal || (leftTotal === rightTotal && left.id.localeCompare(right.id) < 0) ? left : right;
        const loser = winner === left ? right : left;
        loser.压制者ID列表.push(winner.id);
        const contest = {leftId: left.id, rightId: right.id, leftTotal, rightTotal, winnerId: winner.id, loserId: loser.id};
        left.当前冲突记录.push(contest);
        right.当前冲突记录.push(contest);
      }
    }
    for (const domain of domains) {
      domain.压制者ID列表 = cleanList(domain.压制者ID列表).sort();
      domain.状态 = domain.压制者ID列表.length ? '受压制' : '生效';
      if (previousStates[domain.id] === '生效' && domain.状态 === '受压制') {
        for (const status of Object.values(state.状态实例.列表).filter(item => item.来源?.领域ID === domain.id)) removeStatus(state,status,'domain-suppressed',receipt);
      } else if (previousStates[domain.id] === '受压制' && domain.状态 === '生效') {
        domain.成员ID列表 = [];
      }
      const signature = `${domain.状态}:${domain.压制者ID列表.join(',')}:${domain.当前冲突记录.map(item => `${item.leftId}>${item.rightId}:${item.winnerId}`).sort().join('|')}`;
      if (domain.扩展?.冲突签名 !== signature) {
        domain.扩展 ??= {};
        domain.扩展.冲突签名 = signature;
        domain.对抗记录.push({round: state.战斗.回合, state: domain.状态, suppressorIds: clone(domain.压制者ID列表), contests: clone(domain.当前冲突记录)});
        domain.对抗记录 = domain.对抗记录.slice(-24);
        receipt?.statusEvents?.push({event: 'domain-conflict-recomputed', domainId: domain.id, state: domain.状态, suppressorIds: clone(domain.压制者ID列表)});
        recordFieldLifecycle(state,domain,'domain','state-changed');
      }
    }
    return domains;
  }

  function harmfulTargetsForSkill(state,actor,skill,targetIds){
    const node=skill.effectGraph.nodes.find(n=>n.effectId==='domain.field');if(!node)return targetIds;
    const target=state.战斗单位.列表[targetIds[0]],domain={来源:{单位ID:actor.id},中心:clone(target?.位置??actor.位置),中心模式:node.params.跟随施术者?'施术者跟随':'固定锚点',参数:clone(node.params)};
    const children=skill.effectGraph.nodes.filter(n=>['payload','status','movement'].includes(n.family)&&effects.effectPolarity(n.effectId,n.params)==='harmful');
    return Object.values(state.战斗单位.列表).filter(u=>isActiveParticipant(state,u.id)&&domainContains(state,domain,u)&&children.some(n=>domainFactionEligible(state,domain,actor,u,n))).map(u=>u.id);
  }

  function createDomain(state, actor, target, node, receiptId, targetReceipt, rng, skill, selectedTargetIds=null) {
    state.战斗.扩展.领域实例 ??= {};
    const id = `domain-${receiptId}-${node.id}`;
    const replacedIds = Object.values(state.战斗.扩展.领域实例).filter(domain => domain.来源?.单位ID === actor.id && (node.params.定点守卫 ? domain.参数?.定点守卫&&domain.来源.技能ID===skill.id : !domain.参数?.定点守卫)).map(domain => domain.id);
    for (const replacedId of replacedIds) removeDomain(state, replacedId, null, 'source-domain-replaced');
    const sustainNode = skill.effectGraph.nodes.find(item => item.effectId === 'sustain.maintain');
    const childNodes = clone(skill.effectGraph.nodes.filter(item => ['payload', 'status', 'movement'].includes(item.family)));
    if (!childNodes.length) throw new Error('领域不能是没有子效果的空领域');
    const plannedDomain={来源:{单位ID:actor.id},中心:clone(target?.位置??actor.位置),中心模式:node.params.跟随施术者?'施术者跟随':'固定锚点',参数:clone(node.params)};actions.assertTargets(state,actor.id,{harmfulTargetIds:Object.values(state.战斗单位.列表).filter(u=>isActiveParticipant(state,u.id)&&domainContains(state,plannedDomain,u)&&childNodes.some(n=>effects.effectPolarity(n.effectId,n.params)==='harmful'&&domainFactionEligible(state,plannedDomain,actor,u,n))).map(u=>u.id)});
    const dominanceDie = rng.die(20);
    const strength = Number(node.params.领域强度 ?? 1);
    const domain = {
      id,
      模板ID: 'domain.field',
      类型: '领域',
      来源: {战斗ID: state.战斗.id, 单位ID: actor.id, 武魂ID: skillMartialSoulId(skill), 魂环ID: skillRingId(skill), 技能ID: skill.id, 效果ID: node.id, 结算单ID: receiptId},
      能力合同:clone(skill._sourceContract??skill),
      输出许可:skill._outputPermission??controls.outputSnapshot(state,actor.id),
      中心: clone(target?.位置 ?? actor.位置),
      中心模式: node.params.跟随施术者 ? '施术者跟随' : '固定锚点',
      参数: clone(node.params),
      半径区: Number(node.params.半径区 ?? 0),
      强度: strength,
      触发时机: node.params.触发时机,
      检定节点: clone(skill.effectGraph.nodes.find(item => item.family === 'check') ?? null),
      子效果节点: childNodes,
      友方子效果节点: childNodes.filter(item => item.params?.领域阵营 === '友方' || item.params?.领域阵营 === '所有'),
      敌方子效果节点: childNodes.filter(item => item.params?.领域阵营 === '敌方' || item.params?.领域阵营 === '所有'),
      剩余回合: node.params.持续回合 ?? 1,
      延后首次来源回合结束: true,
      成员ID列表: [],
      需要维持: Boolean(sustainNode),
      // Filled with actual resource increments when the sustain nodes execute.
      维持: {需要: Boolean(sustainNode), 锁定魂力: 0, 每回合魂力: 0},
      支配检定: dominanceDie,
      支配总值: dominanceDie + strength + attributeModifier(state, actor, '意志'),
      状态: '生效',
      压制者ID列表: [],
      当前冲突记录: [],
      对抗记录: [],
      触发账本: {},
      ...(node.params.触发次数?{剩余触发:node.params.触发次数}:{}),
      扩展: Array.isArray(selectedTargetIds)?{选择目标ID列表:clone(selectedTargetIds)}:{}
    };
    state.战斗.扩展.领域实例[id] = domain;
    recordFieldLifecycle(state,domain,'domain','applied');
    recomputeDomainConflicts(state);
    targetReceipt.effects.push({effectId: node.effectId, domainId: id, replacedDomainIds: replacedIds, location: clone(domain.中心), centerMode: domain.中心模式, radius: domain.半径区, strength: domain.强度, dominanceDie, dominanceTotal: domain.支配总值, remainingRounds: domain.剩余回合, ...(domain.参数?.持续方式==='来源维持'?{durationMode:'来源维持'}:{}), state: domain.状态, suppressorIds: clone(domain.压制者ID列表)});
    return domain;
  }

  function processDomainEffect(state, domain, unit, rng, receipt, trigger) {
    if (domain.状态 !== '生效'||domain.剩余触发===0||!state.战斗.扩展.领域实例?.[domain.id]) return;
    if(Array.isArray(domain.扩展?.选择目标ID列表)&&!domain.扩展.选择目标ID列表.includes(unit.id))return;
    const source = state.战斗单位.列表[domain.来源?.单位ID];
    if (!source || source.存活状态 !== '存活') return;
    const eligibleNodes = domain.子效果节点.filter(node => domainFactionEligible(state, domain, source, unit, node)&&(!node.params?.领域触发||node.params.领域触发===trigger));
    if (!eligibleNodes.length) return;
    const limited=domain.剩余触发!==undefined;
    const ledgerKey = `${state.战斗.回合}:${limited?'触发':trigger}:${unit.id}`;
    if(limited&&domain.触发账本?.[ledgerKey])return;
    if (trigger!=='范围内'&&domain.触发账本?.[ledgerKey]) return;
    domain.触发账本 ??= {};
    if(limited)domain.剩余触发--;
    domain.触发账本[ledgerKey] = {round: state.战斗.回合, trigger, targetId: unit.id};
    if (Object.keys(domain.触发账本).length > 160) {
      const kept = Object.entries(domain.触发账本).slice(-120);
      domain.触发账本 = Object.fromEntries(kept);
    }
    const targetReceipt = {
      targetId: unit.id, skillId: domain.来源.技能ID, check: null, affected: false, effects: [], domainId: domain.id, trigger,
      sourceUnitId: source.id, sourceSkillId: domain.来源.技能ID
    };
    const skill = {id: domain.来源.技能ID, sourceMartialSoulId: domain.来源.武魂ID, 来源武魂ID: domain.来源.武魂ID, 来源魂环ID: domain.来源.魂环ID,sourceItemId:domain.能力合同?.sourceItemId,_sourceContract:domain.能力合同,_outputPermission:domain.输出许可,_damageRemainders:{}, effectGraph: {nodes: [...eligibleNodes,...(domain.能力合同?.effectGraph?.nodes??[]).filter(n=>n.family==='sustain')]}};
    const checked = rollCheck(state, source, unit, trigger==='范围内'?null:domain.检定节点, rng, targetReceipt, skill);
    targetReceipt.affected = checked.affected;
    const graze=Number(targetReceipt.check?.interference?.grazePercent??0),runtime=graze?{...skill,_hitGrazeScale:graze/100}:skill;
    const saveHalf = targetReceipt.check?.saved && targetReceipt.check?.successEffect === '伤害减半';
    if (checked.affected || saveHalf || graze) {
      for (const original of eligibleNodes) {
        if(graze&&original.effectId!=='payload.damage')continue;
        if (!graze&&!checked.affected && !['payload.damage', 'payload.drain'].includes(original.effectId)) continue;
        const node = {...original, 领域实例ID: domain.id};
        executeNode(state, source, unit, node, rng, checked.critical,domain.参数?.持续方式==='来源维持'?domain.来源.结算单ID:receipt.id, targetReceipt, {}, runtime);
      }
    }
    const kill = unit.存活状态 === '死亡'
      ? recordKill(state, unit.id, source.id, receipt, {type: 'domain', id: domain.id, skillId: domain.来源.技能ID})
      : null;
    receipt.statusEvents.push({
      event: 'domain-trigger', domainId: domain.id, trigger, targetId: unit.id,
      sourceUnitId: source.id, sourceSkillId: domain.来源.技能ID,
      effects: clone(targetReceipt.effects), creditedKillerId: kill?.killerId ?? ''
    });
    if (Array.isArray(receipt.targets)) receipt.targets.push(targetReceipt);
    if(domain.剩余触发===0)removeDomain(state,domain.id,receipt,'triggers-spent');
  }

  function refreshDomainMembershipForUnit(state, unit, rng, receipt, event = 'movement') {
    for (const domain of Object.values(state.战斗?.扩展?.领域实例 ?? {})) {
      const source = state.战斗单位.列表[domain.来源?.单位ID];
      if (!source || source.存活状态 !== '存活') continue;
      const wasInside = domain.成员ID列表.includes(unit.id);
      const isInside = domainContains(state, domain, unit);
      if (isInside && !wasInside) {
        domain.成员ID列表.push(unit.id);
        receipt.statusEvents.push({event: 'domain-enter', domainId: domain.id, targetId: unit.id});
        if(domain.状态==='生效'&&domain.子效果节点.some(n=>n.params?.领域触发==='范围内'))processDomainEffect(state,domain,unit,rng,receipt,'范围内');
        if (domain.状态 === '生效' && String(domain.参数?.触发时机).includes('进入')) processDomainEffect(state, domain, unit, rng, receipt, '进入');
      } else if (!isInside && wasInside) {
        domain.成员ID列表 = domain.成员ID列表.filter(id => id !== unit.id);
        for (const status of activeStatuses(state, unit.id).filter(item => item.来源?.领域ID === domain.id)) removeStatus(state,status,'domain-membership-ended',receipt);
        receipt.statusEvents.push({event: 'domain-exit', domainId: domain.id, targetId: unit.id});
      } else if (isInside && domain.状态 === '生效' && event === 'turn-start' && String(domain.参数?.触发时机).includes('回合开始')) {
        processDomainEffect(state, domain, unit, rng, receipt, '回合开始');
      }
    }
  }

  function refreshAllDomainMembership(state, rng, receipt) {
    recomputeDomainConflicts(state, receipt);
    for (const id of state.战斗.参与者ID列表) {
      const unit = state.战斗单位.列表[id];
      if (unit) refreshDomainMembershipForUnit(state, unit, rng, receipt, 'movement');
    }
  }

  function summonCandidates(state,actor,params,sourceSkill){
    return cleanList(actor.能力?.技能ID).map(id=>state.技能.列表[id]).filter(Boolean).filter(candidate=>{
      if(params.继承技能ID?.length&&!params.继承技能ID.includes(candidate.id))return false;
      if(params.继承环序上限!==undefined&&(skillRingOrdinal(state,candidate)<1||skillRingOrdinal(state,candidate)>params.继承环序上限))return false;
      if(params.同源继承&&skillMartialSoulId(candidate)!==skillMartialSoulId(sourceSkill))return false;
      if (candidate.id === sourceSkill?.id) return false;
      if(['consumable','hidden-weapon','soul-device'].includes(candidate.sourceKind)||candidate.effectGraph?.nodes?.some(n=>effects.EFFECT_REGISTRY[n.effectId]?.copyable===false))return false;
      if (['copied','summoned-copy'].includes(candidate.sourceKind)) return false;
      if (params.排除魂骨 && candidate.sourceKind === 'soul-bone') return false;
      if (params.排除领域 && candidate.effectGraph?.nodes?.some(item => item.effectId === 'domain.field')) return false;
      // 召唤体不能再次复制任何召唤技，避免镜像递归制造指数级单位与技能实例。
      if (candidate.effectGraph?.nodes?.some(item => item.effectId === 'summon.entity')) return false;
      if (effects.skillActivation(candidate.effectGraph) !== 'active' && (Number(params.技能效果倍率 ?? 20) < 100 || ['soul-device','soul-bone'].includes(candidate.sourceKind))) return false;
      return true;
    }).sort((a,b)=>params.固定继承?skillRingOrdinal(state,a)-skillRingOrdinal(state,b)||a.id.localeCompare(b.id):0);
  }
  function validateFixedSummonSelection(state,actor,params,skill,selected){if(!params.固定继承||selected===undefined)return;const allowed=summonCandidates(state,actor,params,skill).slice(0,params.技能继承数量).map(s=>s.id);if(!Array.isArray(selected)||selected.length!==allowed.length||new Set(selected).size!==allowed.length||selected.some(id=>!allowed.includes(id)))throw Error('此召唤固定继承已掌握的指定环序技能');}
  function summonLimitReason(state,actor,skill){const node=skill?.effectGraph?.nodes?.find(n=>n.effectId==='summon.entity'&&n.params.最大同时存在);if(!node)return '';const count=Object.values(state.战斗单位.列表).filter(u=>u.扩展?.召唤?.来源单位ID===actor.id&&u.扩展?.召唤?.来源技能ID===skill.id&&(isPresentParticipant(state,u.id)||u.扩展.召唤.constructId&&globalThis.SoulCreationCore.constructs(state).some(r=>r.id===u.扩展.召唤.constructId&&r.status==='active'))&&u.资源.生命.当前>0).length;return count+node.params.数量>node.params.最大同时存在?'该来源的召唤体已达到同时存在上限':'';}
  function summonSoulPowerAllocation(params,requested,available){
    const count=params.数量??1,cap=Number(params.魂力分配??0);
    const maximum=Math.min(cap,Math.floor(Math.max(0,available)/count));
    const allocated=requested??maximum;
    if(Object.hasOwn(params,'魂力分配')&&(!Number.isSafeInteger(allocated)||allocated<0||allocated>maximum))throw Error(`化身魂力分配须为0至${maximum}点的整数，不能超过每具化身上限或本体可用魂力`);
    return allocated;
  }
  function summonSelectionView(state,actor,skill,soulPowerCost=0,intent={}){
    const node=skill?.effectGraph?.nodes?.find(n=>n.effectId==='summon.entity'&&n.params.继承能力);if(!node)return null;
    const options=summonCandidates(state,actor,node.params,skill).filter(s=>!effects.soulRingCastRelease(effects.currentSoulRingCastSkill(state,actor,s)).reason).map(s=>({id:s.id,name:s.name??s.名称??s.id}));
    const maximum=summonSoulPowerAllocation(node.params,undefined,controls.availableSoulPower(state,actor.id)-soulPowerCost-avatarActivationLock(skill));
    const selected=node.params.固定继承?options.slice(0,node.params.技能继承数量).map(v=>v.id):intent.summonSkillIds??options.slice(0,node.params.技能继承数量).map(v=>v.id),allocation=Number.isSafeInteger(intent.summonSoulPower)&&intent.summonSoulPower>=0&&intent.summonSoulPower<=maximum?intent.summonSoulPower:maximum;
    let priced=options;
    try{
      const projected=projectionCore.fork(state).state,owner=projected.战斗单位.列表[actor.id],receipt={effects:[]};owner.资源.魂力.当前-=soulPowerCost;
      const source={...skill,_summonSkillIds:[],_summonSoulPower:allocation};summonEntities(projected,owner,node,'summon-cost-preview',receipt,source);
      const holder=projected.战斗单位.列表[receipt.effects.find(e=>e.effectId==='summon.entity').summonedUnitIds[0]];
      priced=options.map((option,index)=>{const original=effects.currentSoulRingCastSkill(state,actor,state.技能.列表[option.id]),copy=abilities.deriveCopy(original,{id:'summon-cost-preview-'+index,ownerId:holder.id,kind:'summoned-copy',sourceUnitId:actor.id,castSkillId:skill.id,scale:Number(node.params.技能效果倍率??100),...(node.params.离散缩放?{discreteScale:node.params.离散缩放}:{})});projected.技能.列表[copy.id]=copy;holder.能力.技能ID=[copy.id];holder.扩展.召唤.继承技能ID列表=[copy.id];
        const contract=abilities.describe(copy,skillPaymentOptions(projected,holder,copy)),cost=contract.costs.filter(c=>c.kind==='soulPower').reduce((sum,c)=>sum+c.amount,0);
        return {...option,soulPowerCost:cost,soulPowerCasts:cost?Math.floor(allocation/cost):null,cooldownTurns:Number(copy.cooldownTurns??0)};});
    }catch{}
    const selectedCosts=priced.filter(v=>selected.includes(v.id)),selectionSoulPowerCost=selectedCosts.every(v=>v.soulPowerCost!==undefined)?selectedCosts.reduce((sum,v)=>sum+v.soulPowerCost,0):null;
    return {options:priced,skillIds:options.map(v=>v.id),fixed:!!node.params.固定继承,maximumSkills:node.params.技能继承数量,defaultSkillIds:options.slice(0,node.params.技能继承数量).map(v=>v.id),selectionSoulPowerCost,selectedSequenceAffordable:selectionSoulPowerCost===null?null:selectionSoulPowerCost<=allocation,...(Object.hasOwn(node.params,'魂力分配')?{soulPower:{default:maximum,maximum,allocation,transferTotal:allocation*Number(node.params.数量??1),bodyTotal:soulPowerCost+allocation*Number(node.params.数量??1)}}:{})};
  }
  function inheritSummonedSkills(state, actor, summoned, params, sourceSkill, receiptId, summonIndex) {
    if (!params.继承能力 || Number(params.技能继承数量 ?? 0) <= 0) return [];
    const limit = Math.max(0,Number(params.技能继承数量 ?? 0));
    const selected=params.固定继承?undefined:sourceSkill?._summonSkillIds;
    const available=summonCandidates(state,actor,params,sourceSkill);
    const candidates=selected?selected.map(id=>available.find(candidate=>candidate.id===id)).filter(Boolean):available.slice(0,limit);
    if(selected?.length&&(selected.length>limit||selected.some(id=>!candidates.some(c=>c.id===id))))throw Error('所选继承技能不在已掌握的合法环序与数量范围内');
    const inheritedIds = [];
    for (const [skillIndex,candidate] of candidates.entries()) {
      const released=effects.currentSoulRingCastSkill(state,actor,candidate);
      if(effects.soulRingCastRelease(released).reason)continue;
      const inherited=abilities.deriveCopy(released,{id:`summoned-copy-${receiptId}-${summonIndex + 1}-${skillIndex + 1}`,ownerId:summoned.id,kind:'summoned-copy',sourceUnitId:actor.id,castSkillId:sourceSkill?.id??'',scale:Number(params.技能效果倍率??100),...(params.离散缩放?{discreteScale:params.离散缩放}:{})});
      state.技能.列表[inherited.id]=inherited;
      summoned.能力.技能ID = cleanList([...(summoned.能力?.技能ID ?? []),inherited.id]);
      inheritedIds.push(inherited.id);
    }
    return inheritedIds;
  }

  function removeSummonedSkills(state, unit, receipt = null, reason = 'summon-ended') {
    const summon=unit?.扩展?.召唤;
    if(summon?.manifestationSoulId)return [];
    const inheritedIds=cleanList([...(summon?.继承技能ID列表??[]),...(summon?.天生技能ID??[])]);
    if(summon){delete summon.指令;delete summon.天生技能ID;delete summon.接受指令;delete summon.招式来源;}
    if (!unit || !inheritedIds.length) return [];
    unit.能力.技能ID = cleanList(unit.能力?.技能ID).filter(id => !inheritedIds.includes(id));
    for (const id of inheritedIds) delete state.技能.列表[id];
    unit.扩展.召唤.继承技能ID列表 = [];
    receipt?.statusEvents?.push({unitId:unit.id,event:'summon-skills-removed',reason,skillIds:inheritedIds});
    return inheritedIds;
  }

  function summonEntities(state, actor, node, receiptId, targetReceipt, sourceSkill = null) {
    const created = [];
    const inherit = Boolean(node.params.继承能力);
    const count = node.params.数量 ?? 1;
    if(actor.扩展?.召唤&&node.params.天生招式)throw Error('召唤物无法繁衍携带天生招式的新召唤物');
    if(actor.扩展?.召唤&&node.params.继承能力)throw Error('继承化身不能再次制造继承化身');
    const transfers=Object.hasOwn(node.params,'魂力分配');
    const allocated=summonSoulPowerAllocation(node.params,sourceSkill?._summonSoulPower,controls.availableSoulPower(state,actor.id));
    if(transfers)(globalThis.SoulCombatDeployments.soulPowerResource(state,actor.id)).当前-=allocated*count;
    for (let index = 0; index < count; index += 1) {
      const id = `summon-${receiptId}-${node.id}-${index + 1}`;
      const attributeRatio = Number(node.params.属性继承百分比 ?? 0) / 100;
      const baseAttributes = Object.fromEntries(foundation.ATTRIBUTE_KEYS.map(key => [key, inherit && attributeRatio > 0
        ? Math.max(1,Math.floor((actor.六维.有效[key] ?? 10) * attributeRatio))
        : Math.max(1,(actor.六维.有效[key] ?? 10)-2)]));
      const unit = foundation.normalizeCombatant({
        id,
        名称: node.params.显形名 ? node.params.显形名+(count>1?String(index+1):'') : `${actor.名称}的${node.params.模板 ?? '灵体'}${index + 1}`,
        阵营: actor.阵营,
        单位种类: '魂师NPC',
        标签: ['召唤物', node.params.模板 ?? '灵体'],
        存活状态: '存活',
        六维: {基础: baseAttributes},
        位置: clone(actor.位置),
        能力: {技能ID: []},
        成长: {类型: '魂师', 魂力等级: actor.派生.有效等级},
        扩展: {召唤: {
          战斗ID:state.战斗.id,来源单位ID:actor.id,来源结算单ID:receiptId,来源技能ID:sourceSkill?.id ?? '',来源效果ID:node.id,剩余回合:node.params.持续回合 ?? 1,
          输出许可:sourceSkill?._outputPermission??controls.outputSnapshot(state,actor.id),
          继承能力:inherit,属性继承百分比:inherit ? Number(node.params.属性继承百分比 ?? 0) : 0,
          魂力继承百分比:inherit ? Number(node.params.魂力继承百分比 ?? 0) : 0,技能效果倍率:inherit ? Number(node.params.技能效果倍率 ?? 100) : 0,
          继承技能ID列表:[]
        }}
      }, {id, kind: '魂师NPC', level: actor.派生.有效等级});
      unit.扩展.普通攻击档案=abilities.seal({id:'ordinary.attack',name:'本能攻击',source:'summon-anatomy',soulPowerCost:0,requirements:['gesture'],effectSpecs:[['release.melee',{}],['target.single',{}],['check.physical_attack',{}],['payload.damage',{类型:'物理',骰数:1,骰面:4,加值:0}]]});
      unit.资源.生命.最大 = Math.max(1,Math.floor((inherit ? actor.资源.生命.最大 : unit.资源.生命.最大) * (node.params.生命百分比 ?? 10) / 100));
      unit.资源.生命.当前 = unit.资源.生命.最大;
      if (inherit && Number(node.params.魂力继承百分比 ?? 0) > 0) {
        unit.资源.魂力.最大 = Math.max(1,Math.floor((globalThis.SoulCombatDeployments.soulPowerResource(state,actor.id)).最大 * Number(node.params.魂力继承百分比 ?? 0) / 100));
        unit.资源.魂力.当前 = unit.资源.魂力.最大;
      }
      if(transfers){unit.资源.魂力.最大=Math.max(1,(globalThis.SoulCombatDeployments.soulPowerResource(state,actor.id)).最大);unit.资源.魂力.当前=allocated;unit.扩展.召唤.魂力实际分配=allocated;}
      unit.扩展.召唤.基础资源上限={生命:unit.资源.生命.最大,魂力:unit.资源.魂力.最大};
      const inheritedSkillIds = inheritSummonedSkills(state,actor,unit,node.params,sourceSkill,receiptId,index);
      unit.扩展.召唤.继承技能ID列表 = inheritedSkillIds;
      if(node.params.接受指令||node.params.天生招式)unit.扩展.召唤.招式来源=cleanSkillContract(sourceSkill?._sourceContract??sourceSkill);
      if(node.params.接受指令)unit.扩展.召唤.接受指令=true;
      if(node.params.天生招式){
        unit.扩展.召唤.天生技能ID=node.params.天生招式.map((art,i)=>{
          const key=`${id}-innate-${i+1}`;
          const ability=abilities.seal({id:key,name:art.名称,持有者单位ID:id,sourceKind:'summon-innate',ageTier:'千年',mechanismCap:'进阶',soulPowerCost:art.魂力,cooldownTurns:art.冷却,requirements:[],effectGraph:effects.makeLinearGraph(art.节点)});
          state.技能.列表[key]=ability;unit.能力.技能ID.push(key);return key;
        });
      }
      state.战斗单位.列表[id] = unit;
      if(node.params.持续方式==='世界分钟'){
        const row=globalThis.SoulCreationCore.registerConstruct(state,actor.id,actor.id,node,sourceSkill,receiptId,sourceSkill?._creationPayment,{unitId:id});
        unit.扩展.召唤.constructId=row.id;unit.扩展.召唤.expiresAt=row.expiresAt;
        if(sourceSkill?._fieldUse){unit.扩展.召唤.战斗ID='';created.push(id);continue;}row.battleId=state.战斗.id;
      }
      state.战斗.参与者ID列表.push(id);
      const sourceMember = battleMember(state, actor.id);
      state.战斗.扩展.成员[id] = {
        unitId: id,
        sideId: sourceMember?.sideId ?? actor.阵营,
        controller: 'ai',
        status: 'active',
        canFlee: false,
        morale: sourceMember?.morale ?? 50,
        surprisedRound: 0,
        joinedRound: state.战斗.回合,
        extension: {summonedBy: actor.id}
      };
      const teamId = state.战斗.扩展.成员[id].sideId;
      state.战斗.扩展.队伍[teamId] ??= {id: teamId, name: teamId, memberIds: []};
      state.战斗.扩展.队伍[teamId].memberIds = cleanList([...state.战斗.扩展.队伍[teamId].memberIds, id]);
      const order = state.战斗.扩展.先攻顺序;
      const insertAt = Math.max(0, order.indexOf(actor.id)) + 1 + index;
      order.splice(insertAt, 0, id);
      created.push(id);
    }
    targetReceipt.effects.push({
      effectId:node.effectId,nodeId:node.id,
      summonedUnitIds:created,
      ...(node.params.天生招式?{innateSkillsByUnit:Object.fromEntries(created.map(id=>[id,state.战斗单位.列表[id].扩展.召唤.天生技能ID.slice()]))}:{}),
      ...(transfers?{soulPowerTransfer:{payerId:actor.id,total:allocated*count,perUnit:allocated}}:{}),
      inheritedSkillsByUnit:Object.fromEntries(created.map(id => [id,clone(state.战斗单位.列表[id]?.扩展?.召唤?.继承技能ID列表 ?? [])]))
    });
  }

  function healingMultiplier(state, target) {
    const reduction = activeStatuses(state, target.id, 'status.eternal_wound')
      .reduce((maximum, status) => Math.max(maximum, Number(status.快照?.参数?.治疗削减百分比 ?? 0)), 0);
    return clamp(1 - reduction / 100, 0, 1);
  }

  function recoverConsciousness(state, target) {
    if (target.存活状态 === '昏迷' && target.资源.生命.当前 > 0
      && (!state.人物?.列表?.[target.id] || !people.isDead(state, target.id))) target.存活状态 = '存活';
  }

  function resourceRestoreAmount(resource, mode, value) {
    const missing = Math.max(0, Number(resource.最大 ?? 0) - Number(resource.当前 ?? 0));
    if (mode === '恢复至上限') return missing;
    if (mode === '缺失比例') return Math.floor(missing * Number(value ?? 0) / 100);
    if (mode === '定量') return Math.max(0, Number(value ?? 0));
    return 0;
  }

  function restoreResources(state, target, node, targetReceipt, skill) {
    const params = node.params ?? {};
    const outputScale = baseRuntimeOutputScale(skill);
    const upcastBonus = consumeUpcastBonus(skill, node);
    const fixedModes = [params.生命模式 === '定量', params.魂力模式 === '定量'].filter(Boolean).length;
    const hpBonus = params.生命模式 === '定量' && fixedModes ? Math.ceil(upcastBonus / fixedModes) : 0;
    const spBonus = params.魂力模式 === '定量' && fixedModes ? Math.floor(upcastBonus / fixedModes) : 0;
    const hpRequested = Math.floor((resourceRestoreAmount(target.资源.生命, params.生命模式, params.生命数值) + hpBonus) * outputScale * healingMultiplier(state, target));
    const spRequested = Math.floor((resourceRestoreAmount((globalThis.SoulCombatDeployments.soulPowerResource(state,target.id)), params.魂力模式, params.魂力数值) + spBonus) * outputScale);
    const hpBefore = target.资源.生命.当前;
    const spBefore = (globalThis.SoulCombatDeployments.soulPowerResource(state,target.id)).当前;
    target.资源.生命.当前 = Math.min(target.资源.生命.最大, hpBefore + hpRequested);
    (globalThis.SoulCombatDeployments.soulPowerResource(state,target.id)).当前 = Math.min((globalThis.SoulCombatDeployments.soulPowerResource(state,target.id)).最大, spBefore + spRequested);
    recoverConsciousness(state, target);
    targetReceipt.effects.push({effectId: node.effectId, upcastBonus, lifeRestored: target.资源.生命.当前 - hpBefore, soulPowerRestored: (globalThis.SoulCombatDeployments.soulPowerResource(state,target.id)).当前 - spBefore, remainingHp: target.资源.生命.当前, remainingSoulPower: (globalThis.SoulCombatDeployments.soulPowerResource(state,target.id)).当前});
  }

  function removeCopiedSkills(state, unit, status) {
    const copiedIds = cleanList(status?.扩展?.复制技能ID列表);
    if (!copiedIds.length || !unit) return;
    unit.能力.技能ID = cleanList(unit.能力?.技能ID).filter(id => !copiedIds.includes(id));
    for (const id of copiedIds) delete state.技能.列表[id];
  }

  function copySkillCandidates(state, actor, target, node, intent, skill) {
    const sourceId = String(intent?.copySourceUnitId ?? intent?.sourceUnitId ?? (target.id !== actor.id ? target.id : '')).trim();
    const source = state.战斗单位.列表[sourceId];
    if (!source || source.id === actor.id) throw new Error('技能复制需要指定另一名有效单位作为复制来源');
    const params = node.params ?? {};
    const candidates = cleanList(source.能力?.技能ID).map(id => state.技能.列表[id]).filter(Boolean).filter(candidate => {
      if(['consumable','hidden-weapon','soul-device'].includes(candidate.sourceKind)||candidate.effectGraph?.nodes?.some(n=>effects.EFFECT_REGISTRY[n.effectId]?.copyable===false))return false;
      if (params.排除魂骨 && candidate.sourceKind === 'soul-bone') return false;
      if (params.排除领域 && candidate.effectGraph?.nodes?.some(item => item.effectId === 'domain.field')) return false;
      return candidate.id !== skill?.id && candidate.sourceKind !== 'copied' && (effects.skillActivation(candidate.effectGraph) === 'active' || Number(params.复制比例 ?? 100) === 100);
    }).slice(0, Number(params.最大技能数 ?? 1));
    if (!candidates.length) throw new Error('复制来源没有符合排除规则的技能');
    return {source,candidates};
  }

  function copySkills(state, actor, target, node, intent, receiptId, targetReceipt, skill) {
    const {source,candidates} = copySkillCandidates(state,actor,target,node,intent,skill);
    const params = node.params ?? {};
    const status = applyStatus(state, actor, actor, node, receiptId, targetReceipt, skill);
    const copiedIds = [];
    for (const [index, candidate] of candidates.entries()) {
      const released=effects.currentSoulRingCastSkill(state,source,candidate);
      if(effects.soulRingCastRelease(released).reason)continue;
      const copied=abilities.deriveCopy(released,{id:`copied-${receiptId}-${index + 1}`,ownerId:actor.id,kind:'copied',sourceUnitId:source.id,castSkillId:skill?.id??'',scale:Number(params.复制比例??100)});
      state.技能.列表[copied.id]=copied;
      actor.能力.技能ID = cleanList([...(actor.能力?.技能ID ?? []), copied.id]);
      copiedIds.push(copied.id);
    }
    status.扩展.复制技能ID列表 = copiedIds;
    targetReceipt.effects.push({effectId: node.effectId, sourceUnitId: source.id, copiedSkillIds: copiedIds});
  }

  function executeNode(state, actor, target, node, rng, critical, receiptId, targetReceipt, intent, skill = null) {
    if(node.effectId==='modifier.world_duration'||node.effectId==='trigger.contract')throw Error('条件与期限节点不能直接施放');
    if(node.effectId==='contract.oath'){
      const core=globalThis.SoulPersonContracts;if(!core?.installFromRelease)throw Error('灵魂誓约尚未接通签订流程');
      const original=skill?._sourceContract??skill,branch=effects.graphBranches(original.effectGraph).find(b=>b.nodes.some(n=>n.id===node.id)),selection=core.get(state,skill?._personContractFormation?.contractId)?.versions.at(-1)?.source?.selection,group=branch?.nodes.find(n=>n.effectId==='trigger.contract')?.params?.处罚方式==='组合',numericNodes=branch?.nodes.filter(n=>['payload.soul_damage','payload.damage'].includes(n.effectId)&&(group||n.id===selection?.nodeId))??[],numericBonuses=Object.fromEntries(numericNodes.map(n=>[n.id,consumeUpcastBonus(skill,n)]));
      const formed=core.installFromRelease(state,{actorId:actor.id,targetId:target.id,nodeId:node.id,skill:original,release:releasedEffectSource(original,{outputScale:baseRuntimeOutputScale(skill),numericOutputScale:baseRuntimeOutputScale(effectiveOutputSkill(state,actor.id,skill)),...(numericNodes.length?{numericBonuses}:{}),...(skill?._upcast?{upcast:clone(skill._upcast)}:{})}),payment:skill?._creationPayment,sourceId:receiptId,formationContext:skill?._personContractFormation});targetReceipt.effects.push(formed);return formed;
    }
    if(!contractPenaltyExecutions.has(skill))node=effects.effectiveExecutionNode(skill?._sourceContract??skill,node);
    const condition=skill?.effectConditions?.[node.id];
    if(condition){const tested=globalThis.SoulTargetConditions.evaluate(state,{actorId:actor.id,targetId:target.id},condition);if(!tested.pass){targetReceipt.effects.push({effectId:node.effectId,nodeId:node.id,prevented:tested.reason});return;}}
    if(node.params?.命中后抵抗){
      if(!targetReceipt.check?.hit)return;
      const saveReceipt={effects:[]},checked=rollCheck(state,actor,target,{effectId:'check.save',family:'check',params:{属性:node.params.抵抗属性??'力量'}},rng,saveReceipt,skill);
      targetReceipt.effects.push({effectId:node.effectId,secondarySave:clone(saveReceipt.check),resisted:!checked.affected});
      if(!checked.affected)return;
    }
    if(['realm.capture','realm.store'].includes(node.effectId)){if(!skill?._fieldUse)throw Error('请在战斗及必要结算结束后主动收入');let result;try{result=globalThis.SoulResidentRealms.capture(state,actor.id,target.id,skill._sourceContract??skill,receiptId,skill._creationPayment,{nodeId:node.id,sourceItemProof:skill._realmSourceItemProof,costBasis:skill._realmCostBasis});}catch(error){if(error.code!=='realm-qualification'||!globalThis.SoulEffectCompiler.graphBranches(skill._sourceContract?.effectGraph??skill.effectGraph).some(b=>{const i=b.nodes.findIndex(n=>n.id===node.id);return i>=0&&b.nodes.slice(0,i).some(n=>['status.mind_control','status.soul_control','status.cognition_shift'].includes(n.effectId));}))throw error;result={effectId:node.effectId,nodeId:node.id,prevented:'前置控制未成立或认知改造尚未完成，未收入空间'};}targetReceipt.effects.push(result);return result;}
    if(globalThis.SoulDeviceOperations.EFFECT_TYPES[node.effectId]){
      if(!skill?._deviceTicket||!skill?._deviceTarget)throw Error('器具能力缺少本次正常施放的实际支付票据');
      const result=globalThis.SoulDeviceOperations.applyEffect(state,skill._deviceTicket,node.id,skill._deviceTarget,{rng,createKey:(s,templateId,ownerId,containerId,spec)=>globalThis.SoulWorldEngine.createItem(s,templateId,ownerId,containerId,spec)});
      if(result.success&&result.consequence==='destroy-item'){removeCustodyDeviceStatuses(state,result.itemId,'restraint-disabled');pruneMaintenance(state);}
      targetReceipt.effects.push({effectId:node.effectId,nodeId:node.id,...result});return result;
    }
    const ageReason=controls.adultReason(state,actor.id,node)||controls.adultReason(state,target.id,node);if(ageReason){targetReceipt.effects.push({effectId:node.effectId,nodeId:node.id,prevented:ageReason});return;}
    if(effects.EFFECT_REGISTRY[node.effectId]?.hitRule?.inline)return;
    const actionReceipt=actionEvidence.get(state)?.receipt??{id:receiptId};
    if(node.effectId==='status.battle_resource'||node.effectId==='payload.resource_endstate')return;
    if(node.effectId==='payload.resource_damage'){
      const consumption=skill?._battleResourceConsumption?.[node.id];if(!consumption)throw Error('累计转化攻击缺少本次真实消费');
      const p=node.params,n=consumption.credited;
      targetReceipt.effects.push({effectId:node.effectId,resourceSlot:p.资源槽,consumed:consumption.amount,credited:n});
      return applyDamage(state,actor,target,{...node,effectId:'payload.damage',params:{类型:p.类型,骰数:Number(p.骰数??0)+n*Number(p.每层骰数??0),骰面:p.骰面??6,加值:Number(p.加值??0)+n*Number(p.每层加值??0),穿透档:p.穿透档??0}},rng,critical,targetReceipt,effectiveOutputSkill(state,actor.id,skill));
    }
    if(node.effectId==='payload.stack_confluence'){
      const held=skill?._confluences?.[node.id];if(!held)throw Error('合流缺少本次真实消费');
      targetReceipt.effects.push({effectId:node.effectId,consumed:held.count,sourceStatusIds:held.chunks.map(c=>c.statusId)});
      for(const chunk of held.chunks)applyChargeDamage(state,actor,target,chunk,rng,critical,targetReceipt,receiptId);
      return;
    }
    if(node.effectId==='payload.zone_dispel'){
      if(skill._mechanicApplied[node.id])return;skill._mechanicApplied[node.id]=true;
      const center=unitPoint(actor),radius=Number(node.params.半径区??0)*BATTLEFIELD.zoneLength+10;
      const zones=activeZones(state,'obscure').filter(z=>z.可驱散!==false&&!z.不可驱散&&!z.扩展?.固定交换义务&&pointDistance(center,battlePoint(z.战场坐标))<=radius+10).sort((a,b)=>a.id.localeCompare(b.id)).slice(0,node.params.最大数量);
      for(const zone of zones)removeZone(state,zone.id,'area-dispelled');
      targetReceipt.effects.push({effectId:node.effectId,removedZoneIds:zones.map(z=>z.id)});return;
    }
    if(node.effectId==='status.next_check_penalty'){
      if(node.params.命中后抵抗){
        if(!targetReceipt.check?.hit)return;
        const saved={effects:[]},checked=rollCheck(state,actor,target,{effectId:'check.save',family:'check',params:{属性:node.params.抵抗属性??'意志'}},rng,saved,skill);
        targetReceipt.effects.push({effectId:node.effectId,secondarySave:clone(saved.check),resisted:!checked.affected});
        if(!checked.affected)return;
      }
      const status=applyStatus(state,actor,target,node,receiptId,targetReceipt,skill);if(status)status.扩展.剩余次数=node.params.次数??1;return;
    }
    if(node.effectId==='status.limited_followup'){
      const status=applyStatus(state,actor,target,node,receiptId,targetReceipt,skill);
      if(status){status.层数=node.params.层数;status.扩展.剩余次数=status.层数;status.扩展.作用来源=mechanics.scope(skill);status.扩展.追击来源合同=cleanSkillContract(skill?._sourceContract??skill);targetReceipt.effects.push({effectId:node.effectId,event:'charges-created',statusId:status.id,resourceSlot:node.params.资源槽,charges:status.层数});emitMechanicEvent(state,actor,skill,'charges-created',node.params.事件槽,node.params.层数,actionReceipt);}
      return;
    }
    if(skill&&['payload.damage','payload.residual','payload.heal','payload.shield','payload.drain','payload.soul_damage','payload.soul_restore','payload.restore'].includes(node.effectId))skill=effectiveOutputSkill(state,actor.id,skill);
    node = effectOutputProfile(node,skill).node;
    if(node.effectId==='payload.recon'){
      if(!skill?._fieldUse)throw Error('请在场外发动侦察');
      const report=globalThis.SoulSummonOrders.observe(state,actor.id,node,skill._fieldScope.reconLocationId);
      targetReceipt.effects.push({effectId:node.effectId,report});return;
    }
    if(['payload.repair_item','payload.fabricate'].includes(node.effectId)){const options=skill?._fieldScope??globalThis.SoulCreationCore.resolveItemOptions(state,actor.id,target.id,node,intent),result=globalThis.SoulCreationCore.applyItemEffect(state,actor.id,target.id,node,skill,options,receiptId,skill?._creationPayment);targetReceipt.effects.push(result);return result;}
    if(!contractPenaltyExecutions.has(skill)&&effects.effectPolarity(node.effectId,node.params)==='harmful'&&!['payload.damage','payload.residual'].includes(node.effectId)){const release=skill?.effectGraph?.nodes?.find(n=>n.family==='release'),wall=wallOnPath(state,actor.位置,target.位置,release?.effectId==='release.projectile'?'投射':'移动');if(wall){targetReceipt.effects.push({effectId:node.effectId,prevented:'墙体阻隔',sources:[wall.id]});return;}}
    if(node.effectId==='payload.death'){
      const targetBattle=actions.battleOf(state,target.id);
      if(!contractPenaltyExecutions.has(skill)&&targetBattle?.状态==='进行中'&&targetBattle.id===actions.battleOf(state,actor.id)?.id&&targetBattle.扩展?.规则?.nonlethal)throw Error('非致命战斗不能施放死亡效果');
      const already=target.存活状态==='死亡',before=target.资源.生命.当前;
      if(state.人物?.列表?.[target.id])people.die(state,target.id,'死亡能力',receiptId);else{target.存活状态='死亡';target.资源.生命.当前=0;target.扩展??={};target.扩展.真实死亡来源={sourceId:receiptId,actorId:actor.id,skillId:skill?.id??'',nodeId:node.id,at:battleNow(state)};}
      const receipt=actionEvidence.get(state)?.receipt;if(receipt)recordKill(state,target.id,actor.id,receipt,{type:'direct',id:node.id,skillId:skill?.id??''});
      targetReceipt.effects.push({effectId:node.effectId,nodeId:node.id,dead:true,alreadyDead:already,healthBefore:before,remainingHp:0,deathId:state.人物?.列表?.[target.id]?.life?.death?.id??null});return;
    }
    if (node.effectId === 'payload.damage' || node.effectId === 'payload.residual') return applyDamage(state, actor, target, node, rng, critical, targetReceipt, skill);
    if (node.effectId === 'payload.drain') return drainLife(state, actor, target, node, rng, critical, targetReceipt, skill);
    if (node.effectId === 'payload.shield') {
      const dice = rollDice(rng, node.params.骰数 ?? 1, node.params.骰面 ?? 4, '护盾');
      const avatarOutputBonus = martialAvatarBonus(state, actor, skill, '同源魂技增幅') * 2;
      const upcastBonus = consumeUpcastBonus(skill, node);
      const amount = Math.max(0, Math.floor((dice.total + (node.params.加值 ?? 0) + Math.max(0, attributeModifier(state, actor, '意志')) + avatarOutputBonus + upcastBonus) * baseRuntimeOutputScale(skill)*(1+support.percent(state,actor.id,'shield','',skill)/100)));
      const shieldSource=node.领域实例ID?state.战斗.扩展.领域实例[node.领域实例ID]?.来源?.结算单ID:receiptId;
      const shield = foundation.grantTemporaryHealth(target, amount, shieldSource, node.领域实例ID,(node.params.护盾回合??0)+(node.params.护盾回合&&state.战斗.当前行动单位ID===target.id?1:0));
      targetReceipt.effects.push({
        effectId: node.effectId, dice, avatarOutputBonus, upcastBonus,
        rolledAmount: amount, offeredAmount: shield.offered, amount: shield.gained,
        temporaryHpBefore: shield.before, temporaryHp: shield.after, unusedAmount: shield.unused
      });
    } else if (node.effectId === 'payload.heal') {
      const dice = rollDice(rng, node.params.骰数 ?? 1, node.params.骰面 ?? 4, '治疗');
      const avatarOutputBonus = martialAvatarBonus(state, actor, skill, '同源魂技增幅') * 2;
      const upcastBonus = consumeUpcastBonus(skill, node);
      const attributeBonus=node.params.附加悟性===false?0:Math.max(0,attributeModifier(state,actor,'悟性'));
      const amount = Math.max(0, Math.floor((dice.total + (node.params.加值 ?? 0) + attributeBonus + avatarOutputBonus + upcastBonus) * healingMultiplier(state, target) * baseRuntimeOutputScale(skill)*(1+support.percent(state,actor.id,'heal','',skill)/100)));
      const actual = Math.min(amount, target.资源.生命.最大 - target.资源.生命.当前);
      target.资源.生命.当前 += actual;
      recoverConsciousness(state, target);
      targetReceipt.effects.push({effectId: node.effectId, dice, avatarOutputBonus, upcastBonus, amount: actual, remainingHp: target.资源.生命.当前});
    } else if (node.effectId === 'payload.restore') restoreResources(state, target, node, targetReceipt, skill);
    else if (node.effectId === 'payload.soul_damage' || node.effectId === 'payload.soul_restore') {
      const sign = node.effectId === 'payload.soul_damage' ? -1 : 1;
      const before = (globalThis.SoulCombatDeployments.soulPowerResource(state,target.id)).当前;
      const upcastBonus = consumeUpcastBonus(skill, node);
      const requested=Math.floor(((node.params.数值 ?? 1) + upcastBonus) * baseRuntimeOutputScale(skill));
      const amount=sign<0?controls.limitedDamage(state,actor.id,requested,skill?._outputPermission,skill?._damageRemainders,`${actor.id}:${target.id}:魂力`):requested;
      (globalThis.SoulCombatDeployments.soulPowerResource(state,target.id)).当前 = clamp(before + sign * amount, 0, (globalThis.SoulCombatDeployments.soulPowerResource(state,target.id)).最大);
      targetReceipt.effects.push({effectId: node.effectId, upcastBonus, amount: (globalThis.SoulCombatDeployments.soulPowerResource(state,target.id)).当前 - before, remainingSoulPower: (globalThis.SoulCombatDeployments.soulPowerResource(state,target.id)).当前});
    } else if (node.effectId === 'payload.cleanse') cleanseStatuses(state, target, node, targetReceipt,{actorId:actor.id,sourceId:receiptId,skill,node,payment:skill?._creationPayment,releasedMedicine:skill?._releasedMedicine,legacyDeviceRemoval:skill?._deviceContextVersion===0});
    else if (node.effectId === 'payload.dispel') dispelEffects(state, target, node, targetReceipt,{actorId:actor.id,sourceId:receiptId,skill,node,payment:skill?._creationPayment,releasedMedicine:skill?._releasedMedicine,legacyDeviceRemoval:skill?._deviceContextVersion===0});
    else if (node.effectId === 'payload.revive') reviveTarget(state, target, node, targetReceipt,receiptId);
    else if (node.effectId === 'copy.skillset') copySkills(state, actor, target, node, intent, receiptId, targetReceipt, skill);
    else if (node.effectId === 'intimate.stimulate' || node.effectId === 'intimate.climax') {
      const core=globalThis.SoulIntimateCore;
      if(!core)throw Error('情具模块未装载');
      const amount=node.effectId==='intimate.climax'?100:Math.max(0,Number(node.params.数值)||0);
      const result=core.applyStimulus(state,target.id,amount,{at:battleNow(state)}),climax=result.events.some(event=>event.type==='climax');
      targetReceipt.effects.push({effectId:node.effectId,part:node.params.部位??'下体前',amount,arousal:result.生理.快感,climax});
      if(climax){
        state.扩展.intimateEvents??=[];
        const event={id:`intimate:${state.扩展.intimateEvents.length+1}`,type:'climax',targetId:target.id,at:battleNow(state),forced:true,source:['skill']};
        state.扩展.intimateEvents.push(event);
        const source=physiologicalStunSource(actor.id,target.id,receiptId,event.id,skill),derived={targetId:target.id,skillId:source.id,effects:[]};
        const status=applyStatus(state,target,target,source.effectGraph.nodes[1],receiptId,derived,source);
        if(status)status.持续.延后首次目标回合结束=actor.id===target.id;
        targetReceipt.effects.push(...derived.effects);
      }
    }
    else if (node.effectId==='reaction.interpose'){if(actor.id!==target.id&&sameSide(state,actor,target))applyStatus(state,actor,target,node,receiptId,targetReceipt,skill);}
    else if (node.family === 'status') applyStatus(state, actor, target, node, receiptId, targetReceipt, skill);
    else if (node.family === 'movement') moveByEffect(state, actor, target, node, intent, receiptId, targetReceipt, skill);
    else if (node.family === 'zone') createZone(state, actor, target, node, receiptId, targetReceipt, skill);
    else if (node.family === 'domain') createDomain(state, actor, target, node, receiptId, targetReceipt, rng, skill);
    else if (node.family === 'summon') summonEntities(state, actor, node, receiptId, targetReceipt, skill);
    else if (node.effectId === 'transform.martial_avatar') applyMartialAvatar(state, actor, target, node, receiptId, targetReceipt, skill);
    else if (node.family === 'transform' || node.family === 'reaction') applyStatus(state, actor, target, node, receiptId, targetReceipt, skill);
    else if (node.effectId === 'sustain.maintain') {
      const sourceKey=`${receiptId}:${node.id}:${actor.id}`;
      state.战斗.扩展.维持占用??={};
      if(state.战斗.扩展.维持占用[sourceKey])return;
      const lock = node.params.锁定魂力 ?? 1;
      const modifiers=actor.扩展?.武魂战斗修正??{};
      const baseUpkeep=node.params.每回合魂力??0;
      const perTarget=node.params.计费方式==='逐目标';
      const upkeep=perTarget?0:Math.max(0,baseUpkeep+Number(modifiers.维持额外消耗??0)-Number(modifiers.维持减耗??0));
      const lockedBefore=(globalThis.SoulCombatDeployments.soulPowerResource(state,actor.id)).锁定;
      if(controls.availableSoulPower(state,actor.id)<lock)throw Error('维持效果需要足额锁定魂力');
      (globalThis.SoulCombatDeployments.soulPowerResource(state,actor.id)).锁定 += lock;
      (globalThis.SoulCombatDeployments.soulPowerResource(state,actor.id)).持续消耗 += upkeep;
      state.战斗.扩展.维持占用 ??= {};
      state.战斗.扩展.维持占用[sourceKey]={unitId:actor.id,sourceId:receiptId,nodeId:node.id,lock:(globalThis.SoulCombatDeployments.soulPowerResource(state,actor.id)).锁定-lockedBefore,upkeep,...(perTarget?{perTarget:true,skillId:skill.id}:{})};
      targetReceipt.effects.push({effectId: node.effectId, requestedLockedSoulPower:lock,lockedSoulPower:(globalThis.SoulCombatDeployments.soulPowerResource(state,actor.id)).锁定-lockedBefore,upkeep,baseUpkeep});
    }
  }

  function skillUsageKey(skill) {return String(skill.usageKey||skill.usageRules?.worldUsageGroup||skill.id);}
  function endCooldown(skill){return skill?.effectGraph?.nodes?.some(n=>n.params?.冷却起点==='结束');}
  function skillUsageOwner(state,actor,skill) {
    if(skill.sourceKind!=='summoned-copy')return actor;
    const sourceId=globalThis.SoulCombatDeployments.sourceContext(state,actor.id)?.quotaOwnerId??actor.扩展?.召唤?.来源单位ID,source=state.战斗单位.列表[sourceId];
    if(!source||skill.扩展?.copiedFromUnitId!==sourceId)throw Error('分身额度来源不完整');
    return source;
  }
  function skillModes(skill) {return skill.castModes?.length?skill.castModes.map(mode=>({...skill,_modeId:mode.id})):[skill];}

  const skillUsageRules=abilities.skillUsageRules;

  function skillUsageAvailability(state, actor, skill, fieldUse = false) {
    const owner=skillUsageOwner(state,actor,skill);
    const rules = skillUsageRules(skill),battle=fieldUse?null:actions.battleOf(state,actor.id),usageKey=skillUsageKey(skill);
    const battleUsed = fieldUse ? 0 : Math.max(0, round(battle?.扩展?.技能使用次数?.[owner.id]?.[usageKey] ?? 0));
    const battleGroupUsed = !fieldUse && rules.perBattleGroup
      ? Math.max(0, round(battle?.扩展?.技能组使用次数?.[owner.id]?.[rules.perBattleGroup] ?? 0))
      : 0;
    const day = state.世界?.时间?Math.floor(people.personalNow(state,owner.id)/1440):0;
    const prior = owner.扩展?.技能使用日账?.[usageKey] ?? {day, count: 0};
    const dailyUsed = prior.day === day ? Math.max(0, round(prior.count ?? 0)) : 0;
    const worldReadyDay = rules.worldCooldownDays > 0 && Number.isFinite(Number(prior.lastUsedDay))
      ? Number(prior.lastUsedDay) + rules.worldCooldownDays
      : day;
    const cooldownRemaining=fieldUse?Math.max(0,Number(owner.扩展?.场外技能冷却?.[usageKey]??0)-(state.世界?.时间?people.personalNow(state,owner.id):0)):Number(battle?.扩展?.技能冷却?.[owner.id]?.[usageKey]??0);
    let reason = '';
    if (rules.perBattleLimit > 0 && battleUsed >= rules.perBattleLimit) reason = `${skill.name ?? skill.id}本场最多使用${rules.perBattleLimit}次`;
    else if (rules.perBattleGroupLimit > 0 && battleGroupUsed >= rules.perBattleGroupLimit) reason = `${rules.perBattleGroupLabel || '同组能力'}本场合计最多使用${rules.perBattleGroupLimit}次`;
    else if (rules.dailyLimit > 0 && dailyUsed >= rules.dailyLimit) reason = `${skill.name ?? skill.id}已达到每日${rules.dailyLimit}次限制`;
    else if (rules.worldCooldownDays > 0 && day < worldReadyDay) reason = `${skill.name ?? skill.id}处于世界日冷却，最早第${worldReadyDay}日可再次使用`;
    else if(cooldownRemaining>0)reason=`${skill.name??skill.id}仍在冷却：${cooldownRemaining}${fieldUse?'分钟':'回合'}`;
    if(endCooldown(skill)&&Object.values(state.扩展?.abilityMaintenance??{}).some(e=>e.actorId===actor.id&&e.skillId===skill.id))reason='这项能力正在维持，可以主动结束后再施放';
    reason=summonLimitReason(state,actor,skill)||reason;
    reason = foundation.intrinsicSoulSkillBlockReason(actor,skill) || reason;
    return {
      available: !reason, reason, rules,
      perBattleUsed: battleUsed,
      perBattleRemaining: rules.perBattleLimit > 0 ? Math.max(0, rules.perBattleLimit - battleUsed) : null,
      perBattleGroupUsed: battleGroupUsed,
      perBattleGroupRemaining: rules.perBattleGroupLimit > 0 ? Math.max(0, rules.perBattleGroupLimit - battleGroupUsed) : null,
      dailyUsed,
      dailyRemaining: rules.dailyLimit > 0 ? Math.max(0, rules.dailyLimit - dailyUsed) : null,
      worldReadyDay,cooldownRemaining,quotaOwnerId:owner.id
    };
  }

  function validateAndRecordSkillUsage(state, actor, skill, fieldUse = false) {
    const owner=skillUsageOwner(state,actor,skill);
    const battle=fieldUse?null:actions.battleOf(state,actor.id),usageKey=skillUsageKey(skill);
    const availability = skillUsageAvailability(state, actor, skill, fieldUse);
    if (!availability.available) throw new Error(availability.reason);
    const rules = fieldUse ? {...availability.rules,perBattleLimit:0,perBattleGroupLimit:0} : availability.rules;
    const cooldown=endCooldown(skill)?0:Number(skill.cooldownTurns??0);
    if(cooldown>0){
      if(fieldUse){owner.扩展.场外技能冷却??={};owner.扩展.场外技能冷却[usageKey]=people.personalNow(state,owner.id)+cooldown;}
      else if(battle){battle.扩展.技能冷却??={};battle.扩展.技能冷却[owner.id]??={};battle.扩展.技能冷却[owner.id][usageKey]=cooldown;}
    }
    if (rules.perBattleLimit > 0) {
      battle.扩展.技能使用次数 ??= {};
      battle.扩展.技能使用次数[owner.id] ??= {};
      battle.扩展.技能使用次数[owner.id][usageKey] = availability.perBattleUsed + 1;
    }
    if (rules.perBattleGroup && rules.perBattleGroupLimit > 0) {
      battle.扩展.技能组使用次数 ??= {};
      battle.扩展.技能组使用次数[owner.id] ??= {};
      battle.扩展.技能组使用次数[owner.id][rules.perBattleGroup] = availability.perBattleGroupUsed + 1;
    }
    if (!rules.dailyLimit && !rules.worldCooldownDays) {
      if (!rules.perBattleLimit && !rules.perBattleGroupLimit) return null;
      return {
        ...availability,
        perBattleUsed: rules.perBattleLimit > 0 ? availability.perBattleUsed + 1 : availability.perBattleUsed,
        perBattleRemaining: rules.perBattleLimit > 0 ? Math.max(0,rules.perBattleLimit-availability.perBattleUsed-1) : null,
        perBattleGroupUsed: rules.perBattleGroupLimit > 0 ? availability.perBattleGroupUsed + 1 : availability.perBattleGroupUsed,
        perBattleGroupRemaining: rules.perBattleGroupLimit > 0 ? Math.max(0,rules.perBattleGroupLimit-availability.perBattleGroupUsed-1) : null
      };
    }
    const day = state.世界?.时间?Math.floor(people.personalNow(state,owner.id)/1440):0;
    owner.扩展 ??= {};
    owner.扩展.技能使用日账 ??= {};
    const prior = owner.扩展.技能使用日账[usageKey] ?? {day, count: 0, lastUsedDay: Number.NEGATIVE_INFINITY};
    const count = prior.day === day ? Number(prior.count ?? 0) : 0;
    const entry = {day, count: count + 1, lastUsedDay: day, dailyLimit: rules.dailyLimit, worldCooldownDays: rules.worldCooldownDays};
    owner.扩展.技能使用日账[usageKey] = entry;
    return {
      ...availability, dailyEntry:entry,
      perBattleUsed: rules.perBattleLimit > 0 ? availability.perBattleUsed + 1 : availability.perBattleUsed,
      perBattleRemaining: rules.perBattleLimit > 0 ? Math.max(0,rules.perBattleLimit-availability.perBattleUsed-1) : null,
      perBattleGroupUsed: rules.perBattleGroupLimit > 0 ? availability.perBattleGroupUsed + 1 : availability.perBattleGroupUsed,
      perBattleGroupRemaining: rules.perBattleGroupLimit > 0 ? Math.max(0,rules.perBattleGroupLimit-availability.perBattleGroupUsed-1) : null,
      dailyUsed:count + 1,
      dailyRemaining:rules.dailyLimit > 0 ? Math.max(0,rules.dailyLimit-count-1) : null
    };
  }

  function consumeNextSkillModifier(state, modifier) {
    if (!modifier) return;
    modifier.扩展.剩余次数 = Math.max(0, Number(modifier.扩展?.剩余次数 ?? 1) - 1);
    if (modifier.扩展.剩余次数 <= 0) removeStatus(state,modifier,'consumed');
  }

  // Manufacturing is an out-of-battle use of an owned ability. It shares the
  // same source, resource, daily-use and cooldown checks as a combat activation.
  // Return a private copy so the surrounding world transaction stays atomic.
  function manufacturingModifierContext(rawState,actorId,skillId) {
    const state=foundation.normalizeState(clone(rawState));
    actions.resolve(state,{actorId,battleId:null});
    const actor=state.战斗单位.列表[actorId];
    if(!actor||!cleanList(actor.能力?.技能ID).includes(skillId))throw Error('制造增幅不属于当前角色');
    const skill=getSkill(state,actor,skillId),node=skill?.effectGraph?.nodes?.find(node=>node.effectId==='modifier.next_skill');
    if(!node)throw Error('所选能力不能用于制造增幅');
    const validation=effects.validateGraph(skill.effectGraph,{ageTier:skill.ageTier??'十万年',mechanismCap:skill.mechanismCap??'规则'});
    if(!validation.pass)throw Error('制造增幅能力尚未形成可用效果');
    validateSkillSpecialRequirements(state,actor,skill);
    const source=externalSourceItem(state,actor,skill),usage=skillUsageAvailability(state,actor,skill,true);
    if(!usage.available)throw Error(usage.reason);
    return {state,actor,skill,node,source,usage};
  }
  function quoteManufacturingModifier(rawState,actorId,skillId,recipeCost=0,modeId) {
    const {state,actor,skill,node,source,usage}=manufacturingModifierContext(rawState,actorId,skillId);
    const payment=quoteSkillUse(state,actor,skill,{fieldUse:true,modeId,additionalCosts:recipeCost?[{kind:'soulPower',amount:recipeCost}]:[]});
    return {skillId:skill.id,name:skill.name,params:clone(effectOutputProfile(node,skill).node.params),soulPowerCost:payment.totals.soulPower-recipeCost,payment,usage:clone(usage),sourceItem:source?{itemId:source.id,sourceKind:skill.sourceKind,quantityBefore:source.quantity}:null};
  }
  function activateManufacturingModifier(rawState,actorId,skillId,recipeCost=0,operationId='manufacturing-preview',modeId) {
    const {state,actor,skill,node}=manufacturingModifierContext(rawState,actorId,skillId);
    const sourceReceipt={id:operationId};
    const {payment,usageLedger}=paySkillUse(state,actor,skill,sourceReceipt,{fieldUse:true,modeId,additionalCosts:recipeCost?[{kind:'soulPower',amount:recipeCost}]:[]});
    const soulPowerCost=payment.totals.soulPower-recipeCost;
    return {state,activation:{skillId:skill.id,name:skill.name,params:clone(effectOutputProfile(node,skill).node.params),soulPowerCost,usageLedger,payment,sourceItem:sourceReceipt.sourceItem??null}};
  }

  const RESTORATIVE_PAYLOADS = new Set(['payload.heal','payload.restore','payload.soul_restore','payload.cleanse']);

  function medicineReleaseSnapshot(state,actor,skill){
    const view=clone(foundation.battleAttributeView(state,actor)),equipmentProofs=Object.values(state.装备?.配置?.[actor.id]?.slots??{}).filter(Boolean).map(id=>clone(state.物品.实例[id]));
    return {version:2,hostFrame:globalThis.SoulHostCore.attributeFrame(state,actor.id),dc:skillCheckDC(state,actor,skill)+Number(actor.扩展?.武魂战斗修正?.检定加值?.魂技DC??0),attributeView:view,unitProof:clone(actor),equipmentProofs,controlProofs:clone(controls.active(state,actor.id)),elementProfile:foundation.elementDamageProfile(state,actor.id,'毒蚀'),outputPermission:controls.outputSnapshot(state,actor.id)};
  }
  function medicineCheckContext(state,r,targetId,options={}){
    const contextVersion=options.deviceContextVersion??2;
    const ids=new Set([r.responsibleId,targetId,...(options.contextIds??[])]);
    for(const id of ids){const parent=state.战斗单位.列表[id]?.扩展?.召唤?.来源单位ID;if(parent)ids.add(parent);}
    const select=(list,predicate)=>Object.fromEntries(Object.entries(list??{}).filter(([,v])=>predicate(v)).map(([id,v])=>[id,clone(v)]));
    const statuses=select(state.状态实例.列表,v=>ids.has(v.目标单位ID));
    const skillIds=new Set([...ids].flatMap(id=>state.战斗单位.列表[id]?.能力?.技能ID??[]));
    skillIds.add(r.skill.id);
    for(const status of Object.values(statuses))if(status.来源?.技能ID)skillIds.add(status.来源.技能ID);
    const skills=select(state.技能.列表,v=>skillIds.has(v.id)),souls=select(state.武魂.列表,v=>ids.has(v.持有者单位ID));
    const ringIds=new Set([...Object.values(souls).flatMap(v=>v.魂环ID列表??[]),...Object.values(skills).flatMap(v=>[v.sourceRingId,v.来源魂环ID].filter(Boolean))]);
    const itemIds=new Set([...ids].flatMap(id=>{const config=state.装备?.配置?.[id];return [...Object.values(config?.slots??{}),...Object.values(config?.soulBoneSlots??{})].filter(Boolean);}));
    itemIds.add(r.skill.sourceItemId);itemIds.add(r.itemProof.id);
    if(contextVersion>=2)for(const skill of Object.values(skills))if(skill.sourceItemId)itemIds.add(skill.sourceItemId);
    for(const status of Object.values(statuses))if(status.来源?.物品ID)itemIds.add(status.来源.物品ID);
    // Preserve all defense sources without recursively copying earlier battle receipts.
    const battleFrame=b=>b?{id:b.id,状态:b.状态,回合:b.回合,参与者ID列表:clone(b.参与者ID列表??[]),扩展:{成员:clone(b.扩展?.成员??{}),规则:clone(b.扩展?.规则??{}),区域效果:clone(b.扩展?.区域效果??{})}}:null;
    const front=actions.battleOf(state,targetId)??state.战斗;
    const toxicIds=new Set(Object.values(statuses).map(v=>v.扩展?.毒药来源?.exposureId).filter(Boolean));
    const toxicExposures=(state.世界?.poisons?.exposures??[]).filter(v=>toxicIds.has(v.id)&&v.result).map(v=>({id:v.id,sourceId:v.sourceId,proof:clone(v.proof),result:{effects:clone(v.result.effects)}}));
    const toxicSourceIds=new Set(toxicExposures.map(v=>v.sourceId));
    const toxicSources=(state.世界?.poisons?.sources??[]).filter(v=>toxicSourceIds.has(v.id)).map(v=>({id:v.id,originHash:v.originHash,responsibleId:v.responsibleId,skill:clone(v.skill),itemProof:{id:v.itemProof.id}}));
    const pendingFrame=p=>p?.battleId&&p.recovery?.units?{battleId:p.battleId,recovery:{units:Object.fromEntries([...ids].filter(id=>p.recovery.units[id]).map(id=>[id,{}]))}}:null;
    const pendingOccupations={切磋:{当前:pendingFrame(state.切磋?.当前)},终局挑战:{当前:pendingFrame(state.终局挑战?.当前)},比赛:{当前:{match:pendingFrame(state.比赛?.当前?.match)}}};

    const frame={...pendingOccupations,系统:{revision:state.系统.revision},人物:{列表:Object.fromEntries([...ids].filter(id=>state.人物?.列表?.[id]).map(id=>{const p=state.人物.列表[id];return [id,Object.fromEntries(['id','status','life','gender','locationId','spaceId','combatantId'].filter(k=>p[k]!==undefined).map(k=>[k,clone(p[k])]))];}))},扩展:{personEventSequence:state.扩展.personEventSequence,story:{nextTurn:state.扩展.story?.nextTurn??1},cognitionChanges:select(state.扩展.cognitionChanges,v=>ids.has(v.targetId)),controlEpisodes:select(state.扩展.controlEpisodes,v=>ids.has(v.targetId)),worldStatusEvents:[]},战斗单位:{列表:select(state.战斗单位.列表,v=>ids.has(v.id))},成长:{列表:select(state.成长?.列表,v=>ids.has(v.单位ID))},武魂:{列表:souls},魂环:{列表:select(state.魂环?.列表,v=>ringIds.has(v.id))},魂兽档案:{列表:select(state.魂兽档案?.列表,v=>ids.has(v.单位ID))},技能:{列表:skills},装备:{配置:Object.fromEntries([...ids].map(id=>[id,clone(state.装备?.配置?.[id]??{slots:{},soulBoneSlots:{}})]))},物品:{实例:select(state.物品.实例,v=>itemIds.has(v.id)||ids.has(v.attachment?.wearerId))},状态实例:{列表:statuses},战斗:battleFrame(front),世界:{时间:clone(state.世界.时间),seed:state.世界.seed,poisons:{version:1,sources:toxicSources,exposures:toxicExposures,offers:[],events:[]},backgroundBattles:Object.fromEntries([state.战斗,...Object.values(state.世界?.backgroundBattles??{})].filter(b=>b?.id&&b.id!==front?.id&&[...ids].some(id=>b.扩展?.成员?.[id])).map(b=>[b.id,battleFrame(b)]))}};
    if(r.skill.targetConditions||r.skill.effectConditions){frame.世界.custody={byPerson:select(state.世界?.custody?.byPerson,v=>ids.has(v.personId))};if(state.扩展?.interiorSpaces)frame.扩展.interiorSpaces=clone(state.扩展.interiorSpaces);if(state.远征?.当前)frame.远征={当前:clone(state.远征.当前)};}
    if(contextVersion===0)return frame;
    frame.扩展.deviceContextVersion=contextVersion;
    for(const key of ['deviceLocks','deviceEffectRemovals','openingWorkshop'])if(state.扩展?.[key]!==undefined)frame.扩展[key]=clone(state.扩展[key]);
    const sourceFrames=[...ids].map(id=>globalThis.SoulHostCore.attributeFrame(state,id));
    frame.容器={列表:Object.assign({},...sourceFrames.map(v=>v.容器.列表))};frame.研发={蓝图:Object.assign({},...sourceFrames.map(v=>v.研发.蓝图))};frame.远征={...frame.远征,processedTransactions:Object.assign({},...sourceFrames.map(v=>v.远征.processedTransactions))};
    frame.扩展.creationEffects={events:[...new Map(sourceFrames.flatMap(v=>v.扩展.creationEffects.events).map(e=>[e.id,e])).values()]};
    if(contextVersion>=2){
      // Freeze source dependencies before execution: a new status can refer to
      // a surviving stack even when it was not an equipment source beforehand.
      // Legacy contexts keep their original projection; no live-state repair.
      const items=Object.values(frame.物品.实例),blueprintIds=new Set(items.map(item=>item.payload?.blueprintId).filter(Boolean));
      if(state.扩展?.paidDesignTransfers!==undefined){
        frame.扩展.paidDesignTransfers=clone(state.扩展.paidDesignTransfers);
        // The transfer ledger is one hash chain. Its other blueprint references
        // must remain real too, including ancestors no longer in inventory.
        for(const event of frame.扩展.paidDesignTransfers.events??[])for(const item of [event.source,event.target])if(item?.payload?.blueprintId)blueprintIds.add(item.payload.blueprintId);
      }
      frame.研发.待处理={};frame.远征.commandRequests={};
      for(const item of items){const container=state.容器?.列表?.[item.containerId];if(container)frame.容器.列表[container.id]=clone(container);}
      for(const id of blueprintIds){
        const blueprint=state.研发?.蓝图?.[id];if(!blueprint)continue;frame.研发.蓝图[id]=clone(blueprint);
        const pending=state.研发?.待处理?.[blueprint.createdFromResearchId];if(pending)frame.研发.待处理[pending.id]=clone(pending);
        for(const [key,receipt]of Object.entries(state.远征?.processedTransactions??{}))if(receipt.blueprintId===id||key===pending?.consumedTransactionId)frame.远征.processedTransactions[key]=clone(receipt);
        const request=state.远征?.commandRequests?.[pending?.consumedTransactionId];if(request)frame.远征.commandRequests[pending.consumedTransactionId]=clone(request);
      }
      const creationIds=new Set([...items,...(frame.扩展.paidDesignTransfers?.events??[]).flatMap(event=>[event.source,event.target])].map(item=>item?.provenance?.creationId).filter(Boolean));
      for(const event of state.扩展?.creationEffects?.events??[])if(creationIds.has(event.id)&&!frame.扩展.creationEffects.events.some(prior=>prior.id===event.id))frame.扩展.creationEffects.events.push(clone(event));
    }
    if(state.世界.opening!==undefined)frame.世界.opening=clone(state.世界.opening);return frame;
  }
  // The same bounded source/equipment frame is reusable by historical control authority.
  function controlQualificationContext(state,status,contextIds){return medicineCheckContext(state,{responsibleId:status.来源.单位ID,skill:status.扩展.持续来源合同,itemProof:{id:status.来源.物品ID??''}},status.目标单位ID,{contextIds});}
  function medicineRuntime(state,r,e,options={}){
    return {...clone(r.skill),_deviceContextVersion:options.deviceContextVersion??2,_creationPayment:clone(r.payment),_releasedMedicine:{sourceId:r.id,exposureId:e.id,sourceHash:r.originHash},_fieldUse:!actions.battleOf(state,e.targetId),_sourceContract:clone(r.skill),_toxicProof:clone(e.proof),_releasedMedicineDC:r.releaseSnapshot.dc,_releasedElementProfile:clone(r.releaseSnapshot.elementProfile),_outputPermission:clone(r.releaseSnapshot.outputPermission)};
  }
  function executeMedicineBranch(state,r,e,branch,rng,runtime,context){
    const actor=state.战斗单位.列表[r.responsibleId],target=state.战斗单位.列表[e.targetId],scoped=skillForBranch(runtime,branch),row={targetId:e.targetId,skillId:r.skill.id,branchId:branch.id,effects:[],check:null,affected:false};
    const rngBefore=rng.snapshot(),checked=rollCheck(context,context.战斗单位.列表[actor.id],context.战斗单位.列表[target.id],branch.nodes.find(n=>n.family==='check'),rng,row,scoped,{preview:true}),rngAfter=rng.snapshot();row.affected=checked.affected;
    consumeHitRuleSources(state,row.check?.interference?.sources);
    const graze=Number(row.check?.interference?.grazePercent??0),saveHalf=row.check?.saved&&row.check?.successEffect==='伤害减半',execution=graze?{...scoped,_hitGrazeScale:graze/100}:scoped;
    medicineBranchStates.add(state);
    try{if(checked.affected||saveHalf||graze)for(const node of branch.nodes.filter(n=>['status','payload','zone','summon','contract'].includes(n.family)||['transform.sex','transform.disguise'].includes(n.effectId))){
      if(graze&&node.effectId!=='payload.damage')continue;
      if(!graze&&!checked.affected&&!['payload.damage','payload.drain'].includes(node.effectId))continue;
      executeNode(state,actor,target,node,rng,checked.critical,e.id,row,{},execution);
    }}
    finally{medicineBranchStates.delete(state);}
    return {branchId:branch.id,context,rngBefore,rngAfter,rngFinal:rng.snapshot(),check:clone(row.check??null),affected:row.affected,effects:clone(row.effects)};
  }
  function verifyReleasedMedicineChecks(state,e,confirmation){
    const r=globalThis.SoulPoisonCore.source(state,e.sourceId),proofs=e.result?.checkProofs,branches=skillEffectBranches(r.skill);
    const reserved=state.世界.poisons.events.find(v=>v.kind==='dose-reserved'&&v.exposure?.id===e.id),initial=reserved?.checkContext;
    if(!Array.isArray(proofs)||proofs.length!==branches.length||!initial||reserved.sourceId!==e.sourceId||reserved.at!==e.at||initial.扩展.personEventSequence!==reserved.order||initial.世界.seed!==state.世界.seed||battleNow(initial)!==e.at||abilities.hash(confirmation.targetUnitProof)!==abilities.hash(initial.战斗单位.列表[e.targetId]))throw Error('药效检定缺少冻结场景');
    const frame=clone(initial),rng=makeRng(`${state.世界.seed}:medicine-exposure:${e.id}`),runtime=medicineRuntime(frame,r,e,{deviceContextVersion:initial.扩展.deviceContextVersion??0}),checks=[],outputs=[];let affected=false;
    for(let i=0;i<proofs.length;i++){
      const context=medicineCheckContext(frame,r,e.targetId,{deviceContextVersion:initial.扩展.deviceContextVersion??0}),actual=executeMedicineBranch(frame,r,e,branches[i],rng,runtime,context);
      if(abilities.hash(actual)!==abilities.hash(proofs[i]))throw Error('药效骰点、连续骰流、分支场景或施效结果无效');
      if(actual.check)checks.push(actual.check);outputs.push(...actual.effects);affected||=actual.affected;
    }
    if(abilities.hash(checks)!==abilities.hash(e.result.checks)||abilities.hash(checks[0]??null)!==abilities.hash(e.result.check)||abilities.hash(outputs)!==abilities.hash(e.result.effects)||affected!==e.result.affected||abilities.hash(medicineCheckContext(frame,r,e.targetId,{deviceContextVersion:initial.扩展.deviceContextVersion??0}))!==e.result.finalContextHash)throw Error('药效结果与各分支实际结算不一致');
  }
  function releaseMedicine(state,actorId,itemId,operationId,sourceIntent,carrier,options={}){
    actions.resolve(state,{actorId,requirements:['gesture']});
    const actor=state.战斗单位.列表[actorId],item=state.物品.实例[itemId];
    if(!item||item.ownerEntityId!==actorId||item.containerId!==state.人物.列表[actorId].inventoryContainerId)throw Error('释放药剂需要实际携带的一件药剂');
    const skill=globalThis.SoulWorldEngine.inspectItem(state,item).skills.find(v=>v.medicine);
    if(!skill||!abilities.verify(skill).pass)throw Error('这件物品没有冻结的药剂合同');
    if(carrier.kind==='direct-oral'&&skill.effectGraph.nodes.some(n=>effects.effectPolarity(n.effectId,n.params)==='harmful'))actions.assertTargets(state,actorId,{harmfulTargetIds:[carrier.targetId]});
    const itemProof=clone(item),receipt={id:operationId};
    const releaseSnapshot=medicineReleaseSnapshot(state,actor,skill);
    const paid=paySkillUse(state,actor,skill,receipt,{fieldUse:!actions.battleOf(state,actorId),preparingMedicine:true,additionalCosts:options.additionalCosts??[]});
    const actualCarrier=typeof carrier==='function'?carrier(state):carrier;
    const result=globalThis.SoulPoisonCore.createReleasedSource(state,{id:`poison:${operationId}`,responsibleId:actorId,skill:clone(skill),releaseSnapshot,itemProof,blueprintHash:abilities.hash(item.payload?.activeSkill??{}),carrier:clone(actualCarrier),sourceIntent:clone(sourceIntent),payment:paid.payment,usageLedger:clone(paid.usageLedger)});
    abilities.finish(state,paid.payment);return result;
  }
  // Delayed exposure reads a paid, frozen source; it has no fresh casting fee,
  // gesture, target selection or counterspell opportunity.
  function applyReleasedMedicine(state,{sourceId,exposureId,targetId},outerReceipt=null){
    const poison=globalThis.SoulPoisonCore,r=poison.source(state,sourceId),e=poison.exposure(state,exposureId);
    if(!r||!e||e.sourceId!==r.id||e.targetId!==targetId||e.result||e.proof.sourceHash!==r.originHash)throw Error('药效结算必须读取已保留的真实暴露剂量');
    const actor=state.战斗单位.列表[r.responsibleId],target=state.战斗单位.列表[targetId],result={targetId,sourceId,exposureId,skillId:r.skill.id,checks:[],check:null,checkProofs:[],affected:false,effects:[]};
    const evidenceReceipt={id:exposureId};
    const settle=()=>{
      const rng=makeRng(`${state.世界.seed}:medicine-exposure:${exposureId}`),runtime=medicineRuntime(state,r,e);
      for(const branch of skillEffectBranches(r.skill)){
        const context=medicineCheckContext({...state,战斗:front},r,targetId),proof=executeMedicineBranch(state,r,e,branch,rng,runtime,context);
        result.checkProofs.push(proof);
        if(proof.check){result.checks.push(proof.check);result.check??=proof.check;}result.affected||=proof.affected;result.effects.push(...proof.effects);
      }
      result.finalContextHash=abilities.hash(medicineCheckContext({...state,战斗:front},r,targetId));
      if(outerReceipt?.targets)outerReceipt.targets.push(clone(result));
    };
    const battle=actions.battleOf(state,targetId),front=state.战斗;
    if(battle&&battle.id!==front.id)state.战斗=battle;
    try{if(actionEvidence.has(state))settle();else settleFieldItemEvidence(state,evidenceReceipt,[r.responsibleId,targetId],settle);result.evidence=clone(evidenceReceipt);}
    finally{state.战斗=front;}
    return result;
  }
  function medicineContactProfile(state,actorId,targetId,maximum=0){
    const actor=state.战斗单位.列表[actorId],target=state.战斗单位.列表[targetId];
    actions.resolve(state,{actorId,targetIds:[targetId],requirements:['gesture']});
    if(actions.battleOf(state,actorId)&&combatDistance(actor,target)>maximum)throw Error('须实际处于本途径的触及距离');
    if(actorId===targetId)return {automatic:true,basis:'self',actorId,targetId};
    const held=controls.active(state,targetId).some(v=>v.模板ID==='status.bind'&&v.来源.单位ID===actorId||v.模板ID==='status.limb_bind'&&v.快照.参数.部位==='全身'&&v.来源.单位ID===actorId);
    if(held)return {automatic:true,basis:'actual-held',actorId,targetId,heldProofs:clone(controls.active(state,targetId).filter(v=>v.来源?.单位ID===actorId))};
    return {automatic:false,actorId,targetId,maximum};
  }
  function medicineContactCheck(state,actorId,targetId,operationId,maximum=0){
    const profile=medicineContactProfile(state,actorId,targetId,maximum),actor=state.战斗单位.列表[actorId],target=state.战斗单位.列表[targetId];
    if(profile.automatic){const {automatic,...proof}=profile;return {type:'touch',hit:true,...proof,operationId};}
    const row={};rollCheck(state,actor,target,{effectId:'check.physical_attack',params:{}},makeRng(`${state.世界.seed}:medicine-contact:${operationId}`),row,{id:'ordinary.attack',effectGraph:{nodes:[]}});return row.check;
  }

  function fieldAbilityContext(state,actorId,skillId,targetId=actorId,modeId,applicationOptions={}){
    const care=globalThis.SoulResidentRealms?.careSource(state,actorId,targetId,state.技能.列表[skillId],applicationOptions.branchIds);
    actions.resolve(state,{actorId,battleId:null,...(!care?{targetIds:[targetId]}:{}),fieldAbility:true});
    const actor=state.战斗单位.列表[actorId],target=state.战斗单位.列表[targetId];
    if(activeStatuses(state,actorId).some(s=>['status.sleep','status.stun'].includes(s.模板ID)))throw Error('施用者须清醒才能使用场外能力');
    if(!actor||!target)throw Error('场外能力需要真实目标');
    if(!actor.能力.技能ID.includes(skillId)&&!(skillId==='martial.base'&&actor.扩展?.武魂基础动作?.mode==='disguise'))throw Error('能力不属于行动者');
    const skill=getSkill(state,actor,skillId,applicationOptions.castRank),scope=globalThis.SoulCreationCore.normalizeScope(skill,{...applicationOptions,modeId}),branches=abilities.selectFieldBranches(skill,scope.branchIds),nodes=branches.flatMap(b=>b.nodes);
    const revival=nodes.some(n=>n.effectId==='payload.revive'),dead=target.存活状态==='死亡'||state.人物?.列表?.[targetId]?.status==='dead';
    if(dead&&!revival)throw Error('场外能力需要真实存活目标');
    if(revival){
      if(!state.人物?.列表?.[targetId])throw Error('复活需要完整人物，已消散的投影或召唤不能恢复');
      if(dead){const reason=people.revivalReason(state,targetId);if(reason)throw Error(reason);}
      else if(target.存活状态!=='昏迷'&&target.资源.生命.当前>0)throw Error('目标无需复苏');
    }
    for(const node of nodes.filter(n=>n.effectId==='payload.recon'))globalThis.SoulSummonOrders.destination(state,actorId,node,scope.reconLocationId);
    const limitReason=summonLimitReason(state,actor,{...skill,effectGraph:{nodes}});if(limitReason)throw Error(limitReason);
    if(skill.medicine&&skill.medicine.route!=='oral')throw Error('这项药剂须使用实际接触、喷洒或毒雾释放命令');
    if(!abilities.verify(skill).pass)throw Error('能力合同无效');
    const checked=effects.validateGraph(skill.effectGraph,{ageTier:skill.ageTier??'十万年',mechanismCap:skill.mechanismCap??'规则'});
    if(!checked.pass)throw Error(checked.errors.join('；'));
    if(!abilities.fieldControlGraph(skill.effectGraph))throw Error('这项能力不能在场外施放');
    if(nodes.some(n=>n.effectId==='transform.sex'&&n.params.目标性别==='反转')&&!['男','女'].includes(state.人物?.列表?.[targetId]?.gender))throw Error('目标当前身体性别未登记，请先明确设定或使用指定男、女形态的能力');
    if(nodes.some(n=>n.effectId==='target.self')&&targetId!==actorId&&skill.sourceKind!=='consumable')throw Error('自身能力不能改变目标');
    if(applicationOptions.force!==undefined&&typeof applicationOptions.force!=='boolean')throw Error('强制施用须明确选择');
    const conditionReason=globalThis.SoulTargetConditions?.skillReason(state,actorId,targetId,skill);if(conditionReason)throw Error(conditionReason);
    if(globalThis.SoulResidentRealms?.isCaptureSkill(skill,scope.branchIds))globalThis.SoulResidentRealms.preflight(state,actorId,targetId,skill,nodes);
    const application=globalThis.SoulWorldEngine.abilityApplicationAuthority(state,actorId,targetId,skill,{...applicationOptions,scope});
    if(!application.available)throw Error(application.reason);
    validateSkillSpecialRequirements(state,actor,skill);externalSourceItem(state,actor,skill);
    assertContractFormationReady(state,actor,skill,{...applicationOptions,branchIds:scope.branchIds});
    const recovery=nodes.some(n=>n.effectId==='payload.soul_restore'||n.effectId==='payload.restore'&&n.params.魂力模式!=='无'),strong=nodes.some(n=>n.effectId==='payload.restore'&&n.params.魂力模式!=='无');
    const day=state.世界.时间.day,used=target.扩展?.场外回魂日账,usage=used?.day===day?used:{day,total:0,strong:0};
    if(recovery&&skill.sourceKind!=='consumable'&&(usage.total>=2||strong&&usage.strong>=1))throw Error('接受者今日场外回魂魂技额度已用尽');
    const ingestion=abilities.describe(skill,{modeId}).requirements.includes('ingest');
    const itemEffects=nodes.filter(n=>['payload.repair_item','payload.fabricate'].includes(n.effectId));
    if(itemEffects.length>1)throw Error('每次场外用途只能包含一个物品构造效果，请拆成独立用途');
    const creationQuotes=itemEffects.map(n=>globalThis.SoulCreationCore.previewItemEffect(state,actorId,targetId,n,scope));
    const deviceContext=globalThis.SoulDeviceOperations.castContext(state,actorId,skill,nodes,targetId,applicationOptions,null);
    const payment=quoteSkillUse(state,actor,skill,{fieldUse:true,modeId,branchIds:scope.branchIds,nodeIds:nodes.map(n=>n.id),targetIds:[targetId],_personContractFormation:applicationOptions._personContractFormation,...(ingestion?{ingestionTargetId:targetId,applicationOptions}:{})});
    return {actor,target,skill,scope,branches,creationQuotes,payment,deviceContext,application,recovery:recovery&&skill.sourceKind!=='consumable',strong};
  }
  function ingestionAttempt(state,actor,target,skill,application,forced,rng){
    const result={actorId:actor.id,recipientId:target.id,payerId:actor.id,itemId:skill.sourceItemId,basis:application.basis,forced,swallowed:true};
    if(application.basis==='opposed-ingestion'){
      const a=foundation.battleAttributeView(state,actor),t=foundation.battleAttributeView(state,target),attack=rollD20(rng,false,false),defense=rollD20(rng,false,false);
      const am=a.attributes.调整值.力量+a.derived.熟练加值,dm=Math.max(t.attributes.调整值.力量,t.attributes.调整值.身法)+t.derived.熟练加值;
      result.check={actorRolls:attack.rolls,targetRolls:defense.rolls,actorModifier:am,targetModifier:dm,actorTotal:attack.die+am,targetTotal:defense.die+dm};
      result.swallowed=result.check.actorTotal>result.check.targetTotal;
    }
    return result;
  }
  function custodyDeviceAbility(item,actorId,sourceId){
    return abilities.seal({id:`restraint:${item.id}:${sourceId}`,name:item.name,持有者单位ID:actorId,sourceKind:'restraint',sourceItemId:item.id,soulPowerCost:0,
      effectGraph:effects.makeLinearGraph([['release.touch',{}],['target.single',{阵营规则:'任意'}],...custody.effectSourceSpecs(item)])});
  }
  function applyCustodyDevice(state,actorId,targetId,itemId,sourceId){
    const item=state.物品.实例[itemId],a=item?.attachment;
    if(!a||a.wearerId!==targetId||a.sourceId!==sourceId||!a.controllers.includes(actorId))throw Error('拘束效果缺少本次真实装配来源');
    const skill=custodyDeviceAbility(item,actorId,sourceId),receipt={targetId,skillId:skill.id,effects:[]};
    const runtime={...skill,_fieldUse:true,_sourceContract:skill};
    for(const node of skill.effectGraph.nodes.filter(n=>controls.canPersist(n.effectId,n.params)&&custody.effectEnabled(item,n.effectId)))applyStatus(state,state.战斗单位.列表[actorId],state.战斗单位.列表[targetId],node,`${sourceId}:device:${itemId}`,receipt,runtime);
    return receipt.effects;
  }
  function previewFieldAbility(state,actorId,skillId,targetId=actorId,modeId,applicationOptions={}){
    if(globalThis.SoulCombatDeployments.isDeploySkill(state.技能.列表[skillId],applicationOptions.branchIds))try{const request=globalThis.SoulCombatDeployments.fromRingSkill(state,actorId,skillId,modeId??'projection'),q=globalThis.SoulCombatDeployments.quote(state,request);return {available:true,actorId,skillId,targetId:q.prototypeId,payment:q.cost,fieldEffects:[{effectId:'realm.deploy',name:'召唤对应人物'}],excludedEffects:[]};}catch(error){return {available:false,actorId,skillId,targetId,reason:error.message};}
    try{const context=fieldAbilityContext(state,actorId,skillId,targetId,modeId,applicationOptions);return {available:true,actorId,skillId,targetId,payment:context.payment,scope:context.scope,creationQuotes:context.creationQuotes,deviceOperation:context.deviceContext?.quote??null,fieldEffects:context.branches.flatMap(b=>b.nodes.filter(n=>!['release','targeting','check'].includes(n.family)).map(n=>({effectId:n.effectId,name:effects.EFFECT_REGISTRY[n.effectId].displayName}))),excludedEffects:context.branches.flatMap(b=>b.excluded).map(n=>effects.EFFECT_REGISTRY[n.effectId].displayName)};}
    catch(error){return {available:false,actorId,skillId,targetId,reason:error.message};}
  }
  function activateFieldAbility(rawState,actorId,skillId,targetId,receiptId,modeId,applicationOptions={}){
    if(globalThis.SoulCombatDeployments.isDeploySkill(rawState.技能.列表[skillId],applicationOptions.branchIds)){const state=foundation.normalizeState(clone(rawState)),request=globalThis.SoulCombatDeployments.fromRingSkill(state,actorId,skillId,modeId??'projection'),deployment=globalThis.SoulCombatDeployments.execute(state,request,receiptId);return {state,receipt:{id:receiptId,type:'field-ability-used',actorId,skillId,targetId:deployment.targetId,residentDeployment:deployment,targets:[{targetId:deployment.targetId,effects:[{effectId:'realm.deploy',...deployment}]}]}};}
    const state=foundation.normalizeState(clone(rawState)),{actor,target,skill,scope,branches,application,recovery,strong,deviceContext}=fieldAbilityContext(state,actorId,skillId,targetId,modeId,applicationOptions);
    const receipt={id:receiptId,type:'field-ability-used',actorId,skillId,targetId,scope:clone(scope),application:clone(application),targets:[],statusEvents:[]};
    return settleFieldItemEvidence(state,receipt,[...new Set([actorId,targetId])],()=>{
      const ingestion=abilities.describe(skill,{modeId}).requirements.includes('ingest');
      const rng=makeRng(`${state.世界.seed}:${receiptId}:field-ability`);
      if(ingestion)receipt.ingestion=ingestionAttempt(state,actor,target,skill,application,applicationOptions.force===true,rng);
      const realmItemProof=skill.sourceItemId?clone(state.物品.实例[skill.sourceItemId]):null,realmCostBasis=globalThis.SoulResidentRealms.costBasisFor(state,actorId);
      const itemProof=skill.medicine||state.物品?.实例?.[skill.sourceItemId]?.type==='辅助食品'?clone(state.物品.实例[skill.sourceItemId]):null;
      const releaseSnapshot=skill.medicine?medicineReleaseSnapshot(state,actor,skill):null;
      const paid=paySkillUse(state,actor,skill,receipt,{fieldUse:true,modeId,branchIds:scope.branchIds,nodeIds:branches.flatMap(b=>b.nodes.map(n=>n.id)),targetIds:[targetId],...(ingestion?{ingestionTargetId:targetId,applicationOptions,preserveOralDose:!receipt.ingestion.swallowed}:{})});receipt.usageLedger=paid.usageLedger;
      if(ingestion&&!receipt.ingestion.swallowed){receipt.summary=`${target.名称}挣脱了本次强制给药，未吞服，药物仍由${actor.名称}持有`;receipt.sacrificeDeath=abilities.finish(state,paid.payment);return;}
      globalThis.SoulWorldEngine.consumeAbilityPermission(state,application.permissionId,receiptId);
      if(recovery){const day=state.世界.时间.day,old=target.扩展.场外回魂日账;target.扩展.场外回魂日账={day,total:(old?.day===day?old.total:0)+1,strong:(old?.day===day?old.strong:0)+(strong?1:0)};}
      const runtimeSkill={...skill,_fieldUse:true,_sourceContract:clone(skill),_personContractFormation:applicationOptions._personContractFormation,_fieldScope:scope,_creationPayment:paid.payment,_realmSourceItemProof:realmItemProof,_realmCostBasis:realmCostBasis};
      if(deviceContext){runtimeSkill._deviceTarget=clone(deviceContext.target);runtimeSkill._deviceTicket=globalThis.SoulDeviceOperations.prepareEffect(state,actorId,skillId,[deviceContext.nodeId],paid.payment,receiptId,{battleId:null,targetItemId:deviceContext.target.itemId,lockId:deviceContext.target.lockId,knowledgeId:deviceContext.target.knowledgeId,materials:deviceContext.target.materials,deviceNodeId:deviceContext.nodeId});}
      if(skill.medicine){const r=globalThis.SoulPoisonCore.createReleasedSource(state,{id:`poison:${receiptId}`,responsibleId:actorId,skill:clone(skill),releaseSnapshot,itemProof,blueprintHash:abilities.hash(itemProof.payload?.activeSkill??{}),carrier:{kind:'direct-oral',targetId},sourceIntent:{type:'direct-medicine-use',actorId,itemId:skill.sourceItemId,targetId},payment:paid.payment,usageLedger:clone(paid.usageLedger)});globalThis.SoulPoisonCore.expose(state,r.id,targetId,`${receiptId}:swallowed`,'oral',receipt,{kind:'direct-drug-swallowed',at:battleNow(state),itemId:skill.sourceItemId,operationId:receiptId});}
      else for(const originalBranch of branches){
        const permittedNodeIds=new Set(originalBranch.nodes.map(node=>node.id));
        const projected=effects.graphBranches(effects.projectExecutionGraph(skill)).find(b=>b.id===originalBranch.id);
        const branch={...projected,nodes:projected.nodes.filter(node=>permittedNodeIds.has(node.id))};
        const targetReceipt={targetId,skillId,branchId:branch.id,check:null,affected:false,effects:[]};
        const checked=rollCheck(state,actor,target,branch.nodes.find(n=>n.family==='check'),rng,targetReceipt,runtimeSkill);targetReceipt.affected=checked.affected;
        if(checked.affected)for(const node of branch.nodes.filter(n=>['status','payload','zone','summon','contract'].includes(n.family)||['transform.sex','transform.disguise'].includes(n.effectId)))executeNode(state,actor,target,node,rng,false,receiptId,targetReceipt,scope,runtimeSkill);
        receipt.targets.push(targetReceipt);
      }
      if(ingestion&&itemProof?.type==='辅助食品')completeFoodIngestion(state,itemProof,targetId,paid.payment,receipt);
      globalThis.SoulAbilityExchange.complete(state,receiptId,receipt);registerMaintenance(state,actor,skill,receipt,true);receipt.sacrificeDeath=abilities.finish(state,paid.payment);globalThis.SoulPersonContracts?.completeRelease(state,receipt);pruneMaintenance(state,receipt);
      const changes=receipt.targets.flatMap(t=>t.effects).flatMap(e=>e.prevented?[e.prevented]:e.effectId==='payload.repair_item'?[`${e.itemName}耐久 ${e.durabilityBefore} → ${e.durabilityAfter}`]:e.effectId==='payload.fabricate'?[`制成${e.productName} × ${e.quantity}`]:e.effectId==='payload.recon'?[e.report.place+' · '+e.report.observations.join('，')]:e.effectId==='payload.heal'?[`恢复${e.amount}点生命`]:e.effectId==='payload.revive'&&e.revived?[`${target.名称}已复苏，恢复${e.amount}点生命`]:e.effectId==='zone.wall'?['构造了元素屏障']:e.effectId==='summon.entity'?['召唤了元素实体']:e.effectId==='status.regeneration'?['获得持续再生']:[]);
      receipt.summary=`${actor.名称}施放${skill.name??skill.id}${changes.length?'：'+changes.join('；'):'。'}`;
    });
  }

  function isSelfRestorativeGraph(graph) {
    const nodes=graph?.nodes ?? [];
    return nodes.some(node=>node.effectId==='target.self') && nodes.some(node=>RESTORATIVE_PAYLOADS.has(node.effectId))
      && nodes.every(node=>RESTORATIVE_PAYLOADS.has(node.effectId)||node.effectId==='target.self');
  }

  function fieldRestorationTargets(state,actorId) {
    return Object.values(state.战斗单位.列表).filter(unit=>{
      if(!['存活','昏迷'].includes(unit.存活状态)||state.人物?.列表?.[unit.id]&&people.isDead(state,unit.id))return false;
      try{actions.resolve(state,{actorId,battleId:null,targetIds:[unit.id]});return true;}catch{return false;}
    }).map(unit=>({id:unit.id,name:unit.名称,self:unit.id===actorId,health:clone(unit.资源.生命),soulPower:clone((globalThis.SoulCombatDeployments.soulPowerResource(state,unit.id)))}));
  }

  function fieldConsumableContext(state, actorId, itemId, modeId,ingestionTargetId=actorId) {
    actions.resolve(state,{actorId,battleId:null});
    const actor = state.战斗单位.列表[actorId];
    if (!actor || actor.存活状态 !== '存活') throw new Error('当前角色不能使用恢复物品');
    const skill = Object.values(state.技能.列表).find(entry => entry.sourceItemId === itemId && entry.sourceKind === 'consumable');
    if (!skill || !cleanList(actor.能力?.技能ID).includes(skill.id)) throw new Error('这件物品不能在战外使用');
    const validation = effects.validateGraph(skill.effectGraph,{ageTier:skill.ageTier ?? '十万年',mechanismCap:skill.mechanismCap ?? '规则'});
    if (!validation.pass) throw new Error('这件物品的效果不完整');
    validateSkillSpecialRequirements(state,actor,skill);
    const item=externalSourceItem(state,actor,skill),usage=skillUsageAvailability(state,actor,skill,true);
    if(!usage.available)throw new Error(usage.reason);
    actions.resolve(state,{actorId,battleId:null,targetIds:[ingestionTargetId]});
    const payment=quoteSkillUse(state,actor,skill,{fieldUse:true,modeId,...(abilities.describe(skill,{modeId}).requirements.includes('ingest')?{ingestionTargetId}:{})});
    return {actor,skill,item,cost:payment.totals.soulPower,payment};
  }

  function restorativeItemContext(state, actorId, itemId, targetId=actorId,modeId) {
    const context=fieldConsumableContext(state,actorId,itemId,modeId,targetId),nodes=context.skill.effectGraph.nodes;
    if (!context.skill.restorativeConsumable || !nodes.some(node=>RESTORATIVE_PAYLOADS.has(node.effectId)) || nodes.some(node=>!RESTORATIVE_PAYLOADS.has(node.effectId)&&!['target.single','release.touch'].includes(node.effectId))) throw new Error('战外只能使用纯恢复消耗品');
    const targets=fieldRestorationTargets(state,actorId);
    if(!targets.some(target=>target.id===targetId))throw new Error('只能对同一可接触场景内存活且未参战的人物使用');
    return {...context,target:state.战斗单位.列表[targetId],targets};
  }

  function isPrebattlePill(skill,item) {
    const nodes=skill?.effectGraph?.nodes ?? [];
    const positiveBuff=node=>(node.effectId==='status.buff'&&Number(node.params?.数值)>0||['status.resistance_shift','status.status_guard'].includes(node.effectId)&&node.params?.模式==='抗性')&&Number.isInteger(node.params?.持续回合)&&node.params.持续回合>=1&&node.params.持续回合<=5;
    return item?.type==='丹药' && skill?.sourceKind==='consumable' && nodes.some(node=>node.effectId==='target.self')
      && nodes.some(positiveBuff) && nodes.every(node=>node.effectId==='target.self'||RESTORATIVE_PAYLOADS.has(node.effectId)||positiveBuff(node));
  }

  function prebattlePillContext(state,actorId,itemId,modeId,targetId=actorId) {
    const context=fieldConsumableContext(state,actorId,itemId,modeId,targetId);
    if(!isPrebattlePill(context.skill,context.item))throw new Error('这件物品不是可战前服用的属性增幅丹药');
    return {...context,recipient:state.战斗单位.列表[targetId]};
  }

  function pillEffects(skill) {
    return skill.effectGraph.nodes.filter(node=>['status.buff','status.resistance_shift','status.status_guard'].includes(node.effectId)).map(node=>{
      const {params}=effectOutputProfile(node,skill).node;
      return {attribute:params.属性??params.类型??'恐惧防护',value:params.数值??params.模式,rounds:params.持续回合};
    });
  }

  function preparedPillViews(state,unitId) {
    return (state.战斗单位.列表[unitId]?.扩展?.preparedPills ?? []).filter(entry=>entry.expiresAt>people.now(state)-(globalThis.SoulSealingCore?.pausedMinutes(state,unitId,people.now(state),entry.preparedAt)??0)).map(entry=>({id:entry.id,name:entry.name,expiresAt:entry.expiresAt,remainingMinutes:entry.expiresAt-people.now(state)+(globalThis.SoulSealingCore?.pausedMinutes(state,unitId,people.now(state),entry.preparedAt)??0),effects:pillEffects(entry.skill)}));
  }

  function validatePreparedPills(state) {
    const errors=[],ids=new Set();
    for(const unit of Object.values(state.战斗单位?.列表??{}))for(const entry of unit.扩展?.preparedPills??[]){
      if(!entry||ids.has(entry.id)||!entry.id||!Number.isSafeInteger(entry.preparedAt)||entry.preparedAt>people.now(state)||entry.expiresAt!==entry.preparedAt+120||!isPrebattlePill(entry.skill,{type:'丹药'})||!abilities.verify(entry.skill).pass||entry.proofHash!==abilities.hash({id:entry.id,targetId:unit.id,preparedAt:entry.preparedAt,expiresAt:entry.expiresAt,skillHash:entry.skill?.immutableHash}))errors.push('战前药效的付款来源、合同或有效窗口无效');
      ids.add(entry?.id);
    }
    return errors;
  }

  function previewPrebattlePill(state,actorId,itemId,modeId,targetId=actorId) {
    const skill=Object.values(state.技能.列表).find(entry=>entry.sourceItemId===itemId && entry.sourceKind==='consumable');
    const supported=isPrebattlePill(skill,state.物品.实例[itemId]);
    try{const {item,skill,cost}=prebattlePillContext(state,actorId,itemId,modeId,targetId);const targets=fieldRestorationTargets(state,actorId).filter(v=>{try{prebattlePillContext(state,actorId,itemId,modeId,v.id);return true;}catch{return false;}});return {supported,available:true,itemId,targetId,targets,name:item.name,soulPowerCost:cost,effects:pillEffects(skill),hasRestoration:skill.effectGraph.nodes.some(node=>RESTORATIVE_PAYLOADS.has(node.effectId))};}
    catch(error){return {supported,available:false,itemId,reason:error.message};}
  }

  function preparePrebattlePill(rawState,actorId,itemId,receiptId,modeId,targetId=actorId) {
    const state=foundation.normalizeState(clone(rawState)),{actor,skill,item,cost,recipient}=prebattlePillContext(state,actorId,itemId,modeId,targetId);
    const receipt={id:receiptId,type:'prebattle-pill-prepared',actorId,itemId,name:item.name,targets:[],statusEvents:[],soulPowerCost:cost,preparedEffects:pillEffects(skill)};
    return settleFieldItemEvidence(state,receipt,[...new Set([actorId,targetId])],()=>{
    const paid=paySkillUse(state,actor,skill,receipt,{fieldUse:true,modeId,ingestionTargetId:targetId});
    receipt.usageLedger=paid.usageLedger;
    const target={targetId,skillId:skill.id,check:null,affected:true,effects:[]},rng=makeRng(`${state.世界?.seed}:${receiptId}:field-item`);
    for(const node of skill.effectGraph.nodes.filter(node=>RESTORATIVE_PAYLOADS.has(node.effectId)))executeNode(state,actor,recipient,node,rng,false,receiptId,target,{},skill);
    receipt.targets.push(target);
    recipient.扩展.preparedPills ??= [];
    const entry={id:receiptId,name:item.name,skill:clone(skill),preparedAt:people.now(state),expiresAt:people.now(state)+120};
    entry.proofHash=abilities.hash({id:entry.id,targetId,preparedAt:entry.preparedAt,expiresAt:entry.expiresAt,skillHash:skill.immutableHash});
    recipient.扩展.preparedPills.push(entry);
    receipt.sacrificeDeath=abilities.finish(state,paid.payment);
    receipt.summary=`${recipient.名称}服用${item.name}，药效将在两小时内的下一场战斗生效${target.effects.length?'；恢复效果已立即结算':''}。`;
    });
  }

  function activatePreparedPills(state,unit,battleId) {
    const entries=unit.扩展?.preparedPills ?? [],events=[];
    for(const entry of entries){
      const receiptId=`${battleId}:prepared:${entry.id}`,target={targetId:unit.id,skillId:entry.skill.id,effects:[]};
      if(entry.expiresAt<=people.now(state)-(globalThis.SoulSealingCore?.pausedMinutes(state,unit.id,people.now(state),entry.preparedAt)??0))continue;
      const actor=state.战斗单位.列表[entry.skill.持有者单位ID];
      if(!actor)throw Error('预备丹药缺少原施用者记录');
      for(const node of entry.skill.effectGraph.nodes.filter(node=>['status.buff','status.resistance_shift','status.status_guard'].includes(node.effectId))){
        executeNode(state,actor,unit,node,makeRng(receiptId),false,receiptId,target,{},entry.skill);
      }
      for(const effect of target.effects){
        const status=state.状态实例.列表[effect.statusId];
        if(status){status.施加回合=1;status.持续.延后首次目标回合结束=false;status.扩展.sourceName=entry.name;}
      }
      events.push({unitId:unit.id,name:entry.name,effects:target.effects});
    }
    delete unit.扩展.preparedPills;
    return events;
  }

  function previewRestorativeItem(state, actorId, itemId, targetId=actorId,modeId) {
    try {const {item,skill,cost,target,targets}=restorativeItemContext(state,actorId,itemId,targetId,modeId);return {available:true,itemId:item.id,skillId:skill.id,name:item.name,soulPowerCost:cost,targetId:target.id,targets};}
    catch(error){return {available:false,itemId,reason:error.message};}
  }

  function settleRestorativeContents(state,context,receipt,modeId){
    const {actor,skill,item,target:recipient}=context,targetId=recipient.id,receiptId=receipt.id;
    const itemProof=item.type==='辅助食品'?clone(item):null;
    const paid=paySkillUse(state,actor,skill,receipt,{fieldUse:true,modeId,...(abilities.describe(skill,{modeId}).requirements.includes('ingest')?{ingestionTargetId:targetId}:{})});
    receipt.usageLedger=paid.usageLedger;
    if(itemProof)receipt.ingestion={actorId:actor.id,recipientId:targetId,payerId:actor.id,itemId:item.id,basis:actor.id===targetId?'self':'permitted',swallowed:true};
    const target={targetId,skillId:skill.id,check:null,affected:true,effects:[]};
    const rng=makeRng(`${state.世界?.seed}:${receiptId}:field-item`);
    for(const node of skill.effectGraph.nodes.filter(node=>node.family==='payload'))executeNode(state,actor,recipient,node,rng,false,receiptId,target,{},skill);
    receipt.targets.push(target);
    if(itemProof)completeFoodIngestion(state,itemProof,targetId,paid.payment,receipt);
    receipt.sacrificeDeath=abilities.finish(state,paid.payment);
    receipt.summary=`为${recipient.名称}使用${receipt.name}：${target.effects.map(effect=>effect.effectId==='payload.heal'?`恢复${effect.amount}点生命`:effect.effectId==='payload.soul_restore'?`恢复${effect.amount}点魂力`:'恢复效果已生效').join('；')}`;
  }
  function activateRestorativeItem(rawState,actorId,itemId,receiptId,targetId=actorId,modeId) {
    const state=foundation.normalizeState(clone(rawState)),context=restorativeItemContext(state,actorId,itemId,targetId,modeId);
    const receipt={id:receiptId,type:'field-item-used',actorId,itemId,name:context.item.name,targetId,targetName:context.target.名称,targets:[],statusEvents:[],soulPowerCost:context.cost};
    return settleFieldItemEvidence(state,receipt,[...new Set([actorId,targetId])],()=>settleRestorativeContents(state,context,receipt,modeId));
  }
  function foodConsumptionContext(state,actorId,itemId){
    const item=state.物品.实例[itemId];globalThis.SoulWorldEngine.supportFoodCarrier(state,item,{allowPoisoned:true});
    if(!globalThis.SoulWorldEngine.isCarriedItem(state,item,actorId))throw Error('需要本人实际携带的一份食品');
    const actor=state.战斗单位.列表[actorId],skill=getSkill(state,actor,`item-skill-${itemId}`);
    if(!skill||!abilities.verify(skill).pass)throw Error('食品原能力不属于食用者');
    if(!actions.battleOf(state,actorId))return {...restorativeItemContext(state,actorId,itemId,actorId),fieldUse:true};
    validateSkillSpecialRequirements(state,actor,skill);externalSourceItem(state,actor,skill);
    const usage=skillUsageAvailability(state,actor,skill);if(!usage.available)throw Error(usage.reason);
    const payment=quoteSkillUse(state,actor,skill,{targetIds:[actorId]});return {actor,skill,item,target:actor,cost:payment.totals.soulPower,payment,fieldUse:false};
  }
  function quoteFoodConsumption(state,actorId,itemId){const c=foodConsumptionContext(state,actorId,itemId);return {actorId,itemId,skillId:c.skill.id,payment:c.payment??quoteSkillUse(state,c.actor,c.skill,{fieldUse:true,ingestionTargetId:actorId})};}
  function consumeFoodContents(state,actorId,itemId,receiptId){
    const context=foodConsumptionContext(state,actorId,itemId),receipt={id:receiptId,type:'food-consumed',actorId,itemId,name:context.item.name,targets:[],statusEvents:[],narrationFacts:[]};
    if(context.fieldUse){if(actionEvidence.has(state))settleRestorativeContents(state,context,receipt);else settleFieldItemEvidence(state,receipt,[actorId],()=>settleRestorativeContents(state,context,receipt));}
    else executeSkill(state,context.actor,context.skill,{type:'技能',skillId:context.skill.id,targetIds:[actorId]},makeRng(`${state.世界?.seed}:${receiptId}:food`),receipt);
    return receipt;
  }
  function completeFoodIngestion(state,itemProof,targetId,payment,receipt){
    globalThis.SoulWorldEngine.supportFoodCarrier(state,itemProof,{allowPoisoned:true});
    const fee=payment.items.find(v=>v.itemId===itemProof.id);
    if(!receipt.ingestion?.swallowed||receipt.ingestion.recipientId!==targetId||!fee||fee.quantity!==1||fee.quantityBefore!==1||fee.quantityAfter!==0)throw Error('食品缺少本次真实吞服与消耗');
    const exposure=globalThis.SoulPoisonCore.ingestServing(state,itemProof.id,targetId,receipt.id,receipt,{itemProof,consumption:{operationId:receipt.id,itemId:itemProof.id,quantity:1,quantityBefore:fee.quantityBefore,quantityAfter:fee.quantityAfter,payment:clone(payment)}});
    if(exposure)receipt.exposure=exposure;
  }

  function cleanSkillContract(skill){const source=clone(skill);for(const key of Object.keys(source))if(key.startsWith('_'))delete source[key];return source;}
  function battleResourceView(state,unitId){
    const actor=state.战斗单位?.列表?.[unitId];if(!actor)return [];
    const rows=[],seen=new Set();
    for(const skill of mechanics.sources(state,actor,(holder,source)=>poolSourceAllowed(state,holder,source))){
      for(const node of skill.effectGraph?.nodes??[])if(node.effectId==='status.battle_resource'){
        const row=mechanics.readPool(state,actor,skill,node.params.资源槽,(holder,source)=>poolSourceAllowed(state,holder,source));if(!row||seen.has(row.key))continue;seen.add(row.key);
        rows.push({slot:node.params.资源槽,name:node.params.名称??node.label??skill.name??'战斗累计',current:row.value,maximum:node.params.容量,sourceMartialSoulId:skillMartialSoulId(skill)});
      }
    }
    return rows;
  }
  function chargeSources(state,actor,skill,slot){return activeStatuses(state,actor.id,'status.limited_followup').filter(status=>status.快照.参数.资源槽===slot&&status.扩展.作用来源===mechanics.scope(skill)&&status.层数>0);}
  function followupQuota(state,actor,status){
    const key=JSON.stringify([actor.id,status.扩展.作用来源,status.快照.参数.资源槽]),entries=state.战斗.扩展.通用追击额度??={};
    let quota=entries[key];
    if(!quota||quota.round!==state.战斗.回合)quota=entries[key]={unitId:actor.id,scope:status.扩展.作用来源,slot:status.快照.参数.资源槽,round:state.战斗.回合,used:0};
    return quota;
  }
  function reserveConfluence(state,actor,skill,node,receipt){
    let remaining=Number(node.params.最大数量),count=0;const chunks=[];
    for(const status of chargeSources(state,actor,skill,node.params.资源槽)){
      const taken=Math.min(remaining,status.层数);if(!taken)break;
      chunks.push({statusId:status.id,count:taken,params:clone(status.快照.参数),source:clone(status.扩展.追击来源合同)});
      status.层数-=taken;status.扩展.剩余次数=status.层数;remaining-=taken;count+=taken;
      if(!status.层数)removeStatus(state,status,'confluence-consumed',receipt);
    }
    emitMechanicEvent(state,actor,skill,'confluence',node.params.事件槽,count,receipt);
    return {count,chunks};
  }
  function applyChargeDamage(state,actor,target,chunk,rng,critical,targetReceipt,receiptId){
    const source=chunk.source;if(!source)throw Error('追加载荷缺少已支付来源合同');
    const skill=effectiveOutputSkill(state,actor.id,{...source,_runtimeOutputScale:runtimeSkillScale(state,actor,source),_damageRemainders:{}});
    for(let index=0;index<chunk.count;index++)applyDamage(state,actor,target,{id:`charge-${chunk.statusId}-${index}`,effectId:'payload.damage',family:'payload',params:{类型:chunk.params.类型,骰数:chunk.params.骰数,骰面:chunk.params.骰面,加值:chunk.params.加值??0,穿透档:0}},rng,critical,targetReceipt,skill);
    (targetReceipt.chargeEvents??=[]).push({sourceStatusId:chunk.statusId,count:chunk.count,receiptId});
  }
  function triggerFollowup(state,actor,target,skill,rng,receipt,targetReceipt){
    if(!targetReceipt.check?.hit||sameSide(state,actor,target)||!mechanics.scope(skill)||controls.permissionReason(state,actor.id,skill))return;
    for(const status of activeStatuses(state,actor.id,'status.limited_followup')){
      if(status.扩展.作用来源!==mechanics.scope(skill)||skill._confluenceSlots?.has(status.快照.参数.资源槽))continue;
      const quota=followupQuota(state,actor,status),round=state.战斗.回合,used=quota.used;
      if(used>=Number(status.快照.参数.每回合上限??1)||status.层数<1)continue;
      const chunk={statusId:status.id,count:1,params:clone(status.快照.参数),source:clone(status.扩展.追击来源合同)};
      quota.used++;status.扩展.追击回合=round;status.扩展.回合触发次数=used+1;status.层数--;status.扩展.剩余次数=status.层数;
      if(!status.层数)removeStatus(state,status,'charges-consumed',receipt);
      applyChargeDamage(state,actor,target,chunk,rng,false,targetReceipt,receipt.id);
    }
  }
  function counterCheckProfile(state,defender,skill,counter,attacker){
    const source=getSkill(state,defender,counter.来源?.技能ID)??counter.扩展?.持续来源合同??{sourceMartialSoulId:counter.来源?.武魂ID};
    return {modifier:attributeModifier(state,defender,'意志')+Number(counter.快照?.参数?.强度??1)+(realmSourceEligible(source)?foundation.combatRealm(defender).bonus:0),dc:skillCheckDC(state,attacker,skill)};
  }
  function executionOutputScale(state,actor,skill,nextModifier){return clamp(runtimeSkillScale(state,actor,skill)*Number(nextModifier?.快照?.参数?.效果倍率??100)/100,0.2,3);}
  function upcastApplicationCount(executions){return Math.max(1,executions.reduce((total,item)=>total+item.branch.nodes.filter(node=>UPCAST_NUMERIC_EFFECTS.has(node.effectId)||node.effectId==='contract.oath'&&effects.graphBranches(item.source?.effectGraph??item.skill?.effectGraph).find(b=>b.id===item.branch.id)?.nodes.some(n=>n.effectId==='payload.soul_damage')).reduce((sum,node)=>sum+(node.family==='zone'?1:Math.max(1,item.targetIds.length)),0),0));}
  function executeSkill(state, actor, skill, intent, rng, receipt) {
    skill=effects.currentSoulRingCastSkill(state,actor,skill,intent.castRank);
    const release=effects.soulRingCastRelease(skill);if(release.reason)throw Error(release.reason);
    if (effects.skillActivation(skill.effectGraph) === 'passive') throw new Error('被动能力随来源生效，无需施放');
    const validation = effects.validateGraph(skill.effectGraph, {ageTier: skill.ageTier ?? '十万年', mechanismCap: skill.mechanismCap ?? '规则'});
    if (!validation.pass) throw new Error(`技能效果图非法：${validation.errors.join('；')}`);
    if(state.战斗.回合===1&&actor.扩展?.武魂战斗修正?.首回合禁用高阶机制&&usesAdvancedChannel(skill))throw new Error('显化迟滞：第一回合不能使用包含高阶机制的魂技');
    validateSkillSpecialRequirements(state, actor, skill);
    const nextModifier = activeStatuses(state, actor.id, 'modifier.next_skill').find(status => status.来源?.技能ID !== skill.id);
    const modifierParams = nextModifier?.快照?.参数 ?? {};
    const castProfile = soulRingCastProfile(state, actor, skill, intent.castRank);
    const branches=selectedSkillBranches(skill,intent),branchIds=branches.map(b=>b.id);
    assertContractFormationReady(state,actor,skill,{...intent,branchIds});
    if(branches.flatMap(b=>b.nodes).filter(n=>['payload.repair_item','payload.fabricate'].includes(n.effectId)).length>1)throw Error('每次行动只能选择一种物品构造用途');
    const applicationOptions={force:intent.force,permissionId:intent.permissionId};
    const quote=quoteSkillUse(state,actor,skill,{castRank:intent.castRank,modeId:intent.modeId,branchIds,targetIds:support.chargesByTarget(skill)?resolveTargets(state,actor,skill,intent):intent.targetIds,applicationOptions,supportElements:intent.supportElements});
    const cost=quote.totals.soulPower;
    const available = controls.availableSoulPower(state,actor.id);
    const soulPowerBefore = (globalThis.SoulCombatDeployments.soulPowerResource(state,actor.id)).当前;
    const usageAvailability = skillUsageAvailability(state, actor, skill);
    if (!usageAvailability.available) throw new Error(usageAvailability.reason);
    const activationLock = avatarActivationLock(skill,state,actor);
    if (available < cost + activationLock) throw new Error(`魂力不足：施放需要${cost}并额外锁定${activationLock}，可用${available}`);
    const supportSource=support.maintain(skill)?support.sourceRows(state,actor.id).find(e=>e.skillId===skill.id):null;
    const maintenanceReceiptId=supportSource?.id??receipt.id;
    const branchExecutions = branches.map((originalBranch,index) => {
      for(const node of originalBranch.nodes.filter(n=>n.effectId==='summon.entity'))validateFixedSummonSelection(state,actor,node.params,skill,intent.summonSkillIds);
      const branch={...originalBranch,nodes:effects.graphBranches(effects.projectExecutionGraph(skill)).find(b=>b.id===originalBranch.id).nodes};
      const scopedSkill = skillForBranch(skill,branch);
      const scopedIntent = intentForBranch(intent,branch,index,branches);
      const targetIds=resolveTargets(state,actor,scopedSkill,scopedIntent),approach=branch.nodes.find(node=>node.effectId==='move.approach');
      return {branch,source:skill,skill:scopedSkill,intent:scopedIntent,targetIds,approach:approach?approachPlan(state,actor,state.战斗单位.列表[targetIds[0]],approach):null};
    });
    const applications=upcastApplicationCount(branchExecutions);
    const outputScale=executionOutputScale(state,actor,skill,nextModifier);
    const executionSkill = {
      ...skill,
      _sourceContract:cleanSkillContract(skill),
      _creationPayment:receipt.payment,
      _outputPermission:controls.outputSnapshot(state,actor.id),
      _damageRemainders:{},
      _confluenceSlots:new Set(),_confluences:{},_battleResourceConsumption:{},_mechanicApplied:{},
      ...(intent.supportElements?{_supportElements:intent.supportElements}:{}),
      ...(intent.summonSkillIds?{_summonSkillIds:cleanList(intent.summonSkillIds)}:{}),
      ...(intent.summonSoulPower!==undefined?{_summonSoulPower:intent.summonSoulPower}:{}),
      outputScale,
      _runtimeOutputScale: outputScale,
      _upcast: {
        total: castProfile.upcastBonus,
        applications,
        share: Math.floor(castProfile.upcastBonus / applications),
        remainder: castProfile.upcastBonus % applications,
        cursor: 0
      }
    };
    const deviceNodes=branches.flatMap(b=>b.nodes),deviceTargets=cleanList(branchExecutions.flatMap(e=>e.targetIds)),deviceContext=globalThis.SoulDeviceOperations.castContext(state,actor.id,skill,deviceNodes,deviceTargets.length===1?deviceTargets[0]:null,intent,state.战斗.id);
    const actualTargetIds=cleanList(branchExecutions.flatMap(e=>e.targetIds));
    if(branches.some(b=>b.nodes.some(n=>['payload.stack_confluence','payload.resource_damage'].includes(n.effectId)))&&actualTargetIds.length!==1)throw Error('消费累计载荷的攻击必须只作用于一名合法目标');
    for(const node of branches.flatMap(b=>b.nodes).filter(n=>n.effectId==='payload.resource_damage')){
      const row=mechanics.readPool(state,actor,skill,node.params.资源槽,(holder,source)=>poolSourceAllowed(state,holder,source));
      if(!row||row.value<Number(node.params.最低层数??1))throw Error('本场累计资源不足');
    }
    const paymentOptions=skillPaymentOptions(state,actor,skill,{castRank:intent.castRank,modeId:intent.modeId,branchIds,targetIds:actualTargetIds,applicationOptions,supportElements:intent.supportElements});
    let application=null;
    if(paymentOptions.ingestionTargetId){
      const target=state.战斗单位.列表[paymentOptions.ingestionTargetId];
      quoteSkillUse(state,actor,skill,{castRank:intent.castRank,modeId:intent.modeId,branchIds,targetIds:actualTargetIds,applicationOptions,supportElements:intent.supportElements});
      application=globalThis.SoulWorldEngine.abilityApplicationAuthority(state,actor.id,target.id,skill,paymentOptions.applicationOptions);
      const ingestion=ingestionAttempt(state,actor,target,skill,application,intent.force===true,rng);
      receipt.ingestion=ingestion;
      if(!ingestion.swallowed){
        const failed=paySkillUse(state,actor,skill,receipt,{castRank:intent.castRank,modeId:intent.modeId,branchIds,targetIds:actualTargetIds,applicationOptions,preserveOralDose:true});
        receipt.skill={id:skill.id,name:skill.name??skill.id,soulPowerCost:failed.payment.totals.soulPower,...skillSourcePresentation(state,skill)};
        receipt.narrationFacts.push(`${target.名称}挣脱了本次强制给药，未吞服，药物仍由${actor.名称}持有`);receipt.sacrificeDeath=abilities.finish(state,failed.payment);return;
      }
    }
    if(skill.medicine&&skill.medicine.route!=='oral')throw Error('接触与吸入药剂须使用药剂施用主行动');
    const foodItemProof=state.物品?.实例?.[skill.sourceItemId]?.type==='辅助食品'?clone(state.物品.实例[skill.sourceItemId]):null;
    const medicineItemProof=skill.medicine?clone(state.物品.实例[skill.sourceItemId]):null;
    const medicineSnapshot=skill.medicine?medicineReleaseSnapshot(state,actor,skill):null;
    const paid=paySkillUse(state,actor,skill,receipt,{castRank:intent.castRank,modeId:intent.modeId,branchIds,targetIds:actualTargetIds,applicationOptions,supportElements:intent.supportElements});
    for(const node of branches.flatMap(b=>b.nodes)){
      if(node.effectId==='payload.stack_confluence'){
        executionSkill._confluenceSlots.add(node.params.资源槽);
        executionSkill._confluences[node.id]=reserveConfluence(state,actor,skill,node,receipt);
      }
      if(node.effectId==='payload.resource_damage'){
        const used=mechanics.consume(state,actor,skill,node.params.资源槽,Number(node.params.最低层数??1),(holder,source)=>poolSourceAllowed(state,holder,source));
        executionSkill._battleResourceConsumption[node.id]={...used,credited:Math.min(used.amount,node.params.最大计入层数)};
        (receipt.battleResourceEvents??=[]).push({event:'consume-all',...used});
      }
      if(node.effectId==='payload.damage'&&node.params.事件槽)emitMechanicEvent(state,actor,skill,'action-release',node.params.事件槽,1,receipt);
    }
    executionSkill._creationPayment=paid.payment;
    if(deviceContext){executionSkill._deviceTarget=clone(deviceContext.target);executionSkill._deviceTicket=globalThis.SoulDeviceOperations.prepareEffect(state,actor.id,skill.id,[deviceContext.nodeId],paid.payment,receipt.id,{battleId:state.战斗.id,targetItemId:deviceContext.target.itemId,lockId:deviceContext.target.lockId,knowledgeId:deviceContext.target.knowledgeId,materials:deviceContext.target.materials,deviceNodeId:deviceContext.nodeId});}
    if(application?.permissionId)globalThis.SoulWorldEngine.consumeAbilityPermission(state,application.permissionId,receipt.id);
    const usageLedger=paid.usageLedger;
    receipt.skill = {
      id: skill.id, name: skill.name ?? skill.名称 ?? skill.id, soulPowerCost: cost,
      ...skillSourcePresentation(state, skill),
      castRank: castProfile.selectedRank, nativeCastRank: castProfile.nativeRank, maximumCastRank: castProfile.maximumRank,
      upcastBonus: castProfile.upcastBonus, upcastApplications: applications,
      effectGraphHash: skill.immutableHash ?? '', usageLedger, nextModifierStatusId: nextModifier?.id ?? '',
      branches:branchExecutions.map(item => ({id:item.branch.id,label:item.branch.label,targetPolicy:item.branch.targetPolicy,targetIds:clone(item.targetIds)}))
    };
    receipt.resources = {actorSoulPower:{before:soulPowerBefore,spent:cost,after:(globalThis.SoulCombatDeployments.soulPowerResource(state,actor.id)).当前,netChange:(globalThis.SoulCombatDeployments.soulPowerResource(state,actor.id)).当前-soulPowerBefore}};
    // Pre-check movement is an action phase, before any branch resolves its checks.
    // All fees and obligations have already been paid; new self-restrictions govern later actions.
    for(const branchExecution of branchExecutions)if(branchExecution.approach){
      actor.位置=clone(branchExecution.approach.to);globalThis.SoulPoisonCore?.syncResidents(state);
      (receipt.approaches??=[]).push({...clone(branchExecution.approach),branchId:branchExecution.branch.id});
    }
    if(skill.medicine){if(actualTargetIds.length!==1||!receipt.ingestion?.swallowed)throw Error('口服药剂必须实际吞服且只作用于一名接受者');const targetId=actualTargetIds[0],r=globalThis.SoulPoisonCore.createReleasedSource(state,{id:`poison:${receipt.id}`,responsibleId:actor.id,skill:clone(skill),releaseSnapshot:medicineSnapshot,itemProof:medicineItemProof,blueprintHash:abilities.hash(medicineItemProof.payload?.activeSkill??{}),carrier:{kind:'direct-oral',targetId},sourceIntent:{type:'direct-medicine-use',actorId:actor.id,itemId:skill.sourceItemId,targetId},payment:paid.payment,usageLedger:clone(paid.usageLedger)});globalThis.SoulPoisonCore.expose(state,r.id,targetId,`${receipt.id}:swallowed`,'oral',receipt,{kind:'direct-drug-swallowed',at:battleNow(state),itemId:skill.sourceItemId,operationId:receipt.id});}
    else for (const branchExecution of branchExecutions) {
      const scopedExecutionSkill = skillForBranch(executionSkill,branchExecution.branch);
      const checkNode = branchExecution.branch.nodes.find(node => node.family === 'check');
      const executable = branchExecution.branch.nodes.filter(node => node.placement!=='action.before-check'&&!['status.battle_resource','payload.resource_endstate'].includes(node.effectId)&&['payload','status','movement','zone','domain','summon','transform','reaction','sustain','contract'].includes(node.family));
      const domainNode = executable.find(node => node.family === 'domain');
      if (domainNode) {
        const selected=branchExecution.branch.nodes.some(n=>n.effectId==='target.allies')?branchExecution.targetIds:null;
        const target = selected?actor:state.战斗单位.列表[branchExecution.targetIds[0]];
        const targetReceipt = {targetId:target.id,skillId:skill.id,branchId:branchExecution.branch.id,branchLabel:branchExecution.branch.label,check:null,affected:true,effects:[]};
        const aim=branchExecution.intent.aimPoint??(branchExecution.intent.targetIds?.[0]&&state.战斗单位.列表[branchExecution.intent.targetIds[0]]?.位置.战场坐标);
        const anchor=domainNode.params.定点守卫&&aim?{位置:{...actor.位置,战场坐标:battlePoint(aim)}}:target;
        const domain = createDomain(state,actor,anchor,domainNode,receipt.id,targetReceipt,rng,scopedExecutionSkill,selected);
        const lockedBefore = (globalThis.SoulCombatDeployments.soulPowerResource(state,actor.id)).锁定, upkeepBefore = (globalThis.SoulCombatDeployments.soulPowerResource(state,actor.id)).持续消耗;
        for (const node of executable.filter(item => item.family === 'sustain')) executeNode(state,actor,actor,node,rng,false,receipt.id,targetReceipt,branchExecution.intent,scopedExecutionSkill);
        for(const entry of Object.values(state.战斗.扩展.维持占用??{}))if(entry.sourceId===receipt.id&&executable.some(node=>node.id===entry.nodeId))entry.domainId=domain.id;
        domain.维持.锁定魂力 = (globalThis.SoulCombatDeployments.soulPowerResource(state,actor.id)).锁定 - lockedBefore;
        domain.维持.每回合魂力 = (globalThis.SoulCombatDeployments.soulPowerResource(state,actor.id)).持续消耗 - upkeepBefore;
        receipt.targets.push(targetReceipt);
        if (domain.状态 === '生效') refreshAllDomainMembership(state,rng,receipt);
        if(domain.状态==='生效'&&(selected||domain.子效果节点.some(n=>n.params?.领域触发==='展开')))for(const unitId of [...domain.成员ID列表])processDomainEffect(state,domain,state.战斗单位.列表[unitId],rng,receipt,'展开');
        continue;
      }
      for (const [targetIndex,targetId] of branchExecution.targetIds.entries()) {
        let target = state.战斗单位.列表[targetId];
        const guardedId=target.id;
        const single=branchExecution.branch.nodes.some(n=>n.effectId==='target.single');
        if(single&&['check.physical_attack','check.soul_attack'].includes(checkNode?.effectId)&&!sameSide(state,actor,target)&&executable.some(n=>n.effectId==='payload.damage')){
          // Resolve the original target's guards once. The replacement never offers a second interception.
          const guard=activeStatuses(state,target.id,'reaction.interpose').find(s=>{
            const u=state.战斗单位.列表[s.来源.单位ID];
            return u&&u.id!==target.id&&sameSide(state,u,target)&&isActiveParticipant(state,u.id)&&
              !['status.stun','status.sleep'].some(id=>activeStatuses(state,u.id,id).length)&&
              s.扩展.剩余次数>0&&combatDistance(u,target)<=s.快照.参数.距离区;
          });
          if(guard){
            target=state.战斗单位.列表[guard.来源.单位ID];
            if(--guard.扩展.剩余次数===0)removeStatus(state,guard,'interposed',receipt);
            receipt.statusEvents.push({event:'interpose',protectedId:guardedId,guardId:target.id,statusId:guard.id});
          }
        }
        const targetReceipt = {targetId:target.id,...(guardedId!==target.id?{protectedId:guardedId}:{}),skillId:skill.id,branchId:branchExecution.branch.id,branchLabel:branchExecution.branch.label,check:null,affected:false,effects:[]};
        if(branchExecution.approach){
          targetReceipt.effects.push(clone(branchExecution.approach));
          if(combatDistance(actor,target)>.000001){targetReceipt.check={type:'range',reached:false,reason:'追击后未进入触及距离',distance:combatDistance(actor,target)};receipt.narrationFacts.push(`${actor.名称}完成了已付费追击，仍未触及${target.名称}`);receipt.targets.push(targetReceipt);continue;}
        }
        const counter = !sameSide(state,actor,target) ? activeStatuses(state,target.id,'reaction.counter')[0] : null;
        if (counter) {
          const die = rng.die(20);
          const {modifier,dc}=counterCheckProfile(state,target,skill,counter,actor);
          const success = die === 20 || (die !== 1 && die + modifier >= dc);
          counter.扩展.剩余次数 = Math.max(0,Number(counter.扩展?.剩余次数 ?? 1)-1);
          if (counter.扩展.剩余次数 <= 0) removeStatus(state,counter,'consumed',receipt);
          targetReceipt.counter = {statusId:counter.id,die,modifier,total:die+modifier,dc,success};
          if (success) {
            targetReceipt.effects.push({effectId:'reaction.counter',counteredSkillId:skill.id});
            receipt.targets.push(targetReceipt);
            continue;
          }
        }
        const check = rollCheck(state,actor,target,checkNode,rng,targetReceipt,scopedExecutionSkill);
        targetReceipt.affected = check.affected;
        const graze=Number(targetReceipt.check?.interference?.grazePercent??0);
        const grazeSkill=graze?{...scopedExecutionSkill,_hitGrazeScale:graze/100}:scopedExecutionSkill;
        const saveHalf = targetReceipt.check?.saved && targetReceipt.check?.successEffect === '伤害减半';
        if (check.affected || saveHalf || graze) {
          for (const node of executable) {
            if(graze&&node.effectId!=='payload.damage')continue;
            if(!graze&&!check.affected&&!['payload.damage','payload.drain'].includes(node.effectId))continue;
            if (targetIndex > 0 && ['zone','summon'].includes(node.family)) continue;
            executeNode(state,actor,target,node,rng,check.critical,maintenanceReceiptId,targetReceipt,branchExecution.intent,grazeSkill);
          }
        }
        if(targetReceipt.check?.hit&&checkNode?.effectId==='check.physical_attack'){const weaponId=skill.sourceItemId;if(weaponId)globalThis.SoulPoisonCore?.touch(state,weaponId,target.id,receipt.id,receipt);}
        if(targetReceipt.check?.hit&&!sameSide(state,actor,target)){
          for(const node of executable)if(node.effectId==='payload.damage'&&node.params.事件槽)emitMechanicEvent(state,actor,skill,'action-hit',node.params.事件槽,1,receipt,target.id);
          triggerFollowup(state,actor,target,executionSkill,rng,receipt,targetReceipt);
        }
        receipt.targets.push(targetReceipt);
      }
    }
    if(foodItemProof&&receipt.ingestion?.swallowed)completeFoodIngestion(state,foodItemProof,receipt.ingestion.recipientId,paid.payment,receipt);
    if (!isBeneficialSkill(skill)) {
      for (const invisible of activeStatuses(state, actor.id, 'status.invisibility')) {
        if (invisible.扩展?.攻击后解除) removeStatus(state,invisible,'attack-revealed',receipt);
      }
    }
    receipt.resources.actorSoulPower.after = (globalThis.SoulCombatDeployments.soulPowerResource(state,actor.id)).当前;
    receipt.resources.actorSoulPower.netChange = (globalThis.SoulCombatDeployments.soulPowerResource(state,actor.id)).当前 - soulPowerBefore;
    consumeNextSkillModifier(state, nextModifier);
    globalThis.SoulAbilityExchange.complete(state,receipt.id,receipt);if(!supportSource)registerMaintenance(state,actor,skill,receipt);else support.refreshCosts(state);
    receipt.sacrificeDeath=abilities.finish(state,paid.payment);
    globalThis.SoulPersonContracts?.completeRelease(state,receipt);
    for(const node of branches.flatMap(b=>b.nodes).filter(n=>n.effectId==='payload.resource_endstate')){
      const payer=node.params.承担者==='本体'?mechanics.owner(state,actor,skill):actor;
      const before={health:payer.资源.生命.当前,soulPower:(globalThis.SoulCombatDeployments.soulPowerResource(state,payer.id)).当前};
      if(payer.存活状态!=='死亡'&&payer.资源.生命.当前>0)payer.资源.生命.当前=Math.min(payer.资源.生命.当前,Number(node.params.生命终值));
      (globalThis.SoulCombatDeployments.soulPowerResource(state,payer.id)).当前=Math.min((globalThis.SoulCombatDeployments.soulPowerResource(state,payer.id)).当前,Number(node.params.魂力终值));
      stopUnfundedMaintenance(state,payer,receipt);
      (receipt.resourceEndstates??=[]).push({effectId:node.effectId,payerId:payer.id,before,after:{health:payer.资源.生命.当前,soulPower:(globalThis.SoulCombatDeployments.soulPowerResource(state,payer.id)).当前},deathPreserved:payer.存活状态==='死亡'});
    }
    receipt.resources.actorSoulPower.after=(globalThis.SoulCombatDeployments.soulPowerResource(state,actor.id)).当前;
    receipt.resources.actorSoulPower.netChange=(globalThis.SoulCombatDeployments.soulPowerResource(state,actor.id)).当前-soulPowerBefore;
  }

  function physiologicalStunSource(actorId,targetId,receiptId,eventId,originalSkill=null){
    return abilities.seal({id:`physiology:${receiptId}:${targetId}`,name:'高潮失神',sourceKind:'tactic',持有者单位ID:targetId,soulPowerCost:0,
      source:{kind:'physiology-event',eventId,receiptId,originalSkillId:originalSkill?.id??'',originalOwnerId:originalSkill?.持有者单位ID??actorId},
      effectGraph:effects.makeLinearGraph([['target.self',{}],['status.stun',{持续回合:1}]])});
  }

  function addSimpleStatus(state, actor, templateId, params, receipt) {
    const source=abilities.seal({id:`tactic:${templateId}`,name:'战术状态',sourceKind:'tactic',持有者单位ID:actor.id,soulPowerCost:0,effectGraph:effects.makeLinearGraph([['target.self',{}],[templateId,params]])}),node=source.effectGraph.nodes[1];
    const targetReceipt = {targetId: actor.id, skillId: source.id, check: null, affected: true, effects: []};
    applyStatus(state, actor, actor, node, receipt.id, targetReceipt,source);
    receipt.targets.push(targetReceipt);
  }

  function validateBreakFreeSource(status,actorId,atMinute){
    return !!status&&['status.bind','status.limb_bind'].includes(status.模板ID)&&Number.isFinite(status.快照?.施加者DC)&&validateControlSourceProof(status,actorId,atMinute);
  }
  function breakFreeProfile(state,actorId,statusId,options={}){
    const actor=state.战斗单位.列表[actorId],candidates=controls.breakable(state,actorId);
    const bind=statusId?candidates.find(status=>status.id===statusId):candidates[0];
    if (!bind) throw new Error('当前没有可挣脱的束缚');
    if(options.method==='soul')return globalThis.SoulDeviceOperations.soulBreakProfile(state,actorId,bind,{battleId:options.battleId??globalThis.SoulActionContext.battleOf(state,actorId)?.id??null});
    if(options.method!==undefined&&options.method!=='physical')throw Error('挣脱方法无效');
    const attribute = bind.快照?.参数?.挣脱属性 ?? '力量';
    const traitBonus=Number(actor.扩展?.武魂战斗修正?.挣脱加值??0);
    const modifier = attributeModifier(state,actor,attribute) + actor.派生.熟练加值 + traitBonus + (options.battleId ? foundation.combatRealm(actor).bonus : 0);
    const dc = (bind.快照?.施加者DC ?? 10)+Number(bind.快照?.参数?.挣脱难度加值??0)+globalThis.SoulAbilityExchange.controlBonus(state,bind.来源.单位ID,{sourceMartialSoulId:bind.来源.武魂ID});
    return {statusId:bind.id,attribute,traitBonus,modifier,dc};
  }
  function resolveBreakFree(state, actor, rng, receipt, statusId,method='physical') {
    const profile=breakFreeProfile(state,actor.id,statusId,{method,battleId:state.战斗.id}),{statusId:bindId,attribute,traitBonus,modifier,dc}=profile,bind=state.状态实例.列表[bindId];
    if(method==='soul')receipt.soulBreakPayment=globalThis.SoulDeviceOperations.paySoulBreak(state,actor.id,profile);
    const die=rng.die(20);
    const success = die === 20 || (die !== 1 && die + modifier >= dc);
    if (success) {
      removeStatusLayer(state,bind,'broken-free',receipt);
    }
    receipt.targets.push({targetId: actor.id, check: {type: 'break-free', attribute, die, modifier, traitBonus, total: die + modifier, dc, success}, affected: success, effects: success ? [{effectId: bind.模板ID, removed: true}] : []});
  }

  function tickStartOfTurn(state, unit, rng, receipt) {
    for(const status of Object.values(state.状态实例.列表).filter(x=>x.持续?.模式==='来源下回合'&&x.来源?.单位ID===unit.id))removeStatus(state,status,'source-next-turn',receipt);
    tickExternalCooldowns(state, unit, receipt);
    globalThis.SoulCombatDeployments.upkeep(state,unit.id);
    const quotaOwnerId=globalThis.SoulCombatDeployments.sourceContext(state,unit.id)?.quotaOwnerId??unit.id,shared=quotaOwnerId!==unit.id&&!isActiveParticipant(state,quotaOwnerId);
    state.战斗.扩展.额度冷却回合??={};const shouldTick=quotaOwnerId===unit.id||shared&&state.战斗.扩展.额度冷却回合[quotaOwnerId]!==state.战斗.回合;if(shared&&shouldTick)state.战斗.扩展.额度冷却回合[quotaOwnerId]=state.战斗.回合;
    const cooldowns=shouldTick?(state.战斗.扩展?.技能冷却?.[quotaOwnerId]??{}):{};
    for(const key of Object.keys(cooldowns)){cooldowns[key]=Math.max(0,cooldowns[key]-1);if(!cooldowns[key])delete cooldowns[key];}
    refreshDomainMembershipForUnit(state, unit, rng, receipt, 'turn-start');
    for (const status of activeStatuses(state, unit.id)) {
      if (status.清理规则?.来源失能) {
        const source = state.战斗单位.列表[status.来源?.单位ID];
        if (!source || source.存活状态 !== '存活') {
          removeStatus(state,status,'source-invalidated',receipt);
          continue;
        }
      }
      if (status.模板ID === 'status.damage_over_time' || status.模板ID === 'status.burn' || status.模板ID === 'status.poison'&&!controls.persistent(status)) {
        const params = status.快照?.参数 ?? {};
        const dice = rollDice(rng, params.骰数 ?? 1, params.骰面 ?? 4, status.模板ID);
        const upcastBonus = consumePersistentUpcast(status);
        const elementAmplification=foundation.amplifyElementDamage(periodicOutputAmount(state,status,dice.total * Math.max(1, status.层数 ?? 1) + (status.模板ID==='status.burn'?Number(params.加值??0):0) + upcastBonus),status.快照?.属性增伤);
        const rawAmount = elementAmplification.amount;
        const damageType = status.模板ID === 'status.damage_over_time' ? params.类型 : status.模板ID === 'status.burn' ? '火焰' : '毒素';
        const resistance = resolveResistance(state, unit, damageType, rawAmount, params.穿透档 ?? 0,{exchangeSource:status.来源,exchangeAbility:status.扩展?.持续来源合同,sourceUnitId:status.来源?.单位ID,outputPermission:status.扩展?.输出许可});
        const applied = applyResolvedDamage(state, unit, resistance, {sourceUnitId: status.来源?.单位ID, damageType});
        const kill = recordKill(state, unit.id, status.来源?.单位ID, receipt, {
          type: 'status', id: status.id, skillId: status.来源?.技能ID
        });
        receipt.statusEvents.push({
          statusId: status.id, event: 'tick', dice, upcastBonus, rawAmount, ...(elementAmplification.percent?{elementAmplification}:{}), damageType, resistance, ...applied,
          targetId: unit.id, remainingHp: unit.资源.生命.当前,
          sourceUnitId: status.来源?.单位ID ?? '', creditedKillerId: kill?.killerId ?? '',
          sourceSkillId: status.来源?.技能ID ?? '', sourceReceiptId: status.来源?.结算单ID ?? ''
        });
      } else if (status.模板ID === 'status.regeneration'&&!controls.persistent(status)) {
        const params = status.快照?.参数 ?? {};
        const dice = rollDice(rng, params.骰数 ?? 1, params.骰面 ?? 4, '再生');
        const upcastBonus = consumePersistentUpcast(status);
        const amount = periodicOutputAmount(state,status,dice.total + Number(params.加值 ?? 0) + upcastBonus);
        const healed = Math.min(Math.floor(amount * healingMultiplier(state, unit)), unit.资源.生命.最大 - unit.资源.生命.当前);
        unit.资源.生命.当前 += healed;
        recoverConsciousness(state, unit);
        receipt.statusEvents.push({
          statusId: status.id, event: 'regeneration', dice, upcastBonus, amount: healed,
          targetId: unit.id, remainingHp: unit.资源.生命.当前,
          sourceUnitId: status.来源?.单位ID ?? '', sourceSkillId: status.来源?.技能ID ?? ''
        });
      } else if (status.模板ID === 'status.eternal_wound') {
        const params = status.快照?.参数 ?? {};
        const upkeep = Number(params.每回合魂力 ?? 1);
        const soulPowerBefore = (globalThis.SoulCombatDeployments.soulPowerResource(state,unit.id)).当前;
        const paid = Math.min((globalThis.SoulCombatDeployments.soulPowerResource(state,unit.id)).当前, upkeep);
        (globalThis.SoulCombatDeployments.soulPowerResource(state,unit.id)).当前 -= paid;
        const shortage = Math.max(0, upkeep - paid);
        const dice = rollDice(rng, params.骰数 ?? 1, params.骰面 ?? 4, '永久创伤');
        const elementAmplification=foundation.amplifyElementDamage(periodicOutputAmount(state,status,dice.total + shortage * Number(params.魂力耗尽倍率 ?? 1)),status.快照?.属性增伤);
        const rawAmount = elementAmplification.amount;
        const resistance = resolveResistance(state, unit, '毒素', rawAmount, 0,{exchangeSource:status.来源,exchangeAbility:status.扩展?.持续来源合同,sourceUnitId:status.来源?.单位ID,outputPermission:status.扩展?.输出许可});
        const applied = applyResolvedDamage(state, unit, resistance, {sourceUnitId: status.来源?.单位ID, damageType: '毒素'});
        const kill = recordKill(state, unit.id, status.来源?.单位ID, receipt, {type: 'status', id: status.id, skillId: status.来源?.技能ID});
        receipt.statusEvents.push({
          statusId: status.id, event: 'eternal-wound', upkeep, paid, shortage, dice, rawAmount, ...(elementAmplification.percent?{elementAmplification}:{}), resistance, ...applied,
          targetId: unit.id, remainingHp: unit.资源.生命.当前, soulPowerBefore, remainingSoulPower: (globalThis.SoulCombatDeployments.soulPowerResource(state,unit.id)).当前,
          sourceUnitId: status.来源?.单位ID ?? '', sourceSkillId: status.来源?.技能ID ?? '', creditedKillerId: kill?.killerId ?? ''
        });
      }
    }
    for (const zone of activeZones(state, 'hazard').filter(item => zoneContains(item, unit))) {
      const params = zone.参数 ?? {};
      const ageReason=controls.adultReason(state,unit.id,{params})||controls.adultReason(state,zone.来源?.单位ID,{params});if(ageReason){receipt.statusEvents.push({zoneId:zone.id,event:'hazard-prevented',targetId:unit.id,prevented:ageReason});continue;}
      if (Number(params.骰数 ?? 0) <= 0) continue;
      const damageType = foundation.canonicalDamageType(params.类型 ?? '物理');
      const dice = rollDice(rng, params.骰数, params.骰面 ?? 4, `${damageType}区域`);
      const upcastBonus = consumePersistentUpcast(zone);
      const elementAmplification=foundation.amplifyElementDamage(periodicOutputAmount(state,zone,dice.total + Number(params.加值 ?? 0) + upcastBonus),zone.属性增伤);
      const rawAmount = elementAmplification.amount;
      const resistance = resolveResistance(state, unit, damageType, rawAmount, params.穿透档 ?? 0,{exchangeSource:zone.来源,exchangeAbility:zone.扩展?.持续来源合同,sourceUnitId:zone.来源?.单位ID,outputPermission:zone.输出许可});
      const applied = applyResolvedDamage(state, unit, resistance, {sourceUnitId: zone.来源?.单位ID, damageType});
      const kill = recordKill(state, unit.id, zone.来源?.单位ID, receipt, {
        type: 'zone', id: zone.id, skillId: zone.来源?.技能ID
      });
      receipt.statusEvents.push({
        zoneId: zone.id, event: 'hazard-tick', dice, upcastBonus, rawAmount, ...(elementAmplification.percent?{elementAmplification}:{}), damageType, resistance, ...applied,
        targetId: unit.id, remainingHp: unit.资源.生命.当前,
        sourceUnitId: zone.来源?.单位ID ?? '', creditedKillerId: kill?.killerId ?? '',
        sourceSkillId: zone.来源?.技能ID ?? '', sourceReceiptId: zone.来源?.结算单ID ?? ''
      });
    }
    if(!state.世界?.时间)advanceMaintenanceAt(state,battleNow(state),unit.id,receipt);
  }

  function tickEndOfTurn(state, unit, receipt) {
    if(unit.扩展?.temporaryHealthTurns&&--unit.扩展.temporaryHealthTurns===0){
      const amount=foundation.clearTemporaryHealth(unit);
      if(amount)receipt.statusEvents.push({event:'shield-expired',targetId:unit.id,amount});
    }
    for (const status of activeStatuses(state, unit.id)) {
      if(status.模板ID==='transform.martial_avatar')continue;
      if(status.快照?.参数?.领域触发==='范围内'&&state.战斗.扩展?.领域实例?.[status.来源?.领域ID]?.状态==='生效')continue;
      if (status.持续?.模式 !== '目标回合结束') continue;
      if (status.持续.延后首次目标回合结束) {
        status.持续.延后首次目标回合结束 = false;
        recordStatusLifecycle(state,status,'duration-armed');
        receipt.statusEvents.push({statusId: status.id, event: 'duration-armed'});
        continue;
      }
      status.持续.剩余回合 = Math.max(0, round(status.持续.剩余回合) - 1);
      recordStatusLifecycle(state,status,'duration-decreased');
      if (status.持续.剩余回合 <= 0) {
        removeStatus(state,status,'expired',receipt);
      }
    }
    for (const zone of activeZones(state).filter(item => item.来源?.单位ID === unit.id)) {
      if(zone.constructId)continue;
      if (zone.延后首次来源回合结束) {
        zone.延后首次来源回合结束 = false;
        recordFieldLifecycle(state,zone,'zone','duration-armed');
        receipt.statusEvents.push({zoneId: zone.id, event: 'zone-duration-armed'});
        continue;
      }
      zone.剩余回合 = Math.max(0, round(zone.剩余回合) - 1);
      recordFieldLifecycle(state,zone,'zone','duration-decreased');
      if (zone.剩余回合 <= 0) {
        removeZone(state,zone.id,'expired');
        receipt.statusEvents.push({zoneId: zone.id, event: 'zone-expired'});
      }
    }
    let domainRemoved = false;
    for (const domain of Object.values(state.战斗?.扩展?.领域实例 ?? {}).filter(item => item.来源?.单位ID === unit.id)) {
      if(domain.参数?.持续方式==='来源维持')continue;
      if (domain.延后首次来源回合结束) {
        domain.延后首次来源回合结束 = false;
        recordFieldLifecycle(state,domain,'domain','duration-armed');
        receipt.statusEvents.push({domainId: domain.id, event: 'domain-duration-armed'});
        continue;
      }
      domain.剩余回合 = Math.max(0, round(domain.剩余回合) - 1);
      recordFieldLifecycle(state,domain,'domain','duration-decreased');
      if (domain.剩余回合 <= 0 || unit.存活状态 !== '存活') {
        removeDomain(state, domain.id, receipt, domain.剩余回合 <= 0 ? 'duration-expired' : 'source-invalidated');
        domainRemoved = true;
      }
    }
    if (domainRemoved) recomputeDomainConflicts(state, receipt);
    const summon = unit.扩展?.召唤;
    if (summon && !summon.constructId && !summon.deploymentId && unit.存活状态 === '存活') {
      summon.剩余回合 = Math.max(0, round(summon.剩余回合) - 1);globalThis.SoulCombatDeployments.recordTurnEnd(state,unit.id);
      if (summon.剩余回合 <= 0) {
        removeSummonedSkills(state,unit,receipt,'summon-expired');
        unit.存活状态 = '死亡';
        unit.资源.生命.当前 = 0;
        receipt.statusEvents.push({unitId: unit.id, event: 'summon-expired'});globalThis.SoulCombatDeployments.finishParticipant(state,unit.id,'投影持续到期');
      }
    }
  }

  function endWorldSummon(state,unitId,reason){
    const unit=state.战斗单位.列表[unitId];if(!unit)return;
    globalThis.SoulCombatDeployments.finishParticipant(state,unitId,reason);removeSummonedSkills(state,unit,null,reason);unit.存活状态='死亡';unit.资源.生命.当前=0;
    for(const battle of battleInstances(state).filter(b=>b.状态==='进行中'&&b.参与者ID列表.includes(unitId))){
      const front=state.战斗;state.战斗=battle;
      try{if(battle.扩展.成员[unitId])battle.扩展.成员[unitId].status='removed';
        if(!evaluateBattleEnd(state)&&battle.当前行动单位ID===unitId&&!battle.扩展.clock.pendingRoundStart){const rng=resumeRng(battle.扩展.随机),receipt={statusEvents:[],statusLifecycle:[],fieldLifecycle:[]};beginTurnAtOrAfter(state,rng,receipt,(battle.扩展.先攻顺序.indexOf(unitId)+1)%battle.扩展.先攻顺序.length,false);battle.扩展.随机=rng.snapshot();}
      }finally{state.战斗=front;}
    }
  }
  function concludeBattle(state, outcome, winnerSideId = '') {
    const members = Object.values(state.战斗.扩展.成员 ?? {});
    const activeIds = members.filter(member => isActiveParticipant(state, member.unitId)).map(member => member.unitId);
    const escapedIds = members.filter(member => member.status === 'escaped').map(member => member.unitId);
    const surrenderedIds = members.filter(member => member.status === 'surrendered').map(member => member.unitId);
    const defeatedIds = members.filter(member => member.status === 'defeated').map(member => member.unitId);
    state.战斗.状态 = '已结束';
    state.战斗.阶段 = '结算';
    state.战斗.当前行动单位ID = '';
    state.战斗.扩展.结果 = {
      outcome,
      winnerSideId,
      livingIds: activeIds,
      activeIds,
      escapedIds,
      surrenderedIds,
      defeatedIds,
      endedRound: state.战斗.回合
    };
    const preservePlayerStatuses = Boolean(state.战斗.扩展?.规则?.preservePlayerStatuses);
    const mainId = state.角色?.主控单位ID ?? '';
    for (const status of Object.values(state.状态实例.列表)) {
      const canCarry = preservePlayerStatuses && status.目标单位ID === mainId && status.模板ID !== 'transform.martial_avatar';
      if (status.来源?.战斗ID === state.战斗.id && status.清理规则?.战斗结束 && !canCarry) removeStatus(state,status,'battle-ended');
    }
    for (const domain of Object.values(state.战斗.扩展.领域实例 ?? {})) removeDomain(state, domain.id, null, 'battle-ended');
    releaseMaintain(state);
    delete state.战斗.扩展.通用战斗资源;
    delete state.战斗.扩展.通用追击额度;
    for(const unitId of state.战斗.参与者ID列表){
      const unit=state.战斗单位.列表[unitId];
      if(unit?.扩展?.召唤?.战斗ID===state.战斗.id&&!unit.扩展.召唤.constructId&&!unit.扩展.召唤.deploymentId)removeSummonedSkills(state,unit,null,'battle-ended');
      if(!occupiedBattle(state,unitId,state.战斗.id))foundation.clearTemporaryHealth(unit);
    }
    if(state.战斗.扩展.clock)state.战斗.扩展.clock.nextAt=null;
    custody.recordDefeats(state,state.战斗);globalThis.SoulCombatDeployments.finishBattle(state);
    for (const item of Object.values(state.物品?.实例 ?? {})) {
      if (item.扩展?.combatState?.battleId===state.战斗.id) {
        item.扩展.combatState.cooldownRemaining = 0;
        item.扩展.combatState.cooldownBySkill = {};
      }
    }
    if (!state.历史.some(item => item.type === 'battle-end' && item.battleId === state.战斗.id)) {
      state.历史.push({type: 'battle-end', battleId: state.战斗.id, outcome, winnerSideId, round: state.战斗.回合});
    }
    return true;
  }

  function cleanupTrainingBattle(state,battleId=state.战斗.id) {
    if(battleId!==state.战斗.id){
      const context=projectBattle(state,battleId);
      cleanupTrainingBattle(context.state,battleId);
      delete context.state.世界.backgroundBattles[battleId];
      context.state.战斗=foundation.makeDefaultState().战斗;
      foundation.commitStateDraft(state,restoreBattleProjection(context.state,context.frontId));return;
    }
    if(state.战斗.状态!=='已结束')throw Error('只能清理已结束的演练');
    for(const status of Object.values(state.状态实例.列表))if(status.来源?.战斗ID===state.战斗.id&&!controls.persistent(status))removeStatus(state,status,'training-ended');
    for(const id of [...state.战斗.参与者ID列表]){
      const unit=state.战斗单位.列表[id];
      if(unit?.扩展?.召唤?.战斗ID!==state.战斗.id||unit.扩展.召唤.constructId)continue;
      removeSummonedSkills(state,unit,null,'training-ended');
      if(!unit.扩展?.projection)delete state.战斗单位.列表[id];
    }
  }

  function evaluateBattleEnd(state) {
    globalThis.SoulCombatDeployments.reconcile(state);
    ensureBattleCollections(state);
    for (const member of Object.values(state.战斗.扩展.成员)) {
      const unit = state.战斗单位.列表[member.unitId];
      if ((!unit || unit.存活状态 !== '存活' || unit.资源.生命.当前<=0) && member.status === 'active') {
        if (unit?.扩展?.召唤) removeSummonedSkills(state,unit,null,'summon-defeated');
        member.status = 'defeated';if(unit?.扩展?.projection)globalThis.SoulCombatDeployments.finishParticipant(state,member.unitId,'投影被击溃');
      }
    }
    const active = activeParticipants(state);
    const activeSides = [...new Set(active.map(unit => sideIdOf(state, unit)).filter(Boolean))];
    const mainId = state.角色?.主控单位ID ?? '';
    if (state.战斗.扩展?.规则?.playerDefeatEndsBattle && !active.some(unit => unit.id === mainId)) {
      return concludeBattle(state, '败北', '');
    }
    if (activeSides.length > 1) return false;

    const playerSideId = sideIdOf(state, mainId);
    const playerMembers = Object.values(state.战斗.扩展.成员).filter(member => member.sideId === playerSideId);
    const playerAllEscaped = playerMembers.length > 0 && playerMembers.every(member => member.status === 'escaped');
    const winnerSideId = activeSides[0] ?? '';
    let outcome = '双方脱离';
    if (!winnerSideId) outcome = playerAllEscaped ? '全队撤退' : '双方脱离';
    else if (winnerSideId === playerSideId) {
      const opponents = Object.values(state.战斗.扩展.成员).filter(member => member.sideId !== playerSideId);
      outcome = opponents.length > 0 && opponents.every(member => member.status === 'escaped') ? '敌方逃散' : '胜利';
    } else outcome = state.战斗.参与者ID列表.includes(mainId) ? (playerAllEscaped ? '全队撤退' : '败北') : '场次结束';
    return concludeBattle(state, outcome, winnerSideId);
  }

  function beginTurnAtOrAfter(state, rng, receipt, startIndex, incrementRoundAtStart = false) {
    const order = state.战斗.扩展.先攻顺序;
    if (!order.length) return concludeBattle(state,'双方脱离','');
    let index = startIndex;
    for (let attempt = 0; attempt < order.length; attempt += 1) {
      if((attempt===0&&incrementRoundAtStart)||(attempt>0&&index===0)){
        state.战斗.回合+=1;state.战斗.当前行动单位ID=order[index];
        state.战斗.扩展.clock.pendingRoundStart=true;return true;
      }
      const unitId = order[index];
      state.战斗.当前行动单位ID = unitId;
      if (isActiveParticipant(state,unitId)) tickStartOfTurn(state,state.战斗单位.列表[unitId],rng,receipt);
      if (evaluateBattleEnd(state)) return false;
      if (isActiveParticipant(state,unitId)) return true;
      index = (index + 1) % order.length;
    }
    evaluateBattleEnd(state);
    return false;
  }

  function advanceTurn(state, rng, receipt) {
    const order = state.战斗.扩展.先攻顺序;
    if (!order.length) return concludeBattle(state, '双方脱离', '');
    const currentIndex = order.indexOf(state.战斗.当前行动单位ID);
    const current = state.战斗单位.列表[state.战斗.当前行动单位ID];
    if (current) tickEndOfTurn(state, current, receipt);
    if (evaluateBattleEnd(state)) {
      if(currentIndex===order.length-1)state.战斗.扩展.clock.completedTerminalRound=state.战斗.回合;
      return;
    }
    const nextIndex = (currentIndex + 1) % order.length;
    beginTurnAtOrAfter(state,rng,receipt,nextIndex,nextIndex === 0);
  }

  function resumeRoundStart(state,rng,receipt) {
    const clock=state.战斗.扩展.clock;
    if(!clock.pendingRoundStart||state.战斗.状态!=='进行中')return;
    clock.pendingRoundStart=false;
    if(evaluateBattleEnd(state))return;
    const index=Math.max(0,state.战斗.扩展.先攻顺序.indexOf(state.战斗.当前行动单位ID));
    beginTurnAtOrAfter(state,rng,receipt,index,false);
  }
  function settleForegroundBoundary(state,rng,receipt) {
    const clock=state.战斗.扩展.clock;
    if(clock.mode!=='foreground'||!clock.pendingRoundStart&&!clock.completedTerminalRound)return;
    const completed=clock.completedTerminalRound??state.战斗.回合-1;
    if(completed<=clock.lastCompletedRound)throw Error('战斗回合时钟重复');
    const before=battleNow(state),at=Math.max(before,clock.nextAt??clock.createdAt+completed);
    clock.lastCompletedRound=completed;
    if(state.世界?.时间){
      if(!advanceWorldClock)throw Error('尚未接入世界战斗时钟');
      advanceWorldClock(state,at-before,{statusEvents:receipt.statusEvents,...(planningClocks.has(state)?{combatProjection:true}:{})});
      people.settleAt(state);
    }
    state.战斗.扩展.clock.nextAt=state.战斗.状态==='进行中'?at+1:null;
    delete state.战斗.扩展.clock.completedTerminalRound;
    receipt.roundTime={id:`battle:${state.战斗.id}:round:${completed}`,round:completed,before,after:at};
    resumeRoundStart(state,rng,receipt);
  }
  // This projection is transaction-local. Each instance exists once, even in the view.
  function projectBattle(rawState,battleId,owned=false) {
    // Background clock execution already owns its transaction. Remap only the
    // battle containers there; public previews/actions retain full isolation.
    const state=owned?{...rawState,世界:{...rawState.世界,backgroundBattles:{...rawState.世界?.backgroundBattles}}}:clone(rawState),frontId=state.战斗.id;
    const target=state.世界?.backgroundBattles?.[battleId];
    if(!target)throw Error(`没有后台战斗：${battleId}`);
    if(frontId===battleId)throw Error('战斗实例重复');
    delete state.世界.backgroundBattles[battleId];
    if(frontId)state.世界.backgroundBattles[frontId]=state.战斗;
    state.战斗=target;
    return {state,frontId};
  }
  function restoreBattleProjection(state,frontId) {
    const selected=state.战斗;
    state.战斗=frontId?state.世界.backgroundBattles[frontId]:foundation.makeDefaultState().战斗;
    if(frontId)delete state.世界.backgroundBattles[frontId];
    if(selected.id)state.世界.backgroundBattles[selected.id]=selected;
    return state;
  }
  function startBackgroundBattle(rawState,options={}) {
    if(!rawState.世界?.时间)throw Error('后台战斗需要世界时钟');
    const projected=clone(rawState),frontId=projected.战斗.id;
    projected.世界.backgroundBattles??={};
    if(frontId){if(projected.世界.backgroundBattles[frontId])throw Error('战斗实例重复');projected.世界.backgroundBattles[frontId]=projected.战斗;}
    projected.战斗=foundation.makeDefaultState().战斗;
    const result=startBattle(projected,{...options,background:true});
    restoreBattleProjection(result.state,frontId);
    return result;
  }
  function settleBattleAction(rawState,battleId,intent,owned=false) {
    if(rawState.战斗.id===battleId)return settleAction(rawState,intent,owned);
    const context=projectBattle(rawState,battleId),result=settleAction(context.state,intent);
    return {...result,state:restoreBattleProjection(result.state,context.frontId)};
  }
  function chooseBattleAiIntent(rawState,battleId,actorId,actionId){return chooseAiIntent(battleId===rawState.战斗.id?rawState:projectBattle(rawState,battleId).state,actorId,actionId);}
  function adjudicateTimedBattle(rawState,battleId) {
    const context=battleId===rawState.战斗.id?{state:clone(rawState),frontId:null}:projectBattle(rawState,battleId),state=context.state;
    const limit=state.战斗.扩展.规则?.roundLimit;
    if(!Number.isSafeInteger(limit)||limit<1||state.战斗.扩展.clock.lastCompletedRound<limit)throw Error('尚未到登记的赛事裁定时限');
    if(state.战斗.状态==='进行中'){
      const scores=Object.values(state.战斗.扩展.队伍).map(team=>({id:team.id,score:team.memberIds.reduce((sum,id)=>{const u=state.战斗单位.列表[id];return sum+(isActiveParticipant(state,id)?u.资源.生命.当前/Math.max(1,u.资源.生命.最大)+u.派生.有效等级/1000:0)},0)})).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
      concludeBattle(state,'裁定结束',scores[0]?.id??'');
    }
    return context.frontId===null?state:restoreBattleProjection(state,context.frontId);
  }
  function nextBackgroundBattleAt(state,through) {
    const due=Object.values(state.世界?.backgroundBattles??{}).filter(b=>b.状态==='进行中').map(b=>b.扩展?.clock?.nextAt).filter(at=>Number.isSafeInteger(at)&&at<=through);
    return due.length?Math.min(...due):null;
  }
  function advanceBackgroundBattlesAt(state,at) {
    const ids=Object.values(state.世界?.backgroundBattles??{}).filter(b=>b.状态==='进行中'&&b.扩展.clock.nextAt<=at).map(b=>b.id).sort();
    for(const id of ids){
      const context=projectBattle(state,id,true);let selected=context.state;
      people.settleAt(selected,at);
      const roundNumber=selected.战斗.回合;
      const rng=resumeRng(selected.战斗.扩展.随机);
      const boundary={id:`battle:${id}:round:${roundNumber}`,type:'background-round',battleId:id,round:roundNumber,statusEvents:[],statusLifecycle:[],fieldLifecycle:[],stateChanges:[]};
      if(!evaluateBattleEnd(selected))resumeRoundStart(selected,rng,boundary);
      selected.战斗.扩展.随机=rng.snapshot();
      let sequence=0;
      while(selected.战斗.状态==='进行中'&&selected.战斗.回合===roundNumber){
        if(++sequence>512)throw Error('单场单轮行动数超过512，不能跳过真实结算');
        const intent=chooseAiIntent(selected,selected.战斗.当前行动单位ID);
        selected=settleOwnedBackgroundAction(selected,{...intent,id:`battle:${id}:round:${roundNumber}:action:${sequence}`}).state;
        people.settleAt(selected,at);
        evaluateBattleEnd(selected);
      }
      const clock=selected.战斗.扩展.clock;
      delete clock.completedTerminalRound;
      clock.lastCompletedRound=roundNumber;clock.nextAt=selected.战斗.状态==='进行中'?at+1:null;
      selected.战斗.扩展.lastBackgroundBoundary=boundary;
      foundation.commitOwnedStateDraft(state,restoreBattleProjection(selected,context.frontId));
    }
  }
  function moveBattle(rawState,battleId,destination) {
    const state=clone(rawState);
    if(!['foreground','background'].includes(destination))throw Error('战斗位置无效');
    if(destination==='background'){
      if(state.战斗.id!==battleId)throw Error('前台场次不匹配');
      state.世界.backgroundBattles??={};
      if(state.世界.backgroundBattles[battleId])throw Error('战斗实例重复');
      state.战斗.扩展.clock.mode='background';state.世界.backgroundBattles[battleId]=state.战斗;
      state.战斗=foundation.makeDefaultState().战斗;
    }else{
      if(state.战斗.状态==='进行中')throw Error('前台已有进行中的战斗');
      const battle=state.世界.backgroundBattles[battleId];if(!battle)throw Error('后台场次不存在');
      if(state.战斗.id)state.世界.backgroundBattles[state.战斗.id]=state.战斗;
      delete state.世界.backgroundBattles[battleId];state.战斗=battle;battle.扩展.clock.mode='foreground';
      if(battle.扩展.clock.pendingRoundStart&&battle.状态==='进行中'&&battle.扩展.clock.nextAt>battleNow(state)){
        if(!advanceWorldClock)throw Error('尚未接入世界战斗时钟');
        advanceWorldClock(state,battle.扩展.clock.nextAt-battleNow(state));
      }
      const rng=resumeRng(state.战斗.扩展.随机),receipt={statusEvents:[],statusLifecycle:[],fieldLifecycle:[],stateChanges:[]};
      resumeRoundStart(state,rng,receipt);state.战斗.扩展.随机=rng.snapshot();
    }
    return state;
  }
  function humanParticipant(state,id){const unit=state.战斗单位.列表[id];return !unit?.扩展?.召唤&&(!!state.人物?.列表?.[id]||['魂师','普通人','魂师NPC','玩家魂师'].includes(unit?.单位种类));}
  function assertHumanTeamCapacity(state,ids){if([...new Set(ids)].filter(id=>humanParticipant(state,id)).length>4)throw Error('同一队伍每场最多四名人物，倒下或离场不释放本场名额');}
  function validateBattles(state) {
    const errors=[],ids=new Set(),occupied=new Map(),now=battleNow(state);
    for(const unit of Object.values(state.战斗单位.列表)){
      const summ=unit.扩展?.召唤;
      if(summ?.manifestationSoulId){try{globalThis.SoulManifestation.validateRecord(state,globalThis.SoulManifestation.forUnit(state,unit.id));}catch(e){errors.push(e.message);}continue;}
      if(!summ||!(summ.接受指令||summ.天生技能ID||summ.招式来源))continue;
      const contract=summ.招式来源,source=contract?.effectGraph?.nodes.find(n=>n.effectId==='summon.entity'&&n.id===summ.来源效果ID);
      const kit=source?.params.天生招式??[],ids=summ.天生技能ID??[];
      if(!source||!abilities.verify(contract).pass||contract.id!==summ.来源技能ID||!state.战斗单位.列表[summ.来源单位ID]||!!source.params.接受指令!==!!summ.接受指令||kit.length!==ids.length){
        errors.push('召唤物指令或招式与召唤来源不符：'+unit.id);continue;
      }
      for(const [i,art] of kit.entries()){
        const id=unit.id+'-innate-'+(i+1),k=state.技能.列表[id];
        if(ids[i]!==id||!unit.能力.技能ID.includes(id)||k?.持有者单位ID!==unit.id||k.sourceKind!=='summon-innate'||k.name!==art.名称||k.soulPowerCost!==art.魂力||k.cooldownTurns!==art.冷却||!abilities.verify(k).pass||abilities.hash(k.effectGraph)!==abilities.hash(effects.makeLinearGraph(art.节点)))errors.push('召唤物天生招式与来源不符：'+id);
      }
    }
    const backgrounds=state.世界?.backgroundBattles;
    if(backgrounds!==undefined&&(!backgrounds||Array.isArray(backgrounds)||typeof backgrounds!=='object'))return ['后台战斗容器无效'];
    for(const [key,b] of Object.entries(backgrounds??{}))if(!b||b.id!==key)errors.push('后台战斗ID与索引不一致');
    for(const battle of battleInstances(state)){
      errors.push(...mechanics.validate({...state,战斗:battle},actionEvidence.get(state)?.receipt));
      for(const zone of Object.values(battle.扩展?.区域效果??{}))if(!frozenDamageSourceValid(zone,'zone.'+zone.类型))errors.push(`区域伤害${zone.id}来源无效`);
      for(const domain of Object.values(battle.扩展?.领域实例??{})){
        const node=domain.能力合同?.effectGraph?.nodes?.find(n=>n.effectId==='domain.field'&&n.id===domain.来源.效果ID);
        if(node?.params.触发次数!==undefined||domain.剩余触发!==undefined){
          const ledger=Object.entries(domain.触发账本??{}),max=node?.params.触发次数;
          if(!Number.isSafeInteger(max)||!Number.isSafeInteger(domain.剩余触发)||domain.剩余触发<1||domain.剩余触发+ledger.length!==max||ledger.some(([key,v])=>key!==v.round+':触发:'+v.targetId||!battle.参与者ID列表.includes(v.targetId)))errors.push('领域触发次数与触发记录不符：'+domain.id);
        }
        const selected=domain.扩展?.选择目标ID列表;if(selected===undefined)continue;
        const source=state.战斗单位.列表[domain.来源?.单位ID],contract=domain.能力合同;
        if(!Array.isArray(selected)||!selected.length||new Set(selected).size!==selected.length||!abilities.verify(contract).pass||!contract.effectGraph.nodes.some(n=>n.effectId==='target.allies')||selected.some(id=>!battle.参与者ID列表.includes(id)||!source||!sameSide({...state,战斗:battle},source,state.战斗单位.列表[id])))errors.push(`领域所选同伴与来源合同不符：${domain.id}`);
      }
      if(!custody.BATTLE_KINDS.includes(battle.扩展?.battleKind))errors.push(`战斗类型缺失或无效：${battle.id}`);
      if(battle.扩展?.battlePolicyHash!==battlePolicyFingerprint(battle))errors.push(`战斗类型与致死规则已变更：${battle.id}`);
      for(const team of Object.values(battle.扩展?.队伍??{}))try{assertHumanTeamCapacity(state,team.memberIds??[]);}catch(error){errors.push(`${battle.id}：${error.message}`);}
      if(ids.has(battle.id))errors.push(`重复战斗ID：${battle.id}`);ids.add(battle.id);
      const clock=battle.扩展?.clock,rng=battle.扩展?.随机;
      if(!rng||!Number.isInteger(rng.seed)||rng.seed<0||rng.seed>0xffffffff||!Number.isInteger(rng.state)||rng.state<0||rng.state>0xffffffff||!Number.isSafeInteger(rng.draws)||rng.draws<0)errors.push(`战斗随机状态无效：${battle.id}`);
      if(battle.状态==='进行中'&&clock?.mode!==(battle===state.战斗?'foreground':'background'))errors.push(`战斗时钟位置不一致：${battle.id}`);
      if(!clock||!['foreground','background'].includes(clock.mode)||!Number.isSafeInteger(clock.createdAt)||clock.createdAt>now||!Number.isSafeInteger(clock.lastCompletedRound)||clock.lastCompletedRound<0||clock.lastCompletedRound>battle.回合||typeof clock.pendingRoundStart!=='boolean'||(battle.状态==='进行中'?(!Number.isSafeInteger(clock.nextAt)||clock.nextAt<now):clock.nextAt!==null))errors.push(`战斗时钟无效：${battle.id}`);
      if(!Array.isArray(battle.参与者ID列表)||new Set(battle.参与者ID列表).size!==battle.参与者ID列表.length){errors.push(`战斗成员列表无效：${battle.id}`);continue;}
      const payments=battle.扩展?.externalWorldPayments;
      if(payments!==undefined&&(!payments||Array.isArray(payments)||typeof payments!=='object'||Object.entries(payments).some(([id,totals])=>!battle.参与者ID列表.includes(id)||!totals||Object.keys(totals).sort().join(',')!=='health,soulPower'||Object.values(totals).some(n=>!Number.isSafeInteger(n)||n<0))))errors.push(`战斗世界费用记录无效：${battle.id}`);
      if(battle.状态==='进行中'&&(!battle.参与者ID列表.includes(battle.当前行动单位ID)||!Array.isArray(battle.扩展?.先攻顺序)||!battle.扩展.随机))errors.push(`战斗游标无效：${battle.id}`);
      for(const id of battle.参与者ID列表){
        const member=battle.扩展?.成员?.[id];
        if(!state.战斗单位.列表[id]||!member||member.unitId!==id||!['active','escaped','surrendered','defeated','removed'].includes(member.status)||!['player','ai'].includes(member.controller)||!member.sideId)errors.push(`战斗成员合同无效：${battle.id}/${id}`);
        if(battle.状态==='进行中'&&member?.status==='active'){
          if(occupied.has(id))errors.push(`人物同时参加多场战斗：${id}`);occupied.set(id,battle.id);
        }
      }
    }
    return errors;
  }

  function battlePolicyFingerprint(battle){return abilities.hash({id:battle.id,battleKind:battle.扩展?.battleKind,nonlethal:!!battle.扩展?.规则?.nonlethal,fatalOnDefeat:!!battle.扩展?.规则?.fatalOnDefeat});}
  function evaluateCombatScene(rawState, proposal = {}) {return evaluateCombatScenePrepared(foundation.normalizeState(clone(rawState)),proposal);}
  function evaluateCombatScenePrepared(state, proposal = {}) {
    const participantIds = cleanList(proposal.participantIds);
    const configs = proposal.participantConfigs ?? {};
    const sides = [...new Set(participantIds.map(id => String(configs[id]?.sideId ?? state.战斗单位.列表[id]?.阵营 ?? '')).filter(Boolean))];
    const signals = cleanList(proposal.signals);
    const weights = {
      主动攻击: 4, 敌对魂技: 4, 伏击: 4, 遭到伏击: 4,
      不可避免追逐: 3, 宣战: 3, 明确敌意: 2, 阻断退路: 2,
      敌对遭遇: 2, 危险接触: 1
    };
    const score = signals.reduce((sum, signal) => sum + Number(weights[signal] ?? 0), 0);
    const hasOpposingSides = participantIds.length >= 2 && sides.length >= 2;
    const decision = !hasOpposingSides || score <= 0 ? '普通场景' : score >= 3 ? '进入战斗' : '对峙';
    return {
      type: 'combat-scene-evaluation',
      decision,
      canStart: decision === '进入战斗',
      score,
      signals,
      participantIds,
      sideIds: sides,
      surprisedIds: cleanList(proposal.surprisedIds).filter(id => participantIds.includes(id)),
      reason: !hasOpposingSides ? '缺少相互敌对的两个战斗队伍' : score <= 0 ? '没有登记的战斗触发信号' : score >= 3 ? '敌意强度达到战斗阈值' : '敌意存在但仍可对峙或避战'
    };
  }

  function startBattle(rawState, options = {}) {
    const state = foundation.normalizeState(clone(rawState));
    if (state.战斗.状态 === '进行中') throw new Error('已有进行中的战斗');
    const battleKind=options.battleKind??'encounter';
    if(!custody.BATTLE_KINDS.includes(battleKind))throw Error('未知战斗类型');
    if(['sparring','competition'].includes(battleKind)&&options.rules?.fatalOnDefeat)throw Error('切磋与普通比赛不能使用致死规则');
    const participantIds = cleanList(options.participantIds);
    assertUnoccupied(state,participantIds);
    if (participantIds.length < 2) throw new Error('战斗至少需要两个参与者');
    const configs = clone(options.participantConfigs ?? {});
    if(options.includeWorldSummons!==false)for(const entry of globalThis.SoulCreationCore.summonParticipants(state,participantIds)){participantIds.push(entry.unitId);configs[entry.unitId]={...(configs[entry.actorId]??{}),sideId:configs[entry.actorId]?.sideId??state.战斗单位.列表[entry.actorId].阵营,extension:{summonedBy:entry.actorId}};}
    if(options.includeWorldSummons!==false)for(const entry of globalThis.SoulCombatDeployments.participants(state,participantIds)){if(!participantIds.includes(entry.unitId))participantIds.push(entry.unitId);configs[entry.unitId]={...(configs[entry.actorId]??{}),sideId:configs[entry.actorId]?.sideId??state.战斗单位.列表[entry.actorId].阵营,canFlee:false,extension:{deploymentId:entry.deploymentId,mode:entry.mode,summonedBy:entry.actorId}};}
    assertUnoccupied(state,participantIds);
    const sceneEvaluation = options.sceneEvaluation ?? evaluateCombatScenePrepared(state, {
      participantIds,
      participantConfigs: configs,
      signals: options.signals ?? ['主动攻击'],
      surprisedIds: options.surprisedIds
    });
    if (!sceneEvaluation.canStart && !options.force) throw new Error(`当前场景不能进入战斗：${sceneEvaluation.reason}`);
    const rng = makeRng(options.seed ?? 1);
    const mainId = state.角色?.主控单位ID ?? '';
    const mainSideId = String(configs[mainId]?.sideId ?? state.战斗单位.列表[mainId]?.阵营 ?? 'player');
    const sideGroups = {};
    for (const unitId of participantIds) {
      const unit = state.战斗单位.列表[unitId];
      const sideId = String(configs[unitId]?.sideId ?? unit?.阵营 ?? 'neutral');
      (sideGroups[sideId] ??= []).push(unitId);
    }
    for(const members of Object.values(sideGroups))assertHumanTeamCapacity(state,members);
    const sideIds = Object.keys(sideGroups);
    for (const [sideIndex, sideId] of sideIds.entries()) {
      const members = sideGroups[sideId];
      const leftSide = sideId === (participantIds.includes(mainId)?mainSideId:sideIds[0]);
      const x = leftSide ? 20 + Math.min(8, sideIndex * 3) : 80 - Math.min(8, Math.max(0, sideIndex - 1) * 3);
      for (const [memberIndex, unitId] of members.entries()) {
        const spread = members.length === 1 ? 0 : (memberIndex - (members.length - 1) / 2) * Math.min(24, 56 / Math.max(1, members.length - 1));
        const explicit = options.positions?.[unitId]?.战场坐标 ?? options.positions?.[unitId]?.battlefield;
        state.战斗单位.列表[unitId].位置.战场坐标 = battlePoint(explicit, {x, y: 50 + spread});
      }
    }
    const id = options.id || `battle-${state.系统.revision + 1}`;
    if(battleInstances(state).some(b=>b.id===id))throw Error('战斗ID已经使用');
    custody.expireDefeats(state,participantIds,`battle:${id}`);
    const receipt = {id:`receipt-${id}-start`,type:'battle-start',battleId:id,statusEvents:[],statusLifecycle:[],fieldLifecycle:[],stateChanges:[]};
    const beforeBattle = combatEvidenceSnapshot(state,participantIds);
    actionEvidence.set(state,{receipt,phase:'battle-start',order:0});
    try {
    const preparedItems=[];
    for(const unitId of participantIds){
      const unit=state.战斗单位.列表[unitId];
      if(!unit||unit.存活状态!=='存活')throw new Error(`参战单位不存在或不能战斗：${unitId}`);

    }
    const initiative = participantIds.map(id => {
      const unit = state.战斗单位.列表[id];
      if (!unit || unit.存活状态 !== '存活') throw new Error(`参战单位不存在或不能战斗：${id}`);
      foundation.clearTemporaryHealth(unit);
      const explicitPosition = options.positions?.[id];
      if (ZONES.includes(explicitPosition?.距离区)) unit.位置.距离区 = explicitPosition.距离区;
      else unit.位置.距离区 = '近距';
      if (cleanList([explicitPosition?.站位簇]).length) unit.位置.站位簇 = String(explicitPosition?.站位簇 ?? '').trim();
      else unit.位置.站位簇 = unit.阵营;
      unit.位置.接战单位ID = [];
      const roll=rollD20(rng,Boolean(unit.扩展?.武魂战斗修正?.先攻优势),false);
      const equipmentBonus = Number(unit.扩展?.装备战斗修正?.先攻 ?? 0);
      const modifier = foundation.battleAttributeView(state,unit).derived.先攻 + equipmentBonus;
      return {unitId: id, die:roll.die, rolls:roll.rolls, mode:roll.mode, modifier, total: roll.die + modifier};
    }).sort((a, b) => b.total - a.total || b.modifier - a.modifier || a.unitId.localeCompare(b.unitId));
    const members = {};
    const teams = {};
    for (const unitId of participantIds) {
      const unit = state.战斗单位.列表[unitId];
      const config = configs[unitId] ?? {};
      const sideId = String(config.sideId ?? unit.阵营);
      members[unitId] = {
        unitId,
        sideId,
        controller: unitId === state.角色.主控单位ID ? 'player' : 'ai',
        status: 'active',
        canFlee: config.canFlee !== false,
        morale: round(clamp(config.morale ?? 50, 0, 100)),
        surprisedRound: sceneEvaluation.surprisedIds.includes(unitId) ? 1 : 0,
        joinedRound: 1,
        extension: clone(config.extension ?? {})
      };
      teams[sideId] ??= {id: sideId, name: String(config.sideName ?? sideId), memberIds: []};
      teams[sideId].memberIds.push(unitId);
    }
    if (Object.keys(teams).length < 2) throw new Error('战斗至少需要两个敌对队伍');
    state.战斗 = {
      id, 状态: '进行中', 回合: 1, 阶段: '行动', 当前行动单位ID: initiative[0].unitId,
      参与者ID列表: participantIds, 距离区顺序: clone(ZONES), 动作队列: [], 临时结算: {}, 最近结算单: {},
      扩展: {
        场景判定: clone(sceneEvaluation), 成员: members, 队伍: teams,
        先攻: initiative, 先攻顺序: initiative.map(item => item.unitId), 随机: rng.snapshot(),
        已结算行动: {}, 结算单列表: [], 击杀记录: [], 结果: {},
        区域效果: {}, 领域实例: {}, 召唤记录: {}, 撤退协助: {}, 武魂触发: {}, 武魂真身使用: {}, 技能使用次数: {}, 技能组使用次数: {},
        战斗目标: String(options.objective ?? '击败敌对队伍'),
        撤退路线: clone(options.escapeRoutes ?? {default: {difficultyModifier: 0, tags: []}}),
        battleKind,规则: {...clone(options.rules ?? {}),...(['sparring','competition'].includes(battleKind)?{nonlethal:true}:{})},
        地点ID:String(options.locationId??state.人物?.列表?.[participantIds[0]]?.locationId??state.地图?.当前地点ID??''),
        clock:{mode:options.background?'background':'foreground',createdAt:battleNow(state),nextAt:battleNow(state)+1,lastCompletedRound:0,pendingRoundStart:!!options.background},
        维持占用:{}
      }
    };
    globalThis.SoulCreationCore.bindBattle(state);globalThis.SoulCombatDeployments.bindBattle(state);
    state.战斗.扩展.battlePolicyHash=battlePolicyFingerprint(state.战斗);
    for(const unitId of participantIds)preparedItems.push(...activatePreparedPills(state,state.战斗单位.列表[unitId],id));
    // Preparations activate in this battle before initiative is finalized; preserve the original dice.
    for(const row of initiative){const unit=state.战斗单位.列表[row.unitId];row.modifier=foundation.battleAttributeView(state,unit).derived.先攻+Number(unit.扩展?.装备战斗修正?.先攻??0);row.total=row.die+row.modifier;}
    initiative.sort((a,b)=>b.total-a.total||b.modifier-a.modifier||a.unitId.localeCompare(b.unitId));
    state.战斗.扩展.先攻顺序=initiative.map(row=>row.unitId);state.战斗.当前行动单位ID=initiative[0].unitId;
    const passiveEvents = [];
    for (const unitId of participantIds) {
      const unit = state.战斗单位.列表[unitId];
      const shield = Math.max(0, round(unit.扩展?.装备战斗修正?.开战护盾 ?? 0));
      if (!shield) continue;
      const granted = foundation.grantTemporaryHealth(unit, shield);
      passiveEvents.push({unitId, effect: '开战护盾', offeredAmount:granted.offered, amount:granted.gained, temporaryHpBefore:granted.before, temporaryHp:granted.after});
    }
    Object.assign(receipt,{battleKind,battleRules:{nonlethal:!!state.战斗.扩展.规则.nonlethal,fatalOnDefeat:!!state.战斗.扩展.规则.fatalOnDefeat},sceneEvaluation,teams:clone(teams),initiative,passiveEvents,preparedItems,currentActorId:initiative[0].unitId});
    if(!options.background)beginTurnAtOrAfter(state,rng,receipt,0,false);
    state.战斗.扩展.随机 = rng.snapshot();
    receipt.currentActorId = state.战斗.当前行动单位ID;
    recordCombatChanges(state,beforeBattle,receipt,'battle-start');
    state.战斗.扩展.开战结算单 = clone(receipt);
    globalThis.SoulCooperationPreparation?.reconcile(state);
    state.系统.revision += 1;
    state.历史.push({type: 'battle-start', battleId: id, initiative: clone(initiative)});
    return {state, receipt};
    } finally { actionEvidence.delete(state); }
  }

  function joinBattle(rawState, options = {}) {
    return joinBattlePrepared(foundation.normalizeState(clone(rawState)),options);
  }
  function joinBattlePrepared(state,options={},actionRng=null){
    if (!ACTIVE_BATTLE_STATES.includes(state.战斗.状态)) throw new Error('只能加入进行中的战斗');
    ensureBattleCollections(state);
    const unitId = String(options.unitId ?? '');
    assertUnoccupied(state,[unitId],state.战斗.id);
    const unit = state.战斗单位.列表[unitId];
    if (!unit || unit.存活状态 !== '存活') throw new Error(`加入单位不存在或不能战斗：${unitId}`);
    if (state.战斗.参与者ID列表.includes(unitId) && battleMember(state, unitId)?.status !== 'removed') throw new Error('单位已经在战斗中');
    custody.expireDefeats(state,[unitId],`battle:${state.战斗.id}`);
    foundation.clearTemporaryHealth(unit);
    const rng = actionRng??resumeRng(state.战斗.扩展.随机);
    const roll=rollD20(rng,Boolean(unit.扩展?.武魂战斗修正?.先攻优势),false);
    const initiative = {unitId, die:roll.die, rolls:roll.rolls, mode:roll.mode, modifier: foundation.battleAttributeView(state,unit).derived.先攻, total: roll.die + foundation.battleAttributeView(state,unit).derived.先攻, joinedRound: state.战斗.回合};
    const sideId = String(options.sideId ?? unit.阵营);
    assertHumanTeamCapacity(state,[...(state.战斗.扩展.队伍[sideId]?.memberIds??[]),unitId]);
    state.战斗.参与者ID列表 = cleanList([...state.战斗.参与者ID列表, unitId]);
    state.战斗.扩展.成员[unitId] = {
      unitId,
      sideId,
      controller: unitId === state.角色.主控单位ID ? 'player' : 'ai',
      status: 'active',
      canFlee: options.canFlee !== false,
      morale: round(clamp(options.morale ?? 50, 0, 100)),
      surprisedRound: options.surprised ? state.战斗.回合 : 0,
      joinedRound: state.战斗.回合,
      extension: clone(options.extension ?? {})
    };
    state.战斗.扩展.队伍[sideId] ??= {id: sideId, name: String(options.sideName ?? sideId), memberIds: []};
    state.战斗.扩展.队伍[sideId].memberIds = cleanList([...state.战斗.扩展.队伍[sideId].memberIds, unitId]);
    state.战斗.扩展.先攻=state.战斗.扩展.先攻.filter(entry=>entry.unitId!==unitId);
    state.战斗.扩展.先攻.push(initiative);
    state.战斗.扩展.先攻.sort((left, right) => right.total - left.total || right.modifier - left.modifier || left.unitId.localeCompare(right.unitId));
    state.战斗.扩展.先攻顺序 = state.战斗.扩展.先攻.map(item => item.unitId);
    state.战斗.扩展.随机 = rng.snapshot();
    if(!actionRng)state.系统.revision += 1;
    state.历史.push({type: 'battle-join', battleId: state.战斗.id, unitId, sideId, round: state.战斗.回合});
    state.历史 = state.历史.slice(-50);
    const receipt={id:`join:${state.战斗.id}:${unitId}:${(state.战斗.扩展.加入结算单列表??[]).length}`,type:'battle-join',battleId:state.战斗.id,unitId,sideId,at:battleNow(state),initiative};
    (state.战斗.扩展.加入结算单列表??=[]).push(clone(receipt));
    globalThis.SoulCooperationPreparation?.reconcile(state);
    return {state,receipt};
  }

  function leaveBattle(rawState, options = {}) {
    const state = foundation.normalizeState(clone(rawState));
    if (!ACTIVE_BATTLE_STATES.includes(state.战斗.状态)) throw new Error('当前没有进行中的战斗');
    const unitId = String(options.unitId ?? ''),member=battleMember(state,unitId);
    if (!member || member.status !== 'active') throw new Error('单位不在活动战斗队列中');
    const wasCurrent=state.战斗.当前行动单位ID===unitId,pending=state.战斗.扩展.clock.pendingRoundStart,rng=resumeRng(state.战斗.扩展.随机);
    const receipt={type:'battle-leave',battleId:state.战斗.id,unitId,status:options.status==='escaped'?'escaped':'removed',round:state.战斗.回合,targets:[],statusEvents:[],traitEvents:[],narrationFacts:[],errors:[],stateChanges:[],statusLifecycle:[],fieldLifecycle:[]};
    const before=combatEvidenceSnapshot(state);actionEvidence.set(state,{receipt,phase:'turn-boundary',order:0});
    try{
      member.status=receipt.status;releaseParticipant(state,unitId);
      if(member.status==='escaped'){const unit=state.战斗单位.列表[unitId];unit.位置.距离区='极远';unit.位置.站位簇='已撤离';unit.位置.接战单位ID=[];}
      if(wasCurrent&&!pending){advanceTurn(state,rng,receipt);settleForegroundBoundary(state,rng,receipt);}else evaluateBattleEnd(state);
      for(const id of state.战斗.参与者ID列表)if(!occupiedBattle(state,id,state.战斗.id))foundation.refreshBattleAttributeResources(state,state.战斗单位.列表[id]);
      pruneMaintenance(state,receipt);globalThis.SoulCooperationCore?.reconcile(state);globalThis.SoulCooperationPreparation?.reconcile(state);recordCombatChanges(state,before,receipt,'turn-boundary');
      state.战斗.扩展.随机=rng.snapshot();receipt.result=clone(state.战斗.扩展.结果);
      state.系统.revision+=1;state.历史.push({type:'battle-leave',battleId:state.战斗.id,unitId,status:member.status,round:receipt.round});state.历史=state.历史.slice(-50);
      return {state,receipt};
    }finally{actionEvidence.delete(state);}
  }

  function escapeDifficulty(state, actor) {
    const enemies = activeParticipants(state).filter(unit => !sameSide(state, unit, actor));
    const pursuer = [...enemies].sort((left, right) => foundation.battleAttributeView(state,right).derived.先攻 - foundation.battleAttributeView(state,left).derived.先攻 || left.id.localeCompare(right.id))[0] ?? null;
    const nearestDistance = enemies.length ? Math.min(...enemies.map(enemy => Math.max(0,(pointDistance(unitPoint(actor),unitPoint(enemy))-10)/BATTLEFIELD.zoneLength))) : 4;
    const zoneModifier = nearestDistance <= 0 ? 3 : nearestDistance <= 1 ? 1 : nearestDistance >= 4 ? -2 : nearestDistance >= 3 ? -1 : 0;
    const engaged = cleanList(actor.位置.接战单位ID).some(id => isActiveParticipant(state, id) && !sameSide(state, id, actor));
    const route = state.战斗.扩展.撤退路线?.default ?? {};
    const dc = Math.max(5, 10 + Math.max(0, Math.min(6, Number(pursuer?.派生?.先攻 ?? 0))) + zoneModifier + (engaged ? 2 : 0) + Number(route.difficultyModifier ?? 0));
    const preparation = Math.min(2,Number(battleMember(state,actor.id)?.extension?.escapePreparation ?? 0));
    return {dc, pursuerId: pursuer?.id ?? '', nearestDistance, preparation, engaged, zoneModifier, engagedPenalty: engaged ? 2 : 0, routeModifier: Number(route.difficultyModifier ?? 0)};
  }

  // Withdrawing uses an ordinary action and the same movement/path restrictions as walking.
  // Preparation belongs to this battle's member record; damage never silently resets it.
  function withdrawStep(state,actor,receipt){
    const enemies=activeParticipants(state).filter(unit=>!sameSide(state,unit,actor)),from=unitPoint(actor),radius=movementAllowance(state,actor).coordinateRadius;
    const distance=p=>enemies.length?Math.min(...enemies.map(e=>pointDistance(p,unitPoint(e)))):0;
    const candidates=[];
    for(let i=0;i<32;i++){const angle=i*Math.PI/16;candidates.push(battlePoint({x:from.x+Math.cos(angle)*radius,y:from.y+Math.sin(angle)*radius}));}
    candidates.sort((a,b)=>distance(b)-distance(a));
    for(const point of candidates){if(distance(point)<=distance(from)+.000001)continue;try{moveUnit(state,actor,{距离区:actor.位置.距离区,战场坐标:point},receipt);break;}catch{}}
    actor.位置.接战单位ID=cleanList(actor.位置.接战单位ID).filter(id=>!isActiveParticipant(state,id)||combatDistance(actor,state.战斗单位.列表[id])<=1);
    for(const enemy of enemies)if(combatDistance(actor,enemy)>1)enemy.位置.接战单位ID=cleanList(enemy.位置.接战单位ID).filter(id=>id!==actor.id);
  }

  function resolveRetreatAssist(state, actor, receipt) {
    const sideId = sideIdOf(state, actor);
    state.战斗.扩展.撤退协助[sideId] = {bonus: 2, sourceUnitId: actor.id, expiresRound: state.战斗.回合 + 1};
    receipt.retreatAssist = clone(state.战斗.扩展.撤退协助[sideId]);
    receipt.narrationFacts.push(`${actor.名称}为同队打开撤退路线，下一次逃跑检定获得+2`);
  }

  function resolveEscape(state, actor, rng, receipt) {
    const member = battleMember(state, actor.id);
    if (!canFlee(state,actor.id)) throw new Error('该单位不能主动撤离战斗');
    if (movementImpairment(state,actor.id)) {
      throw new Error('单位正被束缚或麻痹，必须先挣脱才能逃跑');
    }
    const difficulty = escapeDifficulty(state, actor);
    if(difficulty.preparation<2||difficulty.nearestDistance<2||difficulty.engaged){
      member.extension??={};member.extension.escapePreparation=Math.min(2,difficulty.preparation+1);
      withdrawStep(state,actor,receipt);
      receipt.escape={...escapeDifficulty(state,actor),success:false,preparing:true};
      receipt.narrationFacts.push(`${actor.名称}正在撤离（准备${member.extension.escapePreparation}/2），须拉开至少2区且脱离接战，最早第三次撤离行动才能离场`);
      return;
    }
    const assist = state.战斗.扩展.撤退协助[member.sideId];
    const assistBonus = assist && assist.expiresRound >= state.战斗.回合 && assist.sourceUnitId !== actor.id ? Number(assist.bonus ?? 0) : 0;
    if (assistBonus) delete state.战斗.扩展.撤退协助[member.sideId];
    const die = rng.die(20);
    const traitBonus=Number(actor.扩展?.武魂战斗修正?.撤退加值??0);
    const modifier = attributeModifier(state, actor, '身法') + actor.派生.熟练加值 + assistBonus + traitBonus;
    const total = die + modifier;
    const success = die === 20 || (die !== 1 && total >= difficulty.dc);
    receipt.escape = {die, modifier, total, success, assistBonus, traitBonus, ...difficulty};
    if (success) {
      releaseParticipant(state,actor.id);
      member.status = 'escaped';
      actor.位置.距离区 = '极远';
      actor.位置.站位簇 = '已撤离';
      actor.位置.接战单位ID = [];
      receipt.narrationFacts.push(`${actor.名称}成功脱离战斗`);
    } else receipt.narrationFacts.push(`${actor.名称}撤离失败，仍留在战斗中`);
  }

  function surrenderAvailability(state, actorId) {
    const policy = state?.战斗?.扩展?.规则?.surrender ?? {};
    const lethal=state.战斗?.扩展?.battleKind==='lethal'&&!state.战斗?.扩展?.规则?.fatalOnDefeat;
    const minimumRound = Math.max(1, round(policy.minimumRound ?? (lethal?1:16)));
    const visible = state?.战斗?.状态 === '进行中' && (policy.enabled === true||lethal&&policy.enabled!==false);
    if (!visible) return {visible:false,available:false,minimumRound,currentRound:Number(state?.战斗?.回合 ?? 0),reason:'当前战斗不允许认输'};
    const actor = state.战斗单位?.列表?.[actorId];
    const member = battleMember(state, actorId);
    if (!lethal&&(actorId !== state.角色?.主控单位ID || member?.controller !== 'player')) return {visible:true,available:false,minimumRound,currentRound:state.战斗.回合,reason:'只有主角可以主动认输'};
    if (state.战斗.当前行动单位ID !== actorId) return {visible:true,available:false,minimumRound,currentRound:state.战斗.回合,reason:'请等到你的行动回合'};
    if (!actor || !isActiveParticipant(state, actorId)) return {visible:true,available:false,minimumRound,currentRound:state.战斗.回合,reason:'当前无法认输'};
    if (state.战斗.回合 < minimumRound) return {visible:true,available:false,minimumRound,currentRound:state.战斗.回合,reason:`第${minimumRound}回合开放`};
    return {visible:true,available:true,minimumRound,currentRound:state.战斗.回合,reason:'认输会立即结束本场战斗'};
  }

  function resolveSurrender(state, actor, receipt) {
    const availability = surrenderAvailability(state, actor.id);
    if (!availability.available) throw new Error(availability.reason);
    const member = battleMember(state, actor.id);
    member.status = 'surrendered';
    const winnerSideId = activeParticipants(state).map(unit => sideIdOf(state,unit)).find(sideId => sideId && sideId !== member.sideId) ?? '';
    receipt.surrender = {unitId:actor.id,sideId:member.sideId,winnerSideId,minimumRound:availability.minimumRound};
    receipt.narrationFacts.push(`${actor.名称}主动认输并退出战斗`);
    const remainingSides=[...new Set(activeParticipants(state).map(unit=>sideIdOf(state,unit)))];
    if(remainingSides.length<=1&&actor.id===state.角色?.主控单位ID)concludeBattle(state,'认输',remainingSides[0]??'');
    else evaluateBattleEnd(state);
  }

  function actionImpairment(state, actorId) {
    const surprised = battleMember(state,actorId)?.surprisedRound === state.战斗.回合;
    const paralysis = activeStatuses(state,actorId,'status.paralysis').some(status => status.扩展?.已触发);
    const stunned = activeStatuses(state,actorId,'status.stun').length > 0;
    const sleeping = activeStatuses(state,actorId,'status.sleep').length > 0;
    return {surprised,reason:surprised ? '突袭措手不及' : paralysis ? '麻痹' : stunned ? '震慑' : sleeping ? '睡眠' : ''};
  }

  function lostTripPermission(state,actorId){
    const active=expeditions.forBattle(state,state.战斗?.id),companion=active?.companions.find(c=>c.unitId===actorId&&c.cooperationId&&c.active);
    if(!companion)return null;const permission=globalThis.SoulCooperationCore.tripPermission(state,active,companion,'combat');
    return permission.available?null:{...permission,expeditionId:active.id};
  }
  function canFlee(state,actorId){return !!battleMember(state,actorId)?.canFlee||!!lostTripPermission(state,actorId);}
  function participationRecovery(state,actorId){
    if(actorId===state.角色?.主控单位ID||influence.pendingOrder(state,actorId))return null;
    const permission=lostTripPermission(state,actorId);if(!permission)return null;
    const impairment=actionImpairment(state,actorId),bound=controls.breakable(state,actorId)[0];
    const intent=impairment.reason?{type:'放弃行动'}:bound?{type:'挣脱',statusId:bound.id}:movementImpairment(state,actorId)?{type:'防御'}:{type:'逃跑'};
    return {permission,intent,reason:'原远征合作失效，本人只按自主求生行动，不能继续执行旧队伍指令'};
  }
  function recoveryMatches(recovery,intent){return intent.type===recovery.intent.type&&(!intent.statusId||intent.statusId===recovery.intent.statusId)&&!intent.movement&&!intent.skillId&&!intent.targetIds?.length&&!intent.controlTargetId;}

  function listTacticalActions(state, actorId) {
    if (state.战斗?.状态 !== '进行中' || state.战斗.当前行动单位ID !== actorId || !isActiveParticipant(state,actorId)) return [];
    const bound = controls.breakable(state,actorId).length > 0;
    const impairment = actionImpairment(state,actorId);
    const surrender = surrenderAvailability(state,actorId);
    const movementReason = movementImpairment(state,actorId);
    const escape = escapeDifficulty(state,state.战斗单位.列表[actorId]);
    const definitions = [
      ['defend','防御','防御','本回合提高物理防御',true,''],
      ['move','移动','放弃行动','调整站位，结束本回合',!movementReason,movementReason],
      ['escape','撤离战斗','逃跑',`撤离准备 ${escape.preparation}/2 · 最近敌人约 ${Number.isFinite(escape.nearestDistance)?escape.nearestDistance.toFixed(1):'—'}区；先用两次行动拉开距离，第三次起可检定（难度${escape.dc}）`,canFlee(state,actorId) && !movementReason,!canFlee(state,actorId) ? '本场战斗无法主动撤离' : movementReason],
      ['assist','协助撤退','协助撤退','帮助队友下一次撤退',true,''],
      ...(activeMartialAvatar(state,actorId) ? [['end-avatar','结束武魂真身','结束武魂真身','主动收束武魂真身',true,'']] : []),
      ['pass',impairment.reason ? '等待恢复' : '结束回合','放弃行动',impairment.reason ? `因${impairment.reason}无法采取主行动，继续本回合` : '不采取其他主行动',true,''],
      ...(surrender.visible ? [['surrender','认输','认输','结束本场比赛',surrender.available,surrender.reason]] : [])
    ];
    const tactics=definitions.map(([id,name,actionType,description,available,reason]) => {
      const impaired = impairment.reason && id !== 'pass' && actionType !== '认输' && (impairment.surprised || actionType !== '挣脱');
      return {id:`tactic:${id}`,name,actionType,sourceKind:'tactic',description,available:Boolean(available && !impaired),reason:impaired ? `当前因${impairment.reason}无法采取主行动` : reason};
    });
    const supportView=support.describe(state,actorId);
    if(supportView.skills.length)tactics.unshift({id:'tactic:support',name:'持续加持',actionType:'配置加持',sourceKind:'tactic',description:'选择同伴与加持层；一次确认同时开启，关闭无需主行动',available:!impairment.reason,reason:impairment.reason||'',support:supportView});
    if(globalThis.SoulAbilityExchange.desireFacts(state,actorId).strength)tactics.push({id:'tactic:restrain-desire',name:'克制欲火',actionType:'克制',sourceKind:'tactic',description:'消耗主行动进行一次意志自控，基础负担继续保留',available:!impairment.reason,reason:impairment.reason||''});
    if(foundation.activeMartialSoulId(state,actorId))tactics.push({id:'tactic:retract-soul',name:'收回武魂',actionType:'收回武魂',sourceKind:'tactic',description:'消耗主行动收回武魂，外来拘束和固定期限义务保留',available:!impairment.reason&&!activeMartialAvatar(state,actorId),reason:impairment.reason||''});
    for(const realm of globalThis.SoulResidentRealms.table(state).records.filter(r=>r.ownerId===actorId))for(const slot of realm.slots){let reason=impairment.reason||'';if(!reason)try{globalThis.SoulCombatDeployments.quote(state,{actorId,targetId:slot.personId,mode:'projection'},{battleId:state.战斗.id});}catch(error){reason=error.message;}tactics.push({id:`tactic:resident-projection:${slot.personId}`,name:`召唤·${globalThis.SoulCombatDeployments.projectionName(state,slot.personId)}`,actionType:'召唤投影',sourceKind:'tactic',residentId:slot.personId,description:'消耗本回合主行动与实际魂力，投影受控参战，不占人物队伍名额',available:!reason,reason});}
    tactics.push(...disguiseTactics(state,actorId,impairment.reason||''));
    for(const [index,status] of controls.breakable(state,actorId).entries())tactics.push({id:index?`tactic:break-free:${status.id}`:'tactic:break-free',name:`挣脱·${status.快照?.参数?.部位??'束缚'}`,actionType:'挣脱',sourceKind:'tactic',statusId:status.id,description:`仅尝试解除${state.战斗单位.列表[status.来源?.单位ID]?.名称??'该来源'}的这一项拘束`,available:!impairment.surprised,reason:impairment.surprised?'突袭中不能挣脱':''});
    for(const entry of Object.values(state.扩展?.abilityMaintenance??{}).filter(e=>e.actorId===actorId&&e.battleId===state.战斗.id))tactics.push({id:`tactic:stop:${entry.id}`,name:`停止维持·${state.技能.列表[entry.skillId]?.name??entry.skillId}`,actionType:'停止维持',sourceKind:'tactic',maintenanceSourceId:entry.id,description:(support.maintain(state.技能.列表[entry.skillId])||endCooldown(state.技能.列表[entry.skillId])?'无需主行动，':'消耗本回合主行动，')+'结束这次施放仍在维持的效果并释放其锁定魂力',available:!impairment.reason,reason:impairment.reason||''});
    for(const targetId of state.战斗.参与者ID列表)if(targetId!==actorId&&isActiveParticipant(state,targetId)&&influence.authority(state,actorId,targetId,'战斗').available){
      for(const [type,label] of [['防御','防御'],['放弃行动','停止攻击']])tactics.push({id:`tactic:command:${targetId}:${type}`,name:`命令${state.战斗单位.列表[targetId].名称}·${label}`,actionType:'控制命令',sourceKind:'tactic',controlTargetId:targetId,controlledIntent:{type},description:'占用本回合行动；对方在自己的下一次行动执行，来源失效则取消',available:!impairment.reason,reason:impairment.reason||''});
    }
    for(const item of Object.values(state.物品?.实例??{}).filter(v=>v.templateId==='seal-platform'&&v.durability>0)){
      let reason='';try{globalThis.SoulSealingCore.quoteStrike(state,actorId,item.id,state.战斗.id);}catch(e){reason=e.message;}
      if(!reason)tactics.push({id:`tactic:strike-seal:${item.id}`,name:`破坏封神台·${item.id}`,actionType:'破坏封神台',itemId:item.id,sourceKind:'tactic',description:'消耗本回合主行动，对暴露器体进行近战命中与耐久打击',available:!impairment.reason,reason:impairment.reason||''});
    }
    for(const item of Object.values(state.物品?.实例??{}).filter(i=>i.attachment?.controllers.includes(actorId)&&custody.resolveDevice(i)?.modes.limited&&state.战斗.参与者ID列表.includes(i.attachment.wearerId))){
      let reason=impairment.reason;try{custody.controlDevice(state,actorId,item.id,state.战斗.id);}catch(e){reason=e.message;}
      const limitChoices=controls.limitChoices(state,item.attachment.wearerId,{supportsDamage:item.templateId==='restraint-seal-platform'});
      tactics.push({id:`tactic:restraint:${item.id}`,name:`调节${item.name}`,actionType:'调节拘束',itemId:item.id,sourceKind:'tactic',description:'接触佩戴者后提交完整配置，消耗本回合主行动',available:!reason,reason,restraint:{targetId:item.attachment.wearerId,targetName:state.战斗单位.列表[item.attachment.wearerId].名称,modes:Object.keys(custody.resolveDevice(item).modes),mode:item.attachment.mode,limits:clone(item.attachment.limits??limitChoices.presets.find(p=>p.id==='restricted').limits),supportsFineLimits:['restraint-seal-collar','restraint-seal-platform'].includes(item.templateId),supportsDamage:item.templateId==='restraint-seal-platform',autoRelock:!!custody.resolveDevice(item).autoRelock,choices:limitChoices}});
    }
    const recovery=participationRecovery(state,actorId);
    return recovery?tactics.map(t=>recoveryMatches(recovery,{type:t.actionType,statusId:t.statusId,...(t.id==='tactic:move'?{movement:{}}:{})})?t:{...t,available:false,reason:recovery.reason}):tactics;
  }

  function controlledAction(state,actorId) {
    const order=influence.pendingOrder(state,actorId);if(!order)return null;
    return influence.withCommand(state,order.issuerId,actorId,order.domain,()=>{
    const intent={...clone(order.intent),actorId};
    try {
      const impairment=actionImpairment(state,actorId);
      if(impairment.reason&&(impairment.surprised||intent.type!=='挣脱'))throw Error(`当前因${impairment.reason}无法执行命令`);
      if(['技能','切换武魂'].includes(intent.type)){
        const projected=foundation.normalizeState(clone(state)),preview=influence.withCommand(projected,order.issuerId,actorId,order.domain,()=>previewUncontrolledActionPrepared(projected,intent));if(!preview.ready)throw Error(preview.reason);
      }else{
        const option=listTacticalActions(state,actorId).find(t=>t.actionType===intent.type&&(intent.type!=='放弃行动'||t.id===(intent.movement?'tactic:move':'tactic:pass'))&&(!intent.statusId||t.statusId===intent.statusId)&&(!intent.maintenanceSourceId||t.maintenanceSourceId===intent.maintenanceSourceId));
        if(!option?.available)throw Error(option?.reason||'当前无法执行该战术');
        const projected=clone(state);influence.withCommand(projected,order.issuerId,actorId,order.domain,()=>moveUnit(projected,projected.战斗单位.列表[actorId],intent.movement,{}));
      }
      return {order,intent,reason:''};
    }catch(error){return {order,intent:{actorId,type:'放弃行动'},reason:error.message};}
    });
  }
  function previewAction(rawState,intent={}) {return previewActionUsing(rawState,intent,foundation.normalizeState);}
  // Engine snapshots have already passed world validation. Each preview still owns a fresh draft for movement, controls and targeting.
  function previewCurrentAction(state,intent={},sealed) {
    return previewActionUsing(state,intent,sealed?.(state)?input=>projectionCore.fork(input,sealed).state:clone);
  }
  function previewActionUsing(rawState,intent,prepare) {
    if(intent.type==='技能'&&globalThis.SoulCombatDeployments.isDeploySkill(rawState.技能.列表[intent.skillId],intent.branchIds??(intent.branchTargets?Object.keys(intent.branchTargets).filter(id=>intent.branchTargets[id]?.enabled!==false):undefined)))try{const q=globalThis.SoulCombatDeployments.fromRingSkill(rawState,intent.actorId,intent.skillId,intent.modeId??'projection');if(q.mode!=='projection')throw Error('真身请在战前调遣');intent={...intent,type:'召唤投影',residentId:q.targetId};}catch(error){return {ready:false,reason:error.message};}

    const state=prepare(rawState),forced=controlledAction(state,String(intent.actorId??''));
    if(!forced&&influence.autonomy(state,String(intent.actorId??'')).puppet){const active=state.战斗?.状态==='进行中'&&state.战斗.当前行动单位ID===intent.actorId&&isActiveParticipant(state,intent.actorId)&&!state.战斗.扩展.clock.pendingRoundStart;return {ready:active&&intent.type==='放弃行动'&&!intent.movement,actorId:intent.actorId,actionType:'放弃行动',reason:active?'精神接管期间等待有效命令':'当前不是本人的可行动回合',costsMainAction:true,targeting:{needsPrimaryTarget:false,needsAim:false,choices:[]}};}
    if(forced&&(state.战斗?.状态!=='进行中'||state.战斗.当前行动单位ID!==intent.actorId||!isActiveParticipant(state,intent.actorId)||state.战斗.扩展.clock.pendingRoundStart))return {ready:false,reason:'当前不是本人的可行动回合',actorId:intent.actorId};
    if(forced){
      if(['技能','切换武魂'].includes(forced.intent.type))return influence.withCommand(state,forced.order.issuerId,forced.intent.actorId,forced.order.domain,()=>({...previewUncontrolledActionPrepared(state,forced.intent),controlOrder:clone(forced.order)}));
      return {ready:true,actorId:forced.intent.actorId,actionType:forced.intent.type,controlOrder:clone(forced.order),controlFailure:forced.reason,costsMainAction:true,targeting:{needsPrimaryTarget:false,needsAim:false,choices:[]}};
    }
    const recovery=participationRecovery(state,String(intent.actorId??''));
    if(recovery){const active=state.战斗?.状态==='进行中'&&state.战斗.当前行动单位ID===intent.actorId&&isActiveParticipant(state,intent.actorId)&&!state.战斗.扩展.clock.pendingRoundStart;return {ready:active&&recoveryMatches(recovery,intent),reason:active?recovery.reason:'当前不是本人的可行动回合',actorId:intent.actorId,actionType:recovery.intent.type,participation:recovery.permission,costsMainAction:true,targeting:{needsPrimaryTarget:false,needsAim:false,choices:[]}};}
    if(intent.type==='武魂外放'){try{const id=String(intent.actorId??'');if(state.战斗.状态!=='进行中'||state.战斗.当前行动单位ID!==id||!isActiveParticipant(state,id)||state.战斗.扩展.clock.pendingRoundStart||actionImpairment(state,id).reason)throw Error('当前不是本人可以行动的回合');const q=globalThis.SoulManifestation.quote(state,intent);return {ready:true,...q,actionType:intent.type,targeting:{needsPrimaryTarget:false,needsAim:false,choices:[]}};}catch(error){return {ready:false,reason:error.message};}}
    if(intent.type==='召唤投影'){try{const id=String(intent.actorId??'');if(state.战斗.状态!=='进行中'||state.战斗.当前行动单位ID!==id||!isActiveParticipant(state,id)||state.战斗.扩展.clock.pendingRoundStart||actionImpairment(state,id).reason)throw Error('当前不是本人可以行动的回合');moveUnit(state,state.战斗单位.列表[id],intent.movement,{});const q=globalThis.SoulCombatDeployments.quote(state,{actorId:id,targetId:intent.residentId,mode:'projection'},{battleId:state.战斗.id});return {ready:true,actorId:id,actionType:intent.type,residentId:q.prototypeId,cost:q.cost.totals.soulPower,costsMainAction:true,targeting:{needsPrimaryTarget:false,needsAim:false,choices:[]}};}catch(error){return {ready:false,reason:error.message};}}
    if(intent.type==='药剂施用'){try{const s=clone(rawState),id=intent.actorId;if(s.战斗.状态!=='进行中'||s.战斗.当前行动单位ID!==id||!isActiveParticipant(s,id)||s.战斗.扩展.clock.pendingRoundStart||actionImpairment(s,id).reason)throw Error('当前不是本人可以行动的回合');const movementReceipt={};moveUnit(s,s.战斗单位.列表[id],intent.movement,movementReceipt);const movement=movementReceipt.movement??null;const q={...intent,type:intent.operation};for(const k of ['operation','movement','targetIds'])delete q[k];const quote=globalThis.SoulPoisonCore.quote(s,q);return {ready:true,actorId:id,actionType:intent.type,movement,quote,costsMainAction:true,targeting:{needsPrimaryTarget:false,needsAim:false,choices:[]}};}catch(e){return {ready:false,reason:e.message};}}
    if(intent.type==='控制命令'){
      const actorId=String(intent.actorId??''),targetId=String(intent.controlTargetId??'');
      if(state.战斗.当前行动单位ID!==actorId||!isActiveParticipant(state,actorId)||actionImpairment(state,actorId).reason)throw Error('当前不能发出控制命令');
      moveUnit(state,state.战斗单位.列表[actorId],intent.movement,{});
      const order=influence.issueBattleOrder(state,{id:'preview-order',issuerId:actorId,actorId:targetId,intent:intent.controlledIntent});
      return {ready:true,actorId,actionType:'控制命令',controlOrder:order,costsMainAction:true,targeting:{needsPrimaryTarget:false,needsAim:false,choices:[]}};
    }
    const result=previewUncontrolledActionPrepared(state,intent),actor=state.战斗单位.列表[intent.actorId],skill=actor&&getSkill(state,actor,intent.skillId??'ordinary.attack',intent.castRank);
    const summons=actor&&summonSelectionView(state,actor,skill,result.soulPowerCost??0,intent);
    if(summons)result.summonChoices=summons;
    if(actor)result.battleResources=battleResourceView(state,actor.id);
    return result;
  }

  function settleAction(rawState, intent = {},owned=false) {
    return settleActionUsing(rawState,intent,owned?foundation.normalizeOwnedState:foundation.normalizeState);
  }
  // Only a committed foreground world can skip the input normalization pass.
  function settleCommittedAction(state,intent) {
    return settleActionUsing(state,intent,clone);
  }
  function settleActionUsing(rawState,intent,prepare) {
    if(intent.type==='技能'&&globalThis.SoulCombatDeployments.isDeploySkill(rawState.技能.列表[intent.skillId],intent.branchIds??(intent.branchTargets?Object.keys(intent.branchTargets).filter(id=>intent.branchTargets[id]?.enabled!==false):undefined))){const q=globalThis.SoulCombatDeployments.fromRingSkill(rawState,intent.actorId,intent.skillId,intent.modeId??'projection');if(q.mode!=='projection')throw Error('真身请在战前调遣');intent={...intent,type:'召唤投影',residentId:q.targetId};}
    return settleActionPrepared(prepare(rawState),intent);
  }
  function settleOwnedBackgroundAction(state,intent) {
    return settleActionPrepared(foundation.normalizeOwnedState(state),intent);
  }
  function settleActionPrepared(state, intent) {
    const order=influence.pendingOrder(state,String(intent.actorId??''));
    return order?influence.withCommand(state,order.issuerId,order.actorId,order.domain,()=>settleActionBody(state,intent)):settleActionBody(state,intent);
  }
  function settleActionBody(state, intent) {
    const constructCursor=globalThis.SoulCreationCore.eventCursor(state);
    const actionId = String(intent.id ?? '').trim();
    if (!actionId) throw new Error('行动缺少唯一ID');
    const existing = state.战斗.扩展?.已结算行动?.[actionId];
    if (existing) return {state, receipt: clone(existing), idempotent: true};
    if (!ACTIVE_BATTLE_STATES.includes(state.战斗.状态)) throw new Error('当前没有进行中的战斗');
    if(state.战斗.扩展.clock.pendingRoundStart)throw Error('本轮尚未到正式开始时刻');
    const actorId = String(intent.actorId ?? '');
    if (actorId !== state.战斗.当前行动单位ID) throw new Error(`尚未轮到单位：${actorId}`);
    const actor = state.战斗单位.列表[actorId];
    if(actor?.扩展?.召唤?.指令?.mode==='cast')delete actor.扩展.召唤.指令;
    if (!actor || !isActiveParticipant(state, actorId)) throw new Error('行动者不存在、已经失能或已经撤离');
    influence.reconcileOrders(state);
    const forced=controlledAction(state,actorId);
    if(forced)intent={...forced.intent,id:actionId,actorId};
    globalThis.SoulPersonContracts?.assertAction(state,intent);
    const contractObservationContext=globalThis.SoulPersonContracts?.beginAction(state,intent),contractSource=globalThis.SoulPersonContracts?.table(state).records.some(r=>r.status==='active')?actionSkillContract(state,intent):null;
    if(!forced&&influence.autonomy(state,actorId).puppet&&(intent.type!=='放弃行动'||intent.movement))throw Error('精神接管期间只能等待有效命令');
    const resistance=globalThis.SoulConsciousness?.resistanceReason(state,actorId,{action:intent.type});if(resistance)throw Error(resistance);
    const recovery=forced?null:participationRecovery(state,actorId);
    if(recovery&&!recoveryMatches(recovery,intent))throw Error(recovery.reason);
    const member = battleMember(state, actorId);
    const {surprised,reason:disabledReason} = actionImpairment(state,actor.id);
    const rng = resumeRng(state.战斗.扩展.随机);
    const receipt = {
      id: `receipt-${state.战斗.id}-${actionId}`, type: 'combat-action', battleId: state.战斗.id,
      round: state.战斗.回合, actorId, actionId, actionType: intent.type ?? '技能', movement: null,
      skill: null, targets: [], statusEvents: [], traitEvents: [], narrationFacts: [], errors: [],
      actionStateBefore:combatActionConstraints(state,actorId), stateChanges:[], statusLifecycle:[], fieldLifecycle:[],
      ...(intent.aiDecision ? {aiDecision: clone(intent.aiDecision)} : {})
    };
    if(forced){receipt.controlOrder={id:forced.order.id,issuerId:forced.order.issuerId,sourceStatusId:forced.order.sourceStatusId,requested:clone(forced.order.intent),failure:forced.reason};receipt.narrationFacts.push(forced.reason?`${actor.名称}无法执行控制命令：${forced.reason}`:`${actor.名称}受控制执行已下达的命令`);}
    if(recovery){receipt.participation={...recovery.permission,policy:'self-preservation'};receipt.narrationFacts.push(`${actor.名称}的原远征合作失效，本次自主求生：${intent.type}`);}
    globalThis.SoulCombatDeployments.recordPerception(state,receipt);
    const beforeAction = combatEvidenceSnapshot(state);
    const evidence = {receipt,phase:'main-action',order:0};
    actionEvidence.set(state,evidence);
    try {
    if(forced)influence.beginOrder(state,forced.order.id);
    if (intent.type === '认输') resolveSurrender(state,actor,receipt);
    else if (disabledReason && (surprised || intent.type !== '挣脱')) {
      receipt.narrationFacts.push(`${actor.名称}因${disabledReason}失去本回合主行动`);
      if (surprised) member.surprisedRound = 0;
    } else {
      moveUnit(state, actor, intent.movement, receipt);
      if (intent.type === '控制命令') {
        receipt.issuedControlOrder=influence.issueBattleOrder(state,{id:receipt.id,issuerId:actorId,actorId:String(intent.controlTargetId??''),intent:intent.controlledIntent});
        receipt.narrationFacts.push(`${actor.名称}向${state.战斗单位.列表[receipt.issuedControlOrder.actorId].名称}下达控制命令，等待其自己的回合执行`);
      }
      else if(intent.type==='武魂外放'){
        const result=globalThis.SoulManifestation.execute(state,{actorId:actor.id,soulId:intent.soulId,operation:intent.operation},receipt.id);if(result.operation!=='recall'){joinBattlePrepared(state,{unitId:result.unitId,sideId:battleMember(state,actor.id).sideId,canFlee:false,extension:{summonedBy:actor.id}},rng);globalThis.SoulCreationCore.bindBattle(state);}receipt.manifestation=result;receipt.narrationFacts.push(result.summary);
      }
      else if(intent.type==='召唤投影'){
        const deployed=globalThis.SoulCombatDeployments.execute(state,{type:'deploy-resident',actorId:actor.id,targetId:intent.residentId,mode:'projection'},receipt.id,{battleId:state.战斗.id}),sideId=battleMember(state,actor.id).sideId;
        const joined=joinBattlePrepared(state,{unitId:deployed.unitId,sideId,canFlee:false,extension:{deploymentId:deployed.deploymentId,mode:'projection',summonedBy:actor.id}},rng);globalThis.SoulCombatDeployments.bindBattle(state);receipt.residentDeployment={...deployed,join:joined.receipt};receipt.narrationFacts.push(`${actor.名称}召唤${state.战斗单位.列表[deployed.unitId].名称}，本人意识进入受控投影并加入战斗`);
      }
      else if(intent.type==='配置加持')supportConfiguration(state,actor,intent,receipt,rng);
      else if (intent.type === '防御') addSimpleStatus(state, actor, 'status.buff', {属性: '物理防御', 数值: 2, 持续回合: 1}, receipt);
      else if (intent.type === '克制'){
        receipt.desireCheck=globalThis.SoulAbilityExchange.selfControl(state,actor.id,'restrain',receipt.id,battleNow(state),{kind:'battle',battleId:state.战斗.id,actorId:actor.id,operationId:receipt.id,actionType:'克制',round:state.战斗.回合});
        state.扩展.desireActionPayments??={};
        state.扩展.desireActionPayments[receipt.id]={checkId:receipt.desireCheck.id,proof:clone(receipt.desireCheck.paymentProof)};
      }
      else if (intent.type === '收回武魂'){receipt.soulChange=foundation.switchActiveMartialSoul(state,actor.id,'',{operationId:receipt.id});}
      else if(intent.type==='解除伪装')receipt.disguise=globalThis.SoulDisguise.dismiss(state,actor.id,intent.statusId,receipt);
      else if(intent.type==='识破伪装')receipt.disguise=globalThis.SoulDisguise.inspect(state,actor.id,intent.targetId,receipt.id,intent.method);
      else if (intent.type === '挣脱') resolveBreakFree(state, actor, rng, receipt,intent.statusId,intent.method);
      else if (intent.type === '逃跑') resolveEscape(state, actor, rng, receipt);
      else if (intent.type === '协助撤退') resolveRetreatAssist(state, actor, receipt);
      else if (intent.type === '停止维持') {
        const entry=state.扩展?.abilityMaintenance?.[String(intent.maintenanceSourceId??'')];
        if(!entry||entry.actorId!==actor.id||entry.battleId!==state.战斗.id)throw Error('只能停止本人在本场战斗维持的来源');
        const source=support.sourceSkill(state,entry.id,entry.skillId);
        if(support.maintain(source)||endCooldown(source))receipt.supportConfiguration={free:true};
        receipt.maintenance=stopMaintenance(state,entry.id,'manual',receipt);
        receipt.narrationFacts.push(`${actor.名称}结束了这次能力的持续维持`);
      }
      else if (intent.type === '结束武魂真身') {
        const avatar=activeMartialAvatar(state,actor.id),source=state.技能?.列表?.[avatar?.来源?.技能ID];
        if(endCooldown(source))receipt.supportConfiguration={free:true};
        if (!endMartialAvatar(state, actor, 'manual', receipt)) throw new Error('当前没有可以结束的武魂真身');
        receipt.narrationFacts.push(`${actor.名称}主动收束武魂真身`);
      }
      else if (intent.type === '切换武魂') {
        const targetSoulId = String(intent.martialSoulId ?? '').trim();
        const statusesBefore = clone(state.状态实例.列表);
        const domainsBefore = clone(state.战斗.扩展.领域实例 ?? {});
        const zonesBefore = clone(state.战斗.扩展.区域效果 ?? {});
        const switched = foundation.switchActiveMartialSoul(state, actor.id, targetSoulId,{operationId:receipt.id});
        for (const id of switched.endedStatusIds) recordStatusLifecycle(state,statusesBefore[id],'removed','martial-soul-switched');
        for (const id of switched.endedDomainIds) recordFieldLifecycle(state,domainsBefore[id],'domain','removed','martial-soul-switched');
        for (const id of Object.keys(zonesBefore)) if (!state.战斗.扩展.区域效果[id]) recordFieldLifecycle(state,zonesBefore[id],'zone','removed','martial-soul-switched');
        receipt.martialSoulSwitch = {
          previousSoulId: switched.previousSoulId,
          martialSoulId: targetSoulId,
          endedStatusIds: switched.endedStatusIds,
          endedDomainIds: switched.endedDomainIds
        };
        receipt.narrationFacts.push(`${actor.名称}切换武魂为${state.武魂.列表[targetSoulId].名称}`);
      }
      else if (intent.type === '调节拘束') {receipt.restraint=restraintAction(state,actor.id,intent,actionId,receipt);receipt.narrationFacts.push(receipt.restraint.summary);}
      else if(intent.type==='药剂施用'){const q={...intent,type:intent.operation,id:actionId};for(const k of ['operation','movement','targetIds'])delete q[k];receipt.medicine=globalThis.SoulPoisonCore.execute(state,q,actionId);receipt.targets.push(...receipt.medicine.targets);receipt.narrationFacts.push(`${actor.名称}按实际剂量和施用途径使用药剂`);}
      else if (intent.type === '破坏封神台') {receipt.deviceStrike=globalThis.SoulSealingCore.strike(state,actor.id,intent.itemId,actionId,{battleId:state.战斗.id,rng});receipt.narrationFacts.push(receipt.deviceStrike.summary);}
      else if (intent.type === '放弃行动') receipt.narrationFacts.push(`${actor.名称}放弃本回合主行动`);
      else {
        const skill = getSkill(state, actor, intent.skillId ?? 'ordinary.attack',intent.castRank);
        if (!skill) throw new Error(`单位没有技能：${intent.skillId}`);
        if (skillBlockedByBattleRules(state, skill)) throw new Error('地狱杀戮场封禁魂环魂技');
        if (skill.ownerKind === '魂兽' && skill.sourceBeastProfileId && actor.扩展?.魂兽档案ID !== skill.sourceBeastProfileId) throw new Error('魂兽技能来源与行动者不匹配');
        if (skill.持有者单位ID && skill.持有者单位ID !== actor.id) throw new Error('魂技不属于行动者');
        externalSourceItem(state, actor, skill);
        executeSkill(state, actor, skill, intent, rng, receipt);
        globalThis.SoulDisguise.revealMartialAction(state,actor.id,skill,receipt);
      }
    }
    for (const target of receipt.targets) {
      if (target.check?.hit) receipt.narrationFacts.push(`${actor.名称}命中${state.战斗单位.列表[target.targetId]?.名称 ?? target.targetId}`);
      if (target.check?.saved) receipt.narrationFacts.push(`${state.战斗单位.列表[target.targetId]?.名称 ?? target.targetId}豁免成功`);
      if (target.check?.statusGuardSources?.length && target.check.mode==='advantage') receipt.narrationFacts.push(`${state.战斗单位.列表[target.targetId]?.名称 ?? '目标'}抵抗对应状态时掷两次取较高值`);
      for (const applied of target.effects) {
        if (applied.hpDamage !== undefined) receipt.narrationFacts.push(`${state.战斗单位.列表[target.targetId]?.名称 ?? target.targetId}受到${applied.hpDamage}点${applied.damageType}伤害`);
        if(applied.elementAmplification?.percent)receipt.narrationFacts.push(`${applied.elementAmplification.sources.map(s=>s.name).join('、')}使${applied.damageType}伤害提高${applied.elementAmplification.percent}%，抗性结算前增加${applied.elementAmplification.gain}点`);
        if (applied.statusId) {
          const params=state.状态实例.列表[applied.statusId]?.快照?.参数 ?? {};
          const objectName=({'status.buff':'属性削弱','status.resistance_shift':'属性易伤','status.eternal_wound':'持续创伤'})[params.防护对象] ?? effects.EFFECT_REGISTRY[params.防护对象]?.displayName;
          const description=applied.effectId==='status.resistance_shift'?`${params.类型}伤害${params.模式}`:applied.effectId==='status.status_guard'?`${objectName}状态${params.模式}`:effects.EFFECT_REGISTRY[applied.effectId]?.displayName ?? applied.effectId;
          receipt.narrationFacts.push(`${state.战斗单位.列表[target.targetId]?.名称 ?? target.targetId}获得${description}`);
        }
        if (applied.prevented==='状态免疫') receipt.narrationFacts.push(`${state.战斗单位.列表[target.targetId]?.名称 ?? '目标'}免疫了本次${effects.EFFECT_REGISTRY[applied.effectId]?.displayName ?? '负面状态'}`);
        if (applied.resistance?.absorbed>0) receipt.narrationFacts.push(`${state.战斗单位.列表[target.targetId]?.名称 ?? '目标'}吸收${applied.resistance.absorbed}点${applied.damageType}伤害，当前护盾${state.战斗单位.列表[target.targetId]?.资源?.生命?.临时 ?? 0}`);
        if (applied.resistance?.mode && applied.resistance.mode !== '正常') receipt.narrationFacts.push(`${state.战斗单位.列表[target.targetId]?.名称 ?? target.targetId}触发${applied.resistance.mode}`);
        if (applied.zoneId) receipt.narrationFacts.push(`场上形成${effects.EFFECT_REGISTRY[applied.effectId]?.displayName ?? applied.effectId}`);
        if (applied.summonedUnitIds?.length) receipt.narrationFacts.push(`${actor.名称}召唤${applied.summonedUnitIds.length}个单位`);
        if (applied.revived) receipt.narrationFacts.push(`${state.战斗单位.列表[target.targetId]?.名称 ?? target.targetId}重新恢复行动能力`);
        if (applied.counteredSkillId) receipt.narrationFacts.push(`${state.战斗单位.列表[target.targetId]?.名称 ?? target.targetId}反制了${receipt.skill?.name ?? '技能'}`);
      }
      const targetUnit = state.战斗单位.列表[target.targetId];
      if (targetUnit?.存活状态 === '死亡') {
        target.defeated = true;
        recordKill(state, target.targetId, actor.id, receipt, {type: 'direct', id: receipt.skill?.id ?? '', skillId: receipt.skill?.id ?? ''});
      }
    }
    if(forced)influence.completeOrder(state,forced.order.id,forced.reason?'failed':'executed',forced.reason,receipt.id);
    const afterAction = recordCombatChanges(state,beforeAction,receipt,'main-action');
    const contractObservation=globalThis.SoulPersonContracts?.observe(state,intent,receipt,'battle',contractSource,contractObservationContext);if(contractObservation){receipt.personContracts=contractObservation;evaluateBattleEnd(state);}
    evidence.phase = 'turn-boundary';
    if (state.战斗.状态 === '进行中'&&!receipt.supportConfiguration?.free) {
      refreshAllDomainMembership(state, rng, receipt);
      advanceTurn(state, rng, receipt);
    }
    if(state.战斗.状态==='已结束'&&state.战斗.扩展.先攻顺序.at(-1)===actorId)state.战斗.扩展.clock.completedTerminalRound=receipt.round;
    settleForegroundBoundary(state,rng,receipt);
    if (state.战斗.状态 === '已结束') receipt.battleResult = clone(state.战斗.扩展.结果);
    for(const id of state.战斗.参与者ID列表)if(!occupiedBattle(state,id,state.战斗.id))foundation.refreshBattleAttributeResources(state,state.战斗单位.列表[id]);
    pruneMaintenance(state,receipt);
    recordCombatChanges(state,afterAction,receipt,'turn-boundary');
    const constructChanges=globalThis.SoulCreationCore.eventsSince(state,constructCursor);
    if(constructChanges.creationSettlements)receipt.creationSettlements=constructChanges.creationSettlements;
    state.战斗.扩展.随机 = rng.snapshot();
    globalThis.SoulCombatDeployments.completePerception(state,receipt);
    state.战斗.扩展.已结算行动[actionId] = clone(receipt);
    if(receipt.deviceStrike)globalThis.SoulSealingCore.recordBattleStrike(state,actionId,receipt);
    state.战斗.扩展.结算单列表.push(clone(receipt));
    state.战斗.扩展.结算单列表 = state.战斗.扩展.结算单列表.slice(-30);
    state.战斗.最近结算单 = clone(receipt);
    state.系统.revision += 1;
    state.系统.last_transaction_id = actionId;
    state.历史.push({type: 'combat-action', battleId: state.战斗.id, actionId, actorId, round: receipt.round});
    state.历史 = state.历史.slice(-50);
    globalThis.SoulCooperationCore?.reconcile(state);globalThis.SoulCooperationPreparation?.reconcile(state);
    return {state, receipt, idempotent: false};
    } finally { actionEvidence.delete(state); }
  }

  function supportTargetScore(state, actor, skill, target) {
    skill=effectiveOutputSkill(state,actor.id,skill);
    const nodes = skillEffectBranches(skill).flatMap(branch=>branch.nodes);
    if (target.存活状态 === '死亡') return nodes.some(node => node.effectId === 'payload.revive') ? 1200 : -1000;
    let score = 0;
    const hpMissing = Math.max(0, target.资源.生命.最大 - target.资源.生命.当前);
    const spMissing = Math.max(0, (globalThis.SoulCombatDeployments.soulPowerResource(state,target.id)).最大 - (globalThis.SoulCombatDeployments.soulPowerResource(state,target.id)).当前);
    const negativeCount = activeStatuses(state, target.id).filter(status => foundation.negativeStatus(status.模板ID,status.快照?.参数)).length;
    for (const node of nodes) {
      if (node.effectId === 'payload.heal') score += hpMissing > 0 ? 80 + hpMissing / Math.max(1, target.资源.生命.最大) * 360 : -80;
      else if (node.effectId === 'payload.shield') {
        const offered = Math.max(0, Math.floor((Number(node.params?.骰数 ?? 1) * (Number(node.params?.骰面 ?? 4) + 1) / 2 + Number(node.params?.加值 ?? 0) + Math.max(0,attributeModifier(state,actor,'意志'))) * baseRuntimeOutputScale(skill)));
        const actualGain = Math.max(0, offered - Number(target.资源.生命.临时 ?? 0));
        score += actualGain > 0 ? 55 + actualGain * 5 : -120;
      }
      else if (node.effectId === 'payload.soul_restore') score += spMissing > 0 ? 55 + spMissing / Math.max(1, (globalThis.SoulCombatDeployments.soulPowerResource(state,target.id)).最大) * 260 : -70;
      else if (node.effectId === 'payload.cleanse') {const removable=Math.min(Number(node.params.最大数量??1),cleanseCandidates(state,target,node).reduce((sum,s)=>sum+Math.max(1,Number(s.层数??1)),0));score+=removable?130*removable:-90;}
      else if (node.effectId === 'payload.revive') score -= 500;
      else if (node.effectId === 'status.buff') {
        const duplicate = activeStatuses(state, target.id, 'status.buff').some(status => status.快照?.参数?.属性 === node.params?.属性);
        score += duplicate ? -65 : 75 + Math.abs(Number(node.params?.数值 ?? 1)) * 12;
      } else if (['status.resistance_shift','status.status_guard'].includes(node.effectId)) {
        const strength={抗性:1,免疫:2,吸收:3};
        const duplicate=foundation.defenseSources(state,target).some(source=>source.effectId===node.effectId && (source.params.类型??source.params.防护对象)===(node.params.类型??node.params.防护对象) && strength[source.params.模式]>=strength[node.params.模式]);
        score+=duplicate?-60:85;
      } else if (['status.haste', 'status.invulnerable', 'status.regeneration', 'reaction.counter'].includes(node.effectId)) {
        score += activeStatuses(state, target.id, node.effectId).length ? -60 : 85;
      } else if (node.effectId === 'transform.martial_avatar') {
        score += activeMartialAvatar(state, target.id) ? -500 : 180 + Number(node.params?.属性增幅档 ?? 1) * 35 + Number(node.params?.持续回合 ?? 2) * 12;
      }
    }
    if (target.id === state.角色?.主控单位ID) score += 8;
    return score;
  }

  function aiThreatScore(state,unit) {
    if (!unit) return 0;
    const level = Number(unit.派生?.有效等级 ?? 1);
    const quality = unit.单位种类 === '魂兽' ? 1 : Number(unit.派生?.魂力质量倍率 ?? 1);
    const hpRatio = unit.资源.生命.当前 / Math.max(1, unit.资源.生命.最大);
    const spRatio = (globalThis.SoulCombatDeployments.soulPowerResource(state,unit.id)).当前 / Math.max(1, (globalThis.SoulCombatDeployments.soulPowerResource(state,unit.id)).最大);
    return level * quality * (0.72 + hpRatio * 0.18 + spRatio * 0.1) + cleanList(unit.能力?.技能ID).length * 2;
  }

  function aiNodeDamage(state,actor,skill,target,node,options={}) {
    const {damageType,scaling,avatarOutputBonus,outputScale,deliveryScale,damageBuff}=damageModifiers(state,actor,node,skill);
    const residual=node.effectId==='payload.residual';
    const average=residual?Number(node.params?.数值??1):Number(node.params?.骰数??1)*(Number(node.params?.骰面??4)+1)/2*(options.critical?2:1);
    const extra=bonusDiceActive(state,target,node.params)?node.params.追加骰数*(node.params.追加骰面+1)/2*(options.critical?2:1)+(node.params.追加加值??0):0;
    const raw=Math.max(0,(average+extra+Number(node.params?.加值??0)+Number(options.bonus??0)+scaling+avatarOutputBonus+damageBuff)*outputScale*deliveryScale*(options.scale??1));
    const amplified=foundation.amplifyElementDamage(Math.floor(raw),foundation.elementDamageProfile(state,actor.id,damageType));
    return Number(resolveResistance(state,target,damageType,amplified.amount,node.params?.穿透档??0,{actor,skill,consumeInvulnerability:false,invulnerabilityUses:options.defenses}).finalAmount??0);
  }
  function aiChargeDamage(state,actor,target,status,count,options={}) {
    if(options.defenses)return aiChargeDamageUncached(state,actor,target,status,count,options);
    return aiMemo(state,`charges:${actor.id}:${target.id}:${status.id??status.扩展?.追击来源合同?.id}:${count}:${JSON.stringify(status.快照?.参数)}:${JSON.stringify(options)}`,()=>controls.withReadIndex(state,()=>foundation.withBattleReadCache(state,()=>aiChargeDamageUncached(state,actor,target,status,count,options))));
  }
  function aiChargeDamageUncached(state,actor,target,status,count,options={}) {
    const source=status.扩展?.追击来源合同;if(!source)return 0;
    const p=status.快照.参数,skill=effectiveOutputSkill(state,actor.id,{...source,_runtimeOutputScale:runtimeSkillScale(state,actor,source)});
    let total=0;for(let i=0;i<count;i++)total+=aiNodeDamage(state,actor,skill,target,{effectId:'payload.damage',params:{类型:p.类型,骰数:p.骰数,骰面:p.骰面,加值:p.加值??0,穿透档:0}},{...options,bonus:0});return total;
  }
  const aiSkillReadKey=skill=>`${skill.id}:${skill.castOrigin?.rank??''}:${skill._modeId??''}:${skill._runtimeOutputScale??''}:${(skill.effectGraph?.nodes??[]).map(n=>n.id).join(',')}`;
  function aiExpectedDamage(state,actor,skill,target,options={}){return aiMemo(state,`damage:${actor.id}:${aiSkillReadKey(skill)}:${target.id}:${JSON.stringify(options)}`,()=>aiExpectedDamageUncached(state,actor,skill,target,options));}
  function aiExpectedDamageUncached(state,actor,skill,target,options={}) {
    const next=activeStatuses(state,actor.id,'modifier.next_skill').find(status=>status.来源?.技能ID!==skill.id);
    skill=effectiveOutputSkill(state,actor.id,{...skill,_runtimeOutputScale:executionOutputScale(state,actor,skill,next)});
    const nodes=skillEffectBranches(skill).flatMap(branch=>branch.nodes),slots=new Set(),numeric=Math.max(1,nodes.filter(n=>UPCAST_NUMERIC_EFFECTS.has(n.effectId)).length);let total=0;options={...options,defenses:new Map(),bonus:Number(options.bonus??0)/numeric};
    for(const node of nodes){
      if(['payload.damage','payload.residual','payload.drain'].includes(node.effectId)){
        if(node.params.引爆状态&&!detonationStatuses(state,actor,target,node.params).length)continue;
        if(!options.graze||node.effectId==='payload.damage')total+=aiNodeDamage(state,actor,skill,target,node,options);
      }else if(!options.graze&&node.effectId==='payload.resource_damage'){
        const p=node.params,row=mechanics.readPool(state,actor,skill,p.资源槽,(holder,source)=>poolSourceAllowed(state,holder,source));
        if(!row||row.value<Number(p.最低层数??1))continue;
        const n=Math.min(row.value,p.最大计入层数);
        total+=aiNodeDamage(state,actor,skill,target,{...node,effectId:'payload.damage',params:{类型:p.类型,骰数:Number(p.骰数??0)+n*Number(p.每层骰数??0),骰面:p.骰面??6,加值:Number(p.加值??0)+n*Number(p.每层加值??0),穿透档:p.穿透档??0}},options);
      }else if(!options.graze&&node.effectId==='payload.stack_confluence'){
        const slot=node.params.资源槽;slots.add(slot);let remaining=Number(node.params.最大数量);
        for(const status of chargeSources(state,actor,skill,slot)){const count=Math.min(remaining,status.层数);total+=aiChargeDamage(state,actor,target,status,count,options);remaining-=count;if(remaining<=0)break;}
      }
    }
    if(!options.graze&&options.followups!==false&&nodes.some(n=>['payload.damage','payload.drain','payload.resource_damage'].includes(n.effectId))&&nodes.some(n=>n.family==='check'&&n.effectId!=='check.save')){
      for(const status of activeStatuses(state,actor.id,'status.limited_followup')){
        const p=status.快照.参数;if(slots.has(p.资源槽)||status.扩展.作用来源!==mechanics.scope(skill))continue;
        const quota=state.战斗.扩展.通用追击额度?.[JSON.stringify([actor.id,status.扩展.作用来源,p.资源槽])];
        if(!quota||quota.round!==state.战斗.回合||quota.used<Number(p.每回合上限??1))total+=aiChargeDamage(state,actor,target,status,1,{...options,critical:false});
      }
    }
    return total;
  }

  function aiCanDamageWithoutMoving(state, actor) {
    const enemies=activeParticipants(state).filter(unit=>!sameSide(state,actor,unit));
    return cleanList(['ordinary.attack',...(actor.能力?.技能ID??[]),...(martialBaseSkill(actor)?['martial.base']:[])]).map(id=>getSkill(state,actor,id)).filter(Boolean).flatMap(skillModes).some(skill=>{
      if(!skill||skillBlockedByBattleRules(state,skill)||effects.skillActivation(skill.effectGraph)==='passive'
        ||!skillCastAvailability(state,actor,skill).available
        ||!skillUsageAvailability(state,actor,skill).available)return false;
      try{validateSkillSpecialRequirements(state,actor,skill);externalSourceItem(state,actor,skill);}catch{return false;}
      return enemies.some(target=>{
        const required=skillEffectBranches(skill).filter(branch=>!branch.optional).map(branch=>branch.id);
        return skillEffectBranches(skill).some(branch=>{
          const scoped=skillForBranch(skill,branch),branchIds=cleanList([...required,branch.id]);
          if(aiExpectedDamage(state,actor,scoped,target)<=0||!skillCastAvailability(state,actor,skill,{branchIds,targetIds:[target.id]}).available)return false;
          try{return resolveTargets(state,actor,scoped,{targetIds:[target.id],aimPoint:unitPoint(target)}).includes(target.id);}catch{return false;}
        });
      });
    });
  }

  function aiHarmfulTargetScore(state, actor, skill, target) {
    const nodes = skillEffectBranches(skill).flatMap(branch=>branch.nodes);
    const expectedDamage = aiExpectedDamage(state, actor, skill, target);
    const currentHp = Math.max(1, target.资源.生命.当前);
    let score = Math.min(1.25, expectedDamage / currentHp) * 250 + aiThreatScore(state,target) * 0.9;
    if (expectedDamage >= currentHp) score += 420;
    else if (target.资源.生命.当前 / Math.max(1, target.资源.生命.最大) <= 0.3) score += 95;
    for (const node of nodes) {
      if(effects.EFFECT_REGISTRY[node.effectId]?.hitRule?.inline)continue;
      if(node.effectId==='status.poison'){score+=aiPoisonValue(state,actor,skill,target,node)*5;continue;}
      if (foundation.negativeStatus(node.effectId,node.params) && matchingStatusGuards(state,target,node,'免疫').length) {score-=95;continue;}
      if (node.effectId === 'payload.soul_damage') score += Math.max(15, Number(node.params?.数值 ?? 1) * 8);
      if (node.effectId === 'status.armor_break') {
        const current = Math.max(0, ...activeStatuses(state, target.id, 'status.armor_break').map(status => Number(status.强度 ?? 0)));
        const proposed = Number(node.params?.数值 ?? 1);
        score += proposed > current && effectiveDefense(state, target, '物理') >= 14 ? 80 + proposed * 18 : -90;
      } else if (node.effectId==='status.hit_disadvantage') {
        score+=aiHitStatusValue(state,actor,skill,target,node);
      } else if (node.family === 'status') {
        const proposed={id:'ai-restriction',目标单位ID:target.id,模板ID:node.effectId,状态:'生效',快照:{参数:node.params},扩展:{封印武魂ID:node.params.范围==='当前武魂'?foundation.activeMartialSoulId(state,target.id):''},来源:{单位ID:actor.id}};
        const duplicate = activeStatuses(state, target.id, node.effectId).some(status=>statusDiscriminator(status)===statusDiscriminator(proposed));
        if(controls.EFFECT_IDS.includes(node.effectId)){
          const projected={...state,状态实例:{列表:{...state.状态实例.列表,[proposed.id]:proposed}}};
          const candidates=cleanList(['ordinary.attack','martial.base',...(target.能力?.技能ID??[])]).map(id=>getSkill(state,target,id)).filter(Boolean).flatMap(skillModes);
          const prevented=candidates.filter(candidate=>{const q=skillCastAvailability(state,target,candidate);if(!q.available)return false;const contract=abilities.describe(candidate);return !!controls.skillReason(projected,target.id,candidate,contract)||q.payment.totals.soulPower>controls.availableSoulPower(projected,target.id)||!!(candidate.sourceItemId&&controls.itemEffectBlockReason(projected,target.id,projected.物品.实例[candidate.sourceItemId]));}).length;
          const movementLost=!movementImpairment(state,target.id)&&!!movementImpairment(projected,target.id);
          score+=duplicate?-95:prevented?70+Math.min(90,prevented*15):movementLost?(!aiCanDamageWithoutMoving(state,target)?90:8):-90;
          continue;
        }
        const hardControl = ['status.stun', 'status.sleep', 'status.charm'].includes(node.effectId);
        const preventsUsefulAction = node.effectId==='status.bind' ? !aiCanDamageWithoutMoving(state,target) :
          node.effectId==='status.silence' ? cleanList(target.能力?.技能ID).length>0 :
          node.effectId==='status.paralysis' ? Number(node.params?.阈值??3)<=Number(node.params?.层数??1) : hardControl;
        score += duplicate ? -95 : (preventsUsefulAction ? 95 + aiThreatScore(state,target) * 0.55 : node.effectId==='status.bind' ? 4 : 42);
      }
    }
    return {score, expectedDamage};
  }

  function aiOffenseChoiceScore(state, actor, skill, targetIds) {
    const targets = targetIds.map(id => state.战斗单位.列表[id]).filter(Boolean);
    let score = 0;
    let expectedDamage = 0;
    let hostileCount = 0;
    for (const target of targets) {
      if (sameSide(state, target, actor)) {
        score -= 1100 + aiThreatScore(state,target) * 2;
        continue;
      }
      hostileCount += 1;
      const value = aiHarmfulTargetScore(state, actor, skill, target);
      score += value.score;
      expectedDamage += value.expectedDamage;
    }
    if (!hostileCount) return {score: -10000, expectedDamage: 0, hostileCount: 0};
    score += Math.max(0, hostileCount - 1) * 115;
    const domain = skill.effectGraph?.nodes?.find(node => node.effectId === 'domain.field');
    if (domain) {
      const duration = Number(domain.params?.持续回合 ?? 1);
      const upkeep = Number(skill.effectGraph?.nodes?.find(node => node.effectId === 'sustain.maintain')?.params?.每回合魂力 ?? 0);
      const replacing = Object.values(state.战斗.扩展?.领域实例 ?? {}).some(item => item.来源?.单位ID === actor.id);
      score += hostileCount * duration * 55 - upkeep * duration * 5 - (replacing ? 160 : 0);
    }
    const quoted=tryQuoteSkillUse(state,actor,skill);
    if(!quoted.available)return {score:-10000,expectedDamage:0,hostileCount:0};
    const cost=quoted.payment.totals.soulPower+avatarActivationLock(skill,state,actor);
    const available = Math.max(1, controls.availableSoulPower(state,actor.id));
    const costRatio = cost / available;
    score -= costRatio * ((globalThis.SoulCombatDeployments.soulPowerResource(state,actor.id)).当前 / Math.max(1, (globalThis.SoulCombatDeployments.soulPowerResource(state,actor.id)).最大) < 0.35 ? 240 : 105);
    const lowestTargetHp = Math.min(...targets.filter(target => !sameSide(state, target, actor)).map(target => target.资源.生命.当前));
    if (!isOrdinaryAttack(skill) && hostileCount === 1 && expectedDamage > lowestTargetHp * 1.65) score -= 110 * Math.min(2, expectedDamage / Math.max(1, lowestTargetHp) - 1);
    if (skill.sourceKind === 'consumable') score -= 75;
    return {score, expectedDamage, hostileCount, cost};
  }

  function aiSkillRange(skill) {
    const release = skill.effectGraph?.nodes?.find(node => node.family === 'release');
    const targeting = skill.effectGraph?.nodes?.find(node => node.family === 'targeting');
    return releaseRangeZones(release,targeting);
  }

  function aiMovementToward(state, actor, target) {
    if(movementImpairment(state,actor.id))return null;
    const maximum=movementAllowance(state,actor).maximum;
    if(maximum<=0)return null;
    const position=closestApproachPosition(actor,target,maximum);
    if(position.距离区===actor.位置.距离区&&pointDistance(unitPoint(actor),unitPoint({位置:position}))<.000001)return null;
    try{assertVoluntaryPosition(state,actor,actor.位置,position);}catch{return null;}
    return position;
  }

  // Value the actual resisted future ticks without counting them as an instant
  // kill. An already established dose is not a reason to spend another cast
  // every turn; let it work and refresh near its last tick.
  function aiPoisonValue(state,actor,skill,target,node){
    if(matchingStatusGuards(state,target,node,'免疫').length)return 0;
    const held=activeStatuses(state,target.id,'status.poison').filter(s=>s.来源?.单位ID===actor.id&&s.来源?.技能ID===skill.id);
    if(held.some(s=>Number(s.持续?.剩余回合??0)>1))return 0;
    const p=node.params,profile=releasedElementProfile(state,actor,skill,'毒蚀');
    const holder={模板ID:'status.poison',来源:{单位ID:actor.id,技能ID:skill.id},快照:{参数:p,属性增伤:profile},扩展:{持续来源合同:skill}};
    const raw=statusDamageValue(state,holder),perTick=Number(resolveResistance(state,target,'毒蚀',raw,0,{sourceUnitId:actor.id,skill,consumeInvulnerability:false}).finalAmount??0);
    const ticks=Math.max(0,Math.min(3,Number(p.持续回合??1))-Math.max(0,...held.map(s=>Number(s.持续?.剩余回合??0))));
    return Math.min(Math.max(0,target.资源.生命.当前-aiExpectedDamage(state,actor,skill,target)),perTick*ticks);
  }

  function aiStepPlan(state,actor,node){return aiMemo(state,`step:${actor.id}:${node.params.距离区}`,()=>{
    if(movementImpairment(state,actor.id))return null;
    const foes=activeParticipants(state).filter(u=>!sameSide(state,actor,u)).sort((a,b)=>combatDistance(actor,a)-combatDistance(actor,b)).slice(0,3),nearest=foes[0];if(!nearest)return null;
    const amount=Number(node.params.距离区??1),point=unitPoint(actor),enemy=unitPoint(nearest),low=actor.资源.生命.当前<actor.资源.生命.最大*.35;
    let destination=closestApproachPosition(actor,nearest,amount);
    if(low&&combatDistance(actor,nearest)<=1){const dx=point.x-enemy.x,dy=point.y-enemy.y,length=Math.hypot(dx,dy)||1;destination={...actor.位置,战场坐标:battlePoint({x:point.x+dx/length*amount*BATTLEFIELD.zoneLength,y:point.y+dy/length*amount*BATTLEFIELD.zoneLength})};}
    if(pointDistance(point,unitPoint({位置:destination}))<.000001)return null;
    try{const projected=projectionCore.fork(state).state,moved=projected.战斗单位.列表[actor.id];moveUnit(projected,moved,destination,{});
      const before=Math.max(0,...foes.map(u=>aiBestDirectOutput(state,actor,u))),after=Math.max(0,...foes.map(u=>aiBestDirectOutput(projected,moved,projected.战斗单位.列表[u.id])));
      const incoming=foes.reduce((n,u)=>n+aiBestDirectOutput(state,u,actor),0),remaining=foes.reduce((n,u)=>n+aiBestDirectOutput(projected,projected.战斗单位.列表[u.id],moved),0);
      return {destination,score:Math.max(0,after-before)*6+Math.max(0,incoming-remaining)*8*(low?1.5:1)};
    }catch{return null;}
  });}

  function aiDefensiveBuffValue(state,actor,skill,target,node){return aiMemo(state,`defensive:${actor.id}:${target.id}:${skill.id}:${node.id}:${JSON.stringify(node.params)}`,()=>{
    const p=node.params,old=activeStatuses(state,target.id,node.effectId).filter(s=>node.effectId==='status.buff'?s.快照?.参数?.属性===p.属性:node.effectId==='status.amplify'?s.快照?.参数?.指标===p.指标:s.快照?.参数?.类型===p.类型&&s.快照?.参数?.模式===p.模式);
    if(old.some(s=>Number(s.快照?.参数?.数值??0)>=Number(p.数值??0)&&(s.持续?.模式==='来源维持'||Number(s.持续?.剩余回合??0)>1)))return 0;
    const foes=activeParticipants(state).filter(u=>!sameSide(state,target,u)&&!actionImpairment(state,u.id).reason).sort((a,b)=>combatDistance(target,a)-combatDistance(target,b)).slice(0,3);if(!foes.length)return 0;
    try{const projected=projectionCore.fork(state).state,recipient=projected.战斗单位.列表[target.id];applyStatus(projected,projected.战斗单位.列表[actor.id],recipient,node,'ai-defense-preview',{effects:[],skillId:skill.id},skill);
      const before=foes.reduce((n,u)=>n+aiBestDirectOutput(state,u,target),0),after=foes.reduce((n,u)=>n+aiBestDirectOutput(projected,projected.战斗单位.列表[u.id],recipient),0);
      const turns=Math.min(2,Number(p.持续回合??2)),urgent=target.资源.生命.当前<target.资源.生命.最大*.35?1.8:1;
      return Math.min(target.资源.生命.当前,Math.max(0,before-after)*turns)*8*urgent;
    }catch{return 0;}
  });}

  // Evaluate checks through the same modifier calculation as execution, without advancing RNG.
  function aiCheckChance(state,actor,skill,target){return aiMemo(state,`chance:${actor.id}:${aiSkillReadKey(skill)}:${target.id}`,()=>aiCheckChanceUncached(state,actor,skill,target));}
  function aiCheckChanceUncached(state,actor,skill,target) {
    const node=skill.effectGraph.nodes.find(node=>node.family==='check');
    if(!node)return {affected:1,damage:1,critical:0,graze:0};
    const receipt={};rollCheck(state,actor,target,node,{die:()=>10},receipt,skill,{preview:true});
    const check=receipt.check;
    if(!check||check.type==='automatic-beneficial')return {affected:1,damage:1,critical:0,graze:0};
    let chance=clamp((21+(check.modifier??0)-(check.defense??check.dc??0))/20,.05,.95);
    if(check.mode==='advantage')chance=1-(1-chance)**2;
    if(check.mode==='disadvantage')chance=chance**2;
    if(check.type==='save')return {affected:1-chance,damage:1-chance+(check.successEffect==='伤害减半'?chance*.5:0),critical:0,graze:0};
    const view=check.interference?hitRuleView(state,actor,target,skill):{},resolution=check.interference?.resolution??'ordinary';
    if(resolution==='absolute-evasion')return {affected:0,damage:0,critical:0,graze:0};
    let critical=check.mode==='advantage'?.0975:check.mode==='disadvantage'?.0025:.05;
    if(resolution==='sure-hit'){chance=1;critical=0;}
    else{
      const initial=chance,natural=critical;
      if(view.hit_reroll){critical+=(1-initial)*natural;chance+=(1-initial)*initial;}
      if(view.evasion_reroll){critical=chance*natural;chance*=initial;}
    }
    if(view.critical_guarantee)critical=chance;
    if(view.critical_guard)critical=0;
    return {affected:chance,damage:chance,critical,graze:resolution!=='sure-hit'&&view.miss_graze?(1-chance)*Number(view.miss_graze.params.擦伤比例??25)/100:0};
  }

  function aiCheckedDamage(state,actor,skill,target,bonus=0){
    return controls.withReadIndex(state,()=>foundation.withBattleReadCache(state,()=>aiCheckedDamageUncached(state,actor,skill,target,bonus)));
  }
  function aiCheckedDamageUncached(state,actor,skill,target,bonus=0){
    const chance=aiCheckChance(state,actor,skill,target),raw=aiExpectedDamage(state,actor,skill,target,{bonus});
    const critical=aiExpectedDamage(state,actor,skill,target,{critical:true,bonus});
    const graze=chance.graze?aiExpectedDamage(state,actor,skill,target,{graze:true,scale:Number(hitRuleView(state,actor,target,skill).miss_graze?.params.擦伤比例??25)/100}):0;
    const miss=1-chance.affected;
    return raw*(chance.damage-chance.critical)+critical*chance.critical+graze*miss;
  }

  function aiCastOptions(state,actor,skill){
    return aiMemo(state,'casts:'+actor.id+':'+skill.id+':'+(skill._modeId??''),()=>{
      const profile=soulRingCastProfile(state,actor,skill);if(!profile.enabled)return [];
      const numeric=skill.effectGraph.nodes.some(n=>UPCAST_NUMERIC_EFFECTS.has(n.effectId));
      const ranks=new Set([profile.selectedRank]);
      if(numeric)for(let rank=profile.maximumRank;rank>=profile.minimumRank;rank--){if(skillCastAvailability(state,actor,skill,{castRank:rank}).available){ranks.add(rank);break;}}
      if(profile.minimumRank<profile.selectedRank)ranks.add(profile.minimumRank);
      return [...ranks].sort((a,b)=>a-b).map(rank=>{const q=skillCastAvailability(state,actor,skill,{castRank:rank}),p=soulRingCastProfile(state,actor,skill,rank);return {rank,bonus:p.upcastBonus,affordable:q.available,cost:q.payment?.totals.soulPower??0};}).filter(q=>q.affordable);
    });
  }
  const aiDiceDistributions=new Map();
  function aiDiceDistribution(count,sides){
    const key=count+':'+sides;if(aiDiceDistributions.has(key))return aiDiceDistributions.get(key);
    let probabilities=new Map([[0,1]]);
    for(let i=0;i<count;i++){const next=new Map();for(const [sum,p]of probabilities)for(let die=1;die<=sides;die++)next.set(sum+die,(next.get(sum+die)??0)+p/sides);probabilities=next;}
    if(aiDiceDistributions.size>=96)aiDiceDistributions.delete(aiDiceDistributions.keys().next().value);
    aiDiceDistributions.set(key,probabilities);return probabilities;
  }
  function aiFinisherOdds(state,actor,skill,target,bonus=0){return aiMemo(state,`finish:${actor.id}:${skill.id}:${skill.castOrigin?.rank??''}:${skill._modeId??''}:${target.id}:${target.资源.生命.当前}:${target.资源.生命.临时}:${bonus}`,()=>aiFinisherOddsUncached(state,actor,skill,target,bonus));}
  function aiFinisherOddsUncached(state,actor,skill,target,bonus=0){
    const nodes=skillEffectBranches(skill).flatMap(b=>b.nodes).filter(n=>['payload.damage','payload.drain','payload.resource_damage'].includes(n.effectId));
    if(nodes.length!==1)return {probability:0,method:'complex-payload'};
    let node=nodes[0];
    if(node.effectId==='payload.resource_damage'){
      const p=node.params,row=mechanics.readPool(state,actor,skill,p.资源槽,(holder,source)=>poolSourceAllowed(state,holder,source));if(!row||row.value<Number(p.最低层数??1))return {probability:0,method:'empty-resource'};
      const n=Math.min(row.value,p.最大计入层数);node={...node,effectId:'payload.damage',params:{类型:p.类型,骰数:Number(p.骰数??0)+n*Number(p.每层骰数??0),骰面:p.骰面??6,加值:Number(p.加值??0)+n*Number(p.每层加值??0),穿透档:p.穿透档??0}};
    }
    const next=activeStatuses(state,actor.id,'modifier.next_skill').find(s=>s.来源?.技能ID!==skill.id),source=effectiveOutputSkill(state,actor.id,{...skill,_runtimeOutputScale:executionOutputScale(state,actor,skill,next)});
    const modifiers=damageModifiers(state,actor,node,source),p=node.params,threshold=target.资源.生命.当前+Number(target.资源.生命.临时??0)+Number(target.扩展?.装备战斗修正?.固定减伤??0),chance=aiCheckChance(state,actor,skill,target);
    const conditional=(critical,scale=1)=>{
      const count=Number(p.骰数??1)*(critical?2:1),sides=Number(p.骰面??6);
      const extra=bonusDiceActive(state,target,p),extraCount=extra?p.追加骰数*(critical?2:1):0;
      const amount=dice=>{const raw=Math.max(0,Math.floor((dice+Number(p.加值??0)+(extra?p.追加加值??0:0)+bonus+modifiers.scaling+modifiers.avatarOutputBonus+modifiers.damageBuff)*modifiers.outputScale*modifiers.deliveryScale*scale));
        const amplified=foundation.amplifyElementDamage(raw,foundation.elementDamageProfile(state,actor.id,modifiers.damageType));
        return resolveResistance(state,target,modifiers.damageType,amplified.amount,p.穿透档??0,{actor,skill:source,consumeInvulnerability:false}).finalAmount;};
      const cap=count*sides+extraCount*(p.追加骰面??0);
      if(amount(cap)<threshold)return 0;if(amount(count+extraCount)>=threshold)return 1;
      // Resolve the damage threshold once; probabilities share the cached dice distributions.
      let low=count+extraCount,high=cap;
      while(low<high){const mid=Math.floor((low+high)/2);if(amount(mid)>=threshold)high=mid;else low=mid+1;}
      let result=0;
      const extras=extra?aiDiceDistribution(extraCount,p.追加骰面):[[0,1]];
      for(const [dice,probability]of aiDiceDistribution(count,sides))for(const [add,weight]of extras)if(dice+add>=low)result+=probability*weight;
      return result;
    };
    let probability=conditional(false)*(chance.affected-chance.critical)+conditional(true)*chance.critical;
    if(chance.damage>chance.affected)probability+=conditional(false,(chance.damage-chance.affected)/Math.max(.000001,1-chance.affected))*(1-chance.affected);
    const counter=activeStatuses(state,target.id,'reaction.counter')[0];if(counter){const p=counterCheckProfile(state,target,skill,counter,actor);probability*=1-clamp((21+p.modifier-p.dc)/20,.05,.95);}
    return {probability:clamp(probability,0,1),hitChance:chance.affected,method:'dice-distribution'};
  }
  function aiOutputOptions(state,actor,target){return aiMemo(state,'output-options:'+actor.id+':'+target.id,()=>aiOutputOptionsUncached(state,actor,target));}
  function aiBestDirectOutput(state,actor,target){return Math.max(0,...aiOutputOptions(state,actor,target).map(v=>v.damage));}
  function aiOutputOptionsUncached(state,actor,target) {
    return cleanList(['ordinary.attack',...(actor.能力?.技能ID??[]),...(martialBaseSkill(actor)?['martial.base']:[])]).map(id=>getSkill(state,actor,id)).filter(Boolean).flatMap(skillModes).flatMap(offered=>{
      if(skillBlockedByBattleRules(state,offered)||effects.skillActivation(offered.effectGraph)==='passive'||!skillUsageAvailability(state,actor,offered).available)return [0];
      if(!offered.effectGraph.nodes.some(n=>['payload.damage','payload.drain','payload.residual','payload.resource_damage','payload.stack_confluence'].includes(n.effectId)))return [];
      const options=aiCastOptions(state,actor,offered),ranks=options.length?options:[{rank:undefined,bonus:0}];
      return ranks.map(cast=>{try{
        const skill=effects.currentSoulRingCastSkill(state,actor,offered,cast.rank);
        if(!skillCastAvailability(state,actor,skill,{targetIds:[target.id]}).available)return 0;
        validateSkillSpecialRequirements(state,actor,skill);externalSourceItem(state,actor,skill);
        if(!resolveTargets(state,actor,skill,{targetIds:[target.id],aimPoint:unitPoint(target)}).includes(target.id))return 0;
        return {skill,bonus:Number(cast.bonus??0),damage:aiCheckedDamage(state,actor,skill,target,Number(cast.bonus??0))};
      }catch{return 0;}});
    }).filter(v=>v&&typeof v==='object');
  }

  function aiHitStatusValue(state,actor,skill,target,node){
    const present=hitRuleSource(state,target.id,effects.EFFECT_REGISTRY[node.effectId].hitRule.kind);
    if(present&&Number(present.params.等级??1)>=Number(node.params.等级??1)&&Number(present.params.擦伤比例??0)>=Number(node.params.擦伤比例??0))return -180;
    const projected=projectionCore.fork(state).state,recipient=projected.战斗单位.列表[target.id],receipt={effects:[],skillId:skill.id};
    try{applyStatus(projected,projected.战斗单位.列表[actor.id],recipient,node,'ai-hit-rule-preview',receipt,skill);}catch{return -180;}
    const foes=activeParticipants(state).filter(unit=>!sameSide(state,target,unit));
    const defense=['evasion_reroll','absolute_evasion','critical_guard'].includes(effects.EFFECT_REGISTRY[node.effectId].hitRule.kind);
    let change=0;
    for(const foe of foes){
      const before=defense?aiBestDirectOutput(state,foe,target):aiBestDirectOutput(state,target,foe);
      const after=defense?aiBestDirectOutput(projected,projected.战斗单位.列表[foe.id],recipient):aiBestDirectOutput(projected,recipient,projected.战斗单位.列表[foe.id]);
      change=Math.max(change,node.effectId==='status.hit_disadvantage'?Math.max(0,before-after):defense?Math.max(0,before-after):Math.max(0,after-before));
    }
    const uses=Math.min(3,Number(node.params.次数??1),Number(node.params.持续回合??2));
    return change*uses*8;
  }

  function aiAvatarValue(state,actor,skill,node) {
    if(activeMartialAvatar(state,actor.id))return -1000;
    const foes=activeParticipants(state).filter(unit=>!sameSide(state,actor,unit));
    const projected=projectionCore.fork(state).state,transformed=projected.战斗单位.列表[actor.id];
    try{paySkillUse(projected,transformed,skill,{id:'ai-avatar-preview'},{targetIds:[actor.id]});applyMartialAvatar(projected,transformed,transformed,node,'ai-avatar-preview',{effects:[]},skill);}catch{return -1000;}
    return controls.withReadIndex(projected,()=>foundation.withBattleReadCache(projected,()=>{
    let before=0,after=0,incomingBefore=0,incomingAfter=0;
    for(const foe of foes){const outgoing=aiOutputOptions(state,actor,foe),incoming=aiOutputOptions(state,foe,actor);before=Math.max(before,...outgoing.map(v=>v.damage));after=Math.max(after,...outgoing.filter(v=>effectiveSoulPowerCost(projected,transformed,v.skill)<=controls.availableSoulPower(projected,actor.id)).map(v=>aiCheckedDamage(projected,transformed,v.skill,projected.战斗单位.列表[foe.id],v.bonus)));incomingBefore+=Math.max(0,...incoming.map(v=>v.damage));incomingAfter+=Math.max(0,...incoming.map(v=>aiCheckedDamage(projected,projected.战斗单位.列表[foe.id],v.skill,transformed,v.bonus)));}
    const teamOutput=activeParticipants(state).filter(unit=>sameSide(state,actor,unit)&&unit.id!==actor.id).reduce((sum,ally)=>sum+Math.max(0,...foes.map(foe=>aiBestDirectOutput(state,ally,foe))),0);
    const remaining=foes.reduce((sum,foe)=>sum+foe.资源.生命.当前,0);
    const usefulTurns=Math.min(3,Math.max(0,Math.ceil(remaining/Math.max(1,before+teamOutput))-1));
    return (Math.max(0,after-before)*usefulTurns+Math.min(actor.资源.生命.当前,Math.max(0,incomingBefore-incomingAfter)*usefulTurns))*8-Number(node.params.每回合魂力??0)*usefulTurns;
    }));
  }

  function aiCopyChoice(state,actor,skill,target,node) {
    const foes=activeParticipants(state).filter(unit=>!sameSide(state,actor,unit));
    let best={score:0,sourceUnitId:''};
    for(const source of activeParticipants(state).filter(unit=>unit.id!==actor.id))try{
      const projected=projectionCore.fork(state).state,recipient=projected.战斗单位.列表[actor.id],preview={effects:[]};
      paySkillUse(projected,recipient,skill,{id:'ai-copy-preview'},{targetIds:[target.id]});
      copySkills(projected,recipient,projected.战斗单位.列表[target.id],node,{copySourceUnitId:source.id},'ai-copy-preview',preview,skill);
      const ids=preview.effects.find(e=>e.copiedSkillIds)?.copiedSkillIds??[];
      const output=Math.max(0,...ids.flatMap(id=>skillModes(projected.技能.列表[id]).flatMap(candidate=>foes.map(foe=>tryQuoteSkillUse(projected,recipient,candidate,{targetIds:[foe.id]}).available?aiExpectedDamage(projected,recipient,candidate,projected.战斗单位.列表[foe.id]):0))));
      const current=Math.max(0,...foes.map(foe=>aiBestDirectOutput(state,actor,foe)));
      const score=Math.max(0,output-current)*Math.min(3,Number(node.params.持续回合??1))*8;
      if(score>best.score)best={score,sourceUnitId:source.id};
    }catch{}
    return best;
  }

  function aiBranchValue(state,actor,skill,target,bonus=0,cache=null){return aiMemo(state,`branch:${actor.id}:${skill.id}:${skill.castOrigin?.rank??''}:${skill._modeId??''}:${skill.effectGraph.nodes.map(n=>n.id).join(',')}:${target.id}:${bonus}:${!!cache?.shallow}`,()=>aiBranchValueUncached(state,actor,skill,target,bonus,cache));}
  function aiBranchValueUncached(state,actor,skill,target,bonus=0,cache=null) {
    const friendly=sameSide(state,actor,target),beneficial=isBeneficialSkill(skill);
    if(friendly!==beneficial)return {score:-2000,expectedDamage:0};
    const nodes=skill.effectGraph.nodes,hp=target.资源.生命,sp=(globalThis.SoulCombatDeployments.soulPowerResource(state,target.id));
    const numeric=Math.max(1,nodes.filter(node=>UPCAST_NUMERIC_EFFECTS.has(node.effectId)).length);
    const share=bonus;
    if(!beneficial){
      const chance=aiCheckChance(state,actor,skill,target);
      const raw=aiExpectedDamage(state,actor,skill,target);
      const damage=aiCheckedDamage(state,actor,skill,target,share*numeric);
      // Threat alone is not a reason to cast a zero-benefit attack or repeat a control.
      const old=aiHarmfulTargetScore(state,actor,skill,target);
      const baseline=Math.min(1.25,raw/Math.max(1,hp.当前))*250+aiThreatScore(state,target)*.9+(raw>=hp.当前?420:hp.当前/Math.max(1,hp.最大)<=.3?95:0);
      const control=(old.score-baseline)*chance.affected;
      const domain=nodes.find(node=>node.effectId==='domain.field');
      const existing=domain&&activeDomains(state).some(item=>item.来源?.单位ID===actor.id&&item.来源?.技能ID===skill.id);
      const duration=domain?Math.min(3,Number(domain.params.持续回合??1)):1;
      return {score:Math.min(damage*duration,hp.当前)*8+(damage>=hp.当前?180:0)+control-(existing?500:0),expectedDamage:damage};
    }
    let score=0;
    const missing=Math.max(0,hp.最大-hp.当前),urgent=hp.当前/Math.max(1,hp.最大)<.35?1.8:1;
    const pressure=activeParticipants(state).filter(unit=>!sameSide(state,actor,unit)&&combatDistance(unit,target)<=2).length;
    for(const node of nodes){
      const p=node.params??{},scale=effectiveOutputProfile(state,actor.id,node,skill).amountScale,average=(Number(p.骰数??1)*(Number(p.骰面??4)+1)/2+Number(p.加值??0)+Math.max(0,attributeModifier(state,actor,'悟性'))+share)*scale;
      if(effects.EFFECT_REGISTRY[node.effectId]?.hitRule&&!effects.EFFECT_REGISTRY[node.effectId].hitRule.inline)score+=aiHitStatusValue(state,actor,skill,target,node);
      else if(node.effectId==='status.limited_followup'){
        const held=chargeSources(state,target,skill,p.资源槽).reduce((sum,s)=>sum+s.层数,0),added=Math.max(0,Number(p.层数??1)-held);
        const status={快照:{参数:p},扩展:{追击来源合同:cleanSkillContract(skill)}};
        const foes=activeParticipants(state).filter(u=>!sameSide(state,target,u));
        score+=added?Math.max(0,...foes.map(foe=>aiChargeDamage(state,target,foe,status,added)))*6:-180;
      }else if(node.effectId==='status.invisibility'){
        if(activeStatuses(state,target.id,node.effectId).length)score-=180;
        else{
          const projected=projectionCore.fork(state).state,recipient=projected.战斗单位.列表[target.id];
          applyStatus(projected,projected.战斗单位.列表[actor.id],recipient,node,'ai-concealment',{effects:[]},skill);
          const foes=activeParticipants(state).filter(u=>!sameSide(state,target,u));
          score+=controls.withReadIndex(projected,()=>foundation.withBattleReadCache(projected,()=>foes.reduce((sum,foe)=>sum+Math.max(0,aiBestDirectOutput(state,foe,target)-Math.max(0,...aiOutputOptions(state,foe,target).map(v=>aiCheckedDamage(projected,projected.战斗单位.列表[foe.id],v.skill,recipient,v.bonus))))*Math.min(2,Number(p.持续回合??1))+Math.max(0,Math.max(0,...aiOutputOptions(state,target,foe).map(v=>aiCheckedDamage(projected,recipient,v.skill,projected.战斗单位.列表[foe.id],v.bonus)))-aiBestDirectOutput(state,target,foe)),0)*8));
        }
      }else if(node.effectId==='payload.heal')score+=Math.min(missing,average*healingMultiplier(state,target))*10*urgent;
      else if(node.effectId==='payload.restore'){
        const hpAmount=p.生命模式==='定量'?Number(p.生命数值??0)+share:p.生命模式==='缺失比例'?missing*Number(p.生命数值??0)/100:p.生命模式==='恢复至上限'?missing:0;
        const spMissing=Math.max(0,sp.最大-sp.当前);
        const spAmount=p.魂力模式==='定量'?Number(p.魂力数值??0)+share:p.魂力模式==='缺失比例'?spMissing*Number(p.魂力数值??0)/100:p.魂力模式==='恢复至上限'?spMissing:0;
        score+=Math.min(missing,hpAmount*scale)*10*urgent+Math.min(spMissing,spAmount*scale)*3;
      }else if(node.effectId==='status.regeneration')score+=activeStatuses(state,target.id,node.effectId).length?0:Math.min(missing,average*Math.min(2,Number(p.持续回合??1)))*7;
      else if(node.effectId==='status.buff'&&['物理防御','魂技防御','体魄'].includes(p.属性)&&Number(p.数值)>0)score+=aiDefensiveBuffValue(state,actor,skill,target,node);
      else if(node.effectId==='status.amplify'&&['物理防御','魂技防御'].includes(p.指标))score+=aiDefensiveBuffValue(state,actor,skill,target,node);
      else if(node.effectId==='status.resistance_shift'&&['抗性','免疫'].includes(p.模式))score+=aiDefensiveBuffValue(state,actor,skill,target,node);
      else if(node.effectId==='move.step'&&target.id===actor.id)score+=aiStepPlan(state,actor,node)?.score??0;
      else if(node.effectId==='payload.shield'){
        const offered=Math.floor((Number(p.骰数??1)*(Number(p.骰面??4)+1)/2+Number(p.加值??0)+Math.max(0,attributeModifier(state,actor,'意志'))+martialAvatarBonus(state,actor,skill,'同源魂技增幅')*2+share)*scale);
        score+=pressure?Math.max(0,offered-Number(hp.临时??0))*6:0;
      }
      else if(node.effectId==='zone.wall'){const existing=activeZones(state,'wall').some(z=>z.来源?.单位ID===actor.id&&z.来源?.技能ID===skill.id);score+=existing?0:pressure?Math.min(Number(p.耐久??0),120)*2+pressure*20:0;}
      else if(node.effectId==='payload.repair_item'){
        const choice=globalThis.SoulCreationCore.resolveItemOptions(state,actor.id,target.id,node),q=globalThis.SoulCreationCore.previewItemEffect(state,actor.id,target.id,node,choice);
        score+=Math.min(60,q.after-q.before)*2+(q.before===0?100:0);
      }else if(node.effectId==='payload.fabricate'){
        // Making supplies is a field decision; verify feasibility before considering a mixed branch.
        globalThis.SoulCreationCore.resolveItemOptions(state,actor.id,actor.id,node);
      }
      else if(node.effectId==='transform.martial_avatar'){
        const key=`${actor.id}:${skill.id}:${skill._modeId??''}:${node.id}`;
        if(cache?.shallow){score+=activeMartialAvatar(state,actor.id)?-1000:60;continue;}
        if(cache&&!cache.has(key))cache.set(key,aiAvatarValue(state,actor,skill,node));
        score+=cache?cache.get(key):aiAvatarValue(state,actor,skill,node);
      }else if(node.effectId==='summon.entity'){
        const existing=activeParticipants(state).some(unit=>unit.扩展?.召唤?.来源单位ID===actor.id&&unit.扩展?.召唤?.来源技能ID===skill.id);
        if(p.继承能力){score+=existing?-500:0;continue;}
        const foes=activeParticipants(state).filter(unit=>!sameSide(state,actor,unit));
        const output=Math.max(0,...foes.map(foe=>aiBestDirectOutput(state,actor,foe)))*(p.继承能力?Number(p.技能效果倍率??100)/100:.5);
        // A support copy without injured allies is not automatically worth more than an attack.
        const allies=activeParticipants(state).filter(unit=>sameSide(state,actor,unit));
        const injury=p.继承能力?Math.max(0,...allies.map(unit=>unit.资源.生命.最大-unit.资源.生命.当前)):0;
        const healing=p.继承能力&&actor.能力.技能ID.some(id=>state.技能.列表[id]?.effectGraph.nodes.some(n=>['payload.heal','payload.restore','status.regeneration'].includes(n.effectId)))?Math.min(injury,20):0;
        score+=existing?-500:Math.min(3,Number(p.持续回合??1))*Number(p.数量??1)*(output+healing)*6;
      }else if(node.effectId==='copy.skillset'){
        if(activeStatuses(state,actor.id,node.effectId).length)score-=500;
        else score+=aiCopyChoice(state,actor,skill,target,node).score;
      }else if(node.effectId==='modifier.next_skill'){
        const foes=activeParticipants(state).filter(unit=>!sameSide(state,actor,unit));score+=activeStatuses(state,target.id,node.effectId).length?-500:Math.max(0,...foes.map(foe=>aiBestDirectOutput(state,target,foe)))*Math.max(0,Number(p.效果倍率??100)/100-1)*8;
      }else if(node.effectId==='reaction.reflect')score+=pressure&&!activeStatuses(state,target.id,node.effectId).length?40:0;
      else if(node.family!=='release'&&node.family!=='targeting'&&node.family!=='check')score+=Math.max(0,supportTargetScore(state,actor,{...skill,effectGraph:{nodes:[node],edges:[]}},target));
    }
    return {score,expectedDamage:0};
  }

  let aiReadSession=null,aiWorkContext=null;
  function aiSpend(kind){if(!aiWorkContext)return;const work=aiWorkContext;if(work.used>=128||Date.now()>work.deadline){work.limited=true;throw Object.assign(Error('planning-work-limit'),{code:'ai-work-limit'});}work.used++;work[kind]=(work[kind]??0)+1;}
  function aiMemo(state,key,read){if(!aiReadSession)return read();let cache=aiReadSession.get(state);if(!cache){cache=new Map();aiReadSession.set(state,cache);}if(!cache.has(key))cache.set(key,read());return cache.get(key);}
  function chooseAiIntent(state,actorId,actionId) {
    const previous=aiReadSession,previousWork=aiWorkContext,started=Date.now();aiReadSession=new WeakMap();
    const work={used:0,quote:0,candidate:0,action:0,limited:false,deadline:Infinity};aiWorkContext=work;
    try{const isolated=projectionCore.seed(state),result=controls.withReadIndex(isolated,()=>foundation.withBattleReadCache(isolated,()=>{work.deadline=Date.now()+300;return chooseAiIntentPrepared(isolated,actorId,actionId);}));
      result.aiDecision??={};result.aiDecision.planning={...result.aiDecision.planning,work:{used:work.used,maximum:128,quotes:work.quote,candidates:work.candidate,actions:work.action},limited:work.limited,overallElapsedMs:Date.now()-started};return result;
    }finally{aiReadSession=previous;aiWorkContext=previousWork;}
  }
  function supportAiIntent(state,actor,actionId,reserve=0){
    if(actionImpairment(state,actor.id).reason)return null;
    const view=support.describe(state,actor.id);if(!view.skills.length)return null;
    const rows=view.skills.map(sk=>({skillId:sk.id,targetIds:view.sources.find(e=>e.skillId===sk.id)?.targetIds??[]}));
    const eligible=view.targets.filter(t=>view.skills.some(sk=>t.distance<=sk.range));
    if(!eligible.length)return null;
    if(!activeMartialAvatar(state,actor.id)&&eligible.length>=3&&view.skills.length>=3){
      const avatar=actor.能力.技能ID.map(id=>getSkill(state,actor,id)).find(sk=>sk?.effectGraph.nodes.some(n=>n.effectId==='transform.martial_avatar'&&n.params?.同源维持减耗百分比));
      if(avatar)try{const intent={id:actionId,actorId:actor.id,type:'技能',skillId:avatar.id,targetIds:[actor.id]};if(previewUncontrolledActionPrepared(clone(state),intent).ready&&controls.availableSoulPower(state,actor.id)>80+reserve)return {...intent,aiDecision:{policy:'maintained-support-avatar',affectedTargetIds:[actor.id]}};}catch{}
    }
    let changed=false;
    for(const sk of view.skills){
      const row=rows.find(r=>r.skillId===sk.id);
      for(const target of eligible){
        if(row.targetIds.includes(target.id)||target.distance>sk.range)continue;
        if(sk.effects.every(e=>['物理伤害','魂技伤害','治疗','护盾','攻击伤害','属性伤害','伤害减免'].includes(e.metric)?false:support.stat(state,target.id,e.metric)>=e.value))continue;
        row.targetIds.push(target.id);
        try{const quote=supportConfiguration(state,actor,{supportSelections:rows});if(quote.activation+quote.locked+quote.upkeep*3+reserve>controls.availableSoulPower(state,actor.id)+view.locked)throw Error('保留后续维持魂力');changed=true;}catch{row.targetIds.pop();}
      }
    }
    if(!changed)return null;
    return {id:actionId,actorId:actor.id,type:'配置加持',supportSelections:rows,aiDecision:{policy:'maintained-support',affectedTargetIds:cleanList(rows.flatMap(r=>r.targetIds))}};
  }
  function chooseAiIntentPrepared(state, actorId, actionId, options={}) {
    const actor = state.战斗单位.列表[actorId];
    if (!actor || !isActiveParticipant(state, actorId)) throw new Error('AI单位不存在或不能行动');
    const forced=controlledAction(state,actorId);if(forced)return {...forced.intent,id:actionId,aiDecision:{policy:'influence-order',orderId:forced.order.id,reason:forced.reason}};
    if(influence.autonomy(state,actorId).puppet)return {id:actionId,actorId,type:'放弃行动',aiDecision:{policy:'influence-wait'}};
    const recovery=participationRecovery(state,actorId);if(recovery)return {...recovery.intent,id:actionId,actorId,aiDecision:{policy:'self-preservation',...recovery.permission,reason:recovery.reason}};
    const member = battleMember(state, actorId);
    const commander=state.战斗单位.列表[state.角色?.主控单位ID];
    const order=actor.扩展?.召唤?.指令;
    const ordered=order?.battleId===state.战斗.id&&isActiveParticipant(state,order.targetId)?order:null;
    if(ordered?.mode==='cast'){
      const skill=state.技能.列表[ordered.skillId],target=state.战斗单位.列表[ordered.targetId];
      if(skill&&actor.扩展.召唤.天生技能ID?.includes(skill.id)&&skillCastAvailability(state,actor,skill,{targetIds:[target.id]}).available){
        try{resolveTargets(state,actor,skill,{targetIds:[target.id]});return {id:actionId,actorId,type:'技能',skillId:skill.id,targetIds:[target.id],aiDecision:{policy:'summon-order',mode:'cast'}};}catch{/* The target may have moved since the order. */}
      }
    }
    if(ordered?.mode==='guard'){
      const target=state.战斗单位.列表[ordered.targetId];
      const guarded=activeStatuses(state,target.id,'reaction.interpose').some(s=>s.来源.单位ID===actorId&&s.扩展.剩余次数>0);
      if(!guarded&&sameSide(state,actor,target))for(const id of actor.能力.技能ID){
        const k=state.技能.列表[id];if(!k?.effectGraph?.nodes.some(n=>n.effectId==='reaction.interpose'))continue;
        if(skillCastAvailability(state,actor,k,{targetIds:[target.id]}).available){
          try{if(combatDistance(actor,target)>k.effectGraph.nodes.find(n=>n.effectId==='reaction.interpose').params.距离区)continue;resolveTargets(state,actor,k,{targetIds:[target.id]});return {id:actionId,actorId,type:'技能',skillId:id,targetIds:[target.id],aiDecision:{policy:'summon-order',mode:'guard',affectedTargetIds:[target.id]}};}catch{/* Reposition using the ordinary tactical planner. */}
        }
      }
    }
    if(ordered?.mode==='guard'){
      const target=state.战斗单位.列表[ordered.targetId],movement=combatDistance(actor,target)>1?aiMovementToward(state,actor,target):null;
      return {id:actionId,actorId,type:'防御',...(movement?{movement}:{}),aiDecision:{policy:'summon-order',mode:'guard'}};
    }
    const discussed=globalThis.SoulCombatDeployments.strategy(state,actorId),strategy=ordered?{focusTargetId:ordered.mode==='focus'?ordered.targetId:null,protectTargetId:ordered.mode==='guard'?ordered.targetId:null,reservePercent:0,retreatPercent:0}:discussed?{focusTargetId:null,protectTargetId:null,reservePercent:discussed.reservePercent,retreatPercent:0}:commander&&sameSide(state,actor,commander)?state.战斗.扩展?.strategy:null;
    const reserve=Math.ceil((globalThis.SoulCombatDeployments.soulPowerResource(state,actor.id)).最大*(strategy?.reservePercent??0)/100);
    if (controls.breakable(state,actorId).length && !aiCanDamageWithoutMoving(state,actor)) {
      return {id: actionId, actorId, type: '挣脱', aiDecision:{policy:'strategic-utility-v2',mode:'break-free',affectedTargetIds:[actorId]}};
    }
    const healthRatio = actor.资源.生命.当前 / Math.max(1, actor.资源.生命.最大);
    const withdrawal=escapeDifficulty(state,actor),canWithdraw=withdrawal.preparation<2||withdrawal.nearestDistance>=2&&!withdrawal.engaged;
    if(strategy?.retreatPercent>0&&canFlee(state,actorId)&&canWithdraw&&healthRatio*100<=strategy.retreatPercent){
      const retreat={id:actionId,actorId,type:'逃跑',aiDecision:{policy:'player-strategy',mode:'conditional-retreat',affectedTargetIds:[actorId]}};
      if(listTacticalActions(state,actorId).some(action=>action.id==='tactic:escape'&&action.available))return retreat;
    }
    if (canFlee(state,actorId) && canWithdraw && healthRatio <= 0.22 && member.morale <= 50 && !movementImpairment(state,actorId)) {
      return {id: actionId, actorId, type: '逃跑'};
    }
    const supportive=supportAiIntent(state,actor,actionId,reserve);if(supportive)return supportive;
    const ownedSoulIds = foundation.ownedMartialSoulIds(state, actorId);
    const currentSoulId = foundation.activeMartialSoulId(state, actorId);
    if (ownedSoulIds.length > 1 && !activeMartialAvatar(state, actorId)) {
      const soulSkills = cleanList(actor.能力?.技能ID).map(id => getSkill(state, actor, id)).filter(skill => skillMartialSoulId(skill));
      const usableSoul=soulId=>{
        const projected=soulId===currentSoulId?state:clone(state);
        try{if(projected!==state){foundation.switchActiveMartialSoul(projected,actorId,soulId);pruneMaintenance(projected);}}catch{return false;}
        return soulSkills.filter(skill=>skillMartialSoulId(skill)===soulId).flatMap(skillModes).some(skill=>!skillBlockedByBattleRules(projected,skill)&&tryQuoteSkillUse(projected,projected.战斗单位.列表[actorId],skill).available);
      };
      const currentUsable = usableSoul(currentSoulId);
      const alternativeSoulId = ownedSoulIds.find(soulId => soulId !== currentSoulId && usableSoul(soulId));
      if (!currentUsable && alternativeSoulId) {
        return {
          id: actionId, actorId, type: '切换武魂', martialSoulId: alternativeSoulId,
          aiDecision: {policy: 'strategic-utility-v2', mode: 'switch-martial-soul', previousSoulId: currentSoulId, martialSoulId: alternativeSoulId, affectedTargetIds: []}
        };
      }
    }
    const enemies = activeParticipants(state)
      .filter(unit => !sameSide(state, unit, actor))
      .sort((left, right) => {
        const leftDistance = combatDistance(actor,left);
        const rightDistance = combatDistance(actor,right);
        if (leftDistance !== rightDistance) return leftDistance - rightDistance;
        if (state.战斗.扩展?.规则?.freeForAll) {
          const origin = unitPoint(actor);
          const leftPoint = unitPoint(left);
          const rightPoint = unitPoint(right);
          const leftSpace = Math.hypot(origin.x - leftPoint.x, origin.y - leftPoint.y);
          const rightSpace = Math.hypot(origin.x - rightPoint.x, origin.y - rightPoint.y);
          if (leftSpace !== rightSpace) return leftSpace - rightSpace;
        }
        const leftRatio = left.资源.生命.当前 / Math.max(1, left.资源.生命.最大);
        const rightRatio = right.资源.生命.当前 / Math.max(1, right.资源.生命.最大);
        if (leftRatio !== rightRatio) return leftRatio - rightRatio;
        return right.派生.有效等级 - left.派生.有效等级 || left.id.localeCompare(right.id);
      });
    const enemy = enemies[0];
    if (!enemy) throw new Error('AI没有合法敌人');
    const skillIds = cleanList(['ordinary.attack', ...(actor.能力.技能ID ?? []), ...(martialBaseSkill(actor) ? ['martial.base'] : [])]).sort();
    const skills = skillIds.map(id => getSkill(state, actor, id)).filter(skill => skill && effects.skillActivation(skill.effectGraph) !== 'passive').flatMap(skillModes).filter(skill => {
      if (!globalThis.SoulBattlePreferences.permitsAutomaticItem(state,actor,skill)||skillBlockedByBattleRules(state, skill)) return false;
      if(!skillCastAvailability(state,actor,skill).available)return false;
      try {
        if (!skillUsageAvailability(state,actor,skill).available) return false;
        validateSkillSpecialRequirements(state, actor, skill); externalSourceItem(state, actor, skill); return true;
      } catch { return false; }
    });
    const allies = Object.values(state.战斗单位.列表).filter(unit => sameSide(state, unit, actor) && isPresentParticipant(state, unit.id));
    const expedition=expeditions.forBattle(state,state.战斗.id),main=state.战斗单位.列表[expedition?.leaderId];
    const remainingRooms=expedition&&main&&sameSide(state,actor,main)?Math.max(0,(expedition.map?.layers?.length??0)-(expedition.currentRoom?.layer??0)):0;
    const emergency=allies.some(unit=>unit.存活状态==='存活'&&unit.资源.生命.当前/Math.max(1,unit.资源.生命.最大)<.35);
    // Reserve for the visible route, never for unseen enemy abilities. Immediate
    // rescue and the final room retain the ordinary short-battle priorities.
    const resourceWeight=remainingRooms&&!emergency?Math.min(10,4+remainingRooms):.7;
    const charmSources=new Set(activeStatuses(state,actor.id,'status.charm').map(status=>status.来源?.单位ID));
    // One bounded set of movement states is shared by support, attack, and mixed branches.
    const firstCache=new Map();firstCache.shallow=!!options.shallow;
    const projections=[{state,actor,movement:null,cache:firstCache}];
    const movementKeys=new Set();
    for(const target of [...allies,...enemies]){
      const movement=aiMovementToward(state,actor,target);
      if(!movement)continue;
      const key=JSON.stringify(movement);if(movementKeys.has(key))continue;movementKeys.add(key);
      try{
        const moved={...actor,位置:clone(actor.位置)},projected={...state,
          // Movement synchronizes cloud residents and medicine offers. Isolate its
          // writable ledger and event counter without copying the story history.
          扩展:{...state.扩展},
          ...(state.世界?.poisons?{世界:{...state.世界,poisons:clone(state.世界.poisons)}}:{}),
          战斗单位:{...state.战斗单位,列表:{...state.战斗单位.列表,[actor.id]:moved}}};
        moveUnit(projected,moved,movement,{});const cache=new Map();cache.shallow=!!options.shallow;projections.push({state:projected,actor:moved,movement,cache});
      }catch{}
    }
    const choices=[];
    for(const offered of skills){
      const allRanks=aiCastOptions(state,actor,offered);
      const numeric=offered.effectGraph.nodes.some(n=>UPCAST_NUMERIC_EFFECTS.has(n.effectId));
      const ranks=allRanks.filter((v,i)=>numeric?(i===0||i===allRanks.length-1||v.rank===nativeSoulRingRank(state,offered)):(v.rank===nativeSoulRingRank(state,offered)||allRanks.length===1));
      const casts=ranks.length?ranks:[{rank:undefined,bonus:0,cost:skillCastAvailability(state,actor,offered).payment.totals.soulPower}];
      for(const projection of projections){
        if(aiWorkContext?.limited)break;
        controls.withReadIndex(projection.state,()=>scoreCasts(projection,offered,casts));
      }
    }
    // Each movement has already been applied. All candidate effects run on their own forks.
    function scoreCasts(projection,offered,casts){
      for(const cast of casts){
      if(projection.movement&&choices.some(c=>c.skillId===offered.id&&c.castRank===cast.rank&&!c.movement&&skillEffectBranches(offered).every(branch=>{
        const scoped=skillForBranch(offered,branch),self=branch.nodes.some(n=>n.effectId==='target.self'),targets=self?[actor]:(isBeneficialSkill(scoped)?allies:enemies);
        return targets.every(u=>c.aiDecision.affectedTargetIds.includes(u.id));
      })))continue;
      if(aiWorkContext?.limited)continue;try{aiSpend('candidate');}catch{continue;}
      const skill={...effects.currentSoulRingCastSkill(state,actor,offered,cast.rank),...(offered._modeId?{_modeId:offered._modeId}:{})};
      const branches=skillEffectBranches(skill),parsedBranches=branches.map(branch=>{const scoped=skillForBranch(skill,branch);return {branch,scoped,beneficial:isBeneficialSkill(scoped),copyNode:scoped.effectGraph.nodes.find(node=>node.effectId==='copy.skillset'),approach:scoped.effectGraph.nodes.find(node=>node.effectId==='move.approach')};});
        if(cast.cost+avatarActivationLock(skill)>0&&controls.availableSoulPower(state,actor.id)-cast.cost-avatarActivationLock(skill)<reserve)continue;
        let score=0,expectedDamage=0,valid=true,hostile=false,copySourceUnitId='',effectDestination=null;
        const branchTargets={},affected=[];
        const payableBranchIds=branches.filter(branch=>!branch.optional).map(branch=>branch.id);
        for(const {branch,scoped,beneficial,copyNode,approach} of parsedBranches){
          let best=null;
          const groupTarget=beneficial&&branch.nodes.some(n=>n.effectId==='target.allies');
          for(const target of (groupTarget?[null,...allies]:(beneficial?allies:enemies))){
            if(branch.nodes.some(n=>n.effectId==='target.single'&&n.params.沿用首目标)&&target.id!==branchTargets[branches[0].id]?.targetIds?.[0])continue;
            if(!beneficial&&charmSources.has(target.id))continue;
            const intent=target?{targetIds:[target.id],aimPoint:unitPoint(target)}:{};
            const step=beneficial&&target?.id===projection.actor.id&&branch.nodes.find(n=>n.effectId==='move.step');
            if(step){const plan=aiStepPlan(projection.state,projection.actor,step);if(plan)intent.effectDestination=plan.destination;}
            if(copyNode&&options.shallow)continue;
            if(copyNode)intent.copySourceUnitId=aiCopyChoice(projection.state,projection.actor,scoped,target,copyNode).sourceUnitId;
            try{
              const targetIds=resolveTargets(projection.state,projection.actor,scoped,intent);
              if(!targetIds.length)continue;
              if(approach&&!approachPlan(projection.state,projection.actor,target,approach).reached)continue;
              let value=0,damage=0;
              for(const id of targetIds){const item=aiBranchValue(projection.state,projection.actor,scoped,projection.state.战斗单位.列表[id],cast.bonus/Math.max(1,skill.effectGraph.nodes.filter(n=>UPCAST_NUMERIC_EFFECTS.has(n.effectId)).length*targetIds.length),projection.cache);value+=item.score;if((beneficial&&id===strategy?.protectTargetId)||(!beneficial&&id===strategy?.focusTargetId))value+=Math.max(0,item.score)*.5;damage+=item.expectedDamage;}
              if(!best||value>best.score)best={intent,targetIds,score:value,damage};
            }catch{}
          }
          if(!best||branch.optional&&best.score<=0){if(branch.optional){branchTargets[branch.id]={enabled:false,targetIds:[]};continue;}valid=false;break;}
          if(branch.optional&&!tryQuoteSkillUse(projection.state,projection.actor,skill,{castRank:cast.rank,targetIds:[...affected,...best.targetIds],branchIds:[...payableBranchIds,branch.id]}).available){branchTargets[branch.id]={enabled:false,targetIds:[]};continue;}
          if(best.intent.copySourceUnitId){if(copySourceUnitId&&copySourceUnitId!==best.intent.copySourceUnitId){valid=false;break;}copySourceUnitId=best.intent.copySourceUnitId;}
          if(branch.optional)payableBranchIds.push(branch.id);
          if(best.intent.effectDestination)effectDestination=best.intent.effectDestination;
          branchTargets[branch.id]={targetIds:best.intent.targetIds,aimPoint:best.intent.aimPoint};affected.push(...best.targetIds);score+=best.score;expectedDamage+=best.damage;hostile ||= !beneficial;
        }
        if(!valid)continue;
        let selectedBranchIds;try{selectedBranchIds=selectedSkillBranches(skill,{branchTargets}).map(b=>b.id);}catch{continue;}
        if(!tryQuoteSkillUse(projection.state,projection.actor,skill,{castRank:cast.rank,targetIds:affected,branchIds:selectedBranchIds}).available)continue;
        const activeExecutions=parsedBranches.filter(v=>selectedBranchIds.includes(v.branch.id)).map(v=>({...v,targetIds:resolveTargets(projection.state,projection.actor,v.scoped,{...branchTargets[v.branch.id]})}));
        const applications=upcastApplicationCount(activeExecutions);score=0;expectedDamage=0;
        for(const entry of activeExecutions)for(const id of entry.targetIds){const value=aiBranchValue(projection.state,projection.actor,entry.scoped,projection.state.战斗单位.列表[id],cast.bonus/applications,projection.cache);score+=value.score;expectedDamage+=value.expectedDamage;}
        const available=Math.max(1,controls.availableSoulPower(state,actor.id));
        const cost=cast.cost+avatarActivationLock(skill,state,actor);
        // Mana has an opportunity cost, but saving it must not outweigh preventing a death.
        score-=cast.cost*resourceWeight+cost/available*25;
        if(projection.movement){
          const before=enemies.filter(unit=>combatDistance(actor,unit)<=1).length;
          const after=enemies.filter(unit=>combatDistance(projection.actor,unit)<=1).length;
          score-=2+Math.max(0,after-before)*(healthRatio<.5?35:8);
        }
        if(skill.effectGraph.nodes.some(n=>n.effectId==='payload.resource_endstate')){
          const victims=cleanList(affected).map(id=>projection.state.战斗单位.列表[id]).filter(u=>u&&!sameSide(projection.state,projection.actor,u));
          const finish=victims.length&&victims.every(u=>aiFinisherOdds(projection.state,projection.actor,skill,u,cast.bonus).probability>=.7);
          const incoming=aiIncoming(state,actor);
          if(!finish&&incoming<actor.资源.生命.当前)continue;
        }
        const first=branchTargets[branches[0]?.id]??{};
        choices.push({id:actionId,actorId,type:'技能',skillId:skill.id,...(skill._modeId?{modeId:skill._modeId}:{}),...first,branchTargets,...(effectDestination?{effectDestination}:{}),...(copySourceUnitId?{copySourceUnitId}:{}),...(cast.rank===undefined?{}:{castRank:cast.rank}),...(projection.movement?{movement:projection.movement}:{}),
          aiDecision:{policy:'strategic-utility-v3',mode:hostile?(projection.movement?'approach-and-attack':'offense'):(projection.movement?'approach-and-support':'support'),score,expectedDamage:Math.round(expectedDamage),affectedTargetIds:cleanList(affected)},cost});
      }
    }
    // A controlled opponent can leave combat only on their own legal turn. Check
    // both sides of that command before considering it as an AI action.
    for(const target of enemies){
      if(influence.pendingOrder(state,target.id)||!influence.authority(state,actorId,target.id,'战斗').available)continue;
      for(const type of ['认输','逃跑'])try{
        const projected=clone(state),order=influence.issueBattleOrder(projected,{id:`ai-control:${actionId}:${target.id}:${type}`,issuerId:actorId,actorId:target.id,intent:{type}});
        projected.战斗.当前行动单位ID=target.id;
        const forced=controlledAction(projected,target.id);if(!forced||forced.reason)continue;
        const score=1200+Math.max(0,target.资源.生命.当前)+(type==='认输'?200:0);
        choices.push({id:actionId,actorId,type:'控制命令',controlTargetId:target.id,controlledIntent:order.intent,cost:0,aiDecision:{policy:'strategic-utility-v3',mode:'control-opponent',score,expectedDamage:0,affectedTargetIds:[target.id]}});
        break;
      }catch{}
    }
    if(ordered?.mode==='focus'){
      const attack=choices.filter(c=>c.aiDecision.expectedDamage>0&&c.aiDecision.affectedTargetIds.includes(ordered.targetId)).sort((a,b)=>b.aiDecision.score-a.aiDecision.score)[0];
      if(attack)return attack;
      const movement=aiMovementToward(state,actor,state.战斗单位.列表[ordered.targetId]);
      return {id:actionId,actorId,type:'防御',...(movement?{movement}:{}),aiDecision:{policy:'summon-order',mode:'focus'}};
    }
    const immediate=aiEffectChain(state,actor,choices),postponeSummons=['conceal-before-combination','combine-prepared-charges','finish-opportunity'].includes(immediate?.aiDecision.mode);
    const summonPlans=new Map();
    for(const choice of postponeSummons?[]:choices){const skill=getSkill(state,actor,choice.skillId,choice.castRank);if(!skill?.effectGraph.nodes.some(n=>n.effectId==='summon.entity'&&n.params.继承能力))continue;
      if(activeParticipants(state).some(u=>u.扩展?.召唤?.来源单位ID===actor.id&&u.扩展.召唤.来源技能ID===skill.id))continue;
      const summonNode=skill.effectGraph.nodes.find(n=>n.effectId==='summon.entity'&&n.params.继承能力);
      if(summonNode.params.固定继承){const extra=Math.min(Number(summonNode.params.魂力分配??0),Math.max(0,controls.availableSoulPower(state,actor.id)-choice.cost-reserve));choice.summonSkillIds=summonCandidates(state,actor,summonNode.params,skill).slice(0,summonNode.params.技能继承数量).map(s=>s.id);choice.summonSoulPower=extra;choice.cost+=extra;choice.aiDecision.score-=extra*resourceWeight;continue;}
      const key=skill.id+':'+(choice.castRank??'');if(!summonPlans.has(key))try{summonPlans.set(key,bestSummonLoadout(state,actor,skill,{spend:kind=>aiSpend(kind==='simulate'?'action':'candidate')}));}catch{summonPlans.set(key,null);}
      const plan=summonPlans.get(key);if(plan?.summonSkillIds.length){choice.summonSkillIds=plan.summonSkillIds;choice.summonSoulPower=plan.summonSoulPower;choice.cost=plan.bodyTotalCost;choice.aiDecision.score=plan.score*8-choice.cost*resourceWeight;choice.aiDecision.summonPlan={plan:plan.plan,resourceGains:plan.resourceGains,contribution:plan.score,work:plan.diagnostic.work,limited:plan.diagnostic.limited};}
    }
    choices.sort((a,b)=>b.aiDecision.score-a.aiDecision.score||a.cost-b.cost||String(a.skillId??a.controlTargetId).localeCompare(String(b.skillId??b.controlTargetId)));
    if(options.candidates)return choices;
    const chain=aiEffectChain(state,actor,choices);
    const relevant=actor.能力.技能ID.some(id=>state.技能.列表[id]?.effectGraph.nodes.some(n=>['status.limited_followup','payload.resource_damage','status.invisibility','summon.entity','copy.skillset','modifier.next_skill'].includes(n.effectId)));
    const alternatives=new Set(choices.filter(c=>c.aiDecision.score>0).map(c=>aiIntentKey({...c,movement:null}))).size;
    const planned=chain??(relevant&&alternatives>1&&!aiWorkContext?.limited?aiPlan(state,actor,choices,actionId):null);
    if(planned)choices.unshift(planned);
    const limited=Boolean(aiWorkContext?.limited);aiWorkContext=null;
    for(const choice of choices){
      if(choice.aiDecision.score<=0&&!choice.aiDecision.plan)continue;
      try{if(!previewUncontrolledActionPrepared(projectionCore.fork(state).state,choice).ready)continue;const {cost,...intent}=choice;intent.aiDecision.score=Math.round(intent.aiDecision.score);return intent;}catch{}
    }
    // Exhausting optional planning is not a tactical decision to guard. Try
    // only the two innate attacks against at most two enemies, using the same
    // formal legality, range, damage and resource rules as a manual action.
    let limitedAttack=null;
    if(limited)for(const id of ['ordinary.attack',...(martialBaseSkill(actor)?['martial.base']:[])])for(const target of enemies.filter(unit=>!charmSources.has(unit.id)).slice(0,2)){
      const skill=getSkill(state,actor,id);if(!skill||skillBlockedByBattleRules(state,skill))continue;
      for(const movement of [null,aiMovementToward(state,actor,target)].filter((value,index)=>index===0||value))try{
        const projected=projectionCore.fork(state).state,intent={id:actionId,actorId,type:'技能',skillId:id,targetIds:[target.id],aimPoint:unitPoint(target),...(movement?{movement}:{})};
        const preview=previewUncontrolledActionPrepared(projected,intent),cost=Number(preview.soulPowerCost??0);
        if(!preview.ready||cost>0&&cost>controls.availableSoulPower(state,actorId)-reserve)continue;
        const damage=aiExpectedDamage(projected,projected.战斗单位.列表[actorId],skill,projected.战斗单位.列表[target.id]);
        if(damage>0&&(!limitedAttack||damage>limitedAttack.aiDecision.expectedDamage))limitedAttack={...intent,aiDecision:{policy:'strategic-utility-v3',mode:'limited-offense',expectedDamage:damage,affectedTargetIds:[target.id]}};
      }catch{/* The ordinary guard remains valid only when no innate attack is legal/effective. */}
    }
    if(limitedAttack){limitedAttack.aiDecision.expectedDamage=Math.round(limitedAttack.aiDecision.expectedDamage);return limitedAttack;}
    let safeMovement=aiMovementToward(state,actor,enemy);
    try{const projected=clone(state);moveUnit(projected,projected.战斗单位.列表[actor.id],safeMovement,{});}catch{safeMovement=null;}
    return {id:actionId,actorId,type:'防御',movement:safeMovement,aiDecision:{policy:'strategic-utility-v3',mode:'approach-and-guard',affectedTargetIds:[]}};
  }

  // Rank inherited contracts using actual copy fees and source-scoped resources.
function bestSummonLoadout(state,actor,sourceSkill,{maximumCandidates=6,horizon=3,spend:callback,workLimit=36}={}){
 let work=0,limited=false;
 function spend(kind){if(work>=workLimit){limited=true;return false;}try{if(callback?.(kind)===false){limited=true;return false;}}catch(error){if(error.code!=='ai-work-limit'&&!String(error.message).includes('work-limit'))throw error;limited=true;return false;}work++;return true;}
 const node=sourceSkill.effectGraph.nodes.find(n=>n.effectId==='summon.entity'&&n.params.继承能力);
 if(!node)return null;
 if(node.params.固定继承)return null;
 const params=node.params,limit=Math.min(2,Number(params.技能继承数量??0));if(!limit)return null;
 const skillQuote=quoteSkillUse(state,actor,sourceSkill,{targetIds:[actor.id]}),available=controls.availableSoulPower(state,actor.id)-skillQuote.totals.soulPower;
 const cap=summonSoulPowerAllocation(params,undefined,available),rounds=Math.min(horizon,Math.max(1,Number(params.持续回合??horizon)));
 const fork=projectionCore.fork(state),base=fork.state,receipt={id:'loadout-virtual-summon',actorId:actor.id,round:base.战斗.回合,targets:[],narrationFacts:[],statusEvents:[],traitEvents:[],errors:[]};
 // This is a legal zero-selection summon. It pays the real creation fee and
 // real transfer once; virtual inherited contracts below use actual deriveCopy.
 if(!spend('simulate'))return null;executeSkill(base,base.战斗单位.列表[actor.id],sourceSkill,{id:receipt.id,actorId:actor.id,type:'技能',skillId:sourceSkill.id,targetIds:[actor.id],summonSkillIds:[],summonSoulPower:cap},{die:()=>10},receipt);
 const virtual=Object.values(base.战斗单位.列表).find(u=>u.扩展?.召唤?.来源结算单ID===receipt.id);
 if(!virtual)return null;
 const enemies=activeParticipants(base).filter(u=>!sameSide(base,virtual,u));if(!enemies.length)return null;
 const legal=summonCandidates(state,actor,params,sourceSkill).filter(s=>!effects.soulRingCastRelease(effects.currentSoulRingCastSkill(state,actor,s)).reason).sort((a,b)=>a.id.localeCompare(b.id));
 const resourceMarginals=new Map();
 function poolRows(skill){return mechanics.descriptors(base,virtual,skill,(holder,source)=>poolSourceAllowed(base,holder,source));}
 function marginal(row){if(resourceMarginals.has(row.key))return resourceMarginals.get(row.key);let best=0;
  for(const source of mechanics.sources(base,row.holder,(holder,s)=>poolSourceAllowed(base,holder,s))){if(mechanics.scope(source)!==mechanics.scope(row.source)||!skillUsageAvailability(base,row.holder,source).available)continue;
   for(const consumer of source.effectGraph.nodes.filter(n=>n.effectId==='payload.resource_damage'&&n.params.资源槽===row.node.params.资源槽)){
    const p=consumer.params;if(Number(p.最大计入层数)<2)continue;
    const withValue=value=>({...base,战斗:{...base.战斗,扩展:{...base.战斗.扩展,通用战斗资源:{...base.战斗.扩展.通用战斗资源,[row.key]:{version:1,battleId:base.战斗.id,ownerId:row.holder.id,sourceSkillId:row.source.id,sourceHash:row.source.immutableHash??'',rules:row.node.params,value,lastActionId:'',events:{}}}}}});
    const first=withValue(1),second=withValue(2);
    for(const enemy of enemies)best=Math.max(best,aiCheckedDamage(second,second.战斗单位.列表[row.holder.id],source,second.战斗单位.列表[enemy.id])-aiCheckedDamage(first,first.战斗单位.列表[row.holder.id],source,first.战斗单位.列表[enemy.id]));
   }
  }resourceMarginals.set(row.key,Math.max(0,best));return Math.max(0,best);
 }
 const contracts=[];
 for(const [index,original]of legal.entries())try{
  if(!spend('contract'))break;
  const released=effects.currentSoulRingCastSkill(state,actor,original),copy=abilities.deriveCopy(released,{id:'loadout-copy-'+index,ownerId:virtual.id,kind:'summoned-copy',sourceUnitId:actor.id,castSkillId:sourceSkill.id,scale:Number(params.技能效果倍率??100),...(params.离散缩放?{discreteScale:params.离散缩放}:{})});
  base.技能.列表[copy.id]=copy;virtual.能力.技能ID.push(copy.id);virtual.扩展.召唤.继承技能ID列表.push(copy.id);
  let target=virtual,damage=0,normal=0,critical=0,chance={affected:1,damage:1,critical:0};
  const harmful=!isBeneficialSkill(copy);
  if(harmful){for(const enemy of enemies){const value=aiCheckedDamage(base,virtual,copy,enemy);if(value>damage||target===virtual){target=enemy;damage=value;}}chance=aiCheckChance(base,virtual,copy,target);normal=aiExpectedDamage(base,virtual,copy,target,{followups:false});critical=aiExpectedDamage(base,virtual,copy,target,{critical:true,followups:false});}
  let support=0,supportKey='';
  if(!harmful&&copy.effectGraph.nodes.some(n=>['payload.heal','payload.restore','payload.shield','payload.cleanse','payload.dispel','payload.revive','status.regeneration','status.buff','status.status_guard'].includes(n.effectId))){
    const supportOnly={...copy,effectGraph:{nodes:copy.effectGraph.nodes.filter(n=>/^(release|target|check)\./.test(n.effectId)||['payload.heal','payload.restore','payload.shield','payload.cleanse','payload.dispel','payload.revive','status.regeneration','status.buff','status.status_guard'].includes(n.effectId)),edges:[]}};
    const readCache=new Map();readCache.shallow=true;
    for(const ally of Object.values(base.战斗单位.列表).filter(u=>sameSide(base,virtual,u)&&isPresentParticipant(base,u.id))){if(!spend('support-target'))break;try{
      const ids=resolveTargets(base,virtual,copy,{targetIds:[ally.id],aimPoint:unitPoint(ally)}),value=ids.reduce((sum,id)=>sum+Math.max(0,aiBranchValue(base,virtual,supportOnly,base.战斗单位.列表[id],0,readCache).score),0)/8;
      if(value>support){support=value;target=ally;supportKey=ids.slice().sort().join('|');}
    }catch{}}
  }
  const quote=quoteSkillUse(base,virtual,copy,{targetIds:[target.id]}),usage=skillUsageAvailability(base,virtual,copy);
  if(!usage.available)continue;
  const pools=poolRows(copy).map(row=>({...row,value:mechanics.readPool(base,virtual,copy,row.node.params.资源槽,(holder,s)=>poolSourceAllowed(base,holder,s))?.value??0,marginal:marginal(row)}));
  let prepared=base;const prepReceipt={id:'loadout-prep-'+index,actorId:virtual.id,round:base.战斗.回合,targets:[],narrationFacts:[],statusEvents:[],traitEvents:[],errors:[]};
  let charge=null,invisibleState=null;
  if(copy.effectGraph.nodes.some(n=>n.effectId==='status.limited_followup'||n.effectId==='status.invisibility'))try{if(!spend('simulate'))break;prepared=projectionCore.fork(base).state;executeSkill(prepared,prepared.战斗单位.列表[virtual.id],copy,{id:prepReceipt.id,actorId:virtual.id,type:'技能',skillId:copy.id,targetIds:[virtual.id]},{die:()=>10},prepReceipt);charge=activeStatuses(prepared,virtual.id,'status.limited_followup').find(st=>st.扩展.作用来源===mechanics.scope(copy));if(copy.effectGraph.nodes.some(n=>n.effectId==='status.invisibility'))invisibleState=prepared;}catch{}
  contracts.push({original,copy,cost:quote.totals.soulPower,usage,target,normal,critical,chance,damage,support,supportKey,pools,charge,invisibleState,prepared,scope:mechanics.scope(copy),harmful});
 }catch{}
 // Keep dependency preparations as candidates using their formal charge damage
 // and actual consumer resource value. Presentation labels never enter a score.
 for(const row of contracts){let potential=row.damage+row.support;for(const n of row.copy.effectGraph.nodes){if(n.effectId==='status.limited_followup'&&row.charge)potential+=Math.max(0,...enemies.map(t=>aiChargeDamage(row.prepared,row.prepared.战斗单位.列表[virtual.id],t,row.charge,row.charge.层数)));for(const pool of row.pools)for(const rule of pool.node.params.事件规则)if(n.effectId==='status.limited_followup'&&rule.事件==='charges-created'&&rule.事件槽===n.params.事件槽)potential+=pool.marginal*Number(rule.数量==='实际'?n.params.层数:rule.数量);}row.preorder=potential/Math.max(1,row.cost);}
 contracts.sort((x,y)=>y.preorder-x.preorder||x.original.id.localeCompare(y.original.id));const candidates=contracts.slice(0,maximumCandidates),sets=[];
 for(let i=0;i<candidates.length;i++){sets.push([candidates[i]]);if(limit>1)for(let j=i+1;j<candidates.length;j++)sets.push([candidates[i],candidates[j]]);}
 function eventValue(row,confluence=0){let value=0;for(const pool of row.pools)for(const rule of pool.node.params.事件规则)for(const node of row.copy.effectGraph.nodes){const p=node.params??{};if(rule.事件槽!==p.事件槽)continue;const kind=node.effectId==='status.limited_followup'?'charges-created':node.effectId==='payload.stack_confluence'?'confluence':node.effectId==='payload.damage'?rule.事件:null;if(!kind||kind!==rule.事件)continue;const actual=kind==='charges-created'?p.层数:kind==='confluence'?confluence:1,probability=kind==='action-hit'?row.chance.affected:1;value+=Number(rule.数量==='实际'?actual:rule.数量)*probability*pool.marginal;}return value;}
 function rough(set){let value=0;for(const row of set){const uses=Math.min(rounds,row.cost>0?Math.floor(cap/row.cost):rounds,row.usage.perBattleRemaining??rounds,row.usage.dailyRemaining??rounds,Number(row.copy.cooldownTurns??0)>0?1:rounds);value=Math.max(value,uses*(row.damage+eventValue(row))+row.support);}for(const setup of set)for(const hit of set){if(!setup.charge||setup===hit||setup.scope!==hit.scope||setup.cost+hit.cost>cap)continue;const merge=hit.copy.effectGraph.nodes.find(n=>n.effectId==='payload.stack_confluence'&&n.params.资源槽===setup.charge.快照.参数.资源槽);if(!merge)continue;const count=Math.min(setup.charge.层数,merge.params.最大数量),normal=aiChargeDamage(setup.prepared,setup.prepared.战斗单位.列表[virtual.id],setup.prepared.战斗单位.列表[hit.target.id],setup.charge,count),critical=aiChargeDamage(setup.prepared,setup.prepared.战斗单位.列表[virtual.id],setup.prepared.战斗单位.列表[hit.target.id],setup.charge,count,{critical:true});value=Math.max(value,hit.damage+normal*(hit.chance.damage-hit.chance.critical)+critical*hit.chance.critical+eventValue(setup)+eventValue(hit,count));}return value;}
 // Ordering is a graph/cost read, not a projected action expansion. Each set
 // actually explored below and every summary-state expansion spends one unit.
 for(const set of sets)set.preorder=rough(set);sets.sort((a,b)=>b.preorder-a.preorder||a.length-b.length||a.map(x=>x.original.id).join('|').localeCompare(b.map(x=>x.original.id).join('|')));
 let best=null;const ranked=[];
 for(const set of sets){if(!spend('set'))break;let localBest=null;
  function visit(plan,sp,charges,invisible,gains,score,uses,supportGains=new Map(),prepaid=false){if(!prepaid&&!spend('visit'))return;const candidate={plan,spent:cap-sp,score,resourceGains:Object.fromEntries(gains),supportContributions:Object.fromEntries(supportGains)};if(!localBest||candidate.score>localBest.score||candidate.score===localBest.score&&candidate.spent<localBest.spent||candidate.score===localBest.score&&candidate.spent===localBest.spent&&candidate.plan.length<localBest.plan.length)localBest=candidate;if(plan.length>=rounds)return;
   // Passing represents a legal zero-cost fallback; movement and free anatomy
   // attacks are left to the real outer planner rather than fabricated here.
   if(plan.length)visit([...plan,{type:'pass',cost:0}],sp,charges,invisible,gains,score,uses,supportGains);
   for(const row of set){if(limited)break;if(row.cost>sp)continue;const key=row.usage.quotaOwnerId+':'+(row.copy.usageKey??row.copy.id),used=uses.get(key)??0;if(row.usage.perBattleRemaining!==null&&used>=row.usage.perBattleRemaining||row.usage.dailyRemaining!==null&&used>=row.usage.dailyRemaining||used>0&&Number(row.copy.cooldownTurns??0)>0)continue;if(!spend('visit'))break;
    const nextCharges=new Map(charges),nextGains=new Map(gains),nextSupport=new Map(supportGains),nextUses=new Map(uses);nextUses.set(key,used+1);let gain=0,nextInvisible=invisible;
    const stateForChance=invisible?.invisibleState??base,holder=stateForChance.战斗单位.列表[virtual.id],target=stateForChance.战斗单位.列表[row.target.id],chance=row.harmful?aiCheckChance(stateForChance,holder,row.copy,target):row.chance;
    gain+=row.harmful?row.normal*(chance.damage-chance.critical)+row.critical*chance.critical:0;
    // A conservative summary credits each recipient's current support deficit
    // once; subsequent real turns re-evaluate any newly received injury.
    if(row.support>0){const held=nextSupport.get(row.supportKey)??0,added=Math.max(0,row.support-held);gain+=added;nextSupport.set(row.supportKey,held+added);}
    const events=[],confluenceSlots=new Set();
    for(const node of row.copy.effectGraph.nodes){const p=node.params??{},slot=row.scope+':'+p.资源槽;
     if(node.effectId==='status.limited_followup'&&row.charge){nextCharges.set(slot,{row,count:row.charge.层数});events.push(['charges-created',p.事件槽,p.层数,1]);}
     if(node.effectId==='status.invisibility')nextInvisible=row;
     if(node.effectId==='payload.damage'&&p.事件槽){events.push(['action-release',p.事件槽,1,1],['action-hit',p.事件槽,1,chance.affected]);}
     if(node.effectId==='payload.stack_confluence'){confluenceSlots.add(slot);const stored=nextCharges.get(slot),count=Math.min(stored?.count??0,p.最大数量);if(count){const src=stored.row,normal=aiChargeDamage(src.prepared,src.prepared.战斗单位.列表[virtual.id],src.prepared.战斗单位.列表[row.target.id],src.charge,count),critical=aiChargeDamage(src.prepared,src.prepared.战斗单位.列表[virtual.id],src.prepared.战斗单位.列表[row.target.id],src.charge,count,{critical:true});gain+=normal*(chance.damage-chance.critical)+critical*chance.critical;nextCharges.set(slot,{...stored,count:stored.count-count});}events.push(['confluence',p.事件槽,count,1]);}
    }
    if(row.harmful&&row.copy.effectGraph.nodes.some(n=>['payload.damage','payload.drain','payload.resource_damage'].includes(n.effectId))&&row.copy.effectGraph.nodes.some(n=>n.family==='check'&&n.effectId!=='check.save'))for(const [slot,stored]of nextCharges){if(stored.row.scope!==row.scope||confluenceSlots.has(slot)||stored.count<1)continue;const src=stored.row,normal=aiChargeDamage(src.prepared,src.prepared.战斗单位.列表[virtual.id],src.prepared.战斗单位.列表[row.target.id],src.charge,1,{critical:false});gain+=normal*chance.affected;nextCharges.set(slot,{...stored,count:Math.max(0,stored.count-chance.affected)});}
    const seenEvents=new Set();for(const [kind,eventSlot,amount,probability]of events){const eventKey=kind+':'+eventSlot;if(seenEvents.has(eventKey))continue;seenEvents.add(eventKey);for(const pool of row.pools){const increment=pool.node.params.事件规则.filter(rule=>rule.事件===kind&&rule.事件槽===eventSlot).reduce((sum,rule)=>sum+Number(rule.数量==='实际'?amount:rule.数量),0)*probability,previous=nextGains.get(pool.key)??0,actual=Math.min(Math.max(0,pool.node.params.容量-pool.value-previous),increment);nextGains.set(pool.key,previous+actual);gain+=actual*pool.marginal;}}
    if(row.harmful)nextInvisible=null;
    visit([...plan,{type:'skill',skillId:row.original.id,cost:row.cost}],sp-row.cost,nextCharges,nextInvisible,nextGains,score+gain,new Map(nextUses),nextSupport,true);
   }
  }
  visit([],cap,new Map(),null,new Map(),0,new Map());
  if(!localBest)break;const effectivePlan=localBest.plan.filter(s=>s.type==='skill'),ordered=[...new Set(effectivePlan.map(s=>s.skillId))],result={...localBest,plan:effectivePlan,summonSkillIds:ordered,summonSoulPower:localBest.spent,maximumAllocation:cap,creationCost:skillQuote.totals.soulPower,bodyTotalCost:skillQuote.totals.soulPower+localBest.spent*Number(params.数量??1)};ranked.push(result);
  if(!best||result.score>best.score||result.score===best.score&&result.bodyTotalCost<best.bodyTotalCost||result.score===best.score&&result.bodyTotalCost===best.bodyTotalCost&&result.summonSkillIds.length<best.summonSkillIds.length)best=result;
 }
 ranked.sort((x,y)=>y.score-x.score||x.bodyTotalCost-y.bodyTotalCost);return best?{...best,ranked,diagnostic:{legal:legal.length,candidates:candidates.length,sets:sets.length,work,workLimit,limited,virtualUnitId:virtual.id,method:'formal-copy-quote-and-mechanism-summary',limits:'Three own turns; fixed source costs; cooldown repeats conservatively forbidden; no survival or enemy-reply claim. Outer formal planner must validate selected loadout.'}}:null;
}

  function aiEffectChain(state,actor,choices){
    const foes=activeParticipants(state).filter(u=>!sameSide(state,actor,u));if(!foes.length)return null;
    const chosen=(choice,mode,path=[])=>({...choice,aiDecision:{...choice.aiDecision,policy:'effect-chain-v1',mode,plan:path.length?path:[{skillId:choice.skillId,castRank:choice.castRank}]}});
    if(foes.length===1){const target=foes[0],finishes=choices.filter(c=>c.aiDecision.expectedDamage>=target.资源.生命.当前*.65&&c.aiDecision.affectedTargetIds.includes(target.id)).map(choice=>{const skill=getSkill(state,actor,choice.skillId,choice.castRank);return {choice,skill,odds:aiFinisherOdds(state,actor,skill,target,soulRingCastProfile(state,actor,skill,choice.castRank).upcastBonus).probability};}).filter(v=>v.odds>=.7);
      finishes.sort((a,b)=>Number(a.skill.effectGraph.nodes.some(n=>n.effectId==='payload.resource_endstate'))-Number(b.skill.effectGraph.nodes.some(n=>n.effectId==='payload.resource_endstate'))||b.odds-a.odds||a.choice.cost-b.choice.cost);
      if(finishes.length)return chosen(finishes[0].choice,'finish-opportunity');
    }
    const urgentAllies=new Set(activeParticipants(state).filter(u=>sameSide(state,actor,u)&&u.id!==actor.id&&u.资源.生命.当前/u.资源.生命.最大<.25).map(u=>u.id));
    if(choices.some(c=>c.aiDecision.score>0&&c.aiDecision.affectedTargetIds.some(id=>urgentAllies.has(id))&&getSkill(state,actor,c.skillId,c.castRank)?.effectGraph.nodes.some(n=>['payload.heal','payload.restore','payload.revive','payload.shield','payload.cleanse'].includes(n.effectId))))return null;
    const charged=choices.filter(c=>{const skill=getSkill(state,actor,c.skillId,c.castRank);return c.aiDecision.expectedDamage>0&&skill?.effectGraph.nodes.some(n=>n.effectId==='payload.stack_confluence'&&chargeSources(state,actor,skill,n.params.资源槽).length);}).sort((a,b)=>b.aiDecision.score-a.aiDecision.score||a.cost-b.cost);
    if(charged.length)return chosen(charged[0],'combine-prepared-charges');
    const pairs=[];
    for(const setup of choices){const source=getSkill(state,actor,setup.skillId,setup.castRank),node=source?.effectGraph.nodes.find(n=>n.effectId==='status.limited_followup');if(!node)continue;
      for(const attack of choices){const skill=getSkill(state,actor,attack.skillId,attack.castRank),merge=skill?.effectGraph.nodes.find(n=>n.effectId==='payload.stack_confluence'&&n.params.资源槽===node.params.资源槽);if(!merge||mechanics.scope(source)!==mechanics.scope(skill)||setup.cost+attack.cost>controls.availableSoulPower(state,actor.id)||attack.aiDecision.expectedDamage<=0)continue;
        pairs.push({setup,attack,source,node,value:attack.aiDecision.expectedDamage+Number(node.params.层数??1)*(Number(node.params.骰数??1)*(Number(node.params.骰面??4)+1)/2+Number(node.params.加值??0))});
      }
    }
    pairs.sort((a,b)=>b.value-a.value||a.setup.cost+a.attack.cost-b.setup.cost-b.attack.cost||aiIntentKey(a.setup).localeCompare(aiIntentKey(b.setup)));const pair=pairs[0];if(!pair)return null;
    const held=chargeSources(state,actor,pair.source,pair.node.params.资源槽).reduce((sum,s)=>sum+s.层数,0),incoming=aiIncoming(state,actor);
    if(held>0&&pair.attack.aiDecision.expectedDamage>0)return chosen(pair.attack,'combine-prepared-charges');
    if(actor.资源.生命.当前<=incoming*1.3)return null;
    const invisible=activeStatuses(state,actor.id,'status.invisibility').length>0;
    const prior=Object.values(state.战斗.扩展.已结算行动??{}).some(r=>r.actorId===actor.id);
    if(!prior&&!invisible){const conceal=choices.find(c=>{const node=getSkill(state,actor,c.skillId,c.castRank)?.effectGraph.nodes.find(n=>n.effectId==='status.invisibility');return node&&Number(node.params.持续回合??0)>=3&&c.cost+pair.setup.cost+pair.attack.cost<=controls.availableSoulPower(state,actor.id);});if(conceal&&actor.资源.生命.当前>incoming*2)return chosen(conceal,'conceal-before-combination',[{skillId:conceal.skillId,castRank:conceal.castRank},{skillId:pair.setup.skillId,castRank:pair.setup.castRank},{skillId:pair.attack.skillId,castRank:pair.attack.castRank}]);}
    if(invisible&&!actor.扩展?.召唤&&actor.资源.生命.当前>incoming*2.5&&foes.reduce((sum,u)=>sum+u.资源.生命.当前,0)>pair.attack.aiDecision.expectedDamage*1.75){
      const summon=choices.find(c=>c.aiDecision.summonPlan?.contribution>pair.attack.aiDecision.expectedDamage*.7&&c.cost+pair.setup.cost+pair.attack.cost<=controls.availableSoulPower(state,actor.id));
      if(summon)return chosen(summon,'summon-before-linked-setup',[{skillId:summon.skillId,castRank:summon.castRank},{skillId:pair.setup.skillId,castRank:pair.setup.castRank},{skillId:pair.attack.skillId,castRank:pair.attack.castRank}]);
    }
    if(invisible||actor.扩展?.召唤)return chosen(pair.setup,'prepare-linked-attack',[{skillId:pair.setup.skillId,castRank:pair.setup.castRank},{skillId:pair.attack.skillId,castRank:pair.attack.castRank}]);
    return null;
  }
  function aiIncoming(state,actor){return activeParticipants(state).filter(u=>!sameSide(state,actor,u)&&!actionImpairment(state,u.id).reason).reduce((sum,foe)=>sum+aiBestDirectOutput(state,foe,actor),0);}
  const aiIntentKey=choice=>JSON.stringify([choice.type,choice.skillId,choice.modeId,choice.castRank,choice.targetIds,choice.branchTargets,choice.movement,choice.effectDestination,choice.summonSkillIds,choice.summonSoulPower]);
  function aiShortlist(state,actor,choices,limit){
    choices=choices.filter(c=>c.aiDecision?.score>0);
    if(actor.资源.生命.当前<actor.资源.生命.最大*.3&&aiIncoming(state,actor)>=actor.资源.生命.当前){
      const finishers=choices.filter(c=>c.type==='技能'&&(c.aiDecision?.affectedTargetIds??[]).some(id=>{const target=state.战斗单位.列表[id];return target&&!sameSide(state,actor,target)&&aiFinisherOdds(state,actor,getSkill(state,actor,c.skillId,c.castRank),target,Number(soulRingCastProfile(state,actor,getSkill(state,actor,c.skillId,c.castRank),c.castRank).upcastBonus)).probability>=.7;}));
      if(finishers.length)choices=finishers;
    }

    const preparation=choice=>getSkill(state,actor,choice.skillId)?.effectGraph.nodes.some(n=>['status.invisibility','status.limited_followup','summon.entity','transform.martial_avatar','modifier.next_skill'].includes(n.effectId));
    const useful=choice=>{const skill=getSkill(state,actor,choice.skillId);return skill?.effectGraph.nodes.some(n=>{
      if(n.effectId==='status.invisibility')return !activeStatuses(state,actor.id,n.effectId).length;
      if(n.effectId==='status.limited_followup')return chargeSources(state,actor,skill,n.params.资源槽).reduce((s,v)=>s+v.层数,0)<n.params.层数;
      if(n.effectId==='transform.martial_avatar')return !activeMartialAvatar(state,actor.id);
      if(n.effectId==='summon.entity')return !activeParticipants(state).some(u=>u.扩展?.召唤?.来源单位ID===actor.id&&u.扩展.召唤.来源技能ID===skill.id);
      return n.effectId==='modifier.next_skill'&&!activeStatuses(state,actor.id,n.effectId).length;
    });};
    const unique=[],seen=new Set(),bestOutput=Math.max(0,...choices.filter(c=>c.aiDecision?.expectedDamage>0).map(c=>c.aiDecision.score));
    const add=choice=>{if(!choice)return;const key=aiIntentKey(choice);if(!seen.has(key)){seen.add(key);unique.push(choice);}};
    add(choices[0]);choices.filter(c=>preparation(c)&&useful(c)).forEach(add);
    choices.filter(c=>!preparation(c)&&(!(c.aiDecision?.expectedDamage>0)||c.aiDecision.score>=bestOutput*.6)).forEach(add);
    return unique.slice(0,limit);
  }
  function aiStructuralTemplates(state,actor){
    const result=[],allies=activeParticipants(state).filter(u=>sameSide(state,actor,u)),enemies=activeParticipants(state).filter(u=>!sameSide(state,actor,u));
    for(const id of cleanList(['ordinary.attack',...(actor.能力?.技能ID??[]),...(martialBaseSkill(actor)?['martial.base']:[])])){
      const raw=getSkill(state,actor,id);if(!raw||effects.skillActivation(raw.effectGraph)==='passive')continue;
      for(const mode of skillModes(raw))try{
        const profile=soulRingCastProfile(state,actor,mode),ranks=profile.enabled?[profile.selectedRank,...(mode.effectGraph.nodes.some(n=>UPCAST_NUMERIC_EFFECTS.has(n.effectId))?[profile.maximumRank]:[])]:[undefined];
        for(const rank of [...new Set(ranks)]){
          const skill=effects.currentSoulRingCastSkill(state,actor,mode,rank),branches=skillEffectBranches(skill),required=branches.filter(b=>!b.optional),sets=required.length?[required]:branches.map(b=>[b]);
          for(const selected of sets){const branchTargets={},affected=[];let valid=true;
            for(const branch of selected){const scoped=skillForBranch(skill,branch),beneficial=isBeneficialSkill(scoped),target=(beneficial?allies:enemies)[0];if(!target){valid=false;break;}branchTargets[branch.id]={targetIds:[target.id],aimPoint:unitPoint(target)};affected.push(target.id);}
            if(!valid)continue;
            for(const branch of branches)if(!selected.includes(branch))branchTargets[branch.id]={enabled:false,targetIds:[]};
            const first=branchTargets[selected[0].id];result.push({actorId:actor.id,type:'技能',skillId:skill.id,...(mode._modeId?{modeId:mode._modeId}:{}),...(rank===undefined?{}:{castRank:rank}),...first,branchTargets,cost:0,aiDecision:{score:0,expectedDamage:0,affectedTargetIds:cleanList(affected)}});
          }
        }
      }catch{}
    }
    return result;
  }
  function aiPreparationPotential(state,actorId){
    const actor=state.战斗单位.列表[actorId],foes=activeParticipants(state).filter(u=>!sameSide(state,actor,u));if(!actor||!foes.length)return 0;
    let potential=0;
    for(const status of activeStatuses(state,actorId,'status.limited_followup'))potential+=Math.max(0,...foes.map(target=>aiChargeDamage(state,actor,target,status,status.层数)));
    for(const source of mechanics.sources(state,actor,(holder,skill)=>poolSourceAllowed(state,holder,skill)))for(const node of source.effectGraph?.nodes??[])if(node.effectId==='payload.resource_damage'){
      const row=mechanics.readPool(state,actor,source,node.params.资源槽,(holder,skill)=>poolSourceAllowed(state,holder,skill));if(!row?.value)continue;
      const p=node.params,credited=Math.min(row.value,p.最大计入层数),increment={effectId:'payload.damage',params:{类型:p.类型,骰数:credited*Number(p.每层骰数??0),骰面:p.骰面??6,加值:credited*Number(p.每层加值??0),穿透档:p.穿透档??0}};
      potential+=Math.max(0,...foes.map(target=>aiNodeDamage(state,actor,effectiveOutputSkill(state,actorId,source),target,increment)));
    }
    return potential*6;
  }
  function aiPositionScore(state,initial,actorId){
    const actor=state.战斗单位.列表[actorId],friendly=unit=>sameSide(initial,initial.战斗单位.列表[actorId],unit);
    let score=0;
    for(const id of initial.战斗.参与者ID列表){const before=initial.战斗单位.列表[id],after=state.战斗单位.列表[id];if(!after)continue;
      const hp=unit=>Math.max(0,unit.资源.生命.当前)+Math.max(0,Number(unit.资源.生命.临时??0));
      const difference=hp(after)-hp(before);score+=difference*(friendly(before)?8:-8);
      if(friendly(before))score-=(before.资源.魂力.当前-after.资源.魂力.当前)*.7;
    }
    const foes=activeParticipants(state).filter(u=>!sameSide(state,actor,u));
    if(!foes.length)score+=10000;
    else if(!isActiveParticipant(state,actorId))score-=10000;
    return score;
  }
  function aiFutureChoices(state,actorId,budget){
    const actor=state.战斗单位.列表[actorId];if(!actor||!isActiveParticipant(state,actorId))return [];
    const forced=controlledAction(state,actorId);if(forced)return [forced.intent];
    const recovery=participationRecovery(state,actorId);if(recovery)return [recovery.intent];
    let templates=budget.templates.get(actorId);
    if(!templates){templates=aiStructuralTemplates(state,actor);budget.templates.set(actorId,templates);}
    const result=[],cache=new Map();cache.shallow=true;
    const templateKeys=new Set();
    for(const template of templates){const templateKey=aiIntentKey({...template,movement:null});if(templateKeys.has(templateKey))continue;templateKeys.add(templateKey);try{
      if(template.type!=='技能')continue;
      let skill=getSkill(state,actor,template.skillId,template.castRank);if(!skill)continue;
      if(template.modeId)skill=skillModes(skill).find(v=>v._modeId===template.modeId);if(!skill||skillBlockedByBattleRules(state,skill)||!skillUsageAvailability(state,actor,skill).available)continue;
      const branches=selectedSkillBranches(skill,template),branchIds=branches.map(b=>b.id),firstTarget=(template.aiDecision?.affectedTargetIds??[]).map(id=>state.战斗单位.列表[id]).find(u=>u?.存活状态==='存活');
      const movement=template.movement&&firstTarget?aiMovementToward(state,actor,firstTarget):null;
      const moved=movement?{...actor,位置:{...actor.位置,...movement}}:actor,projected=movement?{...state,战斗单位:{...state.战斗单位,列表:{...state.战斗单位.列表,[actorId]:moved}}}:state;
      const affected=[],branchTargets={};let score=0,damage=0;
      const applications=upcastApplicationCount(branches.map((branch,index)=>({branch,source:skill,targetIds:resolveTargets(projected,moved,skillForBranch(skill,branch),intentForBranch(template,branch,index,branches))})));
      const bonus=soulRingCastProfile(state,actor,skill,template.castRank).upcastBonus;
      for(const [index,branch]of branches.entries()){
        const scoped=skillForBranch(skill,branch),intent=intentForBranch(template,branch,index,branches),ids=resolveTargets(projected,moved,scoped,intent);if(!ids.length)throw Error('no-target');
        branchTargets[branch.id]={targetIds:intent.targetIds??[],...(intent.aimPoint?{aimPoint:intent.aimPoint}:{})};affected.push(...ids);
        for(const id of ids){const value=aiBranchValue(projected,moved,scoped,projected.战斗单位.列表[id],bonus/Math.max(1,applications),cache);score+=value.score;damage+=value.expectedDamage;}
      }
      const quote=tryQuoteSkillUse(projected,moved,skill,{castRank:template.castRank,modeId:template.modeId,branchIds,targetIds:affected});if(!quote.available)continue;
      const cost=quote.payment.totals.soulPower;if(controls.availableSoulPower(state,actorId)<cost+avatarActivationLock(skill))continue;
      score-=cost*.7;if(score<=0)continue;
      result.push({...template,movement,branchTargets,cost,aiDecision:{...template.aiDecision,score,expectedDamage:damage,affectedTargetIds:cleanList(affected)}});
    }catch{}}
    result.sort((a,b)=>b.aiDecision.score-a.aiDecision.score||a.cost-b.cost||aiIntentKey(a).localeCompare(aiIntentKey(b)));return result;
  }
  function aiSimulateTurn(base,choice,ownerId,budget,serial){
    const fork=projectionCore.fork(base),state=fork.state;
    const execute=intent=>{
      if(budget.used>=budget.limit)throw Error('planning-work-limit');aiSpend('action');budget.used++;
      aiReadSession?.delete(state);
      planningClocks.add(state);try{settleActionPrepared(state,{...intent,id:`ai-sample-${serial}-${budget.used}`,actorId:state.战斗.当前行动单位ID});}finally{planningClocks.delete(state);}
    };
    execute(choice);
    let replies=0;
    while(state.战斗.状态==='进行中'&&state.战斗.当前行动单位ID!==ownerId&&isActiveParticipant(state,ownerId)&&replies++<16){
      const id=state.战斗.当前行动单位ID;
      const candidates=controls.withReadIndex(state,()=>foundation.withBattleReadCache(state,()=>aiFutureChoices(state,id,budget)));
      const intent=Array.isArray(candidates)?candidates[0]:candidates;
      execute(intent??{type:'防御'});
    }
    if(state.战斗.状态==='进行中'&&state.战斗.当前行动单位ID!==ownerId&&isActiveParticipant(state,ownerId))throw Error('planning-reply-limit');
    return fork.finish();
  }
  function aiPlan(state,actor,choices,actionId){
    const started=Date.now(),budget={used:0,limit:24,templates:new Map([[actor.id,[...choices,...aiStructuralTemplates(state,actor)]]])},roots=aiShortlist(state,actor,choices,6);
    if(!roots.length)return null;
    const scenarios=[0].map(index=>{
      const fork=projectionCore.fork(state);fork.state.战斗.扩展.随机=makeRng(`mechanical-planning-scenario-${index}`).snapshot();return fork.finish();
    });
    let beam=[{states:scenarios,score:0,path:[],root:null}],best=null,lastFrontier=beam,serial=0;const failures=[];
    for(let depth=0;depth<3;depth++){
      const next=beam.filter(b=>b.root&&b.states.every(s=>s.战斗.状态!=='进行中'||!isActiveParticipant(s,actor.id)));
      for(const branch of beam){
        if(Date.now()-started>300||budget.used>=budget.limit)break;
        const sample=branch.states.find(s=>s.战斗.状态==='进行中'&&isActiveParticipant(s,actor.id));if(!sample)continue;
        const offered=depth===0?roots:controls.withReadIndex(sample,()=>foundation.withBattleReadCache(sample,()=>aiFutureChoices(sample,actor.id,budget)));
        const candidates=Array.isArray(offered)?(depth===0?offered:aiShortlist(sample,sample.战斗单位.列表[actor.id],offered,2)):[];
        for(const choice of candidates){
          if(Date.now()-started>300||budget.used>=budget.limit)break;
          try{
            const states=branch.states.map(base=>base.战斗.状态==='进行中'&&isActiveParticipant(base,actor.id)?aiSimulateTurn(base,choice,actor.id,budget,++serial):base);
            const score=states.reduce((sum,s)=>sum+aiPositionScore(s,state,actor.id),0)/states.length;
            const entry={states,score,path:[...branch.path,{skillId:choice.skillId,castRank:choice.castRank}],root:branch.root??choice};next.push(entry);
            if(!best||entry.path.length>best.path.length||entry.path.length===best.path.length&&score>best.score)best=entry;
          }catch(error){if(failures.length<6)failures.push(String(error.message));}
        }
      }
      if(!next.length)break;
      for(const entry of next)entry.rank=entry.score+entry.states.reduce((sum,s)=>sum+aiPreparationPotential(s,actor.id),0)/entry.states.length;
      next.sort((a,b)=>b.rank-a.rank||aiIntentKey(a.root).localeCompare(aiIntentKey(b.root)));
      beam=next.slice(0,2);lastFrontier=beam;
      if(beam.every(b=>b.states.every(s=>s.战斗.状态!=='进行中'||!isActiveParticipant(s,actor.id))))break;
    }
    best=lastFrontier[0];if(!best?.root)return {...choices[0],aiDecision:{...choices[0].aiDecision,planning:{evaluations:budget.used,failures}}};
    return {...best.root,aiDecision:{...best.root.aiDecision,policy:'bounded-mechanic-planning-v2',score:Math.round(best.score),plan:best.path,planning:{evaluations:budget.used,maximumEvaluations:budget.limit,depth:3,scenarios:1,elapsedMs:Date.now()-started,truncated:budget.used>=budget.limit||Date.now()-started>300}}};
  }

  function defaultPayableSkill(state,actor,skill,modeId){
    if(!isSoulRingSkill(skill)||effects.skillActivation(skill.effectGraph)==='passive')return skill;
    try{
      const options=soulRingCastOptions(state,actor,{...skill,_modeId:modeId});
      const preferred=skill.castOrigin?.rank??soulRingCastProfile(state,actor,skill).selectedRank;
      const selected=options.find(option=>option.rank===preferred&&option.affordable)??options.filter(option=>option.affordable).at(-1);
      return selected?{...effects.currentSoulRingCastSkill(state,actor,skill,selected.rank),...(modeId?{_modeId:modeId}:{})}:skill;
    }catch{return skill;}
  }

  function listAvailableActions(rawState, actorId) {return listAvailableActionsPrepared(foundation.normalizeState(rawState),actorId);}
  function listCurrentActions(state,actorId,sealed) {
    if(!sealed?.(state))return listAvailableActions(state,actorId);
    return listAvailableActionsPrepared(projectionCore.fork(state,sealed).state,actorId);
  }
  /** One synchronous observation, one private normalized world. The reader
   * cannot escape its scope or expose the prepared world to its caller. */
  function withAvailableActionsRead(rawState, read) {
    const state=foundation.normalizeState(rawState),actionsByActor=new Map();let active=true;
    try{return controls.withReadIndex(state,()=>{
      const result=read(actorId=>{
        if(!active)throw Error('行动读取范围已经结束');
        if(!actionsByActor.has(actorId))actionsByActor.set(actorId,listAvailableActionsPrepared(state,actorId));
        return structuredClone(actionsByActor.get(actorId));
      });
      if(result&&typeof result.then==='function')throw Error('行动读取范围必须同步完成');
      return result;
    });}finally{active=false;}
  }
  function disguiseTactics(state,actorId,reason=''){
    if(state.战斗?.状态!=='进行中'||!isActiveParticipant(state,actorId))return [];
    const out=[];for(const status of Object.values(state.状态实例?.列表??{}).filter(r=>r.模板ID==='transform.disguise'&&r.来源.单位ID===actorId))out.push({id:'tactic:disguise-dismiss:'+status.id,name:'解除伪装',actionType:'解除伪装',sourceKind:'tactic',statusId:status.id,description:'消耗主行动解除这次伪装',available:!reason,reason});
    for(const targetId of state.战斗.参与者ID列表??[])if(targetId!==actorId&&isActiveParticipant(state,targetId))for(const method of ['visual','contact']){try{globalThis.SoulDisguise.quote(state,{type:'inspect-disguise',actorId,targetId,method});out.push({id:'tactic:disguise-inspect:'+method+':'+targetId,name:(method==='contact'?'触感检查·':'辨认·')+state.战斗单位.列表[targetId].名称,actionType:'识破伪装',sourceKind:'tactic',targetId,method,description:'消耗主行动检查外貌，识破不自动解除',available:!reason,reason});}catch{}}
    return out;
  }

  function listActionIndexPrepared(state,actorId){
    const actor=state.战斗单位.列表[actorId];if(!actor)return [];
    const ids=cleanList(['ordinary.attack',...(martialBaseSkill(actor)?['martial.base']:[]),...(actor.能力.技能ID??[])]);
    const skills=ids.map(id=>getSkill(state,actor,id)).filter(skill=>skill&&effects.skillActivation(skill.effectGraph)!=='passive').map(skill=>({
      id:skill.id,name:skill.name??skill.名称??skill.id,actionType:'技能',sourceKind:skill.sourceKind??(skill.来源魂环ID?'soul-ring':'martial-skill'),...skillSourcePresentation(state,skill),
      castModes:(skill.castModes??[]).map(mode=>({id:mode.id,name:mode.name??mode.id})),defaultCastMode:skill.defaultCastMode??null,
      nativeCastRank:isSoulRingSkill(skill)?nativeSoulRingRank(state,skill):0,maximumCastRank:isSoulRingSkill(skill)?Math.min(controls.maximumCastRank(state,actorId),Math.max(nativeSoulRingRank(state,skill),...foundation.ownedMartialSoulIds(state,actorId).map(id=>state.武魂.列表[id].魂环ID列表.length))):0,
      branches:skillEffectBranches(skill).map(branch=>{const node=branch.nodes.find(n=>n.family==='targeting'),release=branch.nodes.find(n=>n.family==='release'),selectionMode=node?.params?.选择模式??'主目标',mode=targetingMode(node);return {id:branch.id,label:branch.label,optional:branch.optional,targetPolicy:branch.targetPolicy,targeting:{mode,selectionMode,geometry:targetGeometry(release,node),needsPrimaryTarget:selectionMode==='主目标'&&mode==='unit',needsAim:selectionMode==='主目标'&&['point','direction'].includes(mode)}};})
    }));
    const tactics=[['defend','防御','防御'],['move','移动','放弃行动'],['pass','结束回合','放弃行动'],['escape','撤离战斗','逃跑'],['assist','协助撤退','协助撤退'],['surrender','认输','认输'],['restrain-desire','克制欲火','克制'],['retract-soul','收回武魂','收回武魂']].map(([id,name,actionType])=>({id:'tactic:'+id,name,actionType,sourceKind:'tactic'}));
    tactics.push(...disguiseTactics(state,actorId));
    for(const status of controls.breakable(state,actorId))tactics.push({id:'tactic:break-free:'+status.id,name:'挣脱',actionType:'挣脱',sourceKind:'tactic',statusId:status.id});
    for(const entry of Object.values(state.扩展?.abilityMaintenance??{}).filter(e=>e.actorId===actorId&&e.battleId===state.战斗.id))tactics.push({id:'tactic:stop:'+entry.id,name:'停止维持',actionType:'停止维持',sourceKind:'tactic',maintenanceSourceId:entry.id});
    tactics.find(t=>t.id==='tactic:move').movementInput={距离区:ZONES,站位簇:actor.位置.站位簇,战场坐标:'可选{x,y}',冲刺:'可选boolean',walk:movementAllowance(state,actor),dash:movementAllowance(state,actor,true)};
    if(activeMartialAvatar(state,actorId))tactics.push({id:'tactic:end-avatar',name:'结束武魂真身',actionType:'结束武魂真身',sourceKind:'tactic'});
    for(const targetId of state.战斗.参与者ID列表??[])if(targetId!==actorId&&isActiveParticipant(state,targetId)&&influence.authority(state,actorId,targetId,'战斗').available)for(const type of ['防御','放弃行动'])tactics.push({id:`tactic:command:${targetId}:${type}`,name:`命令${state.战斗单位.列表[targetId].名称}`,actionType:'控制命令',sourceKind:'tactic',controlTargetId:targetId,controlledIntent:{type}});
    for(const item of Object.values(state.物品?.实例??{})){
      if(item.templateId==='seal-platform'&&item.durability>0){try{globalThis.SoulSealingCore.quoteStrike(state,actorId,item.id,state.战斗.id);tactics.push({id:'tactic:strike-seal:'+item.id,name:'破坏封神台',actionType:'破坏封神台',sourceKind:'tactic',itemId:item.id});}catch{}}
      if(item.attachment?.controllers.includes(actorId)&&custody.resolveDevice(item)?.modes.limited&&(state.战斗.参与者ID列表??[]).includes(item.attachment.wearerId))tactics.push({id:'tactic:restraint:'+item.id,name:'调节'+item.name,actionType:'调节拘束',sourceKind:'tactic',itemId:item.id,restraint:{targetId:item.attachment.wearerId,modes:Object.keys(custody.resolveDevice(item).modes)}});
    }
    const activeSoulId=foundation.activeMartialSoulId(state,actorId),switches=foundation.ownedMartialSoulIds(state,actorId).filter(id=>id!==activeSoulId).map(id=>({id:'switch:'+id,name:'切换：'+state.武魂.列表[id].名称,actionType:'切换武魂',sourceKind:'martial-switch',sourceMartialSoulId:id}));
    return [...skills,...switches,...tactics];
  }

  function listAvailableActionsPrepared(state, actorId) {
    const actor = state.战斗单位.列表[actorId];
    if (!actor) return [];
    const recovery=participationRecovery(state,actorId);if(recovery)return listTacticalActions(state,actorId);
    const ids = cleanList(['ordinary.attack', ...(martialBaseSkill(actor) ? ['martial.base'] : []), ...(actor.能力.技能ID ?? [])]);
    const activeSoulId = foundation.activeMartialSoulId(state, actorId);
    const skillActions = ids.map(id => getSkill(state, actor, id)).filter(skill => skill && effects.skillActivation(skill.effectGraph) !== 'passive').map(originalSkill => {
      let skill=defaultPayableSkill(state,actor,originalSkill);
      let available = true;
      let reason = '';
      let castProfile={enabled:false,nativeRank:0,selectedRank:0,maximumRank:0,upcastBonus:0},castReason='';
      try{castProfile=soulRingCastProfile(state,actor,skill);}catch(error){castReason=error.message;if(isSoulRingSkill(skill))castProfile.nativeRank=nativeSoulRingRank(state,skill);}
      const modeOptions=(skill.castModes??[]).map(mode=>({id:mode.id,name:mode.name??mode.id,...skillCastAvailability(state,actor,defaultPayableSkill(state,actor,originalSkill,mode.id),{modeId:mode.id})}));
      const selectedModeId=modeOptions.find(mode=>mode.id===skill.defaultCastMode&&mode.available)?.id??modeOptions.find(mode=>mode.available)?.id??skill.defaultCastMode;
      skill=defaultPayableSkill(state,actor,originalSkill,selectedModeId);
      try{castProfile=soulRingCastProfile(state,actor,skill);}catch{}
      const castOptions = castReason?[]:soulRingCastOptions(state,actor,{...skill,_modeId:selectedModeId});
      const usage = skillUsageAvailability(state,actor,skill);
      const quoted=skillCastAvailability(state,actor,skill,{modeId:selectedModeId});
      let displayedSoulPowerCost=quoted.payment?.totals.soulPower??null;
      if(displayedSoulPowerCost===null)try{displayedSoulPowerCost=effectiveSoulPowerCost(state,actor,skill);}catch{}
      try {
        if(castReason)throw Error(castReason);
        if (skill.持有者单位ID && skill.持有者单位ID !== actor.id) throw new Error('行动不属于当前角色');
        if (skillBlockedByBattleRules(state, skill)) throw new Error('地狱杀戮场封禁魂环魂技');
        validateSkillSpecialRequirements(state, actor, skill);
        externalSourceItem(state, actor, skill);
        if(!quoted.available)throw Error(quoted.reason);
        if (!usage.available) throw new Error(usage.reason);
      } catch (error) {
        available = false;
        reason = String(error?.message ?? error);
      }
      const sourceKind = skill.sourceKind ?? (skill.来源魂环ID ? 'soul-ring' : skill.ownerKind === '魂兽' ? 'beast' : 'martial-skill');
      const item = skill.sourceItemId ? state.物品?.实例?.[skill.sourceItemId] : null;
      const effectBranches = skillEffectBranches(skill).map(branch => ({
        id:branch.id,
        label:branch.label,
        optional:branch.optional,
        targetPolicy:branch.targetPolicy,
        effectSpecs:branch.nodes.map(node => [node.effectId,clone(node.params ?? {})])
      }));
      return {
        id: skill.id,
        name: skill.name ?? skill.名称 ?? skill.id,
        actionType: '技能',
        sourceKind,
        ...skillSourcePresentation(state, skill),
        activeMartialSoulId: activeSoulId,
        beneficial: isBeneficialSkill(skill),
        soulPowerCost:displayedSoulPowerCost,
        payment:quoted.payment,
        requirements:clone(skill.requirements??[]),resourceCosts:clone(skill.resourceCosts??[]),castModes:clone(skill.castModes??[]),defaultCastMode:selectedModeId,modeOptions,defaultBranchIds:quoted.branchIds,
        nativeCastRank: castProfile.nativeRank,
        currentCastRank:castProfile.selectedRank,castRelease:effects.soulRingCastRelease(skill),
        maximumCastRank: castProfile.maximumRank,
        castOptions,
        activationLock: avatarActivationLock(skill,state,actor),
        effectSpecs: skillEffectBranches(skill).flatMap(branch=>branch.nodes).map(node => [node.effectId, clone(node.params ?? {})]),
        effectBranches,
        effectBudget:clone(skill.budget ?? skill.扩展?.预算 ?? skill.value ?? null),
        cooldownRemaining:Math.max(usage.cooldownRemaining,item?externalCooldownRemaining(state,item,skill):0),
        disposable: ['hidden-weapon','consumable'].includes(sourceKind),
        usageRules: clone(usage.rules),
        perBattleUsed: usage.perBattleUsed,
        perBattleRemaining: usage.perBattleRemaining,
        perBattleGroupUsed: usage.perBattleGroupUsed,
        perBattleGroupRemaining: usage.perBattleGroupRemaining,
        dailyUsed: usage.dailyUsed,
        dailyRemaining: usage.dailyRemaining,
        available,
        reason
      };
    });
    const switchActions = foundation.ownedMartialSoulIds(state, actorId)
      .filter(soulId => soulId !== activeSoulId)
      .map(soulId => ({
        id: `switch:${soulId}`,
        name: `切换：${state.武魂.列表[soulId].名称}`,
        actionType: '切换武魂',
        sourceKind: 'martial-switch',
        sourceMartialSoulId: soulId,
        sourceMartialSoulName: state.武魂.列表[soulId].名称,
        activeMartialSoulId: activeSoulId,
        beneficial: true,
        soulPowerCost: 0,
        activationLock: 0,
        effectSpecs: [],
        cooldownRemaining: 0,
        available: !activeMartialAvatar(state, actorId)&&!controls.actionReason(state,actorId,'switch-soul',{soulId}),
        reason: activeMartialAvatar(state, actorId) ? '武魂真身持续期间不能切换武魂' : controls.actionReason(state,actorId,'switch-soul',{soulId})||'消耗本回合主行动'
      }));
    const basicActions = skillActions.filter(action => ['ordinary','martial-base'].includes(action.sourceKind));
    const learnedActions = skillActions.filter(action => !['ordinary','martial-base'].includes(action.sourceKind));
    const impairment = actionImpairment(state,actorId);
    return [...basicActions, ...switchActions, ...learnedActions].map(action=>impairment.reason
      ? {...action,available:false,reason:`当前因${impairment.reason}无法采取主行动`} : action);
  }

  const LLM_COMBAT_POLICY = Object.freeze({
    id: 'llm-proposal-v1',
    defaultEnabled: false,
    defaultCharacterIds: Object.freeze([]),
    allowedActionTypes: Object.freeze(['技能','切换武魂','收回武魂','克制','防御','逃跑','挣脱','协助撤退','结束武魂真身','放弃行动'])
  });
  const LLM_DECISION_KEYS = Object.freeze(['aimPoint','martialSoulId','movement','reason','skillId','sourceUnitId','targetIds','type']);

  function compactLlmBattleSnapshot(rawState, actorId) {
    const state = foundation.normalizeState(clone(rawState));
    if (state.战斗.当前行动单位ID !== actorId) throw new Error('LLM战斗快照只允许当前行动单位');
    const actor = state.战斗单位.列表[actorId];
    if (!actor || !isActiveParticipant(state, actorId)) throw new Error('LLM战斗快照的行动者无效');
    const member = battleMember(state, actorId);
    const units = state.战斗.参与者ID列表.map(id => {
      const unit = state.战斗单位.列表[id];
      const unitMember = battleMember(state, id);
      return {
        id, name: unit?.名称 ?? id,
        relation: id === actorId ? 'self' : sameSide(state, actor, unit) ? 'ally' : 'enemy',
        status: unitMember?.status ?? 'unknown', lifeState: unit?.存活状态 ?? '未知',
        level: Number(unit?.派生?.有效等级 ?? 0),
        hp: [Number(unit?.资源?.生命?.当前 ?? 0), Number(unit?.资源?.生命?.最大 ?? 0), Number(unit?.资源?.生命?.临时 ?? 0)],
        sp: [Number(unit?.资源?.魂力?.当前 ?? 0), Number(unit?.资源?.魂力?.最大 ?? 0), Number(unit?.资源?.魂力?.锁定 ?? 0)],
        position: {
          zone: unit?.位置?.距离区 ?? '', cluster: unit?.位置?.站位簇 ?? '', point: unitPoint(unit),
          engagedUnitIds: cleanList(unit?.位置?.接战单位ID)
        },
        defenses: foundation.defenseSources(state,unit).map(source=>({effectId:source.effectId,params:clone(source.params),source:source.name,temporary:source.kind==='temporary'})),
        statuses: listStatusViews(state,id).map(item => ({
          id:item.effectId,instanceId:item.instanceId,stacks:item.layers,remainingRounds:item.remainingRounds,
          sourceUnitId:item.sourceUnitId,sourceSkillId:item.sourceSkillId,usesRemaining:item.usesRemaining,
          params:clone(item.params)
        }))
      };
    });
    const specialActions = ['防御','协助撤退','放弃行动'];
    if (canFlee(state,actorId)) specialActions.push('逃跑');
    if (controls.breakable(state,actorId).length) specialActions.push('挣脱');
    if (activeMartialAvatar(state, actorId)) specialActions.push('结束武魂真身');
    const recovery=participationRecovery(state,actorId);if(recovery)specialActions.splice(0,specialActions.length,recovery.intent.type);
    const movementOptions=[];
    for(const zone of recovery?[]:ZONES)for(const dash of [false,true]){
      const movement={距离区:zone,站位簇:actor.位置.站位簇,冲刺:dash};
      try{moveUnit(state,clone(actor),movement,{});movementOptions.push({zone,cluster:actor.位置.站位簇,point:null,dash});}catch{}
    }
    return {
      schema: 'soul-combat-llm-snapshot-v2', battleId: state.战斗.id, round: state.战斗.回合,
      objective: state.战斗.扩展?.战斗目标 ?? '击败敌对队伍', actorId,
      actorCharacterId: actor.扩展?.角色库ID ?? '', morale: Number(member?.morale ?? 50),
      rules: clone(state.战斗.扩展?.规则 ?? {}), units,movementOptions,
      battleResources:battleResourceView(state,actorId),
      martialSouls:foundation.ownedMartialSoulIds(state,actorId).map(id=>({id,name:state.武魂.列表[id]?.名称,active:id===foundation.activeMartialSoulId(state,actorId)})),
      zones: Object.values(state.战斗.扩展?.区域效果 ?? {}).filter(item => item.状态 !== '已结束').map(item => ({
        id:item.id, type:item.类型, sourceUnitId:item.来源?.单位ID ?? '', zone:item.距离区,
        cluster:item.站位簇, remainingRounds:Number(item.剩余回合 ?? 0), params:clone(item.参数 ?? {})
      })),
      domains: Object.values(state.战斗.扩展?.领域实例 ?? {}).map(item => ({
        id:item.id, sourceUnitId:item.来源?.单位ID ?? '', state:item.状态, center:clone(item.中心 ?? {}),
        radius:Number(item.半径区 ?? 0), strength:Number(item.强度 ?? 0), remainingRounds:Number(item.剩余回合 ?? 0),
        suppressorIds:cleanList(item.压制者ID列表), params:clone(item.参数 ?? {})
      })),
      // Martial-soul switches are described by martialSouls, not skill targeting.
      actions: listAvailableActionsPrepared(state, actorId).filter(item => item.available && item.actionType === '技能').map(item => {
        const skill=getSkill(state,actor,item.id),selected=skillEffectBranches(skill).filter(branch=>item.defaultBranchIds.includes(branch.id));
        return {id:item.id,name:item.name,actionType:item.actionType,sourceKind:item.sourceKind,
          sourceMartialSoulId:item.sourceMartialSoulId,beneficial:selected.every(branch=>isBeneficialSkill(skillForBranch(skill,branch))),
          modeId:item.defaultCastMode??null,branchIds:clone(item.defaultBranchIds),
          soulPowerCost:item.soulPowerCost,activationLock:item.activationLock,effects:selected.flatMap(branch=>branch.nodes.map(node=>[node.effectId,clone(node.params??{})])),
          targeting:targetPreviewChoices(state,actor,skillForBranch(skill,selected[0]))};
      }),
      specialActions
    };
  }

  function buildLlmBattleRequest(rawState, actorId) {
    const snapshot = compactLlmBattleSnapshot(rawState, actorId);
    const responseContract = {
      type: '技能|切换武魂|防御|逃跑|挣脱|协助撤退|结束武魂真身|放弃行动',
      skillId: '技能ID或空字符串', martialSoulId: '切换目标武魂ID或空字符串', targetIds: ['至多一个主目标ID'],
      sourceUnitId: '仅copy.skillset技能填写复制来源单位ID，否则为空字符串',
      aimPoint: 'null或{x:0至100,y:0至100}',
      movement: 'null或{zone:接触|近距|中距|远距|极远,cluster:string,point:null或{x,y},dash:boolean}',
      reason: '不超过160字的战术理由'
    };
    return {
      snapshot, responseContract,
      messages: {
        system: '你是斗罗战斗的单回合战术规划器。你只能从快照中的合法ID提出一个行动，不能改状态、编造技能或决定结算。优先胜负目标、存活、控制收益、友伤规避、资源效率和后续回合价值。代码会重新验证并结算。只输出一个严格JSON对象，字段必须与契约完全一致，不要Markdown或额外文字。',
        user: `为当前行动者选择本回合行动。响应契约：${JSON.stringify(responseContract)}\n战斗快照：${JSON.stringify(snapshot)}`
      }
    };
  }

  function parseLlmBattleDecision(value) {
    const text = typeof value === 'string' ? value.trim() : typeof value?.content === 'string' ? value.content.trim() : '';
    if (!text.startsWith('{') || !text.endsWith('}')) throw new Error('LLM行动不是纯JSON对象');
    const decision = JSON.parse(text);
    if (!decision || typeof decision !== 'object' || Array.isArray(decision)) throw new Error('LLM行动必须是JSON对象');
    const keys = Object.keys(decision).sort();
    if (JSON.stringify(keys) !== JSON.stringify([...LLM_DECISION_KEYS].sort())) throw new Error('LLM行动字段不符合白名单');
    if (!LLM_COMBAT_POLICY.allowedActionTypes.includes(decision.type)) throw new Error('LLM行动类型未登记');
    if (typeof decision.skillId !== 'string' || typeof decision.martialSoulId !== 'string' || typeof decision.sourceUnitId !== 'string' || typeof decision.reason !== 'string' || decision.reason.length > 160) throw new Error('LLM行动文本字段非法');
    if (!Array.isArray(decision.targetIds) || decision.targetIds.length > 1 || decision.targetIds.some(id => typeof id !== 'string' || !id)) throw new Error('LLM主目标列表非法');
    if (decision.aimPoint !== null && (JSON.stringify(Object.keys(decision.aimPoint ?? {}).sort()) !== JSON.stringify(['x','y']) || !Number.isFinite(Number(decision.aimPoint?.x)) || !Number.isFinite(Number(decision.aimPoint?.y)) || Number(decision.aimPoint.x) < 0 || Number(decision.aimPoint.x) > 100 || Number(decision.aimPoint.y) < 0 || Number(decision.aimPoint.y) > 100)) throw new Error('LLM落点非法');
    if (decision.movement !== null) {
      const movementKeys = Object.keys(decision.movement ?? {}).sort();
      if (JSON.stringify(movementKeys) !== JSON.stringify(['cluster','dash','point','zone'])) throw new Error('LLM移动字段不符合白名单');
      if (!ZONES.includes(decision.movement.zone) || typeof decision.movement.cluster !== 'string' || typeof decision.movement.dash !== 'boolean') throw new Error('LLM移动参数非法');
      if (decision.movement.point !== null && (JSON.stringify(Object.keys(decision.movement.point ?? {}).sort()) !== JSON.stringify(['x','y']) || !Number.isFinite(Number(decision.movement.point?.x)) || !Number.isFinite(Number(decision.movement.point?.y)) || Number(decision.movement.point.x) < 0 || Number(decision.movement.point.x) > 100 || Number(decision.movement.point.y) < 0 || Number(decision.movement.point.y) > 100)) throw new Error('LLM移动坐标非法');
    }
    if (decision.type === '技能' && (!decision.skillId || decision.martialSoulId)) throw new Error('LLM技能选择缺少技能ID');
    if (decision.type === '切换武魂' && (!decision.martialSoulId || decision.skillId)) throw new Error('LLM切换武魂选择非法');
    if (!['技能','切换武魂'].includes(decision.type) && (decision.skillId || decision.martialSoulId || decision.sourceUnitId || decision.targetIds.length || decision.aimPoint !== null)) throw new Error('LLM基础行动携带了多余选择');
    if (decision.type === '切换武魂' && decision.sourceUnitId) throw new Error('LLM切换武魂携带了复制来源');
    return clone(decision);
  }

  function llmDecisionToIntent(state, actorId, actionId, decision) {
    const intent = {
      id: actionId, actorId, type: decision.type,
      ...(decision.skillId ? {skillId:decision.skillId} : {}),
      ...(decision.martialSoulId ? {martialSoulId:decision.martialSoulId} : {}),
      ...(decision.sourceUnitId ? {copySourceUnitId:decision.sourceUnitId} : {}),
      ...(decision.targetIds.length ? {targetIds:cleanList(decision.targetIds)} : {}),
      ...(decision.aimPoint ? {aimPoint:battlePoint(decision.aimPoint)} : {}),
      ...(decision.movement ? {movement:{距离区:decision.movement.zone,站位簇:decision.movement.cluster,冲刺:decision.movement.dash,...(decision.movement.point ? {战场坐标:battlePoint(decision.movement.point)} : {})}} : {})
    };
    if (decision.type === '技能') {
      const action = listAvailableActions(state, actorId).find(item => item.id === decision.skillId && item.available);
      if (!action) throw new Error('LLM选择了不可用技能');
      if(action.defaultCastMode)intent.modeId=action.defaultCastMode;
      intent.branchTargets=Object.fromEntries(action.effectBranches.filter(branch=>branch.optional).map(branch=>[branch.id,{enabled:action.defaultBranchIds.includes(branch.id),...(action.defaultBranchIds.includes(branch.id)?{targetIds:cleanList(decision.targetIds),...(decision.aimPoint?{aimPoint:battlePoint(decision.aimPoint)}:{})}:{})}]));
      const copiesSkillset = action.effectBranches.filter(branch=>action.defaultBranchIds.includes(branch.id)).some(branch=>branch.effectSpecs.some(([effectId])=>effectId==='copy.skillset'));
      if (decision.sourceUnitId && !copiesSkillset) throw new Error('非复制技能不能指定复制来源');
      if (decision.sourceUnitId && (decision.sourceUnitId === actorId || !isPresentParticipant(state, decision.sourceUnitId))) throw new Error('LLM指定了无效复制来源');
    }
    const preview = ['技能','切换武魂'].includes(decision.type) ? previewAction(state, intent) : null;
    if (preview && !preview.ready) throw new Error(preview.reason || 'LLM行动缺少目标');
    settleAction(state, intent);
    return {...intent, aiDecision:{policy:LLM_COMBAT_POLICY.id, fallback:false, reason:decision.reason, affectedTargetIds:preview?.targetIds ?? []}};
  }

  function llmFallbackIntent(state, actorId, actionId, reason) {
    const fallback = chooseAiIntent(state, actorId, actionId);
    return {...fallback, aiDecision:{...(fallback.aiDecision ?? {}),requestedPolicy:LLM_COMBAT_POLICY.id,fallback:true,fallbackReason:String(reason).slice(0,160)}};
  }

  async function chooseLlmIntent(state, actorId, actionId, provider, options = {}) {
    const characterId = state.战斗单位.列表[actorId]?.扩展?.角色库ID ?? '';
    const selected = options.enabled === true && (cleanList(options.actorIds).includes(actorId) || cleanList(options.characterIds).includes(characterId));
    if (!selected) return chooseAiIntent(state, actorId, actionId);
    if (typeof provider !== 'function') return llmFallbackIntent(state, actorId, actionId, 'provider-unavailable');
    const controller = new AbortController();
    const cancel = () => controller.abort(options.signal?.reason);
    options.signal?.addEventListener('abort',cancel,{once:true});
    if(options.signal?.aborted)cancel();
    try {
      const timeoutMs = Number(options.timeoutMs ?? 6000);
      if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>2147483647)throw new Error('provider-invalid-timeout');
      const request = buildLlmBattleRequest(state, actorId);
      const response = await new Promise((resolve, reject) => {
        const aborted=()=>{clearTimeout(timer);reject(new Error('provider-cancelled'));};
        const timer = setTimeout(() => {controller.abort();reject(new Error('provider-timeout'));}, timeoutMs);
        controller.signal.addEventListener('abort',aborted,{once:true});
        if(controller.signal.aborted)aborted();
        Promise.resolve().then(() => {if(controller.signal.aborted)throw new Error('provider-cancelled');return provider(request,controller.signal);}).then(
          value => { clearTimeout(timer);controller.signal.removeEventListener('abort',aborted);resolve(value); },
          error => { clearTimeout(timer);controller.signal.removeEventListener('abort',aborted);reject(error); }
        );
      });
      return llmDecisionToIntent(state, actorId, actionId, parseLlmBattleDecision(response));
    } catch (error) {
      if(options.signal?.aborted)throw error;
      return llmFallbackIntent(state, actorId, actionId, error?.message ?? error);
    } finally {options.signal?.removeEventListener('abort',cancel);controller.abort();}
  }

  return Object.freeze({
    releasedEffectSource,executeContractPenalty,actionSkillContract,physiologicalStunSource,
    medicineCheckContext,verifyReleasedMedicineChecks,releaseMedicine,applyReleasedMedicine,physicalContactProfile:medicineContactProfile,physicalContactCheck:medicineContactCheck,medicineContactProfile,medicineContactCheck,previewFieldAbility,activateFieldAbility,applyCustodyDevice,removeCustodyDeviceStatuses,breakFreeProfile,validateBreakFreeSource,
    reconcilePowerCapacity,applyStatus,removeStatusLayer,statusImmunityReasons:(s,id,node)=>matchingStatusGuards(s,s.战斗单位.列表[id],node,'免疫'),removeZone,settleWorldStatusesAt,endWorldSummon,releaseDeploymentParticipant,nextWorldPoisonAt,nextWorldRegenerationAt,advanceWorldRegenerationAt,advanceWorldPoisonAt,validateWorldStatuses,validateControlSourceProof,
    VERSION,
    settleBattleAction, chooseBattleAiIntent, adjudicateTimedBattle, cleanupTrainingBattle, bindWorldClock, occupiedBattle, startBackgroundBattle, nextBackgroundBattleAt, advanceBackgroundBattlesAt, moveBattle, validateBattles,
    nextMaintenanceAt, advanceMaintenanceAt, stopMaintenance, pruneMaintenance, validateMaintenance, maintenanceCosts, endExchangeReference,
    ZONES,
    BATTLEFIELD,
    battlePoint,
    unitPoint,
    combatDistance,
    movementAllowance,
    pointDistance,
    pointOnLine,
    pointInCone,
    targetingMode,
    makeRng,
    rollDice,
    activeStatuses,
    statusPublicView,
    listStatusViews,
    battleResourceView,
    removeStatus,
    activeZones,
    activeMartialAvatar,
    resolveResistance,
    resolveSourceDamage,
    damageRealmProfile,realmSourceEligible,skillCheckDC,
    attributeModifier,
    effectiveDefense,
    martialAvatarEligibility,
    removeDomain,
    recomputeDomainConflicts,
    refreshAllDomainMembership,
    sameSide,
    sideIdOf,
    isActiveParticipant,
    evaluateCombatScene,
    previewAction,previewCurrentAction,
    startBattle,
    joinBattle,
    leaveBattle,
    settleAction,settleCommittedAction,
    escapeDifficulty,
    chooseAiIntent,
    chooseLlmIntent,
    compactLlmBattleSnapshot,
    buildLlmBattleRequest,
    parseLlmBattleDecision,
    LLM_COMBAT_POLICY,
    listAvailableActions,listCurrentActions,
    withAvailableActionsRead,
    defaultPayableSkill,
    listActionIndexPrepared,
    listTacticalActions,
    actionImpairment,
    combatActionConstraints,
    activeDomains,
    domainCenter,
    domainContains,
    zoneContains,
    skillUsageRules,
    skillUsageAvailability,
    martialBaseSkill,quoteSkillUse,
    resolveTargets,skillCastAvailability,
    fieldCostContract,controlQualificationContext,
    quoteManufacturingModifier,activateManufacturingModifier,
    isSelfRestorativeGraph,
    previewPrebattlePill,
    preparePrebattlePill,
    preparedPillViews,
    validatePreparedPills,
    previewRestorativeItem,
    activateRestorativeItem,
    quoteFoodConsumption,consumeFoodContents,
    effectOutputProfile,
    effectiveOutputProfile,
    surrenderAvailability,
    isBeneficialSkill
  });
});
