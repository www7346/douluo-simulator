(function(root,factory){
 const get=(name,file)=>root?.[name]??(typeof require==='function'?require(file):null);
 const api=factory(get('SoulAbilityContract','./ability-contract-core.js'),get('SoulPersonCore','./person-core.js'),get('SoulActionContext','./action-context-core.js'),get('SoulControlCore','./control-core.js'));
 if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulPoisonCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(a,people,actions,controls){
 'use strict';
 const clone=v=>JSON.parse(JSON.stringify(v)),same=(x,y)=>a.hash(x)===a.hash(y),now=s=>people.now(s);
 const INTENTS=Object.freeze(['prepare-poisoned-serving','offer-disguised-drug','respond-disguised-drug','consume-food-drink','coat-item','apply-contact-drug','direct-spray','release-toxic-cloud','touch-coated-item']);
 const table=s=>s.世界?.poisons??{version:1,sources:[],exposures:[],offers:[],events:[]};
 const source=(s,id)=>table(s).sources.find(v=>v.id===id),exposure=(s,id)=>table(s).exposures.find(v=>v.id===id);
 const stamp=v=>{delete v.hash;v.hash=a.hash(v);return v;},valid=v=>!!v&&v.hash===a.hash(Object.fromEntries(Object.entries(v).filter(([key])=>key!=='hash')));
 function initialize(s){if(s.世界.poisons)throw Error('毒源账本不能重新初始化');s.世界.poisons={version:1,sources:[],exposures:[],offers:[],events:[]};}
 function origin(r){return Object.fromEntries(['id','createdAt','responsibleId','skill','releaseSnapshot','itemProof','blueprintHash','route','totalDoses','carrier','expiresAt','sourceIntent'].map(k=>[k,r[k]]));}
 function event(s,kind,sourceId,detail={}){
  const db=table(s),e=stamp({id:`poison-event:${sourceId}:${db.events.length}`,sourceId,kind,at:now(s),order:people.nextEventOrder(s),previousHash:db.events.at(-1)?.hash??null,...clone(detail)});db.events.push(e);return e;
 }
 function save(s,r,kind,detail={}){stamp(r);const old=source(s,r.id);if(old)Object.assign(old,r);else table(s).sources.push(r);event(s,kind,r.id,{record:clone(r),...clone(detail)});}
 function createReleasedSource(s,record){
  const m=a.medicineContract(record.skill.medicine);
  if(source(s,record.id)||!a.verify(record.skill).pass||!record.itemProof||record.itemProof.id!==record.skill.sourceItemId||record.itemProof.quantity<1||record.responsibleId!==record.skill.持有者单位ID)throw Error('药剂释放缺少唯一真实来源');
  const r={...clone(record),createdAt:now(s),route:m.route,totalDoses:m.doses,remainingDoses:m.doses,expiresAt:m.sourceDurationMinutes?now(s)+m.sourceDurationMinutes:null,residents:[],lastAdvancedAt:now(s),status:'active'};
  r.originHash=a.hash(origin(r));save(s,r,'released',{payment:clone(record.payment),request:clone(record.sourceIntent)});return r;
 }
 function isToxicStatus(s,status){
  const p=status.扩展?.毒药来源,e=p?exposure(s,p.exposureId):null,r=e?source(s,e.sourceId):null;
  if(!p)return status.模板ID==='status.poison';
  const node=r?.skill.effectGraph.nodes.find(v=>v.id===status.来源?.效果ID);
  return !!(r&&r.skill.sourceKind==='consumable'&&node&&node.effectId===status.模板ID&&same(node.params,status.快照?.参数)&&status.来源?.单位ID===r.responsibleId&&status.来源?.技能ID===r.skill.id&&status.来源?.物品ID===r.itemProof.id&&same(status.扩展?.持续来源合同,r.skill)&&valid(e.proof)&&same(e.proof,p)&&p.targetId===status.目标单位ID&&p.sourceHash===r.originHash&&e.result&&e.result.effects.some(v=>v.statusId===status.id)&&globalThis.SoulCombatFoundation.negativeStatus(status.模板ID,status.快照?.参数));
 }
 function reserveExposure(s,sourceId,targetId,exposureId,route,trigger){
  const r=source(s,sourceId),db=table(s);
  const prior=exposure(s,exposureId);if(prior){if(prior.sourceId!==sourceId||prior.targetId!==targetId||prior.route!==route||trigger&&!same(Object.fromEntries(Object.entries(prior.proof.trigger).filter(([k])=>k!=='eventId')),trigger))throw Error('暴露编号不能替换来源、目标或真实触发');return prior;}
  if(!r||r.status!=='active'||r.remainingDoses<1||route!==r.route||r.expiresAt!==null&&now(s)>r.expiresAt||globalThis.SoulSealingCore?.active(s,targetId)||!s.战斗单位.列表[targetId]||s.战斗单位.列表[targetId].存活状态==='死亡')throw Error('没有可用于本次真实暴露的药剂剂量');
  if(globalThis.SoulTargetConditions?.skillReason(s,r.responsibleId,targetId,r.skill))return null;
  if(db.exposures.some(e=>e.sourceId===sourceId&&e.targetId===targetId&&e.at===now(s)))return null;
  if(!trigger||trigger.at!==now(s)||!trigger.kind)throw Error('真实暴露缺少吞服、命中或完整驻留证明');
  if(route==='inhaled'&&['battle-cloud','daily-cloud'].includes(r.carrier.kind)&&(!cloudContains(s,r,targetId)||!r.residents.some(v=>v.targetId===targetId&&v.enteredAt<=now(s)-1&&v.enteredAt===trigger.enteredAt&&v.entryOrder===trigger.entryOrder)))throw Error('吸入需要实际处于雾区并完整驻留一分钟');
  if(route==='oral'&&!canSwallowPhysically(s,targetId))throw Error('目标当前不能真实吞服');
  if(route==='contact'&&!trigger.hit)throw Error('接触药剂尚未实际命中或触碰');
  const actualCarrier=trigger.itemProof??s.物品.实例[trigger.itemId];
  if(r.carrier.kind==='serving'&&(trigger.kind!=='serving-swallowed'||trigger.itemId!==r.carrier.itemId||actualCarrier?.payload?.poisonServing?.sourceId!==r.id||actualCarrier?.quantity!==1||trigger.consumption?.quantity!==1||trigger.consumption?.quantityAfter!==0))throw Error('吞服来源不是这份实际消耗的独立污染食品');
  if(r.carrier.kind==='coating'&&(trigger.kind!=='item-contact'||trigger.itemId!==r.carrier.itemId||!s.物品.实例[trigger.itemId]))throw Error('触碰来源不是这件真实涂层载体');
  if(r.carrier.kind==='direct-oral'&&(r.carrier.targetId!==targetId||!['direct-drug-swallowed','accepted-drug-swallowed'].includes(trigger.kind)||trigger.itemId!==r.itemProof.id))throw Error('实际吞服目标与释放来源不一致');
  if(['apply-contact-drug','direct-spray'].includes(r.carrier.kind)&&(r.carrier.targetId!==targetId||trigger.kind!==r.carrier.kind||!same(trigger.check,r.carrier.check)||!trigger.check.hit))throw Error('直接施药必须来自这次真实命中');
  const confirmed=event(s,'trigger-confirmed',sourceId,{targetId,route,trigger:clone(trigger),targetUnitProof:clone(s.战斗单位.列表[targetId]),positionProof:{target:actions.positionOf(s,targetId),targetPoint:point(s,targetId)},...(actualCarrier?{carrierItemProof:clone(actualCarrier)}:{})});
  trigger={...trigger,eventId:confirmed.id};
  const ordinal=r.totalDoses-r.remainingDoses+1,proof=stamp({version:1,exposureId,sourceId,doseId:`${sourceId}:dose:${ordinal}`,targetId,at:now(s),route,sourceHash:r.originHash,trigger:clone(trigger)});
  const e={id:exposureId,sourceId,targetId,at:now(s),route,doseId:proof.doseId,proof,result:null};db.exposures.push(e);
  r.remainingDoses--;if(!r.remainingDoses)r.status='depleted';const checkContext=globalThis.SoulCombatEngine.medicineCheckContext(s,r,targetId);checkContext.扩展.personEventSequence++;save(s,r,'dose-reserved',{exposure:clone(e),checkContext});return e;
 }
 function expose(s,sourceId,targetId,exposureId,route,receipt=null,trigger=null){
  const e=reserveExposure(s,sourceId,targetId,exposureId,route,trigger);if(!e||e.result)return e;
  const result=globalThis.SoulCombatEngine.applyReleasedMedicine(s,{sourceId,exposureId,targetId},receipt);
  e.result=clone(result);stamp(e);event(s,'exposed',sourceId,{exposure:clone(e)});return e;
 }
 function point(s,id){const p=s.战斗单位.列表[id]?.位置?.战场坐标;return p&&Number.isFinite(p.x)&&Number.isFinite(p.y)?clone(p):null;}
 function cloudContains(s,r,id){
  if(globalThis.SoulSealingCore?.active(s,id)||s.战斗单位.列表[id]?.存活状态==='死亡')return false;
  const c=r.carrier;
  if(c.kind==='battle-cloud'){
   const b=[s.战斗,...Object.values(s.世界.backgroundBattles??{})].find(b=>b.id===c.battleId),p=point(s,id);
   return !!(b?.状态==='进行中'&&b.扩展?.成员?.[id]?.status==='active'&&p&&Math.hypot(p.x-c.center.x,p.y-c.center.y)<=10);
  }
  if(!s.人物.列表[id])return false;
  try{return same(actions.positionOf(s,id),c.position);}catch{return false;}
 }
 function canConsumeOffer(s,o){try{if(!o||!['pending','accepted'].includes(o.status))return false;const k=medicine(s,o.actorId,o.itemId,'oral');actions.resolve(s,{actorId:o.actorId,targetIds:[o.targetId],requirements:['gesture']});actions.resolve(s,{actorId:o.targetId,targetIds:[o.actorId],requirements:['ingest']});if(harmful(k))actions.assertTargets(s,o.actorId,{harmfulTargetIds:[o.targetId]});return canSwallow(s,o.targetId)&&!controls.skillReason(s,o.actorId,k,a.describe(k));}catch{return false;}}
 function invalidateOffers(s){for(const o of table(s).offers.filter(v=>['pending','accepted'].includes(v.status))){const item=s.物品.实例[o.itemId];if(!item||item.ownerEntityId!==o.actorId||item.containerId!==s.人物.列表[o.actorId]?.inventoryContainerId||item.quantity<1||!actions.colocated(s,o.actorId,o.targetId)||s.人物.列表[o.actorId]?.status==='dead'){o.status='cancelled';o.cancelledAt=now(s);o.reason='原药物或实际递药现场已失效';stamp(o);event(s,'offer-invalidated',null,{offer:clone(o)});}}}
 function syncResidents(s){
  invalidateOffers(s);
  for(const r of table(s).sources.filter(r=>r.route==='inhaled'&&r.status==='active'&&['battle-cloud','daily-cloud'].includes(r.carrier.kind))){
   const ids=Object.keys(s.战斗单位.列表).filter(id=>cloudContains(s,r,id)).sort(),old=r.residents,entryOrder=ids.some(id=>!old.some(v=>v.targetId===id))?people.nextEventOrder(s):null;
   const residents=ids.map(id=>old.find(v=>v.targetId===id)??{targetId:id,enteredAt:now(s),entryOrder});
   if(!same(residents,old)){r.residents=residents;save(s,r,'residency-changed');}
  }
 }
 function nextAt(s,through=Infinity){const times=table(s).sources.filter(r=>r.status==='active'&&r.expiresAt!==null).map(r=>r.route==='inhaled'&&['battle-cloud','daily-cloud'].includes(r.carrier.kind)?Math.min(r.expiresAt,r.lastAdvancedAt+1):r.expiresAt).filter(at=>at<=through);return times.length?Math.min(...times):null;}
 function advanceAt(s,at=now(s),receipt=null){
  for(const r of table(s).sources.filter(r=>r.status==='active'&&r.expiresAt!==null)){
   if(r.route==='inhaled'&&['battle-cloud','daily-cloud'].includes(r.carrier.kind)&&r.lastAdvancedAt<at){
    const residents=r.residents.filter(v=>v.enteredAt<at&&cloudContains(s,r,v.targetId)).sort((x,y)=>x.entryOrder-y.entryOrder||x.targetId.localeCompare(y.targetId));
    for(const v of residents){if(!r.remainingDoses)break;expose(s,r.id,v.targetId,`${r.id}:inhaled:${at}:${v.targetId}`,'inhaled',receipt,{kind:'cloud-residency',at,enteredAt:v.enteredAt,entryOrder:v.entryOrder,carrier:clone(r.carrier)});}
    r.lastAdvancedAt=at;save(s,r,'minute-completed');
   }
   if(r.expiresAt<=at&&r.status==='active'){r.status='expired';save(s,r,'expired');}
  }
  syncResidents(s);
 }
 function touch(s,itemId,targetId,sourceId,receipt=null){
  const results=[];
  for(const r of table(s).sources.filter(r=>r.status==='active'&&r.route==='contact'&&r.carrier.kind==='coating'&&r.carrier.itemId===itemId))results.push(expose(s,r.id,targetId,`${sourceId}:touch:${r.id}:${targetId}`,'contact',receipt,{kind:'item-contact',at:now(s),itemId,hit:true,operationId:sourceId}));
  return results.filter(Boolean);
 }
 function canSwallowPhysically(s,id){const unit=s.战斗单位.列表[id];return !!(unit&&unit.存活状态==='存活'&&unit.资源.生命.当前>0&&!globalThis.SoulSealingCore?.active(s,id)&&!controls.active(s,id).some(v=>['status.sleep','status.stun'].includes(v.模板ID))&&!controls.restrictions(s,id).blocked.ingest?.length);}
 function canSwallow(s,id){return canSwallowPhysically(s,id)&&!globalThis.SoulInfluenceCore?.autonomyReason(s,id);}
 function ingestServing(s,itemId,targetId,sourceId,receipt=null,consumed=null){
  if(!canSwallowPhysically(s,targetId))throw Error('进食者当前不能清醒吞服');
  const r=table(s).sources.find(r=>r.carrier.kind==='serving'&&r.carrier.itemId===itemId&&r.status==='active');
  return r?expose(s,r.id,targetId,`${sourceId}:swallowed:${r.id}:${targetId}`,'oral',receipt,{kind:'serving-swallowed',at:now(s),itemId,operationId:sourceId,itemProof:consumed?.itemProof,consumption:consumed?.consumption}):null;
 }
 function carried(s,actorId,itemId){const item=s.物品.实例[itemId];if(!item||item.ownerEntityId!==actorId||item.containerId!==s.人物.列表[actorId].inventoryContainerId||item.quantity<1)throw Error('需要实际携带的物品');return item;}
 function consume(s,actorId,itemId,operationId){return a.pay(s,actorId,{id:`food:${operationId}`,sourceKind:'ordinary',soulPowerCost:0,resourceCosts:[{kind:'item',itemId,quantity:1}]},operationId);}
 function medicine(s,actorId,itemId,route){const item=carried(s,actorId,itemId),skill=globalThis.SoulWorldEngine.inspectItem(s,item).skills.find(v=>v.medicine);if(!skill||skill.medicine.route!==route)throw Error('药剂实际冻结途径不支持这项施用');return skill;}
 function detectionProfile(s,actorId,targetId,covert=false){const f=globalThis.SoulCombatFoundation,c=globalThis.SoulCombatEngine,actor=s.战斗单位.列表[actorId],target=s.战斗单位.列表[targetId],attribute=covert?'身法':'悟性',modifier=f.battleAttributeView(s,actor).modifiers?.[attribute]??c.attributeModifier(s,actor,attribute),observer=c.attributeModifier(s,target,'感知'),dc=10+observer+Math.floor(target.派生.熟练加值/2);return {attribute,modifier,proficiency:actor.派生.熟练加值,observer,observerProficiency:target.派生.熟练加值,dc,actorView:clone(f.battleAttributeView(s,actor)),targetView:clone(f.battleAttributeView(s,target))};}
 function detection(s,actorId,targetId,operationId,covert=false){const p=detectionProfile(s,actorId,targetId,covert),die=globalThis.SoulCombatEngine.makeRng(`${s.世界.seed}:drug-detection:${operationId}`).die(20),total=die+p.modifier+p.proficiency;return {...p,die,total,detected:total<=p.dc};}
 function harmful(skill){return skill.effectGraph.nodes.some(n=>globalThis.SoulEffectCompiler.effectPolarity(n.effectId,n.params)==='harmful');}
 function quote(s,request){
  const {actorId,type,itemId,targetId}=request,c=globalThis.SoulCombatEngine,result={type,actorId,available:true};
  if(!INTENTS.includes(type)||Object.keys(request).some(k=>!['id','type','actorId','itemId','targetId','carrierItemId','claim','offerId','decision','covert','swallow'].includes(k)))throw Error('药剂命令包含未授权机械结果');
  if(controls.active(s,actorId).some(v=>['status.sleep','status.stun'].includes(v.模板ID)))throw Error('施用或回应药物须保持清醒');
  actions.resolve(s,{actorId,targetIds:targetId?[targetId]:[],requirements:type==='consume-food-drink'?['ingest']:type==='respond-disguised-drug'?[]:['gesture']});
  const releaseQuote=(payerId,sourceItemId,route,additionalCosts=[])=>{
   const skill=medicine(s,payerId,sourceItemId,route);actions.resolve(s,{actorId:payerId,requirements:['gesture']});
   return c.quoteSkillUse(s,s.战斗单位.列表[payerId],skill,{fieldUse:!actions.battleOf(s,payerId),branchIds:globalThis.SoulEffectCompiler.graphBranches(skill.effectGraph).map(b=>b.id),preparingMedicine:true,additionalCosts,...(targetId?{targetIds:[targetId]}:{})});
  };
  if(type==='consume-food-drink'&&request.offerId){
   const offer=table(s).offers.find(v=>v.id===request.offerId);if(!offer||offer.targetId!==actorId||offer.status!=='accepted')throw Error('药物尚未由接受宣称的本人选择实际吞服');
   actions.resolve(s,{actorId,targetIds:[offer.actorId],requirements:['ingest']});if(!canSwallow(s,actorId))throw Error('接受者当前不能真实吞服');
   const skill=medicine(s,offer.actorId,offer.itemId,'oral');if(harmful(skill))actions.assertTargets(s,offer.actorId,{harmfulTargetIds:[actorId]});const conditionReason=globalThis.SoulTargetConditions?.skillReason(s,offer.actorId,actorId,skill);if(conditionReason)throw Error(conditionReason);result.payment=releaseQuote(offer.actorId,offer.itemId,'oral');
  }else if(type==='consume-food-drink'){
   carried(s,actorId,itemId);if(!canSwallow(s,actorId))throw Error('当前不能吞服');result.foodUse=c.quoteFoodConsumption(s,actorId,itemId);result.payment=result.foodUse.payment;
  }else if(type==='prepare-poisoned-serving'){
   const food=carried(s,actorId,request.carrierItemId);globalThis.SoulWorldEngine.supportFoodCarrier(s,food);
   result.payment=releaseQuote(actorId,itemId,'oral',[{kind:'item',itemId:food.id,quantity:1}]);
  }else if(type==='offer-disguised-drug'){
   const skill=medicine(s,actorId,itemId,'oral');if(harmful(skill))actions.assertTargets(s,actorId,{harmfulTargetIds:[targetId]});if(!targetId||targetId===actorId||typeof request.claim!=='string'||!request.claim.trim()||request.claim.length>1000)throw Error('伪装给药需要同场真实人物及明确宣称');result.detection=detectionProfile(s,actorId,targetId,request.covert===true);
  }else if(type==='respond-disguised-drug'){
   const offer=table(s).offers.find(v=>v.id===request.offerId);if(!offer||offer.targetId!==actorId||offer.status!=='pending'||!['accept','refuse','inspect'].includes(request.decision))throw Error('回应须来自收到该药物宣称的本人');globalThis.SoulInfluenceCore.assertVoluntary(s,actorId);actions.resolve(s,{actorId,targetIds:[offer.actorId],requirements:[]});
   if(request.swallow!==undefined&&typeof request.swallow!=='boolean'||request.swallow&&request.decision!=='accept')throw Error('只有本人接受允许决定吞服');
   if(request.swallow){const projection=clone(s);table(projection).offers.find(v=>v.id===offer.id).status='accepted';result.ingestion=quote(projection,{type:'consume-food-drink',actorId,offerId:offer.id});}
  }else if(type==='coat-item'){
   const carrier=carried(s,actorId,request.carrierItemId);if(carrier.payload?.poisonServing||carrier.attachment||carrier.quantity!==1)throw Error('载体当前不适合涂层');result.payment=releaseQuote(actorId,itemId,'contact');
  }else if(type==='release-toxic-cloud'){
   const skill=medicine(s,actorId,itemId,'inhaled'),battle=actions.battleOf(s,actorId),position=actions.positionOf(s,actorId);if(!battle&&!position.sceneId)throw Error('日常毒雾需要真实房间、牢房或远征节点，不能覆盖整个公共地区');const carrier=battle?{kind:'battle-cloud',battleId:battle.id,center:point(s,actorId)}:{kind:'daily-cloud',position:clone(position)};
   if(harmful(skill))actions.assertTargets(s,actorId,{harmfulTargetIds:Object.keys(s.战斗单位.列表).filter(id=>cloudContains(s,{carrier},id))});result.payment=releaseQuote(actorId,itemId,'inhaled');
  }else{
   if(!targetId)throw Error('施药需要真实目标');const sources=type==='touch-coated-item'?table(s).sources.filter(r=>r.carrier.kind==='coating'&&r.carrier.itemId===itemId&&r.route==='contact'&&r.status==='active'&&r.remainingDoses>0&&(r.expiresAt===null||r.expiresAt>now(s))):[],skills=type==='touch-coated-item'?sources.map(r=>r.skill):[medicine(s,actorId,itemId,type==='direct-spray'?'inhaled':'contact')];
   if(type==='touch-coated-item'){carried(s,actorId,itemId);if(!sources.length)throw Error('这件物品没有仍可使用的药物涂层');}
   for(const skill of skills){const reason=globalThis.SoulTargetConditions?.skillReason(s,actorId,targetId,skill);if(reason)throw Error(reason);}
   if(skills.some(harmful))actions.assertTargets(s,actorId,{harmfulTargetIds:[targetId]});const maximum=type==='direct-spray'?Number(skills[0].effectGraph.nodes.find(n=>n.family==='release')?.params?.距离区??1):0;result.contact=c.medicineContactProfile(s,actorId,targetId,maximum);
   if(type!=='touch-coated-item')result.payment=releaseQuote(actorId,itemId,type==='direct-spray'?'inhaled':'contact');
  }
  return result;
 }
 function execute(s,request,id){
  quote(s,request);
  const {actorId,type,itemId,targetId}=request,receipt={id,type:'medicine-operation',operation:type,actorId,targets:[]};
  if(Object.keys(request).some(k=>!['id','type','actorId','itemId','targetId','carrierItemId','claim','offerId','decision','covert','swallow'].includes(k)))throw Error('药剂命令包含未授权机械结果');
  if(controls.active(s,actorId).some(v=>['status.sleep','status.stun'].includes(v.模板ID)))throw Error('施用或回应药物须保持清醒');
  actions.resolve(s,{actorId,targetIds:targetId?[targetId]:[],requirements:type==='consume-food-drink'?['ingest']:type==='respond-disguised-drug'?[]:['gesture']});
  if(type==='consume-food-drink'&&request.offerId){
   const offer=table(s).offers.find(v=>v.id===request.offerId);if(!offer||offer.targetId!==actorId||offer.status!=='accepted')throw Error('药物尚未由接受宣称的本人选择实际吞服');
   actions.resolve(s,{actorId,targetIds:[offer.actorId],requirements:['ingest']});if(!canSwallow(s,actorId))throw Error('接受者当前不能真实吞服');medicine(s,offer.actorId,offer.itemId,'oral');
   const r=globalThis.SoulCombatEngine.releaseMedicine(s,offer.actorId,offer.itemId,id,{...request,itemId:offer.itemId,type:'direct-medicine-use'},{kind:'direct-oral',targetId:actorId,offerId:offer.id});
   receipt.exposure=expose(s,r.id,actorId,`${id}:swallowed`,'oral',receipt,{kind:'accepted-drug-swallowed',at:now(s),offerId:offer.id,itemId:offer.itemId,operationId:id});offer.status='swallowed';offer.swallowedAt=now(s);offer.ingestionId=id;stamp(offer);event(s,'offer-swallowed',r.id,{offer:clone(offer)});receipt.ingestion={recipientId:actorId,itemId:offer.itemId,swallowed:true};
  }else if(type==='consume-food-drink'){
   carried(s,actorId,itemId);if(!canSwallow(s,actorId))throw Error('当前不能吞服');const used=globalThis.SoulCombatEngine.consumeFoodContents(s,actorId,itemId,id);receipt.payment=clone(used.payment);receipt.ingestion=clone(used.ingestion);receipt.targets.push(...used.targets);if(used.exposure)receipt.exposure=clone(used.exposure);
  }else if(type==='prepare-poisoned-serving'){
   medicine(s,actorId,itemId,'oral');const food=carried(s,actorId,request.carrierItemId);globalThis.SoulWorldEngine.supportFoodCarrier(s,food);const original=clone(food);
   const r=globalThis.SoulCombatEngine.releaseMedicine(s,actorId,itemId,id,request,paidState=>{const serving=globalThis.SoulWorldEngine.createItem(paidState,food.templateId,actorId,paidState.人物.列表[actorId].inventoryContainerId,{...original,id:'',quantity:1,forceUnique:true,payload:{...original.payload,poisonServing:{version:1,sourceId:`poison:${id}`,originalFoodId:original.id}}});return {kind:'serving',itemId:serving.id,foodProof:original};},{additionalCosts:[{kind:'item',itemId:food.id,quantity:1}]});receipt.sourceId=r.id;receipt.servingItemId=r.carrier.itemId;receipt.foodPayment=clone(r.payment);
  }else if(type==='offer-disguised-drug'){
   const offeredSkill=medicine(s,actorId,itemId,'oral');if(harmful(offeredSkill))actions.assertTargets(s,actorId,{harmfulTargetIds:[targetId]});if(!targetId||targetId===actorId||typeof request.claim!=='string'||!request.claim.trim()||request.claim.length>1000)throw Error('伪装给药需要同场真实人物及明确宣称');
   const check=detection(s,actorId,targetId,id,request.covert===true),offer=stamp({id:`drug-offer:${id}`,actorId,targetId,itemId,claim:request.claim.trim(),createdAt:now(s),status:'pending',check,detected:check.detected,request:{...clone(request),id}});table(s).offers.push(offer);event(s,'offered',null,{offer:clone(offer)});receipt.offerId=offer.id;receipt.detected=offer.detected;
  }else if(type==='respond-disguised-drug'){
   const offer=table(s).offers.find(v=>v.id===request.offerId);if(!offer||offer.targetId!==actorId||offer.status!=='pending'||!['accept','refuse','inspect'].includes(request.decision))throw Error('回应须来自收到该药物宣称的本人');
   globalThis.SoulInfluenceCore.assertVoluntary(s,actorId);actions.resolve(s,{actorId,targetIds:[offer.actorId],requirements:[]});offer.status=request.decision==='accept'?'accepted':request.decision==='inspect'?'inspected':'refused';offer.respondedAt=now(s);offer.responseId=id;if(request.decision==='inspect')offer.detected=true;stamp(offer);event(s,'offer-response',null,{offer:clone(offer)});receipt.offerId=offer.id;receipt.decision=request.decision;
   if(request.swallow!==undefined&&typeof request.swallow!=='boolean'||request.swallow&&request.decision!=='accept')throw Error('只有本人接受允许决定吞服');if(request.swallow){const used=execute(s,{type:'consume-food-drink',actorId,offerId:offer.id},id+':ingestion');receipt.ingestion=used.ingestion;receipt.exposure=used.exposure;receipt.targets.push(...used.targets);}
  }else if(type==='coat-item'){
   medicine(s,actorId,itemId,'contact');const carrier=carried(s,actorId,request.carrierItemId);if(carrier.payload?.poisonServing||carrier.attachment||carrier.quantity!==1)throw Error('载体当前不适合涂层');const r=globalThis.SoulCombatEngine.releaseMedicine(s,actorId,itemId,id,request,{kind:'coating',itemId:carrier.id,itemProof:clone(carrier)});receipt.sourceId=r.id;
  }else if(type==='release-toxic-cloud'){
   medicine(s,actorId,itemId,'inhaled');const battle=actions.battleOf(s,actorId),position=actions.positionOf(s,actorId);let carrier;
   if(battle)carrier={kind:'battle-cloud',battleId:battle.id,center:point(s,actorId)};
   else {if(!position.sceneId)throw Error('日常毒雾需要真实房间、牢房或远征节点，不能覆盖整个公共地区');carrier={kind:'daily-cloud',position:clone(position)};}
   const cloudSkill=medicine(s,actorId,itemId,'inhaled');if(harmful(cloudSkill))actions.assertTargets(s,actorId,{harmfulTargetIds:Object.keys(s.战斗单位.列表).filter(id=>cloudContains(s,{carrier},id))});const r=globalThis.SoulCombatEngine.releaseMedicine(s,actorId,itemId,id,request,carrier);receipt.sourceId=r.id;syncResidents(s);
  }else if(['apply-contact-drug','direct-spray','touch-coated-item'].includes(type)){
   if(!targetId)throw Error('施药需要真实目标');const skills=type==='touch-coated-item'?table(s).sources.filter(r=>r.carrier.kind==='coating'&&r.carrier.itemId===itemId&&r.route==='contact'&&r.status==='active').map(r=>r.skill):[medicine(s,actorId,itemId,type==='direct-spray'?'inhaled':'contact')];if(skills.some(harmful))actions.assertTargets(s,actorId,{harmfulTargetIds:[targetId]});const maximum=type==='direct-spray'?Number(skills[0].effectGraph.nodes.find(n=>n.family==='release')?.params?.距离区??1):0;const check=globalThis.SoulCombatEngine.medicineContactCheck(s,actorId,targetId,id,maximum);receipt.contact=check;
   if(type==='touch-coated-item'){carried(s,actorId,itemId);if(check.hit)receipt.exposures=touch(s,itemId,targetId,id,receipt);}
   else {const route=type==='direct-spray'?'inhaled':'contact';medicine(s,actorId,itemId,route);const r=globalThis.SoulCombatEngine.releaseMedicine(s,actorId,itemId,id,request,{kind:type,targetId,check});receipt.sourceId=r.id;if(check.hit)receipt.exposure=expose(s,r.id,targetId,`${id}:direct-exposure`,route,receipt,{kind:type,at:now(s),hit:true,check:clone(check),operationId:id});r.status=r.remainingDoses?'expired':'depleted';save(s,r,'direct-use-ended');}
  }else throw Error('未知药剂操作');
  syncResidents(s);return receipt;
 }
 function facts(s,viewerId){return {sources:table(s).sources.filter(r=>r.responsibleId===viewerId).map(r=>({id:r.id,route:r.route,remainingDoses:r.remainingDoses,totalDoses:r.totalDoses,carrier:clone(r.carrier),expiresAt:r.expiresAt,status:r.status})),offers:table(s).offers.filter(o=>o.actorId===viewerId||o.targetId===viewerId).map(o=>({id:o.id,actorId:o.actorId,targetId:o.targetId,claim:o.claim,status:o.status,...(o.targetId===viewerId?{knownWarning:o.detected?'已察觉药物宣称存在可疑之处':'对方宣称的药物用途尚未证实'}:{detected:o.detected})}))};}
 function validate(s){
  const db=table(s),errors=[];if(!s.世界?.poisons)return ['本版缺少正式毒源账本'];
  if(db.version!==1||!['sources','exposures','offers','events'].every(k=>Array.isArray(db[k])))return ['毒源账本格式无效'];
  let previousHash=null;const latest=new Map(),latestExposures=new Map(),ids=new Set();
  let previousAt=-1,previousOrder=0;for(const [index,e] of db.events.entries()){
   if(e.id!==`poison-event:${e.sourceId}:${index}`||e.at<previousAt||!Number.isSafeInteger(e.order)||e.order<=previousOrder)errors.push('毒源事件编号、时间或顺序无效');previousAt=e.at;previousOrder=e.order;
   if(!valid(e)||e.previousHash!==previousHash||ids.has(e.id)||!Number.isSafeInteger(e.at)||e.at>now(s))errors.push('毒源事件链无效');
   ids.add(e.id);previousHash=e.hash;if(e.record)latest.set(e.sourceId,e.record);if(e.exposure)latestExposures.set(e.exposure.id,e.exposure);
  }
  const transitions=new Map(),pending=new Map();for(const event of db.events){
   const prior=transitions.get(event.sourceId),record=event.record;
   if(!['released','dose-reserved','exposed','trigger-confirmed','minute-completed','expired','residency-changed','direct-use-ended','offered','offer-response','offer-swallowed','offer-invalidated'].includes(event.kind))errors.push('毒源事件类型无效');
   if(record){if(event.kind==='released'){if(prior||record.remainingDoses!==record.totalDoses||record.status!=='active')errors.push('毒源释放不能复制剂量');}
    else if(!prior||record.originHash!==prior.originHash||!same(origin(record),origin(prior))||!same(record.payment,prior.payment)||record.remainingDoses!==prior.remainingDoses-(event.kind==='dose-reserved'?1:0))errors.push('毒源剂量转换无效');
    if(prior){const expected=clone(prior);delete expected.hash;
     if(event.kind==='dose-reserved'){expected.remainingDoses--;if(!expected.remainingDoses)expected.status='depleted';}
     else if(event.kind==='minute-completed'){if(event.at!==prior.lastAdvancedAt+1||event.at>prior.expiresAt)errors.push('外部毒源只能按完整分钟推进');expected.lastAdvancedAt=event.at;}
     else if(event.kind==='expired'){if(prior.status!=='active'||prior.expiresAt===null||event.at<prior.expiresAt)errors.push('毒源不能提前到期');expected.status='expired';}
     else if(event.kind==='direct-use-ended'){if(!['apply-contact-drug','direct-spray'].includes(prior.carrier.kind)||event.at!==prior.createdAt)errors.push('直接施药结束无效');expected.status=expected.remainingDoses?'expired':'depleted';}
     else if(event.kind==='residency-changed'){const ids=new Set();for(const v of record.residents){const old=prior.residents.find(x=>x.targetId===v.targetId);if(ids.has(v.targetId)||!Number.isSafeInteger(v.enteredAt)||v.enteredAt>event.at||!Number.isSafeInteger(v.entryOrder)||v.entryOrder<1||old&&!same(old,v)||!old&&v.enteredAt!==event.at)errors.push('入区驻留时间或顺序无效');ids.add(v.targetId);}expected.residents=clone(record.residents);}
     const body={...record};delete body.hash;if(!same(expected,body))errors.push('毒源事件修改了未获准字段');}
    if(event.kind==='dose-reserved'){if(pending.has(event.exposure.id)||event.exposure.result!==null||event.exposure.doseId!==`${record.id}:dose:${record.totalDoses-record.remainingDoses}`)errors.push('剂量必须唯一预留');pending.set(event.exposure.id,event.exposure);}
    transitions.set(event.sourceId,record);
   }
   if(event.kind==='exposed'){const before=pending.get(event.exposure?.id);if(!before||!same(before.proof,event.exposure.proof)||!event.exposure.result)errors.push('暴露必须先保留剂量且只结算一次');pending.delete(event.exposure?.id);}
  }if(pending.size)errors.push('毒源账本存在未完成结算的剂量');
  const payments=new Set(),sourceIds=new Set();for(const r of db.sources){
   try{
   const m=a.medicineContract(r.skill.medicine),uses=db.exposures.filter(e=>e.sourceId===r.id),created=db.events.find(e=>e.sourceId===r.id&&e.kind==='released');
    if(!valid(r)||!same(r,latest.get(r.id))||!a.verify(r.skill).pass||r.originHash!==a.hash(origin(r))||r.route!==m.route||r.totalDoses!==m.doses||r.remainingDoses!==r.totalDoses-uses.length||!Number.isSafeInteger(r.remainingDoses)||r.remainingDoses<0||r.createdAt>now(s)||r.responsibleId!==r.skill.持有者单位ID||r.expiresAt!==(m.sourceDurationMinutes?r.createdAt+m.sourceDurationMinutes:null)||!created||created.at!==r.createdAt||created.payment?.items?.find(v=>v.itemId===r.itemProof.id)?.quantity!==1||r.itemProof.quantity<1||!same(globalThis.SoulWorldEngine.inspectItem(s,r.itemProof).skills.find(v=>v.id===r.skill.id),r.skill))throw Error('来源、剂量、支付或冻结药剂合同');
    if(sourceIds.has(r.id)||payments.has(r.payment?.operationId)||r.payment?.actorId!==r.responsibleId||r.payment?.skillId!==r.skill.id||r.id!==`poison:${r.payment?.operationId}`||r.blueprintHash!==a.hash(r.itemProof.payload?.activeSkill??{})||!INTENTS.includes(r.sourceIntent?.type)&&r.sourceIntent?.type!=='direct-medicine-use')throw Error('唯一付款与本次释放请求');sourceIds.add(r.id);payments.add(r.payment.operationId);
    const carrierShapes={'direct-oral':['oral',['kind','targetId','offerId']],serving:['oral',['kind','itemId','foodProof']],coating:['contact',['kind','itemId','itemProof']],'apply-contact-drug':['contact',['kind','targetId','check']],'direct-spray':['inhaled',['kind','targetId','check']],'daily-cloud':['inhaled',['kind','position']],'battle-cloud':['inhaled',['kind','battleId','center']]},shape=carrierShapes[r.carrier?.kind];
    if(!shape||r.route!==shape[0]||Object.keys(r.carrier).some(k=>!shape[1].includes(k))||!Number.isSafeInteger(r.lastAdvancedAt)||r.lastAdvancedAt<r.createdAt||r.lastAdvancedAt>now(s)||r.status==='active'&&r.expiresAt!==null&&r.expiresAt<=now(s)||r.status==='active'&&['daily-cloud','battle-cloud'].includes(r.carrier.kind)&&r.lastAdvancedAt!==now(s))throw Error('毒源载体、途径或当前时钟');
    const c=r.carrier;if(['direct-oral','apply-contact-drug','direct-spray'].includes(c.kind)&&!s.战斗单位.列表[c.targetId]||['serving','coating'].includes(c.kind)&&(!c.itemId||c.kind==='coating'&&(c.itemProof?.id!==c.itemId||c.itemProof.quantity!==1))||c.kind==='daily-cloud'&&(c.position?.kind!=='location'||!c.position.sceneId||!c.position.locationId)||c.kind==='battle-cloud'&&(!c.battleId||!Number.isFinite(c.center?.x)||!Number.isFinite(c.center?.y)))throw Error('真实载体字段');
    if(c.kind==='serving'){
      globalThis.SoulWorldEngine.supportFoodCarrier(s,c.foodProof,{atDay:Math.floor(r.createdAt/1440)});
      const fee=r.payment.items.find(v=>v.itemId===c.foodProof.id);
      if(r.sourceIntent.carrierItemId!==c.foodProof.id||!fee||fee.quantity!==1||fee.quantityBefore!==1||fee.quantityAfter!==0||c.itemId===c.foodProof.id)throw Error('污染食品缺少原食品真实付款');
    }
    const expectedIntent={serving:'prepare-poisoned-serving',coating:'coat-item','direct-oral':'direct-medicine-use','apply-contact-drug':'apply-contact-drug','direct-spray':'direct-spray','daily-cloud':'release-toxic-cloud','battle-cloud':'release-toxic-cloud'}[c.kind];if(r.sourceIntent.type!==expectedIntent||r.sourceIntent.itemId!==r.itemProof.id)throw Error('释放命令与实际载体');
    const p=r.payment,snapshot=r.releaseSnapshot,view=snapshot.attributeView;
    if(!same(created.payment,p)||r.itemProof.ownerEntityId!==r.responsibleId||p.items.find(v=>v.itemId===r.itemProof.id)?.quantityBefore!==r.itemProof.quantity||!same(p.contract,a.describe(r.skill,{soulPowerCost:p.totals.soulPower,modeId:p.contract.modeId||undefined}))||!Object.hasOwn(r,'usageLedger')||snapshot.unitProof?.id!==r.responsibleId||!view||snapshot.dc!==8+view.derived.熟练加值+Math.max(view.attributes.调整值.悟性,view.attributes.调整值.感知,view.attributes.调整值.意志)+Number(snapshot.unitProof.扩展?.武魂战斗修正?.检定加值?.魂技DC??0))throw Error('冻结付款或施用者强度');
    for(const [resource,key] of [['soulPower','魂力'],['health','生命']])if(p.resources.before[resource]-p.totals[resource]!==p.resources.after[resource])throw Error('真实资源付款差额');
    if(snapshot.version!==2)throw Error('施用者历史快照版本不受支持');
    const frame=globalThis.SoulHostCore.validateAttributeFrame(snapshot.hostFrame,r.responsibleId,r.createdAt);
    const equipment=Object.values(frame.装备.配置[r.responsibleId].slots??{}).filter(Boolean).map(id=>frame.物品.实例[id]);
    if(!same(snapshot.unitProof,frame.战斗单位.列表[r.responsibleId])||!same(snapshot.equipmentProofs,equipment)||!same(snapshot.controlProofs,controls.active(frame,r.responsibleId)))throw Error('施用者历史快照证据不一致');
    if(!same(view,globalThis.SoulCombatFoundation.battleAttributeView(frame,snapshot.unitProof)))throw Error('施用者属性快照');
    if(!same(snapshot.elementProfile,globalThis.SoulCombatFoundation.elementDamageProfile(frame,r.responsibleId,'毒蚀'))||!same(snapshot.outputPermission,controls.outputSnapshot(frame,r.responsibleId)))throw Error('冻结元素增幅或输出许可');
    if(!Number.isFinite(r.releaseSnapshot.dc)||!r.releaseSnapshot.elementProfile||!r.releaseSnapshot.outputPermission||!['active','depleted','expired'].includes(r.status)||r.status==='active'&&r.remainingDoses===0||r.status==='depleted'&&r.remainingDoses!==0)throw Error('毒源状态');
    for(const [i,e] of uses.entries())if(e.doseId!==`${r.id}:dose:${i+1}`)throw Error('剂量分配顺序');
   }catch(e){errors.push(`毒源${r.id}${e.message}无效`);}
  }
  const exposureKeys=new Set();
  for(const e of db.exposures){const r=source(s,e.sourceId),key=`${e.sourceId}:${e.targetId}:${e.at}`;
   if(!r||!valid(e)||!valid(e.proof)||!same(e,latestExposures.get(e.id))||e.proof.sourceHash!==r.originHash||e.proof.exposureId!==e.id||e.proof.targetId!==e.targetId||e.proof.sourceId!==e.sourceId||e.proof.doseId!==e.doseId||e.route!==r.route||e.proof.route!==e.route||e.proof.at!==e.at||e.at<r.createdAt||e.at>now(s)||exposureKeys.has(key)||!e.result||e.result.targetId!==e.targetId)errors.push('真实暴露及一剂一次结算证明无效');exposureKeys.add(key);
   const trigger=e.proof?.trigger,confirmation=db.events.find(v=>v.id===trigger?.eventId),body=trigger?Object.fromEntries(Object.entries(trigger).filter(([k])=>k!=='eventId')):null,c=r?.carrier;
   if(!confirmation||confirmation.kind!=='trigger-confirmed'||confirmation.sourceId!==r?.id||confirmation.targetId!==e.targetId||confirmation.route!==e.route||confirmation.at!==e.at||!same(confirmation.trigger,body))errors.push('暴露缺少真实触发事件');
   else if(c.kind==='serving'&&(body.kind!=='serving-swallowed'||body.itemId!==c.itemId||confirmation.carrierItemProof?.quantity!==1||confirmation.carrierItemProof?.payload?.poisonServing?.sourceId!==r.id||body.consumption?.itemId!==c.itemId||body.consumption?.quantity!==1||body.consumption?.quantityBefore!==1||body.consumption?.quantityAfter!==0))errors.push('独立污染食品的真实吞服无效');
   else if(c.kind==='coating'&&(body.kind!=='item-contact'||body.itemId!==c.itemId||!body.hit||confirmation.carrierItemProof?.id!==c.itemId))errors.push('涂层实际触碰无效');
   else if(c.kind==='direct-oral'&&(c.targetId!==e.targetId||body.itemId!==r.itemProof.id||!['direct-drug-swallowed','accepted-drug-swallowed'].includes(body.kind)))errors.push('口服来源或接受者无效');
   else if(['apply-contact-drug','direct-spray'].includes(c.kind)&&(body.kind!==c.kind||c.targetId!==e.targetId||!body.hit||!same(body.check,c.check)))errors.push('直接施药的真实命中无效');
   else if(['daily-cloud','battle-cloud'].includes(c.kind)){const reservation=db.events.findIndex(v=>v.kind==='dose-reserved'&&v.exposure?.id===e.id),before=db.events.slice(0,reservation).filter(v=>v.sourceId===r.id&&v.record).at(-1)?.record,resident=before?.residents.find(x=>x.targetId===e.targetId&&x.enteredAt===body.enteredAt&&x.entryOrder===body.entryOrder),entry=db.events.findIndex(v=>v.sourceId===r.id&&v.kind==='residency-changed'&&v.at===body.enteredAt&&v.record.residents.some(x=>x.targetId===e.targetId&&x.entryOrder===body.entryOrder));if(body.kind!=='cloud-residency'||!same(body.carrier,c)||!resident||entry<0||e.at!==before.lastAdvancedAt+1||db.events.slice(entry,reservation).some(v=>v.sourceId===r.id&&v.kind==='residency-changed'&&!v.record.residents.some(x=>same(x,resident)))||body.enteredAt>e.at-1||c.kind==='daily-cloud'&&!same(confirmation.positionProof.target,c.position)||c.kind==='battle-cloud'&&(!confirmation.positionProof.targetPoint||Math.hypot(confirmation.positionProof.targetPoint.x-c.center.x,confirmation.positionProof.targetPoint.y-c.center.y)>10))errors.push('雾区完整驻留证明无效');}
   if(body?.kind==='accepted-drug-swallowed'){const offer=db.offers.find(o=>o.id===body.offerId),accepted=db.events.find(v=>v.kind==='offer-response'&&v.offer?.id===body.offerId&&v.offer.status==='accepted');if(!offer||!accepted||accepted.at>e.at||offer.actorId!==r.responsibleId||offer.itemId!==r.itemProof.id||offer.targetId!==e.targetId||offer.ingestionId!==body.operationId||offer.status!=='swallowed'||c.offerId!==offer.id)errors.push('本人接受与本次真实吞服证明不一致');}
   try{globalThis.SoulCombatEngine.verifyReleasedMedicineChecks(s,e,confirmation);}catch(error){errors.push(`药效检定证明无效：${error.message}`);}
  }
  const offerIds=new Set();for(const offer of db.offers){const records=db.events.filter(e=>e.offer?.id===offer.id),initial=records[0]?.offer,last=records.at(-1)?.offer;if(!valid(offer)||offerIds.has(offer.id)||!same(offer,last)||!initial||initial.actorId!==offer.actorId||initial.targetId!==offer.targetId||initial.itemId!==offer.itemId||initial.claim!==offer.claim||!same(initial.check,offer.check)||!['pending','accepted','refused','inspected','swallowed','cancelled'].includes(offer.status)||offer.status==='swallowed'&&!db.exposures.some(e=>e.proof.trigger.offerId===offer.id&&e.targetId===offer.targetId))errors.push('伪装药物的本人回应或实际吞服来源无效');offerIds.add(offer.id);
   if(initial){const c=initial.check,operationId=offer.id.slice('drug-offer:'.length),attribute=initial.request.covert?'身法':'悟性';
    if(records[0].kind!=='offered'||offer.id!==`drug-offer:${initial.request.id}`||initial.status!=='pending'||c.die!==globalThis.SoulCombatEngine.makeRng(`${s.世界.seed}:drug-detection:${operationId}`).die(20)||c.attribute!==attribute||c.modifier!==c.actorView?.attributes?.调整值?.[attribute]||c.observer!==c.targetView?.attributes?.调整值?.感知||c.proficiency!==c.actorView?.derived?.熟练加值||c.observerProficiency!==c.targetView?.derived?.熟练加值||c.dc!==10+c.observer+Math.floor(c.observerProficiency/2)||c.total!==c.die+c.modifier+c.proficiency||c.detected!==(c.total<=c.dc)||initial.detected!==c.detected)errors.push('用途宣称缺少冻结的实际识破检定');
    let status='pending';for(const entry of records.slice(1)){const o=entry.offer;if(entry.kind==='offer-response'){if(status!=='pending'||!['accepted','refused','inspected'].includes(o.status)||o.respondedAt!==entry.at||!o.responseId)errors.push('药物回应不能冒用或重做');status=o.status;}else if(entry.kind==='offer-swallowed'){if(status!=='accepted'||o.status!=='swallowed'||o.swallowedAt!==entry.at||!db.exposures.some(e=>e.proof.trigger.offerId===o.id&&e.proof.trigger.operationId===o.ingestionId&&e.targetId===o.targetId))errors.push('接受与本人实际吞服来源无效');status='swallowed';}else if(entry.kind==='offer-invalidated'){if(!['pending','accepted'].includes(status)||o.status!=='cancelled'||o.cancelledAt!==entry.at)errors.push('药物宣称失效事件无效');status='cancelled';}else errors.push('药物回应事件无效');}
   }
  }
  for(const status of Object.values(s.状态实例?.列表??{}))if(status.扩展?.毒药来源&&!isToxicStatus(s,status)&&globalThis.SoulCombatFoundation.negativeStatus(status.模板ID,status.快照?.参数))errors.push('药效状态缺少对应真实暴露来源');
  return errors;
 }
  return Object.freeze({INTENTS,initialize,table,source,exposure,createReleasedSource,expose,touch,ingestServing,canSwallow,canConsumeOffer,isToxicStatus,syncResidents,nextAt,advanceAt,facts,validate,event,save,quote,execute});
});
