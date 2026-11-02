(function(root,factory){
 const get=(name,file)=>root?.[name]??(typeof require==='function'?require(file):null);
 const api=factory(get('SoulCooperationCore','./cooperation-core.js'),get('SoulCustodyCore','./custody-core.js'),get('SoulPersonCore','./person-core.js'),get('SoulActionContext','./action-context-core.js'),get('SoulAbilityContract','./ability-contract-core.js'),get('SoulWorldSocial','./world-social-core.js'));
 if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulCooperationPreparation=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(cooperation,custody,people,actions,abilities,social){
 'use strict';
 const clone=v=>JSON.parse(JSON.stringify(v)),same=(a,b)=>abilities.hash(a)===abilities.hash(b),now=s=>people.now(s);
 const INTENTS=Object.freeze(['decide-cooperation-restraint-permission','prepare-cooperation-battle','recover-cooperation-restraints','close-cooperation-preparation']);
 const table=(s,create=false)=>{if(create)s.世界.cooperationPreparations??={version:1,records:[],events:[]};return s.世界.cooperationPreparations??{version:1,records:[],events:[]};};
 const stamped=r=>{const {hash,...body}=r??{};return hash===abilities.hash(body);};
 function save(s,r,kind,sourceId,detail={}){const db=table(s,true),old=db.records.find(v=>v.id===r.id),previousHash=old?.hash??null;custody.stamp(r);if(old)Object.assign(old,r);else db.records.push(r);db.events.push(custody.stamp({id:`${r.id}:${db.events.filter(e=>e.preparationId===r.id).length}`,preparationId:r.id,at:now(s),order:people.nextEventOrder(s),kind,sourceId,previousHash,record:clone(r),...clone(detail)}));}
 function prepare(s,q,sourceId,h){
  const a=cooperation.table(s).agreements.find(a=>a.id===q.cooperationId);
  if(!a||a.leaderId!==q.actorId||!cooperation.permits(s,a.leaderId,a.memberId,'combat'))throw Error('需要本人仍有效的参战合作');
  actions.resolve(s,{actorId:q.actorId,battleId:null,targetIds:[a.memberId],requirements:['gesture']});
  if(table(s).records.some(p=>p.memberId===a.memberId&&p.status!=='closed'))throw Error('这位成员还有未收尾的战前准备');
  const ops=q.deviceOperations;if(!Array.isArray(ops)||!ops.length||ops.length>6||new Set(ops.map(o=>o?.itemId)).size!==ops.length)throw Error('须明确一至六件不重复的实际拘束器');
  const r={id:`cooperation-preparation:${sourceId}`,sourceId,cooperationId:a.id,authorityEventId:cooperation.table(s).events.filter(e=>e.agreementId===a.id).at(-1).id,leaderId:a.leaderId,memberId:a.memberId,custodyAuthority:custody.currentAuthority(s,a.memberId),createdAt:now(s),status:'prepared',battleId:null,operations:[],attempts:[]};
  for(const [index,op] of ops.entries()){
   if(!op||Object.keys(op).some(k=>!['itemId','mode','returnMode','relockAfterMinutes','limits','returnLimits'].includes(k))||!['released','escort','detached','limited'].includes(op.mode)||!['locked','escort','limited'].includes(op.returnMode??'locked'))throw Error('战前操作仅支持实际解放、押送模式或拆除，并明确战后模式');
   const item=s.物品.实例[op.itemId],before=item?.attachment,fine=['restraint-seal-collar','restraint-seal-platform','restraint-slime-suit'].includes(item?.templateId);
   if(!fine&&(op.limits!==undefined||op.returnLimits!==undefined))throw Error('这件器具不支持精细限制配置');
   if(!custody.resolveDevice(item)?.modes[op.returnMode??'locked'])throw Error('原器具不支持约定的战后模式');
   if(!before||before.wearerId!==a.memberId)throw Error('这件器具没有佩戴在本次合作成员身上');
   const operation={itemId:item.id,templateId:item.templateId,mode:op.mode,returnMode:op.returnMode??(before.mode==='limited'?'limited':'locked'),...(fine&&op.mode==='limited'?{limits:clone(op.limits)}:{}),...(fine&&(op.returnMode??before.mode)==='limited'?{returnLimits:clone(op.returnLimits??before.limits??op.limits)}:{}),before:clone(before),sourceId:`${sourceId}:device:${index}`,...(op.relockAfterMinutes===undefined?{}:{relockAfterMinutes:op.relockAfterMinutes})};
   if(operation.returnMode==='limited')custody.setDeviceMode(clone(s),{actorId:q.actorId,itemId:item.id,mode:'limited',...(fine?{limits:operation.returnLimits}:{})},'preview-return',h);
   if(op.mode==='detached'&&op.relockAfterMinutes!==undefined)throw Error('完全拆除的器具不能设置佩戴中复锁');
   const request={actorId:q.actorId,itemId:item.id,mode:op.mode,...(fine&&op.mode==='limited'?{limits:op.limits}:{}),...(op.relockAfterMinutes===undefined?{}:{relockAfterMinutes:op.relockAfterMinutes})};
   operation.receipt=op.mode==='detached'?custody.detachDevice(s,request,operation.sourceId,h):custody.setDeviceMode(s,request,operation.sourceId,h);
   operation.after=clone(s.物品.实例[item.id].attachment??null);r.operations.push(operation);
  }
  save(s,r,'prepared',sourceId);return result(r,'实际战前操作已完成；其余封印、伤势与费用条件继续生效。');
 }
 function result(r,summary){return {type:'cooperation-preparation',preparationId:r.id,cooperationId:r.cooperationId,actorId:r.leaderId,targetId:r.memberId,status:r.status,battleId:r.battleId,attempts:clone(r.attempts),summary};}
 function execute(s,q,sourceId,h){
  if(q.type==='decide-cooperation-restraint-permission')return decidePermission(s,q,sourceId);
  if(q.type==='prepare-cooperation-battle')return prepare(s,q,sourceId,h);
  const old=table(s).records.find(p=>p.id===q.preparationId);if(!old||old.leaderId!==q.actorId||old.status==='closed')throw Error('没有本人尚未收尾的战前准备');
  if(old.status==='fighting'||actions.battleOf(s,old.memberId))throw Error('目标仍在战斗或等待战后结算，不能场外复锁');
  const r=clone(old);
  if(r.custodyAuthority&&!custody.sameAuthority(r.custodyAuthority,custody.authorityRef(custody.table(s).byPerson[r.memberId])))throw Error('对方已换了关押者，这次战后器具设置已失效。');
  if(q.type==='close-cooperation-preparation'){
   people.assertAlive(s,q.actorId);if(typeof q.reason!=='string'||!q.reason.trim()||q.reason.length>600)throw Error('结束收束安排须说明理由');r.status='closed';r.closedAt=now(s);r.closeReason=q.reason;r.recovered=false;save(s,r,'closed',sourceId);return result(r,'已结束本次收束安排；器具按当前实际状态保留。');
  }
  // Each device is a separate physical action. Successful operations survive a later refusal.
  for(const op of r.operations){
   const attempt={itemId:op.itemId,at:now(s),sourceId:`${sourceId}:device:${r.attempts.length}`,status:'failed',reason:''};
   try{
    const draft=clone(s),item=draft.物品.实例[op.itemId];people.assertAlive(draft,r.memberId);if(!item)throw Error('原器具已经不存在');
    if(item.attachment&&item.attachment.wearerId===r.memberId&&item.attachment.mode===op.returnMode&&(op.returnLimits===undefined||same(item.attachment.limits,op.returnLimits))&&item.durability>0){custody.controlDevice(draft,r.leaderId,item.id);attempt.status='already-restored';attempt.attachment=clone(item.attachment);custody.event(s,'restraint-recovery-checked',r.leaderId,r.memberId,attempt.sourceId,{itemId:item.id,attachment:clone(item.attachment)});}
    else{
     if(op.mode==='detached'&&!item.attachment){attempt.receipt=custody.attachDevice(draft,{actorId:r.leaderId,targetId:r.memberId,itemId:item.id},attempt.sourceId,h);if(op.returnMode!=='locked')attempt.modeReceipt=custody.setDeviceMode(draft,{actorId:r.leaderId,itemId:item.id,mode:op.returnMode,...(op.returnLimits!==undefined?{limits:op.returnLimits}:{})},`${attempt.sourceId}:mode`,h);}
     else {if(!item.attachment||item.attachment.wearerId!==r.memberId||item.attachment.captureSourceId!==op.before.captureSourceId)throw Error('原装配已经改变，不能沿用本次收束安排');attempt.receipt=custody.setDeviceMode(draft,{actorId:r.leaderId,itemId:item.id,mode:op.returnMode,...(op.returnLimits!==undefined?{limits:op.returnLimits}:{})},attempt.sourceId,h);}
     attempt.status='restored';attempt.attachment=clone(draft.物品.实例[item.id].attachment);h.commitDraft(s,draft);
    }
   }catch(error){attempt.reason=error.message;}
   r.attempts.push(attempt);
  }
  const complete=r.operations.every(op=>{const item=s.物品.实例[op.itemId];return item?.attachment?.wearerId===r.memberId&&item.attachment.mode===op.returnMode&&(op.returnLimits===undefined||same(item.attachment.limits,op.returnLimits))&&item.durability>0&&r.attempts.filter(a=>a.itemId===op.itemId).at(-1)?.status!=='failed';});
  r.status=complete?'closed':'recovery-pending';if(complete){r.closedAt=now(s);r.recovered=true;}save(s,r,complete?'recovered':'recovery-attempted',sourceId);
  return result(r,complete?'已按当前权限完成本次收束。':'部分器具未能重新装配或复锁，实际失败原因已保留；已完成的操作不回滚。');
 }
 function reconcile(s){
  if(!s.世界)return;
  for(const old of table(s).records.filter(r=>r.status!=='closed')){const r=clone(old),battle=actions.battleOf(s,r.memberId);
   const changed=r.custodyAuthority&&!custody.sameAuthority(r.custodyAuthority,custody.authorityRef(custody.table(s).byPerson[r.memberId]));
   if(changed){r.status='closed';r.closedAt=now(s);r.recovered=false;r.closeReason='看管权限已经交接，结束原收束安排并保留实际器具';save(s,r,'custody-changed',custody.table(s).byPerson[r.memberId].authorityEventId);continue;}
   if(s.人物.列表[r.leaderId]?.life?.death){r.status='closed';r.closedAt=now(s);r.recovered=false;r.closeReason='原领队已经死亡，结束收束安排并保留实际器具';save(s,r,'leader-death',s.人物.列表[r.leaderId].life.death.id);continue;}
   if(['prepared','recovery-pending'].includes(r.status)&&battle?.状态==='进行中'&&battle.扩展.开战结算单){r.status='fighting';r.battleId=battle.id;save(s,r,'battle-started',battle.id,{battleProof:battleProof(battle)});}
   else if((r.status==='fighting'&&!battle)||(r.status==='prepared'&&!cooperation.permits(s,r.leaderId,r.memberId,'combat'))){r.status='recovery-pending';save(s,r,'recovery-pending',r.battleId??`${r.id}:permission-ended`);}
  }
 }
 function facts(s,viewerId){return table(s).records.filter(r=>[r.leaderId,r.memberId].includes(viewerId)).map(r=>({id:r.id,cooperationId:r.cooperationId,leaderId:r.leaderId,memberId:r.memberId,memberName:s.人物.列表[r.memberId].name,status:r.status,battleId:r.battleId,canRecover:r.leaderId===viewerId&&['prepared','recovery-pending'].includes(r.status),operations:r.operations.map(o=>({itemId:o.itemId,itemName:s.物品.实例[o.itemId]?.name??o.itemId,mode:o.mode,returnMode:o.returnMode})),attempts:r.attempts.map(a=>({itemId:a.itemId,status:a.status,reason:a.reason})),closeReason:r.closeReason??null}));}
 function options(s,viewerId,{memberId}={}){return cooperation.table(s).agreements.filter(a=>(!memberId||a.memberId===memberId)&&a.leaderId===viewerId&&a.status==='active'&&a.allowCombat).map(a=>{
  let reason='';try{if(!cooperation.permits(s,viewerId,a.memberId,'combat'))throw Error('当前没有实际参战许可');actions.resolve(s,{actorId:viewerId,battleId:null,targetIds:[a.memberId],requirements:['gesture']});if(table(s).records.some(p=>p.memberId===a.memberId&&p.status!=='closed'))throw Error('须先收尾上一项出战准备');}catch(e){reason=e.message;}
  return {cooperationId:a.id,memberId:a.memberId,memberName:s.人物.列表[a.memberId].name,reason,devices:actions.colocated(s,viewerId,a.memberId)?custody.attached(s,a.memberId).map(i=>{let blocked='';try{custody.controlDevice(s,viewerId,i.id);}catch(e){blocked=e.message;}const d=custody.resolveDevice(i);return {itemId:i.id,name:i.name,mode:i.attachment.mode,limits:clone(i.attachment.limits??null),supportsFineLimits:['restraint-seal-collar','restraint-seal-platform','restraint-slime-suit'].includes(i.templateId),supportsDamage:i.templateId==='restraint-seal-platform',choices:globalThis.SoulControlCore.limitChoices(s,a.memberId,{supportsFineLimits:['restraint-seal-collar','restraint-seal-platform','restraint-slime-suit'].includes(i.templateId),supportsDamage:i.templateId==='restraint-seal-platform'}),modes:Object.keys(d.modes),autoRelock:!!d.autoRelock,canControl:!blocked,durability:i.durability,reason:blocked};}):[]};
 });}
 function battleProof(b){return custody.stamp({battleId:b.id,battleKind:b.扩展.battleKind,createdAt:b.扩展.clock.createdAt,participantIds:clone(b.参与者ID列表),members:b.参与者ID列表.map(id=>{const m=b.扩展.成员[id];return {unitId:id,sideId:m.sideId,controller:m.controller,joinedRound:m.joinedRound};}),start:clone(b.扩展.开战结算单),joins:clone(b.扩展.加入结算单列表??[])});}
 function validateBattleProof(s,e,r){
  const p=e.battleProof,start=p?.start,b=[s.战斗,...Object.values(s.世界.backgroundBattles??{})].find(b=>b.id===e.record.battleId),ids=p?.participantIds;
  if(!stamped(p)||p.battleId!==e.record.battleId||e.sourceId!==p.battleId||!custody.BATTLE_KINDS.includes(p.battleKind)||!Number.isSafeInteger(p.createdAt)||p.createdAt>e.at||!Array.isArray(ids)||new Set(ids).size!==ids.length||!ids.includes(r.memberId)||start?.id!==`receipt-${p.battleId}-start`||start.type!=='battle-start'||start.battleId!==p.battleId||!same(p.members.map(m=>m.unitId).sort(),[...ids].sort())||p.members.some(m=>!['ai','player'].includes(m.controller)||!Number.isSafeInteger(m.joinedRound)||m.joinedRound<1))throw Error('参战来源');
  const initial=start.initiative.map(v=>v.unitId),teamIds=Object.values(start.teams).flatMap(t=>t.memberIds);if(new Set(initial).size!==initial.length||initial.length<2||!same([...initial].sort(),[...teamIds].sort())||!Array.isArray(p.joins)||p.joins.some((j,i)=>j.id!==`join:${p.battleId}:${j.unitId}:${i}`||j.battleId!==p.battleId||j.type!=='battle-join'||j.initiative.unitId!==j.unitId||!Number.isSafeInteger(j.at)||j.at<p.createdAt||j.at>e.at)||!same([...new Set([...initial,...p.joins.map(j=>j.unitId)])].sort(),[...ids].sort())||p.members.some(m=>{const j=p.joins.filter(j=>j.unitId===m.unitId).at(-1);return j?j.sideId!==m.sideId||j.initiative.joinedRound!==m.joinedRound:!start.teams[m.sideId]?.memberIds.includes(m.unitId)||m.joinedRound!==1;}))throw Error('参战成员来源');
  const joined=p.joins.filter(j=>j.unitId===r.memberId).at(-1);if((joined?.at??p.createdAt)<r.createdAt)throw Error('参战早于准备');
  if(b&&(b.扩展.clock.createdAt!==p.createdAt||b.扩展.battleKind!==p.battleKind||!same(b.扩展.开战结算单,start)||p.joins.some(j=>!(b.扩展.加入结算单列表??[]).some(v=>same(j,v)))||p.members.some(m=>!b.参与者ID列表.includes(m.unitId))))throw Error('参战历史不符');
 }
 const permissionDecisions=s=>table(s).permissionDecisions??[];
 const exactKeys=(v,allowed)=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===allowed.length&&Object.keys(v).every(k=>allowed.includes(k));
 function permissionDecisionInput(q){
  if(!q||Object.keys(q).some(k=>!['id','type','actorId','decisionKey','decision'].includes(k))||q.type!=='decide-cooperation-restraint-permission'||typeof q.actorId!=='string'||typeof q.decisionKey!=='string'||!exactKeys(q.decision,['accept','reason'])||typeof q.decision.accept!=='boolean'||typeof q.decision.reason!=='string'||!q.decision.reason.trim()||q.decision.reason.length>600)throw Error('装配配合须由本人明确接受或拒绝');
  return {type:q.type,actorId:q.actorId,decisionKey:q.decisionKey,decision:clone(q.decision)};
 }
 function permissionOrigin(s,preparation,operation){return table(s).events.find(e=>e.preparationId===preparation.id&&e.kind==='recovery-attempted'&&e.record.attempts.some(a=>a.itemId===operation.itemId&&a.status==='failed'));}
 function permissionDecisionKey(p,o,origin){return abilities.hash({preparationId:p.id,operationSourceId:o.sourceId,authority:p.custodyAuthority,originEventId:origin.id,originHash:origin.hash});}
 function permissionDeviceEvent(s,itemId,order=Infinity){return custody.table(s).events.filter(e=>e.itemId===itemId&&e.order<order&&['restraint-attached','restraint-mode-changed','restraint-detached','restraint-rights-transferred'].includes(e.type)).at(-1);}
 function pendingPermissions(s,scope=null){
  const result=[];
  for(const p of table(s).records){
   if(scope&&!scope.preparationIds.has(p.id))continue;
   if(p.status!=='recovery-pending'||p.memberId===s.角色.主控单位ID||!p.custodyAuthority||!custody.sameAuthority(p.custodyAuthority,custody.currentAuthority(s,p.memberId)))continue;
   for(const o of p.operations.filter(o=>o.mode==='detached')){
    const origin=permissionOrigin(s,p,o);if(scope&&(!origin||!scope.sourceIds.has(origin.sourceId)))continue;const deviceEvent=permissionDeviceEvent(s,o.itemId);if(!origin||deviceEvent?.type!=='restraint-detached'||deviceEvent.sourceId!==o.sourceId||deviceEvent.actorId!==p.leaderId||deviceEvent.targetId!==p.memberId)continue;
    const key=permissionDecisionKey(p,o,origin);if(permissionDecisions(s).some(e=>e.key===key)||(custody.table(s).permissions??[]).some(v=>v.wearerId===p.memberId&&v.operatorId===p.leaderId&&v.itemId===o.itemId&&v.status==='granted'&&v.expiresAt>now(s)))continue;
    try{
     if(!social.remembers(s,p.memberId,origin.at,[],origin.order)||![p.memberId,p.leaderId].every(id=>social.validCommunicationProof(s,social.communicationProof(s,id),id)))continue;
     // Reuse the actual one-use permission guard; this preview never commits its event.
     custody.permitDevice(clone(s),{actorId:p.memberId,targetId:p.leaderId,itemId:o.itemId},`permission-preview:${key}`);
     result.push({key,ownerId:p.memberId,operatorId:p.leaderId,preparationId:p.id,itemId:o.itemId,operationSourceId:o.sourceId,authority:clone(p.custodyAuthority),originEventId:origin.id,originHash:origin.hash});
    }catch{/* The original failure remains; nobody supplies a default consent. */}
   }
  }
  return result;
 }
 function permissionReceipt(e){return {type:'person-restraint-permission-decided',decisionId:e.id,preparationId:e.preparationId,actorId:e.ownerId,targetId:e.operatorId,itemId:e.itemId,accepted:e.request.decision.accept,permissionId:e.result?.permissionId??null,summary:e.request.decision.accept?'本人同意对方在15分钟内装配这件器具一次；尚未重新装配。':'本人拒绝本次重新装配；不会生成许可或改变器具。'};}
 function replayPermission(s,q,sourceId){const e=permissionDecisions(s).find(e=>e.sourceId===sourceId);if(!e)return null;if(!same(e.request,permissionDecisionInput(q)))throw Error('原装配决定编号不能改换内容');return permissionReceipt(e);}
 function decidePermission(s,q,sourceId){
  const old=replayPermission(s,q,sourceId);if(old)return old;const request=permissionDecisionInput(q),r=pendingPermissions(s).find(r=>r.key===q.decisionKey);
  if(!r||q.actorId!==r.ownerId)throw Error('没有可由该人物独立回应的原装配失败');
  const item=s.物品.实例[r.itemId],atOrder=people.nextEventOrder(s),deviceEvent=permissionDeviceEvent(s,r.itemId,atOrder),proof={atOrder,memoryContext:social.masksAtOrder(s,r.ownerId,atOrder),detachment:{eventId:deviceEvent.id,hash:deviceEvent.hash},person:social.communicationProof(s,r.ownerId),operator:social.communicationProof(s,r.operatorId),channel:globalThis.SoulControlCore.actionReason(s,r.ownerId,'requirements',{requirements:['voice']})?'gesture':'voice',gestureRestrictions:clone(globalThis.SoulControlCore.restrictions(s,r.ownerId).blocked.gesture??[]),item:{id:item.id,templateId:item.templateId,ownerEntityId:item.ownerEntityId,containerId:item.containerId,quantity:item.quantity,durability:item.durability,attachment:null}};
  let result=null;
  if(request.decision.accept){const childSourceId=`npc-restraint-permission:${sourceId}`,receipt=custody.permitDevice(s,{actorId:r.ownerId,targetId:r.operatorId,itemId:r.itemId},childSourceId),event=custody.table(s).events.find(e=>e.sourceId===childSourceId&&e.type==='restraint-permitted');result={sourceId:childSourceId,eventId:event.id,eventHash:event.hash,permissionId:receipt.permission.id};}
  const e=custody.stamp({id:`restraint-permission-decision:${sourceId}`,sourceId,...r,at:now(s),order:people.nextEventOrder(s),proof,request,result});(table(s,true).permissionDecisions??=[]).push(e);(s.人物.列表[r.ownerId].扩展.装配配合决定??=[]).push({eventId:e.id,hash:e.hash});return permissionReceipt(e);
 }
 function validatePermissionDecisions(s){
  const rows=table(s).permissionDecisions,errors=[],keys=new Set(),sources=new Set();let lastOrder=0;
  if(rows!==undefined&&!Array.isArray(rows))return ['装配配合决定账本无效'];
  for(const e of rows??[])try{
   if(!exactKeys(e,['id','sourceId','key','ownerId','operatorId','preparationId','itemId','operationSourceId','authority','originEventId','originHash','at','order','proof','request','result','hash']))throw Error('决定字段');
   const request=permissionDecisionInput(e.request),p=table(s).records.find(p=>p.id===e.preparationId),op=p?.operations.find(o=>o.sourceId===e.operationSourceId),origin=op&&permissionOrigin(s,p,op),proof=e.proof;
   if(!stamped(e)||e.id!==`restraint-permission-decision:${e.sourceId}`||typeof e.sourceId!=='string'||!e.sourceId||sources.has(e.sourceId)||keys.has(e.key)||!Number.isSafeInteger(e.at)||e.at>now(s)||!Number.isSafeInteger(e.order)||e.order<=lastOrder||e.order>s.扩展.personEventSequence)throw Error('决定事件顺序');
   if(!p||!op||op.mode!=='detached'||op.itemId!==e.itemId||p.memberId!==e.ownerId||p.leaderId!==e.operatorId||e.ownerId===s.角色.主控单位ID||!same(p.custodyAuthority,e.authority)||!origin||origin.id!==e.originEventId||origin.hash!==e.originHash||origin.at>e.at||origin.order>=proof?.atOrder||e.key!==permissionDecisionKey(p,op,origin)||!custody.authorityAt(s,e.authority,e.operatorId,e.at,proof.atOrder))throw Error('原失败、佩戴者或当时权限来源');
   const last=table(s).events.filter(v=>v.preparationId===p.id&&v.order<proof.atOrder).at(-1);if(last?.record.status!=='recovery-pending')throw Error('当时收束安排已结束');
   if(!exactKeys(proof,['atOrder','memoryContext','detachment','person','operator','channel','gestureRestrictions','item'])||!Number.isSafeInteger(proof.atOrder)||proof.atOrder>=e.order||!['voice','gesture'].includes(proof.channel)||!social.validCommunicationProof(s,proof.person,e.ownerId,proof.channel==='voice')||!social.validCommunicationProof(s,proof.operator,e.operatorId)||!same(proof.person.position,proof.operator.position)||!Array.isArray(proof.gestureRestrictions)||proof.channel==='gesture'&&proof.gestureRestrictions.length)throw Error('本人清醒现场或回应条件');
   if(!same(proof.memoryContext,social.masksAtOrder(s,e.ownerId,proof.atOrder))||proof.memoryContext.some(id=>s.扩展.cognitionChanges[id].appliedOrder>=origin.order))throw Error('本人回应时已无法记起原失败');
   const deviceEvent=permissionDeviceEvent(s,e.itemId,proof.atOrder);if(!exactKeys(proof.detachment,['eventId','hash'])||deviceEvent?.type!=='restraint-detached'||deviceEvent.sourceId!==op.sourceId||deviceEvent.actorId!==e.operatorId||deviceEvent.targetId!==e.ownerId||deviceEvent.id!==proof.detachment.eventId||deviceEvent.hash!==proof.detachment.hash)throw Error('原器具在回应时已另行装拆');
   const i=proof.item;if(!exactKeys(i,['id','templateId','ownerEntityId','containerId','quantity','durability','attachment'])||i.id!==e.itemId||i.templateId!==op.templateId||i.ownerEntityId!==e.operatorId||i.containerId!==s.人物.列表[e.operatorId].inventoryContainerId||i.quantity!==1||!Number.isSafeInteger(i.durability)||i.durability<=0||i.attachment!==null)throw Error('真实未装配原器具');
   if(!same(e.request,request)||request.actorId!==e.ownerId||request.decisionKey!==e.key)throw Error('原本人明确请求');
   if(request.decision.accept){const r=e.result,v=custody.table(s).events.find(v=>v.id===r?.eventId);if(!exactKeys(r,['sourceId','eventId','eventHash','permissionId'])||r.sourceId!==`npc-restraint-permission:${e.sourceId}`||!v||v.hash!==r.eventHash||v.type!=='restraint-permitted'||v.sourceId!==r.sourceId||v.actorId!==e.ownerId||v.targetId!==e.operatorId||v.at!==e.at||v.order<=proof.atOrder||v.order>=e.order||v.permission.id!==r.permissionId||v.permission.itemId!==e.itemId||v.permission.wearerId!==e.ownerId||v.permission.operatorId!==e.operatorId)throw Error('真实单次许可来源');}
   else if(e.result!==null)throw Error('拒绝不能附带许可');
   const privateRows=s.人物.列表[e.ownerId].扩展.装配配合决定??[];if(privateRows.filter(v=>same(v,{eventId:e.id,hash:e.hash})).length!==1)throw Error('本人的私有决定历史');keys.add(e.key);sources.add(e.sourceId);lastOrder=e.order;
  }catch(error){errors.push(`装配配合决定${e?.id}无效：${error.message}`);}
  for(const p of Object.values(s.人物.列表))for(const v of p.扩展?.装配配合决定??[])if(!(rows??[]).some(e=>e.ownerId===p.id&&same(v,{eventId:e.id,hash:e.hash})))errors.push('人物装配配合历史缺少永久来源');
  for(const e of custody.table(s).events)if(e.sourceId.startsWith('npc-restraint-permission:')&&!(rows??[]).some(r=>r.result?.eventId===e.id&&r.result?.eventHash===e.hash))errors.push('NPC装配许可缺少本人原决定');return errors;
 }
 function validate(s){
  const d=s.世界.cooperationPreparations;if(!d)return validatePermissionDecisions(s);if(d.version!==1||!Array.isArray(d.records)||!Array.isArray(d.events))return ['战前准备账本无效'];const errors=[],latest=new Map(),counts=new Map(),ids=new Set(),custodyEvents=custody.table(s).events;
  for(const e of d.events){const prev=latest.get(e.preparationId),index=counts.get(e.preparationId)??0;if(!stamped(e)||!stamped(e.record)||e.id!==`${e.preparationId}:${index}`||e.record.id!==e.preparationId||e.previousHash!==(prev?.record.hash??null)||!Number.isSafeInteger(e.at)||e.at>now(s)||prev&&(e.at<prev.at||e.order<=prev.order)||!Number.isSafeInteger(e.order)||e.order>s.扩展.personEventSequence||!prev&&e.kind!=='prepared')errors.push('战前准备事件来源无效');latest.set(e.preparationId,e);counts.set(e.preparationId,index+1);}
  for(const r of d.records)try{
   const events=d.events.filter(e=>e.preparationId===r.id),first=events[0],a=cooperation.table(s).agreements.find(a=>a.id===r.cooperationId);
   if(ids.has(r.id)||!a||a.leaderId!==r.leaderId||a.memberId!==r.memberId||r.id!==`cooperation-preparation:${r.sourceId}`||!first||!same(latest.get(r.id)?.record,r)||!stamped(r)||r.createdAt!==first.at||!r.operations.length||r.operations.length>6||new Set(r.operations.map(o=>o.itemId)).size!==r.operations.length)throw Error('来源');ids.add(r.id);
   if(!same(r.custodyAuthority,custody.historicalAuthority(s,r.memberId,first.at,first.order)))throw Error('准备时看管来源');
   const auth=cooperation.table(s).events.find(e=>e.id===r.authorityEventId);if(!auth||auth.agreementId!==a.id||auth.record.status!=='active'||!auth.record.allowCombat||auth.order>=first.order||auth.at>r.createdAt||auth.record.expiresAt!==null&&auth.record.expiresAt<=r.createdAt)throw Error('参战许可');
   let phase=null,priorAttempts=[];
   for(const e of events){const x=e.record;if(['id','sourceId','cooperationId','authorityEventId','leaderId','memberId','custodyAuthority','createdAt','operations'].some(k=>!same(x[k],first.record[k]))||x.attempts.length<priorAttempts.length||!same(x.attempts.slice(0,priorAttempts.length),priorAttempts))throw Error('历史被改写');
    const allowed=phase===null?['prepared']:phase==='prepared'?['battle-started','recovery-pending','recovered','recovery-attempted','closed','leader-death','custody-changed']:phase==='fighting'?['recovery-pending','leader-death','custody-changed']:phase==='recovery-pending'?['battle-started','recovered','recovery-attempted','closed','leader-death','custody-changed']:[];
    const expected=e.kind==='battle-started'?'fighting':['recovered','closed','leader-death','custody-changed'].includes(e.kind)?'closed':e.kind==='recovery-attempted'?'recovery-pending':e.kind;
    if(!allowed.includes(e.kind)||x.status!==expected)throw Error('阶段');
    if(e.kind==='battle-started')validateBattleProof(s,e,r);
    if(e.kind==='custody-changed'){const origin=custodyEvents.find(v=>v.id===e.sourceId);if(!r.custodyAuthority||!origin||!['captured','custody-transferred'].includes(origin.type)||origin.targetId!==r.memberId||origin.order>=e.order||origin.at>e.at||custody.sameAuthority(origin.authority,r.custodyAuthority))throw Error('看管变更来源');}
    if(e.kind==='leader-death'&&(!s.人物.列表[r.leaderId]?.life?.death||s.人物.列表[r.leaderId].life.death.id!==e.sourceId||s.人物.列表[r.leaderId].life.death.at>e.at))throw Error('领队死亡来源');
    if(['closed','leader-death','custody-changed'].includes(e.kind)&&(!x.closeReason?.trim()||x.closeReason.length>600||x.recovered!==false||x.closedAt!==e.at||x.attempts.length!==priorAttempts.length))throw Error('结束来源');
    if(['recovered','recovery-attempted'].includes(e.kind)){const added=x.attempts.slice(priorAttempts.length);if(added.length!==r.operations.length||added.some((a,i)=>a.itemId!==r.operations[i].itemId||a.sourceId!==`${e.sourceId}:device:${priorAttempts.length+i}`||a.at!==e.at))throw Error('收束操作序列');if(e.kind==='recovered'&&(x.recovered!==true||x.closedAt!==e.at||added.some((a,i)=>a.status==='failed'||a.attachment?.mode!==r.operations[i].returnMode)))throw Error('伪造收束成功');}
    else if(x.attempts.length!==priorAttempts.length)throw Error('无来源收束');
    if(e.kind!=='battle-started'&&x.battleId!==(events.filter(v=>v.order<e.order&&v.kind==='battle-started').at(-1)?.record.battleId??null))throw Error('战斗引用被改写');
    phase=x.status;priorAttempts=x.attempts;
   }
   if(r.status==='prepared'&&(!cooperation.permits(s,r.leaderId,r.memberId,'combat')||actions.battleOf(s,r.memberId))||r.status==='fighting'&&actions.battleOf(s,r.memberId)?.id!==r.battleId)throw Error('当前阶段未结算');
   for(const [i,o] of r.operations.entries()){const e=custodyEvents.find(e=>e.sourceId===o.sourceId&&e.itemId===o.itemId);if(!stamped(o.before)||o.before.wearerId!==r.memberId||o.sourceId!==`${r.sourceId}:device:${i}`||!e||e.actorId!==r.leaderId||e.targetId!==r.memberId||e.at!==r.createdAt||e.type!==(o.mode==='detached'?'restraint-detached':'restraint-mode-changed')||!['released','escort','detached','limited'].includes(o.mode)||!['locked','escort','limited'].includes(o.returnMode)||!custody.resolveDevice(s.物品.实例[o.itemId])?.modes[o.returnMode]||s.物品.实例[o.itemId]&&s.物品.实例[o.itemId].templateId!==o.templateId||(o.mode==='detached'?(!same(o.before,e.attachment)||o.after!==null):(!same(o.after,e.attachment)||e.previousAttachmentHash!==o.before.hash)))throw Error('实际器具操作');}
   for(const attempt of r.attempts){if(!r.operations.some(o=>o.itemId===attempt.itemId)||!Number.isSafeInteger(attempt.at)||attempt.at<r.createdAt||attempt.at>now(s)||!['restored','already-restored','failed'].includes(attempt.status))throw Error('收束结果');if(attempt.status==='failed'){if(!attempt.reason)throw Error('失败原因');}else if(!stamped(attempt.attachment)||attempt.attachment.wearerId!==r.memberId||!custodyEvents.some(e=>e.sourceId===(attempt.modeReceipt?`${attempt.sourceId}:mode`:attempt.sourceId)&&e.itemId===attempt.itemId&&e.actorId===r.leaderId&&e.targetId===r.memberId&&e.at===attempt.at&&(attempt.status==='already-restored'?e.type==='restraint-recovery-checked':['restraint-attached','restraint-mode-changed'].includes(e.type))&&same(e.attachment,attempt.attachment)&&e.attachment.controllers.includes(r.leaderId)))throw Error('重新收束凭据');}
  }catch(error){errors.push(`战前准备${r.id}无效：${error.message}`);}
  for(const id of latest.keys())if(!ids.has(id))errors.push('战前准备缺少当前记录');return [...errors,...validatePermissionDecisions(s)];
 }
 return Object.freeze({INTENTS,table,execute,reconcile,facts,options,pendingPermissions,replayPermission,validate});
});
