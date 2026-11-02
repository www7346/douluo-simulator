const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {createChatGPTPlan}=require('../desktop/chatgpt-plan.cjs');

test('桌面 OAuth 校验 PKCE、签名、nonce、注册绑定；刷新和撤销归属同一账号',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'douluo-plan-auth-'));
 t.after(()=>fs.rm(dir,{force:true,recursive:true}));
 const pair=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
 const jwk={...pair.publicKey.export({format:'jwk'}),kid:'fixture',alg:'RS256',use:'sig'};
 const secret=crypto.randomBytes(32);
 const encryption={isEncryptionAvailable:()=>true,encryptString(s){const iv=crypto.randomBytes(16),c=crypto.createCipheriv('aes-256-ctr',secret,iv);return Buffer.concat([iv,c.update(s),c.final()]);},decryptString(b){const c=crypto.createDecipheriv('aes-256-ctr',secret,b.subarray(0,16));return Buffer.concat([c.update(b.subarray(16)),c.final()]).toString();}};
 let auth,calls=[],refreshCount=0;
 const client='oaiapp_test01',encode=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
 function token(){
  const h=encode({kid:'fixture',alg:'RS256'}),p=encode({sub:'fixture-subject',iss:'https://auth.openai.com',aud:client,nonce:auth.get('nonce'),email:'test@example.invalid',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+900});
  return [h,p,crypto.sign('sha256',Buffer.from(h+'.'+p),pair.privateKey).toString('base64url')].join('.');
 }
 const options={directory:dir,encryption,openBrowser:async url=>{
  auth=new URL(url).searchParams;assert.equal(auth.get('client_id'),'dynamic_agent_client');assert.equal(auth.get('code_challenge_method'),'S256');
  const callback=new URL(auth.get('redirect_uri'));assert.equal(callback.hostname,'127.0.0.1');
  callback.search=new URLSearchParams({state:'incorrect',code:'code',client_id:client});assert.equal((await fetch(callback)).status,400);
  callback.searchParams.set('state',auth.get('state'));assert.equal((await fetch(callback)).status,200);
 },fetcher:async(url,init)=>{
  const u=String(url);calls.push(u);
  if(u.endsWith('/jwks.json'))return Response.json({keys:[jwk]});
  if(u.endsWith('/oauth/token')){
   assert.equal(init.body.get('client_id'),client);
   if(init.body.get('grant_type')==='authorization_code'){
    assert.equal(crypto.createHash('sha256').update(init.body.get('code_verifier')).digest('base64url'),auth.get('code_challenge'));
    assert.equal(init.body.get('redirect_uri'),auth.get('redirect_uri'));
    return Response.json({access_token:'private-test-access',refresh_token:'private-test-refresh',id_token:token(),token_type:'Bearer',expires_in:1,scope:auth.get('scope')});
   }
   assert.equal(init.body.get('refresh_token'),'private-test-refresh');refreshCount++;
   return Response.json({access_token:'fresh-test-access',refresh_token:'fresh-test-refresh',token_type:'Bearer',expires_in:3600});
  }
  if(u.endsWith('/oauth/revoke')){assert.equal(init.body.get('token'),'fresh-test-refresh');return new Response(null,{status:200});}
  assert.equal(new Headers(init.headers).get('authorization'),'Bearer fresh-test-access');assert.equal(init.redirect,'error');
  return Response.json({models:[{slug:'manual',display_name:'手选',visibility:'list'}]});
 }};
 const plan=createChatGPTPlan(options),account=await plan.signIn();assert.equal(account.sharing,true);
 assert.doesNotMatch(JSON.stringify(await plan.accounts()),/private-test|fresh-test/);
 assert.ok(!(await fs.readFile(path.join(dir,'chatgpt-plan.bin'))).includes(Buffer.from('private-test-refresh')));
 const restored=createChatGPTPlan(options);
 assert.throws(()=>restored.permit(account.id,'https://example.invalid/v1/models','GET'));
 const permit=()=>new Request('https://game.invalid'+restored.permit(account.id,'https://api.openai.com/v1/models','GET'));
 const req=permit();
 await Promise.all([req,permit()].map(async r=>assert.equal((await restored.send(r)).status,200)));assert.equal(refreshCount,1);
 assert.equal((await restored.send(req)).status,403);
 await restored.disconnect(account.id);assert.equal((await restored.accounts())[0].connected,false);
 assert.equal((await restored.send(permit())).status,401);
});
