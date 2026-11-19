(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulSupportCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const METRICS=['力量','身法','体魄','悟性','感知','意志','移动区','魂技DC','攻击检定','物理防御','魂技防御','物理伤害','魂技伤害','治疗','护盾','攻击伤害','属性伤害','伤害减免'];
 const clone=v=>JSON.parse(JSON.stringify(v));
 const live=(s,id)=>globalThis.SoulControlCore?.active(s,id)??Object.values(s.状态实例?.列表??{}).filter(x=>x.目标单位ID===id&&x.状态!=='已结束');
 const soulId=skill=>skill?.sourceMartialSoulId??skill?.来源武魂ID??'';
 const maintain=skill=>skill?.effectGraph?.nodes?.find(n=>n.effectId==='sustain.maintain'&&n.params?.计费方式==='逐目标');
 const instantFee=skill=>Number(skill?.effectGraph?.nodes?.find(n=>n.effectId==='target.allies')?.params?.每目标魂力??0);
 const chargesByTarget=skill=>Boolean(maintain(skill)||instantFee(skill));
 const configurable=skill=>Boolean(maintain(skill)&&skill.effectGraph.nodes.some(n=>n.effectId==='target.allies')&&!skill.effectGraph.nodes.some(n=>n.family==='domain'));
 function sourceSkill(s,sourceId,skillId=''){return s.技能?.列表?.[skillId]??Object.values(s.状态实例?.列表??{}).find(x=>x.来源?.结算单ID===sourceId&&x.扩展?.持续来源合同)?.扩展.持续来源合同;}
 function rings(s,id){return (s.武魂?.列表?.[id]?.魂环ID列表??[]).filter(id=>s.魂环?.列表?.[id]).length;}
 function value(s,status){const inherited=status.扩展?.持续来源合同?.扩展?.copyOrigin?.source,sourceSoulId=inherited?.sourceMartialSoulId??inherited?.来源武魂ID;const p=status.快照?.参数??{},base=p.成长序列?p.成长序列[Math.max(0,Math.min(8,rings(s,sourceSoulId||status.来源?.武魂ID)-1))]:Number(p.数值??0);return Math.floor(base*Number(status.扩展?.增幅输出比例??1));}
 function snapshotHash(status){return globalThis.SoulAbilityContract.hash({source:status.来源,params:status.快照?.参数,contract:status.扩展?.持续来源合同,scale:status.扩展?.增幅输出比例,element:status.扩展?.加持属性});}
 function applies(status,skill){return status.快照?.参数?.作用范围!=='同源武魂'||!!(soulId(skill)&&soulId(skill)===status.来源?.武魂ID);}
 function aggregate(s,rows){const sources=new Map();let highest=0;for(const row of rows){const n=value(s,row);if(row.快照?.参数?.叠加方式==='同源相加'){const key=JSON.stringify([row.来源?.单位ID,row.来源?.武魂ID,row.来源?.技能ID]);sources.set(key,Math.max(sources.get(key)??0,n));}else highest=Math.max(highest,n);}return highest+[...sources.values()].reduce((a,b)=>a+b,0);}
 function stat(s,id,metric,skill=null){return aggregate(s,live(s,id).filter(x=>x.模板ID==='status.amplify'&&x.快照?.参数?.指标===metric&&applies(x,skill)));}
 function strongestElements(s,id){
  const prototype=globalThis.SoulCombatDeployments?.sourceContext(s,id)?.prototypeId;
  const soul=globalThis.SoulCombatFoundation?.activeMartialSoul(s,id)??(prototype?globalThis.SoulCombatFoundation?.activeMartialSoul(s,prototype):null),spectrum=soul?.属性谱??{},strength=spectrum.强度??spectrum.契合??{};
  const entries=Object.entries(strength).filter(([key,v])=>Number(v)>0);
  const maximum=Math.max(0,...entries.map(([,v])=>Number(v)));
  return [...new Set((entries.length?entries.filter(([,v])=>Number(v)===maximum).map(([key])=>key):spectrum.主属性??[]).map(t=>globalThis.SoulCombatFoundation.canonicalDamageType(t)))];
 }
 function percent(s,id,kind,type='',skill=null){
  const isRing=Boolean(skill?.sourceRingId||skill?.来源魂环ID||skill?.ringOrdinal),metrics=kind==='damage'?['物理伤害','魂技伤害','攻击伤害','属性伤害']:kind==='heal'?['治疗']:kind==='shield'?['护盾']:['伤害减免'];
  const physical=globalThis.SoulCombatFoundation?.damageTypeFamily(type)==='物理',attack=Boolean(skill?.effectGraph?.nodes?.some(n=>['check.physical_attack','check.soul_attack'].includes(n.effectId))||['ordinary.attack','basic.attack','martial.base'].includes(skill?.id));
  const total=metrics.reduce((sum,metric)=>{
   if(metric==='物理伤害'&&!physical||metric==='魂技伤害'&&!isRing||metric==='攻击伤害'&&!attack)return sum;
   const rows=live(s,id).filter(x=>x.模板ID==='status.amplify'&&x.快照?.参数?.指标===metric&&applies(x,skill)&&(metric!=='属性伤害'||(x.快照?.参数?.伤害属性??x.扩展?.加持属性)===globalThis.SoulCombatFoundation.canonicalDamageType(type)));
   return sum+aggregate(s,rows);
  },0);
  return kind==='reduction'?Math.min(globalThis.SoulEffectCompiler.DESIGN_BALANCE_POLICY.maximumSustainedReduction,Math.max(0,total)):total;
 }
 function avatar(s,id,skill){return live(s,id).find(x=>x.模板ID==='transform.martial_avatar'&&x.来源?.武魂ID===soulId(skill));}
 function range(s,id,skill){return Number(maintain(skill)?.params?.维持距离区??0)+Number(avatar(s,id,skill)?.快照?.参数?.同源射程增幅??0);}
 function factor(s,id,skill,phase){return 1-Number(avatar(s,id,skill)?.快照?.参数?.[phase==='activation'?'同源启动减耗百分比':'同源维持减耗百分比']??0)/100;}
 function statuses(s,id,skillId){return Object.values(s.状态实例?.列表??{}).filter(x=>x.来源?.单位ID===id&&x.来源?.技能ID===skillId&&x.持续?.模式==='来源维持');}
 function targetIds(s,id,skillId,sourceId=''){return [...new Set([...statuses(s,id,skillId).filter(x=>!sourceId||x.来源?.结算单ID===sourceId).map(x=>x.目标单位ID),...Object.values(s.战斗?.扩展?.领域实例??{}).filter(d=>d.来源?.单位ID===id&&d.来源?.技能ID===skillId&&(!sourceId||d.来源?.结算单ID===sourceId)).flatMap(d=>d.扩展?.选择目标ID列表??[])])];}
 function activation(s,id,skill,targets,elements={}){const node=maintain(skill),fee=instantFee(skill);if(!node&&!fee)return null;const old=node?targetIds(s,id,skill.id):[],modifiers=s.战斗单位?.列表?.[id]?.扩展?.武魂战斗修正??{};
  const changed=t=>elements[t]&&statuses(s,id,skill.id).some(x=>x.目标单位ID===t&&x.快照?.参数?.指标==='属性伤害'&&x.扩展?.加持属性!==elements[t]);
  return Math.ceil(targets.filter(t=>!old.includes(t)||changed(t)).length*Number(node?.params.启动魂力??(node?2:fee))*factor(s,id,skill,'activation')*Math.max(1,Math.min(3,Number(modifiers.魂力消耗倍率??1)))*(1-Math.max(0,Math.min(.3,Number(modifiers.魂力折扣??0)))));
 }
 function fixedActivation(skill){const node=skill?.effectGraph?.nodes?.find(n=>Object.hasOwn(n.params??{},'发动魂力'));return node?Number(node.params.发动魂力):null;}
 function sourceRows(s,id){return Object.values(s.扩展?.abilityMaintenance??{}).filter(e=>e.actorId===id&&maintain(sourceSkill(s,e.id,e.skillId)));}
 function upkeep(s,id,skill,targets){const modifiers=s.战斗单位?.列表?.[id]?.扩展?.武魂战斗修正??{};return targets.length?Math.max(0,targets.length*Number(maintain(skill)?.params?.每回合魂力??0)+Number(modifiers.维持额外消耗??0)-Number(modifiers.维持减耗??0))*factor(s,id,skill,'upkeep'):0;}
 // Round once for all same-actor support sources. Allocating the rounded total
 // back to existing ledgers preserves the single authoritative payment system.
 function refreshCosts(s){
  const ledger=s.战斗?.扩展?.维持占用??{};
  for(const id of Object.keys(s.战斗单位?.列表??{})){
   let previous=0,cumulative=0;
   const entries=Object.entries(ledger).filter(([,e])=>e.unitId===id&&e.perTarget).sort(([a],[b])=>a.localeCompare(b,'en-US'));
   for(const [,entry]of entries){
    const skill=sourceSkill(s,entry.sourceId,entry.skillId),targets=targetIds(s,id,entry.skillId,entry.sourceId);
    cumulative+=upkeep(s,id,skill,targets);const next=Math.ceil(cumulative)-previous;previous+=next;
    globalThis.SoulCombatDeployments.soulPowerResource(s,id).持续消耗+=next-entry.upkeep;entry.upkeep=next;
    if(entry.domainId&&s.战斗.扩展.领域实例?.[entry.domainId]?.维持)s.战斗.扩展.领域实例[entry.domainId].维持.每回合魂力=next;
   }
  }
 }
 function describe(s,id){
  const actor=s.战斗单位?.列表?.[id];if(!actor||s.战斗?.状态!=='进行中')return {skills:[],targets:[],sources:[],upkeep:0,locked:0};
  const member=s.战斗.扩展.成员?.[id];
  const skills=(actor.能力?.技能ID??[]).map(k=>s.技能.列表[k]).filter(k=>configurable(k)&&(!soulId(k)||soulId(k)===globalThis.SoulCombatFoundation.activeMartialSoulId(s,id)));
  const targets=(s.战斗.参与者ID列表??[]).filter(k=>s.战斗.扩展.成员?.[k]?.status==='active'&&s.战斗.扩展.成员[k].sideId===member?.sideId&&s.战斗单位.列表[k]?.资源.生命.当前>0).map(k=>{
   const unit=s.战斗单位.列表[k],distance=globalThis.SoulCombatEngine.combatDistance(actor,unit);
   return {id:k,name:unit.名称,life:clone(unit.资源.生命),soulPower:clone((globalThis.SoulCombatDeployments.soulPowerResource(s,unit.id))),distance,elements:strongestElements(s,k),activeSkillIds:skills.filter(sk=>targetIds(s,id,sk.id).includes(k)).map(sk=>sk.id)};
  });
  const sources=sourceRows(s,id).filter(e=>skills.some(k=>k.id===e.skillId)).map(e=>{const skill=sourceSkill(s,e.id,e.skillId),ids=targetIds(s,id,skill.id),rows=Object.values(s.战斗.扩展.维持占用??{}).filter(r=>r.sourceId===e.id);return {id:e.id,skillId:skill.id,name:skill.name??skill.名称,targetIds:ids,elements:Object.fromEntries(statuses(s,id,skill.id).filter(x=>x.快照?.参数?.指标==='属性伤害').map(x=>[x.目标单位ID,x.扩展.加持属性])),locked:rows.reduce((n,r)=>n+r.lock,0),upkeep:rows.reduce((n,r)=>n+r.upkeep,0)};});
  return {skills:skills.map(sk=>({id:sk.id,name:sk.name,range:range(s,id,sk),locked:Number(maintain(sk).params.锁定魂力),activationPerTarget:Number(maintain(sk).params.启动魂力)*factor(s,id,sk,'activation'),upkeepPerTarget:Number(maintain(sk).params.每回合魂力)*factor(s,id,sk,'upkeep'),effects:sk.effectGraph.nodes.filter(n=>n.effectId==='status.amplify').map(n=>({metric:n.params.指标,value:value(s,{快照:{参数:n.params},来源:{武魂ID:soulId(sk)}})}))})),targets,sources,upkeep:sources.reduce((n,e)=>n+e.upkeep,0),locked:sources.reduce((n,e)=>n+e.locked,0)};
 }
 function validate(s){
  const errors=[];
  for(const status of Object.values(s.状态实例?.列表??{}).filter(x=>x.模板ID==='status.amplify'||['来源维持','来源下回合'].includes(x.持续?.模式))){
   const skill=status.扩展?.持续来源合同??s.技能?.列表?.[status.来源?.技能ID],node=skill?.effectGraph?.nodes?.find(n=>n.id===status.来源?.效果ID);
   if(!skill||!globalThis.SoulAbilityContract.verify(skill).pass||!node||node.effectId!==status.模板ID||globalThis.SoulAbilityContract.hash(node.params)!==globalThis.SoulAbilityContract.hash(status.快照?.参数))errors.push('持续加持来源或数值不一致：'+status.id);
   if(status.模板ID==='status.amplify'&&(!Number.isFinite(status.扩展?.增幅输出比例)||status.扩展.增幅输出比例<.2||status.扩展.增幅输出比例>3||status.扩展?.增幅快照指纹!==snapshotHash(status)))errors.push('持续加持输出快照不一致：'+status.id);
   if(status.持续?.模式==='来源维持'&&!s.扩展?.abilityMaintenance?.[status.来源?.结算单ID])errors.push('持续加持缺少实际维持来源：'+status.id);
  }
  return errors;
 }
 return Object.freeze({METRICS,rings,value,stat,percent,maintain,instantFee,chargesByTarget,configurable,range,factor,statuses,targetIds,activation,fixedActivation,refreshCosts,strongestElements,describe,soulId,sourceRows,sourceSkill,upkeep,snapshotHash,validate});
});
