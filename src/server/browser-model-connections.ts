import {randomBytes,createHash} from 'node:crypto';
import {CloudError} from '../cloud/protocol';
import {browserBaseUrl,browserRequestPath,BROWSER_RESPONSE_LIMIT,BROWSER_REQUEST_LIMIT,BROWSER_CHUNK_LIMIT,BROWSER_FAILURES,type BrowserModelEvent,type BrowserModelTask} from '../shared/browser-model-transport';

interface Task extends BrowserModelTask {sequence:number;digest:string;lastAck?:Promise<void>;bytes:number;claimed:boolean;delivered:boolean;done:boolean;at:number;connected:()=>void;resolve:(response:Response)=>void;reject:(error:Error)=>void;controller:ReadableStreamDefaultController<Uint8Array>;drain?:()=>void;cleanup:()=>void;cancel:(message:string)=>void;headers:boolean}
interface Binding {token:string;agent:string;label:string;baseUrl:string;seen:number;tasks:Map<string,Task>;cancelled:Set<string>;wake?:()=>void}
const failure=(message='浏览器模型连接已断开，请重新连接后再尝试')=>new CloudError('browser-offline',message,503);
/** Only the configured browser performs provider requests; this hub never fetches a provider URL. */
export class BrowserModelConnections {
 #bindings=new Map<string,Binding>();#attempts=new Map<string,{at:number;count:number}>();
 #timer:ReturnType<typeof setInterval>;
 constructor(readonly now=Date.now){this.#timer=setInterval(()=>this.cleanup(),5000);this.#timer.unref();}
 #rate(peer:string){const now=this.now(),old=this.#attempts.get(peer);if(old&&now-old.at<60000){if(++old.count>40)throw new CloudError('rate-limit','模型连接操作过于频繁，请稍后再试',429);}else {if(this.#attempts.size>=4096)throw failure('当前连接请求较多');this.#attempts.set(peer,{at:now,count:1});}}
 open(peer:string,input:any){
  this.cleanup();this.#rate(peer);if(this.#bindings.size>=128)throw failure('当前模型连接较多，请稍后再试');
  let baseUrl:string;try{baseUrl=browserBaseUrl(input?.baseUrl);}catch(e){throw new CloudError('browser-url',(e as Error).message);}
  if(Object.keys(input??{}).some(k=>!['baseUrl','label'].includes(k)))throw new CloudError('browser-input','连接资料中不能包含模型密钥');
  const token=randomBytes(32).toString('base64url'),agent=randomBytes(32).toString('base64url');
  this.#bindings.set(token,{token,agent,baseUrl,label:typeof input.label==='string'?input.label.slice(0,80):'浏览器模型',seen:this.now(),tasks:new Map(),cancelled:new Set()});
  return {token,browserToken:agent};
 }
 #owner(token:unknown){const b=typeof token==='string'?this.#bindings.get(token):undefined;if(!b)throw failure('模型连接已失效，请重新连接');return b;}
 #agent(token:unknown){const b=typeof token==='string'?[...this.#bindings.values()].find(b=>b.agent===token):undefined;if(!b)throw failure('模型连接已失效，请重新连接');return b;}
 status(token:unknown){const b=this.#owner(token);return {online:this.now()-b.seen<35000,baseUrl:b.baseUrl,label:b.label};}
 revoke(token:unknown){const b=this.#owner(token);for(const t of b.tasks.values())t.cancel('本地连接已断开，本次请求已停止');b.wake?.();this.#bindings.delete(b.token);return {disconnected:true};}
 async poll(token:unknown,signal?:AbortSignal,known:unknown=[],cancelAck:unknown=[]){const b=this.#agent(token);if(!Array.isArray(known)||known.length>128||known.some(id=>typeof id!=='string'||id.length>40))throw new CloudError('browser-poll','任务确认列表无效');if(!Array.isArray(cancelAck)||cancelAck.length>128||cancelAck.some(id=>typeof id!=='string'||id.length>40))throw new CloudError('browser-poll','停止确认列表无效');for(const id of cancelAck)b.cancelled.delete(id);for(const id of known){const task=b.tasks.get(id);if(task?.claimed)task.delivered=true;}b.seen=this.now();if(b.wake)throw new CloudError('browser-poll','浏览器已有正在进行的任务查询',409);
  if(!b.cancelled.size&&![...b.tasks.values()].some(t=>!t.done&&!t.delivered))await new Promise<void>((resolve,reject)=>{const done=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);b.wake=undefined;resolve();},abort=()=>{done();reject(signal?.reason??failure());},timer=setTimeout(done,15000);b.wake=done;signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();});
  this.#agent(token);b.seen=this.now();const tasks=[...b.tasks.values()].filter(t=>!t.done&&!t.delivered).map(t=>{t.claimed=true;return {id:t.id,lease:t.lease,method:t.method,path:t.path,body:t.body};});const cancel=[...b.cancelled];return {tasks,cancel};
 }
 async fetch(token:string,url:string,init:RequestInit,connected:()=>void=()=>{}):Promise<Response>{const b=this.#owner(token);if(!b.agent||this.now()-b.seen>=35000)throw failure();const method=String(init.method??'GET');let path:string;try{path=browserRequestPath(b.baseUrl!,url,method);}catch(e){throw new CloudError('browser-request',(e as Error).message);}
  const body=init.body===undefined||init.body===null?null:typeof init.body==='string'?init.body:undefined;if(body===undefined||body&&Buffer.byteLength(body)>BROWSER_REQUEST_LIMIT)throw new CloudError('browser-limit','本次模型输入过大');if([...b.tasks.values()].filter(t=>!t.done).length>=4)throw failure('浏览器模型连接正在处理其他模型请求');if(init.signal?.aborted)throw init.signal.reason;
  return new Promise<Response>((resolve,reject)=>{const id=randomBytes(18).toString('base64url');let task:Task;const stream=new ReadableStream<Uint8Array>({start(controller){task={id,lease:randomBytes(24).toString('base64url'),method:method as 'GET'|'POST',path,body,sequence:0,digest:'',bytes:0,claimed:false,delivered:false,done:false,at:Date.now(),connected,resolve,reject,controller,headers:false,cleanup:()=>{},cancel:()=>{}};},pull(){task.drain?.();task.drain=undefined;},cancel(){task.cancel('模型接收已停止');}},{highWaterMark:65536,size:c=>c.byteLength});
   const abort=()=>task.cancel('本次模型请求已停止');task!.cleanup=()=>{init.signal?.removeEventListener('abort',abort);task.drain?.();task.drain=undefined;task.at=this.now();task.body=null;};task!.cancel=message=>{if(task.done)return;task.done=true;task.cleanup();b.cancelled.add(id);if(b.cancelled.size>128)b.cancelled.delete(b.cancelled.values().next().value!);b.wake?.();const error=failure(message);if(task.headers)task.controller.error(error);else {task.controller.close();reject(error);}};
   // Response construction waits for the remote headers, while body reads remain bounded.
   (task! as any).stream=stream;b.tasks.set(id,task!);init.signal?.addEventListener('abort',abort,{once:true});if(init.signal?.aborted)abort();b.wake?.();
  });
 }
 async event(token:unknown,event:BrowserModelEvent){const b=this.#agent(token);b.seen=this.now();const t=b.tasks.get(event?.id);if(!t||event.lease!==t.lease||!t.claimed)throw new CloudError('browser-expired','这次模型请求已经结束',410);
  if(!Number.isSafeInteger(event.sequence)||event.sequence<1||event.sequence>16384)throw new CloudError('browser-sequence','模型片段序号无效');
  const digest=createHash('sha256').update(JSON.stringify(event)).digest('hex');if(event.sequence===t.sequence&&digest===t.digest){await t.lastAck;return {accepted:true,...(t.done?{finished:true}:{})};}if(event.sequence!==t.sequence+1)throw new CloudError('browser-sequence','模型数据顺序不一致，请重新连接',409);
  if(!['connected','headers','chunk','end','error'].includes(event.kind))throw new CloudError('browser-event','模型数据格式无效');
  // A consumer may finish parsing SSE before the browser sends its final frame.
  // Acknowledge-and-stop late frames; never deliver them to a completed job.
  if(t.done){t.sequence=event.sequence;t.digest=digest;return {accepted:true,finished:true};}
  if(event.kind==='headers'&&(t.headers||!Number.isInteger(event.status)||event.status!<200||event.status!>599||[204,205,304].includes(event.status!)))throw new CloudError('browser-event','模型响应状态无效');
  if(event.kind==='chunk'&&(!t.headers||typeof event.chunk!=='string'||event.chunk.length>Math.ceil(BROWSER_CHUNK_LIMIT/3)*4||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(event.chunk)))throw new CloudError('browser-event','模型片段格式无效');
  if(event.kind==='headers')for(const key of ['content-type','retry-after']){const value=event.headers?.[key];if(value!==undefined&&(typeof value!=='string'||value.length>200||/[\r\n]/.test(value)))throw new CloudError('browser-event','模型响应头无效');}
  if(event.kind==='end'&&!t.headers)throw new CloudError('browser-event','模型答复缺少响应头');
  t.delivered=true;t.sequence=event.sequence;t.digest=digest;t.at=this.now();
  if(event.kind==='connected'){t.connected();}
  else if(event.kind==='headers'){const headers=new Headers();for(const key of ['content-type','retry-after']){const value=event.headers?.[key];if(value!==undefined){if(typeof value!=='string'||value.length>200||/[\r\n]/.test(value))throw new CloudError('browser-event','模型响应头无效');headers.set(key,value);}}t.headers=true;t.resolve(new Response((t as any).stream,{status:event.status,headers}));}
  else if(event.kind==='chunk'){const chunk=Buffer.from(event.chunk!,'base64');t.bytes+=chunk.length;if(t.bytes>BROWSER_RESPONSE_LIMIT){t.cancel('模型答复超过接收上限');throw new CloudError('browser-limit','模型答复超过接收上限',413);}t.controller.enqueue(chunk);if((t.controller.desiredSize??0)<=0)t.lastAck=new Promise<void>(resolve=>{t.drain=resolve;});}
  else if(event.kind==='end'){if(!t.headers)throw new CloudError('browser-event','模型答复缺少响应头');t.done=true;t.cleanup();t.controller.close();}
  else t.cancel(event.message&&BROWSER_FAILURES.some(v=>v===event.message)?event.message:'浏览器未能读取模型服务响应，请检查网络、网站跨域许可和证书');
  await t.lastAck;return {accepted:true};
 }
 cleanup(){const now=this.now();for(const [key,window]of this.#attempts)if(now-window.at>60000)this.#attempts.delete(key);for(const b of this.#bindings.values()){for(const [id,t]of b.tasks){if(!t.done&&now-b.seen>40000)t.cancel('浏览器模型连接已断开，本次请求已停止');if(t.done&&now-t.at>60000)b.tasks.delete(id);}if(now-b.seen>120000){b.wake?.();this.#bindings.delete(b.token);}}}
 close(){clearInterval(this.#timer);for(const b of [...this.#bindings.values()])this.revoke(b.token);}
}
