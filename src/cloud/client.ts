import {CLIENT_RESULT_FAILURE_CODES,CLIENT_RESULT_FAILURE_STAGES} from './protocol';
import {assertCurrentSnapshot} from '../shared/snapshot-version';
import type {GameCommand,GameSnapshot} from '../runtime/contracts';
import {CLOUD_PROTOCOL,CloudError,modelContinuationKey,classifyResultFailure,type CloudReceipt,type ModelRecoveryCategory,type ModelRecoveryMetadata} from './protocol';
import {jsonEqual} from '../shared/json-identity';
import type {ModelLog} from '../runtime/model-gateway';
import type {ModelEvidenceConsumer} from '../shared/model-evidence';
import {modelTransportProfile} from '../runtime/model-request-profile';
import type {ModelProfile} from '../runtime/model-gateway';
import {BrowserModels} from './browser-model';
import {isModelObservationDetached} from '../runtime/model-task';
import {calculationWork,type CalculationWork} from '../shared/calculation-progress';

interface ModelPointer {id:string;fingerprint:string;submissionId?:string;retryAttempt?:unknown;worldId?:string;identityVersion?:1}
const resultMessages:Record<ModelRecoveryCategory,string>={
  quota:'生成已经完成，但本机存储空间不足。腾出空间后可取回这份结果，无需重新生成。',
  blocked:'生成已经完成，但浏览器未允许保存。恢复此站点的存储权限后可取回这份结果。',
  transaction:'生成已经完成，但本机保存被中断。可以重试保存这份结果，无需重新生成。',
  conflict:'生成已经完成，但待完成的操作与本机进度发生冲突。请先恢复原操作，再完成这份结果。',
  mismatch:'生成已经完成，但结果与原操作未能核对一致。这份结果已保留，可以取回后重试。',
  expired:'这份生成结果已无法取回。已有进度保留；需要重新生成时，请明确选择重新生成。',
  unknown:'生成已经完成，但结果还未能保存。这份结果已保留，可以重试取回；若仍失败，可导出诊断。',
};

