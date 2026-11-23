import {BrowserModelConnections} from './browser-model-connections';
import {createServer,type IncomingMessage,type ServerResponse} from 'node:http';
import {randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {gzipSync,createGunzip} from 'node:zlib';
import {CLOUD_PROTOCOL,CloudError,CLIENT_RESULT_FAILURE_CODES,CLIENT_RESULT_FAILURE_STAGES} from '../cloud/protocol';
import {assertJson,INPUT_LIMITS,PUBLIC_COMMANDS} from './input';
import {CalculationPool} from './worker-pool';
import {ModelJobs} from './model-jobs';
import {diagnosticRef,type ServerDiagnosticSink} from './server-diagnostics';

interface RequestWindow {at:number;count:number}
interface SessionAccess {worker:number;lastSeen:number;worldId:string;requests:RequestWindow;reads:RequestWindow;opening?:boolean}
/** Each battle action refreshes several revision-bound views. Reads must not exhaust the command/ack budget. */
export function checkSessionRequestLimit(access:{requests:RequestWindow;reads:RequestWindow},route:string,now:number){
  const read=['query','sync','recovery','calculation','model.status'].includes(route),key=read?'reads':'requests';
  if(now-access[key].at>=60000)access[key]={at:now,count:0};
  if(++access[key].count>(read?960:240))throw new CloudError('rate-limit','当前旅程操作过于频繁，请稍后重试',429);
}
export interface CloudServerOptions {workerPath:string;modelWorkerPath?:string;workflowSecret?:string;origins:string[];buildId:string;localDesktop?:boolean;workers?:number;maxSessions?:number;sessionTtlMs?:number;diagnostics?:ServerDiagnosticSink;deviceKey?:string}
export async function createCloudServer(options:CloudServerOptions){
  if(!options.origins.length||!options.buildId)throw new Error('需要设置站点地址与发布版本');
  const deviceKey=options.deviceKey===undefined?undefined:Buffer.from(options.deviceKey);
  const secret=options.workflowSecret??randomBytes(32).toString('hex');
  const record:ServerDiagnosticSink=event=>{try{options.diagnostics?.(event);}catch{/* Diagnostics cannot reject a game operation. */}};
  const pool=new CalculationPool(options.workerPath,options.workers??1,32,60000,{workflowSecret:secret,localDesktop:options.localDesktop===true}),rulesetVersion=await pool.ready;
  const browserConnections=new BrowserModelConnections();
  const modelJobs=options.modelWorkerPath?new ModelJobs(options.modelWorkerPath,secret,4,1200000,undefined,record,browserConnections):null;
  const modelPeers=new Map<string,{at:number;count:number}>();
  const sessions=new Map<string,SessionAccess>(),peers=new Map<string,{at:number;count:number}>();let nextWorker=0;
  const openings=new Map<string,{at:number;count:number}>();
  const clientFailureWindows=new Map<string,RequestWindow>();
  const modelRecoveryWindows=new Map<string,{requests:RequestWindow;reads:RequestWindow}>();
  pool.onReset=(worker,error,details)=>{record({event:'worker.reset',worker,error,...details});};
  pool.onSlow=(worker,details)=>record({event:'worker.slow',worker,...details});
  let receivingBytes=0;
  const limits={max:options.maxSessions??64,ttl:options.sessionTtlMs??30*60*1000};
  function retire(token:string,access:SessionAccess){
    if(sessions.get(token)!==access)return;
    sessions.delete(token);clientFailureWindows.delete(token);
    // Pool close requests use a coalesced control lane and cannot be dropped by admission pressure.
    void pool.request(access.worker,'close',token).catch(error=>record({event:'session.release-failed',worker:access.worker,error}));
  }
  async function body(req:IncomingMessage,max:number,kind:'command'|'snapshot'|'query'='command'){
    if(!String(req.headers['content-type']).startsWith('application/json'))throw new CloudError('content-type','请求格式不受支持',415);
    const compressed=kind==='snapshot'&&req.headers['content-encoding']==='gzip';
    if(req.headers['content-encoding']&&!compressed)throw new CloudError('content-encoding','请求编码不受支持',415);
    const declared=req.headers['content-length']===undefined?max:Number(req.headers['content-length']);
    if(!Number.isSafeInteger(declared)||declared<0||declared>max)throw new CloudError('input-limit','本次内容超过传输上限',413);
    const reserved=compressed?INPUT_LIMITS.snapshotBytes:declared;
    if(receivingBytes+reserved>128*1024*1024)throw new CloudError('service-busy','服务正在读取其他旅程，请稍后重试',503);
    receivingBytes+=reserved;
    const decoder=compressed?createGunzip():undefined;
    const interrupted=()=>decoder?.destroy(new CloudError('connection-lost','请求传输中断，本机进度仍保留',400));
    let encodedBytes=0;
    const countEncoded=(chunk:Buffer)=>{encodedBytes+=chunk.length;if(encodedBytes>declared||encodedBytes>max)decoder?.destroy(new CloudError('input-limit','本次内容超过传输上限',413));};
    if(decoder){req.once('aborted',interrupted);req.on('data',countEncoded);}
    try{
      const chunks:Buffer[]=[];let bytes=0;
      try{for await(const chunk of decoder?req.pipe(decoder):req){bytes+=chunk.length;if(bytes>max||!compressed&&bytes>declared)throw new CloudError('input-limit','本次内容超过传输上限',413);chunks.push(chunk);}}
      catch(error){if(error instanceof CloudError)throw error;throw new CloudError('invalid-json','请求内容不完整',400);}
      try{const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));assertJson(value,max,kind);return value;}
      catch(error){if(error instanceof CloudError)throw error;throw new CloudError('invalid-json','请求内容不完整');}
    }finally{if(decoder){req.off('aborted',interrupted);req.off('data',countEncoded);req.unpipe(decoder);decoder.destroy();req.resume();}receivingBytes-=reserved;}
  }
  function reply(req:IncomingMessage,res:ServerResponse,status:number,payload:unknown){
    let bytes=Buffer.from(JSON.stringify(payload));
    res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Vary','Accept-Encoding');
    if(bytes.length>1024&&/\bgzip\b/.test(String(req.headers['accept-encoding']))){bytes=gzipSync(bytes);res.setHeader('Content-Encoding','gzip');}
    res.setHeader('Content-Length',bytes.length);res.end(bytes);
  }
  const server=createServer(async(req,res)=>{
    if(deviceKey){
      const provided=Buffer.from(String(req.headers['x-douluo-device-key']??''));
      if(provided.length!==deviceKey.length||!timingSafeEqual(provided,deviceKey)){
        res.writeHead(403,{'Cache-Control':'no-store'}).end();
        return;
      }
    }
    const started=Date.now(),incoming=req.headers['x-douluo-request-id'];
    const requestId=typeof incoming==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(incoming)?incoming:randomUUID();
    res.setHeader('X-Douluo-Request-Id',requestId);
    const pathname=(req.url??'').split('?')[0],routes=['session','command','calculation','battle-takeover','query','ack','sync','close','recovery','client-failure','model/start','model/status','model/cancel','model/release','health'];
    const route=routes.includes(pathname.slice(5))&&pathname.startsWith('/api/')?pathname.slice(5).replace('/','.'):'unknown';
    const context:Record<string,unknown>={requestId,route,stage:'request.validate'};
    const calculationTrace=()=>({requestId,worldRef:context.worldRef as string|undefined});
    let tracked=['session','command','ack','recovery','model.start','model.cancel','model.release'].includes(route);
    if(tracked)record({...context,event:'api.started'});
    let failed=false;
    res.once('finish',()=>{if(tracked&&!failed)record({...context,event:'api.complete',status:res.statusCode,elapsedMs:Date.now()-started});});
    res.once('close',()=>{if(!res.writableFinished)record({...context,event:'api.disconnected',status:res.statusCode,elapsedMs:Date.now()-started});});
    const clientQuery=async(worker:number,token:string,data:unknown)=>{
      const disconnected=new AbortController(),abort=()=>{if(!res.writableFinished)disconnected.abort();};
      res.once('close',abort);req.once('aborted',abort);if(req.aborted||res.destroyed)disconnected.abort();
      try{return await pool.request(worker,'query',token,data,disconnected.signal,calculationTrace());}
      finally{res.off('close',abort);req.off('aborted',abort);}
    };
    try{
      if(pathname==='/api/health'&&req.method==='GET'){reply(req,res,pool.healthy?200:503,{protocol:CLOUD_PROTOCOL,buildId:options.buildId,rulesetVersion,ready:pool.healthy});return;}
      if(!options.origins.includes(String(req.headers.origin??'')))throw new CloudError('origin','请从游戏页面发起操作',403);
      if(req.headers['x-douluo-protocol']!==CLOUD_PROTOCOL||req.headers['x-douluo-build']!==options.buildId)throw new CloudError('client-version','游戏已更新，请先保存进度并刷新页面',426);
      if(req.method!=='POST')throw new CloudError('method','不支持这项请求',405);
      // Nginx overwrites this header; the service binds only to loopback.
      const peer=String(req.headers['x-real-ip']??req.socket.remoteAddress??'unknown');
      const now=Date.now(),bucket=peers.get(peer);
      if(bucket&&now-bucket.at<60000){if(++bucket.count>6000)throw new CloudError('rate-limit','操作过于频繁，请稍后重试',429);}
      else{if(peers.size>=4096)throw new CloudError('service-busy','当前连接较多，请稍后重试',503);peers.set(peer,{at:now,count:1});}
      const snapshotBody=pathname==='/api/session'||pathname==='/api/recovery';
      context.stage='request.read';
      const data=await body(req,snapshotBody?INPUT_LIMITS.snapshotBytes+4096:pathname==='/api/query'?INPUT_LIMITS.queryBytes+4096:pathname==='/api/model/start'?INPUT_LIMITS.modelRequestBytes:pathname==='/api/browser-model/event'?40000:pathname==='/api/command'?INPUT_LIMITS.workflowBytes:INPUT_LIMITS.commandBytes,snapshotBody?'snapshot':pathname==='/api/query'?'query':'command');
      if((route==='query'||route==='recovery')&&typeof data.name==='string'&&/^[a-z][a-z0-9.-]{0,79}$/.test(data.name))context.query=data.name;
      if(route==='command'&&PUBLIC_COMMANDS.includes(data.type))context.command=data.type;
      context.revision=data.expectedRevision??data.revision;context.operationRef=diagnosticRef(data.id??data.operationId);context.resultRef=diagnosticRef(data.resultId);
      if(['/api/browser-model/open','/api/browser-model/status','/api/browser-model/close','/api/browser-model/poll','/api/browser-model/event'].includes(pathname)){
        if(pathname.endsWith('/open')){reply(req,res,200,browserConnections.open(peer,data));return;}
        if(pathname.endsWith('/status')){reply(req,res,200,browserConnections.status(data.token));return;}
        if(pathname.endsWith('/close')){reply(req,res,200,browserConnections.revoke(data.token));return;}
        if(pathname.endsWith('/event')){reply(req,res,200,await browserConnections.event(data.browserToken,data.event));return;}
        const disconnected=new AbortController(),abort=()=>{if(!res.writableFinished)disconnected.abort();};res.once('close',abort);
        try{const value=await browserConnections.poll(data.browserToken,disconnected.signal,data.known,data.cancelAck);if(!res.destroyed)reply(req,res,200,value);}finally{res.off('close',abort);}return;
      }
      if(pathname==='/api/session'){
        const opening=openings.get(peer);
        if(opening&&now-opening.at<60000){if(++opening.count>60)throw new CloudError('rate-limit','新连接过于频繁，请稍后重试',429);}
        else openings.set(peer,{at:now,count:1});
        if(typeof data.worldId!=='string'||data.worldId.length>100||!/^profile-[a-z0-9-]+$/.test(data.worldId))throw new CloudError('invalid-world','世界编号无效');
        context.worldRef=diagnosticRef(data.worldId);context.stage='session.open';
        for(const [token,access] of sessions)if(!access.opening&&now-access.lastSeen>limits.ttl)retire(token,access);
        const bearer=String(req.headers.authorization??'').replace(/^Bearer /,''),previous=sessions.get(bearer);
        if(previous&&previous.worldId===data.worldId){
          if(previous.opening)throw new CloudError('service-busy','正在读取这份旅程，请稍后再操作',409);
          previous.opening=true;
          try{
            const open=()=>pool.request(previous.worker,'open',bearer,{snapshot:data.snapshot,seed:data.worldId},undefined,calculationTrace());
            const snapshot=modelJobs?await modelJobs.withIdleSession(bearer,open,data.worldId):await open();
            previous.lastSeen=Date.now();context.resultRevision=snapshot.revision;
            // Reusing the bearer also makes a lost replacement response recoverable.
            reply(req,res,200,{token:bearer,protocol:CLOUD_PROTOCOL,buildId:options.buildId,snapshot});return;
          }finally{previous.opening=false;}
        }
        if(sessions.size>=limits.max)throw new CloudError('service-busy','当前玩家较多，请稍后重试',503);
        const token=randomBytes(32).toString('base64url'),first=nextWorker++%pool.size;
        const access:SessionAccess={worker:first,lastSeen:now,worldId:data.worldId,requests:{at:now,count:0},reads:{at:now,count:0},opening:true};
        // Reserve before awaiting, but count the same owned world only once.
        sessions.set(token,access);
        let opened=false;
        res.once('close',()=>{if(opened&&!res.writableFinished)retire(token,access);});
        try{
          for(let attempt=0;attempt<pool.size;attempt++){
            access.worker=(first+attempt)%pool.size;
            try{
              const snapshot=await pool.request(access.worker,'open',token,{snapshot:data.snapshot,seed:data.worldId},undefined,calculationTrace());
              opened=true;access.opening=false;access.lastSeen=Date.now();
              if(res.destroyed){retire(token,access);return;}
              context.resultRevision=snapshot.revision;
              reply(req,res,200,{token,protocol:CLOUD_PROTOCOL,buildId:options.buildId,snapshot});return;
            }catch(error){
              if(res.destroyed||attempt===pool.size-1||!(error instanceof CloudError)||error.code!=='service-busy')throw error;
            }
          }
        }catch(error){if(opened)retire(token,access);else if(sessions.get(token)===access)sessions.delete(token);throw error;}
      }
      const token=String(req.headers.authorization??'').replace(/^Bearer /,'');
      // An original bearer owns only its exact retained jobs after a rule reset.
      if(['/api/model/status','/api/model/cancel','/api/model/release'].includes(pathname)){
        if(!modelJobs)throw new CloudError('model-unavailable','模型生成服务尚未启用',503);
        let jobId=data.id;
        if(pathname==='/api/model/status'&&jobId===undefined&&data.submissionId!==undefined){
          if(typeof data.submissionId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.submissionId))throw new CloudError('invalid-workflow','生成提交编号无效');
          jobId=modelJobs.find(token,diagnosticRef(data.submissionId)!);
          if(!jobId)throw new CloudError('model-expired','原生成任务已无法取回，请确认后再重新生成',410);
        }
        if(typeof jobId!=='string'||jobId.length>100)throw new CloudError('invalid-workflow','生成编号无效');
        const owned=modelJobs.get(token,jobId);context.worldRef=diagnosticRef(owned.identity?.worldId);context.jobId=jobId;
        let window=modelRecoveryWindows.get(token);if(!window){window={requests:{at:now,count:0},reads:{at:now,count:0}};modelRecoveryWindows.set(token,window);}
        checkSessionRequestLimit(window,route,now);
        if(pathname==='/api/model/status'){
          const disconnected=new AbortController(),abort=()=>{if(!res.writableFinished)disconnected.abort();};
          res.once('close',abort);req.once('aborted',abort);
          try{const result=await modelJobs.waitForStatus(token,jobId,{afterStatus:data.afterStatus??0,afterEvidence:data.afterEvidence??0,waitMs:data.waitMs??0},disconnected.signal);if(!res.destroyed)reply(req,res,200,result);}
          catch(error){if(!disconnected.signal.aborted&&!res.destroyed)throw error;}
          finally{res.off('close',abort);req.off('aborted',abort);}return;
        }
        if(pathname==='/api/model/cancel'){modelJobs.cancel(token,jobId);reply(req,res,200,{cancelled:true});return;}
        modelJobs.discard(token,jobId);reply(req,res,200,{released:true});return;
      }
      const access=sessions.get(token);
      if(!access||now-access.lastSeen>limits.ttl)throw new CloudError('session-expired','连接已到期，请从本机进度重新连接',410);
      if(access.opening)throw new CloudError('service-busy','正在读取这份旅程，请稍后再操作',409);
      context.worldRef=diagnosticRef(access.worldId);context.stage='session.operation';
      access.lastSeen=now;
      checkSessionRequestLimit(access,route,now);
      if(pathname==='/api/client-failure'){
        const categories=['quota','blocked','transaction','conflict','mismatch','expired','unknown'];
        const codes=CLIENT_RESULT_FAILURE_CODES;
        const stages=CLIENT_RESULT_FAILURE_STAGES;
        if(Object.keys(data).some(key=>!['code','category','stage','jobId','requestId','revision','kind'].includes(key))
          ||!codes.includes(data.code)||!categories.includes(data.category)||!stages.includes(data.stage)
          ||data.revision!==undefined&&(!Number.isSafeInteger(data.revision)||data.revision<0)
          ||data.jobId!==undefined&&(typeof data.jobId!=='string'||!/^[A-Za-z0-9_-]{32}$/.test(data.jobId))
          ||data.requestId!==undefined&&(typeof data.requestId!=='string'||!/^[a-f0-9-]{36}$/i.test(data.requestId))
          ||data.kind!==undefined&&(typeof data.kind!=='string'||!/^[a-z][a-z0-9-]{0,39}$/.test(data.kind)))throw new CloudError('invalid-input','故障记录格式无效');
        // A failure report is advisory; it never confirms storage or changes game state.
        const prior=clientFailureWindows.get(token);
        if(prior&&now-prior.at<60000){if(++prior.count>8){reply(req,res,200,{recorded:false});return;}}
        else clientFailureWindows.set(token,{at:now,count:1});
        let job:any;
        if(data.jobId&&modelJobs)try{job=modelJobs.get(token,data.jobId);}catch{/* Expired tasks can still report a local receive failure. */}
        record({event:'client.result-failed',reason:'client-report',worldRef:context.worldRef,stage:data.stage,category:data.category,kind:job?.identity?.kind??data.kind,revision:data.revision,jobId:data.jobId,requestId:job?.requestId??data.requestId,error:{code:data.code}});
        reply(req,res,200,{recorded:true});return;
      }
      if(pathname==='/api/recovery'){
        if(data.name!=='recovery.inspect')throw new CloudError('invalid-query','不支持这项恢复检查');
        reply(req,res,200,await clientQuery(access.worker,token,data));return;
      }
      if(pathname.startsWith('/api/model/')){
        if(!modelJobs)throw new CloudError('model-unavailable','模型生成服务尚未启用',503);
        if(pathname==='/api/model/start'){
          if(data.submissionId!==undefined&&(typeof data.submissionId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.submissionId)))throw new CloudError('invalid-workflow','生成提交编号无效');
          const sourceKey=data.submissionId?diagnosticRef(data.submissionId):undefined;
          const retained=sourceKey?modelJobs.find(token,sourceKey):undefined;if(retained){context.jobId=retained;reply(req,res,200,{id:retained});return;}
          const previous=modelPeers.get(peer);
          if(previous&&now-previous.at<60000){if(++previous.count>20)throw new CloudError('rate-limit','生成请求过于频繁，请稍后重试',429);}
          else modelPeers.set(peer,{at:now,count:1});
          const id=modelJobs.reserve(token,sourceKey,access.worldId);
          context.jobId=id;context.stage='model.prepare';
          try{
            const snapshot=await pool.request(access.worker,'model-context',token,{revision:data.revision},undefined,calculationTrace());
            modelJobs.start(id,snapshot,access.worldId,data,requestId);
            reply(req,res,200,{id});return;
          }catch(error){modelJobs.discard(token,id);throw error;}
          finally{if(data.profile){data.profile.apiKey='';data.profile.credentialHeaders={};}}
        }
        throw new CloudError('not-found','没有这项服务',404);
      }
      const op=({'/api/command':'command','/api/calculation':'calculation-status','/api/battle-takeover':'battle-takeover','/api/query':'query','/api/ack':'ack','/api/sync':'sync','/api/close':'close'} as Record<string,string>)[pathname];
      if(!op)throw new CloudError('not-found','没有这项服务',404);
      context.stage='operation.'+op;
      const run=()=>op==='query'?clientQuery(access.worker,token,data):pool.request(access.worker,op,token,data,undefined,calculationTrace());
      const settlement=op==='command'&&['arena.reconcile','expedition.resolve-battle'].includes(data.type);
      const operation=()=>op==='command'&&(settlement||['story.continue-locally','story.close-private','story.close-party'].includes(data.type))&&modelJobs?modelJobs.withIdleSession(token,run,access.worldId,settlement?data:undefined):run();
      let result:any;
      if(op==='command'){
        let timer:ReturnType<typeof setTimeout>|undefined;
        try{result=await Promise.race([operation(),new Promise(resolve=>{timer=setTimeout(()=>resolve({calculationPending:true,operationId:data.id}),2_000);})]);}
        finally{clearTimeout(timer);}
      }else result=await operation();
      // Polling does not flood the bounded diagnostic journal with idle reads.
      if(op==='calculation-status'&&result?.status!=='running'){tracked=true;context.outcome=result?.status;}
      if(op==='query'&&['story.local-continuation-preview','story.private-close-preview'].includes(data.name)&&modelJobs?.hasActive(token,access.worldId)){result.available=false;result.reason='请先等待当前构思或取消操作结束';}
      context.resultRevision=result?.delta?.revision??result?.receipt?.delta?.revision??result?.snapshot?.revision;context.resultRef=diagnosticRef(result?.resultId??result?.receipt?.resultId)??context.resultRef;
      if(op==='close'){sessions.delete(token);clientFailureWindows.delete(token);modelJobs?.closeSession(token);}
      reply(req,res,result?.calculationPending?202:200,result);
    }catch(error){
      if(error instanceof CloudError&&error.code==='request-cancelled'&&res.destroyed){record({...context,event:'api.query-cancelled',elapsedMs:Date.now()-started});return;}
      failed=true;
      const known=error instanceof CloudError;
      record({...context,event:'api.failed',status:known?error.status:500,elapsedMs:Date.now()-started,error});
      if(!res.headersSent&&!res.destroyed)reply(req,res,known?error.status:500,{error:{code:known?error.code:'server-error',message:known?error.message:'服务暂时无法完成操作，请稍后重试',requestId}});
      else res.end();
    }
  });
  server.requestTimeout=15000;server.headersTimeout=10000;server.keepAliveTimeout=5000;server.maxHeadersCount=40;
  const cleanup=setInterval(()=>{
    const now=Date.now();for(const [token,access] of sessions)if(!access.opening&&now-access.lastSeen>limits.ttl)retire(token,access);
    for(const [peer,bucket] of peers)if(now-bucket.at>60000)peers.delete(peer);
    for(const [peer,bucket] of openings)if(now-bucket.at>60000)openings.delete(peer);
    for(const [peer,bucket] of modelPeers)if(now-bucket.at>60000)modelPeers.delete(peer);
    for(const [token,window] of modelRecoveryWindows)if(now-Math.max(window.reads.at,window.requests.at)>60000)modelRecoveryWindows.delete(token);
    modelJobs?.cleanup();
  },30000);cleanup.unref();
  record({event:'service.ready'});
  return {server,close:async()=>{record({event:'service.stopping'});clearInterval(cleanup);browserConnections.close();await modelJobs?.close();await new Promise<void>(resolve=>server.close(()=>resolve()));await pool.close();record({event:'service.stopped'});}};
}
