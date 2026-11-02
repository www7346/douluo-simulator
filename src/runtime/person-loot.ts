import {rules} from '../rules';

/** NPC identity is derived from the original invitation, never chosen by the client. */
export function respondNpcLoot(state:any,input:any,sourceId:string){
 if(!input||Object.keys(input).some(k=>!['commitmentId','decision'].includes(k)))throw Error('分配回应字段无效');
 const record=rules.expedition.loot.pendingResponses(state).find((r:any)=>r.id===input.commitmentId&&r.personId!==state.角色.主控单位ID);
 if(!record)throw Error('没有可由该人物回应的原分配提议；玩家须亲自决定');
 const result=rules.expedition.respondLoot(state,{actorId:record.personId,commitmentId:record.id,decision:input.decision},sourceId);
 for(const step of result.state.扩展?.story?.active?.results??[])if(step.receipt?.commitment?.id===record.id){
  step.receipt.commitment=structuredClone(result.receipt.commitment);step.receipt.response={...result.receipt.response,status:result.receipt.commitment.status};
  step.receipt.lootDelivery=result.receipt.lootDelivery;step.receipt.summary=result.receipt.summary;step.status=input.decision.accept?'succeeded':'failed';if(!input.decision.accept)step.reason='对方拒绝了这项提议';
 }
 return result;
}
