import type {StoryTurn} from './story-turns';
import {competitionDisplayText} from '../shared/competition-display';

const copy=<T>(v:T):T=>structuredClone(v);
const common=['type','summary','id','transactionType','requestHash'];
const quoteFields=['baseUnitPrice','agreementQuote','segments','buyerId','sellerId','templateId'];
const cashPayment=(p:any)=>p?Object.fromEntries(['id','sourceId','kind','at','fromId','toId','gold','before','after'].filter(k=>p[k]!==undefined).map(k=>[k,copy(p[k])])):null;
const saleFields=[...quoteFields,'currencyText','placement','kind','fingerprint','itemId','name','quantity','currentUnitValue','acquisitionUnitValue','totalGold','remainingQuantity','remainingGold','wallet','transfer','actorId','assetRef','shopId','direction','valueGold','unitGold','unitPrice','accountId','quoteVersion','payment','movement','pass'];
const tradeFields=[...quoteFields,'payment','movement','shopId','itemId','direction','quantity','unitPrice','totalGold','currencyText','placement','transferredItemId','ledgerId','transfer','wallets','requestHash','actorId','assetRef','valueGold','unitGold','accountId','quoteVersion','name'];
const storagePositionFields=['position','locationId','sceneId','locationName','sceneName','positionLabel'];
const storageFields=['actorId','itemId','originalItemId','name','quantity','fromContainerId','toContainerId',...storagePositionFields,'legalOwnerEntityId','storageKind','custodianId'];
export const COMMERCE_RECEIPT_FIELDS:Record<string,readonly string[]>={
 'item-bought':tradeFields,'item-sold':[...saleFields,...tradeFields],'material-sold':saleFields,'material-bought':saleFields,
 'asset-auction':['action','auctionId','eventId','actorId','itemId','itemDelivery','targetId','status','quantity','sessionId','startsAt','highestBid','settlement'],
 'auction-proxy':['auctionId','proxyId','maximumGold'],
 'shop-auction-shipment':['shipmentId','quantity','feeGold','arrivesAt'],
 'commerce-inspected':['data'],
 'commercial-subscription':['subscriptionId'],'commercial-message-read':['messageId'],'commercial-message-replied':['messageId'],

 'supply-bought':['buyerId','day','name','shopId','templateId','quantity','unitValue','totalGold','itemId','itemIds','wallet','supplierWallet','transfers','locationId','at','proof','deliveries','hash'],
 'item-stored':storageFields,'item-retrieved':storageFields,
 'stored-item-claimed':['itemId','quantity',...storagePositionFields],
 'item-looted':['materialDeliveries','actorId','remainsId','itemId','quantity','stolen'],
 'coins-looted':['actorId','remainsId','amountGold','currencyText','stolen'],
};
function known(v:any,fields:readonly string[],label:string){
 const unknown=Object.keys(v).filter(key=>![...common,...fields].includes(key));
 if(unknown.length)throw Error(`财物结果缺少字段编译：${label}/${unknown.join(',')}`);
}
/** Only consumes the player's already permission-scoped local offers and settled ledger. */
export function compileCommerceContext(c:any){
 known(c,['ownerId','visualAvailable','recentTransactions','service','supplies','shops','meaning','materialOffers','ownedAssets','auctions','messages'],'当地交易资料');
 if(c.visualAvailable!==undefined&&typeof c.visualAvailable!=='boolean')throw Error('当地交易资料视觉条件无效');
 const history=c.recentTransactions;known(history,['totalRetained','records','meaning'],'已结算交易记录');
 const preview=(p:any)=>{known(p,['available','quantity','unitGold','totalGold','reason'],'当前购买预检');return {available:p.available,...(p.available?{checkedQuantity:p.quantity,quotedUnitGold:p.unitGold,quotedTotalGold:p.totalGold}:{reason:p.reason})};};
 return {ownerId:c.ownerId??null,scope:c.visualAvailable===false?'视觉受限，未提供实时货架；保留本人资产、已结算交易与已送达消息':'当前地点的报价与本人已结算的近期交易',materialOffers:copy(c.materialOffers??[]),ownedAssets:copy(c.ownedAssets??[]),auctions:copy(c.auctions??null),commercialMessages:copy(c.messages??null),meaning:c.meaning,

  recentTransactions:{totalRetained:history.totalRetained,records:history.records.map((r:any)=>{
   known(r,['day','direction','shopId','name','templateId','quantity','totalGold'],'已结算单笔交易');
   if(!['purchase','sale'].includes(r.direction))throw Error('历史交易方向缺少编译');
   return {ledgerId:r.id,stage:r.direction==='purchase'?'历史买入，款项已付':'历史卖出，款项已收',day:r.day,shopId:r.shopId,
    item:{name:r.name,templateId:r.templateId,quantity:r.quantity},settledGold:r.totalGold};
  })},
  supplyService:copy(c.service),supplyOffers:c.supplies.map((s:any)=>{known(s,['templateId','name','tags','unitGold','preview'],'当地补给报价');return {templateId:s.templateId,name:s.name,tags:copy(s.tags),listedUnitGold:s.unitGold,currentPurchaseCheck:preview(s.preview)};}),
  shops:c.shops.map((s:any)=>{known(s,['shopId','name','items'],'当地商店');return {shopId:s.shopId,name:s.name,stock:s.items.map((i:any)=>{known(i,['itemId','name','quantity','tags','preview'],'当地库存');return {itemId:i.itemId,name:i.name,stockQuantity:i.quantity,tags:copy(i.tags),currentPurchaseCheck:preview(i.preview)};})};})};
}
function sale(quote:any,settled:boolean){
 known(quote,saleFields,'回收报价');
 const result={object:{kind:quote.kind==='material'?'材料':'物品',id:quote.fingerprint??quote.itemId,name:typeof quote.name==='string'?competitionDisplayText(quote.name):quote.name},quantity:quote.quantity,segments:copy(quote.segments??[]),
  valuation:{currentUnitValue:quote.currentUnitValue,offeredGoldPerUnit:quote.acquisitionUnitValue},totalGold:quote.totalGold,
  ...(settled?{remainingQuantity:quote.remainingQuantity,remainingGold:quote.remainingGold,wallet:copy(quote.wallet??null),...(quote.transfer?{stockTransfer:{originalItemId:quote.transfer.itemId,receivedItemId:quote.transfer.transferredItemId,quantity:quote.transfer.quantity,...copy(quote.transfer.transfer)},merchantPayment:copy(quote.transfer.wallets)}:{})}:{projectedAfterSale:{remainingQuantity:quote.remainingQuantity,remainingGold:quote.remainingGold}})};
 return settled?{stage:'回收交易已完成',settlement:result}:{stage:'回收询价已完成',proposedSale:result};
}

