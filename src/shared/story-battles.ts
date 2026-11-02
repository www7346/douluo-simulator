import {battleNeedsWriter,shouldNarrateBattle} from './battle-preferences';
import type {StoryArchiveRecord} from './story-archive';

/** Exact terminal outcomes emitted by the combat engine, from the player's side. */
export const STORY_BATTLE_OUTCOMES=['胜利','败北','认输','全队撤退','敌方逃散','双方脱离'] as const;
export type StoryBattleOutcome=typeof STORY_BATTLE_OUTCOMES[number];
/** Reconciliation may clear the live arena; its last report still identifies that encounter. */
export function latestReplayBattleId(state:any):string|null {
 if(state?.战斗?.id&&state.战斗.状态!=='未开始')return state.战斗.id;
 const reports=Object.values(state?.扩展?.battleReports??{}) as any[];
 return reports.at(-1)?.status==='已结束'?reports.at(-1).id:null;
}
/** Resume the player's pending sequence first; otherwise use recorded battle order. */
export function nextStoryBattle(state:any,automatic=false):string|null {
 const ledger=state?.扩展?.story;
 if(!ledger||state.战斗?.状态==='进行中'||ledger.active&&ledger.active.status!=='complete')return null;
 const eligible=(report:any)=>battleNeedsWriter(state,report)&&(!automatic||state.扩展?.battleNarration?.[report.id]?.kind!=='local'&&shouldNarrateBattle(state,report));
 if(ledger.deferredBattle){const report=state.扩展?.battleReports?.[ledger.deferredBattle.battleId];return eligible(report)?report.id:null;}
 const report=Object.values(state.扩展?.battleReports??{}).find(eligible) as any;
 return report?.id??null;
}

/** Completed combat exists before (and independently of) any optional story prose. */
export function unboundStoryBattleReports(state:any):any[]{
 return Object.values(state?.扩展?.battleReports??{}).filter((report:any)=>report?.status==='已结束'&&report.storyTurn===undefined);
}

export type StoryTimelineRow={kind:'story';entry:StoryArchiveRecord}|{kind:'battle';report:any};
const minute=(t:any)=>t&&Number.isFinite(t.day*1440+t.hour*60+t.minute)?t.day*1440+t.hour*60+t.minute:null;
/** Read-only ordering from recorded occurrence times, never from generated prose.
 * Narrating a battle later fills its original position rather than moving it. */
export function storyBattleTimeline(state:any,entries:StoryArchiveRecord[],includeEarlier=true):StoryTimelineRow[]{
 const reports=Object.values(state?.扩展?.battleReports??{}) as any[],visible=new Set(entries.map(e=>e.turn.number));
 const represented=new Set<string>();
 for(const e of entries){if(e.turn.battleId)represented.add(e.turn.battleId);for(const r of e.turn.results??[])if(r.receipt?.report?.id)represented.add(r.receipt.report.id);}
 const pending=state?.扩展?.story?.active;
 if(pending?.status!=='complete')for(const r of pending?.results??[])if(r.receipt?.report?.id)represented.add(r.receipt.report.id);
 const rows:Array<{row:StoryTimelineRow;at:number;revision:number;order:number}>=entries.map((entry,order)=>{
  const report=entry.turn.battleId?state?.扩展?.battleReports?.[entry.turn.battleId]:null;
  return {row:{kind:'story',entry},at:report?.startedAt??minute(entry.turn.before?.time)??0,revision:report?.startedRevision??entry.revision,order};
 });
 const earliest=rows.length?Math.min(...rows.map(r=>r.at)):Infinity;
 reports.forEach((report,order)=>{
  if(represented.has(report.id)||report.storyTurn!==undefined&&!visible.has(report.storyTurn)||!includeEarlier&&report.startedAt<earliest)return;
  rows.push({row:{kind:'battle',report},at:report.startedAt??0,revision:report.startedRevision??-1,order:entries.length+order});
 });
 return rows.sort((a,b)=>a.at-b.at||a.revision-b.revision||a.order-b.order).map(r=>r.row);
}
