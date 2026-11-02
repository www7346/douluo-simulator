(function(root,factory){
  const get=(name,file)=>root?.[name]??(typeof require==='function'?require(file):null);
  const api=factory(get('SoulCustodyCore','./custody-core.js'),get('SoulPersonCore','./person-core.js'),get('SoulActionContext','./action-context-core.js'),get('SoulControlCore','./control-core.js'),get('SoulAbilityContract','./ability-contract-core.js'));
  if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulCustodyLogistics=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(custody,people,actions,controls,abilities){
  'use strict';
 const travel=globalThis.SoulTravelCore??(typeof require==='function'?require('./travel-core.js'):null);
  const clone=v=>JSON.parse(JSON.stringify(v)),same=(a,b)=>abilities.hash(a)===abilities.hash(b);
  const FACILITIES=Object.freeze({
    'holding-house':{name:'独院看管所',cells:2,capacity:1,buy:900,convert:2400,repairRate:20,doorDC:18},
    'prison-wing':{name:'石砌牢院',cells:3,capacity:2,buy:3000,convert:12000,repairRate:60,doorDC:26}
  });
  const INTENTS=Object.freeze(['acquire-custody-facility','visit-custody-cell','set-custody-cell-door','repair-custody-facility','admit-captive','place-captive','withdraw-captive','permit-custody-duty','assign-custody-guard','end-custody-duty','start-custody-escort','pause-custody-escort','resume-custody-escort','cancel-custody-escort','captive-daily']);
  const db=s=>custody.table(s,true),rows=(s,key)=>custody.table(s)[key]??[],now=s=>people.now(s),wallet=(s,id)=>s.钱包.列表[s.人物.列表[id]?.walletId];
  const facilitySite=l=>!!l&&(l.id==='loc-heaven-auction'||['村落','城市','帝都','驿站'].some(t=>l.tags?.includes(t)));
  function repairGold(f){return (100-f.condition+f.cells.reduce((n,c)=>n+100-c.condition,0))*FACILITIES[f.templateId].repairRate;}
  function stampValid(v){const c={...v};delete c.hash;return v.hash===abilities.hash(c);}
  function save(s,kind,record,actorId,sourceId,reason){
    const list=db(s)[kind]??=[],old=list.find(r=>r.id===record.id),previousHash=old?.hash??null;
    custody.stamp(record);if(old)Object.assign(old,record);else list.push(record);
    custody.event(s,`logistics-${kind}`,actorId,actorId,sourceId,{entityId:record.id,previousHash,record:clone(record),reason});
    return record;
  }
  function edit(s,kind,id){const r=rows(s,kind).find(v=>v.id===id);if(!r)throw Error('没有对应的看管安排');return clone(r);}
  function awake(s,id){actions.resolve(s,{actorId:id,battleId:null});if(controls.active(s,id).some(v=>['status.sleep','status.stun'].includes(v.模板ID)))throw Error('人物当前无法清醒处理安排');}
  function movable(s,id){awake(s,id);controls.assertAction(s,id,'move');}
  function liveEscort(s,id){return rows(s,'escorts').find(e=>['travelling','paused'].includes(e.status)&&e.personIds.includes(id));}
  function duty(s,id){return rows(s,'duties').find(d=>d.personId===id&&d.status==='active');}
  function busyReason(s,id){const e=liveEscort(s,id);if(e)return '人物已有押送安排，请先暂停或结束原安排';if(duty(s,id))return '人物正在承担牢房看守职责';return '';}
  function idle(s,id){const reason=busyReason(s,id)||globalThis.SoulRescueCore?.busyReason(s,id);if(reason)throw Error(reason);if((s.世界.npcPlans??[]).some(p=>p.ownerId===id&&['scheduled','travelling','waiting'].includes(p.status)))throw Error('人物已有独立行程');if((s.世界.longActions??[]).some(a=>a.ownerId===id&&a.status==='interrupted'))throw Error('请先放弃本人未完成的长行动');}
  function arrangement(s,record,value,actorId,sourceId){
    const previous=clone(record.arrangement);record.arrangement=clone(value);custody.stamp(record);
    custody.event(s,'custody-arranged',actorId,record.personId,sourceId,{custodyId:record.id,authority:custody.authorityRef(record),previous,arrangement:clone(value),position:actions.positionOf(s,record.personId)});
  }
  function custodyRecord(s,actorId,targetId){const r=custody.active(s,targetId);if(!r||r.custodianId!==actorId)throw Error('没有该人物的当前看管权限');if(custody.isIdentity(r)){const unit=s.战斗单位.列表[targetId],blocked=controls.restrictions(s,targetId).blocked,controlled=globalThis.SoulInfluenceCore.authority(s,actorId,targetId,'移动');if(unit?.存活状态==='存活'&&unit.资源.生命.当前>0&&!controlled.available&&!(blocked.gesture?.length&&blocked.movement?.length))throw Error('身份归属本身不能将清醒自由人物关押；须先取得真实身体或移动控制');}return r;}
  function facility(s,id){return rows(s,'facilities').find(f=>f.id===id);}
  function facilityAt(s,actorId,id,managed=true){
    const f=facility(s,id),p=actions.positionOf(s,actorId);awake(s,actorId);
    if(!f||managed&&!f.operatorIds.includes(actorId)||p.kind!=='location'||p.locationId!==f.locationId||p.sceneId&&!p.sceneId.startsWith(`${f.id}:`))throw Error('必须实际到达有权限的关押设施');
    return f;
  }
  function occupants(s,f,cellId){return Object.values(custody.table(s).byPerson).filter(r=>custody.active(s,r.personId)&&r.arrangement?.kind==='facility'&&r.arrangement.facilityId===f.id&&(!cellId||r.arrangement.cellId===cellId));}
  function requireOpenDoor(f,spaceId){const c=f.cells.find(c=>c.spaceId===spaceId);if(c?.locked&&c.condition>0)throw Error('房门尚锁闭，需要现场开门或实际破坏');}
  function cellAt(f,id){const c=f.cells.find(c=>c.id===id);if(!c)throw Error('牢房不存在');return c;}
  function acquire(s,r,sourceId,h){
    awake(s,r.actorId);controls.assertAction(s,r.actorId,'requirements',{requirements:['gesture']});
    const t=FACILITIES[r.templateId],p=actions.positionOf(s,r.actorId),location=h.locations[p.locationId];
    if(!t||p.kind!=='location'||p.sceneId||!facilitySite(location)||!['buy','convert'].includes(r.mode))throw Error('须在实际抵达的城镇安全地点办理关押设施');
    const estate=r.mode==='convert'?(s.世界.opening?.situations??[]).find(v=>v.kind==='estate'&&v.status==='completed'&&v.locationId===p.locationId):null;
    if(r.mode==='convert'&&(!estate||r.actorId!==s.角色.主控单位ID||rows(s,'facilities').some(f=>f.acquisition.estateId===estate.id)))throw Error('改设需要本人已办结且未改设的现有房产');
    const price=t[r.mode],account=wallet(s,r.actorId);if(account.gold<price)throw Error('置办资金不足');account.gold-=price;
    const id=`facility:${sourceId}`,at=now(s);
    const f={id,templateId:r.templateId,name:t.name,locationId:p.locationId,ownerId:r.actorId,operatorIds:[r.actorId],sourceId,createdAt:at,acquisition:{mode:r.mode,price,estateId:estate?.id??''},status:'active',condition:100,cells:Array.from({length:t.cells},(_,i)=>({id:`cell-${i+1}`,spaceId:`${id}:cell-${i+1}`,capacity:t.capacity,locked:true,condition:100}))};
    save(s,'facilities',f,r.actorId,sourceId,'置办看管场所或房产改设');return {facilityId:id,priceGold:price,summary:`已置办${t.name}，可以安排房间与看守。`};
  }
  function facilityOperation(s,r,sourceId,h){
    const existing=facility(s,r.facilityId),leaving=r.type==='visit-custody-cell'&&!r.cellId&&s.人物.列表[r.actorId]?.spaceId?.startsWith(`${existing?.id}:`)&&!custody.confined(s,r.actorId);
    const f=clone(facilityAt(s,r.actorId,r.facilityId,!leaving)),p=s.人物.列表[r.actorId],t=FACILITIES[f.templateId];
    if(r.type==='repair-custody-facility'){
      controls.assertAction(s,r.actorId,'requirements',{requirements:['gesture']});if(p.spaceId)throw Error('须到公共通道修整设施');const cost=repairGold(f);if(cost===0)throw Error('设施无需修整');if(wallet(s,r.actorId).gold<cost)throw Error('修整费用不足');wallet(s,r.actorId).gold-=cost;f.condition=100;for(const c of f.cells)c.condition=100;
    }else if(r.type==='visit-custody-cell'){
      controls.assertAction(s,r.actorId,'move');requireOpenDoor(f,p.spaceId);const c=r.cellId?cellAt(f,r.cellId):null;if(c)requireOpenDoor(f,c.spaceId);h.movePeopleTo(s,[r.actorId],f.locationId,c?.spaceId??'');
    }else if(r.type==='set-custody-cell-door'){
      controls.assertAction(s,r.actorId,'requirements',{requirements:['gesture']});const c=cellAt(f,r.cellId);if(p.spaceId&&p.spaceId!==c.spaceId)throw Error('须在公共通道或目标牢房操作房门');if(typeof r.locked!=='boolean'||c.condition<=0)throw Error('房门损坏或模式无效');c.locked=r.locked;
    }else if(r.type==='admit-captive'){
      if(f.status!=='active')throw Error('场所当前不可用');const record=custodyRecord(s,r.actorId,r.targetId),c=cellAt(f,r.cellId);actions.resolve(s,{actorId:r.actorId,battleId:null,targetIds:[r.targetId],requirements:['gesture']});
      if(liveEscort(s,r.targetId)||record.arrangement?.kind==='facility')throw Error('请先结束现有押送或办理出监');if(occupants(s,f,c.id).length>=c.capacity)throw Error('牢房已满');requireOpenDoor(f,p.spaceId);requireOpenDoor(f,c.spaceId);
      h.movePeopleTo(s,[r.targetId],f.locationId,c.spaceId);arrangement(s,record,{kind:'facility',facilityId:f.id,cellId:c.id},r.actorId,sourceId);
    }else if(r.type==='withdraw-captive'){
      const record=custodyRecord(s,r.actorId,r.targetId),targetPosition=actions.positionOf(s,r.targetId);const c=record.arrangement?.facilityId===f.id?cellAt(f,record.arrangement.cellId):record.arrangement==='held-at-scene'&&targetPosition.locationId===f.locationId?f.cells.find(cell=>cell.spaceId===targetPosition.sceneId):null;if(!c)throw Error('该人物不在此设施的看管室内');if(p.spaceId&&p.spaceId!==c.spaceId)throw Error('须到公共通道或目标牢房办理出监');requireOpenDoor(f,c.spaceId);requireOpenDoor(f,p.spaceId);controls.assertAction(s,r.actorId,'requirements',{requirements:['gesture']});
      h.movePeopleTo(s,[r.targetId],f.locationId,p.spaceId??'');arrangement(s,record,'held-at-scene',r.actorId,sourceId);
    }else throw Error('未知设施操作');
    const actorName=s.人物.列表[r.actorId]?.name??'你',targetName=s.人物.列表[r.targetId]?.name??'对方',cellName=r.cellId?`第${f.cells.findIndex(c=>c.id===r.cellId)+1}间看管室`:'';
    const summary=r.type==='visit-custody-cell'?`${actorName}${r.cellId?'进入了'+f.name+'的'+cellName:'离开房间，回到'+f.name+'的公共通道'}。`:r.type==='set-custody-cell-door'?`${actorName}${r.locked?'锁上':'打开'}了${f.name}的${cellName}房门。`:r.type==='admit-captive'?`${actorName}将${targetName}安置到${f.name}的${cellName}，房门保持当前开闭状态。`:r.type==='withdraw-captive'?`${actorName}将${targetName}领到自己实际所在的${p.spaceId?f.name+'房间':'公共通道'}，原有拘束继续生效。`:`${actorName}完成了${f.name}的修整。`;
    save(s,'facilities',f,r.actorId,sourceId,r.type);return {facilityId:f.id,targetId:r.targetId??'',summary};
  }
  function permitDuty(s,r,sourceId){
    awake(s,r.actorId);actions.resolve(s,{actorId:r.actorId,battleId:null,targetIds:[r.targetId]});if(r.actorId===r.targetId||!['guard','escort'].includes(r.mode))throw Error('职责许可需要真实的另一人和具体职责');
    if(controls.actionReason(s,r.actorId,'requirements',{requirements:['voice']})&&controls.actionReason(s,r.actorId,'requirements',{requirements:['gesture']}))throw Error('无法作出配合回应');
    const record={id:`duty-permission:${sourceId}`,personId:r.actorId,leaderId:r.targetId,mode:r.mode,issuedAt:now(s),expiresAt:now(s)+15,status:'granted',sourceId};save(s,'dutyPermissions',record,r.actorId,sourceId,'同意承担职责一次');return {permissionId:record.id,summary:'本次职责许可在15分钟内有效。'};
  }
  function acceptDuty(s,leaderId,personId,mode,sourceId){
    if(leaderId===personId)return null;const p=rows(s,'dutyPermissions').filter(p=>p.personId===personId&&p.leaderId===leaderId&&p.mode===mode&&p.status==='granted'&&p.expiresAt>now(s)).at(-1);if(!p)throw Error('对方尚未同意承担这项职责');
    const used={...clone(p),status:'used',usedBy:sourceId,usedAt:now(s)};save(s,'dutyPermissions',used,personId,`${sourceId}:permission:${personId}`,'实际采用职责许可');return p.id;
  }
  function assignGuard(s,r,sourceId){
    const f=facilityAt(s,r.actorId,r.facilityId);if(f.status!=='active')throw Error('场所当前不能安排值守');actions.resolve(s,{actorId:r.actorId,battleId:null,targetIds:[r.targetId]});idle(s,r.targetId);movable(s,r.targetId);if(custody.confined(s,r.targetId))throw Error('被看管者不能直接自任看守');
    const permissionId=acceptDuty(s,r.actorId,r.targetId,'guard',sourceId),at=now(s);
    const d={id:`duty:${sourceId}`,sourceId,personId:r.targetId,leaderId:r.actorId,facilityId:f.id,locationId:f.locationId,spaceId:s.人物.列表[r.targetId].spaceId??'',permissionId,status:'active',startedAt:at};save(s,'duties',d,r.actorId,sourceId,'开始看守');return {dutyId:d.id,summary:'看守已到岗，开始值守。'};
  }
  function endDuty(s,r,sourceId){const d=edit(s,'duties',r.dutyId);if(d.status!=='active'||![d.personId,d.leaderId].includes(r.actorId))throw Error('没有可结束的本人职责');awake(s,r.actorId);if(r.actorId!==d.personId&&!actions.colocated(s,r.actorId,d.personId))throw Error('须到场交接看守职责');d.status='ended';d.endedAt=now(s);save(s,'duties',d,r.actorId,sourceId,'结束值守');return {dutyId:d.id,summary:'看守职责已经结束。'};}
  function guardedBy(s,record){
    const a=record.arrangement,sealed=globalThis.SoulSealingCore?.active(s,record.personId),ids=a?.kind==='facility'?rows(s,'duties').filter(d=>d.status==='active'&&d.facilityId===a.facilityId).map(d=>d.personId):a?.kind==='escort'?(rows(s,'escorts').find(e=>e.id===a.escortId)?.guardIds??[]):[record.custodianId,a?.keeperId,globalThis.SoulSealingCore?.carrier(s,record.personId)?.id];
    return [...new Set(ids)].filter(id=>{try{movable(s,id);const p=actions.positionOf(s,id),target=sealed?globalThis.SoulSealingCore.itemPosition(s,sealed.itemId):actions.positionOf(s,record.personId);return a?.kind==='facility'?p.kind==='location'&&target.kind==='location'&&p.locationId===target.locationId&&(p.sceneId===''||p.sceneId===target.sceneId):same(p,target);}catch{return false;}});
  }
  function barrier(s,record){const a=record.arrangement,f=a?.kind==='facility'?facility(s,a.facilityId):null,c=f?.cells.find(c=>c.id===a.cellId);return c?.locked&&c.condition>0?{facilityId:f.id,cellId:c.id,dc:FACILITIES[f.templateId].doorDC,condition:c.condition}:null;}
  function breakDoor(s,record,sourceId){const b=barrier(s,record);if(!b)return false;const f=clone(facility(s,b.facilityId)),c=cellAt(f,b.cellId);c.condition=0;c.locked=false;save(s,'facilities',f,record.personId,sourceId,'实际脱困检定破坏房门');return true;}
  function powerSuppressed(s,id){const r=controls.restrictions(s,id);return controls.powerFacts(s,id).soulPower.percent===0||!(s.成长?.列表?.[id]?.武魂ID列表??[]).length||r.seals.some(v=>!v.soulId&&v.kind==='魂力')||['武魂','魂技'].every(k=>r.seals.some(v=>!v.soulId&&v.kind===k));}
  function escortReason(s,e){
    for(const id of e.guardIds)try{movable(s,id);if(custody.confined(s,id))throw Error('看守已被捕');}catch(error){return `${s.人物.列表[id]?.name??id}：${error.message}`;}
    for(const ref of e.custodyRefs){const r=custody.active(s,ref.personId);if(!r||r.id!==ref.custodyId||!custody.hasAuthority(s,e.leaderId,ref.authority))return '原看管关系已结束或发生转交';if(!powerSuppressed(s,ref.personId))return '被押人物已不受能力压制';if(!custody.attached(s,ref.personId).some(i=>i.durability>0&&custody.DEVICES[i.templateId].capture&&i.attachment.mode!=='released'))return '被押人物已失去实际拘束';try{movable(s,ref.personId);}catch(error){return `${s.人物.列表[ref.personId].name}不能步行：${error.message}`;}}
    return '';
  }
  function escortEnded(s,e){return e.personIds.some(id=>s.人物.列表[id]?.status==='dead')||e.custodyRefs.some(ref=>{const r=custody.active(s,ref.personId);return !r||r.id!==ref.custodyId||!custody.hasAuthority(s,e.leaderId,ref.authority);});}
  function endEscort(s,e,at,reason){
    e.status='cancelled';e.nextAt=null;const run=e.runs.at(-1);if(run.endedAt===null){run.endedAt=at;run.reason=reason;}
    for(const ref of e.custodyRefs){const c=custody.active(s,ref.personId);if(c?.id===ref.custodyId&&custody.hasAuthority(s,e.leaderId,ref.authority)&&c.arrangement?.escortId===e.id)arrangement(s,c,'held-at-scene',e.leaderId,`${e.id}:ended:${at}:${ref.personId}`);}
    save(s,'escorts',e,e.leaderId,`${e.id}:ended:${at}`,reason);
  }
  function setTransit(s,e,run){travel.publishTransit(s,run);}
  function handoff(s,id,from,toActionId,sourceId){custody.event(s,'transit-handoff',id,id,`${sourceId}:${id}`,{personId:id,from:clone(from),toActionId});}
  function beginLeg(s,e,sourceId,h,resumed=null){
    const route=e.path.routes[e.legIndex],from=resumed?.from??e.currentLocationId,to=route.from===from?route.to:route.from,offset=resumed?.elapsedMinutes??0,cost=resumed?0:route.costGold;
    h.assertRoute(s,e.leaderId,route,to);
    if(wallet(s,e.leaderId).gold<cost)throw Error('押送旅费不足');wallet(s,e.leaderId).gold-=cost;e.paidGold+=cost;e.status='travelling';e.currentLocationId='';
    const run={sourceId,legIndex:e.legIndex,routeId:route.id,from,to,totalMinutes:route.minutes,startOffset:offset,endOffset:offset,startedAt:resumed?.startedAt??now(s),beganAt:now(s),progressedAt:now(s),endedAt:null,costGold:cost,personIds:clone(e.personIds),resumes:clone(resumed),arrived:false};
    for(const id of e.personIds)if(s.人物.列表[id].transit)handoff(s,id,s.人物.列表[id].transit,e.id,sourceId);
    travel.initialize(s,run,e.id,route.mode==='sea'?[]:e.personIds,route.mode==='sea'?e.personIds:[]);e.runs.push(run);e.nextAt=travel.nextAt(run);setTransit(s,e,run);
  }
  function escortRoster(actorId,targetIds,guardIds=[]) {
    const targets=targetIds,guards=Array.isArray(guardIds)?[actorId,...guardIds]:null;
    if(!Array.isArray(targets)||!guards||targets.length<1||targets.length>20||new Set([...targets,...guards]).size!==targets.length+guards.length||guards.length>4)throw Error('押送名单应分别填写被押人物和额外护卫；本人已自动带队，名单不能重复');
    return {targets,guards};
  }
  function assertEscortDestination(from,destinationId){if(from===destinationId)throw Error('已经在这个地点；访问同城服务请先回公共区域，无需建立跨城押送');}
  function startEscort(s,r,sourceId,h){
    if(Object.hasOwn(r,'vehicleId'))throw Error('押送只支持步行，车辆参数无效');
    const {targets,guards}=escortRoster(r.actorId,r.targetIds,r.guardIds??[]);
    for(const id of [...targets,...guards]){idle(s,id);if(!actions.colocated(s,r.actorId,id))throw Error('押送人员必须在同一实际位置');}
    const refs=targets.map(personId=>{const c=custodyRecord(s,r.actorId,personId);if(c.arrangement?.kind==='facility')throw Error('先办理出监');return {personId,custodyId:c.id,authority:custody.authorityRef(c)};}),p=actions.positionOf(s,r.actorId),transit=s.人物.列表[r.actorId].transit;
    if(p.kind==='location'&&p.sceneId||p.kind==='transit'&&!transit)throw Error('须在道路落脚点或已有真实路段安排押送');
    if(!transit)assertEscortDestination(p.locationId,r.destinationId);
    const path=h.route(s,r.actorId,r.destinationId,transit?.to??p.locationId);
    if(transit){path.routes.unshift(clone(h.routes[transit.routeId]));path.routeIds.unshift(transit.routeId);path.totalMinutes+=transit.totalMinutes-transit.elapsedMinutes;path.totalCostGold+=0;}
    if(!path.routes.length)throw Error('已经位于目标地点');
    const e={id:`escort:${sourceId}`,sourceId,leaderId:r.actorId,personIds:[...guards,...targets],guardIds:guards,custodyRefs:refs,guardPermissions:{},destinationId:r.destinationId,path,legIndex:0,currentLocationId:p.locationId,status:'paused',createdAt:now(s),paidGold:0,nextAt:null,runs:[]};
    const reason=escortReason(s,e);if(reason)throw Error(reason);if(wallet(s,r.actorId).gold<path.totalCostGold)throw Error('不足以支付计划押送路线的旅费');
    for(const id of guards)e.guardPermissions[id]=acceptDuty(s,r.actorId,id,'escort',sourceId);
    beginLeg(s,e,sourceId,h,transit);save(s,'escorts',e,r.actorId,sourceId,'开始实际押送');
    for(const ref of refs)arrangement(s,custody.active(s,ref.personId),{kind:'escort',escortId:e.id},r.actorId,`${sourceId}:arrange:${ref.personId}`);
    return {escortId:e.id,summary:'押送队伍已出发。'};
  }
  function escortOperation(s,r,sourceId,h){
    const e=edit(s,'escorts',r.escortId);if(e.leaderId!==r.actorId||!['travelling','paused'].includes(e.status))throw Error('没有可操作的本人押送安排');awake(s,r.actorId);
    if(r.type==='resume-custody-escort'){
      if(e.status!=='paused')throw Error('押送尚未暂停');for(const id of e.personIds)if(!actions.colocated(s,r.actorId,id))throw Error('押送人员已分散，须重新集合');const reason=escortReason(s,e);if(reason)throw Error(reason);
      beginLeg(s,e,sourceId,h,s.人物.列表[r.actorId].transit??null);
    }else{
      if(e.status==='travelling'){const run=e.runs.at(-1);run.endedAt=now(s);run.reason=r.type;}
      e.status=r.type==='cancel-custody-escort'?'cancelled':'paused';e.nextAt=null;
      if(e.status==='cancelled')for(const ref of e.custodyRefs){const c=custody.active(s,ref.personId);if(c?.id===ref.custodyId&&custody.hasAuthority(s,e.leaderId,ref.authority))arrangement(s,c,'held-at-scene',r.actorId,`${sourceId}:arrange:${ref.personId}`);}
    }
    save(s,'escorts',e,r.actorId,sourceId,r.type);return {escortId:e.id,summary:e.status==='travelling'?'继续剩余押送路线。':e.status==='cancelled'?'押送已结束，队伍停在当前位置。':'押送已暂停。'};
  }
  function progressAt(s,at){
    for(const original of rows(s,'escorts').filter(e=>e.status==='travelling')){const e=clone(original),run=e.runs.at(-1);if(escortEnded(s,e)||run.personIds.some(id=>s.人物.列表[id].transit?.actionId!==e.id||s.人物.列表[id].transit?.stepSourceId!==run.sourceId)){endEscort(s,e,at,'原看管或实际同行关系已结束');continue;}if(run.progressedAt===at)continue;travel.advanceAt(s,run,at);setTransit(s,e,run);save(s,'escorts',e,e.leaderId,`${run.sourceId}:progress:${at}`,'实际路段进度');}
  }
  function refreshTravelAt(s,at){for(const original of rows(s,'escorts').filter(e=>e.status==='travelling')){const e=clone(original),run=e.runs.at(-1),before=clone(run.travel);e.nextAt=travel.rebaseAt(s,run,at);if(!same(before,run.travel)||e.nextAt!==original.nextAt)save(s,'escorts',e,e.leaderId,`${run.sourceId}:pace:${at}`,'实际步行速度变化');}}
  function nextAt(s,through=Infinity){const times=rows(s,'escorts').map(e=>e.nextAt).filter(t=>Number.isSafeInteger(t)&&t<=through);return times.length?Math.min(...times):null;}
  function reconcileDuties(s,at){
    for(const original of rows(s,'duties').filter(d=>d.status==='active')){
      const f=facility(s,original.facilityId),p=s.人物.列表[original.personId];
      if(f?.status==='active'&&p?.status!=='dead'&&p?.locationId===original.locationId&&(p.spaceId??'')===original.spaceId&&!custody.confined(s,original.personId))continue;
      const d=clone(original);d.status='ended';d.endedAt=at;
      save(s,'duties',d,d.personId,`${d.id}:post-ended:${at}`,'看守已离岗或无法继续值守');
    }
  }
  function advanceAt(s,at,h){
    for(const original of rows(s,'duties').filter(d=>d.status==='active')){
      const record=custody.confined(s,original.personId);if(!record)continue;
      const d=clone(original);d.status='ended';d.endedAt=at;
      save(s,'duties',d,d.personId,`${d.id}:captured:${record.sourceId}`,'看守已被实际捕获，原值守结束');
    }
    for(const original of rows(s,'escorts').filter(e=>['travelling','paused'].includes(e.status)))if(escortEnded(s,original))endEscort(s,clone(original),at,'人员死亡或原看管结束，停止押送安排');
    for(const original of rows(s,'escorts').filter(e=>e.status==='travelling')){
      const e=clone(original),run=e.runs.at(-1),reason=escortReason(s,e);
      if(reason){e.status='paused';e.nextAt=null;run.endedAt=at;run.reason=reason;save(s,'escorts',e,e.leaderId,`${run.sourceId}:blocked:${at}`,reason);continue;}
      if(e.nextAt>at)continue;
      run.endedAt=at;run.arrived=true;e.currentLocationId=run.to;h.movePeopleTo(s,e.personIds,run.to);e.legIndex++;
      if(e.legIndex>=e.path.routes.length){e.status='arrived';e.nextAt=null;for(const ref of e.custodyRefs){const c=custody.active(s,ref.personId);if(c?.id===ref.custodyId&&custody.hasAuthority(s,e.leaderId,ref.authority))arrangement(s,c,'held-at-scene',e.leaderId,`${e.id}:arrive:${ref.personId}`);}}
      else try{beginLeg(s,e,`${e.id}:leg:${e.legIndex}`,h);}catch(error){e.status='paused';e.nextAt=null;e.reason=error.message;}
      save(s,'escorts',e,e.leaderId,`${run.sourceId}:arrived:${at}`,'实际抵达道路落脚点');
    }
    reconcileDuties(s,at);
  }
  function execute(s,r,sourceId,h){
    let result;
    if(r.type==='acquire-custody-facility')result=acquire(s,r,sourceId,h);
    else if(r.type==='place-captive'){
      facilityOperation(s,{...r,type:'set-custody-cell-door',locked:false},`${sourceId}:open`,h);
      facilityOperation(s,{...r,type:'admit-captive'},`${sourceId}:admit`,h);
      facilityOperation(s,{...r,type:'set-custody-cell-door',locked:true},`${sourceId}:lock`,h);
      result={facilityId:r.facilityId,targetId:r.targetId,summary:'已安置入房并锁好房门。'};
    }
    else if(['visit-custody-cell','set-custody-cell-door','repair-custody-facility','admit-captive','withdraw-captive'].includes(r.type))result=facilityOperation(s,r,sourceId,h);
    else if(r.type==='permit-custody-duty')result=permitDuty(s,r,sourceId);
    else if(r.type==='assign-custody-guard')result=assignGuard(s,r,sourceId);
    else if(r.type==='end-custody-duty')result=endDuty(s,r,sourceId);
    else if(r.type==='start-custody-escort')result=startEscort(s,r,sourceId,h);
    else if(['pause-custody-escort','resume-custody-escort','cancel-custody-escort'].includes(r.type))result=escortOperation(s,r,sourceId,h);
    else if(r.type==='captive-daily'){
      people.assertAlive(s,r.actorId);if(!custody.confined(s,r.actorId)||actions.battleOf(s,r.actorId)||!Number.isSafeInteger(r.minutes)||r.minutes<1||r.minutes>1440)throw Error('被看管者日常单次可等待1至1440分钟');const before=now(s),timing=h.advanceActionTime(s,r.actorId,r.minutes);result={minutes:timing.minutes,before,after:now(s),interruption:timing.interruption??null,summary:`在当前看管安排中度过${timing.minutes}分钟，外界的行程与事件已随时间推进。`};
    }else throw Error('未知看管生活操作');
    return {type:'custody-logistics',action:r.type,sourceId,actorId:r.actorId,at:now(s),...result};
  }
  function transitSource(s,transit,personId){
    const e=rows(s,'escorts').find(e=>e.id===transit.actionId),run=e?.runs.find(r=>r.sourceId===transit.stepSourceId&&r.personIds.includes(personId));
    return run?{...clone(run),ownerId:e.leaderId,personIds:run.personIds,routeId:run.routeId,from:run.from,to:run.to,startOffset:run.startOffset,endOffset:run.endOffset,startedAt:run.startedAt,totalMinutes:run.totalMinutes,arrived:run.arrived,after:run.endedAt??run.progressedAt}:null;
  }
  function transitConsumed(s,t,id){return custody.table(s).events.some(e=>e.type==='transit-handoff'&&e.personId===id&&e.from.actionId===t.actionId&&e.from.stepSourceId===t.stepSourceId);}
  function priorSource(s,t,id){
    const escort=transitSource(s,t,id)??globalThis.SoulRescueCore?.transitSource(s,t,id);if(escort)return escort;
    const a=(s.世界.longActions??[]).find(a=>a.id===t.actionId),step=a?.steps?.find(step=>step.sourceId===t.stepSourceId),leg=step?.legs?.at(-1);
    return leg&&[a.ownerId,...step.companionIds].includes(id)?{...leg,personIds:[a.ownerId,...step.companionIds],after:step.after.day*1440+step.after.hour*60+step.after.minute}:null;
  }
  function knownDestinations(s,viewerId,planPath){
    const world=globalThis.SoulWorldEngine,position=actions.positionOf(s,viewerId);
    if(!world||position.kind!=='location')return [];
    const findPath=planPath??world.createRoutePlanner(s);
    return Object.values(s.地图.地点).flatMap(location=>{
      if(location.id===position.locationId||!world.isLocationKnown(s,location.id,viewerId)||!world.locationAccess(s,location.id,viewerId).pass)return [];
      try{const path=findPath(location.id,'balanced',position.locationId,viewerId);return [{id:location.id,name:location.name,minutes:path.totalMinutes,costGold:path.totalCostGold}];}catch{return [];}
    });
  }
  function facts(s,viewerId,{includeDestinations=true,planPath=null}={}){
    if(!s.人物?.列表?.[viewerId])return null;
    const position=actions.positionOf(s,viewerId),facilities=rows(s,'facilities').filter(f=>f.operatorIds.includes(viewerId)||occupants(s,f).some(r=>r.personId===viewerId)||s.人物.列表[viewerId].spaceId?.startsWith(`${f.id}:`));
    const candidates=mode=>rows(s,'dutyPermissions').filter(p=>p.leaderId===viewerId&&p.status==='granted'&&p.mode===mode&&p.expiresAt>now(s)&&actions.colocated(s,viewerId,p.personId)).map(p=>({id:p.personId,name:s.人物.列表[p.personId].name}));
    return {now:now(s),viewerId,destinations:includeDestinations?knownDestinations(s,viewerId,planPath):[],guardCandidates:candidates('guard'),escortCandidates:candidates('escort'),templates:Object.entries(FACILITIES).map(([id,t])=>({id,...clone(t)})),canAcquire:position.kind==='location'&&!position.sceneId&&facilitySite(s.地图.地点[position.locationId]),facilities:facilities.map(f=>{
      const present=position.locationId===f.locationId,canManage=f.operatorIds.includes(viewerId),view={...clone(f),repairGold:canManage&&present&&!position.sceneId?repairGold(f):null,canManage,present,occupants:occupants(s,f).map(r=>({personId:r.personId,name:s.人物.列表[r.personId].name,cellId:r.arrangement.cellId})),guards:rows(s,'duties').filter(d=>d.facilityId===f.id&&d.status==='active').map(d=>({...clone(d),name:s.人物.列表[d.personId].name}))};
      if(!present)return {...view,status:'unknown',condition:null,occupants:[],guards:[],cells:f.cells.map(c=>({...c,locked:null,condition:null}))};
      if(canManage&&!position.sceneId)return view;
      return {...view,cells:view.cells.filter(c=>c.spaceId===position.sceneId),occupants:view.occupants.filter(p=>actions.colocated(s,viewerId,p.personId)),guards:view.guards.filter(g=>actions.colocated(s,viewerId,g.personId))};
    }),escorts:rows(s,'escorts').filter(e=>e.personIds.includes(viewerId)&&['travelling','paused'].includes(e.status)).map(clone),duties:rows(s,'duties').filter(d=>d.personId===viewerId&&d.status==='active').map(clone)};
  }
  function validate(s,h){
    const errors=[],db=custody.table(s),at=now(s),latest=new Map();
    if(Object.hasOwn(db,'feeding')||db.events.some(e=>e.type==='facility-cycle')||Object.values(s.钱包.列表).some(w=>w.扩展?.facilityId||w.ownerEntityId==='world-meal-service'))errors.push('当前看管格式不包含运营账户或日结');
    for(const e of db.events.filter(e=>e.type.startsWith('logistics-'))){const kind=e.type.slice(10),key=`${kind}:${e.entityId}`,previous=latest.get(key);if(kind==='escorts'&&(Object.hasOwn(e.record,'vehicleId')||e.record.runs?.some(run=>Object.hasOwn(run,'vehicle'))))errors.push('押送事件不能包含车辆来源');if(kind==='facilities'&&(['walletId','nextAt','cycles'].some(k=>Object.hasOwn(e.record,k))||Object.hasOwn(e.record.acquisition??{},'leaseUntil'))||kind==='duties'&&['wage','paid','nextPayAt'].some(k=>Object.hasOwn(e.record,k)))errors.push('看管事件包含已退出的运营字段');if(!['facilities','escorts','duties','dutyPermissions'].includes(kind)||!stampValid(e.record)||e.record.id!==e.entityId||e.previousHash!==(previous?.record.hash??null)||previous&&e.at<previous.at)errors.push('看管安排事件链无效');latest.set(key,e);}
    const ids=new Set();for(const kind of ['facilities','escorts','duties','dutyPermissions']){
      if(db[kind]!==undefined&&!Array.isArray(db[kind])){errors.push('看管安排表无效');continue;}
      for(const r of rows(s,kind)){const key=`${kind}:${r?.id}`,e=latest.get(key);if(ids.has(key)||!e||!same(e.record,r))errors.push('看管安排并非最新实际事件');ids.add(key);}
    }
    for(const key of latest.keys())if(!ids.has(key))errors.push('看管事件缺少对应安排');
    for(const e of db.events.filter(e=>e.type==='custody-arranged'))if(e.authority?.personId!==e.targetId||e.authority?.custodyId!==e.custodyId||!custody.authorityAt(s,e.authority,e.actorId,e.at,e.order))errors.push('看管安排缺少当时的本人权限');
    const consumed=new Set();
    for(const event of db.events.filter(e=>e.type==='transit-handoff'))try{
      const p=event.from,old=priorSource(s,p,event.personId),key=`${p.actionId}:${p.stepSourceId}:${event.personId}`,next=rows(s,'escorts').find(e=>e.id===event.toActionId)?.runs.find(r=>`${r.sourceId}:${event.personId}`===event.sourceId)??globalThis.SoulRescueCore?.transitRun(s,event.toActionId,event.sourceId,event.personId);
      if(!old||old.arrived||old.after>event.at||old.routeId!==p.routeId||old.from!==p.from||old.to!==p.to||old.endOffset!==p.elapsedMinutes||old.startedAt!==p.startedAt||!next||!next.personIds.includes(event.personId)||next.beganAt!==event.at||!same(next.sourceByPerson?.[event.personId]??next.resumes,p)||consumed.has(key))throw Error('交接来源');consumed.add(key);
    }catch(error){errors.push(`押送途中交接无效：${error.message}`);}
    const permissions=rows(s,'dutyPermissions'),uses=[];
    for(const d of rows(s,'duties'))if(d.permissionId)uses.push({id:d.permissionId,personId:d.personId,leaderId:d.leaderId,mode:'guard',sourceId:d.sourceId,at:d.startedAt});
    for(const e of rows(s,'escorts'))for(const id of e.guardIds??[])if(id!==e.leaderId)uses.push({id:e.guardPermissions?.[id],personId:id,leaderId:e.leaderId,mode:'escort',sourceId:e.sourceId,at:e.createdAt});
    for(const p of permissions)try{
      const u=uses.filter(u=>u.id===p.id);
      if(p.id!==`duty-permission:${p.sourceId}`||!s.人物.列表[p.personId]||!s.人物.列表[p.leaderId]||p.personId===p.leaderId||!['guard','escort'].includes(p.mode)||!Number.isSafeInteger(p.issuedAt)||p.issuedAt<0||p.issuedAt>at||p.expiresAt!==p.issuedAt+15||!['granted','used'].includes(p.status))throw Error('职责许可');
      if(p.status==='used'?u.length!==1||u[0].personId!==p.personId||u[0].leaderId!==p.leaderId||u[0].mode!==p.mode||u[0].sourceId!==p.usedBy||u[0].at!==p.usedAt||p.usedAt<p.issuedAt||p.usedAt>=p.expiresAt:u.length!==0)throw Error('职责许可消耗');
    }catch(error){errors.push(`职责许可${p.id}无效：${error.message}`);}
    for(const u of uses)if(!permissions.some(p=>p.id===u.id))errors.push('值守或护送缺少真实许可');
    const occupied=new Set();
    for(const f of rows(s,'facilities'))try{
      const t=FACILITIES[f.templateId];if(!t||!facilitySite(h.locations[f.locationId])||!s.人物.列表[f.ownerId]||f.id!==`facility:${f.sourceId}`||['walletId','nextAt','cycles','stockContainerId','care'].some(k=>Object.hasOwn(f,k))||Object.hasOwn(f.acquisition??{},'leaseUntil')||!Array.isArray(f.operatorIds)||!f.operatorIds.includes(f.ownerId)||new Set(f.operatorIds).size!==f.operatorIds.length||f.operatorIds.some(id=>!s.人物.列表[id])||f.cells.length!==t.cells||f.status!=='active'||!Number.isSafeInteger(f.createdAt)||f.createdAt<0||f.createdAt>at||!['buy','convert'].includes(f.acquisition.mode)||f.acquisition.price!==t[f.acquisition.mode]||!Number.isSafeInteger(f.condition)||f.condition<0||f.condition>100)throw Error('设施合同');
      for(const [i,c] of f.cells.entries())if(c.id!==`cell-${i+1}`||c.spaceId!==`${f.id}:${c.id}`||c.capacity!==t.capacity||typeof c.locked!=='boolean'||!Number.isSafeInteger(c.condition)||c.condition<0||c.condition>100||occupants(s,f,c.id).length>c.capacity)throw Error('牢房容量或条件');
      for(const r of occupants(s,f)){const p=s.人物.列表[r.personId],c=cellAt(f,r.arrangement.cellId);if(occupied.has(r.personId)||p.transit||p.locationId!==f.locationId||p.spaceId!==c.spaceId)throw Error('入住实际位置');occupied.add(r.personId);}
    }catch(error){errors.push(`关押设施${f?.id}无效：${error.message}`);}
    for(const e of rows(s,'escorts'))try{
      if(Object.hasOwn(e,'vehicleId')||e.runs?.some(run=>Object.hasOwn(run,'vehicle')))throw Error('押送不能包含车辆来源');
      if(e.id!==`escort:${e.sourceId}`||!s.人物.列表[e.leaderId]||!e.guardIds.includes(e.leaderId)||new Set(e.personIds).size!==e.personIds.length||!same([...e.guardIds,...e.custodyRefs.map(r=>r.personId)],e.personIds)||!['travelling','paused','arrived','cancelled'].includes(e.status)||!e.runs.length)throw Error('押送合同');
      const first=db.events.find(v=>v.type==='logistics-escorts'&&v.entityId===e.id);
      if(!first||!same(first.record.custodyRefs,e.custodyRefs)||e.custodyRefs.some(ref=>ref.personId!==ref.authority?.personId||ref.custodyId!==ref.authority?.custodyId||!custody.authorityAt(s,ref.authority,e.leaderId,first.at,first.order)))throw Error('押送开始时看管权限');
      if(!Array.isArray(e.path.routes)||!e.path.routes.length||!same(e.path.routeIds,e.path.routes.map(r=>r.id))||e.path.routes.some(r=>!same(r,h.routes[r.id]))||!h.locations[e.destinationId]||!e.guardPermissions||Object.keys(e.guardPermissions).length!==e.guardIds.length||e.guardPermissions[e.leaderId]!==null)throw Error('押送路径或护送许可');
      let paid=0;const runIds=new Set();for(const [index,run] of e.runs.entries()){
        const route=h.routes[run.routeId],previous=e.runs[index-1],started=db.events.find(v=>v.type==='logistics-escorts'&&v.entityId===e.id&&v.record.runs.some(r=>r.sourceId===run.sourceId));
        travel.validate(s,run,route.mode==='sea'?[]:e.personIds,route.mode==='sea'?e.personIds:[]);if(run.travel.actionId!==e.id)throw Error('押送共享路程来源');
        if(!started||e.custodyRefs.some(ref=>!custody.authorityAt(s,ref.authority,e.leaderId,started.at,started.order)))throw Error('路段开始时原看管权限');
        if(!route||runIds.has(run.sourceId)||run.routeId!==e.path.routes[run.legIndex]?.id||run.totalMinutes!==route.minutes||![route.from,route.to].includes(run.from)||run.to!==(route.from===run.from?route.to:route.from)||run.endOffset<run.startOffset||run.endOffset>route.minutes||run.progressedAt<run.beganAt||run.progressedAt>at||run.costGold!==(run.resumes?0:route.costGold)||!same(run.personIds,e.personIds)||run.personIds.some(id=>!s.人物.列表[id]||(s.人物.列表[id].life?.death?.at<run.beganAt||s.人物.列表[id].life?.death?.at===run.beganAt&&!(e.status==='cancelled'&&run.endedAt===run.beganAt&&run.endOffset===run.startOffset)))||run.arrived&&run.endOffset!==route.minutes)throw Error('路段进度');
        if(previous&&(previous.endedAt===null||previous.endedAt>run.beganAt||run.legIndex!==(previous.arrived?previous.legIndex+1:previous.legIndex)||previous.arrived&&previous.to!==run.from))throw Error('押送路段顺序');
        if(run.resumes){for(const id of run.personIds){const old=priorSource(s,run.resumes,id);if(!old||old.arrived||old.after>run.beganAt||old.routeId!==run.routeId||old.from!==run.from||old.to!==run.to||old.endOffset!==run.startOffset||old.startedAt!==run.startedAt||!db.events.some(ev=>ev.type==='transit-handoff'&&ev.personId===id&&ev.sourceId===`${run.sourceId}:${id}`&&ev.toActionId===e.id&&same(ev.from,run.resumes)))throw Error('续行来源');}}
        else if(run.startOffset!==0||run.startedAt!==run.beganAt)throw Error('首次出发进度');
        if(!run.arrived)for(const id of run.personIds){const key=`${e.id}:${run.sourceId}:${id}`,travelled=(s.世界.longActions??[]).some(a=>a.kind==='travel'&&a.steps.some(step=>[a.ownerId,...step.companionIds].includes(id)&&step.legs.some(l=>l.resumes?.actionId===e.id&&l.resumes.sourceId===run.sourceId)));if(consumed.has(key)||travelled)continue;const p=s.人物.列表[id];if(p.transit?.actionId!==e.id||p.transit?.stepSourceId!==run.sourceId)throw Error('人物缺少实际途中位置');}
        runIds.add(run.sourceId);paid+=run.costGold;
      }
      const last=e.runs.at(-1);if(e.status==='arrived'&&(last.to!==e.destinationId||!last.arrived||e.legIndex!==e.path.routes.length))throw Error('最终抵达');
      if(paid!==e.paidGold||e.status==='travelling'&&e.nextAt!==travel.nextAt(e.runs.at(-1))||e.status!=='travelling'&&e.nextAt!==null)throw Error('押送计时或收费');
      if(['travelling','paused'].includes(e.status))for(const id of e.personIds){if(occupied.has(id))throw Error('重复主要安排');occupied.add(id);}
    }catch(error){errors.push(`押送${e?.id}无效：${error.message}`);}
    for(const d of rows(s,'duties'))try{
      const f=facility(s,d.facilityId);if(!f||!s.人物.列表[d.personId]||!s.人物.列表[d.leaderId]||!f.operatorIds.includes(d.leaderId)||d.id!==`duty:${d.sourceId}`||d.locationId!==f.locationId||['wage','paid','nextPayAt'].some(k=>Object.hasOwn(d,k))||!['active','ended'].includes(d.status)||!Number.isSafeInteger(d.startedAt)||d.startedAt>at||d.personId===d.leaderId&&d.permissionId!==null)throw Error('看守合同');
      if(d.status==='active'){if(occupied.has(d.personId))throw Error('重复安排');occupied.add(d.personId);}
      else if(!Number.isSafeInteger(d.endedAt)||d.endedAt<d.startedAt||d.endedAt>at)throw Error('职责终结');
    }catch(error){errors.push(`看守${d.id}无效：${error.message}`);}
    for(const r of Object.values(db.byPerson))if(custody.active(s,r.personId)){
      const changed=db.events.filter(e=>e.type==='custody-arranged'&&e.custodyId===r.id).at(-1);if(!same(r.arrangement,changed?.arrangement??'held-at-scene'))errors.push('当前看管安排缺少实际操作');
      if(r.arrangement?.kind==='escort'&&!rows(s,'escorts').some(e=>e.id===r.arrangement.escortId&&['travelling','paused'].includes(e.status)&&e.custodyRefs.some(ref=>ref.personId===r.personId&&ref.custodyId===r.id)))errors.push('看管押送引用无效');
      if(r.arrangement?.kind==='facility'&&!facility(s,r.arrangement.facilityId))errors.push('看管设施引用无效');
    }
    return errors;
  }
  return Object.freeze({FACILITIES,INTENTS,execute,nextAt,progressAt,refreshTravelAt,advanceAt,busyReason,guardedBy,barrier,breakDoor,transitSource,transitConsumed,facts,validate,save,facility,occupants,escortRoster,assertEscortDestination});
});
