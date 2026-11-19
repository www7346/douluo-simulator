import {isPersonalWritingPresetId,writingSet,writingGlobalParts,writingReplyTools,WRITING_PRESETS,type PersonalWritingPresetId,type WritingPresetSet} from './writing-preset-catalog';
import {WRITER_PRESET_LIBRARY,GLOBAL_PRESET_LIBRARY} from './prompt-preset-library';
import {activeWriterPromptParts,insertBundledWriterParts,writerPartInCurrentPreset,writerPresetOwner,writerPromptParts,validateWriterPrompts,type WriterPromptPart} from './story-writer-prompts';
import type {StoryPromptConfig} from './story-prompts';
import {validateGlobalPrompts,validateGlobalPromptPreset,type GlobalPrompt,type GlobalPromptConfiguration,type GlobalPromptFamily,type GlobalPromptPresetState} from './model-global-prompts';

const FAMILY_WRITER_STYLE={deepseek:'preset-dream-style',gemini:'preset-cat-lifelike-style'} as const;
/** Switch only untouched defaults. A player's chosen alternative or edited active style wins. */
export function applyPresetWriterStyle(config:StoryPromptConfig,family:GlobalPromptFamily):StoryPromptConfig{
 if(family==='custom')return config;
 const set=writingSet(family);
 const parts=writerPromptParts(config),styleIds=[...Object.values(FAMILY_WRITER_STYLE),...WRITING_PRESETS.map(p=>p.defaultStyle)];
 const activeStyles=activeWriterPromptParts(config,'writer').filter(part=>
  part.kind==='style' ? config.style.trim() :
   part.kind==='text'&&(part.category==='style'||part.exclusiveGroup==='文风')&&part.content?.trim()
 );
 if(activeStyles.some(part=>{
  const original=WRITER_PRESET_LIBRARY.find(item=>item.id===part.id);
  return !styleIds.some(id=>id===part.id)||!original||part.content!==original.content||part.name!==original.name||part.category!==original.category||part.exclusiveGroup!==original.exclusiveGroup||part.targets!==undefined;
 }))return config;
 const id=set?.preset.defaultStyle??FAMILY_WRITER_STYLE[family as keyof typeof FAMILY_WRITER_STYLE],existing=parts.find(part=>part.id===id);
 const template=WRITER_PRESET_LIBRARY.find(part=>part.id===id);
 if(!existing&&!template)return config;
 if(set&&existing)return config;
 const rows=existing?parts:insertBundledWriterParts(parts,[structuredClone(template!)]);
 const next={...config,writerPrompts:rows.map(part=>part.id===id?{...part,enabled:true}:activeStyles.some(style=>style.id===part.id)?{...part,enabled:false}:part)};
 validateWriterPrompts(next);return next;
}
/** Read the selected bundle beside the saved choices. The saved text and switches take precedence. */
export function writingPromptsForFamily(config:StoryPromptConfig,family:GlobalPromptFamily|undefined):StoryPromptConfig{
 if(family===undefined)return config;
 if(isPersonalWritingPresetId(family)){
  if(!config.personalWriterPresets?.[family])throw Error('自定义写作预设不存在');
  return {...config,writerPreset:family};
 }
 const set=writingSet(family);
 if(!set)return config.writerPreset===undefined?config:{...config,writerPreset:'custom'};
 return {...config,writerPreset:set.preset.id};
}
/** Text and order belong to the writing preset. Each model variant remembers its own switches. */
function switchWriterPresetVariant(config:StoryPromptConfig,profile:GlobalPromptConfiguration,next:GlobalPromptFamily):StoryPromptConfig{
 const scoped=writingPromptsForFamily(config,next);
 const previous=profile.globalPromptPreset?.active;
 if(previous===next)return scoped;
 const oldSet=previous&&writingSet(previous),newSet=writingSet(next);
 if(!oldSet&&!newSet)return scoped;
 const switches={...config.writerPresetSwitches};
 const rows=config.writerPrompts;
 if(oldSet){
  switches[previous as WritingPresetSet]=Object.fromEntries((rows??[])
   .filter(part=>writerPresetOwner(part.id)===oldSet.preset.id).map(part=>[part.id,part.enabled!==false]));
 }
 if(!newSet)return {...scoped,writerPresetSwitches:switches};
 const saved=switches[next as WritingPresetSet];
 const hasOtherVariant=Object.keys(switches).some(key=>key.startsWith(newSet.preset.id+':'));
 const previouslySelected=Object.hasOwn(profile.globalPromptPreset?.saved??{},next);
 if(!rows||(!hasOtherVariant&&previouslySelected))return {...scoped,writerPresetSwitches:switches};
 const outside=rows.filter(part=>writerPresetOwner(part.id)!==newSet.preset.id);
 const defaults=new Map(writerPromptParts({...scoped,writerPrompts:outside}).map(part=>[part.id,part.enabled!==false]));
 return {...scoped,writerPresetSwitches:switches,writerPrompts:rows.map(part=>writerPresetOwner(part.id)===newSet.preset.id
  ? {...part,enabled:saved?.[part.id]??defaults.get(part.id)} : part)};
}
/** Apply both editable parts of an explicitly selected set, without rewriting prompt text. */
export function switchWritingPreset<T extends GlobalPromptConfiguration>(config:T,storyPrompts:StoryPromptConfig,family:GlobalPromptFamily):{globalConfig:T&GlobalPromptConfiguration;storyPrompts:StoryPromptConfig}{
 const scoped=switchWriterPresetVariant(storyPrompts,config,family);
 const source=isPersonalWritingPresetId(family)?scoped.personalWriterPresets?.[family]?.source:undefined;
 const globalConfig=switchGlobalPromptPreset(config,family,source);
 const prompts=source||writingSet(family)?scoped:applyPresetWriterStyle(scoped,family);
 return {globalConfig,storyPrompts:prompts};
}
export type WritingPresetAddition={kind:'writer';part:WriterPromptPart}|{kind:'global';part:GlobalPrompt};

