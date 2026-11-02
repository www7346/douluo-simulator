import {rules} from '../rules';
import {rememberStoryPerson} from './story-person-dossier';
import {conversationActivityOptions} from './story-communication-activity';
import {proposePersonalHireQuote} from './story-commitments';

/** Read the encounter boundary without instantiating a catalogue character. */
export function storyMeetingAvailability(state:any,characterId:unknown){
 if(typeof characterId!=='string'||!characterId)throw Error('请选择要见的人物');
 const record=rules.arena.worldCharacterRecord(characterId,state);
 const personId=record?rules.arena.persistentCharacterId(characterId):characterId;
 const result=(reason='')=>({available:!reason,reason,personId,record});
 const block=rules.world.worldActionBlockReason(state,{...conversationActivityOptions(state,personId),allowCaptivity:true});if(block)return result(block);
 const playerId=state.角色?.主控单位ID;if(!playerId)return result('请先创建角色');
 const unavailable=rules.arena.worldCharacterUnavailableReason(record?.id??state.战斗单位?.列表?.[characterId]?.扩展?.角色库ID,state);if(unavailable)return result(unavailable);
 if(record){const reason=rules.arena.persistentCharacterBlockReason(state,record.id);if(reason)return result(reason);}
 const person=state.人物.列表[personId];
 if(!record&&!person)return result('没有找到这位人物');
 if(personId===playerId)return result('不能把自己当作相遇人物');
 const position=rules.actions.positionOf(state,playerId);
 if(person?!globalThis.SoulScenePosition.communicationColocated(state,playerId,personId):position.kind!=='location'||position.sceneId!==''||position.locationId!==rules.arena.worldCharacterLocation(state,record.id))return result('这位人物不在当前地点');
 const unit=state.战斗单位.列表[personId];
 if(person?.status==='dead'||unit?.存活状态==='死亡'||(unit&&unit.资源.生命.当前<=0))return result('这位人物目前无法回应');
 if(record?.kind==='soul-beast')return result('当前人物不支持此相遇入口');
 return result();
}

/** Encounter creates identity and mechanical facts, never an agreement or relationship outcome. */
export function meetStoryPerson(state:any,characterId:unknown){
 const meeting=storyMeetingAvailability(state,characterId);if(!meeting.available)throw Error(meeting.reason);
 const {record,personId:id}=meeting,playerId=state.角色.主控单位ID;
 let person=state.人物.列表[id];
 if(record){const created=rules.arena.ensurePersistentCharacter(state,characterId);state=created.state;person=state.人物.列表[created.unitId];}
 const dossier=state.战斗单位.列表[id]?.扩展?.持久人物;
 if(dossier)rules.arena.completeCatalogueLoadout(state,rules.arena.CHARACTER_CATALOG[dossier.characterId],dossier.generated);
 person.扩展??={};
 const metBefore=Object.hasOwn(person.扩展.相遇记录??{},playerId);
 person.扩展.相遇记录={...person.扩展.相遇记录,[playerId]:{firstRevision:person.扩展.相遇记录?.[playerId]?.firstRevision??state.系统.revision,lastRevision:state.系统.revision,locationId:person.locationId,position:rules.actions.positionOf(state,person.id)}};
 rememberStoryPerson(state,person.id);
 return {state,receipt:{type:'character-met',characterId:record?.id??characterId,personId:person.id,name:person.name,metBefore,summary:`${metBefore?'再次见到':'见到'}${person.name}`}};
}

/** A price inquiry records the current service terms; it does not purchase or reserve them. */
export function quoteStoryHire(state:any,characterId:unknown,dungeonId:unknown,sourceId?:string){
 if(typeof dungeonId!=='string'||!dungeonId)throw Error('请选择询价的猎魂目的地');
 // Meet performs presence and life checks and resolves the same persistent identity.
 const met=meetStoryPerson(state,characterId);state=met.state;
 const person=state.人物.列表[met.receipt.personId];
 const canonicalId=state.战斗单位.列表[person.id]?.扩展?.角色库ID??met.receipt.characterId;
 const preview=rules.expedition.companionRoster(state,dungeonId);
 const entry=preview.freeGuide&&canonicalId==='yu-xiaogang-notting'?{free:true,fee:0,offer:null,reason:''}:preview.roster.find((item:any)=>item.characterId===canonicalId||item.characterId===person.id||item.unitId===person.id);
 if(!entry){if(!sourceId)throw Error('这次询价缺少原操作编号，请重新询问');return proposePersonalHireQuote(state,person.id,preview.dungeonId,sourceId);}
 const quote={characterId:canonicalId,personId:person.id,playerId:state.角色.主控单位ID,
  dungeonId:preview.dungeonId,fee:entry.free?0:entry.offer?.fee??entry.fee,currency:'gold',...(entry.offer?{quoteId:entry.offer.id}:{}),
  kind:entry.free?'first-hunt-guide':'paid-hire',available:entry.free||!entry.reason,
  availabilityReason:entry.reason||null,revision:state.系统.revision,
  terms:entry.free?'本次首次猎魂免费同行；未完成出发。':'一次猎魂同行，出发前取消全额退款；未付款、未预订，正式雇佣时重新检查条件。'};
 person.扩展.雇佣询价={...person.扩展.雇佣询价,[quote.playerId]:quote};
 return {state,receipt:{type:'hire-quoted',...quote,summary:`${person.name}本次同行费用为${quote.fee}金魂币。${quote.terms}${entry.reason?`当前说明：${entry.reason}。`:''}`}};
}
