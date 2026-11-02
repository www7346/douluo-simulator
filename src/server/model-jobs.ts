import {serveBrowserFetch} from './browser-worker-fetch';
import type {BrowserModelConnections} from './browser-model-connections';
import {Worker} from 'node:worker_threads';
import {createHash,randomBytes} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {defaultModelRecoveryDirectory} from './model-recovery-store';
import {CloudError,modelContinuationKey} from '../cloud/protocol';
import {validateModelEvidence,type ModelEvidence} from '../shared/model-evidence';
import {diagnosticRef,type ServerDiagnosticSink} from './server-diagnostics';
import {MAX_STORY_WORKFLOW_BYTES} from '../shared/story-prose';

interface Job {sourceCommandId?:string;identity?:{version:1;worldId:string;kind:string;revision:number;fingerprint:string};completedAt?:number;statusRevision:number;waiters:Set<()=>void>;sourceKey?:string;attemptRef?:string;id:string;token:string;status:'running'|'complete'|'failed';at:number;startedAt:number;requestId?:string;kind?:string;revision?:number;worldId?:string;evidence?:ModelEvidence;cancellationPending?:boolean;logs?:any[];result?:any;error?:any;timer?:ReturnType<typeof setTimeout>}
interface JobScope {token:string;worldId?:string}
interface IdleClaim extends JobScope {command?:{id:string;expectedRevision:number;type?:string;payload?:unknown};result:Promise<unknown>}
interface RetainedAuthor {token:string;worldId:string;revision:number;fingerprint:string;attempt:string;at:number;evidence:ModelEvidence}
/** A bounded asynchronous worker, separate from the serialized rule worker pool. */
export class ModelJobs {
  #jobs=new Map<string,Job>();#worker?:Worker;#closed=false;
  #browserCalls=new Map<string,Set<AbortController>>();
  #idleClaims=new Map<string,IdleClaim>();
  #cancellations=new Map<string,JobScope>();
  #retainedAuthors=new Map<string,RetainedAuthor>();
  #authorAttempts=new Map<string,string>();
  #cancelledAuthors=new Set<string>();
  constructor(readonly path:string,readonly workflowSecret:string,readonly maxActive=4,readonly timeoutMs=1200000,readonly recoveryDirectory=defaultModelRecoveryDirectory(),readonly diagnostics?:ServerDiagnosticSink,readonly browserConnections?:BrowserModelConnections){}
  #changed(job:Job){job.statusRevision++;for(const wake of [...job.waiters])wake();}
  #record(job:Job,event:string,error?:unknown,reason?:string){
    const calls=job.evidence?.calls??[],last=calls.at(-1),attempt=last?.attempts?.at(-1),usage=attempt?.usage;
    const first=calls.flatMap(c=>(c.attempts??[]).filter((a:any)=>a.errorKind).map((a:any)=>({task:c.task,error:a.errorDetails??{kind:a.errorKind,message:a.error}})))[0];
    try{this.diagnostics?.({event,firstFailureTask:first?.task,firstFailure:first?.error,attemptRef:job.attemptRef,estimatedInput:attempt?.estimatedInput,outputReserve:attempt?.outputReserve,contextCapacity:attempt?.contextCapacity,jobId:job.id,requestId:job.requestId,worldRef:diagnosticRef(job.worldId),revision:job.revision,kind:job.kind,elapsedMs:Date.now()-job.startedAt,outcome:job.status,reason,
      task:last?.task,calls:calls.length,attempts:calls.reduce((sum,c)=>sum+(c.attempts?.length??0),0),providerElapsedMs:attempt?.elapsedMs,httpStatus:attempt?.httpStatus,firstByteMs:attempt?.firstByteMs,firstReasoningMs:attempt?.firstReasoningMs,firstContentMs:attempt?.firstContentMs,lastContentMs:attempt?.lastContentMs,finishReason:attempt?.finishReason,
      inputTokens:usage?.prompt_tokens,outputTokens:usage?.completion_tokens,recoveryUsed:last?.recovery?.used?.length,error:error??job.evidence?.failure?.error??job.error,providerError:attempt?.errorDetails});}catch{/* Fail-open diagnostics. */}
  }
  find(token:string,sourceKey:string){this.cleanup();return [...this.#jobs.values()].find(job=>job.token===token&&job.sourceKey===sourceKey)?.id;}
  #matches(scope:JobScope,token:string,worldId?:string){return scope.token===token||worldId!==undefined&&scope.worldId===worldId;}
  hasActive(token:string,worldId?:string){
    return [...this.#jobs.values()].some(job=>this.#matches(job,token,worldId)&&(job.status==='running'||job.cancellationPending))
      ||[...this.#cancellations.values(),...this.#idleClaims.values()].some(scope=>this.#matches(scope,token,worldId));
  }
  async withIdleSession<T>(token:string,run:()=>Promise<T>,worldId?:string,command?:{id:string;expectedRevision:number;type?:string;payload?:unknown}):Promise<T>{
    const prior=this.#idleClaims.get(token);
    // A retry owns the exact same command, rather than another mutation. Its
    // original calculation must remain the only writer and the only result.
    if(!this.#closed&&command&&prior?.command&&prior.worldId===worldId&&isDeepStrictEqual(prior.command,command))return prior.result as Promise<T>;
    if(this.#closed||this.hasActive(token,worldId))throw new CloudError('model-busy','请先等待当前构思或取消操作结束',409);
    if(command&&[...this.#jobs.values()].some(job=>this.#matches(job,token,worldId)&&job.status==='complete'&&job.kind==='generation'&&job.revision===command.expectedRevision&&job.sourceCommandId===command.id))throw new CloudError('model-busy','这次操作已有生成结果，请回到原页面取回并完成',409);
    let resolve!:(value:T)=>void,reject!:(error:unknown)=>void;
    const result=new Promise<T>((yes,no)=>{resolve=yes;reject=no;}),claim:IdleClaim={token,worldId,...(command?{command:structuredClone(command)}:{}),result};
    this.#idleClaims.set(token,claim);
    try{Promise.resolve(run()).then(resolve,reject);}catch(error){reject(error);}
    try{return await result;}finally{if(this.#idleClaims.get(token)===claim)this.#idleClaims.delete(token);}
  }
  reserve(token:string,sourceKey?:string,worldId?:string):string {
    this.cleanup();
    if(this.#closed||this.hasActive(token,worldId))throw new CloudError('model-busy','还有正在进行的生成，请等待或取消',409);
    const cancelling=[...this.#cancellations.keys()].filter(id=>this.#jobs.get(id)?.status!=='running').length;
    if([...this.#jobs.values()].filter(j=>j.status==='running').length+cancelling>=this.maxActive||this.#jobs.size>=64)throw new CloudError('model-busy','当前生成请求较多，请稍后再试',503);
    const id=randomBytes(24).toString('base64url');this.#jobs.set(id,{id,token,sourceKey,worldId,statusRevision:1,waiters:new Set(),status:'running',at:Date.now(),startedAt:Date.now()});return id;
  }
  start(id:string,snapshot:any,worldId:string,request:any,requestId?:string){
    const job=this.#jobs.get(id);if(!job||job.status!=='running'||job.kind!==undefined)return;
    job.attemptRef=diagnosticRef(request.retryAttempt?.id??request.input?.proseAttemptId??request.input?.creationAttemptId);
    job.worldId=worldId;job.requestId=requestId;job.kind=request.kind;job.revision=request.revision;
    if(request.kind==='generation'&&typeof request.input?.commandId==='string')job.sourceCommandId=request.input.commandId;
    job.identity={version:1,worldId,kind:request.kind,revision:request.revision,fingerprint:createHash('sha256').update(modelContinuationKey(request)).digest('hex')};
    const authorAttempt=String(request.input?.proseAttemptId??request.retryAttempt?.id??'');this.#authorAttempts.set(id,authorAttempt);
    // Only server-held evidence from this exact operation can seed a retry.
    // Releasing its UI job must not erase an already paid, failed author draft.
    const story=snapshot.state?.扩展?.story;
    const retainedAuthorEvidence=request.kind==='story-writer'&&story?.active?.status==='resolved'
      ?[...this.#retainedAuthors.values(),...[...this.#jobs.values()].flatMap(prior=>this.#retainableAuthor(prior)?[this.#retainableAuthor(prior)!]:[])]
        .filter(prior=>prior.token===job.token&&prior.worldId===worldId&&prior.revision===request.revision&&prior.fingerprint===job.identity!.fingerprint&&prior.attempt===authorAttempt&&prior.evidence.branchId===story.branchId&&prior.evidence.turn===story.active.number)
        .sort((a,b)=>b.at-a.at)[0]?.evidence:undefined;
    this.#changed(job);this.#record(job,'model.started');
    if(!this.#worker){
      const worker=new Worker(this.path,{workerData:{workflowSecret:this.workflowSecret,recoveryDirectory:this.recoveryDirectory},resourceLimits:{maxOldGenerationSizeMb:512,maxYoungGenerationSizeMb:64}});this.#worker=worker;
      worker.on('message',message=>{
        if(message.op==='browser-fetch'){
          const job=this.#jobs.get(message.id);
          if(!this.browserConnections||!job||job.status!=='running'||worker!==this.#worker){message.port?.postMessage({op:'error',message:'本地模型任务已经结束'});message.port?.close();return;}
          const abort=new AbortController(),calls=this.#browserCalls.get(job.id)??new Set<AbortController>();calls.add(abort);this.#browserCalls.set(job.id,calls);
          void serveBrowserFetch(this.browserConnections,message,abort.signal).finally(()=>{calls.delete(abort);if(!calls.size)this.#browserCalls.delete(job.id);});return;
        }
        const cancelled=this.#cancellations.get(message.id);
        if(cancelled){
          if(message.error||message.result)this.#cancellations.delete(message.id);
          else if(message.evidence)try{validateModelEvidence(message.evidence);if(message.evidence.id===message.id&&message.evidence.worldId===cancelled.worldId&&message.evidence.status!=='running')this.#cancellations.delete(message.id);}catch{/* Retain the in-flight latch until a valid terminal record. */}
        }
        const current=this.#jobs.get(message.id);if(!current)return;
        if(message.evidence){try{validateModelEvidence(message.evidence);if(message.evidence.id===current.id&&message.evidence.worldId===current.worldId&&message.evidence.sequence>(current.evidence?.sequence??0)){current.evidence=message.evidence;if(message.evidence.status!=='running')current.cancellationPending=false;this.#changed(current);}}catch{/* Invalid worker records cannot replace retained evidence. */}return;}
        if((message.error||message.result)&&current.cancellationPending){current.cancellationPending=false;this.#changed(current);}
        if(current.status!=='running')return;
        if(message.log){current.logs=[...(current.logs??[]).filter(log=>log.id!==message.log.id),message.log].slice(-32);this.#changed(current);return;}
        clearTimeout(current.timer);current.at=Date.now();
        if(message.error){current.status='failed';current.error=message.error;}
        else if(Buffer.byteLength(JSON.stringify(message.result))>(['story-writer','story-rewrite','generation','generation-repair','generation-rebuild','person-rewrite'].includes(current.kind??'')?MAX_STORY_WORKFLOW_BYTES:128*1024)){current.status='failed';current.error={code:'model-result-limit',message:'生成结果过大，已确定的方案仍保留',status:413};}
        else{current.status='complete';current.completedAt=current.at;current.result=message.result;}
        this.#changed(current);this.#record(current,'model.finished');
      });
      const fail=(error?:unknown)=>{if(this.#worker!==worker)return;for(const calls of this.#browserCalls.values())for(const call of calls)call.abort();this.#browserCalls.clear();this.#worker=undefined;this.#cancellations.clear();for(const current of this.#jobs.values()){const wasCancelling=current.cancellationPending;current.cancellationPending=false;if(wasCancelling)this.#changed(current);if(current.status==='running'){clearTimeout(current.timer);current.status='failed';current.at=Date.now();current.error={code:'model-interrupted',message:'生成服务已中断；如再次调用，模型服务可能再次计费',status:503};this.#changed(current);this.#record(current,'model.interrupted',error,'worker-exit');}}};
      worker.on('error',error=>{fail(error);void worker.terminate();});worker.on('exit',()=>fail());
    }
    job.timer=setTimeout(()=>this.cancel(job.token,id,'本次生成超过云端等待时限，已确定的方案仍保留','timeout'),this.timeoutMs);job.timer.unref();
    this.#worker.postMessage({id,snapshot,worldId,request,...(retainedAuthorEvidence?{retainedAuthorEvidence:structuredClone(retainedAuthorEvidence)}:{})});
  }
  #retainableAuthor(job:Job):RetainedAuthor|undefined{
    if(job.status!=='failed'||this.#cancelledAuthors.has(job.id)||job.cancellationPending||job.error?.code==='cancelled'||job.error?.code==='model-timeout'||job.kind!=='story-writer'||!job.identity||job.evidence?.status!=='failed'||!job.evidence.writingPackage)return;
    return {token:job.token,worldId:job.identity.worldId,revision:job.identity.revision,fingerprint:job.identity.fingerprint,attempt:this.#authorAttempts.get(job.id)??'',at:job.at,evidence:job.evidence};
  }
  get(token:string,id:string,afterEvidence=0){this.cleanup();const job=this.#jobs.get(id);if(!job||job.token!==token)throw new CloudError('model-expired','这份生成结果已过期；再次调用可能再次计费，已确定的方案仍保留',410);return {jobId:job.id,identity:job.identity,statusRevision:job.statusRevision,status:job.status,requestId:job.requestId,...(job.completedAt===undefined?{}:{completedAt:new Date(job.completedAt).toISOString()}),...(job.status==='running'?{}:{expiresAt:new Date(job.at+600000).toISOString()}),logs:job.logs??[],result:job.result,error:job.error,...(job.cancellationPending?{cancellationPending:true}:{}),...(job.evidence&&job.evidence.sequence>afterEvidence?{evidence:job.evidence}:{})};}
  async waitForStatus(token:string,id:string,options:{afterStatus?:number;afterEvidence?:number;waitMs?:number}={},signal?:AbortSignal){
    const afterStatus=options.afterStatus??0,afterEvidence=options.afterEvidence??0,waitMs=options.waitMs??0;
    if(![afterStatus,afterEvidence,waitMs].every(v=>Number.isSafeInteger(v)&&v>=0)||waitMs>25000)throw new CloudError('invalid-workflow','生成进度查询无效');
    const current=this.get(token,id,afterEvidence),job=this.#jobs.get(id)!;
    if(current.statusRevision>afterStatus||current.status!=='running'&&!current.cancellationPending||waitMs===0)return current;
    await new Promise<void>((resolve,reject)=>{
      let timer:ReturnType<typeof setTimeout>|undefined;
      const done=(error?:unknown)=>{if(timer)clearTimeout(timer);job.waiters.delete(wake);signal?.removeEventListener('abort',abort);if(error)reject(error);else resolve();};
      const wake=()=>done(),abort=()=>done(signal?.reason??new CloudError('client-disconnected','进度查询已中断',499));
      job.waiters.add(wake);signal?.addEventListener('abort',abort,{once:true});
      timer=setTimeout(wake,waitMs);
      if(signal?.aborted)abort();else if(job.statusRevision>afterStatus||job.status!=='running'&&!job.cancellationPending||!this.#jobs.has(id))wake();
    });
    return this.get(token,id,afterEvidence);
  }
  cancel(token:string,id:string,message='本次生成已取消，已确定的方案仍保留',reason='player-cancelled'){
    const job=this.#jobs.get(id);if(!job||job.token!==token)return;
    if(reason==='player-cancelled'||reason==='timeout'){this.#cancelledAuthors.add(id);this.#retainedAuthors.delete(id);}
    if(job.status==='running'){for(const call of this.#browserCalls.get(id)??[])call.abort();job.cancellationPending=job.kind!==undefined&&!!this.#worker;if(job.cancellationPending){this.#cancellations.set(id,{token,worldId:job.worldId});this.#worker!.postMessage({op:'cancel',id});}clearTimeout(job.timer);job.status='failed';job.error={code:reason==='timeout'?'model-timeout':'cancelled',message,status:422};job.at=Date.now();this.#changed(job);this.#record(job,'model.cancelled',undefined,reason);}
  }
  discard(token:string,id:string,reason='result-released'){if(this.#jobs.get(id)?.token===token){const job=this.#jobs.get(id)!,retained=reason==='result-released'?this.#retainableAuthor(job):undefined;if(retained){this.#retainedAuthors.set(id,structuredClone(retained));while(this.#retainedAuthors.size>64)this.#retainedAuthors.delete(this.#retainedAuthors.keys().next().value!);}else this.#retainedAuthors.delete(id);}this.cancel(token,id,undefined,reason);if(this.#jobs.get(id)?.token===token){const job=this.#jobs.get(id)!;this.#jobs.delete(id);this.#authorAttempts.delete(id);this.#cancelledAuthors.delete(id);this.#changed(job);}}
  closeSession(token:string){for(const job of this.#jobs.values())if(job.token===token)this.discard(token,job.id,'session-closed');for(const [id,record] of this.#retainedAuthors)if(record.token===token)this.#retainedAuthors.delete(id);}
  cleanup(){const now=Date.now();for(const [id,record] of this.#retainedAuthors)if(now-record.at>600000)this.#retainedAuthors.delete(id);for(const job of this.#jobs.values())if(now-job.at>(job.status==='running'?this.timeoutMs+60000:600000)){this.#record(job,'model.expired');this.discard(job.token,job.id,'result-expired');}}
  async close(){this.#closed=true;for(const calls of this.#browserCalls.values())for(const call of calls)call.abort();this.#browserCalls.clear();for(const job of this.#jobs.values()){this.#changed(job);clearTimeout(job.timer);if(job.status==='running')this.#record(job,'model.interrupted',undefined,'service-shutdown');}this.#jobs.clear();this.#retainedAuthors.clear();this.#authorAttempts.clear();this.#cancelledAuthors.clear();await this.#worker?.terminate();this.#worker=undefined;this.#cancellations.clear();this.#idleClaims.clear();}
}
