import {rules} from '../rules';
import {abilityWritingMeaning} from './ability-writing';

/** Project already generated choices; never compile new mechanics or create a ring while reading. */
export function readStoryRingChoices(state:any,pendingId:string){
 const stored=state.魂环?.待选择?.[pendingId],playerId=state.角色?.主控单位ID;
 if(!stored||stored.status!=='pending'||stored.playerId!==playerId)throw Error('没有属于你的待选魂技方案');
 const pending=rules.cycle.ringSkillChoicePresentation(state,pendingId);
 return {pendingId:pending.id,martialSoulId:pending.martialSoulId,martialSoulName:state.武魂.列表[pending.martialSoulId]?.名称,
  beastName:state.魂兽档案?.列表?.[pending.beastProfileId]?.名称,years:pending.years,ringOrdinal:pending.ringOrdinal,
  absorbed:false,sourceKind:pending.sourceSettlement?.kind??'beast-remains',sourceNarrative:state.魂兽档案?.列表?.[pending.beastProfileId]?.扩展?.机缘叙事??null,
  candidates:pending.candidates.map((candidate:any,index:number)=>({candidateId:candidate.id,number:index+1,title:candidate.title,
   skills:candidate.skills.map((skill:any)=>({id:skill.id,name:skill.name,meaning:abilityWritingMeaning(skill)}))}))};
}

export function storyRingFacts(state:any){
 const active=state.远征?.当前,room=active?.currentRoom,playerId=state.角色?.主控单位ID;
 const sources=active?.phase==='postcombat'?(room?.roster??[]).filter((beast:any)=>state.战斗单位?.列表?.[beast.unitId]?.存活状态==='死亡').map((beast:any)=>({beastUnitId:beast.unitId,name:beast.name,years:beast.years})):[];
 const pending=(Object.values(state.魂环?.待选择??{}) as any[]).filter(p=>p.status==='pending'&&p.playerId===playerId).map(p=>{
  const presented=rules.cycle.ringSkillChoicePresentation(state,p.id);
  return {pendingId:p.id,martialSoulId:p.martialSoulId,years:p.years,ringOrdinal:p.ringOrdinal,absorbed:false,
   candidates:presented.candidates.map((candidate:any,index:number)=>({candidateId:candidate.id,number:index+1,title:candidate.title,skillNames:candidate.skills.map((skill:any)=>skill.name)}))};
 });
 const container=state.容器?.列表?.[state.人物?.列表?.[playerId]?.inventoryContainerId];
 const items=(container?.itemIds??[]).flatMap((id:string)=>{const item=state.物品?.实例?.[id];return item?.ownerEntityId===playerId&&rules.cycle.isRingItem(item)?[{itemId:id,...rules.cycle.ringItemFacts(item),sourceNarrative:item.payload?.narrative??null,pendingId:item.payload?.ringPreparation?.pendingId??null}]:[];});
 return {sources,items,pending};
}
