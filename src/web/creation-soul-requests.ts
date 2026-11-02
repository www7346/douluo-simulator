import {jsonEqual} from '../shared/json-identity';
import {rememberSoulAdvice,type CreationWorkspace} from '../shared/creation-draft';
/** Save each completed candidate separately; a later failure leaves pending input available for retry. */
export async function runCreationSoulRequests(requests:{index:number;description:string}[],context:{
 signal?:AbortSignal;current:()=>CreationWorkspace;assertCurrent:()=>void;flush:()=>Promise<void>;
 change:(update:(w:CreationWorkspace)=>CreationWorkspace)=>void;
 preview:(config:Record<string,any>)=>Promise<any>;
 consult:(description:string,budget:number,draftId:string,session:any,soul:any,peerSouls:any[])=>Promise<any>;
}){
 if(requests.length>3)throw Error('最多同时构思三个武魂');
 const base=structuredClone(context.current().config),budgetConfig=structuredClone(context.current().config);
 // Resume with saved candidates reserved, without adopting them into the player's draft.
 for(let index=0;index<budgetConfig.martialSoulDrafts.length;index++){
  const proposal=context.current().advisors[index]?.proposal;
  if(proposal)budgetConfig.martialSoulDrafts[index]=structuredClone(proposal);
 }
 const check=()=>{if(context.signal?.aborted)throw Error('已停止构思，已保存候选和待处理输入保留');context.assertCurrent();if(!jsonEqual(context.current().config,base))throw Error('角色草稿已改变，武魂候选未覆盖新稿');};
 for(const request of requests){
  check();const workspace=context.current(),soul=workspace.config.martialSoulDrafts[request.index];
  if(!soul||workspace.requests[request.index]!==request.description)throw Error('武魂构想已改变，请在武魂页继续讨论');
  const preview=await context.preview(budgetConfig);check();
  if(preview.souls[request.index].available<1)throw Error('当前角色预算不足，请先调整已有候选或其他选择');
  const advice=await context.consult(request.description,preview.souls[request.index].available,soul.draftId,workspace.advisors[request.index]?.session,soul,budgetConfig.martialSoulDrafts.filter((_:any,index:number)=>index!==request.index));check();
  context.change(value=>rememberSoulAdvice(value,request.index,advice));await context.flush();check();
  if(advice.mode!=='question'&&advice.inspection?.draft)budgetConfig.martialSoulDrafts[request.index]=structuredClone(advice.inspection.draft);
 }
}
