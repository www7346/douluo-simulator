import {compactStoryRepairReadings} from './story-repair-readings';
import {promptMessage,promptDataMessage,factReferencePromptFields} from '../runtime/model-prompt-templates';
import {createHash} from 'node:crypto';
import type {ChatMessage} from '../runtime/model-gateway';
import {prepareStoryProseRepair,type StoryProseRepair} from './story-prose-repair';

type Plan=ReturnType<typeof prepareStoryProseRepair>;
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
/** Equal background records can be shared; performed actions and interval
 * checkpoints stay beside their section. Equality includes the observation
 * time/source, so a different world state never inherits an earlier record. */
function shareSectionContexts(plans:Plan[]){
 const sections=plans.map(plan=>({packageId:plan.packet.packageId,facts:structuredClone(plan.packet.writingFacts) as Record<string,any>}));
 type Entry={section:number;path:string;parent:Record<string,any>;key:string};
 type Group={name:string;value:unknown;entries:Entry[]};
 const groups=new Map<string,Group>();
 const add=(section:number,path:string,parent:Record<string,any>,key:string)=>{
  const value=parent[key];if(!value||typeof value!=='object')return;
  const identity=JSON.stringify([key,value]),group:Group=groups.get(identity)??{name:key,value,entries:[]};
  group.entries.push({section,path,parent,key});groups.set(identity,group);
 };
 for(const [i,section] of sections.entries()){
  for(const key of ['scene','participants','continuity','pending'])add(i,'/'+key,section.facts,key);
  for(const [eventIndex,event] of (section.facts.events??[]).entries())for(const key of ['battleBackground','wholeBattleReference'])add(i,`/events/${eventIndex}/facts/${key}`,event.facts,key);
 }
 const sharedContexts:{name:string;sources:{packageId:string;factPath:string}[];facts:unknown}[]=[],relocations:{from:string;to:string}[]=[];
 for(const {name,value,entries} of groups.values()){
  if(new Set(entries.map(entry=>entry.section)).size<2)continue;
  const to=`/writingFacts/sharedContexts/${sharedContexts.length}/facts`,reference={sharedContextPath:to};
  const shared={name,sources:entries.map(entry=>({packageId:sections[entry.section].packageId,factPath:entry.path})),facts:value};
  if(JSON.stringify(shared).length+entries.length*JSON.stringify(reference).length>=entries.length*JSON.stringify(value).length)continue;
  sharedContexts.push(shared);
  for(const entry of entries){entry.parent[entry.key]={...reference};relocations.push({from:`/writingFacts/sections/${entry.section}/facts${entry.path}`,to});}
 }
 return {sections,sharedContexts,relocations};
}
/** One repair pass over the confirmed ranges in the whole report. The existing
 * replacement protocol and per-candidate validators retain all edit authority.
 * A range points to its own fact scope; identical local paths in other sections
 * cannot silently change which source the requested correction refers to. */
