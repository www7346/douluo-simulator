import type {WebGameController} from './controller';

export async function withCreationCancellation<T>(pending:Promise<T>,signal:AbortSignal):Promise<T>{
 signal.throwIfAborted();let stop=()=>{};
 const cancelled=new Promise<never>((_,reject)=>{stop=()=>reject(signal.reason??new DOMException('操作已停止','AbortError'));signal.addEventListener('abort',stop,{once:true});});
 try{return await Promise.race([pending,cancelled]);}finally{signal.removeEventListener('abort',stop);}
}
/** A read-only creation request can be stopped without abandoning a model result. */
export async function creationRequest<T=any>(controller:WebGameController,name:string,input:Record<string,unknown>,signal?:AbortSignal,timeoutMs=30000):Promise<T>{
 const limit=new AbortController(),combined=signal?AbortSignal.any([signal,limit.signal]):limit.signal;
 const timer=setTimeout(()=>limit.abort(new DOMException('服务器核对超时','TimeoutError')),timeoutMs);
 try{combined.throwIfAborted();return await withCreationCancellation(controller.query(name,input,combined),combined);}
 catch(error){
  if(limit.signal.aborted&&!signal?.aborted){const failure=new Error('服务器核对超时，当前设定已保留。请重试；若仍失败，可重新连接。',{cause:error});void controller.reportFailure('creation.query.timeout',failure,{name,timeoutMs});throw failure;}
  throw error;
 }finally{clearTimeout(timer);}
}
