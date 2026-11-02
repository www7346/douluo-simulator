import {modelPromptText} from '../runtime/model-prompt-templates';
import {extractStoryInlineCards,inlineCardProtocol,type StoryInlineCard} from '../shared/story-inline-cards';
import type {StoryWritingPackage} from './story-writing-package';
import {storyBattleCheckpointSummary} from '../runtime/story-battle-conclusion';
import {storyBattleEventUnits} from '../runtime/story-battle-event-units';
export {storyBattleCourseEnds} from '../runtime/story-battle-event-units';

/** Ephemeral writing coordinates over existing receipts, never gameplay state. */
export interface StoryWritingUnit {
 id:string;eventIndex:number;step:number;sourcePath:string;battleId?:string;eventIndexes:number[];steps:number[];
 firstPassage?:number;lastPassage?:number;firstSequence?:number;lastSequence?:number;
}
export interface StoryUnitSpan {unitId:string;start:number;end:number}
export interface StoryUnitReading {prose:string;spans:StoryUnitSpan[];continuation?:true}
export const STORY_WRITING_UNITS_VERSION=3;

export function storyWritingUnits(p:StoryWritingPackage):StoryWritingUnit[]{
 const units:StoryWritingUnit[]=[],prefix=`u${p.id.slice(0,12)}`;let pending:number[]=[];
 const flushEvents=(attach?:StoryWritingUnit)=>{
  if(!pending.length)return;
  if(attach&&pending.every(i=>p.facts.events[i].action==='describe')){
   attach.eventIndexes=[...new Set([...attach.eventIndexes,...pending])].sort((a,b)=>a-b);attach.steps=attach.eventIndexes.map(i=>p.facts.events[i].step);
  }else{
   const first=pending[0];units.push({id:`${prefix}-e${first}-${pending.at(-1)}`,eventIndex:first,step:p.facts.events[first].step,sourcePath:'/events',eventIndexes:[...pending],steps:pending.map(i=>p.facts.events[i].step)});
  }
  pending=[];
 };
 for(const [eventIndex,event] of p.facts.events.entries()){
  const path=`/events/${eventIndex}`,passages=event.facts.battle?.account?.passages;
  if(!passages?.length){pending.push(eventIndex);continue;}
  const priorDescriptions=pending.every(i=>p.facts.events[i].action==='describe')?[...pending]:[];
  if(priorDescriptions.length)pending=[];else flushEvents();
  const firstUnit=units.length;
  for(const {first,last} of storyBattleEventUnits(passages)){
   const firstSequence=passages[first].sourceSequences[0],lastSequence=passages[last].sourceSequences.at(-1);
   units.push({id:`${prefix}-e${eventIndex}-a${firstSequence}-${lastSequence}`,eventIndex,step:event.step,eventIndexes:[eventIndex],steps:[event.step],
    sourcePath:path+'/facts/battle/account/passages',battleId:event.facts.battle.id,firstPassage:first,lastPassage:last,firstSequence,lastSequence});
  }
  pending=priorDescriptions;flushEvents(units[firstUnit]);
 }
 flushEvents(units.at(-1)?.battleId?units.at(-1):undefined);
 if(!units.length)units.push({id:`${prefix}-scene`,eventIndex:-1,step:-1,sourcePath:'/scene',eventIndexes:[],steps:[]});
 return units;
}

/** Transport each existing performed account beside its owning writing unit.
 * The support facts keep identities, capabilities and checkpoints once; the
 * accounts are moved, never summarized again or duplicated. Review annotations
 * retain their original source coordinates after the same relocation.
 */
export function storyWritingReading(p:StoryWritingPackage,facts:StoryWritingPackage['facts'],continuation=false,purpose:'author'|'facts'='author'){
 const writingFacts=structuredClone(facts),protocol=storyWritingUnitProtocol(p,continuation);
 const units=protocol.units.map(unit=>{
  const record={...unit,marker:purpose==='author'?unit.marker:undefined};
  if(!unit.battleId)return record;
  const account=facts.events[unit.eventIndex].facts.battle.account;
  const passages=account.passages.slice(unit.firstPassage!,unit.lastPassage!+1);
  // Reuse the already compiled checkpoints at these exact boundaries. Never
  // borrow a later frame or infer an unknown midpoint from the final world.
  const phases=p.battleSources.find(source=>source.step===unit.step&&source.battleId===unit.battleId)?.process.phases??[];
  const start=phases.find((phase:any)=>phase.actionRange.first===unit.firstSequence);
  const end=phases.find((phase:any)=>phase.actionRange.last===unit.lastSequence);
  const boundary=(phase:any,key:'opening'|'closing',label:string)=>phase?{
   sourcePhase:phase.index,actionSequence:key==='opening'?phase.actionRange.first:phase.actionRange.last,
   statement:storyBattleCheckpointSummary(phase[key],label),
  }:undefined;
  return {...record,opening:boundary(start,'opening','这段经过开始时'),passages:structuredClone(passages),closing:boundary(end,'closing','这段经过结束时')};
 });
 for(const [eventIndex,event] of writingFacts.events.entries())if(event.facts.battle?.account){
  const account=event.facts.battle.account,selected=units.filter(u=>u.battleId&&u.eventIndex===eventIndex);
  const restored=selected.flatMap(u=>'passages' in u?u.passages:[]);
  if(JSON.stringify(restored)!==JSON.stringify(account.passages))throw Error('事件单元的阅读资料未完整覆盖本场实际经过');
  delete account.passages;
  account.writingUnitIds=selected.map(unit=>unit.id);
 }
 // Marker syntax belongs to raw author output. Facts-only consumers receive the
 // same source units, while code retains responsibility for format validation.
 return {writingFacts,writingUnits:{format:purpose==='author'?protocol.format:undefined,units}};
}

