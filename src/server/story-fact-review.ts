import {promptMessage,promptDataMessage} from '../runtime/model-prompt-templates';
import {compactStoryPacketReadings} from './story-host-record-columns';

export {STORY_FACT_REVIEW_CONTRACT,STORY_FACT_REPAIR_CONTRACT} from '../shared/model-prompt-defaults';
import {PRIVATE_MESSAGE_CONTRACT} from '../shared/story-private-messages';
import {ModelGatewayError} from '../runtime/model-gateway';
import {parseStoryReviewJson} from './story-review-json';
import type {ModelGateway,ChatMessage} from '../runtime/model-gateway';
import type {ModelRecoveryBudget} from '../runtime/model-recovery-budget';
import {writingFactAt,type StoryWritingPackage} from './story-writing-package';
import {storyReviewEvidence,storyReviewFactAt} from './story-review-evidence';
import {storyReviewProse} from './story-review-prose';
import {storyReportReviewReadings} from './story-report-review-readings';
import {selectStoryWritingView} from './story-writing-view';
import {commerceWritingReadings} from '../runtime/story-commerce-reading';
import {STORY_AUTHOR_ROLE,STORY_PARTY_AUTHOR_ROLE} from './story-author-contract';
import type {PreviousWritingSection} from './story-battle-writing-sections';
import {storyReviewPresentation,type StoryReviewPresentation} from './story-review-presentation';
import {storyKeyChecks,readStoryKeyReview,storyDifferenceSeverity,type StoryKeyCheck,type StoryKeyReview} from './story-review-checks';
import {storyWritingReading,type StoryUnitReading} from './story-writing-units';
import {readStoryReviewClaim} from './story-review-claim';
import {storyReviewResponseSchema} from './story-review-response-schema';
import {StoryReviewFormatError} from './story-review-validation-error';

export interface StoryFactFinding {severity:'major'|'minor'|'uncertain';quote:string;factPath:string;subjectId:string|null;reason:string;impact:string;source?:{evidenceId?:string;passage?:{id:string;start:number;end:number};packageId:string;turn:number;section:string;receiptId:string|null;step:number|null;requestedFactPath?:string;battleId?:string;actionSequences?:number[];actionReceiptIds?:Array<string|null>;observation?:{kind:string;scope:string;time:unknown;commandId?:string;step?:number};identityComparison?:{factSubjectId:string;proseSubjectId:string}}}
export interface StoryFactJudgment {
 severity:StoryFactFinding['severity'];quote:string;reason:string;impact:string;
 passage?:{id:string;start:number;end:number};
 references:{evidenceId:string;factPath:string;subjectId:string|null;source?:StoryFactFinding['source']}[];
}
export interface StoryFactReview {packageId:string;requested:boolean;conflicts:StoryFactJudgment[];observations:StoryFactJudgment[];unverified:{finding:StoryFactJudgment;reason:string}[];coverage?:StoryKeyReview[]}

/** Category and importance are different semantic claims. A movement detail
 * is an action, but that category alone cannot make it a gameplay contradiction.
 * Exact source/paragraph validation remains mandatory for every judgment. */
const STORY_FACT_DIFFERENCES=new Map([['identity','身份'],['ability','能力'],['action','行为'],['outcome','结果'],['decision','决定'],['expression','表达'],['uncertain','未知']]);
export function storyFactDifferenceFindings(value:any,prose?:string){
 if(!value||!Array.isArray(value.findings)||value.findings.length>8)throw new StoryReviewFormatError('事实差异须返回至多八项findings');
 return {findings:value.findings.map((finding:any)=>{
  if(!finding||typeof finding!=='object'||Array.isArray(finding))throw new StoryReviewFormatError('事实差异必须说明本次识别的事实类别');
  // The current contract displays each code together with its Chinese label.
  // Accept exactly that advertised spelling too, never infer arbitrary aliases.
  const difference=[...STORY_FACT_DIFFERENCES].find(([code,label])=>finding.difference===code||finding.difference===code+label)?.[0];
  if(!difference)throw new StoryReviewFormatError('事实差异必须说明本次识别的事实类别');
  let severity=storyDifferenceSeverity(finding.importance);
  // An expression may misstate a level, ability or outcome. Its category does
  // not weaken the separately declared impact; keep major claims for the same
  // evidence validation and repair path. Unknown facts cannot be confirmed major.
  if(difference==='uncertain'&&severity==='major')throw Error('差异类别与重要程度相互矛盾');
  if(prose!==undefined){const claim=readStoryReviewClaim(finding.claim,[finding.passageId],prose);if(claim.kind==='omitted')severity='minor';}
  return {severity,passageId:finding.passageId,evidenceIds:finding.evidenceIds,reason:finding.reason,impact:finding.impact};
 })};
}
interface StoryFactEvidenceCheck {packageId:string;requested:boolean;conflicts:StoryFactFinding[];observations:StoryFactFinding[];unverified:{finding:StoryFactFinding;reason:string}[]}
function subjects(value:any,out=new Set<string>()):Set<string>{if(!value||typeof value!=='object')return out;for(const [key,v] of Object.entries(value)){if(['actorId','personId','unitId','subjectId','speakerId','listenerId','ownerId','recipientId','targetId','captorId','playerId','fromId','toId'].includes(key)&&typeof v==='string')out.add(v);else if(v&&typeof v==='object')subjects(v,out);}return out;}
/** Frozen identity records register subjects; a reference or arbitrary `id` does not.
 * Encounter units are real subjects without becoming world NPCs. Registration is
 * package-wide, while citationScope still limits each citation to its own record.
 */
