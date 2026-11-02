import {Worker} from 'node:worker_threads';
import {CloudError} from '../cloud/protocol';
import {isAutomaticBattleCommand,type GameCommand} from '../runtime/contracts';
import {PUBLIC_COMMANDS,validateCommand} from './input';
import {CalculationSession,SESSION_CACHE_LIMIT,sessionCapacityError,sessionCommandHash,type SessionCheckpointIdentity,type SessionCheckpointV1} from './session';
import {inspectSlicesCheckpoint,type CalculationSlicesCheckpointV1,type CalculationSlicesIdentity} from './calculation-slices';
import {CALCULATION_STAGES,calculationNumbers,worldIntentLabel,type CalculationStage} from './calculation-observation';
import {concurrentSnapshotQuery} from '../shared/snapshot-query-policy';
import {calculationWork,type CalculationWork} from '../shared/calculation-progress';

export interface CalculationTrace {requestId?:string;worldRef?:string}
interface Owner {takeover?:{operationId:string;revision:number;flag:Int32Array};session:CalculationSession;epoch:number;command?:Job;continuation?:{checkpoint:CalculationSlicesCheckpointV1;bytes:number};lastFailure?:{operationId:string;error:{code:string;message:string;status:number;requestId?:string}}}
interface Job {takeover?:Int32Array;work?:CalculationWork;id:number;index:number;op:string;token:string;payload:any;bytes:number;trace:CalculationTrace;owner?:Owner;revoked?:boolean;abandonedRead?:boolean;snapshotRead?:boolean;epoch:number;nextEpoch?:number;identity?:SessionCheckpointIdentity;hash?:string;createdAt:number;queuedAt:number;startedAt?:number;calculationStage?:CalculationStage;stageStartedAt?:number;stats?:Record<string,number>;waitTimer?:ReturnType<typeof setTimeout>;detach?:()=>void;resolve:(value:any)=>void;reject:(reason:unknown)=>void;promise:Promise<any>}
interface Slot {worker:Worker;running?:Job;dispatchId?:number;timer?:ReturnType<typeof setTimeout>;ready:boolean;timedOut?:boolean;cancelledRead?:boolean;affinity?:string}
function safeTrace(trace?:CalculationTrace):CalculationTrace {
  return {requestId:typeof trace?.requestId==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(trace.requestId)?trace.requestId:undefined,
    worldRef:typeof trace?.worldRef==='string'&&/^[a-f0-9]{64}$/.test(trace.worldRef)?trace.worldRef:undefined};
}
const busy=()=>new CloudError('service-busy','服务正在处理较多旅程，本次操作尚未执行，请稍后重试',503);
const expired=()=>new CloudError('session-expired','连接已到期，请从本机进度重新连接',410);
const interrupted=()=>new CloudError('calculation-interrupted','这次计算暂时中断，原进度仍保留，请稍后重试原操作',503);

/** Compressed authority lives outside bounded disposable execution threads.
 * A private copy can commit only while its original owner and lease are live. */
