import {rules} from '../rules';
import {storyObjectRecord,storyObjectKnownDetails} from './story-objects';
import {storyNameKey} from './story-person-names';
const itemIdentity=(item:any)=>({name:item.name,type:item.type,templateId:item.templateId,quantity:item.quantity,containerId:item.containerId,legalOwnerEntityId:item.legalOwnerEntityId||null,unpriced:!!rules.world.ITEM_TEMPLATES[item.templateId]?.unpriced});

/** Materialize a sourced personal keepsake. It is not an economic reward or an ability generator. */
export function instantiateStoryItem(state:any,input:Record<string,any>,sourceId:string){
 if(Object.keys(input).some(k=>k!=='objectId')||typeof input.objectId!=='string'||!input.objectId)throw Error('须引用已登记叙事物品，不接受自行填写的物品能力或所有权');
 const privatePersonId=state.扩展?.story?.active?.privatePersonId;
 const object=storyObjectRecord(state,input.objectId,'item',privatePersonId);
 if(object.entityId){const item=state.物品?.实例?.[object.entityId];if(!item)throw Error('原物品档案不存在，不能重新生成');return {state,receipt:{type:'story-item-instantiated',objectId:object.id,itemId:item.id,ownerEntityId:item.ownerEntityId,itemIdentity:itemIdentity(item),reused:true,summary:'沿用原物品档案；不改变持有人或再次发放。'}};}
 const block=rules.world.worldActionBlockReason(state);if(block)throw Error(block);
 if(state.远征?.当前&&!['completed','failed','extracted'].includes(state.远征.当前.status))throw Error('远征收获须由房间和结算规则取得');
 const known=storyObjectKnownDetails(object),playerId=state.角色?.主控单位ID;
 if(typeof known.holder!=='string')throw Error('尚无正文直接确立的持有人；传闻、自述或仅有外观不能发放物品');
 const people=(Object.values(state.人物?.列表??{}) as any[]).filter(p=>known.holder==='你'?p.id===playerId:storyNameKey(p.name)===storyNameKey(String(known.holder)));
 if(people.length!==1)throw Error('原文持有人尚未唯一对应真实人物，请先确定人物');
 const holder=people[0];
 if(!playerId||!rules.actions.colocated(state,holder.id,playerId)||holder.status!=='active'||state.战斗单位?.列表?.[holder.id]?.存活状态==='死亡'||privatePersonId&&![playerId,privatePersonId].includes(holder.id))throw Error('持有人不在当前可交互范围，不能在此生成或转移其物品');
 const name=String(known.name??object.mentions.at(-1)!.name);
 const owners=known.owner===undefined?[]:(Object.values(state.人物.列表) as any[]).filter(p=>known.owner==='你'?p.id===playerId:storyNameKey(p.name)===storyNameKey(String(known.owner)));
 if(known.owner!==undefined&&owners.length!==1)throw Error('原文所有人尚未唯一对应真实人物');
 if((Object.values(state.物品?.实例??{}) as any[]).some(i=>i.ownerEntityId===holder.id&&storyNameKey(i.name)===storyNameKey(name)))throw Error('持有人已有同名实际物品，请核对原实例，不创建副本');
 const item=rules.world.createItem(state,'story-keepsake',holder.id,holder.inventoryContainerId,{id:`story-item:${sourceId}`,name,quantity:1,forceUnique:true,valuePoints:0,
  provenance:{type:'story-object',storyObjectId:object.id,sourceId,initialHolderId:holder.id},扩展:{storyObjectId:object.id,storyObjectBasis:known,...(known.appearance?{描述:String(known.appearance)}:{})}});
 item.legalOwnerEntityId=owners[0]?.id??'';
 object.entityId=item.id;
 return {state,receipt:{type:'story-item-instantiated',objectId:object.id,itemId:item.id,ownerEntityId:holder.id,legalOwnerEntityId:item.legalOwnerEntityId,itemIdentity:itemIdentity(item),reused:false,summary:`已将${name}登记为${holder.name}持有的实际随身物；所有权另看实际档案，尚无鉴定价值或战斗能力，未转交他人。`}};
}
