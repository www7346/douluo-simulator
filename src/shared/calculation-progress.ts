/** Display-only facts. These never authorize a command or replace its committed result. */
export type CalculationWork =
 | {kind:'arena';completed:number;total:number;round?:number}
 | {kind:'travel';completed:number;total:number;legPercent?:number};
export interface CalculationProgress {operationId:string;phase:'calculating'|'saving';startedAt:number;work?:CalculationWork}
const count=(v:unknown,max:number)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0&&v<=max;
export function calculationWork(value:unknown):CalculationWork|undefined {
 const v=value as any;
 if(!v||!count(v.total,10000)||v.total===0||!count(v.completed,v.total))return;
 if(v.kind==='arena')return {kind:'arena',completed:v.completed,total:v.total,...(count(v.round,32)&&v.round>0?{round:v.round}:{})};
 if(v.kind==='travel')return {kind:'travel',completed:v.completed,total:v.total,...(count(v.legPercent,100)?{legPercent:v.legPercent}:{})};
}
