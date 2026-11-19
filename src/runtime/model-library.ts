import {validateReplyTools} from './model-reply-tools';
import {validateModelTransport} from '../shared/browser-model-transport';
import type {ModelProfile,ChatMessage} from './model-gateway';
import type {GenerationSettings,TaskSettings,RequestSettings} from './model-settings';
import {MODEL_TASKS,validateGeneration,validateRequest,validatePrompts} from './model-settings';
import {validateConnection,rejectInlineCredentials,type ModelConnection} from './model-protocol';
import {validateGlobalPrompts,validateGlobalPromptPreset} from './model-global-prompts';
import {RETIRED_MODEL_TASK_IDS,assertActiveModelTask} from './retired-model-config';
import type {ModelChannelSettings} from '../shared/chatgpt-plan';
export interface LibraryModel extends RequestSettings,ModelChannelSettings {transport?:'browser'|'server';id:string;label:string;baseUrl:string;model:string;generation?:Partial<GenerationSettings>;connection?:ModelConnection;apiKey?:string;credentialHeaders?:Record<string,string>}
export interface ModelLibraryFields {modelLibrary?:LibraryModel[];assignments?:Record<string,string>}
export const TASK_PARENTS:Record<string,string>={'ring-design-advisor':'martial-soul-advisor','person-change-reaction':'npc-autonomy','person-rewrite':'character-profile','creation-item-advisor':'martial-soul-advisor','story-rewrite':'story-writer','npc-autonomy':'story-social','npc-belief':'story-social','stage-summary':'story-summary','memory-selection':'story-summary'};
export function taskChain(task:string):string[]{assertActiveModelTask(task);const parent=TASK_PARENTS[task];return parent?[...taskChain(parent),task]:[task];}
export function normalizeModelLibrary(profile:Omit<ModelProfile,'apiKey'>):Omit<ModelProfile,'apiKey'>{
 if(!profile.modelLibrary)return profile;
 validateModelTransport(profile.transport);rejectInlineCredentials(profile.baseUrl);validateGeneration(profile.generation);
 if(!profile.modelLibrary.length)throw Error('模型库至少保留一个模型');
 const ids=new Set<string>();
 const modelLibrary=profile.modelLibrary.map(raw=>{
  if(!raw.id||ids.has(raw.id))throw Error('模型编号缺失或重复');ids.add(raw.id);
  if(!raw.label?.trim()||raw.label.length>100||typeof raw.baseUrl!=='string'||typeof raw.model!=='string')throw Error('模型名称、服务地址和实际模型名无效');
  validateModelTransport(raw.transport);rejectInlineCredentials(raw.baseUrl);validateGeneration(raw.generation);validateRequest(raw);
  const safe=Object.fromEntries(['transport','id','label','baseUrl','model','generation','timeoutMs','connectTimeoutMs','firstByteTimeoutMs','idleTimeoutMs','retryCount','repairFormat','waitMode'].filter(key=>Object.hasOwn(raw,key)&&(raw as any)[key]!==undefined).map(key=>[key,(raw as any)[key]])) as LibraryModel;
  if(raw.generation)safe.generation=Object.fromEntries(Object.entries(raw.generation).filter(([key])=>['protocol','thinking','reasoningEffort','temperature','topP','topK','contextTokens','outputTokens'].includes(key)));
  if(raw.channelMode==='custom'||raw.channelMode==='vertex'||raw.channelMode==='chatgpt')safe.channelMode=raw.channelMode;
  if(raw.channelMode==='chatgpt'&&raw.chatgptAccountId&&/^[a-f\d-]{36}$/i.test(raw.chatgptAccountId))safe.chatgptAccountId=raw.chatgptAccountId;
  return {...safe,label:raw.label.trim(),baseUrl:raw.baseUrl.trim(),model:raw.model.trim(),connection:validateConnection(raw.connection)};
 });
 const assignments={...profile.assignments};for(const [task,id] of Object.entries(assignments))if(RETIRED_MODEL_TASK_IDS.includes(task)?typeof id!=='string'||!id||id.length>160:!MODEL_TASKS.some(t=>t.id===task)||!ids.has(id))throw Error('用途引用了不存在的模型，请先选择替代模型');
 const taskOverrides:Record<string,TaskSettings>={};for(const [task,value] of Object.entries(profile.taskOverrides??{})){if(!MODEL_TASKS.some(t=>t.id===task)&&!RETIRED_MODEL_TASK_IDS.includes(task))throw Error('未知的模型用途');validateGeneration(value);validateRequest(value);if(value.stream!==undefined&&typeof value.stream!=='boolean')throw Error('流式接收开关无效');taskOverrides[task]=Object.fromEntries(Object.entries(value).filter(([key])=>['protocol','thinking','reasoningEffort','temperature','topP','topK','contextTokens','outputTokens','timeoutMs','connectTimeoutMs','firstByteTimeoutMs','idleTimeoutMs','retryCount','repairFormat','waitMode','stream'].includes(key)));}
 const safe=Object.fromEntries(['transport','id','label','baseUrl','model','generation','connection','timeoutMs','connectTimeoutMs','firstByteTimeoutMs','idleTimeoutMs','retryCount','repairFormat','waitMode','taskOverrides','promptOverrides'].filter(key=>Object.hasOwn(profile,key)&&(profile as any)[key]!==undefined).map(key=>[key,(profile as any)[key]])) as Omit<ModelProfile,'apiKey'>;
 const globalPrompts=validateGlobalPrompts(profile.globalPrompts);if(globalPrompts!==undefined)safe.globalPrompts=globalPrompts;
 const replyTools=validateReplyTools(profile.replyTools);if(replyTools!==undefined)safe.replyTools=replyTools;
 const globalPromptPreset=validateGlobalPromptPreset(profile.globalPromptPreset);if(globalPromptPreset!==undefined)safe.globalPromptPreset=globalPromptPreset;
 return {...safe,generation:modelLibrary.find(m=>m.id===profile.id)?.generation??{},connection:validateConnection(profile.connection),promptOverrides:validatePrompts(profile.promptOverrides),taskOverrides,writer:undefined,modelLibrary,assignments};
}
/** One import of previous connection settings; ids retain their existing credential scope. */
export function adoptModelLibrary(profile:Omit<ModelProfile,'apiKey'>):Omit<ModelProfile,'apiKey'>{
 if(profile.modelLibrary)return normalizeModelLibrary(profile);
 const main:LibraryModel={transport:profile.transport,id:profile.id,label:profile.writer?'模型2':'模型1',baseUrl:profile.baseUrl,model:profile.model,connection:profile.connection,generation:profile.generation,timeoutMs:profile.timeoutMs,connectTimeoutMs:profile.connectTimeoutMs,firstByteTimeoutMs:profile.firstByteTimeoutMs,idleTimeoutMs:profile.idleTimeoutMs,retryCount:profile.retryCount,repairFormat:profile.repairFormat,waitMode:profile.waitMode};
 const modelLibrary:LibraryModel[]=profile.writer?[{...profile.writer,id:profile.writer.id??profile.id+'-writer',label:'模型1'},main]:[main];
 const assignments=Object.fromEntries(MODEL_TASKS.filter(t=>!TASK_PARENTS[t.id]).map(t=>[t.id,t.id==='story-writer'?modelLibrary[0].id:main.id]));
 const taskOverrides={...profile.taskOverrides,...(profile.writer?{'story-writer':{...profile.writer.generation,...profile.writer.taskOverrides?.['story-writer']}}:{})};
 return normalizeModelLibrary({...profile,modelLibrary,assignments,taskOverrides,writer:undefined});
}
export function assignedModelId(profile:ModelLibraryFields,task:string){return [...taskChain(task)].reverse().map(id=>profile.assignments?.[id]).find(Boolean)??profile.modelLibrary?.[0]?.id;}
export function separateWriterProfile(profile:Omit<ModelProfile,'apiKey'>){
 const writer=profile.writer;
 return writer&&{...writer,globalPrompts:profile.globalPrompts,replyTools:profile.replyTools??writer.replyTools,promptOverrides:{...profile.promptOverrides,...writer.promptOverrides},apiKey:writer.apiKey??''};
}
export function resolveTaskProfile<T extends Omit<ModelProfile,'apiKey'>>(profile:T,task:string):T {
 assertActiveModelTask(task);
 if(!profile.modelLibrary)return profile;
 const model=profile.modelLibrary.find(m=>m.id===assignedModelId(profile,task));if(!model)throw Error('用途引用的模型不存在');
 const settings=Object.assign({},...taskChain(task).map(id=>profile.taskOverrides?.[id]??{})) as TaskSettings;
 const {modelLibrary,assignments,writer,...rest}=profile;
 return {...rest,...model,channelMode:model.channelMode,chatgptAccountId:model.chatgptAccountId,transport:model.transport,globalPrompts:profile.globalPrompts,apiKey:model.apiKey??'',credentialHeaders:model.credentialHeaders??{},connection:{...model.connection,...(settings.stream===undefined?{}:{stream:settings.stream})},taskOverrides:{[task]:settings}} as unknown as T;
}
export function publicModelConfiguration(profile:Omit<ModelProfile,'apiKey'>){
 const {credentialHeaders,writer,chatgptAccountId,...rest}=normalizeModelLibrary(adoptModelLibrary(profile));return {...rest,modelLibrary:rest.modelLibrary?.map(({apiKey,credentialHeaders,chatgptAccountId,...model})=>model)};
}
