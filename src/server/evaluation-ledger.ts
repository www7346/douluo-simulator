import {open,readFile,rename,unlink} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {CloudError} from '../cloud/protocol';

export const EVALUATION_LIMITS=Object.freeze({requests:64,elapsedMs:90*60*1000});
interface EvaluationRequest {id:string;task:string;callId:string|null;attempt:number|null;caseId?:string;startedAt:number;finishedAt?:number;status:'reserved'|'sent'|'complete'|'failed';usage?:Record<string,number>|null;errorKind?:string}
interface EvaluationCase {id:string;status:'ready'|'running'|'complete'|'failed'}
interface EvaluationLedger {version:1;mode?:'system-regression-20261014'|'main-chain-20261016';limits:{requests:number|null;elapsedMs:number|null};initializedAt:number;startedAt:number|null;requests:EvaluationRequest[];history?:{path:string;sha256:string;requestCount:number;requestsHash:string};cases?:EvaluationCase[]}
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
export class EvaluationLimitError extends CloudError {constructor(message:string){super('evaluation-limit',message,429);}}
/** Keep safe OS diagnostics, never filesystem paths, raw exception text or request contents. */
export function evaluationLedgerError(error:unknown){
 if(error instanceof CloudError)return error;
 const e=error as NodeJS.ErrnoException|null;
 const code=['EACCES','EPERM','EBUSY','ENOENT','ENOSPC','EMFILE','ENFILE','EIO','EEXIST'].includes(e?.code??'')?e!.code:'unknown';
 const operation=['open','rename','read','write','fsync','close','unlink'].includes(e?.syscall??'')?e!.syscall:'unknown';
 return new CloudError('evaluation-ledger',`无法保存真实模型验收总账（${operation}/${code}），本次请求未发送`);
}
function validate(value:any):asserts value is EvaluationLedger{
 const continuation=!!value?.history,start=continuation?value.history.requestCount:0;
 if(value?.version!==1||!Number.isFinite(value.initializedAt)||value.startedAt!==null&&!Number.isFinite(value.startedAt)||!Array.isArray(value.requests))throw new EvaluationLimitError('真实模型验收总账无效，尚未请求服务');
 if(value.mode!==undefined){
  if(!['system-regression-20261014','main-chain-20261016'].includes(value.mode)||continuation||value.limits?.requests!==(value.mode==='main-chain-20261016'?30:200)||value.limits?.elapsedMs!==null||value.requests.length>(value.mode==='main-chain-20261016'?30:200)||!Array.isArray(value.cases)||!value.cases.length||value.cases.length>200||new Set(value.cases.map((c:any)=>c.id)).size!==value.cases.length||value.cases.some((c:any)=>!c||typeof c.id!=='string'||!c.id.trim()||!['ready','running','complete','failed'].includes(c.status))||value.cases.filter((c:any)=>c.status==='running').length>1||value.requests.some((r:any)=>!value.cases.some((c:any)=>c.id===r.caseId&&c.status!=='ready')))throw new EvaluationLimitError('本轮系统验收总账或测试范围无效');
 }else if(continuation){
  if(value.limits?.requests!==null||value.limits?.elapsedMs!==null||typeof value.history.path!=='string'||!Number.isSafeInteger(start)||start<0||start>value.requests.length||!Array.isArray(value.cases)||!value.cases.length||value.cases.length>100||new Set(value.cases.map((c:any)=>c.id)).size!==value.cases.length||value.cases.some((c:any)=>!c||typeof c.id!=='string'||!c.id.trim()||!['ready','running','complete','failed'].includes(c.status))||value.cases.filter((c:any)=>c.status==='running').length>1||hash(JSON.stringify(value.requests.slice(0,start)))!==value.history.requestsHash)throw new EvaluationLimitError('续接总账的历史或有限测试范围无效');
  if(value.requests.slice(start).some((r:any)=>!value.cases.some((c:any)=>c.id===r.caseId&&c.status!=='ready')))throw new EvaluationLimitError('调用缺少已开始的测试来源');
 }else if(value.limits?.requests!==64||value.limits?.elapsedMs!==EVALUATION_LIMITS.elapsedMs||value.requests.length>64||value.cases!==undefined)throw new EvaluationLimitError('真实模型验收总账无效，尚未请求服务');
 const ids=new Set();for(const row of value.requests){if(typeof row.id!=='string'||ids.has(row.id)||typeof row.task!=='string'||!Number.isFinite(row.startedAt)||!['reserved','sent','complete','failed'].includes(row.status))throw new EvaluationLimitError('真实模型验收调用记录无效');ids.add(row.id);}
 if((value.startedAt===null)!==(value.requests.length===start)||value.requests.slice(start).some((r:EvaluationRequest)=>r.startedAt<value.startedAt!))throw new EvaluationLimitError('真实模型验收起点与调用记录不一致');
}
/** Explicit initialization preserves an existing ledger. It never starts or resets the live window. */
export async function initializeEvaluationLedger(path:string,now=Date.now()){
 try{const file=await open(path,'wx');try{await file.writeFile(JSON.stringify({version:1,limits:EVALUATION_LIMITS,initializedAt:now,startedAt:null,requests:[]}));await file.sync();}finally{await file.close();}}
 catch(error:any){if(error.code!=='EEXIST')throw error;}
 return readEvaluationLedger(path);
}
export async function readEvaluationLedger(path:string){const value=JSON.parse(await readFile(path,'utf8'));validate(value);if(value.history&&hash(await readFile(value.history.path,'utf8'))!==value.history.sha256)throw new EvaluationLimitError('历史总账来源发生变化，续接请求未发送');return value;}

