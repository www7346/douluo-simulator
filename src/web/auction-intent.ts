/** Clicking confirm expresses the player's decision; explanatory text is optional. */
export function auctionBidIntent(lot:{id:string;name:string;quoteEventId?:string},type:'bid-asset-auction'|'register-auction-proxy',gold:number,reason=''){
 return {type,auctionId:lot.id,...(type==='bid-asset-auction'?{gold,quoteEventId:lot.quoteEventId}:{maximumGold:gold}),reason:reason.trim()||`本人确认${type==='bid-asset-auction'?'出价竞买':'委托代拍'}${lot.name}`};
}
