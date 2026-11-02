(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulHostPricing=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='host-pricing-v1',clone=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
  const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const host=()=>globalThis.SoulHostCore,fx=()=>globalThis.SoulEffectCompiler,world=()=>globalThis.SoulWorldEngine;
  const hash=v=>globalThis.SoulAbilityContract.hash(v),same=(a,b)=>hash(a)===hash(b);
  const only=(v,keys,label)=>{if(!object(v)||Object.keys(v).some(k=>!keys.includes(k)))throw Error(label+'含未登记字段');};
  const required=(v,label)=>{if(typeof v!=='string'||!v||v.length>160)throw Error(label+'无效');return v;};
  function channelsFor(id){return Object.values(globalThis.SoulCombatFoundation.MARTIAL_SOUL_CORE.CHANNEL_REGISTRY).filter(c=>c.effectIds?.includes(id)).map(c=>c.name);}
  function bridge(kind,label,anyOf){const values=[...new Set(anyOf)].sort();if(!values.length)throw Error(label+'缺少已登记材料桥梁');return {kind,label,anyOf:values};}
  function uniqueBridges(rows){const result=[],seen=new Set();for(const row of rows){const key=hash({kind:row.kind,anyOf:[...row.anyOf].sort()});if(!seen.has(key)){seen.add(key);result.push(clone(row));}}return result;}
  function persistentCost(id,params){return fx().calculateNodeCost(id,{...params,持续方式:'来源有效',来源依赖:'道具有效'});}
  function quoteHost(input,options={}){
    const fixed=host().normalize(input),caps=fixed.capabilities,parts=[],bridges=[];
    // This capability can reach every registered form, not only the initial slots.
    // Specialist form prices are not registered; do not sell the empty initial state as a cheap neutral subset.
    if(caps.forms)throw Error('宿主形态能力的完整可切换范围尚有未定价项，不能进入付费组合；原登记整包价格保持');
    if(options.carrierKind==='equipment'&&caps.release?.wearerLock&&!caps.release.lock)throw Error('普通装备穿戴锁缺少正式锁及外部解除通道');
    const add=(capability,budget,basis)=>{if(!Number.isSafeInteger(budget)||budget<0)throw Error('宿主计价结果无效');parts.push({capability,budget,basis});};
    if(caps.durability){
      const anchor=globalThis.SoulCustodyCore.DEVICES['restraint-slime-suit'].price/5;
      // Explicit conservative v1 coefficients use the existing registered permanent item budget anchor.
      // Item protection is not a character invulnerability node and grants no character damage immunity.
      add('durability',caps.durability.mode==='indestructible'?anchor:caps.durability.mode==='rule-only'?Math.ceil(anchor/2):0,'登记器具永久材料预算锚；normal=0，rule-only=1/2锚，indestructible=整锚');
      if(caps.durability.mode!=='normal'){bridges.push(bridge('attribute','器体保护结构',['金','土']),bridge('channel','器体保护工艺',channelsFor('payload.repair_item')));}
      if(caps.durability.breakRule){const q=globalThis.SoulDeviceLocks?.quoteBreakRule(caps.durability.breakRule);if(!q?.pass)throw Error(q?.reason??'特殊破坏合同尚未接入报价');add('durability.breakRule',q.budget,'正式规则破坏合同');bridges.push(...q.bridgeClauses);}
    }
    if(caps.release){
      add('release',caps.release.wearerLock?persistentCost('status.limb_bind',{部位:'全身',层数:1,挣脱难度加值:0}):0,'控制者解除限制按已有持续拘束成本；开放解除明确零增价');
      if(caps.release.wearerLock)bridges.push(bridge('attribute','锁定器体结构',['金','物理']),bridge('channel','锁定工艺',channelsFor('status.limb_bind')));
      if(caps.release.lock){const q=globalThis.SoulDeviceLocks?.quoteLock(caps.release.lock);if(!q?.pass)throw Error(q?.reason??'锁合同尚未接入报价');add('release.lock',q.budget,'正式锁合同');bridges.push(...q.bridgeClauses);}
    }
    if(caps.suppression){
      const s=caps.suppression,all=globalThis.SoulControlCore.ABILITY_KINDS,denied=all.filter(k=>!s.kinds.includes(k));
      const permission={allowedKinds:s.kinds,maxCastRank:s.maxRank};
      const amount=persistentCost('status.power_seal',{封印对象:'精细',范围:'全部',限制:{soulPowerPercent:0,permission}})+denied.length*fx().EFFECT_REGISTRY['status.power_seal'].baseCost+(9-s.maxRank)*22;
      add('suppression',amount,'按完整0—100%可调范围计价；许可禁类参考原封印基价；每收紧一环阶22为新v1保守系数（参考持续封印档差），不是已有环阶单价');
      bridges.push(bridge('attribute','魂力抑制回路',['灵魂','空间','暗']),bridge('channel','魂力封印工艺',channelsFor('status.power_seal')));
    }
    if(caps.binding){
      const b=caps.binding;
      add('binding',b.mode==='full'?persistentCost('status.limb_bind',{部位:'全身',层数:1,挣脱难度加值:0}):0,'仅full实际提供全身移动限制；cover/partial不虚构限制');
      if(b.mode==='full')bridges.push(bridge('attribute','拘束结构',['木','金','物理']),bridge('channel','拘束工艺',channelsFor('status.limb_bind')));
      if(b.agilityPenalty){add('binding.agilityPenalty',persistentCost('status.buff',{属性:'身法',数值:-b.agilityPenalty}),'身法负修正按原持续状态成本；不作为控制者折价负担');bridges.push(bridge('attribute','身法限制结构',['风','水','阴']),bridge('channel','属性限制工艺',['属性压制','毒蚀传递']));}
    }
    if(caps.appearance)add('appearance',0,'纯登记外观表现明确零机械增价；无隐身、伪装成功或属性收益');
    const budget=parts.reduce((n,p)=>n+p.budget,0);
    return {version:1,policy:VERSION,host:fixed,envelope:{suppression:caps.suppression?{minimumPercent:0,maximumPercent:100,kinds:clone(caps.suppression.kinds),maxRank:caps.suppression.maxRank}:null},parts,budget,valueGold:budget*5,bridgeClauses:uniqueBridges(bridges)};
  }
  function quotePayload(templateId,payload={},options={}){
    const template=world().ITEM_TEMPLATES[required(templateId,'载体')];if(!template||!['魂导器','拘束器'].includes(template.type))throw Error('宿主付费组合须采用合法可装配载体');
    const fixed=host().normalize(payload.host),device=globalThis.SoulCustodyCore?.DEVICES?.[templateId];
    if(device?.host){
      if(!same(fixed,host().normalize(device.host)))throw Error('不能替换登记宿主整包的固定定义，请选择普通载体');
      const background=payload.backgroundRestraint?globalThis.SoulBackgroundRestraints.compile(payload.backgroundRestraint.definition):null;
      if(background&&(background.definition.templateId!==templateId||!same(payload.backgroundRestraint,background.contract)))throw Error('登记载体机械合同无效');
      let valueGold=background?.priceGold??device.price,budget=valueGold/5;const parts=[{capability:'registered-bundle',budget,basis:'原登记整件合同及价值保持，不拆成六项单价'}];
      if(payload.passiveCombat&&Object.keys(payload.passiveCombat).length)throw Error('不能夹带未计价被动收益');
      if(payload.passiveEffectGraph||Object.values(payload.modifiers?.attributes??{}).some(Boolean)){const extra=world().priceEquipment(payload.passiveEffectGraph,payload.modifiers??{});valueGold+=extra.spent*5;budget+=extra.spent;parts.push({capability:'extra-permanent-effects',budget:extra.spent,basis:'新增永久收益按原价格另计'});}
      if(payload.activeSkill){const skill=payload.activeSkill,extra=fx().validateGraph(skill.effectGraph??fx().makeLinearGraph(skill.effectSpecs),{ageTier:skill.ageTier??'十万年',mechanismCap:skill.mechanismCap??'规则'});if(!extra.pass)throw Error(extra.errors.join('；'));valueGold+=extra.spent*20;budget+=extra.spent;parts.push({capability:'extra-active-effects',budget:extra.spent,basis:'新增主动收益按原主动器具价格另计'});}
      return {version:1,policy:VERSION,host:fixed,budget,hostBudget:null,valueGold,materialValue:budget,bridgeClauses:[],parts,registeredAnchor:true};
    }
    const h=quoteHost(fixed,{carrierKind:template.type==='魂导器'?'equipment':'attachment'}),parts=clone(h.parts);let baseGold=0,baseBudget=0,overlapBudget=0;let carrierDevice=device;
    if(template.type==='拘束器'){
      const q=payload.backgroundRestraint?globalThis.SoulBackgroundRestraints.compile(payload.backgroundRestraint.definition):null;
      if(q&&(q.definition.templateId!==templateId||!same(payload.backgroundRestraint,q.contract)))throw Error('载体机械合同无效');carrierDevice=q?.device??device;
      baseGold=q?.priceGold??device?.price??template.basePrice??0;baseBudget=baseGold/5;
      if(!Number.isSafeInteger(baseBudget))throw Error('原载体材料换算不是整数');
    }
    const modifiers=payload.modifiers??template.modifiers??{attributes:{}},graph=payload.passiveEffectGraph??template.passiveEffectGraph;
    if(graph||Object.values(modifiers.attributes??{}).some(Boolean)){
      const q=world().priceEquipment(graph,modifiers);baseGold+=q.spent*5;baseBudget+=q.spent;
    }
    const active=payload.activeSkill??template.activeSkill;
    if(active){const q=fx().validateGraph(active.effectGraph??fx().makeLinearGraph(active.effectSpecs),{ageTier:active.ageTier??'十万年',mechanismCap:active.mechanismCap??'规则'});if(!q.pass)throw Error(q.errors.join('；'));baseGold+=q.spent*20;baseBudget+=q.spent;}
    // Binding is a boolean movement restriction in the actual carrier projection; the same
    // whole-body restriction present in every non-released carrier mode is not a second benefit.
    // Buffs really stack and active casts have their own target/time, so neither is discounted.
    const modes=Object.entries(carrierDevice?.modes??{}).filter(([mode])=>mode!=='released').map(([,specs])=>specs);
    if(fixed.capabilities.binding?.mode==='full'&&modes.length&&modes.every(specs=>specs.some(([id,p])=>id==='status.limb_bind'&&p.部位==='全身'))){overlapBudget=parts.find(p=>p.capability==='binding')?.budget??0;parts.push({capability:'equivalent-carrier-binding',budget:-overlapBudget,basis:'载体所有有效模式已含同一全身移动限制；按实际不可叠加收益去重，原载体价格保持'});}
    const hostBudget=h.budget-overlapBudget,valueGold=baseGold+hostBudget*5,materialValue=baseBudget+hostBudget;
    if(!Number.isSafeInteger(valueGold)||valueGold<1||!Number.isSafeInteger(materialValue)||materialValue<1)throw Error('宿主组合缺少可计价的实际机械能力');
    return {...h,budget:materialValue,hostBudget,valueGold,materialValue,baseGold,baseBudget,overlapBudget,parts:[{capability:'carrier-and-original-effects',budget:baseBudget,basis:'沿用原载体和主动/被动类别换算'},...parts],registeredAnchor:false};
  }
  function normalizeDesign(category,input){
    only(input,['version','carrierTemplateId','definition'],'宿主研发设计');if(input.version!==1)throw Error('宿主研发设计版本不受支持');
    const carrierTemplateId=required(input.carrierTemplateId,'载体模板'),template=world().ITEM_TEMPLATES[carrierTemplateId];
    if(!template||template.type!==category||!['魂导器','拘束器'].includes(category))throw Error('宿主研发载体与类别不一致');
    if(!object(input.definition)||input.definition.host===undefined)throw Error('宿主研发须明确固定能力定义');
    const definition=clone(input.definition);definition.host=host().normalize(definition.host);
    if(category==='拘束器'){
      if(!globalThis.SoulCustodyCore.DEVICES[carrierTemplateId])throw Error('拘束器载体未登记');
      definition.restraint??=globalThis.SoulBackgroundRestraints.defaults(carrierTemplateId);
      if(definition.restraint.templateId!==carrierTemplateId)throw Error('拘束器定义与所选载体不一致');
    }
    return {version:1,carrierTemplateId,definition};
  }
  function quoteDesign(category,input){
    const design=normalizeDesign(category,input),compiled=globalThis.SoulOpeningWorkshop.compileDesign({id:'paid-host-design',name:'待命名宿主器具',description:'按确认的固定宿主定义制作。',appearance:'朴素的器具外形。',category,quantity:1,recipient:'player',placement:'inventory',adopted:false,definition:design.definition});
    if(compiled.templateId!==design.carrierTemplateId)throw Error('宿主定义的用途与载体模板不一致');
    const active=compiled.payload.activeSkill;
    if(active&&(!(active.soulPowerCost>0)||!(active.durabilityCost>0)))throw Error('付费宿主主动能力须沿用正式主动器具合同并实际支付魂力及耐久');
    const q=quotePayload(compiled.templateId,compiled.payload),definition=clone(compiled.design.definition);
    return {...q,design:{...design,definition},templateId:compiled.templateId,payload:clone(compiled.payload),definition};
  }
  return Object.freeze({VERSION,quoteHost,quotePayload,normalizeDesign,quoteDesign,uniqueBridges});
});
