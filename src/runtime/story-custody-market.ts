import {rules} from '../rules';
import {storyCustodyMarketIds} from '../shared/story-custody-market';

export function pendingStoryCustodyTrades(state:any):any[]{
 const {offers}=storyCustodyMarketIds(state);
 return rules.custodyMarket.table(state).offers.filter((r:any)=>offers.has(r.id)&&!rules.custodyMarket.responseReason(state,r));
}
export function pendingStoryCustodyAuctions(state:any):Array<{auctionId:string;personId:string;quoteEventId:string}>{
 const {auctions}=storyCustodyMarketIds(state);
 return rules.custodyAuction.pending(state).filter((r:any)=>auctions.has(r.auctionId));
}
export function pendingStoryCustodyMarket(state:any):boolean{return !!(pendingStoryCustodyTrades(state).length||pendingStoryCustodyAuctions(state).length);}
/** Derived UI guidance in the existing facts snapshot; never an execution authority. */
export function custodyResponseFacts(state:any,facts:any){
 const offers=new Set((facts.trades??[]).map((r:any)=>r.id)),auctions=new Set((facts.auctions??[]).map((r:any)=>r.id));
 return {trades:rules.custodyMarket.table(state).offers.filter((r:any)=>offers.has(r.id)&&!rules.custodyMarket.responseReason(state,r)).map((r:any)=>r.id),auctions:rules.custodyAuction.pending(state).filter((r:any)=>auctions.has(r.auctionId))};
}
