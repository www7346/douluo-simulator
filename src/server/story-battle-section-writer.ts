import type {ModelGateway,ChatMessage} from '../runtime/model-gateway';
import {ModelGatewayError} from '../runtime/model-gateway';
import type {PromptStructureOptions} from '../runtime/model-protocol';
import type {ModelRecoveryBudget} from '../runtime/model-recovery-budget';
import type {StoryTurn} from '../runtime/story-turns';
import {extractStoryInlineCards,type StoryInlineCard} from '../shared/story-inline-cards';
import type {StoryWritingPackage} from './story-writing-package';
import {selectStoryWritingView} from './story-writing-view';
import type {StoryWritingDiagnostics} from './story-writing-diagnostics';
import type {StoryWritingProgressStore} from './story-writing-progress';
import {previousWritingSection,type PreviousWritingSection} from './story-battle-writing-sections';
import {preflightStoryWritingCycle} from './story-writing-capacity';
import {writeStoryNovel,type StoryNovelReview} from './story-novel';
import {MAX_STORY_PROSE_LENGTH} from '../shared/story-prose';
export type PrepareWritingSection=(p:StoryWritingPackage,previous?:PreviousWritingSection)=>{compiled:{messages:ChatMessage[]};promptStructure:PromptStructureOptions;cards?:StoryInlineCard[];authorTask?:string;writingView?:ReturnType<typeof selectStoryWritingView>};
export interface SectionWritingRecovery {store?:StoryWritingProgressStore;authorStore?:StoryWritingProgressStore;beforeRequest?:(requiredRecovery?:number)=>void}
export function joinStoryWritingSections(sections:{raw:string;prose:string;cards:StoryInlineCard[]}[]){
 const prose=sections.map(s=>s.prose).join('\n\n'),placements:{offset:number;cardId:string}[]=[],cards=new Map<string,StoryInlineCard>();let start=0;
 try{
 for(const [index,section] of sections.entries()){
  for(const card of section.cards){const existing=cards.get(card.id);if(existing&&JSON.stringify(existing)!==JSON.stringify(card))return {rawProse:prose,prose};cards.set(card.id,card);}
  const parsed=extractStoryInlineCards(section.raw,section.cards);
  if(parsed.prose!==section.prose||parsed.omitted.length)return {rawProse:prose,prose};
  for(const placement of parsed.presentation?.placements??[])placements.push({...placement,offset:start+placement.offset+(placement.offset===section.prose.length&&index<sections.length-1?1:0)});
  start+=section.prose.length+2;
 }
 let raw=prose;for(const placement of [...placements].reverse())raw=raw.slice(0,placement.offset)+`[[card:${placement.cardId}]]`+raw.slice(placement.offset);
 const joined=extractStoryInlineCards(raw,[...cards.values()]);
 if(joined.prose!==prose||joined.omitted.length||JSON.stringify(joined.presentation?.placements??[])!==JSON.stringify(placements))return {rawProse:prose,prose};
 return {rawProse:raw,prose};
 }catch{return {rawProse:prose,prose};}
}


export function preflightWritingSection(gateway:ModelGateway,p:StoryWritingPackage,prepare:PrepareWritingSection,previous?:PreviousWritingSection){
 const prompt=prepare(p,previous);
 return preflightStoryWritingCycle(gateway,p,prompt.compiled.messages,prompt.promptStructure,{previous,cards:prompt.cards,authorTask:prompt.authorTask});
}
/** Capacity may require several author calls. Paid sections remain cached and
 * are joined directly, without a second content-review request. */
export async function writeBattleSections(args:{source:StoryWritingPackage;cards:StoryInlineCard[];sections:StoryWritingPackage[];turn:StoryTurn;prepare:PrepareWritingSection;gateway:ModelGateway;budget:ModelRecoveryBudget;signal:AbortSignal;history:any[];diagnostics?:StoryWritingDiagnostics;recovery?:SectionWritingRecovery}){
 const {sections,prepare,gateway,signal,diagnostics,recovery}=args;
 const drafts:{section:StoryWritingPackage;prose:string}[]=[],parts:{packageId:string;firstSequence:number;lastSequence:number;resumed:boolean;reviews:StoryNovelReview[]}[]=[];
 for(const section of sections){
  signal.throwIfAborted();
  const prior=drafts.at(-1),previous=prior?previousWritingSection(prior.section.id,prior.prose):undefined,prompt=prepare(section,previous);
  preflightStoryWritingCycle(gateway,section,prompt.compiled.messages,prompt.promptStructure,{previous,cards:prompt.cards,authorTask:prompt.authorTask});
  diagnostics?.beginSection(section,prompt.writingView??selectStoryWritingView(section));
  let written:Awaited<ReturnType<typeof writeStoryNovel>>;
  try{written=await writeStoryNovel({source:section,gateway,messages:prompt.compiled.messages,promptStructure:prompt.promptStructure,task:prompt.authorTask??'story-writer',signal,diagnostics,recovery,recoveryBudget:args.budget});}
  catch(error){if(error&&typeof error==='object'&&drafts.length)Object.assign(error,{partialProse:drafts.map(d=>d.prose).join('\n\n'),completedSections:parts.map(part=>({...part}))});throw error;}
  drafts.push({section,prose:written.prose});
  if(drafts.map(d=>d.prose).join('\n\n').length>MAX_STORY_PROSE_LENGTH)throw new ModelGatewayError('invalid-response','整篇战报超过实际保存容量，已写段落和原稿均已保留。');
  const scope=section.origin.writingSection!;
  parts.push({packageId:section.id,firstSequence:scope.firstSequence,lastSequence:scope.lastSequence,resumed:written.resumed,reviews:written.reviews});
 }
 signal.throwIfAborted();return {prose:drafts.map(d=>d.prose).join('\n\n'),parts,recovery:args.budget.snapshot()};
}
