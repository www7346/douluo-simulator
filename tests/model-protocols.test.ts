import test from 'node:test';
import assert from 'node:assert/strict';
import {ModelGateway,type ModelProfile} from '../src/runtime/model-gateway';
import {modelEndpoint,wireProtocol,protocolHeaders,validateHeaders,rejectInlineCredentials,redactModel} from '../src/runtime/model-protocol';
import {resolveModelSettings} from '../src/runtime/model-settings';
import {OPEN_CODE_GO,PROVIDER_PRESETS,providerForConnection} from '../src/shared/model-providers';
import {browserRequestPath} from '../src/shared/browser-model-transport';
const base:ModelProfile={id:'matrix',label:'test',baseUrl:'https://relay.example/prefix/v1',model:'route/原始:模型',apiKey:'fixture-private-key',retryCount:0};
const prompt=[{role:'system' as const,content:'请返回JSON'},{role:'user' as const,content:'名称'}];
const json='{"name":"星火"}';
const body=(content=json)=>Response.json({choices:[{finish_reason:'stop',message:{content}}]});
test('套餐只预填连接，模型名称来自玩家选择',()=>{
 for(const preset of PROVIDER_PRESETS.filter(p=>p.plan)){
  assert.equal(providerForConnection(preset.url)?.label,preset.label);
  assert.equal(Object.hasOwn(preset,'model'),false);
  const profile={...base,baseUrl:preset.url,model:'picked-by-player',generation:{protocol:preset.protocol}};
  const wire=wireProtocol(profile),url=modelEndpoint(profile.baseUrl,wire,profile.model);
  assert.equal(url.origin,new URL(preset.url).origin);
  assert.equal(protocolHeaders(profile,wire,url).authorization,'Bearer '+base.apiKey);
 }
});
test('Go 在同一套餐内取模型目录，各模型使用公告协议，目录不能改变凭据的目的地',async()=>{
 const gateway=new ModelGateway({...base,baseUrl:OPEN_CODE_GO},async(url)=>{
  assert.equal(String(url),OPEN_CODE_GO+'/models');
  return Response.json({data:[{id:'future-model',api:{messages:{base_url:'https://invalid.example'}}}]});
 });
 const list=await gateway.listModels();
 assert.equal(list.protocols?.['future-model'],'anthropic');
 const cases=[
  ['kimi-k3','compatible','openai/v1/chat/completions'],
  ['gpt-6-luna','responses','openai/v1/responses'],
  ['minimax-m3','anthropic','anthropic/v1/messages'],
  ['gemini-4-argon','gemini','google/v1beta/models/gemini-4-argon:generateContent'],
 ] as const;
 for(const [model,wire,path] of cases){
  assert.equal(wireProtocol({baseUrl:OPEN_CODE_GO,model}),wire);
  assert.equal(modelEndpoint(OPEN_CODE_GO,wire,model).href,'https://opencode.ai/inference/go/'+path);
  assert.equal(modelEndpoint(OPEN_CODE_GO,wire,model,true).href,OPEN_CODE_GO+'/models');
  assert.equal(wireProtocol({baseUrl:'https://relay.example/v1',model}),'compatible');
 }
});
test('套餐目录优先采用实时响应，仅缺少端点时返回注明来源的公开列表',async()=>{
 const profile={...base,baseUrl:'https://qianfan.baidubce.com/v2/tokenplan/personal',model:''};
 const read=(response:Response)=>new ModelGateway(profile,async()=>response).listModels();
 const live=await read(Response.json({data:[{id:'account-model'}]}));
 assert.deepEqual(live.models,['account-model']);assert.equal(live.source,undefined);
 const published=await read(new Response('missing',{status:404}));
 assert.equal(published.source,'published');assert.ok(published.models.includes('glm-5.3'));
 await assert.rejects(read(new Response('forbidden',{status:403})));
});
test('Vertex 目录只读同区域 Google 发布模型，下一页延续分页令牌，生成仍用玩家项目',async()=>{
 const profile={...base,baseUrl:'https://us-central1-aiplatform.googleapis.com/v1/projects/test-project/locations/us-central1/endpoints/openapi',model:''};
 const calls:string[]=[];
 const gateway=new ModelGateway(profile,async input=>{
  const u=new URL(String(input));calls.push(u.href);
  assert.equal(browserRequestPath(profile.baseUrl,u.href,'GET'),u.pathname+u.search);
  assert.throws(()=>browserRequestPath(profile.baseUrl,u.href,'POST'));
  assert.throws(()=>browserRequestPath(profile.baseUrl.replace('us-central1-aiplatform','us-west1-aiplatform'),u.href,'GET'));
  assert.equal(u.pathname,'/v1beta1/publishers/google/models');
  return Response.json(u.searchParams.has('pageToken')?{publisherModels:[{name:'publishers/google/models/gemini-choice-b'}]}:
   {nextPageToken:'page-two',publisherModels:[{name:'publishers/google/models/gemini-choice-a@001'},{name:'publishers/google/models/gemini-embedding-2'}]});
 });
 assert.deepEqual((await gateway.listModels()).models,['google/gemini-choice-a','google/gemini-choice-b']);
 assert.equal(calls.length,2);assert.equal(modelEndpoint(profile.baseUrl,'compatible','google/gemini-choice-b').href,profile.baseUrl+'/chat/completions');
});
const sse=(events:any[])=>{const bytes=new TextEncoder().encode(events.map(e=>typeof e==='string'?e:'data: '+JSON.stringify(e)+'\n\n').join(''));return new Response(new ReadableStream({start(c){for(let i=0;i<bytes.length;i+=3)c.enqueue(bytes.slice(i,i+3));c.close();}}),{headers:{'content-type':'text/event-stream'}});};
test('空白或格式错误的模型地址提示设置入口且不会发起网络请求',async()=>{
 for(const baseUrl of ['', '  ', 'not-a-service-url']){
  assert.throws(()=>wireProtocol({baseUrl}),/设置.*模型与用途.*服务地址/);
  assert.throws(()=>modelEndpoint(baseUrl,'compatible','test'),/设置.*模型与用途.*服务地址/);
  let calls=0;const gateway=new ModelGateway({...base,baseUrl},async()=>{calls++;return body();});
  await assert.rejects(gateway.chat(prompt),/设置.*模型与用途.*服务地址/);
  assert.equal(calls,0);
 }
});
test('根地址、代理前缀、完整端点、查询参数与原始模型名保留',()=>{
 assert.equal(modelEndpoint('https://relay.example','compatible','').href,'https://relay.example/v1/chat/completions');
 assert.equal(modelEndpoint('https://relay.example:8443/a/v1/chat/completions?region=cn','compatible','').href,'https://relay.example:8443/a/v1/chat/completions?region=cn');
 assert.equal(modelEndpoint('https://relay.example/api/paas/v4','compatible','').pathname,'/api/paas/v4/chat/completions');
 assert.equal(modelEndpoint('https://relay.example/a/v1/messages','anthropic','',true).pathname,'/a/v1/models');
 assert.equal(modelEndpoint('https://relay.example/v1beta/models/old:generateContent','gemini','models/gemini-3.1-pro',false,true).pathname,'/v1beta/models/gemini-3.1-pro:streamGenerateContent');
 assert.equal(modelEndpoint('https://relay.example/v1beta/openai','compatible','').pathname,'/v1beta/openai/chat/completions');
 assert.throws(()=>rejectInlineCredentials('https://relay.example/v1?key=secret'));
});
test('原生协议认证和应用层附加请求头，禁止网络转发字段',()=>{
 for(const [wire,key] of [['compatible','authorization'],['anthropic','x-api-key'],['gemini','x-goog-api-key']] as const){const url=new URL(base.baseUrl);assert.ok(protocolHeaders(base,wire,url)[key].includes(base.apiKey));}
 const url=new URL(base.baseUrl);protocolHeaders({...base,connection:{auth:'query',authName:'token'}},'compatible',url);assert.equal(url.searchParams.get('token'),base.apiKey);
 assert.equal(protocolHeaders({...base,connection:{auth:'none'},credentialHeaders:{'x-provider-auth':'private'}},'compatible',url)['x-provider-auth'],'private');
 for(const key of ['Host','Cookie','Content-Length','X-Forwarded-For','X-Douluo-Session','Sec-Fetch-Site'])assert.throws(()=>validateHeaders({[key]:'bad'}));
 assert.throws(()=>validateHeaders({'x-note':'a\r\nb'}));
});
test('四种协议的普通JSON返回与请求体遵守协议，第三方只发送必要参数',async()=>{
 const cases:any[]=[['compatible',{choices:[{finish_reason:'stop',message:{content:[{type:'text',text:json}]}}]}],['responses',{status:'completed',output:[{type:'message',content:[{type:'output_text',text:json}]}]}],['anthropic',{stop_reason:'end_turn',content:[{type:'thinking',thinking:'PRIVATE_THOUGHT'},{type:'text',text:json}]}],['gemini',{candidates:[{finishReason:'STOP',content:{parts:[{thought:true,text:'PRIVATE_THOUGHT'},{text:json}]}}]}]];
 for(const [protocol,response] of cases){let sent:any;const gateway=new ModelGateway({...base,generation:{protocol}},async(_,init)=>{sent=JSON.parse(String(init?.body));return Response.json(response);});assert.deepEqual(await gateway.structured(prompt,v=>v),{name:'星火'});
  if(protocol==='compatible'){assert.equal(sent.model,base.model);assert.equal(sent.thinking,undefined);assert.equal(sent.response_format,undefined);assert.equal(sent.temperature,undefined);}
  if(protocol==='anthropic'){assert.equal(sent.system,prompt[0].content);assert.ok(sent.messages.every((m:any)=>m.role!=='system'));}
  if(protocol==='responses')assert.ok(sent.input&&!sent.messages);
  if(protocol==='gemini')assert.ok(sent.contents&&sent.systemInstruction&&sent.generationConfig);
 }
});
test('四协议SSE跨UTF8片段、内容块与终止标记，私有思考不进入日志',async()=>{
 const cases:any[]=[['compatible',[{choices:[{delta:{reasoning_content:'PRIVATE_THOUGHT'}}]},{choices:[{delta:{content:json},finish_reason:'stop'}]},'data: [DONE]\n\n']],['responses',[{type:'response.reasoning_summary_text.delta',delta:'PRIVATE_THOUGHT'},{type:'response.output_text.delta',delta:json},{type:'response.completed',response:{status:'completed',output:[]}}]],['anthropic',[{type:'message_start',message:{model:'alias'}},{type:'content_block_start',index:0,content_block:{type:'thinking',thinking:'PRIVATE_THOUGHT'}},{type:'content_block_start',index:1,content_block:{type:'text',text:''}},{type:'content_block_delta',index:1,delta:{type:'text_delta',text:json}},{type:'message_delta',delta:{stop_reason:'end_turn'}},{type:'message_stop'}]],['gemini',[{candidates:[{content:{parts:[{thought:true,text:'PRIVATE_THOUGHT'}]}}]},{candidates:[{content:{parts:[{text:json}]},finishReason:'STOP'}]}]]];
 for(const [protocol,events] of cases){const logs:any[]=[];const gateway=new ModelGateway({...base,generation:{protocol}},async()=>sse(events),l=>logs.push(l));assert.deepEqual(await gateway.structured(prompt,v=>v),{name:'星火'});assert.ok(!JSON.stringify(logs).includes('PRIVATE_THOUGHT'));}
});
test('受限参数只移除明确失败项一次，沿用模型与提示词，并共享修复预算',async()=>{
 const requests:any[]=[];const gateway=new ModelGateway({...base,retryCount:1,connection:{jsonMode:'native'}},async(_,init)=>{requests.push(JSON.parse(String(init?.body)));return requests.length===1?Response.json({error:{message:'unsupported parameter response_format'}},{status:400}):body();});
 assert.deepEqual(await gateway.structured(prompt,v=>v),{name:'星火'});assert.equal(requests.length,2);assert.ok(requests[0].response_format);assert.equal(requests[1].response_format,undefined);assert.equal(requests[1].model,base.model);assert.deepEqual(requests[1].messages,requests[0].messages);
});
test('权限、额度、模型错误保留原因并脱敏全部凭证，不误做通用重试',async()=>{
 for(const [status,message,kind] of [[403,'plan does not allow this model','permission'],[429,'insufficient quota','quota'],[404,'model missing','not-found']] as const){let calls=0;const logs:any[]=[];const gateway=new ModelGateway({...base,retryCount:2,credentialHeaders:{'x-key':'header-private'}},async()=>{calls++;return Response.json({error:{message:message+' '+base.apiKey+' header-private'}},{status});},l=>logs.push(l));await assert.rejects(gateway.testConnection(),(e:any)=>e.kind===kind&&!e.message.includes(base.apiKey)&&!e.message.includes('header-private'));assert.equal(calls,1);assert.ok(!JSON.stringify(logs).includes(base.apiKey));}
 const escaped='a"b\\c';assert.doesNotThrow(()=>JSON.parse(redactModel(JSON.stringify({message:escaped}),{apiKey:escaped})));
});
test('限流没有有效冷却时间时只发一次请求，保留原因供玩家稍后重试',async()=>{
 for(const retryAfter of [undefined,'unknown']){
  let calls=0;
  const gateway=new ModelGateway({...base,retryCount:2},async()=>{
   calls++;return Response.json({error:{message:'request rate exceeded'}},{status:429,headers:retryAfter?{'retry-after':retryAfter}:undefined});
  });
  await assert.rejects(gateway.chat(prompt),(e:any)=>e.kind==='rate-limit'&&e.status===429&&!e.retryable);
  assert.equal(calls,1);
 }
});

