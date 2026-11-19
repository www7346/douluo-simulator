import {rules} from '../rules';
import {abilityWritingMeaning,researchAbilityWritingSource} from './ability-writing';
import {storyMaterialFacts} from './story-materials';
import {storyMaterialSupplyFacts} from './story-commerce';

function frozenResearchPreset(p:any){const candidates=p.mechanicCandidates??[],id=candidates[0]?.presetId;return id&&candidates.every((candidate:any)=>candidate.presetId===id)?{presetId:id}:{};}

export function readResearchChoices(state:any,pendingId:string,actorId=state.角色?.主控单位ID){
 const p=rules.expedition.assertResearchOwner(state,state.研发?.待处理?.[pendingId],actorId);
 return {...frozenResearchPreset(p),pendingId:p.id,status:p.status,category:p.category,concept:p.concept,materials:p.materialSelections,totalUnits:p.totalUnits,totalMaterialValue:p.totalMaterialValue,chosenIndex:p.chosenIndex,blueprintId:p.blueprintId??null,
  candidates:(p.candidates??[]).filter((c:any)=>c.pass).map((c:any)=>({candidateIndex:c.index,number:c.index+1,name:c.normalized.name,description:c.normalized.description,form:c.normalized.form,...(c.normalized.presetId?{presetId:c.normalized.presetId}:{}),...(c.normalized.confirmedDesign?{confirmedDesign:structuredClone(c.normalized.confirmedDesign),designQuote:structuredClone(c.normalized.designQuote)}:{}),...(c.normalized.hostDesign?{hostDesign:structuredClone(c.normalized.hostDesign),hostQuote:structuredClone(c.normalized.hostQuote)}:{}),meaning:abilityWritingMeaning({...c.normalized,effectGraph:c.normalized.graph},researchAbilityWritingSource(p.category,c.normalized))}))};
}
export function storyWorkshopFacts(state:any,actorId=state.角色?.主控单位ID,includePublic=false){
 return {access:rules.expedition.previewWorkshopAccess(state,{actorId}),currency:{...rules.world.CURRENCY,smallestUnit:1},
  pending:(Object.values(state.研发?.待处理??{}) as any[]).filter(p=>p.actorId===actorId&&p.status!=='completed').map(p=>readResearchChoices(state,p.id,actorId)),
  blueprints:[...(Object.values(state.研发?.蓝图??{}) as any[]).filter(b=>b.ownerId===actorId),...rules.deviceKeyManufacturing.blueprints(state,actorId),...(includePublic?rules.expedition.presetBlueprints(state,actorId):[])].map(b=>b.productKind==='device-key'?{blueprintId:b.id,name:b.name,category:'钥匙',requiredValue:b.requiredValue,description:'通过实际解析取得的对应锁结构图纸。',bridgeClauses:b.bridgeClauses,meaning:{activation:'按图纸制造',summary:'消耗满足价值和特性的真实材料制造匹配实体钥匙；钥匙按实例或同图纸范围对应。'}}:({blueprintId:b.id,name:b.name,category:b.category,requiredValue:b.requiredValue,description:b.description,bridgeClauses:b.bridgeClauses,...(b.mechanics.presetId?{presetId:b.mechanics.presetId}:{}),...(b.mechanics.confirmedDesign?{confirmedDesign:structuredClone(b.mechanics.confirmedDesign),designQuote:structuredClone(b.mechanics.designQuote)}:{}),...(b.mechanics.hostDesign?{hostDesign:structuredClone(b.mechanics.hostDesign),hostQuote:structuredClone(b.mechanics.hostQuote)}:{}),meaning:abilityWritingMeaning(b.mechanics,researchAbilityWritingSource(b.category,b.mechanics))})),
  };
}
export function inspectWorkshop(state:any,action:any){
 const {kind,...p}=action;let data:any;
 if(kind==='inspect-workshop')data={...storyWorkshopFacts(state,undefined,true),materials:storyMaterialFacts(state)};
 else if(kind==='recommend-research'){const recipe=p.presetId?rules.expedition.researchPresetRequirements(p.presetId,p.category):null;data={...rules.expedition.recommendResearchMaterials(state,p),access:rules.expedition.previewWorkshopAccess(state),materialSupply:storyMaterialSupplyFacts(state),...(recipe?{presetName:recipe.name,minimumBudget:recipe.minimumBudget,materialRequirements:recipe.materialRequirements}:{})};}
 else if(kind==='preview-research')data={...rules.expedition.previewResearch(state,p),access:rules.expedition.previewWorkshopAccess(state),materials:p.materials,materialsRefundable:false};
 else if(kind==='inspect-research')data=readResearchChoices(state,p.pendingId);
 else if(kind==='preview-craft')data=rules.expedition.previewBlueprintCraft(state,p.blueprintId,{quantity:p.quantity,materials:p.materials,includeMaximum:false});
 else if(kind==='quote-material-sale')data=rules.expedition.previewEconomy(state,{type:'material.sell',fingerprint:p.fingerprint,quantity:p.quantity});
 else if(kind==='quote-item-sale')data=rules.expedition.previewEconomy(state,{type:'item.sell',itemId:p.itemId,quantity:p.quantity});
 else throw Error('不支持这项工坊查看');
 if(['recommend-research','preview-research'].includes(kind)&&p.presetId)data.presetId=p.presetId;
 if(['recommend-research','preview-research'].includes(kind)&&p.confirmedDesign)data.confirmedDesign=rules.paidDesign.normalize(p.category,p.confirmedDesign);
 return {state,receipt:{type:'workshop-inspected',operation:kind,data:structuredClone(data),summary:'已查看实际条件与用料，尚未投入、选择、制造或出售'}};
}
