import type {StoryTurn} from '../runtime/story-turns';
import {storyPersonObservations} from './story-event-context';
import {remembersStoryTurn} from './cognition-view';
import {isPrivateMemoryKind,overlapsStoryQuote,type StorySummary} from './story-summary';

type Speech = {field:'input'|'prose';start:number;text:string;kind:'heard'|'address'|'reply'};
export interface DialogueMemory {branchId:string;turn:number;personId:string;scope:'private'|'scene';speech:Speech[]}

/** Direct addressees only. Being mentioned or listed in the scene confers no knowledge. */
export function dialogueParticipants(turn:StoryTurn){
 if(turn.privatePersonId)return [turn.privatePersonId];
 const ids=new Set<string>();
 for(const r of turn.results){
  if(r.status==='described'&&r.action.mode==='daily'&&typeof r.action.characterId==='string'){
   const ref=r.action.characterId;
   const present=(turn.before?.people??[]).find((p:any)=>(p.id===ref||p.canonicalId===ref)&&p.scope!=='resident-known');
   if(present)ids.add(present.id);
  }
  if(r.status!=='succeeded')continue;
  const c=r.receipt;
  const id=c?.type==='person-heard-statement'?c.statement?.listenerId:c?.type==='person-addressed'?c.address?.listenerId:c?.commitment?.personId;
  if(typeof id==='string')ids.add(id);
 }
 return [...ids];
}

export function turnDialogue(turn:StoryTurn,branchId:string,personId:string):DialogueMemory|null{
 if(turn.status!=='complete'||turn.partyChat||turn.battleId||turn.after?.communication?.available===false)return null;
 const speech:Speech[]=[];
 for(const r of turn.results){
  if(r.status!=='succeeded')continue;
  const c=r.receipt,record=c?.type==='person-heard-statement'?c.statement:c?.type==='person-addressed'?c.address:null;
  if(record?.listenerId===personId&&record.source?.turn===turn.number) speech.push({field:'input',start:record.source.inputStart,text:(record.text??record.intent).slice(0,300),kind:c!.statement?'heard':'address'});
 }
 if(turn.privatePersonId===personId&&turn.privateMessages?.length){
  let start=0;
  for(const message of turn.privateMessages){speech.push({field:'prose',start,text:message.slice(0,400),kind:'reply'});start+=message.length+2;}
 }else if(!turn.privatePersonId&&turn.prose){
  // Only an explicitly attributed line of direct speech is quotable. Prose remains narrative, never an action receipt.
  const people=storyPersonObservations(turn).map(o=>o.person);
  const name=people.find(p=>p?.id===personId)?.name;
  if(name&&!people.some(p=>p?.name===name&&p.id!==personId)){
   const says=(s:string)=>s===name||['说','说道','问','问道','答','答道','回答','回答道'].some(verb=>s===name+verb);
   for(const match of turn.prose.matchAll(/^(?:[ \t　]*)([^\s：“”「」]{1,40})[：:]\s*[“「]([^”」\r\n]{1,400})[”」]/gmu)){
    if(!says(match[1]))continue;
    speech.push({field:'prose',start:match.index!+match[0].indexOf(match[2],match[0].indexOf(match[1])+match[1].length),text:match[2],kind:'reply'});
   }
   for(const match of turn.prose.matchAll(/^[ \t　]*[“「]([^”」\r\n]{1,400})[”」][ \t　]*([^\s，。！？：、“”「」]{2,40})(?=[，。！？\s]|$)/gmu)){
    if(match[2]!==name&&says(match[2]))speech.push({field:'prose',start:match.index!+match[0].indexOf(match[1]),text:match[1],kind:'reply'});
   }
  }
 }
 return speech.length?{branchId,turn:turn.number,personId,scope:turn.privatePersonId?'private':'scene',speech:speech.slice(0,6)}:null;
}

/** Excerpts are narrative context for this participant only; the runtime settles actions separately. */
export function personalDialogue(state:any,value:unknown,personId:string,beforeTurn:number){
 if(!Array.isArray(value))return [];
 const ledger=state.扩展?.story;
 const summaries:StorySummary[]=[...(ledger?.summaries??[]),...(ledger?.stageSummaries??[]).flatMap((stage:any)=>stage.sources)];
 return value.slice(0,4).filter((r:any)=>r?.personId===personId&&state.人物?.列表?.[personId]&&typeof r.branchId==='string'&&r.branchId.length<=160&&Number.isSafeInteger(r.turn)&&r.turn>0&&r.turn<beforeTurn&&['private','scene'].includes(r.scope)&&Array.isArray(r.speech)&&remembersStoryTurn(state,personId,r.turn)).flatMap((r:DialogueMemory)=>{
  const hidden=summaries.filter(s=>s.source.branchId===r.branchId&&s.source.turn===r.turn&&s.source.privatePersonId===(r.scope==='private'?personId:undefined)).flatMap(s=>s.items.filter(i=>isPrivateMemoryKind(i.kind)).map(i=>i.quote));
  const speech=r.speech.slice(0,6).filter(s=>s&&Number.isSafeInteger(s.start)&&s.start>=0&&typeof s.text==='string'&&s.text.length>0&&s.text.length<=400&&(s.field==='prose'?s.kind==='reply':s.field==='input'&&['heard','address'].includes(s.kind))&&!hidden.some(q=>overlapsStoryQuote(q,{field:s.field,start:s.start,end:s.start+s.text.length}))).map(s=>({kind:s.kind,speakerId:s.kind==='reply'?personId:state.角色.主控单位ID,listenerId:s.kind==='reply'?state.角色.主控单位ID:personId,text:s.text}));
  return speech.length?[{personId,turn:r.turn,scope:r.scope,speech}]:[];
 });
}
