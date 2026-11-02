(function(root,factory){const api=factory(root);if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulLiChijingProfile=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
 'use strict';
 const clone=value=>JSON.parse(JSON.stringify(value));
 const ID='li-chijing',SOURCE_ID='xuanjian-li-chijing-taiyin';
 const reference='《玄鉴仙族》李尺泾与太阴道统；本项目太阴武魂改编';
 const appearance='成年青年，眉目清俊，黑发束起，神情明朗而坚毅。青白长衣外罩轻薄剑袖，腰间佩一柄月璃长剑，衣角与剑穗如湖水般轻轻舒展。';
 const profile={
  biography:'李尺泾出身黎泾村李家，是李木田最小的儿子，自幼聪慧机敏，珍重父兄与家人，后来离乡求学，走上修行之路。此番以成年剑修的形象来到斗罗大陆，随身的薜荔剑寄托着太阴月法与故乡的牵挂。他愿意认识眼前的人，也会在新的相遇中作出自己的选择。',
  values:'珍重亲情与承诺，遇事肯担当；心怀远志，也记得普通人的生计。对亲近者坦诚热切，面对威胁与强迫不会轻易退让。',
  speech:'言语清朗自然，能与熟人说笑，也会认真询问陌生事物。议事时直切要点，承诺之前先弄清实情，情绪随当下经历自然变化。',
  shortTermGoal:'弄清这片大陆的武魂与魂师规则，找到安身与通信的办法，结识可靠的同伴，继续磨炼自己的剑术。',
  longTermGoal:'守住值得珍重的人与故乡的牵挂，在新的天地里走出属于自己的太阴剑道。'
 };
 const sourcePolicy={sourceId:SOURCE_ID,reference,description:'《玄鉴仙族》李尺泾的太阴剑修改编开局。九枚魂环由剑中月华逐次自凝，年限与魂师经历为本游戏设定。',unavailableReason:'请在开局启用李尺泾的异世登场，或选择扮演李尺泾。'};
 function soulDefinition(){return clone((root.SoulPresetSouls??require('./preset-souls-core.js')).taiyinDraft());}
 const D=(dice,faces,bonus,extra={})=>['payload.damage',{类型:'阴',骰数:dice,骰面:faces,加值:bonus,...extra}];
 const self=nodes=>[['target.self',{}],...nodes];
 const shot=nodes=>[['release.projectile',{距离区:2}],['target.single',{阵营规则:'敌方'}],['check.soul_attack',{命中加值:0}],...nodes];
 const active=(nodes,target='auto')=>[{id:'main',label:'主效果',activation:'active',optional:false,targetPolicy:target,requestedEffects:nodes}];
 function specifications(){return [
  {name:'月阙剑弧',description:'挥剑送出一弯青白月弧，攻击两格内的一名敌人，造成4d6＋10阴伤害。领悟青月归乡后，每次施放命中的不同敌人各留下1份归乡回响。',nodes:shot([D(4,6,10,{事件槽:1})]),cooldownTurns:0},
  {name:'三分月流光',description:'凝成三道追击月光，持续3回合。每回合首次以同源武魂命中敌人时消耗一道，追加2d6＋4阴伤害，未命中不消耗。领悟青月归乡后，成功凝成或刷新三道月光获得3份归乡回响。',nodes:self([['status.limited_followup',{资源槽:1,层数:3,每回合上限:1,持续回合:3,类型:'阴',骰数:2,骰面:6,加值:4,事件槽:2}]]),target:'self',cooldownTurns:0},
  {name:'第一藏',description:'藏身于月华之中，隐身3回合。首次对敌攻击获得隐身带来的优势，攻击完成即现形，未命中也会解除；侦察、揭露与范围攻击仍可能应对。',nodes:self([['status.invisibility',{持续回合:3,攻击后解除:true}]]),target:'self',cooldownTurns:0},
  {name:'秋月听合',description:'三道月光随剑合击，造成7d6＋18阴伤害，并将尚存的最多三道追击月光全部并入本次攻击。命中后，目标若未通过意志抵抗，其下一次魂力攻击检定降低2，至多保留1回合。领悟青月归乡后，本招三道月光获得3份回响，实际合入几道追击月光再获得几份。',nodes:shot([D(7,6,18,{事件槽:4}),['payload.stack_confluence',{资源槽:1,最大数量:3,事件槽:4}],['status.next_check_penalty',{检定:'魂力攻击',数值:-2,次数:1,持续回合:1,命中后抵抗:true,抵抗属性:'意志'}]]),cooldownTurns:0},
  {name:'授玄珠',description:'玄珠月华落向一名敌人。对方未能抵抗时，其装备与道具能力封闭3回合，新换上的装备同样受限；器物仍保留实体、重量、耐久与归属。本人的武魂、魂技与正常行动仍可使用。',nodes:[['release.projectile',{距离区:2}],['target.single',{阵营规则:'敌方'}],['check.save',{属性:'意志',难度加值:0,成功效果:'无'}],['status.power_seal',{封印对象:'装备与道具',范围:'全部',持续回合:3}]],cooldownTurns:5},
  {name:'仪对影',description:'月璃凝成一具真实化身，持续3回合，最多保有一具。化身生命上限为本体的40%，六维继承60%；可从本体实际分配最多40魂力，继承前五环中最多两项已掌握魂技，以50%效果施展，并与本体共享冷却及限次。每场战斗仅可使用一次。',nodes:self([['summon.entity',{模板:'分身',数量:1,生命百分比:40,持续方式:'回合',持续回合:3,继承能力:true,属性继承百分比:60,魂力继承百分比:0,魂力分配:40,技能继承数量:2,技能效果倍率:50,继承环序上限:5,继承技能ID:[],离散缩放:'向下取整最少1',排除魂骨:true,排除领域:true}]]),target:'self',cooldownTurns:0,usageRules:{perBattleLimit:1}},
  {name:'湖月秋',description:'薜荔化作澄澈月璃真身，持续至本场战斗结束，开启后锁定16魂力，每回合维持消耗8魂力。同源剑术伤害提高20%，远程魂技射程提高一档，精神防护提高2；既有仪对影化身的继承魂技效果由50%提高至70%。每场一次，可主动解除，供魂不足也会结束。',nodes:self([['transform.martial_avatar',{属性增幅档:0,身心防御加值:0,基础动作增幅:0,同源魂技增幅:0,持续方式:'本场战斗',持续回合:3,锁定魂力:16,每回合魂力:8,禁用其他武魂:true,同源伤害增幅百分比:20,同源射程增幅:1,召唤技能效果倍率:70,精神防护加值:2}]]),target:'self',cooldownTurns:0,usageRules:{perBattleLimit:1}},
  {name:'不胜寒',description:'以自身为中心荡开清寒月华，优先照顾自己及一格内最多六名友方，各净化最多3层控制负面效果，并驱散范围内最多2处可驱散的遮蔽区域。',nodes:[['target.burst',{半径区:1,最大目标:6,阵营规则:'友方',选择模式:'自动最低生命',本人优先:true,落点:'自身'}],['payload.cleanse',{类别:'控制',最大数量:3}],['payload.zone_dispel',{类别:'遮蔽',半径区:1,最大数量:2,落点:'自身'}]],target:'ally',cooldownTurns:4},
  {name:'青月归乡',description:'领悟后，月阙剑弧的实际命中、三分月流光的凝聚与秋月听合的合流，会积累本场专属的归乡回响，最多30份。至少1份时可倾尽全部回响，作出一次8d6＋24阴伤害的攻击，每份回响再增加1d6＋2。无论命中与否，攻防和反击结算完毕后，本体若仍存活，生命至多保留1、魂力归零。每场只能施展一次。',branches:[{id:'echoes',label:'归乡回响',activation:'passive',optional:false,requestedEffects:[['status.battle_resource',{资源槽:2,容量:30,名称:'归乡回响',归属:'本体',事件规则:[{事件:'charges-created',事件槽:2,数量:3},{事件:'action-hit',事件槽:1,数量:1},{事件:'action-release',事件槽:4,数量:3},{事件:'confluence',事件槽:4,数量:'实际'}]}]]},{id:'return',label:'青月归乡',activation:'active',optional:false,targetPolicy:'enemy',requestedEffects:shot([['payload.resource_damage',{资源槽:2,类型:'阴',骰数:8,骰面:6,加值:24,每层骰数:1,每层加值:2,最低层数:1,最大计入层数:30}],['payload.resource_endstate',{承担者:'本体',生命终值:1,魂力终值:0}]])}],cooldownTurns:0,usageRules:{perBattleLimit:1}}
 ];}
 function mechanics(raw,attributeProgression){
  const years=[450,8000,9000,20000,30000,50000,80000,100000,300000];
  const source={物种ID:'taiyin-sword-origin',名称:'薜荔太阴月华',类别标签:['剑器','月亮意象'],种族特征:['阴','水','月华','剑术','本源自凝','远程','感知','守护','净化','持续','隐匿','封印','分身','真身','资源积累'],解剖标签:['月璃剑身','太阴本源'],属性谱:{主属性:['阴'],副属性:['水'],强度:{阴:80,水:40}}};
  const core=root.SoulMartialSoulCore??require('./martial-soul-core.js'),beasts=root.SoulBeastValue??require('./beast-value-core.js'),base=core.finalizeDraft(soulDefinition(),{budget:67});
  source.类别标签=[...new Set(base.categories.flatMap(category=>[category.name,category.family,...category.tags,...category.aliases]))];
  source.解剖标签=[...new Set([...source.解剖标签,...base.categories.filter(category=>['本体','材料','器物','生物'].includes(category.family)).flatMap(category=>[category.family,...category.tags])])];
  const rings=specifications().map((spec,index)=>({ordinal:index+1,years:years[index],acquisitionLevel:(index+1)*10,evidence:'canon-adaptation-authorized',sourceOrigin:'本源自凝',sourceNote:'取材《玄鉴仙族》太阴道统的游戏改编；魂环由薜荔月华逐次自凝，年限与魂师成长经历属于本游戏设定。',description:spec.description,appearance:spec.description,artId:'spirit.taiyin-bili',artPath:'/art/xuanjian/taiyin-bili.webp',source:clone(source),skills:[{name:spec.name,description:spec.description,evidence:'canon-adaptation-authorized',strictEffects:true,autoAllocate:false,requestedBranches:clone(spec.branches??active(spec.nodes,spec.target)),requirements:['gesture','martial-soul','soul-power'],cooldownTurns:spec.cooldownTurns,...(spec.usageRules?{usageRules:clone(spec.usageRules)}:{})}]}));
  // Each self-condensed ring has a paid divine source structure. Later ring
  // channels belong to that actual source; the recipient still purchases its
  // own expression growth from the ring budget during formal absorption.
  for(const ring of rings){
   const definition=soulDefinition(),specs=ring.skills.flatMap(skill=>skill.requestedBranches.flatMap(branch=>branch.requestedEffects));
   for(const [effectId,params]of specs){
    if(definition.channels.some(id=>core.channelSupportsEffect(core.CHANNEL_REGISTRY[id],effectId,params)))continue;
    const channel=Object.values(core.CHANNEL_REGISTRY).filter(candidate=>core.channelSupportsEffect(candidate,effectId,params)).sort((a,b)=>a.cost-b.cost||a.id.localeCompare(b.id))[0];
    if(!channel)throw Error('薜荔来源缺少已登记的能力方向：'+effectId);
    definition.channels.push(channel.id);
   }
   ring.source.血脉=beasts.compileLineage({...definition,name:source.名称,sourceDescription:'薜荔月华的神级本源与本环已领悟的能力。'});
  }
  const ringLoadouts=[{soulIndex:1,soulName:'薜荔',archetype:'weapon',desiredCount:9,rings,evidence:'canon-adaptation-authorized'}];
  const draft=soulDefinition(),binding=(root.SoulPresetArt??require('./preset-art-core.js')).get('preset:taiyin-bili');
  const martialSoulPreset={name:'薜荔',description:draft.concept,appearance:draft.form,imagePrompt:'青白月璃长剑，剑身如澄澈秋水，缺月与淡水光，无文字',artId:binding.artId,artPath:binding.artPath,tags:['武魂','太阴','剑器','月亮','阴','水'],recipe:{draft}};
  return {version:'canon-mechanics-v3.0',scope:'xuanjian-adaptation',inferencePolicy:'太阴剑法取材《玄鉴仙族》；九枚自凝魂环、魂师等级和年限为游戏改编。',martialSoulPresetId:'preset:taiyin-bili',martialSoulPreset,strictCanonicalPreference:true,allowCanonicalExpressionGrowth:true,attributes:attributeProgression(raw,ringLoadouts,{weights:{感知:8,体魄:4,意志:4,身法:2},priority:['感知','体魄','意志','身法']}),ringLoadouts,soulBones:[],equipment:[],mechanismGaps:[],excludedSkills:[],contentConflicts:[],storageSoulDevicesExcluded:[]};
 }
 return Object.freeze({ID,SOURCE_ID,reference,appearance,profile,sourcePolicy,soulDefinition,specifications,mechanics,initialAttributes:{力量:14,身法:14,体魄:14,悟性:14,感知:14,意志:14},level:99,openingLevel:99,age:24,periodLabel:'玄鉴仙族·太阴剑修'});
});
