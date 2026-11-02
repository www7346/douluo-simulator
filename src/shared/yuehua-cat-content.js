(function(root,factory){if(typeof module!=='undefined'&&module.exports)module.exports=factory;if(root)root.SoulYuehuaCatContent=factory;})(typeof globalThis!=='undefined'?globalThis:this,function(h){
 'use strict';
 const {profile,E,self,enemy,melee,save,ally,oneAlly,dmg,buff,bind,shield,avatar}=h;
 const root='/art/yuehua-cat-v1/';
 const ring=profile('wish-ring','如意环',['tang-yuehua'],
  '一环悬心，万籁渐宁。如意环以温润共鸣抚平心神的裂隙，也能在纷乱战局中收束锋芒。真正的从容，是身处风暴，仍能守住自己的意志。',
  '银金相间的两层玉环缓缓错转，中央悬着水滴状蓝玉。细密光弦在环内绷起，随后化作均匀扩散的柔和涟漪。','精神护持与定场',['crystal'],[['mind',2]],
  ['buff','shield','projectile','domain','sustain','cleanse','burst','silence','transform'],
  {清心:'安定意志，涤去纷扰',护仪:'玉环承锋，并肩守阵',定场:'截断声息，收束锋芒'},[
   ['清音入怀','清心','一音定心','玉环轻鸣，一缕细光停在同伴眉心。急促呼吸渐渐平稳，纷乱声息之外，自己的心跳重新清晰。','提高一名同伴的意志，持续2回合。','ally',oneAlly(buff('意志',2,2))],
   ['环玉承锋','护仪','玉弧承刃','玉色弧环在同伴身前交错，柔光凝成有层次的护壁。袭来的锋芒撞碎外环，内侧光弧仍稳稳相护。','为一名同伴提供护盾。','ally',oneAlly(shield(2))],
   ['如意惊弦','定场','玉律惊心','玉环中的蓝色光弦骤然绷紧，发出一声清越鸣响。金白涟漪直抵敌人心神，震散凝聚的攻势；抵住余音者仍会受到冲击，心神失守者则更难稳住随后的出手。','3区单体精神冲击：意志抵抗失败受到3d8+8精神伤害，攻击检定降低2，持续目标2回合；成功仅受一半伤害。消耗13魂力，冷却2回合。','enemy',[E('release.projectile',{距离区:3}),E('target.single',{阵营规则:'敌方'}),E('check.save',{属性:'意志',难度加值:0,成功效果:'伤害减半'}),E('payload.damage',{类型:'精神',骰数:3,骰面:8,加值:8,定额发动:true,发动魂力:13}),buff('攻击检定',-2,2)]],
   ['澄心洗尘','清心','清辉涤念','清光由眉心向外铺开，缠绕思绪的浊影随涟漪渐散。被惊惧牵住的呼吸重新舒展，眼前景物恢复清晰。','净化一名同伴的一项精神负面状态。','ally',oneAlly(E('payload.cleanse',{类别:'精神',最大数量:1}))],
   ['众仪同辉','护仪','环光并肩','细环分别落在并肩之人的肩背，光纹在相邻守势间轻轻相接。每个人仍各自行动，却更容易稳住迎来的冲击。','提高同一站位同伴的物理防御与魂技防御，持续1回合。','ally',ally(buff('物理防御',1,1),buff('魂技防御',1,1))],
   ['玉律断章','定场','一弦截声','环内光弦骤然绷紧，清越一响直抵心神。敌人尚未凝成的声息被截断，余音在玉环边缘碎成细光。','精神冲击；意志抵抗失败时受到伤害并短时禁声，限制需要发声的能力。','enemy',save('意志',dmg('精神',2,6,2),E('status.mute',{持续回合:1,持续方式:'回合'}))],
   avatar('如意真身'),
   ['明镜无尘','清心','众心澄明','数面澄澈玉镜在同伴面前展开，映出各自清晰的身影。镜光洗去能够驱除的精神浊影，留下一层安定的余辉。','净化同一站位同伴的精神负面状态，并提高意志以抵抗后续精神干扰。','ally',ally(E('payload.cleanse',{类别:'精神',最大数量:1}),buff('意志',2,2))],
   ['月满人间','定场','一庭长宁','金白圆环缓缓升起，细密光弦在众人之间织成明亮庭院。环光随施术者而行，为仍在庭中的同伴逐次重续护持。','展开随身领域，范围内友方每回合获得护盾刷新与短时精神豁免加成；须维持。','self',self(E('domain.field',{半径区:1,持续回合:2,跟随施术者:true,领域强度:1,触发时机:'回合开始',阵营规则:'友方'}),E('payload.shield',{领域阵营:'友方',骰数:1,骰面:6,加值:2}),E('status.buff',{领域阵营:'友方',属性:'意志',数值:1,持续回合:1}),E('sustain.maintain',{锁定魂力:4,每回合魂力:1}))]
  ],{years:[423,790,1800,4800,16000,24000,45000,65000,90000],sourceNames:['安魂玉蛾','环玉灵鹿','定音蝉','澄心灵蝶','同辉晶鹿','断声鸣蝉','圆月灵鹿','净心灵狐','月庭灵凰'],sourceAttributes:['精神'],baseAction:{mode:'aura',auraName:'贵族圆环',powerTier:0,attributeId:'attribute.mind'},mode:'touch',artPath:root+'wish-ring.webp',skillArtPath:root+'wish-ring-skills.webp',artColumns:3,artRows:3,
   traits:[],
   sourceNote:'本游戏二创：如意环的顶级配置与突破后九环传承，不是原著逐环记载。',
   tagline:'一环悬心 · 万籁渐宁',combo:'清音与环玉保护关键同伴，澄心和明镜应对精神控制；惊弦以精神冲击压低敌方命中，断章接续较强打击与禁声。如意真身中维持月满人间，留足魂力接续救场。',
   cultivation:{name:'环脉圆融',minutes:60,level:9,description:'累计完成60分钟的静心修炼，调顺变异武魂的环脉，再以实际经验突破十级。本人同意后开始，期间仍可能被打断。'}});
 ring.NODES[2].autoAllocate=false;ring.NODES[2].resourceCosts=[];ring.NODES[2].cooldownTurns=2;
 Object.assign(ring.NODES[2],{artId:'skill.canonical-women.wish-ring.3.v2',artPath:'/art/yuehua-cat-v2/ruyi-jingxian.webp',artCell:0,artColumns:1,artRows:1});
 ring.NODES[8].usageRules={perBattleLimit:1};ring.NODES[8].cooldownTurns=4;
 const cat=profile('heterochromatic-white-cat','异瞳白猫',['captive-cat-liu'],
  '白影掠过檐角，风中仍留着未散的足音。异瞳白猫从细微动静里寻出危险，以轻捷步法穿过围堵，再将锋利爪影送入对手暴露的空隙。',
  '修长白猫虚影伏在身后，双眼一青一金，耳尖与尾端泛着浅绿光泽。风沿胡须、耳缘和爪尖流动，异瞳在昏暗环境中格外清晰。','灵瞳侦察与近身游斗',['feline'],[['physical',4],['wind',4],['mind',3]],
  ['melee','movement','step','sensory','buff','wound','entangle','transform','stealth'],
  {灵瞳:'听风辨迹，察觉藏形',掠风:'轻步近身，留影脱险',裂爪:'切开守势，追击破绽'},[
   ['听风灵瞳','灵瞳','耳目辨隙','异色眼瞳收成细线，细微风声沿耳缘流过。呼吸、衣摆与脚步的变化渐渐清晰，爪锋也更容易找准落点。','短时提高感知与攻击检定。','self',self(buff('感知',2,2),buff('攻击检定',1,2))],
   ['踏雪无声','掠风','轻步穿隙','足下风流托住落步，白影贴着树影与墙沿轻巧穿行。转身、跃下和挪步都收敛了声息。','提高身法与移动能力，持续2回合；潜行仍按实际环境判定。','self',self(buff('身法',2,2),buff('移动区',1,2))],
   ['裂帛爪','裂爪','一爪裁锋','三道爪锋划过守势，像利刃裁开紧绷丝帛。浅而利落的伤口在收爪后仍有血迹渗出。','近身物理攻击，命中后造成2回合有限出血。','enemy',melee(dmg('物理',1,6,2),E('status.damage_over_time',{类型:'物理',骰数:1,骰面:4,持续回合:2}))],
   ['双瞳照影','灵瞳','青金分影','青金两色瞳光在视野中交叠，光影里不合常理的边缘逐渐显现。她仍须分辨真正的线索，才能看穿藏形。','提高感知与意志，增强观察及抵抗幻象的实际检定，持续3回合。','self',self(buff('感知',3,3),buff('意志',2,3))],
   ['回风剪爪','裂爪','双锋剪隙','前爪逼开正面守势，回身一爪顺着风隙再次切入。两道弧形锋线先后交错，在同一处留下清晰落点。','两段独立判定的近身爪击，具有限穿透。','enemy',[]],
   ['截风缠影','掠风','风线封步','交错风线贴着敌人足边收紧，爪影随之切入。被缠住的步法难以立即展开，目标仍能尝试挣脱。','近身攻击并短时束缚目标，限制移动。','enemy',melee(dmg('风',2,6,2),bind(1))],
   avatar('异瞳白猫真身'),
   ['留影脱身','掠风','一影错身','一缕白色残影留在原来的扑击姿态，本体顺着另一道风流侧身退开。敌人追向虚影时，她已重新找好落脚处。','向合法可通行站位挪移，并获得短时防御加成。','self',self(E('move.step',{距离区:1}),buff('物理防御',2,2),buff('魂技防御',2,2))],
   ['白夜猎舞','裂爪','三影归锋','白影绕着目标接连折转，三道爪锋沿不同角度收拢。最后一道风线扣住落脚处，为随后的追击留下机会。','三段分别判定的近身爪击；最后一段命中后短时限制移动。','enemy',[]]
  ],{years:[423,790,1800,4800,16000,24000,45000,65000,90000],sourceNames:['风须灵猫','踏雪灵貂','裂帛风狸','青金灵猞','双锋风豹','缠风灵猫','白风灵猫王','留影灵貂','逐夜灵猞王'],sourceAttributes:['物理','风','精神'],mode:'melee',powerTier:1,artPath:root+'white-cat.webp',skillArtPath:root+'white-cat-skills.webp',artColumns:3,artRows:3,
   traits:[{templateId:'trait.ability-training',level:1,parameter:'感知'},{templateId:'trait.escape-expert',level:1,parameter:''}],
   reference:{id:'captive-cat-liu',name:'柳青葭',level:9,locationId:'loc-heaven-dou-auction',faction:'旅人',soul:'异瞳白猫',archetype:'agility',skills:[],bones:[],equipment:[],periodLabel:'白猫武魂成长参照',kind:'soul-master'},
   sourceNote:'本游戏二创：柳青葭的顶级异瞳白猫与九环成长路线，初遇仍为9级零环。',
   tagline:'异瞳听风 · 白影逐隙',combo:'听风与照影寻找破绽，踏雪调整站位；裂帛留下有限出血，截风阻住退路，再以剪爪或猎舞集中进攻。受到集火时留影脱身，借真身强化同源能力。'});
 const amp=(指标,数值,extra={})=>E('status.amplify',{指标,数值,持续方式:'来源维持',...extra});
 const group=(range,fee,...nodes)=>[E('release.projectile',{距离区:range}),E('target.allies',{距离区:range,阵营规则:'友方',...(fee?{每目标魂力:fee}:{})}),...nodes];
 const upkeep=(start,rate,lock,range)=>E('sustain.maintain',{锁定魂力:lock,每回合魂力:rate,定额发动:true,发动魂力:start,...(range?{计费方式:'逐目标',启动魂力:start,维持距离区:range}:{}),冷却起点:'结束'});
 const edit=(p,ordinal,effects,summary,extra={})=>Object.assign(p.NODES[ordinal-1],{effects,summary,autoAllocate:false,resourceCosts:[],...extra});
 const trueForm=(fee,rate,kind,...nodes)=>self(E('transform.martial_avatar',{持续方式:'本场战斗',持续回合:2,属性增幅档:0,身心防御加值:2,基础动作增幅:0,同源魂技增幅:0,同源命中加值:2,同源难度加值:kind==='mind'?2:0,锁定魂力:12,每回合魂力:rate,禁用其他武魂:true,定额发动:true,发动魂力:fee}),...nodes,E('sustain.maintain',{锁定魂力:0,每回合魂力:0}));
 const own={作用范围:'同源武魂'};
 edit(ring,1,[E('release.projectile',{距离区:3}),E('target.single',{阵营规则:'友方'}),amp('意志',4),upkeep(4,1,2,3)],'3区单个同伴意志+4，持续维持；启动4，每回合1，占用2，结束后冷却1回合。',{cooldownTurns:1});
 edit(ring,2,[E('release.projectile',{距离区:3}),E('target.single',{阵营规则:'友方'}),E('payload.shield',{骰数:2,骰面:6,加值:12,定额发动:true,发动魂力:8})],'3区单个同伴获得2d6+12护盾；8魂力，冷却2回合。',{cooldownTurns:2});
 edit(ring,4,[E('release.projectile',{距离区:4}),E('target.single',{阵营规则:'友方'}),E('payload.cleanse',{类别:'精神',最大数量:4})],'4区单个同伴清除最多4项可驱散精神负面；11魂力，冷却1回合。',{cooldownTurns:1});
 // The cleanse has no numeric payload on which to declare its fixed launch fee.
 ring.NODES[3].effects[2][1].发动魂力=11;ring.NODES[3].effects[2][1].定额发动=true;
 for(const ordinal of [1,2,4])ring.NODES[ordinal-1].effects.find(([id])=>id==='target.single')[1].选择模式='自动最低生命';
 edit(ring,5,group(3,0,amp('物理防御',3),amp('魂技防御',3),upkeep(4,2,6,3)),'3区内自选同伴，持续双防+3；每人启动4、每回合2，共占用6，结束后冷却2回合。',{cooldownTurns:2});
 edit(ring,6,[E('release.projectile',{距离区:3}),E('target.single',{阵营规则:'敌方'}),E('check.save',{属性:'意志',难度加值:1,成功效果:'伤害减半'}),E('payload.damage',{类型:'精神',骰数:2,骰面:6,加值:43,定额发动:true,发动魂力:24}),E('status.mute',{持续回合:2,持续方式:'回合'})],'3区单敌：意志难度+1，失败受2d6+43精神伤害并禁声2回合；成功半伤无禁声。24魂力，冷却3回合。',{cooldownTurns:3});
 edit(ring,7,trueForm(20,5,'mind',amp('属性伤害',40,{...own,伤害属性:'精神'}),amp('护盾',50,own)),'持续真身：同源精神伤害+40%、护盾+50%、魂技命中与难度各+2，自身双防+2。启动20，每回合5，占用12，每场一次。',{cooldownTurns:0});
 edit(ring,8,group(4,6,E('payload.cleanse',{类别:'精神',最大数量:3}),buff('意志',6,3)),'4区内自选同伴：每人清除最多3项精神负面，意志+6持续3回合；每人6魂力，冷却3回合。',{cooldownTurns:3});
 const moon=(dice,add,will)=>group(2,0,E('domain.field',{半径区:2,持续回合:1,跟随施术者:true,领域强度:1,触发时机:'回合开始',阵营规则:'友方',持续方式:'来源维持'}),E('payload.shield',{骰数:dice,骰面:8,加值:add,领域阵营:'友方'}),amp('意志',will,{领域阵营:'友方'}),E('payload.cleanse',{类别:'精神',最大数量:1,领域阵营:'友方'}),upkeep(6,2,18,2));
 edit(ring,9,moon(4,16,6),'随身半径2区领域：选定同伴获得4d8+16护盾、意志+6；本人回合开始刷新护盾并清除1项精神负面。每人启动6、每回合2，共占用18，每场一次。',{minimumYears:90000,cooldownTurns:0,usageRules:{perBattleLimit:1},ageVariants:[{presetSuffix:'30000',minimumYears:30000,maximumYears:59999,effects:moon(2,8,2),summary:'3万年：2d8+8护盾、意志+2、每回合净化1项精神负面。'},{presetSuffix:'60000',minimumYears:60000,maximumYears:89999,effects:moon(3,12,4),summary:'6万年：3d8+12护盾、意志+4、每回合净化1项精神负面。'}]});
 ring.NODES[0].description='一缕清音停在同伴眉心，环内光弦与心跳渐渐相合。魂力沿着细光持续送来，让自己的意志在纷乱声息中保持清明。';
 ring.NODES[8].targetPolicy='ally';
 // The moon-court phoenix carries resonance in crystalline feathers, unlike the generic deer source.
 ring.sources={9:{类别标签:['鸟类','晶体'],种族特征:['鸟','飞行','翅膀','晶体','储能','折射','精神','领域','守护','净化'],解剖标签:['晶体','折射','储能','晶羽','鸣囊']}};
 ring.NODES[4].description='细环落在选定同伴的肩背，玉色光纹沿各自守势轻轻流动。环光不断承托迎来的冲击，让并肩之人稳住身体与魂力的防线。';
 ring.NODES[7].description='数面澄澈玉镜在同伴面前展开，镜光将缠住心神的浊影逐一拂去。清晰的身影重新映入镜中，余辉为众人的意志留下一层安定护持。';
 ring.NODES[8].description='金白圆环缓缓升起，光弦在选定同伴之间织成明亮庭院。环光随画一般的月色流转，逐次重续护盾，并将侵入心神的浊念洗去。';
 const claws=(n,sides,add,fee)=>Array.from({length:2},(_,i)=>({id:'claw-'+(i+1),label:'第'+(i+1)+'爪',activation:'active',optional:false,targetPolicy:'enemy',requestedEffects:[E('release.melee'),E('target.single',{阵营规则:'敌方',...(i?{沿用首目标:true}:{})}),E('check.physical_attack',{命中加值:1}),E('payload.damage',{类型:'物理',骰数:n,骰面:sides,加值:add,穿透档:1,定额发动:true,发动魂力:fee})]}));
 const clawVariant=(presetSuffix,minimumYears,maximumYears,n,sides,add,fee)=>{const requestedBranches=claws(n,sides,add,fee);return {presetSuffix,minimumYears,...(maximumYears?{maximumYears}:{}),requestedBranches,effects:requestedBranches.flatMap(b=>b.requestedEffects),summary:`两爪分别命中，每爪${n}d${sides}+${add}物理伤害，命中+1、1档抗性穿透；${fee}魂力。`};};
 const middle=clawVariant('',16000,29999,2,10,16,22);
 edit(cat,5,middle.effects,'同一目标两爪分别命中，每爪2d10+16物理伤害、命中+1、1档抗性穿透。22魂力，冷却2回合。',{minimumYears:16000,maximumYears:29999,requestedBranches:middle.requestedBranches,cooldownTurns:2,ageVariants:[clawVariant('8000',8000,15999,2,8,10,18),clawVariant('30000',30000,59999,3,8,18,24),clawVariant('60000',60000,89999,3,10,18,26),clawVariant('90000',90000,null,4,10,20,30)]});
 edit(cat,7,trueForm(22,6,'cat',amp('属性伤害',40,{...own,伤害属性:'物理'}),amp('属性伤害',40,{...own,伤害属性:'风'}),amp('移动区',1)),'持续真身：同源物理和风伤+40%、攻击命中+2，自身双防+2、移动+1区。启动22，每回合6，占用12，每场一次。',{cooldownTurns:0});
 const hunt=(dice,add,fee)=>[E('release.melee'),E('target.single',{阵营规则:'敌方'}),E('check.physical_attack',{命中加值:2}),E('payload.damage',{类型:'物理',骰数:dice,骰面:10,加值:add,穿透档:1,定额发动:true,发动魂力:fee}),bind(1)];
 edit(cat,9,hunt(12,48,46),'三道爪影合击：一次命中、一次总伤害，命中+2、12d10+48物理伤害、1档抗性穿透；命中束缚1回合，可力量挣脱。46魂力，冷却4回合，每场2次。',{minimumYears:90000,cooldownTurns:4,usageRules:{perBattleLimit:2},ageVariants:[{presetSuffix:'30000',minimumYears:30000,maximumYears:59999,effects:hunt(8,32,34),summary:'3万年：8d10+32物理伤害，34魂力。'},{presetSuffix:'60000',minimumYears:60000,maximumYears:89999,effects:hunt(10,40,40),summary:'6万年：10d10+40物理伤害，40魂力。'}]});
 cat.NODES[4].description='前爪逼开守势，回身一爪顺着风隙再次切入。两道弧形锋线各自寻找落点，每一道爪锋都承着完整而均衡的魂力。';
 cat.NODES[8].description='白影在目标身周骤然折转，三道爪光从不同角度合向同一处破绽。所有锋芒在一瞬汇成重击，收紧的风线随即扣住对手的落脚处。';
 cat.TREE.description='听风、踏雪与照影寻找战机，裂帛留下出血；剪爪以两道完整锋芒破开抗性，截风锁住退路，再以猎舞集中爆发。真身贯通爪锋，留影脱身接住反击。';
 return {ring,cat};
});