function registeredSubjects(p:StoryWritingPackage){
 const ids=new Set<string>();
 const add=(id:unknown)=>{if(typeof id==='string'&&id)ids.add(id);};
 for(const person of p.facts.participants)add(person.id);
 for(const unit of p.facts.pending.battle?.participants??[])add(unit.id);
 for(const beast of p.facts.pending.expedition?.room?.beasts??[])add(beast.unitId);
 for(const event of p.facts.events)for(const battle of [event.facts.battle,event.facts.wholeBattleReference]){
  if(!battle)continue;
  for(const frame of [battle.opening,battle.closing,battle.writingInterval?.opening,battle.writingInterval?.closing])
   for(const unit of frame?.units??[])add(unit.id);
 }
 return ids;
}
/** Bind a nested record to its nearest explicit subject, not every person in a collection. */
function nestedSubjects(p:StoryWritingPackage,path:string,fallback:any){
 const people=registeredSubjects(p),parts=path.slice(1).split('/');
 for(let depth=parts.length;depth>1;depth--){
  const node=writingFactAt(p,'/'+parts.slice(0,depth).join('/'));
  if(!node||typeof node!=='object'||Array.isArray(node))continue;
  const direct=Object.fromEntries(Object.entries(node).filter(([,value])=>typeof value==='string'));
  const ids=subjects(direct);if(people.has(direct.id))ids.add(direct.id as string);
  if(ids.size)return ids;
 }
 return subjects(fallback);
}
function citationScope(p:StoryWritingPackage,path:string){
 const parts=path.slice(1).split('/'),first=parts[0];
 const source={packageId:p.id,turn:p.origin.turn,section:first,receiptId:null as string|null,step:null as number|null};
 if(first==='participants'){const person=p.facts.participants[Number(parts[1])];return {subjects:new Set([person?.id]),source};}
 if(first==='events'){
  const event=p.facts.events[Number(parts[1])],eventSource={...source,receiptId:event.source.receiptId,step:event.step};
  if(parts[2]==='facts'&&parts[3]==='battleBackground'){
   const background=event.facts.battleBackground,record=background.source;
   return {subjects:nestedSubjects(p,path,background),source:{...eventSource,battleId:record.battleId,
    observation:{kind:record.kind,scope:record.scope,time:structuredClone(background.scene?.time?.value??null),
     ...(record.commandId?{commandId:record.commandId}:{}),...(Number.isInteger(record.step)?{step:record.step}:{})}}};
  }
  if(parts[2]==='facts'&&['battle','wholeBattleReference'].includes(parts[3])&&['opening','closing'].includes(parts[4])&&parts[5]==='units'&&parts[6]!==undefined){
   // Encounter-only units need not be world NPCs. The selected frozen unit, not
   // the snapshot's current actor, owns its resources and life-state evidence.
   const battle=event.facts[parts[3]],unit=battle[parts[4]].units[Number(parts[6])];
   return {subjects:new Set([unit.id]),source:{...eventSource,battleId:battle.id}};
  }
  if(parts[2]==='facts'&&parts[3]==='battle'&&parts[4]==='openingSettlement'){
   const battle=event.facts.battle,opening=battle.openingSettlement;
   return {subjects:nestedSubjects(p,path,opening),source:{...eventSource,battleId:battle.id,receiptId:opening.receiptId??eventSource.receiptId}};
  }
  if(parts[2]==='facts'&&parts[3]==='battle'&&parts[4]==='writingInterval'){
   const battle=event.facts.battle,interval=battle.writingInterval;
   const sequences=event.facts.battle.account.passages.flatMap((p:any)=>p.sourceSequences);
   const provenance=p.battleSources.find(b=>b.step===event.step&&b.battleId===battle.id);
   const receipts=sequences.map((n:number)=>provenance?.actions.find((a:any)=>a.sequence===n));
   if(receipts.some((a:any)=>!a))throw Error('写作阶段检查点缺少原始来源');
   const unit=['opening','closing'].includes(parts[5])&&parts[6]==='units'&&parts[7]!==undefined?interval[parts[5]].units?.[Number(parts[7])]:null;
   return {subjects:unit?new Set([unit.id]):nestedSubjects(p,path,interval),source:{...eventSource,battleId:battle.id,actionSequences:sequences,actionReceiptIds:receipts.map((a:any)=>a.receiptId)}};
  }
  if(parts[2]==='facts'&&parts[3]==='battle'&&parts[4]==='course'){
   const battle=event.facts.battle,phase=parts[5]==='phases'&&parts[6]!==undefined?battle.course.phases[Number(parts[6])]:null;
   const turn=phase&&parts[7]==='turns'&&parts[8]!==undefined?phase.turns[Number(parts[8])]:null;
   const sequences:number[]=turn?[turn.sequence]:phase?.sourceSequences??battle.course.phases.flatMap((p:any)=>p.sourceSequences);
   const provenance=p.battleSources.find(b=>b.step===event.step&&b.battleId===battle.id),receipts=sequences.map(n=>provenance?.actions.find((a:any)=>a.sequence===n));
   if(receipts.some(a=>!a))throw Error('战斗主线缺少原始行动来源');
   const phases=phase?[phase]:battle.course.phases,owners=new Set<string>();
   if(turn){
    const action=battle.actions.find((a:any)=>(a.sourceSequences??[a.sequence]).includes(turn.sequence));
    if(!action)throw Error('战斗转折缺少原始行动');
    owners.add(action.actor.id);if(parts[9]!=='actorId')for(const id of subjects(action))owners.add(id);
   }else for(const current of phases){
    const original=provenance?.process.phases.find((p:any)=>p.index===current.index);
    if(!original||JSON.stringify(original.sourceSequences)!==JSON.stringify(current.sourceSequences))throw Error('战斗主线与原始阶段不一致');
    for(const frame of [original.opening,original.closing])for(const unit of frame.units??[])owners.add(unit.id);
   }
   return {subjects:owners,source:{...eventSource,battleId:battle.id,actionSequences:sequences,actionReceiptIds:receipts.map(a=>a.receiptId)}};
  }
  if(parts[2]==='facts'&&['battle','wholeBattleReference'].includes(parts[3])&&parts[4]==='usedAbilities'&&parts[5]!==undefined){
   const ability=event.facts[parts[3]].usedAbilities[Number(parts[5])],sequences=ability.useSummary.sourceSequences;
   const provenance=p.battleSources.find(b=>b.step===event.step&&b.battleId===event.facts.battle.id),receipts=sequences.map((n:number)=>provenance?.actions.find((a:any)=>a.sequence===n));
   if(receipts.some((a:any)=>!a))throw Error('招式使用概括没有对应的原始结算来源');
   return {subjects:new Set([ability.actorId]),source:{...eventSource,battleId:provenance!.battleId,actionSequences:sequences,actionReceiptIds:receipts.map((a:any)=>a.receiptId)}};
  }
  if(parts[2]==='facts'&&parts[3]==='battle'&&parts[4]==='account'&&parts[5]==='passages'){
   const passage=event.facts.battle.account.passages[Number(parts[6])],closing=parts[7]==='closingExchanges'?passage.closingExchanges[Number(parts[8])]:null,sequences=closing?.sourceSequences??passage.sourceSequences;
   const provenance=p.battleSources.find(b=>b.step===event.step&&b.battleId===event.facts.battle.id);
   const receipts=sequences.map((n:number)=>provenance?.actions.find((a:any)=>a.sequence===n));
   if(receipts.some((a:any)=>!a))throw Error('交锋经过没有对应的原始结算来源');
   let owners=nestedSubjects(p,path,passage);
   if(closing)owners=['actor','skill'].includes(parts[9])?new Set([closing.actor.id]):new Set([closing.actor.id,...subjects(closing)]);
   else if(parts[7]==='event'){
    if(parts[8]==='lifecycleReading'&&parts[9]!==undefined)owners=nestedSubjects(p,path,passage.event.lifecycleReading[Number(parts[9])]);
    else{
     const index=event.facts.battle.actions.findIndex((a:any)=>(a.sourceSequences??[a.sequence]).includes(sequences[0]));
     owners=citationScope(p,`/events/${parts[1]}/facts/battle/actions/${index}/${parts.slice(8).join('/')}`).subjects;
    }
   }else if(parts[7]==='actor')owners=new Set([passage.actor.id]);
   else if(parts[7]==='exchanges'&&parts[9]==='skill')owners=new Set([passage.exchanges[Number(parts[8])].actorId]);
   return {subjects:owners,source:{...eventSource,battleId:provenance!.battleId,actionSequences:sequences,actionReceiptIds:receipts.map((a:any)=>a.receiptId)}};
  }
  if(parts[2]==='facts'&&parts[3]==='battle'&&parts[4]==='actions'){
   const action=event.facts.battle.actions[Number(parts[5])],sequences=action.sourceSequences??[action.sequence];
   const provenance=p.battleSources.find(b=>b.step===event.step&&b.battleId===event.facts.battle.id);
   const receipts=sequences.map((n:number)=>provenance?.actions.find((a:any)=>a.sequence===n));
   if(receipts.some((a:any)=>!a))throw Error('动作没有对应的原始结算来源');
   let actors=new Set<string>([action.actor.id,...subjects(action)]);
   if(['actor','skill','resources','actionStateBefore','actionConditionsReading'].includes(parts[6]))actors=new Set([action.actor.id]);
   if(parts[6]==='results'&&parts[7]!==undefined){const target=action.results[Number(parts[7])];actors=subjects(target);if(parts[8]==='effects'&&parts[10]==='results'&&parts[11]!==undefined){const outcome=target.effects[Number(parts[9])].results[Number(parts[11])];actors=new Set([outcome.subjectId??target.targetId]);}}
   return {subjects:actors,source:{...eventSource,battleId:provenance!.battleId,actionSequences:sequences,actionReceiptIds:receipts.map((a:any)=>a.receiptId)}};
  }
  return {subjects:nestedSubjects(p,path,event),source:eventSource};
 }
 if(first==='changes')return {subjects:subjects(p.facts.changes[Number(parts[1])]),source};
 if(first==='scene')return {subjects:new Set<string>(),source};
 const node=writingFactAt(p,'/'+parts.slice(0,Math.min(parts.length,2)).join('/'));
 return {subjects:nestedSubjects(p,path,node),source};
}
/** An identity comparison deliberately has different people on the prose and fact sides. */
function identityComparison(p:StoryWritingPackage,f:StoryFactFinding,evidence:any,owners:Set<string|undefined>){
 if(!f.subjectId||owners.size!==1||!['id','name'].includes(f.factPath.split('/').at(-1)!))return;
 const actual=p.facts.participants.find(person=>owners.has(person.id)),mentioned=p.facts.participants.find(person=>person.id===f.subjectId);
 const parent=writingFactAt(p,f.factPath.slice(0,f.factPath.lastIndexOf('/')));
 if(!actual||!mentioned||actual.id===mentioned.id||actual.name===mentioned.name||![actual.id,actual.name].includes(evidence)||!parent||typeof parent!=='object')return;
 if(!Object.entries(parent).some(([key,value])=>['id','personId','unitId','actorId','ownerId'].includes(key)&&value===actual.id)||!f.quote.includes(mentioned.name)||p.facts.participants.filter(person=>person.name===mentioned.name).length!==1)return;
 return {factSubjectId:actual.id,proseSubjectId:mentioned.id};
}
export function verifyStoryFactFindings(value:any,prose:string,p:StoryWritingPackage):StoryFactEvidenceCheck{
 if(!value||Array.isArray(value)||Object.keys(value).some(k=>!['packageId','findings'].includes(k))||value.packageId!==p.id||!Array.isArray(value.findings)||value.findings.length>8)throw Error('事实审阅须对应同一包编号并返回至多八项findings');
 const result:StoryFactEvidenceCheck={packageId:p.id,requested:true,conflicts:[],observations:[],unverified:[]},seen=new Set<string>();
 const selected={...p,facts:selectStoryWritingView(p).facts};
 for(const finding of value.findings){
  if(!finding||Array.isArray(finding)||Object.keys(finding).some(k=>!['severity','quote','factPath','subjectId','reason','impact'].includes(k))||!['major','minor','uncertain'].includes(finding.severity)||finding.subjectId!==null&&(typeof finding.subjectId!=='string'||!finding.subjectId))throw Error('事实审阅条目结构无效');
  for(const key of ['quote','factPath','reason','impact'])if(typeof finding[key]!=='string'||!finding[key].trim()||finding[key].length>(key==='quote'?1200:600))throw Error('事实审阅条目文本无效');
  const f=structuredClone(finding) as StoryFactFinding;
  // Both coordinates address the same facts in the current request: its writingFacts
  // member, or that member's root. Resolve this exact envelope only, never search/guess.
  const requestedFactPath=f.factPath;
  if(f.factPath.startsWith('/writingFacts/'))f.factPath=f.factPath.slice('/writingFacts'.length);
  let problem='';try{if(!prose.includes(f.quote))throw Error('引用不是正文原句');const evidence=writingFactAt(selected,f.factPath);if(evidence===null||evidence===undefined)throw Error('所引资料是未知值');const scope=citationScope(p,f.factPath),comparison=identityComparison(p,f,evidence,scope.subjects);if(f.subjectId!==null&&!scope.subjects.has(f.subjectId)&&!comparison)throw Error('主体不属于所引事实范围');if(f.subjectId===null&&scope.subjects.size===1){const owner=[...scope.subjects][0];if(owner&&registeredSubjects(p).has(owner))f.subjectId=owner;else throw Error('所引主体未登记');}f.source={...scope.source,...(comparison?{identityComparison:comparison}:{})};}catch(e){problem=(e as Error).message;}
  if(problem){result.unverified.push({finding:f,reason:problem});continue;}
  if(requestedFactPath!==f.factPath)f.source!.requestedFactPath=requestedFactPath;
  const key=JSON.stringify([f.quote,f.factPath,f.subjectId]);if(seen.has(key))continue;seen.add(key);
  (f.severity==='major'?result.conflicts:result.observations).push(f);
 }
 return result;
}
/** The provider returns semantic judgments only; source coordinates are bound in this request. */
export function validateStoryFactReview(value:any,prose:string,p:StoryWritingPackage):StoryFactReview{
 if(!value||typeof value!=='object'||Array.isArray(value)||!Array.isArray(value.findings)||value.findings.length>8)throw Error('事实审阅须返回至多八项findings');
 const {paths}=storyReviewEvidence(p),{spans}=storyReviewProse(prose),result:StoryFactReview={packageId:p.id,requested:true,conflicts:[],observations:[],unverified:[]};
 for(const finding of value.findings){
  if(!finding||typeof finding!=='object'||Array.isArray(finding)||!['major','minor','uncertain'].includes(finding.severity))throw Error('事实审阅条目结构无效');
  for(const key of ['passageId','reason','impact'])if(typeof finding[key]!=='string'||!finding[key].trim()||finding[key].length>600)throw Error('事实审阅条目文本无效');
  if(!Array.isArray(finding.evidenceIds)||finding.evidenceIds.some((id:unknown)=>typeof id!=='string'||!id.trim()||id.length>600))throw Error('事实审阅须选择证据编号列表');
  // Consume only the declared judgment. Extra transport/model metadata stays in raw
  // diagnostics and cannot supply identity, provenance, prose, or a publication decision.
  const {evidenceIds,severity,reason,impact}=finding;
  // The displayed marker is exactly [id]. Accept that same marker or its inner
  // ID, resolving both against this candidate's map. Never search prose, repair
  // an ordinal/hash, or accept a marker belonging to a different candidate.
  const requestedPassageId=finding.passageId as string;
  const passageId=spans.has(requestedPassageId)?requestedPassageId
   :requestedPassageId.startsWith('[')&&requestedPassageId.endsWith(']')?requestedPassageId.slice(1,-1):requestedPassageId;
  const span=spans.get(passageId);
  const judgment:StoryFactJudgment={severity,reason,impact,quote:span?.text??'',...(span?{passage:{id:passageId,start:span.start,end:span.end}}:{}),references:[]},problems:string[]=[];
  if(!span)problems.push('正文段落编号不属于当前候选版本');
  // Missing support invalidates this judgment, not the independent judgments
  // already returned beside it. Keep its severity: an unsupported major still
  // blocks publication, while an ancillary literary observation cannot erase
  // valid coverage or force another provider request.
  if(!evidenceIds.length)problems.push('未提供事实依据');
  // The sent evidence catalogue bounds valid distinct references. A conclusion
  // about several events may need many records; do not truncate its support or
  // reject it solely because it crosses an arbitrary per-finding count.
  for(const evidenceId of new Set<string>(evidenceIds)){
   const path=paths.get(evidenceId),reference:StoryFactJudgment['references'][number]={evidenceId,factPath:path??'',subjectId:null};judgment.references.push(reference);
   if(!path){problems.push(`证据编号不属于本次发送的资料：${evidenceId}`);continue;}
   if(!span)continue;
   const checked=verifyStoryFactFindings({packageId:p.id,findings:[{severity,reason,impact,quote:span.text,factPath:path,subjectId:null}]},prose,p);
   const bound=[...checked.conflicts,...checked.observations][0];
   if(bound){reference.factPath=bound.factPath;reference.subjectId=bound.subjectId;reference.source=bound.source;}
   for(const invalid of checked.unverified)problems.push(`${evidenceId}：${invalid.reason}`);
  }
  // A conclusion is atomic: one invalid supporting citation invalidates the whole
  // judgment, even when its other citations resolve. Never downgrade or pick a subset.
  if(problems.length)result.unverified.push({finding:judgment,reason:problems.join('；')});
  else (severity==='major'?result.conflicts:result.observations).push(judgment);
 }
 for(const key of ['conflicts','observations'] as const){const seen=new Set<string>();result[key]=result[key].filter(f=>{const k=JSON.stringify([f.passage?.id,f.severity,f.reason,f.impact,f.references.map(r=>r.evidenceId).sort()]);if(seen.has(k))return false;seen.add(k);return true;});}
 return result;
}
/** The unchanged writingFacts already precede the correction in both author flows.
 * Cite that single copy; copying overlapping records here multiplies context size.
 * Complete evidence and provenance remain in the package and review diagnostics. */
