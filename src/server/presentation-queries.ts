import {isCharacterSheetSection} from '../shared/snapshot-query-policy';
import {martialSoulArtwork} from '../runtime/generated-art';
import {conversationContactFacts} from '../runtime/conversation-contacts';
import {personContractPresentation} from './person-contract-presentation';
import {characterStatusPresentation} from '../runtime/character-status-presentation';
import {residentRealmPresentation} from './resident-realm-presentation';
import {personGrowthPresentation,partyRingPresentation} from './person-growth-presentation';
import {targetFieldAbilityOptions} from '../runtime/personal-field-abilities';
import {rewardName} from './reward-presentation';
import {personalFieldAbilities} from '../runtime/personal-field-abilities';
import {rules} from '../rules';
import {selfStatusPresentation} from './self-status-presentation';
import {CloudError} from '../cloud/protocol';
import {abilityPresentation,unitAbilities,defensePresentation} from '../runtime/ability-presentation';
import {ownedAbilityCatalog} from '../runtime/owned-abilities';
import {abilitySourceResolver} from '../runtime/ability-sources';
import {characterCombatArchive} from '../runtime/character-archive';
import {materialFacts} from '../runtime/player-presentation';
import {candidateCardPresentation} from '../web/candidate-presentation';
import {exchangeStateFacts} from '../runtime/exchange-presentation';
import {wornRestraintsPresentation} from '../runtime/worn-restraints-presentation';
import {canInspectPersonEquipment} from '../runtime/resident-access';
import {personEquipmentPresentation} from './person-equipment-presentation';

