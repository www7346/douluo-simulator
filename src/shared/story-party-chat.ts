import {jsonEqual} from './json-identity';
import {MAX_STORY_PROSE_LENGTH,MAX_STORY_MESSAGE_COUNT} from './story-prose';
import {storySourceInput} from './story-source-input';
import {validatePartyProposals,partyProposalReplies,publicPartyProposalDecisions,type PartyProposal} from './story-party-proposals';
import {storySearchTerms} from './story-search';
import {remembersStoryTurn} from './cognition-view';
import {validateCommunicationSource} from './story-communication';
import type {HeardStatement} from './story-person-knowledge';
import type {StoryTurn} from '../runtime/story-turns';

export interface PartyRecipient {personId:string;name:string;membershipId:string;membershipKind:'party'|'contract'|'projection';delivered:boolean;reason?:string;channel?:HeardStatement['channel']}
export const PARTY_CONVERSATION_ID='@party';
export const isPartyTurn=(turn:Partial<StoryTurn>|null|undefined)=>!!turn&&(turn.partyChat===true||!!turn.results?.some(r=>r.action.kind==='tell-party'));
export interface PartyReply {id:string;speakerId:string;text:string}
export interface PartyResponses {sourceId:string;revision:number;time:HeardStatement['time'];audience:PartyRecipient[];items:PartyReply[]}
export interface PartyMessage {id:string;text:string;speakerId:string;source:HeardStatement['source'];time:HeardStatement['time'];locationId:string;audience:PartyRecipient[];proposals?:PartyProposal[];responses?:PartyResponses}
export function partyMessages(state:any):PartyMessage[]{return state.扩展?.story?.partyMessages??[];}
/** Only speech heard by every current recipient is safe to put into one common model context. */
export function commonPartyMessages(state:any,personIds:string[],beforeTurn=Infinity,query=''){
 if(!personIds.length)return [];
 return selectPartyMemory(partyMessages(state).filter(m=>m.source.turn<beforeTurn&&personIds.every(id=>remembersStoryTurn(state,id,m.source.turn)&&m.audience.some(p=>p.personId===id&&p.delivered))),query,personIds).map(m=>({id:m.id,speakerId:m.speakerId,text:m.text,time:m.time,source:m.source,replies:(m.responses?.audience&&personIds.every(id=>m.responses!.audience.some(a=>a.personId===id))?m.responses.items:[]),proposalDecisions:publicPartyProposalDecisions(state,m,personIds),meaning:'当时共同收到的玩家原话；普通说法不是已证实事实或集体同意。proposalDecisions若非空，是当时公开的逐人独立回应，未列出者不推断其同意。'}));
}
export function partyMessageForTurn(turn:StoryTurn){return turn.results.find(r=>r.receipt?.type==='party-message-sent')?.receipt?.message as PartyMessage|undefined;}
export function partyMessageMatchesTurn(m:PartyMessage,turn:StoryTurn){
 if(m.responses&&turn.status==='complete'&&turn.prose!==partyReplyProse(m))throw Error('队伍正文与已保存的说话人消息不一致');
 const r=turn.results[m.source.step];
 for(const p of m.proposals??[]){const step=turn.results[p.step];if(step?.action.kind!==(p.kind==='loot'?'propose-loot':'propose-loot-resolution')||step.receipt?.commitment?.id!==p.commitmentId||step.receipt.commitment.personId!==p.personId||p.fresh!==(step.receipt.type==='commitment-proposed'))throw Error('群提议与本轮实际步骤不一致');}
 if(turn.number!==m.source.turn||turn.privatePersonId||turn.battleId||turn.results.filter(r=>r.step!==m.source.step).some(r=>r.action.kind==='tell-party')||r?.action.kind!=='tell-party'||r.status!=='succeeded'||r.action.text!==m.text||storySourceInput(turn).slice(m.source.inputStart,m.source.inputEnd)!==m.text||r.receipt?.type!=='party-message-sent'||!jsonEqual(r.receipt.message,m))throw Error('队伍消息与本轮原话或回执不一致');
}
function partyMembershipAt(state:any,a:PartyRecipient,speakerId:string,revision:number,time:HeardStatement['time']):boolean {
 if(a.membershipKind==='projection')return globalThis.SoulCombatDeployments.memberAt(state,a.membershipId,speakerId,a.personId,time.day*1440+time.hour*60+time.minute);
 const person=state.人物.列表[a.personId],records=a.membershipKind==='party'?person?.扩展?.社交约定:person?.扩展?.同行约定;
 const record=records?.find((r:any)=>r.id===a.membershipId&&r.playerId===speakerId&&(a.membershipKind!=='party'||r.kind==='party'));
 const last=record?.events?.filter((e:any)=>e.revision<=revision).at(-1);
 if(record)return a.membershipKind==='party'?last?.status==='completed':['accepted','active'].includes(last?.status);
 return a.membershipKind==='party'&&globalThis.SoulCooperationCore.wasMemberAt(state,a.membershipId,speakerId,a.personId,time.day*1440+time.hour*60+time.minute);
}
export function validatePartyMessages(state:any){
 const story=state.扩展?.story,raw=story?.partyMessages;if(raw===undefined)return;
 if(!Array.isArray(raw))throw Error('队伍消息记录无效');const ids=new Set<string>();
 for(const m of raw as PartyMessage[]){
  const s=m?.source,t=m?.time;
  if(!m||Object.keys(m).some(k=>!['id','text','speakerId','source','time','locationId','audience','responses','proposals'].includes(k))||typeof m.id!=='string'||!m.id||ids.has(m.id)||m.speakerId!==state.角色.主控单位ID||typeof m.text!=='string'||!m.text.trim()||m.text.length>2000||!state.地图.地点[m.locationId])throw Error('队伍消息内容无效');
  if(!s||Object.keys(s).some(k=>!['branchId','turn','step','revision','inputStart','inputEnd'].includes(k))||typeof s.branchId!=='string'||!s.branchId||!Number.isSafeInteger(s.turn)||s.turn<1||s.turn>=story.nextTurn||!Number.isSafeInteger(s.step)||s.step<0||s.step>11||!Number.isSafeInteger(s.revision)||s.revision<0||s.revision>state.系统.revision||!Number.isSafeInteger(s.inputStart)||s.inputStart<0||s.inputEnd!==s.inputStart+m.text.length||s.inputEnd>8000)throw Error('队伍消息来源无效');
  if(!t||Object.keys(t).some(k=>!['day','hour','minute'].includes(k))||!Number.isSafeInteger(t.day)||t.day<1||!Number.isSafeInteger(t.hour)||t.hour<0||t.hour>23||!Number.isSafeInteger(t.minute)||t.minute<0||t.minute>59)throw Error('队伍消息时间无效');
  if(!Array.isArray(m.audience)||!m.audience.length||m.audience.length>12)throw Error('队伍消息接收名单无效');const people=new Set<string>();
  for(const a of m.audience){
   if(!a||Object.keys(a).some(k=>!['personId','name','membershipId','membershipKind','delivered','reason','channel'].includes(k))||people.has(a.personId)||a.personId===m.speakerId||typeof a.name!=='string'||!a.name||typeof a.delivered!=='boolean'||!['party','contract','projection'].includes(a.membershipKind))throw Error('队伍消息成员无效');
   const person=state.人物.列表[a.personId];
   if(!partyMembershipAt(state,a,m.speakerId,s.revision,t))throw Error('队伍消息缺少发送时的有效成员来源');
   if(a.delivered?(a.reason!==undefined):typeof a.reason!=='string'||!a.reason||a.channel!==undefined)throw Error('队伍消息送达状态无效');
   validateCommunicationSource(state,a.personId,a.channel,t);
   const heard=(person.扩展?.听闻记录??[]).filter((r:HeardStatement)=>r.partyMessageId===m.id);
   if(a.delivered?(heard.length!==1||heard[0].text!==m.text||heard[0].speakerId!==m.speakerId||heard[0].locationId!==m.locationId||!jsonEqual(heard[0].time,m.time)||!jsonEqual(heard[0].source,s)||!jsonEqual(heard[0].channel,a.channel)):heard.length!==0)throw Error('队伍消息与实际接收人的听闻不一致');
   people.add(a.personId);
  }
  if(m.responses&&story.active?.number===s.turn&&story.active.status!=='complete')throw Error('群回复须与完成会话同时保存');
  validatePartyProposals(state,m);
  validatePartyResponses(state,m);
  if(story.active?.number===s.turn)partyMessageMatchesTurn(m,story.active);ids.add(m.id);
 }
}

