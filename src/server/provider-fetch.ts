import {validateHeaders,PROVIDER_BODY_COMPLETE} from '../runtime/model-protocol';
import {networkInterfaces} from 'node:os';
import {providerResolver,type ProviderResolver} from './provider-dns';
import {BlockList,isIP} from 'node:net';
import {request} from 'node:https';
import {Transform} from 'node:stream';
import {CloudError} from '../cloud/protocol';
import {reserveEvaluationRequest,updateEvaluationRequest,evaluationLedgerError} from './evaluation-ledger';

const blocked=new BlockList();
for(const [address,bits] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]] as const)blocked.addSubnet(address,bits,'ipv4');
const globalV6=new BlockList();globalV6.addSubnet('2000::',3,'ipv6');
for(const [address,bits] of [['2001::',32],['2001:2::',48],['2001:10::',28],['2001:20::',28],['2001:db8::',32],['2002::',16],['3fff::',20]] as const)blocked.addSubnet(address,bits,'ipv6');
export function publicProviderAddress(address:string):boolean {
  const family=isIP(address);
  if(family===4)return !blocked.check(address,'ipv4');
  return family===6&&globalV6.check(address,'ipv6')&&!blocked.check(address,'ipv6');
}
export async function resolveProviderUrl(input:string,denyAddresses:string[]=[],resolveDns:ProviderResolver=providerResolver()){
  let url:URL;try{url=new URL(input);}catch{throw new CloudError('provider-url','请填写完整的 HTTPS 模型接口地址');}
  if(url.protocol!=='https:'||url.username||url.password||url.hash)throw new CloudError('provider-url','在线版需要公共 HTTPS 模型接口；支持自定义 HTTPS 端口');
  const hostname=url.hostname.replace(/^\[|\]$/g,'');
  if(!hostname||hostname.endsWith('.localhost')||hostname==='localhost'||hostname.endsWith('.local')||String(process.env.DOULUO_ORIGINS??'').split(',').some(origin=>{try{return new URL(origin.trim()).hostname===hostname;}catch{return false;}}))throw new CloudError('provider-url','在线版无法访问本机或内网模型地址');
  let timer:ReturnType<typeof setTimeout>|undefined;
  let addresses:{address:string;family:number}[];
  try{addresses=isIP(hostname)?[{address:hostname,family:isIP(hostname)}]:await Promise.race([resolveDns(hostname),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new CloudError('provider-dns','模型地址解析超时，请重试')),5000);})]);}
  catch(error){if(error instanceof CloudError)throw error;throw new CloudError('provider-dns','模型域名解析失败，请检查域名或稍后重试');}
  finally{clearTimeout(timer);}
  const deny=new BlockList();for(const address of denyAddresses)if(isIP(address))deny.addAddress(address,isIP(address)===4?'ipv4':'ipv6');
  if(!addresses.length||addresses.some(entry=>!publicProviderAddress(entry.address)||deny.check(entry.address,entry.family===4?'ipv4':'ipv6')))throw new CloudError('provider-url','模型域名解析到了内网、保留地址或游戏服务器；如本机开启了代理假 IP，请使用本地启动器的可信 DNS 配置');
  return {url,hostname,address:addresses[0],addresses};
}

export function localProviderAddresses(readInterfaces:typeof networkInterfaces=networkInterfaces):string[] {
 try{return Object.values(readInterfaces()).flatMap(items=>(items??[]).map(x=>x.address));}
 catch{throw new CloudError('provider-environment','云端模型服务无法读取服务器网络配置，请联系管理员修复服务权限；尚未连接模型服务',503);}
}

