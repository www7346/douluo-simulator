import {canRetryStoryProse} from '../shared/story-prose-attempt';
import {pendingStoryPersonWorldWork} from './person-world-work';

/** Read-only readiness for ending a conversation without inventing a reply. */
export function privateStoryCloseReason(state:any):string|null{
 const ledger=state.扩展?.story,turn=ledger?.active;
 if(!(turn?.privatePersonId||turn?.partyChat)||!['planning','resolved'].includes(turn.status))return '当前没有待处理的会话。';
 if(ledger.deferredBattle||state.战斗?.状态==='进行中'||turn.continuation?.battleId)return '请先处理当前战斗。';
 // Unexecuted arrangements can be skipped. Existing rule decisions cannot.
 const candidate={...state,扩展:{...state.扩展,story:{...ledger,active:{...turn,status:'resolved',hostProgress:undefined,continuation:undefined}}}};
 if(!canRetryStoryProse(candidate)||pendingStoryPersonWorldWork(state).length)return '还有交易、约定或人物决定需要处理，请先重试当前步骤。';
 if(Object.keys(state.扩展?.npcCreationDrafts??{}).length)return '人物资料尚未完成，请先重试当前步骤。';
 return null;
}
