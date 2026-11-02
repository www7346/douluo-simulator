(function(root,factory){
 const get=(name,file)=>root?.[name]??(typeof require==='function'?require(file):null);
 const api=factory(get('SoulCustodyCore','./custody-core.js'),get('SoulPersonCore','./person-core.js'),get('SoulActionContext','./action-context-core.js'),get('SoulWorldSocial','./world-social-core.js'),get('SoulAbilityContract','./ability-contract-core.js'),get('SoulControlCore','./control-core.js'));
 if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulCustodyMarket=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(custody,people,actions,social,abilities,controls){
 'use strict';
 const clone=v=>JSON.parse(JSON.stringify(v)),same=(a,b)=>a===undefined||b===undefined?a===b:abilities.hash(a)===abilities.hash(b),now=s=>people.now(s);
 const INTENTS=Object.freeze(['propose-custody-transfer','respond-custody-transfer','cancel-custody-transfer','decide-custody-disposition']);
 const table=(s,create=false)=>{if(create)s.世界.custodyMarket??={version:1,offers:[],events:[]};return s.世界.custodyMarket??{version:1,offers:[],events:[]};};
 const offer=(s,id)=>table(s).offers.find(r=>r.id===id);
 const stamped=v=>{if(!v)return false;const {hash,...body}=v;return hash===abilities.hash(body);};
 function keys(v,allowed){if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!allowed.includes(k)))throw Error('交接包含未登记字段');}
 function normalize(q){
  const fields=q.type==='decide-custody-disposition'?['decisionKey','decision']:q.type==='propose-custody-transfer'?['targetId','buyerId','gold','expiresInMinutes','deviceTerms']:q.type==='respond-custody-transfer'?['offerId','accept','reason']:['offerId'];
  keys(q,['type','id','actorId',...fields]);return Object.fromEntries(['type','actorId',...fields].filter(k=>q[k]!==undefined).map(k=>[k,clone(q[k])]));
 }
 function wallet(s,id){const p=s.人物.列表[id],w=s.钱包.列表[p?.walletId];if(!w||w.ownerEntityId!==id)throw Error('缺少本人的实际钱包');return w;}
 function contact(s,sellerId,buyerId,targetId){
  const boundReason=custody.operationReason(s,targetId,'transfer');if(boundReason)throw Error(boundReason);
  if(new Set([sellerId,buyerId,targetId]).size!==3)throw Error('交接须为交出者、接收者和被押者三个实际人物');
  social.communicate(s,sellerId,buyerId);social.communicate(s,buyerId,sellerId);
  for(const id of [sellerId,buyerId]){const busy=globalThis.SoulWorldEngine?.worldActionBlockReason(s,{actorId:id});if(busy)throw Error(busy);actions.resolve(s,{actorId:id,battleId:null,targetIds:[targetId],requirements:['gesture']});if(custody.confined(s,id))throw Error('被看管者不能承接他人的看管责任');}
  people.assertAlive(s,targetId);if(actions.battleOf(s,targetId))throw Error('被押者仍在实际战斗');
  const position=actions.positionOf(s,targetId);if(position.kind!=='location'||position.sceneId)throw Error('请先带此人离开囚室并结束押送，到公共地点办理买卖或转交。');
  return position;
 }
 function deviceTerms(s,sellerId,targetId,input){
  if(!Array.isArray(input)||input.length>6||new Set(input.map(t=>t?.itemId)).size!==input.length)throw Error('须明确不超过六件且不重复的附属拘束器');
  return input.map(t=>{keys(t,['itemId','transferOwnership','transferControl']);
   const i=s.物品.实例[t.itemId];if(typeof t.transferOwnership!=='boolean'||typeof t.transferControl!=='boolean'||!t.transferOwnership&&!t.transferControl||!i?.attachment||i.attachment.wearerId!==targetId)throw Error('附属条款须指定实际佩戴的器具与交接范围');
   if(t.transferOwnership&&(i.ownerEntityId!==sellerId||i.legalOwnerEntityId!==sellerId||i.boundToEntityId))throw Error('不能出售本人不拥有或已绑定的拘束器');
   if(t.transferControl&&!i.attachment.controllers.includes(sellerId))throw Error('不能转交他人的装置控制权');
   return {...clone(t),before:clone(i)};
  });
 }
 function proof(s,r){return {participants:[r.sellerId,r.buyerId].map(id=>social.communicationProof(s,id)),targetPosition:clone(actions.positionOf(s,r.personId)),operatorRestrictions:Object.fromEntries([r.sellerId,r.buyerId].map(id=>[id,clone(controls.restrictions(s,id).blocked.gesture??[])]))};}
 function save(s,r,kind,sourceId,request,details={}){
  const db=table(s,true),previous=db.events.filter(e=>e.offerId===r.id).at(-1),old=offer(s,r.id);custody.stamp(r);
  if(old)Object.assign(old,r);else db.offers.push(r);
  const e=custody.stamp({id:`custody-trade:${sourceId}`,offerId:r.id,kind,sourceId,at:now(s),order:people.nextEventOrder(s),previousHash:previous?.hash??null,request:clone(request),record:clone(r),...clone(details)});
  if(db.events.some(v=>v.id===e.id))throw Error('交接请求编号已经使用');db.events.push(e);
  for(const id of [r.sellerId,r.buyerId]){const p=s.人物.列表[id];p.扩展??={};(p.扩展.看管交易??=[]).push({eventId:e.id,offerId:r.id,hash:e.hash});}
  return e;
 }
 const stages={pending:'报价已提出，等待买主答复。',rejected:'买主拒绝了这次交易。',completed:'交易完成，已按约定交人、交付拘束器并结清价款。',cancelled:'卖方已撤回报价。',expired:'原报价已到期。',invalidated:'关押情况或交易人物已变化，报价失效。'};
 function receipt(e){const r=e.record;return {type:'custody-trade',action:e.request?.type??'custody-trade-expired',offerId:r.id,eventId:e.id,actorId:e.request?.actorId??r.sellerId,sellerId:r.sellerId,buyerId:r.buyerId,targetId:r.personId,status:r.status,gold:r.gold,expiresAt:r.expiresAt,deviceTerms:r.deviceTerms.map(({before,...v})=>({...v,itemName:before.name})),settlement:r.settlement?{transferEventId:r.settlement.transferEventId,paidGold:r.gold,devices:clone(r.settlement.devices)}:null,summary:r.status==='completed'?`${r.gold>0?`成交，已支付${r.gold}金魂币并交人`:'已完成无偿转交'}${r.deviceTerms.length?'，拘束器已按约定移交':''}。`:stages[r.status]};}
 function replay(s,q,sourceId){if(q.type==='decide-custody-disposition')return replayDisposition(s,q,sourceId);const request=normalize(q),e=table(s).events.find(e=>e.sourceId===sourceId);if(!e)return null;if(!same(e.request,request))throw Error('交接请求编号不能替换原人物或条款');return receipt(e);}
 function invalidation(s,r){
  const ending=custody.table(s).events.find(e=>e.custodyId===r.authority.custodyId&&e.order>table(s).events.find(e=>e.offerId===r.id).order&&['custody-transferred','released','escaped','custody-death'].includes(e.type));
  if(ending)return {kind:'custody',eventId:ending.id};
  for(const id of [r.sellerId,r.buyerId,r.personId])if(s.人物.列表[id]?.life?.death)return {kind:'death',personId:id,deathId:s.人物.列表[id].life.death.id};
  return null;
 }
 function validInvalidation(s,e){const x=e.invalidation,r=e.record,first=table(s).events.find(v=>v.offerId===r.id);if(x?.kind==='custody'){const v=custody.table(s).events.find(v=>v.id===x.eventId);return !!v&&same(x,{kind:'custody',eventId:v.id})&&v.custodyId===r.authority.custodyId&&v.order>first.order&&v.order<e.order&&v.at<=e.at&&['custody-transferred','released','escaped','custody-death'].includes(v.type);}if(x?.kind==='death'){const d=s.人物.列表[x.personId]?.life?.death;return !!d&&[r.sellerId,r.buyerId,r.personId].includes(x.personId)&&d.id===x.deathId&&d.at<=e.at&&same(x,{kind:'death',personId:x.personId,deathId:d.id});}return false;}
 function responseReason(s,r){
  if(!r||r.status!=='pending')return '原交接报价没有等待回应';if(r.expiresAt<=now(s)||invalidation(s,r))return '原交接报价已经失效';
  const first=table(s).events.find(e=>e.offerId===r.id);if(!social.remembers(s,r.buyerId,first.at,[],first.order))return '本人目前无法记起原交接条款';
  try{contact(s,r.sellerId,r.buyerId,r.personId);}catch(e){return e.message;}return '';
 }
 function execute(s,q,sourceId,h){
  if(q.type==='decide-custody-disposition')return decideDisposition(s,q,sourceId,h);
  const request=normalize(q),prior=replay(s,q,sourceId);if(prior)return {receipt:prior,idempotent:true};
  let r,e;
  if(q.type==='propose-custody-transfer'){
   const position=contact(s,q.actorId,q.buyerId,q.targetId),record=custody.active(s,q.targetId);
   if(!record||record.custodianId!==q.actorId)throw Error('只有正在关押此人的人才能提出出售或转交。');
   if(record.arrangement!=='held-at-scene')throw Error('请先结束押送，或将此人带出囚室，再办理买卖或转交。');
   if(globalThis.SoulCustodyAuction?.activeFor(s,q.targetId))throw Error('这位人物正在公开竞拍，请先处理原拍卖');
   if(table(s).offers.some(r=>r.personId===q.targetId&&r.status==='pending'))throw Error('这位人物已有待回应报价，请先撤回或处理');
   const duration=q.expiresInMinutes??60;if(!Number.isSafeInteger(duration)||duration<1||duration>1440||!Number.isSafeInteger(q.gold)||q.gold<0||q.gold>1000000000)throw Error('价款须为0至十亿整数，报价有效期1至1440分钟');
   r={id:`custody-offer:${sourceId}`,sourceId,sellerId:q.actorId,buyerId:q.buyerId,personId:q.targetId,authority:custody.authorityRef(record),gold:q.gold,deviceTerms:deviceTerms(s,q.actorId,q.targetId,q.deviceTerms??[]),devicesAtQuote:clone(custody.attached(s,q.targetId)),position,createdAt:now(s),expiresAt:now(s)+duration,status:'pending',response:null,settlement:null};
   e=save(s,r,'proposed',sourceId,request,{proof:proof(s,r)});
  }else{
   const original=offer(s,q.offerId);if(!original)throw Error('原交接报价不存在');r=clone(original);
   if(q.type==='cancel-custody-transfer'){
    if(q.actorId!==r.sellerId||r.status!=='pending')throw Error('只能撤回本人未结束的报价');people.assertAlive(s,q.actorId);actions.resolve(s,{actorId:q.actorId,battleId:null});r.status='cancelled';e=save(s,r,'cancelled',sourceId,request);
   }else{
    if(q.actorId!==r.buyerId||typeof q.accept!=='boolean'||typeof q.reason!=='string'||!q.reason.trim()||q.reason.length>600)throw Error('须由原接收者明确接受或拒绝并说明理由');
    const reason=responseReason(s,r);if(reason)throw Error(reason);
    const physical=proof(s,r);r.response={accept:q.accept,reason:q.reason,sourceId,at:now(s)};
    if(q.accept){
     if(!custody.hasAuthority(s,r.sellerId,r.authority)||custody.active(s,r.personId).arrangement!=='held-at-scene'||!same(actions.positionOf(s,r.personId),r.position))throw Error('原权限或交接地点已经变化');
     if(!same(custody.attached(s,r.personId),r.devicesAtQuote))throw Error('报价时的实际拘束装配已经变化');
     const terms=deviceTerms(s,r.sellerId,r.personId,r.deviceTerms.map(({before,...v})=>v));if(!same(terms,r.deviceTerms))throw Error('报价后的拘束器配置、归属或控制权已经变化，请重新报价。');
     const from=wallet(s,r.buyerId),to=wallet(s,r.sellerId);if(from===to||from.id===to.id||!Number.isSafeInteger(from.gold)||!Number.isSafeInteger(to.gold)||from.gold<r.gold||!Number.isSafeInteger(to.gold+r.gold))throw Error('接收者实际钱币不足或收款超限');
     const payment={fromWalletId:from.id,toWalletId:to.id,gold:r.gold,before:{buyer:from.gold,seller:to.gold},after:{buyer:from.gold-r.gold,seller:to.gold+r.gold}};
     const delivery=handoff(s,r,sourceId);
     from.gold=payment.after.buyer;to.gold=payment.after.seller;
     r.settlement={...delivery,payment};r.status='completed';
    }else r.status='rejected';
    e=save(s,r,r.status,sourceId,request,{proof:physical});
   }
  }
  return {receipt:receipt(e),idempotent:false};
 }
 function handoff(s,r,sourceId){
  contact(s,r.sellerId,r.buyerId,r.personId);
  if(!custody.hasAuthority(s,r.sellerId,r.authority)||custody.active(s,r.personId).arrangement!=='held-at-scene'||!same(actions.positionOf(s,r.personId),r.position)||!same(custody.attached(s,r.personId),r.devicesAtQuote))throw Error('原看管、位置或实际拘束装配已经变化');
  if(!same(deviceTerms(s,r.sellerId,r.personId,r.deviceTerms.map(({before,...v})=>v)),r.deviceTerms))throw Error('约定中的拘束器归属或控制权已经变化，请重新报价。');
  const c=custody.active(s,r.personId);c.custodianId=r.buyerId;c.authorityVersion++;c.authorityEventId=`custody-event:${sourceId}:custody-transferred:${r.personId}`;custody.stamp(c);
  const transfer=custody.event(s,'custody-transferred',r.sellerId,r.personId,sourceId,{custodyId:c.id,offerId:r.id,previousAuthority:r.authority,authority:custody.authorityRef(c)});
  const devices=r.deviceTerms.map((term,index)=>custody.transferDeviceRights(s,{...term,sellerId:r.sellerId,buyerId:r.buyerId,targetId:r.personId,offerId:r.id,transferEventId:transfer.id},`${sourceId}:device:${index}`));
  return {transferEventId:transfer.id,devices};
 }
 function reconcileDeaths(s){advanceAt(s,true);}
 function advanceAt(s,invalidationsOnly=false){for(const original of table(s).offers.filter(r=>r.status==='pending')){const reason=invalidation(s,original);if(!reason&&(invalidationsOnly||original.expiresAt>now(s)))continue;const r=clone(original);r.status=reason?'invalidated':'expired';save(s,r,r.status,`${r.id}:${r.status}`,null,{invalidation:reason});}}
 function nextAt(s,through=Infinity){const times=table(s).offers.filter(r=>r.status==='pending'&&r.expiresAt<=through).map(r=>r.expiresAt);return times.length?Math.min(...times):null;}
 function facts(s,viewerId){return table(s).offers.filter(r=>[r.sellerId,r.buyerId].includes(viewerId)&&social.remembers(s,viewerId,r.createdAt,[],table(s).events.find(e=>e.offerId===r.id).order)).map(r=>({id:r.id,sellerId:r.sellerId,buyerId:r.buyerId,personId:r.personId,sellerName:s.人物.列表[r.sellerId].name,buyerName:s.人物.列表[r.buyerId].name,personName:s.人物.列表[r.personId].name,gold:r.gold,status:r.status,expiresAt:r.expiresAt,deviceTerms:r.deviceTerms.map(({before,...t})=>({...t,name:before.name})),response:r.response?{accept:r.response.accept,reason:r.response.reason}:null,responseReason:r.buyerId===viewerId?responseReason(s,r):'',canCancel:r.sellerId===viewerId&&r.status==='pending'}));}
 function options(s,viewerId){return Object.values(custody.table(s).byPerson).filter(r=>r.status==='held'&&r.custodianId===viewerId&&actions.colocated(s,viewerId,r.personId)).map(r=>({personId:r.personId,name:s.人物.列表[r.personId].name,devices:custody.attached(s,r.personId).map(i=>({itemId:i.id,name:i.name,canTransferOwnership:i.ownerEntityId===viewerId&&i.legalOwnerEntityId===viewerId&&!i.boundToEntityId,canTransferControl:i.attachment.controllers.includes(viewerId)})),buyers:Object.values(s.人物.列表).filter(p=>![viewerId,r.personId].includes(p.id)&&actions.colocated(s,viewerId,p.id)).map(p=>{let reason='';try{contact(s,viewerId,p.id,r.personId);if(r.arrangement!=='held-at-scene')throw Error('请先出监或结束押送');}catch(e){reason=e.message;}return {id:p.id,name:p.name,reason};})}));}
 function validateTransfer(s,e,prior){
  const end=table(s).events.find(v=>v.offerId===e.offerId&&v.kind==='completed'),r=end?.record,a=e.authority;
  return !!(r&&stamped(end)&&end.sourceId===e.sourceId&&end.at===e.at&&end.order>e.order&&r.settlement?.transferEventId===e.id&&r.sellerId===e.actorId&&r.personId===e.targetId&&same(r.authority,prior.authority)&&same(e.previousAuthority,r.authority)&&a?.custodyId===r.authority.custodyId&&a.personId===r.personId&&a.custodianId===r.buyerId&&a.version===r.authority.version+1&&a.eventId===e.id);
 }
 function validateDeviceTransfer(s,e){const end=table(s).events.find(v=>v.offerId===e.offerId&&v.kind==='completed'),r=end?.record,index=r?.settlement?.devices.findIndex(d=>d.eventId===e.id),t=r?.deviceTerms[index];return !!(t&&e.sourceId===`${end.sourceId}:device:${index}`&&e.at===end.at&&e.order<end.order&&e.actorId===r.sellerId&&e.targetId===r.personId&&e.buyerId===r.buyerId&&e.transferEventId===r.settlement.transferEventId&&e.itemId===t.itemId&&same(e.previousAttachment,t.before.attachment)&&same(e.ownership,{before:{owner:t.before.ownerEntityId,legalOwner:t.before.legalOwnerEntityId},after:{owner:t.transferOwnership?r.buyerId:t.before.ownerEntityId,legalOwner:t.transferOwnership?r.buyerId:t.before.legalOwnerEntityId}})&&same(e.terms,{transferOwnership:t.transferOwnership,transferControl:t.transferControl}));}

 // A completed personal decision is anchored to an actual custody/arrival event.
 // Pending work is derived, not a second queue or a periodic global scan of motives.
 const decisions=s=>table(s).decisionEvents??[];
 function dispositionOrigin(s,authority,beforeOrder=Infinity){
  return custody.table(s).events.filter(e=>e.custodyId===authority.custodyId&&e.targetId===authority.personId&&e.order<beforeOrder&&!e.sourceId.startsWith('npc-disposition-operation:')&&['captured','custody-transferred','custody-arranged'].includes(e.type)).at(-1);
 }
 function dispositionKey(authority,origin){return abilities.hash({authority,originEventId:origin.id,originHash:origin.hash});}
 function dispositionArrangementAt(s,authority,order=Infinity){return clone(custody.table(s).events.filter(e=>e.custodyId===authority.custodyId&&e.order<order&&e.type==='custody-arranged').at(-1)?.arrangement??'held-at-scene');}
 function dispositionSourceContext(s,authority,origin,order=Infinity){
  const arrangement=dispositionArrangementAt(s,authority,order),events=custody.table(s).events;
  if(['captured','custody-transferred','custody-arranged'].includes(origin?.type)&&arrangement==='held-at-scene'&&same(origin.authority,authority))return {scope:'disposition',scene:{kind:'scene'}};
  if(origin?.type==='logistics-escorts'&&origin.record?.status==='paused'&&arrangement?.kind==='escort'&&arrangement.escortId===origin.entityId&&origin.record.leaderId===authority.custodianId&&origin.record.custodyRefs.some(r=>same(r.authority,authority)))return {scope:'escort-blocked',scene:{kind:'escort',escortId:origin.entityId,eventId:origin.id,eventHash:origin.hash}};
  if(arrangement?.kind==='facility'&&origin?.type==='custody-arranged'&&same(origin.authority,authority)&&same(origin.arrangement,arrangement)){
   const f=events.filter(e=>e.type==='logistics-facilities'&&e.entityId===arrangement.facilityId&&e.order<order).at(-1);
   if(f?.record.operatorIds.includes(authority.custodianId))return {scope:'facility-care',scene:{kind:'facility',facilityId:arrangement.facilityId,cellId:arrangement.cellId,eventId:f.id,eventHash:f.hash}};
  }
  return null;
 }
 function dispositionEvent(s,id){return [...custody.table(s).events,...globalThis.SoulCooperationCore.table(s).events,...globalThis.SoulCooperationPreparation.table(s).events].find(e=>e.id===id);}
 function dispositionOtherSources(s,authority,order){
  const co=globalThis.SoulCooperationCore.table(s).events,ps=globalThis.SoulCooperationPreparation.table(s).events,ce=custody.table(s).events,candidates=[];
  const arrangement=dispositionArrangementAt(s,authority,order),facilityEvent=arrangement?.kind==='facility'?ce.filter(e=>e.type==='logistics-facilities'&&e.entityId===arrangement.facilityId&&e.order<order).at(-1):null;
  const scene=facilityEvent?{kind:'facility',facilityId:arrangement.facilityId,cellId:arrangement.cellId,eventId:facilityEvent.id,eventHash:facilityEvent.hash}:{kind:'contact'};
  if(arrangement?.kind==='escort')return [];
  const pairs=co.filter(e=>e.order<order&&e.record.leaderId===authority.custodianId&&e.record.memberId===authority.personId&&same(e.record.custodyAuthority,authority));
  const latest=pairs.at(-1);
  if(latest&&['accepted','imposed','renewed','rejected','suspended','ended'].includes(latest.kind))candidates.push({origin:latest,scope:'cooperation',scene});
  const preparationEvents=ps.filter(e=>e.order<order&&e.record.leaderId===authority.custodianId&&e.record.memberId===authority.personId&&same(e.record.custodyAuthority,authority));
  const prep=preparationEvents.at(-1);
  if(prep&&prep.record.status==='recovery-pending'){
   const recovery=preparationEvents.filter(e=>e.preparationId===prep.preparationId&&e.kind==='recovery-pending').at(-1);
   if(recovery)candidates.push({origin:recovery,scope:'recovery',scene});
   for(const origin of ce.filter(e=>e.order<order&&e.order>prep.order&&e.type==='restraint-permitted'&&e.permission.wearerId===authority.personId&&e.permission.operatorId===authority.custodianId&&prep.record.operations.some(o=>o.itemId===e.permission.itemId)))candidates.push({origin,scope:'recovery-permission',scene});
  }
  return candidates;
 }
 function dispositionCooperationChoices(s,r){
  if(r.scope==='escort-blocked')return [];
  const coop=globalThis.SoulCooperationCore,prep=globalThis.SoulCooperationPreparation,agreements=coop.table(s).agreements.filter(a=>a.leaderId===r.ownerId&&a.memberId===r.personId),current=agreements.filter(a=>['proposed','active','suspended'].includes(a.status)).at(-1),result=[];
  const duty=(custody.table(s).duties??[]).find(d=>d.personId===r.ownerId&&d.status==='active');
  if(!current&&!decisions(s).some(e=>e.personId===r.personId&&e.at===now(s)&&['propose-cooperation','impose-cooperation','renew-cooperation'].includes(e.decision.kind))){
   for(const basis of ['voluntary','coerced','controlled'])for(const membership of ['temporary','long-term'])for(const allowCombat of [false,true])result.push({kind:basis==='controlled'?'impose-cooperation':'propose-cooperation',basis,membership,durationMinutes:1440,allowTravel:true,allowCombat,dungeonId:'',dutyId:duty?.id??''});
  }
  if(current?.status==='suspended'&&!decisions(s).some(e=>e.personId===r.personId&&e.at===now(s)&&['propose-cooperation','impose-cooperation','renew-cooperation'].includes(e.decision.kind)))result.push({kind:'renew-cooperation',cooperationId:current.id,dutyId:duty?.id??''});
  if(current&&['active','suspended','proposed'].includes(current.status))result.push({kind:'end-cooperation',cooperationId:current.id});
  const unfinished=prep.table(s).records.filter(p=>p.leaderId===r.ownerId&&p.memberId===r.personId&&p.status!=='closed').at(-1);
  if(unfinished){
   if(['prepared','recovery-pending'].includes(unfinished.status))result.push({kind:'recover',preparationId:unfinished.id},{kind:'close-preparation',preparationId:unfinished.id});
  }else if(current?.status==='active'&&current.allowCombat){
   const devices=custody.attached(s,r.personId).filter(i=>i.durability>0&&i.attachment.controllers.includes(r.ownerId));
   for(const mode of ['released','escort','detached']){
    const ops=devices.filter(i=>mode==='detached'||custody.resolveDevice(i).modes[mode]).map(i=>({itemId:i.id,mode,returnMode:'locked'}));
    for(const deviceOperations of [...ops.map(op=>[op]),...(ops.length>1?[ops]:[])])result.push({kind:'prepare',cooperationId:current.id,deviceOperations});
    if(mode==='released'&&ops.some(op=>custody.DEVICES[s.物品.实例[op.itemId].templateId].autoRelock))result.push({kind:'prepare',cooperationId:current.id,deviceOperations:ops.map(op=>custody.DEVICES[s.物品.实例[op.itemId].templateId].autoRelock?{...op,relockAfterMinutes:60}:op)});
   }
  }
  return result;
 }
 const dispositionCooperationBusiness=d=>['propose-cooperation','impose-cooperation','renew-cooperation','end-cooperation','prepare','recover','close-preparation'].includes(d?.kind);
 function dispositionCooperationRequests(r,d){
  const actorId=r.ownerId,targetId=r.personId,scene=dispositionFacilityRequestScene(r),requests=[];
  if(['propose-cooperation','impose-cooperation','renew-cooperation'].includes(d.kind)){
   if(d.dutyId)requests.push({type:'end-custody-duty',actorId,dutyId:d.dutyId});
   if(scene.kind==='facility'){
    requests.push({type:'set-custody-cell-door',actorId,facilityId:scene.facilityId,cellId:scene.cellId,locked:false});
    requests.push({type:'withdraw-captive',actorId,facilityId:scene.facilityId,targetId});
   }
   if(d.kind==='renew-cooperation')requests.push({type:'resume-person-cooperation',actorId,cooperationId:d.cooperationId});
   else requests.push({type:d.kind==='impose-cooperation'?'impose-person-cooperation':'propose-person-cooperation',actorId,targetId,...(d.kind==='propose-cooperation'?{basis:d.basis}:{}),membership:d.membership,durationMinutes:d.durationMinutes,allowTravel:d.allowTravel,allowCombat:d.allowCombat,dungeonId:d.dungeonId});
  }else if(d.kind==='end-cooperation')requests.push({type:'end-person-cooperation',actorId,cooperationId:d.cooperationId,reason:'看管者本人结束本次合作'});
  else if(d.kind==='prepare')requests.push({type:'prepare-cooperation-battle',actorId,cooperationId:d.cooperationId,deviceOperations:d.deviceOperations});
  else requests.push({type:d.kind==='recover'?'recover-cooperation-restraints':'close-cooperation-preparation',actorId,preparationId:d.preparationId,...(d.kind==='close-preparation'?{reason:'看管者本人结束本次收束安排'}:{})});
  return requests;
 }
 function validateDispositionPreparationEvents(s,e,op,preparation,events){
  const r=preparation.record,used=new Set(),actions=[];
  const take=(sourceId,type,itemId)=>{
   const matches=events.filter(v=>v.sourceId===sourceId&&v.type===type&&v.itemId===itemId),v=matches[0];
   if(matches.length!==1||used.has(v.id)||v.actorId!==e.ownerId||v.targetId!==e.personId||v.at!==e.at||v.order>=preparation.order)throw Error('准备器具步骤缺少唯一实际来源');
   used.add(v.id);actions.push(v);return v;
  };
  if(op.request.type==='prepare-cooperation-battle')for(const o of r.operations){
   const v=take(o.sourceId,o.mode==='detached'?'restraint-detached':'restraint-mode-changed',o.itemId);
   if(!same(v.attachment,o.mode==='detached'?o.before:o.after)||o.mode!=='detached'&&v.mode!==o.mode)throw Error('准备器具操作与原明确模式不符');
   if(o.relockAfterMinutes!==undefined){
    const matches=events.filter(t=>t.type==='restraint-timer-set'&&t.sourceId===o.sourceId),t=matches[0];
    if(matches.length!==1||!same(t.timer,o.receipt.timer)||t.actorId!==e.ownerId||t.targetId!==e.personId||t.timer.itemId!==o.itemId||t.timer.dueAt!==e.at+o.relockAfterMinutes||t.order<=v.order||t.order>=preparation.order)throw Error('准备定时设定缺少原器具与期限');used.add(t.id);
   }
  }
  if(op.request.type==='recover-cooperation-restraints'){
   const previous=globalThis.SoulCooperationPreparation.table(s).events.filter(v=>v.preparationId===r.id&&v.order<preparation.order).at(-1);
   if(!previous)throw Error('收束缺少原准备来源');
   for(const a of r.attempts.slice(previous.record.attempts.length)){
    const o=r.operations.find(o=>o.itemId===a.itemId);if(!o)throw Error('收束器具不属于原准备');
    if(a.status==='failed')continue;
    if(a.status==='already-restored'){
     const v=take(a.sourceId,'restraint-recovery-checked',a.itemId);if(!same(v.attachment,a.attachment)||v.attachment.mode!==o.returnMode)throw Error('原器具复锁核对不符');
    }else{
     const type=a.receipt?.type;if(!['restraint-attached','restraint-mode-changed'].includes(type))throw Error('收束缺少实际装配或模式回执');
     const v=take(a.sourceId,type,a.itemId);if(v.attachment.mode!==(type==='restraint-attached'?'locked':o.returnMode))throw Error('收束实际模式不符');
     if(a.modeReceipt){if(type!=='restraint-attached'||a.modeReceipt.type!=='restraint-mode-changed')throw Error('额外收束模式缺少原装配');const changed=take(`${a.sourceId}:mode`,'restraint-mode-changed',a.itemId);if(changed.mode!==o.returnMode||!same(changed.attachment,a.attachment))throw Error('装配后模式收束不符');}
     else if(!same(v.attachment,a.attachment))throw Error('收束装配回执不符');
    }
   }
  }
  for(const v of events.filter(v=>v.type==='restraint-timer-ended')){
   const timer=(custody.table(s).deviceTimers??[]).find(t=>t.id===v.timerId),action=actions.find(a=>['restraint-mode-changed','restraint-detached'].includes(a.type)&&a.itemId===timer?.itemId&&v.sourceId===`${a.sourceId}:cancel:${timer.id}`);
   if(!timer||!action||timer.status!=='cancelled'||timer.endSourceId!==action.sourceId||v.status!=='cancelled'||v.actorId!==timer.actorId||v.targetId!==e.personId||timer.wearerId!==e.personId||v.at!==e.at||v.order>=action.order)throw Error('准备取消定时器缺少对应实际器具操作');used.add(v.id);
  }
  if(events.some(v=>!used.has(v.id)))throw Error('本人准备步骤带入未决定的器具事件');
 }
 function validateDispositionCooperationStep(s,e,op,co,pr,events){
  const q=op.request,sourceId=op.sourceId;
  if(['propose-person-cooperation','impose-person-cooperation','resume-person-cooperation','end-person-cooperation'].includes(q.type)){
   if(pr.length||co.length!==1||events.length)throw Error('实际合作步骤来源或带入无关器具事件');const v=co[0],r=v.record;
   if(v.sourceId!==sourceId||v.actorId!==e.ownerId||r.leaderId!==e.ownerId||r.memberId!==e.personId||!same(r.custodyAuthority,e.authority))throw Error('实际合作双方来源');
   if(['propose-person-cooperation','impose-person-cooperation'].includes(q.type)){
    if(r.id!==`cooperation:${sourceId}`||r.basis!==(q.type==='impose-person-cooperation'?'controlled':q.basis)||r.membership!==q.membership||r.allowTravel!==q.allowTravel||r.allowCombat!==q.allowCombat||r.dungeonId!==(q.dungeonId||null)||r.expiresAt!==(q.membership==='temporary'?e.at+q.durationMinutes:null)||v.kind!==(q.type==='impose-person-cooperation'?'imposed':'proposed'))throw Error('实际合作条款');
   }else if(r.id!==q.cooperationId||v.kind!==(q.type==='resume-person-cooperation'?'renewed':'ended'))throw Error('原合作续约或结束来源');
  }else if(['prepare-cooperation-battle','recover-cooperation-restraints','close-cooperation-preparation'].includes(q.type)){
   if(co.length||pr.length!==1)throw Error('实际准备步骤来源');const v=pr[0],r=v.record;
   if(v.sourceId!==sourceId||r.leaderId!==e.ownerId||r.memberId!==e.personId||!same(r.custodyAuthority,e.authority))throw Error('实际准备双方来源');
   if(q.type==='prepare-cooperation-battle'){
    const ops=r.operations.map(o=>({itemId:o.itemId,mode:o.mode,returnMode:o.returnMode,...(o.relockAfterMinutes===undefined?{}:{relockAfterMinutes:o.relockAfterMinutes})}));
    if(v.kind!=='prepared'||r.id!==`cooperation-preparation:${sourceId}`||r.cooperationId!==q.cooperationId||!same(ops,q.deviceOperations))throw Error('原明确战前操作来源');
   }else if(r.id!==q.preparationId||!(q.type==='recover-cooperation-restraints'?['recovered','recovery-attempted']:['closed']).includes(v.kind)||q.type==='close-cooperation-preparation'&&r.closeReason!==q.reason)throw Error('原准备收束来源');
   validateDispositionPreparationEvents(s,e,op,v,events);
  }else if(co.length||pr.length)throw Error('步骤带入无关合作来源');
 }
 function dispositionSources(s,authority,order=Infinity){
  const base=dispositionOrigin(s,authority,order),arrangement=dispositionArrangementAt(s,authority,order),events=custody.table(s).events;
  const candidates=base?[base]:[];
  if(arrangement?.kind==='escort'){
   const e=events.filter(e=>e.type==='logistics-escorts'&&e.entityId===arrangement.escortId&&e.order<order).at(-1);if(e?.record.status==='paused')candidates.push(e);
  }
  if(arrangement?.kind==='facility'){
   const admission=events.filter(e=>e.type==='custody-arranged'&&e.custodyId===authority.custodyId&&e.order<order&&same(e.arrangement,arrangement)).at(-1);if(admission)candidates.push(admission);
  }
  return [...candidates.map(origin=>({origin,...dispositionSourceContext(s,authority,origin,order)})).filter(r=>r.scope),...dispositionOtherSources(s,authority,order)].sort((a,b)=>a.origin.order-b.origin.order);
 }
 function dispositionSourceAt(s,authority,eventId,order){return dispositionSources(s,authority,order).find(r=>r.origin.id===eventId);}
 function dispositionPositionProof(s,r,p){
  if(r.scene.kind==='facility'){
   const e=custody.table(s).events.find(e=>e.id===r.scene.eventId),f=e?.record,cell=f?.cells.find(c=>c.id===r.scene.cellId);
   return !!(e&&e.hash===r.scene.eventHash&&f.operatorIds.includes(r.ownerId)&&p.person.position.kind==='location'&&p.person.position.locationId===f.locationId&&(!p.person.position.sceneId||r.scope!=='facility-care'&&p.person.position.sceneId===cell?.spaceId)&&p.targetPosition.kind==='location'&&p.targetPosition.locationId===f.locationId&&p.targetPosition.sceneId===cell?.spaceId);
  }
  return same(p.person.position,p.targetPosition)&&(r.scope==='escort-blocked'?['location','transit'].includes(p.person.position.kind):p.person.position.kind==='location'&&(r.scene.kind==='contact'||!p.person.position.sceneId));
 }
 function dispositionMedicalChoices(s,r,facts){
  if(r.scope==='escort-blocked')return [];
  const unit=s.战斗单位.列表[r.personId];if(!unit||unit.资源.生命.当前>=unit.资源.生命.最大)return [];
  const f=r.scene.kind==='facility'?facts.facilities.find(f=>f.id===r.scene.facilityId&&f.canManage&&f.present):null,c=f?.cells.find(c=>c.id===r.scene.cellId);
  if(r.scene.kind==='facility'&&!c)return [];
  const duty=facts.duties.find(d=>d.facilityId===f?.id&&d.status==='active'),base={kind:'treat',facilityId:f?.id??'',cellId:c?.id??'',returnLocked:c?.locked??false,dutyId:duty?.id??'',itemId:'',purchaseTemplateId:''};
  const inventory=s.人物.列表[r.ownerId].inventoryContainerId,items=Object.values(s.物品.实例).filter(i=>i.containerId===inventory&&i.ownerEntityId===r.ownerId&&i.templateId==='bandage'&&i.quantity>0);
  return [...items.map(i=>({...base,itemId:i.id})),{...base,purchaseTemplateId:'bandage'}];
 }
 function dispositionFacilityChoices(s,r,facts){
  if(r.scope==='escort-blocked')return [];
  const result=[],ownDuty=facts.duties.find(d=>d.status==='active'),at=facts.facilities.filter(f=>f.canManage&&f.present);
  if(r.scene.kind==='facility'){
   const f=at.find(f=>f.id===r.scene.facilityId);if(!f)return [];
   const base={kind:'care',facilityId:f.id,repair:false,guard:'keep',dutyId:''};
   if(f.condition<100||f.cells.some(c=>c.condition<100))result.push({...base,repair:true});
   if(!ownDuty)result.push({...base,guard:'self'});else if(ownDuty.facilityId===f.id)result.push({...base,guard:'end-self',dutyId:ownDuty.id});
   return result;
  }
  if(r.position.kind!=='location'||r.position.sceneId)return [];
  const offers=at.filter(f=>f.status==='active').flatMap(f=>f.cells.filter(c=>f.occupants.filter(o=>o.cellId===c.id).length<c.capacity).map(c=>({acquisition:'existing',facilityId:f.id,templateId:'',cellId:c.id})));
  if(facts.canAcquire)for(const templateId of Object.keys(globalThis.SoulCustodyLogistics.FACILITIES))offers.push({acquisition:'buy',facilityId:'',templateId,cellId:'cell-1'});
  for(const o of offers){const base={kind:'house',...o,locked:true,selfGuard:false};result.push(base,{...base,selfGuard:true});}
  return result;
 }
 function dispositionFacilityRequestScene(r){return r.scene??r.proof?.scene??{kind:'scene'};}
 function custodyBusinessEconomy(s,q){
  if(!['acquire-custody-facility','repair-custody-facility'].includes(q.type))return null;
  const person=s.人物.列表[q.actorId];
  return {actorWalletId:person.walletId,actorGold:s.钱包.列表[person.walletId].gold};
 }
 function validateCustodyBusinessEconomy(s,e,op,events){
  const q=op.request,economic=['acquire-custody-facility','repair-custody-facility'].includes(q.type);if(!economic){if(op.economy!==undefined)throw Error('多余财物结算');return;}
  const b=op.economy?.before,a=op.economy?.after;keys(op.economy,['before','after']);for(const x of [b,a]){keys(x,['actorWalletId','actorGold']);if(x.actorWalletId!==s.人物.列表[e.ownerId].walletId||!Number.isSafeInteger(x.actorGold)||x.actorGold<0)throw Error('本人财物快照');}
  const v=events.find(v=>v.type==='logistics-facilities'&&v.sourceId===op.sourceId),f=v?.record;if(!f)throw Error('财物缺少实际设施事件');
  if(q.type==='acquire-custody-facility'){
   if(b.actorGold-a.actorGold!==f.acquisition.price||f.acquisition.mode!==q.mode||f.templateId!==q.templateId)throw Error('置办付款');
  }else{
   const old=custody.table(s).events.find(x=>x.type==='logistics-facilities'&&x.entityId===f.id&&x.record.hash===v.previousHash)?.record,t=globalThis.SoulCustodyLogistics.FACILITIES[f.templateId],cost=old&&(100-old.condition+old.cells.reduce((n,c)=>n+100-c.condition,0))*t.repairRate;
   if(!old||cost<1||b.actorGold-a.actorGold!==cost)throw Error('实际修整付款');
  }
 }
 function pendingDispositions(s){
  return Object.values(custody.table(s).byPerson).flatMap(c=>{
   const ownerId=c.custodianId,authority=custody.authorityRef(c),source=dispositionSources(s,authority).at(-1),origin=source?.origin;
   if(c.status!=='held'||ownerId===s.角色.主控单位ID||!source||!custody.authorityAt(s,authority,ownerId,now(s),s.扩展.personEventSequence+1))return [];
   const key=dispositionKey(authority,origin);
   if(decisions(s).some(d=>d.key===key||same(d.authority,authority)&&dispositionEvent(s,d.originEventId)?.order>=origin.order||source.scope==='disposition'&&d.personId===c.personId&&d.at===now(s))||table(s).offers.some(r=>r.personId===c.personId&&r.status==='pending')||globalThis.SoulCustodyAuction?.activeFor(s,c.personId))return [];
   try{
    people.assertAlive(s,c.personId);
    const special=source.scope!=='disposition';
    if(!social.remembers(s,ownerId,special?now(s):origin.at,[],special?s.扩展.personEventSequence+1:origin.order)||custody.confined(s,ownerId)||globalThis.SoulWorldEngine?.worldActionBlockReason(s,{actorId:ownerId,allowArrangements:special})||globalThis.SoulRescueCore?.busyReason(s,ownerId))return [];
    if(special){const ownDuty=globalThis.SoulCustodyLogistics.facts(s,ownerId,{includeDestinations:false}).duties;for(const d of ownDuty)if(source.scope!=='facility-care'||d.facilityId!==source.scene.facilityId)return [];}
    const proof={person:social.communicationProof(s,ownerId),targetPosition:clone(actions.positionOf(s,c.personId))},r={key,ownerId,personId:c.personId,authority,originEventId:origin.id,originHash:origin.hash,position:clone(proof.person.position),scope:source.scope,scene:source.scene};
    if(!social.validCommunicationProof(s,proof.person,ownerId)||actions.battleOf(s,c.personId)||!dispositionPositionProof(s,r,proof))return [];
    actions.resolve(s,{actorId:ownerId,battleId:null,requirements:['gesture']});return [r];
   }catch{return [];}
  });
 }
 const dispositionBusiness=d=>['escort','release','house','care','treat','escort-operation','withdraw-and-escort'].includes(d?.kind)||dispositionCooperationBusiness(d);
 function dispositionEscortModes(s,r){return custody.attached(s,r.personId).filter(i=>i.attachment.controllers.includes(r.ownerId)&&i.attachment.mode!=='escort'&&custody.resolveDevice(i)?.capture&&custody.resolveDevice(i).modes.escort).map(i=>({itemId:i.id,mode:'escort'}));}
 function rawDispositionBusinessOptions(s,r,facts=globalThis.SoulCustodyLogistics.facts(s,r.ownerId)){
  const modes=dispositionEscortModes(s,r),options=[{kind:'release'}];
  if(r.scope==='escort-blocked')return ['resume','cancel'].map(action=>({kind:'escort-operation',escortId:r.scene.escortId,action,deviceModes:action==='resume'?modes:[]}));
  const duty=facts.duties.find(d=>d.facilityId===r.scene.facilityId&&d.status==='active');
  for(const route of facts.destinations)options.push({kind:r.scene.kind==='facility'?'withdraw-and-escort':'escort',...(r.scene.kind==='facility'?{facilityId:r.scene.facilityId,dutyId:duty?.id??''}:{}),destinationId:route.id,deviceModes:clone(modes)});
  return [...options,...dispositionMedicalChoices(s,r,facts),...dispositionFacilityChoices(s,r,facts),...dispositionCooperationChoices(s,r)];
 }
 function dispositionBusinessOptions(s,r,facts){
  return rawDispositionBusinessOptions(s,r,facts).filter(d=>globalThis.SoulWorldEngine.previewCustodyDisposition(s,{type:'decide-custody-disposition',actorId:r.ownerId,decisionKey:r.key,decision:{...d,reason:'本人实际行动条件预检'}}).available);
 }
 function businessRequests(r,d,sourceId){
  if(dispositionCooperationBusiness(d))return dispositionCooperationRequests(r,d);
  const actorId=r.ownerId,targetId=r.personId,scene=dispositionFacilityRequestScene(r),q=[];
  const step=(type,fields={})=>q.push({type,actorId,...fields});
  const modes=()=>d.deviceModes.forEach(m=>step('set-restraint-mode',{itemId:m.itemId,mode:m.mode}));
  if(d.kind==='treat'){
   if(d.dutyId)step('end-custody-duty',{dutyId:d.dutyId});
   if(d.purchaseTemplateId)step('buy-medical-supply',{templateId:d.purchaseTemplateId});
   if(d.facilityId){step('set-custody-cell-door',{facilityId:d.facilityId,cellId:d.cellId,locked:false});step('visit-custody-cell',{facilityId:d.facilityId,cellId:d.cellId});}
   step('use-restorative-item',{targetId,itemId:d.itemId});
   if(d.facilityId){step('visit-custody-cell',{facilityId:d.facilityId,cellId:''});step('set-custody-cell-door',{facilityId:d.facilityId,cellId:d.cellId,locked:d.returnLocked});}
   if(d.dutyId)step('assign-custody-guard',{facilityId:d.facilityId,targetId:actorId});
  }else if(d.kind==='house'){
   let facilityId=d.facilityId;if(d.acquisition!=='existing'){step('acquire-custody-facility',{templateId:d.templateId,mode:d.acquisition});facilityId=`facility:npc-disposition-operation:${sourceId}:0`;}
   step('set-custody-cell-door',{facilityId,cellId:d.cellId,locked:false});step('admit-captive',{facilityId,cellId:d.cellId,targetId});step('set-custody-cell-door',{facilityId,cellId:d.cellId,locked:d.locked});if(d.selfGuard)step('assign-custody-guard',{facilityId,targetId:actorId});
  }else if(d.kind==='care'){
   if(d.repair)step('repair-custody-facility',{facilityId:d.facilityId});if(d.guard==='self')step('assign-custody-guard',{facilityId:d.facilityId,targetId:actorId});if(d.guard==='end-self')step('end-custody-duty',{dutyId:d.dutyId});
  }else if(d.kind==='escort-operation'){
   modes();step(`${d.action}-custody-escort`,{escortId:d.escortId});
  }else{
   if(scene.kind==='facility'){
    if(d.kind==='withdraw-and-escort'&&d.dutyId)step('end-custody-duty',{dutyId:d.dutyId});
    step('set-custody-cell-door',{facilityId:scene.facilityId,cellId:scene.cellId,locked:false});step('withdraw-captive',{facilityId:scene.facilityId,targetId});
   }
   if(d.kind==='release')step('release-captive',{targetId});else{modes();step('start-custody-escort',{targetIds:[targetId],guardIds:[],destinationId:d.destinationId});}
  }
  if(q.length<1||q.length>8)throw Error('本次看管决定须含一至八个固定实际步骤');return q;
 }
 function dispositionAllowed(s,r,d){
  const {reason,...choice}=d;
  if(dispositionCooperationBusiness(d))return dispositionCooperationChoices(s,r).some(v=>same(v,choice));
  if(['escort','withdraw-and-escort'].includes(d.kind)){
   if(!globalThis.SoulWorldEngine.isLocationKnown(s,d.destinationId,r.ownerId)||!globalThis.SoulWorldEngine.locationAccess(s,d.destinationId,r.ownerId).pass||!same(d.deviceModes,dispositionEscortModes(s,r)))return false;
   if(d.kind==='escort')return r.scope==='disposition';
   const duty=globalThis.SoulCustodyLogistics.facts(s,r.ownerId,{includeDestinations:false}).duties.find(v=>v.facilityId===r.scene.facilityId&&v.status==='active');
   return r.scope==='facility-care'&&d.facilityId===r.scene.facilityId&&d.dutyId===(duty?.id??'');
  }
  if(d.kind==='release')return r.scope!=='escort-blocked';
  if(d.kind==='escort-operation')return r.scope==='escort-blocked'&&d.escortId===r.scene.escortId&&same(d.deviceModes,d.action==='resume'?dispositionEscortModes(s,r):[]);
  const facts=globalThis.SoulCustodyLogistics.facts(s,r.ownerId,{includeDestinations:false});return [...dispositionMedicalChoices(s,r,facts),...dispositionFacilityChoices(s,r,facts)].some(v=>same(v,choice));
 }
 function dispositionBusinessRecord(r,d,requests,sourceId){
  if(['propose-cooperation','impose-cooperation'].includes(d.kind))return `cooperation:npc-disposition-operation:${sourceId}:${requests.length-1}`;
  if(d.kind==='prepare')return `cooperation-preparation:npc-disposition-operation:${sourceId}:0`;
  if(['renew-cooperation','end-cooperation'].includes(d.kind))return d.cooperationId;
  if(['recover','close-preparation'].includes(d.kind))return d.preparationId;
  if(['escort','withdraw-and-escort'].includes(d.kind))return `escort:npc-disposition-operation:${sourceId}:${requests.length-1}`;
  if(d.kind==='escort-operation')return d.escortId;
  if(d.kind==='house')return d.acquisition==='existing'?d.facilityId:`facility:npc-disposition-operation:${sourceId}:0`;
  if(d.kind==='care')return d.facilityId;
  return r.authority.custodyId;
 }
 const dispositionLogisticsTypes=['acquire-custody-facility','repair-custody-facility','set-custody-cell-door','visit-custody-cell','admit-captive','withdraw-captive','assign-custody-guard','end-custody-duty','start-custody-escort','resume-custody-escort','cancel-custody-escort'];
 function executeDispositionBusiness(s,r,d,sourceId,h){
  if(!h?.logistics||!h?.custody)throw Error('看管行动缺少世界执行环境');
  if(!dispositionAllowed(s,r,d))throw Error('这不是本人实际已知的看管行动选项');
  const operations=[],requests=businessRequests(r,d,sourceId);let purchasedItemId='';
  for(const [index,request] of requests.entries()){
   const childSourceId=`npc-disposition-operation:${sourceId}:${index}`,first=custody.table(s).events.length,coFirst=globalThis.SoulCooperationCore.table(s).events.length,prepFirst=globalThis.SoulCooperationPreparation.table(s).events.length,before=custodyBusinessEconomy(s,request);
   let receipt;
   if(['buy-medical-supply','use-restorative-item'].includes(request.type)){
    if(!h.medical)throw Error('看管治疗缺少实际物品执行环境');
    if(request.type==='use-restorative-item'&&!request.itemId)request.itemId=purchasedItemId;
    const itemBefore=request.itemId?clone(s.物品.实例[request.itemId]):null;
    receipt=h.medical.settle(s,request,childSourceId);
    if(request.type==='buy-medical-supply')purchasedItemId=receipt.itemId;
    custody.event(s,request.type==='buy-medical-supply'?'medical-supply-bought':'captive-treated',r.ownerId,r.personId,childSourceId,{custodyId:r.authority.custodyId,authority:clone(r.authority),receipt:clone(receipt),itemBefore,itemAfter:request.itemId?clone(s.物品.实例[request.itemId]??null):null});
   }else if(request.type==='set-restraint-mode')receipt=custody.setDeviceMode(s,request,childSourceId,h.custody);
   else if(['propose-person-cooperation','impose-person-cooperation','resume-person-cooperation','end-person-cooperation'].includes(request.type))receipt=globalThis.SoulCooperationCore.execute(s,request,childSourceId,h.cooperation);
   else if(['prepare-cooperation-battle','recover-cooperation-restraints','close-cooperation-preparation'].includes(request.type))receipt=globalThis.SoulCooperationPreparation.execute(s,request,childSourceId,h.custody);
   else if(dispositionLogisticsTypes.includes(request.type))receipt=globalThis.SoulCustodyLogistics.execute(s,request,childSourceId,h.logistics);
   else if(request.type==='release-captive'){
    if(globalThis.SoulCustodyLogistics.barrier(s,custody.active(s,r.personId)??{}))throw Error('须先实际开门再放行');
    receipt=custody.release(s,request,childSourceId,h.custody);
   }else throw Error('未登记的本人看管业务');
   const economy=before?{before,after:custodyBusinessEconomy(s,request.type==='acquire-custody-facility'?{...request,facilityId:`facility:${childSourceId}`}:request)}:undefined;
   const cooperationRefs=globalThis.SoulCooperationCore.table(s).events.slice(coFirst).map(e=>({id:e.id,hash:e.hash})),preparationRefs=globalThis.SoulCooperationPreparation.table(s).events.slice(prepFirst).map(e=>({id:e.id,hash:e.hash}));
   operations.push({sourceId:childSourceId,request,...(cooperationRefs.length?{cooperationRefs}:{}),...(preparationRefs.length?{preparationRefs}:{}),eventRefs:custody.table(s).events.slice(first).map(e=>({id:e.id,hash:e.hash})),...(economy?{economy}:{})});
  }
  return {kind:d.kind,recordId:dispositionBusinessRecord(r,d,requests,sourceId),operations};
 }
 function validateDispositionBusiness(s,e){
  const x=e.result,d=e.decision,started=e.proof.startedOrder,requests=businessRequests(e,d,e.sourceId);keys(x,['kind','recordId','operations']);
  if(!Number.isSafeInteger(started)||started<=0||started>=e.order||x.kind!==d.kind||!Array.isArray(x.operations)||x.operations.length!==requests.length||x.recordId!==dispositionBusinessRecord(e,d,requests,e.sourceId))throw Error('本人业务开始或固定步骤');
  let lastOrder=started;
  for(const [index,op] of x.operations.entries()){
   keys(op,['sourceId','request','eventRefs','economy','cooperationRefs','preparationRefs']);const q=requests[index],sourceId=`npc-disposition-operation:${e.sourceId}:${index}`;
   const events=custody.table(s).events.filter(v=>v.order<e.order&&(v.sourceId===sourceId||v.sourceId.startsWith(`${sourceId}:`)));
   if(q.type==='use-restorative-item'&&!q.itemId){const buy=x.operations.slice(0,index).find(op=>op.request.type==='buy-medical-supply'),v=buy&&custody.table(s).events.find(v=>v.sourceId===buy.sourceId&&v.type==='medical-supply-bought');q.itemId=v?.receipt.itemId??'';}
   const co=globalThis.SoulCooperationCore.table(s).events.filter(v=>v.order<e.order&&v.sourceId===sourceId),pr=globalThis.SoulCooperationPreparation.table(s).events.filter(v=>v.order<e.order&&v.sourceId===sourceId),combined=[...events,...co,...pr].sort((a,b)=>a.order-b.order);
   if(op.sourceId!==sourceId||!same(op.request,q)||!combined.length||!same(op.eventRefs,events.map(v=>({id:v.id,hash:v.hash})))||!same(op.cooperationRefs??[],co.map(v=>({id:v.id,hash:v.hash})))||!same(op.preparationRefs??[],pr.map(v=>({id:v.id,hash:v.hash})))||combined.some(v=>v.at!==e.at||v.order<=lastOrder||v.order>=e.order))throw Error('本人业务实际步骤来源');
   lastOrder=combined.at(-1).order;validateCustodyBusinessEconomy(s,e,op,events);validateDispositionCooperationStep(s,e,op,co,pr,events);
   if(co.length||pr.length)continue;
   if(['buy-medical-supply','use-restorative-item'].includes(q.type)){
    const v=events.find(v=>v.sourceId===sourceId&&v.type===(q.type==='buy-medical-supply'?'medical-supply-bought':'captive-treated')),receipt=v?.receipt;
    if(!v||v.actorId!==e.ownerId||v.targetId!==e.personId||v.custodyId!==e.authority.custodyId||!same(v.authority,e.authority)||receipt?.id!==sourceId)throw Error('治疗缺少实际物品步骤来源');
    if(q.type==='buy-medical-supply'){
     const original=s.远征?.processedTransactions?.[sourceId];
     if(!original||!same(original,receipt)||!stamped(receipt)||receipt.type!=='supply-bought'||receipt.buyerId!==e.ownerId||receipt.quantity!==1||receipt.templateId!==q.templateId||receipt.deliveries?.length!==1||receipt.deliveries[0].itemId!==receipt.itemId||receipt.deliveries[0].ownerId!==e.ownerId||receipt.deliveries[0].after-receipt.deliveries[0].before!==1||receipt.wallet.before-receipt.wallet.after!==receipt.totalGold||v.itemBefore!==null||v.itemAfter!==null)throw Error('药品缺少本人实际采购账本');
    }else{
     const before=v.itemBefore,after=v.itemAfter;
     if(receipt.type!=='field-item-used'||receipt.actorId!==e.ownerId||receipt.targetId!==e.personId||receipt.itemId!==q.itemId||!before||before.id!==q.itemId||before.templateId!=='bandage'||before.ownerEntityId!==e.ownerId||before.containerId!==s.人物.列表[e.ownerId].inventoryContainerId||!Number.isSafeInteger(before.quantity)||before.quantity<1||(before.quantity===1?after!==null:!after||after.id!==before.id||after.quantity!==before.quantity-1||after.ownerEntityId!==before.ownerEntityId||after.containerId!==before.containerId))throw Error('治疗缺少本人实际药品消耗');
     if(!receipt.actionStateBefore?.[e.personId]||receipt.targets?.length!==1||receipt.targets[0].targetId!==e.personId||!receipt.targets[0].effects.some(x=>x.effectId==='payload.heal'&&Number.isSafeInteger(x.amount)&&x.amount>=0))throw Error('治疗缺少真实恢复回执');
    }
   }else if(q.type==='set-restraint-mode'){
    const v=events.find(v=>v.sourceId===sourceId&&v.type==='restraint-mode-changed');
    if(!v||v.actorId!==e.ownerId||v.targetId!==e.personId||v.itemId!==q.itemId||v.mode!==q.mode||v.attachment.wearerId!==e.personId||!v.attachment.controllers.includes(e.ownerId))throw Error('押送模式操作来源');
   }else if(q.type==='start-custody-escort'){
    const v=events.find(v=>v.sourceId===sourceId&&v.type==='logistics-escorts'),r=v?.record;
    if(!r||v.actorId!==e.ownerId||r.id!==x.recordId||r.leaderId!==e.ownerId||r.status!=='travelling'||r.destinationId!==d.destinationId||!same(r.guardIds,[e.ownerId])||!same(r.personIds,[e.ownerId,e.personId])||!same(r.custodyRefs,[{personId:e.personId,custodyId:e.authority.custodyId,authority:e.authority}]))throw Error('实际押送合同来源');
   }else if(q.type==='release-captive'){
    const v=events.find(v=>v.sourceId===sourceId&&v.type==='released');
    if(!v||v.actorId!==e.ownerId||v.targetId!==e.personId||v.custodyId!==e.authority.custodyId||!same(v.authority,e.authority))throw Error('实际释放来源');
   }else{
    const v=events.find(v=>v.sourceId===sourceId&&v.type.startsWith('logistics-')),r=v?.record;if(!r||v.actorId!==e.ownerId)throw Error('实际设施或押送操作缺失');
    if(q.type==='acquire-custody-facility'){if(v.type!=='logistics-facilities'||r.id!==`facility:${sourceId}`||r.ownerId!==e.ownerId||r.templateId!==q.templateId||r.acquisition.mode!==q.mode)throw Error('取得设施来源');}
    else if(['assign-custody-guard','end-custody-duty'].includes(q.type)){if(v.type!=='logistics-duties'||r.personId!==e.ownerId||r.leaderId!==e.ownerId||q.type==='assign-custody-guard'&&(r.facilityId!==q.facilityId||r.status!=='active'||r.permissionId!==null||Object.hasOwn(r,'wage'))||q.type==='end-custody-duty'&&(r.id!==q.dutyId||r.status!=='ended'))throw Error('本人值守来源');}
    else if(['resume-custody-escort','cancel-custody-escort'].includes(q.type)){if(v.type!=='logistics-escorts'||r.id!==q.escortId||r.leaderId!==e.ownerId||r.status!==(q.type==='resume-custody-escort'?'travelling':'cancelled')||!r.custodyRefs.some(ref=>same(ref.authority,e.authority)))throw Error('本人押送操作来源');}
    else if(v.type!=='logistics-facilities'||r.id!==q.facilityId||!r.operatorIds.includes(e.ownerId)||v.reason!==q.type)throw Error('本人设施操作来源');
    if(['admit-captive','withdraw-captive'].includes(q.type)){const a=events.find(v=>v.type==='custody-arranged'&&v.targetId===e.personId);if(!a||!same(a.authority,e.authority)||!same(a.arrangement,q.type==='admit-captive'?{kind:'facility',facilityId:q.facilityId,cellId:q.cellId}:'held-at-scene'))throw Error('实际入监出监来源');}
    if(q.type==='set-custody-cell-door'&&r.cells.find(c=>c.id===q.cellId)?.locked!==q.locked)throw Error('实际房门操作');
   }
  }
 }
 function dispositionOperationEventOwned(v,e){
  if(!dispositionBusiness(e.decision))return false;
  if(e.result?.operations?.some(op=>[...(op.eventRefs??[]),...(op.cooperationRefs??[]),...(op.preparationRefs??[])].some(ref=>same(ref,{id:v.id,hash:v.hash}))))return true;
  const op=e.result?.operations?.find(op=>['start-custody-escort','resume-custody-escort'].includes(op.request.type));
  return !!op&&v.order>e.order&&v.type==='logistics-escorts'&&v.entityId===e.result.recordId&&v.record?.id===e.result.recordId&&v.record.leaderId===e.ownerId&&['progress','blocked','arrived'].some(kind=>v.sourceId===`${op.sourceId}:${kind}:${v.at}`);
 }
 function dispositionOptions(s,key){
  const r=pendingDispositions(s).find(r=>r.key===key);if(!r)throw Error('没有这项尚未决定的实际看管处置');
  const all=options(s,r.ownerId).find(o=>o.personId===r.personId),voice=!controls.actionReason(s,r.ownerId,'speak');
  const businessFacts=globalThis.SoulCustodyLogistics.facts(s,r.ownerId),businessActions=dispositionBusinessOptions(s,r,businessFacts);
  return {...r,devices:all?.devices??[],buyers:voice&&r.scope==='disposition'?(all?.buyers??[]).filter(b=>!b.reason):[],canAuction:voice&&r.scope==='disposition'&&r.position.locationId===globalThis.SoulCustodyAuction?.VENUE,businessActions,businessContext:{facilities:businessFacts.facilities.filter(f=>f.present&&f.canManage),duties:businessFacts.duties,destinations:businessFacts.destinations.filter(v=>businessActions.some(d=>['escort','withdraw-and-escort'].includes(d.kind)&&d.destinationId===v.id))}};
 }
 function checkedDisposition(d){
  const fields=d?.kind==='retain'?['kind','reason']:d?.kind==='offer'?['kind','reason','buyerId','gold','expiresInMinutes','deviceTerms']:d?.kind==='auction'?['kind','reason','reserveGold','durationMinutes','deviceTerms']:d?.kind==='release'?['kind','reason']:d?.kind==='escort'?['kind','reason','destinationId','deviceModes']:d?.kind==='withdraw-and-escort'?['kind','reason','facilityId','dutyId','destinationId','deviceModes']:d?.kind==='house'?['kind','reason','acquisition','facilityId','templateId','cellId','locked','selfGuard']:d?.kind==='care'?['kind','reason','facilityId','repair','guard','dutyId']:d?.kind==='escort-operation'?['kind','reason','escortId','action','deviceModes']:['propose-cooperation','impose-cooperation'].includes(d?.kind)?['kind','reason','basis','membership','durationMinutes','allowTravel','allowCombat','dungeonId','dutyId']:d?.kind==='renew-cooperation'?['kind','reason','cooperationId','dutyId']:d?.kind==='end-cooperation'?['kind','reason','cooperationId']:d?.kind==='prepare'?['kind','reason','cooperationId','deviceOperations']:['recover','close-preparation'].includes(d?.kind)?['kind','reason','preparationId']:[];
  const registered=d?.kind==='treat'?['kind','reason','facilityId','cellId','returnLocked','dutyId','itemId','purchaseTemplateId']:fields;
  keys(d,registered);if(!registered.length||registered.some(k=>!Object.hasOwn(d,k))||typeof d.reason!=='string'||!d.reason.trim()||d.reason.length>600)throw Error('本人处置须明确登记业务及简短理由');
  if(d.kind==='treat'&&(['facilityId','cellId','dutyId','itemId','purchaseTemplateId'].some(k=>typeof d[k]!=='string')||typeof d.returnLocked!=='boolean'||Boolean(d.itemId)===Boolean(d.purchaseTemplateId)||d.purchaseTemplateId&&d.purchaseTemplateId!=='bandage'||Boolean(d.facilityId)!==Boolean(d.cellId)||!d.facilityId&&(d.returnLocked||d.dutyId)))throw Error('治疗须选择本人实际药品或一次合法采购及原牢房安排');
  if(['escort','withdraw-and-escort'].includes(d.kind)&&(typeof d.destinationId!=='string'||!d.destinationId||!Array.isArray(d.deviceModes)||d.deviceModes.length>6||new Set(d.deviceModes.map(m=>m.itemId)).size!==d.deviceModes.length||d.deviceModes.some(m=>!m||Object.keys(m).length!==2||typeof m.itemId!=='string'||!m.itemId||m.mode!=='escort')))throw Error('押送必须选择本人已知目的地和明确的步行装置模式');
  if(['house','care'].includes(d.kind)){
   if(typeof d.facilityId!=='string')throw Error('实际设施无效');
   if(d.kind==='house'&&(!['existing','buy'].includes(d.acquisition)||typeof d.locked!=='boolean'||typeof d.selfGuard!=='boolean'||typeof d.cellId!=='string'||typeof d.templateId!=='string'||(d.acquisition==='existing'?(!d.facilityId||d.templateId!==''):!!d.facilityId)))throw Error('取得或入住房间方式无效');
   if(d.kind==='care'&&(!d.facilityId||typeof d.repair!=='boolean'||!['keep','self','end-self'].includes(d.guard)||typeof d.dutyId!=='string'||(d.guard==='end-self'?!d.dutyId:!!d.dutyId)))throw Error('本人照料操作无效');
  }
  if(d.kind==='escort-operation'&&(typeof d.escortId!=='string'||!d.escortId||!['resume','cancel'].includes(d.action)||!Array.isArray(d.deviceModes)||d.action==='cancel'&&d.deviceModes.length))throw Error('本人暂停押送操作无效');
  if(['propose-cooperation','impose-cooperation'].includes(d.kind)&&(!['voluntary','coerced','controlled'].includes(d.basis)||(d.kind==='impose-cooperation')!==(d.basis==='controlled')||!['temporary','long-term'].includes(d.membership)||!Number.isSafeInteger(d.durationMinutes)||d.durationMinutes<1||d.durationMinutes>30*1440||typeof d.allowTravel!=='boolean'||typeof d.allowCombat!=='boolean'||!d.allowTravel&&!d.allowCombat||typeof d.dungeonId!=='string'||typeof d.dutyId!=='string'))throw Error('实际合作条款无效');
  if(['renew-cooperation','end-cooperation','prepare'].includes(d.kind)&&(typeof d.cooperationId!=='string'||!d.cooperationId)||d.kind==='renew-cooperation'&&typeof d.dutyId!=='string'||['recover','close-preparation'].includes(d.kind)&&(typeof d.preparationId!=='string'||!d.preparationId))throw Error('原合作或准备编号无效');
  if(d.kind==='prepare'){
   if(!Array.isArray(d.deviceOperations)||!d.deviceOperations.length||d.deviceOperations.length>6||new Set(d.deviceOperations.map(o=>o?.itemId)).size!==d.deviceOperations.length)throw Error('明确器具操作无效');
   for(const o of d.deviceOperations){keys(o,['itemId','mode','returnMode','relockAfterMinutes']);if(typeof o.itemId!=='string'||!o.itemId||!['released','escort','detached'].includes(o.mode)||!['locked','escort'].includes(o.returnMode)||o.relockAfterMinutes!==undefined&&(!Number.isSafeInteger(o.relockAfterMinutes)||o.relockAfterMinutes<1))throw Error('器具操作字段无效');}
  }
  return clone(d);
 }
 function dispositionRequest(r,d){
  return d.kind==='offer'?{type:'propose-custody-transfer',actorId:r.ownerId,targetId:r.personId,buyerId:d.buyerId,gold:d.gold,expiresInMinutes:d.expiresInMinutes,deviceTerms:d.deviceTerms}:d.kind==='auction'?{type:'start-asset-auction',actorId:r.ownerId,assetKind:'person',targetId:r.personId,reserveGold:d.reserveGold,deviceTerms:d.deviceTerms}:null;
 }
 function dispositionReceipt(e){const summary={retain:'决定继续关押。',offer:'已提出出售或无偿转交的报价，等待对方答复。',auction:'已将此人作为奴隶送往拍卖中心，等待排期开拍。',escort:'本人已开始沿实际路线押送，尚未到达目的地。',release:'已放此人离开。',house:'已安排好家宅囚室。',care:'已完成这次照料。',treat:'已用药治疗。剩余伤势与拘束可在人物状态中查看。','withdraw-and-escort':'本人已办理出监并开始实际押送。','escort-operation':'本人已处理原押送安排，保留实际行进位置。','propose-cooperation':'本人已当面提出实际合作，等待对方独立决定。','impose-cooperation':'已向对方下达合作安排。','renew-cooperation':'已处理这次续约请求。','end-cooperation':'本人已结束原合作，保留实际拘束与看管。',prepare:'已完成这次战前器具调整。',recover:'已完成这次复锁尝试，各件拘束器的结果见下方。','close-preparation':'本人结束原收束安排，未自动恢复器具。'};return {type:'custody-disposition-decided',decisionId:e.id,actorId:e.ownerId,targetId:e.personId,kind:e.decision.kind,result:dispositionBusiness(e.decision)?{kind:e.result.kind,recordId:e.result.recordId}:clone(e.result),summary:summary[e.decision.kind]};}
 function replayDisposition(s,q,sourceId){const e=decisions(s).find(e=>e.sourceId===sourceId);if(!e)return null;if(!same(e.request,normalize(q)))throw Error('处置请求编号不能替换原决定');return dispositionReceipt(e);}
 function decideDisposition(s,q,sourceId,h){
  const prior=replayDisposition(s,q,sourceId);if(prior)return {receipt:prior,idempotent:true};
  const r=pendingDispositions(s).find(r=>r.key===q.decisionKey),d=checkedDisposition(q.decision),request=normalize(q);if(!r)throw Error('没有这项尚未决定的实际看管处置');
  const marketOptions=options(s,r.ownerId).find(o=>o.personId===r.personId),voice=!controls.actionReason(s,r.ownerId,'speak');
  if(q.actorId!==r.ownerId)throw Error('处置须由原看管者独立决定');
  if(['offer','auction'].includes(d.kind)&&r.scope!=='disposition')throw Error('须先出监并结束押送，在公共地点交易');
  if(d.kind==='offer'&&(!voice||!(marketOptions?.buyers??[]).some(b=>b.id===d.buyerId&&!b.reason))||d.kind==='auction'&&(!voice||r.position.locationId!==globalThis.SoulCustodyAuction?.VENUE))throw Error('处置对象或拍卖场当前不可用');
  const proof={person:social.communicationProof(s,r.ownerId),gestureRestrictions:clone(controls.restrictions(s,r.ownerId).blocked.gesture??[]),targetPosition:clone(actions.positionOf(s,r.personId))};
  proof.scene=clone(r.scene);const business=dispositionBusiness(d);if(business||['offer','auction'].includes(d.kind))proof.startedOrder=people.nextEventOrder(s);
  const businessResult=business?executeDispositionBusiness(s,r,d,sourceId,h):null;
  const childRequest=dispositionRequest(r,d),childSourceId=`npc-disposition-child:${sourceId}`;
  const child=childRequest?(d.kind==='offer'?execute(s,childRequest,childSourceId):globalThis.SoulCommerceAuction.execute(s,childRequest,childSourceId)).receipt:null;
  const e=custody.stamp({id:`custody-decision:${sourceId}`,sourceId,key:r.key,ownerId:r.ownerId,personId:r.personId,authority:clone(r.authority),originEventId:r.originEventId,originHash:r.originHash,position:r.position,at:now(s),order:people.nextEventOrder(s),proof,request,decision:d,result:businessResult??(child?{kind:d.kind,sourceId:childSourceId,eventId:child.eventId,recordId:d.kind==='offer'?child.offerId:child.auctionId}:null)});
  (table(s,true).decisionEvents??=[]).push(e);
  (s.人物.列表[r.ownerId].扩展.看管处置??=[]).push({eventId:e.id,hash:e.hash});
  return {receipt:dispositionReceipt(e),idempotent:false};
 }
 function validateDispositions(s){
  const rows=table(s).decisionEvents,errors=[];if(rows!==undefined&&!Array.isArray(rows))return ['人物处置记录无效'];
  const keysSeen=new Set(),ids=new Set(),ticks=new Set();let lastOrder=0;
  for(const e of rows??[])try{
   keys(e,['id','sourceId','key','ownerId','personId','authority','originEventId','originHash','position','at','order','proof','request','decision','result','hash']);
   const d=checkedDisposition(e.decision),p=e.proof,started=dispositionBusiness(d)||['offer','auction'].includes(d.kind),authorityOrder=started?p?.startedOrder:e.order,source=dispositionSourceAt(s,e.authority,e.originEventId,authorityOrder),origin=source?.origin,tick=`${e.personId}:${e.at}`;
   if(!stamped(e)||typeof e.sourceId!=='string'||!e.sourceId||e.id!==`custody-decision:${e.sourceId}`||ids.has(e.id)||keysSeen.has(e.key)||source?.scope==='disposition'&&ticks.has(tick)||e.ownerId===s.角色.主控单位ID||e.personId!==e.authority.personId||!Number.isSafeInteger(e.at)||e.at>now(s)||!Number.isSafeInteger(e.order)||e.order<=lastOrder||e.order>s.扩展.personEventSequence)throw Error('决定来源或顺序');
   if(!origin||origin.id!==e.originEventId||origin.hash!==e.originHash||e.key!==dispositionKey(e.authority,origin)||!custody.authorityAt(s,e.authority,e.ownerId,e.at,authorityOrder))throw Error('原看管或实际到达来源');
   keys(p,['person','gestureRestrictions','targetPosition','scene',...(started?['startedOrder']:[])]);
   if(started&&(!Number.isSafeInteger(p.startedOrder)||p.startedOrder<=origin.order||p.startedOrder>=e.order))throw Error('缺少本人决定开始前的真实事件顺序');
   if(!social.validCommunicationProof(s,p.person,e.ownerId)||!Array.isArray(p.gestureRestrictions)||p.gestureRestrictions.length||!same(p.person.position,e.position)||!same(p.scene,source.scene)||!dispositionPositionProof(s,{...e,...source},p))throw Error('本人实际现场或身体条件');
   if(!same(normalize(e.request),{type:'decide-custody-disposition',actorId:e.ownerId,decisionKey:e.key,decision:d})||!same(normalize(e.request),e.request))throw Error('原本人请求');
   const q=dispositionRequest(e,d);
   if(dispositionBusiness(d)){validateDispositionBusiness(s,e);}
   else if(q){const x=e.result,db=d.kind==='offer'?table(s):globalThis.SoulCustodyAuction.table(s),child=db.events.find(v=>v.id===x?.eventId);
    if(!x||Object.keys(x).length!==4||x.kind!==d.kind||x.sourceId!==`npc-disposition-child:${e.sourceId}`||!child||child.sourceId!==x.sourceId||child.at!==e.at||child.order>=e.order||!same(child.request,q)||x.recordId!==(d.kind==='offer'?child.offerId:child.auctionId))throw Error('决定缺少原实际报价或开拍');
   }else if(e.result!==null)throw Error('保留决定不能附带交接');
   if((s.人物.列表[e.ownerId]?.扩展?.看管处置??[]).filter(a=>same(a,{eventId:e.id,hash:e.hash})).length!==1)throw Error('人物私有历史缺失');
   ids.add(e.id);keysSeen.add(e.key);if(source.scope==='disposition')ticks.add(tick);lastOrder=e.order;
  }catch(error){errors.push(`人物看管处置${e?.id}无效：${error.message}`);}
  for(const p of Object.values(s.人物.列表))for(const a of p.扩展?.看管处置??[])if(!(rows??[]).some(e=>e.ownerId===p.id&&same(a,{eventId:e.id,hash:e.hash})))errors.push('人物处置历史缺少永久来源');
  for(const e of [...table(s).events,...(globalThis.SoulCustodyAuction?.table(s).events??[])])if(e.sourceId.startsWith('npc-disposition-child:')&&!(rows??[]).some(d=>{
   if(d.result?.sourceId===e.sourceId&&d.result.eventId===e.id)return true;
   const child=globalThis.SoulCommerceAuction.table(s).events.find(v=>v.id===d.result?.eventId);
   return d.decision.kind==='auction'&&e.kind==='session-updated'&&e.sourceId===`${d.result?.sourceId}:session`&&e.sessionId===child?.sessionId&&e.session?.lotIds.includes(d.result.recordId);
  }))errors.push('主动报价或开拍缺少本人原决定');
  for(const v of [...custody.table(s).events,...globalThis.SoulCooperationCore.table(s).events,...globalThis.SoulCooperationPreparation.table(s).events])if(v.sourceId.startsWith('npc-disposition-operation:')&&!(rows??[]).some(e=>dispositionOperationEventOwned(v,e)))errors.push('本人看管业务缺少原独立决定');
  return errors;
 }

 function validate(s){
  const d=s.世界?.custodyMarket;if(!d)return [...(Object.values(s.人物.列表).some(p=>(p.扩展?.看管交易??[]).length)?['人物看管交易历史缺少永久账本']:[]),...validateDispositions(s)];if(d.version!==1||!Array.isArray(d.offers)||!Array.isArray(d.events))return ['看管交易账本无效'];
  const errors=[],latest=new Map(),seen=new Set(),records=new Set(),pending=new Set();let lastOrder=0;
  for(const e of d.events)try{
   keys(e,['id','offerId','kind','sourceId','at','order','previousHash','request','record','proof','invalidation','hash']);
   const old=latest.get(e.offerId),r=e.record;keys(r,['id','sourceId','sellerId','buyerId','personId','authority','gold','deviceTerms','devicesAtQuote','position','createdAt','expiresAt','status','response','settlement','hash']);
   if(!stamped(e)||!stamped(r)||seen.has(e.sourceId)||e.id!==`custody-trade:${e.sourceId}`||e.offerId!==r.id||e.previousHash!==(old?.hash??null)||!Number.isSafeInteger(e.at)||e.at>now(s)||old&&e.at<old.at||!Number.isSafeInteger(e.order)||e.order<=lastOrder||e.order>s.扩展.personEventSequence)throw Error('事件链');
   if(old){if(old.record.status!=='pending'||!['completed','rejected','cancelled','expired','invalidated'].includes(e.kind)||r.status!==e.kind)throw Error('阶段');for(const k of ['id','sourceId','sellerId','buyerId','personId','authority','gold','deviceTerms','devicesAtQuote','position','createdAt','expiresAt'])if(!same(r[k],old.record[k]))throw Error('冻结条款被改写');}
   else if(e.kind!=='proposed'||r.status!=='pending'||r.id!==`custody-offer:${e.sourceId}`||r.sourceId!==e.sourceId||r.createdAt!==e.at||r.authority?.personId!==r.personId||!custody.authorityAt(s,r.authority,r.sellerId,e.at,e.order)||new Set([r.sellerId,r.buyerId,r.personId]).size!==3||!Number.isSafeInteger(r.gold)||r.gold<0||r.gold>1000000000||!Number.isSafeInteger(r.expiresAt)||r.expiresAt<=r.createdAt||r.expiresAt-r.createdAt>1440||r.position?.kind!=='location'||r.position.sceneId||!Array.isArray(r.deviceTerms)||r.deviceTerms.length>6||new Set(r.deviceTerms.map(t=>t.itemId)).size!==r.deviceTerms.length)throw Error('原报价');
   if(!Array.isArray(r.devicesAtQuote)||r.devicesAtQuote.length>6||new Set(r.devicesAtQuote.map(i=>i.id)).size!==r.devicesAtQuote.length||r.devicesAtQuote.some(i=>!stamped(i.attachment)||i.attachment.wearerId!==r.personId))throw Error('报价时佩戴装配');
   for(const t of r.deviceTerms){keys(t,['itemId','transferOwnership','transferControl','before']);if(typeof t.transferOwnership!=='boolean'||typeof t.transferControl!=='boolean'||!t.transferOwnership&&!t.transferControl||t.before?.id!==t.itemId||!r.devicesAtQuote.some(i=>same(i,t.before))||!stamped(t.before?.attachment)||t.before.attachment.wearerId!==r.personId||t.transferOwnership&&(t.before.ownerEntityId!==r.sellerId||t.before.legalOwnerEntityId&&t.before.legalOwnerEntityId!==r.sellerId||t.before.boundToEntityId)||t.transferControl&&!t.before.attachment.controllers.includes(r.sellerId)||!custody.table(s).events.some(v=>v.itemId===t.itemId&&v.order<e.order&&same(v.attachment,t.before.attachment)))throw Error('附属装配与权益');}
   if(['proposed','completed','rejected'].includes(e.kind)){
    const p=e.proof;keys(p,['participants','targetPosition','operatorRestrictions']);if(p.participants?.length!==2||p.participants.some((v,i)=>!social.validCommunicationProof(s,v,[r.sellerId,r.buyerId][i],true)||!same(v.position,p.targetPosition)||!Array.isArray(p.operatorRestrictions?.[v.personId])||p.operatorRestrictions[v.personId].length)||e.kind!=='rejected'&&!same(p.targetPosition,r.position))throw Error('实际现场或身体条件');
   }else if(e.proof!==undefined)throw Error('多余现场证明');
   if(e.request){if(!same(normalize(e.request),e.request))throw Error('请求字段');const q=e.request;
    if(e.kind==='proposed'?(q.type!=='propose-custody-transfer'||q.actorId!==r.sellerId||q.targetId!==r.personId||q.buyerId!==r.buyerId||q.gold!==r.gold||(q.expiresInMinutes??60)!==r.expiresAt-r.createdAt||!same(q.deviceTerms??[],r.deviceTerms.map(({before,...v})=>v))):e.kind==='cancelled'?(q.type!=='cancel-custody-transfer'||q.actorId!==r.sellerId||q.offerId!==r.id):!['completed','rejected'].includes(e.kind)||q.type!=='respond-custody-transfer'||q.actorId!==r.buyerId||q.offerId!==r.id||q.accept!==(e.kind==='completed')||typeof q.reason!=='string'||!q.reason.trim()||q.reason.length>600||!same(r.response,{accept:q.accept,reason:q.reason,sourceId:e.sourceId,at:e.at})||e.at>=r.expiresAt)throw Error('请求与结果');
   }else if(!['expired','invalidated'].includes(e.kind)||e.sourceId!==`${r.id}:${e.kind}`)throw Error('自动终止来源');
   if(e.kind==='completed'){
    const x=r.settlement,p=x?.payment,transfer=custody.table(s).events.find(v=>v.id===x?.transferEventId);keys(x,['transferEventId','payment','devices']);keys(p,['fromWalletId','toWalletId','gold','before','after']);
    if(!transfer||!validateTransfer(s,transfer,{authority:r.authority})||p.fromWalletId!==s.人物.列表[r.buyerId].walletId||p.toWalletId!==s.人物.列表[r.sellerId].walletId||p.gold!==r.gold||Object.values(p.before).length!==2||Object.values(p.after).length!==2||![...Object.values(p.before),...Object.values(p.after)].every(v=>Number.isSafeInteger(v)&&v>=0)||p.before.buyer-p.after.buyer!==r.gold||p.after.seller-p.before.seller!==r.gold||x.devices.length!==r.deviceTerms.length||x.devices.some((v,i)=>v.itemId!==r.deviceTerms[i].itemId||!custody.table(s).events.some(e=>e.id===v.eventId&&validateDeviceTransfer(s,e))))throw Error('原子付款或交接');
   }else if(r.settlement!==null)throw Error('未成交却交付');
   if(!['completed','rejected'].includes(e.kind)&&r.response!==null)throw Error('无来源本人回应');
   if(e.kind==='expired'?(e.at!==r.expiresAt||e.invalidation!==null):e.kind==='invalidated'?!validInvalidation(s,e):e.invalidation!==undefined)throw Error('报价失效来源');
   for(const id of [r.sellerId,r.buyerId])if(!(s.人物.列表[id]?.扩展?.看管交易??[]).some(a=>same(a,{eventId:e.id,offerId:r.id,hash:e.hash})))throw Error('人物交易历史缺失');
   latest.set(r.id,e);seen.add(e.sourceId);lastOrder=e.order;
  }catch(error){errors.push(`看管交易${e?.id}无效：${error.message}`);}
  for(const r of d.offers){if(records.has(r.id)||!same(latest.get(r.id)?.record,r)||r.status==='pending'&&(pending.has(r.personId)||r.expiresAt<=now(s)||invalidation(s,r)))errors.push('当前看管报价与实际历史不符');records.add(r.id);if(r.status==='pending')pending.add(r.personId);}
  for(const id of latest.keys())if(!records.has(id))errors.push('看管交易历史缺少当前报价');
  for(const p of Object.values(s.人物.列表))for(const a of p.扩展?.看管交易??[])if(!d.events.some(e=>e.id===a.eventId&&e.offerId===a.offerId&&e.hash===a.hash&&[e.record.sellerId,e.record.buyerId].includes(p.id)))errors.push('人物看管交易历史缺少永久来源');
  return [...errors,...validateDispositions(s)];
 }
 return Object.freeze({pendingDispositions,dispositionOptions,INTENTS,table,offer,execute,replay,contact,deviceTerms,handoff,responseReason,nextAt,advanceAt,reconcileDeaths,facts,options,validate,validateTransfer,validateDeviceTransfer});
});
