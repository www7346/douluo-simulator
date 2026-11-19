import type {ChatMessage,ModelGateway} from '../runtime/model-gateway';
import type {PromptStructureOptions} from '../runtime/model-protocol';
import type {StoryWritingPackage} from './story-writing-package';
import type {PreviousWritingSection} from './story-battle-writing-sections';
import type {StoryInlineCard} from '../shared/story-inline-cards';

/** Validate the request protocol and return the author's advisory capacity estimate. */
export function preflightStoryWritingCycle(gateway:ModelGateway,p:StoryWritingPackage,messages:ChatMessage[],promptStructure:PromptStructureOptions,options:{authorTask?:string;previous?:PreviousWritingSection;json?:boolean;cards?:StoryInlineCard[]}={}){
 const author=gateway.checkPrompt(messages,{task:options.authorTask??'story-writer',promptStructure,json:options.json});
 return {...author,cyclePeak:author.total};
}
