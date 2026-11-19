import {jsonEqual} from './json-identity';
import {storySourceInput} from './story-source-input';
import {remembersStoryTurn} from './cognition-view';
import {partyMessages,partyMessageMatchesTurn} from './story-party-chat';
import {validateCommunicationSource} from './story-communication';
import type {StoryTurn} from '../runtime/story-turns';
import {storySearchTerms} from './story-search';

export interface HeardStatement {
 id:string;kind:'heard';speakerId:string;listenerId:string;text:string;truth:'unverified';
 source:{branchId:string;turn:number;step:number;revision:number;inputStart:number;inputEnd:number};
 assessment?:{stance:'believes'|'doubts'|'uncertain';reason:string;sourceId:string;revision:number};
 channel?:{kind:'soul-device';contactId:string}|{kind:'realm';realmId:string;captureEventId:string;deploymentId?:string}|{kind:'realm-visit';realmId:string;entryEventId:string};
 partyMessageId?:string;
 locationId:string;time:{day:number;hour:number;minute:number};
}
export function validateStoryKnowledge(state:any){
 const story=state.扩展?.story;
 for(const person of Object.values(state.人物?.列表??{}) as any[]){
  const records=person.扩展?.听闻记录;if(records===undefined)continue;
  if(!Array.isArray(records))throw Error('人物听闻记录格式无效');const ids=new Set<string>();
  for(const r of records){const s=r?.source;
   if(!r||Object.keys(r).some(k=>!['id','kind','speakerId','listenerId','text','truth','source','locationId','time','assessment','channel','partyMessageId'].includes(k))||typeof r.id!=='string'||!r.id||r.id.length>500||ids.has(r.id)||r.kind!=='heard'||r.truth!=='unverified'||r.listenerId!==person.id||r.speakerId!==state.角色?.主控单位ID||r.listenerId===r.speakerId||typeof r.text!=='string'||!r.text.trim()||r.text.length>2000||!state.地图?.地点?.[r.locationId])throw Error('人物听闻内容或参与者无效');
   if(!s||Object.keys(s).some(k=>!['branchId','turn','step','revision','inputStart','inputEnd'].includes(k))||typeof s.branchId!=='string'||!s.branchId||s.branchId.length>160||!Number.isSafeInteger(s.turn)||s.turn<1||s.turn>=story?.nextTurn||!Number.isSafeInteger(s.step)||s.step<0||s.step>11||!Number.isSafeInteger(s.revision)||s.revision<0||s.revision>state.系统.revision||!Number.isSafeInteger(s.inputStart)||s.inputStart<0||!Number.isSafeInteger(s.inputEnd)||s.inputEnd>8000||s.inputEnd-s.inputStart!==r.text.length)throw Error('人物听闻来源无效');
   if(r.assessment!==undefined){validateBeliefResponse({stance:r.assessment.stance,reason:r.assessment.reason});if(Object.keys(r.assessment).some(k=>!['stance','reason','sourceId','revision'].includes(k))||typeof r.assessment.sourceId!=='string'||!r.assessment.sourceId||r.assessment.sourceId.length>500||!Number.isSafeInteger(r.assessment.revision)||r.assessment.revision<s.revision||r.assessment.revision>state.系统.revision)throw Error('听闻判断来源无效');}
   if(r.partyMessageId!==undefined){const m=partyMessages(state).find(m=>m.id===r.partyMessageId);if(!m||!m.audience.some(a=>a.personId===person.id&&a.delivered)||r.assessment!==undefined)throw Error('队伍听闻缺少实际送达来源或误作独立判断');}
   validateCommunicationSource(state,person.id,r.channel,r.time);
   const t=r.time;if(!t||Object.keys(t).some(k=>!['day','hour','minute'].includes(k))||!Number.isSafeInteger(t.day)||t.day<1||!Number.isSafeInteger(t.hour)||t.hour<0||t.hour>23||!Number.isSafeInteger(t.minute)||t.minute<0||t.minute>59)throw Error('人物听闻时间无效');if(story?.active?.number===s.turn)statementMatchesTurn(r,story.active);ids.add(r.id);
  }
 }
}
/** Related older statements can outrank recent chatter; never infer a new listener or belief. */
export function personHeardStatements(state:any,personId:string,query=''){
 const terms=new Set(storySearchTerms(query).map(t=>t.term));
 const records:HeardStatement[]=(state.人物?.列表?.[personId]?.扩展?.听闻记录??[]).filter((r:HeardStatement)=>r.listenerId===personId&&r.speakerId===state.角色?.主控单位ID&&remembersStoryTurn(state,personId,r.source.turn));
 const ranked=records.map((record,index)=>({record,index,score:new Set(storySearchTerms(record.text).filter(t=>terms.has(t.term)).map(t=>t.term)).size}));
 ranked.sort((a,b)=>b.score-a.score||b.index-a.index);
 return {kind:'heard-statements',total:records.length,selected:structuredClone(ranked.slice(0,8).sort((a,b)=>a.index-b.index).map(r=>r.record)),meaning:'仅证明说话人曾向此人说出这些原话；内容可能是真话、谎言、猜测或传闻，不代表已被证实、被相信、被接受或完成任何行动。'};
}


export function statementMatchesTurn(record:HeardStatement,turn:StoryTurn){
 const r=turn.results[record.source.step];
 if(record.partyMessageId){const m=r?.receipt?.message;if(!m||m.id!==record.partyMessageId||m.text!==record.text||!m.audience.some((a:any)=>a.personId===record.listenerId&&a.delivered))throw Error('队伍听闻与本轮消息不一致');partyMessageMatchesTurn(m,turn);return;}
 if(turn.number!==record.source.turn||storySourceInput(turn).slice(record.source.inputStart,record.source.inputEnd)!==record.text||r?.action.kind!=='tell-person'||r.status!=='succeeded'||r.receipt?.type!=='person-heard-statement'||!jsonEqual(r.receipt.statement,record))throw Error('人物听闻与原始话语及结算来源不一致');
}


export function validateBeliefResponse(value:any):{stance:'believes'|'doubts'|'uncertain';reason:string}{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('人物听闻判断格式无效：需要判断对象');
 if(Object.keys(value).some(k=>!['stance','reason'].includes(k)))throw Error('人物听闻判断格式无效：包含额外字段');
 if(!['believes','doubts','uncertain'].includes(value.stance))throw Error('人物听闻判断格式无效：判断须为相信、怀疑或不确定');
 if(typeof value.reason!=='string'||!value.reason.trim())throw Error('人物听闻判断格式无效：缺少文字理由');
 if(value.reason.length>300)throw Error('人物听闻判断格式无效：理由超过300字');
 return {stance:value.stance,reason:value.reason};
}
export function pendingStoryBeliefs(state:any):HeardStatement[]{
 const turn=state.扩展?.story?.active;if(turn?.status!=='resolved')return [];
 const needed=new Set((turn.continuation?.plan?.segments??[]).slice(turn.continuation?.nextStep??0).filter((s:any)=>s.when?.belief).map((s:any)=>s.when.step));
 const ids=new Set(turn.results.filter((r:any)=>needed.has(r.step)&&r.status==='succeeded'&&r.receipt?.type==='person-heard-statement').map((r:any)=>r.receipt.statement.id));
 return Object.values(state.人物?.列表??{}).flatMap((p:any)=>(p.扩展?.听闻记录??[]).filter((r:HeardStatement)=>ids.has(r.id)&&!r.assessment));
}
