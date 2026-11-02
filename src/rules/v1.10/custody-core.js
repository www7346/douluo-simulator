(function attachCustody(root,factory){
  const people=root?.SoulPersonCore??(typeof require==='function'?require('./person-core.js'):null);
  const actions=root?.SoulActionContext??(typeof require==='function'?require('./action-context-core.js'):null);
  const abilities=root?.SoulAbilityContract??(typeof require==='function'?require('./ability-contract-core.js'):null);
  const controls=root?.SoulControlCore??(typeof require==='function'?require('./control-core.js'):null);
  const influence=root?.SoulInfluenceCore??(typeof require==='function'?require('./influence-core.js'):null);
  const api=factory(people,actions,abilities,controls,influence);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.SoulCustodyCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(people,actions,abilities,controls,influence){
  'use strict';
  const clone=value=>JSON.parse(JSON.stringify(value));
  const BATTLE_KINDS=Object.freeze(['encounter','lethal','sparring','competition','hunt']);
  const DEVICES=Object.freeze({
    'restraint-ankles':{name:'短链足铐',part:'legs',capture:false,maxLevel:49,price:600,breakDifficulty:20,modes:{locked:[['status.limb_bind',{部位:'双腿'}]],released:[]}},
    'restraint-sinking-wrists':{name:'沉星腕环',part:'hands',capture:true,maxLevel:49,price:3400,breakDifficulty:22,modes:{locked:[['status.limb_bind',{部位:'双手'}],['status.buff',{属性:'力量',数值:-2}]],limited:[['status.buff',{属性:'力量',数值:-2}]],released:[]}},
    'restraint-quicksand-ankles':{name:'流沙足环',part:'legs',capture:false,maxLevel:49,price:3310,breakDifficulty:20,modes:{locked:[['status.limb_bind',{部位:'双腿'}],['status.slow',{数值:1}]],limited:[['status.slow',{数值:1}]],released:[]}},
    'restraint-tether':{name:'扣腕牵绳',part:'hands',capture:true,maxLevel:19,price:65,breakDifficulty:12,modes:{locked:[['status.limb_bind',{部位:'双手'}]],escort:[['status.limb_bind',{部位:'双手'}]],released:[]}},
    'restraint-net':{name:'钢环束网',part:'body',capture:true,maxLevel:39,price:450,breakDifficulty:18,modes:{locked:[['status.limb_bind',{部位:'全身'}]],released:[]}},
    rope:{name:'十米麻绳',part:'body',capture:true,maxLevel:29,price:90,breakDifficulty:14,modes:{locked:[['status.limb_bind',{部位:'全身'}]],escort:[['status.limb_bind',{部位:'双手'}]],released:[]}},
    'restraint-cuffs':{name:'玄铁拘束铐',part:'hands',capture:true,maxLevel:59,price:800,breakDifficulty:22,modes:{locked:[['status.limb_bind',{部位:'双手'}]],released:[]}},
    'restraint-gag':{name:'禁声束具',part:'mouth',capture:false,maxLevel:99,price:150,breakDifficulty:16,modes:{locked:[['status.mute',{}]],released:[]}},
    'restraint-seal-collar':{name:'禁魂项圈',part:'neck',capture:false,autoRelock:true,maxLevel:49,price:2400,breakDifficulty:24,modes:{locked:[['status.power_seal',{封印对象:'魂力',范围:'全部'}],['status.power_seal',{封印对象:'武魂',范围:'全部'}],['status.power_seal',{封印对象:'魂技',范围:'全部'}]],released:[]}},
    'restraint-seal-platform':{name:'封神台式囚锁',part:'body',capture:true,autoRelock:true,maxLevel:99,price:160000,breakDifficulty:36,modes:{locked:[['status.limb_bind',{部位:'全身'}],['status.power_seal',{封印对象:'魂力',范围:'全部'}],['status.power_seal',{封印对象:'魂技',范围:'全部'}]],escort:[['status.limb_bind',{部位:'双手'}],['status.power_seal',{封印对象:'武魂',范围:'全部'}],['status.power_seal',{封印对象:'魂技',范围:'全部'}]],released:[]}},
    'restraint-slime-suit':{name:'绝望女神套装',part:'body',capture:true,autoRelock:true,maxLevel:99,price:88000,breakDifficulty:40,indestructible:true,wearerLock:true,modes:{locked:[['status.limb_bind',{部位:'全身'}],['status.power_seal',{封印对象:'魂力',范围:'全部'}],['status.power_seal',{封印对象:'魂技',范围:'全部'}],['status.buff',{属性:'身法',数值:-1}]],limited:[['status.limb_bind',{部位:'全身'}],['status.buff',{属性:'身法',数值:-1}]],released:[]},
      host:{version:2,capabilities:{durability:{mode:'indestructible'},release:{wearerLock:true,releaser:'controller'},suppression:{percent:0,kinds:['ordinary'],maxRank:9},forms:{slots:{},changeMinutes:2},appearance:{current:'胶衣',presets:['胶衣','洋裙','魔法少女','女魔法师','性奴隶','情趣'],changeMinutes:2}}}},
  });
  for(const id of ['restraint-seal-collar','restraint-seal-platform'])DEVICES[id].modes.limited=[];
  function resolveDevice(item){return globalThis.SoulRealmArrangements?.resolveDevice(item)??globalThis.SoulBackgroundRestraints?.resolve(item)??DEVICES[item?.templateId];}
  const normalizePart=part=>({neck:'neck','颈部':'neck',mouth:'mouth','口腔':'mouth','口部':'mouth',hands:'hands','手部':'hands','双手':'hands',legs:'legs','踝部':'legs','双腿':'legs',feet:'feet','足部':'feet',body:'body','躯干与四肢':'body',anchor:'anchor','场景固定':'anchor','眼部':'eyes'})[part]??part;
  function occupiedParts(state,item){const a=item?.attachment,parts=[];if(a){if(a.part)parts.push(normalizePart(a.part));if(a.slot)parts.push(normalizePart(a.slot));}for(const slot of Object.keys(globalThis.SoulHostCore?.read(item).capabilities.forms?.slots??{}))parts.push(normalizePart(slot));return [...new Set(parts)];}
  function assertPartAvailable(state,wearerId,part,exceptId=''){const normalized=normalizePart(part);for(const item of Object.values(state.物品?.实例??{})){if(item.id===exceptId)continue;const attached=item.attachment?.wearerId===wearerId,equipped=item.ownerEntityId===wearerId&&Object.values(state.装备?.配置?.[wearerId]?.slots??{}).includes(item.id);if((attached||equipped)&&occupiedParts(state,item).includes(normalized))throw Error('该部位已经佩戴其他器具：'+item.name);}return true;}
  function table(state,create=false){
    if(create){state.世界??={};state.世界.custody??={version:1,defeats:{},byPerson:{},history:[],events:[]};}
    return state.世界?.custody??{version:1,defeats:{},byPerson:{},history:[],events:[]};
  }
  function operationReason(state,id,operation){return globalThis.SoulResidentRealms?.operationReason(state,id,operation)??'';}
  function active(state,id){const r=table(state).byPerson[id];return r?.status==='held'&&state.人物?.列表?.[id]?.status!=='dead'?r:null;}
  function isIdentity(record){return record?.arrangement?.kind==='identity';}
  function confined(state,id){const r=active(state,id);return r&&!isIdentity(r)?r:null;}
  function authorityRef(record){return record?{custodyId:record.id,personId:record.personId,custodianId:record.custodianId,version:record.authorityVersion,eventId:record.authorityEventId}:null;}
  function currentAuthority(state,personId){return authorityRef(active(state,personId));}
  function sameAuthority(a,b){return !!a&&!!b&&abilities.hash(a)===abilities.hash(b);}
  function hasAuthority(state,actorId,ref){return !!ref&&ref.custodianId===actorId&&sameAuthority(currentAuthority(state,ref.personId),ref);}
  function historicalAuthority(state,personId,at,order){const db=table(state),ids=new Set([...Object.values(db.byPerson),...db.history].filter(r=>r.personId===personId).map(r=>r.id)),last=db.events.filter(e=>ids.has(e.custodyId)&&e.targetId===personId&&e.at<=at&&e.order<order&&['captured','custody-initialized','custody-transferred','released','escaped','custody-death'].includes(e.type)).at(-1);return last&&['captured','custody-initialized','custody-transferred'].includes(last.type)?clone(last.authority):null;}
  /** Historical permission is an exact event interval, including same-minute changes. */
  function authorityAt(state,ref,actorId,at,order){
    if(!ref||Object.keys(ref).some(k=>!['custodyId','personId','custodianId','version','eventId'].includes(k))||ref.custodianId!==actorId||!Number.isSafeInteger(order))return false;
    const events=table(state).events,source=events.find(e=>e.id===ref.eventId);
    const db=table(state),record=[...Object.values(db.byPerson),...db.history].find(r=>r.id===ref.custodyId&&r.personId===ref.personId);if(!record||ref.custodianId===ref.personId||!validStamp(source??{}))return false;
    if(!source||!['captured','custody-initialized','custody-transferred'].includes(source.type)||source.custodyId!==ref.custodyId||source.targetId!==ref.personId||!sameAuthority(source.authority,ref)||source.at>at||source.order>=order)return false;
    return !events.some(e=>e.custodyId===ref.custodyId&&e.order>source.order&&e.order<order&&['custody-transferred','released','escaped','custody-death'].includes(e.type));
  }
  function reconcileDeaths(state){
    for(const record of Object.values(table(state).byPerson))if(record.status==='held'&&state.人物.列表[record.personId]?.status==='dead'){
      record.status='dead';record.endedAt=people.now(state);stamp(record);
      event(state,'custody-death',record.custodianId,record.personId,`death:${record.id}`,{custodyId:record.id,authority:authorityRef(record)});
    }
    releaseOnCustodianDeath(state);
  }
  /** Death ends ordinary custody after actual combat ends; unrelated sources remain. */
  function releaseOnCustodianDeath(state){const released=[];for(const r of Object.values(table(state).byPerson)){
    const owner=state.人物.列表[r.custodianId],person=state.人物.列表[r.personId],death=owner?.life?.death;if(r.status!=='held'||isIdentity(r)||person?.status==='dead'||owner?.status!=='dead'||!death||actions.battleOf(state,r.personId)||actions.battleOf(state,r.custodianId))continue;
    const permanent=globalThis.SoulResidentRealms?.binding(state,r.personId);if(permanent&&permanent.realm.profileId==='nine-beauties-v1'&&state.人物.列表[permanent.realm.ownerId]?.status!=='dead')continue;
    const sourceId=`custodian-death-release:${r.id}:${death.id}`,detached=[];
    const position=actions.positionOf(state,r.personId),canRemove=position.kind==='location'&&!!state.地图.地点[position.locationId]&&!globalThis.SoulSealingCore?.active(state,r.personId);
    for(const item of (canRemove?attached(state,r.personId):[]).filter(i=>!globalThis.SoulRealmArrangements?.isManaged(i)&&i.attachment.controllers.includes(r.custodianId)&&i.attachment.controllers.every(id=>state.人物.列表[id]?.status==='dead'))){
      if(item.boundToEntityId&&item.boundToEntityId!==item.ownerEntityId)continue;
      const attachment=clone(item.attachment);cancelDeviceTimers(state,item.id,sourceId);globalThis.SoulCombatEngine.removeCustodyDeviceStatuses(state,item.id,'custodian-dead');delete item.attachment;
      const stash=globalThis.SoulWorldEngine.ensureLocationStash(state,item.ownerEntityId,position.locationId);globalThis.SoulWorldEngine.transferItem(state,item.id,stash.id,1);
      event(state,'restraint-detached',r.custodianId,r.personId,`${sourceId}:${item.id}`,{itemId:item.id,attachment,custodianDeath:{personId:r.custodianId,deathId:death.id}});detached.push(item.id);
    }
    r.status='released';r.endedAt=people.now(state);stamp(r);event(state,'released',r.custodianId,r.personId,sourceId,{custodyId:r.id,authority:authorityRef(r),reason:'custodian-dead',deathId:death.id,detachedItemIds:detached});released.push(r.personId);
  }return released;}
  function stamp(record){const value={...record};delete value.hash;record.hash=abilities.hash(value);return record;}
  function validStamp(record){const copy={...record};delete copy.hash;return record.hash===abilities.hash(copy);}
  function event(state,type,actorId,targetId,sourceId,details={}){
    const entry={id:`custody-event:${sourceId}:${type}:${targetId}`,type,actorId,targetId,sourceId,at:people.now(state),order:people.nextEventOrder(state),...clone(details)};
    const observation=globalThis.SoulWorldSocial?.observationAt(state,type,actorId,targetId,details,sourceId);if(observation)entry.observation=observation;
    const log=table(state,true).events;if(log.some(e=>e.id===entry.id))throw Error('看管事件已结算');log.push(stamp(entry));
    if(['custody-transferred','released','escaped','custody-death'].includes(type))for(const job of state.世界.npcDecisions??[])if(job.kind==='release-response'&&job.status==='pending'&&job.captivityId===entry.custodyId){job.status='invalidated';job.invalidatedBy=entry.id;}
    return entry;
  }
  function recordDefeats(state,battle){
    if(battle.状态!=='已结束'||battle.扩展?.battleKind!=='lethal'||battle.扩展?.规则?.fatalOnDefeat)return [];
    const members=Object.values(battle.扩展.成员??{}),winner=battle.扩展.结果?.winnerSideId;
    const eligibleActorIds=members.filter(m=>m.sideId===winner&&m.status==='active'&&state.人物?.列表?.[m.unitId]?.status!=='dead'&&state.人物?.列表?.[m.unitId]&&state.战斗单位.列表[m.unitId]?.存活状态==='存活').map(m=>m.unitId);
    if(!winner||!eligibleActorIds.length)return [];
    const created=[],db=table(state,true);
    for(const member of members){
      const target=state.人物?.列表?.[member.unitId];
      if(!target||target.status==='dead'||active(state,member.unitId)||member.sideId===winner||!['defeated','surrendered'].includes(member.status))continue;
      const id=`defeat:${battle.id}:${member.unitId}`;if(db.defeats[id])continue;
      const proof={battleId:battle.id,battleKind:'lethal',winnerSideId:winner,members:members.map(m=>({unitId:m.unitId,sideId:m.sideId,status:m.status}))};
      const record={id,battleId:battle.id,battleKind:'lethal',targetId:member.unitId,winnerSideId:winner,eligibleActorIds:clone(eligibleActorIds),defeatKind:member.status,at:people.now(state),order:people.nextEventOrder(state),position:clone(actions.positionOf(state,member.unitId)),proof,status:'pending',resolution:null};
      db.defeats[id]=stamp(record);created.push(clone(record));
    }
    return created;
  }
  function expireDefeats(state,personIds,sourceId){
    for(const record of Object.values(table(state).defeats))if(record.status==='pending'&&personIds.includes(record.targetId)){
      record.status='expired';record.resolution={actorId:record.targetId,action:'expired',sourceId,at:people.now(state)};stamp(record);
    }
  }
  function qualification(state,actorId,targetId,defeatId){
    const record=table(state).defeats[defeatId];
    if(!record||!validStamp(record)||record.targetId!==targetId||record.battleKind!=='lethal'||record.status!=='pending'||!record.eligibleActorIds.includes(actorId))throw Error('没有本次人物死斗的待处置资格');
    people.assertAlive(state,targetId);
    actions.resolve(state,{actorId,battleId:null,targetIds:[targetId],requirements:['gesture']});
    const pos=actions.positionOf(state,targetId);
    if(abilities.hash(pos)!==abilities.hash(record.position))throw Error('败者已经离开原战败位置');
    if(active(state,targetId))throw Error('目标已经被看管');
    const target=state.战斗单位.列表[targetId];
    if(record.defeatKind==='defeated'&&target?.存活状态==='存活'&&target.资源.生命.当前>0)throw Error('目标已恢复行动能力，需要重新取得压制或配合');
    return record;
  }
  function attached(state,targetId){return Object.values(state.物品?.实例??{}).filter(item=>item.attachment?.wearerId===targetId&&!globalThis.SoulIntimateCore?.DEVICES?.[item.templateId]);}
  function requireAwake(state,id){
    if(controls.active(state,id).some(s=>['status.sleep','status.stun'].includes(s.模板ID)))throw Error('人物当前无法清醒作出操作或配合');
  }
  function availableDevice(state,actorId,targetId,itemId){
    const item=state.物品.实例[itemId],template=resolveDevice(item),actor=state.人物.列表[actorId],container=state.容器.列表[actor?.inventoryContainerId];
    if(!item||!template||item.ownerEntityId!==actorId||item.containerId!==container?.id||!container.itemIds.includes(itemId)||item.quantity!==1||item.attachment||item.durability<=0||Number(state.世界.时间.day)>Number(item.payload?.expiresAtDay??Number.MAX_SAFE_INTEGER)||item.boundToEntityId||item.扩展?.integrated)throw Error('拘束工具必须是本人随身、完好、未装配的独立物品');
    if(Number(state.战斗单位.列表[targetId]?.派生?.有效等级??0)>template.maxLevel)throw Error(`${template.name}不能压制这一等级的目标`);
    if(globalThis.SoulRealmArrangements?.isManaged(item))throw Error('画境显化装备须通过原画境安排，不能另行装配');
    assertPartAvailable(state,targetId,template.part,itemId);
    return item;
  }
  function effectSpecs(item,mode=item.attachment?.mode??'locked'){
    const template=resolveDevice(item);if(!template||!Object.hasOwn(template.modes,mode))throw Error('拘束器模式无效');
    if(mode==='limited'&&['restraint-seal-collar','restraint-seal-platform','restraint-slime-suit'].includes(item.templateId)){
      const limits=controls.limitSpec(item.attachment?.limits??{soulPowerPercent:0,...(item.templateId==='restraint-seal-platform'?{damagePercent:0}:{}),permission:{allowedKinds:['ordinary'],maxCastRank:0}});
      return [...clone(template.modes[mode]),['status.power_seal',{封印对象:'精细',范围:'全部',限制:limits}]].map(([id,params])=>[id,{...params,持续方式:'来源有效',来源依赖:'道具有效'}]);
    }
    return clone(template.modes[mode]).map(([id,params])=>[id,{...params,持续方式:'来源有效',来源依赖:'道具有效'}]);
  }
  function captureQuote(state,actorId,targetId,defeatId,itemIds){
    const defeat=qualification(state,actorId,targetId,defeatId),actor=state.人物.列表[actorId],target=state.战斗单位.列表[targetId];
    if(!Array.isArray(itemIds)||!itemIds.length||itemIds.length>6||new Set(itemIds).size!==itemIds.length)throw Error('捕获需要选择真实且不重复的拘束工具');
    requireAwake(state,actorId);
    const items=itemIds.map(id=>availableDevice(state,actorId,targetId,id));
    for(const item of items)globalThis.SoulHostCore?.assertSlots(state,item,targetId);
    const formSlots=items.flatMap(item=>Object.keys(globalThis.SoulHostCore?.read(item).capabilities.forms?.slots??{}));if(new Set(formSlots).size!==formSlots.length)throw Error('捕获器具的形态部位重复');
    if(new Set(items.map(item=>DEVICES[item.templateId].part)).size!==items.length)throw Error('同一部位不能重复装配');
    if(!items.some(item=>DEVICES[item.templateId].capture))throw Error('缺少能够固定行动的捕获工具');
    const hasSoul=(state.成长?.列表?.[targetId]?.武魂ID列表??[]).length>0;
    const host=globalThis.SoulHostCore;
    const supplied=items.flatMap(item=>{const suppression=host?.sourceAllowed(state,item)&&host.read(item).capabilities.suppression;if(suppression)return controls.suppressionBlocksCombat({soulPowerPercent:100-suppression.percent,permission:{allowedKinds:suppression.kinds}})?[['status.power_seal',{封印对象:'魂力'}]]:[];return effectSpecs(item);}).filter(([id])=>id==='status.power_seal').map(([,p])=>p.封印对象);
    const permissions=[...controls.effectiveLimits(state,targetId).permissions,...items.flatMap(item=>{const suppression=host?.sourceAllowed(state,item)&&host.read(item).capabilities.suppression;return suppression?[{allowedKinds:suppression.kinds,maxCastRank:suppression.maxRank}]:[];})];
    const seals=controls.restrictions(state,targetId).seals.filter(s=>{
      const status=state.状态实例.列表[s.statusId];
      return !!status&&!s.soulId&&!controls.sourceInvalidReason(state,status)&&!(status.持续?.expiresAt<=people.now(state));
    }).map(s=>s.kind);
    if(hasSoul&&!controls.combatSuppressed(state,targetId)&&!controls.permissionsBlockCombat(permissions)&&![...seals,...supplied].includes('魂力')&&!(['武魂','魂技'].every(kind=>[...seals,...supplied].includes(kind))))throw Error('捕获魂师还需要覆盖其战斗能力的实际封印或压制器');
    return {defeat,items,actorId,targetId,defeatId,restraintItemIds:clone(itemIds),summary:`将使用${items.map(i=>i.name).join('、')}捕获目标。`};
  }
  function resolveDefeat(state,record,actorId,action,sourceId,detail={}){
    record.status=action;record.resolution={actorId,action,sourceId,at:people.now(state)};stamp(record);
    return event(state,action,actorId,record.targetId,sourceId,{defeatId:record.id,battleId:record.battleId,...detail});
  }
  function suspendPlans(state,targetId,sourceId){
    for(const plan of state.世界?.npcPlans??[])if(plan.ownerId===targetId&&['scheduled','travelling','waiting'].includes(plan.status)){
      const run=plan.runs.at(-1);if(run?.endedAt===null)run.endedAt=people.now(state);plan.status='cancelled';plan.nextAt=null;
      plan.events.push({id:`${plan.id}:${plan.events.length}`,kind:'cancelled',sourceId:plan.sourceId,time:clone(state.世界.时间),knownBy:[targetId],reason:'本人被捕，原行程停止',locationId:state.人物.列表[targetId].locationId,custodySourceId:sourceId});
      if(plan.personal){const goal=state.世界.npcGoals.find(g=>g.id===plan.sourceId);goal.status='cancelled';goal.finishedAt=clone(state.世界.时间);}
      if(plan.civic){const trip=(state.世界.cityStages??[]).flatMap(c=>c.trips??[]).find(t=>t.id===plan.sourceId);if(trip){trip.status='cancelled';trip.events.push({status:'cancelled',sourceId:plan.id,time:clone(state.世界.时间)});}}
    }
    for(const action of state.世界?.longActions??[])if(action.ownerId===targetId&&action.status==='interrupted'){action.status='cancelled';action.cancelledAt=clone(state.世界.时间);action.cancelledSourceId=sourceId;}
  }
  function capture(state,request,sourceId,hooks){
    const q=captureQuote(state,request.actorId,request.targetId,request.defeatId,request.restraintItemIds),containerId=`container-restraints-${q.targetId}`;
    state.容器.列表[containerId]??={id:containerId,type:'restraints',ownerEntityId:'',locationId:state.人物.列表[q.targetId].locationId,itemIds:[],capacity:{slots:6},status:'active',扩展:{wearerId:q.targetId}};
    const effects=[];
    for(const item of q.items){
      const from=state.容器.列表[item.containerId];from.itemIds=from.itemIds.filter(id=>id!==item.id);
      item.containerId=containerId;state.容器.列表[containerId].itemIds.push(item.id);
      item.attachment=stamp({wearerId:q.targetId,part:DEVICES[item.templateId].part,mode:'locked',locked:true,controllers:[q.actorId],sourceId,captureSourceId:sourceId,originKind:'capture',attachedBy:q.actorId,attachedAt:people.now(state)});
      const applied=hooks.applyDevice(state,q.actorId,q.targetId,item.id,sourceId);
      item.attachment.effectIds=applied.filter(e=>e.statusId).map(e=>e.statusId);stamp(item.attachment);effects.push(...applied);
      event(state,'restraint-attached',q.actorId,q.targetId,`${sourceId}:attach:${item.id}`,{itemId:item.id,attachment:clone(item.attachment)});
    }
    const limits=controls.restrictions(state,q.targetId);
    if(!limits.blocked.gesture?.length&&!limits.blocked.movement?.length)throw Error('目标抵抗了拘束，未能完成捕获');
    if((state.成长?.列表?.[q.targetId]?.武魂ID列表??[]).length&&!controls.combatSuppressed(state,q.targetId))throw Error('目标抵抗了能力压制，未能完成捕获');
    const record=stamp({id:`custody:${sourceId}:${q.targetId}`,personId:q.targetId,captorId:q.actorId,custodianId:q.actorId,authorityVersion:1,authorityEventId:`custody-event:${sourceId}:captured:${q.targetId}`,defeatId:q.defeatId,status:'held',arrangement:'held-at-scene',since:people.now(state),sourceId,restraintItemIds:clone(q.restraintItemIds)});
    const db=table(state,true);if(db.byPerson[q.targetId])db.history.push(clone(db.byPerson[q.targetId]));db.byPerson[q.targetId]=record;suspendPlans(state,q.targetId,sourceId);
    resolveDefeat(state,q.defeat,q.actorId,'captured',sourceId,{custodyId:record.id,authority:authorityRef(record)});
    return {type:'person-captured',actorId:q.actorId,targetId:q.targetId,custodyId:record.id,defeatId:q.defeatId,restraintItemIds:q.restraintItemIds,effects,summary:q.summary};
  }
  function disposition(state,request,sourceId){
    const record=qualification(state,request.actorId,request.targetId,request.defeatId);
    if(!['spared','executed'].includes(request.action))throw Error('未知战败处置');
    if(request.action==='executed')actions.assertTargets(state,request.actorId,{harmfulTargetIds:[request.targetId]});
    const death=request.action==='executed'?people.die(state,request.targetId,'死斗后的明确处决',sourceId):null;
    const settled=resolveDefeat(state,record,request.actorId,request.action,sourceId);
    return {...settled,type:'defeat-disposition',action:request.action,death,summary:request.action==='executed'?'已确认处决，目标真实死亡。':'已放弃本次处置，目标仍在原处，伤势与财物保持实际状态。'};
  }
  function defeatOrigin(record){return stamp({...clone(record),status:'pending',resolution:null});}
  function defeatDecisionKey(record,ownerId){return abilities.hash({defeatId:record.id,ownerId,originHash:defeatOrigin(record).hash});}
  const defeatDecisions=state=>table(state).events.filter(e=>e.type==='defeat-decided');
  function playerDefeatPriority(state,record){
    const id=state.角色.主控单位ID;
    return record.eligibleActorIds.includes(id)?{person:globalThis.SoulWorldSocial.communicationProof(state,id),gestureRestrictions:clone(controls.restrictions(state,id).blocked.gesture??[])}:null;
  }
  function priorityAvailable(state,record,proof){
    if(!record.eligibleActorIds.includes(state.角色.主控单位ID)){if(proof!==null)throw Error('不存在玩家胜方优先权');return false;}
    const p=proof?.person,gesture=proof?.gestureRestrictions,social=globalThis.SoulWorldSocial;
    // Validate the frozen shape separately from availability: death, absence,
    // sleep and another battle are legitimate reasons for priority to lapse.
    if(!proof||Object.keys(proof).length!==2||!p||!['active','dead'].includes(p.status)||(p.hadUnit?(!['存活','昏迷','死亡'].includes(p.lifeState)||!Number.isSafeInteger(p.health)||p.health<0):p.lifeState!==null||p.health!==null)||p.battleId!==null&&(typeof p.battleId!=='string'||!p.battleId)||!Array.isArray(p.restrictions)||new Set(p.restrictions.map(v=>v.id)).size!==p.restrictions.length||p.restrictions.some(v=>!v||Object.keys(v).length!==2||typeof v.id!=='string'||!v.id||!['status.sleep','status.stun','status.mute'].includes(v.templateId))||!Array.isArray(gesture)||gesture.some(v=>!v||Object.keys(v).length!==2||typeof v.statusId!=='string'||!v.statusId||typeof v.reason!=='string'||!v.reason)||!social.validCommunicationProof(state,{...p,status:'active',lifeState:p.hadUnit?'存活':null,health:p.hadUnit?1:null,battleId:null,restrictions:[]},state.角色.主控单位ID))throw Error('玩家优先权现场凭据无效');
    return social.validCommunicationProof(state,p,state.角色.主控单位ID)&&!gesture.length&&abilities.hash(p.position)===abilities.hash(record.position);
  }
  function pendingDefeatDecisions(state){
    const social=globalThis.SoulWorldSocial,result=[];
    for(const record of Object.values(table(state).defeats)){
      if(record.status!=='pending'||priorityAvailable(state,record,playerDefeatPriority(state,record)))continue;
      for(const ownerId of record.eligibleActorIds.filter(id=>id!==state.角色.主控单位ID).sort())try{
        if(active(state,ownerId)||!social.remembers(state,ownerId,record.at,[],record.order)||globalThis.SoulWorldEngine?.worldActionBlockReason(state,{actorId:ownerId}))continue;
        qualification(state,ownerId,record.targetId,record.id);requireAwake(state,ownerId);
        const proof=social.communicationProof(state,ownerId);
        if(!social.validCommunicationProof(state,proof,ownerId))continue;
        result.push({key:defeatDecisionKey(record,ownerId),ownerId,personId:record.targetId,defeatId:record.id,originHash:defeatOrigin(record).hash,position:clone(record.position)});break;
      }catch{/* The original defeat remains pending until a qualified victor can act. */}
    }
    return result;
  }
  function defeatDecisionOptions(state,key){
    const r=pendingDefeatDecisions(state).find(r=>r.key===key);if(!r)throw Error('没有这项尚未决定的实际战败处置');
    // Identical registered templates have identical capture contracts. Enumerate
    // one actual item per template, then retain only minimal legal bundles.
    const representatives=new Map();
    for(const item of Object.values(state.物品.实例))try{
      availableDevice(state,r.ownerId,r.personId,item.id);
      if(!representatives.has(item.templateId))representatives.set(item.templateId,item);
    }catch{/* An inaccessible, broken or insufficient device is not an option. */}
    const items=[...representatives.values()],plans=[];
    for(let mask=1;mask<2**items.length;mask++){
      const ids=items.filter((_,i)=>mask&(1<<i)).map(item=>item.id);
      try{captureQuote(state,r.ownerId,r.personId,r.defeatId,ids);plans.push(ids);}catch{/* Reuse the actual capture rule. */}
    }
    const capturePlans=plans.filter(ids=>!plans.some(other=>other.length<ids.length&&other.every(id=>ids.includes(id))));
    return {...r,devices:items.map(item=>({id:item.id,name:item.name,templateId:item.templateId,definition:clone(resolveDevice(item))})),capturePlans};
  }
  function checkedDefeatDecision(d){
    const keys=d?.kind==='capture'?['kind','reason','restraintItemIds']:['spare','execute'].includes(d?.kind)?['kind','reason']:[];
    if(!d||typeof d!=='object'||Array.isArray(d)||!keys.length||Object.keys(d).length!==keys.length||Object.keys(d).some(k=>!keys.includes(k))||typeof d.reason!=='string'||!d.reason.trim()||d.reason.length>600||d.kind==='capture'&&(!Array.isArray(d.restraintItemIds)||!d.restraintItemIds.length||d.restraintItemIds.length>6||d.restraintItemIds.some(id=>typeof id!=='string'||!id)||new Set(d.restraintItemIds).size!==d.restraintItemIds.length))throw Error('战败处置须明确放过、处决或使用实际工具捕获及本人理由');
    return clone(d);
  }
  function defeatDecisionRequest(q){
    if(!q||Object.keys(q).some(k=>!['id','type','actorId','decisionKey','decision'].includes(k))||q.type!=='decide-defeat'||typeof q.actorId!=='string'||!q.actorId||typeof q.decisionKey!=='string'||!q.decisionKey)throw Error('战败决定请求来源无效');
    return {type:q.type,actorId:q.actorId,decisionKey:q.decisionKey,decision:checkedDefeatDecision(q.decision)};
  }
  function defeatDecisionReceipt(e){return {type:'person-defeat-decided',decisionId:e.id,actorId:e.actorId,targetId:e.targetId,defeatId:e.defeatId,kind:e.decision.kind,result:clone(e.result),summary:e.decision.kind==='capture'?'胜方已使用实际工具捕获败者。':e.decision.kind==='execute'?'胜方已明确处决败者，目标真实死亡。':'胜方已放弃本次处置，败者的实际伤势与财物保留。'};}
  function replayDefeatDecision(state,q,sourceId){
    const e=defeatDecisions(state).find(e=>e.sourceId===sourceId);if(!e)return null;
    if(abilities.hash(e.request)!==abilities.hash(defeatDecisionRequest(q)))throw Error('战败决定编号不能替换原人物或决定');
    return defeatDecisionReceipt(e);
  }
  function decideDefeat(state,q,sourceId,hooks){
    const prior=replayDefeatDecision(state,q,sourceId);if(prior)return prior;
    const request=defeatDecisionRequest(q),r=pendingDefeatDecisions(state).find(r=>r.key===request.decisionKey);
    if(!r||r.ownerId!==request.actorId)throw Error('战败处置须由原合格胜方独立决定');
    const origin=defeatOrigin(table(state).defeats[r.defeatId]),target=state.战斗单位.列表[r.personId],social=globalThis.SoulWorldSocial;
    const proof={playerPriority:playerDefeatPriority(state,origin),person:social.communicationProof(state,r.ownerId),gestureRestrictions:clone(controls.restrictions(state,r.ownerId).blocked.gesture??[]),target:{position:clone(actions.positionOf(state,r.personId)),health:target.资源.生命.当前,lifeState:target.存活状态}};
    const childSourceId=`npc-defeat-child:${sourceId}`,childRequest={actorId:r.ownerId,targetId:r.personId,defeatId:r.defeatId},d=request.decision;
    const child=d.kind==='capture'?capture(state,{...childRequest,restraintItemIds:d.restraintItemIds},childSourceId,hooks):disposition(state,{...childRequest,action:d.kind==='execute'?'executed':'spared'},childSourceId);
    const resolution=table(state).events.find(e=>e.sourceId===childSourceId&&e.defeatId===r.defeatId);
    const e=event(state,'defeat-decided',r.ownerId,r.personId,sourceId,{key:r.key,defeatId:r.defeatId,originHash:origin.hash,proof,request,decision:d,result:{sourceId:childSourceId,eventId:resolution.id,action:resolution.type,...(child.custodyId?{custodyId:child.custodyId}:{})}});
    (state.人物.列表[r.ownerId].扩展.战败处置??=[]).push({eventId:e.id,hash:e.hash});
    return defeatDecisionReceipt(e);
  }
  function validateDefeatDecisions(state){
    const rows=defeatDecisions(state),errors=[],keys=new Set(),same=(a,b)=>abilities.hash(a)===abilities.hash(b),social=globalThis.SoulWorldSocial;
    for(const e of rows)try{
      const record=table(state).defeats[e.defeatId],d=checkedDefeatDecision(e.decision),p=e.proof,x=e.result;
      if(!record||e.actorId===state.角色.主控单位ID||!record.eligibleActorIds.includes(e.actorId)||record.targetId!==e.targetId||keys.has(e.key)||e.key!==defeatDecisionKey(record,e.actorId)||e.originHash!==defeatOrigin(record).hash||e.at<record.at)throw Error('原战败资格');
      if(!same(defeatDecisionRequest(e.request),e.request)||!same(e.request,{type:'decide-defeat',actorId:e.actorId,decisionKey:e.key,decision:d}))throw Error('本人请求');
      if(!p||Object.keys(p).length!==4||priorityAvailable(state,record,p.playerPriority)||!social.validCommunicationProof(state,p.person,e.actorId)||!Array.isArray(p.gestureRestrictions)||p.gestureRestrictions.length||!same(p.person.position,record.position)||!same(p.target?.position,record.position)||!Number.isSafeInteger(p.target?.health)||p.target.health<0||!['存活','昏迷'].includes(p.target.lifeState)||record.defeatKind==='defeated'&&p.target.lifeState==='存活'&&p.target.health>0)throw Error('原人物状态与现场');
      if(social.masksAtOrder(state,e.actorId,e.order).some(id=>state.扩展.cognitionChanges[id].appliedOrder>=record.order))throw Error('决定时已无法记起原战果');
      const action=d.kind==='capture'?'captured':d.kind==='execute'?'executed':'spared',child=table(state).events.find(v=>v.id===x?.eventId);
      if(!x||Object.keys(x).length!==(action==='captured'?4:3)||x.action!==action||x.sourceId!==`npc-defeat-child:${e.sourceId}`||!child||child.sourceId!==x.sourceId||child.type!==action||child.actorId!==e.actorId||child.targetId!==e.targetId||child.defeatId!==record.id||child.at!==e.at||child.order>=e.order||record.resolution?.sourceId!==x.sourceId)throw Error('实际处置');
      if(action==='captured'){
        const c=[...Object.values(table(state).byPerson),...table(state).history].find(c=>c.id===x.custodyId);
        if(!c||c.defeatId!==record.id||!same(c.restraintItemIds,d.restraintItemIds)||child.custodyId!==c.id)throw Error('实际工具装配');
      }
      if((state.人物.列表[e.actorId]?.扩展?.战败处置??[]).filter(a=>same(a,{eventId:e.id,hash:e.hash})).length!==1)throw Error('本人历史锚点');
      keys.add(e.key);
    }catch(error){errors.push(`人物战败决定${e?.id}无效：${error.message}`);}
    for(const person of Object.values(state.人物.列表))for(const a of person.扩展?.战败处置??[])if(!rows.some(e=>e.actorId===person.id&&same(a,{eventId:e.id,hash:e.hash})))errors.push('战败决定历史缺少永久来源');
    for(const child of table(state).events)if(['captured','spared','executed'].includes(child.type)&&child.sourceId.startsWith('npc-defeat-child:')&&!rows.some(e=>e.result?.eventId===child.id))errors.push('人物主动战败处置缺少本人原决定');
    return errors;
  }
  function controlDevice(state,actorId,itemId,battleId=null,{physical=false}={}){
    const realmReason=globalThis.SoulRealmArrangements?.canDetach(state,state.物品?.实例?.[itemId]);if(realmReason)throw Error(realmReason);
    const item=state.物品.实例[itemId],a=item?.attachment;
    if(!a||!a.controllers.includes(actorId))throw Error('没有这件拘束器的实际控制权限');
    const sealing=globalThis.SoulSealingCore,seal=sealing?.active(state,a.wearerId),platform=state.物品.实例[seal?.itemId],circuit=!physical&&item.templateId==='restraint-seal-platform'&&seal?.status==='confined'&&platform?.扩展?.sealControl?.controllers.includes(actorId)&&abilities.hash(sealing.itemPosition(state,seal.itemId))===abilities.hash(actions.positionOf(state,actorId));
    const realmAccess=battleId===null&&!actions.colocated(state,actorId,a.wearerId)&&globalThis.SoulResidentRealms?.equipmentSource(state,actorId,a.wearerId);
    actions.resolve(state,{actorId,battleId,targetIds:realmAccess?[]:[a.wearerId],requirements:['gesture'],...(circuit?{containmentAction:'device-control'}:{})});
    if(controls.active(state,actorId).some(s=>['status.sleep','status.stun'].includes(s.模板ID)))throw Error('控制者无法清醒操作拘束器');
    return item;
  }
  function permissionQuote(state,request,responding=true){
    const wearerId=request.actorId,operatorId=request.targetId;
    if(responding)globalThis.SoulInfluenceCore.assertVoluntary(state,wearerId);
    if(wearerId===operatorId)throw Error('装配许可须指定另一名操作人');
    if(responding)actions.resolve(state,{actorId:wearerId,battleId:null,targetIds:[operatorId]});requireAwake(state,wearerId);
    if(controls.actionReason(state,wearerId,'requirements',{requirements:['voice']})&&controls.actionReason(state,wearerId,'requirements',{requirements:['gesture']}))throw Error('当前既不能说话也不能示意配合');
    return availableDevice(state,operatorId,wearerId,request.itemId);
  }
  function permitDevice(state,request,sourceId){
    const wearerId=request.actorId,operatorId=request.targetId,item=permissionQuote(state,request),now=people.now(state);
    const permission=stamp({id:`restraint-permission:${sourceId}`,wearerId,operatorId,itemId:item.id,mode:'locked',issuedAt:now,expiresAt:now+15,sourceId,status:'granted'});
    (table(state,true).permissions??=[]).push(permission);
    event(state,'restraint-permitted',wearerId,operatorId,sourceId,{permission:clone(permission)});
    return {type:'restraint-permitted',actorId:wearerId,targetId:operatorId,itemId:item.id,permission:clone(permission),summary:`已同意由对方装配${item.name}一次，许可15分钟内有效。`};
  }
  function revokePermission(state,request,sourceId){
    actions.resolve(state,{actorId:request.actorId,battleId:null});requireAwake(state,request.actorId);
    const permission=(table(state).permissions??[]).find(p=>p.id===request.permissionId);
    if(!permission||permission.wearerId!==request.actorId||permission.status!=='granted'||permission.expiresAt<=people.now(state))throw Error('没有本人可撤回的有效装配许可');
    permission.status='revoked';permission.revokedAt=people.now(state);permission.revokedBy=sourceId;stamp(permission);
    event(state,'restraint-permission-revoked',request.actorId,permission.operatorId,sourceId,{permissionId:permission.id});
    return {type:'restraint-permission-revoked',actorId:request.actorId,targetId:permission.operatorId,itemId:permission.itemId,permissionId:permission.id,summary:'已撤回尚未使用的本次装配许可。'};
  }
  function permissionRequestQuote(state,operatorId,wearerId,itemId){
    actions.resolve(state,{actorId:operatorId,battleId:null,targetIds:[wearerId]});requireAwake(state,operatorId);
    if(controls.actionReason(state,operatorId,'requirements',{requirements:['voice']})&&controls.actionReason(state,operatorId,'requirements',{requirements:['gesture']}))throw Error('操作人当前既不能说话也不能示意请求');
    return permissionQuote(state,{actorId:wearerId,targetId:operatorId,itemId},false);
  }
  function permissionRequestProof(state,operatorId,wearerId,item,hooks){
    const channel=id=>controls.actionReason(state,id,'requirements',{requirements:['voice']})?'gesture':'voice';
    return {operator:hooks.communicationProof(state,operatorId),wearer:hooks.communicationProof(state,wearerId),operatorChannel:channel(operatorId),wearerChannel:channel(wearerId),operatorGestures:clone(controls.restrictions(state,operatorId).blocked.gesture??[]),wearerGestures:clone(controls.restrictions(state,wearerId).blocked.gesture??[]),memoryContext:hooks.memoryContext(state,wearerId),deviceEvent:permissionRequestDeviceEvent(state,item.id),item:{id:item.id,templateId:item.templateId,ownerEntityId:item.ownerEntityId,containerId:item.containerId,quantity:item.quantity,durability:item.durability,attachment:null}};
  }
  function permissionRequestDeviceEvent(state,itemId,before=Infinity){const e=table(state).events.filter(e=>e.itemId===itemId&&e.order<before&&['restraint-attached','restraint-mode-changed','restraint-detached','restraint-rights-transferred'].includes(e.type)).at(-1);return e?{id:e.id,hash:e.hash}:null;}
  function requestedPermissions(state){return table(state).events.filter(e=>e.type==='restraint-permission-requested');}
  function requestedPermissionDecision(state,id){return table(state).events.find(e=>e.type==='restraint-permission-decided'&&e.requestEventId===id);}
  function requestPermission(state,q,sourceId,hooks){
    const item=permissionRequestQuote(state,q.actorId,q.targetId,q.itemId),at=people.now(state);
    if(requestedPermissions(state).some(e=>e.actorId===q.actorId&&e.targetId===q.targetId&&e.itemId===item.id&&e.expiresAt>at&&!requestedPermissionDecision(state,e.id)))throw Error('这件器具已有尚待本人回应的请求');
    const e=event(state,'restraint-permission-requested',q.actorId,q.targetId,sourceId,{itemId:item.id,expiresAt:at+15,proof:permissionRequestProof(state,q.actorId,q.targetId,item,hooks)});
    return {type:'restraint-permission-requested',requestId:e.id,actorId:q.actorId,targetId:q.targetId,itemId:item.id,expiresAt:e.expiresAt,summary:'佩戴请求已提出，等待对方回应。'};
  }
  function pendingRequestedPermissions(state,requestIds=null){
    return requestedPermissions(state).filter(e=>(!requestIds||requestIds.has(e.id))&&e.expiresAt>people.now(state)&&!requestedPermissionDecision(state,e.id)).flatMap(e=>{
      if(globalThis.SoulInfluenceCore.voluntaryReason(state,e.targetId))return [];
      try{const item=permissionRequestQuote(state,e.actorId,e.targetId,e.itemId);if(abilities.hash(e.proof.deviceEvent)!==abilities.hash(permissionRequestDeviceEvent(state,item.id))||abilities.hash(e.proof.item)!==abilities.hash({id:item.id,templateId:item.templateId,ownerEntityId:item.ownerEntityId,containerId:item.containerId,quantity:item.quantity,durability:item.durability,attachment:null}))return [];return [{key:e.id,ownerId:e.targetId,operatorId:e.actorId,itemId:e.itemId,requestEventId:e.id,originHash:e.hash}];}catch{return [];}
    });
  }
  function replayRequestedPermission(state,q,sourceId){
    const old=table(state).events.find(e=>e.type==='restraint-permission-decided'&&e.sourceId===sourceId);
    if(old){if(old.actorId!==q.actorId||old.requestEventId!==q.permissionId||abilities.hash(old.decision)!==abilities.hash({accept:q.accept,reason:q.reason}))throw Error('原装配决定编号不能更换本人、请求或回应');return requestedPermissionReceipt(old);}
    return null;
  }
  function decideRequestedPermission(state,q,sourceId,hooks){
    if(typeof q.accept!=='boolean'||typeof q.reason!=='string'||!q.reason.trim()||q.reason.length>600)throw Error('装配请求须由本人明确接受或拒绝并说明理由');
    const old=replayRequestedPermission(state,q,sourceId);if(old)return old;
    const r=pendingRequestedPermissions(state).find(r=>r.key===q.permissionId);if(!r||r.ownerId!==q.actorId)throw Error('没有本人可以回应的有效装配请求');
    const origin=table(state).events.find(e=>e.id===r.key);if(!hooks.remembers(state,r.ownerId,origin.at,[],origin.order))throw Error('本人已不能记起原装配请求');
    const item=permissionRequestQuote(state,r.operatorId,r.ownerId,r.itemId),proof=permissionRequestProof(state,r.operatorId,r.ownerId,item,hooks);let permission=null;
    if(q.accept)permission=permitDevice(state,{actorId:r.ownerId,targetId:r.operatorId,itemId:r.itemId},`requested-restraint-permission:${sourceId}`).permission;
    const e=event(state,'restraint-permission-decided',r.ownerId,r.operatorId,sourceId,{requestEventId:origin.id,originHash:origin.hash,itemId:r.itemId,decision:{accept:q.accept,reason:q.reason},permissionId:permission?.id??null,proof});
    return requestedPermissionReceipt(e);
  }
  function requestedPermissionReceipt(e){return {type:'person-restraint-permission-decided',decisionId:e.id,actorId:e.actorId,targetId:e.targetId,itemId:e.itemId,accepted:e.decision.accept,permissionId:e.permissionId,summary:e.decision.accept?'已同意这次佩戴，15分钟内有效。':'对方拒绝了这次佩戴请求。'};}
  function validateRequestedPermissions(state,hooks){
    const errors=[],db=table(state),seen=new Set();
    const validProof=(e,operatorId,wearerId)=>{
      const p=e.proof,i=p?.item,d=DEVICES[i?.templateId];
      if(!p||abilities.hash(p.deviceEvent)!==abilities.hash(permissionRequestDeviceEvent(state,e.itemId,e.order)))return false;
      return p&&hooks.validCommunicationProof?.(state,p.operator,operatorId,p.operatorChannel==='voice')&&hooks.validCommunicationProof?.(state,p.wearer,wearerId,p.wearerChannel==='voice')&&abilities.hash(p.operator.position)===abilities.hash(p.wearer.position)&&['voice','gesture'].includes(p.operatorChannel)&&['voice','gesture'].includes(p.wearerChannel)&&Array.isArray(p.operatorGestures)&&Array.isArray(p.wearerGestures)&&(p.operatorChannel!=='gesture'||!p.operatorGestures.length)&&(p.wearerChannel!=='gesture'||!p.wearerGestures.length)&&abilities.hash(p.memoryContext)===abilities.hash(hooks.masksAtOrder(state,wearerId,e.order))&&d&&i.id===e.itemId&&typeof i.id==='string'&&!!i.id&&i.ownerEntityId===operatorId&&i.containerId===state.人物.列表[operatorId].inventoryContainerId&&i.quantity===1&&Number.isSafeInteger(i.durability)&&i.durability>0&&i.attachment===null;
    };
    for(const e of requestedPermissions(state))if(e.actorId===e.targetId||e.expiresAt!==e.at+15||!validProof(e,e.actorId,e.targetId))errors.push('装配请求缺少实际当面交流或独立器具来源');
    for(const e of db.events.filter(e=>e.type==='restraint-permission-decided')){
      const o=requestedPermissions(state).find(o=>o.id===e.requestEventId),p=e.decision;
      if(!o||o.hash!==e.originHash||seen.has(o.id)||e.actorId!==o.targetId||e.targetId!==o.actorId||e.itemId!==o.itemId||e.order<=o.order||e.at<o.at||e.at>=o.expiresAt||typeof p?.accept!=='boolean'||typeof p?.reason!=='string'||!p.reason.trim()||p.reason.length>600||Object.keys(p).some(k=>!['accept','reason'].includes(k))||!validProof(e,o.actorId,o.targetId)||abilities.hash(o.proof.item)!==abilities.hash(e.proof.item)||e.proof.memoryContext.some(id=>state.扩展.cognitionChanges[id].appliedOrder>=o.order)){errors.push('装配回应缺少原请求或本人有效决定');continue;}
      seen.add(o.id);const v=db.events.find(v=>v.type==='restraint-permitted'&&v.permission?.id===e.permissionId);
      if(p.accept? !v||v.sourceId!==`requested-restraint-permission:${e.sourceId}`||v.actorId!==e.actorId||v.targetId!==e.targetId||v.permission.itemId!==e.itemId||v.at!==e.at||v.order<=o.order||v.order>=e.order : e.permissionId!==null)errors.push('装配回应与实际单次许可不一致');
    }
    for(const e of db.events.filter(e=>e.type==='restraint-permitted'&&e.sourceId.startsWith('requested-restraint-permission:')))if(!db.events.some(d=>d.type==='restraint-permission-decided'&&d.decision?.accept&&d.permissionId===e.permission.id))errors.push('请求装配许可缺少本人决定');
    return errors;
  }
  function attachQuote(state,request){
    const actorId=request.actorId,targetId=request.targetId;
    const realmAccess=!actions.colocated(state,actorId,targetId)&&globalThis.SoulResidentRealms?.equipmentSource(state,actorId,targetId);
    actions.resolve(state,{actorId,battleId:null,targetIds:realmAccess?[]:[targetId],requirements:['gesture']});requireAwake(state,actorId);people.assertAlive(state,targetId);
    const item=availableDevice(state,actorId,targetId,request.itemId),now=people.now(state),record=active(state,targetId),unit=state.战斗单位.列表[targetId];
    globalThis.SoulHostCore?.assertSlots(state,item,targetId);
    const permission=(table(state).permissions??[]).filter(p=>p.status==='granted'&&p.wearerId===targetId&&p.operatorId===actorId&&p.itemId===item.id&&p.mode==='locked'&&p.expiresAt>now).at(-1);
    const auth=influence.authority(state,actorId,targetId,'物品'),limits=controls.restrictions(state,targetId),powerless=!(state.成长?.列表?.[targetId]?.武魂ID列表??[]).length||controls.combatSuppressed(state,targetId);
    const incapacitated=unit&&(unit.存活状态!=='存活'||unit.资源.生命.当前<=0)||controls.active(state,targetId).some(s=>['status.sleep','status.stun'].includes(s.模板ID));
    let authority;
    if(actorId===targetId)authority={kind:'self'};
    else if(realmAccess)authority={kind:'realm-management',source:realmAccess};
    else if(permission)authority={kind:'consent',permissionId:permission.id};
    else if(auth.available)authority={kind:'control',sourceStatusId:auth.sourceStatusId,source:clone(state.状态实例.列表[auth.sourceStatusId])};
    else if(record?.custodianId===actorId&&(incapacitated||limits.blocked.gesture?.length&&limits.blocked.movement?.length&&powerless))authority={kind:'suppression',custodyId:record.id,authority:authorityRef(record),lifeStatus:unit.存活状态,health:unit.资源.生命.当前,statuses:clone(controls.active(state,targetId).filter(s=>[...controls.EFFECT_IDS,'status.bind','status.sleep','status.stun','status.paralysis','status.silence'].includes(s.模板ID))),hostFrame:globalThis.SoulHostCore.attributeFrame(state,targetId),hasSoul:!!(state.成长?.列表?.[targetId]?.武魂ID列表??[]).length};
    else throw Error('完全拆下后需要目标本次配合、有效控制命令权或当前实际压制，旧捕获资格不能再次装配');
    return {actorId,targetId,item,now,permission,authority};
  }
  function attachDevice(state,request,sourceId,hooks){
    const {actorId,targetId,item,now,permission,authority}=attachQuote(state,request);
    const containerId=`container-restraints-${targetId}`;
    state.容器.列表[containerId]??={id:containerId,type:'restraints',ownerEntityId:'',locationId:state.人物.列表[targetId].locationId,itemIds:[],capacity:{slots:6},status:'active',扩展:{wearerId:targetId}};
    state.容器.列表[item.containerId].itemIds=state.容器.列表[item.containerId].itemIds.filter(id=>id!==item.id);
    item.containerId=containerId;state.容器.列表[containerId].itemIds.push(item.id);
    item.attachment=stamp({wearerId:targetId,part:DEVICES[item.templateId].part,mode:'locked',locked:true,controllers:[actorId],sourceId,captureSourceId:sourceId,originKind:'reattach',attachedBy:actorId,attachedAt:now});
    const effects=hooks.applyDevice(state,actorId,targetId,item.id,sourceId);item.attachment.effectIds=effects.filter(e=>e.statusId).map(e=>e.statusId);stamp(item.attachment);
    if(permission){permission.status='used';permission.usedAt=now;permission.usedBy=sourceId;stamp(permission);}
    event(state,'restraint-attached',actorId,targetId,sourceId,{itemId:item.id,attachment:clone(item.attachment),authority});
    globalThis.SoulWorldEngine?.refreshItemActions(state);
    return {type:'restraint-attached',actorId,targetId,itemId:item.id,authority:clone(authority),effects,summary:`已戴上${item.name}。`};
  }
  function setDeviceMode(state,request,sourceId,hooks){
    const item=controlDevice(state,request.actorId,request.itemId,request.battleId??null);
    return changeDeviceMode(state,item,request,sourceId,hooks);
  }
  function cancelDeviceTimers(state,itemId,sourceId,actorId=null){
    for(const timer of table(state).deviceTimers??[])if(timer.itemId===itemId&&timer.status==='pending'&&(!actorId||timer.actorId===actorId)){
      timer.status='cancelled';timer.endedAt=people.now(state);timer.reason='装置已被重新操作或拆除';timer.endSourceId=sourceId;stamp(timer);
      event(state,'restraint-timer-ended',timer.actorId,timer.wearerId,`${sourceId}:cancel:${timer.id}`,{timerId:timer.id,status:timer.status,reason:timer.reason});
    }
  }
  function transferDeviceRights(state,q,sourceId){
    const item=state.物品.实例[q.itemId],before=clone(item?.attachment),ownership={before:{owner:item?.ownerEntityId,legalOwner:item?.legalOwnerEntityId}};
    if(!item||before?.wearerId!==q.targetId||q.transferControl&&!before.controllers.includes(q.sellerId)||q.transferOwnership&&(item.ownerEntityId!==q.sellerId||item.legalOwnerEntityId!==q.sellerId||item.boundToEntityId))throw Error('这件拘束器无法按约转交，请检查它的归属和控制权。');
    const cancelledTimerIds=q.transferControl?(table(state).deviceTimers??[]).filter(t=>t.itemId===item.id&&t.actorId===q.sellerId&&t.status==='pending').map(t=>t.id):[];
    if(q.transferControl){cancelDeviceTimers(state,item.id,sourceId,q.sellerId);item.attachment.controllers=[...new Set(before.controllers.map(id=>id===q.sellerId?q.buyerId:id))];stamp(item.attachment);}
    if(q.transferOwnership){item.ownerEntityId=q.buyerId;item.legalOwnerEntityId=q.buyerId;}
    ownership.after={owner:item.ownerEntityId,legalOwner:item.legalOwnerEntityId};
    const e=event(state,'restraint-rights-transferred',q.operatorId??q.sellerId,q.targetId,sourceId,{offerId:q.offerId,transferEventId:q.transferEventId,...(q.operatorId&&q.operatorId!==q.sellerId?{previousControllerId:q.sellerId}:{}),buyerId:q.buyerId,itemId:item.id,cancelledTimerIds,terms:{transferOwnership:q.transferOwnership,transferControl:q.transferControl},ownership,previousAttachment:before,previousAttachmentHash:before.hash,attachment:clone(item.attachment)});
    globalThis.SoulWorldEngine?.refreshItemActions(state);
    return {itemId:item.id,eventId:e.id};
  }
  function changeDeviceMode(state,item,request,sourceId,hooks,restoredSoulPowerPercent){
    const a=item.attachment,d=resolveDevice(item),mode=request.mode,minutes=request.relockAfterMinutes;
    people.assertAlive(state,a.wearerId);
    if(!Object.hasOwn(d.modes,mode))throw Error('拘束器不支持这个模式');
    if(item.durability<=0)throw Error('拘束器已经损坏，须修复或更换');
    if(mode!=='released'&&(Number(state.世界.时间.day)>Number(item.payload?.expiresAtDay??Number.MAX_SAFE_INTEGER)||Number(state.战斗单位.列表[a.wearerId].派生?.有效等级??0)>d.maxLevel))throw Error('拘束器已过期或目标超过其压制等级');
    let limits=null;
    if(mode==='limited'&&['restraint-seal-collar','restraint-seal-platform','restraint-slime-suit'].includes(item.templateId)){
      limits=controls.bindLimits(state,a.wearerId,request.limits);
      if(item.templateId==='restraint-seal-collar'&&limits.damagePercent!==undefined&&limits.damagePercent!==100)throw Error('禁魂项圈不具备伤害调节能力');
      const owned=state.成长?.列表?.[a.wearerId]?.武魂ID列表??[],rings=owned.flatMap(id=>state.武魂.列表[id]?.魂环ID列表??[]),skills=state.战斗单位.列表[a.wearerId].能力.技能ID;
      if(limits.permission?.soulIds?.some(id=>!owned.includes(id))||limits.permission?.ringIds?.some(id=>!rings.includes(id))||limits.permission?.skillIds?.some(id=>!skills.includes(id)))throw Error('许可必须引用目标实际持有的武魂、魂环和技能');
    }else if(request.limits!==undefined)throw Error('只有精细封印器具可以指定限制配置');
    const originalBackground=state.世界?.opening?.background,openingAcquisition=globalThis.SoulBackgroundOpening?.acquisition(originalBackground),openingSetup=!!item.payload?.backgroundRestraint&&a.originKind==='initial-custody'&&a.sourceId===a.captureSourceId&&openingAcquisition?.buyerId===request.actorId&&openingAcquisition.deviceItemIds.includes(item.id)&&!state.世界.processedTransactions?.[originalBackground.sourceId]&&sourceId===`${openingAcquisition?.id}:device-setup:${item.provenance.index}`;
    const host=globalThis.SoulHostCore,resetSuppression=mode==='locked'&&host?.sourceAllowed(state,item)&&host.read(item).capabilities.suppression?.percent!==undefined&&host.read(item).capabilities.suppression.percent!==100;
    if(a.mode===mode&&mode!=='limited'&&!openingSetup&&!resetSuppression)throw Error('拘束器已经处于这个模式');
    if(minutes!==undefined&&(!d.autoRelock||mode==='locked'||!Number.isSafeInteger(minutes)||minutes<1||minutes>1440))throw Error('只有带定时机关的装置能在解放或押送模式下设置1至1440分钟后的复锁');
    cancelDeviceTimers(state,item.id,sourceId);
    const oldMode=a.mode,previousLimits=clone(host?.sourceAllowed(state,item)&&host.read(item).capabilities.suppression?host.suppressionLimits(item):a.limits??null),previousAttachmentHash=a.hash;hooks.removeDevice(state,item.id,'restraint-mode-changed');
    a.mode=mode;a.sourceId=sourceId;a.effectActorId=request.actorId;a.changedAt=people.now(state);
    if(limits)a.limits=limits;else delete a.limits;
    host?.setModeSuppression(state,item,mode,limits,restoredSoulPowerPercent);
    const effects=mode==='released'?[]:hooks.applyDevice(state,request.actorId,a.wearerId,item.id,sourceId);
    a.effectIds=effects.filter(e=>e.statusId).map(e=>e.statusId);stamp(a);
    event(state,'restraint-mode-changed',request.actorId,a.wearerId,sourceId,{itemId:item.id,oldMode,mode,effects,previousAttachmentHash,attachment:clone(a)});
    let timer=null;
    if(minutes!==undefined){
      timer=stamp({id:`relock:${sourceId}:${item.id}`,itemId:item.id,templateId:item.templateId,wearerId:a.wearerId,actorId:request.actorId,attachmentSourceId:a.captureSourceId,modeSourceId:sourceId,createdAt:people.now(state),dueAt:people.now(state)+minutes,returnMode:oldMode==='limited'?'limited':'locked',...(previousLimits?{returnLimits:previousLimits}:{}),status:'pending'});
      (table(state,true).deviceTimers??=[]).push(timer);event(state,'restraint-timer-set',request.actorId,a.wearerId,sourceId,{timer:clone(timer)});
    }
    return {type:'restraint-mode-changed',actorId:request.actorId,targetId:a.wearerId,itemId:item.id,oldMode,mode,effects,limits:clone(a.limits??null),power:controls.powerFacts(state,a.wearerId),timer:clone(timer),summary:`${item.name}已切换为${mode==='limited'?'受限活动':mode==='released'?'佩戴中解放':mode==='escort'?'押送':'锁定'}模式。${timer?`已设置${minutes}分钟后由装置自行恢复。`:''}`};
  }
  function detachQuote(state,request){
    const item=state.物品.实例[request.itemId];
    if(item?.attachment?.wearerId===request.actorId&&(item.attachment&&(globalThis.SoulHostCore?.read(item).capabilities.release?.wearerLock||resolveDevice(item)?.wearerLock)))throw Error('这件宿主由控制者锁定，穿戴者无法自行解除');
    if(item?.attachment?.wearerId===request.actorId&&item.durability<=0){actions.resolve(state,{actorId:request.actorId,battleId:null,requirements:['gesture']});requireAwake(state,request.actorId);return {item,brokenRemoval:{item:clone(item),position:clone(actions.positionOf(state,request.actorId))}};}return {item:controlDevice(state,request.actorId,request.itemId,null,{physical:true}),brokenRemoval:null};}
  function detachDevice(state,request,sourceId,hooks){
    const {item,brokenRemoval}=detachQuote(state,request),a=clone(item.attachment),actor=state.人物.列表[request.actorId];
    cancelDeviceTimers(state,item.id,sourceId);
    hooks.removeDevice(state,item.id,'restraint-detached');delete item.attachment;
    hooks.transferItem(state,item.id,actor.inventoryContainerId,1);
    event(state,'restraint-detached',request.actorId,a.wearerId,sourceId,{itemId:item.id,attachment:a,...(brokenRemoval?{brokenRemoval}:{})});
    return {type:'restraint-detached',actorId:request.actorId,targetId:a.wearerId,itemId:item.id,summary:`已拆下${item.name}。`};
  }
  function release(state,request,sourceId,hooks){
    const record=active(state,request.targetId);
    if(!record||record.custodianId!==request.actorId)throw Error('没有该人物的实际看管权限');
    if(isIdentity(record))throw Error('身份归属须经原契约正式结束，不能当作物理放行绕过');
    actions.resolve(state,{actorId:request.actorId,battleId:null,targetIds:[request.targetId],requirements:['gesture']});
    requireAwake(state,request.actorId);
    const controlled=attached(state,request.targetId).filter(i=>i.attachment.controllers.includes(request.actorId)),detached=[];
    for(const item of controlled)detached.push(detachDevice(state,{actorId:request.actorId,itemId:item.id},`${sourceId}:${item.id}`,hooks).itemId);
    record.status='released';record.endedAt=people.now(state);stamp(record);
    event(state,'released',request.actorId,request.targetId,sourceId,{custodyId:record.id,authority:authorityRef(record),detachedItemIds:detached});
    return {type:'captive-released',actorId:request.actorId,targetId:request.targetId,custodyId:record.id,detachedItemIds:detached,remainingDeviceIds:attached(state,request.targetId).map(i=>i.id),summary:'已放行，并拆下你能解除的拘束器。'};
  }
  function nextAt(state,through=Infinity){
    const times=(table(state).deviceTimers??[]).filter(t=>t.status==='pending'&&t.dueAt<=through).map(t=>t.dueAt);
    return times.length?Math.min(...times):null;
  }
  function advanceAt(state,at,hooks){
    const ids=(table(state).deviceTimers??[]).filter(t=>t.status==='pending'&&t.dueAt<=at).sort((a,b)=>a.dueAt-b.dueAt||a.id.localeCompare(b.id)).map(t=>t.id);
    for(const id of ids){
      const timer=table(state).deviceTimers.find(t=>t.id===id);if(timer.status!=='pending')continue;
      try{
        const draft=clone(state),stored=table(draft).deviceTimers.find(t=>t.id===id),item=draft.物品.实例[stored.itemId],a=item?.attachment;
        if(!a||a.wearerId!==stored.wearerId||a.captureSourceId!==stored.attachmentSourceId||a.sourceId!==stored.modeSourceId||!a.controllers.includes(stored.actorId)||item.templateId!==stored.templateId||!DEVICES[item.templateId]?.autoRelock)throw Error('原装配或权限已经变化');
        stored.status='completed';stored.endedAt=at;stored.reason='装置按已设置时刻完成复锁';stored.endSourceId=`${id}:fire`;stamp(stored);
        changeDeviceMode(draft,item,{actorId:stored.actorId,mode:stored.returnMode,...(stored.returnMode==='limited'&&stored.returnLimits?{limits:stored.returnLimits}:{})},stored.endSourceId,hooks,stored.returnMode==='locked'?stored.returnLimits?.soulPowerPercent:undefined);
        event(draft,'restraint-timer-ended',stored.actorId,stored.wearerId,stored.endSourceId,{timerId:id,status:stored.status,reason:stored.reason});
        hooks.commitDraft(state,draft);
      }catch(error){
        timer.status='failed';timer.endedAt=at;timer.reason=error.message;timer.endSourceId=`${id}:failed`;stamp(timer);
        event(state,'restraint-timer-ended',timer.actorId,timer.wearerId,timer.endSourceId,{timerId:id,status:timer.status,reason:timer.reason});
      }
    }
  }
  function facts(state,viewerId,options={}){
    const db=table(state),visibleHeld=Object.values(db.byPerson).filter(r=>active(state,r.personId)&&(r.personId===viewerId||r.custodianId===viewerId&&actions.colocated(state,viewerId,r.personId))),selectedId=visibleHeld.some(r=>r.personId===options.selectedPersonId)?options.selectedPersonId:visibleHeld[0]?.personId;
    const visibleRequests=requestedPermissions(state).filter(e=>[e.actorId,e.targetId].includes(viewerId)),pendingKeys=new Set(pendingRequestedPermissions(state,new Set(visibleRequests.map(e=>e.id))).map(p=>p.key));
    return {permissionRequests:visibleRequests.map(e=>{const decision=requestedPermissionDecision(state,e.id),pending=pendingKeys.has(e.id);return {id:e.id,operatorId:e.actorId,wearerId:e.targetId,itemId:e.itemId,itemName:state.物品.实例[e.itemId]?.name,operatorName:state.人物.列表[e.actorId]?.name,wearerName:state.人物.列表[e.targetId]?.name,status:decision?decision.decision.accept?'accepted':'rejected':pending?'pending':'invalidated',canRespond:pending&&e.targetId===viewerId};}),brokenDevices:attached(state,viewerId).filter(i=>i.durability<=0).map(i=>{let reason='';try{detachQuote(state,{actorId:viewerId,itemId:i.id});}catch(e){reason=e.message;}return {itemId:i.id,name:i.name,canDetach:!reason,reason};}),permissions:(db.permissions??[]).filter(p=>(p.wearerId===viewerId||p.operatorId===viewerId)&&p.status==='granted'&&p.expiresAt>people.now(state)).map(p=>({...clone(p),canRevoke:p.wearerId===viewerId,wearerName:state.人物.列表[p.wearerId]?.name,operatorName:state.人物.列表[p.operatorId]?.name,itemName:state.物品.实例[p.itemId]?.name??p.itemId})),devices:Object.values(state.物品?.实例??{}).filter(item=>DEVICES[item.templateId]&&item.ownerEntityId===viewerId&&item.containerId===state.人物.列表[viewerId]?.inventoryContainerId&&!item.attachment).map(item=>({id:item.id,name:item.name,sourceType:item.provenance?.type??null,quantity:item.quantity,durability:item.durability,part:DEVICES[item.templateId].part,maxLevel:DEVICES[item.templateId].maxLevel})),
      defeats:Object.values(db.defeats).filter(r=>r.status==='pending'&&(r.targetId===viewerId||r.eligibleActorIds.includes(viewerId))).map(r=>{let reason='';try{qualification(state,viewerId,r.targetId,r.id);}catch(error){reason=error.message;}return {...clone(r),targetName:state.人物.列表[r.targetId].name,available:!reason,reason};}),
      held:visibleHeld.map(r=>{
        if(options.summary||options.selectedOnly&&r.personId!==selectedId)return {id:r.id,personId:r.personId,personName:state.人物.列表[r.personId]?.name,custodianId:r.custodianId,arrangement:clone(r.arrangement)};
        let canRelease=r.custodianId===viewerId;try{actions.resolve(state,{actorId:viewerId,battleId:null,targetIds:[r.personId],requirements:['gesture']});}catch{canRelease=false;}
        return {...clone(r),canRelease,power:controls.powerFacts(state,r.personId),availableDevices:Object.values(state.物品.实例).filter(i=>DEVICES[i.templateId]&&i.ownerEntityId===viewerId&&!i.attachment&&i.containerId===state.人物.列表[viewerId]?.inventoryContainerId).map(i=>{let reason='';try{attachQuote(state,{actorId:viewerId,targetId:r.personId,itemId:i.id});}catch(error){reason=error.message;}let requestReason='';try{permissionRequestQuote(state,viewerId,r.personId,i.id);if(requestedPermissions(state).some(e=>e.actorId===viewerId&&e.targetId===r.personId&&e.itemId===i.id&&e.expiresAt>people.now(state)&&!requestedPermissionDecision(state,e.id)))throw Error('已经请求，等待本人回应');}catch(error){requestReason=error.message;}return {itemId:i.id,name:i.name,sourceType:i.provenance?.type??null,available:!reason,reason,canRequest:!requestReason,requestReason};}),personName:state.人物.列表[r.personId]?.name,captorName:state.人物.列表[r.captorId]?.name,custodianName:state.人物.列表[r.custodianId]?.name,position:clone(actions.positionOf(state,r.personId)),devices:attached(state,r.personId).map(i=>{
          let reason='';try{controlDevice(state,viewerId,i.id);}catch(error){reason=error.message;}
          return {itemId:i.id,name:i.name,mode:i.attachment.mode,modes:Object.keys(resolveDevice(i).modes),limits:clone(i.attachment.limits??null),supportsFineLimits:['restraint-seal-collar','restraint-seal-platform','restraint-slime-suit'].includes(i.templateId),supportsDamage:i.templateId==='restraint-seal-platform',choices:controls.limitChoices(state,r.personId,{supportsDamage:i.templateId==='restraint-seal-platform'}),autoRelock:!!DEVICES[i.templateId].autoRelock,timer:clone((table(state).deviceTimers??[]).find(t=>t.itemId===i.id&&t.status==='pending')??null),durability:i.durability,canControl:!reason,reason};
        })};
      })};
  }
  function validate(state,hooks={}){
    const db=state.世界?.custody;if(db===undefined)return Object.values(state.人物?.列表??{}).some(p=>p.扩展?.战败处置?.length)||Object.values(state.物品?.实例??{}).some(i=>i.attachment)||Object.values(state.状态实例?.列表??{}).some(s=>s.扩展?.持续来源合同?.sourceKind==='restraint')?['拘束装配缺少实际看管记录']:[];
    const errors=globalThis.SoulCustodyRewrites?.validate(state)??[];if(!db||db.version!==1||!db.defeats||Array.isArray(db.defeats)||!db.byPerson||Array.isArray(db.byPerson)||!Array.isArray(db.history)||!Array.isArray(db.events))return ['看管系统结构无效'];
    errors.push(...validateRequestedPermissions(state,hooks));
    const records=[...Object.values(db.byPerson),...db.history];
    if(new Set(records.map(r=>r?.id)).size!==records.length||Object.entries(db.byPerson).some(([id,r])=>r?.personId!==id)||db.history.some(r=>r?.status==='held'))errors.push('看管当前与历史记录重复或无效');
    const atValid=at=>Number.isSafeInteger(at)&&at>=0&&at<=people.now(state),events=new Set();let lastOrder=0;
    for(const e of db.events){
      if(!e||!validStamp(e)||!atValid(e.at)||!Number.isSafeInteger(e.order)||e.order<=lastOrder||e.order>state.扩展.personEventSequence||e.id!==`custody-event:${e.sourceId}:${e.type}:${e.targetId}`||events.has(e.id)||!state.人物.列表[e.actorId]&&state.战斗单位.列表[e.actorId]?.单位种类!=='魂兽'||!state.人物.列表[e.targetId])errors.push('看管事件记录无效');
      events.add(e?.id);lastOrder=e?.order;
      if(['captured','custody-initialized','custody-transferred','released','escaped','custody-death'].includes(e?.type)&&!records.some(r=>r.id===e.custodyId&&r.personId===e.targetId))errors.push('看管权限事件缺少实际人物看管记录');
      if(e?.type==='searched'&&(!authorityAt(state,e.authority,e.actorId,e.at,e.order)||e.custodyId!==e.authority.custodyId||e.targetId!==e.authority.personId))errors.push('搜取缺少当时的实际看管权限');
    }
    for(const [id,r] of Object.entries(db.defeats))try{
      if(!r||id!==r.id||id!==`defeat:${r.battleId}:${r.targetId}`||!validStamp(r)||r.battleKind!=='lethal'||!state.人物.列表[r.targetId]||!['defeated','surrendered'].includes(r.defeatKind)||!['pending','spared','executed','captured','expired'].includes(r.status)||!Array.isArray(r.eligibleActorIds)||!r.eligibleActorIds.length||new Set(r.eligibleActorIds).size!==r.eligibleActorIds.length||r.eligibleActorIds.some(id=>!state.人物.列表[id]||id===r.targetId)||!atValid(r.at)||!Number.isSafeInteger(r.order)||r.order<1||r.order>state.扩展.personEventSequence)throw Error('字段');
      const p=r.proof,m=p?.members,t=m?.find(v=>v.unitId===r.targetId);
      if(!p||p.battleId!==r.battleId||p.battleKind!=='lethal'||p.winnerSideId!==r.winnerSideId||!Array.isArray(m)||new Set(m.map(v=>v.unitId)).size!==m.length||!t||t.status!==r.defeatKind||t.sideId===r.winnerSideId||r.eligibleActorIds.some(id=>!m.some(v=>v.unitId===id&&v.sideId===r.winnerSideId&&v.status==='active')))throw Error('战果');
      const battle=[state.战斗,...Object.values(state.世界.backgroundBattles??{})].find(b=>b.id===r.battleId);
      if(battle&&(battle.状态!=='已结束'||battle.扩展?.battleKind!=='lethal'||battle.扩展?.规则?.fatalOnDefeat||battle.扩展?.结果?.winnerSideId!==r.winnerSideId||m.some(v=>{const actual=battle.扩展.成员[v.unitId];return !actual||actual.status!==v.status||actual.sideId!==v.sideId;})))throw Error('场次');
      if(r.status==='pending'){if(r.resolution!==null)throw Error('待处置');}
      else{
        const x=r.resolution;if(!x||x.action!==r.status||!atValid(x.at)||x.at<r.at||typeof x.sourceId!=='string'||!x.sourceId||!state.人物.列表[x.actorId]||r.status!=='expired'&&!r.eligibleActorIds.includes(x.actorId))throw Error('处置');
        if(r.status!=='expired'&&!db.events.some(e=>e.type===r.status&&e.defeatId===id&&e.actorId===x.actorId&&e.targetId===r.targetId&&e.sourceId===x.sourceId&&e.at===x.at&&e.order>r.order))throw Error('处置事件');
        if(r.status==='executed'){const death=state.人物.列表[r.targetId].life?.death;if(!death||death.id!==`death:${r.targetId}:${x.sourceId}`||death.sourceId!==x.sourceId||death.at!==x.at||death.cause!=='死斗后的明确处决')throw Error('处决死亡来源');}
      }
    }catch{errors.push(`战败资格${id}无效`);}
    for(const r of records){
      const id=r?.personId;
      const defeat=db.defeats[r?.defeatId],source=defeat?.resolution;
      const abilityCapture=hooks.validateCaptureSource?.(state,r),openingRelation=globalThis.SoulOpeningRelations?.initialCustodySource(state,r)||globalThis.SoulCustodyRewrites?.initialSource(state,r),initial=openingRelation||globalThis.SoulPersonContracts?.initialCustodySource(state,r)||abilityCapture?.eventType==='custody-initialized'||globalThis.SoulCommerceProvenance?.initialSource(state,r);
      if(!r||r.personId!==id||!validStamp(r)||!state.人物.列表[id]||!state.人物.列表[r.captorId]&&!(abilityCapture?.valid&&state.战斗单位.列表[r.captorId]?.单位种类==='魂兽')||r.captorId===id||!initial&&(defeat?.targetId!==id||defeat.status!=='captured'||source?.sourceId!==r.sourceId||source?.actorId!==r.captorId)||r.id!==`custody:${r.sourceId}:${id}`||!atValid(r.since)||!initial&&r.since!==source?.at||!['held','released','escaped','dead'].includes(r.status)||r.status==='held'&&state.人物.列表[id]?.status==='dead')errors.push(`看管记录${id}无效`);
      const chain=db.events.filter(e=>e.custodyId===r.id&&['captured','custody-initialized','custody-transferred'].includes(e.type)),first=chain[0];
      if(!first||first.type!==(initial?'custody-initialized':'captured')||first.sourceId!==r.sourceId||first.actorId!==r.captorId||first.targetId!==id||!sameAuthority(first.authority,{custodyId:r.id,personId:id,custodianId:r.captorId,version:1,eventId:first.id})||!sameAuthority(authorityRef(r),chain.at(-1)?.authority))errors.push('当前看管权限缺少原捕获及完整交接来源');
      for(let n=1;n<chain.length;n++){const e=chain[n],prior=chain[n-1];if(e.type!=='custody-transferred'||!sameAuthority(e.previousAuthority,prior.authority)||e.authority?.version!==n+1||e.authority?.eventId!==e.id||(e.actorId!==prior.authority.custodianId&&!(e.offerId?.startsWith('background-found:')&&hooks.validateTransfer?.(state,e,prior)))||!(hooks.validateTransfer?.(state,e,prior)||globalThis.SoulCustodyRewrites?.validateTransfer(state,e)))errors.push('看管交接缺少原子事务来源');}
      if(r&&r.status!=='held'&&(!atValid(r.endedAt)||r.endedAt<r.since||!db.events.some(e=>e.custodyId===r.id&&e.type===(r.status==='dead'?'custody-death':r.status)&&e.at===r.endedAt)))errors.push(`看管记录${id}终结缺少实际事件`);
      const endings=db.events.filter(e=>e.custodyId===r?.id&&['released','escaped','custody-death'].includes(e.type));
      for(const e of endings){if(e.authority?.custodyId!==r.id||e.authority?.personId!==r.personId||!authorityAt(state,e.authority,e.authority?.custodianId,e.at,e.order))errors.push('看管终结未绑定当时的实际权限');}
      for(const e of endings.filter(e=>e.type==='released'))if(e.reason==='rescued'?!state.世界.rescues?.events.some(v=>v.kind==='released'&&v.rescueId===e.rescueId&&v.sourceId===e.sourceId&&v.custodyId===r.id&&v.record.ownerId===e.actorId):e.authority?.custodianId!==e.actorId)errors.push('解除看管缺少实际权限或营救来源');
      for(const e of endings.filter(e=>e.type==='released'&&e.reason==='custodian-dead')){const death=state.人物.列表[e.actorId]?.life?.death;if(!death||death.id!==e.deathId||death.at>e.at||e.sourceId!==`custodian-death-release:${r.id}:${death.id}`||!Array.isArray(e.detachedItemIds)||e.detachedItemIds.some(id=>!db.events.some(d=>d.type==='restraint-detached'&&d.itemId===id&&d.sourceId===`${e.sourceId}:${id}`&&d.custodianDeath?.deathId===death.id)))errors.push('看守死亡释放缺少真实死亡及原装置拆除来源');}
      if(endings.length>1||endings.length&&r.status!==(endings[0].type==='custody-death'?'dead':endings[0].type))errors.push(`看管记录${id}未对应最新终结事件`);
      if(!openingRelation&&!globalThis.SoulPersonContracts?.initialCustodySource(state,r)&&!abilityCapture?.valid&&!globalThis.SoulSealingCore?.validateCapture(state,r)&&(!Array.isArray(r?.restraintItemIds)||!r.restraintItemIds.length||new Set(r.restraintItemIds).size!==r.restraintItemIds.length||r.restraintItemIds.some(itemId=>!db.events.some(e=>e.type==='restraint-attached'&&e.itemId===itemId&&e.attachment?.captureSourceId===r.sourceId&&e.actorId===r.captorId&&e.targetId===r.personId&&e.at===r.since))))errors.push(`看管记录${id}缺少完整初次装配`);
    }
    for(const r of Object.values(db.defeats))if(r.status==='captured'&&!records.some(c=>c?.defeatId===r.id))errors.push(`捕获${r.id}缺少看管记录`);
    for(const [id,r] of Object.entries(db.byPerson))if(db.events.filter(e=>['captured','custody-initialized'].includes(e.type)&&e.targetId===id).at(-1)?.sourceId!==r.sourceId)errors.push(`人物${id}当前看管并非最新一次捕获`);
    const slots=new Set();
    const deviceLatest=new Map();
    for(const e of db.events)if(['restraint-attached','restraint-mode-changed','restraint-detached','restraint-rights-transferred'].includes(e.type)){
      const previous=deviceLatest.get(e.itemId),a=e.attachment;
      if(!a||!validStamp(a)||a.wearerId!==e.targetId||e.type!=='restraint-rights-transferred'&&!a.controllers.includes(e.actorId)&&!(e.type==='restraint-detached'&&e.realmReplacement&&globalThis.SoulRealmArrangements?.validReplacement(state,e.realmReplacement,e.itemId))&&!(e.type==='restraint-detached'&&e.brokenRemoval?.item?.durability===0&&e.brokenRemoval.item.id===e.itemId&&e.actorId===a.wearerId&&abilities.hash(e.brokenRemoval.item.attachment)===abilities.hash(a))||e.type==='restraint-attached'&&previous&&previous.type!=='restraint-detached'||e.type!=='restraint-attached'&&(!previous||previous.type==='restraint-detached'||previous.attachment.captureSourceId!==a.captureSourceId))errors.push('拘束器生命周期顺序无效');
      if(e.type==='restraint-mode-changed'&&(e.oldMode!==previous?.attachment.mode||e.previousAttachmentHash!==previous?.attachment.hash||e.mode!==a?.mode)||e.type==='restraint-detached'&&a?.hash!==previous?.attachment.hash||previous&&e.at<previous.at)errors.push('拘束器生命周期前后依据不连续');
      if(e.type==='restraint-rights-transferred'){
        const expectedTimers=e.terms?.transferControl?db.events.filter(v=>v.type==='restraint-timer-set'&&v.timer.itemId===e.itemId&&v.timer.actorId===e.actorId&&v.order<e.order&&!db.events.some(end=>end.type==='restraint-timer-ended'&&end.timerId===v.timer.id&&end.order<e.order&&end.sourceId!==`${e.sourceId}:cancel:${v.timer.id}`)).map(v=>v.timer.id):[];
        if(abilities.hash(e.cancelledTimerIds??null)!==abilities.hash(expectedTimers)||expectedTimers.some(id=>{const t=(db.deviceTimers??[]).find(t=>t.id===id),end=db.events.filter(v=>v.type==='restraint-timer-ended'&&v.timerId===id);return t?.status!=='cancelled'||t.endSourceId!==e.sourceId||t.endedAt!==e.at||end.length!==1||end[0].order>=e.order||end[0].sourceId!==`${e.sourceId}:cancel:${id}`;}))errors.push('装置控制权交接未终止原复锁设定');
        const expected={...e.previousAttachment,controllers:e.terms?.transferControl?[...new Set(e.previousAttachment.controllers.map(id=>id===(e.previousControllerId??e.actorId)?e.buyerId:id))]:e.previousAttachment.controllers};stamp(expected);if(e.previousAttachmentHash!==previous?.attachment.hash||!(hooks.validateDeviceTransfer?.(state,e)||globalThis.SoulCustodyRewrites?.validateDeviceTransfer(state,e))||abilities.hash(expected)!==abilities.hash(a))errors.push('拘束器交接缺少实际条款来源');}
      deviceLatest.set(e.itemId,e);
    }
    for(const [itemId,e] of deviceLatest){
      const item=state.物品.实例[itemId],a=item?.attachment;
      const ownership=db.events.filter(v=>v.type==='restraint-rights-transferred'&&v.itemId===itemId&&v.attachment.captureSourceId===a?.captureSourceId).at(-1)?.ownership.after;
      if(ownership&&(item.ownerEntityId!==ownership.owner||item.legalOwnerEntityId!==ownership.legalOwner))errors.push('仍佩戴拘束器的物权不符实际交接');
      if(e.type==='restraint-detached'?!!a:!a||abilities.hash(a)!==abilities.hash(e.attachment))errors.push(`拘束器${itemId}并非最新实际装配`);
    }
    const timers=db.deviceTimers??[],timerIds=new Set();
    if(!Array.isArray(timers))errors.push('定时复锁记录结构无效');
    else{
      for(const t of timers)try{
        const initial=db.events.find(e=>e.type==='restraint-timer-set'&&e.timer?.id===t.id),ending=db.events.filter(e=>e.type==='restraint-timer-ended'&&e.timerId===t.id);
        if(!validStamp(t)||timerIds.has(t.id)||!initial||!DEVICES[t.templateId]?.autoRelock||!Number.isSafeInteger(t.dueAt)||t.dueAt<=t.createdAt||t.dueAt-t.createdAt>1440||!atValid(t.createdAt)||!['locked','limited'].includes(t.returnMode)||t.returnMode==='limited'&&!t.returnLimits||!['pending','completed','failed','cancelled'].includes(t.status)||initial.at!==t.createdAt||initial.actorId!==t.actorId||initial.targetId!==t.wearerId)throw Error('来源或时刻');
        const immutable={...t,status:'pending'};delete immutable.hash;delete immutable.endedAt;delete immutable.reason;delete immutable.endSourceId;
        const first={...initial.timer};delete first.hash;if(abilities.hash(immutable)!==abilities.hash(first)||t.id!==`relock:${t.modeSourceId}:${t.itemId}`)throw Error('设定已被改写');
        if(!db.events.some(e=>e.type==='restraint-mode-changed'&&e.sourceId===t.modeSourceId&&e.itemId===t.itemId&&e.at===t.createdAt&&e.attachment.captureSourceId===t.attachmentSourceId))throw Error('设定装配');
        if(t.status==='pending'){
          const a=state.物品.实例[t.itemId]?.attachment;
          if(ending.length||t.dueAt<=people.now(state)||a?.sourceId!==t.modeSourceId||a.captureSourceId!==t.attachmentSourceId||!a.controllers.includes(t.actorId))throw Error('待执行');
        }else if(ending.length!==1||ending[0].status!==t.status||ending[0].at!==t.endedAt||!atValid(t.endedAt)||t.endedAt<t.createdAt||t.status!=='cancelled'&&t.endedAt!==t.dueAt)throw Error('终结');
        if(t.status==='completed'&&!db.events.some(e=>e.type==='restraint-mode-changed'&&e.sourceId===t.endSourceId&&e.itemId===t.itemId&&e.mode===t.returnMode&&e.at===t.dueAt))throw Error('复锁');
        if(t.status==='cancelled'&&!db.events.some(e=>['restraint-mode-changed','restraint-detached','restraint-rights-transferred'].includes(e.type)&&e.sourceId===t.endSourceId&&e.itemId===t.itemId&&e.at===t.endedAt&&(e.type!=='restraint-rights-transferred'||e.terms.transferControl&&e.actorId===t.actorId&&e.cancelledTimerIds.includes(t.id))))throw Error('取消');
        timerIds.add(t.id);
      }catch(error){errors.push(`定时复锁${t?.id}无效：${error.message}`);}
      for(const e of db.events)if(e.type==='restraint-timer-set'&&!timerIds.has(e.timer?.id)||e.type==='restraint-timer-ended'&&!timerIds.has(e.timerId))errors.push('定时复锁事件缺少对应状态');
    }
    for(const item of Object.values(state.物品?.实例??{}))if(item.attachment){const a=item.attachment,d=resolveDevice(item),slot=`${a.wearerId}:${a.part}`;
      if(globalThis.SoulIntimateCore?.DEVICES?.[item.templateId])continue;
      if(globalThis.SoulRealmArrangements?.isManaged(item)){if(!globalThis.SoulRealmArrangements.validateAttachment(state,item))errors.push('画境器具'+item.id+'实际装配无效');continue;}
      if(!deviceLatest.has(item.id))errors.push(`拘束器${item.id}缺少生命周期记录`);
      const workshopInitial=a.originKind==='opening-workshop'&&globalThis.SoulOpeningWorkshop?.initialAttachment(state,item);
      if(!d||!validStamp(a)||!state.人物.列表[a.wearerId]||a.part!==d.part||!Object.hasOwn(d.modes,a.mode)||typeof a.locked!=='boolean'||!Array.isArray(a.controllers)||!a.controllers.length||new Set(a.controllers).size!==a.controllers.length||a.controllers.some(id=>!state.人物.列表[id]||id===a.wearerId&&!(workshopInitial||a.originKind==='reattach'&&a.attachedBy===a.wearerId&&db.events.some(e=>e.type==='restraint-attached'&&e.sourceId===a.captureSourceId&&e.authority?.kind==='self')))||!state.人物.列表[a.attachedBy]||!atValid(a.attachedAt)||item.quantity!==1||state.容器.列表[item.containerId]?.扩展?.wearerId!==a.wearerId||slots.has(slot))errors.push(`拘束器${item.id}装配无效`);
      slots.add(slot);
      const origin=workshopInitial||(a.originKind==='initial-custody'?globalThis.SoulCommerceProvenance?.initialAttachment(state,item):a.originKind==='capture'?Object.values(db.defeats).find(r=>r.status==='captured'&&r.targetId===a.wearerId&&r.resolution.sourceId===a.captureSourceId&&r.resolution.actorId===a.attachedBy):a.originKind==='reattach'?db.events.find(e=>e.type==='restraint-attached'&&e.sourceId===a.captureSourceId&&e.itemId===item.id&&e.targetId===a.wearerId&&e.actorId===a.attachedBy&&e.authority):null);
      if(!origin)errors.push(`拘束器${item.id}缺少原始装配事件`);
      if(a.sourceId!==a.captureSourceId&&!db.events.some(e=>e.type==='restraint-mode-changed'&&e.sourceId===a.sourceId&&e.itemId===item.id&&e.actorId===a.effectActorId&&e.targetId===a.wearerId&&e.mode===a.mode))errors.push(`拘束器${item.id}模式变化缺少实际操作`);
      const activeEffects=Object.values(state.状态实例?.列表??{}).filter(s=>s.扩展?.持续来源合同?.sourceKind==='restraint'&&s.来源?.物品ID===item.id).map(s=>s.id).sort();
      const enabled=item.durability>0&&a.mode!=='released'&&state.人物.列表[a.wearerId]?.status!=='dead'&&Number(state.世界.时间.day)<=Number(item.payload?.expiresAtDay??Number.MAX_SAFE_INTEGER);
      if(!Array.isArray(a.effectIds)||new Set(a.effectIds).size!==a.effectIds.length||abilities.hash(activeEffects)!==abilities.hash(enabled?[...a.effectIds].sort():[]))errors.push(`拘束器${item.id}效果与实际装配不一致`);
    }
    const permissions=db.permissions??[],permissionIds=new Set();
    if(!Array.isArray(permissions))errors.push('装配许可结构无效');
    else{
      for(const p of permissions)try{
        const first=db.events.find(e=>e.type==='restraint-permitted'&&e.permission?.id===p.id),used=db.events.filter(e=>e.type==='restraint-attached'&&e.authority?.permissionId===p.id),revoked=db.events.filter(e=>e.type==='restraint-permission-revoked'&&e.permissionId===p.id);
        if(!validStamp(p)||permissionIds.has(p.id)||!first||p.id!==`restraint-permission:${p.sourceId}`||!state.人物.列表[p.wearerId]||!state.人物.列表[p.operatorId]||p.wearerId===p.operatorId||p.mode!=='locked'||!atValid(p.issuedAt)||p.expiresAt!==p.issuedAt+15||!['granted','used','revoked'].includes(p.status))throw Error('来源');
        const original={...p,status:'granted'};for(const key of ['hash','usedAt','usedBy','revokedAt','revokedBy'])delete original[key];
        const initial={...first.permission};delete initial.hash;
        if(abilities.hash(original)!==abilities.hash(initial)||first.at!==p.issuedAt||first.actorId!==p.wearerId||first.targetId!==p.operatorId)throw Error('许可被改写');
        if(p.status==='used'?used.length!==1||revoked.length||used[0].at!==p.usedAt||used[0].sourceId!==p.usedBy||p.usedAt>=p.expiresAt||p.usedAt<p.issuedAt:p.status==='revoked'?revoked.length!==1||used.length||revoked[0].at!==p.revokedAt||revoked[0].sourceId!==p.revokedBy||p.revokedAt>=p.expiresAt||p.revokedAt<p.issuedAt:used.length||revoked.length)throw Error('许可消耗');
        permissionIds.add(p.id);
      }catch(error){errors.push(`装配许可${p?.id}无效：${error.message}`);}
      for(const e of db.events)if(e.type==='restraint-permitted'&&!permissionIds.has(e.permission?.id)||e.type==='restraint-permission-revoked'&&!permissionIds.has(e.permissionId))errors.push('装配许可事件缺少对应状态');
    }
    for(const e of db.events)if(e.type==='restraint-attached'&&e.attachment?.originKind==='reattach')try{
      const a=e.authority;if(!a||!['self','realm-management','consent','control','suppression'].includes(a.kind))throw Error('许可类型');
      if(a.kind==='self'){if(e.actorId!==e.targetId)throw Error('自主装配主体');}
      else if(a.kind==='realm-management'){if(!globalThis.SoulResidentRealms?.validEquipmentSource(state,a.source,e.actorId,e.targetId,e.at,e.order))throw Error('画境管理来源');}
      else if(a.kind==='consent'){
        const p=permissions.find(p=>p.id===a.permissionId);
        if(!p||p.status!=='used'||p.operatorId!==e.actorId||p.wearerId!==e.targetId||p.itemId!==e.itemId||p.usedBy!==e.sourceId)throw Error('配合许可');
      }else if(a.kind==='control'){
        const s=a.source,source=s?.扩展?.持续来源合同;
        if(!hooks.validateControlSourceProof?.(s,e.targetId,e.at)||!s||s.id!==a.sourceStatusId||!['status.mind_control','status.soul_control'].includes(s.模板ID)||s.目标单位ID!==e.targetId||s.来源.单位ID!==e.actorId||!source||!abilities.verify(source).pass||!['全部','物品'].includes(s.快照.参数.命令域))throw Error('实际控制来源');
      }else{
        const c=records.find(r=>r.id===a.custodyId);if(!c||c.personId!==e.targetId||a.authority?.custodyId!==c.id||a.authority?.personId!==e.targetId||!authorityAt(state,a.authority,e.actorId,e.at,e.order)||!Array.isArray(a.statuses))throw Error('看管压制来源');
        if(a.statuses.some(s=>!hooks.validateControlSourceProof?.(s,e.targetId,e.at)))throw Error('压制状态来源合同');
        const snapshot=globalThis.SoulHostCore.validateAttributeFrame(a.hostFrame,e.targetId,e.at);
        if(a.lifeStatus!==snapshot.战斗单位.列表[e.targetId].存活状态||a.health!==snapshot.战斗单位.列表[e.targetId].资源.生命.当前||a.statuses.some(s=>abilities.hash(s)!==abilities.hash(snapshot.状态实例.列表[s.id])))throw Error('压制历史证据不一致');
        const limits=controls.restrictions(snapshot,e.targetId),incap=a.health<=0||a.lifeStatus!=='存活'||a.statuses.some(s=>['status.sleep','status.stun'].includes(s.模板ID)),powerless=!a.hasSoul||controls.combatSuppressed(snapshot,e.targetId);
        if(!incap&&!(limits.blocked.gesture?.length&&limits.blocked.movement?.length&&powerless))throw Error('不足以实际压制');
      }
    }catch(error){errors.push(`重新装配${e.itemId}无效：${error.message}`);}
    errors.push(...validateDefeatDecisions(state));
    return errors;
  }
  return Object.freeze({releaseOnCustodianDeath,reconcileDeaths,normalizePart,occupiedParts,assertPartAvailable,replayRequestedPermission,permissionRequestQuote,requestPermission,pendingRequestedPermissions,decideRequestedPermission,resolveDevice,requestedPermissions,requestedPermissionDecision,pendingDefeatDecisions,defeatDecisionOptions,defeatDecisions,replayDefeatDecision,decideDefeat,BATTLE_KINDS,DEVICES,table,active,isIdentity,confined,operationReason,authorityRef,currentAuthority,sameAuthority,hasAuthority,authorityAt,historicalAuthority,stamp,event,resolveDefeat,recordDefeats,expireDefeats,suspendPlans,qualification,attached,effectSpecs,captureQuote,capture,disposition,controlDevice,setDeviceMode,permitDevice,revokePermission,attachQuote,attachDevice,transferDeviceRights,detachQuote,detachDevice,release,nextAt,advanceAt,reconcileDeaths,facts,validate});
});
