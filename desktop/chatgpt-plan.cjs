'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const {randomBytes,randomUUID,createHash,timingSafeEqual} = require('node:crypto');

const issuer='https://auth.openai.com';
const resource='https://api.openai.com/v1';
const usageUrl='https://chatgpt.com/settings/usage';
const requiredScopes=['resource.invoke','chatgpt.tokens.use.direct'];
const scopes=['openid','profile','email','offline_access',...requiredScopes].join(' ');
const canGenerate=p=>!!p?.access&&requiredScopes.every(s=>p.scopes?.includes(s));
const opaque=()=>randomBytes(32).toString('base64url');
const same=(a,b)=>typeof a==='string'&&typeof b==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const safeProfile=p=>({id:p.id,label:p.label,email:p.email||'',connected:!!p.access,sharing:canGenerate(p)});
const accountError=()=>Error('请在模型渠道中重新使用 ChatGPT 登录。');

function createChatGPTPlan({directory,encryption,openBrowser,fetcher=fetch}){
  const filename=path.join(directory,'chatgpt-plan.bin'),permits=new Map();
  let vault,queue=Promise.resolve(),pending=null,verificationKeys;
  const locked=fn=>{const next=queue.then(fn);queue=next.catch(()=>{});return next;};
  async function save(data){
    if(!encryption.isEncryptionAvailable())throw Error('Windows 凭据加密不可用，请重新启动后再连接。');
    await fs.mkdir(directory,{recursive:true});
    const temp=filename+'.'+randomUUID();
    try{
      await fs.writeFile(temp,encryption.encryptString(JSON.stringify(data)),{mode:0o600,flag:'wx'});
      await fs.rename(temp,filename);vault=data;
    }finally{await fs.rm(temp,{force:true}).catch(()=>{});}
  }
  async function read(){
    if(vault)return vault;
    try{
      const data=JSON.parse(encryption.decryptString(await fs.readFile(filename)));
      if(typeof data.host!=='string'||!Array.isArray(data.profiles))throw Error();
      return vault=data;
    }catch(e){
      if(e.code!=='ENOENT')throw Error('无法读取本机的 ChatGPT 授权记录。');
      const fresh={host:'urn:uuid:'+randomUUID(),profiles:[]};await save(fresh);return fresh;
    }
  }
  async function replace(data,p){
    await save({...data,profiles:[...data.profiles.filter(a=>a.id!==p.id),p]});
  }
  const remote=(url,init={})=>fetcher(url,{...init,credentials:'omit',redirect:'error',cache:'no-store'});
  async function tokenGrant(fields,signal){
    const resp=await remote(issuer+'/api/accounts/oauth/token',{method:'POST',body:new URLSearchParams({...fields,resource}),signal:AbortSignal.any([signal,AbortSignal.timeout(30000)])});
    const json=await resp.json().catch(()=>({}));
    if(!resp.ok||!json.access_token||String(json.token_type).toLowerCase()!=='bearer'||!(Number(json.expires_in)>0)){
      const error=Error(json.error==='invalid_grant'?'本次授权已失效，请重新登录。':'ChatGPT 未完成授权，请重试。');error.code=json.error;throw error;
    }
    return json;
  }
  async function identity(token,client,nonce){
    if(typeof token!=='string')throw Error('ChatGPT 没有返回已验证的登录身份。');
    const jose=await import('jose');
    verificationKeys??=jose.createRemoteJWKSet(new URL(issuer+'/.well-known/jwks.json'),{[jose.customFetch]:remote});
    const payload=(await jose.jwtVerify(token,verificationKeys,{issuer,audience:client,algorithms:['RS256'],requiredClaims:['sub','exp','iat']})).payload;
    if(typeof payload.sub!=='string'||!payload.sub||(nonce&&!same(payload.nonce,nonce))||(Array.isArray(payload.aud)&&payload.aud.length>1&&payload.azp!==client))throw Error('ChatGPT 登录身份校验失败。');
    return payload;
  }
  function fields(tokens,previous,granted){
    return {access:tokens.access_token,refresh:tokens.refresh_token??previous.refresh,expires:Date.now()+1000*tokens.expires_in,
      scopes:typeof tokens.scope==='string'?tokens.scope.split(/\s+/):granted};
  }
  async function signIn(id){
    if(pending)throw Error('已有一个 ChatGPT 登录窗口等待回应。');
    const abort=new AbortController();pending=abort;
    const state=opaque(),nonce=opaque(),verifier=opaque();
    let server;const signal=AbortSignal.any([abort.signal,AbortSignal.timeout(180000)]);
    try{
      const data=await locked(read),prior=data.profiles.find(p=>p.id===id);
      if(id&&!prior)throw accountError();
      const result=Promise.withResolvers();result.promise.catch(()=>{});
      server=http.createServer((req,res)=>{
        const host='127.0.0.1:'+server.address()?.port;
        let u;try{u=new URL(req.url||'/', 'http://'+host);}catch{res.writeHead(400);res.end();return;}
        const respond=(status,body)=>{res.writeHead(status,{'content-type':'text/plain; charset=utf-8','cache-control':'no-store','referrer-policy':'no-referrer'});res.end(body);};
        if(req.method!=='GET'||req.headers.host!==host||u.pathname!=='/auth/callback'||!same(u.searchParams.get('state'),state))return respond(400,'无效的登录回调。');
        if(u.searchParams.has('error')){respond(200,'登录已取消，可以返回游戏。');result.reject(Error('你取消了本次 ChatGPT 授权。'));return;}
        const code=u.searchParams.get('code'),issued=u.searchParams.get('client_id')??prior?.client;
        if(!code||code.length>8192||!issued||issued==='dynamic_agent_client'||!/^[A-Za-z0-9._~-]{1,255}$/.test(issued)||(prior&&prior.client!==issued)){respond(400,'本次授权信息不匹配。');result.reject(accountError());return;}
        respond(200,'登录信息已送达，请返回斗罗大陆查看结果。');result.resolve({code,client:issued});
      });
      await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok);});
      const redirect='http://127.0.0.1:'+server.address().port+'/auth/callback';
      const u=new URL(issuer+'/api/accounts/authorize');
      u.search=new URLSearchParams({client_id:prior?.client??'dynamic_agent_client',ext_agent_host_id:data.host,
        ...(prior?{...(prior.idToken?{id_token_hint:prior.idToken}:{}),...(prior.email?{login_hint:prior.email}:{}),...(!canGenerate(prior)?{prompt:'consent'}:{})}:{agent_name_hint:'斗罗大陆：武魂模拟器'}),
        response_type:'code',redirect_uri:redirect,scope:scopes,resource,state,nonce,code_challenge_method:'S256',code_challenge:createHash('sha256').update(verifier).digest('base64url')}).toString();
      // Windows may reject long shell URLs. The issued client still identifies
      // the registration when its optional ID-token hint cannot fit.
      if(u.href.length>2048)u.searchParams.delete('id_token_hint');
      signal.throwIfAborted();signal.addEventListener('abort',()=>result.reject(Error('登录已取消或超时。')),{once:true});
      await openBrowser(u.href);const {code,client}=await result.promise;signal.throwIfAborted();
      return await locked(async()=>{
        let current=await read();
        const row=current.profiles.find(p=>p.client===client)??{id:randomUUID(),client,label:'连接 '+(current.profiles.length+1)};
        if(!prior&&!current.profiles.includes(row)){await replace(current,row);current=await read();}
        const tokens=await tokenGrant({grant_type:'authorization_code',client_id:client,code,code_verifier:verifier,redirect_uri:redirect},signal);
        const claims=await identity(tokens.id_token,client,nonce);
        signal.throwIfAborted();
        if(row.sub&&row.sub!==claims.sub)throw accountError();
        const p={...row,...fields(tokens,{},[]),idToken:tokens.id_token,sub:claims.sub,email:typeof claims.email==='string'?claims.email:''};
        await replace(current,p);return safeProfile(p);
      });
    }finally{server?.close();server?.closeAllConnections();if(pending===abort)pending=null;}
  }
  const cancel=()=>pending?.abort();
  async function disconnect(id){
    cancel();
    return locked(async()=>{
      const data=await read(),p=data.profiles.find(a=>a.id===id);if(!p)throw accountError();
      let revoked=!p.refresh;
      for(let n=0;p.refresh&&n<2&&!revoked;n++){
        if(n)await new Promise(resolve=>setTimeout(resolve,400));
        try{const r=await remote(issuer+'/api/accounts/oauth/revoke',{method:'POST',body:new URLSearchParams({client_id:p.client,token:p.refresh,token_type_hint:'refresh_token'}),signal:AbortSignal.timeout(6500)});revoked=r.status===200;if(!revoked&&r.status<500)break;}catch{}
      }
      const {access,refresh,expires,idToken,scopes:oldScopes,...registration}=p;
      await replace(data,registration);
      for(const [key,permit] of permits)if(permit.id===id)permits.delete(key);
      return {revoked};
    });
  }
  async function access(id){
    return locked(async()=>{
      const data=await read(),p=data.profiles.find(a=>a.id===id);
      if(!canGenerate(p))throw accountError();
      if(p.expires>Date.now()+60000)return p.access;
      if(!p.refresh)throw accountError();
      let tokens;
      try{tokens=await tokenGrant({client_id:p.client,grant_type:'refresh_token',refresh_token:p.refresh},new AbortController().signal);}
      catch(e){if(e.code==='invalid_grant')await replace(data,{...p,access:null,refresh:null,idToken:null});throw e;}
      const next={...p,...fields(tokens,p,p.scopes)};
      if(tokens.id_token){const claims=await identity(tokens.id_token,p.client);if(claims.sub!==p.sub)throw accountError();next.idToken=tokens.id_token;}
      await replace(data,next);if(!canGenerate(next))throw accountError();return next.access;
    });
  }
  function permit(id,target,method){
    if(typeof id!=='string'||id.length>100||!(method==='GET'&&target===resource+'/models'||method==='POST'&&target===resource+'/responses'))throw Error('无效的 ChatGPT 请求。');
    for(const [key,p] of permits)if(p.until<Date.now())permits.delete(key);
    if(permits.size>=32)throw Error('请等待当前 ChatGPT 请求完成。');
    const key=randomUUID();permits.set(key,{id,target,method,until:Date.now()+30000});return '/desktop-plan/'+key;
  }
  async function send(req){
    const key=new URL(req.url).pathname.split('/').pop(),p=permits.get(key);permits.delete(key);
    if(!p||p.method!==req.method||p.until<Date.now())return new Response(null,{status:403});
    let body;
    if(p.method==='POST'){
      const raw=await req.text();
      if(Buffer.byteLength(raw)>16*1024*1024)return new Response(null,{status:413});
      try{body=JSON.parse(raw);}catch{return new Response(null,{status:400});}
      if(!body||typeof body.model!=='string'||!body.model||!Array.isArray(body.input)||body.store!==false||body.stream!==true)return new Response(null,{status:400});
    }
    let token;
    try{token=await access(p.id);}catch{return Response.json({error:{message:'请在游戏设置中重新授权 ChatGPT 套餐。'}},{status:401});}
    const res=await remote(p.target,{method:p.method,signal:req.signal,headers:{authorization:'Bearer '+token,accept:body?'text/event-stream':'application/json',...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
    const headers=new Headers();for(const name of ['content-type','retry-after'])if(res.headers.has(name))headers.set(name,res.headers.get(name));
    if(body&&res.ok&&!headers.has('content-type'))headers.set('content-type','text/event-stream');
    return new Response(res.body,{status:res.status,headers});
  }
  return {accounts:()=>locked(async()=>(await read()).profiles.map(safeProfile)),signIn,cancel,disconnect,permit,send,
    usage:()=>openBrowser(usageUrl)};
}
module.exports={createChatGPTPlan};
