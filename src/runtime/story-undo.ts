import {requestResult} from './idb-read';
import {materialize,type StoredSlot} from './save-parts';
import type {SaveSlotRecord} from './storage';

export const STORY_UNDO='storyUndo';
export interface StoryUndoTarget {id:string;branchId:string;turn:number}
export interface StoredStoryUndo extends StoryUndoTarget {
  worldId:string;previousId:string;before:StoredSlot;partKeys:string[];
}

/** World cleanup visits one historical record at a time, including large saves. */
export function visitStoryUndo(tx:IDBTransaction,visit:(row:StoredStoryUndo,cursor:IDBCursorWithValue)=>void,worldId?:string):Promise<void>{
 return new Promise((resolve,reject)=>{
  const store=tx.objectStore(STORY_UNDO),request=worldId===undefined?store.openCursor():store.index('worldId').openCursor(worldId);
  request.onerror=()=>reject(request.error);
  request.onsuccess=()=>{const cursor=request.result;if(!cursor){resolve();return;}try{visit(cursor.value,cursor);cursor.continue();}catch(error){reject(error);}};
 });
}

// Read the small index keys, not every historical world snapshot.
export async function storyUndoTargets(tx:IDBTransaction,record:Pick<SaveSlotRecord,'profileId'|'slotId'|'storyUndoHeadId'>):Promise<StoryUndoTarget[]> {
  const index=tx.objectStore(STORY_UNDO).index('chain'),targets:StoryUndoTarget[]=[],seen=new Set<string>();
  let id=record.storyUndoHeadId??'';
  while(id){
    if(seen.has(id))throw Error('撤回记录不完整，请保留当前进度');seen.add(id);
    const cursor=await requestResult(index.openKeyCursor(IDBKeyRange.bound([id],[id,[]])));
    if(!cursor)throw Error('这段故事的撤回记录已缺失');
    const [key,previousId,worldId,branchId,turn]=cursor.key as [string,string,string,string,number];
    if(worldId!==(record.profileId??record.slotId))throw Error('撤回记录不属于当前世界');
    targets.push({id:key,branchId,turn});id=previousId;
  }
  return targets;
}

export async function storyUndoBefore(tx:IDBTransaction,record:SaveSlotRecord,id:string):Promise<SaveSlotRecord> {
  const target=(await storyUndoTargets(tx,record)).find(target=>target.id===id);
  if(!target)throw Error('这层楼已不在当前故事中，请重新选择');
  const stored=await requestResult<StoredStoryUndo|undefined>(tx.objectStore(STORY_UNDO).get(id));
  if(!stored)throw Error('这段故事的撤回记录已缺失');
  const before=await materialize(tx,stored.before),ledger=(before.snapshot.state as any).扩展?.story;
  if(before.profileId!==record.profileId||ledger?.branchId!==target.branchId||ledger?.nextTurn!==target.turn||ledger.active&&ledger.active.status!=='complete')throw Error('这段故事的发送前记录不完整');
  return before;
}
