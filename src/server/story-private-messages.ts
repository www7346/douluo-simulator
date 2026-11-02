import {rules} from '../rules';
import {communicationAvailability,soulContact} from '../shared/story-communication';
import {personCommitments} from '../runtime/story-commitments';
import {promptMessage} from '../runtime/model-prompt-templates';
import type {StoryTurn,StoryLedger} from '../runtime/story-turns';
import {validatePrivateMessages} from '../shared/story-private-messages';
import {compileStoryPrompt,conversationPromptConfig} from '../runtime/story-prompts';
import {archivedStoryMessages} from '../runtime/story-history-messages';
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

function sharedPrivateHistory(state:any,personId:string){
 const playerId=state.角色.主控单位ID,person=state.人物.列表[personId],ext=person.扩展??{};
 const remembered=(r:any)=>remembersRecord(state,personId,r);
 const heard=(ext.交谈意图??[]).filter((r:any)=>r.speakerId===playerId&&r.listenerId===personId&&remembered(r)).slice(-8)
  .map((r:any)=>({turn:r.source?.turn,heard:r.intent}));
 const decisions=personCommitments(state,personId).filter((r:any)=>remembered(r)).slice(-8)
  .map((r:any)=>({kind:r.kind,status:r.status,relationship:r.relationship,lastDecision:r.events?.at(-1)?.reason}));
 const shared=(ext.共同见闻??[]).filter((r:any)=>r.playerId===playerId&&r.participants?.includes(personId)&&remembered(r)).slice(-5)
  .map((r:any)=>({kind:r.kind,from:r.from?.name,to:r.to?.name,summary:r.summary}));
 const kindness=(ext.善意往来??[]).filter((e:any)=>e.playerId===playerId&&remembered(e)).slice(-3).map((e:any)=>({day:e.day,kind:e.name}));
 const worn=rules.custody.attached(state,personId).map((item:any)=>item.name??item.名称).filter(Boolean);
 return {heard,decisions,shared,kindness,worn,hasContact:!!soulContact(state,personId)};
}

export function preparePrivateReplyPrompt(snapshot:GameSnapshot,input:Record<string,any>,worldId:string|null=null){
 const state=snapshot.state as any,ledger:StoryLedger=state.扩展.story,turn:StoryTurn=ledger.active!;
 if(!turn?.privatePersonId||turn.status!=='resolved'||input.branchId!==ledger.branchId||input.turn!==turn.number)throw Error('私聊尚未结算或已经完成');
 const rawHistory=input.history??[];
 const history=Array.isArray(rawHistory)?rawHistory.filter((e:any)=>remembersStoryTurn(state,turn.privatePersonId!,e?.number)):rawHistory;
 if(!Array.isArray(history)||history.length>12||history.some((e:any)=>!e||!Number.isSafeInteger(e.number)||e.number>=turn.number||typeof e.input!=='string'||e.input.length>8000||typeof e.prose!=='string'||e.prose.length>MAX_STORY_PROSE_LENGTH))throw Error('私聊历史格式无效');
 const writingPackage=createStoryWritingPackage(snapshot,worldId,turn),writingView=selectStoryWritingView(writingPackage);
 const config=conversationPromptConfig(input.prompts??undefined);
 const compiled=compileStoryPrompt(config,{target:'private',trigger:'normal',user:turn.after?.player?.name??'玩家',character:state.人物.列表[turn.privatePersonId]?.name??'对方',slots:{main:[promptMessage('private-chat'),{role:'system',content:JSON.stringify({factSource:{id:writingPackage.id,origin:writingPackage.origin,factsHash:writingPackage.factsHash},writingFacts:writingView.facts,recipientId:turn.privatePersonId,meetingMode:communicationAvailability(state,turn.privatePersonId).label,sharedHistory:sharedPrivateHistory(state,turn.privatePersonId)})}],chatHistory:[...archivedStoryMessages(history.filter((e:any)=>e.privatePersonId===turn.privatePersonId)),{role:'user',content:turn.input}]}});
 return {compiled,writingPackage,writingView,promptStructure:{strict:true as const},target:'private' as const,turn,ledger,history,recall:[]};
}
export async function runPrivateReplies(snapshot:GameSnapshot,worldId:string,input:Record<string,any>,gateway:ModelGateway,secret:string,signal:AbortSignal,diagnostics?:StoryWritingDiagnostics,recovery?:SectionWritingRecovery){
 const p=preparePrivateReplyPrompt(snapshot,input,worldId),recoveryBudget=gateway.recoveryBudget??new ModelRecoveryBudget();
 if(p.turn.after?.communication?.available===false)return {ticket:issueWorkflowTicket(secret,worldId,snapshot,{type:'story.finish',payload:{branchId:input.branchId,turn:input.turn,privateMessages:[]}}),value:{stage:'writer',privateMessageCount:0}};
 gateway.checkPrompt(p.compiled.messages,{task:'private-chat',promptStructure:p.promptStructure});diagnostics?.bindPackage(p.writingPackage,p.writingView);
 const written=await writeStoryAuthor({source:p.writingPackage,gateway,messages:p.compiled.messages,promptStructure:p.promptStructure,task:'private-chat',signal,diagnostics,recoveryBudget,recovery});
 const value=readStoryAuthorJson(written.raw),texts=Array.isArray(value?.messages)?value.messages:typeof value?.messages==='string'?[value.messages]:typeof value?.text==='string'?[value.text]:[written.raw];
 const messages=validatePrivateMessages({messages:texts.filter((text:any)=>typeof text==='string'&&text.trim()).map((text:string)=>text.trim())});
 assertStoryWritingPackageCurrent(p.writingPackage,snapshot,worldId);signal.throwIfAborted();
 return {ticket:issueWorkflowTicket(secret,worldId,snapshot,{type:'story.finish',payload:{branchId:input.branchId,turn:input.turn,privateMessages:messages}}),value:{stage:'writer',privateMessageCount:messages.length,consistency:{packageId:p.writingPackage.id,policy:'author-only',resumed:written.resumed,reviews:[],recovery:recoveryBudget.snapshot()}}};
}
