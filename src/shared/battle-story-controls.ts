/** UI coordination only. Actual action permission remains on the combat service. */
export function battleStoryControlsBlocked(state:any):boolean {
 const battle=state?.战斗,turn=state?.扩展?.story?.active;
 if(battle?.状态!=='进行中'||!battle.id||!turn||turn.status==='complete')return false;
 const continuation=turn.continuation;
 if(turn.status==='resolved'&&continuation?.battleId===battle.id)return false;
 // An earlier world question or an unwritten outcome does not own this battle.
 const related=turn.battleId===battle.id||turn.before?.battle?.id===battle.id||turn.after?.battle?.id===battle.id||
  turn.results?.some((row:any)=>row.receipt?.battleId===battle.id);
 if(!related)return false;
 if(turn.status==='planning')return true;
 if(turn.status!=='resolved')return true;
 return Boolean(continuation||turn.hostProgress?.status==='ready'||turn.privatePersonId||turn.partyChat||turn.results?.some((row:any)=>row.action?.kind==='tell-party'));
}
