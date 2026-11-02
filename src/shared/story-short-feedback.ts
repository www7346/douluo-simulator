import {localFeedbackAction} from '../runtime/story-action-capabilities';
/** Display settled rule evidence; explanatory notes are not observations. */
export function automaticShortFeedback(state:any):boolean{
 const ledger=state.扩展?.story,turn=ledger?.active;
 if(turn?.status!=='resolved'||turn.privatePersonId||turn.partyChat||turn.battleId||turn.continuation||turn.hostProgress&&['waiting','ready'].includes(turn.hostProgress.status)||ledger.deferredBattle||state.战斗?.状态==='进行中'||!turn.results?.length)return false;
 return turn.results.every((r:any)=>r.status==='skipped'||localFeedbackAction(r.action)&&['succeeded','failed','clarify','described'].includes(r.status)&&(r.status!=='succeeded'||r.receipt))&&turn.results.some((r:any)=>!['described','skipped'].includes(r.status));
}
export function shortFeedbackPlan(plan:any):boolean{return Array.isArray(plan?.segments)&&plan.segments.length>0&&!plan.privateTo&&plan.segments.every((s:any)=>localFeedbackAction(s.action))&&plan.segments.some((s:any)=>s.action.kind!=='describe');}
