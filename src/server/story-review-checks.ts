import type {StoryWritingPackage} from './story-writing-package';
import {StoryReviewFormatError} from './story-review-validation-error';
import {storyReviewEvidence} from './story-review-evidence';
import {storyReviewProse} from './story-review-prose';
import {storyWritingUnits,type StoryUnitReading} from './story-writing-units';
import {readStoryReviewClaim} from './story-review-claim';

export const STORY_KEY_REVIEW_VERSION=19;
export type StoryDifferenceImportance='key-fact'|'detail'|'uncertain';
export function storyDifferenceSeverity(importance:unknown):'major'|'minor'|'uncertain'{
 if(importance==='key-fact')return 'major';
 if(importance==='detail')return 'minor';
 if(importance==='uncertain')return 'uncertain';
 throw new StoryReviewFormatError('事实差异必须区分关键事实、可容许细节或无法确定');
}
export interface StoryKeyCheck {id:string;kind:string;unitId?:string;unitIds?:string[];required:boolean;evidenceIds:string[];passageIds:string[]}
export interface StoryKeyReview {id:string;status:'consistent'|'contradicted'|'not-mentioned'|'uncertain';passageIds:string[];evidenceIds:string[];reason:string;impact:string;importance?:StoryDifferenceImportance;conflictPassageIds?:string[]}

/** Request-local reading coverage over existing facts, not extra game variables.
 * Identities, performed courses and endings are separate questions; a valid
 * empty findings list does not substitute for actually checking them. */
export function storyKeyChecks(p:StoryWritingPackage,prose:string,reading?:StoryUnitReading):StoryKeyCheck[]{
 const {paths}=storyReviewEvidence(p),spans=storyReviewProse(prose).spans,units=storyWritingUnits(p);
 if(reading&&reading.prose!==prose)throw Error('关键核对的段落映射不属于当前正文');
 const checks:StoryKeyCheck[]=[],courses=new Set<number>();
 const references=(prefixes:string[])=>[...paths].filter(([,path])=>prefixes.some(prefix=>path===prefix)).map(([id])=>id);
 const passages=(unitId?:string)=>{
  const range=unitId&&reading?.spans.find(span=>span.unitId===unitId);
  return [...spans].filter(([,span])=>!range||span.start>=range.start&&span.end<=range.end).map(([id])=>id);
 };
 const add=(kind:string,prefixes:string[],unitId?:string,required=false,unitIds?:string[])=>{
  const evidenceIds=references(prefixes);if(!evidenceIds.length)return;
  checks.push({id:`k${p.id.slice(0,12)}.${checks.length+1}`,kind,...(unitId?{unitId}:{}),...(unitIds?{unitIds}:{}),required,evidenceIds,passageIds:passages(unitId)});
 };
 for(const [i,person] of p.facts.participants.entries()){
  const backgroundPaths=p.facts.events.flatMap((event,j)=>(event.facts.battleBackground?.participants??[]).flatMap((record:any,k:number)=>record.id===person.id?[`/events/${j}/facts/battleBackground/participants/${k}`]:[]));
  add('人物身份、年龄与等级、已具备的能力及限制',[`/participants/${i}`,...backgroundPaths]);
 }
 add('场景地点、起止日期时刻与实际经过时间',['/scene/before','/scene/after']);
 for(const unit of units){
  if(reading?.continuation&&!reading.spans.some(span=>span.unitId===unit.id))continue;
  if(unit.battleId){
   const base=`/events/${unit.eventIndex}`,battle=p.facts.events[unit.eventIndex].facts.battle;
   // A writing-unit boundary locates prose and limits a repair; it does not say
   // each paragraph literally enumerates that exact action interval. Check the
   // recorded course together so ordinary narrative compression is not mistaken
   // for an unperformed action simply because it belongs to a neighboring unit.
   if(!courses.has(unit.eventIndex)){
    courses.add(unit.eventIndex);
    const related=units.filter(u=>u.eventIndex===unit.eventIndex&&u.battleId===unit.battleId);
    const sources=battle.account.passages.map((_:unknown,i:number)=>`${base}/facts/battle/account/passages/${i}`);
    // The settled course remains complete evidence, but ordinary choreography
    // and intermediate sensations are no longer separate acceptance gates.
    add('本场武魂与魂技的能力含义、施展来源，以及正文明确写出的属性、时间和数值',sources,undefined,false,related.map(u=>u.id));
   }
   if(unit.lastSequence===battle.account.passages.at(-1)?.sourceSequences.at(-1)){
    const ending=!p.origin.writingSection||p.origin.writingSection.includesEnding;
    add(ending?'本场终局、生死与胜负、其后的场外结算':'当前阶段真实结束状态',
     [base,`${base}/facts/battle/writingInterval/closing`,`${base}/facts/battle/closing`,`${base}/facts/battle/aftermath`],unit.id,ending&&!reading?.continuation);
   }
  }
  for(const i of unit.eventIndexes){const event=p.facts.events[i];if(event.facts.battle||['describe','clarify'].includes(event.action))continue;
   add('本轮执行、失败和跳过的边界，实际对象、终点、时点、资源变化与正式决定',[`/events/${i}`,`/events/${i}/facts`],unit.id);
  }
 }
 if(p.facts.changes.length&&!p.origin.battleId)add('本轮持久变化与后续行动条件',p.facts.changes.map((_,i)=>`/changes/${i}`));
 return checks;
}

