import {expandStoryMacros,inspectStoryMacroReferences} from './story-macros';
import type {ChatMessage} from './model-gateway';
import type {PrefillMode} from './model-protocol';
import {writerPromptTargets,type WriterPromptPart} from './story-writer-prompts';
import type {PersonalWritingPresetId,WritingPresetId,WritingPresetSet} from './writing-preset-catalog';

export const STORY_PROMPT_SLOTS = ['main','worldInfoBefore','personaDescription','charDescription','charPersonality','scenario','worldInfoAfter','dialogueExamples','chatHistory'] as const;
export type StoryPromptSlot = typeof STORY_PROMPT_SLOTS[number];
export type StoryPromptTarget = 'writer'|'private'|'party'|'host';
export type StoryPromptTrigger = 'normal'|'regenerate'|'continue';
export interface ImportedPrompt {
  id:string; name:string; content:string; role:Exclude<ChatMessage['role'],'tool'>; marker:boolean;
  enabled?:boolean; position:number; depth:number; order:number; triggers:string[];
}
export interface PromptCatalog {
  prompts:ImportedPrompt[];
  groups:Array<{id:string;order:Array<{id:string;enabled:boolean}>}>;
}
export interface StoryPromptModule extends ImportedPrompt {
  enabled:boolean; targets:StoryPromptTarget[]; original:ImportedPrompt;
}
export type StoryPromptPart = {kind:'slot';id:StoryPromptSlot;enabled:boolean}|{kind:'module';id:string};
export interface PersonalWriterPreset {
  name:string;
  source:WritingPresetSet;
  writerPrompts:WriterPromptPart[];
  style:string;
  nsfw:string;
}
export interface StoryPromptConfig {
  version:1; style:string; nsfw:string; modules:StoryPromptModule[]; layout:StoryPromptPart[];
  writerPrompts?:WriterPromptPart[];
  writerPreset?:WritingPresetId|'custom'|PersonalWritingPresetId;
  writerPresetSwitches?:Partial<Record<WritingPresetSet,Record<string,boolean>>>;
  personalWriterPresets?:Partial<Record<PersonalWritingPresetId,PersonalWriterPreset>>;
  writerTargetChars?:number;
  prefillId?:string;
  prefillMode?:PrefillMode;
  initialVariables?:Record<string,string>;
  globalVariables?:Record<string,string>;
  externalParameters?:Record<string,string>;
}
export interface StoryPromptIssue {moduleId?:string;code:string;message:string}
export class StoryPromptError extends Error {
  constructor(readonly issues:StoryPromptIssue[]){super(issues.map(issue=>issue.message).join('；'));this.name='StoryPromptError';}
}
const fail=(code:string,message:string,moduleId?:string):never=>{throw new StoryPromptError([{code,message,moduleId}]);};
const record=(value:unknown):value is Record<string,any>=>!!value&&typeof value==='object'&&!Array.isArray(value);
export function storyInitialVariables(value:unknown,label='变量'):Map<string,string>{
  if(value===undefined)return new Map();
  if(!record(value))return fail('variables',`初始${label}需要按名称填写文本值`);
  const entries=Object.entries(value);let size=0;
  if(entries.length>100)fail('variables',`初始${label}最多填写100项`);
  for(const [key,text] of entries){
    if(!key.trim()||key!==key.trim()||key.length>160||typeof text!=='string')fail('variables',`${label}名需为1到160字且没有首尾空白，${label}值需为文本`);
    size+=key.length+text.length;
  }
  if(size>256000)fail('variables',`初始${label}内容超过容量上限`);
  return new Map(entries);
}
const role=(value:unknown):value is Exclude<ChatMessage['role'],'tool'>=>['system','user','assistant'].includes(String(value));
const slot=(value:string):value is StoryPromptSlot=>(STORY_PROMPT_SLOTS as readonly string[]).includes(value);
const integer=(value:unknown,fallback:number,label:string,allowNegative=false)=>{
  if(value===undefined)return fallback;
  if(!Number.isSafeInteger(value)||(!allowNegative&&(value as number)<0))fail('invalid-number',`${label}需为有效${allowNegative?'':'非负'}整数`);
  return value as number;
};
const bool=(value:unknown,fallback:boolean,label:string)=>{
  if(value===undefined)return fallback;
  if(typeof value!=='boolean')fail('invalid-switch',`${label}不是有效开关`);
  return value as boolean;
};

