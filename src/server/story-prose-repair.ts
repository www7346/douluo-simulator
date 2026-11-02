import {compactStoryRepairReadings} from './story-repair-readings';
import {promptMessage,promptDataMessage,factReferencePromptFields} from '../runtime/model-prompt-templates';

export {STORY_PROSE_REPAIR_CONTRACT} from '../shared/model-prompt-defaults';
import {createHash} from 'node:crypto';
import type {ChatMessage} from '../runtime/model-gateway';
import type {StoryRepetitionConflict} from '../runtime/story-repetition-checks';
import {extractStoryInlineCards,type StoryInlineCard} from '../shared/story-inline-cards';
import type {StoryFactJudgment} from './story-fact-review';
import {storyFactRepairFindings,storyReviewReferencedFacts} from './story-fact-review';
import {storyReviewProse} from './story-review-prose';

import type {StoryWritingPackage} from './story-writing-package';

import {storyFactReferenceProtocol,storyFactReferenceReading,renderStoryFactReferences} from './story-fact-references';
import {storyWritingUnits,storyWritingReading,storyReadingFactPaths,type StoryUnitReading} from './story-writing-units';

export const STORY_PROSE_REPAIR_VERSION=10;

export interface StoryProseReplacement {rangeId:string;text:string}
export interface StoryProseRepair {candidateId:string;replacements:StoryProseReplacement[]}
interface RepairRange {rangeId:string;start:number;end:number;first:number;last:number;unitId?:string}

