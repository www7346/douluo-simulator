(function attachBattleMechanics(root,factory){
  const abilities=root?.SoulAbilityContract??(typeof require==='function'?require('./ability-contract-core.js'):null);
  const controls=root?.SoulControlCore??(typeof require==='function'?require('./control-core.js'):null);
  const api=factory(abilities,controls);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.SoulBattleMechanics=api;
})(typeof globalThis!=='undefined'?globalThis:this,function createBattleMechanics(abilities,controls){
  'use strict';
  const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
  const integer=(value,min=0,max=1000000)=>Number.isSafeInteger(value)&&value>=min&&value<=max;
  function original(skill){return ['copied','summoned-copy'].includes(skill?.sourceKind)?skill.扩展?.copyOrigin?.source??null:skill;}
  function scope(skill){const s=original(skill);return s&&(s.sourceMartialSoulId||s.来源武魂ID||s.sourceItemId||s.sourceNativeOriginId||s.sourceBeastProfileId||s.id)||'';}
  function owner(state,actor,skill){
    if(skill?.sourceKind!=='summoned-copy')return actor;
    const sourceId=globalThis.SoulCombatDeployments?.sourceContext(state,actor.id)?.quotaOwnerId??actor?.扩展?.召唤?.来源单位ID;
    const source=state.战斗单位?.列表?.[sourceId];
    if(!source||skill.扩展?.copiedFromUnitId!==sourceId||actor.扩展.召唤.战斗ID!==state.战斗.id)throw Error('召唤贡献来源不完整');
    return source;
  }
  function passiveItemSource(item){
    const graph=item?.payload?.passiveEffectGraph;
    if(!graph?.nodes?.some(n=>n.effectId==='status.battle_resource'))return null;
    return {id:'item-passive:'+item.id,name:item.name,sourceKind:item.type==='魂骨'?'soul-bone':'soul-device',sourceItemId:item.id,effectGraph:graph,immutableHash:abilities.hash(graph)};
  }
  function sources(state,holder,allowed=()=>true){
    const rows=[];
    for(const id of holder.能力?.技能ID??[]){const source=state.技能?.列表?.[id];
      if(!source||!allowed(holder,source))continue;
      rows.push(source);
    }
    const config=state.装备?.配置?.[holder.id],ids=new Set([...Object.values(config?.slots??{}),...Object.values(config?.soulBoneSlots??{})].filter(Boolean));
    for(const id of ids){const item=state.物品?.实例?.[id];
      if(!item||item.ownerEntityId!==holder.id||Number(item.quantity)<=0||!['魂骨','魂导器'].includes(item.type)||item.type==='魂骨'&&item.boundToEntityId!==holder.id||!controls.itemEffectsAllowed(state,holder.id,item))continue;
      const source=passiveItemSource(item);if(source&&allowed(holder,source))rows.push(source);
    }
    return rows;
  }
  function descriptors(state,actor,skill,allowed=()=>true){
    const holder=owner(state,actor,skill),sourceScope=scope(skill),rows=[];
    for(const source of sources(state,holder,allowed)){
      if(scope(source)!==sourceScope)continue;
      for(const node of source.effectGraph?.nodes??[])if(node.effectId==='status.battle_resource')rows.push({holder,source,node,key:holder.id+':'+sourceScope+':'+node.params.资源槽});
    }
    return rows;
  }
  function readPool(state,actor,skill,slot,allowed){
    const rows=descriptors(state,actor,skill,allowed).filter(row=>row.node.params.资源槽===slot);
    if(rows.length>1)throw Error('同一能力来源的战斗资源槽重复声明');
    const row=rows[0];if(!row)return null;
    const params=row.node.params;
    if(!integer(params.资源槽,1,32)||!integer(params.容量,1,1000000)||!Array.isArray(params.事件规则))throw Error('战斗资源池合同无效');
    const stored=state.战斗?.扩展?.通用战斗资源?.[row.key];
    if(stored&&(stored.ownerId!==row.holder.id||stored.battleId!==state.战斗.id||stored.sourceSkillId!==row.source.id||stored.sourceHash!==(row.source.immutableHash??'')||JSON.stringify(stored.rules)!==JSON.stringify(params)||!integer(stored.value,0,params.容量)))throw Error('战斗资源池来源或数量不一致');
    return {...row,params,stored,value:stored?.value??0};
  }
  function materialize(state,row){
    state.战斗.扩展.通用战斗资源??={};
    return state.战斗.扩展.通用战斗资源[row.key]??={version:1,battleId:state.战斗.id,ownerId:row.holder.id,sourceSkillId:row.source.id,sourceHash:row.source.immutableHash??'',sourceProof:clone(row.source),rules:clone(row.params),value:0,lastActionId:'',events:{}};
  }
  function event(state,actor,skill,kind,slot,amount,actionId,targetId='',allowed){
    if(!integer(slot,1,32)||!integer(amount)||!actionId)return [];
    const updates=[];
    const slots=[...new Set(descriptors(state,actor,skill,allowed).map(row=>row.node.params.资源槽))];
    for(const poolSlot of slots){const row=readPool(state,actor,skill,poolSlot,allowed);if(!row)continue;
      const matches=row.params.事件规则.filter(rule=>rule.事件===kind&&rule.事件槽===slot);
      if(!matches.length)continue;
      const stored=materialize(state,row);
      if(stored.lastActionId!==actionId){stored.lastActionId=actionId;stored.events={};}
      const key=kind+':'+slot+':'+(kind==='action-hit'?targetId:'');
      if(stored.events[key])continue;
      stored.events[key]=true;
      const increment=matches.reduce((sum,rule)=>sum+(rule.数量==='实际'?amount:Number(rule.数量??0)),0);
      if(!integer(increment))throw Error('战斗资源累计数量无效');
      const before=stored.value;stored.value=Math.min(row.params.容量,before+increment);
      updates.push({poolId:row.key,ownerId:row.holder.id,resourceSlot:poolSlot,event:kind,eventSlot:slot,targetId,offered:increment,gained:stored.value-before,before,after:stored.value});
    }
    return updates;
  }
  function consume(state,actor,skill,slot,minimum,allowed){
    const row=readPool(state,actor,skill,slot,allowed);
    if(!row||row.value<minimum)throw Error('本场累计资源不足');
    const stored=materialize(state,row),amount=stored.value;stored.value=0;
    return {poolId:row.key,ownerId:row.holder.id,resourceSlot:slot,amount};
  }
  function checkModifier(statuses,kind,consume){
    let total=0;const sources=[];
    for(const status of statuses){const p=status.快照?.参数??{};
      if(status.模板ID!=='status.next_check_penalty'||p.检定!==kind||Number(status.扩展?.剩余次数??0)<=0)continue;
      total+=Number(p.数值??0);sources.push({statusId:status.id,value:Number(p.数值??0)});
      if(consume)status.扩展.剩余次数--;
    }
    return {total,sources};
  }
  function validate(state,pendingReceipt=null){
    const errors=[];
    for(const [key,row]of Object.entries(state.战斗?.扩展?.通用追击额度??{}))if(!row||!state.战斗单位?.列表?.[row.unitId]||typeof row.scope!=='string'||!row.scope||!integer(row.slot,1,8)||!integer(row.round,1,state.战斗.回合)||!integer(row.used,0,3)||key!==JSON.stringify([row.unitId,row.scope,row.slot]))errors.push('本回合追击额度无效：'+key);
    for(const [id,row] of Object.entries(state.战斗?.扩展?.通用战斗资源??{}))try{
      const holder=state.战斗单位?.列表?.[row.ownerId],source=row.sourceProof;
      const itemSource=source?.id?.startsWith('item-passive:');
      if(!source||source.id!==row.sourceSkillId||(itemSource?source.sourceItemId!==source.id.slice(13)||source.immutableHash!==abilities.hash(source.effectGraph):!abilities.verify(source).pass||source.持有者单位ID&&source.持有者单位ID!==holder?.id))throw Error('冻结来源证明');
      const node=source?.effectGraph?.nodes?.find(n=>n.effectId==='status.battle_resource'&&n.params.资源槽===row.rules?.资源槽);
      if(row?.version!==1||row.battleId!==state.战斗.id||!holder||!source||!node||source.immutableHash!==row.sourceHash||JSON.stringify(node.params)!==JSON.stringify(row.rules)||id!==holder.id+':'+scope(source)+':'+row.rules.资源槽||!integer(row.value,0,row.rules?.容量)||typeof row.lastActionId!=='string'||!row.events||typeof row.events!=='object'||Array.isArray(row.events)||Object.keys(row.events).length>2048||Object.values(row.events).some(v=>v!==true))throw Error('来源或数量');
      const receipts=Object.values(state.战斗.扩展.已结算行动??{});
      if(pendingReceipt&&!receipts.some(r=>r.id===pendingReceipt.id))receipts.push(pendingReceipt);
      let value=0;
      for(const receipt of receipts){const seen=new Set();for(const event of receipt.battleResourceEvents??[])if(event.poolId===id){
        if(event.ownerId!==row.ownerId||event.resourceSlot!==row.rules.资源槽)throw Error('事件归属');
        if(event.event==='consume-all'){if(!integer(event.amount)||event.amount!==value)throw Error('消费证据');value=0;}
        else{
          const rules=row.rules.事件规则.filter(r=>r.事件===event.event&&r.事件槽===event.eventSlot),key=event.event+':'+event.eventSlot+':'+(event.event==='action-hit'?event.targetId:'');
          if(!rules.length||seen.has(key)||!integer(event.offered)||!integer(event.before,0,row.rules.容量)||!integer(event.after,0,row.rules.容量)||!integer(event.gained)||!rules.some(r=>r.数量==='实际')&&event.offered!==rules.reduce((sum,r)=>sum+r.数量,0)||event.before!==value||event.after!==Math.min(row.rules.容量,value+event.offered)||event.gained!==event.after-event.before)throw Error('累计证据');
          seen.add(key);value=event.after;
        }
      }}
      if(value!==row.value)throw Error('累计与行动证据不一致');
    }catch(error){errors.push('战斗资源池合同无效：'+id+' '+error.message);}
    return errors;
  }
  return Object.freeze({version:1,original,scope,owner,sources,descriptors,readPool,event,consume,checkModifier,validate});
});