/** Read data only. Provider credentials, scripts and unrelated preset settings never enter the catalog. */
export function parseTavernPromptCatalog(source:string):PromptCatalog {
  if(source.length>4_000_000)fail('size','预设文件超过读取上限');
  let root:unknown;try{root=JSON.parse(source);}catch{fail('json','无法读取预设 JSON');}
  if(!record(root)||!Array.isArray(root.prompts)||!Array.isArray(root.prompt_order))return fail('format','请选择包含 prompts 和 prompt_order 的酒馆预设');
  if(root.prompts.length>2000||root.prompt_order.length>100)fail('size','预设模块或配置组过多');
  const ids=new Set<string>();
  const prompts:ImportedPrompt[]=root.prompts.map((p:unknown)=>{
    if(!record(p)||typeof p.identifier!=='string'||!p.identifier||ids.has(p.identifier))return fail('identifier','预设模块标识缺失或重复');
    ids.add(p.identifier);
    const marker=bool(p.marker,false,'marker');
    if(p.content!==undefined&&typeof p.content!=='string')fail('content','模块内容必须是文本',p.identifier);
    if(!marker&&!role(p.role))fail('role','模块消息角色无法识别',p.identifier);
    if(p.injection_trigger!==undefined&&(!Array.isArray(p.injection_trigger)||p.injection_trigger.some((v:unknown)=>typeof v!=='string')))fail('trigger','模块触发器格式无法识别',p.identifier);
    const enabled=p.enabled===undefined?undefined:bool(p.enabled,false,'enabled');
    return {id:p.identifier,name:typeof p.name==='string'?p.name:p.identifier,content:p.content??'',role:role(p.role)?p.role:'system',marker,enabled,
      position:integer(p.injection_position,0,'注入位置'),depth:integer(p.injection_depth,4,'注入深度'),order:integer(p.injection_order,100,'注入排序',true),triggers:[...(p.injection_trigger??[])]};
  });
  const groupIds=new Set<string>();
  const groups:PromptCatalog['groups']=root.prompt_order.map((g:unknown)=>{
    if(!record(g)||!['string','number'].includes(typeof g.character_id)||!Array.isArray(g.order))return fail('group','预设配置组无效');
    const id=String(g.character_id);if(groupIds.has(id))fail('group','预设配置组重复');groupIds.add(id);
    const seen=new Set<string>();
    return {id,order:g.order.map((entry:unknown)=>{
      if(!record(entry)||typeof entry.identifier!=='string'||seen.has(entry.identifier))return fail('order','配置组中的模块标识缺失或重复');
      seen.add(entry.identifier);
      return {id:entry.identifier,enabled:bool(entry.enabled,false,'配置组 enabled')};
    })};
  });
  return {prompts,groups};
}

/** Chat replies have their own JSON format. Keep player-selected chat modules in order. */
export function conversationPromptConfig(raw:StoryPromptConfig = emptyStoryPromptConfig()):StoryPromptConfig {
  return {...raw,style:'',nsfw:'',prefillId:undefined,
    modules:raw.modules.filter(module=>module.id!==raw.prefillId),
    layout:raw.layout.filter(part=>part.kind!=='module'||part.id!==raw.prefillId)};
}

export function emptyStoryPromptConfig():StoryPromptConfig {
  return {version:1,style:'',nsfw:'',modules:[],layout:STORY_PROMPT_SLOTS.map(id=>({kind:'slot',id,enabled:true}))};
}

/** Selection is explicit: no guesses from module names, no automatic activation of dependencies. */
export function importStoryPromptModules(catalog:PromptCatalog,groupId:string,selectedIds:string[]):StoryPromptConfig {
  const group=catalog.groups.find(g=>g.id===groupId);if(!group)return fail('group','请选择存在的配置组');
  const selected=new Set(selectedIds);if(selected.size!==selectedIds.length)fail('selection','选择的模块重复');
  const byId=new Map(catalog.prompts.map(p=>[p.id,p]));
  for(const id of selected){if(!byId.has(id)||!group.order.some(e=>e.id===id))fail('selection','所选模块不在此配置组中',id);if(byId.get(id)!.marker)fail('selection','资料占位槽不是可导入的文本模块',id);}
  const config:StoryPromptConfig={version:1,style:'',nsfw:'',modules:[],layout:[]};
  for(const entry of group.order){
    const p=byId.get(entry.id);
    if(selected.has(entry.id)&&p){
      // A selected built-in text prompt adds to, rather than deletes, its native game-data slot.
      if(slot(entry.id))config.layout.push({kind:'slot',id:entry.id,enabled:true});
      config.modules.push({...structuredClone(p),enabled:entry.enabled,targets:['writer','private'],original:structuredClone(p)});config.layout.push({kind:'module',id:p.id});
    }
    else if(slot(entry.id))config.layout.push({kind:'slot',id:entry.id,enabled:entry.enabled});
    else if(p?.marker&&entry.enabled)fail('unmapped-slot',`资料占位槽“${p.name}”尚未映射，请先调整布局`,p.id);
  }
  return config;
}