export function storyFactRepairFindings(findings:readonly StoryFactJudgment[]){
 // The author needs the judgment and paths into its existing writingFacts.
 // Passage offsets and receipt provenance belong to the unchanged audit review.
 return findings.map(({severity,quote,reason,impact,references})=>({
  severity,quote,reason,impact,
  references:references.map(({factPath,subjectId})=>({factPath,subjectId}))
 }));
}
export function storyReviewReferencedFacts(p:StoryWritingPackage,findings:StoryFactJudgment[]){
 const paths=new Set(findings.flatMap(f=>f.references.map(r=>r.factPath)));
 return [...paths].map(factPath=>{
  if(storyReviewFactAt(p,factPath)===undefined)throw Error('修复引用不属于作者已收到的事实');
  return {source:'writingFacts' as const,factPath};
 });
}

/** Production review combines explicit coverage with the existing evidence
 * verifier; the latter remains independently testable as a source checker. */
export function validateStoryCoveredReview(value:any,prose:string,p:StoryWritingPackage,reading?:StoryUnitReading):StoryFactReview{
 return validateStoryReviewChecks(value,prose,p,storyKeyChecks(p,prose,reading));
}
export function validateStoryReviewChecks(value:any,prose:string,p:StoryWritingPackage,checks:StoryKeyCheck[]):StoryFactReview{
 const coverage=readStoryKeyReview(value?.checks,checks,prose);
 const result=validateStoryFactReview(storyFactDifferenceFindings(value,prose),prose,p);result.coverage=coverage;
 for(const entry of coverage){
  const check=checks.find(check=>check.id===entry.id)!;
  const missing=check.required&&entry.status==='not-mentioned';
  const unresolved=check.required&&(entry.status==='uncertain'||entry.status==='contradicted'&&entry.importance==='uncertain');
  const severity=missing?'major':entry.status==='contradicted'?storyDifferenceSeverity(entry.importance):'uncertain';
  // Related paragraphs explain a judgment. Only explicitly located conflict
  // paragraphs authorize a repair; a broad coverage question cannot rewrite
  // all of the correctly summarized context beside one small discrepancy.
  const passageIds=missing?check.passageIds.slice(-1):entry.status==='contradicted'?entry.conflictPassageIds!:entry.passageIds.length?entry.passageIds:(unresolved?check.passageIds.slice(-1):[]);
  for(const passageId of passageIds){
   const checked=validateStoryFactReview({findings:[{severity,passageId,evidenceIds:entry.evidenceIds,reason:missing?'必需终局未在正文交代：'+entry.reason:entry.reason,impact:entry.impact}]},prose,p);
   result.unverified.push(...checked.unverified.map(entry=>({...entry,finding:{...entry.finding,severity:'major' as const}})));
   if(unresolved){const finding=checked.observations[0];if(finding)result.unverified.push({finding:{...finding,severity:'major'},reason:'必需终局的符合情况仍无法确定'});}
   else if(entry.status==='contradicted'||missing){
    result.conflicts.push(...checked.conflicts);
    result.observations.push(...checked.observations);
   }
   else if(entry.status==='uncertain')result.observations.push(...checked.observations);
  }
 }
 const seen=new Set<string>();result.conflicts=result.conflicts.filter(j=>{const key=JSON.stringify([j.passage?.id,j.reason,j.references.map(r=>r.evidenceId)]);if(seen.has(key))return false;seen.add(key);return true;});
 return result;
}
export function storyNeedsFactReview(_p:StoryWritingPackage,_prose=''){
 // Query inputs cannot certify what a free author will claim. Rule-generated
 // transaction feedback finishes before this model-writing path is entered.
 return true;
}
export function storyFactReviewMessages(p:StoryWritingPackage,prose:string,previousSection?:PreviousWritingSection,presentation?:StoryReviewPresentation):ChatMessage[]{
 const inlinePresentation=storyReviewPresentation(prose,presentation);
 if(p.origin.audience.kind==='party'&&inlinePresentation)throw Error('群聊不提供正文资料卡');
 const reading=storyWritingReading(p,storyReviewEvidence(p).facts,Boolean(presentation?.reading?.continuation),'facts');
 return [promptMessage('story-review'),promptDataMessage({packageId:p.id,origin:p.origin,authorContract:p.origin.audience.kind==='party'?STORY_PARTY_AUTHOR_ROLE:p.origin.audience.kind==='private'?PRIVATE_MESSAGE_CONTRACT:STORY_AUTHOR_ROLE,...compactStoryPacketReadings({...reading,commerceReadings:commerceWritingReadings(p.facts,selectStoryWritingView(p).facts)}),keyChecks:storyKeyChecks(p,prose,presentation?.reading),prose:storyReviewProse(prose).text,...(inlinePresentation?{inlinePresentation}:{}),...(previousSection?{previousSection}:{})},{authorContract:p.origin.audience.kind==='party'?'review-party-author':p.origin.audience.kind==='private'?'private-chat':'review-author'})];
}