test('限流遵守服务冷却时间和原次数上限，等待期间可以取消',async()=>{
 const calls:number[]=[];
 const gateway=new ModelGateway({...base,retryCount:1},async()=>{
  calls.push(Date.now());return calls.length===1?Response.json({error:{message:'rate exceeded'}},{status:429,headers:{'retry-after':'0.08'}}):body();
 });
 assert.deepEqual(await gateway.structured(prompt,v=>v),{name:'星火'});
 assert.equal(calls.length,2);assert.ok(calls[1]-calls[0]>=70);
 let attempts=0;const controller=new AbortController();
 const cancelled=new ModelGateway({...base,retryCount:1},async()=>{
  attempts++;setTimeout(()=>controller.abort(),10);
  return Response.json({error:{message:'rate exceeded'}},{status:429,headers:{'retry-after':'30'}});
 });
 await assert.rejects(cancelled.chat(prompt,{signal:controller.signal}),(e:any)=>e.kind==='cancelled');
 assert.equal(attempts,1);
});

test('列表缺失可以手填，原生模型列表分页且不改第三方路由ID',async()=>{
 const urls:string[]=[];const gateway=new ModelGateway({...base,generation:{protocol:'gemini'}},async u=>{urls.push(String(u));return Response.json(urls.length===1?{models:[{name:'models/gemini-pro'}],nextPageToken:'page2'}:{models:[{name:'models/gemini-flash'}]});});assert.equal((await gateway.listModels()).models.length,2);assert.match(urls[1],/pageToken=page2/);
 assert.equal((await new ModelGateway(base,async()=>new Response('',{status:405})).listModels()).manualEntryRequired,true);
 assert.deepEqual((await new ModelGateway(base,async()=>Response.json({data:[{id:base.model}]})).listModels()).models,[base.model]);
});
test('首包等待与网络建连独立；开始接收后空闲或错误不自动重复生成',async()=>{
 let initSeen:any;const g=new ModelGateway({...base,connectTimeoutMs:5,firstByteTimeoutMs:1000},async(_,init)=>{initSeen=init;await new Promise(r=>setTimeout(r,30));return body();});assert.deepEqual(await g.structured(prompt,v=>v),{name:'星火'});assert.equal(initSeen.providerConnectTimeoutMs,5);
 let calls=0;const stream=new ModelGateway({...base,retryCount:2,idleTimeoutMs:15},async()=>{calls++;return new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode(': heartbeat\n\n'));}}),{headers:{'content-type':'text/event-stream'}});});await assert.rejects(stream.testConnection(),(e:any)=>e.kind==='timeout');assert.equal(calls,1);
 calls=0;const failed=new ModelGateway({...base,retryCount:2},async()=>{calls++;return sse([{error:{message:'service interrupted'}}]);});await assert.rejects(failed.testConnection());assert.equal(calls,1);
 assert.equal(resolveModelSettings({waitMode:'long'}).timeoutMs,1200000);assert.equal(resolveModelSettings({waitMode:'long'}).firstByteTimeoutMs,600000);assert.equal(resolveModelSettings({waitMode:'long',timeoutMs:1200000},'combat-intent').timeoutMs,20000);
});
test('Claude 格式修复保留带签名思考块，Gemini 保留 thoughtSignature，不进入诊断',async()=>{
 for(const protocol of ['anthropic','gemini'] as const){const requests:any[]=[],logs:any[]=[];const gateway=new ModelGateway({...base,retryCount:1,generation:{protocol}},async(_,init)=>{requests.push(JSON.parse(String(init?.body)));const text=requests.length===1?'invalid':json;return Response.json(protocol==='anthropic'?{stop_reason:'end_turn',content:[{type:'thinking',thinking:'PRIVATE_THOUGHT',signature:'private-signature'},{type:'text',text}]}:{candidates:[{finishReason:'STOP',content:{parts:[{text,thoughtSignature:'private-signature'}]}}]});},l=>logs.push(l));assert.deepEqual(await gateway.structured(prompt,v=>v),{name:'星火'});assert.ok(JSON.stringify(requests[1]).includes('private-signature'));assert.ok(!JSON.stringify(logs).includes('private-signature'));}
});
