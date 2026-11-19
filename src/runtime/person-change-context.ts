import {rules} from '../rules';
import {ownReactionMemory,personChangeReactionFacts} from './person-change-reaction';

/** A character's own perspective. It is not shared knowledge of everyone present. */
export function personalChangeContext(state:any,ownerId:string){
 const person=state.人物?.列表?.[ownerId];if(!person)return null;
 const visiblePeople=Object.values(state.人物?.列表??{}).flatMap((other:any)=>{
  if(other.id===ownerId)return [];
  try{if(!rules.actions.perception(state,ownerId,other.id,'vision'))return [];}catch{return [];}
  return [{personId:other.id,name:other.name,gender:other.gender??null,appearance:other.appearance??null}];
 });
 const speech=rules.social.speechFacts(state,ownerId);
 const spoken=speech.filter((r:any)=>r.speakerId===ownerId),heard=speech.filter((r:any)=>r.listenerId===ownerId);
 const counterparts=new Map<string,string>(visiblePeople.map(p=>[p.personId,p.name]));
 for(const r of speech)counterparts.set(r.speakerId===ownerId?r.listenerId:r.speakerId,r.speakerId===ownerId?r.listenerName:r.speakerName);
 const byPerson=[...counterparts].map(([personId,name])=>({personId,name,
  spokenIds:spoken.filter((r:any)=>r.listenerId===personId).map((r:any)=>r.id),
  heardIds:heard.filter((r:any)=>r.speakerId===personId).map((r:any)=>r.id)}));
 const appearanceDescriptionReference=rules.playerAppearance.wording(state,ownerId);
 return {ownerId,currentBody:{gender:person.gender??null,appearance:person.appearance??null},
  ...(appearanceDescriptionReference?{appearanceDescriptionReference}:{}),
  selfIdentity:person.扩展?.cognitivePersona?.selfIdentity??null,
  visiblePeople,
  rememberedSpeech:{ownerId,scope:'正式发言账本中本人仍可记起的原话；byPerson按当前可见者及这些原话的往来人物索引。私聊与群聊归档另列，空索引不覆盖其他来源。',byPerson,spoken,heard},
  experiences:rules.personChangeKnowledge.facts(state,ownerId),
  pastReactions:ownReactionMemory(state,ownerId)};
}
/** Only speech that this viewer actually heard, or their own remembered response. */
export function changeInteractionContext(state:any,viewerId:string,ownerId?:string){
 return personChangeReactionFacts(state,viewerId,ownerId?{ownerId}:{});
}