/** Pure receipt compilation. Quote values stay hypothetical; transfers refer to the resulting instance. */
export function compileCommerceReceipt(turn:StoryTurn,c:any){
 const actorId=c.actorId??c.buyerId??turn.after?.player?.id??null;
 if(c.type==='workshop-inspected'){
  known(c,['operation','data'],'回收询价');
  return {actorId,...sale(c.data,false)};
 }
 const fields=COMMERCE_RECEIPT_FIELDS[c.type];if(!fields)throw Error(`财物结果缺少编译：${c.type}`);known(c,fields,c.type);
 if(c.type==='commerce-inspected')return {actorId,stage:'已有商业资料已查看，未交易',data:compileCommerceContext(c.data)};
 if(c.type==='asset-auction')return {actorId,stage:c.summary,...copy(c)};
 if(['auction-proxy','commerce-debt','shop-auction-shipment'].includes(c.type)||c.type.startsWith('commercial-'))return {actorId,stage:c.summary,...copy(c)};
 if(c.type==='material-sold'&&c.movement)return {actorId,...sale(c,true),payment:cashPayment(c.payment),movement:copy(c.movement)};
 if(c.type==='material-bought')return {actorId,stage:'原材料交易已完成',direction:c.direction,assetRef:copy(c.assetRef),quantity:c.quantity,unitGold:c.unitGold,totalGold:c.totalGold,originalAccountId:c.accountId,payment:cashPayment(c.payment),movement:copy(c.movement)};
 if(c.type==='material-sold'||c.type==='item-sold'&&c.kind)return {actorId,...sale(c,true)};
 if(c.type==='item-bought'||c.type==='item-sold')return {stage:'商店交易已完成',actorId,direction:c.direction==='buy'?'玩家买入':'玩家卖出',shopId:c.shopId,
  item:{originalItemId:c.itemId,receivedItemId:c.transferredItemId,quantity:c.quantity,...copy(c.transfer??{})},
  payment:{segments:copy(c.segments??[]),unitGold:c.unitPrice,totalGold:c.totalGold,payer:copy(c.wallets?.payer??null),receiver:copy(c.wallets?.receiver??null)},ledgerId:c.ledgerId};
 if(c.type==='supply-bought'){
  const receivedItems=c.deliveries.map((d:any)=>({id:d.itemId,templateId:d.templateId,name:c.name,quantity:d.after-d.before,containerId:d.containerId,legalOwnerEntityId:d.legalOwnerId}));
  return {stage:'补给购买已完成',actorId,shopId:c.shopId,day:c.day,locationId:c.locationId,quantityPurchased:c.quantity,
    receivedItem:copy(receivedItems[0]),receivedItems,stockTransfers:(c.transfers??[]).map((r:any)=>({originalItemId:r.itemId,receivedItemId:r.transferredItemId,quantity:r.quantity,...copy(r.transfer)})),payment:{segments:copy((c.transfers??[]).flatMap((r:any)=>r.segments??[])),payerId:actorId,unitGold:c.unitValue,totalGold:c.totalGold,wallet:copy(c.wallet??null),supplierWallet:copy(c.supplierWallet??null)}};
 }
 if(c.type==='item-stored'||c.type==='item-retrieved')return {stage:c.type==='item-stored'?'物品已存入本人在此处的储物处':'物品已取回行囊',actorId,
  item:{originalItemId:c.originalItemId,receivedItemId:c.itemId,name:c.name,quantity:c.quantity,legalOwnerEntityId:c.legalOwnerEntityId},
  movement:{fromContainerId:c.fromContainerId,toContainerId:c.toContainerId,...Object.fromEntries(storagePositionFields.filter(key=>Object.hasOwn(c,key)).map(key=>[key,copy(c[key])]))},custodianId:c.custodianId};
 if(c.type==='stored-item-claimed')return {stage:'暂存物品已领入行囊',actorId,itemId:c.itemId,quantity:c.quantity,...Object.fromEntries(storagePositionFields.filter(key=>Object.hasOwn(c,key)).map(key=>[key,copy(c[key])]))};
 if(c.type==='coins-looted')return {stage:'遗骸钱币已拾取',actorId,sourceRemainsId:c.remainsId,goldReceived:c.amountGold,recordedAsStolen:c.stolen};
 return {stage:'遗留物品已拾取',actorId,sourceRemainsId:c.remainsId,receivedItemId:c.itemId,quantity:c.quantity,recordedAsStolen:c.stolen,...(c.materialDeliveries?{materialDeliveries:copy(c.materialDeliveries)}:{})};
}