/** Validate coverage and exact source coordinates before semantic judgments are
 * handled by the existing citation verifier. The question's source anchors are
 * code-owned; prose may mention that event outside its assigned unit. This does
 * not turn a valid coordinate into proof of a semantic judgment. */
export function readStoryKeyReview(value:any,checks:StoryKeyCheck[],prose:string):StoryKeyReview[]{
 if(!Array.isArray(value)||value.length!==checks.length)throw Error('关键事实审阅没有逐项覆盖本次核对目录');
 const seen=new Set<string>(),known=new Map(checks.map(check=>[check.id,check])),spans=storyReviewProse(prose).spans;
 return value.map((entry:any)=>{
  const check=known.get(entry?.id);
  if(!check||seen.has(entry.id))throw Error('关键事实审阅含外来、重复或无效结论');
  if(!['consistent','contradicted','not-mentioned','uncertain'].includes(entry.status))throw new StoryReviewFormatError('关键事实审阅含外来、重复或无效结论');
  seen.add(entry.id);
  // Successful coverage is a status, not another essay. Only an actual
  // difference, unresolved claim or missing required ending needs reasoning.
  const explains=entry.status==='contradicted'||entry.status==='uncertain'||check.required&&entry.status==='not-mentioned';
  for(const field of ['reason','impact'])if(explains||entry[field]!==undefined)
   if(typeof entry[field]!=='string'||!entry[field].trim()||entry[field].length>600)throw Error('关键事实审阅缺少判断依据或影响');
  if(!Array.isArray(entry.passageIds))throw Error('关键事实审阅缺少正文段落');
  if(entry.passageIds.some((id:any)=>!spans.has(id))||new Set(entry.passageIds).size!==entry.passageIds.length)throw Error('关键事实审阅引用了别的候选或重复段落');
  if(['consistent','contradicted'].includes(entry.status)&&!entry.passageIds.length)throw Error('相符或矛盾结论必须引用候选原段');
  let conflictPassageIds=entry.conflictPassageIds;
  if(entry.status==='contradicted'){
   storyDifferenceSeverity(entry.importance);
   // A permitted detail cannot authorize repair. Its already-verified context
   // can locate the observation; actual key conflicts still need exact targets.
   if(entry.importance==='detail'&&(conflictPassageIds===undefined||Array.isArray(conflictPassageIds)&&!conflictPassageIds.length))conflictPassageIds=[...entry.passageIds];
   if(!Array.isArray(conflictPassageIds)||!conflictPassageIds.length
    ||conflictPassageIds.some((id:any)=>!spans.has(id))
    ||new Set(conflictPassageIds).size!==conflictPassageIds.length)throw Error('矛盾结论须从当前候选中明确定位实际差异段落');
   const claim=readStoryReviewClaim(entry.claim,conflictPassageIds,prose);
   if(claim.kind==='omitted')return {id:entry.id,status:'not-mentioned',passageIds:entry.passageIds,evidenceIds:[...check.evidenceIds],reason:entry.reason,impact:entry.impact};
   conflictPassageIds=conflictPassageIds.filter((id:string)=>spans.get(id)!.text.includes(claim.quote));
  }
  // A reviewer may cite the surrounding text to explain an omission. These
  // coordinates remain context, not evidence that the omitted fact was stated.
  return {id:entry.id,status:entry.status,passageIds:entry.passageIds,evidenceIds:[...check.evidenceIds],reason:entry.reason??(entry.status==='consistent'?'已逐项核对相符':'未提及此项'),impact:entry.impact??'未报告差异影响',
   ...(entry.status==='contradicted'?{importance:entry.importance,conflictPassageIds}:{})};
 });
}
