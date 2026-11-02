(function(root,factory){const context=root?.SoulExpeditionContext??(typeof require==='function'?require('./expedition-context-core.js'):null);const api=factory(context);if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulScenePosition=api;})(typeof globalThis!=='undefined'?globalThis:this,function(context){
  'use strict';
  const activeSeal=(state,id)=>globalThis.SoulSealingCore?.active(state,id)??state.世界?.sealings?.records?.find(r=>r.targetId===id&&['sealed','confined'].includes(r.status));
  function positionOf(state,actorId){
    const person=state.人物?.列表?.[actorId];
    if(!person){const encounter=Object.values(state.遭遇?.列表??{}).find(e=>e.战斗单位ID列表?.includes(actorId)&&e.状态==='待判定'&&!e.battleId);if(state.战斗单位?.列表?.[actorId]?.单位种类==='魂兽'&&encounter?.position)return {...encounter.position};const deployment=globalThis.SoulCombatDeployments?.positionOf(state,actorId);if(deployment)return deployment;const row=state.扩展?.creationConstructs?.records?.find(r=>r.unitId===actorId&&r.status==='active');if(row)return {...row.scope};throw Error('行动者没有已登记的人物位置');}
    const interior=globalThis.SoulInteriorSpaces?.positionOf(state,actorId);if(interior)return interior;
    const sealed=activeSeal(state,actorId);
    if(sealed)return {kind:'contained',locationId:'',sceneId:sealed.id,itemId:sealed.itemId};
    const released=globalThis.SoulSealingCore?.releasedPosition(state,actorId);if(released)return released;
    const transit=person.transit;
    const encounter=globalThis.SoulRescueCore?.encounterFor(state,actorId);
    if(encounter)return {kind:'transit',locationId:'',sceneId:encounter.id,routeId:encounter.routeId,elapsedMinutes:encounter.coordinate};
    if(transit)return {kind:'transit',locationId:'',sceneId:transit.actionId,routeId:transit.routeId,elapsedMinutes:transit.elapsedMinutes};
    if(String(person.locationId).startsWith('journey:'))throw Error('旧人物行程缺少整数路程证明');
    let sceneId=String(person.spaceId??'');
    const expedition=context.forActor(state,actorId);
    if(expedition)sceneId=`expedition:${expedition.id}:${expedition.currentNodeId}`;
    return {kind:'location',locationId:person.locationId,sceneId};
  }
  function sameScene(a,b){
    if(a.kind==='contained'||b.kind==='contained'||a.kind!==b.kind||a.sceneId!==b.sceneId)return false;
    if(a.kind==='transit')return !!a.sceneId&&a.routeId===b.routeId&&a.elapsedMinutes===b.elapsedMinutes;
    return !!a.locationId&&a.locationId===b.locationId;
  }
  /** Authority callers settle permission first; this primitive keeps the person and carried containers together. */
  function placePerson(state,personId,position){const person=state.人物?.列表?.[personId];if(!person||!state.地图?.地点?.[position.locationId]||typeof position.spaceId!=='string'||globalThis.SoulInteriorSpaces?.membership(state,personId))throw Error('人物移动缺少真实落点或仍在独立空间中');person.locationId=position.locationId;delete person.transit;if(position.spaceId)person.spaceId=position.spaceId;else delete person.spaceId;for(const containerId of [person.inventoryContainerId,`container-restraints-${personId}`])if(state.容器?.列表?.[containerId])state.容器.列表[containerId].locationId=position.locationId;}
  function colocated(state,leftId,rightId){return sameScene(positionOf(state,leftId),positionOf(state,rightId));}
  function communicationPosition(state,actorId){
    const carrier=globalThis.SoulConsciousness?.carrierForPerson(state,actorId);if(carrier)return positionOf(state,carrier.unitId);
    const seal=activeSeal(state,actorId);
    if(seal?.status!=='confined')return positionOf(state,actorId);
    if(globalThis.SoulSealingCore)return globalThis.SoulSealingCore.itemPosition(state,seal.itemId);
    const item=state.物品?.实例?.[seal.itemId],container=state.容器?.列表?.[item?.containerId];
    if(!item||!container)throw Error('封神台没有真实物品容器');
    if(['inventory','corpse','equipment'].includes(container.type)&&state.人物?.列表?.[container.ownerEntityId])return positionOf(state,container.ownerEntityId);
    if(container.扩展?.scenePosition)return {...container.扩展.scenePosition};
    if(!state.地图?.地点?.[container.locationId])throw Error('器体没有可验证的外部场景');
    return {kind:'location',locationId:container.locationId,sceneId:container.扩展?.spaceId??''};
  }
  function communicationColocated(state,leftId,rightId){if(globalThis.SoulConsciousness?.carrierForPerson(state,leftId)||globalThis.SoulConsciousness?.carrierForPerson(state,rightId))return sameScene(communicationPosition(state,leftId),communicationPosition(state,rightId));const allowed=globalThis.SoulInteriorSpaces?.communicationAllowed(state,leftId,rightId);if(allowed!==null&&allowed!==undefined)return allowed;return sameScene(communicationPosition(state,leftId),communicationPosition(state,rightId));}
  return Object.freeze({positionOf,placePerson,sameScene,colocated,communicationPosition,communicationColocated});
});
