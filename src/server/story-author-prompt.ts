import {storySourceInput} from '../shared/story-source-input';
import {promptMessage,promptDataMessage,modelPromptText} from '../runtime/model-prompt-templates';
import {writerPromptMessages,activeWriterPromptParts} from '../runtime/story-writer-prompts';
import {storyLengthPreference} from './story-length-preference';
import type {StoryWritingPackage} from './story-writing-package';
import {selectStoryWritingView} from './story-writing-view';
import {compactStoryPacketReadings} from './story-host-record-columns';
import {compileStoryPrompt,type StoryPromptConfig,type StoryPromptTarget} from '../runtime/story-prompts';
import {archivedStoryMessages} from '../runtime/story-history-messages';
import type {StoryTurn} from '../runtime/story-turns';
import type {StoryRecall,StoryRecent} from '../shared/story-recall';
import {storyInlineCards} from '../shared/story-inline-cards';
import {storyNovelFacts} from './story-novel';
import {compactBattlePassages} from './battle-prompt-passages';
import {commerceWritingReadings} from '../runtime/story-commerce-reading';
import {storyWritingSectionCards,type PreviousWritingSection} from './story-battle-writing-sections';

export {STORY_FACT_SOURCE_CONTRACT,STORY_MEMORY_SOURCE_CONTRACT,STORY_AUTHOR_ROLE,STORY_AUTHOR_CONTRACT} from './story-author-contract';

export function prepareStoryAuthorPrompt(args:{participantDialogue?:unknown[];turn:StoryTurn;writingPackage:StoryWritingPackage;kind:'story-writer'|'story-rewrite';config:StoryPromptConfig;input:Record<string,any>;history:StoryRecent[];recall:StoryRecall[];narrativeSummaries:unknown[];previousSection?:PreviousWritingSection}){
 const {turn,writingPackage,kind,config,input,history,recall,narrativeSummaries}=args;
 const writingView=selectStoryWritingView(writingPackage),writingFacts=storyNovelFacts(writingPackage,writingView);
 const target:StoryPromptTarget=turn.privatePersonId?'private':'writer';
 const character=turn.privatePersonId?writingFacts.participants.find(p=>p.id===turn.privatePersonId)?.name??'人物':'主持人';
 // A deferred battle keeps the original player input so queued actions can resume.
 // That input is provenance, not a fresh departure/sparring request to the author.
 const battleIndex=turn.battleId?writingFacts.events.findIndex(e=>e.facts.battle?.id===turn.battleId):-1;
 if(turn.battleId&&(battleIndex<0||!writingPackage.facts.events.some(e=>e.facts.battle?.id===turn.battleId&&e.facts.battle.status==='已结束')))throw Error('战报写作缺少对应的已结束战斗来源');
 const section=writingPackage.origin.writingSection;
 const authorParts=activeWriterPromptParts(config).filter(part=>part.category!=='choices'||!section||section.includesEnding);
 const lengthPreference=storyLengthPreference(config,kind,writingPackage);
 const modeId=section?'battle-section-mode':(turn.battleId?'battle-':'')+(kind==='story-rewrite'?'rewrite-mode':'writer-mode');
 const mode=modelPromptText({},modeId);
 const authorInput=turn.battleId?JSON.stringify({kind:section?'battle-report-section':'battle-report',operation:mode,battleId:turn.battleId,playerIntent:turn.input,
  ...(section?{writingIntervalPath:`/events/${battleIndex}/facts/battle/writingInterval`,
   scope:{firstAction:section.firstSequence,lastAction:section.lastSequence,includesOpening:section.includesOpening,includesEnding:section.includesEnding},
     wholeBattleReference:Object.fromEntries(Object.entries({eventStatementPath:'eventStatement',openingPath:'opening',endingPath:'closing',outcomePath:'outcome',abilityCatalogPath:'usedAbilities'})
      .filter(([,key])=>Object.hasOwn(writingFacts.events[battleIndex].facts.wholeBattleReference,key))
      .map(([label,key])=>[label,`/events/${battleIndex}/facts/wholeBattleReference/${key}`]))}:{}),
  battleSourcePath:`/events/${battleIndex}/facts/battle`,
  precedingEventPaths:writingFacts.events.slice(0,battleIndex).map((_,i)=>`/events/${i}`),
  followingEventPaths:writingFacts.events.slice(battleIndex+1).map((_,i)=>`/events/${battleIndex+1+i}`),
 }):storySourceInput(turn);
 const compiled=compileStoryPrompt({...config,style:'',nsfw:''},{target,trigger:kind==='story-rewrite'?'regenerate':'normal',user:turn.after?.player?.name??'玩家',character,slots:{
  main:[...writerPromptMessages(config,promptMessage(kind),authorParts),promptDataMessage({factSource:{id:writingPackage.id,origin:writingPackage.origin,factsHash:writingPackage.factsHash},...compactStoryPacketReadings({writingFacts:compactBattlePassages(writingFacts),commerceReadings:commerceWritingReadings(writingPackage.facts,writingView.facts)}),mode,narrativeSummaries,recalledNarrative:recall,...(args.participantDialogue?.length?{participantDialogue:{audience:'当时说话的两人',excerpts:args.participantDialogue}}:{}),...(lengthPreference?{lengthPreference}:{}),...(args.previousSection?{previousSection:args.previousSection}:{})},{mode:modeId,...(lengthPreference?{'lengthPreference.instruction':'writer-length'}:{})},'system')],
  chatHistory:[...archivedStoryMessages(history.filter(e=>e.privatePersonId===turn.privatePersonId)),...(turn.battleId?[promptDataMessage(JSON.parse(authorInput),{operation:modeId})]:[{role:'user' as const,content:authorInput}])],
 }});
 let authorIndex=0;
 for(const trace of compiled.trace){
  if(trace.source!=='slot:main'||authorIndex>=authorParts.length)continue;
  const part=authorParts[authorIndex++];
  if(part.kind!=='instruction')trace.source=part.kind==='text'?`writer-prompt:${part.id}`:part.kind;
 }
 const promptStructure={strict:true as const,...(input.prefillMode?{prefillMode:input.prefillMode}:{}),...(compiled.prefill?{prefill:{content:compiled.prefill,mode:input.prefillMode}}:{})};
 compiled.notes.push('作者消费冻结规则结果的相关写作资料；完整来源与筛选记录保留，近期原文、检索来源及用户模块保留。');
 return {compiled,promptStructure,target,writingFacts,writingPackage,writingView,cards:storyWritingSectionCards(writingPackage,storyInlineCards(turn,writingFacts))};
}
