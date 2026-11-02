import {rules} from '../rules';
import {martialSoulTraitMeaning,martialSoulTraitTiming} from './martial-soul-writing';
import {effectProse} from './effect-prose';
import {restraintEffectLines} from './restraint-presentation';
import {personContractFacts} from './person-contract';
import {exchangeStateFacts} from './exchange-presentation';
import {playerText} from './player-text';

export interface InspectionEffect {id:string;category:string;name:string;source:string;lines:string[];duration:string;condition?:string;negative:boolean}
const minutes=(n:number)=>`${Math.max(0,Math.ceil(n))} 分钟`;
/** Read-only projection of the same active sources used by attributes, combat and control. */
export function characterStatusPresentation(state:any,id:string,viewerId=state.角色.主控单位ID){
 const person=state.人物?.列表?.[id],unit=state.战斗单位?.列表?.[id];if(!person||!unit)return null;
 const self=id===viewerId;
 const binding=rules.residentRealms.binding(state,id),deployment=rules.combatDeployments.active(state).find((r:any)=>r.prototypeId===id&&r.casterId===viewerId),managed=binding?.realm.ownerId===viewerId&&(rules.interiorSpaces.membership(state,id)?.space.id===binding.realm.id||!!deployment);
 if(!self&&!managed&&(!rules.sealing.canObserveContained(state,viewerId,id)&&(!rules.actions.communicationColocated(state,viewerId,id)||!rules.actions.perception(state,viewerId,id,'vision'))))return null;
 if(!self&&rules.disguise.winner(state,id))return {hidden:true,personId:id,effects:[],attributes:null,derived:null,resources:null};
 const now=rules.people.now(state),rows:InspectionEffect[]=[],keys=new Set<string>();
 const add=(row:InspectionEffect)=>{if(keys.has(row.id)||!row.lines.length)return;keys.add(row.id);rows.push(row);};
 const text=(v:any,fallback='')=>playerText(v,state,fallback);
 const itemDuration=(item:any)=>Number.isSafeInteger(item?.payload?.expiresAtDay)?minutes((item.payload.expiresAtDay+1)*1440-now):'永久';
 const duration=(status:any,view:any)=>{
  if(status.快照?.参数?.领域触发==='范围内'&&status.来源?.领域ID)return '领域范围内，离开后解除';
  if(status.持续?.模式==='来源维持')return `由${text(state.人物.列表[status.来源?.单位ID]?.name??state.战斗单位.列表[status.来源?.单位ID]?.名称,'施术者')}维持`;
  if(status.持续?.模式==='来源下回合')return '至施术者下次行动';
  if(status.模板ID==='transform.martial_avatar')return '本场战斗';
  if(view.remainingMinutes!==undefined&&view.remainingMinutes!==null)return minutes(view.remainingMinutes);
  if(status.持续?.模式==='永久')return '永久';
  if(status.持续?.模式==='来源有效'){
   const item=state.物品.实例[status.来源?.物品ID];return item?itemDuration(item):'至来源解除';
  }
  if(status.持续?.剩余回合!==undefined)return `${status.持续.剩余回合} 回合`;
  return status.持续?.模式==='本场战斗'?'本场战斗':'至解除';
 };
 for(const view of rules.combat.listStatusViews(state,id)){
  const status=state.状态实例.列表[view.instanceId],source=status.来源??{},item=state.物品.实例[source.物品ID],skill=state.技能.列表[source.技能ID],soul=state.武魂.列表[source.武魂ID],ring=state.魂环.列表[source.魂环ID];
  const lines=restraintEffectLines(view.effectId,{...view.params,...(view.effectId==='status.limb_bind'?{层数:view.layers}:{})},state);
  const sourceName=[text(item?.name),text(skill?.name??skill?.名称??status.扩展?.sourceName),soul?text(soul.名称)+(ring?` · 第${ring.序号}魂环`:''):''].filter(Boolean).join(' · ')||text(state.人物.列表[source.单位ID]?.name,'自身状态');
  add({id:'status:'+status.id,category:item?.type==='拘束器'?'拘束器':skill?.sourceKind==='consumable'||status.扩展?.毒药来源?'药物':'技能与当前状态',name:text(view.name,'当前效果'),source:sourceName,lines:lines.length?lines:[text(view.name,'当前效果')],duration:duration(status,view),condition:view.sourcePolicy&&view.sourcePolicy!=='独立'?`依赖${view.sourcePolicy}`:undefined,negative:rules.foundation.negativeStatus(view.effectId,view.params)});
 }
 for(const source of rules.foundation.defenseSources(state,id).filter((s:any)=>s.kind!=='temporary')){
  const item=(Object.values(state.物品.实例) as any[]).find(item=>source.sourceId.startsWith(`item-passive:${item.id}:`)||source.sourceId.startsWith(`item:${item.id}:`));
  add({id:'defense:'+source.sourceId,category:'抗性与防护',name:rules.effects.EFFECT_REGISTRY[source.effectId]?.displayName??'防护',source:text(source.name,'固有特性'),lines:effectProse(source.effectId,source.params,'',state),duration:item?itemDuration(item):'永久',condition:source.kind==='equipment'?'装备期间生效':source.kind==='martial-soul'?'当前武魂启用时生效':undefined,negative:rules.foundation.negativeStatus(source.effectId,source.params)});
 }
 const config=state.装备?.配置?.[id];
 for(const ring of Object.values(state.魂环?.列表??{}) as any[])if(ring.持有者单位ID===id){const lines=Object.entries(ring.永久属性增益??{}).filter(([,value])=>Number(value)!==0).map(([key,value])=>`${key} +${value}`);add({id:'ring-gains:'+ring.id,category:'魂环',name:`第${ring.序号}魂环 · ${ring.年限}年`,source:text(state.武魂.列表[ring.武魂ID]?.名称,'魂环'),lines,duration:'永久',negative:false});}
 for(const link of (globalThis as any).SoulAttributeLinks.sources(state,id))add({id:`link:${link.provider}:${link.sourceId}`,category:'属性联结',name:'六维属性增幅',source:text(link.name??link.sourceName??state.人物.列表[link.sourceId]?.name,'当前联结'),lines:[`六维属性增幅 ${link.percent}%`],duration:'至联结结束',negative:false});
 for(const itemId of [...new Set([...Object.values(config?.slots??{}),...Object.values(config?.soulBoneSlots??{})].filter(Boolean))] as string[]){
  const item=state.物品.实例[itemId];if(!item||!rules.controls.itemEffectsAllowed(state,id,item))continue;
  const inspected=rules.world.inspectItem(state,item),lines:string[]=[];
  for(const [key,value]of Object.entries(inspected.modifiers.attributes??{}))if(value)lines.push(`${key} ${Number(value)>0?'+':''}${value}`);
  for(const [key,value]of Object.entries(inspected.passiveCombat??{}))if(value)lines.push(rules.foundation.EQUIPMENT_AFFIXES.describe(key,value));
  for(const node of inspected.passiveEffectGraph?.nodes??[])if(!['status.resistance_shift','status.status_guard'].includes(node.effectId))lines.push(...effectProse(node.effectId,node.params,'',state));
  add({id:'equipment:'+itemId,category:item.type==='魂骨'?'魂骨':'魂导器与装备',name:text(item.name,'装备效果'),source:text(item.name),lines,duration:itemDuration(item),condition:item.type==='魂骨'?'融合期间生效':'佩戴期间生效',negative:false});
 }
 const soul=rules.foundation.activeMartialSoul(state,id);
 const native=rules.foundation.nativeOriginDefinition(unit);
 if(native){const lines=Object.entries(native.attributes??{}).filter(([,v])=>Number(v)!==0).map(([k,v])=>`${k} +${v}`);for(const [k,v]of Object.entries(native.resources??{}))if(v)lines.push(`${k} +${v}`);add({id:'native-origin',category:'固有体质',name:text(native.name,'本源体质'),source:'本源体质',lines,duration:'永久',negative:false});}
 if(unit.资源.生命.临时>0)add({id:'temporary-health',category:'当前状态',name:'临时护盾',source:'当前护盾',lines:[`临时生命 ${unit.资源.生命.临时}`],duration:'至耗尽或解除',negative:false});
 const compiled=soul?.扩展?.结构化武魂;
 if(compiled&&!rules.controls.martialSoulSealed(state,id,soul.id))for(const [index,hook]of rules.exchange.hooks(state,id,compiled).entries()){
  const template=[...rules.martialSoul.TRAIT_TEMPLATES,...rules.martialSoul.WEAKNESS_TEMPLATES].find((t:any)=>t.id===hook.sourceId);if(!template)continue;
  add({id:`soul-trait:${soul.id}:${index}`,category:'武魂特性',name:template.name,source:text(soul.名称),lines:[martialSoulTraitMeaning(template,hook.parameter)],duration:'永久',condition:martialSoulTraitTiming(template),negative:!!hook.negative});
 }
 const skillDuration=(skill:any,item?:any)=>{
  if(item)return itemDuration(item);
  if(skill.sourceKind==='copied'){
   const status=rules.controls.active(state,id).find((row:any)=>row.扩展?.复制技能ID列表?.includes(skill.id));if(!status)return null;
   const view=rules.combat.listStatusViews(state,id).find((row:any)=>row.instanceId===status.id);return duration(status,view??{});
  }
  if(skill.sourceKind==='summoned-copy'){const summon=unit.扩展?.召唤;if(!summon)return null;return summon.constructId?minutes(summon.expiresAt-now):`${summon.剩余回合??0} 回合`;}
  return '永久';
 };
 for(const skillId of unit.能力?.技能ID??[]){
  const skill=state.技能.列表[skillId];if(!skill||rules.controls.passiveReason(state,id,skill)||rules.foundation.intrinsicSoulSkillBlockReason(unit,skill))continue;
  const copied=['copied','summoned-copy'].includes(skill.sourceKind),soulId=copied?null:skill.sourceMartialSoulId??skill.来源武魂ID;if(soulId&&soulId!==soul?.id)continue;
  const item=copied?null:state.物品.实例[skill.sourceItemId];if(item&&!Object.values(config?.slots??{}).includes(item.id)&&!Object.values(config?.soulBoneSlots??{}).includes(item.id))continue;
  const lifetime=skillDuration(skill,item);if(lifetime===null)continue;let released:any;try{released=rules.effects.currentSoulRingCastSkill(state,unit,skill);if(rules.effects.soulRingCastRelease(released).reason)continue;}catch{continue;}
  const nodes=released.effectGraph?.nodes??[];
  for(const branch of released.effectGraph?.branches??[])if(branch.activation==='passive'&&rules.exchange.branchActive(state,id,skill,branch.id)){
   const lines=nodes.filter((n:any)=>branch.nodeIds.includes(n.id)&&!['release','targeting','check','sustain'].includes(rules.effects.EFFECT_REGISTRY[n.effectId]?.family)&&!['status.resistance_shift','status.status_guard'].includes(n.effectId)).flatMap((n:any)=>effectProse(n.effectId,n.params,'',state));
   add({id:`passive:${skillId}:${branch.id}`,category:'被动技能',name:text(skill.name??skill.名称,'被动能力'),source:item?text(item.name):soulId?text(soul?.名称):'自身能力',lines,duration:lifetime,condition:'被动来源有效时生效',negative:false});
  }
 }
 for(const entry of rules.combat.preparedPillViews(state,id))add({id:'pill:'+entry.id,category:'药物',name:text(entry.name,'战前药物'),source:text(entry.name),lines:entry.effects.map((e:any)=>`${e.attribute} ${typeof e.value==='number'&&e.value>0?'+':''}${e.value} · 入战后持续 ${e.rounds} 回合`),duration:minutes(entry.remainingMinutes),condition:'待入战激活',negative:false});
 for(const worn of rules.intimate.worn(state,id)){
  const item=state.物品.实例[worn.id],device=rules.intimate.DEVICES[item.templateId],lines=device.effects.map((effectId:string)=>rules.effects.EFFECT_REGISTRY[effectId]?.displayName??({'status.urine_lock':'排尿受限','status.chastity':'对应部位受限','status.collared':'佩戴项圈'} as any)[effectId]??'器具作用');
  if(device.maxStimLevel)lines.push(`当前档位 ${worn.level} / ${device.maxStimLevel}`);
  add({id:'intimate:'+worn.id,category:'情具',name:text(worn.name),source:text(worn.name),lines,duration:itemDuration(item),condition:'佩戴期间生效，解除后结束',negative:true});
 }
 for(const item of rules.host.hostItems(state,id)){
  const projection=rules.host.project(state,item),lines=Object.values(projection.restrictions) as string[];
  if(projection.aimPenalty)lines.push(`命中检定 −${projection.aimPenalty}`);
  if(projection.facts.binding?.agilityPenalty)lines.push(`身法 −${projection.facts.binding.agilityPenalty}`);
  if(projection.facts.suppression)lines.push(`禁魔 ${projection.facts.suppression}%`);
  for(const form of projection.facts.forms??[])lines.push(`${form.slot} · ${form.name}${form.maxLevel?` · ${form.level}/${form.maxLevel}档`:''}`);
  add({id:'host:'+item.id,category:'拘束器与器具',name:text(item.name),source:text(item.name),lines,duration:itemDuration(item),condition:'器具佩戴且对应能力生效期间',negative:true});
 }
 const physiology=rules.intimate.read(state,id);for(const [key,title]of [['敏感至','敏感'],['不应期至','不应期']] as const)if(physiology[key]>now)add({id:'physiology:'+key,category:'当前状态',name:title,source:'身体状态',lines:[title==='敏感'?`敏感 ${physiology.敏感} 层`:'处于不应期'],duration:minutes(physiology[key]-now),negative:false});
 const battle=rules.actions.battleOf(state,id);
 if(battle?.状态==='进行中')for(const domain of Object.values(battle.扩展?.领域实例??{}) as any[])if(domain.状态==='生效'&&rules.combat.domainContains(state,domain,unit))add({id:'domain:'+domain.id,category:'领域与环境',name:text(state.技能.列表[domain.来源?.技能ID]?.name,'领域'),source:text(state.人物.列表[domain.来源?.单位ID]?.name,'领域来源'),lines:[`当前处于领域范围内 · 半径 ${domain.参数?.半径区??0} 区`],duration:domain.参数?.持续方式==='来源维持'?'由来源持续维持':domain.剩余回合===undefined?'至领域解除':`${domain.剩余回合} 回合`,negative:false});
 if(battle?.状态==='进行中')for(const zone of rules.combat.activeZones(state))if(rules.combat.zoneContains(zone,unit))add({id:'zone:'+zone.id,category:'领域与环境',name:text(state.技能.列表[zone.来源?.技能ID]?.name,'持续区域'),source:text(state.人物.列表[zone.来源?.单位ID]?.name,'区域来源'),lines:['当前处于该持续效果区域内'],duration:zone.constructId?minutes((rules.creation.constructs(state).find((c:any)=>c.id===zone.constructId)?.expiresAt??now)-now):zone.剩余回合===undefined?'至区域解除':`${zone.剩余回合} 回合`,negative:false});
 const exchange=exchangeStateFacts(state,id);for(const record of exchange.records)add({id:'exchange:'+record.id,category:'能力代价',name:text(record.name),source:text(record.name),lines:record.lines,duration:record.remainingMinutes===null?'至对应能力结束':minutes(record.remainingMinutes),negative:true});
 for(const record of personContractFacts(state,viewerId).filter((r:any)=>r.status==='active'&&r.parties.includes(id)))add({id:'contract:'+record.id,category:'契约',name:record.kind==='soul'?'灵魂契约':'契约约定',source:record.parties.map((who:string)=>text(state.人物.列表[who]?.name,'未知当事人')).join('、'),lines:[...record.clauseLabels,...(record.kind==='soul'?[`违约处罚：${record.penaltyLabel}${record.penaltyDuration?` · ${record.penaltyDuration}`:''}`]:[])],duration:record.expiresAt===null?'随控制来源持续':minutes(record.expiresAt-now),negative:false});
 if(self)for(const talentId of rules.talents.record(state)?.talentIds??[]){const talent=rules.talents.TALENTS[talentId];if(talent)add({id:'talent:'+talentId,category:'天赋',name:talent.name,source:'天赋',lines:[talent.description],duration:'永久',negative:false});}
 const attributes=rules.foundation.battleAttributeView(state,unit);
 const carrier=deployment?.mode==='projection'?state.战斗单位.列表[deployment.unitId]:null,projection=carrier?{unitId:carrier.id,name:carrier.名称,health:structuredClone(carrier.资源.生命),soulPower:structuredClone(rules.combatDeployments.soulPowerResource(state,carrier.id)),sharedSoulPower:rules.combatDeployments.soulPowerOwner(state,carrier.id)!==carrier.id,percent:deployment.proof.percent}:null;
 return {hidden:false,personId:id,attributes:attributes.attributes,derived:attributes.derived,resources:unit.资源,level:state.成长.列表[id]?.魂力等级,experience:state.成长.列表[id]?.当前经验,experienceRequired:state.成长.列表[id]?.当前等级需求,effects:rows,...(projection?{projection}:{})};
}