export interface StoryPromptContext {
  target:StoryPromptTarget; trigger:StoryPromptTrigger; slots:Partial<Record<StoryPromptSlot,ChatMessage[]>>;
  user:string; character:string; random?:()=>number;
}
export interface CompiledStoryPrompt {
  messages:ChatMessage[]; prefill?:string;
  trace:Array<{source:string;index:number;role:ChatMessage['role'];characters:number}>;
  notes:string[];
}

/** Macro context contains narrative values only, never rule state mutation capabilities. */
function expandMacros(text:string,context:StoryPromptContext,variables:Map<string,string>,moduleId:string,onRandom:()=>void,parameters:Map<string,string>,globalVariables:ReadonlyMap<string,string>):string {
  const literal=(text:string)=>{
    let result='',cursor=0;
    for(const match of text.matchAll(/<\|([^<>]*?)\|>/g)){
      const before=text.slice(cursor,match.index);if(before.includes('<|'))fail('parameter-syntax','外部参数标记不完整',moduleId);
      result+=before;const key=match[1];
      if(!parameters.has(key))fail('missing-parameter',`外部参数“${key}”尚未映射，请填写值或明确选择原样保留`,moduleId);
      result+=parameters.get(key)!;cursor=match.index!+match[0].length;
    }
    const tail=text.slice(cursor);if(tail.includes('<|'))fail('parameter-syntax','外部参数标记不完整',moduleId);
    return result+tail;
  };
  const history=context.slots.chatHistory??[];
  return expandStoryMacros(text,{variables,globalVariables,literal,random:context.random,onRandom,fail:(code,message)=>fail(code,message,moduleId),values:{
    user:context.user,char:context.character,charifnotgroup:context.character,
    lastusermessage:[...history].reverse().find(m=>m.role==='user')?.content??'',
    lastcharmessage:[...history].reverse().find(m=>m.role==='assistant')?.content??'',
    lastmessage:history.at(-1)?.content??'',
  }});
}
export function compileStoryPrompt(config:StoryPromptConfig,context:StoryPromptContext):CompiledStoryPrompt {
  if(config.version!==1||typeof config.style!=='string'||typeof config.nsfw!=='string')return fail('config','提示词配置格式无效');
  const byId=new Map(config.modules.map(m=>[m.id,m]));
  if(byId.size!==config.modules.length)fail('identifier','模块标识重复');
  const seen=new Set<string>();
  for(const part of config.layout){const key=`${part.kind}:${part.id}`;if(seen.has(key))fail('layout','布局中有重复模块或占位槽');seen.add(key);}
  for(const id of ['main','chatHistory'])if(!config.layout.some(p=>p.kind==='slot'&&p.id===id&&p.enabled))fail('required-slot',`游戏需要“${id}”占位槽，请明确设置其位置`);
  for(const module of config.modules)if(!seen.has(`module:${module.id}`))fail('layout','模块缺少布局位置',module.id);
  for(const id of Object.keys(context.slots))if((context.slots[id as StoryPromptSlot]?.length??0)>0&&!config.layout.some(p=>p.kind==='slot'&&p.id===id&&p.enabled))fail('missing-slot',`本次资料“${id}”没有启用的位置`);
  let randomUsed=false;
  const parameters=storyInitialVariables(config.externalParameters,'外部参数');
  const globalVariables=storyInitialVariables(config.globalVariables,'全局变量');
  const variables=storyInitialVariables(config.initialVariables),rendered=new Map<string,string>();
  const active=(m:StoryPromptModule)=>m.enabled&&m.targets.includes(context.target)&&(m.triggers.length===0||m.triggers.includes(context.trigger));
  for(const part of config.layout){
    if(part.kind!=='module')continue;const m=byId.get(part.id);if(!m)fail('layout','布局引用了不存在的模块',part.id);
    if(!m!.enabled||!m!.targets.includes(context.target))continue;
    if(!role(m!.role)||![0,1].includes(m!.position))fail('structure','模块角色或注入位置不受支持',part.id);
    integer(m!.depth,4,'注入深度');integer(m!.order,100,'注入排序',true);
    if(m!.triggers.some(t=>!['normal','regenerate','continue'].includes(t)))fail('unsupported-trigger','模块包含尚未映射的触发器',part.id);
    if(active(m!))rendered.set(m!.id,expandMacros(m!.content,context,variables,m!.id,()=>{randomUsed=true;},parameters,globalVariables));
  }
  const result:CompiledStoryPrompt={messages:[],trace:[],notes:randomUsed?['本次展开使用随机宏：再次预览或启动新的生成会重新取值；它只生成提示词文字，不结算游戏检定。']:[]};
  const append=(source:string,message:ChatMessage)=>{result.trace.push({source,index:result.messages.length,role:message.role,characters:message.content.length});result.messages.push({...message});};
  const history=context.slots.chatHistory??[];
  const rank={user:0,assistant:1,system:2};
  const injections=config.modules.filter(m=>m.position===1&&rendered.has(m.id)&&m.id!==config.prefillId).sort((a,b)=>b.depth-a.depth||rank[a.role]-rank[b.role]||a.order-b.order||config.layout.findIndex(p=>p.kind==='module'&&p.id===a.id)-config.layout.findIndex(p=>p.kind==='module'&&p.id===b.id));
  const emitModule=(m:StoryPromptModule)=>{const content=rendered.get(m.id)!;if(content.length)append(`module:${m.id}`,{role:m.role,content});};
  for(const part of config.layout){
    if(part.kind==='module'){
      const m=byId.get(part.id)!;if(m.position===0&&rendered.has(m.id)&&m.id!==config.prefillId)emitModule(m);
      continue;
    }
    if(!part.enabled)continue;
    if(part.id==='chatHistory'){
      for(let i=0;i<=history.length;i++){
        for(const m of injections)if(Math.max(0,history.length-m.depth)===i){if(m.depth>history.length)result.notes.push(`模块 ${m.id} 的深度超过当前历史长度，置于历史开头`);emitModule(m);}
        if(i<history.length)append(`history:${i}`,history[i]);
      }
      if(context.target!=='host'){
        if(config.style.length&&(config.writerPrompts===undefined||config.writerPrompts.some(p=>p.kind==='style'&&p.enabled!==false&&writerPromptTargets(p).some(target=>target===context.target))))append('style',{role:'system',content:config.style});
        if(config.nsfw.length&&(config.writerPrompts===undefined||config.writerPrompts.some(p=>p.kind==='nsfw'&&p.enabled!==false&&writerPromptTargets(p).some(target=>target===context.target))))append('nsfw',{role:'system',content:config.nsfw});
      }
    }else for(const message of context.slots[part.id]??[])append(`slot:${part.id}`,message);
  }
  if(config.prefillId){
    const m=byId.get(config.prefillId);if(!m||m.role!=='assistant')fail('prefill','预填充必须明确选择 assistant 模块');
    if(rendered.has(config.prefillId)){const content=rendered.get(config.prefillId)!;if(!content.length)fail('prefill','预填充内容为空');result.prefill=content;}
  }
  return result;
}

