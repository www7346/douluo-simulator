import {parentPort,workerData} from 'node:worker_threads';
import {createHash} from 'node:crypto';
import type {GameSnapshot} from '../runtime/contracts';
import {CalculationSession,SESSION_CACHE_LIMIT,type SessionCheckpointV1} from './session';
import {CalculationSlices} from './calculation-slices';
import {sessionCommandHash} from './session';
import {querySession,createCommittedQueryReader,type CommittedQueryReader} from './queries';
import {prepareBlueprintCalculation} from './blueprint-calculation';
import {concurrentSnapshotQuery} from '../shared/snapshot-query-policy';
import {CloudError} from '../cloud/protocol';
import {rules} from '../rules';
import {serverError} from './server-diagnostics';

// Disposable acceleration copies. The pool retains all authoritative snapshots,
// pending receipts and ACK history independently of this thread's lifetime.
const cache=new Map<string,{identity:string;session:CalculationSession;read?:CommittedQueryReader}>();
function identity(cp:SessionCheckpointV1){
  const hash=createHash('sha256').update(cp.snapshot).update(JSON.stringify([cp.version,cp.seed,cp.snapshotBytes,cp.revision,cp.acknowledged]));
  if(cp.pending)hash.update(cp.pending.receipt).update(JSON.stringify([cp.pending.hash,cp.pending.resultId,cp.pending.revision]));
  return hash.digest('hex');
}
function retain(key:string,session:CalculationSession,checkpoint:SessionCheckpointV1,read?:CommittedQueryReader){
  if(read)session.suspend();
  cache.delete(key);cache.set(key,{identity:identity(checkpoint),session,read});
  let hot=0,resident=0;
  for(const [id,row] of [...cache].reverse()){
    resident+=row.session.residentBytes;
    if(resident>SESSION_CACHE_LIMIT){cache.delete(id);continue;}
    let bytes=row.session.hotBytes+(row.read?row.session.snapshotBytes:0);
    if(hot+bytes>SESSION_CACHE_LIMIT&&row.session.calculationCacheBytes){row.session.discardCalculationCache();bytes=row.session.hotBytes+(row.read?row.session.snapshotBytes:0);}
    hot+=bytes;if(hot>SESSION_CACHE_LIMIT){hot-=bytes;row.session.suspend();row.read=undefined;}
  }
}
parentPort!.on('message',async({id,op,token,ownerEpoch,payload,checkpoint,readOwner,takeover,slices:previousSlices})=>{
  const snapshotRead=op==='query'&&concurrentSnapshotQuery(payload?.name,payload?.input??{});
  const key=(snapshotRead?'read:':'')+String(ownerEpoch)+':'+token;
  let slices:CalculationSlices|undefined;
  let session:CalculationSession|undefined,retainBase:(()=>boolean)|undefined;
  let read:CommittedQueryReader|undefined;
  const stats:Record<string,number>={};
  let probeHits=0;
  try{
    let value:unknown;
    const craftCommand=op==='command'&&['blueprint.craft','story.execute','story.resume','workflow.apply','person.respond-research'].includes(payload?.type);
    if(craftCommand||op==='query'&&payload?.input?.type==='blueprint.craft')await prepareBlueprintCalculation();
    const restoring=performance.now();
    if(op==='open'){
      session=new CalculationSession(payload.seed,payload.snapshot,workerData?.workflowSecret??'');value=session.snapshot();
    }else{
      if(!checkpoint)throw new CloudError('invalid-checkpoint','计算任务缺少内部进度',409);
      const prior=cache.get(key);
      // A snapshot from a different revision must be restored once. Checking its
      // metadata against the old cache first would decompress the new world twice.
      const reusable=prior&&prior.session.revision===checkpoint.revision&&prior.session.seed===checkpoint.seed&&
        (prior.identity===identity(checkpoint)||prior.session.refreshCheckpointMetadata(checkpoint));
      stats.restoreCacheHit=Number(!!reusable);
      let committed:GameSnapshot|undefined;
      if (reusable) session = prior!.session;
      else if (snapshotRead && workerData?.localDesktop === true && readOwner) {
        const restored = CalculationSession.openCommittedRead(checkpoint, readOwner);
        session = restored.session;
        committed = restored.snapshot;
      } else session = CalculationSession.fromCheckpoint(checkpoint,workerData?.workflowSecret??'');
      read=reusable?prior?.read:undefined;
      if(op==='command'){
        probeHits=session.calculationCacheHits;
        retainBase=session.captureBaseRetentionGuard();
        stats.restoreMs=performance.now()-restoring;
        const base=session.checkpointIdentity();
        const directTravel=payload.type==='world.intent'&&payload.payload?.type==='travel';
        slices=new CalculationSlices({commandHash:sessionCommandHash(payload),baseRevision:base.revision,baseSnapshotHash:base.snapshotHash,seed:session.seed},previousSlices,directTravel,work=>parentPort!.postMessage({id,calculationWork:work}));
        (globalThis as any).SoulCalculationSlices=slices;
        value=session.dispatch(payload,SESSION_CACHE_LIMIT,(progress,stats)=>parentPort!.postMessage({id,progress,stats}),takeover instanceof Int32Array?()=>Atomics.load(takeover,0)===1:undefined);
        stats.generationProbeCacheHit=session.calculationCacheHits-probeHits;stats.generationProbeBytes=session.calculationCacheBytes;
        // Even a rules-level catch cannot publish a candidate after a private yield.
        if(slices.yielded){cache.delete(key);parentPort!.postMessage({id,stats:{...stats,...slices.timings},result:{yielded:true,slices:slices.checkpoint()}});return;}
      }
      else if(op==='query'){
        stats.restoreMs=performance.now()-restoring;
        if(payload.revision!==undefined&&payload.revision!==session.revision)throw new CloudError('stale-preview','进度已变化，请重新查看',409);
        if(snapshotRead){stats.readCacheHit=Number(!!read);read??=createCommittedQueryReader(committed??session.snapshot(),session.seed);value=read(payload.name,payload.input??{});}
        else value=querySession(session,payload.name,payload.input??{});
      }else throw new CloudError('invalid-operation','不支持这项操作');
    }
    // A query cannot publish a new world. The pool already owns this checkpoint.
    const next=op==='query'?checkpoint:session.checkpoint();retain(key,session,next,read);
    parentPort!.postMessage({id,stats:{...stats,...slices?.timings},result:op==='query'?{value}:{value,checkpoint:next}});
  }catch(error){
    cache.delete(key);
    if(slices?.yielded){
      stats.generationProbeCacheHit=(session?.calculationCacheHits??0)-probeHits;
      const checking=performance.now();stats.baseRetained=Number(!!session&&!!retainBase?.());stats.baseRetentionCheckMs=performance.now()-checking;
      if(stats.baseRetained)retain(key,session!,checkpoint);
      stats.generationProbeBytes=stats.baseRetained?(session?.calculationCacheBytes??0):0;
      parentPort!.postMessage({id,stats:{...stats,...slices.timings},result:{yielded:true,slices:slices.checkpoint()}});return;
    }
    const known=error instanceof CloudError||(error as any)?.name==='CommandRejectedError';
    parentPort!.postMessage({id,diagnostic:serverError(error),error:{code:known?(error as any).code:'rule-rejected',message:known?(error as Error).message:'这次操作未能完成，进度已保留',status:known?(error as any).status??422:422}});
  }finally{delete (globalThis as any).SoulCalculationSlices;}
});
parentPort!.postMessage({ready:true,rulesetVersion:rules.foundation.VERSION});
