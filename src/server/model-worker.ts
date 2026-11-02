import {browserWorkerFetch} from './browser-worker-fetch';
import {redactModel} from '../runtime/model-protocol';
import {parentPort,workerData} from 'node:worker_threads';
import {runModelWorkflow} from './model-workflows';
import {CloudError} from '../cloud/protocol';
import {ModelGatewayError} from '../runtime/model-gateway';
import {ModelEvidenceCollector} from './model-evidence';
import {hasPersistentModelRecovery,persistentWorkflowRecovery,seedRetainedChatAuthor} from './model-recovery-store';

const active=new Map<string,AbortController>();
parentPort!.on('message',async message=>{
  if(message.op==='cancel'){active.get(message.id)?.abort();return;}
  const {id,snapshot,worldId,request}=message,abort=new AbortController();active.set(id,abort);
  // Only in-memory player-visible diagnostics; omit assembled prompts, keys and URLs.
  const clean=(value:any)=>JSON.parse(redactModel(JSON.stringify(value),request.profile??{}));
  const evidence=new ModelEvidenceCollector(id,worldId,snapshot,request.kind,value=>parentPort!.postMessage({id,evidence:clean(value)}));
  const observe=(log:any)=>parentPort!.postMessage({id,log:clean({id:log.id,at:log.at,label:log.label,status:log.status,detail:{task:log.detail?.task,model:log.detail?.model,elapsedMs:log.detail?.elapsedMs,recovery:log.detail?.recovery,storyWriting:log.detail?.storyWriting,settings:log.detail?.settings,attempts:(log.detail?.attempts??[]).slice(-3).map((attempt:any)=>({attempt:attempt.attempt,elapsedMs:attempt.elapsedMs,usage:attempt.usage,validation:attempt.validation,httpStatus:attempt.httpStatus,connectMs:attempt.connectMs,headersMs:attempt.headersMs,firstByteMs:attempt.firstByteMs,firstReasoningMs:attempt.firstReasoningMs,firstContentMs:attempt.firstContentMs,lastContentMs:attempt.lastContentMs,streaming:attempt.streaming,notes:attempt.notes,errorKind:attempt.errorKind,error:String(attempt.error??'').slice(0,1000),content:String(attempt.content??'').slice(0,16000)}))}})});
  try{
    const recovery=request.local||!hasPersistentModelRecovery(request.kind)?undefined:persistentWorkflowRecovery(workerData.recoveryDirectory,worldId,snapshot,request);
    if(recovery&&message.retainedAuthorEvidence)seedRetainedChatAuthor(recovery,worldId,snapshot,request,message.retainedAuthorEvidence);
    const result=await runModelWorkflow(snapshot,worldId,request,workerData.workflowSecret,abort.signal,log=>{evidence.capture(log);observe(log);},undefined,draft=>evidence.draft(draft),record=>evidence.candidate(record),recovery,browserWorkerFetch(parentPort!,id));
    abort.signal.throwIfAborted();evidence.finish('complete');parentPort!.postMessage({id,result:{...result,retryAttempt:request.retryAttempt??null}});
  }catch(error){
    try{evidence.finish(abort.signal.aborted?'cancelled':'failed',error);}catch{/* Prior bounded evidence already published remains available. */}
    const known=error instanceof CloudError||error instanceof ModelGatewayError;
    parentPort!.postMessage({id,error:{code:abort.signal.aborted?'cancelled':known?(error as any).kind??(error as any).code:'model-failed',message:abort.signal.aborted?'本次生成已取消，已确定的方案仍保留':known?clean((error as Error).message):'本次生成未完成，已确定的方案仍保留',status:known?(error as any).status??422:422}});
  }finally{active.delete(id);if(request.profile){request.profile.apiKey='';request.profile.credentialHeaders={};for(const model of request.profile.modelLibrary??[]){model.apiKey='';model.credentialHeaders={};}}}
});
