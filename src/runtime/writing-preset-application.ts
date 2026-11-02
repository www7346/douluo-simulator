import type {StoryPromptConfig} from './story-prompts';
import {switchWritingPreset} from './prompt-presets';
import {writingSet,WRITING_PRESETS,WRITING_MODEL_FAMILIES,type WritingPresetId,type WritingPresetSet,type WritingModelFamily} from './writing-preset-catalog';
import {writerPromptParts,validateWriterPrompts} from './story-writer-prompts';
import type {GlobalPromptConfiguration} from './model-global-prompts';

/** Manual preset choice only; never read or change an address, model assignment or generation setting. */
export function selectWritingPreset<T extends GlobalPromptConfiguration>(profile:T,prompts:StoryPromptConfig,presetId:WritingPresetId,modelFamily:WritingModelFamily){
 if(!WRITING_PRESETS.some(p=>p.id===presetId))throw Error('请选择已登记的预设');
 if(!WRITING_MODEL_FAMILIES.includes(modelFamily))throw Error('请手动选择预设适配模型');
 const family=`${presetId}:${modelFamily}` as WritingPresetSet,next=switchWritingPreset(profile,prompts,family),set=writingSet(family)!;
 const extras=new Set(set.preset.extras.map(p=>p.id)),allExtras=new Set(WRITING_PRESETS.flatMap(p=>p.extras.map(p=>p.id)));
 const parts=writerPromptParts(next.storyPrompts),existing=new Set(parts.map(p=>p.id));
 const writerPrompts=[...parts.map(p=>allExtras.has(p.id)?{...p,enabled:extras.has(p.id)}:p),...set.preset.extras.filter(p=>!existing.has(p.id)).map(p=>({...p,kind:'text' as const,category:'other' as const,enabled:true}))];
 const storyPrompts={...next.storyPrompts,writerPrompts};validateWriterPrompts(storyPrompts);
 return {globalConfig:next.globalConfig,storyPrompts,label:set.preset.label,modelFamily};
}
