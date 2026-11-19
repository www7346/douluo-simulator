(function attachSoulWorldEngine(root, factory) {
  if(!root?.SoulEvolutionContent&&typeof require==='function')require('./evolution-content.js');
  if(!root?.SoulEvolution&&typeof require==='function')require('./soul-evolution-core.js');
  if(!root?.SoulManifestation&&typeof require==='function')require('./soul-manifestation-core.js');
  if(!root?.SoulPartyQuota&&typeof require==='function')require('./party-quota-core.js');
  const foundation = root?.SoulCombatFoundation ?? (typeof require === 'function' ? require('./foundation-core.js') : null);
  const effects = root?.SoulEffectCompiler ?? (typeof require === 'function' ? require('./effects-core.js') : null);
  const combat = root?.SoulCombatEngine ?? (typeof require === 'function' ? require('./combat-engine.js') : null);
  const cycle = root?.SoulCycleEngine ?? (typeof require === 'function' ? require('./cycle-engine.js') : null);
  const talents = root?.SoulTalentCore ?? (typeof require === 'function' ? require('./talent-core.js') : null);
  const people = root?.SoulPersonCore ?? (typeof require === 'function' ? require('./person-core.js') : null);
  const actions=root?.SoulActionContext??(typeof require==='function'?require('./action-context-core.js'):null);
  const abilities=root?.SoulAbilityContract??(typeof require==='function'?require('./ability-contract-core.js'):null);
  if(!root?.SoulHostPricing&&typeof require==='function')require('./host-pricing-core.js');
  if(!root?.SoulPaidDesign&&typeof require==='function')require('./paid-design-core.js');
  if(!root?.SoulDeviceKeyManufacturing&&typeof require==='function')require('./device-key-manufacturing-core.js');
  const controls=root?.SoulControlCore??(typeof require==='function'?require('./control-core.js'):null);
  const influence=root?.SoulInfluenceCore??(typeof require==='function'?require('./influence-core.js'):null);
  const custody=root?.SoulCustodyCore??(typeof require==='function'?require('./custody-core.js'):null);
  const logistics=root?.SoulCustodyLogistics??(typeof require==='function'?require('./custody-logistics-core.js'):null);
  const social=root?.SoulWorldSocial??(typeof require==='function'?require('./world-social-core.js'):null);
  const relationRewrites=root?.SoulRelationRewrites??(typeof require==='function'?require('./relation-rewrite-core.js'):null);
  const custodyRewrites=root?.SoulCustodyRewrites??(typeof require==='function'?require('./custody-rewrite-core.js'):null);
  const openingRelations=root?.SoulOpeningRelations??(typeof require==='function'?require('./opening-relations-core.js'):null);
  const personRewrites=root?.SoulPersonRewrite??(typeof require==='function'?require('./person-rewrite-core.js'):null);
  const personChangeKnowledge=root?.SoulPersonChangeKnowledge??(typeof require==='function'?require('./person-change-knowledge-core.js'):null);
  const personTools=root?.SoulPersonTools??(typeof require==='function'?require('./person-tools-core.js'):null);
  const openingWorkshop=root?.SoulOpeningWorkshop??(typeof require==='function'?require('./opening-workshop-core.js'):null);
  const rescue=root?.SoulRescueCore??(typeof require==='function'?require('./rescue-core.js'):null);
  const cooperation=root?.SoulCooperationCore??(typeof require==='function'?require('./cooperation-core.js'):null);
  const preparations=root?.SoulCooperationPreparation??(typeof require==='function'?require('./cooperation-preparation-core.js'):null);
  const fieldControl=root?.SoulFieldControl??(typeof require==='function'?require('./field-control-core.js'):null);
  const market=root?.SoulCustodyMarket??(typeof require==='function'?require('./custody-market-core.js'):null);
  const auction=root?.SoulCustodyAuction??(typeof require==='function'?require('./custody-auction-core.js'):null);
  const gifts=root?.SoulControlledGifts??(typeof require==='function'?require('./controlled-gift-core.js'):null);
  const curated=root?.SoulCuratedCommerce??(typeof require==='function'?require('./curated-commerce-core.js'):null);
  const stock=root?.SoulRegionalStock??(typeof require==='function'?require('./regional-stock-core.js'):null);
  const publicAuction=root?.SoulCommerceAuction??(typeof require==='function'?require('./commerce-auction-core.js'):null);
  const sealing=root?.SoulSealingCore??(typeof require==='function'?require('./sealing-core.js'):null);
  const commerceSource=root?.SoulCommerceProvenance??(typeof require==='function'?require('./commerce-provenance-core.js'):null);
  const expeditions=root?.SoulExpeditionContext??(typeof require==='function'?require('../../shared/expedition-context-core.js'):null);
  const commerceSupply=root?.SoulCommerceAuctionSupply??(typeof require==='function'?require('./commerce-auction-supply-core.js'):null);
  const commerceMessages=root?.SoulCommerceMessages??(typeof require==='function'?require('./commerce-messages-core.js'):null);
  const commerceCare=root?.SoulCommerceCare??(typeof require==='function'?require('./commerce-care-core.js'):null),commerceProxy=root?.SoulCommerceProxy??(typeof require==='function'?require('./commerce-proxy-core.js'):null);
  if(!root?.SoulTargetConditions&&typeof require==='function')require('./target-condition-core.js');
  if(!root?.SoulInteriorSpaces&&typeof require==='function')require('./interior-space-core.js');
  if(!root?.SoulResidentRealms&&typeof require==='function')require('./resident-realm-core.js');
  if(!root?.SoulRealmArrangements&&typeof require==='function')require('./realm-arrangements-core.js');
  if(!root?.SoulPersonShame&&typeof require==='function')require('./person-shame-core.js');
  if(!root?.SoulObedience&&typeof require==='function')require('./obedience-core.js');
  if(!root?.SoulPractice&&typeof require==='function')require('./practice-core.js');
  if(!root?.SoulPersonGrowth&&typeof require==='function')require('./person-growth-core.js');
  if(!root?.SoulConversations&&typeof require==='function')require('./conversation-core.js');
  if(!root?.SoulPerformanceAgreements&&typeof require==='function')require('./performance-agreement-core.js');
  if(!root?.SoulPersonContracts&&typeof require==='function')require('./person-contract-core.js');
  if(!root?.SoulConsciousness&&typeof require==='function')require('./consciousness-core.js');
  if(!root?.SoulCombatDeployments&&typeof require==='function')require('./combat-deployment-core.js');
  if(!root?.SoulExperiences&&typeof require==='function')require('./experience-core.js');
  const api = factory(foundation, effects, combat, cycle, talents, people, actions, abilities, controls,influence,custody,logistics,social,rescue,cooperation,preparations,fieldControl,expeditions,gifts,market,auction,curated,stock,publicAuction,sealing,commerceSource);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SoulWorldEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createSoulWorldEngine(foundation, effects, combat, cycle, talents, people, actions, abilities, controls,influence,custody,logistics,social,rescue,cooperation,preparations,fieldControl,expeditions,gifts,market,auction,curated,stock,publicAuction,sealing,commerceSource) {
  const commerceMessages=globalThis.SoulCommerceMessages;
  const poison=globalThis.SoulPoisonCore??(typeof require==='function'?require('./poison-core.js'):null);
  const wearables=globalThis.SoulWearableCore??(typeof require==='function'?require('./wearable-core.js'):null);
  const genericVisuals=globalThis.SoulGenericVisuals??(typeof require==='function'?require('../../shared/generic-human-art-core.js'):null);
  const personalNames=globalThis.SoulDisplayNames??(typeof require==='function'?require('../../shared/display-names-core.js'):null);
  'use strict';
 const travelCore=globalThis.SoulTravelCore??(typeof require==='function'?require('./travel-core.js'):null);
  const presets=globalThis.SoulPresetCatalog??(typeof require==='function'?require('./preset-catalog-core.js'):null);
  const npcLoadouts=globalThis.SoulNpcLoadouts??(typeof require==='function'?require('./npc-loadouts-core.js'):null);
  const designs=globalThis.SoulCommerceDesigns??(typeof require==='function'?require('./commerce-designs-core.js'):null);
  const assets=globalThis.SoulCommerceAssets??(typeof require==='function'?require('./commerce-assets-core.js'):null);
  const backgrounds=globalThis.SoulBackgroundCore??(typeof require==='function'?require('./background-core.js'):null);
  const backgroundItems=globalThis.SoulBackgroundRestraints??(typeof require==='function'?require('./background-restraints-core.js'):null);

  if (!foundation || !effects || !combat || !cycle) throw new Error('SoulWorldEngine requires all four v1.10 engines');

  const creation=globalThis.SoulCreationCore??(typeof require==='function'?require('./creation-core.js'):null);
  const VERSION = '2.10.0';
  let expeditionValidator=()=>[];
  function bindExpeditionValidation(validator){expeditionValidator=validator;}
  let expeditionSchedule={nextAt:()=>null,advanceAt:()=>{}};
  function bindExpeditionSchedule(schedule){expeditionSchedule=schedule;}
  // Project calendar anchored to the reviewed Reborn chronology; this is not an event scheduler.
  const STORY_CALENDAR = Object.freeze({id:'douluo-reborn-360-v1',name:'斗罗历',monthsPerYear:12,daysPerMonth:30,
    epoch:Object.freeze({year:1650,month:6,day:1})});
  function storyCalendarDate(state) {
    const time=state?.世界?.时间;
    if(!time||!Number.isSafeInteger(time.day)||time.day<1||!Number.isSafeInteger(time.hour)||time.hour<0||time.hour>23||!Number.isSafeInteger(time.minute)||time.minute<0||time.minute>59)throw new Error('世界时间无效，无法读取故事日期');
    const {monthsPerYear,daysPerMonth}=STORY_CALENDAR,epoch=state?.世界?.scenarioId===globalThis.SoulEvolutionContent.SCENARIO?globalThis.SoulEvolutionContent.EPOCH:STORY_CALENDAR.epoch;
    const daysPerYear=monthsPerYear*daysPerMonth,offset=(epoch.month-1)*daysPerMonth+epoch.day-1+time.day-1;
    if(!Number.isSafeInteger(offset)||!Number.isSafeInteger(epoch.year+Math.floor(offset/daysPerYear)))throw new Error('故事日期超出可表示范围');
    const year=epoch.year+Math.floor(offset/daysPerYear),month=Math.floor((offset%daysPerYear)/daysPerMonth)+1,day=offset%daysPerMonth+1;
    const label=`${STORY_CALENDAR.name}${year}年${month}月${day}日 ${String(time.hour).padStart(2,'0')}:${String(time.minute).padStart(2,'0')}`;
    return {...STORY_CALENDAR,epoch:{...epoch},date:{year,month,day,hour:time.hour,minute:time.minute},worldDay:time.day,label};
  }
  function storyWorldTimeAtDate(date,state) {
    const {year,month,day,hour,minute}=date??{}, {monthsPerYear,daysPerMonth}=STORY_CALENDAR,epoch=state?.世界?.scenarioId===globalThis.SoulEvolutionContent.SCENARIO?globalThis.SoulEvolutionContent.EPOCH:STORY_CALENDAR.epoch;
    if(!Number.isSafeInteger(year)||year<epoch.year||year>999999||!Number.isSafeInteger(month)||month<1||month>monthsPerYear||!Number.isSafeInteger(day)||day<1||day>daysPerMonth||!Number.isSafeInteger(hour)||hour<0||hour>23||!Number.isSafeInteger(minute)||minute<0||minute>59)throw new Error('斗罗历日期或时分无效');
    const worldDay=(year-epoch.year)*monthsPerYear*daysPerMonth+(month-epoch.month)*daysPerMonth+day-epoch.day+1;
    if(worldDay<1)throw new Error('所选日期早于故事开局');
    return {day:worldDay,hour,minute};
  }
  // Unit value already includes the cost of permanent effects. Grade adds no price or power multiplier.
  // IDs align with martial-soul grades so both use one presentation palette.
  const ITEM_VALUE_GRADES = Object.freeze([
    Object.freeze({id:'waste',value:1,name:'低阶',minValue:0}),
    Object.freeze({id:'common',value:2,name:'普通',minValue:500}),
    Object.freeze({id:'rare',value:3,name:'稀有',minValue:2000}),
    Object.freeze({id:'top',value:4,name:'顶级',minValue:10000}),
    Object.freeze({id:'divine',value:5,name:'神级',minValue:50000})
  ]);
  function itemGradeFromValue(unitValue) {
    const value = Number(unitValue);
    if (!Number.isFinite(value) || value < 0) throw new Error('物品价值无效');
    return ITEM_VALUE_GRADES.findLast(grade=>value>=grade.minValue);
  }
  function itemGrade(item) {
    if (!item) return null;
    const book=item.payload?.blueprintBook??ITEM_TEMPLATES[item.templateId]?.payload?.blueprintBook;
    if(book){const entry=presets.get(book.presetId);return entry?itemGradeFromValue(calculateItemValue(entry.recipe.templateId)):null;}
    const type = item.type ?? ITEM_TEMPLATES[item.templateId]?.type;
    // Material integrity affects crafting; ring ages have their own colors. Neither is an item value grade.
    if (!['魂导器','丹药','毒药','暗器','消耗品','辅助食品','工具','道具','魂骨'].includes(type)) return null;
    return itemGradeFromValue(item.valuePoints ?? calculateItemValue(item));
  }
  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const clean = (value, fallback = '') => String(value ?? '').trim() || fallback;
  const clamp = (value, minimum, maximum) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : minimum;
  };
  const integer = (value, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) => Math.round(clamp(value, minimum, maximum));
  const list = value => Array.isArray(value) ? [...new Set(value.map(item => clean(item)).filter(Boolean))] : [];
  const plain = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  const merge = (base, patch) => {
    const output = clone(base);
    if (!plain(patch)) return output;
    for (const [key, value] of Object.entries(patch)) {
      output[key] = plain(value) && plain(output[key]) ? merge(output[key], value) : clone(value);
    }
    return output;
  };
  const removeFrom = (array, value) => (array ?? []).filter(item => item !== value);
  const addUnique = (array, value) => [...new Set([...(array ?? []), value])];

  function stableHash(text) {
    let hash = 2166136261;
    for (const char of String(text)) {
      hash ^= char.codePointAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function makeRng(seed) {
    let state = stableHash(seed) || 0x9e3779b9;
    return {
      next() {
        state += 0x6d2b79f5;
        let value = state;
        value = Math.imul(value ^ value >>> 15, value | 1);
        value ^= value + Math.imul(value ^ value >>> 7, value | 61);
        return ((value ^ value >>> 14) >>> 0) / 4294967296;
      },
      pick(values) {
        if (!values?.length) return undefined;
        return values[Math.floor(this.next() * values.length)];
      },
      int(minimum, maximum) {
        return minimum + Math.floor(this.next() * (maximum - minimum + 1));
      }
    };
  }

  function allocateWholeUnitBudget(budgetInput, entriesInput, options = {}) {
    const budget = integer(budgetInput, 0);
    const entries = (Array.isArray(entriesInput) ? entriesInput : []).map((entry, index) => ({
      ...clone(entry),
      key: clean(entry?.key, `entry-${index + 1}`),
      unitValue: integer(entry?.unitValue, 1),
      order: index
    })).filter(entry => entry.unitValue > 0);
    if (!entries.length || budget <= 0) return {budget, allocations: [], spent: 0, remainder: budget};
    const affordable = entries.filter(entry => entry.unitValue <= budget);
    if (!affordable.length) return {budget, allocations: [], spent: 0, remainder: budget};
    const seed = clean(options.seed, 'whole-unit-budget');
    const offset = stableHash(seed) % entries.length;
    const ordered = [...entries].sort((left, right) => {
      const leftRotation = (left.order - offset + entries.length) % entries.length;
      const rightRotation = (right.order - offset + entries.length) % entries.length;
      return leftRotation - rightRotation || left.unitValue - right.unitValue || left.key.localeCompare(right.key);
    });
    const counts = Object.fromEntries(entries.map(entry => [entry.key, 0]));
    let remaining = budget;
    const first = [...affordable].sort((left, right) => left.unitValue - right.unitValue || left.key.localeCompare(right.key))[0];
    counts[first.key] += 1;
    remaining -= first.unitValue;
    while (true) {
      const next = ordered.find(entry => entry.unitValue <= remaining);
      if (!next) break;
      counts[next.key] += 1;
      remaining -= next.unitValue;
    }
    const allocations = entries.filter(entry => counts[entry.key] > 0).map(entry => ({
      key: entry.key,
      index: entry.order,
      quantity: counts[entry.key],
      unitValue: entry.unitValue,
      value: counts[entry.key] * entry.unitValue,
      entry: clone(entry)
    }));
    const spent = allocations.reduce((sum, allocation) => sum + allocation.value, 0);
    return {budget, allocations, spent, remainder: budget - spent};
  }

  function structuredMaterialFingerprint(profile, quality = '普通') {
    return stableHash(JSON.stringify({
      sourceGroup: clean(profile?.sourceGroup, 'structured-material'),
      categories: list(profile?.categories).sort(),
      attributeSpectrum: clone(profile?.attributeSpectrum ?? {}),
      channels: list(profile?.channels).sort(),
      quality: clean(quality, '普通')
    })).toString(16).padStart(8, '0');
  }

  function beastMaterialProfiles(profile, seed) {
    const lineage=foundation.BEAST_VALUE.validateLineage(profile.血脉);
    const rng=makeRng(`${seed}:materials`);
    const attributes=Object.values(foundation.MARTIAL_SOUL_CORE.ATTRIBUTE_REGISTRY).map(item=>item.name);
    const primary=profile.属性谱.主属性[0];
    const secondary=profile.属性谱.副属性[0] ?? primary;
    const parts=[rng.pick(profile.解剖标签) ?? '皮毛',rng.pick(profile.类别标签) ?? '血肉','魂质结晶'];
    const botanical=lineage.compiled.categories.some(category=>category.family==='生物'&&category.tags.includes('植物'));
    const botanicalParts={骨骼:'木髓',皮肤:'表皮纤维',毛发:'细绒纤维',血液:'封装汁液',神经:'纤维束',脏器:'内芯组织',肢体:'枝段',心脏:'内芯组织'};
    return parts.map((part,index)=>{
      const attribute=index===1?secondary:primary;
      const spectrum=Object.fromEntries(attributes.map(name=>[name,0]));
      spectrum[attribute]=profile.属性谱.强度[attribute];
      if(attribute!==secondary)spectrum[secondary]=profile.属性谱.强度[secondary];
      const categories=[...new Set([part,profile.类别标签[0] ?? '魂兽材料'])];
      const channels=lineage.compiled.channels.filter((_,i)=>i%parts.length===index).map(channel=>channel.name);
      const appearancePart=botanical&&botanicalParts[part]?botanicalParts[part]:foundation.MARTIAL_SOUL_CORE.materialAppearancePart(part);
      return {id:`${profile.id}-material-${index+1}`,displayName:`${profile.名称}${appearancePart}`,appearancePart,sourceGroup:`${profile.类别标签[0]}:${stableHash(JSON.stringify(lineage.definition))}`,categories,attributeSpectrum:spectrum,channels,
        traits:lineage.compiled.traits.map(trait=>foundation.MARTIAL_SOUL_CORE.TRAIT_TEMPLATES.find(item=>item.id===trait.templateId)?.name).filter(Boolean),weaknesses:[],
        structureCost:2+categories.length+channels.length+Math.ceil(Object.values(spectrum).reduce((sum,value)=>sum+value,0)/50)};
    });
  }

  function addPermanentMaterialStack(state, profile, qualityInput, quantityInput, provenance = {}, actorId = state.角色.主控单位ID) {
    state.材料库 = plain(state.材料库) ? state.材料库 : {永久: {}, 入口暂存物品ID列表: []};
    if(!state.人物?.列表?.[actorId]&&!state.战斗单位?.列表?.[actorId])throw Error('材料收件人须为真实存在的实体');
    ensurePossessionShell(state,actorId);
    state.材料库.永久 = plain(state.材料库.永久) ? state.材料库.永久 : {};
    state.材料库.人物??={};
    const store=actorId===state.角色.主控单位ID?state.材料库.永久:(state.材料库.人物[actorId]??={});
    const quality = clean(qualityInput, '普通');
    const quantity = integer(quantityInput, 1);
    const unitValue = integer(profile?.unitValue ?? Math.max(1, Number(profile?.structureCost ?? 1) * 10), 1);
    const attributes = Object.values(foundation.MARTIAL_SOUL_CORE.ATTRIBUTE_REGISTRY).map(item => item.name);
    const spectrum = Object.fromEntries(attributes.map(name => [name, integer(profile?.attributeSpectrum?.[name] ?? 0, 0, 100)]));
    const normalizedProfile = {...clone(profile),attributeSpectrum:spectrum};
    const fingerprint = structuredMaterialFingerprint(normalizedProfile, quality);
    store[fingerprint] ??= {
      fingerprint,
      displayName: clean(profile?.displayName, '结构素材'),
      appearancePart:clean(profile?.appearancePart),
      sourceGroup: clean(profile?.sourceGroup, 'structured-material'),
      categories: list(profile?.categories),
      attributeSpectrum: spectrum,
      channels: list(profile?.channels),
      traits: list(profile?.traits),
      weaknesses: list(profile?.weaknesses),
      quality,
      structureCost: integer(profile?.structureCost ?? Math.max(1, Math.ceil(unitValue / 10)), 1),
      unitValue,
      quantity: 0,
      provenance: []
    };
    const stack = store[fingerprint];
    if (stack.unitValue !== unitValue) throw new Error('同一结构材料的单位价值不一致');
    stack.quantity += quantity;
    stack.provenance.push(clone(provenance));
    return stack;
  }

  const EQUIPMENT_ATTRIBUTE_SOURCES = Object.freeze({力量:['物理','金','火','雷','毁灭','阳'],身法:['风','暗'],体魄:['水','土','生命','阳'],悟性:['木','冰','毒蚀','时间'],感知:['空间','精神','淫'],意志:['光','灵魂','死亡','阴','淫']});
  const EQUIPMENT_ROLE_LABELS = Object.freeze({...Object.fromEntries(Object.keys(EQUIPMENT_ATTRIBUTE_SOURCES).map(key=>['attribute:'+key,key+'强化'])),...Object.fromEntries(Object.keys(foundation.EQUIPMENT_AFFIXES.REGISTRY).map(key=>['stat:'+key,key])), 'accessory-amplify':'属性伤害增幅','accessory-defense':'首饰属性防护','element-defense':'属性防护','status-defense':'状态防护','balanced-combat':'攻防兼备'});
  function equipmentAttributes(attributes) {
    return Object.keys(EQUIPMENT_ATTRIBUTE_SOURCES).filter(key=>EQUIPMENT_ATTRIBUTE_SOURCES[key].some(attribute=>attributes.includes(attribute)));
  }
  // Permanent defense nodes already include their lifetime premium in effects-core.
  function priceEquipment(graph, modifiers = {}, options = {}) {
    const values=modifiers.attributes ?? {},errors=[];
    let permanentAttributes=0;
    try{permanentAttributes=foundation.EQUIPMENT_AFFIXES.priceAttributes(values);}catch(error){errors.push(error.message);}
    if(Object.keys(modifiers).some(key=>key!=='attributes'))errors.push('自研装备仅接受六维属性与已登记被动效果');
    let passiveDefense=0;
    if(graph){
      const checked=effects.validateGraph(graph,{ageTier:options.ageTier??'十万年',mechanismCap:options.mechanismCap??'规则'});
      errors.push(...checked.errors);
      if(effects.skillActivation(graph)!=='passive')errors.push('装备只能提供常驻被动，不能包含主动技能');
      passiveDefense=checked.spent;
    }
    let hostQuote=null;
    if(options.host!==undefined){try{hostQuote=globalThis.SoulHostPricing.quoteHost(options.host,{carrierKind:'equipment'});}catch(error){errors.push(error.message);}}
    const hostBudget=hostQuote?.budget??0;
    if(!(permanentAttributes+passiveDefense+hostBudget>0))errors.push('装备必须具有属性加成、常驻被动或已计价宿主能力');
    if(errors.length)throw new Error(errors.join('；'));
    return {costs:{passiveDefense,permanentAttributes,...(hostQuote?{host:hostBudget}:{})},spent:passiveDefense+permanentAttributes+hostBudget,...(hostQuote?{hostQuote}:{})};
  }
  function compileBudgetedSoulDevice(options = {}) {
    const totalBudget=integer(options.budget,0),attributes=list(options.attributes),seed=clean(options.seed,'soul-device');
    const variant=integer(options.variantIndex??0,0),ageTier=clean(options.ageTier,'十万年'),mechanismCap=clean(options.mechanismCap,'规则');
    const availableAttributes=equipmentAttributes(attributes);
    const defenses=effects.materialDefenseVariants(attributes,options.channels??[]).filter(([id,p])=>p.模式!=='易伤'&&(!options.allowedEffectIds||options.allowedEffectIds.includes(id))).map(([id,p])=>{const params={...p};delete params.持续回合;return [id,params];});
    const allowedStats=Object.keys(foundation.EQUIPMENT_AFFIXES.REGISTRY).filter(key=>foundation.EQUIPMENT_AFFIXES.permitted(key,attributes,options.channels??[],foundation.MARTIAL_SOUL_CORE.CHANNEL_REGISTRY));
    const affixes=foundation.EQUIPMENT_AFFIXES;
    const amps=(!options.allowedEffectIds||options.allowedEffectIds.includes('passive.element_amplify'))?attributes.filter(type=>foundation.DAMAGE_TYPES.includes(type)&&affixes.elementPermitted(type,attributes,options.channels??[],foundation.MARTIAL_SOUL_CORE.CHANNEL_REGISTRY)).flatMap(type=>[5,10,15,20,25,30].map(n=>['passive.element_amplify',{类型:type,数值:n}])):[];
    const coreSpecs=[...amps,...defenses.filter(([id])=>id==='status.resistance_shift')];
    function accessory(role){
      const cores=coreSpecs.filter(([id])=>role==='accessory-amplify'?id==='passive.element_amplify':role==='accessory-defense'?id==='status.resistance_shift':true);
      const variants=[];
      for(const spec of cores){
        const cost=effects.calculateNodeCost(spec[0],spec[1],{activation:'passive'});if(cost>totalBudget)continue;
        const remaining=Math.min(cost,totalBudget-cost),secondary=[];
        if(!options.forceNoAttribute)for(const key of availableAttributes){const n=affixes.attributeAllowance(remaining);if(n&&(!role.startsWith('attribute:')||role==='attribute:'+key))secondary.push({modifiers:{attributes:{[key]:n}},specs:[],cost:affixes.attributeCost(n)});}
        if(!role.startsWith('attribute:'))for(const key of allowedStats){
          if(role.startsWith('stat:')&&role!=='stat:'+key)continue;
          const n=affixes.allowance(key,remaining);if(n)secondary.push({modifiers:{attributes:{}},specs:[['passive.equipment_stat',{属性:key,数值:n}]],cost:affixes.price(key,n)});
        }
        if(!role.startsWith('attribute:')&&!role.startsWith('stat:'))secondary.push({modifiers:{attributes:{}},specs:[],cost:0});
        for(const side of secondary)variants.push({specs:[spec,...side.specs],modifiers:side.modifiers,spent:cost+side.cost,gap:(cost-side.cost)/(cost+side.cost)});
      }
      // Nearest legal 50% share, then actual utility purchased. No unused budget
      // is counted toward the share or forces an extra six-attribute point.
      variants.sort((a,b)=>a.gap-b.gap||b.spent-a.spent||stableHash(seed+JSON.stringify(a.specs))-stableHash(seed+JSON.stringify(b.specs)));
      return variants[variant%Math.max(1,Math.min(3,variants.length))]??null;
    }
    const roles=[...(!options.forceNoAttribute?availableAttributes.map(key=>'attribute:'+key):[]),...allowedStats.map(key=>'stat:'+key),...['accessory-amplify','accessory-defense','element-defense','status-defense','balanced-combat']];
    const offset=variant%Math.max(1,roles.length),ordered=options.candidateRole?[options.candidateRole]:[...roles.slice(offset),...roles.slice(0,offset)];
    for(const role of ordered){
      let effectSpecs=[],effectGraph=null,modifiers={attributes:{}};
      const attribute=role.startsWith('attribute:')?role.slice(10):'';
      if(attribute||role.startsWith('accessory-')||role.startsWith('stat:')&&affixes.REGISTRY[role.slice(5)]?.kind==='饰品'){
        const built=accessory(role);if(!built)continue;
        effectSpecs=built.specs;modifiers=built.modifiers;
        effectGraph=effects.makeBranchedGraph([{activation:'passive',label:'装备时生效',nodes:effectSpecs}]);
      }else if(role==='balanced-combat'){
        // Both halves pay their full permanent price. Find a legal 40/60–60/40
        // allocation for a material-supported pair; never buy two full budgets.
        const registry=foundation.EQUIPMENT_AFFIXES;
        const attacks=allowedStats.filter(key=>registry.REGISTRY[key].kind==='武器');
        const guards=[...allowedStats.filter(key=>registry.REGISTRY[key].kind==='防具').map(key=>({key})),...defenses.map(spec=>({spec}))];
        const pairs=attacks.flatMap(attack=>guards.map(guard=>({attack,guard}))).sort((a,b)=>stableHash(seed+JSON.stringify(a))-stableHash(seed+JSON.stringify(b)));
        for(const {attack,guard} of pairs){
          let best=null;
          for(let n=1;n<=registry.REGISTRY[attack].max;n++){
            const attackCost=registry.price(attack,n);
            if(attackCost>=totalBudget)break;
            const defenseBudget=Math.min(totalBudget-attackCost,Math.floor(attackCost*1.5));
            const value=guard.key?registry.allowance(guard.key,defenseBudget):0;
            const spec=guard.key?(value?['passive.equipment_stat',{属性:guard.key,数值:value}]:null):guard.spec;
            if(!spec)continue;
            const defenseCost=effects.calculateNodeCost(spec[0],spec[1],{activation:'passive'}),spent=attackCost+defenseCost;
            if(spent>totalBudget||Math.min(attackCost,defenseCost)<spent*.4)continue;
            if(!best||spent>best.spent||spent===best.spent&&Math.abs(attackCost-defenseCost)<best.gap)
              best={spent,gap:Math.abs(attackCost-defenseCost),specs:[['passive.equipment_stat',{属性:attack,数值:n}],spec]};
          }
          if(!best)continue;
          const graph=effects.makeBranchedGraph([{activation:'passive',label:'装备时生效',nodes:best.specs}]);
          if(!effects.validateGraph(graph,{ageTier,mechanismCap,budget:totalBudget}).pass)continue;
          effectSpecs=best.specs;effectGraph=graph;break;
        }
        if(!effectSpecs.length)continue;
      }else if(role.startsWith('stat:')){
        const key=role.slice(5);if(!allowedStats.includes(key))continue;
        const value=foundation.EQUIPMENT_AFFIXES.allowance(key,totalBudget);if(!value)continue;
        effectSpecs=[['passive.equipment_stat',{属性:key,数值:value}]];
        effectGraph=effects.makeBranchedGraph([{activation:'passive',label:'装备时生效',nodes:effectSpecs}]);
      }else{
        const id=role==='element-defense'?'status.resistance_shift':role==='status-defense'?'status.status_guard':null;
        if(!id)continue;
        const choices=defenses.filter(([effectId])=>effectId===id).sort((a,b)=>stableHash(seed+JSON.stringify(a))-stableHash(seed+JSON.stringify(b)));
        const seen=new Set();let spent=0;
        for(const spec of choices){
          const key=spec[1].类型??spec[1].防护对象,cost=effects.calculateNodeCost(spec[0],spec[1],{activation:'passive'});
          if(seen.has(key)||spent+cost>totalBudget)continue;
          const graph=effects.makeBranchedGraph([{activation:'passive',label:'装备时生效',nodes:[...effectSpecs,spec]}]);
          if(!effects.validateGraph(graph,{ageTier,mechanismCap,budget:totalBudget}).pass)continue;
          effectSpecs.push(spec);seen.add(key);spent+=cost;
          if(effectSpecs.length>=integer(options.maxEffectCount??4,1,4))break;
        }
        if(!effectSpecs.length)continue;
        effectGraph=effects.makeBranchedGraph([{activation:'passive',label:'装备时生效',nodes:effectSpecs}],{provenance:{source:clean(options.source,'budgeted-soul-device'),seed}});
        // A secondary attribute never displaces the candidate's main defensive use.
        if(!options.forceNoAttribute&&availableAttributes.length&&variant%3===1){
          const points=foundation.EQUIPMENT_AFFIXES.attributeAllowance(Math.min(totalBudget-spent,spent*2/3));
          if(points>0)modifiers.attributes[availableAttributes[variant%availableAttributes.length]]=points;
        }
      }
      const priced=priceEquipment(effectGraph,modifiers,{ageTier,mechanismCap});
      const stat=role.startsWith('stat:')?foundation.EQUIPMENT_AFFIXES.REGISTRY[role.slice(5)]:null;
      const deviceCategory=stat?(stat.kind==='武器'?'攻击':stat.kind==='防具'?'防御':stat.role==='mobility'?'移动':'辅助'):attribute?({力量:'攻击',身法:'移动',体魄:'防御',悟性:'辅助',感知:'侦测',意志:'辅助'}[attribute]):'防御';
      const equipmentKind=options.equipmentKind??(role==='balanced-combat'?'手套':attribute||role.startsWith('accessory-')||stat?.kind==='饰品'?'饰品':stat?.kind??'防具');
      const shape={effectGraph,modifiers,equipmentKind};
      if(!foundation.EQUIPMENT_AFFIXES.formsFor(shape,effects.calculateNodeCost).length)continue;
      effectSpecs=effectGraph.nodes.map(node=>[node.effectId,clone(node.params)]);
      return {pass:true,equipmentKind,fixedForm:foundation.EQUIPMENT_AFFIXES.assignForms([shape],[],effects.calculateNodeCost)[0].fixedForm,totalBudget,deviceCategory,effectSpecs,effectGraph,effectCount:effectSpecs.length,modifiers,
        valueLedger:{totalBudget,...priced,remainder:totalBudget-priced.spent},spent:priced.spent,remainder:totalBudget-priced.spent};
    }
    return {pass:false,totalBudget,spent:0,remainder:totalBudget,effectCount:0,reason:'材料或预算不足以获得装备属性或常驻被动'};
  }

  const CURRENCY = Object.freeze({unit: '金币'});
  const EQUIPMENT_SLOTS = Object.freeze(['魂导器槽1', '魂导器槽2', '魂导器槽3']);
  const SOUL_BONE_SLOTS = Object.freeze(['头骨', '躯干骨', '左臂骨', '右臂骨', '左腿骨', '右腿骨', '外附魂骨']);
  const SOUL_BONE_VALUE_RULES = Object.freeze({
    guaranteedDropYears: 100000,
    subHundredThousandBaseChance: 0.0001,
    maximumModifiedNaturalChance: 0.0025,
    naturalExternalSlotConditionalChance: 0.01,
    marketValuePerEffectPoint: 350,
    activeSkillShare: 0.75,
    passiveShare: 0.25,
    passiveUnitCosts: Object.freeze({先攻: 45, 移动区: 60, 普通攻击伤害: 50, 开战护盾: 5}),
    tierBaseBudgets: Object.freeze({十年: 260, 百年: 360, 千年: 520, 万年: 780, 十万年: 1400, 百万年: 2100})
  });
  const SOUL_DEVICE_CATEGORIES = Object.freeze(['攻击', '防御', '辅助', '移动', '侦测']);
  const CREATION_RULES = Object.freeze({
    totalPoints: 120,
    martialSoulMinimum: 1,
    martialSoulMaximum: 3,
    extraSoulSlotCost: 8,
    startingLevel: 10,
    attributeBaseline: 8,
    attributeMinimum: 6,
    attributeMaximum: 15,
    attributeCosts: Object.freeze({6:-2,7:-1,8:0,9:1,10:2,11:3,12:4,13:5,14:7,15:9}),
    identityCosts: Object.freeze({'civilian': 0, 'hunter-apprentice': 4, 'academy-student': 5, 'merchant-apprentice': 8})
  });

  const TEMPLATE_DRAFTS = Object.freeze({
    ...designs.MARTIAL_DRAFTS,
    'trail-hound': {sourceDescription:'适合林地追踪与近身扑咬的猎犬',name:'寻山犬',concept:'循着气味追踪并以爪牙护身',form:'灰褐猎犬虚影',role:'侦察/敏攻',categories:['犬科'],attributes:[{id:'生命',investment:2},{id:'风',investment:2}],channels:['近战打击'],baseAction:{mode:'melee',powerTier:1,attributeId:'风'},playerConfirmed:true},
    'woodland-bow': {sourceDescription:'林间猎人使用的木质长弓',name:'青木弓',concept:'通过弓弦将魂力凝为箭矢',form:'青褐长弓与细长魂力箭',role:'远程',categories:['弓弩','木质'],attributes:[{id:'木',investment:2},{id:'风',investment:2}],channels:['远程投射'],baseAction:{mode:'ranged',powerTier:1,attributeId:'风'},playerConfirmed:true},
    'patrol-shield': {sourceDescription:'基层护卫使用的坚固圆盾',name:'磐纹盾',concept:'以盾面守护并在近身时撞击',form:'岩纹圆盾',role:'防御/护卫',categories:['盾牌'],attributes:[{id:'土',investment:3},{id:'金',investment:1}],channels:['护盾守护','近战打击'],baseAction:{mode:'melee',powerTier:0,attributeId:'土'},playerConfirmed:true},
    'healing-staff': {sourceDescription:'基层魂师使用的温润白木杖',name:'白榆杖',concept:'引导生机疗愈伤口并维持近身防护',form:'顶端含柔光的白木杖',role:'治疗/支援',categories:['杖器','木质'],attributes:[{id:'生命',investment:3},{id:'木',investment:1}],channels:['生命治疗','近战打击'],baseAction:{mode:'melee',powerTier:0,attributeId:'木'},playerConfirmed:true},
    'iron-spear': {sourceDescription:'适合佣兵与巡防军的铁制长枪',name:'玄铁枪',concept:'以枪尖穿刺并形成正面压迫',form:'深灰枪身与银色枪尖',role:'强攻',categories:['枪矛','金属'],attributes:[{id:'金',investment:3},{id:'土',investment:1}],channels:['近战打击','破甲震荡'],baseAction:{mode:'melee',powerTier:1,attributeId:'金'},playerConfirmed:true},
    'sea-bird': {sourceDescription:'能随海风滑翔的海鸟',name:'逐潮鸥',concept:'借翼羽与风力飞行并掠击',form:'灰白海鸥虚影',role:'侦察/敏攻',categories:['鸟类'],attributes:[{id:'生命',investment:2},{id:'风',investment:2}],channels:['飞行升空','近战打击'],baseAction:{mode:'melee',powerTier:0,attributeId:'风'},playerConfirmed:true},
    'blue-silver-grass': {sourceDescription:'一株普通而柔韧的蓝银草',name:'普通蓝银草',concept:'依靠柔韧草叶进行近距离缠绕',form:'数根纤细蓝银草叶',role:'控制',categories:['草本'],attributes:[{id:'木',investment:2},{id:'生命',investment:1}],channels:['缠绕拘束'],baseAction:{mode:'touch',powerTier:0,attributeId:'木'},playerConfirmed:true},
    'green-vine': {sourceDescription:'兼有缠绕、毒蚀与再生能力的青色魂藤',name:'青络藤',concept:'以藤蔓组织传递束缚、毒蚀与生机',form:'带青色脉络的多节魂藤',role:'控制/辅助',categories:['藤蔓'],attributes:[{id:'木',investment:3},{id:'毒蚀',investment:3},{id:'生命',investment:2}],channels:['缠绕拘束','毒蚀传递','生命治疗'],traits:[{templateId:'属性专精',parameter:'attribute.wood',level:1},{templateId:'机制专修',parameter:'channel.entangle',level:1}],baseAction:{mode:'touch',powerTier:1,attributeId:'木'},playerConfirmed:true},
    'blue-silver-emperor': {sourceDescription:'能够统御同谱系植物并展开生命领域的蓝银皇',name:'蓝银皇',concept:'蓝银谱系的皇者，通过群落共生统御植物与生命网络',form:'蓝金色皇者藤草与根系网络',role:'控制/辅助/领域',categories:['藤蔓'],attributes:[{id:'木',investment:4},{id:'生命',investment:6}],channels:['缠绕拘束','生命治疗','属性增幅','领域展开'],traits:[{templateId:'属性专精',parameter:'attribute.wood',level:1},{templateId:'机制专修',parameter:'channel.entangle',level:1}],baseAction:{mode:'touch',powerTier:0,attributeId:'木'},playerConfirmed:true},
    'clear-sky-hammer': {sourceDescription:'极重、极坚且擅长冲击破甲的黑色战锤',name:'昊天锤',concept:'把重量、力量与冲击凝聚到正面破坏中的顶级战锤',form:'沉黑巨锤与暗金纹路',role:'强攻',categories:['锤器','金属'],attributes:[{id:'金',investment:6},{id:'土',investment:3}],channels:['近战打击','破甲震荡','护盾守护'],traits:[{templateId:'基础动作强化',level:1},{templateId:'检定熟练',parameter:'物理攻击',level:1},{templateId:'属性专精',parameter:'attribute.metal',level:1}],baseAction:{mode:'melee',powerTier:2,attributeId:'金'},playerConfirmed:true},
    'six-winged-angel': {sourceDescription:'兼具光明、飞行、净化、审判与领域潜力的六翼天使',name:'六翼天使',concept:'以光明执行守护、净化与审判的神性武魂',form:'六翼天使光影与金色圣辉',role:'强攻/辅助/领域',categories:['人形','光辉现象'],attributes:[{id:'光',investment:8},{id:'生命',investment:4}],channels:['飞行升空','净化驱散','远程投射','生命治疗','领域展开'],traits:[{templateId:'属性专精',parameter:'attribute.light',level:1},{templateId:'机制专修',parameter:'channel.flight',level:1},{templateId:'防御锤炼',parameter:'魂技防御',level:1}],weaknesses:[],baseAction:{mode:'ranged',powerTier:0,attributeId:'光'},playerConfirmed:true}
  });

  function compileTemplate(templateId, draft) {
    const compiled = foundation.MARTIAL_SOUL_CORE.finalizeDraft(draft, {budget: 200, id: `template-${templateId}`});
    return {名称: compiled.name, 品级: compiled.quality.value, 品级标签: compiled.quality.name, 形态: compiled.definition.form, 定位: compiled.definition.role, 结构化武魂: compiled};
  }
  const MARTIAL_SOUL_TEMPLATES = Object.freeze(Object.fromEntries(Object.entries(TEMPLATE_DRAFTS).map(([id,draft])=>[id,compileTemplate(id,draft)])));

  const ITEM_TEMPLATES = Object.freeze(Object.fromEntries(Object.entries({
    'martial-inheritance':{id:'martial-inheritance',name:'传承晶核',type:'杂物',basePrice:320,stackable:false,tags:['成长物品'],description:'登记的一次性成长力量，实际交付后可参与武魂进化。'},
    'evolution-elixir':{name:'凝源丹',type:'丹药',basePrice:0,stackable:false,tags:['成长物品'],description:'在武魂进化修习中服用，以炼化其中保留的魂质。'},
    'martial-research-notes':{name:'武魂研究笔记',type:'杂物',basePrice:20,stackable:false,tags:['书籍'],description:'多年来观察武魂表现与魂力运转的手写笔记。'},
    ...designs.TEMPLATES,
    'gu-yuena-silver-spear':{name:'白银龙枪',type:'魂导器',deviceCategory:'攻击',equipmentKind:'武器',fixedForm:foundation.EQUIPMENT_AFFIXES.FORMS.find(f=>f.id==='spear'),rank:9,basePrice:0,stackable:false,maxDurability:1000,modifiers:{attributes:{}},description:'银白长枪驾驭元素锋芒，展开旋涡吞纳来袭的元素能量。',appearance:'通体银白的长枪，枪锋狭长，细鳞纹沿枪身收束。',lore:'古月娜持有的神器。银色旋涡可以吞没来袭能量，与她的元素掌控相辅相成。',tags:['原著持有物','神器','银龙王'],passiveEffectGraph:effects.makeBranchedGraph([{activation:'passive',nodes:[['passive.equipment_stat',{属性:'普通攻击伤害',数值:40}],...['水','火','风','土','空间','光','暗'].map(类型=>['passive.element_amplify',{类型,数值:30}])]}]),activeSkill:{name:'白银龙枪',soulPowerCost:90,cooldownTurns:5,durabilityCost:1,requirements:['gesture'],effectGraph:effects.makeBranchedGraph([{id:'strike',label:'白银贯空',activation:'active',optional:true,nodes:[['release.melee',{}],['target.single',{阵营规则:'敌方'}],['check.physical_attack',{}],['payload.damage',{类型:'空间',骰数:8,骰面:12,加值:120,穿透档:1}]]},{id:'vortex',label:'白银旋涡',activation:'active',optional:true,targetPolicy:'self',nodes:[['target.self',{}],...['水','火','风','土','空间','光','暗'].map(类型=>['status.resistance_shift',{类型,模式:'吸收',持续回合:2}])]}])}},
    'gu-yuena-silver-armor':{name:'银龙舞麟',type:'魂导器',deviceCategory:'防御',equipmentKind:'防具',fixedForm:foundation.EQUIPMENT_AFFIXES.FORMS.find(f=>f.id==='armor'),rank:9,basePrice:0,stackable:false,maxDurability:1000,modifiers:{attributes:{}},description:'四字斗铠护住全身，银色龙翼赋予高空飞行与机动防护。',appearance:'冷紫光纹游走于银白轻甲，背部龙翼可随魂力展开。',lore:'古月娜的四字斗铠银龙舞麟，银白甲片与龙翼相接，随她的力量明亮舒展。',tags:['原著持有物','四字斗铠','银龙王'],passiveEffectGraph:effects.makeBranchedGraph([{activation:'passive',nodes:[['passive.equipment_stat',{属性:'生命上限',数值:400}],['passive.equipment_stat',{属性:'魂力上限',数值:300}],['passive.equipment_stat',{属性:'物理防御',数值:6}],['passive.equipment_stat',{属性:'魂技防御',数值:6}],['passive.equipment_stat',{属性:'固定减伤',数值:12}]]}]),activeSkill:{name:'银龙翼守',soulPowerCost:60,cooldownTurns:4,durabilityCost:1,requirements:['gesture'],effectSpecs:[['target.self',{}],['move.flight',{持续回合:6,高度:'高空'}],['payload.shield',{骰数:12,骰面:12,加值:200}]]}},
    ...curated.TEMPLATES,
    ...Object.fromEntries(Object.entries(custody.DEVICES).filter(([id])=>id!=='rope').map(([id,d])=>[id,{name:d.name,type:'拘束器',basePrice:d.price,stackable:false,maxDurability:100,tags:['拘束工具'],restraint:true,...curated.RESTRAINT_LORE[id]}])),
    ...((globalThis.SoulIntimateCore??(typeof require==='function'?require('./intimate-core.js'):null))?.ITEM_TEMPLATES??{}),
    'cloth-common': {name: '朴素护身衣', type: '魂导器', deviceCategory: '防御', rank: 1, basePrice: 180, stackable: false, maxDurability: 100, modifiers: {attributes: {}}, equipmentKind: '防具', fixedForm: foundation.EQUIPMENT_AFFIXES.FORMS.find(f=>f.id==='robe'), passiveEffectGraph: effects.makeBranchedGraph([{activation:'passive',nodes:[['passive.equipment_stat',{属性:'生命上限',数值:10}]]}])},
    'boots-common': {name: '轻身短靴', type: '魂导器', deviceCategory: '移动', rank: 1, stackable: false, maxDurability: 100, modifiers: {attributes: {身法: 1}},equipmentKind:'饰品',fixedForm:foundation.EQUIPMENT_AFFIXES.FORMS.find(f=>f.id==='boots'),passiveEffectGraph:effects.makeBranchedGraph([{activation:'passive',nodes:[['passive.element_amplify',{类型:'风',数值:5}]]}])},
    'dagger-hunting': {name: '猎魂短刀', type: '魂导器', deviceCategory: '攻击', rank: 1, basePrice: 520, stackable: false, maxDurability: 100, modifiers: {attributes: {}}, equipmentKind: '武器', fixedForm: foundation.EQUIPMENT_AFFIXES.FORMS.find(f=>f.id==='dagger'), passiveEffectGraph: effects.makeBranchedGraph([{activation:'passive',nodes:[['passive.equipment_stat',{属性:'普通攻击伤害',数值:4}]]}])},
    'staff-wood': {name: '硬木魂导杖', type: '魂导器', deviceCategory: '攻击', rank: 1, basePrice: 360, stackable: false, maxDurability: 100, modifiers: {attributes: {}}, equipmentKind: '武器', fixedForm: foundation.EQUIPMENT_AFFIXES.FORMS.find(f=>f.id==='staff'), passiveEffectGraph: effects.makeBranchedGraph([{activation:'passive',nodes:[['passive.equipment_stat',{属性:'普通攻击伤害',数值:2}]]}])},
    'amulet-calm': {name: '宁神魂导坠', type: '魂导器', deviceCategory: '辅助', rank: 1, stackable: false, maxDurability: 100, modifiers: {attributes: {意志: 1, 感知: 1}},equipmentKind:'饰品',fixedForm:foundation.EQUIPMENT_AFFIXES.FORMS.find(f=>f.id==='necklace'),passiveEffectGraph:effects.makeBranchedGraph([{activation:'passive',nodes:[['status.resistance_shift',{类型:'灵魂',模式:'抗性'}]]}])},
    'device-arc-launcher': {name: '玄弧魂导杖', type: '魂导器', deviceCategory: '攻击', rank: 2, basePrice: 6800, stackable: false, maxDurability: 72, modifiers: {attributes: {}}, equipmentKind: '武器', fixedForm: foundation.EQUIPMENT_AFFIXES.FORMS.find(f=>f.id==='staff'), passiveEffectGraph: effects.makeBranchedGraph([{activation:'passive',nodes:[['passive.equipment_stat',{属性:'普通攻击伤害',数值:2}]]}])},
    'device-penetrator-cannon': {name: '玄钢破阵刃', type: '魂导器', deviceCategory: '攻击', rank: 4, basePrice: 28600, stackable: false, maxDurability: 56, modifiers: {attributes: {}}, equipmentKind: '武器', fixedForm: foundation.EQUIPMENT_AFFIXES.FORMS.find(f=>f.id==='dagger'), passiveEffectGraph: effects.makeBranchedGraph([{activation:'passive',nodes:[['passive.equipment_stat',{属性:'普通攻击伤害',数值:4}]]}])},
    'device-bastion-bracer': {name: '玄壁魂导护腕', type: '魂导器', deviceCategory: '防御', rank: 2, basePrice: 6200, stackable: false, maxDurability: 80, modifiers: {attributes: {}}, equipmentKind: '防具', fixedForm: foundation.EQUIPMENT_AFFIXES.FORMS.find(f=>f.id==='bracer'), passiveEffectGraph: effects.makeBranchedGraph([{activation:'passive',nodes:[['passive.equipment_stat',{属性:'开战护盾',数值:27}]]}])},
    'device-vital-lotus': {name: '生息莲魂导器', type: '魂导器', deviceCategory: '辅助', rank: 3, stackable: false, maxDurability: 64, modifiers: {attributes: {悟性: 1, 意志: 1}},equipmentKind:'饰品',fixedForm:foundation.EQUIPMENT_AFFIXES.FORMS.find(f=>f.id==='pendant'),passiveEffectGraph:effects.makeBranchedGraph([{activation:'passive',nodes:[['status.resistance_shift',{类型:'生命',模式:'抗性'}]]}])},
    'device-windstep-boots': {name: '流风魂导靴', type: '魂导器', deviceCategory: '移动', rank: 2, stackable: false, maxDurability: 70, modifiers: {attributes: {身法: 1}},equipmentKind:'饰品',fixedForm:foundation.EQUIPMENT_AFFIXES.FORMS.find(f=>f.id==='boots'),passiveEffectGraph:effects.makeBranchedGraph([{activation:'passive',nodes:[['passive.element_amplify',{类型:'风',数值:10}],['passive.equipment_stat',{属性:'移动区',数值:1}]]}])},
    'device-soul-lens': {name: '照魂镜片', type: '魂导器', deviceCategory: '侦测', rank: 1, stackable: false, maxDurability: 90, modifiers: {attributes: {感知: 1}},equipmentKind:'饰品',fixedForm:foundation.EQUIPMENT_AFFIXES.FORMS.find(f=>f.id==='crown'),passiveEffectGraph:effects.makeBranchedGraph([{activation:'passive',nodes:[['passive.element_amplify',{类型:'灵魂',数值:10}],['passive.equipment_stat',{属性:'先攻',数值:1}]]}])},
    'bandage': {name: '止血绷带', type: '消耗品', basePrice: 45, stackable: true, activeSkill: {name: '使用·止血绷带', soulPowerCost: 0, cooldownTurns: 0, durabilityCost: 0, effectSpecs: [['target.self', {阵营规则: '友方'}], ['payload.heal', {骰数: 1, 骰面: 6, 加值: 2}]]}, tags: ['医疗', '生命恢复']},
    'basic-soul-tonic': {name: '基础回魂露', type: '消耗品', basePrice: 80, stackable: true, description:'饮用后恢复八点魂力，不会提高魂力上限。', activeSkill: {name: '饮用·基础回魂露', soulPowerCost: 0, cooldownTurns: 0, durabilityCost: 0, effectSpecs: [['target.self', {阵营规则: '友方'}], ['payload.soul_restore', {数值: 8}]]}, tags: ['医疗', '魂力恢复']},
    'construct-material-parcel':{name:'构造遗留材料',type:'材料',basePrice:0,stackable:false},
    'creation-wooden-staff':{name:'木制手杖',type:'工具',basePrice:40,stackable:false,maxDurability:100,tags:['木制工具']},
    'creation-stone-block':{name:'石质构件',type:'工具',basePrice:60,stackable:false,maxDurability:100,tags:['石材构件']},
    'creation-metal-cup':{name:'金属杯',type:'工具',basePrice:50,stackable:false,maxDurability:100,tags:['金属器皿']},
    'device-key':{name:'实体锁钥匙',type:'工具',basePrice:20,stackable:false,maxDurability:100,tags:['锁具凭据']},
    'rope': {name: '十米麻绳', type: '工具', basePrice: 90, stackable: false, tags: ['拘束工具'],...curated.RESTRAINT_LORE.rope},
    'material-hide': {name: '魂兽皮', type: '材料', basePrice: 160, stackable: true, tags: ['皮毛']},
    'material-scale': {name: '魂兽鳞片', type: '材料', basePrice: 190, stackable: true, tags: ['鳞甲']},
    'material-venom': {name: '魂兽毒囊', type: '材料', basePrice: 340, stackable: true, tags: ['毒']},
    'material-core': {name: '魂兽晶核碎片', type: '材料', basePrice: 520, stackable: true, tags: ['能量']},
    'material-meat': {name: '魂兽精肉', type: '材料', basePrice: 70, stackable: true, tags: ['食材']},
    'antidote-pill': {name: '解毒丸', type: '消耗品', basePrice: 120, stackable: true, activeSkill: {name: '服用·解毒丸', soulPowerCost: 0, cooldownTurns: 0, durabilityCost: 0, effectSpecs: [['target.self', {阵营规则: '友方'}], ['payload.cleanse', {类别: '毒素', 最大数量: 2}]]}, tags: ['医疗', '解毒']},
    'support-vitality-sausage': {name: '恢复香肠', type: '辅助食品', basePrice: 0, stackable: false, tags: ['食物', '辅助制造', '生命恢复']},
    'support-soul-sausage': {name: '魂力香肠', type: '辅助食品', basePrice: 0, stackable: false, tags: ['食物', '辅助制造', '魂力恢复']},
    'crafted-poison': {name:'自研毒药',type:'毒药',basePrice:0,stackable:true,tags:['自研成品','有害药性']},
    'crafted-pill': {name: '自研丹药', type: '丹药', basePrice: 0, stackable: true, tags: ['自研成品']},
    'crafted-hidden-disposable': {name: '自研消耗暗器', type: '暗器', basePrice: 0, stackable: true, tags: ['自研成品', '消耗暗器']},
    'crafted-soul-device-attack': {name: '自研攻击魂导器', type: '魂导器', deviceCategory: '攻击', basePrice: 0, stackable: false, maxDurability: 100, tags: ['自研成品']},
    'crafted-soul-device-defense': {name: '自研防御魂导器', type: '魂导器', deviceCategory: '防御', basePrice: 0, stackable: false, maxDurability: 100, tags: ['自研成品']},
    'crafted-soul-device-support': {name: '自研辅助魂导器', type: '魂导器', deviceCategory: '辅助', basePrice: 0, stackable: false, maxDurability: 100, tags: ['自研成品']},
    'crafted-soul-device-movement': {name: '自研移动魂导器', type: '魂导器', deviceCategory: '移动', basePrice: 0, stackable: false, maxDurability: 100, tags: ['自研成品']},
    'crafted-soul-device-detection': {name: '自研侦测魂导器', type: '魂导器', deviceCategory: '侦测', basePrice: 0, stackable: false, maxDurability: 100, tags: ['自研成品']},
    'story-keepsake': {name: '纪念物', type: '道具', basePrice: 0, stackable: false, tags: ['纪念物'], unpriced: true},
    'legacy-item': {name: '旧档随身物', type: '道具', basePrice: 0, stackable: false, tags: ['旧档迁移']},
    'soul-bone-generic': {name: '未鉴定魂骨', type: '魂骨', basePrice: 500000, stackable: false, tags: ['魂骨']},
    'ring-source': {name: '魂环', type: '魂环', basePrice: 5, stackable: false, tags: ['魂环来源']},
    'competition-soul-device': {name: '赛事传承魂导器', type: '魂导器', deviceCategory: '辅助', rank: 1, basePrice: 0, stackable: false, maxDurability: 100, tags: ['比赛奖励', '赛事传承']},
    'slaughter-blood-crystal': {name: '杀戮血晶', type: '材料', basePrice: 1800, stackable: true, tags: ['杀戮场奖励', '血', '暗']},
    'slaughter-black-iron': {name: '染血玄铁', type: '材料', basePrice: 1450, stackable: true, tags: ['杀戮场奖励', '武器', '暗']},
    'slaughter-blood-blade': {name: '血纹短刃魂导器', type: '魂导器', deviceCategory: '攻击', rank: 3, basePrice: 9800, stackable: false, maxDurability: 80, modifiers: {attributes: {}}, tags: ['杀戮场奖励', '血', '攻击魂导器'], equipmentKind: '武器', fixedForm: foundation.EQUIPMENT_AFFIXES.FORMS.find(f=>f.id==='dagger'), passiveEffectGraph: effects.makeBranchedGraph([{activation:'passive',nodes:[['passive.equipment_stat',{属性:'普通攻击伤害',数值:9}]]}])},
    'slaughter-hidden-blade': {name: '夺命袖刃', type: '暗器', basePrice: 12600, stackable: true, activeSkill: {name: '袖刃飞袭', soulPowerCost: 0, cooldownTurns: 0, durabilityCost: 0, effectSpecs: [['release.projectile', {距离区: 3}], ['target.single', {阵营规则: '敌方', 选择模式: '主目标'}], ['check.physical_attack', {命中加值: 2}], ['payload.damage', {类型: '物理', 骰数: 2, 骰面: 6, 加值: 3}]]}, tags: ['杀戮场奖励', '暗器', '武器']},
    'canon-weapon': {name: '原著登记兵器魂导器', type: '魂导器', deviceCategory: '攻击', rank: 1, basePrice: 0, stackable: false, maxDurability: 100, modifiers: {attributes: {}}, tags: ['原著角色库', '兵器'], equipmentKind: '武器', fixedForm: foundation.EQUIPMENT_AFFIXES.FORMS.find(f=>f.id==='sword'), passiveEffectGraph: effects.makeBranchedGraph([{activation:'passive',nodes:[['passive.equipment_stat',{属性:'普通攻击伤害',数值:2}]]}])},
    'canon-garment': {name: '原著登记衣饰', type: '魂导器', deviceCategory: '辅助', rank: 1, basePrice: 0, stackable: false, maxDurability: 100, modifiers: {attributes: {}}, tags: ['原著角色库', '衣装']},
    'canon-accessory': {name: '原著登记饰物魂导器', type: '魂导器', deviceCategory: '辅助', rank: 1, basePrice: 0, stackable: false, maxDurability: 100, modifiers: {attributes: {}}, tags: ['原著角色库', '饰物']},
    'canon-hidden-weapon': {name: '原著登记暗器', type: '暗器', basePrice: 0, stackable: true, activeSkill: {name: '暗器投射', soulPowerCost: 0, cooldownTurns: 0, durabilityCost: 0, effectSpecs: [['release.projectile', {距离区: 3}], ['target.single', {阵营规则: '敌方', 选择模式: '主目标'}], ['check.physical_attack', {}], ['payload.damage', {类型: '物理', 骰数: 1, 骰面: 6, 加值: 1}]]}, tags: ['原著角色库', '暗器']},
    'canon-soul-device': {name: '原著登记魂导器', type: '魂导器', deviceCategory: '辅助', rank: 1, stackable: false, maxDurability: 100, modifiers: {attributes: {意志: 1}}, tags: ['原著角色库'],equipmentKind:'饰品',fixedForm:foundation.EQUIPMENT_AFFIXES.FORMS.find(f=>f.id==='pendant'),passiveEffectGraph:effects.makeBranchedGraph([{activation:'passive',nodes:[['passive.element_amplify',{类型:'灵魂',数值:5}]]}])},
    'slaughter-blood-pill': {name: '血息丸', type: '丹药', basePrice: 950, stackable: true, activeSkill: {name: '服用·血息丸', soulPowerCost: 0, cooldownTurns: 0, durabilityCost: 0, effectSpecs: [['target.self', {阵营规则: '友方'}], ['payload.heal', {骰数: 2, 骰面: 8, 加值: 4}]]}, tags: ['杀戮场奖励', '丹药', '生命恢复']},
    ...(presets?.itemTemplates?.()??{})
  }).flatMap(([id,template])=>{
    const product={...(designs.SHOP_METADATA?.[id]??{}),...template},entry=presets?.get(id);
    const presetId=entry&&['丹药','毒药','暗器','魂导器','拘束器'].includes(entry.category)?entry.id:designs.SHOP_IDS.includes(id)&&!product.tags?.includes('灵魂契约')?`shop:${id}`:null;
    if(!presetId)return [[id,product]];
    const art=globalThis.SoulPresetArt.get(presetId),bookId=`blueprint-book:${presetId}`;
    return [[id,product],[bookId,{name:`${product.name}设计图`,type:'图纸',basePrice:100,stackable:true,tags:['预设设计图'],artId:art?.artId??'item.blueprint',payload:{blueprintBook:{version:1,presetId},artId:art?.artId??'item.blueprint'},description:`${product.name}的完整制作图纸。学习后可按图准备材料制作，图纸不附赠成品。`}]];
  })));

  const SUPPORT_CONSUMABLE_RECIPES = Object.freeze({
    'vitality-sausage': {name: '恢复香肠', templateId: 'support-vitality-sausage', soulPowerCost: 5, shelfLifeDays: 1, activeSkill: {name: '食用·恢复香肠', effectSpecs: [['target.self', {阵营规则: '友方'}], ['payload.heal', {骰数: 2, 骰面: 6, 加值: 2}]]}},
    'soul-sausage': {name: '魂力香肠', templateId: 'support-soul-sausage', soulPowerCost: 8, shelfLifeDays: 1, activeSkill: {name: '食用·魂力香肠', effectSpecs: [['target.self', {阵营规则: '友方'}], ['payload.soul_restore', {数值: 12}]]}},
    'detox-sausage': {name:'解毒小腊肠',templateId:'support-vitality-sausage',soulPowerCost:7,shelfLifeDays:1,activeSkill:{name:'食用·解毒小腊肠',effectSpecs:[['target.self',{阵营规则:'友方'}],['payload.cleanse',{类别:'毒素',最大数量:3}]]}},
    'flight-mushroom-sausage': {name:'急速飞行蘑菇肠',templateId:'support-soul-sausage',soulPowerCost:10,shelfLifeDays:1,activeSkill:{name:'食用·急速飞行蘑菇肠',effectSpecs:[['target.self',{阵营规则:'友方'}],['move.flight',{持续回合:4,高度:'高空'}]]}},
    'excitement-pink-sausage': {name:'亢奋粉红肠',templateId:'support-vitality-sausage',soulPowerCost:12,shelfLifeDays:1,activeSkill:{name:'食用·亢奋粉红肠',effectSpecs:[['target.self',{阵营规则:'友方'}],['status.buff',{属性:'力量',数值:3,持续回合:3}],['status.buff',{属性:'身法',数值:3,持续回合:3}]]}},
    'limit-green-sausage': {name:'超越极限墨绿肠',templateId:'support-vitality-sausage',soulPowerCost:18,shelfLifeDays:1,activeSkill:{name:'食用·超越极限墨绿肠',effectSpecs:[['target.self',{阵营规则:'友方'}],['status.buff',{属性:'力量',数值:5,持续回合:3}],['status.buff',{属性:'体魄',数值:5,持续回合:3}]]}},
    'copy-mirror-sausage': {name:'复制镜像肠',templateId:'support-soul-sausage',soulPowerCost:22,shelfLifeDays:1,activeSkill:{name:'食用·复制镜像肠',effectSpecs:[['target.self',{阵营规则:'友方'}],['copy.skillset',{复制比例:80,持续回合:4,最大技能数:1,排除魂骨:true,排除领域:true}]]}},
    'firm-golden-fly': {name:'坚挺金苍蝇',templateId:'support-soul-sausage',soulPowerCost:20,shelfLifeDays:1,activeSkill:{name:'食用·坚挺金苍蝇',effectSpecs:[['target.self',{阵营规则:'友方'}],['modifier.next_skill',{效果倍率:150,魂力消耗倍率:100,制造速度倍率:200,成品效果倍率:150,次数:1,持续回合:4}]]}},
    'crystal-caterpillar-sausage': {name:'水晶毛虫肠',templateId:'support-vitality-sausage',soulPowerCost:28,shelfLifeDays:1,worldCooldownDays:7,dailyLimit:1,activeSkill:{name:'食用·水晶毛虫肠',effectSpecs:[['target.self',{阵营规则:'友方'}],['payload.restore',{生命模式:'恢复至上限',生命数值:100,魂力模式:'恢复至上限',魂力数值:100,世界日冷却:7,每日次数:1}]]}},
    'half-diamond-sausage': {name:'多一半钻石肠',templateId:'support-vitality-sausage',soulPowerCost:24,shelfLifeDays:1,dailyLimit:1,activeSkill:{name:'食用·多一半钻石肠',effectSpecs:[['target.self',{阵营规则:'友方'}],['payload.restore',{生命模式:'缺失比例',生命数值:50,魂力模式:'缺失比例',魂力数值:50,世界日冷却:0,每日次数:1}]]}}
  });


  function supportFoodCarrier(state,item,options={}) {
    const p=item?.payload,recipe=SUPPORT_CONSUMABLE_RECIPES[p?.recipeId],origin=item?.provenance;
    if(!item||item.type!=='辅助食品'||ITEM_TEMPLATES[item.templateId]?.type!=='辅助食品'||!recipe||item.templateId!==recipe.templateId||item.quantity!==1)throw Error('需要一份真实制造的辅助食品');
    const day=options.atDay??state.世界.时间.day;
    if(!p.manufacturerId||!state.人物?.列表?.[p.manufacturerId]||origin?.type!=='support-food-created'||origin.manufacturerId!==p.manufacturerId||origin.recipeId!==p.recipeId||!origin.transactionId||!Number.isSafeInteger(p.createdDay)||p.createdDay<1||p.createdDay>day||p.expiresAtDay!==p.createdDay+recipe.shelfLifeDays)throw Error('食品制造来源或保质时间不完整');
    if(options.requireFresh!==false&&day>p.expiresAtDay)throw Error('消耗品已经过期');
    const modifier=p.craftingModifier,scale=p.activeSkill?.outputScale;
    if(!Number.isFinite(scale)||scale<1||scale>effects.EFFECT_REGISTRY['modifier.next_skill'].parameterBounds.成品效果倍率[1]/100||!modifier&&scale!==1)throw Error('食品增幅与原配方不一致');
    if(modifier){
      if(modifier.outputScale!==scale)throw Error('食品制造增幅与成品倍率不一致');
      if(!modifier.skillId||!effects.validateGraph(effects.makeLinearGraph([['target.self',{}],['modifier.next_skill',modifier.params]]),{ageTier:'十万年',mechanismCap:'规则'}).pass)throw Error('食品制造增幅来源无效');
      const source=state.技能?.列表?.[modifier.skillId],node=source?.effectGraph?.nodes?.find(n=>n.effectId==='modifier.next_skill');
      if(source&&(!abilities.verify(source).pass||source.持有者单位ID!==p.manufacturerId||!node||abilities.hash(node.params)!==abilities.hash(modifier.params)))throw Error('食品制造增幅不属于原生产者');
      if(node&&Number(combat.effectOutputProfile(node,source).node.params.成品效果倍率??100)/100!==scale)throw Error('食品实际增幅与原能力不一致');
    }
    const expected={...clone(recipe.activeSkill),outputScale:scale,soulPowerCost:0,cooldownTurns:0,durabilityCost:0,ageTier:'十万年',mechanismCap:'规则'};
    if(abilities.hash(expected)!==abilities.hash(p.activeSkill))throw Error('食品本体效果与原配方不一致');
    const receipt=state.世界?.processedTransactions?.[origin.transactionId],originalId=p.poisonServing?.originalFoodId??item.id;
    if(receipt&&(receipt.type!=='support-consumable-created'||receipt.entityId!==p.manufacturerId||receipt.recipeId!==p.recipeId||receipt.itemId!==originalId||receipt.expiresAtDay!==p.expiresAtDay||receipt.outputScale!==scale))throw Error('食品与原制造回执不一致');
    if(p.poisonServing){
      if(!options.allowPoisoned)throw Error('这份食品已经被污染');
      const mark=p.poisonServing,r=poison.source(state,mark.sourceId),before=r?.carrier?.foodProof;
      if(mark.version!==1||!r||r.carrier.kind!=='serving'||r.carrier.itemId!==item.id||mark.originalFoodId!==before?.id)throw Error('食品污染缺少实际药剂来源');
      supportFoodCarrier(state,before,{atDay:Math.floor(r.createdAt/1440),requireFresh:true});
      const body=clone(p),beforePayload=clone(before.payload);for(const key of ['poisonServing','skillId','skillIds','storedAtLocationId']){delete body[key];delete beforePayload[key];}
      if(item.templateId!==before.templateId||item.type!==before.type||abilities.hash(body)!==abilities.hash(beforePayload)||abilities.hash(origin)!==abilities.hash(before.provenance))throw Error('污染食品改写了原食品本体');
    }
    return {recipeId:p.recipeId,producerId:p.manufacturerId,createdDay:p.createdDay,expiresAtDay:p.expiresAtDay,outputScale:scale};
  }

  const IDENTITY_ARCHETYPES = Object.freeze({
    'academy-student': {name: '学院学生', wallet: 1800, kit: [['cloth-common', 1], ['boots-common', 1], ['staff-wood', 1], ['bandage', 2], ['basic-soul-tonic', 2]]},
    'hunter-apprentice': {name: '猎魂学徒', wallet: 1300, kit: [['cloth-common', 1], ['boots-common', 1], ['dagger-hunting', 1], ['rope', 1], ['bandage', 3], ['basic-soul-tonic', 2]]},
    'civilian': {name: '平民', wallet: 700, kit: [['cloth-common', 1], ['boots-common', 1], ['bandage', 1], ['basic-soul-tonic', 1]]},
    'merchant-apprentice': {name: '商行学徒', wallet: 2600, kit: [['cloth-common', 1], ['boots-common', 1], ['amulet-calm', 1], ['bandage', 2], ['basic-soul-tonic', 2]]}
  });

  // Story-created independent cultivators cover cultivation strength without copying canon identities.
  // Wealth and innate soul budget do not grow with cultivation or with the player's level.
  const independentSoulMaster = (identity, level) => ({identity, occupation:'游历魂师', faction:'无所属', level,
    creationGuidance:'仅用于符合当前地点、人物背景与剧情需要的新人物，不因玩家变强就提高等级，也不为普通相遇默认选择最高实力。无所属表示未登记势力归属；不替代原著人物，不自动成为可雇佣向导。',
    wallet:[2400,7000], kit:[['cloth-common',1],['boots-common',1],['bandage',2]],
    full:true, martialSouls:['iron-spear','trail-hound','woodland-bow','patrol-shield','healing-staff','sea-bird','green-vine','blue-silver-grass']});
  const NPC_ARCHETYPES = Object.freeze({
    'commerce-merchant':{...independentSoulMaster('唐门掌柜',[24,24]),wallet:[18000,18000],martialSouls:['iron-spear']},
    'commerce-artisan':{...independentSoulMaster('唐门工匠',[31,31]),wallet:[14000,14000],martialSouls:['forge-iron-hammer']},
    'commerce-ally':{...independentSoulMaster('独立医助或裁衣商人',[1,49]),wallet:[500,8000],martialSouls:['healing-staff']},
    'commerce-cat':{...independentSoulMaster('异瞳白猫魂士',[9,9]),martialSoulBudget:64,wallet:[37,37],martialSouls:['mutant-white-cat']},
    'commerce-smith':{...independentSoulMaster('修械匠',[34,34]),wallet:[286,286],martialSouls:['forge-iron-hammer']},
    'local-artisan':{...independentSoulMaster('当地工匠',[10,49]),occupation:'工匠',faction:'当地工坊',martialSouls:['forge-iron-hammer'],creationGuidance:'独立工匠，按照其手艺、工坊经历和眼下工作配置能力。'},
    'commerce-healer':{...independentSoulMaster('出诊医者',[42,42]),wallet:[418,418],martialSouls:['clear-wave-lotus']},
    civilian: {identity:'普通居民', occupation:'居民', faction:'无', level:[0,0], wallet:[10,50], kit:[['cloth-common',1],['boots-common',1]], full:false, creationGuidance:'无魂力的普通居民、伙计、学徒等；具体身份与职业可填写identity/occupation，不赋予商店、势力职权或战斗能力。'},
    'opening-agent': {identity:'地方事务经办人',occupation:'经办人',faction:'本地事务所',level:[0,0],wallet:[2000,2000],kit:[['cloth-common',1],['boots-common',1]],full:false,creationGuidance:'开局遗产、借款或受托物的经办联系人。有限经办资金用于已登记约定，不具备战斗能力或额外职权。'},
    merchant: {identity: '杂货商', occupation: '商人', faction: '本地商会', level: [1, 6], wallet: [18000, 32000], kit: [['cloth-common', 1], ['boots-common', 1], ['amulet-calm', 1]], full: false, shop: '',creationGuidance:'当地独立经营者，有个人姓名、家庭经历、买卖原则、经营困难与短期及长期目标。个人财产与店铺货源分开登记。'},
    'auction-owner':{...independentSoulMaster('拍卖行经营者',[62,62]),occupation:'拍卖行老板',wallet:[3000000,3000000],martialSouls:['patrol-shield'],creationGuidance:'原创经营者，个人出资有限，岗位只授予实际拍品委托的保管职能。'},
    'auction-host':{...independentSoulMaster('拍卖主持人',[25,25]),occupation:'拍卖主持人',wallet:[4500,4500],martialSouls:['healing-staff'],creationGuidance:'原创受雇主持人，公开说明拍品与最新出价；受声音、行动、死亡和真实位置限制。'},
    'commerce-consignor':{...independentSoulMaster('稀有器物寄卖人',[94,94]),occupation:'行商',wallet:[8000000,8000000],martialSouls:['iron-spear'],creationGuidance:'原创高阶寄卖人。预置货源与既存看管使用新世界初始化批次，实际财富有限，不虚构玩家战斗。'},
    guard: {identity: '城镇守卫', occupation: '卫兵', faction: '当地卫队', level: [8, 16], wallet: [1800, 4200], kit: [['cloth-common', 1], ['boots-common', 1], ['dagger-hunting', 1], ['bandage', 2]], full: true, martialSouls: ['iron-spear', 'patrol-shield']},
    hunter: {identity: '当地猎人', occupation: '猎人', faction: '当地猎户', level: [10, 24], wallet: [2400, 7000], kit: [['cloth-common', 1], ['boots-common', 1], ['dagger-hunting', 1], ['rope', 1]], full: true, escort: {fee: 200, role: '猎魂向导'}, martialSouls: ['trail-hound', 'woodland-bow'],creationGuidance:'靠打猎和为外来魂师带路谋生的当地居民；写明家乡、生活牵挂、擅长的路线和自己的目标。'},
    'spirit-hall-worker': {identity:'武魂殿外勤人员',occupation:'武魂殿外勤',faction:'武魂殿',level:[18,26],wallet:[2400,7000],kit:[['cloth-common',1],['boots-common',1],['bandage',3],['basic-soul-tonic',2]],full:true,escort:{fee:300,role:'巡护与支援'},martialSouls:['patrol-shield','healing-staff'],creationGuidance:'武魂殿派驻基层、为魂师提供付费巡护和救护的人，有驻地职责、个人经历与目标；职称不额外赋予执法权或通行权限。'},
    mercenary: {identity:'职业雇佣兵',occupation:'雇佣兵',faction:'当地佣兵团',level:[26,35],wallet:[2400,7000],kit:[['cloth-common',1],['boots-common',1],['dagger-hunting',1],['bandage',3]],full:true,escort:{fee:400,role:'战斗护卫'},martialSouls:['iron-spear','trail-hound'],creationGuidance:'属于当地佣兵团，以接任务为生；写明团队经历、看重的任务、信誉与个人目标，能力不随玩家等级改变。'},
    'imperial-patrol': {...independentSoulMaster('帝国巡护人员',[25,45]),occupation:'巡护军士',faction:'驻地帝国巡防军',martialSouls:['iron-spear','patrol-shield'],escort:{fee:450,role:'巡线护送'},creationGuidance:'归属当地帝国巡防队，有巡线职责和个人目标；可提供职责范围内的付费护送，不赋予玩家军职或通行权限。'},
    'sect-retainer': {...independentSoulMaster('宗门驻地执事',[30,55]),occupation:'宗门执事',faction:'当地宗门驻所',martialSouls:['healing-staff','iron-spear','green-vine'],escort:{fee:600,role:'宗门委托同行'},creationGuidance:'依据当前已登记宗门或地方驻所创建，可办理事务或受托同行；不是宗门名宿，不默认授予入门身份。'},
    'forest-veteran': {...independentSoulMaster('资深林区向导',[45,65]),occupation:'猎人',faction:'当地猎户',martialSouls:['trail-hound','woodland-bow'],escort:{fee:700,role:'深林向导'},creationGuidance:'长期在险地谋生的林区向导，熟悉本地道路，有自己的家人、工作原则和生活目标。'},
    'frontier-mercenary': {...independentSoulMaster('边境佣兵',[60,80]),occupation:'雇佣兵',faction:'边境佣兵团',martialSouls:['iron-spear','patrol-shield'],escort:{fee:1000,role:'险地护卫'},creationGuidance:'在边境接委托的佣兵，重视团队信誉，写明组织经历与个人目标。'},
    'sea-guide': {...independentSoulMaster('海上向导',[65,85]),occupation:'领航员',faction:'当地船队',martialSouls:['sea-bird','woodland-bow'],escort:{fee:1100,role:'海路领航'},creationGuidance:'当地船队领航员，熟悉海流与港口生活，有船员关系、航行经历和目标。'},
    'ocean-mercenary': {...independentSoulMaster('远海佣兵',[85,95]),occupation:'雇佣兵',faction:'远海佣兵团',martialSouls:['iron-spear','patrol-shield'],escort:{fee:1500,role:'远海护卫'},creationGuidance:'接受远海任务的佣兵，有海上经历、队伍与自己的目标。'},
    'wandering-soul-master': independentSoulMaster('游历魂师',[1,30]),
    'seasoned-soul-master': independentSoulMaster('资深魂师',[31,60]),
    'high-soul-master': independentSoulMaster('高阶魂师',[61,90]),
    'titled-soul-master': independentSoulMaster('封号斗罗',[91,99])
  });

  const PERSONALITIES = Object.freeze(['谨慎务实', '温和健谈', '沉默敏锐', '精明克制', '爽朗直接', '严肃守序']);
  const APPEARANCES = Object.freeze(['衣着整洁，目光沉稳', '身形精瘦，手上有常年劳作的薄茧', '步伐轻快，腰间工具收拾得井然有序', '神情警觉，衣角带着旅尘']);

  const REGIONAL_SERVICE_ROLES = Object.freeze({
    'loc-frozen-forest':['forest-veteran','frontier-mercenary'],
    'loc-star-dou-outer':['hunter','mercenary','imperial-patrol'],
    'loc-sunset-forest':['forest-veteran','mercenary','spirit-hall-worker'],
    'loc-blue-silver-forest':['forest-veteran','sect-retainer'],
    'loc-star-dou-inner':['forest-veteran','frontier-mercenary'],
    'loc-star-lake':['frontier-mercenary','forest-veteran'],
    'loc-hell-road':['frontier-mercenary'],
    'loc-ring-sea':['sea-guide','frontier-mercenary'],
    'loc-evil-orca-sea':['sea-guide','ocean-mercenary'],
    'loc-demon-whale-sea':['sea-guide','ocean-mercenary'],
    'loc-purple-pearl-island':['sea-guide','mercenary'],
    'loc-sea-breeze-port':['hunter','mercenary','sea-guide'],
    'loc-jialing-pass':['imperial-patrol','mercenary'],
    'loc-seven-treasure-sect':['sect-retainer'],
    'loc-clear-sky-gate':['sect-retainer'],
    'loc-seven-gate':['sect-retainer'],
    'loc-defense-clan':['sect-retainer'],
    'loc-notting-spirit-branch':['spirit-hall-worker'],
    'loc-gengxin-spirit-branch':['spirit-hall-worker'],
    'loc-star-luo-military':['imperial-patrol']
  });
  function regionalServiceSlots(id, options={}) {
    const roles=[...(REGIONAL_SERVICE_ROLES[id]??[])];
    if(['城市','帝都','驿站'].some(tag=>options.tags?.includes(tag)))roles.push('spirit-hall-worker');
    if(options.tags?.includes('皇室'))roles.push('imperial-patrol');
    if(options.tags?.includes('宗门'))roles.push('sect-retainer');
    return [...new Set(roles)].filter(archetype=>!(options.slots??[]).some(slot=>slot.archetype===archetype)).map(archetype=>({id:`recruit-${archetype}`,archetype}));
  }

  const uniqueSlots = slots => [...new Map(slots.map(slot=>[slot.id,slot])).values()];
  const worldLocation = (id, name, type, region, x, y, danger, options = {}) => ({
    id, name, type, region, danger, mapLevel: 'world', parentId: '', map: {x, y},
    discovery: options.discovery ?? 'known', evidence: options.evidence ?? 'canon-relative',
    summary: options.summary ?? '', tags: options.tags ?? [], backgroundCategories: options.backgroundCategories ?? [],
    slots: uniqueSlots([...(options.slots??[]),
      ...(['城市','帝都','驿站'].some(tag=>options.tags?.includes(tag))||id==='loc-hunting-forest'||id==='loc-sunset-forest'?[
        ...((options.slots??[]).some(slot=>slot.archetype==='hunter')?[]:[{id:'recruit-hunter',archetype:'hunter'}]),
        {id:'recruit-mercenary',archetype:'mercenary'}]:[]),
      ...(options.tags?.includes('武魂殿')||id==='loc-hunting-forest'?[{id:'recruit-spirit-hall-worker',archetype:'spirit-hall-worker'}]:[]),
      ...regionalServiceSlots(id,options).filter(slot=>slot.archetype!=='spirit-hall-worker'||!options.tags?.includes('武魂殿'))]),
    access: options.access ?? {}, initiallyKnown: options.initiallyKnown !== false, 扩展: {}
  });
  const localLocation = (id, parentId, name, type, x, y, danger, options = {}) => ({
    id, parentId, name, type, region: options.region ?? '', danger, mapLevel: 'local', map: {x, y},
    discovery: options.discovery ?? 'inherited', evidence: options.evidence ?? 'canon-explicit',
    summary: options.summary ?? '', tags: options.tags ?? [], backgroundCategories: options.backgroundCategories ?? [],
    slots: uniqueSlots([...(options.slots??[]),...regionalServiceSlots(id,options)]), access: options.access ?? {}, initiallyKnown: false, 扩展: {}
  });

  const LOCATION_DEFINITIONS = Object.freeze([
    worldLocation('loc-frozen-forest', '冰封森林', '魂兽森林', '大陆北境', 640, 55, 65, {evidence:'reborn-entry-27-gameplay-placement', summary:'北境的寒冷森林，奥斯卡在外历练的区域。', tags:['森林','寒冷','魂兽'], backgroundCategories:['历练魂师','猎魂小队'], slots:[]}),
    worldLocation('loc-holy-soul-village', '圣魂村', '村落', '法斯诺行省', 442, 270, 0, {evidence:'canon-explicit', summary:'小说开局所在地，铁匠铺与武魂觉醒仪式构成最初舞台。', tags:['安全','村落'], backgroundCategories:['村民','农户','孩童'], slots:[]}),
    worldLocation('loc-notting-city', '诺丁城', '城市', '法斯诺行省', 485, 238, 2, {evidence:'canon-explicit', summary:'法斯诺行省西南部城市，初级魂师学院与武魂分殿所在地。', tags:['城市','学院','武魂殿'], backgroundCategories:['学院学生','商贩','城卫'], slots:[{id:'slot-notting-store',archetype:'merchant'},{id:'slot-notting-guard',archetype:'guard'}]}),
    worldLocation('loc-hunting-forest', '猎魂森林', '圈养猎魂地', '法斯诺行省', 535, 255, 32, {evidence:'canon-explicit', summary:'武魂殿管辖的圈养魂兽森林，深处常有高年限魂兽出没。', tags:['森林','魂兽'], backgroundCategories:['猎魂小队','守林执事'], slots:[{id:'slot-hunting-guide',archetype:'hunter'}]}),

    worldLocation('loc-balak-city', '巴拉克城', '王城', '巴拉克王国', 510, 305, 4, {summary:'巴拉克王国政治中心，也是南北商路的重要节点。', tags:['城市','王城'], backgroundCategories:['王国卫兵','商队','旅人'], slots:[{id:'slot-balak-store',archetype:'merchant'}]}),
    worldLocation('loc-lima-waystation', '利马平原驿路', '驿路', '巴拉克王国', 555, 304, 12, {evidence:'gameplay-connector', summary:'连接巴拉克城与索托城的平原驿路，用于补足原著未明确命名的交通节点。', tags:['道路','平原'], backgroundCategories:['车夫','商队','驿卒'], slots:[]}),
    worldLocation('loc-soto-city', '索托城', '城市', '巴拉克王国', 592, 315, 4, {evidence:'canon-explicit', summary:'巴拉克王国重镇，拥有大斗魂场与繁盛商业区。', tags:['城市','斗魂场','商贸'], backgroundCategories:['魂师','商贩','观众'], slots:[{id:'slot-soto-store',archetype:'merchant'},{id:'slot-soto-guard',archetype:'guard'}]}),
    worldLocation('loc-shrek-old', '史莱克学院旧址', '学院旧址', '索托城郊', 610, 338, 8, {evidence:'reborn-entry-27-relocation', summary:'史莱克学院迁往天斗城后留下的索托旧校址，村舍和旧训练场仍在。', tags:['学院旧址','村落'], backgroundCategories:['附近村民','过路旅人'], slots:[]}),

    worldLocation('loc-silves-city', '西尔维斯城', '王城', '西尔维斯王国', 600, 220, 5, {evidence:'canon-explicit', summary:'天斗帝国属国王城，位于索托城通往天斗城的北上道路。', tags:['城市','斗魂场'], backgroundCategories:['旅人','斗魂师','王国卫兵'], slots:[{id:'slot-silves-store',archetype:'merchant'}]}),
    worldLocation('loc-heaven-dou-city', '天斗城', '帝都', '天斗帝国', 655, 162, 3, {evidence:'canon-explicit', summary:'天斗帝国首都，皇宫、月轩、拍卖场与多方势力汇聚。', tags:['帝都','皇室','商贸'], backgroundCategories:['贵族','魂师','商旅'], slots:[{id:'slot-heaven-store',archetype:'merchant'},{id:'slot-heaven-guard',archetype:'guard'}]}),
    worldLocation('loc-heaven-dou-academy', '天斗皇家学院', '高级学院', '天斗城外', 680, 140, 5, {evidence:'canon-explicit', summary:'依山而建的皇家高级魂师学院。', tags:['学院','皇室'], backgroundCategories:['皇家学员','学院教师'], slots:[]}),
    worldLocation('loc-lanba-academy', '史莱克学院', '高级学院', '天斗城', 681, 190, 3, {evidence:'reborn-entry-27-relocation', summary:'前身为蓝霸学院，斗罗历1644年更名为史莱克学院，如今的校址位于天斗城。', tags:['学院'], backgroundCategories:['学院学生','平民魂师'], slots:[]}),
    worldLocation('loc-sunset-forest', '落日森林', '猎魂地', '天斗城东', 735, 186, 45, {evidence:'canon-explicit', summary:'天斗城附近的魂兽森林，内部隐藏着独孤博的毒阵与冰火两仪眼。', tags:['森林','魂兽','毒'], backgroundCategories:['猎魂小队','独行魂师'], slots:[{id:'slot-sunset-hunter',archetype:'hunter'}]}),
    worldLocation('loc-seven-treasure-sect', '七宝琉璃宗', '宗门', '天斗城西北', 610, 148, 2, {evidence:'canon-explicit', summary:'上三宗之一七宝琉璃宗的宗门驻地。', tags:['宗门','七宝琉璃'], backgroundCategories:['宗门弟子','护卫'], slots:[]}),
    worldLocation('loc-longxing-city', '龙兴城', '城市', '星罗帝国边地', 790, 252, 7, {evidence:'canon-explicit', summary:'御之一族驻地所在城市，也是四大单属性宗族会合节点之一。', tags:['城市','宗族'], backgroundCategories:['工匠','宗族子弟','行商'], slots:[{id:'slot-longxing-store',archetype:'merchant'}]}),
    worldLocation('loc-clear-sky-gate', '昊天宗山门', '隐世宗门', '天斗帝国群山', 757, 98, 58, {evidence:'canon-explicit', discovery:'hidden', initiallyKnown:false, summary:'封闭于群山峭壁之间的昊天宗驻地，常规地图不标注精确入口。', tags:['宗门','高山','隐秘'], access:{requiredFlags:['knows-clear-sky-route']}, backgroundCategories:['宗门巡守'], slots:[]}),
    worldLocation('loc-sea-breeze-city', '瀚海城', '海滨城市', '天斗帝国西海岸', 278, 305, 8, {evidence:'canon-explicit', summary:'天斗帝国西部海滨重镇，海魂师与远洋贸易汇聚。', tags:['城市','海滨','海魂师'], backgroundCategories:['水手','海魂师','商人'], slots:[{id:'slot-sea-breeze-store',archetype:'merchant'},{id:'slot-sea-breeze-guard',archetype:'guard'}]}),

    worldLocation('loc-star-luo-city', '星罗城', '帝都', '星罗帝国', 620, 520, 4, {evidence:'canon-explicit', summary:'星罗帝国首都与皇室权力中心。', tags:['帝都','皇室'], backgroundCategories:['军士','贵族','商旅'], slots:[{id:'slot-star-luo-store',archetype:'merchant'},{id:'slot-star-luo-guard',archetype:'guard'}]}),
    worldLocation('loc-gengxin-city', '庚辛城', '城市', '星罗帝国', 505, 500, 6, {evidence:'canon-explicit', summary:'大陆金属之都，铁匠协会总会与庞大金属市场所在地。', tags:['城市','锻造','金属'], backgroundCategories:['铁匠','商人','佣兵'], slots:[{id:'slot-gengxin-store',archetype:'merchant'}]}),
    worldLocation('loc-star-dou-south-gate', '星斗南境驿站', '边境驿站', '星罗帝国北境', 612, 448, 25, {evidence:'gameplay-connector', summary:'由星罗方向进入星斗大森林的补充交通节点。', tags:['驿站','森林边缘'], backgroundCategories:['猎魂人','补给商'], slots:[{id:'slot-star-south-hunter',archetype:'hunter'}]}),

    worldLocation('loc-star-dou-north-gate', '星斗北境驿站', '边境驿站', '天斗帝国南境', 612, 285, 24, {evidence:'gameplay-connector', summary:'由天斗、索托方向进入星斗大森林的补充交通节点。', tags:['驿站','森林边缘'], backgroundCategories:['猎魂人','巡林人'], slots:[{id:'slot-star-north-hunter',archetype:'hunter'}]}),
    worldLocation('loc-star-dou-outer', '星斗大森林外围', '魂兽森林', '大陆中央', 623, 332, 38, {evidence:'canon-explicit', summary:'星斗大森林外围活动区，已足以出现千年魂兽。', tags:['森林','魂兽'], backgroundCategories:['猎魂小队','巡林人'], slots:[]}),
    worldLocation('loc-star-dou-inner', '星斗大森林混合区', '魂兽森林', '大陆中央', 635, 372, 68, {evidence:'canon-relative', summary:'靠近核心区的高危森林，万年魂兽活动明显增多。', tags:['森林','高危','魂兽'], backgroundCategories:['难以确认的魂兽动静'], slots:[]}),
    worldLocation('loc-star-lake', '生命之湖', '核心秘境', '星斗大森林核心区', 652, 398, 92, {evidence:'canon-explicit', discovery:'known', summary:'星斗大森林最深处的生命之湖，寻常魂师无法安全抵达。', tags:['森林','核心区','湖泊'], backgroundCategories:['强大魂兽气息'], slots:[]}),
    worldLocation('loc-spirit-city', '武魂城', '圣城', '天斗与星罗交界', 765, 320, 4, {evidence:'canon-explicit', summary:'武魂殿总部所在的独立城市，教皇殿与斗罗殿坐落于此。', tags:['城市','武魂殿','圣城'], backgroundCategories:['魂师','圣殿骑士','朝圣者'], slots:[{id:'slot-spirit-store',archetype:'merchant'},{id:'slot-spirit-guard',archetype:'guard'}]}),
    worldLocation('loc-jialing-pass', '嘉陵关', '雄关', '天斗帝国南境', 727, 395, 18, {evidence:'canon-explicit', summary:'扼守天斗帝国南部交通的战略雄关。', tags:['关隘','军事'], backgroundCategories:['守军','商队','信使'], slots:[{id:'slot-jialing-guard',archetype:'guard'}]}),

    worldLocation('loc-slaughter-entrance', '杀戮之都入口', '地下秘境入口', '西南荒原', 418, 412, 72, {evidence:'canon-explicit', discovery:'known', initiallyKnown:true, summary:'由荒僻小镇地下通往杀戮之都的隐秘入口。', tags:['地下','杀戮之都','隐秘'], backgroundCategories:['身份可疑的旅人'], slots:[]}),
    worldLocation('loc-waterfall-valley', '瀑布山谷', '隐秘成长地', '星斗大森林西缘', 478, 374, 40, {evidence:'canon-relative', discovery:'known', initiallyKnown:true, summary:'瀑布与岩洞构成的隐秘成长山谷。', tags:['山谷','瀑布','隐秘'], backgroundCategories:['林间鸟兽'], slots:[]}),
    worldLocation('loc-blue-silver-forest', '蓝银森林', '隐秘森林', '星斗大森林西北', 528, 348, 48, {evidence:'canon-relative', discovery:'known', initiallyKnown:true, summary:'蓝银草族群繁茂的隐秘森林，位置不会出现在常规地图。', tags:['森林','蓝银草','隐秘'], backgroundCategories:['蓝银草群落'], slots:[]}),

    worldLocation('loc-sea-breeze-port', '瀚海港', '港口', '天斗帝国西海岸', 232, 342, 12, {evidence:'canon-relative', summary:'瀚海城外的远洋港口，是出海前往西方群岛的起点。', tags:['港口','海运'], backgroundCategories:['船员','码头工','海商'], slots:[{id:'slot-port-store',archetype:'merchant'}]}),
    worldLocation('loc-purple-pearl-island', '紫珍珠岛', '海岛据点', '西海群岛', 138, 432, 40, {evidence:'canon-explicit', discovery:'known', summary:'紫珍珠海盗团活动的岛屿据点。', tags:['海岛','海盗'], backgroundCategories:['海盗','岛民'], slots:[]}),
    worldLocation('loc-demon-whale-sea', '魔鲸海域', '危险海域', '西海', 116, 284, 96, {evidence:'canon-explicit', discovery:'known', summary:'深海魔鲸王出没的极端危险海域，正常航线会尽力避开。', tags:['海域','魂兽','高危'], backgroundCategories:['远海魂兽'], slots:[]}),
    worldLocation('loc-evil-orca-sea', '邪魔虎鲸海域', '危险海域', '海神岛外海', 190, 190, 90, {evidence:'canon-relative', discovery:'known', summary:'邪魔虎鲸群及其首领邪魔虎鲸王活动的外海，也是魔魂大白鲨一族的宿敌海域。', tags:['海域','魂兽','邪魔虎鲸','高危'], backgroundCategories:['邪魔虎鲸群','远海魂兽'], slots:[]}),
    worldLocation('loc-sea-god-island', '海神岛', '海外圣地', '西海尽头', 96, 116, 82, {evidence:'canon-explicit', discovery:'known', summary:'海魂师敬奉海神的海外圣地，抵达需跨越漫长而危险的西海。', tags:['海岛','海神','圣地'], backgroundCategories:['海魂师','圣柱守护者'], slots:[]}),

    localLocation('loc-holy-soul-awakening-hall','loc-holy-soul-village','武魂觉醒厅','仪式场所',425,254,0,{summary:'村中举行六岁儿童武魂觉醒仪式的公共厅堂。'}),
    localLocation('loc-tang-smithy','loc-holy-soul-village','唐家铁匠铺','铁匠铺',458,286,0,{summary:'圣魂村边的简陋铁匠铺。'}),
    localLocation('loc-notting-academy','loc-notting-city','诺丁初级魂师学院','初级学院',472,221,1),
    localLocation('loc-notting-spirit-branch','loc-notting-city','诺丁武魂分殿','武魂殿分支',500,252,1),
    localLocation('loc-hunting-outer','loc-hunting-forest','猎魂森林外围','猎魂地',520,240,24,{tags:['森林','魂兽']}),
    localLocation('loc-hunting-deep','loc-hunting-forest','猎魂森林深处','猎魂地',552,270,55,{tags:['森林','魂兽','高危']}),
    localLocation('loc-soto-arena','loc-soto-city','索托大斗魂场','斗魂场',578,299,5),
    localLocation('loc-soto-market','loc-soto-city','索托商业区','市集',607,303,2),
    localLocation('loc-shrek-training','loc-shrek-old','史莱克旧训练场','训练场',625,350,8),
    localLocation('loc-heaven-palace','loc-heaven-dou-city','天斗皇宫','皇宫',642,146,2,{access:{requiredFlags:['heaven-palace-permit']}}),
    localLocation('loc-moon-pavilion','loc-heaven-dou-city','月轩','礼仪学院',642,179,1),
    localLocation('loc-heaven-auction','loc-heaven-dou-city','天斗拍卖场','拍卖场',668,178,1,{slots:[{id:'slot-auction-accountant',archetype:'merchant',service:false},{id:'slot-auction-collector',archetype:'merchant',service:false}]}),
    localLocation('loc-tang-heaven-dou','loc-heaven-dou-city','唐门天斗分号','商铺',677,166,1,{summary:'开局已成立的唐门天斗分号，掌柜与工匠经营一次性投掷暗器。',slots:[{id:'slot-tang-shop',archetype:'merchant',service:true}]}),
    localLocation('loc-strength-clan','loc-heaven-dou-city','力之一族府邸','宗族驻地',670,148,2),
    localLocation('loc-royal-campus','loc-heaven-dou-academy','皇家学院主校区','学院校区',694,130,2),
    localLocation('loc-lanba-campus','loc-lanba-academy','史莱克学院校区','学院校区',695,202,2),
    localLocation('loc-sunset-poison-array','loc-sunset-forest','碧磷毒阵','毒阵',722,171,72,{discovery:'hidden',tags:['毒','隐秘'],access:{requiredFlags:['knows-poison-array']}}),
    localLocation('loc-ice-fire-well','loc-sunset-forest','冰火两仪眼','聚宝地',750,198,82,{discovery:'hidden',tags:['冰火','药草','隐秘'],access:{requiredFlags:['knows-ice-fire-well']}}),
    localLocation('loc-seven-gate','loc-seven-treasure-sect','七宝山门','宗门入口',598,136,1),
    localLocation('loc-seven-hall','loc-seven-treasure-sect','七宝议事殿','宗门主殿',622,160,1),
    localLocation('loc-defense-clan','loc-longxing-city','御之一族府邸','宗族驻地',805,264,3),
    localLocation('loc-clear-cliff','loc-clear-sky-gate','绝壁山道','山道',742,114,62,{tags:['高山','险路']}),
    localLocation('loc-clear-chain','loc-clear-sky-gate','铁索天险','宗门通路',770,110,70,{tags:['高山','险路']}),
    localLocation('loc-clear-residence','loc-clear-sky-gate','昊天宗驻地','宗门驻地',760,82,5),
    localLocation('loc-hanhai-arena','loc-sea-breeze-city','瀚海大斗魂场','斗魂场',292,290,5),
    localLocation('loc-star-luo-palace','loc-star-luo-city','星罗皇宫','皇宫',608,505,2,{access:{requiredFlags:['star-luo-palace-permit']}}),
    localLocation('loc-star-luo-military','loc-star-luo-city','星罗军务区','军务区',634,535,3),
    localLocation('loc-gengxin-blacksmith','loc-gengxin-city','铁匠协会总会','协会',490,484,2),
    localLocation('loc-gengxin-metal-market','loc-gengxin-city','庚辛金属市场','市集',520,486,3),
    localLocation('loc-gengxin-spirit-branch','loc-gengxin-city','庚辛武魂主殿','武魂殿分支',508,516,2),
    localLocation('loc-star-lake-shore','loc-star-lake','生命之湖湖岸','湖岸',666,410,94),
    localLocation('loc-spirit-tournament','loc-spirit-city','总决赛场','比赛场地',748,305,2),
    localLocation('loc-pope-palace','loc-spirit-city','教皇殿','武魂殿核心',777,305,2),
    localLocation('loc-elder-hall','loc-spirit-city','长老殿','武魂殿核心',750,335,2),
    localLocation('loc-douluo-hall','loc-spirit-city','斗罗殿','圣殿',780,336,1,{access:{requiredFlags:['douluo-hall-permit']}}),
    localLocation('loc-slaughter-tavern','loc-slaughter-entrance','荒镇酒馆','入口伪装',402,397,55,{tags:['隐秘']}),
    localLocation('loc-slaughter-outer','loc-slaughter-entrance','杀戮之都外城','地下城市',432,397,70,{tags:['地下','杀戮之都']}),
    localLocation('loc-slaughter-inner','loc-slaughter-entrance','杀戮之都内城','地下城市',402,428,86,{tags:['地下','杀戮之都']}),
    localLocation('loc-slaughter-arena','loc-slaughter-entrance','地狱杀戮场','竞技场',432,428,92,{tags:['地下','杀戮之都']}),
    localLocation('loc-hell-road','loc-slaughter-entrance','地狱路','试炼秘境',418,445,100,{tags:['地下','杀戮之都','高危']}),
    localLocation('loc-waterfall-cave','loc-waterfall-valley','瀑布岩洞','隐秘洞窟',464,360,34),
    localLocation('loc-waterfall-training','loc-waterfall-valley','瀑布成长场','训练地',492,388,45),
    localLocation('loc-blue-silver-grove','loc-blue-silver-forest','蓝银王者林地','隐秘林地',542,360,52,{access:{requiredFlags:['blue-silver-lineage-recognized']}}),
    localLocation('loc-purple-dock','loc-purple-pearl-island','紫珍珠码头','码头',122,418,35),
    localLocation('loc-purple-base','loc-purple-pearl-island','紫珍珠驻地','海盗据点',152,446,44),
    localLocation('loc-sea-god-landing','loc-sea-god-island','海神岛登陆滩','海滩',80,132,48),
    localLocation('loc-seahorse-pillar','loc-sea-god-island','海马圣柱','圣柱',110,132,55),
    localLocation('loc-seven-pillars','loc-sea-god-island','七圣柱环域','圣柱群',80,101,58),
    localLocation('loc-ring-sea','loc-sea-god-island','环形海','岛内海域',112,101,72),
    localLocation('loc-sea-god-mountain','loc-sea-god-island','海神山','圣山',95,84,78),
    localLocation('loc-sea-god-temple','loc-sea-god-island','海神殿','神殿',95,67,82,{}),
    localLocation('loc-tidal-training','loc-sea-god-island','怒浪绝境','成长地',67,116,88,{})
  ]);

  const LOCATION_TEMPLATES = Object.freeze(Object.fromEntries(LOCATION_DEFINITIONS.map(location => [location.id, Object.freeze(location)])));
  const DUNGEON_ENTRANCE_LOCATION_IDS = Object.freeze(['loc-hunting-forest','loc-star-dou-outer','loc-sunset-forest','loc-blue-silver-forest','loc-star-dou-inner','loc-hell-road','loc-ring-sea','loc-star-lake','loc-evil-orca-sea','loc-demon-whale-sea']);
  const SAFE_RECOVERY_LOCATION_IDS = Object.freeze(Object.keys(LOCATION_TEMPLATES).filter(locationId => {
    const location = LOCATION_TEMPLATES[locationId];
    return DUNGEON_ENTRANCE_LOCATION_IDS.includes(locationId) || ['城市','王城','帝都','海滨城市','圣城','村落'].includes(location.type);
  }));

  const mapRoute = (id, from, to, minutes, danger, options = {}) => ({
    id, from, to, minutes, danger, costGold: options.costGold ?? 0, mode: options.mode ?? 'road',
    bidirectional: options.bidirectional !== false, encounter: options.encounter ?? 'possible',
    requirement: options.requirement ?? '', requirements: options.requirements ?? {}, evidence: options.evidence ?? 'gameplay-connector', 扩展: {}
  });
  const ROUTE_DEFINITIONS = Object.freeze([
    mapRoute('route-heaven-frozen-forest','loc-heaven-dou-city','loc-frozen-forest',14400,50,{mode:'forest',costGold:220,evidence:'gameplay-connector'}),
    mapRoute('route-holy-notting','loc-holy-soul-village','loc-notting-city',360,5,{costGold:10,evidence:'canon-explicit'}),
    mapRoute('route-notting-hunting','loc-notting-city','loc-hunting-forest',240,18,{costGold:8,evidence:'canon-explicit'}),
    mapRoute('route-notting-balak','loc-notting-city','loc-balak-city',1440,12,{costGold:35}),
    mapRoute('route-balak-lima','loc-balak-city','loc-lima-waystation',480,9,{costGold:15}),
    mapRoute('route-lima-soto','loc-lima-waystation','loc-soto-city',360,7,{costGold:12}),
    mapRoute('route-soto-shrek','loc-soto-city','loc-shrek-old',90,2,{evidence:'canon-explicit'}),
    mapRoute('route-soto-star-north','loc-soto-city','loc-star-dou-north-gate',720,20,{costGold:20,evidence:'canon-explicit'}),
    mapRoute('route-soto-silves','loc-soto-city','loc-silves-city',4320,15,{costGold:90,evidence:'canon-explicit'}),
    mapRoute('route-silves-heaven','loc-silves-city','loc-heaven-dou-city',10080,13,{costGold:180,evidence:'canon-explicit'}),
    mapRoute('route-heaven-royal','loc-heaven-dou-city','loc-heaven-dou-academy',60,1,{evidence:'canon-explicit'}),
    mapRoute('route-heaven-lanba','loc-heaven-dou-city','loc-lanba-academy',45,1,{evidence:'canon-explicit'}),
    mapRoute('route-heaven-sunset','loc-heaven-dou-city','loc-sunset-forest',240,24,{costGold:8,evidence:'canon-explicit'}),
    mapRoute('route-heaven-seven','loc-heaven-dou-city','loc-seven-treasure-sect',360,4,{costGold:10,evidence:'canon-relative'}),
    mapRoute('route-heaven-longxing','loc-heaven-dou-city','loc-longxing-city',12000,17,{costGold:220,evidence:'canon-relative'}),
    mapRoute('route-heaven-clear','loc-heaven-dou-city','loc-clear-sky-gate',2400,34,{requirements:{requiredFlags:['knows-clear-sky-route']},requirement:'已知昊天宗山门路线'}),
    mapRoute('route-heaven-hanhai','loc-heaven-dou-city','loc-sea-breeze-city',14400,16,{costGold:260,evidence:'canon-relative'}),
    mapRoute('route-heaven-jialing','loc-heaven-dou-city','loc-jialing-pass',14400,18,{costGold:220,evidence:'canon-relative'}),
    mapRoute('route-longxing-gengxin','loc-longxing-city','loc-gengxin-city',10080,16,{costGold:190,evidence:'canon-relative'}),
    mapRoute('route-spirit-jialing','loc-spirit-city','loc-jialing-pass',7200,22,{costGold:130,evidence:'canon-relative'}),
    mapRoute('route-spirit-star-luo','loc-spirit-city','loc-star-luo-city',18000,20,{costGold:300,evidence:'canon-relative'}),
    mapRoute('route-star-gengxin','loc-star-luo-city','loc-gengxin-city',7200,14,{costGold:140,evidence:'canon-relative'}),
    mapRoute('route-star-south','loc-star-luo-city','loc-star-dou-south-gate',1440,20,{costGold:35}),
    mapRoute('route-north-outer','loc-star-dou-north-gate','loc-star-dou-outer',180,36,{mode:'forest'}),
    mapRoute('route-south-outer','loc-star-dou-south-gate','loc-star-dou-outer',240,40,{mode:'forest'}),
    mapRoute('route-outer-inner','loc-star-dou-outer','loc-star-dou-inner',360,72,{mode:'forest',encounter:'forced'}),
    mapRoute('route-inner-lake','loc-star-dou-inner','loc-star-lake',480,96,{mode:'forest',encounter:'forced'}),
    mapRoute('route-outer-waterfall','loc-star-dou-outer','loc-waterfall-valley',300,42,{mode:'forest'}),
    mapRoute('route-outer-blue-silver','loc-star-dou-outer','loc-blue-silver-forest',360,50,{mode:'forest'}),
    mapRoute('route-gengxin-slaughter','loc-gengxin-city','loc-slaughter-entrance',7200,46,{}),
    mapRoute('route-hanhai-port','loc-sea-breeze-city','loc-sea-breeze-port',60,3,{mode:'road',evidence:'canon-relative'}),
    mapRoute('route-port-purple','loc-sea-breeze-port','loc-purple-pearl-island',4320,48,{mode:'sea',costGold:500,evidence:'canon-relative'}),
    mapRoute('route-purple-demon','loc-purple-pearl-island','loc-demon-whale-sea',2880,92,{mode:'sea',encounter:'forced',costGold:350}),
    mapRoute('route-demon-seagod','loc-demon-whale-sea','loc-sea-god-island',4320,88,{mode:'sea',encounter:'forced',costGold:600}),
    mapRoute('route-seagod-orca','loc-sea-god-island','loc-evil-orca-sea',2880,90,{mode:'sea',costGold:350,evidence:'canon-relative'}),

    mapRoute('route-holy-awakening','loc-holy-soul-village','loc-holy-soul-awakening-hall',8,0,{mode:'local',encounter:'none'}),
    mapRoute('route-holy-smithy','loc-holy-soul-village','loc-tang-smithy',10,0,{mode:'local',encounter:'none'}),
    mapRoute('route-notting-academy','loc-notting-city','loc-notting-academy',15,0,{mode:'local',encounter:'none'}),
    mapRoute('route-notting-spirit','loc-notting-city','loc-notting-spirit-branch',12,0,{mode:'local',encounter:'none'}),
    mapRoute('route-hunting-outer','loc-hunting-forest','loc-hunting-outer',20,18,{mode:'forest'}),
    mapRoute('route-hunting-deep','loc-hunting-outer','loc-hunting-deep',90,58,{mode:'forest',encounter:'forced'}),
    mapRoute('route-soto-arena','loc-soto-city','loc-soto-arena',15,0,{mode:'local',encounter:'none'}),
    mapRoute('route-soto-market','loc-soto-city','loc-soto-market',10,0,{mode:'local',encounter:'none'}),
    mapRoute('route-shrek-training','loc-shrek-old','loc-shrek-training',8,0,{mode:'local',encounter:'none'}),
    mapRoute('route-heaven-palace','loc-heaven-dou-city','loc-heaven-palace',20,0,{mode:'local',encounter:'none',requirements:{requiredFlags:['heaven-palace-permit']}}),
    mapRoute('route-heaven-moon','loc-heaven-dou-city','loc-moon-pavilion',18,0,{mode:'local',encounter:'none'}),
    mapRoute('route-heaven-auction','loc-heaven-dou-city','loc-heaven-auction',16,0,{mode:'local',encounter:'none'}),
    mapRoute('route-heaven-tang','loc-heaven-dou-city','loc-tang-heaven-dou',14,0,{mode:'local',encounter:'none'}),
    mapRoute('route-tang-auction','loc-tang-heaven-dou','loc-heaven-auction',10,0,{mode:'local',encounter:'none'}),
    mapRoute('route-heaven-strength','loc-heaven-dou-city','loc-strength-clan',25,0,{mode:'local',encounter:'none'}),
    mapRoute('route-royal-campus','loc-heaven-dou-academy','loc-royal-campus',10,0,{mode:'local',encounter:'none'}),
    mapRoute('route-lanba-campus','loc-lanba-academy','loc-lanba-campus',10,0,{mode:'local',encounter:'none'}),
    mapRoute('route-sunset-poison','loc-sunset-forest','loc-sunset-poison-array',120,70,{mode:'forest',requirements:{requiredFlags:['knows-poison-array']}}),
    mapRoute('route-poison-ice-fire','loc-sunset-poison-array','loc-ice-fire-well',30,82,{mode:'forest',requirements:{requiredFlags:['knows-ice-fire-well']}}),
    mapRoute('route-seven-gate','loc-seven-treasure-sect','loc-seven-gate',10,0,{mode:'local',encounter:'none'}),
    mapRoute('route-seven-hall','loc-seven-gate','loc-seven-hall',12,0,{mode:'local',encounter:'none'}),
    mapRoute('route-defense-clan','loc-longxing-city','loc-defense-clan',15,0,{mode:'local',encounter:'none'}),
    mapRoute('route-clear-cliff','loc-clear-sky-gate','loc-clear-cliff',30,58,{mode:'local'}),
    mapRoute('route-clear-chain','loc-clear-cliff','loc-clear-chain',20,68,{mode:'local'}),
    mapRoute('route-clear-residence','loc-clear-chain','loc-clear-residence',30,30,{mode:'local'}),
    mapRoute('route-hanhai-arena','loc-sea-breeze-city','loc-hanhai-arena',15,0,{mode:'local',encounter:'none'}),
    mapRoute('route-star-palace','loc-star-luo-city','loc-star-luo-palace',20,0,{mode:'local',encounter:'none',requirements:{requiredFlags:['star-luo-palace-permit']}}),
    mapRoute('route-star-military','loc-star-luo-city','loc-star-luo-military',18,0,{mode:'local',encounter:'none'}),
    mapRoute('route-gengxin-blacksmith','loc-gengxin-city','loc-gengxin-blacksmith',12,0,{mode:'local',encounter:'none'}),
    mapRoute('route-gengxin-market','loc-gengxin-city','loc-gengxin-metal-market',15,0,{mode:'local',encounter:'none'}),
    mapRoute('route-gengxin-spirit','loc-gengxin-city','loc-gengxin-spirit-branch',18,0,{mode:'local',encounter:'none'}),
    mapRoute('route-star-lake-shore','loc-star-lake','loc-star-lake-shore',15,86,{mode:'local'}),
    mapRoute('route-spirit-tournament','loc-spirit-city','loc-spirit-tournament',15,0,{mode:'local',encounter:'none'}),
    mapRoute('route-spirit-pope','loc-spirit-city','loc-pope-palace',15,0,{mode:'local',encounter:'none'}),
    mapRoute('route-spirit-elder','loc-spirit-city','loc-elder-hall',18,0,{mode:'local',encounter:'none'}),
    mapRoute('route-spirit-douluo','loc-spirit-city','loc-douluo-hall',20,0,{mode:'local',encounter:'none',requirements:{requiredFlags:['douluo-hall-permit']}}),
    mapRoute('route-slaughter-tavern','loc-slaughter-entrance','loc-slaughter-tavern',10,25,{mode:'special',encounter:'none'}),
    mapRoute('route-slaughter-outer','loc-slaughter-tavern','loc-slaughter-outer',20,70,{mode:'special'}),
    mapRoute('route-slaughter-inner','loc-slaughter-outer','loc-slaughter-inner',15,82,{mode:'special'}),
    mapRoute('route-slaughter-arena','loc-slaughter-inner','loc-slaughter-arena',10,90,{mode:'special'}),
    mapRoute('route-hell-road','loc-slaughter-arena','loc-hell-road',60,100,{mode:'special',encounter:'forced'}),
    mapRoute('route-waterfall-cave','loc-waterfall-valley','loc-waterfall-cave',15,15,{mode:'local'}),
    mapRoute('route-waterfall-training','loc-waterfall-valley','loc-waterfall-training',12,24,{mode:'local'}),
    mapRoute('route-blue-silver-grove','loc-blue-silver-forest','loc-blue-silver-grove',30,35,{mode:'forest',requirements:{requiredFlags:['blue-silver-lineage-recognized']}}),
    mapRoute('route-purple-dock','loc-purple-pearl-island','loc-purple-dock',10,5,{mode:'local',encounter:'none'}),
    mapRoute('route-purple-base','loc-purple-dock','loc-purple-base',12,8,{mode:'local',encounter:'none'}),
    mapRoute('route-seagod-landing','loc-sea-god-island','loc-sea-god-landing',10,20,{mode:'local'}),
    mapRoute('route-seagod-seahorse','loc-sea-god-landing','loc-seahorse-pillar',30,40,{mode:'local'}),
    mapRoute('route-seagod-pillars','loc-seahorse-pillar','loc-seven-pillars',35,50,{mode:'local'}),
    mapRoute('route-seagod-ring','loc-seven-pillars','loc-ring-sea',30,68,{mode:'local'}),
    mapRoute('route-seagod-mountain','loc-seven-pillars','loc-sea-god-mountain',45,72,{mode:'local'}),
    mapRoute('route-seagod-temple','loc-sea-god-mountain','loc-sea-god-temple',40,82,{mode:'local'}),
    mapRoute('route-seagod-tidal','loc-ring-sea','loc-tidal-training',45,88,{mode:'local'})
  ]);
  const ROUTE_TEMPLATES = Object.freeze(Object.fromEntries(ROUTE_DEFINITIONS.map(route => [route.id, Object.freeze(route)])));
  const INITIAL_KNOWN_LOCATION_IDS = Object.freeze(LOCATION_DEFINITIONS.filter(location => location.mapLevel === 'world' && location.initiallyKnown).map(location => location.id));

  // Progression is a world transaction: UI and narrative providers cannot grant arbitrary flags.
  const WORLD_EVENTS = Object.freeze(Object.fromEntries([
    {id:'forest-trails',locationId:'loc-star-dou-outer',name:'追寻蓝银草的回声',speaker:'巡林人',description:'带着外围探索的见闻，与巡林人辨认通向隐秘森林的小径。',requiredExpedition:'star-dou-outer-expedition',expeditionName:'星斗大森林外围',flags:['knows-blue-silver-forest'],discover:['loc-blue-silver-forest'],result:'循着草叶上的银色脉络，你将蓝银森林的位置记入地图。'},
    {id:'waterfall-trail',locationId:'loc-star-dou-outer',name:'山谷中的水声',speaker:'山间猎人',description:'循着林间水声，向猎人请教瀑布山谷的隐秘路径。',flags:['knows-waterfall-valley'],discover:['loc-waterfall-valley'],result:'猎人指出一道藏在岩壁后的山径，瀑布山谷已标记。'},
    {id:'lake-trail',locationId:'loc-star-dou-inner',name:'森林深处的湖光',speaker:'探路人',description:'整理混合区探索所得的踪迹，辨认通向生命之湖的道路。',requiredExpedition:'star-dou-inner-expedition',expeditionName:'星斗大森林混合区',flags:['knows-star-lake'],discover:['loc-star-lake'],result:'你将深林足迹连成路线，生命之湖的方位渐渐清晰。'},
    {id:'slaughter-rumor',locationId:'loc-soto-city',name:'荒镇来客',speaker:'独行旅人',description:'听一位独行旅人讲述西南荒镇与地下之城的传闻。',flags:['knows-slaughter-entrance'],discover:['loc-slaughter-entrance'],result:'旅人留下了荒镇的位置。那条地下道路，通向杀戮之都。'},
    {id:'clear-sky-introduction',locationId:'loc-moon-pavilion',name:'群山中的引荐',speaker:'月轩接引人',description:'向月轩接引人说明来意，取得拜访昊天宗的山路指引。',flags:['knows-clear-sky-route'],discover:['loc-clear-sky-gate'],result:'接引人交给你山路图与拜访信，昊天宗山门已标记。'},
    {id:'heaven-palace-visit',locationId:'loc-heaven-dou-city',name:'皇城访客登记',speaker:'皇城执事',description:'在城内登记魂师身份，申请进入皇宫的访客许可。',flags:['heaven-palace-permit'],discover:['loc-heaven-palace'],result:'登记完成。你获准沿皇城指定道路拜访天斗皇宫。'},
    {id:'star-luo-palace-visit',locationId:'loc-star-luo-city',name:'星罗皇城通行',speaker:'皇城执事',description:'向皇城执事登记来访，领取通行凭证。',flags:['star-luo-palace-permit'],discover:['loc-star-luo-palace'],result:'星罗皇宫的访客通行凭证已经交到你手中。'},
    {id:'douluo-hall-visit',locationId:'loc-spirit-city',name:'斗罗殿拜访',speaker:'圣殿接引人',description:'向圣殿接引人说明拜访意愿，领取殿前通行许可。',flags:['douluo-hall-permit'],discover:['loc-douluo-hall'],result:'你获得斗罗殿的拜访许可，可以沿圣城长阶前往。'},
    {id:'poison-trail',locationId:'loc-sunset-forest',name:'毒雾中的足迹',speaker:'采药人',description:'带着落日森林的探索见闻，辨认碧磷毒阵外的安全路径。',requiredExpedition:'sunset-forest-expedition',expeditionName:'落日森林',flags:['knows-poison-array'],discover:['loc-sunset-poison-array'],result:'采药人帮你辨清毒雾流向，碧磷毒阵入口已标记。'},
    {id:'ice-fire-trail',locationId:'loc-sunset-poison-array',name:'冰与火的泉息',speaker:'守谷人',description:'循着冷热交汇的气息，向守谷人询问谷地深处的道路。',flags:['knows-ice-fire-well'],discover:['loc-ice-fire-well'],result:'你记下穿过毒阵的步序，冰火两仪眼的位置已标记。'},
    {id:'blue-silver-guest',locationId:'loc-blue-silver-forest',name:'森林的善意',speaker:'蓝银林守',description:'完成一次森林探索后，分享见闻并取得王者林地的访客引荐。',requiredExpedition:'blue-silver-forest-expedition',expeditionName:'蓝银森林',flags:['blue-silver-guest-permit'],discover:['loc-blue-silver-grove'],result:'蓝银林守认可你的善意，允许你以访客身份进入王者林地。'},
    {id:'sea-voyage',locationId:'loc-sea-breeze-port',name:'整备远航',speaker:'港务领航员',description:'核对海图、补给与航行须知，登记一条可供远航的船只。航程费用会在出发前列明。',flags:['has-sea-vessel'],discover:['loc-purple-pearl-island','loc-evil-orca-sea','loc-demon-whale-sea'],result:'船只与海图已准备妥当。你现在可以规划海上旅程。'},
    {id:'sea-god-route',locationId:'loc-purple-dock',name:'西海尽头的航线',speaker:'海岛领航员',description:'向熟悉远洋的领航员请教海神岛航线。',requiredFlags:['has-sea-vessel'],flags:['knows-sea-god-route'],discover:['loc-sea-god-island'],result:'领航员标出了暗礁与洋流，通向海神岛的航线已记入地图。'},
    {id:'sea-god-trial',locationId:'loc-seahorse-pillar',name:'圣柱前的试炼登记',speaker:'圣柱接引人',description:'在圣柱前登记试炼意愿，取得前往海神殿与怒浪绝境的资格。',requiredFlags:['knows-sea-god-route'],flags:['sea-god-trial-active'],discover:['loc-sea-god-temple','loc-tidal-training'],result:'圣柱接引人记下你的姓名，试炼区域的道路已开放。'}
  ].map(event => [event.id,Object.freeze(event)])));

  const WORLD_QUALIFICATIONS = Object.freeze({
    'knows-blue-silver-forest':{name:'蓝银森林路线'},'knows-waterfall-valley':{name:'瀑布山谷路线'},
    'knows-star-lake':{name:'生命之湖路线'},'knows-slaughter-entrance':{name:'杀戮之都入口情报'},
    'knows-clear-sky-route':{name:'昊天宗山路指引'},'heaven-palace-permit':{name:'天斗皇宫访客许可'},
    'star-luo-palace-permit':{name:'星罗皇宫访客许可'},'douluo-hall-permit':{name:'斗罗殿拜访许可'},
    'knows-poison-array':{name:'碧磷毒阵路线'},'knows-ice-fire-well':{name:'冰火两仪眼路线'},
    'blue-silver-lineage-recognized':{name:'蓝银血脉认可或林地访客引荐',alternatives:['blue-silver-guest-permit']},
    'blue-silver-guest-permit':{name:'王者林地访客引荐'},'has-sea-vessel':{name:'远航船只'},
    'knows-sea-god-route':{name:'海神岛航线'},'sea-god-trial-active':{name:'海神试炼资格'},
    'hell-road-qualified':{name:'地狱路资格',locationId:'loc-slaughter-arena',instruction:'完成五场连续死斗'}
  });

  const SHOP_TEMPLATES = Object.freeze({
    'hunting-supply': {name: '猎魂森林入口·猎魂补给铺', buyMultiplier: 1, sellMultiplier: 0.48, infinite: true, stock: [['bandage', 1], ['basic-soul-tonic', 1], ['rope', 1], ['antidote-pill', 1], ['dagger-hunting', 1]]}
  });

  function emptyWorldState(seed = 'soul-cycle-world-1') {
    return {
      世界: {characterSources:[],seed: clean(seed, 'soul-cycle-world-1'), 时间: {day: 1, hour: 8, minute: 0}, backgroundBattles: {}, counters: {entity: 0, item: 0, container: 0, shop: 0, event: 0}, opening: {status: 'pending', committedTransactionId: ''}, processedTransactions: {}, 扩展: {}},
      人物: {列表: {}},
      物品: {实例: {}},
      容器: {列表: {}},
      装备: {配置: {}},
      钱包: {列表: {}},
      地图: {
        地点: clone(LOCATION_TEMPLATES), 路线: clone(ROUTE_TEMPLATES), 当前地点ID: 'loc-holy-soul-village',
        已知地点ID列表: clone(INITIAL_KNOWN_LOCATION_IDS), 已发现地点ID列表: ['loc-holy-soul-village'],
        扩展: {当前图层: 'world', 当前区域根节点ID: '', 路径模式: 'balanced', flags: []}
      },
      商店: {列表: {}},
      交易流水: {列表: []}
    };
  }

  function normalizeWorldCollections(state) {
    const defaults = emptyWorldState(state?.世界?.seed);
    for (const key of Object.keys(defaults)) state[key] = merge(defaults[key], plain(state[key]) ? state[key] : {});
    state.世界.processedTransactions = plain(state.世界.processedTransactions) ? state.世界.processedTransactions : {};
    state.人物.列表 = plain(state.人物.列表) ? state.人物.列表 : {};
    state.物品.实例 = plain(state.物品.实例) ? state.物品.实例 : {};
    state.容器.列表 = plain(state.容器.列表) ? state.容器.列表 : {};
    state.装备.配置 = plain(state.装备.配置) ? state.装备.配置 : {};
    state.钱包.列表 = plain(state.钱包.列表) ? state.钱包.列表 : {};
    state.商店.列表 = plain(state.商店.列表) ? state.商店.列表 : {};
    state.交易流水.列表 = Array.isArray(state.交易流水.列表) ? state.交易流水.列表.slice(-100) : [];
    state.战利品 ??= {列表: {}};
    state.战利品.列表 = plain(state.战利品.列表) ? state.战利品.列表 : {};
    state.战利品.遗骸列表 = plain(state.战利品.遗骸列表) ? state.战利品.遗骸列表 : {};
    state.地图.地点 = clone(LOCATION_TEMPLATES);
    if(state.世界.scenarioId===globalThis.SoulEvolutionContent?.SCENARIO){
      Object.assign(state.地图.地点['loc-lanba-academy'],{name:'蓝霸学院',summary:'蓝霸学院重聚初期，旧友与史莱克师生在此安顿，学院尚未更名。'});
      state.地图.地点['loc-lanba-campus'].name='蓝霸学院校区';
    }
    state.地图.路线 = clone(ROUTE_TEMPLATES);
    if (!LOCATION_TEMPLATES[state.地图.当前地点ID]) state.地图.当前地点ID = 'loc-holy-soul-village';
    state.地图.已知地点ID列表 = list(state.地图.已知地点ID列表).filter(id => Boolean(LOCATION_TEMPLATES[id]));
    if (!state.地图.已知地点ID列表.length) state.地图.已知地点ID列表 = clone(INITIAL_KNOWN_LOCATION_IDS);
    state.地图.已发现地点ID列表 = list(state.地图.已发现地点ID列表).filter(id => Boolean(LOCATION_TEMPLATES[id]));
    state.地图.已发现地点ID列表 = addUnique(state.地图.已发现地点ID列表, state.地图.当前地点ID);
    state.地图.已知地点ID列表 = addUnique(state.地图.已知地点ID列表, state.地图.当前地点ID);
    state.地图.扩展 = plain(state.地图.扩展) ? state.地图.扩展 : {};
    state.地图.扩展.flags = list(state.地图.扩展.flags);
    state.地图.扩展.路径模式 = ['balanced','fastest','cheapest'].includes(state.地图.扩展.路径模式) ? state.地图.扩展.路径模式 : 'balanced';
    state.系统.schema_version = VERSION;
    state.系统.ruleset_version = VERSION;
    return state;
  }

  function normalizeState(raw){return normalizeWorld(raw,false);}
  function normalizeWorld(raw,owned) {
    const state = normalizeWorldCollections(owned?foundation.normalizeOwnedState(raw):foundation.normalizeState(raw));
    refreshAllEquipment(state,false);
    return state;
  }

  function makeInitialState(seed = 'soul-cycle-world-1') {
    // Direct rule consumers must load the same preset growth catalogue as the bundled game.
    if(!globalThis.SoulCanonArenaEngine&&typeof require==='function')require('./canon-arena-engine.js');
    const state = normalizeWorldCollections(foundation.makeDefaultState());
    state.世界.seed = clean(seed, 'soul-cycle-world-1');
    sealing.initialize(state);poison.initialize(state);
    state.场景 = {...state.场景, 章节: '序章', 地点: '圣魂村', 时间: storyCalendarDate(state).label, 状态: '等待创建角色'};
    state.扩展.初始快照 = {version: VERSION, blankCard: true};
    return state;
  }

  function nextId(state, kind) {
    const key = kind === 'entity' ? 'entity' : kind === 'item' ? 'item' : kind === 'container' ? 'container' : kind === 'shop' ? 'shop' : 'event';
    state.世界.counters[key] = integer(state.世界.counters[key], 0) + 1;
    return `${kind}-${String(state.世界.counters[key]).padStart(6, '0')}`;
  }

  function transactionStart(rawState, transactionId, type, prepareDraft=normalizeState) {
    const state = prepareDraft(rawState);
    const id = clean(transactionId);
    if (!id) throw new Error(`${type}缺少事务ID`);
    const prior = state.世界.processedTransactions[id];
    if (prior) return {state, id, duplicate: true, receipt: clone(prior)};
    return {state, id, duplicate: false};
  }

  function commit(state, transactionId, type, receipt) {
    globalThis.SoulManifestation.reconcile(state);
    globalThis.SoulResidentRealms.reconcile(state);globalThis.SoulCombatDeployments.reconcile(state);globalThis.SoulPerformanceAgreements.advanceAt(state);poison.syncResidents(state);refreshTravelsAt(state,people.now(state),{});
    combat.pruneMaintenance(state);
    custody.reconcileDeaths(state);globalThis.SoulRealmArrangements?.reconcile?.(state);globalThis.SoulPersonShame?.advanceAt?.(state);
    social.advanceAt(state,people.now(state));gifts.advanceAt(state);globalThis.SoulPersonContracts.advanceAt(state);market.advanceAt(state);sealing.advanceAt(state);auction.advanceAt(state);publicAuction.advanceAt(state);commerceMessages.advanceAt(state);rescue.discover(state);cooperation.reconcile(state);preparations.reconcile(state);
    const finalReceipt = {...clone(receipt), id: transactionId, transactionType: type};
    state.世界.processedTransactions[transactionId] = clone(finalReceipt);
    const ids = Object.keys(state.世界.processedTransactions);
    for (const id of ids.slice(0, Math.max(0, ids.length - 100))) delete state.世界.processedTransactions[id];
    state.系统.revision = integer(state.系统.revision, 0) + 1;
    state.系统.last_transaction_id = transactionId;
    state.事务 = {id: transactionId, 类型: foundation.TRANSACTION_TYPES.includes(type) ? type : '无', 状态: '已结算', 请求提交: false, 提案: {}, 结算: clone(finalReceipt)};
    state.历史.push({type: 'world-transaction', transactionId, transactionType: type, summary: clean(finalReceipt.summary)});
    state.历史 = state.历史.slice(-50);
    return {state, receipt: finalReceipt, idempotent: false};
  }

  function ensurePossessionShell(state, entityId) {
    const person = state.人物.列表[entityId];
    const walletId = person?.walletId || `wallet-${entityId}`;
    const containerId = person?.inventoryContainerId || `container-${entityId}-inventory`;
    state.钱包.列表[walletId] ??= {id: walletId, ownerEntityId: entityId, gold: 0, 扩展: {}};
    state.容器.列表[containerId] ??= {id: containerId, type: 'inventory', ownerEntityId: entityId, locationId: person?.locationId ?? state.地图.当前地点ID, itemIds: [], capacity: {infinite: true}, status: 'active', 扩展: {}};
    state.装备.配置[entityId] ??= {entityId, slots: Object.fromEntries(EQUIPMENT_SLOTS.map(slot => [slot, ''])), soulBoneSlots: Object.fromEntries(SOUL_BONE_SLOTS.map(slot => [slot, ''])), appliedModifiers: {attributes: {}, resistances: []}, 扩展: {}};
    if (person) {
      person.walletId = walletId;
      person.inventoryContainerId = containerId;
      person.equipmentConfigId = entityId;
    }
    if(!person&&state.战斗单位?.列表?.[entityId])state.战斗单位.列表[entityId].扩展.possessions={walletId,inventoryContainerId:containerId,equipmentConfigId:entityId};
    return {walletId, containerId, equipmentConfigId: entityId};
  }

  function itemTemplate(templateId) {
    const template = ITEM_TEMPLATES[templateId];
    if (!template) throw new Error(`未知物品模板：${templateId}`);
    return template;
  }

  function calculateItemValue(itemOrTemplate) {
    const template = typeof itemOrTemplate === 'string' ? itemTemplate(itemOrTemplate) : itemTemplate(itemOrTemplate.templateId);
    const payload = typeof itemOrTemplate === 'string' ? {} : itemOrTemplate.payload ?? {};
    const book=template.payload?.blueprintBook;
    if(book){const entry=presets.get(book.presetId);if(!entry)throw Error('预设图纸目录不存在');return Math.max(100,Math.ceil(calculateItemValue(entry.recipe.templateId)*.4));}
    if(payload.host!==undefined)return globalThis.SoulHostPricing.quotePayload(template.id??(typeof itemOrTemplate==='string'?itemOrTemplate:itemOrTemplate.templateId),payload).valueGold;
    if(payload.backgroundRestraint){let value=backgroundItems.compile(payload.backgroundRestraint.definition).priceGold;if(payload.activeSkill){const c=effects.validateGraph(payload.activeSkill.effectGraph,{ageTier:payload.activeSkill.ageTier??'十万年',mechanismCap:payload.activeSkill.mechanismCap??'规则'});if(!c.pass)throw Error(c.errors.join('；'));value+=c.spent*20;}return value;}
    if(template.type==='魂环'&&payload.ringSource)return assets.ringValue(itemOrTemplate);
    const modifiers = merge(template.modifiers ?? {}, payload.modifiers ?? {});
    if(template.type==='魂导器'){
      const graph=payload.passiveEffectGraph??template.passiveEffectGraph;
      if(Object.keys(payload.passiveCombat??{}).length)throw new Error('装备加成必须使用已登记的常驻效果图');
      const active=payload.activeSkill??template.activeSkill;
      let value=graph||Object.keys(modifiers.attributes??{}).length?priceEquipment(graph,modifiers).spent*5:0;
      if(active){const check=effects.validateGraph(active.effectGraph??effects.makeLinearGraph(active.effectSpecs),{ageTier:active.ageTier??'十万年',mechanismCap:active.mechanismCap??'规则'});if(!check.pass)throw Error(check.errors.join('；'));value+=check.spent*20;}
      if(!value)throw Error('魂导器缺少实际能力');return value;
    }
    return integer(template.basePrice??0,0);
  }

  function previewItemPlacement(state, containerId, options = {}) {
    const container = state.容器.列表[containerId];
    if (!container) throw new Error('没有可收纳物品的行囊');
    const template = itemTemplate(options.templateId);
    const liveSeal=options.transferItemId&&sealing.byItem(state,options.transferItemId);
    if(liveSeal&&(container.扩展?.spatial||container.扩展?.spaceStorage||!['inventory','corpse','auction-warehouse','location-stash'].includes(container.type)||sealing.active(state,container.ownerEntityId)))throw new Error('活体封神台只能实际携行、现场暂存或保管，禁止空间收纳与生命容器嵌套');
    const ownerId=clean(options.ownerEntityId,container.ownerEntityId),legalOwnerId=clean(options.legalOwnerEntityId,ownerId);
    const existing = !options.transferItemId && template.stackable && !options.payload?.poisonServing && options.forceUnique !== true && !clean(options.boundToEntityId)
      ? container.itemIds.map(id => state.物品.实例[id]).find(item => item?.templateId === options.templateId
        && item.condition === clean(options.condition, '完好') && !item.boundToEntityId
        && item.ownerEntityId===ownerId && item.legalOwnerEntityId===legalOwnerId && item.stolen===Boolean(options.stolen)
        && !item.payload?.poisonServing && clean(item.payload?.blueprintId) === clean(options.payload?.blueprintId)) : null;
    const sameContainer = options.transferItemId && container.itemIds.includes(options.transferItemId);
    const requiredSlots = existing || sameContainer ? 0 : integer(options.distinctItems ?? 1, 1);
    const occupiedSlots = container.itemIds.filter(id=>!state.物品.实例[id]?.扩展?.integrated).length;
    const freeSlots = container.capacity?.infinite ? Number.MAX_SAFE_INTEGER : Math.max(0, integer(container.capacity?.slots ?? 40, 0) - occupiedSlots);
    return {pass:requiredSlots <= freeSlots,containerId,occupiedSlots,freeSlots,requiredSlots,mergeItemId:existing?.id ?? '',message:requiredSlots <= freeSlots ? '' : `行囊空间不足，需要${requiredSlots}个空位，当前有${freeSlots}个`};
  }

  function storageRoom(state, position) {
    if(position?.kind!=='location'||!position.sceneId)return null;
    for(const facility of state.世界?.custody?.facilities??[]){
      if(facility.locationId!==position.locationId||facility.status!=='active')continue;
      const index=facility.cells.findIndex(cell=>cell.spaceId===position.sceneId);
      if(index>=0)return {facility,cell:facility.cells[index],index};
    }
    return null;
  }

  function assertStoragePosition(state, position) {
    if(position?.kind!=='location'||!state.地图.地点[position.locationId])throw Error('须在实际地点存取暂存物品，不能在途中或容纳器内办理');
    if(typeof position.sceneId!=='string'||position.sceneId&&!storageRoom(state,position))throw Error('当前独立场景不支持暂存物品，请回到公共区域或实际房间');
  }

  function containerStoragePosition(state, container) {
    if(container?.type!=='location-stash')throw Error('这不是个人地点暂存处');
    const extension=container.扩展??{},position={kind:'location',locationId:container.locationId,sceneId:extension.spaceId??''};
    if(extension.scenePosition){
      const recorded=extension.scenePosition;
      if(recorded.kind!=='location'||recorded.locationId!==position.locationId||typeof recorded.sceneId!=='string'||extension.spaceId!==undefined&&recorded.sceneId!==extension.spaceId)throw Error('暂存容器的实际场景不一致');
      position.sceneId=recorded.sceneId;
    }
    assertStoragePosition(state,position);
    return position;
  }

  function itemStoragePosition(state, itemId) { return sealing.itemPosition(state,itemId); }

  function storagePositionFacts(state, position) {
    const locationId=position?.locationId??'',sceneId=position?.sceneId??'',room=storageRoom(state,position);
    const locationName=state.地图?.地点?.[locationId]?.name??LOCATION_TEMPLATES[locationId]?.name??'暂存地点';
    const sceneName=room?`${room.facility.name} · ${room.cell.name??'囚室'+(room.index+1)}`:sceneId?'独立场景':'公共区域';
    return {locationId,sceneId,locationName,sceneName,positionLabel:`${locationName} · ${sceneName}`};
  }

  function ensureLocationStash(state, ownerEntityId, locationId, spaceId = '') {
    const position={kind:'location',locationId,sceneId:spaceId};assertStoragePosition(state,position);
    const id = `container-${ownerEntityId}-stash-${locationId}${spaceId?'-room-'+encodeURIComponent(spaceId):''}`;
    state.容器.列表[id] ??= {id,type:'location-stash',ownerEntityId,locationId,itemIds:[],capacity:{infinite:true},status:'active',扩展:spaceId?{spaceId}:{}};
    const container=state.容器.列表[id];
    if(container.ownerEntityId!==ownerEntityId||!globalThis.SoulScenePosition.sameScene(containerStoragePosition(state,container),position))throw Error('暂存处与物主或实际房间不一致');
    return container;
  }

  function storeItem(state, itemId, ownerEntityId, locationId) {
    if(state.物品.实例[itemId]?.payload?.ringPreparation)throw new Error('请先完成这枚魂环的魂技选择');
    const stash = ensureLocationStash(state,ownerEntityId,locationId);
    const item = transferItem(state,itemId,stash.id);
    item.payload.storedAtLocationId = locationId;
    return item;
  }

  function sceneActionActor(state,actorId,allowExpedition=false,executionContext,preparationIntent) {
    const id=clean(actorId,state.角色.主控单位ID);
    const selfBreak=preparationIntent?.type==='break-restraint'&&id===state.角色.主控单位ID&&['actorId','entityId'].every(key=>!preparationIntent[key]||preparationIntent[key]===id)&&controls.breakable(state,id).some(status=>!preparationIntent.statusId||status.id===preparationIntent.statusId);
    const insideBreak=selfBreak&&sealing.isAwakeContained(state,id);
    actions.resolve(state,{actorId:id,battleId:null,...(insideBreak?{containmentAction:'struggle',requirements:[]}:{})});
    const allowCaptivity=selfBreak||['dismiss-disguise','inspect-disguise','disclose-identity'].includes(preparationIntent?.type)||fieldControl.allowed(state,executionContext,id)||allowExpedition&&cooperation.preparationAllowed(state,id,preparationIntent);
    const block=worldActionBlockReason(state,{actorId:id,allowCaptivity,allowContained:insideBreak,...(allowExpedition?{allowActivities:['expedition']}:{})});
    if(block)throw Error(block);
    return state.人物.列表[id];
  }

  function quoteStoredItem(state, options, retrieve=false) {
    const actor=sceneActionActor(state,options.actorId),item=state.物品.实例[clean(options.itemId)],source=state.容器.列表[item?.containerId];
    const position=actions.positionOf(state,actor.id);assertStoragePosition(state,position);
    const quantity=options.quantity??item?.quantity;
    if(!item||item.ownerEntityId!==actor.id||!source||!source.itemIds.includes(item.id)||!Number.isSafeInteger(quantity)||quantity<1||quantity>item.quantity)throw Error('物品须由行动者持有，数量必须是现有的正整数');
    if(retrieve){
      if(source.type!=='location-stash'||source.ownerEntityId!==actor.id)throw Error('只能取回自己的个人暂存物品');
      if(item.扩展?.slaughterTemporary)throw Error('完成本轮杀戮场后可领取');
      const storedPosition=containerStoragePosition(state,source),storedFacts=storagePositionFacts(state,storedPosition);
      if(!globalThis.SoulScenePosition.sameScene(storedPosition,position))throw Error(storedPosition.sceneId?`须实际到${storedFacts.positionLabel}领取，不能跨房间取物`:`须先实际回到${storedFacts.locationName}的公共通道领取暂存物品，不能跨房间取物`);
    }else{
      if(!isCarriedItem(state,item,actor.id))throw Error('只能暂存实际随身携带的物品');
      if(item.payload?.ringPreparation)throw Error('请先完成这枚魂环的魂技选择');
      if(Object.values(state.装备?.配置?.[actor.id]?.slots??{}).includes(item.id))throw Error('请先卸下装备，再暂存物品');
    }
    if(retrieve){const placement=previewItemPlacement(state,actor.inventoryContainerId,{templateId:item.templateId,transferItemId:item.id});if(!placement.pass)throw Error(placement.message);}
    return {actorId:actor.id,itemId:item.id,quantity,fromContainerId:source.id,position:clone(position),...storagePositionFacts(state,position)};
  }

  function itemStorageAvailability(state, options, retrieve=false) {
    try{return {available:true,reason:'',...quoteStoredItem(state,options,retrieve)};}catch(error){return {available:false,reason:error.message};}
  }

  function moveStoredItem(rawState,options,transactionId,retrieve=false) {
    const guard=transactionStart(rawState,transactionId,retrieve?'取回暂存物品':'暂存物品');
    if(guard.duplicate)return {state:guard.state,receipt:guard.receipt,idempotent:true};
    const state=guard.state;
    if(!Number.isSafeInteger(options.quantity)||options.quantity<1)throw Error('数量必须是现有的正整数');
    const quote=quoteStoredItem(state,options,retrieve),actor=state.人物.列表[quote.actorId],item=state.物品.实例[quote.itemId],source=state.容器.列表[quote.fromContainerId],quantity=quote.quantity;
    const destination=retrieve?state.容器.列表[actor.inventoryContainerId]:ensureLocationStash(state,actor.id,quote.locationId,quote.sceneId);
    const moved=transferItem(state,item.id,destination.id,quantity);
    if(retrieve){
      delete moved.payload.storedAtLocationId;delete moved.payload.entranceStash;
      if(Array.isArray(state.材料库?.入口暂存物品ID列表))state.材料库.入口暂存物品ID列表=state.材料库.入口暂存物品ID列表.filter(id=>id!==moved.id);
    }else moved.payload.storedAtLocationId=actor.locationId;
    return commit(state,transactionId,retrieve?'取回暂存物品':'暂存物品',{type:retrieve?'item-retrieved':'item-stored',actorId:actor.id,itemId:moved.id,originalItemId:options.itemId,name:moved.name,quantity,fromContainerId:source.id,toContainerId:destination.id,position:quote.position,...storagePositionFacts(state,quote.position),legalOwnerEntityId:moved.legalOwnerEntityId,storageKind:'personal-location-stash',custodianId:null,
      summary:`${actor.name}${retrieve?'从':'在'}${quote.positionLabel}${retrieve?'取回':'放下暂存'}${quantity}件${moved.name}；合法所有权未改变。`});
  }

  function createItem(state, templateId, ownerEntityId, containerId, options = {}) {
    const template = itemTemplate(templateId);
    if(options.payload?.host!==undefined&&!globalThis.SoulHostCore?.sourceAllowed(state,{...options,templateId,type:options.type??template.type},true))throw Error('宿主能力需要真实模板或制造来源');
    const paidHostSource=!!options.payload?.host&&globalThis.SoulHostCore.sourceAllowed(state,{...options,templateId,type:options.type??template.type},true);
    if((template.type==='拘束器'||options.payload?.backgroundRestraint)&&options.payload?.activeSkill&&!paidHostSource&&!globalThis.SoulOpeningWorkshop?.isItemAuthorized(state,{templateId,payload:options.payload,provenance:options.provenance})&&!globalThis.SoulPaidDesign?.isItemSource(state,{...options,templateId,type:options.type??template.type},true))throw Error('拘束器附加能力需要真实制造合同');
    if(template.type==='魂导器'){
      const payload=options.payload??{};
      if(template.attackProfile||payload.activeSkills?.length||payload.attackProfile)throw new Error('魂导器只登记完整的单项能力合同');
      const active=payload.activeSkill??template.activeSkill;
      const activeGraph=active?(active.effectGraph??effects.makeLinearGraph(active.effectSpecs)):null;
      const workshop=!!globalThis.SoulOpeningWorkshop?.isItemAuthorized(state,{templateId,payload,provenance:options.provenance})||!!globalThis.SoulPaidDesign?.isItemSource(state,{...options,templateId,type:options.type??template.type},true);
      if(active){if((workshop?!(Number.isSafeInteger(active.soulPowerCost)&&active.soulPowerCost>=0&&Number.isSafeInteger(active.durabilityCost)&&active.durabilityCost>=0):!abilities.activeDeviceGraph(activeGraph,{fixedForm:payload.fixedForm??template.fixedForm})||!(active.soulPowerCost>0)||!(active.durabilityCost>0))||!effects.validateGraph(activeGraph,{ageTier:active.ageTier??'十万年',mechanismCap:active.mechanismCap??'规则'}).pass)throw Error('主动魂导器须有合法效果与明确费用，通用制造需真实工坊来源');}
      const graph=payload.passiveEffectGraph??template.passiveEffectGraph;
      if(graph&&(!effects.validateGraph(graph,{ageTier:'十万年',mechanismCap:'规则'}).pass||effects.skillActivation(graph)!=='passive'))throw new Error('装备只能登记合法的常驻被动');
      const shape={sourceKind:active?'soul-device':undefined,effectGraph:activeGraph??graph,modifiers:merge(template.modifiers??{},payload.modifiers??{}),equipmentKind:payload.equipmentKind??template.equipmentKind??'自动',fixedForm:payload.fixedForm??template.fixedForm,openingWorkshop:workshop};
      if(graph||Object.keys(shape.modifiers.attributes??{}).length)priceEquipment(graph,shape.modifiers);else if(!active&&!payload.host)throw Error('魂导器缺少实际能力');
      if(Object.keys(payload.passiveCombat??{}).length)throw new Error('装备加成必须使用已登记的常驻效果图');
      if(!workshop&&options.valuePoints!==undefined&&options.valuePoints!==calculateItemValue({templateId,payload}))throw new Error('装备价值与实际付费能力不符');
      if(foundation.EQUIPMENT_AFFIXES.classes(shape,effects.calculateNodeCost).total>0){
        if(!shape.fixedForm)shape.fixedForm=foundation.EQUIPMENT_AFFIXES.assignForms([shape],[],effects.calculateNodeCost,options.name??template.name)?.[0]?.fixedForm;
        if(!foundation.EQUIPMENT_AFFIXES.validateForm(shape,effects.calculateNodeCost))throw new Error('装备的器型与实际攻击、防御能力不符');
        options={...options,payload:{...payload,equipmentKind:shape.equipmentKind,fixedForm:clone(shape.fixedForm)}};
      }
    }
    const preset=presets?.get(templateId);
    if(preset&&['魂导器','暗器','丹药','毒药','拘束器'].includes(preset.category))options={...options,payload:{presetId:preset.id,artId:preset.artId,...options.payload}};
    let container = state.容器.列表[containerId];
    if (!container) throw new Error(`物品目标容器不存在：${containerId}`);
    const quantity = integer(options.quantity ?? 1, 1, 999999);
    let placement = previewItemPlacement(state,containerId,{...options,templateId,ownerEntityId});
    if (!placement.pass) throw new Error(placement.message);
    if (placement.mergeItemId) {
      const existing = state.物品.实例[placement.mergeItemId];
      existing.quantity += quantity;
      if (state.技能?.列表 && state.战斗单位?.列表) syncItemGrantedActions(state);
      return existing;
    }
    const id = clean(options.id, nextId(state, 'item'));
    if (state.物品.实例[id]) throw new Error(`重复物品ID：${id}`);
    const item = {
      id, templateId, name: clean(options.name, template.name), type: clean(options.type, template.type), ownerEntityId: clean(ownerEntityId), containerId,
      quantity, quality: clean(options.quality, '普通'), condition: clean(options.condition, '完好'), durability: integer(options.durability ?? 100, 0, 100),
      provenance: clone(options.provenance ?? {type: 'generated'}), boundToEntityId: clean(options.boundToEntityId), legalOwnerEntityId: clean(options.legalOwnerEntityId, ownerEntityId), stolen: Boolean(options.stolen),
      payload: merge({...template.payload,...(template.modifiers ? {modifiers:clone(template.modifiers)} : {}),...(template.passiveEffectGraph ? {passiveEffectGraph:clone(template.passiveEffectGraph)} : {})}, options.payload ?? {}), valuePoints: integer(options.valuePoints ?? calculateItemValue({templateId, payload: options.payload}), 0),
      扩展: merge({combatState: {cooldownRemaining: 0}, maxDurability: integer(template.maxDurability ?? 100, 1, 100)}, options.扩展 ?? {})
    };
    item.durability = integer(options.durability ?? template.maxDurability ?? 100, 0, item.扩展.maxDurability);
    const definitionHash=itemAbilityFingerprint(item);if(definitionHash)item.扩展.abilityDefinitionHash=definitionHash;
    state.物品.实例[id] = item;
    if(item.templateId==='seal-platform')sealing.registerItem(state,item);
    container.itemIds = addUnique(container.itemIds, id);
    if (state.技能?.列表 && state.战斗单位?.列表) syncItemGrantedActions(state);
    return item;
  }

  function transferItem(state, itemId, destinationContainerId, quantityInput, authorization = {}) {
    if(state.物品.实例[itemId]?.扩展?.auctionLotId&&authorization.auctionId!==state.物品.实例[itemId].扩展.auctionLotId)throw Error('委托拍品正在实际仓库托管，不能从其他入口转移');
    const item = state.物品.实例[itemId];
    const destination = state.容器.列表[destinationContainerId];
    if (!item || !destination) throw new Error('物品或目标容器不存在');
    if(item.attachment)throw Error('佩戴中的拘束器必须先经实际控制权限拆除');
    if(item.扩展?.integrated)throw new Error('已融合的魂骨不能作为随身物品移动');
    if(item.payload?.ringPreparation)throw new Error('请先完成这枚魂环的魂技选择');
    if (item.boundToEntityId && destination.ownerEntityId !== item.boundToEntityId) throw new Error('绑定物品不能转移给其他角色');
    const source = state.容器.列表[item.containerId];
    if (!source || !source.itemIds.includes(item.id)) throw new Error('物品所有权链损坏');
    if(source.type==='expedition-loot'&&!globalThis.SoulExpeditionLoot?.directItemAuthorization(state,item,destination,quantityInput,authorization)){
      const resolutions=state.远征?.扩展?.lootResolutions??[],r=resolutions.find(r=>r.id===authorization.lootResolutionId),actorId=authorization.actorId;
      const signed=r?.terms?.participants?.filter(id=>id!==r.proposerId).every(id=>(state.人物.列表[id]?.扩展?.社交约定??[]).some(c=>c.id===r.signatures[id]&&c.playerId===r.proposerId&&c.personId===id&&c.kind==='loot-resolution'&&c.resolutionId===r.id&&c.status==='completed'&&JSON.stringify(c.terms)===JSON.stringify(r.terms)));
      const position=state.人物.列表[actorId]?actions.positionOf(state,actorId):null;
      const latest=resolutions.filter(v=>v.terms.allocationId===r?.terms.allocationId&&v.terms.resourceKind===r?.terms.resourceKind&&v.terms.resourceId===r?.terms.resourceId).at(-1);
      if(r?.status!=='agreed'||latest!==r||!r.terms.participants.includes(actorId)||r.terms.resourceKind!=='item'||r.terms.resourceId!==item.id||r.terms.allocationId!==source.扩展?.allocationId||r.terms.quantity!==item.quantity||quantityInput!==item.quantity||r.terms.recipientId!==destination.ownerEntityId||r.terms.locationId!==source.locationId||position?.kind!=='location'||position.sceneId||position.locationId!==source.locationId||!signed)throw new Error('这件收获仍待共同协商分配，不能单方面转移或使用');
      actions.resolve(state,{actorId,battleId:null,targetIds:[r.terms.recipientId],requirements:['gesture']});people.assertAlive(state,r.terms.recipientId);
      if([actorId,r.terms.recipientId].some(id=>controls.active(state,id).some(v=>['status.sleep','status.stun'].includes(v.模板ID))))throw Error('交付双方当前无法清醒领取');
    }
    const placement = previewItemPlacement(state,destinationContainerId,{templateId:item.templateId,transferItemId:item.id});
    if (!placement.pass) throw new Error(placement.message);
    const quantity = integer(quantityInput ?? item.quantity, 1, item.quantity);
    if(item.payload?.poisonServing&&(quantity!==1||item.quantity!==1))throw Error('受污染的独立一份食物不能拆分复制');
    if (itemTemplate(item.templateId).stackable && quantity < item.quantity) {
      const before=clone(item);
      item.quantity -= quantity;
      const split = createItem(state, item.templateId, destination.ownerEntityId, destination.id, {...item, id: '', quantity, provenance: {...item.provenance, splitFrom: item.id}, forceUnique: true});
      globalThis.SoulPaidDesign?.registerSplit(state,before,split);
      syncItemGrantedActions(state);
      return split;
    }
    source.itemIds = removeFrom(source.itemIds, item.id);
    destination.itemIds = addUnique(destination.itemIds, item.id);
    item.containerId = destination.id;
    item.ownerEntityId = clean(destination.ownerEntityId);
    syncItemGrantedActions(state);
    return item;
  }

  function grantKit(state, entityId, kit, provenanceType = 'identity-kit') {
    const {containerId} = ensurePossessionShell(state, entityId);
    return (kit ?? []).map(([templateId, quantity]) => createItem(state, templateId, entityId, containerId, {quantity, provenance: {type: provenanceType, entityId}}).id);
  }

  function attributePreset(name) {
    const presets = {
      balanced: {力量: 13, 身法: 13, 体魄: 13, 悟性: 12, 感知: 12, 意志: 12},
      agile: {力量: 10, 身法: 15, 体魄: 13, 悟性: 12, 感知: 14, 意志: 10},
      power: {力量: 15, 身法: 11, 体魄: 14, 悟性: 10, 感知: 10, 意志: 13},
      mind: {力量: 9, 身法: 12, 体魄: 12, 悟性: 15, 感知: 14, 意志: 13}
    };
    return clone(presets[name] ?? presets.balanced);
  }

  function pointBuyCost(score) {
    return Number.isInteger(score)&&score>=1&&score<=99?(score<=13?score-8:score*2-21):Number.POSITIVE_INFINITY;
  }

  function creationPointLedger(draft = {}) {
    if(draft.background)return backgrounds.ledger(draft,creationPointLedger({...draft,background:undefined,identityId:'civilian',difficulty:draft.background.id==='sealed-titled'||backgrounds.policy(draft.background).canonical?'unlimited':draft.difficulty}));
    const unlimited=draft.difficulty==='unlimited',wide=unlimited||draft.background?.id==='sealed-titled';
    const attributes = Object.fromEntries(foundation.ATTRIBUTE_KEYS.map(key => [key, integer(draft?.attributes?.[key] ?? CREATION_RULES.attributeBaseline, wide?1:CREATION_RULES.attributeMinimum, wide?99:CREATION_RULES.attributeMaximum)]));
    const attributeRows = foundation.ATTRIBUTE_KEYS.map(key => {
      const score = attributes[key];
      const cost = pointBuyCost(score);
      const increaseCost = score < (wide?99:CREATION_RULES.attributeMaximum) ? pointBuyCost(score + 1) - cost : 0;
      const refund = score > (wide?1:CREATION_RULES.attributeMinimum) ? cost - pointBuyCost(score - 1) : 0;
      return {key, score, cost, increaseCost, refund};
    });
    const attributeCost = attributeRows.reduce((sum,item)=>sum+Math.max(0,item.cost),0);
    const attributeRefund = attributeRows.reduce((sum,item)=>sum+Math.max(0,-item.cost),0);
    const situations=talents.inspectSituations(draft.situations);
    const total = unlimited?9999:CREATION_RULES.totalPoints + attributeRefund + (situations.pass?situations.pointBonus:0);
    const level = CREATION_RULES.startingLevel;
    const opening = talents.inspectSelection(draft.opening);
    const identityId = IDENTITY_ARCHETYPES[draft?.identityId] ? draft.identityId : '';
    const identityCost = CREATION_RULES.identityCosts[identityId] ?? 0;
    const nonSoulCost = attributeCost + identityCost + opening.talentCost + opening.opportunityCost;
    const martialSoulDrafts = Array.isArray(draft?.martialSoulDrafts)
      ? draft.martialSoulDrafts.filter(plain)
      : plain(draft?.martialSoulDraft) ? [draft.martialSoulDraft] : [];
    const requestedSoulCount = Number(draft?.martialSoulCount ?? (martialSoulDrafts.length || 1));
    const martialSoulCount = integer(requestedSoulCount, CREATION_RULES.martialSoulMinimum, CREATION_RULES.martialSoulMaximum);
    const extraSoulSlots = Math.max(0, martialSoulCount - 1);
    const extraSoulSlotCost = extraSoulSlots * CREATION_RULES.extraSoulSlotCost;
    const soulBudget = Math.max(0, total - nonSoulCost - extraSoulSlotCost);
    const soulInspections = martialSoulDrafts.map(item => foundation.MARTIAL_SOUL_CORE.inspectDraft(item, {budget: total}));
    const soulCosts = soulInspections.map(item => item?.pricing?.total ?? 0);
    const soulCost = soulCosts.reduce((sum, cost) => sum + cost, 0);
    const spent = nonSoulCost + extraSoulSlotCost + soulCost;
    return {
      total, baseTotal:unlimited?9999:CREATION_RULES.totalPoints, attributeRefund:unlimited?0:attributeRefund, situationBonus:unlimited?0:situations.pass?situations.pointBonus:0, situationErrors:situations.errors,
      spent,
      remaining: total - spent,
      overBudget: Math.max(0, spent - total),
      soulBudget,
      costs: {attributes:attributeCost,identity:identityCost,martialSouls:soulCost,extraSoulSlots:extraSoulSlotCost,talents:opening.talentCost,opportunities:opening.opportunityCost},
      attributes,
      attributeRows,
      level,
      identityId,
      martialSoulCount,
      extraSoulSlots,
      soulCosts,
      soulInspections: clone(soulInspections),
      soulInspection: soulInspections[0] ? clone(soulInspections[0]) : null
    };
  }

  function normalizeAvatarReference(source, errors = []) {
    if (source === undefined || source === null || source === '') return null;
    if (!plain(source) || Object.hasOwn(source, 'dataUrl') || Object.hasOwn(source, 'data')) {
      errors.push('头像引用不合法，图片正文不能写入角色状态');
      return null;
    }
    const descriptor = {
      version: Number(source.version), assetId: clean(source.assetId), mimeType: clean(source.mimeType).toLowerCase(),
      width: Number(source.width), height: Number(source.height), byteLength: Number(source.byteLength), checksum: clean(source.checksum).toUpperCase()
    };
    const valid = descriptor.version === 1 && /^avatar-[A-F0-9]{8}-\d{1,6}$/.test(descriptor.assetId) &&
      ['image/png','image/jpeg','image/webp'].includes(descriptor.mimeType) && descriptor.width === 256 && descriptor.height === 256 &&
      Number.isInteger(descriptor.byteLength) && descriptor.byteLength > 0 && descriptor.byteLength <= 128 * 1024 &&
      /^[A-F0-9]{8}$/.test(descriptor.checksum) && descriptor.assetId === `avatar-${descriptor.checksum}-${descriptor.byteLength}`;
    if (!valid) {
      errors.push('头像引用不合法或已损坏');
      return null;
    }
    return descriptor;
  }

  function validateCreationDraft(draft) {
    if(draft?.background){const result=backgrounds.validateDraft(draft,v=>validateCreationDraft(v)),q=globalThis.SoulOpeningWorkshop?.quote(draft);if(q&&!q.pass){result.errors.push(...q.errors);result.pass=false;}return result;}
    const mode = ['awakening', 'standard', 'random', 'sandbox'].includes(draft?.mode) ? draft.mode : 'awakening';
    const errors = [];
    const name = clean(draft?.name).slice(0, 20);
    if (!name) errors.push('姓名不能为空');
    const age = integer(draft?.age ?? 12, 6, 120);
    if(draft?.age!==undefined&&(!Number.isInteger(draft.age)||draft.age<6||draft.age>120))errors.push('人物年龄必须是6至120之间的整数');
    const level = mode === 'awakening' ? CREATION_RULES.startingLevel : integer(draft?.level ?? 1,1,99);
    if (mode === 'standard' && level > 20) errors.push('标准模式开局魂力等级不能超过20');
    if(mode==='awakening'&&Object.hasOwn(draft,'level'))errors.push('当前角色方案不支持选择起始等级，请使用新版方案');
    const opening=mode==='awakening'?talents.inspectSelection(draft?.opening):talents.inspectSelection(talents.emptySelection());
    errors.push(...opening.errors);
    const situations=talents.inspectSituations(draft?.situations);errors.push(...situations.errors);
    if(mode!=='awakening'&&situations.pointBonus)errors.push('非造化点创建模式不能选择处境点数收益');
    const gender = clean(draft?.gender);
    if (mode === 'awakening' && !['男', '女'].includes(gender)) errors.push('性别只能选择男或女');
    const identityId = IDENTITY_ARCHETYPES[draft?.identityId] ? draft.identityId : mode === 'awakening' ? '' : 'academy-student';
    if (mode === 'awakening' && !identityId) errors.push('请选择一个开局来处');
    if(IDENTITY_ARCHETYPES[identityId]&&IDENTITY_ARCHETYPES[identityId].wallet+(opening.selection.opportunities.some(v=>v.kind==='starter-supplies')?talents.OPPORTUNITIES['starter-supplies'].gold:0)+situations.advanceTotal<situations.depositTotal)errors.push('开局盘缠不足以支付所选处境保证金，请调整选择');
    if(situations.selection.some(v=>v.contactName===name))errors.push('处境联系人不能与玩家同名');
    const avatar = normalizeAvatarReference(draft?.avatar, errors);
    const primarySoulId = MARTIAL_SOUL_TEMPLATES[draft?.primarySoulId] ? draft.primarySoulId : 'blue-silver-grass';
    const secondarySoulId = MARTIAL_SOUL_TEMPLATES[draft?.secondarySoulId] ? draft.secondarySoulId : '';
    const rawTemplateIds = Array.isArray(draft?.martialSoulTemplateIds)
      ? draft.martialSoulTemplateIds
      : [primarySoulId, secondarySoulId].filter(Boolean);
    const martialSoulTemplateIds = list(rawTemplateIds).filter(id => MARTIAL_SOUL_TEMPLATES[id]);
    if (mode === 'standard' && MARTIAL_SOUL_TEMPLATES[primarySoulId].品级 > 3) errors.push('标准模板模式不能直接选择顶级或神级武魂');
    if (mode !== 'awakening' && (martialSoulTemplateIds.length < CREATION_RULES.martialSoulMinimum || martialSoulTemplateIds.length > CREATION_RULES.martialSoulMaximum)) errors.push('模板创建必须选择1至3个武魂');
    if (mode !== 'awakening' && new Set(martialSoulTemplateIds.map(id => MARTIAL_SOUL_TEMPLATES[id].品级)).size > 1) errors.push('同一角色的多个模板武魂必须保持相同品级');
    let attributes = plain(draft?.attributes) ? Object.fromEntries(foundation.ATTRIBUTE_KEYS.map(key => [key, integer(draft.attributes[key] ?? 8, 1, 99)])) : attributePreset(draft?.attributePreset);
    if (mode === 'random') {
      const rng = makeRng(`creation:${name}:${age}:${primarySoulId}`);
      attributes = Object.fromEntries(foundation.ATTRIBUTE_KEYS.map(key => [key, rng.int(8, 15)]));
    }
    if (mode === 'standard') {
      const cost = Object.values(attributes).reduce((sum, score) => sum + pointBuyCost(score), 0);
      if (Object.values(attributes).some(score => score < 8 || score > 15) || cost > 27) errors.push('标准模式六维必须在8至15之间且不超过27点购点预算');
    }
    let ledger = null;
    let martialSoulDraft = null;
    let martialSoulDrafts = [];
    if (mode === 'awakening') {
      const rawScores = foundation.ATTRIBUTE_KEYS.map(key => Number(draft?.attributes?.[key]));
      const minimum=draft.difficulty==='unlimited'?1:CREATION_RULES.attributeMinimum,maximum=draft.difficulty==='unlimited'?99:CREATION_RULES.attributeMaximum;
      if (rawScores.some(score => !Number.isInteger(score) || score < minimum || score > maximum)) errors.push(`觉醒开卡六维必须是${minimum}至${maximum}之间的整数`);
      ledger = creationPointLedger(draft);
      attributes = ledger.attributes;
      martialSoulDrafts = Array.isArray(draft?.martialSoulDrafts)
        ? draft.martialSoulDrafts.filter(plain).map(clone)
        : plain(draft?.martialSoulDraft) ? [clone(draft.martialSoulDraft)] : [];
      martialSoulDraft = martialSoulDrafts[0] ?? null;
      const requestedSoulCount = Number(draft?.martialSoulCount ?? martialSoulDrafts.length);
      if (!Number.isInteger(requestedSoulCount) || requestedSoulCount < CREATION_RULES.martialSoulMinimum || requestedSoulCount > CREATION_RULES.martialSoulMaximum) errors.push('武魂数量必须是1至3');
      if (Number.isInteger(requestedSoulCount) && martialSoulDrafts.length !== requestedSoulCount) errors.push(`请完成全部${requestedSoulCount}个武魂的设定解析`);
      if (!clean(draft?.appearance)) errors.push('请描述角色外貌');
      if (martialSoulDrafts.length < CREATION_RULES.martialSoulMinimum || martialSoulDrafts.length > CREATION_RULES.martialSoulMaximum) errors.push('请完成1至3个武魂的设定解析');
      else {
        const compiledPreviews = [];
        for (const [index, inspection] of ledger.soulInspections.entries()) {
          if (inspection?.missing?.length || inspection?.ambiguities?.length || inspection?.conflicts?.length || inspection?.unsupported?.length || inspection?.overBudget) errors.push(`第${index + 1}武魂：${inspection.nextQuestion || '尚未通过代码审查'}`);
          else {
            try { compiledPreviews.push(foundation.MARTIAL_SOUL_CORE.finalizeDraft({...martialSoulDrafts[index], playerConfirmed: true}, {budget: ledger.total, id: `opening-soul-preview-${index + 1}`})); }
            catch (error) { errors.push(`第${index + 1}武魂：${clean(error?.message, '尚未通过代码终审')}`); }
          }
        }
        if (compiledPreviews.length === martialSoulDrafts.length && new Set(compiledPreviews.map(item => `${item.quality.value}:${item.quality.name}`)).size > 1) errors.push('同一角色的多个武魂必须保持相同品级');
      }
      if (ledger.overBudget) errors.push(`造化点超出预算${ledger.overBudget}点`);
    }
    return {pass: errors.length === 0, errors, ledger, normalized: {
      mode, name, age, level, identityId, primarySoulId, secondarySoulId, martialSoulTemplateIds, attributes, martialSoulDraft, martialSoulDrafts, avatar, opening:opening.selection, situations:situations.selection,
      gender: ['男', '女'].includes(gender) ? gender : '男', origin: clean(draft?.origin, '诺丁边境'), appearance: clean(draft?.appearance),difficulty:draft.difficulty??'normal',...(draft.openingWorkshop!==undefined?{openingWorkshop:clone(draft.openingWorkshop)}:{})
    }};
  }

  function compactCreationLedger(ledger) {
    if (!plain(ledger)) return null;
    return {
      total: ledger.total,
      situationBonus:ledger.situationBonus,
      baseTotal:ledger.baseTotal, attributeRefund:ledger.attributeRefund,
      spent: ledger.spent,
      remaining: ledger.remaining,
      soulBudget: ledger.soulBudget,
      martialSoulCount: ledger.martialSoulCount,
      extraSoulSlots: ledger.extraSoulSlots,
      soulCosts: clone(ledger.soulCosts),
      costs: clone(ledger.costs),
      attributes: clone(ledger.attributes),
      level: ledger.level,
      identityId: ledger.identityId
    };
  }

  function soulFromTemplate(templateId, entityId, ordinal = 1) {
    const template = MARTIAL_SOUL_TEMPLATES[templateId] ?? MARTIAL_SOUL_TEMPLATES['blue-silver-grass'];
    return {id: `soul-${entityId}-${ordinal}`, 持有者单位ID: entityId, ...clone(template), 魂环ID列表: [], 扩展: {templateId}};
  }

  function soulFromCompiled(compiled, entityId, ordinal = 1) {
    return {
      id: `soul-${entityId}-${ordinal}`,
      持有者单位ID: entityId,
      名称: compiled.name,
      形态: compiled.definition.form,
      定位: compiled.definition.role,
      结构化武魂: clone(compiled),
      魂环ID列表: [],
      扩展: {generatedBy: 'awakening-opening', draftId: compiled.draftId ?? ''}
    };
  }

  function registeredRingSource(state, entityId, martialSoul, ordinal, seed, ringSpec = {}) {
    if(ringSpec.sourceOrigin&&!['血脉凝聚','本源自凝','魂兽猎杀'].includes(ringSpec.sourceOrigin))throw new Error('未知历史魂环来源类型');
    const templateId = martialSoul.扩展?.templateId;
    const schedule = [80, 360, 760, 1600, 4200, 9800, 18000, 42000, 85000];
    const years = Math.max(10, Math.round(ringSpec.years ?? schedule[Math.min(ordinal - 1, schedule.length - 1)]));
    let source = {
      物种ID: 'biwen-vine-snake', 名称: '碧纹藤蛇', 类别标签: ['蛇类', '植物'], 种族特征: ['藤蔓', '缠绕', '长体', '植物', '毒液'], 解剖标签: ['长体', '毒囊'],
      属性偏向: {力量: 1, 身法: 3, 体魄: 2, 悟性: 1, 感知: 3, 意志: 1}
    };
    if (templateId === 'clear-sky-hammer') source = {
      物种ID: 'iron-charge-boar', 名称: '铁甲冲锋猪', 类别标签: ['兽类'], 种族特征: ['冲击', '力量', '甲壳', '冲锋', '震荡'], 解剖标签: ['重型', '甲壳'],
      属性偏向: {力量: 4, 身法: 1, 体魄: 4, 悟性: 1, 感知: 1, 意志: 2}
    };
    if (templateId === 'six-winged-angel') source = {
      物种ID: 'light-antler-deer', 名称: '圣辉角鹿', 类别标签: ['兽类', '光明'], 种族特征: ['光明', '神圣', '生命', '守护'], 解剖标签: ['辉角'],
      属性偏向: {力量: 1, 身法: 2, 体魄: 2, 悟性: 3, 感知: 3, 意志: 4}
    };
    if (plain(ringSpec.source)) source = {...source, ...clone(ringSpec.source)};
    const requestedEffectsOf = skill => [
      ...(skill?.requestedEffects ?? []),
      ...(skill?.requestedBranches ?? []).flatMap(branch => branch?.requestedEffects ?? [])
    ];
    const requestedEffectIds = list((ringSpec.skills ?? []).flatMap(skill => requestedEffectsOf(skill).map(([effectId]) => effectId)));
    // Custom NPCs need a real biological source rather than the plant-template default.
    // Explicit authored sources retain their own lineage construction below.
    let generatedLineage;
    if (martialSoul.扩展?.generatedBy === 'npc-custom-creation' && !plain(ringSpec.source) && !requestedEffectIds.length) {
      const compiled = martialSoul.扩展.结构化武魂;
      const biological = compiled.categories.filter(item => item.family === '生物' && item.selectable !== false).map(item => item.id);
      generatedLineage = foundation.BEAST_VALUE.generateLineage({
        seed: `${seed}:${martialSoul.id}:historical-source:${ordinal}`,
        ...(biological.length ? {categoryIds: biological} : {}),
        attributeIds: compiled.attributes.map(item => item.id),
        channelIds: compiled.channels.map(item => item.id),
        targetPoints: compiled.pricing.total, maxPoints: 100, includeTraits: false
      });
      const category = generatedLineage.compiled.categories[0];
      source = {
        物种ID: category.id, 名称: `未具名的${category.name}魂兽`,
        类别标签: [category.name], 种族特征: [...category.tags], 解剖标签: [],
        属性偏向: Object.fromEntries(foundation.ATTRIBUTE_KEYS.map(key => [key, 1]))
      };
    }
    const requestedTags = list(requestedEffectIds.flatMap(effectId => [
      ...(effects.EFFECT_REGISTRY[effectId]?.sourceTags ?? []),
      ...(effects.EFFECT_REGISTRY[effectId]?.expressionTags ?? [])
    ]));
    source.种族特征 = list([...(source.种族特征 ?? []),...requestedTags]);
    const profileId = `profile-history-${entityId}-${martialSoul.id.replace(/[^\p{L}\p{N}-]+/gu, '-')}-${ordinal}`;
    source.血脉=generatedLineage ?? (source.血脉?foundation.BEAST_VALUE.validateLineage(source.血脉):foundation.BEAST_VALUE.sourceLineage(source,(ringSpec.skills??[]).flatMap(requestedEffectsOf)));
    const hasCanonNamedSkill = (ringSpec.skills ?? []).some(skill => String(skill.evidence ?? '').startsWith('canon-'));
    const profile=foundation.normalizeSoulBeastProfile({
      id: clean(ringSpec.profileId, profileId), 单位ID: `historical-source-${entityId}-${martialSoul.id.replace(/[^\p{L}\p{N}-]+/gu, '-')}-${ordinal}`, 年限: years, 完整度: 1,
      技能种子: `${seed}:${profileId}`, 魂环状态: '已吸收', 归属武魂ID: martialSoul.id,
      扩展: {generatedBy: 'registered-history', notPresentInScene: true, evidence:ringSpec.evidence ?? 'mechanical-inference', sourceNote:clean(ringSpec.sourceNote),...(ringSpec.sourceOrigin?{sourceOrigin:ringSpec.sourceOrigin}: {})}, ...source
    }, `historical-source-${entityId}-${martialSoul.id.replace(/[^\p{L}\p{N}-]+/gu, '-')}-${ordinal}`);
    effects.freezeSourceBridges(profile);
    return profile;
  }

  function distributePermanentGain(total, bias) {
    const weights = foundation.ATTRIBUTE_KEYS.map(key => Math.max(0, Number(bias?.[key] ?? 0)));
    const weightTotal = weights.reduce((sum, value) => sum + value, 0) || weights.length;
    const exact = weights.map(value => total * (value || (weightTotal === weights.length ? 1 : 0)) / weightTotal);
    const result = exact.map(Math.floor);
    let remaining = total - result.reduce((sum, value) => sum + value, 0);
    for (const entry of exact.map((value, index) => ({index, fraction: value - Math.floor(value)})).sort((a, b) => b.fraction - a.fraction || a.index - b.index)) {
      if (remaining-- <= 0) break;
      result[entry.index] += 1;
    }
    return Object.fromEntries(foundation.ATTRIBUTE_KEYS.map((key, index) => [key, result[index]]));
  }

  function generateRegisteredRings(state, entityId, level, seed = '', options = {}) {
    const growth = state.成长.列表[entityId];
    const unit = state.战斗单位.列表[entityId];
    const martialSouls = list(growth?.武魂ID列表).map(id => state.武魂.列表[id]).filter(Boolean);
    if (!growth || !unit || !martialSouls.length) return [];
    const defaultDesiredCount = Math.min(9, Math.floor((integer(level, 1, 99) - 1) / 10));
    const soulLoadouts = Array.isArray(options.soulLoadouts) ? options.soulLoadouts : [];
    const mechanismGaps = Array.isArray(options.mechanismGaps) ? options.mechanismGaps : [];
    const created = [];
    for (let [soulIndex,martialSoul] of martialSouls.entries()) {
      const loadout = soulLoadouts.find(item => clean(item?.martialSoulId) === martialSoul.id || integer(item?.soulIndex ?? 0,0,3) === soulIndex + 1 || clean(item?.soulName) === martialSoul.名称);
      const ringSpecs = Array.isArray(loadout?.rings) ? loadout.rings : [];
      const desiredCount = loadout
        ? Math.min(9,integer(loadout.desiredCount ?? ringSpecs.length,0,9))
        : defaultDesiredCount;
      while (martialSoul.魂环ID列表.length < desiredCount) {
      const ordinal = martialSoul.魂环ID列表.length + 1;
      const ringSpec = plain(ringSpecs[ordinal - 1]) ? clone(ringSpecs[ordinal - 1]) : {};
      // A player's preferred technique must never manufacture its own source bridge.
      const preference=options.canonicalSkillPreference===true;
      const strictPreference=preference&&options.strictCanonicalPreference===true;
      const profile = registeredRingSource(state, entityId, martialSoul, ordinal, seed || `${state.世界.seed}:${entityId}`, preference&&!strictPreference?{...ringSpec,skills:[]}:ringSpec);
      const beastCompilation=profile.扩展.能力账本?clone(profile.扩展.能力账本):effects.compileSoulBeastSkills(profile, {...effects.sourceBeastOptions(profile),seed: profile.技能种子});
      effects.validateBeastCompilation(profile,beastCompilation);
      profile.扩展.能力账本=clone(beastCompilation);
      const beastSkills=beastCompilation.skills;
      const requestedSkills = !preference&&Array.isArray(ringSpec.skills) ? ringSpec.skills.map(item => plain(item) ? clone(item) : {name:clean(item)}) : [];
      for(const [index,request] of requestedSkills.entries()){
        const check=abilities.validate({...request,id:`registered-contract-${index}`});
        if(!check.pass)throw Error(check.errors.join('；'));
      }
      const compileOptions = {casterLevel: level, attributeSeed:`${seed}:${soulIndex}:${ordinal}`, allowProceduralFallback: true, requestedSkills, allocationStyle:clean(ringSpec.allocationStyle,'均衡')};
      // A historical duel reconstructs exactly the catalogue for that era; an unused high-age slot is not a new absorption.
      if(options.historicalLoadout&&requestedSkills.length)compileOptions.preferredSkillCount=requestedSkills.length;
      if(options.openingCompatibility)compileOptions.compatibility=1;
      else if(strictPreference)compileOptions.compatibility=cycle.calculateCompatibility(martialSoul,profile,beastSkills).ratio;
      let compiled,usedInference=false;
      try {
        if(martialSoul.扩展?.generatedBy==='npc-custom-creation'&&!requestedSkills.length&&!options.canonicalSkillPreference){
          const archetype=state.人物.列表[entityId]?.扩展?.archetypeId,preferred=npcLoadouts.skillRoles(archetype),legal=effects.ringCandidateRoles(martialSoul,profile,beastSkills),roles=[...new Set([...preferred.filter(r=>legal.includes(r)),...legal])];
          // The role pass may have no complete release even when an effect matches.
          // In that case the ordinary compiler still checks the source and age budget.
          for(const candidateRole of roles){try{compiled=effects.compileRingSkills({martialSoul,beastProfile:profile,beastSkills,ringOrdinal:ordinal,options:{...compileOptions,candidateRole,candidateSecondaryRoles:roles.filter(r=>r!==candidateRole),preferAllyTargets:['commerce-ally','commerce-healer','auction-host'].includes(archetype)}});break;}catch{}}
        }
        if(options.selfCondensation){
          const spec=globalThis.SoulCanonArenaEngine.selfCondensationSpec(state,entityId,martialSoul,ordinal);
          if(abilities.hash(spec)!==abilities.hash(ringSpec))throw Error('自主凝环与登记本源不符');
          const sourceBudget=effects.calculateRingBudget(profile,martialSoul,1),allocation=Math.floor(sourceBudget.usable/requestedSkills.length);
          const skills=requestedSkills.map((request,index)=>({...effects.compileRingSkill({martialSoul,beastProfile:profile,beastSkills,ringOrdinal:ordinal,options:{...request,availableBudget:allocation,compatibility:1,allowProceduralFallback:false,skillId:`self-ring-skill-${martialSoul.id}-${ordinal}-${index+1}`}}),intentIndex:index}));
          const spent=skills.reduce((n,s)=>n+s.budget.spent,0);
          if(spent>sourceBudget.usable)throw Error('自主凝环超出本源预算');
          compiled={skills,compatibility:skills[0].compatibility,budget:{...sourceBudget,available:sourceBudget.usable,allocations:skills.map(()=>allocation),spent,unallocated:sourceBudget.usable-spent}};
        }
        const preferenceErrors=[];
        if(preference)for(const presetId of globalThis.SoulCanonicalGrowth.preferredIds(state,martialSoul,ordinal,profile)){
          const result=globalThis.SoulPresetCatalog.compile(presetId,{martialSoul,beastProfile:profile,beastSkills,ringOrdinal:ordinal,allowExpressionGrowth:options.allowCanonicalExpressionGrowth===true,options:{...compileOptions,requestedSkills:undefined}});
          if(result.pass){compiled=result.mechanics;break;}
          preferenceErrors.push(result.reason??result.errors?.join('；')??'预设未能完成');
        }
        if(strictPreference&&!compiled)throw Error(preferenceErrors.join('；')||'未找到这一环的预设魂技');
        compiled ??= effects.compileRingSkills({martialSoul, beastProfile: profile, beastSkills, ringOrdinal: ordinal, options:compileOptions});
        for (const [skillIndex,requested] of requestedSkills.entries()) {
          const allRequestedEffects = [
            ...(requested.requestedEffects ?? []),
            ...(requested.requestedBranches ?? []).flatMap(branch => branch?.requestedEffects ?? [])
          ];
          const conformanceRequired = requested.strictEffects || String(requested.evidence ?? '').startsWith('canon-') ||
            allRequestedEffects.some(([effectId]) => effectId === 'transform.martial_avatar');
          if (!conformanceRequired) continue;
          if(options.selfCondensation){
            const signature=presets.verifyRequestedSignature(requested,compiled.skills.find(skill=>skill.intentIndex===skillIndex));
            if(!signature.pass)throw Error(signature.errors.join('；'));
          }
          const requiredBranches = (requested.requestedBranches ?? []).filter(branch => branch?.optional !== true);
          const expectedSpecs = requiredBranches.length
            ? requiredBranches.flatMap(branch => branch.requestedEffects ?? [])
            : (requested.requestedEffects ?? []);
          const expectedIds = list(expectedSpecs.map(([effectId]) => effectId));
          const actualIds = list(compiled.skills.find(skill=>skill.intentIndex===skillIndex)?.effectGraph?.nodes?.map(node => node.effectId));
          const missing = expectedIds.filter(effectId => !actualIds.includes(effectId));
          if (missing.length) throw new Error(`原作明示效果未保留：${missing.join(',')}`);
        }
      } catch (error) {
        if(strictPreference)throw error;
        const explicit = requestedSkills.some(item => (Array.isArray(item.requestedEffects) && item.requestedEffects.length) || (Array.isArray(item.requestedBranches) && item.requestedBranches.length) || list(item.requestedEffectIds).length);
        if (!explicit || options.allowInferenceFallback === false || requestedSkills.some(item=>item.strictEffects||['requirements','resourceCosts','maintenanceCosts','castModes','defaultCastMode','usageRules','usageKey','cooldownTurns'].some(key=>item[key]!==undefined))) throw error;
        const explicitCanonSkills = requestedSkills.filter(item => String(item.evidence ?? '').startsWith('canon-') ||
          [...(item.requestedEffects ?? []),...(item.requestedBranches ?? []).flatMap(branch => branch?.requestedEffects ?? [])].some(([effectId]) => effectId === 'transform.martial_avatar'));
        const reason = clean(error?.message,'登记效果无法由当前词条编译');
        const gapAxis = reason.includes('表达机制') || reason.includes('武魂机制') ? 'martial-soul-channel'
          : reason.includes('释放方式') ? 'source-release-channel'
            : reason.includes('来源链') ? 'source-bridge'
              : reason.includes('属性') ? 'attribute-contract'
                : 'effect-term-or-parameter';
        const requestedTerm = reason.match(/(?:：|:)([\w.-]+)$/u)?.[1] ?? '';
        if (explicitCanonSkills.length) mechanismGaps.push({
          id:`gap-${entityId}-${soulIndex + 1}-${ordinal}-canon-conformance`,
          type:'canon-conformance-failure',entityId,martialSoulId:martialSoul.id,ringOrdinal:ordinal,
          axis:gapAxis,requestedTerm,skillNames:explicitCanonSkills.map(item => clean(item.name)).filter(Boolean),reason,
          handling:'原作定义清晰的公共机制没有通过共同编译管线；必须修复底层后重新验证'
        });
        usedInference=true;
        try {compiled = effects.compileRingSkills({
          martialSoul, beastProfile: profile, beastSkills, ringOrdinal: ordinal,
          options:{...compileOptions,requestedSkills:[],allowProceduralFallback:true}
        });}catch(failure){throw new Error(`${entityId}第${ordinal}魂环（${profile.名称}）：${failure.message}；原方案：${reason}`);}
      }
      const skills = compiled.skills;
      const ringId = `ring-${martialSoul.id}-${ordinal}-${profile.id}`;
      const absorptionId=`registered-absorb-${ringId}`;
      if(compiled.expressionGrowth)martialSoul=globalThis.SoulCanonicalGrowth.applyExpression(state,martialSoul,compiled.expressionGrowth,profile,absorptionId);
      const gains = Object.fromEntries(foundation.ATTRIBUTE_KEYS.map(key => [key, 0]));
      const tier = foundation.getAgeTier(profile.年限);
      state.魂兽档案.列表[profile.id] = profile;
      state.魂环.列表[ringId] = {
        id: ringId, 持有者单位ID: entityId, 武魂ID: martialSoul.id, 序号: ordinal, 年限: profile.年限, 年限档: tier.名称, 颜色: tier.颜色,
        来源魂兽档案ID: profile.id, 契合: {分数: compiled.compatibility.score, 转化率: compiled.budget.conversion, 语义桥ID: clone(compiled.compatibility.bridgeIds), 冲突: []},
        吸收双门: {承载: {通过: true, 来源: '既有档案'}, 肉身: {通过: true, 来源: '统一承载兼容别名'}, 灵魂: {通过: true, 来源: '统一承载兼容别名'}},
        吸收时快照: {魂力等级: Math.max(10, ordinal * 10), 六维: clone(unit.六维.有效), 生命上限: unit.派生.生命上限, 魂力上限: unit.派生.魂力上限, 魂环承载上限: unit.派生.魂环承载上限},
        价值: {潜在点数: compiled.budget.potential, 可用点数: compiled.budget.available, 技能分配: clone(compiled.budget.allocations), 已花费: compiled.budget.spent, 未分配: compiled.budget.unallocated},
        永久属性增益: gains, 魂技ID列表: skills.map(skill => skill.id),
        扩展: {编译器版本: effects.VERSION, 效果注册表版本: effects.REGISTRY_VERSION, 技能数量: skills.length, 蓝图哈希列表: skills.map(skill => skill.immutableHash), 自由属性点: cycle.RING_ATTRIBUTE_POINTS, generatedBy: 'registered-history', evidence:ringSpec.evidence ?? 'mechanical-inference', sourceNote:clean(ringSpec.sourceNote),...(ringSpec.sourceOrigin?{sourceOrigin:ringSpec.sourceOrigin}: {})}
      };
      state.魂环.列表[ringId].颜色=globalThis.SoulCanonArenaEngine?.registeredRingColor(state,state.魂环.列表[ringId])??tier.颜色;
      for (const [skillIndex,skill] of skills.entries()) {
        const requested = usedInference?{}:requestedSkills[skill.intentIndex ?? skillIndex] ?? {};
        const compiledName = skill.name;
        const registeredName = clean(requested.name,compiledName);
        skill.name = registeredName;
        Object.assign(skill, {
          名称: registeredName, 类型: '魂环魂技', 持有者单位ID: entityId, 来源武魂ID: martialSoul.id, 来源魂环ID: ringId, 来源魂兽档案ID: profile.id,
          蓝图版本: VERSION, 效果图: clone(skill.effectGraph), 扩展: {预算: clone(skill.budget), 契合: clone(skill.compatibility), 魂力消耗: skill.soulPowerCost, 不可变哈希: skill.immutableHash, generatedBy: 'registered-history', evidence:requested.evidence ?? ringSpec.evidence ?? 'mechanical-inference', originalName:clean(requested.name), compiledName,adaptedToBudget:compiledName !== registeredName,mechanismIds:list(requested.mechanismIds)}
        });
        state.技能.列表[skill.id] = abilities.seal(skill);
      }
      martialSoul.魂环ID列表.push(ringId);
      state.魂环.列表[ringId].扩展.蓝图哈希列表=skills.map(skill=>skill.immutableHash);
      if(strictPreference){
        const ring=state.魂环.列表[ringId];ring.扩展.absorptionTransactionId=absorptionId;
        if(compiled.expressionGrowth){ring.扩展.expressionGrowth={...clone(compiled.expressionGrowth),profileId:profile.id,sourceId:absorptionId};ring.价值.表达成长=compiled.expressionGrowth.cost;ring.价值.总支出=compiled.budget.totalSpent;}
        const request={actorId:entityId,martialSoulId:martialSoul.id,profileId:profile.id,ringOrdinal:ordinal,registeredHistory:true,presetIds:skills.map(skill=>skill.presetId)};
        const receipt={type:'ring-absorbed',playerId:entityId,martialSoulId:martialSoul.id,ringId,ringOrdinal:ordinal,years:profile.年限,ageTier:tier.名称,gates:clone(ring.吸收双门),compatibility:{...clone(compiled.compatibility),ratio:compiled.budget.compatibility},budget:clone(compiled.budget),skillDefinitions:clone(skills),skillIds:skills.map(skill=>skill.id),attributePointsGained:cycle.RING_ATTRIBUTE_POINTS,registeredHistory:true};
        state.魂环.operations??={};
        if(state.魂环.operations[absorptionId])throw Error('既有魂环的吸收记录不能覆盖');
        state.魂环.operations[absorptionId]={id:absorptionId,kind:'absorb',request,requestHash:abilities.hash(request),receipt,receiptHash:abilities.hash(receipt)};
      }
      unit.能力.技能ID = list([...unit.能力.技能ID, ...skills.map(skill => skill.id)]);
      growth.可用属性点 += cycle.RING_ATTRIBUTE_POINTS;
      created.push({martialSoulId: martialSoul.id, ringId, skillIds: skills.map(skill => skill.id), profileId: profile.id, evidence:ringSpec.evidence ?? 'mechanical-inference'});
      }
    }
    if (created.length) {
      const refreshed = cycle.refreshCombatant(state, entityId);
      refreshed.能力.技能ID = list([...refreshed.能力.技能ID, ...created.flatMap(item => item.skillIds)]);
    }
    return created;
  }

  function selfCondensationPreview(state,proposal={}){
    const actorId=clean(proposal.actorId,state.角色.主控单位ID),unit=state.战斗单位?.列表?.[actorId],origin=unit&&foundation.nativeOriginDefinition(unit);
    if(!origin)return {visible:false,pass:false,reasons:[]};
    const growth=state.成长.列表[actorId],soul=state.武魂.列表[clean(proposal.martialSoulId,growth.激活武魂ID)],record=globalThis.SoulCanonArenaEngine.CHARACTER_CATALOG[origin.recordId];
    if(!record.mechanics.selfCondensation||!soul||soul.持有者单位ID!==actorId)return {visible:false,pass:false,reasons:[]};
    const ordinal=soul.魂环ID列表.length+1,reasons=[];
    if(ordinal>9)return {visible:false,pass:false,reasons:['九枚魂环已凝聚']};
    const blocked=worldActionBlockReason(state,{actorId});if(blocked)reasons.push(blocked);
    try{actions.resolve(state,{actorId,battleId:null,requirements:['soul-power','martial-soul','focus']});}catch(error){reasons.push(error.message);}
    if(actorId!==state.角色.主控单位ID)reasons.push('请由本人凝聚魂环');
    if(controls.martialSoulSealed(state,actorId,soul.id))reasons.push('武魂受到封印，暂时无法凝环');
    const permission=controls.permissionReason(state,actorId,{id:`native-self-condense-${origin.id}`,sourceKind:'native-origin',sourceNativeOriginId:origin.id,sourceMartialSoulId:soul.id});if(permission)reasons.push(permission);
    if(ordinal*10>growth.魂力等级)reasons.push(`达到${ordinal*10}级后可凝聚下一枚魂环`);
    else reasons.push(...cycle.ringAdvancementEligibility(state,actorId,soul.id).reasons);
    return {visible:true,pass:!reasons.length,reasons,actorId,martialSoulId:soul.id,ordinal,years:1000000,color:record.mechanics.ringLoadouts[0].rings[ordinal-1].color};
  }
  function condenseSelfRing(rawState,proposal={},transactionId='self-condensation'){
    const guard=transactionStart(rawState,transactionId,'自主凝环');if(guard.duplicate)return {state:guard.state,receipt:guard.receipt,idempotent:true};
    const state=guard.state,quote=selfCondensationPreview(state,proposal);if(!quote.pass)throw Error(quote.reasons.join('；')||'此人物无法自主凝环');
    const unit=state.战斗单位.列表[quote.actorId],record=globalThis.SoulCanonArenaEngine.CHARACTER_CATALOG[foundation.nativeOriginDefinition(unit).recordId],soul=state.武魂.列表[quote.martialSoulId],slot=state.成长.列表[quote.actorId].武魂ID列表.indexOf(soul.id),loadout=clone(record.mechanics.ringLoadouts[slot]);
    loadout.desiredCount=quote.ordinal;loadout.rings=loadout.rings.slice(0,quote.ordinal);
    const records=generateRegisteredRings(state,quote.actorId,state.成长.列表[quote.actorId].魂力等级,`self:${transactionId}`,{soulLoadouts:[loadout],selfCondensation:true,allowInferenceFallback:false});
    if(records.length!==1)throw Error('本次自主凝环未能完成');
    cycle.applyStoredExperience(state,quote.actorId);cycle.refreshGrowthBottleneckState(state,state.成长.列表[quote.actorId]);
    cycle.refreshCombatant(state,quote.actorId);
    const ring=state.魂环.列表[records[0].ringId];ring.扩展.登记流程='银龙本源自主凝环';
    return commit(state,transactionId,'自主凝环',{type:'ring-self-condensed',actorId:quote.actorId,ringId:ring.id,martialSoulId:soul.id,years:ring.年限,color:ring.颜色,skillIds:clone(ring.魂技ID列表),summary:`第${ring.序号}枚淡金魂环在银龙本源中凝聚成形。`});
  }
  function createPlayer(rawState, draft, transactionId) {
    const guard = transactionStart(rawState, transactionId, '创建玩家');
    if (guard.duplicate) return {state: guard.state, receipt: guard.receipt, idempotent: true};
    const state = guard.state;
    if (state.角色.已建立) throw new Error('角色已经创建，不能重复开卡');
    const validation = validateCreationDraft(draft);
    if (!validation.pass) throw new Error(validation.errors.join('；'));
    const config = validation.normalized;
    const storedLedger = compactCreationLedger(validation.ledger);
    if(config.background?.scenarioId)state.世界.scenarioId=config.background.scenarioId;
    if(config.background?.npcGender)state.世界.npcGender=config.background.npcGender;
    state.世界.characterSources=globalThis.SoulCanonicalGrowth.selectedSources(config);
    const backgroundPolicy=config.background?backgrounds.policy(config.background,config.difficulty):null;
    const frozenPrince=backgroundPolicy?.canonical;
    const playerId=config.background?backgrounds.playerId(config.background,nextId(state,'entity')):nextId(state,'entity');
    if(frozenPrince){const actor=config.background.id==='canonical-character'?{characterId:config.background.canonicalPlayer.characterId,draft:config,level:config.background.canonicalPlayer.level}:config.background.id==='sealed-titled'?backgrounds.resolveActor(config,config.background.perspective):{characterId:'xue-beng',draft:config,level:backgroundPolicy.level};const made=globalThis.SoulCanonArenaEngine.configureOpeningCharacter(state,actor.characterId,{draft:actor.draft,level:actor.level,sourceId:transactionId,player:true});Object.assign(state,made.state);}
    const souls = frozenPrince?state.成长.列表[playerId].武魂ID列表.map(id=>state.武魂.列表[id]):config.mode === 'awakening'
      ? config.martialSoulDrafts.map((soulDraft, index) => soulFromCompiled(foundation.MARTIAL_SOUL_CORE.finalizeDraft({...soulDraft, playerConfirmed: true}, {budget: validation.ledger.total, id: `soul-${playerId}-${index + 1}`, revision: state.系统.revision + 1}), playerId, index + 1))
      : config.martialSoulTemplateIds.map((templateId, index) => soulFromTemplate(templateId, playerId, index + 1));
    const identity = backgroundPolicy?{...IDENTITY_ARCHETYPES.civilian,name:frozenPrince?state.人物.列表[playerId].identity:backgroundPolicy.definition.name,wallet:backgroundPolicy.wallet,kit:frozenPrince?[]:backgroundPolicy.ordinary?IDENTITY_ARCHETYPES.civilian.kit:config.background.id==='prince-cat'?NPC_ARCHETYPES['commerce-cat'].kit:[]}:IDENTITY_ARCHETYPES[config.identityId];
    const created = frozenPrince?{state}:cycle.createCharacter(state, {
      id: playerId, name: config.name, level: config.level, attributes: config.attributes, martialSouls: souls,
      unitExtensions: {openingTalents:talents.grant(config.opening,playerId),...(config.avatar?{头像资产:clone(config.avatar)}:{}),头像接口:'unit.扩展.头像资产'},
      dossier: {姓名: config.name, 年龄: config.age, 性别: config.gender, 出身: config.origin, 身份: identity.name, 外貌: config.appearance, 创建模式: config.mode, 造化点账本: storedLedger}
    }, `cycle-${transactionId}`);
    if (config.mode === 'awakening'&&(!backgroundPolicy||backgroundPolicy.ordinary)&&config.level===10) {
      const growth = created.state.成长.列表[playerId];
      growth.当前经验 = growth.当前等级需求;
    }
    const next = normalizeState(created.state);
    if(frozenPrince){const person=next.人物.列表[playerId],unit=next.战斗单位.列表[playerId];person.扩展.creationLedger=clone(storedLedger);if(config.avatar){person.扩展.头像资产=clone(config.avatar);unit.扩展.头像资产=clone(config.avatar);}Object.assign(next.角色.档案,{创建模式:config.mode,造化点账本:clone(storedLedger)});}
    if(!frozenPrince)next.人物.列表[playerId] = {
      id: playerId, tier: 'full', name: config.name, identity: identity.name, occupation: '魂师', faction: '玩家方', age: config.age, gender: config.gender,
      appearance: config.appearance || '由玩家定义', personality: '', locationId: next.地图.当前地点ID, relationship: {player: 100}, walletId: `wallet-${playerId}`,
      inventoryContainerId: `container-${playerId}-inventory`, equipmentConfigId: playerId, combatantId: playerId, generatedBy: 'opening-wizard-v1.10', seed: `${next.世界.seed}:${playerId}`, status: 'active', 扩展: {identityId: config.identityId, origin: config.origin, creationLedger: clone(storedLedger), ...(config.avatar ? {头像资产: clone(config.avatar)} : {}), 头像接口: '人物.扩展.头像资产'}
    };
    if(!frozenPrince)people.initialize(next,playerId);
    if(!frozenPrince)for(const soulId of next.成长.列表[playerId].武魂ID列表)globalThis.SoulCanonicalGrowth.bindPresetSoul(next.武魂.列表[soulId]);
    const shell = ensurePossessionShell(next, playerId);
    if(!frozenPrince)next.钱包.列表[shell.walletId].gold = identity.wallet;
    const itemIds = grantKit(next, playerId, identity.kit, 'starting-identity-kit');
    itemIds.push(...grantOpeningRingItems(next,config.opening,playerId));
    const registeredRings = frozenPrince?[]:backgroundPolicy&&(config.background.id==='sealed-titled'&&!backgroundPolicy.ordinary||['custom','jiumeitu-heir'].includes(config.background.id)&&config.level>10)?globalThis.SoulBackgroundHistory.install(next,playerId,config,{manual:true,selectedIds:config.background.ringChoices,designs:config.background.ringDesigns,sourceId:transactionId}).records:generateRegisteredRings(next, playerId, config.level, `${next.世界.seed}:opening:${playerId}`,{openingCompatibility:true});
    next.世界.opening = {status: 'committed', committedTransactionId: transactionId};
    if(config.mode==='awakening'&&!config.background){
      next.世界.opening.guidance={status:'pending',giftStatus:'available',giftId:'',itemId:'',tutorialSkipped:false};
      next.地图.当前地点ID='loc-hunting-forest';
      next.人物.列表[playerId].locationId='loc-hunting-forest';
      next.容器.列表[shell.containerId].locationId='loc-hunting-forest';
    }
    installOpeningSituations(next,config.situations,transactionId);
    if(backgroundPolicy){next.地图.当前地点ID=backgroundPolicy.definition.locationId;next.人物.列表[playerId].locationId=next.地图.当前地点ID;next.容器.列表[shell.containerId].locationId=next.地图.当前地点ID;}
    next.场景.地点 = LOCATION_TEMPLATES[next.地图.当前地点ID].name;
    next.场景.状态 = '自由行动';
    ensureLocationCast(next, next.地图.当前地点ID);
    initializeCityStages(next,transactionId);
    initializeRegionalStores(next);
    initializeAuctionVenue(next);
    initializeRareCommerce(next,transactionId,config);
    globalThis.SoulBackgroundOpening?.initialize(next,config,transactionId,globalThis.SoulWorldEngine);
    for(const source of globalThis.SoulCanonicalGrowth.sources())if(next.世界.characterSources.includes(source.id)){
      const made=globalThis.SoulCanonArenaEngine.ensurePersistentCharacter(next,source.characterId);Object.assign(next,made.state);
    }
    globalThis.SoulEvolutionContent.install(next,config,transactionId);
    globalThis.SoulPersonTools?.grant(next,config,transactionId);
    itemIds.push(...(globalThis.SoulOpeningWorkshop?.install(next,config,transactionId)??[]));
    globalThis.SoulResidentRealms.installActor(next,playerId,transactionId);
    globalThis.SoulOpeningRelations.installInitialRealms(next,config,transactionId);
    refreshAllEquipment(next);
    const activeSoul=next.武魂.列表[next.成长.列表[playerId].激活武魂ID]?.扩展?.结构化武魂;
    if(activeSoul?.exchangeContracts?.some(c=>c.mode!=='condition')){
      // Opening restraints may already forbid activation. Keep the soul retracted
      // until it can be activated and its exchange cost can actually be paid.
      foundation.switchActiveMartialSoul(next,playerId,'',{operationId:transactionId});
      if(!controls.actionReason(next,playerId,'switch-soul',{soulId:activeSoul.id}))foundation.switchActiveMartialSoul(next,playerId,activeSoul.id,{operationId:transactionId});
    }
    return commit(next, transactionId, '创建玩家', {type: 'player-created', playerId, name: config.name, level: config.level, identity: identity.name, martialSoulIds: souls.map(item => item.id), martialSoulName: souls[0].名称, martialSoulQuality: souls[0].结构化武魂?.quality?.name, creationLedger: clone(storedLedger), registeredRings, startingWalletGold: next.钱包.列表[shell.walletId].gold, startingItemIds: itemIds, locationId: next.地图.当前地点ID, summary: `${config.name}的故事从${next.地图.地点[next.地图.当前地点ID]?.name??next.场景.地点}开始。`});
  }

  function openingSituationRows(state){return state.世界.opening?.situations??[];}
  function situationMoney(state,fromId,toId,amount){
    const from=state.钱包.列表[state.人物.列表[fromId]?.walletId],to=state.钱包.列表[state.人物.列表[toId]?.walletId];
    if(!Number.isSafeInteger(amount)||amount<0||!from||!to||from.gold<amount||!Number.isSafeInteger(to.gold+amount))throw new Error('处境款项不足或收付对象无效，尚未结算');
    const before={from:from.gold,to:to.gold};
    from.gold-=amount;to.gold+=amount;
    return {fromId,toId,paidGold:amount,before,after:{from:from.gold,to:to.gold}};
  }
  function installOpeningSituations(state,selection,sourceId){
    const playerId=state.角色.主控单位ID;state.世界.opening.situations=[];
    // Advances settle first so order of selected cards cannot change affordability.
    for(const choice of selection){const d=talents.SITUATIONS[choice.id],id=`opening-contact:${playerId}:${d.id}`;
      if(Object.values(state.人物.列表).some(p=>p.name===choice.contactName))throw new Error('处境联系人姓名已被使用，请修改姓名');
      spawnNpcInternal(state,{id,name:choice.contactName,identity:d.identity,archetypeId:d.archetype,locationId:'loc-notting-city',seed:`${state.世界.seed}:situation:${d.id}`,wallet:2000,...(d.archetype==='hunter'?{level:14}:{}),generatedBy:'opening-situation'});
      const r={createdAt:clone(state.世界.时间),pointsGranted:choice.benefit==='points'?d.points:0,advanceGold:choice.benefit==='story'?(d.advance??0):0,discountGold:choice.benefit==='story'?(d.discount??0):0,id:`situation:${playerId}:${d.id}`,kind:d.id,benefit:choice.benefit,personId:id,locationId:'loc-notting-city',status:'active',deposit:d.deposit,owed:d.id==='debt'?d.fee:0,dueDay:state.世界.时间.day+d.days,sourceId,events:[{type:'created',time:clone(state.世界.时间),sourceId}],itemId:null};
      if(d.id==='referral')state.人物.列表[id].扩展.openingReferralId=r.id;
      r.terms={feeGold:d.fee??0,rewardGold:choice.benefit==='story'?(d.reward??0):0,lateFeeGold:d.lateFee??0,advanceGold:r.advanceGold,depositGold:d.deposit,hireDiscountGold:r.discountGold};
      if(d.id==='delivery'){const item=createItem(state,'story-keepsake',playerId,state.人物.列表[playerId].inventoryContainerId,{id:`opening-parcel:${playerId}`,name:'封缄铜匣',forceUnique:true,valuePoints:0,payload:{nonTradable:true},provenance:{type:'opening-entrusted',situationId:r.id},扩展:{描述:'一枚以细绳封缄的旧铜匣；你只是受托携带，不能将它当作自己的酬劳。'}});item.legalOwnerEntityId=id;r.itemId=item.id;}
      r.events[0].payments=[];
      if(choice.benefit==='story'&&d.advance)r.events[0].payments.push({purpose:'advance',...situationMoney(state,id,playerId,d.advance)});
      state.世界.opening.situations.push(r);
    }
    for(const r of openingSituationRows(state))if(r.deposit)r.events[0].payments.push({purpose:'deposit',...situationMoney(state,playerId,r.personId,r.deposit)});
  }
  function progressOpeningSituations(state){
    for(const r of openingSituationRows(state)){if(r.status!=='active'||state.世界.时间.day<=r.dueDay)continue;
      if(r.kind==='debt'){r.status='overdue';r.owed+=talents.SITUATIONS.debt.lateFee;}else r.status='expired';
      r.events.push({type:r.status,time:clone(state.世界.时间),lostDeposit:r.deposit,owed:r.owed});
    }
  }
  function openingSituationFacts(rawState){return readOpeningSituations(normalizeState(rawState));}
  function readOpeningSituations(state){
    return openingSituationRows(state).map(r=>{const d=talents.SITUATIONS[r.kind],last=r.events.at(-1),contact=state.人物.列表[r.personId];
      const paid=typeof last.playerGoldChange==='number'?(last.playerGoldChange>0?`本次净收入${last.playerGoldChange}金。`:last.playerGoldChange<0?`本次净支出${-last.playerGoldChange}金。`:'本次钱款没有变化。'):'';
      const summary=r.status==='active'?`尚待履行，${r.deposit?`${r.deposit}金保证金已交出；`:''}${r.kind==='debt'?`当前欠款${r.owed}金。`:'报酬或优惠尚未取得。'}`:
       r.status==='overdue'?`债务已逾期，当前欠款${r.owed}金，滞纳费用仅加收一次。`:
       r.status==='expired'||r.status==='declined'?`${r.status==='expired'?'已错过期限':'已放弃'}，${r.deposit}金保证金不退。${r.kind==='delivery'?'铜匣仍属收件人，可以归还但不再领取酬劳。':''}`:
       r.status==='available'?`约见已完成。${paid}${r.benefit==='story'?`首次雇佣可减免${r.discountGold}金。`:'雇佣按通常报价。'}尚未因此入队。`:
       r.status==='used'?`引荐已用于实际合同，本次雇佣支付${last.paid}金，优惠不再重复。`:
       r.status==='returned'?`受托物已归还；原保证金和酬劳没有补发。${paid}`:`已办结。${paid}${r.kind==='delivery'?'铜匣已实际交还。':''}`;
      return {...clone(r),name:d.name,contactName:contact?.name,locationName:LOCATION_TEMPLATES[r.locationId]?.name,description:d.description,summary,
      contact:{id:contact.id,registered:true,tier:contact.tier,identity:contact.identity,occupation:contact.occupation,
        ...(r.kind==='referral'?{service:{...clone(NPC_ARCHETYPES[contact.扩展.archetypeId].escort),referenceDungeonId:'hunting-forest-expedition',referenceDungeonName:'猎魂森林',meaning:'这是已有正式向导；可按该目的地询价，仅为报价参考，不代表玩家答应出发。当前费用以quote-hire回执为准。'}}:{})},
      benefitDescription:r.benefit==='points'?talents.SITUATIONS[r.kind].pointBenefit:talents.SITUATIONS[r.kind].storyBenefit,
      next:r.status==='available'?'询问实际同行报价，决定是否雇佣。':r.kind==='delivery'&&['expired','declined'].includes(r.status)?'带上受托物归还收件人。':r.status==='overdue'?`到联系人处偿还${r.owed}金。`:d.next,
      availableActions:r.status==='active'?(r.kind==='debt'?['settle']:['settle','decline']):r.status==='overdue'?['settle']:r.kind==='delivery'&&['expired','declined'].includes(r.status)?['return']:[],
      meaning:'created只表示开局约定已登记；保证金已实际交出，points不再发同份故事报酬。active不是已完成；故事报酬或雇佣优惠仍需履行。解决风险不收回创建点数，也不强迫风险复发。'};});
  }
  function settleOpeningSituation(rawState,options={},transactionId='opening-situation'){
    const guard=transactionStart(rawState,transactionId,'处理开局处境');if(guard.duplicate)return {state:guard.state,receipt:guard.receipt,idempotent:true};
    const state=guard.state,block=worldActionBlockReason(state);if(block)throw new Error(block);progressOpeningSituations(state);
    const r=openingSituationRows(state).find(r=>r.id===options.situationId),playerId=state.角色.主控单位ID;
    if(!r||!['settle','decline','return'].includes(options.action))throw new Error('请选择有效处境及处理方式');
    const d=talents.SITUATIONS[r.kind],person=state.人物.列表[r.personId];const beforeGold=state.钱包.列表[state.人物.列表[playerId].walletId].gold;
    const payments=[],itemTransfers=[];
    const pay=(purpose,fromId,toId,amount)=>payments.push({purpose,...situationMoney(state,fromId,toId,amount)});
    if(options.action==='decline'){
      if(r.status!=='active'||r.kind==='debt')throw new Error('当前处境不能直接撤回；债务仍须履行');r.status='declined';
    }else{
      if(!person||person.status==='dead'||!actions.colocated(state,playerId,person.id))throw new Error('请先到联系人所在地点当面办理');
      const lateReturn=options.action==='return'&&r.kind==='delivery'&&['expired','declined'].includes(r.status);
      if(!lateReturn&&!(options.action==='settle'&&(r.status==='active'||r.kind==='debt'&&r.status==='overdue')))throw new Error('该机会已经结束或无法重复办理');
      if(r.kind==='delivery'){const item=state.物品.实例[r.itemId];if(!item||item.ownerEntityId!==playerId||item.legalOwnerEntityId!==person.id||!isCarriedItem(state,item,playerId))throw new Error('须带着实际受托物交还，不能用文字代替');const fromContainerId=item.containerId,sourceItemId=item.id;const delivered=transferItem(state,item.id,person.inventoryContainerId,1);itemTransfers.push({sourceItemId,itemId:delivered.id,name:delivered.name,quantity:1,fromId:playerId,toId:person.id,fromContainerId,toContainerId:delivered.containerId,legalOwnerEntityId:delivered.legalOwnerEntityId});}
      if(r.kind==='debt')pay('debt',playerId,person.id,r.owed);
      if(r.kind==='estate')pay('fee',playerId,person.id,d.fee);
      if(!lateReturn&&r.deposit)pay('deposit-refund',person.id,playerId,r.deposit);
      if(!lateReturn&&r.benefit==='story'&&d.reward)pay('reward',person.id,playerId,d.reward);
      r.status=lateReturn?'returned':r.kind==='referral'?'available':'completed';
    }
    r.events.push({type:r.status,time:clone(state.世界.时间),sourceId:transactionId,payments,itemTransfers,playerGoldChange:state.钱包.列表[state.人物.列表[playerId].walletId].gold-beforeGold});
    return commit(state,transactionId,'处理开局处境',{type:'opening-situation-settled',situation:clone(r),summary:`${d.name}：${r.status==='completed'?'已办结':r.status==='available'?'约见已完成，现在可按实际报价雇佣':r.status==='returned'?'已归还受托物；逾期或撤回损失不再退还':'已放弃，保证金不退'}。`});
  }
  function openingGuidance(rawState){return readOpeningGuidance(normalizeState(rawState));}
  function storyOpeningFacts(rawState){
    const state=normalizeState(rawState);
    return {openingSituations:readOpeningSituations(state),openingGuidance:readOpeningGuidance(state)};
  }
  function readOpeningGuidance(state) {
    const id=state.角色.主控单位ID,guidance=state.世界.opening?.guidance;
    const master=Object.values(state.人物.列表).find(p=>(p.扩展?.角色库ID??state.战斗单位.列表[p.id]?.扩展?.角色库ID)==='yu-xiaogang-notting');
    const academy=state.世界.opening?.background?.config?.background?.id==='shrek-student';
    let masterUnavailable=academy&&!master;if(master)try{social.communicate(state,master.id,id);}catch{masterUnavailable=true;}
    const reason=worldActionBlockReason(state)||(state.远征?.当前?'请先结束当前远征':'')||(state.人物.列表[id]?.locationId!==(academy?'loc-lanba-academy':'loc-hunting-forest')||state.人物.列表[id]?.spaceId?(academy?'请回到史莱克学院授课处':'请回到猎魂森林休整点'):'')||(masterUnavailable?'大师目前不在此处或无法回应':'');
    const container=state.容器.列表[state.人物.列表[id]?.inventoryContainerId];
    const giftItem=guidance?.giftStatus==='claimed'&&container?.itemIds.includes(guidance.itemId)?state.物品.实例[guidance.itemId]:null;
    return {academy,guidance:guidance?clone(guidance):null,reason,gifts:Object.values(talents.MASTER_GIFTS).map(clone),
      giftItem:giftItem?.type==='魂环'&&giftItem.payload?.ringSource?.kind==='master-gift'?{id:giftItem.id,name:giftItem.name,years:giftItem.payload.ringSource.years}:null,
      hasRing:Boolean(state.成长.列表[id]?.武魂ID列表.some(soulId=>state.武魂.列表[soulId]?.魂环ID列表.length))};
  }

  function settleOpeningGuidance(rawState,proposal={},transactionId='opening-guidance') {
    const guard=transactionStart(rawState,transactionId,'大师赠环');
    if(guard.duplicate)return {state:guard.state,receipt:guard.receipt,idempotent:true};
    const state=guard.state,guidance=state.世界.opening?.guidance;
    if(!guidance)throw new Error('本故事没有待领取的大师赠环');
    const facts=openingGuidance(state);
    if(facts.reason)throw new Error(facts.reason);
    if(proposal.action==='skip'){
      guidance.status='completed';guidance.tutorialSkipped=true;
      return commit(state,transactionId,'大师赠环',{type:'opening-skipped',guidance:clone(guidance),summary:'已跳过新手教程，赠环仍可领取。'});
    }
    if(proposal.action==='defer'){
      guidance.status='completed';
      return commit(state,transactionId,'大师赠环',{type:'opening-deferred',guidance:clone(guidance),summary:'你决定先歇一会儿，稍后再与大师交谈。'});
    }
    const gift=talents.MASTER_GIFTS[proposal.giftId];
    if(proposal.action!=='claim'||!gift)throw new Error('请选择有效的大师赠环');
    if(guidance.giftStatus!=='available')throw new Error('大师赠环已经领取，每段故事只能领取一枚');
    const id=state.角色.主控单位ID,containerId=state.人物.列表[id].inventoryContainerId;
    const item=createItem(state,'ring-source',id,containerId,{id:`master-gift-${id}`,name:gift.name,quality:foundation.getAgeTier(gift.years).名称,
      provenance:{type:'master-gift'},payload:{ringSource:{version:1,kind:'master-gift',sourceId:gift.id,years:gift.years,seed:state.世界.seed+':master-gift:'+id}}});
    guidance.status='completed';guidance.giftStatus='claimed';guidance.giftId=gift.id;guidance.itemId=item.id;
    return commit(state,transactionId,'大师赠环',{type:'opening-gift-claimed',itemId:item.id,guidance:clone(guidance),item:{id:item.id,name:item.name,ownerId:id,containerId:item.containerId,source:clone(item.payload.ringSource)},summary:`你收下了${gift.name}。`});
  }

  function grantOpeningRingItems(state,selection,playerId=state.角色.主控单位ID) {
    const checked=talents.inspectSelection(selection);
    if(!checked.pass)throw new Error(checked.errors.join('；'));
    const containerId=state.人物.列表[playerId].inventoryContainerId;
    return selection.opportunities.map(source=>{
      const definition=talents.OPPORTUNITIES[source.kind];
      const common={boundToEntityId:playerId,forceUnique:true,provenance:{type:'opening-selection'}};
      if(source.kind==='starter-supplies'){
        const ids=[];
        for(const [key,name,category,form,stats] of [
          ['attack','铜纹护腕','攻击','attack-bracer',[['普通攻击命中',2],['普通攻击伤害',3],['魂技攻击命中',2]]],
          ['defense','青玉坠','防御','guard-pendant',[['物理防御',2],['魂技防御',2],['生命上限',20]]]
        ])ids.push(createItem(state,'crafted-soul-device-'+key,playerId,containerId,{...common,name,payload:{nonTradable:true,openingArt:key,modifiers:{attributes:{}},equipmentKind:category==='攻击'?'武器':'防具',fixedForm:foundation.EQUIPMENT_AFFIXES.FORMS.find(v=>v.id===form),passiveEffectGraph:effects.makeBranchedGraph([{activation:'passive',nodes:stats.map(([属性,数值])=>['passive.equipment_stat',{属性,数值}])}])}}).id);
        for(const [key,name,attribute] of [['strength','劲力丹','力量'],['agility','轻身丹','身法'],['vitality','固元丹','体魄']])ids.push(createItem(state,'crafted-pill',playerId,containerId,{...common,name,quantity:3,payload:{nonTradable:true,openingArt:key,activeSkill:{name:'服用'+name,soulPowerCost:0,effectSpecs:[['target.self',{阵营规则:'友方'}],['status.buff',{属性:attribute,数值:3,持续回合:4}]]}}}).id);
        state.钱包.列表[state.人物.列表[playerId].walletId].gold+=talents.opportunityGold(source.kind);
        return ids;
      }
      if(source.kind==='boon-bone'){
        const theme=talents.BOON_SOURCES[source.sourceId];
        const self=effect=>[['target.self',{阵营规则:'友方'}],effect];
        const buff=attribute=>self(['status.buff',{属性:attribute,数值:1,持续回合:2}]);
        const attack=[['release.melee',{}],['target.single',{阵营规则:'敌方'}],['check.physical_attack',{命中加值:1}],['payload.damage',{类型:theme.attributes[0],骰数:1,骰面:6,加值:1}]];
        const special={
          rakshasa:[['release.projectile',{}],['target.single',{阵营规则:'敌方'}],['check.save',{属性:'意志',难度加值:0}],['status.buff',{属性:'意志',数值:-1,持续回合:2}]],
          'azure-python':[['release.projectile',{}],['target.single',{阵营规则:'敌方'}],['check.save',{属性:'体魄',难度加值:0}],['status.slow',{数值:1,持续回合:2}]],
          angel:self(['payload.cleanse',{数量:1}]),'nine-color':buff('力量'),'soft-rabbit':buff('身法'),'dream-iceworm':buff('感知'),
          food:self(['payload.heal',{骰数:1,骰面:6,加值:1}]),'blue-silver-emperor':self(['payload.heal',{骰数:1,骰面:6,加值:1}])
        };
        const specs=special[source.sourceId]??(theme.slot==='躯干骨'?self(['payload.shield',{骰数:1,骰面:6,加值:1}]):attack);
        const profile={id:'opening-bone-'+source.sourceId,名称:theme.name+'恩赐',年限:500,完整度:1,属性谱:{主属性:theme.attributes},血脉:foundation.BEAST_VALUE.sourceLineage({名称:theme.name,种族特征:theme.channels,属性谱:{主属性:theme.attributes}},specs)};
        const item=createSoulBoneItem(state,{...common,ownerEntityId:playerId,containerId,profile,slot:theme.slot,name:talents.ringItemName(source),payloadExtra:{nonTradable:true,boonSourceId:source.sourceId},activeSkillBlueprints:[{name:theme.skillName,cooldownTurns:3,effectSpecs:specs}]});
        item.boundToEntityId=playerId;
        return item.id;
      }
      const item=createItem(state,'ring-source',playerId,containerId,{
        id:`opening-${playerId}-${source.kind}`,name:talents.ringItemName(source),quality:foundation.getAgeTier(definition.years).名称,

        provenance:{type:'opening-selection'},payload:{ringSource:{version:1,...clone(source),years:definition.years,seed:state.世界.seed+':opening-'+playerId+'-'+source.kind}}
      });
      return item.id;
    }).flat();
  }

  const PRESET_LOCATION_CAST_SOURCES=new Set(['location-cast','recruitment-cast','city-stage','regional-world-opening','authored-tang-opening','authored-commerce-opening','authored-commerce-relation','registered-commerce-supplier','background-opening-v2']);
  function isPresetLocationCastSource(source){return PRESET_LOCATION_CAST_SOURCES.has(source);}

  function spawnNpcInternal(state, options = {}) {
    const archetypeId = clean(options.archetypeId);
    if (!NPC_ARCHETYPES[archetypeId]) throw new Error(`未知人物原型：${archetypeId || '未指定'}`);
    const archetype = NPC_ARCHETYPES[archetypeId];
    for (const key of ['identity','occupation']) if(options[key]!==undefined && (typeof options[key]!=='string' || !options[key].trim() || options[key].length>40)) throw new Error('人物身份与职业须为1至40字');
    if ((options.martialSoulDraft !== undefined || options.presetId) && !(options.full ?? archetype.full)) throw new Error('轻量人物不能登记武魂草案或精品预设');
    if(options.presetId&&(options.martialSoulDraft!==undefined||clean(options.martialSoulTemplateId)))throw Error('精品武魂不能同时指定模板或草案');
    const locationId = LOCATION_TEMPLATES[options.locationId] ? options.locationId : state.地图.当前地点ID;
    const spawnIndex = integer(options.spawnIndex ?? state.世界.counters.entity + 1, 1);
    const seed = clean(options.seed, `${state.世界.seed}:${locationId}:${archetypeId}:${spawnIndex}`);
    const preparedDraft=state.扩展?.npcCreationDrafts?.[seed];
    if(preparedDraft&&options.martialSoulDraft===undefined)options={...options,martialSoulTemplateId:'',martialSoulDraft:preparedDraft};
    const rng = makeRng(seed);
    const id = clean(options.id, nextId(state, 'entity'));
    if (state.人物.列表[id]) return state.人物.列表[id];
    // Keep the demographic/resource draw positions independent of name vocabulary.
    rng.next();rng.next();
    const age=integer(options.age??rng.int(18,55),1,999),randomGender=rng.pick(['男','女']),forcedGender=state.世界.npcGender;
    const fixed=/^(authored-|registered-|regional-world-opening)/.test(options.generatedBy??'');
    const gender=clean(options.gender,!fixed&&forcedGender==='male'?'男':!fixed&&forcedGender==='female'?'女':randomGender);
    const usedNames=[...Object.values(state.人物.列表).map(person=>person.name),...Object.values(globalThis.SoulCanonArenaEngine?.CHARACTER_CATALOG??{}).flatMap(person=>[person.name,person.name.split('·')[0]])];
    const name=clean(options.name)||personalNames.generatePersonalName({seed:seed+':name',gender,usedNames});
    const person = {
      id, tier: options.full ?? archetype.full ? 'full' : 'light', name, identity: clean(options.identity, archetype.identity), occupation: clean(options.occupation, archetype.occupation),
      faction: archetype.faction, age, gender, appearance: clean(options.appearance, rng.pick(APPEARANCES)),
      personality: clean(options.personality, rng.pick(PERSONALITIES)), locationId, relationship: {player: integer(options.relationship ?? 0, -100, 100)}, walletId: `wallet-${id}`,
      inventoryContainerId: `container-${id}-inventory`, equipmentConfigId: id, combatantId: '', generatedBy: clean(options.generatedBy, 'deterministic-location-slot'), seed, status: 'active', 扩展: {archetypeId}
    };
    state.人物.列表[id] = person;
    if(archetypeId==='imperial-patrol')person.faction=LOCATION_TEMPLATES[locationId]?.region?.includes('星罗')?'星罗帝国巡防军':'天斗帝国巡防军';
    if(archetypeId==='sect-retainer'){
      const location=LOCATION_TEMPLATES[locationId],parent=LOCATION_TEMPLATES[location?.parentId];
      person.faction=location?.type?.includes('宗门')?location.name:parent?.type?.includes('宗门')?parent.name:location?.type?.includes('宗族')?location.name:'当地宗门驻外事务所';
    }
    const locationName=LOCATION_TEMPLATES[locationId]?.name ?? '当地';
    const presetProfile=isPresetLocationCastSource(person.generatedBy);
    const profile=npcLoadouts.profile(person,locationName,options.profile??(options.personality?{values:person.personality}:undefined));
    person.扩展.characterProfile={version:1,status:presetProfile?'complete':'draft',source:presetProfile?'preset':'rules-draft',data:profile};
    if(!options.personality)person.personality=profile.values;
    person.扩展.creationBudget={version:1,limits:npcCreationBudget(archetypeId),source:person.generatedBy};
    const shell = ensurePossessionShell(state, id);
    if (options.deferDetails === true) {
      // Unknown story-object ages must remain unknown before the life ledger is created.
      if (options.age === undefined) person.age=null;
      person.tier='light';
      person.扩展.deferredNpc={version:1,sourceId:options.deferredSourceId,options:Object.fromEntries(['level','martialSoulTemplateId','martialSoulDraft','presetId'].filter(k=>options[k]!==undefined).map(k=>[k,clone(options[k])]))};
    } else {
      const wallet=options.wallet ?? rng.int(archetype.wallet[0], archetype.wallet[1]);
      if(!Number.isSafeInteger(wallet)||wallet<0||wallet>archetype.wallet[1])throw new Error('人物初始现金超出定位预算');
      state.钱包.列表[shell.walletId].gold = wallet;
      grantKit(state, id, archetype.kit, 'npc-identity-kit');
      person.扩展.creationBudget.used={wallet,kit:archetype.kit.reduce((n,[templateId,quantity])=>n+calculateItemValue(templateId)*quantity,0)};
    }
    people.initialize(state,id,{level:options.level??0});
    if (person.tier === 'full') promoteNpcInternal(state, id, {level: options.level, martialSoulTemplateId: options.martialSoulTemplateId, martialSoulDraft: options.martialSoulDraft, supportCapabilities: options.supportCapabilities,soulLoadouts:options.soulLoadouts,presetId:options.presetId});
    if (archetype.shop && !person.扩展.deferredNpc) createShopInternal(state, id, archetype.shop, locationId);
    if(!options.deferDetails||options.age!==undefined&&options.gender!==undefined)genericVisuals.assign(state,person);
    return person;
  }

  function setNpcGender(rawState,{mode},transactionId) {
    const guard=transactionStart(rawState,transactionId,'设置随机人物性别');
    if(guard.duplicate)return {state:guard.state,receipt:guard.receipt,idempotent:true};
    if(!guard.state.角色.已建立||!['random','male','female'].includes(mode))throw Error('请在已开始的旅程中选择随机人物性别');
    guard.state.世界.npcGender=mode;
    return commit(guard.state,transactionId,'设置随机人物性别',{type:'npc-gender-setting',mode,summary:'已保存之后随机生成的人物性别偏好。'});
  }
  function spawnNpc(rawState, options, transactionId) {
    const guard = transactionStart(rawState, transactionId, '生成人物');
    if (guard.duplicate) return {state: guard.state, receipt: guard.receipt, idempotent: true};
    const person = spawnNpcInternal(guard.state, options);
    return commit(guard.state, transactionId, '生成人物', {type: 'npc-spawned', personId: person.id, tier: person.tier, name: person.name, identity: person.identity, locationId: person.locationId, summary: `${person.name}以${person.identity}身份登记在${LOCATION_TEMPLATES[person.locationId]?.name ?? person.locationId}`});
  }

  function npcMartialSoulBudget(archetypeId) {
    return npcCreationBudget(archetypeId).martialSoul;
  }

  // A default allocation, not an eligibility change: an explicitly supplied
  // valid source and an already paid draft retain the existing hard ceiling.
  function npcMartialSoulDesignBudget(archetypeId) {
    const a=NPC_ARCHETYPES[archetypeId],max=npcMartialSoulBudget(archetypeId);
    return a.full&&a.level[0]<31?Math.min(max,29):max;
  }

  function npcCreationBudget(archetypeId) {
    const a=NPC_ARCHETYPES[archetypeId];
    if(!a)throw new Error('人物定位不存在');
    return {levels:clone(a.level),martialSoul:a.full?(a.martialSoulBudget??(a.level[0]>=91?80:a.level[0]>=61?60:40)):0,attributes:a.full?27:0,talents:0,
      wallet:clone(a.wallet),kit:a.kit.reduce((n,[id,count])=>n+calculateItemValue(id)*count,0),fee:a.escort?.fee??0};
  }

  function npcCreationAttributes(archetypeId,rng,requested) {
    const budget=npcCreationBudget(archetypeId).attributes;
    const keys=foundation.ATTRIBUTE_KEYS;
    let attributes=requested;
    if(!attributes){
      attributes=Object.fromEntries(keys.map(k=>[k,8]));
      const priorities=archetypeId.includes('hunter')||archetypeId==='sea-guide'?['感知','身法']:
        archetypeId==='spirit-hall-worker'?['意志','悟性']:['力量','体魄'];
      let spent=0;
      while(true){
        const candidates=keys.filter(k=>attributes[k]<15&&CREATION_RULES.attributeCosts[attributes[k]+1]-CREATION_RULES.attributeCosts[attributes[k]]<=budget-spent);
        if(!candidates.length)break;
        const preferred=candidates.filter(k=>priorities.includes(k));
        const key=rng.pick(preferred.length&&rng.int(0,2)?preferred:candidates);
        spent+=CREATION_RULES.attributeCosts[attributes[key]+1]-CREATION_RULES.attributeCosts[attributes[key]];attributes[key]++;
      }
    }
    if(!plain(attributes)||Object.keys(attributes).some(k=>!keys.includes(k))||keys.some(k=>!Number.isSafeInteger(attributes[k])||attributes[k]<8||attributes[k]>15))throw new Error('人物六维须使用合法创建分配');
    const cost=keys.reduce((n,k)=>n+CREATION_RULES.attributeCosts[attributes[k]],0);
    if(cost>budget)throw new Error('人物六维超出创建预算');
    return {attributes:clone(attributes),cost};
  }

  function resolveDeferredNpcResources(state,person,archetype){
    const deferred=person.扩展.deferredNpc,personId=person.id;
    if(deferred){
      // Resolve the deferred starting resources once, preserving gifts already received.
      const resources=makeRng(`${person.seed}:deferred-resources`),shell=ensurePossessionShell(state,personId);
      state.钱包.列表[shell.walletId].gold+=resources.int(archetype.wallet[0],archetype.wallet[1]);
      grantKit(state,personId,archetype.kit,'npc-identity-kit');
      if(archetype.shop)createShopInternal(state,personId,archetype.shop,person.locationId);
      person.扩展.resolvedNpc={sourceId:deferred.sourceId,at:clone(state.世界.时间)};
      delete person.扩展.deferredNpc;
    }
  }
  function promoteNpcInternal(state, personId, options = {}) {
    const person = state.人物.列表[personId];
    if (!person) throw new Error('待晋升人物不存在');
    if (person.tier === 'full' && state.战斗单位.列表[personId]) return person;
    const archetype = NPC_ARCHETYPES[person.扩展?.archetypeId];
    if (!archetype) throw new Error(`人物${personId}缺少可晋升原型`);
    if(!archetype.full){
      const attributes=npcCreationAttributes(person.扩展.archetypeId,makeRng(`${person.seed}:body`)).attributes;
      state.战斗单位.列表[personId]=foundation.normalizeCombatant({id:personId,名称:person.name,阵营:person.faction,单位种类:'普通人',六维:{基础:attributes},成长:{类型:'普通人',魂力等级:0},位置:{距离区:'近距',站位簇:'npc'}},{id:personId,kind:'普通人',level:0});
      resolveDeferredNpcResources(state,person,archetype);
      person.tier='full';person.combatantId=personId;
      refreshUnitEquipment(state,personId,true);syncItemGrantedActions(state);
      return person;
    }
    const deferred=person.扩展.deferredNpc;
    if(deferred){
      if(!archetype.full)throw new Error('此人物原型没有战斗能力，不能凭空觉醒武魂');
      options={...options,...clone(deferred.options)};
    }
    if(options.presetId||options.martialSoulDraft||options.martialSoulTemplateId||state.扩展?.npcCreationDrafts?.[person.seed])delete person.扩展.npcLoadoutId;
    if(options.presetId){const preset=presets.compile(options.presetId,{budget:npcMartialSoulBudget(person.扩展.archetypeId)});if(!preset.pass||preset.category!=='武魂')throw Error(preset.reason||'人物需要合法武魂预设');options={...options,martialSoulTemplateId:'',martialSoulDraft:presets.request(options.presetId)};person.扩展.presetSoulId=preset.presetId;}
    else if(isPresetLocationCastSource(person.generatedBy)&&!person.扩展.deferredNpc&&!options.martialSoulDraft&&!options.martialSoulTemplateId&&!state.扩展?.npcCreationDrafts?.[person.seed]){
      const loadout=npcLoadouts.select(person.扩展.archetypeId,`${state.世界.seed}:${person.seed}`,npcMartialSoulDesignBudget(person.扩展.archetypeId),npcMartialSoulBudget(person.扩展.archetypeId));
      options={...options,martialSoulTemplateId:'',martialSoulDraft:loadout.draft};person.扩展.npcLoadoutId=loadout.id;
    }
    const preparedDraft=state.扩展?.npcCreationDrafts?.[person.seed];
    if(preparedDraft&&options.martialSoulDraft===undefined)options={...options,martialSoulTemplateId:'',martialSoulDraft:preparedDraft};
    const rng = makeRng(`${person.seed}:promotion`);
    const level = integer(options.level ?? rng.int(archetype.level[0], archetype.level[1]), 1, 99);
    if(level<archetype.level[0]||level>archetype.level[1])throw new Error('人物等级超出定位预算');
    const allocation=npcCreationAttributes(person.扩展.archetypeId,rng,options.attributes),attributes=allocation.attributes;
    const martialSoulTemplateId = clean(options.martialSoulTemplateId, rng.pick(archetype.martialSouls ?? ['blue-silver-grass']));
    if (options.martialSoulDraft !== undefined && clean(options.martialSoulTemplateId)) throw new Error('人物武魂草案与模板不能同时指定');
    const soul = options.martialSoulDraft === undefined ? soulFromTemplate(martialSoulTemplateId, personId, 1)
      : soulFromCompiled(foundation.MARTIAL_SOUL_CORE.finalizeDraft(options.martialSoulDraft, {
        budget: npcMartialSoulBudget(person.扩展.archetypeId), id: `soul-${personId}-1`
      }), personId, 1);
    if (options.martialSoulDraft !== undefined) soul.扩展.generatedBy = person.扩展.npcLoadoutId?'npc-preset-loadout':'npc-custom-creation';
    if((soul.扩展?.结构化武魂??soul.结构化武魂)?.pricing?.total>npcMartialSoulBudget(person.扩展.archetypeId))throw new Error('人物武魂超出创建预算');
    person.扩展.creationBudget??={version:1,limits:npcCreationBudget(person.扩展.archetypeId),source:person.generatedBy};
    person.扩展.creationBudget.used={...person.扩展.creationBudget.used,attributes:allocation.cost,martialSoul:(soul.扩展?.结构化武魂??soul.结构化武魂)?.pricing?.total??0,level};
    state.武魂.列表[soul.id] = foundation.normalizeMartialSoul(soul, personId);
    globalThis.SoulCanonicalGrowth?.bindPresetSoul(state.武魂.列表[soul.id]);
    state.成长.列表[personId] = {id: `growth-${personId}`, 单位ID: personId, 魂力等级: level, 当前经验: 0, 当前等级需求: 100 + level * 25, 瓶颈等级: Math.min(100, Math.ceil(level / 10) * 10), 瓶颈状态: level % 10 === 0 ? '积累经验' : '未到瓶颈', 溢出经验: 0, 可用属性点: 0, 已投入属性点: 0, 每级属性点: 0, 属性投入: Object.fromEntries(foundation.ATTRIBUTE_KEYS.map(key => [key, 0])), 武魂ID列表: [soul.id], 激活武魂ID:soul.id, 扩展: {generated: true}};
    state.战斗单位.列表[personId] = foundation.applyMartialSoulCombatModifiers(foundation.normalizeCombatant({id: personId, 名称: person.name, 阵营: person.faction, 单位种类: '魂师NPC', 标签: [person.identity, person.occupation], 六维: {基础: attributes}, 成长: {类型: '魂师', 魂力等级: level, 成长记录ID: personId}, 位置: {距离区: '近距', 站位簇: 'npc'}}, {id: personId, kind: '魂师NPC', level}), state.武魂.列表[soul.id],state);
    if (plain(options.supportCapabilities)) state.战斗单位.列表[personId].扩展.辅助能力 = merge(state.战斗单位.列表[personId].扩展?.辅助能力 ?? {}, options.supportCapabilities);
    const loadoutId=person.扩展.npcLoadoutId??state.武魂.列表[soul.id].扩展?.canonicalGrowth?.presetId;
    const inherited=Boolean(npcLoadouts.get(loadoutId)?.routeId);
    if(person.扩展.npcLoadoutId||inherited&&!options.soulLoadouts)options={...options,soulLoadouts:[npcLoadouts.loadout(loadoutId,level)]};
    generateRegisteredRings(state, personId, level, person.seed,options.soulLoadouts?{soulLoadouts:options.soulLoadouts,allowInferenceFallback:false,canonicalSkillPreference:inherited,strictCanonicalPreference:inherited,allowCanonicalExpressionGrowth:inherited}:{});
    if(person.扩展.npcLoadoutId){
      const registeredSoul=state.武魂.列表[soul.id],base=registeredSoul.扩展.结构化武魂.baseAction;
      base.name=`${registeredSoul.名称}·基础运用`;
      registeredSoul.扩展.专属基础动作=clone(base);
      registeredSoul.扩展.baseActionNaming={source:'preset'};
      for(const ringId of registeredSoul.魂环ID列表)for(const skillId of state.魂环.列表[ringId].魂技ID列表){
        const skill=state.技能.列表[skillId];skill.namingSource='preset';skill.扩展.命名来源='preset';
      }
      state.战斗单位.列表[personId]=foundation.applyMartialSoulCombatModifiers(state.战斗单位.列表[personId],registeredSoul,state);
    }
    resolveDeferredNpcResources(state,person,archetype);
    const initialSoul=state.武魂.列表[soul.id].扩展?.结构化武魂??state.武魂.列表[soul.id].结构化武魂;
    if(initialSoul?.exchangeContracts?.some(c=>c.mode!=='condition')){state.成长.列表[personId].激活武魂ID='';foundation.switchActiveMartialSoul(state,personId,soul.id,{operationId:`npc-initial-soul:${personId}:${person.seed}`});}
    person.tier = 'full';
    person.combatantId = personId;
    globalThis.SoulResidentRealms.installActor(state,personId,`npc-created:${personId}:${person.seed}`);
    refreshUnitEquipment(state,personId,true);
    syncItemGrantedActions(state);
    return person;
  }

  function promoteNpc(rawState, options, transactionId) {
    const guard = transactionStart(rawState, transactionId, '晋升人物');
    if (guard.duplicate) return {state: guard.state, receipt: guard.receipt, idempotent: true};
    const person = promoteNpcInternal(guard.state, clean(options?.personId), options);
    return commit(guard.state, transactionId, '晋升人物', {type: 'npc-promoted', personId: person.id, tier: person.tier, combatantId: person.combatantId, summary: `${person.name}已建立完整战斗档案`});
  }

  function createShopInternal(state, merchantId, templateId = 'general', locationId = state.地图.当前地点ID) {
    const existing = Object.values(state.商店.列表).find(shop => shop.merchantId === merchantId && shop.status === 'open');
    if (existing) return existing;
    const template = SHOP_TEMPLATES[templateId];
    if (!template) throw new Error(`未知商店模板：${templateId}`);
    const id = nextId(state, 'shop');
    const containerId = `container-${id}-stock`;
    state.容器.列表[containerId] = {id: containerId, type: 'shop-stock', ownerEntityId: merchantId, locationId, itemIds: [], capacity: {slots: 200}, status: 'active', 扩展: {shopId: id}};
    const shop = {id, name: template.name, merchantId, locationId, stockContainerId: containerId, buyMultiplier: template.buyMultiplier, sellMultiplier: template.sellMultiplier, restockDay: state.世界.时间.day + 3, status: 'open', templateId, 扩展: {}};
    state.商店.列表[id] = shop;
    for (const [itemTemplateId, quantity] of template.stock) createItem(state, itemTemplateId, merchantId, containerId, {quantity, provenance: {type: 'merchant-stock', shopId: id}});
    return shop;
  }

  // Authored starting residents, instantiated through the ordinary budgeted creator.
  // Existing residents are reused by slot; these presets never overwrite a save.
  const OPENING_CAST_PRESETS = Object.freeze({
    'loc-heaven-auction:slot-auction-accountant': {
      id:'auction-accountant',name:'陆怀瑾',age:39,gender:'男',wallet:24000,identity:'独立商行账房',occupation:'账房',
      appearance:'青灰长衫袖口整洁，随身皮册夹着薄纸，手指留有墨痕。',personality:'谨慎克制，做决定前先核对责任与实际费用。',
      profile:{biography:'陆怀瑾在天斗城替商行核账多年，积蓄与商行公款分别保管。他常到拍卖场了解成交行情，偶尔以个人身份竞买，也会因后续负担过重而退出。随身钱币是他自己的积蓄，不能代表商行无限垫付。',values:'条款要说清，承接责任就要有实际照料的本钱。',speech:'语气平稳，习惯先复述价款，再问交付边界。',shortTermGoal:'核对近期拍卖行情，判断是否有值得本人承接的交易。',longTermGoal:'积攒独立经营的本钱，降低对雇主的依赖。'}
    },
    'loc-heaven-auction:slot-auction-collector': {
      id:'auction-collector',name:'许照棠',age:33,gender:'女',wallet:18000,identity:'器物收藏者',occupation:'收藏者',
      appearance:'深紫短披肩别着银扣，腰间挂着小镜和尺，目光常停在器物接缝处。',personality:'好奇认真，有自己的取舍，不为争胜抬高承受范围。',
      profile:{biography:'许照棠跟着家中长辈学习辨识旧器物，在天斗城经营小规模收藏与转售。她来拍卖场查看器具，也关心随交易转移的实际权利。她使用自己的钱币，发现修理、照料或履约负担超出预期时会停止竞价。',values:'器物应按真实能力估价，人情和责任不能被一句含糊承诺带过。',speech:'说话直接，会追问具体状态和使用条件。',shortTermGoal:'查看场内实际交易，挑选自己负担得起的标的。',longTermGoal:'形成稳定的收藏与转售生计，保留自由出行的余地。'}
    },
    'loc-hunting-forest:slot-hunting-guide': {
      id:'forest-guide',name:'顾照野',age:34,gender:'男',wallet:4200,level:18,martialSoulTemplateId:'woodland-bow',
      appearance:'灰布短衣外罩旧皮肩，右眉有一道浅疤，腰间挂着绳索与猎刀。',personality:'谨慎直率，重视同行者的安全，不肯为赏钱冒无谓的险。',
      profile:{biography:'顾照野生在猎魂森林附近的猎户家，少年时跟着母亲辨认兽迹、修补猎具。觉醒青木弓后，他以狩猎和带路为生；十八级的修为让他更懂得选择能承担的风险。一次雨季失路使同伴伤了腿，此后每次出发他都会先讲明路线和撤退安排。闲时他照看家中的老人，修整磨损的猎具。',values:'报酬可以商量，危险必须先说清；带人进林，就要认真对待每个人回程的路。',speech:'句子短，说明风险时会指着实物举例；不许空诺，常说“先看路，再谈赶不赶得上”。',shortTermGoal:'攒齐修缮家中漏雨屋顶的钱，把常走的岔路重新做上记号。',longTermGoal:'整理一份可靠的林缘路线册，教会年轻猎户判断何时应当回头。'},
      baseAction:{name:'穿林风矢',description:'拉开青木弓射出一道风属性魂力箭，瞄准一名敌人发动远程攻击。'},
      ringSkills:[{name:'青藤贯矢',description:'将木属性魂力凝在箭上，瞄准一名敌人射击，命中后造成木属性伤害。'}]
    },
    'loc-notting-city:slot-notting-store': {
      id:'notting-merchant',name:'陆清禾',age:51,gender:'男',wallet:24000,
      appearance:'深蓝长衫的袖口缝着补丁，随身带一册包角账簿。',personality:'细致守信，不善夸口，愿意把价目解释清楚。',
      profile:{biography:'陆清禾早年替往来圣魂村的行商抄账，后来在诺丁城经营杂货买卖。他曾替病中的父亲独自撑过一个淡季，知道小额欠账也能压垮一家人。因此他把家用和货款分簿记下，每次去村中核对货单，都把约好的交接写清楚。',values:'小买卖也要讲信誉，先验货再付钱，答应的价不临时反悔。',speech:'语调平和，先报数再说明缘由，谈欠款时逐项翻账核对。',shortTermGoal:'核清下一趟圣魂村往来的货单，留足老人看病的日常开支。',longTermGoal:'让年轻人接得住生意，自己仍能守着熟悉的街坊安稳过日子。'}
    },
    'loc-balak-city:slot-balak-store': {
      id:'balak-merchant',name:'许兰舟',age:39,gender:'女',wallet:26000,
      appearance:'褐色窄袖衣衫，发髻利落，指间常夹着写有价目的纸签。',personality:'爽利务实，谈价直接，遇到困难肯自己跑一趟。',
      profile:{biography:'许兰舟曾随父亲往返巴拉克城与诺丁城，为商队清点日用品。父亲退休后，她留在巴拉克城独立经营，凭按时结账在本地商会站稳脚跟。运费让薄利生意更难周转，她仍亲自核验货单，把个人积蓄和商行本钱分开。',values:'利润要算明白，人情不能代替契约，谈定的事就按约办。',speech:'说话干脆，先问数量与交接时间，不喜欢绕圈子的试探。',shortTermGoal:'整理诺丁城往来的账单，减少一次不必要的空车往返。',longTermGoal:'攒够购置固定铺面的钱，让母亲不再担心租期到了搬家。'}
    },
    'loc-soto-city:slot-soto-store': {
      id:'soto-merchant',name:'沈映棠',age:28,gender:'女',wallet:22000,
      appearance:'浅绿衣裙外系短围腰，辫梢束着细绳，走路轻快。',personality:'热络机敏，记得熟客的习惯，但不会轻易赊账。',
      profile:{biography:'沈映棠从索托集市的小摊起家，替姨母照料生意时学会辨认货物成色。如今她在索托城独立做日用杂货买卖，仍常去集市核价。她耐心接待初次出门的年轻人，却也记着被赊账拖累的教训，把生活费与周转款分开保管。',values:'让顾客明白买了什么，比说漂亮话更能留住回头客。',speech:'语气明快，常用日常小事作比，谈到账期时认真确认。',shortTermGoal:'核对集市近期报价，理清几笔尚未对上的收货记录。',longTermGoal:'把生意做得稳当，让姨母能少操心、多休息。'}
    },
    'loc-silves-city:slot-silves-store': {
      id:'silves-merchant',name:'林承安',age:46,gender:'男',wallet:25000,
      appearance:'深灰旅袍的衣角有旧泥痕，胡须修得很短，背着耐磨皮袋。',personality:'寡言警觉，重视退路，做事留有余地。',
      profile:{biography:'林承安出身脚夫家庭，年轻时随商队奔走，后来在西尔维斯城定居。他见过赶路的人为省一夜住宿而损失整车货物，也曾在索托城等过迟来的交接人。如今他经营杂货，宁可少赚，也把运费、货款和家用各自记清。',values:'账要清，路要稳，不能拿一家人的生计赌一次侥幸。',speech:'声音低，回答前常停片刻，习惯先问“最迟哪天交，误了怎么办”。',shortTermGoal:'核清索托城往来的账目，为下一次出行留足路费。',longTermGoal:'积攒一份不靠冒险维持的家业，晚年少在路上奔波。'}
    },
    'loc-heaven-dou-city:slot-heaven-store': {
      id:'heaven-merchant',name:'裴知衡',age:43,gender:'男',wallet:30000,
      appearance:'靛青长衣熨得平整，银灰束带上挂着小秤与笔囊。',personality:'克制谨慎，重视凭据，不因对方身份改变称量。',
      profile:{biography:'裴知衡曾在天斗城的大商行做账房，后来拿积蓄独立经营。他熟悉城中核价规矩，去拍卖场附近办事总带齐凭据。小生意难与大商行争价，他便靠细致交接和明确账目维持熟客，为孩子的生活开支单留一份积蓄。',values:'身份高低不能改变账上的数字，未经核实的消息不值得押上本钱。',speech:'措辞礼貌明确，将条件逐项复述，请对方确认后再往下谈。',shortTermGoal:'整理城内交接凭据，核对拍卖场周边的日用品行情。',longTermGoal:'建立独立经营的长久信誉，让子女有从容选择职业的余地。'}
    },
    'loc-longxing-city:slot-longxing-store': {
      id:'longxing-merchant',name:'姚砚秋',age:36,gender:'女',wallet:27000,
      appearance:'栗色短袄配耐磨长裤，指腹有翻账与搬货留下的薄茧。',personality:'沉稳耐心，喜欢亲手验货，对含糊的承诺很警惕。',
      profile:{biography:'姚砚秋的家人做过修补农具的生意，她从小听工匠讨论材料与损耗。后来她在龙兴城经营杂货，常为庚辛城方向的往来清点票据。商路的变化让她更加谨慎，私人储蓄单列一账，不懂的工艺宁愿多问，也不拿传闻招揽顾客。',values:'不懂就问，没验过就不作保证，不把差错转嫁给别人。',speech:'先听完再回答，常说“把成色摆出来，我们逐件看”。',shortTermGoal:'核清庚辛城往来的交接单，为修补家中房梁预留费用。',longTermGoal:'建立可靠的长期生意，减少家人对路途风险的担忧。'}
    },
    'loc-sea-breeze-city:slot-sea-breeze-store': {
      id:'sea-breeze-merchant',name:'温海棠',age:32,gender:'女',wallet:23000,
      appearance:'淡蓝短衫袖口卷起，发间别着木簪，鞋面沾着细盐痕。',personality:'温和利落，善于协调，对模糊的交货日期寸步不让。',
      profile:{biography:'温海棠在瀚海城长大，家中有人做过码头杂工。她熟悉潮湿天气里货物受损的麻烦，经营杂货后仍亲自去瀚海港核对交接。一次迟迟未清的欠账让她学会写明期限，她待人和气，却不再让家用与货款混在一起。',values:'体谅要有边界，海上变化多，陆上的账更不能糊涂。',speech:'语调轻快，先把双方的话复述清楚，再提出具体日期。',shortTermGoal:'核清瀚海港的交接记录，检查雨季的货物保管安排。',longTermGoal:'让生意足够稳定，陪家人住进不再返潮漏水的房子。'}
    },
    'loc-star-luo-city:slot-star-luo-store': {
      id:'star-luo-merchant',name:'杜明川',age:48,gender:'男',wallet:29000,
      appearance:'黑褐长衫，肩背挺直，腰带上收着印泥盒和一串旧钥匙。',personality:'严谨自持，重视次序，也愿意替守信的人留余地。',
      profile:{biography:'杜明川年轻时替家族商队看账，后来在星罗城分家自立。他常与庚辛城方向的商旅核对货单，知道一处漏写的规格能让两地争执很久。他把经营账与家庭账分开，做事看似不近人情，却始终记着创业时别人守约相助的情分。',values:'规矩对所有人一致，帮助别人也要量力，不能借善意掩盖亏空。',speech:'语速不快，先列明次序；熟悉后会用旧时跑商的故事解释判断。',shortTermGoal:'复核庚辛城往来账单，处理两份写法不一致的收据。',longTermGoal:'留下一份账目清楚、信誉稳固的产业，让后辈不从争议中接手生计。'}
    },
    'loc-gengxin-city:slot-gengxin-store': {
      id:'gengxin-merchant',name:'程砺生',age:41,gender:'男',wallet:28000,
      appearance:'粗布衣的肘补磨得发亮，掌纹深，身旁总放着结实木匣。',personality:'坦率执拗，敬重手艺，讨厌拿外观冒充成色。',
      profile:{biography:'程砺生的父亲是庚辛城的普通铁匠，他小时候帮着送零件，后来转做杂货买卖。他常到金属市场核对成色与价目，知道细小的材料差别也影响工匠劳作。生意忙时他仍回老街看望父亲，个人存款与日常货款从不混作一笔。',values:'货物好坏要讲实话，不让干活的人替商人的虚夸受罪。',speech:'说话直，爱举做工的例子，听见含糊的成色介绍就追问。',shortTermGoal:'核对金属市场的新价目，理清积压的送货单据。',longTermGoal:'修整家里的老宅，让父亲年老后仍有一处顺手的小工房。'}
    },
    'loc-spirit-city:slot-spirit-store': {
      id:'spirit-merchant',name:'白汐宁',age:37,gender:'女',wallet:26000,
      appearance:'米白衣衫配深色披肩，眉眼沉静，票据按大小整理成束。',personality:'审慎守约，不攀附权势，不轻信未经核实的消息。',
      profile:{biography:'白汐宁随母亲迁居武魂城，最初替旅人整理行装，后来独立经营杂货。往来嘉陵关时，她见过有人凭消息囤货吃亏，便更重视实在需求与清楚交接。她属于本地商会，经营自己的小生意，并不借大人物的名头揽客，母亲的生活开支也另列一账。',values:'有凭有据才能交付，安稳谋生比追逐风声重要。',speech:'音量不高，分清亲眼所见与转述，遇到夸张说辞会追问来源。',shortTermGoal:'核清嘉陵关方向的单据，让母亲有一段不必操劳的休息时间。',longTermGoal:'保持独立可靠的生意，让一家人在城中安稳生活。'}
    },
    'loc-sea-breeze-port:slot-port-store': {
      id:'port-merchant',name:'邵归帆',age:45,gender:'男',wallet:24000,
      appearance:'深蓝短褂，皮肤晒得偏深，粗绳束住袖口，鞋底带着砂砾。',personality:'豁达但不草率，愿意帮忙，尤其在意交接是否清楚。',
      profile:{biography:'邵归帆做过多年码头搬运，伤过肩后改在瀚海港做杂货买卖。他熟悉瀚海城与港口之间的往来，知道一张模糊货单会让双方争执。如今他仍肯搭手搬一件轻货，却不再逞强，经营本钱、个人积蓄和家中开支都分开记账。',values:'帮忙要量力，交接要当面，不让客气话变成说不清的债。',speech:'带几分爽朗笑意，爱讲码头小事，确认数量时却很认真。',shortTermGoal:'核对瀚海城方向的交接单，安排一次陪妻子探亲的空闲。',longTermGoal:'稳稳维持一家人的生活，年老后还能坐在港边看熟悉的船来往。'}
    }
  });

  function spawnLocationResident(state,locationId,slot,spawnIndex,generatedBy) {
    const slotKey=`${locationId}:${slot.id}`,preset=OPENING_CAST_PRESETS[slotKey];
    if(preset&&state.人物.列表[`opening-cast-${preset.id}`])throw new Error('开局人物登记冲突，已有档案不能被预设覆盖');
    const person=spawnNpcInternal(state,{archetypeId:slot.archetype,locationId,spawnIndex,generatedBy,
      seed:preset?`opening-cast:${preset.id}:v1`:`${state.世界.seed}:${slotKey}`,
      ...(preset?{id:`opening-cast-${preset.id}`,name:preset.name,age:preset.age,gender:preset.gender,appearance:preset.appearance,personality:preset.personality,wallet:preset.wallet,profile:clone(preset.profile),identity:preset.identity,occupation:preset.occupation,level:preset.level,martialSoulTemplateId:preset.martialSoulTemplateId}:{})});
    person.扩展.slotKey=slotKey;
    if(!preset)return person;
    if(preset.baseAction){
      const soul=state.武魂.列表[state.成长.列表[person.id].武魂ID列表[0]],base=soul.扩展.结构化武魂.baseAction;
      Object.assign(base,preset.baseAction);soul.扩展.专属基础动作=clone(base);soul.扩展.baseActionNaming={source:'preset'};
      const skills=soul.魂环ID列表.flatMap(id=>state.魂环.列表[id].魂技ID列表).map(id=>state.技能.列表[id]);
      if(skills.length!==preset.ringSkills.length)throw new Error('开局人物的预设魂技与编译结果不一致');
      skills.forEach((skill,index)=>{const label=preset.ringSkills[index];Object.assign(skill,{name:label.name,名称:label.name,description:label.description,namingSource:'preset'});Object.assign(skill.扩展,{描述:label.description,命名来源:'preset'});});
      state.战斗单位.列表[person.id]=foundation.applyMartialSoulCombatModifiers(state.战斗单位.列表[person.id],soul,state);
    }
    return person;
  }

  function ensureLocationCast(state, locationId, {includeRecruitment=false}={}) {
    const location = LOCATION_TEMPLATES[locationId];
    if (!location) return [];
    const people = [];
    for (const [index, slot] of location.slots.entries()) {
      if(slot.id.startsWith('recruit-')&&!includeRecruitment)continue;
      const slotKey = `${locationId}:${slot.id}`;
      let person = Object.values(state.人物.列表).find(item => item.扩展?.slotKey === slotKey);
      if (!person) {
        person = spawnLocationResident(state,locationId,slot,index+1,slot.id.startsWith('recruit-')?'recruitment-cast':'location-cast');
      }
      people.push(person.id);
    }
    return people;
  }

  function stockHooks(){return {LOCATION_TEMPLATES,ITEM_TEMPLATES,createItem,transferItem,calculateItemValue,quotePrice,itemGrade,findFreightPath:findFreightPathInState,personalActionBlockReason};}
  function initializeAuctionVenue(state){
    const presets=[
      {id:'auction-owner-gu',name:'顾廷章',archetypeId:'auction-owner',level:62,age:51,martialSoulTemplateId:'patrol-shield',appearance:'深褐长袍衣襟别着旧金扣，鬓边有灰，手中的账册边角磨得发亮。',personality:'沉稳精明，愿承担有清楚边界的委托，重视商号声誉。',profile:{biography:'顾廷章从替商行押运货箱起家，后来与旧伙伴经营天斗拍卖场。他在一次交接争执中赔掉过整年的利润，此后坚持把器物所有权、看管权限和控制来源分别写明。三百万金币是他多年经营所得的个人储备，拍卖价款另以托管账本保管。',values:'委托的实物必须在场，承诺只到能够实际履行的地方。',speech:'语气平缓，谈风险时逐项说明，不借名头许诺。',shortTermGoal:'核清本场稀有器物的来源，让仓库交接平稳完成。',longTermGoal:'让商号在两大帝国间维持独立和信誉。'}},
      {id:'auction-host-su',name:'苏晚晴',archetypeId:'auction-host',level:25,age:29,martialSoulTemplateId:'healing-staff',appearance:'绛色长衣袖口窄收，长发盘在耳后，台前留着一盏便于辨物的白灯。',personality:'沉着敏锐，说明清楚，遇见未核实的能力会停下追问。',profile:{biography:'苏晚晴曾为药铺接待远行魂师，练成了在喧哗里把关键条件讲清的习惯。她受雇主持天斗拍卖，熟悉器物登记和竞价次序；她的二十五级修为与四千五百金币积蓄都属于自己。她不会把受封存者的沉默说成忠诚，也不会隐去开启后仍会存在的风险。',values:'每次出价都应建立在听清条款之后。',speech:'声线清晰，介绍来历后立即说明效果、条件和交付内容。',shortTermGoal:'把本场拍品的真实状态逐件向竞买者说明。',longTermGoal:'积累鉴物经验，建立自己的主持声誉。'}}
    ];
    for(const preset of presets){const p=spawnNpcInternal(state,{...preset,locationId:auction.VENUE,generatedBy:'authored-commerce-opening'});labelCuratedActor(state,p);}
    const warehouseId='container-heaven-auction-warehouse';state.容器.列表[warehouseId]={id:warehouseId,type:'auction-warehouse',ownerEntityId:presets[0].id,locationId:auction.VENUE,itemIds:[],capacity:{slots:100},status:'active',扩展:{venueId:auction.VENUE}};
    const businessWalletId='business-heaven-auction';state.钱包.列表[businessWalletId]={id:businessWalletId,ownerEntityId:presets[0].id,gold:0,扩展:{auctionBusiness:true}};
    assets.transferGold(state,state.人物.列表[presets[0].id].walletId,businessWalletId,100000,`world-opening:${state.世界.seed}`,'auction-capital');
    state.世界.auctionVenue=publicAuction.stamp({version:1,ownerId:presets[0].id,hostId:presets[1].id,warehouseId,businessWalletId,sourceId:`world-opening:${state.世界.seed}`,at:people.now(state)});
  }
  function labelCuratedActor(state,person){
    const labels=curated.ACTOR_LABELS[person.id];if(!labels)throw Error('精品世界人物缺少固定能力命名');
    person.扩展.characterProfile.status='complete';person.扩展.characterProfile.source='preset';
    // A selected loadout already names its actual soul and ring effects.
    // Fixed person prose belongs only to the explicitly authored soul below.
    if(person.扩展.npcLoadoutId)return;
    for(const soulId of state.成长.列表[person.id]?.武魂ID列表??[]){
      const soul=state.武魂.列表[soulId],base=soul.扩展.结构化武魂.baseAction;
      Object.assign(base,{name:labels.base,description:labels.flavor+(base.description??'')});soul.扩展.专属基础动作=clone(base);soul.扩展.baseActionNaming={source:'preset'};
      const skills=soul.魂环ID列表.flatMap(id=>state.魂环.列表[id].魂技ID列表).map(id=>state.技能.列表[id]);
      if(skills.length>labels.skills.length)throw Error('精品人物魂技数量超出固定命名合同');
      skills.forEach((skill,index)=>{const description=labels.flavor+(skill.description??skill.扩展?.描述??'');Object.assign(skill,{name:labels.skills[index],名称:labels.skills[index],description,namingSource:'preset'});Object.assign(skill.扩展,{描述:description,命名来源:'preset'});});
      state.战斗单位.列表[person.id]=foundation.applyMartialSoulCombatModifiers(state.战斗单位.列表[person.id],soul,state);
    }
  }
  function initializeRegionalStores(state){
    for(const locationId of Object.keys(designs.REGIONS)){
      let merchant;
      if(locationId==='loc-tang-heaven-dou'){
        merchant=spawnNpcInternal(state,{id:'tang-shopkeeper-luo',name:'罗清砚',archetypeId:'commerce-merchant',level:24,age:46,locationId,wallet:18000,generatedBy:'authored-tang-opening',profile:{biography:'唐门已在1650开局前成立。罗清砚在天斗分号经营一次性暗器，以个人财产与商铺经营账分开核算。',values:'实物、用途、价格当面讲清。',speech:'谈价简明，重视材料和实际数量。',shortTermGoal:'核清首批十二款暗器库存。',longTermGoal:'经营稳定的唐门分号。'}});merchant.faction='唐门';merchant.扩展.slotKey='loc-tang-heaven-dou:slot-tang-shop';
        const artisan=spawnNpcInternal(state,{id:'tang-artisan-wei',name:'魏砺川',archetypeId:'commerce-artisan',level:31,age:39,locationId,wallet:14000,generatedBy:'authored-tang-opening',identity:'唐门分号工匠',profile:{biography:'魏砺川在已成立的唐门天斗分号从事投掷器制作，材料、工时和工钱逐笔登记。',values:'工艺署名与材料来源真实。',speech:'先示范器物，再谈可用条件。',shortTermGoal:'完成有限批次制式暗器。',longTermGoal:'以可靠工艺维持个人生计。'}});artisan.faction='唐门';
      }else if(locationId==='loc-hunting-forest'){
        merchant=spawnNpcInternal(state,{id:'merchant-hunting-supply',name:'林照川',archetypeId:'merchant',age:43,locationId,wallet:22000,generatedBy:'regional-world-opening',profile:{biography:'林照川在猎魂森林入口经营补给铺，曾替猎人修补行囊。店铺货款另立一账，每批药物只进少量，留出收购猎获材料的本钱。',values:'药效和数量都应当面讲清。',speech:'习惯拿实物说明，用语朴实。',shortTermGoal:'核清下一批补给，修好铺门。',longTermGoal:'让猎人和家人都有稳定的收入。'}});
        merchant.扩展.characterProfile.status='complete';merchant.扩展.characterProfile.source='preset';
      }else{
        const slot=LOCATION_TEMPLATES[locationId].slots.find(v=>v.archetype==='merchant'),key=`${locationId}:${slot.id}`;
        merchant=Object.values(state.人物.列表).find(v=>v.扩展?.slotKey===key)??spawnLocationResident(state,locationId,slot,1,'regional-world-opening');
      }
      const names={'loc-notting-city':'周桂禾','loc-balak-city':'范柏川','loc-soto-city':'杜行舟','loc-silves-city':'薛涵声','loc-heaven-dou-city':'孟照秋','loc-longxing-city':'孔立原','loc-gengxin-city':'叶铸霖','loc-sea-breeze-city':'谭潮安','loc-sea-breeze-port':'高泊宁','loc-star-luo-city':'陆承晖','loc-spirit-city':'白若堂','loc-hunting-forest':'韩木生','loc-tang-heaven-dou':'齐铁衡'};
      const supplier=spawnNpcInternal(state,{id:`supplier-${locationId}`,name:names[locationId],archetypeId:'merchant',age:44,gender:'男',locationId,wallet:18000,generatedBy:'registered-commerce-supplier',identity:locationId==='loc-tang-heaven-dou'?'唐门外部供料经办':'登记外部供应人',profile:{biography:`${names[locationId]}为${LOCATION_TEMPLATES[locationId].name}登记的有限批次供应人，只受理已付款订单，交货需一个世界日；经营收款与个人钱包分开。`,values:'来源、付款和数量可核对。',speech:'先看订单，再说明真实交期。',shortTermGoal:'完成已付款的有限批次。',longTermGoal:'保持稳定的供货生计。'}});supplier.扩展.characterProfile.status='complete';supplier.扩展.characterProfile.source='preset';
      stock.create(state,locationId,merchant.id,stockHooks(),supplier.id);
    }
  }

  function initializeRareCommerce(state,sourceId,config={}){
    const titledTargetId=config.background?.id==='sealed-titled'?backgrounds.targetId(config.background):'captive-title-jiang';
    const registerOpeningLot=d=>{if(d.personId!==backgrounds.targetId(config.background)){const quote=publicAuction.catalogQuote(state,{...d,sellerId:d.sellerId??'commerce-consignor-ruan'});commerceSource.registerLot(state,{...d,reserveGold:quote.reserveGold});}};
    globalThis.SoulBackgroundOpening?.prepareRare(state,config,sourceId,globalThis.SoulWorldEngine);
    commerceSource.begin(state,sourceId);const place=auction.VENUE,ownerId='commerce-consignor-ruan';
    const authored=[
      {id:ownerId,name:'阮承砚',archetypeId:'commerce-consignor',level:94,age:167,martialSoulTemplateId:'iron-spear',identity:'游商兼原看管者',appearance:'黑色长衣上缀着旧商号银线，右手指节留有握枪厚茧，目光常在货箱与出口之间巡视。',personality:'重利、戒备，习惯把力量与契据一起当作筹码。',profile:{biography:'阮承砚在帝国边境经营稀有器物。他在旧有纷争中控制了沈砚舟与江暮衡，又从另一条既存货源取得林栖月；这些事实登记为世界创建时的看管来源，不是玩家参与过的战斗。他得到三座跨时代封神台样器后准备各寄卖一次，仍把他人的意志视为无法写进价格的风险。',values:'只承诺实际掌握的财货和控制权限，报酬与风险必须写明。',speech:'言语克制，谈价时直截了当，避免讨论被看管者的感受。',shortTermGoal:'交清本次有限拍品，收回价款。',longTermGoal:'扩大跨地区稀有器物流通，保持自己的力量与独立。'}},
      {id:'captive-guide-shen',name:'沈砚舟',archetypeId:'mercenary',level:28,age:38,martialSoulTemplateId:'trail-hound',identity:'受看管的成年林区向导',appearance:'晒成浅褐的面庞上有一道旧伤，衣袖仍缝着辨路用的细线，手边保留一枚家人赠的铜片。',personality:'谨慎坚韧，熟悉路线，但不把受迫服从当作认同。',profile:{biography:'沈砚舟靠领路与护送谋生，与妹妹沈砚岚保持联系。一次旧有债务和押运争端使他落入阮承砚看管，原有装备、钱包和经历仍归本人。麻绳与禁魂项圈限制行动和能力，不能把他的向导经验直接变成买家的无条件服务。',values:'重视家人与同行者的平安，不愿为利润把别人引入险地。',speech:'说话简短，解释道路时习惯先指出退路。',shortTermGoal:'设法让妹妹得知自己的真实处境。',longTermGoal:'恢复自由，继续以自己的意愿领路谋生。'}},
      {id:titledTargetId,name:'江暮衡',archetypeId:'titled-soul-master',level:92,age:143,martialSoulTemplateId:'patrol-shield',identity:'封号斗罗·暮衡',appearance:'鬓发灰白，肩背仍宽，深色衣料的袖缘压着旧日守护队的纹章。',personality:'沉稳强硬，记得同门和旧友，敌意不会随交易消失。',profile:{biography:'江暮衡在边境护卫生涯中达到九十二级，保留九枚真实魂环与其注册魂技。与阮承砚的旧有冲突后，他在世界初始化时已受封神台式囚锁看管，再被封入真正封神台。他的魂力维持本器封印，个人时间暂停；原伤势、武魂、财物和与陆青禾的同门关系都保持原记录。',values:'看重守护职责与同门信义，对强迫和背约持久记恨。',speech:'措辞沉着，谈立场时不留模糊余地。',shortTermGoal:'等待能够摆脱封印的真实机会。',longTermGoal:'恢复自由并查清旧争端的责任。'}},
      {id:'captive-origin-lin',name:'林栖月',archetypeId:'seasoned-soul-master',level:37,age:26,martialSoulTemplateId:'green-vine',identity:'成年采集者',appearance:'黑发束在颈后，眼睛颜色偏浅，衣领缝着一片银白叶纹；人形身体保留真实旧伤。',personality:'敏锐戒备，珍惜友人的承诺，避免轻信控制者。',profile:{biography:'林栖月以采集和护送维生，与闻溪约定彼此照应。她对旧伤很少提起，面对陌生人的盘问时会先判断对方的来意。她目前失去自由，但没有放弃与友人重逢的打算。',values:'愿意为自由与信任承担风险，拒绝把自己当成可分拆的魂环和魂骨。',speech:'音量平稳，先观察对方是否兑现小的承诺。',shortTermGoal:'从封存中脱身，找到闻溪。',longTermGoal:'在不失去自身意愿的情况下继续人形修炼。'}},
      {id:'commerce-kin-shen',name:'沈砚岚',archetypeId:'hunter',level:22,age:31,identity:'沈砚舟的妹妹',profile:{biography:'沈砚岚在诺丁附近靠猎获和药材谋生。她与哥哥有真实的亲属约定，但起初没有看管消息，必须通过亲眼观察或送达的消息才能行动。',values:'家人平安比收益重要。',speech:'直截了当，询问消息时先核实时间与地点。',shortTermGoal:'完成本地生计，等哥哥来信。',longTermGoal:'与哥哥经营稳定的向导业务。'}},
      {id:'commerce-comrade-lu',name:'陆青禾',archetypeId:'high-soul-master',level:63,age:74,identity:'江暮衡的旧同门',profile:{biography:'陆青禾曾与江暮衡同在边境护卫队。他在索托休整，起初没有江暮衡当前被看管的消息；同门关系让他在取得真实线索后有营救的动机。',values:'重视同门信义，也清楚实力差距。',speech:'问话周密，会先查证线索。',shortTermGoal:'修整装备，处理索托的委托。',longTermGoal:'让旧护卫队成员有可靠的退路。'}},
      {id:'commerce-friend-wen',name:'闻溪',archetypeId:'mercenary',level:28,age:31,identity:'林栖月的友人',profile:{biography:'闻溪曾与林栖月同行采集，认识她的人形日常身份。她在天斗城等待下一次约见；既不知道林栖月的本源，也没有被封存的消息，行动只能建立在实际获知上。',values:'承诺要按时兑现。',speech:'语气温和，得到异常消息时会追问凭据。',shortTermGoal:'准备约见所需的药材。',longTermGoal:'与可信的同伴经营采集和护送生意。'}}
    ];
    for(const p of authored){if(state.人物.列表[p.id])continue;if(p.id==='commerce-comrade-lu'&&config.background?.id==='sealed-titled'&&(config.background.actors?.captive?.source??'default')==='default')p.profile.biography=p.profile.biography.replaceAll('江暮衡',state.人物.列表[titledTargetId].name);if(Object.values(state.人物.列表).some(v=>v.name===p.name))throw Error('原创拍卖人物姓名重复');const person=spawnNpcInternal(state,{...p,locationId:place,generatedBy:'authored-commerce-opening'});labelCuratedActor(state,person);}
    const bonds=[['captive-guide-shen','commerce-kin-shen','kin','loc-notting-city'],[titledTargetId,'commerce-comrade-lu','comrades','loc-soto-city'],['captive-origin-lin','commerce-friend-wen','friends','loc-heaven-dou-city']];
    for(const [actorId,targetId,relationship,home] of bonds){if(actorId===titledTargetId&&config.background?.id==='sealed-titled')continue;const id=`${sourceId}:authored-bond:${actorId}`,r=social.execute(state,{type:'propose-person-relation',actorId,targetId,relationship},id,logisticsHooks());social.execute(state,{type:'respond-person-relation',actorId:targetId,relationId:r.relationId,accept:true,reason:'世界初始人物设计中双方既有的关系；独立生活与意愿继续保留。'},`${id}:response`,logisticsHooks());state.人物.列表[targetId].locationId=home;state.容器.列表[state.人物.列表[targetId].inventoryContainerId].locationId=home;}
    const profile=(id,name,years,categoryId,attributeId,unitId='')=>{const p=cycle.generateSoulBeastProposal({seed:`${state.世界.seed}:${id}`,name,years,biologicalCategoryIds:[categoryId],attributeIds:[attributeId],lineagePoints:75});const value=foundation.normalizeSoulBeastProfile({id,单位ID:unitId,名称:name,年限:years,血脉:p.lineage,种族特征:p.speciesTraits,类别标签:p.categoryTags,属性谱:p.affinitySpectrum,完整度:1,魂环状态:'无',技能种子:p.seed,扩展:{kind:'authored-commerce-origin',initialBatchId:commerceSource.batch(state).id}},unitId);effects.freezeSourceBridges(value);state.魂兽档案.列表[id]=value;return value;};
    for(const design of curated.BONE_DESIGNS){const p=profile(`profile-${design.id}`,design.speciesName,design.ageYears,design.id==='bone-frost-croc'?'category.aquatic':'category.avian',design.attribute==='冰'?'attribute.ice':'attribute.wind');const item=createSoulBoneItem(state,{id:design.id,profile:p,slot:design.slot,ownerEntityId:ownerId,containerId:state.人物.列表[ownerId].inventoryContainerId,name:design.name,activeSkillBlueprints:[{...clone(design.skill),fixedDesign:true}],provenance:{type:'authored-opening-soul-bone',batchId:commerceSource.batch(state).id,profileId:p.id,years:p.年限}});item.扩展.描述=design.description;commerceSource.registerAsset(state,item,design.description);registerOpeningLot({key:design.id,itemId:item.id,assetKind:'item',name:design.name,reserveGold:Math.max(5000,item.valuePoints*5),description:design.description+' 融合后占用对应魂骨部位，可施展其中蕴藏的魂技。'});}
    const originProfile=profile('profile-silver-moon-deer','银枝月鹿',100000,'category.equine','attribute.life','captive-origin-lin');commerceSource.addOrigin(state,'captive-origin-lin',originProfile.id);
    for(const [id,templates] of [['captive-guide-shen',['rope','restraint-seal-collar']],[titledTargetId,['restraint-seal-platform']],['captive-origin-lin',['restraint-cuffs','restraint-seal-platform','restraint-seal-collar']]]){const items=backgroundItems.createItems(state,id,ownerId,config,sourceId,globalThis.SoulWorldEngine,()=>templates.filter(t=>t!=='rope'||people.levelOf(state,id)<=29).map(t=>createItem(state,t,ownerId,state.人物.列表[ownerId].inventoryContainerId).id));commerceSource.installCustody(state,id,ownerId,items,custodyHooks());}
    registerOpeningLot({key:'guide-custody',personId:'captive-guide-shen',assetKind:'person',name:'沈砚舟',reserveGold:12000,description:'沈砚舟是熟悉林区路线的28级向导，随身佩着麻绳与禁魂项圈。他记挂着留在诺丁附近的妹妹，衣物间仍带着林地的气味。'});
    for(const [key,targetId,reserveGold] of [['empty-platform',null,1200000],['titled-platform',titledTargetId,1800000],['origin-platform','captive-origin-lin',2400000]]){const item=createItem(state,'seal-platform',ownerId,state.人物.列表[ownerId].inventoryContainerId,{id:`sample-${key}`});if(targetId){const u=state.战斗单位.列表[targetId];u.资源.生命.当前=Math.max(1,u.资源.生命.最大-12);sealing.enter(state,{type:'seal-person',actorId:ownerId,targetId,itemId:item.id},`${sourceId}:initial-seal:${targetId}`,globalThis.SoulWorldEngine);}commerceSource.registerAsset(state,item,'跨时代九级封神台样器，外壳独立耐久60；锁定被封者本人魂力并冻结个人时间。');registerOpeningLot({key,itemId:item.id,personId:targetId,assetKind:targetId?'loaded-seal':'item',name:targetId?`封神台 · ${state.人物.列表[targetId].name}`:'空封神台',reserveGold,description:targetId?`封神台内封存着${state.人物.列表[targetId].name}，随附囚锁。台体的层层魂纹压住封存中的气息，等待持有者开启。`:'宝石围成淡金光幕，台内尚未封存生命。以封印回路收拢气息后，可将受制的目标封入其中。'});}
    for(const design of designs.PEOPLE.filter(v=>!v.existing)){
      const p=state.人物.列表[design.id]??spawnNpcInternal(state,{...design,seed:`commerce-2.2:${design.id}`,locationId:place,generatedBy:'authored-commerce-opening',soulLoadouts:[{soulIndex:1,desiredCount:design.skills.length,rings:design.skills.map((skill,index)=>({years:skill.years,sourceNote:`人工人物卡：第${index+1}环，早年真实吸收的登记魂兽来源。`,skills:[{name:skill.name,requestedEffects:clone(skill.specs),strictEffects:true,requirements:clone(skill.requirements),cooldownTurns:skill.cooldownTurns,allowProceduralFallback:false}]}))}],profile:{biography:design.biography,values:design.personality,speech:design.speech,shortTermGoal:design.goal,longTermGoal:'恢复独立生活，保留自身意愿和私产。'}});
      if(config.background&&design.id===backgrounds.targetId(config.background))globalThis.SoulBackgroundOpening.localNames(state,p.id,sourceId);
      p.扩展.characterProfile??={version:1,status:'complete',source:'preset',data:{biography:design.biography,values:design.personality,speech:design.speech,shortTermGoal:design.goal,longTermGoal:'恢复独立生活，保留自身意愿和私产。'}};if(p.扩展.characterProfile.source==='rules-draft'){p.扩展.characterProfile.status='complete';p.扩展.characterProfile.source='preset';}p.扩展.commerceUnique={designId:design.id,sourceId,firstAuctionDeferred:design.id==='captive-cat-liu',speciesKind:'human',blueprintNames:design.id==='captive-smith-cheng'?['叠叶护心衣修械图','扣腕牵绳锻制图']:[]};
      if(!(config.background?.id==='prince-cat'&&design.id==='captive-cat-liu')){const relation=designs.CONTACTS.find(v=>v.id===design.relationId),other=spawnNpcInternal(state,{...relation,seed:`commerce-2.2:${relation.id}`,locationId:place,generatedBy:'authored-commerce-relation',profile:{biography:relation.biography,values:'失联线索须核实，重视原人物的自主生活。',speech:'先确认消息来源与时间。',shortTermGoal:'调查失联和逾期。',longTermGoal:'恢复原来的生活与合作。'}});
      const bondId=`${sourceId}:authored-bond:${design.id}`,result=social.execute(state,{type:'propose-person-relation',actorId:p.id,targetId:other.id,relationship:design.relation},bondId,logisticsHooks());social.execute(state,{type:'respond-person-relation',actorId:other.id,relationId:result.relationId,accept:true,reason:'双方初始已存在的真实生活关系；未获知当前关押地点。'},`${bondId}:response`,logisticsHooks());other.locationId=relation.locationId;state.容器.列表[other.inventoryContainerId].locationId=other.locationId;}
      const items=backgroundItems.createItems(state,p.id,ownerId,config,sourceId,globalThis.SoulWorldEngine,()=>design.restraints.map(t=>createItem(state,t,ownerId,state.人物.列表[ownerId].inventoryContainerId).id));commerceSource.installCustody(state,p.id,ownerId,items,custodyHooks());
      registerOpeningLot({key:design.id,personId:p.id,assetKind:'person',name:p.name,reserveGold:design.reserveGold??Math.ceil(designs.personValue(state,p.id)*.7),auctionClass:design.auctionClass,specialDirectory:!!design.specialDirectory,description:design.biography});
    }
    for(const d of designs.BONE_DESIGNS.filter(v=>!curated.BONE_DESIGNS.some(old=>old.id===v.id))){const p=profile(`profile-${d.id}`,d.speciesName,d.ageYears,d.id.includes('bear')?'category.bear':d.id.includes('stag')?'category.equine':'category.aquatic',`attribute.${d.attribute==='火'?'fire':d.attribute==='水'?'water':d.attribute==='雷'?'thunder':'life'}`);const item=createSoulBoneItem(state,{id:d.id,profile:p,slot:d.slot,ownerEntityId:ownerId,containerId:state.人物.列表[ownerId].inventoryContainerId,name:d.name,activeSkillBlueprints:[{...clone(d.skill),fixedDesign:true}],provenance:{type:'authored-opening-soul-bone',batchId:commerceSource.batch(state).id,profileId:p.id,years:p.年限}});item.扩展.描述=d.description;commerceSource.registerAsset(state,item,d.description);registerOpeningLot({key:d.id,itemId:item.id,assetKind:'item',name:d.name,reserveGold:Math.max(1000,Math.ceil(item.valuePoints*.7)),description:d.description});}
    for(const d of designs.RING_DESIGNS){const p=profile(`profile-${d.id}`,d.species,d.years,d.id.includes('hound')?'category.canine':d.id.includes('owl')?'category.avian':d.id.includes('snake')?'category.serpent':'category.aquatic',`attribute.${({'土':'earth','毒蚀':'toxic-corrosion','水':'water','精神':'mind','灵魂':'soul'})[d.attribute]}`);const item=createItem(state,'ring-source',ownerId,state.人物.列表[ownerId].inventoryContainerId,{id:d.id,name:d.name,forceUnique:true,payload:{ringSource:{version:1,kind:'authored-commerce',sourceId:`${sourceId}:${d.id}`,years:d.years,seed:`commerce-2.2:${d.id}`,attributes:[d.attribute],profile:clone(p)}},provenance:{type:'authored-opening-commerce',batchId:commerceSource.batch(state).id,designId:d.id}});commerceSource.registerAsset(state,item,d.origin);registerOpeningLot({key:d.id,itemId:item.id,assetKind:'item',name:d.name,reserveGold:Math.ceil(currentItemValue(item)*.7),description:d.origin+' '+d.reason});}
    for(const d of designs.AUCTION_DESIGNS.filter(v=>v.kind==='item'&&!['seal-platform'].includes(v.id))){const unit=calculateItemValue(d.templateId),quantity=ITEM_TEMPLATES[d.templateId].stackable?Math.ceil(1000/unit):1,item=createItem(state,d.templateId,ownerId,state.人物.列表[ownerId].inventoryContainerId,{id:d.id,forceUnique:true,quantity,provenance:{type:'authored-opening-commerce',batchId:commerceSource.batch(state).id,designId:d.id}});commerceSource.registerAsset(state,item,d.origin);registerOpeningLot({key:d.id,itemId:item.id,assetKind:'item',quantity,name:quantity>1?`${d.name}整批` : d.name,reserveGold:Math.ceil(unit*quantity*.7),description:d.origin+' '+d.purchaseReason+'。整批货物按所列数量交付。'});}
    for(const d of designs.AUCTION_DESIGNS.filter(v=>v.kind==='materials')){const entries=d.materials.map((m,index)=>{const stack=addPermanentMaterialStack(state,{id:`${d.id}:${index}`,displayName:m.name,sourceGroup:`authored:${d.id}`,categories:index===0?['皮革','骨骼']:['晶核'],attributeSpectrum:{[m.attribute]:60},channels:d.id==='material-tide-kit'?['护盾守护','远程投射']:['近战打击','护盾守护'],structureCost:m.value/10,unitValue:m.value},'精良',m.quantity,{type:'authored-opening-commerce-material',sourceId,designId:d.id},ownerId);return {fingerprint:stack.fingerprint,quantity:m.quantity};});registerOpeningLot({key:d.id,assetKind:'materials',assetRef:{kind:'materials',store:'personal',holderId:ownerId,entries},quantity:1,name:d.name,reserveGold:Math.ceil(d.materials.reduce((n,m)=>n+m.quantity*m.value,0)*.7),description:d.origin+' '+d.purchaseReason});}
    const namedIds=[...designs.PEOPLE.filter(v=>!v.existing).map(v=>v.id),...designs.CONTACTS.map(v=>v.id),'tang-shopkeeper-luo','tang-artisan-wei'];
    for(const id of namedIds){const p=state.人物.列表[id];if(!p)continue;if(p.扩展.characterProfile?.source==='rules-draft'){p.扩展.characterProfile.status='complete';p.扩展.characterProfile.source='preset';}for(const soulId of state.成长.列表[id]?.武魂ID列表??[]){const soul=state.武魂.列表[soulId];soul.扩展.baseActionNaming={source:'preset'};for(const ringId of soul.魂环ID列表)for(const skillId of state.魂环.列表[ringId].魂技ID列表){const skill=state.技能.列表[skillId];skill.namingSource='preset';skill.扩展.命名来源='preset';}state.战斗单位.列表[id]=foundation.applyMartialSoulCombatModifiers(state.战斗单位.列表[id],soul,state);}}
    (globalThis.SoulExpeditionEngine??(typeof require==='function'?require('./expedition-engine.js'):null)).registerAuthoredCommerceBlueprints(state);
    commerceMessages.initialize(state);publicAuction.initialize(state);
    for(const catalog of commerceSource.batch(state).catalog.filter(v=>v.personId))publicAuction.consign(state,{type:'start-asset-auction',actorId:catalog.sellerId,itemId:catalog.itemId,targetId:catalog.personId,assetKind:catalog.assetKind,reserveGold:catalog.reserveGold,auctionClass:catalog.auctionClass},catalog.sourceId,null,{catalog});
    commerceSource.finish(state);globalThis.SoulCommerceAuctionSupply.initialize(state);social.ingest(state);
  }

  function equipmentSummary(state, entityId) {
    const config = state.装备.配置[entityId];
    const ids = [...Object.values(config?.slots ?? {}), ...Object.values(config?.soulBoneSlots ?? {})].filter(Boolean);
    const summary = {attributes: {}, resistances: [], valuePoints: 0};
    for (const id of ids) {
      const item = state.物品.实例[id];
      if (!item||!foundation.CONTROL_CORE.itemEffectsAllowed(state,entityId,item)) continue;
      const template = itemTemplate(item.templateId);
      const modifiers = merge(template.modifiers ?? {}, item.payload?.modifiers ?? {});
      foundation.EQUIPMENT_AFFIXES.priceAttributes(modifiers.attributes??{});
      for (const [key, value] of Object.entries(modifiers.attributes ?? {})) summary.attributes[key] = (summary.attributes[key]??0)+value;
      summary.resistances.push(...list(modifiers.resistances));
      summary.valuePoints += item.valuePoints;
    }
    summary.resistances = list(summary.resistances);
    const capped=foundation.EQUIPMENT_AFFIXES.attributeTotals(summary.attributes);
    summary.attributes=capped.values;summary.rawAttributes=capped.raw;summary.excessAttributes=capped.excess;
    return summary;
  }

  function equipmentCombatSummary(state, entityId, details=false) {
    const config = state.装备.配置[entityId];
    const normalIds = Object.values(config?.slots ?? {}).filter(Boolean);
    const boneIds = Object.values(config?.soulBoneSlots ?? {}).filter(Boolean);
    const summary = Object.fromEntries(Object.keys(foundation.EQUIPMENT_AFFIXES.REGISTRY).map(key=>[key,0]));
    for (const itemId of [...normalIds, ...boneIds]) {
      const item = state.物品.实例[itemId];
      if (!item||!foundation.CONTROL_CORE.itemEffectsAllowed(state,entityId,item)) continue;
      const template = itemTemplate(item.templateId);
      const passive = merge(template.passiveCombat ?? {}, item.payload?.passiveCombat ?? {});
      const stats=foundation.EQUIPMENT_AFFIXES.valuesFromGraph(item.payload?.passiveEffectGraph??template.passiveEffectGraph);
      for(const [key,value] of Object.entries(stats))passive[key]=(passive[key]??0)+value;
      for (const key of Object.keys(summary)) summary[key] += integer(passive[key] ?? 0, -99, 999);
    }
    const result=foundation.EQUIPMENT_AFFIXES.totals(summary);
    return details?result:result.values;
  }

  function itemAbilityBlueprints(item) {
    const template=itemTemplate(item.templateId);
    return item.type==='魂骨'?(item.payload?.activeSkills??[]):[item.payload?.activeSkill??template.activeSkill].filter(Boolean);
  }
  function itemAbilityFingerprint(item) {
    const host=item.payload?.host!==undefined?globalThis.SoulHostCore.definition(item):null;
    if(item.payload?.backgroundRestraint){backgroundItems.resolve(item);if(item.payload.activeSkill){const check=abilities.validate({...item.payload.activeSkill,id:item.payload.activeSkill.id??'blueprint-0'});if(!check.pass)throw Error(check.errors.join('；'));}return abilities.hash({templateId:item.templateId,backgroundRestraint:item.payload.backgroundRestraint,...(item.payload.activeSkill?{activeSkill:abilities.mechanics(item.payload.activeSkill)}:{}),...(host?{host}:{})});}
    const blueprints=itemAbilityBlueprints(item);if(!blueprints.length&&!host)return '';
    for(const [index,blueprint] of blueprints.entries()){
      const check=abilities.validate({...blueprint,id:`blueprint-${index}`});if(!check.pass)throw Error(check.errors.join('；'));
    }
    return abilities.hash({templateId:item.templateId,blueprints:blueprints.map(abilities.mechanics),...(item.payload?.presetId?{presetId:item.payload.presetId,artId:item.payload.artId}:{}),...(host?{host}:{})});
  }
  function isCanonicalSoulBone(item) {
    const origin=item?.provenance,record=globalThis.SoulCanonArenaEngine?.CHARACTER_CATALOG?.[origin?.recordId];
    return item?.type==='魂骨'&&!!record&&origin.type==='canon-character-soul-bone'&&!!origin.evidence&&item.payload?.recordId===origin.recordId&&item.payload?.evidence===origin.evidence;
  }

  function itemGrantedSkills(state, entityId, item, sourceKind) {
    const template = itemTemplate(item.templateId);
    const origin=item.provenance,canonRecord=globalThis.SoulCanonArenaEngine?.CHARACTER_CATALOG?.[origin?.recordId],canonFixedItem=!!canonRecord&&!!origin.evidence&&((sourceKind==='soul-bone'&&origin.type==='canon-character-soul-bone'&&item.payload?.recordId===origin.recordId&&item.payload?.evidence===origin.evidence)||(origin.type==='canon-character-equipment'&&item.扩展?.recordId===origin.recordId));
    const supportRecipeId=sourceKind==='consumable' && SUPPORT_CONSUMABLE_RECIPES[item.payload?.recipeId] ? item.payload.recipeId : '';
    const registeredSupportFood=!!supportRecipeId&&item.type==='辅助食品'&&origin?.type==='support-food-created';
    const blueprints = sourceKind === 'soul-bone'
      ? (Array.isArray(item.payload?.activeSkills) ? item.payload.activeSkills : [])
      : [item.payload?.activeSkill ?? template.activeSkill].filter(Boolean);
    return blueprints.filter(blueprint => blueprint?.effectSpecs?.length || blueprint?.effectGraph?.nodes?.length).map((blueprint, index) => {
      const sourceGraph = blueprint.effectGraph?.nodes?.length
        ? clone(blueprint.effectGraph)
        : effects.makeLinearGraph(blueprint.effectSpecs, {provenance: {itemId: item.id, sourceKind, skillIndex: index}});
      const restorativeConsumable=sourceKind==='consumable' && combat.isSelfRestorativeGraph(sourceGraph)
        && effects.validateGraph(sourceGraph,{ageTier:clean(blueprint.ageTier,'十万年'),mechanismCap:clean(blueprint.mechanismCap,'规则')}).pass;
      // Only the item's use action gains friendly touch targeting; its recipe and price stay frozen.
      const graph=restorativeConsumable ? effects.makeLinearGraph([
        ['release.touch',{}],['target.single',{阵营规则:'友方',选择模式:'主目标'}],
        ...sourceGraph.nodes.filter(node=>node.family==='payload').map(node=>[node.effectId,clone(node.params)])
      ],{provenance:clone(sourceGraph.provenance ?? {})}) : sourceGraph;
      const conditionFields={};
      if(blueprint.targetConditions!==undefined)conditionFields.targetConditions=clone(blueprint.targetConditions);
      if(blueprint.effectConditions!==undefined){
        const from=sourceGraph.nodes.filter(n=>n.family==='payload'),to=graph.nodes.filter(n=>n.family==='payload');
        conditionFields.effectConditions=Object.fromEntries(Object.entries(blueprint.effectConditions).map(([id,condition])=>[restorativeConsumable?to[from.findIndex(n=>n.id===id)]?.id??id:id,clone(condition)]));
      }
      return effects.sealPricedAbility({
        id: item.payload?.backgroundRestraint?`item-skill-${item.id}-${entityId}`:blueprints.length === 1 ? `item-skill-${item.id}` : `item-skill-${item.id}-${index + 1}`,
        name: clean(blueprint.name, item.name),
        名称: clean(blueprint.name, item.name),
        description: blueprint.description ?? '',
        namingSource: blueprint.namingSource || blueprint.narrativeSource || (canonFixedItem||registeredSupportFood||blueprint.fixedDesign&&origin?.type==='authored-opening-soul-bone'?'preset':''),
        类型: sourceKind === 'soul-device' ? '魂导器技能' : sourceKind === 'soul-bone' ? '魂骨技能' : item.type === '暗器' ? '暗器技能' : '辅助食品',
        持有者单位ID: entityId,
        sourceKind,
        sourceItemId: item.id,
        restorativeConsumable,
        ...conditionFields,
        ...(blueprint.medicine?{medicine:clone(blueprint.medicine)}:{}),
        soulPowerCost: blueprint.soulPowerCost ?? 0,
        requirements:clone(blueprint.requirements??(sourceKind==='consumable'?['gesture',...(['丹药','毒药','辅助食品'].includes(item.type)||['basic-soul-tonic','antidote-pill','travel-water'].includes(item.templateId)?['ingest']:[])]:[])),resourceCosts:clone(blueprint.resourceCosts??[]),maintenanceCosts:clone(blueprint.maintenanceCosts??[]),
        castModes:clone(blueprint.castModes??[]),...(blueprint.defaultCastMode?{defaultCastMode:blueprint.defaultCastMode}:{}),
        ...(Number.isFinite(blueprint.outputScale) ? {outputScale:blueprint.outputScale} : {}),
        cooldownTurns: blueprint.cooldownTurns ?? 0,
        ...(blueprint.usageKey?{usageKey:blueprint.usageKey}:{}),
        ...Object.fromEntries(['nativeCastRank','minimumCastRank','soulPowerCostRate'].filter(key=>blueprint[key]!==undefined).map(key=>[key,blueprint[key]])),
        durabilityCost: blueprint.durabilityCost??0,
        disposable: ['hidden-weapon','consumable'].includes(sourceKind),
        usageRules: {...clone(blueprint.usageRules ?? blueprint.扩展?.usageRules ?? blueprint.扩展?.使用限制 ?? {}),...(supportRecipeId ? {worldUsageGroup:`support-food:${supportRecipeId}`} : {})},
        ageTier: clean(blueprint.ageTier, '十万年'),
        mechanismCap: clean(blueprint.mechanismCap, '规则'),
        effectGraph: graph,
        效果图: clone(graph),
        扩展: {
          来源物品ID:item.id,来源类别:sourceKind,技能序号:index + 1,价值:clone(blueprint.value ?? {}),
          ...(blueprint.generationNaming?{generationNaming:clone(blueprint.generationNaming),命名来源:blueprint.namingSource,描述:blueprint.description}:{}),
          定向效果方案:clone(blueprint.directedPlan ?? null)
        }
      });
    });
  }

  function isCarriedItem(state,item,entityId=item?.ownerEntityId) {
    const containerId=state.人物?.列表?.[entityId]?.inventoryContainerId??state.战斗单位?.列表?.[entityId]?.扩展?.possessions?.inventoryContainerId;
    return Boolean(item && !item.扩展?.integrated && entityId && containerId && item.ownerEntityId===entityId && item.containerId===containerId
      && state.容器?.列表?.[containerId]?.ownerEntityId===entityId && state.容器.列表[containerId].itemIds.includes(item.id));
  }

  // The archive and equipped actions read the same item definition, including payload overrides.
  function inspectItem(state, itemOrId) {
    const source = typeof itemOrId === 'string' ? state.物品?.实例?.[itemOrId] : itemOrId;
    if (!source) throw new Error('这件物品已经不在行囊中');
    const template = itemTemplate(source.templateId);
    const item = {...source,name:source.name ?? template.name,type:source.type ?? template.type,quantity:source.quantity ?? 1};
    const sourceKind = item.type === '魂骨' ? 'soul-bone' : item.type === '魂导器'||owActiveRestraint(state,item) ? 'soul-device'
      : item.type === '暗器' ? 'hidden-weapon' : 'consumable';
    return {
      itemId:item.id, name:item.name, type:item.type, quality:item.quality, grade:itemGrade(item), quantity:item.quantity,
      description:globalThis.SoulRealmArrangements?.presentation(item)?.description || item.payload?.description || item.扩展?.描述 || template.description || '',
      form:item.payload?.form || item.扩展?.形态 || '',
      fixedForm:clone(item.payload?.fixedForm ?? template.fixedForm ?? null),
      modifiers:merge(template.modifiers ?? {},item.payload?.modifiers ?? {}),
      passiveCombat:merge(template.passiveCombat ?? {},item.payload?.passiveCombat ?? {}),
      skills:itemGrantedSkills(state,item.ownerEntityId,item,sourceKind),
      passiveEffectGraph:clone(item.payload?.passiveEffectGraph ?? template.passiveEffectGraph ?? null),
      expiresAtDay:item.payload?.expiresAtDay ?? null,
      expired:Number(state.世界?.时间?.day ?? 0) > Number(item.payload?.expiresAtDay ?? Number.MAX_SAFE_INTEGER),
      durability:item.durability, maxDurability:item.扩展?.maxDurability ?? template.maxDurability ?? 100,
      cooldownRemaining:Number(item.扩展?.combatState?.cooldownRemaining ?? 0),
      cooldownBySkill:clone(item.扩展?.combatState?.cooldownBySkill ?? {}),
      equippedSlot:Object.entries(state.装备?.配置?.[item.ownerEntityId]?.slots ?? {}).find(([,id])=>id===item.id)?.[0] ?? '',
      carried:isCarriedItem(state,item), bound:Boolean(item.boundToEntityId), temporary:Boolean(item.payload?.expeditionTemporary)
    };
  }

  function previewItemIntent(state, intent,executionContext) {
    const operations = {equip:equipItem,unequip:unequipItem,'fuse-soul-bone':fuseSoulBone};
    let previewId = 'item-intent-preview';
    while (state.世界.processedTransactions[previewId]) previewId += '-next';
    // Execute only on the transaction's private clone: validation and costs cannot drift from settlement.
    const result = operations[intent.type](state,intent,previewId,executionContext);
    const receipt = result.receipt;
    const item = result.state.物品.实例[receipt.itemId];
    return {...clone(receipt), type:intent.type, available:true, item:inspectItem(result.state,item), name:item.name,
      before:equipmentSummary(state,receipt.entityId), after:equipmentSummary(result.state,receipt.entityId),
      remainingSoulPower:result.state.战斗单位.列表[receipt.entityId]?.资源?.魂力?.当前};
  }

  function syncItemGrantedActions(state) {
    const itemKinds = new Set(['soul-device', 'soul-bone', 'hidden-weapon', 'consumable']);
    for (const [skillId, skill] of Object.entries(state.技能?.列表 ?? {})) if (itemKinds.has(skill?.sourceKind)) delete state.技能.列表[skillId];
    for (const unit of Object.values(state.战斗单位?.列表 ?? {})) {
      unit.能力.技能ID = list((unit.能力.技能ID ?? []).filter(id => !/^item-skill-/.test(id)));
    }
    for (const item of Object.values(state.物品?.实例 ?? {})) {
      const operators=globalThis.SoulOpeningWorkshop?.abilityOperators(state,item)??[];
      if(operators.length){const granted=[];for(const entityId of operators){const unit=state.战斗单位?.列表?.[entityId];if(!unit)continue;for(const skill of itemGrantedSkills(state,entityId,item,'soul-device')){state.技能.列表[skill.id]=skill;unit.能力.技能ID=addUnique(unit.能力.技能ID,skill.id);granted.push(skill.id);}}item.payload.skillIds=granted;item.payload.skillId=granted[0];continue;}
      let entityId = '';
      let sourceKind = '';
      const ownerConfig = state.装备?.配置?.[item.ownerEntityId];
      const carriedByOwner = isCarriedItem(state,item);
      if (item.type === '暗器' && carriedByOwner) {
        entityId = item.ownerEntityId;
        sourceKind = 'hidden-weapon';
      } else if (item.type === '魂导器' && carriedByOwner && Object.values(ownerConfig?.slots ?? {}).includes(item.id)) {
        entityId = item.ownerEntityId;
        sourceKind = 'soul-device';
      } else if (item.type === '魂骨' && item.扩展?.integrated && item.ownerEntityId===item.boundToEntityId && item.boundToEntityId && Object.values(state.装备?.配置?.[item.boundToEntityId]?.soulBoneSlots ?? {}).includes(item.id)) {
        entityId = item.boundToEntityId;
        sourceKind = 'soul-bone';
      } else if ((['辅助食品', '丹药', '毒药', '消耗品'].includes(item.type)||item.templateId==='travel-water') && carriedByOwner) {
        entityId = item.ownerEntityId;
        sourceKind = 'consumable';
      }
      const unit = state.战斗单位?.列表?.[entityId];
      if (!unit || !sourceKind) continue;
      const skills = itemGrantedSkills(state, entityId, item, sourceKind);
      if (!skills.length) continue;
      for (const skill of skills) {
        state.技能.列表[skill.id] = skill;
        unit.能力.技能ID = addUnique(unit.能力.技能ID, skill.id);
      }
      if (sourceKind === 'soul-bone') item.扩展.grantedSkillIds = skills.map(skill => skill.id);
      else {
        item.payload.skillIds = skills.map(skill => skill.id);
        item.payload.skillId = skills[0].id;
      }
    }
    return state;
  }

  function owActiveRestraint(state,item){return !!item.payload?.backgroundRestraint&&!!item.payload?.activeSkill&&(!!globalThis.SoulOpeningWorkshop?.isItemAuthorized(state,item)||!!globalThis.SoulPaidDesign?.isItemSource(state,item));}

  function refreshUnitEquipment(state, entityId, initializeActions=false, resourceOptions={}) {
    const config = state.装备.配置[entityId];
    const unit = state.战斗单位.列表[entityId];
    if (!config || !unit) return unit;
    const previous = config.appliedModifiers ?? {attributes: {}, resistances: []};
    const next = equipmentSummary(state, entityId);
    const source = foundation.stripMartialSoulCombatModifiers(clone(unit));
    const combatSummary=equipmentCombatSummary(state,entityId);
    source.扩展.装备战斗修正=combatSummary;
    for (const key of foundation.ATTRIBUTE_KEYS) {
      const raw = integer(source.六维?.临时加成?.[key] ?? 0, -999, 999) - integer(previous.attributes?.[key] ?? 0, -999, 999) + integer(next.attributes?.[key] ?? 0, -999, 999);
      source.六维.临时加成[key] = raw;
    }
    const growth = state.成长.列表[entityId];
    const soul = foundation.activeMartialSoul(state, entityId);
    const hp = unit.资源.生命.当前;
    const sp = unit.资源.魂力.当前;
    const normalized = foundation.normalizeCombatant(source, {id: entityId, kind: unit.单位种类, level: growth?.魂力等级 ?? unit.成长?.魂力等级, beastYears: unit.成长?.年限, beastGrade: unit.成长?.种族品级, martialSoulGrade: soul?.品级 ?? 3, capacityModifier: soul?.身体容量修正 ?? 0, stabilityModifier: soul?.灵魂稳定修正 ?? 0});
    if (soul) foundation.applyMartialSoulCombatModifiers(normalized, soul,state);
    foundation.refreshBattleAttributeResources(state,normalized,resourceOptions);
    normalized.资源.生命.当前 = Math.min(hp, normalized.资源.生命.最大);
    normalized.资源.魂力.当前 = Math.min(sp, normalized.资源.魂力.最大);
    foundation.refreshEquipmentCapacity(normalized);
    normalized.扩展.装备战斗修正 = combatSummary;
    if (initializeActions && unit.单位种类 !== '魂兽' && !unit.扩展?.普通攻击档案) {
      normalized.扩展.普通攻击档案 = abilities.seal({
        id:'ordinary.attack',soulPowerCost:0,requirements:['gesture'],
        name: '徒手攻击',
        source: 'unarmed',
        effectSpecs: [['release.melee', {}], ['target.single', {}], ['check.physical_attack', {}], ['payload.damage', {类型: '物理', 骰数: 1, 骰面: 4, 加值: 0}]]
      });
    }
    state.战斗单位.列表[entityId] = normalized;
    config.appliedModifiers = next;
    return normalized;
  }

  function refreshAllEquipment(state,syncSkills=true) {
    for (const entityId of Object.keys(state.装备.配置 ?? {})) refreshUnitEquipment(state, entityId,syncSkills);
    if(syncSkills)syncItemGrantedActions(state);
    return state;
  }
  function refreshEquipmentInPlace(state,entityId){
    const original=state.战斗单位?.列表?.[entityId];if(!original)return null;
    const refreshed=refreshUnitEquipment(state,entityId,false);
    if(refreshed!==original){Object.assign(original,refreshed);state.战斗单位.列表[entityId]=original;}
    return original;
  }

  function equipmentPlacement(state,options,executionContext) {
    const entityId = clean(options?.entityId, state.角色.主控单位ID);
    assertPreparationAvailable(state,entityId,executionContext,options);
    const item = state.物品.实例[clean(options?.itemId)];
    const config = state.装备.配置[entityId];
    if (!item || !config || item.ownerEntityId !== entityId) throw new Error('角色不拥有该物品');
    if (!isCarriedItem(state,item,entityId)) throw new Error('请先将这件物品领入行囊');
    const template = itemTemplate(item.templateId);
    if (template.type !== '魂导器' || item.type !== '魂导器') throw new Error('三个装备槽只接受永久魂导器；暗器和消耗品从背包直接使用');
    const requestedSlot = clean(options?.slot);
    if (requestedSlot && !EQUIPMENT_SLOTS.includes(requestedSlot)) throw new Error('装备槽位不存在');
    const existingSlot = Object.entries(config.slots ?? {}).find(([, itemId]) => itemId === item.id)?.[0];
    if(existingSlot&&requestedSlot&&existingSlot!==requestedSlot)throw Error('物品已装备在另一槽位，请先卸下再更换槽位');
    const slot = existingSlot || requestedSlot || EQUIPMENT_SLOTS.find(slotId => !config.slots[slotId]);
    if (!EQUIPMENT_SLOTS.includes(slot)) throw new Error('三个魂导器槽均已占用，请先卸下一件魂导器');
    const replacing=config.slots[slot]&&config.slots[slot]!==item.id?state.物品.实例[config.slots[slot]]:null;
    let releaseProof=null;
    if(replacing){
      if(options.replace!==true)throw new Error(`${slot}已有魂导器，请选择替换`);
      if(globalThis.SoulDeviceLocks.definition(state,replacing)?.available){const release=globalThis.SoulDeviceLocks.canDetach(state,replacing,entityId);if(!release.pass)throw Error(release.reason);releaseProof=release.proof;}
    }
    const slotView=replacing?{...state,装备:{...state.装备,配置:{...state.装备.配置,[entityId]:{...config,slots:{...config.slots,[slot]:null}}}}}:state;
    globalThis.SoulHostCore?.assertSlots(slotView,item,entityId,'equipment');
    return {entityId,item,config,slot,replacing,releaseProof};
  }

  /** Preview one unit and its slots, never a speculative copy of the whole world. */
  function previewEquipment(state,options={}) {
    const entityId=clean(options.entityId,state.角色.主控单位ID),original=state.装备?.配置?.[entityId],unit=state.战斗单位?.列表?.[entityId];
    if(!original||!unit)return {available:false,reason:'没有可使用的装备栏'};
    const config=clone(original),replacing=options.replace===true&&options.slot?config.slots[options.slot]:null;
    const view={...state,装备:{...state.装备,配置:{...state.装备.配置,[entityId]:config}},战斗单位:{...state.战斗单位,列表:{...state.战斗单位.列表,[entityId]:clone(unit)}}};
    try{
      const reading=(s,u)=>{const attributes=foundation.battleAttributeView(s,u);return {attributes:clone(attributes.attributes),derived:clone(attributes.derived),resources:clone(u.资源),equipment:equipmentCombatSummary(s,entityId)};};
      const before=reading(state,unit);
      const placement=equipmentPlacement(view,options);config.slots[placement.slot]=placement.item.id;
      const after=refreshUnitEquipment(view,entityId,false,{reconcile:false});
      return {available:true,itemId:placement.item.id,name:placement.item.name,slot:placement.slot,replacingItemId:replacing??null,before,after:reading(view,after),equipment:equipmentCombatSummary(view,entityId,true)};
    }catch(error){return {available:false,reason:error.message};}
  }

  function equipItem(rawState, options, transactionId,executionContext) {
    const guard = transactionStart(rawState, transactionId, '装备物品');
    if (guard.duplicate) return {state: guard.state, receipt: guard.receipt, idempotent: true};
    const state = guard.state;
    const {entityId,item,config,slot,replacing,releaseProof}=equipmentPlacement(state,options,executionContext);
    if(replacing){
      if(globalThis.SoulDeviceLocks.definition(state,replacing)?.available)globalThis.SoulDeviceLocks.event(state,'equipment-detached',replacing,entityId,transactionId,{releaseProof:clone(releaseProof),slot});
      replacing.扩展.equippedSlot='';
    }
    config.slots[slot] = item.id;
    item.扩展.equippedSlot = slot;
    refreshUnitEquipment(state, entityId);
    syncItemGrantedActions(state);
    return commit(state, transactionId, '装备物品', {type: 'item-equipped', entityId, itemId: item.id, slot, replacingItemId:replacing?.id??null,...(releaseProof?{releaseProof}:{}),modifiers: clone(config.appliedModifiers), summary: `${state.人物.列表[entityId]?.name ?? entityId}将${item.name}装入${slot}${replacing?`，替换${replacing.name}`:''}`});
  }

  function unequipItem(rawState, options, transactionId,executionContext) {
    const guard = transactionStart(rawState, transactionId, '卸下物品');
    if (guard.duplicate) return {state: guard.state, receipt: guard.receipt, idempotent: true};
    const state = guard.state;
    const entityId = clean(options?.entityId, state.角色.主控单位ID);
    assertPreparationAvailable(state,entityId,executionContext,options);
    const config = state.装备.配置[entityId];
    const slot = clean(options?.slot);
    if (!config || !EQUIPMENT_SLOTS.includes(slot) || !config.slots[slot]) throw new Error('该槽位没有可卸下装备');
    const itemId = config.slots[slot];
    const item=state.物品.实例[itemId],lock=globalThis.SoulDeviceLocks.definition(state,item);
    let releaseProof=null;
    if(lock?.available){const release=globalThis.SoulDeviceLocks.canDetach(state,item,entityId);if(!release.pass)throw Error(release.reason);releaseProof=release.proof;globalThis.SoulDeviceLocks.event(state,'equipment-detached',item,entityId,transactionId,{releaseProof:clone(releaseProof),slot});}
    config.slots[slot] = '';
    if (state.物品.实例[itemId]) state.物品.实例[itemId].扩展.equippedSlot = '';
    refreshUnitEquipment(state, entityId);
    syncItemGrantedActions(state);
    return commit(state, transactionId, '卸下物品', {type: 'item-unequipped', entityId, itemId, slot, modifiers: clone(config.appliedModifiers),...(releaseProof?{releaseProof}:{}), summary: `${state.人物.列表[entityId]?.name ?? entityId}卸下了${state.物品.实例[itemId]?.name ?? itemId}`});
  }

  // Route templates keep historical fares for validating older journey records.
  function routeSnapshotMatches(route,template){
    return !!template&&[0,template.costGold].includes(route.costGold)&&
      backgrounds.stable({...route,costGold:template.costGold})===backgrounds.stable(template);
  }
  const PATH_MODES = Object.freeze({
    balanced: {name: '均衡', description: '兼顾耗时与安全'},
    fastest: {name: '最快', description: '优先总耗时最短'},
    cheapest: {name: '稳妥', description: '优先避开危险路段'}
  });

  function playerLevel(state,actorId=state.角色.主控单位ID) {
    return integer(state.成长.列表[actorId]?.魂力等级 ?? 0, 0, 100);
  }

  function mapFlags(state,actorId=state.角色.主控单位ID) {
    return new Set(actorId===state.角色.主控单位ID?[...list(state.地图.扩展?.flags), ...list(state.世界.扩展?.flags)]:list(state.人物.列表[actorId]?.扩展?.travelFlags));
  }

  function hasQualification(state, flag,actorId=state.角色.主控单位ID) {
    const flags = mapFlags(state,actorId);
    return flags.has(flag) || (WORLD_QUALIFICATIONS[flag]?.alternatives ?? []).some(alternative => flags.has(alternative));
  }

  function qualificationGuidance(state, flag,actorId=state.角色.主控单位ID) {
    const definition = WORLD_QUALIFICATIONS[flag];
    const acceptedFlags = [flag,...(definition?.alternatives ?? [])];
    const sources = Object.values(WORLD_EVENTS).filter(event => event.flags.some(grant => acceptedFlags.includes(grant)))
      .map(event => ({eventId:event.id,locationId:event.locationId,locationName:LOCATION_TEMPLATES[event.locationId].name,action:event.name}));
    if (definition?.locationId) sources.push({eventId:'',locationId:definition.locationId,locationName:LOCATION_TEMPLATES[definition.locationId].name,action:definition.instruction});
    return {flag,name:definition?.name ?? '通行资格',fulfilled:hasQualification(state,flag,actorId),sources};
  }

  function activeCaptivity(state,entityId=state.角色?.主控单位ID) {
    const record=custody.confined(state,entityId);
    return record?{...clone(record),actorId:entityId,locationId:state.人物.列表[entityId].locationId}:null;
  }
  function personalActionBlockReason(state,options={}) {
    const seal=sealing.active(state,options.actorId??state.角色.主控单位ID);if(seal&&!options.allowSealed&&!(seal.status==='confined'&&options.allowContained))return seal.status==='confined'?'封锁罩仍然闭合，只能观察、交谈或尝试脱困':'人物处于封神台内，须等待外部开封';
    const id=options.actorId??state.角色?.主控单位ID,unit=state.战斗单位?.列表?.[id],person=state.人物?.列表?.[id];
    const occupied=globalThis.SoulConsciousness?.originalActionReason(state,id);if(occupied)return occupied;
    if(person){try{people.assertAlive(state,id);}catch{return '人物已经死亡或寿命耗尽，无法行动';}}
    if(!options.allowIncapacitated&&unit&&(unit.存活状态!=='存活'||unit.资源.生命.当前<=0)||person?.status==='dead')return '当前角色已无法行动；可查看经历或读取此前保存的旅程';
    if(!options.allowBattle&&combat.occupiedBattle(state,id))return '人物正参加战斗，无法同时进行场外行动';
    if(!options.allowCaptivity&&activeCaptivity(state,id)&&!globalThis.SoulCombatDeployments?.bodyOuting(state,null,id))return '当前被限制行动；可以交谈、尝试脱困或读取此前保存的旅程';
    return '';
  }
  function worldActionBlockReason(state, options = {}) {
    const allowed = new Set(options.allowActivities ?? []);
    if (!state.角色?.已建立 && (!options.actorId || options.actorId===state.角色?.主控单位ID)) return '请先完成武魂觉醒';
    const personal=personalActionBlockReason(state,options);if(personal)return personal;
    if(!options.allowArrangements){const reason=logistics.busyReason(state,options.actorId??state.角色.主控单位ID)||rescue.busyReason(state,options.actorId??state.角色.主控单位ID);if(reason)return reason;}
    if (expeditions.forActor(state,options.actorId??state.角色.主控单位ID) && !allowed.has('expedition')) return '请先完成远征或安全撤离';
    if(options.actorId&&options.actorId!==state.角色.主控单位ID)return '';
    if (state.战斗?.状态 === '进行中') return '请先处理当前战斗';
    if (state.切磋?.当前 || state.终局挑战?.当前) return '请先结算当前挑战';
    if (state.比赛?.当前 && !['completed','failed'].includes(state.比赛.当前.status)
      && (!allowed.has('competition') || state.比赛.当前.match)) return '请先完成当前赛事';
    if (state.杀戮场?.当前 && !['completed','failed'].includes(state.杀戮场.当前.status)
      && (!allowed.has('slaughter') || state.杀戮场.当前.match)) return '请先完成五场死斗，期间不能离场';
    const encounter = state.遭遇?.列表?.[state.遭遇?.当前遭遇ID];
    if (encounter && encounter.状态 !== '已结束' && !allowed.has('encounter')) return '请先处理当前遭遇';
    return '';
  }

  function assertPreparationAvailable(state,entityId,executionContext,preparationIntent) {
    actions.resolve(state,{actorId:entityId,battleId:null,requirements:['gesture']});
    const allowCaptivity=fieldControl.allowed(state,executionContext,entityId)||cooperation.preparationAllowed(state,entityId,preparationIntent);
    const reason=worldActionBlockReason(state,{actorId:entityId,allowCaptivity,allowActivities:['expedition','competition','slaughter','encounter']});
    if(reason)throw Error(reason);
  }

  function expeditionCompleted(state, dungeonId) {
    return Boolean(state.远征?.扩展?.completedDungeons?.[dungeonId]) || (state.远征?.历史 ?? []).some(record =>
      record.dungeonId === dungeonId && ['extracted','cleared'].includes(record.result) && record.completedNodeIds?.length > 0);
  }

  function previewWorldEvent(state, eventId) {
    const event = WORLD_EVENTS[eventId];
    if (!event) throw new Error('这条地点事件不存在');
    const completed = Boolean(state.地图?.扩展?.events?.[eventId]) || event.flags.every(flag => hasQualification(state,flag));
    const reasons = [];
    const block = worldActionBlockReason(state);
    if (block) reasons.push(block);
    const autonomy=influence.voluntaryReason(state,state.角色.主控单位ID);if(autonomy)reasons.push(autonomy);
    if (actions.positionOf(state,state.角色.主控单位ID).locationId !== event.locationId || actions.positionOf(state,state.角色.主控单位ID).sceneId) reasons.push(`请前往${LOCATION_TEMPLATES[event.locationId].name}`);
    const access = locationAccess(state,event.locationId);
    if (!access.pass) reasons.push(...access.reasons);
    for (const flag of event.requiredFlags ?? []) if (!hasQualification(state,flag)) reasons.push(`需要${qualificationGuidance(state,flag).name}`);
    if (event.requiredExpedition && !expeditionCompleted(state,event.requiredExpedition)) reasons.push(`先完成一次${event.expeditionName}探索并安全撤离`);
    if (completed) reasons.push('这段见闻已经记入旅途');
    return {...clone(event),locationName:LOCATION_TEMPLATES[event.locationId].name,completed,available:!reasons.length,reasons:[...new Set(reasons)]};
  }

  function listWorldEvents(state, locationId = state.地图?.当前地点ID) {
    return Object.values(WORLD_EVENTS).filter(event => !locationId || event.locationId === locationId).map(event => previewWorldEvent(state,event.id));
  }

  function completeWorldEvent(rawState, eventId, transactionId) {
    const guard = transactionStart(rawState,transactionId,'地点见闻');
    if (guard.duplicate) return {state:guard.state,receipt:guard.receipt,idempotent:true};
    const state = guard.state;
    const preview = previewWorldEvent(state,clean(eventId));
    if (preview.completed) {
      const prior = state.地图.扩展.events?.[eventId];
      return {state,receipt:clone(prior ?? {type:'world-event-completed',eventId,summary:'这段见闻已经记入旅途'}),idempotent:true};
    }
    if (!preview.available) throw new Error(preview.reasons.join('；'));
    const event = WORLD_EVENTS[eventId];
    state.地图.扩展.flags = list([...state.地图.扩展.flags,...event.flags]);
    state.地图.已知地点ID列表 = list([...state.地图.已知地点ID列表,...event.discover]);
    const receipt = {type:'world-event-completed',eventId,locationId:event.locationId,speaker:event.speaker,name:event.name,
      grantedFlags:clone(event.flags),discoveredLocationIds:clone(event.discover),summary:event.result};
    state.地图.扩展.events ??= {};
    state.地图.扩展.events[eventId] = clone(receipt);
    return commit(state,transactionId,'地点见闻',receipt);
  }

  function isLocationKnown(state, locationId,actorId=state.角色.主控单位ID) {
    const location = LOCATION_TEMPLATES[locationId];
    if (!location) return false;
    if(DUNGEON_ENTRANCE_LOCATION_IDS.includes(locationId))return true;
    const known = new Set(actorId===state.角色.主控单位ID?state.地图.已知地点ID列表??[]:[...Object.values(LOCATION_TEMPLATES).filter(l=>l.discovery!=='hidden').map(l=>l.id),...Object.values(WORLD_EVENTS).filter(e=>e.flags.every(f=>hasQualification(state,f,actorId))).flatMap(e=>e.discover)]);
    if ((location.discovery === 'known' && location.initiallyKnown) || known.has(locationId) || state.人物.列表[actorId]?.locationId === locationId) return true;
    return Boolean(location.parentId && location.discovery !== 'hidden' && (known.has(location.parentId)||isLocationKnown(state,location.parentId,actorId)));
  }

  function accessResult(state, requirements = {}, label = '路线',actorId=state.角色.主控单位ID) {
    const reasons = [];
    const level = playerLevel(state,actorId);
    const flags = mapFlags(state,actorId);
    const minimum = integer(requirements.minLevel ?? 0, 0, 100);
    if (minimum && level < minimum) reasons.push(`魂力等级需要达到${minimum}级`);
    for (const flag of list(requirements.requiredFlags)) if (!hasQualification(state,flag,actorId)) reasons.push(`需要${qualificationGuidance(state,flag,actorId).name}`);
    for (const flag of list(requirements.forbiddenFlags)) if (flags.has(flag)) reasons.push('当前状态尚不允许通行');
    return {pass: reasons.length === 0, reasons, label};
  }

  function locationAccess(state, locationId,actorId=state.角色.主控单位ID) {
    const location = LOCATION_TEMPLATES[locationId];
    if (!location) return {pass:false,reasons:['地点不存在'],label:'未知地点',guidance:[]};
    const parent = location.parentId ? locationAccess(state,location.parentId,actorId) : null;
    const result = accessResult(state, location.access ?? {}, location.name,actorId);
    const reasons = [...(!isLocationKnown(state,locationId,actorId) ? ['尚未发现此处的路线'] : []),...(parent?.reasons ?? []),...result.reasons];
    const guidance = [...(parent?.guidance ?? []),...list(location.access?.requiredFlags).map(flag => qualificationGuidance(state,flag,actorId)).filter(item => !item.fulfilled)];
    return {pass:!reasons.length,reasons:[...new Set(reasons)],label:location.name,guidance};
  }

  function routeAccess(state, route, destinationId,actorId=state.角色.主控单位ID) {
    const routeResult = accessResult(state, route.requirements ?? {}, route.id,actorId);
    const destinationResult = locationAccess(state, destinationId,actorId);
    const reasons = [...routeResult.reasons, ...destinationResult.reasons];
    return {pass: reasons.length === 0, reasons: [...new Set(reasons)], routeId: route.id, destinationId};
  }

  function findRoute(state, from, to) {
    return Object.values(state.地图.路线).find(route => (route.from === from && route.to === to) || (route.bidirectional !== false && route.from === to && route.to === from));
  }

  function pathWeight(route, mode) {
    if (mode === 'fastest') return route.minutes;
    if (mode === 'cheapest') return route.minutes + route.danger * 180;
    return route.minutes + route.danger * 20;
  }

  // Share a private snapshot only while enumerating alternatives for one query.
  function createRoutePlanner(rawState) {
    let prepared;
    return (destinationId, mode, from, actorId) => {
      prepared ??= normalizeState(rawState);
      return findPathInState(prepared, destinationId, mode, from, actorId);
    };
  }

  function findPath(rawState, destinationIdInput, modeInput = 'balanced', fromLocationIdInput = '',actorId=rawState.角色.主控单位ID) {
    return findPathInState(normalizeState(rawState),destinationIdInput,modeInput,fromLocationIdInput,actorId);
  }

  function findFreightPathInState(state,destinationId,from,actorId){
    return findPathInState(state,destinationId,'cheapest',from,actorId,true);
  }
  function findFreightPath(rawState,destinationId,from,actorId){
    return findFreightPathInState(normalizeState(rawState),destinationId,from,actorId);
  }

  // Read-only path calculation after the public boundary has normalized once.
  function findPathInState(state, destinationIdInput, modeInput = 'balanced', fromLocationIdInput = '',actorId=state.角色.主控单位ID,freight=false) {
    const from = clean(fromLocationIdInput,state.人物.列表[actorId]?.locationId);
    if (!LOCATION_TEMPLATES[from]) throw new Error('规划的出发地点不存在');
    const destinationId = clean(destinationIdInput);
    const mode = PATH_MODES[modeInput] ? modeInput : 'balanced';
    const destination = LOCATION_TEMPLATES[destinationId];
    if (!destination) throw new Error('目标地点不存在');
    const targetAccess = locationAccess(state, destinationId,actorId);
    if (!targetAccess.pass) throw new Error(`${destination.name}暂不可规划：${targetAccess.reasons.join('；')}`);
    if (from === destinationId) return {from, to: destinationId, mode, locationIds:[from], routeIds:[], routes:[], totalMinutes:0, totalCostGold:0, maxDanger:0, weightedScore:0};

    const distances = new Map([[from, 0]]);
    const previous = new Map();
    const unsettled = new Set([from]);
    const routes = Object.values(state.地图.路线);
    while (unsettled.size) {
      let current = '';
      let currentDistance = Infinity;
      for (const nodeId of unsettled) {
        const distance = distances.get(nodeId) ?? Infinity;
        if (distance < currentDistance || (distance === currentDistance && nodeId < current)) {
          current = nodeId;
          currentDistance = distance;
        }
      }
      unsettled.delete(current);
      if (current === destinationId) break;
      for (const route of routes) {
        let neighbor = '';
        if (route.from === current) neighbor = route.to;
        else if (route.bidirectional !== false && route.to === current) neighbor = route.from;
        if (!neighbor || !routeAccess(state, route, neighbor,actorId).pass) continue;
        const candidate = currentDistance + (freight?route.minutes+route.costGold*40:pathWeight(route,mode));
        const known = distances.get(neighbor) ?? Infinity;
        if (candidate < known || (candidate === known && route.id < (previous.get(neighbor)?.routeId ?? '\uffff'))) {
          distances.set(neighbor, candidate);
          previous.set(neighbor, {nodeId: current, routeId: route.id});
          unsettled.add(neighbor);
        }
      }
    }
    if (!previous.has(destinationId)) throw new Error(`从${LOCATION_TEMPLATES[from]?.name ?? from}到${destination.name}没有满足当前条件的连通路线`);
    const locationIds = [destinationId];
    const routeIds = [];
    let cursor = destinationId;
    while (cursor !== from) {
      const step = previous.get(cursor);
      if (!step) throw new Error('路径回溯失败');
      routeIds.unshift(step.routeId);
      locationIds.unshift(step.nodeId);
      cursor = step.nodeId;
    }
    const selectedRoutes = routeIds.map(id => ({...clone(state.地图.路线[id]),costGold:freight?state.地图.路线[id].costGold:0}));
    return {
      from, to: destinationId, mode, locationIds, routeIds, routes: selectedRoutes,
      totalMinutes: selectedRoutes.reduce((sum, route) => sum + route.minutes, 0),
      totalCostGold: selectedRoutes.reduce((sum, route) => sum + route.costGold, 0),
      maxDanger: selectedRoutes.reduce((maximum, route) => Math.max(maximum, route.danger), 0),
      weightedScore: distances.get(destinationId) ?? 0
    };
  }

  function npcMinute(time) { return time.day*1440+time.hour*60+time.minute; }
  function npcTime(minute) { return {day:Math.floor(minute/1440),hour:Math.floor(minute%1440/60),minute:minute%60}; }
  function npcPlanSource(state,plan) {
    if(plan.peer)return (state.世界.npcCollaborations??[]).find(r=>r.id===plan.sourceId);
    if(plan.civic)return (state.世界.cityStages??[]).flatMap(city=>city.trips).find(trip=>trip.id===plan.sourceId);
    if(!plan.personal)return (state.人物.列表[plan.ownerId]?.扩展?.社交约定??[]).find(r=>r.id===plan.sourceId);
    const goal=(state.世界.npcGoals??[]).find(g=>g.id===plan.sourceId);
    return goal?{id:goal.id,kind:'meeting',personId:goal.ownerId,locationId:goal.destinationId,startsAt:goal.arriveAt,endsAt:npcMinute(goal.arriveAt)+60,
      status:['active','arrived'].includes(goal.status)?'accepted':goal.status==='completed'?'completed':'cancelled',events:[{status:'accepted',sourceId:goal.decisionSourceId}]}:null;
  }
  function npcRoute(state,personId,destinationId,from) {
    const person=state.人物.列表[personId];
    if(!person||personId===state.角色.主控单位ID)throw new Error('行程必须属于已登记的其他人物');
    return findPathInState(state,destinationId,'balanced',from??person.locationId,personId);
  }
  function appointmentTravelAvailability(state,record) {
    if(record.kind!=='meeting')return {available:true,reason:''};
    try {
      const person=state.人物.列表[record.personId],unit=state.战斗单位.列表[record.personId];
      if(!person||person.status==='dead'||unit&&(unit.存活状态!=='存活'||unit.资源.生命.当前<=0))throw new Error('对方目前无法赴约');
      if(custody.confined(state,person.id))throw Error('对方正在被看管，不能另行安排赴约');if(logistics.busyReason(state,person.id)||rescue.busyReason(state,person.id))throw Error(logistics.busyReason(state,person.id)||rescue.busyReason(state,person.id));
      const position=actions.positionOf(state,person.id);if(position.kind!=='location'||position.sceneId)throw Error('对方须先实际回到公共通道再安排赴约');
      const path=npcRoute(state,person.id,record.locationId),start=npcMinute(record.startsAt)-path.totalMinutes,now=npcMinute(state.世界.时间);
      if(start<now)throw new Error('按实际路线已来不及在约定时刻抵达');

      if(path.routeIds.length&&(state.远征?.companionContracts??[]).some(c=>c.unitId===person.id))throw new Error('对方已有同行合同，不能同时另行出发');
      if((state.世界.npcPlans??[]).some(p=>p.ownerId===person.id&&!['succeeded','missed','cancelled','blocked'].includes(p.status)&&p.sourceId!==record.id&&npcPlanSource(state,p)?.status==='accepted'&&p.departAt<=record.endsAt&&p.deadline>=start))throw new Error('对方已有包含路途在内的行程，时间冲突');
      return {available:true,reason:'',path,departAt:Math.max(now,start)};
    }catch(error){return {available:false,reason:error.message};}
  }
  function createAppointmentPlan(state,record,reason,sourceId,branchId,personal=false) {
    if(record.kind!=='meeting'||record.status!=='accepted')throw new Error('只有人物实际接受的约见才能安排赴约');
    const plans=state.世界.npcPlans??=[],existing=plans.find(p=>p.sourceId===record.id);
    if(existing)return clone(existing);
    const available=appointmentTravelAvailability(state,record);if(!available.available)throw new Error(available.reason);
    const plan={id:`${personal?'personal':'appointment'}:${record.id}`,...(personal?{personal:true}:{}),ownerId:record.personId,goal:personal?'完成自己的探访行程':'按已接受的约定到场',motive:reason,importance:'detailed',
      sourceId:record.id,acceptedSourceId:sourceId,branchId,createdAt:clone(state.世界.时间),destinationId:record.locationId,
      departAt:available.departAt,arrivalAt:npcMinute(record.startsAt),deadline:record.endsAt,status:'scheduled',nextAt:available.departAt,
      path:clone(available.path),legIndex:0,paidGold:0,runs:[],events:[]};
    state.世界.npcPlans=[...plans,plan];return clone(plan);
  }
  function npcGoalDestinations(state,personId) {
    const person=state.人物.列表[personId];if(!person)return [];
    const ids=new Set([person.locationId,...Object.values(state.地图.路线).filter(r=>[r.from,r.to].includes(person.locationId)).map(r=>r.from===person.locationId?r.to:r.from)]);
    return [...ids].filter(id=>LOCATION_TEMPLATES[id]&&LOCATION_TEMPLATES[id].discovery!=='hidden').flatMap(id=>{
      try{const path=npcRoute(state,personId,id);
        return [{id,name:LOCATION_TEMPLATES[id].name,minutes:path.totalMinutes,costGold:path.totalCostGold,earliestArrival:npcTime(npcMinute(state.世界.时间)+path.totalMinutes+60)}];}catch{return [];}
    });
  }
  function carriedTemplateCount(state,personId,templateId){const p=state.人物.列表[personId];return Object.values(state.物品.实例).filter(i=>i.ownerEntityId===personId&&i.containerId===p?.inventoryContainerId&&i.templateId===templateId).reduce((n,i)=>n+i.quantity,0);}
  function npcSupplyOptions(state,personId){
    const p=state.人物.列表[personId];if(!p)return [];
    return ['bandage','basic-soul-tonic'].filter(id=>!carriedTemplateCount(state,personId,id)).map(templateId=>({templateId,name:ITEM_TEMPLATES[templateId].name,quantity:1,priceGold:calculateItemValue(templateId)*2}))
      .filter(o=>o.priceGold<=(state.钱包.列表[p.walletId]?.gold??0));
  }
  function requestEvent(state,r,kind,status,sourceId,absentIds=[]){
    const owner=state.人物.列表[r.ownerId],player=state.人物.列表[state.角色.主控单位ID],knownBy=[r.ownerId];
    if(owner&&player&&actions.colocated(state,owner.id,player.id)&&!absentIds.includes(player.id)&&player.status!=='dead'&&!String(owner.locationId).startsWith('transit:'))knownBy.push(player.id);
    r.status=status;r.events.push({id:`${r.id}:${r.events.length}`,kind,status,sourceId,time:clone(state.世界.时间),locationId:owner?.locationId??r.locationId,knownBy});
  }
  function createNpcSupplyRequest(state,goal,templateId,fallback){
    const option=npcSupplyOptions(state,goal.ownerId).find(o=>o.templateId===templateId),plan=state.世界.npcPlans.find(p=>p.id===goal.planId),person=state.人物.列表[goal.ownerId];
    if(!option||!plan||!plan.path.routeIds.length||!['go-without','cancel-trip'].includes(fallback))throw new Error('补给委托须有真实缺少物资、出行路线与本人后续选择');
    if(state.钱包.列表[person.walletId].gold<option.priceGold)throw new Error('本人资金不足以支付约定收购价');
    const now=npcMinute(state.世界.时间);if(plan.departAt<=now+60)throw new Error('补给准备须留至少一小时');
    const r={id:`npc-request:${goal.id}`,goalId:goal.id,ownerId:person.id,branchId:goal.branchId,sourceId:goal.decisionSourceId,locationId:person.locationId,templateId,quantity:1,priceGold:option.priceGold,
      createdAt:clone(state.世界.时间),askAt:Math.max(now,plan.departAt-1440),deadline:plan.departAt,fallback,status:'scheduled',nextAt:Math.max(now,plan.departAt-1440),events:[]};
    (state.世界.npcRequests??=[]).push(r);goal.requestIdRef=r.id;return clone(r);
  }
  function observeNpcRequests(state,sourceId,absentIds=[]){
    const player=state.人物.列表[state.角色.主控单位ID];if(!player||absentIds.includes(player.id))return;
    for(const r of state.世界.npcRequests??[])if(r.status==='open'&&npcMinute(state.世界.时间)<r.deadline&&state.人物.列表[r.ownerId]?.locationId===player.locationId&&!r.events.some(e=>e.knownBy.includes(player.id)))requestEvent(state,r,'delivered','open',sourceId,absentIds);
  }
  function advanceNpcRequests(state,at,absentIds=[]){
    for(const r of state.世界.npcRequests??[]){if(r.nextAt===null||r.nextAt>at)continue;
      const person=state.人物.列表[r.ownerId],unit=state.战斗单位.列表[r.ownerId],goal=state.世界.npcGoals.find(g=>g.id===r.goalId),plan=state.世界.npcPlans.find(p=>p.id===goal?.planId);
      if(!person||person.status==='dead'||unit&&(unit.存活状态!=='存活'||unit.资源.生命.当前<=0)||!plan||!['scheduled','travelling','waiting'].includes(plan.status)||!['active','arrived'].includes(goal.status)){
        requestEvent(state,r,'unavailable','cancelled',`${r.id}:unavailable`,absentIds);r.nextAt=null;continue;
      }
      if(carriedTemplateCount(state,r.ownerId,r.templateId)>=r.quantity){requestEvent(state,r,'already-supplied','not-needed',`${r.id}:already-supplied`,absentIds);r.nextAt=null;continue;}
      if(at>=r.deadline){requestEvent(state,r,'expired','expired',`${r.id}:expired`,absentIds);r.nextAt=null;if(r.fallback==='cancel-trip')goal.status='cancelled';continue;}
      if(state.钱包.列表[person.walletId].gold<r.priceGold){requestEvent(state,r,'unaffordable','cancelled',`${r.id}:unaffordable`,absentIds);r.nextAt=null;if(r.fallback==='cancel-trip')goal.status='cancelled';continue;}
      requestEvent(state,r,'opened','open',`${r.id}:opened`,absentIds);r.nextAt=r.deadline;
    }
    observeNpcRequests(state,`observe:${at}`,absentIds);
  }
  function npcRequestFacts(state,observerId=state.角色.主控单位ID,personId,all=false){
    const records=(state.世界.npcRequests??[]).filter(r=>(!personId||r.ownerId===personId)&&r.events.some(e=>e.knownBy.includes(observerId)));
    const selected=all?records:records.filter((r,i)=>r.events.filter(e=>e.knownBy.includes(observerId)).at(-1)?.status==='open'||i>=records.length-8);
    return selected.map(r=>{const events=r.events.filter(e=>e.knownBy.includes(observerId)),last=events.at(-1);return {id:r.id,ownerId:r.ownerId,ownerName:state.人物.列表[r.ownerId].name,goalId:r.goalId,templateId:r.templateId,itemName:ITEM_TEMPLATES[r.templateId].name,quantity:r.quantity,priceGold:r.priceGold,deadline:npcTime(r.deadline),deadlinePassed:npcMinute(state.世界.时间)>=r.deadline,knownStatus:last.status,events:clone(events),fallback:r.fallback,...(last.status==='fulfilled'?{settlement:clone(r.settlement)}:{}),
      meaning:'这是人物为自身出行准备提出的有偿补给请求，不是凭空危机。只展示实际当面获知的消息；远方后续结果未知。收购付款须用本人钱包和真实物品完成，不自动承诺、发奖或入队。玩家可拒绝；人物按预先选定的独行或取消安排处理。'};});
  }
  function respondNpcRequest(rawState,input={},transactionId='respond-npc-request'){
    const guard=transactionStart(rawState,transactionId,'回应补给委托');if(guard.duplicate)return {state:guard.state,receipt:guard.receipt,idempotent:true};const state=guard.state,block=worldActionBlockReason(state);if(block)throw new Error(block);
    const playerUnit=state.战斗单位.列表[state.角色.主控单位ID];if(!playerUnit||playerUnit.存活状态!=='存活'||playerUnit.资源.生命.当前<=0)throw new Error('当前无法行动，不能处理委托');
    const r=(state.世界.npcRequests??[]).find(r=>r.id===input.requestId),player=state.人物.列表[state.角色.主控单位ID],owner=state.人物.列表[r?.ownerId];
    if(!r||r.status!=='open'||npcMinute(state.世界.时间)>=r.deadline||!r.events.some(e=>e.knownBy.includes(player.id))||owner?.locationId!==player.locationId)throw new Error('没有当前当面可处理的补给委托');
    const unit=state.战斗单位.列表[owner.id];if(owner.status==='dead'||unit&&(unit.存活状态!=='存活'||unit.资源.生命.当前<=0))throw new Error('对方当前无法回应');
    if(input.action==='decline'){
      requestEvent(state,r,'declined','declined',transactionId);r.nextAt=null;if(r.fallback==='cancel-trip')state.世界.npcGoals.find(g=>g.id===r.goalId).status='cancelled';
      return commit(state,transactionId,'回应补给委托',{type:'npc-request-declined',requestId:r.id,personId:r.ownerId,fallback:r.fallback,summary:'已拒绝补给委托，不扣关系或财产；对方按自己的后续安排处理。'});
    }
    if(input.action!=='fulfill')throw new Error('请选择交付物资或拒绝委托');
    if(carriedTemplateCount(state,owner.id,r.templateId)>=r.quantity)throw new Error('对方已有所需物资，不再重复收购');
    const item=state.物品.实例[input.itemId];if(item?.templateId!==r.templateId||item.condition!=='完好')throw new Error('请交付约定种类的完好物资');
    previewGift(state,{personId:owner.id,itemId:item.id,quantity:r.quantity});const wallet=state.钱包.列表[owner.walletId];if(wallet.gold<r.priceGold)throw new Error('对方目前资金不足，尚未成交');
    const delivered=transferItem(state,item.id,owner.inventoryContainerId,r.quantity);delivered.legalOwnerEntityId=owner.id;wallet.gold-=r.priceGold;state.钱包.列表[player.walletId].gold+=r.priceGold;
    requestEvent(state,r,'fulfilled','fulfilled',transactionId);r.nextAt=null;r.settlement={sourceId:transactionId,itemId:delivered.id,from:player.id,to:owner.id,quantity:r.quantity,gold:r.priceGold,time:clone(state.世界.时间)};
    (owner.扩展.共同见闻??=[]).push({id:transactionId,kind:'npc-supply',playerId:player.id,participants:[player.id,owner.id],time:clone(state.世界.时间),requestId:r.id,templateId:r.templateId,quantity:r.quantity,gold:r.priceGold});
    return commit(state,transactionId,'回应补给委托',{type:'npc-request-fulfilled',requestId:r.id,personId:r.ownerId,settlement:clone(r.settlement),summary:`已交付${r.quantity}份${ITEM_TEMPLATES[r.templateId].name}，${owner.name}从本人钱包支付${r.priceGold}金币；没有额外奖励或治疗。`});
  }
  function npcRequestOptions(state){
    const player=state.人物.列表[state.角色.主控单位ID];if(!player)return [];
    return npcRequestFacts(state).filter(r=>r.knownStatus==='open'&&!r.deadlinePassed).map(r=>{
      const actual=state.世界.npcRequests.find(v=>v.id===r.id),owner=state.人物.列表[r.ownerId];
      const playerUnit=state.战斗单位.列表[player.id],ownerUnit=state.战斗单位.列表[owner.id];
      const reason=worldActionBlockReason(state)||(!playerUnit||playerUnit.存活状态!=='存活'||playerUnit.资源.生命.当前<=0?'当前无法行动，不能处理委托':'')||(owner.locationId!==player.locationId?'请先实际到对方面前交付':'')||(actual.status!=='open'?'这项委托现在已不可处理':'')||(owner.status==='dead'||ownerUnit&&(ownerUnit.存活状态!=='存活'||ownerUnit.资源.生命.当前<=0)?'对方当前无法回应':'');
      const fulfillReason=reason||(carriedTemplateCount(state,owner.id,r.templateId)>=r.quantity?'对方已有所需物资，不再重复收购':'')||(state.钱包.列表[owner.walletId].gold<r.priceGold?'对方目前资金不足，尚未成交':'');
      const items=reason?[]:Object.values(state.物品.实例).filter(i=>i.ownerEntityId===player.id&&i.containerId===player.inventoryContainerId&&i.templateId===r.templateId&&i.condition==='完好').flatMap(i=>{try{previewGift(state,{personId:owner.id,itemId:i.id,quantity:r.quantity});return [{id:i.id,name:i.name,quantity:i.quantity}];}catch{return [];}});
      return {...r,reason,fulfillReason,items};
    });
  }
  function validateNpcRequests(state,errors){
    if(state.世界.npcRequests===undefined)return;
    try{if(!Array.isArray(state.世界.npcRequests))throw Error('列表');const seen=new Set(),now=npcMinute(state.世界.时间);
      for(const r of state.世界.npcRequests){const goal=(state.世界.npcGoals??[]).find(g=>g.id===r.goalId),plan=(state.世界.npcPlans??[]).find(p=>p.id===goal?.planId);
        if(!goal||goal.kind!=='supply-trip'||goal.requestIdRef!==r.id||r.id!==`npc-request:${goal.id}`||seen.has(r.id)||r.ownerId!==goal.ownerId||r.sourceId!==goal.decisionSourceId||r.branchId!==goal.branchId||!plan||r.deadline!==plan.departAt||r.askAt!==Math.max(npcMinute(r.createdAt),r.deadline-1440)||!['bandage','basic-soul-tonic'].includes(r.templateId)||r.quantity!==1||r.priceGold!==calculateItemValue(r.templateId)*2||!['go-without','cancel-trip'].includes(r.fallback)||!Array.isArray(r.events)||!LOCATION_TEMPLATES[r.locationId])throw Error('来源');seen.add(r.id);
        if(!['scheduled','open','fulfilled','declined','expired','cancelled','not-needed'].includes(r.status)||(r.status==='scheduled'?r.nextAt!==r.askAt:r.status==='open'?r.nextAt!==r.deadline:r.nextAt!==null)||r.nextAt!==null&&r.nextAt<now)throw Error('进度');
        let previous=npcMinute(r.createdAt),prior='scheduled';for(const [i,e] of r.events.entries()){const at=npcMinute(e.time);if(e.id!==`${r.id}:${i}`||typeof e.sourceId!=='string'||!e.sourceId||at<previous||at>now||!Array.isArray(e.knownBy)||!e.knownBy.includes(r.ownerId)||new Set(e.knownBy).size!==e.knownBy.length||e.knownBy.some(id=>![r.ownerId,state.角色.主控单位ID].includes(id))||!['opened','delivered','fulfilled','declined','expired','unavailable','unaffordable','already-supplied'].includes(e.kind))throw Error('消息');
          const status={opened:'open',delivered:'open',fulfilled:'fulfilled',declined:'declined',expired:'expired',unavailable:'cancelled',unaffordable:'cancelled','already-supplied':'not-needed'}[e.kind];
          if(!['scheduled','open'].includes(prior)||e.status!==status||e.kind==='opened'&&(prior!=='scheduled'||at!==r.askAt)||e.kind==='delivered'&&(prior!=='open'||at<r.askAt||at>=r.deadline||!e.knownBy.includes(state.角色.主控单位ID))||['fulfilled','declined'].includes(e.kind)&&(prior!=='open'||at>=r.deadline||!e.knownBy.includes(state.角色.主控单位ID))||e.kind==='expired'&&(prior!=='open'||at!==r.deadline))throw Error('消息顺序');previous=at;prior=status;
        }
        if(r.events.length?(r.events.at(-1).status!==r.status):r.status!=='scheduled')throw Error('状态');
        if(r.status==='fulfilled'&&(!r.settlement||r.settlement.to!==r.ownerId||r.settlement.from!==state.角色.主控单位ID||r.settlement.gold!==r.priceGold||r.settlement.quantity!==r.quantity||r.settlement.sourceId!==r.events.at(-1).sourceId||!r.events.at(-1).knownBy.includes(r.settlement.from)))throw Error('交付');
      }
    }catch(error){errors.push(`人物补给委托${error.message}无效`);}
  }
  function createPersonalPlan(state,goal) {
    return createAppointmentPlan(state,{id:goal.id,kind:'meeting',status:'accepted',personId:goal.ownerId,locationId:goal.destinationId,startsAt:goal.arriveAt,endsAt:npcMinute(goal.arriveAt)+60},goal.motive,goal.decisionSourceId,goal.branchId,true);
  }
  function createCollaborationPlan(state,record,sourceId) {
    createAppointmentPlan(state,record,record.motive,sourceId,record.branchId);
    const plan=state.世界.npcPlans.find(p=>p.sourceId===record.id);plan.peer=true;plan.id=`collaboration:${record.id}`;plan.goal='按本人接受的合作约见到场';return clone(plan);
  }
  function advanceNpcCollaborations(state,at,absentIds=[]) {
    for(const r of state.世界.npcCollaborations??[]){
      if(r.status!=='accepted')continue;
      const people=[state.人物.列表[r.initiatorId],state.人物.列表[r.personId]];
      const failed=people.some(p=>!p||p.status==='dead'||state.战斗单位.列表[p.id]&&(state.战斗单位.列表[p.id].存活状态!=='存活'||state.战斗单位.列表[p.id].资源.生命.当前<=0));
      const both=people.every(p=>p?.locationId===r.locationId&&actions.positionOf(state,p.id).sceneId==='')&&actions.colocated(state,people[0].id,people[1].id),start=npcMinute(r.startsAt);
      const status=failed?'blocked':at>=start&&at<=r.endsAt&&both?'completed':at>r.endsAt?'missed':null;
      if(!status){if(at>=start)r.nextAt=r.endsAt+1;continue;}
      r.status=status;r.nextAt=null;
      const observedLocations=status==='blocked'?people.filter(p=>p&&(p.status==='dead'||state.战斗单位.列表[p.id]&&(state.战斗单位.列表[p.id].存活状态!=='存活'||state.战斗单位.列表[p.id].资源.生命.当前<=0))).map(p=>p.locationId):[r.locationId];
      const priorWitnesses=new Set(r.events.flatMap(e=>e.knownBy));
      const knownBy=Object.values(state.人物.列表).filter(p=>!absentIds.includes(p.id)&&p.status!=='dead'&&observedLocations.includes(p.locationId)&&actions.positionOf(state,p.id).kind==='location'&&!actions.positionOf(state,p.id).sceneId&&(status!=='blocked'||priorWitnesses.has(p.id))).map(p=>p.id);
      // Absent participants do not learn the other's injury or location by telepathy.
      r.events.push({status,sourceId:`${r.id}:${status}`,time:npcTime(at),locationId:r.locationId,knownBy,reason:status==='completed'?'双方按实际行程到场，完成这次约见；未自动交易、发奖或建立队伍':status==='blocked'?'参与者已无法行动，原计划不能完成':'约见窗口结束，双方未实际会合'});
    }
  }
  function npcPlanFacts(state,observerId=state.角色.主控单位ID,personId) {
    return (state.世界.npcPlans??[]).filter(p=>(!personId||p.ownerId===personId)&&(globalThis.SoulPersonChangeKnowledge?.remembersRecord(state,observerId,p.personal?(state.世界.npcGoals??[]).find(g=>g.id===p.sourceId):npcPlanSource(state,p))??true)&&
      (p.ownerId===observerId||p.peer&&(state.世界.npcCollaborations??[]).some(r=>r.id===p.sourceId&&r.events.some(e=>e.knownBy.includes(observerId)))||(state.人物.列表[p.ownerId]?.扩展?.社交约定??[]).some(r=>r.id===p.sourceId&&r.playerId===observerId)||(state.世界.npcGoals??[]).some(g=>g.id===p.sourceId&&g.knownBy.includes(observerId))))
      .map(p=>({id:p.id,ownerId:p.ownerId,sourceId:p.sourceId,goal:p.goal,motive:p.motive,agreementStatus:(state.人物.列表[p.ownerId]?.扩展?.社交约定??[]).find(r=>r.id===p.sourceId)?.status,plannedArrival:npcTime(p.arrivalAt),destinationId:p.destinationId,
        events:clone(p.events.filter(e=>e.knownBy.includes(observerId)))}));
  }
  function advanceNpcPlans(state,target,absentIds=[]) {
    const plans=state.世界.npcPlans??[];
    const recordOf=p=>npcPlanSource(state,p);
    const write=(p,kind,time,details={})=>{
      const knownBy=Object.values(state.人物.列表).filter(person=>person.id===p.ownerId||!absentIds.includes(person.id)&&person.status!=='dead'&&actions.colocated(state,p.ownerId,person.id)).map(person=>person.id);
      p.events.push({id:`${p.id}:${p.events.length}`,kind,time:npcTime(time),sourceId:p.sourceId,knownBy,...details});
      if(p.civic)recordCityMovement(state,p,p.events.at(-1));
    };
    const finish=(p,status,at,reason)=>{const run=p.runs.at(-1);if(run?.endedAt===null)run.endedAt=at;p.status=status;p.nextAt=null;write(p,status,at,{reason,locationId:state.人物.列表[p.ownerId]?.locationId});if(p.civic){const trip=npcPlanSource(state,p);trip.status=status==='succeeded'?'completed':status;trip.events.push({status:trip.status,sourceId:p.id,time:npcTime(at)});}if(p.personal){const goal=state.世界.npcGoals.find(g=>g.id===p.sourceId);goal.status=status==='succeeded'?(goal.kind==='expedition'?'arrived':'completed'):status;if(goal.status!=='arrived')goal.finishedAt=npcTime(at);}};
    // Each plan has finitely many legs and one appointment window; no daily polling.
    while(true){
      const p=plans.filter(p=>p.nextAt!==null&&p.nextAt<=target).sort((a,b)=>a.nextAt-b.nextAt||a.id.localeCompare(b.id))[0];if(!p)break;
      const at=p.nextAt,person=state.人物.列表[p.ownerId],unit=state.战斗单位.列表[p.ownerId],record=recordOf(p);
      if(!person||person.status==='dead'||unit&&(unit.存活状态!=='存活'||unit.资源.生命.当前<=0)){finish(p,'blocked',at,'本人已无法行动');continue;}
      if(combat.occupiedBattle(state,p.ownerId)){p.nextAt=at+1;continue;}
      if(custody.confined(state,p.ownerId)||logistics.busyReason(state,p.ownerId)){finish(p,'blocked',at,'本人正在被看管或承担看管安排，原行程不能继续');continue;}
      if(p.status!=='travelling'&&record?.status!=='accepted'){finish(p,record?.status==='completed'?'succeeded':'cancelled',at,'原约定已经结束');continue;}
      if(p.status==='waiting'){finish(p,p.personal||p.civic||record?.status==='completed'?'succeeded':'missed',at,'本次到访窗口结束；未替玩家完成会面');continue;}
      if(p.status==='travelling'){
        const route=p.path.routes[p.legIndex],to=route.from===p.legFrom?route.to:route.from;
        const run=p.runs.at(-1);if(!run||run.endOffset!==route.minutes)throw Error('人物路程尚未实际抵达');run.arrived=true;run.endedAt=at;movePeopleTo(state,[person.id],to);
        if(to===auction.VENUE)ensureLocationCast(state,to);
        write(p,'arrived',at,{locationId:to,from:p.legFrom,routeId:route.id});p.legIndex++;
        if(record?.status!=='accepted'){finish(p,record?.status==='completed'?'succeeded':'cancelled',at,'在途一段已走完，不瞬移或重复退还旅费');continue;}
      }
      if(p.legIndex>=p.path.routes.length){if(person.locationId!==p.destinationId){finish(p,'blocked',at,'人物已离开约定地点');continue;}if(p.personal&&state.世界.npcGoals.find(g=>g.id===p.sourceId)?.kind==='expedition'){finish(p,'succeeded',at,'已按本人计划实际抵达远征入口');continue;}if(at>p.deadline){finish(p,'missed',at,'实际抵达已经错过约定窗口');continue;}p.status='waiting';p.nextAt=p.deadline+1;if(p.personal)state.世界.npcGoals.find(g=>g.id===p.sourceId).status='arrived';write(p,'waiting',at,{locationId:person.locationId});continue;}
      const route=p.path.routes[p.legIndex],to=route.from===person.locationId?route.to:route.from;
      try {
        if(person.locationId!==p.path.locationIds[p.legIndex])throw new Error('人物已离开原定出发地，须另作安排');
        const position=actions.positionOf(state,person.id);if(position.kind!=='location'||position.sceneId)throw Error('人物须先实际回到公共通道再启程');
        controls.assertAction(state,person.id,'move');
        if((state.远征?.companionContracts??[]).some(c=>c.unitId===person.id))throw new Error('已加入同行，独立行程停止');
        const access=routeAccess(state,route,to,person.id);
        if(!access.pass)throw new Error(`原路线已不可通行：${access.reasons.join('；')}`);

        state.钱包.列表['wallet-world-transit']??={id:'wallet-world-transit',ownerEntityId:'world-transit',gold:0,扩展:{type:'travel-sink'}};

        p.legFrom=person.locationId;write(p,'departed',at,{locationId:person.locationId,to,routeId:route.id,paidGold:0});
        const run={sourceId:`${p.id}:leg:${p.runs.length}`,routeId:route.id,from:p.legFrom,to,totalMinutes:route.minutes,startOffset:0,endOffset:0,startedAt:at,beganAt:at,progressedAt:at,endedAt:null,costGold:0,personIds:[person.id],arrived:false};p.runs.push(run);travelCore.initialize(state,run,p.id,route.mode==='sea'?[]:[person.id],route.mode==='sea'?[person.id]:[]);p.status='travelling';p.nextAt=travelCore.nextAt(run);
      }catch(error){finish(p,'blocked',at,error.message);}
    }
  }
  function npcActionScheduleReason(state,personId,minutes) {
    if(personId===state.角色.主控单位ID)return '';
    const now=npcMinute(state.世界.时间),end=now+minutes;
    return (state.世界.npcPlans??[]).some(p=>p.ownerId===personId&&(p.status==='travelling'||['scheduled','waiting'].includes(p.status)&&p.departAt<end&&p.deadline>=now&&npcPlanSource(state,p)?.status==='accepted'))?'人物已有赴约行程，不能在同一时段另做长行动；请先处理原安排':'';
  }

  function validateNpcPlans(state,errors) {
    const plans=state.世界.npcPlans;if(plans===undefined)return;
    if(!Array.isArray(plans)){errors.push('人物行程记录无效');return;}
    const ids=new Set(),active=new Set(),now=npcMinute(state.世界.时间);
    for(const p of plans){try {
      const person=state.人物.列表[p.ownerId],record=npcPlanSource(state,p);
      if(!person||p.ownerId===state.角色.主控单位ID||!record||record.kind!=='meeting'||p.id!==`${p.civic?'city':p.peer?'collaboration':p.personal?'personal':'appointment'}:${record.id}`||ids.has(p.id)||!record.events.some(e=>e.status==='accepted'&&e.sourceId===p.acceptedSourceId))throw new Error('来源');
      ids.add(p.id);
      if(typeof p.motive!=='string'||!p.motive||typeof p.branchId!=='string'||!p.branchId||p.importance!==(p.civic?'staged':'detailed')||!['scheduled','travelling','waiting','succeeded','missed','cancelled','blocked'].includes(p.status))throw new Error('状态');
      if(!Number.isSafeInteger(p.departAt)||p.departAt<npcMinute(p.createdAt)||p.arrivalAt!==npcMinute(record.startsAt)||p.deadline!==record.endsAt||p.destinationId!==record.locationId||p.departAt>p.arrivalAt)throw new Error('时点');
      if(!p.path||!Array.isArray(p.path.routes)||p.path.to!==p.destinationId||p.path.totalMinutes!==p.arrivalAt-p.departAt||!Number.isSafeInteger(p.legIndex)||p.legIndex<0||p.legIndex>p.path.routes.length)throw new Error('路线');
      let location=p.path.from,total=0;
      for(const route of p.path.routes){if(!routeSnapshotMatches(route,ROUTE_TEMPLATES[route.id])||![route.from,route.to].includes(location))throw new Error('路段');location=route.from===location?route.to:route.from;total+=route.minutes;}
      if(location!==p.destinationId||total!==p.path.totalMinutes||!Array.isArray(p.events))throw new Error('终点');
      let last=npcMinute(p.createdAt),paid=0;
      for(let i=0;i<p.events.length;i++){const e=p.events[i],time=npcMinute(e.time);if(e.id!==`${p.id}:${i}`||e.sourceId!==p.sourceId||!['departed','arrived','waiting','succeeded','missed','cancelled','blocked'].includes(e.kind)||!Number.isSafeInteger(time)||time<last||time>now||!Array.isArray(e.knownBy)||!e.knownBy.includes(p.ownerId)||new Set(e.knownBy).size!==e.knownBy.length||e.knownBy.some(id=>!state.人物.列表[id]))throw new Error('事件');last=time;if(e.kind==='departed'){const route=ROUTE_TEMPLATES[e.routeId];if(!route||![0,route.costGold].includes(e.paidGold))throw new Error('旅费');paid+=e.paidGold;}}
      if(p.paidGold!==paid||!Array.isArray(p.runs)||p.runs.length!==p.events.filter(e=>e.kind==='departed').length)throw new Error('重复旅费或路程来源');for(const run of p.runs){const r=ROUTE_TEMPLATES[run.routeId];travelCore.validate(state,run,r.mode==='sea'?[]:[p.ownerId],r.mode==='sea'?[p.ownerId]:[]);if(run.travel.actionId!==p.id||run.totalMinutes!==r.minutes||!p.events.some(e=>e.kind==='departed'&&e.routeId===r.id&&npcMinute(e.time)===run.beganAt)||run.arrived&&run.endOffset!==r.minutes)throw Error('人物真实路程');}
      const terminal=['succeeded','missed','cancelled','blocked'].includes(p.status);
      if(terminal?p.nextAt!==null:!Number.isSafeInteger(p.nextAt)||p.nextAt<now)throw new Error('下个节点');
      if(p.status==='scheduled'&&p.nextAt!==p.departAt||p.status==='waiting'&&p.nextAt!==p.deadline+1)throw new Error('调度');
      if(p.status==='travelling'){
        const route=p.path.routes[p.legIndex],depart=p.events.at(-1);
        if(active.has(p.ownerId)||!route||depart?.kind!=='departed'||!p.runs.at(-1)||p.nextAt!==travelCore.nextAt(p.runs.at(-1))||person.transit?.actionId!==p.id||state.容器.列表[person.inventoryContainerId].locationId!=='')throw new Error('在途位置');active.add(p.ownerId);
      }
    }catch(error){errors.push(`人物行程${p?.id??''}的${error.message}无效`);}}
  }

  const CITY_DESTINATIONS=Object.freeze({
    'loc-notting-city':'loc-holy-soul-village','loc-balak-city':'loc-notting-city','loc-soto-city':'loc-soto-market',
    'loc-silves-city':'loc-soto-city','loc-heaven-dou-city':'loc-heaven-auction','loc-longxing-city':'loc-gengxin-city',
    'loc-sea-breeze-city':'loc-sea-breeze-port','loc-star-luo-city':'loc-gengxin-city','loc-gengxin-city':'loc-gengxin-metal-market',
    'loc-spirit-city':'loc-jialing-pass','loc-sea-breeze-port':'loc-sea-breeze-city'
  });
  function initializeCityStages(state,sourceId) {
    if(state.世界.cityStages!==undefined)throw new Error('城市起点已经登记');
    const now=npcMinute(state.世界.时间);state.世界.cityStages=[];
    for(const [locationId,destinationId] of Object.entries(CITY_DESTINATIONS)){
      const slot=LOCATION_TEMPLATES[locationId].slots.find(slot=>slot.archetype==='merchant'),slotKey=`${locationId}:${slot.id}`;
      let person=Object.values(state.人物.列表).find(p=>p.扩展?.slotKey===slotKey);
      if(!person)person=spawnLocationResident(state,locationId,slot,1,'city-stage');
      state.世界.cityStages.push({id:`city:${locationId}`,locationId,destinationId,ownerId:person.id,sourceId,createdAt:clone(state.世界.时间),processedTo:now,
        nextAt:now+(3+stableHash(locationId)%4)*1440,phase:'ready',cycle:0,trips:[],events:[]});
    }
  }
  function recordCityMovement(state,plan,event) {
    const city=(state.世界.cityStages??[]).find(c=>c.trips.some(t=>t.id===plan.sourceId));
    if(!city||event.locationId!==city.locationId||!['departed','arrived'].includes(event.kind))return;
    const kind=event.kind==='departed'?'shop-unattended':'shop-returned';
    city.events.push({id:`${city.id}:notice:${city.events.length}`,kind,time:clone(event.time),sourceId:event.id,planId:plan.id,ownerId:city.ownerId,locationId:city.locationId,branchId:plan.branchId,
      observations:event.knownBy.map(observerId=>({observerId,at:clone(event.time),channel:'witness'})),
      meaning:kind==='shop-unattended'?'掌柜外出办理商事，店前挂上了暂歇的告示。':'掌柜已经回来，商行可以重新营业。'});
  }
  function observeCityNotices(state,locationId,sourceId) {
    const city=(state.世界.cityStages??[]).find(c=>c.locationId===locationId),observerId=state.角色.主控单位ID;if(!city||!observerId)return;
    for(const event of city.events)if(!event.observations.some(o=>o.observerId===observerId))event.observations.push({observerId,at:clone(state.世界.时间),channel:'local-notice',sourceId});
  }
  function cityStageFacts(state) {
    const observerId=state.角色.主控单位ID;
    return (state.世界.cityStages??[]).flatMap(city=>{
      const events=city.events.filter(e=>e.observations.some(o=>o.observerId===observerId));
      if(city.locationId!==state.地图.当前地点ID&&!events.length)return [];
      const owner=state.人物.列表[city.ownerId];
      return [{locationId:city.locationId,name:LOCATION_TEMPLATES[city.locationId].name,...(city.locationId===state.地图.当前地点ID?{currentBusiness:owner.status==='dead'?'closed':owner.locationId===city.locationId?'attended':'unattended',merchantId:city.ownerId}:{}),
        totalKnownEvents:events.length,events:events.slice(-6).map(e=>({...clone(e),observations:clone(e.observations.filter(o=>o.observerId===observerId))})),
        history:{kind:'city-history',locationId:city.locationId,before:-1},meaning:'商行公告仅证明已知营业变化和来源。time是发生时刻，observations.at是本人获知时刻；远处当前营业与人物位置不展示。商行往来不是已经采购成功或获得收益，未知细节不补造。'}];
    });
  }
  function cityHistory(state,options={}) {
    const city=(state.世界.cityStages??[]).find(c=>c.locationId===options.locationId);if(!city)throw new Error('没有这处城市记录');
    const playerId=state.角色.主控单位ID,events=city.events.filter(e=>e.observations.some(o=>o.observerId===playerId));
    if(!Number.isSafeInteger(options.before)||options.before< -1||options.before>events.length)throw new Error('城市记录页码无效');
    const end=options.before===-1?events.length:options.before,start=Math.max(0,end-8);
    return {type:'city-history',locationId:city.locationId,total:events.length,nextBefore:start||null,events:events.slice(start,end).reverse().map(e=>({...clone(e),observations:e.observations.filter(o=>o.observerId===playerId).map(clone)})),meaning:'仅本人已见的现场或当地公开告示；查询不推进世界，不补充未获知的远方结果。'};
  }
  function advanceCityStages(state,at) {
    for(const city of state.世界.cityStages??[]){
      if(city.nextAt===null||city.nextAt>at)continue;
      city.processedTo=at;const owner=state.人物.列表[city.ownerId];
      if(combat.occupiedBattle(state,city.ownerId)){city.nextAt=at+1;continue;}
      if(!owner||owner.status==='dead'){city.phase='stopped';city.nextAt=null;city.lastDecision={at:npcTime(at),reason:'掌柜已经无法行动，不重建或复活人物'};continue;}
      if(city.phase==='returning'&&owner.locationId===city.locationId){city.phase='ready';city.nextAt=at+7*1440;continue;}
      const busy=rescue.busyReason(state,city.ownerId)||(state.世界.npcPlans??[]).find(p=>p.ownerId===city.ownerId&&p.nextAt!==null);
      const goal=(state.世界.npcGoals??[]).findLast(g=>g.ownerId===city.ownerId);
      if(busy||goal?.reconsiderAfter>at){city.nextAt=Math.max(at+60,busy?busy.deadline+1:0,goal?.reconsiderAfter??0);city.lastDecision={at:npcTime(at),reason:'已有具体目标或约定，普通商行安排顺延'};continue;}
      const returning=city.phase!=='ready'||owner.locationId!==city.locationId,destinationId=returning?city.locationId:city.destinationId;
      try{
        const path=npcRoute(state,city.ownerId,destinationId),wallet=state.钱包.列表[owner.walletId];
        if(!path.routeIds.length){city.phase='ready';city.nextAt=at+7*1440;continue;}
        const id=`${city.id}:trip:${city.trips.length}`,arrival=at+path.totalMinutes;
        const trip={id,kind:'meeting',personId:city.ownerId,locationId:destinationId,startsAt:npcTime(arrival),endsAt:arrival+(returning?0:120),status:'accepted',
          direction:returning?'return':'outward',branchId:state.扩展?.story?.branchId??'initial',events:[{status:'accepted',sourceId:id,time:npcTime(at)}]};
        const possible=appointmentTravelAvailability(state,trip);if(!possible.available)throw new Error(possible.reason);
        city.trips.push(trip);createAppointmentPlan(state,trip,returning?'办完商行往来后返回原店':'按普通商行安排前往附近聚落或市集处理往来；未宣称成交或取得奖励',id,trip.branchId);
        const plan=state.世界.npcPlans.find(p=>p.sourceId===id);plan.id=`city:${id}`;plan.civic=true;plan.importance='staged';plan.goal=returning?'返回商行所在地':'处理商行往来';
        city.phase=returning?'returning':'away';city.nextAt=trip.endsAt+1;city.cycle+=returning?0:1;city.lastDecision={at:npcTime(at),sourceId:id,reason:plan.motive};
      }catch(error){city.nextAt=at+7*1440;city.lastDecision={at:npcTime(at),reason:error.message};}
    }
  }
  function validateCityStages(state,errors) {
    if(state.世界.cityStages===undefined)return;
    try{
      if(!Array.isArray(state.世界.cityStages))throw Error('记录');const seen=new Set(),now=npcMinute(state.世界.时间);
      for(const c of state.世界.cityStages){
        const owner=state.人物.列表[c.ownerId],slot=LOCATION_TEMPLATES[c.locationId]?.slots.find(s=>s.archetype==='merchant');if(!owner||!slot||owner.扩展?.slotKey!==`${c.locationId}:${slot.id}`||c.id!==`city:${c.locationId}`||CITY_DESTINATIONS[c.locationId]!==c.destinationId||seen.has(c.id)||typeof c.sourceId!=='string'||!c.sourceId||!Array.isArray(c.trips)||!Array.isArray(c.events)||!['ready','away','returning','stopped'].includes(c.phase))throw Error('来源');seen.add(c.id);
        if(c.cycle!==c.trips.filter(t=>t.direction==='outward').length)throw Error('周期');
        if(!Number.isSafeInteger(c.processedTo)||c.processedTo<npcMinute(c.createdAt)||c.processedTo>now||(c.nextAt===null?c.phase!=='stopped':!Number.isSafeInteger(c.nextAt)||c.nextAt<now))throw Error('进度');
        for(let i=0;i<c.trips.length;i++){const t=c.trips[i];if(t.id!==`${c.id}:trip:${i}`||t.personId!==c.ownerId||typeof t.branchId!=='string'||!['outward','return'].includes(t.direction)||t.locationId!==(t.direction==='outward'?c.destinationId:c.locationId)||!['accepted','completed','cancelled','blocked','missed'].includes(t.status)||!(state.世界.npcPlans??[]).some(p=>p.civic&&p.ownerId===c.ownerId&&p.sourceId===t.id&&p.branchId===t.branchId))throw Error('行程');}
        for(let i=0;i<c.events.length;i++){const e=c.events[i],plan=(state.世界.npcPlans??[]).find(p=>p.id===e.planId),source=plan?.events.find(p=>p.id===e.sourceId);if(e.id!==`${c.id}:notice:${i}`||!source||e.locationId!==c.locationId||e.ownerId!==c.ownerId||e.branchId!==plan.branchId||e.kind!==(source.kind==='departed'?'shop-unattended':'shop-returned')||!['departed','arrived'].includes(source.kind)||source.locationId!==c.locationId||npcMinute(e.time)!==npcMinute(source.time)||!Array.isArray(e.observations))throw Error('公告');
          for(const o of e.observations)if(!state.人物.列表[o.observerId]||!['witness','local-notice'].includes(o.channel)||npcMinute(o.at)<npcMinute(e.time)||npcMinute(o.at)>now||o.channel==='witness'&&!source.knownBy.includes(o.observerId)||o.channel==='local-notice'&&typeof o.sourceId!=='string')throw Error('获知来源');
        }
      }
    }catch(error){errors.push(`城市阶段${error.message}无效`);}
  }
  function logisticsHooks(){return {ensureBody:promoteNpcInternal,locations:LOCATION_TEMPLATES,routes:ROUTE_TEMPLATES,routeSnapshotMatches,route:(s,id,to,from)=>findPathInState(s,to,'balanced',from,id),assertRoute:(s,id,route,to)=>{const access=routeAccess(s,route,to,id);if(!access.pass)throw Error(access.reasons.join("；"));},transferItem,movePeopleTo,advanceActionTime,canSwallow:poison.canSwallow,ingestServing:poison.ingestServing};}
  function cooperationHooks(){return {ensureBody:promoteNpcInternal,occupied:occupiedCompanionIds,joinReason:partyOwnershipReason,dungeons:()=>globalThis.SoulExpeditionEngine?.DUNGEON_PROFILES??{},busy:(s,id)=>logistics.busyReason(s,id)||rescue.busyReason(s,id)||combat.occupiedBattle(s,id)||(s.世界.npcPlans??[]).some(p=>p.ownerId===id&&['scheduled','travelling','waiting'].includes(p.status))};}
  function fieldControlOptions(state,viewerId=state.角色.主控单位ID,options={}){return fieldControl.options(state,viewerId,{...options,locationKnown:(id,locationId)=>isLocationKnown(state,locationId,id),destinations:id=>Object.values(LOCATION_TEMPLATES).filter(l=>isLocationKnown(state,l.id,viewerId)&&locationAccess(state,l.id,id).pass&&l.id!==state.人物.列表[id].locationId).filter(l=>{try{remainingTravelPath(state,l.id,'balanced',id);return true;}catch{return false;}}).map(l=>({id:l.id,name:l.name})),locationName:id=>LOCATION_TEMPLATES[id]?.name});}
  function custodyFacts(state,viewerId=state.角色.主控单位ID,options={}){
    const section=options.section,all=section===undefined,want=(...ids)=>all||ids.includes(section);
    const planPath = createRoutePlanner(state);
    const base=custody.facts(state,viewerId,all?{}:{summary:section!==1,selectedOnly:section===1,selectedPersonId:options.selectedPersonId});
    const rescues=want(0)?rescue.facts(state,viewerId):[],includeDestinations=all||section!==0||rescues.some(r=>r.evacuation);
    return {...base,sealing:want(1)?sealing.facts(state,viewerId):null,
      auctions:want(4)?auction.facts(state,viewerId):[],auctionVenue:auction.VENUE,tradeOptions:want(4)?market.options(state,viewerId):[],trades:want(4)?market.facts(state,viewerId):[],gifts:want(5)?gifts.facts(state,viewerId):[],
      cooperations:want(3)?cooperation.facts(state,viewerId):[],fieldOrders:want(5)?fieldControl.facts(state,viewerId):[],
      fieldControlOptions:want(5)?fieldControlOptions(state,viewerId,{summaryOnly:!all}):[],
      preparations:want(3)?preparations.facts(state,viewerId):[],preparationOptions:want(3)?preparations.options(state,viewerId):[],
      logistics:want(0,2,5)?logistics.facts(state,viewerId,{planPath,includeDestinations}):{viewerId},social:want(0,3,5)?social.facts(state,viewerId):null,rescues};
  }

  function transitSource(state,t,id){const plan=(state.世界.npcPlans??[]).find(p=>p.id===t.actionId&&p.ownerId===id),run=plan?.runs?.find(r=>r.sourceId===t.stepSourceId);if(run)return {...clone(run),ownerId:id,after:run.endedAt??run.progressedAt};return logistics.transitSource(state,t,id)??rescue.transitSource(state,t,id)??sealing.transitSource(state,t,id);}
  function custodyHooks(){return {communicationProof:social.communicationProof,memoryContext:social.memoryContext,remembers:social.remembers,applyDevice:combat.applyCustodyDevice,removeDevice:combat.removeCustodyDeviceStatuses,transferItem,commitDraft:foundation.commitStateDraft};}
  function custodyMedicalHooks(){return {settle:(s,q,id)=>{const result=q.type==='buy-medical-supply'?globalThis.SoulExpeditionEngine.buySupply(s,q.templateId,1,id,{actorId:q.actorId}):useRestorativeItem(s,q,id);foundation.commitStateDraft(s,result.state);return result.receipt;}};}
  function actionInterruption(state,guard){
    if(!guard)return null;
    for(const personId of guard.personIds){const death=state.人物.列表[personId]?.life?.death;if(death)return {id:`lifespan:${personId}:${death.at}`,kind:death.cause==='寿命耗尽'?'life-exhausted':'person-death',personId,at:death.at,sourceId:death.id,locationId:state.人物.列表[personId].locationId,reason:`${state.人物.列表[personId].name}已经死亡，原同行行程暂停`};}
    for(const personId of guard.personIds){
      const death=state.人物.列表[personId]?.life?.death;
      if(death)return {id:`lifespan:${personId}:${death.at}`,kind:death.cause==='寿命耗尽'?'life-exhausted':'person-death',personId,at:death.at,sourceId:death.id,locationId:state.人物.列表[personId].locationId,reason:`${state.人物.列表[personId].name}已经死亡，原同行行程暂停`};
      const cooperationRef=guard.cooperationRefs?.find(r=>r.personId===personId);if(cooperationRef){const a=cooperation.table(state).agreements.find(a=>a.id===cooperationRef.cooperationId),event=cooperation.table(state).events.filter(e=>e.agreementId===a?.id).at(-1);if(!a||cooperation.invalidReason(state,a)||event?.id!==cooperationRef.authorityEventId)return {id:`cooperation:${guard.actionId}:${cooperationRef.cooperationId}:${event?.order}`,kind:'cooperation-ended',actionId:guard.actionId,personId,cooperationId:cooperationRef.cooperationId,authorityEventId:cooperationRef.authorityEventId,sourceId:event?.id,at:people.now(state),reason:'同行许可或原强制控制已经失效，双方停在当前实际道路'};}
      const battle=actions.battleOf(state,personId),source=rescue.table(state).events.find(e=>e.kind==='battle-started'&&e.battleId===battle?.id&&e.participantIds.includes(personId));
      if(source)return {id:`battle:${guard.actionId}:${battle.id}`,kind:'battle-started',actionId:guard.actionId,personId,battleId:battle.id,rescueId:source.rescueId,at:people.now(state),sourceId:source.id,reason:'营救者已在现场发动攻击，当前行动暂停'};
      const limits=controls.restrictions(state,personId);
      const autonomyProof=(guard.requirement||(guard.requirements??[]).length)?influence.autonomyBlockProof(state,personId,{domain:guard.requirement==='movement'?'移动':'修炼'}):null;
      if(autonomyProof){const commandEnded=fieldControl.travelInterruption(state,guard.fieldOrderRef,guard.actionId);if(commandEnded)return commandEnded;const status=autonomyProof.status,at=people.now(state);return {id:`blocked:${guard.actionId}:${status.id}:${at}`,kind:'action-blocked',personId,at,order:people.nextEventOrder(state),sourceId:status.来源.结算单ID,statusId:status.id,requirement:'autonomy',proof:status,controlEpisodeId:autonomyProof.episodeId,reason:`${state.人物.列表[personId].name}受到精神接管，原自主行动暂停`};}
      const requirement=[guard.requirement,...(guard.requirements??[])].find(r=>limits.blocked[r]?.length)??guard.requirement;
      const id=limits.blocked[requirement]?.[0]?.statusId??controls.active(state,personId).find(s=>['status.sleep','status.stun'].includes(s.模板ID))?.id;
      if(!id)continue;
      const status=state.状态实例.列表[id],at=people.now(state);
      const desireEvent=requirement==='focus'?(state.扩展.desireEvents??[]).filter(e=>e.actorId===personId).at(-1):null;
      return {id:`blocked:${guard.actionId}:${id}:${at}`,kind:'action-blocked',personId,at,order:people.nextEventOrder(state),sourceId:status.来源.结算单ID,statusId:id,requirement,proof:clone(status),...(desireEvent?{desireEventRef:{id:desireEvent.id,hash:desireEvent.hash}}:{}),reason:`${state.人物.列表[personId].name}的${controls.LABELS[requirement]}条件已经失效，本次行动暂停`};
    }
    if(guard.stopForForegroundBattle&&state.战斗?.状态==='进行中'&&state.战斗.扩展?.clock?.mode==='foreground'){const battle=state.战斗,source=rescue.table(state).events.find(e=>e.kind==='battle-started'&&e.battleId===battle.id&&e.participantIds.includes(state.角色.主控单位ID));if(source)return {id:`battle:${guard.actionId}:${battle.id}`,kind:'foreground-battle',actionId:guard.actionId,personId:guard.personIds[0],battleId:battle.id,rescueId:source.rescueId,at:people.now(state),sourceId:source.id,reason:'当前战斗需要本人决定，其他旅行暂停在实际进度'};}
    return fieldControl.travelInterruption(state,guard.fieldOrderRef,guard.actionId);
  }
  function validateCooperationInterruption(state,a,e){const events=cooperation.table(state).events,source=events.find(v=>v.id===e.sourceId),auth=events.find(v=>v.id===e.authorityEventId),step=a.steps.find(s=>s.sourceId===e.decisionSourceId&&s.status==='interrupted'&&npcMinute(s.after)===e.at);if(!source||!auth||!step||a.kind!=='travel'||!step.cooperationRefs?.some(r=>r.personId===e.personId&&r.cooperationId===e.cooperationId&&r.authorityEventId===auth.id)||auth.record.status!=='active'||auth.agreementId!==e.cooperationId||auth.record.leaderId!==a.ownerId||auth.record.memberId!==e.personId||auth.at>npcMinute(step.before)||source.agreementId!==e.cooperationId||source.order<=auth.order||!['suspended','ended'].includes(source.record.status)||source.at!==e.at||e.actionId!==a.id||npcMinute(e.time)!==e.at||e.id!==`cooperation:${a.id}:${e.cooperationId}:${source.order}`)throw Error('同行许可中断来源');}
  function validateBattleInterruption(state,action,e){
    const source=rescue.table(state).events.find(r=>r.id===e.sourceId&&r.kind==='battle-started'),step=action.steps.find(s=>s.sourceId===e.decisionSourceId&&s.status==='interrupted'&&npcMinute(s.after)===e.at);
    if(!step||!source||source.battleId!==e.battleId||source.rescueId!==e.rescueId||!source.participantIds.includes(e.kind==='foreground-battle'?state.角色.主控单位ID:e.personId)||![action.ownerId,...(step.companionIds??[])].includes(e.personId)||e.actionId!==action.id||e.id!==`battle:${action.id}:${e.battleId}`||e.at!==source.at||npcMinute(e.time)!==e.at)throw Error('营救战斗打断来源');
  }
  function validateActionInterruption(state,action,e){
    const step=action.steps.find(s=>s.sourceId===e.decisionSourceId&&s.status==='interrupted'&&npcMinute(s.after)===e.at);
    const allowed=action.kind==='cultivation'?['soul-power','focus','autonomy']:action.kind==='travel'?['movement','autonomy']:[];
    const snapshot={状态实例:{列表:{[e.statusId]:e.proof}}};
    const desire=e.requirement==='focus'?(state.扩展.desireEvents??[]).find(v=>v.id===e.desireEventRef?.id):null;
    const focus=desire&&desire.hash===e.desireEventRef.hash&&desire.actorId===e.personId&&!desire.success&&desire.strength>=2&&desire.at<=e.at&&desire.sourceIds.includes(e.statusId)&&!(state.扩展.desireEvents??[]).some(v=>v.actorId===e.personId&&v.at<=e.at&&v.at>desire.at);
    // A historical restraint must be read from its permanent attachment events,
    // rather than today's item or an empty item table after it was released.
    const itemId=e.proof?.来源?.物品ID,bindingEvents=custody.table(state).events.filter(v=>v.itemId===itemId&&['restraint-attached','restraint-mode-changed','restraint-detached','restraint-rights-transferred'].includes(v.type)&&v.at<=e.at&&v.order<e.order),binding=bindingEvents.at(-1);
    const itemBinding=e.proof?.扩展?.持续来源合同?.sourceKind==='restraint'&&Number.isSafeInteger(e.order)&&e.order<=state.扩展.personEventSequence&&binding&&binding.type!=='restraint-detached'&&binding.attachment?.wearerId===e.personId&&binding.attachment.mode!=='released'&&binding.attachment.effectIds?.includes(e.statusId)&&bindingEvents.some(v=>e.sourceId===`${v.sourceId}:device:${itemId}`&&e.proof.来源.技能ID===`restraint:${itemId}:${v.sourceId}`&&v.attachment?.effectIds?.includes(e.statusId))&&[...controls.bindingRequirements(e.proof),...controls.powerSealRequirements(e.proof)].includes(e.requirement);
    const autonomy=e.requirement==='autonomy'&&influence.validAutonomyBlockProof(state,{episodeId:e.controlEpisodeId,status:e.proof},e.personId,e.at,e.order);
    if(!step||!allowed.includes(e.requirement)||![action.ownerId,...(step.companionIds??[])].includes(e.personId)||e.id!==`blocked:${action.id}:${e.statusId}:${e.at}`||e.proof?.id!==e.statusId||e.sourceId!==e.proof?.来源?.结算单ID||npcMinute(e.time)!==e.at||!combat.validateControlSourceProof(e.proof,e.personId,sealing.statusTime(state,e.proof,e.at))||!(e.requirement==='autonomy'?autonomy:focus||itemBinding||controls.restrictions(snapshot,e.personId).blocked[e.requirement]?.length||['status.sleep','status.stun'].includes(e.proof.模板ID)))throw Error('行动限制打断来源');
  }
  function progressTravelsAt(state,at,options){options.onAdvance?.(at);for(const p of state.世界.npcPlans??[])if(p.status==='travelling'&&state.人物.列表[p.ownerId]?.status!=='dead'&&!sealing.active(state,p.ownerId)&&state.人物.列表[p.ownerId].transit?.actionId===p.id)travelCore.advanceAt(state,p.runs.at(-1),at);logistics.progressAt(state,at);rescue.progressAt(state,at);}
  function refreshTravelsAt(state,at,options){options.onSettled?.(at);for(const p of state.世界.npcPlans??[])if(p.status==='travelling'){const reason=state.人物.列表[p.ownerId]?.status==='dead'?'本人已经死亡':state.人物.列表[p.ownerId]?.transit?.actionId!==p.id?'实际路程已结束或封存':controls.actionReason(state,p.ownerId,'move');if(reason||controls.active(state,p.ownerId).some(v=>['status.sleep','status.stun'].includes(v.模板ID))){p.status='blocked';p.nextAt=null;p.runs.at(-1).endedAt=at;p.events.push({id:`${p.id}:${p.events.length}`,kind:'blocked',time:npcTime(at),sourceId:p.sourceId,knownBy:[p.ownerId],reason:reason||'本人无法清醒行进',locationId:''});if(p.personal){const goal=state.世界.npcGoals.find(g=>g.id===p.sourceId);goal.status='blocked';goal.finishedAt=npcTime(at);}if(p.civic){const trip=npcPlanSource(state,p);trip.status='blocked';trip.events.push({status:'blocked',sourceId:p.id,time:npcTime(at)});recordCityMovement(state,p,p.events.at(-1));}}else p.nextAt=travelCore.rebaseAt(state,p.runs.at(-1),at);}logistics.refreshTravelAt(state,at);rescue.refreshTravelAt(state,at);}
  function advanceIntimateAt(state,before,total,statusEvents){
    const core=globalThis.SoulIntimateCore,minutes=total-before;if(!core||minutes<=0)return;
    for(const person of Object.values(state.人物?.列表??{})){
      const id=person.id;if(!id||!state.人物.列表[id])continue;
      const worn=core.wornItems(state,id),hosts=globalThis.SoulHostCore?.hostItems?.(state,id)??[],tracked=worn.length>0||hosts.length>0||person.扩展?.生理;
      if(!tracked)continue;
      const result=core.tick(state,id,minutes,{now:total,stimuli:core.stimuliFromItems(state,id),locked:core.urineLocked(state,id)});
      for(const event of result.events){const list=state.扩展.intimateEvents??=[],recorded={id:`intimate:${list.length+1}`,...event,targetId:id};list.push(recorded);
        if(Array.isArray(statusEvents))statusEvents.push({event:event.type==='climax'?'intimate-climax':'intimate-incontinence',targetId:id,at:total,forced:event.forced!==false,reason:event.reason??''});
        if(event.type==='climax'&&state.战斗?.状态==='进行中'&&state.战斗?.扩展?.成员?.[id]){
          const unit=state.战斗单位?.列表?.[id];
          if(unit){const receiptId=`intimate-climax:${id}`,source=combat.physiologicalStunSource(id,id,receiptId,recorded.id);combat.applyStatus(state,unit,unit,source.effectGraph.nodes[1],receiptId,{targetId:id,skillId:source.id,effects:[]},source);}
        }
      }
    }
  }
  function advanceTime(state, minutesInput, options={}) {
    const before=options.calculationResume?.before??npcMinute(state.世界.时间),total=options.calculationResume?.total??before+integer(minutesInput,0);
    if(state.终局挑战?.当前?.projection?.scope==='historical-projection'||options.combatProjection===true){
      // This is the encounter's disposable clock. World schedules, markets and
      // background battles remain suspended until the reality snapshot returns.
      for(let at=before+1;at<=total;at++){
        state.世界.时间=npcTime(at);
        creation.advanceAt(state,at);poison.advanceAt(state,at,options.statusEvents?{statusEvents:options.statusEvents}:null);
        combat.advanceWorldPoisonAt(state,at,options.statusEvents?{statusEvents:options.statusEvents}:null);
        combat.advanceWorldRegenerationAt(state,at,options.statusEvents?{statusEvents:options.statusEvents}:null);
        influence.advanceAt(state,at);combat.settleWorldStatusesAt(state,at);
        globalThis.SoulAbilityExchange.advanceDesireAt(state,at);
        combat.advanceMaintenanceAt(state,at,'',options.maintenanceEvents?{maintenanceEvents:options.maintenanceEvents}:null);
      }
      advanceIntimateAt(state,before,total,options.statusEvents);
      return {minutes:total-before};
    }
    globalThis.SoulPersonShame?.advanceAt?.(state,people.now(state));
    const maintenanceReceipt=options.maintenanceEvents?{maintenanceEvents:options.maintenanceEvents}:null;
    let interruption=options.calculationResume?.interruption??null;
    const stopped=()=>options.stopActorId&&people.isDead(state,options.stopActorId)||!!interruption||options.stopWhen?.();
    if(!options.calculationResume){
    creation.advanceAt(state,before);poison.syncResidents(state);people.settleAt(state);logistics.advanceAt(state,before,logisticsHooks());social.advanceAt(state,before);gifts.advanceAt(state);market.advanceAt(state);sealing.advanceAt(state);auction.advanceAt(state);publicAuction.advanceAt(state);rescue.advanceAt(state,before,logisticsHooks());cooperation.reconcile(state);preparations.reconcile(state);logistics.advanceAt(state,before,logisticsHooks());
    combat.pruneMaintenance(state,maintenanceReceipt);interruption=actionInterruption(state,options.actionGuard);refreshTravelsAt(state,before,options);commerceMessages.advanceAt(state);
    }
    // Merge only due concrete and city-stage nodes; no per-person daily simulation.
    while(true){
      if(stopped())break;
      const due=[...(state.世界.npcPlans??[]),...(state.世界.cityStages??[]),...(state.世界.npcCollaborations??[]),...(state.世界.npcRequests??[])].map(p=>p.nextAt).filter(at=>at!==null&&at<=total);
      const expeditionAt=expeditionSchedule.nextAt(state,total);if(expeditionAt!==null)due.push(expeditionAt);
      const expiry=people.nextExpiry(state,total);if(expiry!==null)due.push(expiry);
      const constructAt=creation.nextAt(state,total);if(constructAt!==null)due.push(constructAt);
      const realmExpiry=globalThis.SoulResidentRealms.nextAt(state,total);if(realmExpiry!==null)due.push(realmExpiry);
      const statusExpiry=controls.nextExpiry(state,total);if(statusExpiry!==null)due.push(statusExpiry);
      const sourcePoisonAt=poison.nextAt(state,total);if(sourcePoisonAt!==null)due.push(sourcePoisonAt);
      const desireAt=globalThis.SoulAbilityExchange.nextDesireAt(state,total);if(desireAt!==null)due.push(desireAt);
      const regenAt=combat.nextWorldRegenerationAt(state,total);if(regenAt!==null)due.push(regenAt);
      const poisonAt=combat.nextWorldPoisonAt(state,total);if(poisonAt!==null)due.push(poisonAt);
      const cognitionAt=influence.nextAt(state,total);if(cognitionAt!==null)due.push(cognitionAt);
      const battleAt=combat.nextBackgroundBattleAt(state,total);if(battleAt!==null)due.push(battleAt);
      const maintenanceAt=combat.nextMaintenanceAt(state,total);if(maintenanceAt!==null)due.push(maintenanceAt);
      const restraintAt=custody.nextAt(state,total);if(restraintAt!==null)due.push(restraintAt);
      const deviceLockAt=globalThis.SoulDeviceLocks.nextAt(state,people.now(state),total);if(Number.isFinite(deviceLockAt))due.push(deviceLockAt);
      const socialAt=social.nextAt(state,total);if(socialAt!==null)due.push(socialAt);
      const auctionAt=auction.nextAt(state,total);if(auctionAt!==null)due.push(auctionAt);
      const sealingAt=sealing.nextAt(state,total);if(sealingAt!==null)due.push(sealingAt);
      const publicAuctionAt=publicAuction.nextAt(state,total);if(publicAuctionAt!==null)due.push(publicAuctionAt);
      const commercialMessageAt=commerceMessages.nextAt(state,total);if(commercialMessageAt!==null)due.push(commercialMessageAt);
      const stockAt=stock.nextAt(state,total);if(stockAt!==null)due.push(stockAt);const supplyAt=globalThis.SoulCommerceAuctionSupply.nextAt(state,total);if(supplyAt!==null)due.push(supplyAt);
      const marketAt=market.nextAt(state,total);if(marketAt!==null)due.push(marketAt);
      const giftAt=gifts.nextAt(state,total);if(giftAt!==null)due.push(giftAt);
      const logisticsAt=logistics.nextAt(state,total);if(logisticsAt!==null)due.push(logisticsAt);
      const deploymentAt=globalThis.SoulCombatDeployments.nextAt(state,total);if(deploymentAt!==null)due.push(deploymentAt);
      const contractAt=globalThis.SoulPersonContracts.nextAt(state,total);if(contractAt!==null)due.push(contractAt);
      const shameAt=globalThis.SoulPersonShame?.nextAt?.(state,total);if(shameAt!==null&&shameAt!==undefined)due.push(shameAt);
      const performanceAt=globalThis.SoulPerformanceAgreements.nextAt(state,total);if(performanceAt!==null)due.push(performanceAt);
      const cooperationAt=cooperation.nextAt(state,total);if(cooperationAt!==null)due.push(cooperationAt);
      const rescueAt=rescue.nextAt(state,total,logisticsHooks(),options.onAdvance?options.absentIds:[]);if(rescueAt!==null)due.push(rescueAt);
      const boundary=options.nextBoundaryAt?.(total);if(boundary!==null&&boundary!==undefined)due.push(boundary);
      if(!due.length)break;const at=Math.min(...due),crossings=rescue.crossings(state,at,logisticsHooks(),options.onAdvance?options.absentIds:[]);state.世界.时间=npcTime(at);globalThis.SoulPersonShame?.advanceAt?.(state,at);globalThis.SoulDeviceLocks.advanceAt(state,at);progressTravelsAt(state,at,options);
      globalThis.SoulResidentRealms.reconcile(state);creation.advanceAt(state,at);people.settleAt(state,at);poison.advanceAt(state,at,options.statusEvents?{statusEvents:options.statusEvents}:null);combat.advanceWorldPoisonAt(state,at,options.statusEvents?{statusEvents:options.statusEvents}:null);combat.advanceWorldRegenerationAt(state,at,options.statusEvents?{statusEvents:options.statusEvents}:null);influence.advanceAt(state,at);combat.settleWorldStatusesAt(state,at);globalThis.SoulAbilityExchange.advanceDesireAt(state,at);combat.advanceMaintenanceAt(state,at,'',maintenanceReceipt);people.settleAt(state,at);combat.settleWorldStatusesAt(state,at);globalThis.SoulAbilityExchange.reconcile(state);custody.advanceAt(state,at,custodyHooks());cooperation.reconcile(state);preparations.reconcile(state);rescue.enterEncounters(state,crossings,logisticsHooks());rescue.advanceAt(state,at,logisticsHooks());logistics.advanceAt(state,at,logisticsHooks());combat.advanceBackgroundBattlesAt(state,at);for(const battleId of Object.keys(state.世界.backgroundBattles??{}))cycle.reconcileEncounterBattle(state,battleId);rescue.advanceAt(state,at,logisticsHooks());
      advanceNpcRequests(state,at,options.absentIds??[]);advanceNpcPlans(state,at,options.absentIds??[]);cooperation.reconcile(state);preparations.reconcile(state);expeditionSchedule.advanceAt(state,at);advanceNpcCollaborations(state,at,options.absentIds??[]);advanceCityStages(state,at);observeNpcRequests(state,`observe:${at}`,options.absentIds??[]);globalThis.SoulCombatDeployments.reconcile(state);globalThis.SoulPerformanceAgreements.advanceAt(state);social.advanceAt(state,at);gifts.advanceAt(state);globalThis.SoulPersonContracts.advanceAt(state);market.advanceAt(state);sealing.advanceAt(state);auction.advanceAt(state);publicAuction.advanceAt(state);stock.advanceAt(state,stockHooks());globalThis.SoulCommerceAuctionSupply.advanceAt(state,{findFreightPath:findFreightPathInState});rescue.discover(state);
      if(!options.stopActorId||!people.isDead(state,options.stopActorId))interruption=actionInterruption(state,options.actionGuard);refreshTravelsAt(state,at,options);commerceMessages.advanceAt(state);globalThis.SoulPersonShame?.advanceAt?.(state,at);
      // All subsystems due at this timestamp, including messages and travel
      // rebasing, have completed. Resume at the next due scan with the original
      // window: final physiological settlement still covers before..actualEnd.
      options.calculationBoundary?.({before,total,interruption});
    }
    if(!stopped()){state.世界.时间=npcTime(total);globalThis.SoulPersonShame?.advanceAt?.(state,total);globalThis.SoulDeviceLocks.advanceAt(state,total);progressTravelsAt(state,total,options);logistics.advanceAt(state,total,logisticsHooks());social.advanceAt(state,total);gifts.advanceAt(state);market.advanceAt(state);sealing.advanceAt(state);auction.advanceAt(state);publicAuction.advanceAt(state);rescue.advanceAt(state,total,logisticsHooks());cooperation.reconcile(state);preparations.reconcile(state);logistics.advanceAt(state,total,logisticsHooks());interruption=actionInterruption(state,options.actionGuard);refreshTravelsAt(state,total,options);commerceMessages.advanceAt(state);}
    globalThis.SoulPerformanceAgreements.advanceAt(state);globalThis.SoulPersonContracts.advanceAt(state);creation.advanceAt(state);poison.syncResidents(state);stock.advanceAt(state,stockHooks());globalThis.SoulCommerceAuctionSupply.advanceAt(state,{findFreightPath:findFreightPathInState});people.settleAt(state);social.ingest(state);combat.pruneMaintenance(state,maintenanceReceipt);globalThis.SoulAbilityExchange.reconcile(state);refreshTravelsAt(state,people.now(state),options);state.场景.时间=storyCalendarDate(state).label;
    progressOpeningSituations(state);
    advanceIntimateAt(state,before,npcMinute(state.世界.时间),options.statusEvents);globalThis.SoulPersonShame?.advanceAt?.(state,people.now(state));
    return {minutes:npcMinute(state.世界.时间)-before,...(interruption?{interruption}:{})};
  }

  function advanceActionTime(state,actorId,minutes){
    people.assertAlive(state,actorId);
    if(!Number.isSafeInteger(minutes)||minutes<0)throw Error('行动耗时无效');
    const before=clone(state.世界.时间),duration=Math.min(minutes,people.facts(state,actorId).remainingMinutes);
    const elapsed=advanceTime(state,duration,{stopActorId:actorId}).minutes;
    const death=state.人物.列表[actorId].life.death;
    return {before,after:clone(state.世界.时间),minutes:elapsed,
      ...(death?{interruption:{kind:'life-exhausted',personId:actorId,deathId:death.id,at:death.at}}:{})};
  }

  function travelWallet(state,actorId=state.角色.主控单位ID) {
    const person = state.人物.列表[actorId];
    return person ? state.钱包.列表[person.walletId] : null;
  }

  // Read the actual agreement or ability source, never a second saved roster.
  function partyMembers(state,leaderId=state.角色.主控单位ID) {
    const voluntary=Object.values(state.人物?.列表??{}).flatMap(person=>(person.扩展?.社交约定??[])
      .filter(r=>r.kind==='party'&&r.status==='completed'&&r.playerId===leaderId)
      .map(r=>({personId:person.id,unitId:person.combatantId||person.id,name:person.name,combatant:!!state.战斗单位.列表[person.id],membershipId:r.id,membership:r.membership,dungeonId:r.dungeonId,locationId:person.locationId,present:actions.colocated(state,person.id,leaderId),basis:'voluntary',allowTravel:true,allowCombat:true})));
    return [...new Map([...globalThis.SoulPartyQuota.companions(state,leaderId).filter(p=>p.basis!=='resident-projection'),...voluntary,...cooperation.members(state,leaderId)].map(p=>[p.personId,p])).values()];
  }
  function partyRoster(state,leaderId=state.角色.主控单位ID){
    const formal=partyMembers(state,leaderId);
    const ordinary=occupiedCompanionIds(state,leaderId).map(personId=>formal.find(p=>p.personId===personId)??{personId,unitId:personId,name:state.人物.列表[personId]?.name,membership:'temporary',basis:'contract',present:actions.colocated(state,personId,leaderId)});
    return [...new Map([...ordinary,...globalThis.SoulPartyQuota.companions(state,leaderId).filter(p=>p.basis==='resident-projection')].map(p=>[p.personId,p])).values()];
  }
  function occupiedCompanionIds(state,leaderId=state.角色.主控单位ID) {
    return [...new Set([...partyMembers(state,leaderId).map(p=>p.personId),...globalThis.SoulPartyQuota.members(state,leaderId),...(state.远征?.companionContracts??[]).filter(c=>c.leaderId===leaderId).map(c=>c.unitId),
      ...expeditions.instances(state).filter(a=>a.leaderId===leaderId).flatMap(a=>a.companions.map(c=>c.unitId))])];
  }
  // Derive ownership from the original agreements and the retained expedition roster.
  // A fallen or departed participant keeps its expedition slot until that trip closes.
  function partyLeadersOf(state,personId) {
    const leaders=new Set(globalThis.SoulPartyQuota.leaders(state,personId));
    for(const p of Object.values(state.人物?.列表??{}))for(const r of p.扩展?.社交约定??[])if(p.id===personId&&r.kind==='party'&&r.status==='completed')leaders.add(r.playerId);
    for(const r of cooperation.table(state).agreements)if(r.memberId===personId&&!cooperation.invalidReason(state,r))leaders.add(r.leaderId);
    for(const c of state.远征?.companionContracts??[])if(c.unitId===personId)leaders.add(c.leaderId);
    for(const a of expeditions.instances(state))if(a.companions.some(c=>c.unitId===personId))leaders.add(a.leaderId);
    return [...leaders];
  }
  function partyOwnershipReason(state,leaderId,memberId) {
    if(partyLeadersOf(state,leaderId).length)return '领队仍是另一支队伍的成员，请先结束原队伍安排';
    if(partyLeadersOf(state,memberId).some(id=>id!==leaderId)||occupiedCompanionIds(state,memberId).length)return '人物已有其他实际队伍关系，请先结束原队伍安排';
    return '';
  }
  const ATTITUDE_EVENTS=Object.freeze({
    gift:{delta:2,name:'收下赠礼'},promise:{delta:2,name:'兑现承诺'},
    escort:{delta:5,name:'完成护送'},attack:{delta:-15,name:'遭到主动攻击'}
  });
  function recordPlayerAttitude(state,targetId,sourceId,kind){
    const person=state.人物.列表[targetId],playerId=state.角色.主控单位ID,event=ATTITUDE_EVENTS[kind];
    if(!event||!playerId||!person||targetId===playerId)return 0;
    const day=state.世界.时间.day,history=(person.扩展.善意往来??=[]);
    if(history.some(e=>e.sourceId===sourceId||['gift','promise'].includes(kind)&&e.playerId===playerId&&e.day===day&&e.kind===kind))return 0;
    const before=person.relationship?.player??0,after=Math.max(-100,Math.min(100,before+event.delta));
    (person.relationship??={}).player=after;
    history.push({day,playerId,sourceId,kind,before,after,name:event.name,turn:state.扩展?.story?.active?.number});
    return after-before;
  }
  function playerAttitudeReason(state,leaderId,personId){
    if(leaderId===state.角色.主控单位ID&&personId!==leaderId&&(state.人物.列表[personId]?.relationship?.player??0)<=-20)return '对方目前对你有敌意，不愿自愿同行或合作';
    return '';
  }
  function partyJoinAvailability(state,personId,membership,remote=false,leaderId=state.角色.主控单位ID) {
    const person=state.人物.列表[personId],unit=state.战斗单位.列表[personId];
    const existing=partyMembers(state,leaderId).find(p=>p.personId===personId),upgrade=existing?.membership==='temporary'&&membership==='long-term'&&!existing.cooperationId;
    const reason=existing?.cooperationId?'请先结束原合作，再提出新的自愿长期同行':partyOwnershipReason(state,leaderId,personId)||personalActionBlockReason(state,{actorId:leaderId})||(!person||personId===leaderId?'没有可邀请的人物':
      !actions.colocated(state,personId,leaderId)&&!remote?'这位人物不在当前地点':
      person.status==='dead'||unit&&(unit.存活状态!=='存活'||unit.资源.生命.当前<=0)?'这位人物目前无法同行':
      occupiedCompanionIds(state,leaderId).includes(personId)&&!upgrade&&!globalThis.SoulCombatDeployments?.bodyOuting(state,leaderId,personId)?'这位人物已占用队伍名额':
      occupiedCompanionIds(state,leaderId).length>=3&&!upgrade&&!occupiedCompanionIds(state,leaderId).includes(personId)?'队伍已满（玩家和三名同伴共四人，离场成员仍占一席）':
      (state.世界.npcPlans??[]).some(p=>p.ownerId===personId&&['scheduled','travelling','waiting'].includes(p.status))?'对方已有未结束的行程，请先处理原安排':playerAttitudeReason(state,leaderId,personId));
    return {available:!reason,reason};
  }
  function endPartyMembership(state,personId,membershipId,sourceId,endedBy,reason,leaderId=state.角色.主控单位ID) {
    const record=state.人物.列表[personId]?.扩展?.社交约定?.find(r=>r.id===membershipId&&r.kind==='party'&&r.status==='completed'&&r.playerId===leaderId);
    if(!record||![record.playerId,personId].includes(endedBy))throw new Error('没有匹配的当前同行约定');
    record.status='ended';record.events.push({status:'ended',sourceId,revision:state.系统.revision,time:clone(state.世界.时间),endedBy,reason});
    for(const pending of state.人物.列表[personId].扩展.社交约定)if(pending.kind==='party'&&pending.status==='pending'&&pending.playerId===record.playerId){
      pending.status='cancelled';pending.events.push({status:'cancelled',sourceId,revision:state.系统.revision,time:clone(state.世界.时间),reason:'原同行已结束，尚未回应的同行变更一并撤回'});
      const result=state.扩展?.story?.active?.results?.find(r=>r.receipt?.commitment?.id===pending.id);
      if(result){result.status='failed';result.reason='原同行已结束，同行变更已经撤回';result.receipt.commitment=clone(pending);result.receipt.response={accept:false,status:'cancelled',reason:result.reason};result.receipt.summary=result.reason;}
    }
    return clone(record);
  }
  function travelCompanionIds(state,leaderId=state.角色.主控单位ID,stayBehind=[]) {
    if(!Array.isArray(stayBehind)||stayBehind.some(id=>typeof id!=='string')||stayBehind.length>3)throw Error('请选择留在原地的队友');
    const contracts=(state.远征?.companionContracts??[]).filter(c=>c.leaderId===leaderId).map(contract=>{
      const person=state.人物.列表[contract.unitId],unit=state.战斗单位.列表[contract.unitId];
      if(!person||!unit||!actions.colocated(state,person.id,leaderId))throw new Error(`${contract.name}不在队伍所在地，请先调整同行约定`);
      if(person.status==='dead'||unit.存活状态!=='存活'||unit.资源.生命.当前<=0)throw new Error(`${person.name}目前无法同行，请先调整队伍`);
      if(actions.battleOf(state,person.id)||logistics.busyReason(state,person.id)||rescue.busyReason(state,person.id)||(state.世界.npcPlans??[]).some(p=>p.ownerId===person.id&&['scheduled','travelling','waiting'].includes(p.status)))throw Error(`${person.name}另有实际安排，不能同时随队移动`);
      return person.id;
    });
    const members=partyMembers(state,leaderId).filter(p=>p.present&&p.allowTravel!==false&&!(p.basis==='voluntary'&&stayBehind.includes(p.personId)));
    for(const member of members){
      const unit=state.战斗单位.列表[member.unitId],person=state.人物.列表[member.personId];
      if(person.status==='dead'||unit&&(unit.存活状态!=='存活'||unit.资源.生命.当前<=0))throw new Error(`${member.name}目前无法同行，请先调整队伍`);
      if(rescue.busyReason(state,person.id)||(state.世界.npcPlans??[]).some(p=>p.ownerId===person.id&&['scheduled','travelling','waiting'].includes(p.status)))throw new Error(`${member.name}已有独立行程，不能同时随队移动`);
    }
    const ids=[...new Set([...contracts,...members.map(p=>p.personId)])];
    for(const id of ids){
      const held=custody.confined(state,id);
      if(!held || cooperation.permits(state,leaderId,id,'travel'))continue;
      const accompaniesKeeper=held.custodianId===leaderId && (held.arrangement?.kind??held.arrangement)==='held-at-scene' && members.some(m=>m.personId===id && m.basis==='voluntary');
      if(!accompaniesKeeper)throw Error(state.人物.列表[id].name+'目前受看管，需要安排押送或留在原地。');
    }
    return ids;
  }

  function validateRequestInterruption(state,a,e){
    const r=(state.世界.npcRequests??[]).find(r=>r.id===e.sourceId),message=r?.events.find(m=>m.id===e.messageId);
    if(!r||!message||e.id!==`request:${r.id}`||!message.knownBy.includes(a.ownerId)||message.status!=='open'||e.personId!==r.ownerId||e.locationId!==message.locationId||e.receivedAt!==npcMinute(message.time)||e.at<e.receivedAt||e.at>=r.deadline||npcMinute(e.time)!==e.at||typeof e.reason!=='string'||!a.steps.some(s=>s.sourceId===e.decisionSourceId&&s.status==='interrupted'&&npcMinute(s.after)===e.at))throw Error('委托打断来源');
  }
  function advanceLongTime(state,action,target,maintenanceEvents){
    const before=npcMinute(state.世界.时间),actionGuard={actionId:action.id,personIds:[action.ownerId],requirement:['cultivation','evolution'].includes(action.kind)?'soul-power':'',requirements:['cultivation','evolution'].includes(action.kind)?['focus']:[]},initial=advanceTime(state,0,{stopActorId:action.ownerId,actionGuard,maintenanceEvents});
    if(initial.interruption)return {minutes:0,interruption:initial.interruption};
    let stop=waitInterruption(state,action,target),limit=stop?stop.at:target;
    while(npcMinute(state.世界.时间)<limit){
      const now=npcMinute(state.世界.时间),due=[...(state.世界.npcPlans??[]),...(state.世界.cityStages??[]),...(state.世界.npcCollaborations??[]),...(state.世界.npcRequests??[])].map(p=>p.nextAt).filter(at=>at!==null&&at>now&&at<limit);
      const expeditionAt=expeditionSchedule.nextAt(state,limit);if(expeditionAt!==null&&expeditionAt>now)due.push(expeditionAt);
      const restraintAt=custody.nextAt(state,limit);if(restraintAt!==null&&restraintAt>now)due.push(restraintAt);
      const deviceLockAt=globalThis.SoulDeviceLocks.nextAt(state,now,limit);if(Number.isFinite(deviceLockAt))due.push(deviceLockAt);
      const next=due.length?Math.min(...due):limit,advanced=advanceTime(state,next-now,{stopActorId:action.ownerId,actionGuard,maintenanceEvents});
      if(advanced.interruption){stop=advanced.interruption;break;}
      if(people.isDead(state,action.ownerId)){stop=waitInterruption(state,action,npcMinute(state.世界.时间));break;}
    }
    return {minutes:npcMinute(state.世界.时间)-before,interruption:stop};
  }
  function waitInterruption(state,action,target) {
    const now=npcMinute(state.世界.时间),playerId=action.ownerId;
    const expiresAt=people.facts(state,playerId).expiresAt;
    const deathStop=expiresAt<=target?{id:`lifespan:${playerId}:${expiresAt}`,kind:'life-exhausted',at:Math.max(now,expiresAt),sourceId:`death:${playerId}:lifespan`,personId:playerId,locationId:state.人物.列表[playerId].locationId,reason:'寿命已耗尽，本次行动终止'}:null;
    if(deathStop&&deathStop.at===now)return deathStop;
    const candidates=deathStop?[deathStop]:[];
    for(const person of Object.values(state.人物.列表))for(const record of person.扩展?.社交约定??[]) {
      if(record.kind!=='meeting'||record.playerId!==playerId||record.status!=='accepted'||record.endsAt<now)continue;
      const id=`meeting:${record.id}`,startsAt=npcMinute(record.startsAt);
      if(action.interruptions.some(e=>e.id===id))continue;
      // A reminder comes from the player's own agreement, not remote knowledge of the NPC.
      let at=startsAt,reason='已接受的约见时间到了，是否赴约由你决定';
      if(record.locationId!==state.人物.列表[playerId].locationId){
        try{const path=findPathInState(state,record.locationId,'balanced',undefined,playerId);at-=path.totalMinutes;reason='按已知路线，现在需要动身才能赶上已接受的约见';}catch{reason='已有约见到了约定时刻，但当前没有已知可用路线';}
      }
      at=Math.max(now,at);
      if(at<target)candidates.push({id,kind:'meeting',at,sourceId:record.id,personId:record.personId,locationId:record.locationId,startsAt:clone(record.startsAt),reason});
    }
    return candidates.sort((a,b)=>a.at-b.at||(a.kind==='life-exhausted'?-1:b.kind==='life-exhausted'?1:a.id.localeCompare(b.id)))[0]??null;
  }
  function validateLifeInterruption(state,action,event){
    const step=action.steps.find(step=>step.sourceId===event.decisionSourceId&&step.status==='interrupted'&&npcMinute(step.after)===event.at),death=state.人物.列表[event.personId]?.life?.death;
    if(!step||![action.ownerId,...(step.companionIds??[])].includes(event.personId)||!death||event.kind!==(death.cause==='寿命耗尽'?'life-exhausted':'person-death')||event.sourceId!==death.id||event.id!==`lifespan:${event.personId}:${death.at}`||event.at!==death.at||npcMinute(event.time)!==death.at)throw Error('寿命打断来源');
  }
  function longActionResumeReason(state,action){
    if(action.kind==='evolution'&&action.status==='interrupted')try{if(!globalThis.SoulEvolution.progressPreview(state,{planId:action.planId}).ready)return '请先到武魂进化面板补齐材料并核对当前结构';}catch(error){return error.message;}
    if(action.kind==='work')return workFacts(state,action).reason;
    if(action.kind==='cultivation')return cultivationFacts(state,action.ownerId)?.reason??'';
    const blocked=personalActionBlockReason(state,{actorId:action.ownerId});if(blocked)return blocked;
    if(action.kind==='travel')try{for(const id of [action.ownerId,...(action.solo?[]:travelCompanionIds(state,action.ownerId,action.stayBehind))]){const reason=controls.actionReason(state,id,'move');if(reason)return reason;}}catch(error){return error.message;}
    return '';
  }
  function longActionFacts(state,ownerId=state.角色.主控单位ID) {
    const records=(state.世界.longActions??[]).filter(a=>a.ownerId===ownerId),recent=records.slice(-8);
    return records.filter(a=>a.status==='interrupted'||recent.includes(a)).map(a=>({id:a.id,kind:a.kind,status:a.status,startedAt:a.startedAt,targetAt:npcTime(a.targetAt),progressedTo:a.progressedTo,
      minutesExecuted:a.minutesExecuted,remainingMinutes:a.kind==='wait'?Math.max(0,a.targetAt-npcMinute(state.世界.时间)):a.remainingMinutes,paidGold:a.paidGold,interruptions:clone(a.interruptions),
      ...(a.kind==='work'?{earnedGold:workEarnings(a.minutesExecuted,a.goldPerDay)}:{}),
      ...(a.kind==='cultivation'?{experienceGained:a.experienceGained,cultivationMeaning:'只计实际修炼时长；处理打断所花时间不抵扣剩余练习，不自动治疗、生成魂环或分配属性。'}:{}),
      ...(a.kind==='travel'?{position:actions.positionOf(state,a.ownerId),transit:clone(state.人物.列表[a.ownerId].transit??null),destinationId:a.destinationId,destinationName:LOCATION_TEMPLATES[a.destinationId].name,mode:a.mode,lastLocationId:a.currentLocationId,remainingGold:a.remainingGold,estimateFrom:a.currentLocationId}:{}),
      canResume:a.status==='interrupted'&&!longActionResumeReason(state,a),resumeReason:longActionResumeReason(state,a),meaning:a.kind==='evolution'?'保留已经完成的修习时间；当前阶段完成时统一结算材料与能力变化。':a.kind==='work'?'工钱按实际完成的工时结算。':a.kind==='cultivation'?'修炼只按实际练习时长获得经验，余时保留；处理打断时间不计修炼，魂环瓶颈仍有效，不自动治疗或取得魂环。':a.kind==='travel'?'约见可在出发前暂停旅行；途中失去移动能力时停在实际进度。续行先走完当前路段；到达落脚点后可改走其他路线。阅读不计时。':'等待只推进世界时间，不恢复体力或修炼升级。打断来自本人已接受的约定或当面收到的补给请求，不证明未获知的远方结果。阅读不计时；可继续原等待或放弃，继续后不重复提醒同一约见。'}));
  }
  function settleLongWait(state,action,transactionId) {
    const effectCursor=creation.eventCursor(state);
    const custodyOrder=custody.table(state).events.at(-1)?.order??-1,position=actions.positionOf(state,action.ownerId);
    const visibleFacilities=new Set((state.世界.custody?.facilities??[]).filter(f=>f.operatorIds.includes(action.ownerId)&&position.kind==='location'&&position.locationId===f.locationId&&!position.sceneId).map(f=>f.id));
    const maintenanceEvents=[],before=clone(state.世界.时间),now=npcMinute(before),advanced=advanceLongTime(state,action,Math.max(now,action.targetAt),maintenanceEvents),interruption=advanced.interruption,minutes=advanced.minutes,until=npcMinute(state.世界.时间);
    const abilitySettlements=maintenanceEvents.filter(e=>e.actorId===action.ownerId).map(e=>({eventId:e.id,sourceId:e.sourceId,actorId:e.actorId,skillId:e.skillId,skillName:state.技能.列表[e.skillId]?.name??e.skillId,at:e.at,event:e.event,reason:e.reason,...(e.failure?{failure:e.failure}:{}),...(e.payment?{totals:clone(e.payment.totals),items:e.payment.items.map(i=>({...clone(i),itemName:e.itemNames?.[i.itemId]??i.itemId}))}:{})}));
    const dutySettlements=custody.table(state).events.filter(e=>e.type==='logistics-duties'&&e.order>custodyOrder&&e.previousHash&&visibleFacilities.has(e.record.facilityId)&&e.record.status==='ended').map(e=>{
      const d=e.record,f=state.世界.custody.facilities.find(f=>f.id===d.facilityId),person=state.人物.列表[d.personId];
      return {eventId:e.id,dutyId:d.id,facilityId:f.id,facilityName:f.name,personId:person.id,personName:person.name,at:e.at,status:d.status,reason:e.reason};
    });
    action.minutesExecuted+=minutes;action.progressedTo=clone(state.世界.时间);action.remainingMinutes=Math.max(0,action.targetAt-until);
    action.status=interruption?'interrupted':'completed';
    if(interruption)action.interruptions.push({...interruption,time:npcTime(until),decisionSourceId:transactionId});
    action.steps.push({sourceId:transactionId,before,after:clone(state.世界.时间),minutes,status:action.status});
    return commit(state,transactionId,'等待时间',{type:'world-waited',...creation.eventsSince(state,effectCursor,action.ownerId),before,after:clone(state.世界.时间),minutes,longActionId:action.id,interrupted:!!interruption,
      remainingMinutes:action.remainingMinutes,...(abilitySettlements.length?{abilitySettlements}:{}),...(dutySettlements.length?{dutySettlements}:{}),...(interruption?{interruption:clone(interruption)}:{}),summary:interruption?`${interruption.reason}；时间已停下，原等待剩余${action.remainingMinutes}分钟，可处理后继续或放弃。`:`已等到${state.场景.时间}。`});
  }
  const WORK_GOLD_PER_DAY=720;
  const MAX_WORK_DAYS=31;
  const workEarnings=(minutes,goldPerDay=360)=>Math.floor(minutes*goldPerDay/1440);
  function workFacts(state,action) {
    const actorId=state.角色.主控单位ID,position=actorId?actions.positionOf(state,actorId):{};
    const location=LOCATION_TEMPLATES[position.locationId];
    const pending=(state.世界.longActions??[]).find(a=>a.kind==='work'&&a.status==='interrupted');
    const reason=worldActionBlockReason(state,{actorId})||
      (!actorId||state.远征?.当前?'请回到世界场景打工':
      position.kind!=='location'||position.sceneId||!location||!['城市','帝都','城镇','村庄','村落','驿路','驿站','港口'].some(v=>location.type===v||location.tags?.includes(v))?'到村庄、城镇或驿站可以接零工':
      action&&action.locationId!==location.id?'回到接工的地点才能继续':
      !action&&pending?'请先继续或放弃上一份零工':'');
    return {available:!reason,reason,pendingActionId:pending?.id??null,goldPerDay:WORK_GOLD_PER_DAY,maxDays:MAX_WORK_DAYS};
  }
  function settleWork(state,action,transactionId) {
    const facts=workFacts(state,action);
    if(!facts.available)throw Error(facts.reason);
    const before=clone(state.世界.时间),earned=workEarnings(action.minutesExecuted,action.goldPerDay);
    action.targetAt=npcMinute(before)+action.remainingMinutes;
    const {minutes,interruption}=advanceLongTime(state,action,action.targetAt,[]);
    action.minutesExecuted+=minutes;
    action.remainingMinutes=action.requestedMinutes-action.minutesExecuted;
    action.progressedTo=clone(state.世界.时间);
    action.status=interruption&&action.remainingMinutes?'interrupted':'completed';
    if(action.status==='interrupted')action.interruptions.push({...interruption,time:action.progressedTo,decisionSourceId:transactionId});
    action.steps.push({sourceId:transactionId,before,after:action.progressedTo,minutes,status:action.status});
    const gold=workEarnings(action.minutesExecuted,action.goldPerDay)-earned;
    travelWallet(state,action.ownerId).gold+=gold;
    return commit(state,transactionId,'打工',{type:'world-worked',before,after:action.progressedTo,minutes,gold,remainingMinutes:action.remainingMinutes,
      interrupted:action.status==='interrupted',...(action.status==='interrupted'?{interruption}:{}),
      longActionId:action.id,summary:action.status==='interrupted'?`${interruption.reason}，本次工钱 ${gold} 金魂币。`:`零工已完成，本次获得 ${gold} 金魂币。`});
  }
  function work(rawState,options={},transactionId='work') {
    const guard=transactionStart(rawState,transactionId,'打工');
    if(guard.duplicate)return {state:guard.state,receipt:guard.receipt,idempotent:true};
    const state=guard.state,facts=workFacts(state);
    if(!facts.available)throw Error(facts.reason);
    if(!Number.isSafeInteger(options.days)||options.days<1||options.days>MAX_WORK_DAYS)throw Error('打工须选择1至31整天');
    const ownerId=state.角色.主控单位ID,before=clone(state.世界.时间),minutes=options.days*1440;
    const action={id:`work:${transactionId}`,kind:'work',ownerId,sourceId:transactionId,branchId:state.扩展?.story?.branchId??'initial',
      locationId:state.人物.列表[ownerId].locationId,startedAt:before,targetAt:npcMinute(before)+minutes,progressedTo:before,
      requestedMinutes:minutes,remainingMinutes:minutes,minutesExecuted:0,paidGold:0,goldPerDay:WORK_GOLD_PER_DAY,status:'interrupted',interruptions:[],steps:[]};
    (state.世界.longActions??=[]).push(action);
    return settleWork(state,action,transactionId);
  }
  function waitUntil(rawState,options={},transactionId='wait-until') {
    const guard=transactionStart(rawState,transactionId,'等待时间');
    if(guard.duplicate)return {state:guard.state,receipt:guard.receipt,idempotent:true};
    const state=guard.state,block=worldActionBlockReason(state,{allowArrangements:true});
    if(block)throw new Error(block);
    if(!state.角色.主控单位ID||state.远征?.当前)throw new Error('请在世界场景中等待');
    if((state.世界.longActions??[]).some(a=>a.kind==='wait'&&a.status==='interrupted'))throw new Error('原等待尚有剩余安排，请先继续或放弃');
    const {day,hour,minute}=options;
    if(!Number.isSafeInteger(day)||day<1||!Number.isSafeInteger(hour)||hour<0||hour>23||!Number.isSafeInteger(minute)||minute<0||minute>59)throw new Error('等待的日期或时分无效');
    const target=day*1440+hour*60+minute,before=clone(state.世界.时间),minutes=target-npcMinute(before);
    if(!Number.isSafeInteger(target)||minutes<=0||minutes>31*1440)throw new Error('等待须向前推进，单次最多31日');
    const action={id:`wait:${transactionId}`,kind:'wait',ownerId:state.角色.主控单位ID,sourceId:transactionId,branchId:state.扩展?.story?.branchId??'initial',startedAt:before,targetAt:target,
      progressedTo:before,remainingMinutes:minutes,minutesExecuted:0,paidGold:0,status:'interrupted',interruptions:[],steps:[]};
    (state.世界.longActions??=[]).push(action);
    return settleLongWait(state,action,transactionId);
  }
  function resumeLongAction(rawState,options={},transactionId='resume-long-action',executionContext) {
    const evolving=(rawState.世界.longActions??[]).find(a=>a.id===options.actionId&&a.kind==='evolution'&&a.status==='interrupted');
    if(evolving)return globalThis.SoulEvolution.progress(rawState,{planId:evolving.planId},transactionId);
    const guard=transactionStart(rawState,transactionId,'继续等待');if(guard.duplicate)return {state:guard.state,receipt:guard.receipt,idempotent:true};
    const state=guard.state,actorId=executionContext?.executorId??clean(options.actorId,state.角色.主控单位ID),action=(state.世界.longActions??[]).find(a=>a.id===options.actionId&&a.ownerId===actorId&&a.status==='interrupted');
    const allowCaptivity=fieldControl.allowed(state,executionContext,actorId)||action?.kind==='cultivation'&&interiorTrainingAllowed(state,actorId),block=actorId===state.角色.主控单位ID?worldActionBlockReason(state,{allowCaptivity,allowArrangements:action?.kind==='wait'}):personalActionBlockReason(state,{actorId,allowCaptivity});if(block)throw new Error(block);
    if(actorId===state.角色.主控单位ID&&state.远征?.当前)throw new Error('请回到世界场景后继续原安排');
    if(executionContext&&action?.kind!=='travel')throw Error('控制命令只能继续所选人物的真实旅行');
    if(!action)throw new Error('没有这项待继续的安排');
    return action.kind==='work'?settleWork(state,action,transactionId):action.kind==='travel'?settleLongTravel(state,action,transactionId,executionContext):action.kind==='cultivation'?settleCultivation(state,action,transactionId):settleLongWait(state,action,transactionId);
  }
  function abandonLongAction(rawState,options={},transactionId='abandon-long-action') {
    const evolving=(rawState.世界.longActions??[]).find(a=>a.id===options.actionId&&a.kind==='evolution'&&a.status==='interrupted');
    if(evolving)return globalThis.SoulEvolution.cancel(rawState,{planId:evolving.planId},transactionId);
    const guard=transactionStart(rawState,transactionId,'放弃剩余等待');if(guard.duplicate)return {state:guard.state,receipt:guard.receipt,idempotent:true};
    const state=guard.state,action=(state.世界.longActions??[]).find(a=>a.id===options.actionId&&a.ownerId===clean(options.actorId,state.角色.主控单位ID)&&a.status==='interrupted');
    if(!action)throw new Error('没有这项待放弃的安排');
    action.status='cancelled';action.cancelledAt=clone(state.世界.时间);action.cancelledSourceId=transactionId;
    return commit(state,transactionId,'放弃剩余等待',{type:'long-action-abandoned',longActionId:action.id,kind:action.kind,ownerId:action.ownerId,cancelledAt:clone(action.cancelledAt),minutesExecuted:action.minutesExecuted,remainingMinutes:action.remainingMinutes,paidGold:action.paidGold,locationId:state.人物.列表[action.ownerId].locationId,position:actions.positionOf(state,action.ownerId),transit:clone(state.人物.列表[action.ownerId].transit??null),summary:'已放弃剩余安排；已用时间、已付费用、当前位置与发生事件保留，不取消人物或约定。'});
  }
  function validWorkDuration(action){
    if(action.goldPerDay===undefined)return [120,240,480].includes(action.requestedMinutes);
    return action.goldPerDay===WORK_GOLD_PER_DAY&&Number.isSafeInteger(action.requestedMinutes)&&
      action.requestedMinutes%1440===0&&action.requestedMinutes>=1440&&action.requestedMinutes<=MAX_WORK_DAYS*1440;
  }
  function validateLongActions(state,errors) {
    if(state.世界.longActions===undefined)return;
    try{
      if(!Array.isArray(state.世界.longActions))throw Error('记录');
      const seen=new Set(),pending=new Set();const now=npcMinute(state.世界.时间);
      for(const a of state.世界.longActions){
        if(a?.kind==='evolution'){globalThis.SoulEvolution.validateLongAction(state,a,seen);continue;}
        if(a?.kind==='cultivation'){validateCultivation(state,a,seen);continue;}
        if(a?.kind==='travel'){validateLongTravel(state,a,seen);continue;}
        if(!a||!['wait','work'].includes(a.kind)||a.ownerId!==state.角色.主控单位ID||a.id!==`${a.kind}:${a.sourceId}`||typeof a.sourceId!=='string'||!a.sourceId||typeof a.branchId!=='string'||!a.branchId||seen.has(a.id)||!['interrupted','completed','cancelled'].includes(a.status)||a.paidGold!==0)throw Error('来源');seen.add(a.id);
        const start=npcMinute(a.startedAt),progress=npcMinute(a.progressedTo);
        if(!Number.isSafeInteger(start)||!Number.isSafeInteger(a.targetAt)||a.targetAt<=start||(a.kind==='wait'?a.targetAt-start>31*1440:!validWorkDuration(a)||!LOCATION_TEMPLATES[a.locationId]||a.requestedMinutes!==a.remainingMinutes+a.minutesExecuted)||progress<start||progress>now||a.remainingMinutes!==Math.max(0,a.targetAt-progress)||!Array.isArray(a.steps)||!a.steps.length||!Array.isArray(a.interruptions))throw Error('时间');
        let last=start,minutes=0;const stepIds=new Set();
        for(const step of a.steps){const from=npcMinute(step.before),to=npcMinute(step.after);if(typeof step.sourceId!=='string'||stepIds.has(step.sourceId)||from<last||to<from||to>now||step.minutes!==to-from||!['interrupted','completed'].includes(step.status))throw Error('结算');stepIds.add(step.sourceId);minutes+=step.minutes;last=to;}
        if(last!==progress||minutes!==a.minutesExecuted||a.steps[0].sourceId!==a.sourceId||a.steps.at(-1).status!==(a.status==='cancelled'?'interrupted':a.status)||a.status==='completed'&&a.remainingMinutes!==0)throw Error('进度');
        const stops=new Set();for(const e of a.interruptions){if(['battle-started','foreground-battle'].includes(e.kind)){if(stops.has(e.id))throw Error('重复战斗打断');validateBattleInterruption(state,a,e);stops.add(e.id);continue;}if(['life-exhausted','person-death'].includes(e.kind)){if(stops.has(e.id))throw Error('重复寿命结算');validateLifeInterruption(state,a,e);stops.add(e.id);continue;}if(e.kind==='action-blocked'){if(stops.has(e.id))throw Error('重复限制打断');validateActionInterruption(state,a,e);stops.add(e.id);continue;}if(e.kind==='npc-request'){if(stops.has(e.id))throw Error('重复委托提醒');validateRequestInterruption(state,a,e);stops.add(e.id);continue;}const record=(state.人物.列表[e.personId]?.扩展?.社交约定??[]).find(r=>r.id===e.sourceId&&r.kind==='meeting'&&r.playerId===a.ownerId);if(!record||e.at>=a.targetAt||e.at>record.endsAt||!record.events.some(event=>event.status==='accepted'&&npcMinute(event.time)<=e.at)||e.id!==`meeting:${record.id}`||stops.has(e.id)||e.kind!=='meeting'||e.locationId!==record.locationId||npcMinute(e.startsAt)!==npcMinute(record.startsAt)||!a.steps.some(s=>s.sourceId===e.decisionSourceId&&s.status==='interrupted'&&npcMinute(s.after)===e.at)||npcMinute(e.time)!==e.at||typeof e.reason!=='string')throw Error('打断来源');stops.add(e.id);}
        if(a.steps.filter(s=>s.status==='interrupted').length!==stops.size)throw Error('打断记录');
        if(a.status==='interrupted'&&(a.remainingMinutes<0||a.remainingMinutes===0&&!a.interruptions.some(e=>['life-exhausted','person-death','action-blocked','battle-started','cooperation-ended'].includes(e.kind))||pending.has(a.kind)))throw Error('重复安排');
        if(a.status==='interrupted')pending.add(a.kind);
        if(a.status==='cancelled'&&(typeof a.cancelledSourceId!=='string'||npcMinute(a.cancelledAt)<progress||npcMinute(a.cancelledAt)>now))throw Error('放弃来源');
      }
    }catch(error){errors.push(`长行动${error.message}无效`);}
  }

  function interiorTrainingAllowed(state,personId){
    const row=globalThis.SoulInteriorSpaces?.membership(state,personId),custody=activeCaptivity(state,personId);
    return !!row&&row.space.collapsedAt===undefined&&row.member.limits.training&&row.member.limits.soulPower&&(!custody||custody.arrangement?.kind==='interior'&&custody.arrangement.spaceId===row.space.id);
  }
  function cultivationFacts(state,playerId=state.角色.主控单位ID) {
    const growth=state.成长.列表[playerId];if(!growth)return null;
    const practices=(state.世界.longActions??[]).filter(a=>a.kind==='cultivation'&&a.ownerId===playerId),pending=practices.find(a=>a.status==='interrupted');
    const totalMinutes=globalThis.SoulPractice.history(state,playerId).reduce((sum,e)=>sum+e.progress.minutes,0),capacity=cycle.cultivationCapacity(state,playerId),carryMinutes=globalThis.SoulPractice.carryAt(state,playerId);
    const unit=state.战斗单位.列表[playerId],person=state.人物.列表[playerId];
    const interior=globalThis.SoulInteriorSpaces?.membership(state,playerId);
    const block=globalThis.SoulConsciousness?.originalActionReason(state,playerId)||controls.actionReason(state,playerId,'requirements',{requirements:['soul-power','focus']})||(interior&&!interior.member.limits.training?'画境内尚未开放修炼许可':'')||(!unit||unit.存活状态!=='存活'||unit.资源.生命.当前<=0||person?.status==='dead'?'当前无法行动，不能修炼':'')||worldActionBlockReason(state,{actorId:playerId,allowCaptivity:interiorTrainingAllowed(state,playerId)})||(expeditions.forActor(state,playerId)?'请回到世界场景修炼':'')||globalThis.SoulPractice.exclusiveReason(state,playerId,pending?.id)||(capacity<=0?(growth.魂力等级>=99?'已达最高等级':'当前经验已满，请先按原规则取得并吸收所需魂环'):'');
    const training=globalThis.SoulCanonicalGrowth?.trainingGate(state,playerId);
    const minutesPerExperience=pending?cultivationRate(pending):newCultivationRate(state,playerId);
    return {available:!block,reason:block,training,minutesPerExperience,carryMinutes,totalMinutes,capacity,minutesToBoundary:Math.max(0,capacity*minutesPerExperience-carryMinutes%minutesPerExperience),pendingActionId:pending?.id??null,
      level:growth.魂力等级,experience:growth.当前经验,requirement:growth.当前等级需求,bottleneck:growth.瓶颈状态,
      meaning:'每累计'+minutesPerExperience+'分钟修炼获得1点经验，零碎时间可累计。达到魂环瓶颈或最高等级时暂停。'};
  }
  function newCultivationRate(state,actorId){
    return actorId===state.角色.主控单位ID?cycle.PLAYER_CULTIVATION_MINUTES_PER_EXPERIENCE:cycle.CULTIVATION_MINUTES_PER_EXPERIENCE;
  }
  const cultivationRate=action=>action.minutesPerExperience??cycle.CULTIVATION_MINUTES_PER_EXPERIENCE;
  function cultivate(rawState,options={},transactionId='cultivate') {
    const guard=transactionStart(rawState,transactionId,'修炼');if(guard.duplicate)return {state:guard.state,receipt:guard.receipt,idempotent:true};
    const state=guard.state,{days=0,hours=0,minutes=0}=options;
    if(![days,hours,minutes].every(v=>Number.isSafeInteger(v)&&v>=0)||days>31||hours>744||minutes>44640)throw new Error('修炼时长须是非负整数');
    const total=days*1440+hours*60+minutes;if(total<=0||total>31*1440)throw new Error('单次修炼须为1分钟至31日');
    const actorId=options.actorId??state.角色.主控单位ID,facts=cultivationFacts(state,actorId);if(!facts||!facts.available)throw new Error(facts?.reason||'请先创建角色');
    if(facts.pendingActionId)throw new Error('原修炼尚有剩余安排，请继续或放弃');
    const before=clone(state.世界.时间),action={id:`cultivation:${transactionId}`,kind:'cultivation',ownerId:actorId,sourceId:transactionId,...(options.growthRequestId?{growthRequestId:options.growthRequestId}:{}),branchId:state.扩展?.story?.branchId??'initial',startedAt:before,progressedTo:before,targetAt:npcMinute(before)+total,
      requestedMinutes:total,remainingMinutes:total,minutesExecuted:0,paidGold:0,...(actorId===state.角色.主控单位ID?{minutesPerExperience:newCultivationRate(state,actorId)}:{}),experienceGained:0,status:'interrupted',interruptions:[],steps:[]};
    (state.世界.longActions??=[]).push(action);return settleCultivation(state,action,transactionId);
  }
  function settleCultivation(state,action,transactionId) {
    const effectCursor=creation.eventCursor(state);
    const facts=cultivationFacts(state,action.ownerId);if(!facts?.available)throw new Error(facts?.reason||'无法修炼');
    const before=clone(state.世界.时间),now=npcMinute(before),target=now+action.remainingMinutes,boundary=now+facts.minutesToBoundary,rate=cultivationRate(action);
    // Earn each experience unit at its actual time. A lifespan tier reached
    // before expiry extends life; expiry at the same minute takes priority.
    const progress=cycle.applyCultivationMinutes(state,0,facts.carryMinutes,action.ownerId,rate);
    let interruption=null;
    while(npcMinute(state.世界.时间)<Math.min(target,boundary)){
      const segmentEnd=Math.min(target,boundary,npcMinute(state.世界.时间)+rate-progress.carryAfter%rate);
      const advanced=advanceLongTime(state,action,segmentEnd);
      interruption=advanced.interruption;
      const activeMinutes=Math.max(0,advanced.minutes-(['life-exhausted','person-death','action-blocked','battle-started'].includes(interruption?.kind)?1:0));
      const earned=cycle.applyCultivationMinutes(state,activeMinutes,progress.carryAfter,action.ownerId,rate);
      progress.minutes+=earned.minutes;progress.experienceGained+=earned.experienceGained;progress.levelsGained+=earned.levelsGained;progress.carryAfter=earned.carryAfter;progress.after=earned.after;
      if(interruption)break;
    }
    const minutes=npcMinute(state.世界.时间)-now;
    if(!interruption&&boundary<target)interruption={id:`growth:${transactionId}`,kind:'growth-boundary',at:boundary,sourceId:transactionId,reason:'本阶段经验已练满，先处理魂环瓶颈或最高等级；剩余修炼保留'};
    action.minutesExecuted+=minutes;action.remainingMinutes-=minutes;action.experienceGained+=progress.experienceGained;action.progressedTo=clone(state.世界.时间);action.targetAt=npcMinute(action.progressedTo)+action.remainingMinutes;action.status=interruption?'interrupted':'completed';
    if(interruption)action.interruptions.push({...interruption,time:clone(state.世界.时间),decisionSourceId:transactionId});
    action.steps.push({sourceId:transactionId,before,after:clone(state.世界.时间),locationId:state.人物.列表[action.ownerId].locationId,position:clone(actions.positionOf(state,action.ownerId)),minutes,status:action.status,progress});
    return commit(state,transactionId,'修炼',{type:'world-cultivated',...creation.eventsSince(state,effectCursor,action.ownerId),before,after:clone(state.世界.时间),minutes,longActionId:action.id,interrupted:!!interruption,remainingMinutes:action.remainingMinutes,progress,
      ...(interruption?{interruption:clone(interruption)}:{}),summary:`本次经过${minutes}分钟，其中有效修炼${progress.minutes}分钟，获得${progress.experienceGained}点经验${progress.levelsGained?`，提升${progress.levelsGained}级`:''}。${interruption?interruption.reason+'；剩余'+action.remainingMinutes+'分钟尚未执行。':'本次安排已完成。'}未自动治疗、取得魂环或分配属性点。`});
  }
  function validateCultivation(state,a,seen) {
    const now=npcMinute(state.世界.时间),start=npcMinute(a.startedAt),progress=npcMinute(a.progressedTo);
    if(a.id!==`cultivation:${a.sourceId}`||typeof a.sourceId!=='string'||!a.sourceId||seen.has(a.id)||!state.成长.列表[a.ownerId]||typeof a.branchId!=='string'||!a.branchId||a.paidGold!==0||!['interrupted','completed','cancelled'].includes(a.status))throw Error('修炼来源');if(a.ownerId!==state.角色.主控单位ID&&!globalThis.SoulPersonGrowth.cultivationSource(state,a))throw Error('NPC修炼须有本人接受的正式成长安排');seen.add(a.id);
    if(!Number.isSafeInteger(a.requestedMinutes)||a.requestedMinutes<=0||a.requestedMinutes>31*1440||!Number.isSafeInteger(a.remainingMinutes)||a.remainingMinutes<0||a.requestedMinutes!==a.minutesExecuted+a.remainingMinutes||a.targetAt!==progress+a.remainingMinutes||progress<start||progress>now||!Array.isArray(a.steps)||!a.steps.length||!Array.isArray(a.interruptions))throw Error('修炼时间');
    if(a.minutesPerExperience!==undefined&&(a.ownerId!==state.角色.主控单位ID||a.minutesPerExperience!==cycle.PLAYER_CULTIVATION_MINUTES_PER_EXPERIENCE))throw Error('修炼收益');
    let last=start,minutes=0,experience=0;const stepIds=new Set(),stops=new Set();
    let carry=globalThis.SoulPractice.carryAt(state,a.ownerId,start);
    for(const s of a.steps){const from=npcMinute(s.before),to=npcMinute(s.after),p=s.progress;
      if(typeof s.sourceId!=='string'||!s.sourceId||stepIds.has(s.sourceId)||from<last||to<from||to>now||s.minutes!==to-from||!(s.position?.kind==='transit'?s.locationId===''&&ROUTE_TEMPLATES[s.position.routeId]&&s.position.elapsedMinutes>=0&&s.position.elapsedMinutes<=ROUTE_TEMPLATES[s.position.routeId].minutes:LOCATION_TEMPLATES[s.locationId]&&s.position?.locationId===s.locationId)||!['interrupted','completed'].includes(s.status)||!p||p.unitId!==a.ownerId||p.minutes!==Math.max(0,s.minutes-(a.interruptions.some(e=>['life-exhausted','person-death','action-blocked','battle-started','cooperation-ended'].includes(e.kind)&&e.decisionSourceId===s.sourceId)?1:0))||p.carryBefore!==carry)throw Error('修炼结算');
      cycle.validateCultivationProgress(p,a.ownerId,cultivationRate(a));
      stepIds.add(s.sourceId);minutes+=s.minutes;experience+=p.experienceGained;carry=p.carryAfter;last=to;
    }
    if(last!==progress||minutes!==a.minutesExecuted||experience!==a.experienceGained||a.steps[0].sourceId!==a.sourceId||a.steps.at(-1).status!==(a.status==='cancelled'?'interrupted':a.status)||a.status==='completed'&&a.remainingMinutes!==0)throw Error('修炼进度');
    for(const e of a.interruptions){const s=a.steps.find(s=>s.sourceId===e.decisionSourceId&&s.status==='interrupted'&&npcMinute(s.after)===e.at);
      if(!s||stops.has(e.id)||npcMinute(e.time)!==e.at||typeof e.reason!=='string')throw Error('修炼打断');stops.add(e.id);
      if(['life-exhausted','person-death'].includes(e.kind)){validateLifeInterruption(state,a,e);}
      else if(e.kind==='action-blocked'){validateActionInterruption(state,a,e);}
      else if(e.kind==='battle-started'){validateBattleInterruption(state,a,e);}
      else if(e.kind==='npc-request'){validateRequestInterruption(state,a,e);}
      else if(e.kind==='growth-boundary'){const g=s.progress.after;if(e.id!==`growth:${s.sourceId}`||e.sourceId!==s.sourceId||!(g.level===99||g.level%10===0&&g.experience===g.requirement))throw Error('修炼瓶颈');}
      else{const r=(state.人物.列表[e.personId]?.扩展?.社交约定??[]).find(r=>r.id===e.sourceId&&r.kind==='meeting'&&r.playerId===a.ownerId);if(e.kind!=='meeting'||!r||e.id!==`meeting:${r.id}`||e.locationId!==r.locationId||npcMinute(e.startsAt)!==npcMinute(r.startsAt)||e.at>r.endsAt||!r.events.some(v=>v.status==='accepted'&&npcMinute(v.time)<=e.at))throw Error('修炼提醒来源');}
    }
    if(a.steps.filter(s=>s.status==='interrupted').length!==stops.size)throw Error('修炼打断数');
    if(a.status==='interrupted'){if(a.remainingMinutes<0||a.remainingMinutes===0&&!a.interruptions.some(e=>['life-exhausted','person-death','action-blocked','battle-started','cooperation-ended'].includes(e.kind))||seen.has('pending-cultivation:'+a.ownerId))throw Error('重复修炼');seen.add('pending-cultivation:'+a.ownerId);}
    if(a.status==='cancelled'&&(typeof a.cancelledSourceId!=='string'||!a.cancelledSourceId||npcMinute(a.cancelledAt)<progress||npcMinute(a.cancelledAt)>now))throw Error('修炼放弃');
  }

  function movePeopleTo(state,ids,locationId,spaceId=''){
    if(locationId===auction.VENUE&&!spaceId)ensureLocationCast(state,locationId);
    for(const id of ids){
      if(globalThis.SoulInteriorSpaces?.membership(state,id))throw Error('人物仍在独立空间内，须先通过其出入能力调遣');
      globalThis.SoulScenePosition.placePerson(state,id,{locationId,spaceId});
    }
    poison.syncResidents(state);
    if(ids.includes(state.角色.主控单位ID)){
      state.地图.当前地点ID=locationId;state.地图.已知地点ID列表=addUnique(state.地图.已知地点ID列表,locationId);state.地图.已发现地点ID列表=addUnique(state.地图.已发现地点ID列表,locationId);
      state.场景.地点=LOCATION_TEMPLATES[locationId]?.name??locationId;
    }
  }
  function movePartyTo(state,locationId,companionIds=[]){movePeopleTo(state,[state.角色.主控单位ID,...companionIds],locationId);}
  function remainingTravelPath(state,destinationId,mode,actorId=state.角色.主控单位ID){
    if((state.世界.npcPlans??[]).some(p=>p.ownerId===actorId&&p.status==='travelling'))throw Error(npcActionScheduleReason(state,actorId,1));
    const transit=state.人物.列表[actorId].transit;
    if(!transit)return findPathInState(state,destinationId,mode,undefined,actorId);
    const tail=findPathInState(state,destinationId,mode,transit.to,actorId),route={...clone(ROUTE_TEMPLATES[transit.routeId]),costGold:0};
    return {...tail,from:transit.from,locationIds:[transit.from,...tail.locationIds],routeIds:[route.id,...tail.routeIds],routes:[route,...tail.routes],totalMinutes:travelCore.duration(state,route.minutes*4-transit.progressUnits,[actorId])+tail.totalMinutes,totalCostGold:tail.totalCostGold,inTransit:clone(transit)};
  }
  function travelInterruption(state,action,route,legTo) {
    // Previously shown reminders remain acknowledged when the player explicitly takes another trip.
    const interruptions=[...action.interruptions,...(state.世界.longActions??[]).flatMap(a=>a.interruptions)];
    const now=npcMinute(state.世界.时间),projection={ownerId:action.ownerId,interruptions:[...interruptions]};
    for(const person of Object.values(state.人物.列表))for(const r of person.扩展?.社交约定??[])
      if(r.kind==='meeting'&&r.locationId===legTo&&now+route.minutes<=npcMinute(r.startsAt))projection.interruptions.push({id:`meeting:${r.id}`});
    const stop=waitInterruption(state,projection,now+route.minutes);
    if(stop?.kind==='life-exhausted')return null;
    return stop?{...stop,scheduledAt:stop.at,at:now,reason:'继续下一段路线将耽误已接受的约见；先在当前落脚点停下，可处理约定、继续原路线或放弃。'}:null;
  }
  function settleLongTravel(state,action,transactionId,executionContext) {
    const slices=globalThis.SoulCalculationSlices;
    if(!slices)return executeLongTravel(state,action,transactionId,executionContext);
    const started=globalThis.performance?.now?.()??Date.now();
    const completed=slices.run('travel-events',{state,action,transactionId,executionContext:executionContext?{orderId:executionContext.orderId,executorId:executionContext.executorId,intentHash:executionContext.intentHash,executionId:executionContext.executionId}:null},(resume,save)=>{
      if(resume){
        const index=resume.routeIndex,route=resume.path?.routes?.[index],leg=resume.currentLeg,clock=leg?.clock,now=npcMinute(resume.state?.世界?.时间??{});
        if(resume.version!==1||resume.action?.id!==action.id||!Number.isSafeInteger(index)||index<0||!route||leg?.run?.sourceId!==transactionId||leg.run.routeId!==route.id||!clock||!Number.isSafeInteger(clock.before)||!Number.isSafeInteger(clock.total)||clock.before!==leg.run.beganAt||clock.before>now||now>clock.total)throw Error('旅行计算断点无效');
      }
      return executeLongTravel(resume?.state??state,resume?.action??action,transactionId,executionContext,resume,frame=>{
        if((globalThis.performance?.now?.()??Date.now())-started>=1000)save(frame);
      });
    });
    foundation.commitStateDraft(state,completed.state);
    return {...completed,state};
  }
  function executeLongTravel(state,action,transactionId,executionContext,resume,onBoundary) {
    let frame=resume;
    if(!frame){
    const effectCursor=creation.eventCursor(state);
    const actualPosition=actions.positionOf(state,action.ownerId);if(actualPosition.kind==='location'&&actualPosition.sceneId)throw Error('须先离开当前房间回到公共通道，再安排旅行');
    if(state.战斗?.状态==='进行中'&&state.战斗.扩展?.clock?.mode==='foreground')throw Error('当前有待处理的前台战斗，不能快进旅行时间；请先处理该场战斗');
    const plannedPath=remainingTravelPath(state,action.destinationId,action.mode,action.ownerId);
    const allowCaptivity=fieldControl.allowed(state,executionContext,action.ownerId),front=action.ownerId===state.角色.主控单位ID;
    const block=worldActionBlockReason(state,{actorId:action.ownerId,allowCaptivity})||(!front?npcActionScheduleReason(state,action.ownerId,Math.max(1,plannedPath.totalMinutes)):'');if(block)throw new Error(block);
    const from=state.人物.列表[action.ownerId].transit?.from??state.人物.列表[action.ownerId].locationId,before=clone(state.世界.时间),companionIds=executionContext||action.solo?[]:travelCompanionIds(state,action.ownerId,action.stayBehind),ids=[action.ownerId,...companionIds],observed=ids.includes(state.角色.主控单位ID);
    const fieldOrderRef=executionContext?{orderId:executionContext.orderId,executionId:executionContext.executionId}:null;
    if(!front&&observed){const reason=worldActionBlockReason(state,{allowCaptivity:cooperation.permits(state,action.ownerId,state.角色.主控单位ID,'travel')});if(reason)throw Error(reason);}
    for(const id of ids){actions.resolve(state,{actorId:id,battleId:null,requirements:['movement']});if(controls.active(state,id).some(s=>['status.sleep','status.stun'].includes(s.模板ID)))throw Error('同行人员无法清醒移动');}
    const originalTransit=state.人物.列表[action.ownerId].transit;if(originalTransit&&companionIds.some(id=>abilities.hash(state.人物.列表[id].transit??null)!==abilities.hash(originalTransit)))throw Error('同行人员尚未完成实际道路集合，不能复制另一人的路段进度');
    const cooperationRefs=companionIds.flatMap(personId=>{const a=cooperation.agreement(state,action.ownerId,personId);return a?[{personId,cooperationId:a.id,authorityEventId:cooperation.table(state).events.filter(e=>e.agreementId===a.id).at(-1).id}]:[];});
    const path=plannedPath,wallet=travelWallet(state,action.ownerId);
    if(!wallet)throw new Error('无法读取行囊');
    frame={version:1,state,action,effectCursor,front,from,before,companionIds,ids,observed,fieldOrderRef,cooperationRefs,path,legs:[],interruption:null,routeIndex:0,currentLeg:null};
    }
    const {effectCursor,front,from,before,companionIds,ids,observed,fieldOrderRef,cooperationRefs,path,legs}=frame;
    const wallet=travelWallet(state,action.ownerId);let interruption=frame.interruption;
    for(let routeIndex=frame.routeIndex;routeIndex<path.routes.length;routeIndex++){
      const route=path.routes[routeIndex];
      let currentLeg=frame.currentLeg;
      if(!currentLeg){
      const prior=clone(state.人物.列表[action.ownerId].transit??null),legFrom=prior?.from??state.人物.列表[action.ownerId].locationId,legTo=prior?.to??(route.from===legFrom?route.to:route.from),startOffset=prior?.elapsedMinutes??0;
      const access=routeAccess(state,route,legTo,action.ownerId);if(!access.pass)throw new Error(`路线在结算时失效：${access.reasons.join('；')}`);
      if(!prior){interruption=travelInterruption(state,action,route,legTo);if(interruption)break;}
      const legStart=npcMinute(state.世界.时间),startedAt=prior?.startedAt??legStart,chargedGold=0,remaining=route.minutes-startOffset;
      state.钱包.列表['wallet-world-transit']??={id:'wallet-world-transit',ownerEntityId:'world-transit',gold:0,扩展:{type:'travel-sink'}};
      wallet.gold-=chargedGold;state.钱包.列表['wallet-world-transit'].gold+=chargedGold;
      const run={sourceId:transactionId,routeId:route.id,from:legFrom,to:legTo,totalMinutes:route.minutes,startOffset,endOffset:startOffset,startedAt,beganAt:legStart,progressedAt:legStart,endedAt:null,personIds:clone(ids),arrived:false};
      travelCore.initialize(state,run,action.id,route.mode==='sea'?[]:ids,route.mode==='sea'?ids:[]);if(observed)state.场景.地点=`${LOCATION_TEMPLATES[legFrom].name}至${LOCATION_TEMPLATES[legTo].name}途中`;
      currentLeg={prior,legFrom,legTo,startOffset,startedAt,chargedGold,run,clock:null};
      }
      const {prior,legFrom,legTo,startOffset,startedAt,chargedGold,run}=currentLeg;
      const advanced=advanceTime(state,Math.min(run.travel.totalUnits-run.travel.progressUnits,people.facts(state,action.ownerId).remainingMinutes),{absentIds:ids,stopActorId:action.ownerId,actionGuard:{actionId:action.id,personIds:ids,requirement:'movement',cooperationRefs,fieldOrderRef,stopForForegroundBattle:true},onAdvance:at=>travelCore.advanceAt(state,run,at),onSettled:at=>travelCore.rebaseAt(state,run,at),nextBoundaryAt:total=>travelCore.nextAt(run,total),stopWhen:()=>run.travel.progressUnits===run.travel.totalUnits,calculationResume:currentLeg.clock,calculationBoundary:onBoundary?clock=>onBoundary({...frame,state,action,routeIndex,currentLeg:{...currentLeg,clock},interruption}):undefined}),duration=advanced.minutes;
      interruption=people.isDead(state,action.ownerId)?waitInterruption(state,action,people.now(state)):advanced.interruption??null;
      const arrived=run.travel.progressUnits===run.travel.totalUnits&&!people.isDead(state,action.ownerId)&&!['life-exhausted','person-death','battle-started','foreground-battle','cooperation-ended','field-control-ended'].includes(interruption?.kind);
      run.arrived=arrived;run.endedAt=people.now(state);legs.push({...run,index:legs.length+1,routeId:route.id,from:legFrom,to:legTo,minutes:duration,costGold:chargedGold,danger:route.danger,mode:route.mode,startOffset,endOffset:run.endOffset,startedAt,...(prior?{resumes:{actionId:prior.actionId,sourceId:prior.stepSourceId}}:{}),arrived});
      if(arrived)movePeopleTo(state,ids,legTo);
      frame.currentLeg=null;
      if(interruption)break;
    }
    const transit=clone(state.人物.列表[action.ownerId].transit??null),endedByDeath=interruption?.kind==='life-exhausted',current=transit?'':state.人物.列表[action.ownerId].locationId;
    const castIds=endedByDeath||transit||!observed?[]:ensureLocationCast(state,current),minutes=legs.reduce((sum,leg)=>sum+leg.minutes,0),costGold=legs.reduce((sum,leg)=>sum+leg.costGold,0);
    if(observed&&!endedByDeath&&!transit){observeCityNotices(state,current,transactionId);observeNpcRequests(state,transactionId);}
    if(front)state.地图.扩展.路径模式=action.mode;if(observed&&interruption?.kind!=='battle-started')state.场景.状态=endedByDeath?'旅途终止':interruption?'旅途暂停':'抵达';
    action.minutesExecuted+=minutes;action.paidGold+=costGold;action.progressedTo=clone(state.世界.时间);action.currentLocationId=current;
    action.remainingMinutes=interruption?remainingTravelPath(state,action.destinationId,action.mode,action.ownerId).totalMinutes:0;action.remainingGold=path.totalCostGold-costGold;action.targetAt=npcMinute(state.世界.时间)+action.remainingMinutes;action.status=interruption?'interrupted':'completed';
    if(interruption)action.interruptions.push({...interruption,time:clone(state.世界.时间),decisionSourceId:transactionId});
    if(front&&action.status==='completed'&&legs.some(leg=>leg.mode!=='local')){
      for(const ref of cooperationRefs){
        const agreement=cooperation.agreement(state,action.ownerId,ref.personId);
        if(agreement?.basis==='voluntary'&&agreement.membership==='temporary'&&agreement.allowTravel&&agreement.allowCombat){
          recordPlayerAttitude(state,ref.personId,`${agreement.id}:escort-completed`,'escort');
        }
      }
    }
    action.steps.push({sourceId:transactionId,before,after:clone(state.世界.时间),from,to:current,plannedDestinationId:action.destinationId,minutes,costGold,legs:clone(legs),status:action.status,companionIds:clone(companionIds),cooperationRefs:clone(cooperationRefs),fieldOrderRef,remainingMinutes:action.remainingMinutes,remainingGold:action.remainingGold});
    const persisted=(state.世界.longActions??[]).some(a=>a.id===action.id);
    if(!persisted)(state.世界.longActions??=[]).push(action);
    for(const personId of companionIds)if(legs.length&&!endedByDeath&&!transit){const person=state.人物.列表[personId];person.扩展??={};person.扩展.共同见闻??=[];
      person.扩展.共同见闻.push({id:`travel:${transactionId}`,kind:'travel',playerId:action.ownerId,participants:ids,from:{id:from,name:LOCATION_TEMPLATES[from].name},to:{id:current,name:LOCATION_TEMPLATES[current].name},minutes,time:clone(state.世界.时间),revision:state.系统.revision});}
    const position=transit?`${LOCATION_TEMPLATES[transit.from].name}至${LOCATION_TEMPLATES[transit.to].name}途中（路段进度 ${transit.progressUnits}/${transit.totalUnits}）`:LOCATION_TEMPLATES[current].name;
    return commit(state,transactionId,'移动地点',{type:'travel-completed',...creation.eventsSince(state,effectCursor,action.ownerId),actorId:action.ownerId,from,to:current,current,position:actions.positionOf(state,action.ownerId),transit,destinationId:action.destinationId,mode:action.mode,completed:!interruption,path:clone(path),legs,minutes,costGold,castIds,companionIds,before,after:clone(state.世界.时间),interrupted:!!interruption,
      ...(persisted||interruption||path.inTransit||!front||fieldOrderRef?{longActionId:action.id,remainingMinutes:action.remainingMinutes,remainingGold:action.remainingGold}:{}),...(interruption?{interruption:clone(interruption)}:{}),
      summary:interruption?`当前在${position}，本次经过${minutes}分钟；${interruption.reason}。尚余${action.remainingMinutes}分钟。`:`抵达${position}，本次用时${minutes}分钟。`});
  }
  function travel(rawState,options,transactionId,executionContext,committed=false) {
    const journal=globalThis.SoulCalculationSlices;
    // The engine has already normalized its committed world. An imported input or a
    // resumed journal uses the original normalizer, including its scope hash layout.
    const copyOnly=committed&&(!journal||journal.isNewDirectTravel);
    const guard=transactionStart(rawState,transactionId,'移动地点',copyOnly?structuredClone:normalizeState);if(guard.duplicate)return {state:guard.state,receipt:guard.receipt,idempotent:true};
    const state=guard.state;if(!state.角色.已建立)throw new Error('请先创建角色');
    const actorId=clean(options?.actorId,state.角色.主控单位ID),person=state.人物.列表[actorId];if(!person)throw Error('实际旅行者不存在');
    const destinationId=clean(options?.destinationId),mode=PATH_MODES[options?.mode]?options.mode:actorId===state.角色.主控单位ID?state.地图.扩展.路径模式:'balanced';
    if(!person.transit&&destinationId===person.locationId)throw new Error('角色已经位于目标地点');
    if((state.世界.longActions??[]).some(a=>a.kind==='travel'&&a.ownerId===actorId&&a.destinationId===destinationId&&a.status==='interrupted'))throw new Error('已有前往该地点的剩余行程，请继续或放弃原安排');
    const before=clone(state.世界.时间),action={id:`travel:${transactionId}`,kind:'travel',ownerId:actorId,solo:!!executionContext,...(options.stayBehind?.length?{stayBehind:clone(options.stayBehind)}:{}),sourceId:transactionId,branchId:state.扩展?.story?.branchId??'initial',startedAt:before,progressedTo:before,destinationId,mode,currentLocationId:person.locationId,minutesExecuted:0,paidGold:0,remainingMinutes:0,remainingGold:0,targetAt:npcMinute(before),status:'interrupted',interruptions:[],steps:[]};
    const slices=globalThis.SoulCalculationSlices;
    if(!executionContext&&slices?.isNewDirectTravel){
      // This trip is the command's terminal scope. Its unmodified caller state can reproduce
      // the original scope input if the clock actually needs a durable continuation.
      const initialAction=structuredClone(action),deadline=performance.now()+1000;
      return executeLongTravel(state,action,transactionId,executionContext,null,frame=>{
        if(performance.now()<deadline)return;
        const input={state:normalizeState(rawState),action:initialAction,transactionId,executionContext:null};
        slices.run('travel-events',input,(_resume,save)=>save(frame));
      });
    }
    return settleLongTravel(state,action,transactionId,executionContext);
  }
  function validateLongTravel(state,a,seen) {
    const now=npcMinute(state.世界.时间);
    if(a.id!==`travel:${a.sourceId}`||!a.sourceId||seen.has(a.id)||!state.人物.列表[a.ownerId]||typeof a.branchId!=='string'||!LOCATION_TEMPLATES[a.destinationId]||!PATH_MODES[a.mode]||!['interrupted','completed','cancelled'].includes(a.status)||!Array.isArray(a.steps)||!a.steps.length||!Array.isArray(a.interruptions))throw Error('旅行来源');seen.add(a.id);
    if(a.status==='interrupted'){const targetKey=`travel-destination:${a.ownerId}:${a.destinationId}`;if(seen.has(targetKey))throw Error('重复旅行安排');seen.add(targetKey);}
    let time=npcMinute(a.startedAt),minutes=0,gold=0;const stepIds=new Set();
    for(const step of a.steps){
      let location=step.from,elapsed=0,paid=0;
      if(!Array.isArray(step.companionIds)||new Set([a.ownerId,...step.companionIds]).size!==step.companionIds.length+1||[a.ownerId,...step.companionIds].some(id=>!state.人物.列表[id]||state.人物.列表[id].life?.death?.at<=npcMinute(step.before)))throw Error('旅行参与者无效或出发前已经死亡');
      if(step.fieldOrderRef){const order=fieldControl.table(state).orders.find(r=>r.id===step.fieldOrderRef.orderId);if(!order||order.executorId!==a.ownerId||order.domain!=='移动'||order.executionId!==step.sourceId||step.fieldOrderRef.executionId!==step.sourceId||step.companionIds.length)throw Error('控制旅行来源');}
      const refs=step.cooperationRefs??[];if(!Array.isArray(refs)||new Set(refs.map(r=>r.personId)).size!==refs.length)throw Error('重复合作旅行来源');
      for(const ref of refs){const event=cooperation.table(state).events.find(e=>e.id===ref.authorityEventId),r=event?.record;if(!event||event.agreementId!==ref.cooperationId||r.memberId!==ref.personId||r.leaderId!==a.ownerId||!step.companionIds.includes(ref.personId)||r.status!=='active'||!r.allowTravel||event.at>npcMinute(step.before)||r.expiresAt!==null&&r.expiresAt<=npcMinute(step.before))throw Error('合作旅行授权来源');}
      if(!LOCATION_TEMPLATES[location]||stepIds.has(step.sourceId)||typeof step.sourceId!=='string'||npcMinute(step.before)<time||!Array.isArray(step.legs)||step.plannedDestinationId!==a.destinationId||!['interrupted','completed'].includes(step.status)||!Number.isSafeInteger(step.remainingMinutes)||step.remainingMinutes<0||!Number.isSafeInteger(step.remainingGold)||step.remainingGold<0)throw Error('旅行结算');stepIds.add(step.sourceId);
      for(const [index,leg] of step.legs.entries()){
        travelCore.validate(state,leg,ROUTE_TEMPLATES[leg.routeId]?.mode==='sea'?[]:[a.ownerId,...step.companionIds],ROUTE_TEMPLATES[leg.routeId]?.mode==='sea'?[a.ownerId,...step.companionIds]:[]);if(leg.travel.actionId!==a.id||leg.minutes!==leg.progressedAt-leg.beganAt)throw Error('旅行共享路程来源');
        const route=ROUTE_TEMPLATES[leg.routeId],partial=leg.arrived===false;
        if(!route||leg.index!==index+1||leg.from!==location||leg.to!==(route.from===location?route.to:route.from)||![route.from,route.to].includes(location)||!Number.isSafeInteger(leg.minutes)||leg.minutes<0||!Number.isSafeInteger(leg.startOffset*4)||leg.startOffset<0||leg.endOffset>route.minutes||!partial&&leg.endOffset!==route.minutes||![0,leg.resumes?0:route.costGold].includes(leg.costGold)||!Number.isSafeInteger(leg.startedAt)||leg.startedAt>npcMinute(step.before)+elapsed)throw Error('旅行路段');
        if(leg.resumes){
          const original=state.世界.longActions.find(r=>r.id===leg.resumes.actionId),prior=original?.steps.find(r=>r.sourceId===leg.resumes.sourceId),escortSource=transitSource(state,{actionId:leg.resumes.actionId,stepSourceId:leg.resumes.sourceId},a.ownerId),old=escortSource??prior?.legs?.at(-1),priorIds=escortSource?.personIds??(original?[original.ownerId,...prior.companionIds]:[]),priorAt=escortSource?.after??npcMinute(prior?.after??{}),keys=[a.ownerId,...step.companionIds].map(id=>`resumed:${leg.resumes.actionId}:${leg.resumes.sourceId}:${id}`);
          if(!old||old.arrived!==false||prior===step||![a.ownerId,...step.companionIds].every(id=>priorIds.includes(id))||priorAt>npcMinute(step.before)||old.routeId!==leg.routeId||old.from!==leg.from||old.to!==leg.to||old.endOffset!==leg.startOffset||old.startedAt!==leg.startedAt||keys.some(key=>seen.has(key)))throw Error('续行凭据或已付路费');keys.forEach(key=>seen.add(key));
        }else if(leg.startOffset!==0||leg.startedAt!==npcMinute(step.before)+elapsed)throw Error('出发进度');
        if(partial&&(!a.interruptions.some(e=>['life-exhausted','person-death','action-blocked','battle-started','foreground-battle','cooperation-ended','field-control-ended'].includes(e.kind)&&e.decisionSourceId===step.sourceId)||index!==step.legs.length-1))throw Error('途中终止缺少真实中断');
        location=partial?'':leg.to;elapsed+=leg.minutes;paid+=leg.costGold;
      }
      if(location!==step.to||step.minutes!==elapsed||step.costGold!==paid||npcMinute(step.after)!==npcMinute(step.before)+elapsed||npcMinute(step.after)>now||step.status==='completed'&&(location!==a.destinationId||step.remainingMinutes!==0||step.remainingGold!==0))throw Error('旅行费用');
      time=npcMinute(step.after);minutes+=elapsed;gold+=paid;
    }
    const last=a.steps.at(-1);if(a.steps[0].sourceId!==a.sourceId||minutes!==a.minutesExecuted||gold!==a.paidGold||a.currentLocationId!==last.to||a.remainingMinutes!==last.remainingMinutes||a.remainingGold!==last.remainingGold||npcMinute(a.progressedTo)!==time||a.targetAt!==time+a.remainingMinutes||last.status!==(a.status==='cancelled'?'interrupted':a.status))throw Error('旅行进度');
    const stops=new Set();for(const e of a.interruptions){if(e.kind==='field-control-ended'){if(stops.has(e.id))throw Error('重复控制中断');fieldControl.validateTravelInterruption(state,a,e);stops.add(e.id);continue;}if(e.kind==='cooperation-ended'){if(stops.has(e.id))throw Error('重复同行中断');validateCooperationInterruption(state,a,e);stops.add(e.id);continue;}if(['battle-started','foreground-battle'].includes(e.kind)){if(stops.has(e.id))throw Error('重复战斗打断');validateBattleInterruption(state,a,e);stops.add(e.id);continue;}if(['life-exhausted','person-death'].includes(e.kind)){if(stops.has(e.id))throw Error('重复寿命结算');validateLifeInterruption(state,a,e);stops.add(e.id);continue;}if(e.kind==='action-blocked'){if(stops.has(e.id))throw Error('重复限制打断');validateActionInterruption(state,a,e);stops.add(e.id);continue;}if(e.kind==='npc-request'){if(stops.has(e.id))throw Error('重复委托提醒');validateRequestInterruption(state,a,e);stops.add(e.id);continue;}const record=(state.人物.列表[e.personId]?.扩展?.社交约定??[]).find(r=>r.id===e.sourceId&&r.kind==='meeting'&&r.playerId===a.ownerId);if(!record||e.kind!=='meeting'||e.id!==`meeting:${record.id}`||stops.has(e.id)||!record.events.some(event=>event.status==='accepted'&&npcMinute(event.time)<=e.at)||e.at>record.endsAt||e.scheduledAt<e.at||e.scheduledAt>record.endsAt||e.locationId!==record.locationId||npcMinute(e.startsAt)!==npcMinute(record.startsAt)||!a.steps.some(step=>step.sourceId===e.decisionSourceId&&step.status==='interrupted'&&npcMinute(step.after)===e.at)||npcMinute(e.time)!==e.at)throw Error('旅行打断来源');stops.add(e.id);}
    if(a.steps.filter(step=>step.status==='interrupted').length!==stops.size||a.status==='interrupted'&&a.remainingMinutes<=0&&!a.interruptions.some(e=>['life-exhausted','person-death','action-blocked','battle-started','foreground-battle','cooperation-ended','field-control-ended'].includes(e.kind)))throw Error('旅行打断记录');
    if(a.status==='cancelled'&&(typeof a.cancelledSourceId!=='string'||npcMinute(a.cancelledAt)<time||npcMinute(a.cancelledAt)>now))throw Error('旅行放弃');
  }

  function currentItemValue(item) {
    const base=integer(item?.valuePoints??calculateItemValue(item),0),condition=item?.condition==='受损'?.65:item?.condition==='破损'?.35:1,maximum=integer(item?.扩展?.maxDurability??100,1),durability=['魂导器','暗器'].includes(item?.type)?clamp(item.durability/maximum,.25,1):1;
    return Math.max(0,Math.floor(base*condition*durability));
  }
  function quotePrice(state,shopId,itemId,direction,quantityInput=1,options={}) {
    const shop=state.商店.列表[shopId],item=state.物品.实例[itemId];
    if(!shop||!item||shop.status!=='open')throw Error('商店或物品不可用');
    if(ITEM_TEMPLATES[item.templateId]?.unpriced)throw Error('这件物品尚无鉴定价格，不能按叙述兑换钱币');
    const quantity=integer(quantityInput,1,item.quantity),location=LOCATION_TEMPLATES[shop.locationId],scarcity=shop.扩展?.regional?1:location?.danger>=50?1.18:location?.danger>=20?1.08:1,multiplier=direction==='buy'?shop.buyMultiplier:shop.sellMultiplier,amount=currentItemValue(item)*scarcity*multiplier,unitPrice=direction==='sell'?Math.floor(amount):Math.max(1,integer(amount,1));
    if(options.baseOnly)return {shopId,itemId,direction,quantity,unitPrice,totalGold:unitPrice*quantity,currencyText:formatCurrency(unitPrice*quantity)};
    const actorId=options.actorId??state.角色.主控单位ID,accountId=assets.account(state,actorId,options.accountId).id,quote=assets.finalQuote(state,{actorId,accountId,shopId,itemId,templateId:item.templateId,direction,quantity,unitPrice,stock:item.quantity,payload:{payload:item.payload,durability:item.durability,condition:item.condition}}, {itemId,templateId:item.templateId});return {...quote,unitPrice:quote.segments[0].unitPrice,currencyText:formatCurrency(quote.totalGold)};
  }

  function formatCurrency(goldInput) {
    return `${integer(goldInput, 0)}金币`;
  }

  function assertTransferableGiftOrTrade(state,item) {
    const reason=assets.itemReason(state,item,item?.ownerEntityId);if(reason)throw Error(reason);
    if (Object.values(state.装备.配置).some(config => [...Object.values(config.slots ?? {}),...Object.values(config.soulBoneSlots ?? {})].includes(item.id))) throw new Error('请先卸下装备再转交');
  }
  function previewGift(state,options,executionContext) {
    const player=sceneActionActor(state,options?.actorId,true,executionContext,options),recipient=state.人物.列表[options?.personId],item=state.物品.实例[options?.itemId];
    const interiorAccess=player&&recipient&&!options.promise&&!actions.colocated(state,player.id,recipient.id)&&globalThis.SoulResidentRealms?.equipmentSource(state,player.id,recipient.id);
    if(!player||!recipient||player.id===recipient.id||!options.promise&&!interiorAccess&&!actions.colocated(state,player.id,recipient.id))throw new Error('赠送双方不在当前地点');
    if(!options.promise){actions.resolve(state,{actorId:player.id,battleId:null,targetIds:interiorAccess?[]:[recipient.id],requirements:['gesture']});people.assertAlive(state,recipient.id);}
    if(!item||item.ownerEntityId!==player.id||item.containerId!==player.inventoryContainerId||!state.容器.列表[player.inventoryContainerId]?.itemIds.includes(item.id))throw new Error('物品不在赠送者当前行囊中');
    assertTransferableGiftOrTrade(state,item);
    if(item.templateId==='story-keepsake'&&![player.id,recipient.id].includes(item.legalOwnerEntityId))throw new Error('纪念物的所有权未确定为赠送人或接收人，不能把持有直接当作有权转交');
    if(!Number.isSafeInteger(options.quantity)||options.quantity<1||options.quantity>item.quantity)throw new Error('赠送数量超过当前可用数量');
    const destinationId=recipient.inventoryContainerId,placement=previewItemPlacement(state,destinationId,{templateId:item.templateId,transferItemId:item.id});
    if(!placement.pass)throw new Error(placement.message);
    return {itemId:item.id,itemName:item.name,templateId:item.templateId,quantity:options.quantity,personId:recipient.id,destinationId};
  }
  function previewTrade(state, options, direction) {
    const block = worldActionBlockReason(state,{actorId:options?.actorId??state.角色.主控单位ID});
    if (block) throw new Error(block);
    const playerId = options?.actorId??state.角色.主控单位ID;
    const person = state.人物.列表[playerId];
    const shop = state.商店.列表[clean(options?.shopId)];
    const position=person&&actions.positionOf(state,playerId),merchant=state.人物.列表[shop?.merchantId],merchantPosition=merchant&&actions.positionOf(state,merchant.id);
    if(position?.kind!=='location'||position.sceneId||!merchant||merchantPosition.kind!=='location'||merchantPosition.sceneId||merchant.locationId!==shop.locationId||personalActionBlockReason(state,{actorId:merchant.id}))throw Error('买卖双方须实际在商店公共场所且能够交易');
    if (!person || !shop || person.locationId !== shop.locationId || playerId===state.角色.主控单位ID&&state.地图.当前地点ID !== shop.locationId) throw new Error('购买者不在商店所在地点');
    if (shop.infinite) throw new Error('请使用补给铺的购买与回收服务');
    const item = state.物品.实例[clean(options?.itemId)];
    const sourceId = direction === 'buy' ? shop.stockContainerId : person.inventoryContainerId;
    if (!item || item.containerId !== sourceId || !state.容器.列表[sourceId]?.itemIds.includes(item.id)) throw new Error('物品不在当前交易行囊中');
    assertTransferableGiftOrTrade(state,item);
    if (sealing.byItem(state,item.id)) throw new Error('内有生命的封神台须以完整组合拍品登记，普通商店不能只按器物买卖');
    if(direction==='sell'&&shop.扩展?.scope&&!shop.扩展.scope.includes(item.type))throw Error('该门店经营范围或能力不回收此类物品');
    const quantity = options?.quantity ?? 1;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > item.quantity) throw new Error('交易数量超过当前可用数量');
    const destinationId = direction === 'buy' ? person.inventoryContainerId : shop.stockContainerId;
    const placement = previewItemPlacement(state,destinationId,{templateId:item.templateId,transferItemId:item.id});
    if (!placement.pass) throw new Error(placement.message);
    const quote = quotePrice(state,shop.id,item.id,direction,quantity,{actorId:playerId,accountId:options.accountId});
    assets.maximumGold({...options,direction},quote.totalGold);
    const payerId = direction === 'buy' ? assets.account(state,playerId,options.accountId).id : shop.businessWalletId??state.人物.列表[shop.merchantId]?.walletId;
    if ((state.钱包.列表[payerId]?.gold ?? 0) < quote.totalGold) throw new Error(direction === 'buy' ? '钱币不足' : '商店暂时没有足够钱币回收这些物品');
    return {...quote,placement};
  }

  function executeTrade(state, options, transactionId, direction, recordLedger = true) {
    const block = worldActionBlockReason(state,{actorId:options.actorId??state.角色.主控单位ID});
    if (block) throw new Error(block);
    const playerId = options.actorId??state.角色.主控单位ID;
    const person = state.人物.列表[playerId];
    const shop = state.商店.列表[clean(options?.shopId)];
    if (!person || !shop || person.locationId !== shop.locationId) throw new Error('玩家不在商店所在地点');
    const quote = previewTrade(state,options,direction);
    if(options.quoteVersion&&options.quoteVersion!==quote.quoteVersion)throw Error('物品报价已变化，请重新查看');
    const playerWallet = assets.account(state,playerId,options.accountId);
    const merchant = state.人物.列表[shop.merchantId];
    const merchantWallet = state.钱包.列表[shop.businessWalletId??merchant.walletId];
    const item = state.物品.实例[quote.itemId];
    const sourceContainerId = direction === 'buy' ? shop.stockContainerId : person.inventoryContainerId;
    const destinationContainerId = direction === 'buy' ? person.inventoryContainerId : shop.stockContainerId;
    if (item.containerId !== sourceContainerId) throw new Error('物品不在正确的交易容器');
    const payer = direction === 'buy' ? playerWallet : merchantWallet;
    const receiver = direction === 'buy' ? merchantWallet : playerWallet;
    if (payer.gold < quote.totalGold) throw new Error('钱币不足');
    const actual=assets.executeItemTrade(state,options,transactionId,direction),{payment,movement,transferred}=actual,walletBefore=actual.wallets,businessBefore=actual.businessBefore;
    if(direction==='sell')transferred.扩展.buyback={sourceId:transactionId,sellerId:playerId,quantity:quote.quantity,totalGold:quote.totalGold};else delete transferred.扩展.buyback;
    const ledger = {id: transactionId, day: state.世界.时间.day, shopId: shop.id, buyerId: direction === 'buy' ? playerId : shop.merchantId, sellerId: direction === 'buy' ? shop.merchantId : playerId, itemId: transferred.id, name: transferred.name, templateId: transferred.templateId, quantity: quote.quantity, totalGold: quote.totalGold};
    if(recordLedger){state.交易流水.列表.push(ledger);state.交易流水.列表 = state.交易流水.列表.slice(-100);}
    if(shop.扩展?.regional)stock.payment(state,shop,transactionId,{cashBefore:businessBefore,cashAfter:merchantWallet.gold,cashDelta:direction==='buy'?quote.totalGold:-quote.totalGold,actorId:playerId,sourceItemId:options.itemId,transferredItemId:transferred.id,quantity:quote.quantity,totalGold:quote.totalGold});
    return {type: direction === 'buy' ? 'item-bought' : 'item-sold', ...quote, payment,movement,transferredItemId: transferred.id, ledgerId: ledger.id,
      transfer:{buyerId:ledger.buyerId,sellerId:ledger.sellerId,name:transferred.name,templateId:transferred.templateId,fromContainerId:sourceContainerId,toContainerId:destinationContainerId,legalOwnerEntityId:transferred.legalOwnerEntityId},
      wallets:{payer:{entityId:ledger.buyerId,before:walletBefore.payer,after:payer.gold},receiver:{entityId:ledger.sellerId,before:walletBefore.receiver,after:receiver.gold}},
      summary: `${direction === 'buy' ? '购买' : '出售'}${transferred.name}×${quote.quantity}，成交价${quote.currencyText}`};
  }

  function trade(rawState, options, transactionId, direction){const type=direction==='buy'?'购买物品':'出售物品',guard=transactionStart(rawState,transactionId,type),requestHash=abilities.hash({options,direction});if(guard.duplicate){if(guard.receipt.requestHash!==requestHash)throw Error('买卖事务编号不能复用于不同请求');return {state:guard.state,receipt:guard.receipt,idempotent:true};}return commit(guard.state,transactionId,type,{...executeTrade(guard.state,options,transactionId,direction),requestHash});}

  function batchTradeRequest(state,input){
    if(Object.keys(input).some(k=>!['id','type','actorId','shopId','accountId','direction','lines','quoteVersion','maximumGold'].includes(k))||!['buy','sell'].includes(input.direction)||typeof input.shopId!=='string'||!Array.isArray(input.lines)||input.lines.length<1||input.lines.length>100)throw Error('请选择同一商铺的1至100种采购或回收商品');
    const seen=new Set(),lines=input.lines.map(row=>{
      if(!row||Object.keys(row).some(k=>!['kind','itemId','fingerprint','quantity'].includes(k))||!['item','material'].includes(row.kind)||!Number.isSafeInteger(row.quantity)||row.quantity<1||row.quantity>999||input.direction==='sell'&&row.kind!=='material')throw Error('交易清单只接受实际商品、材料和1至999份数量');
      const key=row.kind==='item'?row.itemId:row.fingerprint;
      if(typeof key!=='string'||!key||seen.has(row.kind+':'+key)||row.kind==='item'&&row.fingerprint!==undefined||row.kind==='material'&&row.itemId!==undefined)throw Error('每种交易来源只能填写一次');
      seen.add(row.kind+':'+key);return row.kind==='item'?{kind:'item',itemId:key,quantity:row.quantity}:{kind:'material',fingerprint:key,quantity:row.quantity};
    });
    assets.maximumGold(input,0);return {actorId:input.actorId??state.角色.主控单位ID,shopId:input.shopId,direction:input.direction,accountId:assets.account(state,input.actorId??state.角色.主控单位ID,input.accountId).id,lines,...(input.maximumGold===undefined?{}:{maximumGold:input.maximumGold})};
  }
  function applyBatchTrade(state,request,sourceId){
    const results=[];
    for(const [i,line] of request.lines.entries()){
      const {kind,...asset}=line,q={...asset,actorId:request.actorId,shopId:request.shopId,direction:request.direction,accountId:request.accountId,...(request.maximumGold===undefined?{}:{maximumGold:request.maximumGold})};
      results.push(kind==='item'?executeTrade(state,q,`${sourceId}:${i}`,request.direction):assets.execute(state,q,`${sourceId}:${i}`).receipt);assets.maximumGold(request,results.reduce((n,r)=>n+r.totalGold,0));
    }
    const totalGold=results.reduce((n,r)=>n+r.totalGold,0),{maximumGold,...pricedRequest}=request,quoteVersion=abilities.hash({request:pricedRequest,quotes:results.map(r=>r.quoteVersion)});
    return {type:'commerce-batch-traded',...request,results,totalGold,quoteVersion,remainingGold:assets.account(state,request.actorId,request.accountId).gold,summary:`一次${request.direction==='buy'?'购买':'回收'}${results.length}种物资，${request.direction==='buy'?'支付':'获得'}${totalGold}金币`};
  }
  function previewBatchTrade(rawState,input){
    const state=normalizeState(rawState),request=batchTradeRequest(state,input);
    let sourceId=`batch-quote:${state.系统.revision}`;while(assets.table(state).events.some(e=>e.sourceId.startsWith(sourceId+':')))sourceId+=':next';return {...applyBatchTrade(state,request,sourceId),pass:true};
  }
  function tradeBatch(rawState,input,transactionId){
    const guard=transactionStart(rawState,transactionId,'批量交易'),request=batchTradeRequest(guard.state,input),requestHash=abilities.hash(request);
    if(guard.duplicate){if(guard.receipt.requestHash!==requestHash)throw Error('交易编号不能用于另一份清单');return {state:guard.state,receipt:guard.receipt,idempotent:true};}
    const receipt=applyBatchTrade(guard.state,request,transactionId);
    if(input.quoteVersion&&input.quoteVersion!==receipt.quoteVersion)throw Error('本次总报价已变化，请重新查看');
    return commit(guard.state,transactionId,'批量交易',{...receipt,requestHash});
  }

  function previewShopPurchase(rawState,shopId,templateId,quantity,actorId=rawState.角色.主控单位ID,options={}){
    const state=normalizeState(rawState);
    if(!Number.isSafeInteger(quantity)||quantity<1||quantity>999)throw Error('购买数量须为1至999的整数');
    const shop = state.商店.列表[shopId];
    const offer = shop && stock.offers(state, shop.locationId, stockHooks(), actorId).find(row => row.templateId === templateId);
    if (!offer) throw Error('此地区没有该商品，或库存已售罄');
    return simulateShopPurchase(state, shopId, offer, quantity, actorId, options);
  }

  // A simulation can spend discounts, transfer items and change stock in its private world.
  function simulateShopPurchase(state, shopId, offer, quantity, actorId, options) {
    const templateId = offer.templateId;
    if (offer.quantity < quantity) throw Error(`库存不足：现有${offer.quantity}件，本次需要${quantity}件`);
    const initialPlacement=previewItemPlacement(state,state.人物.列表[actorId].inventoryContainerId,{templateId,distinctItems:ITEM_TEMPLATES[templateId].stackable===false?quantity:1});if(!initialPlacement.pass)throw Error(initialPlacement.message);
    let previewSource=`supply-preview:${state.系统.revision}`;while(assets.table(state).events.some(e=>e.sourceId.startsWith(previewSource+':')))previewSource+=':next';
    let remaining=quantity;const parts=[];for(const itemId of offer.itemIds){if(!remaining)break;const q=Math.min(remaining,state.物品.实例[itemId].quantity),part=executeTrade(state,{actorId,shopId,itemId,quantity:q},`${previewSource}:${parts.length}`,'buy',false);parts.push(part);remaining-=q;}
    const totalGold=parts.reduce((n,v)=>n+v.totalGold,0),person=state.人物.列表[actorId],wallet=state.钱包.列表[person.walletId],placement=initialPlacement;assets.maximumGold({...options,direction:'buy'},totalGold);
    if(!placement.pass)throw Error(placement.message);return {kind:'supply',templateId,name:offer.name,quantity,unitValue:parts[0].unitPrice,totalGold,remainingGold:wallet.gold,remainingStock:offer.quantity-quantity,playerId:actorId,placement,parts};
  }

  function previewSinglePurchases(rawState, shopId, templateIds, actorId) {
    const state = normalizeState(rawState);
    const shop = state.商店.列表[shopId];
    if (!shop) return [];
    const offers = stock.offers(state, shop.locationId, stockHooks(), actorId);
    // Candidates are alternatives, each starting with the original purse, inventory and contracts.
    // Keep the map, bestiary and story archive on one immutable simulation seed.
    // Each purchase still owns its items, accounts, contracts and skill table.
    const simulation = globalThis.SoulCombatProjection;
    const baseline = simulation.seed(state);
    const options = [];
    for (const templateId of templateIds) {
      const offer = offers.find(row => row.templateId === templateId);
      if (!offer?.quantity) continue;
      try {
        const quote = simulateShopPurchase(simulation.fork(baseline).state, shopId, offer, 1, actorId, {});
        options.push({templateId, name: quote.name, unitGold: quote.unitValue, quantity: 1, remainingGold: quote.remainingGold});
      } catch {
        // The actual trade rules reject this candidate (for example, the buyer's pack is full).
      }
    }
    return options;
  }

  function restockShop(rawState, options, transactionId) {
    const guard = transactionStart(rawState, transactionId, '商店补货');
    if (guard.duplicate) return {state: guard.state, receipt: guard.receipt, idempotent: true};
    const state = guard.state;
    const shop = state.商店.列表[clean(options?.shopId)];
    if (!shop) throw new Error('商店不存在');
    if (shop.status !== 'open') throw Error('商店当前未营业');
    const playerId = state.角色.主控单位ID;
    const position = actions.positionOf(state, playerId);
    if (position.kind !== 'location' || position.sceneId || position.locationId !== shop.locationId || state.地图.当前地点ID !== shop.locationId) {
      throw Error('须在商店所在地点办理补货');
    }
    const block = worldActionBlockReason(state, {actorId: playerId});
    if (block) throw Error(block);
    if (state.世界.时间.day < shop.restockDay) throw Error('尚未到补货时间');
    if(shop.扩展?.regional){const batch=stock.refill(state,shop,stockHooks(),transactionId);return commit(state,transactionId,'商店补货',{type:'shop-restocked',shopId:shop.id,batch,nextRestockDay:shop.restockDay,summary:`${shop.name}以经营本钱完成有限补货`});}
    const template = SHOP_TEMPLATES[shop.templateId];
    if (!template || shop.infinite) throw Error('这家商店没有可手动补充的库存');
    for (const [templateId, targetQuantity] of template.stock) {
      const current = state.容器.列表[shop.stockContainerId].itemIds.map(id => state.物品.实例[id]).filter(item => item?.templateId === templateId).reduce((sum, item) => sum + item.quantity, 0);
      if (current < targetQuantity) createItem(state, templateId, shop.merchantId, shop.stockContainerId, {quantity: targetQuantity - current, provenance: {type: 'restock', shopId: shop.id, day: state.世界.时间.day}});
    }
    shop.restockDay = state.世界.时间.day + 3;
    return commit(state, transactionId, '商店补货', {type: 'shop-restocked', shopId: shop.id, nextRestockDay: shop.restockDay, summary: `${shop.name}完成补货`});
  }

  function createHumanCorpse(state, unit) {
    const person = state.人物.列表[unit.id];
    if (!person) return null;
    const corpseId = `remains-${unit.id}`;
    if (state.战利品.遗骸列表[corpseId]) return state.战利品.遗骸列表[corpseId];
    const containerId = `container-${corpseId}`;
    state.容器.列表[containerId] = {id: containerId, type: 'corpse', ownerEntityId: unit.id, locationId: person.locationId, itemIds: [], capacity: {slots: 999}, status: 'active', 扩展: {remainsId: corpseId}};
    const inventory = state.容器.列表[person.inventoryContainerId];
    const config = state.装备.配置[unit.id];
    for (const slot of EQUIPMENT_SLOTS) if (config?.slots?.[slot]) config.slots[slot] = '';
    const droppedSoulBoneItemIds = [];
    for (const [slot, itemId] of Object.entries(config?.soulBoneSlots ?? {})) {
      if (!itemId) continue;
      const item = state.物品.实例[itemId];
      if (item?.type === '魂骨') {
        item.boundToEntityId = '';
        item.扩展.integrated = false;
        item.扩展.deathLoot = {formerOwnerEntityId: unit.id, slot, deathRevision: state.系统.revision};
        item.provenance = {...item.provenance, extractedOnDeath: true, formerOwnerEntityId: unit.id};
        droppedSoulBoneItemIds.push(item.id);
      }
      config.soulBoneSlots[slot] = '';
    }
    for (const itemId of [...(inventory?.itemIds ?? [])]) {
      const item = state.物品.实例[itemId];
      if (!item || item.boundToEntityId) continue;
      transferItem(state, itemId, containerId, item.quantity);
    }
    const wallet = state.钱包.列表[person.walletId];
    const coin = wallet?.gold ?? 0;
    if (wallet) wallet.gold = 0;
    const position=actions.positionOf(state,unit.id);
    const remains = {id: corpseId, type: 'human-corpse', unitId: unit.id, ownerEntityId: unit.id, locationId: person.locationId,position:clone(position), containerId, coinGold: coin, harvested: false, legalOwnerEntityId: unit.id, witnessIds: [], soulBoneItemIds: droppedSoulBoneItemIds, createdRevision: state.系统.revision, 扩展: {soulBonesDroppedOnDeath: droppedSoulBoneItemIds.length}};
    const origin=commerceSource.origin(state,unit.id);
    if(origin){remains.type='beast-remains';remains.profileId=origin.profileId;remains.integrity=1;remains.damageTypes=list(unit.扩展?.致死伤害类型);remains.soulBoneItemId='';remains.扩展.originEntityId=unit.id;}
    state.战利品.遗骸列表[corpseId] = remains;
    if(origin)generateSoulBoneInternal(state,state.魂兽档案.列表[origin.profileId],remains);
    refreshUnitEquipment(state, unit.id);
    return remains;
  }
  function settlePersonDeath(state,id){const unit=state.战斗单位.列表[id];if(!unit||unit.存活状态!=='死亡'||unit.扩展.remainsId)return null;const remains=createHumanCorpse(state,unit);if(remains)state.战斗单位.列表[id].扩展.remainsId=remains.id;return remains;}
  function recoverRevivalRemains(state,id){
    const unit=state.战斗单位.列表[id],person=state.人物.列表[id],remains=Object.values(state.战利品.遗骸列表).find(r=>r.unitId===id&&r.type==='human-corpse'),container=state.容器.列表[remains.containerId];
    // Move only what is still on the body. Looted items and coins are never
    // recreated, and dropped soul bones are not automatically re-integrated.
    for(const itemId of [...container.itemIds]){const item=state.物品.实例[itemId];if(item)transferItem(state,itemId,person.inventoryContainerId,item.quantity);}
    state.钱包.列表[person.walletId].gold+=remains.coinGold??0;
    delete state.容器.列表[container.id];delete state.战利品.遗骸列表[remains.id];delete unit.扩展.remainsId;
  }

  function soulBoneChance(profile) {
    const years = integer(profile?.年限 ?? 1, 1);
    if (years >= SOUL_BONE_VALUE_RULES.guaranteedDropYears) return 1;
    const integrityMultiplier = clamp(profile?.完整度 ?? 1, 0, 1);
    return Number(clamp(
      SOUL_BONE_VALUE_RULES.subHundredThousandBaseChance * integrityMultiplier,
      0,
      SOUL_BONE_VALUE_RULES.maximumModifiedNaturalChance
    ).toFixed(7));
  }

  function soulBoneSkillCount(yearsInput) {
    return integer(yearsInput ?? 1, 1) >= 100000 ? 2 : 1;
  }

  function calculateSoulBoneBudget(profile, integrityInput = profile?.完整度 ?? 1) {
    const years = integer(profile?.年限 ?? 1, 1);
    const tier = foundation.getAgeTier(profile.年限);
    const base = SOUL_BONE_VALUE_RULES.tierBaseBudgets[tier.名称];
    const upper = tier.最大 === Number.MAX_SAFE_INTEGER ? tier.最小 * 10 : tier.最大;
    const progress = clamp((Math.log10(years) - Math.log10(tier.最小)) / Math.max(1, Math.log10(upper) - Math.log10(tier.最小)), 0, 1);
    const grade = foundation.BEAST_VALUE.validateLineage(profile.血脉).grade.value;
    const integrity = clamp(integrityInput, 0, 1);
    const integrityMultiplier = 0.75 + integrity * 0.25;
    const potential = integer(base * (1 + progress * 0.15) * integrityMultiplier, 260, 3200);
    return {potential, available: potential, years, ageTier: tier.名称, grade, integrity, integrityMultiplier};
  }

  function passiveValue(passiveCombat) {
    return Object.entries(passiveCombat ?? {}).reduce((sum, [key, value]) => sum + Math.max(0, integer(value, 0, 999)) * (SOUL_BONE_VALUE_RULES.passiveUnitCosts[key] ?? 0), 0);
  }

  function soulBonePayloadHash(payload) {
    const source = clone(payload ?? {});
    delete source.immutableHash;
    delete source.expeditionTemporary;
    delete source.safelyExtracted;
    delete source.entranceStash;
    delete source.storedAtLocationId;
    return stableHash(JSON.stringify(source)).toString(16);
  }

  // Only the naming transaction can reseal an already valid payload.
  // Reading or restoring a damaged soul bone never repairs its integrity.
  function applySoulBoneSkillNarrative(item, index, narrative) {
    if(item?.type!=='魂骨'||!Number.isSafeInteger(index)||index<0||!narrative||typeof narrative!=='object'||Array.isArray(narrative)
      ||Object.keys(narrative).some(key=>!['name','description','namingSource','generationNaming'].includes(key))
      ||typeof narrative.name!=='string'||typeof narrative.description!=='string'||typeof narrative.namingSource!=='string')throw new Error('魂骨技能命名资料无效');
    const original=validateSoulBonePayload(item.payload);
    if(!original.pass)throw new Error(`魂骨命名前校验失败：${original.errors.join('；')}`);
    const payload=clone(item.payload),blueprint=payload.activeSkills[index];
    if(!blueprint)throw new Error('魂骨技能序号无效');
    Object.assign(blueprint,clone(narrative));
    payload.immutableHash=soulBonePayloadHash(payload);
    const checked=validateSoulBonePayload(payload);
    if(!checked.pass)throw new Error(`魂骨命名后校验失败：${checked.errors.join('；')}`);
    item.payload=payload;
    return item;
  }

  function soulBoneBlueprint(profile, slot, budgetInput, requestedSkillBlueprints = []) {
    const tier = foundation.getAgeTier(profile.年限);
    const budget = integer(budgetInput ?? calculateSoulBoneBudget(profile).available, 260, 3200);
    const damageType = clean(profile.属性谱?.主属性?.[0], '物理');
    const definitions = {
      头骨: {
        passivePlan: [{key: '先攻', max: 5}],
        skills: [
          {name: '魂骨技·灵识洞照', cooldownTurns: 3, effectSpecs: [['target.self', {阵营规则: '友方'}], ['status.buff', {属性: '感知', 数值: 1, 持续回合: 2}]]},
          {name: '魂骨技·匿息幻识', cooldownTurns: 4, effectSpecs: [['target.self', {阵营规则: '友方'}], ['status.invisibility', {持续回合: 1}]]}
        ]
      },
      躯干骨: {
        passivePlan: [{key: '开战护盾', max: 150}],
        skills: [
          {name: '魂骨技·玄躯守御', cooldownTurns: 3, effectSpecs: [['target.self', {阵营规则: '友方'}], ['payload.shield', {骰数: 1, 骰面: 6, 加值: 1}]]},
          {name: '魂骨技·不灭真躯', cooldownTurns: 6, effectSpecs: [['target.self', {阵营规则: '友方'}], ['status.invulnerable', {持续回合: 1}]]}
        ]
      },
      左臂骨: {
        passivePlan: [{key: '普通攻击伤害', max: 10}],
        skills: [
          {name: '魂骨技·左臂破锋', cooldownTurns: 2, effectSpecs: [['release.melee', {}], ['target.single', {阵营规则: '敌方'}], ['check.physical_attack', {命中加值: 1}], ['payload.damage', {类型: damageType, 骰数: 1, 骰面: 6, 加值: 1}]]},
          {name: '魂骨技·左臂反震', cooldownTurns: 4, effectSpecs: [['target.self', {阵营规则: '友方'}], ['reaction.counter', {次数: 1, 强度: 1}]]}
        ]
      },
      右臂骨: {
        passivePlan: [{key: '普通攻击伤害', max: 10}],
        skills: [
          {name: '魂骨技·右臂震击', cooldownTurns: 2, effectSpecs: [['release.melee', {}], ['target.single', {阵营规则: '敌方'}], ['check.physical_attack', {命中加值: 1}], ['payload.damage', {类型: damageType, 骰数: 1, 骰面: 6, 加值: 1}]]},
          {name: '魂骨技·右臂反震', cooldownTurns: 4, effectSpecs: [['target.self', {阵营规则: '友方'}], ['reaction.counter', {次数: 1, 强度: 1}]]}
        ]
      },
      左腿骨: {
        passivePlan: [{key: '移动区', max: 3}],
        skills: [
          profile.年限 < 1000
            ? {name: '魂骨技·左影疾行', cooldownTurns: 3, effectSpecs: [['target.self', {阵营规则: '友方'}], ['status.buff', {属性: '身法', 数值: 1, 持续回合: 2}]]}
            : {name: '魂骨技·左影疾行', cooldownTurns: 3, effectSpecs: [['target.self', {阵营规则: '友方'}], ['status.haste', {数值: 1, 持续回合: 2}]]},
          {name: '魂骨技·左影瞬步', cooldownTurns: 4, effectSpecs: [['target.self', {阵营规则: '友方'}], ['move.teleport', {距离区: 1, 目的: '指定站位'}]]}
        ]
      },
      右腿骨: {
        passivePlan: [{key: '移动区', max: 3}],
        skills: [
          profile.年限 < 1000
            ? {name: '魂骨技·右影疾行', cooldownTurns: 3, effectSpecs: [['target.self', {阵营规则: '友方'}], ['status.buff', {属性: '身法', 数值: 1, 持续回合: 2}]]}
            : {name: '魂骨技·右影疾行', cooldownTurns: 3, effectSpecs: [['target.self', {阵营规则: '友方'}], ['status.haste', {数值: 1, 持续回合: 2}]]},
          {name: '魂骨技·右影瞬步', cooldownTurns: 4, effectSpecs: [['target.self', {阵营规则: '友方'}], ['move.teleport', {距离区: 1, 目的: '指定站位'}]]}
        ]
      },
      外附魂骨: {
        passivePlan: [{key: '先攻', max: 3}, {key: '移动区', max: 2}, {key: '普通攻击伤害', max: 4}],
        skills: [
          {name: '魂骨技·外附延展', cooldownTurns: 3, effectSpecs: [['target.self', {阵营规则: '友方'}], ['status.buff', {属性: '身法', 数值: 1, 持续回合: 2}]]},
          {name: '魂骨技·外附反制', cooldownTurns: 4, effectSpecs: [['target.self', {阵营规则: '友方'}], ['reaction.counter', {次数: 1, 强度: 1}]]}
        ]
      }
    };
    const definition = definitions[slot] ?? definitions.躯干骨;
    const skillCount = soulBoneSkillCount(profile.年限);
    const requested = Array.isArray(requestedSkillBlueprints) ? requestedSkillBlueprints : [];
    const minimums=definition.skills.slice(0,skillCount).map((fallback,index)=>{const template={...fallback,...requested[index]};return requested[index]?.requestedBranches?.length?effects.minimumDirectedCost(requested[index].requestedBranches,template):effects.abilityValueLedger({...template,effectGraph:effects.makeLinearGraph(template.effectSpecs)}).netValue;});
    const minimumTotal=minimums.reduce((sum,n)=>sum+n,0);
    if(minimumTotal>budget)throw new Error(`魂骨指定能力超出总预算：${minimumTotal}/${budget}`);
    const activeSkillPool = Math.max(minimumTotal,Math.floor(budget * SOUL_BONE_VALUE_RULES.activeSkillShare));
    const extra=effects.splitValueBudget(activeSkillPool-minimumTotal,skillCount);
    const activeSkillAllocations=minimums.map((cost,index)=>cost+extra[index]);
    const activeSkills = definition.skills.slice(0, skillCount).map((fallbackTemplate, index) => {
      const requestedTemplate = requested[index];
      const template = requestedTemplate ? {...clone(fallbackTemplate),...clone(requestedTemplate),name:clean(requestedTemplate.name,fallbackTemplate.name)} : fallbackTemplate;
      const directed = !requestedTemplate?.fixedDesign && requestedTemplate?.requestedBranches?.length
        ? effects.compileDirectedGraph({
          requestedBranches:requestedTemplate.requestedBranches,
          costContract:template,
          ageTier:tier.名称,
          mechanismCap:tier.机制上限,
          budget:activeSkillAllocations[index],
          allocationStyle:requestedTemplate.allocationStyle ?? '均衡',
          provenance:{source:'canon-directed-soul-bone',slot,years:profile.年限,skillIndex:index,skillName:template.name,evidence:requestedTemplate.evidence ?? ''}
        })
        : null;
      const allocation = directed || requestedTemplate?.fixedDesign ? null : effects.optimizePlanToBudget(template.effectSpecs, activeSkillAllocations[index], '均衡',effects.calculateNodeCost,0,0,null,template);
      const graph = requestedTemplate?.fixedDesign ? effects.makeLinearGraph(template.effectSpecs,{provenance:{source:'authored-commerce-bone',slot,years:profile.年限}}) : directed?.graph ?? effects.makeLinearGraph(allocation.nodes, {provenance: {source: 'soul-bone', slot, years: profile.年限, skillIndex: index}});
      const validation = effects.validateGraph(graph, {ageTier: tier.名称, mechanismCap: tier.机制上限, budget: activeSkillAllocations[index],costContract:template});
      if (!validation.pass) throw new Error(`魂骨技能${template.name}价值编译失败：${validation.errors.join('；')}`);
      for(const node of graph.nodes.filter(n=>['contract.oath','trigger.contract','modifier.world_duration','payload.death'].includes(n.effectId)))if(!foundation.MARTIAL_SOUL_CORE.allowsEffect(profile.血脉.compiled,node.effectId,node.params))throw Error('魂骨血脉没有取得该誓约、死亡或长期能力');
      return {
        ...clone(template),
        effectSpecs: graph.nodes.map(node => [node.effectId,clone(node.params ?? {})]),
        effectGraph: clone(graph),
        abilityValue:validation.abilityValue,
        soulPowerCost: Math.max(2, Math.round(validation.rawSpent / 90)),
        usageRules:clone(requestedTemplate?.usageRules ?? template.usageRules ?? {}),
        ageTier: tier.名称,
        mechanismCap: tier.机制上限,
        directedPlan:directed ? {evidence:requestedTemplate.evidence ?? '',mechanismIds:clone(requestedTemplate.mechanismIds ?? []),selectedBranches:directed.selectedBranches,droppedBranches:directed.droppedBranches} : null,
        value: {allocatedBudget: activeSkillAllocations[index], spent: validation.spent, unallocated: activeSkillAllocations[index] - validation.spent}
      };
    });
    const activeSpent = activeSkills.reduce((sum, skill) => sum + skill.value.spent, 0);
    let remaining = budget - activeSpent;
    const passiveTarget = Math.min(remaining, Math.max(definition.passivePlan[0] ? SOUL_BONE_VALUE_RULES.passiveUnitCosts[definition.passivePlan[0].key] : 0, Math.floor(budget * SOUL_BONE_VALUE_RULES.passiveShare)));
    const passiveCombat = {};
    let passiveSpent = 0;
    let passiveEffectGraph=null;
    if (!requested.length && effects.TIER_RANK[tier.名称]>=effects.TIER_RANK.千年 && passiveTarget>=620) {
      const variants=effects.materialDefenseVariants(profile.属性谱?.主属性 ?? [],profile.血脉.definition.channels).filter(([,params])=>params.模式==='抗性');
      if (variants.length && stableHash(`${profile.id}:${slot}:passive`)%2===0) {
        const [id,raw]=variants[stableHash(`${profile.id}:${slot}:guard`)%variants.length],params={...raw};delete params.持续回合;
        const graph=effects.makeBranchedGraph([{activation:'passive',label:'融合时生效',nodes:[[id,params]]}],{provenance:{source:'soul-bone',profileId:profile.id,slot}});
        const checked=effects.validateGraph(graph,{ageTier:tier.名称,mechanismCap:tier.机制上限,budget:passiveTarget});
        if(checked.pass){passiveEffectGraph=graph;passiveSpent=checked.spent;}
      }
    }
    for (const descriptor of definition.passivePlan) {
      const unitCost = SOUL_BONE_VALUE_RULES.passiveUnitCosts[descriptor.key];
      while ((passiveSpent + unitCost) <= passiveTarget && integer(passiveCombat[descriptor.key] ?? 0) < descriptor.max) {
        passiveCombat[descriptor.key] = integer(passiveCombat[descriptor.key] ?? 0) + 1;
        passiveSpent += unitCost;
      }
    }
    remaining -= passiveSpent;
    const spent = activeSpent + passiveSpent;
    if (spent > budget) throw new Error(`魂骨总价值超支：${spent}/${budget}`);
    return {
      modifiers: {attributes: {}},
      passiveCombat,
      passiveEffectGraph,
      activeSkills,
      valueLedger: {
        version: 'soul-bone-value-v1.10',
        totalBudget: budget,
        categoryTargets: {activeSkills: activeSkillPool, passiveCombat: Math.floor(budget * SOUL_BONE_VALUE_RULES.passiveShare)},
        activeSkillAllocations,
        costs: {activeSkills: activeSpent, passiveCombat: passiveSpent},
        spent,
        unallocated: budget - spent,
        marketValuePoints: budget * SOUL_BONE_VALUE_RULES.marketValuePerEffectPoint
      }
    };
  }

  function validateSoulBonePayload(payload) {
    const errors = [];
    const slot = clean(payload?.slot);
    const years = integer(payload?.years ?? 0, 0);
    const ledger = payload?.valueLedger ?? {};
    if (!SOUL_BONE_SLOTS.includes(slot)) errors.push('魂骨槽位非法');
    if (!Array.isArray(payload?.activeSkills) || payload.activeSkills.length !== soulBoneSkillCount(years)) errors.push('魂骨主动技能数量不符合年限规则');
    const hasPermanentAttributes = Object.values(payload?.modifiers?.attributes ?? {}).some(value => Number(value) !== 0);
    if (hasPermanentAttributes) errors.push('魂骨不能提供永久六维属性');
    const defenseValidation=payload?.passiveEffectGraph ? effects.validateGraph(payload.passiveEffectGraph,{ageTier:foundation.getAgeTier(years).名称,mechanismCap:foundation.getAgeTier(years).机制上限,budget:Math.floor(Number(ledger.totalBudget)*SOUL_BONE_VALUE_RULES.passiveShare)}) : {pass:true,spent:0,errors:[]};
    if (payload?.passiveEffectGraph && effects.skillActivation(payload.passiveEffectGraph)!=='passive') errors.push('魂骨常驻图只允许被动分支');
    errors.push(...defenseValidation.errors);
    const passiveSpent = passiveValue(payload?.passiveCombat)+defenseValidation.spent;
    if (defenseValidation.spent && passiveSpent>Math.floor(Number(ledger.totalBudget)*SOUL_BONE_VALUE_RULES.passiveShare)) errors.push('魂骨常驻效果超出既有被动份额');
    let activeSpent = 0;
    for (const skill of payload?.activeSkills ?? []) {
      errors.push(...abilities.validate({...skill,id:skill.id??'soul-bone-blueprint'}).errors);
      const graph = skill.effectGraph?.nodes?.length
        ? clone(skill.effectGraph)
        : effects.makeLinearGraph(skill.effectSpecs ?? [], {provenance: {source: 'soul-bone-validation', slot}});
      const validation = effects.validateGraph(graph, {ageTier: skill.ageTier, mechanismCap: skill.mechanismCap, budget: skill.value?.allocatedBudget,costContract:skill});
      errors.push(...effects.validateAbilityValue({...skill,effectGraph:graph}));
      for(const node of graph.nodes.filter(n=>['contract.oath','trigger.contract','modifier.world_duration','payload.death'].includes(n.effectId)))try{if(!payload.sourceBloodline||!foundation.MARTIAL_SOUL_CORE.allowsEffect(foundation.BEAST_VALUE.validateLineage(payload.sourceBloodline).compiled,node.effectId,node.params))errors.push('魂骨誓约、死亡或长期能力缺少实际血脉来源');}catch{errors.push('魂骨特殊效果血脉无效');}
      if (!validation.pass) errors.push(`魂骨技能${skill.name ?? '未命名'}不合法：${validation.errors.join('；')}`);
      if (validation.spent !== integer(skill.value?.spent ?? -1, -1)) errors.push(`魂骨技能${skill.name ?? '未命名'}登记价值与效果图不一致`);
      activeSpent += validation.spent;
    }
    const spent = passiveSpent + activeSpent;
    if (integer(ledger.totalBudget ?? -1, -1) < spent) errors.push(`魂骨价值超支：${spent}/${ledger.totalBudget ?? 0}`);
    if (integer(ledger.spent ?? -1, -1) !== spent) errors.push('魂骨价值台账总支出不一致');
    if (integer(ledger.unallocated ?? -1, -1) !== integer(ledger.totalBudget ?? 0) - spent) errors.push('魂骨价值台账未分配值不一致');
    if (ledger.costs?.activeSkills !== activeSpent || ledger.costs?.passiveCombat !== passiveSpent || Object.hasOwn(ledger.costs ?? {}, 'permanentAttributes')) errors.push('魂骨价值分类支出不一致');
    if (payload?.evolution) errors.push('外附魂骨吞噬进化机制已删除');
    if (payload?.set) errors.push('魂骨套装与共鸣机制已删除');
    if (payload?.immutableHash !== soulBonePayloadHash(payload)) errors.push('魂骨不可变哈希不一致');
    if(payload?.presetId)try{validatePresetSoulBonePayload(payload);}catch(error){errors.push(error.message);}else if(payload?.presetSource||payload?.presetContractHash)errors.push('精品魂骨来源编号缺失');
    return {pass: errors.length === 0, errors, spent, totalBudget: integer(ledger.totalBudget ?? 0), unallocated: integer(ledger.unallocated ?? 0)};
  }

  function createSoulBoneItem(state, options = {}) {
    const profile = clone(options.profile ?? {});
    profile.年限 = integer(profile.年限 ?? options.years ?? 1, 1);
    profile.种族品级 = foundation.BEAST_VALUE.validateLineage(profile.血脉).grade.value;
    profile.完整度 = clamp(options.integrity ?? profile.完整度 ?? 1, 0, 1);
    profile.属性谱 = merge({主属性: ['物理']}, profile.属性谱 ?? {});
    const slot = clean(options.slot, SOUL_BONE_SLOTS[stableHash(`${options.seed ?? profile.id ?? profile.名称}:${profile.年限}`) % 6]);
    if (!SOUL_BONE_SLOTS.includes(slot)) throw new Error(`魂骨槽位非法：${slot}`);
    const budgetSnapshot = calculateSoulBoneBudget(profile, profile.完整度);
    const budget = integer(options.budget ?? budgetSnapshot.available, 260, 3200);
    const blueprint = soulBoneBlueprint(profile, slot, budget, options.activeSkillBlueprints);
    const requestedSkillNames = Array.isArray(options.activeSkillNames) ? options.activeSkillNames.map(clean).filter(Boolean) : [];
    for (const [index,name] of requestedSkillNames.entries()) if (blueprint.activeSkills[index]) blueprint.activeSkills[index].name = name;
    const tier = foundation.getAgeTier(profile.年限);
    const payload = {
      slot,
      years: profile.年限,
      tier: tier.名称,
      sourceProfileId: clean(options.sourceProfileId, profile.id),
      sourceBloodline: clone(profile.血脉),
      budget,
      modifiers: blueprint.modifiers,
      passiveCombat: blueprint.passiveCombat,
      passiveEffectGraph: blueprint.passiveEffectGraph,
      activeSkills: blueprint.activeSkills,
      effectAtoms: list(blueprint.activeSkills.flatMap(skill => skill.effectSpecs.map(([effectId]) => effectId))),
      valueLedger: blueprint.valueLedger,
      provenance: clone(options.payloadProvenance ?? {}),
      ...clone(options.payloadExtra ?? {})
    };
    payload.immutableHash = soulBonePayloadHash(payload);
    const item = createItem(state, 'soul-bone-generic', clean(options.ownerEntityId), clean(options.containerId), {

      id: options.id,
      name: clean(options.name, `${clean(profile.名称, '无名魂兽')}${slot}`),
      type: '魂骨',
      quality: tier.名称,
      provenance: clone(options.provenance ?? {type: 'generated-soul-bone', profileId: profile.id, years: profile.年限}),
      payload,
      valuePoints: blueprint.valueLedger.marketValuePoints,
      forceUnique: true
    });
    const validation = validateSoulBonePayload(item.payload);
    if (!validation.pass) throw new Error(`生成魂骨未通过价值校验：${validation.errors.join('；')}`);
    return item;
  }

  function fixedPresetBoneBlueprints(entry,profile,budget){
    const compiled=presets.compile(entry.id,{years:profile.年限,budget});
    if(!compiled.pass)throw Error(compiled.reason||'精品魂骨未通过年限与预算校验');
    if(compiled.mechanics.activeSkillBlueprints.length!==soulBoneSkillCount(profile.年限))throw Error('实际兽龄所需骨技数量与精品完整配方不符');
    return compiled.mechanics.activeSkillBlueprints.map(skill=>({...clone(skill),fixedDesign:true,effectSpecs:clone(entry.recipe.effectSpecs)}));
  }
  function soulBonePresetSelection(state,profile,remains,slot){
    const seed=state.世界.seed+':'+profile.id,route=presets.routeFor(seed,'soul-bone');
    if(route==='random')return {route,presetId:null,reason:'本次使用随机魂骨配方'};
    const beast=cycle.validatePresetBeastProfile(profile);
    if(!beast)return {route,presetId:null,reason:'实际魂兽不是对应登记精品兽种，保留随机魂骨'};
    const budget=calculateSoulBoneBudget(profile,remains.integrity).available;
    const entries=presets.list({category:'魂骨'}).filter(entry=>entry.recipe.speciesId===beast.recipe.speciesId&&entry.recipe.slot===slot&&profile.年限>=entry.gates.minimumYears).sort((a,b)=>stableHash(seed+':'+a.id)-stableHash(seed+':'+b.id));
    let failure='当前真实兽种、年限及自然掉落槽没有对应完整精品魂骨，保留随机魂骨';
    for(const entry of entries)try{
      const blueprints=fixedPresetBoneBlueprints(entry,profile,budget),blueprint=soulBoneBlueprint({...clone(profile),完整度:remains.integrity},slot,budget,blueprints);
      if(remains.soulBoneRoll?.forced)throw Error('测试强制掉落不能登记自然精品魂骨');
      return {route,presetId:entry.id,recipeHash:abilities.hash({category:entry.category,recipe:entry.recipe}),beastPresetId:beast.id,beastRecipeHash:profile.扩展.presetContractHash,speciesId:beast.recipe.speciesId,sourceProfileId:profile.id,remainsId:remains.id,years:profile.年限,slot,budget,blueprintHash:abilities.hash(blueprint),reason:''};
    }catch(error){failure=error.message+'；保留随机魂骨';}
    return {route,presetId:null,reason:failure};
  }
  function validatePresetSoulBonePayload(payload){
    const entry=presets.get(payload?.presetId);
    if(!entry||entry.category!=='魂骨')throw Error('精品魂骨配方不存在');
    const hash=abilities.hash({category:entry.category,recipe:entry.recipe}),source=payload.presetSource;
    if(payload.presetContractHash!==hash||payload.artId!==entry.artId||payload.slot!==entry.recipe.slot||payload.years<entry.gates.minimumYears||!source||source.presetId!==entry.id||source.recipeHash!==hash||source.sourceProfileId!==payload.sourceProfileId||source.years!==payload.years||source.slot!==payload.slot||source.budget!==payload.budget)throw Error('精品魂骨身份、年限、槽位或登记配方不符');
    const profile={id:payload.sourceProfileId,年限:payload.years,血脉:payload.sourceBloodline,完整度:payload.provenance?.integrity??1,属性谱:{主属性:[entry.recipe.attribute]}};
    const expected=soulBoneBlueprint(profile,payload.slot,payload.budget,fixedPresetBoneBlueprints(entry,profile,payload.budget));
    if(source.blueprintHash!==abilities.hash(expected)||['modifiers','passiveCombat','passiveEffectGraph','activeSkills','valueLedger'].some(key=>abilities.hash(payload[key])!==abilities.hash(expected[key])))throw Error('精品魂骨完整技能参数或价值台账已改变');
  }
  function validateSoulBoneDrops(state){
    const errors=[];
    for(const remains of Object.values(state.战利品?.遗骸列表??{}))if(remains.type==='beast-remains'){
      if(remains.soulBoneRoll?.dropped&&!remains.soulBoneItemId)errors.push('魂骨成功掉落缺少实际成品');
      if(!remains.soulBoneItemId)continue;
      try{
      const profile=state.魂兽档案?.列表?.[remains.profileId],item=state.物品?.实例?.[remains.soulBoneItemId];
      if(!profile||!item||item.type!=='魂骨'||item.payload?.sourceProfileId!==profile.id||item.payload.years!==profile.年限||abilities.hash(item.payload.sourceBloodline)!==abilities.hash(profile.血脉))throw Error('掉落魂骨与真实遗骸及血脉不符');
      const rng=makeRng(state.世界.seed+':'+profile.id+':soul-bone'),chance=soulBoneChance({...clone(profile),完整度:remains.integrity}),roll=rng.next(),proof=remains.soulBoneRoll;
      if(!proof||proof.dropped!==true||proof.chance!==chance||proof.roll!==roll||proof.guaranteed!==(profile.年限>=SOUL_BONE_VALUE_RULES.guaranteedDropYears)||proof.dropped!==Boolean(proof.forced||roll<chance))throw Error('魂骨掉落概率与真实来源不符');
      if(item.payload?.presetId&&proof.forced)throw Error('自然精品魂骨不能来自测试强制掉落');
      const naturalSlot=rng.next()<SOUL_BONE_VALUE_RULES.naturalExternalSlotConditionalChance?'外附魂骨':rng.pick(SOUL_BONE_SLOTS.slice(0,6));
      if(item.payload.slot!==naturalSlot)throw Error('精品配方改变了自然掉落槽或外附概率');
      const selection=soulBonePresetSelection(state,profile,remains,item.payload.slot);
      if(profile.扩展?.presetId||item.payload?.presetId||remains.soulBonePresetSelection){
        if(abilities.hash(remains.soulBonePresetSelection)!==abilities.hash(selection)||(item.payload.presetId??null)!==selection.presetId)throw Error('魂骨预设筛选与实际兽种、年限、槽位或预算不符');
        if(selection.presetId&&(abilities.hash(item.payload.presetSource)!==abilities.hash(selection)||item.payload.provenance?.remainsId!==remains.id||item.provenance?.profileId!==profile.id||item.provenance?.type!=='soul-beast-drop'))throw Error('精品魂骨缺少实际概率掉落来源');
      }
    }catch(error){errors.push('魂骨掉落来源无效：'+error.message);}
    }
    for(const item of Object.values(state.物品?.实例??{}))if(item.type==='魂骨'&&item.payload?.presetId&&!Object.values(state.战利品?.遗骸列表??{}).some(remains=>remains.soulBoneItemId===item.id&&remains.profileId===item.payload.sourceProfileId))errors.push('精品魂骨没有对应真实遗骸掉落');
    return errors;
  }

  function generateSoulBoneInternal(state, profile, remains, options = {}) {
    if (remains.soulBoneItemId) return state.物品.实例[remains.soulBoneItemId];
    const rng = makeRng(`${state.世界.seed}:${profile.id}:soul-bone`);
    const sourceProfile = {...clone(profile), 完整度: remains.integrity};
    const chance = soulBoneChance(sourceProfile);
    const roll = rng.next();
    remains.soulBoneRoll = {chance, roll, forced: Boolean(options.force), guaranteed: profile.年限 >= SOUL_BONE_VALUE_RULES.guaranteedDropYears, dropped: Boolean(options.force || roll < chance)};
    if (!remains.soulBoneRoll.dropped) return null;
    const naturalSlot = rng.next() < SOUL_BONE_VALUE_RULES.naturalExternalSlotConditionalChance
      ? '外附魂骨'
      : rng.pick(SOUL_BONE_SLOTS.slice(0, 6));
    const slot = clean(options.slot, naturalSlot);
    const selection=soulBonePresetSelection(state,sourceProfile,remains,slot);
    remains.soulBonePresetSelection=clone(selection);
    const entry=selection.presetId?presets.get(selection.presetId):null;
    const item = createSoulBoneItem(state, {
      profile: sourceProfile,
      sourceProfileId: profile.id,
      slot,
      seed: `${state.世界.seed}:${profile.id}:soul-bone-item`,
      containerId: remains.containerId,
      name: entry?.name??`${profile.名称}${slot}`,
      ...(entry?{activeSkillBlueprints:fixedPresetBoneBlueprints(entry,sourceProfile,selection.budget),payloadExtra:{presetId:entry.id,artId:entry.artId,presetContractHash:selection.recipeHash,presetSource:clone(selection)}}:{}),
      provenance: {type: 'soul-beast-drop', profileId: profile.id, years: profile.年限},
      payloadProvenance: {remainsId: remains.id, integrity: remains.integrity, damageTypes: clone(remains.damageTypes ?? [])}
    });
    remains.soulBoneItemId = item.id;
    return item;
  }

  function createBeastRemains(state, unit, options = {}) {
    const profile = Object.values(state.魂兽档案.列表).find(item => item.单位ID === unit.id);
    if (!profile) return null;
    const remainsId = `remains-${unit.id}`;
    if (state.战利品.遗骸列表[remainsId]) return state.战利品.遗骸列表[remainsId];
    const expedition=expeditions.forRosterUnit(state,unit.id);
    const encounter=Object.values(state.遭遇?.列表??{}).find(e=>e.战斗单位ID列表?.includes(unit.id));
    const locationId=expedition?.entranceLocationId??encounter?.locationId;
    if(!locationId)throw Error('魂兽遗骸缺少实际遭遇地点');
    const containerId = `container-${remainsId}`;
    state.容器.列表[containerId] = {id: containerId, type: 'beast-remains', ownerEntityId: '', locationId, itemIds: [], capacity: {slots: 999}, status: 'active', 扩展: {remainsId}};
    const damageTypes = list(options.damageTypes ?? unit.扩展?.致死伤害类型);
    let integrity = profile.完整度;
    if (damageTypes.includes('火')) integrity -= 0.25;
    if (damageTypes.includes('毒蚀')) integrity -= 0.2;
    if (damageTypes.includes('风')) integrity -= 0.1;
    integrity = clamp(integrity, 0, 1);
    const source = expedition?.currentRoom?.roster?.some(beast => beast.unitId === unit.id) ? {expeditionId:expedition.id,roomId:expedition.currentRoom.nodeId} : {};
    if(!encounter?.position)throw Error('魂兽遗骸缺少原遭遇现场');
    const remains = {id: remainsId, type: 'beast-remains', unitId: unit.id, profileId: profile.id, locationId, position:clone(encounter.position), containerId, integrity, damageTypes, harvested: false, soulBoneItemId: '', createdRevision: state.系统.revision, 扩展: source};
    state.战利品.遗骸列表[remainsId] = remains;
    generateSoulBoneInternal(state, profile, remains, {force: Boolean(options.forceSoulBone)});
    return remains;
  }

  function reconcileAftermath(rawState, receipt, options = {}) {
    const state = normalizeState(rawState);
    people.settleAt(state);
    const damageByTarget = {};
    for (const target of receipt?.targets ?? []) {
      if (!target.defeated) continue;
      damageByTarget[target.targetId] = list((target.effects ?? []).map(effect => effect.damageType));
    }
    const created = [];
    for (const unit of Object.values(state.战斗单位.列表)) {
      if (unit.存活状态 !== '死亡' || unit.扩展?.remainsId) continue;
      const remains = unit.单位种类 === '魂兽' ? createBeastRemains(state, unit, {damageTypes: damageByTarget[unit.id], forceSoulBone: options.forceSoulBone}) : createHumanCorpse(state, unit);
      if (remains) {
        unit.扩展.remainsId = remains.id;
        created.push(remains.id);
      }
    }
    return {state, createdRemainsIds: created};
  }

  function isExpeditionRemains(state, remains) {
    if (!remains) return false;
    if (remains.扩展?.expeditionId) return true;
    return Object.values(state.遭遇?.列表 ?? {}).some(encounter => encounter.扩展?.结果?.resolvedBy === 'expedition-engine' && encounter.战斗单位ID列表?.includes(remains.unitId));
  }

  function requireFieldRemains(state, remains) {
    if (remains?.type!=='construct-remains'&&(isExpeditionRemains(state,remains)||remains?.position?.sceneId?.startsWith('expedition:'))) throw new Error('这处遗骸属于副本，只能在对应房间内处理');
  }
  function assertRemainsPosition(state,remains,actorId){if(remains?.position&&abilities.hash(remains.position)!==abilities.hash(actions.positionOf(state,actorId)))throw Error('遗骸不在人物实际可接触的现场');}

  function harvestBeast(rawState, options, transactionId) {
    if(options?.actorId&&options?.entityId&&options.actorId!==options.entityId)throw Error('采集行动者不能与收件人不一致');
    const actorId=clean(options?.actorId,clean(options?.entityId,rawState.角色.主控单位ID));
    const guard = transactionStart(rawState, transactionId, '采集魂兽');
    if (guard.duplicate){
      if(guard.receipt.actorId!==actorId||guard.receipt.remainsId!==clean(options?.remainsId))throw Error('采集编号不能替换原人物或遗骸');
      return {state: guard.state, receipt: guard.receipt, idempotent: true};
    }
    const state = guard.state;
    const remains = state.战利品.遗骸列表[clean(options?.remainsId)];
    requireFieldRemains(state,remains);
    if (!remains || remains.type !== 'beast-remains' || remains.harvested) throw new Error('没有可采集的魂兽遗骸');
    const profile = state.魂兽档案.列表[remains.profileId];
    const person = sceneActionActor(state,actorId),playerId=person.id;
    controls.assertAction(state,actorId,'requirements',{requirements:['gesture']});
    assertRemainsPosition(state,remains,actorId);
    if (!profile || person.locationId !== remains.locationId) throw new Error('角色不在遗骸所在地点');
    const inventory = state.容器.列表[person.inventoryContainerId];
    const efficiency = clamp(remains.integrity, 0, 1);
    const compilation=profile.扩展?.能力账本;
    if(!compilation)throw new Error('魂兽缺少实际能力账本，无法结算材料');
    effects.validateBeastCompilation(profile,compilation);
    const monsterValue=foundation.BEAST_VALUE.validateLineage(profile.血脉).value+foundation.BEAST_VALUE.growthQuote(profile.年限).chassis+compilation.budget.spent;
    const harvestBudget=Math.floor(monsterValue*.60*efficiency);
    const quality=remains.integrity>=.85?'优良':remains.integrity>=.55?'普通':'受损';
    const qualityMultiplier=quality==='优良'?1.35:quality==='受损'?.65:1;
    const profiles=beastMaterialProfiles(profile,profile.id).map(entry=>({...entry,key:entry.id,unitValue:Math.max(1,Math.floor(entry.structureCost*10*qualityMultiplier))}));
    const allocation=allocateWholeUnitBudget(harvestBudget,profiles,{seed:`${remains.id}:harvest`});
    const materials=allocation.allocations.map(row=>{
      const stack=addPermanentMaterialStack(state,row.entry,quality,row.quantity,{type:'beast-harvest',actorId,remainsId:remains.id,profileId:profile.id},actorId);
      return {fingerprint:stack.fingerprint,name:stack.displayName,quantity:row.quantity,quality,value:row.value};
    });
    remains.harvested = true;
    remains.harvestedBy = playerId;
    remains.harvestReceiptId = transactionId;
    return commit(state, transactionId, '采集魂兽', {type:'beast-harvested',actorId,remainsId:remains.id,profileId:profile.id,efficiency,monsterValue,harvestBudget,harvestedValue:allocation.spent,unconvertedRemainder:allocation.remainder,itemIds:[],materials,soulBoneItemId:remains.soulBoneItemId,summary:`完成${profile.名称}遗骸采集，获得${materials.length}类材料${remains.soulBoneItemId?'，并发现魂骨':''}`});
  }

  function lootItem(rawState, options, transactionId) {
    const guard = transactionStart(rawState, transactionId, '拾取物品');
    if (guard.duplicate) return {state: guard.state, receipt: guard.receipt, idempotent: true};
    const state = guard.state;
    const remains = state.战利品.遗骸列表[clean(options?.remainsId)];
    requireFieldRemains(state,remains);
    const item = state.物品.实例[clean(options?.itemId)];
    const person = sceneActionActor(state,options.actorId),playerId=person.id;
    assertRemainsPosition(state,remains,playerId);
    if (!remains || !item || item.containerId !== remains.containerId || person.locationId !== remains.locationId) throw new Error('物品不在当前可拾取遗骸中');
    if(options.quantity!==undefined&&(!Number.isSafeInteger(options.quantity)||options.quantity<1||options.quantity>item.quantity))throw new Error('拾取数量超出实际物品');
    const moved = transferItem(state, item.id, person.inventoryContainerId, options?.quantity ?? item.quantity);
    moved.stolen = Boolean(moved.legalOwnerEntityId && moved.legalOwnerEntityId !== playerId);
    const materialDeliveries=creation.collectMaterialParcel(state,moved,playerId,transactionId);
    return commit(state, transactionId, '拾取物品', {type: 'item-looted', actorId:person.id, remainsId: remains.id, itemId: moved.id, quantity: moved.quantity, stolen: moved.stolen,...(materialDeliveries?{materialDeliveries}:{}), summary: `${person.name}从遗骸中取得${moved.name}${moved.stolen ? '，物品被标记为来源不明' : ''}`});
  }

  function lootCoins(rawState, options, transactionId) {
    const guard = transactionStart(rawState, transactionId, '拾取钱币');
    if (guard.duplicate) return {state: guard.state, receipt: guard.receipt, idempotent: true};
    const state = guard.state;
    const remains = state.战利品.遗骸列表[clean(options?.remainsId)];
    requireFieldRemains(state,remains);
    const person = sceneActionActor(state,options.actorId),playerId=person.id;
    assertRemainsPosition(state,remains,playerId);
    const amount = integer(remains?.coinGold ?? 0, 0);
    if (!remains || !person || person.locationId !== remains.locationId || amount <= 0) throw new Error('当前没有可拾取的钱币');
    const wallet=state.钱包.列表[person.walletId];if(!wallet||!Number.isSafeInteger(wallet.gold+amount))throw new Error('拾取钱币的实际钱包无效');
    wallet.gold += amount;
    remains.coinGold = 0;
    const stolen = Boolean(remains.legalOwnerEntityId && remains.legalOwnerEntityId !== playerId);
    return commit(state, transactionId, '拾取钱币', {type: 'coins-looted', actorId:person.id, remainsId: remains.id, amountGold: amount, currencyText: formatCurrency(amount), stolen, summary: `${person.name}从遗骸中取得${formatCurrency(amount)}${stolen ? '，钱币来源被记录' : ''}`});
  }

  function fuseSoulBone(rawState, options, transactionId) {
    const guard = transactionStart(rawState, transactionId, '融合魂骨');
    if (guard.duplicate) return {state: guard.state, receipt: guard.receipt, idempotent: true};
    const state = guard.state;
    const entityId = clean(options?.entityId, state.角色.主控单位ID);
    assertPreparationAvailable(state,entityId);
    const item = state.物品.实例[clean(options?.itemId)];
    const config = state.装备.配置[entityId];
    if (!item || item.type !== '魂骨' || item.ownerEntityId !== entityId || !config) throw new Error('角色不拥有可融合魂骨');
    if (!isCarriedItem(state,item,entityId)) throw new Error('请先将这块魂骨领入行囊');
    if (item.payload?.expeditionTemporary) throw new Error('远征临时魂骨必须先安全撤离，写入永久背包后才能融合');
    const slot = clean(item.payload?.slot);
    if (!SOUL_BONE_SLOTS.includes(slot)) throw new Error('魂骨槽位非法');
    if (config.soulBoneSlots[slot]) throw new Error(`${slot}已经融合魂骨`);
    const payloadValidation = validateSoulBonePayload(item.payload);
    if (!payloadValidation.pass) throw new Error(`魂骨价值或技能不合法：${payloadValidation.errors.join('；')}`);
    const previewSkills = itemGrantedSkills(state, entityId, item, 'soul-bone');
    if (previewSkills.length !== soulBoneSkillCount(item.payload.years)) throw new Error('魂骨可注册技能数量不符合年限规则');
    for (const [index, previewSkill] of previewSkills.entries()) {
      const allocatedBudget = item.payload.activeSkills[index]?.value?.allocatedBudget;
      const graphValidation = effects.validateGraph(previewSkill.effectGraph, {ageTier: previewSkill.ageTier, mechanismCap: previewSkill.mechanismCap, budget: allocatedBudget,costContract:previewSkill});
      if (!graphValidation.pass) throw new Error(`魂骨技能${previewSkill.name}不合法：${graphValidation.errors.join('；')}`);
    }
    config.soulBoneSlots[slot] = item.id;
    item.boundToEntityId = entityId;
    item.扩展.integrated = true;
    refreshUnitEquipment(state, entityId);
    syncItemGrantedActions(state);
    return commit(state, transactionId, '融合魂骨', {
      type: 'soul-bone-fused', entityId, itemId: item.id, slot, irreversible: true,
      budget: item.payload?.budget ?? 0, valueLedger: clone(item.payload?.valueLedger ?? {}), modifiers: clone(item.payload?.modifiers ?? {}), passiveCombat: clone(item.payload?.passiveCombat ?? {}),
      activeSkills: clone(item.payload?.activeSkills ?? []), skillIds: clone(item.扩展.grantedSkillIds ?? []), immutableHash: item.payload?.immutableHash ?? '',
      summary: `${state.人物.列表[entityId]?.name ?? entityId}融合了${item.name}，获得${item.payload?.activeSkills?.length ?? 0}个魂骨技能：${item.payload?.activeSkills?.map(skill => skill.name).join('、') || '无'}`
    });
  }

  function supportManufactureContext(state,options) {
    const entityId=clean(options?.entityId,state.角色.主控单位ID);
    assertPreparationAvailable(state,entityId);
    const unit=state.战斗单位.列表[entityId],person=state.人物.列表[entityId],recipeId=clean(options?.recipeId,'vitality-sausage'),recipe=SUPPORT_CONSUMABLE_RECIPES[recipeId];
    if(!unit||!person||!recipe)throw Error('制造者或辅助食品配方不存在');
    controls.assertAction(state,entityId,'manufacture',{requirements:[...new Set([...(recipe.requirements??['soul-power']),'focus'])]});
    const sealed=controls.skillReason(state,entityId,{id:'food-manufacture',sourceKind:'martial-base',sourceMartialSoulId:foundation.activeMartialSoulId(state,entityId)},{requirements:['soul-power','martial-soul'],costs:[]});if(sealed)throw Error(sealed);
    if(!unit.扩展?.辅助能力?.食品制造&&!unit.标签.includes('食物系'))throw Error('该角色没有登记的食品制造能力');
    const day=state.世界.时间.day,prior=unit.扩展?.辅助制造日账?.[recipeId]??{day,count:0,lastCreatedDay:Number.NEGATIVE_INFINITY};
    const todayCount=prior.day===day?Number(prior.count??0):0;
    if(recipe.dailyLimit>0&&todayCount>=recipe.dailyLimit)throw Error(`${recipe.name}已达到每日${recipe.dailyLimit}次制造限制`);
    if(recipe.worldCooldownDays>0&&Number.isFinite(prior.lastCreatedDay)&&day<prior.lastCreatedDay+recipe.worldCooldownDays)throw Error(`${recipe.name}制造冷却至第${prior.lastCreatedDay+recipe.worldCooldownDays}日`);
    const modifierSkillId=clean(options?.modifierSkillId),modifierSkill=modifierSkillId&&list(unit.能力?.技能ID).includes(modifierSkillId)?state.技能.列表[modifierSkillId]:null;
    const modifierNode=modifierSkill?.effectGraph?.nodes?.find(node=>node.effectId==='modifier.next_skill');
    if(modifierSkillId&&!modifierNode)throw Error('指定技能不是制造者拥有的下次技能或制造增幅');
    return {entityId,unit,person,recipeId,recipe,day,prior,todayCount,modifierSkillId,modifierSkill,modifierNode};
  }
  function quoteSupportConsumable(rawState, options) {
    return quoteSupportConsumableInState(normalizeState(rawState), options);
  }

  function quoteSupportConsumableInState(state, options) {
    const quantity = options.quantity ?? 1;
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) throw Error('制作数量须为1至99的整数');
    if (quantity > 1 && options.modifierSkillId) throw Error('附加单次增幅时请每次制作一份');

    const {entityId, unit, recipeId, recipe, day, todayCount, modifierSkill, modifierSkillId} = supportManufactureContext(state, options);
    const modifierQuote = modifierSkill
      ? combat.quoteManufacturingModifier(state, entityId, modifierSkillId, recipe.soulPowerCost, options.modeId)
      : null;
    const soulPowerCost = recipe.soulPowerCost * quantity + (modifierQuote?.soulPowerCost ?? 0);
    const availableSoul = controls.availableSoulPower(state, entityId);
    if (!modifierQuote && availableSoul < recipe.soulPowerCost) throw Error(`魂力不足：需要${recipe.soulPowerCost}`);
    if (quantity > 1 && recipe.dailyLimit > 0 && todayCount + quantity > recipe.dailyLimit) throw Error(recipe.name + '超过今日可制作数量');
    if (quantity > 1 && recipe.worldCooldownDays > 0) throw Error(recipe.name + '每次只能制作一份，之后需要等待恢复');
    if (quantity > 1 && availableSoul < soulPowerCost) throw Error(`魂力不足：需要${soulPowerCost}`);

    const outputScale = Number(modifierQuote?.params?.成品效果倍率 ?? 100) / 100;
    return {
      type: 'create-support-consumable', available: true, entityId, recipeId, name: recipe.name,
      soulPowerCost, estimatedRemainingSoulPower: Math.max(0, unit.资源.魂力.当前 - soulPowerCost),
      outputScale, expiresAtDay: day + recipe.shelfLifeDays,
      production: {
        templateId: recipe.templateId, quantity,
        activeSkill: {...clone(recipe.activeSkill), outputScale, soulPowerCost: 0, cooldownTurns: 0, durabilityCost: 0, ageTier: '十万年', mechanismCap: '规则'},
      },
      modifierQuote, ...(quantity > 1 ? {quantity} : {}),
    };
  }
  function createSupportConsumable(rawState,options,transactionId){
    const quantity=options.quantity??1;
    if(!Number.isSafeInteger(quantity)||quantity<1||quantity>99)throw Error('制作数量须为1至99的整数');
    if(quantity===1)return createSupportConsumableOne(rawState,options,transactionId);
    const guard=transactionStart(rawState,transactionId,'制造辅助食品');if(guard.duplicate)return {state:guard.state,receipt:guard.receipt,idempotent:true};
    quoteSupportConsumableInState(guard.state,options);
    let state=guard.state;const results=[];
    for(let i=0;i<quantity;i++){const made=createSupportConsumableOne(state,{...options,quantity:1},`${transactionId}:food:${i}`,false);state=made.state;results.push(made.receipt);}
    const first=results[0],total=results.reduce((n,r)=>n+r.soulPowerCost,0);
    return commit(state,transactionId,'制造辅助食品',{...first,quantity,itemIds:results.map(r=>r.itemId),soulPowerCost:total,results,summary:`消耗${total}点魂力，制造${quantity}份辅助食品`});
  }
  function createSupportConsumableOne(rawState,options,transactionId,record=true) {
    const guard=record?transactionStart(rawState,transactionId,'制造辅助食品'):{state:rawState};
    if(guard.duplicate)return {state:guard.state,receipt:guard.receipt,idempotent:true};
    let state=guard.state;
    const c=supportManufactureContext(state,options),{entityId,person,recipeId,recipe,day,todayCount,modifierSkillId,modifierSkill,modifierNode}=c;
    let unit=c.unit;unit.扩展??={};unit.扩展.辅助制造日账??={};
    let modifierActivation = null;
    if (modifierSkill) {
      const activated = combat.activateManufacturingModifier(state,entityId,modifierSkillId,recipe.soulPowerCost,transactionId,options?.modeId);
      state = activated.state;unit = state.战斗单位.列表[entityId];modifierActivation = activated.activation;
    }
    const modifierSoulCost = modifierActivation?.soulPowerCost ?? 0;
    const available = controls.availableSoulPower(state,entityId);
    const totalSoulCost = recipe.soulPowerCost + modifierSoulCost;
    if(!modifierActivation){
      if (available < recipe.soulPowerCost) throw new Error(`魂力不足：需要${totalSoulCost}`);
      unit.资源.魂力.当前 -= recipe.soulPowerCost;
    }
    unit.扩展.辅助制造日账[recipeId] = {day,count:todayCount + 1,lastCreatedDay:day,dailyLimit:recipe.dailyLimit ?? 0,worldCooldownDays:recipe.worldCooldownDays ?? 0};
    const craftScale = Number(modifierActivation?.params?.成品效果倍率 ?? 100) / 100;
    const item = createItem(state, recipe.templateId, entityId, person.inventoryContainerId, {
      quantity: 1,
      name: recipe.name,
      provenance: {type: 'support-food-created', manufacturerId: entityId, recipeId, transactionId},
      payload: {
        recipeId, manufacturerId: entityId, createdDay: state.世界.时间.day,
        expiresAtDay: state.世界.时间.day + recipe.shelfLifeDays,
        activeSkill: {...clone(recipe.activeSkill), outputScale:craftScale, soulPowerCost: 0, cooldownTurns: 0, durabilityCost: 0, ageTier: '十万年', mechanismCap: '规则'},
        craftingModifier: modifierNode ? {skillId:modifierSkill.id,params:clone(modifierNode.params),outputScale:craftScale} : null
      },
      forceUnique: true
    });
    syncItemGrantedActions(state);
    if(modifierActivation?.payment)modifierActivation.sacrificeDeath=abilities.finish(state,modifierActivation.payment);
    const receipt={
      type: 'support-consumable-created', entityId, itemId: item.id, recipeId, soulPowerCost: totalSoulCost, modifierSkillId:modifierSkill?.id ?? '', outputScale:craftScale,
      ...(modifierActivation ? {modifierActivation} : {}),
      expiresAtDay: item.payload.expiresAtDay, effectAtoms: item.payload.activeSkill.effectSpecs.map(([effectId]) => effectId),
      summary: `${unit.名称}消耗${totalSoulCost}点魂力制造了${item.name}`
    };
    return record?commit(state,transactionId,'制造辅助食品',receipt):{state,receipt:{...receipt,id:transactionId,transactionType:'制造辅助食品'}};
  }

  function safePointRecoveryContext(state,entityId,operatorId=state.角色.主控单位ID){
    const binding=globalThis.SoulResidentRealms.binding(state,entityId),ownerId=binding?.realm.ownerId,contained=!!ownerId&&globalThis.SoulInteriorSpaces.membership(state,entityId)?.space.id===binding.realm.id;
    if(contained&&ownerId!==state.角色.主控单位ID)throw Error('只能安排自己画境内的人物休整');
    if(entityId!==operatorId&&!contained&&!partyRoster(state,operatorId).some(p=>p.personId===entityId&&p.membership!=='projection'))throw Error('只能安排自己的同伴或画境内人物休整');
    if(contained){sceneActionActor(state,ownerId,true);globalThis.SoulResidentRealms.assertManagement(state,binding.realm.id,ownerId);if(globalThis.SoulConsciousness.carrierForPerson(state,entityId))throw Error('请先收回投影，再让原体休整');}
    const actor=contained?state.人物.列表[entityId]:sceneActionActor(state,entityId);
    const context=actions.resolve(state,{actorId:contained?ownerId:entityId,battleId:null}),locationId=contained?state.人物.列表[ownerId].locationId:actor.locationId;
    if(!contained&&context.position.kind==='location'&&context.sceneId)throw Error('请先离开房间，回到公共通道再休整');
    if(!contained&&context.position.kind!=='location')throw Error('请先离开战斗或探索，回到城镇或副本入口休整');
    if(!contained&&!SAFE_RECOVERY_LOCATION_IDS.includes(locationId))throw Error('人物的实际位置不在休整点，请在主要城镇或副本入口休整');
    const unit=state.战斗单位.列表[entityId];if(!unit||(unit.存活状态!=='存活'&&(!contained||unit.存活状态!=='昏迷'))||people.isDead(state,entityId))throw Error('此人当前无法休整恢复');
    return {actor,unit,locationId,placeName:contained?globalThis.SoulInteriorSpaces.get(state,binding.realm.id).name:LOCATION_TEMPLATES[locationId]?.name??locationId};
  }
  function partyRecoveryPreview(state){
    const leaderId=state.角色.主控单位ID,members=[{personId:leaderId,name:state.人物.列表[leaderId]?.name,membership:'self',present:true},...partyRoster(state,leaderId)];
    const leaderBlock=worldActionBlockReason(state,{actorId:leaderId});
    return members.map(member=>{const id=member.personId,unit=state.战斗单位.列表[member.unitId??id],growth=state.成长.列表[id];let reason='';
      try{if(member.membership==='projection')throw Error('投影生命可用治疗恢复；原体休整请先收回投影');if(leaderBlock)throw Error(leaderBlock);if(!member.present)throw Error('不在当前地点，无法一同休整');safePointRecoveryContext(state,id);}catch(error){reason=error.message;}
      return {...member,sharedSoulPower:!!unit&&globalThis.SoulCombatDeployments.soulPowerOwner(state,unit.id)!==unit.id,level:growth?.魂力等级??null,rings:Object.values(state.武魂.列表).filter(s=>s.持有者单位ID===id).map(s=>({name:s.名称,count:s.魂环ID列表.length})),
        experience:member.present&&growth?{current:growth.当前经验,maximum:growth.当前等级需求}:null,health:member.present&&unit?clone(unit.资源.生命):null,soulPower:member.present&&unit?clone(globalThis.SoulCombatDeployments.soulPowerResource(state,unit.id)):null,canRecover:!reason,recoveryReason:reason};
    });
  }
  function recoverParty(rawState,options={},transactionId='recover-party'){
    if(Object.keys(options).some(k=>k!=='personId'))throw Error('队伍休整只接受所选队员');
    const guard=transactionStart(rawState,transactionId,'队伍休整');if(guard.duplicate)return {state:guard.state,receipt:guard.receipt,idempotent:true};
    const choices=partyRecoveryPreview(guard.state),selected=options.personId?choices.filter(p=>p.personId===options.personId):choices;
    if(!selected.length)throw Error('此人不是当前队员');if(!selected.some(p=>p.canRecover))throw Error(selected.map(p=>p.recoveryReason).join('；'));
    let state=guard.state;const recoveries=[],skipped=[];
    for(const p of selected){if(!p.canRecover){skipped.push({personId:p.personId,reason:p.recoveryReason});continue;}
      const result=recoverAtSafePoint(state,{entityId:p.personId},transactionId+':'+p.personId,state.角色.主控单位ID);state=result.state;recoveries.push(result.receipt);
    }
    return commit(state,transactionId,'队伍休整',{type:'party-recovered',actorId:state.角色.主控单位ID,recoveries,skipped,summary:recoveries.map(r=>r.summary).join('；')});
  }

  function recoverAtSafePoint(rawState, options, transactionId, operatorId) {
    const guard = transactionStart(rawState, transactionId, '安全点休整');
    if (guard.duplicate) return {state: guard.state, receipt: guard.receipt, idempotent: true};
    const state = guard.state;
    const entityId=clean(options?.targetId??options?.entityId,state.角色.主控单位ID);
    // Native NPC journeys rest their own actor. Player intents always supply the player as operator.
    const operator=operatorId??(options?.targetId?state.角色.主控单位ID:entityId);
    const {actor,unit,locationId,placeName}=safePointRecoveryContext(state,entityId,operator);
    const before = {生命:unit.资源.生命.当前,临时生命:unit.资源.生命.临时,魂力:unit.资源.魂力.当前};
    unit.资源.生命.当前 = unit.资源.生命.最大;
    foundation.clearTemporaryHealth(unit);
    unit.资源.魂力.当前 = unit.资源.魂力.最大;
    unit.存活状态 = '存活';
    let clearedStatuses = 0;
    for (const [statusId,status] of Object.entries(state.状态实例.列表 ?? {})) {
      if (status.目标单位ID !== entityId || !['status.burn','status.poison','status.armor_break','status.buff','status.regeneration','status.slow','status.haste','status.blind'].includes(status.模板ID)||status.持续?.模式==='世界分钟'||status.扩展?.持续来源合同?.sourceKind==='restraint'||state.扩展?.abilityMaintenance?.[status.来源?.结算单ID]) continue;
      combat.removeStatus(state,statusId,'rest-recovered');
      unit.状态ID列表 = removeFrom(unit.状态ID列表,statusId);
      clearedStatuses += 1;
    }
    return commit(state,transactionId,'安全点休整',{type:'safe-point-recovered',entityId,locationId,before,after:{生命:unit.资源.生命.当前,临时生命:unit.资源.生命.临时,魂力:unit.资源.魂力.当前},clearedStatuses,summary:`${state.人物.列表[entityId]?.name ?? entityId}在${placeName}免费恢复至满状态`});
  }

  function custodyGuard(state,record){
    return logistics.guardedBy(state,record).sort((a,b)=>(combat.attributeModifier(state,state.战斗单位.列表[b],'感知')+state.战斗单位.列表[b].派生.熟练加值)-(combat.attributeModifier(state,state.战斗单位.列表[a],'感知')+state.战斗单位.列表[a].派生.熟练加值))[0]??'';
  }
  function custodyEscapeCheck(state,transactionId,choice){
    const rng=combat.makeRng(`${state.世界.seed}:custody-escape:${transactionId}`),die=choice.dc?combat.rollDice(rng,1,20,'脱困检定').total:null;
    return {attribute:choice.attribute,difficulty:choice.dc,modifier:choice.modifier,die,total:die===null?null:die+choice.modifier,passed:die===null||die===20||die!==1&&die+choice.modifier>=choice.dc};
  }
  function lockedRoomDoor(state,intent){
    const actor=sceneActionActor(state,intent.actorId);
    controls.assertAction(state,actor.id,'requirements',{requirements:['gesture']});
    const room=logistics.currentRoom(state,actor.id);
    if(!room||room.facility.id!==intent.facilityId||room.cell.id!==intent.cellId)throw Error('只能破坏本人当前房间的房门');
    const record={personId:actor.id,arrangement:{kind:'facility',facilityId:room.facility.id,cellId:room.cell.id}};
    const barrier=logistics.barrier(state,record);
    if(!barrier)throw Error('当前房门已经可以通行');
    const unit=state.战斗单位.列表[actor.id];
    return {record,actorId:actor.id,attribute:'力量',dc:barrier.dc,modifier:combat.attributeModifier(state,unit,'力量')+unit.派生.熟练加值};
  }
  function breakCurrentRoomDoor(rawState,intent,id){
    const guard=transactionStart(rawState,id,'破坏房门');
    if(guard.duplicate)return {state:guard.state,receipt:guard.receipt,idempotent:true};
    const state=guard.state,choice=lockedRoomDoor(state,intent),check=custodyEscapeCheck(state,id,choice);
    const timing=advanceActionTime(state,choice.actorId,10);
    const room=logistics.currentRoom(state,choice.actorId);
    const interrupted=!!timing.interruption||room?.facility.id!==intent.facilityId||room.cell.id!==intent.cellId||
      !!worldActionBlockReason(state,{actorId:choice.actorId})||
      !!controls.actionReason(state,choice.actorId,'requirements',{requirements:['gesture']});
    const broken=!interrupted&&check.passed&&logistics.breakDoor(state,choice.record,id);
    const summary=broken?'房门已破坏，可以返回公共通道。':interrupted?'破门行动被打断。':!logistics.barrier(state,choice.record)?'房门已经可以通行。':'这次未能破坏房门。';
    return commit(state,id,'破坏房门',{type:'custody-door-break',actorId:choice.actorId,facilityId:intent.facilityId,cellId:intent.cellId,check,broken,...timing,summary});
  }
  function escapeOptions(state,actorId=state.角色.主控单位ID){
    const record=custody.confined(state,actorId);if(!record)return [];
    const actor=state.战斗单位.列表[actorId],guardId=custodyGuard(state,record),choices=controls.breakable(state,actorId).map(s=>({kind:'break',...combat.breakFreeProfile(state,actorId,s.id),label:`挣脱${s.模板ID==='status.limb_bind'?(s.快照.参数.部位+'拘束'):'束缚'}`}));
    const barrier=logistics.barrier(state,record);if(barrier&&!controls.actionReason(state,actorId,'requirements',{requirements:['gesture']}))choices.push({kind:'door',statusId:`cell-door:${barrier.facilityId}:${barrier.cellId}`,attribute:'力量',traitBonus:0,modifier:combat.attributeModifier(state,actor,'力量')+actor.派生.熟练加值,dc:barrier.dc,barrier,label:'破坏牢门'});
    if(!barrier&&!controls.actionReason(state,actorId,'move'))choices.push({kind:'evade',statusId:'',attribute:'身法',traitBonus:0,modifier:combat.attributeModifier(state,actor,'身法')+actor.派生.熟练加值,dc:guardId?10+combat.attributeModifier(state,state.战斗单位.列表[guardId],'感知')+state.战斗单位.列表[guardId].派生.熟练加值:0,label:guardId?'避开看守':'离开看管位置'});
    return choices;
  }
  function escapeCaptivity(rawState,options,transactionId){
    const guard=transactionStart(rawState,transactionId,'尝试脱困');if(guard.duplicate)return {state:guard.state,receipt:guard.receipt,idempotent:true};
    const state=guard.state,actorId=clean(options.actorId,state.角色.主控单位ID),record=custody.confined(state,actorId);
    actions.resolve(state,{actorId,battleId:null});
    if(!record)throw Error('当前没有可脱离的看管');
    if(controls.active(state,actorId).some(s=>['status.sleep','status.stun'].includes(s.模板ID)))throw Error('当前无法清醒尝试脱困');
    const choices=escapeOptions(state,actorId),choice=choices.find(c=>Object.hasOwn(options,'statusId')?c.statusId===options.statusId:options.attribute?c.attribute===options.attribute:c.kind==='evade')??(!Object.hasOwn(options,'statusId')&&!options.attribute?choices[0]:null);
    if(!choice)throw Error('这不是当前可用的脱困方式');
    const selectedStatus=choice.kind==='break'?clone(state.状态实例.列表[choice.statusId]):null;let removedStatus=null;
    const authority=custody.authorityRef(record),startedOrder=people.nextEventOrder(state),guardId=custodyGuard(state,record),guardArrangement=clone(record.arrangement),before=clone(state.世界.时间);
    const check=custodyEscapeCheck(state,transactionId,choice);
    const timing=advanceActionTime(state,actorId,10);let result='attempt-failed',escaped=false;
    if(timing.interruption||actions.battleOf(state,actorId)||controls.active(state,actorId).some(s=>['status.sleep','status.stun'].includes(s.模板ID)))result='interrupted';
    else if(!custody.sameAuthority(custody.currentAuthority(state,actorId),authority))result='source-ended';
    else if(check.passed&&choice.kind==='break'){
      const status=state.状态实例.列表[choice.statusId];if(status){removedStatus=clone(combat.removeStatusLayer(state,status,'broken-free'));result=removedStatus?.removedLayer?'restraint-layer-broken':'restraint-broken';}else result='source-ended';
    }else if(check.passed&&choice.kind==='door'){if(logistics.barrier(state,record)?.cellId===choice.barrier.cellId&&logistics.breakDoor(state,record,`${transactionId}:door`))result='door-broken';else result='source-ended';
    }else if(check.passed&&choice.kind==='evade'){
      if(logistics.barrier(state,record)||controls.actionReason(state,actorId,'move')||!guardId&&custodyGuard(state,record))result='interrupted';
      else{if(record.arrangement?.kind==='facility')movePeopleTo(state,[actorId],state.人物.列表[actorId].locationId);record.status='escaped';record.endedAt=people.now(state);custody.stamp(record);custody.event(state,'escaped',actorId,actorId,transactionId,{custodyId:record.id,authority});escaped=true;result='escaped';}
    }
    logistics.advanceAt(state,people.now(state),logisticsHooks());
    const labels={'door-broken':'牢房门已被实际破坏，看管和身体限制仍存在','attempt-failed':'本次未能脱困','interrupted':'脱困行动被实际状态变化打断','source-ended':'原看管或束缚来源已经变化','restraint-layer-broken':'已解除一层，所选拘束仍存在','restraint-broken':'已挣脱所选束缚，其他限制与看管仍按实际状态保留','escaped':'已脱离本次看管，仍在实际地点，其他来源的封印与装置保留'};
    const receipt={type:'captivity-escape',sourceId:transactionId,actorId,captivityId:record.id,guarded:!!guardId,guardId,statusId:choice.statusId,before,after:clone(state.世界.时间),check,result,escaped,...(timing.interruption?{interruption:timing.interruption}:{}),summary:`${labels[result]}；实际用时${timing.minutes}分钟。`};
    custody.event(state,'escape-attempt',actorId,actorId,transactionId,{custodyId:record.id,authority,startedOrder,choice:clone(choice),selectedStatus,removedStatus,guardArrangement,receipt});
    return commit(state,transactionId,'尝试脱困',receipt);
  }
  function validateCustodyEscapes(state,errors){
    const db=custody.table(state),records=[...Object.values(db.byPerson),...db.history],seen=new Set();
    for(const e of db.events)if(e.type==='escape-attempt')try{
      const r=e.receipt,c=r?.check,q=e.choice,capture=records.find(c=>c.id===e.custodyId),before=npcMinute(r.before),after=npcMinute(r.after);
      if(e.authority?.custodyId!==e.custodyId||e.authority?.personId!==e.targetId||!custody.authorityAt(state,e.authority,e.authority?.custodianId,before,e.startedOrder)||e.startedOrder>=e.order)throw Error('脱困开始时原看管权限');
      if(!r||!c||!q||!capture||e.actorId!==capture.personId||e.targetId!==e.actorId||r.actorId!==e.actorId||r.sourceId!==e.sourceId||r.captivityId!==capture.id||seen.has(r.sourceId)||r.type!=='captivity-escape'||!Number.isSafeInteger(before)||before<capture.since||after!==e.at||after>people.now(state)||after-before<0||after-before>10||!r.interruption&&after-before!==10||r.guarded!==!!r.guardId||r.guardId&&!state.人物.列表[r.guardId]||r.statusId!==q.statusId||c.attribute!==q.attribute||c.difficulty!==q.dc||c.modifier!==q.modifier||!Number.isFinite(c.modifier)||!Number.isSafeInteger(c.difficulty)||c.difficulty<0)throw Error('来源或时间');
      const die=c.difficulty?combat.rollDice(combat.makeRng(`${state.世界.seed}:custody-escape:${r.sourceId}`),1,20,'脱困检定').total:null;
      if(c.die!==die||c.total!==(die===null?null:die+c.modifier)||c.passed!==(die===null||die===20||die!==1&&die+c.modifier>=c.difficulty)||q.kind==='break'&&!q.statusId||q.kind==='evade'&&q.statusId!==''||!['break','evade','door'].includes(q.kind)||!r.guarded&&q.kind==='evade'&&c.difficulty!==0)throw Error('检定');
      if(!['attempt-failed','interrupted','source-ended','restraint-broken','restraint-layer-broken','door-broken','escaped'].includes(r.result)||r.escaped!==(r.result==='escaped')||['escaped','restraint-broken','restraint-layer-broken','door-broken'].includes(r.result)&&!c.passed||r.result==='escaped'&&q.kind!=='evade'||r.result==='restraint-broken'&&q.kind!=='break'||r.result==='door-broken'&&q.kind!=='door'||r.result==='attempt-failed'&&c.passed)throw Error('结果');
      if(q.kind==='break'&&(!combat.validateBreakFreeSource(e.selectedStatus,r.actorId,before)||e.selectedStatus.id!==r.statusId||e.selectedStatus.快照.施加者DC+Number(e.selectedStatus.快照?.参数?.挣脱难度加值??0)!==c.difficulty)||q.kind!=='break'&&e.selectedStatus!==null)throw Error('实际束缚来源');
      if(r.result==='restraint-layer-broken'&&(!e.removedStatus?.removedLayer||e.removedStatus.层数!==e.selectedStatus.层数-1||!combat.validateBreakFreeSource(e.removedStatus,r.actorId,after)))throw Error('实际解层记录');
      if(r.result==='restraint-broken'?(!combat.validateBreakFreeSource(e.removedStatus,r.actorId,after)||e.removedStatus.id!==r.statusId||e.removedStatus.扩展.来源合同指纹!==e.selectedStatus.扩展.来源合同指纹):r.result!=='restraint-layer-broken'&&e.removedStatus!==null)throw Error('实际解除来源');
      if(r.guardId&&r.guardId!==e.authority.custodianId){const a=e.guardArrangement;if(a?.kind==='facility'){if(!(db.duties??[]).some(d=>d.personId===r.guardId&&d.facilityId===a.facilityId&&d.startedAt<=before&&(d.endedAt===undefined||d.endedAt>=before)))throw Error('实际值守来源');}else if(a?.kind==='escort'){if(!(db.escorts??[]).some(v=>v.id===a.escortId&&v.guardIds.includes(r.guardId)&&v.createdAt<=before))throw Error('实际护送来源');}else throw Error('看守来源');}
      if(q.kind==='door'){const f=(db.facilities??[]).find(f=>f.id===q.barrier?.facilityId),t=logistics.FACILITIES[f?.templateId],changed=db.events.find(v=>v.type==='logistics-facilities'&&v.sourceId===`${r.sourceId}:door`&&v.entityId===f?.id);if(!t||q.dc!==t.doorDC||q.attribute!=='力量'||q.statusId!==`cell-door:${f.id}:${q.barrier.cellId}`||r.result==='door-broken'&&(!changed||changed.at!==after||changed.record.cells.find(c=>c.id===q.barrier.cellId)?.condition!==0))throw Error('牢门实际破坏');}
      const terminal=db.events.find(v=>v.type==='escaped'&&v.sourceId===e.sourceId&&v.custodyId===capture.id);
      if(r.escaped!==!!terminal||terminal&&(terminal.at!==after||!custody.sameAuthority(terminal.authority,e.authority)))throw Error('逃离事件');
      if(!['interrupted','source-ended'].includes(r.result)&&!custody.authorityAt(state,e.authority,e.authority.custodianId,after,terminal?.order??e.order))throw Error('脱困结束时原看管权限');
      if(r.interruption){const d=state.人物.列表[r.actorId]?.life?.death;if(r.result!=='interrupted'||r.interruption.kind!=='life-exhausted'||r.interruption.personId!==r.actorId||r.interruption.deathId!==d?.id||r.interruption.at!==d?.at||d.at!==after)throw Error('寿终');}
      seen.add(r.sourceId);
    }catch(error){errors.push(`脱困记录${e.sourceId}无效：${error.message}`);}
    for(const e of db.events)if(e.type==='escaped'&&!db.events.some(a=>a.type==='escape-attempt'&&a.sourceId===e.sourceId&&a.receipt?.escaped))errors.push('逃离缺少实际脱困结算');
  }
  function personDuelContext(state,intent){
    const actor=sceneActionActor(state,intent.actorId),targetId=clean(intent.targetId),target=state.人物.列表[targetId];
    if(!target||targetId===actor.id)throw Error('死斗需要另一名真实人物');
    actions.resolve(state,{actorId:actor.id,battleId:null,targetIds:[targetId],harmfulTargetIds:[targetId]});
    people.assertAlive(state,targetId);
    if(custody.confined(state,targetId))throw Error('目标正在被看管，应先处理实际看管安排');
    const unit=state.战斗单位.列表[targetId];if(unit&&(unit.存活状态!=='存活'||unit.资源.生命.当前<=0))throw Error('目标已失能，不能重复发起死斗');
    return {actorId:actor.id,targetId};
  }
  function searchCaptiveContext(state,intent){
    const actorId=clean(intent.actorId,state.角色.主控单位ID),targetId=clean(intent.targetId),record=custody.active(state,targetId);
    actions.resolve(state,{actorId,battleId:null,targetIds:[targetId],requirements:['gesture']});
    if(!record||record.custodianId!==actorId)throw Error('只有实际看管者能够搜取所看管人物的物品');
    people.assertAlive(state,targetId);
    const target=state.人物.列表[targetId],unit=state.战斗单位.列表[targetId],limits=controls.restrictions(state,targetId);
    if(unit.存活状态==='存活'&&unit.资源.生命.当前>0&&!limits.blocked.gesture?.length&&!limits.blocked.movement?.length)throw Error('目标已经能够抵抗，不能直接搜取');
    const quantity=intent.quantity;
    if(!Number.isSafeInteger(quantity)||quantity<1)throw Error('搜取数量须为正整数');
    if(intent.itemId){
      const item=state.物品.实例[intent.itemId];
      if(!item||item.ownerEntityId!==targetId||item.containerId!==target.inventoryContainerId||item.quantity<quantity||item.boundToEntityId||item.扩展?.integrated||item.attachment)throw Error('只能搜取目标实际随身且未融合绑定的物品');
      return {actorId,targetId,quantity,item};
    }
    if(state.钱包.列表[target.walletId].gold<quantity)throw Error('目标没有这么多钱币');
    return {actorId,targetId,quantity,item:null};
  }
  function settleCustodyIntent(rawState,intent,transactionId){
    if(poison.INTENTS.includes(intent.type)){if(actions.battleOf(rawState,intent.actorId??rawState.角色.主控单位ID))throw Error('战斗中的药剂操作须消耗本人的战斗主行动');const guard=transactionStart(rawState,transactionId,'药剂施用'),request={...intent,actorId:clean(intent.actorId,rawState.角色.主控单位ID)},requestHash=abilities.hash(request);if(guard.duplicate){if(guard.receipt.requestHash!==requestHash)throw Error('药剂事务编号不能替换请求');return {state:guard.state,receipt:guard.receipt,idempotent:true};}const food=selfFoodUse(guard.state,request);if(food){const used=performFieldUse(guard.state,{type:'use-field-ability',actorId:food.actorId,skillId:food.skillId,targetId:food.actorId},transactionId),c=used.receipt,receipt={id:transactionId,type:'medicine-operation',operation:request.type,actorId:food.actorId,targets:c.targets,payment:c.payment,ingestion:c.ingestion,...(c.exposure?{exposure:c.exposure}:{}),requestHash};return commit(used.state,transactionId,'药剂施用',receipt);}const receipt=poison.execute(guard.state,request,transactionId);return commit(guard.state,transactionId,'药剂施用',{...receipt,requestHash});}
    if(assets.INTENTS.includes(intent.type)){
      const guard=transactionStart(rawState,transactionId,'商业资产交易'),request={...intent,actorId:clean(intent.actorId,rawState.角色.主控单位ID)},requestHash=abilities.hash(request);
      if(guard.duplicate){if(guard.receipt.requestHash!==requestHash)throw Error('商业事务编号不能替换原请求');return {state:guard.state,receipt:guard.receipt,idempotent:true};}
      const result=assets.execute(guard.state,request,transactionId);return commit(guard.state,transactionId,'商业资产交易',{...result.receipt,requestHash});
    }
    if(intent.type==='decide-defeat'){
      const request={...intent,actorId:clean(intent.actorId,rawState.角色.主控单位ID)},prior=custody.replayDefeatDecision(rawState,request,transactionId);
      if(prior)return {state:clone(rawState),receipt:{...prior,id:transactionId,transactionType:'战败与看管处置'},idempotent:true};
      const guard=transactionStart(rawState,transactionId,'战败与看管处置');if(guard.duplicate)throw Error('战败决定编号已被其他事务使用');
      let state=guard.state;const receipt=custody.decideDefeat(state,request,transactionId,{applyDevice:combat.applyCustodyDevice});
      if(receipt.kind==='execute')state=reconcileAftermath(state).state;
      logistics.advanceAt(state,people.now(state),logisticsHooks());
      return commit(state,transactionId,'战败与看管处置',receipt);
    }
    if(sealing.INTENTS.includes(intent.type)){
      const state=normalizeState(clone(rawState)),request={...intent,actorId:clean(intent.actorId,rawState.角色.主控单位ID)},result=sealing.execute(state,request,transactionId);
      if(result.idempotent)return {state,receipt:{...result.receipt,id:transactionId},idempotent:true};
      return commit(state,transactionId,'战败与看管处置',result.receipt);
    }
    if(commerceMessages.INTENTS.includes(intent.type)){
      const state=normalizeState(clone(rawState)),request={...intent,actorId:clean(intent.actorId,rawState.角色.主控单位ID)},result=commerceMessages.execute(state,request,transactionId);
      if(result.idempotent)return {state,receipt:{...result.receipt,id:transactionId},idempotent:true};return commit(state,transactionId,'魂导商业留言',result.receipt);
    }
    if(stock.INTENTS.includes(intent.type)){
      const guard=transactionStart(rawState,transactionId,'商业运输');if(guard.duplicate)return {state:guard.state,receipt:guard.receipt,idempotent:true};
      return commit(guard.state,transactionId,'商业运输',stock.execute(guard.state,{...intent,actorId:clean(intent.actorId,rawState.角色.主控单位ID)},transactionId,stockHooks()).receipt);
    }
    if(publicAuction.INTENTS.includes(intent.type)){
      const state=normalizeState(clone(rawState)),request={...intent,actorId:clean(intent.actorId,rawState.角色.主控单位ID)},result=publicAuction.execute(state,request,transactionId);
      if(result.idempotent)return {state,receipt:{...result.receipt,id:transactionId},idempotent:true};
      return commit(state,transactionId,'战败与看管处置',result.receipt);
    }
    if(auction.INTENTS.includes(intent.type)){
      if(intent.type==='pass-custody-auction')throw Error('旁观不需要提交竞价；人物拍卖使用统一日历');
      const type={'start-custody-auction':'start-asset-auction','bid-custody-auction':'bid-asset-auction','cancel-custody-auction':'cancel-asset-auction'}[intent.type],request={...intent,type,...(intent.type==='start-custody-auction'?{assetKind:'person'}:{})};delete request.durationMinutes;if(request.characterId){request.targetId=request.characterId;delete request.characterId;}
      return settleCustodyIntent(rawState,request,transactionId);
    }
    if(['respond-restraint-permission-request','decide-restraint-permission-request'].includes(intent.type)){const request={...intent,actorId:clean(intent.actorId,rawState.角色.主控单位ID)},prior=custody.replayRequestedPermission(rawState,request,transactionId);if(prior)return {state:clone(rawState),receipt:{...prior,id:transactionId,transactionType:'战败与看管处置'},idempotent:true};}
    if(intent.type==='decide-cooperation-restraint-permission'){const request={...intent,actorId:clean(intent.actorId,rawState.角色.主控单位ID)},prior=preparations.replayPermission(rawState,request,transactionId);if(prior)return {state:clone(rawState),receipt:{...prior,id:transactionId,transactionType:'战败与看管处置'},idempotent:true};}
    if(market.INTENTS.includes(intent.type)){
      const request={...intent,actorId:clean(intent.actorId,rawState.角色.主控单位ID)},prior=market.replay(rawState,request,transactionId);
      if(prior)return {state:clone(rawState),receipt:{...prior,id:transactionId,transactionType:'战败与看管处置'},idempotent:true};
      const guard=transactionStart(rawState,transactionId,'战败与看管处置');if(guard.duplicate)throw Error('交接请求编号已被其他事务使用');
      market.advanceAt(guard.state);const result=market.execute(guard.state,request,transactionId,{logistics:logisticsHooks(),custody:custodyHooks(),cooperation:cooperationHooks(),medical:custodyMedicalHooks()});
      logistics.advanceAt(guard.state,people.now(guard.state),logisticsHooks());
      return commit(guard.state,transactionId,'战败与看管处置',result.receipt);
    }
    const guard=transactionStart(rawState,transactionId,'战败与看管处置');if(guard.duplicate)return {state:guard.state,receipt:guard.receipt,idempotent:true};
    let state=guard.state;const request={...intent,actorId:clean(intent.actorId,state.角色.主控单位ID)};let receipt;
    if(preparations.INTENTS.includes(intent.type)){receipt=preparations.execute(state,request,transactionId,custodyHooks());
    }else if(cooperation.INTENTS.includes(intent.type)){receipt=cooperation.execute(state,request,transactionId,cooperationHooks());
    }else if(rescue.INTENTS.includes(intent.type)){receipt=rescue.execute(state,request,transactionId,logisticsHooks());
    }else if(social.INTENTS.includes(intent.type)){receipt=social.execute(state,request,transactionId,logisticsHooks());
    }else if(logistics.INTENTS.includes(intent.type)){receipt=logistics.execute(state,request,transactionId,logisticsHooks());
    }else if(intent.type==='person-duel'){
      const {actorId,targetId}=personDuelContext(state,request);
      if(state.人物.列表[targetId].tier!=='full')promoteNpcInternal(state,targetId);
      const options={id:`duel:${transactionId}`,battleKind:'lethal',participantIds:[actorId,targetId],participantConfigs:{[actorId]:{sideId:actorId},[targetId]:{sideId:targetId}},seed:`${state.世界.seed}:${transactionId}`,force:true};
      const result=options.participantIds.includes(state.角色.主控单位ID)?combat.startBattle(state,options):combat.startBackgroundBattle(state,options);
      state=result.state;
      if(actorId===state.角色.主控单位ID)recordPlayerAttitude(state,targetId,options.id,'attack');
      receipt={type:'person-duel-started',battleId:options.id,actorId,targetId,battleKind:'lethal',summary:'人物死斗开始；战败后按实际结果选择放过、处决或使用工具捕获。'};
    }else if(intent.type==='request-restraint-permission'){
      receipt=custody.requestPermission(state,request,transactionId,custodyHooks());
    }else if(intent.type==='respond-restraint-permission-request'||intent.type==='decide-restraint-permission-request'){
      receipt=custody.decideRequestedPermission(state,request,transactionId,custodyHooks());
    }else if(['set-restraint-mode','detach-restraint','release-captive','attach-restraint','permit-restraint','request-restraint-permission','respond-restraint-permission-request','revoke-restraint-permission'].includes(intent.type)){
      const hooks=custodyHooks();
      if(intent.type==='release-captive'&&logistics.barrier(state,custody.active(state,request.targetId)??{}))throw Error('须先实际打开牢房门再放行');
      if(intent.type==='attach-restraint')for(const id of [request.actorId,request.targetId])if(state.人物.列表[id]&&!state.战斗单位.列表[id])promoteNpcInternal(state,id);
      receipt=intent.type==='attach-restraint'?custody.attachDevice(state,request,transactionId,hooks):intent.type==='permit-restraint'?custody.permitDevice(state,request,transactionId):intent.type==='revoke-restraint-permission'?custody.revokePermission(state,request,transactionId):intent.type==='set-restraint-mode'?custody.setDeviceMode(state,request,transactionId,hooks):intent.type==='detach-restraint'?custody.detachDevice(state,request,transactionId,hooks):custody.release(state,request,transactionId,hooks);
    }else if(intent.type==='capture-person'){
      receipt=custody.capture(state,request,transactionId,{applyDevice:combat.applyCustodyDevice});
    }else if(intent.type==='search-captive'){
      const q=searchCaptiveContext(state,request),actor=state.人物.列表[q.actorId],target=state.人物.列表[q.targetId];let itemId='';
      const sourceItemId=q.item?.id??'',itemName=q.item?.name??'',walletBefore={actor:state.钱包.列表[actor.walletId].gold,target:state.钱包.列表[target.walletId].gold};
      if(q.item){
        for(const [slot,id] of Object.entries(state.装备.配置[q.targetId]?.slots??{}))if(id===q.item.id)state.装备.配置[q.targetId].slots[slot]='';
        itemId=transferItem(state,q.item.id,actor.inventoryContainerId,q.quantity).id;refreshUnitEquipment(state,q.targetId);
      }else{state.钱包.列表[target.walletId].gold-=q.quantity;state.钱包.列表[actor.walletId].gold+=q.quantity;}
      custody.event(state,'searched',q.actorId,q.targetId,transactionId,{custodyId:custody.active(state,q.targetId).id,authority:custody.currentAuthority(state,q.targetId),itemId,quantity:q.quantity});
      receipt={type:'captive-searched',actorId:q.actorId,targetId:q.targetId,itemId,sourceItemId,itemName,quantity:q.quantity,walletBefore,walletAfter:{actor:state.钱包.列表[actor.walletId].gold,target:state.钱包.列表[target.walletId].gold},summary:q.item?`搜取${q.item.name}×${q.quantity}，保留原财物归属记录。`:`搜取钱币${q.quantity}，双方钱包已结算。`};
    }else{
      receipt=custody.disposition(state,{...request,action:intent.type==='execute-person'?'executed':'spared'},transactionId);
      if(intent.type==='execute-person')state=reconcileAftermath(state).state;
    }
    if(intent.type==='set-restraint-mode'){
      advanceActionTime(state,request.actorId,1);combat.pruneMaintenance(state);
      receipt.power=controls.powerFacts(state,receipt.targetId);
      const timer=(custody.table(state).deviceTimers??[]).find(t=>t.id===receipt.timer?.id);
      if(timer?.status==='completed')receipt.summary+=' 定时机关已在这次一分钟调节结束时恢复原配置。';
    }
    logistics.advanceAt(state,people.now(state),logisticsHooks());
    return commit(state,transactionId,'战败与看管处置',receipt);
  }
  const CUSTODY_INTENTS=new Set([...poison.INTENTS,...commerceMessages.INTENTS,...stock.INTENTS,...assets.INTENTS,...sealing.INTENTS,...publicAuction.INTENTS,...auction.INTENTS,...market.INTENTS,...preparations.INTENTS,...cooperation.INTENTS,...rescue.INTENTS,...social.INTENTS,...logistics.INTENTS,'decide-restraint-permission-request','decide-defeat','person-duel','capture-person','spare-person','execute-person','search-captive','set-restraint-mode','detach-restraint','release-captive','attach-restraint','permit-restraint','request-restraint-permission','respond-restraint-permission-request','revoke-restraint-permission']);
  function abilityUseTable(state){return state.扩展?.abilityApplications??{requests:[],events:[]};}
  function abilityUseFacts(state,viewerId){return abilityUseTable(state).requests.filter(r=>r.actorId===viewerId||r.targetId===viewerId).map(r=>({id:r.id,actorId:r.actorId,targetId:r.targetId,skillId:r.skillId,skillName:r.contract.name,actorName:state.人物.列表[r.actorId]?.name,targetName:state.人物.列表[r.targetId]?.name,status:r.expiresAt<=people.now(state)&&['pending','accepted'].includes(r.status)?'expired':r.status,expiresAt:r.expiresAt,canRespond:r.targetId===viewerId&&r.status==='pending'&&r.expiresAt>people.now(state)}));}
  function abilityApplicationAuthority(state,actorId,targetId,skill,options={}){
    const formation=globalThis.SoulPersonContracts.formationAuthority(state,actorId,targetId,skill,options);if(formation)return formation;
    const controlAttempt=globalThis.SoulPersonContracts.controlAttemptAuthority(state,actorId,targetId,skill,options);if(controlAttempt)return controlAttempt;
    const realmCapture=globalThis.SoulResidentRealms?.isCaptureSkill(skill,options.scope?.branchIds??options.branchIds);if(realmCapture){const selected=abilities.selectFieldBranches(skill,options.scope?.branchIds??options.branchIds).flatMap(b=>b.nodes);globalThis.SoulResidentRealms.preflight(state,actorId,targetId,skill,selected);if(!selected.some(n=>!['realm.capture','realm.store'].includes(n.effectId)&&effects.effectPolarity(n.effectId,n.params)==='harmful'))return {available:true,basis:'capture-qualification'};}
    if(actorId===targetId)return {available:true,basis:'self'};
    const canField=abilities.fieldControlGraph(skill.effectGraph),scope=options.scope??(canField?creation.normalizeScope(skill,options):{branchIds:effects.graphBranches(skill.effectGraph).filter(b=>b.activation==='active').map(b=>b.id),modeId:options.modeId??''}),scopeHash=abilities.hash(scope),selectedNodes=canField?abilities.selectFieldBranches(skill,scope.branchIds).flatMap(b=>b.nodes):skill.effectGraph.nodes;
    const target=state.战斗单位.列表[targetId],drug=abilities.consumableDisposition(skill),harmfulDrug=drug?.harmful===true,harmful=selectedNodes.some(n=>effects.effectPolarity(n.effectId,n.params)==='harmful');
    if(harmful){const reason=controls.targetReason(state,actorId,{harmfulTargetIds:[targetId]});if(reason)return {available:false,reason};}
    if(harmfulDrug&&options.force!==true)return {available:false,reason:'有害毒药不能按普通给药施用；须先实际控制或制服目标，再明确选择强制吞服'};
    const records=abilityUseTable(state).requests.filter(r=>r.actorId===actorId&&r.targetId===targetId&&r.skillId===skill.id),r=options.permissionId?records.find(r=>r.id===options.permissionId):records.filter(r=>r.scopeHash===scopeHash).at(-1);
    if(options.permissionId&&(!r||r.status!=='accepted'||r.expiresAt<=people.now(state)||r.contractHash!==abilities.fingerprint(skill)||r.scopeHash!==scopeHash))return {available:false,reason:'本次能力施用许可已失效'};
    if(!harmfulDrug&&r?.status==='accepted'&&r.expiresAt>people.now(state)&&r.contractHash===abilities.fingerprint(skill)&&r.scopeHash===scopeHash)return {available:true,basis:'accepted',permissionId:r.id};
    if(r?.status==='rejected'&&options.force!==true)return {available:false,reason:'本人已拒绝本次施用；强制尝试须另行明确选择'};
    if(!harmful&&r?.status!=='rejected')return {available:true,basis:'aid'};
    const auth=globalThis.SoulInfluenceCore.authority(state,actorId,targetId,skill.sourceKind==='consumable'?'物品':'战斗');
    if(auth.available)return {available:true,basis:'controlled',sourceStatusId:auth.sourceStatusId};
    const battle=actions.battleOf(state,actorId),limits=controls.restrictions(state,targetId),physicallyHeld=!!limits.blocked.gesture?.length&&!!limits.blocked.movement?.length;
    const oralForce=options.force===true&&skill.sourceKind==='consumable'&&abilities.describe(skill).requirements.includes('ingest');
    const confined=oralForce&&custody.confined(state,targetId),barrier=confined&&logistics.barrier(state,confined),physicallyConstrained=!!(limits.blocked.gesture?.length||limits.blocked.movement?.length||barrier);
    if(options.force===true&&options.battleAttempt===true&&skill.sourceKind==='consumable'&&(!harmfulDrug||(oralForce?physicallyConstrained:physicallyHeld))&&battle?.id===actions.battleOf(state,targetId)?.id&&battle.当前行动单位ID===actorId)return {available:true,basis:'opposed-ingestion'};
    // Oral administration uses actual physical restraint, not the remaining spell menu.
    // A partly bound or confined recipient can still oppose the attempt in the field.
    if(oralForce&&!battle&&!actions.battleOf(state,targetId)){
      if(physicallyHeld)return {available:true,basis:'suppressed'};
      if(physicallyConstrained)return {available:true,basis:'opposed-ingestion'};
    }
    const pressed=target.存活状态!=='存活'||target.资源.生命.当前<=0||physicallyHeld;
    if(pressed){
      const canResist=target.存活状态==='存活'&&target.资源.生命.当前>0&&combat.listAvailableActions(state,targetId).some(a=>a.actionType==='技能'&&a.available);
      if(!canResist&&(skill.sourceKind!=='consumable'||options.force===true))return {available:true,basis:'suppressed'};
    }
    return {available:false,reason:harmfulDrug?'对方仍能反抗，无法强行喂下毒药。':r?.status==='rejected'?'对方拒绝了这次施用，仍在反抗。':'对方仍能反抗，请先征询是否愿意接受。'};
  }
  function consumeAbilityPermission(state,permissionId,sourceId){
    if(!permissionId)return;const r=abilityUseTable(state).requests.find(r=>r.id===permissionId);if(!r||r.status!=='accepted')throw Error('本次施用许可已经失效');
    r.status='used';r.usedBy=sourceId;r.usedAt=people.now(state);custody.stamp(r);abilityUseTable(state).events.push({sourceId,kind:'used',record:clone(r)});
  }
  function abilityRequestContext(state,intent){
    const actorId=clean(intent.actorId,state.角色.主控单位ID);actions.resolve(state,{actorId,battleId:null});
    influence.assertVoluntary(state,actorId);
    if(controls.active(state,actorId).some(s=>['status.sleep','status.stun'].includes(s.模板ID)))throw Error('本人须清醒才能提出或回应施用请求');
    if(controls.actionReason(state,actorId,'requirements',{requirements:['voice']})&&controls.actionReason(state,actorId,'requirements',{requirements:['gesture']}))throw Error('当前无法说话或示意本次施用意愿');
    const db=abilityUseTable(state);
    if(intent.type==='request-ability-use'){
      const skill=state.技能.列表[intent.skillId];if(!skill||!state.战斗单位.列表[actorId].能力.技能ID.includes(skill.id)||!abilities.verify(skill).pass||!abilities.fieldControlGraph(skill.effectGraph))throw Error('请求必须使用本人持有的完整场外能力');
      if(abilities.consumableDisposition(skill)?.harmful)throw Error('有害毒药不能请求普通给药许可；须实际控制或制服目标后明确强制吞服');
      if(intent.targetId===actorId)throw Error('本人使用无需请求');actions.resolve(state,{actorId,battleId:null,targetIds:[intent.targetId]});
      const target=state.战斗单位.列表[intent.targetId];if(target.存活状态!=='存活'||target.资源.生命.当前<=0)throw Error('本人必须清醒才能回应施用请求');
      if(db.requests.some(r=>r.actorId===actorId&&r.targetId===intent.targetId&&r.skillId===skill.id&&r.status==='pending'&&r.expiresAt>people.now(state)))throw Error('已有相同请求等待本人回应');
      return {actorId,skill,scope:creation.normalizeScope(skill,intent),targetId:intent.targetId};
    }
    const request=db.requests.find(r=>r.id===intent.permissionId);if(!request||request.targetId!==actorId||request.status!=='pending'||request.expiresAt<=people.now(state))throw Error('本人没有当前可回应的施用请求');
    actions.resolve(state,{actorId,battleId:null,targetIds:[request.actorId]});if(typeof intent.accept!=='boolean'||typeof intent.reason!=='string'||!intent.reason.trim()||intent.reason.length>600)throw Error('本人回应须为是否接受及有限理由');
    return {actorId,request};
  }
  function previewAbilityRequests(rawState,intents){
    if(!Array.isArray(intents))throw Error('能力请求预览列表无效');
    const state=normalizeState(rawState);
    return intents.map(intent=>{
      const type=clean(intent?.type);
      try{
        if(!['request-ability-use','respond-ability-use'].includes(type))throw Error('不支持这项能力请求预览');
        const context=abilityRequestContext(state,intent);
        return {type,available:true,actorId:context.actorId,...(context.skill?{skillId:context.skill.id,targetId:context.targetId}:{permissionId:context.request.id})};
      }catch(error){return {type,available:false,reason:error.message};}
    });
  }
  function settleAbilityRequest(rawState,intent,id){
    const guard=transactionStart(rawState,id,'能力施用请求');if(guard.duplicate)return {state:guard.state,receipt:guard.receipt,idempotent:true};
    const state=guard.state,context=abilityRequestContext(state,intent),actorId=context.actorId;
    state.扩展.abilityApplications??={requests:[],events:[]};const db=abilityUseTable(state);let r;
    if(intent.type==='request-ability-use'){
      const skill=context.skill;
      r=custody.stamp({id:`ability-use:${id}`,actorId,targetId:intent.targetId,skillId:skill.id,contract:clone(skill),contractHash:abilities.fingerprint(skill),scope:clone(context.scope),scopeHash:abilities.hash(context.scope),requestedAt:people.now(state),expiresAt:people.now(state)+15,status:'pending'});db.requests.push(r);
    }else{
      r=context.request;
      r.status=intent.accept?'accepted':'rejected';r.respondedAt=people.now(state);r.privateReason=intent.reason;r.respondedBy=id;custody.stamp(r);
    }
    db.events.push({sourceId:id,kind:intent.type==='request-ability-use'?'requested':'responded',record:clone(r)});
    return commit(state,id,'能力施用请求',{type:intent.type==='request-ability-use'?'ability-use-requested':'ability-use-responded',permissionId:r.id,actorId:r.actorId,targetId:r.targetId,skillId:r.skillId,status:r.status,expiresAt:r.expiresAt,summary:r.status==='pending'?'已当面请求本次能力施用，等待本人回应。':r.status==='accepted'?'对方接受了这次施用，可以继续。':'本人拒绝本次施用。'});
  }
  function validateAbilityApplications(state){
    const errors=[];for(const unit of Object.values(state.战斗单位.列表)){const r=unit.扩展?.场外回魂日账;if(r&&(!Number.isSafeInteger(r.day)||r.day<0||r.day>state.世界.时间.day||!Number.isSafeInteger(r.total)||r.total<0||r.total>2||!Number.isSafeInteger(r.strong)||r.strong<0||r.strong>1||r.strong>r.total||Object.keys(r).some(k=>!['day','total','strong'].includes(k))))errors.push('接受者场外回魂日账无效');}
    const db=state.扩展?.abilityApplications;if(!db)return errors;
    if(!Array.isArray(db.requests)||!Array.isArray(db.events))return [...errors,'能力施用记录无效'];const ids=new Set();
    for(const r of db.requests){const {hash,...body}=r;if(ids.has(r.id)||hash!==abilities.hash(body)||!abilities.verify(r.contract).pass||r.contractHash!==abilities.fingerprint(r.contract)||r.scopeHash!==abilities.hash(r.scope)||abilities.hash(creation.normalizeScope(r.contract,r.scope))!==r.scopeHash||r.actorId!==r.contract.持有者单位ID||r.actorId===r.targetId||!state.人物.列表[r.targetId]||r.expiresAt!==r.requestedAt+15||!['pending','accepted','rejected','used'].includes(r.status)||!db.events.some(e=>e.kind==='requested'&&e.record.id===r.id)||abilities.hash(db.events.filter(e=>e.record.id===r.id).at(-1)?.record)!==abilities.hash(r))errors.push('能力施用原始请求、本人回应或使用来源无效');ids.add(r.id);}
    return errors;
  }

  // Identifies only a genuine, currently owned food action targeting its owner.
  // No name or skill-ID prefix grants a personal-action exemption.
  function selfFoodUse(state,intent={}) {
    if(!['use-field-ability','consume-food-drink','use-restorative-item'].includes(intent.type)||intent.offerId)return null;
    const actorId=clean(intent.actorId,state.角色?.主控单位ID);
    if(intent.type!=='consume-food-drink'&&clean(intent.targetId,actorId)!==actorId)return null;
    const actor=state.战斗单位?.列表?.[actorId],requested=state.技能?.列表?.[intent.skillId];
    const item=state.物品?.实例?.[intent.type==='use-field-ability'?requested?.sourceItemId:intent.itemId];
    if(!item||item.type!=='辅助食品')return null;
    if(intent.type==='consume-food-drink'&&Object.keys(intent).some(k=>!['id','type','actorId','itemId'].includes(k)))throw Error('本人食用只能指定实际携带的一份食品');
    supportFoodCarrier(state,item,{allowPoisoned:true});
    if(!isCarriedItem(state,item,actorId))throw Error('需要本人实际携带的一份食品');
    const originals=itemGrantedSkills(state,actorId,item,'consumable');
    const skill=intent.type==='use-field-ability'?requested:(actor?.能力?.技能ID??[]).map(id=>state.技能.列表[id]).find(s=>s?.sourceItemId===item.id&&originals.some(expected=>expected.id===s.id));
    const original=originals.find(expected=>expected.id===skill?.id);
    if(!actor||!skill||!(actor.能力?.技能ID??[]).includes(skill.id)||skill.sourceKind!=='consumable'||skill.持有者单位ID!==actorId||skill.sourceItemId!==item.id||!abilities.verify(skill).pass||!original||abilities.fingerprint(skill)!==abilities.fingerprint(original))throw Error('食品能力不属于本人或与实际食品来源不符');
    abilities.describe(skill,{modeId:intent.modeId});
    return {actorId,itemId:item.id,skillId:skill.id};
  }
  function isSelfFoodUse(state,intent){try{return !!selfFoodUse(state,intent);}catch{return false;}}
  function fieldUsePrelude(state,intent,executionContext) {
    const nativeField=!state.人物.列表[intent.actorId]&&state.战斗单位.列表[intent.actorId]?.扩展?.魂兽档案ID;
    const food=selfFoodUse(state,intent),realmCapture=globalThis.SoulResidentRealms?.isCaptureSkill(state.技能.列表[intent.skillId],intent.branchIds),actor=food||realmCapture||nativeField?(state.人物.列表[food?.actorId??intent.actorId??state.角色.主控单位ID]??state.战斗单位.列表[intent.actorId]):sceneActionActor(state,intent.actorId,true,executionContext,intent);
    actions.resolve(state,{actorId:actor.id,battleId:null,fieldAbility:true});
    if(realmCapture&&state.人物.列表[intent.targetId]&&!state.战斗单位.列表[intent.targetId])promoteNpcInternal(state,intent.targetId);
    let block=food||realmCapture||nativeField?worldActionBlockReason(state,{actorId:actor.id,allowCaptivity:true,allowActivities:['expedition']}):restorativeItemBlockReason(state,actor.id,executionContext,intent);
    const expedition=(food||realmCapture||nativeField)&&expeditions.forActor(state,actor.id);
    if(!block&&expedition&&!['awaiting-room','interaction','postcombat'].includes(expedition.phase))block='请先完成当前房间的准备或战斗结算';
    if(block)throw Error(block);
    return actor;
  }
  function performFieldUse(state,intent,id,executionContext) {
    const effectCursor=creation.eventCursor(state);
    const actor=fieldUsePrelude(state,intent,executionContext);
    const result=combat.activateFieldAbility(state,actor.id,clean(intent.skillId),clean(intent.targetId,actor.id),id,intent.modeId,{...intent,permissionId:intent.permissionId,force:intent.force});
    if(result.state.人物.列表[actor.id])advanceActionTime(result.state,actor.id,1);else advanceTime(result.state,1);
    if(result.receipt.targets?.some(t=>t.effects?.some(e=>e.effectId==='payload.death'&&e.dead)))result.state=reconcileAftermath(result.state,result.receipt).state;
    Object.assign(result.receipt,creation.eventsSince(result.state,effectCursor,actor.id));
    return result;
  }

  function previewFieldIntent(state,intent,executionContext){
    const type=clean(intent.type);
    if(!['use-field-ability','stop-maintenance'].includes(type))throw Error('不支持这项场外预览');
      try{
        const actor=type==='use-field-ability'?fieldUsePrelude(state,intent,executionContext):sceneActionActor(state,intent.actorId,true,executionContext,intent);
        actions.resolve(state,{actorId:actor.id,battleId:null,fieldAbility:type==='use-field-ability'});
        if(type==='stop-maintenance'){
          const entry=state.扩展?.abilityMaintenance?.[intent.maintenanceSourceId];
          if(!entry||entry.actorId!==actor.id)throw Error('只能停止本人正在维持的来源');
          return {type,actorId:actor.id,maintenanceSourceId:entry.id,available:true,reason:''};
        }
        const quote=combat.previewFieldAbility(state,actor.id,clean(intent.skillId),clean(intent.targetId,actor.id),intent.modeId,{...intent,permissionId:intent.permissionId,force:intent.force});
        const skill=state.技能.列表[clean(intent.skillId)],notices=[];
        if(skill?.effectGraph?.nodes?.some(n=>n.params?.持续方式==='世界分钟'&&n.params.持续分钟<=1))notices.push('若生效，一分钟持续效果会在这次施用结束时到期。');
        if(controls.active(state,actor.id).concat(controls.active(state,clean(intent.targetId,actor.id))).some(s=>s.持续?.expiresAt>people.now(state)&&s.持续.expiresAt<=people.now(state)+1))notices.push('当前已有持续效果会在这一分钟内到期。');
        return {type,...quote,timingNotices:notices};
      }catch(error){return {type,available:false,reason:error.message};}
  }
  function previewFieldIntents(rawState,intents){
    if(!Array.isArray(intents))throw Error('场外预览列表无效');
    const state=normalizeState(rawState);return intents.map(intent=>previewFieldIntent(state,intent));
  }

  // Query only: the same fixed business runs on one draft without repeated world normalization.
  function previewCustodyDisposition(rawState,request){
    try{if(request?.type!=='decide-custody-disposition')throw Error('这里只预检本人看管决定');const draft=clone(rawState);market.advanceAt(draft);market.execute(draft,request,`preview-disposition:${draft.系统.revision}`,{logistics:logisticsHooks(),custody:custodyHooks(),cooperation:cooperationHooks(),medical:custodyMedicalHooks()});return {available:true};}
    catch(error){return {available:false,reason:error.message};}
  }
  function previewTravelIntent(state,intent,executionContext,resuming=false){
    const type=clean(intent.type);
      if(state.战斗?.状态==='进行中'&&state.战斗.扩展?.clock?.mode==='foreground')throw Error('当前有待处理的前台战斗，不能快进旅行时间；请先处理该场战斗');
      const actorId=clean(intent.actorId,state.角色.主控单位ID),front=actorId===state.角色.主控单位ID,position=actions.positionOf(state,actorId);if(position.kind==='location'&&position.sceneId)throw Error('须先离开当前房间回到公共通道，再安排旅行');
      const allowCaptivity=fieldControl.allowed(state,executionContext,actorId),block = worldActionBlockReason(state,{actorId,allowCaptivity});
      if (block) throw new Error(block);
      const pendingTravel=(state.世界.longActions??[]).find(a=>a.kind==='travel'&&a.ownerId===actorId&&a.status==='interrupted'&&a.destinationId===intent.destinationId);
      if(executionContext&&pendingTravel&&!resuming)throw Error('已有前往该地点的剩余行程，请继续或放弃原安排');
      const companionIds=executionContext||pendingTravel?.solo?[]:travelCompanionIds(state,actorId,pendingTravel?.stayBehind??intent.stayBehind);
      if(!front&&companionIds.includes(state.角色.主控单位ID)){const reason=worldActionBlockReason(state,{allowCaptivity:cooperation.permits(state,actorId,state.角色.主控单位ID,'travel')});if(reason)throw Error(reason);}
      for(const id of [actorId,...companionIds]){actions.resolve(state,{actorId:id,battleId:null,requirements:['movement']});if(controls.active(state,id).some(s=>['status.sleep','status.stun'].includes(s.模板ID)))throw Error('同行人员无法清醒移动');}
      if(!state.人物.列表[actorId].transit&&intent.destinationId===state.人物.列表[actorId].locationId)throw Error('角色已经位于目标地点');
      if (front&&state.杀戮场?.当前 && !['completed','failed'].includes(state.杀戮场.当前.status)) throw new Error('地狱杀戮场五场死斗期间不能离场或安全撤离');
      const mode = pendingTravel?.mode??(PATH_MODES[intent.mode] ? intent.mode : front?state.地图.扩展.路径模式:'balanced');
      const path = remainingTravelPath(state,clean(intent.destinationId),mode,actorId);
      const scheduleReason=npcActionScheduleReason(state,actorId,Math.max(1,path.totalMinutes));if(scheduleReason)throw Error(scheduleReason);
      let returnTrip;
      try {
        const returnPath = findPathInState(state,path.from,'cheapest',path.to,actorId);
        returnTrip = {available:true,path:returnPath,destinationName:LOCATION_TEMPLATES[path.from].name,currencyText:formatCurrency(0),roundTripGold:0,affordable:true,shortfallGold:0};
      } catch {
        returnTrip = {available:false,reason:'按当前通行条件，尚不能规划返回此地的路线'};
      }
      return {
        type,available:true,reason:'', ...(pendingTravel?{resumeActionId:pendingTravel.id}:{}), destinationId:intent.destinationId, destination:clone(LOCATION_TEMPLATES[intent.destinationId]), path, companionIds,
        mode, modeName:PATH_MODES[mode].name, affordable:true,
        currencyText:formatCurrency(path.totalCostGold),returnTrip
      };
  }

  function quoteIntimateCraft(state,intent,executionContext) {
    const actor=sceneActionActor(state,intent.actorId,true,executionContext,intent),templateId=clean(intent.templateId),core=globalThis.SoulIntimateCore,device=core?.DEVICES?.[templateId];
    if(!device||!core.ITEM_TEMPLATES[templateId])throw Error('没有这件情具的制式');
    const wallet=state.钱包.列表[actor.walletId];
    if(!wallet||wallet.gold<device.price)throw Error('金币不足');
    const placement=previewItemPlacement(state,actor.inventoryContainerId,{templateId,ownerEntityId:actor.id,forceUnique:true});
    if(!placement.pass)throw Error(placement.message);
    return {actorId:actor.id,templateId,name:device.name,gold:device.price,minutes:5};
  }

  function previewIntent(rawState, intent = {},executionContext) {
    return previewIntentPrepared(normalizeState(rawState),intent,executionContext);
  }
  // The engine already normalized its committed snapshot. Only the read-only travel projection uses this path.
  function previewCommittedTravel(state,intent){
    if(intent?.type!=='travel')throw Error('此入口只能预览地图行程');
    return previewIntentPrepared(state,intent);
  }
  // A presentation request can quote many controls against one detached read state.
  // No mutations or normalization are applied to the player's authoritative state.
  function intentPreviewer(rawState){
    const prepared=normalizeState(rawState);
    return intent=>previewIntentPrepared(prepared,intent);
  }
  // Alternative actions all see the same detached world. A listener check only
  // needs the speaking and knowledge rules; delivery belongs to settlement.
  function intentAvailability(rawState){
    let state,newsReady=false;
    return intent=>{
      try{
        state??=normalizeState(rawState);
        if(intent.type==='tell-custody-news'){
          if(!newsReady){social.ingest(state);newsReady=true;}
          social.newsSources(state,intent);
          return true;
        }
        return previewIntentPrepared(state,intent).available===true;
      }catch{return false;}
    };
  }
  function previewIntentPrepared(state,intent={},executionContext){
    if(executionContext)fieldControl.assertIntent(state,executionContext,intent);
    const type = clean(intent.type);
    if(type==='learn-preset-blueprint'){try{return globalThis.SoulExpeditionEngine.previewLearnPresetBlueprint(state,intent.itemId,intent.actorId??state.角色.主控单位ID);}catch(error){return {available:false,reason:error.message};}}
    if(type==='store-item'||type==='retrieve-item')return {type,...itemStorageAvailability(state,intent,type==='retrieve-item')};
    if(type.startsWith('device.'))return globalThis.SoulDeviceOperations.quote(state,{...intent,actorId:clean(intent.actorId,state.角色.主控单位ID)});
    if(type==='intimate-craft'){
      try{return {type,available:true,reason:'',...quoteIntimateCraft(state,intent,executionContext)};}
      catch(error){return {type,available:false,reason:error.message};}
    }
    if(['intimate-equip','intimate-detach','intimate-level'].includes(type)){
      const actorId=clean(intent.actorId,state.角色.主控单位ID),q={actorId,targetId:clean(intent.targetId,actorId),itemId:clean(intent.itemId),...(intent.slot?{slot:clean(intent.slot)}:{}),level:intent.level??0,forced:intent.forced===true},operation={'intimate-equip':'equip','intimate-detach':'detach','intimate-level':'level'}[type];
      if(wearables?.route(state,operation,q))try{sceneActionActor(state,actorId,true,executionContext,intent);const quoted=wearables.quote(state,operation,q);return {type,available:true,actorId,itemId:q.itemId,minutes:quoted.minutes,slot:quoted.slot,level:quoted.level};}catch(error){return {type,available:false,reason:error.message};}
    }
    if(['request-ability-use','respond-ability-use'].includes(type)){try{return {available:true,receipt:settleAbilityRequest(state,intent,`preview:${state.系统.revision}:${type}`).receipt};}catch(error){return {available:false,reason:error.message};}}
    if(type==='issue-field-control'){try{return fieldControl.quote(state,{...intent,actorId:clean(intent.actorId,state.角色.主控单位ID)},{locationKnown:(personId,locationId)=>isLocationKnown(state,locationId,personId),preview:(s,q,context)=>previewIntent(s,q,context)});}catch(error){return {available:false,reason:error.message};}}
    if(type==='speak-person'){
      const actor=sceneActionActor(state,intent.actorId,true,executionContext,intent);
      if(typeof intent.text!=='string'||!intent.text.trim()||intent.text.length>2000||actor.id===intent.targetId)throw Error('发言须指定另一位听者与不超过2000字的原话');
      if(!executionContext&&actor.id!==state.角色.主控单位ID&&!globalThis.SoulPersonContracts.speechOrderAvailable(state,intent))throw Error('只能由本人自主发言');
      social.communicate(state,actor.id,intent.targetId);return {type,actorId:actor.id,targetId:intent.targetId,available:true};
    }
    if(globalThis.SoulCombatDeployments.INTENTS.includes(type)){try{const draft=clone(state),receipt=globalThis.SoulCombatDeployments.execute(draft,{...intent,actorId:intent.actorId??state.角色.主控单位ID},'preview-deployment:'+state.系统.revision);return {available:true,receipt};}catch(error){return {available:false,reason:error.message};}}
    if(globalThis.SoulPersonContracts.INTENTS.includes(type)){try{const result=globalThis.SoulPersonContracts.execute(clone(state),{...intent,actorId:intent.actorId??state.角色.主控单位ID},'preview-contract:'+state.系统.revision);return {available:!result.receipt.sourceUnavailable,reason:result.receipt.reason??'',receipt:result.receipt};}catch(error){return {available:false,reason:error.message};}}
    if(globalThis.SoulPerformanceAgreements.INTENTS.includes(type)){try{const draft=clone(state),receipt=globalThis.SoulPerformanceAgreements.execute(draft,{...intent,actorId:intent.actorId??state.角色.主控单位ID},'preview-agreement:'+state.系统.revision);return {available:true,receipt};}catch(error){return {available:false,reason:error.message};}}
    if(globalThis.SoulResidentRealms.INTENTS.includes(type)){try{const draft=clone(state),receipt=globalThis.SoulResidentRealms.execute(draft,{...intent,actorId:intent.actorId??state.角色.主控单位ID},`preview-realm:${state.系统.revision}`);return {available:true,receipt};}catch(error){return {available:false,reason:error.message};}}
    if(type==='break-custody-cell-door'){
      try{const choice=lockedRoomDoor(state,intent);return {available:true,minutes:10,attribute:choice.attribute,modifier:choice.modifier,dc:choice.dc};}
      catch(error){return {available:false,reason:error.message};}
    }
    if(CUSTODY_INTENTS.has(type)){
      try{
        const actorId=clean(intent.actorId,state.角色.主控单位ID);
        if(poison.INTENTS.includes(type)){if(actions.battleOf(state,actorId))throw Error('战斗中的药剂操作须消耗本人的战斗主行动');const food=selfFoodUse(state,{...intent,actorId});if(food){const q=previewFieldIntent(state,{type:'use-field-ability',actorId,skillId:food.skillId,targetId:actorId},executionContext);return {available:q.available,reason:q.reason??'',quote:{type,actorId,available:q.available,foodUse:{actorId,itemId:food.itemId,skillId:food.skillId,payment:q.payment},payment:q.payment}};}return {available:true,quote:poison.quote(state,{...intent,actorId})};}
        if(sealing.INTENTS.includes(type))return {available:true,quote:sealing.quote(state,{...intent,actorId})};
        if(type==='trade-commerce-material')return {available:true,quote:assets.previewTrade(state,intent),receipt:assets.previewTrade(state,intent)};
        if(poison.INTENTS.includes(type)||commerceMessages.INTENTS.includes(type)||stock.INTENTS.includes(type)||assets.INTENTS.includes(type)||sealing.INTENTS.includes(type)||publicAuction.INTENTS.includes(type)||auction.INTENTS.includes(type)||market.INTENTS.includes(type)||preparations.INTENTS.includes(type)||cooperation.INTENTS.includes(type)||rescue.INTENTS.includes(type)||social.INTENTS.includes(type)||logistics.INTENTS.includes(type)||['set-restraint-mode','detach-restraint','release-captive','attach-restraint','permit-restraint','request-restraint-permission','respond-restraint-permission-request','revoke-restraint-permission'].includes(type))return {available:true,receipt:settleCustodyIntent(state,intent,`preview:${state.系统.revision}:${type}`).receipt};
        if(type==='person-duel')return {available:true,...personDuelContext(state,intent)};
        if(type==='search-captive'){const q=searchCaptiveContext(state,intent);return {available:true,actorId,targetId:q.targetId,quantity:q.quantity,itemId:q.item?.id??''};}
        if(type==='capture-person'){const q=custody.captureQuote(state,actorId,intent.targetId,intent.defeatId,intent.restraintItemIds);return {available:true,actorId,targetId:q.targetId,summary:q.summary};}
        custody.qualification(state,actorId,intent.targetId,intent.defeatId);return {available:true,actorId,targetId:intent.targetId};
      }catch(error){return {available:false,reason:error.message};}
    }
    if(type==='propose-gift'||type==='fulfill-gift'){
      if(!executionContext)throw Error('受控赠物需要本次实际控制命令');
      const actor=sceneActionActor(state,intent.actorId,true,executionContext,intent),order=fieldControl.table(state).orders.find(r=>r.id===executionContext.orderId),ref={orderId:order.id,issuerId:order.issuerId,sourceStatusId:order.sourceStatusId,executionId:order.executionId};
      return {type,actorId:actor.id,available:true,quote:gifts.quote(state,{...intent,actorId:actor.id},executionContext.executionId,ref,{preview:q=>previewGift(state,q,executionContext)})};
    }
    if(type==='resume-travel'){
      if(!executionContext)throw Error('此入口需要本次实际控制命令');
      const actor=sceneActionActor(state,intent.actorId,false,executionContext,intent),trip=(state.世界.longActions??[]).find(a=>a.id===intent.actionId&&a.ownerId===actor.id&&a.status==='interrupted'&&a.kind==='travel');
      if(!trip)throw Error('没有这项待继续的安排');
      return previewTravelIntent(state,{...intent,destinationId:trip.destinationId,mode:trip.mode},executionContext,true);
    }
    if (type === 'use-restorative-item') {
      try{const food=selfFoodUse(state,intent),actor=food?fieldUsePrelude(state,intent,executionContext):sceneActionActor(state,intent.actorId,true,executionContext,intent),reason=food?'':restorativeItemBlockReason(state,actor.id,executionContext,intent);
      return reason ? {available:false,reason} : combat.previewRestorativeItem(state,actor.id,clean(intent.itemId),clean(intent.targetId,actor.id),intent.modeId);}catch(error){return {available:false,reason:error.message};}
    }
    if(type==='use-prebattle-pill'){
      let actor;try{actor=sceneActionActor(state,intent.actorId,true,executionContext,intent);}catch(error){return {available:false,reason:error.message};}
      const preview=combat.previewPrebattlePill(state,actor.id,clean(intent.itemId),intent.modeId,clean(intent.targetId,actor.id));
      const reason=restorativeItemBlockReason(state,actor.id,executionContext,intent);
      return reason ? {...preview,available:false,reason} : preview;
    }
    if (type === 'world-event') return previewWorldEvent(state,clean(intent.eventId));
    if(type==='travel')return previewTravelIntent(state,intent,executionContext);
    if(type==='trade-batch')return {type,available:true,quote:previewBatchTrade(state,intent)};
    if (type === 'buy' || type === 'sell') {
      const block = worldActionBlockReason(state,{actorId:intent.actorId??state.角色.主控单位ID});
      if (block) throw new Error(block);
      return {type, quote: previewTrade(state,intent,type)};
    }
    if(type==='create-support-consumable')return quoteSupportConsumableInState(state,intent);
    if (['equip','unequip','fuse-soul-bone'].includes(type)) return previewItemIntent(state,intent,executionContext);
    if(type==='safe-point-recover'){
      const entityId=clean(intent.targetId??intent.entityId,state.角色.主控单位ID);
      const operator=intent.targetId?state.角色.主控单位ID:entityId;
      try{const {locationId}=safePointRecoveryContext(state,entityId,operator);return {type,entityId,locationId,available:true,free:true};}
      catch(error){return {type,entityId,available:false,reason:error.message,free:true};}
    }
    if(type==='break-restraint'){const actor=sceneActionActor(state,intent.entityId??intent.actorId,true,null,intent);actions.resolve(state,{actorId:actor.id,battleId:null,...(sealing.isAwakeContained(state,actor.id)?{containmentAction:'struggle',requirements:[]}:{})});return {type,actorId:actor.id,minutes:10,...combat.breakFreeProfile(state,actor.id,intent.statusId,{method:intent.method,battleId:null})};}
    if(type==='retract-martial-soul'||type==='restrain-desire'){const actor=sceneActionActor(state,intent.entityId??intent.actorId,true,null,intent);const soulId=state.成长.列表[actor.id]?.激活武魂ID;if(type==='retract-martial-soul'&&globalThis.SoulManifestation.hasTrait(state.武魂.列表[soulId]))return {...globalThis.SoulManifestation.quote(state,{actorId:actor.id,soulId,operation:'recall'}),minutes:0,type};actions.resolve(state,{actorId:actor.id,battleId:null});if(type==='restrain-desire'&&!globalThis.SoulAbilityExchange.desireFacts(state,actor.id).strength)throw Error('当前没有欲火');return {type,actorId:actor.id,minutes:type==='restrain-desire'?5:1};}
    if (type === 'switch-martial-soul') {
      const entityId = clean(intent.entityId, state.角色.主控单位ID);
      const actor=sceneActionActor(state,entityId,true,executionContext,intent),unit=state.战斗单位.列表[actor.id];
      if(!unit||unit.存活状态!=='存活'||unit.资源.生命.当前<=0)throw Error('行动者已失能，不能切换武魂');
      const targetSoulId = clean(intent.martialSoulId);
      const ownedIds = foundation.ownedMartialSoulIds(state, entityId);
      if (!ownedIds.includes(targetSoulId)) throw new Error('目标武魂不属于该魂师');
      controls.assertAction(state,entityId,'switch-soul',{soulId:targetSoulId});
      if(foundation.activeMartialSoulId(state,entityId)!==targetSoulId&&Object.values(state.状态实例.列表).some(st=>st.目标单位ID===entityId&&st.模板ID==='transform.martial_avatar'&&st.状态!=='已结束'))throw Error('武魂真身持续期间不能切换武魂');
      const compiled=state.武魂.列表[targetSoulId]?.扩展?.结构化武魂;
      if(foundation.activeMartialSoulId(state,entityId)!==targetSoulId&&compiled?.exchangeContracts?.some(c=>c.mode!=='condition')){const draft=clone(state);draft.成长.列表[entityId].激活武魂ID=targetSoulId;globalThis.SoulAbilityExchange.reconcile(draft);globalThis.SoulAbilityExchange.preview(draft,entityId,compiled,{kind:'martialSoul',paidOnly:true});}
      return {type, entityId, previousSoulId: foundation.activeMartialSoulId(state, entityId), martialSoulId: targetSoulId, martialSoulName: state.武魂.列表[targetSoulId].名称, costsMainAction: Boolean(combat.occupiedBattle(state,entityId))};
    }
    if(['dismiss-disguise','inspect-disguise','disclose-identity'].includes(type)){try{if(type==='inspect-disguise'&&intent.method==='contact'&&state.人物.列表[intent.targetId]&&!state.战斗单位.列表[intent.targetId])promoteNpcInternal(state,intent.targetId);const actor=sceneActionActor(state,intent.actorId,true,executionContext,intent);actions.resolve(state,{actorId:actor.id,battleId:null,requirements:[type==='inspect-disguise'?(intent.method==='contact'?'gesture':'vision'):type==='disclose-identity'?'voice':'focus']});return {available:true,quote:globalThis.SoulDisguise.quote(state,{...intent,actorId:actor.id})};}catch(error){return {available:false,reason:error.message};}}
    if(type==='use-field-ability'||type==='stop-maintenance')return previewFieldIntent(state,intent,executionContext);
    if (type === 'harvest') {
      const remains = state.战利品.遗骸列表[clean(intent.remainsId)];
      return {type, remainsId: remains?.id, integrity: remains?.integrity, damageTypes: clone(remains?.damageTypes ?? [])};
    }
    throw new Error(`不支持预览的意图：${type}`);
  }

  function restorativeItemBlockReason(state,actorId=state.角色.主控单位ID,executionContext,preparationIntent) {
    const allowCaptivity=fieldControl.allowed(state,executionContext,actorId)||cooperation.preparationAllowed(state,actorId,preparationIntent);
    const block=worldActionBlockReason(state,{actorId,allowCaptivity,allowActivities:['expedition']});
    if(block)return block;
    const expedition=expeditions.forActor(state,actorId);
    if(expedition&&!['awaiting-room','interaction','postcombat'].includes(expedition.phase))return '请先完成当前房间的准备或战斗结算';
    return '';
  }

  function useRestorativeItem(rawState,intent,transactionId,executionContext) {
    const guard=transactionStart(rawState,transactionId,'使用恢复物品');
    if(guard.duplicate)return {state:guard.state,receipt:guard.receipt,idempotent:true};
    const food=selfFoodUse(guard.state,intent);
    const block=food?'':restorativeItemBlockReason(guard.state,clean(intent.actorId,guard.state.角色.主控单位ID),executionContext,intent);
    if(block)throw new Error(block);
    const actor=food?fieldUsePrelude(guard.state,intent,executionContext):sceneActionActor(guard.state,intent.actorId,true,executionContext,intent);
    const result=combat.activateRestorativeItem(guard.state,actor.id,clean(intent.itemId),transactionId,clean(intent.targetId,actor.id),intent.modeId);
    if(food)advanceActionTime(result.state,actor.id,1);
    return commit(result.state,transactionId,'使用恢复物品',result.receipt);
  }

  function settleCommittedTravel(state,intent){
    if(intent.type!=='travel')throw Error('该入口只接受已确认的旅行');
    return settleIntent(state,intent,undefined,true);
  }
  function settleIntent(rawState,intent={},executionContext,committedTravel=false){
    if(rawState.世界?.processedTransactions?.[String(intent.id??'')])return settleIntentBody(rawState,intent,executionContext);
    const core=globalThis.SoulPersonContracts,hasContracts=core.table(rawState).records.some(r=>r.status==='active'),prepared=rawState;
    if(hasContracts)core.assertAction(prepared,intent);
    const actualIntent=intent.type==='issue-field-control'?{...clone(intent.action),actorId:intent.executorId,id:intent.id}:intent;
    const observation=hasContracts?core.beginAction(prepared,actualIntent):null,source=hasContracts?combat.actionSkillContract(prepared,actualIntent):null,result=settleIntentBody(prepared,intent,executionContext,committedTravel);
    if(!result.idempotent&&hasContracts&&!executionContext&&!core.INTENTS.includes(intent.type)){
      const actualReceipt=result.receipt.type==='field-control-order'&&result.receipt.status==='executed'?{...clone(result.receipt.settlement),controlOrder:{issuerId:result.receipt.issuerId,sourceStatusId:result.receipt.sourceStatusId}}:result.receipt;
      const observed=core.observe(result.state,actualIntent,actualReceipt,'world',source,observation);if(observed){result.receipt.personContracts=observed;const id=result.receipt.id;result.state.世界.processedTransactions[id]=clone(result.receipt);if(result.state.事务?.id===id)result.state.事务.结算=clone(result.receipt);}
    }return result;
  }
  function settleIntentBody(rawState, intent = {},executionContext,committedTravel=false) {
    const id = clean(intent.id);
    const type = clean(intent.type);
    if(executionContext)fieldControl.assertIntent(rawState,executionContext,intent);
    if(type.startsWith('device.')){
      const guard=transactionStart(rawState,id,'器具操作'),request={...intent,actorId:clean(intent.actorId,rawState.角色.主控单位ID)},requestHash=abilities.hash(request);
      if(guard.duplicate){if(guard.receipt.requestHash!==requestHash)throw Error('器具操作事务编号不能替换请求');return {state:guard.state,receipt:guard.receipt,idempotent:true};}
      if(actions.battleOf(guard.state,request.actorId))throw Error('战斗中的器具能力须使用本人的战斗主行动');
      const q=globalThis.SoulDeviceOperations.quote(guard.state,request);if(!q.available)throw Error(q.reason);
      if(q.method==='ability'){
        const result=performFieldUse(guard.state,{type:'use-field-ability',actorId:request.actorId,skillId:request.skillId,targetId:q.targets[0],targetItemId:request.itemId,deviceNodeId:q.nodeId,lockId:request.lockId,knowledgeId:request.knowledgeId,materials:request.materials,branchIds:q.branchIds},id,executionContext);
        return commit(result.state,id,'器具能力',{...result.receipt,requestHash});
      }
      sceneActionActor(guard.state,request.actorId,true,executionContext,request);
      const receipt=globalThis.SoulDeviceOperations.apply(guard.state,request,id),timing=advanceActionTime(guard.state,request.actorId,q.minutes);
      return commit(guard.state,id,'器具操作',{...receipt,...timing,requestHash});
    }
    if(type==='issue-field-control'){
      const guard=transactionStart(rawState,id,'场外控制命令');
      const result=fieldControl.execute(guard.state,{...intent,actorId:clean(intent.actorId,guard.state.角色.主控单位ID)},id,{locationKnown:(personId,locationId)=>isLocationKnown(guard.state,locationId,personId),settle:(s,q,context)=>settleIntent(s,q,context)});
      if(result.idempotent)return {state:guard.state,receipt:{...result.receipt,id,transactionType:'场外控制命令'},idempotent:true};
      return commit(result.state,id,'场外控制命令',result.receipt);
    }
    if(type==='speak-person'){
      if(!executionContext){const db=social.speechTable(rawState),key=`speech:${id}`,prior=db.receipts[key];if(prior){if(JSON.stringify(db.requests[key])!==JSON.stringify({kind:'speak-person',actorId:intent.actorId??rawState.角色.主控单位ID,targetId:intent.targetId,text:intent.text}))throw Error('发言编号不能替换原请求');return {state:rawState,receipt:{...clone(prior),id,transactionType:'人物实际发言'},idempotent:true};}return settleCustodyIntent(rawState,intent,id);}
      const guard=transactionStart(rawState,id,'人物实际发言'),actor=sceneActionActor(guard.state,intent.actorId,true,executionContext,intent),order=fieldControl.table(guard.state).orders.find(r=>r.id===executionContext.orderId);
      return commit(guard.state,id,'人物实际发言',social.recordSpeech(guard.state,actor.id,intent.targetId,intent.text,id,{orderId:order.id,sourceStatusId:order.sourceStatusId}));
    }
    if(type==='propose-gift'||type==='fulfill-gift'){
      if(!executionContext)throw Error('受控赠物需要本次实际控制命令');
      const guard=transactionStart(rawState,id,'受控赠物'),actor=sceneActionActor(guard.state,intent.actorId,true,executionContext,intent),order=fieldControl.table(guard.state).orders.find(r=>r.id===executionContext.orderId),ref={orderId:order.id,issuerId:order.issuerId,sourceStatusId:order.sourceStatusId,executionId:order.executionId};
      const receipt=gifts[type==='propose-gift'?'propose':'fulfill'](guard.state,{...intent,actorId:actor.id},id,ref,{preview:q=>previewGift(guard.state,q,executionContext),transfer:(itemId,destinationId,quantity)=>transferItem(guard.state,itemId,destinationId,quantity)});
      return commit(guard.state,id,'受控赠物',receipt);
    }
    if(type==='respond-controlled-gift'){
      const guard=transactionStart(rawState,id,'独立回应赠物'),prior=gifts.table(guard.state).events.find(e=>e.sourceId===id);if(guard.duplicate&&!prior)throw Error('赠物回应事务编号已被占用');
      const result=gifts.respond(guard.state,{...intent,actorId:clean(intent.actorId,guard.state.角色.主控单位ID)},id);
      if(result.idempotent)return {state:guard.state,receipt:{...result.receipt,id,transactionType:'独立回应赠物'},idempotent:true};
      return commit(guard.state,id,'独立回应赠物',result.receipt);
    }
    if(type==='assess-person-speech'){
      const guard=transactionStart(rawState,id,'听闻独立判断'),actorId=clean(intent.actorId,guard.state.角色.主控单位ID);
      const prior=social.speechTable(guard.state).receipts[id];if(guard.duplicate&&!prior)throw Error('听闻判断事务编号已被其他行动占用');
      const receipt=social.assessSpeech(guard.state,actorId,intent.statementId,intent.decision,id);
      if(prior)return {state:guard.state,receipt:{...receipt,id,transactionType:'听闻独立判断'},idempotent:true};
      return commit(guard.state,id,'听闻独立判断',receipt);
    }
    if(['request-ability-use','respond-ability-use'].includes(type))return settleAbilityRequest(rawState,intent,id);
    if(globalThis.SoulCombatDeployments.INTENTS.includes(type)){const guard=transactionStart(rawState,id,'人物出战'),request={...intent,actorId:intent.actorId??rawState.角色.主控单位ID},requestHash=abilities.hash(request);if(guard.duplicate){if(guard.receipt.requestHash!==requestHash)throw Error('操作编号不能替换原请求');return {state:guard.state,receipt:guard.receipt,idempotent:true};}const receipt=globalThis.SoulCombatDeployments.execute(guard.state,request,id);return commit(guard.state,id,'人物出战',{...receipt,requestHash});}
    if(globalThis.SoulPersonContracts.INTENTS.includes(type)){
      const guard=transactionStart(rawState,id,'人物契约'),request={...intent,actorId:intent.actorId??rawState.角色.主控单位ID},requestHash=abilities.hash(request);
      if(guard.duplicate){if(guard.receipt.requestHash!==requestHash)throw Error('操作编号不能替换原请求');return {state:guard.state,receipt:guard.receipt,idempotent:true};}
      for(const personId of new Set([request.actorId,request.targetId,...(globalThis.SoulPersonContracts.get(guard.state,request.contractId)?.parties??[])]))if(guard.state.人物.列表[personId]&&!guard.state.战斗单位.列表[personId])promoteNpcInternal(guard.state,personId);
      const result=globalThis.SoulPersonContracts.execute(guard.state,request,id);if(result.receipt.minutes){if(result.state.人物.列表[request.actorId])advanceActionTime(result.state,request.actorId,result.receipt.minutes);else advanceTime(result.state,result.receipt.minutes);}else if(result.receipt.release){if(result.state.人物.列表[request.actorId])advanceActionTime(result.state,request.actorId,1);else advanceTime(result.state,1);}
      const finalReceipt={...result.receipt,requestHash,id,transactionType:'人物契约'};globalThis.SoulPersonContracts.recordCommandReceipt(result.state,request,finalReceipt);
      return commit(result.state,id,'人物契约',finalReceipt);
    }
    if(globalThis.SoulPerformanceAgreements.INTENTS.includes(type)){const guard=transactionStart(rawState,id,'履约协议'),request={...intent,actorId:intent.actorId??rawState.角色.主控单位ID},requestHash=abilities.hash(request);if(guard.duplicate){if(guard.receipt.requestHash!==requestHash)throw Error('操作编号不能替换原请求');return {state:guard.state,receipt:guard.receipt,idempotent:true};}const receipt=globalThis.SoulPerformanceAgreements.execute(guard.state,request,id);return commit(guard.state,id,'履约协议',{...receipt,requestHash});}
    if(globalThis.SoulResidentRealms.INTENTS.includes(type)){const guard=transactionStart(rawState,id,'画境管理'),request={...intent,actorId:intent.actorId??rawState.角色.主控单位ID},requestHash=abilities.hash(request);if(guard.duplicate){if(guard.receipt.requestHash!==requestHash)throw Error('操作编号不能替换原请求');return {state:guard.state,receipt:guard.receipt,idempotent:true};}const receipt=globalThis.SoulResidentRealms.execute(guard.state,request,id);globalThis.SoulPerformanceAgreements.advanceAt(guard.state);if(receipt.minutes)advanceActionTime(guard.state,request.actorId,receipt.minutes);return commit(guard.state,id,'画境管理',{...receipt,requestHash});}
    if(type==='break-custody-cell-door')return breakCurrentRoomDoor(rawState,intent,id);
    if(CUSTODY_INTENTS.has(type))return settleCustodyIntent(rawState,intent,id);
    if (type === 'world-event') return completeWorldEvent(rawState,clean(intent.eventId),id);
    if (type === 'create-player') return createPlayer(rawState, intent.draft ?? {}, id);
    if (type === 'spawn-npc') return spawnNpc(rawState, intent, id);
    if (type === 'promote-npc') return promoteNpc(rawState, intent, id);
    if (type === 'travel') return travel(rawState, intent, id,executionContext,committedTravel);
    if(type==='resume-travel'){if(!executionContext)throw Error('此入口需要本次实际控制命令');return resumeLongAction(rawState,intent,id,executionContext);}
    if(type==='trade-batch')return tradeBatch(rawState,intent,id);
    if(type==='learn-preset-blueprint'){if(Object.keys(intent).some(k=>!['id','type','actorId','itemId'].includes(k)))throw Error('学习图纸只接受实际物品');return globalThis.SoulExpeditionEngine.learnPresetBlueprint(rawState,{itemId:intent.itemId},id,{actorId:intent.actorId??rawState.角色.主控单位ID});}
    if (type === 'buy') return trade(rawState, intent, id, 'buy');
    if (type === 'sell') return trade(rawState, intent, id, 'sell');
    if (type === 'equip') return equipItem(rawState, intent, id,executionContext);
    if (type === 'unequip') return unequipItem(rawState, intent, id,executionContext);
    if (type === 'restock-shop') return restockShop(rawState, intent, id);
    if (type === 'harvest') return harvestBeast(rawState, intent, id);
    if (type === 'loot') return lootItem(rawState, intent, id);
    if (type === 'loot-coins') return lootCoins(rawState, intent, id);
    if (type === 'store-item') return moveStoredItem(rawState,intent,id);
    if (type === 'retrieve-item') return moveStoredItem(rawState,intent,id,true);
    if (type === 'fuse-soul-bone') return fuseSoulBone(rawState, intent, id);
    if (type === 'create-support-consumable') return createSupportConsumable(rawState, intent, id);
    if (type === 'safe-point-recover') return recoverAtSafePoint(rawState,intent,id,rawState.角色.主控单位ID);
    if (type === 'use-restorative-item') return useRestorativeItem(rawState,intent,id,executionContext);
    if(['dismiss-disguise','inspect-disguise','disclose-identity'].includes(type)){
      const guard=transactionStart(rawState,id,'伪装行动'),requestHash=globalThis.SoulAbilityContract.hash({...intent,id:undefined,actorId:intent.actorId??guard.state.角色.主控单位ID});if(guard.duplicate){if(guard.receipt.requestHash!==requestHash)throw Error('伪装行动编号已经用于不同请求');return {state:guard.state,receipt:guard.receipt,idempotent:true};}if(type==='inspect-disguise'&&intent.method==='contact'&&guard.state.人物.列表[intent.targetId]&&!guard.state.战斗单位.列表[intent.targetId])promoteNpcInternal(guard.state,intent.targetId);
      const actor=sceneActionActor(guard.state,intent.actorId,true,executionContext,intent);actions.resolve(guard.state,{actorId:actor.id,battleId:null,requirements:[type==='inspect-disguise'?(intent.method==='contact'?'gesture':'vision'):type==='disclose-identity'?'voice':'focus']});
      const q=globalThis.SoulDisguise.quote(guard.state,{...intent,actorId:actor.id});
      const result=type==='dismiss-disguise'?globalThis.SoulDisguise.dismiss(guard.state,actor.id,q.statusId,id):type==='disclose-identity'?globalThis.SoulDisguise.disclose(guard.state,actor.id,id):globalThis.SoulDisguise.inspect(guard.state,actor.id,q.targetId,id,q.method);
      advanceActionTime(guard.state,actor.id,1);return commit(guard.state,id,'伪装行动',{...result,requestHash});
    }
    if(type==='use-field-ability'||type==='stop-maintenance'){
      const guard=transactionStart(rawState,id,type==='use-field-ability'?'场外施放能力':'停止维持');
      if(guard.duplicate)return {state:guard.state,receipt:guard.receipt,idempotent:true};
      const actor=type==='stop-maintenance'?sceneActionActor(guard.state,intent.actorId,true,executionContext,intent):null;if(actor)actions.resolve(guard.state,{actorId:actor.id,battleId:null});
      if(type==='stop-maintenance'){
        const entry=guard.state.扩展?.abilityMaintenance?.[intent.maintenanceSourceId];
        if(!entry||entry.actorId!==actor.id)throw Error('只能停止本人正在维持的来源');
        const event=combat.stopMaintenance(guard.state,entry.id,'manual');
        return commit(guard.state,id,'停止维持',{type,actorId:actor.id,maintenance:event,summary:'已停止该来源的维持。'});
      }
      const result=performFieldUse(guard.state,intent,id,executionContext);
      return commit(result.state,id,'场外施放能力',result.receipt);
    }
    if (type === 'use-prebattle-pill') {
      const guard=transactionStart(rawState,id,'战前服用丹药');
      if(guard.duplicate)return {state:guard.state,receipt:guard.receipt,idempotent:true};
      const block=restorativeItemBlockReason(guard.state,clean(intent.actorId,guard.state.角色.主控单位ID),executionContext,intent);
      if(block)throw new Error(block);
      const actor=sceneActionActor(guard.state,intent.actorId,true,executionContext,intent);
      const result=combat.preparePrebattlePill(guard.state,actor.id,clean(intent.itemId),id,intent.modeId,clean(intent.targetId,actor.id));
      return commit(result.state,id,'战前服用丹药',result.receipt);
    }
    if(type==='retract-martial-soul'||type==='restrain-desire'){const guard=transactionStart(rawState,id,type==='restrain-desire'?'克制欲火':'收回武魂');if(guard.duplicate)return {state:guard.state,receipt:guard.receipt,idempotent:true};const actor=sceneActionActor(guard.state,intent.entityId??intent.actorId,true,executionContext,intent);const soulId=guard.state.成长.列表[actor.id]?.激活武魂ID;if(type==='retract-martial-soul'&&globalThis.SoulManifestation.hasTrait(guard.state.武魂.列表[soulId]))return globalThis.SoulManifestation.command(guard.state,{actorId:actor.id,soulId,operation:'recall'},id);actions.resolve(guard.state,{actorId:actor.id,battleId:null});if(type==='retract-martial-soul')foundation.switchActiveMartialSoul(guard.state,actor.id,'',{operationId:id});if(type==='restrain-desire'&&!globalThis.SoulAbilityExchange.desireFacts(guard.state,actor.id).strength)throw Error('当前没有欲火');const startedAt=people.now(guard.state),timing=advanceActionTime(guard.state,actor.id,type==='restrain-desire'?5:1);const check=type==='restrain-desire'&&!timing.interruption&&globalThis.SoulAbilityExchange.desireFacts(guard.state,actor.id).strength?globalThis.SoulAbilityExchange.selfControl(guard.state,actor.id,'restrain',id,people.now(guard.state),{kind:'world',actorId:actor.id,operationId:id,startedAt,endedAt:people.now(guard.state)}):null;if(check){guard.state.扩展.desireActionPayments??={};guard.state.扩展.desireActionPayments[id]={checkId:check.id,proof:clone(check.paymentProof)};}return commit(guard.state,id,'武魂与自控',{type,actorId:actor.id,...timing,check,summary:type==='restrain-desire'?'已尝试克制欲火。':'已收回武魂。'});}
    if(type==='break-restraint'){
      const guard=transactionStart(rawState,id,'日常挣脱');if(guard.duplicate)return {state:guard.state,receipt:guard.receipt,idempotent:true};
      const state=guard.state,actor=sceneActionActor(state,intent.entityId??intent.actorId,true,executionContext,intent);actions.resolve(state,{actorId:actor.id,battleId:null,...(sealing.isAwakeContained(state,actor.id)?{containmentAction:'struggle',requirements:[]}:{})});
      const profile=combat.breakFreeProfile(state,actor.id,intent.statusId,{method:intent.method,battleId:null}),soulBreakProof=profile.method==='soul'?globalThis.SoulDeviceOperations.soulBreakProof(state,actor.id,profile):null,status=clone(state.状态实例.列表[profile.statusId]),startedAt=people.now(state),actorProof=clone(state.战斗单位.列表[actor.id]),attributeStatuses=clone(controls.active(state,actor.id).filter(v=>['status.buff','transform.form','transform.martial_avatar'].includes(v.模板ID))),die=combat.makeRng(`${state.世界.seed}:daily-break:${id}`).die(20),passed=die===20||die!==1&&die+profile.modifier>=profile.dc;
      const soulBreakPayment=profile.method==='soul'?globalThis.SoulDeviceOperations.paySoulBreak(state,actor.id,profile):null;
      const timing=advanceActionTime(state,actor.id,10),receipt={id,type,actorId:actor.id,statusId:status.id,...(profile.method==='soul'?{soulBreakProof,soulBreakPayment}:{}),startedAt,endedAt:people.now(state),profile,actorProof,attributeStatuses,statusProof:status,die,passed,...timing,statusEvents:[]};
      if(passed&&!timing.interruption&&state.状态实例.列表[status.id]&&controls.breakable(state,actor.id).some(s=>s.id===status.id))combat.removeStatusLayer(state,status.id,'broken-free',receipt);
      receipt.remainingLayers=state.状态实例.列表[status.id]?.层数??0;receipt.hash=abilities.hash(receipt);(state.扩展.dailyBreakAttempts??=[]).push(clone(receipt));
      return commit(state,id,'日常挣脱',{...receipt,summary:passed?'挣脱成功，解除一层束缚。':'挣脱失败，束缚仍在。'});
    }
    if (type === 'switch-martial-soul'){const actor=sceneActionActor(rawState,intent.entityId??intent.actorId,true,executionContext,intent);const result=cycle.switchMartialSoul(rawState,{unitId:actor.id,martialSoulId:intent.martialSoulId},id);advanceActionTime(result.state,actor.id,1);return commit(result.state,id,'切换武魂',result.receipt);}
    if(type==='intimate-craft'){
      const guard=transactionStart(rawState,id,'制作情具');
      if(guard.duplicate)return {state:guard.state,receipt:guard.receipt,idempotent:true};
      const state=guard.state,quote=quoteIntimateCraft(state,intent,executionContext),actor=state.人物.列表[quote.actorId],wallet=state.钱包.列表[actor.walletId];
      wallet.gold-=quote.gold;
      const templateId=quote.templateId,neutral=globalThis.SoulWearableCore?.registered(templateId),startedAt=people.now(state);
      const item=createItem(state,templateId,actor.id,actor.inventoryContainerId,{name:quote.name,...(neutral?{provenance:{type:'neutral-wearable-craft',sourceId:id,actorId:actor.id,templateId}}:{})});
      const timing=advanceActionTime(state,actor.id,quote.minutes);
      const craftSource=neutral?{version:1,sourceId:id,actorId:actor.id,templateId,price:quote.gold,startedAt,completedAt:people.now(state)}:null;
      if(craftSource)globalThis.SoulWearableCore.registerCraft?.(state,item,craftSource);
      return commit(state,id,'制作情具',{type,actorId:actor.id,itemId:item.id,name:item.name,gold:quote.gold,...timing,...(craftSource?{craftSource}:{})});
    }
    if(['intimate-equip','intimate-detach','intimate-level','intimate-urinate'].includes(type)){
      const guard=transactionStart(rawState,id,'情具操作');
      if(guard.duplicate)return {state:guard.state,receipt:guard.receipt,idempotent:true};
      const state=guard.state,actor=sceneActionActor(state,intent.actorId,true,executionContext,intent),core=globalThis.SoulIntimateCore;
      if(!core)throw Error('情具模块未装载');
      let receipt;
      const operation={'intimate-equip':'equip','intimate-detach':'detach','intimate-level':'level'}[type],q={actorId:actor.id,targetId:clean(intent.targetId,actor.id),itemId:clean(intent.itemId),...(intent.slot?{slot:clean(intent.slot)}:{}),level:intent.level??0,forced:intent.forced===true};
      if(operation&&wearables?.route(state,operation,q))receipt=operation==='equip'?wearables.equip(state,q,id):operation==='detach'?wearables.detach(state,q,id):wearables.setLevel(state,q);
      else if(type==='intimate-equip'){
        const targetId=clean(intent.targetId,actor.id);
        receipt=core.equip(state,{actorId:actor.id,targetId,itemId:clean(intent.itemId),...(intent.slot?{slot:clean(intent.slot)}:{}),level:Number(intent.level)||0,forced:intent.forced===true,evidence:{custody:false,defeat:false}});
      }else if(type==='intimate-detach')receipt=core.detach(state,{actorId:actor.id,itemId:clean(intent.itemId)});
      else if(type==='intimate-level')receipt=core.setLevel(state,{actorId:actor.id,itemId:clean(intent.itemId),level:Number(intent.level)||0});
      else{
        const locked=core.urineLocked(state,actor.id),result=core.urinate(state,actor.id,{locked});
        if(!result.ok)throw Error(result.reason);
        receipt={ok:true};
      }
      const timing=advanceActionTime(state,actor.id,type==='intimate-urinate'?5:2);
      return commit(state,id,'情具操作',{type,actorId:actor.id,...receipt,...timing});
    }
    if(['host.set-suppression','host.set-form','host.set-appearance'].includes(type)){
      const guard=transactionStart(rawState,id,'宿主操作');
      if(guard.duplicate)return {state:guard.state,receipt:guard.receipt,idempotent:true};
      const state=guard.state,actor=sceneActionActor(state,intent.actorId,true,executionContext,intent),core=globalThis.SoulHostCore;
      if(!core)throw Error('宿主模块未装载');
      const itemId=clean(intent.itemId),item=state.物品.实例[itemId],quote=core.actions(state,item,actor.id).find(action=>action.action===type);
      if(!quote?.available)throw Error(quote?.reason||'宿主不支持这项操作');
      const proposal={...state,物品:{...state.物品,实例:{...state.物品.实例,[itemId]:clone(item)}}};
      const apply=target=>type==='host.set-suppression'?core.setSuppression(target,itemId,actor.id,intent.percent):type==='host.set-appearance'?core.setAppearance(target,itemId,actor.id,intent.preset):core.setForm(target,itemId,actor.id,intent.slot,intent.formId??null,intent.level??0);
      apply(proposal); // Validate without applying endpoint equipment to the elapsed interval.
      const timing=advanceActionTime(state,actor.id,quote.minutes);
      const current=core.actions(state,state.物品.实例[itemId],actor.id).find(action=>action.action===type),completed=!timing.interruption&&current?.available===true;
      const detail=completed?apply(state):null;
      return commit(state,id,'宿主操作',{type,actorId:actor.id,itemId,completed,detail,...timing,...(!completed?{reason:timing.interruption?.reason??current?.reason??'操作未完成'}:{})});
    }
    throw new Error(`未知世界意图：${type}`);
  }

  function domainCenterForProjection(state, domain) {
    const source = state.战斗单位.列表[domain.来源?.单位ID];
    return domain.中心模式 === '施术者跟随' && source ? source.位置 : domain.中心;
  }

  function makeNarrativeProjection(rawState, receipt = {}) {
    const state = normalizeState(rawState);
    const playerId = state.角色.主控单位ID;
    const player = state.战斗单位.列表[playerId];
    const locationId = state.地图.当前地点ID;
    const nearby = Object.values(state.人物.列表).filter(person => actions.colocated(state,playerId,person.id) && person.status === 'active').map(person => ({id: person.id, name: person.name, identity: person.identity, occupation: person.occupation, tier: person.tier}));
    const participants = state.战斗.状态 === '进行中' ? state.战斗.参与者ID列表.map(id => state.战斗单位.列表[id]).filter(Boolean).map(unit => ({id: unit.id, name: unit.名称, kind: unit.单位种类, life: unit.存活状态, hp: unit.资源.生命.当前, sp: unit.资源.魂力.当前})) : [];
    const domains = state.战斗.状态 === '进行中' ? Object.values(state.战斗.扩展?.领域实例 ?? {}).map(domain => ({
      id: domain.id, sourceUnitId: domain.来源?.单位ID ?? '', sourceMartialSoulId: domain.来源?.武魂ID ?? '', state: domain.状态,
      centerMode: domain.中心模式, center: clone(domainCenterForProjection(state, domain)), radius: domain.半径区 ?? domain.参数?.半径区 ?? 0,
      strength: domain.强度 ?? domain.参数?.领域强度 ?? 1, remainingRounds: domain.剩余回合 ?? 0,
      upkeep: clone(domain.维持 ?? {}), memberIds: clone(domain.成员ID列表 ?? []), suppressorIds: clone(domain.压制者ID列表 ?? []),
      friendlyEffectIds: (domain.友方子效果节点 ?? []).map(node => node.effectId), enemyEffectIds: (domain.敌方子效果节点 ?? []).map(node => node.effectId)
    })) : [];
    const nearbyRoutes = Object.values(state.地图.路线).flatMap(route => {
      let destinationId = '';
      if (route.from === locationId) destinationId = route.to;
      else if (route.bidirectional !== false && route.to === locationId) destinationId = route.from;
      if (!destinationId || !isLocationKnown(state,destinationId)) return [];
      const access = routeAccess(state,route,destinationId);
      return [{routeId:route.id,destinationId,destinationName:LOCATION_TEMPLATES[destinationId]?.name ?? destinationId,minutes:route.minutes,danger:route.danger,mode:route.mode,available:access.pass,blockedReasons:access.reasons}];
    });
    return {
      rule: 'Only registered actors and the immutable receipt are facts. Do not create named mechanical actors, items, money, damage, status, death or rewards.',
      player: player ? {id: player.id, name: player.名称, level: player.派生.有效等级, hp: player.资源.生命, sp: player.资源.魂力} : null,
      location: clone(LOCATION_TEMPLATES[locationId] ?? {id: locationId, name: state.场景.地点}), time: clone(state.世界.时间), registeredCast: nearby,
      backgroundCategories: clone(LOCATION_TEMPLATES[locationId]?.backgroundCategories ?? []),
      nearbyRoutes,
      combatParticipants: participants, combatDomains: domains, receipt: clone(receipt)
    };
  }

  function validateState(rawState){return validateWorld(rawState,false);}
  // Internal: accepts an exclusively owned rule result. Imported/published snapshots always use validateState.
  function validateOwnedState(rawState){return validateWorld(rawState,true);}
  function normalizedChecks(state){
    return [...foundation.normalizedStateErrors(state),...cycle.validateRingItems(state),...people.validate(state)];
  }
  // Internal commit path: the caller has compared every rule-owned field with
  // its last normalized, frozen world. All source and cross-record checks run.
  function validateNormalizedStoryWorld(state){return validateWorld(state,true,true);}
  function validateWorld(rawState,owned,alreadyNormalized=false) {
    const rawErrors=[...backgroundItems.validate(rawState),...(globalThis.SoulOpeningWorkshop?.validateState(rawState)??[]),...validateSoulBoneDrops(rawState),...cycle.validatePresetBeasts(rawState),...expeditions.validate(rawState),...cycle.validateEncounterBindings(rawState),...cycle.validateRingOperations(rawState),...expeditionValidator(rawState)];
    rawErrors.push(...validateAbilityApplications(rawState));
    rawErrors.push(...globalThis.SoulEvolution.validate(rawState));
    rawErrors.push(...(globalThis.SoulCanonArenaEngine?.validateHistoricalProjection(rawState,validateState)??[]));
    rawErrors.push(...(globalThis.SoulCanonArenaEngine?.validateNativeOrigins(rawState)??[]));
    for(const soul of Object.values(rawState.武魂?.列表??{}))rawErrors.push(...globalThis.SoulCanonicalGrowth.validateBinding(rawState,soul),...globalThis.SoulCanonicalGrowth.validateExpression(rawState,soul));
    const npcGender=rawState.世界?.npcGender;
    if(npcGender!==undefined&&!['random','male','female'].includes(npcGender))rawErrors.push('随机人物性别选项无效');
    const sources=rawState.世界?.characterSources;
    if(!Array.isArray(sources)||new Set(sources).size!==sources.length||sources.some(id=>!globalThis.SoulCanonicalGrowth.sources().some(v=>v.id===id)))rawErrors.push('跨时代人物选项无效');
    for(const person of Object.values(rawState.人物?.列表??{})){
      const source=globalThis.SoulCanonArenaEngine?.CHARACTER_CATALOG?.[person.扩展?.角色库ID]?.sourcePolicy?.sourceId;
      if(source&&!sources?.includes(source)&&!rawState.战斗单位?.列表?.[person.combatantId]?.扩展?.历史投影)rawErrors.push('跨时代人物缺少已启用的开局来源');
    }
    for(const r of Object.values(rawState.战利品?.遗骸列表??{}))if(r.type==='human-corpse')try{if(!r.position||abilities.hash(r.position)!==abilities.hash(actions.positionOf(rawState,r.unitId)))throw Error('尸体现场与实际死者位置不符');}catch(e){rawErrors.push(e.message);}
    for(const r of Object.values(rawState.战利品?.遗骸列表??{}))if(r.type==='beast-remains'){
      const encounter=Object.values(rawState.遭遇?.列表??{}).find(e=>e.战斗单位ID列表?.includes(r.unitId));
      const origin=commerceSource.origin(rawState,r.unitId);
      if(origin){if(r.profileId!==origin.profileId||!r.position||abilities.hash(r.position)!==abilities.hash(actions.positionOf(rawState,r.unitId))||r.locationId!==rawState.人物.列表[r.unitId]?.locationId||r.扩展?.originEntityId!==r.unitId)rawErrors.push('化形个体遗骸没有对应唯一人物的真实死亡现场');}
      else if(!r.position||!encounter?.position||r.locationId!==encounter.locationId||abilities.hash(r.position)!==abilities.hash(encounter.position))rawErrors.push('魂兽遗骸现场与原实际遭遇不符');
    }
    if(!plain(rawState.技能)||!plain(rawState.技能.列表))rawErrors.push('原始技能表缺失或类型无效');
    for(const ring of Object.values(rawState.魂环?.列表??{})){
      const soul=rawState.武魂?.列表?.[ring.武魂ID],unit=rawState.战斗单位?.列表?.[ring.持有者单位ID],profile=rawState.魂兽档案?.列表?.[ring.来源魂兽档案ID],tier=foundation.getAgeTier(ring.年限);
      if(!soul||!unit||soul.持有者单位ID!==unit.id||soul.魂环ID列表?.[ring.序号-1]!==ring.id||!profile||profile.年限!==ring.年限||ring.颜色!==(globalThis.SoulCanonArenaEngine?.registeredRingColor(rawState,ring)??tier.颜色)||ring.年限档!==tier.名称)rawErrors.push(`魂环${ring.id}与本人、武魂或实际来源不符`);
      if(!ring.魂技ID列表?.length||new Set(ring.魂技ID列表).size!==ring.魂技ID列表.length)rawErrors.push(`魂环${ring.id}缺少完整魂技`);
      for(const [index,id]of (ring.魂技ID列表??[]).entries()){
        const skill=rawState.技能?.列表?.[id];
        if(!skill||(!ring.扩展?.evolutionSealed&&!unit?.能力?.技能ID?.includes(id))||skill.持有者单位ID!==ring.持有者单位ID||(skill.sourceRingId??skill.来源魂环ID)!==ring.id||(skill.sourceMartialSoulId??skill.来源武魂ID)!==ring.武魂ID||(skill.sourceBeastProfileId??skill.来源魂兽档案ID)!==ring.来源魂兽档案ID||skill.sourceRingId&&skill.来源魂环ID&&skill.sourceRingId!==skill.来源魂环ID||skill.sourceMartialSoulId&&skill.来源武魂ID&&skill.sourceMartialSoulId!==skill.来源武魂ID||skill.immutableHash!==ring.扩展?.蓝图哈希列表?.[index])rawErrors.push(`魂环${ring.id}的魂技${id}缺少实际持有或来源不符`);
      }
    }
    for(const [id,skill] of Object.entries(rawState.技能?.列表??{})){
      if(skill?.id!==id)rawErrors.push(`能力${id}表键与编号不一致`);
      const check=abilities.verify(skill);if(!check.pass)rawErrors.push(`能力${id}：${check.errors.join('；')}`);
      if(skill.presetId&&(skill.sourceKind==='soul-ring'||skill.来源魂环ID||skill.sourceRingId)){
        const preset=presets.get(skill.presetId),ring=rawState.魂环?.列表?.[skill.sourceRingId??skill.来源魂环ID],operation=rawState.魂环?.operations?.[ring?.扩展?.absorptionTransactionId];
        const frozen=operation?.kind==='absorb'&&operation.receipt?.ringId===ring?.id&&operation.requestHash===abilities.hash(operation.request)&&operation.receiptHash===abilities.hash(operation.receipt)?operation.receipt.skillDefinitions?.find(expected=>expected.id===id):null;
        const signature=frozen?{pass:frozen.presetId===skill.presetId&&frozen.artId===skill.artId&&abilities.fingerprint(frozen)===abilities.fingerprint(skill)}:presets.verifySignature(skill.presetId,skill),gates=frozen?{minimumRingOrdinal:frozen.ringOrdinal,minimumYears:frozen.ageYears}:preset&&presets.gates(preset.id);
        if(!preset||preset.category!=='魂技'||skill.artId!==(frozen?.artId??preset.artId)||!signature.pass||(skill.ringOrdinal??0)<(gates?.minimumRingOrdinal??1)||(skill.ageYears??0)<(gates?.minimumYears??1)){
          const paid=rawState.成长?.列表?.[skill.持有者单位ID]?.扩展?.backgroundHistory;
          const row=paid?.records?.find(r=>r.ringId===ring?.id&&r.profileId===ring.来源魂兽档案ID&&r.selectionId===ring.扩展?.selectionId);
          const original=row?.skillDefinitions?.find(s=>s.id===id);
          if(!original||paid.sourceId!==ring.扩展?.backgroundSourceId||paid.soulId!==ring.武魂ID||original.presetId!==skill.presetId||original.artId!==skill.artId||
             !abilities.verify(original).pass||abilities.fingerprint(original)!==abilities.fingerprint(skill)||!presets.verifyHistoricalRing(skill.presetId,skill))rawErrors.push(`精品魂技${id}完整配方、身份或魂环门槛不符`);
        }
      }
      rawErrors.push(...effects.validateValueBasis(skill,skill?.sourceKind==='soul-ring'||!!skill?.来源魂环ID||!!skill?.sourceRingId).map(error=>`能力${id}：${error}`));
    }
    for(const soul of Object.values(rawState.武魂?.列表??{})){
      const base=soul.扩展?.结构化武魂?.baseAction;
      if(!abilities.verify(base).pass||!abilities.verify(soul.扩展?.专属基础动作).pass||abilities.fingerprint(base)!==abilities.fingerprint(soul.扩展?.专属基础动作??{}))rawErrors.push(`武魂${soul.id}基础动作合同无效`);
    }
    for(const unit of Object.values(rawState.战斗单位?.列表??{})){
      if(unit.单位种类!=='魂兽'&&!unit.扩展?.普通攻击档案)rawErrors.push(`单位${unit.id}普通攻击合同缺失`);
      for(const id of unit.能力?.技能ID??[])if(!rawState.技能?.列表?.[id])rawErrors.push(`单位${unit.id}能力引用${id}缺失`);
      for(const key of ['普通攻击档案','武魂基础动作'])if(unit.扩展?.[key]&&!abilities.verify(unit.扩展[key]).pass)rawErrors.push(`单位${unit.id}${key}合同无效`);
      const soul=foundation.activeMartialSoul(rawState,unit.id);
      if(unit.单位种类!=='魂兽'&&soul&&abilities.fingerprint(unit.扩展?.武魂基础动作??{})!==abilities.fingerprint(soul.扩展?.结构化武魂?.baseAction??{}))rawErrors.push(`单位${unit.id}基础动作与来源武魂不一致`);
    }
    for(const item of Object.values(rawState.物品?.实例??{}))try{
      const preset=presets?.get(item.templateId);
      if(preset&&['魂导器','暗器','丹药','毒药','拘束器'].includes(preset.category)&&(item.payload?.presetId!==preset.id||item.payload?.artId!==preset.artId||item.type!==(ITEM_TEMPLATES[item.templateId]?.type??preset.category)))rawErrors.push(`精品物品${item.id}登记身份与原商品模板不一致`);
      const expected=itemAbilityFingerprint(item);if(expected&&expected!==item.扩展?.abilityDefinitionHash)rawErrors.push(`物品${item.id}能力来源指纹不一致或缺失`);
    }catch(error){rawErrors.push(`物品${item.id}能力来源无效：${error.message}`);}
    try{
      const projected={...rawState,技能:{列表:{}},战斗单位:{列表:Object.fromEntries(Object.keys(rawState.战斗单位?.列表??{}).map(id=>[id,{能力:{技能ID:[]}}]))},
        物品:clone(rawState.物品),装备:rawState.装备,人物:rawState.人物,容器:rawState.容器,扩展:rawState.扩展,世界:rawState.世界};
      syncItemGrantedActions(projected);
      const kinds=new Set(['soul-device','soul-bone','hidden-weapon','consumable']);
      const expected=Object.values(projected.技能.列表).filter(skill=>kinds.has(skill.sourceKind));
      const actual=Object.values(rawState.技能?.列表??{}).filter(skill=>kinds.has(skill?.sourceKind));
      const mismatched=expected.filter(skill=>abilities.fingerprint(skill)!==abilities.fingerprint(rawState.技能?.列表?.[skill.id]??{})).map(skill=>skill.id);
      const extra=actual.filter(skill=>!expected.some(candidate=>candidate.id===skill.id)).map(skill=>skill.id);
      if(mismatched.length||extra.length)rawErrors.push(`物品授予能力与原始来源合同不一致：${[...mismatched,...extra].join('、')}`);
    }catch(error){rawErrors.push(`物品能力归属无效：${error.message}`);}
    for(const profile of Object.values(rawState.魂兽档案?.列表??{}))if(profile.扩展?.能力账本)try{effects.validateBeastCompilation(profile,profile.扩展.能力账本);}catch(error){rawErrors.push(`魂兽${profile.id}能力来源无效：${error.message}`);}
    for(const pending of Object.values(rawState.魂环?.待选择??{})){
      for(const candidate of pending.candidates??[]){
        if(candidate.fingerprint!==effects.ringSkillPackageFingerprint(candidate))rawErrors.push(`待选魂环${pending.id}完整合同指纹不一致`);
        for(const skill of candidate.skills??[]){
          if(!abilities.verify(skill).pass)rawErrors.push(`待选能力${skill.id}完整合同指纹不一致`);
          rawErrors.push(...effects.validateValueBasis(skill,true).map(error=>`待选能力${skill.id}：${error}`));
        }
      }
      if(pending.mechanicsHash!==stableHash(JSON.stringify((pending.candidates??[]).map(c=>c.fingerprint))).toString(16).padStart(8,'0'))rawErrors.push(`待选魂环${pending.id}机械组指纹不一致`);
    }
    let state=owned?null:normalizeState(rawState);
    const checked=state?normalizedChecks(state):null;
    const rawContractErrors = [...combat.validateBattles(rawState),...combat.validateMaintenance(rawState),...combat.validateWorldStatuses(rawState),...creation.validate(rawState),...controls.validate(rawState),...globalThis.SoulAbilityExchange.validate(rawState),...influence.validate(rawState),...globalThis.SoulResidentRealms.validate(rawState),...globalThis.SoulObedience.validate(rawState),...globalThis.SoulPerformanceAgreements.validate(rawState),...globalThis.SoulPersonContracts.validate(rawState),...globalThis.SoulPractice.validate(rawState),...globalThis.SoulPersonGrowth.validate(rawState),...globalThis.SoulConversations.validate(rawState),...globalThis.SoulPersonShame.validate(rawState),...globalThis.SoulRealmArrangements.validate(rawState),...globalThis.SoulCombatDeployments.validate(rawState),...globalThis.SoulExperiences.validate(rawState),...globalThis.SoulConsciousness.validate(rawState),...custody.validate(rawState,{validateCaptureSource:globalThis.SoulResidentRealms.captureSource,validCommunicationProof:social.validCommunicationProof,masksAtOrder:social.masksAtOrder,remembers:social.remembers,validateControlSourceProof:combat.validateControlSourceProof,validateTransfer:(s,e,p)=>/^background-(?:purchase|found):/.test(e.offerId??'')?globalThis.SoulBackgroundOpening.validateTransfer(s,e,p):e.offerId?.startsWith('asset-lot:')?sealing.validateAuctionTransfer(s,e,p):e.offerId?.startsWith('custody-lot:')?auction.validateTransfer(s,e,p):market.validateTransfer(s,e,p),validateDeviceTransfer:(s,e)=>/^background-(?:purchase|found):/.test(e.offerId??'')?globalThis.SoulBackgroundOpening.validateDeviceTransfer(s,e):e.offerId?.startsWith('asset-lot:')?sealing.validateAuctionDeviceTransfer(s,e):e.offerId?.startsWith('custody-lot:')?auction.validateDeviceTransfer(s,e):market.validateDeviceTransfer(s,e)}),...market.validate(rawState),...auction.validate(rawState),...logistics.validate(rawState,logisticsHooks()),...social.validate(rawState,logisticsHooks()),...gifts.validate(rawState),...rescue.validate(rawState,logisticsHooks()),...cooperation.validate(rawState,cooperationHooks()),...preparations.validate(rawState),...fieldControl.validate(rawState)];
    validateCustodyEscapes(rawState,rawContractErrors);
    rawContractErrors.push(...combat.validatePreparedPills(rawState));
    rawContractErrors.push(...(globalThis.SoulHostCore?.validateState(rawState)??[]));
    rawContractErrors.push(...globalThis.SoulDeviceLocks.validate(rawState));
    rawContractErrors.push(...(wearables?.validateState(rawState)??[]));
    rawContractErrors.push(...(globalThis.SoulBackgroundOpening?.validate(rawState)??[]));
    rawContractErrors.push(...poison.validate(rawState),...assets.validate(rawState),...designs.validate(globalThis.SoulWorldEngine),...stock.validate(rawState),...globalThis.SoulCommerceAuctionSupply.validate(rawState),...publicAuction.validate(rawState),...sealing.validate(rawState),...commerceSource.validate(rawState),...commerceMessages.validate(rawState));
    // Inspect raw source proofs and bindings before owned normalization can alter a field.
    state??=alreadyNormalized?rawState:normalizeWorld(rawState,true);
    const errors=[...rawErrors,...(checked??normalizedChecks(state)),...rawContractErrors];
    if(state.角色.已建立&&!state.人物.列表[state.角色.主控单位ID])errors.push('主控人物记录缺失，不能重新创建寿命或物品');
    validateNpcPlans(state,errors);
    validateLongActions(state,errors);
    validateCityStages(state,errors);validateNpcRequests(state,errors);
    for(const personId of Object.keys(state.人物.列表)){const owners=partyLeadersOf(state,personId),occupied=occupiedCompanionIds(state,personId);const old=(state.人物.列表[personId].扩展?.社交约定??[]).filter(r=>r.kind==='party'&&r.status==='completed');if(old.length+cooperation.table(state).agreements.filter(r=>r.memberId===personId&&!cooperation.invalidReason(state,r)).length>1)errors.push('同一人物不能重复加入队伍');if(owners.length>1||owners.length&&occupied.length)errors.push('人物存在冲突的实际队伍归属');if(occupied.length>3)errors.push('队伍超过四人上限');}
    const members=partyMembers(state);
    if(new Set(members.map(p=>p.personId)).size!==members.length)errors.push('同一人物不能重复加入队伍');
    for(const p of members)if(!state.战斗单位.列表[p.unitId]&&NPC_ARCHETYPES[state.人物.列表[p.personId].扩展?.archetypeId]?.full||(state.远征?.companionContracts??[]).some(c=>c.unitId===p.personId))errors.push('同行身份重复或缺少实际能力');
    const situations=state.世界.opening?.situations;
    if(situations!==undefined){
      if(!Array.isArray(situations)||situations.length>4)errors.push('开局处境记录无效');
      else {const kinds=new Set();for(const r of situations){const d=talents.SITUATIONS[r.kind];
        if(!d||kinds.has(r.kind)||!['story','points'].includes(r.benefit)||r.id!==`situation:${state.角色.主控单位ID}:${r.kind}`||r.sourceId!==state.世界.opening.committedTransactionId||!state.人物.列表[r.personId]||r.locationId!=='loc-notting-city'||!Number.isSafeInteger(r.dueDay)||r.dueDay!==r.createdAt?.day+d.days||r.deposit!==d.deposit||r.pointsGranted!==(r.benefit==='points'?d.points:0)||!({estate:['active','expired','declined','completed'],debt:['active','overdue','completed'],referral:['active','expired','declined','available','used'],delivery:['active','expired','declined','completed','returned']}[r.kind]??[]).includes(r.status)||r.discountGold!==(r.benefit==='story'?(d.discount??0):0)||!Array.isArray(r.events)||r.events[0]?.type!=='created')errors.push('开局处境来源、期限或状态无效');
        if(d&&r.kind==='debt'&&![d.fee,d.fee+d.lateFee].includes(r.owed))errors.push('处境债务金额无效');
        if(r.kind==='delivery'&&!state.物品.实例[r.itemId])errors.push('受托物处境缺少原物品');kinds.add(r.kind);
      }}
    }
    for (const skill of Object.values(state.技能.列表)) {
      const contract=abilities.validate(skill);
      if(!contract.pass)errors.push(`技能${skill.id}合同非法：${contract.errors.join('；')}`);
      if (!skill.effectGraph) continue;
      if(skill.effectGraph.nodes?.some(node=>node.effectId.startsWith('passive.')))errors.push(`技能${skill.id}不能登记装备专用常驻词条`);
      const validation = effects.validateGraph(skill.effectGraph, {
        ageTier:skill.ageTier ?? '十万年', mechanismCap:skill.mechanismCap ?? '规则'
      });
      if (!validation.pass) errors.push(`技能${skill.id}效果非法：${validation.errors.join('；')}`);
    }
    const ownership = {};
    for (const container of Object.values(state.容器.列表)) {
      if(container.type==='inventory'&&(container.capacity?.infinite!==true||Object.hasOwn(container.capacity,'slots')))errors.push(`人物行囊${container.id}容量格式无效`);
      if(container.type==='location-stash')try{containerStoragePosition(state,container);}catch(error){errors.push(`暂存容器${container.id}：${error.message}`);}
      const seen = new Set();
      for (const itemId of container.itemIds ?? []) {
        if (seen.has(itemId)) errors.push(`容器${container.id}重复引用物品${itemId}`);
        seen.add(itemId);
        const item = state.物品.实例[itemId];
        if (!item) errors.push(`容器${container.id}引用不存在物品${itemId}`);
        else if (item.containerId !== container.id) errors.push(`物品${itemId}容器反向引用不一致`);
        ownership[itemId] = (ownership[itemId] ?? 0) + 1;
      }
    }
    for (const item of Object.values(state.物品.实例)) if (ownership[item.id] !== 1) errors.push(`物品${item.id}必须且只能属于一个容器`);
    for (const wallet of Object.values(state.钱包.列表)) if (!Number.isInteger(wallet.gold) || wallet.gold < 0) errors.push(`钱包${wallet.id}金额非法`);
    const travelSteps=(state.世界.longActions??[]).filter(a=>a.kind==='travel').flatMap(a=>a.steps.map(step=>({action:a,step})));
    const consumedTransits=new Set(travelSteps.flatMap(({action,step})=>step.legs.filter(l=>l.resumes).flatMap(l=>[action.ownerId,...step.companionIds].map(id=>`${l.resumes.actionId}:${l.resumes.sourceId}:${id}`))));
    for(const {action,step} of travelSteps)if(step.legs.at(-1)?.arrived===false){
      for(const id of [action.ownerId,...step.companionIds]){if(consumedTransits.has(`${action.id}:${step.sourceId}:${id}`)||logistics.transitConsumed(state,{actionId:action.id,stepSourceId:step.sourceId},id))continue;const t=state.人物.列表[id]?.transit;if(!t||t.actionId!==action.id||t.stepSourceId!==step.sourceId)errors.push(`人物${id}缺少尚未走完的实际途中位置`);}
    }
    for (const person of Object.values(state.人物.列表)) {
      if(person.transit){
        const t=person.transit,route=ROUTE_TEMPLATES[t.routeId],action=state.世界.longActions?.find(a=>a.id===t.actionId),step=action?.steps?.find(s=>s.sourceId===t.stepSourceId),escortSource=transitSource(state,t,person.id),partial=escortSource??step?.legs?.at(-1),participants=escortSource?.personIds??(action?[action.ownerId,...(step.companionIds??[])]:[]),after=escortSource?.after??npcMinute(step?.after??{});
        if(consumedTransits.has(`${t.actionId}:${t.stepSourceId}:${person.id}`)||logistics.transitConsumed(state,t,person.id)||person.locationId!==''||!route||!partial||partial.arrived!==false||!participants.includes(person.id)||t.routeId!==partial.routeId||t.from!==partial.from||t.to!==partial.to||t.elapsedMinutes!==partial.endOffset||t.totalMinutes!==route.minutes||t.startedAt!==partial.startedAt||t.version!==1||t.progressUnits!==partial.travel?.progressUnits||t.totalUnits!==route.minutes*4||t.rateUnits!==partial.travel?.rateUnits)errors.push(`人物${person.id}途中位置缺少真实路段来源`);
      }
      if (!state.钱包.列表[person.walletId]) errors.push(`人物${person.id}缺少钱包`);
      if (!state.容器.列表[person.inventoryContainerId]) errors.push(`人物${person.id}缺少背包`);
      if (person.tier === 'full' && !state.战斗单位.列表[person.combatantId]) errors.push(`完整人物${person.id}缺少战斗单位`);
    }
    for (const unit of Object.values(state.战斗单位.列表)) {
      if (!unit.能力?.基础动作ID?.includes('ordinary.attack')) errors.push(`战斗单位${unit.id}缺少独立普通攻击`);
    }
    const avatarsByUnit = {};
    for (const status of Object.values(state.状态实例.列表)) {
      if (status.模板ID !== 'transform.martial_avatar') continue;
      avatarsByUnit[status.目标单位ID] = (avatarsByUnit[status.目标单位ID] ?? 0) + 1;
      if (!state.武魂.列表[status.来源?.武魂ID]) errors.push(`武魂真身${status.id}缺少来源武魂`);
      const nativeSkill=state.技能.列表[status.来源?.技能ID];
      const native=foundation.nativeOriginDefinition(state.战斗单位.列表[status.目标单位ID]);
      if (!state.魂环.列表[status.来源?.魂环ID]&&!(native&&nativeSkill?.sourceKind==='native-origin'&&nativeSkill.sourceNativeOriginId===native.id&&nativeSkill.持有者单位ID===status.目标单位ID)) errors.push(`武魂真身${status.id}缺少来源能力`);
    }
    for (const [unitId, count] of Object.entries(avatarsByUnit)) if (count > 1) errors.push(`战斗单位${unitId}同时存在多个武魂真身`);
    for(const battle of [state.战斗,...Object.values(state.世界.backgroundBattles??{})])for (const domain of Object.values(battle.扩展?.领域实例 ?? {})) {
      if (!state.战斗单位.列表[domain.来源?.单位ID]) errors.push(`领域${domain.id}缺少来源单位`);
      if (!(domain.子效果节点 ?? []).length) errors.push(`领域${domain.id}没有可执行子效果`);
      for (const child of domain.子效果节点 ?? []) if (!['敌方', '友方', '所有'].includes(child.params?.领域阵营)) errors.push(`领域${domain.id}子效果${child.effectId}缺少显式阵营`);
      for (const unitId of domain.成员ID列表 ?? []) if (!state.战斗单位.列表[unitId]||!battle.参与者ID列表.includes(unitId)) errors.push(`领域${domain.id}引用不存在成员${unitId}`);
      for (const suppressorId of domain.压制者ID列表 ?? []) if (!battle.扩展.领域实例?.[suppressorId]) errors.push(`领域${domain.id}引用不存在压制者${suppressorId}`);
      if (!Number.isFinite(Number(domain.支配总值))) errors.push(`领域${domain.id}缺少确定性支配总值`);
    }
    for (const [entityId, config] of Object.entries(state.装备.配置)) {
      for (const [slot, itemId] of Object.entries(config.slots ?? {})) {
        if (!itemId) continue;
        const item = state.物品.实例[itemId];
        const template = item && ITEM_TEMPLATES[item.templateId];
        if (!EQUIPMENT_SLOTS.includes(slot) || !item || item.type !== '魂导器' || template?.type !== '魂导器' || item.ownerEntityId !== entityId) errors.push(`魂导器槽${entityId}/${slot}来源非法`);
      }
      for (const [slot, itemId] of Object.entries(config.soulBoneSlots ?? {})) {
        if (!itemId) continue;
        const item = state.物品.实例[itemId];
        if (!item || item.type !== '魂骨' || item.boundToEntityId !== entityId || item.payload?.slot !== slot) errors.push(`魂骨槽${entityId}/${slot}绑定非法`);
      }
    }
    for (const item of Object.values(state.物品.实例)) {
      const template = ITEM_TEMPLATES[item.templateId];
      if (template?.type === '魂导器') {
        if (!SOUL_DEVICE_CATEGORIES.includes(template.deviceCategory)) errors.push(`魂导器${item.id}类别非法`);
        if (template.deviceCategory === '储物') errors.push(`魂导器${item.id}不得提供储物空间`);
        if(template.attackProfile||item.payload?.activeSkills?.length||item.payload?.attackProfile)errors.push(`装备${item.id}能力合同形式无效`);
        const active=item.payload?.activeSkill??template.activeSkill;
        const workshop=!!globalThis.SoulOpeningWorkshop?.isItemAuthorized(state,item)||!!globalThis.SoulPaidDesign?.isItemSource(state,item);
        if(active)try{const g=active.effectGraph??effects.makeLinearGraph(active.effectSpecs);if((workshop?!(Number.isSafeInteger(active.soulPowerCost)&&active.soulPowerCost>=0&&Number.isSafeInteger(active.durabilityCost)&&active.durabilityCost>=0):!abilities.activeDeviceGraph(g,{fixedForm:item.payload?.fixedForm??template.fixedForm})||!(active.soulPowerCost>0)||!(active.durabilityCost>0))||!effects.validateGraph(g,{ageTier:active.ageTier??'十万年',mechanismCap:active.mechanismCap??'规则'}).pass)errors.push(`装备${item.id}主动能力不在已接通范围`);}catch{errors.push(`装备${item.id}主动合同无效`);}
        const graph=item.payload?.passiveEffectGraph??template.passiveEffectGraph;
        if(graph){
          const validation=effects.validateGraph(graph,{ageTier:'十万年',mechanismCap:'规则'});
          if(!validation.pass||effects.skillActivation(graph)!=='passive')errors.push(`装备${item.id}必须使用合法的常驻被动效果图`);
        }
        try{
          const shape={sourceKind:active?'soul-device':undefined,effectGraph:active?(active.effectGraph??effects.makeLinearGraph(active.effectSpecs)):graph,modifiers:merge(template.modifiers??{},item.payload?.modifiers??{}),equipmentKind:item.payload?.equipmentKind??template.equipmentKind,fixedForm:item.payload?.fixedForm??template.fixedForm,openingWorkshop:workshop};
          if(graph||Object.keys(shape.modifiers.attributes??{}).length)priceEquipment(graph,shape.modifiers);else if(!active&&!item.payload?.host)errors.push(`装备${item.id}缺少实际能力`);
          if(!workshop&&item.valuePoints!==calculateItemValue(item))errors.push(`装备${item.id}的价值与实际能力不符`);
          if(foundation.EQUIPMENT_AFFIXES.classes(shape,effects.calculateNodeCost).total>0&&!foundation.EQUIPMENT_AFFIXES.validateForm(shape,effects.calculateNodeCost))errors.push(`装备${item.id}的器型与实际能力不符`);
        }catch{errors.push(`装备${item.id}的常驻词条无法计价`);}
      }
      if (item.type !== '魂导器' && Object.keys(merge(template?.modifiers ?? {},item.payload?.modifiers ?? {}).attributes ?? {}).length) errors.push(`非永久魂导器${item.id}不能提供永久六维属性`);
      if (item.type === '魂骨') {
        const validation = validateSoulBonePayload(item.payload);
        if (!validation.pass) errors.push(`魂骨${item.id}价值或技能非法：${validation.errors.join('；')}`);
      }
      if(item.type==='辅助食品')try{supportFoodCarrier(state,item,{requireFresh:false,allowPoisoned:true});}catch(error){errors.push(`辅助食品${item.id}：${error.message}`);}
    }
    for (const shop of Object.values(state.商店.列表)) {
      if (!state.人物.列表[shop.merchantId]) errors.push(`商店${shop.id}缺少商人`);
      if (!state.容器.列表[shop.stockContainerId]) errors.push(`商店${shop.id}缺少库存容器`);
    }
    if (!state.地图.地点[state.地图.当前地点ID]) errors.push('当前地图地点不存在');
    const worldNodes = Object.values(state.地图.地点).filter(location => location.mapLevel === 'world');
    const expectedWorldNodes = LOCATION_DEFINITIONS.filter(location => location.mapLevel === 'world').length;
    if (worldNodes.length !== expectedWorldNodes) errors.push(`世界层地点数量应为${expectedWorldNodes}，实际为${worldNodes.length}`);
    for (const location of Object.values(state.地图.地点)) {
      if (!Number.isFinite(location.map?.x) || !Number.isFinite(location.map?.y)) errors.push(`地点${location.id}缺少地图坐标`);
      if (location.parentId && !state.地图.地点[location.parentId]) errors.push(`地点${location.id}的父地点不存在`);
    }
    for (const route of Object.values(state.地图.路线)) {
      if (!state.地图.地点[route.from] || !state.地图.地点[route.to]) errors.push(`路线${route.id}端点不存在`);
      if (route.minutes <= 0 || route.danger < 0 || route.danger > 100 || route.costGold < 0) errors.push(`路线${route.id}参数非法`);
    }
    return {state, errors, pass: errors.length === 0};
  }

  combat.bindWorldClock(advanceTime);

  return Object.freeze({
    commit,advanceLongTime,
    refreshItemActions:syncItemGrantedActions,refreshEquipment:refreshUnitEquipment,refreshEquipmentInPlace,selfCondensationPreview,condenseSelfRing,
    itemStoragePosition,storagePositionFacts,itemStorageAvailability,
    commerceHooks:()=>({spawn:spawnNpcInternal,move:movePeopleTo,logistics:logisticsHooks(),custody:custodyHooks()}),
    quoteSupportConsumable,supportFoodCarrier,isSelfFoodUse,abilityUseTable,abilityUseFacts,abilityApplicationAuthority,consumeAbilityPermission,validateAbilityApplications,
    executeTrade, previewTrade, previewShopPurchase, previewSinglePurchases,previewBatchTrade,tradeBatch,validateContractShopUse:assets.validateContractShopUse,
    advanceActionTime, partyRoster, partyMembers, occupiedCompanionIds, partyLeadersOf, partyOwnershipReason, partyJoinAvailability, endPartyMembership,
    escapeOptions,escapeCaptivity,
    VERSION, pointBuyCost, attributePreset, bindExpeditionValidation, bindExpeditionSchedule, STORY_CALENDAR, storyCalendarDate, storyWorldTimeAtDate, advanceTime, ITEM_VALUE_GRADES, itemGradeFromValue, itemGrade, CURRENCY, EQUIPMENT_SLOTS, SOUL_BONE_SLOTS, SOUL_BONE_VALUE_RULES, SOUL_DEVICE_CATEGORIES, SUPPORT_CONSUMABLE_RECIPES, CREATION_RULES, MARTIAL_SOUL_TEMPLATES, ITEM_TEMPLATES, IDENTITY_ARCHETYPES, NPC_ARCHETYPES, npcMartialSoulBudget, npcMartialSoulDesignBudget, npcCreationBudget,
    LOCATION_TEMPLATES, ROUTE_TEMPLATES, INITIAL_KNOWN_LOCATION_IDS, DUNGEON_ENTRANCE_LOCATION_IDS, SAFE_RECOVERY_LOCATION_IDS, PATH_MODES, SHOP_TEMPLATES, stableHash, makeRng, allocateWholeUnitBudget, beastMaterialProfiles, structuredMaterialFingerprint, addPermanentMaterialStack, compileBudgetedSoulDevice, priceEquipment, equipmentAttributes, EQUIPMENT_ATTRIBUTE_SOURCES, EQUIPMENT_ROLE_LABELS, formatCurrency, calculateItemValue, makeInitialState, normalizeState,
    CITY_DESTINATIONS, cityStageFacts, cityHistory, appointmentTravelAvailability, createAppointmentPlan, createPersonalPlan, createCollaborationPlan, npcGoalDestinations, npcSupplyOptions, createNpcSupplyRequest, npcRequestFacts, npcRequestOptions, respondNpcRequest, npcPlanFacts, npcActionScheduleReason, storyOpeningFacts, openingSituationFacts, settleOpeningSituation, progressOpeningSituations, creationPointLedger, validateCreationDraft, createPlayer, recordPlayerAttitude, playerAttitudeReason, setNpcGender, spawnNpc, promoteNpc, ensureLocationCast, ensurePossessionShell, generateRegisteredRings, previewItemPlacement, ensureLocationStash, storeItem, createItem, transferItem, equipmentSummary, equipmentCombatSummary, previewEquipment, equipItem, unequipItem,
    grantOpeningRingItems, openingGuidance, settleOpeningGuidance, WORLD_EVENTS, WORLD_QUALIFICATIONS, qualificationGuidance, custodyFacts, fieldControlOptions, previewCustodyDisposition, activeCaptivity, personalActionBlockReason, worldActionBlockReason, previewWorldEvent, listWorldEvents, completeWorldEvent, isCarriedItem, inspectItem,
    isLocationKnown, locationAccess, routeAccess, findRoute, findPath, findFreightPath, createRoutePlanner, previewIntent, previewCommittedTravel,settleCommittedTravel, intentPreviewer, intentAvailability, previewFieldIntents, previewAbilityRequests, settleIntent, travel, waitUntil, work, workFacts, cultivate, cultivationFacts, resumeLongAction, abandonLongAction, longActionFacts, quotePrice, currentItemValue, trade, restockShop, reconcileAftermath, isExpeditionRemains, harvestBeast, lootItem, lootCoins, fuseSoulBone, createSupportConsumable, partyRecoveryPreview, recoverParty, recoverAtSafePoint,
    settlePersonDeath, recoverRevivalRemains, previewGift, soulBoneChance, soulBoneSkillCount, calculateSoulBoneBudget, soulBoneBlueprint, validateSoulBonePayload, isCanonicalSoulBone, applySoulBoneSkillNarrative, createSoulBoneItem, makeNarrativeProjection, validateState, validateOwnedState, validateNormalizedStoryWorld
  });
});

