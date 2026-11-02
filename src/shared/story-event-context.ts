import type {StoryStepResult,StoryTurn} from '../runtime/story-turns';

/** Frozen observations of existing facts, not another mutable character/world state. */
export interface StoryEventSnapshot {time:any;location:any;people:any[];objects:any[];personContracts?:any[]}
export interface StoryEventContext {before:StoryEventSnapshot;after:StoryEventSnapshot}
// A deployed resident may also be visible in the scene. Keep the scene's
// already-selected observation once, rather than duplicating the same person.
const people=(facts:any):any[]=>[facts?.player,...(facts?.people??[]),...(facts?.residentContext?.people??[])].filter((p,index,rows)=>typeof p?.id==='string'&&rows.findIndex(row=>row?.id===p.id)===index);
const items=(facts:any):any[]=>[...(Array.isArray(facts?.inventory)?facts.inventory:facts?.inventory?.items??[]),...(facts?.materials?.permanent??[]),...people(facts).flatMap(p=>p.items??[])];

export function storyEventReferences(value:unknown,ids=new Set<string>()):Set<string>{
 if(typeof value==='string')ids.add(value);
 else if(value&&typeof value==='object')Object.values(value).forEach(v=>storyEventReferences(v,ids));
 return ids;
}

/** Inputs have already passed public/private/group knowledge selection. Only exact
 * identities in an actual action/receipt select profiles; raw strings never create one. */
export function captureStoryEventContext(result:StoryStepResult,before:any,after:any):StoryEventContext{
 const ids=storyEventReferences([result.action,result.receipt]);
 for(const f of [before,after])if(f?.player?.id)ids.add(f.player.id);
 const snapshot=(facts:any):StoryEventSnapshot=>structuredClone({time:facts?.time??null,location:facts?.location??null,
  people:people(facts).filter(p=>ids.has(p.id)),
  ...(facts?.personContracts?{personContracts:facts.personContracts.filter((r:any)=>ids.has(r.id))}:{}),
  objects:items(facts).filter((i,index,rows)=>ids.has(i.id??i.itemId??i.fingerprint)&&rows.findIndex(v=>(v.id??v.itemId??v.fingerprint)===(i.id??i.itemId??i.fingerprint))===index)});
 return {before:snapshot(before),after:snapshot(after)};
}

export function validateStoryEventContext(context:StoryEventContext){
 if(!context||Object.keys(context).some(k=>!['before','after'].includes(k)))throw Error('行动观察资料无效');
 for(const part of [context.before,context.after]){
  if(!part||Object.keys(part).some(k=>!['time','location','people','objects','personContracts'].includes(k))||!Array.isArray(part.people)||!Array.isArray(part.objects)||part.personContracts!==undefined&&!Array.isArray(part.personContracts))throw Error('行动观察快照无效');
  const ids=new Set<string>();
  for(const p of part.people){if(typeof p?.id!=='string'||!p.id||ids.has(p.id))throw Error('行动人物观察重复或缺少身份');ids.add(p.id);}
 }
}

export function storyPersonObservations(turn:StoryTurn){
 const observations:{person:any;source:{snapshot:'before'|'after';step?:number;time:any;location:any}}[]=[];
 const add=(rows:any[],snapshot:'before'|'after',facts:any,step?:number)=>{
  for(const person of rows)observations.push({person,source:{snapshot,...(step===undefined?{}:{step}),time:facts?.time??null,location:facts?.location??null}});
 };
 add(people(turn.before),'before',turn.before);
 for(const r of turn.results)if(r.context)for(const snapshot of ['before','after'] as const)add(r.context[snapshot].people,snapshot,r.context[snapshot],r.step);
 add(people(turn.after),'after',turn.after);
 return observations;
}

/** Preserve when an object was known, including records that are no longer in
 * the final scene/inventory. These are observations, not current ownership. */
export function storyObjectObservations(turn:StoryTurn){
 const observations:{object:any;source:{snapshot:'before'|'after';step?:number;time:any;location:any}}[]=[];
 const add=(rows:any[],snapshot:'before'|'after',facts:any,step?:number)=>{
  for(const object of rows)observations.push({object,source:{snapshot,...(step===undefined?{}:{step}),time:facts?.time??null,location:facts?.location??null}});
 };
 add(items(turn.before),'before',turn.before);
 for(const r of turn.results)if(r.context)for(const snapshot of ['before','after'] as const)add(r.context[snapshot].objects,snapshot,r.context[snapshot],r.step);
 add(items(turn.after),'after',turn.after);
 return observations;
}

/** Current scene plus actual earlier participants. A departed profile keeps its
 * observation time, and never gains today's remote resources or whereabouts. */
export function storyTurnPeople(turn:StoryTurn){
 const ids=storyEventReferences(turn.results.map(r=>[r.action,r.receipt]));
 for(const p of people(turn.after))ids.add(p.id);
 const selected=new Map<string,ReturnType<typeof storyPersonObservations>[number]>();
 for(const observed of storyPersonObservations(turn))if(ids.has(observed.person.id))selected.set(observed.person.id,observed);
 return [...selected.values()];
}

export function storyFirstAppearance(turn:StoryTurn,id:string,step?:number){
 const observed=storyPersonObservations(turn);
 return observed.find(o=>o.person.id===id&&o.source.step===step&&o.source.snapshot==='after')
  ??[...observed].reverse().find(o=>o.person.id===id&&o.source.step===undefined&&o.source.snapshot==='after');
}
