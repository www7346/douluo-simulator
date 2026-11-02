(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulBegoniaContent=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clone=value=>JSON.parse(JSON.stringify(value));
 const SOUL={id:'preset:nine-heart-begonia',name:'九心海棠',artId:'preset.soul.nine-heart-begonia',artPath:'/art/begonia-v1/martial-soul.webp',
  description:'乳白海棠托起一颗碧色花心，花露凝着温润生机。凝露可救急，花丝可续生，花雨可照拂同伴；花瓣亦能凝为纤薄花刃，在护生之余迎敌自守。',
  appearance:'层叠的乳白花瓣围着碧金花心舒展，瓣缘微染浅粉；细枝生着翠叶，流动的露光沿花脉缓缓汇聚。',
  draft:{name:'九心海棠',concept:'以生命花露救治伤者，以绵延花息维持恢复，以散落花雨照拂多名同伴。',form:'乳白重瓣海棠，碧金花心，浅粉瓣缘与翠色叶脉。',role:'治疗辅助',attributeVersion:3,categories:['category.flower'],attributes:[{id:'attribute.life',investment:8}],channels:['channel.heal','channel.cleanse','channel.aura','channel.touch','channel.projectile','channel.burst','channel.transform'],traits:[{templateId:'trait.attribute-mastery',level:1,parameter:'attribute.life'}],weaknesses:[],exchangeContracts:[],baseAction:{mode:'touch',powerTier:0,attributeId:'attribute.life'},playerConfirmed:true}};
 const heal=(dice=1,faces=6)=>['payload.heal',{骰数:dice,骰面:faces,加值:0}],regen=turns=>['status.regeneration',{持续回合:turns,骰数:1,骰面:6}],single=nodes=>[['release.projectile',{距离区:2}],['target.single',{阵营规则:'友方',选择模式:'自动最低生命'}],...nodes],group=(nodes,max=3)=>[['release.projectile',{距离区:2}],['target.burst',{半径区:1,最大目标:max,阵营规则:'友方',选择模式:'自动最低生命'}],...nodes];
 const rows=[
  ['first-bloom','素心初绽','急救','凝露救急','掌中海棠轻轻舒开，一滴碧金花露沿花瓣飞向伤者，在伤处化开，补回流失的生命。','单体即时治疗。',single([heal()])],
  ['dew-thread','花露续脉','续疗','花露续生','细密露光沿伤者的气息缓缓流转，像一根不断的花丝，在接下来的回合持续滋养伤处。','单体持续恢复。',single([regen(2)])],
  ['petal-rain','芳雨同泽','群体','花雨救护','花瓣散作一阵温润细雨，落在彼此靠近的同伴肩头。每一缕露光都在为伤者接续生机。','救治同一站位中的两名同伴。',[['release.projectile',{距离区:1}],['target.cluster',{最大目标:2,阵营规则:'友方',选择模式:'自动最低生命'}],heal()]],
  ['jade-mending','玉瓣扶伤','急救','扶伤涤毒','两片玉白花瓣拢住伤处，生机先抚平创痛，再携着浊紫毒息离开身体，化为散去的微光。','单体治疗，并清除一项毒素。',single([heal(),['payload.cleanse',{类别:'毒素',最大数量:1}]])],
  ['twin-breath','并蒂长息','续疗','并蒂相续','并蒂海棠一开一合，花息随露雨落向聚在一处的同伴，在接下来的回合不断补回生命。','小范围群体持续恢复。',group([regen(3)])],
  ['spring-tide','海棠回春','群体','花潮回春','层叠花光从碧色花心向外舒展，暖意漫过同伴的伤处。一场花潮过后，创痛随之减轻。','群体即时治疗，扩大救护人数。',[['release.projectile',{距离区:3}],['target.burst',{半径区:1,最大目标:4,阵营规则:'友方',选择模式:'自动最低生命'}],heal()]],
  ['true-form','九心真身','续疗','本源盛放','海棠在身后舒展为明亮花影，碧色光柱托起层层金丝。真身持续期间，同源魂技得到强化，身心也受到花光护持。','开启武魂真身，强化同源魂技并维持自身防护。',[['target.self',{}],['transform.martial_avatar',{持续回合:3,属性增幅档:1,身心防御加值:1,基础动作增幅:0,同源魂技增幅:2,锁定魂力:8,每回合魂力:2,禁用其他武魂:true}]]],
  ['returning-petals','落英归脉','急救','深护归脉','合拢的翠叶托住伤者，花露深入伤处，落英又沿着气息回旋。创痛得到救治，可清除的负面影响被拂去，余下生机仍在缓缓流淌。','单体治疗、持续恢复，并清除一项可驱散负面状态。',single([heal(),regen(3),['payload.cleanse',{类别:'负面',最大数量:1}]])],
  ['nineheart-dawn','九心朝露','群体','九瓣同辉','层层花瓣一齐迎向晨光，碧金花心垂下一片璀璨露瀑。花雨为聚在一起的同伴补回生命，绵延的余露仍会继续滋养伤者。','群体即时治疗，并给予持续恢复。',[['release.projectile',{距离区:3}],['target.burst',{半径区:1,最大目标:4,阵营规则:'友方',选择模式:'自动最低生命'}],heal(),regen(3)]]
 ];
 // 持续再生须千年来源，不能为了早期开出招式而降低公共年限门槛。
 const artCells=new Map(rows.map((row,i)=>[row[0],i]));[rows[1],rows[2]]=[rows[2],rows[1]];
 const NODES=rows.map(([id,name,branch,subtitle,description,summary,effects],i)=>({id,ordinal:i+1,name,branch,subtitle,description,summary,effects,artCell:artCells.get(id),artId:'skill.begonia.'+id,artPath:'/art/begonia-v1/skills.webp',presetId:`canonical:ye-lingling:1:${i+1}`,minimumYears:i===6?10000:i>=2?1000:100,sourceNote:'本游戏为九心海棠设计的治疗成长路线，技能名与逐环组合不作为原著记载。'}));
 const fixed=(id,params,fee)=>[id,{...params,定额发动:true,发动魂力:fee}];
 const one=(range,...effects)=>[['release.projectile',{距离区:range}],['target.single',{阵营规则:'友方',选择模式:'自动最低生命'}],...effects];
 const allies=(range,fee,...effects)=>[['release.projectile',{距离区:range}],['target.allies',{距离区:range,阵营规则:'友方',...(fee?{每目标魂力:fee}:{})}],...effects];
 const upkeep=(start,rate,lock,range)=>['sustain.maintain',{锁定魂力:lock,每回合魂力:rate,定额发动:true,发动魂力:start,冷却起点:'结束',...(range?{计费方式:'逐目标',启动魂力:start,维持距离区:range}:{})}];
 const renewal=(dice,faces,add)=>['status.regeneration',{骰数:dice,骰面:faces,加值:add,持续回合:1,持续方式:'来源维持'}];
 const edit=(ordinal,effects,summary,extra={})=>Object.assign(NODES[ordinal-1],{targetPolicy:ordinal===4?'enemy':ordinal===7?'self':'ally',effects,summary,autoAllocate:false,resourceCosts:[],...extra});
 edit(2,allies(3,5,['payload.heal',{骰数:2,骰面:6,加值:4}]),'3区内自选同伴：每人恢复2d6+4生命，另计悟性；每人5魂力，冷却2回合。',{cooldownTurns:2});
 edit(3,one(3,renewal(2,6,6),upkeep(6,3,4)),'为3区内一名同伴持续恢复：本人回合开始恢复2d6+6生命；启动6、每回合3、占用4魂力，结束后冷却1回合。',{cooldownTurns:1});
 const verdict=(dice,add,fee)=>[['release.projectile',{距离区:3}],['target.single',{阵营规则:'敌方'}],['check.soul_attack',{命中加值:2}],fixed('payload.damage',{类型:'生命',骰数:dice,骰面:8,加值:add},fee)];
 edit(4,verdict(4,12,16),'3区单敌，魂技攻击命中+2，造成4d8+12生命伤害；16魂力，冷却2回合。',{id:'life-verdict',name:'海棠裁生',branch:'裁生',subtitle:'花刃裁生',minimumYears:5000,artId:'skill.begonia.life-verdict',artPath:'/art/begonia-v2/life-verdict.webp',artCell:0,artColumns:1,artRows:1,cooldownTurns:2,description:'海棠花心轻转，温润露光凝成纤薄花刃。白金花瓣循着对手魂力流转的间隙掠入，在命中处绽开一束碧色生命冲击。',ageVariants:[
  {presetSuffix:'1000',minimumYears:1000,maximumYears:4999,effects:verdict(3,8,14),summary:'千年：3d8+8生命伤害，命中+2；14魂力，冷却2回合。'},
  {presetSuffix:'30000',minimumYears:30000,maximumYears:59999,effects:verdict(6,16,22),summary:'3万年：6d8+16生命伤害，命中+2；22魂力，冷却2回合。'},
  {presetSuffix:'60000',minimumYears:60000,maximumYears:89999,effects:verdict(8,20,26),summary:'6万年：8d8+20生命伤害，命中+2；26魂力，冷却2回合。'},
  {presetSuffix:'90000',minimumYears:90000,effects:verdict(10,24,30),summary:'9万年：10d8+24生命伤害，命中+2；30魂力，冷却2回合。'}],maximumYears:29999});
 edit(5,allies(3,0,renewal(2,8,10),upkeep(5,3,8,3)),'3区内自选同伴：本人回合开始恢复2d8+10生命。每人启动5、每回合3，共占用8魂力；结束后冷却2回合。',{cooldownTurns:2});
 edit(6,allies(4,6,['payload.heal',{骰数:4,骰面:8,加值:16}]),'4区内自选同伴：每人恢复4d8+16生命，另计悟性；每人6魂力，冷却2回合。',{cooldownTurns:2});
 edit(7,[['target.self',{}],['transform.martial_avatar',{持续方式:'本场战斗',持续回合:2,属性增幅档:0,身心防御加值:2,基础动作增幅:0,同源魂技增幅:0,同源命中加值:2,同源难度加值:0,锁定魂力:12,每回合魂力:5,禁用其他武魂:true,定额发动:true,发动魂力:20,冷却起点:'结束'}],['status.amplify',{指标:'治疗',数值:60,作用范围:'同源武魂',持续方式:'来源维持'}],['status.amplify',{指标:'属性伤害',数值:30,伤害属性:'生命',作用范围:'同源武魂',持续方式:'来源维持'}],['sustain.maintain',{锁定魂力:0,每回合魂力:0}]],'持续真身：同源即时治疗与持续恢复+60%、生命伤害+30%、魂技命中+2，自身双防+2。启动20、每回合5、占用12魂力，每场一次。',{cooldownTurns:0});
 edit(8,one(4,['payload.heal',{骰数:6,骰面:10,加值:24}],fixed('payload.cleanse',{类别:'负面',最大数量:3},28)),'4区内一名同伴恢复6d10+24生命，另计悟性，并清除至多3项可驱散负面（包括毒素）；28魂力，冷却3回合。',{cooldownTurns:3});
 const dawn=(dice,faces,add,ticks,tickFaces,tickAdd)=>allies(4,0,['payload.heal',{骰数:dice,骰面:faces,加值:add}],renewal(ticks,tickFaces,tickAdd),upkeep(8,4,16,4));
 edit(9,dawn(6,10,24,3,10,20),'4区内自选同伴：立即恢复6d10+24生命（另计悟性），此后本人回合开始恢复3d10+20。每人启动8、每回合4，共占用16魂力，每场一次。',{minimumYears:100000,cooldownTurns:0,usageRules:{perBattleLimit:1},ageVariants:[
  {presetSuffix:'30000',minimumYears:30000,maximumYears:59999,effects:dawn(3,8,12,2,6,8),summary:'3万年：立即3d8+12，持续2d6+8；每人启动8、维持4，占用16。'},
  {presetSuffix:'60000',minimumYears:60000,maximumYears:89999,effects:dawn(4,8,16,2,8,12),summary:'6万年：立即4d8+16，持续2d8+12；每人启动8、维持4，占用16。'},
  {presetSuffix:'90000',minimumYears:90000,maximumYears:99999,effects:dawn(5,8,18,3,8,16),summary:'9万年：立即5d8+18，持续3d8+16；每人启动8、维持4，占用16。'}]});
 NODES[0].targetPolicy='ally';
 for(const index of [0,3,7])NODES[index].branch='救急与裁生';
 NODES[1].description='乳白花瓣散成一阵温润细雨，依次落向被选中的同伴。无论是持盾的前锋还是远处的投影，每一缕花露都循着伤处接续生机。';
 NODES[2].description='细密露光沿伤者气息结成一根柔韧花丝。海棠与伤者相系，魂力不断化作花露；只要花丝仍被供养，伤处便会在每次行动前获得滋养。';
 NODES[4].description='并蒂海棠一开一合，花息沿着选定同伴的脉络往复流转。绵延露雨在每次行动前抚平创痛，供魂停止或远离花雨时，牵连的花丝随之散去。';
 NODES[5].description='碧色花心涌出层叠花潮，依次漫过选定同伴的伤处。花瓣舒展的一瞬，大量生机注入伤躯，沉重的创痛在暖光中渐渐退去。';
 NODES[6].description='九瓣海棠在身后盛放为明亮花影，碧金花心悬起绵长露瀑。真身持续期间，救急的花露与续生的花丝一同增强；凝为花刃的生命之光也更加明亮。';
 NODES[7].description='翠叶托住伤者，层层落英循着脉络合拢。丰沛花露深入创处，先补回大量生命，再将缠绕身体的毒息与可驱散浊气一并拂去。';
 NODES[8].description='九瓣海棠同时迎向晨光，碧金花心垂下璀璨露瀑。被选中的同伴先沐浴一场回春花雨，随后各有一缕朝露随身流转，在每次行动前继续滋养伤躯。';
 const sourceNames=['凝露海棠','芳雨灵兰','续脉玉藤','碧心箭莲','并蒂灵棠','回春玉莲','九瓣圣棠','归脉雪莲','朝露仙葩'];
 for(const node of NODES)node.source={物种ID:'begonia-source-'+node.id,名称:sourceNames[node.ordinal-1],类别标签:['植物','花卉'],种族特征:['植物','花卉','生命','治疗','再生',...(node.ordinal===4?['远程投射']:[]),...(node.ordinal===8?['净化']:[])],解剖标签:['花瓣','花蕊','叶脉'],属性偏向:{力量:1,身法:2,体魄:4,悟性:5,感知:3,意志:4}};
 const isSoul=soul=>{const d=soul?.扩展?.结构化武魂?.definition??soul?.definition??{},b=soul?.扩展?.canonicalGrowth;return soul?.presetId===SOUL.id||d.presetId===SOUL.id||b?.recordId==='ye-lingling';};
 function matches(node,skill){const actual=skill?.effectGraph?.nodes??skill?.效果图?.nodes??[];return [node,...(node.ageVariants??[])].some(v=>actual.length===v.effects.length&&v.effects.every(([id,p],i)=>actual[i]?.effectId===id&&Object.entries(p).every(([key,value])=>typeof value==='number'?typeof actual[i].params?.[key]==='number'&&(value<0?actual[i].params[key]<=value:actual[i].params[key]>=value):actual[i].params?.[key]===value)));}
 const ownsPreset=(node,skill)=>[node,...(node.ageVariants??[])].some(v=>skill?.presetId===node.presetId+(v.presetSuffix?':'+v.presetSuffix:''));
 const TREE={tagline:'碧心凝露 · 一脉护生',description:'以花露救急、花丝续生、花雨护众；第四环花刃迎敌，第七环真身贯通全部生命魂技。',note:'本游戏设计的九心海棠成长路线。',branches:{救急与裁生:'凝露扶伤，花刃迎敌',续疗:'持续供魂，花息不绝',群体:'自选同伴，花雨同泽'}};
 function authored(skill,state){const soul=state?.武魂?.列表?.[skill?.sourceMartialSoulId??skill?.来源武魂ID];if(!isSoul(soul))return null;const node=NODES.find(n=>n.name===(skill?.name??skill?.名称)&&matches(n,skill));return node?.description??null;}
 const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
 return freeze({SOUL,NODES,TREE,clone,isSoul,matches,ownsPreset,authored,get:ordinal=>NODES.find(n=>n.ordinal===ordinal),byName:name=>NODES.find(n=>n.name===name)});
});
