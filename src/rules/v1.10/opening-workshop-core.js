(function(root,factory){const images=root?.SoulOpeningWorkshopImage??(typeof require==='function'?require('../../shared/opening-workshop-image-core.js'):null),api=factory(images);if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulOpeningWorkshop=api;})(typeof globalThis!=='undefined'?globalThis:this,function(images){
 'use strict';
 const clone=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v)),object=v=>v&&typeof v==='object'&&!Array.isArray(v);
 const fx=()=>globalThis.SoulEffectCompiler,w=()=>globalThis.SoulWorldEngine,a=()=>globalThis.SoulAbilityContract,custody=()=>globalThis.SoulCustodyCore;
 const hash=v=>a().hash(v),same=(x,y)=>hash(x)===hash(y),stamp=v=>({...v,hash:hash(v)}),valid=v=>{if(!object(v))return false;const {hash:h,...body}=v;return h===hash(body);};
 const CATEGORIES=Object.freeze(['魂导器','丹药','毒药','暗器','拘束器','工具','情具']),RECIPIENTS=Object.freeze(['player','buyer','captive']),PLACEMENTS=Object.freeze(['inventory','equipped','worn','stash']);
 const DEFINITION_FIELDS=['requestedBranches','soulPowerCost','durabilityCost','cooldownTurns','requirements','resourceCosts','maintenanceCosts','usageRules','castModes','defaultCastMode','medicine','modifiers','equipmentKind','fixedFormId','deviceCategory','templateId','restraint','ageTier','mechanismCap','outputScale','nativeCastRank','minimumCastRank','soulPowerCostRate','host','targetConditions','effectConditions'];
 const DESIGN_FIELDS=['id','category','name','description','appearance','quantity','recipient','placement','adopted','definition','artId','customImage'];
 const BRANCH_FIELDS=['id','label','activation','optional','priority','targetPolicy','nodes'];
 function designGrammar(){return clone({designFields:DESIGN_FIELDS,definitionFields:DEFINITION_FIELDS,branchFields:BRANCH_FIELDS});}
 const PAYLOAD_FIELDS=['activeSkill','passiveEffectGraph','modifiers','equipmentKind','fixedForm','deviceCategory','backgroundRestraint','description','form','artId','presetId','customImage','templateId','intimate','host'];
 function integer(v,label,min=0,max=Number.MAX_SAFE_INTEGER){if(!Number.isSafeInteger(v)||v<min||v>max)throw Error(label+'必须是'+min+'至'+max+'之间的整数');return v;}
 function only(v,fields,label){if(!object(v)||Object.keys(v).some(k=>!fields.includes(k)))throw Error(label+'含有不支持的设定');}
 function text(v,label,max,empty=true){if(typeof v!=='string'||v.length>max||!empty&&!v.trim())throw Error('请填写'+label+'（最多'+max+'字）');return v.trim();}
 /** Transport validation intentionally permits unfinished, unadopted work. */
 function normalize(value){
  if(value===undefined)return {version:1,designs:[]};only(value,['version','designs','activeDesignId','discussion','discussions','activeTab','workModes','emptyRequest'],'工坊草稿');
  if(value.version!==1||!Array.isArray(value.designs))throw Error('工坊作品格式不受支持');
  const ids=new Set();for(const d of value.designs){only(d,DESIGN_FIELDS,'工坊作品');
   if(typeof d.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(d.id)||ids.has(d.id))throw Error('作品编号缺失、重复或格式无效');ids.add(d.id);
   if(!CATEGORIES.includes(d.category)||typeof d.adopted!=='boolean'||!(RECIPIENTS.includes(d.recipient)||typeof d.recipient==='string'&&/^relation:(opening:(main|buyer|captive)|canon:[a-zA-Z0-9_-]+|person:[a-zA-Z0-9_-]+)$/.test(d.recipient))||!PLACEMENTS.includes(d.placement))throw Error('请选择作品品类、接收人物和放置方式');
   for(const [k,max] of [['name',80],['description',2000],['appearance',2000]])text(d[k],k,max);
   if(d.artId!==undefined&&typeof d.artId!=='string')throw Error('作品图鉴编号格式无效');
   if(d.customImage!==undefined)images.checked(d.customImage);
   only(d.definition,DEFINITION_FIELDS,'作品机制');
  }
  if(value.activeDesignId!==undefined&&(typeof value.activeDesignId!=='string'||!ids.has(value.activeDesignId)))throw Error('当前作品编号无效');
  const discussion=d=>{only(d,['request','exchanges','proposal'],'工坊讨论');if(typeof d.request!=='string'||d.request.length>4000||!Array.isArray(d.exchanges)||d.exchanges.length>20)throw Error('工坊讨论格式无效');for(const e of d.exchanges)if(!object(e)||typeof e.input!=='string'||e.input.length>4000||typeof e.reply!=='string'||e.reply.length>2000)throw Error('工坊讨论记录无效');};
  if(value.discussion!==undefined)discussion(value.discussion);
  if(value.discussions!==undefined){if(!object(value.discussions)||Object.keys(value.discussions).some(id=>!ids.has(id)))throw Error('工坊讨论须属于已有作品');for(const d of Object.values(value.discussions))discussion(d);}
  if(value.activeTab!==undefined&&!['host','manual','templates','library'].includes(value.activeTab))throw Error('请选择工坊工作方式');
  if(value.workModes!==undefined&&(!object(value.workModes)||Object.entries(value.workModes).some(([id,mode])=>!ids.has(id)||!['host','manual'].includes(mode))))throw Error('作品工作方式无效');
  if(value.emptyRequest!==undefined)text(value.emptyRequest,'新作品构想',4000);
  return clone(value);
 }
 function graphs(definition){
  const branches=definition.requestedBranches??[];if(!Array.isArray(branches)||!branches.length)throw Error('请为作品添加实际效果');
  const ids=new Set();for(const b of branches){only(b,BRANCH_FIELDS,'效果分支');if(typeof b.id!=='string'||!/^[a-zA-Z0-9_-]+$/.test(b.id)||ids.has(b.id)||!['active','passive'].includes(b.activation)||!Array.isArray(b.nodes))throw Error('效果分支编号、方式或节点格式无效');ids.add(b.id);for(const n of b.nodes)if(!Array.isArray(n)||n.length!==2||typeof n[0]!=='string'||!object(n[1]))throw Error('请选择已登记效果并填写参数');}
  const empty=branches.findIndex(b=>!b.nodes.length);if(empty>=0)throw Error('第'+(empty+1)+'项附加能力尚未添加效果，请补充效果或移除这项能力');
  const graph=fx().makeBranchedGraph(branches),checked=fx().validateGraph(graph,{ageTier:'百万年',mechanismCap:'神话'});if(!checked.pass)throw Error(checked.errors.join('；'));
  if(graph.nodes.some(n=>fx().EFFECT_REGISTRY[n.effectId]?.authorable===false))throw Error('这项效果须通过对应的先天特性取得，不能制作成器具或药物');
  // Constructors fill omitted defaults, but may never silently weaken a supplied number.
  for(const [i,b] of branches.entries())for(const [j,[id,params]] of b.nodes.entries()){const actual=fx().graphBranches(graph)[i].nodes[j];if(actual.effectId!==id||Object.entries(params).some(([key,v])=>!Object.hasOwn(actual.params,key)||!same(v,actual.params[key])))throw Error('效果参数越界或未登记：'+id);}
  const select=activation=>{const selected=branches.filter(b=>b.activation===activation);return selected.length?fx().makeBranchedGraph(selected):null;};
  return {graph,active:select('active'),passive:select('passive'),spent:checked.spent};
 }
 function payloadIdentity(templateId,payload){return hash({templateId,payload:Object.fromEntries(PAYLOAD_FIELDS.filter(k=>payload?.[k]!==undefined).map(k=>[k,payload[k]]))});}
 function activeAbility(d,graph){
  const def=d.definition,reusable=['魂导器','拘束器'].includes(d.category),active={id:'workshop-ability-'+d.id,name:d.name,description:d.description,namingSource:'preset',sourceKind:reusable?'soul-device':d.category==='暗器'?'hidden-weapon':'consumable',disposable:!reusable,effectGraph:graph,ageTier:'百万年',mechanismCap:'规则',soulPowerCost:integer(def.soulPowerCost??0,'魂力费用'),durabilityCost:integer(def.durabilityCost??(reusable?1:0),'耐久费用',0,100),cooldownTurns:integer(def.cooldownTurns??0,'回合冷却'),requirements:clone(def.requirements??(reusable||d.category==='暗器'?['gesture']:['gesture','ingest'])),resourceCosts:clone(def.resourceCosts??[]),maintenanceCosts:clone(def.maintenanceCosts??[]),usageRules:clone(def.usageRules??{}),castModes:clone(def.castModes??[])};
  if(!['十年','百年','千年','万年','十万年','百万年'].includes(def.ageTier??'百万年')||!['基础','进阶','强力','规则','神话'].includes(def.mechanismCap??'神话'))throw Error('能力机制档位未登记');active.ageTier=def.ageTier??'百万年';active.mechanismCap=def.mechanismCap??'神话';const checked=fx().validateGraph(graph,{ageTier:active.ageTier,mechanismCap:active.mechanismCap});if(!checked.pass)throw Error(checked.errors.join('；'));
  for(const k of ['defaultCastMode','medicine','outputScale','nativeCastRank','minimumCastRank','soulPowerCostRate','targetConditions','effectConditions'])if(def[k]!==undefined)active[k]=clone(def[k]);
  for(const k of ['soulPowerCost','durabilityCost','cooldownTurns','requirements','resourceCosts','maintenanceCosts','usageRules','castModes','ageTier','mechanismCap'])if(def[k]===undefined)def[k]=clone(active[k]);return fx().sealPricedAbility(active);
 }
 function openingItemValue(templateId,payload){
  const legacy=clone(payload);delete legacy.host;
  const t=w().ITEM_TEMPLATES[templateId];
  if(t.type==='魂导器'&&!legacy.activeSkill&&!legacy.passiveEffectGraph&&!Object.values(legacy.modifiers?.attributes??{}).some(Boolean))return 0;
  return w().calculateItemValue({templateId,payload:legacy});
 }
 function compileDesign(input){
  const d=normalize({version:1,designs:[input]}).designs[0],def=d.definition;
  d.name=text(d.name,'作品名称',80,false);d.description=text(d.description,'作品介绍',2000,false);d.appearance=text(d.appearance,'作品外观',2000,false);integer(d.quantity,'成品数量',1,999999);
  if(d.artId&&(!/^[-a-zA-Z0-9_.:]+$/.test(d.artId)||!Object.values(globalThis.SoulPresetArt?.BINDINGS??{}).some(a=>a.artId===d.artId)))throw Error('请选择已登记的作品图鉴');
  let templateId,payload={description:d.description,form:d.appearance,...(d.artId?{artId:d.artId}:{}),...(d.customImage?{customImage:d.customImage}:{})},valueGold=0,abilityPoints=0;
  if(def.host!==undefined){if(!['魂导器','拘束器'].includes(d.category))throw Error('宿主能力须由可装配器具承载');payload.host=globalThis.SoulHostCore.normalize(def.host);def.host=clone(payload.host);}
  if(d.category==='魂导器'&&payload.host?.capabilities.release?.wearerLock&&!payload.host.capabilities.release.lock)throw Error('普通装备穿戴锁缺少正式锁及外部解除通道');
  if(d.category==='拘束器'){
   const compiled=globalThis.SoulBackgroundRestraints.compile({...def.restraint,name:d.name,description:d.description,appearance:d.appearance});templateId=compiled.definition.templateId;payload.backgroundRestraint=compiled.contract;valueGold=compiled.priceGold;
   if(def.requestedBranches?.length){const g=graphs(def);if(g.passive)throw Error('拘束器附加能力须主动施用，永久防护请使用魂导器');payload.activeSkill=activeAbility(d,g.active);abilityPoints=g.spent;valueGold+=g.spent*20;}
  }else if(d.category==='工具'){
   templateId=def.templateId;const template=w().ITEM_TEMPLATES[templateId];if(template?.type!=='工具'||def.requestedBranches?.length||Object.keys(def.modifiers?.attributes??{}).length)throw Error('普通工具须采用已登记工具，不能附加未编译能力');valueGold=w().calculateItemValue(templateId);
  }else if(d.category==='情具'){
   templateId=def.templateId;const template=w().ITEM_TEMPLATES[templateId];
   if(!template?.intimate)throw Error('情具须采用已登记的情具制式');
   if(def.requestedBranches?.length)throw Error('情具不能附加魂技，请改用魂导器承载情欲能力');
   if(Object.keys(def.modifiers?.attributes??{}).length)throw Error('情具不提供六维加成');
   valueGold=template.basePrice??0;payload.templateId=templateId;payload.intimate=true;
  }else{
   const hostOnly=d.category==='魂导器'&&def.host&&!def.requestedBranches?.length&&!Object.values(def.modifiers?.attributes??{}).some(Boolean);
   const g=hostOnly?{active:null,passive:null,spent:0}:graphs(def);abilityPoints=g.spent;
   if(d.category!=='魂导器'&&g.passive)throw Error('消耗道具不能提供永久装备被动');
   if(d.category==='魂导器'){
    const types={'攻击':'attack','防御':'defense','辅助':'support','移动':'movement','侦测':'detection'},category=def.deviceCategory??'辅助';if(!types[category])throw Error('请选择魂导器用途');templateId='crafted-soul-device-'+types[category];payload.deviceCategory=category;payload.modifiers=clone(def.modifiers??{attributes:{}});
    if(g.passive){const checked=fx().validateGraph(g.passive,{ageTier:'十万年',mechanismCap:'规则'});if(!checked.pass)throw Error(checked.errors.join('；'));payload.passiveEffectGraph=g.passive;}
   }else{templateId=d.category==='丹药'?'crafted-pill':d.category==='毒药'?'crafted-poison':'crafted-hidden-disposable';if(Object.keys(def.modifiers?.attributes??{}).length)throw Error('消耗道具不能提供永久六维加成');}
   if(g.active){
    payload.activeSkill=activeAbility(d,g.active);if(d.category!=='魂导器')valueGold=Math.ceil(payload.activeSkill.abilityValue.netValue*5);
   }
   if(d.category==='魂导器'){
    const aff=globalThis.SoulCombatFoundation.EQUIPMENT_AFFIXES,shape={sourceKind:g.active?'soul-device':undefined,effectGraph:g.active??g.passive,modifiers:payload.modifiers,equipmentKind:def.equipmentKind??'自动',openingWorkshop:true};
    if(def.fixedFormId){const f=aff.FORMS.find(f=>f.id===def.fixedFormId);if(!f)throw Error('器型未登记');shape.fixedForm={id:f.id,name:f.name,bodyGroup:f.bodyGroup,bodyLabel:f.bodyLabel,kind:f.kind};shape.equipmentKind=f.kind;}
    else Object.assign(shape,aff.assignForms([shape],[],fx().calculateNodeCost,d.appearance+' '+d.name)?.[0]??{});
    if(!hostOnly&&!aff.validateForm(shape,fx().calculateNodeCost))throw Error('器型与实际效果不相容');payload.equipmentKind=shape.fixedForm.kind;payload.fixedForm=shape.fixedForm;valueGold=openingItemValue(templateId,payload);
   }
  }
  if(d.placement==='equipped'&&d.category!=='魂导器'||d.placement==='worn'&&!['拘束器','情具'].includes(d.category))throw Error('魂导器可以装备，拘束器与情具可以初始佩戴，其余道具请随身携带或暂存');
  if(['equipped','worn'].includes(d.placement)&&d.quantity!==1)throw Error('一项初始装备或佩戴设计只能放置一件，请将其余成品设为随身或暂存');
  const preset=globalThis.SoulPresetCatalog.get(templateId);if(preset&&CATEGORIES.includes(preset.category)){if(d.artId&&d.artId!==preset.artId)throw Error('该登记制式使用固定图鉴，请选择对应作品图');payload={presetId:preset.id,artId:preset.artId,...payload};}
  integer(valueGold,'真实估价');
  return {design:d,templateId,payload,valueGold,abilityPoints,contractHash:payloadIdentity(templateId,payload),quote:{free:true,valueGold,abilityPoints,quantity:d.quantity,totalValueGold:valueGold*d.quantity},summary:{name:d.name,category:d.category,description:d.description,appearance:d.appearance,active:!!payload.activeSkill,passive:!!payload.passiveEffectGraph,effectIds:[...(payload.activeSkill?.effectGraph?.nodes??[]),...(payload.passiveEffectGraph?.nodes??[])].map(n=>n.effectId),soulPowerCost:payload.activeSkill?.soulPowerCost??0,durabilityCost:payload.activeSkill?.durabilityCost??0}};
 }
 function inspectDesign(d){try{const c=compileDesign(d),timing=[...fx().designActionTimingErrors(c.payload.activeSkill),...fx().designBalanceErrors(c.payload.activeSkill),...fx().designBalanceErrors(c.payload.passiveEffectGraph?{effectGraph:c.payload.passiveEffectGraph}:null)];if(timing.length)throw Error(timing.join('；'));return {pass:true,errors:[],design:c.design,quote:c.quote,summary:c.summary,preview:{templateId:c.templateId,...Object.fromEntries(['artId','activeSkill','passiveEffectGraph','host','backgroundRestraint'].filter(k=>c.payload[k]!==undefined).map(k=>[k,clone(c.payload[k])]))}};}catch(e){return {pass:false,errors:[e.message],design:clone(d)};}}
 function recipients(config){
  const b=config?.background??{id:'custom'},backgrounds=globalThis.SoulBackgroundCore,slots=b.id==='sealed-titled'?backgrounds.resolveSlots(config):null;
  const rows=[{id:'player',name:'当前主控人物',entityId:backgrounds.playerId(b,'opening-main')},...(['prince-cat','sealed-titled'].includes(b.id)?[{id:'buyer',name:'买主',entityId:slots?.buyer.id??'resident-xue-beng'},{id:'captive',name:'被囚者',entityId:slots?.captive.id??'captive-cat-liu'}]:[])];
  for(const target of globalThis.SoulOpeningRelations.custodyTargets(config)){
   const prior=rows.find(r=>r.entityId===target.targetId);if(prior){prior.controllerName=target.controllerName;continue;}
   rows.push({id:target.key,name:target.name+'（被看管者）',entityId:target.targetId,controllerName:target.controllerName,relation:true});
  }
  return rows;
 }
 function quote(config){
  let selection;try{selection=normalize(config.openingWorkshop);}catch(e){return {pass:false,enabled:config.difficulty==='unlimited',errors:[e.message],items:[],adoptedCount:0,totalValueGold:0};}
  const enabled=config.difficulty==='unlimited',allowed=recipients(config).map(r=>r.id),items=selection.designs.map(inspectDesign),errors=[];
  const equipment=new Map(),worn=new Set(),formSlots=new Set(),actualRole=role=>recipients(config).find(r=>r.id===role)?.entityId??role;
  if(enabled)for(const i of items)if(i.design.adopted){
   if(!allowed.includes(i.design.recipient))i.errors.push('当前背景没有这位接收人物，请重新选择');
   if(i.design.recipient.startsWith('relation:')&&(i.design.category!=='拘束器'||i.design.placement!=='worn'))i.errors.push('开局关系中的被看管者可接收初始佩戴的拘束器，请选择初始佩戴');
   if(i.pass&&allowed.includes(i.design.recipient)){
    const role=actualRole(i.design.recipient);
    if(i.design.placement==='equipped'){const count=(equipment.get(role)??0)+1;equipment.set(role,count);if(count>w().EQUIPMENT_SLOTS.length)i.errors.push('同一人物的初始装备超过三个魂导器槽，请将其余作品设为随身或暂存');}
    if(i.design.placement==='worn'){const device=i.design.category==='情具'?globalThis.SoulIntimateCore?.DEVICES?.[i.design.definition.templateId]:null,part=device?.slots?.[0]??globalThis.SoulBackgroundRestraints.compile({...i.design.definition.restraint,name:i.design.name,description:i.design.description,appearance:i.design.appearance}).device.part,key=role+':'+part;if(worn.has(key))i.errors.push('同一人物的初始佩戴部位重复，请将其余作品设为随身或暂存');worn.add(key);}
    if(['equipped','worn'].includes(i.design.placement)){
     const slots=new Set(i.design.definition.host?Object.keys(globalThis.SoulHostCore.normalize(i.design.definition.host).capabilities.forms?.slots??{}):[]);
     if(i.design.placement==='worn'&&globalThis.SoulWearableCore?.registered(i.design.definition.templateId))for(const slot of globalThis.SoulWearableCore.REGISTRY[i.design.definition.templateId].slots)slots.add(slot);
     for(const slot of slots){const key=role+':'+slot;if(formSlots.has(key))i.errors.push('同一人物的初始形态或佩戴部位重复，请将其余作品设为随身或暂存');formSlots.add(key);}
    }
   }
   i.pass=!i.errors.length;errors.push(...i.errors.map(e=>i.design.name+'：'+e));
  }
  return {pass:!errors.length,enabled,errors,items,placementNote:'接收人物已有的装备或束具也会占用位置；位置不足时，请改为放入行囊或暂存。',adoptedCount:enabled?items.filter(i=>i.design.adopted).length:0,totalValueGold:enabled?items.filter(i=>i.design.adopted&&i.pass).reduce((s,i)=>s+i.quote.totalValueGold,0):0};
 }
 function relationPersonId(s,ref,previewId){const b=s.世界.opening.background;return ref.source==='opening'?(ref.side==='main'?b.mainId:ref.side==='buyer'?b.buyerId:b.subjectId):previewId;}
 function recipientId(s,role,config){
  const b=s.世界?.opening?.background;if(RECIPIENTS.includes(role))return role==='player'?s.角色.主控单位ID:role==='buyer'?b?.buyerId:b?.subjectId;
  const target=globalThis.SoulOpeningRelations.custodyTargets(config).find(r=>r.key===role),entry=target&&s.世界.opening.relations?.entries[target.entryIndex];
  if(!entry||!entry.custody)throw Error('所选人物没有已确认的开局看管关系');
  const wearer=entry.custody==='master'?entry.targetId:entry.actorId,controller=entry.custody==='master'?entry.actorId:entry.targetId,record=custody().active(s,wearer);
  if(wearer!==relationPersonId(s,target.targetRef,target.targetId)||controller!==relationPersonId(s,target.controllerRef,target.controllerId)||record?.custodianId!==controller)throw Error('初始佩戴人物与开局看管关系不一致，请重新选择');
  return wearer;
 }
 /** A frozen manufacture source, separate from paid crafting and from the character point pool. */
 function install(s,config,sourceId){
  const q=quote(config);if(!q.pass)throw Error(q.errors.join('；'));if(!q.enabled)return [];
  const selection=normalize(config.openingWorkshop),designs=selection.designs.filter(d=>d.adopted).map(compileDesign);if(!designs.length)return [];
  if(s.扩展?.openingWorkshop){const old=s.扩展.openingWorkshop;if(old.sourceId!==sourceId||!valid(old))throw Error('工坊开局来源已经改变');return old.grants.flatMap(g=>g.itemIds);}
  if(s.世界?.processedTransactions?.[sourceId])throw Error('开局工坊只能在本次人物创建时发放');
  const grants=designs.map(c=>{const ownerId=recipientId(s,c.design.recipient,config);if(!s.人物?.列表?.[ownerId])throw Error('工坊接收人物尚未建立');const held=c.design.category==='拘束器'&&c.design.placement==='worn'?custody().active(s,ownerId):null;return {designId:c.design.id,ownerId,...(held&&held.custodianId!==ownerId?{controllerId:held.custodianId,custodyId:held.id}:{}),quantity:c.design.quantity,contractHash:c.contractHash,itemIds:[],design:clone(c.design)};});
  const record={version:1,sourceId,difficulty:'unlimited',grants};s.扩展.openingWorkshop=stamp(record);
  const ids=[];
  for(const [i,c] of designs.entries()){
   const g=grants[i],person=s.人物.列表[g.ownerId],template=w().ITEM_TEMPLATES[c.templateId],pieces=template.stackable?1:g.quantity;
   const container=c.design.placement==='stash'?w().ensureLocationStash(s,g.ownerId,person.locationId):s.容器.列表[person.inventoryContainerId];
   if(!container)throw Error('接收人物没有实际物品容器');
   for(let n=0;n<pieces;n++){
    const itemId='opening-workshop-'+hash([sourceId,c.design.id,n]).slice(-16);g.itemIds.push(itemId);s.扩展.openingWorkshop=stamp(record);
    const item=w().createItem(s,c.templateId,g.ownerId,container.id,{id:itemId,name:c.design.name,forceUnique:true,quantity:template.stackable?g.quantity:1,valuePoints:c.valueGold,payload:clone(c.payload),provenance:{type:'opening-workshop',sourceId,designId:g.designId,contractHash:c.contractHash},扩展:{描述:c.design.description,形态:c.design.appearance,命名来源:'preset'}});ids.push(item.id);
    if(c.design.placement==='equipped'){const slots=s.装备.配置[g.ownerId]?.slots,slot=w().EQUIPMENT_SLOTS.find(k=>!slots?.[k]);if(!slot)throw Error(person.name+'的三个魂导器槽均已占用，请改为随身或暂存');globalThis.SoulHostCore?.assertSlots(s,item,g.ownerId);slots[slot]=item.id;}
    if(c.design.placement==='worn')attachInitial(s,item,c,g,sourceId);
   }
  }
  s.扩展.openingWorkshop=stamp(record);return ids;
 }
 function sourceGrant(s,item){const r=s.扩展?.openingWorkshop,p=item?.provenance;if(p?.type!=='opening-workshop'||!valid(r)||r.version!==1||r.difficulty!=='unlimited'||r.sourceId!==p.sourceId||r.sourceId!==s.世界?.opening?.committedTransactionId)return null;const g=r.grants.find(g=>g.designId===p.designId);if(!g||g.contractHash!==p.contractHash)return null;return g;}
 function isItemAuthorized(s,item){try{const g=sourceGrant(s,item);if(!g)return false;const c=compileDesign(g.design);return c.contractHash===g.contractHash&&c.templateId===item.templateId&&payloadIdentity(item.templateId,item.payload)===g.contractHash&&(item.valuePoints===undefined||item.valuePoints===c.valueGold)&&(item.name===undefined||item.name===c.design.name)&&(item.type===undefined||item.type===w().ITEM_TEMPLATES[c.templateId].type);}catch{return false;}}
 function isAbilitySource(s,item,actorId){
  if(!abilityOperators(s,item).includes(actorId)||item.durability<=0)return false;
  if(!item.attachment)return true;
  try{return globalThis.SoulScenePosition.colocated(s,actorId,item.attachment.wearerId);}catch{return false;}
 }
 /** Ownership and controller rights grant an action; location and wear are checked when it is used. */
 function abilityOperators(s,item){
  if(!item?.payload?.backgroundRestraint||!item.payload.activeSkill||(!isItemAuthorized(s,item)&&!globalThis.SoulPaidDesign?.isItemSource(s,item))||item.quantity!==1)return [];
  const container=s.容器?.列表?.[item.containerId],a=item.attachment;
  if(!container?.itemIds.includes(item.id))return [];
  if(!a)return item.ownerEntityId&&s.人物?.列表?.[item.ownerEntityId]&&container.type==='inventory'&&container.ownerEntityId===item.ownerEntityId?[item.ownerEntityId]:[];
  if(!s.人物?.列表?.[a.wearerId]||container.扩展?.wearerId!==a.wearerId||!Array.isArray(a.controllers))return [];
  return [...new Set(a.controllers)].filter(id=>!!s.人物?.列表?.[id]);
 }
 function attachInitial(s,item,c,g,sourceId){
  const wearable=globalThis.SoulWearableCore;if(wearable?.registered(item))return wearable.attachInitial(s,item,{actorId:g.ownerId,sourceId:sourceId+':workshop-wear:'+g.designId});
  globalThis.SoulHostCore?.assertSlots(s,item,g.ownerId);
  const cp=custody(),d=cp.resolveDevice(item),wearer=g.ownerId,controller=g.controllerId??wearer;
  if(g.controllerId){const held=cp.active(s,wearer);if(!held||held.id!==g.custodyId||held.custodianId!==controller)throw Error('初始佩戴缺少对应的开局看管关系');item.ownerEntityId=controller;}
  if(globalThis.SoulPersonCore.levelOf(s,wearer)>d.maxLevel)throw Error('拘束器最高适用等级不足');if(cp.attached(s,wearer).some(i=>cp.resolveDevice(i)?.part===d.part))throw Error('初始佩戴部位已有拘束器，请将作品放入行囊或暂存');
  const containerId='container-restraints-'+wearer;s.容器.列表[containerId]??={id:containerId,type:'restraints',ownerEntityId:'',locationId:s.人物.列表[wearer].locationId,itemIds:[],capacity:{slots:6,infinite:false},status:'active',扩展:{wearerId:wearer}};
  const source=sourceId+':workshop-wear:'+g.designId,at=globalThis.SoulPersonCore.now(s);s.容器.列表[item.containerId].itemIds=s.容器.列表[item.containerId].itemIds.filter(id=>id!==item.id);s.容器.列表[containerId].itemIds.push(item.id);item.containerId=containerId;item.attachment=cp.stamp({wearerId:wearer,part:d.part,mode:c.design.definition.restraint.mode,locked:c.design.definition.restraint.mode==='locked',controllers:[controller],sourceId:source,captureSourceId:source,originKind:'opening-workshop',attachedBy:controller,attachedAt:at});
  if(c.design.definition.restraint.limits){const limits=globalThis.SoulControlCore.limitSpec(c.design.definition.restraint.limits),p=limits.permission;if(p?.maxCastRank!==undefined){p.soulIds=clone(s.成长.列表[wearer].武魂ID列表);p.ringIds=Object.values(s.魂环?.列表??{}).filter(r=>r.持有者单位ID===wearer&&(r.序号??r.魂环序号??0)<=p.maxCastRank).map(r=>r.id);}item.attachment.limits=limits;}
  if(item.attachment.mode!=='released')item.attachment.effectIds=w().commerceHooks().custody.applyDevice(s,controller,wearer,item.id,source).filter(e=>e.statusId).map(e=>e.statusId);else item.attachment.effectIds=[];
  cp.stamp(item.attachment);cp.event(s,'restraint-attached',controller,wearer,source,{itemId:item.id,attachment:clone(item.attachment),authority:{kind:'opening-workshop',designId:g.designId,...(g.custodyId?{custodyId:g.custodyId}:{})}});
 }
 function initialAttachment(s,item){const g=sourceGrant(s,item);if(!g||!isItemAuthorized(s,item)||g.design.placement!=='worn'||!g.itemIds.includes(item.id))return null;const e=custody().table(s).events.find(e=>e.type==='restraint-attached'&&e.itemId===item.id&&e.sourceId===s.扩展.openingWorkshop.sourceId+':workshop-wear:'+g.designId&&e.attachment.originKind==='opening-workshop'&&e.targetId===g.ownerId&&e.actorId===(g.controllerId??g.ownerId)&&(!g.custodyId||e.authority?.custodyId===g.custodyId));return e??null;}
 function validateState(s){
  const r=s.扩展?.openingWorkshop,items=Object.values(s.物品?.实例??{}).filter(i=>i.provenance?.type==='opening-workshop'),errors=[];
  if(!r)return items.length?['工坊成品缺少开局制造来源']:[];
  if(!valid(r)||r.version!==1||r.difficulty!=='unlimited'||r.sourceId!==s.世界?.opening?.committedTransactionId||!Array.isArray(r.grants))return ['开局工坊冻结来源无效'];
  const ids=new Set(),initialIds=new Set();for(const g of r.grants)try{
   const c=compileDesign(g.design);if(!g.design.adopted||ids.has(g.designId)||g.designId!==c.design.id||g.contractHash!==c.contractHash||g.quantity!==c.design.quantity||!s.人物.列表[g.ownerId]||!Array.isArray(g.itemIds)||g.itemIds.length!==(w().ITEM_TEMPLATES[c.templateId].stackable?1:g.quantity))throw Error('发放记录无效');ids.add(g.designId);
   if(g.controllerId!==undefined||g.custodyId!==undefined){const db=custody().table(s),attached=db.events.find(e=>e.type==='restraint-attached'&&e.sourceId===r.sourceId+':workshop-wear:'+g.designId&&g.itemIds.includes(e.itemId)&&e.actorId===g.controllerId&&e.targetId===g.ownerId&&e.authority?.custodyId===g.custodyId),authority=attached&&custody().historicalAuthority(s,g.ownerId,attached.at,attached.order);if(g.design.category!=='拘束器'||g.design.placement!=='worn'||!s.人物.列表[g.controllerId]||g.controllerId===g.ownerId||authority?.custodyId!==g.custodyId||authority?.custodianId!==g.controllerId)throw Error('初始佩戴控制者缺少对应看管来源');}
   if(g.design.recipient.startsWith('relation:')){const target=globalThis.SoulOpeningRelations.custodyTargets(s.世界.opening.background.config).find(v=>v.key===g.design.recipient);if(!target||g.ownerId!==relationPersonId(s,target.targetRef,target.targetId)||g.controllerId!==relationPersonId(s,target.controllerRef,target.controllerId))throw Error('初始佩戴不符确认的开局关系');}
   for(const [index,id] of g.itemIds.entries()){if(initialIds.has(id)||id!=='opening-workshop-'+hash([r.sourceId,g.designId,index]).slice(-16))throw Error('初始实物编号无效');initialIds.add(id);}
   const current=items.filter(i=>i.provenance.designId===g.designId);if(current.reduce((n,i)=>n+i.quantity,0)>g.quantity)throw Error('剩余数量超过实际发放');
  }catch(e){errors.push('工坊作品'+g.designId+'：'+e.message);}
  for(const item of items)if(!isItemAuthorized(s,item))errors.push('工坊成品'+item.id+'与冻结制造合同不符');return errors;
 }
 function fromTemplate(id){
  if(id.startsWith('restraint:')){const r=globalThis.SoulBackgroundRestraints.defaults(id.slice(10)),artId=globalThis.SoulPresetArt?.BINDINGS['preset:restraint-'+r.templateId]?.artId;return {id:'work-'+id.slice(10),category:'拘束器',name:r.name,description:r.description,appearance:r.appearance,quantity:1,recipient:'player',placement:'inventory',adopted:false,definition:{restraint:r},...(artId?{artId}:{})};}
  if(id.startsWith('tool:')){const t=w().ITEM_TEMPLATES[id.slice(5)];if(t?.type!=='工具')throw Error('工具未登记');return {id:'work-'+id.slice(5),category:'工具',name:t.name,description:t.description??'按登记用途使用的普通工具。',appearance:t.appearance??'结实耐用的普通器具。',quantity:1,recipient:'player',placement:'inventory',adopted:false,definition:{templateId:id.slice(5)}};}
  if(id.startsWith('intimate:')){const key=id.slice(9),item=w().ITEM_TEMPLATES[key],device=globalThis.SoulIntimateCore?.DEVICES?.[key];if(!item?.intimate||!device)throw Error('情具制式未登记');return {id:'work-'+key,category:'情具',name:device.name,description:`${device.name}，佩戴后可调节档位。`,appearance:`一件做工细致的${device.name}。`,quantity:1,recipient:'player',placement:'worn',adopted:false,definition:{templateId:key}};}
  let category,r,name,description,appearance,artId;
  if(id.startsWith('person-tool:')){const t=globalThis.SoulPersonTools.definitions().find(t=>t.key===id.slice(12));if(!t)throw Error('模板未登记');category='魂导器';r=t.activeSkill;name=t.name;description=t.description;appearance=t.form;}
  else {const p=globalThis.SoulPresetCatalog,entry=p.get(id);if(!entry||!CATEGORIES.includes(entry.category))throw Error('作品模板未登记');if(entry.category==='拘束器')return fromTemplate('restraint:'+p.request(id).templateId);category=entry.category;r=p.request(id);name=entry.name;description=entry.description;appearance=entry.appearance;artId=entry.artId;}
  const graph=r.effectGraph??r.passiveEffectGraph??(r.passiveNodes?fx().makeBranchedGraph([{id:'passive',activation:'passive',nodes:r.passiveNodes}]):r.requestedBranches?fx().makeBranchedGraph(r.requestedBranches.map(b=>({...b,nodes:b.requestedEffects??b.nodes}))):fx().makeLinearGraph(r.requestedEffects??r.effectSpecs??[]));
  const definition={requestedBranches:fx().graphBranches(graph).map(b=>({id:b.id,label:b.label,activation:b.activation,optional:b.optional,nodes:b.nodes.map(n=>[n.effectId,clone(n.params)])})),soulPowerCost:r.soulPowerCost??0,durabilityCost:r.durabilityCost??(category==='魂导器'?1:0),cooldownTurns:r.cooldownTurns??0,requirements:clone(r.requirements??(category==='丹药'||category==='毒药'?['gesture','ingest']:['gesture'])),modifiers:clone(r.modifiers??{attributes:{}}),equipmentKind:r.equipmentKind??'自动',deviceCategory:r.deviceCategory??'辅助'};
  for(const k of ['resourceCosts','maintenanceCosts','usageRules','castModes','defaultCastMode','medicine','outputScale','nativeCastRank','minimumCastRank','soulPowerCostRate','targetConditions','effectConditions'])if(r[k]!==undefined)definition[k]=clone(r[k]);if(r.fixedForm)definition.fixedFormId=typeof r.fixedForm==='string'?r.fixedForm:r.fixedForm.id;
  if(definition.effectConditions){const rebuilt=fx().makeBranchedGraph(definition.requestedBranches);definition.effectConditions=Object.fromEntries(Object.entries(definition.effectConditions).map(([nodeId,condition])=>[rebuilt.nodes[graph.nodes.findIndex(n=>n.id===nodeId)]?.id??nodeId,condition]));}
  return {id:'work-'+id.replace(/[^a-zA-Z0-9_-]/g,'-'),category,name,description,appearance,quantity:1,recipient:'player',placement:'inventory',adopted:false,definition,...(artId?{artId}:{})};
 }
 function catalog(config={}){
  const intimateDevices=Object.entries(globalThis.SoulIntimateCore?.DEVICES??{}).filter(([id])=>w().ITEM_TEMPLATES[id]?.intimate).map(([id,device])=>({id,name:device.name}));
  const presets=globalThis.SoulPresetCatalog.list().filter(p=>CATEGORIES.includes(p.category)&&p.category!=='拘束器').map(p=>p.id),restraints=globalThis.SoulBackgroundRestraints.catalog(),tools=Object.entries(w().ITEM_TEMPLATES).filter(([,t])=>t.type==='工具').map(([id,t])=>({id,name:t.name}));
  const templates=[...presets,...restraints.map(r=>'restraint:'+r.id),...tools.map(t=>'tool:'+t.id),...globalThis.SoulPersonTools.definitions().map(t=>'person-tool:'+t.key),...intimateDevices.map(device=>'intimate:'+device.id)].flatMap(id=>{try{const design=fromTemplate(id),check=inspectDesign(design);return check.pass?[{...design,id,label:design.name,design}]:[];}catch{return [];}});
  return {version:1,categories:CATEGORIES,templates,effects:clone(fx().EFFECT_REGISTRY),attributeKeys:clone(globalThis.SoulCombatFoundation.ATTRIBUTE_KEYS),forms:clone(globalThis.SoulCombatFoundation.EQUIPMENT_AFFIXES.FORMS),tools,restraints,intimateDevices,recipients:recipients(config),placements:PLACEMENTS};
 }
 return Object.freeze({CATEGORIES,designGrammar,normalize,compileDesign,inspectDesign,quote,recipients,catalog,fromTemplate,install,isItemAuthorized,isAbilitySource,abilityOperators,initialAttachment,validateState});
});
