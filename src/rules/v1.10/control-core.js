(function attachControlCore(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.SoulControlCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function createControlCore(){
  'use strict';
  const EFFECT_IDS=Object.freeze(['status.mute','status.limb_bind','status.power_seal','status.mind_control','status.soul_control','status.cognition_shift']);
  const PERSISTENT_STATUS_IDS=Object.freeze([...EFFECT_IDS,'transform.disguise','transform.sex','status.regeneration','status.buff','status.slow','status.paralysis','status.sleep','status.blind','status.fear','status.charm','status.silence','status.poison','status.desire','status.resistance_shift']);
  function canPersist(effectId,params={}){return PERSISTENT_STATUS_IDS.includes(effectId)&&(effectId!=='status.buff'||Number(params.数值)!==0&&['力量','身法','体魄','悟性','感知','意志'].includes(params.属性));}
  function walkingRate(state,personIds){return Math.min(4,...personIds.map(id=>4-Math.max(0,...active(state,id).filter(s=>s.模板ID==='status.slow').map(s=>Math.min(3,Math.max(0,Number(s.快照?.参数?.数值??1)))))));}
  const DURATION_BOUNDS=Object.freeze({持续方式:['回合','世界分钟','来源有效'],持续分钟:[1,10080],来源依赖:['独立','施术者存活','施术者清醒','施术武魂','道具有效']});
  const DURATION_DEFAULTS=Object.freeze({持续方式:'回合',持续分钟:1,来源依赖:'独立'});
  const LABELS=Object.freeze({vision:'视觉观察',hearing:'听觉感知',voice:'发声',gesture:'手部动作',movement:'身体移动',contact:'接触', 'soul-power':'运转魂力','martial-soul':'使用武魂',ingest:'经口吞服',focus:'保持专注'});
  const ABILITY_KINDS=Object.freeze(['ordinary','martial-base','soul-ring','martial-skill','soul-bone','soul-device','consumable','hidden-weapon','domain','restraint','native-origin']);
  function limitSpec(input){
    if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['soulPowerPercent','damagePercent','permission','denyOrigins'].includes(k)))throw Error('精细封印配置无效');
    const result={};
    if(input.denyOrigins!==undefined){const list=input.denyOrigins;if(!Array.isArray(list)||!list.length||list.length>64||list.some(v=>typeof v!=='string'||!v)||new Set(list).size!==list.length)throw Error('能力禁用集合无效');result.denyOrigins=[...list];}
    for(const key of ['soulPowerPercent','damagePercent'])if(input[key]!==undefined){if(!Number.isInteger(input[key])||input[key]<0||input[key]>100)throw Error('开放比例须为0至100的整数');result[key]=input[key];}
    if(input.permission!==undefined){
      const p=input.permission;if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).some(k=>!['soulIds','ringIds','skillIds','allowedKinds','maxCastRank'].includes(k)))throw Error('能力许可配置无效');
      result.permission={};
      for(const key of ['soulIds','ringIds','skillIds','allowedKinds'])if(p[key]!==undefined){
        if(!Array.isArray(p[key])||p[key].length>64||p[key].some(v=>typeof v!=='string'||!v||v.length>200)||new Set(p[key]).size!==p[key].length||key==='allowedKinds'&&p[key].some(v=>!ABILITY_KINDS.includes(v)))throw Error('能力许可列表无效');
        result.permission[key]=[...p[key]];
      }
      if(p.maxCastRank!==undefined){if(!Number.isInteger(p.maxCastRank)||p.maxCastRank<0||p.maxCastRank>9)throw Error('许可环阶须为0至9');result.permission.maxCastRank=p.maxCastRank;}
    }
    if(!Object.keys(result).length)throw Error('精细封印缺少实际限制');
    return result;
  }
  const readIndexes=new WeakMap(),limitReads=new WeakMap();
  function liveStatus(state,status){return status.状态!=='已结束'&&globalThis.SoulDeviceOperations?.statusEffective(state,status)!==false&&globalThis.SoulDeviceLocks?.statusEffective(state,status)!==false&&(status.快照?.参数?.来源依赖!=='道具有效'||!sourceInvalidReason(state,status));}
  function statusIndex(state){const index=new Map();for(const status of Object.values(state.状态实例?.列表??{}))if(liveStatus(state,status)){const rows=index.get(status.目标单位ID)??[];rows.push(status);index.set(status.目标单位ID,rows);}return index;}
  function withReadIndex(state,read){const previous=readIndexes.get(state);if(!previous){readIndexes.set(state,statusIndex(state));limitReads.set(state,new Map());}try{return globalThis.SoulHostCore?globalThis.SoulHostCore.withReadIndex(state,read):read();}finally{if(!previous){readIndexes.delete(state);limitReads.delete(state);}}}
  function invalidateReadIndex(state,linked=true){readIndexes.delete(state);limitReads.delete(state);if(linked)globalThis.SoulHostCore?.invalidateReadIndex(state,false);}
  function statusesFor(state,unitId,templateId=null){const rows=readIndexes.get(state)?.get(unitId)??Object.values(state.状态实例?.列表??{});return rows.filter(s=>s.目标单位ID===unitId&&liveStatus(state,s)&&(!templateId||s.模板ID===templateId));}
  function hostPowerSources(state,actorId,hosts=globalThis.SoulHostCore?.hostItems(state,actorId)??[]){
    return hosts.flatMap(item=>{
      const suppression=globalThis.SoulHostCore.capabilityActive(state,item,'suppression')?globalThis.SoulHostCore.read(item).capabilities.suppression:null;
      return suppression?[{statusId:item.id,itemId:item.id,...globalThis.SoulHostCore.suppressionLimits(item)}]:[];
    });
  }
  function replacedHostSeal(status,hostIds){return status.模板ID==='status.power_seal'&&['魂力','武魂','魂技','精细'].includes(status.快照?.参数?.封印对象)&&hostIds.has(status.来源?.物品ID);}
  function effectiveLimits(state,actorId,seen=new Set(),index=readIndexes.get(state)??statusIndex(state)){
    const cache=seen.size===0?limitReads.get(state):null;if(cache?.has(actorId))return cache.get(actorId);
    const result=effectiveLimitsUncached(state,actorId,seen,index);cache?.set(actorId,result);return result;
  }
  function effectiveLimitsUncached(state,actorId,seen,index){
    seen.add(actorId);
    const hosts=hostPowerSources(state,actorId),hostIds=new Set(hosts.map(source=>source.itemId));
    const statuses=(index.get(actorId)??[]).filter(status=>liveStatus(state,status)&&!replacedHostSeal(status,hostIds)),entries=[...statuses.filter(s=>s.模板ID==='status.power_seal'&&s.快照?.参数?.封印对象==='精细').map(s=>({statusId:s.id,...limitSpec(s.扩展?.封印限制??s.快照.参数.限制)})),...hosts];
    const fullSoul=globalThis.SoulInteriorSpaces?.membership(state,actorId)?.member.limits.soulPower===false||statuses.some(s=>s.模板ID==='status.power_seal'&&s.快照?.参数?.封印对象==='魂力');
    const parentId=globalThis.SoulCombatDeployments?.sourceContext(state,actorId)?.permissionParentId??state.战斗单位?.列表?.[actorId]?.扩展?.召唤?.来源单位ID,parent=parentId&&!seen.has(parentId)?effectiveLimits(state,parentId,seen,index):{soulPowerPercent:100,damagePercent:100,permissions:[],deniedOrigins:[],sources:[]};
    return {deniedOrigins:[...new Set([...parent.deniedOrigins,...entries.flatMap(e=>e.denyOrigins??[])])],soulPowerPercent:Math.min(fullSoul?0:100,parent.soulPowerPercent,...entries.map(e=>e.soulPowerPercent??100)),damagePercent:Math.min(parent.damagePercent,...entries.map(e=>e.damagePercent??100)),permissions:[...entries.filter(e=>e.permission).map(e=>({statusId:e.statusId,...e.permission})),...parent.permissions],sources:[...entries,...parent.sources]};
  }
  function soulPowerView(state,actorId){
    const ownerId=globalThis.SoulCombatDeployments?.soulPowerOwner(state,actorId)??actorId,sp=state.战斗单位?.列表?.[ownerId]?.资源?.魂力??{当前:0,最大:0,锁定:0},percent=effectiveLimits(state,actorId).soulPowerPercent;
    const capacity=Math.floor(sp.最大*percent/100),withheld=sp.最大-capacity;
    return {percent,capacity,withheld,current:sp.当前,maximum:sp.最大,locked:sp.锁定,available:Math.max(0,sp.当前-sp.锁定-withheld)};
  }
  function availableSoulPower(state,actorId){return soulPowerView(state,actorId).available;}
  function limitChoices(state,actorId,options={}){
    const souls=(state.成长?.列表?.[actorId]?.武魂ID列表??[]).map(id=>state.武魂.列表[id]).filter(Boolean);
    const labels={'native-origin':'本源能力',ordinary:'普通攻击', 'martial-base':'武魂基础', 'soul-ring':'魂环魂技', 'martial-skill':'其他魂技', 'soul-bone':'魂骨', 'soul-device':'魂导器',consumable:'丹药与消耗品','hidden-weapon':'暗器',domain:'领域',restraint:'拘束器'};
    const primary=souls.find(s=>s.id===activeSoulId(state,actorId))??souls[0],firstRings=(primary?.魂环ID列表??[]).map(id=>state.魂环.列表[id]).filter(r=>r&&r.序号<=2),base=percent=>({soulPowerPercent:percent,...(options.supportsDamage?{damagePercent:percent}:{})});
    const presets=[{id:'blocked',name:'能力完全封禁',limits:{...base(0),permission:{allowedKinds:[],soulIds:[],ringIds:[],skillIds:[],maxCastRank:0}}},{id:'daily',name:'日常活动',limits:{...base(0),permission:{allowedKinds:['ordinary'],soulIds:[],ringIds:[],maxCastRank:0}}},{id:'restricted',name:options.supportsDamage?'受限参战 · 前两环与30%输出':'受限参战 · 前两环与30%魂力（伤害未覆盖）',limits:{...base(30),permission:{allowedKinds:['ordinary','martial-base','soul-ring'],soulIds:primary?[primary.id]:[],ringIds:firstRings.map(r=>r.id),maxCastRank:Math.max(0,...firstRings.map(r=>r.序号))}}},{id:'open',name:'本来源全部开放',limits:base(100)}];
    return {presets,coverage:options.supportsDamage?'本器具可调魂力、伤害输出和能力许可。':'本器具可调魂力和能力许可；不限制伤害输出或既有独立伤害。',souls:souls.map(s=>({id:s.id,name:s.名称})),rings:souls.flatMap(s=>(s.魂环ID列表??[]).map(id=>state.魂环.列表[id]).filter(Boolean).map(r=>({id:r.id,name:`${s.名称} · 第${r.序号}魂环 · ${r.年限}年`,ordinal:r.序号,soulId:s.id}))),skills:(state.战斗单位?.列表?.[actorId]?.能力?.技能ID??[]).map(id=>state.技能.列表[id]).filter(Boolean).map(s=>({id:s.id,name:s.name??s.名称??s.id,kind:abilityKind(skillOrigin(s)??s)})),kinds:ABILITY_KINDS.map(id=>({id,name:labels[id]}))};
  }
  function powerFacts(state,actorId){
    const limits=effectiveLimits(state,actorId),hosts=limits.sources.filter(source=>source.itemId),hostIds=new Set(hosts.map(source=>source.itemId));
    const sources=active(state,actorId).filter(s=>s.模板ID==='status.power_seal'&&!replacedHostSeal(s,hostIds)).map(s=>({statusId:s.id,name:state.物品?.实例?.[s.来源?.物品ID]?.name??s.扩展?.持续来源合同?.name??'封印来源',operatorId:s.来源?.单位ID,object:s.快照?.参数?.封印对象,limits:s.扩展?.封印限制??s.快照?.参数?.限制??null}));
    for(const {statusId,itemId,...spec} of hosts){const item=state.物品.实例[itemId];sources.push({statusId,itemId,name:item.name,operatorId:item.attachment?.controllers?.[0]??item.ownerEntityId,object:'精细',limits:spec});}
    return {soulPower:soulPowerView(state,actorId),damagePercent:limits.damagePercent,maximumCastRank:maximumCastRank(state,actorId),sources,permissions:limits.permissions};
  }
  function bindLimits(state,actorId,input){
    const spec=limitSpec(input),p=spec.permission;
    const owned=state.成长?.列表?.[actorId]?.武魂ID列表??[],rings=owned.flatMap(id=>state.武魂?.列表?.[id]?.魂环ID列表??[]),skills=state.战斗单位?.列表?.[actorId]?.能力?.技能ID??[];
    if(p?.soulIds?.some(id=>!owned.includes(id))||p?.ringIds?.some(id=>!rings.includes(id))||p?.skillIds?.some(id=>!skills.includes(id)))throw Error('许可必须引用目标实际持有的武魂、魂环和技能');
    if(p?.maxCastRank!==undefined&&p.ringIds===undefined){
      const owned=state.成长?.列表?.[actorId]?.武魂ID列表??[];
      p.soulIds??=[...owned];
      p.ringIds=p.soulIds.flatMap(id=>(state.武魂?.列表?.[id]?.魂环ID列表??[]).filter(id=>Number(state.魂环?.列表?.[id]?.序号??99)<=p.maxCastRank));
    }
    return spec;
  }
  function skillOrigin(skill){return ['copied','summoned-copy'].includes(skill?.sourceKind)?skill.扩展?.copyOrigin?.source??null:skill;}
  function abilityKind(skill){return skill?.sourceRingId||skill?.来源魂环ID?'soul-ring':skill?.sourceKind||skill?.source?.kind||(skill?.id==='martial.base'?'martial-base':skill?.id==='ordinary.attack'?'ordinary':'martial-skill');}
  const equipmentReads=new WeakMap();
  function equipmentSealed(state,actorId){
    // This permission is a leaf read: unrelated item-dependent statuses must
    // never be evaluated merely to ask whether equipment is sealed.
    const seals=Object.values(state.状态实例?.列表??{}).filter(status=>status.目标单位ID===actorId&&status.模板ID==='status.power_seal'&&status.快照?.参数?.封印对象==='装备与道具'&&status.状态!=='已结束');
    if(!seals.length)return false;
    const reading=equipmentReads.get(state)??new Set();
    if(reading.has(actorId))throw Object.assign(Error('装备封锁持续来源存在循环，无法核验来源'),{code:'invalid-equipment-source-cycle'});
    equipmentReads.set(state,reading);reading.add(actorId);
    try{
      // An independent seal already closes the source. Check it before any
      // conditional item source, regardless of JSON field insertion order.
      seals.sort((a,b)=>Number(a.快照?.参数?.来源依赖==='道具有效')-Number(b.快照?.参数?.来源依赖==='道具有效')||String(a.id).localeCompare(String(b.id)));
      return seals.some(status=>liveStatus(state,status));
    }finally{reading.delete(actorId);if(!reading.size)equipmentReads.delete(state);}
  }
  // A target-wide source restriction follows new equipment without changing its
  // ownership, material protection, mechanical locks, or fused soul bones.
  function itemEffectBlockReason(state,actorId,itemOrId,capability='supernatural'){
    if(['material','mechanical'].includes(capability))return '';
    const item=typeof itemOrId==='string'?state.物品?.实例?.[itemOrId]:itemOrId;
    const fused=item?.type==='魂骨'&&item.boundToEntityId===actorId&&Object.values(state.装备?.配置?.[actorId]?.soulBoneSlots??{}).includes(item.id);
    return fused||!equipmentSealed(state,actorId)?'':'装备与道具暂时无法发挥能力';
  }
  function itemEffectsAllowed(state,actorId,itemOrId,capability='supernatural'){return !itemEffectBlockReason(state,actorId,itemOrId,capability);}
  function permissionReason(state,actorId,skill,castRank){
    const limits=effectiveLimits(state,actorId),original=skillOrigin(skill);if(!original)return limits.permissions.length?'复制能力缺少可核验来源':'';
    if(limits.deniedOrigins.includes(globalThis.SoulAbilityExchange.origin(original)))return '该能力原始来源已作为交换代价封锁';
    const kind=abilityKind(original);
    if(original.sourceItemId||['soul-device','consumable','hidden-weapon','restraint'].includes(kind)){
      const blocked=itemEffectBlockReason(state,actorId,original.sourceItemId);if(blocked)return blocked;
    }
    const soulId=original.sourceMartialSoulId||original.来源武魂ID||(['martial-base','soul-ring'].includes(kind)?activeSoulId(state,actorId):'');
    const ringId=original.sourceRingId||original.来源魂环ID||'';
    for(const p of limits.permissions){
      if(p.allowedKinds&&!p.allowedKinds.includes(kind))return '该类别能力被精细封印';
      if(p.allowedKinds&&original.effectGraph?.nodes?.some(n=>n.family==='domain')&&!p.allowedKinds.includes('domain'))return '领域能力被精细封印';
      if(p.soulIds&&soulId&&!p.soulIds.includes(soulId))return '该武魂被精细封印';
      if(p.ringIds&&kind==='soul-ring'&&!p.ringIds.includes(ringId))return '该魂环被精细封印';
      if(p.skillIds&&!p.skillIds.includes(skill.id)&&!p.skillIds.includes(original.id))return '该技能被精细封印';
      const rank=castRank??original.nativeCastRank??original.minimumCastRank??original.ringOrdinal??state.魂环?.列表?.[ringId]?.序号??0;
      if(p.maxCastRank!==undefined&&kind==='soul-ring'&&Math.max(rank,state.魂环?.列表?.[ringId]?.序号??0)>p.maxCastRank)return '施放环阶超过精细封印许可';
    }
    return '';
  }
  function maximumCastRank(state,actorId){return Math.min(9,...effectiveLimits(state,actorId).permissions.map(p=>p.allowedKinds&&!p.allowedKinds.includes('soul-ring')||p.ringIds?.length===0||p.skillIds?.length===0?0:p.maxCastRank??9));}
  function suppressionBlocksCombat(spec){return spec?.soulPowerPercent===0||permissionsBlockCombat(spec?.permission?[spec.permission]:[]);}
  function permissionsBlockCombat(permissions){return permissions.length>0&&ABILITY_KINDS.filter(kind=>!['ordinary','consumable','hidden-weapon'].includes(kind)).every(kind=>permissions.some(p=>Array.isArray(p.allowedKinds)&&!p.allowedKinds.includes(kind)||p.skillIds?.length===0||kind==='soul-ring'&&(p.maxCastRank===0||p.ringIds?.length===0)||kind==='martial-base'&&p.soulIds?.length===0));}
  function combatSuppressed(state,actorId){
    const seals=restrictions(state,actorId).seals,limits=effectiveLimits(state,actorId);
    return seals.some(s=>!s.soulId&&s.kind==='魂力')||['武魂','魂技'].every(kind=>seals.some(s=>!s.soulId&&s.kind===kind))||limits.soulPowerPercent===0||permissionsBlockCombat(limits.permissions);
  }
  function outputSnapshot(state,actorId){
    const responsibleIds=[],seen=new Set();let id=actorId;
    while(id&&!seen.has(id)){seen.add(id);responsibleIds.push(id);const unit=state.战斗单位?.列表?.[id];id=globalThis.SoulCombatDeployments?.sourceContext(state,id)?.permissionParentId??unit?.扩展?.召唤?.来源单位ID??'';}
    const initial=state.战斗单位?.列表?.[actorId]?.扩展?.召唤?.输出许可;
    return {percent:Math.min(100,initial?.percent??100,...responsibleIds.map(id=>effectiveLimits(state,id).damagePercent)),responsibleIds};
  }
  function limitedDamage(state,actorId,amount,initial=null,group=null,key='damage'){
    const current=outputSnapshot(state,actorId),ids=[...new Set([...current.responsibleIds,...(initial?.responsibleIds??[])])];
    const percent=Math.min(current.percent,initial?.percent??100,...ids.map(id=>effectiveLimits(state,id).damagePercent));
    const exact=Math.max(0,Number(amount))*percent/100+(group?.[key]??0),result=Math.floor(exact+1e-9);
    if(group)group[key]=exact-result;
    return result;
  }
  function active(state,actorId){return statusesFor(state,actorId);}
  function bindingRequirements(status){
    if(status.模板ID==='status.bind')return ['movement'];
    if(status.模板ID==='status.paralysis'&&status.扩展?.已触发)return ['movement','gesture'];
    if(status.模板ID==='status.limb_bind')return status.快照?.参数?.部位==='双手'?['gesture']:status.快照?.参数?.部位==='双腿'?['movement']:['gesture','movement'];
    return [];
  }
  function powerSealRequirements(status){
    if(status.模板ID!=='status.power_seal')return [];
    const p=status.快照?.参数??{},kind=p.封印对象??'魂力',soulId=p.范围==='当前武魂'?status.扩展?.封印武魂ID??'':'';
    return kind==='魂力'||kind==='精细'&&p.限制?.soulPowerPercent===0?['soul-power']:kind==='武魂'&&!soulId?['martial-soul']:[];
  }
  function restrictions(state,actorId){
    const equipment=globalThis.SoulHostCore?.restrictionEquipment?.(state,actorId)??{attached:Object.values(state.物品?.实例??{}),hosts:globalThis.SoulHostCore?.hostItems(state,actorId)??[]};
    const hostSources=hostPowerSources(state,actorId,equipment.hosts),hostIds=new Set(hostSources.map(source=>source.itemId));
    const blocked={},sources=[],seals=[];
    const add=(status,requirements,label)=>{
      sources.push({statusId:status.id,effectId:status.模板ID,sourceUnitId:status.来源?.单位ID??'',requirements:[...requirements],label});
      for(const requirement of requirements)(blocked[requirement]??=[]).push({statusId:status.id,reason:label});
    };
    for(const status of active(state,actorId)){
      const p=status.快照?.参数??{};
      if(status.模板ID==='status.mind_control')add(status,['voice'],'精神接管期间无法说话');
      if(status.模板ID==='status.desire'&&globalThis.SoulAbilityExchange?.desireFacts(state,actorId).focusBlocked)add(status,['focus'],'欲火发作影响专注');
      if(status.模板ID==='status.blind')add(status,['vision'],'失明');
      if(status.模板ID==='status.mute')add(status,['voice'],'禁声');
      const binding=bindingRequirements(status);if(binding.length)add(status,binding,status.模板ID==='status.bind'?'束缚移动':status.模板ID==='status.paralysis'?'麻痹':`${p.部位??'全身'}拘束`);
      if(status.模板ID==='status.silence')seals.push({statusId:status.id,kind:'魂技',soulId:'',label:'能力封印'});
      if(status.模板ID==='status.power_seal'){
        if(replacedHostSeal(status,hostIds))continue;
        const kind=p.封印对象??'魂力',soulId=p.范围==='当前武魂'?status.扩展?.封印武魂ID??'': '';
        seals.push({statusId:status.id,kind,soulId,label:`${soulId?'指定武魂的':''}${kind}封印`});
        const requirements=powerSealRequirements(status);if(requirements.length)add(status,requirements,requirements[0]==='soul-power'?'魂力封印':'武魂封印');
      }
    }
    for(const item of equipment.attached)if(item.templateId==='restraint-gag'&&item.durability>0&&item.attachment?.wearerId===actorId&&item.attachment.mode==='locked'){
      (blocked.ingest??=[]).push({statusId:item.id,reason:'口部拘束'});
    }
    const intimate=globalThis.SoulIntimateCore?.wornEffects?.(state,actorId,equipment);
    if(intimate){
      const block=(key,reason)=>{(blocked[key]??=[]).push({statusId:reason,reason});};
      if(intimate.mute){block('voice','口球封声');block('ingest','口球封口');}
      if(intimate.vision)block('vision','眼罩遮蔽');
    }
    for(const item of globalThis.SoulWearableCore?.wornItems(state,actorId,equipment.attached)??[]){
      for(const [key,reason] of Object.entries(globalThis.SoulWearableCore.project(state,item).restrictions))(blocked[key]??=[]).push({statusId:item.id,reason});
    }
    for(const item of equipment.hosts){
      const projection=globalThis.SoulHostCore.project(state,item);
      for(const [key,reason] of Object.entries(projection.restrictions))if(reason)(blocked[key]??=[]).push({statusId:item.id,reason});
    }
    for(const source of hostSources){
      seals.push({statusId:source.statusId,kind:'精细',soulId:'',label:'精细封印'});
      if(source.soulPowerPercent===0)(blocked['soul-power']??=[]).push({statusId:source.statusId,reason:'魂力封印'});
    }
    const interior=globalThis.SoulInteriorSpaces?.membership(state,actorId);if(interior){for(const [permission,key]of [['movement','movement'],['gesture','gesture'],['voice','voice'],['soulPower','soul-power']])if(!interior.member.limits[permission]){const reason=({movement:'画境锁住身体',gesture:'画境锁住双手',voice:'画境封声',soulPower:'画境封印魂力'})[permission];(blocked[key]??=[]).push({statusId:interior.space.id,reason});}if(!interior.member.limits.soulPower)seals.push({statusId:interior.space.id,kind:'魂力',soulId:'',label:'画境封印魂力'});}
    return {blocked,sources,seals};
  }
  function activeSoulId(state,actorId){return state.成长?.列表?.[actorId]?.激活武魂ID??state.战斗单位?.列表?.[actorId]?.扩展?.武魂战斗修正?.来源武魂ID??'';}
  // 2026-10-21 按用户要求取消年龄与成人内容限制：性属性与相关能力对所有年龄的人物开放。
  // 下面四个名字仍被候选编译、战斗施放和创建校验调用，所以保留；它们不再按年龄区分，也不再把任何机制判定为成人专属。
  function adultMechanic(){return false;}
  function adultPerson(){return true;}
  function adultDraft(){return true;}
  function adultScope(skill,selection={}){
    const graph=skill?.effectGraph;if(!graph)return skill;
    const branches=graph.branches??[],ids=selection.nodeIds?new Set(selection.nodeIds):selection.branchIds&&branches.length?new Set(branches.filter(b=>selection.branchIds.includes(b.id)).flatMap(b=>b.nodeIds??[])):selection.internalPassive&&branches.length?new Set(branches.filter(b=>b.activation==='passive').flatMap(b=>b.nodeIds??[])):null;
    const selectedBranches=selection.branchIds??(ids&&branches.length?branches.filter(b=>(b.nodeIds??[]).some(id=>ids.has(id))).map(b=>b.id):null);
    return {effectGraph:{nodes:ids?graph.nodes.filter(n=>ids.has(n.id)):graph.nodes},exchangeContracts:(skill.exchangeContracts??[]).filter(c=>!selectedBranches||c.benefits?.branchIds?.some(id=>selectedBranches.includes(id)))};
  }
  function adultReason(){return '';}
  function skillReason(state,actorId,skill,contract){
    if(!contract.internalPassive){const reason=globalThis.SoulInfluenceCore?.autonomyReason(state,actorId,{speech:contract.requirements.includes('voice')});if(reason)return reason;}
    const ageReason=adultReason(state,actorId,adultScope(skill,contract));if(ageReason)return ageReason;
    if(!contract.internalPassive&&globalThis.SoulSealingCore?.active(state,actorId))return '人物处于封神台内，不能施放外部能力';
    const limits=restrictions(state,actorId),kind=abilityKind(skillOrigin(skill)??skill),mundane=['ordinary','consumable','hidden-weapon'].includes(kind)||['ordinary.attack','basic.attack'].includes(skill.id);
    const denied=permissionReason(state,actorId,skill,contract.castRank);if(denied)return denied;
    const soulId=skill.sourceMartialSoulId||skill.来源武魂ID||(['soul-ring','martial-base'].includes(kind)||contract.requirements.includes('martial-soul')?activeSoulId(state,actorId):'');
    for(const seal of limits.seals){
      if(seal.soulId&&seal.soulId!==soulId)continue;
      if(seal.kind==='魂力'&&contract.costs.some(cost=>cost.kind==='soulPower'))return seal.label;
      if(seal.kind==='武魂'&&soulId)return seal.label;
      if(seal.kind==='魂技'&&!mundane)return seal.label;
    }
    for(const requirement of contract.requirements){const block=requirement==='ingest'&&contract.ingestionTargetId?restrictions(state,contract.ingestionTargetId).blocked.ingest:limits.blocked[requirement];if(block?.length)return `${LABELS[requirement]}条件不满足：${block.map(source=>source.reason).join('、')}`;}
    return '';
  }
  function actionReason(state,actorId,action,options={}){
    const autonomy=globalThis.SoulInfluenceCore?.autonomyReason(state,actorId,{speech:action==='speak'||options.requirements?.includes('voice')});if(autonomy)return autonomy;
    const seal=globalThis.SoulSealingCore?.active(state,actorId),contained=options.containmentAction;
    if(seal&&(seal.status!=='confined'||action!=='requirements'||!['communication','observe','struggle'].includes(contained)||(options.requirements??[]).some(v=>!['voice','vision','hearing','focus'].includes(v))||contained==='struggle'&&(options.requirements??[]).length))return '封神台的封锁罩仍然闭合，无法离开或向外施术';
    if(options.requirements&&(!Array.isArray(options.requirements)||options.requirements.some(v=>!Object.hasOwn(LABELS,v))||new Set(options.requirements).size!==options.requirements.length))return '行动条件包含未知或重复类别';
    const limits=restrictions(state,actorId);
    if(action==='move'&&limits.blocked.movement?.length)return `不能移动：${limits.blocked.movement.map(source=>source.reason).join('、')}`;
    if(action==='switch-soul'){
      if(effectiveLimits(state,actorId).soulPowerPercent===0)return '魂力封印';
      if(effectiveLimits(state,actorId).permissions.some(p=>p.soulIds&&!p.soulIds.includes(options.soulId)))return '该武魂被精细封印';
      const seal=limits.seals.find(s=>s.kind==='魂力'||s.kind==='武魂'&&(!s.soulId||s.soulId===options.soulId));
      return seal?seal.label:'';
    }
    const requirements=options.requirements??({move:['movement'],equip:['gesture'],manufacture:['gesture','soul-power','focus'],speak:['voice']}[action]??[]);
    return requirements.flatMap(kind=>(limits.blocked[kind]??[]).map(source=>`${LABELS[kind]}条件不满足：${source.reason}`))[0]??'';
  }
  // Passive effects have no casting gesture or payment; only their actual source can be sealed.
  function passiveReason(state,actorId,skill){return skillReason(state,actorId,skill,{requirements:[],costs:[],internalPassive:true});}
  function martialSoulSealed(state,actorId,soulId=activeSoulId(state,actorId)){return !!soulId&&(restrictions(state,actorId).seals.some(s=>s.kind==='武魂'&&(!s.soulId||s.soulId===soulId))||effectiveLimits(state,actorId).permissions.some(p=>p.soulIds&&!p.soulIds.includes(soulId)));}
  function statusSources(state,actorId,effectId){return [...new Set(active(state,actorId).filter(v=>v.模板ID===effectId).map(v=>v.来源?.单位ID).filter(id=>id&&state.战斗单位?.列表?.[id]))];}
  function targetReason(state,actorId,{harmfulTargetIds=[],approachTargetIds=[],perceivedSourceIds=[]}={}){const resistance=globalThis.SoulConsciousness?.resistanceReason(state,actorId,{harmfulTargetIds});if(resistance)return resistance;if(harmfulTargetIds.some(id=>statusSources(state,actorId,'status.charm').includes(id)))return '魅惑状态下不能主动伤害魅惑来源';if(approachTargetIds.some(id=>perceivedSourceIds.includes(id)&&statusSources(state,actorId,'status.fear').includes(id)))return '恐惧状态下不能主动接近已感知的恐惧来源';return '';}
  function assertAction(state,actorId,action,options){const reason=actionReason(state,actorId,action,options);if(reason)throw Error(reason);}
  function breakable(state,actorId){return active(state,actorId).filter(status=>['status.bind','status.limb_bind'].includes(status.模板ID)&&!status.扩展?.固定交换义务&&(status.扩展?.持续来源合同?.sourceKind!=='restraint'||globalThis.SoulHostCore?.canDamage(state,state.物品?.实例?.[status.来源?.物品ID])!==false));}
  function persistent(status){return ['世界分钟','来源有效'].includes(status.持续?.模式);}
  function duration(params,at){
    if(params.持续方式==='世界分钟')return {模式:'世界分钟',appliedAt:at,expiresAt:at+params.持续分钟,触发时点:[]};
    if(params.持续方式==='来源有效')return {模式:'来源有效',appliedAt:at,触发时点:[]};
    return null;
  }
  function nextExpiry(state,through=Number.MAX_SAFE_INTEGER){
    const times=Object.values(state.状态实例?.列表??{}).filter(persistent).flatMap(s=>{
      const expiry=state.物品?.实例?.[s.来源?.物品ID]?.payload?.expiresAtDay;
      const sealing=globalThis.SoulSealingCore,internal=sealing?.internalStatus(s),frozen=internal&&sealing.isStasis(state,s.目标单位ID),paused=internal?sealing.pausedMinutes(state,s.目标单位ID,globalThis.SoulPersonCore.now(state),s.持续.appliedAt??0):0;
      return [...(s.持续.模式==='世界分钟'&&!frozen?[s.持续.expiresAt+paused]:[]),...(s.快照?.参数?.来源依赖==='道具有效'&&Number.isSafeInteger(expiry)?[(expiry+1)*1440]:[])];
    }).filter(at=>at<=through);
    return times.length?Math.min(...times):null;
  }
  function sourceInvalidReason(state,status){
    const policy=status.快照?.参数?.来源依赖??'独立',source=status.来源??{},person=state.人物?.列表?.[source.单位ID],unit=state.战斗单位?.列表?.[source.单位ID];
    if(policy==='独立')return '';
    if(policy!=='道具有效'&&policy!=='施术者存活'&&globalThis.SoulSealingCore?.active(state,source.单位ID))return 'source-sealed';
    if(policy==='道具有效'){
      const item=state.物品?.实例?.[source.物品ID];
      if(status.扩展?.持续来源合同?.sourceKind==='restraint'){
        if(!item?.attachment)return 'source-restraint-removed';
        if(item.quantity!==1||item.durability<=0||item.attachment.wearerId!==status.目标单位ID||item.attachment.mode==='released'||Number(state.世界?.时间?.day??0)>Number(item.payload?.expiresAtDay??Number.MAX_SAFE_INTEGER)||Number(state.战斗单位?.列表?.[status.目标单位ID]?.派生?.有效等级??0)>Number(globalThis.SoulCustodyCore?.resolveDevice(item)?.maxLevel??99))return 'source-restraint-inactive';
        return status.模板ID==='status.power_seal'&&itemEffectBlockReason(state,source.单位ID,item)?'source-item-sealed':'';
      }
      const workshop=globalThis.SoulOpeningWorkshop?.isAbilitySource(state,item,source.单位ID);
      if(!workshop&&(!item||item.quantity<=0||item.ownerEntityId!==source.单位ID||item.durability===0||status.扩展?.持续来源合同?.sourceKind==='soul-device'&&!Object.values(state.装备?.配置?.[source.单位ID]?.slots??{}).includes(item.id)||Number(state.世界?.时间?.day??0)>Number(item.payload?.expiresAtDay??Number.MAX_SAFE_INTEGER)))return 'source-item-lost';
      return itemEffectBlockReason(state,source.单位ID,item)?'source-item-sealed':'';
    }
    if(!person&&!unit||person?.status==='dead'||unit?.存活状态==='死亡')return 'source-dead';
    if(policy!=='施术者存活'&&(!unit||unit.存活状态!=='存活'||unit.资源.生命.当前<=0))return 'source-incapacitated';
    if(policy==='施术者清醒'&&statusesFor(state,source.单位ID).some(r=>r.状态==='生效'&&['status.sleep','status.stun'].includes(r.模板ID)))return 'source-unconscious';
    if(policy==='施术武魂'&&(!source.武魂ID||activeSoulId(state,source.单位ID)!==source.武魂ID||passiveReason(state,source.单位ID,{sourceKind:'martial-base',sourceMartialSoulId:source.武魂ID})))return 'source-soul-unavailable';
    return '';
  }
  function validate(state){
    const errors=[];
    for(const status of Object.values(state.状态实例?.列表??{}))if(status.模板ID==='status.power_seal'){
      const p=status.快照?.参数??{},scope=status.扩展?.封印武魂ID;
      if(p.封印对象==='精细')try{limitSpec(p.限制);}catch(error){errors.push(`封印${status.id}：${error.message}`);}
      if(p.范围==='当前武魂'&&(!scope||!state.成长?.列表?.[status.目标单位ID]?.武魂ID列表?.includes(scope)))errors.push(`封印${status.id}缺少真实目标武魂`);
      if(p.封印对象==='魂力'&&p.范围==='当前武魂')errors.push(`封印${status.id}不能将共用魂力绑定单个武魂`);
    }
    return errors;
  }
  return Object.freeze({adultMechanic,adultPerson,adultDraft,adultScope,adultReason,EFFECT_IDS,PERSISTENT_STATUS_IDS,canPersist,walkingRate,DURATION_BOUNDS,DURATION_DEFAULTS,LABELS,ABILITY_KINDS,limitSpec,bindLimits,effectiveLimits,soulPowerView,availableSoulPower,withReadIndex,invalidateReadIndex,statusesFor,limitChoices,powerFacts,permissionReason,maximumCastRank,suppressionBlocksCombat,permissionsBlockCombat,combatSuppressed,outputSnapshot,limitedDamage,active,bindingRequirements,powerSealRequirements,statusSources,targetReason,restrictions,skillReason,passiveReason,martialSoulSealed,equipmentSealed,itemEffectBlockReason,itemEffectsAllowed,actionReason,assertAction,breakable,persistent,duration,nextExpiry,sourceInvalidReason,validate});
});
