import {personalMaintenanceOptions} from './personal-field-abilities';
import {rules} from '../rules';
import {storyActionState} from './story-state-writing-facts';
import {storyAbilityFacts} from './story-person-dossier';
import {medicineActionOptions} from './medicine-action-options';
import {communicationAvailability} from '../shared/story-communication';

/** Host-only planning context; never include this in NPC response or private prose facts. */
export function privateStoryActionResources(state:any,personId:string){
 const playerId=state.角色?.主控单位ID,player=state.人物?.列表?.[playerId],recipient=state.人物?.列表?.[personId];
 if(!player||!recipient||playerId===personId)throw Error('私聊行动资料的对象不存在');
 const participants=[playerId,personId],remote=!rules.actions.colocated(state,playerId,personId);
 const items=(Object.values(state.物品?.实例??{}) as any[]).filter(item=>item.ownerEntityId===playerId&&item.containerId===player.inventoryContainerId).map(item=>{
  let reason='';try{rules.world.previewGift(state,{personId,itemId:item.id,quantity:1,promise:true});}catch(error){reason=String((error as Error).message);}
  const medicine=remote?null:medicineActionOptions(state,item,playerId);if(medicine){medicine.targets=medicine.targets.filter((p:any)=>participants.includes(p.id));medicine.sources=[];if((Object.values(state.人物.列表) as any[]).some(p=>!participants.includes(p.id)&&p.status!=='dead'&&rules.actions.colocated(state,playerId,p.id)))medicine.operations=medicine.operations.filter((id:string)=>id!=='release-toxic-cloud');}
  return {itemId:item.id,name:item.name,quantity:item.quantity,canGiveOne:!reason,unavailableReason:reason||null,...(medicine?{medicine}:{})};
 });
 const custodyNews=rules.social.known(state,playerId).map((k:any)=>({factId:k.fact.id,kind:k.fact.kind,occurredAt:k.fact.occurredAt,subject:k.fact.subject}));
 const sealing=rules.sealing.facts(state,playerId),poisons=rules.poison.facts(state,playerId);
 sealing.targets=sealing.targets.filter((p:any)=>participants.includes(p.id));
 sealing.permissions=sealing.permissions.filter((p:any)=>participants.includes(p.targetId)&&participants.includes(p.operatorId));
 const carrierAllowed=(itemId:string)=>{const item=state.物品.实例[itemId],container=state.容器.列表[item?.containerId];return !!container&&participants.includes(container.ownerEntityId)&&rules.actions.colocated(state,playerId,container.ownerEntityId);};
 sealing.devices=remote?[]:sealing.devices.filter((d:any)=>{const sealed=rules.sealing.byItem(state,d.itemId);return (!sealed||participants.includes(sealed.targetId))&&carrierAllowed(d.itemId);});
 poisons.offers=poisons.offers.filter((o:any)=>participants.includes(o.actorId)&&participants.includes(o.targetId));
 poisons.sources=remote?[]:poisons.sources.filter((r:any)=>['direct-oral','apply-contact-drug','direct-spray'].includes(r.carrier.kind)?participants.includes(r.carrier.targetId):['serving','coating'].includes(r.carrier.kind)?carrierAllowed(r.carrier.itemId):r.carrier.kind==='daily-cloud'&&rules.abilities.hash(r.carrier.position)===rules.abilities.hash(rules.actions.positionOf(state,playerId))&&!(Object.values(state.人物.列表) as any[]).some(p=>!participants.includes(p.id)&&p.status!=='dead'&&rules.actions.colocated(state,playerId,p.id)));
 const personalResources={communication:communicationAvailability(state,personId),abilities:storyAbilityFacts(state,playerId),actionState:storyActionState(state,playerId),maintenance:personalMaintenanceOptions(state,playerId),abilityUseRequests:rules.world.abilityUseFacts(state,playerId).filter((r:any)=>participants.includes(r.actorId)&&participants.includes(r.targetId)),poisons,sealing};
 return {audience:'action-host-only',...personalResources,items,custodyNews,custodyTradeOptions:rules.custodyMarket.options(state,playerId),custodyTrades:rules.custodyMarket.facts(state,playerId),lootTemplates:rules.expedition.loot.templates(),lootPriorities:rules.expedition.loot.priorityFacts(state),pendingLoot:rules.expedition.loot.pending(state),lootAllocations:rules.expedition.loot.view(state).records,lootResolutions:rules.expedition.loot.visibleResolutions(state).slice(-8),lootMembers:rules.world.partyMembers(state).map((p:any)=>({personId:p.personId,name:p.name,present:p.present})),lootAgreements:rules.expedition.loot.visibleRecords(state).filter((r:any)=>!r.expeditionId).map((r:any)=>({id:r.id,dungeonId:r.dungeonId,terms:r.terms})).slice(-3)};
}

/** Main-person capability only. Recipe values are registered data, not granted permission. */
export function supportManufacturingResources(state:any){
 const actorId=state.角色?.主控单位ID,actor=state.战斗单位?.列表?.[actorId];
 if(!actor||!actor.扩展?.辅助能力?.食品制造&&!actor.标签?.includes('食物系'))return null;
 const recipes=Object.entries(rules.world.SUPPORT_CONSUMABLE_RECIPES).map(([id,recipe]:[string,any])=>{
  try{const q=rules.world.quoteSupportConsumable(state,{recipeId:id});return {id,name:recipe.name,soulPowerCost:q.soulPowerCost,shelfLifeDays:recipe.shelfLifeDays,dailyLimit:recipe.dailyLimit,worldCooldownDays:recipe.worldCooldownDays,available:true};}
  catch(error){return {id,name:recipe.name,soulPowerCost:recipe.soulPowerCost,shelfLifeDays:recipe.shelfLifeDays,dailyLimit:recipe.dailyLimit,worldCooldownDays:recipe.worldCooldownDays,available:false,reason:String((error as Error).message)};}
 });
 const modifiers=(actor.能力?.技能ID??[]).map((id:string)=>state.技能.列表[id]).filter((skill:any)=>skill?.effectGraph?.nodes?.some((n:any)=>n.effectId==='modifier.next_skill')).map((skill:any)=>({id:skill.id,name:skill.name,modes:(skill.castModes?.length?skill.castModes:[{id:undefined,name:'默认施放'}]).map((mode:any)=>{try{const q=rules.combat.quoteManufacturingModifier(state,actorId,skill.id,0,mode.id);return {...(mode.id?{id:mode.id}:{}),name:mode.name??mode.id,available:true,payment:q.payment,outputScale:Number(q.params.成品效果倍率??100)/100};}catch(error){return {...(mode.id?{id:mode.id}:{}),name:mode.name??mode.id,available:false,reason:String((error as Error).message)};}})}));
 return {actorId,recipes,modifiers};
}
