(function(root,factory){
  const get=(name,file)=>root?.[name]??(typeof require==='function'?require(file):null);
  const api=factory(get('SoulCustodyCore','./custody-core.js'),get('SoulCustodyLogistics','./custody-logistics-core.js'),get('SoulWorldSocial','./world-social-core.js'),get('SoulPersonCore','./person-core.js'),get('SoulActionContext','./action-context-core.js'),get('SoulControlCore','./control-core.js'),get('SoulAbilityContract','./ability-contract-core.js'),get('SoulCombatEngine','./combat-engine.js'),get('SoulCombatFoundation','./foundation-core.js'),get('SoulRescueEvacuation','./rescue-evacuation-core.js'));
  if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulRescueCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(custody,logistics,social,people,actions,controls,abilities,combat,foundation,evacuation){
  'use strict';
 const travel=globalThis.SoulTravelCore??(typeof require==='function'?require('./travel-core.js'):null);
  const clone=v=>JSON.parse(JSON.stringify(v)),same=(a,b)=>abilities.hash(a)===abilities.hash(b),now=s=>people.now(s);
  // The staged rescue scheduler is retired. Its ledger remains a source for
  // historical movement, payments and release proofs, never a current task.
  const INTENTS=Object.freeze([]);
  const TERMINAL=['completed','failed','abandoned','lost-trail'];
  function table(s,create=false){if(create)s.世界.rescues??={version:1,goals:[],events:[],encounters:[]};return s.世界.rescues??{version:1,goals:[],events:[],encounters:[]};}
  function validStamp(v){if(!v)return false;const c={...v};delete c.hash;return abilities.hash(c)===v.hash;}
  function save(s,g,kind,detail={}){const db=table(s,true),old=db.goals.find(r=>r.id===g.id),previousHash=old?.hash??null;custody.stamp(g);if(old)foundation.commitStateDraft(old,g);else db.goals.push(g);const e=custody.stamp({id:`${g.id}:event:${db.events.filter(e=>e.rescueId===g.id).length}`,rescueId:g.id,at:now(s),order:people.nextEventOrder(s),kind,previousHash,record:clone(g),...clone(detail)});db.events.push(e);return e;}
  function goal(s,id){return table(s).goals.find(g=>g.id===id);}
  function busyReason(s,id){return table(s).goals.some(g=>((g.ownerId===id&&!['paused','awaiting-evacuation','evacuation-paused',...TERMINAL].includes(g.status))||(g.status==='evacuating'&&g.evacuation?.personIds.includes(id))))?'人物正在进行实际营救安排':'';}
  function awake(s,id,move=false){try{actions.resolve(s,{actorId:id,battleId:null,requirements:move?['movement']:[]});if(custody.confined(s,id)||controls.active(s,id).some(v=>['status.sleep','status.stun'].includes(v.模板ID)))return false;return true;}catch{return false;}}
  function idle(s,id,exceptId){const p=actions.positionOf(s,id),current=goal(s,exceptId);return awake(s,id,true)&&!logistics.busyReason(s,id)&&!p.sceneId&&!table(s).goals.some(g=>g.ownerId===id&&g.id!==exceptId&&!TERMINAL.includes(g.status)&&g.status!=='paused'&&(g.status!=='planning'||g.createdOrder<current.createdOrder))&&!(s.世界.npcPlans??[]).some(g=>g.ownerId===id&&['scheduled','travelling','waiting'].includes(g.status))&&!(s.世界.longActions??[]).some(a=>a.ownerId===id&&a.kind!=='wait'&&a.status==='interrupted');}
  function clues(s,id,targetId){const order=new Map(custody.table(s).events.map(e=>[e.id,e.observation?.order??0]));return social.known(s,id).filter(k=>k.fact.subject.personId===targetId).sort((a,b)=>b.fact.occurredAt-a.fact.occurredAt||order.get(b.fact.sourceId)-order.get(a.fact.sourceId));}
  function create(s,ownerId,targetId,sourceId,manual=false){
    const known=clues(s,ownerId,targetId),held=known.find(k=>k.fact.subject.status==='held'&&k.fact.subject.custodyId),latest=known[0],relation=social.relations(s,ownerId).find(r=>r.personId===targetId);
    if(!held||['released','escaped','dead','free'].includes(latest?.fact.subject.status)||ownerId===targetId||held.fact.subject.custodianId===ownerId||!manual&&(!relation||relation.kind==='hostile'))throw Error('没有本人实际获知且仍需调查的被捕线索');
    const id=`rescue:${ownerId}:${held.fact.subject.custodyId}`;if(goal(s,id))throw Error('本人已为这次看管登记营救，不重复创建');
    const g={id,sourceId,ownerId,targetId,custodyId:held.fact.subject.custodyId,triggerObservationId:held.observation.id,relationSourceId:relation?.sourceId??null,manual,createdAt:now(s),createdOrder:people.nextEventOrder(s),clueObservationId:latest.observation.id,clue:clone(latest.fact.subject),homeId:s.人物.列表[ownerId].locationId,status:'planning',nextAt:now(s)+1,journeys:[],battleIds:[],operation:null,reason:'根据本人获知的消息准备营救'};save(s,g,'created');return g;
  }
  function discover(s){
    for(const old of table(s).goals.filter(g=>g.status==='lost-trail'&&!g.manual)){
      const latest=clues(s,old.ownerId,old.targetId)[0];if(!latest||same(latest.fact.subject,old.clue))continue;
      const g=clone(old);g.clue=clone(latest.fact.subject);g.clueObservationId=latest.observation.id;delete g.searchDestinationId;delete g.searchRouteId;g.status='planning';g.nextAt=now(s)+1;g.reason='本人实际收到新的线索，继续原营救';save(s,g,'new-clue');
    }
    const observers=new Set(social.table(s).observations.map(o=>o.observerId));
    for(const id of observers){const p=s.人物.列表[id];if(!p||p.id===s.角色.主控单位ID||p.status==='dead')continue;
      for(const r of social.relations(s,p.id)){if(r.kind==='hostile')continue;const known=clues(s,p.id,r.personId),held=known.find(k=>k.fact.subject.status==='held'&&k.fact.subject.custodyId);if(!held||goal(s,`rescue:${p.id}:${held.fact.subject.custodyId}`))continue;try{create(s,p.id,r.personId,`knowledge:${held.observation.id}`,false);}catch{}}
    }
  }
  function currentJourney(g){return g.journeys.at(-1);}
  function setTransit(s,g,j,run){travel.publishTransit(s,run);}
  function beginLeg(s,g,j,h,prior=null){
    const route=j.path.routes[j.legIndex],from=prior?.from??j.currentLocationId,to=route.from===from?route.to:route.from,account=s.钱包.列表[s.人物.列表[g.ownerId].walletId],cost=0,offset=prior?.elapsedMinutes??0;h.assertRoute(s,g.ownerId,route,to);if(account.gold<cost)throw Error('本人旅费不足');
    const run={sourceId:`${j.id}:leg:${j.runs.length}`,legIndex:j.legIndex,routeId:route.id,from,to,totalMinutes:route.minutes,startOffset:offset,endOffset:offset,startedAt:prior?.startedAt??now(s),beganAt:now(s),progressedAt:now(s),endedAt:null,costGold:cost,payment:{walletId:account.id,before:account.gold,after:account.gold-cost},personIds:[g.ownerId],resumes:clone(prior),arrived:false};
    account.gold-=cost;s.钱包.列表['wallet-world-transit']??={id:'wallet-world-transit',ownerEntityId:'world-transit',gold:0,扩展:{type:'travel-sink'}};s.钱包.列表['wallet-world-transit'].gold+=cost;j.paidGold+=cost;j.runs.push(run);travel.initialize(s,run,j.id,route.mode==='sea'?[]:[g.ownerId],route.mode==='sea'?[g.ownerId]:[]);j.status='travelling';j.nextAt=travel.nextAt(run);j.currentLocationId='';g.status='travelling';g.nextAt=j.nextAt;
    if(prior)custody.event(s,'transit-handoff',g.ownerId,g.ownerId,`${run.sourceId}:${g.ownerId}`,{personId:g.ownerId,from:clone(prior),toActionId:j.id});setTransit(s,g,j,run);
  }
  function startJourney(s,g,h){
    const p=actions.positionOf(s,g.ownerId);if(p.kind!=='location'||p.sceneId)throw Error('须从实际公共落脚点启程');
    let to=g.searchDestinationId??g.clue.position.locationId;
    if(!g.searchDestinationId&&g.clue.position.kind==='transit'){
      const r=h.routes[g.clue.position.routeId];if(!r)throw Error('已知道路不存在');const choices=[r.from,r.to].map(id=>({id,path:h.route(s,g.ownerId,id,p.locationId)})).sort((a,b)=>a.path.totalMinutes-b.path.totalMinutes);to=choices[0].id;g.searchRouteId=r.id;
    }
    if(!h.locations[to])throw Error('没有可前往的已知地点');const path=h.route(s,g.ownerId,to,p.locationId);
    if(!path.routes.length){g.status='searching';g.nextAt=now(s)+1;return;}
    const j={id:`${g.id}:journey:${g.journeys.length}`,ownerId:g.ownerId,personIds:[g.ownerId],destinationId:to,path:clone(path),legIndex:0,currentLocationId:p.locationId,status:'planning',nextAt:null,paidGold:0,runs:[]};beginLeg(s,g,j,h);g.journeys.push(j);
  }
  function pause(s,g,reason){if(g.status!=='paused')g.pausedPhase=g.status;const j=currentJourney(g),run=j?.runs.at(-1);if(j?.status==='travelling'){j.status='paused';j.nextAt=null;if(run&&!run.arrived&&run.endedAt===null){run.endedAt=now(s);run.reason=reason;}}g.status='paused';g.nextAt=null;g.reason=reason;}
  function context(){return {save,table,encounterFor};}
  function progressAt(s,at){for(const original of table(s).goals.filter(g=>g.status==='evacuating'))evacuation.progressAt(s,clone(original),at,context());for(const original of table(s).goals.filter(g=>g.status==='travelling')){const g=clone(original),j=currentJourney(g),run=j.runs.at(-1),p=s.人物.列表[g.ownerId];if(p.transit?.actionId!==j.id||p.transit?.stepSourceId!==run.sourceId){pause(s,g,'实际行程已交接');save(s,g,'paused');continue;}if(run.progressedAt===at)continue;travel.advanceAt(s,run,at);setTransit(s,g,j,run);save(s,g,'progress');}}
  function refreshTravelAt(s,at){for(const original of table(s).goals.filter(g=>g.status==='evacuating'))evacuation.refreshTravelAt(s,clone(original),at,context());for(const original of table(s).goals.filter(g=>g.status==='travelling')){const g=clone(original),j=currentJourney(g),run=j.runs.at(-1),before=clone(run.travel);j.nextAt=travel.rebaseAt(s,run,at);g.nextAt=j.nextAt;if(!same(before,run.travel)||g.nextAt!==original.nextAt)save(s,g,'pace-changed');}}
  function transitSource(s,t,id){const ev=evacuation.source(s,t,id,table(s));if(ev)return ev;for(const g of table(s).goals)for(const j of g.journeys){if(j.id!==t.actionId||g.ownerId!==id)continue;const r=j.runs.find(r=>r.sourceId===t.stepSourceId);if(r)return {...clone(r),ownerId:id,after:r.endedAt??r.progressedAt};}return null;}
  function transitRun(s,actionId,eventSourceId,personId){return evacuation.run(table(s),actionId,eventSourceId,personId)??table(s).goals.flatMap(g=>g.journeys).find(j=>j.id===actionId)?.runs.find(r=>`${r.sourceId}:${personId}`===eventSourceId)??null;}
  function transitConsumed(s,t,id){return custody.table(s).events.some(e=>e.type==='transit-handoff'&&e.personId===id&&e.from.actionId===t.actionId&&e.from.stepSourceId===t.stepSourceId);}
  function velocity(s,id,movingIds=[]){const t=s.人物.列表[id]?.transit;if(!t)return 0;return (s.世界.npcPlans??[]).some(p=>p.id===t.actionId&&p.status==='travelling')||movingIds.includes(id)||(custody.table(s).escorts??[]).some(e=>e.id===t.actionId&&e.status==='travelling')||table(s).goals.some(g=>g.ownerId===id&&g.status==='travelling'&&currentJourney(g)?.id===t.actionId)||table(s).goals.some(g=>g.evacuation?.id===t.actionId&&g.evacuation.status==='travelling')?t.rateUnits/4:0;}
  function crossing(s,g,h,movingIds=[]){
    const carrier=globalThis.SoulSealingCore?.carrier(s,g.targetId),sealed=carrier&&globalThis.SoulSealingCore.active(s,g.targetId),externalId=sealed&&g.clue.containment?.itemId===sealed.itemId?carrier.id:g.targetId,a=s.人物.列表[g.ownerId]?.transit,b=s.人物.列表[externalId]?.transit;if(!a||!b||a.routeId!==b.routeId||encounterFor(s,g.ownerId))return null;const r=h.routes[a.routeId];if(!r)return null;
    const xa=a.from===r.from?a.elapsedMinutes:r.minutes-a.elapsedMinutes,xb=b.from===r.from?b.elapsedMinutes:r.minutes-b.elapsedMinutes,va=velocity(s,g.ownerId,movingIds)*(a.from===r.from?1:-1),vb=velocity(s,externalId,movingIds)*(b.from===r.from?1:-1),delta=va===vb?(xa===xb?0:null):(xb-xa)/(va-vb);
    if(delta===null||delta<0||controls.nextExpiry(s,now(s)+Math.ceil(delta))!==null&&controls.nextExpiry(s,now(s)+Math.ceil(delta))<now(s)+Math.ceil(delta)||va&&delta>(a.totalMinutes-a.elapsedMinutes)/Math.abs(va)||vb&&delta>(b.totalMinutes-b.elapsedMinutes)/Math.abs(vb))return null;
    return {rescueId:g.id,at:now(s)+Math.ceil(delta),fromAt:now(s),routeId:r.id,coordinate:xa+va*delta,coordinateUnits:travel.intersection(xa*4,va*4,xb*4,vb*4)?.coordinate,delta,...(externalId!==g.targetId?{sealedTarget:{targetId:g.targetId,sealId:sealed.id,itemId:sealed.itemId,carrierId:externalId}}:{}),travellers:[{personId:g.ownerId,transit:clone(a),coordinate:xa,velocity:va},{personId:externalId,transit:clone(b),coordinate:xb,velocity:vb}]};
  }
  function crossings(s,through,h,movingIds=[]){return table(s).goals.filter(g=>g.status==='travelling').map(g=>crossing(s,g,h,movingIds)).filter(p=>p&&p.at<=through);}
  function encounterFor(s,id){if(!s.人物.列表[id]?.transit)return null;return [...table(s).encounters].reverse().find(e=>e.personIds.includes(id)&&e.anchors[id]&&same(e.anchors[id],s.人物.列表[id]?.transit));}
  function enterEncounters(s,predictions,h){for(const proof of predictions){const original=goal(s,proof.rescueId);if(!original||original.status!=='travelling'||proof.at!==now(s)||!awake(s,original.ownerId,true)||s.人物.列表[original.targetId].status==='dead')continue;const g=clone(original),target=s.人物.列表[proof.sealedTarget?.carrierId??g.targetId],owner=s.人物.列表[g.ownerId];if(!target.transit||!owner.transit||target.transit.routeId!==proof.routeId||owner.transit.routeId!==proof.routeId)continue;
      const ids=Object.values(s.人物.列表).filter(p=>p.transit&&(same(p.transit,owner.transit)||same(p.transit,target.transit))).map(p=>p.id),id=`encounter:${g.id}:${table(s).encounters.length}`;
      const e=custody.stamp({id,rescueId:g.id,at:now(s),routeId:proof.routeId,coordinate:proof.coordinate,personIds:ids,anchors:Object.fromEntries(ids.map(id=>[id,clone(s.人物.列表[id].transit)])),proof:clone(proof),clueObservationId:g.clueObservationId});table(s,true).encounters.push(e);pause(s,g,'已在实际道路遭遇目标');g.status='searching';g.nextAt=now(s);save(s,g,'encounter',{encounterId:id});
      if(proof.sealedTarget)globalThis.SoulSealingCore.event(s,'carrier-contact',`${id}:seal-contact`,{...proof.sealedTarget,encounterId:id,routeId:proof.routeId,coordinate:proof.coordinate,carrierPosition:clone(actions.positionOf(s,target.id))});
    }}
  function nextAt(s,through,h,movingIds=[]){const values=[...table(s).goals.map(g=>g.nextAt),...crossings(s,through,h,movingIds).map(e=>e.at)].filter(t=>Number.isSafeInteger(t)&&t<=through);return values.length?Math.min(...values):null;}
  function seenTarget(s,g){return !!s.人物.列表[g.targetId]&&actions.colocated(s,g.ownerId,g.targetId);}
  function seenSeal(s,g){const r=globalThis.SoulSealingCore?.active(s,g.targetId);return r&&g.clue.containment?.itemId===r.itemId&&same(globalThis.SoulSealingCore.itemPosition(s,r.itemId),actions.positionOf(s,g.ownerId))?r:null;}
  function knownCell(s,g){const a=g.clue.arrangement;if(a?.kind!=='facility')return null;const f=custody.table(s).facilities?.find(f=>f.id===a.facilityId),c=f?.cells.find(c=>c.id===a.cellId),p=actions.positionOf(s,g.ownerId);return f&&c&&p.kind==='location'&&p.locationId===f.locationId&&(!p.sceneId||p.sceneId===c.spaceId)?{f,c}:null;}
  function defenders(s,g){
    const record=custody.active(s,g.targetId),cell=knownCell(s,g);let ids=[];
    if((seenTarget(s,g)||seenSeal(s,g))&&record){const a=record.arrangement;ids=a?.kind==='escort'?(custody.table(s).escorts??[]).find(e=>e.id===a.escortId)?.guardIds??[]:a?.kind==='facility'?(custody.table(s).duties??[]).filter(d=>d.facilityId===a.facilityId&&d.status==='active').map(d=>d.personId):[record.custodianId,a?.keeperId,globalThis.SoulSealingCore?.carrier(s,g.targetId)?.id];}
    if(cell){ids.push(...(custody.table(s).duties??[]).filter(d=>d.facilityId===cell.f.id&&d.status==='active').map(d=>d.personId));ids.push(g.clue.custodianId);}
    const defeated=id=>table(s).goals.filter(r=>r.custodyId===g.custodyId).flatMap(r=>r.battleIds).some(bid=>{const b=[s.战斗,...Object.values(s.世界.backgroundBattles??{})].find(b=>b.id===bid);return b?.状态==='已结束'&&b.扩展.结果?.winnerSideId==='rescue'&&['defeated','surrendered','escaped'].includes(b.扩展.成员[id]?.status);});
    return [...new Set(ids)].filter(id=>id&&id!==g.ownerId&&id!==g.targetId&&!defeated(id)&&!custody.confined(s,id)&&s.人物.列表[id]?.status!=='dead'&&(!s.战斗单位.列表[id]||s.战斗单位.列表[id].存活状态==='存活'&&s.战斗单位.列表[id].资源.生命.当前>0)&&!controls.active(s,id).some(v=>['status.sleep','status.stun'].includes(v.模板ID))&&!controls.actionReason(s,id,'move')&&actions.colocated(s,id,g.ownerId));
  }
  function battle(s,g,ids,h){
    if(!ids.length)return false;if(ids.length>4)throw Error('现场阻拦者超过一支四人队，须另寻机会');
    const participants=[g.ownerId,...ids];for(const id of participants)h.ensureBody(s,id);if(participants.some(id=>actions.battleOf(s,id))){g.status='searching';g.nextAt=null;g.reason='现场仍有正在进行的战斗，等待实际结果';const old=goal(s,g.id);if(old.status!==g.status||old.nextAt!==null||old.reason!==g.reason)save(s,g,'waiting-battle');return true;}
    const id=`battle:${g.id}:${g.battleIds.length}`,configs=Object.fromEntries(participants.map(personId=>[personId,{sideId:personId===g.ownerId?'rescue':'custody'}]));
    const before=Object.fromEntries(participants.map(id=>[id,clone(actions.positionOf(s,id))])),options={id,participantIds:participants,participantConfigs:configs,battleKind:'lethal',seed:`${s.世界.seed}:${id}`,signals:['主动攻击']};
    foundation.commitStateDraft(s,(participants.includes(s.角色.主控单位ID)?combat.startBattle(s,options):combat.startBackgroundBattle(s,options)).state);
    g.battleIds.push(id);g.status='fighting';g.nextAt=null;g.reason='在实际现场与看守交战';save(s,g,'battle-started',{battleId:id,participantIds:participants,positions:before});return true;
  }
  function check(s,g,kind,itemId=null){
    if(kind==='device'&&globalThis.SoulHostCore?.canDamage(s,s.物品.实例[itemId])===false)throw Error('现有器具的耐久规则不允许物理破坏');
    const actor=s.战斗单位.列表[g.ownerId],cell=knownCell(s,g),item=s.物品.实例[itemId],dc=kind==='door'?logistics.FACILITIES[cell.f.templateId].doorDC:custody.DEVICES[item.templateId].breakDifficulty;
    const sourceId=`${g.id}:operation:${table(s).events.filter(e=>e.rescueId===g.id&&e.kind==='operation-started').length}`,modifier=combat.attributeModifier(s,actor,'力量')+actor.派生.熟练加值,die=combat.rollDice(combat.makeRng(`${s.世界.seed}:${sourceId}`),1,20,'援救破坏检定').total;
    const record=custody.active(s,g.targetId);
    g.operation={sourceId,kind,itemId,templateId:item?.templateId??cell.f.templateId,attachment:clone(item?.attachment??null),custodianId:record?.custodianId??null,custodyAuthority:custody.authorityRef(record),startedOrder:people.nextEventOrder(s),unit:clone(actor),statuses:Object.fromEntries(controls.active(s,g.ownerId).map(v=>[v.id,clone(v)])),facilityId:cell?.f.id??null,cellId:cell?.c.id??null,position:clone(actions.positionOf(s,g.ownerId)),startedAt:now(s),dueAt:now(s)+10,dc,modifier,die,total:die+modifier,passed:die===20||die!==1&&die+modifier>=dc};g.status='freeing';g.nextAt=g.operation.dueAt;save(s,g,'operation-started');
  }
  function inspect(s,g,h){
    const sealed=seenSeal(s,g);if(sealed){if(battle(s,g,defenders(s,g),h))return;const sourceId=`${g.id}:seal-strike:${table(s).events.length}`,receipt=globalThis.SoulSealingCore.strike(s,g.ownerId,sealed.itemId,sourceId,{rescueId:g.id});g.status='searching';g.nextAt=now(s)+1;g.reason=receipt.release?'器体已被实际打破，继续核验剩余拘束与本人意愿':'在已知现场定向打击原器体';save(s,g,'seal-struck',{sourceId,deviceStrike:receipt});return;}
    const cell=knownCell(s,g);if(seenTarget(s,g)||cell){
      if(battle(s,g,defenders(s,g),h))return;
      if(cell&&cell.c.locked&&cell.c.condition>0){controls.assertAction(s,g.ownerId,'requirements',{requirements:['gesture']});check(s,g,'door');return;}
      if(cell&&!seenTarget(s,g)){controls.assertAction(s,g.ownerId,'move');h.movePeopleTo(s,[g.ownerId],cell.f.locationId,cell.c.spaceId);save(s,g,'entered-cell');}
      if(seenTarget(s,g)){
        if(battle(s,g,defenders(s,g),h))return;
        social.execute(s,{type:'observe-custody-person',actorId:g.ownerId,targetId:g.targetId},`${g.id}:sighting:${table(s).events.length}`,h);
        const record=custody.active(s,g.targetId);if(!record||record.id!==g.custodyId){g.status='completed';g.nextAt=null;g.reason='现场确认原看管已经结束';save(s,g,'resolved');return;}
        const item=custody.attached(s,g.targetId).find(i=>i.durability>0);if(item){controls.assertAction(s,g.ownerId,'requirements',{requirements:['gesture']});check(s,g,'device',item.id);return;}
        record.status='released';record.endedAt=now(s);custody.stamp(record);const sourceId=`${g.id}:release`;custody.event(s,'released',g.ownerId,g.targetId,sourceId,{custodyId:record.id,authority:custody.authorityRef(record),rescueId:g.id,battleIds:clone(g.battleIds),detachedItemIds:[],reason:'rescued'});
        evacuation.offer(s,g,h);save(s,g,'released',{custodyId:record.id,sourceId});logistics.advanceAt(s,now(s),h);return;
      }
    }
    const existing=g.clueObservationId;
    for(const p of Object.values(s.人物.列表)){if(p.id===g.ownerId||p.id===g.clue.custodianId||!actions.colocated(s,p.id,g.ownerId)||!awake(s,p.id))continue;const latest=clues(s,p.id,g.targetId)[0];if(!latest)continue;try{social.execute(s,{type:'tell-custody-news',actorId:p.id,targetId:g.ownerId,factIds:[latest.fact.id]},`${g.id}:inquiry:${table(s).events.length}:${p.id}`,h);}catch{}}
    const latest=clues(s,g.ownerId,g.targetId)[0];if(latest&&latest.observation.id!==existing&&!same(latest.fact.subject,g.clue)){g.clue=clone(latest.fact.subject);g.clueObservationId=latest.observation.id;g.status='planning';g.nextAt=now(s)+1;save(s,g,'new-clue');return;}
    if(g.searchRouteId){const route=h.routes[g.searchRouteId],from=s.人物.列表[g.ownerId].locationId,to=route.from===from?route.to:route.from;delete g.searchRouteId;g.searchDestinationId=to;startJourney(s,g,h);save(s,g,'road-search');return;}
    g.status='lost-trail';g.nextAt=null;g.reason='现场未找到目标或更新线索，停在实际地点';save(s,g,'lost-trail');
  }
  function advanceAt(s,at,h){
    discover(s);
    for(const original of [...table(s).goals]){
      const g=clone(original);if(['evacuating','awaiting-evacuation'].includes(g.status)){evacuation.advanceAt(s,g,h,context());continue;}if(TERMINAL.includes(g.status)||['paused','awaiting-evacuation','evacuation-paused'].includes(g.status))continue;
      if(!g.manual&&!social.relations(s,g.ownerId).some(r=>r.personId===g.targetId&&r.kind!=='hostile')){pause(s,g,'本人当前关系认定已经改变，停止自动营救');save(s,g,'relationship-changed');continue;}
      if(s.人物.列表[g.ownerId].status==='dead'){pause(s,g,'营救者已经死亡');g.status='failed';save(s,g,'failed');continue;}
      if(!social.table(s).observations.some(k=>k.id===g.clueObservationId&&social.remembers(s,g.ownerId,k.learnedAt,k.memoryContext,k.learnedOrder))){pause(s,g,'原线索已不在本人记忆中');save(s,g,'paused');continue;}
      if(g.status==='fighting'){
        const b=[s.战斗,...Object.values(s.世界.backgroundBattles??{})].find(b=>b.id===g.battleIds.at(-1));if(!b||b.状态==='进行中')continue;
        const result={battleId:b.id,winnerSideId:b.扩展.结果?.winnerSideId??'',members:clone(b.扩展.成员)};
        if(b.扩展.结果?.winnerSideId!=='rescue'||!awake(s,g.ownerId)){g.status='failed';g.nextAt=null;g.reason='营救战斗未能获胜';save(s,g,'battle-lost',result);continue;}
        g.status='searching';g.nextAt=at+1;save(s,g,'battle-won',result);continue;
      }
      if(g.status==='travelling'&&!awake(s,g.ownerId,true)){pause(s,g,'途中失去移动或清醒条件');save(s,g,'paused');continue;}
      if(g.status==='freeing'&&(!awake(s,g.ownerId)||controls.actionReason(s,g.ownerId,'requirements',{requirements:['gesture']}))){pause(s,g,'援救操作的行动条件已经失效');save(s,g,'paused');continue;}
      if(g.status==='freeing'&&defenders(s,g).length){try{if(battle(s,g,defenders(s,g),h))continue;}catch(error){pause(s,g,error.message);save(s,g,'paused');continue;}}
      if(g.nextAt!==null&&g.nextAt>at)continue;
      try{
        h.ensureBody(s,g.ownerId);
        if(!awake(s,g.ownerId,g.status==='travelling')){pause(s,g,'本人失能、受限或已被捕');save(s,g,'paused');continue;}
        if(g.status==='planning'){
          if(!idle(s,g.ownerId,g.id)){g.nextAt=null;g.reason='等待本人既有安排结束';if(g.nextAt!==original.nextAt||g.reason!==original.reason)save(s,g,'waiting');continue;}
          startJourney(s,g,h);save(s,g,'departed');
        }else if(g.status==='travelling'){
          const j=currentJourney(g),run=j.runs.at(-1);run.arrived=true;run.endedAt=at;j.currentLocationId=run.to;h.movePeopleTo(s,[g.ownerId],run.to);j.legIndex++;
          if(g.replanAtArrival){j.status=j.currentLocationId===j.destinationId?'arrived':'cancelled';j.nextAt=null;delete g.replanAtArrival;g.status='planning';g.nextAt=at+1;}
          else if(j.legIndex<j.path.routes.length)beginLeg(s,g,j,h);else{j.status='arrived';j.nextAt=null;g.status='searching';g.nextAt=at+1;}save(s,g,'arrived');
        }else if(g.status==='searching')inspect(s,g,h);
        else if(g.status==='freeing'){
          const op=g.operation;controls.assertAction(s,g.ownerId,'requirements',{requirements:['gesture']});if(!same(actions.positionOf(s,g.ownerId),op.position)||defenders(s,g).length)throw Error('援救现场或阻拦者已经变化');
          if(op.custodyAuthority&&!custody.sameAuthority(custody.currentAuthority(s,g.targetId),op.custodyAuthority))throw Error('原看管权限已变化，须重新处理现场');
          if(op.passed){if(op.kind==='door'){const cell=knownCell(s,g),record={personId:g.ownerId,arrangement:{kind:'facility',facilityId:op.facilityId,cellId:op.cellId}};if(!cell||cell.f.id!==op.facilityId||cell.c.id!==op.cellId)throw Error('原牢门已变化');logistics.breakDoor(s,record,op.sourceId);}
            else{const item=s.物品.实例[op.itemId],record=custody.active(s,g.targetId);if(!seenTarget(s,g)||item?.attachment?.wearerId!==g.targetId||!same(item.attachment,op.attachment)||item.durability<=0||record?.id!==g.custodyId||!custody.sameAuthority(custody.authorityRef(record),op.custodyAuthority))throw Error('原看管、装配或现场已变化');if(globalThis.SoulHostCore?.canDamage(s,item)===false)throw Error('现有器具的耐久规则不允许物理破坏');if(globalThis.SoulHostCore)globalThis.SoulHostCore.damage(s,item,item.durability);else{item.durability=0;item.condition='破损';}for(const id of [...item.attachment.effectIds])if(s.状态实例.列表[id])combat.removeStatus(s,id,'broken-free');}}
          g.operation={...op,endedAt:at};g.status='searching';g.nextAt=at+1;save(s,g,op.passed?'operation-succeeded':'operation-failed');
        }
      }catch(error){pause(s,g,error.message);save(s,g,'paused');}
    }
  }
  function execute(s,r,sourceId,h){
    let g;if(r.type==='await-rescue'){const old=goal(s,r.rescueId);people.assertAlive(s,r.actorId);if(!old?.evacuation||![old.ownerId,old.targetId].includes(r.actorId)||actions.battleOf(s,r.actorId)||!Number.isSafeInteger(r.minutes)||r.minutes<1||r.minutes>1440)throw Error('本人获救后可等待1至1440分钟');const before=now(s),timing=h.advanceActionTime(s,r.actorId,r.minutes);g=clone(goal(s,r.rescueId));save(s,g,'evacuation-waited',{sourceId,actorId:r.actorId,before,minutes:timing.minutes});return {type:'person-rescue',action:r.type,actorId:r.actorId,targetId:g.targetId,rescueId:g.id,status:g.status,summary:`原地等待了${timing.minutes}分钟。`};}
    else if(evacuation.INTENTS.includes(r.type)){const old=goal(s,r.rescueId);if(!old)throw Error('没有这项营救');g=clone(old);evacuation.execute(s,g,r,sourceId,h,context());}
    else if(r.type==='start-person-rescue'){actions.resolve(s,{actorId:r.actorId,battleId:null});g=create(s,r.actorId,r.targetId,sourceId,true);}
    else{const original=goal(s,r.rescueId);if(!original||original.ownerId!==r.actorId)throw Error('没有本人这项营救安排');g=clone(original);actions.resolve(s,{actorId:r.actorId,battleId:null});if(g.evacuation&&!TERMINAL.includes(g.status)){if(r.type==='resume-person-rescue'){if(g.status!=='evacuation-paused')throw Error('撤离并未暂停');evacuation.ready(s,g);g.evacuation.status='ready';g.evacuation.nextAt=now(s)+1;g.status='evacuating';g.nextAt=now(s)+1;save(s,g,'evacuation-resumed');}else{evacuation.pause(s,g,r.type==='abandon-person-rescue'?'本人结束后续护送':'本人暂停撤离');if(r.type==='abandon-person-rescue'){g.status='abandoned';g.evacuation.status='declined';}save(s,g,'evacuation-paused');}return {type:'person-rescue',action:r.type,actorId:r.actorId,targetId:g.targetId,rescueId:g.id,status:g.status,summary:g.reason};}if(['pause-person-rescue','abandon-person-rescue'].includes(r.type)){if(TERMINAL.includes(g.status))throw Error('原营救已经终结');pause(s,g,r.type==='abandon-person-rescue'?'本人放弃后续营救':'本人暂停当前营救');if(r.type==='abandon-person-rescue')g.status='abandoned';save(s,g,g.status);}else{if(!['paused','lost-trail'].includes(g.status))throw Error('营救不在待恢复阶段');const latest=clues(s,g.ownerId,g.targetId)[0];if(!latest)throw Error('本人没有可用线索');g.clue=clone(latest.fact.subject);g.clueObservationId=latest.observation.id;delete g.searchDestinationId;delete g.searchRouteId;const t=s.人物.列表[g.ownerId].transit,j=currentJourney(g);if(['searching','freeing'].includes(g.pausedPhase)&&(seenTarget(s,g)||seenSeal(s,g)||knownCell(s,g))){g.status='searching';g.nextAt=now(s)+1;}else if(t){if(!j||t.actionId!==j.id||j.status!=='paused'||!awake(s,g.ownerId,true))throw Error('当前路段或行动条件不支持继续原营救');beginLeg(s,g,j,h,clone(t));g.replanAtArrival=true;}else{g.status='planning';g.nextAt=now(s)+1;}delete g.pausedPhase;save(s,g,'resumed');}}
    return {type:'person-rescue',action:r.type,actorId:r.actorId,targetId:g.targetId,rescueId:g.id,status:g.status,summary:g.reason};
  }
  function responseView(response){if(!response)return null;const {actorId,sourceId,accept,at}=response;return {actorId,sourceId,accept,at};}
  function facts(s,id){return table(s).goals.filter(g=>g.ownerId===id||g.targetId===id&&g.evacuation).map(g=>({id:g.id,ownerId:g.ownerId,targetId:g.targetId,status:g.status,reason:g.reason,nextAt:g.nextAt,clue:g.ownerId===id?clone(g.clue):{personId:g.targetId,name:s.人物.列表[g.targetId].name},battleIds:g.ownerId===id?clone(g.battleIds):[],evacuation:g.evacuation?{destinationId:g.evacuation.destinationId,destinationName:s.地图.地点[g.evacuation.destinationId]?.name??null,status:g.evacuation.status,response:responseView(g.evacuation.response)}:null,paidGold:g.ownerId===id?g.journeys.reduce((n,j)=>n+j.paidGold,0)+(g.evacuation?.paidGold??0):null}));}
  function validate(s,h){
    const db=s.世界.rescues;if(!db)return [];const errors=[],latest=new Map(),ids=new Set(),at=now(s),eventCounts=new Map(),occupied=new Set();let lastEventOrder=0;
    if(db.version!==1||!Array.isArray(db.goals)||!Array.isArray(db.events)||!Array.isArray(db.encounters))return ['营救账本格式无效'];
    for(const e of db.events){const old=latest.get(e.rescueId),index=eventCounts.get(e.rescueId)??0;if(!Number.isSafeInteger(e.order)||e.order<=lastEventOrder||e.order>s.扩展.personEventSequence||!validStamp(e)||!validStamp(e.record)||e.id!==`${e.rescueId}:event:${index}`||e.previousHash!==(old?.record.hash??null)||e.rescueId!==e.record.id||!Number.isSafeInteger(e.at)||e.at>at||old&&e.at<old.at||!old&&e.kind!=='created')errors.push('营救事件链无效');latest.set(e.rescueId,e);lastEventOrder=e.order;eventCounts.set(e.rescueId,index+1);}
    for(const g of db.goals)try{
      const first=db.events.find(e=>e.rescueId===g.id);
      if(ids.has(g.id)||g.id!==`rescue:${g.ownerId}:${g.custodyId}`||!validStamp(g)||!same(latest.get(g.id)?.record,g)||!s.人物.列表[g.ownerId]||!s.人物.列表[g.targetId]||g.ownerId===g.targetId||!Array.isArray(g.journeys)||!Array.isArray(g.battleIds)||new Set(g.battleIds).size!==g.battleIds.length)throw Error('身份或当前记录');ids.add(g.id);
      for(const key of ['id','sourceId','ownerId','targetId','custodyId','triggerObservationId','relationSourceId','manual','createdAt','createdOrder','homeId'])if(!same(g[key],first.record[key]))throw Error('初始任务来源已改变');
      const trigger=social.table(s).observations.find(o=>o.id===g.triggerObservationId),f=social.table(s).facts[trigger?.factId],clue=social.table(s).observations.find(o=>o.id===g.clueObservationId);
      const relation=Object.values(s.人物.列表).flatMap(p=>p.扩展?.社交约定??[]).find(r=>r.id===g.relationSourceId),relationEvent=relation?.events.filter(e=>e.order<g.createdOrder).at(-1);
      const rewritten=globalThis.SoulRelationRewrites?.rescueSource(s,g.relationSourceId,g.ownerId,g.targetId,g.createdOrder);
      if(!trigger||trigger.observerId!==g.ownerId||trigger.learnedAt>g.createdAt||trigger.learnedOrder>=g.createdOrder||g.createdOrder>s.扩展.personEventSequence||f?.subject.custodyId!==g.custodyId||f.subject.personId!==g.targetId||!clue||clue.observerId!==g.ownerId||!same(g.clue,social.table(s).facts[clue.factId]?.subject)||!g.manual&&!rewritten&&(!relation||relation.relationship==='hostile'||relationEvent?.status!=='completed'||![relation.personId,relation.playerId].includes(g.ownerId)||![relation.personId,relation.playerId].includes(g.targetId)))throw Error('实际知识或关系来源');
      if(!['planning','travelling','searching','fighting','freeing','paused','awaiting-evacuation','evacuating','evacuation-paused',...TERMINAL].includes(g.status)||g.nextAt!==null&&(!Number.isSafeInteger(g.nextAt)||g.nextAt<latest.get(g.id).at))throw Error('状态或历史计划时间');
      // Retired records are checked at their last real event. They no longer
      // occupy a present-day action slot or compete with new NPC plans.
      evacuation.validate(s,g,h,context());
      for(const [ji,j] of g.journeys.entries()){
        if(j.id!==`${g.id}:journey:${ji}`||j.ownerId!==g.ownerId||!same(j.personIds,[g.ownerId])||!Array.isArray(j.runs)||!j.runs.length||!Array.isArray(j.path.routes)||!j.path.routes.length||!['travelling','paused','arrived','cancelled'].includes(j.status))throw Error('行程结构');
        let location=j.path.from,totalMinutes=0,totalCostGold=0;
        for(const [ri,r] of j.path.routes.entries()){const template=h.routes[r.id];if(!h.routeSnapshotMatches(r,template)||j.path.routeIds[ri]!==r.id||j.path.locationIds[ri]!==location||![r.from,r.to].includes(location))throw Error('计划道路');location=r.from===location?r.to:r.from;totalMinutes+=r.minutes;totalCostGold+=r.costGold;}
        if(location!==j.destinationId||j.path.to!==location||j.path.locationIds.at(-1)!==location||j.path.routes.length!==j.path.routeIds.length||j.path.totalMinutes!==totalMinutes||j.path.totalCostGold!==totalCostGold)throw Error('计划终点或费用');
        let paid=0,previous=null;
        for(const [ri,r] of j.runs.entries()){
          const route=h.routes[r.routeId];if(!route||r.sourceId!==`${j.id}:leg:${ri}`||j.path.routes[r.legIndex]?.id!==route.id||![route.from,route.to].includes(r.from)||(route.from===r.from?route.to:route.from)!==r.to||r.totalMinutes!==route.minutes||![0,r.resumes?0:route.costGold].includes(r.costGold)||r.payment.walletId!==s.人物.列表[g.ownerId].walletId||r.payment.before-r.payment.after!==r.costGold||r.payment.after<0||![r.startedAt,r.beganAt,r.progressedAt].every(Number.isSafeInteger)||r.startedAt>r.beganAt||r.endOffset<0||r.endOffset>r.totalMinutes||r.progressedAt>at||!same(r.personIds,[g.ownerId])||r.arrived&&(r.endOffset!==route.minutes||r.endedAt!==r.progressedAt)||r.endedAt!==null&&r.endedAt!==r.progressedAt)throw Error('实际道路或付款');
          travel.validate(s,r,route.mode==='sea'?[]:[g.ownerId],route.mode==='sea'?[g.ownerId]:[]);if(r.travel.actionId!==j.id)throw Error('营救共享路程来源');
          if(r.resumes){if(!previous||previous.arrived||r.resumes.actionId!==j.id||r.resumes.stepSourceId!==previous.sourceId||r.startOffset!==previous.endOffset||r.startedAt!==previous.startedAt||r.legIndex!==previous.legIndex||r.from!==previous.from||r.beganAt<previous.endedAt)throw Error('已付路费续行');}
          else if(r.startOffset!==0||r.startedAt!==r.beganAt||r.legIndex!==(previous?previous.legIndex+1:0)||previous&&(!previous.arrived||r.from!==previous.to||r.beganAt<previous.endedAt))throw Error('新路段起点');
          if(!r.arrived&&!transitConsumed(s,{actionId:j.id,stepSourceId:r.sourceId},g.ownerId)&&!(s.世界.longActions??[]).some(a=>a.kind==='travel'&&a.steps.some(step=>[a.ownerId,...step.companionIds].includes(g.ownerId)&&step.legs.some(l=>l.resumes?.actionId===j.id&&l.resumes.sourceId===r.sourceId)))){const t=s.人物.列表[g.ownerId].transit;if(t?.actionId!==j.id||t.stepSourceId!==r.sourceId||t.elapsedMinutes!==r.endOffset)throw Error('未走完道路没有实际位置');}
          paid+=r.costGold;previous=r;
        }
        if(j.paidGold!==paid||j.legIndex!==(previous.arrived?previous.legIndex+1:previous.legIndex)||j.status==='travelling'&&(previous.endedAt!==null||previous.arrived||j.nextAt!==travel.nextAt(previous)||g.status!=='travelling'||currentJourney(g)!==j||g.nextAt!==j.nextAt)||j.status!=='travelling'&&j.nextAt!==null||j.status==='arrived'&&(!previous.arrived||previous.to!==j.destinationId))throw Error('行程状态或费用合计');
      }
      if(g.status==='travelling'&&currentJourney(g)?.status!=='travelling'||g.status==='freeing'&&(!g.operation||g.operation.endedAt!==undefined||g.nextAt!==g.operation.dueAt))throw Error('当前阶段缺少实际进行中的行动');
      for(const id of g.battleIds){const e=db.events.find(e=>e.rescueId===g.id&&e.kind==='battle-started'&&e.battleId===id),b=[s.战斗,...Object.values(s.世界.backgroundBattles??{})].find(b=>b.id===id),ending=db.events.find(e=>e.rescueId===g.id&&e.battleId===id&&['battle-won','battle-lost'].includes(e.kind));if(!e||!e.participantIds.includes(g.ownerId)||e.participantIds.length<2||e.participantIds.length>5||e.participantIds.some(id=>!same(e.positions[id],e.positions[g.ownerId]))||!b&&!ending)throw Error('营救战斗来源或实际同场');if(b&&(b.扩展.battleKind!=='lethal'||!same([...b.参与者ID列表].sort(),[...e.participantIds].sort())||e.participantIds.some(id=>b.扩展.成员[id]?.sideId!==(id===g.ownerId?'rescue':'custody'))||ending&&(b.状态!=='已结束'||b.扩展.结果?.winnerSideId!==ending.winnerSideId||!same(b.扩展.成员,ending.members))))throw Error('营救实际战斗结果');if(ending?.kind==='battle-won'&&ending.winnerSideId!=='rescue')throw Error('获胜凭证');}
      for(const e of db.events.filter(e=>e.rescueId===g.id&&e.kind==='operation-started')){
        const o=e.record.operation,die=combat.rollDice(combat.makeRng(`${s.世界.seed}:${o.sourceId}`),1,20,'援救破坏检定').total,dc=o.kind==='door'?logistics.FACILITIES[o.templateId]?.doorDC:custody.DEVICES[o.templateId]?.breakDifficulty,modifier=combat.attributeModifier({状态实例:{列表:o.statuses}},o.unit,'力量')+o.unit.派生.熟练加值;
        if(o.custodyAuthority?(o.custodyAuthority.custodyId!==g.custodyId||o.custodyAuthority.personId!==g.targetId||!custody.authorityAt(s,o.custodyAuthority,o.custodianId,o.startedAt,o.startedOrder)):custody.historicalAuthority(s,g.targetId,o.startedAt,o.startedOrder)!==null)throw Error('援救开始时看管来源');
        if(!Number.isSafeInteger(o.startedOrder)||o.startedOrder>s.扩展.personEventSequence||!['door','device'].includes(o.kind)||o.unit.id!==g.ownerId||o.startedAt!==e.at||o.dc!==dc||o.modifier!==modifier||o.dueAt!==o.startedAt+10||o.die!==die||o.total!==die+o.modifier||o.passed!==(die===20||die!==1&&o.total>=o.dc)||o.kind==='device'&&(!validStamp(o.attachment)||o.attachment.wearerId!==g.targetId||!custody.table(s).events.some(r=>r.itemId===o.itemId&&r.at<=o.startedAt&&same(r.attachment,o.attachment))))throw Error('援救检定或原操作来源');
      }
      if(g.operation){const start=db.events.find(e=>e.rescueId===g.id&&e.kind==='operation-started'&&e.record.operation.sourceId===g.operation.sourceId),copy={...g.operation};delete copy.endedAt;if(!start||!same(copy,start.record.operation)||g.operation.endedAt!==undefined&&g.operation.endedAt!==g.operation.dueAt)throw Error('援救操作前后来源');}
    }catch(error){errors.push(`营救${g.id}无效：${error.message}`);}
    for(const e of db.events.filter(v=>v.kind==='seal-struck')){const strike=globalThis.SoulSealingCore.table(s).events.find(v=>v.type==='device-struck'&&v.sourceId===e.sourceId);if(!strike||strike.at!==e.at||strike.rescueId!==e.rescueId||strike.actorId!==e.record.ownerId||e.deviceStrike?.itemId!==strike.itemId||e.deviceStrike?.damage!==strike.damage)errors.push('营救破封缺少原器体的实际打击来源');}
    for(const e of db.encounters)try{const route=h.routes[e.routeId],p=e.proof,g=goal(s,e.rescueId);if(!same(p.coordinateUnits,travel.intersection(p.travellers[0]?.coordinate*4,p.travellers[0]?.velocity*4,p.travellers[1]?.coordinate*4,p.travellers[1]?.velocity*4)?.coordinate))throw Error('整数路程交会证明');if(!validStamp(e)||!g||!route||e.at!==p.at||e.at!==p.fromAt+Math.ceil(p.delta)||p.delta<0||e.coordinate<0||e.coordinate>route.minutes||p.travellers.length!==2||!same(p.travellers.map(t=>t.personId),[g.ownerId,p.sealedTarget?.carrierId??g.targetId])||new Set(e.personIds).size!==e.personIds.length||e.personIds.some(id=>!s.人物.列表[id]||e.anchors[id]?.routeId!==e.routeId))throw Error('字段');if(p.sealedTarget){const v=p.sealedTarget,source=globalThis.SoulSealingCore.table(s).events.find(v2=>v2.type==='carrier-contact'&&v2.encounterId===e.id),r=globalThis.SoulSealingCore.record(s,v.sealId);if(!source||source.itemId!==v.itemId||source.carrierId!==v.carrierId||source.targetId!==g.targetId||r?.targetId!==g.targetId||r.itemId!==v.itemId||r.enteredAt>e.at||r.endedAt!==null&&r.endedAt<e.at||social.table(s).facts[social.table(s).observations.find(o=>o.id===e.clueObservationId&&o.observerId===g.ownerId&&o.learnedAt<=e.at)?.factId]?.subject.containment?.itemId!==v.itemId)throw Error('封存携带者来源');}for(const t of p.travellers){const a=t.transit,anchor=e.anchors[t.personId];if(!anchor||a.routeId!==route.id||![route.from,route.to].includes(a.from)||(route.from===a.from?route.to:route.from)!==a.to||t.coordinate!==(a.from===route.from?a.elapsedMinutes:route.minutes-a.elapsedMinutes)||![0,(a.from===route.from?1:-1)*a.rateUnits/4].includes(t.velocity)||Math.abs(t.coordinate+t.velocity*p.delta-e.coordinate)>1e-9||anchor.elapsedMinutes!==Math.min(a.totalMinutes,a.elapsedMinutes+Math.abs(t.velocity)*(e.at-p.fromAt))||anchor.actionId!==a.actionId||anchor.stepSourceId!==a.stepSourceId)throw Error('轨迹');}}catch{errors.push('实际道路相遇凭证无效');}
    for(const id of latest.keys())if(!ids.has(id))errors.push('营救历史缺少当前任务');
    for(const e of custody.table(s).events.filter(e=>e.type==='released'&&e.reason==='rescued'))if(!db.events.some(r=>r.kind==='released'&&r.rescueId===e.rescueId&&r.sourceId===e.sourceId&&r.custodyId===e.custodyId&&r.at===e.at))errors.push('获救终结缺少实际营救结算');
    return errors;
  }
  const retiredSchedule=()=>{},noTasks=()=>[];
  // Only an already paid, actually occupied road may finish after retirement.
  // No planning, target search, next leg, combat or evacuation offer is resumed.
  function retiredRoads(s){return table(s).goals.flatMap(g=>{const evacuationRoad=g.status==='evacuating'&&g.evacuation?.status==='travelling',holder=evacuationRoad?g.evacuation:g.status==='travelling'?currentJourney(g):null,run=holder?.runs.at(-1);return holder?.status==='travelling'&&run?.endedAt===null&&!run.arrived?[{goal:g,evacuationRoad,holder,run,personIds:run.personIds}]:[];});}
  const actualRoad=(s,road)=>road.personIds.every(id=>{const t=s.人物.列表[id]?.transit;return t?.actionId===road.holder.id&&t.stepSourceId===road.run.sourceId;});
  const canFinishRoad=(s,road)=>actualRoad(s,road)&&road.personIds.every(id=>awake(s,id,true));
  function pauseRetiredRoad(s,road,reason){const g=clone(road.goal),holder=road.evacuationRoad?g.evacuation:currentJourney(g),run=holder.runs.at(-1);run.endedAt=run.progressedAt;run.reason=reason;holder.status='paused';holder.nextAt=null;if(road.evacuationRoad)holder.pausedPhase='travelling';else g.pausedPhase='travelling';g.status=road.evacuationRoad?'evacuation-paused':'paused';g.nextAt=null;g.reason=reason;save(s,g,road.evacuationRoad?'evacuation-paused':'paused');}
  function retiredProgressAt(s,at){if(!retiredRoads(s).length)return;if(at!==now(s))throw Error('退休路段只能随实际世界时刻推进');for(const road of retiredRoads(s)){if(!canFinishRoad(s,road)){pauseRetiredRoad(s,road,'原营救流程已停用；当前路段因实际行动条件或交接而暂停，可按普通旅行继续。');continue;}if(road.run.progressedAt===at)continue;const g=clone(road.goal),holder=road.evacuationRoad?g.evacuation:currentJourney(g),run=holder.runs.at(-1);travel.advanceAt(s,run,at);save(s,g,road.evacuationRoad?'evacuation-progress':'progress');}}
  function retiredRefreshAt(s,at){if(!retiredRoads(s).length)return;if(at!==now(s))throw Error('退休路段只能按当前时刻刷新');for(const road of retiredRoads(s)){if(!canFinishRoad(s,road))continue;const g=clone(road.goal),holder=road.evacuationRoad?g.evacuation:currentJourney(g),run=holder.runs.at(-1),before=clone(run.travel),due=travel.rebaseAt(s,run,at);if(!same(before,run.travel)||g.nextAt!==due){holder.nextAt=due;g.nextAt=due;save(s,g,road.evacuationRoad?'evacuation-pace-changed':'pace-changed');}}}
  function retiredNextAt(s,through=Infinity){const due=retiredRoads(s).filter(road=>canFinishRoad(s,road)).map(road=>travel.nextAt(road.run,through)).filter(at=>at!==null&&at>=now(s));return due.length?Math.min(...due):null;}
  function retiredAdvanceAt(s,at,h){if(!retiredRoads(s).length)return;if(at!==now(s))throw Error('退休路段只能在实际世界时刻收尾');for(const road of retiredRoads(s)){if(!canFinishRoad(s,road)){pauseRetiredRoad(s,road,'原营救流程已停用；当前路段因实际行动条件或交接而暂停，可按普通旅行继续。');continue;}if(road.run.travel.progressUnits<road.run.travel.totalUnits)continue;const g=clone(road.goal),holder=road.evacuationRoad?g.evacuation:currentJourney(g),run=holder.runs.at(-1);run.arrived=true;run.endedAt=run.progressedAt;h.movePeopleTo(s,road.personIds,run.to);holder.nextAt=null;if(road.evacuationRoad){holder.status='paused';holder.pausedPhase='travelling';}else{holder.currentLocationId=run.to;holder.legIndex++;holder.status=holder.currentLocationId===holder.destinationId?'arrived':'cancelled';}g.status='abandoned';g.nextAt=null;g.reason='原营救流程已停用；已按真实进度走完当前已付路段，后续行动由人物另行决定。';save(s,g,'abandoned');}}
  function retiredExecute(){throw Error('原营救进度与等待回应流程已停用；解除看管按真实战后结果处理。');}
  function reconcileDeaths(s){custody.reconcileDeaths(s);}
  return Object.freeze({INTENTS,table,busyReason:()=>'',discover:retiredSchedule,execute:retiredExecute,progressAt:retiredProgressAt,refreshTravelAt:retiredRefreshAt,nextAt:retiredNextAt,crossings:noTasks,enterEncounters:retiredSchedule,advanceAt:retiredAdvanceAt,transitSource,transitRun,transitConsumed,encounterFor,facts:noTasks,reconcileDeaths,validate});
});
