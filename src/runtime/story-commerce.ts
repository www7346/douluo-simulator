import {auctionConsignmentQuote} from './auction-quote';
import {rules} from '../rules';
import {materialName} from './player-text';
import {competitionDisplayText} from '../shared/competition-display';
import type {StoryPlan} from './story-turns';
import {storyMaterialCraftEvidence} from './story-materials';
const namedAssets=(rows:any[])=>rows.map(row=>({...row,name:competitionDisplayText(row.name??'')}));
const namedMessagePart=(part:any)=>({...part,...(typeof part.name==='string'?{name:competitionDisplayText(part.name)}:{}),...(typeof part.text==='string'?{text:competitionDisplayText(part.text)}:{}),...(part.items?{items:namedAssets(part.items)}:{})});
export const STORY_TRADE_INTERFACES={stock:{purchase:'buy',itemSale:'sell',materialTrade:'trade-commerce-material',consign:'start-asset-auction'},supply:{purchase:'buy',itemSale:'sell',materialTrade:'trade-commerce-material',consign:'start-asset-auction'}} as const;
export function storyTradeChannel(state:any,shopId:string){return state.商店?.列表?.[shopId]?'stock':null;}
export function validateStoryTradeInterfaces(state:any,plan:StoryPlan){for(const {action} of plan.segments)if(['buy','sell','trade-commerce-material'].includes(action.kind)&&!storyTradeChannel(state,String(action.shopId??'')))throw Error('买卖须引用当前已登记的实际商店与原资产');}

function materialOffers(state:any,service:any,visible:boolean){return service&&visible?Object.values(state.商店.列表[service.id].扩展?.materialStock??{}).filter((v:any)=>v.quantity>0).map((v:any)=>{let preview;try{const q=rules.commerceAssets.previewTrade(state,{direction:'buy',shopId:service.id,fingerprint:v.fingerprint,quantity:1});preview={available:true,quantity:1,unitGold:q.unitGold??q.unitValue,totalGold:q.totalGold};}catch(error){preview={available:false,reason:(error as Error).message};}return {shopId:service.id,fingerprint:v.fingerprint,name:materialName(v,state),quality:v.quality,quantity:v.quantity,unitGold:v.unitValue,...storyMaterialCraftEvidence(v),preview};}):[];}
export function storyMaterialSupplyFacts(state:any){const service=rules.expedition.serviceAtLocation(state),visualAvailable=!rules.controls.restrictions(state,state.角色?.主控单位ID).blocked.vision?.length;return {visualAvailable,service:service?{id:service.id,name:service.name}:null,offers:materialOffers(state,service,visualAvailable)};}

