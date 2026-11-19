/** Only actual actions in the active turn own its independent market responses. */
export function storyCustodyMarketIds(state:any){
 const turn=state.扩展?.story?.active,results=turn?.status==='resolved'?turn.results??[]:[];
 return {offers:new Set<string>(results.filter((r:any)=>r.status==='succeeded'&&r.receipt?.type==='custody-trade').map((r:any)=>r.receipt.offerId)),auctions:new Set<string>(results.filter((r:any)=>r.status==='succeeded'&&r.receipt?.type==='custody-auction').map((r:any)=>r.receipt.auctionId))};
}
export function pendingStoryCustodyTrades(state:any):any[]{
 const {offers}=storyCustodyMarketIds(state);
 const ready=new Set(state.扩展?.story?.active?.after?.custody?.responses?.trades??[]);
 return (state.世界?.custodyMarket?.offers??[]).filter((r:any)=>offers.has(r.id)&&r.status==='pending'&&ready.has(r.id));
}
export function pendingStoryCustodyAuctions(state:any):Array<{auctionId:string;personId:string;quoteEventId:string}>{
 const {auctions}=storyCustodyMarketIds(state);
 return (state.扩展?.story?.active?.after?.custody?.responses?.auctions??[]).filter((r:any)=>auctions.has(r.auctionId));
}
/** Browser display projection only. Runtime admission re-reads the actual rule prerequisites. */
export function pendingStoryCustodyMarket(state:any):boolean{return !!(pendingStoryCustodyTrades(state).length||pendingStoryCustodyAuctions(state).length);}
