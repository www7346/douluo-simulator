(function(root,factory){const api=factory(root?.SoulPresetAuthoring??(typeof require==='function'?require('./preset-authoring-core.js'):null));if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulPresetSouls=api;})(typeof globalThis!=='undefined'?globalThis:this,function(h){
 'use strict';
 const ENTRIES=[];
 const SPECIAL_SOULS=new Set(['royal-swan','jiumeitu','blue-silver-emperor','clear-sky-hammer','white-tiger','nether-cat','soft-bone-rabbit','evil-fire-phoenix','six-winged-angel','blue-lightning-dragon','seven-treasure-tower','nine-treasure-tower','nine-heart-begonia','jade-phosphor-snake','luo-san-pao']);
 function soul(id,name,concept,appearance,role,categories,attributes,channels,options={}){
  const draft={name,concept,form:appearance,role,attributeVersion:3,categories:categories.map(v=>`category.${v}`),attributes:attributes.map(([id,investment])=>({id:`attribute.${id}`,investment})),channels:channels.map(v=>`channel.${v}`),traits:options.traits??[],weaknesses:options.weaknesses??[],exchangeContracts:options.exchangeContracts??[],baseAction:{mode:options.mode??'melee',powerTier:options.powerTier??0,attributeId:`attribute.${attributes[0][0]}`},playerConfirmed:true};
  const rarity=options.rarity??(options.era?'跨时代稀有':SPECIAL_SOULS.has(id)?'传承稀有':'常规');
  ENTRIES.push(h.entry('武魂',id,name,concept,appearance,{draft},{...options,rarity}));
 }
 soul('jiumeitu','九美图','画卷内自成九庭，每枚魂环开放一个永久席位；女性失能者或已归画主看管的女性可收入，随后居住、交流并接受调遣。','素绢长卷以金线分出九幅庭院，庭间的门扉随画主意念开合。','收押召唤',['formation'],[['space',2],['mind',2],['physical',1]],['touch','projectile','seal','summon'],{mode:'touch',traits:[{templateId:'trait.independent-realm',level:1,parameter:'nine-beauties-v1'}]});
 soul('blue-silver-grass','蓝银草','柔韧叶片缠住四肢，借生命属性辅助恢复；草叶具有实际可挣脱的部位拘束。','细长蓝银叶从掌心舒展，银色叶脉贴着泥土延伸。','控制辅助',['grass'],[['wood',2],['life',2]],['entangle','heal','touch'],{canonName:'蓝银草',mode:'touch'});
 soul('blue-silver-emperor','蓝银皇','以根系与群落传递生机，擅长缠绕、治疗和维持领域；领域须另取得合法高阶能力。','蓝金藤草围绕掌心结成冠状，纤细根须发出柔和辉光。','控制治疗',['vine'],[['wood',4],['life',6]],['entangle','heal','buff','domain','touch'],{canonName:'蓝银皇',mode:'touch',traits:[{templateId:'trait.channel-mastery',level:1,parameter:'channel.entangle'}]});
 soul('clear-sky-hammer','昊天锤','把金属重量集中到锤面，擅长近战破甲与护盾；宗门秘法和炸环不由此预设授予。','沉黑巨锤垂在手侧，锤头暗金纹路沿敲击方向收束。','近战强攻',['hammer','metal'],[['metal',6],['earth',3]],['melee','armor_break','shield'],{canonName:'昊天锤',powerTier:2,traits:[{templateId:'trait.basic-action-power',level:1,parameter:''}]});
 soul('white-tiger','白虎','以虎爪撕击、躯干护盾和力量增幅形成正面强攻；增幅按期限执行。','白虎虚影伏在肩背，额心黑纹与虎爪光刃同时显化。','强攻防御',['feline'],[['life',4],['metal',3]],['melee','shield','buff','transform'],{canonName:'白虎',powerTier:1});
 soul('nether-cat','幽冥灵猫','以低身突袭、移动和短暂隐匿切入战场；隐匿能力受年限与显形规则约束。','深紫猫影沿脊背游走，利爪带一线冷光，尾影轻缓摆动。','敏攻',['feline','shadow'],[['wind',3],['dark',3]],['melee','movement','stealth'],{canonName:'幽冥灵猫',powerTier:1});
 soul('soft-bone-rabbit','柔骨兔','以近身冲击、追击与精神魅惑形成连贯突袭；魅惑不替角色作出所有决定。','粉白长耳与柔软兔影同时显化，腿部魂纹随跃动拉长。','敏攻控制',['humanoid'],[['life',3],['mind',3]],['melee','movement','charm','teleport'],{canonName:'柔骨兔',powerTier:1});
 soul('evil-fire-phoenix','邪火凤凰','火羽与焰息形成高输出，每次相关主动能力触发欲火反噬，未消退时累升；条件增强保留真实自控负担。','赤紫火羽从背后展开，焰心偏暗，流火沿羽梢滴落。','火系强攻',['avian','flame'],[['fire',5]],['projectile','breath','burn','flight'],{canonName:'邪火凤凰',mode:'ranged',traits:[{templateId:'trait.source-power',level:1,parameter:''}],weaknesses:[{templateId:'weakness.desire-backlash',level:1,parameter:''}],exchangeContracts:[{id:'evil-fire',mode:'condition',payer:'self',burdens:[{effectId:'status.desire',params:{强度:1}}],benefits:{componentIds:['trait.source-power:0']}}]});
 soul('six-winged-angel','六翼天使','以光明翼羽净化和守护，兼具光属性投射；不直接授予神位、绝对裁决或无限飞行。','三对金白光翼分层舒展，细光羽在肩后缓慢落下。','强攻支援',['humanoid','light'],[['light',7],['life',4]],['flight','projectile','cleanse','heal','shield'],{canonName:'六翼天使',mode:'ranged'});
 soul('blue-lightning-dragon','蓝电霸王龙','雷爪近战积累麻痹，龙息向前喷发；雷伤与积层麻痹分别结算。','蓝紫龙鳞覆上手臂，爪尖电弧相连，肩后浮出龙首。','雷系强攻',['dragon','thunder'],[['thunder',5],['life',2]],['melee','breath','paralyze','armor_break'],{canonName:'蓝电霸王龙',powerTier:1});
 soul('seven-treasure-tower','七宝琉璃塔','以塔层分别表达增幅、防护与魂力整备，每个具体辅助效果须有对应技能。','七层玲珑小塔悬在掌上，琉璃窗格依次泛出柔光。','辅助',['formation','crystal'],[['light',3],['life',3]],['buff','shield','resistance','resource','touch'],{canonName:'七宝琉璃塔',mode:'touch'});
 soul('nine-treasure-tower','九宝琉璃塔','九层光塔增加净化与状态防护潜力；单目标、多目标和高级机制继续分别购买。','九层光塔塔檐轻薄，九色细光在晶心交叠。','辅助净化',['formation','crystal'],[['light',4],['life',4]],['buff','shield','resistance','resource','cleanse','status-guard','touch'],{canonName:'九宝琉璃塔',mode:'touch',traits:[{templateId:'trait.sustain-efficiency',level:1,parameter:''}]});
 soul('sausage','香肠','通过登记食物能力制造有限份数的辅助食品，恢复和增幅均须实际食用。','魂力在手掌凝成温热香肠，肠衣泛着淡金细纹。','食物辅助',['organ','life'],[['life',4]],['heal','resource','cleanse','buff','touch'],{canonName:'香肠',mode:'touch'});
 const swan=globalThis.SoulRoyalSwanContent??require('../../shared/royal-swan-content-core.js');
 soul('royal-swan','天鹅',swan.SOUL.description,swan.SOUL.appearance,'御风守护',['avian'],[['wind',5],['mind',3]],['shield','projectile','cleanse','flight','burst','fear','status-guard','transform','domain'],{canonName:'天鹅',mode:'ranged',sourceNote:'用户二创：天斗皇室顶级传承，雪珂、雪崩与真实皇族共用；九环路线属于本游戏设计。'});
 const begonia=globalThis.SoulBegoniaContent??require('../../shared/begonia-content-core.js');
 soul('nine-heart-begonia','九心海棠',begonia.SOUL.description,begonia.SOUL.appearance,'治疗辅助',['flower'],[['life',8]],['heal','cleanse','aura','touch','projectile','burst','transform'],{canonName:'九心海棠',mode:'touch',traits:[{templateId:'trait.attribute-mastery',level:1,parameter:'attribute.life'}]});
 soul('jade-phosphor-snake','碧磷蛇','毒牙和毒雾积累真实毒素，毒性削弱与直接毒蚀伤害分别编译。','青鳞长蛇盘绕手臂，颈侧鳞纹浮着浅绿磷光。','毒系控制',['serpent','poison'],[['toxic-corrosion',5]],['melee','poison','debuff','burst'],{canonName:'碧磷蛇',powerTier:1});
 soul('luo-san-pao','罗三炮','以独立兽影和喷吐冲击表达退化龙系武魂；召唤须付费，不将表现自动当成额外作战单位。','圆润淡紫兽影有短耳与卷尾，腹侧金纹在蓄息时鼓亮。','召唤冲击',['dragon','humanoid'],[['life',3],['earth',3]],['summon','breath','movement'],{canonName:'罗三炮',mode:'ranged',sourceNote:'原著退化武魂的机械适配；具体排气表现不另增加毒系权限。'});
 soul('spirit-eyes','灵眸','以感知标记、精神干扰与精神防护参与战斗；精神与灵魂通道保持分离。','眼眸呈清透蓝金色，视线落点浮出细小同心光纹。','精神侦察',['eye','mind'],[['mind',6]],['sensory','charm','sleep','debuff','projectile'],{canonName:'灵眸',era:'斗罗大陆第二部时期',mode:'ranged',traits:[{templateId:'trait.ability-training',level:1,parameter:'感知'}]});
 soul('ice-jade-scorpion','冰碧帝皇蝎','冰螯近战与寒息减速，冰甲提供有限护盾；极致冰表现不跳过年限和免疫价格。','碧绿晶甲覆上双臂，背后蝎尾虚影凝着白霜。','冰系强攻',['arachnid','frost'],[['ice',7],['life',2]],['melee','freeze','shield','resistance'],{canonName:'冰碧帝皇蝎',era:'斗罗大陆第二部时期',powerTier:1});
 soul('light-goddess-butterfly','光明女神蝶','蝶翼表达光属性投射、飞行与遮目辉光；华丽外观不自动赋予精神控制。','蓝金蝶翼边缘洒落星状光粉，翼面有清晰眼斑。','光系敏攻',['insect','light'],[['light',5],['wind',2]],['projectile','flight','blind','movement'],{canonName:'光明女神蝶',era:'斗罗大陆第二部时期',mode:'ranged'});
 soul('shackle-chain','玄契锁链','身后双手维持真实拘束时，同源输出强化；拆除拘束即关闭增强，外来器具不被自动拆除。','黑铁细链穿过腕侧悬环，暗银魂纹只在链条绷紧时发亮。','代价控制',['chain','metal'],[['metal',4],['earth',2]],['entangle','melee','shield'],{mode:'touch',traits:[{templateId:'trait.source-power',level:1,parameter:''}],exchangeContracts:[{id:'behind-hands',mode:'condition',payer:'self',burdens:[{effectId:'status.limb_bind',params:{部位:'双手',姿态:'身后',层数:1}}],benefits:{componentIds:['trait.source-power:0']}}]});
 soul('woodland-bow','青木弓','弓弦将魂力凝成箭，擅长远射、标记与沿标记追击。','青褐长弓弓背嵌着嫩绿叶纹，箭簇由细风聚成。','远程侦察',['bow','wood'],[['wood',3],['wind',2]],['projectile','sensory','movement'],{mode:'ranged',powerTier:1});
 soul('patrol-shield','磐纹盾','盾面守护与近战撞击，防御强化分别影响护盾、物防和开战防护。','灰白岩纹沿圆盾边缘形成三道护环，盾心留有旧击痕。','防御',['shield','stone'],[['earth',4],['metal',2]],['shield','melee','buff','resistance']);
 soul('clear-wave-lotus','澄波水莲','清水药力兼具治疗、净化与短时护盾，水属性与生命属性同时登记。','浅蓝水莲漂在掌上，露珠沿花瓣汇向淡绿花心。','治疗防护',['aquatic-plant','flower'],[['water',3],['life',4]],['heal','cleanse','shield','touch'],{mode:'touch'});
 soul('healing-staff','白榆杖','白木杖接触伤处引导生机，持续治疗与普通近战防身分开执行。','白榆杖杖首分叉如新枝，柔光围着木纹缓慢流转。','治疗',['staff','wood'],[['life',4],['wood',2]],['heal','melee','buff','cleanse']);
 soul('trail-hound','寻山犬','凭气味与听觉追踪，标记敌人并借短扑接近；感知强化保留真实检定。','灰褐犬影竖起双耳，爪下细尘沿足迹低低旋动。','侦察敏攻',['canine'],[['life',2],['wind',3]],['melee','sensory','movement'],{powerTier:1,traits:[{templateId:'trait.ability-training',level:1,parameter:'感知'}]});
 soul('forge-hammer','玄铁锤','金属锤面击裂护甲，有限护盾支持锻造与正面交锋。','短柄玄铁锤锤面呈四方，火星般的金点沉在锤脊里。','破甲强攻',['hammer','metal'],[['metal',4],['earth',2]],['melee','armor_break','shield'],{powerTier:1});
 soul('iron-spear','玄铁枪','枪尖定向穿刺并击退来敌，力量投入与命中专长分别计价。','深灰长枪枪头细窄，银色纵线一直延伸到枪尾。','强攻',['spear','metal'],[['metal',3],['earth',2]],['melee','armor_break','movement'],{powerTier:1,traits:[{templateId:'trait.basic-action-accuracy',level:1,parameter:''}]});
 soul('sea-bird','逐潮鸥','风翼飞行、追击与水边侦察，飞行高度与期限由具体魂技决定。','灰白海鸥虚影展翅，翅尖青线随着海风轻轻弯折。','侦察移动',['avian'],[['wind',3],['water',2]],['flight','melee','sensory','movement']);
 soul('moon-mirror','照月镜','镜光标记与灵魂干扰，灵魂伤害和精神控制互不通用。','圆镜外缘刻着银月纹，镜面倒影比实物慢半息收拢。','灵魂侦察',['crystal','moon'],[['soul',4],['light',2]],['soul-interference','sensory','resistance','projectile'],{mode:'ranged'});
 // The adapted Taiyin inheritance is registered by its character route, outside
 // the fixed foundation collection. Its initial body never includes later rings.
 function taiyinDraft(){return {name:'薜荔',concept:'以湖月秋为根基，阴为主、水为辅。月华凝剑，澄澈善变，随魂环领悟新的剑术与月法。',form:'青白月璃凝成长剑，剑脊如一泓秋水，薄月纹沿刃舒展；挥动时只留清冷的水光。',role:'剑术与太阴月法',attributeVersion:3,categories:['category.sword','category.moon'],attributes:[{id:'attribute.yin',investment:8},{id:'attribute.water',investment:4}],channels:['channel.melee','channel.projectile','channel.beam','channel.shield','channel.cleanse','channel.sensory','channel.sustain'],traits:[{templateId:'trait.attribute-mastery',parameter:'attribute.yin',level:1},{templateId:'trait.attribute-mastery',parameter:'attribute.water',level:1}],weaknesses:[],exchangeContracts:[],baseAction:{mode:'melee',powerTier:2,attributeId:'attribute.yin'},playerConfirmed:true};}
 const women=globalThis.SoulCanonicalWomenContent??require('../../shared/canonical-women-content-core.js');
 for(const p of women.PROFILES){
  const s=p.SOUL,id=s.id.slice(7),index=ENTRIES.findIndex(v=>v.id===s.id);
  const rarity=p.npcFamily?'稀有':s.id==='preset:silver-shuttle-silk'?'角色传承':ENTRIES[index]?.gates.rarity;
  const options={rarity,sourceNote:p.sourceNote??'原著武魂与本游戏精修路线；未详述的技能、环位和数值为游戏设计。'};
  if(!p.npcFamily&&s.id!=='preset:silver-shuttle-silk')options.canonName=s.name;
  const entry=h.entry('武魂',id,s.name,s.description,s.appearance,{draft:h.clone(s.draft)},options);
  if(index>=0)ENTRIES[index]=entry;else ENTRIES.push(entry);
 }
 return Object.freeze({ENTRIES,taiyinDraft});
});