export function validatePartyReplyProposal(value:any,speakerIds:string[]):{speakerId:string;text:string}[]{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>k!=='messages')||!Array.isArray(value.messages)||value.messages.length>MAX_STORY_MESSAGE_COUNT)throw Error('队伍回复消息格式不完整');
 const messages=value.messages.map((r:any)=>{if(!r||Object.keys(r).some(k=>!['speakerId','text'].includes(k))||!speakerIds.includes(r.speakerId)||typeof r.text!=='string'||!r.text.trim()||r.text.length>MAX_STORY_PROSE_LENGTH)throw Error('队伍回复须有实际接通的说话人和非空文字');return {speakerId:r.speakerId,text:r.text};});
 if(messages.reduce((n:number,r:{text:string})=>n+r.text.length+2,0)>MAX_STORY_PROSE_LENGTH)throw Error('回复超过单次保存容量，原稿仍可导出');
 return messages;
}
export function validatePartyResponses(state:any,m:PartyMessage){
 const b=m.responses;if(b===undefined)return;
 if(!b||Object.keys(b).some(k=>!['sourceId','revision','time','audience','items'].includes(k))||typeof b.sourceId!=='string'||!b.sourceId||!Number.isSafeInteger(b.revision)||b.revision<m.source.revision||b.revision>state.系统.revision||!Array.isArray(b.audience)||b.audience.length>12)throw Error('队伍回复来源无效');
 const t=b.time;if(!t||Object.keys(t).some(k=>!['day','hour','minute'].includes(k))||!Number.isSafeInteger(t.day)||t.day<1||!Number.isSafeInteger(t.hour)||t.hour<0||t.hour>23||!Number.isSafeInteger(t.minute)||t.minute<0||t.minute>59)throw Error('队伍回复时间无效');
 const seen=new Set<string>();for(const a of b.audience){const original=m.audience.find(p=>p.personId===a.personId&&p.delivered);if(!original||seen.has(a.personId)||a.membershipId!==original.membershipId||a.membershipKind!==original.membershipKind||a.name!==original.name||a.delivered!==true||a.reason!==undefined||Object.keys(a).some(k=>!['personId','name','membershipId','membershipKind','delivered','channel'].includes(k)))throw Error('队伍回复不能新增原消息未接通成员');
  if(!partyMembershipAt(state,a,m.speakerId,b.revision,b.time))throw Error('回复当时已经离队，不能接收新的队伍发言');validateCommunicationSource(state,a.personId,a.channel,b.time);seen.add(a.personId);
 }
 if(m.proposals&&!jsonEqual(b.items.map(r=>({speakerId:r.speakerId,text:r.text})),partyProposalReplies(state,m,b.audience.map(a=>a.personId))))throw Error('群提议回复与本人原回应不一致');
 if(!Array.isArray(b.items)||b.items.some(r=>!r||typeof r!=='object'))throw Error('队伍回复内容无效');validatePartyReplyProposal({messages:b.items.map(r=>({speakerId:r.speakerId,text:r.text}))},[...seen]);
 for(const [i,r] of b.items.entries())if(Object.keys(r).some(k=>!['id','speakerId','text'].includes(k))||r.id!==`${m.id}:reply:${i}`)throw Error('队伍回复编号不一致');
}
export function personPartyConversation(state:any,personId:string,query=''){
 return selectPartyMemory(partyMessages(state).filter(m=>remembersStoryTurn(state,personId,m.source.turn)&&m.audience.some(a=>a.personId===personId&&a.delivered)),query,[personId]).map(m=>({messageId:m.id,source:m.source,playerStatement:m.text,replies:m.responses?.audience.some(a=>a.personId===personId)?m.responses.items:[],proposalDecisions:publicPartyProposalDecisions(state,m,[personId]),meaning:'仅为本人当时实际听到且仍记得的队伍原话；普通说法不是世界事实或行动完成。proposalDecisions单独列出当时公开的真实约定回应，不代表已出发或交付。'}));
}

export function partyReplyProse(message:PartyMessage){return message.responses?.items.map(r=>`${message.responses!.audience.find(a=>a.personId===r.speakerId)!.name}：${r.text}`).join('\n\n')||'暂时没有新的队伍回复。';}

function selectPartyMemory(messages:PartyMessage[],query:string,personIds:string[]){
 const terms=new Set(storySearchTerms(query).map(t=>t.term));const recent=messages.slice(-4),earlier=messages.slice(0,-4).map(m=>({m,score:new Set(storySearchTerms(m.text+' '+(m.responses&&personIds.every(id=>m.responses!.audience.some(a=>a.personId===id))?m.responses.items.map(r=>r.text).join(' '):'')).filter(t=>terms.has(t.term)).map(t=>t.term)).size}));
 earlier.sort((a,b)=>b.score-a.score||b.m.source.turn-a.m.source.turn);return [...recent,...earlier.slice(0,8).map(r=>r.m)].sort((a,b)=>a.source.turn-b.source.turn);
}
