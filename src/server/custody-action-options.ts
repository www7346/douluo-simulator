import {rules} from '../rules';

export function selfCustodyPermissions(state:any){
 const actorId=state.角色.主控单位ID;
 const people=(Object.values(state.人物.列表) as any[]).filter(p=>p.id!==actorId&&p.status!=='dead'&&rules.actions.colocated(state,actorId,p.id)&&rules.actions.perception(state,actorId,p.id));
 const duties=people.map(p=>({targetId:p.id,name:p.name,modes:['guard','escort'].map(mode=>({id:mode,...rules.world.previewIntent(state,{type:'permit-custody-duty',targetId:p.id,mode})}))}));
 const known=new Map<string,any>();
 for(const request of rules.custody.requestedPermissions(state).filter((r:any)=>r.targetId===actorId)){
  const item=state.物品.实例[request.itemId],person=people.find(p=>p.id===request.actorId);
  if(item&&person&&item.ownerEntityId===person.id&&item.containerId===person.inventoryContainerId&&!item.attachment)known.set(`${person.id}:${item.id}`,{targetId:person.id,operatorName:person.name,itemId:item.id,name:item.name,...rules.world.previewIntent(state,{type:'permit-restraint',targetId:person.id,itemId:item.id})});
 }
 return {duties,restraints:[...known.values()]};
}
export function captiveSearchOptions(state:any,input:Record<string,any>){
 if(Object.keys(input).some(k=>k!=='targetId')||typeof input.targetId!=='string')throw Error('请选择要搜取财物的人物');
 const actorId=state.角色.主控单位ID,c=rules.custody.active(state,input.targetId),target=state.人物.列表[input.targetId];
 if(!c||c.custodianId!==actorId||!target||!rules.actions.colocated(state,actorId,target.id))return {items:[],coins:{maximum:0,available:false},reason:'请先来到你关押的人面前，再搜身'};
 const items=(Object.values(state.物品.实例) as any[]).filter(i=>i.ownerEntityId===target.id&&i.containerId===target.inventoryContainerId).flatMap(i=>{const q=rules.world.previewIntent(state,{type:'search-captive',targetId:target.id,itemId:i.id,quantity:1});return q.available?[{itemId:i.id,name:i.name,maxQuantity:i.quantity}]:[];});
 const q=rules.world.previewIntent(state,{type:'search-captive',targetId:target.id,quantity:1}),maximum=q.available?state.钱包.列表[target.walletId].gold:0;
 return {targetId:target.id,name:target.name,items,coins:{maximum,available:q.available,reason:q.reason},reason:items.length||q.available?'':q.reason};
}
