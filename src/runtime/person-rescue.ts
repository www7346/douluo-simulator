/** The former staged rescue/evacuation queue is historical and never schedules replies. */
export function pendingNpcRescueResponses(_state:any,_ids?:ReadonlySet<string>):any[]{return [];}

/** Stale queued jobs must fail without changing a historical rescue record. */
export function respondNpcRescue(_state:any,_input:any,_sourceId:string):never{
 throw Error('原营救进度与等待回应流程已停用；解除看管按真实战后结果处理。');
}
