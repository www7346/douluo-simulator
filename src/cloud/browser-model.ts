import {requestCredentials} from '../runtime/desktop-model-credentials';
import {CHATGPT_API} from '../shared/chatgpt-plan';
import type {ModelProfile} from '../runtime/model-gateway';
import {protocolHeaders,wireProtocol,validateHeaders} from '../runtime/model-protocol';
import {browserBaseUrl,browserRequestPath,modelRoute,localAddressSpace,BROWSER_FAILURES,BROWSER_CHUNK_LIMIT,BROWSER_RESPONSE_LIMIT,type BrowserModelEvent,type BrowserModelTask} from '../shared/browser-model-transport';

type Call=(operation:string,data:any,signal?:AbortSignal,keepalive?:boolean)=>Promise<any>;
interface Session {token:string;browserToken:string;abort:AbortController;active:Map<string,AbortController>;known:Set<string>;cancelAck:Set<string>;profile:ModelProfile;key:string;addressSpace?:'local'|'loopback'}
/** Credentials and provider fetches stay in this document. No rule engine runs here. */
export class BrowserModels {
 #sessions=new Map<string,Promise<Session>>();#unload=()=>{void this.disconnect(true);};#listening=false;
 constructor(private readonly call:Call,private readonly providerFetch:typeof fetch=fetch){}
 async prepare(profile:ModelProfile,signal?:AbortSignal):Promise<ModelProfile>{
  const copy={...profile};
  if(profile.modelLibrary)copy.modelLibrary=await Promise.all(profile.modelLibrary.map(async m=>this.prepare(m as ModelProfile,signal)));
  if(profile.writer)copy.writer=await this.prepare(profile.writer as ModelProfile,signal);
  if(!profile.baseUrl?.trim())return copy;
  const plan=profile.channelMode==='chatgpt';
  if(plan&&profile.baseUrl!==CHATGPT_API)throw Error('ChatGPT 套餐需要官方模型接口');
  if(!plan&&modelRoute(profile)!=='browser')return requestCredentials(copy);
  if(!plan&&profile.generation?.protocol&&!['auto','compatible','deepseek'].includes(profile.generation.protocol))throw Error('浏览器直连请选择 OpenAI兼容接口；其他协议可在高级连接设置中使用公网通路');
  const session=await this.#ensure(plan?{...profile,apiKey:'',credentialHeaders:{}}:profile,signal);
  return {...copy,transport:'browser',baseUrl:browserBaseUrl(profile.baseUrl),apiKey:session.token,credentialHeaders:{},connection:{...profile.connection,auth:'none',authName:undefined}};
 }
 async #ensure(profile:ModelProfile,signal?:AbortSignal){
  signal?.throwIfAborted();
  const baseUrl=browserBaseUrl(profile.baseUrl),key=JSON.stringify([baseUrl,profile.channelMode,profile.chatgptAccountId,profile.apiKey,validateHeaders(profile.credentialHeaders),profile.connection?.auth,profile.connection?.authName]);
  let pending=this.#sessions.get(key);if(pending)return pending;
  if(typeof window!=='undefined'&&!this.#listening){window.addEventListener('pagehide',this.#unload);this.#listening=true;}
  pending=(async()=>{const binding=await this.call('open',{baseUrl,label:profile.label},signal);
   if(!/^[A-Za-z0-9_-]{43}$/.test(binding?.token??'')||!/^[A-Za-z0-9_-]{43}$/.test(binding?.browserToken??''))throw Error(BROWSER_FAILURES[4]);
   if(signal?.aborted){void this.call('close',{token:binding.token}).catch(()=>{});signal.throwIfAborted();}
   const session:Session={...binding,key,profile:structuredClone({...profile,baseUrl}),abort:new AbortController(),active:new Map(),known:new Set(),cancelAck:new Set()};
   void this.#poll(session);return session;
  })();this.#sessions.set(key,pending);
  try{return await pending;}catch(e){if(this.#sessions.get(key)===pending)this.#sessions.delete(key);throw e;}
 }
 async #poll(s:Session){
  try{while(!s.abort.signal.aborted){
   const started=Date.now(),reply=await this.call('poll',{browserToken:s.browserToken,known:[...s.known],cancelAck:[...s.cancelAck]},AbortSignal.any([s.abort.signal,AbortSignal.timeout(25000)]));
   if(!Array.isArray(reply?.tasks)||!Array.isArray(reply?.cancel)||reply.tasks.length>4||reply.cancel.length>128)throw Error(BROWSER_FAILURES[4]);
   s.cancelAck.clear();for(const id of reply.cancel??[]){s.active.get(id)?.abort();s.cancelAck.add(id);}
   for(const task of reply.tasks??[])if(!s.known.has(task.id)){s.known.add(task.id);if(s.known.size>128)s.known.delete(s.known.values().next().value!);void this.#run(s,task);}
   if(Date.now()-started<100)await new Promise<void>(resolve=>{const done=()=>{clearTimeout(timer);s.abort.signal.removeEventListener('abort',done);resolve();},timer=setTimeout(done,100);s.abort.signal.addEventListener('abort',done,{once:true});if(s.abort.signal.aborted)done();});
  }}catch{if(!s.abort.signal.aborted){s.abort.abort();for(const a of s.active.values())a.abort();this.#sessions.delete(s.key);void this.call('close',{token:s.token}).catch(()=>{});}}
 }
 async #run(s:Session,task:BrowserModelTask){
  const abort=new AbortController();s.active.set(task.id,abort);let sequence=0,reader:ReadableStreamDefaultReader<Uint8Array>|undefined;
  const signal=AbortSignal.any([abort.signal,s.abort.signal]);
  const send=async(event:Omit<BrowserModelEvent,'id'|'lease'|'sequence'>)=>{const value={...event,id:task.id,lease:task.lease,sequence:++sequence};for(let attempt=0;;attempt++)try{const result=await this.call('event',{browserToken:s.browserToken,event:value},AbortSignal.any([s.abort.signal,AbortSignal.timeout(60000)]));if(result.finished&&event.kind!=='end'){abort.abort();throw new DOMException('模型任务已结束','AbortError');}return result;}catch(error){if(signal.aborted||attempt>=2||(error as any)?.status>=400&&(error as any)?.status<500)throw error;}};
  try{
   const url=new URL(task.path,new URL(s.profile.baseUrl).origin);browserRequestPath(s.profile.baseUrl,url.toString(),task.method);
   const desktop=typeof window!=='undefined'?window.douluoDesktop:undefined;
   const plan=s.profile.channelMode==='chatgpt';
   if(plan&&(!desktop?.chatgpt||!s.profile.chatgptAccountId)){
    await send({kind:'headers',status:401,headers:{'content-type':'application/json'}});
    await send({kind:'chunk',chunk:btoa('{"error":{"message":"Sign in with ChatGPT in the desktop app"}}')});await send({kind:'end'});return;
   }
   const endpoint=plan?await desktop!.chatgpt!.permit(s.profile.chatgptAccountId!,url.toString(),task.method):desktop?await desktop.modelPermit(s.profile.baseUrl,url.toString(),task.method):url.toString();
   if(!desktop)await checkBrowserPermission(url.toString());signal.throwIfAborted();
   const auth=await requestCredentials(s.profile);signal.throwIfAborted();
   const headers=protocolHeaders({...auth,transport:undefined},wireProtocol(s.profile),url);
   // The browser has accepted this transport task. fetch does not expose TCP timing.
   await send({kind:'connected'});
   const providerFetch=this.providerFetch;
   const init={method:task.method,headers,body:task.method==='POST'?task.body:undefined,signal},space=s.addressSpace??localAddressSpace(url.toString())??'local';
   let response:Response;
   try{response=await providerFetch(endpoint,desktop?init:browserRequestInit(url.toString(),init,space));if(url.protocol==='http:')s.addressSpace=space;}
   catch(error){
    // A hostname can resolve to either the LAN or loopback. Only the read-only
    // model list may probe the other space; generation is never replayed here.
    if(desktop||task.method!=='GET'||url.protocol!=='http:'||signal.aborted||!(error instanceof TypeError))throw error;
    const alternate=space==='local'?'loopback':'local';response=await providerFetch(url.toString(),browserRequestInit(url.toString(),init,alternate));s.addressSpace=alternate;
   }
   if([204,205].includes(response.status)||!response.body)throw Error(BROWSER_FAILURES[0]);
   const replyHeaders:Record<string,string>={};for(const key of ['content-type','retry-after']){const v=response.headers.get(key);if(v)replyHeaders[key]=v.slice(0,200);}
   await send({kind:'headers',status:response.status,headers:replyHeaders});
   reader=response.body.getReader();const decoder=new TextDecoder(),redact=credentialRedactor([s.profile.apiKey,...Object.values(s.profile.credentialHeaders??{})]),encoder=new TextEncoder();let bytes=0;
   const chunk=async(text:string)=>{const data=encoder.encode(text);for(let i=0;i<data.length;i+=BROWSER_CHUNK_LIMIT){const part=data.subarray(i,i+BROWSER_CHUNK_LIMIT);await send({kind:'chunk',chunk:btoa(String.fromCharCode(...part))});}};
   for(;;){const part=await reader.read();if(part.done)break;bytes+=part.value.length;if(bytes>BROWSER_RESPONSE_LIMIT)throw Error(BROWSER_FAILURES[3]);await chunk(redact(decoder.decode(part.value,{stream:true})));}
   await chunk(redact(decoder.decode(),true));await send({kind:'end'});
  }catch(error){if(!signal.aborted)try{await send({kind:'error',message:BROWSER_FAILURES.find(x=>x===(error as Error)?.message)??BROWSER_FAILURES[0]});}catch{}}
  finally{abort.abort();await reader?.cancel().catch(()=>{});s.active.delete(task.id);}
 }
 async disconnect(keepalive=false){const sessions=[...this.#sessions.values()];this.#sessions.clear();await Promise.allSettled(sessions.map(async pending=>{const s=await pending;s.abort.abort();for(const a of s.active.values())a.abort();await this.call('close',{token:s.token},undefined,keepalive);}));}
 async close(){if(this.#listening){window.removeEventListener('pagehide',this.#unload);this.#listening=false;}await this.disconnect();}
}

export function browserRequestInit(url:string,init:RequestInit,addressSpace?:'local'|'loopback'):RequestInit {
 const options:RequestInit&{targetAddressSpace?:string}={...init,mode:'cors',credentials:'omit',redirect:'error',cache:'no-store',referrerPolicy:'no-referrer'};
 if(new URL(url).protocol==='http:'){
  options.targetAddressSpace=addressSpace??localAddressSpace(url)??'local';
  // Older Chromium implementations accept only 'local'; this check sends nothing.
  try{new Request(url,options);}catch{if(options.targetAddressSpace==='loopback')options.targetAddressSpace='local';}
 }
 return options;
}
export async function checkBrowserPermission(url:string){
 if(typeof window==='undefined'||typeof navigator==='undefined')return;
 if(!window.isSecureContext)throw Error(BROWSER_FAILURES[2]);
 const space=localAddressSpace(url);if(!space)return;
 const names=space==='loopback'?['loopback-network','local-network-access']:['local-network','local-network-access'];
 for(const name of names){let result:PermissionStatus;try{result=await navigator.permissions.query({name} as any);}catch{continue;}if(result.state==='denied')throw Error(BROWSER_FAILURES[1]);break;}
}
/** Preserve split UTF-8/SSE data while removing even chunk-split echoed secrets. */
export function credentialRedactor(keys:string[]){
 const patterns=[...new Set(keys.flatMap(key=>key?[key,JSON.stringify(key).slice(1,-1),encodeURIComponent(key)]:[]))].sort((a,b)=>b.length-a.length),tail=Math.max(0,...patterns.map(x=>x.length-1));let pending='';
 return (text:string,end=false)=>{pending+=text;let cut=end?pending.length:Math.max(0,pending.length-tail);for(const pattern of patterns){let at=pending.indexOf(pattern);while(at>=0){if(at<cut&&at+pattern.length>cut)cut=at;at=pending.indexOf(pattern,at+1);}}if(cut>0&&cut<pending.length&&pending.charCodeAt(cut-1)>=0xd800&&pending.charCodeAt(cut-1)<=0xdbff&&pending.charCodeAt(cut)>=0xdc00&&pending.charCodeAt(cut)<=0xdfff)cut--;let out=pending.slice(0,cut);pending=pending.slice(cut);for(const p of patterns)out=out.split(p).join('[密钥已隐藏]');return out;};
}
