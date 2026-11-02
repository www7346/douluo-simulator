(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulGuYuenaProfile=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clone=v=>JSON.parse(JSON.stringify(v));
 const ID='gu-yuena-adult',SOURCE_ID='douluo-three-gu-yuena-adult';
 const reference='https://en.webnovel.com/book/8093958205004005/45668826234285820';
 const CHARACTER_PROFILE={"biography":"古月娜是银龙王，以人形走入人类社会，曾以古月的身份与唐舞麟等人共同学习、战斗。娜儿承载的情感与古月承担的责任曾彼此牵动，融合后的她不能简单归结为其中一人的外表或脾气。她见过魂兽生存空间被不断挤压，也亲身体会过人类的关怀、勇气与感情；对族群的责任和对唐舞麟的感情因此同时真实存在。她善于克制锋芒、观察局势，能在漫长等待中谋划，也会在亲近者受伤时显露不愿掩饰的保护欲。本档案取深渊战争中已掌握白银龙枪、身着银龙舞麟四字斗铠并施展银龙镇的成年阶段，尚未经历本传最终决裂和永冻冰封。若她跨时代来到当前世界，来源经历仍属于她的过去，但此地的人并不因此与她有过共同经历；新的相遇、承诺和冲突会继续改变她的选择。","values":"把魂兽族群的生存、尊严与未来视为不能轻易放弃的责任；同时承认具体的人、真实的恩情和感情有分量。重视承诺、能力与自我决定，对欺骗、把生命当消耗品和强迫控制保持警惕。不会仅凭族属判定眼前每个人，也不会为了讨好某个人抹去自己的立场。","speech":"说话通常平稳简洁，先听清对方目的再回应；面对试探可反问、留白或转向实际条件。陌生人面前有距离，议事时直接而有判断；熟悉之后语气可以柔和，也会显露固执、担心或轻微调侃。愤怒不必高声，情绪应由当下关系和经历自然推动，不固定套用女王口吻或口头禅。","shortTermGoal":"确认当前地域、人类与魂兽的处境及主要势力，找到可靠的落脚和联络方式；保护自身与族人的实际安全，厘清眼前合作或冲突的代价。若出现可信任的人，愿意观察和交谈，但不会仓促许诺追随、赠送神器或接受他人替自己作主。","longTermGoal":"为魂兽争取能够延续的生存空间与选择未来的权利，并寻找族群责任和个人感情可以共存的道路。如何达成目标取决于当前世界真实遭遇；不会预知结局，也不会强迫新世界重复原作的决裂、牺牲和冰封。"};
 const apparentAge=18;
 const appearance='人形表面年龄18岁，真实年龄未载。银白色长发自然垂落，紫色眼眸清澈而沉静。银白长裙与轻甲衔接，冷紫纹饰勾勒细密龙鳞；肩背挺直，举止克制，目光中带着审视与不轻易退让的威严。';
 const sourcePolicy={sourceId:SOURCE_ID,reference,description:'来自《龙王传说》深渊战争中的成年古月娜。保留来源经历，在当前时代重新认识人与事。'};
 const lifeBasis={kind:'ancient-dragon',ageYears:1000000,baseLifespanYears:10000000,evidence:'银龙王古老非人本源明确；百万年时钟与千万年寿限为本项目适配，不作为原作精确年龄。'};
 const elements=['water','fire','wind','earth','light','dark','space'];
 const D=(type,dice=1,faces=6,bonus=0)=>['payload.damage',{类型:type,骰数:dice,骰面:faces,加值:bonus}];
 const self=nodes=>[['target.self',{}],...nodes];
 const shot=nodes=>[['release.projectile',{距离区:3}],['target.single',{阵营规则:'敌方'}],['check.soul_attack',{}],...nodes];
 const area=nodes=>[['release.projectile',{距离区:3}],['target.burst',{半径区:1,最大目标:3,阵营规则:'敌方'}],['check.save',{属性:'体魄',难度加值:0,成功效果:'无'}],...nodes];
 const buff=(attribute,amount=1,turns=2)=>['status.buff',{属性:attribute,数值:amount,持续回合:turns}];
 const branch=(nodes,target='auto')=>[{id:'main',label:'主效果',activation:'active',optional:false,targetPolicy:target,requestedEffects:nodes}];
 const specifications=[
  ['元素潮汐',self([['modifier.next_skill',{魂力消耗倍率:75,次数:1,持续回合:3}],buff('意志')]),'元素光流汇入掌心，稳定心神并减轻下一次魂技的魂力消耗。','原作名词参考；本期环位及效果参数为游戏补全。'],
  ['元素掌控',self([buff('攻击检定',2,3)]),'细微的元素纹路围绕指尖收束，短时提高攻击命中。','原作元素掌控表现；第二环位置与数值为本项目成长补全。'],
  ['元素融合',shot([D('火',2,6,2),D('水',2,6,2)]),'水火元素在同一轨迹中交错，形成需要分别抵抗的元素冲击。','原作元素融合表现；第三环归属及参数为游戏补全。'],
  ['元素之杖',self([['payload.shield',{骰数:2,骰面:6,加值:14}],buff('魂技防御',2,3)]),'元素凝成银色杖影，在身前铺开坚韧护幕。','原作名词参考；第四环与护幕机制为游戏补全。'],
  ['光元素掌控',shot([D('光',3,8,12),['status.blind',{持续回合:2}]]),'光芒凝成贯穿视野的射流，灼伤目标并扰乱其视觉。','按用户提供的《终极斗罗》能力表补足第五环；效果数值沿共同规则。'],
  ['暗元素掌控',self([['status.invisibility',{持续回合:3,攻击后解除:true}],['payload.shield',{骰数:3,骰面:6,加值:18}]]),'暗影收拢身形，遮掩行迹并凝成护幕。','按用户提供的《终极斗罗》能力表补足第六环；效果数值沿共同规则。'],
  ['银龙王真身',self([['transform.martial_avatar',{属性增幅档:2,身心防御加值:2,基础动作增幅:2,同源魂技增幅:2,持续回合:3,锁定魂力:12,每回合魂力:5,禁用其他武魂:true}]]),'银龙轮廓在身后展开，真实强化当前武魂并支付维持费用。','银龙本体来源明确；将其作为人形成长第七环真身属于游戏适配。'],
  ['创造之力掌控',[['release.projectile',{距离区:3}],['target.single',{阵营规则:'友方',选择模式:'自动最低生命'}],['payload.heal',{骰数:4,骰面:8,加值:24}],['payload.cleanse',{类别:'负面',最大数量:2}],['payload.shield',{骰数:3,骰面:8,加值:24}]],'柔和光流重整生命与元素结构，恢复伤势、清除负面影响并形成护盾。','按用户提供的《终极斗罗》能力表补足第八环；恢复、构造、修复与永久造物按通用效果和实际材料结算。'],
  ['毁灭之力掌控',area([D('毁灭',6,12,60),['payload.dispel',{最大数量:2}]]),'毁灭之力轰入区域，在冲击敌人的同时瓦解可驱散的增益。','按用户提供的《终极斗罗》能力表补足第九环；毁灭伤害与驱散均使用通用效果。']
 ];
 function mechanics(raw,attributeProgression){
  const tags=['龙族','元素','光明','黑暗','生命','再生','净化','魂力','增幅','守护','甲壳','血脉','真身','领域','威压','空间','瞬移','寒冰','水','火','风','土','精神','规则','毁灭','物质修复','永久造物','实体召唤','区域塑形'];
  // The player route contains skill preferences, never ring ages or colours.
  const rings=specifications.map(([name,nodes,description,note],i)=>({ordinal:i+1,acquisitionLevel:(i+1)*10,evidence:'game-adaptation-canon-source',sourceOrigin:'本源自凝',sourceNote:note,description,appearance:description,source:{物种ID:'silver-dragon-origin',名称:'银龙本源',类别标签:['龙族'],种族特征:tags,解剖标签:['龙鳞','元素核心'],属性谱:{主属性:['水','火','风','土','光','暗','空间','冰','生命','毁灭'],强度:{水:50,火:50,风:50,土:50,光:50,暗:50,空间:50,冰:40,生命:40,毁灭:60}}},skills:[{name,description,evidence:'canon-adaptation-authorized',strictEffects:true,requestedBranches:branch(nodes,nodes[0][0]==='target.self'?'self':i===7?'ally':'auto'),requirements:['gesture','martial-soul','soul-power'],cooldownTurns:i===6?0:1}]}));
  rings[3].skills[0].requestedBranches=[
   {id:'ward',label:'元素护幕',activation:'active',optional:false,targetPolicy:'self',requestedEffects:specifications[3][1]},
   {id:'fission',label:'七元素大裂变',activation:'active',optional:true,targetPolicy:'enemy',requestedEffects:area(['水','火','风','土','光','暗','空间'].map(t=>D(t,2,8,6)))},
   {id:'storm',label:'元素风暴',activation:'active',optional:true,targetPolicy:'self',requestedEffects:self([['domain.field',{半径区:1,持续回合:3,跟随施术者:true,领域强度:1,触发时机:'进入与回合开始',阵营规则:'敌方'}],...['水','火','风','土','光','暗','空间'].map(t=>['payload.damage',{类型:t,骰数:2,骰面:8,加值:6,领域阵营:'敌方'}]),['sustain.maintain',{锁定魂力:8,每回合魂力:4}]])}
  ];
  rings[3].skills[0].description='以元素之杖展开护幕，或引导七元素大裂变与持续的元素风暴。';
  rings[3].skills[0].autoAllocate=false;
  const creationBranches=(restoration,adult=false)=>[
   {id:'restore',label:'生机恢复',activation:'active',optional:false,targetPolicy:'ally',requestedEffects:[...restoration,['status.regeneration',{持续方式:'世界分钟',持续分钟:5,骰数:adult?4:1,骰面:8,加值:adult?30:4}]]},
   {id:'construct',label:'元素构造',activation:'active',optional:true,targetPolicy:'self',requestedEffects:self([['zone.wall',{持续方式:'世界分钟',持续分钟:10,耐久:adult?160:50,阻挡:'全部'}],['summon.entity',{模板:'元素',数量:1,生命百分比:adult?20:10,持续方式:'世界分钟',持续分钟:10,继承能力:false}]])},
   {id:'repair',label:'装备修复',activation:'active',optional:true,targetPolicy:'self',requestedEffects:self([['payload.repair_item',{修复量:adult?30:15,价值上限:adult?1500000:10000}]])},
   {id:'fabricate',label:'永久造物',activation:'active',optional:true,targetPolicy:'self',requestedEffects:self([['payload.fabricate',{价值上限:adult?5000:1000,最大数量:1}]])}
  ];
  rings[7].skills[0].requestedBranches=creationBranches(specifications[7][1]);
  rings[7].skills[0].autoAllocate=false;
  rings[7].skills[0].description='恢复与净化生命，凝成元素屏障或守卫；以真实材料修复装备，按掌握的图纸和配方制造永久物品。';
  rings[2].skills[0].autoAllocate=false;
  rings[2].skills[0].requestedBranches=branch(shot([D('火',4,10,30),D('水',4,10,30)]));
  const ringLoadouts=[{soulIndex:1,soulName:'银龙王',archetype:'mental',desiredCount:9,rings,evidence:'canon-origin-game-growth-adaptation'}];
  const projectionAttributes=attributeProgression(raw,ringLoadouts);
  const nativeSpecs=[['神识冲击',[['release.projectile',{距离区:4}],['target.single',{阵营规则:'敌方'}],['check.save',{属性:'意志',成功效果:'无'}],D('精神',8,12,80),['status.stun',{持续回合:1}]],'神识压向目标，冲击精神并短暂打断行动。']];
  // Ring techniques and innate source techniques retain separate provenance.
  const adultRings=clone(rings),adultSkill=(ordinal,nodes,target='auto')=>{const skill=adultRings[ordinal-1].skills[0];skill.requestedBranches=branch(nodes,target);return skill;};
  adultSkill(1,self([['modifier.next_skill',{效果倍率:125,魂力消耗倍率:85,制造速度倍率:100,成品效果倍率:100,次数:1,持续回合:3}],buff('意志',2,3)]),'self');
  adultSkill(2,self([buff('攻击检定',3,3)]),'self');
  adultSkill(3,shot([D('火',6,10,35),D('水',6,10,35)]));
  const staff=adultRings[3].skills[0];
  staff.requestedBranches[0].requestedEffects=self([['payload.shield',{骰数:6,骰面:8,加值:50}],buff('魂技防御',2,3)]);
  staff.requestedBranches[2].requestedEffects=self([['domain.field',{半径区:1,持续回合:2,跟随施术者:true,领域强度:1,触发时机:'回合开始',阵营规则:'敌方'}],...['水','火','风','土','光','暗','空间'].map(t=>['payload.damage',{类型:t,骰数:2,骰面:8,加值:6,领域阵营:'敌方'}]),['sustain.maintain',{锁定魂力:30,每回合魂力:20}]]);
  adultSkill(5,shot([D('光',24,12,120),['status.blind',{持续回合:2}]]));
  adultSkill(6,self([['status.invisibility',{持续回合:3,攻击后解除:true}],['payload.shield',{骰数:24,骰面:10,加值:180}]]),'self');
  adultSkill(8,[['release.projectile',{距离区:3}],['target.single',{阵营规则:'友方',选择模式:'自动最低生命'}],['payload.heal',{骰数:16,骰面:10,加值:240}],['payload.cleanse',{类别:'负面',最大数量:2}],['payload.shield',{骰数:12,骰面:8,加值:100}]],'ally');
  adultRings[7].skills[0].requestedBranches=creationBranches(adultRings[7].skills[0].requestedBranches[0].requestedEffects,true);
  adultSkill(9,[['release.projectile',{距离区:4}],['target.burst',{半径区:2,最大目标:6,阵营规则:'敌方'}],['check.save',{属性:'体魄',难度加值:0,成功效果:'无'}],['payload.damage',{类型:'毁灭',骰数:40,骰面:12,加值:200,穿透档:1}],['payload.dispel',{最大数量:2}]]);
  const cooldowns=[3,3,1,4,2,4,3,3,4];
  adultRings.forEach((ring,i)=>{ring.years=1000000;ring.color='淡金';ring.sourceNote+=' 银龙王以自身神级本源自主凝环，非猎杀所得。';Object.assign(ring.skills[0],{autoAllocate:false,cooldownTurns:cooldowns[i]});});
  const npcLoadouts=[{...clone(ringLoadouts[0]),rings:adultRings}];
  const skills=nativeSpecs.map(([name,nodes,description])=>({name,description,budget:3000,autoAllocate:false,requestedBranches:branch(nodes,nodes[0][0]==='target.self'?'self':'auto'),requirements:['gesture','martial-soul','soul-power'],cooldownTurns:3}));
  skills.push({name:'神元守心',description:'强大的神识抵御精神干涉。',budget:3500,requestedBranches:[{id:'guard',activation:'passive',requestedEffects:['status.charm','status.fear','status.mind_control','status.cognition_shift','status.sleep'].map(id=>['status.status_guard',{防护对象:id,模式:'抗性'}])}]});
  skills.push({name:'银龙镇',description:'水、火、风、土、空间与光明结成六角阵，六元素同时镇压敌人。',budget:5000,autoAllocate:false,requestedBranches:branch(area(['水','火','风','土','空间','光'].map(t=>D(t,4,12,40)))),requirements:['gesture','martial-soul','soul-power'],cooldownTurns:4});
  skills.push({name:'空间跃迁',description:'空间折面在身侧展开，携自身瞬移至选定站位。',budget:1600,autoAllocate:false,requestedBranches:branch(self([['move.teleport',{距离区:2,目的:'指定站位'}]]),'self'),requirements:['gesture','martial-soul','soul-power'],cooldownTurns:2});
  const nativeOrigin={version:1,id:'silver-dragon-recovered-adult',recordId:ID,sourceId:SOURCE_ID,phaseId:'abyss-spirit-emperor-defeated',minimumLevel:1,bodyRank:'极限斗罗',spiritRank:'二级神元境',attributes:{力量:18,身法:18,体魄:18,悟性:60,感知:60,意志:60},resources:{生命上限:2400,魂力上限:6000},bodyBudget:105480,abilityBudget:13100,skills};
  const draft=soulDefinition({growthProjection:true,level:40,mechanics:{}});draft.categories.push('category.creation');
  const martialSoulPreset={name:draft.name,description:'驾驭多种元素的银龙王武魂，随魂环成长领悟新的力量。',appearance:draft.form,imagePrompt:'银白巨龙与七色元素环，无文字',artId:'character.gu-yuena-adult',artPath:'/art/character-figures-v2/gu-yuena-adult.webp',tags:['武魂','龙族','元素'],recipe:{draft}};
  return {version:'canon-mechanics-v3.0',scope:'douluo-three-adult',inferencePolicy:'角色身份使用自身神级本源与百万年淡金自凝环，控制者不影响配置；仅选择银龙王武魂的其他人物按实际来源与预算优先学习魂技。',identityLoadout:true,selfCondensation:true,martialSoulPresetId:'preset:silver-dragon-king',martialSoulPreset,nativeOrigin,projectionPlan:{attributes:projectionAttributes,ringLoadouts},attributes:attributeProgression(raw,npcLoadouts),ringLoadouts:npcLoadouts,soulBones:[],equipment:[{name:'白银龙枪',category:'soul-device',templateId:'gu-yuena-silver-spear',evidence:'canon-object-game-mechanics',acquisitionLevel:91},{name:'银龙舞麟',category:'soul-device',templateId:'gu-yuena-silver-armor',evidence:'canon-four-word-armor-game-mechanics',acquisitionLevel:91}],mechanismGaps:[],excludedSkills:[],contentConflicts:[],storageSoulDevicesExcluded:[]};
 }
 function soulDefinition(record){
  const stage=record.growthProjection?record.level:99;
  const channels=['channel.projectile','channel.buff','channel.resource'];
  if(record.mechanics.nativeOrigin)channels.push('channel.paralyze','channel.status-guard');
  for(const [level,ids]of [[30,['channel.burst']],[40,['channel.shield','channel.domain','channel.sustain']],[50,['channel.blind']],[60,['channel.stealth']],[70,['channel.transform','channel.teleport']],[80,['channel.heal','channel.cleanse','channel.area-shaping','channel.summon','channel.repair','channel.fabricate']]])if(stage>=level)channels.push(...ids);
  return {name:'银龙王',concept:'银龙本源驾驭元素；人形与龙形共享同一身体和资源。',form:'银白龙影环绕施术者，鳞光中交织冷紫元素纹路',role:'控制',categories:['category.dragon','category.energy'],attributes:[...elements.map(id=>({id:'attribute.'+id,investment:id==='space'?2:1})),{id:'attribute.ice',investment:1},{id:'attribute.life',investment:1},...(stage>=90?[{id:'attribute.destruction',investment:2}]:[]),...(record.mechanics.nativeOrigin?[{id:'attribute.mind',investment:6}]:[])],channels,traits:[],weaknesses:[],baseAction:{mode:'ranged',powerTier:0,attributeId:'attribute.light'},sourceDescription:'银龙王驾驭元素，神识沉静而强大。',playerConfirmed:true};
 }
 return Object.freeze({ID,SOURCE_ID,reference,appearance,apparentAge,sourcePolicy,lifeBasis,profile:CHARACTER_PROFILE,mechanics,soulDefinition,level:99,periodLabel:'龙王传说·成年银龙王'});
});