/** Player-visible facts produced by the same functions as combat and archives. */
export function presentationQuery(state:any,name:string,input:Record<string,any>):unknown {
 if(name==='presentation.inspection'){
  if(Object.keys(input).some(key=>key!=='personId')||typeof input.personId!=='string')throw new CloudError('invalid-query','请选择检视的人物');
  const id=state.人物.列表[input.personId]?input.personId:rules.arena.persistentCharacterId(input.personId);return characterStatusPresentation(state,id);
 }
  switch(name){
    case 'presentation.player-appearance':{
      if(Object.keys(input).length)throw Error('样貌描述只读取当前人物');
      return rules.playerAppearance.preview(state);
    }
    case 'presentation.person-equipment':return personEquipmentPresentation(state,input);
    case 'presentation.growth-plan':{
      if(Object.keys(input).length)throw Error('加点方案只读取本人当前属性');
      return rules.cycle.growthAllocationOptions(state);
    }
    case 'presentation.person-contracts':return personContractPresentation(state,input);
    case 'presentation.growth':{
      if(Object.keys(input).some(k=>k!=='steps'))throw Error('加点只读取本人和提升次数');
      return Object.fromEntries(rules.foundation.ATTRIBUTE_KEYS.map((attribute:string)=>[attribute,rules.cycle.previewGrowthAttribute(state,{attribute,steps:input.steps??1})]));
    }
    case 'presentation.device-operations':{
      if(Object.keys(input).some(key=>key!=='battle')||input.battle!==undefined&&typeof input.battle!=='boolean')throw new CloudError('invalid-query','器具操作只读取本人当前实际选项');
      const actorId=state.角色.主控单位ID,battle=rules.actions.battleOf(state,actorId);
      if(input.battle&&(!battle||battle.id!==state.战斗?.id))throw new CloudError('invalid-query','本人当前没有可操作的前台战斗');
      return rules.deviceOperations.facts(state,actorId,{battleId:input.battle?battle.id:null});
    }
    case 'presentation.resident-realms':{if(Object.keys(input).some(k=>!['selectedPersonId','scope'].includes(k))||input.scope!==undefined&&!['gallery','overview','management'].includes(input.scope)||input.selectedPersonId!==undefined&&typeof input.selectedPersonId!=='string')throw Error('画境只读取本人空间与所选人物');return residentRealmPresentation(state,input);}
    case 'presentation.summons':{if(Object.keys(input).length)throw Error('召唤指令无需目标');return rules.summonOrders.facts(state);}
    case 'presentation.party':{if(Object.keys(input).length)throw Error('Party takes no target');return rules.world.partyRecoveryPreview(state);}
    case 'presentation.party-ring':{if(Object.keys(input).join(',')!=='beastUnitId'||typeof input.beastUnitId!=='string')throw Error('请选择现场魂兽');return partyRingPresentation(state,input.beastUnitId);}
    case 'presentation.person-growth':{if(Object.keys(input).join(',')!=='personId'||typeof input.personId!=='string')throw Error('请选择实际人物');return personGrowthPresentation(state,input.personId);}
    case 'presentation.conversations':{if(Object.keys(input).length)throw Error('会话只读取本人实际收件范围');const id=state.角色.主控单位ID;return {contacts:conversationContactFacts(state),rooms:rules.conversations.facts(state,id),people:rules.conversations.targets(state,id).filter((t:any)=>t.id.startsWith('direct:')).map((t:any)=>({personId:t.id.slice(7),name:t.title}))};}
    case 'presentation.target-abilities':{if(Object.keys(input).some(k=>k!=='personId')||typeof input.personId!=='string')throw Error('请选择实际人物');return targetFieldAbilityOptions(state,input.personId);}
    case 'presentation.field-abilities':return personalFieldAbilities(state,input);
    case 'presentation.worn-restraints':{
      if(Object.keys(input).some(k=>k!=='personId')||typeof input.personId!=='string')throw new CloudError('invalid-query','请选择要查看的人物');
      const id=state.人物.列表[input.personId]?input.personId:rules.arena.persistentCharacterId(input.personId),viewer=state.角色.主控单位ID;
      if(!canInspectPersonEquipment(state,id,viewer))return [];
      return wornRestraintsPresentation(state,id,viewer);
    }
    case 'presentation.ability':return abilityPresentation(input.skill,state);
    case 'presentation.catalog':return ownedAbilityCatalog(state,String(input.unitId??state.角色?.主控单位ID??''));
    case 'presentation.unit':return unitAbilities(state,String(input.unitId??'')).map(skill=>({skill,info:abilityPresentation(skill,state)}));
    case 'presentation.defense':return defensePresentation(state,String(input.unitId??''));
    case 'presentation.material':return materialFacts(input.material,state);
    case 'presentation.candidates':{
      if(!Array.isArray(input.options)||input.options.length>12)throw new CloudError('invalid-query','候选列表格式无效');
      return input.options.map((entry:any)=>candidateCardPresentation(entry.skills,state,entry.kind,entry));
    }
    case 'presentation.archive':{
      const archive=characterCombatArchive(String(input.characterId??''),state,input.scope==='historical-projection');
      if(!archive)return null;
      if(input.scope!=='historical-projection'&&archive.unitId!==state.角色?.主控单位ID){
        const disguise=rules.disguise.winner(state,archive.unitId);
        if(disguise){
          const visible=rules.disguise.presentation(state,archive.unitId,state.角色?.主控单位ID);
          // This image represents an observed disguise, never an owned preset or skill route.
          const royalSwan=visible.martialSoul==='天鹅'&&!visible.seenThrough;
          const shown={id:'visible-soul',名称:visible.martialSoul??'尚未显露',artId:royalSwan?globalThis.SoulRoyalSwanContent.SOUL.artId:'unknown',品级标签:'',定位:'武魂表象',魂环ID列表:[]};
          const notice=visible.seenThrough?'你已察觉武魂表象有异，真实武魂尚未显露。':`${royalSwan?'眼前是天斗皇室顶级传承天鹅的武魂表象。':''}${visible.rings?'魂环表象：'+visible.rings:''}`;
          return {...archive,state:undefined,...(visible.auraHidden?{healthMax:null,soulPowerMax:null}:{}),name:visible.name,souls:[{id:'visible-soul',name:shown.名称,grade:'',rings:[]}],otherSkills:[],items:[],skillCount:0,gallery:{presentationOnly:true,actorId:archive.unitId,activeSoulId:'visible-soul',souls:[shown],rings:{},catalog:[],notice}};
        }
      }
      const enrich=(skill:any)=>({...skill,displayInfo:abilityPresentation(skill,archive.state)});
      // A compiled reference character world is private; return its visible dossier only.
      const resolve=abilitySourceResolver(archive.state,archive.unitId),all=ownedAbilityCatalog(archive.state,archive.unitId).filter(entry=>entry.source.group!=='item');
      const gallery={actorId:archive.unitId,activeSoulId:archive.state.成长?.列表?.[archive.unitId]?.激活武魂ID,souls:archive.souls.map(soul=>{const source=archive.state.武魂.列表[soul.id];return {id:soul.id,presetId:globalThis.SoulBegoniaContent.isSoul(source)?globalThis.SoulBegoniaContent.SOUL.id:globalThis.SoulRoyalSwanContent.isSoul(source)?globalThis.SoulRoyalSwanContent.SOUL.id:globalThis.SoulCanonicalWomenContent.forSoul(source)?.SOUL.id,artId:martialSoulArtwork(source).key,名称:soul.name,品级标签:soul.grade,定位:source.定位,魂环ID列表:soul.rings.map((r:any)=>r.id),扩展:{插画:source.扩展?.插画}};}),rings:Object.fromEntries(archive.souls.flatMap(soul=>soul.rings.map((r:any)=>{const source=archive.state.魂环.列表[r.id];return [r.id,{id:r.id,序号:r.ordinal,年限:r.years,颜色:r.color,魂技ID列表:r.skills.map((k:any)=>k.id),sourceName:archive.state.魂兽档案.列表[source.来源魂兽档案ID]?.名称??'',skills:r.skills.map(enrich)}];}))),catalog:all.map(entry=>({skill:enrich(entry.skill),source:resolve(entry.skill)}))};
      const visibleName=input.scope!=='historical-projection'&&archive.unitId!==state.角色?.主控单位ID&&state.人物?.列表?.[archive.unitId]?rules.disguise.presentation(state,archive.unitId,state.角色?.主控单位ID).name:archive.name;
      return {...archive,name:visibleName,state:undefined,gallery,souls:archive.souls.map(soul=>({...soul,rings:soul.rings.map((ring:any)=>({...ring,skills:ring.skills.map(enrich)}))})),
        otherSkills:archive.otherSkills.map(enrich),items:archive.items.map((item:any)=>({...item,skills:item.skills.map(enrich),passiveInfo:item.passiveEffectGraph?abilityPresentation({name:'装备被动',category:item.type,effectGraph:item.passiveEffectGraph},archive.state):null}))};
    }
    case 'presentation.character': {
      const id = String(state.角色?.主控单位ID ?? ''), person = state.人物?.列表?.[id], unit = state.战斗单位?.列表?.[id];
      if (!person || !unit) return null;
      const section = input.section, full = section === undefined;
      if (!full && (!isCharacterSheetSection(section) || Object.keys(input).length !== 1)) throw new CloudError('invalid-query','请选择人物档案中的标签');
      const facts:Record<string,unknown> = {};
      if (full || section === 'status') {
        const sealed = rules.sealing.active(state,id), held = rules.custody.confined(state,id);
        facts.activityLabel = sealed ? '封神台内' : held ? '被关押' : state.战斗?.状态 === '进行中' ? '交战中' : state.远征?.当前?.status === 'active' ? '探索中' : '自由行动';
        facts.inspection = characterStatusPresentation(state,id);
        facts.selfStatus = selfStatusPresentation(state);
        facts.currency = rules.world.formatCurrency(state.钱包?.列表?.[person.walletId]?.gold ?? 0);
      }
      if (full || section === 'equipment' || section === 'bones') {
        const owned = (Object.values(state.物品?.实例 ?? {}) as any[]).filter(item =>
          rules.world.isCarriedItem(state,item,id) || (item.type === '魂骨' && item.扩展?.integrated && item.boundToEntityId === id && Object.values(state.装备?.配置?.[id]?.soulBoneSlots ?? {}).includes(item.id)));
        facts.ownedIds = owned.map(item => item.id);
        facts.itemGrades = Object.fromEntries(owned.map(item => [item.id,rules.world.itemGrade(item)]));
        if (full || section === 'bones') facts.itemNames = Object.fromEntries(owned.map(item => [item.id,rewardName(item)]));
      }
      if (full || section === 'equipment') facts.wornRestraints = wornRestraintsPresentation(state,id);
      if (full || section === 'abilities') {
        facts.catalog = ownedAbilityCatalog(state,id);
        facts.selfCondensation = rules.world.selfCondensationPreview(state,{actorId:id});
      }
      if (full || section === 'title') facts.titleEligibility = rules.cycle.titleEligibility(state,id);
      if (full || section === 'talents') facts.talents = (rules.talents.record(state)?.talentIds ?? []).map((talentId:string) => ({id:talentId,name:rules.talents.TALENTS[talentId].name,description:rules.talents.TALENTS[talentId].description}));
      if (full) {
        facts.combatStats = rules.foundation.battleAttributeView(state,unit).derived;
        facts.combatRealm = rules.foundation.combatRealm(unit);
        facts.preparedPills = rules.combat.preparedPillViews(state,id);
        facts.exchangeState = exchangeStateFacts(state,id);
        facts.attributeCosts = Object.fromEntries(Object.entries(unit.六维?.基础 ?? {}).map(([key,value]) => [key,rules.foundation.growthAttributePointCost(value)]));
      }
      return facts;
    }
    case 'presentation.personal-quick':{if(Object.keys(input).length)throw Error('快捷栏只读取本人状态');const urineLocked=rules.intimate.urineLocked(state,state.角色.主控单位ID);return {hasUrineLock:urineLocked,urineLocked};}
    case 'presentation.intimate':{
      const core=rules.intimate,id=String(input.personId??state.角色?.主控单位ID??'');
      if(!state.人物?.列表?.[id])throw new CloudError('invalid-query','找不到这位人物');
      const walletId=state.人物.列表[id].walletId;
      return {personId:id,viewerId:state.角色?.主控单位ID??'',physiology:core.read(state,id),urineLocked:core.urineLocked(state,id),worn:[...core.worn(state,id),...rules.wearables.worn(state,id)],
        gold:state.钱包?.列表?.[walletId]?.gold??0,
        catalog:Object.entries(core.DEVICES).map(([deviceId,d]:any)=>({id:deviceId,name:d.name,icon:d.icon??'',price:d.price,slots:d.slots,maxStimLevel:d.maxStimLevel,needsKey:!!d.needsKey,concealment:d.concealment})),
        owned:Object.values(state.物品?.实例??{}).filter((item:any)=>core.DEVICES[item.templateId]&&!item.attachment&&item.ownerEntityId===id).map((item:any)=>({id:item.id,templateId:item.templateId,name:item.name})),
        hostForms:Object.entries(rules.host.FORM_REGISTRY).map(([formId,definition]:any)=>({id:formId,name:definition.name,slots:definition.slots,maxLevel:definition.maxLevel})),
        hosts:[id,...Object.values(state.人物?.列表??{}).filter((person:any)=>person.status!=='dead').map((person:any)=>person.id)].filter((pid:any,index:number,all:any[])=>all.indexOf(pid)===index).flatMap((pid:any)=>(rules.host.hostItems(state,pid)??[]).map((item:any)=>{const host=rules.host.read(item),projection=rules.host.project(state,item);return {itemId:item.id,wearerId:pid,wearerName:state.人物?.列表?.[pid]?.name??pid,name:item.name,actions:rules.host.actions(state,item,state.角色?.主控单位ID??''),appearance:host.capabilities.appearance??null,suppression:host.capabilities.suppression??null,forms:host.capabilities.forms??null,durability:host.capabilities.durability??null,release:host.capabilities.release??null,facts:projection.facts};})),
        present:Object.values(state.人物?.列表??{}).filter((person:any)=>person.status!=='dead'&&rules.actions.colocated(state,id,person.id)).map((person:any)=>({id:person.id,name:person.name,self:person.id===id}))};
    }
    default:throw new CloudError('invalid-query','不支持这项资料查看');
  }
}
