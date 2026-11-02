import {modelRequestMessages,modelRequestParts} from './model-prompt-templates';
import {resolveTaskProfile,taskChain} from './model-library';
import type {ChatMessage,ModelProfile} from './model-gateway';
import {protocolBody,wireResponseSchema,validateConnection,validateHeaders,wireProtocol,type PromptStructureOptions} from './model-protocol';
import type {ModelJsonSchema} from '../shared/model-json-schema';
import {resolveModelSettings,checkModelTaskSettings} from './model-settings';
import {modelContextBudget} from '../shared/model-context';
import {modelAnalysisBoundaries,normalizeNovelPromptStructure} from './model-response-sections';
import {activeReplyTools} from './model-reply-tools';
export class ModelPromptCapacityError extends Error {
 constructor(message:string,readonly budget?:ReturnType<typeof modelContextBudget>&{task:string}){super(message);this.name='ModelPromptCapacityError';}
}

export function resolveModelPromptMessages(profile:Omit<ModelProfile,'apiKey'>,messages:ChatMessage[],task:string,structure?:PromptStructureOptions):ChatMessage[]{
 const parts=resolveModelPromptParts(profile,messages,task,structure);return [...parts.before,...parts.main,...parts.after];
}
export function resolveModelPromptParts(profile:Omit<ModelProfile,'apiKey'>,messages:ChatMessage[],task:string,structure?:PromptStructureOptions):ReturnType<typeof modelRequestParts>{
 if(profile.modelLibrary)return resolveModelPromptParts(resolveTaskProfile(profile,task),messages,task,structure);
 if(taskChain(task).includes('story-writer')&&profile.writer)return resolveModelPromptParts({...profile.writer,globalPrompts:profile.globalPrompts},messages,task,structure);
 return modelRequestParts(profile,messages,task,structure);
}

export function measureModelPrompt(profile:Omit<ModelProfile,'apiKey'>,messages:ChatMessage[],options:{task:string;promptStructure?:PromptStructureOptions;json?:boolean;responseSchema?:ModelJsonSchema}){
 if(profile.modelLibrary)return measureModelPrompt(resolveTaskProfile(profile,options.task),messages,options);
 if(taskChain(options.task).includes('story-writer')&&profile.writer)return measureModelPrompt({...profile.writer,globalPrompts:profile.globalPrompts},messages,options);
 const config=resolveModelSettings(profile,options.task),output=profile.taskOverrides?.[options.task]?.outputTokens??profile.generation?.outputTokens??config.outputTokens;
 const structure=normalizeNovelPromptStructure(options.task,options.promptStructure,modelAnalysisBoundaries(profile,options.task),options.json);
 const outgoing=modelRequestMessages(profile,messages,options.task,structure);
 const body=protocolBody({...profile,apiKey:''},wireProtocol(profile,config.protocol),outgoing,config,output??config.outputTokens!,options.json??false,config.thinking,new Set<string>(),structure,options.responseSchema,activeReplyTools(profile,options.task,options.json)),schema=wireResponseSchema(body);
 return modelContextBudget([...outgoing,...(schema?[{content:JSON.stringify(schema)}]:[]),...(body.tools?.length?[{content:JSON.stringify(body.tools)}]:[])],config.contextTokens,output,structure?.prefill?.content);
}

/** Local only: no credentials required, transport, timers or game rules. */
export function checkModelPrompt(profile:Omit<ModelProfile,'apiKey'>,messages:ChatMessage[],options:{task:string;promptStructure?:PromptStructureOptions;json?:boolean;responseSchema?:ModelJsonSchema}){
 return previewModelPrompt(profile,messages,options).budget;
}

/** Explicit local preview only. Return the first request body, never URLs or authentication headers. */
export function previewModelPrompt(profile:Omit<ModelProfile,'apiKey'>,messages:ChatMessage[],options:{task:string;promptStructure?:PromptStructureOptions;json?:boolean;responseSchema?:ModelJsonSchema}){
 if(profile.modelLibrary)return previewModelPrompt(resolveTaskProfile(profile,options.task),messages,options);
 if(taskChain(options.task).includes('story-writer')&&profile.writer)return previewModelPrompt({...profile.writer,globalPrompts:profile.globalPrompts},messages,options);
 validateConnection(profile.connection);validateHeaders(profile.credentialHeaders);
 const structure=normalizeNovelPromptStructure(options.task,options.promptStructure,modelAnalysisBoundaries(profile,options.task),options.json);
 const config=checkModelTaskSettings(profile,options.task),budget=measureModelPrompt(profile,messages,options);
 if(budget.exceeded)throw new ModelPromptCapacityError(`${({['story-writer']:'正文生成',['story-review']:'正文审阅',['prose-repair']:'正文修复',['story-host']:'行动理解',['party-chat']:'队伍回复',['private-chat']:'私聊回复'} as Record<string,string>)[options.task]??'当前步骤'}：当前内容按保守估算需约 ${budget.total} Token，超过设置的上下文容量 ${budget.capacity}；输入约 ${budget.estimatedInput}，输出预留 ${budget.outputReserve}。请调整该用途的上下文容量、输出预留或提示词`,{...budget,task:options.task});
 const protocol=wireProtocol(profile,config.protocol);
 const body=protocolBody({...profile,apiKey:''},protocol,modelRequestMessages(profile,messages,options.task,structure),config,budget.outputReserve,options.json??false,config.thinking,new Set<string>(),structure,options.responseSchema,activeReplyTools(profile,options.task,options.json));
 return {budget,protocol,body,sent:false as const};
}
