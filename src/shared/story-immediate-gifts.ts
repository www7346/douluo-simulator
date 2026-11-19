/** Immediate decisions belong to the active action result, not to the promise ledger. */
export function pendingImmediateGifts(state:any):any[]{
 const turn=state?.扩展?.story?.active;
 return turn?.status==='resolved'?turn.results.filter((r:any)=>r.receipt?.type==='person-gift-offered'&&!r.receipt.response&&!globalThis.SoulInfluenceCore.voluntaryReason(state,r.receipt.personId)).map((r:any)=>r.receipt):[];
}
export function deferredImmediateGifts(state:any):any[]{
 return (state.扩展?.deferredImmediateGifts?.records??[]).filter((r:any)=>!r.response&&!globalThis.SoulInfluenceCore.voluntaryReason(state,r.offer.personId)).map((r:any)=>r.offer);
}
