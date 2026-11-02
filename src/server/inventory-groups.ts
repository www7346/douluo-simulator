import {rules} from '../rules';

/** Presentation groups retain every physical instance and never change a stack. */
export function inventoryGroups(state:any,items:any[]){
 const playerId=state.角色?.主控单位ID,unit=state.战斗单位?.列表?.[playerId],battle=state.战斗??{};
 const equipped=new Set(Object.values(state.装备?.配置??{}).flatMap((entry:any)=>Object.values(entry.slots??{})));
 const activeStatuses=Object.values(state.状态实例?.列表??{}).filter((status:any)=>status.状态==='生效');
 const groups=new Map<string,{id:string;memberIds:string[];totalQuantity:number}>();
 for(const item of items){
  const comparable=structuredClone(item);delete comparable.id;delete comparable.quantity;
  if(comparable.payload){delete comparable.payload.skillId;delete comparable.payload.skillIds;}
  if(comparable.provenance?.type==='blueprint-craft'){delete comparable.provenance.transactionId;delete comparable.provenance.batchIndex;}
  const skills=rules.world.inspectItem(state,item).skills??[],skillIds=new Set(skills.map((skill:any)=>skill.id));
  const usage=skills.map((skill:any)=>{
   const key=skill.usageKey||skill.usageRules?.worldUsageGroup||skill.id;
   return [unit?.扩展?.技能使用日账?.[key]??null,unit?.扩展?.场外技能冷却?.[key]??null,battle.扩展?.技能使用次数?.[playerId]?.[key]??null,battle.扩展?.技能冷却?.[playerId]?.[key]??null,battle.扩展?.技能组使用次数?.[playerId]?.[skill.usageRules?.perBattleGroup]??null];
  });
  const active=activeStatuses.some((status:any)=>status.来源?.物品ID===item.id||skillIds.has(status.来源?.技能ID));
  const separate=equipped.has(item.id)||active||Boolean(rules.sealing.byItem(state,item.id))||Boolean(rules.deviceLocks.definition(state,item));
  const key=separate?'instance:'+item.id:rules.abilities.hash({item:comparable,usage});
  const group=groups.get(key);if(group){group.memberIds.push(item.id);group.totalQuantity+=item.quantity??1;}
  else groups.set(key,{id:item.id,memberIds:[item.id],totalQuantity:item.quantity??1});
 }
 return [...groups.values()];
}
