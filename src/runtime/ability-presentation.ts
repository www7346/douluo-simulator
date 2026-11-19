import {playerDescription} from './player-copy';
import {rules} from '../rules';
import {playerText} from './player-text';
import {effectProse} from './effect-prose';
import {restraintPresentation} from './restraint-presentation';
import {exchangeLines} from './exchange-presentation';
import {hostAbilityWritingMeaning} from './ability-writing';

export type UnitActionsReader=(actorId:string)=>any[];

export function unitAbilities(state:any,unitId:string,readActions?:UnitActionsReader):any[] {
  const actions=readActions?readActions(unitId):rules.combat.listAvailableActions(state,unitId);
  const active=actions.filter((entry:any)=>entry.actionType==='技能').map((entry:any)=>state.技能?.列表?.[entry.id]??entry);
  const owned=(state.战斗单位?.列表?.[unitId]?.能力?.技能ID??[]).map((id:string)=>state.技能?.列表?.[id]).filter(Boolean);
  return [...new Map([...active,...owned].map((skill:any)=>[skill.id,skill])).values()];
}

const GROUP_NAMES:Record<string,string>={release:'施放方式',targeting:'作用目标',check:'命中与抵抗',sustain:'维持条件'};
import {abilityEffectName,modifierPresentation} from './ability-text';
export {abilityEffectName,modifierPresentation} from './ability-text';

