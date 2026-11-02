(function(root,factory){
 const get=(name,file)=>root[name]??require(file);
 const api=factory(get('SoulWorldEngine','./world-engine.js'),get('SoulWorldSocial','./world-social-core.js'),get('SoulActionContext','./action-context-core.js'),get('SoulExpeditionContext','../../shared/expedition-context-core.js'));
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.SoulExpeditionLoot=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(world,social,actions,expeditions){
 'use strict';
 const copy=value=>structuredClone(value);
 const records=state=>state.远征?.扩展?.lootAgreements??[];
 const sign=(state,agreement,personId)=>(state.人物.列表[personId]?.扩展?.社交约定??[]).find(r=>r.id===agreement.signatures[personId]);
 function roster(state,dungeonId,leaderId=state.角色.主控单位ID){
  return [...world.partyMembers(state,leaderId).filter(p=>p.present&&(p.cooperationId?(p.allowTravel&&globalThis.SoulCooperationCore.permits(state,leaderId,p.personId,'combat',dungeonId)):(['long-term','ability'].includes(p.membership)||p.dungeonId===dungeonId))).map(p=>({personId:p.personId,membershipId:p.membershipId,kind:'party'})),
   ...(state.远征?.companionContracts??[]).filter(c=>c.dungeonId===dungeonId&&c.leaderId===leaderId).map(c=>({personId:c.unitId,membershipId:c.agreementId,kind:'hired'}))].sort((a,b)=>a.personId.localeCompare(b.personId));
 }
 function terms(state,value,leaderId=state.角色.主控单位ID){
  if(typeof value==='string'){try{value=JSON.parse(value);}catch{throw Error('分配条款须为有效JSON');}}
  if(!value||Array.isArray(value)||Object.keys(value).some(k=>!['shares','itemOwners','remainderOwner','itemTargets'].includes(k)))throw Error('分配条款字段无效');
  const shares=value.shares,itemOwners=value.itemOwners??{},remainderOwner=value.remainderOwner??null;
  if(!shares||Array.isArray(shares)||Object.keys(shares).length<1||Object.keys(shares).length>4||!Object.hasOwn(shares,leaderId))throw Error('分配须明确包含实际领队的各方份额');
  for(const [id,n] of Object.entries(shares))if(!state.人物.列表[id]||!Number.isSafeInteger(n)||n<1||n>10000)throw Error('份额须为已登记人物的1至10000整数权重');
  if(!itemOwners||typeof itemOwners!=='object'||Array.isArray(itemOwners))throw Error('指定物品归属无效');
  for(const [template,id] of Object.entries(itemOwners))if(!world.ITEM_TEMPLATES[template]||world.ITEM_TEMPLATES[template].type==='魂环'||!Object.hasOwn(shares,id))throw Error('只能约定有效非魂环模板及本协议成员；不能预分消散魂环');
  const itemTargets=value.itemTargets??[];if(!Array.isArray(itemTargets)||itemTargets.length>8)throw Error('指定数量条款最多八项');
  const targets=itemTargets.map(t=>{if(!t||Object.keys(t).some(k=>!['templateId','personId','quantity','name'].includes(k))||!world.ITEM_TEMPLATES[t.templateId]||world.ITEM_TEMPLATES[t.templateId].type==='魂环'||!Object.hasOwn(shares,t.personId)||!Number.isSafeInteger(t.quantity)||t.quantity<1||t.quantity>999||t.name!==undefined&&(typeof t.name!=='string'||!t.name.trim()||t.name.length>120))throw Error('指定收获须为有效模板、领取人和1至999件；不能预分魂环');return {templateId:t.templateId,personId:t.personId,quantity:t.quantity,...(t.name?{name:t.name.trim()}:{})};}).sort((a,b)=>(a.templateId+':'+(a.name??'')).localeCompare(b.templateId+':'+(b.name??'')));
  if(targets.some((t,i)=>Object.hasOwn(itemOwners,t.templateId)||targets.some((o,j)=>j<i&&o.templateId===t.templateId&&(!o.name||!t.name||o.name===t.name))))throw Error('同类指定收获条款重复或范围重叠，请合并清楚');
  if(remainderOwner!==null&&!Object.hasOwn(shares,remainderOwner))throw Error('余数归属须为本协议成员或留待协商');
  const gcd=(a,b)=>b?gcd(b,a%b):a,divisor=Object.values(shares).reduce(gcd);
  return {shares:Object.fromEntries(Object.entries(shares).map(([id,n])=>[id,n/divisor]).sort(([a],[b])=>a.localeCompare(b))),itemOwners:Object.fromEntries(Object.entries(itemOwners).sort(([a],[b])=>a.localeCompare(b))),remainderOwner,...(targets.length?{itemTargets:targets}:{})};
 }
 function entitlement(terms,personId){
  const total=Object.values(terms.shares).reduce((a,b)=>a+b,0),weight=terms.shares[personId]??0,gcd=(a,b)=>b?gcd(b,a%b):a,d=gcd(weight,total);
  return JSON.stringify({fraction:[weight/d,total/d],rounding:terms.remainderOwner===personId||terms.remainderOwner===null?Object.values(terms.shares).map(n=>{const f=gcd(n,total);return `${n/f}/${total/f}`;}).sort():null,remainder:terms.remainderOwner===personId?'self':terms.remainderOwner===null?'shared':'other',items:Object.fromEntries(Object.entries(terms.itemOwners).map(([key,id])=>[key,id===personId?'self':'other'])),targets:(terms.itemTargets??[]).map(t=>({...t,personId:t.personId===personId?'self':'other'}))});
 }
 function hasConsent(state,agreement,personId){
  const record=sign(state,agreement,personId);if(record?.status!=='completed')return false;
  const origin=records(state).find(a=>a.id===record.allocationId);
  if(record.kind!=='loot'||record.personId!==personId||record.playerId!==agreement.playerId||!origin||origin.playerId!==agreement.playerId||origin.signatures[personId]!==record.id||JSON.stringify(record.terms)!==JSON.stringify(origin.terms))return false;
  return origin===agreement||agreement.inherited?.[personId]===origin.id&&origin.version<agreement.version&&origin.dungeonId===agreement.dungeonId&&JSON.stringify(origin.membership)===JSON.stringify(agreement.membership)&&entitlement(origin.terms,personId)===entitlement(agreement.terms,personId);
 }
 function propose(state,input,sourceId){
  const playerId=input.actorId??state.角色.主控单位ID;
  if(expeditions.forActor(state,playerId,{presentOnly:false}))throw Error('本次出发的分配已冻结，不能在途中改写');
  const block=world.worldActionBlockReason(state,{actorId:playerId,allowCaptivity:true});if(block)throw Error(block);
  const checked=terms(state,input.terms,playerId),members=roster(state,input.dungeonId,playerId);
  if(members.some(m=>m.kind==='party'&&!checked.shares[m.personId])||Object.keys(checked.shares).some(id=>id!==playerId&&!members.some(m=>m.personId===id)))throw Error('分配须包含本次在场同行成员，只能额外纳入已签约雇员');
  if(!checked.shares[input.characterId]||input.characterId===playerId)throw Error('请向条款中的同行人物本人提出分配');
  const membership=members.filter(m=>checked.shares[m.personId]);
  state.远征.扩展??={};state.远征.扩展.lootAgreements??=[];
  let agreement=records(state).filter(r=>r.playerId===playerId&&r.dungeonId===input.dungeonId&&!r.expeditionId).at(-1);
  if(!agreement||JSON.stringify(agreement.terms)!==JSON.stringify(checked)||JSON.stringify(agreement.membership)!==JSON.stringify(membership)){
   const previous=agreement;
   agreement={id:sourceId,version:records(state).length+1,dungeonId:input.dungeonId,playerId,terms:checked,membership,signatures:{},proposedAt:copy(state.世界.时间)};
   if(previous&&JSON.stringify(previous.membership)===JSON.stringify(membership))for(const m of membership)if(hasConsent(state,previous,m.personId)&&entitlement(previous.terms,m.personId)===entitlement(checked,m.personId)){agreement.inherited??={};agreement.inherited[m.personId]=sign(state,previous,m.personId).allocationId;agreement.signatures[m.personId]=previous.signatures[m.personId];}
   state.远征.扩展.lootAgreements.push(agreement);
  }
  const prior=sign(state,agreement,input.characterId);
  if(prior&&['pending','completed'].includes(prior.status))return {agreement:copy(agreement),prior:copy(prior)};
  agreement.signatures[input.characterId]=sourceId;
  return {agreement:copy(agreement),prior:null};
 }
 function available(state,record){
  const agreement=records(state).find(r=>r.id===record.allocationId),latest=records(state).filter(r=>r.playerId===record.playerId&&r.dungeonId===record.dungeonId&&!r.expeditionId).at(-1);
  const members=agreement?roster(state,agreement.dungeonId,agreement.playerId).filter(m=>agreement.terms.shares[m.personId]):[];
  return !!agreement&&agreement===latest&&record.playerId===agreement.playerId&&!expeditions.forActor(state,agreement.playerId,{presentOnly:false})&&agreement.signatures[record.personId]===record.id&&JSON.stringify(record.terms)===JSON.stringify(agreement.terms)&&JSON.stringify(agreement.membership)===JSON.stringify(members);
 }
 const postTrip=agreement=>agreement?.mode==='post-trip';
 function freeze(state,active,departureId){
  const party=active.companions.filter(c=>c.kind==='party'),agreement=records(state).filter(r=>r.playerId===active.leaderId&&r.dungeonId===active.dungeonId&&!r.expeditionId).at(-1);
  if(agreement){
   const members=active.companions.filter(c=>agreement.terms.shares[c.unitId]).map(c=>({personId:c.unitId,membershipId:c.kind==='party'?c.membershipId:c.agreementId,kind:c.kind})).sort((a,b)=>a.personId.localeCompare(b.personId));
   const prior=priorities(state).filter(p=>p.status==='waiting'&&p.participants.every(id=>agreement.terms.shares[id]));
   const conflict=prior.some(p=>agreement.terms.itemOwners[p.templateId]||(agreement.terms.itemTargets??[]).some(t=>t.templateId===p.templateId&&(!p.name||!t.name||p.name===t.name)));
   if(!conflict&&!party.some(c=>!agreement.terms.shares[c.unitId])&&JSON.stringify(members)===JSON.stringify(agreement.membership)&&agreement.membership.every(m=>hasConsent(state,agreement,m.personId))){agreement.expeditionId=active.id;return copy(agreement);}
  }
  if(!party.length)return null;
  const membership=party.map(c=>({personId:c.unitId,membershipId:c.membershipId,kind:'party'})).sort((a,b)=>a.personId.localeCompare(b.personId));
  const deferred={id:`loot-after-trip:${active.id}`,mode:'post-trip',departureId,version:records(state).length+1,dungeonId:active.dungeonId,playerId:active.leaderId,
   terms:terms(state,{shares:Object.fromEntries([active.leaderId,...membership.map(m=>m.personId)].map(id=>[id,1]))}),membership,signatures:{},proposedAt:copy(state.世界.时间),expeditionId:active.id};
  state.远征.扩展??={};(state.远征.扩展.lootAgreements??=[]).push(deferred);return copy(deferred);
 }
 function addStacks(source,destination){for(const [key,stack] of Object.entries(source)){destination[key]??={...copy(stack),quantity:0,provenance:[]};destination[key].quantity+=stack.quantity;destination[key].provenance.push(...copy(stack.provenance??[]));}}
 function settleMaterials(state,active){
  const agreement=active.lootAgreement;if(!agreement)return null;
  const allocation={id:active.id,agreementId:agreement.id,playerId:agreement.playerId,locationId:active.entranceLocationId,materials:{},pendingMaterials:{},items:[],settledAt:copy(state.世界.时间)};
  const total=Object.values(agreement.terms.shares).reduce((a,b)=>a+b,0);
  for(const [key,stack] of Object.entries(active.tempMaterials)){
   let remainder=stack.quantity;const row={fingerprint:key,name:stack.displayName,total:stack.quantity,recipients:{},pending:0};
   for(const [id,weight] of Object.entries(agreement.terms.shares)){const quantity=postTrip(agreement)?0:Number(BigInt(stack.quantity)*BigInt(weight)/BigInt(total));row.recipients[id]=quantity;remainder-=quantity;}
   if(agreement.terms.remainderOwner)row.recipients[agreement.terms.remainderOwner]+=remainder;else row.pending=remainder;
   for(const [id,quantity] of Object.entries(row.recipients))if(quantity){
    const destination=id===state.角色.主控单位ID?state.材料库.永久:((state.材料库.人物??={})[id]??={});
    addStacks({[key]:{...copy(stack),quantity}},destination);
   }
   if(row.pending)allocation.pendingMaterials[key]={...copy(stack),quantity:row.pending};
   allocation.materials[key]=row;
  }
  (state.远征.扩展.lootAllocations??=[]).push(allocation);return allocation;
 }
 const priorities=state=>state.远征?.扩展?.lootPriorities??[];
 const priorityFacts=(state,viewerId=state.角色.主控单位ID)=>{const visible=priorities(state).filter(p=>p.participants.includes(viewerId));return [...visible.filter(p=>p.status!=='fulfilled'),...visible.filter(p=>p.status==='fulfilled').slice(-8)].map(p=>({...copy(p),...(p.distributionId?{meaning:'已由原领队在战后窗口实际分配，不代表人物同意或独立答复'}:{})}));};
 const matches=(selector,item)=>selector.templateId===item.templateId&&(!selector.name||selector.name===item.name);
 function targetKey(target){return target.templateId+':'+(target.name??'');}
 function settleItem(state,active,allocation,item){
  const originalId=item.id,originalQuantity=item.quantity;let remaining=originalQuantity;
  const place=(quantity,personId,extra={})=>{
   let destination;
   if(personId){const person=state.人物.列表[personId],placement=world.previewItemPlacement(state,person.inventoryContainerId,{templateId:item.templateId,transferItemId:item.id});const position=actions.positionOf(state,personId),present=receivingAware(state,personId)&&position.kind==='location'&&!position.sceneId&&position.locationId===active.entranceLocationId;destination=present&&placement.pass?state.容器.列表[person.inventoryContainerId]:world.ensureLocationStash(state,personId,active.entranceLocationId);}
   else{const id=`container-loot-${active.id}`;state.容器.列表[id]??={id,type:'expedition-loot',ownerEntityId:'',locationId:active.entranceLocationId,itemIds:[],capacity:{infinite:true},status:'active',扩展:{allocationId:allocation.id}};destination=state.容器.列表[id];}
   const delivered=world.transferItem(state,item.id,destination.id,quantity);remaining-=quantity;delivered.legalOwnerEntityId=personId??'';delivered.stolen=false;
   delete delivered.payload.expeditionTemporary;delivered.payload.safelyExtracted=true;if(destination.type==='location-stash')delivered.payload.storedAtLocationId=active.entranceLocationId;
   allocation.items.push({itemId:delivered.id,personId,containerId:destination.id,status:personId?'allocated':'pending',sourceItemId:originalId,sourceQuantity:originalQuantity,quantity,templateId:delivered.templateId,name:delivered.name,...extra});return delivered;
  };
  const priority=priorities(state).find(p=>p.status==='waiting'&&p.sourceAllocationId!==allocation.id&&p.participants.every(id=>active.lootAgreement.terms.shares[id])&&matches(p,item));
  if(priority){const held=place(1,null,{priorityId:priority.id});Object.assign(priority,{status:'available',allocationId:allocation.id,itemId:held.id});}
  if(!remaining)return;
  const target=(active.lootAgreement.terms.itemTargets??[]).find(t=>matches(t,item));
  if(target){const used=allocation.items.filter(r=>r.targetKey===targetKey(target)).reduce((n,r)=>n+r.quantity,0),quantity=Math.min(item.quantity,target.quantity-used);if(quantity>0)place(quantity,target.personId,{targetKey:targetKey(target)});}
  if(!remaining)return;
  place(remaining,active.lootAgreement.terms.itemOwners[item.templateId]??null);
 }
 function directContext(state,allocationId,actorId,returnId){
  const allocation=(state.远征?.扩展?.lootAllocations??[]).find(a=>a.id===allocationId),agreement=allocation&&records(state).find(a=>a.id===allocation.agreementId);
  if(!allocation||!postTrip(agreement))throw Error('这次收获不属于战后直接分配');
  if(actorId!==allocation.playerId)throw Error('由本次远征的领队分配收获');
  if(returnId){
   const source=state.远征.processedTransactions[returnId];
   if(!source||!['expedition-cleared','expedition-safely-extracted','expedition-escort-rescue'].includes(source.type)||source.allocation?.id!==allocation.id||source.leaderId!==actorId||source.expeditionId!==allocation.id)throw Error('自动收获缺少本次实际返程来源');
   return {allocation,agreement,participants:Object.keys(agreement.terms.shares)};
  }
  const block=world.worldActionBlockReason(state,{actorId});if(block)throw Error(block);
  if(!socialAware(state,actorId))throw Error('领队当前无法清醒处理收获');
  actions.resolve(state,{actorId,battleId:null,requirements:['gesture']});
  const position=actions.positionOf(state,actorId);
  if(position.kind!=='location'||position.sceneId||position.locationId!==allocation.locationId)throw Error('请回到本次副本入口分配收获');
  return {allocation,agreement,participants:Object.keys(agreement.terms.shares)};
 }
 function directItemAuthorization(state,item,destination,quantity,authorization){
  try{
   const request=state.远征.commandRequests?.[authorization.distributionId],{allocation,participants}=directContext(state,authorization.lootAllocationId,authorization.actorId,request?.request?.returnId);
   return request?.type==='expedition-loot-distribute'&&request.requestHash===globalThis.SoulAbilityContract.hash(request.request)&&!state.远征.processedTransactions[authorization.distributionId]&&request.request.actorId===authorization.actorId&&request.request.allocationId===allocation.id&&
    request.request.items.some(row=>row.itemId===item.id&&row.recipientId===destination.ownerEntityId)&&participants.includes(destination.ownerEntityId)&&quantity===item.quantity&&
    allocation.items.some(row=>row.itemId===item.id&&row.status==='pending'&&row.containerId===item.containerId)&&state.容器.列表[item.containerId].扩展?.allocationId===allocation.id&&
    (destination.id===state.人物.列表[destination.ownerEntityId].inventoryContainerId||destination.type==='location-stash'&&destination.locationId===allocation.locationId);
  }catch{return false;}
 }
 function distribute(state,input,sourceId){
  const {allocation,participants}=directContext(state,input.allocationId,input.actorId,input.returnId);
  if(!Array.isArray(input.materials)||!Array.isArray(input.items)||input.materials.length>1000||input.items.length>1000)throw Error('分配清单格式无效');
  const materials=[],items=[],seen=new Set();
  for(const row of input.materials){
   const stack=allocation.pendingMaterials[row.fingerprint];
   if(!stack||seen.has(row.fingerprint)||!row.recipients||Array.isArray(row.recipients)||Object.keys(row).some(k=>!['fingerprint','recipients'].includes(k)))throw Error('请使用当前待分材料，每种材料只填写一次');seen.add(row.fingerprint);
   if(Object.entries(row.recipients).some(([id,n])=>!participants.includes(id)||!Number.isSafeInteger(n)||n<0))throw Error('材料数量须为本次成员的非负整数');
   const total=Object.values(row.recipients).reduce((sum,n)=>sum+n,0);
   if(total!==0&&total!==stack.quantity)throw Error('每种材料须分完整份，或全部留待稍后分配');
   if(total)materials.push({fingerprint:row.fingerprint,recipients:copy(row.recipients)});
  }
  seen.clear();
  for(const row of input.items){
   if(Object.keys(row).some(k=>!['itemId','recipientId'].includes(k))||!participants.includes(row.recipientId)||seen.has(row.itemId)||!allocation.items.some(i=>i.itemId===row.itemId&&i.status==='pending'))throw Error('请选择本次待分物品与实际参战成员');
   seen.add(row.itemId);items.push(row);
  }
  if(!materials.length&&!items.length)throw Error('请先填写材料数量或选择物品领取人');
  const delivery={id:sourceId,actorId:input.actorId,allocationId:allocation.id,at:copy(state.世界.时间),materials:[],items:[]};
  for(const row of materials){
   const stack=allocation.pendingMaterials[row.fingerprint],record=allocation.materials[row.fingerprint];
   for(const [id,quantity] of Object.entries(row.recipients))if(quantity){const destination=id===state.角色.主控单位ID?state.材料库.永久:((state.材料库.人物??={})[id]??={});addStacks({[stack.fingerprint]:{...copy(stack),quantity}},destination);record.recipients[id]=(record.recipients[id]??0)+quantity;}
   record.pending=0;delete allocation.pendingMaterials[row.fingerprint];delivery.materials.push(copy(row));
  }
  for(const row of items){
   const item=state.物品.实例[row.itemId],person=state.人物.列表[row.recipientId],position=actions.positionOf(state,person.id),present=person.status!=='dead'&&receivingAware(state,person.id)&&position.kind==='location'&&!position.sceneId&&position.locationId===allocation.locationId;
   const destination=present?state.容器.列表[person.inventoryContainerId]:world.ensureLocationStash(state,person.id,allocation.locationId);
   world.transferItem(state,item.id,destination.id,item.quantity,{lootAllocationId:allocation.id,distributionId:sourceId,actorId:input.actorId});item.legalOwnerEntityId=person.id;item.stolen=false;
   if(destination.type==='location-stash')item.payload.storedAtLocationId=allocation.locationId;
   const entry=allocation.items.find(i=>i.itemId===item.id);Object.assign(entry,{status:'allocated',personId:person.id,containerId:destination.id,distributionId:sourceId});
   delivery.items.push({itemId:item.id,recipientId:person.id,quantity:item.quantity,containerId:destination.id});
   const priority=priorities(state).find(p=>p.status==='available'&&p.allocationId===allocation.id&&p.itemId===item.id);
   if(priority)Object.assign(priority,{status:'fulfilled',distributionId:sourceId,answeredSourceId:sourceId,answeredAt:copy(delivery.at)});
  }
  delivery.order=globalThis.SoulPersonCore.nextEventOrder(state);
  delivery.observers=participants.filter(id=>id!==input.actorId&&receivingAware(state,id)&&actions.colocated(state,input.actorId,id)).flatMap(personId=>{
   const proof=social.communicationProof(state,personId);
   return proof.position.kind==='location'&&!proof.position.sceneId&&proof.position.locationId===allocation.locationId&&social.validCommunicationProof(state,proof,personId)?[{personId,proof,memoryContext:social.masksAtOrder(state,personId,delivery.order)}]:[];
  });
  (allocation.distributions??=[]).push(copy(delivery));return delivery;
 }
 function reactionSource(state,personId,deliveryId){
  const allocation=(state.远征?.扩展?.lootAllocations??[]).find(a=>a.distributions?.some(d=>d.id===deliveryId)),delivery=allocation?.distributions.find(d=>d.id===deliveryId),observer=delivery?.observers?.find(o=>o.personId===personId);
  if(!observer||!delivery.materials.length&&!delivery.items.length||personId===allocation.playerId)return null;
  const at=delivery.at.day*1440+delivery.at.hour*60+delivery.at.minute,receipt=state.远征.processedTransactions[deliveryId];
  if(receipt?.type!=='loot-distributed'||globalThis.SoulAbilityContract.hash(receipt.delivery)!==globalThis.SoulAbilityContract.hash(delivery)||!social.validCommunicationProof(state,observer.proof,personId,false,at,delivery.order))return null;
  return {trigger:{kind:'loot',id:delivery.id,rootId:'loot-distribution:'+delivery.id,order:delivery.order,at},memoryContext:copy(observer.memoryContext),facts:{leader:{id:allocation.playerId,name:state.人物.列表[allocation.playerId].name},participantCount:Object.keys(records(state).find(r=>r.id===allocation.agreementId).terms.shares).length,materials:delivery.materials.map(row=>({name:allocation.materials[row.fingerprint].name,received:row.recipients[personId]??0,distributedTotal:Object.values(row.recipients).reduce((sum,n)=>sum+n,0)})),items:delivery.items.filter(row=>row.recipientId===personId).map(row=>({name:allocation.items.find(i=>i.itemId===row.itemId).name,quantity:row.quantity})),settledAt:copy(delivery.at)}};
 }
 function reactionTriggers(state,personId){
  return (state.远征?.扩展?.lootAllocations??[]).flatMap(a=>(a.distributions??[]).flatMap(d=>{const source=reactionSource(state,personId,d.id);return source&&social.remembers(state,personId,source.trigger.at,source.memoryContext,source.trigger.order)?[source.trigger]:[];})).sort((a,b)=>a.order-b.order||a.at-b.at);
 }
 function distributionView(state,allocation,viewerId){
  const agreement=records(state).find(a=>a.id===allocation.agreementId);
  if(!postTrip(agreement))return null;
  const participants=Object.keys(agreement.terms.shares);let reason='';try{directContext(state,allocation.id,viewerId);}catch(error){reason=error.message;}
  const materials=Object.values(allocation.pendingMaterials).map(stack=>({fingerprint:stack.fingerprint,name:stack.displayName,quantity:stack.quantity})),items=allocation.items.filter(row=>row.status==='pending').map(row=>{const priority=priorities(state).find(p=>p.status==='available'&&p.allocationId===allocation.id&&p.itemId===row.itemId);return {itemId:row.itemId,name:state.物品.实例[row.itemId].name,quantity:row.quantity,...(priority?{priority:{personId:priority.personId,name:state.人物.列表[priority.personId].name}}:{})};});
  const plan=even=>({materials:materials.map(row=>{const each=even?Math.floor(row.quantity/participants.length):0;return {fingerprint:row.fingerprint,recipients:Object.fromEntries(participants.map(id=>[id,id===allocation.playerId?row.quantity-each*(participants.length-1):each]))};}),items:items.map(row=>({itemId:row.itemId,recipientId:even?row.priority?.personId??'':allocation.playerId}))});
  return {allocationId:allocation.id,available:!reason,reason,participants:participants.map(id=>({id,name:state.人物.列表[id].name})),materials,items,even:plan(true),leader:plan(false)};
 }
 function automaticPlan(state,allocationId){
  const allocation=(state.远征?.扩展?.lootAllocations??[]).find(a=>a.id===allocationId),agreement=allocation&&records(state).find(a=>a.id===allocation.agreementId);
  if(!postTrip(agreement))return null;
  const participants=Object.keys(agreement.terms.shares),total=Object.values(agreement.terms.shares).reduce((sum,n)=>sum+n,0);
  return {allocationId,actorId:allocation.playerId,materials:Object.values(allocation.pendingMaterials).map(stack=>{
   const recipients=Object.fromEntries(participants.map(id=>[id,Number(BigInt(stack.quantity)*BigInt(agreement.terms.shares[id])/BigInt(total))]));
   recipients[allocation.playerId]+=stack.quantity-Object.values(recipients).reduce((sum,n)=>sum+n,0);
   return {fingerprint:stack.fingerprint,recipients};
  }),items:allocation.items.filter(row=>row.status==='pending').map(row=>({itemId:row.itemId,recipientId:priorities(state).find(p=>p.status==='available'&&p.allocationId===allocation.id&&p.itemId===row.itemId)?.personId??allocation.playerId}))};
 }
 function nextPriority(value,participants){
  if(typeof value==='string'){try{value=JSON.parse(value);}catch{throw Error('优先协商条款须为有效JSON');}}
  if(value===undefined||value===null)return null;
  if(!value||Array.isArray(value)||Object.keys(value).some(k=>!['personId','templateId','name','kind','scope'].includes(k))||!participants.includes(value.personId)||!world.ITEM_TEMPLATES[value.templateId]||world.ITEM_TEMPLATES[value.templateId].type==='魂环'||value.kind!==undefined&&value.kind!=='negotiate-first'||value.scope!==undefined&&value.scope!=='next-shared-expedition-item'||value.name!==undefined&&(typeof value.name!=='string'||!value.name.trim()||value.name.length>120))throw Error('下次优先只表示原参与者共同取得指定非魂环收获时先向本人协商，不保证归属');
  return {kind:'negotiate-first',scope:'next-shared-expedition-item',personId:value.personId,templateId:value.templateId,...(value.name?{name:value.name.trim()}:{})};
 }
 function priorityDecision(state,record,sourceId){
  if(record.kind!=='loot-resolution'||!['completed','rejected'].includes(record.status))return;
  for(const p of priorities(state))if(p.status==='available'&&p.allocationId===record.terms.allocationId&&p.itemId===record.terms.resourceId&&p.personId===record.personId){p.status='fulfilled';p.firstProposalId=record.resolutionId;p.answeredSourceId=sourceId;p.answeredAt=copy(state.世界.时间);}
 }
 const resolutions=state=>state.远征?.扩展?.lootResolutions??[];
 const visibleRecords=(state,viewerId=state.角色.主控单位ID)=>records(state).filter(a=>a.playerId===viewerId||(state.人物.列表[viewerId]?.扩展?.社交约定??[]).some(r=>r.kind==='loot'&&r.allocationId===a.id));
 const visibleResolutions=(state,viewerId=state.角色.主控单位ID)=>resolutions(state).filter(a=>a.proposerId===viewerId||(state.人物.列表[viewerId]?.扩展?.社交约定??[]).some(r=>r.kind==='loot-resolution'&&r.resolutionId===a.id));
 function resolutionTerms(state,input){
  const allocation=(state.远征?.扩展?.lootAllocations??[]).find(a=>a.id===input.allocationId);
  if(!allocation)throw Error('没有这次实际返程的收获记录');
  const agreement=records(state).find(a=>a.id===allocation.agreementId),participants=Object.keys(agreement.terms.shares);
  if(postTrip(agreement))throw Error('这次收获请打开战利品分配窗口直接分配，无需发起协商');
  if(!['item','material'].includes(input.resourceKind)||typeof input.resourceId!=='string'||!participants.includes(input.recipientId)||!Number.isSafeInteger(input.quantity)||input.quantity<1)throw Error('请指定实际待分收获、本次参与者及正整数数量');
  const item=input.resourceKind==='item'?allocation.items.find(i=>i.itemId===input.resourceId&&i.status==='pending'):null;
  const stack=input.resourceKind==='material'?allocation.pendingMaterials[input.resourceId]:null;
  if(input.resourceKind==='item'?!item||state.物品.实例[item.itemId]?.quantity!==input.quantity:!stack||input.quantity>stack.quantity)throw Error('这份收获已分配、数量变化或不是本次待分实物；独立物品须整件交付以保留原编号');
  const priority=nextPriority(input.nextPriority,participants);
  return {allocationId:allocation.id,resourceKind:input.resourceKind,resourceId:input.resourceId,recipientId:input.recipientId,quantity:input.quantity,participants:participants.sort(),locationId:allocation.locationId,name:item?state.物品.实例[item.itemId].name:stack.displayName,...(priority?{nextPriority:priority}:{})};
 }
 function proposeResolution(state,input,sourceId){
  const playerId=input.actorId??state.角色.主控单位ID,block=world.worldActionBlockReason(state,{actorId:playerId,allowCaptivity:true});if(block)throw Error(block);
  const terms=resolutionTerms(state,input);
  if(!terms.participants.includes(playerId))throw Error('只有原分配参与者可以提出方案');
  if(!terms.participants.includes(input.characterId)||input.characterId===playerId)throw Error('请向本次实际分配的参与者本人征求意见；离队不丢失原权益');
  const first=priorities(state).find(p=>p.status==='available'&&p.allocationId===terms.allocationId&&p.itemId===terms.resourceId);
  if(first&&first.personId!==playerId&&first.personId!==input.characterId)throw Error('这件收获有已确认的优先协商约定，请先征求'+state.人物.列表[first.personId].name+'的意见；不等于保证归属');
  state.远征.扩展.lootResolutions??=[];
  let resolution=resolutions(state).filter(r=>r.terms.allocationId===terms.allocationId&&r.terms.resourceKind===terms.resourceKind&&r.terms.resourceId===terms.resourceId).at(-1);
  if(!resolution||resolution.proposerId!==playerId||resolution.status==='completed'||JSON.stringify(resolution.terms)!==JSON.stringify(terms)){
   resolution={id:sourceId,proposerId:playerId,terms,status:'pending',signatures:{},proposedAt:copy(state.世界.时间)};state.远征.扩展.lootResolutions.push(resolution);
  }
  if(first?.personId===playerId)Object.assign(first,{status:'fulfilled',firstProposalId:resolution.id,answeredSourceId:sourceId,answeredAt:copy(state.世界.时间)});
  const prior=(state.人物.列表[input.characterId].扩展.社交约定??[]).find(r=>r.id===resolution.signatures[input.characterId]);
  if(prior&&['pending','completed'].includes(prior.status))return {resolution:copy(resolution),prior:copy(prior)};
  resolution.signatures[input.characterId]=sourceId;return {resolution:copy(resolution),prior:null};
 }
 function resolutionAvailable(state,record){
  const current=resolutions(state).find(r=>r.id===record.resolutionId);
  if(!current||record.playerId!==current.proposerId||current.status!=='pending'||current.signatures[record.personId]!==record.id||JSON.stringify(current.terms)!==JSON.stringify(record.terms))return false;
  const latest=resolutions(state).filter(r=>r.terms.allocationId===current.terms.allocationId&&r.terms.resourceKind===current.terms.resourceKind&&r.terms.resourceId===current.terms.resourceId).at(-1);
  try{return latest===current&&JSON.stringify(resolutionTerms(state,current.terms))===JSON.stringify(current.terms);}catch{return false;}
 }
 function resolutionConsent(state,resolution){
  return resolution.terms.participants.filter(id=>id!==resolution.proposerId).every(id=>{
   const record=(state.人物.列表[id]?.扩展?.社交约定??[]).find(r=>r.id===resolution.signatures[id]);
   return record?.kind==='loot-resolution'&&record.playerId===resolution.proposerId&&record.personId===id&&record.resolutionId===resolution.id&&record.status==='completed'&&JSON.stringify(record.terms)===JSON.stringify(resolution.terms);
  });
 }
 function socialAware(state,id){try{actions.resolve(state,{actorId:id,battleId:null});return !globalThis.SoulControlCore.active(state,id).some(s=>['status.sleep','status.stun'].includes(s.模板ID));}catch{return false;}}
 function receivingAware(state,id){try{return social.validCommunicationProof(state,social.communicationProof(state,id),id);}catch{return false;}}
 function collectionAvailability(state,resolution,actorId=resolution.proposerId){
  if(!resolution.terms.participants.includes(actorId))return {available:false,reason:'只有原分配参与者可以领取'};
  const recipient=state.人物.列表[resolution.terms.recipientId];
  if(!recipient||!receivingAware(state,recipient.id)||!socialAware(state,actorId))return {available:false,reason:'交付人或领取人当前无法领取'};
  try{actions.resolve(state,{actorId,battleId:null,targetIds:[recipient.id],requirements:['gesture']});}catch(error){return {available:false,reason:error.message};}
  const position=actions.positionOf(state,actorId);
  if(position.kind!=='location'||position.sceneId||position.locationId!==resolution.terms.locationId)return {available:false,reason:'收获仍在返程暂存地点；交付人与领取人实际到场后才能交付'};
  return {available:true,reason:''};
 }
 function completeResolution(state,id,sourceId,automatic=false,actorId){
  const r=resolutions(state).find(r=>r.id===id);actorId??=r?.proposerId;
  if(r&&!r.terms.participants.includes(actorId))throw Error('只有原分配参与者可以领取');
  if(r?.status==='completed')return {resolutionId:r.id,status:'already-completed',...copy(r.delivery),name:r.terms.name};if(!r||!['pending','agreed'].includes(r.status))throw Error('这项分配方案不存在，不能领取');
  if(!resolutionConsent(state,r)){if(automatic)return null;throw Error('尚未得到原参与者全部确认，不能领取');}
  if(JSON.stringify(resolutionTerms(state,r.terms))!==JSON.stringify(r.terms))throw Error('待分实物发生变化，需要重新协商');
  const latest=resolutions(state).filter(other=>other.terms.allocationId===r.terms.allocationId&&other.terms.resourceKind===r.terms.resourceKind&&other.terms.resourceId===r.terms.resourceId).at(-1);
  if(latest!==r)throw Error('已有新的分配方案，旧方案不能领取');
  r.status='agreed';r.agreedAt??=copy(state.世界.时间);
  const availability=collectionAvailability(state,r,actorId);if(!availability.available){if(automatic)return {resolutionId:r.id,status:'agreed',reason:availability.reason};throw Error(availability.reason);}
  const allocation=state.远征.扩展.lootAllocations.find(a=>a.id===r.terms.allocationId),person=state.人物.列表[r.terms.recipientId];
  let containerId=null,receivedItemId=null;
  if(r.terms.resourceKind==='item'){
   const item=state.物品.实例[r.terms.resourceId],placement=world.previewItemPlacement(state,person.inventoryContainerId,{templateId:item.templateId,transferItemId:item.id});
   const destination=placement.pass?state.容器.列表[person.inventoryContainerId]:world.ensureLocationStash(state,person.id,r.terms.locationId);
   const received=world.transferItem(state,item.id,destination.id,item.quantity,{lootResolutionId:r.id,actorId});received.legalOwnerEntityId=person.id;received.stolen=false;containerId=destination.id;receivedItemId=received.id;
   if(destination.type==='location-stash')item.payload.storedAtLocationId=r.terms.locationId;
   const entry=allocation.items.find(i=>i.itemId===item.id);Object.assign(entry,{status:'allocated',personId:person.id,containerId,resolutionId:r.id});
  }else{
   const stack=allocation.pendingMaterials[r.terms.resourceId],quantity=r.terms.quantity,destination=person.id===state.角色.主控单位ID?state.材料库.永久:((state.材料库.人物??={})[person.id]??={});
   addStacks({[stack.fingerprint]:{...copy(stack),quantity}},destination);stack.quantity-=quantity;
   if(!stack.quantity)delete allocation.pendingMaterials[r.terms.resourceId];
   const row=allocation.materials[r.terms.resourceId];row.pending-=quantity;row.recipients[person.id]=(row.recipients[person.id]??0)+quantity;
  }
  r.status='completed';r.delivery={sourceId,actorId,at:copy(state.世界.时间),recipientId:person.id,quantity:r.terms.quantity,resourceKind:r.terms.resourceKind,resourceId:r.terms.resourceId,...(receivedItemId?{receivedItemId}:{}),containerId,locationId:r.terms.locationId};
  if(r.terms.nextPriority){state.远征.扩展.lootPriorities??=[];if(!priorities(state).some(p=>p.sourceResolutionId===r.id))state.远征.扩展.lootPriorities.push({id:`priority:${r.id}`,sourceResolutionId:r.id,sourceAllocationId:r.terms.allocationId,...copy(r.terms.nextPriority),participants:copy(r.terms.participants),status:'waiting',createdAt:copy(state.世界.时间)});}
  return {resolutionId:r.id,status:'completed',...copy(r.delivery),name:r.terms.name};
 }
 const commitments=state=>Object.values(state.人物?.列表??{}).flatMap(p=>p.扩展?.社交约定??[]).filter(r=>['loot','loot-resolution'].includes(r.kind));
 function recordProposal(state,input,sourceId,kind='loot'){
  if(Object.values(state.人物.列表).some(p=>(p.扩展?.社交约定??[]).some(r=>r.id===sourceId)))throw Error('这项分配提议编号已经使用');
  const value=kind==='loot'?propose(state,input,sourceId):proposeResolution(state,input,sourceId);
  if(value.prior)return {type:kind==='loot'?'loot-agreement-existing':'loot-resolution-existing',commitment:copy(value.prior),...(kind==='loot'?{agreementId:value.agreement.id,currentTerms:copy(value.agreement.terms),inheritedFrom:value.agreement.inherited?.[input.characterId]??null}:{resolutionId:value.resolution.id}),summary:'这位成员已收到或确认同一方案；原回应与条款保留，没有转移收获。'};
  const owner=kind==='loot'?value.agreement:value.resolution,playerId=kind==='loot'?owner.playerId:owner.proposerId;
  const record={id:sourceId,kind,playerId,personId:input.characterId,...(kind==='loot'?{allocationId:owner.id,dungeonId:owner.dungeonId}:{resolutionId:owner.id}),terms:copy(owner.terms),status:'pending',locationId:actions.positionOf(state,playerId).locationId,events:[]};
  social.appendCommitmentEvent(state,record,'pending',sourceId,{actorId:playerId,reason:'本人提出具体收获分配，等待另一方独立回应；既有同行、雇佣或控制不代替财物同意'});
  const person=state.人物.列表[record.personId];person.扩展??={};(person.扩展.社交约定??=[]).push(record);
  return {type:'commitment-proposed',commitment:copy(record),summary:'已提出这份收获分配方案，等待对方回应。'};
 }
 function pendingResponses(state,{respondentId,proposerId}={}){return commitments(state).filter(r=>r.status==='pending'&&(!respondentId||r.personId===respondentId)&&(!proposerId||r.playerId===proposerId)).map(copy);}
 function responseReason(state,record){
  if(record?.status!=='pending')return '原提议已经回应';
  try{social.communicate(state,record.personId,record.playerId);return '';}catch(error){return error.message;}
 }
 function validateResponse(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['accept','reason'].includes(k))||typeof value.accept!=='boolean'||typeof value.reason!=='string'||!value.reason.trim()||value.reason.length>600)throw Error('人物回应须包含接受或拒绝及简短理由');
  return {accept:value.accept,reason:value.reason};
 }
 // The story adapter establishes its own actual soul-device contact before settlement.
 // Direct actor workflows establish face-to-face contact in respondForActor below.
 function settleResponse(state,record,response,sourceId){
  globalThis.SoulInfluenceCore.assertVoluntary(state,record.personId);
  response=validateResponse(response);
  if(record.status!=='pending'||response.accept&&!(record.kind==='loot'?available(state,record):resolutionAvailable(state,record)))throw Error('原分配条款或参与者已经变化，需要新的提议');
  const detail={actorId:record.personId,reason:response.reason};
  social.appendCommitmentEvent(state,record,response.accept?'accepted':'rejected',sourceId,detail);
  let lootDelivery=null;
  if(response.accept){social.appendCommitmentEvent(state,record,'completed',sourceId,{...detail,...(record.kind==='loot'?{allocationId:record.allocationId}:{resolutionId:record.resolutionId})});if(record.kind==='loot-resolution')lootDelivery=completeResolution(state,record.resolutionId,sourceId,true);}
  priorityDecision(state,record,sourceId);
  return {type:'commitment-responded',commitment:copy(record),response:{...response,status:record.status},lootDelivery,summary:response.accept?(lootDelivery?.status==='completed'?'全部原参与者已确认，原收获已实际交付。':lootDelivery?.status==='agreed'?lootDelivery.reason:'本人已确认这版条款；其他成员仍需分别决定，尚未交付收获。'):'本人拒绝了这项分配；没有转移财物或改变同行关系。'};
 }
 function proposeForActor(state,input,sourceId,kind='loot'){
  const actorId=input.actorId??state.角色.主控单位ID;social.communicate(state,actorId,input.characterId);
  return recordProposal(state,{...input,actorId},sourceId,kind);
 }
 function respondForActor(state,input,sourceId){
  const actorId=input.actorId??state.角色.主控单位ID,record=commitments(state).find(r=>r.id===input.commitmentId);
  if(!record||record.personId!==actorId)throw Error('只有原提议的受邀者本人可以回应');
  const reason=responseReason(state,record);if(reason)throw Error(reason);
  return settleResponse(state,record,input.decision,sourceId);
 }
 function validate(state){
  const errors=[],seen=new Set();
  for(const agreement of records(state)){
   try{
    if(!agreement||seen.has(agreement.id)||typeof agreement.id!=='string'||!Number.isSafeInteger(agreement.version)||agreement.version<1||!state.人物.列表[agreement.playerId]||!Array.isArray(agreement.membership)||!agreement.membership.length||new Set(agreement.membership.map(m=>m.personId)).size!==agreement.membership.length)throw Error('分配协议身份或成员无效');
    seen.add(agreement.id);if(JSON.stringify(terms(state,agreement.terms,agreement.playerId))!==JSON.stringify(agreement.terms))throw Error('分配协议条款无效');
    if(Object.keys(agreement.terms.shares).length!==agreement.membership.length+1)throw Error('分配协议成员与份额不一致');
    for(const m of agreement.membership)if(!agreement.terms.shares[m.personId]||!['party','hired'].includes(m.kind)||typeof m.membershipId!=='string'||!m.membershipId)throw Error('分配协议成员来源无效');
    for(const [id,key] of Object.entries(agreement.signatures)){const r=sign(state,agreement,id);if(!agreement.membership.some(m=>m.personId===id)||!r||r.id!==key||r.playerId!==agreement.playerId||r.personId!==id||r.kind!=='loot'||r.dungeonId!==agreement.dungeonId||(r.allocationId!==agreement.id||JSON.stringify(r.terms)!==JSON.stringify(agreement.terms))&&!hasConsent(state,agreement,id))throw Error('分配协议缺少人物原回应');}
    for(const id of Object.keys(agreement.inherited??{}))if(!hasConsent(state,agreement,id))throw Error('分配改版不能继承已变化权益的同意');
    if(postTrip(agreement)){
     const start=state.远征.processedTransactions[agreement.departureId],request=state.远征.commandRequests?.[agreement.departureId];
     const membership=start?.companions?.filter(c=>c.kind==='party').map(c=>({personId:c.unitId,membershipId:c.membershipId,kind:'party'})).sort((a,b)=>a.personId.localeCompare(b.personId));
     const expected=terms(state,{shares:Object.fromEntries([agreement.playerId,...agreement.membership.map(m=>m.personId)].map(id=>[id,1]))},agreement.playerId);
     if(start?.type!=='expedition-started'||start.expeditionId!==agreement.expeditionId||start.leaderId!==agreement.playerId||start.dungeon.id!==agreement.dungeonId||request?.type!=='开始远征'||request.requestHash!==globalThis.SoulAbilityContract.hash(request.request)||JSON.stringify(start.lootAgreement)!==JSON.stringify(agreement)||JSON.stringify(membership)!==JSON.stringify(agreement.membership)||JSON.stringify(expected)!==JSON.stringify(agreement.terms)||Object.keys(agreement.signatures).length||agreement.inherited)throw Error('战后分配登记与实际出发成员不一致');
    }else if(agreement.mode!==undefined||agreement.expeditionId&&agreement.membership.some(m=>!hasConsent(state,agreement,m.personId)))throw Error('已约定分配缺少全员确认');
   }catch(e){errors.push(e.message);}
  }
  for(const active of expeditions.instances(state))if(active.lootAgreement&&(active.lootAgreement.playerId!==active.leaderId||active.lootAgreement.expeditionId!==active.id||JSON.stringify(records(state).find(r=>r.id===active.lootAgreement.id))!==JSON.stringify(active.lootAgreement)))errors.push('出发分配与冻结原条款不一致');
  const allocations=state.远征?.扩展?.lootAllocations??[],ids=new Set();
  for(const a of allocations){
   const agreement=records(state).find(r=>r.id===a.agreementId&&r.expeditionId===a.id);
   if(!agreement||ids.has(a.id)||a.playerId!==agreement.playerId||!state.地图.地点[a.locationId]){errors.push('分配结算来源无效');continue;}ids.add(a.id);
   if(postTrip(agreement))try{validateDirectDeliveries(state,a);}catch(error){errors.push(error.message);}
   for(const [key,row] of Object.entries(a.materials)){
    if(row.fingerprint!==key||!Number.isSafeInteger(row.total)||row.total<1||!Number.isSafeInteger(row.pending)||row.pending<0||Object.entries(row.recipients).some(([id,n])=>!agreement.terms.shares[id]||!Number.isSafeInteger(n)||n<0)||Object.values(row.recipients).reduce((n,v)=>n+v,0)+row.pending!==row.total||(a.pendingMaterials[key]?.quantity??0)!==row.pending)errors.push('材料分配数量不守恒');
   }
   const sources=new Map();for(const row of a.items)if(row.sourceItemId){const source=sources.get(row.sourceItemId)??{quantity:0,total:row.sourceQuantity};if(!Number.isSafeInteger(row.quantity)||row.quantity<1||!Number.isSafeInteger(row.sourceQuantity)||row.sourceQuantity<1||source.total!==row.sourceQuantity)errors.push('物品分配数量或拆分来源无效');source.quantity+=row.quantity;sources.set(row.sourceItemId,source);}
   if([...sources.values()].some(s=>s.quantity!==s.total))errors.push('实际物品拆分数量不守恒');
   for(const t of agreement.terms.itemTargets??[]){const rows=a.items.filter(r=>r.targetKey===targetKey(t));if(rows.some(r=>r.personId!==t.personId||!matches(t,r))||rows.reduce((n,r)=>n+r.quantity,0)>t.quantity)errors.push('指定数量收获超出已确认条款');}
   for(const key of Object.keys(a.pendingMaterials))if(!a.materials[key]?.pending)errors.push('待分材料缺少结算来源');
   for(const entry of a.items)if(entry.status==='pending'){
    const item=state.物品.实例[entry.itemId],container=state.容器.列表[entry.containerId];
    if(!item||entry.personId!==null||item.containerId!==entry.containerId||item.ownerEntityId||item.legalOwnerEntityId||container?.type!=='expedition-loot'||container.locationId!==a.locationId||container.扩展?.allocationId!==a.id)errors.push('待分物品脱离原暂存容器');
   }
  }
  for(const container of Object.values(state.容器.列表))if(container.type==='expedition-loot'&&container.itemIds.some(id=>!allocations.some(a=>a.id===container.扩展?.allocationId&&a.items.some(i=>i.itemId===id&&i.status==='pending'))))errors.push('暂存容器缺少待分物品来源');
  for(const receipt of Object.values(state.远征?.processedTransactions??{})){
   if(receipt.type==='expedition-started'&&postTrip(receipt.lootAgreement)&&!records(state).some(a=>a.id===receipt.lootAgreement.id&&JSON.stringify(a)===JSON.stringify(receipt.lootAgreement)))errors.push('实际出发的战后分配登记缺失');
   if(postTrip(records(state).find(a=>a.id===receipt.allocation?.agreementId))&&!allocations.some(a=>a.id===receipt.allocation.id))errors.push('实际返程的待分收获缺失');
   if(receipt.type==='loot-distributed'&&!allocations.some(a=>a.id===receipt.delivery?.allocationId&&a.distributions?.some(d=>d.id===receipt.id)))errors.push('直接分配收据缺少实际交付记录');
  }
  const resolutionIds=new Set();
  for(const r of resolutions(state)){
   const allocation=allocations.find(a=>a.id===r.terms?.allocationId),agreement=allocation&&records(state).find(a=>a.id===allocation.agreementId);
   if(!r||typeof r.id!=='string'||resolutionIds.has(r.id)||!agreement||!['pending','agreed','completed'].includes(r.status)||!['item','material'].includes(r.terms.resourceKind)||!Number.isSafeInteger(r.terms.quantity)||r.terms.quantity<1||r.terms.locationId!==allocation.locationId||JSON.stringify(Object.keys(agreement.terms.shares).sort())!==JSON.stringify(r.terms.participants)||!r.terms.participants.includes(r.terms.recipientId)||!r.terms.participants.includes(r.proposerId)){errors.push('争议分配来源或条款无效');continue;}
   resolutionIds.add(r.id);
   if(r.terms.nextPriority){try{if(JSON.stringify(nextPriority(r.terms.nextPriority,r.terms.participants))!==JSON.stringify(r.terms.nextPriority))errors.push('下次优先条款无效');}catch(e){errors.push(e.message);}}
   if(r.status==='completed'&&r.terms.nextPriority&&priorities(state).filter(p=>p.sourceResolutionId===r.id).length!==1)errors.push('已交付方案缺少唯一后续优先约定');
   for(const [id,key] of Object.entries(r.signatures)){const record=(state.人物.列表[id]?.扩展?.社交约定??[]).find(c=>c.id===key);if(!r.terms.participants.includes(id)||id===r.proposerId||record?.playerId!==r.proposerId||record?.personId!==id||record?.kind!=='loot-resolution'||record.resolutionId!==r.id||JSON.stringify(record.terms)!==JSON.stringify(r.terms))errors.push('争议分配缺少本人原回应');}
   if(['agreed','completed'].includes(r.status)&&!resolutionConsent(state,r))errors.push('争议分配缺少全员同意');
   if(r.status==='completed'&&(!r.delivery?.sourceId||!r.terms.participants.includes(r.delivery.actorId)||r.delivery.recipientId!==r.terms.recipientId||r.delivery.quantity!==r.terms.quantity||r.delivery.resourceId!==r.terms.resourceId||r.delivery.locationId!==r.terms.locationId))errors.push('争议分配交付记录与条款不符');
   if(r.delivery?.resourceKind!==undefined&&(r.delivery.resourceKind!==r.terms.resourceKind||(r.terms.resourceKind==='item'?r.delivery.receivedItemId!==r.terms.resourceId:r.delivery.receivedItemId!==undefined)))errors.push('争议分配实际交付物与资源类别不符');
   if(r.status!=='completed'&&r.delivery)errors.push('尚未交付的争议分配不能有交付记录');
   if(r.status==='completed'&&r.terms.resourceKind==='item'&&!allocation.items.some(i=>i.itemId===r.terms.resourceId&&i.status==='allocated'&&i.resolutionId===r.id&&i.personId===r.terms.recipientId))errors.push('争议物品缺少原编号交付记录');
  }
  const priorityIds=new Set();
  for(const p of priorities(state))try{
   const source=resolutions(state).find(r=>r.id===p.sourceResolutionId),selector={kind:p.kind,scope:p.scope,personId:p.personId,templateId:p.templateId,...(p.name?{name:p.name}:{})};
   if(typeof p.id!=='string'||priorityIds.has(p.id)||!source||source.status!=='completed'||p.sourceAllocationId!==source.terms.allocationId||JSON.stringify(selector)!==JSON.stringify(source.terms.nextPriority)||JSON.stringify(p.participants)!==JSON.stringify(source.terms.participants)||!['waiting','available','fulfilled'].includes(p.status))throw Error('优先协商约定缺少已履行的原方案');
   priorityIds.add(p.id);
   if(p.status==='waiting'){if(p.allocationId||p.itemId||p.firstProposalId||p.answeredSourceId)throw Error('尚未取得对应收获不能写成优先协商已处理');continue;}
   const allocated=allocations.find(a=>a.id===p.allocationId),entry=allocated?.items.find(i=>i.itemId===p.itemId&&i.priorityId===p.id),agreement=allocated&&records(state).find(a=>a.id===allocated.agreementId);
   if(!entry||p.allocationId===p.sourceAllocationId||!p.participants.every(id=>agreement.terms.shares[id])||!matches(p,entry)||entry.quantity!==1)throw Error('优先协商缺少下次共同取得的那一件实物');
   if(p.status==='fulfilled'&&p.distributionId){
    const delivery=allocated.distributions?.find(d=>d.id===p.distributionId);
    if(!postTrip(agreement)||!delivery?.items.some(row=>row.itemId===p.itemId)||p.firstProposalId||p.answeredSourceId!==delivery.id||JSON.stringify(p.answeredAt)!==JSON.stringify(delivery.at))throw Error('优先条款缺少实际战后分配记录');
   }else if(p.status==='fulfilled'){
    const discussion=resolutions(state).find(r=>r.id===p.firstProposalId&&r.terms.allocationId===p.allocationId&&r.terms.resourceId===p.itemId);
    if(!discussion||!p.answeredAt||(p.personId===discussion.proposerId?discussion.id!==p.answeredSourceId:!(state.人物.列表[p.personId].扩展.社交约定??[]).some(c=>c.resolutionId===discussion.id&&c.events.some(e=>['accepted','rejected'].includes(e.status)&&e.sourceId===p.answeredSourceId))))throw Error('优先协商尚无本人实际提案或独立回应');
   }else if(p.firstProposalId||p.answeredSourceId)throw Error('未处理优先协商不能有完成回执');
  }catch(e){errors.push(e.message);}
  const orders=new Set(),recordIds=new Set();
  for(const record of commitments(state))try{
   const origin=record.kind==='loot'?records(state).find(a=>a.id===record.allocationId):resolutions(state).find(r=>r.id===record.resolutionId);
   if(!origin||recordIds.has(record.id)||record.playerId!==(record.kind==='loot'?origin.playerId:origin.proposerId)||record.playerId===record.personId||!state.人物.列表[record.personId]||!Object.hasOwn(record.kind==='loot'?origin.terms.shares:Object.fromEntries(origin.terms.participants.map(id=>[id,true])),record.personId)||JSON.stringify(record.terms)!==JSON.stringify(origin.terms)||!Array.isArray(record.events)||!record.events.length)throw Error('本人回应缺少原双方或条款');recordIds.add(record.id);
   let previous='',previousOrder=0;
   for(const e of record.events){
    const allowed=previous===''?['pending']:previous==='pending'?['accepted','rejected','expired','cancelled']:previous==='accepted'?['completed']:[];
    if(!allowed.includes(e.status)||typeof e.sourceId!=='string'||!e.sourceId||!Number.isSafeInteger(e.revision)||e.revision<0||e.revision>state.系统.revision||!Number.isSafeInteger(e.order)||e.order<=previousOrder||e.order>state.扩展.personEventSequence||orders.has(e.order))throw Error('本人回应的状态或实际顺序无效');
    const t=e.time;if(!t||![t.day,t.hour,t.minute].every(Number.isSafeInteger)||t.day<1||t.hour<0||t.hour>23||t.minute<0||t.minute>59||t.day*1440+t.hour*60+t.minute>state.世界.时间.day*1440+state.世界.时间.hour*60+state.世界.时间.minute)throw Error('本人回应时间无效');
    for(const id of [record.playerId,record.personId])if(JSON.stringify(e.memoryContexts?.[id])!==JSON.stringify(social.masksAtOrder(state,id,e.order)))throw Error('本人回应的认知来源无效');
    if(e.status==='pending'&&(e.sourceId!==record.id||e.actorId!==record.playerId)||['accepted','rejected','completed'].includes(e.status)&&e.actorId!==record.personId)throw Error('分配不能由他人代签');
    if(e.status==='completed'&&(record.kind==='loot'?e.allocationId!==origin.id:e.resolutionId!==origin.id))throw Error('确认回执与原方案不符');
    previous=e.status;previousOrder=e.order;orders.add(e.order);
   }
   if(record.status!==previous)throw Error('本人回应与历史不符');
  }catch(error){errors.push(`分配回应无效：${error.message}`);}
  return errors;
 }
 function validateDirectDeliveries(state,allocation){
  const equal=(a,b)=>globalThis.SoulAbilityContract.hash(a)===globalThis.SoulAbilityContract.hash(b);
  const returns=Object.values(state.远征.processedTransactions).filter(r=>['expedition-cleared','expedition-safely-extracted','expedition-escort-rescue'].includes(r.type)&&r.allocation?.id===allocation.id);
  if(returns.length!==1)throw Error('待分收获缺少唯一实际返程来源');
  const original=returns[0].allocation;
  if(!equal([allocation.id,allocation.agreementId,allocation.playerId,allocation.locationId,allocation.settledAt],[original.id,original.agreementId,original.playerId,original.locationId,original.settledAt]))throw Error('待分收获返程身份被改写');
  const materials=copy(original.materials),items=copy(original.items),seen=new Set(),participants=Object.keys(records(state).find(a=>a.id===allocation.agreementId).terms.shares);
  const totals={};for(const receipt of Object.values(state.远征.processedTransactions))if(receipt.expeditionId===allocation.id&&['expedition-chest-opened','expedition-beast-harvested'].includes(receipt.type))for(const batch of receipt.batches)totals[batch.fingerprint]=(totals[batch.fingerprint]??0)+batch.quantity;
  if(!equal(totals,Object.fromEntries(Object.entries(materials).map(([key,row])=>[key,row.total])))||Object.values(materials).some(row=>row.pending!==row.total||Object.values(row.recipients).some(n=>n!==0))||items.some(row=>row.status!=='pending'))throw Error('战后分配原数量缺少实际采集或返程来源');
  for(const delivery of allocation.distributions??[]){
   const receipt=state.远征.processedTransactions[delivery.id],request=state.远征.commandRequests?.[delivery.id];
   if(request?.request?.returnId)directContext(state,allocation.id,allocation.playerId,request.request.returnId);
   if(seen.has(delivery.id)||receipt?.type!=='loot-distributed'||request?.type!=='expedition-loot-distribute'||request.requestHash!==globalThis.SoulAbilityContract.hash(request.request)||!equal(receipt.delivery,delivery)||delivery.actorId!==allocation.playerId||delivery.allocationId!==allocation.id||request.request.actorId!==allocation.playerId||request.request.allocationId!==allocation.id)throw Error('直接分配缺少原领队实际请求与交付记录');seen.add(delivery.id);
   if(!equal(request.request.materials.filter(row=>Object.values(row.recipients).some(n=>n>0)),delivery.materials)||!equal(request.request.items,delivery.items.map(row=>({itemId:row.itemId,recipientId:row.recipientId}))))throw Error('直接分配交付与原数量或领取人不符');
   const at=delivery.at.day*1440+delivery.at.hour*60+delivery.at.minute,observers=delivery.observers??[];
   if(delivery.observers&&(!Number.isSafeInteger(delivery.order)||delivery.order<1||delivery.order>state.扩展.personEventSequence||new Set(observers.map(o=>o.personId)).size!==observers.length||observers.some(o=>!participants.includes(o.personId)||o.personId===allocation.playerId||!social.validCommunicationProof(state,o.proof,o.personId,false,at,delivery.order)||o.proof.position.kind!=='location'||o.proof.position.sceneId||o.proof.position.locationId!==allocation.locationId||!equal(o.memoryContext,social.masksAtOrder(state,o.personId,delivery.order)))))throw Error('战利品回应缺少交付当时的本人知情来源');
   for(const row of delivery.materials){const record=materials[row.fingerprint],total=Object.values(row.recipients).reduce((sum,n)=>sum+n,0);if(!record||record.pending!==total||!total||Object.entries(row.recipients).some(([id,n])=>!participants.includes(id)||!Number.isSafeInteger(n)||n<0))throw Error('材料重复交付或超出本次收获');for(const [id,n] of Object.entries(row.recipients))record.recipients[id]=(record.recipients[id]??0)+n;record.pending=0;}
   for(const row of delivery.items){const record=items.find(i=>i.itemId===row.itemId);if(!record||record.status!=='pending'||row.quantity!==record.quantity||!participants.includes(row.recipientId)||state.容器.列表[row.containerId]?.ownerEntityId!==row.recipientId)throw Error('物品重复交付或原编号数量被替换');Object.assign(record,{status:'allocated',personId:row.recipientId,containerId:row.containerId,distributionId:delivery.id});}
  }
  if(!equal(materials,allocation.materials)||!equal(items,allocation.items))throw Error('待分收获与实际交付记录不守恒');
  const pending={};for(const [key,row] of Object.entries(materials))if(row.pending)pending[key]=original.pendingMaterials[key];
  if(!equal(pending,allocation.pendingMaterials))throw Error('待分材料原属性或数量被改写');
 }
 function pending(state,viewerId=state.角色.主控单位ID){
  return (state.远征?.扩展?.lootAllocations??[]).flatMap(a=>{
   const participants=Object.keys(records(state).find(r=>r.id===a.agreementId).terms.shares);
   if(!participants.includes(viewerId))return [];
   return [...Object.values(a.pendingMaterials).map(m=>({allocationId:a.id,resourceKind:'material',resourceId:m.fingerprint,name:m.displayName,quantity:m.quantity,locationId:a.locationId,participants})),...a.items.filter(i=>i.status==='pending').map(i=>({allocationId:a.id,resourceKind:'item',resourceId:i.itemId,name:state.物品.实例[i.itemId]?.name,quantity:state.物品.实例[i.itemId]?.quantity,priority:priorities(state).find(p=>p.itemId===i.itemId&&p.status==='available')??null,locationId:a.locationId,participants}))].map(row=>postTrip(records(state).find(r=>r.id===a.agreementId))?{...row,distributionMode:'post-trip',leaderId:a.playerId,handling:'由原领队在战利品窗口直接分配，无需逐人协商或AI同意'}:row);
  });
 }
 function view(state,before=-1,viewerId=state.角色.主控单位ID){
  const all=(state.远征?.扩展?.lootAllocations??[]).filter(a=>Object.hasOwn(records(state).find(r=>r.id===a.agreementId).terms.shares,viewerId)),end=before===-1?all.length:Math.min(all.length,before);
  if(!Number.isSafeInteger(before)||before< -1)throw Error('分配记录页码无效');
  const visible=new Set(all.slice(Math.max(0,end-8),end).map(a=>a.id));
  const requests=pendingResponses(state).filter(r=>[r.playerId,r.personId].includes(viewerId)).map(r=>{const reason=responseReason(state,r);return {id:r.id,kind:r.kind,proposerId:r.playerId,personId:r.personId,terms:copy(r.terms),canRespond:r.personId===viewerId&&!reason,canAwaitNpc:r.playerId===viewerId&&r.personId!==viewerId&&!reason,canAccept:r.kind==='loot'?available(state,r):resolutionAvailable(state,r),reason};});
  const current=visibleResolutions(state,viewerId).filter(r=>visible.has(r.terms.allocationId)&&resolutions(state).filter(o=>o.terms.allocationId===r.terms.allocationId&&o.terms.resourceKind===r.terms.resourceKind&&o.terms.resourceId===r.terms.resourceId).at(-1)===r).map(r=>({...copy(r),collection:collectionAvailability(state,r,viewerId),responses:r.terms.participants.filter(id=>id!==r.proposerId).map(id=>({personId:id,status:(state.人物.列表[id]?.扩展?.社交约定??[]).find(c=>c.id===r.signatures[id])?.status??'unasked'}))}));
  const latest=all.flatMap(a=>a.distributions??[]).sort((a,b)=>(a.order??0)-(b.order??0)).at(-1),reactions=latest?(globalThis.SoulConversations?.messages(state,viewerId)??[]).filter(m=>m.rootId==='loot-distribution:'+latest.id&&m.speakerId!==viewerId).slice(-3):[];
  return {reactions,distributions:all.map(a=>distributionView(state,a,viewerId)).filter(v=>v&&(v.materials.length||v.items.length)),requests,priorities:copy(priorities(state).filter(p=>p.participants.includes(viewerId)&&(p.status!=='fulfilled'||visible.has(p.sourceAllocationId)||visible.has(p.allocationId)))),templateNames:Object.fromEntries(Object.entries(world.ITEM_TEMPLATES).map(([id,t])=>[id,t.name])),total:all.length,nextBefore:end>8?end-8:null,resolutions:current,records:copy(all.slice(Math.max(0,end-8),end).reverse()),names:Object.fromEntries([...new Set([...all.flatMap(a=>Object.keys(records(state).find(r=>r.id===a.agreementId).terms.shares)),...requests.flatMap(r=>r.kind==='loot'?Object.keys(r.terms.shares):r.terms.participants)])].map(id=>[id,state.人物.列表[id].name])),itemNames:Object.fromEntries(all.slice(Math.max(0,end-8),end).flatMap(a=>a.items).map(i=>[i.itemId,state.物品.实例[i.itemId]?.name??'原物品']))};
 }
 const templates=()=>Object.entries(world.ITEM_TEMPLATES).filter(([id,t])=>t.type!=='魂环'&&id!=='legacy-item').map(([id,t])=>({id,name:t.name,stackable:t.stackable}));
 return Object.freeze({postTrip,automaticPlan,distribute,directItemAuthorization,reactionSource,reactionTriggers,templates,roster,terms,propose,available,freeze,settleMaterials,settleItem,validate,records,visibleRecords,visibleResolutions,view,entitlement,hasConsent,resolutions,proposeResolution,resolutionAvailable,completeResolution,collectionAvailability,pending,priorities,priorityFacts,priorityDecision,nextPriority,recordProposal,pendingResponses,responseReason,validateResponse,settleResponse,proposeForActor,respondForActor});
});
