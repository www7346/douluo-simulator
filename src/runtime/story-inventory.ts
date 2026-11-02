import {rules} from '../rules';
import {storyOwnedItemFacts} from './story-person-dossier';
import {abilityWritingMeaning} from './ability-writing';
import {modifierPresentation} from './ability-text';

/** Official item readers and one-unit equipment previews; no world trial or payment. */
export function inspectStoryInventory(state:any,input:any={}){
 const entityId=state.角色.主控单位ID,owned=storyOwnedItemFacts(state,entityId),view=input.view??'summary';
 const selected=input.selectedItemId?owned.filter((i:any)=>i.id===input.selectedItemId):owned;
 if(input.selectedItemId&&!selected.length)throw Error('行囊中没有这件属于你的物品');
 const receipt:any={type:'inventory-inspected',entityId,inventory:selected,summary:'已查看本人现有物品、数量及携带或寄存位置'};
 if(view==='summary')return receipt;
 const detailRows=view==='equipment-comparison'?owned.filter((row:any)=>row.carried&&state.物品.实例[row.id]?.type==='魂导器'):selected;
 receipt.details=detailRows.map((row:any)=>{const item=state.物品.实例[row.id],d=rules.world.inspectItem(state,item);return {itemId:item.id,name:item.name,type:item.type,description:d.description??item.扩展?.描述??'',passiveEffectGraph:d.passiveEffectGraph??null,passiveCombat:d.passiveCombat??null,passiveMeaning:d.passiveEffectGraph?.nodes?.length?abilityWritingMeaning({effectGraph:d.passiveEffectGraph},'soul-device').summary:'',passiveStats:[...modifierPresentation(d.modifiers,{},state).map(v=>v.label+v.value),...Object.entries(d.passiveCombat??{}).filter(([key,value])=>value&&Object.hasOwn(rules.foundation.EQUIPMENT_AFFIXES.REGISTRY,key)).map(([key,value])=>rules.foundation.EQUIPMENT_AFFIXES.describe(key,value))],skills:d.skills.map((s:any)=>({id:s.id,name:s.name??s.名称,meaning:abilityWritingMeaning(s,s.sourceKind??'soul-device').summary}))};});
 if(view!=='equipment-comparison')return receipt;
 const config=state.装备.配置[entityId],slots=rules.world.EQUIPMENT_SLOTS,open=slots.find((slot:string)=>!config.slots[slot]);
 const candidates=detailRows.filter((row:any)=>row.carried&&state.物品.实例[row.id]?.type==='魂导器').flatMap((row:any)=>{
  const already=slots.find((slot:string)=>config.slots[slot]===row.id),targetSlots=already?[already]:open?[open]:slots;
  return targetSlots.map((slot:string)=>({...rules.world.previewEquipment(state,{entityId,itemId:row.id,slot,replace:true}),itemId:row.id,name:row.name}));
 });
 const vector=(c:any)=>Object.fromEntries([...Object.entries(c.after?.derived??{}).filter(([,v])=>typeof v==='number'),...Object.entries(c.after?.attributes?.有效??{}).filter(([,v])=>typeof v==='number'),...Object.entries(c.after?.equipment??{}).map(([key,v])=>['装备:'+key,v]),...Object.entries(c.after?.resources??{}).map(([key,v]:[string,any])=>[key+'上限',v.最大])]);
 const dominates=(a:any,b:any)=>{const av=vector(a),bv=vector(b),keys=[...new Set([...Object.keys(av),...Object.keys(bv)])];return keys.length>0&&keys.every(k=>Number(av[k]??0)>=Number(bv[k]??0));};
 const available=candidates.filter((c:any)=>c.available),special=receipt.details.some((d:any)=>(d.passiveEffectGraph?.nodes??[]).some((n:any)=>n.effectId!=='passive.equipment_stat')||d.skills.length||Object.keys(d.passiveCombat??{}).some(k=>!Object.hasOwn(rules.foundation.EQUIPMENT_AFFIXES.REGISTRY,k))),best=special?[]:available.filter((a:any)=>available.every((b:any)=>dominates(a,b)));
 // Unmodelled passive mechanisms, maintenance and attribute tradeoffs remain visible
 // in details; do not manufacture a scalar rating for unlike protections.
 const selection=best.length?best.sort((a:any,b:any)=>String(a.itemId).localeCompare(String(b.itemId))||String(a.slot).localeCompare(String(b.slot)))[0]:null;
 receipt.comparison={candidates,selection:selection?{itemId:selection.itemId,slot:selection.slot,replacingItemId:selection.replacingItemId}:null,requiresChoice:new Set(available.map((c:any)=>c.itemId)).size>1&&!selection};
 return receipt;
}
