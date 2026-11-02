(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulPaidDesign=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const CATEGORIES=Object.freeze(['魂导器','丹药','毒药','暗器','拘束器']),clone=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
 const object=v=>v&&typeof v==='object'&&!Array.isArray(v),a=()=>globalThis.SoulAbilityContract,fx=()=>globalThis.SoulEffectCompiler,w=()=>globalThis.SoulWorldEngine,e=()=>globalThis.SoulExpeditionEngine;
 const hash=v=>a().hash(v),same=(x,y)=>hash(x)===hash(y);
 function normalize(category,input){
  if(!CATEGORIES.includes(category)||!object(input)||Object.keys(input).some(k=>!['version','category','name','description','appearance','definition','carrierTemplateId'].includes(k))||input.version!==1||input.category!==category)throw Error('请确认五类作品中当前类别的完整设计');
  for(const [key,max] of [['name',80],['description',2000],['appearance',2000]])if(typeof input[key]!=='string'||!input[key].trim()||input[key].length>max)throw Error('请填写作品'+key+'及完整作用说明');
  if(!object(input.definition))throw Error('作品缺少完整固定定义');
  if(input.carrierTemplateId!==undefined&&(typeof input.carrierTemplateId!=='string'||!input.carrierTemplateId))throw Error('作品载体无效');
  const d=globalThis.SoulOpeningWorkshop.compileDesign({id:'paid-fixed-design',category,name:input.name,description:input.description,appearance:input.appearance,quantity:1,recipient:'player',placement:'inventory',adopted:false,definition:clone(input.definition)});
  if(input.carrierTemplateId!==undefined&&input.carrierTemplateId!==d.templateId)throw Error('固定定义与所选载体不一致');
  const active=d.payload.activeSkill;
  if(active&&['魂导器','拘束器'].includes(category)&&(!(active.soulPowerCost>0)||!(active.durabilityCost>0)))throw Error('付费主动器具须实际支付魂力和耐久，不能沿用开局免费使用合同');
  if(active&&['丹药','毒药'].includes(category)){
   const polarities=active.effectGraph.nodes.map(n=>fx().effectPolarity(n.effectId,n.params)),required=category==='毒药'?'harmful':'beneficial';
   const directOath=category==='丹药'&&!active.medicine&&active.effectGraph.nodes.some(n=>n.effectId==='contract.oath');
   if(!directOath&&!polarities.includes(required))throw Error(category+'需要与所选用途一致的实际效果');
  }
  return {version:1,category,name:d.design.name,description:d.design.description,appearance:d.design.appearance,definition:clone(d.design.definition),carrierTemplateId:d.templateId};
 }
 function quote(category,input){
  const design=normalize(category,input),compiled=globalThis.SoulOpeningWorkshop.compileDesign({id:'paid-fixed-design',category,name:design.name,description:design.description,appearance:design.appearance,definition:clone(design.definition),quantity:1,recipient:'player',placement:'inventory',adopted:false});
  return finishQuote(design,compiled);
 }
 function finishQuote(design,compiled){
  const {category}=design,payload=clone(compiled.payload),active=payload.activeSkill,permanent=category==='魂导器'&&(payload.passiveEffectGraph||Object.values(payload.modifiers?.attributes??{}).some(Boolean))?w().priceEquipment(payload.passiveEffectGraph??null,payload.modifiers??{attributes:{}}).spent:0;
  let valueGold=compiled.valueGold,materialValue,hostQuote=null;
  if(payload.host){hostQuote=globalThis.SoulHostPricing.quotePayload(compiled.templateId,payload);valueGold=hostQuote.valueGold;materialValue=hostQuote.materialValue;}
  else if(category==='魂导器')materialValue=permanent+(active?fx().validateGraph(active.effectGraph,{ageTier:active.ageTier,mechanismCap:active.mechanismCap}).spent:0);
  else if(category==='拘束器')materialValue=globalThis.SoulBackgroundRestraints.compile(payload.backgroundRestraint.definition).priceGold/5+(active?fx().validateGraph(active.effectGraph,{ageTier:active.ageTier,mechanismCap:active.mechanismCap}).spent:0);
  else materialValue=active?.abilityValue?.netValue;
  if(!Number.isSafeInteger(valueGold)||valueGold<1||!Number.isSafeInteger(materialValue)||materialValue<1)throw Error('作品缺少可计价的完整实际能力');
  const nodes=[...(active?.effectGraph?.nodes??[]),...(payload.passiveEffectGraph?.nodes??[])],carrierSpecs=payload.backgroundRestraint?Object.values(globalThis.SoulBackgroundRestraints.compile(payload.backgroundRestraint.definition).device.modes).flat():[];
  const effects=[...nodes.filter(n=>!['release','targeting','check'].includes(fx().EFFECT_REGISTRY[n.effectId]?.family)).map(n=>({id:n.effectId,params:clone(n.params)})),...carrierSpecs.map(([id,params])=>({id,params:clone(params)}))];
  for(const node of effects)if(!e().effectChannelOptions(node.id,node.params).length)throw Error('当前材料没有登记这项能力的制造来源：'+(fx().EFFECT_REGISTRY[node.id]?.displayName??node.id));
  const effectSpecs=nodes.map(n=>[n.effectId,clone(n.params)]),mechanics={effects,effectSpecs,medicine:active?.medicine,modifiers:payload.modifiers};
  const bridgeClauses=globalThis.SoulHostPricing.uniqueBridges([...(hostQuote?.bridgeClauses??[]),...e().bridgeClausesForMechanics(mechanics)]);
  return {version:1,policy:'confirmed-paid-design-v1',design,designHash:hash(design),templateId:compiled.templateId,payload,valueGold,materialValue,hostQuote,effects,effectSpecs,bridgeClauses};
 }
 function sourceBlueprint(state,item){
  const blueprint=state?.研发?.蓝图?.[item?.payload?.blueprintId],design=blueprint?.mechanics?.confirmedDesign;
  if(!design||!e().validateBlueprintProductItem(item,blueprint))return null;
  const pending=state.研发.待处理[blueprint.createdFromResearchId],source=item.provenance??{},paid=pending&&state.远征?.processedTransactions?.[pending.consumedTransactionId],original=pending&&state.远征?.commandRequests?.[pending.consumedTransactionId]?.request?.request;
  return pending&&pending.status==='completed'&&pending.blueprintId===blueprint.id&&original?.confirmedDesign&&same(normalize(blueprint.category,original.confirmedDesign),design)&&paid?.type==='research-materials-consumed'&&paid.mechanicsHash===pending.mechanicsHash&&source.blueprintId===blueprint.id&&['research-prototype','blueprint-craft','ability-creation'].includes(source.type)?blueprint:null;
 }
 function originalSource(state,item,blueprint){
  const source=item.provenance??{};if(source.splitFrom!==undefined)return false;
  if(source.type==='research-prototype')return source.researchId===blueprint.createdFromResearchId&&Object.values(state.远征.processedTransactions).some(r=>r.type==='research-blueprint-created'&&r.blueprintId===blueprint.id&&r.prototypeItemId===item.id);
  if(source.type==='blueprint-craft'){const receipt=state.远征.processedTransactions[source.transactionId];return receipt?.type==='blueprint-crafted'&&receipt.blueprintId===blueprint.id&&receipt.itemIds?.includes(item.id)===true&&receipt.itemChanges?.some(c=>c.itemId===item.id&&c.quantityAfter>c.quantityBefore)===true;}
  const event=state.扩展?.creationEffects?.events?.find(v=>v.id===source.creationId);return event?.quote?.blueprintId===blueprint.id&&event.result?.createdItemIds?.includes(item.id)===true;
 }
 function itemIdentity(item){
  const payload=clone(item.payload??{});for(const key of ['storedAtLocationId','skillId','skillIds'])delete payload[key];
  return {templateId:item.templateId,type:item.type,valuePoints:item.valuePoints,maxDurability:item.扩展?.maxDurability,payload};
 }
 // Only actual paid production receipts add stock. A split redistributes this
 // stock and can never provide another copy of the original production credit.
 function productionCredits(state,item){
  const credits=[];for(const [id,receipt]of Object.entries(state.远征?.processedTransactions??{})){
   if(receipt.blueprintId!==item.payload.blueprintId)continue;
   if(receipt.type==='research-blueprint-created'&&receipt.prototypeItemId===item.id)credits.push({id,quantity:1,hash:hash(receipt)});
   if(receipt.type==='blueprint-crafted'&&receipt.itemIds?.includes(item.id)){
    const change=receipt.itemChanges?.find(v=>v.itemId===item.id),quantity=change?.quantityAfter-change?.quantityBefore;
    if(Number.isSafeInteger(quantity)&&quantity>0)credits.push({id,quantity,hash:hash(receipt)});
   }
  }
  return credits;
 }
 function transferIndex(state){
  const table=state.扩展?.paidDesignTransfers,index=new Map(),versions=new Map();if(table===undefined)return {index,versions};
  if(!object(table)||table.version!==1||Object.keys(table).some(k=>!['version','events'].includes(k))||!Array.isArray(table.events))throw Error('付费设计分拆账本无效');
  let previousHash=null;
  for(const event of table.events){
   if(!object(event)||Object.keys(event).some(k=>!['version','id','source','target','quantity','sourceQuantityAfter','fromVersion','previousSourceHash','productionCredits','previousHash','hash'].includes(k))||event.version!==1||!object(event.source)||!object(event.target)||event.id!=='paid-design-split:'+event.target.id||event.hash!==hash(Object.fromEntries(Object.entries(event).filter(([k])=>k!=='hash')))||event.previousHash!==previousHash)throw Error('付费设计分拆事件链无效');
   const source=event.source,target=event.target,blueprint=sourceBlueprint(state,source),prior=versions.get(source.id),parent=index.get(source.id);
   if(!blueprint||!source.id||!target.id||source.id===target.id||index.has(target.id)||versions.has(target.id)||!Number.isSafeInteger(event.quantity)||event.quantity<1||!Number.isSafeInteger(source.quantity)||source.quantity<=event.quantity||target.quantity!==event.quantity||event.sourceQuantityAfter!==source.quantity-event.quantity||event.fromVersion!==(prior?.version??0)+1||event.previousSourceHash!==(prior?.hash??null))throw Error('付费设计分拆数量或唯一前后版本无效');
   if(parent?(!same(source.provenance,parent.target.provenance)||!same(itemIdentity(source),itemIdentity(parent.target))):!originalSource(state,source,blueprint))throw Error('付费设计分拆缺少原付款及制造来源');
   if(!source.containerId||!target.containerId||!same(target.provenance,{...source.provenance,splitFrom:source.id})||!same(itemIdentity(source),itemIdentity(target))||!sourceBlueprint(state,target))throw Error('付费设计分拆不能改变原实物合同');
   const actualCredits=productionCredits(state,source),credits=event.productionCredits;
   if(!Array.isArray(credits)||new Set(credits.map(v=>v.id)).size!==credits.length||credits.some(v=>!actualCredits.some(actual=>same(v,actual))))throw Error('付费设计分拆制造数量来源无效');
   const produced=(parent?.quantity??0)+credits.reduce((sum,v)=>sum+v.quantity,0),outgoing=prior?.outgoing??0;
   if(source.quantity>produced-outgoing)throw Error('付费设计分拆不能重复使用原制造数量');
   index.set(target.id,event);versions.set(source.id,{version:event.fromVersion,hash:event.hash,outgoing:outgoing+event.quantity});previousHash=event.hash;
  }
  return {index,versions};
 }
 function registerSplit(state,before,split){
  if(!state.研发?.蓝图?.[before.payload?.blueprintId]?.mechanics?.confirmedDesign)return;
  if(!isItemSource(state,before)||!w().ITEM_TEMPLATES[before.templateId]?.stackable||state.物品?.实例?.[before.id]?.quantity!==before.quantity-split.quantity||state.物品?.实例?.[split.id]!==split||!state.容器?.列表?.[before.containerId]?.itemIds.includes(before.id)||!state.容器?.列表?.[split.containerId]?.itemIds.includes(split.id))throw Error('付费设计分拆缺少实际原件和转移');
  const {versions}=transferIndex(state),prior=versions.get(before.id),table=(state.扩展.paidDesignTransfers??={version:1,events:[]});
  const snapshot=item=>({...clone(item),payload:clone(item.payload)});
  const event={version:1,id:'paid-design-split:'+split.id,source:snapshot(before),target:snapshot(split),quantity:split.quantity,sourceQuantityAfter:before.quantity-split.quantity,fromVersion:(prior?.version??0)+1,previousSourceHash:prior?.hash??null,productionCredits:productionCredits(state,before),previousHash:table.events.at(-1)?.hash??null};event.hash=hash(event);table.events.push(event);transferIndex(state);
 }
 function validateTransfers(state){
  try{const {index,versions}=transferIndex(state);for(const item of Object.values(state.物品?.实例??{})){
   if(!index.has(item.id)&&!versions.has(item.id))continue;
   const credit=(index.get(item.id)?.quantity??0)+productionCredits(state,item).reduce((sum,v)=>sum+v.quantity,0),outgoing=versions.get(item.id)?.outgoing??0;
   if(!Number.isSafeInteger(item.quantity)||item.quantity<1||item.quantity>credit-outgoing)throw Error('付费设计实物数量超过实际制造与分拆余量');
  }return [];}catch(error){return [error.message];}
 }
 function isItemSource(state,item,planned=false){
  try{
   const blueprint=sourceBlueprint(state,item);if(!blueprint)return false;
   if(item.provenance?.splitFrom!==undefined){const {index}=transferIndex(state),event=index.get(item.id);return !!event&&same(item.provenance,event.target.provenance)&&same(itemIdentity(item),itemIdentity(event.target))&&!validateTransfers(state).length;}
   return planned||originalSource(state,item,blueprint);
  }catch{return false;}
 }
 return Object.freeze({VERSION:'confirmed-paid-design-v1',CATEGORIES,normalize,quote,isItemSource,registerSplit,validateTransfers});
});
