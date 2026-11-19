import {rules} from '../rules';
import {canInspectPersonEquipment} from '../runtime/resident-access';
import {wornRestraintsPresentation} from '../runtime/worn-restraints-presentation';
import {assertWorldCommandActor} from '../runtime/world-command-actor';

/** One wearer list for inventory attachments, equipment slots and actual soul bones. */
export function personEquipmentPresentation(state:any,input:Record<string,any>){
 if(Object.keys(input).some(k=>k!=='personId')||typeof input.personId!=='string')throw Error('请选择实际人物');
 const personId=input.personId,viewerId=state.角色.主控单位ID;
 if(!canInspectPersonEquipment(state,personId,viewerId))return {personId,hidden:true,worn:[],available:[]};
 const quoted=rules.world.intentPreviewer(state),preview=(intent:any)=>{try{assertWorldCommandActor(state,intent);const q=quoted(intent);return {intent,available:q.available!==false,reason:q.reason??'',cost:q.cost??null,minutes:q.minutes??null};}catch(e){return {intent,available:false,reason:(e as Error).message,cost:null,minutes:null};}};
 const config=state.装备?.配置?.[personId],configured=new Map<string,string>([...Object.entries(config?.slots??{}),...Object.entries(config?.soulBoneSlots??{})].filter(([,id])=>typeof id==='string').map(([slot,id])=>[String(id),slot]));
 const restraints=new Map(wornRestraintsPresentation(state,personId,viewerId).map((r:any)=>[r.itemId,r]));
 const worn=Object.values(state.物品.实例).filter((item:any)=>item.attachment?.wearerId===personId||configured.has(item.id)).map((item:any)=>{
  const restraint:any=restraints.get(item.id),managed=rules.realmArrangements.isManaged(item),binding=rules.residentRealms.binding(state,personId),group=item.provenance?.group;
  let remove=null;
  if(managed){if(group&&group!=='collar')remove=preview({type:'set-realm-arrangement',realmId:binding.realm.id,targetId:personId,[group]:'free'});}
  else if(item.attachment&&rules.intimate.DEVICES[item.templateId])remove=preview({type:'intimate-detach',itemId:item.id});
  else if(restraint)remove=preview({type:'detach-restraint',itemId:item.id});
  return {itemId:item.id,name:item.name,kind:item.type,part:restraint?.part??item.attachment?.slot??configured.get(item.id)??'佩戴处',modeLabel:restraint?.modeLabel??'',managed,permanent:managed&&group==='collar',restraint,remove};
 });
 const inventory=state.容器.列表[state.人物.列表[viewerId].inventoryContainerId];
 const available=(inventory?.itemIds??[]).flatMap((id:string)=>{
  const item=state.物品.实例[id];if(!item||item.attachment||item.ownerEntityId!==viewerId)return [];
  const restraint=rules.custody.resolveDevice(item);
  if(!restraint)return [];
  const intent={type:'attach-restraint',targetId:personId,itemId:id};
  return [{itemId:id,name:item.name,kind:item.type,...preview(intent)}];
 });
 return {personId,hidden:false,worn,available};
}