/** Partition questions, never the candidate's temporal context. A decisive
 * transition may be contradicted across two otherwise plausible paragraphs.
 * Every reading gets the complete current prose and its same frozen facts;
 * each key question belongs to exactly one request. This is one bounded review,
 * not a second judge or a request for every combat action. */
export function storyFactReviewReadings(p:StoryWritingPackage,prose:string,previousSection?:PreviousWritingSection,presentation?:StoryReviewPresentation){
 const messages=storyFactReviewMessages(p,prose,previousSection,presentation),checks=storyKeyChecks(p,prose,presentation?.reading);
 if(presentation?.completeBattle){
  if(!p.origin.battleId||p.origin.writingSection)throw Error('整篇战报审阅必须使用本场完整来源');
  const readings=storyReportReviewReadings(messages,checks,storyReviewEvidence(p).paths),passageIds=new Set(storyReviewProse(prose).spans.keys());
  for(const reading of readings)reading.scope.passageIds=passageIds;
  return readings;
 }
 const single=[{messages,checks,scope:undefined as {unitIds:string[];passageIds:Set<string>;evidenceIds:Set<string>}|undefined}];
 // Compact status coverage does not need a new request for every eight items.
 // Keep the whole candidate in one read; actual capacity, not item count,
 // determines whether the existing battle/section capacity fallback is needed.
 return single;
}
/** A lower bound, not a guarantee that an unknown future candidate will fit.
 * Catch already impossible reviews before paying for an author; the actual draft
 * and each repair still receive their own complete request-capacity check. */
