(function(root,factory){
 const get=(name,file)=>root?.[name]??(typeof require==='function'?require(file):null);
 const api=factory(get('SoulCustodyCore','./custody-core.js'),get('SoulPersonCore','./person-core.js'),get('SoulActionContext','./action-context-core.js'),get('SoulControlCore','./control-core.js'),get('SoulInfluenceCore','./influence-core.js'),get('SoulAbilityContract','./ability-contract-core.js'));
 if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulCooperationCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(custody,people,actions,controls,influence,abilities){
 'use strict';
 const clone=v=>JSON.parse(JSON.stringify(v)),same=(a,b)=>abilities.hash(a)===abilities.hash(b),now=s=>people.now(s);
 const INTENTS=Object.freeze(['propose-person-cooperation','respond-person-cooperation','impose-person-cooperation','end-person-cooperation','resume-person-cooperation']);
 const table=(s,create=false)=>{if(create)s.世界.cooperation??={version:1,agreements:[],events:[]};return s.世界.cooperation??{version:1,agreements:[],events:[]};};
 const validStamp=v=>{if(!v)return false;const {hash,...body}=v;return hash===abilities.hash(body);};
 function save(s,r,kind,actorId,sourceId,detail={}){const d=table(s,true),old=d.agreements.find(a=>a.id===r.id),previousHash=old?.hash??null;custody.stamp(r);if(old){for(const key of Object.keys(old))if(!Object.hasOwn(r,key))delete old[key];Object.assign(old,r);}else d.agreements.push(r);const e=custody.stamp({id:`${r.id}:event:${d.events.filter(e=>e.agreementId===r.id).length}`,agreementId:r.id,at:now(s),order:people.nextEventOrder(s),kind,actorId,sourceId,previousHash,record:clone(r),...clone(detail)});d.events.push(e);return e;}
 function communicate(s,actorId,targetId){globalThis.SoulInfluenceCore.assertVoluntary(s,actorId);actions.resolve(s,{actorId,battleId:null,targetIds:[targetId]});if(controls.active(s,actorId).some(v=>['status.sleep','status.stun'].includes(v.模板ID)))throw Error('本人无法清醒回应');if(controls.actionReason(s,actorId,'requirements',{requirements:['voice']})&&controls.actionReason(s,actorId,'requirements',{requirements:['gesture']}))throw Error('本人无法发声或示意');}
 function controlProof(s,r){return [r.allowTravel?'移动':null,r.allowCombat?'战斗':null].filter(Boolean).map(domain=>{const a=influence.authority(s,r.leaderId,r.memberId,domain);if(!a.available)throw Error(a.reason);return {domain,sourceStatusId:a.sourceStatusId,status:clone(s.状态实例.列表[a.sourceStatusId])};});}
 function custodyChanged(s,r){return !!r.custodyAuthority&&!custody.sameAuthority(r.custodyAuthority,custody.authorityRef(custody.table(s).byPerson[r.memberId]));}
 function invalidReason(s,r){
  if(r.status!=='active')return '合作尚未生效或已暂停';if(r.expiresAt!==null&&r.expiresAt<=now(s))return '本次临时合作已经到期';
  if([r.leaderId,r.memberId].some(id=>s.人物.列表[id]?.status==='dead'))return '合作一方已经死亡';
  if(custodyChanged(s,r))return '原看管权限已经交接，原合作不可续用';
  if(r.basis==='controlled')for(const proof of r.controlSources){const a=influence.authority(s,r.leaderId,r.memberId,proof.domain);if(!a.available||a.sourceStatusId!==proof.sourceStatusId)return '本次强制合作的原控制来源已经失效';}
  return '';
 }
 function members(s,leaderId){return table(s).agreements.filter(r=>r.leaderId===leaderId&&!invalidReason(s,r)).map(r=>{const p=s.人物.列表[r.memberId];return {personId:p.id,unitId:p.combatantId||p.id,name:p.name,combatant:!!s.战斗单位.列表[p.id],membershipId:r.id,membership:r.membership,dungeonId:r.dungeonId,locationId:p.locationId,present:actions.colocated(s,leaderId,p.id),basis:r.basis,cooperationId:r.id,allowTravel:r.allowTravel,allowCombat:r.allowCombat,lootPolicy:r.lootPolicy};});}
 function agreement(s,leaderId,memberId){return table(s).agreements.find(r=>r.leaderId===leaderId&&r.memberId===memberId&&!invalidReason(s,r))??null;}
 // Messages retain minute precision. A later end in the same minute must not
 // invalidate speech already delivered during that active interval.
 function wasMemberAt(s,id,leaderId,memberId,at){
  if(!Number.isSafeInteger(at)||!table(s).agreements.some(r=>r.id===id&&r.leaderId===leaderId&&r.memberId===memberId))return false;
  const events=table(s).events.filter(e=>e.agreementId===id);
  return events.some((e,i)=>{const r=e.record,next=events[i+1];return r?.id===id&&r.leaderId===leaderId&&r.memberId===memberId&&r.status==='active'&&e.at<=at&&(r.expiresAt===null||r.expiresAt>at)&&(!next||next.at>=at);});
 }
 function bodyParty(s,leaderId,memberId,dungeonId=null){return !!globalThis.SoulCombatDeployments?.bodyOuting(s,leaderId,memberId)&&(!custody.active(s,memberId)||custody.active(s,memberId).custodianId===leaderId);}
 function permits(s,leaderId,memberId,domain,dungeonId=null){if(['travel','combat'].includes(domain)&&bodyParty(s,leaderId,memberId,dungeonId))return true;const r=agreement(s,leaderId,memberId);return !!r&&(!custody.active(s,memberId)||custody.active(s,memberId).custodianId===leaderId)&&(domain==='travel'?r.allowTravel:r.allowCombat)&&(!dungeonId||!r.dungeonId||r.dungeonId===dungeonId);}
 function preparationAllowed(s,memberId,intent={}){
  if(!['equip','unequip','use-restorative-item','use-prebattle-pill','use-field-ability','stop-maintenance','switch-martial-soul'].includes(intent.type)||(intent.targetId??memberId)!==memberId)return false;
  if(intent.type==='use-field-ability'&&!s.技能.列表[intent.skillId]?.effectGraph?.nodes.some(n=>n.effectId==='target.self'))return false;
  const body=globalThis.SoulCombatDeployments?.bodyOuting(s,null,memberId);return !!body&&bodyParty(s,body.casterId,memberId)&&actions.colocated(s,body.casterId,memberId)&&!actions.battleOf(s,body.casterId)||table(s).agreements.some(r=>r.memberId===memberId&&permits(s,r.leaderId,memberId,'combat')&&actions.colocated(s,r.leaderId,memberId)&&!actions.battleOf(s,r.leaderId));
 }
 function retainedOrigin(s,ref,leaderId,memberId){
  const original=table(s).agreements.find(r=>r.id===ref.originalCooperationId),departure=s.人物.列表[memberId]?.扩展?.同行约定?.find(r=>r.id===ref.departureId);
  const allocation=s.远征?.扩展?.lootAgreements?.find(r=>r.expeditionId===ref.expeditionId&&r.playerId===leaderId);
  if(!original||original.leaderId!==leaderId||original.memberId!==memberId||!departure||departure.playerId!==leaderId||departure.personId!==memberId||!departure.events.some(e=>e.status==='active'&&e.expeditionId===ref.expeditionId)||!allocation?.membership.some(m=>m.personId===memberId&&m.kind==='party'&&m.membershipId===original.id))throw Error('保留席位缺少原合作、出发或分配来源');
  return original;
 }
 function tripAgreement(s,active,companion){
  const membership=active.lootAgreement?.membership.find(m=>m.personId===companion.unitId),expected=membership?.kind==='party'?table(s).agreements.find(r=>r.id===membership.membershipId):null;
  if(!expected){if(companion.cooperationId)throw Error('远征合作缺少冻结的成员来源');return null;}
  if(companion.cooperationId!==expected.id||companion.kind!=='party')throw Error('远征席位不能删除或替换原合作依据');
  const ref={expeditionId:active.id,originalCooperationId:companion.cooperationId,departureId:companion.agreementId};
  let r=retainedOrigin(s,ref,active.leaderId,companion.unitId);const seen=new Set();
  if(companion.membershipId!==r.id)throw Error('远征席位与原合作不一致');
  while(r){
   if(seen.has(r.id))throw Error('合作承接出现循环');seen.add(r.id);
   const next=table(s).agreements.filter(n=>n.retainedFrom?.previousCooperationId===r.id&&n.retainedFrom.expeditionId===active.id&&table(s).events.some(e=>e.agreementId===n.id&&['imposed','accepted'].includes(e.kind)));
   if(next.length>1)throw Error('同一保留席位重复承接');if(!next.length)return r;r=next[0];
  }
  return null;
 }
 function tripPermission(s,active,companion,domain){
  const r=tripAgreement(s,active,companion);if(!r){const allowed=!companion.bodyOutingRef||permits(s,active.leaderId,companion.unitId,domain,active.dungeonId);return {available:allowed,reason:allowed?'':'真身同行的实际出画权限已结束',cooperationId:null};}
  const reason=invalidReason(s,r)||(!permits(s,r.leaderId,r.memberId,domain,active.dungeonId)?'当前合作不允许本次远征行动':'');
  return {available:!reason,reason,cooperationId:r.id,sourceEventId:table(s).events.filter(e=>e.agreementId===r.id).at(-1)?.id,originalCooperationId:companion.cooperationId};
 }
 const departureProviders=new Map();
 function registerDepartureProvider(name,verify){if(typeof name!=='string'||typeof verify!=='function'||departureProviders.has(name))throw Error('离队来源重复或无效');departureProviders.set(name,verify);}
 registerDepartureProvider('resident-body',(s,memberId,agreementId,event)=>globalThis.SoulCombatDeployments.departureProof(s,memberId,agreementId,event));
 function departureProof(s,memberId,agreementId,event){
  if(event?.departureRef){const verify=departureProviders.get(event.departureRef.provider);if(!verify)throw Error('未登记的实际离队来源');return verify(s,memberId,agreementId,event);}
  const receipt=s.远征?.processedTransactions?.[event?.settlementId],departure=receipt?.departures?.find(d=>d.unitId===memberId&&d.agreementId===agreementId),encounter=s.遭遇?.列表?.[event?.encounterId],terminal=encounter?.terminal;
  if(event?.status!=='departed'||receipt?.type!=='expedition-combat-won'||receipt.expeditionId!==event.expeditionId||receipt.battleId!==event.battleId||!departure||!same(departure.position,event.position)||departure.battleStatus!==event.battleStatus||!['escaped','removed'].includes(event.battleStatus)||encounter?.expeditionId!==event.expeditionId||encounter.battleId!==event.battleId||encounter.expeditionReward?.transactionId!==event.settlementId||terminal?.memberStatuses?.[memberId]!==event.battleStatus||!terminal.participantIds.includes(memberId)||event.position?.locationId!==encounter.locationId||event.position?.sceneId!==`expedition:${event.expeditionId}:${encounter.nodeId}`)throw Error('离场成员缺少原房间的实际退出来源');
  return departure;
 }
 function ownRetainedSlot(s,leaderId,memberId){
  const instances=globalThis.SoulExpeditionContext.instances(s),matches=instances.filter(a=>a.leaderId===leaderId).flatMap(a=>a.companions.filter(c=>c.unitId===memberId).map(c=>({active:a,companion:c})));
  if(!matches.length)return null;if(matches.length!==1)throw Error('人物存在重复远征席位');
  const slot=matches[0];if(!slot.companion.cooperationId||!actions.colocated(s,leaderId,memberId))throw Error('只能在原现场承接自己的合作席位');
  if(!slot.companion.active){
   const departed=s.人物.列表[memberId].扩展.同行约定.find(r=>r.id===slot.companion.agreementId)?.events.at(-1);departureProof(s,memberId,slot.companion.agreementId,departed);
   if(!same(departed.position,actions.positionOf(s,memberId)))throw Error('原席位缺少实际离场来源');
  }
  return {...slot,current:tripAgreement(s,slot.active,slot.companion)};
 }
 function rejoinRetained(s,r,sourceId){
  const slot=ownRetainedSlot(s,r.leaderId,r.memberId);if(!slot||slot.companion.active)return;
  slot.companion.active=true;delete s.人物.列表[r.memberId].spaceId;
  if(r.memberId===s.角色.主控单位ID){delete s.远征.sessions[slot.active.id];s.远征.当前=slot.active;}
  const departure=s.人物.列表[r.memberId].扩展.同行约定.find(d=>d.id===slot.companion.agreementId),authority=table(s).events.at(-1);departure.status='active';departure.events.push({status:'active',revision:s.系统.revision,time:clone(s.世界.时间),expeditionId:slot.active.id,cooperationId:r.id,sourceId,authorityEventId:authority.id,order:authority.order});
 }
 function newRetainedReference(s,leaderId,memberId){
  const slot=ownRetainedSlot(s,leaderId,memberId);if(!slot)return null;
  const event=table(s).events.filter(e=>e.agreementId===slot.current.id).at(-1);
  if(slot.current.status!=='ended'||event?.kind!=='ended')throw Error('原合作尚未结束，不能另建席位依据');
  return {expeditionId:slot.active.id,originalCooperationId:slot.companion.cooperationId,departureId:slot.companion.agreementId,previousCooperationId:slot.current.id,previousEventId:event.id};
 }
 function join(s,r,h){
  const target=s.人物.列表[r.memberId];people.assertAlive(s,r.leaderId);people.assertAlive(s,r.memberId);if(!target||r.memberId===r.leaderId)throw Error('合作必须由不同的两人建立');
  const ownershipReason=h.joinReason(s,r.leaderId,r.memberId);if(ownershipReason)throw Error(ownershipReason);
  const ids=h.occupied(s,r.leaderId);
  if(ids.includes(r.memberId)){
   const slot=ownRetainedSlot(s,r.leaderId,r.memberId);
   if(!slot||slot.current.id!==r.id&&(!r.retainedFrom||!same(r.retainedFrom,newRetainedReference(s,r.leaderId,r.memberId)))||table(s).agreements.some(a=>a.memberId===r.memberId&&a.id!==r.id&&!invalidReason(s,a))||(s.远征?.companionContracts??[]).some(c=>c.unitId===r.memberId)||(target.扩展?.社交约定??[]).some(c=>c.kind==='party'&&c.status==='completed'))throw Error('该人物已有其他队伍依据，不能借用保留席位');
  }else if(r.retainedFrom)throw Error('原远征席位已经不存在');
  if(new Set([...ids,r.memberId]).size>3)throw Error('队伍已满，所有来源合计四人');
  if(h.busy(s,r.memberId)||h.busy(s,r.leaderId))throw Error('人物另有未结束的主要安排');
  h.ensureBody(s,r.memberId);h.ensureBody(s,r.leaderId);
 }
 function execute(s,q,sourceId,h){
  let r;if(['propose-person-cooperation','impose-person-cooperation'].includes(q.type)){
   communicate(s,q.actorId,q.targetId);const controlled=q.type==='impose-person-cooperation';
   if(!['temporary','long-term'].includes(q.membership??'temporary')||!controlled&&!['voluntary','coerced'].includes(q.basis??'voluntary')||q.allowTravel!==undefined&&typeof q.allowTravel!=='boolean'||q.allowCombat!==undefined&&typeof q.allowCombat!=='boolean')throw Error('合作方式或行动许可无效');
   const duration=q.durationMinutes??1440;if(!Number.isSafeInteger(duration)||duration<1||duration>30*1440)throw Error('临时合作期限须为1分钟至30日');
   r={id:`cooperation:${sourceId}`,sourceId,leaderId:q.actorId,memberId:q.targetId,custodyAuthority:custody.currentAuthority(s,q.targetId),membership:q.membership??'temporary',basis:controlled?'controlled':q.basis??'voluntary',dungeonId:q.dungeonId||null,allowTravel:q.allowTravel!==false,allowCombat:q.allowCombat===true,lootPolicy:'separate-agreement',createdAt:now(s),expiresAt:(q.membership??'temporary')==='temporary'?now(s)+duration:null,status:'proposed',controlSources:[],response:null,retainedFrom:null};
   if(!r.allowTravel&&!r.allowCombat)throw Error('合作须有明确的旅行或参战范围');if(r.dungeonId&&!h.dungeons()[r.dungeonId])throw Error('合作指定的副本不存在');
   if(table(s).agreements.some(a=>a.leaderId===r.leaderId&&a.memberId===r.memberId&&['proposed','active','suspended'].includes(a.status)))throw Error('双方已有待处理的合作安排');
   r.retainedFrom=newRetainedReference(s,r.leaderId,r.memberId);join(s,r,h);if(controlled){r.controlSources=controlProof(s,r);r.status='active';}
   save(s,r,controlled?'imposed':'proposed',q.actorId,sourceId,{positions:{[r.leaderId]:clone(actions.positionOf(s,r.leaderId)),[r.memberId]:clone(actions.positionOf(s,r.memberId))}});
  }else{
   const prior=table(s).agreements.find(r=>r.id===q.cooperationId);if(!prior||![prior.leaderId,prior.memberId].includes(q.actorId))throw Error('没有本人这项合作');r=clone(prior);const other=q.actorId===r.leaderId?r.memberId:r.leaderId;
   if(q.type==='end-person-cooperation'){
    actions.resolve(s,{actorId:q.actorId,battleId:null});if(!['proposed','active','suspended'].includes(r.status))throw Error('合作已经结束');if(r.basis==='controlled'&&q.actorId===r.memberId&&!invalidReason(s,r))throw Error('原强制控制仍然有效，须先实际解除或抵抗该来源');r.status='ended';r.endedAt=now(s);r.reason=String(q.reason??'本人结束合作');save(s,r,'ended',q.actorId,sourceId);
   }else{
    communicate(s,q.actorId,other);
    if(custodyChanged(s,r))throw Error('对方已换了关押者，请重新商定合作。');
    if(q.type==='respond-person-cooperation'){
     if(r.memberId!==q.actorId||r.status!=='proposed'||r.basis==='controlled'||typeof q.accept!=='boolean'||typeof q.reason!=='string'||!q.reason.trim()||q.reason.length>600)throw Error('须由受邀者本人明确回应与理由');
     r.response={actorId:q.actorId,accept:q.accept,reason:q.reason,at:now(s),sourceId};
     if(q.accept){const attitude=r.basis==='voluntary'&&globalThis.SoulWorldEngine.playerAttitudeReason(s,r.leaderId,r.memberId);if(attitude)throw Error(attitude);join(s,r,h);if(r.expiresAt!==null&&r.expiresAt<=now(s))throw Error('原临时合作已经到期');r.status='active';}else r.status='rejected';save(s,r,q.accept?'accepted':'rejected',q.actorId,sourceId,{positions:{[r.leaderId]:clone(actions.positionOf(s,r.leaderId)),[r.memberId]:clone(actions.positionOf(s,r.memberId))}});
    }else{
     if(q.actorId!==r.leaderId||r.status!=='suspended'||r.expiresAt!==null&&r.expiresAt<=now(s))throw Error('只有仍有效期内的暂停合作能重新提议');join(s,r,h);r.response=null;if(r.basis==='controlled'){r.controlSources=controlProof(s,r);r.status='active';}else r.status='proposed';save(s,r,'renewed',q.actorId,sourceId,{positions:{[r.leaderId]:clone(actions.positionOf(s,r.leaderId)),[r.memberId]:clone(actions.positionOf(s,r.memberId))}});
    }
   }
  }
  if(r.status==='active')rejoinRetained(s,r,sourceId);
  return {type:'person-cooperation',action:q.type,actorId:q.actorId,targetId:r.memberId,cooperationId:r.id,status:r.status,basis:r.basis,membership:r.membership,summary:r.status==='active'?(r.basis==='controlled'?'已命令对方按约定范围参与行动。':r.basis==='coerced'?'对方同意了这次暂时合作。':'对方接受了这份合作安排。'):r.status==='proposed'?'合作提议已经提出，等待对方本人决定。':r.reason??'合作回应已经登记。'};
 }
 function reconcile(s){if(!s.世界)return;for(const original of table(s).agreements.filter(r=>['proposed','active','suspended'].includes(r.status))){const r=clone(original),expired=r.expiresAt!==null&&r.expiresAt<=now(s),dead=[r.leaderId,r.memberId].some(id=>s.人物.列表[id]?.status==='dead'),changed=custodyChanged(s,r),reason=changed?'原看管权限已经交接，原合作结束':expired?'合作期限届满':dead?'合作一方死亡':r.status==='active'?invalidReason(s,r):'';if(!reason)continue;r.status=expired||dead||changed?'ended':'suspended';r.reason=reason;if(r.status==='ended')r.endedAt=now(s);save(s,r,r.status,r.leaderId,`${r.id}:${r.status}:${now(s)}`);}}
 function nextAt(s,through=Infinity){const times=table(s).agreements.filter(r=>['proposed','active','suspended'].includes(r.status)).map(r=>r.expiresAt).filter(t=>Number.isSafeInteger(t)&&t<=through&&t>now(s));return times.length?Math.min(...times):null;}
 function completeTrip(s,agreementId,expeditionId){const original=table(s).agreements.find(r=>r.id===agreementId);if(!original||original.membership!=='temporary'||!['active','suspended','proposed'].includes(original.status))return;const r=clone(original);r.status='ended';r.endedAt=now(s);r.reason='本次约定远征已经结束';save(s,r,'ended',r.leaderId,`expedition:${expeditionId}:cooperation:${r.id}`);}
 function responseReason(s,r){if(!r||r.status!=='proposed'||r.basis==='controlled'||r.expiresAt!==null&&r.expiresAt<=now(s))return '原提议已失效';try{communicate(s,r.memberId,r.leaderId);return '';}catch(error){return error.message;}}
 function facts(s,viewerId){return table(s).agreements.filter(r=>[r.leaderId,r.memberId].includes(viewerId)).map(r=>{const {controlSources,hash,...visible}=clone(r);if(visible.response&&visible.response.actorId!==viewerId)delete visible.response.reason;return {...visible,controlDomains:controlSources.map(p=>p.domain),leaderName:s.人物.列表[r.leaderId].name,memberName:s.人物.列表[r.memberId].name,currentReason:invalidReason(s,r),canRespond:r.memberId===viewerId&&!responseReason(s,r),canAwaitNpc:r.leaderId===viewerId&&r.memberId!==s.角色.主控单位ID&&!responseReason(s,r)};});}
 function validate(s,h){
  const d=s.世界.cooperation;if(!d)return [];const errors=[],latest=new Map(),counts=new Map(),ids=new Set(),activeMembers=new Set();if(d.version!==1||!Array.isArray(d.agreements)||!Array.isArray(d.events))return ['合作账本无效'];
  for(const e of d.events){const old=latest.get(e.agreementId),index=counts.get(e.agreementId)??0;if(!validStamp(e)||!validStamp(e.record)||e.id!==`${e.agreementId}:event:${index}`||e.agreementId!==e.record.id||e.previousHash!==(old?.record.hash??null)||!Number.isSafeInteger(e.at)||e.at>now(s)||old&&e.at<old.at||!Number.isSafeInteger(e.order)||e.order>s.扩展.personEventSequence||old&&e.order<=old.order||!old&&!['proposed','imposed'].includes(e.kind))errors.push('合作事件链无效');latest.set(e.agreementId,e);counts.set(e.agreementId,index+1);}
  for(const r of d.agreements)try{
   const events=d.events.filter(e=>e.agreementId===r.id),first=events[0];if(!first||ids.has(r.id)||r.id!==`cooperation:${r.sourceId}`||!same(latest.get(r.id)?.record,r)||!validStamp(r)||!s.人物.列表[r.leaderId]||!s.人物.列表[r.memberId]||r.leaderId===r.memberId)throw Error('身份');ids.add(r.id);
   for(const key of ['id','sourceId','leaderId','memberId','membership','basis','dungeonId','allowTravel','allowCombat','lootPolicy','createdAt','expiresAt','retainedFrom','custodyAuthority'])if(!same(r[key],first.record[key]))throw Error('合同被改写');
   if(!same(r.custodyAuthority,custody.historicalAuthority(s,r.memberId,first.at,first.order)))throw Error('合作开始时看管来源不符');
   if(!same(first.positions[r.leaderId],first.positions[r.memberId])||!['temporary','long-term'].includes(r.membership)||!['voluntary','coerced','controlled'].includes(r.basis)||typeof r.allowTravel!=='boolean'||typeof r.allowCombat!=='boolean'||!r.allowTravel&&!r.allowCombat||r.lootPolicy!=='separate-agreement'||r.createdAt!==first.at||r.membership==='temporary'&&(!Number.isSafeInteger(r.expiresAt)||r.expiresAt<=r.createdAt||r.expiresAt-r.createdAt>30*1440)||r.membership==='long-term'&&r.expiresAt!==null||r.dungeonId&&!h.dungeons()[r.dungeonId])throw Error('合作条款');
   if(r.retainedFrom){
    const ref=r.retainedFrom;if(Object.keys(ref).sort().join(',')!==['departureId','expeditionId','originalCooperationId','previousCooperationId','previousEventId'].sort().join(','))throw Error('承接字段');
    retainedOrigin(s,ref,r.leaderId,r.memberId);
    const previous=table(s).agreements.find(a=>a.id===ref.previousCooperationId),end=table(s).events.find(e=>e.id===ref.previousEventId);
    if(!previous||previous.leaderId!==r.leaderId||previous.memberId!==r.memberId||end?.agreementId!==previous.id||end.kind!=='ended'||end.record.status!=='ended'||end.order>=first.order||end.at>r.createdAt||previous.status!=='ended'||(previous.retainedFrom?previous.retainedFrom.expeditionId!==ref.expeditionId||previous.retainedFrom.originalCooperationId!==ref.originalCooperationId||previous.retainedFrom.departureId!==ref.departureId:previous.id!==ref.originalCooperationId))throw Error('承接须源自同一席位的实际结束事件');
    if(events.some(e=>['imposed','accepted'].includes(e.kind))&&table(s).agreements.some(a=>a.id!==r.id&&a.retainedFrom?.previousCooperationId===previous.id&&table(s).events.some(e=>e.agreementId===a.id&&['imposed','accepted'].includes(e.kind))))throw Error('同一席位被重复承接');
   }
   const terms=['id','sourceId','leaderId','memberId','membership','basis','dungeonId','allowTravel','allowCombat','lootPolicy','createdAt','expiresAt','retainedFrom','custodyAuthority'];
   let phase=null;
   for(const e of events){const allowed=phase===null?['proposed','imposed']:phase==='proposed'?['accepted','rejected','ended']:phase==='active'?['suspended','ended']:phase==='suspended'?['renewed','ended']:[];if(!allowed.includes(e.kind)||e.kind==='suspended'&&r.basis!=='controlled')throw Error('合作阶段顺序');const a=e.record;if(terms.some(k=>!same(a[k],first.record[k])))throw Error('历史合作条款被改写');if(!['proposed','imposed','accepted','rejected','renewed','suspended','ended'].includes(e.kind)||['proposed','imposed','renewed','suspended'].includes(e.kind)&&e.actorId!==r.leaderId||e.kind==='imposed'&&r.basis!=='controlled'||e.kind==='proposed'&&r.basis==='controlled'||['accepted','rejected'].includes(e.kind)&&r.basis==='controlled'||e.kind==='ended'&&![r.leaderId,r.memberId].includes(e.actorId)||r.basis!=='controlled'&&a.controlSources.length||['proposed','imposed'].includes(e.kind)&&a.response!==null)throw Error('合作事件身份或依据');const expected=e.kind==='proposed'?'proposed':e.kind==='imposed'?'active':e.kind==='accepted'?'active':e.kind==='rejected'?'rejected':e.kind==='renewed'?(r.basis==='controlled'?'active':'proposed'):e.kind;if(a.status!==expected||phase===null&&!['proposed','imposed'].includes(e.kind)||['accepted','rejected'].includes(e.kind)&&(phase!=='proposed'||e.actorId!==r.memberId)||e.kind==='renewed'&&phase!=='suspended'||e.kind==='suspended'&&phase!=='active'||e.kind==='ended'&&!['active','proposed','suspended'].includes(phase))throw Error('合作阶段');
    if(['accepted','rejected'].includes(e.kind)&&(!a.response||a.response.actorId!==r.memberId||a.response.sourceId!==e.sourceId||a.response.at!==e.at||a.response.accept!==(e.kind==='accepted')||typeof a.response.reason!=='string'||!a.response.reason.trim()))throw Error('合作回应');
    if(a.basis==='controlled'&&a.status==='active')for(const proof of a.controlSources){const st=proof.status,n=st?.扩展?.持续来源合同?.effectGraph.nodes.find(n=>n.id===st.来源.效果ID);if(!['移动','战斗'].includes(proof.domain)||proof.sourceStatusId!==st?.id||st.目标单位ID!==r.memberId||st.来源.单位ID!==r.leaderId||!influence.CONTROL_IDS.includes(st.模板ID)||!abilities.verify(st.扩展.持续来源合同).pass||n?.effectId!==st.模板ID||![proof.domain,'全部'].includes(n?.params.命令域))throw Error('强制参与来源');}
    if(a.basis==='controlled'&&a.status==='active'&&(!same(a.controlSources.map(p=>p.domain),[r.allowTravel?'移动':null,r.allowCombat?'战斗':null].filter(Boolean))||a.response!==null))throw Error('强制参与域或伪造同意');phase=a.status;
   }
   if(r.status==='active'){if(invalidReason(s,r)||activeMembers.has(r.memberId))throw Error('当前合作来源失效或重复');activeMembers.add(r.memberId);if(h.occupied(s,r.leaderId).length>3)throw Error('统一队伍超过四人');}
  }catch(error){errors.push(`合作${r.id}无效：${error.message}`);}
  for(const id of latest.keys())if(!ids.has(id))errors.push('合作历史缺少当前记录');return errors;
 }
 return Object.freeze({INTENTS,table,execute,reconcile,nextAt,completeTrip,registerDepartureProvider,departureProof,tripAgreement,tripPermission,members,agreement,wasMemberAt,permits,preparationAllowed,invalidReason,responseReason,facts,validate});
});
