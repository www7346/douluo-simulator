import {remembersRecord} from './cognition-view';
export const npcWorldMinute=(time:any)=>time.day*1440+time.hour*60+time.minute;
export function pendingNpcDecisions(state:any):any[]{
 const turn=state.扩展?.story?.active;if(turn?.status!=='resolved')return [];
 const ids=new Set(turn.results.filter((r:any)=>r.receipt?.type==='npc-goal-requested').map((r:any)=>r.receipt.requestId));
 return (state.世界?.npcDecisions??[]).filter((r:any)=>r.status==='pending'&&ids.has(r.rootRequestId??r.id)&&!globalThis.SoulInfluenceCore.voluntaryReason(state,r.ownerId));
}
export function deferredNpcDecisions(state:any):any[]{
 const turn=state.扩展?.story?.active,ids=new Set(turn&&turn.status!=='complete'?(turn.results??[]).filter((r:any)=>r.receipt?.type==='npc-goal-requested').map((r:any)=>r.receipt.requestId):[]);
 return (state.世界?.npcDecisions??[]).filter((r:any)=>r.status==='pending'&&!ids.has(r.rootRequestId??r.id)&&!globalThis.SoulInfluenceCore.voluntaryReason(state,r.ownerId));
}
export function visibleNpcGoals(state:any,personId?:string,all=false,observerId=state.角色?.主控单位ID){
 const known=(state.世界?.npcGoals??[]).filter((g:any)=>(!personId||g.ownerId===personId)&&(g.ownerId===observerId||g.knownBy.includes(observerId))&&remembersRecord(state,observerId,g));
 return (all?known:known.filter((g:any,index:number)=>!known.slice(index+1).some((later:any)=>later.ownerId===g.ownerId))).map((g:any)=>({
  id:g.id,ownerId:g.ownerId,kind:g.kind,membershipId:g.membershipId??null,motive:g.motive,createdAt:g.createdAt,destinationId:g.destinationId??null,arriveAt:g.arriveAt??null,
  branchId:g.branchId,turn:g.turn,requestId:g.requestId,decisionSourceId:g.decisionSourceId,
  ...(g.kind==='device'?{deviceUse:{intent:structuredClone(g.deviceUse.intent),receipt:structuredClone(g.deviceUse.receipt)}}:{}),
  ...(g.kind==='ability'?{abilityUse:{intent:structuredClone(g.abilityUse.intent),skillName:g.abilityUse.operation==='disguise'?(g.abilityUse.intent.type==='dismiss-disguise'?'解除伪装':'说明真实身份'):g.abilityUse.contract.name,receipt:structuredClone(g.abilityUse.receipt)}}:{}),
  ...(g.wearableUse?{wearableUse:{intent:structuredClone(g.wearableUse.intent),receipt:structuredClone(g.wearableUse.receipt)}}:{}),
  ...(g.hostUse?{hostUse:{intent:structuredClone(g.hostUse.intent),receipt:structuredClone(g.hostUse.receipt)}}:{}),
  ...(g.kind==='permit-custody-duty'?{dutyPermission:(state.世界.custody?.dutyPermissions??[]).filter((p:any)=>p.sourceId===`npc-duty:${g.decisionSourceId}`).map(({id,personId,leaderId,mode,issuedAt,expiresAt,status}:any)=>({id,personId,leaderId,mode,issuedAt,expiresAt,status}))[0]??null}:{}),
  ...(g.kind==='expedition'?{dungeonId:g.dungeonId,difficultyId:g.difficultyId}:{}),
  ...(g.kind==='purchase'?{purchase:visibleNpcPurchase(state,g.purchaseTransactionId)}:{}),
  requestIdRef:g.requestIdRef??null,reconsiderAfter:g.reconsiderAfter,reconsiderWindowOpen:npcWorldMinute(state.世界.时间)>=g.reconsiderAfter,invitationId:g.invitationId??null,
  invitation:g.invitationId?(state.人物.列表[g.ownerId]?.扩展?.社交约定??[]).find((r:any)=>r.id===g.invitationId):null,
 }));
}

function visibleNpcPurchase(state:any,id:string){
 const r=state.远征?.processedTransactions?.[id];if(r?.type!=='supply-bought')return null;
 return {transactionId:r.id,shopId:r.shopId,locationId:r.locationId,templateId:r.templateId,name:r.name,quantity:r.quantity,totalGold:r.totalGold,
  receivedItems:r.deliveries.map((d:any)=>({itemId:d.itemId,quantity:d.after-d.before}))};
}

/** Recent remembered actions survive a later idle decision without revealing other people's records. */
export function npcConversationGoals(state:any,personId:string){
 const rows=visibleNpcGoals(state,personId,true,personId),latest=rows.at(-1),abilities=rows.filter((row:any)=>['ability','device'].includes(row.kind)).slice(-8);
 return rows.filter((row:any)=>row===latest||abilities.includes(row));
}

export function npcCollaborationFacts(state:any,observerId:string,personId?:string,all=false){
 const records=(state.世界.npcCollaborations??[]).filter((r:any)=>(!personId||[r.initiatorId,r.personId].includes(personId))&&r.events.some((e:any)=>e.knownBy.includes(observerId)&&remembersRecord(state,observerId,e)));
 return (all?records:records.slice(-6)).map((r:any)=>{
  const events=r.events.filter((e:any)=>e.knownBy.includes(observerId)&&remembersRecord(state,observerId,e));return {id:r.id,goalId:r.goalId,initiatorId:r.initiatorId,personId:r.personId,locationId:r.locationId,startsAt:r.startsAt,endsAt:r.endsAt,motive:remembersRecord(state,observerId,r.events[0])?r.motive:null,branchId:r.branchId,knownStatus:events.at(-1).status,events:structuredClone(events),
   meaning:'只列本人参与或在场亲历的NPC间约见。提议与接受不等于已会合；远方结果未获知时不展示。会合只证明到场交谈，没有自动成交、收益、入队或关系奖励。'};
 });
}
