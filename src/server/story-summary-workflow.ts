import {storySourceInput} from '../shared/story-source-input';
import {promptMessage} from '../runtime/model-prompt-templates';
import {compactHostRecordColumns} from './story-host-record-columns';

import {createStoryWritingPackage} from './story-writing-package';
import {selectStoryWritingView} from './story-writing-view';
import {ModelRecoveryBudget} from '../runtime/model-recovery-budget';
import {isPartyTurn,partyMessages} from '../shared/story-party-chat';
import {requestStageCandidates} from './story-stage-request';
import type {GameSnapshot} from '../runtime/contracts';
import type {ModelGateway} from '../runtime/model-gateway';
import {storyLedger} from '../runtime/story-turns';
import {checkPrivateMemoryRetention,isPrivateMemoryKind} from '../shared/story-summary';
import {issueWorkflowTicket} from './workflow-ticket';
import {checkStorySummaryOriginal,makeStorySummaryOriginal,summaryOriginalTurn,type StorySummaryOriginal} from '../shared/story-summary-original';
import {checkStageOriginals,stageQuoteCatalog,checkStoryStageSummary,selectStageSummaryCandidates,quoteSummaryProposal} from '../shared/story-stage-summary';
function preservePriorPrivateInput(original:StorySummaryOriginal,privateQuotes:{field:string}[]):StorySummaryOriginal{
 // Old memories can mark an input as private. Keep its original quote available
 // to the privacy validator when rewriting that same previously saved source.
 if(!original.automaticReportInput||!privateQuotes.some(q=>q.field==='input'))return original;
 const {automaticReportInput,...priorFormat}=original;return priorFormat;
}
export async function runStoryStageSummary(snapshot:GameSnapshot,worldId:string,input:Record<string,any>,gateway:ModelGateway,secret:string,signal:AbortSignal){
 const ledger=storyLedger(snapshot.state),turn=ledger.active;
 if(input.branchId!==ledger.branchId||!turn||turn.status!=='complete'||input.turn!==turn.number)throw Error('只能在当前故事完成后整理阶段记忆');
 const originals=checkStageOriginals(input.originals,turn.number+1,snapshot.revision+1);if(originals.some(o=>partyMessages(snapshot.state).some(m=>m.source.turn===o.turn)))throw Error('群消息已按原话和接收人保存，不混入公共故事摘要');
 for(const original of originals)if(original.turn===turn.number&&(original.branchId!==(ledger.inheritedBranchId??ledger.branchId)||original.input!==storySourceInput(turn)||original.prose!==turn.prose||original.privatePersonId!==turn.privatePersonId))throw Error('阶段原文与当前故事不一致');
 const previous=[...(ledger.summaries??[]),...(ledger.stageSummaries??[]).flatMap(s=>s.sources)];
 const knownPrivateQuotes=previous.filter(s=>originals.some(o=>o.branchId===s.source.branchId&&o.turn===s.source.turn&&o.privatePersonId===s.source.privatePersonId)).flatMap(s=>s.items.filter(i=>isPrivateMemoryKind(i.kind)).map(i=>({source:s.source,quote:i.quote})));
 const quoteSources=originals.map(o=>{
  const source=o.turn===turn.number?makeStorySummaryOriginal(o.branchId,o.revision,turn):o;
  const prior=knownPrivateQuotes.filter(q=>q.source.branchId===o.branchId&&q.source.turn===o.turn&&q.source.privatePersonId===o.privatePersonId);
  return preservePriorPrivateInput(source,prior.map(q=>q.quote));
 });
 const recoveryBudget=gateway.recoveryBudget??new ModelRecoveryBudget();
 const candidates=await requestStageCandidates(gateway,[promptMessage('stage-summary'),{role:'user',content:JSON.stringify({...(knownPrivateQuotes.length?{knownPrivateQuotes}:{}),sourceKind:'archived-narrative',originals:quoteSources.map(original=>({turn:original.turn,...(original.privatePersonId?{privatePersonId:original.privatePersonId}:{}),quotes:stageQuoteCatalog(original).map(({id,field,text})=>({id,field,text}))}))})}],quoteSources,signal,recoveryBudget);
 // Selection can only remove candidates; it cannot recover a missing privacy annotation.
 checkPrivateMemoryRetention(previous,candidates.sources);
 const candidateCount=candidates.sources.reduce((sum,source)=>sum+source.items.length,0);
 // Select existing validated entries; never silently truncate, paraphrase, or lose a source.
 const stage=candidateCount<=12&&candidates.sources.every(s=>s.items.length<=6)?checkStoryStageSummary(candidates):await gateway.structured([
  promptMessage('memory-selection'),
  {role:'user',content:JSON.stringify({...(knownPrivateQuotes.length?{knownPrivateQuotes}:{}),extraSlots:12-candidates.sources.length,responseTemplate:{primary:candidates.sources.map(source=>({turn:source.source.turn,index:null})),extra:[]},sources:candidates.sources.map(source=>({turn:source.source.turn,items:source.items.map((item,index)=>({index,...item}))}))})}
 ],value=>selectStageSummaryCandidates(value,candidates),{task:'memory-selection',signal,recoveryBudget});
 checkPrivateMemoryRetention(previous,stage.sources);
 signal.throwIfAborted();return {ticket:issueWorkflowTicket(secret,worldId,snapshot,{type:'story.record-stage-summary',payload:{branchId:ledger.branchId,turn:turn.number,stage,originals}}),value:{title:stage.title,turns:stage.sources.length,items:stage.sources.reduce((n,s)=>n+s.items.length,0)}};
}
export async function runStorySummary(snapshot:GameSnapshot,worldId:string,input:Record<string,any>,gateway:ModelGateway,secret:string,signal:AbortSignal){
 const ledger=storyLedger(snapshot.state);
 const original=input.original===undefined?undefined:checkStorySummaryOriginal(input.original,ledger.active?.number??0,snapshot.revision);
 const turn=original?summaryOriginalTurn(original):ledger.active;
 if(input.branchId!==ledger.branchId||!turn||input.turn!==turn.number||turn.status!=='complete')throw Error('只能整理与来源对应的一段已完成故事');
 if(isPartyTurn(turn)||partyMessages(snapshot.state).some(m=>m.source.turn===turn.number))throw Error('群消息已按原话和接收人保存，不混入公共故事摘要');
 const sourceBranch=original?.branchId??ledger.inheritedBranchId??ledger.branchId;
 const previous=[...(ledger.summaries??[]),...(ledger.stageSummaries??[]).flatMap(s=>s.sources)];
 const knownPrivateQuotes=previous.filter(s=>s.source.branchId===sourceBranch&&s.source.turn===turn.number&&s.source.privatePersonId===turn.privatePersonId).flatMap(s=>s.items.filter(i=>isPrivateMemoryKind(i.kind)).map(i=>i.quote));
 // Current-turn memory reads the same selected facts as the author. Archived prose
 // stays archival; it must not acquire current-world facts while being summarized.
 const source=original?null:createStoryWritingPackage(snapshot,worldId,turn);
 const facts=source?selectStoryWritingView(source).facts:undefined;
 // Quotes, source identity and privacy labels retain their ordinary wire shape.
 // A custom instruction can address the original fact fields directly.
 const memorySource=source&&facts?{sourceKind:'settled-turn',factSource:{id:source.id,origin:source.origin,factsHash:source.factsHash},
  writingFacts:(gateway.hasPromptOverride?.('story-summary')??true)?facts:compactHostRecordColumns(facts)}:{sourceKind:'archived-narrative'};
 const quotationSource=preservePriorPrivateInput(original??makeStorySummaryOriginal(sourceBranch,snapshot.revision,turn),knownPrivateQuotes);
 const quotes=stageQuoteCatalog(quotationSource).map(({id,field,text})=>({id,field,text}));
 const summary=await gateway.structured([promptMessage('story-summary'),{role:'user',content:JSON.stringify({...(knownPrivateQuotes.length?{knownPrivateQuotes}:{}),quotes,...(turn.privatePersonId?{privatePersonId:turn.privatePersonId}:{}),...memorySource})}],value=>{const summary=quoteSummaryProposal(value,quotationSource);checkPrivateMemoryRetention(previous,[summary]);return summary;},{task:'story-summary',signal});
 signal.throwIfAborted();return {ticket:issueWorkflowTicket(secret,worldId,snapshot,{type:'story.record-summary',payload:{branchId:ledger.branchId,turn:turn.number,summary,...(original?{original}:{})}}),value:{turn:turn.number,items:summary.items.length}};
}
