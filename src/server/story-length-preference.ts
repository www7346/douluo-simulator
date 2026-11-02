import {storyTargetChars} from '../shared/story-length';
import type {StoryPromptConfig} from '../runtime/story-prompts';
import type {StoryWritingPackage} from './story-writing-package';

/** A writing preference, never a truncation or a change to the frozen facts. */
export function storyLengthPreference(config:StoryPromptConfig,kind:'story-writer'|'story-rewrite',source:StoryWritingPackage){
 const totalTargetCharacters=storyTargetChars(config)??(kind==='story-writer'&&source.origin.audience.kind==='public'&&!source.origin.battleId?600:undefined);
 if(totalTargetCharacters===undefined)return undefined;
 const section=source.origin.writingSection;
 if(!section)return {targetCharacters:totalTargetCharacters,scope:'本次完整正文'};
 const event=source.facts.events.find(event=>event.facts.battle?.id===section.battleId);
 const actions=source.battleSources.find(b=>b.battleId===section.battleId&&b.step===event?.step)?.actions;
 if(!actions?.length)throw Error('战报字数分配缺少完整行动来源');
 const before=actions.filter((action:any)=>action.sequence<section.firstSequence).length;
 const through=actions.filter((action:any)=>action.sequence<=section.lastSequence).length;
 const targetCharacters=Math.max(1,Math.floor(totalTargetCharacters*through/actions.length)-Math.floor(totalTargetCharacters*before/actions.length));
 return {targetCharacters,totalTargetCharacters,scope:'当前战报阶段；整篇目标按各阶段所含行动比例分配'};
}
