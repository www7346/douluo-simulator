(function(root,factory){const api=factory(root);if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulPresetCatalog=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
 'use strict';
 const VERSION=1,CATEGORIES=Object.freeze(['武魂','魂技','魂导器','暗器','丹药','毒药','魂兽','魂骨','拘束器','消耗品']);
 const FOUNDATION_COUNTS=Object.freeze({'武魂':50,'魂技':99,'魂导器':32,'暗器':21,'丹药':12,'毒药':12,'魂兽':40,'魂骨':12,'拘束器':10});
 const clone=v=>JSON.parse(JSON.stringify(v));
 const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
 const get=(name,path)=>root?.[name]??(typeof require==='function'?require(path):null);
 const prose=get('SoulSkillProse','../../shared/skill-prose-core.js');
 function providers(){return {effects:get('SoulEffectCompiler','./effects-core.js'),martial:get('SoulMartialSoulCore','./martial-soul-core.js'),foundation:get('SoulCombatFoundation','./foundation-core.js'),abilities:get('SoulAbilityContract','./ability-contract-core.js'),world:root?.SoulWorldEngine,custody:get('SoulCustodyCore','./custody-core.js')};}
 function authored(){return [get('SoulPresetSouls','./preset-souls-core.js'),get('SoulPresetSkills','./preset-skills-core.js'),get('SoulPresetItems','./preset-items-core.js'),get('SoulPresetBeasts','./preset-beasts-core.js')].flatMap(v=>v?.ENTRIES??[]);}
 function retainedShopEntries(base,p){
  if(!p.world||!root?.SoulCommerceDesigns)return [];
  const represented=new Set(base.map(v=>v.recipe?.templateId).filter(Boolean));
  const cards=new Map(root.SoulCommerceDesigns.designCards(p.world).map(v=>[v.id,v]));
  return root.SoulCommerceDesigns.SHOP_IDS.filter(id=>!represented.has(id)).map(id=>{
   const t=p.world.ITEM_TEMPLATES[id],card=cards.get(id);
   const disposition=t.activeSkill&&p.abilities.consumableDisposition(t.activeSkill);
   const category=t.tags?.includes('灵魂契约')?'消耗品':p.custody.DEVICES[id]?'拘束器':t.type==='毒药'||disposition?.harmful&&!disposition?.beneficial?'毒药':['给养','消耗品'].includes(t.type)?'丹药':t.type;
   const art=get('SoulPresetArt','./preset-art-core.js').get(`shop:${id}`);if(!art)throw Error(`保留商品缺少明确图像绑定：${id}`);
   return {id:`shop:${id}`,category,productType:t.type,name:t.name,description:t.description??card?.purchaseReason??'按已登记机制执行。',appearance:card?.appearance??t.description??t.name,imagePrompt:`斗罗物品插画；${card?.appearance??t.description??t.name}；无文字。`,artId:art.artId,artPath:art.artPath,catalogKind:'retained-shop',era:t.tags?.includes('斗二跨时代')?'斗罗大陆第二部稀有渠道':'当前世界',source:{kind:'registered-shop',reference:'现有人工商品目录',canonName:null,adaptation:'保留已登记模板的全部原始机制。',note:t.lore??card?.origin??'现有商品'},tags:clone(t.tags??[]),gates:{minimumYears:1,requiredAttributes:[],requiredChannels:[],rarity:t.tags?.some(v=>/斗二|跨时代|九级/.test(v))?'跨时代稀有':'常规'},recipe:{templateId:id,registeredTemplate:true,productType:t.type}};
  });
 }
 let entriesCache=null,entriesKey=null,byIdCache=null,canonicalEntries=[];const soulEligibility=new Map();
 function registerCanonicalEntries(value){canonicalEntries=freeze(clone(value));entriesCache=null;entriesKey=null;byIdCache=null;soulEligibility.clear();}
 function entries(){const modules=[get('SoulPresetSouls','./preset-souls-core.js'),get('SoulPresetSkills','./preset-skills-core.js'),get('SoulPresetItems','./preset-items-core.js'),get('SoulPresetBeasts','./preset-beasts-core.js')],key=[...modules,root?.SoulWorldEngine,root?.SoulCommerceDesigns?.SHOP_IDS];if(entriesCache&&entriesKey.every((v,i)=>v===key[i]))return entriesCache;const base=[...modules.flatMap(v=>v?.ENTRIES??[]),...canonicalEntries];entriesKey=key;entriesCache=freeze([...clone(base).map(e=>e.category==='魂技'&&prose.preset(e.id)?{...e,description:prose.preset(e.id).description}:e),...retainedShopEntries(base,providers())]);byIdCache=new Map(entriesCache.map(e=>[e.id,e]));for(const e of entriesCache)if(e.recipe.templateId&&!byIdCache.has(e.recipe.templateId))byIdCache.set(e.recipe.templateId,e);soulEligibility.clear();return entriesCache;}
 function list(options={}){const q=String(options.query??'').trim();return entries().filter(v=>(!options.category||v.category===options.category)&&(!options.catalogKind||v.catalogKind===options.catalogKind)&&(!options.era||v.era===options.era)&&(!options.sourceKind||v.source.kind===options.sourceKind)&&(!q||[v.name,v.description,v.appearance,...v.tags].join(' ').includes(q)));}
 function presentation(entry,soul){
  const identity=String(soul?.名称??soul?.name??'').trim(),sourceName=entry.sourceSoulName;
  const sourceSkills=entry.recipe.requestedSkills??[],names=sourceSkills.length?sourceSkills.map(s=>s.name):[entry.name];
  const binding=soul?.扩展?.canonicalGrowth,record=binding&&root.SoulCanonArenaEngine?.CHARACTER_CATALOG?.[binding.recordId];
  const ownRoute=!!(binding&&['canonical','projection'].includes(binding.mode)&&record&&(record.identity?.canonicalId??record.id)===entry.sourceCanonicalId&&binding.slot===entry.sourceSoulIndex);
  const unchanged=()=>({name:entry.name,description:entry.description,appearance:entry.appearance,imagePrompt:entry.imagePrompt,skillNames:names});
  if(!identity||ownRoute||sourceName&&identity===sourceName)return unchanged();
  const stem=identity.replace(/[草藤]$/u,'')||identity;
  if(entry.identitySuffix){
   if(['蓝银草','蓝银皇'].includes(identity))return unchanged();
   const name=(stem+entry.identitySuffix).slice(0,16);
   return {name,skillNames:[name],description:`以${identity}的枝叶延伸缠绕双腿，目标须按层挣脱；不同时限制说话或魂力。`,appearance:`${identity}的枝叶沿地面延伸，在目标脚踝交织收紧。`,imagePrompt:`斗罗玄幻魂技插画，${identity}枝叶延伸形成${name}，无文字`};
  }
  if(!sourceName)return unchanged();
  const renamed=names.map(name=>{
   if(name.startsWith(sourceName))return (stem+name.slice(sourceName.length)).slice(0,18);
   let length=0;while(length<Math.min(sourceName.length,name.length)&&sourceName[length]===name[length])length++;
   return length>=2?(stem+name.slice(length)).slice(0,18):name;
  });
  const replacements=new Map([[sourceName,identity],...names.map((name,i)=>[name,renamed[i]])]),tokens=[...replacements.keys()].filter(Boolean).sort((a,b)=>b.length-a.length);
  const mapText=text=>{const source=String(text??'');let result='';for(let at=0;at<source.length;){const token=tokens.find(value=>source.startsWith(value,at));if(token){result+=replacements.get(token);at+=token.length;}else result+=source[at++];}return result;};
  return {name:renamed.length===1?renamed[0]:renamed.join('、'),description:mapText(entry.description),appearance:mapText(entry.appearance),imagePrompt:mapText(entry.imagePrompt),skillNames:renamed};
 }
 function entryFor(id){entries();return byIdCache.get(id)??null;}
 function rawRecipe(entry,p){
  if(!entry.recipe.registeredTemplate)return clone(entry.recipe);
  const t=p.world?.ITEM_TEMPLATES[entry.recipe.templateId];if(!t)throw Error('已登记商品模板不可用');
  if(p.custody.DEVICES[entry.recipe.templateId])return {...entry.recipe,restraint:clone(p.custody.DEVICES[entry.recipe.templateId])};
  const active=t.activeSkill??{},sourceKind=active.sourceKind??(t.type==='暗器'?'hidden-weapon':t.type==='魂导器'?'soul-device':'consumable');
  const requirements=active.requirements??(sourceKind==='consumable'?['gesture',...(['丹药','毒药','辅助食品'].includes(t.type)||['basic-soul-tonic','antidote-pill','travel-water'].includes(entry.recipe.templateId)?['ingest']:[])]:t.type==='暗器'?['gesture']:[]);
  return {...clone(active),...entry.recipe,effectSpecs:clone(active.effectSpecs??[]),effectGraph:clone(active.effectGraph??null),passiveEffectGraph:clone(t.passiveEffectGraph??null),modifiers:clone(t.modifiers??{attributes:{}}),equipmentKind:t.equipmentKind,fixedForm:clone(t.fixedForm??null),medicine:clone(active.medicine??null),requirements:clone(requirements),resourceCosts:clone(active.resourceCosts??[]),maintenanceCosts:clone(active.maintenanceCosts??[]),castModes:clone(active.castModes??[]),usageRules:clone(active.usageRules??active.扩展?.usageRules??active.扩展?.使用限制??{}),soulPowerCost:active.soulPowerCost??0,durabilityCost:active.durabilityCost??0,cooldownTurns:active.cooldownTurns??0,maxDurability:t.maxDurability??100,type:t.type};
 }
 function request(id){
  const e=entryFor(id);if(!e)throw Error(`未登记精品预设：${id}`);const r=rawRecipe(e,providers());
  if(e.category==='武魂')return {...clone(r.draft),name:e.name,presetId:e.id,sourceDescription:e.description,playerConfirmed:true};
  return {...r,name:e.name,description:e.description,appearance:e.appearance,category:e.category,presetId:e.id,namingSource:'preset',fixedDesign:true,allowProceduralFallback:false};
 }
 function branches(r){return r.requestedBranches??[{id:'main',label:r.name??'主效果',activation:r.activation??'active',optional:false,requestedEffects:r.requestedEffects??r.effectSpecs??[]}];}
 function inferGates(entry,p){
  const r=rawRecipe(entry,p),specs=[...(r.requestedSkills??[]).flatMap(s=>branches(s).flatMap(b=>b.requestedEffects??[])),...(r.requestedEffects??r.effectSpecs??[]),...(r.requestedBranches??[]).flatMap(b=>b.requestedEffects??[]),...(r.passiveNodes??[])];
  let years=entry.gates.minimumYears;const minimum={十年:1,百年:100,千年:1000,万年:10000,十万年:100000};const channels=new Set(entry.gates.requiredChannels),attributes=new Set(entry.gates.requiredAttributes),channelRequirements=[];
   const sourceAttributes=[...attributes,...(r.affinitySpectrum?.主属性??[]),...(r.affinitySpectrum?.副属性??[]),...(r.draft?.attributes??[]).map(a=>a.id)];
   for(const [id,params] of specs){const d=p.effects.EFFECT_REGISTRY[id];if(d)years=Math.max(years,minimum[d.minimumAgeTier]??1);for(const a of p.martial.effectAttributeIds(id,params,sourceAttributes))attributes.add(a);channelRequirements.push({effectId:id,parameterRequirements:clone(params),anyOf:Object.values(p.martial.CHANNEL_REGISTRY).filter(c=>p.martial.channelSupportsEffect(c,id,params)).map(c=>c.id),sourceTags:clone(d?.sourceTags??[])});}
  return {...clone(entry.gates),minimumYears:years,requiredChannels:[...channels],requiredAttributes:[...attributes],channelRequirements,sourceValidation:'武魂与来源分别购买通道，再经正式语义转译、年限、机制档及完整预算校验；通道提示本身不授予能力。'};
 }
 function graphFor(r,p){return r.effectGraph??r.passiveEffectGraph??(r.passiveNodes?p.effects.makeBranchedGraph([{id:'passive',activation:'passive',nodes:r.passiveNodes}]):r.requestedBranches?p.effects.makeBranchedGraph(r.requestedBranches.map(b=>({...b,nodes:b.requestedEffects}))):p.effects.makeLinearGraph(r.requestedEffects??r.effectSpecs??[]));}
 function itemMechanics(e,r,p){
  if(e.category==='拘束器'){const device=r.restraint??p.custody.DEVICES[r.templateId];if(!device)throw Error('拘束器模板未登记');return {name:e.name,category:e.category,presetId:e.id,sourceKind:'restraint-device',restraint:{kind:'registered-restraint',templateId:r.templateId,contractHash:p.abilities.hash(device)},disposable:false,durability:r.maxDurability??device.maxDurability??100,effects:[],description:e.description,form:e.appearance};}
  const graph=graphFor(r,p),passive=!!(r.passiveNodes||r.passiveEffectGraph),device=e.category==='魂导器';
  const form=typeof r.fixedForm==='string'?p.foundation.EQUIPMENT_AFFIXES.FORMS.find(v=>v.id===r.fixedForm):r.fixedForm;
  let mechanics={id:`${e.id}:ability`,name:e.name,category:e.category,presetId:e.id,namingSource:'preset',description:e.description,form:r.form??e.appearance,effectGraph:graph,effectSpecs:graph.nodes.map(n=>[n.effectId,clone(n.params)]),effects:graph.nodes.filter(n=>!['release','targeting','check'].includes(p.effects.EFFECT_REGISTRY[n.effectId]?.family)).map(n=>({id:n.effectId,params:clone(n.params)})),sourceKind:device?'soul-device':e.category==='暗器'?'hidden-weapon':'consumable',disposable:!device,durability:device?(r.maxDurability??100):1,durabilityCost:device&&!passive?(r.durabilityCost??1):0,soulPowerCost:passive?0:(r.soulPowerCost??0),cooldownTurns:passive?0:(r.cooldownTurns??0),requirements:passive?[]:clone(r.requirements??(e.category==='暗器'?['gesture']:['gesture','ingest'])),resourceCosts:clone(r.resourceCosts??[]),maintenanceCosts:clone(r.maintenanceCosts??[]),modifiers:clone(r.modifiers??{attributes:{}}),passiveCombat:{},equipmentKind:r.equipmentKind??'饰品',fixedForm:clone(form??null),deviceCategory:r.deviceCategory??(r.equipmentKind==='武器'?'攻击':'辅助'),subtype:r.subtype??(e.category==='暗器'?'一次性暗器':device?'魂导器':r.medicine?'药剂':'丹药'),...(['丹药','毒药'].includes(e.category)?{productPurpose:e.category==='毒药'?'harmful':'beneficial'}:{}),...(r.medicine?{medicine:clone(r.medicine)}:{})};
  for(const key of ['castModes','defaultCastMode','usageRules','usageKey','outputScale','nativeCastRank','minimumCastRank','soulPowerCostRate','exchangeContracts','productType','targetConditions','effectConditions'])if(r[key]!==undefined)mechanics[key]=clone(r[key]);
  if(device&&passive)delete mechanics.sourceKind;
  if(device&&!p.foundation.EQUIPMENT_AFFIXES.validateForm(mechanics,p.effects.calculateNodeCost))throw Error(`${e.name}魂导器器型与真实能力类别不匹配`);
  if(!device||!passive)mechanics=p.effects.sealPricedAbility(mechanics);return mechanics;
 }
 function strictSignature(r,compiled,p){
  const wanted=(r.requestedSkills?.length?r.requestedSkills.flatMap(branches):branches(r)).flatMap(b=>p.effects.makeBranchedGraph([{id:b.id,activation:b.activation,nodes:b.requestedEffects??[]}]).nodes.map(n=>({id:n.effectId,params:n.params,branchId:b.id}))),actual=compiled.effectGraph?.nodes??compiled.graph?.nodes??[];
  const preserved=(wanted,found)=>typeof wanted==='number'?typeof found==='number'&&(wanted<0?found<=wanted:found>=wanted):Array.isArray(wanted)?Array.isArray(found)&&wanted.length===found.length&&wanted.every((v,i)=>preserved(v,found[i])):wanted&&typeof wanted==='object'?found&&typeof found==='object'&&Object.entries(wanted).every(([k,v])=>preserved(v,found[k])):wanted===found;
  const used=new Set(),errors=[];for(const wantedNode of wanted){const candidates=actual.filter(n=>n.effectId===wantedNode.id&&!used.has(n.id));const match=candidates.find(n=>Object.entries(wantedNode.params??{}).every(([k,v])=>preserved(v,n.params?.[k])));if(match)used.add(match.id);else errors.push(candidates.length?`招牌参数被削弱或替换：${wantedNode.id}`:`招牌效果未保留：${wantedNode.id}`);}
  return errors;
 }
 function compile(id,context={},compareBeastUpgrades){
  const e=entryFor(id);if(!e)return {pass:false,presetId:id,errors:['未登记精品预设'],reason:'未登记精品预设'};
  const p=providers(),r=rawRecipe(e,p),errors=[];let mechanics,value,gates;
  try{
   gates=inferGates(e,p);
   if(context.budget!==undefined&&(!Number.isFinite(context.budget)||context.budget<0))throw Error('预设预算须为非负数');
   if(e.category==='武魂'){
    const draft={...r.draft,name:e.name,presetId:e.id,sourceDescription:e.description,playerConfirmed:true},receipt=p.martial.inspectDraft(draft,{budget:context.budget??90});
    if(!receipt.accepted)throw Error([...receipt.missing,...receipt.conflicts,...receipt.unsupported].map(v=>v.reason).concat(receipt.pricing.total>receipt.budget?[`武魂预算不足：${receipt.pricing.total}/${receipt.budget}`]:[]).join('；')||'这份武魂配置还有未满足的条件。');
    mechanics=p.martial.finalizeDraft(draft,{budget:context.budget??90,id:context.id??e.id});value=receipt.pricing.total;
   }else if(e.category==='魂技'){
    if(!context.martialSoul||!context.beastProfile)throw Error('需要实际武魂与魂环来源才能编译魂技');
    if(context.beastProfile.年限<gates.minimumYears)throw Error(`魂环年限不足：需要至少${gates.minimumYears}年`);
    if(gates.maximumYears!==undefined&&context.beastProfile.年限>gates.maximumYears)throw Error('此来源年限须选用对应的更高年限档位');
    if((context.ringOrdinal??1)<(gates.minimumRingOrdinal??1))throw Error(`魂环序号不足：需要至少第${gates.minimumRingOrdinal}环`);
    const contract=Object.fromEntries(['exchangeContracts','requirements','resourceCosts','maintenanceCosts','castModes','defaultCastMode','usageRules','cooldownTurns'].filter(key=>context.options?.[key]!==undefined).map(key=>[key,clone(context.options[key])]));
    const shown=presentation(e,context.martialSoul),options={preferredSkillCount:r.requestedSkills?.length??1,...context.options,...r,...contract,name:shown.name,description:shown.description,allowProceduralFallback:false};
    const expression=context.allowExpressionGrowth?root.SoulCanonicalGrowth.planExpression(context.martialSoul,e,context.beastProfile):{soul:context.martialSoul,growth:null};
    const sourceBudget=p.effects.calculateRingBudget(context.beastProfile,context.martialSoul,context.options?.compatibility??1);
    const result=p.effects.compileRingSkills({martialSoul:expression.soul,beastProfile:context.beastProfile,beastSkills:context.beastSkills??[],ringOrdinal:context.ringOrdinal??1,options,...(expression.growth?{budgetContext:{sourceBudget,expressionGrowth:expression.growth}}:{})});
    mechanics=result;const skills=result.skills??[result];errors.push(...strictSignature(r,{effectGraph:{nodes:skills.flatMap(s=>s.effectGraph?.nodes??[])}},p));if(skills.length===1&&!r.requestedSkills?.length)errors.push(...verifySignature(e.id,skills[0]).errors);if(errors.length)throw Error(errors.join('；'));for(const [index,skill]of skills.entries())Object.assign(skill,{name:shown.skillNames[index]??shown.name,presetId:e.id,artId:e.artId,namingSource:'preset',description:(!e.sourceSoulName||!context.martialSoul?.名称||e.sourceSoulName===context.martialSoul.名称?prose.authored({...skill,name:shown.skillNames[index]??shown.name,presetId:e.id}):null)??prose.compose(skill,context.martialSoul?.名称)});value=result.budget?.spent??skills.reduce((n,s)=>n+(s.budget?.spent??s.abilityValue?.netValue??0),0);
   }else if(e.category==='魂兽'){
    const years=context.years??r.years??gates.minimumYears;if(years<gates.minimumYears)throw Error(`魂兽年限不足：需要至少${gates.minimumYears}年`);
    const lineage=p.foundation.BEAST_VALUE.sourceLineage({名称:e.name,类别标签:r.categoryTags,种族特征:r.speciesTraits,属性谱:r.affinitySpectrum},r.effectSpecs);
    const profile={id:context.id??e.id,物种ID:r.speciesId,名称:e.name,年限:years,类别标签:r.categoryTags,种族特征:r.speciesTraits,解剖标签:r.anatomyTags??r.categoryTags,属性谱:r.affinitySpectrum,血脉:lineage,扩展:{}};
    const requestedSkills=r.requestedSkills??[{name:r.skillName??`${e.name}·原生能力`,requestedBranches:[{id:'main',activation:'active',optional:false,requestedEffects:r.effectSpecs}]}];
    const compilation=p.effects.compileSoulBeastSkills(profile,{seed:context.seed??e.id,requestedSkills},compareBeastUpgrades);errors.push(...strictSignature({requestedBranches:requestedSkills.flatMap(s=>s.requestedBranches??[])},{effectGraph:{nodes:compilation.skills.flatMap(s=>s.effectGraph?.nodes??[])}},p));if(errors.length)throw Error(errors.join('；'));profile.扩展.能力账本=compilation;mechanics={profile,lineage,compilation};value=p.foundation.BEAST_VALUE.quote(lineage,years).total;
   }else if(e.category==='魂骨'){
    if((context.years??r.ageYears)<gates.minimumYears)throw Error(`魂骨年限不足：需要至少${gates.minimumYears}年`);
    const graph=graphFor(r,p),validation=p.effects.validateGraph(graph,{ageTier:p.foundation.getAgeTier(context.years??r.ageYears).名称,mechanismCap:p.foundation.getAgeTier(context.years??r.ageYears).机制上限,budget:context.budget??Number.MAX_SAFE_INTEGER});if(!validation.pass)throw Error(validation.errors.join('；'));
    mechanics={slot:r.slot,ageYears:context.years??r.ageYears,attribute:r.attribute,name:e.name,description:e.description,activeSkillBlueprints:[p.effects.sealPricedAbility({id:`${e.id}:ability`,name:r.skillName??e.name,description:e.description,fixedDesign:true,effectSpecs:clone(r.effectSpecs),effectGraph:graph,requirements:r.requirements??['gesture'],cooldownTurns:r.cooldownTurns??2,soulPowerCost:r.soulPowerCost??0,sourceKind:'soul-bone'})]};value=validation.spent;
   }else{
    mechanics=itemMechanics(e,r,p);if(e.category==='拘束器')value=p.custody.DEVICES[r.templateId].price/5;else{const check=p.effects.validateGraph(mechanics.effectGraph,{ageTier:'十万年',mechanismCap:'规则',budget:context.budget??Number.MAX_SAFE_INTEGER,costContract:mechanics});if(!check.pass)throw Error(check.errors.join('；'));value=e.category==='魂导器'&&p.effects.skillActivation(mechanics.effectGraph)==='passive'?p.world?.priceEquipment(mechanics.effectGraph,mechanics.modifiers).spent??check.spent:check.spent;if(value>(context.budget??Infinity))throw Error(`预设预算不足：${value}/${context.budget}`);}
   }
   if(e.category==='魂技')for(const skill of mechanics.skills??[mechanics])p.abilities.seal(skill);
   if(value>(context.budget??Infinity))throw Error(`预设预算不足：${value}/${context.budget}`);
  }catch(error){const message=String(error?.message??error);if(!errors.includes(message))errors.push(message);}
  return {pass:!errors.length,presetId:e.id,name:e.name,category:e.category,errors,reason:errors.join('；'),gates:gates??clone(e.gates),value:value??null,mechanics:errors.length?null:mechanics,request:request(e.id),presentation:{...presentation(e,context.martialSoul),artId:e.artId,artPath:e.artPath,source:clone(e.source)}};
 }
 function quote(id,context={}){
  const e=entryFor(id);if(!e)return {pass:false,errors:['未登记精品预设']};if(e.category!=='魂技')return compile(id,context);
  const p=providers(),r=rawRecipe(e,p);try{if(context.budget!==undefined&&(!Number.isFinite(context.budget)||context.budget<0))throw Error('预设预算须为非负数');const value=p.effects.minimumDirectedCost(branches({...r,name:e.name}),r),gates=inferGates(e,p);return {pass:value<=(context.budget??Infinity),presetId:e.id,name:e.name,value,minimumValue:value,gates,errors:value>(context.budget??Infinity)?[`预设预算不足：${value}/${context.budget}`]:[],request:request(id)};}catch(error){return {pass:false,presetId:e.id,errors:[error.message],reason:error.message};}
 }
 const hash=text=>{let n=2166136261;for(const c of String(text)){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return n>>>0;};
 const mixedHash=text=>{let n=hash(text);n^=n>>>16;n=Math.imul(n,0x85ebca6b);n^=n>>>13;n=Math.imul(n,0xc2b2ae35);return (n^(n>>>16))>>>0;};
 function indexFor(seed,scope,size){if(!Number.isSafeInteger(size)||size<1)throw Error('抽取目录为空');return mixedHash(`${seed}:${scope}`)%size;}
 function routeFor(seed,scope='default',index=0){return ((hash(`${seed}:${scope}`)+Math.max(0,Math.floor(index)))%2)?'random':'preset';}
 function select(options={}){
  if(options.presetId)return compile(options.presetId,options.context??{});
  const route=routeFor(options.seed??'preset',options.scope??options.category,options.index??0);if(route==='random')return {pass:true,route,presetId:null};
  let pool;if(options.category==='武魂'){
   const budget=options.context?.budget??90,key=String(budget);entries();if(!soulEligibility.has(key)){const p=providers();soulEligibility.set(key,list({category:'武魂'}).filter(e=>p.martial.inspectDraft({...e.recipe.draft,name:e.name,sourceDescription:e.description,playerConfirmed:true},{budget}).accepted).map(e=>e.id));}pool=soulEligibility.get(key).map(id=>({e:entryFor(id)}));
  }else pool=list({category:options.category}).map(e=>({e,result:compile(e.id,options.context??{})})).filter(v=>v.result.pass);
  if(!pool.length)return {pass:false,route,presetId:null,errors:['当前武魂、魂兽与预算下，没有匹配的预设方案。'],reason:'当前武魂、魂兽与预算下，没有匹配的预设方案。'};
  const chosen=pool[hash(`${options.seed}:${options.scope??options.category}:${options.index??0}:choice`)%pool.length];return {...(chosen.result??compile(chosen.e.id,options.context??{})),route};
 }
 function itemTemplates(){
  const p=providers(),result={};for(const e of authored().filter(e=>['魂导器','暗器','丹药','毒药'].includes(e.category)&&e.recipe.templateId&&!e.recipe.registeredTemplate)){
   const r=clone(e.recipe),m=itemMechanics(e,r,p),check=p.effects.validateGraph(m.effectGraph,{ageTier:'十万年',mechanismCap:'规则',costContract:m});if(!check.pass)throw Error(`${e.name}精品模板非法：${check.errors.join('；')}`);
   const passive=e.category==='魂导器'&&p.effects.skillActivation(m.effectGraph)==='passive',value=passive?check.spent+p.foundation.EQUIPMENT_AFFIXES.priceAttributes(m.modifiers?.attributes??{}):check.spent;
   result[r.templateId]={name:e.name,type:e.category,basePrice:Math.ceil(value*5),stackable:e.category!=='魂导器',maxDurability:m.durability,presetId:e.id,artId:e.artId,payload:{presetId:e.id,artId:e.artId},description:e.description,appearance:e.appearance,lore:e.source.note,purpose:e.description,tags:[...e.tags,...(e.gates.rarity==='跨时代稀有'?['跨时代稀有']:[])],modifiers:clone(m.modifiers),equipmentKind:m.equipmentKind,fixedForm:clone(m.fixedForm),deviceCategory:m.deviceCategory,...(passive?{passiveEffectGraph:clone(m.effectGraph)}:{activeSkill:{...clone(m),effectSpecs:clone(m.effectSpecs)}})};
  }return freeze(result);
 }
 function validate(){const all=entries(),errors=[],ids=new Set();for(const e of all){if(ids.has(e.id))errors.push(`预设ID重复：${e.id}`);ids.add(e.id);for(const k of ['name','description','appearance','imagePrompt','artId'])if(!e[k])errors.push(`${e.id}缺少${k}`);if(!e.recipe||!e.source.reference)errors.push(`${e.id}缺少机械配方或来源说明`);}for(const [category,count]of Object.entries(FOUNDATION_COUNTS))if(all.filter(e=>e.category===category&&e.catalogKind==='foundation').length!==count)errors.push(`精品${category}数量不符`);return {pass:!errors.length,errors,counts:Object.fromEntries(CATEGORIES.map(c=>[c,all.filter(e=>e.category===c&&e.catalogKind==='foundation').length])),retainedShop:all.filter(e=>e.catalogKind==='retained-shop').length,total:all.length};}
 function verifySignature(id,mechanics){
  const e=entryFor(id);if(!e)return {pass:false,errors:['未登记精品预设']};
  return verifyRecipe(e.category,rawRecipe(e,providers()),mechanics);
 }
 function historicalRingEntry(id,skill){
  const active=entryFor(id);
  if(active?.category==='魂技'&&active.artId===skill.artId&&verifySignature(id,skill).pass){
    const gates=inferGates(active,providers());
    if(skill.ringOrdinal>=gates.minimumRingOrdinal&&skill.ageYears>=gates.minimumYears)return active;
  }
  const archive=root.SoulArchivedRingContracts??(typeof require==='function'?require('./archived-ring-contracts.js'):null);
  for(const index of archive?.byId[id]??[]){const prior=archive.recipes[index];
   if(prior&&prior.artId===skill.artId&&skill.ringOrdinal>=prior.minimumRingOrdinal&&skill.ageYears>=prior.minimumYears&&verifyRecipe('魂技',prior.recipe,skill).pass)return {...prior,gates:prior.gates??{minimumYears:prior.minimumYears,minimumRingOrdinal:prior.minimumRingOrdinal,requiredChannels:[],requiredAttributes:[]}};
  }
  return null;
 }
 function verifyHistoricalRing(id,skill){return !!historicalRingEntry(id,skill);}
 function verifiedRingGates(id,skill){const entry=historicalRingEntry(id,skill);if(!entry)throw Error('魂技缺少有效的已付来源合同');return inferGates(entry,providers());}
 function verifyRecipe(category,recipe,mechanics){
  const p=providers(),r=recipe.requestedSkills?.length===1?recipe.requestedSkills[0]:recipe,errors=strictSignature(r,mechanics,p),graph=mechanics.effectGraph??mechanics.graph;
  if(r.requestedBranches?.length){
   const expected=p.effects.graphBranches(p.effects.makeBranchedGraph(r.requestedBranches.map(b=>({...b,nodes:b.requestedEffects})))),actual=p.effects.graphBranches(graph);
   if(expected.length!==actual.length||expected.some((b,i)=>actual[i]?.id!==b.id||actual[i]?.activation!==b.activation||actual[i]?.optional!==b.optional))errors.push('预设分支身份、激活方式或可选关系已改变');
   for(const b of expected){const found=actual.find(v=>v.id===b.id);if(found&&strictSignature({requestedBranches:[{id:b.id,activation:b.activation,requestedEffects:b.nodes.map(n=>[n.effectId,n.params])}]},{effectGraph:{nodes:found.nodes}},p).length)errors.push(`预设分支${b.id}的效果归属已改变`);}
  }else if(p.effects.graphBranches(graph).some(b=>b.activation!=='active'))errors.push('预设主动效果不能改成永久被动');
  try{const expected=p.abilities.mechanics({...r,id:'preset-signature',effectGraph:graph}),actual=p.abilities.mechanics({...mechanics,id:'preset-signature'}),defaults={exchangeContracts:[],requirements:[],resourceCosts:[],maintenanceCosts:[],castModes:[],defaultCastMode:null,cooldownTurns:0,usageRules:{},usageKey:null};for(const [key,fallback]of Object.entries(defaults)){
   const original=expected[key]??fallback,present=actual[key]??fallback;let preserved=p.abilities.hash(original)===p.abilities.hash(present);
   if(category==='魂技'&&['requirements','resourceCosts','maintenanceCosts','exchangeContracts'].includes(key)&&Array.isArray(original)&&Array.isArray(present)){
    const remaining=present.map(row=>p.abilities.hash(row));preserved=original.every(row=>{const index=remaining.indexOf(p.abilities.hash(row));if(index<0)return false;remaining.splice(index,1);return true;});
   }
   if(category==='魂技'&&key==='cooldownTurns')preserved=Number.isSafeInteger(present)&&present>=original;
   if(!preserved)errors.push(`预设原有${({exchangeContracts:'代价交换',requirements:'施用条件',resourceCosts:'资源费用',maintenanceCosts:'维持费用',castModes:'施放方式',defaultCastMode:'默认施放方式',cooldownTurns:'冷却',usageRules:'使用次数',usageKey:'共享次数来源'})[key]}不能删除或放宽。`);
  }if(category==='魂技')p.effects.abilityValueLedger(mechanics); }catch(error){errors.push(error.message);}
  return {pass:!errors.length,errors};
 }
 function verifyRequestedSignature(recipe,skill){const errors=skill?strictSignature(recipe,skill,providers()):['缺少登记能力'];return {pass:!errors.length,errors};}
 const api={indexFor,presentation,VERSION,CATEGORIES,FOUNDATION_COUNTS,registerCanonicalEntries,list,get:entryFor,request,compile,quote,feasibility:compile,routeFor,select,validate,itemTemplates,verifySignature,verifyHistoricalRing,verifiedRingGates,verifyRequestedSignature,gates:id=>{const entry=entryFor(id);if(!entry)throw Error('精品预设不存在');return inferGates(entry,providers());}};Object.defineProperty(api,'ENTRIES',{enumerable:true,get:entries});Object.defineProperty(api,'BY_ID',{enumerable:true,get:()=>Object.fromEntries(entries().map(e=>[e.id,e]))});return Object.freeze(api);
});
