import type {ChatMessage} from './model-gateway';
import {validatePromptSource,type PromptSource} from '../shared/prompt-source';
import {MODEL_TASKS} from './model-settings';
import type {PromptStructureOptions} from './model-protocol';
import {RETIRED_MODEL_TASK_IDS} from './retired-model-config';
import {WRITING_PRESETS,WRITING_SET_KEYS,type WritingPresetSet} from './writing-preset-catalog';
import {type ModelReplyTool} from './model-reply-tools';

export interface ModelAnalysisBoundary {start:string;end:string}
export const AUTHOR_PROMPT_TASKS=['story-writer','story-rewrite'];
export interface GlobalPrompt {id:string;name:string;content:string;enabled?:boolean;position?:'before'|'before-context'|'after';role?:Exclude<ChatMessage['role'],'tool'>;models?:string[];channel?:'any'|'official'|'compatible';tasks?:string[];source?:PromptSource;analysis?:ModelAnalysisBoundary}
export type GlobalPromptFamily='custom'|'deepseek'|'gemini'|WritingPresetSet;
export interface GlobalPromptPresetState {active:GlobalPromptFamily;saved:Partial<Record<GlobalPromptFamily,GlobalPrompt[]>>}
export interface GlobalPromptConfiguration {globalPrompts?:GlobalPrompt[];globalPromptPreset?:GlobalPromptPresetState;replyTools?:ModelReplyTool[]}
const DEEPSEEK_CHANNEL_PROMPTS=['preset-ds-chain-official','preset-ds-chain-compatible'];
const sourceExamples=new Map(WRITING_PRESETS.flatMap(preset=>preset.global.map(part=>[part.id,part.role] as const)));
/** The two built-in channel variants are alternatives, including after renaming or reordering. */
export function toggleGlobalPrompt(parts:GlobalPrompt[],id:string,enabled:boolean):GlobalPrompt[]{
 const exclusive=enabled&&DEEPSEEK_CHANNEL_PROMPTS.includes(id)&&parts.some(part=>part.id===id);
 return parts.map(part=>part.id===id?{...part,enabled}:exclusive&&DEEPSEEK_CHANNEL_PROMPTS.includes(part.id)?{...part,enabled:false}:part);
}
export function validateGlobalPromptPreset(input:GlobalPromptPresetState|undefined):GlobalPromptPresetState|undefined{
 if(input===undefined)return undefined;
 const families:GlobalPromptFamily[]=['custom','deepseek','gemini',...WRITING_SET_KEYS];
 if(!input||!families.includes(input.active)||!input.saved||typeof input.saved!=='object'||Array.isArray(input.saved))throw Error('全局提示词套组无效');
 const saved:GlobalPromptPresetState['saved']={};
 for(const [family,parts]of Object.entries(input.saved)){
  if(!families.includes(family as GlobalPromptFamily)||family===input.active||!Array.isArray(parts))throw Error('全局提示词备用套组无效');
  saved[family as GlobalPromptFamily]=validateGlobalPrompts(parts);
 }
 return {active:input.active,saved};
}
export function validateGlobalPrompts(input:GlobalPrompt[]|undefined):GlobalPrompt[]|undefined{
 if(input===undefined)return undefined;
 if(!Array.isArray(input)||input.length>100)throw Error('全局提示词最多100条');
 const ids=new Set<string>();
 return input.map(part=>{
  if(!part||typeof part.id!=='string'||!part.id||part.id.length>100||ids.has(part.id))throw Error('全局提示词编号缺失或重复');
  ids.add(part.id);
  if(typeof part.name!=='string'||!part.name.trim()||part.name.length>80)throw Error('全局提示词名称需为1到80字');
  if(typeof part.content!=='string'||part.content.length>24000)throw Error('每条全局提示词最多24000字');
  if(part.enabled!==undefined&&typeof part.enabled!=='boolean')throw Error('全局提示词开关无效');
  if(part.position!==undefined&&!['before','before-context','after'].includes(part.position))throw Error('全局提示词注入位置无效');
  if(part.role!==undefined&&!['system','user','assistant'].includes(part.role))throw Error('全局提示词消息角色无效');
  if(part.channel!==undefined&&!['any','official','compatible'].includes(part.channel))throw Error('全局提示词渠道无效');
  if(part.models!==undefined&&(!Array.isArray(part.models)||part.models.length>20||part.models.some(model=>typeof model!=='string'||!model.trim()||model.length>120)))throw Error('适用模型名称无效');
  if(part.tasks!==undefined&&(!Array.isArray(part.tasks)||part.tasks.length>MODEL_TASKS.length+RETIRED_MODEL_TASK_IDS.length||new Set(part.tasks).size!==part.tasks.length||part.tasks.some(task=>!MODEL_TASKS.some(entry=>entry.id===task)&&!RETIRED_MODEL_TASK_IDS.includes(task))))throw Error('全局提示词适用用途无效');
  if(part.analysis!==undefined&&(!part.analysis||Object.keys(part.analysis).some(key=>!['start','end'].includes(key))||![part.analysis.start,part.analysis.end].every(tag=>typeof tag==='string'&&/^<[^<>\r\n]{1,70}>$/u.test(tag))||part.analysis.start===part.analysis.end))throw Error('分析区需填写不同的完整开始和结束标签，例如 <think> 与 </think>');
  validatePromptSource(part.source);
  return {id:part.id,name:part.name,content:part.content,...(part.enabled===undefined?{}:{enabled:part.enabled}),...(part.position===undefined?{}:{position:part.position}),...(part.role===undefined?{}:{role:part.role}),...(part.channel===undefined?{}:{channel:part.channel}),...(part.models===undefined?{}:{models:[...part.models]}),...(part.tasks===undefined?{}:{tasks:[...part.tasks]}),...(part.analysis?{analysis:{...part.analysis}}:{}),...(part.source?{source:{preset:part.source.preset,entry:part.source.entry,...(part.source.adaptation===undefined?{}:{adaptation:part.source.adaptation})}}:{})};
 });
}
export function activeGlobalPrompts(profile:{globalPrompts?:GlobalPrompt[];model?:string;baseUrl?:string},task=''):GlobalPrompt[]{
 if(RETIRED_MODEL_TASK_IDS.includes(task))return [];
 const normalize=(text:string)=>text.toLowerCase().replace(/[\s_.-]/g,'');
 const requested=normalize(profile.model??'');
 // The official current Flash ID names the V4 Flash family. Keep the saved
 // selectors intact while matching either of its actual service names.
 const modelNames=requested==='deepseekflash'?[requested,'deepseekv4flash']:[requested];
 let official=false;try{official=['api.deepseek.com','generativelanguage.googleapis.com'].includes(new URL(profile.baseUrl??'').hostname);}catch{}
 return (validateGlobalPrompts(profile.globalPrompts)??[]).filter(part=>part.enabled!==false&&part.content.length>0&&(part.tasks===undefined||part.tasks.includes(task))&&(!part.models?.length||part.models.some(model=>modelNames.some(name=>name.includes(normalize(model)))))&&(!part.channel||part.channel==='any'||(part.channel==='official')===official));
}
export function globalPromptMessages(profile:{globalPrompts?:GlobalPrompt[];model?:string;baseUrl?:string},position:NonNullable<GlobalPrompt['position']>='before',task='',structure?:PromptStructureOptions):ChatMessage[]{
 return activeGlobalPrompts(profile,task).filter(part=>(part.position??'before')===position&&(part.id!=='preset-gem-cat-prefill'||(structure?.prefillMode??structure?.prefill?.mode)==='compatible-assistant')).map(part=>{
  const role=part.role??'system';
  const example=position==='before'&&role!=='system'&&sourceExamples.get(part.id)===role;
  return {role,content:part.content,...(example?{presetExample:true as const}:{})};
 });
}
