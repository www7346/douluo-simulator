import {jsonEqual} from './json-identity';
import type {PartyMessage} from './story-party-chat';

export const PARTY_PROPOSAL_ACTIONS=['propose-loot','propose-loot-resolution'] as const;
export interface PartyProposal {kind:'loot'|'loot-resolution';id:string;personId:string;commitmentId:string;step:number;fresh:boolean}
const recordFor=(state:any,p:PartyProposal)=>(state.人物.列表[p.personId]?.扩展?.社交约定??[]).find((r:any)=>r.id===p.commitmentId);
export function partyProposalRecord(state:any,p:PartyProposal){return (p.kind==='loot'?state.远征?.扩展?.lootAgreements:state.远征?.扩展?.lootResolutions)?.find((r:any)=>r.id===p.id);}
export function validatePartyProposals(state:any,message:PartyMessage){
 if(message.proposals===undefined)return;
 if(!Array.isArray(message.proposals)||!message.proposals.length||message.proposals.length>3)throw Error('群提议记录无效');
 const seen=new Set();
 for(const p of message.proposals){
  if(!p||typeof p!=='object')throw Error('群提议记录无效');
  const r=recordFor(state,p),central=partyProposalRecord(state,p);
  if(!p||Object.keys(p).some(k=>!['kind','id','personId','commitmentId','step','fresh'].includes(k))||!['loot','loot-resolution'].includes(p.kind)||!Number.isSafeInteger(p.step)||p.step<=message.source.step||p.step>11||typeof p.fresh!=='boolean'||seen.has(p.personId)||!message.audience.some(a=>a.personId===p.personId&&a.delivered)||!r||r.kind!==p.kind||r.playerId!==state.角色.主控单位ID||!central||(p.kind==='loot'?central.playerId:central.proposerId)!==r.playerId)throw Error('群提议缺少已送达对象或本人原约定');
  if(p.fresh&&r.id!==`story:${message.source.branchId}:${message.source.turn}:${p.step}`)throw Error('群提议原回应来源不符');
  if(p.kind==='loot'?((r.allocationId!==p.id||!jsonEqual(central.terms,r.terms))&&central.inherited?.[p.personId]!==r.allocationId):r.resolutionId!==p.id)throw Error('群提议与原条款不符');
  seen.add(p.personId);
 }
 if(new Set(message.proposals.map(p=>`${p.kind}:${p.id}`)).size!==1)throw Error('同一群消息只协商一版重要条款');
}
/** These are the actual independent NPC answers, not a second model's paraphrase. */
export function partyProposalReplies(state:any,message:PartyMessage,personIds:string[]){
 return (message.proposals??[]).filter(p=>p.fresh&&personIds.includes(p.personId)).flatMap(p=>{
  const r=recordFor(state,p),decision=r?.events.find((e:any)=>['accepted','rejected'].includes(e.status));
  return decision?[{speakerId:p.personId,text:decision.reason}]:[];
 });
}
/** Historical common knowledge is limited to independently answered proposals actually
 * published to this message's reply audience. Never expose later private confirmations. */
export function publicPartyProposalDecisions(state:any,message:PartyMessage,personIds:string[]){
 if(!message.responses||!personIds.every(id=>message.responses!.audience.some(a=>a.personId===id)))return [];
 return (message.proposals??[]).filter(p=>p.fresh&&message.responses!.items.some(r=>r.speakerId===p.personId)).flatMap(p=>{
  const record=recordFor(state,p),decision=record?.events.find((e:any)=>['accepted','rejected'].includes(e.status)&&e.revision<=message.responses!.revision);
  return decision?[{id:p.id,kind:p.kind,personId:p.personId,terms:structuredClone(partyProposalRecord(state,p).terms),accepted:decision.status==='accepted',reason:decision.reason,meaning:'这位人物当时对这版条款的独立回应；不代表其他人同意，也不证明已出发或交付。'}]:[];
 });
}
/** Player-facing projection only. Never feed private later responses into common NPC context. */
export function partyProposalCards(state:any){
 const cards=new Map<string,any>();
 for(const m of (state.扩展?.story?.partyMessages??[]) as PartyMessage[]){
  const p=m.proposals?.[0];if(!p)continue;const r=partyProposalRecord(state,p);if(!r)continue;if(!(p.kind==='loot'?Object.hasOwn(r.terms.shares,state.角色.主控单位ID):r.terms.participants.includes(state.角色.主控单位ID)))continue;
  const key=p.kind==='loot'?`loot:${r.playerId}:${r.dungeonId}:${r.expeditionId??"next"}`:`resolution:${r.terms.allocationId}:${r.terms.resourceKind}:${r.terms.resourceId}`;
  const participants=p.kind==='loot'?Object.keys(r.terms.shares):r.terms.participants;
  const people=participants.filter((id:string)=>id!==(p.kind==='loot'?r.playerId:r.proposerId)).map((id:string)=>{
   const rec=(state.人物.列表[id]?.扩展?.社交约定??[]).find((c:any)=>c.id===r.signatures[id]);
   return {personId:id,name:state.人物.列表[id]?.name,status:rec?.status??'unasked',retained:!!r.inherited?.[id]};
  });
  const latest=p.kind==='loot'?(state.远征.扩展.lootAgreements??[]).filter((a:any)=>a.playerId===r.playerId&&a.dungeonId===r.dungeonId&&!a.expeditionId).at(-1):(state.远征.扩展.lootResolutions??[]).filter((a:any)=>a.terms.allocationId===r.terms.allocationId&&a.terms.resourceKind===r.terms.resourceKind&&a.terms.resourceId===r.terms.resourceId).at(-1);
  const superseded=!r.expeditionId&&latest&&latest.id!==r.id;
  const all=people.every((p:any)=>p.status==='completed');
  cards.set(key,{key,messageId:m.id,kind:p.kind,id:r.id,version:r.version??null,terms:r.terms,people,status:superseded?'superseded':p.kind==='loot'?(r.expeditionId?'departed':all?'agreed':people.some((p:any)=>p.status==='rejected')?'rejected':'pending'):r.status,delivery:r.delivery??null});
 }
 return [...cards.values()];
}
