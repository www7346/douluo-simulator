/** Explicit rollback of an idle story starts another existing branch; reconnect
 * and unfinished turns retain their original workflow and recovery allowance. */
export function restoredStoryNeedsFork(current:any,restored:any):boolean{
 const target=restored?.扩展?.story;
 if(!current?.角色?.已建立||!target||target.active&&target.active.status!=='complete')return false;
 return current.世界?.seed!==restored.世界?.seed||current.扩展?.story?.branchId!==target.branchId||Number(current.系统?.revision)>Number(restored.系统?.revision);
}
