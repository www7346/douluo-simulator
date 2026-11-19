import {rules} from '../rules';
import {communicationAvailability,soulContact} from '../shared/story-communication';
import {compileCommitment} from '../runtime/story-social-writing-facts';
import {personCommitments} from '../runtime/story-commitments';
import {promptDataMessage,promptMessage} from '../runtime/model-prompt-templates';
import {conversationWriterMessages} from '../runtime/story-writer-prompts';
import type {StoryTurn,StoryLedger} from '../runtime/story-turns';
import {validatePrivateMessages} from '../shared/story-private-messages';
import {compileStoryPrompt,conversationPromptConfig} from '../runtime/story-prompts';
import {personalDialogue} from '../shared/story-dialogue-memory';
import {personDeliveredInputQuotes,selectPersonStorySummaries} from '../shared/story-summary';
import {checkedStoryRecall,personStoryRecall} from '../shared/story-recall';
import {storySearchTerms} from '../shared/story-search';
import {personAddresses} from '../runtime/story-addresses';
import {personHeardStatements} from '../shared/story-person-knowledge';
import {createStoryWritingPackage,assertStoryWritingPackageCurrent} from './story-writing-package';
import {selectStoryWritingView} from './story-writing-view';
import {ModelRecoveryBudget} from '../runtime/model-recovery-budget';
import type {ModelGateway} from '../runtime/model-gateway';
import {readStoryAuthorJson,writeStoryAuthor} from './story-novel';
import type {SectionWritingRecovery} from './story-battle-section-writer';
import {issueWorkflowTicket} from './workflow-ticket';
import type {GameSnapshot} from '../runtime/contracts';
import type {StoryWritingDiagnostics} from './story-writing-diagnostics';
import {remembersStoryTurn,remembersRecord} from '../shared/cognition-view';
import {MAX_STORY_PROSE_LENGTH} from '../shared/story-prose';

function sharedPrivateHistory(state:any,personId:string,query:string){
 const playerId=state.角色.主控单位ID,person=state.人物.列表[personId],ext=person.扩展??{};
 const remembered=(r:any)=>remembersRecord(state,personId,r);
 const heard=personHeardStatements(state,personId,query).selected.map(r=>({turn:r.source.turn,speakerId:r.speakerId,listenerId:r.listenerId,heard:r.text}));
 const addresses=personAddresses(state,personId,query).selected.map((r:any)=>({turn:r.source.turn,speakerId:r.speakerId,listenerId:r.listenerId,intent:r.intent}));
 const terms=new Set(storySearchTerms(query).map(hit=>hit.term));
 function relevant<T>(rows:T[],limit:number,textOf:(row:T)=>string){
  return rows.map((row,index)=>({row,index,score:new Set(storySearchTerms(textOf(row)).filter(hit=>terms.has(hit.term)).map(hit=>hit.term)).size}))
   .sort((a,b)=>b.score-a.score||b.index-a.index).slice(0,limit).sort((a,b)=>a.index-b.index).map(hit=>hit.row);
 }
 const decisions=relevant(personCommitments(state,personId).filter(remembered),8,(r:any)=>[r.itemName,r.relationship,...r.events.map((e:any)=>e.reason)].filter(Boolean).join(' '))
  .map((r:any)=>({kind:r.kind,status:r.status,terms:compileCommitment(r).terms,relationship:r.relationship,lastDecision:r.events?.findLast((e:any)=>e.reason)?.reason}));
 const shared=relevant((ext.共同见闻??[]).filter((r:any)=>r.playerId===playerId&&r.participants?.includes(personId)&&remembered(r)),5,(r:any)=>[r.summary,r.from?.name,r.to?.name].filter(Boolean).join(' '))
  .map((r:any)=>({kind:r.kind,from:r.from?.name,to:r.to?.name,summary:r.summary}));
 const kindness=(ext.善意往来??[]).filter((e:any)=>e.playerId===playerId&&remembered(e)).slice(-3).map((e:any)=>({day:e.day,kind:e.name}));
 const worn=rules.custody.attached(state,personId).map((item:any)=>item.name??item.名称).filter(Boolean);
 return {heard,addresses,decisions,shared,kindness,worn,hasContact:!!soulContact(state,personId)};
}