export class CalculationPool {
  #slots:Slot[]=[];#owners=new Map<string,Owner>();#openings=new Map<string,Job>();#queue:Job[]=[];
  #id=0;#dispatchId=0;#epoch=0;#closed=false;#queuedBytes=0;
  #localCommitScope?:object;
  #releases=new Map<string,Promise<any>>();
  onReset?: (index:number,error:Error,details:Record<string,unknown>)=>void;
  onSlow?: (index:number,details:Record<string,unknown>)=>void;
  get healthy(){return !this.#closed&&this.#slots.some(slot=>slot.ready);}
  get maxConcurrentCommands(){return Math.max(1,this.executionSize-1);}
  readonly ready:Promise<string>;
  readonly executionSize:number;
  constructor(readonly workerPath:string,readonly size=1,readonly maxQueue=32,readonly timeoutMs=60000,readonly workerData:Record<string,unknown>={},readonly maxQueuedBytes=96*1024*1024,readonly maxWaitMs=30000,readonly slowMs=5000){
    if(!Number.isInteger(size)||size<1||size>4)throw new Error('计算进程数量须为 1 至 4');
    this.executionSize=Math.max(2,size);
    if(workerData.localDesktop===true)this.#localCommitScope={};
    this.ready=Promise.all(Array.from({length:this.executionSize},(_,index)=>new Promise<string>((resolve,reject)=>this.#spawn(index,resolve,reject)))).then(versions=>{
      if(new Set(versions).size!==1)throw new Error('计算服务版本不一致');return versions[0];
    });
  }
  #key(index:number,token:string){return index+':'+token;}
  #used(index:number){let bytes=0;for(const [key,owner] of this.#owners)if(key.startsWith(index+':'))bytes+=owner.session.residentBytes;return bytes;}
  #sliceUsed(){let bytes=0;for(const owner of this.#owners.values())bytes+=owner.continuation?.bytes??0;return bytes;}
  #sliceIdentity(job:Job):CalculationSlicesIdentity {return {commandHash:job.hash!,baseRevision:job.identity!.revision,baseSnapshotHash:job.identity!.snapshotHash,seed:job.owner!.session.seed};}
  #details(job:Job|undefined,now=Date.now()):Record<string,unknown> {
    const payload=job?.payload;
    return {...job?.trace,operation:job?.op,query:job?.op==='query'&&typeof payload?.name==='string'&&/^[a-z][a-z0-9.-]{0,79}$/.test(payload.name)?payload.name:undefined,
      command:job?.op==='command'&&PUBLIC_COMMANDS.includes(payload?.type)?payload.type:undefined,
      intent:job?.op==='command'&&payload?.type==='world.intent'?worldIntentLabel(payload.payload?.type):undefined,
      calculationStage:job?.calculationStage,stageMs:job?.stageStartedAt===undefined?undefined:now-job.stageStartedAt,...job?.stats,
      queuedMs:job?.startedAt===undefined?undefined:job.startedAt-job.queuedAt,runningMs:job?.startedAt===undefined?undefined:now-job.startedAt,
      queuedJobs:this.#queue.length,queuedBytes:this.#queue.reduce((sum,row)=>sum+row.bytes,0)};
  }
  #finish(job:Job,error?:unknown,value?:unknown){
    clearTimeout(job.waitTimer);job.detach?.();this.#queuedBytes-=job.bytes;
    const key=this.#key(job.index,job.token);
    if(this.#openings.get(key)===job)this.#openings.delete(key);
    if(job.owner?.command===job){
      job.owner.command=undefined;
      // A terminal rejection rolled the command back. Only an interrupted or
      // queued retry may retain private progress; it is never an unsaved result.
      if(error instanceof CloudError&&!['calculation-interrupted','service-busy'].includes(error.code))job.owner.continuation=undefined;
      job.owner.lastFailure=error?{operationId:job.payload.id,error:{code:error instanceof CloudError?error.code:'calculation-interrupted',message:error instanceof CloudError?error.message:'这次计算暂时中断，原进度已保留',status:error instanceof CloudError?error.status:503,requestId:job.trace.requestId}}:undefined;
    }
    error?job.reject(error):job.resolve(value);
  }
  #live(job:Job){return !job.revoked&&this.#owners.get(this.#key(job.index,job.token))===job.owner&&(!job.owner||job.owner.epoch===job.epoch);}
  #accept(job:Job,result:{value:unknown;checkpoint:SessionCheckpointV1}){
    if(!this.#live(job))throw expired();
    if(Date.now()-job.createdAt>=10*60*1000)throw interrupted();
    const key=this.#key(job.index,job.token);
    if(job.op==='open'){
      if(this.#openings.get(key)!==job||job.owner?.command||job.owner&&JSON.stringify(job.owner.session.checkpointIdentity())!==JSON.stringify(job.identity))throw busy();
      const session=CalculationSession.retainCheckpoint(result.checkpoint,String(this.workerData.workflowSecret??''),this.#localCommitScope);
      if(session.seed!==job.payload.seed||session.hasPending)throw new CloudError('invalid-checkpoint','读取结果未通过内部核对，原进度已保留',409);
      const occupied=this.#used(job.index)-(job.owner?.session.residentBytes??0);
      if(occupied+session.residentBytes>SESSION_CACHE_LIMIT)throw sessionCapacityError(session.snapshotBytes,session.residentBytes,occupied);
      this.#owners.set(key,{session,epoch:job.nextEpoch!});
      return session.snapshot();
    }
    const owner=job.owner!;
    if(job.op==='command'){
      if(owner.command!==job)throw expired();
      const receipt=owner.session.commitCheckpoint(result.checkpoint,{...job.identity!,command:job.payload as GameCommand},SESSION_CACHE_LIMIT-this.#used(job.index)+owner.session.residentBytes);
      owner.continuation=undefined;owner.takeover=undefined;return receipt;
    }
    if(JSON.stringify(owner.session.checkpointIdentity())!==JSON.stringify(job.identity))throw new CloudError('stale-preview','进度已变化，请重新查看',409);
    return result.value;
  }
  #yield(job:Job,checkpoint:CalculationSlicesCheckpointV1){
    if(job.op!=='command'||!this.#live(job)||job.owner?.command!==job)throw expired();
    if(Date.now()-job.createdAt>=10*60*1000)throw interrupted();
    const owner=job.owner,checked=inspectSlicesCheckpoint(checkpoint,this.#sliceIdentity(job));
    if(checked.step!==(owner.continuation?.checkpoint.step??0)+1)throw new CloudError('invalid-checkpoint','计算分段顺序不一致，原进度已保留',409);
    // A separate, pool-wide private budget preserves the existing legal save
    // capacity; a large world must not count its retained checkpoint twice.
    const occupied=this.#sliceUsed()-(owner.continuation?.bytes??0);
    if(occupied+checked.bytes>SESSION_CACHE_LIMIT)throw busy();
    owner.continuation={checkpoint,bytes:checked.bytes};
    job.queuedAt=Date.now();job.startedAt=undefined;job.calculationStage=undefined;job.stageStartedAt=undefined;
    this.#queue.push(job);
    job.waitTimer=setTimeout(()=>{const at=this.#queue.indexOf(job);if(at>=0){this.#queue.splice(at,1);this.#finish(job,busy());}},this.maxWaitMs);
  }
  #spawn(index:number,onReady:(version:string)=>void,onError:(error:Error)=>void){
    const worker=new Worker(this.workerPath,{workerData:{...this.workerData,executionIsolated:true},resourceLimits:{maxOldGenerationSizeMb:384,maxYoungGenerationSizeMb:64}});
    const slot:Slot={worker,ready:false};this.#slots[index]=slot;
    worker.on('message',message=>{
      if(message.ready){slot.ready=true;onReady(message.rulesetVersion);this.#next();return;}
      if(slot.timedOut||!slot.running||message.id!==slot.dispatchId)return;
      if(message.calculationWork){slot.running.work=calculationWork(message.calculationWork);return;}
      if(CALCULATION_STAGES.includes(message.progress)){
        slot.running.calculationStage=message.progress;slot.running.stageStartedAt=Date.now();
        slot.running.stats={...slot.running.stats,...calculationNumbers(message.stats)};return;
      }
      clearTimeout(slot.timer);const job=slot.running,now=Date.now();slot.running=undefined;
      job.stats={...job.stats,...calculationNumbers(message.stats)};
      if(job.startedAt!==undefined&&now-job.startedAt>=this.slowMs)try{this.onSlow?.(index,{...this.#details(job,now),...calculationNumbers(message.result?.value?.timings)});}catch{/* Observation cannot reject an operation. */}
      try{
        if(message.error)throw new CloudError(message.error.code,message.error.message,message.error.status,message.diagnostic);
        if(message.result?.yielded===true)this.#yield(job,message.result.slices);
        else this.#finish(job,undefined,this.#accept(job,message.result));
        slot.affinity=this.#key(job.index,job.token);
      }catch(error){this.#finish(job,error);slot.affinity=undefined;}
      this.#next();
    });
    let failed=false;
    const fail=(error:Error,reason:string,exitCode?:number)=>{
      if(failed)return;failed=true;clearTimeout(slot.timer);slot.ready=false;onError(error);
      const details={...this.#details(slot.running),reason,exitCode,sessionsPreserved:true};
      if(slot.running)this.#finish(slot.running,slot.cancelledRead?new CloudError('request-cancelled','此页面的查询已取消',499):interrupted());slot.running=undefined;
      if(!this.#closed){
        try{if(!slot.cancelledRead)this.onReset?.(index,error,details);}catch{/* Observation cannot prevent replacement. */}
        this.#spawn(index,()=>{},()=>{});this.#next();
      }
    };
    worker.on('error',error=>{void worker.terminate();fail(error,'worker-error');});
    worker.on('exit',exitCode=>fail(Object.assign(new Error('计算工作进程已退出'),{code:slot.timedOut?'timeout':'service-unavailable'}),this.#closed?'service-close':slot.timedOut?'running-timeout':'worker-exit',exitCode));
  }
  #next(){
    if(this.#closed)return;
    for(const slot of this.#slots){
      if(!slot.ready||slot.running)continue;
      // A world has one modifier and at most one committed-snapshot reader.
      // All other queries/open operations retain the original exclusive lane.
      const available=(job:Job)=>{
        // Opening a large world also builds a full engine. Count it with
        // commands so cold opens cannot consume the reserved read lane. Closed
        // jobs still occupy this physical allowance until the worker returns.
        if(['command','open'].includes(job.op)&&this.#slots.filter(other=>other.running&&['command','open'].includes(other.running.op)).length>=this.maxConcurrentCommands)return false;
        const running=this.#slots.flatMap(other=>other.running&&!other.running.abandonedRead&&this.#key(other.running.index,other.running.token)===this.#key(job.index,job.token)?[other.running]:[]);
        if(!running.length)return true;
        return job.snapshotRead?running.every(other=>other.op==='command'):job.op==='command'&&running.every(other=>other.snapshotRead===true);
      };
      const first=this.#queue.findIndex(available);if(first<0)continue;
      // Cache affinity may save a restore, but cannot starve an older world.
      const preferred=Date.now()-this.#queue[first].queuedAt<Math.min(50,this.maxWaitMs/2)
        ?this.#queue.findIndex(job=>available(job)&&this.#key(job.index,job.token)===slot.affinity):-1;
      const at=preferred<0?first:preferred;
      const job=this.#queue.splice(at,1)[0];
      clearTimeout(job.waitTimer);
      if(Date.now()-job.queuedAt>=this.maxWaitMs){this.#finish(job,busy());this.#next();continue;}
      if(!this.#live(job)){this.#finish(job,expired());this.#next();continue;}
      if(job.op==='query'&&JSON.stringify(job.owner!.session.checkpointIdentity())!==JSON.stringify(job.identity)){this.#finish(job,new CloudError('stale-preview','进度已变化，请重新查看',409));this.#next();continue;}
      if(Date.now()-job.createdAt>=10*60*1000){this.#finish(job,interrupted());this.#next();continue;}
      slot.running=job;slot.dispatchId=++this.#dispatchId;job.startedAt=Date.now();slot.timedOut=false;
      slot.timer=setTimeout(()=>{slot.timedOut=true;void slot.worker.terminate();},Math.min(this.timeoutMs,Math.max(1,10*60*1000-(Date.now()-job.createdAt))));
      slot.worker.postMessage({id:slot.dispatchId,op:job.op,token:job.token,ownerEpoch:job.nextEpoch??job.epoch,payload:job.payload,checkpoint:job.owner?.session.checkpoint(),takeover:job.takeover,
        ...(this.#localCommitScope && job.snapshotRead ? {readOwner:{...job.identity,seed:job.owner!.session.seed}} : {}),...(job.op==='command'?{slices:job.owner?.continuation?.checkpoint}:{} )});
    }
  }
  request(index:number,op:string,token:string,payload:any={},signal?:AbortSignal,trace?:CalculationTrace):Promise<any>{
    if(op==='query'&&signal?.aborted)return Promise.reject(new CloudError('request-cancelled','此页面的查询已取消',499));
    if(this.#closed||!Number.isInteger(index)||index<0||index>=this.size)return Promise.reject(new CloudError('service-unavailable','计算服务正在准备，请稍后重试',503));
    const key=this.#key(index,token),owner=this.#owners.get(key);
    try{
      if(op==='close'){
        const previous=this.#releases.get(key);if(previous)return previous;
        owner?.session.suspend();this.#owners.delete(key);this.#openings.delete(key);
        if(owner){owner.continuation=undefined;owner.lastFailure=undefined;owner.command=undefined;}
        // A revoked running copy keeps its physical lane/bytes until it really
        // ends, but must not pin retired authority or uncounted continuations.
        for(const slot of this.#slots)if(slot.running&&this.#key(slot.running.index,slot.running.token)===key){slot.running.revoked=true;slot.running.owner=undefined;}
        for(const job of [...this.#queue])if(this.#key(job.index,job.token)===key){this.#queue.splice(this.#queue.indexOf(job),1);this.#finish(job,expired());}
        const release=Promise.resolve(null);this.#releases.set(key,release);
        void release.then(()=>{if(this.#releases.get(key)===release)this.#releases.delete(key);});return release;
      }
      if(op!=='open'&&!owner)throw expired();
      if(op==='battle-takeover'){
        const {operationId,revision}=payload;
        if(Object.keys(payload).length!==2||typeof operationId!=='string'||!operationId.trim()||operationId.length>180||!Number.isSafeInteger(revision)||revision<0)throw new CloudError('invalid-input','战斗操作编号或修订无效',400);
        const current=owner!.command;
        if(current){
          if(!current.takeover||current.payload.id!==operationId||current.payload.expectedRevision!==revision)return Promise.resolve({accepted:false});
          Atomics.store(current.takeover,0,1);
          owner!.takeover={operationId,revision,flag:current.takeover};
        }else{
          if(owner!.session.revision!==revision||owner!.session.hasPending)return Promise.resolve({accepted:false});
          // The control request can arrive before the command in a second HTTP connection.
          const flag=new Int32Array(new SharedArrayBuffer(4));Atomics.store(flag,0,1);
          owner!.takeover={operationId,revision,flag};
        }
        return Promise.resolve({accepted:true});
      }
      if(op==='calculation-status'){
        if(Object.keys(payload).length!==1||typeof payload.operationId!=='string'||!payload.operationId.trim()||payload.operationId.length>180)throw new CloudError('invalid-input','计算操作编号无效');
        if(owner!.command?.payload.id===payload.operationId)return Promise.resolve({status:'running',operationId:payload.operationId,completedSlices:owner!.continuation?.checkpoint.step??0,...(owner!.command!.work?{work:{...owner!.command!.work}}:{})});
        const receipt=owner!.session.pending;
        if(receipt?.operationId===payload.operationId)return Promise.resolve({status:'complete',operationId:payload.operationId,receipt});
        if(owner!.lastFailure?.operationId===payload.operationId)return Promise.resolve({status:'failed',...owner!.lastFailure});
        throw new CloudError('not-found','没有这项待完成计算，请重新核对本机原操作',404);
      }
      if(op==='ack'){owner!.session.acknowledge(payload.resultId,payload.revision);return Promise.resolve({saved:true});}
      if(op==='sync')return Promise.resolve(payload?.head===true?{head:owner!.session.syncHead()}:{snapshot:owner!.session.snapshot(),pending:owner!.session.pending});
      if(op==='model-context'){
        if(owner!.session.hasPending||owner!.continuation)throw new CloudError('save-unacknowledged','请先恢复并完成原来的操作与进度保存',409);
        if(owner!.command||this.#openings.has(key))throw busy();
        if(payload.revision!==owner!.session.revision)throw new CloudError('stale-workflow','进度已变化，请重新生成',409);
        return Promise.resolve(owner!.session.snapshot());
      }
      if(!['open','command','query'].includes(op))throw new CloudError('invalid-operation','不支持这项操作');
      let hash:string|undefined;
      if(op==='open'){
        if(owner&&owner.session.seed!==payload.seed)throw new CloudError('invalid-world','连接与所选世界不一致',409);
        if(owner?.session.hasPending)throw new CloudError('save-unacknowledged','上次行动还未保存到本机，请先恢复并完成保存后再读取',409);
        if(owner?.command||this.#openings.has(key))throw busy();
      }else if(op==='command'){
        payload=validateCommand(payload);const pending=owner!.session.pendingCommand(payload);if(pending)return Promise.resolve(pending);
        hash=sessionCommandHash(payload);
        if(owner!.command){if(owner!.command.hash===hash)return owner!.command.promise;throw busy();}
        if(this.#openings.has(key))throw busy();
        const prior=owner!.continuation?.checkpoint;
        if(prior&&(prior.commandHash!==hash||prior.baseRevision!==owner!.session.revision||prior.baseSnapshotHash!==owner!.session.checkpointIdentity().snapshotHash))owner!.continuation=undefined;
        owner!.lastFailure=undefined;
      }else if(payload.revision!==undefined&&payload.revision!==owner!.session.revision)throw new CloudError('stale-preview','进度已变化，请重新查看',409);
      // This counter is derived when accepting the exact committed world. It cannot queue behind a slow panel or observe a transaction candidate.
      if(op==='query'&&payload.name==='inventory.message-count'&&payload.input&&typeof payload.input==='object'&&!Array.isArray(payload.input)&&Object.keys(payload.input).length===0){
        return Promise.resolve({unread:owner!.session.unreadCommerceMessages});
      }
      const bytes=Buffer.byteLength(JSON.stringify(payload));
      if(this.#queue.length>=this.maxQueue*this.size||this.#queuedBytes+bytes>this.maxQueuedBytes)throw busy();
      let resolve!:(value:any)=>void,reject!:(reason:unknown)=>void;
      const promise=new Promise<any>((yes,no)=>{resolve=yes;reject=no;});
      const now=Date.now(),job:Job={id:++this.#id,index,op,token,payload,bytes,trace:safeTrace(trace),owner,snapshotRead:op==='query'&&concurrentSnapshotQuery(payload.name,payload.input??{}),epoch:owner?.epoch??++this.#epoch,nextEpoch:op==='open'?++this.#epoch:undefined,identity:owner?.session.checkpointIdentity(),hash,createdAt:now,queuedAt:now,resolve,reject,promise};
      const removeQueued=()=>{const at=this.#queue.indexOf(job);if(at<0)return false;this.#queue.splice(at,1);return true;};
      if(op==='query'&&signal){
        const cancel=()=>{
          const error=new CloudError('request-cancelled','此页面的查询已取消',499);
          if(removeQueued()){this.#finish(job,error);return;}
          job.reject(error);
          if(!['inventory.economy','inventory.economy-maximum','inventory.trade-maximum','inventory.trade-batch','presentation.resident-realms','battle.preview','world.preview','story.prompt-preview','recovery.inspect','research.recommend'].includes(job.payload.name))return;
          const slot=this.#slots.find(candidate=>candidate.running===job);
          if(!slot)return;
          // A cancelled preview owns a disposable copy. Let the next operation use the other lane now.
          job.abandonedRead=true;job.revoked=true;this.#next();
          setTimeout(()=>{if(slot.running===job){slot.cancelledRead=true;void slot.worker.terminate();}},150).unref();
        };
        signal.addEventListener('abort',cancel,{once:true});job.detach=()=>signal.removeEventListener('abort',cancel);
      }
      if(op==='command'){
        if(isAutomaticBattleCommand(payload.type)){
          const prior=owner!.takeover;
          job.takeover=prior&&prior.revision===payload.expectedRevision&&prior.operationId===payload.id
            ?prior.flag:new Int32Array(new SharedArrayBuffer(4));
        }
        owner!.command=job;
      }
      if(op==='open')this.#openings.set(key,job);
      this.#queuedBytes+=bytes;this.#queue.push(job);
      job.waitTimer=setTimeout(()=>{if(removeQueued())this.#finish(job,busy());},this.maxWaitMs);
      this.#next();return promise;
    }catch(error){return Promise.reject(error);}
  }
  async close(){
    this.#closed=true;for(const job of this.#queue.splice(0))this.#finish(job,interrupted());
    await Promise.all(this.#slots.map(slot=>slot.worker.terminate()));this.#owners.clear();this.#localCommitScope=undefined;
  }
}
