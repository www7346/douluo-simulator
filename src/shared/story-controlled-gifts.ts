/** Only this turn's actual proposals may block its saved continuation. */
export function pendingStoryControlledGifts(state:any):any[]{
 const turn=state.扩展?.story?.active;if(turn?.status!=='resolved')return [];
 const ids=new Set((turn.results??[]).filter((r:any)=>r.status==='succeeded'&&r.receipt?.type==='field-control-order'&&r.receipt.status==='executed'&&r.receipt.action.type==='propose-gift').map((r:any)=>r.receipt.settlement.commitmentId));
 return Object.values(state.人物?.列表??{}).flatMap((p:any)=>(p.扩展?.社交约定??[]).filter((r:any)=>r.origin?.control&&ids.has(r.id)&&r.status==='pending'&&r.dueDay>=state.世界.时间.day&&!globalThis.SoulInfluenceCore.voluntaryReason(state,r.personId)));
}
