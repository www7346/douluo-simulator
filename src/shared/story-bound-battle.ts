import type {StoryTurn} from '../runtime/story-turns';
/** A frozen reading of the bound terminal report. Native single-action receipts stay untouched. */
export function storyBoundBattleView(turn:StoryTurn):StoryTurn{
 const report=turn.after?.battle?.report;
 if(!turn.battleId||report?.id!==turn.battleId||report.status!=='已结束')return turn;
 let attached=false;
 const results=turn.results.map(result=>{
  if(result.receipt?.report?.id!==report.id&&result.receipt?.battleId!==report.id)return result;
  if(!attached){attached=true;return {...result,receipt:{...result.receipt,report}};}
  const receipt={...result.receipt};delete receipt.report;return {...result,receipt};
 });
 if(!attached)results.push({step:results.length,source:turn.input,action:{kind:'battle-report',battleId:report.id},status:'succeeded',receipt:{type:'battle-report',report}});
 return {...turn,results};
}
