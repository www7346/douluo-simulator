import {writingSet,writingGlobalParts,writingReplyTools} from './writing-preset-catalog';
import {WRITER_PRESET_LIBRARY,GLOBAL_PRESET_LIBRARY} from './prompt-preset-library';
import {writerPromptParts,validateWriterPrompts} from './story-writer-prompts';
import type {StoryPromptConfig} from './story-prompts';
import {validateGlobalPrompts,validateGlobalPromptPreset,type GlobalPromptConfiguration,type GlobalPromptFamily} from './model-global-prompts';

const FAMILY_WRITER_STYLE={deepseek:'preset-dream-style',gemini:'preset-cat-lifelike-style'} as const;
/** Switch only untouched defaults. A player's chosen alternative or edited active style wins. */
export function applyPresetWriterStyle(config:StoryPromptConfig,family:GlobalPromptFamily):StoryPromptConfig{
 if(family==='custom')return config;
 const set=writingSet(family);
 const parts=writerPromptParts(config),styleIds=[...Object.values(FAMILY_WRITER_STYLE),...WRITER_PRESET_LIBRARY.filter(p=>p.category==='style').map(p=>p.id)];
 const activeStyles=parts.filter(part=>part.enabled!==false&&(part.kind==='style'?config.style.trim():part.kind==='text'&&(part.category==='style'||part.exclusiveGroup==='文风')&&part.content?.trim()));
 if(activeStyles.some(part=>{
  const original=WRITER_PRESET_LIBRARY.find(item=>item.id===part.id);
  return !styleIds.some(id=>id===part.id)||!original||part.content!==original.content||part.name!==original.name||part.category!==original.category||part.exclusiveGroup!==original.exclusiveGroup;
 }))return config;
 const id=set?.preset.defaultStyle??FAMILY_WRITER_STYLE[family as keyof typeof FAMILY_WRITER_STYLE],existing=parts.find(part=>part.id===id);
 const template=WRITER_PRESET_LIBRARY.find(part=>part.id===id);
 if(!existing&&!template)return config;
 const rows=existing?parts:[...parts,structuredClone(template!)];
 const next={...config,writerPrompts:rows.map(part=>part.id===id?{...part,enabled:true}:activeStyles.some(style=>style.id===part.id)?{...part,enabled:false}:part)};
 validateWriterPrompts(next);return next;
}
/** Apply both editable parts of an explicitly selected set, without rewriting prompt text. */
export function switchWritingPreset<T extends GlobalPromptConfiguration>(config:T,storyPrompts:StoryPromptConfig,family:GlobalPromptFamily):{globalConfig:T&GlobalPromptConfiguration;storyPrompts:StoryPromptConfig}{
 const globalConfig=switchGlobalPromptPreset(config,family),prompts=applyPresetWriterStyle(storyPrompts,family);
 return {globalConfig,storyPrompts:prompts};
}
/** Explicit player action; loading again never overwrites edits or duplicates rows. */
export function addRecommendedWriterPresets(config:StoryPromptConfig,family:GlobalPromptFamily='custom'):StoryPromptConfig{
 const parts=writerPromptParts(config).filter(part=>!(part.kind==='style'||part.kind==='nsfw')||config[part.kind].trim().length>0),ids=new Set(parts.map(part=>part.id));
 const active=parts.filter(part=>part.enabled!==false&&(part.kind==='text'?part.content?.trim():part.kind==='instruction'?'':config[part.kind].trim()));
 const added=WRITER_PRESET_LIBRARY.filter(part=>!ids.has(part.id)).map(part=>({...structuredClone(part),enabled:part.enabled&&!(part.exclusiveGroup&&active.some(old=>old.exclusiveGroup===part.exclusiveGroup))&&!(part.category==='style'&&active.some(old=>old.kind==='style'))&&!(part.category==='nsfw'&&active.some(old=>old.kind==='nsfw'||old.category==='nsfw'))}));
 const next={...config,writerPrompts:[...parts,...added]};validateWriterPrompts(next);return applyPresetWriterStyle(next,family);
}
/** Only the active set is sent. Explicit switching preserves edits, deletions and ordering in inactive sets. */
export function switchGlobalPromptPreset<T extends GlobalPromptConfiguration>(config:T,family:GlobalPromptFamily):T{
 const state=validateGlobalPromptPreset(config.globalPromptPreset)??{active:'custom' as const,saved:{}};
 if(state.active===family)return config;
 const current=validateGlobalPrompts(config.globalPrompts)??[],saved={...state.saved,[state.active]:current};
 const prefix=family==='deepseek'?'preset-ds-':'preset-gem-';
 const parts=saved[family]??(family==='custom'?[]:writingSet(family)?writingGlobalParts(family):GLOBAL_PRESET_LIBRARY.filter(part=>part.id.startsWith(prefix)));
 delete saved[family];
 return {...config,replyTools:writingReplyTools(family),globalPrompts:structuredClone(parts),globalPromptPreset:{active:family,saved:structuredClone(saved)}};
}