/** The user-authorized independent batch; existing files and old evidence are never reset. */
export async function initializeSystemRegressionLedger(path:string,caseIds:string[],now=Date.now()){
 const value:EvaluationLedger={version:1,mode:'system-regression-20261014',limits:{requests:200,elapsedMs:null},initializedAt:now,startedAt:null,cases:caseIds.map(id=>({id,status:'ready'})),requests:[]};validate(value);
 try{const file=await open(path,'wx');try{await file.writeFile(JSON.stringify(value,null,2)+'\n');await file.sync();}finally{await file.close();}}catch(error:any){if(error.code!=='EEXIST')throw error;}
 const existing=await readEvaluationLedger(path);if(existing.mode!==value.mode||JSON.stringify(existing.cases?.map(c=>c.id))!==JSON.stringify(caseIds))throw new EvaluationLimitError('已存在的验收总账范围不同，不能覆盖或重置');return existing;
}

/** This approved round has its own fixed cap; no historical allowance is carried over. */
export async function initializeMainChainEvaluationLedger(path:string,caseIds:string[],now=Date.now()){
 const value:EvaluationLedger={version:1,mode:'main-chain-20261016',limits:{requests:30,elapsedMs:null},initializedAt:now,startedAt:null,cases:caseIds.map(id=>({id,status:'ready'})),requests:[]};validate(value);
 try{const file=await open(path,'wx');try{await file.writeFile(JSON.stringify(value,null,2)+'\n');await file.sync();}finally{await file.close();}}catch(error:any){if(error.code!=='EEXIST')throw error;}
 const existing=await readEvaluationLedger(path);if(existing.mode!==value.mode||JSON.stringify(existing.cases?.map(c=>c.id))!==JSON.stringify(caseIds))throw new EvaluationLimitError('本轮测试已登记，不能覆盖或重置');return existing;
}

/** Append-only continuation of a closed evidence batch. No new arbitrary request/time quota.
 * Only the explicitly enumerated cases may run, once each. Runtime recovery remains bounded.
 * Historical records are copied intact into the cumulative list; the original file is read-only.
 */
export async function initializeEvaluationContinuation(path:string,previousPath:string,caseIds:string[],now=Date.now()){
 if(resolve(path)===resolve(previousPath))throw new EvaluationLimitError('续接不能覆盖历史总账');
 const previous=await readEvaluationLedger(previousPath),raw=await readFile(previousPath,'utf8');
 if(previous.requests.some(r=>!['complete','failed'].includes(r.status))||previous.cases?.some(c=>c.status==='running'))throw new EvaluationLimitError('历史批次仍有未终结调用，不能另起续接');
 const history={path:resolve(previousPath),sha256:hash(raw),requestCount:previous.requests.length,requestsHash:hash(JSON.stringify(previous.requests))};
 const value:EvaluationLedger={version:1,limits:{requests:null,elapsedMs:null},initializedAt:now,startedAt:null,history,cases:caseIds.map(id=>({id,status:'ready'})),requests:structuredClone(previous.requests)};validate(value);
 try{const file=await open(path,'wx');try{await file.writeFile(JSON.stringify(value,null,2)+'\n');await file.sync();}finally{await file.close();}}
 catch(error:any){if(error.code!=='EEXIST')throw error;}
 const existing=await readEvaluationLedger(path);
 if(JSON.stringify(existing.history)!==JSON.stringify(history)||JSON.stringify(existing.cases?.map(c=>c.id))!==JSON.stringify(caseIds))throw new EvaluationLimitError('已存在的续接范围或历史不同，不能重置');
 return existing;
}

export async function beginEvaluationCase(path:string,id:string){return locked(path,ledger=>{
 const selected=ledger.cases?.find(c=>c.id===id);
 if(!selected||selected.status!=='ready'||ledger.cases?.some(c=>c.status==='running'))throw new EvaluationLimitError('测试未登记、已经开始或已经结束，不能自动重跑');
 selected.status='running';return structuredClone(selected);
});}
export async function finishEvaluationCase(path:string,id:string,status:'complete'|'failed'){return locked(path,ledger=>{
 const selected=ledger.cases?.find(c=>c.id===id);
 if(!selected||selected.status!=='running'||ledger.requests.slice(ledger.history?.requestCount??0).some(r=>r.caseId===id&&!['complete','failed'].includes(r.status)))throw new EvaluationLimitError('测试没有进行中或仍有未终结调用');
 selected.status=status;return structuredClone(selected);
});}

