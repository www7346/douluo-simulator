import {assertCurrentSnapshot,SNAPSHOT_SCHEMA_VERSION} from '../shared/snapshot-version';
import type {GameCommand,GameSnapshot} from '../runtime/contracts';
import {CloudClient} from './client';
import {detachedRead} from '../shared/frozen-snapshot';
import {applyReadOnlyDelta,applyStateDelta,CloudError,type CloudReceipt} from './protocol';
import {saveCodec} from '../shared/save-codec';
import type {ModelLog} from '../runtime/model-gateway';
import type {CalculationWork} from '../shared/calculation-progress';
import type {ModelEvidenceConsumer} from '../shared/model-evidence';
import {concurrentSnapshotQuery} from '../shared/snapshot-query-policy';

import type {RuntimeEngine,EngineResult} from '../runtime/runtime-engine';
export type {RuntimeEngine,EngineResult} from '../runtime/runtime-engine';
declare const __CLOUD_BUILD_ID__:string;
interface CachedQuery {pending:Promise<any>;keepAfterPreferences:boolean}

function worldPreferencesOnly(before:GameSnapshot,after:GameSnapshot,receipt?:CloudReceipt){
  const delta=receipt?.delta,extension=delta?.extension;
  if(!delta||!extension||delta.baseRevision!==before.revision||delta.revision!==after.revision||after.revision!==before.revision+1)return false;
  if(delta.remove.length||delta.sections||delta.battleReports||Object.keys(delta.replace).some(key=>key!=='系统'))return false;
  if(extension.remove.length||!Object.hasOwn(extension.replace,'battlePreferences')||
     Object.keys(extension.replace).some(key=>key!=='webRuntime'&&key!=='battlePreferences'))return false;
  const oldSystem=(before.state as any).系统,newSystem=(after.state as any).系统;
  return JSON.stringify({...oldSystem,revision:after.revision})===JSON.stringify(newSystem);
}

// These display queries read world facts. Quotes, action choices and any
// unfinished query stay bound to the revision under which they were issued.
function reusableSceneRead(name:string,input:Record<string,unknown>){
  return (name==='scene.atlas'&&input.scope==='map'&&Object.keys(input).length===1)||
    name==='scene.people'||name==='scene.person'||name==='character.relationship';
}

