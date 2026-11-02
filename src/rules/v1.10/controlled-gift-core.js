(function(root,factory){
 const get=(name,file)=>root?.[name]??(typeof require==='function'?require(file):null);
 const api=factory(get('SoulWorldSocial','./world-social-core.js'),get('SoulActionContext','./action-context-core.js'),get('SoulControlCore','./control-core.js'),get('SoulPersonCore','./person-core.js'),get('SoulAbilityContract','./ability-contract-core.js'),get('SoulCustodyCore','./custody-core.js'));
 if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulControlledGifts=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(social,actions,controls,people,abilities,custody){
 'use strict';
 const clone=v=>JSON.parse(JSON.stringify(v)),same=(a,b)=>a===undefined||b===undefined?a===b:abilities.hash(a)===abilities.hash(b),now=s=>people.now(s);
 const participants=(s,r)=>[r.playerId,r.personId].map(id=>social.communicationProof(s,id));
 const table=(s,create=false)=>{if(create)s.世界.controlledGifts??={version:1,events:[]};return s.世界.controlledGifts??{version:1,events:[]};};
 const all=s=>Object.values(s.人物.列表).flatMap(p=>p.扩展?.社交约定??[]);
 const records=s=>all(s).filter(r=>r.origin?.control);
 const record=(s,id)=>records(s).find(r=>r.id===id);
 const stamped=v=>{if(!v)return false;const {hash,...body}=v;return abilities.hash(body)===hash;};
 const expired=(s,r)=>now(s)>=(r.dueDay+1)*1440;
 const keys=(v,allowed)=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!allowed.includes(k)))throw Error('未登记的赠物字段');};
 function save(s,r,request,sourceId,proof={}){
  const db=table(s,true),previous=db.events.filter(e=>e.commitmentId===r.id).at(-1),event=r.events.at(-1);
  const e=custody.stamp({id:`gift-event:${sourceId}`,commitmentId:r.id,sourceId,kind:r.status,at:now(s),order:event.order,previousHash:previous?.hash??null,request:clone(request),record:clone(r),proof:clone(proof)});
  if(db.events.some(v=>v.id===e.id))throw Error('赠物事件编号已经使用');db.events.push(e);return e;
 }
 function receipt(e){return {type:e.kind==='pending'?'controlled-gift-proposed':e.kind==='completed'?'controlled-gift-completed':'controlled-gift-responded',actorId:e.request.actorId,commitmentId:e.commitmentId,eventId:e.id,status:e.kind,commitment:clone(e.record),...(e.kind==='pending'?{itemId:e.record.itemId}:{}),...(e.kind==='completed'?{delivery:clone(e.proof.delivery)}:{}),summary:e.kind==='pending'?'赠物提议已提出，等待对方回应。':e.kind==='completed'?'赠物已按约交付。':e.kind==='accepted'?'对方已接受赠物提议，可以按约交付。':'对方拒绝了赠物提议。'};}
 function control(s,ref,actorId){const o=s.世界.fieldControl?.orders.find(o=>o.id===ref?.orderId);if(!o||o.status!=='executing'||o.executorId!==actorId||o.sourceStatusId!==ref.sourceStatusId||o.issuerId!==ref.issuerId||o.executionId!==ref.executionId)throw Error('赠物缺少本次实际控制命令');return o;}
 function presentationProof(s,donorId,recipientId){return {mode:globalThis.SoulInfluenceCore.autonomy(s,donorId).canSpeak?'speech':'gesture',gestureBlocks:clone(controls.restrictions(s,donorId).blocked.gesture??[]),visible:actions.perception(s,recipientId,donorId,'vision')};}
 function quotePropose(s,q,sourceId,ref,h){
  const o=control(s,ref,q.actorId);if(o.action.type!=='propose-gift'||o.executionId!==sourceId)throw Error('赠物提议与命令不符');
  if(!Number.isSafeInteger(q.dueDay)||q.dueDay<s.世界.时间.day||q.dueDay>s.世界.时间.day+365)throw Error('赠物期限须为当前日至一年内的实际世界日');
  if(q.actorId===q.targetId)throw Error('赠物须指定另一位接收人');
  const presentation=presentationProof(s,q.actorId,q.targetId);
  if(presentation.mode==='gesture'){
   actions.resolve(s,{actorId:q.actorId,battleId:null,targetIds:[q.targetId],requirements:['gesture']});
   if(!presentation.visible||!social.validCommunicationProof(s,social.communicationProof(s,q.targetId),q.targetId))throw Error('接收人当前无法实际看见赠物出示');
  }else social.communicate(s,q.actorId,q.targetId);
  if(all(s).filter(r=>r.playerId===q.actorId&&r.status==='pending'&&!expired(s,r)).length>=3)throw Error('本人已有三项待回应约定，请先处理');
  const gift=h.preview({actorId:q.actorId,personId:q.targetId,itemId:q.itemId,quantity:q.quantity,promise:true}),id=`controlled-gift:${sourceId}`;if(all(s).some(r=>r.id===id))throw Error('赠物承诺编号已经使用');
  return {gift,id,presentation};
 }
 function propose(s,q,sourceId,ref,h){
  const {gift,id,presentation}=quotePropose(s,q,sourceId,ref,h);
  const r={id,kind:'give-item',playerId:q.actorId,personId:q.targetId,itemId:gift.itemId,itemName:gift.itemName,templateId:gift.templateId,quantity:gift.quantity,dueDay:q.dueDay,locationId:s.人物.列表[q.actorId].locationId,status:'pending',origin:{control:{issuerId:ref.issuerId,executorId:q.actorId,orderId:ref.orderId,sourceStatusId:ref.sourceStatusId}},events:[]};
  social.appendCommitmentEvent(s,r,'pending',sourceId,{actorId:q.actorId,reason:'受命提出此版赠物条款，等待接收人独立回应'});(s.人物.列表[q.targetId].扩展.社交约定??=[]).push(r);
  const proof={participants:participants(s,r),item:clone(s.物品.实例[q.itemId]),presentation};
  return receipt(save(s,r,{type:'propose-gift',actorId:q.actorId,targetId:q.targetId,itemId:q.itemId,quantity:q.quantity,dueDay:q.dueDay},sourceId,proof));
 }
 function responseReason(s,r){
  const voluntary=globalThis.SoulInfluenceCore.voluntaryReason(s,r?.personId);if(voluntary)return voluntary;
  if(!r||r.status!=='pending')return '这项赠物承诺没有等待回应';if(expired(s,r))return '这项赠物承诺已过期';
  const event=r.events[0];if(!social.remembers(s,r.personId,event.time.day*1440+event.time.hour*60+event.time.minute,event.memoryContexts[r.personId],event.order))return '本人目前无法记起这项赠物提议';
  try{social.communicate(s,r.personId,r.playerId);}catch(error){return error.message;}return '';
 }
 function respond(s,q,sourceId){
  if(typeof q.accept!=='boolean'||typeof q.reason!=='string'||!q.reason.trim()||q.reason.length>600)throw Error('须明确接受或拒绝，并给出本人理由');
  const request={type:'respond-controlled-gift',actorId:q.actorId,commitmentId:q.commitmentId,accept:q.accept,reason:q.reason},prior=table(s).events.find(e=>e.sourceId===sourceId);
  if(prior){if(!same(prior.request,request))throw Error('赠物回应编号不能替换请求');return {receipt:receipt(prior),idempotent:true};}
  const r=record(s,q.commitmentId);if(!r||r.personId!==q.actorId)throw Error('只能由原接收人回应赠物');const reason=responseReason(s,r);if(reason)throw Error(reason);
  social.appendCommitmentEvent(s,r,q.accept?'accepted':'rejected',sourceId,{actorId:q.actorId,reason:q.reason});
  const e=save(s,r,request,sourceId,{participants:participants(s,r)});(s.人物.列表[r.personId].扩展.受赠回应??=[]).push({eventId:e.id,sourceId,commitmentId:r.id,hash:e.hash});
  return {receipt:receipt(e),idempotent:false};
 }
 function quoteFulfill(s,q,sourceId,ref,h){
  const o=control(s,ref,q.actorId),r=record(s,q.commitmentId),origin=r?.origin.control;
  if(o.action.type!=='fulfill-gift'||o.executionId!==sourceId||!r||r.playerId!==q.actorId||r.status!=='accepted'||expired(s,r))throw Error('只有原赠送者能履行尚未过期的已接受承诺');
  if(origin.issuerId!==ref.issuerId||origin.executorId!==q.actorId||origin.sourceStatusId!==ref.sourceStatusId)throw Error('这项赠物承诺的原控制来源已经失效，不能用新的控制续用');
  const gift=h.preview({actorId:q.actorId,personId:r.personId,itemId:r.itemId,quantity:r.quantity});if(gift.templateId!==r.templateId)throw Error('原承诺物品已经变化');
  if(!social.validCommunicationProof(s,social.communicationProof(s,r.personId),r.personId)||controls.restrictions(s,r.personId).blocked.gesture?.length)throw Error('接收人目前无法实际接收');
  return {gift,r};
 }
 function quote(s,q,sourceId,ref,h){
  if(q.type==='propose-gift')return quotePropose(s,q,sourceId,ref,h).gift;
  if(q.type==='fulfill-gift')return quoteFulfill(s,q,sourceId,ref,h).gift;
  throw Error('这里只查询受控赠物的实际条款');
 }
 function fulfill(s,q,sourceId,ref,h){
  const {gift,r}=quoteFulfill(s,q,sourceId,ref,h);
  const before=clone(s.物品.实例[r.itemId]),delivered=h.transfer(gift.itemId,gift.destinationId,gift.quantity);
  if(!delivered.legalOwnerEntityId||delivered.legalOwnerEntityId===r.playerId)delivered.legalOwnerEntityId=r.personId;delivered.stolen=!!delivered.legalOwnerEntityId&&delivered.legalOwnerEntityId!==r.personId;
  const delivery={itemId:before.id,deliveredItemId:delivered.id,templateId:before.templateId,quantity:gift.quantity,donorId:r.playerId,recipientId:r.personId,fromContainerId:before.containerId,toContainerId:delivered.containerId,quantityBefore:before.quantity,remainingQuantity:before.id===delivered.id?0:s.物品.实例[before.id]?.quantity??0,deliveredQuantity:delivered.quantity};
  social.appendCommitmentEvent(s,r,'completed',sourceId,{actorId:q.actorId,quantity:gift.quantity,deliveredItemId:delivered.id});
  return receipt(save(s,r,{type:'fulfill-gift',actorId:q.actorId,commitmentId:r.id},sourceId,{fieldOrderRef:clone(ref),participants:participants(s,r),itemBefore:before,delivery}));
 }
 function advanceAt(s){for(const r of records(s))if(['pending','accepted'].includes(r.status)&&expired(s,r)){const sourceId=`gift-expiry:${r.id}`;social.appendCommitmentEvent(s,r,'expired',sourceId,{reason:'约定期限已过，没有自动交付'});save(s,r,{type:'expire-controlled-gift',commitmentId:r.id},sourceId);}}
 function nextAt(s,through){const times=records(s).filter(r=>['pending','accepted'].includes(r.status)).map(r=>(r.dueDay+1)*1440).filter(t=>t<=through);return times.length?Math.min(...times):null;}
 function facts(s,viewerId){return records(s).filter(r=>[r.playerId,r.personId].includes(viewerId)&&social.remembers(s,viewerId,0,r.events[0].memoryContexts[viewerId],r.events[0].order)).map(r=>({id:r.id,donorId:r.playerId,donorName:s.人物.列表[r.playerId].name,recipientId:r.personId,recipientName:s.人物.列表[r.personId].name,itemId:r.itemId,itemName:r.itemName,templateId:r.templateId,quantity:r.quantity,dueDay:r.dueDay,status:r.status,...(viewerId===r.personId?{responseReason:responseReason(s,r)}:{}),events:r.events.filter(e=>social.remembers(s,viewerId,0,e.memoryContexts?.[viewerId]??[],e.order)).map(e=>({status:e.status,actorId:e.actorId,time:clone(e.time),reason:e.status==='pending'?'提出此版赠物条款，尚待本人回应':e.reason??''}))}));}
 function validate(s){
  const db=table(s),errors=[],latest=new Map(),sources=new Set(),sequences=new Set(),fieldOrders=s.世界.fieldControl?.orders??[];
  if(db.version!==1||!Array.isArray(db.events)||Object.keys(db).some(k=>!['version','events'].includes(k)))return ['受控赠物账本无效'];
  for(const e of db.events)try{
   const r=e.record,q=e.request,prior=latest.get(e.commitmentId),original=prior?.record??r,origin=r.origin?.control,event=r.events.at(-1),order=fieldOrders.find(o=>o.id===origin?.orderId);
   keys(e,['id','commitmentId','sourceId','kind','at','order','previousHash','request','record','proof','hash']);
   keys(r,['id','kind','playerId','personId','itemId','itemName','templateId','quantity','dueDay','locationId','status','origin','events']);keys(r.origin,['control']);
   keys(event,['status','sourceId','revision','time','order','memoryContexts',...(e.kind==='completed'?['actorId','quantity','deliveredItemId']:e.kind==='expired'?['reason']:['actorId','reason'])]);
   keys(event.time,['day','hour','minute']);keys(event.memoryContexts,[r.playerId,r.personId]);
   keys(e.proof,e.kind==='pending'?['participants','item','presentation']:e.kind==='completed'?['fieldOrderRef','participants','itemBefore','delivery']:e.kind==='expired'?[]:['participants']);
   if(e.kind==='completed')keys(e.proof.delivery,['itemId','deliveredItemId','templateId','quantity','donorId','recipientId','fromContainerId','toContainerId','quantityBefore','remainingQuantity','deliveredQuantity']);
   if(!stamped(e)||e.id!==`gift-event:${e.sourceId}`||sources.has(e.sourceId)||e.commitmentId!==r.id||e.kind!==r.status||!Number.isSafeInteger(e.at)||e.at>now(s)||!Number.isSafeInteger(e.order)||e.order<1||e.order>s.扩展.personEventSequence||sequences.has(e.order)||e.previousHash!==(prior?.hash??null)||prior&&(e.at<prior.at||e.order<=prior.order)||!event||event.order!==e.order||people.now({世界:{时间:event.time}})!==e.at||event.sourceId!==e.sourceId||event.status!==e.kind)throw Error('事件来源');
   if(r.kind!=='give-item'||!s.人物.列表[r.playerId]||!s.人物.列表[r.personId]||r.playerId===r.personId||!origin||Object.keys(origin).some(k=>!['issuerId','executorId','orderId','sourceStatusId'].includes(k))||origin.executorId!==r.playerId||!order||order.status!=='executed'||order.action.type!=='propose-gift'||order.executorId!==r.playerId||order.issuerId!==origin.issuerId||order.sourceStatusId!==origin.sourceStatusId||order.receipt?.commitmentId!==r.id)throw Error('原控制提议');
   if(['id','kind','playerId','personId','itemId','itemName','templateId','quantity','dueDay','locationId','origin'].some(k=>!same(r[k],original[k]))||r.events.length!==(prior?.record.events.length??0)+1||!same(r.events.slice(0,-1),prior?.record.events??[]))throw Error('原条款被修改');
   if(!['pending','accepted','rejected','completed','expired'].includes(e.kind)||!prior&&e.kind!=='pending'||prior&&!({pending:['accepted','rejected','expired'],accepted:['completed','expired']}[prior.kind]??[]).includes(e.kind))throw Error('状态顺序');
   for(const id of [r.playerId,r.personId])if(!same(event.memoryContexts?.[id],social.masksAtOrder(s,id,e.order)))throw Error('发生时认知来源');
   if(e.kind==='pending'){
    const presentation=e.proof.presentation;keys(presentation,['mode','gestureBlocks','visible']);if(!['speech','gesture'].includes(presentation.mode)||!Array.isArray(presentation.gestureBlocks)||typeof presentation.visible!=='boolean'||presentation.mode==='gesture'&&(!presentation.visible||presentation.gestureBlocks.length))throw Error('实际无言出示条件');
    if(r.id!==`controlled-gift:${e.sourceId}`||order.executionId!==e.sourceId||!same(q,{type:'propose-gift',actorId:r.playerId,targetId:r.personId,itemId:r.itemId,quantity:r.quantity,dueDay:r.dueDay})||!same(order.action,{type:'propose-gift',targetId:r.personId,itemId:r.itemId,quantity:r.quantity,dueDay:r.dueDay})||!same(order.receipt, {...receipt(e),id:e.sourceId,transactionType:'受控赠物'}))throw Error('原提议结算');
    if(!Number.isSafeInteger(r.quantity)||r.quantity<1||!Number.isSafeInteger(r.dueDay)||r.dueDay<Math.floor(e.at/1440)||r.dueDay>Math.floor(e.at/1440)+365||e.proof.item?.id!==r.itemId||e.proof.item.templateId!==r.templateId||e.proof.item.ownerEntityId!==r.playerId||e.proof.item.quantity<r.quantity)throw Error('原物品或期限');
   }else if(['accepted','rejected'].includes(e.kind)){
    if(!same(q,{type:'respond-controlled-gift',actorId:r.personId,commitmentId:r.id,accept:e.kind==='accepted',reason:event.reason})||event.actorId!==r.personId||typeof event.reason!=='string'||!event.reason.trim()||event.reason.length>600||e.at>=(r.dueDay+1)*1440||event.memoryContexts[r.personId].some(id=>s.扩展.cognitionChanges[id].appliedOrder>=r.events[0].order))throw Error('本人回应');
    if(!(s.人物.列表[r.personId].扩展.受赠回应??[]).some(v=>same(v,{eventId:e.id,sourceId:e.sourceId,commitmentId:r.id,hash:e.hash})))throw Error('接收人原回应来源');
   }else if(e.kind==='completed'){
    const ref=e.proof.fieldOrderRef,o=fieldOrders.find(o=>o.id===ref?.orderId),d=e.proof.delivery;
    if(!o||o.status!=='executed'||!same(o.action,{type:'fulfill-gift',commitmentId:r.id})||o.executorId!==r.playerId||o.issuerId!==origin.issuerId||o.sourceStatusId!==origin.sourceStatusId||o.executionId!==e.sourceId||!same(ref,{orderId:o.id,sourceStatusId:o.sourceStatusId,issuerId:o.issuerId,executionId:o.executionId})||!same(q,{type:'fulfill-gift',actorId:r.playerId,commitmentId:r.id})||!same(o.receipt,{...receipt(e),id:e.sourceId,transactionType:'受控赠物'})||e.at>=(r.dueDay+1)*1440)throw Error('原控制履约');
    if(!d||d.itemId!==r.itemId||d.templateId!==r.templateId||d.quantity!==r.quantity||d.donorId!==r.playerId||d.recipientId!==r.personId||d.toContainerId!==s.人物.列表[r.personId].inventoryContainerId||d.fromContainerId!==s.人物.列表[r.playerId].inventoryContainerId||event.quantity!==r.quantity||event.deliveredItemId!==d.deliveredItemId||e.proof.itemBefore?.id!==r.itemId||e.proof.itemBefore.ownerEntityId!==r.playerId||e.proof.itemBefore.quantity!==d.quantityBefore||e.proof.itemBefore.containerId!==d.fromContainerId||![d.quantityBefore,d.remainingQuantity,d.deliveredQuantity].every(Number.isSafeInteger)||d.remainingQuantity<0||d.quantityBefore-d.remainingQuantity!==r.quantity||d.deliveredQuantity!==r.quantity)throw Error('实际交付守恒');
   }else if(e.sourceId!==`gift-expiry:${r.id}`||e.at!==(r.dueDay+1)*1440||!same(q,{type:'expire-controlled-gift',commitmentId:r.id}))throw Error('到期时刻');
   if(e.kind!=='expired'&&(!Array.isArray(e.proof.participants)||e.proof.participants.length!==2||!social.validCommunicationProof(s,e.proof.participants[0],r.playerId,e.kind==='pending'&&e.proof.presentation.mode==='speech',e.at,e.order)||!social.validCommunicationProof(s,e.proof.participants[1],r.personId,['accepted','rejected'].includes(e.kind),e.at,e.order)||!same(e.proof.participants[0].position,e.proof.participants[1].position)))throw Error('实际同场与清醒发声');
   sources.add(e.sourceId);sequences.add(e.order);latest.set(r.id,e);
  }catch(error){errors.push(`受控赠物${e?.id}无效：${error.message}`);}
  for(const [id,e] of latest)if(!same(record(s,id),e.record))errors.push('赠物当前记录与永久历史不符');
  for(const r of records(s)){if(!latest.has(r.id))errors.push('受控赠物缺少永久来源');if(['pending','accepted'].includes(r.status)&&expired(s,r))errors.push('过期赠物尚未登记实际期限');}
  for(const p of Object.values(s.人物.列表)){const rows=p.扩展?.受赠回应??[];if(!Array.isArray(rows)||new Set(rows.map(e=>e.eventId)).size!==rows.length){errors.push('本人受赠回应历史无效');continue;}for(const v of rows)if(!db.events.some(e=>['accepted','rejected'].includes(e.kind)&&e.record.personId===p.id&&same(v,{eventId:e.id,sourceId:e.sourceId,commitmentId:e.commitmentId,hash:e.hash})))errors.push('本人受赠回应缺少永久结算');}
  for(const o of fieldOrders)if(o.status==='executed'&&['propose-gift','fulfill-gift'].includes(o.action.type)&&!db.events.some(e=>e.id===o.receipt?.eventId&&e.sourceId===o.executionId))errors.push('赠物命令缺少永久提议或交付');
  return errors;
 }
 return Object.freeze({table,records,record,presentationProof,quote,propose,respond,fulfill,responseReason,advanceAt,nextAt,facts,validate});
});
