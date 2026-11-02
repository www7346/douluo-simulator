import type {ModelReplyTool} from './model-reply-tools';
import {modelPromptText} from './model-prompt-templates';
import type {ChatMessage,ModelProfile} from './model-gateway';
import {isDeepSeek,type GenerationSettings} from './model-settings';
import type {ModelJsonSchema} from '../shared/model-json-schema';
import {OPEN_CODE_GO} from '../shared/model-providers';
export {PROVIDER_PRESETS} from '../shared/model-providers';
/** Internal stream cleanup after the existing wire completion checks succeed. */
export const PROVIDER_BODY_COMPLETE=Symbol('provider-body-complete');

export type WireProtocol='compatible'|'responses'|'anthropic'|'gemini';
export function isArkService(baseUrl:string):boolean{try{return /^ark\.(?:cn-beijing|cn-shanghai)\.volces\.com$/i.test(new URL(baseUrl).hostname);}catch{return false;}}
export function wireResponseSchema(body:any):ModelJsonSchema|undefined{return body?.response_format?.json_schema?.schema??body?.text?.format?.schema??body?.generationConfig?.responseJsonSchema;}
export const PREFILL_MODES=['assistant-message','deepseek-prefix','compatible-assistant'] as const;
export type PrefillMode=typeof PREFILL_MODES[number];
export interface PromptStructureOptions {
 /** Story prompts must not silently change role, placement or append instruction messages. */
 strict:true;
 /** Also applies to registered global prefill modules when no imported prefix exists. */
 prefillMode?:PrefillMode;
 /** Explicit per-model choice; an ordinary assistant message is not a prefill declaration. */
 prefill?:{content:string;mode:PrefillMode};
}
export interface ModelConnection {
 auth?:'auto'|'bearer'|'x-api-key'|'x-goog-api-key'|'header'|'query'|'none';
 authName?:string;
 stream?:boolean;
 jsonMode?:'auto'|'prompt'|'native'|'schema';
 extendedParameters?:boolean;
}
const deniedHeader=/^(?:host|cookie|set-cookie|content-length|connection|transfer-encoding|proxy-.*|forwarded|x-forwarded-.*|x-real-ip|origin|referer|upgrade|te|trailer|expect|accept-encoding|x-douluo-.*|sec-.*)$/i;
export function validateHeaders(input:unknown):Record<string,string>{
 if(input===undefined)return {};
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('附加请求头需填写 JSON 对象');
 const entries=Object.entries(input);if(entries.length>16||JSON.stringify(input).length>8192)throw Error('附加请求头过多或过长');
 const result:Record<string,string>={};
 for(const [name,value] of entries){if(!/^[a-zA-Z0-9!#$%&'*+.^_`|~-]+$/.test(name)||deniedHeader.test(name)||typeof value!=='string'||/[\r\n\0]/.test(value))throw Error('附加请求头名称或内容无效，不能覆盖网络转发字段');result[name.toLowerCase()]=value;}
 return result;
}
export function validateConnection(input:ModelConnection={}):ModelConnection {
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('接口连接配置无效');
 if(input.auth!==undefined&&!['auto','bearer','x-api-key','x-goog-api-key','header','query','none'].includes(input.auth))throw Error('认证方式无效');
 if(input.jsonMode!==undefined&&!['auto','prompt','native','schema'].includes(input.jsonMode))throw Error('JSON 输出模式无效');
 for(const k of ['stream','extendedParameters'] as const)if(input[k]!==undefined&&typeof input[k]!=='boolean')throw Error('接口选项无效');
 if(input.authName!==undefined&&(typeof input.authName!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(input.authName)))throw Error('认证字段名无效');
 if(input.auth==='header')validateHeaders({[input.authName||'x-api-key']:''});
 return {auth:input.auth,authName:input.authName,stream:input.stream,jsonMode:input.jsonMode,extendedParameters:input.extendedParameters};
}
function parseModelUrl(base:string):URL {
 try{return new URL(base.trim());}catch{throw Error('请在设置的“模型与用途”中填写完整的模型服务地址，再重试当前任务');}
}
export function wireProtocol(profile:Pick<ModelProfile,'baseUrl'|'generation'|'channelMode'>&{model?:string},protocol=profile.generation?.protocol):WireProtocol {
 if(profile.channelMode==='chatgpt')return 'responses';
 if(protocol&&protocol!=='auto')return protocol==='deepseek'?'compatible':protocol;
 const u=parseModelUrl(profile.baseUrl);
 if(u.href.replace(/\/+$/,'')===OPEN_CODE_GO){
  const model=profile.model??'';
  if(/^(gpt-|grok-|muse-spark-)/.test(model))return 'responses';
  if(/^(claude-|qwen)/.test(model)||model==='minimax-m3')return 'anthropic';
  if(model.startsWith('gemini-'))return 'gemini';
 }
 if(/\/responses\/?$/.test(u.pathname))return 'responses';
 if(/\/messages\/?$/.test(u.pathname)||u.hostname==='api.anthropic.com')return 'anthropic';
 if(/:(?:streamGenerateContent|generateContent)$/.test(u.pathname)||(u.hostname==='generativelanguage.googleapis.com'&&!u.pathname.includes('/openai')))return 'gemini';
 return 'compatible';
}
export function modelEndpoint(base:string,wire:WireProtocol,model:string,list=false,stream=false):URL {
 const u=parseModelUrl(base);if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.hash)throw Error('请填写完整的模型接口地址，不包含登录信息或片段');
 let p=u.pathname.replace(/\/+$/,'').replace(/\/(?:chat\/completions|responses|messages|models)$/, '').replace(/\/models\/[^/]+:(?:streamGenerateContent|generateContent)$/,'');
 if(!list&&u.href.replace(/\/+$/,'')===OPEN_CODE_GO){
  const family=wire==='gemini'?'google/v1beta':wire==='anthropic'?'anthropic/v1':'openai/v1';
  p='/inference/go/'+family;
 }
 if(!p)p=wire==='gemini'?'/v1beta':'/v1';
 if(wire==='anthropic'&&!/\/v\d+(?:beta\d*)?$/.test(p))p+='/v1';
 u.pathname=p+(list?'/models':wire==='gemini'?'/models/'+encodeURIComponent(model.replace(/^models\//,''))+':'+(stream?'streamGenerateContent':'generateContent'):wire==='responses'?'/responses':wire==='anthropic'?'/messages':'/chat/completions');
 if(wire==='gemini'&&stream&&!list)u.searchParams.set('alt','sse');else if(u.searchParams.get('alt')==='sse')u.searchParams.delete('alt');
 return u;
}
export function credentialScope(base:string):string {try{const u=modelEndpoint(base,'compatible','',true);return u.origin+u.pathname+u.search;}catch{return base.trim();}}
export function rejectInlineCredentials(base:string){if(!base.trim())return;const u=new URL(base);if(u.username||u.password||[...u.searchParams.keys()].some(k=>/^(?:key|api[-_]?key|token|access_token|secret|authorization)$/i.test(k)))throw Error('请将密钥填入独立的密钥栏，并在高级连接中选择认证方式，不要把密钥写进 API 地址');}
export function redactModel(value:unknown,profile:Partial<ModelProfile>):string {
 let text=typeof value==='string'?value:JSON.stringify(value);
 if(profile.writer)text=redactModel(text,profile.writer);
 for(const model of profile.modelLibrary??[])text=redactModel(text,model);
 const secrets=[profile.apiKey,...Object.values(profile.credentialHeaders??{})].filter((v):v is string=>!!v);
 try{for(const [k,v] of new URL(profile.baseUrl??'').searchParams)if(/key|token|secret|auth/i.test(k))secrets.push(v);}catch{}
 for(const secret of secrets){for(const variant of [...new Set([JSON.stringify(secret).slice(1,-1),secret,encodeURIComponent(secret)])].sort((a,b)=>b.length-a.length))text=text.split(variant).join('[密钥已隐藏]');}
 return text.replace(/(?:Bearer\s+)[\w.\-]+/gi,'Bearer [密钥已隐藏]').replace(/(?:sk-|cat-)[A-Za-z0-9_-]{16,}/g,'[密钥已隐藏]');
}
export function protocolHeaders(profile:ModelProfile,wire:WireProtocol,url:URL):Record<string,string>{
 const c=validateConnection(profile.connection),headers:Record<string,string>={'content-type':'application/json',...validateHeaders(profile.credentialHeaders)};
 const auth=c.auth&&c.auth!=='auto'?c.auth:wire==='anthropic'?'x-api-key':wire==='gemini'?'x-goog-api-key':'bearer';
 if(wire==='anthropic')headers['anthropic-version']??='2023-06-01';
 if(profile.apiKey&&(profile.transport!=='browser'||typeof window!=='undefined')){if(auth==='query')url.searchParams.set(c.authName||'key',profile.apiKey);else if(auth!=='none')headers[auth==='bearer'?'authorization':auth==='header'?(c.authName||'x-api-key').toLowerCase():auth]=auth==='bearer'?'Bearer '+profile.apiKey:profile.apiKey;}
 return headers;
}
/** Native generateContent parameters, not compatibility-endpoint extensions.
 * https://ai.google.dev/gemini-api/docs/generate-content/thinking
 * https://ai.google.dev/gemini-api/docs/openai#thinking */
function geminiThinkingConfig(model:string,thinking:GenerationSettings['thinking'],effort:GenerationSettings['reasoningEffort']){
 if(thinking==='default'&&effort==='default')return undefined;
 const name=model.replace(/^models\//,'').replace(/^(?:gcli|agy|pg)-(?:抗截断-)?/,'');
 const textModel=!/(?:image|audio|live|robotics)/i.test(name);
 const third=textModel&&/^gemini-3(?:\.\d+)?-(?:pro|flash)(?:-|$)/.test(name);
 const fourth=textModel&&/^gemini-4(?:[.-]|$)/.test(name);
 const second=textModel&&/^gemini-2\.5-(?:pro|flash)(?:-|$)/.test(name);
 if(!third&&!fourth&&!second)throw Error('无法按当前模型名称确定 Gemini 原生思考参数；请将思考和强度都设为跟随默认，或使用服务明确支持的模型名称');
 const pro=/-pro(?:-|$)/.test(name);
 if(thinking==='disabled'){
  if(third||fourth||pro)throw Error('当前 Gemini 模型不能完全关闭思考；请将思考设为跟随默认或启用，并选择低思考级别');
  return {thinkingBudget:0};
 }
 if(third||fourth){
  if(effort==='max'||(effort==='medium'&&/^gemini-3-pro(?:-|$)/.test(name)))throw Error('当前 Gemini 原生模型不支持该思考级别，请选择低、高或模型支持的中等级别');
  return effort==='default'?undefined:{thinkingLevel:effort};
 }
 if(effort==='default')return thinking==='enabled'?{thinkingBudget:-1}:undefined;
 return {thinkingBudget:{low:1024,medium:8192,high:24576,max:pro?32768:24576}[effort]};
}

export function protocolBody(profile:ModelProfile,wire:WireProtocol,messages:ChatMessage[],config:GenerationSettings,maxTokens:number,json:boolean,thinking=config.thinking,omit=new Set<string>(),structure?:PromptStructureOptions,responseSchema?:ModelJsonSchema,replyTools:ModelReplyTool[]=[]):any {
 const c=profile.connection??{},deepseek=isDeepSeek(profile.baseUrl,config.protocol);
 const ark=isArkService(profile.baseUrl);
 const extended=deepseek||ark||c.extendedParameters===true;
 const stream=c.stream??true;
 const sampling=(!deepseek||thinking==='disabled')?{...(config.temperature===null?{}:{temperature:config.temperature}),...(config.topP===null?{}:{top_p:config.topP})}:{};
 const outgoing=messages.map(({presetExample,...message})=>message);
 if(structure?.strict){
  if(wire==='anthropic'||wire==='gemini'){
   let historyStarted=false;
   for(const message of messages){
    // Gemini takes its instructions in a separate field. Bundled examples at
    // the start retain their user/model roles in contents before actual play.
    if(message.role==='system'){
     if(historyStarted)throw Error('当前接口不能保留历史中间或末尾的 system 注入位置，请调整模块位置或选择支持此结构的接口');
    }else if(wire!=='gemini'||!message.presetExample){
     historyStarted=true;
    }
   }
  }
  if(json&&!outgoing.some(m=>/JSON/i.test(m.content)))throw Error('结构化请求需要在已编排的消息中明确 JSON 要求，不能额外追加消息改变注入结构');
  if(wire==='anthropic'&&outgoing.at(-1)?.role==='assistant')throw Error('当前接口会把末尾 assistant 当作续写，请明确配置预填充或调整完整历史消息的位置');
 }
 if(structure?.prefill){
  const p=structure.prefill;
  if(json||typeof p.content!=='string'||!p.content.length)throw Error('预填充需要非空正文，不能与结构化 JSON 请求混用');
  if(p.mode==='deepseek-prefix'){
   if(wire!=='compatible'||!deepseek)throw Error('当前接口未配置 DeepSeek prefix 预填充');
   const endpoint=modelEndpoint(profile.baseUrl,wire,profile.model);
   if(endpoint.hostname==='api.deepseek.com'&&endpoint.pathname!=='/beta/chat/completions')throw Error('DeepSeek 预填充需要显式配置 /beta 接口地址');
   outgoing.push({role:'assistant',content:p.content,prefix:true} as ChatMessage);
  }else if(p.mode==='compatible-assistant'){
   if(wire!=='compatible'||deepseek)throw Error('兼容接口末尾 Assistant 续写需使用支持该功能的 Chat Completions 接口；DeepSeek 请明确选择 prefix 方式');
   outgoing.push({role:'assistant',content:p.content});
  }else if(p.mode==='assistant-message'){
   if(wire!=='anthropic'||thinking!=='disabled')throw Error('assistant 续写只适用于明确支持该功能且关闭思考的 Anthropic 接口模型');
   outgoing.push({role:'assistant',content:p.content});
  }else throw Error('预填充方式无法识别');
 }
 if(json&&!outgoing.some(m=>/JSON/i.test(m.content)))outgoing.push({role:'user',content:modelPromptText(profile,'json-output')});
 const nativeJson=json&&c.jsonMode!=='prompt'&&(c.jsonMode==='native'||c.jsonMode==='schema'||deepseek||ark||wire==='gemini');
 const strictSchema=nativeJson&&responseSchema&&(c.jsonMode==='schema'||ark);
 if(strictSchema&&wire==='anthropic')throw Error('当前协议未接入严格结构输出，请选择通过提示词或接口原生JSON');
 const responseFormat=strictSchema?{type:'json_schema',json_schema:{name:'response',strict:true,schema:responseSchema}}:{type:'json_object'};
 let body:any;
 if(wire==='compatible')body={model:profile.model,messages:outgoing,max_tokens:maxTokens,stream,...(extended?sampling:{}),...(extended&&config.topK!==null&&!deepseek&&!ark?{top_k:config.topK}:{}),...(extended&&thinking!=='default'&&!/kimi-k3/i.test(profile.model)?{thinking:{type:thinking}}:{}),...(extended&&!ark&&thinking!=='disabled'&&config.reasoningEffort!=='default'?{reasoning_effort:config.reasoningEffort}:{}),...(deepseek&&stream?{stream_options:{include_usage:true}}:{}),...(nativeJson?{response_format:responseFormat}:{})};
 else if(wire==='responses')body={model:profile.model,input:outgoing,max_output_tokens:maxTokens,stream,store:false,...(c.extendedParameters?sampling:{}),...(c.extendedParameters&&thinking==='enabled'&&config.reasoningEffort!=='default'?{reasoning:{effort:config.reasoningEffort}}:{}),...(nativeJson?{text:{format:strictSchema?{type:'json_schema',name:'response',strict:true,schema:responseSchema}:{type:'json_object'}}}:{})};
 else if(wire==='anthropic'){
  const system=outgoing.filter(m=>m.role==='system').map(m=>m.content).join('\n');
  const turns:Array<{role:string;content:any[]}>=[];
  for(const m of outgoing.filter(m=>m.role!=='system')){const content=(m as any).providerContent??[{type:'text',text:m.content}];if(turns.at(-1)?.role===m.role)turns.at(-1)!.content.push(...content);else turns.push({role:m.role,content});}
  body={model:profile.model,system,messages:turns,max_tokens:maxTokens,stream,...(c.extendedParameters&&thinking!=='enabled'?sampling:{}),...(c.extendedParameters&&thinking==='enabled'&&maxTokens>1024?{thinking:{type:'enabled',budget_tokens:Math.min(4096,maxTokens-1)}}:{})};
 }else{
  const thinkingConfig=c.extendedParameters?geminiThinkingConfig(profile.model,thinking,config.reasoningEffort):undefined;
  body={systemInstruction:{parts:outgoing.filter(m=>m.role==='system').map(m=>({text:m.content}))},contents:outgoing.filter(m=>m.role!=='system').map(m=>({role:m.role==='assistant'?'model':'user',parts:m.providerContent??(m.role==='tool'?[{functionResponse:{name:m.name,response:JSON.parse(m.content)}}]:[{text:m.content}])})),generationConfig:{maxOutputTokens:maxTokens,...(config.temperature===null?{}:{temperature:config.temperature}),...(config.topP===null?{}:{topP:config.topP}),...(config.topK===null?{}:{topK:config.topK}),...(nativeJson?{responseMimeType:'application/json',...(strictSchema?{responseJsonSchema:responseSchema}:{})}:{}),...(thinkingConfig?{thinkingConfig}:{})}};
  if(!body.systemInstruction.parts.length)delete body.systemInstruction;
 }
 if(profile.channelMode==='chatgpt'){
  body={model:profile.model,stream:true,store:false,input:outgoing.flatMap((m):any[]=>{
   if(m.role==='tool')return [{type:'function_call_output',call_id:m.tool_call_id,output:m.content}];
   const message={role:m.role==='system'?'developer':m.role,content:m.content};
   return [...(m.content?[message]:[]),...(m.role==='assistant'?m.providerContent??[]:[])];
  }),...(body.text?{text:body.text}:{}),...(body.reasoning?{reasoning:body.reasoning}:{})};
 }
 if(replyTools.length){
  const required=replyTools.some(t=>t.choice==='required');
  if(wire==='compatible'){body.tools=replyTools.map(t=>({type:'function',function:{name:t.name,description:t.description,parameters:t.parameters}}));body.tool_choice=required?{type:'function',function:{name:replyTools.find(t=>t.choice==='required')!.name}}:'auto';}
  else if(wire==='gemini'){body.tools=[{functionDeclarations:replyTools.map(t=>({name:t.name,description:t.description,parameters:t.parameters}))}];body.toolConfig={functionCallingConfig:{mode:required?'ANY':'AUTO',...(required?{allowedFunctionNames:replyTools.filter(t=>t.choice==='required').map(t=>t.name)}:{})}};}
  else if(wire==='responses'&&profile.channelMode==='chatgpt'){
   const offered=required?replyTools.filter(t=>t.choice==='required'):replyTools;
   body.tools=[{type:'namespace',name:'game',description:'游戏文字回复工具',tools:offered.map(t=>({type:'function',name:t.name,description:t.description,parameters:t.parameters,strict:false}))}];
   body.tool_choice=required?'required':'auto';body.include=['reasoning.encrypted_content'];
  }else throw Error('当前预设工具需要兼容接口或Gemini原生接口');
 }
 for(const key of omit)delete body[key];
 return body;
}
const texts=(content:any)=>typeof content==='string'?content:Array.isArray(content)?content.filter(p=>p.type==='text'||p.type==='output_text'||(!p.type&&typeof p.text==='string'&&!p.thought)).map(p=>p.text??'').join(''):'';
const finish=(reason:string|undefined)=>({end_turn:'stop',stop_sequence:'stop',STOP:'stop',MAX_TOKENS:'length',max_tokens:'length',SAFETY:'content_filter',RECITATION:'content_filter',BLOCKLIST:'content_filter',PROHIBITED_CONTENT:'content_filter'} as Record<string,string>)[reason??'']??reason;
export function normalizeReply(wire:WireProtocol,p:any):any {
 if(wire==='compatible')return {...p,choices:p.choices?.map((c:any)=>({...c,message:{...c.message,content:texts(c.message?.content)}}))};
 let content='',reason:any,providerContent:any,reasoningSeen=false;
 if(wire==='anthropic'){content=texts(p.content);reason=finish(p.stop_reason);providerContent=p.content;reasoningSeen=p.content?.some((x:any)=>x.type==='thinking');}
 else if(wire==='responses'){content=texts(p.output?.filter((x:any)=>x.type==='message').flatMap((x:any)=>x.content??[]));reason=p.status==='completed'?'stop':p.status==='incomplete'?(p.incomplete_details?.reason==='max_output_tokens'?'length':'content_filter'):'invalid';reasoningSeen=p.output?.some((x:any)=>x.type==='reasoning');}
 else{const c=p.candidates?.[0];providerContent=c?.content?.parts;content=texts(providerContent);reason=finish(c?.finishReason??(p.promptFeedback?.blockReason?'SAFETY':undefined));reasoningSeen=providerContent?.some((x:any)=>x.thought);}
 const u=p.usage??p.usageMetadata;
 const nativeThinking=wire==='gemini'&&Number.isFinite(u?.thoughtsTokenCount)?u.thoughtsTokenCount:undefined;
 const completion=u?.output_tokens??u?.candidatesTokenCount;
 return {model:p.model??p.modelVersion,choices:[{finish_reason:reason,message:{content,providerContent}}],usage:u?{prompt_tokens:u.input_tokens??u.promptTokenCount,completion_tokens:Number.isFinite(completion)?completion+(nativeThinking??0):undefined,total_tokens:u.total_tokens??u.totalTokenCount,...(nativeThinking!==undefined?{completion_tokens_details:{reasoning_tokens:nativeThinking}}:{}),...(wire==='gemini'&&Number.isFinite(u.cachedContentTokenCount)?{prompt_cache_hit_tokens:u.cachedContentTokenCount}:{})}:undefined,reasoningSeen};
}

/** The accumulator stores private reasoning only for protocol-required repair turns, never diagnostics. */
export class ModelStream {
 responseCompleted=false;
 toolCalls:any[]=[];
 content=''; reasoning='';reasoningSeen=false;done=false;terminal=false;finish:any;usage:any;model:any;providerContent:any[]=[];events=0;
 constructor(readonly wire:WireProtocol){}
 feed(data:string,event=''){
  if(data==='[DONE]'){this.done=true;return;}
  const p=JSON.parse(data);this.events++;
  if(p.error||event==='error'||p.type==='error')throw Object.assign(Error('上游在生成过程中返回错误'),{providerError:p.error??p});
  if(this.wire==='compatible'){const c=p.choices?.[0],d=c?.delta;this.content+=texts(d?.content);for(const call of d?.tool_calls??[]){const i=call.index??0;if(!Number.isInteger(i)||i<0||i>3)throw Error('文字工具片段编号无效');const row=this.toolCalls[i]??={id:'',type:'function',function:{name:'',arguments:''}};for(const[k,v]of Object.entries(call))if(!['index','function'].includes(k))row[k]=v;if(call.function?.name&&row.function.name!==call.function.name)row.function.name+=call.function.name;if(call.function?.arguments)row.function.arguments+=call.function.arguments;}if(d?.reasoning_content){this.reasoning+=d.reasoning_content;this.reasoningSeen=true;}if(c?.finish_reason){this.finish=finish(c.finish_reason);this.terminal=true;}this.usage=p.usage??this.usage;this.model=p.model??this.model;}
  else if(this.wire==='anthropic'){
   if(p.type==='message_start'){this.model=p.message?.model;this.usage=p.message?.usage;}
   if(p.type==='content_block_start'){this.providerContent[p.index]={...p.content_block};this.content+=texts([p.content_block]);if(p.content_block?.type==='thinking')this.reasoningSeen=true;}
   if(p.type==='content_block_delta'){const d=p.delta??{},b=this.providerContent[p.index]??={type:'text',text:''};if(d.text){this.content+=d.text;b.text=(b.text??'')+d.text;}if(d.thinking){this.reasoningSeen=true;b.thinking=(b.thinking??'')+d.thinking;}if(d.signature)b.signature=(b.signature??'')+d.signature;}
   if(p.type==='message_delta'){this.finish=finish(p.delta?.stop_reason);this.usage={...this.usage,...p.usage};}
   if(p.type==='message_stop'){this.done=true;this.terminal=true;}
  }else if(this.wire==='responses'){
   if(p.type==='response.output_text.delta')this.content+=p.delta??'';
   if(p.type?.includes('reasoning'))this.reasoningSeen=true;
   if(p.type==='response.failed')throw Object.assign(Error('模型生成失败'),{providerError:p.response?.error??{message:'response.failed'}});
   if(['response.completed','response.incomplete'].includes(p.type)){
    const n=normalizeReply('responses',p.response);this.content=n.choices[0].message.content||this.content;this.finish=n.choices[0].finish_reason;this.usage=n.usage;this.model=n.model;this.done=true;this.terminal=true;
    this.responseCompleted=p.type==='response.completed'&&p.response?.status==='completed';
    this.providerContent=(p.response?.output??[]).filter((item:any)=>['reasoning','function_call'].includes(item.type));
    this.toolCalls=this.providerContent.filter((item:any)=>item.type==='function_call').map((item:any)=>({id:item.call_id,type:'function',function:{name:item.name,arguments:item.arguments}}));
   }
  }else{const n=normalizeReply('gemini',p);this.content+=n.choices[0].message.content;this.reasoningSeen||=n.reasoningSeen;this.providerContent.push(...(n.choices[0].message.providerContent??[]));if(n.choices[0].finish_reason){this.finish=n.choices[0].finish_reason;this.terminal=true;}this.usage=n.usage??this.usage;this.model=n.model??this.model;}
 }
 result(){return {model:this.model,choices:[{finish_reason:this.finish,message:{content:this.content,...(this.toolCalls.length?{tool_calls:this.toolCalls.filter(Boolean)}:{}),...(this.reasoning?{reasoning_content:this.reasoning}:{}),...(this.providerContent.length?{providerContent:this.providerContent}:{})}}],usage:this.usage,reasoningSeen:this.reasoningSeen};}
}
