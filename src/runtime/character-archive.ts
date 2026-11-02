import {rules} from '../rules';
import {unitAbilities} from './ability-presentation';

/** Existing residents are authoritative. Only an uninstantiated catalog reference
 * is compiled in an isolated world, without writing to the player's save/RNG. */
export function characterCombatArchive(characterId:string,currentState?:any,historical=false) {
 if(historical)currentState=undefined;
 const record=rules.arena.CHARACTER_CATALOG[characterId];
 const personId=record?rules.arena.persistentCharacterId(characterId):characterId;
 const person=currentState?.人物?.列表?.[personId],existingUnit=currentState?.战斗单位?.列表?.[personId];
 const residentSource=person?.扩展?.角色库ID??existingUnit?.扩展?.角色库ID;
 const persistentRecord=record??(residentSource&&rules.arena.persistentCharacterId(residentSource)===personId?rules.arena.CHARACTER_CATALOG[residentSource]:null);
 if(record&&!record.battleCapable||!record&&!person)return null;
 if(persistentRecord&&(person||existingUnit)&&(!person||person.combatantId!==personId||!existingUnit||existingUnit.扩展?.角色库ID!==persistentRecord.id||!existingUnit.扩展?.持久人物))return null;
 const result=record&&!person?rules.arena.instantiateCharacter(rules.world.makeInitialState('character-archive'),characterId,{instanceId:`archive-${characterId}`}):null;
 const state=result?.state??currentState,unitId=result?.unitId??(person.combatantId||person.unitId||characterId);
 const unit=state.战斗单位?.列表?.[unitId],skills=unit?unitAbilities(state,unitId):[];
 const souls=(Object.values(state.武魂.列表) as any[]).filter(soul=>soul.持有者单位ID===unitId).map(soul=>({
  id:soul.id,name:soul.名称,grade:soul.品级标签,
  rings:soul.魂环ID列表.map((id:string)=>{const ring=state.魂环.列表[id];return{id,ordinal:ring.序号,years:ring.年限,color:ring.颜色,skills:ring.魂技ID列表.map((skillId:string)=>state.技能.列表[skillId]).filter(Boolean)};}),
 }));
 const ringSkillIds=new Set(souls.flatMap(soul=>soul.rings.flatMap((ring:any)=>ring.skills.map((skill:any)=>skill.id))));
 const config=state.装备?.配置?.[unitId];
 const itemIds=result?[...(result.generated.itemIds??[]),...(result.generated.soulBoneItemIds??[])]:[
  ...(Object.values(state.物品?.实例??{}) as any[]).filter(item=>rules.world.isCarriedItem(state,item,unitId)).map(item=>item.id),
  ...Object.values(config?.slots??{}),...Object.values(config?.soulBoneSlots??{}),
 ];
 const items=[...new Set(itemIds)].filter((id:any)=>state.物品.实例[id]?.ownerEntityId===unitId).map((id:any)=>rules.world.inspectItem(state,id));
 const itemSkillIds=new Set(items.flatMap((item:any)=>item.skills.map((skill:any)=>skill.id)));
 const canonical=record??(unit?.扩展?.持久人物&&rules.arena.persistentCharacterId(unit.扩展.角色库ID)===unitId?rules.arena.CHARACTER_CATALOG[unit.扩展.角色库ID]:null);
 return{state,unitId,name:person?.name??record?.name,kind:canonical?.kind??'resident',canonical:Boolean(canonical),source:result?'catalog-sample' as const:'persistent' as const,battleCapable:Boolean(unit),souls,items,
  otherSkills:skills.filter((skill:any)=>!ringSkillIds.has(skill.id)&&!itemSkillIds.has(skill.id)),
  skillCount:skills.length,healthMax:unit?.资源.生命.最大??0,soulPowerMax:unit?.资源.魂力.最大??0};
}
