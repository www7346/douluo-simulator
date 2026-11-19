(function(root,factory){const api=factory(root);if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulCanonicalGrowth=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
 'use strict';
 const VERSION=1,clone=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
 let records={},entries=[],routes=new Map();
 const sourceIds=context=>context?.世界?.characterSources??context?.background?.characterSources??context?.characterSources??[];
 function enabled(context,sourceId){return sourceIds(context).includes(sourceId);}
 function selectedSources(config){
  const b=config?.background??{},ids=[...(b.characterSources??[])];
  for(const id of [b.canonicalPlayer?.characterId,...Object.values(b.actors??{}).filter(v=>v.source==='canon').map(v=>v.characterId),...(b.relations??[]).flatMap(v=>[v.actor,v.target]).filter(v=>v?.source==='canon').map(v=>v.characterId)]){
   const source=records[id]?.sourcePolicy?.sourceId;if(source)ids.push(source);
  }
  return [...new Set(ids)];
 }
 function sourceReason(record,context,purpose='world'){
  if(!record?.sourcePolicy)return '';
  if(['catalog','preview'].includes(purpose))return '';
  return enabled(context,record.sourcePolicy.sourceId)?'':record.sourcePolicy.unavailableReason??'此人物来自后续时代，请在开局启用跨时代登场';
 }
 const presetId=(recordId,slot,ordinal)=>{
  const content=root.SoulCanonicalWomenContent?.PROFILES.find(p=>p.slot===slot&&p.presetNamespace&&p.isRecord(recordId));
  return `canonical:${content?.presetNamespace??recordId}:${slot}:${ordinal}`;
 };
 const soulPreset=(record,slot)=>record?.mechanics?.martialSoulPresetIds?.[slot-1]??(slot===1?record?.mechanics?.martialSoulPresetId:undefined);
 function boundSourceName(soul,recordId){const d=soul.扩展?.structureTimeline?.base??soul.扩展?.expressionBase?.definition??soul.扩展?.结构化武魂?.definition;return root.SoulCanonicalWomenContent?.PROFILES.find(p=>p.isRecord(recordId)&&p.SOUL.id===d?.presetId)?.SOUL.name;}
 function catalogSkillRecipe(skills){
  const result=clone(skills);
  // Candidate recipes describe the authored reach. Keep historical native loadouts unchanged.
  for(const skill of result)if(['缠绕','蓝银缠绕'].includes(skill.name)){
   for(const branch of skill.requestedBranches??[]){
    const requested=branch.requestedEffects??[];
    if(requested.some(([id])=>id==='status.bind'||id==='status.limb_bind')&&!requested.some(([id])=>id.startsWith('release.')))branch.requestedEffects=[['release.projectile',{距离区:2}],...requested];
   }
  }
  return result;
 }
 function registerCatalog(catalog,references=[]){
  records={...catalog,...Object.fromEntries(references.map(r=>[r.id,r]))};entries=[];routes=new Map();
  for(const record of Object.values(records)){
   if(record.kind!=='soul-master')continue;
   if(record.mechanics.martialSoulPreset){
    const preset=clone(record.mechanics.martialSoulPreset);
    entries.push({...preset,id:record.mechanics.martialSoulPresetId,category:'武魂',catalogKind:'canonical',era:record.periodLabel,source:{kind:'canon-adaptation',reference:record.sourcePolicy.reference,adaptation:'武魂传承与原著人物身份分别登记。'},gates:{minimumYears:1,requiredAttributes:[],requiredChannels:[],rarity:'角色传承'}});
   }
   for(const loadout of record.mechanics?.projectionPlan?.ringLoadouts??record.mechanics?.ringLoadouts??[]){
    const slots=routes.get(record.id)??{};slots[loadout.soulIndex]=clone(loadout);routes.set(record.id,slots);
    for(const ring of loadout.rings){
     const id=presetId(record.id,loadout.soulIndex,ring.ordinal),name=ring.skills.map(v=>v.name).join('、');
     entries.push({id,category:'魂技',name,sourceSoulName:loadout.soulName,sourceCanonicalId:record.identity?.canonicalId??record.id,sourceSoulIndex:loadout.soulIndex,description:ring.description??`${loadout.soulName}的第${ring.ordinal}环传承：${name}。`,appearance:ring.appearance??`${loadout.soulName}的魂光随招式凝聚，显出${name}的轮廓。`,imagePrompt:`斗罗玄幻魂技插画，${name}，无文字`,artId:ring.artId??'skill.domain',artPath:ring.artPath??'/art/fantasy-v4/skills-e.png',catalogKind:'canonical',era:record.periodLabel,source:{kind:ring.evidence?.startsWith('canon-')?'canon-adaptation':'original-adaptation',reference:record.sourcePolicy?.reference??'原著人物阶段档案与本项目统一规则适配',canonName:name,adaptation:ring.sourceNote??'原作明确能力优先，未记载部分按武魂定位和共同规则补全。'},tags:['魂技','原著成长',record.name,loadout.soulName],gates:{minimumYears:1,minimumRingOrdinal:ring.ordinal,requiredAttributes:[],requiredChannels:[],rarity:'角色传承'},recipe:{requestedSkills:catalogSkillRecipe(ring.skills),preferredSkillCount:ring.skills.length}});
    }
   }
  }
  const expanded=[];
  for(const entry of entries){
   const ns=entry.id.split(':')[1],recordId=root.SoulCanonicalWomenContent?.PROFILES.find(p=>p.presetNamespace===ns&&p.SOUL.name===entry.sourceSoulName)?.recordIds[0]??ns,content=root.SoulCanonicalWomenContent?.forRecord(recordId,entry.sourceSoulName)??(root.SoulRoyalSwanContent?.isRecord(recordId)&&entry.sourceSoulName==='天鹅'?root.SoulRoyalSwanContent:recordId==='ye-lingling'&&entry.sourceSoulName==='九心海棠'?root.SoulBegoniaContent:null),node=entry.category==='魂技'&&content?.get(entry.gates.minimumRingOrdinal);
   if(!node?.ageVariants?.length){expanded.push(entry);continue;}
   entry.ageVariantGroup=entry.id;Object.assign(entry.gates,{minimumYears:node.minimumYears??1,...(node.maximumYears?{maximumYears:node.maximumYears}:{})});expanded.push(entry);
   for(const variant of node.ageVariants){const extra=clone(entry);extra.id=entry.id+':'+variant.presetSuffix;extra.appearance=variant.summary??entry.appearance;extra.gates.minimumYears=variant.minimumYears;delete extra.gates.maximumYears;if(variant.maximumYears!==undefined)extra.gates.maximumYears=variant.maximumYears;
    if(extra.recipe.requestedSkills.length!==1)throw Error('年限档位须逐个声明同一魂技的完整配方');const skill=extra.recipe.requestedSkills[0];skill.presetId=extra.id;skill.requestedBranches=clone(variant.requestedBranches??[{id:'primary',label:node.subtitle,activation:'active',optional:false,targetPolicy:node.targetPolicy,requestedEffects:variant.effects}]);for(const key of ['resourceCosts','cooldownTurns','autoAllocate','usageRules'])if(variant[key]!==undefined)skill[key]=clone(variant[key]);expanded.push(extra);}
  }
  entries=expanded;root.SoulPresetCatalog?.registerCanonicalEntries(entries);
 }
 function routeFor(recordId,slot=1,actualSoulName){
  const own=records[recordId];if(!own)return null;
  const soulName=actualSoulName??own.mechanics?.ringLoadouts?.find(v=>v.soulIndex===slot)?.soulName;
  const identity=own.identity?.canonicalId??own.id;
  let choices=Object.values(records).filter(v=>(v.identity?.canonicalId??v.id)===identity&&v.mechanics?.ringLoadouts?.some(l=>l.soulName===soulName));
  // Facades grant no spirit: use the real source's shared inheritance only when the public dossier has no such loadout.
  if(!choices.length){const shared=root.SoulCanonicalWomenContent?.forRecord(recordId,soulName);if(shared)choices=shared.recordIds.map(id=>records[id]).filter(v=>v?.mechanics?.ringLoadouts?.some(l=>l.soulName===soulName));}
  const record=choices.sort((a,b)=>b.level-a.level)[0]??own;
  const loadout=(record.mechanics.projectionPlan?.ringLoadouts??record.mechanics.ringLoadouts).find(v=>v.soulName===soulName);
  return loadout?{record,loadout}:null;
 }
 function bindSoul(soul,recordId,slot,sourceId,mode='projection'){
  const route=routeFor(recordId,slot,boundSourceName(soul,recordId));if(!route)throw Error('此人物没有可用的武魂成长路线');
  soul.扩展??={};soul.扩展.canonicalGrowth={version:VERSION,recordId,routeId:route.record.id,routeVersion:VERSION,slot,sourceId,mode};
  const requirement=root.SoulCanonicalWomenContent?.forRecord(recordId,soul.名称)?.cultivation;
  if(mode==='canonical'&&requirement)soul.扩展.canonicalGrowth.cultivationRequirement=clone(requirement);
  return soul;
 }
 function trainingGate(state,unitId,practiceMinutes=0){
  const limit=state.成长?.列表?.[unitId]?.扩展?.evolutionLimit;
  if(limit&&state.成长.列表[unitId].魂力等级>=limit.level)return {pass:false,reason:limit.reason,level:limit.level,sourceId:limit.id};
  const growth=state.成长?.列表?.[unitId];if(!growth)return null;
  for(const soulId of growth.武魂ID列表){const soul=state.武魂.列表[soulId],requirement=soul?.扩展?.canonicalGrowth?.cultivationRequirement;if(!requirement||growth.魂力等级>requirement.level)continue;
   const completed=(root.SoulPractice?.history(state,unitId)??[]).reduce((n,r)=>n+r.progress.minutes,0)+practiceMinutes;
   return {...clone(requirement),completedMinutes:completed,remainingMinutes:Math.max(0,requirement.minutes-completed),pass:completed>=requirement.minutes};
  }return null;
 }
 function validateBinding(state,soul){
  const b=soul?.扩展?.canonicalGrowth;if(!b)return [];
  if(b.cultivationRequirement&&root.SoulAbilityContract.hash(b.cultivationRequirement)!==root.SoulAbilityContract.hash(root.SoulCanonicalWomenContent?.forRecord(b.recordId,soul.名称)?.cultivation))return ['武魂修习要求与正式传承不符'];
  const person=state.人物?.列表?.[soul.持有者单位ID],growth=state.成长?.列表?.[soul.持有者单位ID];
  const route=routeFor(b.recordId,b.slot,boundSourceName(soul,b.recordId)),errors=[];
  if(b.mode==='martial-preset'){
   const record=records[b.recordId],presetId=soulPreset(record,b.slot),definition=soul.扩展?.structureTimeline?.base??soul.扩展?.expressionBase?.definition??soul.扩展?.结构化武魂?.definition;
   if(!presetId)return ['武魂传承与实际范本或本人不符'];
   const expected=root.SoulPresetCatalog.request(presetId);
   const shape=d=>Object.fromEntries(['presetId','categories','attributes','channels','traits','weaknesses','exchangeContracts','baseAction'].map(k=>[k,d?.[k]]));
   if(b.version!==VERSION||b.routeVersion!==VERSION||!route||route.record.id!==b.routeId||b.presetId!==presetId||b.sourceId!==`preset-create-${soul.持有者单位ID}-${soul.id}`||!growth?.武魂ID列表?.includes(soul.id)||root.SoulAbilityContract.hash(shape(definition))!==root.SoulAbilityContract.hash(shape(root.SoulMartialSoulCore.normalizeDraft(expected))))errors.push('武魂传承与实际范本或本人不符');
  }else if(b.version!==VERSION||b.routeVersion!==VERSION||!route||route.record.id!==b.routeId||!['projection','canonical'].includes(b.mode)||b.sourceId!==`canon-create-${soul.持有者单位ID}`||person?.扩展?.角色库ID!==b.recordId||growth?.武魂ID列表?.[b.slot-1]!==soul.id)errors.push('原著成长路线与实际人物、武魂来源不符');
  return errors;
 }
 function bindPresetSoul(soul){const id=soul.扩展?.结构化武魂?.definition?.presetId,record=id&&Object.values(records).find(r=>r.mechanics?.martialSoulPresetId===id||r.mechanics?.martialSoulPresetIds?.includes(id));if(!record)return soul;const slot=record.mechanics.martialSoulPresetIds?.indexOf(id);bindSoul(soul,record.id,slot>=0?slot+1:1,`preset-create-${soul.持有者单位ID}-${soul.id}`,'martial-preset');soul.扩展.canonicalGrowth.presetId=id;return soul;}
 function preferredIds(state,soul,ordinal,profile){
  const b=soul?.扩展?.canonicalGrowth;if(!b)return [];
  if(b.cultivationRequirement&&root.SoulAbilityContract.hash(b.cultivationRequirement)!==root.SoulAbilityContract.hash(root.SoulCanonicalWomenContent?.forRecord(b.recordId,soul.名称)?.cultivation))return ['武魂修习要求与正式传承不符'];
  const errors=validateBinding(state,soul);if(errors.length)throw Error(errors.join('；'));
  const id=presetId(b.routeId,b.slot,ordinal),base=entries.find(e=>e.id===id);
  if(profile&&base?.ageVariantGroup){const candidates=entries.filter(e=>e.ageVariantGroup===base.ageVariantGroup&&profile.年限>=e.gates.minimumYears&&(e.gates.maximumYears===undefined||profile.年限<=e.gates.maximumYears)).sort((a,b)=>b.gates.minimumYears-a.gates.minimumYears);return candidates.slice(0,1).map(e=>e.id);}
  return base?[id]:[];
 }
 function stageRecord(record,targetLevel,{projection=false}={}){
  if(!Number.isInteger(targetLevel)||targetLevel<1||targetLevel>99)throw Error('开局等级须为1至99的整数');
  if(record.mechanics.identityLoadout)projection=false;
  if(projection&&record.mechanics.projectionPlan){
   record=clone(record);Object.assign(record.mechanics,record.mechanics.projectionPlan);delete record.mechanics.nativeOrigin;
  }
  if(projection&&targetLevel>record.level){
   const route=routeFor(record.id,1);
   if(route&&route.record.level>record.level)record={...clone(route.record),id:record.id,identity:record.identity,worldPersona:record.worldPersona,worldEra:record.worldEra,locationId:record.locationId};
  }
  const next=clone(record),base=clone(record.mechanics.attributes.initial);
  next.level=targetLevel;next.growthProjection=projection;
  const loadouts=record.mechanics.ringLoadouts.map(l=>{
   const available=l.rings.filter(r=>(r.acquisitionLevel??r.ordinal*10)<=targetLevel);
   return {...clone(l),desiredCount:available.length,rings:clone(available)};
  });
  const allowed=new Set(loadouts.flatMap(l=>l.rings.map(r=>`${l.soulIndex}:${r.ordinal}`)));
  const allocationPlan=record.mechanics.attributes.allocationPlan.filter(p=>allowed.has(`${p.soulIndex}:${p.ringOrdinal}`));
  for(const p of allocationPlan)for(const [key,value]of Object.entries(p.allocation))base[key]+=value;
  next.mechanics={...next.mechanics,ringLoadouts:loadouts,attributes:{...next.mechanics.attributes,base,allocationPlan:clone(allocationPlan),totalRingPoints:loadouts.reduce((n,l)=>n+l.rings.length*2,0)},soulBones:next.mechanics.soulBones.filter(v=>(v.acquisitionLevel??record.level)<=targetLevel),equipment:next.mechanics.equipment.filter(v=>(v.acquisitionLevel??record.level)<=targetLevel)};
  next.rings={...next.rings,count:loadouts.reduce((n,l)=>n+l.rings.length,0)};
  return next;
 }
 function sources(){return Object.values(records).filter(v=>v.sourcePolicy).map(v=>({id:v.sourcePolicy.sourceId,characterId:v.id,name:v.name,periodLabel:v.periodLabel,description:v.sourcePolicy.description,locationId:v.locationId}));}
 const EXPRESSION_CONVERSION=20;
 function missingExpressionRequirements(core,definition,gates){
  return (gates.channelRequirements??[]).filter(row=>row.anyOf.length&&!row.anyOf.some(id=>definition.channels.includes(id)&&core.channelSupportsEffect(core.CHANNEL_REGISTRY[id],row.effectId,row.parameterRequirements??{})));
 }
 function sourceBacksExpressionChannel(core,lineage,channel,requirements){
  const covers=requirements.filter(row=>core.channelSupportsEffect(channel,row.effectId,row.parameterRequirements??{}));
  if(!covers.length)return false;
  const mechanical=id=>{const family=root.SoulEffectCompiler.EFFECT_REGISTRY[id]?.family;return !!family&&!['release','targeting','check','sustain'].includes(family);};
  // A paid direction must be used by this preset and supplied by its actual
  // source. Shared target/release shells cannot authorize an unrelated power.
  if(!covers.every(row=>core.allowsEffect(lineage,row.effectId,row.parameterRequirements??{})))return false;
  const payloads=covers.filter(row=>mechanical(row.effectId));
  return payloads.length>0||channel.effectIds.some(id=>mechanical(id)&&core.allowsEffect(lineage,id,{}));
 }
 function planExpression(soul,preset,profile){
  const core=root.SoulMartialSoulCore,hash=root.SoulAbilityContract.hash,definition=soul.扩展?.结构化武魂?.definition??soul.结构化武魂?.definition;
  if(!definition)throw Error('此武魂没有可成长的结构');
  const next=clone(definition),gates=root.SoulPresetCatalog.gates(preset.id),attributes=[],channels=[];
  const sourceAttributes=[...(profile.属性谱?.主属性??[]),...(profile.属性谱?.副属性??[])];
  for(const id of gates.requiredAttributes){
   if(next.attributes.some(a=>a.id===id))continue;
   const attribute=core.ATTRIBUTE_REGISTRY[id];if(!attribute||!sourceAttributes.includes(attribute.name))throw Error('此魂环来源缺少'+(attribute?.name??'所需属性'));
   const investment=attribute.minimumInvestment;next.attributes.push({id,investment});attributes.push({id,fromInvestment:0,toInvestment:investment});
  }
  const missing=missingExpressionRequirements(core,definition,gates),sourceRequirements=[...missing],lineage=root.SoulCombatFoundation.BEAST_VALUE.validateLineage(profile.血脉).compiled;
  while(missing.length){
   const choices=Object.values(core.CHANNEL_REGISTRY).filter(c=>{const theme=core.channelThemeAttributeIds(c.id);return missing.some(r=>r.anyOf.includes(c.id))&&sourceBacksExpressionChannel(core,lineage,c,sourceRequirements)&&(!theme.length||theme.some(id=>next.attributes.some(a=>a.id===id)&&sourceAttributes.includes(core.ATTRIBUTE_REGISTRY[id].name)));}).sort((a,b)=>{
    const coverage=c=>missing.filter(r=>r.anyOf.includes(c.id)).length;return a.cost/coverage(a)-b.cost/coverage(b)||a.id.localeCompare(b.id);
   });
   const channel=choices[0];if(!channel)throw Error('魂环来源链缺少所需的实际能力方向');next.channels.push(channel.id);channels.push(channel.id);
   for(let i=missing.length-1;i>=0;i--)if(missing[i].anyOf.includes(channel.id))missing.splice(i,1);
  }
  if(!attributes.length&&!channels.length)return {soul,growth:null};
  delete next.presetId;
  const compiled=core.finalizeDraft({...next,playerConfirmed:true},{budget:9999,id:soul.id});
  const creationPoints=attributes.reduce((n,a)=>n+a.toInvestment-a.fromInvestment,0)+channels.reduce((n,id)=>n+core.CHANNEL_REGISTRY[id].cost,0);
  const growth={version:1,presetId:preset.id,beforeDefinitionHash:hash(definition),afterDefinitionHash:hash(compiled.definition),attributes,channels,creationPoints,conversion:EXPRESSION_CONVERSION,cost:creationPoints*EXPRESSION_CONVERSION};
  return {soul:{...clone(soul),品级:compiled.quality.value,品级标签:compiled.quality.name,结构化武魂:compiled,扩展:{...clone(soul.扩展),结构化武魂:compiled}},growth};
 }
 function replayExpression(soul,growth,profile,verifiedGates){
  if(growth?.kind==='free-evolution')return root.SoulEvolution.replayRingExpression(soul,growth,profile);
  const core=root.SoulMartialSoulCore,hash=root.SoulAbilityContract.hash,definition=soul.扩展?.结构化武魂?.definition??soul.结构化武魂?.definition;
  if(!growth||growth.version!==1||growth.conversion!==EXPRESSION_CONVERSION||growth.beforeDefinitionHash!==hash(definition)||!root.SoulPresetCatalog.get(growth.presetId))throw Error('武魂成长初始合同或传承来源无效');
  const next=clone(definition),sourceAttributes=new Set([...(profile.属性谱?.主属性??[]),...(profile.属性谱?.副属性??[])]),seen=new Set();let creationPoints=0;
  for(const row of growth.attributes??[]){const attribute=core.ATTRIBUTE_REGISTRY[row.id];if(!attribute||seen.has(row.id)||next.attributes.some(a=>a.id===row.id)||row.fromInvestment!==0||row.toInvestment!==attribute.minimumInvestment||!sourceAttributes.has(attribute.name))throw Error('武魂成长属性缺少实际来源或投入');seen.add(row.id);next.attributes.push({id:row.id,investment:row.toInvestment});creationPoints+=row.toInvestment;}
  const lineage=root.SoulCombatFoundation.BEAST_VALUE.validateLineage(profile.血脉).compiled,requirements=missingExpressionRequirements(core,definition,verifiedGates??root.SoulPresetCatalog.gates(growth.presetId));
  for(const id of growth.channels??[]){const channel=core.CHANNEL_REGISTRY[id],theme=core.channelThemeAttributeIds(id);if(!channel||seen.has(id)||next.channels.includes(id)||!sourceBacksExpressionChannel(core,lineage,channel,requirements)||theme.length&&!theme.some(a=>next.attributes.some(v=>v.id===a)&&sourceAttributes.has(core.ATTRIBUTE_REGISTRY[a].name)))throw Error('武魂成长方向缺少实际来源、未用于本次魂技或重复购买');seen.add(id);next.channels.push(id);creationPoints+=channel.cost;}
  if(!creationPoints||growth.creationPoints!==creationPoints||growth.cost!==creationPoints*EXPRESSION_CONVERSION)throw Error('武魂成长与实际投入点数不符');
  delete next.presetId;const compiled=core.finalizeDraft({...next,playerConfirmed:true},{budget:9999,id:soul.id});
  if(growth.afterDefinitionHash!==hash(compiled.definition))throw Error('武魂成长后的能力合同不符');
  return {soul:{...clone(soul),品级:compiled.quality.value,品级标签:compiled.quality.name,结构化武魂:compiled,扩展:{...clone(soul.扩展),结构化武魂:compiled}},growth:clone(growth)};
 }
 function applyExpression(state,soul,growth,profile,sourceId){
  if(!growth)return soul;
  const expected=replayExpression(soul,growth,profile),hash=root.SoulAbilityContract.hash;
  if(hash(expected.growth)!==hash(growth))throw Error('武魂成长内容已改变，请重新选择魂技');
  if(growth.kind==='free-evolution')for(const ringId of soul.魂环ID列表){const ring=state.魂环.列表[ringId];if(!ring.扩展?.evolutionSealed&&ring.魂技ID列表.some(id=>!root.SoulEvolution.compatible(state.技能.列表[id],expected.soul)))throw Error('新魂环变化与旧魂技不兼容，请先重构或封存对应魂环');}
  const next=root.SoulCombatFoundation.normalizeMartialSoul(expected.soul,soul.持有者单位ID);next.扩展.expressionBase??={definition:clone(soul.扩展.结构化武魂.definition),sourceId};
  next.扩展.expressionHistory=[...(soul.扩展.expressionHistory??[]),{...clone(growth),profileId:profile.id,sourceId}];
  if(growth.kind==='free-evolution'&&!soul.扩展.structureTimeline)soul.扩展.structureTimeline={base:clone(soul.扩展.expressionBase?.definition??soul.扩展.结构化武魂.definition),events:(soul.扩展.expressionHistory??[]).map(g=>({kind:'expression',growth:clone(g)}))};
  if(soul.扩展.structureTimeline)next.扩展.structureTimeline={...clone(soul.扩展.structureTimeline),events:[...clone(soul.扩展.structureTimeline.events),{kind:'expression',growth:{...clone(growth),profileId:profile.id,sourceId}}]};
  state.武魂.列表[soul.id]=next;return next;
 }
 function validateExpression(state,soul){
  const evolved=root.SoulEvolution?.validateSoul(state,soul);if(evolved)return evolved;
  const rows=soul.扩展?.expressionHistory??[],base=soul.扩展?.expressionBase;if(!rows.length&&!base)return [];
  try{
   if(!rows.length||!base?.definition)throw Error('武魂成长的初始来源缺失');
   const core=root.SoulMartialSoulCore,compiled=core.finalizeDraft(base.definition,{budget:9999,id:soul.id});
   let current=root.SoulCombatFoundation.normalizeMartialSoul({...clone(soul),扩展:{...clone(soul.扩展),结构化武魂:compiled}},soul.持有者单位ID);
   const seen=new Set();
   for(const row of rows){
    const operation=state.魂环.operations?.[row.sourceId],ring=state.魂环.列表[operation?.receipt?.ringId],profile=state.魂兽档案.列表[row.profileId];
    if(seen.has(row.sourceId)||operation?.kind!=='absorb'||ring?.武魂ID!==soul.id||root.SoulAbilityContract.hash(ring?.扩展?.expressionGrowth)!==root.SoulAbilityContract.hash(row))throw Error('武魂成长缺少实际魂环支出');seen.add(row.sourceId);
    const saved=clone(row);delete saved.profileId;delete saved.sourceId;const actual=state.技能.列表[ring.魂技ID列表[0]],verifiedGates=root.SoulPresetCatalog.verifiedRingGates(saved.presetId,actual),expected=replayExpression(current,saved,profile,verifiedGates);
    if(root.SoulAbilityContract.hash(saved)!==root.SoulAbilityContract.hash(expected.growth)||!ring.魂技ID列表.every(id=>state.技能.列表[id]?.presetId===row.presetId))throw Error('武魂成长内容与实际来源不符');
    const B=root.SoulEffectCompiler.calculateRingBudget(profile,current,operation.receipt.compatibility.ratio).usable,budget=operation.receipt.budget;
    if(budget.available!==B||budget.expressionCost!==row.cost||budget.totalSpent!==row.cost+budget.spent||budget.totalSpent>B||ring.价值.表达成长!==row.cost||ring.价值.总支出!==budget.totalSpent)throw Error('武魂成长缺少实际预算支出');
    current=root.SoulCombatFoundation.normalizeMartialSoul(expected.soul,soul.持有者单位ID);
   }
   if(root.SoulAbilityContract.hash(current.扩展.结构化武魂.definition)!==root.SoulAbilityContract.hash(soul.扩展.结构化武魂.definition))throw Error('武魂当前能力与已付成长不符');
   return [];
  }catch(e){return [e.message];}
 }
 return Object.freeze({VERSION,EXPRESSION_CONVERSION,trainingGate,planExpression,replayExpression,applyExpression,validateExpression,registerCatalog,sourceIds,selectedSources,enabled,sourceReason,sources,routeFor,presetId,bindSoul,bindPresetSoul,validateBinding,preferredIds,stageRecord,lifeBasisFor:id=>clone(records[id]?.lifeBasis),get entries(){return clone(entries);}});
});
