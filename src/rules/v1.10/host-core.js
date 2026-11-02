(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.SoulHostCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  // 宿主 = 任何能挂能力的装备；套装只是“多个能力”的预设组合。
  const VERSION='host-v2';
  const MAX_CAPABILITIES=6,MAX_FORMS=6;
  const FORM_REGISTRY=Object.freeze({
    gag:{name:'口球',slots:['口腔'],maxLevel:0,effects:{voice:true,ingest:true}},
    blindfold:{name:'眼罩',slots:['眼部'],maxLevel:0,effects:{vision:true}},
    collar:{name:'项圈',slots:['颈部'],maxLevel:0,effects:{}},
    vibrator:{name:'跳蛋',slots:['下体前'],maxLevel:5,stim:'下体前'},
    plug:{name:'肛塞',slots:['后庭'],maxLevel:3,stim:'后庭'},
    clitRing:{name:'阴蒂环',slots:['阴蒂'],maxLevel:3,stim:'阴蒂'},
    chastity:{name:'贞操带',slots:['下体前','阴蒂','后庭'],maxLevel:0,effects:{insert:true}},
    urethral:{name:'尿道锁',slots:['尿道'],maxLevel:1,stim:'尿道',effects:{release:true}}
  });
  const CAPABILITIES=Object.freeze({
    durability:{modes:['normal','indestructible','rule-only'],fields:['mode','breakRule']},
    release:{fields:['wearerLock','releaser','lock']},
    suppression:{fields:['channel','percent','kinds','maxRank','adjustableBy']},
    forms:{fields:['slots','changeMinutes']},
    appearance:{fields:['current','presets','changeMinutes']},
    binding:{fields:['mode','agilityPenalty']}
  });
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,Math.round(Number(value)||0)));
  const copy=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
  const readIndexes=new WeakMap();
  function withReadIndex(state,read){const previous=readIndexes.get(state);if(!previous)readIndexes.set(state,{sources:new Map(),people:new Map()});try{return read();}finally{if(!previous)readIndexes.delete(state);}}
  function invalidateReadIndex(state,linked=true){readIndexes.delete(state);if(linked)globalThis.SoulControlCore?.invalidateReadIndex(state,false);}
  const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  function only(value,keys,label){if(!object(value)||Object.keys(value).some(key=>!keys.includes(key)))throw Error(label+'含有不支持的字段');}
  function integer(value,fallback,min,max,label){const n=value===undefined?fallback:value;if(!Number.isSafeInteger(n)||n<min||n>max)throw Error(label+'须为'+min+'至'+max+'的整数');return n;}
  function strings(value,fallback,max,label){const list=value===undefined?fallback:value;if(!Array.isArray(list)||list.length>max||list.some(v=>typeof v!=='string'||!v||v.length>200)||new Set(list).size!==list.length)throw Error(label+'无效');return [...list];}
  function formSlots(value={}){
    if(!object(value)||Object.keys(value).length>MAX_FORMS)throw Error('宿主最多配置六个形态');
    const slots={};for(const slot of Object.keys(value).sort()){
      const entry=value[slot];only(entry,['form','level'],'宿主形态');
      const definition=FORM_REGISTRY[entry.form];if(!definition||!definition.slots.includes(slot))throw Error('形态与佩戴部位不相容');
      slots[slot]={form:entry.form,level:integer(entry.level,0,0,definition.maxLevel,'形态档位')};
    }return slots;
  }
  function normalize(input){
    const source=input===undefined?{}:input;only(source,['version','capabilities'],'宿主配置');
    if(source.version!==undefined&&source.version!==2)throw Error('宿主配置版本不受支持');
    const raw=source.capabilities??{};if(!object(raw)||Object.keys(raw).some(key=>!Object.hasOwn(CAPABILITIES,key)))throw Error('宿主含有未知或已取消的能力');
    if(Object.keys(raw).length>MAX_CAPABILITIES)throw Error('宿主最多配置六项能力');
    const keys=Object.keys(raw).sort();
    const capabilities={};
    for(const key of keys){
      const value=raw[key];only(value,CAPABILITIES[key].fields??['mode'],'宿主能力');
      if(key==='durability'){if(value.mode!==undefined&&!CAPABILITIES.durability.modes.includes(value.mode))throw Error('耐久规则无效');capabilities.durability={mode:value.mode??'normal'};if(value.breakRule!==undefined){if(capabilities.durability.mode!=='rule-only')throw Error('只有规则耐久可以声明特殊破坏条件');capabilities.durability.breakRule=globalThis.SoulDeviceLocks.normalizeBreakRule(value.breakRule);}}
      else if(key==='release'){if(value.wearerLock!==undefined&&typeof value.wearerLock!=='boolean'||value.releaser!==undefined&&value.releaser!=='controller')throw Error('解除权限无效');capabilities.release={wearerLock:value.wearerLock===true,releaser:'controller'};if(value.lock!==undefined)capabilities.release.lock=globalThis.SoulDeviceLocks.normalizeLock(value.lock);}
      else if(key==='suppression'){
        if(value.channel!==undefined&&value.channel!=='soul-power'||value.adjustableBy!==undefined&&value.adjustableBy!=='controller')throw Error('魂力调节规则无效');
        const kinds=strings(value.kinds,['ordinary'],globalThis.SoulControlCore.ABILITY_KINDS.length,'能力许可');if(kinds.some(k=>!globalThis.SoulControlCore.ABILITY_KINDS.includes(k)))throw Error('能力许可类别无效');
        capabilities.suppression={channel:'soul-power',percent:integer(value.percent,0,0,100,'抑制比例'),kinds,maxRank:integer(value.maxRank,0,0,9,'许可环阶'),adjustableBy:'controller'};
      }
      else if(key==='forms'){
        capabilities.forms={slots:formSlots(value.slots),changeMinutes:integer(value.changeMinutes,2,0,120,'形态调整时间')};
      }else if(key==='appearance'){
        const presets=strings(value.presets,['默认'],12,'外观预设'),current=value.current??'默认';if(!presets.includes(current))throw Error('当前外观不在预设中');
        capabilities.appearance={current,presets,changeMinutes:integer(value.changeMinutes,2,0,120,'外观调整时间')};
      }else if(key==='binding'){
        if(value.mode!==undefined&&!['cover','partial','full'].includes(value.mode))throw Error('覆盖方式无效');capabilities.binding={mode:value.mode??'cover',agilityPenalty:integer(value.agilityPenalty,0,0,3,'身法修正')};
      }
    }
    return {version:2,capabilities};
  }
  function definition(item){
    const raw=item?.payload?.host??globalThis.SoulCustodyCore?.resolveDevice(item)?.host;
    if(item?.payload?.host!==undefined&&raw?.version!==2)throw Error('宿主配置版本不受支持');
    return normalize(raw);
  }
  function read(item){
    const host=definition(item),runtime=item?.扩展?.hostState;
    // Modes supply the current default without changing the frozen catalogue
    // identity. An explicit authored or player-adjusted value remains intact.
    if(host.capabilities.suppression&&runtime?.percent===undefined){
      if(item.attachment?.mode==='limited')host.capabilities.suppression.percent=100-(item.attachment.limits?.soulPowerPercent??0);
      else if(item.attachment?.mode==='locked'&&item.payload?.host===undefined)host.capabilities.suppression.percent=100;
    }
    if(runtime!==undefined){
      only(runtime,['version','percent','slots','appearance'],'宿主运行状态');if(runtime.version!==1)throw Error('宿主运行状态版本无效');
      if(runtime.percent!==undefined){if(!host.capabilities.suppression)throw Error('物品没有魂力调节能力');host.capabilities.suppression.percent=integer(runtime.percent,0,0,100,'抑制比例');}
      if(runtime.slots!==undefined){if(!host.capabilities.forms)throw Error('物品没有形态能力');host.capabilities.forms.slots=formSlots(runtime.slots);}
      if(runtime.appearance!==undefined){if(!host.capabilities.appearance?.presets.includes(runtime.appearance))throw Error('外观不在预设列表里');host.capabilities.appearance.current=runtime.appearance;}
    }
    return host;
  }
  function suppressionLimits(item){
    const suppression=read(item).capabilities.suppression;if(!suppression)return null;
    const limited=item.attachment?.mode==='limited',limits=limited?copy(item.attachment?.limits??{}):{};
    limits.soulPowerPercent=100-suppression.percent;
    if(!limited)limits.permission={allowedKinds:copy(suppression.kinds),maxCastRank:suppression.maxRank};
    return globalThis.SoulControlCore.limitSpec(limits);
  }
  function setModeSuppression(state,item,mode,limits,restoredSoulPowerPercent){
    if(!definition(item).capabilities.suppression||mode==='released')return;
    const host=read(item);host.capabilities.suppression.percent=restoredSoulPowerPercent!==undefined?100-integer(restoredSoulPowerPercent,undefined,0,100,'恢复的魂力开放比例'):mode==='limited'?100-(limits?.soulPowerPercent??100):100;
    write(state,item.id,host);
  }
  function sourceAllowed(state,item,planned=false){
    const index=!planned&&readIndexes.get(state);if(!index||state.物品?.实例?.[item?.id]!==item)return resolveSource(state,item,planned);
    if(!index.sources.has(item))index.sources.set(item,resolveSource(state,item));return index.sources.get(item);
  }
  function resolveSource(state,item,planned=false){
    if(!item)return false;const fixed=globalThis.SoulCustodyCore?.resolveDevice(item)?.host;
    if(item.payload?.host===undefined)return !!fixed;
    if(globalThis.SoulOpeningWorkshop?.isItemAuthorized(state,item))return true;
    const blueprint=state?.研发?.蓝图?.[item.payload.blueprintId];
    if(!blueprint||globalThis.SoulExpeditionEngine?.validateBlueprintProductItem(item,blueprint)!==true)return false;
    const source=item.provenance??{},transactions=state.远征?.processedTransactions??{};
    if(source.blueprintId!==blueprint.id||!['research-prototype','blueprint-craft','ability-creation'].includes(source.type))return false;
    if(planned)return true; // Internal construction precedes its surrounding settlement receipt.
    if(source.type==='research-prototype')return source.researchId===blueprint.createdFromResearchId&&Object.values(transactions).some(r=>r.type==='research-blueprint-created'&&r.blueprintId===blueprint.id&&r.prototypeItemId===item.id);
    if(source.type==='blueprint-craft'){const receipt=transactions[source.transactionId];return receipt?.type==='blueprint-crafted'&&receipt.blueprintId===blueprint.id&&receipt.itemIds?.[source.batchIndex-1]===item.id&&receipt.itemChanges?.some(c=>c.itemId===item.id&&c.quantityBefore===0&&c.quantityAfter===1)===true;}
    const event=state.扩展?.creationEffects?.events?.find(e=>e.id===source.creationId);return event?.quote?.blueprintId===blueprint.id&&event.result?.createdItemIds?.includes(item.id)===true;
  }
  function isIndestructible(item,state){return !!state&&sourceAllowed(state,item)&&definition(item).capabilities.durability?.mode==='indestructible';}
  const ruleBreakPermits=new WeakMap();
  function authorizeRuleBreak(state,item,basis){
    if(!globalThis.SoulDeviceOperations?.isRuleBreakAuthorization(state,item,basis))throw Error('特殊破坏缺少实际付费能力执行来源');
    const rule=definition(item).capabilities.durability;
    if(!sourceAllowed(state,item)||rule?.mode!=='rule-only'||!rule.breakRule||rule.breakRule.kind!=='destruction'||basis.params?.破坏规则!=='destruction'||basis.params?.最高品级<rule.breakRule.rank)throw Error('实际特殊破坏规则不匹配');
    const permit=Object.freeze({});ruleBreakPermits.set(permit,{state,item});return permit;
  }
  function canDamage(state,item,reason='physical'){
    if(!item)return false;const mode=sourceAllowed(state,item)?definition(item).capabilities.durability?.mode??'normal':'normal';
    if(mode==='indestructible')return false;const permit=reason&&typeof reason==='object'?ruleBreakPermits.get(reason):null;return reason==='use-cost'||mode==='normal'||mode==='rule-only'&&permit?.state===state&&permit.item===item;
  }
  function damage(state,item,amount,reason='physical'){
    const before=item?.durability;if(!Number.isSafeInteger(amount)||amount<0)throw Error('耐久损耗须为非负整数');
    const blocked=!canDamage(state,item,reason);if(reason&&typeof reason==='object')ruleBreakPermits.delete(reason);if(!blocked){item.durability=Math.max(0,before-amount);if(item.durability===0)item.condition='破损';invalidateReadIndex(state);}
    return {before,after:item?.durability,blocked};
  }
  function carrier(state,item){
    if(!item||item.quantity!==1||item.durability<=0||Number(state.世界?.时间?.day??0)>Number(item.payload?.expiresAtDay??Number.MAX_SAFE_INTEGER))return null;
    const attachment=item.attachment,container=state.容器?.列表?.[item.containerId];
    if(!container?.itemIds?.includes(item.id))return null;
    if(attachment){if(attachment.mode==='released'||!state.人物?.列表?.[attachment.wearerId]||container.扩展?.wearerId!==attachment.wearerId)return null;return {personId:attachment.wearerId,kind:'attachment'};}
    const personId=item.ownerEntityId,equipment=state.装备?.配置?.[personId];if(equipment&&Object.values(equipment.slots??{}).includes(item.id)&&container.ownerEntityId===personId)return {personId,kind:'equipment'};
    return null;
  }
  function capabilityActive(state,item,key){
    const c=carrier(state,item);if(!c||!sourceAllowed(state,item))return false;
    if(key==='suppression'&&globalThis.SoulControlCore?.itemEffectsAllowed(state,c.personId,item)===false)return false;
    if(['binding','suppression'].includes(key)){
      const max=globalThis.SoulCustodyCore?.resolveDevice(item)?.maxLevel,level=Number(state.战斗单位?.列表?.[c.personId]?.派生?.有效等级??0);
      if(Number.isFinite(max)&&level>max)return false;
    }
    if(key==='binding'&&globalThis.SoulDeviceLocks?.bindingEffective(state,item)===false)return false;
    return !!read(item).capabilities[key];
  }
  function personItemCandidates(state,personId,index){
    if(index&&typeof personId==='string'&&personId){
      if(!index.byPerson){
        index.byPerson=new Map();
        for(const item of Object.values(state?.物品?.实例??{})){
          try{const owner=item?.attachment?item.attachment.wearerId:item?.ownerEntityId;
            if(!index.byPerson.has(owner))index.byPerson.set(owner,[]);index.byPerson.get(owner).push(item);
          }catch{/* The ordinary host filter also ignores an unreadable item. */}
        }
      }
      return index.byPerson.get(personId)??[];
    }
    return Object.values(state?.物品?.实例??{});
  }
  function hostItems(state,personId){return findHostItems(state,personId);}
  function findHostItems(state,personId,candidates){
    const index=readIndexes.get(state);if(index?.people.has(personId))return [...index.people.get(personId)];
    candidates??=personItemCandidates(state,personId,index);
    const items=candidates.filter(item=>{try{if(typeof personId==='string'&&personId&&(item?.attachment?item.attachment.wearerId:item?.ownerEntityId)!==personId)return false;if(carrier(state,item)?.personId!==personId||!(item.payload?.host||globalThis.SoulCustodyCore?.resolveDevice(item)?.host)||!sourceAllowed(state,item))return false;read(item);return true;}catch{return false;}});
    if(index)index.people.set(personId,items);return [...items];
  }
  // The same wearer may have attachments and ordinary equipment with host effects.
  // Select their candidates once; each effect still checks its own live source.
  function restrictionEquipment(state,personId){
    const candidates=personItemCandidates(state,personId,readIndexes.get(state));
    return {attached:candidates.filter(item=>item?.attachment?.wearerId===personId),hosts:findHostItems(state,personId,candidates)};
  }
  function assertSlots(state,item,personId,kind=carrier(state,item)?.kind){
    if(kind==='equipment'&&read(item).capabilities.release?.wearerLock&&!globalThis.SoulDeviceLocks?.definition(state,item))throw Error('普通装备不支持穿戴者锁定，请使用具有外部控制权限的佩戴载体');
    const slots=Object.keys(read(item).capabilities.forms?.slots??{});if(!slots.length)return;
    for(const slot of slots)if(globalThis.SoulWearableCore?.slotOccupied(state,personId,slot,item.id))throw Error('形态部位已被其他器具或宿主形态占用');
  }
  function write(state,itemId,host){
    const item=state?.物品?.实例?.[itemId];if(!sourceAllowed(state,item))throw Error('宿主缺少合法能力来源');
    const original=definition(item),next=normalize(host),fixed=copy(next);
    for(const key of ['suppression','forms','appearance'])if(fixed.capabilities[key]&&original.capabilities[key]){const field={suppression:'percent',forms:'slots',appearance:'current'}[key];fixed.capabilities[key][field]=copy(original.capabilities[key][field]);}
    if(JSON.stringify(fixed)!==JSON.stringify(original))throw Error('不能修改宿主冻结的能力定义');
    const runtime={version:1};if(next.capabilities.suppression)runtime.percent=next.capabilities.suppression.percent;if(next.capabilities.forms)runtime.slots=copy(next.capabilities.forms.slots);if(next.capabilities.appearance)runtime.appearance=next.capabilities.appearance.current;
    item.扩展??={};item.扩展.hostState=runtime;invalidateReadIndex(state);return next;
  }
  function forms(host){return host.capabilities.forms?.slots??{};}
  function formFacts(host){
    return Object.entries(forms(host)).map(([slot,entry])=>{const definition=FORM_REGISTRY[entry.form];return {slot,form:entry.form,name:definition?.name??entry.form,level:entry.level,maxLevel:definition?.maxLevel??0}});
  }
  /** 把宿主能力合并成一份对佩戴者的影响清单。 */
  function project(state,item){
    const host=read(item),result={restrictions:{},stimuli:[],urineLocked:false,aimPenalty:0,soul:{percent:100,kinds:['ordinary'],maxRank:9},facts:{}};
    if(!carrier(state,item)||!sourceAllowed(state,item))return result;
    const block=(key,reason)=>{if(reason)result.restrictions[key]=reason;};
    for(const [slot,entry] of Object.entries(forms(host))){
      const definition=FORM_REGISTRY[entry.form];if(!definition)continue;
      if(definition.effects?.voice)block('voice',`${definition.name}封声`);
      if(definition.effects?.ingest)block('ingest',`${definition.name}封口`);
      if(definition.effects?.vision)block('vision',`${definition.name}遮蔽`);
      if(definition.effects?.release)result.urineLocked=true;
      if(definition.effects?.insert)block('insert',`${definition.name}拒止`);
      if(definition.stim&&entry.level>0)result.stimuli.push({档位:entry.level,部位:definition.stim,设备ID:`${item.id}:${slot}`});
      if(definition.maxLevel>=3&&entry.level>=3)result.aimPenalty=Math.max(result.aimPenalty,entry.level>=5?3:entry.level>=4?2:1);
    }
    if(capabilityActive(state,item,'binding')&&host.capabilities.binding?.mode==='full')block('movement','全身束缚');
    if(capabilityActive(state,item,'suppression')){const limits=suppressionLimits(item);result.soul={percent:limits.soulPowerPercent,kinds:copy(limits.permission?.allowedKinds??globalThis.SoulControlCore.ABILITY_KINDS),maxRank:limits.permission?.maxCastRank??9};}
    result.facts={appearance:host.capabilities.appearance?.current??'',suppression:capabilityActive(state,item,'suppression')?host.capabilities.suppression.percent:0,forms:formFacts(host),
      durability:host.capabilities.durability?.mode??'normal',wearerLock:host.capabilities.release?.wearerLock===true,binding:capabilityActive(state,item,'binding')?host.capabilities.binding:null};
    return result;
  }
  function controller(item,actorId,state){return !!state&&sourceAllowed(state,item)&&(item.attachment?item.attachment.controllers?.includes(actorId)===true:carrier(state,item)?.personId===actorId);}
  function controlReason(state,item,actorId){
    if(!controller(item,actorId,state))return '只有控制者能调整';
    if(item.quantity!==1||item.durability<=0||Number(state.世界?.时间?.day??0)>Number(item.payload?.expiresAtDay??Number.MAX_SAFE_INTEGER))return '宿主已损坏、过期或数量无效';
    try{globalThis.SoulActionContext.resolve(state,{actorId,battleId:null,targetIds:[item.attachment?.wearerId??actorId]});}catch(error){return error.message;}
    return '';
  }
  function actions(state,item,actorId){
    const host=read(item),out=[],reason=controlReason(state,item,actorId),owned=!reason;
    if(host.capabilities.suppression)out.push({action:'host.set-suppression',label:'调整禁魔',available:owned,minutes:1,reason});
    if(host.capabilities.forms)out.push({action:'host.set-form',label:'拟态形态',available:owned,minutes:host.capabilities.forms.changeMinutes,reason});
    if(host.capabilities.appearance)out.push({action:'host.set-appearance',label:'更换外观',available:owned,minutes:host.capabilities.appearance.changeMinutes,reason});
    if(host.capabilities.release&&item.attachment)out.push({action:'host.release',label:'解除宿主',available:owned&&(!host.capabilities.release.wearerLock||item.attachment?.wearerId!==actorId),minutes:0,reason:owned?item.attachment?.wearerId===actorId&&host.capabilities.release.wearerLock?'穿戴者无法自行解除':'':'只有控制者能解除'});
    return out;
  }
  function setSuppression(state,itemId,actorId,percent){
    const item=state.物品?.实例?.[itemId],host=read(item),reason=controlReason(state,item,actorId);if(reason)throw Error(reason);
    if(!host.capabilities.suppression)throw Error('这件宿主没有禁魔能力');
    host.capabilities.suppression.percent=integer(percent,undefined,0,100,'抑制比例');write(state,itemId,host);return host.capabilities.suppression;
  }
  function setForm(state,itemId,actorId,slot,formId,level=0){
    const item=state.物品?.实例?.[itemId],host=read(item),reason=controlReason(state,item,actorId);if(reason)throw Error(reason);
    if(!host.capabilities.forms)throw Error('这件宿主没有拟态能力');
    if(typeof slot!=='string'||!Object.values(FORM_REGISTRY).some(form=>form.slots.includes(slot)))throw Error('形态部位未登记');
    if(formId===null||formId===undefined||formId===''){
      delete host.capabilities.forms.slots[slot];write(state,itemId,host);return null;
    }
    const definition=FORM_REGISTRY[formId];if(!definition||!definition.slots.includes(slot))throw Error('该形态不能放在这个槽位');
    const wearerId=carrier(state,item)?.personId??item.attachment?.wearerId;
    if(wearerId&&globalThis.SoulWearableCore?.slotOccupied(state,wearerId,slot,item.id))throw Error('形态部位已被其他器具或宿主形态占用');
    host.capabilities.forms.slots[slot]={form:formId,level:integer(level,0,0,definition.maxLevel,'形态档位')};write(state,itemId,host);return host.capabilities.forms.slots[slot];
  }
  function setAppearance(state,itemId,actorId,preset){
    const item=state.物品?.实例?.[itemId],host=read(item),reason=controlReason(state,item,actorId);if(reason)throw Error(reason);
    if(!host.capabilities.appearance)throw Error('这件宿主没有外观能力');
    if(!host.capabilities.appearance.presets.includes(preset))throw Error('外观不在预设列表里');
    host.capabilities.appearance.current=preset;write(state,itemId,host);return preset;
  }
  function validateState(state){
    const errors=[];for(const item of Object.values(state.物品?.实例??{}))try{
      if(item.payload?.host===undefined&&item.扩展?.hostState===undefined&&!globalThis.SoulCustodyCore?.resolveDevice(item)?.host)continue;
      read(item);if(!sourceAllowed(state,item))throw Error('缺少合法能力来源');const activeCarrier=carrier(state,item);if(activeCarrier)assertSlots(state,item,activeCarrier.personId);
    }catch(error){errors.push('宿主物品'+item.id+'：'+error.message);}return errors;
  }
  // Historical releases retain their own carrier and frozen acquisition evidence.
  // Replay must never borrow the current world's equipment or authorization.
  function attributeFrame(state,actorId){
    const ids=new Set(),people=new Set(),units={},equipment={},statuses={};let id=actorId;
    while(id&&!people.has(id)){
      people.add(id);const unit=state.战斗单位?.列表?.[id];if(unit)units[id]=copy(unit);
      equipment[id]=copy(state.装备?.配置?.[id]??{slots:{}});
      for(const value of Object.values(equipment[id].slots??{}))if(value)ids.add(value);
      for(const item of hostItems(state,id))ids.add(item.id);
      for(const status of globalThis.SoulControlCore.active(state,id)){statuses[status.id]=copy(status);if(status.来源?.物品ID)ids.add(status.来源.物品ID);}
      id=unit?.扩展?.召唤?.来源单位ID;
    }
    const items={},containers={},persons={},blueprints={},transactions={},creationEvents=[];
    for(const itemId of ids){const item=state.物品?.实例?.[itemId];if(!item)continue;items[itemId]=copy(item);
      if(state.容器?.列表?.[item.containerId])containers[item.containerId]=copy(state.容器.列表[item.containerId]);
      for(const personId of [item.ownerEntityId,item.attachment?.wearerId,...(item.attachment?.controllers??[])])if(personId)people.add(personId);
      const blueprint=state.研发?.蓝图?.[item.payload?.blueprintId];if(blueprint){blueprints[blueprint.id]=copy(blueprint);for(const [key,receipt] of Object.entries(state.远征?.processedTransactions??{}))if(receipt.blueprintId===blueprint.id)transactions[key]=copy(receipt);}
      const event=state.扩展?.creationEffects?.events?.find(e=>e.id===item.provenance?.creationId);if(event&&!creationEvents.some(e=>e.id===event.id))creationEvents.push(copy(event));
    }
    for(const personId of people)if(state.人物?.列表?.[personId])persons[personId]=copy(state.人物.列表[personId]);
    return {version:1,at:globalThis.SoulPersonCore.now(state),世界:{时间:copy(state.世界.时间),opening:copy(state.世界.opening)},装备:{配置:equipment},人物:{列表:persons},成长:{列表:Object.fromEntries([...people].filter(id=>state.成长?.列表?.[id]).map(id=>[id,copy(state.成长.列表[id])]))},战斗单位:{列表:units},物品:{实例:items},容器:{列表:containers},状态实例:{列表:statuses},研发:{蓝图:blueprints},远征:{processedTransactions:transactions},扩展:{...(state.扩展?.openingWorkshop?{openingWorkshop:copy(state.扩展.openingWorkshop)}:{}),creationEffects:{events:creationEvents},...(state.扩展?.deviceLocks?{deviceLocks:copy(state.扩展.deviceLocks)}:{}),...(state.扩展?.deviceEffectRemovals?{deviceEffectRemovals:copy(state.扩展.deviceEffectRemovals)}:{})}};
  }
  function validateAttributeFrame(frame,actorId,at){
    if(frame?.version!==1||frame.at!==at||globalThis.SoulPersonCore.now(frame)!==at||!frame.战斗单位?.列表?.[actorId])throw Error('历史装备时点或施用者无效');
    const errors=validateState(frame);if(errors.length)throw Error('历史装备来源无效：'+errors.join('；'));
    return frame;
  }
  return Object.freeze({VERSION,MAX_CAPABILITIES,MAX_FORMS,CAPABILITIES,FORM_REGISTRY,normalize,definition,read,suppressionLimits,setModeSuppression,sourceAllowed,carrier,capabilityActive,controller,isIndestructible,canDamage,authorizeRuleBreak,damage,write,hostItems,restrictionEquipment,assertSlots,withReadIndex,invalidateReadIndex,project,actions,setSuppression,setForm,setAppearance,formFacts,validateState,attributeFrame,validateAttributeFrame});
});
