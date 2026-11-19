import {rules} from '../rules';
export function decideNpcCustodyAuction(state:any,input:any,sourceId:string){
 if(!input||Object.keys(input).some(k=>!['auctionId','personId','quoteEventId','decision'].includes(k)))throw Error('竞拍回应只接受原现场报价与本人决定');
 if(!rules.custodyAuction.pending(state).some((r:any)=>r.auctionId===input.auctionId&&r.personId===input.personId&&r.quoteEventId===input.quoteEventId))throw Error('原人物没有这项未回应的现场竞价');
 const d=input.decision;if(!d||Object.keys(d).some(k=>!['gold','reason'].includes(k))||d.gold!==null&&!Number.isSafeInteger(d.gold))throw Error('本人须决定明确出价或放弃');
 return rules.world.settleIntent(state,{id:sourceId,type:d.gold===null?'pass-custody-auction':'bid-custody-auction',actorId:input.personId,auctionId:input.auctionId,quoteEventId:input.quoteEventId,reason:d.reason,...(d.gold===null?{}:{gold:d.gold})});
}
