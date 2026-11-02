import {isPartyTurn} from '../shared/story-party-chat';
import type {conversationContactFacts} from '../runtime/conversation-contacts';
import type {StoryArchiveRecord} from '../shared/story-archive';
/** Display routing only. Execution and NPC knowledge remain in the existing story runtime. */
export function conversationEntries(entries:StoryArchiveRecord[],personId:string){
 return entries.filter(entry=>!isPartyTurn(entry.turn)&&(entry.turn.privatePersonId??'')===personId);
}
export function conversationPeople(state:any,entries:StoryArchiveRecord[],contacts:ReturnType<typeof conversationContactFacts>){
 return contacts.filter(row=>row.known||entries.some(e=>e.turn.privatePersonId===row.personId)).flatMap(row=>{
  const person=state.人物?.列表?.[row.personId];if(!person)return [];
  const history=conversationEntries(entries,person.id),latest=history.reduce<StoryArchiveRecord|null>((a,b)=>!a||b.turn.number>a.turn.number?b:a,null);
  const communication=row.communication,available=communication.available;
  return [{id:person.id,name:person.name,person,available,communication,latest,preview:latest?.turn.prose?.replace(/\s+/g,' ').slice(0,70)??'还没有私聊记录'}];
 }).sort((a,b)=>(b.latest?.turn.number??0)-(a.latest?.turn.number??0)||Number(b.available)-Number(a.available)||a.name.localeCompare(b.name,'zh-CN'));
}
