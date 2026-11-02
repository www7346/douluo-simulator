import {rules} from '../rules';
export function decideNpcCustodyDisposition(state:any,input:any,sourceId:string){
 if(!input||Object.keys(input).some(k=>!['decisionKey','decision'].includes(k)))throw Error('处置只接受原待办编号与本人决定');
 const r=rules.custodyMarket.pendingDispositions(state).find((r:any)=>r.key===input.decisionKey);
 if(!r)throw Error('原人物没有这项待处置看管');
 return rules.world.settleIntent(state,{id:sourceId,type:'decide-custody-disposition',actorId:r.ownerId,decisionKey:r.key,decision:input.decision});
}