/** Serializes local workers. A dead worker's completed lock record can be reclaimed. */
async function locked<T>(path:string,edit:(ledger:EvaluationLedger)=>T){
 const lockPath=path+'.lock',token=randomUUID(),deadline=Date.now()+2000;let held=false;
 while(!held){
  try{const lock=await open(lockPath,'wx');try{await lock.writeFile(JSON.stringify({pid:process.pid,token}));await lock.sync();held=true;}finally{await lock.close();}}
  catch(error:any){
   // Windows can report a delete-pending lock as EPERM while its previous
   // owner releases it. Retry only acquisition, within the existing deadline;
   // a persistent permission failure must still fail closed before any request.
   const releasing=process.platform==='win32'&&error.code==='EPERM';
   if(error.code!=='EEXIST'&&!releasing)throw error;
   try{const owner=JSON.parse(await readFile(lockPath,'utf8'));if(Number.isInteger(owner.pid)&&owner.pid>0){try{process.kill(owner.pid,0);}catch(e:any){if(e.code==='ESRCH')await unlink(lockPath);}}}catch{/* Another worker may be creating or releasing the lock. */}
   if(Date.now()>=deadline){if(releasing)throw error;throw new EvaluationLimitError('真实模型验收总账正在写入，尚未请求服务');}
   await new Promise(resolve=>setTimeout(resolve,10));
  }
 }
 const temporary=path+'.'+token+'.tmp';
 try{
  const ledger=await readEvaluationLedger(path),result=edit(ledger);validate(ledger);
  const file=await open(temporary,'wx');try{await file.writeFile(JSON.stringify(ledger,null,2)+'\n');await file.sync();}finally{await file.close();}
  await rename(temporary,path);return result;
 }finally{
  await unlink(temporary).catch(()=>{});
  const owner=JSON.parse(await readFile(lockPath,'utf8'));if(owner.token===token)await unlink(lockPath);
 }
}
/** Reserve before a provider request. Even ambiguous network failures retain their budget slot. */
export async function reserveEvaluationRequest(path:string,input:{task:string;callId?:string;attempt?:number},now=Date.now()){
 return locked(path,ledger=>{
  if(ledger.limits.requests!==null&&ledger.requests.length>=ledger.limits.requests)throw new EvaluationLimitError(`真实模型验收已达到${ledger.limits.requests}次调用上限`);
  if(ledger.startedAt!==null&&(now<ledger.startedAt||ledger.limits.elapsedMs!==null&&now-ledger.startedAt>=ledger.limits.elapsedMs))throw new EvaluationLimitError('真实模型验收已达到90分钟连续时间上限或系统时间倒退');
  const active=ledger.cases?.find(c=>c.status==='running');if((ledger.history||ledger.mode)&&!active)throw new EvaluationLimitError('没有已开始的测试，本次请求未发送');
  ledger.startedAt??=now;
  const row:EvaluationRequest={id:randomUUID(),task:input.task,callId:input.callId??null,attempt:input.attempt??null,...(active?{caseId:active.id}:{}),startedAt:now,status:'reserved'};
  ledger.requests.push(row);return {...structuredClone(row),deadlineAt:ledger.limits.elapsedMs===null?null:ledger.startedAt+ledger.limits.elapsedMs};
 });
}
export async function updateEvaluationRequest(path:string,id:string,update:{status:EvaluationRequest['status'];usage?:Record<string,number>|null;errorKind?:string},now=Date.now()){
 return locked(path,ledger=>{
  const row=ledger.requests.find(r=>r.id===id);if(!row)throw new EvaluationLimitError('验收调用没有原始登记');
  if(ledger.requests.indexOf(row)<(ledger.history?.requestCount??0))throw new EvaluationLimitError('历史调用只读，不能修改');
  if(['complete','failed'].includes(row.status)&&update.status!==row.status)throw new EvaluationLimitError('验收调用已经结束');
  row.status=update.status;if(['complete','failed'].includes(update.status))row.finishedAt=now;
  if(update.usage!==undefined)row.usage=update.usage===null?null:Object.fromEntries(Object.entries(update.usage).filter(([key,value])=>['prompt_tokens','completion_tokens','total_tokens','reasoning_tokens','cached_tokens'].includes(key)&&Number.isFinite(value)&&value>=0));
  if(update.errorKind!==undefined)row.errorKind=update.errorKind.slice(0,100);
  return structuredClone(row);
 });
}