export function forkWritingPreset<T extends GlobalPromptConfiguration>(profile:T,config:StoryPromptConfig,id:PersonalWritingPresetId,name:string,addition:WritingPresetAddition){
 const source=profile.globalPromptPreset?.active;
 if(!source||!writingSet(source))throw Error('请先选择内置预设和适配模型');
 name=name.trim();
 if(!name||name.length>80)throw Error('预设名称需为1到80字');
 const personal=config.personalWriterPresets??{};
 if(name==='自定义套组'||WRITING_PRESETS.some(preset=>preset.label===name)||Object.values(personal).some(preset=>preset?.name===name))throw Error('这个预设名称已存在');
 if(!isPersonalWritingPresetId(id)||Object.hasOwn(personal,id))throw Error('自定义预设编号无效');
 const scoped=writingPromptsForFamily(config,source);
 const rows=writerPromptParts(scoped).filter(part=>writerPartInCurrentPreset(scoped,part));
 if(addition.kind==='writer')rows.push(addition.part);
 const globals=[...(profile.globalPrompts??[])];
 if(addition.kind==='global')globals.push(addition.part);
 const preset={name,source:source as WritingPresetSet,writerPrompts:structuredClone(rows),style:config.style,nsfw:config.nsfw};
 const next=switchWritingPreset(profile,{...config,personalWriterPresets:{...personal,[id]:preset}},id);
 validateWriterPrompts(next.storyPrompts);
 return {...next,globalConfig:{...next.globalConfig,globalPrompts:validateGlobalPrompts(globals)}};
}
/** Explicit player action; loading again never overwrites edits or duplicates rows. */
export function addRecommendedWriterPresets(config:StoryPromptConfig,family:GlobalPromptFamily='custom'):StoryPromptConfig{
 if(config.writerPreset&&config.writerPreset!=='custom')return config;
 const parts=writerPromptParts(config).filter(part=>!(part.kind==='style'||part.kind==='nsfw')||config[part.kind].trim().length>0),ids=new Set(parts.map(part=>part.id));
 const active=parts.filter(part=>part.enabled!==false&&writerPartInCurrentPreset(config,part)&&(part.kind==='text'?part.content?.trim():part.kind==='instruction'?'':config[part.kind].trim()));
 const added=WRITER_PRESET_LIBRARY.filter(part=>!ids.has(part.id)&&writerPartInCurrentPreset(config,part)).map(part=>({...structuredClone(part),enabled:part.enabled&&!(part.exclusiveGroup&&active.some(old=>old.exclusiveGroup===part.exclusiveGroup))&&!(part.category==='style'&&active.some(old=>old.kind==='style'))&&!(part.category==='nsfw'&&active.some(old=>old.kind==='nsfw'||old.category==='nsfw'))}));
 const next={...config,writerPrompts:[...parts,...added]};validateWriterPrompts(next);return applyPresetWriterStyle(next,family);
}
/** Only the active set is sent. Explicit switching preserves edits, deletions and ordering in inactive sets. */
export function switchGlobalPromptPreset<T extends GlobalPromptConfiguration>(config:T,family:GlobalPromptFamily,source?:WritingPresetSet):T{
 const state=validateGlobalPromptPreset(config.globalPromptPreset)??{active:'custom' as const,saved:{}};
 if(state.active===family)return config;
 const current=validateGlobalPrompts(config.globalPrompts)??[];
 const saved:GlobalPromptPresetState['saved']={...state.saved,[state.active]:current};
 const prefix=family==='deepseek'?'preset-ds-':'preset-gem-';
 const parts=saved[family]??(family==='custom'||isPersonalWritingPresetId(family)?[]:writingSet(family)?writingGlobalParts(family):GLOBAL_PRESET_LIBRARY.filter(part=>part.id.startsWith(prefix)));
 delete saved[family];
 return {...config,replyTools:writingReplyTools(source??family),globalPrompts:structuredClone(parts),globalPromptPreset:{active:family,saved:structuredClone(saved)}};
}
