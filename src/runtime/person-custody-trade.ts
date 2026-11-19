import {rules} from '../rules';
export function respondNpcCustodyTrade(state:any,input:any,sourceId:string){
 if(!input||Object.keys(input).some(k=>!['offerId','decision'].includes(k)))throw Error('交接回应只接受原报价与本人决定');
 const r=rules.custodyMarket.offer(state,input.offerId),d=input.decision;
 if(!r||r.buyerId===state.角色.主控单位ID)throw Error('主控须手动回应，此入口只处理NPC收到的原报价');
 if(!d||Object.keys(d).some(k=>!['accept','reason'].includes(k)))throw Error('交接回应字段无效');
 return rules.world.settleIntent(state,{id:sourceId,type:'respond-custody-transfer',actorId:r.buyerId,offerId:r.id,accept:d.accept,reason:d.reason});
}
