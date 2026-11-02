import test from 'node:test';
import assert from 'node:assert/strict';
import {ModelGateway,type ModelProfile} from '../src/runtime/model-gateway';
import {modelEndpoint,protocolBody,wireProtocol} from '../src/runtime/model-protocol';
import {browserRequestPath} from '../src/shared/browser-model-transport';
import {resolveModelSettings} from '../src/runtime/model-settings';
const profile:ModelProfile={id:'one',label:'game',baseUrl:'https://api.openai.com/v1',apiKey:'',model:'chosen',channelMode:'chatgpt',retryCount:0,connection:{stream:false,extendedParameters:true}};
test('订阅目录保留提供方顺序和显示名，只展示可选项；请求使用用户实际选中的 slug',async()=>{
 const g=new ModelGateway(profile,async()=>Response.json({models:[{slug:'z',display_name:'Z',visibility:'list'},{slug:'h',visibility:'hidden'},{slug:'a',display_name:'A',visibility:'list'}]}));
 const list=await g.listModels();assert.deepEqual(list.models,['z','a']);assert.equal(list.displayNames!.z,'Z');
 const wire=wireProtocol(profile,'compatible');assert.equal(wire,'responses');
 const url=modelEndpoint(profile.baseUrl,wire,profile.model);assert.equal(browserRequestPath(profile.baseUrl,url.href,'POST'),'/v1/responses');assert.throws(()=>browserRequestPath('https://another.invalid/v1',url.href,'POST'));
 const body=protocolBody(profile,wire,[{role:'system',content:'设定'},{role:'user',content:'继续'}],resolveModelSettings(profile),500,false);
 assert.deepEqual(body.input,[{role:'developer',content:'设定'},{role:'user',content:'继续'}]);
 assert.equal(body.stream,true);assert.equal(body.store,false);assert.ok(!('max_output_tokens' in body));assert.equal(body.model,'chosen');
});
test('ChatGPT 更早的部分文本、[DONE]、incomplete 不能替代 response.completed',async()=>{
 const lines=(events:any[])=>new Response(events.map(e=>'data: '+(typeof e==='string'?e:JSON.stringify(e))+'\n\n').join(''),{headers:{'content-type':'text/event-stream'}});
 const delta={type:'response.output_text.delta',delta:'visible'};
 for(const events of [[delta],[delta,'[DONE]'],[delta,{type:'response.incomplete',response:{status:'incomplete',output:[]}}]]){
  const g=new ModelGateway(profile,async()=>lines(events));await assert.rejects(g.chat([{role:'user',content:'hello'}],{task:'story-writer'}),/未完成/);
 }
 const g=new ModelGateway(profile,async()=>lines([delta,{type:'response.completed',response:{status:'completed',output:[]}}]));
 assert.equal((await g.chat([{role:'user',content:'hello'}])).content,'visible');
 const limited=new ModelGateway(profile,async()=>lines([delta,{type:'response.failed',response:{error:{code:'subscription_sharing_usage_limit_exceeded',message:'Unavailable'}}}]));
 await assert.rejects(limited.chat([{role:'user',content:'hello'}]),/管理 ChatGPT 用量/);
});
