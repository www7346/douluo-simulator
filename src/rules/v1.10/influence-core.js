(function attachInfluence(root,factory){
  const controls=root?.SoulControlCore??(typeof require==='function'?require('./control-core.js'):null);
  const people=root?.SoulPersonCore??(typeof require==='function'?require('./person-core.js'):null);
  const abilities=root?.SoulAbilityContract??(typeof require==='function'?require('./ability-contract-core.js'):null);
  const actions=root?.SoulActionContext??(typeof require==='function'?require('./action-context-core.js'):null);
  const api=factory(controls,people,abilities,actions);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.SoulInfluenceCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(controls,people,abilities,actions){
  'use strict';
  const CONTROL_IDS=Object.freeze(['status.mind_control','status.soul_control']);
  const COGNITION_ID='status.cognition_shift';
  const DOMAINS=Object.freeze(['战斗','移动','言语','物品']);
  const ORDER_ACTIONS=Object.freeze(['技能','切换武魂','防御','放弃行动','逃跑','协助撤退','挣脱','结束武魂真身','停止维持','认输']);
  const ORDER_FIELDS=Object.freeze(['type','skillId','targetIds','martialSoulId','castRank','modeId','movement','aimPoint','branchTargets','copySourceUnitId','statusId','maintenanceSourceId']);
  const clone=v=>JSON.parse(JSON.stringify(v));
  const personId=(state,id)=>globalThis.SoulConsciousness?.personForCarrier(state,id)?.personId??globalThis.SoulCombatDeployments?.table(state).records.find(r=>r.mode==='projection'&&r.unitId===id)?.prototypeId??id;
  const consciousnessIds=(state,id)=>{const p=personId(state,id);return [...new Set([p,globalThis.SoulConsciousness?.unitId(state,p)??p])];};
  const live=(state,id)=>consciousnessIds(state,id).flatMap(targetId=>controls.active(state,targetId)).filter(s=>CONTROL_IDS.includes(s.模板ID));
  const commandContexts=new WeakMap();
  function controlled(state,actorId){
    return [...live(state,actorId).filter(s=>!controls.sourceInvalidReason(state,s)&&!state.扩展?.controlEpisodes?.[s.id]?.endedOrder).map(s=>({kind:s.模板ID,controllerId:state.扩展?.controlEpisodes?.[s.id]?.controllerId??personId(state,s.来源.单位ID),sourceActorId:s.来源.单位ID,sourceStatusId:s.id,strength:Number(s.快照.参数.强度),domain:s.快照.参数.命令域,source:clone(s.来源)})),...cognition(state,actorId).map(c=>({kind:COGNITION_ID,controllerId:c.controllerId,sourceActorId:c.subjectId,sourceStatusId:c.sourceStatusId,strength:c.strength,direction:c.direction,recordId:c.id}))];
  }
  function autonomy(state,actorId){const sources=controlled(state,actorId),puppet=sources.some(s=>s.kind==='status.mind_control');return {controlled:sources.length>0,puppet,canDecide:!puppet,canSpeak:!puppet,sources};}
  // A commanded action never supplies the person's own consent or decision.
  function voluntaryReason(state,actorId){return autonomy(state,actorId).canDecide?'':'精神接管期间无法自行决定，须恢复自主后再回应';}
  function assertVoluntary(state,actorId){const reason=voluntaryReason(state,actorId);if(reason)throw Error(reason);}
  function withCommand(state,issuerId,actorId,domain,execute){
    const auth=authority(state,issuerId,actorId,domain);if(!auth.available)throw Error(auth.reason);
    const before=commandContexts.get(state);commandContexts.set(state,{actorId,issuerId,domain,sourceStatusId:auth.sourceStatusId});
    try{return execute();}finally{if(before)commandContexts.set(state,before);else commandContexts.delete(state);}
  }
  function autonomyReason(state,actorId,{speech=false,domain}={}){
    if(!autonomy(state,actorId).puppet)return '';
    if(speech)return '精神接管期间无法自行说话';
    const context=commandContexts.get(state);
    if(context?.actorId===actorId&&context.domain!=='言语'&&(!domain||context.domain===domain)){
      const auth=authority(state,context.issuerId,actorId,context.domain);if(auth.available&&auth.sourceStatusId===context.sourceStatusId)return '';
    }
    if(globalThis.SoulFieldControl?.executing(state,actorId,domain))return '';
    return '精神接管期间只能等待或执行有效命令';
  }
  // A historical interruption keeps the actual status, while its interval is
  // checked against the same permanent episode used by retained memories.
  function autonomyBlockProof(state,actorId,options={}){
    if(!autonomyReason(state,actorId,options))return null;
    const source=autonomy(state,actorId).sources.find(s=>s.kind==='status.mind_control'),status=state.状态实例.列表[source?.sourceStatusId];
    return status?{episodeId:status.id,status:clone(status)}:null;
  }
  function validAutonomyBlockProof(state,proof,actorId,at,order){
    try{
      const row=state.扩展?.controlEpisodes?.[proof?.episodeId],status=proof?.status,{hash,...body}=row??{};
      if(!row||status?.扩展?.施加分钟!==row.appliedAt||abilities.hash(status.快照)!==abilities.hash(row.status?.快照)||abilities.hash(status.扩展?.毒药来源??null)!==abilities.hash(row.status?.扩展?.毒药来源??null))return false;
      return !!row&&hash===abilities.hash(body)&&row.kind==='status.mind_control'&&[row.targetId,row.sourceTargetId].includes(actorId)&&row.id===status?.id&&status.模板ID===row.kind&&status.目标单位ID===row.sourceTargetId&&abilities.hash(status.来源)===abilities.hash(row.source)&&abilities.hash(status.扩展?.持续来源合同)===abilities.hash(row.contract)&&Number.isSafeInteger(at)&&at<=people.now(state)&&Number.isSafeInteger(order)&&order<=state.扩展.personEventSequence&&row.appliedAt<=at&&row.appliedOrder<order&&(!row.endedOrder||order<=row.endedOrder&&at<=row.endedAt)&&globalThis.SoulCombatEngine.validateControlSourceProof(status,row.sourceTargetId,globalThis.SoulSealingCore.statusTime(state,status,at));
    }catch{return false;}
  }
  const cognitionOrigin=status=>abilities.hash({statusId:status.id,source:status.来源,targetId:status.目标单位ID,startedAt:status.扩展.认知进程.startedAt,startedRevision:status.扩展.认知进程.startedRevision,storyTurn:status.扩展.认知进程.storyTurn,startedOrder:status.扩展.认知进程.startedOrder,controllerId:status.扩展.认知进程.controllerId,sourceActorProof:status.扩展.认知进程.sourceActorProof});
  function commandIntent(intent){
    if(!intent||typeof intent!=='object'||Array.isArray(intent)||!ORDER_ACTIONS.includes(intent.type)||Object.keys(intent).some(key=>!ORDER_FIELDS.includes(key)))throw Error('控制命令只能指定已登记的战斗行动');
    return clone(intent);
  }
  function orderBody(order){return Object.fromEntries(['id','sourceStatusId','issuerId','actorId','battleId','domain','intent','issuedAt','source','contract'].map(key=>[key,order[key]]));}
  const resolutionHash=o=>abilities.hash({orderHash:o.hash,status:o.status,resolvedAt:o.resolvedAt,reason:o.reason,receiptId:o.receiptId??''});
  function orderReason(state,order){
    const battle=actions.battleOf(state,order.actorId);
    if(!battle||battle.id!==order.battleId||battle.状态!=='进行中')return '受控者已离开该场战斗';
    const auth=authority(state,order.issuerId,order.actorId,order.domain);
    if(!auth.available||auth.sourceStatusId!==order.sourceStatusId)return auth.reason||'原控制来源已失效';
    return '';
  }
  function pendingOrder(state,actorId){return Object.values(state.扩展?.influenceOrders??{}).find(o=>o.actorId===actorId&&o.status==='pending'&&!orderReason(state,o))??null;}
  function completeOrder(state,orderId,status,reason='',receiptId=''){
    const order=state.扩展?.influenceOrders?.[orderId];if(!order||!['pending','executing'].includes(order.status))return;
    order.status=status;order.resolvedAt=people.now(state);order.reason=reason;order.receiptId=receiptId;order.resolutionHash=resolutionHash(order);
  }
  function beginOrder(state,orderId){const order=state.扩展?.influenceOrders?.[orderId];if(order?.status==='pending')order.status='executing';}
  function reconcileOrders(state){
    for(const order of Object.values(state.扩展?.influenceOrders??{}))if(order.status==='pending'){
      const reason=orderReason(state,order);if(reason)completeOrder(state,order.id,'cancelled',reason);
    }
  }
  function issueBattleOrder(state,{id,issuerId,actorId,intent}){
    const command=commandIntent(intent),auth=authority(state,issuerId,actorId,'战斗');
    if(!auth.available)throw Error(auth.reason);
    const battle=actions.battleOf(state,actorId),issuerBattle=actions.battleOf(state,issuerId);
    if(!battle||battle.id!==issuerBattle?.id||battle.当前行动单位ID!==issuerId)throw Error('战斗命令必须在下令者自己的同场回合发出');
    const source=state.状态实例.列表[auth.sourceStatusId];
    state.扩展.influenceOrders??={};if(state.扩展.influenceOrders[id])throw Error('控制命令ID已使用');
    for(const prior of Object.values(state.扩展.influenceOrders))if(prior.actorId===actorId&&prior.status==='pending')completeOrder(state,prior.id,'cancelled','被新的有效命令替代');
    const order={id,sourceStatusId:auth.sourceStatusId,issuerId,actorId,battleId:battle.id,domain:'战斗',intent:command,issuedAt:people.now(state),source:clone(source.来源),contract:clone(source.扩展.持续来源合同),status:'pending'};
    order.hash=abilities.hash(orderBody(order));state.扩展.influenceOrders[id]=order;
    const finished=Object.values(state.扩展.influenceOrders).filter(o=>o.status!=='pending');for(const old of finished.slice(0,-100))delete state.扩展.influenceOrders[old.id];
    return clone(order);
  }
  function authority(state,issuerId,actorId,domain){
    if(!DOMAINS.includes(domain))throw Error('未登记的控制命令域');
    const contenders=live(state,actorId).filter(status=>{
      const p=status.快照.参数,controllerId=state.扩展?.controlEpisodes?.[status.id]?.controllerId??personId(state,status.来源.单位ID),ownerId=globalThis.SoulConsciousness?.unitId(state,controllerId)??controllerId;
      if(p.命令域!=='全部'&&p.命令域!==domain)return false;
      if(state.人物?.列表?.[controllerId]?.status==='dead'||state.战斗单位?.列表?.[ownerId]?.存活状态!=='存活')return false;
      if(controls.sourceInvalidReason(state,status))return false;
      if(p.控制距离==='同场'){
        const a=actions.battleOf(state,ownerId),b=actions.battleOf(state,actorId);
        if(a||b){if(!a||a.id!==b?.id)return false;}
        else if(!actions.colocated(state,ownerId,actorId))return false;
      }
      return true;
    }).map(status=>({status,strength:Number(status.快照.参数.强度),kind:status.模板ID}));
    if(!contenders.length)return {available:false,reason:'没有覆盖该命令域的有效控制来源',sources:[]};
    const max=Math.max(...contenders.map(c=>c.strength)),strongest=contenders.filter(c=>c.strength===max),owners=[...new Set(strongest.map(c=>personId(state,c.status.来源.单位ID)))];
    if(owners.length!==1)return {available:false,reason:'同强度控制来源冲突，不能取得命令权',sources:strongest.map(c=>c.status.id)};
    const source=strongest.sort((a,b)=>a.status.id.localeCompare(b.status.id))[0].status;
    return {available:owners[0]===personId(state,issuerId),reason:owners[0]===personId(state,issuerId)?'':'该命令域由更强的其他来源控制',sourceStatusId:source.id,issuerId:owners[0],actorId,domain,strength:max,sources:strongest.map(c=>c.status.id)};
  }
  function cognitionRecord(state,status){
    const p=status.快照.参数,id=`${status.id}:cognition`;
    state.扩展.cognitionChanges??={};if(state.扩展.cognitionChanges[id])return state.扩展.cognitionChanges[id];
    const change={id,sourceStatusId:status.id,targetId:personId(state,status.目标单位ID),sourceTargetId:status.目标单位ID,carrierProof:globalThis.SoulConsciousness?.proof(state,personId(state,status.目标单位ID))??null,subjectId:status.来源.单位ID,controllerId:status.扩展.认知进程.controllerId,sourceActorProof:clone(status.扩展.认知进程.sourceActorProof),sourceActorAt:status.扩展.认知进程.startedAt,sourceActorOrder:status.扩展.认知进程.startedOrder,direction:p.认知方向,strength:p.强度,retention:p.认知保留,appliedAt:people.now(state),appliedOrder:people.nextEventOrder(state),startedAt:status.扩展.认知进程.startedAt,startedRevision:status.扩展.认知进程.startedRevision,storyTurn:status.扩展.认知进程.storyTurn,source:clone(status.来源),contract:clone(status.扩展.持续来源合同)};
    change.status=clone(status);change.operatorObservation=globalThis.SoulPersonChangeKnowledge?.captureOperator(state,change)??null;change.hash=abilities.hash(change);state.扩展.cognitionChanges[id]=change;globalThis.SoulPersonChangeKnowledge?.cognition(state,change);globalThis.SoulPersonRewrite?.onCognitionCompleted(state,change);return change;
  }
  function controlEpisode(state,status,ended=false){
    const targetId=personId(state,status.目标单位ID);
    if(!CONTROL_IDS.includes(status.模板ID)||!state.人物?.列表?.[targetId])return;
    state.扩展.controlEpisodes??={};let row=state.扩展.controlEpisodes[status.id];
    if(!row){if(ended)return;row={id:status.id,targetId,sourceTargetId:status.目标单位ID,carrierProof:globalThis.SoulConsciousness?.proof(state,targetId)??null,actorId:status.来源.单位ID,controllerId:personId(state,status.来源.单位ID),kind:status.模板ID,source:clone(status.来源),contract:clone(status.扩展.持续来源合同),status:clone(status),appliedAt:people.now(state),appliedOrder:people.nextEventOrder(state)};row.sourceActorProof=globalThis.SoulConsciousness?.proof(state,row.controllerId)??null;state.扩展.controlEpisodes[status.id]=row;}
    else if(!ended||row.endedOrder)return;
    if(ended){row.endedAt=people.now(state);row.endedOrder=people.nextEventOrder(state);}
    if(!ended)row.operatorObservation=globalThis.SoulPersonChangeKnowledge?.captureOperator(state,row)??null;const {hash,...body}=row;row.hash=abilities.hash(body);globalThis.SoulPersonChangeKnowledge?.control(state,row,ended?'restored':'applied');
  }
  function onRemoved(state,status){
    controlEpisode(state,status,true);globalThis.SoulPersonRewrite?.onRemoved(state,status);
    const c=state.扩展?.cognitionChanges?.[`${status.id}:cognition`];if(!c||c.endedOrder)return;c.endedAt=people.now(state);c.endedOrder=people.nextEventOrder(state);const {hash,...body}=c;c.hash=abilities.hash(body);if(c.retention!=='保留')globalThis.SoulPersonChangeKnowledge?.cognition(state,c,'restored');
  }
  function onApplied(state,status){
    controlEpisode(state,status);
    globalThis.SoulPersonRewrite?.onBodyApplied(state,status);
    if(status.模板ID!==COGNITION_ID)return;
    if(!state.人物?.列表?.[personId(state,status.目标单位ID)])throw Error('认知改变只适用于已登记人物');
    const p=status.快照.参数,at=people.now(state),immediate=p.改造方式==='立即';
    status.扩展.认知进程={startedAt:at,startedOrder:people.nextEventOrder(state),controllerId:personId(state,status.来源.单位ID),sourceActorProof:globalThis.SoulConsciousness?.proof(state,personId(state,status.来源.单位ID))??null,startedRevision:state.系统.revision,storyTurn:Math.max(0,Number(state.扩展?.story?.nextTurn??1)-1),processedMinutes:immediate?p.改造分钟:0,nextAt:immediate?null:at+1,completed:immediate};
    status.扩展.认知进程.originHash=cognitionOrigin(status);
    if(immediate)cognitionRecord(state,status);
  }
  function nextAt(state,through=Number.MAX_SAFE_INTEGER){
    const times=Object.values(state.状态实例?.列表??{}).filter(s=>s.模板ID===COGNITION_ID).map(s=>s.扩展?.认知进程?.nextAt).filter(at=>at!==null&&Number.isSafeInteger(at)&&at<=through);
    return times.length?Math.min(...times):null;
  }
  function advanceAt(state,at){
    for(const status of Object.values(state.状态实例?.列表??{})){
      if(status.模板ID!==COGNITION_ID||status.状态!=='生效')continue;
      if(state.战斗单位?.列表?.[status.目标单位ID]?.存活状态==='死亡'||controls.sourceInvalidReason(state,status))continue;
      const progress=status.扩展.认知进程;if(progress.completed||progress.nextAt>at)continue;
      if(progress.nextAt!==at)throw Error('认知改造未按真实分钟推进');
      progress.processedMinutes++;progress.completed=progress.processedMinutes>=status.快照.参数.改造分钟;progress.nextAt=progress.completed?null:at+1;
      if(progress.completed)cognitionRecord(state,status);
    }
  }
  function cognition(state,actorId){
    const records=Object.values(state.扩展?.cognitionChanges??{}).filter(c=>c.targetId===personId(state,actorId)&&(c.retention==='保留'||state.状态实例?.列表?.[c.sourceStatusId]?.状态==='生效'));
    return records.map(c=>({id:c.id,subjectId:c.subjectId,controllerId:c.controllerId,direction:c.direction,strength:c.strength,retention:c.retention,appliedAt:c.appliedAt,startedRevision:c.startedRevision,storyTurn:c.storyTurn,sourceStatusId:c.sourceStatusId}));
  }
  function facts(state,actorId){
    const order=pendingOrder(state,actorId);
    return {autonomy:autonomy(state,actorId),controlSources:live(state,actorId).map(s=>({statusId:s.id,kind:s.模板ID,issuerId:s.来源.单位ID,domain:s.快照.参数.命令域,strength:s.快照.参数.强度,range:s.快照.参数.控制距离})),pendingOrder:order?{id:order.id,issuerId:order.issuerId,sourceStatusId:order.sourceStatusId,intent:clone(order.intent)}:null,cognition:cognition(state,actorId)};
  }
  function validate(state){
    const errors=[];
    for(const [id,row]of Object.entries(state.扩展?.controlEpisodes??{}))try{
      const {hash,...body}=row,node=row.contract?.effectGraph?.nodes?.find(n=>n.id===row.source?.效果ID);
      if(id!==row.id||hash!==abilities.hash(body)||!CONTROL_IDS.includes(row.kind)||node?.effectId!==row.kind||!abilities.verify(row.contract).pass||row.contract.id!==row.source.技能ID||row.source.单位ID!==row.actorId||abilities.hash(row.source)!==abilities.hash(row.status?.来源)||abilities.hash(row.contract)!==abilities.hash(row.status?.扩展?.持续来源合同)||row.status.id!==id||row.status.目标单位ID!==row.sourceTargetId||row.status.模板ID!==row.kind||(row.sourceActorProof?(row.sourceActorProof.personId!==row.controllerId||row.sourceActorProof.unitId!==row.actorId||!globalThis.SoulConsciousness.validProof(state,row.sourceActorProof,row.appliedAt,row.appliedOrder)):row.controllerId!==row.actorId)||row.sourceTargetId!==row.targetId&&(!row.carrierProof||row.carrierProof.personId!==row.targetId||row.carrierProof.unitId!==row.sourceTargetId||!globalThis.SoulConsciousness.validProof(state,row.carrierProof,row.appliedAt,row.appliedOrder))||!state.人物?.列表?.[row.targetId]||!Number.isSafeInteger(row.appliedAt)||row.appliedAt!==row.status.扩展.施加分钟||row.appliedAt>people.now(state)||!globalThis.SoulCombatEngine.validateControlSourceProof(row.status,row.sourceTargetId,row.appliedAt)||!Number.isSafeInteger(row.appliedOrder)||row.appliedOrder<1||row.appliedOrder>state.扩展.personEventSequence||row.endedOrder!==undefined&&(!Number.isSafeInteger(row.endedOrder)||row.endedOrder<=row.appliedOrder||!Number.isSafeInteger(row.endedAt)||row.endedAt<row.appliedAt||row.endedAt>people.now(state)||row.endedOrder>state.扩展.personEventSequence)||!row.endedOrder&&!state.状态实例.列表[id]||row.endedOrder&&state.状态实例.列表[id])throw Error('来源');
    }catch{errors.push(`控制经历${id}来源或时点无效`);}
    const pending=new Set();
    for(const [id,o] of Object.entries(state.扩展?.influenceOrders??{}))try{
      commandIntent(o.intent);
      if(id!==o.id||!state.人物?.列表?.[o.issuerId]||!state.战斗单位?.列表?.[o.actorId]||o.domain!=='战斗'||o.hash!==abilities.hash(orderBody(o))||!abilities.verify(o.contract).pass||!Number.isSafeInteger(o.issuedAt)||o.issuedAt<0||o.issuedAt>people.now(state))throw Error('合同');
      const node=o.contract.effectGraph.nodes.find(n=>n.id===o.source.效果ID);
      if(!CONTROL_IDS.includes(node?.effectId)||o.source.单位ID!==o.issuerId||o.source.技能ID!==o.contract.id||!['战斗','全部'].includes(node.params.命令域))throw Error('来源');
      if(!['pending','executed','failed','cancelled'].includes(o.status))throw Error('状态');
      if(o.status==='pending'){
        const used=[state.战斗,...Object.values(state.世界?.backgroundBattles??{})].some(b=>Object.values(b?.扩展?.已结算行动??{}).some(r=>r.controlOrder?.id===id));
        if(pending.has(o.actorId)||orderReason(state,o)||o.resolvedAt!==undefined||o.resolutionHash!==undefined||used)throw Error('活动来源');
        pending.add(o.actorId);
      }else if(!Number.isSafeInteger(o.resolvedAt)||o.resolvedAt<o.issuedAt||o.resolvedAt>people.now(state)||typeof o.reason!=='string'||o.resolutionHash!==resolutionHash(o))throw Error('结算时间');
    }catch(error){errors.push(`控制命令${id}${error.message}无效`);}
    for(const [id,c] of Object.entries(state.扩展?.cognitionChanges??{})){
      try{
        const {hash,...body}=c;if(id!==c.id||id!==`${c.sourceStatusId}:cognition`||!state.人物?.列表?.[c.targetId]||!state.人物?.列表?.[c.subjectId]&&!state.战斗单位?.列表?.[c.subjectId]||hash!==abilities.hash(body)||!abilities.verify(c.contract).pass)throw Error('来源');
        if(!Number.isSafeInteger(state.扩展.personEventSequence)||!Number.isSafeInteger(c.appliedOrder)||c.appliedOrder<1||c.appliedOrder>Number(state.扩展.personEventSequence)||c.endedOrder!==undefined&&(!Number.isSafeInteger(c.endedOrder)||c.endedOrder<=c.appliedOrder||c.endedOrder>state.扩展.personEventSequence||c.endedAt<c.appliedAt||c.endedAt>people.now(state)))throw Error('事件顺序');
        if(!state.状态实例?.列表?.[c.sourceStatusId]&&!c.endedOrder||state.状态实例?.列表?.[c.sourceStatusId]&&c.endedOrder)throw Error('认知来源终结');
        const node=c.contract.effectGraph.nodes.find(n=>n.id===c.source.效果ID),p=node?.params;
        if((c.sourceActorProof?(c.sourceActorProof.personId!==c.controllerId||c.sourceActorProof.unitId!==c.subjectId||!globalThis.SoulConsciousness.validProof(state,c.sourceActorProof,c.sourceActorAt,c.sourceActorOrder)):(c.controllerId!==c.subjectId))||c.sourceTargetId!==c.targetId&&(!c.carrierProof||c.carrierProof.unitId!==c.sourceTargetId||c.carrierProof.personId!==c.targetId||!globalThis.SoulConsciousness.validProof(state,c.carrierProof,c.appliedAt,c.appliedOrder))||node?.effectId!==COGNITION_ID||c.contract.id!==c.source.技能ID||c.source.单位ID!==c.subjectId||p.认知方向!==c.direction||p.强度!==c.strength||p.认知保留!==c.retention)throw Error('合同');
        if(!Number.isSafeInteger(c.appliedAt)||c.appliedAt>people.now(state)||!Number.isSafeInteger(c.startedAt)||c.startedAt<0||c.appliedAt!==c.startedAt+(p.改造方式==='立即'?0:p.改造分钟)||!Number.isSafeInteger(c.storyTurn)||c.storyTurn<0||c.storyTurn>=Number(state.扩展?.story?.nextTurn??1)||!Number.isSafeInteger(c.startedRevision)||c.startedRevision<0||c.startedRevision>state.系统.revision)throw Error('时钟');
      }catch(error){errors.push(`认知记录${id}${error.message}无效`);}
    }
    for(const s of Object.values(state.状态实例?.列表??{}))if(s.模板ID===COGNITION_ID){
      const p=s.扩展?.认知进程,params=s.快照?.参数;
      const expected=params.改造方式==='立即'?params.改造分钟:Math.min(params.改造分钟,people.now(state)-p?.startedAt);
      if(!p||p.originHash!==cognitionOrigin(s)||p.startedAt!==s.扩展.施加分钟||!Number.isSafeInteger(p.startedRevision)||p.startedRevision<0||p.startedRevision>state.系统.revision||!Number.isSafeInteger(p.startedAt)||p.startedAt>people.now(state)||!Number.isSafeInteger(p.storyTurn)||p.storyTurn<0||p.storyTurn>=Number(state.扩展?.story?.nextTurn??1)||p.processedMinutes!==expected||p.completed!==(expected===params.改造分钟)||p.completed!==Boolean(state.扩展?.cognitionChanges?.[`${s.id}:cognition`])||(p.completed?p.nextAt!==null:p.nextAt!==p.startedAt+p.processedMinutes+1||p.nextAt<=people.now(state)))errors.push(`认知进程${s.id}无效`);
    }
    return [...errors,...(globalThis.SoulPersonRewrite?.validate(state)??[]),...(globalThis.SoulPersonTools?.validate(state)??[])];
  }
  function autonomyAt(state,id,at=people.now(state),order=Infinity){const p=personId(state,id),puppet=Object.values(state.扩展?.controlEpisodes??{}).some(r=>r.targetId===p&&r.kind==='status.mind_control'&&(r.appliedAt<at||r.appliedAt===at&&r.appliedOrder<order)&&(!r.endedOrder||r.endedAt>at||r.endedAt===at&&r.endedOrder>=order));return {puppet,canDecide:!puppet,canSpeak:!puppet};}
  return Object.freeze({personId,consciousnessIds,autonomyAt,CONTROL_IDS,COGNITION_ID,DOMAINS,ORDER_ACTIONS,controlled,autonomy,voluntaryReason,assertVoluntary,autonomyReason,autonomyBlockProof,validAutonomyBlockProof,withCommand,commandIntent,authority,issueBattleOrder,pendingOrder,beginOrder,completeOrder,reconcileOrders,onApplied,onRemoved,nextAt,advanceAt,cognition,facts,validate});
});
