import type {AvatarRecord} from '../runtime/storage';
import {detachedRead,sealOwned} from '../shared/frozen-snapshot';
import type {GameCommand, GameEvent, GameSnapshot} from '../runtime/contracts';
import {stableJson} from '../shared/json-identity';
import {isRecord,patchFields,patchJournals,sectionTables,validDeltaFields,validSectionChanges,type SectionChange} from './section-delta';
export {validDeltaFields} from './section-delta';

/** Public wire types only. No engine, registry, pricing or generation code. */
export const CLOUD_PROTOCOL = 'douluo-cloud/1';
export interface StateDelta {
  baseRevision:number;
  revision:number;
  savedAt:string;
  rulesetVersion:string;
  replace:Record<string,unknown>;
  remove:string[];
  sections?:Record<string,SectionChange>;
  extension?:{replace:Record<string,unknown>;remove:string[]};
  battleReports?:{replace:Record<string,unknown>;remove:string[]};
}
export interface CloudReceipt {
  timings?:{prepareMs:number;executeMs:number;generationCheckMs:number;deltaMs:number;totalMs:number};
  operationId:string;
  resultId:string;
  delta:StateDelta;
  events:GameEvent[];
  idempotent:boolean;
}
export interface PendingOperation {
  worldId:string;
  command:GameCommand;
  phase:'command'|'awaiting-generation';
  rejection?:'stale-workflow'|'invalid-workflow';
  battleTakeover?:true;
  options?:{avatar?:AvatarRecord|null};
  createdAt:string;
}
export type ModelRecoveryCategory='quota'|'blocked'|'transaction'|'conflict'|'mismatch'|'expired'|'unknown';
export type ResultFailureCategory=ModelRecoveryCategory;
/** Bounded anonymous diagnostic labels shared by reporter and receiver. */
export const CLIENT_RESULT_FAILURE_CODES:readonly string[]=Object.freeze(['model-save-pending','model-evidence-pending','model-unconfirmed','model-expired','session-expired','model-result-pending','model-result-unverified','stale-workflow','model-failed']);
export const CLIENT_RESULT_FAILURE_STAGES:readonly string[]=Object.freeze(['model-result-identity','model-result-retrieve','model-result-consume','model-evidence-persist','model-result-discard','model-result-failed']);
export function classifyResultFailure(error:any):ResultFailureCategory {
  if(['quota','blocked','transaction','conflict','mismatch','expired','unknown'].includes(error?.recovery?.category))return error.recovery.category;
  if(error?.name==='QuotaExceededError'||error?.name==='NS_ERROR_DOM_QUOTA_REACHED')return 'quota';
  if(['SecurityError','NotAllowedError'].includes(error?.name))return 'blocked';
  if(['AbortError','InvalidStateError','TransactionInactiveError'].includes(error?.name))return 'transaction';
  if(error?.code==='model-expired'||error?.code==='session-expired')return 'expired';
  if(['invalid-workflow','invalid-receipt','snapshot-version'].includes(error?.code)||error?.message==='生成结果与原操作不一致')return 'mismatch';
  if(error?.name==='StorageConflictError'||['save-unacknowledged','revision-conflict','delta-conflict','stale-workflow'].includes(error?.code))return 'conflict';
  return 'unknown';
}
export interface ModelRecoveryMetadata {
  category:ModelRecoveryCategory;stage:string;canRetrySameJob:boolean;
  jobId?:string;requestId?:string;kind?:string;revision?:number;completedAt?:string;expiresAt?:string;
}
export class CloudError extends Error {
  constructor(public code:string,message:string,public status=400,cause?:unknown,public requestId?:string,public jobId?:string,public recovery?:ModelRecoveryMetadata){super(message,cause===undefined?undefined:{cause});this.name='CloudError';}
}
/** Transport identity ignores retry budgets and connection secrets, never action content. */
export function modelContinuationKey(request:Record<string,any>):string {
  let input=request.input??{};
  if(input&&typeof input==='object'&&!Array.isArray(input)&&['generation','story-writer'].includes(request.kind)){
    input={...input};delete input[request.kind==='generation'?'creationAttemptId':'proseAttemptId'];
  }
  // A manual retry selects the same next background job as the automatic worker.
  // Keep the original implicit-scope fingerprint so installed clients can recover its ticket.
  if(request.kind==='world-people'&&input?.scope==='background'&&Object.keys(input).length===1)input={};
  return stableJson({kind:request.kind,input,revision:request.revision??null,local:request.local===true});
}
export function applyStateDelta(snapshot:GameSnapshot,delta:StateDelta):GameSnapshot {
  return structuredClone(mergeStateDelta(snapshot,delta));
}
export function applyReadOnlyDelta(snapshot:GameSnapshot,delta:StateDelta):GameSnapshot {
  return sealOwned(mergeStateDelta(detachedRead(snapshot),structuredClone(delta)));
}
function mergeStateDelta(snapshot:GameSnapshot,delta:StateDelta):GameSnapshot {
  if(delta.baseRevision!==snapshot.revision||delta.revision<delta.baseRevision||delta.rulesetVersion!==snapshot.rulesetVersion)
    throw new CloudError('delta-conflict','进度版本不一致，请重新连接后继续',409);
  const state={...(snapshot.state as Record<string,unknown>)};
  if(!validDeltaFields(delta))throw new CloudError('invalid-delta','收到的进度内容无效');
  if(delta.sections!==undefined){
    if(!validSectionChanges(delta.sections,delta))throw new CloudError('invalid-delta','收到的分项进度无效');
    for(const [name,change] of Object.entries(delta.sections)){
      const base=state[name],table=sectionTables[name];
      if(!isRecord(base))throw new CloudError('invalid-delta','分项进度与当前存档不匹配');
      const next=patchFields(base,change.fields);
      if(change.entries){
        if(!table||!isRecord(base[table]))throw new CloudError('invalid-delta','人物或物品清单与当前进度不匹配');
        const entries=patchFields(base[table],change.entries),order=change.entryOrder;
        if(order&&(order.length!==Object.keys(entries).length||!order.every(key=>Object.hasOwn(entries,key))))throw new CloudError('invalid-delta','清单顺序与当前进度不匹配');
        next[table]=order?Object.fromEntries(order.map(key=>[key,entries[key]])):entries;
      }
      if(change.journals)try{patchJournals(next,change.journals);}catch{throw new CloudError('invalid-delta','世界账本与当前进度不匹配');}
      state[name]=next;
    }
  }
  if(delta.extension!==undefined||delta.battleReports!==undefined){
    const base=state.扩展;
    if((delta.extension!==undefined&&!validDeltaFields(delta.extension))||!base||typeof base!=='object'||Array.isArray(base)||Object.hasOwn(delta.replace,'扩展')||delta.remove.includes('扩展'))throw new CloudError('invalid-delta','收到的进度内容无效');
    const next:Record<string,unknown>={...base,...delta.extension?.replace};
    for(const key of delta.extension?.remove??[])delete next[key];
    if(delta.battleReports!==undefined){
      if(!validDeltaFields(delta.battleReports)||Object.hasOwn(delta.extension?.replace??{},'battleReports')||delta.extension?.remove.includes('battleReports')||!next.battleReports||typeof next.battleReports!=='object'||Array.isArray(next.battleReports))throw new CloudError('invalid-delta','收到的战报内容无效');
      const reports:Record<string,unknown>={...next.battleReports,...delta.battleReports.replace};
      for(const key of delta.battleReports.remove)delete reports[key];
      next.battleReports=reports;
    }
    state.扩展=next;
  }
  for(const key of delta.remove)delete state[key];
  for(const [key,value] of Object.entries(delta.replace))state[key]=value;
  return {...snapshot,state,revision:delta.revision,rulesetVersion:delta.rulesetVersion,savedAt:delta.savedAt};
}
