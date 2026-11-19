import {storyNpcMechanicsFacts} from './story-npc-mechanics';
import {perceivedActionState,storyActionState} from './story-state-writing-facts';
import {rules} from '../rules';
import type {UnitActionsReader} from './ability-presentation';
import {ownedAbilityCatalog} from './owned-abilities';
import {registeredMartialSoulWritingMeaning} from './martial-soul-writing';
import {abilityWritingMeaning} from './ability-writing';
import {communicationAvailability,knownStoryPerson} from '../shared/story-communication';


function storyItemStorage(state:any,item:any){
 const container=state.容器?.列表?.[item.containerId];
 if(container?.type!=='location-stash')return null;
 const position=rules.world.itemStoragePosition(state,item.id);
 return {kind:'personal-location-stash',custodianId:null,position,...rules.world.storagePositionFacts(state,position)};
}
export function storyOwnedItemFacts(state:any,personId:string){
 const availability=(item:any,retrieve=false)=>{const quote=rules.world.itemStorageAvailability(state,{actorId:personId,itemId:item.id,quantity:item.quantity},retrieve);return {available:quote.available,reason:quote.reason??''};};
 return (Object.values(state.物品?.实例??{}) as any[]).filter(item=>item.ownerEntityId===personId).map(item=>({
  id:item.id,name:item.name??item.名称,type:item.type,templateId:item.templateId,quantity:item.quantity??null,
   carried:rules.world.isCarriedItem(state,item,personId),integrated:!!item.扩展?.integrated,
   itemPosition:rules.world.itemStoragePosition(state,item.id),store:availability(item),retrieve:availability(item,true),
   storage:storyItemStorage(state,item),
  soulDeviceSlot:Object.entries(state.装备?.配置?.[personId]?.slots??{}).find(([,id])=>id===item.id)?.[0]??null,
 }));
}

