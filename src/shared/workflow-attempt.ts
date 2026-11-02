/** Request metadata only. It never enters a proposal, command or saved world. */
export interface WorkflowAttempt {id:string;source:string}
const storyKinds=new Set(['world-people','story-host','story-social','story-belief','story-autonomy','story-writer','room','research','ring-item','ring-skills','title','generation','generation-repair','generation-rebuild','person-performance-agreement','person-cooperation','person-custody-trade','person-custody-auction','person-gift']);
/** Explicit user retries only; automatic polling keeps the original allowance. */
export const supportsWorkflowAttempt=(kind:string)=>storyKinds.has(kind)||['combat','story-summary','story-stage-summary','ai-player','person-growth','person-conversation','person-rewrite'].includes(kind);
export function workflowAttemptSource(state:any,kind:string,revision:number):string{
 const ledger=state.扩展?.story;
 if(storyKinds.has(kind)&&ledger?.active&&ledger.active.status!=='complete')return JSON.stringify(['story',ledger.branchId,ledger.active.number]);
 if(kind==='combat'&&state.战斗?.状态==='进行中')return JSON.stringify(['combat',state.战斗.id]);
 return JSON.stringify(['step',kind,revision]);
}
export function validateWorkflowAttempt(state:any,request:any):void{
 const value=request.retryAttempt;if(value===undefined)return;
 if(!value||Object.keys(value).some(key=>!['id','source'].includes(key))||typeof value.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.id)
  ||typeof value.source!=='string'||value.source!==workflowAttemptSource(state,request.kind,request.revision)
  ||!supportsWorkflowAttempt(request.kind)||request.input?.proseAttemptId||request.input?.creationAttemptId)throw Error('重试请求与当前待完成步骤不一致');
}