/** Each TLS socket is pinned; request bytes are sent only after a verified connection. */
export function createProviderFetch(denyAddresses:string[]=localProviderAddresses(),evaluationPath=process.env.DOULUO_EVAL_LEDGER):typeof fetch {
 return (async(input:RequestInfo|URL,init:RequestInit={})=>{
  if(typeof input!=='string'&&!(input instanceof URL))throw new CloudError('provider-request','模型请求格式无效');
  const method=String(init.method??'GET');if(!['GET','POST'].includes(method))throw new CloudError('provider-request','模型请求方式无效');
  const safeHeaders=validateHeaders(Object.fromEntries(new Headers(init.headers).entries()));
  const body=typeof init.body==='string'?init.body:null;
  if(init.body&&body===null)throw new CloudError('provider-request','模型请求内容无效');
  if(body&&Buffer.byteLength(body)>512*1024)throw new CloudError('provider-request','本次模型输入过大');
  const connectMs=Math.max(1,Math.min(120000,(init as any).providerConnectTimeoutMs??30000));
  const original=new URL(String(input));let url=original;
  for(let redirect=0;redirect<=2;redirect++){
   const checked=await resolveProviderUrl(url.toString(),denyAddresses);
   if(init.signal?.aborted)throw init.signal.reason;
   const response=await new Promise<Response>((resolve,reject)=>{
    let index=0,settled=false;const connectionStart=Date.now();
    const attempt=()=>{
     const address=checked.addresses[index++];let connected=false;
     let evaluation:Awaited<ReturnType<typeof reserveEvaluationRequest>>|undefined,evaluationTimer:ReturnType<typeof setTimeout>|undefined,recording:Promise<void>|undefined;
     const finishEvaluation=(errorKind?:string)=>{
      clearTimeout(evaluationTimer);
      if(!evaluation)return Promise.resolve();
      return recording??=(updateEvaluationRequest(evaluationPath!,evaluation.id,{status:errorKind?'failed':'complete',...(errorKind?{errorKind}:{})}).then(()=>{}));
     };
     const remaining=connectMs-(Date.now()-connectionStart);if(remaining<=0){reject(new CloudError('provider-connect','连接模型服务器超时（尚未发送生成请求）'));return;}
     const req=request(checked.url,{method,headers:safeHeaders,agent:false,signal:init.signal??undefined,lookup:(_host,options,callback)=>{if(typeof options==='object'&&options.all)(callback as any)(null,[address]);else (callback as any)(null,address.address,address.family);}},res=>{
      settled=true;clearTimeout(timer);
      let bytes=0;const bounded=new Transform({transform(chunk,_encoding,next){bytes+=chunk.length;if(bytes>8*1024*1024)next(new CloudError('provider-limit','模型答复超过接收上限'));else next(null,chunk);},flush(done){finishEvaluation().then(()=>done(),error=>done(error));}});
      const failed=(error:Error)=>{void finishEvaluation((error as any).code??'provider-stream').then(()=>bounded.destroy(error),failure=>bounded.destroy(failure));};
      res.on('error',failed);res.on('aborted',()=>failed(new Error('模型连接提前中断')));bounded.on('close',()=>{if(!bounded.readableEnded)void finishEvaluation('provider-cancelled').catch(()=>{});res.destroy();});res.pipe(bounded);
      const headers=new Headers();for(const key of ['content-type','retry-after','location'])if(res.headers[key])headers.set(key,String(res.headers[key]));
      const iterator=bounded[Symbol.asyncIterator]();let cancelled=false;
      const stream=new ReadableStream<Uint8Array>({
       async pull(controller){try{const chunk=await iterator.next();if(cancelled)return;if(chunk.done)controller.close();else controller.enqueue(chunk.value);}catch(error){if(!cancelled)controller.error(error);}},
       async cancel(reason){cancelled=true;try{await finishEvaluation(reason===PROVIDER_BODY_COMPLETE?undefined:'provider-cancelled');}finally{bounded.destroy();await iterator.return?.().catch(()=>{});}}
      });
      resolve(new Response([204,205,304].includes(res.statusCode??0)?null:stream,{status:res.statusCode??502,headers}));
     });
     const timer=setTimeout(()=>req.destroy(new CloudError('provider-connect','连接模型服务器超时（尚未发送生成请求）')),Math.max(1,Math.floor(remaining/Math.max(1,Math.min(4,checked.addresses.length)-index+1))));
     req.on('socket',socket=>{socket.once('secureConnect',()=>{
      connected=true;clearTimeout(timer);
      let preparingLedger=true;
      void (async()=>{
       if(evaluationPath){
        const meta=(init as any).providerRequest;
        evaluation=await reserveEvaluationRequest(evaluationPath,{task:meta?.task??'provider-direct',callId:meta?.callId,attempt:meta?.attempt});
        await updateEvaluationRequest(evaluationPath,evaluation.id,{status:'sent'});
        if(evaluation.deadlineAt!==null){
         if(Date.now()>=evaluation.deadlineAt)throw new CloudError('evaluation-limit','真实模型验收已达到90分钟连续时间上限');
         evaluationTimer=setTimeout(()=>req.destroy(new CloudError('evaluation-limit','真实模型验收已达到90分钟连续时间上限')),evaluation.deadlineAt-Date.now());
        }
       }
       if(req.destroyed||init.signal?.aborted){await finishEvaluation('cancelled-before-send');return;}
       preparingLedger=false;
       (init as any).providerOnConnected?.();req.end(body);
      })().catch(error=>req.destroy(error instanceof CloudError?error:preparingLedger?evaluationLedgerError(error):new CloudError('provider-request','模型请求发送准备失败；请检查本次连接记录')));
     });});
     req.on('error',(error:any)=>{clearTimeout(timer);if(settled)return;if(!connected&&!init.signal?.aborted&&index<Math.min(4,checked.addresses.length)){attempt();return;}void finishEvaluation(error.code??'provider-connect').then(()=>{if(init.signal?.aborted)reject(init.signal.reason);else if(error instanceof CloudError)reject(error);else reject(new CloudError(/CERT|TLS|SSL|ALTNAME/.test(error.code??'')?'provider-tls':'provider-connect',connected?'模型连接中断，服务可能已收到请求；重试可能再次计费':'无法建立模型连接，请检查域名、网络和 HTTPS 证书'));},reject);});
    };attempt();
   });
   if(response.status<300||response.status>=400)return response;
   await response.body?.cancel();
   let next:URL;try{next=new URL(response.headers.get('location')??'',url);}catch{throw new CloudError('provider-redirect','模型接口跳转地址无效');}
   if(![307,308].includes(response.status)||next.origin!==original.origin||redirect===2)throw new CloudError('provider-redirect','模型接口发生跨站或不支持的跳转，请填写服务商提供的最终 API 地址；未向新站点发送密钥');
   url=next;
  }
  throw new CloudError('provider-redirect','模型接口跳转次数过多');
 }) as typeof fetch;
}