export function storyAbilityFacts(state:any,unitId:string,readActions?:UnitActionsReader){
 return ownedAbilityCatalog(state,unitId,readActions).map(({skill,source})=>({id:skill.id,name:skill.名称??skill.name,source,
  ...(rules.foundation.intrinsicSoulSkillBlockReason(state.战斗单位?.列表?.[unitId],skill)?{useRestriction:{available:false,reason:rules.foundation.intrinsicSoulSkillBlockReason(state.战斗单位.列表[unitId],skill)}}:{}),
  meaning:skill.effectGraph?.nodes?.length||skill.effectSpecs?.length?abilityWritingMeaning(skill,source.kind==='soul-bone'?'bone':source.kind==='soul-device'?'soul-device':source.kind==='beast'?'beast':source.kind==='hidden-weapon'?'hidden-weapon':source.kind==='consumable'?'consumable':'soul'):null}));
}
export function storyRankFacts(state:any,unitId:string){
 const unit=state.战斗单位?.列表?.[unitId];
 return ['玩家魂师','魂师NPC'].includes(unit?.单位种类)?rules.foundation.soulMasterRankProfile(state.成长?.列表?.[unitId]?.魂力等级):null;
}
export function storySoulFacts(state:any,unitId:string){
 return (Object.values(state.武魂?.列表??{}) as any[]).filter(s=>s.持有者单位ID===unitId).map(s=>({id:s.id,name:s.名称,form:s.形态??null,active:rules.foundation.activeMartialSoulId(state,unitId)===s.id,meaning:registeredMartialSoulWritingMeaning(s)}));
}
export function storyOwnedRingFacts(state:any,unitId:string){
 return (Object.values(state.魂环?.列表??{}) as any[]).filter(r=>r.持有者单位ID===unitId).map(r=>rules.cycle.ringIdentity(state,r));
}
/** Initial configuration provenance is not current progression or NPC knowledge. */
export function storyEraFacts(state:any,personId:string){
 const era=state.人物?.列表?.[personId]?.扩展?.时代来源;
 if(!era)return null;
 return structuredClone({epoch:era.epoch,sourceEntryIds:era.sourceEntryIds,levelBasis:era.levelBasis,mechanicalInference:era.mechanicalInference});
}
function observedDossier(state:any,personId:string){
 const actual=state.人物.列表[personId],viewer=state.角色.主控单位ID,p=rules.disguise.viewPerson(state,actual,viewer),masked=viewer!==personId&&(!!rules.disguise.winner(state,personId)||rules.disguise.presentation(state,personId,viewer).identityHidden);
 return structuredClone({personId,name:p.name,identity:p.identity,occupation:p.occupation,age:Number.isFinite(p.age)&&p.age>0?p.age:null,gender:p.gender,appearance:p.appearance,personality:p.personality,
  level:masked&&rules.disguise.presentation(state,personId,viewer).auraHidden?null:state.成长?.列表?.[personId]?.魂力等级??null,rank:masked&&rules.disguise.presentation(state,personId,viewer).auraHidden?null:storyRankFacts(state,personId),locationId:p.locationId,time:state.世界.时间,revision:state.系统.revision,
  mechanics:storyNpcMechanicsFacts(p),resources:masked&&rules.disguise.presentation(state,personId,viewer).auraHidden?null:state.战斗单位?.列表?.[personId]?.资源??null,items:storyOwnedItemFacts(state,personId),
  eraBasis:masked?null:storyEraFacts(state,personId),martialSouls:masked?[{name:rules.disguise.presentation(state,personId,viewer).martialSoul}]:storySoulFacts(state,personId),ownedRings:masked?[]:storyOwnedRingFacts(state,personId),abilities:masked?[]:storyAbilityFacts(state,personId),actionState:storyActionState(state,personId,true)});
}
/** Preserve the game's known character dossier at an actual encounter, not an offscreen update. */
export function rememberStoryPerson(state:any,personId:string){
 const p=state.人物.列表[personId],playerId=state.角色.主控单位ID;if(!rules.actions.perception(state,playerId,personId,'vision'))return;p.扩展??={};
 p.扩展.已知档案={...p.扩展.已知档案,[playerId]:observedDossier(state,personId)};
}
export function knownStoryDossier(state:any,personId:string){
 const viewer=state.角色.主控单位ID,dossier=state.人物.列表[personId]?.扩展?.已知档案?.[viewer];
 if(!dossier?.actionState||!rules.disguise.presentation(state,personId,viewer).identityHidden)return dossier;
 return {...dossier,actionState:perceivedActionState(dossier.actionState,true)};
}
/** Compare observations only; equal endpoints cannot establish what happened between them. */
function resourceObservationComparison(previous:any,current:any){
 const value=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?v:null;
 const names=[...new Set([...Object.keys(previous?.resources??{}),...Object.keys(current.resources??{})])];
 return {
  baseline:previous?{kind:'last-encounter',time:previous.time,revision:previous.revision,locationId:previous.locationId}:null,
  current:{time:current.time,revision:current.revision,locationId:current.locationId},
  resources:names.map(name=>{
   const before=value(previous?.resources?.[name]?.当前),after=value(current.resources?.[name]?.当前),netChange=before===null||after===null?null:after-before;
   const reading=`${name}：上次相遇记录${before===null?'未记载':before}，本次查询${after===null?'未记载':after}。`+
    (netChange===null?'缺少对照数值，无法确认增加、减少或不变。':netChange===0?'两次记录数值相同；期间是否消耗或恢复不能由此确认。':`两次记录净${netChange>0?'增加':'减少'}${Math.abs(netChange)}；不代表期间消耗或恢复总量。`);
   return {name,before,after,netChange,reading};
  }),
 };
}
export function inspectStoryPerson(state:any,input:Record<string,any>){
 if(Object.keys(input).some(k=>k!=='characterId')||typeof input.characterId!=='string'||!input.characterId)throw Error('请选择要读取档案的人物');
 const personId=rules.arena.CHARACTER_CATALOG[input.characterId]?rules.arena.persistentCharacterId(input.characterId):input.characterId;
 const p=state.人物?.列表?.[personId],playerId=state.角色?.主控单位ID;
 if(!p||!playerId)throw Error('没有这位人物的已登记档案');
 const present=personId===playerId||globalThis.SoulScenePosition.communicationColocated(state,personId,playerId)&&rules.actions.perception(state,playerId,personId,'vision');
 const dossier=present?observedDossier(state,personId):knownStoryDossier(state,personId);
 if(!dossier){
  const communication=communicationAvailability(state,personId);
  if(communication.available&&communication.mode==='in-person'&&rules.actions.perception(state,playerId,personId))return structuredClone({type:'person-dossier',personId,scope:'voice-conversation',
   dossier:{personId,name:p.name,time:state.世界.时间,revision:state.系统.revision,locationId:null},summary:`当前可以与${p.name}交谈。`});
  if(!p.扩展?.相遇记录?.[playerId]&&knownStoryPerson(state,personId,playerId))return structuredClone({type:'person-dossier',personId,scope:'known-acquaintance',
   dossier:{personId,name:p.name,locationId:null,time:null,revision:null},summary:`你已认识${p.name}，可以查看已有交往；当前还没有此人的现场档案。`});
 }
 if(!dossier)throw Error('没有可取回的相遇档案，请先与此人相遇');
 return structuredClone({type:'person-dossier',personId,scope:present?'current-scene':'last-encounter',dossier,
  ...(present?{resourceComparison:resourceObservationComparison(p.扩展?.已知档案?.[playerId],dossier)}:{}),
  summary:`已读取${dossier.name}的${present?'当前场景':'上次相遇'}档案。`});
}
