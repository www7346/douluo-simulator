import type {ModelLog} from '../runtime/model-gateway';
import {validateModelEvidence,type ModelEvidence,type ModelCandidateRecord} from '../shared/model-evidence';
import type {StoryWritingDraft} from './story-writing-diagnostics';
import {sanitizeDiagnostic} from '../shared/failure-diagnostics';

/** Preserve first candidates and every attempt; ordinary logs never receive this private record. */
export class ModelEvidenceCollector {
 private started=Date.now();private lastPublished=0;private calls=new Map<string,any>();
 readonly value:ModelEvidence;
 constructor(id:string,worldId:string,snapshot:any,kind:string,private publish:(evidence:ModelEvidence)=>void){
  const story=snapshot.state.扩展?.story;
  this.value={version:1,id,worldId,kind,branchId:story?.branchId??null,turn:story?.active?.number??null,snapshotRevision:snapshot.revision,sequence:0,startedAt:new Date(this.started).toISOString(),elapsedMs:0,status:'running',writingPackage:null,drafts:[],calls:[]};
 }
 capture(log:ModelLog){
  if(!log.detail?.task)return;
  const call=this.calls.get(log.id)??{id:log.id,at:log.at,task:log.detail.task,attempts:[]};
  if(log.detail.recovery)call.recovery=structuredClone(log.detail.recovery);
  call.elapsedMs=log.detail.elapsedMs??0;call.status=log.status;
  if(typeof log.detail.model==='string')call.model=log.detail.model;
  if(log.detail.settings)call.settings=structuredClone(log.detail.settings);
  for(const attempt of log.detail.attempts??[]){
   const prior=call.attempts.find((a:any)=>a.attempt===attempt.attempt);
   const fields=['attempt','startedAt','elapsedMs','estimatedInput','contextCapacity','outputReserve','estimateMethod','usage','validation','httpStatus','connectMs','headersMs','firstByteMs','firstReasoningMs','firstContentMs','lastContentMs','streaming','errorKind','error','errorDetails','finishReason','notes'];
   const clean=Object.fromEntries(fields.filter(k=>Object.hasOwn(attempt,k)).map(k=>[k,structuredClone(attempt[k])]));
   if(prior)Object.assign(prior,clean);else call.attempts.push(clean);
  }
  this.calls.set(log.id,call);this.emit(false);
 }
 candidate(record:ModelCandidateRecord){
  const call=this.calls.get(record.callId)??{id:record.callId,task:record.task,at:record.at,attempts:[]};
  const prior=call.attempts.find((a:any)=>a.attempt===record.attempt),data={...structuredClone(record)};delete (data as any).callId;
  if(prior)Object.assign(prior,data);else call.attempts.push(data);this.calls.set(record.callId,call);this.emit();
 }
 draft(draft:StoryWritingDraft){
  if(draft.writingPackage){this.value.writingPackage=structuredClone({...draft.writingPackage,...(draft.writingSelection?{writingSelection:draft.writingSelection}:{})});this.emit();return;}
  const prior=this.value.drafts.find(d=>d.phase===draft.phase&&d.prose===draft.prose&&d.section?.id===draft.section?.id);
  if(prior)Object.assign(prior,structuredClone(draft));else this.value.drafts.push(structuredClone(draft));this.emit();
 }
 finish(status:ModelEvidence['status'],error?:unknown){this.value.status=status;if(error!==undefined)this.value.failure=sanitizeDiagnostic({stage:this.calls.size?[...this.calls.values()].at(-1)?.task:'workflow.prepare',error});this.emit();}
 private emit(force=true){
  if(!force&&Date.now()-this.lastPublished<1000)return;
  this.value.sequence++;this.value.elapsedMs=Date.now()-this.started;this.value.calls=[...this.calls.values()];
  validateModelEvidence(this.value);this.lastPublished=Date.now();this.publish(structuredClone(this.value));
 }
}
