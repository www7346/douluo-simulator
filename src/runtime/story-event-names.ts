import type {StoryStepResult,StoryTurn} from './story-turns';
import {storyTurnPeople} from '../shared/story-event-context';
export interface StoryEventNames {actorId:string|null;person:(id:string|null|undefined)=>string;item:(id:string|null|undefined)=>string;location:(id:string|null|undefined)=>string;soul:(id:string|null|undefined)=>string;skill?:(id:string|null|undefined)=>string}
/** Names only, from the same frozen observations as the event. No world lookup. */
export function storyEventNames(turn:StoryTurn,result:StoryStepResult,actorId:string|null):StoryEventNames{
 const people=[...(result.context?.after.people??[]),...(result.context?.before.people??[]),...storyTurnPeople(turn).map(o=>o.person)];
 const inventory=(f:any):any[]=>Array.isArray(f?.inventory)?f.inventory:f?.inventory?.items??[];
 const items=[...(result.context?.after.objects??[]),...(result.context?.before.objects??[]),...inventory(turn.after),...inventory(turn.before)];
 const locations=[result.context?.before.location,result.context?.after.location,turn.before?.location,turn.after?.location,...(turn.before?.huntingDestinations??[]),...(turn.after?.huntingDestinations??[])];
 const souls=people.flatMap(p=>p.martialSouls??[]);
 const skills=people.flatMap(p=>p.abilities??[]);
 return {actorId,person:id=>people.find(p=>p.id===id)?.name??id??'人物',item:id=>items.find(i=>(i.id??i.itemId??i.fingerprint)===id)?.name??id??'名称未记录的物品',
  location:id=>locations.find(l=>l?.id===id)?.name??id??'地点未记录',soul:id=>souls.find(s=>s.id===id)?.name??id??'武魂未记录',skill:id=>skills.find(s=>s.id===id)?.name??'这项能力'};
}
export const storyEventTime=(t:any)=>t&&[t.day,t.hour,t.minute].every(Number.isFinite)?`第${t.day}日${t.hour}时${t.minute}分`:'时点未记录';
