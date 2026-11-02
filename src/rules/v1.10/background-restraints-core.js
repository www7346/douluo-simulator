(function(root,factory){
 const custody=root?.SoulCustodyCore??(typeof require==='function'?require('./custody-core.js'):null);
 const controls=root?.SoulControlCore??(typeof require==='function'?require('./control-core.js'):null);
 const abilities=root?.SoulAbilityContract??(typeof require==='function'?require('./ability-contract-core.js'):null);
 const api=factory(custody,controls,abilities);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.SoulBackgroundRestraints=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(custody,controls,abilities){
 'use strict';
 const clone=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
 const same=(a,b)=>a===undefined||b===undefined?a===b:abilities.hash(a)===abilities.hash(b);
 const eligible=id=>['prince-cat','sealed-titled'].includes(id);
 const level=input=>typeof input==='string'?(input==='sealed-titled'?92:9):input?.id==='sealed-titled'?(input.actors?.captive?.level??globalThis.SoulCanonArenaEngine?.CHARACTER_CATALOG[input.actors?.captive?.characterId]?.level??92):9;
 const budget=id=>id==='sealed-titled'?1800000:1000000;
 const FIELDS=['templateId','name','description','appearance','mode','binding','limits'];
 const PARTS={hands:['双手'],legs:['双腿'],body:['双手','双腿','全身']};
 const LABELS={locked:'锁定',escort:'押送',limited:'受限活动',released:'佩戴中解放'};
 const PRESENTATION={
  'restraint-ankles':['以短链连接两只足铐，扣合后收紧在双踝处，让步幅受制于链条的长度。','乌黑的铁环内侧磨得平整，铆钉埋在外缘；中间的短链随动作碰出低沉的金属声。'],
  'restraint-sinking-wrists':['沉星石嵌入腕环，扣紧时泛起暗淡的光。除了固定双腕，它还让佩戴者的力量沉滞，抬臂也变得吃力。','暗银色腕环边缘嵌着细小晶石，连接扣藏在外侧，石纹如夜空中的碎星。'],
  'restraint-quicksand-ankles':['足环中的晶砂不断流动，牵住双踝，也拖慢佩戴者的动作。即使放松锁扣，流沙般的迟滞仍可保留。','浅灰晶砂封在半透明环槽中，两侧扣舌贴合踝骨，转动时发出细微的沙响。'],
  'restraint-tether':['腕扣收束双手，牵绳留出一段余量，适合近身看管或带人穿过拥挤的街巷。','皮革包覆的腕扣以绳结相连，长绳末端绕成便于握持的环，磨旧处露出浅色纤维。'],
  'restraint-net':['细钢环织成可以收拢的网，拉紧边缘的束索，网面便贴着身形收紧，缠住躯干与四肢。','密集钢环层层相扣，边缘穿着深色束索，展开时柔软垂落，收拢后却像一层贴身铁衣。'],
  rope:['粗麻纤维搓成的长绳，结实而易于打结。可绕腕成束，也可沿躯干编出更紧密的绳缚。','十米长的浅褐麻绳盘成一卷，表面带着细小绒刺，绳端用细线扎牢。'],
  'restraint-cuffs':['玄铁双铐以短铰链相连，闭合后固定两腕。厚重的铐体难以扭曲，锁芯藏在铰链旁的窄槽里。','深黑铁铐带着冷硬光泽，边缘磨成圆弧，铰链上刻着细密的锻打纹。'],
  'restraint-gag':['柔软内垫贴合口部，颊侧锁扣控制松紧与开合。扣合后限制发声，解开锁扣便可移除。','深色皮带连着弧形束片，内面衬着软垫，两侧铜扣小巧，扣舌收在皮带末端。'],
  'restraint-seal-collar':['三道封魂回路沿颈环闭合，锁定时压住魂力、武魂与魂技。控制扣可调节封印，让佩戴者恢复部分力量。','乌银颈环的内外两侧都刻着细密魂纹，颈后藏有锁扣，封魂时纹路泛起幽蓝微光。'],
  'restraint-seal-platform':['将封神台的封印回路引入囚锁，以锁臂与魂纹共同压制佩戴者。连封号斗罗的魂力与魂技，也能被困在层层回路之中。','黑金锁臂与连接链交错，魂纹沿锁臂汇入中央封印核；回路亮起时，纹光像细线般逐段闭合。'],
  'restraint-slime-suit':['百变史莱姆王打造的透明胶衣，贴合全身，像第二层皮肤。穿者无法自行取下，主人可调压制力度，也能让它拟态出各种器具。','透明胶质紧贴身形，表面随光影流动；变换外观时，胶体像被重新塑形一样舒展开来。']
 };
 function object(value,keys,label){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!keys.includes(k)))throw Error(label+'包含不支持的设定');}
 function hasBinding(d){return Object.values(d.modes).flat().some(([id])=>id==='status.limb_bind');}
 function defaults(templateId){
  const d=custody.DEVICES[templateId];if(!d)throw Error('请选择登记的拘束器制式');
  const [description,appearance]=PRESENTATION[templateId];
  const result={templateId,name:d.name,description,appearance,mode:'locked'};
  if(hasBinding(d)){const params=Object.values(d.modes).flat().find(([id])=>id==='status.limb_bind')[1];result.binding={part:params.部位,pose:'身前',layers:1,difficultyBonus:0,retainInLimited:false};}
  return result;
 }
 // A draft may have unfinished names; it still cannot contain effects, entities or rights.
 function selection(input,backgroundId){
  if(input===undefined)return undefined;
  if(!eligible(backgroundId)||!Array.isArray(input)||input.length<1||input.length>6)throw Error('此背景须配置一至六件拘束器');
  for(const draft of input){object(draft,FIELDS,'拘束器');if(!custody.DEVICES[draft.templateId])throw Error('拘束器制式未登记');
   for(const [key,max] of [['name',40],['description',500],['appearance',500]])if(typeof draft[key]!=='string'||draft[key].length>max)throw Error('拘束器文字格式不符');
   if(draft.binding!==undefined)object(draft.binding,['part','pose','layers','difficultyBonus','retainInLimited'],'肢体拘束');
   if(draft.limits!==undefined){object(draft.limits,['soulPowerPercent','damagePercent','permission'],'精细限制');if(draft.limits.permission!==undefined)object(draft.limits.permission,['allowedKinds','maxCastRank'],'初始能力许可');}
  }
  return clone(input);
 }
 function compile(draft){
  selection([draft],'prince-cat');const base=custody.DEVICES[draft.templateId],definition=defaults(draft.templateId);
  for(const key of ['name','description','appearance']){if(!draft[key].trim())throw Error('请填写拘束器的名称、介绍和构造外观');definition[key]=draft[key].trim();}
  if(!Object.hasOwn(base.modes,draft.mode))throw Error('该制式不支持所选初始模式');definition.mode=draft.mode;
  if(hasBinding(base)){
   const b=draft.binding??definition.binding;
   if(!PARTS[base.part]?.includes(b.part)||!['身前','身后'].includes(b.pose)||!Number.isInteger(b.layers)||b.layers<1||b.layers>6||!Number.isInteger(b.difficultyBonus)||b.difficultyBonus<0||b.difficultyBonus>6||typeof b.retainInLimited!=='boolean'||b.retainInLimited&&!Object.hasOwn(base.modes,'limited'))throw Error('拘束部位、姿态、层数或挣脱加值不合法');
   definition.binding=clone(b);
  }else if(draft.binding!==undefined)throw Error('该制式没有肢体拘束结构');
  if(draft.mode==='limited'&&['restraint-seal-collar','restraint-seal-platform','restraint-slime-suit'].includes(draft.templateId)){
   definition.limits=controls.limitSpec(draft.limits??{soulPowerPercent:0,...(draft.templateId==='restraint-seal-platform'?{damagePercent:0}:{}),permission:{allowedKinds:['ordinary'],maxCastRank:0}});
   if(draft.templateId==='restraint-seal-collar'&&definition.limits.damagePercent!==undefined)throw Error('禁魂项圈没有伤害调节回路');
  }else if(draft.limits!==undefined)throw Error('当前模式不使用精细封印配置');
  const b=definition.binding,priceGold=base.price*(b?.layers??1)+40*(b?.layers??1)*(b?.difficultyBonus??0);
  const device=clone(base);device.name=definition.name;device.price=priceGold;
  for(const [mode,specs] of Object.entries(device.modes)){
   const binding=specs.find(([id])=>id==='status.limb_bind');
   const intersection=mode==='escort'&&binding?(b.part==='全身'?binding[1].部位:binding[1].部位==='全身'||binding[1].部位===b.part?b.part:null):b?.part;
   if(mode==='escort'&&binding&&!intersection){delete device.modes[mode];continue;}
   device.modes[mode]=specs.map(([id,params])=>[id,id==='status.limb_bind'?{...params,部位:intersection,姿态:b.pose,层数:b.layers,挣脱难度加值:b.difficultyBonus}:params]);
   if(mode==='limited'&&b?.retainInLimited&&!specs.some(([id])=>id==='status.limb_bind'))device.modes[mode].unshift(['status.limb_bind',{部位:b.part,姿态:b.pose,层数:b.layers,挣脱难度加值:b.difficultyBonus}]);
  }
  if(!Object.hasOwn(device.modes,definition.mode))throw Error('当前拘束部位不能采用这个模式，请选择锁定或解放');
  const mechanicalHash=abilities.hash({version:2,templateHash:abilities.hash(base),binding:b??null,modes:device.modes});
  const activeBinding=device.modes[definition.mode].some(([id])=>id==='status.limb_bind');
  return {definition,device,priceGold,mechanicalHash,activeBinding,contract:{version:2,definition,templateHash:abilities.hash(base),mechanicalHash}};
 }
 function resolve(item){
  const contract=item?.payload?.backgroundRestraint,base=custody.DEVICES[item?.templateId];if(!contract)return base;
  object(contract,['version','definition','templateHash','mechanicalHash'],'背景拘束器合同');const compiled=compile(contract.definition);
  if(contract.version!==2||item.templateId!==compiled.definition.templateId||!same(compiled.contract,contract))throw Error('背景拘束器合同与实际制式不一致');
  // The original consignor transports the titled person in the registered full-body lock.
  // Only the buyer's subsequent, recorded configuration enables the authored binding.
  if(item.templateId==='restraint-seal-platform'&&item.attachment?.originKind==='initial-custody'&&item.attachment.sourceId===item.attachment.captureSourceId)return {...clone(base),name:compiled.definition.name,price:compiled.priceGold};
  return compiled.device;
 }
 function quote(background){
  if(!eligible(background?.id))return null;
  const drafts=background.creationItems??[defaults(background.id==='sealed-titled'?'restraint-seal-platform':'rope')];
  selection(drafts,background.id);const errors=[],items=[];
  for(const [index,draft] of drafts.entries())try{const result=compile(draft);if(level(background)>result.device.maxLevel)throw Error(`${result.device.name}最高适用于${result.device.maxLevel}级，不能用于${level(background)}级人物`);items.push({...result,index,modes:Object.keys(result.device.modes).map(id=>({id,name:LABELS[id]}))});}catch(e){errors.push(`第${index+1}件：${e.message}`);}
  if(new Set(items.map(v=>v.device.part)).size!==items.length)errors.push('同一器具装配部位不能重复配置');
  if(!items.some(v=>v.device.capture))errors.push('至少保留一件能固定行动的拘束器');
  const total=items.reduce((n,v)=>n+v.priceGold,0),maximum=budget(background.id);if(total>maximum)errors.push('器具估价超过这次既往成交的配套额度');
  return {pass:!errors.length,errors,items,total,maximum,wearerLevel:level(background),custom:background.creationItems!==undefined};
 }
 function createItems(state,personId,ownerId,config,sourceId,world,fallback){
  if(personId!==globalThis.SoulBackgroundCore.targetId(config.background)||config.background.creationItems===undefined)return fallback();
  const q=quote(config.background);if(!q.pass)throw Error(q.errors.join('；'));
  return q.items.map((result,index)=>{
   const item=world.createItem(state,result.definition.templateId,ownerId,state.人物.列表[ownerId].inventoryContainerId,{id:`background-restraint:${sourceId}:${index+1}`,name:result.definition.name,payload:{backgroundRestraint:result.contract},provenance:{type:'background-initial-restraint',sourceId,personId,index}});
   item.valuePoints=result.priceGold;item.扩展.描述=result.definition.description;item.扩展.构造外观=result.definition.appearance;
   globalThis.SoulCommerceProvenance.registerAsset(state,item,result.definition.description);return item.id;
  });
 }
 function configureDelivered(state,config,purchase,world){
  if(config.background.creationItems===undefined)return;
  const q=quote(config.background),hooks=world.commerceHooks().custody;
  purchase.deviceSetupEventIds=[];
  for(const [index,c] of q.items.entries())if(needsSetup(c)){
   const sourceId=`${purchase.id}:device-setup:${index}`,request={actorId:purchase.buyerId,itemId:purchase.deviceItemIds[index],mode:c.definition.mode,...(c.definition.limits?{limits:c.definition.limits}:{})};
   custody.setDeviceMode(state,request,sourceId,hooks);
   purchase.deviceSetupEventIds.push(custody.table(state).events.find(e=>e.sourceId===sourceId&&e.type==='restraint-mode-changed').id);
  }
 }
 function validate(state){
  const record=state.世界.opening?.background,background=record?.config?.background;
  const paidHostProduct=i=>{const b=state.研发?.蓝图?.[i.payload?.blueprintId];return !!b?.mechanics?.hostDesign&&globalThis.SoulExpeditionEngine?.validateBlueprintProductItem(i,b)===true&&globalThis.SoulHostCore?.sourceAllowed(state,i)===true;};
  const all=Object.values(state.物品?.实例??{}).filter(i=>(i.payload?.backgroundRestraint||i.provenance?.type==='background-initial-restraint'||i.id?.startsWith('background-restraint:'))&&!globalThis.SoulOpeningWorkshop?.isItemAuthorized(state,i)&&!paidHostProduct(i)&&!globalThis.SoulPaidDesign?.isItemSource(state,i));
  if(!background?.creationItems)return all.length?['自定义拘束器缺少背景创建来源']:[];
  try{
   const q=quote(background);if(!q.pass)throw Error(q.errors.join('；'));const sourceId=record.sourceId,personId=globalThis.SoulBackgroundCore.targetId(background),expectedIds=q.items.map((_,i)=>`background-restraint:${sourceId}:${i+1}`);
   if(!same(globalThis.SoulBackgroundOpening.acquisition(record)?.deviceItemIds,expectedIds)||all.length!==expectedIds.length)throw Error('实际器具集合与创建配置不一致');
   for(const [index,c] of q.items.entries()){
    const item=state.物品.实例[expectedIds[index]],expected={type:'background-initial-restraint',sourceId,personId,index};
    if(!item||!same(item.provenance,expected)||item.templateId!==c.definition.templateId||item.name!==c.definition.name||item.valuePoints!==c.priceGold||!same(item.payload?.backgroundRestraint,c.contract)||item.扩展?.描述!==c.definition.description||item.扩展?.构造外观!==c.definition.appearance)throw Error('器具实体、文字、价格或机械合同被改写');
    resolve(item);const first=globalThis.SoulCustodyCore.table(state).events.find(e=>e.type==='restraint-attached'&&e.itemId===item.id),a=first?.attachment;
    if(!a||a.wearerId!==personId||a.mode!=='locked'||a.limits!==undefined)throw Error('既往装配未以真实锁定模式建立');
    if(needsSetup(c)){
     const setupId=`${globalThis.SoulBackgroundOpening.acquisition(record).id}:device-setup:${index}`,events=custody.table(state).events.filter(e=>e.sourceId===setupId&&e.type==='restraint-mode-changed'),setup=events[0];
     const expectedLimits=c.definition.limits?initialLimits(state,background,personId,c.definition.limits):undefined;
     if(events.length!==1||!globalThis.SoulBackgroundOpening.acquisition(record).deviceSetupEventIds?.includes(setup.id)||setup.actorId!==record.buyerId||setup.targetId!==personId||setup.itemId!==item.id||setup.at!==record.createdAt||setup.order<=custody.table(state).events.find(e=>e.id===globalThis.SoulBackgroundOpening.acquisition(record).custodyTransferEventId).order||setup.attachment.mode!==c.definition.mode||!same(setup.attachment.limits,expectedLimits))throw Error('开局模式或许可缺少买主实际交付后的配置事件');
     const door=custody.table(state).events.find(e=>e.sourceId===`${globalThis.SoulBackgroundOpening.acquisition(record).id}:door`&&e.type==='logistics-facilities');
     const arrivalEventId=globalThis.SoulBackgroundOpening.acquisition(record).awakeningSealEventId??globalThis.SoulBackgroundOpening.acquisition(record).openingSealEventId;
     const arrival=globalThis.SoulBackgroundOpening.acquisition(record).platformItemId?globalThis.SoulSealingCore.table(state).events.find(e=>e.id===arrivalEventId):null;
     if(!door||setup.order<=door.order||globalThis.SoulBackgroundOpening.acquisition(record).platformItemId&&(!arrival||setup.order<=arrival.order))throw Error('器具配置必须发生在到宅安置与锁门之后');
    }
   }
   const expectedSetupCount=q.items.filter(needsSetup).length;
   if(!Array.isArray(globalThis.SoulBackgroundOpening.acquisition(record).deviceSetupEventIds)||new Set(globalThis.SoulBackgroundOpening.acquisition(record).deviceSetupEventIds).size!==expectedSetupCount||globalThis.SoulBackgroundOpening.acquisition(record).deviceSetupEventIds.length!==expectedSetupCount)throw Error('开局器具配置回执数量不一致');
   return [];
  }catch(e){return ['背景自定义拘束器来源无效：'+e.message];}
 }
 function needsSetup(c){return c.definition.mode!=='locked'||c.definition.templateId==='restraint-seal-platform';}
 function initialLimits(state,background,personId,input){
  const result=controls.limitSpec(input),p=result.permission;
  if(p?.maxCastRank!==undefined){
   // IDs belong to the creation-time single soul. Later rings must not rewrite a past payment.
   const soulId=`soul-${personId}-1`;p.soulIds=[soulId];
   p.ringIds=background.id==='sealed-titled'?(state.成长.列表[personId]?.扩展?.backgroundHistory?.records??[]).filter(r=>r.ordinal<=p.maxCastRank).map(r=>r.ringId):[];
  }
  return result;
 }
 function catalog(){return Object.entries(custody.DEVICES).map(([id,d])=>({id,name:d.name,part:d.part,maxLevel:d.maxLevel,capture:d.capture,price:d.price,breakDifficulty:d.breakDifficulty,modes:Object.keys(d.modes).map(id=>({id,name:LABELS[id]})),parts:PARTS[d.part]??[],supportsFineLimits:['restraint-seal-collar','restraint-seal-platform','restraint-slime-suit'].includes(id),supportsDamage:id==='restraint-seal-platform',draft:defaults(id)}));}
 return Object.freeze({eligible,budget,defaults,selection,compile,resolve,quote,createItems,configureDelivered,validate,initialLimits,catalog});
});
