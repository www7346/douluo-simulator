import type {WritingEvent,WritingChange} from './story-writing-facts';

/** Exact recorded identities used by these events. A world-location roster and
 * the whole-turn reference catalogue do not establish presence in a battle.
 * This selects existing profiles; it neither creates people nor changes them.
 */
export function storyWritingPersonReferences(events:WritingEvent[],changes:WritingChange[]=[],requestedActions:unknown[]=[]){
 const references=new Set<string>();
 const visit=(value:unknown):void=>{
  if(typeof value==='string')references.add(value);
  else if(value&&typeof value==='object')Object.values(value).forEach(visit);
 };
 for(const event of events){
  const {wholeBattleReference:_whole,wholeEventStatement:_statement,...facts}=event.facts;
  visit(event.source);visit(facts);
 }
 visit(changes);visit(requestedActions);
 return references;
}

/** Keep the complete history of each selected person, including ended agreements.
 * Other continuity (knowledge, obligations, memory, objects) remains untouched.
 */
export function selectStoryPersonHistories(continuity:Record<string,any>,ids:Set<string>){
 if(Array.isArray(continuity.people))continuity.people=continuity.people.filter((p:any)=>typeof p?.personId!=='string'||ids.has(p.personId));
}
