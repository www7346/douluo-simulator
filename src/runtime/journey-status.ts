/** Read committed activity status only; no validation or recovery calculation. */
export function pendingBattleAftermath(state:any):boolean {
  return state?.战斗?.状态==='已结束'&&Boolean(state.远征?.当前?.phase==='combat'||state.切磋?.当前||state.终局挑战?.当前||state.比赛?.当前?.match||state.杀戮场?.当前?.match);
}

/** The ended battle must belong to the activity being settled. */
export function battleAftermathCommand(state:any):'arena.reconcile'|'expedition.resolve-battle'|null {
 const battle=state?.战斗;
 if(battle?.状态!=='已结束'||!battle.id)return null;
 if([state.切磋?.当前,state.终局挑战?.当前,state.比赛?.当前?.match,state.杀戮场?.当前?.match].some(activity=>activity?.battleId===battle.id))return 'arena.reconcile';
 if(state.远征?.当前?.phase==='combat'&&state.远征.当前.currentRoom?.battleId===battle.id)return 'expedition.resolve-battle';
 return null;
}
