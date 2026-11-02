(function(root,factory){
 const api=factory(root?.SoulEffectCompiler??(typeof require==='function'?require('./effects-core.js'):null),root?.SoulCombatFoundation??(typeof require==='function'?require('./foundation-core.js'):null));
 if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulCuratedCommerce=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(effects,foundation){
 'use strict';
 const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
 const pill=(name,description,origin,purpose,nodes)=>({name,description,lore:origin,purpose,type:'丹药',stackable:true,tags:['精选商品','经口使用'],activeSkill:{name:`服用·${name}`,soulPowerCost:0,cooldownTurns:0,durabilityCost:0,requirements:['gesture','ingest'],effectSpecs:[['target.self',{阵营规则:'友方'}],...nodes]},preparationWindowMinutes:120,
   basePrice:Math.ceil(effects.validateGraph(effects.makeLinearGraph([['target.self',{阵营规则:'友方'}],...nodes]),{ageTier:'千年',mechanismCap:'进阶'}).spent/5)*5});
 const equipment=(name,description,origin,purpose,form,kind,nodes,attributes={})=>({name,description,lore:origin,purpose,type:'魂导器',deviceCategory:kind==='武器'?'攻击':kind==='防具'?'防御':'辅助',stackable:false,rank:2,maxDurability:100,tags:['精选商品'],equipmentKind:kind,fixedForm:foundation.EQUIPMENT_AFFIXES.FORMS.find(f=>f.id===form),modifiers:{attributes},passiveEffectGraph:effects.makeBranchedGraph([{activation:'passive',nodes}])});
 const TEMPLATES=freeze({
  'pill-qingzhi':pill('青芝续络丸','药丸裹着微苦的芝粉。药力先收拢散乱气血，再在伤处留下短暂的温热。','诺丁药师以青芝与韧皮草配制，常备于猎魂队的急救药袋。','恢复伤势并争取两回合的防护。',[['payload.heal',{骰数:2,骰面:6,加值:4}],['status.buff',{属性:'物理防御',数值:1,持续回合:2}]]),
  'pill-mingyu':pill('鸣玉清瘴丸','碎玉般的白纹沉在丸芯，入口先凉后涩；它能截住毒势，却补不回已经失去的血。','行走落日森林的药师将清瘴草熬成浓膏，再以石粉包芯。','清除一项毒素状态，并短暂抵抗毒蚀伤害。',[['payload.cleanse',{类别:'毒素',最大数量:1}],['status.resistance_shift',{类型:'毒蚀',模式:'抗性',持续回合:2}]]),
  'pill-huixi':pill('回息丹','薄壳中裹着淡淡桂香。魂力缓缓回流时，急促的气息也稍稍平复。','索托药铺为连续斗魂者改良的整备药，药力温缓，不能替代完整休息。','恢复十二点魂力并短暂提高豁免检定。',[['payload.soul_restore',{数值:12}],['status.buff',{属性:'豁免检定',数值:1,持续回合:2}]]),
  'pill-chengxin':pill('澄心丸','药香很淡，像雨后的白木。它帮助心神抵住外来的惊惧，却不会替服用者作出决定。','天斗药师使用宁神树脂调和，受需要保持心神稳定的魂师青睐。','短暂抵抗灵魂伤害与恐惧状态。',[['status.resistance_shift',{类型:'灵魂',模式:'抗性',持续回合:2}],['status.status_guard',{防护对象:'status.fear',模式:'抗性',持续回合:2}]]),
  'device-leaf-heart':equipment('叠叶护心衣','薄片如叶脉交叠，弯腰时几乎听不见响动；受击处会浮出黯淡的绿纹。','龙兴匠师为护送商队缝制的软甲，细片间保留弯折余地。','增加生命容量，以固定减伤缓冲连续小额攻击。','robe','防具',[['passive.equipment_stat',{属性:'生命上限',数值:20}],['passive.equipment_stat',{属性:'固定减伤',数值:1}]]),
  'device-xuanbi-echo':equipment('玄壁回纹护腕','深灰纹路藏在护腕内侧。战意初起时，它们才在腕前合成一道薄壁。','星罗护卫工坊采用回折纹路，使有限防护集中在交锋之初。','每场开战获得三十点护盾，并提高物理防御。','bracer','防具',[['passive.equipment_stat',{属性:'开战护盾',数值:30}],['passive.equipment_stat',{属性:'物理防御',数值:1}]]),
  'device-zhengfeng':equipment('正风短刃','刃脊略厚，锋线微偏。匠师把重量留在最需要落稳的一寸，而非把整把刀磨得轻薄。','庚辛匠师为长途行猎者打造，适合魂力不足时保持稳定的基础攻势。','只提高普通攻击命中与伤害。','dagger','武器',[['passive.equipment_stat',{属性:'普通攻击命中',数值:1}],['passive.equipment_stat',{属性:'普通攻击伤害',数值:2}]]),
  'device-chaosheng':equipment('潮生佩','青蓝石芯外包着一圈旧银，贴近皮肤时带着海水般的凉意。','瀚海工匠以耐潮石芯制成，银圈上刻着为归港祈愿的细纹。','增强体魄并抵抗水属性伤害。','pendant','饰品',[['status.resistance_shift',{类型:'水',模式:'抗性'}]],{体魄:1}),
  'seal-platform':{name:'封神台',type:'封印器',stackable:false,maxDurability:60,basePrice:1200000,tags:['九级魂导器','斗二跨时代','活体封存'],description:'木托上百余颗宝石环绕着一片淡金光幕。回路向内收束，器体却需要外部保护。',lore:'斗二技术体系中的九级封印器，由稀有渠道进入当前世界。封存生命体须先压制其挣扎。',purpose:'单实体保生封存；内部强封印，外部器体可被破坏。'},
 });
 const RESTRAINT_LORE=freeze({
  rope:{description:'粗麻绞股间掺入韧丝，绳头磨得平整，便于在押送和全身捆缚间重新调整。',lore:'旅人商行常备的绳具，可作收束与押送之用。'},
  'restraint-cuffs':{description:'铐环内缘打磨得光滑，铰接处却厚重得多；锁住双手，也保留押送时迈步的余地。',lore:'庚辛工坊锻制，靠坚实铰链限制手部动作。'},
  'restraint-gag':{description:'短锁扣藏在颊侧，束好后难以说出完整的话，也无法吞服。',lore:'押送者用来阻断吟诵的口部束具。'},
  'restraint-seal-collar':{description:'环内三道回路首尾相接。锁定时纹路逐一闭合，解放时则留下清晰的断口。',lore:'用于低中阶魂师的封印器，不能承受超出适用范围的力量。'},
 });
 const BASIC=freeze([['bandage',12],['basic-soul-tonic',8],['antidote-pill',6]]);
 const REGIONS=freeze({
  'loc-notting-city':[['pill-qingzhi',6],['pill-mingyu',4],['device-leaf-heart',1],['rope',3]],
  'loc-balak-city':[['pill-qingzhi',4],['pill-huixi',3],['device-leaf-heart',1],['rope',4]],
  'loc-soto-city':[['pill-huixi',6],['pill-qingzhi',3],['device-xuanbi-echo',2],['device-zhengfeng',1]],
  'loc-silves-city':[['pill-huixi',4],['pill-qingzhi',4],['device-xuanbi-echo',1],['rope',2]],
  'loc-heaven-dou-city':[['pill-chengxin',4],['pill-mingyu',4],['restraint-gag',2],['restraint-seal-collar',1]],
  'loc-longxing-city':[['device-leaf-heart',2],['device-zhengfeng',1],['restraint-cuffs',2],['pill-qingzhi',3]],
  'loc-gengxin-city':[['device-zhengfeng',2],['restraint-cuffs',2],['device-leaf-heart',1],['device-xuanbi-echo',1]],
  'loc-sea-breeze-city':[['device-chaosheng',2],['pill-qingzhi',4],['pill-mingyu',3],['rope',2]],
  'loc-sea-breeze-port':[['device-chaosheng',1],['pill-qingzhi',4],['pill-huixi',3],['rope',4]],
  'loc-star-luo-city':[['device-xuanbi-echo',2],['restraint-cuffs',2],['pill-huixi',4],['device-zhengfeng',1]],
  'loc-spirit-city':[['pill-chengxin',6],['restraint-gag',2],['restraint-seal-collar',2],['device-leaf-heart',1]],
  'loc-hunting-forest':[['pill-qingzhi',4],['pill-mingyu',3],['rope',3]],
 });
 const BONE_DESIGNS=freeze([
  {id:'bone-frost-croc',name:'霜脊海鳄右臂骨',speciesName:'霜脊海鳄',ageYears:12600,slot:'右臂骨',attribute:'冰',description:'骨质表面伏着霜脊般的细棱，握紧时，寒意沿前臂聚向掌心。',skill:{name:'霜脊迟锋',cooldownTurns:3,requirements:['gesture','contact'],effectSpecs:[['release.melee',{}],['target.single',{阵营规则:'敌方'}],['check.physical_attack',{命中加值:1}],['payload.damage',{类型:'冰',骰数:2,骰面:6,加值:2}],['status.slow',{数值:1,持续回合:2}]]}},
  {id:'bone-wind-falcon',name:'逐风隼左腿骨',speciesName:'逐风隼',ageYears:8400,slot:'左腿骨',attribute:'风',description:'轻骨内的纹路像收拢的羽翼，魂力穿行时，会在踝边带起一缕清风。',skill:{name:'逐风迁步',cooldownTurns:3,requirements:['movement'],effectSpecs:[['target.self',{阵营规则:'友方'}],['move.teleport',{距离区:1,目的:'指定站位'}],['status.buff',{属性:'身法',数值:1,持续回合:2}]]}},
 ]);
 const ALL_GOODS=freeze([...Object.keys(TEMPLATES).filter(id=>id!=='seal-platform'),...Object.keys(RESTRAINT_LORE),...Object.keys(globalThis.SoulIntimateCore?.DEVICES??{})]);
 // These people are authored world assets. Their labels are fixed at creation;
 // the already compiled effects remain the authority for every ability.
 const ACTOR_LABELS=freeze({
  'auction-owner-gu':{base:'横盾试锋',flavor:'顾廷章将磐纹盾稳稳送向身前，动作紧凑，留有回守的余地。',skills:['磐纹叩阵','账前止戈','重垒回震','石隙截锋','守门沉盾','合壁镇场','沉脊破势','砾光回环','磐心据守']},
  'auction-host-su':{base:'白榆点杖',flavor:'苏晚晴收窄杖端的光，手势清楚，施展时始终留意真实目标。',skills:['榆光初绽','春息回枝','白露照影','静庭回音','细雨归杖','晚晴护灯','木心续生','榆荫长息','清辉守夜']},
  'commerce-consignor-ruan':{base:'铁枪探隙',flavor:'阮承砚握住玄铁枪中段，枪锋沿一条紧凑的直线送出。',skills:['铁锋问路','钉影横枪','断流回刺','沉枪破隙','回锋锁途','铁脊逐势','旧契连锋','寒锋归鞘','玄枪终阵']},
  'captive-guide-shen':{base:'山犬扑势',flavor:'沈砚舟借寻山犬的本能压低重心，动作中仍保留退路。',skills:['犬牙探径','潜迹跃涧','山影折返','循风逐迹','护途短扑','林缘回望','深壑留踪','夜路踏影','归山寻径']},
  'captive-title-jiang':{base:'暮盾迎锋',flavor:'江暮衡以磐纹盾接住身前的来势，肩背的动作沉稳而克制。',skills:['暮垒初阵','沉壁回击','旧誓横盾','断岭留锋','夜垒定势','回城镇途','磐壁守约','暮衡决阵','长夜归盾']},
  'captive-origin-lin':{base:'青藤探枝',flavor:'林栖月将青络藤引向实际落点，细枝随着她的手势收放。',skills:['月枝初绕','银叶回络','青影折枝','林月续脉','枝隙留光','月下归藤','银络回环','长枝守心','月林终生']},
  'commerce-kin-shen':{base:'循山短扑',flavor:'沈砚岚放低身形，借寻山犬武魂辨明身前的动静。',skills:['山风留迹','短径回扑','林缘探影','归途护迹','夜壑寻路','犬影回环','深林追踪','踏石回望','循山归家']},
  'commerce-comrade-lu':{base:'蓝草引梢',flavor:'陆青禾顺着蓝银草的枝梢牵引魂力，步子不急，手势始终分明。',skills:['草隙探锋','青络回声','旧途留枝','叶影截势','林脉回环','守约长枝','暮途护络','深草留心','蓝银归阵']},
  'commerce-friend-wen':{base:'轻枪试势',flavor:'闻溪先稳住玄铁枪的落点，再沿枪身送出自己的魂力。',skills:['溪影点锋','回湾短刺','浅流横枪','归岸留锋','细浪逐势','守溪回环','长流探隙','夜水定枪','闻溪归途']}
 });
 const stockAt=locationId=>REGIONS[locationId]?[...BASIC,...REGIONS[locationId]]:[];
 function validate(world){
  const errors=[];
  for(const id of ALL_GOODS){const t=world.ITEM_TEMPLATES[id];if(!t){errors.push(`缺少商品${id}`);continue;}try{
   if(t.type==='魂导器'){world.priceEquipment(t.passiveEffectGraph,t.modifiers);if(!foundation.EQUIPMENT_AFFIXES.validateForm({effectGraph:t.passiveEffectGraph,modifiers:t.modifiers,equipmentKind:t.equipmentKind,fixedForm:t.fixedForm},effects.calculateNodeCost))throw Error('器型不符');}
   if(t.activeSkill){const g=effects.makeLinearGraph(t.activeSkill.effectSpecs),check=effects.validateGraph(g,{ageTier:'千年',mechanismCap:'进阶'});if(!check.pass)throw Error(check.errors.join('；'));}
  }catch(e){errors.push(`${t.name}：${e.message}`);}}
  for(const location of Object.keys(REGIONS)){if(!world.LOCATION_TEMPLATES[location]&&location!=='loc-hunting-forest')errors.push(`售点不存在${location}`);for(const [id,q] of stockAt(location))if(!world.ITEM_TEMPLATES[id]||!Number.isSafeInteger(q)||q<1)errors.push('地区货架无效');}
  return errors;
 }
 return Object.freeze({TEMPLATES,RESTRAINT_LORE,BASIC,REGIONS,BONE_DESIGNS,ALL_GOODS,ACTOR_LABELS,stockAt,validate,pill,equipment,freeze});
});
