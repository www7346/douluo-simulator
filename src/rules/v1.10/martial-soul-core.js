(function attachMartialSoulCore(root, factory) {
  const abilities=root?.SoulAbilityContract??(typeof require==='function'?require('./ability-contract-core.js'):null);
  const materialAppearance=root?.SoulMaterialAppearance??(typeof require==='function'?require('../../shared/material-appearance-core.js'):null);
  const api = factory(abilities,materialAppearance);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SoulMartialSoulCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createMartialSoulCore(abilities,materialAppearance) {
  'use strict';

  const VERSION = '2.10.0';
  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const clean = value => String(value ?? '').trim();
  const unique = values => [...new Set((Array.isArray(values) ? values : []).map(clean).filter(Boolean))];
  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, Number(value) || 0));
  const slug = value => clean(value).toLowerCase().replace(/[^a-z0-9\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 64);

  const QUALITY_GRADES = Object.freeze([
    {id: 'waste', value: 1, name: '废武魂', minValue: 0, maxValue: 14, conversion: 0.90},
    {id: 'common', value: 2, name: '普通武魂', minValue: 15, maxValue: 29, conversion: 0.95},
    {id: 'rare', value: 3, name: '稀有武魂', minValue: 30, maxValue: 44, conversion: 1.00},
    {id: 'top', value: 4, name: '顶级武魂', minValue: 45, maxValue: 64, conversion: 1.05},
    {id: 'divine', value: 5, name: '神级武魂', minValue: 65, maxValue: 100, conversion: 1.10}
  ]);

  function makeCatalog(spec, mapper) {
    return Object.freeze(Object.fromEntries(spec.map((row, index) => {
      const item = mapper(row, index);
      return [item.id, Object.freeze(item)];
    })));
  }

  const CATEGORY_SPEC = [
    ['plant','植物','生物',0,['植物','生命'],['植株'],false],['vine','藤蔓','生物',3,['植物','藤蔓','缠绕','延伸'],['藤本']],
    ['grass','草本','生物',1,['植物','草本'],['草']],['flower','花卉','生物',2,['植物','花粉','香气'],['花']],
    ['tree','木本','生物',3,['植物','木质','根系'],['树木','古树']],['root','根茎','生物',2,['植物','根系','储藏'],['块茎']],
    ['seed-fruit','果实种子','生物',2,['植物','果实','种子'],['果实','种子']],['aquatic-plant','水生植物','生物',3,['植物','水生','水'],['水草']],
    ['parasitic-plant','寄生植物','生物',4,['植物','寄生','汲取'],['寄生藤']],['carnivorous-plant','食肉植物','生物',4,['植物','捕食','消化'],['捕虫植物']],
    ['bryophyte','苔藓蕨类','生物',2,['植物','苔藓','孢子'],['苔藓','蕨类']],['other-plant','其他植物','生物',2,['植物'],['植物（其他）']],
    ['fungus','菌类','生物',3,['孢子','毒蚀','再生'],['蘑菇']],
    ['insect','昆虫','生物',2,['昆虫','甲壳'],['虫']],['arachnid','蛛形','生物',3,['蛛网','毒液','多肢'],['蜘蛛']],
    ['serpent','蛇类','生物',3,['蛇','长体','缠绕','毒液'],['蛇']],['dragon','龙类','生物',8,['龙','威压','吐息','甲壳'],['真龙','巨龙']],
    ['avian','鸟类','生物',3,['鸟','飞行','翅膀'],['飞禽']],['feline','猫科','生物',3,['猫科','利爪','突袭'],['猫']],
    ['canine','犬科','生物',3,['犬科','追踪','扑咬'],['狼','犬']],['bear','熊类','生物',3,['熊','力量','韧性']],
    ['bovine','牛类','生物',2,['牛','冲锋','力量']],['equine','马类','生物',2,['马','速度','耐力']],
    ['aquatic','水生','生物',3,['水生','游泳','水']],['mollusk','软体','生物',2,['软体','黏液','韧性']],
    ['crustacean','甲壳水族','生物',3,['甲壳','水生','钳']],['humanoid','人形','生物',4,['人形','技巧','适应']],
    ['bone','骨骼','本体',3,['骨骼','坚固','穿刺'],['骨']],['blood','血液','本体',5,['血液','生命','循环'],['血']],
    ['eye','眼瞳','本体',5,['眼瞳','感知','精神'],['眼睛']],['heart','心脏','本体',5,['心脏','生命','爆发']],
    ['skin','皮肤','本体',3,['皮肤','防御','感知']],['hair','毛发','本体',2,['毛发','延伸','感知']],
    ['limb','肢体','本体',2,['肢体','近战','力量']],['nervous','神经','本体',5,['神经','雷电','精神']],
    ['organ','脏器','本体',4,['脏器','生命','转化']],['symbiote','共生体','本体',6,['共生','适应','再生']],
    ['blade','刀刃','器物',3,['武器','斩击','近战'],['刀']],['sword','剑器','器物',4,['武器','斩击','技巧'],['剑']],
    ['spear','枪矛','器物',4,['武器','穿刺','延伸'],['枪','矛']],['hammer','锤器','器物',5,['武器','钝击','冲击','力量'],['锤']],
    ['bow','弓弩','器物',4,['武器','投射','远程'],['弓','弩']],['shield','盾牌','器物',4,['武器','防御','守护'],['盾']],
    ['armor','甲胄','器物',5,['甲壳','防御','守护'],['铠甲']],['chain','锁链','器物',4,['武器','缠绕','延伸'],['链']],
    ['staff','杖器','器物',3,['法杖','引导','能量'],['杖']],['grimoire','典籍','器物',5,['书写','知识','规则'],['书','典籍']],
    ['cauldron','炉鼎','器物',5,['炼化','容纳','火焰'],['鼎','丹炉']],['seal','印玺','器物',6,['封印','权柄','规则'],['印']],
    ['formation','阵图','器物',6,['阵法','领域','规则'],['阵盘']],['instrument','乐器','器物',4,['声波','精神','范围'],['琴','笛']],
    ['firearm','枪械','器物',5,['武器','投射','爆发'],['火器']],['mechanism','机关造物','器物',5,['机械','控制','组合'],['机关','傀儡']],
    ['textile','织物','材料',2,['柔韧','缠绕','防御'],['丝带','布']],['metal','金属','材料',3,['金属','坚固','传导']],
    ['stone','岩石','材料',3,['土','岩石','坚固']],['crystal','晶体','材料',4,['晶体','储能','折射']],
    ['wood','木质','材料',2,['木','植物','韧性']],['fluid','流体','材料',3,['流体','变化','渗透']],
    ['gas','气体','材料',3,['气体','扩散','范围']],['energy','能量体','能量',5,['能量','元素','无形']],
    ['flame','火焰现象','现象',4,['火焰','高温','能量']],['frost','冰霜现象','现象',4,['冰霜','寒冰','凝固']],
    ['thunder','雷霆现象','现象',4,['雷电','麻痹','传导']],['storm','风暴现象','现象',5,['风','雷电','范围']],
    ['ocean','海洋现象','现象',5,['水','潮汐','范围']],['earth','大地现象','现象',4,['土','坚固','地形']],
    ['mountain','山岳意象','现象',5,['山岳','重压','坚固']],['sun','太阳意象','天体',7,['太阳','光明','火焰']],
    ['moon','月亮意象','天体',6,['月亮','阴影','精神']],['star','星辰意象','天体',6,['星辰','光明','空间']],
    ['shadow','阴影现象','现象',5,['阴影','隐匿','黑暗']],['light','光辉现象','现象',5,['光明','净化','能量']],
    ['void','虚无现象','概念',8,['虚无','吞噬','空间']],['space','空间概念','概念',8,['空间','位移','边界']],
    ['time','时间概念','概念',10,['时间','持续','规则']],['gravity','重力概念','概念',7,['重力','压制','位移']],
    ['dream','梦境概念','概念',6,['梦境','精神','幻象']],['sound','声音概念','概念',4,['声音','风','震荡']],
    ['poison','毒蚀概念','概念',4,['毒蚀','毒素','腐蚀','生命'],['毒性概念']],['plague','疫病概念','概念',6,['毒蚀','传播','生命']],
    ['life','生命概念','概念',7,['生命','治疗','再生']],['death','死亡概念','概念',8,['死亡','灵魂','规则']],
    ['soul','灵魂概念','概念',8,['灵魂','规则']],['mind','心灵概念','概念',6,['精神','感知','控制']],
    ['order','秩序概念','概念',8,['秩序','封印','规则']],['chaos','混沌概念','概念',8,['混沌','变化','破坏']],
    ['causality','因果概念','概念',10,['因果','规则','追溯']],['fate','命运概念','概念',10,['命运','预判','规则']],
    ['memory','记忆概念','概念',7,['记忆','精神','复制']],['emotion','情绪概念','概念',5,['情绪','精神','增幅']],
    ['boundary','边界概念','概念',8,['边界','空间','封印']],['creation','创造概念','概念',10,['创造','召唤','规则']],
    ['destruction','毁灭概念','概念',9,['毁灭','破坏','能量']],['devouring','吞噬概念','概念',8,['吞噬','汲取','转化']],
    ['replication','复制概念','概念',8,['复制','模仿','变化']],['transformation','变化概念','概念',7,['变化','变身','适应']],
    ['domain','领域概念','概念',8,['领域','环境','持续']]
  ];
  const CATEGORY_REGISTRY = makeCatalog(CATEGORY_SPEC, row => ({id: `category.${row[0]}`, name: row[1], family: row[2], cost: row[3], tags: row[4], aliases: row[5] ?? [], selectable: row[6] !== false}));

  const ATTRIBUTE_SPEC = [
    ['physical','物理',2,['钝击','斩击','穿刺','常规攻击']],
    ['metal','金',3,['金属','磁力']],['wood','木',2,['植物','木质']],['water','水',2,['海洋','潮汐']],
    ['fire','火',3,['火焰','高温','太阳']],['earth','土',2,['岩石','大地','重力']],['wind','风',3,['声音','声波','震荡','气流']],
    ['thunder','雷',4,['雷电','电击']],['ice','冰',4,['冰霜','寒冰','寒冷','月华']],['light','光',4,['光明','神圣','辐光']],
    ['dark','暗',4,['黑暗','阴影','邪异']],['toxic-corrosion','毒蚀',3,['毒','毒素','腐蚀','酸蚀','疫病','attribute.poison','attribute.corrosion']],
    ['life','生命',5,['再生','治疗','生灵']],['death','死亡',6,['亡灵','凋亡']],['destruction','毁灭',9,['破坏','混沌']],
    ['mind','精神',6,['心灵','梦','梦境','幻象','记忆','情绪']],
    ['soul','灵魂',6,[]],
    ['yin','阴',4,['阴性']],['yang','阳',4,['阳性']],['lust','淫',6,['欲念']],
    ['space','空间',7,['虚无','传送','边界']],['time','时间',9,['时序','加速','减速']]
  ];
  const ATTRIBUTE_VERSION = 3;
  const ATTRIBUTE_REGISTRY = makeCatalog(ATTRIBUTE_SPEC, row => ({id: `attribute.${row[0]}`, name: row[1], unitCost: row[2], minimumInvestment:Math.ceil(row[2]/5), maximumInvestment:row[2]*2, damageType: row[1], aliases: row[3] ?? []}));

  const CHANNEL_SPEC = [
    ['followup','有限同源追击',8,['target.self','status.limited_followup','payload.stack_confluence'],'高级'],
    ['check-penalty','后续检定压制',6,['target.single','status.next_check_penalty'],'高级'],
    ['battle-resource','战斗事件资源',9,['target.self','target.single','payload.resource_damage','payload.resource_endstate','status.battle_resource'],'高级'],
    ['zone-dispel','空间区域驱散',6,['target.self','payload.zone_dispel'],'高级'],
    ['item-seal','物品超凡封锁',8,['target.single','status.power_seal'],'高级'],
    ['summon-inheritance','指定技能实体继承',9,['target.self','summon.entity','sustain.maintain'],'高级'],
    ['avatar-enhancement','定向真身增强',9,['target.self','transform.martial_avatar','sustain.maintain'],'高级'],
    ['hit-interference','命中干涉',10,['target.self','target.single','status.hit_advantage','status.hit_disadvantage','status.hit_reroll','status.evasion_reroll','status.sure_hit','status.absolute_evasion','status.critical_guarantee','status.critical_guard','status.miss_graze','modifier.hit_advantage','modifier.hit_reroll','modifier.sure_hit','modifier.critical_guarantee','modifier.miss_graze'],'高级'],
    ['melee','近战打击',2,['release.melee','target.single','check.physical_attack','payload.damage','intimate.stimulate','intimate.climax'],'基础'],
    ['touch','接触传递',1,['release.touch','target.single','check.soul_attack','intimate.stimulate','intimate.climax'],'基础'],
    ['projectile','远程投射',4,['release.projectile','target.single','check.soul_attack','payload.damage'],'基础'],
    ['beam','射线贯穿',5,['release.projectile','target.line','check.soul_attack','payload.damage'],'基础'],
    ['breath','吐息扩散',5,['release.projectile','target.cone','check.save','payload.damage'],'基础'],
    ['burst','爆发区域',6,['release.projectile','target.cluster','target.burst','check.save','payload.damage'],'基础'],
    ['chain','连锁传导',7,['release.projectile','target.chain','check.soul_attack','payload.damage'],'基础'],
    ['aura','光环辐射',6,['target.aura'],'基础'],
    ['entangle','缠绕拘束',4,['release.projectile','target.single','check.save','status.bind','status.limb_bind','status.mute','move.pull','intimate.stimulate','intimate.climax']],
    ['poison','毒蚀传递',4,['release.touch','release.projectile','target.single','status.poison','status.paralysis','status.buff','status.slow','status.blind','status.mute','status.limb_bind','status.power_seal','status.silence']],
    ['wound','创伤延续',4,['release.melee','release.touch','target.single','status.damage_over_time']],
    ['burn','燃烧附着',4,['payload.damage','status.burn','zone.hazard']],
    ['freeze','冻结塑形',4,['payload.damage','status.slow','zone.wall']],
    ['paralyze','神经麻痹',5,['status.paralysis','status.stun']],
    ['armor_break','破甲震荡',4,['payload.damage','status.armor_break','move.knockback']],
    ['shield','护盾守护',4,['target.self','target.single','payload.shield','reaction.interpose']],
    ['repair','物质修复',6,['release.touch','target.self','target.single','payload.repair_item']],
    ['fabricate','永久造物',8,['target.self','payload.fabricate'],'高级'],
    ['key-creation','实体钥匙造物',8,['release.touch','target.self','payload.create_key'],'高级'],
    ['device-lock','锁定解构',7,['release.touch','target.self','target.single','payload.unlock','payload.suppress_lock','payload.analyze_lock']],
    ['arcane-lock','魔法锁构造',7,['release.touch','target.self','target.single','payload.arcane_lock']],
    ['rule-break','条件规则破坏',10,['release.touch','target.self','target.single','payload.rule_break'],'高级'],
    ['heal','生命治疗',5,['target.single','payload.heal','payload.restore','status.regeneration']],
    ['cleanse','净化驱散',6,['target.single','payload.cleanse','payload.dispel']],
    ['drain','生命汲取',6,['target.single','payload.drain','payload.soul_damage','payload.soul_restore','intimate.stimulate']],
    ['buff','属性增幅',4,['target.self','target.single','target.allies','status.buff','status.amplify','status.haste','modifier.next_skill']],
    ['debuff','属性压制',4,['target.single','check.save','status.buff','status.slow','status.eternal_wound','intimate.stimulate']],
    ['fear','威压恐惧',5,['target.aura','check.save','status.fear']],
    ['charm','心灵魅惑',5,['target.single','check.save','status.charm','status.desire','intimate.stimulate','intimate.climax','status.mind_control','status.cognition_shift']],
    ['sleep','睡眠梦境',5,['target.single','check.save','status.sleep']],
    ['blind','感知剥夺',5,['target.single','status.blind','zone.obscure']],
    ['silence','封技沉默',6,['target.single','status.silence','status.mute']],
    ['stealth','隐匿幻象',6,['target.self','status.invisibility','zone.obscure']],
    ['movement','机动位移',3,['target.self','status.haste','move.knockback','move.pull','move.approach','move.pursuit']],
    ['step','轻步挪移',3,['target.self','move.step']],
    ['status-guard','状态防护',6,['target.self','target.single','status.status_guard'],'常规',{modes:['抗性','免疫']}],
    ['resistance','抗性改变',6,['target.self','target.single','status.resistance_shift'],'常规',{modes:['抗性','易伤']}],
    ['resource','魂力循环',6,['target.self','target.single','payload.soul_restore','payload.restore']],
    ['sensory','感知侦察',3,['target.self','payload.recon','target.single','target.aura','status.buff','status.mark','zone.obscure']],
    ['flight','飞行升空',5,['target.self','move.flight'],'高级'],
    ['contract-oath','灵魂誓约',9,['release.touch','target.single','contract.oath','trigger.contract'],'高级'],
    ['death','真实死亡',12,['release.touch','target.single','check.save','payload.death'],'高级'],
    ['world-duration','长期世界期限',10,['modifier.world_duration'],'高级'],
    ['realm-storage','人物空间收容',9,['release.touch','target.single','check.save','realm.store'],'高级'],
    ['teleport','空间跃迁',7,['target.self','move.teleport'],'高级'],
    ['area-shaping','区域塑形',7,['target.burst','zone.wall','zone.hazard','zone.obscure'],'高级'],
    ['domain','领域展开',8,['target.self','target.aura','domain.field','sustain.maintain'],'高级'],
    ['summon','实体召唤',8,['target.self','summon.entity','sustain.maintain'],'高级'],
    ['disguise','仪容伪装',4,['target.self','target.single','release.touch','check.save','transform.disguise','sustain.maintain'],'高级'],
    ['transform','形态变化',7,['target.self','target.single','check.save','transform.form','transform.sex','transform.martial_avatar','copy.skillset','sustain.maintain'],'高级'],
    ['counter','反应反制',8,['reaction.counter','reaction.reflect'],'高级'],
    ['sustain','持续维持',3,['sustain.maintain'],'高级'],
    ['absorption','属性吸收',9,['target.self','target.single','status.resistance_shift'],'高级',{modes:['免疫','吸收']}],
    ['invulnerability','绝对防御',10,['target.self','status.invulnerable'],'高级'],
    ['revive','生命复苏',10,['target.single','payload.revive'],'高级'],
    ['soul-interference','灵魂干涉',7,['target.single','check.soul_attack','payload.soul_damage','status.soul_control'],'高级'],
    ['seal','封印压制',7,['target.single','status.silence','status.mute','status.power_seal','status.mind_control','status.soul_control','status.cognition_shift','status.bind','status.limb_bind','payload.dispel'],'高级'],
    ['formation','阵法编织',8,['target.burst','domain.field','zone.wall','sustain.maintain'],'高级']
  ];
  const CHANNEL_TIER_NAMES = Object.freeze({基础:'基础机制',常规:'常规机制',高级:'高阶机制'});
  const CHANNEL_REGISTRY = makeCatalog(CHANNEL_SPEC, row => ({id: `channel.${row[0]}`, name: row[1], cost: row[2], effectIds: row[3], tier: CHANNEL_TIER_NAMES[row[4] ?? '常规'], effectRules: row[5] ?? {}, tags: row[1].split(/[\s/]+/)}));

  const BASE_ACTION_MODES = Object.freeze({
    melee:Object.freeze({id:'melee',name:'近战攻击',releaseId:'release.melee',checkId:'check.physical_attack'}),
    touch:Object.freeze({id:'touch',name:'接触攻击',releaseId:'release.touch',checkId:'check.soul_attack'}),
    aura:Object.freeze({id:'aura',name:'守心领域'}),
    disguise:Object.freeze({id:'disguise',name:'外貌伪装'}),
    ranged:Object.freeze({id:'ranged',name:'远程攻击',releaseId:'release.projectile',checkId:'check.soul_attack'})
  });

  const TRAIT_TEMPLATES = Object.freeze([
    {id:'trait.permanent-manifestation',name:'常驻外放',baseCost:8,perLevel:0,maxLevel:1,parameters:'none',hook:'permanentManifestation',randomLineage:false},
    {id:'trait.independent-realm',name:'独立画境',baseCost:40,perLevel:0,maxLevel:1,parameters:'realmProfiles',hook:'independentRealm'},
    {id:'trait.source-power',name:'同源载荷增强',baseCost:8,perLevel:8,maxLevel:3,parameters:'none',hook:'sourcePower'},
    {id:'trait.source-control',name:'同源控制专精',baseCost:8,perLevel:0,maxLevel:1,parameters:'none',hook:'sourceControl'},
    {id:'trait.ability-training',name:'六维锤炼',baseCost:5,perLevel:0,maxLevel:1,parameters:'abilityScores',hook:'abilityScore'},
    {id:'trait.attack-training',name:'检定熟练',baseCost:5,perLevel:0,maxLevel:1,parameters:'attackChecks',hook:'checkBonus'},
    {id:'trait.save-advantage',name:'豁免专长',baseCost:6,perLevel:0,maxLevel:1,parameters:'abilityScores',hook:'saveAdvantage'},
    {id:'trait.initiative-advantage',name:'先发本能',baseCost:4,perLevel:0,maxLevel:1,parameters:'none',hook:'initiativeAdvantage'},
    {id:'trait.break-free-expert',name:'挣脱专家',baseCost:3,perLevel:0,maxLevel:1,parameters:'none',hook:'breakFreeBonus'},
    {id:'trait.escape-expert',name:'撤退专家',baseCost:3,perLevel:0,maxLevel:1,parameters:'none',hook:'escapeBonus'},
    {id:'trait.soul-capacity',name:'魂力充盈',baseCost:6,perLevel:0,maxLevel:1,parameters:'none',hook:'soulPowerCapacity'},
    {id:'trait.soul-efficiency',name:'魂力节流',baseCost:7,perLevel:0,maxLevel:1,parameters:'none',hook:'soulPowerDiscount'},
    {id:'trait.sustain-efficiency',name:'维持专精',baseCost:6,perLevel:0,maxLevel:1,parameters:'none',hook:'sustainDiscount'},
    {id:'trait.kill-recovery',name:'猎杀回流',baseCost:5,perLevel:0,maxLevel:1,parameters:'none',hook:'killSoulRecovery'},
    {id:'trait.attribute-mastery',name:'属性专精',baseCost:5,perLevel:0,maxLevel:1,parameters:'attributes',hook:'attributeMastery',aliases:['属性增幅']},
    {id:'trait.resistance',name:'属性适应',baseCost:8,perLevel:0,maxLevel:1,parameters:'attributes',hook:'resistance',aliases:['属性抗性']},
    {id:'trait.channel-mastery',name:'机制专修',baseCost:4,perLevel:0,maxLevel:1,parameters:'channels',hook:'channelMastery'},
    {id:'trait.basic-action-power',name:'基础动作强化',baseCost:4,perLevel:0,maxLevel:1,parameters:'none',hook:'baseActionPower'},
    {id:'trait.basic-action-accuracy',name:'基础动作精准',baseCost:3,perLevel:0,maxLevel:1,parameters:'none',hook:'baseActionAccuracy'},
    {id:'trait.defense-training',name:'防御锤炼',baseCost:5,perLevel:0,maxLevel:1,parameters:'defenseTypes',hook:'defenseBonus'}
  ]);

  const WEAKNESS_TEMPLATES = Object.freeze([
    {id:'weakness.soul-cost',name:'魂力高耗',refund:3,maxLevel:1,parameters:'none',hook:'soulCostIncrease'},
    {id:'weakness.setup',name:'显化迟滞',refund:5,maxLevel:1,parameters:'none',hook:'advancedFirstRoundLock'},
    {id:'weakness.sustain-instability',name:'维持不稳',refund:4,maxLevel:1,parameters:'none',hook:'sustainCostIncrease'},
    {id:'weakness.physical-fragility',name:'物理脆弱',refund:10,maxLevel:1,parameters:'none',hook:'physicalVulnerability'},
    {id:'weakness.damaged-manifestation',name:'破损显化',refund:4,maxLevel:1,parameters:'none',hook:'damagedAttackPenalty'},
    {id:'weakness.desire-backlash',name:'欲火反噬',refund:0,maxLevel:1,parameters:'none',hook:'desireBacklash'}
  ]);

  function humanizeRegisteredToken(value, fallback='未登记词条') {
    const token=clean(value); if(!token)return fallback;
    const registries=[CATEGORY_REGISTRY,ATTRIBUTE_REGISTRY,CHANNEL_REGISTRY,Object.fromEntries(TRAIT_TEMPLATES.map(item=>[item.id,item])),Object.fromEntries(WEAKNESS_TEMPLATES.map(item=>[item.id,item]))];
    for(const registry of registries){const id=resolveId(token,registry);if(id&&registry[id]?.name)return registry[id].name;}
    return /^[a-z]+(?:[._-][a-z0-9-]+)+$/i.test(token)?fallback:token;
  }

  // Material form is prose only; categories, fingerprints and prices stay unchanged.
  function materialAppearancePart(value) {
    return materialAppearance.part(value,humanizeRegisteredToken);
  }

  const DAMAGE_TYPES = Object.freeze(Object.values(ATTRIBUTE_REGISTRY).map(item => item.name));
  const STATUS_TYPES = Object.freeze(['束缚','麻痹','灼烧','中毒','破甲','眩晕','恐惧','魅惑','致盲','封技','睡眠','迟缓']);
  const PARAMETER_OPTIONS = Object.freeze({
    attributes:Object.keys(ATTRIBUTE_REGISTRY), channels:Object.keys(CHANNEL_REGISTRY), damageTypes:DAMAGE_TYPES,
    abilityScores:['力量','身法','体魄','悟性','感知','意志'], attackChecks:['物理攻击','魂技攻击','魂技DC'],
    realmProfiles:['nine-beauties-v1'], defenseTypes:['物理防御','魂技防御'], statuses:STATUS_TYPES, none:['']
  });

  const aliasIndex = new Map();
  for (const registry of [CATEGORY_REGISTRY, ATTRIBUTE_REGISTRY, CHANNEL_REGISTRY]) {
    for (const item of Object.values(registry)) {
      for (const key of [item.id,item.name,...(item.aliases ?? [])]) aliasIndex.set(clean(key).toLowerCase(), item.id);
    }
  }
  for (const item of [...TRAIT_TEMPLATES,...WEAKNESS_TEMPLATES]) {
    for (const key of [item.id,item.name,...(item.aliases ?? [])]) aliasIndex.set(clean(key).toLowerCase(), item.id);
  }

  function resolveId(value, registry) {
    const raw = clean(typeof value === 'object' ? value.id : value);
    if (!raw) return '';
    if (registry[raw]) return raw;
    const local = Object.values(registry).find(item => [item.name,...(item.aliases ?? [])].some(alias => clean(alias).toLowerCase() === raw.toLowerCase()));
    if (local) return local.id;
    const indexed = aliasIndex.get(raw.toLowerCase());
    return indexed && registry[indexed] ? indexed : '';
  }

  function normalizeAttributeEntries(raw, version) {
    if(version!==undefined&&version!==ATTRIBUTE_VERSION)throw new Error('属性配置已拆分精神与灵魂，请重新选择当前版本属性');
    const values = Array.isArray(raw) ? raw : [];
    const result = [];
    for (const entry of values) {
      const id = resolveId(entry, ATTRIBUTE_REGISTRY);
      if (!id) {
        throw new Error('属性选项无法识别，请重新选择');
      }
      if(result.some(item=>item.id===id))throw new Error('同一种属性只能选择一次');
      const definition=ATTRIBUTE_REGISTRY[id];
      const hasInvestment=entry&&Object.hasOwn(entry,'investment');
      const hasAffinity=entry&&Object.hasOwn(entry,'affinity');
      if(hasAffinity)throw new Error('旧属性契合值不受支持，请重新选择属性投入');
      if(!hasInvestment)throw new Error('请填写该属性投入的造化点');
      let investment;
      if(hasInvestment){
        investment=entry.investment;
        if(typeof investment!=='number'||!Number.isInteger(investment)||investment<definition.minimumInvestment||investment>definition.maximumInvestment)throw new Error(`${definition.name}属性投入须为${definition.minimumInvestment}至${definition.maximumInvestment}之间的整数造化点`);
      }
      result.push({id,investment});
    }
    return result;
  }

  function attributeStrength(entry) {
    const normalized=normalizeAttributeEntries([entry])[0];
    return normalized?Math.floor(50*normalized.investment/ATTRIBUTE_REGISTRY[normalized.id].unitCost):0;
  }

  function normalizeCompiledAttributes(compiled) {
    if(compiled.attributeVersion!==ATTRIBUTE_VERSION||compiled.definition?.attributeVersion!==ATTRIBUTE_VERSION)throw new Error('属性配置版本不受支持，请重新选择精神与灵魂属性');
    const definition=normalizeDraft(compiled.definition);
    const supplied=normalizeAttributeEntries(compiled.attributes,compiled.attributeVersion);
    if(JSON.stringify(supplied)!==JSON.stringify(definition.attributes))throw new Error('武魂属性投入与原始配置不一致');
    const pricing=componentCost(definition);
    if(pricing.total!==compiled.pricing?.total)throw new Error('武魂属性投入与造化点账本不一致');
    if(JSON.stringify(compiled.exchangeContracts??[])!==JSON.stringify(definition.exchangeContracts)||JSON.stringify(compiled.mechanicalHooks)!==JSON.stringify(compileHooks(definition)))throw new Error('武魂交换合同或组件钩子不一致');
    return compiled;
  }

  function inferUnambiguousTraitParameter(template, context = {}) {
    if (template.id === 'trait.attribute-mastery') {
      const candidates = unique(context.attributeIds ?? []);
      return candidates.length === 1 ? candidates[0] : '';
    }
    if (template.id === 'trait.channel-mastery') {
      const candidates = unique(context.channelIds ?? []);
      return candidates.length === 1 ? candidates[0] : '';
    }
    return '';
  }

  function normalizeTraitEntries(raw, templates, context = {}) {
    const registry = Object.fromEntries(templates.map(item => [item.id,item]));
    const result = [];
    for (const entry of Array.isArray(raw) ? raw : []) {
      const id = resolveId(entry?.templateId ?? entry, registry);
      const template = registry[id];
      if (!template) continue;
      const level = Math.round(clamp(entry?.level ?? 1,1,template.maxLevel ?? 1));
      const suppliedParameter = clean(entry?.parameter);
      let parameter = suppliedParameter;
      if (template.parameters === 'none') parameter = '';
      else if (template.parameters === 'attributes') parameter = resolveId(parameter, ATTRIBUTE_REGISTRY);
      else if (template.parameters === 'channels') parameter = resolveId(parameter, CHANNEL_REGISTRY);
      else if (template.parameters !== 'none' && !PARAMETER_OPTIONS[template.parameters]?.includes(parameter)) parameter = '';
      if (!suppliedParameter && !parameter) parameter = inferUnambiguousTraitParameter(template, context);
      result.push({templateId:id,parameter,level});
    }
    return result;
  }

  function normalizeDraft(raw = {}) {
    const categories = unique(raw.categories ?? raw.类别).map(value => resolveId(value,CATEGORY_REGISTRY)).filter(Boolean);
    const channels = unique(raw.channels ?? raw.表达机制).map(value => resolveId(value,CHANNEL_REGISTRY)).filter(Boolean);
    const attributes = normalizeAttributeEntries(raw.attributes ?? raw.属性谱,raw.attributeVersion);
    const parameterContext = {
      attributeIds:attributes.map(item => item.id),
      channelIds:channels
    };
    return {
      draftId:clean(raw.draftId) || `wuhun-draft-${slug(raw.name ?? raw.名称) || 'pending'}`,
      presetId:clean(raw.presetId),
      ...(clean(raw.artId)?{artId:clean(raw.artId)}:{}),
      name:clean(raw.name ?? raw.名称), concept:clean(raw.concept ?? raw.概念描述), form:clean(raw.form ?? raw.显化形态), role:clean(raw.role ?? raw.战斗定位),
      attributeVersion:ATTRIBUTE_VERSION,categories, attributes, channels,
      traits:normalizeTraitEntries(raw.traits ?? raw.先天特性,TRAIT_TEMPLATES,parameterContext),
      weaknesses:normalizeTraitEntries(raw.weaknesses ?? raw.限制,WEAKNESS_TEMPLATES,parameterContext),
      exchangeContracts:(globalThis.SoulAbilityExchange??(typeof require==='function'?require('./ability-exchange-core.js'):null)).normalize(raw.exchangeContracts??[],'martialSoul'),
      baseAction:{mode:BASE_ACTION_MODES[clean(raw.baseAction?.mode ?? raw.基础动作?.方式)]?.id ?? '',powerTier:['disguise','aura'].includes(raw.baseAction?.mode)?0:Math.round(clamp(raw.baseAction?.powerTier ?? raw.基础动作?.威力档 ?? 0,0,2)),attributeId:resolveId(raw.baseAction?.attributeId ?? raw.基础动作?.属性,ATTRIBUTE_REGISTRY),...(raw.baseAction?.mode==='aura'?{auraName:clean(raw.baseAction?.auraName)||'守心领域'}:{}),...(raw.baseAction?.mode==='disguise'?{disguise:globalThis.SoulDisguise.baseParams(raw.baseAction.disguise,true)}:{})},
      sourceDescription:clean(raw.sourceDescription ?? raw.玩家描述), playerConfirmed:Boolean(raw.playerConfirmed ?? raw.玩家已确认),
      llmTrace:Array.isArray(raw.llmTrace) ? clone(raw.llmTrace).slice(-20) : []
    };
  }

  function componentCost(draft) {
    const ledger = [];
    const add = (kind,id,label,cost,details={}) => ledger.push({kind,id,label,cost:Number(cost.toFixed ? cost.toFixed(2) : cost),...details});
    draft.categories.forEach(id => { const item=CATEGORY_REGISTRY[id]; add('category',id,item.name,item.cost); });
    normalizeAttributeEntries(draft.attributes,draft.attributeVersion).forEach(item => { const def=ATTRIBUTE_REGISTRY[item.id]; add('attribute',item.id,`${def.name}投入${item.investment}点`,item.investment,{investment:item.investment}); });
    draft.channels.forEach(id => { const item=CHANNEL_REGISTRY[id]; add('channel',id,item.name,item.cost); });
    draft.traits.forEach((item,index) => {
      const def=TRAIT_TEMPLATES.find(x=>x.id===item.templateId);
      add('trait',`${item.templateId}:${index}`,def.name,def.baseCost+def.perLevel*(item.level-1),{level:item.level,parameter:item.parameter});
    });
    if (draft.baseAction.mode) {
      add('baseAction','base-action','专属基础动作',draft.baseAction.mode==='disguise'?globalThis.SoulDisguise.basePointCost(draft.baseAction.disguise):draft.baseAction.mode==='aura'?10:2+draft.baseAction.powerTier*3,{mode:draft.baseAction.mode,powerTier:draft.baseAction.powerTier,attributeId:draft.baseAction.attributeId});
    }
    draft.weaknesses.forEach((item,index) => { const def=WEAKNESS_TEMPLATES.find(x=>x.id===item.templateId); const refund=def.refund+(item.level-1); add('weakness',`${item.templateId}:${index}`,def.name,-refund,{level:item.level,parameter:item.parameter}); });
    const exchange=globalThis.SoulAbilityExchange??(typeof require==='function'?require('./ability-exchange-core.js'):null);
    for(const c of exchange.normalize(draft.exchangeContracts,'martialSoul'))for(const row of ledger.filter(r=>c.benefits.componentIds.includes(r.id)&&r.id.startsWith('trait.ability-training:'))){
      if(c.burdens.some(b=>b.effectId==='status.buff'&&b.params.属性===row.parameter&&b.params.数值<=-1)){row.rawCost=row.cost;row.cost=0;row.netEffect=0;}
    }
    for(const q of exchange.quoteContracts(draft.exchangeContracts,'martialSoul',ledger.map(r=>({...r,attribute:r.id.startsWith('trait.ability-training:')?r.parameter:'',amount:r.id.startsWith('trait.ability-training:')?1:0}))))add('exchange',q.contract.id,'承担负面换取组件',-q.points,{contract:q.contract});
    const positive=ledger.filter(x=>x.cost>0).reduce((sum,x)=>sum+x.cost,0); const refunds=-ledger.filter(x=>x.cost<0).reduce((sum,x)=>sum+x.cost,0);
    const refundCap=Math.floor(positive*0.25); const appliedRefund=Math.min(refunds,refundCap);
    return {ledger,positive,refunds,refundCap,appliedRefund,total:Math.max(0,positive-appliedRefund)};
  }

  function qualityForValue(value) {
    return QUALITY_GRADES.find(item=>value>=item.minValue&&value<=item.maxValue) ?? QUALITY_GRADES.at(-1);
  }

  function inspectDraft(raw, options={}) {
    const draft=normalizeDraft(raw); const budget=Math.max(0,Number(options.budget ?? raw?.budget ?? 90));
    const missing=[]; const ambiguities=[]; const conflicts=[]; const unsupported=[];
    if(draft.presetId){
      const entry=globalThis.SoulPresetCatalog?.get(draft.presetId);
      if(entry?.category!=='武魂')unsupported.push({field:'presetId',reason:'未登记该精品武魂'});
      else{
        const expected=normalizeDraft(entry.recipe.draft),signature=d=>JSON.stringify(['categories','attributes','channels','traits','weaknesses','exchangeContracts','baseAction'].map(key=>d[key]));
        if(signature(draft)!==signature(expected))conflicts.push({field:'presetId',reason:'精品武魂的完整机制已改变，请改用自定义构想重新审核'});
      }
    }
    const checkRefs=(values,registry,field,project=value=>value)=>{for(const value of Array.isArray(values)?values:[]){const rawRef=project(value);if(clean(rawRef)&&!resolveId(rawRef,registry))unsupported.push({field,value:clean(rawRef),reason:`未登记${field}：${clean(rawRef)}`});}};
    checkRefs(raw?.categories??raw?.类别,CATEGORY_REGISTRY,'categories');
    checkRefs(raw?.attributes??raw?.属性谱,ATTRIBUTE_REGISTRY,'attributes',value=>value?.id??value);
    checkRefs(raw?.channels??raw?.表达机制,CHANNEL_REGISTRY,'channels');
    checkRefs(raw?.traits??raw?.先天特性,Object.fromEntries(TRAIT_TEMPLATES.map(item=>[item.id,item])),'traits',value=>value?.templateId??value);
    checkRefs(raw?.weaknesses??raw?.限制,Object.fromEntries(WEAKNESS_TEMPLATES.map(item=>[item.id,item])),'weaknesses',value=>value?.templateId??value);
    // Legacy sourceDescription remains readable in saved drafts; the current concept is the required description.
    if(!draft.name) missing.push({field:'name',reason:'缺少武魂名称'});
    if(!draft.concept) missing.push({field:'concept',reason:'缺少一句可判定边界的核心概念'});
    if(!draft.form) missing.push({field:'form',reason:'缺少显化形态'});
    if(!draft.role) missing.push({field:'role',reason:'缺少主要战斗定位'});
    if(!draft.categories.length) missing.push({field:'categories',reason:'至少选择一个类别锚点'});
    if(!draft.attributes.length) missing.push({field:'attributes',reason:'至少选择一种属性并投入造化点'});
    if(!draft.channels.length) missing.push({field:'channels',reason:'至少选择一个可执行表达机制'});
    if(draft.baseAction.mode==='disguise'&&!draft.baseAction.disguise?.伪装模板?.外貌?.trim())missing.push({field:'baseAction.disguise',reason:'请填写伪装后的外貌'});
    if(draft.baseAction.mode==='disguise'&&!draft.channels.includes('channel.disguise'))conflicts.push({field:'baseAction.mode',reason:'伪装本能须购买仪容伪装通道'});
    if(draft.baseAction.mode==='aura'&&(!draft.channels.includes('channel.domain')||!draft.channels.includes('channel.buff')||!draft.channels.includes('channel.sustain')))conflicts.push({field:'baseAction.mode',reason:'守心领域须具备领域、增幅与维持通道'});
    if(!draft.baseAction.mode) missing.push({field:'baseAction.mode',reason:'基础动作须选择攻击、守心领域或外貌伪装'});
    if(!draft.baseAction.attributeId) missing.push({field:'baseAction.attributeId',reason:'基础动作必须选择一个武魂已拥有的属性'});
    for(const id of draft.categories)if(CATEGORY_REGISTRY[id]?.selectable===false)conflicts.push({field:'categories',reason:'“植物”是隐藏父类，请改选具体植物子类或“其他植物”'});
    if(/亡灵|不死|尸骸|幽魂/.test(`${draft.name}${draft.concept}${draft.form}`)&&!draft.attributes.some(item=>item.id==='attribute.death'))missing.push({field:'attributes',reason:'亡灵生物武魂必须登记死亡属性；“亡灵”不是额外的第19种属性'});
    const ownedIds=new Set(draft.attributes.map(item=>item.id));
    if(draft.baseAction.attributeId&&!ownedIds.has(draft.baseAction.attributeId))conflicts.push({field:'baseAction.attributeId',reason:'基础动作只能使用该武魂已经购买的属性'});
    draft.weaknesses.forEach((entry,index)=>{
      const template=WEAKNESS_TEMPLATES.find(item=>item.id===entry.templateId);
      if(template?.parameters!=='none'&&!entry.parameter)missing.push({field:`weaknesses.${index}.parameter`,reason:`限制「${template.name}」缺少具体参数：请说明它在什么条件、环境、距离、属性或机制下生效`});
    });
    for(const [index,entry] of draft.traits.entries()){
      const template=TRAIT_TEMPLATES.find(item=>item.id===entry.templateId);
      if(template?.parameters!=='none'&&!entry.parameter)missing.push({field:`traits.${index}.parameter`,reason:`专长「${template.name}」必须选择登记参数`});
      if(entry.templateId==='trait.resistance'&&entry.parameter==='attribute.physical'&&draft.weaknesses.some(item=>item.templateId==='weakness.physical-fragility'))conflicts.push({field:`traits.${index}`,reason:'物理适应不能与物理脆弱同时存在'});
      if(entry.templateId==='trait.channel-mastery'&&!draft.channels.includes(entry.parameter))conflicts.push({field:`traits.${index}`,reason:'机制专修只能绑定已经购买的表达机制'});
      if(entry.templateId==='trait.attribute-mastery'&&!ownedIds.has(entry.parameter))conflicts.push({field:`traits.${index}`,reason:'属性专精只能绑定武魂已经购买的属性'});
    }
    const traitKeys=draft.traits.map(item=>`${item.templateId}:${item.parameter}`); if(new Set(traitKeys).size!==traitKeys.length)conflicts.push({field:'traits',reason:'同一专长与参数不能重复购买'});
    const weaknessKeys=draft.weaknesses.map(item=>`${item.templateId}:${item.parameter}`); if(new Set(weaknessKeys).size!==weaknessKeys.length)conflicts.push({field:'weaknesses',reason:'同一负面与参数不能重复返还点数'});
    const pricing=componentCost(draft); const quality=qualityForValue(pricing.total);
    if(pricing.refunds>pricing.refundCap)conflicts.push({field:'weaknesses',reason:`所选限制返还${pricing.refunds}点，超过当前可返还的${pricing.refundCap}点，请减少限制或降低限制等级`});
    const overBudget=Math.max(0,pricing.total-budget); const ready=!missing.length&&!ambiguities.length&&!conflicts.length&&!unsupported.length&&!overBudget;
    const nextQuestion=missing[0]?.reason ?? ambiguities[0]?.reason ?? conflicts[0]?.reason ?? unsupported[0]?.reason ?? (overBudget
      ? `当前初稿判定为${quality.name}，消耗${pricing.total}点，超出可用预算${overBudget}点。请告诉我要删减哪一项、减少哪项属性投入，或补充什么明确限制；代码不会替你自动删改。`
      : ready&&!draft.playerConfirmed?`当前初稿判定为${quality.name}，消耗${pricing.total}点。你还要增加、删减或修改什么吗？满意即可进入最终预览。`:'');
    return {draftId:draft.draftId,status:ready?(draft.playerConfirmed?'confirmed':'awaiting-adjustment'):'needs-clarification',accepted:ready&&draft.playerConfirmed,draft,missing,ambiguities,conflicts,unsupported,overBudget,budget,pricing,quality:clone(quality),qualityByValue:clone(quality),nextQuestion};
  }

  const allowedPatchKeys=new Set(['name','concept','form','role','categories','attributes','channels','traits','weaknesses','exchangeContracts','baseAction','playerConfirmed','llmTrace']);
  function applyLLMPatch(rawDraft,proposal,options={}){
    if(!proposal||typeof proposal!=='object'||Array.isArray(proposal))throw new Error('LLM武魂提案必须是JSON对象');
    const illegal=Object.keys(proposal).filter(key=>!allowedPatchKeys.has(key));
    if(illegal.length)throw new Error(`LLM武魂提案包含越权字段：${illegal.join('、')}`);
    const merged={...clone(rawDraft),...clone(proposal),attributeVersion:ATTRIBUTE_VERSION,attributes:proposal.attributes??normalizeDraft(rawDraft).attributes,sourceDescription:clean(rawDraft?.sourceDescription),draftId:clean(rawDraft?.draftId),playerConfirmed:false};
    if(proposal.llmTrace)merged.llmTrace=[...(rawDraft?.llmTrace??[]),...proposal.llmTrace].slice(-20);
    return inspectDraft(merged,options);
  }

  const MANUAL_TEXT_FIELDS = new Set(['name','concept','form','role']);
  const MANUAL_LIST_GROUPS = new Set(['categories','attributes','channels','traits','weaknesses','exchangeContracts']);

  function applyManualEdit(rawDraft, operation={}, options={}) {
    if (!operation || typeof operation !== 'object' || Array.isArray(operation)) throw new Error('手动编辑指令必须是对象');
    const draft=normalizeDraft(rawDraft);
    const action=clean(operation.action);
    const group=clean(operation.group);
    draft.playerConfirmed=false;

    if(action==='set-fields'){
      const values=operation.values;
      if(!values||typeof values!=='object'||Array.isArray(values))throw new Error('基础设定修改缺少字段对象');
      for(const [field,value] of Object.entries(values)){
        if(!MANUAL_TEXT_FIELDS.has(field))throw new Error(`不允许手动修改字段：${field}`);
        draft[field]=clean(value);
      }
      return inspectDraft(draft,options);
    }

    if(action==='remove'){
      if(group==='baseAction'){
        draft.baseAction={mode:'',powerTier:0,attributeId:''};
        return inspectDraft(draft,options);
      }
      if(!MANUAL_LIST_GROUPS.has(group))throw new Error(`不允许从该组移除：${group}`);
      const index=Number(operation.index);
      if(!Number.isInteger(index)||index<0||index>=draft[group].length)throw new Error('要移除的词条已经不存在');
      draft[group].splice(index,1);
      return inspectDraft(draft,options);
    }

    if(action==='set-parameter'){
      if(group!=='traits')throw new Error('只有先天特性支持直接修改对象');
      const index=Number(operation.index);
      if(!Number.isInteger(index)||index<0||index>=draft.traits.length)throw new Error('要修改的先天特性已经不存在');
      const current=draft.traits[index];
      const template=TRAIT_TEMPLATES.find(item=>item.id===current.templateId);
      const normalized=normalizeTraitEntries([{...current,parameter:operation.parameter}],TRAIT_TEMPLATES,{
        attributeIds:draft.attributes.map(item=>item.id),channelIds:draft.channels
      })[0];
      if(template?.parameters!=='none'&&!normalized?.parameter)throw new Error(`请为「${template?.name ?? '该特性'}」选择有效对象`);
      if(template?.id==='trait.attribute-mastery'&&!draft.attributes.some(item=>item.id===normalized.parameter))throw new Error('属性专精只能选择武魂已经购买的属性作为有效对象');
      if(template?.id==='trait.channel-mastery'&&!draft.channels.includes(normalized.parameter))throw new Error('机制专修只能选择已经购买的表达机制作为有效对象');
      if(draft.traits.some((item,itemIndex)=>itemIndex!==index&&item.templateId===normalized.templateId&&item.parameter===normalized.parameter))throw new Error(`「${template.name}」及该对象已经选择，不能重复`);
      draft.traits[index]=normalized;
      return inspectDraft(draft,options);
    }

    if(action!=='add')throw new Error(`未知手动编辑动作：${action||'空'}`);
    const value=operation.value;

    if(group==='categories'){
      const id=resolveId(value,CATEGORY_REGISTRY);
      if(!id||CATEGORY_REGISTRY[id]?.selectable===false)throw new Error('请选择列表中的有效类别');
      if(draft.categories.includes(id))throw new Error('该类别已经选择，不能重复添加');
      draft.categories.push(id);
    }else if(group==='attributes'){
      const id=resolveId(value?.id??value,ATTRIBUTE_REGISTRY);
      if(!id)throw new Error('请选择列表中的有效属性');
      if(draft.attributes.some(item=>item.id===id))throw new Error('该属性已经选择，不能重复添加');
      if(Object.hasOwn(value??{},'affinity'))throw new Error('请使用造化点投入调整属性');
      draft.attributes.push(...normalizeAttributeEntries([{id,investment:value?.investment??ATTRIBUTE_REGISTRY[id].minimumInvestment}],ATTRIBUTE_VERSION));
    }else if(group==='channels'){
      const id=resolveId(value,CHANNEL_REGISTRY);
      if(!id)throw new Error('请选择列表中的有效表达机制');
      if(draft.channels.includes(id))throw new Error('该表达机制已经选择，不能重复添加');
      draft.channels.push(id);
    }else if(group==='exchangeContracts'){
      draft.exchangeContracts=globalThis.SoulAbilityExchange.normalize([...draft.exchangeContracts,value],'martialSoul');
    }else if(group==='traits'||group==='weaknesses'){
      const templates=group==='traits'?TRAIT_TEMPLATES:WEAKNESS_TEMPLATES;
      const registry=Object.fromEntries(templates.map(item=>[item.id,item]));
      const templateId=resolveId(value?.templateId??value,registry);
      const template=registry[templateId];
      if(!template)throw new Error(`请选择列表中的有效${group==='traits'?'先天特性':'武魂负面'}`);
      const normalized=normalizeTraitEntries([{templateId,parameter:value?.parameter,level:value?.level??1}],templates,{
        attributeIds:draft.attributes.map(item=>item.id),
        channelIds:draft.channels
      })[0];
      if(template.parameters!=='none'&&!normalized?.parameter)throw new Error(`请先为「${template.name}」选择具体对象`);
      const duplicate=draft[group].some(item=>item.templateId===normalized.templateId&&item.parameter===normalized.parameter);
      if(duplicate)throw new Error(`「${template.name}」及该对象已经选择，不能重复添加`);
      draft[group].push(normalized);
    }else if(group==='baseAction'){
      if(draft.baseAction.mode)throw new Error('专属基础动作已经存在，请先移除再重新选择');
      const mode=BASE_ACTION_MODES[clean(value?.mode??value)]?.id ?? '';
      if(!mode)throw new Error('基础动作须选择攻击、守心领域或外貌伪装');
      const attributeId=resolveId(value?.attributeId,ATTRIBUTE_REGISTRY);
      if(!attributeId||!draft.attributes.some(item=>item.id===attributeId))throw new Error('基础动作必须使用武魂已经购买的属性');
      draft.baseAction={mode,powerTier:['disguise','aura'].includes(mode)?0:Math.round(clamp(value?.powerTier??0,0,2)),attributeId,...(mode==='aura'?{auraName:clean(value?.auraName)||'守心领域'}:{}),...(mode==='disguise'?{disguise:globalThis.SoulDisguise.baseParams(value?.disguise,true)}:{})};
    }else throw new Error(`不允许向该组添加：${group}`);

    return inspectDraft(draft,options);
  }

  function startInterview(description,options={}){
    const sourceDescription=clean(description); if(!sourceDescription)throw new Error('必须先由玩家描述武魂构想');
    return inspectDraft({sourceDescription,draftId:`wuhun-draft-${slug(options.draftId)||Date.now().toString(36)}`},options);
  }

  function normalizeAdvisorQuestion(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const text = clean(raw.text).slice(0,400);
    const options = unique(raw.options).slice(0,4).map(value=>value.slice(0,80));
    if (!text) return null;
    return {text,options,allowDelegate:raw.allowDelegate !== false};
  }

  function startAdvisorSession(description='',options={}) {
    const playerText=clean(description).slice(0,1800);
    const sourceDescription=playerText || '玩家没有预设构想，授权AI武魂顾问协助构思。';
    return {
      protocolVersion:1,
      sessionId:clean(options.sessionId)||`wuhun-advisor-${slug(options.draftId)||Date.now().toString(36)}`,
      draftId:`wuhun-draft-${slug(options.draftId)||Date.now().toString(36)}`,
      sourceDescription,
      stage:'discovering',turn:0,
      messages:[{role:'player',text:playerText||'我还没有想法，请你先引导我。'}],
      advisorMessage:'',remembered:[],question:null,draft:null
    };
  }

  function normalizeAdvisorSession(raw={}) {
    const fallback=startAdvisorSession(raw?.sourceDescription,{sessionId:raw?.sessionId,draftId:raw?.draftId});
    const messages=(Array.isArray(raw?.messages)?raw.messages:[]).map(item=>({
      role:item?.role==='advisor'?'advisor':'player',text:clean(item?.text).slice(0,1800)
    })).filter(item=>item.text).slice(-20);
    return {
      protocolVersion:1,
      sessionId:clean(raw?.sessionId)||fallback.sessionId,
      draftId:clean(raw?.draftId)||fallback.draftId,
      sourceDescription:clean(raw?.sourceDescription)||fallback.sourceDescription,
      stage:['discovering','revising','ready'].includes(raw?.stage)?raw.stage:'discovering',
      turn:Math.round(clamp(raw?.turn??0,0,20)),
      messages:messages.length?messages:fallback.messages,
      advisorMessage:clean(raw?.advisorMessage).slice(0,1200),
      remembered:unique(raw?.remembered).slice(0,12).map(value=>value.slice(0,160)),
      question:normalizeAdvisorQuestion(raw?.question),
      draft:raw?.draft&&typeof raw.draft==='object'&&!Array.isArray(raw.draft)?normalizeDraft(raw.draft):null
    };
  }

  function advanceAdvisorSession(rawSession,playerInput,response,options={}) {
    const session=normalizeAdvisorSession(rawSession);
    if(!response||typeof response!=='object'||Array.isArray(response))throw new Error('AI武魂顾问必须返回JSON对象');
    const mode=clean(response.mode);
    if(!['question','proposal'].includes(mode))throw new Error('AI武魂顾问必须选择question或proposal模式');
    const reply=clean(response.reply).slice(0,1200);
    if(!reply)throw new Error('AI武魂顾问缺少面向玩家的回复');
    const input=clean(playerInput).slice(0,1800);
    const messages=[...session.messages];
    if(input)messages.push({role:'player',text:input});
    messages.push({role:'advisor',text:reply});
    const remembered=unique([...session.remembered,...unique(response.remembered)]).slice(-12).map(value=>value.slice(0,160));
    let inspection=session.draft?inspectDraft(session.draft,options):null;
    let question=normalizeAdvisorQuestion(response.question);
    let stage=session.draft?'revising':'discovering';
    let draft=session.draft;
    if(mode==='question'){
      if(!question||question.options.length<2)throw new Error('AI追问必须提供问题和2至4个自然语言选项');
    }else{
      if(!response.patch||typeof response.patch!=='object'||Array.isArray(response.patch))throw new Error('AI提案模式缺少武魂结构patch');
      const base=draft??startInterview(session.sourceDescription,{draftId:session.draftId,budget:options.budget}).draft;
      inspection=applyLLMPatch(base,response.patch,options);
      draft=inspection.draft;
      stage=inspection.status==='awaiting-adjustment'?'ready':'revising';
      if(stage==='revising'&&!question)question={text:inspection.nextQuestion||'当前方案还需要调整。',options:[],allowDelegate:true};
    }
    return {
      session:{...session,stage,turn:session.turn+1,messages:messages.slice(-20),advisorMessage:reply,remembered,question,draft},
      inspection
    };
  }

  function compileHooks(draft){
    const hooks=[];
    for(const [index,item] of draft.traits.entries()){const def=TRAIT_TEMPLATES.find(x=>x.id===item.templateId);const exchangeId=draft.exchangeContracts.find(c=>c.benefits.componentIds.includes(`${item.templateId}:${index}`))?.id;hooks.push({sourceId:item.templateId,type:def.hook,parameter:item.parameter,level:item.level,...(exchangeId?{exchangeId}:{})});}
    for(const item of draft.weaknesses){const def=WEAKNESS_TEMPLATES.find(x=>x.id===item.templateId);hooks.push({sourceId:item.templateId,type:def.hook,parameter:item.parameter,level:item.level,negative:true});}
    return hooks;
  }

  function compileBaseAction(draft){
    if(draft.baseAction.mode==='disguise'){const params=globalThis.SoulDisguise.baseParams(draft.baseAction.disguise);return abilities.seal({id:'martial-soul-basic-action',name:`${draft.name}·本能伪装`,mode:'disguise',powerTier:0,attributeId:draft.baseAction.attributeId,soulPowerCost:Math.max(1,Math.ceil(globalThis.SoulEffectCompiler.calculateNodeCost('transform.disguise',params)/90)),requirements:['gesture','martial-soul','soul-power'],effectSpecs:[['target.self',{}],['transform.disguise',params]]});}
    if(draft.baseAction.mode==='aura')return abilities.seal({id:'martial-soul-basic-action',name:draft.baseAction.auraName,mode:'aura',modeName:'先天领域',powerTier:0,attributeId:draft.baseAction.attributeId,soulPowerCost:3,requirements:['martial-soul','soul-power','focus'],effectSpecs:[['target.self',{}],['domain.field',{半径区:1,持续回合:2,跟随施术者:true,领域强度:1,触发时机:'回合开始',阵营规则:'友方'}],['status.buff',{领域阵营:'友方',属性:'意志',数值:1,持续回合:1}],['sustain.maintain',{锁定魂力:2,每回合魂力:1}]]});
    const mode=BASE_ACTION_MODES[draft.baseAction.mode];
    const attribute=ATTRIBUTE_REGISTRY[draft.baseAction.attributeId];
    const sides=[4,6,8];
    return abilities.seal({id:'martial-soul-basic-action',name:`${draft.name}·本能运用`,mode:mode.id,modeName:mode.name,powerTier:draft.baseAction.powerTier,attributeId:attribute.id,soulPowerCost:0,requirements:['gesture','martial-soul','soul-power',...(mode.id==='touch'?['contact']:[])],effectSpecs:[[mode.releaseId,{}],['target.single',{}],[mode.checkId,{}],['payload.damage',{类型:attribute.damageType,骰数:1,骰面:sides[draft.baseAction.powerTier],加值:0}]],damageType:attribute.damageType});
  }

  function finalizeDraft(raw,options={}){
    const receipt=inspectDraft(raw,options); if(!receipt.accepted)throw new Error(`武魂草案尚未通过玩家确认与代码终审：${receipt.nextQuestion||'信息不完整'}`);
    const d=receipt.draft; const categoryItems=d.categories.map(id=>CATEGORY_REGISTRY[id]); const attributeItems=d.attributes.map(x=>({...x,...ATTRIBUTE_REGISTRY[x.id]})); const channelItems=d.channels.map(id=>CHANNEL_REGISTRY[id]);
    const semanticTags=unique([d.name,d.form,d.role,...categoryItems.flatMap(x=>[x.name,...x.tags,...(x.aliases??[])]),...attributeItems.flatMap(x=>[x.name,x.damageType]),...channelItems.flatMap(x=>[x.name,...x.tags]),...d.traits.map(x=>TRAIT_TEMPLATES.find(t=>t.id===x.templateId)?.name)]);
    const allowedEffectIds=unique(channelItems.flatMap(x=>x.effectIds));
    return {id:clean(options.id)||`wuhun-${slug(d.name)}`,name:d.name,version:VERSION,attributeVersion:ATTRIBUTE_VERSION,quality:receipt.quality,pricing:receipt.pricing,definition:d,exchangeContracts:clone(d.exchangeContracts),categories:clone(categoryItems),attributes:clone(attributeItems),channels:clone(channelItems),traits:clone(d.traits),weaknesses:clone(d.weaknesses),semanticTags,allowedEffectIds,mechanicalHooks:compileHooks(d),baseAction:compileBaseAction(d),confirmedAtRevision:Number(options.revision??0)};
  }

  const ATTRIBUTE_EQUIVALENTS=Object.freeze(Object.fromEntries(Object.values(ATTRIBUTE_REGISTRY).map(item=>[item.name,[item.id,item.name,item.damageType,...item.aliases]])));
  function relationTerms(value){const id=resolveId(value,ATTRIBUTE_REGISTRY);const item=ATTRIBUTE_REGISTRY[id];return item?[item.id,item.name,...item.aliases]:[clean(value)];}
  function tagSet(...values){return new Set(values.flatMap(value=>Array.isArray(value)?value:[]).map(value=>clean(value).toLowerCase()).filter(Boolean));}
  function overlapRatio(left,right){if(!left.size||!right.size)return 0;let hits=0;for(const item of left)if(right.has(item))hits+=1;return hits/Math.max(1,Math.min(left.size,right.size));}
  function calculateCompatibilityAxes(soul,profile,beastSkills=[],bridges=[]){
    const compiled=soul?.扩展?.结构化武魂??soul;
    const beastEffectIds=unique(beastSkills.flatMap(skill=>(skill?.effectGraph?.nodes??[]).map(node=>node.effectId)));
    const beastChannelIds=profile?.血脉?.definition?.channels??[];
    const profileCategoryTags=tagSet(profile?.类别标签);
    const profileAttributeTags=tagSet([...(profile?.属性谱?.主属性??[]),...(profile?.属性谱?.副属性??[])].flatMap(relationTerms));
    const profileAnatomyTags=tagSet(profile?.解剖标签,profile?.种族特征);
    const profileSpeciesTags=tagSet(profile?.类别标签,profile?.种族特征,profile?.个体变异,profile?.解剖标签,[profile?.名称]);
    const beastMechanismTags=tagSet(beastSkills.flatMap(skill=>skill.tags??[]),beastEffectIds);
    const beastChannelTags=tagSet(beastSkills.flatMap(skill=>skill.tags??[]),beastEffectIds,beastChannelIds,beastChannelIds.flatMap(id=>[CHANNEL_REGISTRY[id].name,...CHANNEL_REGISTRY[id].tags]));
    const beastTags=tagSet([...profileSpeciesTags],[...profileAttributeTags],[...beastMechanismTags]);
    const soulTags=tagSet(compiled?.semanticTags,soul?.类别标签,soul?.表达机制,soul?.属性标签,[soul?.名称]);
    const sourceBridge=Math.min(100,bridges.length?65+bridges.reduce((sum,item)=>sum+(Number(item.efficiency)||0)*12,0):overlapRatio(soulTags,beastTags)*55);
    const soulAttributes=compiled?.attributes??[];
    const matchedAttributes=soulAttributes.filter(attribute=>{const equivalents=ATTRIBUTE_EQUIVALENTS[attribute.name]??[attribute.name,attribute.damageType];return equivalents.some(tag=>profileAttributeTags.has(clean(tag).toLowerCase()));});
    const attributeScore=soulAttributes.length?Math.round(matchedAttributes.length/soulAttributes.length*100):0;
    const categoryTags=tagSet((compiled?.categories??[]).flatMap(item=>[item.name,item.family,...(item.tags??[]),...(item.aliases??[])]));
    const categoryScore=Math.round(overlapRatio(categoryTags,tagSet([...profileCategoryTags],profile?.种族特征))*100);
    const anatomyMaterial=tagSet((compiled?.categories??[]).filter(item=>['本体','材料','器物','生物'].includes(item.family)).flatMap(item=>[item.family,...(item.tags??[])]));
    const anatomyScore=Math.round(overlapRatio(anatomyMaterial,profileAnatomyTags)*100);
    const raw=sourceBridge*0.45+attributeScore*0.25+categoryScore*0.15+anatomyScore*0.15;
    const score=Math.round(clamp(raw,20,100));
    return {score,ratio:Number((score/100).toFixed(4)),axes:{mechanismSource:Math.round(sourceBridge),attributeOverlap:attributeScore,categoryForm:categoryScore,anatomyMaterial:anatomyScore},bridgeIds:bridges.map(item=>item.id),conflicts:[]};
  }

  function attributeDrawPool(compiledSoul, sourceAttributes=[]) {
    const compiled=compiledSoul?.扩展?.结构化武魂??compiledSoul;
    const affinityById=new Map(normalizeAttributeEntries(compiled?.attributes,compiled?.attributeVersion).map(item=>[item.id,attributeStrength(item)]));
    return unique(sourceAttributes.map(value=>resolveId(value,ATTRIBUTE_REGISTRY)).filter(Boolean)).map(id=>({
      id,name:ATTRIBUTE_REGISTRY[id].name,weight:10+(affinityById.get(id)??0),owned:affinityById.has(id)
    }));
  }

  function drawSourceAttribute(compiledSoul, sourceAttributes=[], rng=Math.random) {
    const pool=attributeDrawPool(compiledSoul,sourceAttributes);
    if(!pool.length)return null;
    const total=pool.reduce((sum,item)=>sum+item.weight,0);
    let roll=Math.max(0,Math.min(0.999999999,Number(rng())||0))*total;
    for(const item of pool){roll-=item.weight;if(roll<0)return clone(item);}
    return clone(pool[pool.length-1]);
  }

  function expandedPoolCounts(){
    const traitInstances=TRAIT_TEMPLATES.reduce((sum,t)=>sum*(1)+(PARAMETER_OPTIONS[t.parameters]?.length||1)*t.maxLevel,0);
    const weaknessInstances=WEAKNESS_TEMPLATES.reduce((sum,t)=>sum+(PARAMETER_OPTIONS[t.parameters]?.length||1)*(t.maxLevel||1),0);
    return {categories:Object.keys(CATEGORY_REGISTRY).length,selectableCategories:Object.values(CATEGORY_REGISTRY).filter(item=>item.selectable).length,attributes:Object.keys(ATTRIBUTE_REGISTRY).length,channels:Object.keys(CHANNEL_REGISTRY).length,traitTemplates:TRAIT_TEMPLATES.length,traitInstances,weaknessTemplates:WEAKNESS_TEMPLATES.length,weaknessInstances,permissions:0,recipes:0};
  }

  const EFFECT_ATTRIBUTE_HINTS=Object.freeze({
    'contract.oath':'attribute.soul','trigger.contract':'attribute.soul','payload.death':'attribute.death','modifier.world_duration':'attribute.time','realm.store':'attribute.space',
    'status.mind_control':'attribute.mind','status.cognition_shift':'attribute.mind','status.fear':'attribute.mind','status.charm':'attribute.mind','status.desire':'attribute.mind','status.sleep':'attribute.mind','status.soul_control':'attribute.soul','intimate.stimulate':'attribute.lust','intimate.climax':'attribute.lust',
    'status.burn':'attribute.fire','status.poison':'attribute.toxic-corrosion','status.eternal_wound':'attribute.toxic-corrosion','payload.soul_damage':'attribute.soul',
    'payload.heal':'attribute.life','payload.restore':'attribute.life','payload.revive':'attribute.life','copy.skillset':'attribute.mind','move.teleport':'attribute.space'
  });
  const CHANNEL_ATTRIBUTE_HINTS=Object.freeze({
    'channel.contract-oath':['attribute.soul'],'channel.death':['attribute.death'],'channel.world-duration':['attribute.time'],'channel.realm-storage':['attribute.space'],
    'channel.hit-interference':['attribute.physical','attribute.mind','attribute.space','attribute.time'],
    'channel.device-lock':['attribute.metal','attribute.soul','attribute.space'],'channel.arcane-lock':['attribute.soul','attribute.space'],'channel.rule-break':['attribute.destruction'],
    'channel.key-creation':['attribute.metal','attribute.wood','attribute.earth'],
    'channel.repair':['attribute.metal','attribute.wood','attribute.earth'],'channel.fabricate':['attribute.metal','attribute.wood','attribute.earth'],
    'channel.poison':['attribute.toxic-corrosion'],'channel.burn':['attribute.fire'],'channel.freeze':['attribute.ice'],
    'channel.heal':['attribute.life'],'channel.revive':['attribute.life'],'channel.drain':['attribute.life','attribute.death'],
    'channel.fear':['attribute.mind'],'channel.charm':['attribute.mind','attribute.lust'],'channel.sleep':['attribute.mind'],
    'channel.teleport':['attribute.space'],'channel.soul-interference':['attribute.soul']
  });
  const EFFECT_ATTRIBUTE_ALTERNATIVES=Object.freeze({'realm.store':['attribute.space'],'payload.arcane_lock':['attribute.soul','attribute.space'],'payload.unlock':['attribute.metal','attribute.soul','attribute.space'],'payload.suppress_lock':['attribute.soul','attribute.space'],'payload.analyze_lock':['attribute.metal','attribute.soul','attribute.space'],'payload.create_key':['attribute.metal','attribute.wood','attribute.earth'],'payload.rule_break':['attribute.destruction'],'payload.repair_item':['attribute.metal','attribute.wood','attribute.earth'],'payload.fabricate':['attribute.metal','attribute.wood','attribute.earth'],'status.charm':['attribute.mind','attribute.lust'],'status.desire':['attribute.mind','attribute.lust'],'intimate.stimulate':['attribute.lust','attribute.mind'],'intimate.climax':['attribute.lust','attribute.mind']});
  function effectAttributeIds(effectId,params={},sourceAttributes=[]){
    const explicit=resolveId(params?.类型,ATTRIBUTE_REGISTRY),available=new Set(sourceAttributes.map(item=>resolveId(item?.id??item,ATTRIBUTE_REGISTRY)));
    const hinted=EFFECT_ATTRIBUTE_ALTERNATIVES[effectId]?.find(id=>available.has(id))??EFFECT_ATTRIBUTE_HINTS[effectId];
    return unique([explicit,hinted].filter(Boolean));
  }
  function channelThemeAttributeIds(channelId){return [...(CHANNEL_ATTRIBUTE_HINTS[channelId]??[])];}
  function channelAttributeIds(channelId){
    const id=resolveId(channelId,CHANNEL_REGISTRY); const channel=CHANNEL_REGISTRY[id];
    return unique([...(CHANNEL_ATTRIBUTE_HINTS[id]??[]),...(channel?.effectIds??[]).flatMap(effectId=>EFFECT_ATTRIBUTE_ALTERNATIVES[effectId]??effectAttributeIds(effectId,{}))]);
  }
  function channelSupportsEffect(channel,effectId,params={}){
    if(!channel?.effectIds?.includes(effectId)||channel.effectRules?.modes?.length&&params.模式&&!channel.effectRules.modes.includes(params.模式))return false;
    // New optional behavior cannot be obtained by relabeling an old channel.
    // Old channel arrays stay byte-for-byte stable for frozen source proofs.
    const required=effectId==='status.power_seal'&&params.封印对象==='装备与道具'?'channel.item-seal':
      effectId==='summon.entity'&&['魂力分配','继承环序上限','继承技能ID','离散缩放'].some(key=>Object.hasOwn(params,key))?'channel.summon-inheritance':
      effectId==='transform.martial_avatar'&&['持续方式','同源伤害增幅百分比','同源射程增幅','召唤技能效果倍率','精神防护加值'].some(key=>Object.hasOwn(params,key))?'channel.avatar-enhancement':null;
    return !required||channel.id===required;
  }
  function channelsForEffect(compiledSoul,effectId,params={}){
    const compiled=compiledSoul?.扩展?.结构化武魂??compiledSoul;
    return (compiled?.channels??[]).filter(channel=>channelSupportsEffect(channel,effectId,params)).map(channel=>channel.id);
  }
  function allowsEffect(compiledSoul,effectId,params={}){
    if(!effectId)return false;
    const compiled=compiledSoul?.扩展?.结构化武魂??compiledSoul;
    const owned=new Set((compiled?.attributes??[]).map(entry=>entry.id));
    const required=EFFECT_ATTRIBUTE_ALTERNATIVES[effectId]??({'contract.oath':['attribute.soul'],'trigger.contract':['attribute.soul'],'payload.death':['attribute.death'],'modifier.world_duration':['attribute.time'],'status.mind_control':['attribute.mind'],'status.cognition_shift':['attribute.mind'],'status.fear':['attribute.mind'],'status.sleep':['attribute.mind'],'status.soul_control':['attribute.soul']}[effectId]);
    if(required&&!required.some(id=>owned.has(id)))return false;
    if(['status.limited_followup','payload.resource_damage'].includes(effectId)&&params.类型!==undefined&&!owned.has(resolveId(params.类型,ATTRIBUTE_REGISTRY)))return false;
    if(['payload.damage','payload.residual','status.resistance_shift','passive.element_amplify'].includes(effectId)&&['精神','灵魂'].includes(params.类型)&&!owned.has(resolveId(params.类型,ATTRIBUTE_REGISTRY)))return false;
    const matching=channelsForEffect(compiled,effectId,params);
    return matching.length>0;
  }

  return Object.freeze({VERSION,ATTRIBUTE_VERSION,attributeStrength,normalizeCompiledAttributes,QUALITY_GRADES,CATEGORY_REGISTRY,ATTRIBUTE_REGISTRY,CHANNEL_REGISTRY,MECHANISM_REGISTRY:CHANNEL_REGISTRY,BASE_ACTION_MODES,TRAIT_TEMPLATES,WEAKNESS_TEMPLATES,PARAMETER_OPTIONS,DAMAGE_TYPES,humanizeRegisteredToken,materialAppearancePart,normalizeDraft,inspectDraft,startInterview,applyLLMPatch,applyManualEdit,startAdvisorSession,normalizeAdvisorSession,advanceAdvisorSession,compileBaseAction,finalizeDraft,componentCost,expandedPoolCounts,calculateCompatibilityAxes,attributeDrawPool,drawSourceAttribute,effectAttributeIds,channelThemeAttributeIds,channelAttributeIds,channelSupportsEffect,channelsForEffect,allowsEffect});
});