export function preflightStoryFactReview(gateway:ModelGateway,p:StoryWritingPackage){
 if(!storyNeedsFactReview(p))return null;
 return gateway.checkPrompt(storyFactReviewMessages(p,''),{task:'story-review',promptStructure:{strict:true},json:true});
}
/** Check exactly the requests that will be sent. The unsplit question catalogue
 * is an internal representation, not a provider request when review is grouped. */
export function preflightStoryFactReviewReadings(gateway:ModelGateway,p:StoryWritingPackage,prose:string,previousSection?:PreviousWritingSection,presentation?:StoryReviewPresentation){
 const readings=storyFactReviewReadings(p,prose,previousSection,presentation);
 const passageIds=[...storyReviewProse(prose).spans.keys()],evidenceIds=[...storyReviewEvidence(p).paths.keys()];
 const prepared=readings.map(reading=>({...reading,responseSchema:storyReviewResponseSchema(reading.checks,passageIds,evidenceIds)}));
 for(const reading of prepared)gateway.checkPrompt(reading.messages,{task:'story-review',promptStructure:{strict:true},json:true,responseSchema:reading.responseSchema});
 return prepared;
}
export async function reviewStoryFacts(gateway:ModelGateway,p:StoryWritingPackage,prose:string,signal:AbortSignal,recoveryBudget:ModelRecoveryBudget,force=false,previousSection?:PreviousWritingSection,presentation?:StoryReviewPresentation):Promise<StoryFactReview>{
 if(!force&&!storyNeedsFactReview(p,prose))return {packageId:p.id,requested:false,conflicts:[],observations:[],unverified:[]};
 const readings=preflightStoryFactReviewReadings(gateway,p,prose,previousSection,presentation),results:StoryFactReview[]=[];
 // Preflight every request before starting this review. Two independent reads
 // may run together; settle both before surfacing a failure so none is orphaned.
 for(let offset=0;offset<readings.length;offset+=2){
  const batch=await Promise.allSettled(readings.slice(offset,offset+2).map(async reading=>{
   let rejected:unknown,validationError:string|undefined;
   const validate=(value:unknown)=>{try{
   const result=validateStoryReviewChecks(value,prose,p,reading.checks);
   if(reading.scope){
    if(result.coverage!.some(check=>check.passageIds.some(id=>!reading.scope!.passageIds.has(id))))throw Error('审阅结论引用了本次未提供的正文原段');
    for(const key of ['conflicts','observations'] as const)result[key]=result[key].filter(finding=>{
     const valid=finding.passage&&reading.scope!.passageIds.has(finding.passage.id)&&finding.references.every(reference=>reading.scope!.evidenceIds.has(reference.evidenceId));
     if(!valid)result.unverified.push({finding,reason:'引用超出本次实际发送的正文或事实范围'});
     return valid;
    });
   }
   return result;
   }catch(error){if(error instanceof StoryReviewFormatError){rejected=value;validationError=error.message;}throw error;}};
   const options={task:'story-review',signal,promptStructure:{strict:true as const},responseSchema:reading.responseSchema,repairFormat:false,recoveryBudget,parseStructured:(source:string)=>{
    try{return parseStoryReviewJson(source);}catch(error){rejected=source;validationError=(error as Error).message;throw error;}
   }};
   try{return await gateway.structured(reading.messages,validate,options);}
   catch(error){
    // A malformed read-only response can be corrected once against exactly the
    // same prose and evidence. Never infer its missing category or conclusion.
    if(signal.aborted||!(error instanceof ModelGatewayError)||!['invalid-json','invalid-response'].includes(error.kind)||validationError===undefined||!gateway.settings('story-review').repairFormat)throw error;
    const corrected=[...reading.messages,{role:'assistant' as const,content:typeof rejected==='string'?rejected:JSON.stringify(rejected)},promptDataMessage({kind:'story-review-correction',validationError,responseSchema:reading.responseSchema,instruction:'依据同一候选正文和冻结事实，按原协议重新返回完整审阅JSON。'},{instruction:'validation-repair'})];
    gateway.checkPrompt(corrected,{task:'story-review',promptStructure:{strict:true},json:true,responseSchema:reading.responseSchema});signal.throwIfAborted();
    recoveryBudget.consume('review-format');
    return gateway.structured(corrected,validate,options);
   }
  }));
  const failure=batch.find(result=>result.status==='rejected');if(failure?.status==='rejected')throw failure.reason;
  results.push(...batch.flatMap(result=>result.status==='fulfilled'?[result.value]:[]));
 }
 return {packageId:p.id,requested:true,conflicts:results.flatMap(result=>result.conflicts),observations:results.flatMap(result=>result.observations),unverified:results.flatMap(result=>result.unverified),coverage:results.flatMap(result=>result.coverage??[])};
}

/** A failed citation is neither a proved contradiction nor a successful review. */
export function assertStoryFactReviewComplete(review:StoryFactReview){if(review.unverified.some(entry=>entry.finding.severity==='major'))throw new ModelGatewayError('invalid-response','重大审阅的来源无法核验；候选正文与已结算结果保留，正文未发布');}
