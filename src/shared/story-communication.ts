import './expedition-context-core.js';
import './scene-position-core.js';
import './commerce-contact-core.js';
import type {HeardStatement} from './story-person-knowledge';
/** Shared communication rules; the UI uses the same eligibility as story execution. */
export function soulContact(state:any,personId:string,actorId=state.角色?.主控单位ID){
 return globalThis.SoulCommerceContact.findContact(state,actorId,personId);
}
export function deliveredChannelLabel(channel?:HeardStatement['channel']){
 if(channel?.kind==='realm'&&channel.deploymentId)return '投影当面交谈';
 if(channel?.kind==='realm'||channel?.kind==='realm-visit')return '画境联系';
 return channel?'魂导传讯':'当面交谈';
}
/** Established acquaintance is independent of a physical encounter in this story. */
export function knownStoryPerson(state:any,personId:string,actorId=state.角色?.主控单位ID){
 return !!state.人物?.列表?.[personId]&&!!(state.人物.列表[personId].扩展?.相遇记录?.[actorId]||soulContact(state,personId,actorId)||globalThis.SoulResidentRealms?.binding(state,personId)?.realm.ownerId===actorId||globalThis.SoulInteriorSpaces?.membership(state,personId)?.space.ownerId===actorId||globalThis.SoulOpeningRelations?.acquainted(state,actorId,personId));
}
export function communicationAvailability(state:any,personId:string,options:{receiving?:boolean}={}){
 const carrierId=globalThis.SoulConsciousness?.unitId(state,personId)??personId,p=state.人物?.列表?.[personId],playerId=state.角色?.主控单位ID,unit=state.战斗单位?.列表?.[carrierId];
 const positions=globalThis.SoulScenePosition;
 const together=!!p&&!!state.人物?.列表?.[playerId]&&positions.sameScene(positions.communicationPosition(state,personId),positions.communicationPosition(state,playerId));
 const binding=globalThis.SoulResidentRealms?.binding(state,personId),bound=binding?.realm.ownerId===playerId;
 const room=globalThis.SoulInteriorSpaces?.membership(state,personId);
 const inside=room&&room.space.ownerId===playerId&&!!globalThis.SoulInteriorSpaces.communicationAllowed(state,personId,playerId);
 const projection=carrierId!==personId&&unit?.扩展?.projection?.deploymentId;
 const confined=together&&[carrierId,playerId].some(id=>globalThis.SoulSealingCore?.active(state,id)?.status==='confined');
 const mode=together?(projection?'projection':'in-person'):inside?'realm':'soul-device',contact=soulContact(state,personId);
 const voiceReason=unit&&globalThis.SoulControlCore?.restrictions(state,carrierId).blocked.voice?.map((v:any)=>v.reason??'发声受限').join('、');
 const unable=!p||personId===playerId||p.status==='dead'||unit&&(unit.存活状态!=='存活'||unit.资源.生命.当前<=0);
 const busy=(state.世界?.npcPlans??[]).some((plan:any)=>plan.ownerId===personId&&plan.status==='travelling')||state.战斗?.状态==='进行中'&&(state.战斗.参与者ID列表??[]).includes(carrierId);
 const sealed=!!p&&!!state.人物?.列表?.[playerId]&&[personId,playerId].some(id=>globalThis.SoulScenePosition.communicationPosition(state,id).kind==='contained');
 const puppet=globalThis.SoulInfluenceCore?.autonomy(state,personId).puppet;
 const immediate=mode!=='soul-device';
 const reason=unable&&immediate?(p?.status==='dead'?'对方已死亡，无法交谈':'对方已昏迷或失去意识，请先治疗恢复'):voiceReason&&immediate&&!options.receiving?`对方当前不能发声：${voiceReason}`:puppet&&!options.receiving?'对方正被精神接管，无法回应':sealed?'封存期间无法联络':immediate?(busy?'人物正在战斗或行程中，暂时无法交谈':''):!contact?'尚未交换魂导通讯联络方式':unable||busy||voiceReason&&!options.receiving?'暂时无法接通；没有收到对方的新消息':'';
 let channel:HeardStatement['channel'];
 if((mode==='realm'||mode==='projection')&&bound)channel={kind:'realm',realmId:binding.realm.id,captureEventId:binding.slot.eventId,...(mode==='projection'?{deploymentId:projection}:{})};
 else if(mode==='realm'&&inside){
  const proof=globalThis.SoulInteriorSpaces.communicationProof(state,playerId,personId);
  if(proof)channel={kind:'realm-visit',realmId:proof.spaceId,entryEventId:proof.entryEventId};
 }else if(mode==='soul-device'&&contact)channel={kind:'soul-device',contactId:contact.id};
 return {available:!reason,mode,reason,...(channel?{channel}:{}),label:confined?'隔器传声':mode==='realm'?'画境联系':mode==='projection'?'投影当面交谈':mode==='soul-device'?'魂导传讯':'当面交谈',contactId:contact?.id??null};
}
export function validateCommunicationSource(state:any,personId:string,channel:any,time:any){
 if(channel===undefined)return;
 if(channel?.kind==='realm'){
  const binding=globalThis.SoulResidentRealms?.binding(state,personId),event=binding&&globalThis.SoulResidentRealms.table(state).events.find((e:any)=>e.id===binding.slot.eventId),at=time?.day*1440+time?.hour*60+time?.minute;
  if(channel.deploymentId!==undefined&&!globalThis.SoulCombatDeployments?.memberAt(state,channel.deploymentId,state.角色.主控单位ID,personId,at))throw Error('投影交谈缺少当时有效的出战来源');
  if(Object.keys(channel).some(k=>!['kind','realmId','captureEventId','deploymentId'].includes(k))||binding?.realm.ownerId!==state.角色.主控单位ID||channel.realmId!==binding.realm.id||channel.captureEventId!==binding.slot.eventId||!event||event.at>at||!Number.isFinite(at))throw Error('画境交谈缺少当时有效的人物绑定来源');
  return;
 }
 if(channel?.kind==='realm-visit'){
  const space=globalThis.SoulInteriorSpaces?.get(state,channel.realmId),at=time?.day*1440+time?.hour*60+time?.minute;
  const events=globalThis.SoulInteriorSpaces?.table(state).events??[],entry=events.find((e:any)=>e.id===channel.entryEventId&&e.type==='entered'&&e.spaceId===space?.id&&e.unitId===personId);
  if(Object.keys(channel).length!==3||!space||space.ownerId!==state.角色.主控单位ID||!entry||!Number.isFinite(at)||entry.at>at||events.some((e:any)=>e.spaceId===space.id&&e.unitId===personId&&e.type==='left'&&e.order>entry.order&&e.at<at))throw Error('画境联系缺少当时的入住来源');
  return;
 }
 const mainId=state.角色?.主控单位ID,r=Object.values(state.人物?.列表??{}).flatMap((p:any)=>p.扩展?.社交约定??[]).find((r:any)=>r.id===channel?.contactId&&r.kind==='contact'&&[r.playerId,r.personId].includes(mainId)&&[r.playerId,r.personId].includes(personId));
 const accepted=r?.events?.find((e:any)=>e.status==='completed'),minute=(t:any)=>t?.day*1440+t?.hour*60+t?.minute;
 if(!channel||Object.keys(channel).some(k=>!['kind','contactId'].includes(k))||channel.kind!=='soul-device'||!accepted||!Number.isFinite(minute(time))||minute(accepted.time)>minute(time))throw Error('远程交谈缺少此前已接通的联络来源');
}

export const REMOTE_STORY_ACTIONS=['inspect-evolution','preview-evolution','adopt-evolution','describe','clarify','resolve-person','label-person','tell-person','address-person','person-history','inspect-person','promise-gold','promise-item','cancel-promise','invite','invite-date','consider-person-goal','answer-person-plan','propose-relationship','respond-person-relation','end-relationship','invite-party','propose-loot-resolution','end-party'] as const;