/** Resolve canonical evidence coordinates against this actual reading, including
 * accounts relocated under writing units. Parent facts may span both locations.
 * These are transport links; canonical evidence and game state stay unchanged. */
export function storyReadingFactPaths(reading:ReturnType<typeof storyWritingReading>,factPath:string):string[]{
 const relocated=reading.writingUnits.units.flatMap((unit,i)=>'passages' in unit?
  [{from:unit.sourcePath,to:`/writingUnits/units/${i}/passages`,first:unit.firstPassage!,last:unit.lastPassage!}]:[]);
 let paths:string[]|undefined;
 for(const entry of relocated){
  if(factPath===entry.from){paths??=[];paths.push(entry.to);continue;}
  if(factPath.startsWith(entry.from+'/')){
   const suffix=factPath.slice(entry.from.length+1),match=suffix.match(/^(\d+)(\/.*)?$/);
   if(match&&Number(match[1])>=entry.first&&Number(match[1])<=entry.last){paths=[entry.to+'/'+(Number(match[1])-entry.first)+(match[2]??'')];break;}
  }
 }
 paths??=['/writingFacts'+factPath,...relocated.filter(entry=>entry.from.startsWith(factPath+'/')).map(entry=>entry.to)];
 for(const path of paths){
  let node:unknown=reading;
  for(const key of path.slice(1).split('/').map(k=>k.replace(/~1/g,'/').replace(/~0/g,'~'))){
   if(!node||typeof node!=='object'||!Object.hasOwn(node,key))throw Error('事实引用在实际发送的阅读资料中无法定位');
   node=(node as Record<string,unknown>)[key];
  }
 }
 return paths;
}

export function storyWritingUnitProtocol(p:StoryWritingPackage,continuation=false){
 const units=storyWritingUnits(p);
 return {format:modelPromptText({},units.length===1?'unit-single':'unit-multiple'),
  units:units.map(unit=>({...unit,marker:`[[unit:${unit.id}]]`}))};
}

