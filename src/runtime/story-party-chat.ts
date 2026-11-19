import {npcConversationGoals} from '../shared/npc-autonomy';
import {jsonEqual} from '../shared/json-identity';
import {personCognition} from '../shared/cognition-view';
import {perceivedRelations} from '../shared/cognition-view';
import {changeInteractionContext} from './person-change-context';
import {partyProposalReplies} from '../shared/story-party-proposals';
import {communicationAvailability,deliveredChannelLabel} from '../shared/story-communication';
import {rules} from '../rules';
import {residentNarrativeContext} from './resident-narrative';
import {storyPersona,storyConversationIdentity,storyBackgroundContext} from './story-personas';
import {contactStoryPerson} from './story-communication';
import {commonPartyMessages,validatePartyReplyProposal,partyReplyProse,type PartyMessage,type PartyRecipient} from '../shared/story-party-chat';
import type {HeardStatement} from '../shared/story-person-knowledge';

export function partyChatRoster(state:any):PartyRecipient[]{
 const projections=rules.combatDeployments.active(state).filter((r:any)=>r.mode==='projection'&&r.casterId===state.角色.主控单位ID);
 return [...new Set<string>([...rules.world.occupiedCompanionIds(state),...projections.map((r:any)=>r.prototypeId)])].map((personId:string)=>{
  const p=state.人物.列表[personId],party=rules.world.partyMembers(state).find((m:any)=>m.personId===personId);
  const companion=(state.远征?.companionContracts??[]).find((c:any)=>c.leaderId===state.角色.主控单位ID&&c.unitId===personId)??(state.远征?.当前?.companions??[]).find((c:any)=>c.unitId===personId&&c.active);
  const contact=communicationAvailability(state,personId,{receiving:true}),projection=projections.find((r:any)=>r.prototypeId===personId);
  return {personId,name:p.name,membershipId:projection?.id??party?.membershipId??companion?.agreementId,membershipKind:projection?'projection':party?'party':'contract',delivered:contact.available,...(contact.available?(contact.channel?{channel:contact.channel}:{}):{reason:contact.reason})};
 });
}

export function recordPartyMessage(state:any,text:string,source:HeardStatement['source'],id:string){
 const block=rules.world.worldActionBlockReason(state,{allowActivities:['expedition']});if(block)throw Error(block);
 const audience=partyChatRoster(state);if(!audience.length)throw Error('当前没有实际队伍成员可接收群消息');
 const message:PartyMessage={id,text,speakerId:state.角色.主控单位ID,source:structuredClone(source),time:structuredClone(state.世界.时间),locationId:state.地图.当前地点ID,audience};
 for(const a of audience){if(!a.delivered)continue;state=contactStoryPerson(state,a.personId,{party:true}).state;
  const person=state.人物.列表[a.personId],record:HeardStatement={id:`${id}:${a.personId}`,kind:'heard',speakerId:message.speakerId,listenerId:a.personId,text,truth:'unverified',source:structuredClone(source),locationId:message.locationId,time:structuredClone(message.time),partyMessageId:id,...(a.channel?{channel:structuredClone(a.channel)}:{})};
  person.扩展.听闻记录??=[];person.扩展.听闻记录.push(record);
 }
 state.扩展.story.partyMessages??=[];state.扩展.story.partyMessages.push(message);
 return {state,receipt:{type:'party-message-sent',message:structuredClone(message),summary:`队伍消息已送达${audience.filter(a=>a.delivered).length}人${audience.some(a=>!a.delivered)?`，${audience.filter(a=>!a.delivered).length}人未接通`:''}。`}};
}
/** No private conversations, hidden intentions, inventories, or offscreen status enter the common writer. */
export function partyConversationFacts(state:any,message?:PartyMessage){
 const player=state.人物.列表[state.角色.主控单位ID],recipients=message?.audience.filter(a=>a.delivered)??[];
 return {time:message?.time??state.世界.时间,calendar:rules.world.storyCalendarDate(state),player:storyConversationIdentity(player,false),
  people:recipients.map(a=>{const p=state.人物.列表[a.personId],backgroundContext=recipients.length===1?storyBackgroundContext(state,p.id):null;return {...storyConversationIdentity(p,false),...(backgroundContext?{backgroundContext}:{}),membershipKind:a.membershipKind,communication:deliveredChannelLabel(a.channel)};}),
  partyChat:{message:message??null,commonHistory:message?commonPartyMessages(state,recipients.map(a=>a.personId),message.source.turn,message.text):[],meaning:'仅向audience中delivered=true的人送达。未接通者不发言、不知晓本次消息。共用上下文只含共同收到的原话；没有私聊、个人秘密或远方现状。每人可有不同意见，不强迫逐一回复。聊天不替代独立约定、付款、行动或入队。'},
 };
}