export interface StoryPromptDependency {
 moduleId:string; moduleName:string; variable:string; optional:boolean;scope?:'global';
 candidates:Array<{id:string;name:string;selected:boolean;enabled:boolean;position:'before'|'same'|'after'}>;
}
export interface StoryPromptDependencyReport {
 dependencies:StoryPromptDependency[];
 notes:Array<{moduleId:string;message:string}>;
}
/** Source lookup, not a proof of resolution: branches, triggers and runtime keys still need compilation. */
export function inspectStoryPromptDependencies(catalog:PromptCatalog,groupId:string,selectedIds:string[]):StoryPromptDependencyReport {
 const group=catalog.groups.find(g=>g.id===groupId);if(!group)return fail('group','请选择存在的配置组');
 const selected=new Set(selectedIds),byId=new Map(catalog.prompts.map(p=>[p.id,p]));
 const entries=group.order.flatMap((entry,index)=>{
  const prompt=byId.get(entry.id);return prompt&&!prompt.marker?[{...entry,index,prompt,references:inspectStoryMacroReferences(prompt.content)}]:[];
 });
 const result:StoryPromptDependencyReport={dependencies:[],notes:[]};
 for(const entry of entries){
  if(!selected.has(entry.id))continue;
  const {references}=entry;
  if(references.dynamic)result.notes.push({moduleId:entry.id,message:'包含动态变量名，需在实际编排时检查依赖'});
  for(const name of references.unsupported)result.notes.push({moduleId:entry.id,message:`包含尚未支持的宏：${name}。预览会列出本次用到的参数与错误，可调整或停用相关模块。`});
  for(const message of references.errors)result.notes.push({moduleId:entry.id,message});
  for(const read of references.reads)result.dependencies.push({moduleId:entry.id,moduleName:entry.prompt.name,variable:read.name,optional:read.optional,...(read.scope?{scope:read.scope}:{}),
   candidates:entries.filter(candidate=>!read.scope&&candidate.references.writes.includes(read.name)).map(candidate=>({id:candidate.id,name:candidate.prompt.name,selected:selected.has(candidate.id),enabled:candidate.enabled,position:candidate.index<entry.index?'before':candidate.index===entry.index?'same':'after'}))});
 }
 return result;
}