interface QueryFlight {controller:AbortController;pending:Promise<any>;users:number;done:boolean}
export class RemoteEngine implements RuntimeEngine {
  readonly commitProtocol='acknowledged' as const;
  readonly remote=true;
  onCalculationWork?:(work:CalculationWork)=>void;
  #queries=new Map<string,CachedQuery>();
  #queryFlights=new Map<string,QueryFlight>();
  #queryEpoch=0;
  #opening?:Promise<void>;
  #closing?:Promise<void>;
  #closed=false;
  #snapshot:GameSnapshot={schemaVersion:SNAPSHOT_SCHEMA_VERSION,rulesetVersion:saveCodec.VERSION,revision:0,savedAt:new Date(0).toISOString(),state:{}};
  constructor(readonly worldId:string,readonly client=new CloudClient(typeof __CLOUD_BUILD_ID__==='undefined'?'development':__CLOUD_BUILD_ID__)){}
  get revision(){return this.#snapshot.revision;}
  getSnapshot(){return structuredClone(this.#snapshot);}
  readSnapshot(){return this.#snapshot=detachedRead(this.#snapshot);}
  connectionDiagnostics(){return {...this.client.connectionDiagnostics(),executor:typeof window!=='undefined'&&window.douluoDesktop?'device':'server',cachedQueries:this.#queries.size,queryEpoch:this.#queryEpoch};}
  hasRetainedModel(){return this.client.hasRetainedModel();}
  #invalidateQueries(keepSceneReads=false){
    this.#queryEpoch++;
    if(keepSceneReads){for(const [key,entry] of this.#queries)if(!entry.keepAfterPreferences)this.#queries.delete(key);}
    else this.#queries.clear();
    for(const flight of this.#queryFlights.values())flight.controller.abort();
    this.#queryFlights.clear();
  }
  #cache(key:string,pending:Promise<any>,keepAfterPreferences=false){
    if(!this.#queries.has(key)&&this.#queries.size>=64)this.#queries.delete(this.#queries.keys().next().value!);
    this.#queries.set(key,{pending,keepAfterPreferences});
  }
  #open(snapshot:GameSnapshot|undefined,resume:boolean):Promise<void>{
    if(this.#opening||this.#closing)return Promise.reject(new CloudError('service-busy','正在连接旅程，请稍后重试',503));
    this.#invalidateQueries();this.#closed=false;
    this.#opening=(async()=>{
      try{
        const opened=await this.client.open(this.worldId,snapshot,resume);
        if(this.#closed)throw new CloudError('session-expired','旅程已经关闭，请重新连接',409);
        this.#snapshot=detachedRead(opened);this.#invalidateQueries();
      }finally{this.#opening=undefined;}
    })();
    return this.#opening;
  }
  connect(snapshot?:GameSnapshot){return this.#open(snapshot,true);}
  restore(snapshot:GameSnapshot){return this.#open(snapshot,false);}
  async requestBattleTakeover(operationId:string,revision:number):Promise<void>{
    await this.client.request('battle-takeover',{operationId,revision});
  }
  dispatchReadOnly(command:GameCommand):Promise<EngineResult>{return this.dispatch(command,true);}
  async dispatch(command:GameCommand,readOnly=false):Promise<EngineResult>{
    const cloudReceipt=await this.client.command(command,work=>this.onCalculationWork?.(work));
    if(cloudReceipt.operationId!==command.id)throw new CloudError('invalid-receipt','收到的操作结果不匹配，进度已保留',409);
    return {snapshot:readOnly?applyReadOnlyDelta(this.readSnapshot(),cloudReceipt.delta):applyStateDelta(this.#snapshot,cloudReceipt.delta),events:cloudReceipt.events,idempotent:cloudReceipt.idempotent,cloudReceipt};
  }
  // Called only after the local storage transaction succeeds.
  accept(snapshot:GameSnapshot,receipt?:CloudReceipt){
    assertCurrentSnapshot(snapshot);
    this.#invalidateQueries(worldPreferencesOnly(this.#snapshot,snapshot,receipt));
    this.#snapshot=detachedRead(snapshot);
  }
  acknowledge(resultId:string,revision:number){return this.client.ack(resultId,revision);}
  #sharedQuery(key:string,name:string,input:Record<string,unknown>,revision:number,epoch:number,signal?:AbortSignal):Promise<any>{
    signal?.throwIfAborted();
    let flight=this.#queryFlights.get(key);
    if(!flight){
      if(this.#queryFlights.size>=64)throw new CloudError('service-busy','正在查看较多资料，请稍后重试',503);
      const controller=new AbortController(),created:QueryFlight={controller,pending:undefined!,users:0,done:false};flight=created;
      created.pending=this.client.query(name,input,controller.signal,revision).then(response=>{
        created.done=true;if(this.#queryFlights.get(key)===created)this.#queryFlights.delete(key);
        if(!controller.signal.aborted&&epoch===this.#queryEpoch&&revision===this.#snapshot.revision)this.#cache(key,Promise.resolve(response));
        return response;
      },error=>{created.done=true;if(this.#queryFlights.get(key)===created)this.#queryFlights.delete(key);throw error;});
      this.#queryFlights.set(key,created);
    }
    const shared=flight;shared.users++;
    return new Promise((resolve,reject)=>{
      let active=true;
      const finish=(failed:boolean,value:any)=>{
        if(!active)return;active=false;signal?.removeEventListener('abort',cancel);shared.users--;
        if(!shared.done&&!shared.users){if(this.#queryFlights.get(key)===shared)this.#queryFlights.delete(key);shared.controller.abort();}
        failed?reject(value):resolve(value);
      };
      const cancel=()=>finish(true,signal?.reason??new DOMException('Query cancelled','AbortError'));
      signal?.addEventListener('abort',cancel,{once:true});
      shared.pending.then(value=>finish(false,value),error=>finish(true,error));
      if(signal?.aborted)cancel();
    });
  }
  async query(name:string,input:Record<string,unknown>,signal?:AbortSignal){
    signal?.throwIfAborted();
    if(this.#opening||this.#closing)throw new CloudError('service-busy','正在连接旅程，请稍后重试',503);
    if(this.#closed)throw new CloudError('session-expired','旅程已经关闭，请重新连接',409);
    const revision=this.#snapshot.revision,epoch=this.#queryEpoch;
    const shared=concurrentSnapshotQuery(name,input);
    const key=name+':'+JSON.stringify(shared?Object.fromEntries(Object.entries(input).sort(([a],[b])=>a<b?-1:a>b?1:0)):input);
    // Service task readiness can change while the game's revision stays the same.
    const cacheable=name!=='story.local-continuation-preview';
    let pending=cacheable?this.#queries.get(key)?.pending:undefined;
    if(!pending){
      pending=shared?this.#sharedQuery(key,name,input,revision,epoch,signal):this.client.query(name,input,signal,revision);
      if(!shared&&!signal&&cacheable){
        this.#cache(key,pending);
        void pending.catch(()=>{if(this.#queries.get(key)?.pending===pending)this.#queries.delete(key);});
      }
    }
    let response:any;
    try{response=await pending;}catch(error){if(epoch!==this.#queryEpoch||revision!==this.#snapshot.revision)throw new CloudError('stale-preview','进度已变化，请重新查看',409);throw error;}
    signal?.throwIfAborted();
    if(epoch!==this.#queryEpoch||revision!==this.#snapshot.revision)throw new CloudError('stale-preview','进度已变化，请重新查看',409);
    // Other cancellable queries own their requests; shared snapshot reads count
    // subscribers and abort transport only when every subscriber has left.
    const keep=reusableSceneRead(name,input);
    if(cacheable&&(signal||keep))this.#cache(key,Promise.resolve(response),keep);
    return structuredClone(response);
  }
  listBattleActions(actorId:string){return this.query('battle.actions',{actorId});}
  async model(request:Record<string,unknown>,signal?:AbortSignal,observe?:(log:ModelLog)=>void,consume?:(result:any)=>Promise<void>,retainEvidence?:ModelEvidenceConsumer){
    const revision=this.#snapshot.revision,epoch=this.#queryEpoch;
    const result=await this.client.model({...request,revision},signal,observe,async result=>{
      if(signal?.aborted||epoch!==this.#queryEpoch||revision!==this.#snapshot.revision)throw new CloudError('stale-workflow','生成期间旅程已经变化，旧结果没有写入',409);
      await consume?.(result);
    },retainEvidence);
    if(signal?.aborted||epoch!==this.#queryEpoch||revision!==this.#snapshot.revision)throw new CloudError('stale-workflow','生成期间旅程已经变化，旧结果没有写入',409);
    return result;
  }
  discardRetainedModel(expectedJobId?:string){return this.client.discardRetainedModel(expectedJobId);}
  previewBattleAction(input:Record<string,unknown>,signal?:AbortSignal){return this.query('battle.preview',input,signal);}
  previewWorldIntent(input:Record<string,unknown>,signal?:AbortSignal){return this.query('world.preview',input,signal);}
  previewExpeditionRisk(dungeonId:string,difficultyId:string){return this.query('expedition.risk',{dungeonId,difficultyId});}
  close():Promise<void>{
    if(this.#closing)return this.#closing;
    this.#closed=true;this.#invalidateQueries();
    const opening=this.#opening;
    this.#closing=(async()=>{try{if(opening)try{await opening;}catch{}await this.client.close();}finally{this.#invalidateQueries();this.#closing=undefined;}})();
    return this.#closing;
  }
}
