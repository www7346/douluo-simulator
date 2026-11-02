import type {ChatMessage} from './model-gateway';
import {PROMPT_CATALOG} from './model-prompts';
import {globalPromptMessages,type GlobalPrompt} from './model-global-prompts';
import type {PromptStructureOptions} from './model-protocol';
import {RETIRED_PROMPT_IDS} from './retired-model-config';

export interface PromptTemplate {ids?:string[];fields?:Record<string,string>}
type PromptProfile={promptOverrides?:Record<string,string>;globalPrompts?:GlobalPrompt[];model?:string;baseUrl?:string};
const inheritedPrompts:Record<string,string>={'story-rewrite':'story-writer'};
export function modelPromptText(profile:PromptProfile,id:string):string{
 if(RETIRED_PROMPT_IDS.includes(id))throw Error('这项提示词已停用');
 const own=profile.promptOverrides?.[id];
 if(own!==undefined)return own;
 const parent=inheritedPrompts[id];
 if(parent&&profile.promptOverrides?.[parent]!==undefined)return profile.promptOverrides[parent];
 const entry=PROMPT_CATALOG.find(entry=>entry.id===id);
 if(!entry)throw Error('未知提示词：'+id);
 return entry.text;
}
/** Only explicitly marked built-in instructions are editable; player text and facts stay data. */
export function promptMessage(id:string|string[],role:ChatMessage['role']='system'):ChatMessage{
 const ids=typeof id==='string'?[id]:id;
 return {role,content:ids.map(id=>modelPromptText({},id)).join('\n'),promptTemplate:{ids}};
}
/** Paths are declared by request builders, never inferred from player content. */
function setPromptField(data:Record<string,any>,path:string,text:string){
 const keys=path.split('.');let owner=data;
 for(const key of keys.slice(0,-1)){
  if(['__proto__','prototype','constructor'].includes(key)||!Object.hasOwn(owner,key)||!owner[key]||typeof owner[key]!=='object')throw Error('提示词资料位置无效');
  owner=owner[key];
 }
 const key=keys.at(-1)!;
 if(['__proto__','prototype','constructor'].includes(key))throw Error('提示词资料位置无效');
 owner[key]=text;
}
export const factReferencePromptFields=(prefix='factReferences')=>Object.fromEntries(['format','source','value'].map(key=>[`${prefix}.${key}`,`fact-reference-${key}`]));
export function promptDataMessage(data:Record<string,unknown>,fields:Record<string,string>,role:ChatMessage['role']='user'):ChatMessage{
 const packet=structuredClone(data);
 for(const [path,id] of Object.entries(fields))setPromptField(packet,path,modelPromptText({},id));
 return {role,content:JSON.stringify(packet),promptTemplate:{fields}};
}
export function applyModelPrompts(profile:PromptProfile,messages:ChatMessage[]):ChatMessage[]{
 return messages.map(({promptTemplate,...message})=>{
  if(!promptTemplate)return message;
  if(promptTemplate.ids)return {...message,content:promptTemplate.ids.map(id=>modelPromptText(profile,id)).join('\n')};
  const data=JSON.parse(message.content);
  for(const [key,id] of Object.entries(promptTemplate.fields??{}))setPromptField(data,key,modelPromptText(profile,id));
  return {...message,content:JSON.stringify(data)};
 });
}
/** Called once when a raw request is prepared; retries retain both prepared ends. */
export function modelRequestParts(profile:PromptProfile,messages:ChatMessage[],task='',structure?:PromptStructureOptions){
 const before=globalPromptMessages(profile,'before',task,structure),middle=globalPromptMessages(profile,'before-context',task,structure),after=globalPromptMessages(profile,'after',task,structure);
 // Structured fact packets already carry field metadata. No text/content sniffing.
 const boundary=messages.findIndex(message=>message.promptTemplate?.fields!==undefined||message.role!=='system'),offset=boundary<0?messages.length:boundary;
 const applied=applyModelPrompts(profile,messages),main=[...applied.slice(0,offset),...middle,...applied.slice(offset)];
 const sourceIndexes=messages.map((_,index)=>before.length+index+(index>=offset?middle.length:0));
 const globalIndexes=[...before.map((_,i)=>i),...middle.map((_,i)=>before.length+offset+i),...after.map((_,i)=>before.length+main.length+i)];
 return {before,main,after,sourceIndexes,globalIndexes};
}
export function modelRequestMessages(profile:PromptProfile,messages:ChatMessage[],task='',structure?:PromptStructureOptions):ChatMessage[]{
 const parts=modelRequestParts(profile,messages,task,structure);return [...parts.before,...parts.main,...parts.after];
}
