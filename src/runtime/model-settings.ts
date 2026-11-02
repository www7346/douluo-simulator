import {resolveTaskProfile,taskChain,type ModelLibraryFields} from './model-library';
import {PROMPT_CATALOG} from './model-prompts';
import {RETIRED_PROMPT_IDS} from './retired-model-config';

export interface GenerationSettings {
  protocol: 'auto' | 'compatible' | 'deepseek' | 'responses' | 'anthropic' | 'gemini';
  thinking: 'default' | 'enabled' | 'disabled';
  reasoningEffort: 'default' | 'low' | 'medium' | 'high' | 'max';
  temperature: number | null;
  topP: number | null;
  topK: number | null;
  contextTokens: number;
  outputTokens: number | null;
}
export const DEFAULT_GENERATION: GenerationSettings = {protocol:'auto',thinking:'disabled',reasoningEffort:'low',temperature:0.4,topP:null,topK:null,contextTokens:200000,outputTokens:8192};
export interface RequestSettings {timeoutMs?:number;connectTimeoutMs?:number;firstByteTimeoutMs?:number;waitMode?:'standard'|'long';idleTimeoutMs?:number;retryCount?:number;repairFormat?:boolean}
export type TaskSettings = Partial<GenerationSettings> & RequestSettings & {stream?:boolean};
export const MODEL_TASKS = [
 {id:'character-profile',label:'人物小传、性格与目标',thinking:'disabled',outputTokens:4096,timeoutMs:600000},
 {id:'person-rewrite',label:'人物认知改造',thinking:'disabled',outputTokens:8192,timeoutMs:600000},
 {id:'person-change-reaction',label:'人物对变化的回应',thinking:'disabled',outputTokens:4096,timeoutMs:600000},
 {id:'ability-narrative',label:'新增能力命名',thinking:'disabled',outputTokens:8192,timeoutMs:600000},
 {id:'story-rewrite',label:'小说重写',thinking:'disabled',outputTokens:8192,timeoutMs:600000},
 {id:'npc-autonomy',label:'NPC自主行动',thinking:'disabled',outputTokens:8192,timeoutMs:600000},
 {id:'npc-belief',label:'NPC消息可信度',thinking:'disabled',outputTokens:8192,timeoutMs:600000},
 {id:'stage-summary',label:'阶段记忆提取',thinking:'disabled',outputTokens:8192,timeoutMs:600000},
 {id:'memory-selection',label:'阶段记忆筛选',thinking:'disabled',outputTokens:8192,timeoutMs:600000},
 {id:'format-repair',label:'答复格式修复',thinking:'disabled',outputTokens:8192,timeoutMs:600000},

 {id:'private-chat',label:'私聊：怎么说',thinking:'disabled',outputTokens:2048,timeoutMs:600000},
 {id:'party-chat',label:'队伍群聊',thinking:'disabled',outputTokens:4096,timeoutMs:600000},
 {id:'creation-advisor',label:'角色创建顾问',thinking:'disabled',outputTokens:4096,timeoutMs:600000},
 {id:'creation-item-advisor',label:'开局道具主持人',thinking:'enabled',outputTokens:8192,timeoutMs:600000},
 {id:'story-summary',label:'故事记忆整理',thinking:'disabled',outputTokens:4096,timeoutMs:600000},
 {id:'story-host',label:'故事行动裁定',thinking:'enabled',reasoningEffort:'low',outputTokens:8192,timeoutMs:600000},
 {id:'story-social',label:'人物回应与判断',thinking:'disabled',outputTokens:2048,timeoutMs:600000},
 {id:'story-writer',label:'故事正文',thinking:'disabled',outputTokens:8192,timeoutMs:600000},
 {id:'ring-item-narrative',label:'魂环物品与来源',thinking:'disabled',outputTokens:2048,timeoutMs:600000},
 {id:'martial-soul-advisor',label:'武魂创作顾问',thinking:'enabled',outputTokens:16384,timeoutMs:600000},
 {id:'expedition-narrative',label:'副本与魂兽命名',thinking:'disabled',outputTokens:8192,timeoutMs:600000},
 {id:'ring-skill-narrative',label:'魂环与魂技命名',thinking:'disabled',outputTokens:8192,timeoutMs:600000},
 {id:'ring-design-advisor',label:'魂环与魂技设计',thinking:'enabled',outputTokens:8192,timeoutMs:600000},
 {id:'research-narrative',label:'制作命名',thinking:'disabled',outputTokens:8192,timeoutMs:600000},
 {id:'title-narrative',label:'封号与诗号',thinking:'disabled',outputTokens:2048,timeoutMs:600000},
 {id:'combat-intent',label:'对手战术',thinking:'disabled',outputTokens:4096,timeoutMs:20000},
] as const;
export const DEFAULT_REQUEST = {timeoutMs:600000,connectTimeoutMs:30000,firstByteTimeoutMs:180000,idleTimeoutMs:180000,retryCount:1,repairFormat:true};
export function validateRequest(input:RequestSettings):void {
 if(input.waitMode!==undefined&&!['standard','long'].includes(input.waitMode))throw new Error('等待档位无效');
 for(const key of ['timeoutMs','connectTimeoutMs','firstByteTimeoutMs','idleTimeoutMs'] as const){const value=input[key];if(value!==undefined&&(!Number.isInteger(value)||value<1||value>2147483647))throw new Error('等待时限需为正数，且不超过浏览器计时器支持的范围');}
 if(input.retryCount!==undefined&&(!Number.isSafeInteger(input.retryCount)||input.retryCount<0))throw new Error('重试次数需为零或正整数');
 if(input.repairFormat!==undefined&&typeof input.repairFormat!=='boolean')throw new Error('请选择是否修复答复格式');
}
export interface ModelSettingsProfile extends RequestSettings,ModelLibraryFields {generation?:Partial<GenerationSettings>;taskOverrides?:Record<string,TaskSettings>;writer?:Omit<ModelSettingsProfile,'writer'>}
export function resolveModelSettings(profile:ModelSettingsProfile,task=''):GenerationSettings & typeof DEFAULT_REQUEST {
 if(profile.modelLibrary)return resolveModelSettings(resolveTaskProfile(profile as any,task),task);
 if(taskChain(task).includes('story-writer')&&profile.writer)return resolveModelSettings(profile.writer,task);
 const preset=MODEL_TASKS.find(item=>item.id===taskChain(task)[0]);
 const override=Object.assign({},...taskChain(task).map(id=>profile.taskOverrides?.[id]??{})) as TaskSettings;
 const defined=(value:object)=>Object.fromEntries(Object.entries(value).filter(([,v])=>v!==undefined));
 const generation=validateGeneration({...DEFAULT_GENERATION,...(preset?{thinking:preset.thinking,outputTokens:preset.outputTokens,...('reasoningEffort' in preset?{reasoningEffort:preset.reasoningEffort}:{})}:{}),...defined(profile.generation??{}),...defined(override)});
 if(generation.outputTokens===null)generation.outputTokens=preset?.outputTokens??DEFAULT_GENERATION.outputTokens;
 const waitMode=override.waitMode??profile.waitMode??'standard';
 const request={...DEFAULT_REQUEST,...(preset?{timeoutMs:preset.timeoutMs}:{}),...(waitMode==='long'&&task!=='combat-intent'?{timeoutMs:1200000,firstByteTimeoutMs:600000,idleTimeoutMs:300000}:{}),...Object.fromEntries(Object.keys(DEFAULT_REQUEST).filter(k=>(profile as any)[k]!==undefined).map(k=>[k,(profile as any)[k]])),...Object.fromEntries(Object.keys(DEFAULT_REQUEST).filter(k=>(override as any)[k]!==undefined).map(k=>[k,(override as any)[k]]))};
 if(task==='combat-intent')request.timeoutMs=Math.min(request.timeoutMs,20000);
 validateRequest(request);return {...generation,...request};
}
export function isDeepSeek(baseUrl:string, protocol:GenerationSettings['protocol']='auto'):boolean {
  if (protocol === 'deepseek') return true;
  if (protocol !== 'auto') return false;
  try {return new URL(baseUrl).hostname === 'api.deepseek.com';} catch {return false;}
}
export function validateGeneration(input:Partial<GenerationSettings> = {}):GenerationSettings {
  const result = Object.fromEntries(Object.keys(DEFAULT_GENERATION).map(key=>[key,(input as any)[key]===undefined?(DEFAULT_GENERATION as any)[key]:(input as any)[key]])) as unknown as GenerationSettings;
  if (!['auto','compatible','deepseek','responses','anthropic','gemini'].includes(result.protocol) || !['default','enabled','disabled'].includes(result.thinking) || !['default','low','medium','high','max'].includes(result.reasoningEffort)) throw new Error('请选择有效的模型参数选项');
  const ranges = {temperature:[0,2],topP:[0,1],topK:[1,Number.MAX_SAFE_INTEGER],contextTokens:[1,Number.MAX_SAFE_INTEGER],outputTokens:[1,Number.MAX_SAFE_INTEGER]} as const;
  for (const [key,range] of Object.entries(ranges)) {
    const value=result[key as keyof typeof ranges];
    if(value===null && key!=='contextTokens') continue;
    if(typeof value!=='number'||!Number.isFinite(value)||value<range[0]||value>range[1]||(['topK','contextTokens','outputTokens'].includes(key)&&!Number.isInteger(value))) throw new Error('模型参数超出允许范围，请检查数字输入');
  }
  if (result.outputTokens !== null && result.outputTokens >= result.contextTokens) throw new Error('输出上限必须小于上下文容量');
  return result;
}
export function validatePrompts(input:Record<string,string> = {}):Record<string,string> {
  const result:Record<string,string>={};
  for(const id of RETIRED_PROMPT_IDS)if(Object.hasOwn(input,id)){
    if(typeof input[id]!=='string'||input[id].length>24000)throw Error('已停用用途的提示词不能超过24000字');
    result[id]=input[id];
  }
  for(const entry of PROMPT_CATALOG) if(Object.hasOwn(input,entry.id)) {
    const text=input[entry.id];
    if(typeof text!=='string'||text.length>24000)throw new Error(`“${entry.label}”提示词不能超过24000字`);
    result[entry.id]=text;
  }
  return result;
}

/** Local capability checks shared by previews and actual requests; settings remain unchanged. */
export function checkModelTaskSettings(profile:Parameters<typeof resolveModelSettings>[0]&{baseUrl:string},task='',options:{thinking?:'disabled';probe?:boolean}={}){
 if(profile.modelLibrary)return checkModelTaskSettings(resolveTaskProfile(profile as any,task),task,options);
 const config=resolveModelSettings(profile,task),thinking=options.thinking??config.thinking;
 const baseUrl=taskChain(task).includes('story-writer')&&profile.writer?(profile.writer as {baseUrl?:string}).baseUrl??profile.baseUrl:profile.baseUrl;
 if(isDeepSeek(baseUrl,config.protocol)&&(thinking==='enabled'||thinking==='default')&&config.reasoningEffort==='medium'&&!options.probe)throw Error('该模型不支持独立的中等思考级别，请选择低、高或最高，或跟随模型默认');
 return config;
}
