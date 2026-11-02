(function(root,factory){const data=root?.SoulSkillCopyData??(typeof require==='function'?require('./skill-copy-data.js'):null),display=root?.SoulEffectDisplay??(typeof require==='function'?require('./effect-display-data.js'):null);const api=factory(data,display);if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulSkillProse=api;})(typeof globalThis!=='undefined'?globalThis:this,function(data,display){
 'use strict';
 const nodesOf=skill=>skill?.effectGraph?.nodes??skill?.graph?.nodes??skill?.效果图?.nodes??(skill?.effectSpecs??skill?.frozenEffectSpecs??skill?.requestedEffects??skill?.requestedBranches?.flatMap(b=>b.requestedEffects??[])??[]).map(([effectId,params])=>({effectId,params}));
 const subset=(expected,actual)=>expected&&typeof expected==='object'?Array.isArray(expected)?Array.isArray(actual)&&expected.length===actual.length&&expected.every((v,i)=>subset(v,actual[i])):actual&&Object.entries(expected).every(([k,v])=>subset(v,actual[k])):expected===actual;
 function matches(entry,skill){
  const nodes=nodesOf(skill),graph=skill?.effectGraph??skill?.graph??skill?.效果图;
  if(!entry?.mechanicalShape)return false;
  const branches=graph?.branches?.length?graph.branches.map(b=>({activation:b.activation??'active',optional:!!b.optional,effects:(b.nodeIds??b.nodes?.map(n=>n.id)??[]).map(id=>nodes.find(n=>n.id===id)).filter(Boolean)})):[{activation:'active',optional:false,effects:nodes}];
  return entry.mechanicalShape.length===branches.length&&entry.mechanicalShape.every((b,i)=>b.activation===branches[i].activation&&b.optional===branches[i].optional&&b.effects.length===branches[i].effects.length&&b.effects.every((n,j)=>n.effectId===branches[i].effects[j].effectId&&subset(n.params,branches[i].effects[j].params??{})));
 }
 function preset(id){return data?.presets?.[id]??null;}
 function variant(entry,skill){return entry?.variants?.find(v=>v.name===(skill.name??skill.名称)&&matches(v,skill))??(entry?.variants?.length===1&&matches(entry.variants[0],skill)?entry.variants[0]:null);}
 const sourceNames=new Map(data.actual.filter(v=>v.presetId&&v.sourceSoulName).map(v=>[v.presetId,v.sourceSoulName]));
 function authored(skill,state){
  // Copies are interpreted from their own current graph; a source name never grants its prose.
  if(['copied','summoned-copy'].includes(skill?.sourceKind))return null;
  const flower=globalThis.SoulBegoniaContent?.authored(skill,state);if(flower)return flower;
  const wing=globalThis.SoulRoyalSwanContent?.authored(skill,state);if(wing)return wing;
  const refined=globalThis.SoulCanonicalWomenContent?.authored(skill,state);if(refined)return refined;
  const actualSoul=state?.武魂?.列表?.[skill?.sourceMartialSoulId??skill?.来源武魂ID];
  const expectedSoulName=sourceNames.get(skill?.presetId);
  const direct=(!actualSoul?.名称||!expectedSoulName||actualSoul.名称===expectedSoulName)?variant(preset(skill?.presetId),skill):null;if(direct)return direct.description;
  const recordId=state?.战斗单位?.列表?.[skill?.持有者单位ID]?.扩展?.角色库ID??state?.人物?.列表?.[skill?.持有者单位ID]?.扩展?.角色库ID??skill?.扩展?.recordId;
  if(recordId){
   const exact=data.actual.find(v=>!v.presetId&&v.recordId===recordId&&v.name===(skill.name??skill.名称)&&matches(v,skill));if(exact)return exact.description;
   // Some authored ring loadouts have a formal holder record but no growth binding.
   const sourceRing=state?.魂环?.列表?.[skill?.sourceRingId??skill?.来源魂环ID];
   const ringOrdinal=sourceRing?.序号??sourceRing?.环序;
   const ownerId=skill?.持有者单位ID;
   const soulIndex=(state?.成长?.列表?.[ownerId]?.武魂ID列表??[]).indexOf(actualSoul?.id)+1;
   if(actualSoul?.名称&&ringOrdinal>0){
    const ref=data.actual.find(v=>v.presetId&&v.recordId===recordId&&v.sourceSoulName===actualSoul.名称&&v.ringOrdinal===ringOrdinal&&(!soulIndex||v.soulIndex===soulIndex)&&v.name===(skill.name??skill.名称));
    const found=ref?variant(preset(ref.presetId),skill):null;if(found)return found.description;
   }
  }
  const soul=state?.武魂?.列表?.[skill?.sourceMartialSoulId??skill?.来源武魂ID],binding=soul?.扩展?.canonicalGrowth;
  const ring=state?.魂环?.列表?.[skill?.sourceRingId??skill?.来源魂环ID];
  const ordinal=ring?.序号??ring?.环序??(soul?.魂环ID列表??[]).indexOf(ring?.id)+1;
  if(binding&&(!soul?.名称||!preset(`canonical:${binding.recordId}:${binding.slot}:${ordinal}`)?.sourceSoulName||soul.名称===preset(`canonical:${binding.recordId}:${binding.slot}:${ordinal}`).sourceSoulName)){const found=variant(preset(`canonical:${binding.recordId}:${binding.slot}:${ordinal}`),skill);if(found)return found.description;
   const own=data.actual.filter(v=>!v.presetId&&v.recordId===binding.recordId&&v.name===(skill.name??skill.名称));const safe=own.find(v=>matches(v,skill));if(safe)return safe.description;
  }
  return null;
 }
const guardNames={'status.poison':'中毒','status.burn':'灼烧','status.stun':'眩晕','status.fear':'恐惧','status.charm':'魅惑','status.mind_control':'精神控制','status.soul_control':'灵魂控制','status.cognition_shift':'认知干涉','status.sleep':'沉睡','status.paralysis':'麻痹','status.desire':'躁动','status.limb_bind':'肢体束缚','status.bind':'移动束缚','status.buff':'能力削弱','status.eternal_wound':'难愈创伤','status.resistance_shift':'属性易伤'};
const text=(value,fallback='')=>typeof value==='string'&&value.trim()?value.trim():fallback;
const n=(p,key,otherwise=0)=>Number.isFinite(Number(p[key]))?Number(p[key]):otherwise;
const labels={伤害加值:'攻击伤害',攻击检定:'出手准头',豁免检定:'抵抗外来影响的能力',物理防御:'物理防护',魂技防御:'魂技防护',移动区:'移动距离',先攻:'抢先出手的机会'};
const stat=value=>labels[value]??text(value,'对应能力');
function purpose(id,p={}){
 switch(id){
  case 'payload.death':return '使目标真正死亡';
  case 'contract.oath':return '双方完全同意后立下灵魂誓约';
  case 'trigger.contract':return `违约或单方解约时发作，每人最多${n(p,'每人次数',1)}次`;
  case 'modifier.world_duration':return `持续效力可达${n(p,'持续分钟')}分钟`;
  case 'realm.capture':return '在战后或场外将符合条件的人物收入独立空间，永久绑定一席';
  case 'realm.store':return `将目标收入独立空间，最多容纳${n(p,'容量',1)}人${n(p,'投影比例')>0?`，允许召出承载本人${n(p,'投影比例')}%力量的投影`:''}${p.真身调遣?'，符合条件时也可调遣真身':''}`;
  case 'realm.deploy':return `召唤第${n(p,'席位',1)}席已经绑定的人物，选择投影或符合条件的真身出战`;
  case 'payload.damage':return `对目标造成${text(p.类型,'相应属性')}伤害${n(p,'穿透档')>0?'，可穿过对应伤害抗性':''}`;
  case 'payload.drain':return `对目标造成${text(p.类型,'相应属性')}伤害，并将部分伤害化为自身生机`;
  case 'payload.restore':{const a=[];if(p.生命模式!=='无'&&n(p,'生命数值')>0)a.push('生命');if(p.魂力模式!=='无'&&n(p,'魂力数值')>0)a.push('魂力');return a.length?`接续体内气息，恢复${a.join('与')}`:'接续体内气息';}
  case 'status.damage_over_time':return `伤处在随后${n(p,'持续回合',2)}回合继续造成${text(p.类型,'对应属性')}伤害`;
  case 'move.step':return `沿可通行路线挪移最多${n(p,'距离区',1)}区，仍受移动限制与墙体阻挡`;
  case 'status.buff':return n(p,'数值')===0?'':`暂时${n(p,'数值')>0?'增强':'削弱'}目标的${stat(p.属性)}`;
  case 'passive.equipment_stat':return n(p,'数值')===0?'':`佩戴时${n(p,'数值')>0?'增强':'削弱'}自身的${stat(p.属性)}`;
  case 'passive.element_amplify':return `佩戴时增强自身造成的${text(p.类型,'对应')}属性伤害`;
  case 'status.resistance_shift':{const t=text(p.类型,'对应属性');return p.模式==='免疫'?`免受${t}属性伤害`:p.模式==='吸收'?`吸收${t}属性伤害，将其化为临时护盾`:p.模式==='易伤'?`使目标受到的${t}属性伤害翻倍`:`减轻受到的${t}属性伤害`;}
  case 'status.status_guard':return p.模式==='免疫'?`免疫新施加的${guardNames[p.防护对象]??'对应负面影响'}`:`帮助目标抵御${guardNames[p.防护对象]??'对应负面影响'}`;
  case 'status.mark':return p.不可隐藏?'留下难以隐去的追踪记号':'留下可供追踪的记号';
  case 'status.power_seal':return `暂时封住目标的${p.封印对象==='精细'?'指定能力':text(p.封印对象,'对应能力')}${p.范围==='当前武魂'?'，只作用于施加时的武魂':''}`;
  case 'status.next_check_penalty':return `扰乱目标的出手，使其下一次${text(p.检定,'对应行动')}受到干扰${p.命中后抵抗?'，目标仍可抵抗这份干扰':''}`;
  case 'status.battle_resource':return `在交锋中积下${text(p.名称,'力量')}，为后续招式蓄势`;
  case 'payload.resource_endstate':return `招式结束后，${p.承担者==='本体'?'本体':'施术者'}仍须承担力竭的代价`;
  case 'status.invisibility':return `隐去身形，避开敌人的直接观察${p.攻击后解除?'，主动攻击后便会显露':''}`;
  case 'copy.skillset':return `让受术者暂时借用另一名选定人物的部分技能${p.排除魂骨&&p.排除领域?'，不包括魂骨与领域':p.排除魂骨?'，不包括魂骨能力':p.排除领域?'，不包括领域':''}`;
  case 'summon.entity':return p.继承能力?`召出可独立行动的${text(p.模板,'助战身影')}，承接自身的一部分能力协同迎敌`:`召出可独立行动的${text(p.模板,'助战身影')}，在短暂同行中分担压力`;
  case 'transform.disguise':{const changes=[p.伪装方式==='高级拟态'?'以拟态改变对外仪容':'以幻象掩饰对外仪容'];if(p.掩饰声音)changes.push('同时改变声线');if(p.掩饰魂息)changes.push('掩藏魂力气息');if(p.武魂伪装)changes.push('为武魂与魂环呈现预设表象');return changes.join('，');}
  case 'transform.form':return p.形态==='石化'?'让目标的身体暂时石化':`将目标的身体变为${text(p.形态,'另一种')}形态`;
  case 'modifier.next_skill':{const a=[];if(n(p,'效果倍率',100)!==100)a.push(`${n(p,'效果倍率',100)>100?'增强':'减弱'}接下来的技能效果`);if(n(p,'魂力消耗倍率',100)!==100)a.push(`${n(p,'魂力消耗倍率',100)>100?'增加':'减少'}接下来的技能耗魂`);if(n(p,'制造速度倍率',100)!==100)a.push(`${n(p,'制造速度倍率',100)>100?'加快':'放慢'}接下来的制造`);if(n(p,'成品效果倍率',100)!==100)a.push(`${n(p,'成品效果倍率',100)>100?'增强':'减弱'}制造成品的能力`);return a.join('，并')||'将力量留待接下来的施术或制造';}
  case 'reaction.reflect':{const a=[];if(n(p,'反射百分比')>0)a.push('将部分符合条件的来袭力量折回');if(n(p,'吸收转护盾百分比')>0)a.push('把部分受击力量凝成护盾');if(n(p,'吸收转魂力百分比')>0)a.push('从受击中回收部分魂力');return a.join('，并')||'迎住符合条件的来袭攻势';}
  case 'move.flight':return `托起身体，进入${text(p.高度,'空中')}调整位置`;
  case 'move.pursuit':return p.需要自身标记?'循着自己留下的标记追近目标':'追近选中的目标';
  case 'zone.wall':return p.阻挡==='攻击'?'立起可被击破的实体屏障，拦住攻击':p.阻挡==='移动'?'立起可被击破的实体屏障，截断通路':'立起可被击破的实体屏障，隔开通路与攻击';
  case 'zone.hazard':{const a=[];if(n(p,'骰数')>0)a.push(`持续造成${text(p.类型,'对应属性')}伤害`);if(n(p,'移动修正')<0)a.push('拖慢其中的移动');if(n(p,'移动修正')>0)a.push('帮助其中的移动');return '留下一片持续影响交战的区域'+(a.length?'，'+a.join('，并'):'');}
  case 'domain.field':return `展开${p.跟随施术者?'随身而行':'留在选定位置'}的领域，在${text(p.触发时机,'相应时机')}影响其中${p.阵营规则==='友方'?'的友方':p.阵营规则==='敌方'?'的敌人':'的目标'}`;
  case 'status.limb_bind':return `缚住目标的${text(p.部位,'肢体')}，限制对应动作`;
  case 'payload.cleanse':return `拂去目标身上可清除的${text(p.类别,'负面')}影响`;
  case 'status.mind_control':return `牵引目标的心神，在${text(p.命令域,'指定行动')}范围内影响其行动`;
  case 'status.soul_control':return `以魂念牵住目标，在${text(p.命令域,'指定行动')}范围内下达指令`;
  case 'payload.zone_dispel':return `扫开身边可以驱散的${text(p.类别,'遮蔽')}`;
 }
 const replacements={检定:text(p.检定,'相应行动'),名称:text(p.名称,'力量'),类型:text(p.类型,'对应属性'),命令域:text(p.命令域,'指定行动'),属性:stat(p.属性),类别:text(p.类别,'负面'),部位:text(p.部位,'肢体'),封印对象:text(p.封印对象,'对应能力')};
 return (data.effects[id]?.purpose??'').replace(/\{([^}]+)\}/g,(_,key)=>replacements[key]??'相应效果');
}

 function compose(skill,identity='',options={}){
  const nodes=nodesOf(skill),graph=skill?.effectGraph??skill?.graph??skill?.效果图;
  const branches=graph?.branches?.length?graph.branches.map(b=>({...b,nodes:(b.nodeIds??[]).map(id=>nodes.find(n=>n.id===id)).filter(Boolean)})):skill?.requestedBranches?.length?skill.requestedBranches.map(b=>({...b,nodes:(b.requestedEffects??[]).map(([effectId,params])=>({effectId,params}))})):[{nodes,activation:'active'}];
  const passages=branches.map(b=>{
   const parts=[];for(const node of b.nodes){if(/^(release|target|check|sustain)\./u.test(node.effectId))continue;const phrase=purpose(node.effectId,node.params??{});if(phrase&&!parts.includes(phrase))parts.push(phrase);}
   if(!parts.length)return '';
   const target=b.nodes.find(n=>n.effectId.startsWith('target.')),faction=target?.params?.阵营规则;
   const who=target?.effectId==='target.self'?'力量回到自身，':faction==='友方'?'向友方施展，':faction==='敌方'?'向敌人施展，':'';
   const when=b.activation==='passive'?'平日里，':b.optional?'也可另行施展，':branches.length>1?'发动时，':'';
   return when+who+parts.join('；')+'。';
  }).filter(Boolean);
  if(!passages.length)return '凝聚魂力，依照所选招式施展武魂的力量。';
  const subject=String(identity??'').trim().split(/[，。；\n]/u)[0].slice(0,24),intro=String(options.intro??'').trim();return (intro||(subject?subject+'的力量随心念流转。':'魂力随心念凝聚。'))+passages.join('');
 }
 function fixedRealmDescription(skill,state){
  const soul=state?.武魂?.列表?.[skill?.sourceMartialSoulId??skill?.来源武魂ID],ring=state?.魂环?.列表?.[skill?.sourceRingId??skill?.来源魂环ID];
  const index=(soul?.魂环ID列表??[]).indexOf(ring?.id)+1,profile=state?.魂兽档案?.列表?.[ring?.来源魂兽档案ID];
  if(!index||!ring?.魂技ID列表?.includes(skill?.id)||!globalThis.SoulEffectCompiler?.fixedRealmSkillMatches(skill,soul,profile))return null;
  return `召唤第${index}席已经绑定的人物。可在战斗中或场外召出投影，投影承载本人意识并服从画主，不占队伍人数，没有固定持续时限；真身须达到服从门槛，出画后作为队友占用队伍人数。`;
 }
 function description(skill,state,identity=''){
  if(['copied','summoned-copy'].includes(skill?.sourceKind))return compose(skill,identity);
  const realm=fixedRealmDescription(skill,state);if(realm)return realm;
  const fixed=authored(skill,state);if(fixed)return fixed;
  const old=String(skill?.description??skill?.扩展?.描述??'').trim();
  if(old&&old.length>=20&&!/(?:effectGraph|payload\.|status\.|节点|合同|编译|模板|预算|同源|资源槽|真值|程序|本部分|已付费|来源证明|回执|按.*规则执行|\d+d\d+|第\d+魂技)/u.test(old))return old;
  return compose(skill,identity);
 }
 return Object.freeze({descriptionLimit:2048,preset,matches,authored,compose,description,effectNames:{...display.effectNames,'realm.capture':'收入独立空间','realm.deploy':'召唤对应画中人物'},coverage:{presets:Object.keys(data.presets).length,effects:Object.keys(display.effectNames).length,instances:data.actual.length}});
});