export class CloudClient {
  #token='';
  #worldKey='';
  #worldId='';
  #modelPointers=new Map<string,ModelPointer>();
  #modelOwners=new Map<string,string>();
  readonly #browser:BrowserModels;
  constructor(readonly buildId:string,readonly baseUrl='',readonly fetcher:typeof fetch=fetch,providerFetcher:typeof fetch=fetch){this.#browser=new BrowserModels((operation,data,signal,keepalive)=>this.request('browser-model/'+operation,data,signal,undefined,keepalive),providerFetcher);}
  connectionDiagnostics(){return {hasSession:Boolean(this.#token),worldId:this.#worldId||null,buildId:this.buildId};}
  hasRetainedModel():boolean {const saved=this.#retainedOwner();return Boolean(saved.pointer||saved.invalid||saved.unavailable);}
  async request(path:string,payload:unknown,signal?:AbortSignal,token=this.#token,keepalive=false):Promise<any>{
    let response:Response;
    const send=this.fetcher;
    const requestId=crypto.randomUUID();
    const cancelNative=path==='query'&&signal&&typeof window!=='undefined'?window.douluoDesktop?.cancelQuery:undefined;
    const cancel=()=>cancelNative?.(requestId);
    if(cancelNative)signal!.addEventListener('abort',cancel,{once:true});
    const snapshotRequest=path==='session'||path==='recovery';
    const deadline=path==='session'||path==='sync'?AbortSignal.timeout(60000):undefined;
    const transportSignal=deadline?(signal?AbortSignal.any([signal,deadline]):deadline):signal;
    try{
      let body:BodyInit=JSON.stringify(payload),compressed=false;
      if(snapshotRequest&&body.length>=65536&&typeof window!=='undefined'&&!window.douluoDesktop&&typeof window.CompressionStream==='function'){
        body=await new Response(new Blob([body]).stream().pipeThrough(new CompressionStream('gzip'))).blob();compressed=true;
      }
      transportSignal?.throwIfAborted();
      response=await send(this.baseUrl+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json','X-Douluo-Protocol':CLOUD_PROTOCOL,'X-Douluo-Build':this.buildId,'X-Douluo-Request-Id':requestId,...(token?{Authorization:'Bearer '+token}:{}),...(compressed?{'Content-Encoding':'gzip'}:{})},body,cache:'no-store',signal:transportSignal,keepalive});
    }
    catch(error){if(path==='query'&&signal?.aborted)throw new CloudError('request-cancelled','已取消这次查看',499,error,requestId);throw new CloudError('connection-lost',deadline?.aborted?'连接计算服务超时，本机进度仍保留。可以重新连接后继续。':'网络连接中断，本次操作已保留，可以重新连接后继续',0,error,requestId);}
    finally{if(cancelNative)signal!.removeEventListener('abort',cancel);}
    let result:any;try{result=await response.json();}catch(error){if(path==='query'&&signal?.aborted)throw new CloudError('request-cancelled','已取消这次查看',499,error,requestId);throw new CloudError('connection-lost','答复未完整收到，本次操作已保留',response.status,error,requestId);}
    if(!response.ok)throw new CloudError(result.error?.code??'server-error',result.error?.message??'服务暂时无法完成操作',response.status,undefined,requestId);
    return result;
  }
  async open(worldId:string,snapshot?:GameSnapshot,resume=true):Promise<GameSnapshot>{
    if(snapshot)assertCurrentSnapshot(snapshot);
    const key=`douluo-cloud-session:${this.baseUrl}:${this.buildId}:${worldId}`;
    let remembered='';try{remembered=typeof sessionStorage==='undefined'?'':sessionStorage.getItem(key)??'';}catch{}
    const candidate=this.#worldKey===key?this.#token:remembered;
    if(resume&&candidate&&snapshot){
      try{
        let current=await this.request('sync',{head:true},undefined,candidate);
        if(current.head){
          const head=current.head;
          if(head.worldId!==worldId)throw new CloudError('invalid-receipt','收到的进度不属于当前世界',409);
          if(!head.hasPending&&head.revision===snapshot.revision&&globalThis.crypto?.subtle){
            const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(snapshot)));
            const digest=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
            if(head.digest===digest){this.#token=candidate;this.#worldKey=key;this.#worldId=worldId;return snapshot;}
          }
          current=await this.request('sync',{},undefined,candidate);
        }
        assertCurrentSnapshot(current.snapshot);
        const samePending=current.pending?.delta.baseRevision===snapshot.revision;
        // The action may already be saved locally while only its ACK was lost.
        const sameState=current.snapshot.revision===snapshot.revision&&jsonEqual(current.snapshot.state,snapshot.state);
        if(samePending||sameState){this.#token=candidate;this.#worldKey=key;this.#worldId=worldId;return snapshot;}
      }catch(error){if(!(error instanceof CloudError)||error.code!=='session-expired')throw error;}
    }
    // The remembered bearer proves ownership even in a newly constructed runtime.
    // The service can replace this world's connection without allocating it twice.
    const result=await this.request('session',{worldId,snapshot},undefined,candidate);
    if(result.protocol!==CLOUD_PROTOCOL||result.buildId!==this.buildId)throw new CloudError('client-version','游戏已更新，请先保存进度并刷新页面',426);
    assertCurrentSnapshot(result.snapshot);
    const previous=this.#token||remembered;this.#token=result.token;this.#worldKey=key;this.#worldId=worldId;
    try{if(typeof sessionStorage!=='undefined')sessionStorage.setItem(key,this.#token);}catch{}
    if(previous&&previous!==result.token){const retained=this.#readModelPointer(`douluo-cloud-model:${previous}`);if(!retained.pointer&&!retained.invalid&&!retained.unavailable)try{await this.request('close',{},undefined,previous);}catch{/* Old isolated session expires by TTL. */}}
    return result.snapshot;
  }
  async command(command:GameCommand,observe?:(work:CalculationWork)=>void):Promise<CloudReceipt>{
    const token=this.#token,operationId=command.id;
    const first=await this.request('command',command,undefined,token);
    if(!first?.calculationPending)return first;
    if(first.operationId!==operationId)throw new CloudError('invalid-receipt','待完成计算与原操作不一致，原进度已保留',409);
    // The complete command (and any signed ticket) is sent once. Poll only its
    // owned operation id; refreshing/reconnecting reuses the durable same command.
    const deadline=Date.now()+12*60*1000;
    let delay=typeof window!=='undefined'&&window.douluoDesktop?0:1000;
    while(Date.now()<deadline){
      if(delay)await new Promise<void>(resolve=>setTimeout(resolve,delay));
      delay=Math.min(1000,Math.max(100,delay*2));
      const status=await this.request('calculation',{operationId},undefined,token);
      if(status?.operationId!==operationId)throw new CloudError('invalid-receipt','计算答复与原操作不一致，原进度已保留',409);
      if(status.status==='complete'&&status.receipt?.operationId===operationId)return status.receipt;
      if(status.status==='failed')throw new CloudError(status.error?.code??'calculation-interrupted',status.error?.message??'这次计算暂时中断，原进度已保留',status.error?.status??503,undefined,status.error?.requestId);
      if(status.status!=='running')throw new CloudError('invalid-response','计算状态未能核对，原进度已保留',409);
      try{const work=calculationWork(status.work);if(work)observe?.(work);}catch{/* Display failures cannot repeat or reject the operation. */}
    }
    throw new CloudError('calculation-interrupted','这次计算仍需继续处理，原进度已保留，请重新连接后核对原操作',503);
  }
  query(name:string,input:Record<string,unknown>,signal?:AbortSignal,revision?:number):Promise<any>{return this.request(name==='recovery.inspect'?'recovery':'query',{name,input,...(revision===undefined?{}:{revision})},signal);}
  #readModelPointer(key:string):{pointer?:ModelPointer;invalid?:boolean;unavailable?:ModelRecoveryCategory} {
    const memory=this.#modelPointers.get(key);if(memory)return {pointer:memory};
    let raw:string|null;
    try{raw=typeof sessionStorage==='undefined'?null:sessionStorage.getItem(key);}catch(error){return {unavailable:classifyResultFailure(error)};}
    if(raw===null)return {};
    try{
      const pointer=JSON.parse(raw);
      if(!pointer||typeof pointer!=='object'||typeof pointer.id!=='string'||typeof pointer.fingerprint!=='string'||!pointer.fingerprint||pointer.submissionId!==undefined&&typeof pointer.submissionId!=='string')return {invalid:true};
      return {pointer};
    }catch{return {invalid:true};}
  }
  #ownerKey(worldId=this.#worldId){return `douluo-cloud-model-owner:${this.baseUrl}:${this.buildId}:${worldId}`;}
  #retainedOwner(){
    const ownerKey=this.#ownerKey();let token=this.#modelOwners.get(ownerKey),indexed=!!token,submissionId:string|undefined;
    if(!token){
      let raw:string|null;
      try{raw=typeof sessionStorage==='undefined'?null:sessionStorage.getItem(ownerKey);}catch(error){return {token:this.#token,key:`douluo-cloud-model:${this.#token}`,unavailable:classifyResultFailure(error)};}
      if(raw!==null)try{const saved=JSON.parse(raw);if(saved?.version!==1||saved.worldId!==this.#worldId||typeof saved.token!=='string'||!saved.token||saved.token.length>512||saved.submissionId!==undefined&&typeof saved.submissionId!=='string')return {token:this.#token,key:`douluo-cloud-model:${this.#token}`,invalid:true};token=saved.token;submissionId=saved.submissionId;indexed=true;}catch{return {token:this.#token,key:`douluo-cloud-model:${this.#token}`,invalid:true};}
    }
    token??=this.#token;const key=`douluo-cloud-model:${token}`,saved=this.#readModelPointer(key);
    return {token,key,...saved,...(indexed&&!saved.pointer&&!saved.unavailable||submissionId!==undefined&&submissionId!==saved.pointer?.submissionId?{invalid:true}:{})};
  }
  #recoveryStorageFailure(category:ModelRecoveryCategory,recoverOnly=false){
    return new CloudError('model-recovery-unavailable',recoverOnly?'浏览器暂时无法读取原任务的恢复信息。原输入仍保留，请恢复本站存储权限后再取回。':'浏览器未能保存本次任务的恢复信息，尚未向 AI 发送请求。当前输入已保留，请恢复本站存储权限或腾出空间后重试。',409,undefined,undefined,undefined,{category,stage:recoverOnly?'model-result-retrieve':'model-request-preflight',canRetrySameJob:recoverOnly});
  }
  #saveModelPointer(key:string,pointer:ModelPointer,token:string,required=false){
    const ownerKey=this.#ownerKey(pointer.worldId),owner={version:1,worldId:pointer.worldId??this.#worldId,token,submissionId:pointer.submissionId},pointerText=JSON.stringify(pointer),ownerText=JSON.stringify(owner);
    if(required){
      let storage:Storage|undefined;
      try{
        storage=typeof sessionStorage==='undefined'?undefined:sessionStorage;
        if(!storage)throw new DOMException('本站恢复存储不可用','SecurityError');
        storage.setItem(key,pointerText);storage.setItem(ownerKey,ownerText);
        if(storage.getItem(key)!==pointerText||storage.getItem(ownerKey)!==ownerText)throw Error('本次恢复信息未能通过保存核对');
      }catch(error){
        // Each rollback is tied to this submission, including the owner index.
        // Never erase an unrelated record when storage cannot be read reliably.
        try{const current=JSON.parse(storage?.getItem(key)??'null');if(current?.submissionId===pointer.submissionId&&current?.fingerprint===pointer.fingerprint&&current?.worldId===pointer.worldId)storage?.removeItem(key);}catch{}
        try{const current=JSON.parse(storage?.getItem(ownerKey)??'null');if(current?.token===token&&current?.worldId===owner.worldId&&current?.submissionId===pointer.submissionId)storage?.removeItem(ownerKey);}catch{}
        throw this.#recoveryStorageFailure(classifyResultFailure(error));
      }
    }
    this.#modelPointers.set(key,pointer);this.#modelOwners.set(ownerKey,token);
    if(!required){
      // The pre-start submission pointer already permits recovery when a later
      // update cannot be saved; status can resolve its original submissionId.
      try{if(typeof sessionStorage!=='undefined')sessionStorage.setItem(key,pointerText);}catch{}
      try{if(typeof sessionStorage!=='undefined')sessionStorage.setItem(ownerKey,ownerText);}catch{}
    }
  }
  #clearModelPointer(key:string,pointer:ModelPointer){
    const owned=(current:any)=>current?.fingerprint===pointer.fingerprint&&(pointer.id?current.id===pointer.id||!current.id&&pointer.submissionId&&current.submissionId===pointer.submissionId:current.submissionId===pointer.submissionId);
    if(owned(this.#modelPointers.get(key)))this.#modelPointers.delete(key);
    try{if(typeof sessionStorage!=='undefined'&&owned(JSON.parse(sessionStorage.getItem(key)??'null')))sessionStorage.removeItem(key);}catch{}
    const remaining=this.#readModelPointer(key);
    if(!remaining.pointer&&!remaining.invalid&&!remaining.unavailable){const ownerKey=this.#ownerKey(pointer.worldId);if(`douluo-cloud-model:${this.#modelOwners.get(ownerKey)}`===key)this.#modelOwners.delete(ownerKey);try{const raw=typeof sessionStorage==='undefined'?null:sessionStorage.getItem(ownerKey),owner=raw?JSON.parse(raw):null;if(owner&&`douluo-cloud-model:${owner.token}`===key&&(owner.submissionId===undefined||owner.submissionId===pointer.submissionId))sessionStorage.removeItem(ownerKey);}catch{}}
  }
  #reportResultFailure(error:CloudError,token:string){
    const r=error.recovery;if(!r||['cancelled','model-recovery-unavailable'].includes(error.code))return;
    // A worker's public error code may vary. The thrown error keeps it; the
    // advisory report uses one fixed terminal label rather than provider input.
    const code=r.stage==='model-result-failed'?'model-failed':error.code;
    if(!CLIENT_RESULT_FAILURE_CODES.includes(code)||!CLIENT_RESULT_FAILURE_STAGES.includes(r.stage))return;
    void this.request('client-failure',{code,category:r.category,stage:r.stage,...(r.jobId?{jobId:r.jobId}:{}),...(r.requestId?{requestId:r.requestId}:{}),...(r.revision===undefined?{}:{revision:r.revision}),...(r.kind?{kind:r.kind}:{})},undefined,token).catch(()=>{});
  }
  async model(request:Record<string,unknown>,signal?:AbortSignal,observe?:(log:ModelLog)=>void,consume?:(result:any)=>Promise<void>,retainEvidence?:ModelEvidenceConsumer):Promise<any>{
    const recoverOnly=request.recoverOnly===true;
    const {recoverOnly:_recoverOnly,...wire}=request;request=wire;
    if(request.profile&&typeof request.profile==='object')request={...request,profile:modelTransportProfile(request.profile as ModelProfile)};
    const owner=this.#retainedOwner(),token=owner.token,key=owner.key;
    const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(modelContinuationKey(request))))).map(byte=>byte.toString(16).padStart(2,'0')).join('');
    let pointer:ModelPointer|undefined,id='',release=false,consuming=false,persistingEvidence=false,ownsRequestedTask=false,afterEvidence=0,afterStatus=0,status:any;
    const metadata=(category:ModelRecoveryCategory,stage:string,canRetrySameJob=true):ModelRecoveryMetadata=>({category,stage,canRetrySameJob,...(id?{jobId:id}:{}),...(status?.requestId?{requestId:status.requestId}:{}),...(typeof request.kind==='string'?{kind:request.kind}:{}),...(typeof request.revision==='number'?{revision:request.revision}:{}),...(typeof status?.completedAt==='string'?{completedAt:status.completedAt}:{}),...(typeof status?.expiresAt==='string'?{expiresAt:status.expiresAt}:{})});
    const retain=async(value:any)=>{if(value.evidence&&retainEvidence){persistingEvidence=true;await retainEvidence(value.evidence);afterEvidence=value.evidence.sequence;persistingEvidence=false;}};
    const readStatus=async(value:ModelPointer,readSignal?:AbortSignal)=>this.request('model/status',value.id?{id:value.id,afterEvidence,afterStatus,waitMs:25000}:{submissionId:value.submissionId,afterEvidence,afterStatus,waitMs:0},readSignal,token);
    const checkIdentity=(value:any,known:boolean)=>{
      const identity=value.identity;
      if(identity){
        if(identity.version!==1||typeof identity.fingerprint!=='string'||!this.#worldId||identity.worldId!==this.#worldId)throw new CloudError('model-result-unverified','还有一份生成结果未能核对所属旅程。请先处理原结果，或明确放弃后再开始。',409,undefined,value.requestId,id,metadata('mismatch','model-result-identity'));
        if(identity.fingerprint!==fingerprint||identity.kind!==request.kind||identity.revision!==request.revision)throw new CloudError('model-result-pending','还有一份生成结果尚未处理。请先完成原操作，或明确放弃后再开始新的生成。',409,undefined,value.requestId,id,metadata('conflict','model-result-identity'));
      }else if(!known)throw new CloudError('model-result-unverified','保留的生成任务暂时无法核对。已有结果未被清除；请先处理原任务，或明确放弃后再开始。',409,undefined,value.requestId,id,metadata('mismatch','model-result-identity'));
    };
    const cancelAndWait=async()=>{
      const cleanup=AbortSignal.timeout(30000);await this.request('model/cancel',{id},cleanup,token);let cursor=0;
      while(true){const current=await this.request('model/status',{id,afterEvidence,afterStatus:cursor,waitMs:25000},cleanup,token);cursor=current.statusRevision??cursor;await retain(current);if(!current.cancellationPending)return current;}
    };
    try{
      const saved=owner;pointer=saved.pointer;id=pointer?.id??'';
      if(saved.unavailable)throw this.#recoveryStorageFailure(saved.unavailable,recoverOnly);
      if(saved.invalid)throw new CloudError('model-result-unverified','保留的生成任务资料暂时无法读取。请先处理或明确放弃原任务，再开始新的生成。',409,undefined,undefined,undefined,metadata('mismatch','model-result-identity',false));
      if(pointer){
        if(!pointer.id&&!pointer.submissionId)throw new CloudError('model-result-unverified','保留的生成任务缺少取回编号。请先明确放弃原任务，再开始新的生成。',409,undefined,undefined,undefined,metadata('mismatch','model-result-identity',false));
        if(pointer.worldId&&this.#worldId&&pointer.worldId!==this.#worldId)throw new CloudError('model-result-unverified','保留的生成结果属于另一段旅程，尚未写入当前进度。',409,undefined,undefined,id,metadata('mismatch','model-result-identity',false));
        ownsRequestedTask=pointer.fingerprint===fingerprint;
        status=await readStatus(pointer,signal);id=pointer.id||status.jobId||'';
        if(!id)throw new CloudError('model-result-unverified','暂时无法确认保留任务的编号，未发起新的生成。',409,undefined,status.requestId,undefined,metadata('mismatch','model-result-identity',false));
        // A terminal author job has no signed result left to consume. Keep its
        // evidence, then allow this explicit retry of the same settled source;
        // live jobs, completed results and other workflows retain their latch.
        const identity=status.identity;
        const failedAuthor=status.status==='failed'&&['story-writer','story-rewrite'].includes(String(request.kind))&&
          identity?.version===1&&identity.worldId===this.#worldId&&identity.kind===request.kind&&identity.revision===request.revision&&identity.fingerprint===pointer.fingerprint;
        // A failed settings probe has no world-changing result to recover.
        // Preserve its evidence and release it before an explicit new operation.
        const failedConnection=status.status==='failed'&&identity?.version===1&&identity.worldId===this.#worldId&&identity.fingerprint===pointer.fingerprint&&['list','test','generation-test'].includes(identity.kind);
        const failedPeopleRetry=status.status==='failed'&&request.kind==='world-people'&&!!request.retryAttempt&&
          identity?.version===1&&identity.worldId===this.#worldId&&identity.kind===request.kind&&
          identity.revision===request.revision&&identity.fingerprint===fingerprint&&pointer.fingerprint===fingerprint;
        if(failedAuthor||failedConnection||failedPeopleRetry){
          await retain(status);
          if(status.cancellationPending){status=await cancelAndWait();await retain(status);}
          if(status.status==='failed'){
            const failure=new CloudError(status.error.code,status.error.message,status.error.status,undefined,status.requestId,id,metadata('unknown','model-result-failed',false));
            this.#clearModelPointer(key,pointer);void this.request('model/release',{id},undefined,token).catch(()=>{});
            pointer=undefined;id='';status=undefined;ownsRequestedTask=false;
            if(recoverOnly)throw failure;
          }
        }
        if(pointer){
          checkIdentity(status,pointer.fingerprint===fingerprint);
          ownsRequestedTask=true;
          pointer={...pointer,id,fingerprint,worldId:this.#worldId,identityVersion:1};this.#saveModelPointer(key,pointer,token);
        }
      }
      if(!pointer){
        if(recoverOnly)throw new CloudError('model-expired','没有可直接取回的生成结果。已有进度保留；如需再次调用模型，请选择重新生成。',410,undefined,undefined,undefined,metadata('expired','model-result-retrieve',false));
        const outbound=request.profile&&typeof request.profile==='object'?{...request,profile:await this.#browser.prepare(request.profile as ModelProfile,signal)}:request;
        signal?.throwIfAborted();
        pointer={id:'',fingerprint,submissionId:crypto.randomUUID(),retryAttempt:request.retryAttempt??null,worldId:this.#worldId,identityVersion:1};this.#saveModelPointer(key,pointer,token,true);
        ownsRequestedTask=true;
        let started:any;
        try{started=await this.request('model/start',{...outbound,submissionId:pointer.submissionId,retryAttempt:pointer.retryAttempt??undefined},signal,token);}
        catch(error){
          // An explicit preflight rejection precedes model dispatch. A lost
          // response or an existing job remains uncertain and must stay retained.
          if(error instanceof CloudError&&(['session-expired','client-version'].includes(error.code)||error.code==='rate-limit'&&error.status===429)&&!pointer.id){
            this.#clearModelPointer(key,pointer);pointer=undefined;
            throw new CloudError(error.code,error.code==='session-expired'?'计算连接已中断，本次尚未向AI发送请求。原输入已保留，恢复连接后可以继续原设计。':error.message,error.status,error,error.requestId,undefined,metadata('unknown','model-request-preflight',false));
          }
          throw error;
        }
        id=started.id;
        pointer={...pointer,id};this.#saveModelPointer(key,pointer,token);
      }
      while(true){
        if(signal?.aborted)throw signal.reason;
        if(!status)status=await readStatus(pointer!,signal);
        checkIdentity(status,true);afterStatus=status.statusRevision??afterStatus;await retain(status);
        for(const log of status.logs??[])observe?.(log);
        if(status.status==='failed'){
          if(status.cancellationPending)status=await cancelAndWait();
          release=true;throw new CloudError(status.error.code,status.error.message,status.error.status,undefined,status.requestId,id,metadata('unknown','model-result-failed',false));
        }
        if(status.status==='complete'){consuming=true;await consume?.(status.result);release=true;return status.result;}
        status=undefined;
      }
    }catch(error){
      let failure:unknown=error;
      if(signal?.aborted&&isModelObservationDetached(signal.reason)){
        release=false;throw signal.reason;
      }else if(signal?.aborted){
        if(!consuming&&id&&ownsRequestedTask)try{status=await cancelAndWait();release=status.status!=='complete';}catch{release=false;}
        const confirmed=release&&status?.status==='failed'&&!status.cancellationPending;
        failure=new CloudError('cancelled',status?.status==='complete'||consuming?'本次处理已停止，已经生成的结果仍保留，可以继续取回。':'本次生成已停止，已确定的方案仍保留。',422,error,status?.requestId,id||undefined,metadata('unknown',confirmed?'model-cancel-confirmed':'model-result-retrieve',!confirmed));
      }else if(error instanceof CloudError&&error.code==='stale-workflow'){
        failure=new CloudError(error.code,error.message,error.status,error,error.requestId??status?.requestId,id||error.jobId,metadata('conflict','model-result-identity',false));
      }else if(consuming){
        const suppliedStage=(error as CloudError)?.recovery?.stage;
        const category=classifyResultFailure(error),r=metadata(category,['model-result-identity','model-result-retrieve','model-result-consume','model-evidence-persist','model-result-discard'].includes(suppliedStage??'')?suppliedStage!:'model-result-consume');
        failure=new CloudError('model-save-pending',resultMessages[category],409,error,r.requestId,id,r);
      }else if(persistingEvidence){
        const category=classifyResultFailure(error),r=metadata(category,'model-evidence-persist');
        failure=new CloudError('model-evidence-pending','生成记录暂时未能保存。原任务仍保留，可以取回后重试。',409,error,r.requestId,id||undefined,r);
      }else if(error instanceof CloudError&&error.code==='model-expired'){
        failure=new CloudError(error.code,resultMessages.expired,410,error,error.requestId??status?.requestId,id||undefined,metadata('expired','model-result-retrieve',false));
      }else if(error instanceof CloudError&&error.code==='session-expired'&&error.recovery?.stage==='model-request-preflight'){
        failure=error;
      }else if(error instanceof CloudError&&error.code==='session-expired'){
        failure=new CloudError('model-unconfirmed','计算连接已中断，原任务编号仍保留。请重新连接后核对原任务。',410,error,error.requestId,id||undefined,metadata('unknown','model-result-retrieve'));
      }else if(error instanceof CloudError&&error.code==='connection-lost'){
        failure=new CloudError('model-unconfirmed','暂时未能确认生成结果。原任务已保留，恢复连接后会先取回，不会自动重新生成。',0,error,error.requestId,id||undefined,metadata('unknown','model-result-retrieve'));
      }
      if(failure instanceof CloudError)this.#reportResultFailure(failure,token);
      throw failure;
    }finally{
      if(release&&pointer){this.#clearModelPointer(key,pointer);if(id)void this.request('model/release',{id},undefined,token).catch(()=>{});}
    }
  }
  /** Explicit abandonment is the only operation that can replace an unconfirmed task. */
  async discardRetainedModel(expectedJobId?:string):Promise<void>{
    const saved=this.#retainedOwner(),token=saved.token,key=saved.key,pointer=saved.pointer;
    if(!pointer){if(saved.invalid){this.#modelPointers.delete(key);this.#modelOwners.delete(this.#ownerKey());try{sessionStorage.removeItem(key);sessionStorage.removeItem(this.#ownerKey());}catch{}}return;}
    let id=pointer.id,status:any;
    if(expectedJobId&&id&&expectedJobId!==id)throw new CloudError('model-result-pending','待处理的任务已经变化，请重新查看后再放弃。',409,undefined,undefined,id,{category:'conflict',stage:'model-result-discard',canRetrySameJob:true,jobId:id});
    try{
      if(!id&&pointer.submissionId){status=await this.request('model/status',{submissionId:pointer.submissionId,waitMs:0},undefined,token);id=status.jobId;}
      if(expectedJobId&&id!==expectedJobId)throw new CloudError('model-result-pending','待处理的任务已经变化，请重新查看后再放弃。',409);
      if(id){
        const signal=AbortSignal.timeout(30000);await this.request('model/cancel',{id},signal,token);let afterStatus=0;
        while(true){status=await this.request('model/status',{id,afterStatus,waitMs:25000},signal,token);afterStatus=status.statusRevision??afterStatus;if(!status.cancellationPending)break;}
        await this.request('model/release',{id},signal,token);
      }
    }catch(error){if(!(error instanceof CloudError)||!['model-expired','session-expired'].includes(error.code)){
      const recovery:ModelRecoveryMetadata={category:classifyResultFailure(error),stage:'model-result-discard',canRetrySameJob:true,...(id?{jobId:id}:{}),...(status?.requestId?{requestId:status.requestId}:{}),...(status?.completedAt?{completedAt:status.completedAt}:{}),...(status?.expiresAt?{expiresAt:status.expiresAt}:{})};
      const failure=new CloudError('model-result-pending','暂时未能确认放弃这份结果，原任务仍保留。请恢复连接后重试。',409,error,recovery.requestId,id||undefined,recovery);this.#reportResultFailure(failure,token);throw failure;
    }}
    this.#clearModelPointer(key,pointer);
  }
  async ack(resultId:string,revision:number):Promise<void>{await this.request('ack',{resultId,revision});}
  async close(){
    const retained=this.#retainedOwner(),preserve=Boolean(retained.pointer||retained.invalid)&&retained.token===this.#token;let released=false;
    try{if(this.#token&&!preserve){try{await this.request('close',{});}catch(error){if(!(error instanceof CloudError)||error.code!=='session-expired')throw error;}released=true;}}
    finally{try{if(released&&typeof sessionStorage!=='undefined'&&sessionStorage.getItem(this.#worldKey)===this.#token)sessionStorage.removeItem(this.#worldKey);}catch{}
      await this.#browser.close();this.#token='';this.#worldKey='';this.#worldId='';
    }
  }
}
