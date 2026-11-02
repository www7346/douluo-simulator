(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulRoyalSwanContent=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clone=value=>JSON.parse(JSON.stringify(value));
 const recordIds=['xue-ke','xue-beng','xue-xing'];
 const SOUL={id:'preset:royal-swan',name:'天鹅',artId:'preset.soul.royal-swan',artPath:'/art/royal-swan-v1/martial-soul.webp',
  description:'天斗皇室世代相传的白羽武魂。双翼能收拢为屏，振起长风；清越的鸣声安定同伴，也能震慑来敌。九环渐成，御风、护翼与鸣声相互呼应，最终化作随身而行的守望之庭。',
  appearance:'修长的白天鹅舒展双翼，喙侧墨纹清晰，羽缘流着淡金光泽。青蓝风纹掠过羽隙，在足下荡出层层水光。',
  draft:{name:'天鹅',concept:'天斗皇室的守护传承：以羽翼护卫同伴，以长风投射和飞翔，以精神鸣声净化恐惧、震慑来敌并维持护持领域。',form:'珍珠白天鹅，修长曲颈，墨色眼侧与橙金鸟喙；双翼羽缘淡金，青蓝风纹环绕。',role:'御风守护',attributeVersion:3,categories:['category.avian'],attributes:[{id:'attribute.wind',investment:5},{id:'attribute.mind',investment:3}],channels:['channel.shield','channel.projectile','channel.cleanse','channel.flight','channel.burst','channel.fear','channel.status-guard','channel.transform','channel.domain'],traits:[],weaknesses:[],exchangeContracts:[],baseAction:{mode:'ranged',powerTier:0,attributeId:'attribute.wind'},playerConfirmed:true}};
 const self=effects=>[['target.self',{}],...effects];
 const ally=(effects,max=3)=>[['release.projectile',{距离区:2}],['target.cluster',{最大目标:max,阵营规则:'友方',选择模式:'自动最低生命'}],...effects];
 const guard=(turns=2,mode='抗性')=>['status.status_guard',{防护对象:'status.fear',模式:mode,持续回合:turns}];
 const rows=[
  ['feather-aegis','素羽成屏','护翼','一羽承锋','self',1,'银翎鹭',['守护','韧性','甲壳','风'],
   '双翼在身前收拢，羽片层层相叠，青金风纹沿翼缘结成圆屏。来袭的力道先撞上羽盾，细羽随每一次承击零落。','为自己获得一层羽盾，承受后续伤害。',self([['payload.shield',{骰数:1,骰面:8,加值:1}]])],
  ['wind-cut','回风裁羽','御风','以羽裁风','enemy',1,'回风隼',['风','飞行','速度','切割'],
   '一枚白羽顺着回旋的气流掠出，羽缘凝成薄而明亮的风刃。它在半空划过弧线，切向远处的对手。','远程风属性攻击；命中后造成伤害。',[['release.projectile',{距离区:3}],['target.single',{阵营规则:'敌方'}],['check.soul_attack',{}],['payload.damage',{类型:'风',骰数:1,骰面:6,加值:1}]]],
  ['sky-step','凌波天翔','御风','振翼凌空','self',1000,'凌波鹤',['风','飞行','速度'],
   '白翼迎风展开，脚下水光倏然散成云纹。魂师借升起的气流离地，沿风势轻捷转向，在低空穿行。','获得短时低空飞行能力。',self([['move.flight',{持续回合:2,高度:'低空'}]])],
  ['clear-call','清越长鸣','鸣仪','清音定心','ally',1000,'清音灵鹭',['精神','净化','韧性','守护'],
   '一声清鸣穿过喧嚣，细密金纹随声波落在同伴身侧。紊乱的心神渐归清明，余音随最后一缕浊息缓缓散去。','净化同一站位同伴身上可清除的精神负面状态。',ally([['payload.cleanse',{类别:'精神',最大数量:1}]],2)],
  ['shared-wings','白翼同庇','护翼','展翼庇众','ally',1000,'环羽灵鹫',['守护','韧性','精神','羽翼'],
   '羽光在并肩之人的头顶相接，合成一座低垂的白翼穹顶。每位同伴都分得一层羽盾，清稳的气息让恐惧不易侵入。','为同一站位的同伴提供护盾与短时恐惧抗性。',ally([['payload.shield',{骰数:2,骰面:6,加值:2}],guard(2)],2)],
  ['sovereign-gale','王庭肃风','鸣仪','长鸣肃阵','enemy',1000,'震风王鹫',['精神','威压','恐惧','风'],
   '天鹅扬颈长鸣，振翼压下一圈沉凝的风。鸣声在敌阵间回荡，意志失守者心生畏惧，阵脚随之动摇。','范围内的敌人分别进行意志抵抗，失败者陷入短时恐惧。',[['release.projectile',{距离区:2}],['target.burst',{半径区:1,最大目标:3,阵营规则:'敌方'}],['check.save',{属性:'意志',难度加值:0,成功效果:'无'}],['status.fear',{持续回合:2}]]],
  ['true-form','天鹅真身','护翼','白羽临世','self',10000,'云冠天鹅',['风','精神','守护','本源'],
   '巨大的白天鹅虚影在身后凝实，青金羽纹沿双翼一层层点亮。真身托住魂师的身心，同源魂技随每一次振翼而增强。','开启武魂真身，强化同源魂技与自身防御；维持期间锁定并消耗魂力。',self([['transform.martial_avatar',{持续回合:3,属性增幅档:1,身心防御加值:1,基础动作增幅:0,同源魂技增幅:2,锁定魂力:8,每回合魂力:2,禁用其他武魂:true}]])],
  ['united-flight','同翼长空','御风','同乘长风','ally',1000,'长空雪羽鹤',['风','飞行','速度','守护'],
   '数道白翼在同伴背后舒开，一股连绵长风托起众人的身形。队伍踏着同一片风场越过阻碍，各自转向仍有余地。','让同一站位的同伴获得短时低空飞行，并为他们披上一层羽盾。',ally([['move.flight',{持续回合:3,高度:'低空'}],['payload.shield',{骰数:1,骰面:6,加值:2}]])],
  ['court-sanctuary','天阙守望','鸣仪','一庭长宁','self',1000,'巡天云鹤',['精神','领域','守护','韧性','风'],
   '白羽沿身周铺成一座青金光庭，羽缘朝外，水纹向内。光庭随魂师而行；身处其中的同伴在每次行动前重获护持，能更从容地承受接踵而至的冲击。','展开随身守护领域：范围内友方在回合开始获得羽盾。离开范围不再刷新护持。',self([['domain.field',{半径区:1,持续回合:3,跟随施术者:true,领域强度:1,触发时机:'回合开始',阵营规则:'友方'}],['payload.shield',{领域阵营:'友方',骰数:2,骰面:4,加值:2}]])]
 ];
 const NODES=rows.map(([id,name,branch,subtitle,targetPolicy,minimumYears,beastName,tags,description,summary,effects],i)=>({id,name,branch,subtitle,targetPolicy,minimumYears,description,summary,effects,ordinal:i+1,artCell:i,artId:'skill.royal-swan.'+id,artPath:'/art/royal-swan-v1/skills.webp',presetId:`canonical:xue-ke:1:${i+1}`,source:{物种ID:'royal-swan-source-'+id,名称:beastName,类别标签:['鸟类'],种族特征:[...new Set([...tags,'风','精神'])],解剖标签:['羽翼','鸣囊'],属性偏向:{力量:2,身法:4,体魄:3,悟性:4,感知:3,意志:5}},sourceNote:'本游戏为天斗皇室天鹅设计的九环传承，技能名称、来源与效果为二创设定。'}));
 const amp=(指标,数值,extra={})=>['status.amplify',{指标,数值,持续方式:'来源维持',...extra}];
 const upkeep=(start,rate,lock,range)=>['sustain.maintain',{锁定魂力:lock,每回合魂力:rate,定额发动:true,发动魂力:start,...(range?{计费方式:'逐目标',启动魂力:start,维持距离区:range}:{冷却起点:'结束'})}];
 const group=(range,fee,...effects)=>[['release.projectile',{距离区:range}],['target.allies',{距离区:range,阵营规则:'友方',...(fee?{每目标魂力:fee}:{})}],...effects];
 const edit=(ordinal,effects,summary,extra={})=>Object.assign(NODES[ordinal-1],{effects,summary,autoAllocate:false,resourceCosts:[],...extra});
 edit(3,self([['move.flight',{持续回合:1,高度:'低空',持续方式:'来源维持'}],amp('移动区',1),upkeep(8,2,4)]),'持续低空飞行、移动+1区；启动8，每回合2，占用4。结束后冷却2回合。',{cooldownTurns:2});
 edit(4,group(4,5,['payload.cleanse',{类别:'精神',最大数量:1}],['status.buff',{属性:'意志',数值:2,持续回合:2}]),'4区内自选同伴：每人清除1项精神负面，意志+2持续2回合；每人5魂力，冷却2回合。',{cooldownTurns:2});
 edit(5,group(3,8,['payload.shield',{骰数:3,骰面:8,加值:12}],guard(2)),'3区内自选同伴：每人3d8+12护盾，抵抗恐惧时掷两次取高，持续2回合；每人8魂力，冷却2回合。',{cooldownTurns:2});
 edit(6,[['release.projectile',{距离区:3}],['target.burst',{半径区:1,最大目标:2,阵营规则:'敌方',覆盖全部:true}],['check.save',{属性:'意志',难度加值:1,成功效果:'伤害减半'}],['payload.damage',{类型:'风',骰数:3,骰面:8,加值:12,定额发动:true,发动魂力:26}],['status.fear',{持续回合:1}]],'3区落点半径1区：3d8+12风伤，意志抵抗难度+1；成功半伤，失败另恐惧1回合。26魂力，冷却3回合。',{cooldownTurns:3});
 edit(7,self([['transform.martial_avatar',{持续方式:'本场战斗',持续回合:2,属性增幅档:0,身心防御加值:2,基础动作增幅:0,同源魂技增幅:0,同源命中加值:2,同源难度加值:2,锁定魂力:12,每回合魂力:5,禁用其他武魂:true,定额发动:true,发动魂力:18}],amp('护盾',50,{作用范围:'同源武魂'}),amp('属性伤害',30,{作用范围:'同源武魂',伤害属性:'风'}),['sustain.maintain',{锁定魂力:0,每回合魂力:0}]]),'持续真身：同源护盾+50%、风伤+30%、魂技命中与难度各+2，自身双防+2。启动18，每回合5，占用12，每场一次。',{cooldownTurns:0});
 edit(8,group(3,0,['move.flight',{持续回合:1,高度:'低空',持续方式:'来源维持'}],amp('移动区',2),amp('物理防御',2),amp('魂技防御',2),['sustain.maintain',{锁定魂力:12,每回合魂力:2,计费方式:'逐目标',启动魂力:6,维持距离区:3,定额发动:true,发动魂力:6,冷却起点:'结束'}]),'3区内自选同伴：持续低空飞行、移动+2区、双防+2。每人启动6、每回合2，共占用12；结束后冷却3回合。',{cooldownTurns:3});
 const court=(dice,add)=>group(2,0,['domain.field',{半径区:2,持续回合:1,跟随施术者:true,领域强度:1,触发时机:'回合开始',阵营规则:'友方',持续方式:'来源维持'}],['payload.shield',{骰数:dice,骰面:8,加值:add,领域阵营:'友方'}],upkeep(6,2,18,2));
 edit(9,court(6,24),'随身半径2区守护领域：选定同伴立即获得6d8+24护盾，之后在本人回合开始刷新。每人启动6、每回合2，共占用18，每场一次。',{minimumYears:90000,cooldownTurns:0,usageRules:{perBattleLimit:1},ageVariants:[{presetSuffix:'30000',minimumYears:30000,maximumYears:59999,effects:court(3,16),summary:'3万年：3d8+16护盾；逐人持续维持。'},{presetSuffix:'60000',minimumYears:60000,maximumYears:89999,effects:court(4,20),summary:'6万年：4d8+20护盾；逐人持续维持。'}]});
 NODES[2].description='白翼迎风展开，脚下水光散成云纹。连绵气流托住身形，在魂力供给下保持低空飞行，转向与追援更加轻捷。';
 NODES[8].targetPolicy='ally';
 // A crane is a flying bird, with wings; these are source anatomy, not extra soul abilities.
 NODES[8].source.种族特征.push('鸟','飞行','翅膀');NODES[8].source.解剖标签.push('翅膀');
 NODES[7].description='白翼在选定同伴背后舒开，长风托起众人的身形，羽纹护住肩背。只要魂力仍在流转，队伍便能沿着同一片风场越过阻碍。';
 NODES[8].description='白羽在身周铺成青金光庭，水纹随步伐缓缓前行。被羽光牵住的同伴在每次行动前重获护持，层层羽盾为整支队伍承住迎面而来的冲击。';
 const isRecord=id=>recordIds.includes(id),isSoul=soul=>{const d=soul?.扩展?.结构化武魂?.definition??soul?.definition??{},b=soul?.扩展?.canonicalGrowth;return soul?.presetId===SOUL.id||d.presetId===SOUL.id||isRecord(b?.recordId);};
 const matches=(node,skill)=>{const actual=skill?.effectGraph?.nodes??skill?.效果图?.nodes??[];return [node,...(node.ageVariants??[])].some(v=>actual.length===v.effects.length&&v.effects.every(([id,p],i)=>actual[i]?.effectId===id&&Object.entries(p).every(([key,value])=>(typeof value==='number'?typeof actual[i].params?.[key]==='number'&&(value<0?actual[i].params[key]<=value:actual[i].params[key]>=value):actual[i].params?.[key]===value))));};
 const ownsPreset=(node,skill)=>recordIds.some(id=>[node,...(node.ageVariants??[])].some(v=>skill?.presetId===`canonical:${id}:1:${node.ordinal}${v.presetSuffix?':'+v.presetSuffix:''}`));
 function authored(skill,state){if(!isSoul(state?.武魂?.列表?.[skill?.sourceMartialSoulId??skill?.来源武魂ID]))return null;return NODES.find(n=>n.name===(skill?.name??skill?.名称)&&matches(n,skill))?.description??null;}
 const TREE={tagline:'白羽承锋 · 长风守庭',description:'御风驰援、护翼承锋、鸣声定阵；第七环以天鹅真身贯通传承。',note:'本游戏设计的天斗皇室守护传承。',branches:{御风:'裁羽迎敌，同翼驰援',护翼:'一羽承锋，白翼庇众',鸣仪:'清音定心，长鸣守庭'}};
 const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
 return freeze({SOUL,NODES,TREE,clone,isSoul,isRecord,matches,ownsPreset,authored,get:ordinal=>NODES.find(n=>n.ordinal===ordinal),byName:name=>NODES.find(n=>n.name===name)});
});