function partySpeakerPerspective(state:any,speakerId:string,resident:ReturnType<typeof residentNarrativeContext>){
 const playerId=state.角色.主控单位ID;
 const obedience=resident.obedience.find((r:any)=>r.subjectId===speakerId&&r.authorityId===playerId);
 const relationship={playerId,attitudeTowardPlayer:resident.attitudeTowardPlayer,obedienceTowardPlayer:obedience?.value??null};
 const custody=rules.custody.active(state,speakerId);
 if(custody?.custodianId!==playerId)return {...relationship,custody:null};

 const binding=rules.residentRealms.binding(state,speakerId);
 const capture=binding&&rules.residentRealms.table(state).events.find((event:any)=>event.type==='captured'&&event.id===binding.slot.eventId);
 const defeatId=capture?.qualification.defeatId??custody.defeatId;
 const defeat=defeatId?rules.custody.table(state).defeats[defeatId]:null;
 // Capture can occur while unconscious. Current custody and remembered battle opening have different sources.
 const rememberedFight=defeat?.battleKind==='lethal'&&defeat.eligibleActorIds.includes(playerId)&&resident.battles.some(battle=>battle.battleId===defeat.battleId);
 return {...relationship,custody:{status:'本人当前受玩家看管',
  ...(binding?.realm.ownerId===playerId?{realmBinding:'本人被收入玩家的画境，当前仍然绑定'}:{}),
  ...(rememberedFight?{rememberedFight:{battleId:defeat.battleId,experience:'本人记得与玩家在死斗开场分属敌对双方'}}:{}),
 }};
}

/** Independent reply input: only this speaker's private perspective is added. */
export function partySpeakerFacts(state:any,message:PartyMessage,speakerId:string){
 const audience=partyReplyAudience(state,message);
 if(!audience.some(a=>a.personId===speakerId))throw Error('这位人物没有收到本次群消息');
 const facts=partyConversationFacts(state,message),person=state.人物.列表[speakerId];
 facts.partyChat.commonHistory=commonPartyMessages(state,[speakerId],message.source.turn,message.text);
 const self=facts.people.find(p=>p.id===speakerId)!;
 const residentContext=residentNarrativeContext(state,speakerId);
 Object.assign(self,{partySpeakerPerspective:partySpeakerPerspective(state,speakerId,residentContext),characterization:storyPersona(state,person),relationships:perceivedRelations(state,speakerId),changeInteractions:changeInteractionContext(state,speakerId)});
 return {...facts,residentContext,npcGoals:npcConversationGoals(state,speakerId)};
}

export function partyReplyAudience(state:any,message:PartyMessage){
 const now=partyChatRoster(state);return message.audience.flatMap(a=>{const n=now.find(n=>n.personId===a.personId&&n.membershipId===a.membershipId&&n.delivered);if(!a.delivered||!n||rules.influence.autonomy(state,a.personId).puppet)return [];const {channel,...base}=a;return [{...base,...(n.channel?{channel:n.channel}:{})}];});
}
export function finishPartyReplies(state:any,message:PartyMessage,value:any,sourceId:string){
 if(message.responses)throw Error('队伍回复已经保存，不能重复发言或替换原话');
 const audience=partyReplyAudience(state,message),messages=validatePartyReplyProposal(value,audience.map(a=>a.personId));
 if(message.proposals&&!jsonEqual(messages,partyProposalReplies(state,message,audience.map(a=>a.personId))))throw Error('群提议回复须保留本人独立回应原话');
 message.responses={sourceId,revision:state.系统.revision,time:structuredClone(state.世界.时间),audience:structuredClone(audience),items:messages.map((r,i)=>({id:`${message.id}:reply:${i}`,...r}))};
 return partyReplyProse(message);
}
