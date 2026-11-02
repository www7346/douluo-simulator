(function(root,factory){
 const get=(name,file)=>root?.[name]??(typeof require==='function'?require(file):null);
 const api=factory(get('SoulInfluenceCore','./influence-core.js'),get('SoulActionContext','./action-context-core.js'),get('SoulControlCore','./control-core.js'),get('SoulPersonCore','./person-core.js'),get('SoulAbilityContract','./ability-contract-core.js'),get('SoulCustodyCore','./custody-core.js'),get('SoulCombatEngine','./combat-engine.js'),get('SoulWorldSocial','./world-social-core.js'));
 if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulFieldControl=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(influence,actions,controls,people,abilities,custody,combat,social){
 'use strict';
 const clone=v=>JSON.parse(JSON.stringify(v)),same=(a,b)=>abilities.hash(a)===abilities.hash(b),now=s=>people.now(s),contexts=new Set();
 function executing(s,executorId,domain){return [...contexts].some(context=>{const r=table(s).orders.find(o=>o.id===context.orderId);if(!r||r.status!=='executing'||r.executorId!==executorId||r.domain==='言语'||domain&&r.domain!==domain||r.executionId!==context.executionId||abilities.hash(r.action)!==context.intentHash)return false;const auth=influence.authority(s,r.issuerId,executorId,r.domain);return auth.available&&auth.sourceStatusId===r.sourceStatusId;});}
 const ACTIONS=Object.freeze({
  'speak-person':{domain:'言语',fields:['targetId','text'],required:['targetId','text'],receipt:'person-spoke'},
  'propose-gift':{domain:'物品',fields:['targetId','itemId','quantity','dueDay'],required:['targetId','itemId','quantity','dueDay'],receipt:'controlled-gift-proposed'},
  'fulfill-gift':{domain:'物品',fields:['commitmentId'],required:['commitmentId'],receipt:'controlled-gift-completed'},
  equip:{domain:'物品',fields:['itemId','slot'],required:['itemId'],receipt:'item-equipped'},
  unequip:{domain:'物品',fields:['slot'],required:['slot'],receipt:'item-unequipped'},
  'use-restorative-item':{domain:'物品',fields:['itemId','targetId','modeId'],required:['itemId'],receipt:'field-item-used'},
  'use-prebattle-pill':{domain:'物品',fields:['itemId','modeId'],required:['itemId'],receipt:'prebattle-pill-prepared'},
  'use-field-ability':{domain:'战斗',fields:['skillId','targetId','modeId','branchIds','targetItemId','recipeId','blueprintId','materials','quantity'],required:['skillId'],receipt:'field-ability-used'},
  'stop-maintenance':{domain:'战斗',fields:['maintenanceSourceId'],required:['maintenanceSourceId'],receipt:'stop-maintenance'},
  travel:{domain:'移动',fields:['destinationId','mode'],required:['destinationId'],receipt:'travel-completed'},
  'resume-travel':{domain:'移动',fields:['actionId'],required:['actionId'],receipt:'travel-completed'},
  'switch-martial-soul':{domain:'战斗',fields:['martialSoulId'],required:['martialSoulId'],receipt:'martial-soul-switched'}
 });
 const INTENTS=Object.freeze(['issue-field-control']);
 const table=(s,create=false)=>{if(create)s.世界.fieldControl??={version:1,orders:[],events:[]};return s.世界.fieldControl??{version:1,orders:[],events:[]};};
 const stamped=r=>{const {hash,...body}=r??{};return hash===abilities.hash(body);};
 function canonical(input){const spec=ACTIONS[input?.type],invalid=(key,v)=>key==='branchIds'?(!Array.isArray(v)||!v.length||v.length>16||new Set(v).size!==v.length||v.some(id=>typeof id!=='string'||!id)):key==='materials'?(!Array.isArray(v)||v.length>256||v.some(r=>!r||Object.keys(r).some(k=>!['fingerprint','quantity'].includes(k))||typeof r.fingerprint!=='string'||!Number.isSafeInteger(r.quantity)||r.quantity<1)):['quantity','dueDay'].includes(key)?!Number.isSafeInteger(v)||v<1||key==='quantity'&&v>999:typeof v!=='string'||!v.trim()||v.length>(key==='text'?2000:600);if(!input||!spec||Array.isArray(input)||Object.keys(input).some(k=>!['type',...spec.fields].includes(k))||spec.required.some(k=>input[k]===undefined)||spec.fields.some(k=>input[k]!==undefined&&invalid(k,input[k])))throw Error('场外命令须使用具体的已登记行动与参数，不能夹带执行者或任意修改');if(input.type==='travel'&&input.mode!==undefined&&!['balanced','fastest','cheapest'].includes(input.mode))throw Error('旅行模式无效');return clone(input);}
 function actionSkill(s,action){return action.type==='use-field-ability'?s.技能.列表[action.skillId]??null:['use-restorative-item','use-prebattle-pill'].includes(action.type)?Object.values(s.技能.列表).find(k=>k.sourceKind==='consumable'&&k.sourceItemId===action.itemId)??null:null;}
 function domainOf(action,skill){return action.type==='use-field-ability'&&['consumable','hidden-weapon','soul-device'].includes(skill?.sourceKind)?'物品':ACTIONS[action.type].domain;}
 function actionDomain(s,action,source=actionSkill(s,action)){return ACTIONS[action.type]?domainOf(action,source):null;}
 function beforeProof(s,id,action){
  const actor=s.战斗单位.列表[id],giftRecord=action.type==='fulfill-gift'?Object.values(s.人物.列表).flatMap(p=>p.扩展?.社交约定??[]).find(r=>r.id===action.commitmentId):null,giftTarget=action.type==='propose-gift'?action.targetId:giftRecord?.personId;
  return {costProfile:actor?{id,资源:{魂力:clone(actor.资源.魂力)},扩展:{武魂战斗修正:clone(actor.扩展?.武魂战斗修正??{})}}:null,
   resources:actor?{soulPower:actor.资源.魂力.当前,health:actor.资源.生命.当前}:null,
   ...(['propose-gift','fulfill-gift'].includes(action.type)?{gift:{item:clone(s.物品.实例[action.itemId??giftRecord?.itemId]??null),commitment:clone(giftRecord??null),participants:[id,giftTarget].map(personId=>s.人物.列表[personId]?social.communicationProof(s,personId):null),...(action.type==='propose-gift'?{presentation:globalThis.SoulControlledGifts.presentationProof(s,id,giftTarget)}:{})}}:{}),
   ...(action.type==='speak-person'?{speechParticipants:[id,action.targetId].map(personId=>{const p=s.人物.列表[personId],u=s.战斗单位.列表[personId];return p?{personId,position:clone(actions.positionOf(s,personId)),status:p.status,hadUnit:!!u,lifeState:u?.存活状态??null,health:u?.资源.生命.当前??null,battleId:actions.battleOf(s,personId)?.id??null,restrictions:controls.active(s,personId).filter(v=>['status.sleep','status.stun','status.mute'].includes(v.模板ID)).map(v=>({id:v.id,templateId:v.模板ID}))}:null;})}:{}),
   slots:clone(s.装备.配置[id]?.slots??{}),soulId:s.成长.列表[id]?.激活武魂ID??'',
   maintenance:action.type==='stop-maintenance'?clone(s.扩展.abilityMaintenance?.[action.maintenanceSourceId]??null):null};
 }
 function validateSettlement(s,r){
  const a=r.action,c=r.receipt,k=r.actionContract,proof=r.before;
  if(!c||c.id!==r.executionId||c.type!==ACTIONS[a.type].receipt||c.actorId!==undefined&&c.actorId!==r.executorId||c.entityId!==undefined&&c.entityId!==r.executorId||c.unitId!==undefined&&c.unitId!==r.executorId)throw Error('实际执行回执');
  if((['equip','unequip'].includes(a.type)?c.entityId:a.type==='switch-martial-soul'?c.unitId:c.actorId)!==r.executorId)throw Error('实际执行者缺失');
  if(['itemId','skillId','martialSoulId','slot'].some(key=>a[key]!==undefined&&c[key]!==a[key]))throw Error('实际行动参数');
  if(a.type==='use-field-ability'&&!same(globalThis.SoulCreationCore.normalizeScope(k,a),c.scope))throw Error('实际施放用途与原命令不符');
  if(['use-field-ability','use-restorative-item'].includes(a.type)&&c.targetId!==(a.targetId??r.executorId))throw Error('实际行动目标');
  if(a.type==='speak-person'){
   const statement=s.世界.speech?.statements.find(v=>v.id===c.statement?.id);
   if(!statement||!same(statement,c.statement)||!same(statement.participants,proof.speechParticipants)||statement.sourceId!==r.executionId||statement.fieldOrderRef.orderId!==r.id||statement.fieldOrderRef.sourceStatusId!==r.sourceStatusId||statement.speakerId!==r.executorId||statement.listenerId!==a.targetId||statement.text!==a.text||statement.at!==r.issuedAt)throw Error('实际发言与听闻来源');
  }
  if(['propose-gift','fulfill-gift'].includes(a.type)){
   const e=s.世界.controlledGifts?.events.find(e=>e.id===c.eventId);
   if(!e||e.sourceId!==r.executionId||e.record.playerId!==r.executorId||c.commitmentId!==e.commitmentId||!same(c.commitment,e.record)||e.kind!==(a.type==='propose-gift'?'pending':'completed')||a.type==='propose-gift'&&(e.record.personId!==a.targetId||e.record.quantity!==a.quantity||e.record.dueDay!==a.dueDay)||a.type==='fulfill-gift'&&(e.commitmentId!==a.commitmentId||!same(e.proof.delivery,c.delivery)))throw Error('受控赠物原提议或实际交付');
   if(!proof.gift||!same(e.proof.participants,proof.gift.participants)||!same(a.type==='propose-gift'?e.proof.item:e.proof.itemBefore,proof.gift.item)||a.type==='fulfill-gift'&&(proof.gift.commitment?.status!=='accepted'||!same(e.record.events.slice(0,-1),proof.gift.commitment.events)))throw Error('赠物施令前实际基准');
   if(a.type==='propose-gift'&&!same(e.proof.presentation,proof.gift.presentation))throw Error('赠物实际出示与原命令条件不符');
   const history=table(s).events.filter(v=>v.orderId===r.id);
   if(e.at!==r.issuedAt||e.at!==r.resolvedAt||!(history[0]?.order<e.order)||r.status!=='executing'&&!(e.order<history.at(-1)?.order))throw Error('赠物必须发生在本次命令执行之间');
  }
  if(['travel','resume-travel'].includes(a.type)){
   const trip=s.世界.longActions?.find(t=>t.id===c.longActionId),step=trip?.steps.find(st=>st.sourceId===r.executionId);
   if(!trip||!step||trip.ownerId!==r.executorId||step.fieldOrderRef?.orderId!==r.id||step.fieldOrderRef.executionId!==r.executionId||step.companionIds.length||c.destinationId!==trip.destinationId||a.type==='travel'&&a.destinationId!==trip.destinationId||a.type==='resume-travel'&&a.actionId!==trip.id||a.mode!==undefined&&a.mode!==c.mode||!same(c.legs,step.legs)||c.minutes!==step.minutes||c.costGold!==step.costGold||c.current!==step.to||c.completed!==(step.status==='completed')||c.interrupted!==(step.status==='interrupted'))throw Error('实际旅行来源与进度');
   if(r.issuedAt!==people.now({世界:{时间:step.before}})||r.resolvedAt!==people.now({世界:{时间:step.after}})||!same(c.before,step.before)||!same(c.after,step.after)||r.source.持续.expiresAt!==undefined&&(r.source.持续.expiresAt<r.resolvedAt||r.source.持续.expiresAt===r.resolvedAt&&c.completed)||s.人物.列表[r.issuerId].life.death&&(s.人物.列表[r.issuerId].life.death.at<r.resolvedAt||s.人物.列表[r.issuerId].life.death.at===r.resolvedAt&&c.completed))throw Error('本次原控制来源未覆盖实际旅行时间');
  }
  if(a.type==='unequip'&&c.itemId!==proof.slots[a.slot])throw Error('原装备物品');
  if(a.type==='switch-martial-soul'&&c.previousSoulId!==proof.soulId)throw Error('原激活武魂');
  if(a.type==='stop-maintenance'){
   const m=proof.maintenance,e=c.maintenance;
   if(!m||m.id!==a.maintenanceSourceId||m.actorId!==r.executorId||!e||e.sourceId!==m.id||e.actorId!==m.actorId||e.skillId!==m.skillId||e.battleId!==m.battleId||e.event!=='stopped'||e.reason!=='manual'||e.at!==r.issuedAt)throw Error('实际维持来源');
   if(e.id!==`${m.id}:stopped:${m.payments??0}`||s.扩展.abilityMaintenance?.[m.id]||Object.values(s.状态实例.列表).some(st=>st.来源?.结算单ID===m.id))throw Error('已停止来源不能重新维持');
  }
  if(!['use-field-ability','use-restorative-item','use-prebattle-pill'].includes(a.type))return;
  if(!k||!abilities.verify(k).pass||k.持有者单位ID&&k.持有者单位ID!==r.executorId||a.type==='use-field-ability'&&k.id!==a.skillId||a.type!=='use-field-ability'&&(k.sourceItemId!==a.itemId||k.sourceKind!=='consumable'))throw Error('实际能力合同');
  const p=c.payment,q=r.paymentQuote;
  const resources=proof.costProfile?.资源?.魂力;
  if(!p||!q||!resources||proof.costProfile.id!==r.executorId||[proof.resources?.soulPower,proof.resources?.health,resources.当前,resources.最大,resources.锁定,q.activationLock,...Object.values(q.totals??{}),...Object.values(p.resources?.before??{}),...Object.values(p.resources?.after??{})].some(n=>!Number.isSafeInteger(n)||n<0)||proof.resources.health<1||resources.当前!==proof.resources.soulPower||resources.当前>resources.最大||resources.当前-resources.锁定<q.totals.soulPower+q.activationLock)throw Error('施放前资源基准无效');
  if(!p||!q||p.actorId!==r.executorId||p.skillId!==k.id||p.operationId!==r.executionId||p.sourceId!==(k.usageKey??k.usageRules?.worldUsageGroup??k.id)||!same(p.contract,combat.fieldCostContract(proof.costProfile,k,a.modeId)))throw Error('能力费用合同');
  const expected={...clone(q),operationId:r.executionId,items:q.items.map(i=>({...i,quantityAfter:i.quantityBefore-i.quantity})),resources:{before:proof.resources,after:{soulPower:proof.resources.soulPower-q.totals.soulPower,health:proof.resources.health-q.totals.health}}};
  if(!same(p,expected))throw Error('实际付款与施放前报价不符');
  const totals={soulPower:0,health:0,lifespan:0};for(const fee of p.contract.costs)if(fee.kind!=='item')totals[fee.kind]+=fee.amount;
  if(!same(totals,p.totals)||p.resources.after.soulPower<0||p.resources.after.health<1)throw Error('费用合计或资源扣款');
  const stock=new Map((r.paidItems??[]).map(i=>[i.id,i])),costs=p.contract.costs.filter(c=>c.kind==='item');
  if(['consumable','hidden-weapon'].includes(k.sourceKind))costs.push({kind:'item',itemId:k.sourceItemId,quantity:1});
  const remaining=new Map();for(const i of p.items){const item=stock.get(i.itemId);if(!item||item.ownerEntityId!==r.executorId||item.quantity!==i.quantityBefore||!Number.isSafeInteger(i.quantity)||i.quantity<1||i.quantityAfter<0||remaining.has(i.itemId))throw Error('实际耗材来源');remaining.set(i.itemId,i.quantity);}
  for(const cost of costs.sort((a,b)=>Number(!!b.itemId)-Number(!!a.itemId))){let needed=cost.quantity;for(const [id,count] of remaining){const item=stock.get(id);if(cost.itemId?id!==cost.itemId:item.templateId!==cost.templateId)continue;const paid=Math.min(needed,count);needed-=paid;remaining.set(id,count-paid);}if(needed)throw Error('物品费用不符');}
  if([...remaining.values()].some(n=>n!==0)||stock.size!==p.items.length)throw Error('额外耗材');
  const life=s.人物.列表[r.executorId].life.adjustments.find(e=>e.id===`${r.executionId}:lifespan`);
  if(p.totals.lifespan?!life||life.kind!=='cost'||life.minutes!==p.totals.lifespan||life.sourceId!==p.sourceId||life.at!==r.issuedAt||life.sacrificial!==p.sacrificial:!!life)throw Error('实际寿命付款');
  const usage=r.usageBefore,rules=abilities.skillUsageRules(k),day=Math.floor(r.issuedAt/1440);
  if(!usage||!usage.available||!same(usage.rules,rules)||usage.quotaOwnerId!==r.executorId)throw Error('施放前额度来源');
  if(rules.dailyLimit||rules.worldCooldownDays){
   const u=c.usageLedger;
   if(!u||u.quotaOwnerId!==usage.quotaOwnerId||!same(u.rules,rules)||u.dailyUsed!==usage.dailyUsed+1||u.dailyEntry?.count!==u.dailyUsed||u.dailyEntry?.day!==day||u.dailyEntry.lastUsedDay!==day||u.dailyEntry.dailyLimit!==rules.dailyLimit||u.dailyEntry.worldCooldownDays!==rules.worldCooldownDays)throw Error('实际使用额度');
  }else if(c.usageLedger!==null)throw Error('场外使用不应消耗每场额度');
  if(['consumable','hidden-weapon'].includes(k.sourceKind)){const i=p.items.find(i=>i.itemId===k.sourceItemId);if(!i||c.sourceItem?.itemId!==i.itemId||c.sourceItem.quantityBefore!==i.quantityBefore||c.sourceItem.quantity!==i.quantityAfter)throw Error('消耗品实际扣除');}
  const targetId=a.type==='use-prebattle-pill'?r.executorId:a.targetId??r.executorId;
  if(!Array.isArray(c.targets)||!c.targets.length||c.targets.some(t=>t.targetId!==targetId||t.skillId!==k.id))throw Error('实际效果目标');
 }
 function save(s,r,kind,sourceId){const d=table(s,true),prior=d.orders.find(o=>o.id===r.id),previousHash=prior?.hash??null;custody.stamp(r);if(prior)Object.assign(prior,r);else d.orders.push(r);d.events.push(custody.stamp({id:`${r.id}:${d.events.filter(e=>e.orderId===r.id).length}`,orderId:r.id,kind,sourceId,at:now(s),order:people.nextEventOrder(s),previousHash,record:clone(r)}));}
 function assertActors(s,issuerId,executorId,domain){
  if(issuerId===executorId)throw Error('控制命令须指定另一位实际人物');
  actions.resolve(s,{actorId:issuerId,battleId:null});influence.withCommand(s,issuerId,executorId,domain,()=>actions.resolve(s,{actorId:executorId,battleId:null}));
  if([issuerId,executorId].some(id=>controls.active(s,id).some(v=>['status.sleep','status.stun'].includes(v.模板ID))))throw Error('下令者或执行者当前无法清醒行动');
  const a=influence.authority(s,issuerId,executorId,domain);if(!a.available)throw Error(a.reason);return a;
 }
 function allowed(s,context,executorId){
  if(!context)return false;if(!contexts.has(context))throw Error('场外执行权限必须来自引擎当前命令');
  const r=table(s).orders.find(o=>o.id===context.orderId);if(!r||r.status!=='executing'||r.executorId!==executorId||context.intentHash!==abilities.hash(r.action)||context.executionId!==r.executionId)throw Error('场外执行权限与实际命令不符');
  const a=assertActors(s,r.issuerId,r.executorId,r.domain);if(a.sourceStatusId!==r.sourceStatusId)throw Error('本次命令的原控制来源已经失效');return true;
 }
 function assertIntent(s,context,intent){
  const executorId=context.executorId;if(!allowed(s,context,executorId))throw Error('场外执行权限缺失');
  const {id,actorId,entityId,...action}=intent;if(id!==context.executionId||actorId!==executorId||entityId!==undefined&&entityId!==executorId||abilities.hash(canonical(action))!==context.intentHash)throw Error('不能替换已授权的实际行动');
 }
 function authoritySnapshot(s,r){
  const sources=controls.active(s,r.executorId).filter(st=>influence.CONTROL_IDS.includes(st.模板ID)),ids=new Set([r.executorId,r.issuerId,...sources.map(st=>st.来源.单位ID)]),pickIds=rows=>Object.fromEntries(Object.entries(rows??{}).filter(([id])=>ids.has(id))),statuses=Object.fromEntries(Object.entries(s.状态实例.列表).filter(([,st])=>ids.has(st.目标单位ID)&&[...controls.EFFECT_IDS,'status.sleep','status.stun'].includes(st.模板ID))),itemIds=new Set(Object.values(statuses).map(st=>st.来源?.物品ID)),battle=b=>b?{id:b.id,状态:b.状态,扩展:{成员:pickIds(b.扩展?.成员)}}:null;
  const current=s.远征?.当前;
  return clone({角色:{主控单位ID:s.角色.主控单位ID},世界:{时间:s.世界.时间,npcPlans:(s.世界.npcPlans??[]).filter(p=>ids.has(p.ownerId)),rescues:{encounters:(s.世界.rescues?.encounters??[]).filter(e=>e.personIds.some(id=>ids.has(id)))},backgroundBattles:Object.fromEntries(Object.entries(s.世界.backgroundBattles??{}).map(([id,b])=>[id,battle(b)]))},人物:{列表:Object.fromEntries(Object.entries(pickIds(s.人物.列表)).map(([id,p])=>[id,{id:p.id,status:p.status,combatantId:p.combatantId,locationId:p.locationId,spaceId:p.spaceId,transit:p.transit,life:p.life}]))},战斗单位:{列表:Object.fromEntries(Object.entries(pickIds(s.战斗单位.列表)).map(([id,u])=>[id,{id:u.id,存活状态:u.存活状态,资源:{生命:u.资源.生命},扩展:{武魂战斗修正:{来源武魂ID:u.扩展?.武魂战斗修正?.来源武魂ID}}}]))},状态实例:{列表:statuses},成长:{列表:Object.fromEntries(Object.entries(pickIds(s.成长.列表)).map(([id,g])=>[id,{魂力等级:g.魂力等级,武魂ID列表:g.武魂ID列表,激活武魂ID:g.激活武魂ID}]))},物品:{实例:Object.fromEntries(Object.entries(s.物品.实例).filter(([id])=>itemIds.has(id)))},战斗:battle(s.战斗),远征:{当前:current?{id:current.id,status:current.status,currentNodeId:current.currentNodeId,companions:current.companions}:null}});
 }
 function travelInterruption(s,ref,actionId){
  if(!ref)return null;const r=table(s).orders.find(o=>o.id===ref.orderId);
  if(!r||r.status!=='executing'||r.executionId!==ref.executionId||r.domain!=='移动')throw Error('旅行缺少本次控制命令');
  const proof=authoritySnapshot(s,r);let reason='';try{const a=assertActors(proof,r.issuerId,r.executorId,r.domain);if(a.sourceStatusId!==r.sourceStatusId)reason='原控制来源已经失效';}catch(error){reason=error.message;}
  return reason?{id:`field-control:${actionId}:${r.id}:${now(s)}`,kind:'field-control-ended',actionId,orderId:r.id,personId:r.executorId,sourceId:r.sourceStatusId,at:now(s),proof,reason:`本次移动命令已失效：${reason}`} :null;
 }
 function validateTravelInterruption(s,trip,e){
  const r=table(s).orders.find(o=>o.id===e.orderId),step=trip.steps.find(st=>st.sourceId===e.decisionSourceId&&st.status==='interrupted');
  if(!r||!step||r.domain!=='移动'||r.executorId!==trip.ownerId||step.fieldOrderRef?.orderId!==r.id||r.sourceStatusId!==e.sourceId||e.personId!==r.executorId||e.actionId!==trip.id||e.id!==`field-control:${trip.id}:${r.id}:${e.at}`||people.now({世界:{时间:step.after}})!==e.at||people.now(e.proof)!==e.at||r.resolvedAt!==e.at)throw Error('场外命令中断来源');
  const {time,decisionSourceId,...body}=e;if(!same(body,r.receipt?.interruption)||!same(time,step.after)||decisionSourceId!==r.executionId)throw Error('控制中断回执与路段不符');
  if(people.validate(e.proof).length||[r.issuerId,r.executorId].some(id=>!e.proof.人物?.列表?.[id]||!e.proof.战斗单位?.列表?.[id]||!Number.isSafeInteger(e.proof.战斗单位.列表[id].资源?.生命?.当前)))throw Error('控制中断缺少实际人物基准');
  for(const [id,p] of Object.entries(e.proof.人物.列表)){const actual=s.人物.列表[id];if(!actual||p.life.death&&!same(p.life.death,actual.life.death)||p.life.adjustments.some(v=>!actual.life.adjustments.some(a=>same(a,v))))throw Error('控制中断人物历史无效');}
  for(const st of Object.values(e.proof.状态实例.列表))if(!combat.validateControlSourceProof(st,st.目标单位ID,e.at))throw Error('控制中断状态来源无效');
  let valid=false;try{const a=assertActors(e.proof,r.issuerId,r.executorId,r.domain);valid=a.sourceStatusId===r.sourceStatusId;}catch{}if(valid)throw Error('仍有效的控制不能伪造来源中断');
 }
 function receipt(r){return {type:'field-control-order',orderId:r.id,actorId:r.issuerId,executorId:r.executorId,domain:r.domain,action:clone(r.action),status:r.status,reason:r.reason??'',settlement:r.receipt?clone(r.receipt):null,summary:r.status==='executed'?'对方已按有效控制命令执行该项行动，使用自己的实际资源与物品。':r.status==='interrupted'?`行动在实际进度中断：${r.reason}`:`控制命令未能执行：${r.reason}`};}
 function observedTravel(s,viewerId,trip){return !!trip&&(trip.ownerId===viewerId||trip.steps.some(st=>st.companionIds.includes(viewerId)||st.fieldOrderRef&&table(s).orders.some(r=>r.id===st.fieldOrderRef.orderId&&r.issuerId===viewerId)));}
 function authorize(s,q,h){
  const action=canonical(q.action),issuerId=q.actorId,executorId=q.executorId;
  const skill=actionSkill(s,action),domain=domainOf(action,skill),a=assertActors(s,issuerId,executorId,domain);
  if(action.type==='travel'&&!h.locationKnown?.(issuerId,action.destinationId))throw Error('下令者尚不知道目的地');
  if(action.type==='resume-travel'){const trip=(s.世界.longActions??[]).find(t=>t.id===action.actionId&&t.ownerId===executorId&&t.kind==='travel');if(!observedTravel(s,issuerId,trip)||!h.locationKnown?.(issuerId,trip.destinationId))throw Error('下令者尚不知道这段行程');}
  if(table(s).orders.some(r=>r.executorId===executorId&&['executing','pending','travelling'].includes(r.status)))throw Error('执行者尚有未结束的控制命令');
  return {action,issuerId,executorId,skill,domain,authority:a};
 }
 // A query uses the same transient engine permission as execution, on a private
 // clone only. It does not issue an event, reserve an order, pay, or settle.
 function quote(s,q,h){
  const auth=authorize(s,q,h),{action,issuerId,executorId,domain}=auth,draft=clone(s);
  const sourceId=`preview:field-control:${s.系统.revision}`,id=`field-order:${sourceId}`,executionId=`${sourceId}:execute`;
  if(table(draft).orders.some(r=>r.id===id)||draft.世界.processedTransactions[executionId])throw Error('查询编号已被实际行动占用');
  table(draft,true).orders.push({id,sourceId,issuerId,executorId,domain,action,sourceStatusId:auth.authority.sourceStatusId,status:'executing',executionId});
  const context=Object.freeze({orderId:id,executorId,intentHash:abilities.hash(action),executionId});contexts.add(context);
  try{
   allowed(draft,context,executorId);
   const intent={...action,id:executionId,actorId:executorId,...(['equip','unequip','switch-martial-soul'].includes(action.type)?{entityId:executorId}:{})};
   const inner=h.preview(draft,intent,context),available=inner.available!==false&&inner.affordable!==false;
   return {available,issuerId,executorId,domain,sourceStatusId:auth.authority.sourceStatusId,action:clone(action),quote:clone(inner),reason:available?'':inner.reason??'执行者当前无法承担这项行动'};
  }finally{contexts.delete(context);}
 }
 function execute(s,q,sourceId,h){
  const action=canonical(q.action),id=`field-order:${sourceId}`,prior=table(s).orders.find(o=>o.id===id),issuerId=q.actorId,executorId=q.executorId;
  if(prior){if(prior.issuerId!==issuerId||prior.executorId!==executorId||!same(prior.action,action))throw Error('命令编号不能用于另一项行动');return {state:s,receipt:receipt(prior),idempotent:true};}
  if(s.世界.processedTransactions[`${sourceId}:execute`])throw Error('命令执行事务编号已被其他行动占用');
  const {skill,domain,authority:a}=authorize(s,q,h);
  const r={id,sourceId,issuerId,executorId,domain,action,sourceStatusId:a.sourceStatusId,source:clone(s.状态实例.列表[a.sourceStatusId]),actionContract:clone(skill?globalThis.SoulEffectCompiler.currentSoulRingCastSkill(s,s.战斗单位.列表[executorId],skill):skill),before:beforeProof(s,executorId,action),usageBefore:skill?clone(combat.skillUsageAvailability(s,s.战斗单位.列表[executorId],skill,true)):null,issuedAt:now(s),executionId:`${sourceId}:execute`,status:'executing'};
  save(s,r,'issued',sourceId);
  const context=Object.freeze({orderId:id,executorId,intentHash:abilities.hash(action),executionId:r.executionId});contexts.add(context);
  try{
   const draft=clone(s);allowed(draft,context,executorId);
   if(skill){r.paymentQuote=clone(combat.quoteSkillUse(draft,draft.战斗单位.列表[executorId],skill,{fieldUse:true,modeId:action.modeId,...(action.type==='use-field-ability'?{branchIds:globalThis.SoulCreationCore.normalizeScope(skill,action).branchIds,nodeIds:abilities.selectFieldBranches(skill,action.branchIds).flatMap(b=>b.nodes.map(n=>n.id))}:{}),targetIds:[action.targetId??executorId]}));r.paidItems=r.paymentQuote.items.map(f=>clone(draft.物品.实例[f.itemId]));}
   const result=h.settle(draft,{...action,id:r.executionId,actorId:executorId,...(['equip','unequip','switch-martial-soul'].includes(action.type)?{entityId:executorId}:{})},context);
   if(result.idempotent)throw Error('命令执行事务编号不能复用旧行动');
   r.receipt=clone(result.receipt);r.resolvedAt=now(result.state);validateSettlement(result.state,r);
   r.status=r.receipt.interrupted?'interrupted':'executed';r.resolvedAt=now(result.state);r.reason=r.receipt.interruption?.reason??'';save(result.state,r,r.status,r.executionId);return {state:result.state,receipt:receipt(r),idempotent:false};
  }catch(error){delete r.receipt;delete r.paymentQuote;delete r.paidItems;r.status='failed';r.reason=error.message;r.resolvedAt=now(s);save(s,r,'failed',r.executionId);return {state:s,receipt:receipt(r),idempotent:false};}
  finally{contexts.delete(context);}
 }
 function facts(s,viewerId){const masks=Object.values(s.扩展?.cognitionChanges??{}).filter(c=>c.targetId===viewerId&&c.direction==='屏蔽既往经历'&&(c.retention==='保留'||s.状态实例?.列表?.[c.sourceStatusId]?.状态==='生效'));return table(s).orders.filter(r=>[r.issuerId,r.executorId].includes(viewerId)&&masks.every(c=>table(s).events.find(e=>e.orderId===r.id&&e.kind==='issued')?.order>c.appliedOrder)).map(r=>({id:r.id,issuerId:r.issuerId,executorId:r.executorId,executorName:s.人物.列表[r.executorId]?.name??r.executorId,domain:r.domain,action:clone(r.action),status:r.status,reason:r.reason??'',issuedAt:r.issuedAt}));}
 function abilityUses(s,actorId,skill){
  const all=abilities.fieldBranches(skill.effectGraph,{indivisible:!!skill.medicine||skill.sourceKind==='consumable'}),groups=skill.medicine||skill.sourceKind==='consumable'?[all]:all.map(b=>[b]),result=[];
  for(const group of groups){if(!group.length)continue;const nodes=group.flatMap(b=>b.nodes),itemNode=nodes.find(n=>['payload.repair_item','payload.fabricate'].includes(n.effectId)),choices=itemNode?globalThis.SoulCreationCore.itemChoices(s,actorId,actorId,itemNode):[null];
   for(const choice of choices){const scope={branchIds:group.map(b=>b.id),...(choice?.targetItemId?{targetItemId:choice.targetItemId}:choice?.recipeId?{recipeId:choice.recipeId}:choice?.blueprintId?{blueprintId:choice.blueprintId}:{}),...(itemNode?{materials:Object.values(globalThis.SoulExpeditionEngine.personMaterials(s,actorId)).map(m=>({fingerprint:m.fingerprint,quantity:m.quantity})),...(itemNode.effectId==='payload.fabricate'?{quantity:1}:{})}:{})};
    const q=combat.previewFieldAbility(s,actorId,skill.id,actorId,undefined,scope),name=group.map(b=>b.label||b.nodes.filter(n=>!['release','targeting','check'].includes(n.family)).map(n=>globalThis.SoulEffectCompiler.EFFECT_REGISTRY[n.effectId].displayName).join('、')).join('、');result.push({id:abilities.hash(scope),name:name+(choice?' · '+choice.name:''),scope,available:q.available,reason:q.reason??'',cost:q.payment?.totals.soulPower??null,materials:(q.creationQuotes??[]).flatMap(v=>v.materials.allocations.map(a=>({name:globalThis.SoulExpeditionEngine.personMaterials(s,actorId)[a.fingerprint]?.displayName,quantity:a.quantity}))) });
   }
  }return result;
 }
 function options(s,viewerId,h={}){const remembered=new Set(facts(s,viewerId).map(o=>o.id));return Object.values(s.人物.列表).filter(p=>p.id!==viewerId&&p.status!=='dead'&&(!h.selectedExecutorId||p.id===h.selectedExecutorId)).flatMap(p=>{
  const local=actions.colocated(s,viewerId,p.id),domains=['战斗','物品','移动','言语'].filter(d=>(local||d==='移动')&&influence.authority(s,viewerId,p.id,d).available);if(!domains.length)return [];
  if(h.summaryOnly)return [{executorId:p.id,name:p.name,domains,local}];
  const modes=skill=>(skill?.castModes??[]).map(m=>({id:m.id,name:m.name??m.id}));
  return [{executorId:p.id,name:p.name,domains,local,
   giftPromises:table(s).orders.filter(o=>o.issuerId===viewerId&&o.executorId===p.id&&o.status==='executed'&&o.action.type==='propose-gift'&&remembered.has(o.id)).map(o=>({id:o.receipt.commitmentId,name:`${o.receipt.commitment.itemName} ×${o.action.quantity} → ${s.人物.列表[o.action.targetId]?.name??o.action.targetId}`})),
   destinations:h.includeDestinations!==false&&domains.includes('移动')?h.destinations?.(p.id)??[]:[],trips:(s.世界.longActions??[]).filter(a=>domains.includes('移动')&&a.ownerId===p.id&&a.kind==='travel'&&a.status==='interrupted'&&observedTravel(s,viewerId,a)&&h.locationKnown?.(viewerId,a.destinationId)).map(a=>({id:a.id,destinationId:a.destinationId,name:h.locationName?.(a.destinationId)??a.destinationId})),
   items:local?Object.values(s.物品.实例).filter(i=>i.ownerEntityId===p.id&&i.containerId===p.inventoryContainerId&&!i.attachment).map(i=>({id:i.id,name:i.name,type:i.type,quantity:i.quantity,modes:modes(i.payload?.activeSkill)})):[],
   abilities:local?(s.战斗单位.列表[p.id]?.能力.技能ID??[]).map(id=>s.技能.列表[id]).filter(skill=>skill&&abilities.fieldControlGraph(skill.effectGraph)&&domains.includes(domainOf({type:'use-field-ability'},skill))).map(skill=>({domain:domainOf({type:'use-field-ability'},skill),id:skill.id,name:skill.name??skill.id,modes:modes(skill),uses:abilityUses(s,p.id,skill)})):[],
   souls:local?(s.成长.列表[p.id]?.武魂ID列表??[]).map(id=>({id,name:s.武魂.列表[id].名称})):[],slots:local?clone(s.装备.配置[p.id]?.slots??{}):{},maintenance:local?Object.values(s.扩展.abilityMaintenance??{}).filter(e=>e.actorId===p.id).map(e=>({id:e.id,name:s.技能.列表[e.skillId]?.name??e.skillId})):[]}];
 });}
 function validate(s){
  const d=s.世界.fieldControl;if(!d)return [];if(d.version!==1||!Array.isArray(d.orders)||!Array.isArray(d.events))return ['场外控制账本无效'];const errors=[],ids=new Set(),latest=new Map(),counts=new Map();
  for(const e of d.events){const p=latest.get(e.orderId),index=counts.get(e.orderId)??0;if(!stamped(e)||!stamped(e.record)||e.id!==`${e.orderId}:${index}`||e.orderId!==e.record.id||e.previousHash!==(p?.record.hash??null)||!Number.isSafeInteger(e.order)||e.order>s.扩展.personEventSequence||p&&e.order<=p.order||!Number.isSafeInteger(e.at)||e.at>now(s)||p&&e.at<p.at||!p&&e.kind!=='issued')errors.push('场外控制事件链无效');latest.set(e.orderId,e);counts.set(e.orderId,index+1);}
  for(const r of d.orders)try{
   const events=d.events.filter(e=>e.orderId===r.id),first=events[0],last=events.at(-1);canonical(r.action);
   if(!stamped(r)||ids.has(r.id)||!same(last?.record,r)||events.length!==2||r.id!==`field-order:${r.sourceId}`||!s.人物.列表[r.issuerId]||!s.人物.列表[r.executorId]||r.issuerId===r.executorId||r.domain!==domainOf(r.action,r.actionContract)||r.executionId!==`${r.sourceId}:execute`||r.issuedAt!==first.at||first.record.status!=='executing'||first.sourceId!==r.sourceId||!['executed','failed','interrupted'].includes(r.status)||last.kind!==r.status||last.sourceId!==r.executionId||r.resolvedAt!==last.at)throw Error('行动来源');ids.add(r.id);
   if(['id','sourceId','issuerId','executorId','domain','action','sourceStatusId','source','actionContract','before','usageBefore','issuedAt','executionId'].some(k=>!same(first.record[k],r[k])))throw Error('命令被替换');
   if(!combat.validateControlSourceProof(r.source,r.executorId,r.issuedAt)||!influence.CONTROL_IDS.includes(r.source.模板ID)||r.source.id!==r.sourceStatusId||r.source.来源.单位ID!==r.issuerId||!['全部',r.domain].includes(r.source.快照.参数.命令域))throw Error('控制来源');
   if(r.status==='failed'){if(typeof r.reason!=='string'||!r.reason||r.receipt)throw Error('失败结果');}
   else{if(r.status!==(r.receipt?.interrupted?'interrupted':'executed'))throw Error('实际中断结果');validateSettlement(s,r);const live=s.世界.processedTransactions[r.executionId];if(live&&!same(live,r.receipt))throw Error('交易回执被替换');}
  }catch(error){errors.push(`场外控制${r.id}无效：${error.message}`);}
  for(const id of latest.keys())if(!ids.has(id))errors.push('场外命令历史缺少当前记录');return errors;
 }
 return Object.freeze({ACTIONS,INTENTS,table,canonical,actionDomain,allowed,executing,assertIntent,quote,execute,travelInterruption,validateTravelInterruption,facts,options,validate});
});
