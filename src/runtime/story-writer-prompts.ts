import type {ChatMessage} from './model-gateway';
import type {StoryPromptConfig} from './story-prompts';
import {movePromptItem} from '../shared/prompt-order';
import {storyTargetChars} from '../shared/story-length';
import {validatePromptSource,type PromptSource} from '../shared/prompt-source';
import {isPersonalWritingPresetId,NEW_WRITER_PRESETS,WRITING_PRESETS,WRITING_PRESET_MODULES,WRITING_SET_KEYS,writingPresetSource,writingSet} from './writing-preset-catalog';
import {WRITER_PRESET_LIBRARY} from './prompt-preset-library';

export const WRITER_CATEGORIES={style:'文风',perspective:'视角',pace:'节奏',choices:'行动选项',nsfw:'NSFW',other:'其他'} as const;
export const WRITER_PROMPT_TARGETS={writer:'正文',private:'私聊',party:'群聊'} as const;
export type WriterPromptTarget=keyof typeof WRITER_PROMPT_TARGETS;
export type WriterPromptPart={id:string;name:string;kind:'instruction'|'style'|'nsfw'|'text';content?:string;enabled?:boolean;category?:keyof typeof WRITER_CATEGORIES;exclusiveGroup?:string;source?:PromptSource;targets?:WriterPromptTarget[]};
/** Writing style is shared; novel-specific instructions keep their original channel. */
export function writerPromptTargets(part:WriterPromptPart):WriterPromptTarget[]{
 if(part.targets!==undefined)return part.targets;
 return part.kind==='style'||part.kind==='nsfw'||part.kind==='text'&&['style','nsfw'].includes(part.category??'')?['writer','private','party']:['writer'];
}
const defaults:WriterPromptPart[]=[{id:'instruction',name:'基础指令',kind:'instruction'},{id:'style',name:'文风',kind:'style'},{id:'nsfw',name:'NSFW',kind:'nsfw'}];
const moduleIds=new Set(Object.values(WRITING_PRESET_MODULES).flat().map(part=>part.id));
const defaultStyles=new Map(WRITING_PRESETS.map(preset=>[preset.defaultStyle,preset.id]));
const presetOwners=new Map(WRITING_PRESETS.flatMap(preset=>[
 ...WRITING_PRESET_MODULES[preset.id],...preset.styles
].map(part=>[part.id,preset.id] as const)));
const libraryIds=new Set(WRITER_PRESET_LIBRARY.map(part=>part.id));
export const writerPresetOwner=(id:string)=>presetOwners.get(id);
export const isBundledWriterModule=(id:string)=>presetOwners.has(id);
export const MAX_CUSTOM_WRITER_PROMPTS=100;
export function customWriterPromptCount(parts:WriterPromptPart[]):number{
 return parts.filter(part=>part?.kind==='text'&&!libraryIds.has(part.id)&&!presetOwners.has(part.id)).length;
}
export function writerPartInCurrentPreset(config:Pick<StoryPromptConfig,'writerPreset'>,part:WriterPromptPart):boolean{
 if(config.writerPreset===undefined||isPersonalWritingPresetId(config.writerPreset))return true;
 if(config.writerPreset!=='custom'){
  const owner=writerPresetOwner(part.id);
  return owner ? owner===config.writerPreset : part.kind!=='text';
 }
 if(moduleIds.has(part.id))return false;
 const owner=defaultStyles.get(part.id);
 if(!owner)return true;
 const original=NEW_WRITER_PRESETS.find(row=>row.id===part.id);
 return part.targets!==undefined||part.content!==original?.content||part.name!==original?.name||part.category!==original?.category||part.exclusiveGroup!==original?.exclusiveGroup;
}
/** Source order for newly supplied entries. Existing entries retain the player's relative order. */
export function insertBundledWriterParts(parts:WriterPromptPart[],additions:WriterPromptPart[]):WriterPromptPart[]{
 const result=[...parts];
 for(const part of additions){
  const position=writingPresetSource(part.id)?.sourceIndex??Infinity;
  const owner=writerPresetOwner(part.id);
  const index=result.findIndex(row=>owner!==undefined&&writerPresetOwner(row.id)===owner&&(writingPresetSource(row.id)?.sourceIndex??Infinity)>position);
  result.splice(index<0?result.length:index,0,part);
 }
 return result;
}
export function currentPersonalWriterPreset(config:Pick<StoryPromptConfig,'writerPreset'|'personalWriterPresets'>){
 return isPersonalWritingPresetId(config.writerPreset)?config.personalWriterPresets?.[config.writerPreset]:undefined;
}
export function writerPromptParts(config:Pick<StoryPromptConfig,'writerPrompts'|'writerPreset'|'personalWriterPresets'|'style'>):WriterPromptPart[]{
 const personal=currentPersonalWriterPreset(config);
 if(personal)return personal.writerPrompts;
 const parts=config.writerPrompts??defaults.map(part=>({...part}));
 const preset=WRITING_PRESETS.find(preset=>preset.id===config.writerPreset);
 if(!preset||!Array.isArray(parts))return parts;
 const active=parts.filter(part=>part&&part.enabled!==false&&writerPartInCurrentPreset(config,part));
 const hasWriterStyle=active.some(part=>writerPromptTargets(part).includes('writer')&&
  (part.kind==='style'?!!config.style?.trim():part.kind==='text'&&!!part.content?.trim()&&(part.category==='style'||part.exclusiveGroup==='文风')));
 const modules:WriterPromptPart[]=WRITING_PRESET_MODULES[preset.id].map(({targetCharacters:_,...part})=>({...part,kind:'text'}));
 const styles=NEW_WRITER_PRESETS.filter(part=>part.category==='style'&&writerPresetOwner(part.id)===preset.id);
 const added=[...modules,...styles].filter(part=>!parts.some(saved=>saved?.id===part.id)).map(part=>({
  ...part,enabled:part.id===preset.defaultStyle ? !hasWriterStyle :
   part.enabled!==false&&(!part.exclusiveGroup||!active.some(old=>old.exclusiveGroup===part.exclusiveGroup))
 }));
 return added.length?insertBundledWriterParts(parts,added):parts;
}
export function validateWriterPrompts(config:Pick<StoryPromptConfig,'writerPrompts'|'writerPreset'|'writerPresetSwitches'|'personalWriterPresets'|'style'|'nsfw'|'writerTargetChars'>):void{
 storyTargetChars(config);
 const personal=config.personalWriterPresets;
 if(personal!==undefined){
  if(!personal||typeof personal!=='object'||Array.isArray(personal))throw Error('自定义预设无效');
  const names=new Set<string>();
  for(const [id,preset] of Object.entries(personal)){
   if(!isPersonalWritingPresetId(id)||!preset||typeof preset.name!=='string'||!preset.name.trim()||preset.name.length>80||
    names.has(preset.name.trim())||!WRITING_SET_KEYS.includes(preset.source))throw Error('自定义预设无效');
   names.add(preset.name.trim());
   validateWriterPromptRows(preset.writerPrompts,preset.style,preset.nsfw);
  }
 }
 if(config.writerPreset!==undefined&&config.writerPreset!=='custom'&&!currentPersonalWriterPreset(config)&&!WRITING_PRESETS.some(preset=>preset.id===config.writerPreset))throw Error('正文提示词套组无效');
 const base=isPersonalWritingPresetId(config.writerPreset)?{...config,writerPreset:'custom' as const}:config;
 validateWriterPromptRows(writerPromptParts(base),config.style,config.nsfw);
 const switches=config.writerPresetSwitches;
 if(switches!==undefined){
  if(!switches||typeof switches!=='object'||Array.isArray(switches))throw Error('正文预设开关无效');
  for(const [key,rows] of Object.entries(switches)){
   if(!WRITING_SET_KEYS.some(set=>set===key)||!rows||typeof rows!=='object'||Array.isArray(rows)||
    Object.entries(rows).some(([id,enabled])=>writerPresetOwner(id)!==key.split(':')[0]||typeof enabled!=='boolean'))throw Error('正文预设开关无效');
  }
 }
}
function validateWriterPromptRows(parts:WriterPromptPart[],style:string,nsfw:string):void{
 if(!Array.isArray(parts))throw Error('正文提示词须为列表');
 if(customWriterPromptCount(parts)>MAX_CUSTOM_WRITER_PROMPTS)throw Error('自建正文提示词最多100条');
 const ids=new Set<string>();
 for(const part of parts){
  if(!part||typeof part.id!=='string'||!part.id||part.id.length>100||ids.has(part.id))throw Error('正文提示词编号缺失或重复');
  ids.add(part.id);
  if(typeof part.name!=='string'||!part.name.trim()||part.name.length>80)throw Error('提示词名称需为1到80字');
  if(!['instruction','style','nsfw','text'].includes(part.kind))throw Error('正文提示词类型无效');
  if(part.kind==='text'&&(typeof part.content!=='string'||part.content.length>24000))throw Error('每条正文提示词最多24000字');
  if(part.enabled!==undefined&&typeof part.enabled!=='boolean')throw Error('正文提示词开关无效');
  if(part.category!==undefined&&!Object.hasOwn(WRITER_CATEGORIES,part.category))throw Error('正文提示词分类无效');
  if(part.exclusiveGroup!==undefined&&(typeof part.exclusiveGroup!=='string'||part.exclusiveGroup.length>80))throw Error('提示词互斥组无效');
  if(part.targets!==undefined&&(!Array.isArray(part.targets)||!part.targets.length||part.targets.length>3||new Set(part.targets).size!==part.targets.length||part.targets.some(target=>!Object.hasOwn(WRITER_PROMPT_TARGETS,target))))throw Error('请选择提示词适用的正文、私聊或群聊用途');
  validatePromptSource(part.source);
 }
 if(parts.filter(part=>part.kind==='instruction').length!==1)throw Error('正文基础指令须保留一条');
 for(const kind of ['style','nsfw'])if(parts.filter(part=>part.kind===kind).length>1)throw Error('文风及NSFW原文本入口各最多一条');
 for(const text of [style,nsfw])if(typeof text!=='string'||text.length>24000)throw Error('每条正文提示词最多24000字');
}
export function moveWriterPrompt(parts:WriterPromptPart[],fromId:string,toId:string):WriterPromptPart[]{
 return movePromptItem(parts,fromId,toId);
}
export function toggleWriterPrompt(parts:WriterPromptPart[],id:string,enabled:boolean,config:Pick<StoryPromptConfig,'writerPreset'>={}):WriterPromptPart[]{
 const selected=parts.find(part=>part.id===id);
 return parts.map(part=>part.id===id?{...part,enabled}:enabled&&selected?.exclusiveGroup&&part.exclusiveGroup===selected.exclusiveGroup&&writerPartInCurrentPreset(config,part)&&writerPromptTargets(selected).some(target=>writerPromptTargets(part).includes(target))?{...part,enabled:false}:part);
}
export function writerPartText(config:StoryPromptConfig,part:WriterPromptPart):string{
 if(part.kind==='instruction')return '';
 return part.kind==='text'?part.content!:(currentPersonalWriterPreset(config)??config)[part.kind];
}
export function activeWriterPromptParts(config:StoryPromptConfig,target:WriterPromptTarget='writer'):WriterPromptPart[]{return writerPromptParts(config).filter(part=>part.enabled!==false&&writerPartInCurrentPreset(config,part)&&writerPromptTargets(part).includes(target)&&(part.kind==='instruction'||writerPartText(config,part).length>0));}
/** An edited length instruction owns its own text; an untouched one supplies an overall target. */
export function bundledWriterLength(config:StoryPromptConfig):number|null|undefined{
 const personal=currentPersonalWriterPreset(config);
 const owner=personal?writingSet(personal.source)?.preset.id:config.writerPreset;
 const modules=owner&&owner!=='custom'&&!isPersonalWritingPresetId(owner)?WRITING_PRESET_MODULES[owner]:undefined;
 if(!modules)return undefined;
 for(const part of activeWriterPromptParts(config)){
  const module=modules.find(row=>row.id===part.id&&row.targetCharacters!==undefined);
  if(module)return module.content===part.content?module.targetCharacters:null;
 }
}
/** Keep the base instruction marked for the selected model; user text stays literal. */
export function writerPromptMessages(config:StoryPromptConfig,instruction:ChatMessage,parts=activeWriterPromptParts(config)):ChatMessage[]{
 validateWriterPrompts(config);
 return parts.flatMap(part=>{
  if(part.kind==='instruction')return [instruction];
  return writerPartMessages(config,part);
 });
}
function writerPartMessages(config:StoryPromptConfig,part:WriterPromptPart):ChatMessage[]{
 if(part.kind==='instruction')return [];
 const content=writerPartText(config,part),role=writingPresetSource(part.id)?.role;
 if(!content.length)return [];
 if(role==='user'||role==='assistant')return [{role,content,presetExample:true} as ChatMessage];
 return [{role:'system',content}];
}
/** Keep the selected writing text literal; the chat's own role and output protocol follow it. */
export function conversationWriterMessages(config:StoryPromptConfig,instruction:ChatMessage,target:'private'|'party'):ChatMessage[]{
 validateWriterPrompts(config);
 return [...activeWriterPromptParts(config,target).filter(part=>part.kind!=='instruction').flatMap(part=>writerPartMessages(config,part)),instruction];
}
