import './battle-preferences-core.js';
export interface BattlePreferences {version:1;defaultMode:'auto'|'manual';reportMode:'manual'|'boss'|'all';consumables:'never'|'recovery'|'all';reservePercent:number;retreatPercent:number}
const core=(globalThis as any).SoulBattlePreferences;
export const DEFAULT_BATTLE_PREFERENCES=core.DEFAULTS as Readonly<BattlePreferences>;
export const validateBattlePreferences=(value:unknown):BattlePreferences=>core.validate(value);
export const readBattlePreferences=(state:any):BattlePreferences=>core.read(state);
export const effectiveBattlePreferences=(state:any):BattlePreferences=>core.effective(state);
export const shouldNarrateBattle=(state:any,report:any):boolean=>core.shouldNarrate(state,report);
export function battleNeedsWriter(state:any,report:any):boolean{return report?.status==='已结束'&&(report.storyTurn===undefined||state.扩展?.battleNarration?.[report.id]?.kind==='local');}
/** Finished records stay authoritative after arena reconciliation clears the live board. */
export function hasBattleStoryFollowup(state:any):boolean{
 const ledger=state.扩展?.story,turn=ledger?.active;
 if(state.战斗?.状态==='进行中'){const continuation=turn?.continuation,pointed=continuation?.plan?.segments?.[continuation.nextStep]?.action?.kind;return !!continuation?.battleId&&continuation.battleId===state.战斗.id&&(!!state.战斗.扩展?.automation?.enabled||['battle-action','battle-strategy'].includes(pointed));}
 const id=ledger?.deferredBattle?.battleId??turn?.continuation?.battleId??(turn?.status==='resolved'?turn.battleId:undefined);
 return !!id&&state.扩展?.battleReports?.[id]?.status==='已结束';
}
