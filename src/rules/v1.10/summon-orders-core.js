(function(root,factory){
  const api=factory(root);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.SoulSummonOrders=api;
})(globalThis,function(root){
  'use strict';
  const units=s=>s.战斗单位.列表;
  function destinations(s,actorId,range){
    const pos=root.SoulScenePosition.positionOf(s,actorId);
    if(pos.kind!=='location')return [];
    const owner=units(s)[actorId]?.扩展?.召唤?.来源单位ID??actorId;
    const expedition=root.SoulExpeditionContext.forActor(s,owner);
    if(expedition&&pos.sceneId.startsWith('expedition:'+expedition.id+':')){
      const current=expedition.currentNodeId;
      const adjacent=!range?[]:current?expedition.map.edges.filter(e=>e.from===current).map(e=>e.to):['L1-N1'];
      return [...new Set([current,...adjacent])].filter(id=>expedition.map.nodes[id]).map((id,i)=>({id,name:id===current?'当前房间':'相邻房间 '+id,observation:expedition.map.nodes[id].type,position:{...pos,sceneId:'expedition:'+expedition.id+':'+id}}));
    }
    const ids=new Set([pos.locationId]);
    if(range&&!pos.sceneId)for(const edge of Object.values(s.地图.路线)){
      if(edge.from===pos.locationId)ids.add(edge.to);
      if(edge.bidirectional!==false&&edge.to===pos.locationId)ids.add(edge.from);
    }
    return [...ids].filter(id=>s.地图.地点[id]).map(id=>({id,name:pos.sceneId?'当前场景':s.地图.地点[id].name??id,position:{...pos,locationId:id}}));
  }
  function destination(s,actorId,node,id){
    if(root.SoulControlCore.restrictions(s,actorId).blocked.vision?.length)throw Error('施术者当前无法观察');
    const choices=destinations(s,actorId,node.params.道路距离);
    const place=id?choices.find(x=>x.id===id):choices[0];
    if(!place)throw Error('侦察地点超出范围');
    return place;
  }
  function observe(s,actorId,node,id){
    const place=destination(s,actorId,node,id);
    const owner=units(s)[actorId].扩展?.召唤?.来源单位ID??actorId;
    const observations=place.observation?['地形情报 · '+place.observation]:[];
    for(const r of Object.values(s.遭遇?.列表??{})){
      if(observations.length>=node.params.最大情报)break;
      if(r.状态==='待判定'&&!r.battleId&&r.position&&root.SoulScenePosition.sameScene(place.position,r.position))observations.push('发现尚在当地的遭遇踪迹');
    }
    for(const p of Object.values(s.人物.列表)){
      if(observations.length>=node.params.最大情报)break;
      if(p.id===owner||p.status==='dead'||p.locationId!==place.position.locationId||!units(s)[p.id]||root.SoulCombatEngine.activeStatuses(s,p.id,'status.invisibility').length)continue;
      if(root.SoulScenePosition.sameScene(place.position,root.SoulScenePosition.positionOf(s,p.id)))observations.push('看见'+root.SoulPersonPresentation.presentation(s,p.id,owner).name);
    }
    if(!observations.length)observations.push('巡查范围内未见人物或遭遇踪迹');
    const report={sourceUnitId:actorId,destinationId:place.id,place:place.name,observations,at:root.SoulPersonCore.now(s)};
    (s.扩展.scoutingReports??={})[owner]=report;
    return report;
  }
  function controlled(s,owner,id){
    const unit=units(s)[id],summon=unit?.扩展?.召唤;
    if(!summon?.接受指令||summon.来源单位ID!==owner||unit.存活状态==='死亡'||unit.资源.生命.当前<=0)return false;
    if(s.战斗.状态==='进行中')return root.SoulCombatEngine.isActiveParticipant(s,id)&&root.SoulCombatEngine.isActiveParticipant(s,owner)&&root.SoulCombatEngine.sameSide(s,unit,units(s)[owner]);
    return !!root.SoulCreationCore.constructs(s).find(r=>r.unitId===id&&r.status==='active')&&root.SoulScenePosition.colocated(s,owner,id);
  }
  function arts(s,u){return u.能力.技能ID.map(id=>s.技能.列表[id]).filter(Boolean);}
  function castOptions(s,u){
    const result=[],engine=root.SoulCombatEngine;
    for(const id of u.扩展.召唤.天生技能ID??[]){
      const skill=s.技能.列表[id];
      if(!skill||skill.effectGraph.nodes.some(n=>root.SoulEffectCompiler.EFFECT_REGISTRY[n.effectId]?.allowedContexts?.every(c=>c!=='battle')))continue;
      for(const targetId of s.战斗.参与者ID列表){
        if(!engine.isActiveParticipant(s,targetId)||skill.effectGraph.nodes.some(n=>n.effectId==='target.self')&&targetId!==u.id||targetId===u.id&&skill.effectGraph.nodes.some(n=>n.effectId==='reaction.interpose'))continue;
        try{const picked=engine.resolveTargets(s,u,skill,{targetIds:[targetId]});if(picked.includes(targetId)&&engine.skillCastAvailability(s,u,skill,{targetIds:[targetId]}).available)result.push({skillId:id,name:skill.name,targetId,targetName:root.SoulPersonPresentation.presentation(s,targetId,u.扩展.召唤.来源单位ID).name});}catch{/* Currently out of reach or ineligible. */}
      }
    }
    return result;
  }
  function facts(s,owner=s.角色.主控单位ID){
    const combat=s.战斗.状态==='进行中';
    const candidates=combat?s.战斗.参与者ID列表:root.SoulCreationCore.constructs(s).filter(r=>r.status==='active'&&r.kind==='summon').map(r=>r.unitId);
    const members=candidates.filter(id=>controlled(s,owner,id)).map(id=>{
      const unit=units(s)[id],skills=arts(s,unit),scout=skills.find(k=>k.effectGraph.nodes.some(n=>n.effectId==='payload.recon'));
      const targets=combat?s.战斗.参与者ID列表.filter(x=>x!==id&&root.SoulCombatEngine.isActiveParticipant(s,x)).map(x=>({id:x,name:root.SoulPersonPresentation.presentation(s,x,owner).name,ally:root.SoulCombatEngine.sameSide(s,unit,units(s)[x])})):[];
      return {id,name:unit.名称,casts:combat?castOptions(s,unit):[],skills:skills.map(k=>k.name),order:combat&&unit.扩展.召唤.指令?.battleId===s.战斗.id?unit.扩展.召唤.指令:null,targets,canGuard:skills.some(k=>k.effectGraph.nodes.some(n=>n.effectId==='reaction.interpose')),places:!combat&&scout?destinations(s,id,scout.effectGraph.nodes.find(n=>n.effectId==='payload.recon').params.道路距离).map(({id,name})=>({id,name})):[]};
    });
    return {members,report:s.扩展.scoutingReports?.[owner]??null};
  }
  function issue(s,owner,p,commandId){
    if(!controlled(s,owner,p.unitId))throw Error('请选择自己在场的召唤物');
    const unit=units(s)[p.unitId],combat=s.战斗.状态==='进行中',engine=root.SoulCombatEngine;
    root.SoulActionContext.resolve(s,{actorId:owner,battleId:combat?s.战斗.id:null});
    if(units(s)[owner].资源.生命.当前<=0||['status.sleep','status.stun'].some(k=>engine.activeStatuses(s,owner,k).length))throw Error('清醒时才能指挥召唤物');
    if(p.mode==='scout'&&!combat){
      const skill=arts(s,unit).find(k=>k.effectGraph.nodes.some(n=>n.effectId==='payload.recon'));
      if(!skill)throw Error('召唤物没有侦察能力');
      const expedition=root.SoulExpeditionContext.forActor(s,owner);
      if(expedition&&!['awaiting-room','interaction','postcombat'].includes(expedition.phase))throw Error('先完成当前房间的战斗或结算');
      const result=engine.activateFieldAbility(s,unit.id,skill.id,unit.id,commandId,undefined,{reconLocationId:p.destinationId});
      root.SoulWorldEngine.advanceTime(result.state,1);
      return result;
    }
    if(!combat||!['guard','focus','free','cast'].includes(p.mode))throw Error('请选择当前可用的召唤指令');
    if(p.mode==='free')delete unit.扩展.召唤.指令;
    else if(p.mode==='cast'){
      if(!castOptions(s,unit).some(c=>c.skillId===p.skillId&&c.targetId===p.targetId))throw Error('招式或目标当前不可用');
      unit.扩展.召唤.指令={mode:'cast',skillId:p.skillId,targetId:p.targetId,battleId:s.战斗.id};
    }else{
      if(!engine.isActiveParticipant(s,p.targetId)||p.unitId===p.targetId||engine.sameSide(s,unit,units(s)[p.targetId])!==(p.mode==='guard'))throw Error('指令目标阵营或在场状态不符');
      if(p.mode==='guard'&&!arts(s,unit).some(k=>k.effectGraph.nodes.some(n=>n.effectId==='reaction.interpose')))throw Error('召唤物没有代挡能力');
      unit.扩展.召唤.指令={mode:p.mode,targetId:p.targetId,battleId:s.战斗.id};
    }
    return {state:s,receipt:{type:'summon-order',unitId:unit.id,mode:p.mode,targetId:p.targetId,summary:unit.名称+'已收到指令'}};
  }
  return Object.freeze({destinations,destination,observe,facts,issue});
});
