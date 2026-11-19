import {rules} from '../rules';
import {pendingStoryExtraction} from '../shared/story-extraction';

function extractionQuote(state:any){
 const preview=rules.expedition.previewRoomActions(state).extract;
 if(!preview.available)throw Error(preview.reasons.join('；'));
 const active=state.远征.当前;
 return {expeditionId:active.id,nodeId:active.currentNodeId??null,losses:structuredClone(preview.losses)};
}
export function requestStoryExtraction(state:any,id:string){
 const quote=extractionQuote(state);
 if(!quote.losses.length)return rules.expedition.extractSafely(state,id);
 return {state,receipt:{type:'story-extraction-confirmation',...quote,decision:'pending',summary:'撤离会放弃尚未处理的收获，请确认损失清单'}};
}
export function resolveStoryExtraction(state:any,accept:boolean,id:string){
 const pending=pendingStoryExtraction(state);if(!pending)throw Error('没有待确认的撤离');
 let current=state,settlement:any;
 if(accept){
  const quote=extractionQuote(state);
  if(quote.expeditionId!==pending.expeditionId||quote.nodeId!==pending.nodeId||JSON.stringify(quote.losses)!==JSON.stringify(pending.losses))throw Error('现场或损失清单已经变化，请取消后重新提出撤离');
  const result=rules.expedition.extractSafely(state,id,{confirmAbandon:true});current=result.state;settlement=result.receipt;
 }
 const step=current.扩展.story.active.results.find((r:any)=>r.step===pending.step);
 step.receipt.decision=accept?'accepted':'declined';
 if(settlement)step.receipt.settlement=structuredClone(settlement);
 step.receipt.summary=accept?settlement.summary:'你选择留下处理收获，尚未撤离';
 step.status=accept?'succeeded':'failed';
 if(accept)delete step.reason;else step.reason='玩家未确认放弃收获，撤离没有执行';
 return {state:current,receipt:{type:'story-extraction-decided',accepted:accept,...(settlement?{settlement}:{}),summary:step.receipt.summary}};
}