export function combineStorySectionRepairs(plans:Plan[]){
 if(!plans.length)throw Error('整篇修复缺少已确认的范围');
 if(plans.length===1)return {...plans[0],split:(value:StoryProseRepair)=>[plans[0].validate(value)]};
 // Two different sections can legitimately contain identical draft text, so
 // their local candidate/range hashes alone are not a report-wide identity.
 const scopeRange=(i:number,id:string)=>`s${i+1}.${id}`;
 const ranges=plans.flatMap((plan,index)=>plan.ranges.map(range=>({index,localId:range.rangeId,id:scopeRange(index,range.rangeId)})));
 const rangeIds=ranges.map(range=>range.id);
 const context=shareSectionContexts(plans);
 const offsets=plans.map((_,i)=>plans.slice(0,i).reduce((sum,plan)=>sum+plan.packet.writingUnits.units.length,0));
 const factsPath=(i:number)=>`/writingFacts/sections/${i}/facts`;
 const readingPath=(i:number,path:string)=>{
  if(path.startsWith('/writingFacts/')){
   const actual=factsPath(i)+path.slice('/writingFacts'.length),shared=context.relocations.find(move=>actual===move.from||actual.startsWith(move.from+'/'));
   return shared?shared.to+actual.slice(shared.from.length):actual;
  }
  const match=path.match(/^\/writingUnits\/units\/(\d+)(\/.*)?$/);
  if(!match||Number(match[1])>=plans[i].packet.writingUnits.units.length)throw Error('合并修复的事实位置不属于原资料');
  return `/writingUnits/units/${offsets[i]+Number(match[1])}`+(match[2]??'');
 };
 const references=(i:number,path:string)=>{
  const reference=plans[i].packet.referencedFacts.find(ref=>ref.factPath===path);
  if(!reference)throw Error('修复事项缺少原有来源');
  return reference.readingPaths.map(path=>readingPath(i,path));
 };
 const packet={kind:'story-prose-repair',packageId:hash(plans.map(plan=>plan.packet.packageId)),
  candidateId:hash(plans.map(plan=>[plan.packet.packageId,plan.packet.candidateId])),
  writingFacts:{sharedContexts:context.sharedContexts,sections:context.sections},
  factReferences:plans.map((plan,i)=>({...plan.packet.factReferences,writingFactsPath:factsPath(i)})),
  writingUnits:{units:plans.flatMap((plan,i)=>plan.packet.writingUnits.units.map(unit=>({...unit,writingFactsPath:factsPath(i)})))},
  editableRanges:plans.flatMap((plan,i)=>plan.packet.editableRanges.map(range=>({...range,rangeId:scopeRange(i,range.rangeId),writingFactsPath:factsPath(i),
   issues:range.issues.map(issue=>({...issue,references:issue.references.map(ref=>({...ref,readingPaths:references(i,ref.factPath)}))}))}))),
  referencedFacts:plans.flatMap((plan,i)=>plan.packet.referencedFacts.map(ref=>({...ref,writingFactsPath:factsPath(i),readingPaths:ref.readingPaths.map(path=>readingPath(i,path))}))),
  repetitionConflicts:plans.flatMap(plan=>plan.packet.repetitionConflicts.map(conflict=>({...conflict,packageId:plan.packet.packageId}))),
 };
 // Check the actual transport coordinates, including relocated event accounts.
 for(const ref of packet.referencedFacts)for(const path of ref.readingPaths){
  let node:unknown=packet;
  for(const key of path.slice(1).split('/').map(key=>key.replace(/~1/g,'/').replace(/~0/g,'~'))){
   if(!node||typeof node!=='object'||!Object.hasOwn(node,key))throw Error('合并修复的阅读位置不存在');
   node=(node as Record<string,unknown>)[key];
  }
 }
 const split=(value:StoryProseRepair)=>{
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!['candidateId','replacements'].includes(key))
   ||value.candidateId!==packet.candidateId||!Array.isArray(value.replacements)||value.replacements.length!==rangeIds.length
   ||value.replacements.some(r=>!r||!rangeIds.includes(r.rangeId))||new Set(value.replacements.map(r=>r.rangeId)).size!==rangeIds.length)throw Error('整篇修复须覆盖全部当前指定范围，不能扩大或遗漏');
  const parts=plans.map((plan,index)=>plan.validate({candidateId:plan.packet.candidateId,replacements:value.replacements.filter(r=>ranges.some(range=>range.index===index&&range.id===r.rangeId))
   .map(r=>({...r,rangeId:ranges.find(range=>range.id===r.rangeId)!.localId}))}));
  if(parts.flatMap(part=>part.replacements).reduce((sum,r)=>sum+r.text.length,0)>24000)throw Error('整篇修复文字超过保存上限');
  return parts;
 };
 const validate=(value:unknown)=>{split(value as StoryProseRepair);return value as StoryProseRepair;};
 const transportPacket=compactStoryRepairReadings(packet);
 const messages:ChatMessage[]=[promptMessage('prose-repair'),promptDataMessage(transportPacket,Object.assign({},...plans.map((_,i)=>factReferencePromptFields('factReferences.'+i))))];
 return {messages,packet,transportPacket,split,validate};
}
