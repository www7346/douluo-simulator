import {ModelGatewayError,type ChatMessage,type ModelGateway} from '../runtime/model-gateway';
import type {PromptStructureOptions} from '../runtime/model-protocol';
import type {StoryTurn} from '../runtime/story-turns';
import {completeStoryInlinePresentation,extractStoryInlineCards,inlineStoryWithMarkers,type StoryInlineCard} from '../shared/story-inline-cards';
import {storyFactReferenceReading,storyFactReferenceValue} from './story-fact-references';
import type {StoryWritingPackage} from './story-writing-package';
import {selectStoryWritingView,type StoryWritingView} from './story-writing-view';
import {storyWritingProgressKey,type StoryWritingProgressStore,type StorySectionProgress} from './story-writing-progress';
import type {StoryWritingDiagnostics} from './story-writing-diagnostics';
import {ModelRecoveryBudget} from '../runtime/model-recovery-budget';
import {MAX_STORY_PROSE_LENGTH} from '../shared/story-prose';
import {jsonrepair} from 'jsonrepair';

export const STORY_NOVEL_VERSION=1;
export type StoryNovelReview={requested:boolean;major:number;minorOrUncertain:number;unverified:number};

/** Recover a message envelope locally; this never requests another model. */
export function readStoryAuthorJson(raw:string):any{
 const source=raw.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
 const start=source.indexOf('{'),end=source.lastIndexOf('}');
 const candidates=[source,...(start>=0&&end>start?[source.slice(start,end+1)]:[])];
 for(const text of candidates){try{return JSON.parse(text);}catch{/* Try the intact local envelope. */}}
 if(source.startsWith('{')||source.startsWith('['))try{return JSON.parse(jsonrepair(source));}catch{/* Original visible text remains available. */}
 return undefined;
}

/** A reading of frozen facts for prose, not another mechanical state. Detailed
 * evidence stays in the package and the player's report. */
export function storyNovelFacts(source:StoryWritingPackage,view:StoryWritingView=selectStoryWritingView(source)){
 if(view.sourcePackageId!==source.id||view.sourceFactsHash!==source.factsHash)throw Error('正文资料与冻结来源不一致');
 const facts=structuredClone(view.facts);
 for(const event of facts.events){
  const battle=event.facts.battle;
  if(!battle?.account?.passages)continue;
  battle.account.passages=battle.account.passages.map((passage:any)=>({kind:passage.kind,statement:passage.statement}));
 }
 return facts;
}

/** Internal transport marks are optional decoration. Their absence never
 * licenses fabricated event ranges or a guessed factual replacement. */
export function readStoryNovel(raw:string,source:StoryWritingPackage){
 let prose=raw;
 if(/\[\[fact:/.test(prose)){
  const paths=storyFactReferenceReading(source).paths;
  prose=prose.replace(/\[\[fact:([a-f0-9]{12})\]\]/g,(_,id)=>{
   const path=paths.get(id);return path?storyFactReferenceValue(source,path):'';
  });
 }
 prose=prose.replace(/\[\[\s*\/?\s*(?:unit|card|fact)\s*:[^\]\r\n]*(?:\]\]?|(?=\r?$))/gmu,'').trim();
 if(!prose)throw new ModelGatewayError('invalid-response','这次没有收到小说正文，可以重新生成或先继续旅程。');
 if(prose.length>MAX_STORY_PROSE_LENGTH)throw new ModelGatewayError('invalid-response','这篇正文超过实际保存容量，原稿已保留。');
 return prose;
}

/** Only first-appearance portraits have a reliable whole-prose default.
 * Battle/check cards remain available in the existing results panel. */
export function storyNovelPresentation(prose:string,cards:StoryInlineCard[],previous?:StoryTurn){
 try{
  const prior=previous?.prose&&prose.startsWith(previous.prose)?extractStoryInlineCards(inlineStoryWithMarkers(previous,cards)+prose.slice(previous.prose.length),cards).presentation:undefined;
  const retained=new Set(prior?.placements.map(p=>p.cardId));
  return completeStoryInlinePresentation(prose,prior,cards.filter(card=>card.kind==='person'||retained.has(card.id)));
 }catch{return undefined;}
}

/** Cache a paid, complete candidate before presentation; an explicit reroll's
 * existing attempt scope gives it a fresh store without repeating game actions. */
export async function writeStoryAuthor(args:{source:StoryWritingPackage;gateway:ModelGateway;messages:ChatMessage[];promptStructure:PromptStructureOptions;task:string;signal:AbortSignal;diagnostics?:StoryWritingDiagnostics;recoveryBudget?:ModelRecoveryBudget;recovery?:{store?:StoryWritingProgressStore;authorStore?:StoryWritingProgressStore;beforeRequest?:(required?:number)=>void}}){
 const {source,gateway,messages,promptStructure,task,signal,diagnostics,recovery}=args;
 const key=storyWritingProgressKey(['readable-novel',STORY_NOVEL_VERSION,source.id,messages,promptStructure,gateway.identity(task),gateway.settings(task)]);
 const cached=recovery?.store?.read(key)??recovery?.authorStore?.read(key);
 const progress:StorySectionProgress=cached??{version:1,packageId:source.id};
 if(progress.packageId!==source.id)throw Error('已生成正文与当前事实不一致');
 const save=()=>{recovery?.store?.write(key,progress);recovery?.authorStore?.write(key,progress);};
 const budget=args.recoveryBudget??gateway.recoveryBudget??new ModelRecoveryBudget();
 if(progress.initialRaw===undefined){
  signal.throwIfAborted();recovery?.beforeRequest?.();
  const result=await gateway.chat(messages,{task,signal,promptStructure,recoveryBudget:budget});
  progress.initialRaw=(result.prefill??'')+result.content;
  // The paid author output is durable before presentation, parsing, or cancellation.
  // Historical review/repair fields never decide whether this draft may publish.
  if(progress.initialRaw!.length<=MAX_STORY_PROSE_LENGTH)save();
  signal.throwIfAborted();
 }
 diagnostics?.review(progress.initialRaw!);
 signal.throwIfAborted();return {raw:progress.initialRaw!,resumed:!!cached,recovery:budget.snapshot()};
}

/** Publish the author's visible words directly; presentation is optional. */
export async function writeStoryNovel(args:Parameters<typeof writeStoryAuthor>[0]){
 const written=await writeStoryAuthor(args);
 return {...written,prose:readStoryNovel(written.raw,args.source),reviews:[] as StoryNovelReview[]};
}
