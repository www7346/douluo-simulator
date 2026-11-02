const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {credentialVault}=require('../desktop/model-credentials.cjs');
test('Vertex 本机导入、签名、复用、续期及撤销',async(t)=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'douluo-vertex-'));
 t.after(()=>fs.rm(folder,{force:true,recursive:true}));
 const {privateKey,publicKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
 const account={type:'service_account',client_email:'reader@sample-project.iam.gserviceaccount.com',project_id:'sample-project',private_key:privateKey.export({type:'pkcs8',format:'pem'}),token_uri:'https://oauth2.googleapis.com/token'};
 const file=path.join(folder,'account.json');await fs.writeFile(file,JSON.stringify(account));
 const vault=credentialVault(folder,{isAsyncEncryptionAvailable:async()=>false});
 const chosen=await vault.importVertex('v','global',file);
 const profile={id:'v',transport:'browser',baseUrl:chosen.baseUrl,apiKey:chosen.credential};
 assert.ok(!JSON.stringify(chosen).includes('PRIVATE KEY'));
 let calls=0;
 t.mock.method(globalThis,'fetch',async(url,request)=>{
  assert.equal(url,account.token_uri);
  const [h,p,s]=request.body.get('assertion').split('.');
  assert.ok(crypto.verify('RSA-SHA256',Buffer.from(h+'.'+p),publicKey,Buffer.from(s,'base64url')));
  assert.equal(JSON.parse(Buffer.from(p,'base64url')).iss,account.client_email);
  return Response.json({access_token:'test-access-'+(++calls),token_type:'Bearer',expires_in:3600});
 });
 await assert.rejects(vault.resolve({...profile,baseUrl:'https://unrelated.invalid/v1'}));
 await assert.rejects(vault.resolve({...profile,baseUrl:profile.baseUrl.replace('sample-project','other-project')+'/models'}));
 assert.equal((await vault.resolve({...profile,baseUrl:profile.baseUrl+'/models'})).apiKey,'test-access-1');
 assert.equal((await vault.resolve(profile)).apiKey,'test-access-1');
 const later=Date.now()+3600000;t.mock.method(Date,'now',()=>later);
 assert.equal((await vault.resolve(profile)).apiKey,'test-access-2');
 await vault.forget([chosen.credential]);await assert.rejects(vault.resolve(profile));assert.equal(calls,2);
});
