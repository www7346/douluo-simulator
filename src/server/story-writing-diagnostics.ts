import type {StoryRepetitionConflict} from '../runtime/story-repetition-checks';
import type {ModelLog} from '../runtime/model-gateway';
import type {StoryFactReview} from './story-fact-review';
import type {StoryWritingPackage} from './story-writing-package';
import type {StoryWritingView} from './story-writing-view';
export interface StoryWritingDraft {phase:'initial'|'repair';prose:string;writingPackage?:StoryWritingPackage;writingSelection?:Omit<StoryWritingView,'facts'>;factReview?:StoryFactReview;repetitionConflicts?:StoryRepetitionConflict[];section?:{id:string;origin:StoryWritingPackage['origin'];factsHash:string;writingSelection:Omit<StoryWritingView,'facts'>}}
export type StoryWritingReviewer=(draft:StoryWritingDraft)=>void;

/** One workflow's local diagnostics. Never retain prose, names, prompts or provider errors. */
export class StoryWritingDiagnostics {
 readonly id=crypto.randomUUID();readonly at=new Date().toISOString();readonly started=Date.now();
 private calls=new Map<string,{callId:string;task:string;elapsedMs:number;attempts:any[]}>();
 private section:StoryWritingDraft['section'];
 constructor(private readonly observe:(log:ModelLog)=>void,private readonly reviewer?:StoryWritingReviewer){}
 /** Explicit in-process evaluation sink only; never attached to the ordinary log channel. */
 review(prose:string){this.reviewer?.({phase:'initial',prose,...(this.section?{section:this.section}:{})});}
 beginSection(p:StoryWritingPackage,view:StoryWritingView){const {facts,...selection}=view;this.section={id:p.id,origin:p.origin,factsHash:p.factsHash,writingSelection:selection};this.review('');}
 bindPackage(writingPackage:StoryWritingPackage,writingView?:StoryWritingView){
  const writingSelection=writingView?(({facts,...selection})=>selection)(writingView):undefined;
  this.reviewer?.({phase:'initial',prose:'',writingPackage,...(writingSelection?{writingSelection}:{})});
 }
 capture(log:ModelLog){
  if(!['story-writer','story-rewrite','private-chat','party-chat'].includes(log.detail?.task))return;
  const number=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;
  this.calls.set(log.id,{callId:log.id,task:log.detail.task,elapsedMs:number(log.detail.elapsedMs)??0,
   attempts:(log.detail.attempts??[]).map((a:any)=>({attempt:number(a.attempt),elapsedMs:number(a.elapsedMs),firstByteMs:number(a.firstByteMs),firstReasoningMs:number(a.firstReasoningMs),firstContentMs:number(a.firstContentMs),lastContentMs:number(a.lastContentMs),streaming:a.streaming,estimatedInput:number(a.estimatedInput),outputCharacters:number(a.contentCharacters),
    inputTokens:number(a.usage?.prompt_tokens),outputTokens:number(a.usage?.completion_tokens),totalTokens:number(a.usage?.total_tokens)}))});
 }
 finish(){this.emit('正文生成完成','completed');}
 fail(cancelled:boolean){this.emit(cancelled?'正文生成已取消':'正文生成未完成',cancelled?'cancelled':'failed');}
 private emit(status:string,outcome:string){
  const calls=[...this.calls.values()],attempts=calls.flatMap(c=>c.attempts);
  const usage=(list:any[])=>({reportedInputTokens:list.reduce((sum,a)=>sum+(a.inputTokens??0),0),reportedOutputTokens:list.reduce((sum,a)=>sum+(a.outputTokens??0),0),
   reportedTotalTokens:list.reduce((sum,a)=>sum+(a.totalTokens??0),0),attemptsMissingUsage:list.filter(a=>a.inputTokens===null||a.outputTokens===null||a.totalTokens===null).length});
  this.observe({id:this.id,at:this.at,label:'正文生成',status,detail:{elapsedMs:Date.now()-this.started,attempts:[],storyWriting:{
   coverage:'author-only',outcome,authorRequests:calls.length,networkAttempts:attempts.length,
   calls:structuredClone(calls),usage:usage(attempts)}}});
 }
}
