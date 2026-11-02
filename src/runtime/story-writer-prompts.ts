import sourceOrder from '../shared/writing-source-order.json';
import type {ChatMessage} from './model-gateway';
import type {StoryPromptConfig} from './story-prompts';
import {movePromptItem} from '../shared/prompt-order';
import {storyTargetChars} from '../shared/story-length';
import {validatePromptSource,type PromptSource} from '../shared/prompt-source';

export const WRITER_CATEGORIES={style:'文风',perspective:'视角',pace:'节奏',choices:'行动选项',nsfw:'NSFW',other:'其他'} as const;
export type WriterPromptPart={id:string;name:string;kind:'instruction'|'style'|'nsfw'|'text';content?:string;enabled?:boolean;category?:keyof typeof WRITER_CATEGORIES;exclusiveGroup?:string;source?:PromptSource};
const defaults:WriterPromptPart[]=[{id:'instruction',name:'基础指令',kind:'instruction'},{id:'style',name:'文风',kind:'style'},{id:'nsfw',name:'NSFW',kind:'nsfw'}];
export function writerPromptParts(config:Pick<StoryPromptConfig,'writerPrompts'>):WriterPromptPart[]{return config.writerPrompts??defaults.map(part=>({...part}));}
export function validateWriterPrompts(config:Pick<StoryPromptConfig,'writerPrompts'|'style'|'nsfw'|'writerTargetChars'>):void{
 storyTargetChars(config);
 const parts=writerPromptParts(config),ids=new Set<string>();
 if(!Array.isArray(parts)||parts.length>100)throw Error('正文提示词最多100条');
 for(const part of parts){
  if(!part||typeof part.id!=='string'||!part.id||part.id.length>100||ids.has(part.id))throw Error('正文提示词编号缺失或重复');
  ids.add(part.id);
  if(typeof part.name!=='string'||!part.name.trim()||part.name.length>80)throw Error('提示词名称需为1到80字');
  if(!['instruction','style','nsfw','text'].includes(part.kind))throw Error('正文提示词类型无效');
  if(part.kind==='text'&&(typeof part.content!=='string'||part.content.length>24000))throw Error('每条正文提示词最多24000字');
  if(part.enabled!==undefined&&typeof part.enabled!=='boolean')throw Error('正文提示词开关无效');
  if(part.category!==undefined&&!Object.hasOwn(WRITER_CATEGORIES,part.category))throw Error('正文提示词分类无效');
  if(part.exclusiveGroup!==undefined&&(typeof part.exclusiveGroup!=='string'||part.exclusiveGroup.length>80))throw Error('提示词互斥组无效');
  validatePromptSource(part.source);
 }
 if(parts.filter(part=>part.kind==='instruction').length!==1)throw Error('正文基础指令须保留一条');
 for(const kind of ['style','nsfw'])if(parts.filter(part=>part.kind===kind).length>1)throw Error('文风及NSFW原文本入口各最多一条');
 for(const text of [config.style,config.nsfw])if(typeof text!=='string'||text.length>24000)throw Error('每条正文提示词最多24000字');
}
export function moveWriterPrompt(parts:WriterPromptPart[],fromId:string,toId:string):WriterPromptPart[]{
 return movePromptItem(parts,fromId,toId);
}
export function toggleWriterPrompt(parts:WriterPromptPart[],id:string,enabled:boolean):WriterPromptPart[]{
 const selected=parts.find(part=>part.id===id);
 return parts.map(part=>part.id===id?{...part,enabled}:enabled&&selected?.exclusiveGroup&&part.exclusiveGroup===selected.exclusiveGroup?{...part,enabled:false}:part);
}
export function activeWriterPromptParts(config:StoryPromptConfig):WriterPromptPart[]{return writerPromptParts(config).filter(part=>part.enabled!==false&&(part.kind==='instruction'||(part.kind==='text'?part.content!:config[part.kind]).length>0));}
const sourceRoles=new Map(Object.values(sourceOrder).flat().filter(row=>row.id).map(row=>[row.id,row.role]));
/** Keep the base instruction marked for the selected model; user text stays literal. */
export function writerPromptMessages(config:StoryPromptConfig,instruction:ChatMessage):ChatMessage[]{
 validateWriterPrompts(config);
 return activeWriterPromptParts(config).flatMap(part=>{
  if(part.kind==='instruction')return [instruction];
  const content=part.kind==='text'?part.content!:config[part.kind];
  const role=sourceRoles.get(part.id);
  if(!content.length)return [];
  if(role==='user'||role==='assistant')return [{role,content,presetExample:true} as ChatMessage];
  return [{role:'system',content} as ChatMessage];
 });
}
