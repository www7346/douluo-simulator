(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.SoulDeviceOperations=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION=1;
  const EFFECT_TYPES=Object.freeze({'payload.unlock':'device.unlock','payload.suppress_lock':'device.suppress-lock','payload.rule_break':'device.break-rule','payload.analyze_lock':'device.analyze-lock','payload.create_key':'device.create-key','payload.arcane_lock':'device.arcane-lock'});
  const copy=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
  const hash=v=>globalThis.SoulAbilityContract.hash(v);
  const locks=()=>globalThis.SoulDeviceLocks;
  const controls=()=>globalThis.SoulControlCore;
  const host=()=>globalThis.SoulHostCore;
  const now=s=>globalThis.SoulPersonCore.now(s);
  // Only the normal ability execution path can create one of these tickets.
  // World input contains IDs; it can never manufacture a ticket or node params.
  const tickets=new WeakMap();
  const ruleBreakBases=new WeakMap();
  function ownSkill(s,actorId,skillId){
    const u=s.战斗单位?.列表?.[actorId],skill=s.技能?.列表?.[skillId];
    if(!u?.能力?.技能ID?.includes(skillId)||!skill||skill.持有者单位ID&&skill.持有者单位ID!==actorId||globalThis.SoulAbilityContract.verify(skill).pass!==true)throw Error('能力必须来自行动者实际持有的冻结技能');
    return skill;
  }
  function nodeOf(s,actorId,skillId,nodeId,type){const skill=ownSkill(s,actorId,skillId),nodes=(skill.effectGraph?.nodes??[]).filter(n=>EFFECT_TYPES[n.effectId]===type&&(!nodeId||n.id===nodeId));if(nodes.length!==1)throw Error('须选择该实际技能中的唯一器具效果节点');return {skill,node:nodes[0]};}
  function contact(s,actorId,item,{battleId=null,requirements=['gesture'],containmentAction}={}){
    const carrier=host().carrier(s,item),targetId=carrier?.personId??item.ownerEntityId;
    const context=globalThis.SoulActionContext.resolve(s,{actorId,battleId,requirements,targetIds:targetId&&targetId!==actorId?[targetId]:[],...(containmentAction?{containmentAction}:{})});
    const container=s.容器?.列表?.[item.containerId];
    if(item.quantity!==1||item.durability<=0||!container?.itemIds?.includes(item.id)||Number(s.世界?.时间?.day??0)>Number(item.payload?.expiresAtDay??Number.MAX_SAFE_INTEGER))throw Error('操作对象不是完整、有效、实际在场的器具');
    if(!carrier&&(container.ownerEntityId!==actorId||item.containerId!==s.人物?.列表?.[actorId]?.inventoryContainerId))throw Error('未佩戴器具须在行动者实际随身容器内');
    if(battleId&&targetId&&targetId!==actorId&&globalThis.SoulCombatEngine.combatDistance(s.战斗单位.列表[actorId],s.战斗单位.列表[targetId])>0)throw Error('须处于器具佩戴者的接触距离');
    return context;
  }
  function modifier(s,actorId,attribute='悟性'){const actor=s.战斗单位.列表[actorId];return globalThis.SoulCombatEngine.attributeModifier(s,actor,attribute)+Number(actor.派生?.熟练加值??0);}
  function rank(s,actorId){return Math.min(9,Math.max(1,Math.ceil(Number(s.成长?.列表?.[actorId]?.魂力等级??s.战斗单位?.列表?.[actorId]?.派生?.有效等级??1)/10)));}
  function abilityQuote(s,request,battleId){
    const selected=nodeOf(s,request.actorId,request.skillId,request.nodeId,request.type),skill=selected.skill;
    const branchIds=branchIdsFor(skill,selected.node.id),q=globalThis.SoulCombatEngine.quoteSkillUse(s,s.战斗单位.列表[request.actorId],skill,{fieldUse:!battleId,branchIds});
    return {...selected,quote:q};
  }
  function branchIdsFor(skill,nodeId){return globalThis.SoulEffectCompiler.graphBranches(skill.effectGraph).filter(branch=>branch.nodes.some(node=>node.id===nodeId)).map(branch=>branch.id);}
  function quote(s,request,{battleId=null,executing=false}={}){
    const q={available:false,reason:'',type:request.type,actorId:request.actorId,itemId:request.itemId,lockId:null,method:null,minutes:battleId?0:10,actionCost:battleId?'main':null,soulPowerCost:0,dc:null,modifier:null,requiredRank:null,consequence:null,requires:{key:false,skill:false,knowledge:false},targets:[]};
    try{
      const item=s.物品?.实例?.[request.itemId];if(!item)throw Error('器具不存在');
      const d=locks().definition(s,item,request.lockId??null),isRule=request.type==='device.break-rule';
      if(!d&&!isRule)throw Error('器具没有声明可操作的实体锁');
      if(d&&request.lockId!==undefined&&request.lockId!==d.lockId)throw Error('锁身份与实际器具不符');
      if(!['device.lock','device.unlock','device.suppress-lock','device.break-rule','device.analyze-lock','device.create-key','device.arcane-lock'].includes(request.type))throw Error('器具操作未登记');
      if(d?.expired)throw Error('这一临时锁效已到期');
      const usingSkill=!!request.skillId;
      contact(s,request.actorId,item,{battleId,requirements:usingSkill?[]:['gesture']});
      q.lockId=d?.lockId??null;q.targets=[host().carrier(s,item)?.personId??request.actorId];
      if(request.type==='device.lock'){
        if(usingSkill||request.keyItemId)throw Error('复锁须由器具实际控制者执行');
        if(!locks().actorCanControl(s,item,request.actorId,d.lockId))throw Error('只有非被锁穿戴者的实际控制者能复锁');
        if(d.locked)throw Error('实体锁已经闭合');
        q.method='controller';q.minutes=battleId?0:1;q.consequence='close-lock';
      }else if(request.type==='device.unlock'&&!usingSkill){
        if(!d.locked)throw Error('实体锁已经打开');
        if(request.keyItemId){if(!locks().keyMatches(s,s.物品?.实例?.[request.keyItemId],item,request.actorId,d.lockId))throw Error('须实际持有与该锁实例或图纸匹配的实体钥匙');q.method='key';q.requires.key=true;}
        else{if(!locks().actorCanControl(s,item,request.actorId,d.lockId))throw Error('被锁穿戴者须使用实际匹配钥匙或合法解锁能力');q.method='controller';}
        q.minutes=battleId?0:1;q.consequence='open-lock';
      }else{
        if(!usingSkill)throw Error('该操作必须选择实际持有且可执行的正式能力');
        const selected=executing?nodeOf(s,request.actorId,request.skillId,request.nodeId,request.type):abilityQuote(s,request,battleId),p=selected.node.params??{};
        q.method='ability';q.minutes=battleId?0:1;q.requires.skill=true;q.skillId=selected.skill.id;q.nodeId=selected.node.id;q.effectId=selected.node.effectId;
        q.branchIds=branchIdsFor(selected.skill,selected.node.id);q.soulPowerCost=executing?0:Number(selected.quote?.totals?.soulPower??0);
        q.requiredRank=d?.definition.rank??null;q.modifier=modifier(s,request.actorId)+Number(p.强度??1)*2;q.dc=d?.definition.dc??null;
        if(d&&Number(p.最高品级??1)<d.definition.rank)throw Error('能力支持品级低于实体锁');
        if(request.type==='device.unlock'){
          if(!d.locked)throw Error('实体锁已经打开');if(d.definition.kind==='rule')throw Error('规则锁须以明确压制或对应钥匙处理，普通解锁能力不直接开启');q.consequence='open-lock';
        }else if(request.type==='device.suppress-lock'){
          if(d.definition.kind==='mechanical')throw Error('纯机械锁没有可暂时抑制的锁效');if(!d.locked)throw Error('实体锁已经打开');q.consequence='suppress-lock';q.durationMinutes=Number(p.持续分钟??1);
        }else if(request.type==='device.analyze-lock'){q.consequence='learn-lock';}
        else if(request.type==='device.create-key'){
          const k=locks().knowledge(s,request.actorId,request.knowledgeId);if(!k||hash(k.keyIdentity)!==hash(locks().keyIdentity(s,item,d.lockId)))throw Error('须持有通过真实分析取得的对应锁知识');
          q.requires.knowledge=true;q.keyValue=20+d.definition.rank*20+(d.definition.dc-10)*2;
          if(q.keyValue>Number(p.价值上限??20))throw Error('钥匙价值超过本能力的永久造物上限');q.keyBlueprint=locks().keyBlueprint(s,request.actorId,k.id);q.materials=globalThis.SoulCreationCore.materialPlan(s,request.actorId,q.keyBlueprint.requiredValue,q.keyBlueprint.bridgeClauses,request.materials);q.consequence='create-key';q.dc=null;q.modifier=null;
        }else if(request.type==='device.arcane-lock'){
          const sourceOrigin=globalThis.SoulAbilityExchange.origin(selected.skill);
          if(locks().table(s).events.some(e=>e.type==='arcane-applied'&&e.itemId===item.id&&e.until>now(s)&&e.actorId===request.actorId&&globalThis.SoulAbilityExchange.origin(e.basis.skill)===sourceOrigin))throw Error('这一真实施术来源已有未到期的魔法锁层，不能重复叠加');
          q.consequence='add-arcane-lock';q.dc=null;q.modifier=null;q.durationMinutes=Number(p.持续分钟??10);q.overlayDefinition=locks().normalizeLock({version:1,kind:'arcane',dc:p.锁难度,rank:p.最高品级,keyMode:'instance'});
        }else{
          const durability=host().definition(item).capabilities.durability??{mode:'normal'},rule=durability.breakRule;
          if(!host().sourceAllowed(s,item)||durability.mode!=='rule-only'||!rule)throw Error('只有明确声明特殊破坏规则的规则器体可以成为目标');
          if(rule.kind!=='destruction'||p.破坏规则!=='destruction'||Number(p.最高品级??1)<rule.rank)throw Error('实际能力的毁灭规则或品级不匹配');
          q.requiredRank=rule.rank;q.dc=10+rule.rank*3;q.consequence='destroy-item';
        }
      }
      q.available=true;
    }catch(error){q.reason=error.message;}
    return q;
  }
  function mustQuote(s,r,o){const q=quote(s,r,o);if(!q.available)throw Error(q.reason);return q;}
  function castContext(s,actorId,skill,nodes,targetId,options={},battleId=null){
    const selected=nodes.filter(n=>EFFECT_TYPES[n.effectId]);
    if(!selected.length){if(options.deviceNodeId||options.lockId||options.knowledgeId)throw Error('本次选择用途没有器具效果节点');return null;}
    if(selected.length!==1||!options.targetItemId||options.deviceNodeId&&options.deviceNodeId!==selected[0].id)throw Error('器具施法必须选择唯一实际节点和目标实物');
    const node=selected[0],item=s.物品?.实例?.[options.targetItemId],actualTarget=item&&(host().carrier(s,item)?.personId??item.ownerEntityId);
    if(actualTarget!==targetId)throw Error('施法目标必须对应该器具当前实际佩戴者或持有者');
    const target={itemId:options.targetItemId,...(options.lockId?{lockId:options.lockId}:{}),...(options.knowledgeId?{knowledgeId:options.knowledgeId}:{}),...(options.materials?{materials:copy(options.materials)}:{})},q=mustQuote(s,{...target,type:EFFECT_TYPES[node.effectId],actorId,skillId:skill.id,nodeId:node.id},{battleId});
    return {nodeId:node.id,target,quote:q};
  }
  function apply(s,r,sourceId,{battleId=null}={}){
    const q=mustQuote(s,r,{battleId}),item=s.物品.实例[r.itemId];if(q.method==='ability')throw Error('能力操作须经正常施放、支付和执行票据');
    const d=locks().definition(s,item,q.lockId),key=r.keyItemId?s.物品.实例[r.keyItemId]:null,basis=key?{kind:'key',keyItem:copy(key),keyEventId:key.payload.deviceKey.creationEventId}:{kind:'controller',controllerIds:copy(d.controllerIds),wearerId:d.wearerId,wearerLock:d.origin==='arcane'||host().read(item).capabilities.release?.wearerLock===true};
    const e=locks().event(s,r.type==='device.lock'?'locked':'unlocked',item,r.actorId,sourceId,{lockId:d.lockId,basis,context:copy(globalThis.SoulActionContext.positionOf(s,r.actorId))});
    return {type:r.type,actorId:r.actorId,itemId:item.id,lockId:d.lockId,success:true,consequence:q.consequence,eventId:e.id,eventHash:e.hash,minutes:q.minutes};
  }
  function prepareEffect(s,actorId,skillId,nodeIds,payment,receiptId,{battleId=null,targetItemId,lockId,knowledgeId,deviceNodeId,materials}={}){
    const skill=ownSkill(s,actorId,skillId),selected=(skill.effectGraph?.nodes??[]).filter(n=>nodeIds.includes(n.id)&&EFFECT_TYPES[n.effectId]);
    if(!receiptId||!selected.length||!payment||payment.actorId!==actorId||payment.skillId!==skillId||!payment.operationId||!payment.resources||payment.resources.before.soulPower-payment.resources.after.soulPower!==payment.totals?.soulPower||payment.resources.before.health-payment.resources.after.health!==payment.totals?.health||s.战斗单位.列表[actorId].资源.魂力.当前!==payment.resources.after.soulPower)throw Error('器具能力执行缺少实际支付收据或选择节点');
    // The caller is the normal engine after pay(); arbitrary request fields are
    // never accepted as execution evidence. Each selected node is consumed once.
    if(!targetItemId||selected.length!==1||deviceNodeId&&selected[0].id!==deviceNodeId)throw Error('每次器具操作须绑定唯一实际目标与正式节点');
    const target={itemId:targetItemId,...(lockId?{lockId}:{}),...(knowledgeId?{knowledgeId}:{}),...(materials?{materials:copy(materials)}:{})};
    mustQuote(s,{...target,type:EFFECT_TYPES[selected[0].effectId],actorId,skillId,nodeId:selected[0].id},{battleId,executing:true});
    const ticket=Object.freeze({});tickets.set(ticket,{state:s,actorId,skill:copy(skill),nodeIds:new Set(selected.map(n=>n.id)),payment:copy(payment),receiptId,battleId,target:copy(target),at:now(s)});return ticket;
  }
  function basisFor(t,node){return {kind:'ability',actorId:t.actorId,skill:copy(t.skill),skillHash:hash(t.skill),nodeId:node.id,effectId:node.effectId,params:copy(node.params),payment:copy(t.payment),receiptId:t.receiptId,battleId:t.battleId,at:t.at};}
  function validateEffectBasis(s,basis,event){
    if(basis?.kind!=='ability'||basis.actorId!==event.actorId||basis.at>event.at||basis.receiptId!==event.sourceId||basis.skillHash!==hash(basis.skill)||globalThis.SoulAbilityContract.verify(basis.skill).pass!==true||!basis.payment||basis.payment.actorId!==basis.actorId||basis.payment.skillId!==basis.skill.id||basis.payment.resources?.before?.soulPower-basis.payment.resources?.after?.soulPower!==basis.payment.totals?.soulPower)return false;
    const n=basis.skill.effectGraph?.nodes?.find(n=>n.id===basis.nodeId);if(!n||n.effectId!==basis.effectId||!EFFECT_TYPES[n.effectId]||hash(n.params)!==hash(basis.params))return false;
    const expected={unlocked:'payload.unlock',suppressed:'payload.suppress_lock',analyzed:'payload.analyze_lock','key-created':'payload.create_key','arcane-applied':'payload.arcane_lock'}[event.type];return !expected||n.effectId===expected;
  }
  function applyEffect(s,ticket,nodeId,target,{rng,createKey}={}){
    const t=tickets.get(ticket);if(!t||t.state!==s||!t.nodeIds.has(nodeId)||t.at!==now(s))throw Error('器具能力执行票据无效、过期或已经使用');
    if(hash(target)!==hash(t.target))throw Error('器具目标、锁或知识与施放时冻结的上下文不符');
    const node=t.skill.effectGraph.nodes.find(n=>n.id===nodeId),request={...t.target,type:EFFECT_TYPES[node.effectId],actorId:t.actorId,skillId:t.skill.id,nodeId},q=mustQuote(s,request,{battleId:t.battleId,executing:true}),item=s.物品.实例[request.itemId],basis=basisFor(t,node);
    if(!rng?.die)throw Error('器具对抗须使用外层正式行动随机源');
    let check=null,success=true;if(q.dc!==null){const die=rng.die(20);success=die===20||die!==1&&die+q.modifier>=q.dc;check={type:request.type,die,modifier:q.modifier,total:die+q.modifier,dc:q.dc,success};}
    t.nodeIds.delete(nodeId);
    const result={type:request.type,actorId:t.actorId,itemId:item.id,lockId:q.lockId,success,consequence:success?q.consequence:null,check};if(!success)return result;
    if(request.type==='device.break-rule'){
      ruleBreakBases.set(basis,{state:s,item});const permit=host().authorizeRuleBreak(s,item,basis);ruleBreakBases.delete(basis);const before=item.durability,change=host().damage(s,item,before,permit);result.damage=change;result.basis=basis;return result;
    }
    if(request.type==='device.arcane-lock'){
      const lockId='arcane-lock:'+hash([t.receiptId,item.id]),e=locks().event(s,'arcane-applied',item,t.actorId,t.receiptId,{lockId,basis,overlayDefinition:copy(q.overlayDefinition),until:now(s)+q.durationMinutes});result.lockId=lockId;result.eventId=e.id;result.expiresAt=e.until;
    }else if(request.type==='device.unlock'||request.type==='device.suppress-lock'){
      const e=locks().event(s,request.type==='device.unlock'?'unlocked':'suppressed',item,t.actorId,t.receiptId,{lockId:q.lockId,basis,...(request.type==='device.suppress-lock'?{until:now(s)+q.durationMinutes}:{})});result.eventId=e.id;result.eventHash=e.hash;
    }else if(request.type==='device.analyze-lock'){
      const id='lock-knowledge:'+hash([t.receiptId,item.id,t.actorId]),eventId='device-lock:'+t.receiptId+':'+item.id+':analyzed',knowledge=locks().stamp({version:1,id,actorId:t.actorId,eventId,lockId:q.lockId,keyIdentity:copy(locks().keyIdentity(s,item,q.lockId)),learnedAt:now(s),rank:locks().definition(s,item,q.lockId).definition.rank});
      const e=locks().event(s,'analyzed',item,t.actorId,t.receiptId,{lockId:q.lockId,basis,knowledgeId:id,knowledge});locks().table(s,true).knowledge[id]=knowledge;result.knowledgeId=id;result.eventId=e.id;
    }else if(request.type==='device.create-key'){
      const id='device-key:'+hash([t.receiptId,item.id,t.actorId]),eventId='device-lock:'+t.receiptId+':'+item.id+':key-created',keyIdentity=locks().keyIdentity(s,item,q.lockId),payload={deviceKey:{version:1,identity:copy(keyIdentity),knowledgeId:request.knowledgeId,creationEventId:eventId}},spec={id,name:'实体锁钥匙',forceUnique:true,quantity:1,valuePoints:q.keyValue,payload,provenance:{type:'device-key-creation',actorId:t.actorId,sourceId:t.receiptId,knowledgeId:request.knowledgeId}};
      if(typeof createKey!=='function')throw Error('永久钥匙须通过正式物品创建入口落地');
      const materialProof=q.materials.allocations.map(a=>({allocation:copy(a),before:copy(globalThis.SoulExpeditionEngine.personMaterials(s,t.actorId)[a.fingerprint])}));globalThis.SoulCreationCore.consumeMaterials(s,t.actorId,q.materials);
      const key=createKey(s,'device-key',t.actorId,s.人物.列表[t.actorId].inventoryContainerId,spec);if(key?.id!==id||key.templateId!=='device-key'||hash(key.payload)!==hash(payload))throw Error('实际钥匙创建结果与冻结身份不符');
      const e=locks().event(s,'key-created',item,t.actorId,t.receiptId,{lockId:q.lockId,basis,keyItemId:key.id,keyIdentity:copy(keyIdentity),keyKnowledgeId:request.knowledgeId,keyBlueprint:copy(q.keyBlueprint),keyValue:q.keyValue,keySnapshot:copy(key),materials:copy(q.materials),materialProof});result.keyItemId=key.id;result.eventId=e.id;result.materialAllocations=copy(q.materials.allocations);result.consumedValue=q.materials.consumedValue;
    }
    return result;
  }
  function isRuleBreakAuthorization(s,item,basis){const proof=ruleBreakBases.get(basis);return proof?.state===s&&proof.item===item;}
  function soulBreakProfile(s,actorId,status,{battleId=null}={}){
    if(!status||!['status.bind','status.limb_bind'].includes(status.模板ID)||status.目标单位ID!==actorId||status.扩展?.固定交换义务)throw Error('当前没有可进行魂力对抗的束缚');
    const item=s.物品?.实例?.[status.来源?.物品ID];if(status.扩展?.持续来源合同?.sourceKind==='restraint'&&(!item||!host().canDamage(s,item)))throw Error('该器体不能通过常规魂力挣脱毁坏');
    globalThis.SoulActionContext.resolve(s,{actorId,battleId,requirements:['focus','soul-power']});
    const view=controls().soulPowerView(s,actorId),seals=controls().restrictions(s,actorId).seals;
    if(view.percent===0||seals.some(v=>v.kind==='魂力'))throw Error('魂力仍被有效封印，不能运转魂力挣脱');
    const dc=Number(status.快照?.施加者DC??10)+Number(status.快照?.参数?.挣脱难度加值??0)+globalThis.SoulAbilityExchange.controlBonus(s,status.来源.单位ID,{sourceMartialSoulId:status.来源.武魂ID}),soulPowerCost=Math.max(1,Math.ceil(dc/5));
    if(view.available<soulPowerCost)throw Error('实际可用魂力不足以进行本次对抗');
    const level=Number(s.成长?.列表?.[actorId]?.魂力等级??s.战斗单位.列表[actorId].派生?.有效等级??0),proficiency=Number(s.战斗单位.列表[actorId].派生?.熟练加值??0);
    return {method:'soul',statusId:status.id,attribute:'魂力',traitBonus:0,modifier:Math.floor(level/10)+proficiency,dc,soulPowerCost,availableSoulPower:view.available,level,minutes:battleId?0:10,actionCost:battleId?'main':null};
  }
  function paySoulBreak(s,actorId,profile){
    const current=soulBreakProfile(s,actorId,s.状态实例.列表[profile.statusId],{battleId:globalThis.SoulActionContext.battleOf(s,actorId)?.id??null});if(hash(current)!==hash(profile))throw Error('魂力对抗报价在执行前发生变化');
    const sp=s.战斗单位.列表[actorId].资源.魂力,before=sp.当前;sp.当前-=profile.soulPowerCost;return {kind:'soulPower',amount:profile.soulPowerCost,before,after:sp.当前,locked:sp.锁定,availableBefore:profile.availableSoulPower};
  }
  function soulBreakProof(s,actorId,profile){
    const status=s.状态实例?.列表?.[profile.statusId],current=soulBreakProfile(s,actorId,status,{battleId:null});if(hash(current)!==hash(profile))throw Error('魂力对抗报价在冻结前发生变化');
    return {version:1,at:now(s),frame:host().attributeFrame(s,actorId)};
  }
  function validateSoulBreakReceipt(r){
    if(r.profile?.method!=='soul')return false;
    const proof=r.soulBreakProof,frame=proof?.frame,p=r.soulBreakPayment,actorId=r.actorId;
    if(proof?.version!==1||proof.at!==r.startedAt||!frame?.成长?.列表?.[actorId]||hash(frame.战斗单位?.列表?.[actorId])!==hash(r.actorProof))throw Error('魂力挣脱缺少当时真实成长、宿主、资源和状态快照');
    host().validateAttributeFrame(frame,actorId,r.startedAt);
    const status=frame.状态实例?.列表?.[r.statusId],u=frame.战斗单位.列表[actorId],level=Number(frame.成长.列表[actorId].魂力等级),view=controls().soulPowerView(frame,actorId),cost=Math.max(1,Math.ceil(r.profile.dc/5));
    if(hash(status)!==hash(r.statusProof)||!controls().breakable(frame,actorId).some(s=>s.id===r.statusId)||view.percent===0||controls().restrictions(frame,actorId).seals.some(v=>v.kind==='魂力')||controls().restrictions(frame,actorId).blocked.focus?.length||view.available<cost)throw Error('魂力挣脱当时实际许可或可用魂力无效');
    if(!Number.isFinite(level)||r.profile.level!==level||r.profile.modifier!==Math.floor(level/10)+u.派生.熟练加值||r.profile.soulPowerCost!==cost||r.profile.availableSoulPower!==view.available||p?.kind!=='soulPower'||p.amount!==cost||p.before!==u.资源.魂力.当前||p.after!==p.before-cost||p.locked!==u.资源.魂力.锁定||p.availableBefore!==view.available)throw Error('魂力挣脱成长、费用或资源付款证据不符');
    return true;
  }
  function effectRemovals(s,create=false){if(create){s.扩展??={};s.扩展.deviceEffectRemovals??={version:1,events:[]};}return s.扩展?.deviceEffectRemovals??{version:1,events:[]};}
  function statusEffective(s,status){return !effectRemovals(s).events.some(e=>e.statusId===status.id&&e.itemId===status.来源?.物品ID&&e.statusHash===hash({source:status.来源,snapshot:status.快照})&&locks().valid(e));}
  function removeDeviceEffect(s,status,reason,{actorId,sourceId,skill,node,payment,releasedMedicine}){
    const fixed=skill?._sourceContract??skill,actual=fixed?.effectGraph?.nodes?.find(n=>n.id===node?.id),expected=reason==='cleansed'?'payload.cleanse':reason==='dispelled'?'payload.dispel':null;
    if(!expected||status.扩展?.持续来源合同?.sourceKind!=='restraint'||!statusEffective(s,status)||actual?.effectId!==expected||globalThis.SoulAbilityContract.verify(fixed).pass!==true||!payment||payment.operationId!==sourceId&&!releasedMedicine||payment.actorId!==actorId)throw Error('指定道具效果解除缺少实际施法来源');
    const db=effectRemovals(s,true),e=locks().stamp({id:'device-effect:'+sourceId+':'+status.id,order:db.events.length+1,at:now(s),actorId,sourceId,itemId:status.来源.物品ID,statusId:status.id,targetId:status.目标单位ID,statusHash:hash({source:status.来源,snapshot:status.快照}),statusProof:copy(status),reason,skill:copy(fixed),nodeId:actual.id,payment:copy(payment),...(releasedMedicine?{releasedMedicine:copy(releasedMedicine)}:{}),previousHash:db.events.at(-1)?.hash??null});
    if(db.events.some(v=>v.id===e.id))throw Error('同一施法已经解除这一道具效果');db.events.push(e);controls().invalidateReadIndex(s);return e;
  }
  function validateEffectRemovals(s){
    const db=effectRemovals(s),errors=[];if(db.version!==1||!Array.isArray(db.events))return ['道具效果解除账本结构无效'];let previous=null;const ids=new Set();
    for(const [i,e]of db.events.entries())try{
      const node=e.skill?.effectGraph?.nodes?.find(n=>n.id===e.nodeId),p=e.payment,expected=e.reason==='cleansed'?'payload.cleanse':e.reason==='dispelled'?'payload.dispel':null;
      if(!locks().valid(e)||e.order!==i+1||e.previousHash!==previous||ids.has(e.id)||e.id!=='device-effect:'+e.sourceId+':'+e.statusId||!Number.isSafeInteger(e.at)||e.at>now(s)||!expected||node?.effectId!==expected||globalThis.SoulAbilityContract.verify(e.skill).pass!==true||!globalThis.SoulCreationCore.sourceOwned(s,e.skill,e.actorId))throw Error('事件或实际能力来源');
      if(e.statusProof.id!==e.statusId||e.statusProof.目标单位ID!==e.targetId||e.statusProof.来源.物品ID!==e.itemId||e.statusProof.扩展?.持续来源合同?.sourceKind!=='restraint'||e.statusHash!==hash({source:e.statusProof.来源,snapshot:e.statusProof.快照})||!globalThis.SoulCombatEngine.validateControlSourceProof(e.statusProof,e.targetId,globalThis.SoulSealingCore.statusTime(s,e.statusProof,e.at)))throw Error('指定原道具效果');
      if(p?.operationId!==e.sourceId&&!e.releasedMedicine||p.actorId!==e.actorId||p.skillId!==e.skill.id||p.resources?.before?.soulPower-p.resources?.after?.soulPower!==p.totals?.soulPower)throw Error('真实付款');
      if(e.releasedMedicine){const proof=e.releasedMedicine,r=globalThis.SoulPoisonCore.source(s,proof.sourceId),dose=globalThis.SoulPoisonCore.exposure(s,proof.exposureId);if(!r||!dose||dose.id!==e.sourceId||dose.sourceId!==r.id||dose.targetId!==e.targetId||dose.proof.sourceHash!==r.originHash||proof.sourceHash!==r.originHash||hash(r.skill)!==hash(e.skill)||hash(r.payment)!==hash(p))throw Error('原始已支付中性药剂剂量来源');}
      ids.add(e.id);previous=e.hash;
    }catch(error){errors.push('道具效果解除'+e?.id+'：'+error.message);previous=e?.hash;}
    return errors;
  }
  function facts(s,actorId,{battleId=null}={}){
    const items=[],keys=Object.values(s.物品?.实例??{}).filter(i=>i.payload?.deviceKey&&i.ownerEntityId===actorId),skills=(s.战斗单位?.列表?.[actorId]?.能力?.技能ID??[]).map(id=>s.技能?.列表?.[id]).filter(Boolean),knowledge=Object.values(locks().table(s).knowledge??{}).filter(k=>locks().knowledge(s,actorId,k.id));
    for(const item of Object.values(s.物品?.实例??{})){
      const lock=locks().definition(s,item),durability=(()=>{try{return host().definition(item).capabilities.durability;}catch{return null;}})();if(!lock&&durability?.mode!=='rule-only')continue;
      const operations=[],add=intent=>{const q=quote(s,{actorId,...intent},{battleId});operations.push({intent:{actorId,...intent,...(q.branchIds?.length?{branchIds:q.branchIds}:{}),...(q.materials?.allocations?{materials:q.materials.allocations.map(a=>({fingerprint:a.fingerprint,quantity:a.quantity}))}:{})},...q});};
      const layers=locks().layers(s,item);
      for(const layer of layers){
        const lockId=layer.lockId;add({type:'device.lock',itemId:item.id,lockId});add({type:'device.unlock',itemId:item.id,lockId});for(const key of keys)if(locks().keyMatches(s,key,item,actorId,lockId))add({type:'device.unlock',itemId:item.id,lockId,keyItemId:key.id});
        for(const skill of skills)for(const node of skill.effectGraph?.nodes??[])if(EFFECT_TYPES[node.effectId]){
          const type=EFFECT_TYPES[node.effectId];if(['device.break-rule','device.arcane-lock'].includes(type)&&layer!==layers[0])continue;
          if(type==='device.create-key'){for(const k of knowledge)if(hash(k.keyIdentity)===hash(locks().keyIdentity(s,item,lockId)))add({type,itemId:item.id,lockId,skillId:skill.id,nodeId:node.id,knowledgeId:k.id});}else add({type,itemId:item.id,lockId,skillId:skill.id,nodeId:node.id});
        }
      }
      if(!layers.length)for(const skill of skills)for(const node of skill.effectGraph?.nodes??[])if(node.effectId==='payload.rule_break')add({type:'device.break-rule',itemId:item.id,skillId:skill.id,nodeId:node.id});
      if(operations.some(q=>q.available)||item.ownerEntityId===actorId||host().carrier(s,item)?.personId===actorId)items.push({itemId:item.id,name:item.name,wearerId:host().carrier(s,item)?.personId??null,lock:copy(lock),locks:copy(layers),durability:copy(durability),operations});
    }
    return {version:VERSION,actorId,items,keys:keys.map(i=>({itemId:i.id,name:i.name})),skills:skills.flatMap(s=>(s.effectGraph?.nodes??[]).filter(n=>EFFECT_TYPES[n.effectId]).map(n=>({skillId:s.id,name:s.name,nodeId:n.id,type:EFFECT_TYPES[n.effectId]}))),knowledge:knowledge.map(k=>({knowledgeId:k.id,lockId:k.lockId,rank:k.rank}))};
  }
  return Object.freeze({VERSION,EFFECT_TYPES,quote,apply,castContext,prepareEffect,applyEffect,validateEffectBasis,isRuleBreakAuthorization,soulBreakProfile,soulBreakProof,paySoulBreak,validateSoulBreakReceipt,effectRemovals,statusEffective,removeDeviceEffect,validateEffectRemovals,facts});
});
