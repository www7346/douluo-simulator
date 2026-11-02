(function(root,factory){
  const get=(name,file)=>root?.[name]??(typeof require==='function'?require(file):null);
  const api=factory(get('SoulCustodyCore','./custody-core.js'),get('SoulCustodyLogistics','./custody-logistics-core.js'),get('SoulPersonCore','./person-core.js'),get('SoulActionContext','./action-context-core.js'),get('SoulControlCore','./control-core.js'),get('SoulAbilityContract','./ability-contract-core.js'));
  if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulRescueEvacuation=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(custody,logistics,people,actions,controls,abilities){
  'use strict';
 const travel=globalThis.SoulTravelCore??(typeof require==='function'?require('./travel-core.js'):null);
  const clone=v=>JSON.parse(JSON.stringify(v)),same=(a,b)=>abilities.hash(a)===abilities.hash(b),now=s=>people.now(s);
  const INTENTS=['prepare-rescue-evacuation','respond-rescue-evacuation','start-rescue-evacuation'];
  function offer(s,g,h){
    const p=s.人物.列表[g.ownerId],destinationId=h.locations[g.homeId]?g.homeId:h.locations[p.locationId]?p.locationId:p.transit?.to;
    g.evacuation={id:`${g.id}:evacuation`,destinationId:destinationId??'',status:'awaiting',response:null,personIds:[g.ownerId,g.targetId],runs:[],rally:null,nextAt:null,paidGold:0};
    g.status='awaiting-evacuation';g.nextAt=null;g.reason='已经解除看管，等待受援者决定是否同行撤离';
  }
  function unconscious(s,id){const u=s.战斗单位.列表[id];return s.人物.列表[id]?.status!=='dead'&&(u?.资源.生命.当前<=0||controls.active(s,id).some(v=>['status.sleep','status.stun'].includes(v.模板ID)));}
  function ready(s,g){
    const e=g.evacuation;actions.resolve(s,{actorId:g.ownerId,battleId:null,requirements:['movement']});
    if(controls.active(s,g.ownerId).some(v=>['status.sleep','status.stun'].includes(v.模板ID)))throw Error('护送者无法清醒行动');
    for(const id of e.personIds){if(s.人物.列表[id]?.status==='dead')throw Error('撤离人员已经死亡');if(custody.confined(s,id)||actions.battleOf(s,id)||logistics.busyReason(s,id))throw Error('撤离人员已有战斗或看管安排');}
    for(const id of e.personIds){if((s.世界.npcPlans??[]).some(p=>p.ownerId===id&&['scheduled','travelling','waiting'].includes(p.status))||(s.世界.longActions??[]).some(a=>a.ownerId===id&&a.kind!=='wait'&&a.status==='interrupted')||(s.世界.rescues?.goals??[]).some(r=>r.id!==g.id&&r.ownerId===id&&['planning','travelling','searching','fighting','freeing','evacuating'].includes(r.status)))throw Error('撤离人员另有未结束的主要安排');}
    if(!actions.colocated(s,g.ownerId,g.targetId))throw Error('双方不在同一实际现场');
    if(e.response?.accept!==true)throw Error('受援者尚未同意步行同行');
    if(unconscious(s,g.targetId))throw Error('受援者无法步行，须恢复清醒后本人同意撤离');
    actions.resolve(s,{actorId:g.targetId,battleId:null,requirements:['movement']});
  }
  function pause(s,g,reason){const e=g.evacuation,r=e.runs.at(-1);if(e.status==='travelling'&&r?.endedAt===null){r.endedAt=now(s);r.reason=reason;}e.pausedPhase=e.status;e.status='paused';e.nextAt=null;g.status='evacuation-paused';g.nextAt=null;g.reason=reason;}
  function setTransit(s,e,r){travel.publishTransit(s,r);}
  function begin(s,g,h,route,from,origin){
    const e=g.evacuation,sourceByPerson=Object.fromEntries(e.personIds.map(id=>[id,clone(s.人物.列表[id].transit??null)])),to=route.from===from?route.to:route.from;
    for(const id of e.personIds)h.assertRoute(s,id,route,to);
    const prior=sourceByPerson[g.ownerId],rally=origin==='rally'?e.rally:null,startOffset=rally?(from===route.from?rally.toCoordinate:route.minutes-rally.toCoordinate):prior?.elapsedMinutes??0;
    const resumed=origin==='resume',costGold=resumed?0:rally?(Object.values(sourceByPerson).every(t=>t?.from===from)?0:route.costGold):route.costGold,account=s.钱包.列表[s.人物.列表[g.ownerId].walletId];
    if(account.gold<costGold)throw Error('撤离旅费不足');
    const r={sourceId:`${e.id}:leg:${e.runs.length}`,origin,routeId:route.id,from,to,totalMinutes:route.minutes,startOffset,endOffset:startOffset,startedAt:resumed?prior.startedAt:now(s),beganAt:now(s),progressedAt:now(s),endedAt:null,arrived:false,costGold,payment:{walletId:account.id,before:account.gold,after:account.gold-costGold},personIds:clone(e.personIds),sourceByPerson,positions:Object.fromEntries(e.personIds.map(id=>[id,clone(actions.positionOf(s,id))])),authority:{kind:'response',sourceId:e.response.sourceId},rallyId:rally?.id??null};
    account.gold-=costGold;s.钱包.列表['wallet-world-transit']??={id:'wallet-world-transit',ownerEntityId:'world-transit',gold:0,扩展:{type:'travel-sink'}};s.钱包.列表['wallet-world-transit'].gold+=costGold;
    for(const id of e.personIds)if(sourceByPerson[id])custody.event(s,'transit-handoff',id,id,`${r.sourceId}:${id}`,{personId:id,from:sourceByPerson[id],toActionId:e.id});
    travel.initialize(s,r,e.id,route.mode==='sea'?[]:e.personIds,route.mode==='sea'?e.personIds:[]);e.runs.push(r);e.paidGold+=costGold;e.status='travelling';e.nextAt=travel.nextAt(r);g.status='evacuating';g.nextAt=e.nextAt;setTransit(s,e,r);
  }
  function leaveCell(s,g,h,c){
    const e=g.evacuation,p=actions.positionOf(s,g.ownerId);if(p.kind!=='location'||!p.sceneId)return;
    const f=(custody.table(s).facilities??[]).find(f=>f.cells.some(cell=>cell.spaceId===p.sceneId)),cell=f?.cells.find(cell=>cell.spaceId===p.sceneId);
    if(!f||!cell||cell.locked&&cell.condition>0)throw Error('撤离出口仍然锁闭');
    const positions=Object.fromEntries(e.personIds.map(id=>[id,clone(actions.positionOf(s,id))]));h.movePeopleTo(s,e.personIds,f.locationId);c.save(s,g,'evacuation-left-cell',{facilityId:f.id,cell:clone(cell),positions});
  }
  function depart(s,g,h,c){
    const e=g.evacuation;ready(s,g);leaveCell(s,g,h,c);const p=actions.positionOf(s,g.ownerId),t=s.人物.列表[g.ownerId].transit;
    if(t){
      if(e.runs.length&&e.personIds.every(id=>same(s.人物.列表[id].transit,t))&&t.actionId===e.id){begin(s,g,h,h.routes[t.routeId],t.from,'resume');c.save(s,g,'evacuation-resumed');return;}
      const encounter=c.encounterFor(s,g.ownerId),route=h.routes[t.routeId];
      if(!encounter||!e.personIds.every(id=>c.encounterFor(s,id)?.id===encounter.id))throw Error('途中撤离需要实际相遇凭证');
      const choices=[route.from,route.to].map(to=>({to,path:h.route(s,g.ownerId,e.destinationId,to),distance:to===route.from?encounter.coordinate:route.minutes-encounter.coordinate})).sort((a,b)=>a.distance+a.path.totalMinutes-b.distance-b.path.totalMinutes);
      const to=choices[0].to,coordinate=to===route.from?Math.floor(encounter.coordinate*4)/4:Math.ceil(encounter.coordinate*4)/4;
      e.rally={id:`${e.id}:rally:${c.table(s).events.filter(v=>v.rescueId===g.id&&v.kind==='evacuation-rally').length}`,encounterId:encounter.id,routeId:route.id,from:to===route.to?route.from:route.to,to,fromCoordinate:encounter.coordinate,toCoordinate:coordinate,distance:Math.abs(coordinate-encounter.coordinate),startedAt:now(s),rallyRateUnits:travel.basis(s,e.personIds).rateUnits,dueAt:now(s)+Math.max(1,Math.ceil(Math.abs(coordinate-encounter.coordinate)*4/travel.basis(s,e.personIds).rateUnits)),sourceByPerson:Object.fromEntries(e.personIds.map(id=>[id,clone(s.人物.列表[id].transit)]))};
      e.status='rally';e.nextAt=e.rally.dueAt;g.nextAt=e.nextAt;c.save(s,g,'evacuation-rally');return;
    }
    if(p.locationId===e.destinationId){e.status='completed';e.nextAt=null;e.arrivedAt=now(s);g.status='completed';g.nextAt=null;g.reason='双方已实际撤离至约定地点';c.save(s,g,'evacuation-arrived');return;}
    const path=h.route(s,g.ownerId,e.destinationId,p.locationId);if(!path.routes.length)throw Error('没有可用撤离路线');begin(s,g,h,path.routes[0],p.locationId,'departure');c.save(s,g,'evacuation-departed');
  }
  function execute(s,g,r,sourceId,h,c){
    if(Object.hasOwn(r,'vehicleId'))throw Error('撤离只支持步行，车辆参数无效');
    const e=g.evacuation;if(!e||!['awaiting-evacuation','evacuating','evacuation-paused'].includes(g.status))throw Error('没有待处理的撤离安排');
    if(r.type==='respond-rescue-evacuation'){
      if(r.actorId!==g.targetId||typeof r.accept!=='boolean')throw Error('须由受援者本人决定');globalThis.SoulInfluenceCore.assertVoluntary(s,r.actorId);actions.resolve(s,{actorId:r.actorId,battleId:null});if(unconscious(s,r.actorId)||controls.actionReason(s,r.actorId,'requirements',{requirements:['voice']})&&controls.actionReason(s,r.actorId,'requirements',{requirements:['gesture']}))throw Error('受援者当前无法作出回应');
      if(!actions.colocated(s,g.ownerId,g.targetId))throw Error('同行提议需要当面回应');
      if(e.status==='travelling')pause(s,g,'受援者正在回应同行安排');
      e.response={actorId:r.actorId,sourceId,accept:r.accept,reason:String(r.reason??''),at:now(s)};
      if(!r.accept){e.status='declined';e.nextAt=null;g.status='completed';g.nextAt=null;g.reason='受援者拒绝后续同行，双方保留实际位置与自由状态';}
      else{ready(s,g);e.status='ready';e.nextAt=now(s)+1;g.status='evacuating';g.nextAt=e.nextAt;g.reason='受援者同意同行，准备按实际条件撤离';}
      c.save(s,g,'evacuation-response');return;
    }
    if(r.actorId!==g.ownerId)throw Error('须由本次营救者安排撤离');actions.resolve(s,{actorId:r.actorId,battleId:null});if(!actions.colocated(s,g.ownerId,g.targetId))throw Error('双方不在同一实际现场');
    if(r.type==='prepare-rescue-evacuation'){
      if(e.status==='rally'||e.runs.length&&(e.status!=='paused'||r.destinationId!==e.destinationId))throw Error('已启程后只能暂停或续行，不能改写目的地');if(!h.locations[r.destinationId])throw Error('撤离地点不存在');
      e.destinationId=r.destinationId;e.response=null;e.status='awaiting';e.nextAt=null;g.status='awaiting-evacuation';g.nextAt=null;g.reason='已提出具体撤离地点，等待受援者回应';c.save(s,g,'evacuation-offered');return;
    }
    if(['travelling','rally'].includes(e.status))throw Error('当前撤离已经进行，请先暂停');
    ready(s,g);e.status='ready';e.nextAt=now(s)+1;g.status='evacuating';g.nextAt=e.nextAt;g.reason='按照本人同意与实际步行条件准备撤离';c.save(s,g,'evacuation-started');
  }
  function progressAt(s,g,at,c){const e=g.evacuation;if(e?.status!=='travelling')return;const r=e.runs.at(-1);if(e.personIds.some(id=>s.人物.列表[id]?.transit?.actionId!==e.id||s.人物.列表[id]?.transit?.stepSourceId!==r.sourceId)){pause(s,g,'撤离人员已经离开原行程');c.save(s,g,'evacuation-paused');return;}if(r.progressedAt===at)return;travel.advanceAt(s,r,at);setTransit(s,e,r);c.save(s,g,'evacuation-progress');}
  function refreshTravelAt(s,g,at,c){const e=g.evacuation;if(e?.status!=='travelling')return;const r=e.runs.at(-1),before=clone(r.travel),nextAt=travel.rebaseAt(s,r,at);if(!same(before,r.travel)||e.nextAt!==nextAt){e.nextAt=nextAt;g.nextAt=nextAt;c.save(s,g,'evacuation-pace-changed');}}
  function advanceAt(s,g,h,c){
    const e=g.evacuation;
    if(g.status!=='evacuating')return;
    try{
      ready(s,g);if(e.nextAt>now(s))return;
      if(e.status==='ready')depart(s,g,h,c);
      else if(e.status==='rally'){const r=e.rally;if(e.personIds.some(id=>!same(r.sourceByPerson[id],s.人物.列表[id].transit))||c.encounterFor(s,g.ownerId)?.id!==r.encounterId)throw Error('原集合现场已经变化');begin(s,g,h,h.routes[r.routeId],r.from,'rally');c.save(s,g,'evacuation-departed');}
      else if(e.status==='travelling'){const r=e.runs.at(-1);r.arrived=true;r.endedAt=now(s);h.movePeopleTo(s,e.personIds,r.to);e.status='ready';e.nextAt=now(s)+1;g.nextAt=e.nextAt;c.save(s,g,'evacuation-waypoint');depart(s,g,h,c);}
    }catch(error){if(unconscious(s,g.targetId))e.response=null;pause(s,g,error.message);c.save(s,g,'evacuation-paused');}
  }
  function source(s,t,id,db){for(const g of db.goals){const e=g.evacuation;if(e?.id!==t.actionId||!e.personIds.includes(id))continue;const r=e.runs.find(r=>r.sourceId===t.stepSourceId);if(r)return {...clone(r),ownerId:g.ownerId,after:r.endedAt??r.progressedAt};}return null;}
  function run(db,actionId,eventSourceId,personId){return db.goals.map(g=>g.evacuation).find(e=>e?.id===actionId)?.runs.find(r=>r.personIds.includes(personId)&&`${r.sourceId}:${personId}`===eventSourceId)??null;}
  function validate(s,g,h,c){
    const e=g.evacuation;if(!e){if(['awaiting-evacuation','evacuating','evacuation-paused'].includes(g.status))throw Error('缺少撤离安排');return;}
    const history=c.table(s).events.filter(v=>v.rescueId===g.id),released=history.find(v=>v.kind==='released');
    if(!released||e.id!==`${g.id}:evacuation`||!h.locations[e.destinationId]||!same(e.personIds,[g.ownerId,g.targetId])||!['awaiting','ready','rally','travelling','paused','completed','declined'].includes(e.status))throw Error('撤离来源或参与者');
    for(const ev of history.filter(v=>v.kind==='evacuation-response')){const r=ev.record.evacuation?.response;if(!r||r.actorId!==g.targetId||typeof r.accept!=='boolean'||r.at!==ev.at||typeof r.sourceId!=='string')throw Error('撤离回应来源');}
    if(e.response&&!history.some(v=>v.kind==='evacuation-response'&&same(v.record.evacuation.response,e.response)))throw Error('撤离缺少实际回应');
    for(const record of [e,...history.map(ev=>ev.record.evacuation).filter(Boolean)])if(Object.hasOwn(record,'vehicleId')||Object.hasOwn(record,'emergency')||record.runs?.some(run=>Object.hasOwn(run,'vehicle')))throw Error('撤离不能包含车辆或失能运输来源');
    for(const ev of history.filter(v=>v.kind==='evacuation-rally')){const r=ev.record.evacuation.rally,enc=c.table(s).encounters.find(v=>v.id===r.encounterId),route=h.routes[r.routeId];if(!enc||!route||r.startedAt!==ev.at||r.dueAt!==r.startedAt+Math.max(1,Math.ceil(r.distance*4/r.rallyRateUnits))||![1,2,3,4].includes(r.rallyRateUnits)||r.fromCoordinate!==enc.coordinate||r.distance!==Math.abs(r.toCoordinate-r.fromCoordinate)||r.distance>=.25||r.toCoordinate!==(r.to===route.from?Math.floor(enc.coordinate*4)/4:Math.ceil(enc.coordinate*4)/4)||r.from!==(r.to===route.from?route.to:route.from)||!e.personIds.every(id=>enc.personIds.includes(id)&&same(enc.anchors[id],r.sourceByPerson[id])))throw Error('实际集合轨迹');}
    let paid=0,previous=null;
    for(const [index,r] of e.runs.entries()){
      const route=h.routes[r.routeId],rally=r.rallyId?history.find(v=>v.kind==='evacuation-rally'&&v.record.evacuation.rally.id===r.rallyId)?.record.evacuation.rally:null;
      if(!route||r.sourceId!==`${e.id}:leg:${index}`||!same(r.personIds,e.personIds)||!['departure','resume','rally'].includes(r.origin)||![route.from,route.to].includes(r.from)||r.to!==(route.from===r.from?route.to:route.from)||r.totalMinutes!==route.minutes||![r.startedAt,r.beganAt,r.progressedAt].every(Number.isSafeInteger)||r.startOffset<0||r.endOffset<r.startOffset||r.progressedAt>now(s)||r.startedAt>r.beganAt||r.arrived&&(r.endOffset!==route.minutes||r.endedAt!==r.progressedAt)||r.endedAt!==null&&r.endedAt!==r.progressedAt||r.payment.walletId!==s.人物.列表[g.ownerId].walletId||r.payment.after<0||r.payment.before-r.payment.after!==r.costGold)throw Error('撤离路段或付款');
      travel.validate(s,r,route.mode==='sea'?[]:e.personIds,route.mode==='sea'?e.personIds:[]);if(r.travel.actionId!==e.id)throw Error('撤离共享路程来源');
      const authorized=history.find(ev=>ev.at<=r.beganAt&&r.authority?.kind==='response'&&ev.kind==='evacuation-response'&&ev.record.evacuation.response?.sourceId===r.authority.sourceId&&ev.record.evacuation.response.accept===true);if(!authorized)throw Error('撤离缺少本次行动许可');
      const expected=r.origin==='resume'?0:r.origin==='rally'&&Object.values(r.sourceByPerson).every(t=>t?.from===r.from)?0:route.costGold;if(r.costGold!==expected)throw Error('撤离费用依据');
      if(r.origin==='departure'&&(r.startOffset!==0||r.startedAt!==r.beganAt||Object.values(r.sourceByPerson).some(Boolean)||e.personIds.some(id=>r.positions?.[id]?.kind!=='location'||r.positions[id].locationId!==r.from||r.positions[id].sceneId)||previous&&(!previous.arrived||previous.to!==r.from)))throw Error('撤离出发地点');
      if(r.origin==='rally'&&(!rally||r.beganAt!==rally.dueAt||r.startedAt!==r.beganAt||r.from!==rally.from||r.startOffset!==(r.from===route.from?rally.toCoordinate:route.minutes-rally.toCoordinate)||!same(r.sourceByPerson,rally.sourceByPerson)))throw Error('撤离集合交接');
      if(r.origin==='resume'&&(!previous||previous.arrived||previous.endedAt===null||r.routeId!==previous.routeId||r.from!==previous.from||r.startOffset!==previous.endOffset||r.startedAt!==previous.startedAt||e.personIds.some(id=>r.sourceByPerson[id]?.actionId!==e.id||r.sourceByPerson[id]?.stepSourceId!==previous.sourceId)))throw Error('撤离续行');
      if(Object.hasOwn(r,'vehicle'))throw Error('撤离路段不能包含车辆来源');
      for(const id of e.personIds)if(r.sourceByPerson[id]&&!custody.table(s).events.some(ev=>ev.type==='transit-handoff'&&ev.personId===id&&ev.sourceId===`${r.sourceId}:${id}`&&ev.toActionId===e.id&&same(ev.from,r.sourceByPerson[id])))throw Error('撤离逐人路段交接');
      if(!r.arrived)for(const id of e.personIds){const consumed=custody.table(s).events.some(ev=>ev.type==='transit-handoff'&&ev.personId===id&&ev.from.actionId===e.id&&ev.from.stepSourceId===r.sourceId)||(s.世界.longActions??[]).some(a=>a.kind==='travel'&&a.steps.some(st=>[a.ownerId,...st.companionIds].includes(id)&&st.legs.some(l=>l.resumes?.actionId===e.id&&l.resumes.sourceId===r.sourceId)));if(!consumed&&(s.人物.列表[id].transit?.actionId!==e.id||s.人物.列表[id].transit?.stepSourceId!==r.sourceId))throw Error('撤离缺少人物实际位置');}
      paid+=r.costGold;previous=r;
    }
    if(e.paidGold!==paid||e.nextAt!==g.nextAt||g.status==='evacuating'&&!['ready','rally','travelling'].includes(e.status)||g.status==='evacuation-paused'&&e.status!=='paused'||g.status==='awaiting-evacuation'&&e.status!=='awaiting')throw Error('撤离阶段');
    if(e.status==='travelling'&&(!previous||previous.endedAt!==null||e.nextAt!==travel.nextAt(previous))||e.status==='rally'&&e.nextAt!==e.rally.dueAt||e.status==='completed'&&!history.some(v=>v.kind==='evacuation-arrived'&&v.at===e.arrivedAt))throw Error('撤离行进时间或抵达');
  }
  return Object.freeze({INTENTS,offer,execute,ready,pause,progressAt,refreshTravelAt,advanceAt,source,run,validate});
});