/** Presentation only: registered effect graphs remain the source of every displayed parameter. */
export function abilityPresentation(skill:any,state:any) {
  const restraint=skill?.restraint?restraintPresentation(skill.restraint):null;
  const fixedHost=skill?.host??skill?.hostDesign?.definition?.host,host=fixedHost?hostAbilityWritingMeaning(fixedHost):null;
  const original=skill,actor=state?.战斗单位?.列表?.[skill?.持有者单位ID ?? state?.角色?.主控单位ID];
  let releaseError='';
  if(actor)try{skill=rules.combat.defaultPayableSkill(state,actor,rules.effects.currentSoulRingCastSkill(state,actor,skill));}catch(error){releaseError=String((error as Error).message);}
  const release=rules.effects.soulRingCastRelease(skill),nativeRank=rules.effects.soulRingNativeRank(skill);
  const castRelease=nativeRank?{...release,reason:releaseError||release.reason,currentRank:releaseError?0:release.rank,nativeRank,maximumRank:actor?rules.effects.soulRingAvailableRank(state,actor,skill):nativeRank}:null;
  const graph=skill?.effectGraph ?? skill?.效果图 ?? skill?.graph ?? (skill?.effectSpecs?.length ? rules.effects.makeLinearGraph(skill.effectSpecs) : null);
  const nodes=(graph?.nodes ?? []) as any[];
  const activation=(skill?.category==='魂导器'||host)&&!graph?.nodes?.length?'passive':rules.effects.skillActivation(graph);
  const activationLabel=activation==='passive'?'被动':activation==='hybrid'?'主动＋被动':'主动';
  const branches=rules.effects.graphBranches(graph);
  const passiveState=rules.foundation.passiveSkillState(state,skill);
  const usage=rules.combat.skillUsageRules({...skill,effectGraph:graph});
  const fieldRestoration=Boolean(actor)&&!rules.actions.battleOf(state,actor.id);
  const availability=actor&&skill?.id ? rules.combat.skillUsageAvailability(state,actor,{...skill,effectGraph:graph},fieldRestoration) : null;
  const effects=nodes.map((node,index)=>{
    const definition=rules.effects.EFFECT_REGISTRY[node.effectId];
    const passive=branches.find((branch:any)=>branch.nodes.some((entry:any)=>entry.id===node.id))?.activation==='passive';
    const output=actor&&!passive?rules.combat.effectiveOutputProfile(state,actor.id,node,skill):rules.combat.effectOutputProfile(node,passive?{outputScale:1}:skill);
    const params=output.displayParams;
    const dice=Number.isFinite(params.骰数)&&Number.isFinite(params.骰面);
    const diceText=dice?`${params.骰数}d${params.骰面}${params.加值 ? `${params.加值>0?'+':''}${params.加值}` : ''}`:'';
    const formula=dice&&output.amountScale!==1?`(${diceText}) × ${output.amountScale}`:diceText;
    const values=effectProse(node.effectId,params,formula,state);
    if(output.amountScale!==1&&node.effectId==='payload.restore')values.push(`恢复量 × ${output.amountScale}，不超过自身上限`);
    const branchParents=(graph?.edges??[]).filter((edge:any)=>edge.to===node.id && (graph?.edges??[]).filter((other:any)=>other.from===edge.from).length>1);
    const branch=branchParents.length ? `分支 ${(graph.edges as any[]).filter(edge=>edge.from===branchParents[0].from).findIndex(edge=>edge.to===node.id)+1}` : '';
    return {key:index,effectId:node.effectId,name:node.effectId==='passive.equipment_stat'?playerText(params.属性,state,'常驻加成'):abilityEffectName(node.effectId,state),values,branch,passive,group:GROUP_NAMES[definition?.family]??'主要效果'};
  });
  const primary=effects.filter(effect=>effect.group==='主要效果');
  const context=['施放方式','作用目标','命中与抵抗','维持条件'].flatMap(label=>{const entries=effects.filter(effect=>effect.group===label);return entries.length?[{label,entries}]:[]});
  const court=(globalThis as any).SoulNineCourts?.ofSkill(original);
  const description=typeof original?.displayDescription==='string'?original.displayDescription:
    court?.description??playerDescription(globalThis.SoulSkillProse.description(original,state));
  const soulId=skill.sourceMartialSoulId??skill.来源武魂ID;
  const soulName=state?.武魂?.列表?.[soulId]?.名称;
  const passiveCondition=skill.sourceItemId||['魂导器','魂骨'].includes(skill.category)?(skill.category==='魂骨'?'融合后生效':'装备时生效'):(soulName?'启用'+soulName+'时生效':'启用对应武魂时生效');
  const declared=rules.abilities.describe({...skill,id:skill.id??'ability-preview'});
  const costLine=(fee:any)=>fee.kind==='soulPower'?`魂力 ${fee.amount}`:fee.kind==='health'?`生命 ${fee.amount}`:fee.kind==='lifespan'?`寿命 ${fee.amount} 分钟${fee.sacrificial?'（允许耗尽献祭）':''}`:`${state?.物品?.实例?.[fee.itemId]?.name??rules.world.ITEM_TEMPLATES?.[fee.templateId]?.name??fee.templateId??fee.itemId} × ${fee.quantity}`;
  const requirementLines=declared.requirements.map((kind:string)=>rules.abilities.LABELS[kind]);
  const costLines=declared.costs.filter((fee:any)=>fee.kind!=='soulPower').map(costLine),exchangeDescriptions=exchangeLines(skill,'skill',state);
  const modes:Array<{id:string;name:string;costLines:string[];requirements:string[]}>=(skill.castModes??[]).map((mode:any)=>{const contract=rules.abilities.describe({...skill,id:skill.id??'ability-preview'},{modeId:mode.id});return {id:mode.id,name:mode.name??mode.id,costLines:contract.costs.map(costLine),requirements:contract.requirements.map((kind:string)=>rules.abilities.LABELS[kind])};});
  let payment:any=null;if(actor&&activation!=='passive')try{payment=rules.combat.quoteSkillUse(state,actor,{...skill,effectGraph:graph},{fieldUse:fieldRestoration});}catch{}
  const deployNode=graph?.nodes?.find((n:any)=>n.effectId==='realm.deploy'),deployRealm=deployNode&&rules.residentRealms.table(state).records.find((r:any)=>r.ownerId===actor?.id&&r.soulId===(skill.sourceMartialSoulId??skill.来源武魂ID)),deploySlot=deployRealm?.slots.find((s:any)=>s.index===deployNode.params.席位),projectionPolicy=deployRealm&&rules.combatDeployments.projectionTerms(state,{realm:deployRealm,slot:deploySlot??{personId:''}},{battleId:state.战斗?.状态==='进行中'?state.战斗.id:''});
  if(projectionPolicy)for(const mode of modes)if(mode.id==='projection')mode.costLines=[`魂力 ${projectionPolicy.resummon?projectionPolicy.resummonCost:projectionPolicy.cost}`];
  const value=skill.abilityValue?{active:skill.abilityValue.rawActiveValue,passive:skill.abilityValue.rawPassiveValue,reduction:skill.abilityValue.reduction,net:skill.abilityValue.netValue,mode:modes.find(mode=>mode.id===skill.abilityValue.pricedModeId)?.name??'',ringBaseCost:skill.valueBasis?.baseSoulPowerCost}:null;
  const costLabel=nodes.some(n=>n.effectId==='target.allies'&&Number(n.params.每目标魂力)>0)||nodes.some(n=>n.effectId==='sustain.maintain'&&n.params.计费方式==='逐目标')?'每人魂力':activation==='hybrid'?'主动消耗':'魂力';
  return {host,castRelease,costLabel,medicine:rules.abilities.consumableDisposition({...skill,sourceKind:skill.sourceKind??(skill.category==='丹药'?'consumable':undefined)}),restraint,effects,primary,context,description:projectionPolicy?`${description} 投影生命和魂力上限、伤害、治疗与护盾均为原人物的${projectionPolicy.percent}%，命中沿用原人物。投影用自己的魂力施法。画主每回合支付${projectionPolicy.upkeep}魂力维持。击散后可于画主下一次行动重召，同场沿用剩余魂力、冷却和次数。`:description,passiveCondition,usage,availability,activation,activationLabel,passiveState,value,cost:activation==='passive'?0:projectionPolicy?(projectionPolicy.resummon?projectionPolicy.resummonCost:projectionPolicy.cost):payment?.totals.soulPower??declared.costs.filter((fee:any)=>fee.kind==='soulPower').reduce((sum:number,fee:any)=>sum+fee.amount,0),cooldown:activation==='passive'?0:skill?.cooldownTurns??0,costLines,exchangeLines:exchangeDescriptions,requirementLines,modes,maintenanceLines:declared.maintenance.map(costLine)};
}