/** Viewer-scoped offers and permanent records. This performs no settlement or time advance. */
export function storyCommerceFacts(state:any,auctionId?:string){
 const playerId=state.角色?.主控单位ID,position=playerId?rules.actions.positionOf(state,playerId):null,publicPlace=position?.kind==='location'&&!position.sceneId;
 const visualAvailable=!rules.controls.restrictions(state,playerId).blocked.vision?.length;
 const preview=(read:()=>any)=>{try{const q=read();return {available:true,quantity:1,unitGold:q.unitPrice??q.unitGold??q.unitValue,totalGold:q.totalGold};}catch(error){return {available:false,reason:(error as Error).message};}};
 const service=rules.expedition.serviceAtLocation(state);
 const supplies=service&&visualAvailable?(rules.expedition.supplyOffers(state) as any[]).filter(v=>v.kind==='item').map(v=>({templateId:v.templateId,name:v.name,tags:rules.world.ITEM_TEMPLATES[v.templateId]?.tags??[],unitGold:v.value,preview:preview(()=>rules.world.previewTrade(state,{shopId:v.shopId,itemId:v.itemIds[0],quantity:1},'buy'))})):[];
 const shops=(Object.values(state.商店?.列表??{}) as any[]).filter(shop=>visualAvailable&&publicPlace&&shop.locationId===position.locationId&&shop.status==='open'&&!shop.infinite&&state.人物?.列表?.[shop.merchantId]&&rules.actions.colocated(state,playerId,shop.merchantId)&&!rules.world.personalActionBlockReason(state,{actorId:shop.merchantId})).map(shop=>({shopId:shop.id,name:shop.name,items:state.容器.列表[shop.stockContainerId].itemIds.flatMap((itemId:string)=>{const item=state.物品.实例[itemId];if(!item||item.containerId!==shop.stockContainerId)return [];return [{itemId,name:item.name,quantity:item.quantity,tags:item.tags??[],preview:preview(()=>rules.world.previewTrade(state,{shopId:shop.id,itemId,quantity:1},'buy'))}];})}));
 const offers=materialOffers(state,service,visualAvailable);
 const ownedAssets=playerId?state.容器.列表[state.人物.列表[playerId].inventoryContainerId].itemIds.map((id:string)=>state.物品.实例[id]).filter((i:any)=>!rules.commerceAssets.itemReason(state,i,playerId)).map((i:any)=>{const assetKind=rules.sealing.byItem(state,i.id)?'loaded-seal':'item',auctionQuote=auctionConsignmentQuote(state,{assetKind,itemId:i.id,quantity:1});return {assetKind,itemId:i.id,name:i.name,type:i.type,quantity:i.quantity,valueGold:auctionQuote.valueGold??rules.world.currentItemValue(i),auctionQuote};}).concat(Object.values(state.材料库.永久).map((v:any)=>({assetKind:'material',fingerprint:v.fingerprint,name:materialName(v,state),type:'材料',quantity:v.quantity,valueGold:v.unitValue}))):[];
 const transactions=(state.交易流水?.列表??[]).filter((r:any)=>playerId&&(r.buyerId===playerId||r.sellerId===playerId));
 const recentTransactions={totalRetained:transactions.length,records:transactions.slice(-8).map((r:any)=>({id:r.id,day:r.day??null,direction:r.buyerId===playerId?'purchase':'sale',shopId:r.shopId,name:typeof r.name==='string'?competitionDisplayText(r.name):null,templateId:r.templateId??null,quantity:r.quantity,totalGold:r.totalGold}))};
 const messages=rules.commerceMessages.facts(state,playerId);
 const auctions=rules.commerceAuction.facts(state,playerId);
 auctions.lots=namedAssets(auctions.lots);
 if(auctionId!==undefined){
  if(typeof auctionId!=='string'||!auctionId.trim()||auctionId.length>200)throw Error('须指定当前可查看的拍品');
  const selected=auctions.lots.find((lot:any)=>lot.id===auctionId);if(!selected)throw Error('当前无法查看这件拍品');
  auctions.lots=[selected];
 }
 return {ownerId:playerId,visualAvailable,recentTransactions,service:service?{id:service.id,name:service.name}:null,supplies,shops,materialOffers:offers,ownedAssets,auctions,messages:{channel:'message',unread:messages.unread,merchants:messages.merchants,subscriptions:messages.subscriptions,messages:messages.messages.map((m:any)=>({id:m.id,senderId:m.senderId,senderName:m.senderName,type:m.type,deliveredAt:m.deliveredAt,readAt:m.readAt,parts:m.parts.map(namedMessagePart),current:m.current.map(namedMessagePart)}))},meaning:'未另行约定时，买断回收按机制价值48%；已有约价按本次所列数量和总价成交。寄售按排期落槌收10%卖方佣金。卖出方式、原件或数量有歧义时clarify一次；明确买断、寄售或仅询价后直接办理。库存、原物权与原账户由同一服务核验；读取或回复商家留言不结算买卖。'};
}

export function stockByName(state:any,input:unknown){
 if(typeof input!=='string'||!input.trim()||input.length>120)throw Error('请填写要查询的商品名称');
 const itemName=input.trim(),facts=storyCommerceFacts(state);
 const available=[...facts.supplies,...facts.shops.flatMap(shop=>shop.items),...facts.materialOffers];
 const matches=available.filter(item=>item.name===itemName);
 return {type:'stock-by-name',itemName,available:matches.length>0,matches:matches.map(item=>({name:item.name,quantity:item.quantity??null,unitGold:item.unitGold??item.preview?.unitGold??null})),summary:matches.length?'当前有售：'+itemName:'当前货架没有在售的「'+itemName+'」。'};
}
