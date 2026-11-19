/** Explicit rollback of an idle story starts another existing branch; reconnect
 * and unfinished turns retain their original workflow and recovery allowance. */
export function restoredStoryNeedsFork(current:any,restored:any):boolean{
 const target=restored?.扩展?.story;
 if(!current?.角色?.已建立||!target||target.active&&target.active.status!=='complete')return false;
 return current.世界?.seed!==restored.世界?.seed||current.扩展?.story?.branchId!==target.branchId||Number(current.系统?.revision)>Number(restored.系统?.revision);
}

/** Restore gameplay verbatim; only the commit clock and branch identity advance.
 * This also invalidates late model tickets and commands from the removed future. */
export function withdrawnStorySnapshot(before:import('../runtime/contracts').GameSnapshot,currentRevision:number,branchId:string){
 const snapshot=structuredClone(before),state=snapshot.state as any,ledger=state.扩展?.story;
 if(!ledger||ledger.active&&ledger.active.status!=='complete'||!branchId||branchId===ledger.branchId)throw Error('没有完整的发送前进度');
 if(!Number.isSafeInteger(currentRevision)||currentRevision<before.revision||currentRevision>=Number.MAX_SAFE_INTEGER)throw Error('当前进度已变化，请重新选择撤回位置');
 if(ledger.active)ledger.inheritedBranchId=ledger.inheritedBranchId??ledger.branchId;
 else delete ledger.inheritedBranchId;
 ledger.branchId=branchId;
 snapshot.revision=currentRevision+1;state.系统.revision=snapshot.revision;snapshot.savedAt=new Date().toISOString();
 return snapshot;
}
