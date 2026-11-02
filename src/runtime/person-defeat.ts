import {rules} from '../rules';
export function decideNpcDefeat(state:any,input:any,sourceId:string){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['decisionKey','decision'].includes(k)))throw Error('战败处置只接受原待办编号与本人决定');
 const prior=rules.custody.defeatDecisions(state).find((e:any)=>e.sourceId===sourceId);
 const ownerId=prior?.actorId??rules.custody.pendingDefeatDecisions(state).find((r:any)=>r.key===input.decisionKey)?.ownerId;
 if(!ownerId)throw Error('原人物没有这项待处置战败');
 return rules.world.settleIntent(state,{id:sourceId,type:'decide-defeat',actorId:ownerId,decisionKey:input.decisionKey,decision:input.decision});
}