export function preparePrivateReplyPrompt(snapshot:GameSnapshot,input:Record<string,any>,worldId:string|null=null){
 const state=snapshot.state as any,ledger:StoryLedger=state.扩展.story,turn:StoryTurn=ledger.active!;
 if(!turn?.privatePersonId||turn.status!=='resolved'||input.branchId!==ledger.branchId||input.turn!==turn.number)throw Error('私聊尚未结算或已经完成');
 const rawHistory=input.history??[];
 const history=Array.isArray(rawHistory)?rawHistory.filter((e:any)=>remembersStoryTurn(state,turn.privatePersonId!,e?.number)):rawHistory;
 if(!Array.isArray(history)||history.length>12||history.some((e:any)=>!e||!Number.isSafeInteger(e.number)||e.number>=turn.number||typeof e.input!=='string'||e.input.length>8000||typeof e.prose!=='string'||e.prose.length>MAX_STORY_PROSE_LENGTH))throw Error('私聊历史格式无效');
 const writingPackage=createStoryWritingPackage(snapshot,worldId,turn),writingView=selectStoryWritingView(writingPackage);
 const originalConfig=input.prompts??undefined,config=conversationPromptConfig(originalConfig);
 const personId=turn.privatePersonId,channel=turn.after?.communication??communicationAvailability(state,personId);
 const meetingMode=channel.mode==='in-person'&&channel.channel?.kind==='realm'?'画境联系':channel.label;
 const received=personDeliveredInputQuotes(state,personId,{branchId:ledger.branchId,turn:turn.number}).map(q=>q.text);
 const dialogue=personalDialogue(state,input.dialogue,personId,turn.number);
 const recall=personStoryRecall(state,personId,checkedStoryRecall(input.recall,turn.number,personId));
 const summaries=selectPersonStorySummaries(state,turn.number,personId,recall.map(r=>r.source.turn),turn.input);
 const currentFacts={...writingView.facts,events:writingView.facts.events.map(event=>({...event,intent:received.filter(q=>event.intent.includes(q)).join(' ')}))};
 const compiled=compileStoryPrompt(config,{target:'private',trigger:'normal',user:turn.after?.player?.name??'玩家',character:state.人物.列表[turn.privatePersonId]?.name??'对方',slots:{main:[...conversationWriterMessages(originalConfig??config,promptMessage('private-chat'),'private'),promptDataMessage({factSource:{id:writingPackage.id,origin:writingPackage.origin,factsHash:writingPackage.factsHash},writingFacts:currentFacts,recipientId:personId,meetingMode,canSeePlayer:channel.canSeePlayer??(channel.mode==='in-person'&&rules.actions.perception(state,personId,state.角色.主控单位ID,'vision')),sharedHistory:sharedPrivateHistory(state,personId,turn.input),participantDialogue:dialogue,recall,summaries},{},'system')],chatHistory:[{role:'user',content:received.length?[...new Set(received)].join('\n'):'请按本次已发生的交流，以本人的口吻回应。'}]}});
 return {compiled,writingPackage,writingView,promptStructure:{strict:true as const},target:'private' as const,turn,ledger,history,recall};
}
export async function runPrivateReplies(snapshot:GameSnapshot,worldId:string,input:Record<string,any>,gateway:ModelGateway,secret:string,signal:AbortSignal,diagnostics?:StoryWritingDiagnostics,recovery?:SectionWritingRecovery){
 const p=preparePrivateReplyPrompt(snapshot,input,worldId),recoveryBudget=gateway.recoveryBudget??new ModelRecoveryBudget();
 if(p.turn.after?.communication?.available===false)return {ticket:issueWorkflowTicket(secret,worldId,snapshot,{type:'story.finish',payload:{branchId:input.branchId,turn:input.turn,privateMessages:[]}}),value:{stage:'writer',privateMessageCount:0}};
 gateway.checkPrompt(p.compiled.messages,{task:'private-chat',promptStructure:p.promptStructure});diagnostics?.bindPackage(p.writingPackage,p.writingView);
 const written=await writeStoryAuthor({source:p.writingPackage,gateway,messages:p.compiled.messages,promptStructure:p.promptStructure,task:'private-chat',signal,diagnostics,recoveryBudget,recovery});
 const value=readStoryAuthorJson(written.raw),texts=Array.isArray(value)?value:Array.isArray(value?.messages)?value.messages:typeof value?.messages==='string'?[value.messages]:typeof value?.text==='string'?[value.text]:[written.raw];
 const messages=validatePrivateMessages({messages:texts.filter((text:any)=>typeof text==='string'&&text.trim()).map((text:string)=>text.trim())});
 assertStoryWritingPackageCurrent(p.writingPackage,snapshot,worldId);signal.throwIfAborted();
 return {ticket:issueWorkflowTicket(secret,worldId,snapshot,{type:'story.finish',payload:{branchId:input.branchId,turn:input.turn,privateMessages:messages}}),value:{stage:'writer',privateMessageCount:messages.length,consistency:{packageId:p.writingPackage.id,policy:'author-only',resumed:written.resumed,reviews:[],recovery:recoveryBudget.snapshot()}}};
}
