import {calculationWork,type CalculationWork} from '../shared/calculation-progress';

/** Extract bounded counters while the worker already holds a decoded private frame.
 * No names, decisions, locations or mutable world objects cross this boundary. */
export function sliceWork(kind:string,frame:unknown):CalculationWork|undefined {
 const value=frame as any;
 if(kind==='arena-bracket'){
  const rounds=value?.competition?.bracket?.rounds;
  if(!Array.isArray(rounds)||rounds.length>32)return;
  const matches=rounds.flatMap((r:any)=>Array.isArray(r?.matches)?r.matches:[]);
  return calculationWork({kind:'arena',completed:matches.filter((m:any)=>m?.status==='completed').length,total:matches.length,round:Number.isSafeInteger(value.cursor?.roundIndex)?value.cursor.roundIndex+1:undefined});
 }
 if(kind==='travel-events'){
  const routes=value?.path?.routes,run=value?.currentLeg?.run?.travel;
  if(!Array.isArray(routes))return;
  const legPercent=Number.isFinite(run?.progressUnits)&&Number.isFinite(run?.totalUnits)&&run.totalUnits>0&&run.progressUnits>=0&&run.progressUnits<=run.totalUnits?Math.floor(run.progressUnits/run.totalUnits*100):undefined;
  return calculationWork({kind:'travel',completed:value.routeIndex,total:routes.length,legPercent});
 }
}
