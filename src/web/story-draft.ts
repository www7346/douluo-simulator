import {PARTY_CONVERSATION_ID} from '../shared/story-party-chat';
import type {GameSnapshot} from '../runtime/contracts';
export interface StoryDraftScope {profileId:string;branchId:string;turn:number;personId:string;historyHeadId:string|null}
type DraftStorage=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
// Restoring two saves can retain the same branch/turn while selecting different immutable histories.
export const storyDraftKey=(scope:StoryDraftScope)=>`douluo-story-draft:${JSON.stringify([scope.profileId,scope.branchId,scope.turn,scope.personId,scope.historyHeadId])}`;
export function readStoryDraft(storage:DraftStorage,key:string):string {
 const value=storage.getItem(key);return value!==null&&value.length<=8000?value:'';
}
export function writeStoryDraft(storage:DraftStorage,key:string,value:string){
 if(value.length>8000)throw Error('行动草稿不能超过8000字');
 if(value)storage.setItem(key,value);else storage.removeItem(key);
}
/** Optional UI shortcuts append to the existing scoped draft, never submit it. */
export function appendStoryDraft(current:string,addition:string){const text=[current,addition].filter(Boolean).join('\n');if(text.length>8000)throw Error('现有草稿较长，请先整理后再添加安排。');return text;}

/** A finished old request must never remove a more recently edited draft. */
export function clearSubmittedStoryDraft(storage:DraftStorage,key:string,submitted:string){
 if(readStoryDraft(storage,key)!==submitted)return false;
 storage.removeItem(key);return true;
}

/** Called only after a successful live command, never by load/restore. Keep the old branch's draft intact. */
export function carryStoryDrafts(storage:DraftStorage,profileId:string,before:GameSnapshot,beforeHead:string|null,after:GameSnapshot,afterHead:string|null){
 const oldState=before.state as any,state=after.state as any,old=oldState.扩展?.story,next=state.扩展?.story;
 if(!old||!next||old.branchId!==next.branchId)return;
 const started=next.nextTurn===old.nextTurn+1&&next.active?.number===old.nextTurn&&(!old.active||old.active.status==='complete');
 const archived=next.nextTurn===old.nextTurn&&next.active?.number===old.active?.number&&next.active?.status==='complete'&&beforeHead!==afterHead;
 if(!started&&!archived)return;
 const people=new Set(['',PARTY_CONVERSATION_ID,...Object.keys(oldState.人物?.列表??{}),...Object.keys(state.人物?.列表??{})]);
 for(const personId of people){
  const source=storyDraftKey({profileId,branchId:old.branchId,turn:old.nextTurn,personId,historyHeadId:beforeHead});
  const target=storyDraftKey({profileId,branchId:next.branchId,turn:next.nextTurn,personId,historyHeadId:afterHead});
  if(started&&personId===(next.active.partyChat?PARTY_CONVERSATION_ID:next.active.privatePersonId??''))clearSubmittedStoryDraft(storage,source,next.active.input);
  const value=readStoryDraft(storage,source);
  if(value&&storage.getItem(target)===null)writeStoryDraft(storage,target,value);
 }
}