export function defensePresentation(state:any,unitId:string):Array<{key:string;label:string;source:string;temporary:boolean}> {
  const groups=new Map<string,{key:string;label:string;source:string;temporary:boolean}>();
  for(const source of rules.foundation.defenseSources(state,unitId)){
    const status=source.kind==='temporary'?state.状态实例?.列表?.[source.sourceId.slice('status:'.length)]:null;
    const params=status?{...source.params,持续回合:status.持续?.剩余回合}:source.params;
    const label=effectProse(source.effectId,params,'',state).join(' · '),key=`${source.kind==='temporary'}:${label}`;
    const name=playerText(source.name,state,'固有防护'),previous=groups.get(key);
    if(previous)previous.source=[...new Set([...previous.source.split('、'),name])].join('、');
    else groups.set(key,{key,label,source:name,temporary:source.kind==='temporary'});
  }
  const stats=rules.world.equipmentCombatSummary(state,unitId,true);
  const elements=rules.foundation.equipmentElementSummary(state,unitId);
  for(const [type,value] of Object.entries(elements.values))groups.set('equipment-element:'+type,{key:'equipment-element:'+type,label:`属性伤害增幅 · ${type}属性伤害 +${value}%`,source:elements.sources[type].map((s:any)=>s.name).join('、')+`（提供 ${elements.raw[type]}%，生效 ${value}%`+(elements.excess[type]?`，超出 ${elements.excess[type]}%`:'')+'）',temporary:false});
  const six=rules.world.equipmentSummary(state,unitId);
  for(const [key,value] of Object.entries(six.attributes))if(Number(value))groups.set('equipment-six:'+key,{key:'equipment-six:'+key,label:'六维加成 · '+key+' +'+value,source:'装备提供 +'+six.rawAttributes[key]+'，实际生效 +'+value+(six.excessAttributes[key]?'，超出 '+six.excessAttributes[key]+' 点':'') ,temporary:false});
  for(const [key,value] of Object.entries(stats.values))if(Number(value))groups.set('equipment-stat:'+key,{key:'equipment-stat:'+key,label:rules.foundation.EQUIPMENT_AFFIXES.describe(key,value),source:'已装备物品'+(stats.excess[key]?'（另有 '+stats.excess[key]+' 点超过生效上限）':''),temporary:false});
  return [...groups.values()];
}
