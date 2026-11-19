import {promptDataMessage,promptMessage} from '../runtime/model-prompt-templates';
import {conversationWriterMessages} from '../runtime/story-writer-prompts';
import {partyProposalReplies} from '../shared/story-party-proposals';
import {compileStoryPrompt,conversationPromptConfig} from '../runtime/story-prompts';
import {partyReplyAudience,partySpeakerFacts} from '../runtime/story-party-chat';
import {partyMessageForTurn,validatePartyReplyProposal} from '../shared/story-party-chat';
import {issueWorkflowTicket} from './workflow-ticket';
import type {GameSnapshot} from '../runtime/contracts';
import {ModelGatewayError,type ModelGateway} from '../runtime/model-gateway';
import {ModelRecoveryBudget} from '../runtime/model-recovery-budget';
import {createStoryWritingPackage,assertStoryWritingPackageCurrent,derivePartySpeakerPackage} from './story-writing-package';
import {compileStoryWritingFacts} from '../runtime/story-writing-facts';

import {selectStoryWritingView} from './story-writing-view';
import {readStoryAuthorJson,writeStoryAuthor} from './story-novel';
import type {SectionWritingRecovery} from './story-battle-section-writer';
import type {StoryWritingDiagnostics} from './story-writing-diagnostics';
import {preflightStoryWritingCycle} from './story-writing-capacity';

export {STORY_PARTY_AUTHOR_CONTRACT} from './story-author-contract';

type PartyReply = {speakerId:string;text:string};

function partyPromptForTurn(snapshot:GameSnapshot,input:Record<string,any>,worldId:string|null) {
 const state=snapshot.state as any, ledger=state.扩展.story, turn=ledger.active;
 if(turn?.status!=='resolved'||input.branchId!==ledger.branchId||input.turn!==turn.number)throw Error('队伍消息尚未结算或已经完成');
 const message=partyMessageForTurn(turn), recipients=message?partyReplyAudience(state,message):[];
 const base=createStoryWritingPackage(snapshot,worldId,turn);
 const originalConfig=input.prompts??undefined,config=conversationPromptConfig(originalConfig);
 // Reuse only the common source of this message. Each speaker still has a separate view and recovery key.
 return function prepare(speakerId?:string,earlierReplies:readonly PartyReply[]=[]) {
  const audience=speakerId===undefined?recipients:recipients.filter(person=>person.personId===speakerId);
  if(speakerId!==undefined&&!audience.length)throw Error('这位人物没有收到本次群消息');
  let writingPackage=base;
  if(speakerId&&message){
   const facts=partySpeakerFacts(state,message,speakerId);
   writingPackage=derivePartySpeakerPackage(base,speakerId,compileStoryWritingFacts({...turn,before:facts,after:facts},speakerId));
  }
  const writingView=selectStoryWritingView(writingPackage);
  // Only this turn's validated group replies are visible to a connected recipient.
  // The request (including these exact lines) is also part of the author recovery key.
  const sameTurnReplies=earlierReplies.flatMap(reply=>{
   const sender=recipients.find(person=>person.personId===reply.speakerId);
   return speakerId&&sender&&sender.personId!==speakerId?[{...reply,speaker:sender.name}]:[];
  });
  const packet={
   factSource:{id:writingPackage.id,origin:writingPackage.origin,factsHash:writingPackage.factsHash},
   writingFacts:writingView.facts,
   replyAudienceIds:audience.map(person=>person.personId),
   ...(sameTurnReplies.length?{sameTurnReplies}:{})
  };
  const compiled=compileStoryPrompt(config,{target:'party',trigger:'normal',user:state.人物.列表[state.角色.主控单位ID].name,character:speakerId?state.人物.列表[speakerId]?.name??'队伍成员':'队伍成员',slots:{
   main:[...conversationWriterMessages(originalConfig??config,promptMessage('party-chat'),'party'),promptDataMessage(packet,{},'system')],
   chatHistory:[{role:'user',content:message?.text??''}],
  }});
  if(compiled.prefill)throw Error('群回复使用说话人JSON协议，不能套用小说预填充；原配置未更改');
  return {compiled,audience,message,writingPackage,writingView,promptStructure:{strict:true as const}};
 };
}

export function preparePartyReplyPrompt(snapshot:GameSnapshot,input:Record<string,any>,worldId:string|null=null){
 return partyPromptForTurn(snapshot,input,worldId)(input.speakerId);
}
export async function runPartyReplies(snapshot:GameSnapshot,worldId:string,input:Record<string,any>,gateway:ModelGateway,secret:string,signal:AbortSignal,diagnostics?:StoryWritingDiagnostics,recovery?:SectionWritingRecovery){
 const prepare=partyPromptForTurn(snapshot,input,worldId), p=prepare(input.speakerId);
 gateway.checkTaskSettings('party-chat');
 diagnostics?.bindPackage(p.writingPackage,p.writingView);
 const ids=p.audience.map(a=>a.personId),recoveryBudget=gateway.recoveryBudget??new ModelRecoveryBudget();
 const generated=ids.length>0&&!p.message?.proposals;
 let resumed=false,messages=p.message?.proposals?partyProposalReplies(snapshot.state,p.message,ids):[];
 if(generated){
  for(const speakerId of ids){
   signal.throwIfAborted();
   const own=input.speakerId===speakerId?p:prepare(speakerId,messages);
   preflightStoryWritingCycle(gateway,own.writingPackage,own.compiled.messages,own.promptStructure,{authorTask:'party-chat'});
   const written=await writeStoryAuthor({source:own.writingPackage,gateway,messages:own.compiled.messages,promptStructure:own.promptStructure,task:'party-chat',signal,diagnostics,recoveryBudget,recovery});resumed=resumed||written.resumed;
   const value=readStoryAuthorJson(written.raw),rows=Array.isArray(value?.messages)?value.messages:Array.isArray(value)?value:[{speakerId:value?.speakerId??speakerId,text:typeof value?.text==='string'?value.text:written.raw}];
   if(!rows)throw new ModelGatewayError('invalid-response','群聊原稿已经保存，无法确定这些话的真实说话人；请查看原稿或明确重新生成。');
   messages.push(...validatePartyReplyProposal({messages:rows.map((row:any)=>({speakerId:row?.speakerId,text:typeof row?.text==='string'?row.text.trim():row?.text}))},[speakerId]));
  }
  messages=validatePartyReplyProposal({messages},ids);
 }
 assertStoryWritingPackageCurrent(p.writingPackage,snapshot,worldId);
 const consistency={packageId:p.writingPackage.id,factsHash:p.writingPackage.factsHash,policy:'author-only',generation:generated?'model':p.message?.proposals?'recorded-decisions':'no-audience',resumed,recovery:recoveryBudget.snapshot(),reviews:[]};
 signal.throwIfAborted();return {ticket:issueWorkflowTicket(secret,worldId,snapshot,{type:'story.finish',payload:{branchId:input.branchId,turn:input.turn,partyReplies:{messages}}}),value:{stage:'writer',partyReplyCount:messages.length,consistency}};
}
