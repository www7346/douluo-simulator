import {validateGlobalPrompts,validateGlobalPromptPreset,globalPromptMessages,type GlobalPromptConfiguration} from './model-global-prompts';
import {modelRequestMessages,modelPromptText,promptMessage} from './model-prompt-templates';
import {modelAnalysisBoundaries,separateModelResponse,separateNovelResponse,normalizeNovelPromptStructure,isStoryAuthorTask} from './model-response-sections';
import {resolveTaskProfile,separateWriterProfile,taskChain,type ModelLibraryFields} from './model-library';
import {modelContextBudget} from '../shared/model-context';
import type {ModelRecoveryBudget} from './model-recovery-budget';
import {sanitizeDiagnostic} from '../shared/failure-diagnostics';
import {activeReplyTools,validateReplyTools,replyToolRound} from './model-reply-tools';
import {ModelProposalValidationError} from '../shared/model-proposal-validation-error';
import type {ModelJsonSchema} from '../shared/model-json-schema';
import type {ModelCandidateRecord} from '../shared/model-evidence';
import {checkModelPrompt,measureModelPrompt} from './model-prompt-check';
import {PROVIDER_BODY_COMPLETE,ModelStream,modelEndpoint,wireProtocol,protocolHeaders,protocolBody,wireResponseSchema,isArkService,normalizeReply,redactModel,validateConnection,validateHeaders,type ModelConnection,type PromptStructureOptions,type WireProtocol} from './model-protocol';
import {OPEN_CODE_GO,VERTEX_MODEL_CATALOG,vertexProject,providerForConnection} from '../shared/model-providers';
import type {ModelChannelSettings} from '../shared/chatgpt-plan';
import {creativeDescription} from './creative-description';
import { PROMPT_CATALOG, MODEL_PROMPT_VERSION} from './model-prompts';
import {isDeepSeek, checkModelTaskSettings, MODEL_TASKS,resolveModelSettings, type GenerationSettings, type RequestSettings, type TaskSettings} from './model-settings';
export interface ModelProfile extends RequestSettings,ModelLibraryFields,GlobalPromptConfiguration,ModelChannelSettings {transport?:'browser'|'server';id:string;label:string;baseUrl:string;apiKey:string;model:string;connection?:ModelConnection;credentialHeaders?:Record<string,string>;generation?:Partial<GenerationSettings>;taskOverrides?:Record<string,TaskSettings>;promptOverrides?:Record<string,string>;writer?:Omit<ModelProfile,'writer'|'apiKey'>&{apiKey?:string}}
export interface ModelListResult {models:string[];manualEntryRequired:boolean;message:string;protocols?:Record<string,WireProtocol>;displayNames?:Record<string,string>;source?:'published'}
export interface ChatMessage {role:'system'|'user'|'assistant'|'tool';content:string;name?:string;tool_call_id?:string;tool_calls?:any[];providerContent?:any[];reasoning_content?:string;promptTemplate?:import('./model-prompt-templates').PromptTemplate;presetExample?:true}
export interface ModelLog {id:string;at:string;label:string;status:string;detail:any}
export type ModelErrorKind='authentication'|'not-found'|'rate-limit'|'timeout'|'network-cors'|'invalid-json'|'invalid-response'|'server'|'cancelled'|'permission'|'quota'|'unsupported-parameter'|'provider-url'|'provider-dns'|'provider-tls'|'provider-connect'|'evaluation-limit'|'evaluation-ledger'|'model-recovery-record';
export class ModelGatewayError extends Error {
 unsupportedParameter?:string;readonly kind:ModelErrorKind;readonly status?:number;readonly retryable:boolean;readonly retryAfterMs?:number;
 constructor(kind:ModelErrorKind,message:string,options:{status?:number;retryable?:boolean;retryAfterMs?:number;cause?:unknown}={}){super(message,options.cause===undefined?undefined:{cause:options.cause});this.name='ModelGatewayError';this.kind=kind;this.status=options.status;this.retryable=options.retryable??false;this.retryAfterMs=options.retryAfterMs;}
}
export const MODEL_PRESETS=Object.freeze({deepseek:{label:'DeepSeek',baseUrl:'https://api.deepseek.com/v1'},openaiCompatible:{label:'自定义兼容服务',baseUrl:''}});
function statusError(response:Response,profile:ModelProfile,body=''){
 const status=response.status,raw=response.headers.get('retry-after'),seconds=Number(raw),parsed=raw?Math.max(0,Number.isFinite(seconds)?seconds*1000:Date.parse(raw)-Date.now()):undefined,retryAfterMs=Number.isFinite(parsed)?parsed:undefined;
 let message='',code='';try{const p=JSON.parse(body);const e=p.error??p;code=String(e.code??'');message=String(e.message??e.detail??e.code??'');}catch{message=/<(?:html|!doctype)/i.test(body)?'服务返回了网页或验证页面，请检查 API 地址及该站点的 API 访问设置':body;}
 if(profile.channelMode==='chatgpt'&&code==='subscription_sharing_usage_limit_exceeded')return new ModelGatewayError('quota','本次 ChatGPT 套餐额度已用尽，可在模型设置中打开“管理 ChatGPT 用量”。',{status,retryable:false});
 if(profile.channelMode==='chatgpt'&&code==='subscription_sharing_usage_unavailable')return new ModelGatewayError('permission','当前 ChatGPT 账号或工作区暂时无法使用套餐，请在模型设置中查看连接。',{status,retryable:false});
 message=redactModel(message,profile).replace(/https?:\/\/[^\s<>]+/g,'[服务地址]').slice(0,700);
 const suffix=message?'：'+message:'';
 let kind:ModelErrorKind='server',title=`模型服务拒绝了请求（${status}）`,retryable=status>=500;
 if(status===401){kind='authentication';title='认证失败，请检查凭证及所选模型权限';}
 if(status===403){kind='permission';title='该服务未授予本次访问权限';}
 if(status===402||/quota|balance|credit|usage limit|insufficient.*fund|额度|余额|套餐.*用尽/i.test(message)){kind='quota';title='模型服务额度不足或套餐限额已用尽';retryable=false;}
 // Without a provider cooldown, a fast generic retry only repeats the same
 // rejected request. Return control to the player instead of guessing a limit.
 else if(status===429){kind='rate-limit';title='模型服务限流，请稍后重试';retryable=retryAfterMs!==undefined;}
 if(status===404){kind='not-found';title='接口地址或模型不存在，请核对 API 地址与模型名';}
 const bad=message.match(/(?<![\w])(?:thinking|reasoning_effort|top_k|temperature|top_p|response_format|stream_options|stream)(?=[\s"':,).]|$)/i)?.[0]?.toLowerCase();
 if([400,422].includes(status)&&bad&&/unsupported|not supported|unknown|unrecognized|not permitted|不支持|未知参数/i.test(message)){kind='unsupported-parameter';title='该接口不支持所发送的可选参数';retryable=false;}
 const result=new ModelGatewayError(kind,title+suffix,{status,retryable,retryAfterMs});if(kind==='unsupported-parameter')result.unsupportedParameter=bad;return result;
}
function cancellation(signal:AbortSignal){return signal.reason instanceof ModelGatewayError?signal.reason:new ModelGatewayError('cancelled','模型请求已取消');}
function guarded<T>(promise:Promise<T>,signal:AbortSignal):Promise<T>{
 if(signal.aborted){void promise.catch(()=>{});return Promise.reject(cancellation(signal));}
 return new Promise((resolve,reject)=>{const abort=()=>reject(cancellation(signal));signal.addEventListener('abort',abort,{once:true});promise.then(value=>{signal.removeEventListener('abort',abort);signal.aborted?reject(cancellation(signal)):resolve(value);},error=>{signal.removeEventListener('abort',abort);reject(signal.aborted?cancellation(signal):error);});});
}
async function delay(ms:number,signal:AbortSignal){let timer:ReturnType<typeof setTimeout>|undefined;try{await guarded(new Promise<void>(resolve=>{timer=setTimeout(resolve,ms);}),signal);}finally{clearTimeout(timer);}}
function fingerprint(text:string){let hash=2166136261;for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619);return (hash>>>0).toString(16);}
function safeUsage(value:any){if(!value||typeof value!=='object')return undefined;const result:Record<string,any>={};for(const key of ['prompt_tokens','completion_tokens','total_tokens','prompt_cache_hit_tokens','prompt_cache_miss_tokens'])if(Number.isFinite(value[key]))result[key]=value[key];const thinking=value.completion_tokens_details?.reasoning_tokens;if(Number.isFinite(thinking))result.completion_tokens_details={reasoning_tokens:thinking};return result;}
interface Options {recoveryKind?:string;maxTokens?:number;signal?:AbortSignal;responseFormat?:'json_object';responseSchema?:ModelJsonSchema;thinking?:'disabled';probe?:boolean;repairFormat?:boolean;repairValidation?:boolean|((error:unknown)=>boolean);task?:string;listCursor?:{key:string;value:string};promptStructure?:PromptStructureOptions;recoveryBudget?:ModelRecoveryBudget;parseStructured?:(source:string)=>{value:unknown;normalizations?:string[]}}
function requestTask(messages:ChatMessage[],options:Options):string {
 return options.task??messages.find(message=>message.role==='user')?.content.match(/\[DOULUO_TASK:([^\]]+)\]/)?.[1]??'';
}

export class ModelGateway {
 readonly #profile:ModelProfile;readonly #fetch:typeof fetch;readonly #observe?:(log:ModelLog)=>void;
 readonly #writer?:ModelGateway;
 readonly #tasks=new Map<string,ModelGateway>();
 #route(task:string):ModelGateway|undefined{if(!this.#profile.modelLibrary)return undefined;let gateway=this.#tasks.get(task);if(!gateway){gateway=new ModelGateway(resolveTaskProfile(this.#profile,task),this.#fetch,this.#observe,this.candidateSink,this.recoveryBudget,()=>this.#route('format-repair')!);this.#tasks.set(task,gateway);}return gateway;}
 constructor(profile:ModelProfile,fetchImplementation:typeof fetch=fetch,observe?:(log:ModelLog)=>void,private readonly candidateSink?:(record:ModelCandidateRecord)=>void,readonly recoveryBudget?:ModelRecoveryBudget,private readonly formatRepairGateway?:()=>ModelGateway){validateGlobalPrompts(profile.globalPrompts);validateReplyTools(profile.replyTools);validateGlobalPromptPreset(profile.globalPromptPreset);validateConnection(profile.connection);validateHeaders(profile.credentialHeaders);this.#profile=structuredClone(profile);this.#fetch=(input,init)=>fetchImplementation(input,Object.hasOwn(init??{},'providerBrowserToken')?init:{...init,providerBrowserToken:profile.transport==='browser'?profile.apiKey:undefined} as RequestInit);this.#observe=observe;
  if(profile.writer){if(Object.hasOwn(profile.writer,'writer'))throw Error('作家连接不能嵌套其他连接');this.#writer=new ModelGateway(separateWriterProfile(profile)!,fetchImplementation,observe,candidateSink,recoveryBudget);}
 }
 identity(task=''):{model:string;service:string;connection:ModelConnection|undefined;purposeFingerprint?:string}{
  if(this.#profile.modelLibrary)return this.#route(task)!.identity(task);if(taskChain(task).includes('story-writer')&&this.#writer)return this.#writer.identity(task);
  const prompts=this.#profile.promptOverrides??{},globalPrompts=(['before','before-context','after'] as const).flatMap(position=>globalPromptMessages(this.#profile,position,task).map(message=>({...message,position})));
  const analysisBoundaries=modelAnalysisBoundaries(this.#profile,task),replyTools=activeReplyTools(this.#profile,task);
  return {model:this.#profile.model,service:fingerprint(this.#profile.baseUrl),connection:this.#profile.connection,purposeFingerprint:fingerprint(JSON.stringify(globalPrompts.length||replyTools.length?{prompts,globalPrompts,...(analysisBoundaries.length?{analysisBoundaries}:{}),...(replyTools.length?{replyTools}:{})}:prompts))};
 }
 settings(task=''){return resolveModelSettings(this.#profile,task);}
 hasPromptOverride(task:string):boolean{
  if(this.#profile.modelLibrary)return this.#route(task)!.hasPromptOverride(task);
  return Object.hasOwn(this.#profile.promptOverrides??{},task);
 }
 /** Validate configured task capabilities without a provider call or game mutation. */
 checkTaskSettings(task='',options:Pick<Options,'thinking'|'probe'>={}):ReturnType<typeof resolveModelSettings>{
  if(this.#profile.modelLibrary)return this.#route(task)!.checkTaskSettings(task,options);
  if(taskChain(task).includes('story-writer')&&this.#writer)return this.#writer.checkTaskSettings(task,options);
  try{return checkModelTaskSettings(this.#profile,task,options);}catch(error){throw new ModelGatewayError('invalid-response',(error as Error).message);}
 }
 checkContext(messages:ChatMessage[],options:{task:string;promptStructure?:PromptStructureOptions}):ReturnType<typeof modelContextBudget>{
  if(this.#profile.modelLibrary)return this.#route(options.task)!.checkContext(messages,options);
  if(taskChain(options.task).includes('story-writer')&&this.#writer)return this.#writer.checkContext(messages,options);
  const budget=measureModelPrompt(this.#profile,messages,options);
  if(budget.exceeded&&!isStoryAuthorTask(options.task))throw new ModelGatewayError('invalid-response',`当前内容按保守估算需约 ${budget.total} Token，超过设置的上下文容量 ${budget.capacity}；输入约 ${budget.estimatedInput}，输出预留 ${budget.outputReserve}。请提高容量或精简提示词`);
  return budget;
 }

 /** Compile the strict wire body locally; never send or expose its prompt text. */
 checkPrompt(messages:ChatMessage[],options:{task:string;promptStructure?:PromptStructureOptions;json?:boolean;responseSchema?:ModelJsonSchema}):ReturnType<typeof checkModelPrompt>{
  if(this.#profile.modelLibrary)return this.#route(options.task)!.checkPrompt(messages,options);
  if(taskChain(options.task).includes('story-writer')&&this.#writer)return this.#writer.checkPrompt(messages,options);
  if(!this.#profile.model.trim())throw new ModelGatewayError('invalid-response','请先选择或填写模型名');
  modelEndpoint(this.#profile.baseUrl,wireProtocol(this.#profile,this.settings(options.task).protocol),this.#profile.model);
  return checkModelPrompt(this.#profile,messages,options);
 }
 async listModels(signal?:AbortSignal):Promise<ModelListResult>{
  const models=new Set<string>(),seen=new Set<string>();let cursor:{key:string;value:string}|undefined;
  const protocols:Record<string,WireProtocol>=Object.create(null);
  const go=this.#profile.baseUrl.trim().replace(/\/+$/,'')===OPEN_CODE_GO;
  const vertex=vertexProject(this.#profile.baseUrl);
  const plan=this.#profile.channelMode==='chatgpt',names:Record<string,string>=Object.create(null);
  try{for(let page=0;page<10;page++){
   const payload:any=await this.#operate([],{listCursor:cursor},undefined,'/models',signal),entries=vertex?payload?.publisherModels:payload?.data??payload?.models;
   if(Array.isArray(entries))for(const item of entries){
    let id=String(item?.id??item?.name??'').replace(/^models\//,'').trim();
    if(plan){if(item?.visibility!=='list'||typeof item.slug!=='string')continue;id=item.slug;if(typeof item.display_name==='string')names[id]=item.display_name;}
    if(vertex){
     if(!/^publishers\/google\/models\/gemini-/.test(id)||/(?:embedding|image|audio|tts|live|robotics)/i.test(id))continue;
     id=id.replace(/^publishers\/google\/models\//,'google/').split('@')[0];
    }
    if(!id)continue;
    models.add(id);
    if(go&&item.api){
     // Read the protocol, never route credentials to a URL supplied by the list.
     if(item.api['chat-completions'])protocols[id]='compatible';
     else if(item.api.responses)protocols[id]='responses';
     else if(item.api.messages)protocols[id]='anthropic';
     else if(item.api['generate-content'])protocols[id]='gemini';
    }
    if(models.size>=5000)break;
   }
   cursor=payload.nextPageToken?{key:'pageToken',value:String(payload.nextPageToken)}:payload.has_more&&payload.last_id?{key:'after_id',value:String(payload.last_id)}:undefined;
   if(!cursor||seen.has(cursor.value)||models.size>=5000)break;seen.add(cursor.value);
  }}catch(e){
   if(!models.size){
    if(!(e instanceof ModelGatewayError&&(e.kind==='not-found'||e.status===405)))throw e;
    const published=providerForConnection(this.#profile.baseUrl)?.publishedModels;
    if(published)return {models:[...published],source:'published',manualEntryRequired:false,message:'渠道公开目录 · 具体可用模型取决于你的套餐。'};
   }
  }
  if(plan)return {models:[...models],displayNames:names,manualEntryRequired:false,message:models.size?'已获取当前 ChatGPT 账号的模型，请选择。':'此账号未返回可用模型，请检查套餐授权。'};
  return models.size?{models:[...models].sort(),...(Object.keys(protocols).length?{protocols}:{}),manualEntryRequired:false,message:`已获取 ${models.size} 个模型${cursor?'（列表可能未完整，可手动填写）':''}`}:{models:[],manualEntryRequired:true,message:'该服务不提供模型列表，请手动填写模型名'};
 }

 async testConnection(signal?:AbortSignal):Promise<{model:string;message:string}>{const deepseek=isDeepSeek(this.#profile.baseUrl,this.#profile.generation?.protocol);const response=await this.chat([promptMessage('connection-system'),promptMessage('connection-user','user')],{signal,probe:true,maxTokens:256,...(deepseek?{thinking:'disabled' as const}:{})});return {model:response.model??this.#profile.model,message:'接口连接成功；正式创作请继续验证生成'};}
 async testGeneration(task='martial-soul-advisor',signal?:AbortSignal){await this.structured([promptMessage('generation-test'),promptMessage('generation-test-user','user')],value=>{const v=value as any;if(!v||typeof v.name!=='string'||v.name.length<2||v.name.length>12||typeof v.description!=='string'||v.description.length<8||v.description.length>80||Object.keys(v).some(k=>!['name','description'].includes(k)))throw Error('生成测试没有返回完整的名称和介绍');return v;},{task,signal});return {message:'结构化生成验证通过；已验证所选用途的参数与完整答复，未遍历全部游戏功能'};}
 chat(messages:ChatMessage[],options:Options={}):Promise<any>{return this.#operate(messages,options);}
 structured<T>(messages:ChatMessage[],validate:(value:unknown)=>T,options:Options={}):Promise<T>{
  const task=requestTask(messages,options);
  return this.#operate(messages,{...options,responseFormat:'json_object'},value=>validate(creativeDescription(task,value)));
 }
 async #operate<T=any>(messages:ChatMessage[],options:Options,validate?:(value:unknown)=>T,path='/chat/completions',externalSignal=options.signal):Promise<T>{
  options={...options,recoveryBudget:options.recoveryBudget??this.recoveryBudget};
  const task=requestTask(messages,options);
  if(this.#profile.modelLibrary)return this.#route(task)!.#operate(messages,options,validate,path,externalSignal);
  if(taskChain(task).includes('story-writer')&&this.#writer)return this.#writer.#operate(messages,options,validate,path,externalSignal);
  const config=this.settings(task),deepseek=isDeepSeek(this.#profile.baseUrl,config.protocol);
  const controller=new AbortController(),signal=controller.signal,abort=()=>controller.abort(new ModelGatewayError('cancelled','模型请求已取消'));
  if(externalSignal?.aborted)abort();else externalSignal?.addEventListener('abort',abort,{once:true});
  const totalTimer=setTimeout(()=>controller.abort(new ModelGatewayError('timeout','本次请求已达到设置的总等待时限，输入仍保留')),config.timeoutMs);
  const id=crypto.randomUUID(),at=new Date().toISOString(),started=Date.now();let attempt=0,body:any=null;
  const label=path==='/models'?'获取模型列表':MODEL_TASKS.find(t=>t.id===task)?.label??PROMPT_CATALOG.find(entry=>entry.id===task)?.label??'连接测试',history:any[]=[];let current:any={},phase='准备请求';
  const report=(status:string)=>{phase=status;if(!this.#observe)return;let raw=JSON.stringify({task:task||null,model:this.#profile.model,promptVersion:MODEL_PROMPT_VERSION,promptFingerprint:fingerprint(JSON.stringify(body??null)),settings:config,...(options.recoveryBudget?{recovery:options.recoveryBudget.snapshot()}:{}),attempts:history,elapsedMs:Date.now()-started,page:typeof location==='undefined'?null:location.origin,pageBundle:typeof document==='undefined'?null:Array.from(document.scripts).map(s=>s.src).find(s=>s.includes('/assets/index-'))??null});raw=redactModel(raw,this.#profile);this.#observe({id,at,label,status,detail:JSON.parse(raw)});};
  try{
   if(path!=='/models'&&!this.#profile.model.trim())throw new ModelGatewayError('invalid-response','请先选择或填写模型名');
   const analysisBoundaries=path==='/models'?[]:modelAnalysisBoundaries(this.#profile,task);
   const structured=!!validate||!!options.responseFormat,author=!structured&&isStoryAuthorTask(task);
   options={...options,promptStructure:normalizeNovelPromptStructure(task,options.promptStructure,analysisBoundaries,structured)};
   let outgoing=path==='/models'?messages:modelRequestMessages(this.#profile,messages,task,options.promptStructure);
   const appendRepair=(repair:ChatMessage[])=>{const tail=globalPromptMessages(this.#profile,'after',task,options.promptStructure).length;outgoing.splice(outgoing.length-tail,0,...repair);};
   const thinking=options.thinking??config.thinking,thinkingActive=thinking==='enabled'||(deepseek&&thinking==='default');
   this.checkTaskSettings(task,options);
   const notes:string[]=[];if(deepseek&&config.topK!==null)notes.push('DeepSeek不支持Top-K，此项未发送');if(deepseek&&thinkingActive&&(config.temperature!==null||config.topP!==null))notes.push('思考模式下温度和Top-P不生效，已保留设置');if(!deepseek&&!isArkService(this.#profile.baseUrl)&&!this.#profile.connection?.extendedParameters&&thinking!=='default')notes.push('此接口未启用扩展参数，思考由服务默认配置决定');
   const maxTokens=options.probe?options.maxTokens!:this.#profile.taskOverrides?.[task]?.outputTokens??this.#profile.generation?.outputTokens??options.maxTokens??config.outputTokens!;let repaired=false,adapted=false,toolRounds=0,toolContinuation=false;const replyTools=activeReplyTools(this.#profile,task,structured);const omitted=new Set<string>();
   while(true){
    if(signal.aborted)throw cancellation(signal);
    body=path==='/models'?null:protocolBody(this.#profile,wireProtocol(this.#profile,config.protocol),outgoing,config,maxTokens,!!options.responseFormat,thinking,omitted,options.promptStructure,options.responseSchema,toolRounds?replyTools.map(t=>({...t,choice:'auto'})):replyTools);
    const schema=wireResponseSchema(body),budget=modelContextBudget([...outgoing,...(schema?[{content:JSON.stringify(schema)}]:[]),...(body?.tools?.length?[{content:JSON.stringify(body.tools)}]:[])],config.contextTokens,maxTokens,options.promptStructure?.prefill?.content),estimatedInput=budget.estimatedInput;
    if(path!=='/models'&&budget.exceeded&&!author)throw new ModelGatewayError('invalid-response',`当前内容按保守估算需约 ${budget.total} Token，超过设置的上下文容量 ${budget.capacity}；输入约 ${estimatedInput}，输出预留 ${budget.outputReserve}。请提高容量或精简提示词`);
    if(signal.aborted)throw cancellation(signal);
    if(attempt===0&&options.recoveryKind)options.recoveryBudget?.consume(options.recoveryKind);
    if(attempt>0&&!toolContinuation)options.recoveryBudget?.consume(current.errorKind==='invalid-json'||current.repairReason==='内容校验'?'format-recovery':'provider-retry');
    current={attempt:++attempt,kind:toolContinuation?'工具续接':repaired?'格式修复':'生成',notes,estimatedInput,contextCapacity:budget.capacity,outputReserve:budget.outputReserve,estimateMethod:budget.estimateMethod,startedAt:new Date().toISOString()};history.push(current);toolContinuation=false;report(attempt>1?'正在恢复':'正在连接');
    try{
     const payload=await this.#transport(path,body,config,signal,(stage,details)=>{Object.assign(current,details);if(stage!==phase)report(stage);},options.listCursor,partial=>this.candidateSink?.({callId:id,task:task||'generation',attempt,at:current.startedAt,elapsedMs:Date.now()-Date.parse(current.startedAt),content:partial.content,transportComplete:false,finishReason:partial.finish??null,usage:safeUsage(partial.usage)??null}),{task:task||'generation',callId:id,attempt});current.elapsedMs=Date.now()-Date.parse(current.startedAt);current.usage=safeUsage(payload?.usage);
     if(path==='/models'){report('已完成');return payload;}
     const choice=payload?.choices?.[0];let finish=choice?.finish_reason,content=choice?.message?.content;
     let tool:ReturnType<typeof replyToolRound>;try{tool=replyToolRound(choice,replyTools,wireProtocol(this.#profile,config.protocol));}catch(error){throw new ModelGatewayError('invalid-response',(error as Error).message);}
     if(tool){if(payload.transportComplete===false||!['stop','tool_calls'].includes(finish))throw new ModelGatewayError('invalid-response','文字工具答复没有完整结束，输入已保留，可以重试');current.replyTools=tool.names;current.replyToolRound=++toolRounds;if(toolRounds>2)throw new ModelGatewayError('invalid-response','预设工具未能在两次往返内返回正文，输入已保留，可以重试或切换模型');
      if(tool.text!==undefined){content=tool.text;finish='stop';}
      else{outgoing.push(...tool.messages);toolContinuation=true;report('预设工具已确认，等待正文');continue;}
     }current.finishReason=finish??null;if(options.promptStructure)current.contentCharacters=typeof content==='string'?content.length:0;else current.content=typeof content==='string'?content:'';
     if(typeof content==='string')this.candidateSink?.({callId:id,task:task||'generation',attempt,at:current.startedAt,elapsedMs:current.elapsedMs,content,transportComplete:payload.transportComplete!==false,finishReason:finish??null,usage:current.usage??null});
     if(!author){
      if(finish==='length')throw new ModelGatewayError('invalid-response','回复在完成前被截断。请提高输出上限，或降低思考级别后重试');
      if(finish==='content_filter')throw new ModelGatewayError('invalid-response','模型服务未提供这次答复，请调整构想后重试');
      if(finish==='insufficient_system_resource')throw new ModelGatewayError('server','模型服务暂时没有足够资源完成答复，请稍后重试',{retryable:true});
      if(finish&&finish!=='stop')throw new ModelGatewayError('invalid-response','模型没有正常完成文字答复，请检查所选模型及生成设置');
     }
     if(typeof content!=='string'||!content.trim())throw new ModelGatewayError('invalid-response',payload.reasoningSeen||choice?.message?.reasoning_content?'只收到了思考过程，没有收到最终答复。请提高输出上限或降低思考级别后重试':'模型服务没有返回可用的最终答复，请重试或检查模型设置');
     let separated:ReturnType<typeof separateModelResponse>;
     try{separated=(author?separateNovelResponse:separateModelResponse)(content,analysisBoundaries,options.promptStructure?.prefill?.content);}
     catch(error){throw new ModelGatewayError('invalid-response',(error as Error).message,{cause:error});}
     content=separated.content;
     if(author&&finish&&finish!=='stop')current.notes.push('已保存模型返回的可见正文；服务结束原因：'+finish);
     if(separated.analysisSections){current.analysisSections=separated.analysisSections;current.analysisCharacters=separated.analysisCharacters;if(!options.promptStructure)current.content=content;}
     if(signal.aborted)throw cancellation(signal);if(!validate){report('已收到答复');return {model:payload.model,content,...(separated.prefill===undefined?{}:{prefill:separated.prefill})} as T;}
     let value:unknown;try{const start=content.indexOf('{'),end=content.lastIndexOf('}');if(options.parseStructured){const parsed=options.parseStructured(start<0||end<=start?content:content.slice(start,end+1));value=parsed.value;current.notes.push(...parsed.normalizations??[]);}else{if(start<0||end<=start)throw Error();value=JSON.parse(content.slice(start,end+1));}}
     catch(error){current.errorKind='invalid-json';current.validation='格式不完整';current.errorDetails=sanitizeDiagnostic(error);if(!options.promptStructure&&config.repairFormat&&options.repairFormat!==false&&attempt<=config.retryCount){appendRepair([{role:'assistant',content,...(choice?.message?.providerContent?{providerContent:choice.message.providerContent}:{}),...(choice?.message?.reasoning_content?{reasoning_content:choice.message.reasoning_content}:{})},{role:'user',content:modelPromptText(this.#profile,'format-repair')}]);repaired=true;report('正在恢复');if(this.formatRepairGateway&&task!=='format-repair'){const result=await this.formatRepairGateway().#operate([...messages,{role:'assistant',content},{role:'user',content:modelPromptText(this.#profile,'format-repair')}],{...options,task:'format-repair',recoveryKind:'format-recovery',repairFormat:false,repairValidation:false},validate,path,signal);report('格式修复完成');return result;}continue;}throw new ModelGatewayError('invalid-json','这次答复格式不完整，输入仍保留，可以重试',{cause:error});}
     try{const result=validate(value);if(signal.aborted)throw cancellation(signal);current.validation='通过';report('校验通过');return result;}catch(e){
      if(signal.aborted)throw cancellation(signal);
      const reason=String((e as Error)?.message??'这份提案尚需调整，请继续讨论');
      Object.assign(current,{validation:'未通过',errorKind:'invalid-response',error:reason,errorDetails:sanitizeDiagnostic(e)});
      // Naming repair retains frozen facts and shares the existing retry limit.
      if(!options.promptStructure&&(typeof options.repairValidation==='function'?options.repairValidation(e):options.repairValidation)&&config.repairFormat&&options.repairFormat!==false&&attempt<=config.retryCount){
       const correction=`上一份答复未通过原协议校验：${reason}\n${modelPromptText(this.#profile,'validation-repair')}`+(e instanceof ModelProposalValidationError?'\n'+JSON.stringify({kind:'proposal-validation',context:e.correctionContext}):'');
       appendRepair([{role:'assistant',content,...(choice?.message?.providerContent?{providerContent:choice.message.providerContent}:{}),...(choice?.message?.reasoning_content?{reasoning_content:choice.message.reasoning_content}:{})},{role:'user',content:correction}]);
       repaired=true;current.repairReason='内容校验';report('正在恢复');if(this.formatRepairGateway&&task!=='format-repair'){const result=await this.formatRepairGateway().#operate([...messages,{role:'assistant',content},{role:'user',content:correction}],{...options,task:'format-repair',recoveryKind:'format-recovery',repairFormat:false,repairValidation:false},validate,path,signal);report('格式修复完成');return result;}continue;
      }
      throw new ModelGatewayError('invalid-response',reason,{cause:e});
     }
    }catch(error){const known=signal.aborted?cancellation(signal):error instanceof ModelGatewayError?error:new ModelGatewayError('network-cors','连接在完成前中断，请检查网络后重试',{retryable:true,cause:error});Object.assign(current,{errorKind:known.kind,error:known.message,errorDetails:sanitizeDiagnostic(known),httpStatus:known.status??current.httpStatus,elapsedMs:Date.now()-Date.parse(current.startedAt)});if(!options.promptStructure&&known.unsupportedParameter&&!adapted&&attempt<=config.retryCount){adapted=true;omitted.add(known.unsupportedParameter);notes.push('服务不支持 '+known.unsupportedParameter+'，本次移除后重试');continue;}if(!known.retryable||attempt>config.retryCount||signal.aborted)throw known;report('正在恢复');await delay(known.retryAfterMs??Math.min(30000,100*2**Math.min(attempt-1,8)),signal);}
   }
  }catch(e){current.errorKind=(e as any)?.kind??'invalid-response';current.error=String((e as Error).message);report((e as any)?.kind==='cancelled'?'已取消':'失败');throw e;}finally{clearTimeout(totalTimer);externalSignal?.removeEventListener('abort',abort);}
 }
 async #transport(path:string,body:any,config:ReturnType<typeof resolveModelSettings>,operation:AbortSignal,progress:(stage:string,details?:any)=>void,listCursor?:{key:string;value:string},interrupted?:(partial:ModelStream)=>void,providerRequest?:{task:string;callId:string;attempt:number}):Promise<any>{
  const controller=new AbortController(),signal=controller.signal,abort=()=>controller.abort(cancellation(operation));operation.addEventListener('abort',abort,{once:true});if(operation.aborted)abort();
  const started=Date.now();let timer:ReturnType<typeof setTimeout>|undefined,reader:ReadableStreamDefaultReader<Uint8Array>|undefined,received=false,partial:ModelStream|undefined;
  const arm=(ms:number,message:string)=>{clearTimeout(timer);timer=setTimeout(()=>controller.abort(new ModelGatewayError('timeout',message,{retryable:!received})),ms);};
  arm(config.firstByteTimeoutMs,'等待模型首包超时；服务可能仍在排队或思考，输入已保留');
  try{
   const wire=wireProtocol(this.#profile,config.protocol),url=modelEndpoint(this.#profile.baseUrl,wire,this.#profile.model,path==='/models',wire==='gemini'?(this.#profile.connection?.stream??true):!!body?.stream);
   if(path==='/models'&&vertexProject(this.#profile.baseUrl)){
    url.pathname=VERTEX_MODEL_CATALOG;
    url.searchParams.set('fields','nextPageToken,publisherModels(name)');
   }
   const headers=protocolHeaders(this.#profile,wire,url);
   if(listCursor)url.searchParams.set(listCursor.key,listCursor.value);
   const init:RequestInit & {providerConnectTimeoutMs:number;providerOnConnected:()=>void;providerRequest?:{task:string;callId:string;attempt:number}}={providerRequest,method:body?'POST':'GET',headers,...(body?{body:JSON.stringify(body)}:{}),signal,providerConnectTimeoutMs:config.connectTimeoutMs,providerOnConnected:()=>progress('等待模型答复',{connectMs:Date.now()-started})};
   const response=await guarded(this.#fetch(url.toString(),init),signal);progress('等待模型答复',{httpStatus:response.status,headersMs:Date.now()-started});
   if(!response.body)throw new ModelGatewayError('invalid-response','模型服务没有返回答复内容');
   reader=response.body.getReader();
   if(!response.ok){const decoder=new TextDecoder();let text='',bytes=0,firstErrorByte=false;while(bytes<16384){const part=await guarded(reader.read(),signal);if(part.done)break;if(part.value.length&&!firstErrorByte){firstErrorByte=true;progress('等待模型答复',{firstByteMs:Date.now()-started});}bytes+=part.value.length;text+=decoder.decode(part.value.slice(0,16384),{stream:true});}throw statusError(response,this.#profile,text);}
   const decoder=new TextDecoder(),streaming=response.headers.get('content-type')?.includes('text/event-stream'),acc=new ModelStream(wire);if(streaming)partial=acc;let buffer='',text='',bytes=0,event='',firstContentMs:number|undefined,lines:string[]=[];progress('等待模型答复',{streaming:!!streaming});
   if(this.#profile.channelMode==='chatgpt'&&body&&!streaming)throw new ModelGatewayError('invalid-response','ChatGPT 没有返回流式答复。');
   const flush=()=>{if(lines.length){const before=acc.content.length,thought=acc.reasoningSeen;try{acc.feed(lines.join('\n'),event);}catch(e){if((e as any).providerError){const cause=statusError(new Response('',{status:502}),this.#profile,JSON.stringify({error:(e as any).providerError}));throw new ModelGatewayError(cause.kind,cause.message,{status:cause.status});}throw new ModelGatewayError('invalid-json','收到的模型数据片段无法解析');}if(acc.reasoningSeen&&!thought)progress('正在构思',{firstReasoningMs:Date.now()-started});if(acc.content.length>before){const lastContentMs=Date.now()-started;firstContentMs??=lastContentMs;progress('正在接收',{firstContentMs,lastContentMs,contentCharacters:acc.content.length});}}lines=[];event='';};
   const consume=(chunk:string)=>{buffer+=chunk;let i;while((i=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,i).replace(/\r$/,'');buffer=buffer.slice(i+1);if(!line)flush();else if(line.startsWith('data:'))lines.push(line.slice(5).trimStart());else if(line.startsWith('event:'))event=line.slice(6).trim();}};
   while(!acc.done){const part=await guarded(reader.read(),signal);if(part.done)break;bytes+=part.value.length;if(bytes>8*1024*1024)throw new ModelGatewayError('invalid-response','模型答复超过接收上限');if(!received){received=true;progress('等待模型答复',{firstByteMs:Date.now()-started});}arm(config.idleTimeoutMs,'模型连续未返回新数据，输入已保留；再次生成可能重复计费');const decoded=decoder.decode(part.value,{stream:true});if(streaming)consume(decoded);else{text+=decoded;if(decoded.trim())progress('正在接收');}}
   if(signal.aborted)throw cancellation(signal);
   if(streaming){
    consume(decoder.decode()+'\n');flush();
    if(this.#profile.channelMode==='chatgpt'&&!acc.responseCompleted)throw new ModelGatewayError('invalid-response','ChatGPT 答复未完成，请重试。');
    const author=!!providerRequest&&isStoryAuthorTask(providerRequest.task),hasText=!!acc.content.trim();
    if(!acc.done&&!acc.terminal&&(!acc.finish||acc.finish==='stop')&&!(author&&hasText))throw new ModelGatewayError('network-cors','模型答复在传输中断开，输入已保留；再次生成可能重复计费');
    if(!acc.finish&&!(author&&hasText))throw new ModelGatewayError('invalid-response','模型答复缺少完成标记，输入仍保留');
    const reply={...acc.result(),transportComplete:!!(acc.done||acc.terminal)&&!!acc.finish};await reader.cancel(PROVIDER_BODY_COMPLETE);reader=undefined;return reply;
   }
   let value:any;try{value=JSON.parse(text+decoder.decode());}catch(error){throw new ModelGatewayError('invalid-json',/<(?:html|!doctype)/i.test(text)?'服务返回了网页或验证页面，请检查 API 地址':'模型服务返回了无法解析的数据',{cause:error});}
   if(value.error)throw statusError(new Response('',{status:400}),this.#profile,JSON.stringify(value));
   const reply=path==='/models'?value:normalizeReply(wire,value);await reader.cancel(PROVIDER_BODY_COMPLETE);reader=undefined;return reply;
  }catch(error){if(partial?.content&&this.#profile.channelMode!=='chatgpt')interrupted?.(partial);if(signal.aborted)throw cancellation(signal);if(error instanceof ModelGatewayError)throw error;if((error as any)?.code?.startsWith('provider-')||(error as any)?.code?.startsWith('evaluation-'))throw new ModelGatewayError((error as any).code,redactModel((error as Error).message,this.#profile),{cause:error});throw new ModelGatewayError('network-cors','无法完成模型连接，请检查服务地址及网络；已确定的输入仍保留',{retryable:!received,cause:error});}finally{clearTimeout(timer);operation.removeEventListener('abort',abort);if(reader)void reader.cancel().catch(()=>{});}
 }
}
