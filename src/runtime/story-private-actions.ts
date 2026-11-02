import {rules} from '../rules';
import {communicationAvailability,REMOTE_STORY_ACTIONS} from '../shared/story-communication';
import {resolveStoryPersonName} from './story-person-names';
import {StoryPlanValidationError} from './story-plan-validation-error';
import type {StoryPlan} from './story-turns';

/** Shared interpreter/execution context. Authority stays in domain rules. */
const LOCAL_PRIVATE_ACTIONS=new Set<string>([
 'request-person-growth',
 'respond-restraint-permission-request','respond-person-relation',
 'remember-object','resolve-object','instantiate-item','describe','clarify','resolve-person','label-person','tell-person','address-person','meet','quote-hire','bargain-hire','accept-hire-offer','person-history','inspect-person','promise-gold','promise-item','give-item','give-gold','fulfill-promise','cancel-promise','invite','invite-date','attend-invitation','ask-release','consider-person-goal','answer-person-plan','respond-npc-request','invite-realm-guest','propose-relationship','end-relationship','exchange-contact','invite-party','propose-loot','propose-loot-resolution','end-party','hire','dismiss','release-captive','search-captive','set-restraint-mode','intimate-craft','intimate-equip','intimate-detach','device.lock','device.unlock','device.suppress-lock','device.break-rule','device.analyze-lock','device.create-key','device.arcane-lock','host.set-suppression','host.set-form','host.set-appearance','detach-restraint','attach-restraint','permit-restraint','request-restraint-permission','revoke-restraint-permission','tell-custody-news','observe-custody-person','issue-field-control',
 'create-support-consumable','use-field-ability','request-ability-use','respond-ability-use','stop-maintenance','retract-martial-soul','restrain-desire','break-restraint',
 ...rules.custodyMarket.INTENTS,...rules.cooperation.INTENTS,...rules.preparations.INTENTS,...rules.poison.INTENTS,...rules.sealing.INTENTS,
 ...rules.personContracts.INTENTS,...rules.residentRealms.INTENTS,...rules.performanceAgreements.INTENTS,...rules.combatDeployments.INTENTS,
]);
export function privateStoryActionAllowed(kind:string,remote=false){return remote?(REMOTE_STORY_ACTIONS as readonly string[]).includes(kind):LOCAL_PRIVATE_ACTIONS.has(kind);}

/** Resolve the same identity aliases as the action executor, even in a voice-only encounter. */
export function privateStoryActionReferenceReason(state:any,personId:string,action:any,remote=false,reference=action.characterId):string{
 if(!privateStoryActionAllowed(action.kind,remote))return remote?'魂导通讯不能代替现场行动或交付，请实际到场后进行':'这项行动需要回到公共场景处理';
 const person=state.人物.列表[personId],canonicalId=person?.扩展?.角色库ID??state.战斗单位?.列表?.[personId]?.扩展?.角色库ID;
 if(!rules.custodyMarket.INTENTS.includes(action.kind)&&reference!==undefined&&reference!==personId&&reference!==canonicalId)return '这项行动的对象不是当前交谈者，请回到公共场景处理';
 return '';
}

/** Check a normalized, unexecuted host plan using the same channel boundary as execution. */
export function validatePrivateStoryPlan(state:any,plan:StoryPlan,personId?:string,completedPrefix=0):void{
 if(!personId)return;
 const remote=communicationAvailability(state,personId).mode==='soul-device';
 let plannedRegionId:string|undefined;
 for(const [index,{action}] of plan.segments.entries()){
  if(index<completedPrefix)continue;
  let reference=action.characterId,reason='';
  if(action.characterStep!==undefined){
   const prior=plan.segments[Number(action.characterStep)]?.action;
   if(prior?.kind!=='resolve-person')reason='私聊只能引用本次交谈中已确认的人物';
   else reference=resolveStoryPersonName(state,String(prior.name),personId).personId;
  }
  reason ||= privateStoryActionReferenceReason(state,personId,action,remote,reference)||privateStoryActionScopeReason(state,personId,action,plannedRegionId);
  if(reason)throw new StoryPlanValidationError(reason,{
   instancePath:`/segments/${index}/action`,keyword:'private-conversation-scope',submitted:action,
   reference:{instancePath:'/conversation',value:{personId,mode:remote?'soul-device':'in-person',actions:[...LOCAL_PRIVATE_ACTIONS].filter(kind=>privateStoryActionAllowed(kind,remote))}},
  });
  if(action.kind==='arrange-realm-resident'&&!plan.segments[index].when)plannedRegionId=String(action.regionId);
 }
}