/** Verified coordinates, never a model-selected enlargement of the rewrite. */
export function prepareStoryProseRepair(p:StoryWritingPackage,prose:string,conflicts:readonly StoryFactJudgment[],repetitions:readonly StoryRepetitionConflict[]=[],reading?:StoryUnitReading){
 const candidateId=createHash('sha256').update(prose).digest('hex'),indexed=storyReviewProse(prose),selected=new Set<string>();
 for(const conflict of conflicts){
  const passage=conflict.passage,span=passage&&indexed.spans.get(passage.id);
  if(!span||span.start!==passage!.start||span.end!==passage!.end||span.text!==conflict.quote)throw Error('修复范围不属于当前已核验的正文段落');
  selected.add(passage!.id);
 }
 // Exact whole-candidate repetition affects all spans, never a preceding turn.
 if(repetitions.length)for(const id of indexed.spans.keys())selected.add(id);
 if(reading&&reading.prose!==prose)throw Error('修复事件范围与当前候选不一致');
 const units=new Set(reading?storyWritingUnits(p).map(unit=>unit.id):[]);
 // Only paragraphs carrying individually located conflicts are editable.
 // Adjacent selected paragraphs share a range; a gap or an event boundary
 // always stays locked. Battle citations and ending checks grant no extra scope.
 const paragraphs=[...indexed.spans],ranges:RepairRange[]=[];
 for(const [i,[id,span]] of paragraphs.entries()){
  if(!selected.has(id))continue;
  const owner=reading?.spans.find(s=>span.start>=s.start&&span.end<=s.end);
  if(reading&&(!owner||!units.has(owner.unitId)))throw Error('修复段落缺少对应的当前事件单元');
  const previous=ranges.at(-1);
  if(previous&&previous.last===i-1&&previous.unitId===owner?.unitId){previous.last=i;previous.end=span.end;}
  else ranges.push({rangeId:`r${candidateId.slice(0,16)}.${ranges.length+1}`,start:span.start,end:span.end,first:i,last:i,...(owner?{unitId:owner.unitId}:{})});
 }
 if(!ranges.length)throw Error('当前候选没有可修复的已核验段落');
 const editableRanges=ranges.map(range=>{
  const adjacent=(i:number,tail:boolean)=>{const row=paragraphs[i];if(!row||selected.has(row[0]))return undefined;const text=row[1].text;return tail?text.slice(-300):text.slice(0,300);};
  const issues=storyFactRepairFindings(conflicts.filter(c=>c.passage!.start>=range.start&&c.passage!.end<=range.end)).map(({quote:_,...finding})=>finding);
  return {rangeId:range.rangeId,...(range.unitId?{unitId:range.unitId}:{}),firstPassageId:paragraphs[range.first][0],lastPassageId:paragraphs[range.last][0],
   mode:range.first===range.last?'correct-paragraph':'correct-passage-range',
   currentText:prose.slice(range.start,range.end),
   before:adjacent(range.first-1,true),after:adjacent(range.last+1,false),
   issues:issues.filter((issue,i)=>issues.findIndex(other=>JSON.stringify(other)===JSON.stringify(issue))===i)};
 });
 const factReading=storyWritingReading(p,storyFactReferenceReading(p).facts,Boolean(reading?.continuation),'facts');
 const referencedFacts=storyReviewReferencedFacts(p,[...conflicts]).map(({source:_,...reference})=>({...reference,readingPaths:storyReadingFactPaths(factReading,reference.factPath)}));
 // This is a replacement request. The author's marker-output instruction is not
 // part of its read-only fact data; only the current range JSON protocol applies.
 const packet={kind:'story-prose-repair',packageId:p.id,candidateId,writingFacts:factReading.writingFacts,writingUnits:{units:factReading.writingUnits.units},factReferences:storyFactReferenceProtocol(p),editableRanges,
  referencedFacts,repetitionConflicts:repetitions};
 const transportPacket=compactStoryRepairReadings(packet);
 const messages:ChatMessage[]=[promptMessage('prose-repair'),promptDataMessage(transportPacket,factReferencePromptFields())];
 const validate=(value:any):StoryProseRepair=>{
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['candidateId','replacements'].includes(k))
   ||value.candidateId!==candidateId||!Array.isArray(value.replacements)||value.replacements.length!==ranges.length)throw Error('修复须返回当前候选全部指定范围的替换');
  const seen=new Set<string>();let characters=0;
  for(const replacement of value.replacements){
   if(!replacement||typeof replacement!=='object'||Array.isArray(replacement)||Object.keys(replacement).some(k=>!['rangeId','text'].includes(k))
    ||!ranges.some(range=>range.rangeId===replacement.rangeId)||seen.has(replacement.rangeId)||typeof replacement.text!=='string')throw Error('修复范围越界、重复或结构无效');
   seen.add(replacement.rangeId);characters+=replacement.text.length;
   if(characters>24000||/\[\[(?:card|unit):/.test(replacement.text))throw Error('修复文字过长或混入由代码管理的卡片或事件标记');
  }
  return {candidateId,replacements:value.replacements.map((r:StoryProseReplacement)=>({rangeId:r.rangeId,text:r.text}))};
 };
 const apply=(value:StoryProseRepair,raw:string,cards:StoryInlineCard[])=>{
  const patch=validate(value),parsed=extractStoryInlineCards(raw,cards);
  if(parsed.prose!==prose)throw Error('修复候选正文或卡片来源已经变化');
  const edits=patch.replacements.map(r=>{
   const range=ranges.find(range=>range.rangeId===r.rangeId)!;
   let replacement=renderStoryFactReferences(r.text,p).text;
   // A full adjacent paragraph supplied only as context belongs to the retained
   // source. If it is copied verbatim at the replacement boundary, keep the
   // source copy exactly once. Never infer overlap from similar sentences,
   // clipped context, short dialogue or paragraphs inside the replacement.
   const copied=(index:number,text:string)=>{
    const row=paragraphs[index];return row&&!selected.has(row[0])&&row[1].text.length>=20&&row[1].text.length<=300&&row[1].text===text;
   };
   const first=[...storyReviewProse(replacement).spans.values()][0];
   if(first&&copied(range.first-1,first.text))replacement=replacement.slice(first.end).replace(/^[\r\n]+/,'');
   const last=[...storyReviewProse(replacement).spans.values()].at(-1);
   if(last&&copied(range.last+1,last.text))replacement=replacement.slice(0,last.start).replace(/[\r\n]+$/,'');
   return {...range,replacement};
  }).sort((a,b)=>a.start-b.start);
  let revised=prose;for(const edit of [...edits].reverse())revised=revised.slice(0,edit.start)+edit.replacement+revised.slice(edit.end);
  if(!revised.trim()||revised.length>24000)throw Error('局部修复后正文为空或超过保存上限');
  if(revised===prose)throw Error('局部修复没有改变已指出的错误段落');
  const offsetAfter=(offset:number)=>{
   let shift=0;
   for(const edit of edits){
    if(offset<=edit.start)break;
    if(offset<edit.end)return edit.start+shift+edit.replacement.length;
    shift+=edit.replacement.length-(edit.end-edit.start);
   }
   return offset+shift;
  };
  const placements=(parsed.presentation?.placements??[]).map(p=>({...p,offset:offsetAfter(p.offset)}));
  let revisedRaw=revised;
  for(const placement of [...placements].reverse())revisedRaw=revisedRaw.slice(0,placement.offset)+`[[card:${placement.cardId}]]`+revisedRaw.slice(placement.offset);
  if(extractStoryInlineCards(revisedRaw,cards).prose!==revised)throw Error('局部修复后的卡片位置与正文不一致');
  return {raw:revisedRaw,prose:revised,replacements:edits.length,edits:edits.map(e=>({start:e.start,end:e.end,replacementLength:e.replacement.length}))};
 };
 return {messages,packet,transportPacket,ranges,validate,apply};
}