/** Resolve source markers before presentation; the returned novel contains none. */
export function readStoryWritingUnits(raw:string,units:StoryWritingUnit[],continuation=false):StoryUnitReading{
 const indexes=new Map(units.map((unit,index)=>[unit.id,index])),seen=new Set<string>(),spans:StoryUnitSpan[]=[];
 const markers=[...raw.matchAll(/\[\[unit:([^\]\r\n]+)\]\](?:\r?\n)?/g)];
 if(units.length===1){
  // The source is unambiguous. An optional current marker at the end or between
  // paragraphs cannot change ownership; still reject duplicate/foreign markers.
  if(markers.length>1||markers.some(marker=>marker[1]!==units[0].id))throw Error('正文事件单元不属于本次资料或重复');
  const marker=markers[0];let prose=raw;
  if(marker){
   const start=marker.index!,end=start+marker[0].length;
   // A single known source has no boundary to infer. Remove its optional marker
   // wherever emitted; surrounding prose is preserved byte-for-byte.
   prose=raw.slice(0,start)+raw.slice(end);
  }
  if(!prose.trim())throw Error('正文事件单元为空');
  if(/\[\[(?:unit|card):/.test(prose))throw Error('正文含有无效事件标记或作者自行放置的资料卡');
  return {prose,spans:[{unitId:units[0].id,start:0,end:prose.length}],...(continuation?{continuation:true as const}:{})};
 }
 if(!markers.length||raw.slice(0,markers[0].index).trim())throw Error('正文缺少当前代码事件单元的起始标记');
 let prose='',previous=-1;
 for(const [index,marker] of markers.entries()){
  const id=marker[1],ordinal=indexes.get(id);
  if(ordinal===undefined||ordinal<=previous||seen.has(id))throw Error('正文事件单元不属于本次资料、重复或顺序倒退');
  const start=marker.index!+marker[0].length,end=markers[index+1]?.index??raw.length;
  const text=raw.slice(start,end);
  if(!text.trim())throw Error('正文事件单元没有实际文字');
  if(index>0&&!/(?:\r?\n){2}$/.test(prose))throw Error('正文事件单元须在自然段之间衔接');
  if(/\[\[(?:unit|card):/.test(text))throw Error('正文含有无效事件标记或作者自行放置的资料卡');
  spans.push({unitId:id,start:prose.length,end:prose.length+text.length});prose+=text;seen.add(id);previous=ordinal;
 }
 if(!continuation&&seen.size!==units.length)throw Error('正文尚未覆盖本次代码事件单元');
 return {prose,spans,...(continuation?{continuation:true as const}:{})};
}

/** Recreate the private marker form after a bounded edit without touching any
 * prose bytes. It can be read again by a resumed section workflow. */
export function serializeStoryWritingUnits(reading:StoryUnitReading){
 let raw=reading.prose;
 for(const span of [...reading.spans].reverse())raw=raw.slice(0,span.start)+`[[unit:${span.unitId}]]\n`+raw.slice(span.start);
 return raw;
}

export function rebaseStoryUnitSpans(reading:StoryUnitReading,prose:string,edits:readonly {start:number;end:number;replacementLength:number}[]):StoryUnitReading{
 const sorted=[...edits].sort((a,b)=>a.start-b.start);
 for(const edit of sorted)if(!reading.spans.some(span=>edit.start>=span.start&&edit.end<=span.end))throw Error('修复段落跨越了不同的代码事件单元');
 const move=(offset:number)=>offset+sorted.filter(edit=>edit.end<=offset).reduce((sum,edit)=>sum+edit.replacementLength-(edit.end-edit.start),0);
 const spans=reading.spans.map(span=>({...span,start:move(span.start),end:move(span.end)}));
 if(spans.some(span=>!prose.slice(span.start,span.end).trim()))throw Error('局部替换删空了必须表达的事件单元');
 return {...reading,prose,spans};
}

/** Code owns card placement. A true result cannot be inserted into a different
 * unit's prose just because a writer returned a syntactically valid marker. */
export function presentStoryWritingUnits(reading:StoryUnitReading,units:StoryWritingUnit[],cards:StoryInlineCard[]){
 const selected=new Set(inlineCardProtocol(cards).items.map(item=>item.marker));
 const placements:{offset:number;cardId:string}[]=[];
 const boundary=(offset:number)=>{
  if(offset===0||offset===reading.prose.length)return offset;
  const separator=reading.prose.slice(0,offset).match(/\r?\n[ \t]*\r?\n$/);
  if(!separator)throw Error('事件单元之间缺少资料卡所需的自然段边界');
  return separator.index!+separator[0].indexOf('\n')+1;
 };
 for(const card of cards.filter(card=>selected.has(`[[card:${card.id}]]`))){
  const candidates=units.filter(unit=>(card.source.step===undefined||unit.steps.includes(card.source.step))&&(!card.source.battleId||unit.battleId===card.source.battleId));
  let unit:StoryWritingUnit|undefined;
  if(card.source.battleId){
   const sequence=card.source.sequence;
   unit=sequence===0?candidates[0]:candidates.find(unit=>sequence!==undefined&&sequence>=unit.firstSequence!&&sequence<=unit.lastSequence!);
   if(!unit&&card.kind==='battle-state')unit=candidates.at(-1);
  }else unit=candidates[0];
  if(!unit&&card.kind==='person'&&card.source.step===undefined)unit=units[0];
  const span=unit&&reading.spans.find(span=>span.unitId===unit!.id);if(!span)continue;
  const opening=card.kind==='person'||card.kind==='battle-state'&&card.source.sequence===0;
  placements.push({offset:boundary(opening?span.start:span.end),cardId:card.id});
 }
 const sequence=(id:string)=>cards.find(card=>card.id===id)?.source.sequence??-1;
 placements.sort((a,b)=>a.offset-b.offset||sequence(a.cardId)-sequence(b.cardId));
 let raw=reading.prose;
 // These markers are internal representation; the player sees existing cards.
 for(const placement of [...placements].reverse())raw=raw.slice(0,placement.offset)+`[[card:${placement.cardId}]]`+raw.slice(placement.offset);
 const parsed=extractStoryInlineCards(raw,cards);
 if(parsed.prose!==reading.prose||parsed.omitted.length)throw Error('事件单元的资料卡位置未能对应当前正文');
 return {raw,prose:reading.prose,presentation:parsed.presentation};
}
