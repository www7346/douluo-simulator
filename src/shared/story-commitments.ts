export const worldMinute=(time:any)=>Number(time?.day)*1440+Number(time?.hour)*60+Number(time?.minute);
export function commitmentExpired(state:any,record:any):boolean{
 if(['realm-return','realm-guest','relationship','party','contact','loot','loot-resolution'].includes(record.kind))return false;
 return record.kind==='meeting'?worldMinute(state.世界.时间)>record.endsAt:state.世界.时间.day>record.dueDay;
}
/** Locate only unresolved responses created by the active story turn. */
export function pendingStoryCommitments(state:any):any[]{
 const turn=state?.扩展?.story?.active;if(turn?.status!=='resolved')return [];
 const ids=new Set(turn.results.filter((r:any)=>r.receipt?.type==='commitment-proposed').map((r:any)=>r.receipt.commitment.id));
 return Object.values(state.人物?.列表??{}).flatMap((p:any)=>(p.扩展?.社交约定??[]).filter((r:any)=>
  r.playerId===state.角色.主控单位ID&&ids.has(r.id)&&r.status==='pending'&&!commitmentExpired(state,r)&&!globalThis.SoulInfluenceCore.voluntaryReason(state,r.personId)));
}
/** Original proposals remain answerable after their story has ended. */
export function deferredStoryCommitments(state:any):any[]{
 const turn=state?.扩展?.story?.active,current=new Set(turn&&turn.status!=='complete'?(turn.results??[]).filter((r:any)=>r.receipt?.type==='commitment-proposed').map((r:any)=>r.receipt.commitment.id):[]);
 return Object.values(state.人物?.列表??{}).flatMap((p:any)=>(p.扩展?.社交约定??[]).filter((r:any)=>r.playerId===state.角色.主控单位ID&&!r.initiatorId&&!r.origin?.control&&!current.has(r.id)&&r.status==='pending'&&!commitmentExpired(state,r)&&!globalThis.SoulInfluenceCore.voluntaryReason(state,r.personId)));
}
