/** Commands which actually produce or move one addressable item; query results are excluded. */
export const STORY_ITEM_RESULTS:Record<string,{type:string;field:string;action?:string}>={
 'intimate-craft':{type:'intimate-craft',field:'itemId'},
 'intimate-detach':{type:'intimate-detach',field:'itemId'},
 'opening-guidance':{type:'opening-gift-claimed',field:'itemId',action:'claim'},
 'instantiate-item':{type:'story-item-instantiated',field:'itemId'},
 'choose-research':{type:'research-blueprint-created',field:'prototypeItemId'},
 'craft-blueprint':{type:'blueprint-crafted',field:'itemId'},
 buy:{type:'item-bought',field:'transferredItemId'},
 'supply-buy':{type:'supply-bought',field:'itemId'},
 'create-support-consumable':{type:'support-consumable-created',field:'itemId'},
 'store-item':{type:'item-stored',field:'itemId'},
 'retrieve-item':{type:'item-retrieved',field:'itemId'},
 'search-captive':{type:'captive-searched',field:'itemId'},
 'detach-restraint':{type:'restraint-detached',field:'itemId'},
 'loot-item':{type:'item-looted',field:'itemId'},
 'collect-auction-item':{type:'asset-auction',field:'itemId'},
 'collect-loot':{type:'loot-collected',field:'receivedItemId'},
};
export function storyItemSource(action:any):boolean{
 const spec=STORY_ITEM_RESULTS[action?.kind];
 return !!spec&&(spec.action===undefined||action.action===spec.action);
}
export function storyItemResult(step:any):string|null{
 const spec=STORY_ITEM_RESULTS[step?.action?.kind],r=step?.receipt;
 if(!storyItemSource(step?.action)||step.status!=='succeeded'||r?.type!==spec.type)return null;
 if(step.action.kind==='collect-auction-item'){
  if(r.action!=='collected'||!['completed','cancelled','unsold','invalidated'].includes(r.status)||typeof r.eventId!=='string'||!r.eventId||r.itemDelivery?.kind!=='item'||typeof r.itemId!=='string'||!r.itemId||r.itemDelivery.sourceItemId!==r.itemId||r.itemDelivery.quantity!==r.quantity)return null;
  return collectedItem(r,r.itemDelivery,'itemId');
 }
 if(step.action.kind==='collect-loot'){
  const delivery=r.lootDelivery;
  if(!['completed','already-completed'].includes(delivery?.status)||delivery.resourceKind!=='item'||typeof delivery.resolutionId!=='string'||!delivery.resolutionId||typeof delivery.sourceId!=='string'||!delivery.sourceId)return null;
  return collectedItem(r,delivery,'receivedItemId');
 }
 if(r.itemIds?.length>1||typeof r[spec.field]!=='string'||!r[spec.field])return null;
 return r[spec.field];
}

/** A lot/resource ID is not proof of the item actually handed to this actor. */
function collectedItem(receipt:any,delivery:any,field:string):string|null{
 const id=delivery?.[field];
 if(typeof id!=='string'||!id||typeof receipt.actorId!=='string'||!receipt.actorId||delivery.recipientId!==receipt.actorId||typeof delivery.containerId!=='string'||!delivery.containerId||!Number.isSafeInteger(delivery.quantity)||delivery.quantity<1)return null;
 for(const ids of [receipt.itemIds,delivery.itemIds])if(ids!==undefined&&(!Array.isArray(ids)||ids.length!==1||ids[0]!==id))return null;
 return id;
}
