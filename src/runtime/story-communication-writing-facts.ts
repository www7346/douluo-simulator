import type {StoryEventNames} from './story-event-names';
import type {PartyRecipient} from '../shared/story-party-chat';
const copy=<T>(v:T):T=>structuredClone(v);
const pick=(v:any,keys:string[])=>Object.fromEntries(keys.filter(k=>v&&Object.hasOwn(v,k)).map(k=>[k,copy(v[k])]));
function known(v:any,fields:string[],label:string){const unknown=Object.keys(v).filter(k=>!['type','id','summary','meaning',...fields].includes(k));if(unknown.length)throw Error(`通讯资料缺少字段编译：${label}/${unknown.join(',')}`);}
export function compileCommunicationChannel(c:any){
 if(!c)return {mode:'当面'};
 if(c.kind==='realm'){known(c,['kind','realmId','captureEventId'],'画境渠道');return {mode:'画境联系',realmId:c.realmId,captureEventId:c.captureEventId};}
 known(c,['kind','contactId'],'渠道');if(c.kind!=='soul-device')throw Error(`通讯渠道缺少编译：${c.kind}`);
 return {mode:'远程魂导通讯',contactId:c.contactId};
}
export function compileStatement(r:any){
 known(r,['kind','speakerId','listenerId','text','truth','source','assessment','channel','partyMessageId','locationId','time'],'已送达原话');
 if(r.kind!=='heard'||r.truth!=='unverified')throw Error('听闻事实来源缺少编译');
 const stance:Record<string,string>={believes:'本人相信这句话',doubts:'本人怀疑这句话',uncertain:'本人尚不确定'};
 if(r.assessment){known(r.assessment,['stance','reason','sourceId','revision'],'本人判断');if(!stance[r.assessment.stance])throw Error('听闻判断缺少编译');}
 return {stage:'原话已被指定接收者听到',...pick(r,['id','speakerId','listenerId','text','source','partyMessageId','time']),
  channel:compileCommunicationChannel(r.channel),speakerLocationId:r.locationId,contentVerification:'原话内容尚无客观证实',
  listenerAssessment:r.assessment?{stage:stance[r.assessment.stance],...pick(r.assessment,['reason','sourceId','revision'])}:null};
}
export function compileAddress(r:any){
 known(r,['speakerId','listenerId','intent','source','privatePersonId','time','locationId','channel'],'交谈概述');
 return {stage:'已向指定人物表达交谈意图',...pick(r,['id','speakerId','listenerId','source','privatePersonId','time']),
  interactionIntent:r.intent,speakerLocationId:r.locationId,channel:compileCommunicationChannel(r.channel)};
}
const membershipLabels:Record<PartyRecipient['membershipKind'],string>={
 party:'自愿同伴', contract:'合同同伴', projection:'投影同行，由本人回应',
};
function recipient(r:PartyRecipient){
 known(r,['personId','name','membershipId','membershipKind','delivered','reason','channel'],'群消息接收者');
 if(!Object.hasOwn(membershipLabels,r.membershipKind))throw Error('群成员类型缺少编译');
 return {...pick(r,['personId','name','membershipId']),membership:membershipLabels[r.membershipKind],delivery:r.delivered?'已送达':'未送达',
  ...(r.delivered?{channel:compileCommunicationChannel(r.channel)}:{reason:r.reason})};
}
function proposals(rows:any[]){return rows.map(r=>{known(r,['kind','personId','commitmentId','step','fresh'],'已提出群约定');return {...pick(r,['id','kind','personId','commitmentId','step']),stage:r.fresh?'本次向本人提出':'沿用本人已有的约定'};});}
function publicDecision(r:any){
 known(r,['kind','personId','terms','accepted','reason'],'已公开的约定回应');
 return {...pick(r,['id','kind','personId','terms','reason']),decision:r.accepted?'本人当时接受此版条款':'本人当时拒绝此版条款'};
}
export function compilePartyMessage(m:any){
 known(m,['text','speakerId','source','time','locationId','audience','proposals','responses'],'群消息');
 if(m.responses)known(m.responses,['sourceId','revision','time','audience','items'],'群回复');
 return {stage:'队伍原话发送已结算',...pick(m,['id','text','speakerId','source','time']),speakerLocationId:m.locationId,
  audience:m.audience.map(recipient),proposals:proposals(m.proposals??[]),
  publishedReplies:m.responses?{...pick(m.responses,['sourceId','revision','time']),audience:m.responses.audience.map(recipient),statements:copy(m.responses.items)}:null};
}
export function compilePartyHistory(rows:any[]){return rows.map(r=>{
 known(r,['messageId','source','playerStatement','replies','proposalDecisions','speakerId','text','time'],'可知群聊历史');
 return {stage:'当前接收范围当时共同听见的原话',messageId:r.messageId??r.id,...pick(r,['source','speakerId','time']),playerStatement:r.playerStatement??r.text,
  replies:copy(r.replies??[]),publishedDecisions:(r.proposalDecisions??[]).map(publicDecision)};
});}
export function compileCommunicationContext(after:any){
 const result:Record<string,any>={};
 if(after.communication){const c=after.communication;known(c,['available','mode','reason','contactId','label','channel'],'当前接通状态');if(!['in-person','soul-device'].includes(c.mode))throw Error('当前通讯模式缺少编译');
  result.communication={mode:c.channel?.kind==='realm'?'画境联系':c.mode==='in-person'?'当面':'远程魂导通讯',available:c.available,...pick(c,['reason','contactId']),...(c.channel?{channel:compileCommunicationChannel(c.channel)}:{})};}
 if(after.personalKnowledge){const k=after.personalKnowledge;known(k,['kind','total','selected'],'听闻检索');result.personalKnowledge={totalRetained:k.total,selected:k.selected.map(compileStatement)};}
 if(after.personalContacts){const a=after.personalContacts;known(a,['total','selected'],'交谈检索');result.personalContacts={totalRetained:a.total,selected:a.selected.map(compileAddress)};}
 if(after.partyConversation)result.partyConversation=compilePartyHistory(after.partyConversation);
 if(after.partyChat&&typeof after.partyChat==='object'){const p=after.partyChat;known(p,['message','commonHistory'],'当前群聊');result.partyChat={currentMessage:p.message?compilePartyMessage(p.message):null,commonHistory:compilePartyHistory(p.commonHistory)};}
 return result;
}
export const COMMUNICATION_RECEIPT_FIELDS:Record<string,string[]>={
 'person-heard-statement':['personId','statement'],'person-addressed':['personId','address'],'party-message-sent':['message'],'person-contacted':['personId','name','channel'],
};
export function compileCommunicationReceipt(c:any){
 const fields=COMMUNICATION_RECEIPT_FIELDS[c.type];if(!fields)throw Error(`通讯回执缺少编译：${c.type}`);known(c,fields,c.type);
 if(c.type==='person-heard-statement')return compileStatement(c.statement);
 if(c.type==='person-addressed')return compileAddress(c.address);
 if(c.type==='party-message-sent')return compilePartyMessage(c.message);
 return {stage:'已接通人物',personId:c.personId,name:c.name,channel:compileCommunicationChannel(c.channel)};
}

export function communicationEventAccount(type:string,f:any,n:StoryEventNames):string{
 if(type==='person-contacted')return `已通过${f.channel.mode}接通${f.name??n.person(f.personId)}。`;
 if(type==='person-addressed')return `${n.person(f.speakerId)}通过${f.channel.mode}向${n.person(f.listenerId)}表达：${f.interactionIntent}。`;
 if(type==='person-heard-statement')return `${n.person(f.speakerId)}通过${f.channel.mode}对${n.person(f.listenerId)}说了原话“${f.text}”。${f.contentVerification}。${f.listenerAssessment?`${f.listenerAssessment.stage}；本人理由：${f.listenerAssessment.reason}。`:'接收者尚无已记录的判断。'}`;
 const lines=[`${n.person(f.speakerId)}向队伍发送原话“${f.text}”。`];
 for(const a of f.audience)lines.push(`${a.name??n.person(a.personId)}：${a.delivery}${a.channel?`（${a.channel.mode}）`:`，${a.reason}`}。`);
 if(!f.audience.length)lines.push('没有队伍接收者。');
 return lines.join('\n');
}
