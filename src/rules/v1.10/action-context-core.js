(function attachActionContext(root,factory){
  const people=root?.SoulPersonCore??(typeof require==='function'?require('./person-core.js'):null);
  const controls=root?.SoulControlCore??(typeof require==='function'?require('./control-core.js'):null);
  const positions=root?.SoulScenePosition??(typeof require==='function'?require('../../shared/scene-position-core.js'):null);
  const api=factory(people,controls,positions);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.SoulActionContext=api;
})(typeof globalThis!=='undefined'?globalThis:this,function createActionContext(people,controls,positions){
  'use strict';
  function battleOf(state,actorId,exceptId=''){
    const pending=[state.切磋?.当前,state.终局挑战?.当前,state.比赛?.当前?.match].filter(r=>r?.recovery?.units?.[actorId]).map(r=>r.battleId);
    return [state.战斗,...Object.values(state.世界?.backgroundBattles??{})].find(b=>b?.id&&b.id!==exceptId&&(b.状态==='进行中'&&b.扩展?.成员?.[actorId]?.status==='active'||pending.includes(b.id)))??null;
  }
  const {positionOf,colocated,communicationPosition,communicationColocated}=positions;
  function perception(state,actorId,targetId,channel='any'){
    const listenerId=globalThis.SoulConsciousness?.personForCarrier(state,actorId)?.personId??actorId,speakerId=globalThis.SoulConsciousness?.personForCarrier(state,targetId)?.personId??targetId;
    actorId=globalThis.SoulConsciousness?.unitId(state,actorId)??actorId;
    const actor=state.战斗单位?.列表?.[actorId],target=state.战斗单位?.列表?.[targetId];if(actor&&(actor.存活状态!=='存活'||actor.资源.生命.当前<=0)||target?.存活状态==='死亡'||globalThis.SoulSealingCore?.active(state,actorId)?.status==='sealed'||globalThis.SoulSealingCore?.active(state,targetId)?.status==='sealed'||controls.active(state,actorId).some(v=>['status.sleep','status.stun'].includes(v.模板ID)))return false;
    const battle=battleOf(state,actorId),sourceBattle=battleOf(state,targetId);let together=false;try{together=battle?battle.id===sourceBattle?.id:!!(state.人物?.列表?.[actorId]||globalThis.SoulConsciousness?.personForCarrier(state,actorId))&&!!(state.人物?.列表?.[targetId]||globalThis.SoulConsciousness?.personForCarrier(state,targetId))&&(channel==='vision'?colocated(state,actorId,targetId)||globalThis.SoulInteriorSpaces?.canSee?.(state,listenerId,speakerId):communicationColocated(state,actorId,targetId)||channel==='any'&&globalThis.SoulInteriorSpaces?.canSee?.(state,listenerId,speakerId));}catch{return false;}if(!together)return false;
    const visual=!controls.restrictions(state,actorId).blocked.vision?.length&&!controls.active(state,targetId).some(v=>v.模板ID==='status.invisibility');if(channel==='vision'||channel==='any'&&visual)return visual;
    const speech=(state.世界?globalThis.SoulWorldSocial?.speechTable(state).statements:[])??[],heard=speech.some(r=>r.speakerId===speakerId&&r.listenerId===listenerId&&r.at===people.now(state)&&r.participants.every(p=>{try{return globalThis.SoulAbilityContract.hash(p.position)===globalThis.SoulAbilityContract.hash(p.carrier?communicationPosition(state,p.personId):positionOf(state,p.personId));}catch{return false;}}));
    return channel==='hearing'?heard:visual||heard;
  }
  function assertTargets(state,actorId,request={}){const reason=controls.targetReason(state,actorId,{...request,perceivedSourceIds:(request.approachTargetIds??[]).filter(id=>perception(state,actorId,id))});if(reason)throw Error(reason);}
  function resolve(state,request={}){
    const actorId=String(request?.actorId??'').trim(),conversation=['communication','observe'].includes(request.containmentAction),carrier=globalThis.SoulConsciousness?.carrierForPerson(state,actorId),actingId=conversation&&carrier?carrier.unitId:actorId,unit=state.战斗单位?.列表?.[actingId],person=state.人物?.列表?.[actorId];
    if(!actorId||!person&&!unit)throw Error('行动者不存在');
    const autonomy=globalThis.SoulInfluenceCore?.autonomyReason(state,actorId,{speech:request.requirements?.includes('voice')});if(autonomy)throw Error(autonomy);
    if(carrier&&!conversation)throw Error(globalThis.SoulConsciousness.originalActionReason(state,actorId));
    if(person)people.assertAlive(state,actorId);
    if(unit&&(unit.存活状态!=='存活'||unit.资源.生命.当前<=0))throw Error('行动者已失能，不能行动');
    if(controls.active(state,actingId).some(v=>['status.sleep','status.stun'].includes(v.模板ID)))throw Error('行动者须保持清醒');
    if(request.requirements)controls.assertAction(state,actingId,'requirements',{requirements:request.requirements,containmentAction:request.containmentAction});
    const battle=battleOf(state,actingId);
    if(Object.hasOwn(request,'battleId')&&(request.battleId??null)!==(battle?.id??null))throw Error(battle?'人物正参加战斗或等待结算，不能同时进行场外行动':'人物不在指定战斗中');
    const position=conversation&&carrier?communicationPosition(state,actorId):person||!battle&&request.fieldAbility?positionOf(state,actorId):{kind:'battle',locationId:battle?.扩展?.地点ID??'',sceneId:battle?.id??''};
    const containment=request.containmentAction,awake=globalThis.SoulSealingCore?.isAwakeContained(state,actorId);
    if(position.kind==='contained'&&(!awake||!['communication','observe','struggle'].includes(containment)))throw Error('封神台的封锁罩仍然闭合，无法离开或向外施术');
    if(conversation&&(request.requirements??[]).some(v=>!['voice','vision','hearing','focus'].includes(v)))throw Error('隔着封锁罩只能观察或说话');
    if(containment==='struggle'&&(!awake||(request.requirements??[]).length||(request.targetIds??[]).length||(request.harmfulTargetIds??[]).length||(request.approachTargetIds??[]).length))throw Error('只能在自己所在的封锁罩内挣扎');
    if(!battle&&!person&&!(request.fieldAbility===true&&(unit?.单位种类==='魂兽'||globalThis.SoulConsciousness?.personForCarrier(state,actorId)||globalThis.SoulCreationCore?.constructs(state).some(r=>r.kind==='summon'&&r.status==='active'&&r.unitId===actorId))&&position.kind==='location'))throw Error('场外行动需要完整人物档案');
    if(request.expectedLocationId!==undefined&&request.expectedLocationId!==position.locationId)throw Error('行动地点与人物实际位置不一致');
    const targetIds=[...new Set([...(request.targetIds??[]),...(request.harmfulTargetIds??[]),...(request.approachTargetIds??[])])];
    for(const id of targetIds){
      if(!state.战斗单位?.列表?.[id]&&!state.人物?.列表?.[id])throw Error('目标不存在');
      for(const channel of ['vision','hearing'])if(id!==actorId&&request.requirements?.includes(channel)&&!perception(state,actorId,id,channel))throw Error(channel==='vision'?'目标未被实际视觉感知':'目标当前没有真实听闻来源');
      if(battle){if(!battle.参与者ID列表.includes(id))throw Error('目标不在本场战斗中');}
      else if(!(conversation||containment==='device-control'?communicationColocated(state,actorId,id):colocated(state,actorId,id))||battleOf(state,id))throw Error('目标不在同一可接触场景，或正在另一场战斗');
    }
    assertTargets(state,actorId,request);
    return {actorId,battleId:battle?.id??null,locationId:position.locationId,sceneId:position.sceneId,position,targetIds,sourceId:String(request.sourceId??''),at:state.世界?.时间?people.now(state):null};
  }
  return Object.freeze({battleOf,positionOf,colocated,communicationPosition,communicationColocated,perception,assertTargets,resolve});
});
