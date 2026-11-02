import {MAX_STORY_PROSE_LENGTH} from '../shared/story-prose';
import {canRetryStoryProse} from '../shared/story-prose-attempt';
import {pendingStoryPersonWorldWork} from './person-world-work';
import {pendingStoryResearch} from '../shared/story-research';
import {pendingStoryRingNaming} from '../shared/story-ring-naming';
import {compileStoryFeedbackEvents} from './story-writing-facts';
import {storyBattleConclusion} from './story-battle-conclusion';
import type {GameCommand} from './contracts';

/** Readiness uses existing pending work; no additional saved state is needed. */
function prerequisiteReason(state:any):string|null{
 const ledger=state.扩展?.story,turn=ledger?.active;
 if(turn?.status!=='resolved')return '这段行动尚未结束，或已经写下经过。';
 if(turn.privatePersonId||turn.partyChat||turn.results?.some((row:any)=>row.action?.kind==='tell-party'))return '请先完成当前对话的回复。';
 if(turn.hostProgress&&['waiting','ready'].includes(turn.hostProgress.status)||turn.continuation||ledger.deferredBattle||state.战斗?.状态==='进行中')return '还有战斗或后续行动需要处理。';
 if(!canRetryStoryProse(state,undefined,pendingStoryPersonWorldWork(state).length>0))return '还有人物回应或当前事项需要完成。';
 if(pendingStoryPersonWorldWork(state).length)return '还有人物的决定或作品方案需要完成。';
 if(Object.keys(state.扩展?.npcCreationDrafts??{}).length)return '新人物的资料尚未完成。';
 if(pendingStoryResearch(state))return '作品的名称和介绍尚未完成。';
 if(pendingStoryRingNaming(state))return '魂技的名称和介绍尚未完成。';
 return null;
}

function localProse(state:any){
 const turn=state.扩展.story.active;
 const lines=compileStoryFeedbackEvents(turn).filter(event=>!(event.action==='describe'&&turn.results[event.step]?.action.mode==='explanation')).map(event=>event.query&&event.facts.battle
  ?storyBattleConclusion(event.facts.battle).replace('记录的战果为','战果为')
  :event.action==='describe'&&!event.query?'这次观察或交流已记录。':event.statement).filter(Boolean);
 const location=turn.after?.location?.name;
 return (lines.length?lines:[location?`你暂时停留在${location}，旅程可以继续。`:'这次安排已经记录，旅程可以继续。']).join('\n');
}

export function localStoryContinuationReason(state:any):string|null{
 const reason=prerequisiteReason(state);if(reason)return reason;
 return null;
}

/** Delegate to native finish in the same transaction. The client cannot supply prose. */
export function localStoryFinishCommand(state:any,command:GameCommand):GameCommand{
 const payload=command.payload as any,ledger=state.扩展?.story,turn=ledger?.active;
 if(!payload||Object.keys(payload).some(key=>!['branchId','turn'].includes(key))||payload.branchId!==ledger?.branchId||payload.turn!==turn?.number)throw Error('这段故事已变化，请重新查看当前安排。');
 const reason=prerequisiteReason(state);if(reason)throw Error(reason);
 // Keep complete statements: a battle's recorded ending must not disappear after its first line.
 const prose=localProse(state);
 return {...command,type:'story.finish',payload:{branchId:ledger.branchId,turn:turn.number,prose:prose.length<=MAX_STORY_PROSE_LENGTH?prose:'本次行动已结算。完整行动结果与资源变化见下方记录，可继续旅程或手动生成正文。'}};
}
