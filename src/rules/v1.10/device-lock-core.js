(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.SoulDeviceLocks=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION=1;
  const copy=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
  const hash=v=>globalThis.SoulAbilityContract.hash(v);
  const now=s=>globalThis.SoulPersonCore.now(s);
  const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  function only(v,keys,label){if(!object(v)||Object.keys(v).some(k=>!keys.includes(k)))throw Error(label+'含有未知字段');}
  function integer(v,d,min,max,label){const n=v===undefined?d:v;if(!Number.isSafeInteger(n)||n<min||n>max)throw Error(label+'须为'+min+'至'+max+'的整数');return n;}
  function normalizeLock(v){
    only(v,['version','kind','dc','rank','keyMode'],'实体锁');
    if(v.version!==1)throw Error('实体锁版本无效');
    const kind=v.kind??'mechanical',keyMode=v.keyMode??'instance';
    if(!['mechanical','arcane','rule'].includes(kind)||!['instance','blueprint'].includes(keyMode))throw Error('锁类别或钥匙身份无效');
    return {version:1,kind,dc:integer(v.dc,14,10,40,'锁难度'),rank:integer(v.rank,1,1,9,'锁品级'),keyMode};
  }
  function normalizeBreakRule(v){
    only(v,['version','kind','rank'],'特殊破坏规则');
    if(v.version!==1||(v.kind??'destruction')!=='destruction')throw Error('特殊破坏只支持已登记的毁灭规则');
    return {version:1,kind:'destruction',rank:integer(v.rank,1,1,9,'破坏规则品级')};
  }
  function quoteLock(input){try{
    const lock=normalizeLock(input),parts={structure:24,difficulty:(lock.dc-10)*2,rank:lock.rank*8,kind:{mechanical:0,arcane:40,rule:100}[lock.kind],identity:lock.keyMode==='instance'?12:0},budget=Object.values(parts).reduce((a,b)=>a+b,0);
    return {pass:true,budget,valueGold:budget*5,bridgeClauses:[{kind:'attribute',label:'实体锁属性',anyOf:lock.kind==='mechanical'?['金']:lock.kind==='arcane'?['灵魂']:['空间','灵魂']},{kind:'channel',label:'实体锁机制',anyOf:['锁定解构']}],breakdown:parts};
  }catch(error){return {pass:false,budget:0,valueGold:0,bridgeClauses:[],breakdown:{},errors:[error.message]};}}
  function quoteBreakRule(input){try{const rule=normalizeBreakRule(input),budget=60+rule.rank*30;return {pass:true,budget,valueGold:budget*5,bridgeClauses:[{kind:'attribute',label:'特殊破坏属性',anyOf:['毁灭']},{kind:'channel',label:'特殊破坏机制',anyOf:['条件规则破坏']}],breakdown:{structure:60,rank:rule.rank*30}};}catch(error){return {pass:false,budget:0,valueGold:0,bridgeClauses:[],breakdown:{},errors:[error.message]};}}
  function table(s,create=false){if(create){s.扩展??={};s.扩展.deviceLocks??={version:VERSION,events:[],knowledge:{}};}return s.扩展?.deviceLocks??{version:VERSION,events:[],knowledge:{}};}
  function stamp(v){delete v.hash;v.hash=hash(v);return v;}
  function valid(v){if(!object(v)||typeof v.hash!=='string')return false;const c={...v};delete c.hash;return hash(c)===v.hash;}
  function sourceIdentity(s,item){
    if(!globalThis.SoulHostCore?.sourceAllowed(s,item))return null;
    const p=item.provenance??{};
    // Neither the mutable owner nor a public lock name establishes a maker.
    if(p.type==='opening-workshop'){
      const r=s.扩展?.openingWorkshop,g=r?.grants?.find(g=>g.designId===p.designId&&g.itemIds.includes(item.id));
      return g&&globalThis.SoulOpeningWorkshop.isItemAuthorized(s,item)?{type:p.type,sourceId:p.sourceId,designId:p.designId,contractHash:p.contractHash,makerId:g.ownerId}:null;
    }
    if(['research-prototype','blueprint-craft','ability-creation'].includes(p.type)){
      const b=s.研发?.蓝图?.[item.payload?.blueprintId];if(!b)return null;
      const makerId=p.actorId??b.ownerId;if(typeof makerId!=='string'||!makerId)return null;
      return {type:p.type,sourceId:p.transactionId??p.creationId??p.researchId,blueprintId:b.id,blueprintHash:hash(b),makerId};
    }
    return null; // Old presets are not silently issued keys or locks.
  }
  function identity(s,item){const source=sourceIdentity(s,item);if(!source)return null;return {itemId:item.id,templateId:item.templateId,host:globalThis.SoulHostCore.definition(item),source};}
  function blueprintIdentity(s,item){const p=item.provenance??{};return p.type==='opening-workshop'?{type:p.type,sourceId:p.sourceId,designId:p.designId,contractHash:p.contractHash}:{type:'blueprint',blueprintId:item.payload?.blueprintId,blueprintHash:hash(s.研发?.蓝图?.[item.payload?.blueprintId]??null)};}
  function lockEvents(s,itemId,lockId){return table(s).events.filter(e=>e.itemId===itemId&&e.lockId===lockId&&valid(e));}
  function layers(s,item,at=now(s)){
    if(!item)return [];let host;try{host=globalThis.SoulHostCore.definition(item);}catch{return [];}
    const raw=host.capabilities.release?.lock;if(!raw)return [];
    const frozen=identity(s,item);if(!frozen)return [];
    const carrier=globalThis.SoulHostCore.carrier(s,item),available=item.quantity===1&&item.durability>0&&Number(s.世界?.时间?.day??0)<=Number(item.payload?.expiresAtDay??Number.MAX_SAFE_INTEGER);
    const specs=[{lockId:'lock:'+hash(frozen),definition:normalizeLock(raw),origin:'fixed',controllerIds:item.attachment?[...(item.attachment.controllers??[])]:[frozen.source.makerId]}];
    for(const e of table(s).events)if(e.type==='arcane-applied'&&e.itemId===item.id&&e.at<=at&&valid(e)&&hash(e.identity)===hash(frozen))specs.push({lockId:e.lockId,definition:copy(e.overlayDefinition),origin:'arcane',originEventId:e.id,originEventHash:e.hash,expiresAt:e.until,controllerIds:[e.actorId]});
    return specs.map(spec=>{const events=lockEvents(s,item.id,spec.lockId).filter(e=>e.at<=at),last=events.filter(e=>['unlocked','locked'].includes(e.type)).at(-1),suppress=events.filter(e=>e.type==='suppressed'&&e.until>at).at(-1),expired=spec.expiresAt!==undefined&&spec.expiresAt<=at;return {...spec,sourceIdentity:frozen,wearerId:carrier?.personId??null,carrierKind:carrier?.kind??null,available:available&&!expired,expired,locked:last?.type!=='unlocked',suppressedUntil:suppress?.until??null,openingEventId:last?.type==='unlocked'?last.id:null};});
  }
  function definition(s,item,lockId=null){const all=layers(s,item);return (lockId?all.find(d=>d.lockId===lockId):all[0])??null;}
  function effective(s,item,lockId=null){const all=lockId?[definition(s,item,lockId)]:layers(s,item);return all.some(d=>d?.available&&d.locked&&!(d.suppressedUntil>now(s)));}
  function bindingEffective(s,item){const all=layers(s,item);return !all.length||effective(s,item);}
  function statusEffective(s,status){
    if(status.快照?.参数?.来源依赖!=='道具有效'||!['status.limb_bind','status.bind'].includes(status.模板ID))return true;
    const item=s.物品?.实例?.[status.来源?.物品ID];return !item||bindingEffective(s,item);
  }
  function event(s,type,item,actorId,sourceId,data={}){
    const db=table(s,true),d=definition(s,item,data.lockId??null);if(!d&&type!=='arcane-applied')throw Error('器具没有合法冻结的实体锁');
    const frozen=d?.sourceIdentity??identity(s,item);if(!frozen)throw Error('器具没有合法冻结的实体来源');
    if(typeof sourceId!=='string'||!sourceId||db.events.some(e=>e.id==='device-lock:'+sourceId+':'+item.id+':'+type))throw Error('锁操作来源缺失或重复');
    const e=stamp({id:'device-lock:'+sourceId+':'+item.id+':'+type,order:db.events.length+1,type,itemId:item.id,lockId:d?.lockId??data.lockId,actorId,sourceId,at:now(s),previousHash:db.events.at(-1)?.hash??null,identity:copy(frozen),...copy(data)});
    db.events.push(e);globalThis.SoulControlCore?.invalidateReadIndex(s);return e;
  }
  function actorCanControl(s,item,actorId,lockId=null){const d=definition(s,item,lockId);return !!d?.available&&d.controllerIds.includes(actorId)&&!(d.wearerId===actorId&&(d.origin==='arcane'||globalThis.SoulHostCore.read(item).capabilities.release?.wearerLock));}
  function keyIdentity(s,item,lockId=null){const d=definition(s,item,lockId);if(!d)return null;return d.definition.keyMode==='instance'?{mode:'instance',lockId:d.lockId,identity:copy(d.sourceIdentity),definition:copy(d.definition)}:{mode:'blueprint',blueprint:blueprintIdentity(s,item),definition:copy(d.definition)};}
  function currentKeyPayload(s,key){
    const payload=copy(key?.payload??{}),container=s.容器?.列表?.[key?.containerId],stored=Object.hasOwn(payload,'storedAtLocationId');
    if(stored||container?.type==='location-stash'){
      if(!stored||typeof payload.storedAtLocationId!=='string'||!payload.storedAtLocationId||container?.type!=='location-stash'||container.locationId!==payload.storedAtLocationId||container.ownerEntityId!==key.ownerEntityId||!s.人物?.列表?.[key.ownerEntityId]||!container.itemIds?.includes(key.id))throw Error('实体钥匙暂存位置与实际私人容器不一致');
      delete payload.storedAtLocationId;
    }
    return payload;
  }
  function keyMatches(s,key,item,actorId,lockId=null){
    const p=key?.payload?.deviceKey;if(!p||p.version!==1||key.quantity!==1||key.durability<=0||key.ownerEntityId!==actorId||key.containerId!==s.人物?.列表?.[actorId]?.inventoryContainerId||!s.容器?.列表?.[key.containerId]?.itemIds?.includes(key.id))return false;
    const e=table(s).events.find(e=>e.type==='key-created'&&e.keyItemId===key.id&&e.id===p.creationEventId&&valid(e));
    return !!e&&e.actorId===key.provenance?.actorId&&e.sourceId===key.provenance?.sourceId&&hash(e.keyIdentity)===hash(p.identity)&&hash(e.keyIdentity)===hash(keyIdentity(s,item,lockId))&&e.keyKnowledgeId===p.knowledgeId&&key.templateId==='device-key';
  }
  function canDetach(s,item,actorId){
    const all=layers(s,item),d=all[0];if(!d)return {pass:false,reason:'器具没有声明可解锁的实体锁',proof:null};
    if(!d.available)return {pass:false,reason:'器具已损坏、到期或数量无效',proof:null};
    if(all.some(d=>!d.expired&&d.locked&&!(d.suppressedUntil>now(s))))return {pass:false,reason:'须先以匹配钥匙或实际能力分别打开或抑制各层实体锁',proof:null};
    const eventId=d.openingEventId??lockEvents(s,item.id,d.lockId).filter(e=>e.type==='suppressed'&&e.until>now(s)).at(-1)?.id;
    const e=table(s).events.find(e=>e.id===eventId),layerProofs=all.slice(1).map(v=>{const open=table(s).events.find(e=>e.id===v.openingEventId)??lockEvents(s,item.id,v.lockId).filter(e=>e.type==='suppressed'&&e.until>now(s)).at(-1);return {lockId:v.lockId,originEventId:v.originEventId,originEventHash:v.originEventHash,...(v.expired?{expiredAt:v.expiresAt}:{eventId:open?.id,eventHash:open?.hash})};});return {pass:!!e,reason:e?'':'缺少实际开锁来源',proof:e?{version:1,eventId:e.id,eventHash:e.hash,itemId:item.id,lockId:d.lockId,actorId,at:now(s),throughOrder:table(s).events.length,...(layerProofs.length?{layers:layerProofs}:{})}:null};
  }
  function validateDetachProof(s,proof,item,actorId,at){
    if(!proof||proof.version!==1||proof.itemId!==item.id||proof.actorId!==actorId||proof.at!==at)return false;
    const e=table(s).events.find(e=>e.id===proof.eventId&&e.hash===proof.eventHash&&valid(e));if(!e||e.itemId!==item.id||e.lockId!==proof.lockId||e.at>at||e.type!=='unlocked'&&!(e.type==='suppressed'&&e.until>at))return false;
    const through=proof.throughOrder??Infinity;if(table(s).events.some(v=>v.itemId===item.id&&v.lockId===proof.lockId&&v.type==='locked'&&v.order>e.order&&v.order<=through&&v.at<=at))return false;
    const expected=layers(s,item,at).filter(v=>v.origin==='arcane'&&(table(s).events.find(e=>e.id===v.originEventId)?.order??Infinity)<=through);if(expected.length!==(proof.layers??[]).length)return false;
    return expected.every(d=>{const p=proof.layers.find(p=>p.lockId===d.lockId);if(!p||p.originEventId!==d.originEventId||p.originEventHash!==d.originEventHash)return false;if(d.expired)return p.expiredAt===d.expiresAt;const opened=table(s).events.find(e=>e.id===p.eventId&&e.hash===p.eventHash&&valid(e));return opened?.lockId===d.lockId&&opened.at<=at&&(opened.type==='unlocked'||opened.type==='suppressed'&&opened.until>at)&&!table(s).events.some(v=>v.lockId===d.lockId&&v.type==='locked'&&v.order>opened.order&&v.order<=through&&v.at<=at);});
  }
  function knowledge(s,actorId,id){const k=table(s).knowledge[id],e=k&&table(s).events.find(e=>e.id===k.eventId&&e.type==='analyzed'&&valid(e));return k&&valid(k)&&k.actorId===actorId&&e?.knowledgeId===id&&hash(e.knowledge)===hash(k)?k:null;}
  function keyBlueprint(s,actorId,id){
    const k=knowledge(s,actorId,id)??Object.values(table(s).knowledge).find(k=>knowledge(s,actorId,k.id)&&'device-key-blueprint:'+hash([actorId,k.id])===id);if(!k)return null;
    const frozen=k.keyIdentity,lock=frozen.definition??frozen.identity.host.capabilities.release.lock,value=20+lock.rank*20+(lock.dc-10)*2;
    return stamp({version:1,id:'device-key-blueprint:'+hash([actorId,k.id]),ownerId:actorId,name:'对应实体锁钥匙图纸',productKind:'device-key',knowledgeId:k.id,knowledgeEventId:k.eventId,keyIdentity:copy(frozen),productValue:value,requiredValue:Math.ceil(value/5),bridgeClauses:[{kind:'attribute',label:'钥匙实体材料',anyOf:['金','木','土']},{kind:'channel',label:'钥匙永久制造',anyOf:['永久造物']}]});
  }
  function nextAt(s,after=now(s),through=Infinity){return Math.min(Infinity,...table(s).events.filter(e=>['suppressed','arcane-applied'].includes(e.type)&&e.until>after&&e.until<=through).map(e=>e.until));}
  function advanceAt(s,at=now(s)){if(at!==now(s))throw Error('锁效到期须在实际世界时刻读取');globalThis.SoulControlCore?.invalidateReadIndex(s);return {at,expired:table(s).events.filter(e=>['suppressed','arcane-applied'].includes(e.type)&&e.until===at).map(e=>e.id)};}
  function validate(s){
    const db=table(s),errors=[];if(db.version!==1||!Array.isArray(db.events)||!object(db.knowledge))return ['实体锁记录结构无效'];let previous=null;const ids=new Set();
    for(const [i,e]of db.events.entries())try{
      if(!valid(e)||ids.has(e.id)||e.order!==i+1||e.previousHash!==previous||!Number.isSafeInteger(e.at)||e.at<0||e.at>now(s)||!s.人物?.列表?.[e.actorId]||!['unlocked','locked','suppressed','analyzed','key-created','equipment-detached','arcane-applied'].includes(e.type))throw Error('事件链');
      const item=s.物品?.实例?.[e.itemId],d=definition(s,item,e.lockId);if(!d||e.lockId!==d.lockId||hash(e.identity)!==hash(d.sourceIdentity))throw Error('冻结器具身份');
      const allowed={locked:['controller'],unlocked:['controller','key','ability'],suppressed:['ability'],analyzed:['ability'],'key-created':['ability','key-manufacture'],'arcane-applied':['ability']}[e.type];if(allowed&&!allowed.includes(e.basis?.kind))throw Error('操作依据类型未登记');
      if(e.type==='arcane-applied'&&(e.overlayDefinition.kind!=='arcane'||e.overlayDefinition.keyMode!=='instance'||hash(normalizeLock(e.overlayDefinition))!==hash(e.overlayDefinition)||e.lockId!=='arcane-lock:'+hash([e.sourceId,e.itemId])||e.until-e.at!==e.basis.params.持续分钟||e.overlayDefinition.dc!==e.basis.params.锁难度||e.overlayDefinition.rank!==e.basis.params.最高品级))throw Error('冻结临时魔法锁层');
      if(['locked','unlocked'].includes(e.type)&&e.basis?.kind==='controller'&&(!e.basis.controllerIds?.includes(e.actorId)||e.basis.wearerLock&&e.basis.wearerId===e.actorId))throw Error('控制者开锁或复锁权限');
      if(e.type==='suppressed'&&(!Number.isSafeInteger(e.until)||e.until<=e.at||e.until-e.at>10080))throw Error('抑制时限');
      if(e.type==='unlocked'&&e.basis?.kind==='key'&&(!e.basis.keyItem||!e.basis.keyEventId||!db.events.some(v=>v.id===e.basis.keyEventId&&v.type==='key-created'&&v.keyItemId===e.basis.keyItem.id&&v.order<e.order&&hash(v.keyIdentity)===hash(e.basis.keyItem.payload?.deviceKey?.identity))))throw Error('实体钥匙依据');
      if(e.type==='equipment-detached'&&!validateDetachProof(s,e.releaseProof,item,e.actorId,e.at))throw Error('普通装备实际解除凭据');
      if(e.type==='key-created'&&e.basis?.kind==='ability'){
        const bp=keyBlueprint(s,e.actorId,e.keyKnowledgeId),proof=e.materialProof,plan=e.materials;if(!bp||hash(bp)!==hash(e.keyBlueprint)||e.keyValue!==bp.productValue||hash(e.keyIdentity)!==hash(bp.keyIdentity)||!Array.isArray(proof)||!proof.length||!plan)throw Error('永久钥匙图纸或材料合同');
        const expedition=globalThis.SoulExpeditionEngine,stocks=proof.map(v=>({...copy(v.before),quantity:v.allocation.quantity}));
        if(proof.some(v=>v.before.fingerprint!==expedition.materialFingerprint(v.before,v.before.quality)||!Number.isSafeInteger(v.allocation.quantity)||v.allocation.quantity<1||v.before.quantity<v.allocation.quantity)||!expedition.bridgeCoverage(stocks,bp.bridgeClauses).pass)throw Error('钥匙真实材料来源');
        const expected=expedition.allocateBlueprintBatch(stocks,{requiredValue:bp.requiredValue,bridgeClauses:bp.bridgeClauses},1,false),value=stocks.reduce((n,v)=>n+v.quantity*v.unitValue,0);
        if(expected.quantity!==1||value<bp.requiredValue||value!==plan.consumedValue||hash(plan.allocations)!==hash(proof.map(v=>v.allocation)))throw Error('钥匙实际材料付款');
      }
      if(e.type==='key-created'&&e.basis?.kind==='key-manufacture'){if(globalThis.SoulDeviceKeyManufacturing?.validateKeyCreation(s,e)!==true)throw Error('对应图纸正式制造来源');}
      else if(['suppressed','analyzed','key-created','arcane-applied'].includes(e.type)||e.type==='unlocked'&&e.basis?.kind==='ability')if(!globalThis.SoulDeviceOperations?.validateEffectBasis(s,e.basis,e))throw Error('实际能力来源');
      ids.add(e.id);previous=e.hash;
    }catch(error){errors.push('实体锁事件'+e?.id+'：'+error.message);previous=e?.hash;}
    for(const [id,k]of Object.entries(db.knowledge))if(id!==k.id||!knowledge(s,k.actorId,id))errors.push('锁知识'+id+'缺少真实分析来源');
    for(const key of Object.values(s.物品?.实例??{}))if(key.payload?.deviceKey)try{const e=db.events.find(e=>e.id===key.payload.deviceKey.creationEventId&&e.type==='key-created'&&e.keyItemId===key.id);if(!e||key.templateId!=='device-key'||key.valuePoints!==e.keyValue||hash(currentKeyPayload(s,key))!==hash(e.keySnapshot?.payload)||hash(key.provenance)!==hash(e.keySnapshot?.provenance))throw Error('缺少唯一实际制造交付');}catch(error){errors.push('实体钥匙'+key.id+'：'+error.message);}
    errors.push(...(globalThis.SoulDeviceOperations?.validateEffectRemovals(s)??[]));return errors;
  }
  return Object.freeze({VERSION,normalizeLock,normalizeBreakRule,quoteLock,quoteBreakRule,table,stamp,valid,sourceIdentity,identity,layers,definition,effective,bindingEffective,statusEffective,event,actorCanControl,keyIdentity,currentKeyPayload,keyMatches,canDetach,validateDetachProof,knowledge,keyBlueprint,nextAt,advanceAt,validate});
});