export function privateStoryActionScopeReason(state:any,personId:string,action:any,plannedRegionId?:string):string{
 const playerId=state.角色.主控单位ID,participants=new Set([playerId,personId]),kind=action.kind;
 if(action.contractId){const r=rules.personContracts.get(state,action.contractId);if(r&&r.parties.some((id:string)=>!participants.has(id)))return '这份契约涉及其他人，请回到公共场景处理';}
 if(kind==='withdraw-control-source'){const r=state.状态实例?.列表?.[action.statusId];if(r&&(!participants.has(r.来源.单位ID)||!participants.has(r.目标单位ID)))return '这项控制涉及其他人，请回到公共场景处理';}
 if(action.agreementId){const r=rules.performanceAgreements.get(state,action.agreementId);if(r&&(!participants.has(r.authorityId)||!participants.has(r.subjectId)))return '这份协议涉及其他人，请回到公共场景处理';}
 if(rules.residentRealms.INTENTS.includes(kind)||kind==='propose-performance-agreement'){
  const row=rules.interiorSpaces.membership(state,personId),currentRegion=plannedRegionId??row?.member.regionId,targetRegion=kind==='reshape-realm'?action.regionId:currentRegion,space=rules.interiorSpaces.get(state,action.realmId??row?.space.id),region=space?.regions.find((r:any)=>r.id===targetRegion);
  if(kind==='reshape-realm'&&(space?.id!==row?.space.id||targetRegion!==currentRegion))return '私聊只能调整当前交谈者所在的庭院';
  const changesEnvironment=kind==='reshape-realm';
  if(changesEnvironment&&region?.members.some((id:string)=>!participants.has(id)))return '这次改境会影响同庭其他人，请回到公共场景安排';
  if(kind==='arrange-realm-resident'&&space?.regions.find((r:any)=>r.id===action.regionId)?.members.some((id:string)=>!participants.has(id)))return '合押涉及庭中其他人，请回到公共场景安排';
 }
 if(kind==='respond-restraint-permission-request'){
  const request=rules.custody.table(state).events.find((r:any)=>r.id===action.permissionId);
  if(request&&(!participants.has(request.actorId)||!participants.has(request.targetId)))return '这次装配请求涉及其他人，请回到公共场景处理';
 }
 if(kind==='respond-person-relation'){
  const request=rules.social.facts(state,playerId).pendingRelations.find((r:any)=>r.id===action.relationId);
  if(request&&(!participants.has(request.playerId)||!participants.has(request.personId)))return '这项关系提议涉及其他人，请与本人交谈';
 }
 for(const key of ['targetId','operatorId','actorId'])if(action[key]!==undefined&&!participants.has(action[key]))return '这项操作涉及其他人，请回到公共场景继续';
 if(action.cooperationId){const agreement=rules.cooperation.table(state).agreements.find((r:any)=>r.id===action.cooperationId);if(agreement&&(!participants.has(agreement.leaderId)||!participants.has(agreement.memberId)))return '这份合作涉及其他人，请回到公共场景处理';}
 if(['device.lock','device.unlock','device.suppress-lock','device.break-rule','device.analyze-lock','device.create-key','device.arcane-lock'].includes(kind)){const item=state.物品?.实例?.[action.itemId],subject=rules.host.carrier(state,item)?.personId??item?.ownerEntityId;if(!participants.has(subject))return '只能操作自己或当前交谈者实际持有或穿戴的器具';}
 if(kind==='intimate-detach'&&action.itemId!==undefined&&!participants.has(state.物品.实例[action.itemId]?.attachment?.wearerId))return '只能拆卸自己或当前交谈者实际佩戴的器具';
 if(['host.set-suppression','host.set-form','host.set-appearance'].includes(kind)&&!participants.has(rules.host.carrier(state,state.物品.实例[action.itemId])?.personId))return '只能操作自己或当前交谈者实际穿戴的宿主';
 if(['set-restraint-mode','detach-restraint'].includes(kind)&&!participants.has(state.物品.实例[action.itemId]?.attachment?.wearerId))return '只能操作自己或当前交谈者佩戴的拘束器';
 if(['respond-ability-use','use-field-ability'].includes(kind)&&action.permissionId){
  const p=rules.world.abilityUseTable(state).requests.find((p:any)=>p.id===action.permissionId);
  if(p&&(!participants.has(p.actorId)||!participants.has(p.targetId)))return '这份施用请求涉及其他人，请回到公共场景处理';
 }
 if(['respond-disguised-drug','consume-food-drink'].includes(kind)&&action.offerId){
  const offer=rules.poison.table(state).offers.find((p:any)=>p.id===action.offerId);
  if(offer&&(!participants.has(offer.actorId)||!participants.has(offer.targetId)))return '这份递药安排涉及其他人，请回到公共场景处理';
 }
 if(rules.sealing.INTENTS.includes(kind)){
  const p=action.permissionId?rules.sealing.table(state).permissions.find((p:any)=>p.id===action.permissionId):null;
  if(p&&(!participants.has(p.targetId)||!participants.has(p.operatorId)))return '这份封存许可涉及其他人，请回到公共场景处理';
  const sealed=action.itemId?rules.sealing.byItem(state,action.itemId):null;
  if(sealed&&!participants.has(sealed.targetId))return '台内人物不在本次交谈中，请回到公共场景操作';
  const item=action.itemId?state.物品.实例[action.itemId]:null,holder=item?state.容器.列表[item.containerId]?.ownerEntityId:null;
  if(holder&&state.人物.列表[holder]&&!participants.has(holder))return '器具由其他人保管，请回到公共场景操作';
 }
 if(kind==='release-toxic-cloud'&&(Object.values(state.人物.列表) as any[]).some(p=>!participants.has(p.id)&&p.status!=='dead'&&rules.actions.colocated(state,playerId,p.id)))return '药雾会波及在场其他人，请回到公共场景操作';
 return '';
}
