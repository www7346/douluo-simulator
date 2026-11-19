(function attachAbilityContract(root,factory){
  const people=root?.SoulPersonCore??(typeof require==='function'?require('./person-core.js'):null);
  const controls=root?.SoulControlCore??(typeof require==='function'?require('./control-core.js'):null);
  if(!root?.SoulTargetConditions&&typeof require==='function')require('./target-condition-core.js');
  if(!root?.SoulInteriorSpaces&&typeof require==='function')require('./interior-space-core.js');
  if(!root?.SoulResidentRealms&&typeof require==='function')require('./resident-realm-core.js');
  const api=factory(people,controls);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.SoulAbilityContract=api;
})(typeof globalThis!=='undefined'?globalThis:this,function createAbilityContract(people,controls){
  'use strict';
  const REQUIREMENTS=Object.freeze(['voice','gesture','movement','contact','soul-power','martial-soul','ingest','focus']);
  const LABELS=Object.freeze({voice:'发声',gesture:'手部动作',movement:'身体动作',contact:'接触目标','soul-power':'运转魂力','martial-soul':'使用来源武魂',ingest:'经口吞服',focus:'保持专注'});
  const clone=value=>JSON.parse(JSON.stringify(value));
  const MECHANICAL_FIELDS=Object.freeze(['id','ownerKind','ownerId','持有者单位ID','sourceKind','sourceMartialSoulId','来源武魂ID','sourceRingId','来源魂环ID','sourceItemId','sourceNativeOriginId','sourceBeastProfileId','来源魂兽档案ID','speciesTemplateId','ringOrdinal','ageYears','ageTier','mechanismCap','sourceChannelIds','channelByEffect','channelByBranchEffect','castOrigin','effectGraph','effectSpecs','效果图','soulPowerCost','soulPowerCostRate','requirements','resourceCosts','maintenanceCosts','defaultCastMode','usageRules','usageKey','cooldownTurns','durabilityCost','disposable','restorativeConsumable','nativeCastRank','minimumCastRank','outputScale','budget','valueBasis','abilityValue','medicine','targetConditions','effectConditions']);
  function mechanics(skill){
    const result={version:1};
    if(skill.exchangeContracts!==undefined)result.exchangeContracts=clone(skill.exchangeContracts);
    for(const key of ['source','类型','presetId','artId'])if(skill[key]!==undefined)result[key]=clone(skill[key]);
    for(const key of MECHANICAL_FIELDS)if(skill[key]!==undefined)result[key]=clone(skill[key]);
    if(skill.castModes!==undefined)result.castModes=skill.castModes.map(({name,...mode})=>clone(mode));
    const origin={};for(const key of ['usageRules','使用限制','summonedCopy','copiedFromUnitId','copiedFromSkillId','summonedBySkillId','copiedBySkillId','outputScalePercent','copyOrigin'])if(skill.扩展?.[key]!==undefined)origin[key]=clone(skill.扩展[key]);
    if(Object.keys(origin).length)result.origin=origin;
    return result;
  }
  function canonical(value){
    if(Array.isArray(value))return value.map(canonical);
    if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
    return value;
  }
  function hash(value){
    const text=JSON.stringify(canonical(value));let a=2166136261,b=5381;
    for(let i=0;i<text.length;i++){a=Math.imul(a^text.charCodeAt(i),16777619);b=Math.imul(b,33)^text.charCodeAt(i);}
    return `ability-v1:${(a>>>0).toString(16).padStart(8,'0')}${(b>>>0).toString(16).padStart(8,'0')}`;
  }
  const fingerprint=skill=>hash(mechanics(skill));
  // Creation/binding only. Reading or importing must verify, never seal.
  function seal(skill){
    const check=validate(skill);if(!check.pass)throw Error(check.errors.join('；'));
    skill.immutableHash=fingerprint(skill);
    if(skill.扩展&&Object.hasOwn(skill.扩展,'不可变哈希'))skill.扩展.不可变哈希=skill.immutableHash;
    return skill;
  }
  function verify(skill,depth=0){
    if(depth>12)return {pass:false,errors:['能力来源层数超过上限']};
    const check=validate(skill);if(!check.pass)return check;
    if(Object.keys(skill).some(key=>key.startsWith('_')))return {pass:false,errors:['持久能力不得包含临时执行字段']};
    try{if(skill.immutableHash!==fingerprint(skill))return {pass:false,errors:['能力完整合同指纹不一致或缺失']};}
    catch{return {pass:false,errors:['能力完整合同无法读取']};}
    if(skill.castOrigin){
      const p=skill.castOrigin,compiler=globalThis.SoulEffectCompiler;
      try{if(p.version!==1||Object.keys(p).some(k=>!['version','source','rank'].includes(k))||!compiler||!verify(p.source,depth+1).pass||fingerprint(compiler.deriveSoulRingCastSkill(p.source,p.rank))!==fingerprint(skill))return {pass:false,errors:['释放强度与原始魂环能力不一致']};}catch{return {pass:false,errors:['魂环释放来源无效']};}
      return check;
    }
    if(['copied','summoned-copy'].includes(skill.sourceKind)){
      const origin=skill.扩展?.copyOrigin;
      try{if(!origin||!verify(origin.source,depth+1).pass||fingerprint(deriveCopy(origin.source,origin.spec))!==fingerprint(skill))return {pass:false,errors:['复制能力与原始合同或复制比例不一致']};}
      catch{return {pass:false,errors:['复制能力来源无效']};}
    }
    return check;
  }
  function deriveCopy(source,spec){
    const carrier=!!spec?.carrierSoulId&&spec.carrierSoulId===(source.sourceMartialSoulId||source.来源武魂ID)&&spec.kind==='summoned-copy'&&spec.scale===100&&spec.ownerId==='manifestation:'+spec.carrierSoulId+':body'&&spec.castSkillId==='manifest:'+spec.carrierSoulId&&spec.sourceUnitId===source.持有者单位ID;
    if(spec?.carrierSoulId&&!carrier)throw Error('常驻载体与原武魂来源不一致');
    if(!carrier&&source.effectGraph?.nodes?.some(n=>globalThis.SoulEffectCompiler.EFFECT_REGISTRY[n.effectId]?.copyable===false))throw Error('该能力依托独立的实体来源，不能复制或继承');
    if(!spec||!['copied','summoned-copy'].includes(spec.kind)||!Number.isFinite(spec.scale)||spec.scale<10||spec.scale>100||!spec.ownerId||!spec.sourceUnitId||!spec.id)throw Error('复制来源或比例无效');
    if(spec.discreteScale!==undefined&&spec.discreteScale!=='向下取整最少1'&&spec.discreteScale!=='不放大')throw Error('离散继承缩放规则未登记');
    const result={...clone(source),id:spec.id,name:carrier?(source.name??source.名称):`镜像·${source.name??source.名称??source.id}`,持有者单位ID:spec.ownerId,ownerId:spec.ownerId,
      sourceKind:spec.kind,sourceMartialSoulId:'',sourceRingId:'',来源武魂ID:'',来源魂环ID:'',sourceItemId:'',
      usageKey:String(source.usageKey||source.usageRules?.worldUsageGroup||source.id),outputScale:Math.min(3,Math.max(.2,Number(source.outputScale??1)*spec.scale/100))};
    delete result.castOrigin;
    result.名称=result.name;
    result.扩展={...clone(source.扩展??{}),copiedFromUnitId:spec.sourceUnitId,copiedFromSkillId:source.id,
      ...(spec.kind==='summoned-copy'?{summonedCopy:true,summonedBySkillId:spec.castSkillId,outputScalePercent:spec.scale}:{copiedBySkillId:spec.castSkillId}),
      copyOrigin:{source:clone(source),spec:clone(spec)}};
    if(spec.discreteScale==='向下取整最少1'){
      const compiler=globalThis.SoulEffectCompiler;
      if(!compiler)throw Error('复制能力缺少正式效果编译器');
      const scaled=value=>Math.max(1,Math.floor(value*spec.scale/100));
      for(const node of result.effectGraph?.nodes??[])if(['status.invisibility','status.power_seal','status.next_check_penalty'].includes(node.effectId)){
        if(Number.isInteger(node.params?.持续回合))node.params.持续回合=scaled(node.params.持续回合);
        if(node.effectId==='status.next_check_penalty')node.params.数值=-scaled(Math.abs(node.params.数值));
        node.cost=compiler.calculateNodeCost(node.effectId,node.params);
        if(node.provenance&&Number.isFinite(node.provenance.cost))node.provenance.cost=node.cost;
      }
      if(result.effectSpecs)result.effectSpecs=result.effectGraph.nodes.map(node=>[node.effectId,clone(node.params)]);
      if(result.效果图)result.效果图=clone(result.effectGraph);
      if(source.valueBasis)result.valueBasis=compiler.rawAbilityValue(result.effectGraph);
      if(source.abilityValue){result.abilityValue=compiler.abilityValueLedger(result);if(result.budget){result.budget.spent=result.abilityValue.netValue;result.budget.unallocated=Number(result.budget.available??result.budget.allocated??result.budget.spent)-result.budget.spent;}}
    }
    return seal(result);
  }
  const integer=(value,label,min=0)=>{if(!Number.isSafeInteger(value)||value<min)throw Error(`${label}必须为有效整数`);return value;};
  const SOUL_RECOVERY_POLICY = Object.freeze({
    ordinarySkillPerBattle: 2,
    strongSkillPerBattle: 1,
    consumableGroupId: 'soul-recovery-consumables',
    consumableGroupLabel: '回魂消耗品',
    consumableGroupPerBattle: 3
  });
  function skillUsageRules(skill) {
    const nodes = skill?.effectGraph?.nodes ?? [];
    const declared = skill?.usageRules ?? skill?.扩展?.usageRules ?? skill?.扩展?.使用限制 ?? {};
    const sourceKind = String(skill?.sourceKind ?? skill?.source?.kind ?? '');
    const hasFixedSoulRestore = nodes.some(node => node.effectId === 'payload.soul_restore');
    const hasStrongSoulRestore = nodes.some(node => node.effectId === 'payload.restore' && String(node.params?.魂力模式 ?? '无') !== '无');
    const restoresSoulPower = hasFixedSoulRestore || hasStrongSoulRestore;
    const declaredPerBattle = Math.max(0, Math.round(declared.perBattleLimit ?? declared.perBattle ?? declared.每场次数 ?? 0));
    const inferredPerBattle = sourceKind === 'consumable' && hasFixedSoulRestore
      ? 0
      : hasStrongSoulRestore
        ? SOUL_RECOVERY_POLICY.strongSkillPerBattle
        : hasFixedSoulRestore
          ? SOUL_RECOVERY_POLICY.ordinarySkillPerBattle
          : 0;
    const perBattleLimit = restoresSoulPower && sourceKind !== 'consumable'
      ? (declaredPerBattle > 0 ? Math.min(declaredPerBattle, inferredPerBattle) : inferredPerBattle)
      : hasStrongSoulRestore && sourceKind === 'consumable'
        ? (declaredPerBattle > 0 ? Math.min(declaredPerBattle, inferredPerBattle) : inferredPerBattle)
        : declaredPerBattle;
    const consumableRecovery = sourceKind === 'consumable' && restoresSoulPower;
    return {
      perBattleLimit,
      perBattleGroup: consumableRecovery ? SOUL_RECOVERY_POLICY.consumableGroupId : String(declared.perBattleGroup ?? declared.每场共享组 ?? ''),
      perBattleGroupLabel: consumableRecovery ? SOUL_RECOVERY_POLICY.consumableGroupLabel : String(declared.perBattleGroupLabel ?? declared.每场共享组名称 ?? ''),
      perBattleGroupLimit: consumableRecovery
        ? SOUL_RECOVERY_POLICY.consumableGroupPerBattle
        : Math.max(0, Math.round(declared.perBattleGroupLimit ?? declared.每场共享次数 ?? 0)),
      dailyLimit: Math.max(0, Math.round(declared.dailyLimit ?? declared.perDay ?? declared.每日次数 ?? 0), ...nodes.map(node => Math.max(0,Number(node.params?.每日次数 ?? 0) || 0))),
      worldCooldownDays: Math.max(0, Math.round(declared.worldCooldownDays ?? declared.世界日冷却 ?? 0), ...nodes.map(node => Math.max(0,Number(node.params?.世界日冷却 ?? 0) || 0)))
    };
  }

  function requirementsOf(skill,mode){
    const list=[...(skill.requirements??[]),...(mode?.requirements??[])];
    if(!list.every(kind=>REQUIREMENTS.includes(kind))||new Set(list).size!==list.length)throw Error('技能施放条件无效或重复');
    return list;
  }
  function fieldBranches(graph,{indivisible=false}={}){
    const compiler=globalThis.SoulEffectCompiler??(typeof require==='function'?require('./effects-core.js'):null);
    graph=compiler.immediateGraph(graph);
    const shell=n=>['release.touch','release.melee','release.projectile','target.self','target.single','target.burst','target.aura','check.save'].includes(n.effectId);
    const payload=n=>['contract.oath','trigger.contract','modifier.world_duration','payload.death','payload.soul_damage'].includes(n.effectId)||controls.canPersist(n.effectId,n.params)&&n.params?.持续方式&&n.params.持续方式!=='回合'||['payload.recon','realm.store','realm.capture','payload.heal','payload.restore','payload.soul_restore','payload.revive','payload.cleanse','payload.dispel','payload.repair_item','payload.fabricate','payload.unlock','payload.suppress_lock','payload.rule_break','payload.analyze_lock','payload.create_key','payload.arcane_lock'].includes(n.effectId)||['zone.wall','summon.entity'].includes(n.effectId)&&n.params?.持续方式==='世界分钟';
    const branches=compiler.graphBranches(graph).filter(b=>b.activation==='active');
    const result=branches.flatMap(branch=>{
      const excluded=branch.nodes.filter(n=>!shell(n)&&!payload(n));
      // A beneficial mixed skill has an explicit field-restoration use. Its
      // combat-only protection remains visible in the preview and is never run.
      const safeProjection=!indivisible&&!graph.nodes.some(n=>compiler.effectPolarity(n.effectId,n.params)==='harmful')&&excluded.every(n=>compiler.EFFECT_REGISTRY[n.effectId]?.hitRule&&!compiler.EFFECT_REGISTRY[n.effectId].hitRule.inline||['payload.shield','status.status_guard','status.haste','status.resistance_shift','status.buff'].includes(n.effectId));
      if(!branch.nodes.some(payload)||excluded.length&&!safeProjection)return [];
      return [{...branch,nodes:branch.nodes.filter(n=>shell(n)||payload(n)),excluded:excluded.map(n=>({id:n.id,effectId:n.effectId}))}];
    });
    return indivisible&&result.length!==branches.length?[]:result;
  }
  function selectFieldBranches(skill,branchIds){
    const indivisible=!!skill.medicine||skill.sourceKind==='consumable',all=fieldBranches(skill.effectGraph,{indivisible});
    if(!all.length)throw Error('这项能力没有可在场外执行的用途');
    if(branchIds!==undefined&&(!Array.isArray(branchIds)||!branchIds.length||new Set(branchIds).size!==branchIds.length||branchIds.some(id=>typeof id!=='string'||!all.some(b=>b.id===id))))throw Error('场外能力用途选择无效');
    const selected=branchIds?all.filter(b=>branchIds.includes(b.id)):indivisible?all:[all[0]];
    if(indivisible&&selected.length!==all.length)throw Error('一份药物必须按完整药效施用');
    return selected;
  }
  function fieldControlGraph(graph){return fieldBranches(graph).length>0;}
  // Derive drug disposition from the real effect graph; names and item tags never grant permission.
  function consumableDisposition(skill){
    if((skill?.sourceKind??skill?.source?.kind)!=='consumable')return null;
    const oral=requirementsOf(skill).includes('ingest')||(skill.castModes??[]).some(mode=>(mode.requirements??[]).includes('ingest'));
    const compiler=globalThis.SoulEffectCompiler??(typeof require==='function'?require('./effects-core.js'):null);
    const polarities=(compiler.immediateGraph(skill)?.nodes??[]).map(node=>compiler.effectPolarity(node.effectId,node.params));
    const harmful=polarities.includes('harmful'),beneficial=polarities.includes('beneficial');
    return {harmful,beneficial,oral,...(skill.medicine?{medicine:medicineContract(skill.medicine),routeLabel:({oral:'口服',contact:'接触',inhaled:'吸入'})[skill.medicine.route],formLabel:skill.medicine.form,doses:skill.medicine.doses,sourceDurationMinutes:skill.medicine.sourceDurationMinutes}:{}),classification:harmful?(beneficial?'含负面药效':'毒药'):'普通药物',warning:harmful?(skill.medicine?`含有害药效。按实际${({oral:'吞服',contact:'接触',inhaled:'吸入'})[skill.medicine.route]}结算，抵抗与免疫分别判定；强制吞服仍须实际制服。`:`含有害药效；对他人须有实际控制或制服依据，并明确选择${oral?'强制吞服':'强制施用'}。`):''};
  }
  function hasFieldUse(skill){return (skill.sourceKind??skill.source?.kind)==='consumable'||fieldControlGraph(skill.effectGraph)||(skill.effectGraph?.nodes??[]).some(n=>n.effectId==='modifier.next_skill');}
  function controlDeviceGraph(graph){
    const allowed=['status.power_seal','status.mind_control','status.soul_control','status.cognition_shift','transform.sex'];
    return fieldControlGraph(graph)&&graph.nodes.some(n=>n.effectId==='check.save')&&graph.nodes.some(n=>allowed.includes(n.effectId))&&graph.nodes.every(n=>n.family!=='status'&&n.family!=='payload'||allowed.includes(n.effectId));
  }
  function attackDeviceGraph(graph){
    const nodes=graph?.nodes??[],branches=graph?.branches??[];
    const allowed=['release.projectile','target.single','target.line','target.cone','target.burst','check.physical_attack','check.soul_attack','check.save','payload.damage'];
    return nodes.length>0&&nodes.length<=12&&(!branches.length||branches.length===1&&branches[0].activation==='active')&&nodes.filter(n=>n.family==='release').length===1&&nodes.some(n=>n.effectId==='release.projectile')&&nodes.filter(n=>n.family==='targeting').length===1&&nodes.filter(n=>n.family==='check').length===1&&nodes.some(n=>n.effectId==='payload.damage')&&nodes.every(n=>allowed.includes(n.effectId));
  }
  function activeDeviceGraph(graph,{fixedForm}={}){
    if(controlDeviceGraph(graph))return true;
    const form=globalThis.SoulCombatFoundation?.EQUIPMENT_AFFIXES.FORMS.find(f=>f.id===fixedForm?.id);
    const nodes=graph?.nodes??[],branches=graph?.branches??[];
    // A held battle pool may accompany genuine active device branches. Other
    // permanent effects still use the separate equipment contract.
    const held=branches.filter(b=>b.activation==='passive'),byId=new Map(nodes.map(n=>[n.id,n]));
    const legalHeld=held.every(b=>Array.isArray(b.nodeIds)&&b.nodeIds.length>0&&b.nodeIds.every(id=>byId.get(id)?.effectId==='status.battle_resource'));
    return !!(form&&nodes.length>0&&nodes.every(n=>!n.effectId.startsWith('passive.'))&&legalHeld&&branches.every(b=>['active','passive'].includes(b.activation))&&(!branches.length||branches.some(b=>b.activation==='active'&&b.nodeIds?.some(id=>!['release','targeting','check'].includes(byId.get(id)?.family))))&&['id','kind','name','bodyGroup','bodyLabel'].every(k=>fixedForm[k]===form[k]));
  }
  function modeOf(skill,modeId){
    if(!Array.isArray(skill.castModes??[])||(skill.castModes??[]).length>8)throw Error('技能费用模式无效');
    const ids=new Set();
    for(const mode of skill.castModes??[]){if(!mode||typeof mode.id!=='string'||!mode.id||ids.has(mode.id))throw Error('技能费用模式编号无效');if(Object.keys(mode).some(key=>!['id','name','requirements','resourceCosts'].includes(key)))throw Error('技能费用模式包含未知字段');ids.add(mode.id);}
    if(!ids.size){if(modeId)throw Error('技能没有可选费用模式');return null;}
    const mode=skill.castModes.find(m=>m.id===(modeId??skill.defaultCastMode));
    if(!mode)throw Error('请选择已登记的技能费用模式');return mode;
  }
  function checkedCosts(costs){
    if(!Array.isArray(costs)||costs.length>16)throw Error('技能资源代价无效');
    return costs.map(cost=>{
      if(!cost||!['soulPower','health','lifespan','item'].includes(cost.kind))throw Error('未知技能资源代价');
      const allowed=cost.kind==='item'?['kind','templateId','itemId','quantity']:['kind','amount',...(cost.kind==='lifespan'?['sacrificial']:[])];
      if(Object.keys(cost).some(key=>!allowed.includes(key)))throw Error('技能资源代价包含未知字段');
      if(cost.kind==='item'){
        integer(cost.quantity,'消耗物品数量',1);
        if((typeof cost.templateId==='string'&&!!cost.templateId)===(typeof cost.itemId==='string'&&!!cost.itemId))throw Error('物品代价必须且只能指定一种模板或实例');
      }else{integer(cost.amount,`消耗${cost.kind}`,1);if(cost.kind!=='lifespan'&&cost.sacrificial)throw Error('只有寿命代价支持耗尽献祭');}
      if(cost.sacrificial!==undefined&&typeof cost.sacrificial!=='boolean')throw Error('献祭声明无效');
      return clone(cost);
    });
  }
  // Existing soulPowerCost and usageRules remain their single canonical fields.
  // resourceCosts adds other simultaneous fees; castModes adds an explicit alternative fee set.
  // Omitted arrays mean an empty declaration in schema 2, never load-time conversion.
  function describe(skill,options={}){
    if(!skill||typeof skill.id!=='string'||!skill.id)throw Error('能力合同缺少编号');
    const mode=modeOf(skill,options.modeId),requirements=requirementsOf(skill,mode);
    const costs=checkedCosts([...(skill.resourceCosts??[]),...(mode?.resourceCosts??[])]);
    const soulPowerCost=integer(options.soulPowerCost??skill.soulPowerCost??0,'魂力费用');
    if(soulPowerCost)costs.unshift({kind:'soulPower',amount:soulPowerCost});
    const maintenance=checkedCosts(skill.maintenanceCosts??[]);
    if(maintenance.some(c=>c.sacrificial))throw Error('维持代价不能自动献祭');
    const exchange=globalThis.SoulAbilityExchange??(typeof require==='function'?require('./ability-exchange-core.js'):null);
    const exchangeContracts=exchange.normalize(skill.exchangeContracts??[]);
    return {version:1,skillId:skill.id,modeId:mode?.id??'',requirements,costs,maintenance,exchangeContracts,...(skill.medicine?{medicine:medicineContract(skill.medicine)}:{})};
  }
  function medicineContract(value){
    const keys=['version','form','route','doses','sourceDurationMinutes','sourceRadius'];
    if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||Object.keys(value).some(k=>!keys.includes(k))||value.version!==1)throw Error('药剂合同格式无效');
    const routes={丸:['oral'],液:['oral','contact'],粉:['contact','inhaled'],雾:['inhaled']};
    if(!routes[value.form]?.includes(value.route)||!Number.isSafeInteger(value.doses)||(value.route==='inhaled'?![1,2,4,8].includes(value.doses):value.doses!==1))throw Error('药剂剂型、施用途径或剂量不一致');
    if(value.route==='oral'?(value.sourceDurationMinutes!==0||value.sourceRadius!==0):!Number.isSafeInteger(value.sourceDurationMinutes)||value.sourceDurationMinutes<1||value.sourceDurationMinutes>60||value.sourceRadius!==(value.route==='inhaled'?10:0))throw Error('药剂外部毒源的期限或范围无效');
    return clone(value);
  }
  function medicineSourceValue(value){const m=medicineContract(value);return m.route==='oral'?0:80+22*(m.sourceDurationMinutes-1)+(m.route==='inhaled'?18*(m.sourceRadius-1):0);}
  function validate(skill){
    try{
      const conditions=globalThis.SoulTargetConditions??(typeof require==='function'?require('./target-condition-core.js'):null);
      if(skill.targetConditions!==undefined){const c=conditions.validate(skill.targetConditions);if(!c.pass)throw Error(c.errors.join('；'));}
      if(skill.effectConditions!==undefined){if(!skill.effectConditions||Array.isArray(skill.effectConditions)||typeof skill.effectConditions!=='object')throw Error('条件效果结构无效');for(const [nodeId,condition]of Object.entries(skill.effectConditions)){if(!skill.effectGraph?.nodes?.some(n=>n.id===nodeId&&conditions.CONDITIONAL_EFFECTS.includes(n.effectId))||skill.effectGraph?.branches?.some(b=>b.activation==='passive'&&b.nodeIds?.includes(nodeId)))throw Error('条件效果没有对应的已支持主动效果');const c=conditions.validate(condition);if(!c.pass)throw Error(c.errors.join('；'));}}
      if((skill.exchangeContracts??[]).some(c=>c.burdens?.some(b=>b.lockedAbilities?.some(s=>s.id===skill.id||(globalThis.SoulAbilityExchange?.origin(s)??s.id)===(globalThis.SoulAbilityExchange?.origin(skill)??skill.id)))))throw Error('不能封锁交换自身');
      if(skill.medicine!==undefined){if(skill.effectGraph?.nodes?.some(n=>n.effectId==='contract.oath'))throw Error('灵魂誓约须由当事人直接签订，不能作为药剂接触效果');if(skill.effectGraph?.nodes?.some(n=>['realm.store','realm.capture'].includes(n.effectId)))throw Error('药剂释放载体不能承载直接空间收入；请使用直接施用的空间消耗品');const m=medicineContract(skill.medicine);if(skill.sourceKind!=='consumable'||(m.route==='oral')!==requirementsOf(skill,null).includes('ingest'))throw Error('药剂途径与实际吞服条件不符');}
      if(skill.usageKey!==undefined&&(typeof skill.usageKey!=='string'||!skill.usageKey))throw Error('技能额度来源无效');
      for(const usage of [skill.usageRules,skill.扩展?.usageRules,skill.扩展?.使用限制])if(usage!==undefined){
        if(!usage||Array.isArray(usage)||typeof usage!=='object')throw Error('技能次数合同无效');
        for(const key of ['perBattleLimit','perBattle','每场次数','perBattleGroupLimit','每场共享次数','dailyLimit','perDay','每日次数','worldCooldownDays','世界日冷却'])if(usage[key]!==undefined)integer(usage[key],'技能次数/冷却');
        for(const key of ['perBattleGroup','每场共享组','worldUsageGroup'])if(usage[key]!==undefined&&(typeof usage[key]!=='string'||!usage[key]))throw Error('技能共享额度组无效');
      }
      if(skill.cooldownTurns!==undefined)integer(skill.cooldownTurns,'技能回合冷却');
      for(const key of ['nativeCastRank','minimumCastRank'])if(skill[key]!==undefined&&(integer(skill[key],'施放环阶',1)>9))throw Error('施放环阶超过上限');
      if(skill.outputScale!==undefined&&(!Number.isFinite(skill.outputScale)||skill.outputScale<=0||skill.outputScale>3))throw Error('技能效果倍率无效');
      if(skill.soulPowerCostRate!==undefined&&(!Number.isFinite(skill.soulPowerCostRate)||skill.soulPowerCostRate<0||skill.soulPowerCostRate>1))throw Error('技能魂力比例无效');
      const modes=skill.castModes??[];
      if(modes.length){for(const mode of modes)describe(skill,{modeId:mode.id});modeOf(skill,undefined);}else describe(skill);
      return {pass:true,errors:[]};
    }catch(error){return {pass:false,errors:[error.message]};}
  }
  function quote(state,actorId,skill,options={}){
    const contract=describe(skill,options),actor=state.战斗单位?.列表?.[actorId],person=state.人物?.列表?.[actorId];
    for(const targetId of options.targetIds??[]){const reason=globalThis.SoulTargetConditions?.skillReason(state,actorId,targetId,skill);if(reason)throw Error(reason);}
    if(contract.maintenance.length&&!options.maintenanceRegistered)throw Error('维持费用尚未登记持续效果来源，不能施放');
    if(!actor)throw Error('技能付款者不存在');
    if(skill.sourceKind==='native-origin'){
      if(!globalThis.SoulCanonArenaEngine?.assertNativeOriginSkill)throw Error('本源能力来源不可用');
      globalThis.SoulCanonArenaEngine.assertNativeOriginSkill(state,actor,skill);
    }
    if(person)people.assertAlive(state,actorId);
    if(actor.存活状态!=='存活'||actor.资源.生命.当前<=0)throw Error('行动者已失能，不能施放');
    const costs=[...contract.costs.filter(c=>!options.preserveOralDose||c.source!==true),...checkedCosts(options.additionalCosts??[])];
    if(options.ingestionTargetId&&options.ingestionTargetId!==actorId){
      const recipient=state.人物?.列表?.[options.ingestionTargetId],unit=state.战斗单位?.列表?.[options.ingestionTargetId];
      if(skill.sourceKind!=='consumable'||!contract.requirements.includes('ingest')||!recipient||!unit||unit.存活状态!=='存活'||unit.资源.生命.当前<=0||controls.active(state,recipient.id).some(v=>['status.sleep','status.stun'].includes(v.模板ID))||!globalThis.SoulScenePosition?.colocated(state,actorId,recipient.id))throw Error('协助给药需要同场清醒且可吞服的真实人物');
      const fieldTeam=globalThis.SoulExpeditionContext?.forActor(state,actorId);
      const teamIds=fieldTeam?[fieldTeam.leaderId,...(fieldTeam.companions??[]).filter(v=>v.active!==false).map(v=>v.unitId)]:[];
      const permitted=teamIds.includes(actorId)&&teamIds.includes(recipient.id)||globalThis.SoulWorldEngine?.partyMembers(state,actorId).some(v=>v.personId===recipient.id)||globalThis.SoulWorldEngine?.partyMembers(state,recipient.id).some(v=>v.personId===actorId)||globalThis.SoulCustodyCore?.active(state,recipient.id)?.custodianId===actorId||globalThis.SoulCooperationCore?.members(state,actorId).some(v=>v.personId===recipient.id)||globalThis.SoulCooperationCore?.members(state,recipient.id).some(v=>v.personId===actorId);
      const application=globalThis.SoulWorldEngine?.abilityApplicationAuthority?.(state,actorId,recipient.id,skill,options.applicationOptions??{});
      if(!permitted&&!application?.available)throw Error('给药需要已成立的合作或本次真实施用依据');
      if(!application?.available)throw Error(application?.reason??'药物缺少本次实际施用依据');
    }
    const requirements=options.preparingMedicine&&skill.medicine?contract.requirements.filter(v=>v!=='ingest'):contract.requirements;
    const restriction=controls.skillReason(state,actorId,skill,{...contract,requirements,costs,nodeIds:options.nodeIds,branchIds:options.branchIds,ingestionTargetId:options.ingestionTargetId});if(restriction)throw Error(restriction);
    const persistentNodes=(skill.effectGraph?.nodes??[]).map(n=>globalThis.SoulEffectCompiler.effectiveWorldNode(skill,n.id)).filter(n=>(!options.nodeIds||options.nodeIds.includes(n.id))&&(n.effectId==='realm.store'||controls.canPersist(n.effectId,n.params)&&n.params?.持续方式&&n.params.持续方式!=='回合'));
    for(const node of persistentNodes){
      const source={单位ID:actorId,武魂ID:skill.sourceMartialSoulId??skill.来源武魂ID??'',物品ID:skill.sourceItemId??''};
      if(node.params.来源依赖==='施术武魂'&&!source.武魂ID)throw Error('持续效果缺少施术武魂');
      if(node.params.来源依赖==='道具有效'&&(!source.物品ID||['consumable','hidden-weapon'].includes(skill.sourceKind)))throw Error('持续效果需要保留的真实道具来源，消耗品不能依赖剩余同批物品维持');
      const invalid=controls.sourceInvalidReason(state,{来源:source,快照:{参数:node.params}});if(invalid)throw Error(`持续效果来源不可用：${invalid}`);
    }
    for(const kind of requirements)if(options.blockedRequirements?.[kind])throw Error(`${LABELS[kind]}条件不满足：${options.blockedRequirements[kind]}`);
    if(['consumable','hidden-weapon'].includes(skill.sourceKind)&&!options.preserveOralDose)costs.push({kind:'item',itemId:skill.sourceItemId,quantity:1,source:true});
    const totals={soulPower:0,health:0,lifespan:0},items=new Map();let sacrificial=true;
    for(const cost of costs){
      if(cost.kind==='item')continue;
      totals[cost.kind]=integer(totals[cost.kind]+cost.amount,'合计代价');
      if(cost.kind==='lifespan'&&!cost.sacrificial)sacrificial=false;
    }
    const lock=integer(options.activationLock??0,'新增魂力锁定');
    if(controls.availableSoulPower(state,actorId)<totals.soulPower+lock)throw Error(`魂力不足：需要${totals.soulPower}并额外锁定${lock}，当前可支付${controls.availableSoulPower(state,actorId)}`);
    if(totals.health>=actor.资源.生命.当前&&totals.health>0)throw Error('生命不足：付款后至少保留1点生命');
    const life=totals.lifespan?people.checkPayment(state,actorId,totals.lifespan,{sacrificial}):null;
    // Reserve explicit instances first, then allocate templates from remaining carried stock.
    const itemCosts=costs.filter(c=>c.kind==='item').sort((a,b)=>Number(!!b.itemId)-Number(!!a.itemId));
    for(const cost of itemCosts){
      integer(cost.quantity,'消耗物品数量',1);let remaining=cost.quantity;
      const candidates=Object.values(state.物品?.实例??{}).filter(item=>item.ownerEntityId===actorId&&person&&item.containerId===person.inventoryContainerId&&
        !Object.values(state.装备?.配置?.[actorId]?.slots??{}).includes(item.id)&&
        state.容器?.列表?.[item.containerId]?.ownerEntityId===actorId&&state.容器.列表[item.containerId].itemIds.includes(item.id)&&
        // A bound consumable may pay for its own use by its bound owner;
        // explicit item fees cannot spend bound stock or claim this internal marker.
        (!item.boundToEntityId||(cost.source===true&&cost.itemId===skill.sourceItemId&&item.boundToEntityId===actorId))&&
        (!item.扩展?.integrated)&&(!item.payload?.fused)&&Number(item.payload?.expiresAtDay??Number.MAX_SAFE_INTEGER)>=Number(state.世界?.时间?.day??0)&&
        (cost.itemId?item.id===cost.itemId:item.templateId===cost.templateId)).sort((a,b)=>a.id.localeCompare(b.id));
      for(const item of candidates){const reserved=items.get(item.id)??0,paid=Math.min(remaining,Math.max(0,item.quantity-reserved));items.set(item.id,reserved+paid);remaining-=paid;if(!remaining)break;}
      if(remaining)throw Error(`物品代价不足：${cost.templateId??cost.itemId}需要${cost.quantity}份随身可用物品`);
    }
    if(persistentNodes.some(n=>n.params.来源依赖==='道具有效')&&items.get(skill.sourceItemId)>=state.物品.实例[skill.sourceItemId].quantity)throw Error('支付代价后持续效果的来源道具将不复存在');
    const exchangePlan=globalThis.SoulAbilityExchange.preview(state,actorId,skill,{modeId:contract.modeId,branchIds:options.branchIds});
    for(const burden of exchangePlan.plans.flatMap(v=>v.contract.burdens))for(const pledged of burden.lockedAbilities??[]){
      const actual=Object.values(state.技能.列表).find(v=>(actor.能力.技能ID??[]).includes(v.id)&&globalThis.SoulAbilityExchange.origin(v)===globalThis.SoulAbilityExchange.origin(pledged));
      if(actual?.sourceItemId&&items.get(actual.sourceItemId)>=state.物品.实例[actual.sourceItemId]?.quantity)throw Error('资源费用不能同时消耗被抵押能力的来源道具');
    }
    return {exchangePlan,actorId,skillId:skill.id,sourceId:skill.usageKey??skill.usageRules?.worldUsageGroup??skill.id,contract,totals,sacrificial,exhaustsLife:!!life?.exhausts,items:[...items].filter(([,quantity])=>quantity>0).map(([itemId,quantity])=>({itemId,quantity,quantityBefore:state.物品.实例[itemId].quantity})),activationLock:lock};
  }
  // Called inside the existing private world/battle transaction, after target validation.
  // Operation replay is owned by that transaction's journal; no second independent use ledger.
  function pay(state,actorId,skill,operationId,options={}){
    if(typeof operationId!=='string'||!operationId)throw Error('技能付款缺少事务编号');
    const plan=quote(state,actorId,skill,options),actor=state.战斗单位.列表[actorId];
    const soulPowerOwnerId=globalThis.SoulCombatDeployments?.soulPowerOwner(state,actorId)??actorId,soulPower=state.战斗单位.列表[soulPowerOwnerId].资源.魂力;
    const resourcesBefore={soulPower:soulPower.当前,health:actor.资源.生命.当前};
    if(plan.totals.lifespan)people.pay(state,actorId,plan.totals.lifespan,plan.sourceId,`${operationId}:lifespan`,{sacrificial:plan.sacrificial});
    soulPower.当前-=plan.totals.soulPower;actor.资源.生命.当前-=plan.totals.health;
    for(const fee of plan.items){
      const item=state.物品.实例[fee.itemId];item.quantity-=fee.quantity;fee.quantityAfter=item.quantity;
      if(item.quantity>0)continue;
      const container=state.容器.列表[item.containerId];container.itemIds=container.itemIds.filter(id=>id!==item.id);
      for(const slots of [state.装备?.配置?.[actorId]?.slots])if(slots)for(const slot of Object.keys(slots))if(slots[slot]===item.id)slots[slot]='';
      for(const granted of Object.values(state.技能?.列表??{}))if(granted.sourceItemId===item.id){delete state.技能.列表[granted.id];actor.能力.技能ID=actor.能力.技能ID.filter(id=>id!==granted.id);}
      globalThis.SoulCommerceProvenance?.consumed?.(state,item,{kind:'ability-cost',operationId,actorId,quantity:fee.quantity});
      delete state.物品.实例[item.id];
    }
    return {...plan,operationId,...(soulPowerOwnerId!==actorId?{soulPowerOwnerId}:{}),resources:{before:resourcesBefore,after:{soulPower:soulPower.当前,health:actor.资源.生命.当前}}};
  }
  function finish(state,payment){
    if(!payment.exhaustsLife)return null;
    return people.die(state,payment.actorId,'技能献祭耗尽寿命',payment.operationId);
  }
  return Object.freeze({skillUsageRules,fieldBranches,selectFieldBranches,fieldControlGraph,consumableDisposition,controlDeviceGraph,attackDeviceGraph,activeDeviceGraph,hasFieldUse,REQUIREMENTS,LABELS,medicineContract,medicineSourceValue,describe,validate,quote,pay,finish,mechanics,hash,fingerprint,seal,verify,deriveCopy});
});
