(function(root,factory){
  const get=(name,path)=>root?.[name]??(typeof require==='function'?require(path):null);
  const api=factory(get('SoulAbilityContract','./ability-contract-core.js'),get('SoulActionContext','./action-context-core.js'),get('SoulPersonCore','./person-core.js'));
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.SoulCreationCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(abilities,actions,people){
  'use strict';
  const clone=value=>JSON.parse(JSON.stringify(value));
  const expedition=()=>globalThis.SoulExpeditionEngine??require('./expedition-engine.js');
  const world=()=>globalThis.SoulWorldEngine??require('./world-engine.js');
  function sourceOwned(state,skill,actorId){
    if(skill?.持有者单位ID)return skill.持有者单位ID===actorId;
    const unit=state.战斗单位?.列表?.[actorId];
    const profile=state.魂兽档案?.列表?.[skill?.sourceBeastProfileId],registered=profile?.扩展?.能力账本?.skills?.find(v=>v.id===skill.id);
    return !!registered&&profile.单位ID===actorId&&abilities.fingerprint(registered)===abilities.fingerprint(skill)&&!!unit&&skill?.ownerKind==='魂兽'&&!!skill.sourceBeastProfileId&&unit.扩展?.魂兽档案ID===skill.sourceBeastProfileId&&(unit.能力?.技能ID??[]).includes(skill.id);
  }
  const RECIPES=Object.freeze([
    {id:'rope',name:'十米麻绳',templateId:'rope',attributes:['木']},
    {id:'wooden-staff',name:'木制手杖',templateId:'creation-wooden-staff',attributes:['木']},
    {id:'stone-block',name:'石质构件',templateId:'creation-stone-block',attributes:['土']},
    {id:'metal-cup',name:'金属杯',templateId:'creation-metal-cup',attributes:['金']}
  ]);
  function normalizeScope(skill,options={}){
    const branches=abilities.selectFieldBranches(skill,options.branchIds);
    const result={branchIds:branches.map(b=>b.id),modeId:options.modeId??skill.defaultCastMode??''};
    for(const key of ['targetItemId','blueprintId','recipeId','deviceNodeId','lockId','knowledgeId'])if(options[key]!==undefined){if(typeof options[key]!=='string'||!options[key])throw Error('请选择实际物品、配方或器具凭据');result[key]=options[key];}
    if(options.quantity!==undefined){if(!Number.isSafeInteger(options.quantity)||options.quantity<1||options.quantity>10)throw Error('造物数量须为1至10');result.quantity=options.quantity;}
    if(options.materials!==undefined){
      if(!Array.isArray(options.materials)||options.materials.length>256)throw Error('材料选择无效');
      const grouped={};for(const row of options.materials){if(!row||Object.keys(row).some(k=>!['fingerprint','quantity'].includes(k))||typeof row.fingerprint!=='string'||!row.fingerprint||!Number.isSafeInteger(row.quantity)||row.quantity<1||row.quantity>999999)throw Error('材料选择无效');grouped[row.fingerprint]=(grouped[row.fingerprint]??0)+row.quantity;}
      result.materials=Object.entries(grouped).sort(([a],[b])=>a.localeCompare(b)).map(([fingerprint,quantity])=>({fingerprint,quantity}));
    }
    return result;
  }
  const holder=(state,id)=>state.人物?.列表?.[id]??state.战斗单位?.列表?.[id]?.扩展?.possessions;
  function repairTarget(state,actorId,targetId,itemId){
    const item=state.物品?.实例?.[itemId],owner=holder(state,targetId);
    if(!item||!owner||item.ownerEntityId!==targetId||!world().isCarriedItem(state,item,targetId))throw Error('请选择目标本人实际携带的装备或工具');
    if(actorId!==targetId&&!Object.values(state.装备?.配置?.[targetId]?.slots??{}).includes(item.id))throw Error('请先将待修物品交给施术者，或选择对方已装备的物品');
    if(actorId!==targetId&&(!actions.battleOf(state,actorId)||actions.battleOf(state,actorId)?.id!==actions.battleOf(state,targetId)?.id)&&!actions.colocated(state,actorId,targetId))throw Error('修复物品必须在同一实际场景');
    if((!['魂导器','工具','拘束器','暗器'].includes(item.type)&&item.templateId!=='seal-platform')||item.quantity!==1||item.attachment||item.扩展?.integrated||item.payload?.productKind==='temporary')throw Error('这件物品不能按装备耐久修复');
    if(item.boundToEntityId&&item.boundToEntityId!==targetId||item.legalOwnerEntityId&&item.legalOwnerEntityId!==targetId||item.stolen)throw Error('修复需要物品的实际合法持有权');
    const maximum=item.扩展?.maxDurability??world().ITEM_TEMPLATES[item.templateId]?.maxDurability??100;
    if(!Number.isSafeInteger(maximum)||maximum<1||!Number.isSafeInteger(item.durability)||item.durability<0||item.durability>=maximum)throw Error('这件物品无需修复');
    return {item,maximum};
  }
  function materialPlan(state,actorId,requiredValue,bridgeClauses,selections,quantity=1){
    const stacks=expedition().selectedCraftMaterialStacks(state,selections,actorId);
    const coverage=expedition().bridgeCoverage(stacks,bridgeClauses);
    if(!coverage.pass)throw Error(`缺少材料特性：${coverage.missing.map(c=>c.anyOf.join('或')).join('；')}`);
    const allocation=expedition().allocateBlueprintBatch(stacks,{requiredValue,bridgeClauses},quantity,false);
    if(allocation.quantity!==quantity)throw Error(`材料不足，需要至少${requiredValue}点适合的材料价值`);
    return {quantity,allocations:clone(allocation.allocations),batches:clone(allocation.batches),consumedValue:allocation.consumedValue,requiredValue,bridgeClauses:clone(bridgeClauses)};
  }
  function previewItemEffect(state,actorId,targetId,node,options={}){
    const params=node.params;
    if(node.effectId==='payload.repair_item'){
      if(!options.targetItemId)throw Error('请先选择要修复的物品');
      const {item,maximum}=repairTarget(state,actorId,targetId,options.targetItemId),value=world().calculateItemValue(item);
      if(value>params.价值上限)throw Error(`物品价值超出本能力的${params.价值上限}点修复上限`);
      const restored=Math.min(params.修复量,maximum-item.durability),requiredValue=Math.max(1,Math.ceil(value*restored/maximum/5));
      const plan=materialPlan(state,actorId,requiredValue,[{kind:'attribute',label:'修复结构的材料',anyOf:['金','木','土']}],options.materials);
      return {effectId:node.effectId,itemId:item.id,itemName:item.name,before:item.durability,after:item.durability+restored,maximum,value,itemProof:clone(item),materials:plan};
    }
    if(node.effectId!=='payload.fabricate')throw Error('未知物品构造效果');
    if(targetId!==actorId)throw Error('造物先交付施术者本人，再按正常赠送或交易转交');
    if(!!options.blueprintId===!!options.recipeId)throw Error('请选择一份本人图纸或普通配方');
    const quantity=options.quantity??1;if(!Number.isSafeInteger(quantity)||quantity<1||quantity>params.最大数量)throw Error(`本能力每次最多制造${params.最大数量}件`);
    if(options.blueprintId){
      const blueprint=state.研发?.蓝图?.[options.blueprintId]??globalThis.SoulDeviceLocks.keyBlueprint(state,actorId,options.blueprintId);
      if(!blueprint||blueprint.ownerId!==actorId)throw Error('只能使用本人掌握的合法图纸');
      if(!['permanent','device-key'].includes(blueprint.productKind))throw Error('永久造物需要永久成品图纸');
      if(blueprint.productValue>params.价值上限)throw Error(`成品单件价值超出本能力的${params.价值上限}点上限`);
      const plan=expedition().previewBlueprintCraft(state,blueprint.id,{quantity,materials:options.materials,includeMaximum:false},{actorId,abilityUse:true});
      if(!plan.pass)throw Error(plan.message);
      return {effectId:node.effectId,blueprintId:blueprint.id,productName:blueprint.name,quantity,value:blueprint.productValue,materials:plan};
    }
    const recipe=RECIPES.find(r=>r.id===options.recipeId);if(!recipe)throw Error('普通配方不存在');
    const value=world().calculateItemValue(recipe.templateId);if(value>params.价值上限)throw Error('普通配方超出本能力的单件价值上限');
    const placement=world().previewItemPlacement(state,holder(state,actorId)?.inventoryContainerId,{templateId:recipe.templateId,forceUnique:true,distinctItems:quantity});if(!placement.pass)throw Error(placement.message);
    const plan=materialPlan(state,actorId,Math.ceil(value/5),[{kind:'attribute',label:recipe.name+'的材料',anyOf:recipe.attributes}],options.materials,quantity);
    return {effectId:node.effectId,recipeId:recipe.id,templateId:recipe.templateId,productName:recipe.name,quantity,value,materials:plan};
  }
  function consumeMaterials(state,actorId,plan){
    const store=expedition().personMaterials(state,actorId);
    for(const allocation of plan.allocations){const row=store[allocation.fingerprint];if(!row||row.quantity<allocation.quantity)throw Error('材料已发生变化，请重新预览');row.quantity-=allocation.quantity;if(!row.quantity)delete store[allocation.fingerprint];}
  }
  function applyItemEffect(state,actorId,targetId,node,skill,options,sourceId,payment){
    const quote=previewItemEffect(state,actorId,targetId,node,options),id=`creation:${sourceId}:${node.id}`;
    const ledger=state.扩展.creationEffects??={version:1,events:[]};if(ledger.events.some(e=>e.id===id))throw Error('这次构造来源已经交付');
    const materialProof=quote.materials.allocations.map(a=>({allocation:clone(a),before:clone(expedition().personMaterials(state,actorId)[a.fingerprint])}));
    const provenance={type:'ability-creation',sourceId,creationId:id,actorId,recipientId:actorId,skillId:skill.id,nodeId:node.id};
    let result;
    if(node.effectId==='payload.repair_item'){
      consumeMaterials(state,actorId,quote.materials);const item=state.物品.实例[quote.itemId];
      if(item.templateId==='seal-platform')globalThis.SoulSealingCore.repairDevice(state,item,actorId,quote.after-quote.before,id);else item.durability=quote.after;
      (item.扩展.creationRepairIds??=[]).push(id);
      if(item.condition==='破损'&&item.durability>0)item.condition='完好';
      world().refreshItemActions(state);
      result={effectId:node.effectId,itemId:item.id,itemName:item.name,durabilityBefore:quote.before,durabilityAfter:item.durability,maxDurability:quote.maximum,materialAllocations:quote.materials.allocations,consumedValue:quote.materials.consumedValue};
    }else{
      let items,itemChanges;
      if(quote.blueprintId)({items,itemChanges}=expedition().settleBlueprintProduct(state,state.研发.蓝图[quote.blueprintId]??globalThis.SoulDeviceLocks.keyBlueprint(state,actorId,quote.blueprintId),quote.materials,actorId,{...provenance,blueprintId:quote.blueprintId}));
      else{consumeMaterials(state,actorId,quote.materials);items=Array.from({length:quote.quantity},(_,i)=>world().createItem(state,quote.templateId,actorId,holder(state,actorId)?.inventoryContainerId,{forceUnique:true,provenance:{...provenance,batchIndex:i+1,recipeId:quote.recipeId}}));itemChanges=items.map(i=>({itemId:i.id,name:i.name,quantityBefore:0,quantityAfter:i.quantity,containerId:i.containerId}));}
      world().refreshItemActions(state);
      result={effectId:node.effectId,createdItemIds:items.map(i=>i.id),itemChanges,productName:quote.productName,quantity:quote.quantity,productValueEach:quote.value,materialAllocations:quote.materials.allocations,consumedValue:quote.materials.consumedValue};
    }
    const event={id,at:people.now(state),actorId,targetId,sourceId,nodeId:node.id,contract:clone(skill._sourceContract??skill),scope:clone(options),quote:clone(quote),materialProof,payment:clone(payment??{}),result:clone(result),previousHash:ledger.events.at(-1)?.hash??null};event.hash=abilities.hash(event);ledger.events.push(event);
    (state.战斗单位.列表[actorId].扩展.creationAnchors??=[]).push({eventId:id,sourceId,hash:event.hash});
    if(quote.blueprintId&&state.研发?.蓝图?.[quote.blueprintId]?.mechanics?.confirmedDesign)world().refreshItemActions(state);
    return result;
  }
  function itemChoices(state,actorId,targetId,node){
    if(node.effectId==='payload.repair_item')return Object.values(state.物品?.实例??{}).filter(i=>{try{return !!repairTarget(state,actorId,targetId,i.id)&&world().calculateItemValue(i)<=node.params.价值上限;}catch{return false;}}).map(i=>({id:i.id,name:i.name,targetItemId:i.id,detail:`耐久 ${i.durability} / ${i.扩展?.maxDurability??100}`}));
    if(node.effectId!=='payload.fabricate')return [];
    return [...RECIPES.filter(r=>world().calculateItemValue(r.templateId)<=node.params.价值上限).map(r=>({id:`recipe:${r.id}`,name:r.name,recipeId:r.id,detail:'普通配方'})),...[...Object.values(state.研发?.蓝图??{}),...(globalThis.SoulDeviceKeyManufacturing?.blueprints(state,actorId)??[])].filter(b=>b.ownerId===actorId&&['permanent','device-key'].includes(b.productKind)&&b.productValue<=node.params.价值上限).map(b=>({id:`blueprint:${b.id}`,name:b.name,blueprintId:b.id,detail:'已掌握图纸'}))];
  }
  function resolveItemOptions(state,actorId,targetId,node,options={}){
    if(options.targetItemId||options.recipeId||options.blueprintId){previewItemEffect(state,actorId,targetId,node,options);return options;}
    for(const candidate of itemChoices(state,actorId,targetId,node))try{const result={...options,...(candidate.targetItemId?{targetItemId:candidate.targetItemId}:candidate.recipeId?{recipeId:candidate.recipeId}:{blueprintId:candidate.blueprintId}),quantity:options.quantity??1};previewItemEffect(state,actorId,targetId,node,result);return result;}catch{}
    throw Error(node.effectId==='payload.repair_item'?'没有材料足够且可修复的真实物品':'没有材料足够且可制作的配方');
  }
  const constructs=state=>state.扩展?.creationConstructs?.records??[];
  function registerConstruct(state,actorId,targetId,node,skill,sourceId,payment,data){
    const db=state.扩展.creationConstructs??={version:1,records:[],events:[]},at=people.now(state),id=`construct:${sourceId}:${node.id}:${data.unitId??'wall'}`;
    if(db.records.some(v=>v.id===id))throw Error('构造实例重复');
    let position;try{position=actions.positionOf(state,actorId);}catch{const witness=state.战斗.参与者ID列表.find(id=>state.人物?.列表?.[id]);position=witness?actions.positionOf(state,witness):{kind:'location',locationId:state.战斗.扩展.地点ID,sceneId:''};}if(position.kind!=='location')throw Error('临时构造需要真实地点或房间');
    const record={id,kind:node.effectId==='zone.wall'?'wall':'summon',actorId,targetId,sourceId,nodeId:node.id,skillId:skill.id,scope:clone(position),createdAt:at,expiresAt:at+node.params.持续分钟,status:'active',contract:clone(skill._sourceContract??skill),payment:clone(payment??{}),initial:clone(data),...clone(data)};
    record.originHash=abilities.hash(Object.fromEntries(['id','kind','actorId','targetId','sourceId','nodeId','skillId','scope','createdAt','expiresAt','contract','payment','initial'].map(k=>[k,record[k]])));
    db.records.push(record);(state.战斗单位.列表[actorId].扩展.constructAnchors??=[]).push({id,originHash:record.originHash});return record;
  }
  function constructEvent(state,record,kind,data={}){
    const db=state.扩展.creationConstructs,event={id:`${record.id}:${db.events.length+1}`,constructId:record.id,at:people.now(state),kind,witnessIds:witnesses(state,record.scope),...clone(data),previousHash:db.events.at(-1)?.hash??null};event.hash=abilities.hash(event);db.events.push(event);return event;
  }
  function witnesses(state,scope){
    if(!scope)return [];
    return Object.values(state.人物?.列表??{}).filter(p=>{
      const unit=state.战斗单位?.列表?.[p.id];if(p.status==='dead'||unit?.存活状态!=='存活'||globalThis.SoulControlCore.active(state,p.id).some(v=>['status.sleep','status.blind','status.stun'].includes(v.模板ID)))return false;
      try{const current=actions.positionOf(state,p.id);return abilities.hash(current)===abilities.hash(scope);}catch{return false;}
    }).map(p=>p.id);
  }
  function eventCursor(state){return {regeneration:(state.扩展?.worldRegenerationEvents??[]).length,constructs:(state.扩展?.creationConstructs?.events??[]).length};}
  function eventsSince(state,cursor,viewerId=state.角色?.主控单位ID){
    const periodic=(state.扩展?.worldRegenerationEvents??[]).slice(cursor.regeneration).filter(e=>e.targetId===viewerId||e.witnessIds?.includes(viewerId)).map(e=>({eventId:e.id,statusId:e.statusId,sourceUnitId:e.sourceUnitId,sourceSkillId:e.statusProof.来源.技能ID,targetId:e.targetId,at:e.at,pulseAt:e.pulseAt,before:e.before,amount:e.amount,remainingHp:e.remainingHp,event:e.event}));
    const creation=(state.扩展?.creationConstructs?.events??[]).slice(cursor.constructs).flatMap(e=>{const row=constructs(state).find(r=>r.id===e.constructId);if(!row||!e.witnessIds?.includes(viewerId)&&!(row.actorId===viewerId&&e.kind==='ended'&&e.reason==='expired'))return [];return [{eventId:e.id,constructId:row.id,kind:row.kind,actorId:row.actorId,targetId:row.targetId,sourceId:row.sourceId,skillId:row.skillId,at:e.at,event:e.kind,...(e.reason?{reason:e.reason}:{}),...(row.unitId?{unitId:row.unitId}:{}),...(e.before!==undefined?{durabilityBefore:e.before,durabilityAfter:e.after,damage:e.amount}:{}),...(e.remainsId?{remainsId:e.remainsId}: {})}];});
    return {...(periodic.length?{periodicEffectSettlements:periodic}:{}),...(creation.length?{creationSettlements:creation}:{})};
  }
  function leavePossessions(state,row){
    const unit=state.战斗单位.列表[row.unitId],shell=unit?.扩展?.possessions,inventory=state.容器?.列表?.[shell?.inventoryContainerId],store=expedition().personMaterials(state,row.unitId),materials=Object.values(store).map(clone);
    if(!inventory?.itemIds.length&&!materials.length)return;
    const remainsId=`construct-remains:${row.id}`,containerId=`container:${remainsId}`;
    state.容器.列表[containerId]={id:containerId,type:'corpse',ownerEntityId:row.unitId,locationId:row.scope.locationId,itemIds:[],capacity:{infinite:true},status:'active',扩展:{scenePosition:clone(row.scope),constructId:row.id}};
    const transfers=[];
    const equipment=state.装备?.配置?.[row.unitId];
    if(equipment)for(const slot of Object.keys(equipment.slots)){const item=state.物品.实例[equipment.slots[slot]];if(item)item.扩展.equippedSlot='';equipment.slots[slot]='';}
    for(const itemId of [...(inventory?.itemIds??[])]){const item=state.物品.实例[itemId],beforeOwner=item.legalOwnerEntityId;if(!item.boundToEntityId&&item.legalOwnerEntityId===row.unitId)item.legalOwnerEntityId=row.actorId;world().transferItem(state,itemId,containerId);transfers.push({itemId,legalOwnerBefore:beforeOwner,legalOwnerAfter:item.legalOwnerEntityId});}
    if(materials.length){const item=world().createItem(state,'construct-material-parcel',row.unitId,containerId,{forceUnique:true,legalOwnerEntityId:row.actorId,valuePoints:materials.reduce((n,m)=>n+m.unitValue*m.quantity,0),payload:{constructId:row.id,materials},provenance:{type:'construct-material-parcel',constructId:row.id}});row.materialParcelId=item.id;for(const key of Object.keys(store))delete store[key];}
    state.战利品.遗骸列表[remainsId]={id:remainsId,type:'construct-remains',name:'元素构造遗留物',unitId:row.unitId,locationId:row.scope.locationId,position:clone(row.scope),containerId,coinGold:0,harvested:true,legalOwnerEntityId:row.actorId,witnessIds:witnesses(state,row.scope),扩展:{constructId:row.id}};
    unit.扩展.remainsId=remainsId;row.remainsId=remainsId;constructEvent(state,row,'possessions-left',{remainsId,transfers,materials,parcelItemId:row.materialParcelId??null});
    if(equipment){world().refreshEquipment(state,row.unitId);world().refreshItemActions(state);}
  }
  function collectMaterialParcel(state,item,actorId,sourceId){
    if(item.templateId!=='construct-material-parcel')return null;
    const row=constructs(state).find(r=>r.id===item.payload?.constructId),proof=state.扩展.creationConstructs.events.find(e=>e.constructId===row?.id&&e.kind==='possessions-left'&&e.parcelItemId===item.id);
    if(!row||!proof||abilities.hash(proof.materials)!==abilities.hash(item.payload.materials))throw Error('遗留材料缺少原实体实际库存来源');
    const deliveries=[];for(const original of proof.materials){const stack=world().addPermanentMaterialStack(state,original,original.quality,original.quantity,{type:'construct-material-return',constructId:row.id,sourceId,originalOwnerId:row.unitId,stolen:item.legalOwnerEntityId!==actorId},actorId);deliveries.push({fingerprint:stack.fingerprint,name:stack.displayName,quantity:original.quantity});}
    state.容器.列表[item.containerId].itemIds=state.容器.列表[item.containerId].itemIds.filter(id=>id!==item.id);delete state.物品.实例[item.id];constructEvent(state,row,'materials-collected',{itemId:item.id,actorId,sourceId,deliveries});return deliveries;
  }
  function endConstruct(state,record,reason='manual'){
    if(record.status!=='active')return;
    if(record.unitId)leavePossessions(state,record);
    record.status=reason;record.endedAt=people.now(state);if(record.zone)record.zone.状态='已结束';
    if(record.unitId)globalThis.SoulCombatEngine.endWorldSummon(state,record.unitId,reason);
    constructEvent(state,record,'ended',{reason});
  }
  function advanceAt(state,at=people.now(state)){
    for(const row of constructs(state).filter(r=>r.status==='active')){
      const unit=row.unitId?state.战斗单位.列表[row.unitId]:null;
      if(row.expiresAt<=at)endConstruct(state,row,'expired');
      else if(row.unitId&&(!unit||unit.存活状态!=='存活'||unit.资源.生命.当前<=0))endConstruct(state,row,'destroyed');
      else if(!state.战斗单位.列表[row.actorId]||state.战斗单位.列表[row.actorId].存活状态==='死亡')endConstruct(state,row,'source-dead');
    }
  }
  function nextAt(state,through=Number.MAX_SAFE_INTEGER){const times=constructs(state).filter(r=>r.status==='active'&&r.expiresAt<=through).map(r=>r.expiresAt);return times.length?Math.min(...times):null;}
  function activeWalls(state){return constructs(state).filter(r=>r.status==='active'&&r.kind==='wall'&&r.battleId===state.战斗?.id&&r.expiresAt>people.now(state)&&r.zone.耐久>0).map(r=>r.zone);}
  function summonParticipants(state,ids){
    const result=[];for(const row of constructs(state).filter(r=>r.status==='active'&&r.kind==='summon'&&ids.includes(r.actorId)&&r.expiresAt>people.now(state))){
      const unit=state.战斗单位.列表[row.unitId];if(unit?.存活状态==='存活'&&globalThis.SoulScenePosition.positionOf(state,row.actorId).kind==='location'&&globalThis.SoulScenePosition.positionOf(state,row.actorId).locationId===row.scope.locationId&&globalThis.SoulScenePosition.positionOf(state,row.actorId).sceneId===row.scope.sceneId)result.push({unitId:row.unitId,actorId:row.actorId});
    }return result;
  }
  function bindBattle(state){
    for(const row of constructs(state).filter(r=>r.status==='active')){
      if(row.kind==='summon'&&state.战斗.参与者ID列表.includes(row.unitId)){state.战斗单位.列表[row.unitId].扩展.召唤.战斗ID=state.战斗.id;row.battleId=state.战斗.id;constructEvent(state,row,'battle-bound',{battleId:state.战斗.id});}
      if(row.kind==='wall'&&state.战斗.参与者ID列表.includes(row.targetId)){
        const pos=actions.positionOf(state,row.targetId);if(pos.kind!==row.scope.kind||pos.locationId!==row.scope.locationId||pos.sceneId!==row.scope.sceneId)continue;
        const unit=state.战斗单位.列表[row.targetId];row.battleId=state.战斗.id;row.zone.距离区=unit.位置.距离区;row.zone.站位簇=unit.位置.站位簇;row.zone.战场坐标=clone(unit.位置.战场坐标);constructEvent(state,row,'battle-bound',{battleId:state.战斗.id});
      }
    }
  }
  function damageWall(state,zone,amount,actorId,sourceId){
    const before=zone.耐久;zone.耐久=Math.max(0,before-amount);
    const row=constructs(state).find(r=>r.zone?.id===zone.id);if(row){constructEvent(state,row,'wall-damaged',{before,after:zone.耐久,amount,actorId,sourceId});if(!zone.耐久)endConstruct(state,row,'destroyed');}
    else if(!zone.耐久)zone.状态='已结束';
    return {zoneId:zone.id,durabilityBefore:before,durabilityAfter:zone.耐久,damage:Math.min(before,amount),destroyed:!zone.耐久};
  }
  function validateConstructs(state){
    const db=state.扩展?.creationConstructs??{version:1,records:[],events:[]};
    if(db.version!==1||!Array.isArray(db.records)||!Array.isArray(db.events))return ['世界构造账本无效'];
    const errors=[],ids=new Set(),eventIds=new Set();let previousHash=null;
    for(const e of db.events){const {hash,...body}=e;if(hash!==abilities.hash(body)||previousHash!==e.previousHash||eventIds.has(e.id)||!db.records.some(r=>r.id===e.constructId)||e.at>people.now(state))errors.push('世界构造事件链无效');eventIds.add(e.id);previousHash=hash;}
    for(const row of db.records)try{
      const immutable=Object.fromEntries(['id','kind','actorId','targetId','sourceId','nodeId','skillId','scope','createdAt','expiresAt','contract','payment','initial'].map(k=>[k,row[k]])),node=row.contract.effectGraph.nodes.find(n=>n.id===row.nodeId);
      if(ids.has(row.id)||row.originHash!==abilities.hash(immutable)||!abilities.verify(row.contract).pass||!sourceOwned(state,row.contract,row.actorId)||node?.params.持续方式!=='世界分钟'||row.expiresAt!==row.createdAt+node.params.持续分钟||row.createdAt>people.now(state)||!['wall','summon'].includes(row.kind)||row.kind==='wall'&&node.effectId!=='zone.wall'||row.kind==='summon'&&node.effectId!=='summon.entity')throw Error('来源或期限');
      if(row.status==='active'&&row.expiresAt<=people.now(state))throw Error('已过期构造仍活动');
      if(!state.战斗单位.列表[row.actorId].扩展.constructAnchors?.some(a=>a.id===row.id&&a.originHash===row.originHash))throw Error('构造施术者记录');
      if(row.kind==='wall'){
        let durability=row.initial.zone.耐久;for(const e of db.events.filter(e=>e.constructId===row.id&&e.kind==='wall-damaged')){if(e.before!==durability||e.amount<0||e.after!==Math.max(0,e.before-e.amount))throw Error('墙体损耗');durability=e.after;}
        if(row.zone.耐久!==durability||durability>node.params.耐久||row.zone.参数.阻挡!==node.params.阻挡)throw Error('墙体实际耐久');
      }else{const unit=state.战斗单位.列表[row.unitId];if(!unit||unit.扩展?.召唤?.constructId!==row.id||unit.扩展.召唤.expiresAt!==row.expiresAt||row.status==='active'&&unit.存活状态!=='存活')throw Error('唯一召唤实体');}
      if(row.remainsId){const remains=state.战利品?.遗骸列表?.[row.remainsId],left=db.events.find(e=>e.constructId===row.id&&e.kind==='possessions-left');if(!remains||remains.type!=='construct-remains'||remains.扩展.constructId!==row.id||abilities.hash(remains.position)!==abilities.hash(row.scope)||!left||left.remainsId!==row.remainsId||row.status==='active')throw Error('构造遗留物来源');}
      const left=db.events.filter(e=>e.constructId===row.id&&e.kind==='possessions-left'),collected=db.events.filter(e=>e.constructId===row.id&&e.kind==='materials-collected');
      if(left.length>1||collected.length>1||collected.length&&!left.length)throw Error('遗留材料重复交付');
      if(left[0]?.materials.length){
        const proof=left[0],parcel=state.物品.实例[proof.parcelItemId],value=proof.materials.reduce((n,m)=>n+m.unitValue*m.quantity,0);
        if(row.materialParcelId!==proof.parcelItemId)throw Error('遗留材料包来源');
        if(collected.length){
          if(parcel||collected[0].itemId!==proof.parcelItemId||abilities.hash(collected[0].deliveries.map(v=>({name:v.name,quantity:v.quantity})))!==abilities.hash(proof.materials.map(v=>({name:v.displayName,quantity:v.quantity}))))throw Error('遗留材料领取结果');
        }else if(!parcel||parcel.templateId!=='construct-material-parcel'||parcel.quantity!==1||parcel.valuePoints!==value||parcel.provenance?.constructId!==row.id||parcel.payload.constructId!==row.id||abilities.hash(parcel.payload.materials)!==abilities.hash(proof.materials)||parcel.containerId!==state.战利品.遗骸列表[row.remainsId].containerId)throw Error('遗留材料包与原库存不一致');
      }else if(collected.length||row.materialParcelId)throw Error('无库存的材料包');
      if(row.status!=='active'&&!db.events.some(e=>e.constructId===row.id&&e.kind==='ended'&&e.reason===row.status&&e.at===row.endedAt))throw Error('终止事件');ids.add(row.id);
    }catch(error){errors.push(`世界构造${row?.id??''}${error.message}无效`);}
    for(const unit of Object.values(state.战斗单位?.列表??{})){
      for(const anchor of unit.扩展?.constructAnchors??[])if(!db.records.some(r=>r.id===anchor.id&&r.actorId===unit.id&&r.originHash===anchor.originHash))errors.push('构造实体缺少施术者原记录');
      if(unit.扩展?.召唤?.constructId&&!db.records.some(r=>r.id===unit.扩展.召唤.constructId&&r.unitId===unit.id))errors.push('召唤实体缺少原始构造来源');
    }
    for(const remains of Object.values(state.战利品?.遗骸列表??{}))if(remains.type==='construct-remains'&&!db.records.some(r=>r.id===remains.扩展?.constructId&&r.remainsId===remains.id))errors.push('遗留物缺少构造来源');
    for(const item of Object.values(state.物品?.实例??{}))if(item.templateId==='construct-material-parcel'&&!db.records.some(r=>r.id===item.payload?.constructId&&r.materialParcelId===item.id))errors.push('材料包缺少构造来源');
    return errors;
  }
  function validate(state){
    const constructErrors=validateConstructs(state),ledger=state.扩展?.creationEffects,events=ledger?.events??[],errors=[...constructErrors],ids=new Set();let previousHash=null;
    if(ledger&&(ledger.version!==1||!Array.isArray(ledger.events)))return [...errors,'构造账本结构无效'];
    for(const unit of Object.values(state.战斗单位?.列表??{}))for(const anchor of unit.扩展?.creationAnchors??[])if(!events.some(e=>e.id===anchor.eventId&&e.actorId===unit.id&&e.sourceId===anchor.sourceId&&e.hash===anchor.hash))errors.push('实体构造来源锚缺少实际账本');
    for(const event of events)try{
      const {hash,...body}=event,node=event.contract?.effectGraph?.nodes?.find(n=>n.id===event.nodeId),anchor=state.战斗单位?.列表?.[event.actorId]?.扩展?.creationAnchors?.filter(a=>a.eventId===event.id);
      if(hash!==abilities.hash(body)||event.previousHash!==previousHash||ids.has(event.id)||anchor?.length!==1||anchor[0].hash!==hash||event.id!==`creation:${event.sourceId}:${event.nodeId}`||!Number.isSafeInteger(event.at)||event.at>people.now(state)||!abilities.verify(event.contract).pass||!sourceOwned(state,event.contract,event.actorId)||!node||!['payload.repair_item','payload.fabricate'].includes(node.effectId)||event.result.effectId!==node.effectId)throw Error('来源合同或事件链');
      const q=event.quote,p=q.materials,result=event.result,scope=event.scope,payment=event.payment;
      if(payment.operationId!==event.sourceId||payment.actorId!==event.actorId||payment.skillId!==event.contract.id||payment.contract?.skillId!==event.contract.id||!payment.resources||!payment.totals||payment.resources.before.soulPower-payment.resources.after.soulPower!==payment.totals.soulPower||payment.resources.before.health-payment.resources.after.health!==payment.totals.health)throw Error('实际施法付款');
      const current=state.世界?.processedTransactions?.[event.sourceId]??[state.战斗,...Object.values(state.世界?.backgroundBattles??{})].map(b=>b?.扩展?.已结算行动?.[event.sourceId]).find(Boolean);
      if(current&&(abilities.hash(current.payment)!==abilities.hash(payment)||!current.targets?.some(t=>t.targetId===event.targetId&&t.effects?.some(e=>abilities.hash(e)===abilities.hash(result)))))throw Error('实际行动回执');
      let requiredValue,clauses,allocationQuantity=1;
      if(node.effectId==='payload.repair_item'){
        const original=q.itemProof,value=world().calculateItemValue(original),maximum=original.扩展?.maxDurability??100,after=Math.min(maximum,original.durability+node.params.修复量);
        if(scope.targetItemId!==original.id||q.itemId!==original.id||original.ownerEntityId!==event.targetId||q.before!==original.durability||q.after!==after||q.maximum!==maximum||q.value!==value||value>node.params.价值上限||result.itemId!==q.itemId||result.durabilityBefore!==q.before||result.durabilityAfter!==q.after||result.maxDurability!==maximum||after<=original.durability)throw Error('原物品与修复量');
        requiredValue=Math.max(1,Math.ceil(value*(after-original.durability)/maximum/5));clauses=[{kind:'attribute',label:'修复结构的材料',anyOf:['金','木','土']}];
      }else{
        if(!Number.isSafeInteger(q.quantity)||q.quantity<1||q.quantity>node.params.最大数量||q.quantity!==result.quantity||q.quantity!==(scope.quantity??1)||new Set(result.createdItemIds).size!==result.createdItemIds.length||result.createdItemIds.length!==q.quantity||q.value!==result.productValueEach||q.value>node.params.价值上限)throw Error('造物数量或价值');
        if(q.blueprintId){const bp=state.研发?.蓝图?.[q.blueprintId]??globalThis.SoulDeviceLocks.keyBlueprint(state,event.actorId,q.blueprintId);if(!bp||bp.ownerId!==event.actorId||scope.blueprintId!==bp.id||!['permanent','device-key'].includes(bp.productKind)||bp.productValue!==q.value)throw Error('真实图纸知识');requiredValue=bp.requiredValue;allocationQuantity=q.quantity;clauses=bp.bridgeClauses;}
        else{const recipe=RECIPES.find(r=>r.id===scope.recipeId);if(!recipe||q.recipeId!==recipe.id||q.templateId!==recipe.templateId||world().calculateItemValue(recipe.templateId)!==q.value)throw Error('登记普通配方');requiredValue=Math.ceil(q.value/5);allocationQuantity=q.quantity;clauses=[{kind:'attribute',label:recipe.name+'的材料',anyOf:recipe.attributes}];}
      }
      const stocks=event.materialProof.map(v=>({...clone(v.before),quantity:v.allocation.quantity}));
      if(!stocks.length||event.materialProof.some(v=>v.before.fingerprint!==expedition().materialFingerprint(v.before,v.before.quality)||!Number.isSafeInteger(v.allocation.quantity)||v.allocation.quantity<1||v.before.quantity<v.allocation.quantity)||!expedition().bridgeCoverage(stocks,clauses).pass)throw Error('材料实际特性来源');
      const allocation=expedition().allocateBlueprintBatch(stocks,{requiredValue,bridgeClauses:clauses},allocationQuantity,false),paidValue=stocks.reduce((sum,v)=>sum+v.unitValue*v.quantity,0);
      if(paidValue!==p.consumedValue||paidValue<requiredValue*allocationQuantity||allocation.quantity!==allocationQuantity||p.consumedValue!==result.consumedValue||abilities.hash(p.allocations)!==abilities.hash(result.materialAllocations)||abilities.hash(p.allocations)!==abilities.hash(event.materialProof.map(v=>v.allocation)))throw Error('实际材料付款');
      ids.add(event.id);previousHash=hash;
    }catch(error){errors.push(`构造记录${event?.id??''}${error.message}无效`);}
    for(const item of Object.values(state.物品?.实例??{})){
      for(const repairId of item.扩展?.creationRepairIds??[]){const e=events.find(v=>v.id===repairId);if(!e||e.result.itemId!==item.id)errors.push('物品修复缺少真实来源');}
      const repairs=events.filter(e=>e.result?.itemId===item.id&&e.result?.effectId==='payload.repair_item'),latest=repairs.at(-1);
      if(latest&&(!(item.扩展?.creationRepairIds??[]).includes(latest.id)||item.durability>latest.result.durabilityAfter||item.扩展.maxDurability!==latest.result.maxDurability))errors.push('实际物品超出已付款修复上限');
      if(item.provenance?.type!=='ability-creation')continue;
      const event=events.find(e=>e.id===item.provenance.creationId),q=event?.quote,result=event?.result,index=result?.createdItemIds?.indexOf(item.id);
      if(!event||index<0||!Number.isSafeInteger(index)||item.provenance.actorId!==event.actorId||item.provenance.sourceId!==event.sourceId||item.provenance.nodeId!==event.nodeId||item.quantity!==1||result.itemChanges[index]?.itemId!==item.id||result.itemChanges[index].quantityAfter!==1){errors.push('永久造物实物缺少唯一实际交付来源');continue;}
      if(q.blueprintId){const bp=state.研发.蓝图[q.blueprintId]??globalThis.SoulDeviceLocks.keyBlueprint(state,event.actorId,q.blueprintId);if(bp?.productKind==='device-key'?!globalThis.SoulDeviceKeyManufacturing.validateProductItem(state,item,bp):!expedition().validateBlueprintProductItem(item,bp))errors.push('永久造物成品与合法图纸不一致');}
      else{const recipe=RECIPES.find(r=>r.id===q.recipeId),template=world().ITEM_TEMPLATES[recipe?.templateId],preset=globalThis.SoulPresetCatalog?.get(recipe?.templateId),payload={...clone(template?.payload??{}),...(preset?{presetId:preset.id,artId:preset.artId}:{})};if(!template||item.templateId!==recipe.templateId||item.type!==template.type||item.valuePoints!==world().calculateItemValue(recipe.templateId)||item.quality!=='普通'||item.扩展.maxDurability!==(template.maxDurability??100)||abilities.hash(item.payload??{})!==abilities.hash(payload))errors.push('普通造物成品与登记配方不一致');}
    }
    return errors;
  }
  return Object.freeze({RECIPES,eventCursor,eventsSince,witnesses,collectMaterialParcel,sourceOwned,itemChoices,resolveItemOptions,constructs,registerConstruct,constructEvent,endConstruct,advanceAt,nextAt,activeWalls,summonParticipants,bindBattle,damageWall,validateConstructs,normalizeScope,repairTarget,materialPlan,consumeMaterials,previewItemEffect,applyItemEffect,validate});
});
