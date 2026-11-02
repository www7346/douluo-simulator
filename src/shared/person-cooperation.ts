
/** Pending decisions are projections of the original proposal, never another agreement. */
export function pendingCooperationResponses(state:any,storyOnly=false):any[]{
 const turn=state.扩展?.story?.active;
 const ids=storyOnly?new Set((turn?.results??[]).filter((r:any)=>r.receipt?.type==='person-cooperation').map((r:any)=>r.receipt.cooperationId)):null;
 return (state.世界?.cooperation?.agreements??[]).filter((r:any)=>r.status==='proposed'&&r.memberId!==state.角色.主控单位ID&&!globalThis.SoulInfluenceCore.voluntaryReason(state,r.memberId)&&(!ids||r.leaderId===state.角色.主控单位ID&&ids.has(r.id)));
}

/** UI scheduling hint; the rules recheck the source before executing any action. */
export function hasPendingBattleControl(state:any,actorId:string):boolean{
 return Object.values(state.扩展?.influenceOrders??{}).some((o:any)=>o.actorId===actorId&&o.battleId===state.战斗?.id&&o.status==='pending'&&state.状态实例?.列表?.[o.sourceStatusId]?.状态==='生效');
}
