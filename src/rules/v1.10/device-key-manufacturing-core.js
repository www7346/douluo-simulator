(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulDeviceKeyManufacturing=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const copy=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v)),hash=v=>globalThis.SoulAbilityContract.hash(v),same=(a,b)=>hash(a)===hash(b);
 const locks=()=>globalThis.SoulDeviceLocks,exp=()=>globalThis.SoulExpeditionEngine,creation=()=>globalThis.SoulCreationCore,world=()=>globalThis.SoulWorldEngine;
 function blueprints(s,actorId){return Object.values(locks().table(s).knowledge??{}).map(k=>locks().keyBlueprint(s,actorId,k.id)).filter(Boolean);}
 function resolve(s,actorId,id){const bp=locks().keyBlueprint(s,actorId,id);if(!bp||bp.ownerId!==actorId||bp.productKind!=='device-key')throw Error('钥匙制造须使用本人通过真实解析掌握的对应图纸');return bp;}
 function validateBlueprint(s,bp,actorId=bp?.ownerId){const actual=resolve(s,actorId,bp?.id);if(!same(bp,actual))throw Error('钥匙图纸固定身份、材料或价值已改变');return actual;}
 function settleBlueprintProduct(s,bp,materials,actorId,provenance){
  validateBlueprint(s,bp,actorId);const route=provenance?.type;if(!['blueprint-craft','ability-creation'].includes(route))throw Error('钥匙须来自实际普通制造或永久造物');
  const sourceId=route==='blueprint-craft'?provenance.transactionId:provenance.sourceId,quantity=materials.quantity;
  if(!sourceId||!Number.isSafeInteger(quantity)||quantity<1||quantity>999999)throw Error('钥匙实际制造来源或数量无效');
  const exact=creation().materialPlan(s,actorId,bp.requiredValue,bp.bridgeClauses,materials.allocations,quantity);
  if(!same(exact.allocations,materials.allocations)||exact.consumedValue!==materials.consumedValue)throw Error('钥匙制造材料报价已变化');
  const proof=exact.allocations.map(allocation=>({allocation:copy(allocation),before:copy(exp().personMaterials(s,actorId)[allocation.fingerprint])}));
  const k=locks().knowledge(s,actorId,bp.knowledgeId),learned=locks().table(s).events.find(e=>e.id===k?.eventId),item=s.物品?.实例?.[learned?.itemId];if(!item)throw Error('对应实体锁的原实物来源不存在');
  creation().consumeMaterials(s,actorId,exact);const items=[],itemChanges=[];
  for(let index=1;index<=quantity;index++){
   const keySourceId=sourceId+':key:'+index,eventId='device-lock:'+keySourceId+':'+item.id+':key-created',id='device-key:'+hash([sourceId,bp.id,actorId,index]);
   const payload={deviceKey:{version:1,identity:copy(bp.keyIdentity),knowledgeId:bp.knowledgeId,creationEventId:eventId}},basis={version:1,kind:'key-manufacture',route,sourceId,blueprintId:bp.id,batchIndex:index,...(route==='ability-creation'?{creationId:provenance.creationId}:{})};
   const key=world().createItem(s,'device-key',actorId,s.人物.列表[actorId].inventoryContainerId,{id,name:'实体锁钥匙',forceUnique:true,quantity:1,valuePoints:bp.productValue,payload,provenance:{type:'device-key-manufacture',actorId,sourceId:keySourceId,transactionId:sourceId,blueprintId:bp.id,batchIndex:index,...(route==='ability-creation'?{creationId:provenance.creationId}:{})}});
   locks().event(s,'key-created',item,actorId,keySourceId,{lockId:k.lockId,basis,keyItemId:key.id,keyIdentity:copy(bp.keyIdentity),keyKnowledgeId:bp.knowledgeId,keyBlueprint:copy(bp),keyValue:bp.productValue,keySnapshot:copy(key),materials:copy(exact),materialProof:copy(proof)});
   items.push(key);itemChanges.push({itemId:key.id,name:key.name,quantityBefore:0,quantityAfter:1,containerId:key.containerId});
  }
  return {items,itemChanges};
 }
 function validateKeyCreation(s,e){try{
  const basis=e?.basis;if(!locks().valid(e)||basis?.kind!=='key-manufacture'||basis.version!==1||!['blueprint-craft','ability-creation'].includes(basis.route)||!Number.isSafeInteger(basis.batchIndex)||basis.batchIndex<1||e.sourceId!==basis.sourceId+':key:'+basis.batchIndex)return false;
  const bp=resolve(s,e.actorId,basis.blueprintId),k=locks().knowledge(s,e.actorId,bp.knowledgeId),proof=e.materialProof,plan=e.materials,key=e.keySnapshot;
  const learned=locks().table(s).events.find(v=>v.id===k?.eventId);if(!learned||learned.order>=e.order||learned.at>e.at||learned.itemId!==e.itemId)return false;
  if(!same(e.keyBlueprint,bp)||e.keyKnowledgeId!==bp.knowledgeId||e.lockId!==k.lockId||!same(e.keyIdentity,bp.keyIdentity)||e.keyValue!==bp.productValue||!Array.isArray(proof)||!proof.length||!plan||!key||key.id!==e.keyItemId||key.templateId!=='device-key'||key.quantity!==1||key.valuePoints!==bp.productValue||key.ownerEntityId!==e.actorId||key.containerId!==s.人物.列表[e.actorId]?.inventoryContainerId)return false;
  if(!same(key.payload,{deviceKey:{version:1,identity:bp.keyIdentity,knowledgeId:bp.knowledgeId,creationEventId:e.id}}))return false;
  const p=key.provenance;if(p?.type!=='device-key-manufacture'||p.actorId!==e.actorId||p.sourceId!==e.sourceId||p.transactionId!==basis.sourceId||p.blueprintId!==bp.id||p.batchIndex!==basis.batchIndex)return false;
  let receipt,ids,quantity;
  if(basis.route==='blueprint-craft'){
   receipt=s.远征?.processedTransactions?.[basis.sourceId];const request=s.远征?.commandRequests?.[basis.sourceId],anchor=s.人物.列表[e.actorId]?.扩展?.研发事务?.filter(a=>a.id===basis.sourceId);
   if(receipt?.type!=='blueprint-crafted'||receipt.id!==basis.sourceId||receipt.actorId!==e.actorId||receipt.recipientId!==e.actorId||receipt.blueprintId!==bp.id||receipt.productValueEach!==bp.productValue||receipt.requiredValueEach!==bp.requiredValue||request?.type!=='按图纸打造'||request.request?.actorId!==e.actorId||request.request?.blueprintId!==bp.id||request.requestHash!==hash(request.request)||anchor?.length!==1||anchor[0].requestHash!==request.requestHash||!same(receipt.materialAllocations,plan.allocations)||receipt.consumedValue!==plan.consumedValue)return false;
   ids=receipt.itemIds;quantity=receipt.quantity;
  }else{
   const event=s.扩展?.creationEffects?.events?.find(v=>v.id===basis.creationId),body=event&&Object.fromEntries(Object.entries(event).filter(([key])=>key!=='hash'));
   if(!event||event.hash!==hash(body)||event.actorId!==e.actorId||event.sourceId!==basis.sourceId||event.scope.blueprintId!==bp.id||event.quote.blueprintId!==bp.id||event.quote.value!==bp.productValue||event.contract?.id!==event.payment?.skillId||!globalThis.SoulAbilityContract.verify(event.contract).pass||event.payment?.actorId!==e.actorId||event.payment.operationId!==basis.sourceId||event.payment.resources?.before.soulPower-event.payment.resources?.after.soulPower!==event.payment.totals?.soulPower||!same(event.materialProof,proof)||!same(event.quote.materials.allocations,plan.allocations)||event.result.consumedValue!==plan.consumedValue||p.creationId!==event.id)return false;
   ids=event.result.createdItemIds;quantity=event.quote.quantity;receipt=event.result;
  }
  if(!Array.isArray(ids)||new Set(ids).size!==ids.length||ids.length!==quantity||basis.batchIndex>quantity||ids[basis.batchIndex-1]!==key.id||plan.quantity!==quantity)return false;
  const changes=basis.route==='blueprint-craft'?receipt.itemChanges:receipt.itemChanges;if(!changes?.some(c=>c.itemId===key.id&&c.quantityBefore===0&&c.quantityAfter===1&&c.containerId===key.containerId))return false;
  const stocks=proof.map(v=>({...copy(v.before),quantity:v.allocation.quantity}));
  if(proof.some(v=>v.before.fingerprint!==exp().materialFingerprint(v.before,v.before.quality)||!Number.isSafeInteger(v.allocation.quantity)||v.allocation.quantity<1||v.before.quantity<v.allocation.quantity)||!exp().bridgeCoverage(stocks,bp.bridgeClauses).pass)return false;
  const expected=exp().allocateBlueprintBatch(stocks,bp,quantity,false),value=stocks.reduce((n,v)=>n+v.quantity*v.unitValue,0);
  return expected.quantity===quantity&&value>=bp.requiredValue*quantity&&value===plan.consumedValue&&same(plan.allocations,proof.map(v=>v.allocation));
 }catch{return false;}}
 function validateProductItem(s,item,bp){try{validateBlueprint(s,bp);const e=locks().table(s).events.find(e=>e.type==='key-created'&&e.keyItemId===item?.id&&e.id===item?.payload?.deviceKey?.creationEventId);return !!e&&validateKeyCreation(s,e)&&same(locks().currentKeyPayload(s,item),e.keySnapshot.payload)&&same(item.provenance,e.keySnapshot.provenance)&&item.valuePoints===bp.productValue&&item.templateId==='device-key'&&item.quantity===1;}catch{return false;}}
 return Object.freeze({blueprints,resolve,validateBlueprint,settleBlueprintProduct,validateKeyCreation,validateProductItem});
});
