import {MessageChannel,type MessagePort} from 'node:worker_threads';
import {CloudError} from '../cloud/protocol';
import type {BrowserModelConnections} from './browser-model-connections';

export function browserWorkerFetch(parent:MessagePort,jobId:string):typeof fetch {
 return (async(input:any,init:any={})=>new Promise<Response>((resolve,reject)=>{
  const {port1,port2}=new MessageChannel();let settled=false,ended=false,controller:ReadableStreamDefaultController<Uint8Array>;
  const finish=()=>{init.signal?.removeEventListener('abort',abort);port1.close();};
  const fail=(message:string)=>{if(ended)return;ended=true;const error=new CloudError('browser-offline',message,503);if(settled)controller.error(error);else reject(error);finish();};
  const abort=()=>{port1.postMessage({op:'cancel'});fail('本次本地模型请求已停止');};
  port1.on('message',message=>{
   if(ended)return;
   if(message.op==='connected'){init.providerOnConnected?.();return;}
   if(message.op==='error'){fail(message.message);return;}
   if(message.op==='headers'){
    const body=new ReadableStream<Uint8Array>({start(c){controller=c;},pull(){port1.postMessage({op:'pull'});},cancel(){abort();}},{highWaterMark:0});
    settled=true;resolve(new Response(body,{status:message.status,headers:message.headers}));
   }else if(message.op==='chunk')controller.enqueue(message.chunk);
   else if(message.op==='end'){ended=true;controller.close();finish();}
  });
  port1.on('close',()=>{if(!ended)fail('浏览器模型通道已中断');});
  init.signal?.addEventListener('abort',abort,{once:true});
  if(init.signal?.aborted){abort();return;}
  parent.postMessage({op:'browser-fetch',id:jobId,url:String(input),browserToken:init.providerBrowserToken,method:init.method??'GET',body:init.body??null,port:port2},[port2]);
 })) as typeof fetch;
}

export async function serveBrowserFetch(hub:BrowserModelConnections,message:any,signal:AbortSignal){
 const port=message.port as MessagePort,abort=new AbortController();let reader:ReadableStreamDefaultReader<Uint8Array>|undefined,reading=false,ended=false;
 const stop=()=>{if(ended)return;ended=true;abort.abort();void reader?.cancel().catch(()=>{});port.close();};
 const outerAbort=()=>stop();signal.addEventListener('abort',outerAbort,{once:true});
 port.on('close',stop);
 port.on('message',async data=>{
  if(data.op==='cancel'){stop();return;}
  if(data.op!=='pull'||reading||!reader||ended)return;
  reading=true;
  try{const next=await reader.read();if(ended)return;if(next.done){ended=true;port.postMessage({op:'end'});port.close();}else port.postMessage({op:'chunk',chunk:next.value});}
  catch{if(!ended)port.postMessage({op:'error',message:'模型数据接收中断，请重新连接'});stop();}
  finally{reading=false;}
 });
 try{
  if(signal.aborted)throw signal.reason;
  const response=await hub.fetch(message.browserToken,message.url,{method:message.method,body:message.body,signal:abort.signal},()=>port.postMessage({op:'connected'}));
  if(ended)return;reader=response.body!.getReader();port.postMessage({op:'headers',status:response.status,headers:Object.fromEntries(response.headers)});
  await new Promise<void>(resolve=>{port.once('close',resolve);if(ended)resolve();});
 }catch(error){if(!ended){port.postMessage({op:'error',message:error instanceof CloudError?error.message:'本地模型连接未完成'});stop();}}
 finally{signal.removeEventListener('abort',outerAbort);}
}
