(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulCommerceCare=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clone=v=>JSON.parse(JSON.stringify(v)),now=s=>globalThis.SoulPersonCore.now(s),assets=()=>globalThis.SoulCommerceAssets,custody=()=>globalThis.SoulCustodyCore,seals=()=>globalThis.SoulSealingCore,logistics=()=>globalThis.SoulCustodyLogistics,w=()=>globalThis.SoulWorldEngine;
 const table=s=>s.世界.commerceCare??{version:2,records:[],events:[]},find=(s,id)=>table(s).records.find(v=>v.auctionId===id);
 function save(s,r,kind,sourceId){assets().stamp(r);const db=table(s),e=assets().stamp({id:`care:${sourceId}:${kind}`,kind,sourceId,at:now(s),record:clone(r)});if(db.events.some(v=>v.id===e.id))throw Error('保管来源重复');db.events.push(e);const i=db.records.findIndex(v=>v.auctionId===r.auctionId);if(i<0)db.records.push(r);else db.records[i]=r;}
 function facility(s){return logistics().facility(s,table(s).facilityId);}
 function initialize(s){const v=s.世界.auctionVenue,h=w().commerceHooks();s.世界.commerceCare={version:2,records:[],events:[],facilityId:null};
  const acquired=logistics().execute(s,{type:'acquire-custody-facility',actorId:v.ownerId,templateId:'prison-wing',mode:'buy'},`world-opening:${s.世界.seed}:auction-cells`,h.logistics);table(s).facilityId=acquired.facilityId;const f=facility(s),copy=clone(f);copy.sealedSlots=Array.from({length:4},(_,i)=>({id:`sealed-slot-${i+1}`,locationId:f.locationId}));logistics().save(s,'facilities',copy,v.ownerId,`${f.id}:sealed-slots`,'实际仓房增设四个载人器保管位');
  for(const [id,name] of [['auction-guard-he','何岳衡'],['auction-guard-ding','丁雪岑']]){const p=h.spawn(s,{id,name,archetypeId:'high-soul-master',level:62,age:46,locationId:f.locationId,martialSoulTemplateId:'patrol-shield',wallet:6000,generatedBy:'authored-auction-guard',identity:'拍卖场受雇看守',profile:{biography:`${name}以本人的六十二级盾武魂承担天斗拍卖场看守工作，负责巡查房门与交接，熟悉每一处关押安排。`,values:'实际履约，保留本人意愿。',speech:'说话直接，先核实交接记录。',shortTermGoal:'守好岗位，办妥每一次交接。',longTermGoal:'靠个人修为维持独立生计。'}});p.扩展.characterProfile.status='complete';p.扩展.characterProfile.source='preset';for(const soulId of s.成长.列表[id].武魂ID列表){s.武魂.列表[soulId].扩展.baseActionNaming={status:'complete',source:'preset'};for(const ringId of s.武魂.列表[soulId].魂环ID列表)for(const skillId of s.魂环.列表[ringId].魂技ID列表){const skill=s.技能.列表[skillId];skill.扩展.namingSource='preset';skill.扩展.originalName=skill.name;}}const permission=logistics().execute(s,{type:'permit-custody-duty',actorId:id,targetId:v.ownerId,mode:'guard'},`${f.id}:permission:${id}`,h.logistics);logistics().execute(s,{type:'assign-custody-guard',actorId:v.ownerId,targetId:id,facilityId:f.id,permissionId:permission.permissionId},`${f.id}:guard:${id}`,h.logistics);}
 }
 function reconsignable(s,prior,lot){
  const r=find(s,prior?.id),c=prior&&custody().active(s,prior.personId),f=facility(s);
  if(!r||r.status!=='stored'||prior.collectedAt!==null||!['unsold','cancelled','invalidated'].includes(prior.status)||prior.sellerId!==lot.sellerId||prior.personId!==lot.personId||prior.itemId!==lot.itemId||!c||c.custodianId!==lot.sellerId||globalThis.SoulAbilityContract.hash(c.arrangement)!==globalThis.SoulAbilityContract.hash(r.arrangement))throw Error('原拍品的看管与安置已经变化');
  if(r.kind==='ordinary'){const cell=f.cells.find(v=>`${f.id}:${v.id}`===r.slotId),p=globalThis.SoulActionContext.positionOf(s,r.personId);if(!cell||p.kind!=='location'||p.locationId!==f.locationId||p.sceneId!==cell.spaceId)throw Error('原人物已离开拍卖房间');}
  else if(!seals().byItem(s,lot.itemId)||s.物品.实例[lot.itemId]?.containerId!==s.世界.auctionVenue.warehouseId)throw Error('原载人器已离开拍卖仓房');
  return r;
 }
 function accept(s,lot,sourceId,priorLot=null){if(!lot.personId)return;const f=facility(s),kind=lot.assetKind==='loaded-seal'?'sealed':'ordinary',c=custody().active(s,lot.personId);if(!c)throw Error('缺少原人物的真实看管');let position;const prior=priorLot?find(s,priorLot.id):null;
  if(priorLot){if(!prior||prior.status!=='stored'||prior.kind!==kind||globalThis.SoulAbilityContract.hash(prior.arrangement)!==globalThis.SoulAbilityContract.hash(lot.livingTerms.arrangementBefore))throw Error('原拍品安置无法续用');const ended={...clone(prior),status:'ended'};save(s,ended,'ended',`${sourceId}:prior`);}
  if(kind==='ordinary'){if(globalThis.SoulPersonCore.levelOf(s,lot.personId)>59||!custody().attached(s,lot.personId).some(i=>i.durability>0&&custody().DEVICES[i.templateId]?.capture))throw Error('普通位只受理59级及以下且有实际有效拘束的人物');const cell=prior?f.cells.find(c=>`${f.id}:${c.id}`===prior.slotId):f.cells.find(c=>logistics().occupants(s,f,c.id).length<c.capacity);if(!cell)throw Error('三间牢房六个普通位已满');position={kind:'facility',facilityId:f.id,cellId:cell.id,auctionId:lot.id,keeperId:lot.keeperId};w().commerceHooks().move(s,[lot.personId],f.locationId,cell.spaceId);}
  else {if(!seals().byItem(s,lot.itemId)||!lot.sealTerms?.transferControl)throw Error('高等级载人器须为同一器体、真实封存及器具控制权组合');const slot=prior?f.sealedSlots.find(v=>v.id===prior.slotId):f.sealedSlots.find(v=>!table(s).records.some(r=>r.slotId===v.id&&r.status!=='collected'&&r.status!=='ended'));if(!slot)throw Error('四个载人器保管位已满');position={kind:'sealed',itemId:lot.itemId,sealId:lot.livingTerms.sealId,facilityId:f.id,sealedSlotId:slot.id,auctionId:lot.id,keeperId:lot.keeperId};}
  seals().arrangement(s,c,position,lot.sellerId,`${sourceId}:facility`);lot.livingTerms.arrangementDuring=clone(position);const fcopy=clone(f);logistics().save(s,'facilities',fcopy,f.ownerId,`${sourceId}:cell-booking`,'按真实人物占用原房间或载人器位');
  const r={id:`care-contract:${lot.id}`,auctionId:lot.id,personId:lot.personId,kind,slotId:position.sealedSlotId??`${position.facilityId}:${position.cellId}`,facilityId:f.id,arrangement:clone(position),createdAt:now(s),status:'consigned'};save(s,r,'accepted',sourceId);
 }
 function transfer(s,lot,sourceId){const original=find(s,lot.id);if(!original)return;const r=clone(original),c=custody().active(s,r.personId);if(!c||c.custodianId!==lot.highestBid?.actorId)throw Error('拍品看管权尚未交付');r.status='stored';r.receivedAt=now(s);r.arrangement=clone(c.arrangement);save(s,r,'transferred',sourceId);}
 function end(s,lot,kind,sourceId){if(kind==='completed')return;const original=find(s,lot.id);if(!original||original.status==='ended')return;const r=clone(original);r.status=globalThis.SoulPersonCore.isDead(s,r.personId)?'ended':'stored';save(s,r,r.status,sourceId);}
 function recipient(lot){return lot.status==='completed'?lot.highestBid?.actorId:lot.sellerId;}
 function canCollect(s,lot,actorId){
  const r=find(s,lot.id);if(!r){if(lot.personId)throw Error('拍品缺少交付记录');return;}
  if(recipient(lot)!==actorId)throw Error('当前没有本人可领取的拍品');
  if(r.status==='ended'&&r.kind==='sealed'){
   const item=s.物品.实例[lot.itemId],container=s.容器.列表[item?.containerId];
   if(item&&container?.type==='auction-warehouse'&&item.扩展?.auctionLotId===lot.id&&item.legalOwnerEntityId===actorId)return;
  }
  if(r.status!=='stored'||custody().active(s,r.personId)?.custodianId!==actorId)throw Error('当前没有本人可领取的拍品');
 }
 function validDeparture(s,event,lot,record){
  if(!event||event.at<record.createdAt||event.itemId!==lot?.itemId)return false;
  if(event.type==='released')return event.record?.id===lot.livingTerms?.sealId&&event.targetId===record.personId;
  return event.type==='device-seized'&&event.before?.containerId===s.世界.auctionVenue.warehouseId&&event.after?.containerId!==event.before.containerId;
 }
 function sealDeparture(s,event){
  for(const original of table(s).records){
   const lot=globalThis.SoulCommerceAuction.lot(s,original.auctionId);
   if(original.kind!=='sealed'||!['stored','consigned'].includes(original.status)||!validDeparture(s,event,lot,original))continue;
   save(s,{...clone(original),status:'ended'},'ended',`seal-departure:${event.id}`);
  }
 }
 function collect(s,lot,sourceId){const original=find(s,lot.id);if(!original)return;const r=clone(original),ownerId=recipient(lot);canCollect(s,lot,ownerId);if(r.status==='ended'){r.status='collected';r.collectedAt=now(s);save(s,r,'collected',sourceId);return;}const c=custody().active(s,r.personId);if(!c||c.custodianId!==ownerId)throw Error('本人看管权已变化');if(r.kind==='ordinary')w().commerceHooks().move(s,[r.personId],s.世界.auctionVenue.locationId??'loc-heaven-auction','');const seal=r.kind==='sealed'?seals().byItem(s,lot.itemId):null;if(r.kind==='sealed'&&!seal)throw Error('原封存器具已变化');seals().arrangement(s,c,seal?{kind:'sealed',itemId:lot.itemId,sealId:seal.id}:'held-at-scene',ownerId,`${sourceId}:collect-person`);r.status='collected';r.collectedAt=now(s);save(s,r,'collected',sourceId);}
 function facts(s,lot,viewerId){const r=find(s,lot.id);if(!r)return null;let available=true;try{canCollect(s,lot,viewerId);}catch{available=false;}return {kind:r.kind,status:r.status,canCollect:available};}
 function validate(s){
  const errors=[],db=table(s),latest=new Map(),ids=new Set(),records=new Set();
  if(s.角色.已建立&&!s.世界.commerceCare)return ['新档缺少拍卖交付场所'];if(!s.世界.commerceCare)return [];
  const f=facility(s);if(db.version!==2||!f||f.cells.length!==3||f.cells.some(v=>v.capacity!==2)||(f.sealedSlots?.length!==4||f.sealedSlots.some((slot,index)=>slot.id!==`sealed-slot-${index+1}`||slot.locationId!==f.locationId)))errors.push('拍卖交付格式或场所容量不符');
  if(Object.keys(db).some(k=>!['version','records','events','facilityId'].includes(k))||s.钱包.列表['wallet-commerce-care-escrow'])errors.push('拍卖交付不能包含运营账');
  const allowed=['id','auctionId','personId','kind','slotId','facilityId','arrangement','createdAt','status','receivedAt','collectedAt','hash'];
  const valid=r=>r&&r.hash===globalThis.SoulAbilityContract.hash(Object.fromEntries(Object.entries(r).filter(([k])=>k!=='hash')));
  for(const e of db.events){
   const r=e?.record,lot=globalThis.SoulCommerceAuction.lot(s,r?.auctionId),event=globalThis.SoulCommerceAuction.table(s).events.find(v=>v.auctionId===r?.auctionId&&v.sourceId===e.sourceId);
   const status={accepted:'consigned',transferred:'stored',stored:'stored',ended:'ended',collected:'collected'}[e.kind];
   const departure=e.kind==='ended'&&seals().table(s).events.find(v=>`seal-departure:${v.id}`===e.sourceId&&validDeparture(s,v,lot,r)&&v.at===e.at);
   if(!valid(e)||!valid(r)||ids.has(e.id)||!Number.isSafeInteger(e.at)||e.at>now(s)||!status||r?.status!==status||Object.keys(e).some(k=>!['id','kind','sourceId','at','record','hash'].includes(k))||Object.keys(r??{}).some(k=>!allowed.includes(k))||!lot||(!event&&!departure)||event&&event.at!==e.at||e.kind==='accepted'&&event.kind!=='accepted'||e.kind==='transferred'&&event.kind!=='completed'||e.kind==='stored'&&!['cancelled','unsold','invalidated'].includes(event.kind)||e.kind==='collected'&&event.kind!=='collected'||e.kind==='ended'&&!departure&&!(event?.kind==='reconsigned'&&lot.reconsignedTo&&globalThis.SoulCommerceAuction.lot(s,lot.reconsignedTo)?.previousLotId===lot.id||['cancelled','unsold','invalidated'].includes(event?.kind)&&globalThis.SoulPersonCore.isDead(s,r?.personId)))errors.push('拍卖交付事件缺少对应业务来源');
   if(e.kind==='transferred'&&!custody().table(s).events.some(v=>v.type==='custody-transferred'&&v.offerId===r?.auctionId&&v.sourceId===e.sourceId&&v.actorId===lot?.sellerId&&v.authority?.custodianId===lot?.highestBid?.actorId&&v.at===e.at))errors.push('拍卖交付缺少真实看管权交割');
   ids.add(e.id);if(r)latest.set(r.auctionId,r);
  }
  const sealed=new Set();
  for(const r of db.records){const lot=globalThis.SoulCommerceAuction.lot(s,r.auctionId),origin=db.events.find(e=>e.kind==='accepted'&&e.record.auctionId===r.auctionId);
   if(!valid(r)||records.has(r.auctionId)||!lot||lot.personId!==r.personId||r.id!==`care-contract:${r.auctionId}`||!s.人物.列表[r.personId]||r.facilityId!==f?.id||!['ordinary','sealed'].includes(r.kind)||!['consigned','stored','ended','collected'].includes(r.status)||!Number.isSafeInteger(r.createdAt)||r.createdAt>now(s)||Object.keys(r).some(k=>!allowed.includes(k))||globalThis.SoulAbilityContract.hash(latest.get(r.auctionId))!==globalThis.SoulAbilityContract.hash(r)||!origin||origin.record.createdAt!==r.createdAt||globalThis.SoulAbilityContract.hash(origin.record.arrangement)!==globalThis.SoulAbilityContract.hash(lot.livingTerms?.arrangementDuring))errors.push('拍卖交付未对应原人物与安置');
   records.add(r.auctionId);
   if(r.kind==='sealed'){if(!f?.sealedSlots?.some(v=>v.id===r.slotId))errors.push('封存位不存在');if(!['ended','collected'].includes(r.status)){if(sealed.has(r.slotId))errors.push('封存位重复占用');sealed.add(r.slotId);}}
   else if(!f?.cells.some(c=>`${f.id}:${c.id}`===r.slotId))errors.push('原房间不存在');
   if(r.status==='collected'&&(!Number.isSafeInteger(r.collectedAt)||r.collectedAt<r.createdAt||r.collectedAt>now(s)||lot?.collectedAt!==r.collectedAt))errors.push('领取缺少原交付时点');
  }
  for(const id of latest.keys())if(!records.has(id))errors.push('拍卖交付事件缺少当前记录');
  for(const lot of globalThis.SoulCommerceAuction.table(s).lots)if(lot.personId&&!records.has(lot.id))errors.push('人物拍品缺少交付来源');
  return errors;
 }
 return Object.freeze({table,initialize,facility,reconsignable,sealDeparture,accept,transfer,end,collect,canCollect,facts,validate});
});
