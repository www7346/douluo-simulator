'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),{randomUUID}=require('node:crypto');
const prefix='douluo-credential-v1:';
const refPattern=/^douluo-credential-v1:(disk|session):([a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})$/;

function credentialVault(directory,crypto){
  const session=new Map(),vertexTokens=new Map(),folder=path.join(directory,'model-credentials');
  function scope(profile){
    if(!profile||typeof profile.id!=='string'||profile.id.length>160||typeof profile.baseUrl!=='string'||profile.baseUrl.length>2048)throw Error('模型配置无效');
    const base=profile.baseUrl.trim();
    if(!base)return [profile.id,'',profile.transport||''];
    const url=new URL(base);
    if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.hash||
       [...url.searchParams.keys()].some(name=>/^(?:key|api[-_]?key|token|access_token|secret|authorization)$/i.test(name)))throw Error('模型服务地址须为不含凭据的 HTTP 或 HTTPS 地址');
    return [profile.id,url.href.replace(/\/+$/,''),profile.transport||''];
  }
  async function forget(refs){
    if(!Array.isArray(refs)||refs.length>4096)throw Error('模型凭据引用无效');
    await Promise.all(refs.map(async ref=>{
      const match=typeof ref==='string'&&refPattern.exec(ref);if(!match)return;
      vertexTokens.delete(ref);
      if(match[1]==='session')session.delete(ref);
      else await fs.rm(path.join(folder,match[2]+'.bin'),{force:true});
    }));
  }
  async function fields(profile,convert){
    const headers=profile.credentialHeaders??{},items=Object.entries(headers);
    if(typeof headers!=='object'||Array.isArray(headers)||items.length>16)throw Error('模型请求头无效');
    const convertOne=(name,value)=>{
      if(typeof value!=='string'||value.length>32768||/[\r\n\0]/.test(value))throw Error('模型凭据无效');
      return value?convert(name,value):'';
    };
    const apiKey=await convertOne('key',profile.apiKey??''),entries=[];
    for(const [name,value] of items){
      if(!/^[a-zA-Z0-9!#$%&'*+.^_\x60|~-]{1,150}$/.test(name))throw Error('模型请求头名称无效');
      entries.push([name,await convertOne('header:'+name.toLowerCase(),value)]);
    }
    return {apiKey,credentialHeaders:Object.fromEntries(entries)};
  }
  async function seal(profiles){
    if(!Array.isArray(profiles)||profiles.length>256)throw Error('本次保存的模型配置过多');
    const created=[],protectedProfiles=[];let durable;
    try{
      for(const profile of profiles){
        const owner=scope(profile);
        protectedProfiles.push({...await fields(profile,async(field,value)=>{
          if(refPattern.test(value))return value;
          const id=randomUUID(),record=JSON.stringify({owner,field,value});
          durable??=await crypto.isAsyncEncryptionAvailable().catch(()=>false);
          if(durable){
            let encrypted;
            try{encrypted=await crypto.encryptStringAsync(record);}catch{durable=false;}
            if(encrypted){
              await fs.mkdir(folder,{recursive:true});
              const ref=prefix+'disk:'+id;created.push(ref);
              await fs.writeFile(path.join(folder,id+'.bin'),encrypted,{flag:'wx',mode:0o600});
              return ref;
            }
          }
          const ref=prefix+'session:'+id;created.push(ref);session.set(ref,record);return ref;
        }),id:profile.id});
      }
      return {profiles:protectedProfiles,created};
    }catch(error){await forget(created).catch(()=>{});throw error;}
  }
  async function importVertex(id,location,filename){
    if(!/^(global|[a-z]+(?:-[a-z]+)+[0-9])$/.test(location)||location.length>40)throw Error('请填写 global 或有效的 Google Cloud 地区');
    if((await fs.stat(filename)).size>32768)throw Error('服务账号文件过大');
    let account;try{account=JSON.parse(await fs.readFile(filename,'utf8'));}catch{throw Error('服务账号 JSON 读取失败');}
    if(account.type!=='service_account'||! /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(account.project_id)||! /^[^@\s]+@[^@\s]+\.gserviceaccount\.com$/.test(account.client_email)||!account.private_key?.startsWith('-----BEGIN PRIVATE KEY-----')||account.token_uri!=='https://oauth2.googleapis.com/token')throw Error('请选择 Google Cloud 下载的服务账号 JSON');
    const host=location==='global'?'aiplatform.googleapis.com':location+'-aiplatform.googleapis.com';
    const baseUrl='https://'+host+'/v1/projects/'+account.project_id+'/locations/'+location+'/endpoints/openapi';
    const value='vertex-account:'+JSON.stringify({email:account.client_email,key:account.private_key});
    const result=await seal([{id,baseUrl,transport:'browser',apiKey:value}]);
    return {baseUrl,credential:result.profiles[0].apiKey,project:account.project_id};
  }
  async function vertexAccess(ref,base,value){
    const url=new URL(base);
    if(url.protocol!=='https:'||! /^(?:[a-z0-9-]+-)?aiplatform\.googleapis\.com$/.test(url.host)||! /^\/v1\/projects\/[a-z0-9-]+\/locations\/[a-z0-9-]+\/endpoints\/openapi$/.test(url.pathname)||url.search)throw Error('Vertex 授权须使用 Google Cloud 项目地址');
    const cached=vertexTokens.get(ref);if(cached?.until>Date.now()+90000)return cached.token;
    const {email,key}=JSON.parse(value.slice('vertex-account:'.length)),now=Math.floor(Date.now()/1000);
    const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
    const payload=encode({alg:'RS256',typ:'JWT'})+'.'+encode({iss:email,scope:'https://www.googleapis.com/auth/cloud-platform',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
    let assertion;try{assertion=payload+'.'+require('node:crypto').sign('RSA-SHA256',Buffer.from(payload),key).toString('base64url');}catch{throw Error('服务账号签名失败，请重新选择有效的 JSON');}
    const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion})});
    if(!response.ok)throw Error('Google Cloud 授权失败（HTTP '+response.status+'），请核对服务账号及本机时间');
    const body=await response.json();
    if(!body.access_token||body.token_type?.toLowerCase()!=='bearer'||!(body.expires_in>0))throw Error('Google Cloud 没有返回有效的临时授权');
    vertexTokens.set(ref,{token:body.access_token,until:Date.now()+Math.min(3600,Number(body.expires_in))*1000});return body.access_token;
  }
  async function resolve(profile){
    const owner=scope(profile);
    return fields(profile,async(field,ref)=>{
      const match=refPattern.exec(ref);if(!match)return ref; // Unsaved input for an explicit connection test.
      let plain;
      try{plain=match[1]==='session'?session.get(ref):(await crypto.decryptStringAsync(await fs.readFile(path.join(folder,match[2]+'.bin')))).result;}
      catch{throw Error('本机未能解密此模型的凭据，请在模型设置中重新填写');}
      if(!plain)throw Error('本次会话的模型凭据已失效，请重新填写');
      const record=JSON.parse(plain);
      const vertex=field==='key'&&record.value.startsWith('vertex-account:');
      // The renderer identifies a credential by the service's /models URL.
      // Vertex imports bind to the same project's base endpoint before the renderer sees them.
      const requested=vertex?[owner[0],owner[1].replace(/\/models$/,''),owner[2]]:owner;
      if(!owner[1]||JSON.stringify(requested)!==JSON.stringify(record.owner)||field!==record.field)throw Error('模型凭据不属于当前服务地址或认证字段，请重新填写');
      return vertex?vertexAccess(ref,record.owner[1],record.value):record.value;
    });
  }
  return {seal,resolve,forget,importVertex};
}
module.exports={credentialVault};
