(function attachSoulCanonArenaEngine(root, factory) {
  const foundation = root?.SoulCombatFoundation ?? (typeof require === 'function' ? require('./foundation-core.js') : null);
  const effects = root?.SoulEffectCompiler ?? (typeof require === 'function' ? require('./effects-core.js') : null);
  const combat = root?.SoulCombatEngine ?? (typeof require === 'function' ? require('./combat-engine.js') : null);
  const cycle = root?.SoulCycleEngine ?? (typeof require === 'function' ? require('./cycle-engine.js') : null);
  const world = root?.SoulWorldEngine ?? (typeof require === 'function' ? require('./world-engine.js') : null);
  const people = root?.SoulPersonCore ?? (typeof require === 'function' ? require('./person-core.js') : null);
  const abilities=root?.SoulAbilityContract??(typeof require==='function'?require('./ability-contract-core.js'):null);
  const positions=root?.SoulScenePosition??(typeof require==='function'?require('../../shared/scene-position-core.js'):null);
  const logistics=root?.SoulCustodyLogistics??(typeof require==='function'?require('./custody-logistics-core.js'):null);
  const api = factory(foundation, effects, combat, cycle, world, people, abilities,positions,logistics);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SoulCanonArenaEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createSoulCanonArenaEngine(foundation, effects, combat, cycle, world, people, abilities,positions,logistics) {
  'use strict';

  if (!foundation || !effects || !combat || !cycle || !world) throw new Error('SoulCanonArenaEngine requires foundation/effects/combat/cycle/world');

  const VERSION = '2.1.0';
  const genericVisuals=globalThis.SoulGenericVisuals??require('../../shared/generic-human-art-core.js');
  const CANON_MECHANICS_VERSION = 'canon-mechanics-v3.0';
  const canonicalGrowth=globalThis.SoulCanonicalGrowth??require('./canonical-growth-core.js');
  const begonia=globalThis.SoulBegoniaContent??require('../../shared/begonia-content-core.js');
  const swan=globalThis.SoulRoyalSwanContent??require('../../shared/royal-swan-content-core.js');
  const women=globalThis.SoulCanonicalWomenContent??require('../../shared/canonical-women-content-core.js');
  const guProfile=globalThis.SoulGuYuenaProfile??require('./gu-yuena-profile.js');
  const liProfile=globalThis.SoulLiChijingProfile??require('./li-chijing-profile.js');
  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const clean = value => String(value ?? '').trim();
  const list = value => Array.isArray(value) ? [...new Set(value.map(clean).filter(Boolean))] : [];
  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, Number(value) || 0));
  const integer = (value, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) => Math.round(clamp(value, minimum, maximum));
  const split = value => clean(value) ? clean(value).split('|').map(clean).filter(Boolean) : [];
  const {stableHash,presentGeneratedNames,generatePersonalName}=globalThis.SoulDisplayNames ?? require('../../shared/display-names-core.js');
  function rng(seed) {
    let cursor = stableHash(seed) || 1;
    return {
      next() { cursor ^= cursor << 13; cursor ^= cursor >>> 17; cursor ^= cursor << 5; return (cursor >>> 0) / 4294967296; },
      pick(values) { return values[Math.floor(this.next() * values.length) % values.length]; }
    };
  }

  function fillCombatResources(unit) {
    if (!unit?.资源) return unit;
    if (unit.资源.生命) {
      unit.资源.生命.当前 = unit.资源.生命.最大;
      unit.资源.生命.临时 = 0;
    }
    if (unit.资源.魂力) unit.资源.魂力.当前 = unit.资源.魂力.最大;
    return unit;
  }

  const ARCHETYPES = Object.freeze({
    power: {label:'强攻',category:'category.hammer',attributes:['attribute.physical'],channels:['channel.melee','channel.armor_break','channel.burst','channel.transform'],damage:'物理',dominant:'力量'},
    weapon: {label:'器武魂',category:'category.sword',attributes:['attribute.physical','attribute.metal'],channels:['channel.melee','channel.projectile','channel.beam','channel.armor_break'],damage:'物理',dominant:'力量'},
    agility: {label:'敏攻',category:'category.feline',attributes:['attribute.life','attribute.physical','attribute.wind'],channels:['channel.melee','channel.movement','channel.flight','channel.stealth'],damage:'物理',dominant:'身法'},
    control: {label:'控制',category:'category.vine',attributes:['attribute.life','attribute.wood','attribute.soul'],channels:['channel.projectile','channel.entangle','channel.burst','channel.debuff'],damage:'木',dominant:'悟性'},
    support: {label:'辅助',category:'category.crystal',attributes:['attribute.light','attribute.soul'],channels:['channel.projectile','channel.shield','channel.buff','channel.resource'],damage:'光',dominant:'悟性'},
    heal: {label:'治疗',category:'category.flower',attributes:['attribute.life','attribute.wood'],channels:['channel.touch','channel.projectile','channel.heal','channel.cleanse'],damage:'生命',dominant:'悟性'},
    fire: {label:'火系强攻',category:'category.flame',attributes:['attribute.fire'],channels:['channel.projectile','channel.breath','channel.burst','channel.burn'],damage:'火',dominant:'力量'},
    ice: {label:'冰系控制',category:'category.frost',attributes:['attribute.ice'],channels:['channel.projectile','channel.burst','channel.freeze','channel.debuff'],damage:'冰',dominant:'悟性'},
    lightning: {label:'雷系强攻',category:'category.dragon',attributes:['attribute.life','attribute.thunder'],channels:['channel.melee','channel.projectile','channel.chain','channel.paralyze'],damage:'雷',dominant:'力量'},
    poison: {label:'毒系控制',category:'category.serpent',attributes:['attribute.life','attribute.toxic-corrosion'],channels:['channel.touch','channel.projectile','channel.poison','channel.burst'],damage:'毒蚀',dominant:'悟性'},
    mental: {label:'精神控制',category:'category.mind',attributes:['attribute.mind'],channels:['channel.projectile','channel.charm','channel.sleep','channel.debuff'],damage:'精神',dominant:'意志'},
    defense: {label:'防御',category:'category.shield',attributes:['attribute.physical','attribute.earth'],channels:['channel.melee','channel.shield','channel.resistance','channel.armor_break'],damage:'物理',dominant:'体魄'},
    dark: {label:'暗系敏攻',category:'category.shadow',attributes:['attribute.dark','attribute.soul'],channels:['channel.melee','channel.projectile','channel.stealth','channel.soul-interference'],damage:'暗',dominant:'身法'},
    light: {label:'光系强攻',category:'category.light',attributes:['attribute.light'],channels:['channel.projectile','channel.beam','channel.shield','channel.cleanse'],damage:'光',dominant:'意志'},
    ocean: {label:'海洋系',category:'category.ocean',attributes:['attribute.water'],channels:['channel.melee','channel.projectile','channel.breath','channel.burst'],damage:'水',dominant:'体魄'},
    food: {label:'食物辅助',category:'category.seed-fruit',attributes:['attribute.life'],channels:['channel.touch','channel.heal','channel.buff','channel.resource'],damage:'生命',dominant:'悟性'},
    beast: {label:'魂兽',category:'category.dragon',attributes:['attribute.life','attribute.physical'],channels:['channel.melee','channel.breath','channel.burst','channel.armor_break'],damage:'物理',dominant:'体魄'}
  });

  const rawEntries = [];
  function add(locationId, faction, entries) {
    for (const row of entries) {
      const [id,name,level,soul,archetype='power',skills='',bones='',equipment='',periodLabel='',kind='soul-master'] = row;
      rawEntries.push({id,name,level,locationId,faction,soul,archetype,skills:split(skills),bones:split(bones),equipment:split(equipment),periodLabel,kind});
    }
  }

  add('loc-holy-soul-village','圣魂村',[
    ['tang-hao-village','唐昊·圣魂村',95,'昊天锤','power','大须弥锤|炸环|乱披风锤法','十万年蓝银皇右腿骨|六块高年限魂骨','铁匠锤|黑袍','隐居时期'],
    ['tang-san-awakening','唐三·觉醒',10,'蓝银草&昊天锤','control','缠绕','','袖箭|诸葛神弩','诺丁入学前'],
    ['ah-yin-human','阿银·人形',79,'蓝银皇','control','蓝银领域|野火烧不尽，春风吹又生','十万年蓝银皇右腿骨','','化形后']
  ]);
  add('loc-star-dou-outer','史莱克学院·绝世唐门时期',[
    ['huo-yuhao-triple','霍雨浩·三武魂',98,'灵眸&冰碧帝皇蝎&死灵圣法神','mental','精神探测|精神共享|灵魂冲击|永冻之域|冰皇护体|亡灵之门|命运之眼|精神领域|冰雪二帝之骄傲','冰帝躯干骨|冰帝螯|冰帝之鳌|八角玄冰草右腿骨','储物魂导器|亡灵半位面','绝世唐门巅峰时期'],
  ]);
  add('loc-notting-city','诺丁城',[
    ['su-yuntao','素云涛',26,'独狼','agility','独狼附体','','武魂殿执事制服','圣魂村觉醒仪式'],
    ['si-si','丝丝',20,'蛇','poison','','','武魂殿制服','诺丁武魂殿'],
    ['ma-xiunuo','马修诺',29,'机制补全·光杖','support','','','武魂殿长袍','诺丁武魂殿'],
    ['yu-xiaogang-notting','玉小刚·诺丁',29,'罗三炮','control','放屁如打雷|放屁如烟雾','','魂导器腰带','诺丁学院'],
    ['xiao-wu-notting','小舞·诺丁',12,'柔骨兔','agility','腰弓','','','诺丁学院'],
    ['wang-sheng','王圣',9,'战虎','power','','','','诺丁学院'],
    ['xiao-chenyu','萧尘宇',11,'狼','agility','','','','诺丁学院'],
    ['ling-feng-notting','凌风',10,'机制补全·风狼','agility','','','','诺丁学院'],
    ['liu-long-notting','柳龙',10,'长棍','weapon','','','','诺丁学院']
  ]);
  add('loc-soto-city','索托城',[
    ['meng-shu','孟蜀',82,'龙杖','weapon','龙蛇合击','','龙杖','龙公'],
    ['chao-tianxiang','朝天香',68,'蛇杖','poison','龙蛇合击','','蛇杖','蛇婆'],
    ['meng-yiran','孟依然',30,'蛇杖','poison','蛇刃','','蛇杖','星斗遇见时'],
    ['bu-le','不乐',40,'机制补全·鬼手','dark','','','','索托城'],
    ['e-kao','鹅考',40,'机制补全·长刃','weapon','','','长刃','索托城'],
    ['tian-ya','天涯',40,'断刃','weapon','','','断刃','索托城']
  ]);
  add('loc-shrek-old','史莱克学院',[
    ['tang-san-shrek','唐三·史莱克',29,'蓝银草&昊天锤','control','缠绕|寄生|蜀道难于上青天','','二十四桥明月夜|诸葛神弩|八蛛矛','索托时期'],
    ['xiao-wu-shrek','小舞·史莱克',29,'柔骨兔','agility','腰弓|魅惑','','','索托时期'],
    ['dai-mubai-shrek','戴沐白·史莱克',37,'白虎','power','白虎护身障|白虎烈光波|白虎金刚变','','','索托时期'],
    ['oscar-shrek','奥斯卡·史莱克',31,'香肠','food','恢复大香肠|解毒小腊肠|急速飞行蘑菇肠','','','索托时期'],
    ['ma-hongjun-shrek','马红俊·史莱克',28,'邪火凤凰','fire','凤凰火线|浴火凤凰','','','索托时期'],
    ['ning-rongrong-shrek','宁荣荣·史莱克',26,'七宝琉璃塔','support','力量增幅|速度增幅','','','索托时期'],
    ['zhu-zhuqing-shrek','朱竹清·史莱克',27,'幽冥灵猫','agility','幽冥突刺|幽冥百爪','','','索托时期'],
    ['flender','弗兰德',78,'四眼猫鹰','agility','猫鹰真身','','眼镜','院长'],
    ['zhao-wuji','赵无极',76,'大力金刚熊','power','不动明王身|大力金刚掌|重力增强|定位追踪','','','学院老师'],
    ['li-yusong','李郁松',63,'龙纹棍','weapon','','','龙纹棍','学院老师'],
    ['lu-qibin','卢奇斌',66,'星罗棋','control','','','','学院老师'],
    ['shao-xin','邵鑫',71,'糖豆','food','','','','学院老师']
  ]);
  add('loc-lanba-academy','蓝霸学院',[
    ['yu-xiaogang-lanba','玉小刚·蓝霸',29,'罗三炮','control','放屁如打雷|放屁如烟雾','','魂导器腰带','黄金铁三角重聚'],
    ['liu-erlong-lanba','柳二龙·蓝霸',78,'火龙','fire','火龙附体|火龙真身','','','蓝霸院长'],
    ['qin-ming','秦明',62,'烈火苍狼','fire','','','','天斗教师'],
    ['tai-long-tournament','泰隆·大赛',37,'大力猩猩','power','','','','史莱克替补'],
    ['huang-yuan','黄远',35,'独狼','agility','','','','史莱克替补'],
    ['jing-ling','京灵',35,'骷髅','agility','','','','史莱克替补'],
    ['jiang-zhu','绛珠',35,'治疗权杖','heal','','','治疗权杖','史莱克替补']
  ]);
  add('loc-heaven-dou-academy','天斗皇家学院',[
    ['meng-shenji','梦神机',86,'黑妖','mental','','','','教委会首席'],
    ['bai-baoshan','白宝山',85,'天星炉','defense','','','','教委会'],
    ['zhi-lin','智林',83,'天青藤','control','','','','教委会'],
    ['yu-tianheng','玉天恒',43,'蓝电霸王龙','lightning','雷霆龙爪|雷霆万钧|雷霆之怒','','','皇斗战队'],
    ['dugu-yan','独孤雁',38,'碧磷蛇','poison','碧磷紫毒','','','皇斗战队'],
    ['ye-lingling','叶泠泠',35,'九心海棠','heal','九心海棠治疗','','','皇斗战队'],
    ['ao-siluo','奥斯罗',36,'鬼豹','agility','','','','皇斗战队'],
    ['yu-feng','御风',36,'风铃鸟','agility','','','','皇斗战队'],
    ['shi-mo','石墨',38,'玄武龟','defense','','','','皇斗战队'],
    ['shi-mo-younger','石磨',37,'玄武龟','defense','','','','皇斗战队']
  ]);
  add('loc-heaven-dou-city','天斗帝国',[
    ['xue-xing','雪星亲王',50,'天鹅','support','','','亲王礼服','天斗亲王'],
    ['xue-beng','雪崩',30,'天鹅','agility','','','皇子礼服','皇子时期'],
    ['xue-ke','雪珂',20,'天鹅','support','','','宫廷礼服','公主时期'],
    ['xue-qinghe','雪清河',60,'机制补全·天鹅','support','','','太子礼服','天斗太子'],
    ['tang-yuehua','唐月华',9,'如意环','support','贵族圆环','','月轩礼服','月轩轩主'],
    ['dugu-bo-sunset','独孤博·落日森林',92,'碧磷蛇皇','poison','碧磷蛇皇毒|美杜莎的凝望|碧磷神光|时光凝固','美杜莎头部魂骨','','冰火两仪眼时期']
  ]);
  add('loc-seven-treasure-sect','七宝琉璃宗',[
    ['ning-fengzhi','宁风致',79,'七宝琉璃塔','support','力量增幅|速度增幅|魂力增幅|防御增幅','','宗主权杖','宗主时期'],
    ['chen-xin','尘心',96,'七杀剑','weapon','万剑归宗|七杀真身|七杀领域','右臂魂骨','七杀剑','剑斗罗'],
    ['gu-rong','古榕',95,'骨龙','defense','骨龙真身|空间转移','躯干魂骨','','骨斗罗'],
    ['ning-rongrong-sect','宁荣荣·九宝',94,'九宝琉璃塔','support','力量增幅|速度增幅|魂力增幅|防御增幅|攻击增幅|属性增幅|九宝神光护体|九宝无敌神光','幻境智慧头骨','','复活后时期']
  ]);
  add('loc-heaven-dou-city','魂师大赛',[
    ['tang-san-tournament','唐三·大赛',44,'蓝银草&昊天锤','control','缠绕|寄生|蛛网束缚|蓝银囚笼|蓝银突刺阵','','二十四桥明月夜|八蛛矛','全大陆高级魂师学院精英大赛'],
    ['xiao-wu-tournament','小舞·大赛',40,'柔骨兔','agility','腰弓|魅惑|瞬移|无敌金身','','','全大陆高级魂师学院精英大赛'],
    ['dai-mubai-tournament','戴沐白·大赛',44,'白虎','power','白虎护身障|白虎烈光波|白虎金刚变|白虎流星雨','','','全大陆高级魂师学院精英大赛'],
    ['oscar-tournament','奥斯卡·大赛',41,'香肠','food','恢复大香肠|解毒小腊肠|急速飞行蘑菇肠|亢奋粉红肠','','','全大陆高级魂师学院精英大赛'],
    ['ma-hongjun-tournament','马红俊·大赛',41,'邪火凤凰','fire','凤凰火线|浴火凤凰|凤翼天翔|凤凰啸天击','','','全大陆高级魂师学院精英大赛'],
    ['ning-rongrong-tournament','宁荣荣·大赛',41,'九宝琉璃塔','support','力量增幅|速度增幅|魂力增幅|防御增幅','','','全大陆高级魂师学院精英大赛'],
    ['zhu-zhuqing-tournament','朱竹清·大赛',41,'幽冥灵猫','agility','幽冥突刺|幽冥百爪|幽冥斩|幽冥影分身','','','全大陆高级魂师学院精英大赛'],
    ['huo-wushuang','火无双',43,'独角火暴龙','fire','','','','炽火学院'],
    ['huo-wu','火舞',43,'火影','fire','火影分身|抗拒火环|火舞耀阳','','','炽火学院'],
    ['huo-yun','火云',39,'火鹤','fire','','','','炽火学院'],
    ['huo-yu','火雨',39,'火鹤','fire','','','','炽火学院'],
    ['feng-xiaotian','风笑天',44,'疾风双头狼','agility','风刃列阵|疾风双翼|疾风魔狼三十六连斩','','','神风学院'],
    ['shui-binger','水冰儿',43,'冰凤凰','ice','冰封|冰环铠甲|抗拒冰环','','','天水学院'],
    ['shui-yuer','水月儿',36,'莹玉海豚','ocean','','','','天水学院'],
    ['xue-wu','雪舞',42,'纤舞雪缀','ice','乌云|降雪','','','天水学院'],
    ['yu-tianxin','玉天心',43,'蓝电霸王龙','lightning','','','','雷霆学院'],
    ['lei-tian','雷天',42,'雷鹰','lightning','','','','雷霆学院'],
    ['lei-dong','雷动',42,'雷蛛','lightning','','','','雷霆学院'],
    ['huyan-li','呼延力',43,'钻石猛犸','defense','','头部魂骨','','象甲学院'],
    ['shi-nian','时年',72,'残梦','mental','残梦幻境|梦魇','','','苍晖学院'],
    ['ye-zhiqiu','叶知秋',53,'玄龟','defense','玄龟护体|玄水冰封','','','苍晖学院']
  ]);
  add('loc-star-luo-city','星罗帝国',[
    ['dai-weisi','戴维斯',49,'白虎','power','幽冥白虎','','','星罗皇家学院'],
    ['zhu-zhuyun','朱竹云',47,'幽冥灵猫','agility','幽冥白虎','','','星罗皇家学院'],
    ['dai-tian','戴天',90,'白虎','power','','','皇冠|星罗皇帝战甲','星罗皇帝']
  ]);
  add('loc-spirit-city','武魂殿',[
    ['hu-liena-tournament','胡列娜·大赛',51,'妖狐','mental','狐魅|妖魅','','','黄金一代'],
    ['xie-yue','邪月',52,'月刃','weapon','妖魅|圆月','','月刃','黄金一代'],
    ['yan','焱',52,'火焰领主','fire','地狱岩浆冲','','','黄金一代'],
    ['bibi-dong-pope','比比东·教皇',98,'死亡蛛皇&噬魂蛛皇','poison','半月|蜘蛛女皇真身|永恒之创|空间撕裂之深渊斩|不死之身|噬魂领域|死亡领域','十万年魂骨|六块高年限魂骨','教皇权杖|教皇冕服','教皇时期'],
    ['qian-renxue-spirit','千仞雪·供奉殿',89,'六翼天使','light','天使突击|天使圣剑|天使领域','天使六魂骨','天使圣剑','成神前'],
    ['qian-xunji','千寻疾',95,'六翼天使','light','天使真身|天使领域','天使魂骨','教皇权杖','前教皇'],
    ['qian-daoliu','千道流',99,'六翼天使','light','天使真身|天使领域|天使圣剑','天使六魂骨','天使圣剑','极限斗罗'],
    ['golden-crocodile','金鳄斗罗',98,'黄金鳄王','power','黄金鳄王真身','','','二供奉'],
    ['yue-guan','月关',95,'奇茸通天菊','control','金蕊泛流霞|菊花残，满地伤|两极静止领域','','','菊斗罗'],
    ['gui-mei','鬼魅',95,'鬼魅','dark','鬼影地潭手|两极静止领域','','','鬼斗罗'],
    ['she-long','蛇矛斗罗·佘龙',93,'蛇矛','weapon','','','蛇矛','长老'],
    ['ci-xue','刺豚斗罗·刺血',92,'刺豚','poison','','','','长老'],
    ['ghost-leopard','鬼豹斗罗',93,'鬼豹','agility','','','','长老'],
    ['devil-bear','魔熊斗罗',93,'血魔狂熊','power','','','','长老'],
    ['spirit-kite','灵鸢斗罗',93,'灵鸢','agility','','','','长老'],
    ['tuoba-xi','拓跋希',91,'白甲地龙','defense','','','','圣龙宗宗主'],
    ['salas','萨拉斯',87,'机制补全·圣光权杖','support','','','白金主教长袍','白金主教'],
    ['roldiarra','洛尔迪亚拉',83,'金鹰','agility','','','','白金主教'],
    ['huyan-zhen','呼延震',89,'钻石猛犸','defense','','','','象甲宗宗主'],
    ['meyers-spirit','迈尔斯主教',50,'黑角山羊','power','','','武魂主殿长袍','庚辛城武魂主殿']
  ]);
  add('loc-jialing-pass','嘉陵关',[
    ['bibi-dong-mortal-peak','比比东·巅峰魂师',99,'死亡蛛皇&噬魂蛛皇','poison','半月|蜘蛛女皇真身|永恒之创|空间撕裂之深渊斩|不死之身|噬魂领域|死亡领域','十万年魂骨|六块高年限魂骨','教皇权杖','不含神位能力'],
    ['qian-renxue-mortal-peak','千仞雪·巅峰魂师',99,'六翼天使','light','天使突击|天使圣剑|天使真身|天使领域','天使六魂骨','天使圣剑','不含神位能力'],
    ['ge-long','戈龙',85,'机制补全·战戈','weapon','','','战戈|元帅铠甲','天斗元帅'],
    ['tang-san-title','唐三·封号斗罗',96,'蓝银皇&昊天锤','control','蓝银缠绕|蓝银囚笼|蓝银霸皇枪|蓝银青龙缠之韧|蓝银邪魔镜之灭|大须弥锤|炸环|乱披风锤法|蓝银领域|杀神领域','精神凝聚之智慧头骨|蓝银皇右腿骨|柔骨兔左臂骨|泰坦巨猿左臂骨|天青牛蟒右臂骨|八蛛矛','海神三叉戟|二十四桥明月夜|唐门暗器','不含神位能力'],
    ['xiao-wu-title','小舞·复活后',96,'柔骨兔','agility','腰弓|魅惑|瞬移|无敌金身|柔骨锁|虚无|爆杀八段摔','柔骨兔魂骨','','不含神位能力'],
    ['dai-mubai-title','戴沐白·封号斗罗',95,'白虎','power','白虎护身障|白虎烈光波|白虎金刚变|白虎流星雨|白虎魔神变|白虎破灭杀|白虎真身','','','战争末期'],
    ['oscar-title','奥斯卡·食神斗罗',92,'香肠','food','恢复大香肠|解毒小腊肠|急速飞行蘑菇肠|亢奋粉红肠|超越极限墨绿肠|复制镜像肠|坚挺金苍蝇|水晶毛虫肠','镜影头部魂骨','','战争末期'],
    ['ma-hongjun-title','马红俊·凤凰斗罗',93,'九首火凤凰','fire','凤凰火线|浴火凤凰|凤翼天翔|凤凰啸天击|凤凰流星雨|凤凰穿云击|武魂真身|凤凰炼狱','','','战争末期'],
    ['zhu-zhuqing-title','朱竹清·幽冥斗罗',95,'幽冥灵猫','agility','幽冥突刺|幽冥百爪|幽冥斩|幽冥影分身|幽冥影相连|幽冥附体|武魂真身|幽冥摄魂','','','战争末期'],
    ['tang-hao-final','唐昊·巅峰',97,'昊天锤','power','大须弥锤|炸环|乱披风锤法|昊天真身|杀神领域','蓝银皇右腿骨|六块高年限魂骨','昊天锤','重归巅峰'],
    ['dugu-bo-final','独孤博·战争末期',94,'碧磷蛇皇','poison','碧磷蛇皇毒|美杜莎的凝望|碧磷神光|时光凝固','美杜莎头部魂骨','','战争末期']
  ]);
  add('loc-clear-sky-gate','昊天宗',[
    ['tang-chen','唐晨',99,'昊天锤','power','大须弥锤|炸环|昊天真身|杀神领域','六块高年限魂骨','昊天锤','极限斗罗'],
    ['tang-xiao','唐啸',97,'昊天锤','power','大须弥锤|昊天真身|乱披风锤法','魂骨','昊天锤','宗主时期'],
    ['tang-hao-sect','唐昊·昊天宗',95,'昊天锤','power','大须弥锤|炸环|乱披风锤法|杀神领域','蓝银皇右腿骨|魂骨','昊天锤','回宗门时期'],
    ['tang-long','唐龙',64,'昊天锤','power','乱披风锤法','','昊天锤','三代首席'],
    ['tang-hu','唐虎',58,'昊天锤','power','乱披风锤法','','昊天锤','宗门弟子'],
    ['tang-tian','唐天',60,'昊天锤','power','','','昊天锤','宗门弟子'],
    ['tang-yu','唐玉',58,'昊天锤','power','','','昊天锤','宗门弟子'],
    ['tang-tiantian','唐甜甜',55,'昊天锤','power','','','昊天锤','宗门弟子']
  ]);
  add('loc-longxing-city','四大单属性宗族',[
    ['tai-tan','泰坦',86,'大力猩猩','power','大力猩猩真身','','','力之一族族长'],
    ['tai-nuo','泰诺',58,'大力猩猩','power','','','','力之一族'],
    ['tai-long-clan','泰隆·力之一族',45,'大力猩猩','power','','','','力之一族'],
    ['tai-xing','泰兴',43,'大力猩猩','power','','','','力之一族'],
    ['niu-gao','牛皋',84,'板甲巨犀','defense','板甲巨犀真身','','','御之一族族长'],
    ['niu-ben','牛奔',55,'板甲巨犀','defense','','','','御之一族'],
    ['bai-he','白鹤',82,'尖尾雨燕','agility','尖尾雨燕真身','','','敏之一族族长'],
    ['bai-chenxiang','白沉香',47,'尖尾雨燕','agility','','','','敏之一族'],
    ['yang-wudi','杨无敌',82,'破魂枪','weapon','破魂枪决|破魂真身','','破魂枪','破之一族族长'],
    ['yang-wushuang','杨无双',82,'破魂枪','weapon','','','破魂枪','破之一族']
  ]);
  add('loc-gengxin-city','庚辛城',[
    ['lou-gao','楼高',81,'铸造炉','weapon','铸造领域','','八宝如意软甲|铸造锤','铁匠协会会长'],
    ['si-long','思龙',60,'铸造锤','weapon','','','铸造锤','楼高首徒'],
    ['si-di','思迪',50,'铸造锤','weapon','','','铸造锤','楼高弟子'],
    ['si-yu','思雨',50,'铸造锤','weapon','','','铸造锤','楼高弟子'],
    ['si-kai','思凯',50,'铸造锤','weapon','','','铸造锤','楼高弟子']
  ]);
  add('loc-blue-silver-forest','蓝银森林',[
    ['blue-silver-king','蓝银王',85,'','beast','蓝银领域|蓝银治疗','','','八万五千年蓝银草王','soul-beast'],
    ['ah-yin-blue-silver-emperor','蓝银皇·阿银',96,'','beast','蓝银领域|野火烧不尽，春风吹又生','蓝银皇右腿骨','','十万年蓝银皇','soul-beast']
  ]);
  add('loc-heaven-dou-city','蓝电霸王龙宗',[
    ['yu-yuanzhen','玉元震',95,'蓝电霸王龙','lightning','雷霆龙爪|雷霆万钧|蓝电霸王龙真身|龙化','真龙九冠魂骨','','宗主'],
    ['yu-luomian','玉罗冕',84,'蓝电霸王龙','lightning','雷霆龙爪|雷霆万钧|龙化','','','宗门二当家'],
    ['yu-tianxin-sect','玉天心·蓝电宗',43,'蓝电霸王龙','lightning','','','','宗门子弟']
  ]);
  add('loc-slaughter-entrance','杀戮之都',[
    ['slaughter-king','杀戮之王',99,'血红九头蝙蝠','dark','杀神领域|血色蝙蝠翼|血河之力','六块高年限魂骨','杀戮王座权杖','杀戮之都统治者'],
    ['dread-knight-scott','恐怖骑士斯科特',62,'恐怖长枪','weapon','','','恐怖骑士铠甲|长枪|战马','入口守卫'],
    ['tang-san-slaughter','唐三·杀戮之都',59,'昊天锤&蓝银草','weapon','乱披风锤法|杀神领域','','昊天锤|暗器','地狱杀戮场'],
    ['hu-liena-slaughter','胡列娜·杀戮之都',59,'妖狐','mental','狐魅|杀神领域','','短剑','地狱杀戮场']
  ]);
  add('loc-purple-pearl-island','紫珍珠海盗团',[
    ['zi-zhenzhu','紫珍珠',68,'海蛇','poison','','','海盗长刀','团长'],
    ['haider','海德尔',50,'海龟','defense','','','海船|长刀','海德尔号船长'],
    ['ji-xiang','吉祥',10,'银针','weapon','玄天功|鬼影迷踪','','银针','拜师唐三后']
  ]);
  add('loc-sea-god-island','海神岛',[
    ['bo-saixi','波赛西',99,'海神','ocean','海神真身|海神领域|海神之光|海神黄昏','海神六魂骨','海神权杖','极限斗罗'],
    ['sea-dragon-douluo','海龙斗罗',95,'海龙','ocean','海龙真身|海龙领域','','','海龙圣柱守护者'],
    ['sea-spear-douluo','海矛斗罗',93,'海矛','weapon','海矛真身','','海矛','海矛圣柱守护者'],
    ['sea-fantasy-douluo','海幻斗罗',92,'虚幻之蛇','mental','海之幻境','','','海幻圣柱守护者'],
    ['sea-star-douluo','海星斗罗',92,'海星','control','海星真身|吞噬','','','海星圣柱守护者'],
    ['sea-ghost-douluo','海鬼斗罗',92,'魔鬼鱼','poison','海鬼真身|海中之毒','','','海鬼圣柱守护者'],
    ['ou-ya','欧亚·海马斗罗',92,'海马','ocean','海马真身','','','海马圣柱守护者'],
    ['sea-woman-douluo','海女斗罗',93,'人鱼','mental','海妖之歌|镇海神曲','','黑笛','海女圣柱守护者'],
    ['xiao-bai','小白·魔魂大白鲨之王',96,'','beast','魔鲨领域|魔鲨之牙|魔鲨腾海','','','十万年魂兽','soul-beast']
  ]);
  add('loc-star-lake','星斗大森林',[
    ['da-ming','大明·天青牛蟒',96,'','beast','迟钝领域|天青寂灭雷霆|天青迟钝神爪','天青牛蟒右臂骨','','十万年魂兽','soul-beast'],
    ['er-ming','二明·泰坦巨猿',95,'','beast','重力控制领域|泰坦苍穹破|重力泥沼','泰坦巨猿左臂骨','','十万年魂兽','soul-beast']
  ]);
  add('loc-star-dou-inner','星斗大森林',[
    ['dark-devilgod-tiger','暗魔邪神虎',94,'','beast','暗魔邪神雷|生死竞技场|邪神守护|穿刺冲刺','','','六万年异种魂兽','soul-beast']
  ]);
  add('loc-evil-orca-sea','邪魔虎鲸海域',[
    ['evil-orca-king','邪魔虎鲸王',96,'','beast','虎鲸魔之摄|邪魔镜之灭|虎鲸碎牙斩','邪魔虎鲸左腿骨','','十万年魂兽','soul-beast']
  ]);
  add('loc-demon-whale-sea','魔鲸海域',[
    ['deep-sea-demon-whale-king','深海魔鲸王',99,'','beast','魔鲸领域|魔鲸波涛|吞噬天地|深海魔雷|魔鲸之怒','深海魔鲸躯干骨','','九十九万年魂兽','soul-beast']
  ]);

  add('loc-star-lake-shore','银龙一脉',[[guProfile.ID,'古月娜',guProfile.level,'银龙王','mental','元素潮汐|元素掌控|元素融合|元素之杖|星陨霜狱|界隙回廊|银龙王真身|元素寂界|银龙镇','','白银龙枪|银龙舞麟',guProfile.periodLabel]]);
  add('loc-star-lake-shore','黎泾李氏',[[liProfile.ID,'李尺泾',liProfile.level,'薜荔','weapon',liProfile.specifications().map(spec=>spec.name).join('|'),'','',liProfile.periodLabel]]);
  const CANONICAL_IDENTITY_OVERRIDES = Object.freeze({
    'slaughter-king':'tang-chen'
  });
  const canonicalIdentityId = characterId => CANONICAL_IDENTITY_OVERRIDES[clean(characterId)] ?? clean(characterId);
  // World identities are explicit; combat sample IDs and endgame aliases remain separate.
  const WORLD_IDENTITY_GROUPS = Object.freeze(Object.fromEntries(Object.entries({
    'tang-hao':['tang-hao-village','tang-hao-final','tang-hao-sect'],
    'tang-san':['tang-san-awakening','tang-san-shrek','tang-san-tournament','tang-san-title','tang-san-slaughter'],
    'yu-xiaogang':['yu-xiaogang-notting','yu-xiaogang-lanba'],
    'xiao-wu':['xiao-wu-notting','xiao-wu-shrek','xiao-wu-tournament','xiao-wu-title'],
    'dai-mubai':['dai-mubai-shrek','dai-mubai-tournament','dai-mubai-title'],
    'oscar':['oscar-shrek','oscar-tournament','oscar-title'],
    'ma-hongjun':['ma-hongjun-shrek','ma-hongjun-tournament','ma-hongjun-title'],
    'ning-rongrong':['ning-rongrong-shrek','ning-rongrong-sect','ning-rongrong-tournament'],
    'zhu-zhuqing':['zhu-zhuqing-shrek','zhu-zhuqing-tournament','zhu-zhuqing-title'],
    'tai-long':['tai-long-tournament','tai-long-clan'],
    'dugu-bo':['dugu-bo-sunset','dugu-bo-final'],
    'yu-tianxin':['yu-tianxin','yu-tianxin-sect'],
    'hu-liena':['hu-liena-tournament','hu-liena-slaughter'],
    'bibi-dong':['bibi-dong-pope','bibi-dong-mortal-peak'],
    'qian-renxue':['xue-qinghe','qian-renxue-spirit','qian-renxue-mortal-peak'],
    'tang-chen':['tang-chen','slaughter-king']
  }).map(([id,variants])=>[id,Object.freeze(variants)])));
  const WORLD_IDENTITY_BY_RECORD = Object.freeze(Object.fromEntries(Object.entries(WORLD_IDENTITY_GROUPS).flatMap(([id,variants])=>variants.map(variant=>[variant,id]))));
  const worldCharacterIdentityId = characterId => WORLD_IDENTITY_BY_RECORD[characterId]??characterId;
  const LEVEL_99_RECORD_IDS = Object.freeze(rawEntries.filter(raw => integer(raw.level,1,99) === 99).map(raw => raw.id));
  const ENDGAME_IDS = Object.freeze([...new Set(LEVEL_99_RECORD_IDS.map(canonicalIdentityId))]);

  const ATTRIBUTE_KEYS = foundation.ATTRIBUTE_KEYS;
  const RING_AGES = Object.freeze([380,720,1800,6200,15000,32000,52000,78000,100000]);
  const RING_COLORS = Object.freeze({'十年':'白','百年':'黄','千年':'紫','万年':'黑','十万年':'红','百万年':'金'});
  const COMPETITION_LEVELS = Object.freeze(Object.fromEntries([20,30,40,50,60,70,80,90].map((level,index) => [level,Object.freeze({
    id:`division-${level}`,level,minimumPlayerLevel:index === 0 ? 10 : level - 9,maximumPlayerLevel:level,
    ringOrdinal:index + 2,ringYears:RING_AGES[index + 1],label:`${level}级组`
  })])));
  const COMPETITION_VENUES = Object.freeze({
    'arena-soto': Object.freeze({
      id:'arena-soto',locationId:'loc-soto-arena',name:'索托大斗魂场',shortName:'索托',theme:'开放均衡',
      description:'标准开放斗魂台，近远手段都能展开。',favoredArchetypes:['power','agility','weapon','control'],
      rewardAttributes:['物理','风','木','生命'],rewardChannels:['channel.melee','channel.movement','channel.projectile','channel.entangle'],battlefield:{left:{x:28,y:50,zone:'近距'},right:{x:72,y:50,zone:'近距'},cover:'无',tag:'开放斗魂台'},
      martialSoulPool:[['战虎','power'],['风隼','agility'],['铁木棍','weapon'],['青藤','control']]
    }),
    'arena-lanba': Object.freeze({
      id:'arena-lanba',locationId:'loc-lanba-campus',name:'史莱克学院擂台',shortName:'史莱克',theme:'近身猛攻',
      description:'校内擂台距离紧凑，强攻与火系魂师更常见。',favoredArchetypes:['fire','power','heal','control'],
      rewardAttributes:['火','生命','物理'],rewardChannels:['channel.melee','channel.burst','channel.heal','channel.entangle'],battlefield:{left:{x:38,y:50,zone:'接触'},right:{x:62,y:50,zone:'接触'},cover:'无',tag:'紧凑学院擂台'},
      martialSoulPool:[['炽焰狮','fire'],['生息藤','heal'],['铁臂猿','power'],['赤炎花','control']]
    }),
    'arena-royal': Object.freeze({
      id:'arena-royal',locationId:'loc-royal-campus',name:'天斗皇家学院赛',shortName:'皇家',theme:'宽场控制',
      description:'宽阔校场带有训练掩体，控制、防御与远程更常见。',favoredArchetypes:['ice','defense','control','agility','ocean'],
      rewardAttributes:['水','风','冰','土'],rewardChannels:['channel.projectile','channel.shield','channel.debuff','channel.movement'],battlefield:{left:{x:18,y:42,zone:'远距'},right:{x:82,y:58,zone:'远距'},cover:'训练石柱',tag:'皇家宽阔校场'},
      martialSoulPool:[['寒泉','ice'],['岩甲盾','defense'],['风灵隼','agility'],['碧波杖','ocean']]
    }),
    'arena-seven-treasure': Object.freeze({
      id:'arena-seven-treasure',locationId:'loc-seven-hall',name:'七宝琉璃宗赛',shortName:'七宝',theme:'守护增幅',
      description:'宗门演武偏重护盾、恢复、增幅与资源调度。',favoredArchetypes:['support','heal','defense','light','mental'],
      rewardAttributes:['光','生命','灵魂'],rewardChannels:['channel.shield','channel.heal','channel.buff','channel.resource'],battlefield:{left:{x:30,y:46,zone:'近距'},right:{x:70,y:54,zone:'近距'},cover:'琉璃护柱',tag:'七宝演武殿'},
      martialSoulPool:[['琉璃镜','support'],['明光盾','defense'],['生息花','heal'],['灵心铃','mental']]
    }),
    'arena-blue-lightning': Object.freeze({
      id:'arena-blue-lightning',locationId:'loc-heaven-dou-city',name:'蓝电霸王龙家族赛',shortName:'蓝电',theme:'龙雷强攻',
      description:'赛事借天斗城登记入口举行，奖励与参赛武魂偏龙、雷和正面强攻。',favoredArchetypes:['lightning','power','defense','weapon'],
      rewardAttributes:['雷','物理','生命'],rewardChannels:['channel.melee','channel.chain','channel.paralyze','channel.armor_break'],battlefield:{left:{x:32,y:50,zone:'近距'},right:{x:68,y:50,zone:'近距'},cover:'无',tag:'龙雷演武场'},
      martialSoulPool:[['雷角龙','lightning'],['霆光枪','weapon'],['龙鳞盾','defense'],['苍雷兽','power']]
    }),
    'arena-hanhai': Object.freeze({
      id:'arena-hanhai',locationId:'loc-hanhai-arena',name:'瀚海大斗魂场',shortName:'瀚海',theme:'远程机动',
      description:'最大尺度的海滨斗魂台，远程、机动与海洋武魂更常见。',favoredArchetypes:['ocean','agility','ice','control'],
      rewardAttributes:['水','风','冰'],rewardChannels:['channel.projectile','channel.movement','channel.freeze','channel.burst'],battlefield:{left:{x:14,y:38,zone:'极远'},right:{x:86,y:62,zone:'极远'},cover:'潮汐石台',tag:'海滨宽场'},
      martialSoulPool:[['潮汐鲨','ocean'],['风帆翼','agility'],['寒潮珠','ice'],['海藤','control']]
    }),
    'arena-spirit-city': Object.freeze({
      id:'arena-spirit-city',locationId:'loc-spirit-tournament',name:'武魂城总决赛',shortName:'武魂城',theme:'圣光净化',
      description:'总决赛场偏向光明、飞行、护盾与净化传承。',favoredArchetypes:['light','support','heal','agility'],
      rewardAttributes:['光','生命','灵魂'],rewardChannels:['channel.flight','channel.shield','channel.cleanse','channel.beam'],battlefield:{left:{x:24,y:44,zone:'远距'},right:{x:76,y:56,zone:'远距'},cover:'圣辉立柱',tag:'武魂城总决赛场'},
      martialSoulPool:[['圣辉剑','light'],['辉羽','agility'],['净化权杖','heal'],['光明宝珠','support']]
    }),
    'arena-clear-sky': Object.freeze({
      id:'arena-clear-sky',locationId:'loc-clear-residence',name:'昊天宗驻地赛',shortName:'昊天',theme:'重击破甲',
      description:'山门内演武地形狭窄，重武器、近战与破甲最常见。',favoredArchetypes:['power','weapon','defense'],
      rewardAttributes:['物理','金','土'],rewardChannels:['channel.melee','channel.armor_break','channel.shield','channel.burst'],battlefield:{left:{x:40,y:50,zone:'接触'},right:{x:60,y:50,zone:'接触'},cover:'山岩',tag:'昊天山门演武台'},
      martialSoulPool:[['玄铁锤','power'],['裂岩斧','weapon'],['镇山甲','defense'],['破军棍','weapon']]
    })
  });
  const LOCATION_COMPETITION_INDEX = Object.freeze(Object.fromEntries(Object.values(COMPETITION_VENUES).map(venue => [venue.locationId,venue.id])));
  const COMPETITION_ROUNDS = Object.freeze([
    Object.freeze({id:'R16',label:'十六强',matchCount:8}),
    Object.freeze({id:'QF',label:'四分之一决赛',matchCount:4}),
    Object.freeze({id:'SF',label:'半决赛',matchCount:2}),
    Object.freeze({id:'F',label:'决赛',matchCount:1})
  ]);
  const SLAUGHTER_ARENA = Object.freeze({
    id:'slaughter-city-five',locationId:'loc-slaughter-arena',name:'地狱杀戮场',totalBouts:5,opponentsPerBout:9,
    levelOffsets:Object.freeze([[-3,0],[-2,1],[-1,2],[0,3],[1,4]].map(Object.freeze)),
    opponentSoulBoneCarryBaseChance:0.004,opponentSoulBoneCarryPerLevel:0.00012,opponentSoulBoneCarryMaximumChance:0.02,riskMultiplier:2,
    martialSoulPool:Object.freeze([
      ['血影刃','weapon'],['黑角狂犀','power'],['幽火鸦','fire'],['噬魂藤','control'],['夜行豹','dark'],
      ['毒牙蛇','poison'],['铁甲熊','defense'],['裂风隼','agility'],['夺魄铃','mental'],['寒狱蛛','ice'],
      ['雷刑枪','lightning'],['沉海锚','ocean'],['白骨盾','defense'],['赤纹狼','power'],['影月弓','weapon']
    ])
  });
  const COMPETITION_REWARD_RULES = Object.freeze({
    marketValuePerEffectPoint:350,
    placementFactors:Object.freeze({champion:1,runner_up:0.85,semifinalist:0.65,quarterfinalist:0.4,round_of_16:0.2}),
    soulBoneChance:Object.freeze({champion:0.10,runner_up:0.07,semifinalist:0.04,quarterfinalist:0.02,round_of_16:0.01}),
    majorSpendShare:Object.freeze({'soul-bone':0.72,'ring-source':0.64,'soul-device':0.56})
  });

  const CANON_TITLES = Object.freeze({
    'tang-hao-village':'昊天','tang-hao-final':'昊天','tang-hao-sect':'昊天',
    'dugu-bo-sunset':'毒','dugu-bo-final':'毒','chen-xin':'剑','gu-rong':'骨','ning-rongrong-sect':'九彩',
    'bibi-dong-pope':'死亡','bibi-dong-mortal-peak':'死亡','qian-xunji':'天使','qian-daoliu':'天使','qian-renxue-mortal-peak':'天使',
    'golden-crocodile':'金鳄','yue-guan':'菊','gui-mei':'鬼','she-long':'蛇矛','ci-xue':'刺豚','ghost-leopard':'鬼豹','devil-bear':'魔熊','spirit-kite':'灵鸢','tuoba-xi':'圣龙',
    'tang-san-title':'千手','xiao-wu-title':'柔骨','dai-mubai-title':'白虎','oscar-title':'食神','ma-hongjun-title':'凤凰','zhu-zhuqing-title':'幽冥',
    'huo-yuhao-triple':'灵冰',
    'tang-chen':'昊天','tang-xiao':'啸天','yu-yuanzhen':'雷霆','slaughter-king':'杀戮','bo-saixi':'海神',
    'sea-dragon-douluo':'海龙','sea-spear-douluo':'海矛','sea-fantasy-douluo':'海幻','sea-star-douluo':'海星','sea-ghost-douluo':'海鬼','ou-ya':'海马','sea-woman-douluo':'海女'
  });

  function defaultRingCount(level) {
    return Math.min(9, Math.max(0, Math.ceil(level / 10) - 1));
  }

  function evidenceArray(values) {
    return values.map(name => ({name, evidence: name.startsWith('机制补全·') ? 'mechanical-completion' : 'canon-explicit'}));
  }

  function canonicalTitleRecord(raw) {
    if (raw.kind !== 'soul-master' || Number(raw.level) < 91) return null;
    const explicit = CANON_TITLES[raw.id];
    const named = clean(raw.name).match(/(?:^|·)([^·]{1,8})斗罗/u)?.[1];
    const period = clean(raw.periodLabel).match(/^([^·]{1,8})斗罗$/u)?.[1];
    const title = explicit || named || period;
    if (!title) return null;
    const soulName = clean(raw.soul).split('&').map(clean).filter(Boolean).join('与');
    return Object.freeze({封号:title,诗号:`${title}之名，载于其${soulName || '武魂'}与一生战绩。`,来源:'原著称号',取得等级:91,evidence:'canon-title'});
  }

  function generatedTitleRecord(record) {
    if (record.kind !== 'soul-master' || Number(record.level) < 91) return null;
    const soulName = clean(record.martialSouls?.[0]?.name || '无名武魂').replace(/[^\p{L}\p{N}]/gu,'').slice(0,4) || '无名';
    return {封号:soulName,诗号:`以${soulName}为锋，在九环之后留下自己的斗罗之名。`,来源:'代码生成',取得等级:91,evidence:'deterministic-generated-title'};
  }

  const STORAGE_SOUL_DEVICE_PATTERN = /储物|二十四桥明月夜|魂导器腰带/u;
  const EXPLICIT_NON_RING_SKILL_RULES = Object.freeze([
    {type:'sect-secret-art',pattern:/大须弥锤|炸环|乱披风锤法/u,reason:'昊天宗秘法或锤法，不属于魂环魂技'},
    {type:'tang-sect-method',pattern:/玄天功|控鹤擒龙|紫极魔瞳|鬼影迷踪|玄玉手|暗器百解|蜀道难于上青天/u,reason:'唐门功法、身法或暗器运用，不属于魂环魂技'},
    {type:'martial-soul-fusion',pattern:/龙蛇合击|幽冥白虎|妖魅|两极静止领域|黄金铁三角/u,reason:'武魂融合技或多人合击，不属于单人魂环魂技'},
    {type:'self-created-technique',pattern:/爆杀八段摔|疾风魔狼三十六连斩|圆月|破魂枪决/u,reason:'自创战技或家传技法，不属于魂环魂技'},
    {type:'innate-or-awarded-domain',pattern:/领域/u,reason:'领域为武魂天赋、传承奖励或独立能力，不按魂环技能落地'},
    {type:'innate-ability',pattern:/贵族圆环/u,reason:'武魂先天能力，不属于魂环魂技'},
    {type:'soul-bone-skill',pattern:/美杜莎的凝望/u,reason:'美杜莎头部魂骨能力，不属于魂环魂技'}
  ]);

  function explicitNonRingSkill(name) {
    const matched = EXPLICIT_NON_RING_SKILL_RULES.find(rule => rule.pattern.test(clean(name)));
    return matched ? {name:clean(name),type:matched.type,reason:matched.reason,handling:'按驾驶员决定不落地为魂环技能',evidence:'canon-explicit-non-ring-excluded'} : null;
  }
  const WEAPON_PATTERN = /剑|刀|锤|棍|杖|戈|刃|矛|枪|三叉戟|弩|权杖|战甲|铠甲|软甲|笛/u;
  const GARMENT_PATTERN = /服|袍|衣|甲|冠|冕|皇冠|眼镜/u;
  const HIDDEN_WEAPON_PATTERN = /暗器|袖箭|诸葛神弩|飞针|银针|弩/u;
  const RING_NAME_BANK = Object.freeze({
    power:['震岳重击','破军震荡','金刚蓄势','裂地冲锋','霸体强袭','崩山连击','武魂真身','撼天破阵','极限震灭'],
    weapon:['锋刃突进','回锋斩击','贯甲一击','刃阵压制','剑势连环','器魂共鸣','武魂真身','万刃归流','终式裁断'],
    agility:['迅影突袭','连爪追击','疾行闪避','幻影分身','猎杀追踪','风行连袭','武魂真身','瞬影绝杀','极速终舞'],
    control:['缠束生长','寄生牵制','群体拘束','囚笼封锁','突刺阵列','根系压制','武魂真身','领域增殖','皇者统御'],
    support:['力量增幅','速度增幅','魂力增幅','防御增幅','攻击增幅','属性增幅','武魂真身','护体神光','群体守护'],
    heal:['生命治愈','生命护持','群体疗愈','净化创伤','生息守护','伤势逆转','武魂真身','濒危救治','生命复苏'],
    fire:['火线喷射','烈焰附体','凤翼升空','爆炎冲击','火海灼烧','炽焰连环','武魂真身','焚天炎域','凤凰涅槃'],
    ice:['寒气侵袭','冰甲护体','冰封禁锢','抗拒冰环','寒潮扩散','冰晶囚笼','武魂真身','极寒冻结','永冻天域'],
    lightning:['雷霆突击','雷爪破甲','雷网连锁','雷霆之怒','电光疾行','天雷轰击','武魂真身','雷狱封锁','九霄神雷'],
    poison:['毒雾侵袭','毒牙麻痹','毒素扩散','腐蚀毒阵','蛇皇剧毒','毒爆连锁','武魂真身','万毒噬体','碧磷绝毒'],
    mental:['精神探测','精神冲击','幻境迷惑','精神共享','心灵震慑','梦境封锁','武魂真身','精神领域','精神寂灭'],
    defense:['护体屏障','坚甲反震','重盾推进','群体守护','伤害抵御','不动壁垒','武魂真身','绝对防御','玄甲镇域'],
    dark:['暗影突袭','隐匿潜行','幽影分身','恐惧侵蚀','暗蚀连击','影域封锁','武魂真身','虚影绝杀','暗夜寂灭'],
    light:['圣光突击','光明护体','净化辉光','天使圣剑','神圣审判','光翼疾行','武魂真身','天使领域','圣光裁决'],
    ocean:['水流冲击','潮汐护体','海浪束缚','水幕爆发','深海重压','潮汐回旋','武魂真身','怒海狂涛','海啸终式'],
    food:['恢复食品','解毒食品','飞行食品','亢奋食品','魂力食品','属性食品','武魂真身','群体补给','极限增幅'],
    beast:['野性扑杀','本能威压','种族爆发','范围猎杀','强体再生','能量吐息','本源真身','领地压制','王者绝杀']
  });

  function soulArchetypeKey(record, soulName = '') {
    const name = clean(soulName);
    // A second martial soul has its own nature; the owner's primary role is not its element.
    const souls=record.martialSouls?.map(soul=>soul.name)??clean(record.soul).split('&');
    if(souls.length>1&&name!==souls[0]){
      if(/冰|雪/u.test(name))return 'ice';
      if(/死灵|亡灵/u.test(name))return 'dark';
    }
    // 资料库已经明确登记的治疗、辅助、食物、精神与毒系定位优先于名称子串。
    // 例如“九心海棠”不能因为含“海”被误判为海洋系，“虚幻之蛇”也不能抹掉精神本质。
    if (['heal','support','food','mental','poison'].includes(record.archetype)) return record.archetype;
    if (/蓝银|藤|草|棋|梦/u.test(name)) return /梦/u.test(name) ? 'mental' : 'control';
    if (/昊天|锤|猩猩|猛犸|白虎|熊|鳄/u.test(name)) return 'power';
    if (/蛛|蛇|刺豚|毒/u.test(name)) return 'poison';
    if (/蓝电|雷|霆/u.test(name)) return 'lightning';
    if (/冰|雪/u.test(name)) return 'ice';
    if (/火|炎|凤凰/u.test(name)) return 'fire';
    if (/天使|圣光|光明/u.test(name)) return 'light';
    if (/海|鲸|鲨|鱼|水/u.test(name)) return 'ocean';
    return ARCHETYPES[record.archetype] ? record.archetype : 'power';
  }

  function inferredRingCounts(raw, soulCount) {
    const count = defaultRingCount(raw.level);
    if (soulCount <= 1) return [count];
    if (raw.id === 'tang-san-title') return [9,9];
    if (/^tang-san-/u.test(raw.id)) return [count,0];
    if (/^bibi-dong-/u.test(raw.id)) return [count,count];
    return Array.from({length:soulCount},(_,index) => index === 0 ? count : raw.level >= 90 ? count : Math.max(0,count - 3));
  }

  function inferredRingYears(raw, soulIndex, ordinal) {
    if(raw.storyRingYears?.[soulIndex]?.[ordinal-1])return raw.storyRingYears[soulIndex][ordinal-1];
    const ordinary = [80,320,1200,3000,7500,15000,30000,60000,90000];
    const elite = [260,650,1350,3600,8200,16500,33000,64000,92000];
    const peak = [420,820,1900,5000,12500,26000,50000,80000,110000];
    const soulNames = clean(raw.soul);
    const canonPeak = /昊天锤|蓝银皇|六翼天使|七杀剑|骨龙|九宝琉璃塔|七宝琉璃塔|九心海棠|蓝电霸王龙|白虎|凤凰|死亡蛛皇|噬魂蛛皇|海神/u.test(soulNames);
    const canonElite = canonPeak || /龙|皇|王|钻石猛犸|妖狐|月刃|九心海棠|冰凤凰|柔骨兔|疾风双头狼/u.test(soulNames);
    let schedule = canonPeak ? peak : canonElite ? elite : ordinary;
    if (raw.id === 'tang-san-title' && soulIndex === 1) schedule = [10000,16000,26000,40000,60000,80000,100000,100000,100000];
    if (/^bibi-dong-/u.test(raw.id) && soulIndex === 1) schedule = [9000,15000,24000,38000,60000,80000,100000,100000,100000];
    return schedule[Math.min(schedule.length - 1,ordinal - 1)];
  }

  const CANON_EXPLICIT_SKILL_BLUEPRINTS = Object.freeze({
    '不动明王身': {mechanismIds:['reflect-absorb-convert'], effects:[['payload.shield',{骰数:1,骰面:4,加值:0}],['reaction.reflect',{次数:2,反射百分比:30,最大距离区:1,持续回合:2}]]},
    '重力增强': {mechanismIds:['directed-canon-composition'],effects:[['release.projectile',{距离区:2}],['target.burst',{半径区:1,最大目标:2,阵营规则:'敌方'}],['check.save',{属性:'力量',成功效果:'无'}],['status.slow',{数值:1,持续回合:1}]]},
    '定位追踪': {mechanismIds:['persistent-mark-pursuit'], effects:[['release.projectile',{距离区:3}],['target.single',{阵营规则:'敌方'}],['status.mark',{持续回合:4,追踪距离区:3,不可隐藏:true}],['move.pursuit',{距离区:3,需要自身标记:true}]]},
    '复制镜像肠': {mechanismIds:['temporary-skill-copy'], effects:[['copy.skillset',{复制比例:80,持续回合:4,最大技能数:1,排除魂骨:true,排除领域:true}]]},
    '坚挺金苍蝇': {mechanismIds:['next-skill-or-craft-modifier'], effects:[['modifier.next_skill',{效果倍率:150,魂力消耗倍率:100,制造速度倍率:200,成品效果倍率:150,次数:1,持续回合:4}]]},
    '水晶毛虫肠': {mechanismIds:['dynamic-multi-resource-restore'], effects:[['payload.restore',{生命模式:'恢复至上限',生命数值:100,魂力模式:'恢复至上限',魂力数值:100,世界日冷却:7,每日次数:1}]]},
    '多一半钻石肠': {mechanismIds:['dynamic-multi-resource-restore'], effects:[['payload.restore',{生命模式:'缺失比例',生命数值:50,魂力模式:'缺失比例',魂力数值:50,世界日冷却:0,每日次数:1}]]},
    '无敌金身': {mechanismIds:['conditional-invulnerability'], usageRules:{perBattleLimit:2}, effects:[['status.invulnerable',{持续回合:1,次数:99,最大攻击魂技序号:0,最大攻击者等级:99,每日次数:0}]]},
    '九宝神光护体': {mechanismIds:['conditional-invulnerability','reflect-absorb-convert'], effects:[['status.invulnerable',{持续回合:1,次数:1,最大攻击魂技序号:8,最大攻击者等级:0,每日次数:0}],['reaction.reflect',{次数:1,反射百分比:0,最大距离区:4,最大攻击魂技序号:8,吸收转护盾百分比:100,持续回合:1}]]},
    '九宝无敌神光': {mechanismIds:['conditional-invulnerability'], effects:[['release.projectile',{距离区:2}],['target.burst',{半径区:1,最大目标:3,阵营规则:'友方'}],['status.invulnerable',{持续回合:1,次数:99,最大攻击魂技序号:0,最大攻击者等级:0,每日次数:10}]]},
    '永冻之域': {mechanismIds:['directed-canon-composition'], effects:[['domain.field',{半径区:0,持续回合:1,跟随施术者:false,领域强度:1,触发时机:'回合开始',阵营规则:'敌方'}],['status.slow',{数值:1,持续回合:1,领域阵营:'敌方'}]]},
    '永恒之创': {mechanismIds:['compound-persistent-wound'], effects:[['status.eternal_wound',{持续回合:99,每回合魂力:8,治疗削减百分比:100,骰数:2,骰面:8,魂力耗尽倍率:2,战斗后保留:true}]]},
    '抗拒火环': {mechanismIds:['directed-canon-composition'],effects:[['target.burst',{半径区:1,最大目标:3,阵营规则:'敌方'}],['check.save',{属性:'力量',成功效果:'无效果'}],['move.knockback',{距离区:2}]]},
    // Explicit affordable starting parameters; the common compiler spends remaining value.
    '残梦幻境': {mechanismIds:['directed-canon-composition'],effects:[['payload.damage',{类型:'精神',骰数:1,骰面:4,加值:0}],['status.charm',{持续回合:1}]]},
    '寒潮扩散': {mechanismIds:['directed-canon-composition'],effects:[['release.projectile',{距离区:1}],['target.burst',{半径区:1,最大目标:2,阵营规则:'敌方'}],['payload.damage',{类型:'冰',骰数:1,骰面:4,加值:0}],['status.slow',{数值:1,持续回合:1}]]},
    '玄水冰封': {mechanismIds:['directed-canon-composition'],effects:[['payload.damage',{类型:'冰',骰数:1,骰面:4,加值:0}],['status.slow',{数值:1,持续回合:1}],['status.armor_break',{数值:1,持续回合:1}]]},
    '海妖之歌': {mechanismIds:['directed-canon-composition'],effects:[['payload.damage',{类型:'灵魂',骰数:1,骰面:4,加值:0}],['status.fear',{持续回合:1}]]},
    '时光凝固': {mechanismIds:['directed-canon-composition'],effects:[['status.paralysis',{层数:3,阈值:3,持续回合:2}]]},
    '美杜莎的凝望': {mechanismIds:['directed-canon-composition'],singleBranchTarget:'enemy',effects:[['transform.form',{属性加值:0,持续回合:2,形态:'石化'}],['status.stun',{持续回合:2}]]},
    '镜像分身': {mechanismIds:['summoned-skill-inheritance'],effects:[['summon.entity',{模板:'分身',数量:1,生命百分比:80,持续回合:4,继承能力:true,属性继承百分比:80,魂力继承百分比:80,技能继承数量:9,技能效果倍率:80,排除魂骨:true,排除领域:true}]]},
    '蓝银皇右腿骨·飞行': {mechanismIds:['directed-canon-composition'],effects:[['move.flight',{持续回合:4,高度:'高空'}]]},
    '蓝银皇右腿骨·野火烧不尽，春风吹又生': {mechanismIds:['directed-canon-composition'],effects:[['status.regeneration',{持续回合:6,骰数:4,骰面:8}]]},
    '柔骨兔魂骨·虚无': {mechanismIds:['conditional-invulnerability'],effects:[['status.invulnerable',{持续回合:1,次数:1,最大攻击魂技序号:0,最大攻击者等级:0,每日次数:0}]]},
    '柔骨兔魂骨·瞬移': {mechanismIds:['directed-canon-composition'],effects:[['move.teleport',{距离区:4,目的:'指定站位'}]]},
    '泰坦巨猿魂骨·重力震荡': {mechanismIds:['directed-canon-composition'],effects:[['payload.damage',{类型:'物理',骰数:3,骰面:8,加值:6}],['status.slow',{数值:2,持续回合:2}]]},
    '泰坦巨猿魂骨·巨力反震': {mechanismIds:['reflect-absorb-convert'],effects:[['reaction.reflect',{次数:2,反射百分比:60,最大距离区:2,持续回合:3}]]},
    '天青牛蟒魂骨·迟钝神爪': {mechanismIds:['directed-canon-composition'],effects:[['payload.damage',{类型:'雷',骰数:3,骰面:8,加值:5}],['status.slow',{数值:3,持续回合:3}]]},
    '天青牛蟒魂骨·青龙寂灭': {mechanismIds:['directed-canon-composition'],effects:[['payload.damage',{类型:'雷',骰数:4,骰面:8,加值:6}],['status.paralysis',{层数:2,阈值:3,持续回合:3}]]},
    '邪魔虎鲸魂骨·邪魔虎鲸斩': {mechanismIds:['directed-canon-composition'],effects:[['payload.damage',{类型:'物理',骰数:4,骰面:10,加值:6,穿透档:1}]]}
  });

  const CANON_SKILL_ORDINALS = Object.freeze({
    '永恒之创':6,
    '时光凝固':8,
    '蜘蛛女皇真身':7,
    '九宝真身':7,
    '猫鹰真身':7,
    '火龙真身':7,
    '七杀真身':7,
    '骨龙真身':7,
    '天使真身':7,
    '黄金鳄王真身':7
  });

  const CORE_MECHANISM_CATALOG = Object.freeze({
    'temporary-skill-copy': {name:'临时技能复制与排除规则',contracts:['copy.skillset'],state:'implemented'},
    'next-skill-or-craft-modifier': {name:'下次技能或制造增幅',contracts:['modifier.next_skill','support-crafting-modifier'],state:'implemented'},
    'conditional-invulnerability': {name:'带攻击序号、攻击者等级和每日次数的条件无敌',contracts:['status.invulnerable','skill-daily-ledger'],state:'implemented'},
    'reflect-absorb-convert': {name:'伤害反弹、吸收并转化护盾或魂力',contracts:['reaction.reflect'],state:'implemented'},
    'persistent-mark-pursuit': {name:'来源归属明确的持续标记与追击',contracts:['status.mark','move.pursuit'],state:'implemented'},
    'dynamic-multi-resource-restore': {name:'定量、缺失比例、回满式生命/魂力恢复与世界日冷却',contracts:['payload.restore','skill-daily-ledger'],state:'implemented'},
    'compound-persistent-wound': {name:'持续创伤、禁疗和目标支付魂力维持',contracts:['status.eternal_wound'],state:'implemented'},
    'summoned-skill-inheritance': {name:'召唤体按预算继承属性、资源与有限技能并在离场时清理',contracts:['summon.entity','summoned-copy-cleanup'],state:'implemented'},
    'directed-canon-composition': {name:'原著明确能力用公共效果词条定向组合，并受来源预算裁剪',contracts:['effect-registry','directed-branch-budget'],state:'implemented'}
  });

  function explicitSkillBlueprint(name) {
    return CANON_EXPLICIT_SKILL_BLUEPRINTS[clean(name)] ?? null;
  }

  function skillEffectHints(name, archetypeKey, ordinal) {
    const fullText = clean(name);
    const text = fullText.includes('·第') ? clean(fullText.split('·').at(-1)) : fullText;
    const damageType = archetypeFor({archetype:archetypeKey}).damage;
    const explicit = explicitSkillBlueprint(fullText);
    if (explicit) return clone(explicit.effects);
    if (text==='寒潮扩散') return clone(CANON_EXPLICIT_SKILL_BLUEPRINTS['寒潮扩散'].effects);
    if (/^冰封(?:禁锢)?$/u.test(text)) return [['payload.damage',{类型:'冰',骰数:1,骰面:4,加值:0}],['status.slow',{数值:1,持续回合:1}]];
    if (/精神共享|感知共享/u.test(text)) return [['status.buff',{属性:'感知',数值:1,持续回合:2}]];
    if (/恐惧侵蚀/u.test(text)) return [['status.fear',{持续回合:1}]];
    if (/毒牙麻痹/u.test(text)) return [['status.poison',{持续回合:1,骰数:1,骰面:4}],['status.paralysis',{层数:1,阈值:3,持续回合:1}]];
    if (/亡灵之门/u.test(text)) return [['summon.entity',{模板:'亡灵',数量:1,生命百分比:20,持续回合:1}]];
    if (/虚无/u.test(text)) return [['status.invulnerable',{次数:1,持续回合:1}]];
    if (/涅槃/u.test(text)) return [['payload.heal',{骰数:1,骰面:6,加值:1}],['status.regeneration',{持续回合:2,骰数:1,骰面:4}]];
    if (/烟雾|乌云/u.test(text)) return [['zone.obscure',{持续回合:1,强度:1}]];
    if (/护身|守护|庇护|抵御/u.test(text)) return [['payload.shield',{骰数:1,骰面:6,加值:1}]];
    if (/寄生|牵制|根系压制/u.test(text)) return [['status.bind',{持续回合:1,挣脱属性:'力量'}]];
    if (/重力泥沼/u.test(text)) return [['status.slow',{数值:1,持续回合:2}]];
    if (/蓄势|器魂共鸣|精神凝聚|浴火凤凰|雷霆之怒/u.test(text)) return [['status.buff',{属性:/精神凝聚/u.test(text)?'感知':'伤害加值',数值:1,持续回合:2}]];
    if (/迅影突袭/u.test(text)) return [['payload.damage',{类型:damageType,骰数:1,骰面:4,加值:0}]];
    if (/吞噬/u.test(text)&&ordinal>=3) return [['payload.drain',{类型:damageType,骰数:1,骰面:4,加值:0,转化百分比:25}]];
    if (/精神探测/u.test(text)) return [['status.buff',{属性:'感知',数值:1,持续回合:2}]];
    if (/隐匿|潜行|匿息/u.test(text)) return ordinal>=3 ? [['status.invisibility',{持续回合:1,攻击后解除:true}]] : [['zone.obscure',{持续回合:1,强度:1}]];
    if (/净化/u.test(text)) return [['payload.cleanse',{类别:'负面',最大数量:1}]];
    if (/疾行|极速|速度|迅捷/u.test(text)&& !/翼/u.test(text)) return [['status.buff',{属性:'身法',数值:1,持续回合:2}]];
    if (/坚甲反震/u.test(text)) return [['payload.shield',{骰数:1,骰面:4,加值:0}],['reaction.reflect',{次数:1,反射百分比:30,最大距离区:1,持续回合:1}]];
    if (/猎杀追踪/u.test(text)) return [['release.projectile',{距离区:2}],['target.single',{阵营规则:'敌方'}],['status.mark',{持续回合:2,追踪距离区:2,不可隐藏:true}],['move.pursuit',{距离区:2,需要自身标记:true}]];
    if (/连爪追击/u.test(text)) return [['release.projectile',{距离区:1}],['target.single',{阵营规则:'敌方'}],['move.pursuit',{距离区:1,需要自身标记:false}],['payload.damage',{类型:damageType,骰数:1,骰面:4,加值:0}]];
    if (/抗拒冰环/u.test(text)) return [['target.burst',{半径区:1,最大目标:2,阵营规则:'敌方'}],['check.save',{属性:'力量',成功效果:'无'}],['move.knockback',{距离区:1}]];
    if (/群体守护/u.test(text)) return [['release.projectile',{距离区:2}],['target.burst',{半径区:1,最大目标:2,阵营规则:'友方'}],['payload.shield',{骰数:1,骰面:4,加值:0}]];
    if (/群体补给/u.test(text)) return [['release.projectile',{距离区:2}],['target.burst',{半径区:1,最大目标:2,阵营规则:'友方'}],['payload.heal',{骰数:1,骰面:4,加值:0}]];
    if (/魂力食品/u.test(text)) return [['payload.soul_restore',{数值:8}]];
    if (/领域|炎域|影域|天域|玄甲镇域/u.test(text) && ordinal>=3) return [['domain.field',{半径区:0,持续回合:1,跟随施术者:false,领域强度:1,触发时机:'回合开始',阵营规则:'敌方'}],/迟钝|重力控制/u.test(text)?['status.slow',{数值:1,持续回合:1,领域阵营:'敌方'}]:['payload.damage',{类型:damageType,骰数:1,骰面:4,加值:0,领域阵营:'敌方'}]];
    if (/群体.*(?:治疗|疗愈|治愈)/u.test(text)) return [['release.projectile',{距离区:2}],['target.burst',{半径区:1,最大目标:2,阵营规则:'友方'}],['payload.heal',{骰数:1,骰面:4,加值:0}],['status.regeneration',{持续回合:2,骰数:1,骰面:4}]];
    if (/生命护持|生息守护/u.test(text)) return [['release.projectile',{距离区:2}],['target.single',{阵营规则:'友方'}],['payload.shield',{骰数:1,骰面:6,加值:ordinal}]];
    if (/魂力增幅/u.test(text)) return [['status.buff',{属性:'伤害加值',数值:Math.min(5,1 + Math.floor(ordinal / 2)),持续回合:3}]];
    if (/速度增幅/u.test(text)) return [['status.buff',{属性:'身法',数值:Math.min(5,1 + Math.floor(ordinal / 2)),持续回合:3}]];
    if (/防御增幅/u.test(text)) return [['status.buff',{属性:'物理防御',数值:Math.min(5,1 + Math.floor(ordinal / 2)),持续回合:3}],['payload.shield',{骰数:1+Math.ceil(ordinal/3),骰面:8,加值:ordinal}]];
    if (/攻击增幅/u.test(text)) return [['status.buff',{属性:'攻击检定',数值:Math.min(5,1 + Math.floor(ordinal / 2)),持续回合:3}]];
    if (/力量增幅/u.test(text)) return [['status.buff',{属性:'力量',数值:Math.min(5,1 + Math.floor(ordinal / 2)),持续回合:3}]];
    if (/属性增幅|增幅|辅助|共享/u.test(text)) return [['status.buff',{属性:'豁免检定',数值:Math.min(5,1 + Math.floor(ordinal / 2)),持续回合:3}]];
    if (/复活|复苏/u.test(text)) return [['payload.revive',{生命百分比:20}]];
    if (/解毒/u.test(text)) return [['payload.cleanse',{类别:'毒素',最大数量:Math.min(5,1 + Math.floor(ordinal / 3))}]];
    if (/野火烧不尽|春风吹又生/u.test(text)) return [['status.regeneration',{持续回合:6,骰数:4,骰面:8}]];
    if (/不死之身/u.test(text)) return [['status.regeneration',{持续回合:5,骰数:4,骰面:8}]];
    if (/放屁如打雷/u.test(text)) return [['payload.damage',{类型:'风',骰数:1 + Math.ceil(ordinal / 2),骰面:6,加值:ordinal}]];
    if (/精神探测|洞察|侦测/u.test(text)) return [['status.buff',{属性:'感知',数值:Math.min(5,1 + Math.floor(ordinal / 2)),持续回合:3}]];
    if (/精神共享|感知共享/u.test(text)) return [['status.buff',{属性:'感知',数值:Math.min(5,1 + Math.floor(ordinal / 2)),持续回合:3}]];
    if (/持续再生/u.test(text) && ordinal>=3) return [['release.projectile',{距离区:2}],['target.single',{阵营规则:'友方'}],['status.regeneration',{持续回合:3,骰数:1,骰面:6}]];
    if (/治疗|治愈|恢复|再生|生命/u.test(text)) return [['payload.heal',{骰数:1 + Math.ceil(ordinal / 2),骰面:8,加值:ordinal}]];
    if (/无敌/u.test(text)) return [['status.invulnerable',{次数:1,持续回合:1}]];
    if (/真身/u.test(text)) return archetypeKey === 'beast'
      ? [['transform.form',{属性加值:Math.min(8,1 + Math.floor(ordinal / 2)),持续回合:3,形态:'兽形'}]]
      : [['transform.martial_avatar',{持续回合:3,属性增幅档:2,身心防御加值:1,基础动作增幅:2,同源魂技增幅:2,锁定魂力:8,每回合魂力:2,禁用其他武魂:true}]];
    if (/分身/u.test(text)) return ordinal >= 3
      ? [['summon.entity',{模板:'分身',数量:1,生命百分比:20,持续回合:1}]]
      : [['status.invisibility',{持续回合:1,攻击后解除:true}]];
    if (/金刚变|附体|龙化/u.test(text)) return ordinal >= 3
      ? [['transform.form',{属性加值:Math.min(8,1 + Math.floor(ordinal / 2)),持续回合:3,形态:'强化形态'}]]
      : [['status.buff',{属性:'力量',数值:1,持续回合:2}]];
    if (/瞬移|空间转移|空间传送/u.test(text)) return [['move.teleport',{距离区:Math.min(3,1 + Math.floor(ordinal / 3)),目的:'指定站位'}]];
    if (/飞行|凤翼|光翼|双翼|羽翼/u.test(text)) return [['move.flight',{持续回合:2}]];
    // A protection ability keeps its purpose even when its name contains an element.
    if (/护体|护盾|屏障|守御|防御|壁垒|坚甲|铠甲|金身/u.test(text)) return [['payload.shield',{骰数:1,骰面:6,加值:ordinal}]];
    if (/毒|腐蚀/u.test(text)) return [['status.poison',{持续回合:3,骰数:Math.min(4,1 + Math.floor(ordinal / 3)),骰面:4}]];
    if (/冰|冻|寒/u.test(text)) return [['payload.damage',{类型:'冰',骰数:1,骰面:4,加值:0}],['status.slow',{数值:1,持续回合:1}]];
    if (/火|焰|凤凰/u.test(text)) return [['payload.damage',{类型:'火',骰数:1 + Math.ceil(ordinal / 2),骰面:8,加值:ordinal}],['status.burn',{持续回合:2,骰数:Math.min(4,1 + Math.floor(ordinal / 3)),骰面:4}]];
    if (/雷|电/u.test(text)) return ordinal <= 1
      ? [['payload.damage',{类型:'雷',骰数:1,骰面:8,加值:ordinal}]]
      : [['payload.damage',{类型:'雷',骰数:1 + Math.ceil(ordinal / 2),骰面:8,加值:ordinal}],['status.paralysis',{层数:1,阈值:3,持续回合:2}]];
    if (/贯甲|破甲/u.test(text)) return [['payload.damage',{类型:damageType,骰数:1 + Math.ceil(ordinal / 2),骰面:8,加值:ordinal}],['status.armor_break',{数值:Math.min(3,Math.ceil(ordinal/3)),持续回合:2}]];
    if (/速度|迅|疾行|极速/u.test(text)) return ordinal <= 1
      ? [['status.buff',{属性:'身法',数值:1,持续回合:2}]]
      : [['status.haste',{数值:Math.min(3,1 + Math.floor(ordinal / 4)),持续回合:2}]];
    if (/灵魂/u.test(text)) return [['payload.soul_damage',{数值:Math.min(30,4+ordinal*2)}]];
    if (/梦|幻境|精神|心灵/u.test(text)) {
      if (/封锁|梦境/u.test(text)) return [['status.sleep',{持续回合:Math.min(3,1 + Math.floor(ordinal / 4))}]];
      return [['payload.damage',{类型:'精神',骰数:ordinal<3?1:Math.min(6,1+Math.floor(ordinal/2)),骰面:4,加值:0}],['status.charm',{持续回合:Math.min(3,1 + Math.floor(ordinal / 4))}]];
    }
    if (/缠|束|囚|锁|禁锢/u.test(text)) return archetypeKey === 'ocean'
      ? [['status.slow',{数值:Math.min(3,1 + Math.floor(ordinal / 4)),持续回合:2}]]
      : [['status.bind',{持续回合:Math.min(4,1 + Math.floor(ordinal / 3)),挣脱属性:'力量'}]];
    if (/魅/u.test(text)) return [['status.charm',{持续回合:Math.min(3,1 + Math.floor(ordinal / 4))}]];
    return [['payload.damage',{类型:damageType,骰数:1 + Math.ceil(ordinal / 2),骰面:8,加值:ordinal,穿透档:ordinal >= 8 ? 1 : 0}]];
  }

  function requestedEffectsOf(skill) {
    return [
      ...(skill?.requestedEffects ?? []),
      ...(skill?.requestedBranches ?? []).flatMap(branch => branch?.requestedEffects ?? [])
    ].map(([effectId,params]) => [effectId,clone(params ?? {})]);
  }

  function skillBranchHints(name, archetypeKey, ordinal) {
    const text = clean(name);
    const coreName = text.includes('·第') ? clean(text.split('·').at(-1)) : text;
    let effectsList = skillEffectHints(text,archetypeKey,ordinal);
    const declaredEffects = new Set(effectsList.map(([id])=>id));
    const explicit = explicitSkillBlueprint(text);
    if (explicit?.singleBranchTarget) return [{
      id:'primary',label:'主要作用',targetPolicy:explicit.singleBranchTarget,optional:false,priority:100,requestedEffects:effectsList
    }];
    const effectIds = new Set(effectsList.map(([effectId]) => effectId));
    const damageIndex = effectsList.findIndex(([effectId]) => ['payload.damage','payload.soul_damage'].includes(effectId));
    if (damageIndex >= 0 && !effectIds.has('domain.field')) {
      if (['power','weapon','defense'].includes(archetypeKey) && ordinal >= 2 && !effectIds.has('status.armor_break')) effectsList.push(['status.armor_break',{数值:Math.min(3,Math.ceil(ordinal/3)),持续回合:2}]);
      if (archetypeKey === 'poison' && !effectIds.has('status.poison')) effectsList.push(['status.poison',{持续回合:Math.min(5,2+Math.floor(ordinal/3)),骰数:Math.min(4,1+Math.floor(ordinal/3)),骰面:4}]);
      if (archetypeKey === 'mental' && !effectsList.some(([effectId]) => ['status.charm','status.fear','status.sleep','status.stun'].includes(effectId))) effectsList.push([/梦|眠/u.test(text)?'status.sleep':'status.fear',{持续回合:Math.min(3,1+Math.floor(ordinal/4))}]);
    }
    if (['support','food'].includes(archetypeKey) && damageIndex >= 0) effectsList = [['status.buff',{属性:'攻击检定',数值:Math.min(5,1+Math.floor(ordinal/2)),持续回合:3}]];
    if (archetypeKey === 'heal' && damageIndex >= 0) effectsList = [['payload.heal',{骰数:1+Math.ceil(ordinal/2),骰面:8,加值:ordinal}],['status.regeneration',{持续回合:2,骰数:1,骰面:4}]];
    const structural = effectsList.filter(([effectId]) => ['release','targeting','check','sustain'].includes(effects.EFFECT_REGISTRY[effectId]?.family));
    // These authored attacks/control patterns promise an area. Pay for that
    // targeting in the shared compiler instead of silently making them single-target.
    const areaNames = new Set(['破军震荡','撼天破阵','刃阵压制','万刃归流','万剑归宗','囚笼封锁','突刺阵列','蓝银囚笼','爆炎冲击','火海灼烧','凤凰流星雨','凤凰啸天击','白虎流星雨','雷霆万钧','天雷轰击','九霄神雷','寒潮扩散','毒素扩散','腐蚀毒阵','水幕爆发','怒海狂涛','海啸终式','风刃列阵','鬼影地潭手','菊花残，满地伤']);
    if (areaNames.has(coreName) && !effectIds.has('domain.field') && !structural.some(([id])=>id.startsWith('target.'))) {
      if(!structural.some(([id])=>id.startsWith('release.')))structural.push(['release.projectile',{距离区:ordinal<=2?1:2}]);
      structural.push(['target.burst',{半径区:1,最大目标:ordinal>=4?3:2,阵营规则:'敌方'}]);
      // Reserve the area mechanism first; the common allocator then grows its
      // payload within the same ring budget instead of importing single-target magnitudes.
      effectsList = effectsList.filter(([id])=>id!=='status.armor_break'||declaredEffects.has(id)).map(([id,params])=>{
        const next={...params};
        if(effects.effectPolarity(id,params)==='harmful'){
          if('骰数' in next)next.骰数=1;
          if('骰面' in next)next.骰面=4;
          if('加值' in next)next.加值=0;
          if('数值' in next)next.数值=1;
          if('持续回合' in next)next.持续回合=1;
          if(id==='status.paralysis')next.阈值=4;
        }
        return [id,next];
      });
    }
    if (/群体/u.test(text) && !structural.some(([id])=>id.startsWith('target.'))) structural.push(['target.burst',{半径区:1,最大目标:2,阵营规则:effectsList.some(([id,p])=>effects.effectPolarity(id,p)==='harmful')?'敌方':'友方'}]);
    if (/连锁/u.test(text) && !structural.some(([id])=>id.startsWith('target.'))) structural.push(['target.chain',{跳跃区:1,最大目标:2,阵营规则:'敌方'}]);
    const executable = effectsList.filter(([effectId]) => !['release','targeting','check','sustain'].includes(effects.EFFECT_REGISTRY[effectId]?.family));
    const harmful = executable.filter(([effectId,params]) => effects.effectPolarity(effectId,params) === 'harmful');
    const beneficial = executable.filter(([effectId,params]) => effects.effectPolarity(effectId,params) === 'beneficial');
    const neutral = executable.filter(([effectId,params]) => effects.effectPolarity(effectId,params) === 'neutral');
    const branches = [];
    if (harmful.length || (!beneficial.length && neutral.length)) branches.push({
      id:'primary',label:'主要作用',targetPolicy:'enemy',optional:false,priority:100,
      requestedEffects:[...structural,...harmful,...neutral]
    });
    if (beneficial.length) branches.push({
      id:branches.length?'support':'primary',label:branches.length?'协同增益':'主要作用',
      targetPolicy:((['support','heal','food'].includes(archetypeKey) || /共享|群体/u.test(text))&&!/真身|附体|护体|金身/u.test(text))?'ally':'self',
      optional:branches.length>0,priority:branches.length?70:100,requestedEffects:[...(!harmful.length?structural:[]),...(!harmful.length && ['support','heal','food'].includes(archetypeKey) && !structural.some(([id])=>id.startsWith('release.')) && !/真身|附体|护体|金身/u.test(text)?[['release.projectile',{距离区:2}],['target.single',{阵营规则:'友方'}]]:[]),...beneficial,...(!harmful.length?neutral:[])]
    });
    if (['agility','dark'].includes(archetypeKey) && harmful.length && !effectIds.has('status.haste') && !effectIds.has('domain.field')) branches.push({
      id:'mobility',label:'身法联动',targetPolicy:'self',optional:true,priority:45,
      requestedEffects:[['status.haste',{数值:Math.min(3,1+Math.floor(ordinal/4)),持续回合:2}]]
    });
    if (archetypeKey === 'defense' && harmful.length && !effectIds.has('payload.shield') && !effectIds.has('domain.field')) branches.push({
      id:'guard',label:'守御联动',targetPolicy:'self',optional:true,priority:55,
      requestedEffects:[['payload.shield',{骰数:1+Math.ceil(ordinal/2),骰面:8,加值:ordinal}],['status.buff',{属性:'物理防御',数值:Math.min(4,1+Math.floor(ordinal/3)),持续回合:2}]]
    });
    return branches.slice(0,4);
  }

  function inferredSkillName(archetypeKey, soulName, ordinal, variantIndex) {
    const bank = RING_NAME_BANK[archetypeKey] ?? RING_NAME_BANK.power;
    const core = bank[Math.min(bank.length - 1,ordinal - 1)];
    return `${soulName}·第${ordinal}魂技·${core}${variantIndex ? `·其${variantIndex + 1}` : ''}`;
  }

  function inferredRingSkill(raw, archetypeKey, soulName, ordinal, variantIndex) {
    if(swan.isRecord(raw.id)&&soulName==='天鹅'&&variantIndex===0)return {name:swan.get(ordinal).name,evidence:'original-royal-swan-growth'};
    if(raw.id==='ye-lingling'&&soulName==='九心海棠'&&variantIndex===0)return {name:begonia.get(ordinal).name,evidence:'mechanical-inference-begonia-growth'};
    if (raw.id === 'ah-yin-human' && ordinal === 7 && variantIndex === 0) {
      return {name:'蓝银真身',evidence:'mechanical-inference-from-transformed-soul-beast-setting'};
    }
    if (ordinal === 7 && variantIndex > 0) {
      return {name:`${soulName}·第7魂技·本源共鸣·其${variantIndex + 1}`,evidence:'mechanical-inference'};
    }
    return {name:inferredSkillName(archetypeKey,soulName,ordinal,variantIndex),evidence:'mechanical-inference'};
  }

  function sourceForArchetype(archetypeKey, soulName, ordinal) {
    const rows = {
      power:['重甲力兽',['兽类'],['力量','冲击','甲壳'],['重型'],{力量:5,身法:1,体魄:5,悟性:1,感知:2,意志:3}],
      weapon:['金纹刃兽',['兽类','金属'],['金属','技巧','冲击'],['刃甲'],{力量:4,身法:3,体魄:3,悟性:2,感知:3,意志:2}],
      agility:['疾影兽',['兽类'],['速度','突袭','风'],['利爪'],{力量:2,身法:5,体魄:2,悟性:2,感知:4,意志:2}],
      control:['灵藤蛇',['蛇类','植物'],['藤蔓','缠绕','植物'],['长体'],{力量:1,身法:3,体魄:2,悟性:5,感知:4,意志:3}],
      support:['辉晶鹿',['兽类','光明'],['守护','光明','生命'],['辉角'],{力量:1,身法:2,体魄:3,悟性:5,感知:3,意志:4}],
      heal:['生息灵鹿',['兽类','生命'],['生命','再生','守护'],['辉角'],{力量:1,身法:2,体魄:4,悟性:5,感知:3,意志:4}],
      fire:['炽焰飞兽',['兽类','火焰'],['火焰','高温','飞行'],['羽翼'],{力量:4,身法:3,体魄:3,悟性:3,感知:2,意志:3}],
      ice:['寒甲冰兽',['兽类','冰霜'],['冰霜','甲壳','迟缓'],['冰甲'],{力量:2,身法:2,体魄:4,悟性:4,感知:3,意志:3}],
      lightning:['雷羽兽',['兽类','雷电'],['雷电','麻痹','速度'],['羽翼'],{力量:4,身法:4,体魄:2,悟性:3,感知:3,意志:3}],
      poison:['毒纹蛇',['蛇类','毒蚀'],['毒液','长体','麻痹'],['毒囊'],{力量:2,身法:3,体魄:3,悟性:4,感知:3,意志:3}],
      mental:['幻心兽',['兽类','精神'],['精神','灵魂','幻象'],['感知器官'],{力量:1,身法:2,体魄:2,悟性:4,感知:5,意志:5}],
      defense:['玄甲兽',['兽类'],['甲壳','韧性','守护'],['重甲'],{力量:3,身法:1,体魄:5,悟性:2,感知:2,意志:4}],
      dark:['夜影兽',['兽类','阴影'],['阴影','隐匿','突袭'],['利爪'],{力量:3,身法:5,体魄:2,悟性:2,感知:4,意志:3}],
      light:['圣辉角兽',['兽类','光明'],['光明','神圣','守护'],['辉角'],{力量:3,身法:3,体魄:3,悟性:3,感知:3,意志:5}],
      ocean:['潮甲海兽',['水生'],['水','甲壳','冲击'],['鳞甲'],{力量:3,身法:3,体魄:5,悟性:2,感知:4,意志:3}],
      food:['生息果兽',['植物','生命'],['生命','果实','再生'],['种核'],{力量:1,身法:1,体魄:3,悟性:5,感知:3,意志:4}]
    };
    const row = rows[archetypeKey] ?? rows.power;
    return {物种ID:`canon-inferred-${archetypeKey}-${ordinal}`,名称:`${soulName}契合源·${row[0]}`,类别标签:row[1],种族特征:row[2],解剖标签:row[3],属性偏向:row[4]};
  }

  function skillFitsRingYears(input, archetypeKey, ordinal, years) {
    const tier = foundation.getAgeTier(years).名称;
    const tierRank = effects.TIER_RANK[tier] ?? 0;
    return skillBranchHints(input.name,archetypeKey,ordinal).filter(branch=>branch.optional!==true).flatMap(branch => branch.requestedEffects).every(([effectId]) => {
      const minimum = effects.EFFECT_REGISTRY[effectId]?.minimumAgeTier ?? '十年';
      return tierRank >= (effects.TIER_RANK[minimum] ?? 0);
    });
  }

  function ringSourceForRecord(raw, archetypeKey, soulName, ordinal) {
    const source = sourceForArchetype(archetypeKey,soulName,ordinal);
    if(swan.isRecord(raw.id)&&soulName==='天鹅')return clone(swan.get(ordinal).source);
    if(raw.id==='ye-lingling'&&soulName==='九心海棠')return clone(begonia.get(ordinal).source);
    if(raw.storyRingSources?.[soulName]?.[ordinal])return {...source,...clone(raw.storyRingSources[soulName][ordinal])};
    if (/^dugu-bo-/u.test(raw.id) && ordinal === 8) return {
      ...source,
      物种ID:`${source.物种ID}-time-gaze`,
      名称:`${soulName}契合源·时瞳毒蛇`,
      种族特征:list([...source.种族特征,'精神','感知','幻象','迟缓']),
      解剖标签:list([...source.解剖标签,'时感瞳'])
    };
    if (raw.id !== 'ah-yin-human') return source;
    return {
      ...source,
      物种ID:'canon-self-generated-ah-yin',
      名称:'阿银本源自生魂环',
      类别标签:['植物','十万年魂兽化形'],
      种族特征:['藤蔓','缠绕','植物','生命','本源自生'],
      解剖标签:['蓝银皇本源']
    };
  }

  function inferSoulBoneSlot(name, index) {
    const text = clean(name);
    const direct = world.SOUL_BONE_SLOTS.find(slot => text.includes(slot));
    if (direct) return direct;
    if (/头/u.test(text)) return '头骨';
    if (/躯干/u.test(text)) return '躯干骨';
    if (/左臂/u.test(text)) return '左臂骨';
    if (/右臂/u.test(text)) return '右臂骨';
    if (/左腿/u.test(text)) return '左腿骨';
    if (/右腿/u.test(text)) return '右腿骨';
    if (/外附|八蛛矛|螯|鳌/u.test(text)) return '外附魂骨';
    return world.SOUL_BONE_SLOTS[index % 6];
  }

  function soulBoneSkillNames(name, years) {
    const known = [
      [/蓝银皇右腿骨|蓝银皇.*右腿/u,['蓝银皇右腿骨·飞行','蓝银皇右腿骨·野火烧不尽，春风吹又生']],
      [/美杜莎/u,['美杜莎的凝望','美杜莎头骨·蛇皇幻视']],
      [/幻境智慧/u,['幻境空间','幻境智慧头骨·匿息幻识']],
      [/精神凝聚/u,['精神凝聚','精神凝聚之智慧头骨·精神震慑']],
      [/柔骨兔/u,['柔骨兔魂骨·虚无','柔骨兔魂骨·瞬移']],
      [/泰坦巨猿/u,['泰坦巨猿魂骨·重力震荡','泰坦巨猿魂骨·巨力反震']],
      [/天青牛蟒/u,['天青牛蟒魂骨·迟钝神爪','天青牛蟒魂骨·青龙寂灭']],
      [/镜影/u,['镜像分身','镜影头部魂骨·镜像追击']],
      [/邪魔虎鲸/u,['邪魔虎鲸魂骨·邪魔虎鲸斩','邪魔虎鲸魂骨·虎鲸魔摄']],
      [/八蛛矛/u,['八蛛矛·蛛矛穿刺','八蛛矛·外附反制']],
      [/天使魂骨/u,['天使魂骨·圣光守护','天使魂骨·圣辉裁决']],
      [/海神魂骨/u,['海神魂骨·潮汐守护','海神魂骨·沧海庇护']]
    ].find(([pattern]) => pattern.test(name));
    const count = years >= 100000 ? 2 : 1;
    const fallback = [`${name}·本源技`,`${name}·高年限蜕变`];
    return (known?.[1] ?? fallback).slice(0,count);
  }

  function inferSoulBones(raw) {
    const names = [...raw.bones];
    if (raw.equipment.some(name => /八蛛矛/u.test(name)) && !names.some(name => /八蛛矛/u.test(name))) names.push('八蛛矛');
    const expanded = [];
    for (const [index,name] of names.entries()) {
      if (/套装|六魂骨|六块.*魂骨/u.test(name)) {
        const independentName = /天使/u.test(name) ? '天使魂骨' : /海神/u.test(name) ? '海神魂骨' : `${raw.name}高年限魂骨`;
        for (const slot of world.SOUL_BONE_SLOTS.slice(0,6)) expanded.push({
          name:`${independentName}·${slot}`,slot,years:100000,evidence:'mechanical-adaptation-as-independent-canon-bones',skillNames:soulBoneSkillNames(`${independentName}·${slot}`,100000)
        });
        continue;
      }
      const years = /十万年|蓝银皇|柔骨兔|泰坦巨猿|天青牛蟒|深海魔鲸|天使魂骨|海神魂骨/u.test(name) ? 100000
        : /镜影/u.test(name) ? 20000
        : /八蛛矛/u.test(name) ? 2000
          : /美杜莎|幻境智慧|精神凝聚|智慧头骨/u.test(name) ? 60000
            : /头部魂骨/u.test(name) ? 8000
                : 30000;
      expanded.push({name,slot:inferSoulBoneSlot(name,index),years,skillNames:soulBoneSkillNames(name,years),evidence:'canon-name-age-band-mechanical-adaptation'});
    }
    const occupied = new Set();
    return expanded.map(item => {
      const archetype = soulArchetypeKey(raw,clean(raw.soul).split('&')[0]);
      const ordinal = item.years >= 100000 ? 9 : item.years >= 10000 ? 7 : item.years >= 1000 ? 5 : 2;
      const skillBlueprints = item.skillNames.map(name => mechanicalSkillIntent(name,archetype,ordinal,explicitSkillBlueprint(name) ? 'canon-mechanics-explicit' : 'canon-name-directed-adaptation'));
      if (occupied.has(item.slot)) return {...item,skillBlueprints,skipped:true,reason:`${item.slot}在该时期已有融合魂骨；同一玩家槽位规则禁止重复融合`};
      occupied.add(item.slot);
      return {...item,skillBlueprints,skipped:false};
    });
  }

  function inferEquipment(raw) {
    return raw.equipment.map(name => {
      if (STORAGE_SOUL_DEVICE_PATTERN.test(name)) return {name,category:'storage-soul-device',excluded:true,evidence:'canon-explicit-game-excluded',reason:'driver-excluded-storage-soul-device'};
      if (/八蛛矛/u.test(name)) return {name,category:'soul-bone-reference',excluded:true,evidence:'canon-explicit-routed-to-soul-bone',reason:'由魂骨流程承载'};
      if (HIDDEN_WEAPON_PATTERN.test(name)) return {name,category:'hidden-weapon',templateId:'canon-hidden-weapon',excluded:false,evidence:'canon-name-mechanical-values'};
      if (/魂导器/u.test(name)) return {name,category:'soul-device',templateId:'canon-soul-device',excluded:false,evidence:'canon-name-mechanical-values'};
      if (WEAPON_PATTERN.test(name)) return {name,category:'soul-device-weapon-adaptation',templateId:'canon-weapon',excluded:false,evidence:'canon-name-mechanical-values'};
      if (GARMENT_PATTERN.test(name)) return {name,category:'cosmetic-record',excluded:true,evidence:'canon-appearance-only',reason:'原著服饰或身份外观没有独立战斗机制，不伪造装备加值'};
      return {name,category:'cosmetic-record',excluded:true,evidence:'canon-appearance-only',reason:'原著随身物没有明确战斗机制，不伪造装备加值'};
    });
  }

  function ringAcquisitionLevel(record, soulIndex, ordinal, desiredCount) {
    if (soulIndex === 0) return Math.min(record.level,Math.max(10,ordinal * 10));
    const openedAt = Math.max(10,(inferredRingCounts(record,clean(record.soul).split('&').length)[0] ?? 0) * 10);
    return Math.min(record.level,Math.max(openedAt,record.level - desiredCount + ordinal));
  }

  function ringSkillInputs(raw) {
    if(raw.id==='ye-lingling')return [];
    const inputs = raw.skills.map(name => ({name,evidence:explicitSkillBlueprint(name) ? 'canon-mechanics-explicit' : 'canon-name-only-adapted'}));
    if (raw.id === 'ning-rongrong-sect') {
      inputs.splice(6,0,{name:'九宝真身',evidence:'mechanical-inference-from-seventh-ring-rule'});
    }
    if (raw.id === 'oscar-title' && !inputs.some(item => item.name === '多一半钻石肠')) {
      inputs.push({name:'多一半钻石肠',evidence:'mechanical-inference-from-canon-food-progression'});
    }
    return inputs;
  }

  function authoredSkillContracts(node){return Object.fromEntries(['resourceCosts','cooldownTurns','autoAllocate','usageRules'].filter(key=>node[key]!==undefined).map(key=>[key,clone(node[key])]));}
  function mechanicalSkillIntent(name,archetype,ordinal,evidence,recordId) {
    const wing=swan.byName(name);
    if(wing&&evidence==='original-royal-swan-growth')return {name,evidence,strictEffects:true,presetId:`canonical:${recordId}:1:${ordinal}`,...authoredSkillContracts(wing),requestedBranches:[{id:'primary',label:wing.subtitle,activation:'active',optional:false,targetPolicy:wing.targetPolicy,requestedEffects:clone(wing.effects)}]};
    const flower=begonia.byName(name);
    if(flower&&evidence==='mechanical-inference-begonia-growth')return {name,evidence,strictEffects:true,presetId:flower.presetId,...authoredSkillContracts(flower),requestedBranches:[{id:'primary',label:flower.subtitle,activation:'active',optional:false,targetPolicy:flower.targetPolicy,requestedEffects:clone(flower.effects)}]};
    const blueprint = explicitSkillBlueprint(name);
    return {
      name,
      evidence,
      strictEffects:true,
      requestedBranches:skillBranchHints(name,archetype,ordinal),
      mechanismIds:clone(blueprint?.mechanismIds ?? []),
      usageRules:clone(blueprint?.usageRules ?? {})
    };
  }

  const YU_XIAOGANG_CANON_PROFILE = Object.freeze({
    name:'玉小刚·诺丁',age:29,gender:'男',origin:'诺丁城',level:10,
    appearance:'中等身材，面容略显僵硬，衣着朴素整洁',
    attributes:Object.freeze({力量:8,身法:8,体魄:8,悟性:15,感知:12,意志:13}),
    martialSoulDraft:Object.freeze({
      sourceDescription:'玉小刚的变异兽武魂罗三炮，紫色短腿圆胖兽体，以冲撞和气体攻击控制敌人',
      name:'罗三炮',concept:'恶性变异的离体兽武魂，先天品质低下，以有限的气体喷射进行攻击和干扰',
      form:'一只紫色短腿圆胖的犬豕状兽武魂，会在主人身旁独立活动',role:'控制',
      categories:Object.freeze(['category.canine']),
      attributes:Object.freeze([
        Object.freeze({id:'attribute.wind',investment:1}),
        Object.freeze({id:'attribute.toxic-corrosion',investment:1}),
        Object.freeze({id:'attribute.life',investment:1})
      ]),
      channels:Object.freeze(['channel.projectile','channel.blind']),
      weaknesses:Object.freeze([Object.freeze({templateId:'weakness.soul-cost',parameter:'',level:1})]),
      baseAction:Object.freeze({mode:'ranged',powerTier:0,attributeId:'attribute.wind'}),playerConfirmed:true
    })
  });

  const YU_XIAOGANG_RING_LOADOUT = Object.freeze({
    soulIndex:1,soulName:'罗三炮',archetype:'control',desiredCount:2,evidence:'canon-name-common-mechanics-rebuild',
    rings:Object.freeze([
      Object.freeze({
        ordinal:1,years:320,evidence:'canon-name-only-adapted',sourceNote:'按罗三炮的风、毒蚀与气囊表达，在统一魂兽注册池中生成并冻结的历史来源',
        source:Object.freeze({物种ID:'thunder-sac-badger',名称:'雷囊獾',类别标签:Object.freeze(['犬科']),种族特征:Object.freeze(['风','毒蚀','气流','神经毒','麻痹']),解剖标签:Object.freeze(['气囊','皮毛']),属性偏向:Object.freeze({力量:2,身法:2,体魄:2,悟性:2,感知:3,意志:2})}),
        skills:Object.freeze([Object.freeze({name:'放屁如打雷',evidence:'canon-name-only-adapted',requestedEffects:Object.freeze([
          Object.freeze(['release.projectile',Object.freeze({})]),Object.freeze(['target.single',Object.freeze({阵营规则:'敌方'})]),
          Object.freeze(['check.soul_attack',Object.freeze({})]),Object.freeze(['payload.damage',Object.freeze({类型:'风',骰数:1,骰面:6,加值:0})])
        ])})])
      }),
      Object.freeze({
        ordinal:2,years:720,evidence:'canon-name-only-adapted',sourceNote:'按罗三炮的雾化气体与感知压制表达，在统一魂兽注册池中生成并冻结的历史来源',
        source:Object.freeze({物种ID:'fog-gland-civet',名称:'雾腺狸',类别标签:Object.freeze(['犬科']),种族特征:Object.freeze(['风','毒蚀','烟雾','感知']),解剖标签:Object.freeze(['雾腺','皮毛']),属性偏向:Object.freeze({力量:1,身法:3,体魄:2,悟性:2,感知:3,意志:2})}),
        skills:Object.freeze([Object.freeze({name:'放屁如烟雾',evidence:'canon-name-only-adapted',requestedEffects:Object.freeze([
          Object.freeze(['release.projectile',Object.freeze({})]),Object.freeze(['target.single',Object.freeze({阵营规则:'敌方'})]),
          Object.freeze(['check.soul_attack',Object.freeze({})]),Object.freeze(['payload.damage',Object.freeze({类型:'毒蚀',骰数:1,骰面:4,加值:0})]),
          Object.freeze(['status.blind',Object.freeze({持续回合:1})])
        ])})])
      })
    ])
  });

  function buildMechanics(raw, martialSoulNames) {
    if(raw.id===guProfile.ID)return guProfile.mechanics(raw,attributeProgression);
    if(raw.id===liProfile.ID)return liProfile.mechanics(raw,attributeProgression);
    if (raw.kind === 'soul-beast') {
      const refined=women.beast(raw.id);
      const archetype = soulArchetypeKey(raw,raw.soul);
      const years = beastYears(raw);
      const desiredSkillCount = {十年:1,百年:2,千年:3,万年:4,十万年:5,百万年:6}[foundation.getAgeTier(years).名称] ?? 1;
      const names = raw.skills.length ? [...raw.skills] : [`${raw.name}·种族猎杀`,` ${raw.name}·本源威压`.trim(),`${raw.name}·能量爆发`];
      while (names.length < desiredSkillCount) names.push(`${raw.name}·种族技能${names.length + 1}`);
      const soulBones = inferSoulBones(raw);
      return {
        version:CANON_MECHANICS_VERSION,scope:'douluo-one',inferencePolicy:'原作明确优先；空白与模糊项按魂兽年限、种族定位和同一效果编译框架推测',
        beast:{years,archetype,skills:refined?clone(refined.skills):names.map((name,index)=>mechanicalSkillIntent(name,archetype,Math.max(index+1,years>=100000?9:years>=10000?7:3),raw.skills[index] ? (explicitSkillBlueprint(name) ? 'canon-mechanics-explicit' : 'canon-name-only-adapted') : 'mechanical-inference'))},
        attributes:{base:makeSoulBeastAttributes(raw),evidence:'soul-beast-years-and-archetype'},
        ringLoadouts:[],soulBones,equipment:inferEquipment(raw),mechanismGaps:[],excludedSkills:[],
        contentConflicts:soulBones.filter(item=>item.skipped).map(item=>({type:'soul-bone-slot-conflict',name:item.name,slot:item.slot,reason:item.reason,handling:'保留原作条目，按玩家同槽位规则暂不融合'})),
        storageSoulDevicesExcluded:raw.equipment.filter(name => STORAGE_SOUL_DEVICE_PATTERN.test(name))
      };
    }
    if (raw.id === 'yu-xiaogang-notting' && !raw.storyAfterBreakthrough) {
      const excludedEquipment = inferEquipment(raw);
      return {
        version:CANON_MECHANICS_VERSION,scope:'douluo-one',
        inferencePolicy:'仅该诺丁时期实例按原著人物档案定值；共用武魂终审、角色创建、逐环登记、承载判定和每环2点自由属性流程，但不使用玩家100造化点开卡',
        attributes:{initial:clone(YU_XIAOGANG_CANON_PROFILE.attributes),base:{力量:8,身法:8,体魄:8,悟性:17,感知:13,意志:14},allocationPlan:[
          {soulIndex:1,soulName:'罗三炮',ringOrdinal:1,allocation:{悟性:2},evidence:'每枚实际魂环固定提供2点自由属性；按理论型控制定位分配'},
          {soulIndex:1,soulName:'罗三炮',ringOrdinal:2,allocation:{感知:1,意志:1},evidence:'每枚实际魂环固定提供2点自由属性；按理论型控制定位分配'}
        ],totalRingPoints:4,evidence:'原著低体能高理论倾向机械复现；等级不增加六维；仅两枚魂环共4点改变基础六维'},
        canonProfile:clone(YU_XIAOGANG_CANON_PROFILE),creationPointLedger:null,
        ringLoadouts:[{
          ...clone(YU_XIAOGANG_RING_LOADOUT),
          rings:YU_XIAOGANG_RING_LOADOUT.rings.map(ring => ({
            ...clone(ring),
            skills:ring.skills.map(skill => mechanicalSkillIntent(skill.name,'control',ring.ordinal,skill.evidence))
          }))
        }],
        growthPlan:[{stage:'first-ring',level:10,allocate:{悟性:2}},{stage:'second-ring',level:20,allocate:{感知:1,意志:1}},{stage:'notting-current',level:29}],
        soulBones:[],equipment:excludedEquipment,mechanismGaps:[],excludedSkills:[],contentConflicts:[],
        storageSoulDevicesExcluded:raw.equipment.filter(name => STORAGE_SOUL_DEVICE_PATTERN.test(name))
      };
    }
    const counts = inferredRingCounts(raw,martialSoulNames.length);
    const mechanismGaps = [];
    const excludedSkills = [];
    const contentConflicts = [];
    const soulBones = inferSoulBones(raw);
    for (const item of soulBones.filter(item=>item.skipped)) contentConflicts.push({type:'soul-bone-slot-conflict',name:item.name,slot:item.slot,reason:item.reason,handling:'保留原作条目，按玩家同槽位规则暂不融合'});
    const ringCandidates = [];
    for (const input of ringSkillInputs(raw)) {
      const excluded = explicitNonRingSkill(input.name);
      if (excluded) excludedSkills.push(excluded);
      else ringCandidates.push(input);
    }
    const ringLoadouts = martialSoulNames.map((soulName,soulIndex) => {
      const archetype = soulArchetypeKey(raw,soulName);
      const authored=women.forRecord(raw.id,soulName);
      if(authored){
        const rings=authored.NODES.slice(0,counts[soulIndex]??0).map(node=>{
          const ordinal=node.ordinal,years=authored.years?.[ordinal-1]??inferredRingYears(raw,soulIndex,ordinal),storyOrigin=raw.storyRingOrigins?.[soulName]?.[ordinal];
          const source=ringSourceForRecord(raw,archetype,soulName,ordinal);
          if(authored.sources?.[ordinal])Object.assign(source,clone(authored.sources[ordinal]));
          if(authored.sourceNames){source.名称=authored.sourceNames[ordinal-1];source.物种ID='authored-'+authored.NODES[ordinal-1].id;}
          const sourceAttributes=node.sourceAttributes??authored.sourceAttributes;
          if(sourceAttributes)source.属性谱={主属性:clone(sourceAttributes),副属性:[],强度:Object.fromEntries(sourceAttributes.map(a=>[a,30]))};
          source.种族特征=list([...(source.种族特征??[]),...node.effects.flatMap(([id])=>effects.EFFECT_REGISTRY[id]?.sourceTags??[])]);
          const skill={name:node.name,evidence:'authored-canonical-women',strictEffects:true,presetId:`canonical:${raw.id}:${soulIndex+1}:${ordinal}`,description:node.description,artId:node.artId,artPath:node.artPath,requirements:['gesture','martial-soul'],cooldownTurns:node.name==='无敌金身'?4:ordinal===7?4:ordinal>=8?2:ordinal>=4?1:0,...(node.name==='无敌金身'?{usageRules:{perBattleLimit:2}}:{}),requestedBranches:clone(node.requestedBranches??[{id:'primary',label:node.subtitle,activation:'active',optional:false,targetPolicy:node.targetPolicy,requestedEffects:node.effects}])};
          if(node.usageRules)skill.usageRules=clone(node.usageRules);
          if(soulName==='纤舞雪缀')skill.requirements.push('movement');
          if(node.effects.some(([id])=>id==='summon.entity')){skill.resourceCosts=[{kind:'soulPower',amount:12}];skill.cooldownTurns=2;}
          else if(ordinal===7||node.name==='无敌金身')skill.resourceCosts=[{kind:'soulPower',amount:4}];
          if(node.resourceCosts)skill.resourceCosts=clone(node.resourceCosts);
          if(node.cooldownTurns!==undefined)skill.cooldownTurns=node.cooldownTurns;
          if(node.autoAllocate!==undefined)skill.autoAllocate=node.autoAllocate;
          return {ordinal,years,acquisitionLevel:ringAcquisitionLevel(raw,soulIndex,ordinal,counts[soulIndex]??0),source,evidence:'authored-canonical-women',sourceNote:storyOrigin?.note??node.sourceNote,...(storyOrigin?{sourceOrigin:storyOrigin.kind}:{}),description:node.description,appearance:node.summary,artId:node.artId,artPath:node.artPath,skills:[skill]};
        });
        return {soulIndex:soulIndex+1,soulName,archetype,desiredCount:rings.length,rings,evidence:'authored-canonical-women'};
      }
      const rings = Array.from({length:counts[soulIndex] ?? 0},(_,index) => {
        const ordinal = index + 1;
        const years = inferredRingYears(raw,soulIndex,ordinal);
        const skillCount = effects.ringSkillLimit(years);
        const skills = Array.from({length:skillCount},(_,variantIndex) => {
          let source = null;
          if (soulIndex === 0) {
            const ordinalIndex = ringCandidates.findIndex(item => CANON_SKILL_ORDINALS[item.name] === ordinal);
            const trueBodyIndex = ringCandidates.findIndex(item => /真身/u.test(item.name));
            if (ordinalIndex >= 0 && variantIndex === 0) source = ringCandidates.splice(ordinalIndex,1)[0];
            else if (ordinal === 7 && variantIndex === 0 && trueBodyIndex >= 0) source = ringCandidates.splice(trueBodyIndex,1)[0];
            else {
              const nonTrueBodyIndex = ringCandidates.findIndex(item => !/真身/u.test(item.name) && !CANON_SKILL_ORDINALS[item.name] && skillFitsRingYears(item,archetype,ordinal,years));
              if (nonTrueBodyIndex >= 0) source = ringCandidates.splice(nonTrueBodyIndex,1)[0];
            }
          }
          if(variantIndex>0 && !source)return null;
          const inferred = inferredRingSkill(raw,archetype,soulName,ordinal,variantIndex);
          const name = source?.name ?? inferred.name;
          return mechanicalSkillIntent(name,archetype,ordinal,source?.evidence ?? inferred.evidence,raw.id);
        });
        const actualSkills=skills.filter(Boolean);
        const selfGenerated = raw.id === 'ah-yin-human';
        const storyOrigin=raw.storyRingOrigins?.[soulName]?.[ordinal];
        return {ordinal,years,acquisitionLevel:ringAcquisitionLevel(raw,soulIndex,ordinal,counts[soulIndex] ?? 0),evidence:selfGenerated ? 'mechanical-inference-from-transformed-soul-beast-setting' : 'canon-history-mechanical-inference',source:ringSourceForRecord(raw,archetype,soulName,ordinal),sourceNote:storyOrigin?.note??(selfGenerated ? '十万年魂兽化形后的本源自生魂环；仍使用共同魂环编译与登记流程' : '原作未完整记载逐环来源时，按武魂、时期等级与当前承载规则重建历史来源'),...(storyOrigin?{sourceOrigin:storyOrigin.kind}:{}),skills:actualSkills};
      });
      if(swan.isRecord(raw.id))for(const ring of rings){const node=swan.get(ring.ordinal);Object.assign(ring,{evidence:'original-royal-swan-growth',description:node.description,appearance:node.summary,artId:node.artId,artPath:node.artPath,sourceNote:node.sourceNote});}
      if(raw.id==='ye-lingling')for(const ring of rings){const node=begonia.get(ring.ordinal);Object.assign(ring,{evidence:'mechanical-inference-begonia-growth',description:node.description,appearance:node.summary,artId:node.artId,artPath:node.artPath,sourceNote:node.sourceNote});}
      return {soulIndex:soulIndex + 1,soulName,archetype,desiredCount:rings.length,rings,evidence:'canon-soul-mechanical-history'};
    });
    for (const skill of ringCandidates) contentConflicts.push({type:'period-ring-slot-conflict',name:skill.name,reason:'该时期的等级与魂环槽位不足以承载此名称',handling:'视为时期资料冲突，不计作系统机制缺口'});
    const attributes = attributeProgression(raw,ringLoadouts);
    return {
      version:CANON_MECHANICS_VERSION,scope:raw.id === 'huo-yuhao-triple' ? 'cross-era-regression-only' : 'douluo-one',
      inferencePolicy:'原作明确优先；空白与模糊项按武魂定位、人物时期与共同机制推测；人物等级只增长生命和魂力，不反推六维或武魂品级',
      attributes,
      ringLoadouts,soulBones,equipment:inferEquipment(raw),mechanismGaps,excludedSkills,contentConflicts,
      storageSoulDevicesExcluded:raw.equipment.filter(name => STORAGE_SOUL_DEVICE_PATTERN.test(name)),
      ...(swan.isRecord(raw.id)?{martialSoulPresetId:swan.SOUL.id,strictCanonicalPreference:true,allowCanonicalExpressionGrowth:true,...(!raw.growthProjection?{projectionPlan:buildMechanics({...raw,level:99,growthProjection:true},martialSoulNames)}:{})}:{}),
      ...(martialSoulNames.some(n=>women.forRecord(raw.id,n))?{martialSoulPresetId:women.forRecord(raw.id,martialSoulNames[0])?.SOUL.id,martialSoulPresetIds:martialSoulNames.map(n=>women.forRecord(raw.id,n)?.SOUL.id),strictCanonicalPreference:true,allowCanonicalExpressionGrowth:true,...(!raw.growthProjection?{projectionPlan:buildMechanics({...raw,level:99,growthProjection:true},martialSoulNames)}:{})}:{}),
      ...(raw.id==='ye-lingling'?{martialSoulPresetId:'preset:nine-heart-begonia',strictCanonicalPreference:true,allowCanonicalExpressionGrowth:true,...(!raw.growthProjection?{projectionPlan:buildMechanics({...raw,level:99,growthProjection:true},martialSoulNames)}:{})}:{})
    };
  }

  // Static authoring facts are explicit per world identity. They initialize new
  // people only; existing saved bodies and transformed genders remain authoritative.
  const CANONICAL_PERSON_GENDERS = Object.freeze({
    "tang-hao": {
      "gender": "男",
      "sourceReferences": [
        "reborn-entry:336"
      ],
      "kind": "source-backed"
    },
    "yu-xiaogang": {
      "gender": "男",
      "sourceReferences": [
        "reborn-entry:332"
      ],
      "kind": "source-backed"
    },
    "flender": {
      "gender": "男",
      "sourceReferences": [
        "reborn-entry:334"
      ],
      "kind": "source-backed"
    },
    "zhao-wuji": {
      "gender": "男",
      "sourceReferences": [
        "reborn-entry:335"
      ],
      "kind": "source-backed"
    },
    "qin-ming": {
      "gender": "男",
      "sourceReferences": [
        "reborn-entry:357"
      ],
      "kind": "source-backed"
    },
    "yu-tianheng": {
      "gender": "男",
      "sourceReferences": [
        "reborn-entry:362"
      ],
      "kind": "source-backed"
    },
    "dugu-bo": {
      "gender": "男",
      "sourceReferences": [
        "reborn-entry:339"
      ],
      "kind": "source-backed"
    },
    "gu-rong": {
      "gender": "男",
      "sourceReferences": [
        "reborn-entry:343"
      ],
      "kind": "source-backed"
    },
    "dai-mubai": {
      "gender": "男",
      "sourceReferences": [
        "reborn-entry:97"
      ],
      "kind": "source-backed"
    },
    "dai-weisi": {
      "gender": "男",
      "sourceReferences": [
        "reborn-entry:344"
      ],
      "kind": "source-backed"
    },
    "oscar": {
      "gender": "男",
      "sourceReferences": [
        "reborn-entry:326"
      ],
      "kind": "source-backed"
    },
    "ma-hongjun": {
      "gender": "男",
      "sourceReferences": [
        "reborn-entry:327"
      ],
      "kind": "source-backed"
    },
    "xie-yue": {
      "gender": "男",
      "sourceReferences": [
        "reborn-entry:349"
      ],
      "kind": "source-backed"
    },
    "yan": {
      "gender": "男",
      "sourceReferences": [
        "reborn-entry:350"
      ],
      "kind": "source-backed"
    },
    "meng-shu": {
      "gender": "男",
      "sourceReferences": [
        "reborn-entry:365"
      ],
      "kind": "source-backed"
    },
    "tang-xiao": {
      "gender": "男",
      "sourceReferences": [
        "reborn-entry:352"
      ],
      "kind": "source-backed"
    },
    "bai-he": {
      "gender": "男",
      "sourceReferences": [
        "reborn-entry:132"
      ],
      "kind": "source-backed"
    },
    "xue-beng": {
      "gender": "男",
      "sourceReferences": [
        "reborn-entry:96"
      ],
      "kind": "source-backed"
    },
    "yue-guan": {
      "gender": "男",
      "sourceReferences": [
        "reborn-entry:347"
      ],
      "kind": "source-backed"
    },
    "gui-mei": {
      "gender": "男",
      "sourceReferences": [
        "reborn-entry:346"
      ],
      "kind": "source-backed"
    },
    "ning-rongrong": {
      "gender": "女",
      "sourceReferences": [
        "reborn-entry:325"
      ],
      "kind": "source-backed"
    },
    "xiao-wu": {
      "gender": "女",
      "sourceReferences": [
        "reborn-entry:322"
      ],
      "kind": "source-backed"
    },
    "zhu-zhuqing": {
      "gender": "女",
      "sourceReferences": [
        "reborn-entry:324"
      ],
      "kind": "source-backed"
    },
    "hu-liena": {
      "gender": "女",
      "sourceReferences": [
        "reborn-entry:331"
      ],
      "kind": "source-backed"
    },
    "bibi-dong": {
      "gender": "女",
      "sourceReferences": [
        "reborn-entry:328"
      ],
      "kind": "source-backed"
    },
    "huo-wu": {
      "gender": "女",
      "sourceReferences": [
        "reborn-entry:358"
      ],
      "kind": "source-backed"
    },
    "liu-erlong-lanba": {
      "gender": "女",
      "sourceReferences": [
        "reborn-entry:333"
      ],
      "kind": "source-backed"
    },
    "bai-chenxiang": {
      "gender": "女",
      "sourceReferences": [
        "reborn-entry:330"
      ],
      "kind": "source-backed"
    },
    "dugu-yan": {
      "gender": "女",
      "sourceReferences": [
        "reborn-entry:339"
      ],
      "kind": "source-backed"
    },
    "chao-tianxiang": {
      "gender": "女",
      "sourceReferences": [
        "reborn-entry:364"
      ],
      "kind": "source-backed"
    },
    "meng-yiran": {
      "gender": "女",
      "sourceReferences": [
        "reborn-entry:364"
      ],
      "kind": "source-backed"
    },
    "tang-yuehua": {
      "gender": "女",
      "sourceReferences": [
        "reborn-entry:351"
      ],
      "kind": "source-backed"
    },
    "zhu-zhuyun": {
      "gender": "女",
      "sourceReferences": [
        "reborn-entry:97"
      ],
      "kind": "source-backed"
    },
    "shui-binger": {
      "gender": "女",
      "sourceReferences": [
        "reborn-entry:360"
      ],
      "kind": "source-backed"
    },
    "shui-yuer": {
      "gender": "女",
      "sourceReferences": [
        "reborn-entry:111"
      ],
      "kind": "source-backed"
    },
    "xue-wu": {
      "gender": "女",
      "sourceReferences": [
        "reborn-entry:111"
      ],
      "kind": "source-backed"
    },
    "bo-saixi": {
      "gender": "女",
      "sourceReferences": [
        "reborn-entry:353"
      ],
      "kind": "source-backed"
    },
    "xue-xing": {
      "gender": "男",
      "sourceReferences": [
        "reborn-entry:96"
      ],
      "kind": "source-backed"
    },
    "huo-yun": {
      "gender": "男",
      "sourceReferences": [
        "reborn-entry:112"
      ],
      "kind": "source-backed"
    },
    "huo-yu": {
      "gender": "男",
      "sourceReferences": [
        "reborn-entry:112"
      ],
      "kind": "source-backed"
    },
    "tai-nuo": {
      "gender": "男",
      "sourceReferences": [
        "reborn-entry:219"
      ],
      "kind": "source-backed"
    },
    "tai-long": {
      "gender": "男",
      "sourceReferences": [
        "reborn-entry:219"
      ],
      "kind": "source-backed"
    },
    "ning-fengzhi": {
      "gender": "男",
      "sourceReferences": [
        "reborn-entry:219",
        "https://dl.qidian.com/index.php/home/dldl/roleContent/propsId/1023"
      ],
      "kind": "source-backed"
    },
    "tai-tan": {
      "gender": "男",
      "sourceReferences": [
        "reborn-entry:219",
        "https://dl.qidian.com/index.php/home/dldl/roleContent/propsId/1038"
      ],
      "kind": "source-backed"
    },
    "sea-woman-douluo": {
      "gender": "女",
      "sourceReferences": [
        "reborn-entry:127"
      ],
      "kind": "source-backed"
    },
    "yu-feng": {
      "gender": "男",
      "sourceReferences": [
        "web-yufeng-novel-male-20261028"
      ],
      "kind": "source-backed"
    },
    "jiang-zhu": {
      "gender": "女",
      "sourceReferences": [
        "https://dl.qidian.com/index.php/home/dldl/roleContent/propsId/2039"
      ],
      "kind": "source-backed"
    },
    "qian-daoliu": {
      "gender": "男",
      "sourceReferences": [
        "https://dl.qidian.com/index.php/home/dldl/roleContent/propsId/1004"
      ],
      "kind": "source-backed"
    },
    "chen-xin": {
      "gender": "男",
      "sourceReferences": [
        "https://dl.qidian.com/index.php/home/dldl/roleContent/propsId/1011"
      ],
      "kind": "source-backed"
    },
    "yang-wudi": {
      "gender": "男",
      "sourceReferences": [
        "https://dl.qidian.com/index.php/home/dldl/roleContent/propsId/1025"
      ],
      "kind": "source-backed"
    },
    "niu-gao": {
      "gender": "男",
      "sourceReferences": [
        "https://dl.qidian.com/index.php/home/dldl/roleContent/propsId/1035"
      ],
      "kind": "source-backed"
    },
    "ye-lingling": {
      "gender": "女",
      "sourceReferences": [
        "https://dl.qidian.com/index.php/NewHome/dldl/news/id/110"
      ],
      "kind": "source-backed"
    },
    "su-yuntao": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.kunnu8.com/douluo/40638.htm"
      ]
    },
    "si-si": {
      "gender": "女",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.kunnu8.com/douluo/40753.htm"
      ]
    },
    "ma-xiunuo": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.kunnu8.com/douluo/40755.htm"
      ]
    },
    "wang-sheng": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.kunnu8.com/douluo/40681.htm"
      ]
    },
    "xiao-chenyu": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.kunnu8.com/douluo/40683.htm"
      ]
    },
    "ling-feng-notting": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.kunnu8.com/douluo/40683.htm"
      ]
    },
    "liu-long-notting": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.kunnu8.com/douluo/40681.htm"
      ]
    },
    "bu-le": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.kunnu8.com/douluo/41168.htm"
      ]
    },
    "e-kao": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.kunnu8.com/douluo/41168.htm"
      ]
    },
    "tian-ya": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.kunnu8.com/douluo/41169.htm"
      ]
    },
    "li-yusong": {
      "gender": "男",
      "kind": "game-authored",
      "sourceReferences": [
        "game-setting:canonical-gender-completion-20261027/li-yusong",
        "https://www.kanunu8.com/book6/douluodalu/85028.html",
        "https://www.kunnu8.com/douluo/40896.htm"
      ]
    },
    "lu-qibin": {
      "gender": "男",
      "kind": "game-authored",
      "sourceReferences": [
        "game-setting:canonical-gender-completion-20261027/lu-qibin",
        "https://www.kanunu8.com/book6/douluodalu/85028.html",
        "https://www.kunnu8.com/douluo/40896.htm"
      ]
    },
    "shao-xin": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.kanunu8.com/book6/douluodalu/85028.html"
      ]
    },
    "huang-yuan": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.kunnu8.com/douluo/40953.htm"
      ]
    },
    "jing-ling": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.kunnu8.com/douluo/40953.htm"
      ]
    },
    "meng-shenji": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.kunnu8.com/douluo/40893.htm"
      ]
    },
    "bai-baoshan": {
      "gender": "男",
      "kind": "game-authored",
      "sourceReferences": [
        "game-setting:canonical-gender-completion-20261027/bai-baoshan",
        "https://www.kunnu8.com/douluo/40893.htm"
      ]
    },
    "zhi-lin": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.kunnu8.com/douluo/40889.htm"
      ]
    },
    "ao-siluo": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.kunnu8.com/douluo/40866.htm"
      ]
    },
    "shi-mo": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.kunnu8.com/douluo/40866.htm",
        "https://www.kunnu8.com/douluo/40875.htm"
      ]
    },
    "shi-mo-younger": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.kunnu8.com/douluo/40866.htm",
        "https://www.kunnu8.com/douluo/40875.htm"
      ]
    },
    "xue-ke": {
      "gender": "女",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.kunnu8.com/douluo/41188.htm"
      ]
    },
    "huo-wushuang": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://hetushu.com/book/27/17937.html"
      ]
    },
    "feng-xiaotian": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://hetushu.com/book/27/17937.html"
      ]
    },
    "lei-tian": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.hetushu.com/book/27/17870.html"
      ]
    },
    "lei-dong": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.hetushu.com/book/27/17871.html"
      ]
    },
    "huyan-li": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.hetushu.com/book/27/17851.html",
        "https://www.hetushu.com/book/27/17853.html"
      ]
    },
    "ye-zhiqiu": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.hetushu.com/book/27/17783.html"
      ]
    },
    "dai-tian": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "reborn-entry:97"
      ]
    },
    "golden-crocodile": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.hetushu.com/book/27/18041.html",
        "https://www.hetushu.com/book/27/18077.html"
      ]
    },
    "she-long": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.hetushu.com/book/27/17947.html"
      ]
    },
    "ci-xue": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.hetushu.com/book/27/17947.html"
      ]
    },
    "ghost-leopard": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.hetushu.com/book/27/18033.html",
        "https://www.hetushu.com/book/27/18034.html"
      ]
    },
    "devil-bear": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.hetushu.com/book/27/18034.html"
      ]
    },
    "spirit-kite": {
      "gender": "女",
      "kind": "game-authored",
      "sourceReferences": [
        "game-setting:canonical-gender-completion-20261027/spirit-kite",
        "https://bkso.baidu.com/item/%E7%81%B5%E9%B8%A2%E6%96%97%E7%BD%97/61143604"
      ]
    },
    "tuoba-xi": {
      "gender": "男",
      "kind": "game-authored",
      "sourceReferences": [
        "game-setting:canonical-gender-completion-20261027/tuoba-xi",
        "https://soulland.fandom.com/wiki/Tuoba_Xi",
        "https://www.hetushu.com/book/27/18033.html"
      ]
    },
    "salas": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.hetushu.com/book/27/17860.html"
      ]
    },
    "roldiarra": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.hetushu.com/book/27/17875.html"
      ]
    },
    "huyan-zhen": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.hetushu.com/book/27/17851.html"
      ]
    },
    "meyers-spirit": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.hetushu.com/book/27/17941.html"
      ]
    },
    "ge-long": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.hetushu.com/book/27/18030.html",
        "https://www.hetushu.com/book/27/18033.html"
      ]
    },
    "tang-long": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.hetushu.com/book/27/17903.html"
      ]
    },
    "tang-hu": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.hetushu.com/book/27/17903.html"
      ]
    },
    "tang-tian": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.hetushu.com/book/27/17903.html"
      ]
    },
    "tang-yu": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.bidutuijian.com/books/douluodalu/270.html"
      ]
    },
    "tang-tiantian": {
      "gender": "女",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.bidutuijian.com/books/douluodalu/150.html",
        "https://www.kunnu8.com/douluo/41135.htm"
      ]
    },
    "tai-xing": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.bidutuijian.com/books/douluodalu/169.html",
        "https://www.luoxia123.com/douluodalu/448757.html"
      ]
    },
    "niu-ben": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.kunnu8.com/douluo/41171.htm"
      ]
    },
    "yang-wushuang": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "reborn-entry:131",
        "https://www.kunnu8.com/douluo/41196.htm"
      ]
    },
    "lou-gao": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.bidutuijian.com/books/douluodalu/185.html"
      ]
    },
    "si-long": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.bidutuijian.com/books/douluodalu/187.html"
      ]
    },
    "si-di": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.bidutuijian.com/books/douluodalu/187.html",
        "https://www.zizaidu.com/zizaidu/2892/817879.html"
      ]
    },
    "si-yu": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.bidutuijian.com/books/douluodalu/187.html"
      ]
    },
    "si-kai": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.bidutuijian.com/books/douluodalu/187.html"
      ]
    },
    "yu-yuanzhen": {
      "gender": "男",
      "kind": "game-authored",
      "sourceReferences": [
        "game-setting:canonical-gender-completion-20261027/yu-yuanzhen",
        "reborn-entry:99",
        "reborn-entry:362"
      ]
    },
    "yu-luomian": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "reborn-entry:99"
      ]
    },
    "yu-tianxin": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.kunnu8.com/douluo/41027.htm",
        "https://www.kunnu8.com/douluo/41025.htm"
      ]
    },
    "dread-knight-scott": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.99csw.com/book/3514/118664.htm"
      ]
    },
    "zi-zhenzhu": {
      "gender": "女",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.bidutuijian.com/books/douluodalu/210.html"
      ]
    },
    "haider": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.bidutuijian.com/books/douluodalu/210.html"
      ]
    },
    "sea-dragon-douluo": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.kunnu8.com/douluo/41245.htm"
      ]
    },
    "sea-spear-douluo": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.bidutuijian.com/books/douluodalu/242.html"
      ]
    },
    "sea-fantasy-douluo": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.bidutuijian.com/books/douluodalu/245.html"
      ]
    },
    "sea-star-douluo": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.bidutuijian.com/books/douluodalu/245.html"
      ]
    },
    "sea-ghost-douluo": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.bidutuijian.com/books/douluodalu/245.html"
      ]
    },
    "ou-ya": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.bidutuijian.com/books/douluodalu/242.html",
        "reborn-entry:127"
      ]
    },
    "ah-yin-human": {
      "gender": "女",
      "kind": "source-backed",
      "sourceReferences": [
        "reborn-entry:337",
        "reborn-entry:27",
        "https://dl.qidian.com/index.php/home/dldl/roleContent/propsId/2003"
      ]
    },
    "ah-yin-blue-silver-emperor": {
      "gender": "女",
      "kind": "source-backed",
      "sourceReferences": [
        "reborn-entry:337",
        "reborn-entry:27",
        "https://dl.qidian.com/index.php/home/dldl/roleContent/propsId/2003"
      ]
    },
    "huo-yuhao-triple": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "reborn-entry:489"
      ]
    },
    "shi-nian": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://www.hetushu.com/book/27/17846.html"
      ]
    },
    "qian-xunji": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://m.hetushu.com/book/27/18041.html"
      ]
    },
    "ji-xiang": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "reborn-entry:230"
      ]
    },
    "tang-san": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "reborn-entry:321",
        "https://dl.qidian.com/index.php/home/dldl/roleContent/propsId/2043"
      ]
    },
    "qian-renxue": {
      "gender": "女",
      "kind": "source-backed",
      "sourceReferences": [
        "reborn-entry:329",
        "https://dl.qidian.com/index.php/home/dldl/roleContent/propsId/2005"
      ]
    },
    "tang-chen": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "reborn-entry:228",
        "https://dl.qidian.com/index.php/home/dldl/roleContent/propsId/2049"
      ]
    },
    "xiao-bai": {
      "gender": "女",
      "kind": "source-backed",
      "sourceReferences": [
        "https://dl.qidian.com/index.php/home/dldl/roleContent/propsId/1029"
      ]
    },
    "da-ming": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://dl.qidian.com/index.php/home/dldl/roleContent/propsId/2025"
      ]
    },
    "er-ming": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "https://dl.qidian.com/index.php/home/dldl/roleContent/propsId/2028"
      ]
    },
    "deep-sea-demon-whale-king": {
      "gender": "男",
      "kind": "source-backed",
      "sourceReferences": [
        "reborn-entry:625"
      ]
    },
    "dark-devilgod-tiger": {
      "gender": "男",
      "kind": "game-authored",
      "sourceReferences": [
        "game-setting:canonical-gender-completion-20261027/dark-devilgod-tiger"
      ]
    },
    "evil-orca-king": {
      "gender": "男",
      "kind": "game-authored",
      "sourceReferences": [
        "game-setting:canonical-gender-completion-20261027/evil-orca-king",
        "https://www.kunnu8.com/douluo/41235.htm"
      ]
    },
    "blue-silver-king": {
      "gender": "男",
      "kind": "game-authored",
      "sourceReferences": [
        "game-setting:canonical-gender-completion-20261027/blue-silver-king",
        "https://www.kanunu8.com/book6/douluodalu/85138.html"
      ]
    },
    "gu-yuena-adult": {
      "gender": "女",
      "kind": "project-established",
      "sourceReferences": [
        "project-profile:gu-yuena-adult"
      ]
    },
    "li-chijing": {
      "gender": "男",
      "kind": "project-established",
      "sourceReferences": [
        "project-profile:li-chijing"
      ]
    }
  });

  function catalogRecord(raw) {
    const battleCapable = raw.kind !== 'civilian';
    const martialSoulNames = raw.kind === 'soul-master' ? clean(raw.soul).split('&').map(clean).filter(Boolean) : [];
    const title = canonicalTitleRecord(raw);
    const mechanics = buildMechanics(raw,martialSoulNames);
    const identityId = canonicalIdentityId(raw.id);
    const genderSource = CANONICAL_PERSON_GENDERS[worldCharacterIdentityId(raw.id)];
    const identityRecord = rawEntries.find(entry => entry.id === identityId) ?? raw;
    const identityAliases = rawEntries.filter(entry => canonicalIdentityId(entry.id) === identityId && entry.id !== identityId).map(entry => entry.id);
    const terminalOnly = battleCapable && integer(raw.level,1,99) === 99;
    return Object.freeze({
      id: raw.id,
      ...(genderSource?{worldPersona:{gender:genderSource.gender},genderSourceKind:genderSource.kind,genderSourceReferences:clone(genderSource.sourceReferences)}:{}),
      ...(raw.id===guProfile.ID?{sourcePolicy:clone(guProfile.sourcePolicy),apparentAge:guProfile.apparentAge,lifeBasis:clone(guProfile.lifeBasis),characterProfile:clone(guProfile.profile),worldPersona:{age:0,gender:'女',appearance:guProfile.appearance},worldEra:{epoch:'douluo-three-adult',reference:guProfile.reference,phase:guProfile.periodLabel}}:{}),
      ...(raw.id===liProfile.ID?{sourcePolicy:clone(liProfile.sourcePolicy),openingLevel:liProfile.openingLevel,characterProfile:clone(liProfile.profile),worldPersona:{age:liProfile.age,gender:'男',appearance:liProfile.appearance},worldEra:{epoch:'xuanjian-adaptation',reference:liProfile.reference,phase:liProfile.periodLabel}}:{}),
      name: raw.name,
      periodLabel: raw.periodLabel,
      identity: Object.freeze({
        canonicalId: identityId,
        canonicalName: identityRecord.name,
        formLabel: raw.id === 'slaughter-king' ? '杀戮之王时期' : raw.periodLabel,
        relationLabel: raw.id === 'slaughter-king' ? '真实身份为唐晨' : raw.id === 'tang-chen' ? '杀戮之王即唐晨的另一时期形态' : '',
        isCanonical: raw.id === identityId,
        aliasIds: Object.freeze(identityAliases)
      }),
      kind: raw.kind,
      battleCapable,
      level: battleCapable ? integer(raw.level, 1, 99) : 0,
      locationId: raw.locationId,
      faction: raw.faction,
      archetype: raw.archetype,
      martialSouls: evidenceArray(martialSoulNames),
      rings: battleCapable ? {rule:'generated-per-independent-id',count:raw.kind === 'soul-master' ? defaultRingCount(raw.level) : 0,evidence:'mechanical-completion'} : {rule:'none',count:0,evidence:'canon-not-applicable'},
      knownSkillNames: list([...evidenceArray(raw.skills),...(mechanics.ringLoadouts??[]).flatMap(loadout=>loadout.rings.flatMap(ring=>ring.skills.map(skill=>skill.name)))]),
      soulBones: evidenceArray(raw.bones),
      equipment: evidenceArray(raw.equipment),
      mechanics,
      title,
      ai: battleCapable ? {controller:'ai',policy:'strategic-utility-v2'} : null,
      mapBinding: {locationId:raw.locationId,evidence:'canon-relative-or-gameplay-binding'},
      completion: {
        identity:'canon-explicit',
        level:'existing-roster-estimate',
        attributes:'mechanical-inference',
        ringAges:'mechanical-inference',
        effectGraphs:'canon-name-or-mechanical-inference',
        missingCanonFields:'mechanical-inference-authorized'
      },
      endgame: terminalOnly,
      endgameEntryId: terminalOnly ? identityId : '',
      sparEligible: battleCapable && !terminalOnly
    });
  }

  const CHARACTER_CATALOG = Object.freeze(Object.fromEntries(rawEntries.map(raw => [raw.id, catalogRecord(raw)])));
  const WORLD_STORY_PROFILES=Object.freeze({
    ...Object.fromEntries([
      ...[
        ['zi-zhenzhu',123,'来源为68级、紫影海魅武魂；本游戏保留68级海蛇武魂与已有毒系能力。'],
        ['yu-luomian',99,'来源为88级副宗主；本游戏保留84级蓝电霸王龙档案。'],
        ['huyan-zhen',100,'来源为87级宗主；本游戏保留89级钻石猛犸档案。'],
        ['she-long',135,'来源为92级双头蛇矛；本游戏保留93级、武魂登记名蛇矛。'],
        ['ci-xue',135,'来源为92级刺血河豚；本游戏保留92级、武魂登记名刺豚。'],
        ['ghost-leopard',135,'来源为95级黑纹鬼豹；本游戏保留93级、武魂登记名鬼豹。'],
        ['devil-bear',135,'来源为95级血魔狂熊；本游戏保留93级同名武魂档案。'],
        ['sea-star-douluo',127,'来源为91级海星斗罗；本游戏保留92级海星武魂档案。'],
        ['sea-woman-douluo',127,'来源称海魔女斗罗、91级人鱼武魂；本游戏保留海女斗罗之名与93级人鱼档案。'],
        ['dai-tian',97,'来源确认星罗皇帝身份但未提供姓名与等级；戴天之名及90级白虎档案为游戏配置。'],
        ['lou-gao',129,'来源的八阶是铁匠阶位，没有给出魂力等级；81级铸造炉档案为游戏配置。'],
      ].map(([id,source,levelBasis])=>{
        const r=CHARACTER_CATALOG[id];
        return [id,r.name,r.locationId,r.faction,r.periodLabel,[source],levelBasis,
          '本条记录参考卡与本游戏初始配置的取舍。实际武魂、逐环效果和物品沿用现有代码档案；人物当前的变化由游戏事件记录。'];
      }),
      ...[['ling-feng-notting','凌风'],['liu-long-notting','柳龙']].map(([id,name])=>[
        id,name,'loc-notting-city','诺丁城','诺丁学院旧学员',[26,118],
        '26/118仅提供诺丁学院早年背景，未记载此人的当代资料；10级无环及个人武魂沿用游戏配置。',
        '诺丁旧学员为既有目录经历，当前驻留诺丁城；现职与年龄未设定。']),
      ...[['meng-shu','孟蜀','龙公',364],['chao-tianxiang','朝天香','蛇婆',365],['meng-yiran','孟依然','异兽学院参赛经历',366]].map(([id,name,identity,source])=>[
        id,name,'loc-soto-city','盖世龙蛇家族',identity,[28,115,source],
        `本游戏沿用${CHARACTER_CATALOG[id].level}级，魂环与技能仍按现有配置。${id==='meng-shu'?'来源364的早年86级与本游戏82级不同，保留游戏基线。':'没有开局当天独立升级记录。'}`,
        '115记载异兽学院与龙蛇家族关联。364—366把嘉陵关误置1646年，本版按总年表28采用1655年战役；开局为战前家族身份，索托城驻留属游戏配置。']),
      ['dugu-bo-sunset','独孤博','loc-heaven-dou-city','天斗帝国','史莱克学院顾问',[27,96,338],
        '27记载1644年与唐三结交并答应担任学院顾问；338的顾问阶段为92级，本游戏沿用92级九环。',
        '天斗城驻留沿用游戏配置，冰火两仪眼是背景经历；本游戏平行时间线中唐门开局前已经成立，天斗分号已经经营；唐门相关职务按既有参与关系登记。'],
      ['ge-long','戈龙','loc-jialing-pass','天斗帝国','天斗元帅',[28,96],
        '96记载戈龙为天斗三军总司令；85级及战戈武魂沿用游戏配置。',
        '嘉陵关驻留是本游戏安排，所属为天斗帝国。总年表28的嘉陵关战役在1655年，开局驻留不表示战役已经发生。'],
      ...[['yu-tianheng',362],['ye-lingling',361],['ao-siluo',216],['yu-feng',216],['shi-mo',216],['shi-mo-younger',216]].map(([id,source])=>[
        id,CHARACTER_CATALOG[id].name,'loc-heaven-dou-academy','天斗皇家学院','皇斗战队参赛经历',[27,source],
        `本游戏沿用${CHARACTER_CATALOG[id].level}级及既有魂环。${id==='ao-siluo'?'216仅提供战队背景，奥斯罗个人配置沿用游戏目录。':`条目${source}记载此人的皇斗战队经历，未提供开局当天精确等级。`}`,
        `皇斗参赛为早年经历，当前学院驻留属游戏配置，现职未设定。${id==='yu-feng'?'330将白沉香与御风合并，本游戏保留为两个独立人物，武魂与物品各自持久化。':''}`]),
      ['haider','海德尔','loc-purple-pearl-island','紫珍珠海盗团','海魔号船长',[28,229],
        '条目229记载海德尔为海魔号船长、隶属紫珍珠海盗团；50级海龟武魂沿用游戏配置。',
        '开局驻留紫珍珠岛为游戏配置，海魔号是其船名；条目28中的1651年出海事件尚未发生，航行与物品能力以现有规则为准。'],
      ...[
        ['炽火学院',112,['huo-wushuang','huo-wu','huo-yun','huo-yu']],
        ['神风学院',110,['feng-xiaotian']],
        ['天水学院',111,['shui-binger','shui-yuer','xue-wu']],
        ['雷霆学院',114,['lei-tian','lei-dong']],
        ['象甲学院',113,['huyan-li']],
        ['苍晖学院',213,['ye-zhiqiu']],
      ].flatMap(([school,source,ids])=>ids.map(id=>[
        id,CHARACTER_CATALOG[id].name,'loc-heaven-dou-city',school,`${school}${id==='ye-zhiqiu'?'教师':'学员'}经历`,[27,source],
        `沿用${CHARACTER_CATALOG[id].level}级游戏基线，非开局当天原文等级。${id==='lei-tian'?'条目114提供学院背景，雷天个人配置来自既有游戏目录。':`条目${source}提供此人的学院经历。`}`,
        '总年表27中的魂师大赛已于1645年结束。学院关联保留早年经历，当前天斗城驻留为游戏配置；现职与毕业后经历尚未设定，能力和物品沿用现有数据。'])),
      ['qin-ming','秦明','loc-lanba-academy','史莱克学院','史莱克学院毕业生',[27,108,357],
        '条目357记载史莱克学院毕业生秦明及62级六环；本游戏沿用此基线，非开局当天独立升级记录。',
        '天斗皇家学院教师与皇斗指导老师是既有履历；当前学院已更名史莱克，驻留及学院关联沿用游戏配置，未设定当前具体职务。武魂、技能与物品沿用现有数据。'],
      ...[['tai-tan','泰坦','力之一族族长'],['tai-nuo','泰诺','力之一族'],['tai-xing','泰兴','力之一族']].map(([id,name,identity])=>[
        id,name,'loc-heaven-dou-city','力之一族',identity,[28,134],
        `条目134记载力之一族族地在天斗城；本游戏沿用${CHARACTER_CATALOG[id].level}级，${id==='tai-xing'?'此人的个人能力属于游戏补全':'未提供开局当天独立升级记录'}。`,
        '龙兴城四族聚会属于总年表28的后续事件。开局按族地驻留天斗城，唐门开局前已成立，相关职务按实际参与关系登记；实际技能与物品沿用现有数据。']),
      ['sea-spear-douluo','海矛斗罗','loc-sea-god-island','海神岛','海矛圣柱守护者',[127],
        '条目127记载93级海矛斗罗、海矛武魂；本游戏沿用93级九环。',
        '武魂为海矛，魂环年限与效果由共用规则补全；海神三叉戟神器不属于此人的武魂或持有物。'],
      ['sea-ghost-douluo','海鬼斗罗','loc-sea-god-island','海神岛','海鬼圣柱守护者',[127],
        '条目127记载魔鬼鱼武魂与91级；本游戏保留92级九环基线，不称作来源精确等级。',
        '海鬼是称号，实际武魂为魔鬼鱼；毒系定位、具名魂技及逐环效果沿用共用规则补全。'],
      ['tang-yuehua','唐月华','loc-moon-pavilion','天斗帝国','月轩轩主',[27,107,225,352],
        '月轩轩主唐月华初遇为9级无魂环。本游戏二创将如意环设为顶级：完成本人同意的环脉圆融修炼后，按实际经验突破，沿九环传承成长。',
        '驻留月轩沿用该设施背景，不代表每日行程。贵族圆环为付费先天守心领域，按实际武魂动作、领域范围与魂力维持结算；礼仪和身份不能强制改变他人态度。'],
      ['meyers-spirit','迈尔斯主教','loc-gengxin-city','武魂殿','庚辛城武魂主殿',[28,129,227],
        '条目129明确迈尔斯掌控庚辛城武魂主殿，227记载后续庚辛城事件；本游戏沿用50级四环，不称作开局当日的原文精确实力。',
        '当前驻留庚辛城而非武魂城。后续唐三清剿主殿不自动在开局发生；黑角山羊武魂及逐环技能是既有游戏补全，不因主教身份自动产生征税、抢夺或资金转移。'],
      ['yang-wushuang','杨无双','loc-spirit-city','武魂殿','投靠武魂殿后',[131],
        '条目131记载杨无双早年被俘并投靠武魂殿；其中82级明确属于其兄杨无敌。本游戏给杨无双沿用82级八环是独立游戏配置，不是将哥哥等级当作来源证据。',
        '破之一族出身和杨无敌之弟是背景，当前阵营采用已投靠的武魂殿。驻留武魂城、破魂枪及实际能力沿用游戏配置；不自动推演家族和解、归队或其他未实现的势力事件。'],
      ['liu-erlong-lanba','柳二龙','loc-lanba-academy','史莱克学院','蓝霸学院创办者',[27,108,109,333],
        '条目108明确78级火龙魂圣，27/108记载学院已更名并交由弗兰德打理；本游戏沿用78级七环，没有开局当天独立升级记录。',
        '保留蓝霸创办者经历，当前属于更名后的史莱克学院，不沿用旧蓝霸院长职权。学院驻留为游戏配置，黄金圣龙融合技尚未注册为可执行能力。'],
      ...[['huang-yuan','黄远'],['jing-ling','京灵'],['jiang-zhu','绛珠']].map(([id,name])=>[
        id,name,'loc-lanba-academy','史莱克学院','史莱克战队原替补',[27,108,220],
        '条目220记载原蓝霸学员入选史莱克战队替补，27/108记载学院已更名；35级三环沿用游戏配置，非开局当日原文数值。',
        '替补是早年参赛经历，当前驻留学院为游戏配置；武魂、技能及物品沿用现有数据。']),
    ].map(([id,name,locationId,faction,periodLabel,sourceEntryIds,levelBasis,mechanicalInference])=>[id,Object.freeze({
      ...CHARACTER_CATALOG[id],name,locationId,faction,periodLabel,
      worldEra:Object.freeze({epoch:'1650-06-01',sourceEntryIds,levelBasis,mechanicalInference})
    })])),
    'slaughter-king':Object.freeze({...catalogRecord({...rawEntries.find(raw=>raw.id==='tang-chen'),
      id:'slaughter-king',name:'杀戮之王',periodLabel:'血红九头蝙蝠寄生时期',locationId:'loc-slaughter-entrance',faction:'杀戮之都',
      skills:['杀戮领域'],bones:[],equipment:[],
    }),worldPersona:Object.freeze({gender:'男'}),
      worldIdentityPresentation:Object.freeze({epoch:'1650-06-01',actualName:'唐晨',publicName:'杀戮之王',publicIdentity:'杀戮之都统治者',publicGender:'男',
        knowledgeScope:'唐晨是主持背景；本人受寄生控制、丧失本我及昊天宗与波塞西相关记忆。这不证明本人自知或在场人物已经识破，也不是本轮恢复神智的回执。'}),
      worldCombatRestrictions:Object.freeze({soulSkillsLocked:true,reason:'血红九头蝙蝠寄生期间无法使用魂环魂技或武魂基础动作'}),
      worldEra:Object.freeze({epoch:'1650-06-01',sourceEntryIds:[27,28,119,363],
        levelBasis:'沿用唐晨99级与昊天锤本体作为游戏基线；条目363记载开局处于寄生控制、无法使用魂技的杀戮之王时期，不能视为清醒的昊天宗主。',
        mechanicalInference:'保留本体魂环及属性，固有封技同时约束主动与被动魂技，实际战斗使用身体普通攻击。血红九头蝙蝠是寄生者，不生成第二武魂。未登记魂骨装备不代表原著没有；杀戮领域虽有来源记载，尚无此人物可执行的领域能力，不据此自动施加全场禁魔。神智恢复与修罗魔剑未提前实现，逐环来源、年限和具体参数按共同规则补全。'})}),
    'xue-qinghe':Object.freeze({...catalogRecord({...rawEntries.find(raw=>raw.id==='xue-qinghe'),
      level:69,soul:'六翼天使',archetype:'light',skills:['天使突击','天使圣剑'],bones:[],equipment:['太子礼服'],
    }),worldPersona:Object.freeze({gender:'女',appearance:'以雪清河的太子身份示人，日常采用男性仪容与礼服'}),
      worldDisguise:Object.freeze({actualName:'千仞雪',actualAppearance:'金发金瞳，仪态冷静的年轻女性。',actualFigure:'/art/disguise-figures-v1/qian-renxue.webp',source:{name:'拟态头骨',slot:'头骨',years:60000},skillName:'魂骨技·拟态伪装',params:{伪装方式:'高级拟态',强度:3,掩饰声音:true,掩饰魂息:true,武魂伪装:true,识破难度加值:0,持续方式:'来源有效',来源依赖:'道具有效',伪装模板:{公开名:'雪清河',公开性别:'男',公开身份:'天斗太子',外貌:'温和谦逊的青年太子，身着天斗皇室礼服。',声音:'温和克制的男性声线。',武魂表象:'天鹅',魂环表象:'五枚魂环，魂息经伪装遮掩；具体年限尚未辨明。',立绘:'/art/disguise-figures-v1/xue-qinghe.webp'}}}),
      worldIdentityPresentation:Object.freeze({epoch:'1650-06-01',actualName:'千仞雪',publicName:'雪清河',publicIdentity:'天斗太子',publicGender:'男',
        knowledgeScope:'主持档案与本人自知；这份开局背景不证明玩家或其他人物已经识破身份，也不是本轮公开、变身或能力展示的回执。'}),
      worldEra:Object.freeze({epoch:'1650-06-01',sourceEntryIds:[28,228,329,340],
        levelBasis:'条目340记载潜伏身份与六十级以上真实实力，条目228记载宫变时七环；开局采用69级六环游戏补全，不是来源的当日精确等级。',
        mechanicalInference:'雪清河为千仞雪的潜伏身份，真实武魂采用六翼天使。天鹅为对外伪装表象，不是第二武魂；拟态头骨、60000年与参数为游戏补全，经正式融合及通用伪装能力初始化。开局天斗城驻留、逐环效果与装备按游戏配置，未登记完整天使魂骨套装或圣剑实物。条目340的宫变年份与28冲突，本版以28的1650-10-27为背景节点；没有自动触发宫变或身份揭露。'})}),
    ...Object.fromEntries([
      ['dugu-yan','独孤雁','皇斗战队参赛后',[27,339],
        '条目339记载早年38级、参赛时43级；本游戏开局采用43级四环基线，非1650年当天精确等级。',
        '339将大赛写在1647年，与总年表27的1645年冲突；两者均早于开局，事件日期采用27。逐环来源与技能效果由共同规则补全，后期60级以上战役档案未带入。驻留天斗城沿用游戏配置。',
        {level:43}],
      ['tang-hao-village','唐昊','归还宗门魂骨前',[27,208,225,336],
        '条目27将自断右臂左腿、归还宗门魂骨置于1650-06-15；开局尚未发生。本游戏沿用95级，不宣称是开局当日精确记载。',
        '阿银献祭所留蓝银皇右腿骨不登记为唐昊已融合魂骨；六块高年限魂骨沿用游戏补全，具体年限与效果不冒充原文。圣魂村驻留是游戏地点配置，不代表逐日行踪。',
        {bones:['六块高年限魂骨']}],
      ['tai-long-clan','泰隆','力之一族修习',[28,134],
        '来源记载力之一族出身、大力猩猩武魂及早年史莱克替补经历，未给开局当日等级；本游戏选用45级四环宗族档案。',
        '按条目134的力之一族族地驻留天斗城；28中的龙兴城聚会尚未发生。魂环与技能沿用游戏配置，早年替补经历不表示大赛仍在进行，唐门开局前已成立，相关职务按实际参与关系登记。',
        {locationId:'loc-heaven-dou-city',faction:'力之一族'}],
      ['yu-tianxin-sect','玉天心','宗门修习',[114],
        '来源记载蓝电霸王龙武魂及早年雷霆学院队长经历；本游戏沿用43级四环宗门档案，非开局当日等级记载。',
        '天斗城驻留、魂环与技能沿用游戏配置；早年学院参赛经历不表示开局正在举行同一届比赛。',{}],
      ['hu-liena-slaughter','胡列娜','通过地狱路后',[27,28,331],
        '条目27记载1649-07-01通过地狱路获得杀神领域；本游戏沿用59级五环，不宣称是1650-06-01精确记载。',
        '开局驻留武魂城为游戏配置，已不处于地狱杀戮场百胜历练。武魂、魂环、魂技与装备沿用所选机械档案，领域是否能执行以能力数据为准。',
        {locationId:'loc-spirit-city',faction:'武魂殿'}],
      ['bibi-dong-pope','比比东','教皇时期',[208,328],
        '来源记载比比东接任教皇与双生蜘蛛武魂；本游戏沿用98级教皇档案，非开局当日精确等级证明。',
        '武魂城驻留、逐环技能、魂骨和装备参数沿用游戏配置；不提前采用嘉陵关巅峰档案或神位能力。',{}],
    ].map(([id,name,periodLabel,sourceEntryIds,levelBasis,mechanicalInference,overrides])=>[id,Object.freeze({
      ...catalogRecord({...rawEntries.find(raw=>raw.id===id),name,periodLabel,...overrides}),
      worldEra:Object.freeze({epoch:'1650-06-01',sourceEntryIds,levelBasis,mechanicalInference})
    })])),
    'xiao-chenyu':Object.freeze({...CHARACTER_CATALOG['xiao-chenyu'],periodLabel:'诺丁学院旧学员',
      worldEra:Object.freeze({epoch:'1650-06-01',sourceEntryIds:[26,118,211],
        levelBasis:'条目211记载唐三童年时期萧尘宇为11级狼武魂魂师；本游戏沿用11级一环开局，没有来源证明这是1650年的精确实力，不推定自动成长。',
        mechanicalInference:'六年级学员及城主之子是来源中的早年背景，不证明当前仍是六年级学生、仍称全校老大或拥有城主职权。白色十年魂环指来源的年限类别，不等于精确10年；游戏沿用80年第一环，具体魂兽来源与魂技效果仍为规则补全。诺丁城驻留为游戏配置，当前精确年龄、外貌及日常行程未给出；不补造课表或新关系。'})}),
    ...Object.fromEntries([
      ['su-yuntao','武魂觉醒主持经历',[209],26,'条目209记载素云涛曾为唐三等孩子主持觉醒，并展示独狼武魂；未提供1650年的等级和逐日职务。','过去主持圣魂村觉醒不表示每天正在举行仪式，也不赋予当前未实现的觉醒服务或替玩家直接开卡。'],
      ['ma-xiunuo','诺丁魂师登记经历',[211],29,'条目211记载马修诺曾主持唐三魂师登记；其中十一级是唐三的测试结果，不是马修诺的等级。未提供1650年马修诺的精确等级或现职。','登记经历不证明当前正在办理登记，也不自动开通补贴、招募或其他未实现服务。光杖武魂是既有游戏机械补全，不称作该条目的原著记载。']
    ].map(([id,periodLabel,sourceEntryIds,level,source,limits])=>[id,Object.freeze({...CHARACTER_CATALOG[id],periodLabel,
      worldEra:Object.freeze({epoch:'1650-06-01',sourceEntryIds,
        levelBasis:`${source}本游戏沿用既有${level}级配置，不宣称是来源记载的当前实力。`,
        mechanicalInference:`${limits}诺丁城驻留、逐环来源年限、技能效果和财产沿用游戏配置，不把推定数值当作原著事实。当前精确年龄、性别、外貌未由本次所读条目提供，保持未知，不因时代变化自动补发能力或财物。`})})])),
    'wang-sheng':Object.freeze({...CHARACTER_CATALOG['wang-sheng'],periodLabel:'诺丁学院工读生出身',
      worldEra:Object.freeze({epoch:'1650-06-01',sourceEntryIds:[118,209],
        levelBasis:'条目118/209只记载唐三童年时期王圣的工读生经历与战虎武魂，未给出1650年开局等级。本游戏沿用既有9级无魂环配置，不宣称这是来源记载的成年时代实力。',
        mechanicalInference:'诺丁学院工读生及七舍原老大是早年经历，不证明当前仍在读、仍有课程或仍任宿舍老大。开局在诺丁城可相遇是游戏驻留配置，不是来源记载的当日行踪。精确年龄、性别和外貌未由本次所读条目提供，档案保持未知，不根据唐三童年片段补写当前少年年龄、身高或课表。基础战斗效果和财产沿用游戏规则，不自动成长或补发魂环。'})}),
    'xiao-wu-tournament':Object.freeze({...catalogRecord({...rawEntries.find(raw=>raw.id==='xiao-wu-tournament'),
      name:'小舞',periodLabel:'星斗森林修习',locationId:'loc-star-lake',faction:'星斗大森林',level:59,
      skills:['腰弓','魅惑','瞬移','无敌金身','柔骨锁'],bones:[],equipment:[],storyRingYears:[[420,820,1900,5000,12500]],
      storyRingSources:{柔骨兔:Object.fromEntries([1,2,3,4,5].map(ordinal=>[ordinal,{
        物种ID:'story-xiao-wu-origin',名称:'柔骨兔本源',类别标签:['兽类','十万年魂兽化形'],种族特征:['兔','柔韧','敏捷','本源自凝'],解剖标签:['柔骨兔本源']
      }]))},
      storyRingOrigins:{柔骨兔:Object.fromEntries([1,2,3,4,5].map(ordinal=>[ordinal,{
        kind:'本源自凝',note:'条目49记载化形重修魂兽自行凝聚魂环，214明确小舞第三环为自凝；本游戏前五环采用本源自凝，不是猎杀其他魂兽。精确年限与效果参数属于游戏补全。'
      }]))},
    }),worldEra:Object.freeze({epoch:'1650-06-01',sourceEntryIds:[27,49,214,219,223,226,322],
      levelBasis:'27/223记载小舞已返回星斗大森林核心区域，开局尚未献祭；本游戏补全为59级五环，并非来源卡记载的6月1日精确等级。',
      mechanicalInference:'前五项技能名称沿用目录，精确年限、属性和效果按共同规则补全；本源自凝登记不绕过预算与承载限制，也不生成现场猎物或掉落。生命之湖驻留为游戏地点配置。来源49与223对成熟期阈值表述不同，本版不据此新增成熟期能力。未登记相思断肠红等随身物不代表原著没有，气息隐藏尚无专门机制；魂兽本源是背景，不代表任意NPC已经知道。献祭/复活及其后的魂骨、封号称谓不提前带入。'})}),
    'oscar-tournament':Object.freeze({...catalogRecord({...rawEntries.find(raw=>raw.id==='oscar-tournament'),
      name:'奥斯卡',periodLabel:'北境历练',locationId:'loc-frozen-forest',faction:'史莱克学院',level:59,
      skills:['恢复大香肠','解毒小腊肠','急速飞行蘑菇肠','亢奋粉红肠','超越极限墨绿肠'],bones:[],equipment:[],
    }),worldEra:Object.freeze({epoch:'1650-06-01',sourceEntryIds:[27,226,326],
      levelBasis:'条目27将镜影兽魂环魂骨的获得置于1650年6月20日，开局尚未发生；本游戏补全为59级五环，不是来源卡明确记载的6月1日精确等级。',
      mechanicalInference:'五项食物魂技沿用既有目录，逐环来源、年限、属性与效果参数按共同规则补全。冰封森林开局驻留、地图坐标、天斗出发的路线时长/费用/门槛属于游戏配置，不代表逐日行踪与官方地理。未获得复制镜像肠或镜影头部魂骨，不提前拥有后期食神称谓、唐门职务和神级能力；其他未登记物品不代表原著没有。'})}),
    ...Object.fromEntries([
      ['dai-mubai-tournament','戴沐白','白虎','loc-star-luo-city','星罗帝国',323,'白虎护身障|白虎烈光波|白虎金刚变|白虎流星雨|白虎魔神变'],
      ['zhu-zhuqing-tournament','朱竹清','幽冥灵猫','loc-star-luo-city','星罗帝国',324,'幽冥突刺|幽冥百爪|幽冥斩|幽冥影分身|幽冥影相连'],
      ['ma-hongjun-tournament','马红俊','火凤凰','loc-lanba-academy','史莱克学院',327,'凤凰火线|浴火凤凰|凤翼天翔|凤凰啸天击|凤凰流星雨']
    ].map(([id,name,soul,locationId,faction,sourceEntryId,skills])=>[id,Object.freeze({...catalogRecord({...rawEntries.find(raw=>raw.id===id),
      name,soul,locationId,faction,level:59,periodLabel:'五年之约前修习',skills:skills.split('|'),bones:[],equipment:[],
    }),worldEra:Object.freeze({epoch:'1650-06-01',sourceEntryIds:[27,219,225,sourceEntryId],
      levelBasis:'条目225概述五年之约重聚时众人接近六十级，未给出逐人开局精确等级；本游戏统一补全为59级五环，不是原著实力排序或当日数值证明。',
      mechanicalInference:`武魂依据来源卡；五项魂技名称沿用既有目录，逐环来源、年限、属性和效果参数按共同规则补全。开局地点属于游戏驻留配置，不代表原文逐日行踪；未登记魂骨/装备不代表原著没有。${id==='ma-hongjun-tournament'?'27/219记载仙草提纯为火凤凰并消除邪火副作用，不使用后期多首凤凰，也不赋予第六魂技。':'幽冥白虎融合技尚未接入可执行能力，不得在小说中直接结算其效果。'}不提前获得武魂真身或封号称谓。`})})])),
    'ning-rongrong-tournament':Object.freeze({...catalogRecord({...rawEntries.find(raw=>raw.id==='ning-rongrong-tournament'),
      name:'宁荣荣',periodLabel:'五年之约前宗门修习',locationId:'loc-seven-treasure-sect',faction:'七宝琉璃宗',level:59,
      soul:'九宝琉璃塔',skills:['力量增幅','速度增幅','魂力增幅','防御增幅','攻击增幅'],bones:[],equipment:[],
    }),worldEra:Object.freeze({epoch:'1650-06-01',sourceEntryIds:[27,219,225,325],
      levelBasis:'条目225记载五年之约重聚时众人接近六十级，没有开局当天精确等级；本游戏补全为59级五环，并非来源卡明确记载的当日数值。',
      mechanicalInference:'九宝琉璃塔进化来自27/219；五项增幅沿用既有人物技能目录，逐环来源、年限、属性及效果参数按共同规则补全。开局驻留七宝琉璃宗属于游戏地点配置，不是逐日行踪记载。当前未登记魂骨或随身装备，不代表原著中没有；不提前获得封号称谓、武魂真身或后期神光能力。'})}),
    ...Object.fromEntries([
      ['flender',78,[27,109,334]],
      ['zhao-wuji',76,[27,109,212,214]],
      ['li-yusong',63,[26,27,109,212]],
      ['lu-qibin',66,[27,109]],
      ['shao-xin',71,[27,109]]
    ].map(([id,level,sourceEntryIds])=>[id,Object.freeze({...CHARACTER_CATALOG[id],periodLabel:'史莱克学院任教',locationId:'loc-lanba-academy',
      worldEra:Object.freeze({epoch:'1650-06-01',sourceEntryIds,
        levelBasis:`本游戏开局沿用来源卡明确记载的${level}级；来源未提供开局当天的独立等级记录，不推定期间自动成长。`,
        mechanicalInference:'武魂与已记载魂技名称沿用来源；未记载的逐环来源、精确年限、属性和效果参数按共同规则补全。地点采用迁校后的学院配置，不代表原文逐日行踪；未实现能力不能写成已执行。'+(['li-yusong','lu-qibin','shao-xin'].includes(id)?'条目109只提供教职员身份、等级、武魂与系别，未给出逐项魂技或当前授课、招生安排；游戏生成的技能、装备、财产及日常行程不能冒充来源原文。早期入学考核背景不表示当前正在考核，也不自动开放招生或授课服务。':'')})})])),
    'yu-xiaogang-notting':Object.freeze({...catalogRecord({...rawEntries.find(raw=>raw.id==='yu-xiaogang-notting'),storyAfterBreakthrough:true,
      name:'玉小刚',periodLabel:'突破后学院任教',locationId:'loc-lanba-academy',level:31,
    }),martialSouls:Object.freeze([Object.freeze({...CHARACTER_CATALOG['yu-xiaogang-notting'].martialSouls[0],form:YU_XIAOGANG_CANON_PROFILE.martialSoulDraft.form})]),
      worldEra:Object.freeze({epoch:'1650-06-01',sourceEntryIds:[27,109,210,219,332],
      levelBasis:'条目219记载服用九品紫芝后突破三十级瓶颈，与109的旧29级简介冲突；本游戏补全为31级三环开局，并非来源卡记载的开局当天精确等级。',
      mechanicalInference:'保留罗三炮与前两项已知技能；第三魂环、第三魂技名称和效果、所有未记载的年限与来源均按共同规则补全，不宣称是原著记载。黄金圣龙融合技未接入可执行能力；地点采用迁校后的学院。'})}),
    'tang-san-slaughter':Object.freeze({...catalogRecord({...rawEntries.find(raw=>raw.id==='tang-san-slaughter'),
      name:'唐三',periodLabel:'月轩修习',locationId:'loc-moon-pavilion',faction:'史莱克学院',level:59,soul:'蓝银皇&昊天锤',archetype:'control',
      skills:['缠绕','寄生','蛛网束缚','蓝银囚笼','蓝银霸皇枪','蓝银领域','杀神领域','乱披风锤法'],
      bones:['精神凝聚之智慧头骨','八蛛矛'],equipment:['二十四桥明月夜','诸葛神弩'],
      storyRingYears:[[400,820,2000,10000,12500],[]],
      storyRingSources:{蓝银皇:{
        1:{物种ID:'story-datura-snake',名称:'曼陀罗蛇',类别标签:['蛇类'],种族特征:['坚韧','毒液','缠绕'],解剖标签:['毒牙']},
        3:{物种ID:'story-human-face-spider',名称:'人面魔蛛',类别标签:['蛛类'],种族特征:['蛛网','剧毒','隐蔽'],解剖标签:['蛛足','蛛丝']},
        4:{物种ID:'story-pit-demon-spider',名称:'地穴魔蛛',类别标签:['蛛类'],种族特征:['蛛网','地穴','控制'],解剖标签:['蛛足','蛛丝']},
        5:{物种ID:'story-blue-silver-lineage',名称:'蓝银皇血脉与蓝银草能量',类别标签:['植物'],种族特征:['藤蔓','植物','生命','本源凝聚'],解剖标签:['蓝银皇本源']}
      }},
      storyRingOrigins:{蓝银皇:{
        1:{kind:'魂兽猎杀',note:'条目210记载约四百年曼陀罗蛇；本游戏登记400年。'},
        3:{kind:'魂兽猎杀',note:'条目214记载两千年人面魔蛛第三环；效果参数使用共同规则。'},
        4:{kind:'魂兽猎杀',note:'条目220记载万年地穴魔蛛第四环；本游戏登记10000年。'},
        5:{kind:'血脉凝聚',note:'蓝银皇血脉与蓝银草能量凝聚的第五环，不是猎杀魂兽所得；万年档来自条目223，12500年为本游戏机械配置。'}
      }}
    }),worldPersona:Object.freeze({age:19,gender:'男',appearance:'蓝色长发与蓝色眼眸，月轩修习期间气质逐渐温雅内敛'}),worldEra:Object.freeze({epoch:'1650-06-01',sourceEntryIds:[26,27,210,214,220,223,224,225,321],levelBasis:'冻结离开杀戮之都时最后明确的59级',mechanicalInference:'第二环来源与年限、第一/四/五环精确年限、属性、效果参数与装备数值按共同规则补全；领域和锤法不作为魂环技能落地'})})
  });
  // Explicit reviewed exclusions at the fixed story epoch. Combat samples remain in the catalog.
  const WORLD_CHARACTER_EXCLUSIONS = Object.freeze({
    'huo-yuhao-triple':Object.freeze({epoch:'1650-06-01',sourceEntryId:29,reason:'霍雨浩属于后续时代，不在当前故事时代中。'}),
    'shi-nian':Object.freeze({epoch:'1650-06-01',sourceEntryId:27,reason:'时年在本故事开局之前已经死亡，不能作为在世人物相遇。'}),
    'qian-xunji':Object.freeze({epoch:'1650-06-01',sourceEntryId:208,reason:'千寻疾在本故事开局之前已经死亡，不能作为在世人物相遇。'}),
    'ah-yin-blue-silver-emperor':Object.freeze({epoch:'1650-06-01',sourceEntryId:208,reason:'阿银已献祭并退化为蓝银皇种子；完整十万年魂兽战斗档案不属于当前开局时代。'})
  });
  const WORLD_FUTURE_PROFILES=Object.freeze(Object.fromEntries([
    ['tang-san-title','封号斗罗与海神三叉戟时期','1655-03-08'],
    ['xiao-wu-title','献祭后复活时期','1655-03-10'],
    ['dai-mubai-title','战争末期封号斗罗时期','1655-05'],
    ['oscar-title','战争末期食神斗罗时期','1655-05'],
    ['ning-rongrong-sect','战争末期九宝斗罗时期','1655-05-19'],
    ['ma-hongjun-title','战争末期凤凰斗罗时期','1655-05'],
    ['zhu-zhuqing-title','战争末期幽冥斗罗时期','1655-05'],
    ['tang-hao-final','恢复残肢后重归巅峰时期','1655-04-01'],
    ['dugu-bo-final','战争末期','1655-05'],
    ['ah-yin-human','恢复人形时期','1655-03-25'],
    ['ji-xiang','拜师唐三后获得唐门功法时期','1651-01-23']
  ].map(([id,phase,sourceDate])=>[id,Object.freeze({epoch:'1650-06-01',sourceEntryId:28,sourceDate,phase,
    reason:`此档案属于开局时代之后的${phase}，不能作为当前世界人物生成。`})])));
  const WORLD_STORY_SELECTIONS=Object.freeze({'tang-san':'tang-san-slaughter','yu-xiaogang':'yu-xiaogang-notting','ning-rongrong':'ning-rongrong-tournament',
    'dai-mubai':'dai-mubai-tournament','zhu-zhuqing':'zhu-zhuqing-tournament','ma-hongjun':'ma-hongjun-tournament','oscar':'oscar-tournament','xiao-wu':'xiao-wu-tournament',
    'tang-hao':'tang-hao-village','tai-long':'tai-long-clan','yu-tianxin':'yu-tianxin-sect','hu-liena':'hu-liena-slaughter','bibi-dong':'bibi-dong-pope','qian-renxue':'xue-qinghe','tang-chen':'slaughter-king'});
  function worldCharacterUnavailableReason(characterId,context,purpose='world') {
    const source=canonicalGrowth.sourceReason(CHARACTER_CATALOG[characterId],context,purpose);if(source)return source;
    const exclusion=WORLD_CHARACTER_EXCLUSIONS[characterId]??WORLD_FUTURE_PROFILES[characterId];if(exclusion)return exclusion.reason;
    const selected=WORLD_STORY_SELECTIONS[worldCharacterIdentityId(characterId)];
    return selected&&selected!==characterId?`当前时代使用此人物的${WORLD_STORY_PROFILES[selected]?.periodLabel??'当代'}档案，不能另建其他时期的人物。`:'';
  }
  // Reviewed placement at the fixed story epoch, not a rewrite of historical combat samples.
  // Reborn entries 27 (1644-03-07 relocation) and 109 (faculty list).
  const WORLD_CHARACTER_PLACEMENTS = Object.freeze(Object.fromEntries(
    ['flender','zhao-wuji','li-yusong','lu-qibin','shao-xin'].map(id=>[id,Object.freeze({
      locationId:'loc-lanba-academy',epoch:'1650-06-01',sourceEntryIds:Object.freeze([27,109]),
      scope:'location-only',mechanicsEraStatus:WORLD_STORY_PROFILES[id]?.worldEra?'explicit-game-baseline':'pending-review'
    })])
  ));
  function worldCharacterRecord(characterId,context,purpose='world') {
    const record=WORLD_STORY_PROFILES[characterId]??CHARACTER_CATALOG[characterId],placement=WORLD_CHARACTER_PLACEMENTS[characterId];
    if(!record)return record;
    const reason=worldCharacterUnavailableReason(characterId,context,purpose);
    const exclusion=WORLD_CHARACTER_EXCLUSIONS[characterId]??WORLD_FUTURE_PROFILES[characterId]??(reason?{epoch:'1650-06-01',reason}:null);
    return placement||exclusion?Object.freeze({...record,...(placement?{locationId:placement.locationId,worldPlacement:placement}:{}),...(exclusion?{sparEligible:false,worldExclusion:exclusion}:{})}):record;
  }
  function worldCharacterRecords(context,purpose='world') { return Object.keys(CHARACTER_CATALOG).filter(id=>!worldCharacterUnavailableReason(id,context,purpose)).map(id=>worldCharacterRecord(id,context,purpose)); }
  // The opening escort is an authored placement. Once encountered, the saved
  // person's location is authoritative, including after leaving the forest.
  function worldCharacterLocation(state,characterId) {
    if(worldCharacterUnavailableReason(characterId,state)||persistentCharacterConflict(state,characterId))return null;
    const person=state.人物?.列表?.[persistentCharacterId(characterId)];
    if(person)return person.locationId;
    if(characterId==='yu-xiaogang-notting'&&state.世界?.opening?.guidance&&
      (state.远征?.配置?.firstHuntingEscort?.status??'unused')==='unused')return 'loc-hunting-forest';
    return worldCharacterRecord(characterId,state)?.locationId??null;
  }
  canonicalGrowth.registerCatalog(CHARACTER_CATALOG,women.PROFILES.filter(p=>p.reference).map(p=>catalogRecord(p.reference)));
  for(const record of Object.values(CHARACTER_CATALOG))if(record.mechanics.nativeOrigin)foundation.registerNativeOrigin(record.mechanics.nativeOrigin);

  const nativeAbilityCache=new Map();
  function nativeOriginAbilities(record,unitId,soul){
    const origin=record.mechanics.nativeOrigin;if(!origin)return [];
    const key=abilities.hash({origin,unitId,level:record.level,soul:soul.扩展.结构化武魂.definition});
    if(nativeAbilityCache.has(key))return clone(nativeAbilityCache.get(key));
    const skills=origin.skills.map((spec,index)=>{
      // Authored sources must fit the public parameter contract before allocation.
      for(const branch of spec.requestedBranches){
        const normalized=effects.makeBranchedGraph([{activation:branch.activation,nodes:branch.requestedEffects}]).nodes;
        branch.requestedEffects.forEach(([id,params],i)=>{for(const [name,value]of Object.entries(params))if(abilities.hash(normalized[i]?.params?.[name])!==abilities.hash(value))throw Error('本源能力参数超出规则：'+spec.name+'/'+id+'/'+name);});
      }
      const directed=effects.compileDirectedGraph({requestedBranches:spec.requestedBranches,costContract:spec,autoAllocate:spec.autoAllocate,ageTier:'百万年',mechanismCap:'规则',budget:spec.budget,provenance:{source:'native-origin',definitionId:origin.id}});
      const compiled=soul.扩展.结构化武魂;
      if(directed.graph.nodes.some(n=>!foundation.MARTIAL_SOUL_CORE.allowsEffect(compiled,n.effectId,n.params)))throw Error('本源能力缺少对应能力：'+spec.name);
      const valueBasis=effects.rawAbilityValue(directed.graph);
      return effects.sealPricedAbility({id:`native-${unitId}-${index+1}`,name:spec.name,名称:spec.name,description:spec.description,类型:'本源能力',持有者单位ID:unitId,来源武魂ID:soul.id,sourceMartialSoulId:soul.id,sourceKind:'native-origin',sourceNativeOriginId:origin.id,
        effectGraph:directed.graph,sourceChannelIds:[...new Set(directed.graph.nodes.flatMap(n=>foundation.MARTIAL_SOUL_CORE.channelsForEffect(soul,n.effectId,n.params)))],
        requirements:spec.requirements??[],cooldownTurns:spec.cooldownTurns??0,valueBasis,soulPowerCost:valueBasis.baseSoulPowerCost,soulPowerCostRate:0,outputScale:1,budget:{allocated:spec.budget,spent:directed.spent,unallocated:directed.unallocated}});
    });
    nativeAbilityCache.set(key,clone(skills));return skills;
  }
  function validateNativeOrigins(state){
    const errors=[];
    for(const unit of Object.values(state.战斗单位?.列表??{}))try{
      errors.push(...foundation.validateNativeOriginUnit(unit));
      const record=CHARACTER_CATALOG[unit.扩展?.角色库ID],d=foundation.nativeOriginDefinition(unit);
      if(!d){
        if(unit.扩展?.canonicalRepresentation==='native')errors.push('人物缺少本源体质');
        if(record?.mechanics.nativeOrigin&&state.成长?.列表?.[unit.id]?.武魂ID列表?.some(id=>state.武魂?.列表?.[id]?.扩展?.canonicalGrowth?.mode==='canonical'))errors.push('完整时期人物缺少本源体质');
        if((unit.能力?.技能ID??[]).some(id=>state.技能?.列表?.[id]?.sourceKind==='native-origin'))errors.push('本源能力缺少真实来源');
        continue;
      }
      if(!record?.mechanics.nativeOrigin||unit.扩展.canonicalRepresentation!=='native'||state.人物?.列表?.[unit.id]?.扩展?.角色库ID!==record.id)throw Error('人物不能取得此本源体质');
      const soul=state.武魂?.列表?.[state.成长?.列表?.[unit.id]?.武魂ID列表?.[0]];
      if(soul?.扩展?.canonicalGrowth?.mode!=='canonical')throw Error('成年人物的武魂来源不符');
      const rings=(soul.魂环ID列表??[]).map(id=>state.魂环?.列表?.[id]),specs=record.mechanics.ringLoadouts[0].rings,level=state.成长.列表[unit.id].魂力等级;
      if(rings.length>Math.min(9,Math.floor(level/10))||rings.some((r,i)=>!r||r.年限!==specs[i].years||r.序号!==i+1||r.持有者单位ID!==unit.id||r.武魂ID!==soul.id||r.颜色!==registeredRingColor(state,r)||r.扩展?.sourceOrigin!==specs[i].sourceOrigin||abilities.hash(r.魂技ID列表.map(id=>state.技能?.列表?.[id]?.name))!==abilities.hash(specs[i].skills.map(s=>s.name))))throw Error('人物的自凝魂环与魂技不符');
      const staged=canonicalGrowth.stageRecord(record,level),expected=nativeOriginAbilities(staged,unit.id,soul),actual=(unit.能力?.技能ID??[]).map(id=>state.技能?.列表?.[id]).filter(s=>s?.sourceKind==='native-origin');
      if(expected.length!==actual.length||expected.some(s=>abilities.fingerprint(s)!==abilities.fingerprint(state.技能?.列表?.[s.id]??{})))throw Error('本源能力与人物来源不符');
    }catch(e){errors.push(e.message);}
    for(const skill of Object.values(state.技能?.列表??{}))if(skill.sourceKind==='native-origin'&&!state.战斗单位?.列表?.[skill.持有者单位ID]?.能力?.技能ID?.includes(skill.id))errors.push('本源能力没有实际持有人');
    return errors;
  }
  function assertNativeOriginSkill(state,unit,skill){
    const d=foundation.nativeOriginDefinition(unit),record=CHARACTER_CATALOG[unit.扩展?.角色库ID];
    const soul=state.武魂?.列表?.[skill.sourceMartialSoulId??skill.来源武魂ID];
    if(!d||!record||!soul||soul.持有者单位ID!==unit.id||!unit.能力?.技能ID?.includes(skill.id)||unit.扩展.canonicalRepresentation!=='native')throw Error('本源能力没有属于施术者的来源');
    const expected=nativeOriginAbilities(canonicalGrowth.stageRecord(record,state.成长.列表[unit.id].魂力等级),unit.id,soul).find(s=>s.id===skill.id);
    if(!expected||abilities.fingerprint(expected)!==abilities.fingerprint(skill))throw Error('本源能力与实际来源不符');
  }
  function selfCondensationSpec(state,unitId,soul,ordinal){
    const unit=state.战斗单位?.列表?.[unitId],origin=foundation.nativeOriginDefinition(unit),record=origin&&CHARACTER_CATALOG[origin.recordId];
    if(!record?.mechanics.selfCondensation||soul?.持有者单位ID!==unitId||state.人物?.列表?.[unitId]?.扩展?.角色库ID!==record.id)throw Error('此人物没有自主凝环的本源');
    const slot=state.成长.列表[unitId].武魂ID列表.indexOf(soul.id),spec=record.mechanics.ringLoadouts[slot]?.rings[ordinal-1];
    if(!spec||ordinal>Math.floor(state.成长.列表[unitId].魂力等级/10))throw Error('尚未达到下一枚魂环的凝聚境界');
    return clone(spec);
  }
  function registeredRingColor(state,ring){
    const unit=state.战斗单位?.列表?.[ring.持有者单位ID],origin=unit&&foundation.nativeOriginDefinition(unit),record=origin&&CHARACTER_CATALOG[origin.recordId];
    if(record?.mechanics.selfCondensation){const slot=state.成长.列表[unit.id].武魂ID列表.indexOf(ring.武魂ID),spec=record.mechanics.ringLoadouts[slot]?.rings[ring.序号-1];if(spec&&ring.年限===spec.years&&ring.扩展?.sourceOrigin===spec.sourceOrigin)return spec.color??foundation.getAgeTier(ring.年限).颜色;}
    return foundation.getAgeTier(ring.年限).颜色;
  }
  const LOCATION_INDEX = Object.freeze(rawEntries.reduce((index, raw) => {
    (index[raw.locationId] ??= []).push(raw.id);
    return index;
  }, {}));

  function normalizeState(rawState) {
    // The world normalizer already returns an independent, normalized draft.
    const state = world.normalizeState(rawState);
    state.切磋 = state.切磋 && typeof state.切磋 === 'object' ? state.切磋 : {};
    state.切磋.当前 ??= null;
    state.切磋.历史 = Array.isArray(state.切磋.历史) ? state.切磋.历史.slice(-30) : [];
    state.比赛 = state.比赛 && typeof state.比赛 === 'object' ? state.比赛 : {};
    state.比赛.当前 ??= null;
    state.比赛.历史 = Array.isArray(state.比赛.历史) ? state.比赛.历史.slice(-30) : [];
    state.比赛.processedTransactions = state.比赛.processedTransactions && typeof state.比赛.processedTransactions === 'object' ? state.比赛.processedTransactions : {};
    state.比赛.奖励进度 = state.比赛.奖励进度 && typeof state.比赛.奖励进度 === 'object' ? state.比赛.奖励进度 : {};
    state.杀戮场 = state.杀戮场 && typeof state.杀戮场 === 'object' ? state.杀戮场 : {};
    state.杀戮场.当前 ??= null;
    state.杀戮场.历史 = Array.isArray(state.杀戮场.历史) ? state.杀戮场.历史.slice(-30) : [];
    state.杀戮场.processedTransactions = state.杀戮场.processedTransactions && typeof state.杀戮场.processedTransactions === 'object' ? state.杀戮场.processedTransactions : {};
    state.终局挑战 = state.终局挑战 && typeof state.终局挑战 === 'object' ? state.终局挑战 : {};
    state.终局挑战.当前 ??= null;
    state.终局挑战.历史 = Array.isArray(state.终局挑战.历史) ? state.终局挑战.历史.slice(-30) : [];
    state.终局挑战.成就 = state.终局挑战.成就 && typeof state.终局挑战.成就 === 'object' && !Array.isArray(state.终局挑战.成就) ? state.终局挑战.成就 : {};
    for (const record of state.终局挑战.历史) {
      if (!record.won || !ENDGAME_IDS.includes(record.characterId) || state.终局挑战.成就[record.characterId]) continue;
      state.终局挑战.成就[record.characterId] = {characterId:record.characterId,firstVictoryId:record.id,bestRound:record.round ?? 0};
    }
    return state;
  }

  function captureArenaRecovery(state,ids,generated={}) {
    ids=[...new Set([...ids,...(globalThis.SoulCombatDeployments?.participants(state,ids)??[]).filter(r=>r.mode==='body').map(r=>r.unitId)])];
    return {units:Object.fromEntries(ids.map(id=>{const u=state.战斗单位.列表[id];return [id,{
      hp:u.资源.生命.当前,sp:u.资源.魂力.当前,position:clone(u.位置),activeSoulId:state.成长.列表[id]?.激活武魂ID??'',venue:clone(u.扩展?.赛事场地??null)
    }]})),generated:clone(generated)};
  }
  function recoverArena(state,recovery,battleId) {
    const battle=state.战斗.id===battleId?state.战斗:state.世界.backgroundBattles[battleId];
    if(!battle||battle.状态!=='已结束')throw Error('竞技恢复场次不匹配');
    combat.cleanupTrainingBattle(state,battleId);
    for(const [id,before] of Object.entries(recovery.units)){
      if(recovery.generated.unitIds?.includes(id)||combat.occupiedBattle(state,id,battleId))continue;
      let unit=state.战斗单位.列表[id];if(!unit)throw Error('竞技参战者缺失');
      if(state.人物.列表[id]?.life?.death||unit.存活状态==='死亡')continue;
      const growth=state.成长.列表[id];
      if(growth&&before.activeSoulId&&growth.武魂ID列表.includes(before.activeSoulId))growth.激活武魂ID=before.activeSoulId;
      unit.存活状态='存活';
      if(growth)unit=foundation.refreshActiveMartialSoul(state,id);
      const worldPaid=battle.扩展.externalWorldPayments?.[id]??{};
      unit.资源.生命.当前=Math.max(0,Math.min(before.hp-Number(worldPaid.health??0),unit.资源.生命.最大));
      unit.资源.魂力.当前=Math.max(0,Math.min(before.sp-Number(worldPaid.soulPower??0),unit.资源.魂力.最大));
      if(unit.资源.生命.当前===0)unit.存活状态='昏迷';
      foundation.clearTemporaryHealth(unit);unit.位置=clone(before.position);
      if(before.venue===null)delete unit.扩展.赛事场地;else unit.扩展.赛事场地=clone(before.venue);
    }
    for(const id of recovery.generated.unitIds??[])if(combat.occupiedBattle(state,id,battleId))throw Error('临时参战者尚被另一场占用');
    removeGenerated(state,recovery.generated);
    if(state.战斗.id===battleId)state.战斗=foundation.makeDefaultState().战斗;globalThis.SoulCombatDeployments?.reconcile(state);
  }

  function archetypeFor(record) {
    return ARCHETYPES[record.archetype] ?? ARCHETYPES.power;
  }

  function makeSoulBeastAttributes(record) {
    const archetype = archetypeFor(record);
    const base = Math.min(28, 9 + Math.floor(record.level / 6));
    const values = Object.fromEntries(ATTRIBUTE_KEYS.map(key => [key,base]));
    values[archetype.dominant] = Math.min(36,base + 5);
    if (record.archetype === 'agility' || record.archetype === 'dark') values.身法 = Math.min(38,base + 7);
    if (record.archetype === 'defense' || record.kind === 'soul-beast') values.体魄 = Math.min(40,base + 7);
    if (record.archetype === 'mental') { values.意志 = Math.min(38,base + 7); values.感知 = Math.min(36,base + 5); }
    return values;
  }

  function initialAttributes(record) {
    if(record.id===liProfile.ID)return clone(liProfile.initialAttributes);
    if (record.id === 'yu-xiaogang-notting') return clone(YU_XIAOGANG_CANON_PROFILE.attributes);
    const rows = {
      power:{力量:13,身法:9,体魄:12,悟性:8,感知:9,意志:10},weapon:{力量:12,身法:11,体魄:10,悟性:10,感知:11,意志:10},
      agility:{力量:10,身法:14,体魄:9,悟性:9,感知:12,意志:9},control:{力量:8,身法:10,体魄:9,悟性:13,感知:12,意志:11},
      support:{力量:8,身法:9,体魄:10,悟性:14,感知:11,意志:12},heal:{力量:8,身法:9,体魄:11,悟性:14,感知:12,意志:12},
      fire:{力量:13,身法:10,体魄:11,悟性:10,感知:9,意志:11},ice:{力量:9,身法:10,体魄:11,悟性:13,感知:12,意志:11},
      lightning:{力量:13,身法:11,体魄:11,悟性:10,感知:10,意志:11},poison:{力量:9,身法:11,体魄:10,悟性:13,感知:11,意志:12},
      mental:{力量:8,身法:9,体魄:9,悟性:13,感知:14,意志:14},defense:{力量:11,身法:8,体魄:14,悟性:9,感知:10,意志:12},
      dark:{力量:10,身法:14,体魄:9,悟性:10,感知:12,意志:11},light:{力量:11,身法:10,体魄:11,悟性:12,感知:11,意志:14},
      ocean:{力量:11,身法:10,体魄:13,悟性:10,感知:12,意志:12},food:{力量:8,身法:9,体魄:10,悟性:14,感知:11,意志:12}
    };
    const result = clone(rows[record.archetype] ?? rows.power);
    const identitySeed = `${clean(record.name).split('·')[0]}:${clean(record.soul)}`;
    const first = stableHash(identitySeed) % ATTRIBUTE_KEYS.length;
    const second = (first + 2 + stableHash(`${identitySeed}:secondary`) % 3) % ATTRIBUTE_KEYS.length;
    result[ATTRIBUTE_KEYS[first]] = Math.min(15,result[ATTRIBUTE_KEYS[first]] + 1);
    if (second !== first) result[ATTRIBUTE_KEYS[second]] = Math.min(15,result[ATTRIBUTE_KEYS[second]] + 1);
    return result;
  }

  function attributePriority(record) {
    const authored=women.forRecord(record.id,split(record.soul)[0]);
    if(authored?.growthPriority)return clone(authored.growthPriority);
    const preferred = {
      power:['力量','体魄','意志','身法','感知','悟性'],weapon:['力量','身法','感知','体魄','悟性','意志'],agility:['身法','感知','力量','意志','体魄','悟性'],
      control:['悟性','感知','意志','身法','体魄','力量'],support:['悟性','意志','感知','体魄','身法','力量'],heal:['悟性','感知','意志','体魄','身法','力量'],
      fire:['力量','意志','体魄','身法','悟性','感知'],ice:['悟性','感知','意志','体魄','身法','力量'],lightning:['力量','身法','意志','体魄','感知','悟性'],
      poison:['悟性','意志','感知','身法','体魄','力量'],mental:['意志','感知','悟性','体魄','身法','力量'],defense:['体魄','意志','力量','感知','悟性','身法'],
      dark:['身法','感知','意志','悟性','力量','体魄'],light:['意志','悟性','感知','力量','体魄','身法'],ocean:['体魄','感知','意志','力量','悟性','身法'],
      food:['悟性','意志','感知','体魄','身法','力量']
    };
    return preferred[record.archetype] ?? preferred.power;
  }

  function attributeProgression(record, ringLoadouts, options={}) {
    if(options.explicitPlan)return clone(options.explicitPlan);
    const initial = initialAttributes(record);
    const base = clone(initial);
    const priorities = options.weights?[...new Set([...(options.priority??ATTRIBUTE_KEYS),...ATTRIBUTE_KEYS])].filter(key=>ATTRIBUTE_KEYS.includes(key)&&options.weights[key]>0):attributePriority(record);
    if(options.weights&&(!priorities.length||Object.entries(options.weights).some(([key,value])=>!ATTRIBUTE_KEYS.includes(key)||!Number.isSafeInteger(value)||value<0)))throw Error('人物属性分配权重须对应六维的非负整数，且至少一项大于零');
    const spent=Object.fromEntries(ATTRIBUTE_KEYS.map(key=>[key,0]));
    const allocationPlan = [];
    let ringIndex = 0;
    for (const loadout of ringLoadouts) {
      for (const ring of loadout.rings) {
        const allocation = {};
        for (let point = 0; point < cycle.RING_ATTRIBUTE_POINTS; point += 1) {
          let key = priorities[(ringIndex * cycle.RING_ATTRIBUTE_POINTS + point) % Math.min(3,priorities.length)];
          if(options.weights){key=null;for(const candidate of priorities)if(base[candidate]<99&&(!key||(spent[candidate]+1)*options.weights[key]<(spent[key]+1)*options.weights[candidate]))key=candidate;}
          if(!key)continue;
          allocation[key] = (allocation[key] ?? 0) + 1;
          base[key] += 1;
          spent[key] += 1;
        }
        allocationPlan.push({soulIndex:loadout.soulIndex,soulName:loadout.soulName,ringOrdinal:ring.ordinal,allocation,evidence:'每枚实际魂环固定提供2点自由属性；按该人物战斗定位分配'});
        ringIndex += 1;
      }
    }
    return {initial,base,allocationPlan,totalRingPoints:ringIndex * cycle.RING_ATTRIBUTE_POINTS,evidence:'原著初始倾向机械复现；等级不增加六维；仅魂环自由点改变基础六维'};
  }

  function desiredSoulQuality(record) {
    if(record.id===liProfile.ID)return {id:'divine',value:5,min:65,max:100,evidence:'太阴薜荔的已确认67点神级武魂配置'};
    const names = record.martialSouls.map(item => item.name).join('|');
    if (/^天鹅$/u.test(names)) return {id:'top',value:4,min:45,max:64,evidence:'用户二创：天斗皇室顶级传承武魂'};
    if (/罗三炮/u.test(names)) return {id:'waste',value:1,min:0,max:14,evidence:'原著明确恶性变异废武魂'};
    if (/六翼天使|银龙王/u.test(names)) return {id:'divine',value:5,min:65,max:100,evidence:'原著神赐顶层武魂身份'};
    if (/昊天锤|蓝银皇|七杀剑|骨龙|九宝琉璃塔|七宝琉璃塔|九心海棠|香肠|蓝电霸王龙|白虎|凤凰|死亡蛛皇|噬魂蛛皇|黄金鳄王|柔骨兔|海神/u.test(names)) return {id:'top',value:4,min:45,max:64,evidence:'原著顶级、十万年化形或先天满魂力核心武魂身份'};
    if (/机制补全|独狼|^蛇$|战虎|^狼$|长棍|如意环/u.test(names)) return {id:'common',value:2,min:15,max:29,evidence:'原著普通或资料缺省武魂身份'};
    return {id:'rare',value:3,min:30,max:44,evidence:'原著具名战斗武魂身份'};
  }

  function canonicalIdentityChannels(soulName,archetypeKey,qualityValue) {
    const channels = [];
    // 第七魂环的武魂真身是魂师体系的共同高阶表达，不应只给少数“顶级”武魂。
    // 废武魂仍受自身品质预算约束；普通及以上武魂仅获得购买这一机制的资格。
    if (qualityValue >= 2) channels.push('channel.transform');
    if (/蓝银皇|蓝银草|花|藤|草/u.test(soulName)) channels.push('channel.entangle','channel.heal','channel.area-shaping');
    if (/九心海棠|海棠/u.test(soulName) || archetypeKey === 'heal') channels.push('channel.heal','channel.cleanse','channel.revive');
    if (/香肠|食物|糖豆/u.test(soulName)) channels.push('channel.buff','channel.resource','channel.transform','channel.heal','channel.cleanse','channel.flight');
    if (/七宝琉璃塔|九宝琉璃塔/u.test(soulName)) channels.push('channel.buff','channel.resource','channel.transform','channel.shield','channel.invulnerability','channel.counter','channel.revive');
    if (/蛛皇|蜘蛛|碧磷|蛇|海鬼/u.test(soulName)) channels.push('channel.poison','channel.debuff','channel.soul-interference','channel.transform');
    if (/蛛皇|蜘蛛/u.test(soulName)) channels.push('channel.heal');
    if (/盾|甲|龟|鳄|骨龙|白虎|冰凤凰/u.test(soulName)) channels.push('channel.shield','channel.resistance','channel.counter','channel.invulnerability');
    if (/玄龟/u.test(soulName)) channels.push('channel.freeze');
    if (/骨龙/u.test(soulName)) channels.push('channel.teleport');
    if (/凤凰/u.test(soulName)) channels.push('channel.flight');
    if (/熊/u.test(soulName)) channels.push('channel.counter','channel.sensory','channel.movement');
    if (/柔骨兔/u.test(soulName)) channels.push('channel.charm','channel.teleport','channel.invulnerability','channel.entangle','channel.movement');
    if (/天使|圣|光/u.test(soulName)) channels.push('channel.shield','channel.heal','channel.cleanse','channel.counter','channel.invulnerability','channel.revive');
    if (/凤凰|龙|虎|锤|剑/u.test(soulName) && qualityValue >= 4) channels.push('channel.transform');
    if (archetypeKey === 'agility') channels.push('channel.buff','channel.summon');
    if (archetypeKey === 'fire') channels.push('channel.transform','channel.flight','channel.movement','channel.summon');
    if (archetypeKey === 'mental') channels.push('channel.soul-interference','channel.charm','channel.fear','channel.sleep','channel.debuff','channel.buff','channel.resource');
    if (archetypeKey === 'dark') channels.push('channel.summon');
    if (archetypeKey === 'light') channels.push('channel.flight');
    if (archetypeKey === 'ocean') channels.push('channel.shield','channel.debuff');
    return list(channels);
  }

  function canonicalSkillEffects(record, soulIndex, soulName) {
    // 同名原著武魂使用其全部时期已知技能的通道并集，保证人物升级或时期切片不会改写武魂本体价格。
    const matchingLoadouts = (record.growthProjection?[record]:Object.values(CHARACTER_CATALOG))
      .flatMap(character => character.mechanics?.ringLoadouts ?? [])
      .filter(loadout => clean(loadout.soulName) === clean(soulName));
    const fallback = record.mechanics?.ringLoadouts?.find(item => Number(item.soulIndex) === soulIndex + 1);
    const loadouts = [...matchingLoadouts,fallback].filter(Boolean);
    const requested = loadouts.flatMap(loadout => loadout.rings ?? []).flatMap(ring => ring.skills ?? []).flatMap(skill =>
      (skill.requestedBranches ?? []).flatMap(branch => branch.requestedEffects ?? [])
    );
    return {requested,loadouts};
  }
  function canonicalSkillChannels(record, soulIndex, soulName) {
    const {requested,loadouts}=canonicalSkillEffects(record,soulIndex,soulName);
    const uncovered = new Set(requested.map(spec => Array.isArray(spec) ? spec[0] : spec?.effectId).filter(Boolean));
    const selected = [];
    while (uncovered.size) {
      const candidate = Object.values(foundation.MARTIAL_SOUL_CORE.CHANNEL_REGISTRY)
        .map(channel => ({channel,covered:channel.effectIds.filter(effectId => uncovered.has(effectId))}))
        .filter(item => item.covered.length)
        .sort((left,right) => right.covered.length-left.covered.length || left.channel.cost-right.channel.cost || left.channel.id.localeCompare(right.channel.id))[0];
      if (!candidate) break;
      selected.push(candidate.channel.id);
      candidate.covered.forEach(effectId => uncovered.delete(effectId));
    }
    const selfTargetRequired=loadouts.some(loadout=>loadout.rings.some(ring=>ring.skills.some(skill=>skill.requestedBranches?.some(branch=>branch.targetPolicy==='self'))));
    if(selfTargetRequired&&!selected.some(id=>foundation.MARTIAL_SOUL_CORE.CHANNEL_REGISTRY[id].effectIds.includes('target.self')))selected.push('channel.buff');
    return list(selected);
  }

  function soulDraft(record, soulName, soulIndex, qualityTarget) {
    const refined=women.forRecord(record.id,soulName);if(refined)return {...clone(refined.SOUL.draft),presetId:refined.SOUL.id,sourceDescription:refined.SOUL.description};
    if(swan.isRecord(record.id)&&soulName==='天鹅')return {...clone(swan.SOUL.draft),presetId:swan.SOUL.id,sourceDescription:swan.SOUL.description};
    if(record.id==='ye-lingling'&&soulName==='九心海棠')return {...clone(begonia.SOUL.draft),presetId:begonia.SOUL.id,sourceDescription:begonia.SOUL.description};
    if(record.id===guProfile.ID)return guProfile.soulDefinition(record);
    if(record.id===liProfile.ID)return liProfile.soulDefinition(record);
    const archetypeKey = soulArchetypeKey(record,soulName);
    const archetype = ARCHETYPES[archetypeKey] ?? ARCHETYPES.power;
    const draft = {
      name:soulName,
      concept:`${record.name}的${soulName}；原作空白部分仅按同一武魂创建规则作机械推测`,
      form:clean(record.martialSouls[soulIndex]?.form)||soulName,
      role:archetype.label,
      categories:[archetype.category],
      attributes:list([...archetype.attributes.slice(0,2),...(archetypeKey === 'support' ? ['attribute.life'] : [])]).map((id,index) => ({id,investment:Math.ceil(foundation.MARTIAL_SOUL_CORE.ATTRIBUTE_REGISTRY[id].maximumInvestment*(index===0?.35:.2))})),
      // 原著角色的定位通道是其武魂结构的一部分，不是看见魂技结果后再临时加权限。
      // 四条原型通道仍逐项计入造化点；具名高阶能力继续由下方身份通道按预算购买。
      channels:list(archetype.channels),
      traits:[],weaknesses:[],
      baseAction:{mode:archetype.channels[0]==='channel.melee'?'melee':archetype.channels[0]==='channel.projectile'?'ranged':'touch',powerTier:0,attributeId:archetype.attributes[0]},
      sourceDescription:`原著角色库：${record.name}/${soulName}/${soulIndex + 1}；推测字段显式标注`,
      playerConfirmed:true
    };
    if(soulName==='邪火凤凰'){
      draft.traits.push({templateId:'trait.source-power',parameter:'',level:1});draft.weaknesses.push({templateId:'weakness.desire-backlash',parameter:'',level:1});
      draft.exchangeContracts=[{id:'evil-fire-exchange',mode:'condition',payer:'self',burdens:[{effectId:'status.desire',params:{强度:1}}],benefits:{componentIds:['trait.source-power:0']}}];
    }
    const requiredSkillChannels = canonicalSkillChannels(record,soulIndex,soulName);
    if(archetypeKey==='fire'&&requiredSkillChannels.includes('channel.buff'))requiredSkillChannels.push('channel.movement');
    const optionalChannels = record.growthProjection?[]:list([
      ...canonicalIdentityChannels(soulName,archetypeKey,qualityTarget.value),
      ...(qualityTarget.value >= 4 ? ['channel.transform'] : [])
    ]);
    const optionalTraits = [
      {templateId:'trait.ability-training',parameter:archetype.dominant,level:1},
      {templateId:'trait.attack-training',parameter:['power','weapon','agility','defense'].includes(archetypeKey) ? '物理攻击' : '魂技攻击',level:1},
      {templateId:'trait.attribute-mastery',parameter:archetype.attributes[0],level:1},
      {templateId:'trait.basic-action-power',parameter:'',level:1},
      {templateId:'trait.soul-capacity',parameter:'',level:1},
      {templateId:'trait.soul-efficiency',parameter:'',level:1}
    ];
    const price = candidate => foundation.MARTIAL_SOUL_CORE.componentCost(foundation.MARTIAL_SOUL_CORE.normalizeDraft(candidate)).total;
    let workingMax = qualityTarget.max;
    const accept = (mutation, options = {}) => {
      const candidate = clone(draft);
      mutation(candidate);
      const cost = price(candidate);
      if (cost > 100 || cost <= price(draft)) return false;
      if (cost > workingMax) {
        if (!options.expandForCanon) return false;
        const expandedGrade = foundation.MARTIAL_SOUL_CORE.QUALITY_GRADES.find(grade => cost >= grade.minValue && cost <= grade.maxValue);
        if (!expandedGrade) return false;
        workingMax = expandedGrade.maxValue;
      }
      Object.assign(draft,candidate);
      return true;
    };
    // 原著角色以整套已知能力反推其武魂必须具备的表达权限；权限仍按公开造化点价格结算，
    // 必要时自然抬升系统评定品级，而不是给角色绕过池子或免费塞机制。
    const requiredAttributes=new Set();
    for(const [id,p] of canonicalSkillEffects(record,soulIndex,soulName).requested){
      if(['status.fear','status.charm','status.desire','status.mind_control','status.cognition_shift','status.sleep'].includes(id)||id==='payload.damage'&&p?.类型==='精神')for(const a of foundation.MARTIAL_SOUL_CORE.effectAttributeIds(id,p,draft.attributes.map(a=>a.id)))requiredAttributes.add(a);
      if(['status.soul_control','payload.soul_damage'].includes(id)||id==='payload.damage'&&p?.类型==='灵魂')requiredAttributes.add('attribute.soul');
    }
    for(const id of requiredAttributes)if(!draft.attributes.some(a=>a.id===id)){
      if(!accept(candidate=>candidate.attributes.push({id,investment:foundation.MARTIAL_SOUL_CORE.ATTRIBUTE_REGISTRY[id].minimumInvestment}),{expandForCanon:true}))throw Error(`${soulName}无法支付具名能力需要的${id}属性`);
    }
    for (const channel of requiredSkillChannels) accept(candidate => candidate.channels.push(channel),{expandForCanon:true});
    // 其余身份通道只是可选潜力，不为凑满预算强购。
    for (const channel of optionalChannels) accept(candidate => candidate.channels.push(channel));
    for (const trait of optionalTraits) accept(candidate => candidate.traits.push(clone(trait)));
    for (const tier of [1,2]) accept(candidate => { candidate.baseAction.powerTier = tier; });
    let guard = 0;
    while (price(draft) < qualityTarget.min && guard++ < 500) {
      let raised = false;
      for (let index = 0; index < draft.attributes.length; index += 1) {
        if (draft.attributes[index].investment >= foundation.MARTIAL_SOUL_CORE.ATTRIBUTE_REGISTRY[draft.attributes[index].id].maximumInvestment) continue;
        // 每次增加一个真实造化点投入，寻找合法的目标品级。
        raised = accept(candidate => { candidate.attributes[index].investment += 1; }) || raised;
        if (price(draft) >= qualityTarget.min) break;
      }
      if (!raised) break;
    }
    return draft;
  }

  function makeMartialSouls(record, ownerId, instanceKey = record.id) {
    const target = desiredSoulQuality(record);
    const price = draft => foundation.MARTIAL_SOUL_CORE.componentCost(foundation.MARTIAL_SOUL_CORE.normalizeDraft(draft)).total;
    let drafts = record.martialSouls.map((soulSpec,soulIndex) => soulDraft(record,soulSpec.name,soulIndex,target));
    const requiredGradeValue = Math.max(target.value,...drafts.map(draft => foundation.MARTIAL_SOUL_CORE.QUALITY_GRADES.find(grade => price(draft) >= grade.minValue && price(draft) <= grade.maxValue)?.value ?? target.value));
    const sharedGrade = foundation.MARTIAL_SOUL_CORE.QUALITY_GRADES.find(grade => grade.value === requiredGradeValue);
    if (sharedGrade && sharedGrade.value !== target.value) {
      const sharedTarget = {id:sharedGrade.id,value:sharedGrade.value,min:sharedGrade.minValue,max:sharedGrade.maxValue,evidence:`${target.evidence}；原著已命名能力按共同机制计价后进入${sharedGrade.name}`};
      drafts = record.martialSouls.map((soulSpec,soulIndex) => soulDraft(record,soulSpec.name,soulIndex,sharedTarget));
    }
    // 离散组件可能让一个双武魂停在44点、下一个可行价位直接跳到47点。
    // 仅在原目标未达品级下限时放宽单件搜索上界，再按属性投入检查共享造化点。
    if (drafts.length === 2 && drafts.some(draft => price(draft) < target.min)) {
      const expandedTarget = {...target,max:target.max + 1};
      drafts = record.martialSouls.map((soulSpec,soulIndex) => soulDraft(record,soulSpec.name,soulIndex,expandedTarget));
    }
    const souls = record.martialSouls.map((soulSpec,soulIndex) => {
      const draft = drafts[soulIndex];
      const actualPrice = price(draft);
      const compiled = foundation.MARTIAL_SOUL_CORE.finalizeDraft(draft,{budget:actualPrice,id:`canon-soul-${instanceKey}-${soulIndex + 1}`,revision:0});
      return foundation.normalizeMartialSoul({
        id:compiled.id,持有者单位ID:ownerId,名称:soulSpec.name,结构化武魂:compiled,
        扩展:{原著证据:soulSpec.evidence,机械推测:true,创建流程:'原著定型档案经MARTIAL_SOUL_CORE.finalizeDraft计价终审',角色库ID:record.id,玩家造化点开卡:false,原著品级依据:target.evidence}
      },ownerId);
    });
    const qualities = new Set(souls.map(soul => `${soul.品级}:${soul.品级标签}`));
    const soulCosts = souls.map(soul => soul.扩展.结构化武魂.pricing.total);
    const spent = soulCosts.reduce((sum,value)=>sum + value,0);
    if (qualities.size !== 1) throw new Error(`角色${record.id}多武魂品级不一致：${souls.map(soul => `${soul.名称}=${soul.品级标签}/${soul.扩展.结构化武魂.pricing.total}`).join('，')}`);
    return {souls,ledger:{total:spent,spent,remaining:0,soulCosts,extraSoulSlots:Math.max(0,drafts.length - 1),extraSoulSlotCost:0,openingPointBuy:false,pricingOnly:true,qualityId:souls[0]?.扩展?.结构化武魂?.quality?.id ?? target.id,qualityName:souls[0]?.品级标签 ?? '',desiredQualityId:target.id,evidence:'canon-fixed-martial-soul-priced-by-common-rules'}};
  }

  function beastYears(record) {
    if (record.id === 'deep-sea-demon-whale-king') return 990000;
    if (record.id === 'dark-devilgod-tiger') return 60000;
    if (record.id === 'blue-silver-king') return 85000;
    return 100000;
  }

  function instantiateYuXiaogangNotting(state, record, ownerId, options = {}) {
    const canonProfile = clone(YU_XIAOGANG_CANON_PROFILE);
    const inspection = foundation.MARTIAL_SOUL_CORE.inspectDraft(
      {...clone(canonProfile.martialSoulDraft),playerConfirmed:true},
      {budget:world.CREATION_RULES.totalPoints}
    );
    if (!inspection.accepted) throw new Error(`玉小刚武魂共同规则终审失败：${inspection.nextQuestion || '罗三炮结构不合法'}`);
    const compiled = foundation.MARTIAL_SOUL_CORE.finalizeDraft(
      {...clone(canonProfile.martialSoulDraft),playerConfirmed:true},
      {budget:world.CREATION_RULES.totalPoints,id:`canon-soul-${record.id}-1`,revision:state.系统.revision + 1}
    );
    if (compiled.quality?.id !== 'waste') throw new Error(`罗三炮必须按原著登记为废武魂，当前为${compiled.quality?.name ?? '未知'}`);
    const mechanicalLedger = {
      total:compiled.pricing.total,spent:compiled.pricing.total,remaining:0,soulCosts:[compiled.pricing.total],extraSoulSlots:0,extraSoulSlotCost:0,
      qualityId:compiled.quality.id,qualityName:compiled.quality.name,evidence:'canon-fixed-martial-soul-priced-by-common-rules',openingPointBuy:false,pricingOnly:true
    };
    const validation = {pass:true,errors:[],kind:'canon-mechanical-validation',openingPointBuy:false,pricing:clone(compiled.pricing),quality:clone(compiled.quality),ledger:clone(mechanicalLedger)};
    const soul = foundation.normalizeMartialSoul({
      id:compiled.id,持有者单位ID:ownerId,名称:'罗三炮',结构化武魂:compiled,
      扩展:{原著证据:'canon-explicit',机械推测:true,创建流程:'共同规则：inspectDraft → finalizeDraft → createCharacter',原著品质:'恶性变异废武魂',玩家造化点开卡:false,角色库ID:record.id}
    },ownerId);
    const created = cycle.createCharacter(state,{
      id:ownerId,name:record.name,level:10,attributes:clone(canonProfile.attributes),martialSouls:[soul],
      controller:options.controller === 'player' ? 'player' : 'npc',faction:options.controller === 'player' ? '玩家方' : record.faction,
      tags:['原著角色库','控制','废武魂',record.periodLabel,'现行规则重建'],cluster:'canon-opponent',
      affinitySpectrum:{主属性:['风','毒蚀'],强度:{风:10,毒蚀:10,生命:10}},
      dossier:{姓名:record.name,年龄:canonProfile.age,性别:canonProfile.gender,出身:canonProfile.origin,身份:'诺丁学院理论大师',外貌:canonProfile.appearance,原著角色库ID:record.id,时期标签:record.periodLabel,创建来源:CANON_MECHANICS_VERSION,玩家造化点开卡:false},
      unitExtensions:{角色库ID:record.id,时期标签:record.periodLabel,同规则创建:true,玩家造化点开卡:false,头像URL:'',头像接口:'unit.扩展.头像URL',现行规则重建:true},
      growthExtensions:{角色库ID:record.id,机械推测:true,原著武魂机制账本:clone(mechanicalLedger),成长流程:[]}
    },`canon-create-${ownerId}`);
    state = created.state;
    state.人物.列表[ownerId] = {
      id:ownerId,tier:'full',name:record.name,identity:'诺丁学院理论大师',occupation:'魂师/研究者',faction:record.faction,
      age:canonProfile.age,gender:canonProfile.gender,appearance:canonProfile.appearance,personality:'严谨、克制，重视证据与训练方法',
      locationId:record.locationId,relationship:{player:0},walletId:`wallet-${ownerId}`,inventoryContainerId:`container-${ownerId}-inventory`,
      equipmentConfigId:ownerId,combatantId:ownerId,generatedBy:CANON_MECHANICS_VERSION,seed:`canon:${record.id}:rebuild`,status:'active',
      扩展:{角色库ID:record.id,时期标签:record.periodLabel,创建事务ID:`canon-create-${ownerId}`,玩家造化点开卡:false,头像URL:'',头像接口:'人物.扩展.头像URL',现行规则重建:true}
    };
    people.initialize(state,ownerId);
    world.ensurePossessionShell(state,ownerId);
    const generated = {
      unitIds:[ownerId],soulIds:[soul.id],ringIds:[],skillIds:[],profileIds:[],itemIds:[],soulBoneItemIds:[],
      personIds:[ownerId],walletIds:[`wallet-${ownerId}`],containerIds:[`container-${ownerId}-inventory`],equipmentConfigIds:[ownerId],
      excludedEquipment:clone(record.mechanics.equipment.filter(item => item.excluded)),excludedSkills:[],contentConflicts:[],mechanismGaps:[],
      creationReceipt:clone(created.receipt),creationValidation:clone(validation),growthReceipts:[],capacityChecks:[]
    };
    const setLevel = level => {
      state.成长.列表[ownerId].魂力等级 = level;
      state.成长.列表[ownerId].当前等级需求 = 100 + level * 25;
      state.成长.列表[ownerId].瓶颈等级 = Math.ceil(level / 10) * 10;
      state.成长.列表[ownerId].瓶颈状态 = level % 10 === 0 && level < 99 ? '积累经验' : '未到瓶颈';
      state.战斗单位.列表[ownerId].成长.魂力等级 = level;
      cycle.refreshCombatant(state,ownerId);
    };
    const registerThrough = (desiredCount, level) => {
      setLevel(level);
      const loadout = {...clone(YU_XIAOGANG_RING_LOADOUT),desiredCount,rings:clone(YU_XIAOGANG_RING_LOADOUT.rings.slice(0,desiredCount))};
      const createdRings = world.generateRegisteredRings(state,ownerId,level,`canon:${record.id}:common-mechanics`,{
        soulLoadouts:[loadout],mechanismGaps:generated.mechanismGaps,allowInferenceFallback:false,openingCompatibility:options.openingCompatibility===true
      });
      for (const entry of createdRings) {
        const ring = state.魂环.列表[entry.ringId];
        const capacity = Number(ring?.吸收时快照?.魂环承载上限 ?? 0);
        const pass = Number(ring?.年限 ?? 0) <= capacity;
        if (!pass) throw new Error(`玉小刚第${ring?.序号 ?? '?'}魂环超出当时统一承载上限：${ring?.年限}/${capacity}`);
        ring.吸收双门 = {承载:{通过:true,压力:ring.年限,上限:capacity,来源:'六维与生命魂力共同承载'},肉身:{通过:true,来源:'统一承载兼容别名'},灵魂:{通过:true,来源:'统一承载兼容别名'}};
        ring.扩展 = {...clone(ring.扩展 ?? {}),登记流程:'与玩家同一world.generateRegisteredRings编译登记',当时等级:level};
        generated.ringIds.push(entry.ringId);
        generated.skillIds.push(...entry.skillIds);
        generated.profileIds.push(entry.profileId);
        generated.capacityChecks.push({ringId:ring.id,ordinal:ring.序号,level,years:ring.年限,capacity,pass});
      }
    };
    registerThrough(1,10);
    let allocated = cycle.allocateGrowthAttribute(state,{unitId:ownerId,attribute:'悟性',steps:2},`canon-growth-${ownerId}-ring-1`);
    state = allocated.state;
    generated.growthReceipts.push(clone(allocated.receipt));
    registerThrough(2,20);
    allocated = cycle.allocateGrowthAttribute(state,{unitId:ownerId,attribute:'感知',steps:1},`canon-growth-${ownerId}-ring-2-a`);
    state = allocated.state;
    generated.growthReceipts.push(clone(allocated.receipt));
    allocated = cycle.allocateGrowthAttribute(state,{unitId:ownerId,attribute:'意志',steps:1},`canon-growth-${ownerId}-ring-2-b`);
    state = allocated.state;
    generated.growthReceipts.push(clone(allocated.receipt));
    setLevel(record.level);
    const unit = fillCombatResources(state.战斗单位.列表[ownerId]);
    unit.位置.站位簇 = options.escort ? 'hunting-escort' : 'canon-opponent';
    unit.扩展 = {
      ...clone(unit.扩展 ?? {}),角色库ID:record.id,时期标签:record.periodLabel,现行规则重建:true,
      玩家造化点开卡:false,逐环成长回执:clone(generated.growthReceipts),魂环承载校验:clone(generated.capacityChecks),
      武魂创建账本:clone(mechanicalLedger),原著机械档案版本:record.mechanics.version,
      非致命伤害:false,护航身份:options.escort === true ? '首次猎魂森林新手护航' : '',头像URL:'',头像接口:'unit.扩展.头像URL'
    };
    const expected = record.mechanics.attributes.base;
    for (const key of ATTRIBUTE_KEYS) if (unit.六维.基础[key] !== expected[key]) throw new Error(`玉小刚${key}成长结果不一致：${unit.六维.基础[key]}/${expected[key]}`);
    state.成长.列表[ownerId].扩展 = {
      ...clone(state.成长.列表[ownerId].扩展 ?? {}),玩家造化点开卡:false,原著武魂机制账本:clone(mechanicalLedger),
      成长流程:clone(generated.growthReceipts),魂环承载校验:clone(generated.capacityChecks),最终等级:record.level
    };
    generated.ringIds = list(generated.ringIds);
    generated.skillIds = list(generated.skillIds);
    generated.profileIds = list(generated.profileIds);
    return {state,generated};
  }

  function instantiateSoulMaster(state, record, ownerId, options = {}) {
    if (record.id === 'yu-xiaogang-notting' && !record.worldEra) return instantiateYuXiaogangNotting(state,record,ownerId,options);
    const generated = {
      unitIds:[ownerId],soulIds:[],ringIds:[],skillIds:[],profileIds:[],itemIds:[],soulBoneItemIds:[],
      personIds:[ownerId],walletIds:[`wallet-${ownerId}`],containerIds:[`container-${ownerId}-inventory`],equipmentConfigIds:[ownerId],
      excludedEquipment:[],excludedSkills:clone(record.mechanics.excludedSkills),contentConflicts:clone(record.mechanics.contentConflicts),mechanismGaps:clone(record.mechanics.mechanismGaps),creationReceipt:null,creationValidation:null,growthReceipts:[],capacityChecks:[]
    };
    const compiledSouls = makeMartialSouls(record,ownerId,options.instanceKey ?? record.id);
    const attributes = clone(record.mechanics.attributes.initial);
    const customAttributes=Boolean(options.openingDraft&&abilities.hash(options.openingDraft.attributes)!==abilities.hash(record.mechanics.attributes.base));
    if(options.openingDraft){
      const draft=options.openingDraft;
      if(draft.martialSoulDrafts?.length!==compiledSouls.souls.length)throw Error('请保留此人物的全部武魂');
      compiledSouls.souls=draft.martialSoulDrafts.map((definition,index)=>foundation.finalizeMartialSoulDraft({...definition,playerConfirmed:true},{budget:9999,id:compiledSouls.souls[index].id,ownerId}));
      for(const key of foundation.ATTRIBUTE_KEYS){
        attributes[key]=customAttributes?draft.attributes[key]:record.mechanics.attributes.initial[key];
        if(!Number.isInteger(attributes[key])||attributes[key]<1||attributes[key]>99)throw Error('当前六维不足以保留此阶段已经获得的成长，请提高基础素质');
      }
    }
    const created = cycle.createCharacter(state,{
      id:ownerId,name:record.name,level:record.mechanics.nativeOrigin?record.level:1,attributes,martialSouls:compiledSouls.souls,
      controller:options.controller === 'player' ? 'player' : 'npc',faction:options.controller === 'player' ? '玩家方' : record.faction,
      tags:['原著角色库',archetypeFor(record).label,record.periodLabel,'现行规则重建'],cluster:'canon-opponent',title:record.title ?? generatedTitleRecord(record),
      affinitySpectrum:{主属性:[archetypeFor(record).damage],强度:{[archetypeFor(record).damage]:80}},
      dossier:{姓名:record.name,原著角色库ID:record.id,时期标签:record.periodLabel,创建来源:CANON_MECHANICS_VERSION,玩家造化点开卡:false},
      unitExtensions:{角色库ID:record.id,时期标签:record.periodLabel,证据状态:record.completion,封号:clone(record.title ?? generatedTitleRecord(record)),同流程创建:true,玩家造化点开卡:false,头像URL:'',头像接口:'unit.扩展.头像URL',canonicalRepresentation:record.mechanics.nativeOrigin?'native':'projection',...(record.mechanics.nativeOrigin?{nativeOrigin:foundation.nativeOriginBinding(record.mechanics.nativeOrigin.id,ownerId)}:{})},
      growthExtensions:{角色库ID:record.id,机械推测:true,武魂创建账本:clone(compiledSouls.ledger),成长流程:[]}
    },`canon-create-${ownerId}`);
    state = created.state;
    generated.creationReceipt = clone(created.receipt);
    generated.creationValidation = {pass:true,errors:[],kind:'canon-mechanical-validation',openingPointBuy:false,ledger:clone(compiledSouls.ledger)};
    generated.soulIds.push(...created.receipt.martialSoulIds);
    state.人物.列表[ownerId] = {
      id:ownerId,tier:'full',name:record.name,identity:record.periodLabel || '原著魂师',occupation:'魂师',faction:record.faction,age:record.worldPersona?.age??0,gender:record.worldPersona?.gender??'未知',
      appearance:'原作人物档案',personality:'',locationId:record.locationId,relationship:{player:0},walletId:`wallet-${ownerId}`,
      inventoryContainerId:`container-${ownerId}-inventory`,equipmentConfigId:ownerId,combatantId:ownerId,generatedBy:CANON_MECHANICS_VERSION,seed:`canon:${record.id}`,status:'active',
      扩展:{角色库ID:record.id,时期标签:record.periodLabel,推测政策:record.mechanics.inferencePolicy,创建事务ID:created.receipt.id,玩家造化点开卡:false,头像URL:'',头像接口:'人物.扩展.头像URL'}
    };
    if(record.visualIdentity)Object.assign(state.人物.列表[ownerId].扩展,clone(record.visualIdentity));
    if(record.characterProfile){state.人物.列表[ownerId].personality=record.characterProfile.values;state.人物.列表[ownerId].appearance=record.worldPersona.appearance;state.人物.列表[ownerId].扩展.characterProfile={version:1,source:'preset',status:'complete',data:clone(record.characterProfile)};}
    people.initialize(state,ownerId,record.lifeBasis?{lifeBasis:record.lifeBasis,source:record.sourcePolicy.sourceId}:{});
    if(CHARACTER_CATALOG[record.id])for(const [index,soulId]of state.成长.列表[ownerId].武魂ID列表.entries())canonicalGrowth.bindSoul(state.武魂.列表[soulId],record.id,index+1,`canon-create-${ownerId}`,record.growthProjection?'projection':'canonical');
    const shell = world.ensurePossessionShell(state,ownerId);
    const setLevel = level => {
      const normalizedLevel = Math.max(1,Math.min(record.level,integer(level,1,99)));
      const growth = state.成长.列表[ownerId];
      growth.魂力等级 = normalizedLevel;
      growth.当前等级需求 = 100 + normalizedLevel * 25;
      growth.瓶颈等级 = Math.ceil(normalizedLevel / 10) * 10;
      growth.瓶颈状态 = normalizedLevel % 10 === 0 && normalizedLevel < 99 ? '积累经验' : '未到瓶颈';
      state.战斗单位.列表[ownerId].成长.魂力等级 = normalizedLevel;
      cycle.refreshCombatant(state,ownerId);
    };
    for (const plan of record.mechanics.attributes.allocationPlan) {
      const targetLoadout = record.mechanics.ringLoadouts[plan.soulIndex - 1];
      const ringSpec = targetLoadout.rings[plan.ringOrdinal - 1];
      setLevel(record.mechanics.nativeOrigin?record.level:ringSpec.acquisitionLevel ?? plan.ringOrdinal * 10);
      const targetSoul = state.武魂.列表[state.成长.列表[ownerId].武魂ID列表[plan.soulIndex - 1]];
      foundation.switchActiveMartialSoul(state,ownerId,targetSoul.id);
      const stagedLoadouts = record.mechanics.ringLoadouts.map((loadout,index) => {
        const soul = state.武魂.列表[state.成长.列表[ownerId].武魂ID列表[index]];
        const currentCount = soul.魂环ID列表.length;
        const nextCount = index === plan.soulIndex - 1 ? currentCount + 1 : currentCount;
        return {...clone(loadout),desiredCount:nextCount,rings:clone(loadout.rings.slice(0,nextCount))};
      });
      let registeredRings;
      try { registeredRings = world.generateRegisteredRings(state,ownerId,state.成长.列表[ownerId].魂力等级,`canon:${record.id}:ring-${plan.soulIndex}-${plan.ringOrdinal}`,{
        soulLoadouts:stagedLoadouts,historicalLoadout:options.historicalLoadout===true,mechanismGaps:generated.mechanismGaps,allowInferenceFallback:!record.sourcePolicy,canonicalSkillPreference:record.growthProjection===true||record.mechanics.strictCanonicalPreference===true,selfCondensation:record.mechanics.selfCondensation===true,openingCompatibility:options.openingCompatibility===true,
        ...(record.mechanics.strictCanonicalPreference?{strictCanonicalPreference:true}:{}),...(record.mechanics.allowCanonicalExpressionGrowth?{allowCanonicalExpressionGrowth:true}:{})
      }); } catch(error) { throw new Error(`${record.name} / ${targetSoul.名称} / 第${plan.ringOrdinal}环（${ringSpec.skills.map(skill=>skill.name).join('、')}）：${error.message}`); }
      if (registeredRings.length !== 1) throw new Error(`${record.id}逐环登记应只产生1枚魂环，实际${registeredRings.length}`);
      const entry = registeredRings[0];
      const ring = state.魂环.列表[entry.ringId];
      const capacity = Number(ring?.吸收时快照?.魂环承载上限 ?? 0);
      const pass = Number(ring?.年限 ?? 0) <= capacity;
      if (!pass) throw new Error(`${record.id}/${targetSoul.名称}第${ring?.序号 ?? '?'}魂环超出当时统一承载上限：${ring?.年限}/${capacity}`);
      ring.吸收双门 = {承载:{通过:true,压力:ring.年限,上限:capacity,来源:'六维六项与生命、魂力共同承载'},肉身:{通过:true,来源:'统一承载兼容别名'},灵魂:{通过:true,来源:'统一承载兼容别名'}};
      ring.扩展 = {...clone(ring.扩展 ?? {}),登记流程:'逐环历史重建：共同编译、实际承载校验、再分配2点自由属性',当时等级:state.成长.列表[ownerId].魂力等级};
      generated.ringIds.push(entry.ringId);
      generated.skillIds.push(...entry.skillIds);
      generated.profileIds.push(entry.profileId);
      generated.capacityChecks.push({ringId:ring.id,soulIndex:plan.soulIndex,ordinal:ring.序号,level:state.成长.列表[ownerId].魂力等级,years:ring.年限,capacity,pass});
      for (const [attribute,steps] of Object.entries(customAttributes?{}:plan.allocation)) {
        const allocated = cycle.allocateGrowthAttribute(state,{unitId:ownerId,attribute,steps},`canon-growth-${ownerId}-${plan.soulIndex}-${plan.ringOrdinal}-${attribute}`);
        // This completed growth transaction has already normalized its draft and
        // refreshed this combatant. Rebuilding every other resident after each
        // historical attribute allocation repeats the same world work.
        state = allocated.state;
        generated.growthReceipts.push(clone(allocated.receipt));
      }
    }
    const firstSoulId = state.成长.列表[ownerId].武魂ID列表[0];
    for(const skill of nativeOriginAbilities(record,ownerId,state.武魂.列表[firstSoulId])){
      state.技能.列表[skill.id]=skill;state.战斗单位.列表[ownerId].能力.技能ID.push(skill.id);generated.skillIds.push(skill.id);
    }
    if (firstSoulId) foundation.switchActiveMartialSoul(state,ownerId,firstSoulId);
    setLevel(record.level);
    for (const [index,bone] of record.mechanics.soulBones.entries()) {
      if (bone.skipped) {
        continue;
      }
      const archetype = archetypeFor(record);
      const profile = {
        id:`canon-bone-profile-${record.id}-${index + 1}`,名称:`${record.name}魂骨来源`,年限:bone.years,完整度:1,
        属性谱:{主属性:[archetype.damage]},属性偏向:Object.fromEntries(ATTRIBUTE_KEYS.map(key => [key,key === archetype.dominant ? 5 : 2]))
      };
      profile.血脉=foundation.BEAST_VALUE.sourceLineage(profile);
    const item = world.createSoulBoneItem(state,{
        id:`canon-bone-${options.instanceKey ?? record.id}-${index + 1}`,profile,slot:bone.slot,ownerEntityId:ownerId,containerId:shell.containerId,name:bone.name,
        activeSkillNames:clone(bone.skillNames),
        activeSkillBlueprints:clone(bone.skillBlueprints),
        provenance:{type:'canon-character-soul-bone',recordId:record.id,evidence:bone.evidence},payloadExtra:{recordId:record.id,evidence:bone.evidence,mechanicalInference:true}
      });
      const fused = world.fuseSoulBone(state,{entityId:ownerId,itemId:item.id},`canon-fuse-${ownerId}-${index + 1}`);
      state = fused.state;
      generated.itemIds.push(item.id);
      generated.soulBoneItemIds.push(item.id);
      generated.skillIds.push(...(fused.receipt.skillIds ?? []));
    }
    for (const [index,equipment] of record.mechanics.equipment.entries()) {
      if (equipment.excluded) {
        generated.excludedEquipment.push(clone(equipment));
        continue;
      }
      const template = world.ITEM_TEMPLATES[equipment.templateId];
      const payload = equipment.category==='hidden-weapon'&&template?.activeSkill ? {activeSkill:{...clone(template.activeSkill),name:`${equipment.name}·投掷`}} : {};
      const item = world.createItem(state,equipment.templateId,ownerId,shell.containerId,{
        id:`canon-item-${options.instanceKey ?? record.id}-${index + 1}`,name:equipment.name,forceUnique:true,payload,
        provenance:{type:'canon-character-equipment',recordId:record.id,evidence:equipment.evidence},扩展:{recordId:record.id,mechanicalInference:true}
      });
      generated.itemIds.push(item.id);
      if (template?.type === '魂导器' && Object.values(state.装备.配置[ownerId].slots ?? {}).filter(Boolean).length < world.EQUIPMENT_SLOTS.length) {
        const equipped = world.equipItem(state,{entityId:ownerId,itemId:item.id},`canon-equip-${ownerId}-${index + 1}`);
        state = equipped.state;
        generated.skillIds.push(...(state.物品.实例[item.id]?.payload?.skillIds ?? []));
      }
    }
    const unit = fillCombatResources(state.战斗单位.列表[ownerId]);
    if (record.archetype === 'food') unit.扩展.辅助能力 = {...clone(unit.扩展.辅助能力 ?? {}),食品制造:true};
    unit.扩展.原著机械档案版本 = record.mechanics.version;
    unit.扩展.武魂创建账本 = clone(compiledSouls.ledger);
    unit.扩展.玩家造化点开卡 = false;
    unit.扩展.逐环成长回执 = clone(generated.growthReceipts);
    unit.扩展.魂环承载校验 = clone(generated.capacityChecks);
    unit.扩展.机制缺口 = clone(generated.mechanismGaps);
    unit.扩展.不落地非魂环技能 = clone(generated.excludedSkills);
    unit.扩展.资料冲突 = clone(generated.contentConflicts);
    unit.扩展.排除装备 = clone(generated.excludedEquipment);
    unit.扩展.魂骨记录 = clone(record.mechanics.soulBones);
    unit.扩展.装备记录 = clone(record.mechanics.equipment);
    unit.扩展.头像URL = '';
    unit.扩展.头像接口 = 'unit.扩展.头像URL';
    const expected = customAttributes?options.openingDraft.attributes:record.mechanics.attributes.base;
    for (const key of ATTRIBUTE_KEYS) if (unit.六维.基础[key] !== expected[key]) throw new Error(`${record.id}/${key}逐环成长结果不一致：${unit.六维.基础[key]}/${expected[key]}`);
    state.成长.列表[ownerId].扩展 = {...clone(state.成长.列表[ownerId].扩展 ?? {}),玩家造化点开卡:false,成长流程:clone(generated.growthReceipts),魂环承载校验:clone(generated.capacityChecks),最终等级:record.level};
    return {state,generated};
  }

  function instantiateSoulBeast(state, record, ownerId, options = {}) {
    const refined=women.beast(record.id);
    const years = record.mechanics.beast?.years ?? beastYears(record);
    const profileId = `canon-profile-${options.instanceKey ?? record.id}`;
    const requiredEffects=[...(record.mechanics.beast?.skills??[]).flatMap(requestedEffectsOf).map(([id])=>id),'release.projectile','check.soul_attack','target.self'];
    const lineage=foundation.BEAST_VALUE.sourceLineage({名称:record.name,类别标签:refined?.categories??['category.humanoid'],属性谱:{主属性:refined?.attributes??[archetypeFor(record).damage]}},requiredEffects);
    const profile = foundation.normalizeSoulBeastProfile({血脉:lineage,id:profileId,单位ID:ownerId,物种ID:record.id,名称:record.name,年限:years,完整度:1,类别标签:['原著具名魂兽'],种族特征:[archetypeFor(record).label,'生命'],解剖标签:['魂兽'],属性谱:{主属性:[archetypeFor(record).damage],强度:{[archetypeFor(record).damage]:90}},属性偏向:{力量:4,身法:3,体魄:5,悟性:3,感知:4,意志:5},技能种子:record.id,魂环状态:'无',扩展:{角色库ID:record.id}},ownerId);
    const attributes = clone(record.mechanics.attributes.base);
    if(refined){profile.类别标签=clone(refined.categories);profile.解剖标签=clone(refined.anatomy);profile.扩展.artId=refined.artId;profile.属性谱={...profile.属性谱,主属性:clone(refined.attributes),强度:Object.fromEntries(refined.attributes.map(a=>[a,90]))};}
    const unit = foundation.normalizeCombatant({id:ownerId,名称:record.name,阵营:record.faction,单位种类:'魂兽',标签:['原著角色库','具名魂兽'],六维:{基础:attributes},属性谱:profile.属性谱,位置:{距离区:'近距',站位簇:'canon-opponent'},成长:{类型:'魂兽',年限:years,种族品级:profile.种族品级},扩展:{魂兽档案ID:profileId,角色库ID:record.id,魂骨记录:clone(record.mechanics.soulBones),原著机械档案版本:record.mechanics.version,机制缺口:clone(record.mechanics.mechanismGaps),不落地非魂环技能:clone(record.mechanics.excludedSkills),资料冲突:clone(record.mechanics.contentConflicts)}},{id:ownerId,kind:'魂兽',beastYears:years,beastGrade:profile.种族品级});
    const compiled = effects.compileSoulBeastSkills(profile,{seed:`canon:${record.id}:beast-skills`,requestedSkills:record.mechanics.beast?.skills ?? []});
    profile.扩展.能力账本=clone(compiled);
    profile.种族特征=effects.sourceTraitsWithBridges(profile,compiled);
    const names = record.mechanics.beast?.skills ?? [];
    for (const [index,skill] of compiled.skills.slice(1).entries()) {
      const evidence = names[index] ?? {name:`${record.name}·种族技能${index + 1}`,evidence:'mechanical-inference'};
      skill.name = evidence.name;
      skill.名称 = evidence.name;
      skill.类型 = '魂兽技能';
      if(refined){skill.artId=evidence.artId;skill.description=evidence.description;}
      skill.持有者单位ID = ownerId;
      skill.扩展 = {
        ...clone(skill.扩展 ?? {}),evidence:evidence.evidence,recordId:record.id,generatedBy:'same-soul-beast-compiler',
        定向效果方案:clone(skill.directedPlan ?? null)
      };
      state.技能.列表[skill.id] = abilities.seal(skill);
      unit.能力.技能ID.push(skill.id);
    }
    unit.扩展.普通攻击档案 = abilities.seal({id:'ordinary.attack',soulPowerCost:0,requirements:['gesture'],name:compiled.skills[0].name,source:'canon-soul-beast-anatomy',effectSpecs:compiled.skills[0].effectGraph.nodes.map(node=>[node.effectId,clone(node.params)])});
    state.魂兽档案.列表[profileId] = profile;
    state.战斗单位.列表[ownerId] = unit;
    return {state,generated:{unitIds:[ownerId],soulIds:[],ringIds:[],skillIds:clone(unit.能力.技能ID),profileIds:[profileId],itemIds:[],soulBoneItemIds:[],excludedEquipment:[],excludedSkills:clone(record.mechanics.excludedSkills),contentConflicts:clone(record.mechanics.contentConflicts),mechanismGaps:clone(record.mechanics.mechanismGaps)}};
  }

  function instantiateCharacter(rawState, characterId, options = {}) {
    let state = normalizeState(rawState);
    const record = CHARACTER_CATALOG[characterId];
    if (!record) throw new Error(`角色库ID不存在：${characterId}`);
    if (!record.battleCapable) throw new Error(`${record.name}没有原著战斗资格，不伪造武魂`);
    const ownerId = clean(options.instanceId) || `canon-unit-${record.id}`;
    if (state.战斗单位.列表[ownerId]) throw new Error(`角色实例ID已存在：${ownerId}`);
    if (options.controller === 'player' && record.kind === 'soul-beast') throw new Error('原著魂兽不能通过魂师玩家入口创建');
    if (options.controller === 'player' && state.角色.已建立) throw new Error('当前档案已有主控角色');
    const instantiated = record.kind === 'soul-beast' ? instantiateSoulBeast(state,record,ownerId,options) : instantiateSoulMaster(state,record,ownerId,options);
    state = instantiated.state;
    const generated = instantiated.generated;
    if(options.controller!=='player')completeCatalogueLoadout(state,record,generated);
    for(const key of ['personIds','walletIds','containerIds','equipmentConfigIds'])generated[key]??=[];
    return {state,record,unitId:ownerId,generated};
  }

  // Only the original catalogue loadout has published names. Later acquisitions
  // and newly generated tournament entrants keep their own naming workflow.
  function completeCatalogueLoadout(state,record,generated){
    if(!CHARACTER_CATALOG[record?.id]||!generated)return;
    const labels={melee:['近身击','凝聚武魂之力，近身攻击一个目标。'],touch:['触击','以武魂接触目标，释放一次魂力冲击。'],ranged:['飞击','将武魂之力凝成一道劲芒，向一个目标射出。']};
    for(const id of generated.soulIds??[]){
      const soul=state.武魂.列表[id],base=soul?.扩展?.结构化武魂?.baseAction;
      if(!base||soul.扩展.baseActionNaming)continue;
      const label=labels[base.mode];
      if(label&&base.name===soul.名称+'·本能运用'){
        base.name=soul.名称+'·'+label[0];base.description ||= label[1];
        soul.扩展.专属基础动作=clone(base);
        const ownerId=soul.持有者单位ID,active=state.战斗单位.列表[ownerId]?.扩展?.武魂基础动作;
        if(active&&state.成长.列表[ownerId]?.激活武魂ID===id){active.name=base.name;active.description=base.description;}
      }
      soul.扩展.baseActionNaming={source:'preset',recordId:record.id};
    }
    for(const id of generated.skillIds??[]){
      const skill=state.技能.列表[id];
      if(skill&&(skill.name||skill.名称)&&!skill.namingSource&&!skill.扩展?.命名来源&&!skill.扩展?.generationNaming){
        skill.namingSource='preset';skill.扩展??={};skill.扩展.catalogueNamingSource=record.id;
      }
    }
  }

  function persistentCharacterId(characterId) { return `resident-${characterId}`; }
  /** Opening overrides keep the canonical resident, its belongings and paid history. */
  function configureOpeningCharacter(rawState,characterId,{draft,level,sourceId,player=false}={}){
    const target=level??worldCharacterRecord(characterId,rawState)?.level;
    const record=worldCharacterRecord(characterId,rawState),made=ensurePersistentCharacter(rawState,characterId,{level:target,mode:record?.mechanics.identityLoadout?'canonical':player||target!==record?.level?'projection':'canonical',openingDraft:draft,openingCompatibility:true,controller:player?'player':'npc'}),state=made.state,id=made.unitId,p=state.人物.列表[id],unit=state.战斗单位.列表[id],growth=state.成长.列表[id];
    if(player&&state.角色.已建立&&state.角色.主控单位ID!==id)throw Error('当前世界已有主控人物');
    const targetLevel=level??growth.魂力等级;if(!Number.isInteger(targetLevel)||targetLevel<1||targetLevel>99||growth.武魂ID列表.some(soulId=>state.武魂.列表[soulId].魂环ID列表.length*10>targetLevel))throw Error('调整后的等级不足以保留既有魂环');
    if(draft){
      if(draft.martialSoulDrafts.length!==growth.武魂ID列表.length)throw Error('本次开局须保留原著人物全部既有武魂');
      for(const key of ['name','age','gender','appearance'])if(draft[key]!==undefined)p[key]=clone(draft[key]);
      p.扩展.origin=draft.origin;unit.名称=p.name;unit.六维.基础=clone(draft.attributes);
      for(const [index,soulId] of growth.武魂ID列表.entries()){
        const soul=state.武魂.列表[soulId],definition=draft.martialSoulDrafts[index];
        const compiled=foundation.MARTIAL_SOUL_CORE.finalizeDraft({...definition,playerConfirmed:true},{budget:9999,id:soulId});
        const initial=soul.扩展.expressionBase?.definition;
        if(abilities.hash(initial??soul.扩展.结构化武魂.definition)!==abilities.hash(compiled.definition)){
          if(initial)throw Error('人物已有魂环成长，不能在开局完成后替换原有武魂');
          state.武魂.列表[soulId]=foundation.normalizeMartialSoul({...soul,名称:compiled.name,形态:compiled.definition.form,定位:compiled.definition.role,结构化武魂:compiled,扩展:{...soul.扩展,结构化武魂:compiled}},id);
        }
      }
    }
    growth.魂力等级=targetLevel;growth.瓶颈等级=Math.ceil(targetLevel/10)*10;growth.当前等级需求=100+targetLevel*25;unit.成长.魂力等级=targetLevel;
    if(p.life){p.life.highestLevel=Math.max(p.life.highestLevel,targetLevel);if(draft?.age){p.life.bornAt=people.now(state)-draft.age*people.MINUTES_PER_YEAR;p.life.ageKnown=true;}}
    if(sourceId)p.扩展.openingActor={sourceId,characterId,level:targetLevel,config:clone(draft)};
    if(player){unit.单位种类='玩家魂师';unit.标签=[...new Set([...unit.标签.filter(tag=>tag!=='非玩家魂师'),'主控角色'])];state.角色={已建立:true,主控单位ID:id,档案:{姓名:p.name,年龄:p.age,性别:p.gender,出身:draft?.origin??p.faction,身份:p.identity,外貌:p.appearance},扩展:{createdBy:'canonical-opening',characterId,sourceId}};}
    cycle.refreshCombatant(state,id);
    if(draft)for(const soulId of growth.武魂ID列表)for(const ringId of state.武魂.列表[soulId].魂环ID列表){const ring=state.魂环.列表[ringId],profile=state.魂兽档案.列表[ring.来源魂兽档案ID];if(profile&&!cycle.absorptionGates(state.战斗单位.列表[id],profile).承载.通过)throw Error('调整后的身体不能承载此人的既有魂环');}
    cycle.refreshTitleEligibility(state,id);return {...made,state};
  }
  function persistentCharacterConflict(state,characterId) {
    const identityId=worldCharacterIdentityId(characterId),expectedId=persistentCharacterId(characterId);
    // Include incomplete/dead residents: neither missing combat data nor death permits a replacement.
    for(const variant of WORLD_IDENTITY_GROUPS[identityId]??[characterId]){
      const personId=persistentCharacterId(variant);
      if(personId!==expectedId&&(state.人物?.列表?.[personId]||state.战斗单位?.列表?.[personId]))return {identityId,characterId:variant,personId};
    }
    for(const [unitId,unit] of Object.entries(state.战斗单位?.列表??{})){
      const source=unit.扩展?.角色库ID;
      if(source&&worldCharacterIdentityId(source)===identityId&&unitId!==expectedId&&(unit.扩展?.持久人物||unitId===state.角色?.主控单位ID))return {identityId,characterId:source,personId:unitId};
    }
    return null;
  }
  function persistentCharacterBlockReason(state,characterId) {
    const unavailable=worldCharacterUnavailableReason(characterId,state);if(unavailable)return unavailable;
    const conflict=persistentCharacterConflict(state,characterId);
    return conflict?`同一人物已有持久档案（${state.人物?.列表?.[conflict.personId]?.name??CHARACTER_CATALOG[conflict.characterId]?.name??conflict.characterId}），不能另建其他时期的人物` : '';
  }
  function initializeWorldDisguise(created,record,unitId){
    const recipe=record.worldDisguise;if(!recipe)return;
    let state=created.state;const person=state.人物.列表[unitId],unit=state.战斗单位.列表[unitId];
    person.name=recipe.actualName;unit.名称=recipe.actualName;person.appearance=recipe.actualAppearance;
    person.扩展.currentFigure=recipe.actualFigure;person.扩展.currentAvatar=recipe.actualFigure;
    const profile={id:'profile-world-disguise-'+record.id,名称:recipe.source.name,年限:recipe.source.years,完整度:1,属性谱:{主属性:['光']},属性偏向:{力量:1,身法:2,体魄:2,悟性:4,感知:4,意志:3}};
    profile.血脉=foundation.BEAST_VALUE.sourceLineage(profile);
    const item=world.createSoulBoneItem(state,{id:'world-disguise-bone-'+unitId,profile,slot:recipe.source.slot,ownerEntityId:unitId,containerId:person.inventoryContainerId,name:recipe.source.name,
      activeSkillBlueprints:[{name:recipe.skillName,fixedDesign:true,effectSpecs:[['target.self',{}],['transform.disguise',clone(recipe.params)]]}],
      provenance:{type:'canon-character-soul-bone',recordId:record.id,evidence:'伪装能力有来源记载，魂骨具体名称与年限为游戏补全'},payloadExtra:{recordId:record.id,evidence:'伪装能力有来源记载，魂骨具体名称与年限为游戏补全',mechanicalInference:true}});
    const fused=world.fuseSoulBone(state,{entityId:unitId,itemId:item.id},'world-disguise-fuse-'+unitId);state=fused.state;
    const skillId=fused.receipt.skillIds.find(id=>state.技能.列表[id].effectGraph.nodes.some(n=>n.effectId==='transform.disguise'));
    if(!skillId)throw Error('既存伪装缺少正式来源能力');
    const receiptId='world-initial-disguise-'+unitId;
    const applied=globalThis.SoulDisguise.withInitialization(receiptId,()=>globalThis.SoulCombatEngine.activateFieldAbility(state,unitId,skillId,unitId,receiptId));
    created.state=applied.state;
    created.generated.itemIds.push(item.id);created.generated.soulBoneItemIds.push(item.id);created.generated.skillIds.push(...fused.receipt.skillIds);
  }
  function ensurePersistentCharacter(rawState,characterId,options={}) {
    let record=worldCharacterRecord(characterId,rawState);
    if(record&&options.level!==undefined)record=canonicalGrowth.stageRecord(record,options.level,{projection:options.mode==='projection'});
    if(!record||record.kind==='soul-beast')throw new Error('当前人物不支持此相遇入口');
    const blocked=persistentCharacterBlockReason(rawState,characterId);if(blocked)throw new Error(blocked);
    const unitId=persistentCharacterId(characterId),existing=rawState.战斗单位.列表[unitId],person=rawState.人物.列表[unitId];
    if(existing){
      if(existing.扩展?.角色库ID!==characterId||!existing.扩展?.持久人物||!person)throw new Error('持久人物记录不完整，不能重新生成覆盖');
      if(record.worldEra&&person.扩展?.时代来源?.epoch!==record.worldEra.epoch)throw new Error('持久人物时代档案不匹配，不能重新生成覆盖');
      if(options.level!==undefined&&options.level!==rawState.成长.列表[unitId]?.魂力等级)throw Error('此人物已经建立，不能用新的开局等级覆盖当前经历');
      if(options.mode&&Boolean(record.mechanics.nativeOrigin)!==Boolean(existing.扩展?.nativeOrigin))throw Error('此人物已经建立，不能覆盖当前能力');
      return {state:rawState,unitId,record,generated:existing.扩展.持久人物.generated};
    }
    if(person)throw new Error('持久人物缺少战斗记录，不能重新生成覆盖');
    const created={...instantiateSoulMaster(normalizeState(rawState),record,unitId,options),unitId,record};
    completeCatalogueLoadout(created.state,record,created.generated);
    created.state.人物.列表[unitId].locationId=worldCharacterLocation(rawState,characterId);
    if(record.worldPersona)Object.assign(created.state.人物.列表[unitId],clone(record.worldPersona));
    if(record.worldIdentityPresentation)created.state.人物.列表[unitId].扩展.身份呈现=clone(record.worldIdentityPresentation);
    initializeWorldDisguise(created,record,unitId);
    if(record.worldCombatRestrictions)created.state.战斗单位.列表[unitId].扩展.固有战斗限制=clone(record.worldCombatRestrictions);
    const keys=['unitIds','soulIds','ringIds','skillIds','profileIds','itemIds','soulBoneItemIds','personIds','walletIds','containerIds','equipmentConfigIds'];
    const generated=Object.fromEntries(keys.map(key=>[key,clone(created.generated[key]??[])]));
    created.state.战斗单位.列表[unitId].扩展.持久人物={characterId,generated};
    if(record.worldEra)created.state.人物.列表[unitId].扩展.时代来源=clone(record.worldEra);
    return {state:created.state,unitId,record,generated};
  }

  function temporaryPersona(record){
    // The entrant owns actual demographic data before any bracket or body is shown.
    // These identity hashes are independent of combat rolls and level.
    record.worldPersona={gender:stableHash(`${record.id}:gender`)%2?'女':'男',age:18+stableHash(`${record.id}:age`)%38};
    const art=genericVisuals.choose({id:record.id,...record.worldPersona,occupation:'魂师'});
    record.visualIdentity={genericVisual:{assetId:art.id,gender:art.gender,band:art.band}};
  }
  function makeTemporaryParticipant(venue, division, competitionId, index, requiredRingCount = null) {
    const draw = rng(`${competitionId}:${venue.id}:temporary:${index}`);
    const [soulName,archetype] = venue.martialSoulPool[Math.floor(draw.next() * venue.martialSoulPool.length) % venue.martialSoulPool.length];
    const level = integer(division.level - 2 + Math.floor(draw.next() * 5), division.minimumPlayerLevel, division.level);
    const id = `temporary-${venue.id}-${division.level}-${String(index + 1).padStart(2,'0')}-${stableHash(`${competitionId}:${index}`).toString(16)}`;
    const legacyName = `${venue.id==='arena-lanba'?'蓝霸':venue.shortName}临时魂师·${String(index + 1).padStart(2,'0')}`;
    const record = {
      id,name:'',periodLabel:'本届赛事参赛者',kind:'soul-master',battleCapable:true,level,locationId:venue.locationId,faction:venue.name,archetype,
      soul:soulName,skills:[],
      martialSouls:[{name:soulName,evidence:'deterministic-competition-generation'}],
      rings:{rule:'generated-for-competition',count:requiredRingCount === null ? defaultRingCount(level) : integer(requiredRingCount,0,9),evidence:'deterministic-competition-generation'},
       knownSkillNames:[],bones:[],soulBones:[],equipment:[],title:null,ai:{controller:'ai',policy:'strategic-utility-v2'},
      mapBinding:{locationId:venue.locationId,evidence:'competition-only'},
      completion:{identity:'competition-only',level:'division-bounded',attributes:'mechanical-completion',ringAges:'mechanical-completion',effectGraphs:'registered-code',missingCanonFields:'not-canon'},
      endgame:false
    };
    temporaryPersona(record);
    const name=record.name=generatePersonalName({seed:id,gender:record.worldPersona.gender});
    // Existing identity-derived attribute variation must not change with prose.
    record.mechanics = buildMechanics({...record,name:legacyName},[soulName]);
    // New tournament entrants have no authored historical skills. Compile their
    // ordinary rings from the actual source budget before assigning names and
    // descriptions; do not promise an area attack the source cannot afford.
    // The seventh-ring martial avatar remains an explicit mechanical contract.
    for(const loadout of record.mechanics.ringLoadouts)for(const ring of loadout.rings){
      if(ring.ordinal!==7)ring.skills=[];
    }
    return {id:`participant-${id}`,kind:'temporary',characterId:'',name,level,ringCount:record.rings.count,archetype,martialSoulName:soulName,temporaryRecord:record,venueId:venue.id};
  }

  function participantRecord(participant) {
    if (participant?.kind === 'temporary') return participant.temporaryRecord;
    if (participant?.kind === 'canon') return CHARACTER_CATALOG[participant.characterId];
    return null;
  }

  function instantiateCompetitionParticipant(rawState, participant, instanceId, options = {}) {
    if (!participant || participant.kind === 'player') throw new Error('主角不通过赛事NPC实例化入口创建');
    if(participant.kind==='resident'){
      const person=rawState.人物?.列表?.[participant.personId],record=eligibleCompetitionResident(rawState,participant.personId,COMPETITION_VENUES[participant.venueId],{level:participant.divisionLevel});
      if(!person?.扩展?.赛事人物||!record)throw new Error('已登记参赛者当前不符合参赛条件，不能重新生成覆盖');
      return {state:clone(rawState),record,unitId:person.id,generated:{borrowedResidentId:person.id}};
    }
    if (participant.kind === 'canon') {
      const unavailable=competitionCharacterBlockReason(rawState,participant.characterId);if(unavailable)throw new Error(unavailable);
      const residentId=persistentCharacterId(participant.characterId);
      if(options.usePersistent&&rawState.人物?.列表?.[residentId])return {state:clone(rawState),record:competitionCharacterRecord(rawState,participant.characterId),unitId:residentId,generated:{borrowedResidentId:residentId}};
      if(options.persistEncounter||options.usePersistent&&WORLD_STORY_PROFILES[participant.characterId]){const created=ensurePersistentCharacter(rawState,participant.characterId);return {...created,record:competitionCharacterRecord(created.state,participant.characterId),unitId:created.unitId,generated:{borrowedResidentId:created.unitId}};}
      return instantiateCharacter(rawState,participant.characterId,{instanceId});
    }
    let state = normalizeState(rawState);
    const record = participantRecord(participant);
    if (!record) throw new Error(`赛事参赛者不存在：${participant.id}`);
    const residentId=persistentCharacterId(record.id),person=state.人物.列表[residentId],resident=state.战斗单位.列表[residentId];
    if(options.usePersistent&&(person||resident)){
      if(person?.扩展?.赛事人物?.participantId!==participant.id||!sparCharacterRecord(state,residentId)||person.status==='dead'||resident?.存活状态!=='存活'||resident.资源.生命.当前<=0)throw new Error('赛事人物档案残缺或当前无法参赛，不能重新生成覆盖');
      return {state,record,unitId:residentId,generated:{borrowedResidentId:residentId}};
    }
    if(options.persistEncounter)instanceId=residentId;
    if (state.战斗单位.列表[instanceId]) throw new Error(`角色实例ID已存在：${instanceId}`);
    const instantiated = instantiateSoulMaster(state,record,instanceId);
    state = instantiated.state;
    // Finish the new entrant before its first saved/reconciled checkpoint.
    world.refreshEquipment(state,instanceId,false);
    if(options.persistEncounter){
      const person=state.人物.列表[instanceId],unit=state.战斗单位.列表[instanceId];
      for(const row of [person,unit,state.成长.列表[instanceId]])delete row.扩展.角色库ID;
      person.generatedBy='competition-encounter';person.identity='参赛魂师';person.appearance='';
      person.扩展.archetypeId=record.level<=30?'wandering-soul-master':record.level<=60?'seasoned-soul-master':record.level<=90?'high-soul-master':'titled-soul-master';
      person.扩展.赛事人物={participantId:participant.id,sourceRecordId:record.id};
      return {state,record,unitId:instanceId,generated:{borrowedResidentId:instanceId}};
    }
    return {state,record,unitId:instanceId,generated:instantiated.generated};
  }

  function venueBattleOptions(venue, leftId, rightId) {
    const left = venue.battlefield.left;
    const right = venue.battlefield.right;
    return {
      [leftId]:{距离区:left.zone,站位簇:`${venue.id}-left`,战场坐标:{x:left.x,y:left.y}},
      [rightId]:{距离区:right.zone,站位簇:`${venue.id}-right`,战场坐标:{x:right.x,y:right.y}}
    };
  }

  function applyVenueUnitState(state, venue, unitIds) {
    for (const unitId of unitIds) {
      const unit = state.战斗单位.列表[unitId];
      if (!unit) continue;
      unit.位置.地形标签 = list([...(unit.位置.地形标签 ?? []),venue.battlefield.tag]);
      unit.位置.掩体 = venue.battlefield.cover;
      unit.扩展.赛事场地 = {venueId:venue.id,theme:venue.theme,aiBias:clone(venue.favoredArchetypes)};
    }
    return state;
  }

  function removeGenerated(state, generated = {}) {
    for (const id of [...(generated.itemIds ?? []), ...(generated.soulBoneItemIds ?? [])]) {
      const item = state.物品.实例[id];
      const container = item && state.容器.列表[item.containerId];
      if (container) container.itemIds = container.itemIds.filter(itemId => itemId !== id);
      delete state.物品.实例[id];
    }
    for (const id of generated.skillIds ?? []) delete state.技能.列表[id];
    for (const id of generated.ringIds ?? []) delete state.魂环.列表[id];
    for (const id of generated.soulIds ?? []) delete state.武魂.列表[id];
    for (const id of generated.profileIds ?? []) delete state.魂兽档案.列表[id];
    for (const id of generated.unitIds ?? []) { delete state.战斗单位.列表[id]; delete state.成长.列表[id]; }
    for (const id of generated.personIds ?? []) delete state.人物.列表[id];
    for (const id of generated.walletIds ?? []) delete state.钱包.列表[id];
    for (const id of generated.containerIds ?? []) delete state.容器.列表[id];
    for (const id of generated.equipmentConfigIds ?? []) delete state.装备.配置[id];
    return state;
  }

  function slaughterTransaction(state, transactionId) {
    const id = clean(transactionId);
    const receipt = id ? state.杀戮场.processedTransactions[id] : null;
    return {id,receipt:receipt ? clone(receipt) : null};
  }

  function saveSlaughterReceipt(state, transactionId, receipt) {
    const id = clean(transactionId);
    if (id) state.杀戮场.processedTransactions[id] = clone(receipt);
    return receipt;
  }

  function combineGenerated(groups) {
    const combined = {unitIds:[],soulIds:[],ringIds:[],skillIds:[],profileIds:[],itemIds:[],soulBoneItemIds:[],personIds:[],walletIds:[],containerIds:[],equipmentConfigIds:[]};
    for (const group of groups) for (const key of Object.keys(combined)) combined[key].push(...(group?.[key] ?? []));
    return combined;
  }

  function makeSlaughterParticipant(run, playerLevel, bout, index, usedNames) {
    const draw = rng(`${run.seed}:bout:${bout}:opponent:${index}`);
    const [soulName,archetype] = SLAUGHTER_ARENA.martialSoulPool[Math.floor(draw.next() * SLAUGHTER_ARENA.martialSoulPool.length) % SLAUGHTER_ARENA.martialSoulPool.length];
    const [minimumOffset,maximumOffset] = SLAUGHTER_ARENA.levelOffsets[bout - 1];
    const level = integer(playerLevel + minimumOffset + Math.floor(draw.next() * (maximumOffset - minimumOffset + 1)),1,99);
    const suffix = `${bout}-${String(index + 1).padStart(2,'0')}-${stableHash(`${run.id}:${bout}:${index}`).toString(16)}`;
    const id = `slaughter-${suffix}`;
    const legacyName = `堕落魂师·${String(bout).padStart(2,'0')}${String(index + 1).padStart(2,'0')}`;
    const record = {
      id,name:'',periodLabel:`地狱杀戮场第${bout}场`,kind:'soul-master',battleCapable:true,level,locationId:SLAUGHTER_ARENA.locationId,faction:`杀戮场独立阵营-${suffix}`,archetype,
      soul:soulName,skills:[],
      martialSouls:[{name:soulName,evidence:'deterministic-slaughter-generation'}],rings:{rule:'generated-but-locked-in-slaughter',count:defaultRingCount(level),evidence:'deterministic-slaughter-generation'},
       knownSkillNames:[],bones:[],soulBones:[],equipment:index % 3 === 0 ? ['杀戮场制式短刃'] : [],title:null,ai:{controller:'ai',policy:'strategic-utility-v2'},
      mapBinding:{locationId:SLAUGHTER_ARENA.locationId,evidence:'slaughter-only'},completion:{identity:'slaughter-only',level:'bout-relative',attributes:'mechanical-completion',ringAges:'mechanical-completion',effectGraphs:'registered-code',missingCanonFields:'not-canon'},endgame:false
    };
    temporaryPersona(record);
    const name=record.name=generatePersonalName({seed:id,gender:record.worldPersona.gender,usedNames});
    usedNames.add(name);
    record.mechanics = buildMechanics({...record,name:legacyName},[soulName]);
    return {id:`participant-${id}`,kind:'temporary',characterId:'',name,level,archetype,martialSoulName:soulName,temporaryRecord:record,venueId:SLAUGHTER_ARENA.id};
  }

  function slaughterSoulBoneCarryChance(levelInput) {
    const level = integer(levelInput,1,99);
    return Number(Math.min(
      SLAUGHTER_ARENA.opponentSoulBoneCarryMaximumChance,
      SLAUGHTER_ARENA.opponentSoulBoneCarryBaseChance + level * SLAUGHTER_ARENA.opponentSoulBoneCarryPerLevel
    ).toFixed(6));
  }

  function attachSlaughterSoulBone(state, run, participant, unitId, bout, index) {
    const chance = slaughterSoulBoneCarryChance(participant.level);
    const roll = (stableHash(`${run.seed}:bout:${bout}:opponent:${index}:soul-bone-carrier`) % 1000000) / 1000000;
    if (roll >= chance) return {state,carrier:null,roll,chance};
    const walletId = `wallet-${unitId}`;
    const inventoryContainerId = `container-${unitId}-inventory`;
    state.人物.列表[unitId] = {
      id:unitId,tier:'full',name:participant.name,identity:'地狱杀戮场堕落魂师',occupation:'魂师',faction:`杀戮场独立阵营-${unitId}`,
      age:participant.temporaryRecord.worldPersona?.age??0,gender:participant.temporaryRecord.worldPersona?.gender??'未知',appearance:'杀戮场临时参赛者',personality:'敌对',locationId:SLAUGHTER_ARENA.locationId,
      walletId,inventoryContainerId,equipmentConfigId:unitId,combatantId:unitId,generatedBy:'slaughter-soul-bone-carrier',seed:`${run.seed}:${bout}:${index}`,status:'active',扩展:{slaughterRunId:run.id,bout,...clone(participant.temporaryRecord.visualIdentity??{})}
    };
    people.initialize(state,unitId);
    state.钱包.列表[walletId] = {id:walletId,ownerEntityId:unitId,gold:0,扩展:{slaughterTemporary:true}};
    state.容器.列表[inventoryContainerId] = {id:inventoryContainerId,type:'inventory',ownerEntityId:unitId,locationId:SLAUGHTER_ARENA.locationId,itemIds:[],capacity:{infinite:true},status:'active',扩展:{slaughterTemporary:true}};
    state.装备.配置[unitId] = {
      entityId:unitId,slots:Object.fromEntries(world.EQUIPMENT_SLOTS.map(slot=>[slot,''])),soulBoneSlots:Object.fromEntries(world.SOUL_BONE_SLOTS.map(slot=>[slot,''])),
      appliedModifiers:{attributes:{},resistances:[]},扩展:{slaughterTemporary:true}
    };
    const slot = world.SOUL_BONE_SLOTS.slice(0,6)[stableHash(`${run.seed}:${bout}:${index}:soul-bone-slot`) % 6];
    const years = integer(Math.max(1000,participant.level * 850),1000,100000);
    const profile = {
      id:`slaughter-bone-profile-${run.id}-${bout}-${index + 1}`,名称:`${participant.name}遗留`,年限:years,
      完整度:1,属性谱:{主属性:['暗']}
    };
    profile.血脉=foundation.BEAST_VALUE.sourceLineage(profile);
    const item = world.createSoulBoneItem(state,{
      id:`slaughter-carried-bone-${run.id}-${bout}-${index + 1}`,profile,slot,ownerEntityId:unitId,containerId:inventoryContainerId,
      seed:`${run.seed}:${bout}:${index}:soul-bone-item`,name:`${participant.name}的${slot}`,
      provenance:{type:'soul-master-carried-bone',runId:run.id,bout,formerOwnerEntityId:unitId},
      payloadExtra:{slaughterCarried:true,runId:run.id,bout,formerOwnerEntityId:unitId}
    });
    const fused = world.fuseSoulBone(state,{entityId:unitId,itemId:item.id},`slaughter-fuse-${run.id}-${bout}-${index + 1}`);
    const fusedItem = fused.state.物品.实例[item.id];
    return {state:fused.state,carrier:{unitId,itemId:item.id,slot,years,budget:fusedItem.payload.valueLedger.totalBudget,skillIds:clone(fusedItem.扩展.grantedSkillIds ?? []),chance,roll},roll,chance};
  }

  function slaughterPositions(participantIds) {
    const positions = {};
    for (const [index,unitId] of participantIds.entries()) {
      const angle = Math.PI / 2 + index * Math.PI * 2 / participantIds.length;
      positions[unitId] = {距离区:'近距',站位簇:`slaughter-seat-${index + 1}`,战场坐标:{x:Number((50 + Math.cos(angle) * 32).toFixed(3)),y:Number((50 + Math.sin(angle) * 32).toFixed(3))}};
    }
    return positions;
  }

  function slaughterBoutLoot(run, bout) {
    const loot = [{templateId:bout % 2 ? 'slaughter-blood-crystal' : 'slaughter-black-iron',quantity:bout + 1,name:bout % 2 ? '杀戮血晶' : '染血玄铁',kind:'material'}];
    if (bout >= 2) loot.push({templateId:'slaughter-blood-pill',quantity:Math.ceil(bout / 2),name:'血息丸',kind:'pill'});
    if (bout === 3) loot.push({templateId:'slaughter-blood-blade',quantity:1,name:'杀戮场缴获·血纹短刃',kind:'equipment'});
    if (bout === 4) loot.push({templateId:'slaughter-hidden-blade',quantity:1,name:'杀戮场缴获·夺命袖刃',kind:'hidden-weapon'});
    return loot;
  }

  function clearSlaughterStatuses(state, run) {
    const keep = new Set(run.entryStatusIds ?? []);
    for (const [statusId,status] of Object.entries(state.状态实例.列表 ?? {})) {
      if (status.目标单位ID === run.playerId && !keep.has(statusId)&&!foundation.CONTROL_CORE.persistent(status)) combat.removeStatus(state,status,'slaughter-bout-cleared');
    }
  }

  function awardSlaughterLoot(state, run) {
    const person = state.人物.列表[run.playerId];
    const inventoryId = person?.inventoryContainerId;
    if (!inventoryId) throw new Error('主角背包不存在，无法发放杀戮场奖励');
    const itemIds = [];
    for (const [index,descriptor] of run.tempLoot.entries()) {
      const common = {id:`slaughter-reward-${run.id}-${index + 1}`,name:descriptor.name,quantity:descriptor.quantity,forceUnique:descriptor.kind !== 'material' && descriptor.kind !== 'pill',provenance:{type:'slaughter-city-clear',runId:run.id,boutCount:run.totalBouts},扩展:{slaughterReward:true}};
      itemIds.push(world.createItem(state,descriptor.templateId,run.playerId,inventoryId,{...common,overflow:'stash',stashLocationId:run.locationId}).id);
    }
    return itemIds;
  }

  function startSlaughterBout(rawState, transactionId = 'start-slaughter-bout') {
    let state = normalizeState(rawState);
    const guard = slaughterTransaction(state,transactionId);
    if (guard.receipt) return {state,receipt:guard.receipt,idempotent:true};
    const run = state.杀戮场.当前;
    const playerId = state.角色?.主控单位ID;
    if (!run || run.type !== 'slaughter-five' || run.status !== 'between-bouts') throw new Error('当前没有可以继续的杀戮场死斗');
    if (run.locationId !== state.地图.当前地点ID || state.地图.当前地点ID !== SLAUGHTER_ARENA.locationId) throw new Error('杀戮场死斗只能在地狱杀戮场继续');
    if (state.战斗?.状态 === '进行中') throw new Error('已有进行中的战斗');
    const position=positions.positionOf(state,playerId);if(position.kind!=='location'||position.sceneId)throw Error('请实际抵达竞技场所后参加');
    const block = world.worldActionBlockReason(state,{allowActivities:['slaughter']});
    if (block) throw new Error(block);
    const player = state.战斗单位.列表[playerId];
    if (!player || player.存活状态 !== '存活' || player.资源.生命.当前 <= 0) throw new Error('主角已经无法继续死斗');
    const bout = run.nextBout;
    if (bout < 1 || bout > SLAUGHTER_ARENA.totalBouts) throw new Error('杀戮场场次状态非法');
    const playerLevel = state.成长.列表[playerId]?.魂力等级 ?? player.派生.有效等级;
    const usedNames=new Set([...Object.values(state.人物.列表).map(person=>person.name),...worldCharacterRecords(state).map(record=>record.name)]);
    const participants = Array.from({length:SLAUGHTER_ARENA.opponentsPerBout},(_,index)=>makeSlaughterParticipant(run,playerLevel,bout,index,usedNames));
    const generatedGroups = [];
    const opponentIds = [];
    const soulBoneCarriers = [];
    for (const [index,participant] of participants.entries()) {
      const instanceId = `slaughter-unit-${run.id}-${bout}-${index + 1}`;
      const instantiated = instantiateCompetitionParticipant(state,participant,instanceId);
      state = instantiated.state;
      generatedGroups.push(instantiated.generated);
      opponentIds.push(instanceId);
      const attached = attachSlaughterSoulBone(state,run,participant,instanceId,bout,index);
      state = attached.state;
      if (attached.carrier) soulBoneCarriers.push(attached.carrier);
    }
    const participantIds = [playerId,...opponentIds];
    const participantConfigs = {[playerId]:{sideId:'player',sideName:'主角',controller:'player',canFlee:false,morale:100}};
    for (const [index,unitId] of opponentIds.entries()) participantConfigs[unitId] = {sideId:`slaughter-side-${bout}-${index + 1}`,sideName:participants[index].name,controller:'ai',canFlee:false,morale:100};
    const started = combat.startBattle(state,{
      battleKind:'lethal',id:`slaughter-battle-${run.id}-${bout}`,participantIds,participantConfigs,positions:slaughterPositions(participantIds),signals:['主动攻击'],force:true,
      seed:`${run.seed}:bout:${bout}`,objective:`地狱杀戮场第${bout}场：十人自由死斗，仅一人生还`,
      rules:{fatalOnDefeat:true,soulSkillsLocked:true,freeForAll:true,playerDefeatEndsBattle:true,preservePlayerStatuses:true,noDraw:true,noPhase:true}
    });
    started.state.战斗.扩展.竞技 = {mode:'slaughter-city',runId:run.id,bout,totalBouts:SLAUGHTER_ARENA.totalBouts,opponentIds:clone(opponentIds),soulSkillsLocked:true,noRewardPerBout:true,noPhase:true};
    const active = started.state.杀戮场.当前;
    active.status = 'in-bout';
    active.match = {transactionId,bout,battleId:started.state.战斗.id,opponentIds,participants,generated:combineGenerated(generatedGroups),soulBoneCarriers};
    const receipt = {id:transactionId,type:'slaughter-bout-started',runId:run.id,bout,totalBouts:SLAUGHTER_ARENA.totalBouts,battleId:started.state.战斗.id,opponentIds,levelRange:[Math.min(...participants.map(item=>item.level)),Math.max(...participants.map(item=>item.level))],soulBoneCarriers:clone(soulBoneCarriers),summary:`地狱杀戮场第${bout}场开始：主角与9名独立阵营堕落魂师自由死斗；魂环魂技封禁，魂骨技能保留，持有者死亡时融合魂骨成为战利品`};
    started.receipt = saveSlaughterReceipt(started.state,transactionId,receipt);
    return started;
  }

  function beginSlaughterRun(rawState, options = {}, transactionId = 'start-slaughter-run') {
    let state = normalizeState(rawState);
    const guard = slaughterTransaction(state,transactionId);
    if (guard.receipt) return {state,receipt:guard.receipt,idempotent:true};
    const playerId = assertPlayerReady(state);
    if (state.地图.当前地点ID !== SLAUGHTER_ARENA.locationId) throw new Error('只能在地狱杀戮场进入五场死斗');
    const existing = state.杀戮场.当前;
    if (existing && !['completed','failed'].includes(existing.status)) throw new Error('已有未结束的杀戮场死斗');
    const player = state.战斗单位.列表[playerId];
    if (player.资源.生命.当前 <= 0 || player.存活状态 !== '存活') throw new Error('主角当前无法进入杀戮场');
    const id = clean(options.id) || clean(transactionId) || `slaughter-run-${state.系统.revision + 1}`;
    const seed = clean(options.seed) || id;
    const playerLevel = state.成长.列表[playerId]?.魂力等级 ?? player.派生.有效等级;
    state.杀戮场.当前 = {
      id,type:'slaughter-five',status:'between-bouts',playerId,playerLevel,locationId:SLAUGHTER_ARENA.locationId,totalBouts:SLAUGHTER_ARENA.totalBouts,nextBout:1,wins:0,
      tempExperience:0,tempLoot:[],tempSoulBoneItemIds:[],boutHistory:[],match:null,seed,
      entryStatusIds:Object.values(state.状态实例.列表 ?? {}).filter(status=>status.目标单位ID === playerId).map(status=>status.id),createdRevision:state.系统.revision,historyRecorded:false,reward:null
    };
    state.历史.push({type:'slaughter-run-started',runId:id,locationId:SLAUGHTER_ARENA.locationId,playerLevel});
    state.系统.revision += 1;
    const started = startSlaughterBout(state,`${transactionId}:bout-1`);
    const receipt = {id:transactionId,type:'slaughter-run-started',runId:id,bout:1,battleId:started.state.战斗.id,summary:'地狱杀戮场五场死斗已经开始；无逃跑、无中途结算，生命、魂力、状态、耐久与消耗品跨场继承'};
    started.receipt = saveSlaughterReceipt(started.state,transactionId,receipt);
    return started;
  }

  function assertPlayerReady(state, allowActivities = [], historicalProjection = false) {
    const playerId = state.角色?.主控单位ID;
    if (!state.角色?.已建立 || !state.战斗单位?.列表?.[playerId]) throw new Error('请先建立主角');
    if (state.战斗?.状态 === '进行中') throw new Error('已有进行中的战斗');
    const position=positions.positionOf(state,playerId);
    if(!historicalProjection&&(position.kind!=='location'||position.sceneId))throw Error(`请实际抵达竞技场所后参加；${position.kind==='transit'?'请先完成当前行程':position.kind==='contained'?'请先离开容纳器，回到公共通道':'请先离开当前房间，回到公共通道'}`);
    const block = world.worldActionBlockReason(state,{allowActivities});
    if (block) throw new Error(block);
    if (state.切磋?.当前 || state.比赛?.当前?.match || (state.杀戮场?.当前 && !['completed','failed'].includes(state.杀戮场.当前.status)) || state.终局挑战?.当前) throw new Error('请先完成当前竞技对局');
    return playerId;
  }

  function previewEndgameChallenge(rawState, characterId) {
    const state = normalizeState(rawState);
    const requested = CHARACTER_CATALOG[characterId];
    const record = CHARACTER_CATALOG[requested?.endgameEntryId];
    const reasons = [];

    const block = world.worldActionBlockReason(state);
    if (block) reasons.push(block);
    if (!requested?.endgame || !record || !ENDGAME_IDS.includes(record.id)) reasons.push('这位对手没有终局挑战');
    const playerId = state.角色?.主控单位ID;
    const level = Number(state.成长?.列表?.[playerId]?.魂力等级 ?? 0);
    const ringCount = playerId ? unitHighestRingCount(state,playerId) : 0;
    try{assertPlayerReady(state,[],true);}catch(error){reasons.push(error.message);}
    return {available:!reasons.length,reasons:[...new Set(reasons)],characterId:record?.id ?? '',name:record?.name ?? '终局对手',
      locationId:record?.locationId ?? '',locationName:world.LOCATION_TEMPLATES[record?.locationId]?.name ?? '',
      level,ringCount,scope:'historical-projection',guidance:[],victory:clone(state.终局挑战.成就[record?.id] ?? null)};
  }

  function sparCharacterRecord(state, characterId) {
    const requested=worldCharacterRecord(characterId,state),requestedUnit=state.战斗单位?.列表?.[characterId];
    const canonical=requested??(requestedUnit?.扩展?.持久人物?worldCharacterRecord(requestedUnit.扩展.角色库ID,state):null);
    if(canonical){
      const personId=persistentCharacterId(canonical.id);
      if(!requested&&personId!==characterId)return null;
      const person=state.人物?.列表?.[personId],unit=state.战斗单位?.列表?.[personId];
      if(!person&&!unit)return {...canonical,locationId:worldCharacterLocation(state,canonical.id)};
      const level=state.成长?.列表?.[personId]?.魂力等级;
      if(canonical.worldEra&&person?.扩展?.时代来源?.epoch!==canonical.worldEra.epoch)return null;
      if(!person||person.tier!=='full'||person.combatantId!==personId||!unit||unit.单位种类!=='魂师NPC'||unit.扩展?.角色库ID!==canonical.id||!unit.扩展?.持久人物||!Number.isSafeInteger(level)||level<1||level>99)return null;
      return {...canonical,name:person.name,level,locationId:person.locationId};
    }
    const person=state.人物?.列表?.[characterId],unit=state.战斗单位?.列表?.[characterId];
    if (!person || person.tier!=='full' || !unit || unit.单位种类!=='魂师NPC' || !world.NPC_ARCHETYPES[person.扩展?.archetypeId]) return null;
    const level=state.成长?.列表?.[characterId]?.魂力等级;
    if (!Number.isSafeInteger(level) || level<1 || level>99) return null;
    return {id:characterId,name:person.name,level,locationId:person.locationId,kind:'soul-master',battleCapable:true,sparEligible:true,persistentGenerated:true};
  }

  function previewSparExperience(state, characterId) {
    const record = sparCharacterRecord(state,characterId);
    const playerId = state.角色?.主控单位ID;
    const level = state.成长?.列表?.[playerId]?.魂力等级;
    if (!record?.sparEligible || !level) return 0;
    return cycle.scaleExperienceReward(cycle.baseExperienceForLevels(record.level, level) * 0.5);
  }

  function assertDuelEntry(state, requestedRecord, mode, characterId) {
    const playerId = assertPlayerReady(state,[],mode==='endgame');
    if (!requestedRecord?.battleCapable) throw new Error('目标不是可战斗角色');
    if (mode === 'spar' && !requestedRecord.sparEligible) throw new Error(`${requestedRecord.name}为99级终局对手，只能通过终局挑战交手`);
    const residentId=requestedRecord.persistentGenerated?requestedRecord.id:persistentCharacterId(requestedRecord.id),resident=state.人物.列表[residentId],residentUnit=state.战斗单位.列表[residentId];
    if (mode==='spar' && residentId===playerId) throw new Error('不能与自己切磋');
    if (mode === 'spar' && (resident?!positions.colocated(state,playerId,residentId):requestedRecord.locationId!==state.人物.列表[playerId].locationId)) throw new Error(`${requestedRecord.name}不在当前地点`);
    if (mode === 'spar' && (resident?.status==='dead'||residentUnit&&(residentUnit.存活状态!=='存活'||residentUnit.资源.生命.当前<=0)))throw new Error('这位人物当前无法切磋');
    const resolvedCharacterId = mode === 'endgame' ? requestedRecord.endgameEntryId : requestedRecord.id;
    const record = mode==='spar'?requestedRecord:CHARACTER_CATALOG[resolvedCharacterId];
    if (mode === 'endgame' && (!requestedRecord.endgame || !record || !ENDGAME_IDS.includes(record.id))) throw new Error('该角色不是99级终局对手');
    if (mode === 'endgame') {
      const preview = previewEndgameChallenge(state,characterId);
      if (!preview.available) throw new Error(preview.reasons.join('；'));
    }
    return {playerId,resolvedCharacterId,record};
  }

  function previewSparAvailability(rawState, characterId) {
    const state=clone(rawState);
    const record=sparCharacterRecord(state,characterId);
    try {
      const unavailable=worldCharacterUnavailableReason(record?.id??characterId,state);
      if(unavailable)throw new Error(unavailable);
      assertDuelEntry(state,record,'spar',characterId);
      return {available:true,reason:null};
    } catch(error) {
      return {available:false,reason:String(error.message??error)};
    }
  }

  function startDuel(rawState, characterId, mode, transactionId) {
    // Read the supplied persistent facts before normalization can fill missing growth defaults.
    const requestedRecord = mode==='spar'?sparCharacterRecord(rawState,characterId):CHARACTER_CATALOG[characterId];
    if(mode==='spar'){const unavailable=worldCharacterUnavailableReason(requestedRecord?.id??characterId,rawState);if(unavailable)throw new Error(unavailable);}
    const state = normalizeState(rawState);
    const {playerId,resolvedCharacterId,record}=assertDuelEntry(state,requestedRecord,mode,characterId);
    const persistent=mode==='spar'&&record.kind!=='soul-beast';
    const reality=mode==='endgame'?clone(state):null;
    const instantiated = record.persistentGenerated?{state,unitId:record.id,generated:{}}:persistent?ensurePersistentCharacter(state,resolvedCharacterId):instantiateCharacter(state,resolvedCharacterId,{instanceId:`historical-unit-${resolvedCharacterId}`,instanceKey:`historical-${resolvedCharacterId}`,historicalLoadout:mode==='endgame'});
    const opponentId = instantiated.unitId;
    if(reality){
      // A historical encounter uses the registered dossier verbatim, including
      // its approved inferred labels. It does not create a new person's voice.
      for(const id of instantiated.generated.skillIds??[])instantiated.state.技能.列表[id].namingSource='preset';
      for(const id of instantiated.generated.soulIds??[])instantiated.state.武魂.列表[id].扩展.baseActionNaming={source:'preset',scope:'historical-projection',recordId:record.id};
    }
    const recovery=captureArenaRecovery(instantiated.state,[playerId,opponentId],persistent?{}:instantiated.generated);
    const configs = {
      [playerId]:{sideId:'player',sideName:'主角',controller:'player',canFlee:false,morale:100},
      [opponentId]:{sideId:'opponent',sideName:record.name,controller:'ai',canFlee:false,morale:100}
    };
    const started = combat.startBattle(instantiated.state,{battleKind:'sparring',id:`${mode}-battle-${stableHash(`${transactionId}:${state.系统.revision}`)}`,participantIds:[playerId,opponentId],includeWorldSummons:mode!=='endgame',participantConfigs:configs,signals:['主动攻击'],force:true,seed:`${mode}:${transactionId}:${resolvedCharacterId}`,objective:'一对一击败对手',rules:{nonlethal:true,surrender:{enabled:true,minimumRound:mode==='endgame'?16:1,playerOnly:true}}});
    const victoryExperience = mode === 'spar' ? previewSparExperience(state, resolvedCharacterId) : 0;
    started.state.战斗.扩展.竞技 = {mode,...(reality?{scope:'historical-projection',playerId,description:'与历史投影单独交锋。胜利记入战绩，败北则角色死亡。'}:{}),characterId:resolvedCharacterId,requestedCharacterId:requestedRecord.id,opponentId,noReward:mode !== 'spar',noPhase:true};
    if(reality)started.state.战斗单位.列表[opponentId].扩展.历史投影={scope:'historical-projection',battleId:started.state.战斗.id,characterId:resolvedCharacterId,playerId};
    const current = {id:clean(transactionId) || `${mode}-${started.state.系统.revision}`,mode,characterId:resolvedCharacterId,requestedCharacterId:requestedRecord.id,opponentId,battleId:started.state.战斗.id,recovery,...(reality?{projection:{version:1,defeatPolicy:'death',scope:'historical-projection',realityHash:abilities.hash(reality),reality}}:{}),startedRevision:started.state.系统.revision};
    if (mode === 'spar') started.state.切磋.当前 = current;
    else started.state.终局挑战.当前 = current;
    started.receipt = {type:mode === 'spar' ? 'spar-started' : 'endgame-challenge-started',battleId:started.state.战斗.id,characterId:resolvedCharacterId,requestedCharacterId:requestedRecord.id,opponentId,mode,noReward:mode !== 'spar',noPhase:true,...(mode === 'spar' ? {victoryExperience} : {}),summary:`${mode === 'spar' ? '开始与' : '发起历史投影挑战：'}${record.name}的一对一战斗`};
    return started;
  }

  function startSpar(rawState, characterId, transactionId = 'start-spar') {
    return startDuel(rawState,characterId,'spar',transactionId);
  }

  function startEndgameChallenge(rawState, characterId, transactionId = 'start-endgame') {
    return startDuel(rawState,characterId,'endgame',transactionId);
  }

  function validateHistoricalProjection(state, validateReality) {
    const errors=[],session=state.终局挑战?.当前,context=state.战斗?.扩展?.竞技;
    const projected=Object.values(state.战斗单位?.列表??{}).filter(unit=>unit.扩展?.历史投影);
    if(!session&&context?.scope!=='historical-projection'&&!projected.length)return errors;
    try{
      const p=session?.projection,record=CHARACTER_CATALOG[session?.characterId],playerId=state.角色?.主控单位ID;
      if(!session||session.mode!=='endgame'||p?.version!==1||p.scope!=='historical-projection'||!ENDGAME_IDS.includes(record?.id)||context?.scope!==p.scope||context.mode!=='endgame'||context.characterId!==record.id||context.playerId!==playerId||context.opponentId!==session.opponentId||session.battleId!==state.战斗?.id)throw Error('历史投影的场次记录不完整');
      const marker=state.战斗单位?.列表?.[session.opponentId]?.扩展?.历史投影;
      if(projected.length!==1||marker?.scope!==p.scope||marker.characterId!==record.id||marker.battleId!==session.battleId||marker.playerId!==playerId||!state.战斗.扩展?.成员?.[playerId]||!state.战斗.扩展?.成员?.[session.opponentId])throw Error('历史投影的参战者与场次不符');
      const reality=p.reality;
      if(!reality||typeof reality!=='object'||p.realityHash!==abilities.hash(reality)||reality.角色?.主控单位ID!==playerId||reality.终局挑战?.当前||reality.战斗?.扩展?.竞技?.scope==='historical-projection'||Object.values(reality.战斗单位?.列表??{}).some(unit=>unit.扩展?.历史投影))throw Error('历史投影缺少完整的现实返回记录');
      const tables={unitIds:reality.战斗单位?.列表,soulIds:reality.武魂?.列表,ringIds:reality.魂环?.列表,skillIds:reality.技能?.列表,profileIds:reality.魂兽档案?.列表,itemIds:reality.物品?.实例,personIds:reality.人物?.列表,walletIds:reality.钱包?.列表,containerIds:reality.容器?.列表,equipmentConfigIds:reality.装备?.配置};
      if(session.opponentId!==`historical-unit-${record.id}`||!session.recovery?.generated?.unitIds?.includes(session.opponentId))throw Error('历史投影实例不完整');
      for(const [key,table] of Object.entries(tables))if(!table||!Array.isArray(session.recovery.generated[key])||session.recovery.generated[key].some(id=>table[id]))throw Error('历史投影与现实记录重名');
      const validation=validateReality(reality);
      if(!validation.pass)throw Error('历史投影的现实返回记录无效：'+validation.errors.join('；'));
    }catch(error){errors.push(error.message);}
    return errors;
  }

  function competitionDivisionForPlayer(levelInput) {
    const level = integer(levelInput,1,99);
    return clone(Object.values(COMPETITION_LEVELS).find(item => level >= item.minimumPlayerLevel && level <= item.maximumPlayerLevel) ?? null);
  }

  function shuffleDeterministic(values, seed) {
    const result = [...values];
    const draw = rng(seed);
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(draw.next() * (index + 1));
      [result[index],result[swap]] = [result[swap],result[index]];
    }
    return result;
  }

  function recordHighestRingCount(record) {
    return Math.max(0,...(record?.mechanics?.ringLoadouts ?? []).map(loadout => Array.isArray(loadout?.rings)?loadout.rings.length:0));
  }

  function unitHighestRingCount(state, unitId) {
    return Math.max(0,...foundation.ownedMartialSoulIds(state,unitId).map(soulId => list(state.武魂?.列表?.[soulId]?.魂环ID列表).length));
  }

  function competitionSpaceBlocked(state,id){
    if(!state.人物?.列表?.[id])return false;const p=positions.positionOf(state,id);
    return p.kind!=='location'||!!p.sceneId||!!world.personalActionBlockReason(state,{actorId:id})||!!logistics.busyReason(state,id)||!!globalThis.SoulRescueCore?.busyReason(state,id);
  }
  function competitionCharacterBlockReason(state,characterId) {
    const blocked=persistentCharacterBlockReason(state,characterId);if(blocked)return blocked;
    const id=persistentCharacterId(characterId),person=state.人物?.列表?.[id],unit=state.战斗单位?.列表?.[id];
    if(!person&&!unit)return '';
    if(id===state.角色?.主控单位ID)return '主角不能作为自己的赛事对手';
    if(competitionSpaceBlocked(state,id))return '这位人物须先结束看管或行程，实际回到公共场所才能参赛';
    if(!person||!unit||!sparCharacterRecord(state,characterId))return '已登记参赛人物的档案不完整，不能重新生成覆盖';
    if(person.status==='dead'||unit.存活状态!=='存活'||unit.资源?.生命?.当前<=0)return '这位人物当前无法参赛';
    return '';
  }
  function competitionCharacterRecord(state,characterId) {
    const record=worldCharacterRecord(characterId,state),id=persistentCharacterId(characterId),person=state.人物?.列表?.[id];
    if(!person)return record;
    const live=sparCharacterRecord(state,characterId);if(!live)return null;
    return {...live,competitionRingCount:unitHighestRingCount(state,id),martialSouls:foundation.ownedMartialSoulIds(state,id).map(soulId=>({name:state.武魂.列表[soulId].名称}))};
  }
  function competitionCandidates(state, seed, venueInput, divisionInput) {
    const venue = typeof venueInput === 'string' ? COMPETITION_VENUES[venueInput] : venueInput;
    const division = typeof divisionInput === 'number' ? COMPETITION_LEVELS[divisionInput] : divisionInput;
    if (!venue || !division) return [];
    const requiredRingCount = unitHighestRingCount(state,state.角色?.主控单位ID);
    const identities=new Set();
    return worldCharacterRecords(state)
      .filter(item=>!competitionCharacterBlockReason(state,item.id))
      .map(item=>competitionCharacterRecord(state,item.id))
      .filter(item => item?.kind === 'soul-master' && item.battleCapable && (item.competitionRingCount??recordHighestRingCount(item)) === requiredRingCount && Math.abs(item.level - division.level) <= 5)
      .sort((left,right) => {
        const leftVenue = venue.favoredArchetypes.indexOf(left.archetype);
        const rightVenue = venue.favoredArchetypes.indexOf(right.archetype);
        const leftScore = leftVenue < 0 ? 99 : leftVenue;
        const rightScore = rightVenue < 0 ? 99 : rightVenue;
        return Math.abs(left.level-division.level)-Math.abs(right.level-division.level) || leftScore - rightScore || stableHash(`${seed}:${left.id}`)-stableHash(`${seed}:${right.id}`);
      }).filter(record=>{const identity=worldCharacterIdentityId(record.id);if(identities.has(identity))return false;identities.add(identity);return true;});
  }

  function eligibleCompetitionResident(state,personId,venue,division){
    const person=state.人物?.列表?.[personId],unit=state.战斗单位?.列表?.[personId];
    if(!venue||!person?.扩展?.赛事人物||person.id===state.角色?.主控单位ID||person.locationId!==venue.locationId||person.status==='dead'||unit?.存活状态!=='存活'||unit.资源.生命.当前<=0)return null;
    if(competitionSpaceBlocked(state,personId))return null;
    const record=sparCharacterRecord(state,personId);
    return record&&Math.abs(record.level-division.level)<=5&&unitHighestRingCount(state,personId)===unitHighestRingCount(state,state.角色.主控单位ID)?record:null;
  }
  function unusedCompetitionName(preferred,used,seed,gender){
    if(!used.has(preferred))return preferred;
    return generatePersonalName({seed,gender,usedNames:used});
  }
  function buildCompetitionParticipants(state, id, venue, division, seed) {
    const playerId = state.角色.主控单位ID;
    const player = state.战斗单位.列表[playerId];
    const requiredRingCount = unitHighestRingCount(state,playerId);
    const residents=Object.keys(state.人物.列表).map(personId=>eligibleCompetitionResident(state,personId,venue,division)).filter(Boolean)
      .sort((left,right)=>Math.abs(left.level-division.level)-Math.abs(right.level-division.level)||stableHash(`${seed}:${left.id}`)-stableHash(`${seed}:${right.id}`)).slice(0,15).map(record=>({
        id:`participant-${record.id}`,kind:'resident',personId:record.id,characterId:record.id,name:record.name,level:record.level,ringCount:unitHighestRingCount(state,record.id),archetype:state.人物.列表[record.id].扩展.archetypeId,
        martialSoulName:foundation.ownedMartialSoulIds(state,record.id).map(soulId=>state.武魂.列表[soulId].名称).join(' / '),venueId:venue.id,divisionLevel:division.level
      }));
    const canon = competitionCandidates(state,seed,venue,division).slice(0,15-residents.length).map(record => ({
      id:`participant-canon-${record.id}`,kind:'canon',characterId:record.id,name:record.name,level:record.level,ringCount:record.competitionRingCount??recordHighestRingCount(record),archetype:record.archetype,martialSoulName:record.martialSouls.map(item => item.name).join(' / '),venueId:venue.id
    }));
    const usedNames=new Set([...Object.values(state.人物.列表).map(person=>person.name),...worldCharacterRecords(state).map(record=>record.name),
      ...(state.比赛.历史??[]).flatMap(competition=>(competition.participants??[]).map(person=>person.name)),...(state.比赛.当前?.participants??[]).map(person=>person.name)]);
    const temporary = [];
    while (canon.length + residents.length + temporary.length < 15){
      const participant=makeTemporaryParticipant(venue,division,id,temporary.length,requiredRingCount);
      participant.name=unusedCompetitionName(participant.name,usedNames,`${seed}:${participant.id}`,participant.temporaryRecord.worldPersona.gender);participant.temporaryRecord.name=participant.name;
      usedNames.add(participant.name);temporary.push(participant);
    }
    const opponents = shuffleDeterministic([...residents,...canon,...temporary],`${seed}:${id}:opponents`);
    const protagonist = {id:'participant-player',kind:'player',characterId:'',name:player.名称,level:state.成长.列表[playerId]?.魂力等级 ?? player.派生.有效等级,ringCount:requiredRingCount,archetype:'player',martialSoulName:'主角武魂',venueId:venue.id};
    return shuffleDeterministic([protagonist,...opponents],`${seed}:${id}:bracket`);
  }

  function makeBracket(participants) {
    const rounds = COMPETITION_ROUNDS.map((round,roundIndex) => ({
      id:round.id,label:round.label,matches:Array.from({length:round.matchCount},(_,index) => ({
        id:`${round.id}-M${index + 1}`,roundId:round.id,roundIndex,index,participantIds:roundIndex === 0 ? [participants[index * 2].id,participants[index * 2 + 1].id] : ['', ''],winnerId:'',status:'pending',result:null
      }))
    }));
    return {rounds,totalMatches:15,resolvedMatches:0};
  }

  function bracketMatch(competition, matchId) {
    for (const round of competition.bracket.rounds) {
      const match = round.matches.find(item => item.id === matchId);
      if (match) return match;
    }
    return null;
  }

  function participantById(competition, participantId) {
    return competition.participants.find(item => item.id === participantId) ?? null;
  }

  function settleBracketMatch(competition, match, winnerId, result) {
    if (match.status==='completed') {
      if (match.winnerId !== winnerId) throw new Error(`赛事对局${match.id}已由另一名胜者结算`);
      return false;
    }
    if (winnerId && !match.participantIds.includes(winnerId)) throw new Error(`赛事对局${match.id}的胜者不在参赛双方中`);
    match.winnerId = winnerId;
    match.status = 'completed';
    match.result = clone(result);
    competition.bracket.resolvedMatches += 1;
    const nextRound = competition.bracket.rounds[match.roundIndex + 1];
    if (nextRound) {
      const nextMatch = nextRound.matches[Math.floor(match.index / 2)];
      nextMatch.participantIds[match.index % 2] = winnerId;
    } else competition.championParticipantId = winnerId;
    return true;
  }

  function simulateNpcMatch(rawState,competition,match,resume,onBoundary) {
    const venue=COMPETITION_VENUES[competition.venueId];
    const leftParticipant=participantById(competition,match.participantIds[0]),rightParticipant=participantById(competition,match.participantIds[1]);
    if(!leftParticipant||!rightParticipant||leftParticipant.kind==='player'||rightParticipant.kind==='player')throw Error('不是完整NPC对局');
    const battleId=`competition-sim-battle-${competition.id}-${match.id}`;
    let state,recovery,leftUnitId,rightUnitId,rounds=0;
    if(resume){
      const battle=resume.state?.世界?.backgroundBattles?.[battleId],ids=[resume.leftUnitId,resume.rightUnitId],recoveryUnits=resume.recovery?.units;
      const savedCompetition=resume.state?.比赛?.当前,savedMatch=savedCompetition&&bracketMatch(savedCompetition,match.id),expectedIds=[leftParticipant,rightParticipant].map(p=>p.kind==='resident'?p.personId:persistentCharacterId(p.characterId||p.temporaryRecord?.id));
      if(savedCompetition?.id!==competition.id||savedCompetition.venueId!==competition.venueId||savedMatch?.status!=='pending'||JSON.stringify(savedMatch.participantIds)!==JSON.stringify(match.participantIds)||ids.some((id,index)=>id!==expectedIds[index]))throw Error('赛事计算断点无效');
      if(resume.version!==1||resume.competitionId!==competition.id||resume.matchId!==match.id||resume.battleId!==battleId||!Number.isSafeInteger(resume.rounds)||resume.rounds<1||resume.rounds>=500||battle?.状态!=='进行中'||ids[0]===ids[1]||ids.some((id,index)=>typeof id!=='string'||!battle.参与者ID列表.includes(id)||battle.扩展?.成员?.[id]?.sideId!==['left','right'][index]||!recoveryUnits?.[id])||!resume.recovery.generated||typeof resume.recovery.generated!=='object'||Array.isArray(resume.recovery.generated)||Object.entries(recoveryUnits).some(([id,value])=>!resume.state.战斗单位?.列表?.[id]||!Number.isSafeInteger(value?.hp)||value.hp<0||!Number.isSafeInteger(value?.sp)||value.sp<0||!value.position||typeof value.position!=='object'||typeof value.activeSoulId!=='string'))throw Error('赛事计算断点无效');
      state=resume.state;recovery=resume.recovery;rounds=resume.rounds;leftUnitId=resume.leftUnitId;rightUnitId=resume.rightUnitId;
    }else{
    state=normalizeState(rawState);
    const left=instantiateCompetitionParticipant(state,leftParticipant,`competition-sim-${competition.id}-${match.id}-left`,{usePersistent:true,persistEncounter:true});state=left.state;
    const right=instantiateCompetitionParticipant(state,rightParticipant,`competition-sim-${competition.id}-${match.id}-right`,{usePersistent:true,persistEncounter:true});state=right.state;
    leftUnitId=left.unitId;rightUnitId=right.unitId;
    recovery=captureArenaRecovery(state,[left.unitId,right.unitId]);
    state=applyVenueUnitState(state,venue,[left.unitId,right.unitId]);
    state=combat.startBackgroundBattle(state,{battleKind:'competition',id:battleId,participantIds:[left.unitId,right.unitId],
      participantConfigs:{[left.unitId]:{sideId:'left',canFlee:false},[right.unitId]:{sideId:'right',canFlee:false}},
      positions:venueBattleOptions(venue,left.unitId,right.unitId),force:true,seed:`${competition.id}:${match.id}:npc`,
      locationId:venue.locationId,objective:`${venue.name}单人淘汰赛`,rules:{nonlethal:true,roundLimit:500}}).state;
    }
    for(;rounds<500&&state.世界.backgroundBattles[battleId].状态==='进行中';){
      world.advanceTime(state,1);rounds++;
      // One complete world minute includes all due battle actions, clocks and
      // world effects. Keep this private match separate from the outer bracket
      // until its existing recovery/commit boundary has completed.
      if(rounds<500&&state.世界.backgroundBattles[battleId].状态==='进行中')onBoundary?.({version:1,state,recovery,rounds,battleId,competitionId:competition.id,matchId:match.id,leftUnitId,rightUnitId});
    }
    let battle=state.世界.backgroundBattles[battleId],decision='combat-engine';
    if(battle.状态==='进行中'){state=combat.adjudicateTimedBattle(state,battleId);battle=state.世界.backgroundBattles[battleId];decision='combat-turn-cap-tiebreak';}
    const winnerId=battle.扩展.结果.winnerSideId==='left'?leftParticipant.id:battle.扩展.结果.winnerSideId==='right'?rightParticipant.id:'';
    const result={mode:'code-ai',decision,battleId,endedRound:battle.扩展.结果.endedRound,actions:Object.keys(battle.扩展.已结算行动).length,venueId:venue.id};
    recoverArena(state,recovery,battleId);
    foundation.commitStateDraft(rawState,state);
    return {winnerId,result};
  }

  function bracketReady(competition,match) {
    if(match.roundIndex===0)return true;
    const previous=competition.bracket.rounds[match.roundIndex-1].matches;
    return [previous[match.index*2],previous[match.index*2+1]].every(m=>m.status==='completed');
  }
  function availableEntrant(state,competition,participant) {
    if(!participant)return false;
    const id=participant.kind==='player'?competition.playerId:participant.personId??persistentCharacterId(participant.characterId||participant.temporaryRecord?.id);
    const person=state.人物.列表[id],unit=state.战斗单位.列表[id];
    if(!person&&!unit&&participant.kind!=='resident'&&participant.kind!=='player')return true;
    if(!person||!unit)throw Error('赛事人物档案残缺，不能当作正常弃权');
    if(combat.occupiedBattle(state,id))throw Error('赛事人物正在其他战斗或等待竞技结算');
    return !competitionSpaceBlocked(state,id)&&!people.isDead(state,id)&&unit.存活状态==='存活'&&unit.资源.生命.当前>0;
  }
  function advanceNpcBracket(state,competition,throughRoundIndex=competition.bracket.rounds.length-1) {
    const slices=globalThis.SoulCalculationSlices;
    if(!slices)return advanceNpcBracketUninterrupted(state,competition,throughRoundIndex);
    const restore=value=>{
      if(value.cursor?.npc){
        const cursor=value.cursor,match=value.competition?.bracket?.rounds?.[cursor.roundIndex]?.matches?.[cursor.matchIndex];
        // An active match owns the one saved world. Restoring it into the outer
        // draft here would copy that graph again and make its entrants appear
        // occupied before the already-admitted match can continue.
        if(value.phase!=='npc'||value.state!==cursor.npc.state||value.competition?.id!==competition.id||!Number.isSafeInteger(cursor.roundIndex)||cursor.roundIndex<0||!Number.isSafeInteger(cursor.matchIndex)||cursor.matchIndex<0||typeof cursor.advanced!=='boolean'||match?.status!=='pending'||match.roundIndex!==cursor.roundIndex||match.index!==cursor.matchIndex||!bracketReady(value.competition,match)||match.roundIndex>value.throughRoundIndex||match.participantIds.some(id=>participantById(value.competition,id)?.kind==='player')||cursor.npc.competitionId!==value.competition.id||cursor.npc.matchId!==match.id)throw Error('赛事计算断点无效');
      }else foundation.commitStateDraft(state,value.state);
      foundation.commitStateDraft(competition,value.competition);
      state.比赛.当前=competition;
      throughRoundIndex=value.throughRoundIndex;
    };
    const started=globalThis.performance?.now?.()??Date.now();
    const completed=slices.run('arena-bracket',{state,competition,throughRoundIndex},(resume,save)=>{
      if(resume)restore(resume);
      let cursor=resume?.cursor??{roundIndex:0,matchIndex:0,advanced:false};
      while(true){
        let advanced=cursor.advanced;
        for(let roundIndex=cursor.roundIndex;roundIndex<competition.bracket.rounds.length;roundIndex++){
          const round=competition.bracket.rounds[roundIndex],firstMatch=roundIndex===cursor.roundIndex?cursor.matchIndex:0;
          for(let matchIndex=firstMatch;matchIndex<round.matches.length;matchIndex++){
            const match=round.matches[matchIndex];
            if(match.status==='completed'||!bracketReady(competition,match))continue;
            const participants=match.participantIds.map(id=>participantById(competition,id));
            // Only this exact admitted match may bypass initial availability;
            // its bound battle, participants and recovery are checked below.
            const continuing=!!cursor.npc&&roundIndex===cursor.roundIndex&&matchIndex===cursor.matchIndex;
            const ready=continuing?participants:participants.filter(p=>availableEntrant(state,competition,p));
            if(ready.length<2){
              const winnerId=ready[0]?.id??'';
              settleBracketMatch(competition,match,winnerId,{mode:'forfeit',decision:winnerId?'opponent-unavailable':'both-unavailable',reason:'参赛者空缺、死亡、失能或正被占用，未虚构战斗'});
              if(match.participantIds.includes('participant-player')&&winnerId!=='participant-player')competition.playerEliminationRound=match.roundId;
              advanced=true;continue;
            }
            if(participants.some(p=>p.kind==='player')||match.roundIndex>throughRoundIndex)continue;
            const simulated=simulateNpcMatch(state,competition,match,continuing?cursor.npc:undefined,frame=>{
              if((globalThis.performance?.now?.()??Date.now())-started>=1000)save({phase:'npc',state:frame.state,competition,throughRoundIndex,cursor:{roundIndex,matchIndex,advanced,npc:frame}});
            });
            cursor.npc=undefined;
            state.比赛.当前=competition;
            settleBracketMatch(competition,match,simulated.winnerId,simulated.result);advanced=true;
            // The checkpoint belongs to the calculation job, never the save.
            // Continue this exact scan after a complete real match; rescanning
            // earlier player matches could observe later clock effects early.
            // A resumed match can have a short completed tail. Continue the
            // original scan while this slice still has budget; the next full
            // minute or completed match remains a safe yield boundary.
            if((globalThis.performance?.now?.()??Date.now())-started>=1000)save({state,competition,throughRoundIndex,cursor:{roundIndex,matchIndex:matchIndex+1,advanced}});
          }
        }
        const pendingPlayer=competition.bracket.rounds.flatMap(r=>r.matches).find(m=>m.status!=='completed'&&m.participantIds.includes('participant-player'));
        const required=competition.playerEliminationRound?competition.bracket.rounds.length-1:pendingPlayer?pendingPlayer.roundIndex-1:throughRoundIndex;
        if(required>throughRoundIndex){throughRoundIndex=required;advanced=true;}
        if(!advanced)break;
        cursor={roundIndex:0,matchIndex:0,advanced:false};
      }
      competition.activePlayerMatchId=competition.bracket.rounds.flatMap(r=>r.matches).find(m=>m.status!=='completed'&&m.participantIds.includes('participant-player'))?.id??'';
      return {state,competition,throughRoundIndex};
    });
    restore(completed);
    return competition;
  }
  function advanceNpcBracketUninterrupted(state,competition,throughRoundIndex) {
    let advanced=true;
    while(advanced){
      advanced=false;
      for(const round of competition.bracket.rounds)for(const match of round.matches){
        if(match.status==='completed'||!bracketReady(competition,match))continue;
        const participants=match.participantIds.map(id=>participantById(competition,id));
        const ready=participants.filter(p=>availableEntrant(state,competition,p));
        if(ready.length<2){
          const winnerId=ready[0]?.id??'';
          settleBracketMatch(competition,match,winnerId,{mode:'forfeit',decision:winnerId?'opponent-unavailable':'both-unavailable',reason:'参赛者空缺、死亡、失能或正被占用，未虚构战斗'});
          if(match.participantIds.includes('participant-player')&&winnerId!=='participant-player')competition.playerEliminationRound=match.roundId;
          advanced=true;continue;
        }
        if(participants.some(p=>p.kind==='player')||match.roundIndex>throughRoundIndex)continue;
        const simulated=simulateNpcMatch(state,competition,match);
        state.比赛.当前=competition;
        settleBracketMatch(competition,match,simulated.winnerId,simulated.result);advanced=true;
      }
      const pendingPlayer=competition.bracket.rounds.flatMap(r=>r.matches).find(m=>m.status!=='completed'&&m.participantIds.includes('participant-player'));
      const required=competition.playerEliminationRound?competition.bracket.rounds.length-1:pendingPlayer?pendingPlayer.roundIndex-1:throughRoundIndex;
      if(required>throughRoundIndex){throughRoundIndex=required;advanced=true;}
    }
    competition.activePlayerMatchId=competition.bracket.rounds.flatMap(r=>r.matches).find(m=>m.status!=='completed'&&m.participantIds.includes('participant-player'))?.id??'';
    return competition;
  }

  function competitionPrizeBudget(division) {
    return integer(Math.log10(division.ringYears + 10) * 160 + division.ringOrdinal * 90,200,1800);
  }

  function competitionRewardProgressKey(venueId, competitionLevel) {
    return `${clean(venueId)}:${integer(competitionLevel,1,99)}`;
  }

  function freezeCompetitionRewardPool(id, venue, division, placement, options = {}) {
    const placementFactor = COMPETITION_REWARD_RULES.placementFactors[placement] ?? 0;
    const previousClaimedFactor = Math.max(0,Number(options.previousClaimedFactor ?? 0));
    const factor = options.factorOverride === undefined ? placementFactor : Math.max(0,Number(options.factorOverride) || 0);
    const totalBudget = Math.max(0,Math.floor(competitionPrizeBudget(division) * factor));
    const soulBoneChance = totalBudget >= 260 ? COMPETITION_REWARD_RULES.soulBoneChance[placement] ?? 0 : 0;
    const roll = (stableHash(`${id}:${venue.id}:${division.level}:${placement}:major-draw`) % 1000000) / 1000000;
    const kind = roll < soulBoneChance ? 'soul-bone' : roll < soulBoneChance + 0.28 ? 'ring-source' : 'soul-device';
    const tier = foundation.getAgeTier(division.ringYears);
    const labels = {
      'ring-source':`${venue.name}·${division.ringOrdinal}号魂环源凭证`,
      'soul-bone':`${venue.name}·${tier.名称}魂骨`,
      'soul-device':`${venue.name}·${division.level}级传承魂导器`
    };
    let majorBudget = totalBudget ? Math.max(1,Math.floor(totalBudget * COMPETITION_REWARD_RULES.majorSpendShare[kind])) : 0;
    if (kind === 'soul-bone') majorBudget = Math.max(260,majorBudget);
    if (kind === 'soul-device') majorBudget = Math.max(112,majorBudget);
    majorBudget = Math.min(totalBudget,majorBudget);
    const draws = majorBudget ? [{
      index:1,kind,label:labels[kind],budget:majorBudget,valuePoints:majorBudget * COMPETITION_REWARD_RULES.marketValuePerEffectPoint,
      probability:kind === 'soul-bone' ? soulBoneChance : null,roll
    }] : [];
    const remainingBudget = totalBudget - majorBudget;
    if (remainingBudget > 0) draws.push({
      index:draws.length + 1,kind:'resource-bundle',label:`${venue.shortName}赛事资源包`,budget:remainingBudget,
      valuePoints:remainingBudget * COMPETITION_REWARD_RULES.marketValuePerEffectPoint,probability:null,roll:null
    });
    const spentBudget = draws.reduce((sum,draw)=>sum + draw.budget,0);
    return {
      id:`competition-pool-${id}-${placement}`,placement,factor,placementFactor,previousClaimedFactor,totalBudget,spentBudget,unallocatedBudget:totalBudget-spentBudget,
      totalValuePoints:totalBudget * COMPETITION_REWARD_RULES.marketValuePerEffectPoint,
      spentValuePoints:draws.reduce((sum,draw)=>sum + draw.valuePoints,0),soulBoneChance,roll,draws,
      divisionLevel:division.level,ringOrdinal:division.ringOrdinal,ringYears:division.ringYears,ageTier:tier.名称,venueId:venue.id,
      attributes:clone(venue.rewardAttributes),channels:clone(venue.rewardChannels),frozen:true
    };
  }

  function previewCompetitionRewardPool(competitionId, venueId, competitionLevel, placement = 'champion') {
    const venue = COMPETITION_VENUES[clean(venueId)];
    const division = COMPETITION_LEVELS[integer(competitionLevel,1,99)];
    if (!venue || !division) throw new Error('比赛地点或等级组不存在');
    if (!Object.hasOwn(COMPETITION_REWARD_RULES.placementFactors,placement)) throw new Error('比赛名次不存在');
    return clone(freezeCompetitionRewardPool(clean(competitionId) || 'competition-preview',venue,division,placement));
  }

  function beginSoloCompetition(rawState, options = {}, transactionId = 'create-solo-competition') {
    const state = normalizeState(rawState);
    const playerId = assertPlayerReady(state);
    if (state.比赛.当前 && !['completed','failed'].includes(state.比赛.当前.status)) throw new Error('已有未完成的单人赛');
    const venueId = clean(options.venueId) || LOCATION_COMPETITION_INDEX[state.地图.当前地点ID];
    const venue = COMPETITION_VENUES[venueId];
    if (!venue || venue.locationId !== state.地图.当前地点ID) throw new Error('只能在地图上已登记的比赛地点报名');
    const playerLevel = state.成长.列表[playerId]?.魂力等级 ?? state.战斗单位.列表[playerId].派生.有效等级;
    const eligible = competitionDivisionForPlayer(playerLevel);
    const competitionLevel = integer(options.competitionLevel ?? eligible?.level,1,99);
    const division = COMPETITION_LEVELS[competitionLevel];
    if (!eligible || !division || division.level !== eligible.level) throw new Error(`当前${playerLevel}级没有可报名的赛事等级；每个阶段只能参加对应的下一魂环等级组`);
    const id = clean(options.id) || clean(transactionId) || `solo-${state.系统.revision + 1}`;
    const seed = clean(options.seed) || id;
    const participants = buildCompetitionParticipants(state,id,venue,division,seed);
    const bracket = makeBracket(participants);
    const rewardProgressKey = competitionRewardProgressKey(venue.id,division.level);
    const rewardProgressBefore = clone(state.比赛.奖励进度[rewardProgressKey] ?? {bestPlacement:'',bestFactor:0,claimedFactor:0});
    const claimedFactor = Math.max(0,Number(rewardProgressBefore.claimedFactor ?? 0));
    const rewardPools = Object.fromEntries(Object.keys(COMPETITION_REWARD_RULES.placementFactors).map(placement => {
      const placementFactor = COMPETITION_REWARD_RULES.placementFactors[placement] ?? 0;
      return [placement,freezeCompetitionRewardPool(id,venue,division,placement,{previousClaimedFactor:claimedFactor,factorOverride:Math.max(0,placementFactor-claimedFactor)})];
    }));
    state.比赛.当前 = {
      id,type:'solo-16',status:'ready',playerId,venueId,venueName:venue.name,competitionLevel:division.level,division:clone(division),seed,
      participants,participantCharacterIds:participants.filter(item => item.kind === 'canon').map(item => item.characterId),temporaryParticipantIds:participants.filter(item => item.kind === 'temporary').map(item => item.id),
      bracket,activePlayerMatchId:'',match:null,wins:0,playerStatus:'active',playerEliminationRound:'',placement:'',rank:null,championParticipantId:'',rewarded:false,reward:null,
      rewardPools,rewardProgressKey,rewardProgressBefore,createdRevision:state.系统.revision,historyRecorded:false
    };
    advanceNpcBracket(state,state.比赛.当前,-1);
    state.系统.revision += 1;
    state.历史.push({type:'solo-competition-created',competitionId:id,venueId,competitionLevel:division.level,participantIds:participants.map(item => item.id)});
    return {state,receipt:{
      id:transactionId,type:'solo-competition-created',competitionId:id,venueId,competitionLevel:division.level,participantCount:participants.length,temporaryCount:state.比赛.当前.temporaryParticipantIds.length,
      resolvedNpcMatches:state.比赛.当前.bracket.resolvedMatches,championRewardPool:clone(state.比赛.当前.rewardPools.champion),rewardProgressBefore,
      summary:`${venue.name}${division.label}已生成16人淘汰表；本次只结算超过历史最佳的奖励差额，冠军可新增${state.比赛.当前.rewardPools.champion.factor.toFixed(2)}档奖励`
    }};
  }

  function startCompetitionMatch(rawState, transactionId = 'start-solo-match') {
    let state = normalizeState(rawState);
    const playerId = assertPlayerReady(state,['competition']);
    const competition = state.比赛.当前;
    if (!competition || competition.type !== 'solo-16' || !['ready','between-rounds'].includes(competition.status)) throw new Error('当前没有可开始的单人赛对局');
    const match = bracketMatch(competition,competition.activePlayerMatchId);
    if (!match || match.status==='completed' || !match.participantIds.includes('participant-player')) throw new Error('淘汰表中没有待主角出战的对局');
    const opponentParticipantId = match.participantIds.find(id => id !== 'participant-player');
    const opponent = participantById(competition,opponentParticipantId);
    if(!availableEntrant(state,competition,opponent)){
      advanceNpcBracket(state,competition,match.roundIndex);
      if(competition.bracket.resolvedMatches===competition.bracket.totalMatches){const final=finalizeCompetition(state,competition);return {state:final.state,receipt:{type:'solo-competition-progressed',reason:'对手无法出赛，按弃权推进',reward:final.reward,summary:'对手无法出赛，已按真实参赛状态推进淘汰表'}};}
      competition.status='between-rounds';
      return {state,receipt:{type:'solo-competition-progressed',reason:'对手无法出赛，按弃权推进',summary:'对手无法出赛，已按真实参赛状态推进淘汰表'}};
    }
    const venue = COMPETITION_VENUES[competition.venueId];
    const instantiated = instantiateCompetitionParticipant(state,opponent,`competition-unit-${competition.id}-${match.id}`,{usePersistent:true,persistEncounter:true});
    const encountered=instantiated.state.人物.列表[instantiated.unitId];
    encountered.locationId=venue.locationId;
    const previous=encountered.扩展.相遇记录?.[playerId];
    encountered.扩展.相遇记录={...encountered.扩展.相遇记录,[playerId]:{firstRevision:previous?.firstRevision??state.系统.revision,lastRevision:state.系统.revision,locationId:venue.locationId}};
    const recovery=captureArenaRecovery(instantiated.state,[playerId,instantiated.unitId]);
    state = applyVenueUnitState(instantiated.state,venue,[playerId,instantiated.unitId]);
    const leftIsPlayer = match.participantIds[0] === 'participant-player';
    const leftId = leftIsPlayer ? playerId : instantiated.unitId;
    const rightId = leftIsPlayer ? instantiated.unitId : playerId;
    const started = combat.startBattle(state,{
      id:`competition-battle-${competition.id}-${match.id}`,participantIds:[playerId,instantiated.unitId],
      participantConfigs:{[playerId]:{sideId:'player',sideName:'主角',controller:'player',canFlee:false,morale:100},[instantiated.unitId]:{sideId:'opponent',sideName:opponent.name,controller:'ai',canFlee:false,morale:100}},
      positions:venueBattleOptions(venue,leftId,rightId),signals:['主动攻击'],force:true,seed:`${competition.id}:${match.id}:player`,
      battleKind:'competition',objective:`${venue.name}${competition.competitionLevel}级组淘汰赛`,rules:{nonlethal:true,surrender:{enabled:true,minimumRound:1,playerOnly:true}}
    });
    started.state.战斗.扩展.竞技 = {mode:'solo-competition',competitionId:competition.id,bracketMatchId:match.id,roundId:match.roundId,opponentParticipantId,opponentId:instantiated.unitId,venueId:venue.id,noRewardPerMatch:true,noPhase:true};
    started.state.比赛.当前.status = 'in-match';
    started.state.比赛.当前.match = {transactionId,bracketMatchId:match.id,roundId:match.roundId,opponentParticipantId,opponentId:instantiated.unitId,generated:instantiated.generated,battleId:started.state.战斗.id,recovery};
    started.receipt = {type:'solo-competition-match-started',competitionId:competition.id,bracketMatchId:match.id,roundId:match.roundId,opponentParticipantId,opponentId:instantiated.unitId,battleId:started.state.战斗.id,summary:`${match.roundId}：主角对阵${opponent.name}（${opponent.level}级）`};
    return started;
  }

  function rewardForPlacement(levelInput, placement) {
    const level = integer(levelInput,1,99);
    const factor = COMPETITION_REWARD_RULES.placementFactors[placement] ?? 0;
    return {gold:Math.round((500 + level * 20) * factor),experience:cycle.scaleExperienceReward(Math.round((500 + level * 40) * factor)),factor,placement};
  }

  function rewardForRank(level, rank) {
    return rewardForPlacement(level,rank === 1 ? 'champion' : rank === 2 ? 'runner_up' : rank <= 4 ? 'semifinalist' : rank <= 8 ? 'quarterfinalist' : 'round_of_16');
  }

  function competitionMaterialProfiles(pool, venue, sourceLabel) {
    const attributes = Object.values(foundation.MARTIAL_SOUL_CORE.ATTRIBUTE_REGISTRY).map(item => item.name);
    const primary = pool.attributes?.[0] ?? '物理';
    const secondary = pool.attributes?.[1] ?? primary;
    const spectrumFor = (name, strength) => Object.fromEntries(attributes.map(attribute => [attribute,attribute === name ? strength : 0]));
    return [
      {key:'powder',displayName:`${venue.shortName}${sourceLabel}粉尘`,sourceGroup:`competition-${venue.id}-${sourceLabel}`,categories:['粉末'],attributeSpectrum:spectrumFor(primary,35),channels:clone(pool.channels),traits:['赛事精炼'],weaknesses:[],structureCost:2,unitValue:20},
      {key:'crystal',displayName:`${venue.shortName}${sourceLabel}晶核`,sourceGroup:`competition-${venue.id}-${sourceLabel}`,categories:['晶体'],attributeSpectrum:spectrumFor(primary,55),channels:clone(pool.channels),traits:['赛事精炼'],weaknesses:[],structureCost:4,unitValue:40},
      {key:'core',displayName:`${venue.shortName}${sourceLabel}精粹`,sourceGroup:`competition-${venue.id}-${sourceLabel}`,categories:['能量体'],attributeSpectrum:spectrumFor(secondary,70),channels:clone(pool.channels),traits:['赛事精炼'],weaknesses:[],structureCost:7,unitValue:70}
    ];
  }

  function addCompetitionMaterialBudget(state, competition, pool, venue, budgetInput, sourceLabel, drawIndex) {
    const budget = Math.max(0,integer(budgetInput));
    const profiles = competitionMaterialProfiles(pool,venue,sourceLabel);
    const allocation = world.allocateWholeUnitBudget(budget,profiles,{seed:`${competition.id}:${pool.placement}:${drawIndex}:${sourceLabel}`});
    const batches = [];
    for (const row of allocation.allocations) {
      const profile = row.entry;
      const stack = world.addPermanentMaterialStack(state,profile,'普通',row.quantity,{
        type:'solo-competition-structured-material',competitionId:competition.id,venueId:venue.id,competitionLevel:competition.competitionLevel,
        placement:pool.placement,poolId:pool.id,drawIndex,sourceLabel
      });
      batches.push({fingerprint:stack.fingerprint,displayName:stack.displayName,quantity:row.quantity,unitValue:row.unitValue,value:row.value});
    }
    return {...allocation,batches};
  }

  function createCompetitionPoolItems(state, competition, pool) {
    const venue = COMPETITION_VENUES[competition.venueId];
    const sourceVenueName = venue.id==='arena-lanba'?'蓝霸':venue.shortName;
    const playerId = state.角色.主控单位ID;
    const person = state.人物.列表[playerId];
    const inventoryId = person?.inventoryContainerId;
    if (!inventoryId) throw new Error('主角背包不存在，无法发放比赛价值池奖励');
    const itemIds = [];
    const materialBatches = [];
    let realizedBudget = 0;
    let unallocatedBudget = 0;
    for (const draw of pool.draws) {
      const common = {
        id:`competition-prize-${competition.id}-${pool.placement}-${draw.index}`,quality:pool.ageTier,forceUnique:true,valuePoints:draw.valuePoints,
        overflow:'stash',stashLocationId:venue.locationId,
        provenance:{type:'solo-competition-value-pool',competitionId:competition.id,venueId:venue.id,competitionLevel:competition.competitionLevel,placement:pool.placement,poolId:pool.id,drawIndex:draw.index}
      };
      if (draw.kind === 'soul-bone') {
        const slots = world.SOUL_BONE_SLOTS.slice(0,6);
        const slot = slots[stableHash(`${competition.id}:${pool.placement}:soul-bone-slot`) % slots.length];
        const profile = {id:`competition-profile-${competition.id}-${pool.placement}`,名称:sourceVenueName,年限:pool.ringYears,完整度:1,属性谱:{主属性:[pool.attributes[0] ?? '物理']}};
        profile.血脉=foundation.BEAST_VALUE.sourceLineage(profile);
    const item = world.createSoulBoneItem(state,{
          ...common,profile,slot,budget:draw.budget,ownerEntityId:playerId,containerId:inventoryId,name:`${venue.shortName}传承·${slot}`,
          provenance:common.provenance,payloadExtra:{competitionPrize:true,venueId:venue.id,poolId:pool.id,drawIndex:draw.index}
        });
        itemIds.push(item.id);
        realizedBudget += draw.budget;
        continue;
      }
      if (draw.kind === 'ring-source') {
        const item = world.createItem(state,'ring-source',playerId,inventoryId,{
          ...common,name:draw.label.replace('魂环源凭证','魂环'),boundToEntityId:'',payload:{competitionPrize:true,ringSource:{version:1,kind:'competition',venueName:sourceVenueName,competitionId:competition.id,venueId:venue.id,divisionLevel:pool.divisionLevel,ringOrdinal:pool.ringOrdinal,years:pool.ringYears,budget:draw.budget,attributes:clone(pool.attributes),channels:clone(pool.channels),poolId:pool.id,drawIndex:draw.index}}
        });
        itemIds.push(item.id);
        realizedBudget += draw.budget;
        continue;
      }
      if (draw.kind === 'soul-device') {
        const compiled = world.compileBudgetedSoulDevice({budget:draw.budget,attributes:pool.attributes,channels:pool.channels,seed:`${pool.id}:${draw.index}`,ageTier:pool.ageTier,mechanismCap:foundation.getAgeTier(pool.ringYears).机制上限,source:'competition-value-pool'});
        if (compiled.pass) {
          const item = world.createItem(state,'competition-soul-device',playerId,inventoryId,{
            ...common,valuePoints:compiled.spent*5,name:draw.label,type:'魂导器',durability:100,
            payload:{competitionPrize:true,prizeKind:'soul-device',venueId:venue.id,budget:draw.budget,rank:pool.ringOrdinal,deviceCategory:compiled.deviceCategory,equipmentKind:compiled.equipmentKind,fixedForm:clone(compiled.fixedForm),modifiers:compiled.modifiers,passiveCombat:{},passiveEffectGraph:clone(compiled.effectGraph),valueLedger:{...clone(compiled.valueLedger),marketValuePoints:compiled.spent*5},poolId:pool.id,drawIndex:draw.index},
            扩展:{maxDurability:100,competitionPrize:true}
          });
          itemIds.push(item.id);
          realizedBudget += compiled.spent;
        }
        const leftover = compiled.pass ? compiled.remainder : draw.budget;
        const material = addCompetitionMaterialBudget(state,competition,pool,venue,leftover,'魂导余材',draw.index);
        materialBatches.push(...material.batches);
        realizedBudget += material.spent;
        unallocatedBudget += material.remainder;
        continue;
      }
      const material = addCompetitionMaterialBudget(state,competition,pool,venue,draw.budget,'赛事资源',draw.index);
      materialBatches.push(...material.batches);
      realizedBudget += material.spent;
      unallocatedBudget += material.remainder;
    }
    const actualItemValuePoints = itemIds.reduce((sum,itemId)=>sum + (state.物品.实例[itemId]?.valuePoints ?? 0),0);
    const actualValuePoints = actualItemValuePoints + materialBatches.reduce((sum,row)=>sum+row.value,0);
    if (actualValuePoints > pool.totalValuePoints) throw new Error(`比赛奖励价值池超支：${actualValuePoints}/${pool.totalValuePoints}`);
    if (realizedBudget + unallocatedBudget !== pool.totalBudget) throw new Error(`比赛奖励预算账不平：${realizedBudget}+${unallocatedBudget}/${pool.totalBudget}`);
    return {itemIds,materialBatches,actualItemValuePoints,actualValuePoints,realizedBudget,unallocatedBudget};
  }

  function competitionRewardAmounts(state, competition, placement=competition.placement, previousClaimedFactor) {
    const placementFactor=COMPETITION_REWARD_RULES.placementFactors[placement]??0;
    const claimedFactor=Math.max(0,Number(previousClaimedFactor??competition.rewardProgressBefore?.claimedFactor??0));
    const incrementalFactor=Math.max(0,placementFactor-claimedFactor);
    const baseGold=500+competition.competitionLevel*20,baseExperience=500+competition.competitionLevel*40;
    const prizeExperience=cycle.scaleExperienceReward(Math.round(baseExperience*incrementalFactor));
    const withdrewWithoutPlaying=competition.bracket?.rounds?.flatMap(r=>r.matches).some(m=>m.result?.decision==='player-withdrew')&&!competition.bracket.rounds.flatMap(r=>r.matches).some(m=>m.result?.mode==='player-controlled');
    const combatExperience=withdrewWithoutPlaying?0:cycle.scaleExperienceReward(Math.max(1,Math.round(baseExperience*0.05*(placement==='champion'?1:0.4))));
    return {gold:Math.round(baseGold*incrementalFactor),experience:people.isDead(state,state.角色.主控单位ID)?0:prizeExperience+combatExperience,
      prizeExperience,combatExperience,factor:placementFactor,incrementalFactor,claimedFactorBefore:claimedFactor,placement,newBest:incrementalFactor>0};
  }

  /** Detached receipt projection: identical prize constructors, no player world/ID/RNG changes. */
  function previewCompetitionRewardContents(state, competition, placement) {
    const pool=competition.rewardPools?.[placement];
    if(!pool)throw new Error('本届赛事没有这项名次奖励');
    const amounts=competitionRewardAmounts(state,competition,placement,pool.previousClaimedFactor);
    if(!amounts.newBest)return {...amounts,items:[],materialBatches:[]};
    const projected=world.makeInitialState(`competition-rewards:${competition.id}:${placement}`),playerId=state.角色.主控单位ID;
    projected.角色.主控单位ID=playerId;
    projected.人物.列表[playerId]=clone(state.人物.列表[playerId]);
    world.ensurePossessionShell(projected,playerId);
    const contents=createCompetitionPoolItems(projected,competition,pool);
    return {...amounts,items:contents.itemIds.map(id=>clone(projected.物品.实例[id])),materialBatches:contents.materialBatches};
  }

  function awardCompetition(state, competition) {
    if (competition.rewarded) return {state,reward:competition.reward};
    const playerId = state.角色.主控单位ID;
    const placementFactor = COMPETITION_REWARD_RULES.placementFactors[competition.placement] ?? 0;
    const progressKey = clean(competition.rewardProgressKey,competitionRewardProgressKey(competition.venueId,competition.competitionLevel));
    const previous = clone(state.比赛.奖励进度[progressKey] ?? competition.rewardProgressBefore ?? {bestPlacement:'',bestFactor:0,claimedFactor:0});
    const claimedFactor = Math.max(0,Number(previous.claimedFactor ?? 0));
    const incrementalFactor = Math.max(0,placementFactor-claimedFactor);
    const reward=competitionRewardAmounts(state,competition,competition.placement,claimedFactor),combatExperience=reward.combatExperience;
    const person = state.人物.列表[playerId];
    const wallet = person && state.钱包.列表[person.walletId];
    if (wallet) wallet.gold += reward.gold;
    const pool = clone(competition.rewardPools?.[competition.placement] ?? freezeCompetitionRewardPool(competition.id,COMPETITION_VENUES[competition.venueId],competition.division,competition.placement,{previousClaimedFactor:claimedFactor,factorOverride:incrementalFactor}));
    const poolItems = incrementalFactor > 0 ? createCompetitionPoolItems(state,competition,pool) : {itemIds:[],materialBatches:[],actualItemValuePoints:0,actualValuePoints:0,realizedBudget:0,unallocatedBudget:0};
    const xp = people.isDead(state,playerId)?{state,receipt:{experienceGained:0,levelsGained:0,reason:'人物已经死亡'}}:cycle.applyCombatExperience(state,{unitId:playerId,experience:reward.experience});
    if(people.isDead(state,playerId))reward.experience=0;
    state = normalizeState(xp.state);
    if (incrementalFactor > 0) {
      state.比赛.奖励进度[progressKey] = {
        venueId:competition.venueId,competitionLevel:competition.competitionLevel,bestPlacement:competition.placement,
        bestFactor:Math.max(Number(previous.bestFactor ?? 0),placementFactor),claimedFactor:Math.max(claimedFactor,placementFactor),competitionId:competition.id
      };
    }
    state.比赛.当前.rewarded = true;
    state.比赛.当前.reward = {
      ...reward,itemIds:poolItems.itemIds,itemSnapshots:poolItems.itemIds.map(id=>clone(state.物品.实例[id])),materialBatches:poolItems.materialBatches,rewardPool:{...pool,realizedSpentBudget:poolItems.realizedBudget,realizedUnallocatedBudget:poolItems.unallocatedBudget},
      actualItemValuePoints:poolItems.actualItemValuePoints,actualValuePoints:poolItems.actualValuePoints,levelResult:xp.receipt,progressKey,
      summary:incrementalFactor > 0
        ? `刷新本赛场本等级组历史成绩，结算${incrementalFactor.toFixed(2)}档差额奖励与${combatExperience}点实战经验`
        : `未超过本赛场本等级组历史最佳，仅获得${combatExperience}点实战经验`
    };
    return {state,reward:clone(state.比赛.当前.reward)};
  }

  function finalizeCompetition(state, competition) {
    if (competition.bracket.resolvedMatches !== competition.bracket.totalMatches) throw new Error('淘汰赛尚未决出冠军');
    const championIsPlayer = competition.championParticipantId === 'participant-player';
    competition.playerStatus = championIsPlayer ? 'champion' : 'eliminated';
    competition.placement = championIsPlayer ? 'champion' : ({F:'runner_up',SF:'semifinalist',QF:'quarterfinalist',R16:'round_of_16'})[competition.playerEliminationRound] ?? 'round_of_16';
    competition.rank = competition.placement === 'champion' ? 1 : competition.placement === 'runner_up' ? 2 : null;
    competition.status = 'completed';
    competition.activePlayerMatchId = '';
    const awarded = awardCompetition(state,competition);
    state = awarded.state;
    const current = state.比赛.当前;
    if (!current.historyRecorded) {
      current.historyRecorded = true;
      state.比赛.历史.push(clone(current));
      state.比赛.历史 = state.比赛.历史.slice(-30);
    }
    return {state,reward:awarded.reward};
  }

  function withdrawCompetition(rawState,transactionId='withdraw-competition'){
    let state=normalizeState(rawState);
    assertPlayerReady(state,['competition']);
    const competition=state.比赛.当前;
    const prior=competition?.bracket?.rounds.flatMap(r=>r.matches).find(m=>m.result?.decision==='player-withdrew'&&m.result.sourceId===transactionId);
    if(prior&&competition.status==='completed')return {state,idempotent:true,receipt:{type:'solo-competition-withdrawn',competitionId:competition.id,placement:competition.placement,reward:clone(competition.reward)}};
    if(!competition||competition.type!=='solo-16'||!['ready','between-rounds'].includes(competition.status)||competition.match)throw Error('只能在本场对局开始前退赛；交战中可选择认输');
    const match=bracketMatch(competition,competition.activePlayerMatchId);
    if(!match||match.status==='completed'||!match.participantIds.includes('participant-player'))throw Error('当前没有可以退出的待赛轮次');
    const opponent=match.participantIds.find(id=>id!=='participant-player'),winner=availableEntrant(state,competition,participantById(competition,opponent))?opponent:'';
    settleBracketMatch(competition,match,winner,{mode:'forfeit',decision:'player-withdrew',sourceId:transactionId,reason:'主角主动退出本届比赛'});
    competition.playerEliminationRound=match.roundId;
    advanceNpcBracket(state,competition,competition.bracket.rounds.length-1);
    const settled=finalizeCompetition(state,competition);state=settled.state;
    return {state,receipt:{type:'solo-competition-withdrawn',competitionId:competition.id,roundId:match.roundId,placement:state.比赛.当前.placement,reward:settled.reward,summary:'已退出本届赛事，按实际晋级成绩结算奖励。'}};
  }

  function deleteTemporarySlaughterItem(state, itemId) {
    const item = state.物品.实例[itemId];
    if (!item) return;
    const container = state.容器.列表[item.containerId];
    if (container) container.itemIds = container.itemIds.filter(id=>id !== itemId);
    for (const [skillId,skill] of Object.entries(state.技能.列表 ?? {})) if (skill?.sourceItemId === itemId) delete state.技能.列表[skillId];
    delete state.物品.实例[itemId];
  }

  function cleanupSlaughterOpponents(state, opponentIds, keptItemIds) {
    const kept = new Set(keptItemIds);
    for (const unitId of opponentIds) {
      const person = state.人物.列表[unitId];
      const inventoryId = person?.inventoryContainerId ?? `container-${unitId}-inventory`;
      const remainsId = `remains-${unitId}`;
      const remains = state.战利品.遗骸列表[remainsId];
      for (const containerId of [inventoryId,remains?.containerId].filter(Boolean)) {
        const container = state.容器.列表[containerId];
        for (const itemId of [...(container?.itemIds ?? [])]) if (!kept.has(itemId)) deleteTemporarySlaughterItem(state,itemId);
        if (!container?.itemIds?.length) delete state.容器.列表[containerId];
      }
      delete state.战利品.遗骸列表[remainsId];
      if (person?.walletId) delete state.钱包.列表[person.walletId];
      delete state.装备.配置[unitId];
      delete state.人物.列表[unitId];
    }
    return state;
  }

  function collectSlaughterSoulBoneTrophies(rawState, run, match) {
    let state = world.reconcileAftermath(rawState,{targets:[]}).state;
    const player = state.人物.列表[run.playerId];
    const inventoryId = player?.inventoryContainerId;
    if (!inventoryId) throw new Error('主角背包不存在，无法收取杀戮场魂骨战利品');
    const itemIds = [];
    for (const carrier of match.soulBoneCarriers ?? []) {
      const remains = state.战利品.遗骸列表[`remains-${carrier.unitId}`];
      const item = state.物品.实例[carrier.itemId];
      if (!remains || !item || item.containerId !== remains.containerId) continue;
      const placement = world.previewItemPlacement(state,inventoryId,{templateId:item.templateId,transferItemId:item.id});
      if (placement.pass) world.transferItem(state,item.id,inventoryId,item.quantity);
      else world.storeItem(state,item.id,run.playerId,run.locationId);
      item.stolen = false;
      item.legalOwnerEntityId = run.playerId;
      item.扩展.slaughterTemporary = true;
      item.扩展.slaughterTrophy = {runId:run.id,bout:match.bout,formerOwnerEntityId:carrier.unitId};
      item.provenance = {...item.provenance,type:'slaughter-soul-master-death-loot',runId:run.id,bout:match.bout,formerOwnerEntityId:carrier.unitId};
      itemIds.push(item.id);
    }
    return {state,itemIds};
  }

  function discardTemporarySlaughterBones(state, run) {
    for (const itemId of run.tempSoulBoneItemIds ?? []) deleteTemporarySlaughterItem(state,itemId);
    run.tempSoulBoneItemIds = [];
  }

  function resolveSlaughterAftermath(rawState) {
    let state = normalizeState(rawState);
    let run = state.杀戮场.当前;
    if (!run?.match || run.status !== 'in-bout' || state.战斗.状态 !== '已结束' || run.match.battleId !== state.战斗.id) return {state,handled:false};
    const result = clone(state.战斗.扩展?.结果 ?? {});
    const battleId = state.战斗.id;
    const match = clone(run.match);
    const player = state.战斗单位.列表[run.playerId];
    const won = result.winnerSideId === 'player' && player?.存活状态 === '存活';
    const killFeed = (state.战斗.扩展?.击杀记录 ?? []).map(record => ({
      round:record.round,killerId:record.killerId,targetId:record.targetId,
      killerName:state.战斗单位.列表[record.killerId]?.名称 ?? '未知来源',targetName:state.战斗单位.列表[record.targetId]?.名称 ?? record.targetId
    }));
    const experience = won ? cycle.scaleExperienceReward(Math.round(match.opponentIds.reduce((sum,unitId)=>sum + cycle.baseExperienceRewardForUnit(state,unitId,run.playerId),0) * SLAUGHTER_ARENA.riskMultiplier)) : 0;
    let deathDropSoulBoneItemIds = [];
    if (won) {
      const collected = collectSlaughterSoulBoneTrophies(state,run,match);
      state = collected.state;
      deathDropSoulBoneItemIds = collected.itemIds;
      run = state.杀戮场.当前;
    }
    // Any defeated opponent can leave a corpse. The round owns all nine
    // temporary people, including those who carried no soul bone.
    cleanupSlaughterOpponents(state,match.opponentIds,deathDropSoulBoneItemIds);
    const loot = won ? slaughterBoutLoot(run,match.bout) : [];
    const boutRecord = {bout:match.bout,battleId,won,result,experience,loot:clone(loot),deathDropSoulBoneItemIds:clone(deathDropSoulBoneItemIds),killFeed,survivors:(result.livingIds ?? []).map(unitId=>({unitId,name:state.战斗单位.列表[unitId]?.名称 ?? unitId}))};
    run.boutHistory.push(boutRecord);
    run.boutHistory = run.boutHistory.slice(-SLAUGHTER_ARENA.totalBouts);
    run.lastBout = clone(boutRecord);
    run.match = null;
    let reward = null;
    let lostExperience = 0;
    let lostLoot = [];
    if (won) {
      run.wins += 1;
      run.tempExperience += experience;
      run.tempLoot.push(...clone(loot));
      run.tempSoulBoneItemIds.push(...deathDropSoulBoneItemIds);
      if (match.bout < SLAUGHTER_ARENA.totalBouts) {
        run.status = 'between-bouts';
        run.nextBout = match.bout + 1;
      } else {
        run.status = 'completed';
        run.nextBout = SLAUGHTER_ARENA.totalBouts + 1;
        state.地图.扩展.flags = list([...(state.地图.扩展.flags ?? []),'hell-road-qualified']);
        const applied = cycle.applyCombatExperience(state,{unitId:run.playerId,experience:run.tempExperience});
        state = normalizeState(applied.state);
        run = state.杀戮场.当前;
        const awardedItemIds = awardSlaughterLoot(state,run);
        for (const itemId of run.tempSoulBoneItemIds) if (state.物品.实例[itemId]) state.物品.实例[itemId].扩展.slaughterTemporary = false;
        const itemIds = [...run.tempSoulBoneItemIds,...awardedItemIds];
        reward = {experience:run.tempExperience,itemIds,loot:clone(run.tempLoot),deathDropSoulBoneItemIds:clone(run.tempSoulBoneItemIds),levelResult:applied.receipt};
        run.reward = clone(reward);
        clearSlaughterStatuses(state,run);
      }
    } else {
      lostExperience = run.tempExperience;
      lostLoot = clone(run.tempLoot);
      run.status = 'failed';
      run.failedBout = match.bout;
      run.lostExperience = lostExperience;
      run.lostLoot = clone(lostLoot);
      discardTemporarySlaughterBones(state,run);
      run.tempExperience = 0;
      run.tempLoot = [];
      if (player && !state.人物.列表[run.playerId]?.life?.death && player.存活状态!=='死亡') {
        player.存活状态 = '存活';
        player.资源.生命.当前 = 1;
        player.资源.生命.临时 = 0;
        player.资源.魂力.当前 = 0;
        player.资源.魂力.锁定 = 0;
        player.资源.魂力.持续消耗 = 0;
      }
      clearSlaughterStatuses(state,run);
    }
    const generated = clone(match.generated);
    state.战斗 = clone(foundation.makeDefaultState().战斗);
    removeGenerated(state,generated);
    run = state.杀戮场.当前;
    if (['completed','failed'].includes(run.status) && !run.historyRecorded) {
      run.historyRecorded = true;
      state.杀戮场.历史.push(clone(run));
      state.杀戮场.历史 = state.杀戮场.历史.slice(-30);
    }
    state.系统.revision += 1;
    const receipt = {
      type:'slaughter-bout-resolved',runId:run.id,bout:match.bout,won,status:run.status,result,experience,temporaryExperience:run.tempExperience,
      temporaryLoot:clone(run.tempLoot),deathDropSoulBoneItemIds,lostExperience,lostLoot,reward,killFeed,
      summary:won
        ? run.status === 'completed' ? `五场死斗全部胜出；${reward.experience}经验与${reward.itemIds.length}件奖励已一次性入账` : `第${match.bout}场胜出；临时累计${run.tempExperience}经验、${run.tempLoot.length}项奖励，生命、魂力和剩余状态不恢复`
        : `第${match.bout}场败北；临时${lostExperience}经验与${lostLoot.length}项奖励全部清空，已在杀戮场外以1点生命、0点魂力苏醒`
    };
    saveSlaughterReceipt(state,`settle:${battleId}`,receipt);
    state.历史.push({type:'slaughter-bout-resolved',runId:run.id,bout:match.bout,won,status:run.status,summary:receipt.summary});
    state.历史 = state.历史.slice(-50);
    return {state,receipt,handled:true};
  }

  function reconcileAftermath(rawState, receipt = {}) {
    let state = normalizeState(rawState);
    if (state.战斗.状态 !== '已结束') return {state,receipt,handled:false};
    const slaughter = resolveSlaughterAftermath(state);
    if (slaughter.handled) return slaughter;
    const result = clone(state.战斗.扩展?.结果 ?? {});
    const duel = state.切磋.当前 ?? state.终局挑战.当前;
    if (duel) {
      if(duel.battleId!==state.战斗.id)return {state,receipt,handled:false};
      const won = result.winnerSideId === 'player';
      const mode = duel.mode;
      const record = {id:duel.id,characterId:duel.characterId,result,won,round:result.endedRound ?? 0,noReward:mode !== 'spar',...(mode==='endgame'?{scope:'historical-projection',battleId:duel.battleId}:{})};
      const savedSpar = clone(state.切磋);
      const savedEndgame = clone(state.终局挑战);
      if(mode==='endgame'){
        if(duel.projection?.version!==1||duel.projection.scope!=='historical-projection'||!duel.projection.reality)throw Error('历史投影缺少返回时的现实记录');
        // Restore all gameplay roots atomically. Narrative records belong to the player;
        // they do not confer firsthand experience or mechanical changes on a real NPC.
        const reports=clone(state.扩展?.battleReports??{}),battlePreferences=state.扩展?.battlePreferences?clone(state.扩展.battlePreferences):null;
        state=clone(duel.projection.reality);
        state.扩展??={};state.扩展.battleReports=reports;
        if(battlePreferences)state.扩展.battlePreferences=battlePreferences;
      }else recoverArena(state,duel.recovery,duel.battleId);
      state = normalizeState(state);
      if (mode === 'spar') { state.切磋 = savedSpar; state.切磋.当前 = null; state.切磋.历史.push(record); }
      else {
        state.终局挑战 = savedEndgame;
        state.终局挑战.当前 = null;
        state.终局挑战.历史.push(record);
        if (!won&&duel.projection.defeatPolicy==='death') people.die(state,state.角色.主控单位ID,'终局挑战败北',duel.id);
        if (won) {
          state.终局挑战.成就 ??= {};
          const prior = state.终局挑战.成就[duel.characterId];
          state.终局挑战.成就[duel.characterId] = {characterId:duel.characterId,firstVictoryId:prior?.firstVictoryId ?? duel.id,
            bestRound:prior ? Math.min(prior.bestRound || record.round,record.round) : record.round};
        }
      }
      let experience = null;
      if (mode === 'spar') {
        // Restore the original duel snapshot before crediting progression. Quotes use that entry level.
        const gained = won && !people.isDead(state,state.角色.主控单位ID) ? previewSparExperience(state, duel.characterId) : 0;
        const applied = people.isDead(state,state.角色.主控单位ID)?{state,receipt:{experienceGained:0,levelsGained:0,reason:'人物已经死亡'}}:cycle.applyCombatExperience(state,{experience:gained});
        state = normalizeState(applied.state);
        experience = applied.receipt;
        state.切磋.历史[state.切磋.历史.length - 1].experience = clone(experience);
      }
      const completedIds = ENDGAME_IDS.filter(id => state.终局挑战.成就?.[id]);
      const summary = mode === 'endgame'
        ? `${won ? `你战胜了${CHARACTER_CATALOG[duel.characterId].name}的历史投影` : '本次历史投影挑战未能取胜'}。投影已消散，你已回到进入前的状态，挑战战绩已记入旅程。`
        : `切磋${won ? '胜利' : '失败'}；竞技生命与魂力已按规则恢复，获得${experience.experienceGained}点经验${experience.levelsGained ? `，提升${experience.levelsGained}级` : ''}`;
      return {state,receipt:{type:mode === 'spar' ? 'spar-resolved' : 'endgame-challenge-resolved',characterId:duel.characterId,won,result,noReward:mode !== 'spar',...(mode==='endgame'?{scope:'historical-projection'}:{}),...(experience ? {experience} : {}),
        terminalReached:completedIds.length > 0,completedIds,summary},handled:true};
    }
    let competition = state.比赛.当前;
    if (!competition?.match || competition.status !== 'in-match' || competition.match.battleId!==state.战斗.id) return {state,receipt,handled:false};
    const won = result.winnerSideId === 'player';
    const finishedMatch = clone(competition.match);
    const savedCompetition = clone(state.比赛);
    recoverArena(state,finishedMatch.recovery,finishedMatch.battleId);
    state.比赛 = savedCompetition;
    state = normalizeState(state);
    competition = state.比赛.当前;
    const match = bracketMatch(competition,finishedMatch.bracketMatchId);
    const winnerParticipantId = won ? 'participant-player' : result.winnerSideId==='opponent' ? finishedMatch.opponentParticipantId : '';
    settleBracketMatch(competition,match,winnerParticipantId,{mode:'player-controlled',battleId:finishedMatch.battleId,winnerSideId:result.winnerSideId,endedRound:result.endedRound ?? 0});
    competition.match = null;
    if (won) competition.wins += 1;
    else competition.playerEliminationRound = match.roundId;
    advanceNpcBracket(state,competition,won ? match.roundIndex : competition.bracket.rounds.length - 1);
    let reward = null;
    if (!won || competition.bracket.resolvedMatches===competition.bracket.totalMatches) {
      const finalized = finalizeCompetition(state,competition);
      state = finalized.state;
      reward = finalized.reward;
      competition = state.比赛.当前;
    } else competition.status = 'between-rounds';
    const champion = participantById(competition,competition.championParticipantId);
    const placementLabels = {champion:'冠军',runner_up:'亚军',semifinalist:'四强',quarterfinalist:'八强',round_of_16:'十六强'};
    const summary = competition.status === 'between-rounds'
      ? `本场获胜，淘汰表已推进；下一场为${competition.activePlayerMatchId}`
      : `本届比赛由${champion?.name ? champion.name+'夺冠' : '冠军空缺'}；主角成绩为${placementLabels[competition.placement] ?? competition.placement}，${reward?.summary ?? '奖励已结算'}`;
    return {state,receipt:{type:'solo-competition-match-resolved',competitionId:competition.id,bracketMatchId:match.id,roundId:match.roundId,won,result,status:competition.status,placement:competition.placement,rank:competition.rank,championParticipantId:competition.championParticipantId,reward,summary},handled:true};
  }

  function listAtLocation(locationId, options = {}) {
    return (LOCATION_INDEX[locationId] ?? []).map(id => CHARACTER_CATALOG[id]).filter(record => options.battleOnly !== true || record.battleCapable).map(clone);
  }

  function validateCatalog() {
    const errors = [];
    const ids = new Set();
    for (const record of Object.values(CHARACTER_CATALOG)) {
      if (ids.has(record.id)) errors.push(`重复角色ID：${record.id}`); ids.add(record.id);
      if (!world.LOCATION_TEMPLATES[record.locationId]) errors.push(`角色${record.id}地图绑定不存在`);
      if (!Array.isArray(record.martialSouls) || !Array.isArray(record.soulBones) || !Array.isArray(record.equipment)) errors.push(`角色${record.id}缺少完整字段`);
      if (record.kind === 'soul-master' && !record.martialSouls.length) errors.push(`魂师${record.id}缺少武魂`);
      if (record.kind === 'soul-master' && record.martialSouls.length > 3) errors.push(`魂师${record.id}武魂数量超过三个`);
      if (!record.battleCapable || record.kind === 'civilian') errors.push(`角色库残留非战斗人物：${record.id}`);
      if (!record.mechanics || record.mechanics.version !== CANON_MECHANICS_VERSION) errors.push(`角色${record.id}缺少v3.0机械档案`);
      if (!record.mechanics?.attributes?.base || ATTRIBUTE_KEYS.some(key => !Number.isFinite(record.mechanics.attributes.base[key]))) errors.push(`角色${record.id}缺少六维推测`);
      if (record.kind === 'soul-master' && (!record.mechanics?.attributes?.initial || ATTRIBUTE_KEYS.some(key => !Number.isFinite(record.mechanics.attributes.initial[key])))) errors.push(`魂师${record.id}缺少初始六维档案`);
      if (record.kind === 'soul-master' && record.mechanics.attributes.totalRingPoints !== record.mechanics.ringLoadouts.reduce((sum,loadout)=>sum + loadout.rings.length * cycle.RING_ATTRIBUTE_POINTS,0)) errors.push(`魂师${record.id}魂环属性点总账不一致`);
      if (record.kind === 'soul-master' && record.mechanics?.ringLoadouts?.length !== record.martialSouls.length) errors.push(`魂师${record.id}逐武魂魂环档案数量不匹配`);
      for (const loadout of record.mechanics?.ringLoadouts ?? []) {
        if (loadout.rings.length !== loadout.desiredCount) errors.push(`魂师${record.id}/${loadout.soulName}魂环数量不匹配`);
        for (const [index,ring] of loadout.rings.entries()) {
          if (ring.ordinal !== index + 1 || !Number.isFinite(ring.years) || !ring.skills?.length) errors.push(`魂师${record.id}/${loadout.soulName}第${index + 1}环档案不完整`);
        }
      }
      const boneSlots = (record.mechanics?.soulBones ?? []).filter(item => !item.skipped).map(item => item.slot);
      if (new Set(boneSlots).size !== boneSlots.length) errors.push(`角色${record.id}魂骨槽位重复`);
      for (const item of record.mechanics?.equipment ?? []) {
        if (STORAGE_SOUL_DEVICE_PATTERN.test(item.name) && !item.excluded) errors.push(`角色${record.id}储物类魂导器未排除：${item.name}`);
        if (item.category === 'storage-soul-device' && item.templateId) errors.push(`角色${record.id}储物类魂导器不得绑定运行模板`);
      }
      for (const forbidden of ['canonicalPersonId','samePersonAs','stageOf']) if (Object.hasOwn(record,forbidden)) errors.push(`角色${record.id}含旧式跨时期关联${forbidden}`);
      if (record.level === 99 && (!record.endgame || !ENDGAME_IDS.includes(record.endgameEntryId))) errors.push(`99级角色${record.id}没有终局挑战入口`);
      if (record.level !== 99 && record.endgame) errors.push(`非99级角色${record.id}误入终局挑战`);
      if (Object.hasOwn(record,'phases') || Object.hasOwn(record,'phase')) errors.push(`角色${record.id}含Boss阶段字段`);
    }
    const douluoOneCount = Object.values(CHARACTER_CATALOG).filter(record => record.mechanics?.scope === 'douluo-one').length;
    if (douluoOneCount !== 161) errors.push(`斗一人物范围应为161，实际为${douluoOneCount}`);
    for (const id of ENDGAME_IDS) if (!CHARACTER_CATALOG[id]?.endgame) errors.push(`终局角色缺失：${id}`);
    const expectedEndgameIds = [...new Set(Object.values(CHARACTER_CATALOG).filter(record => record.level === 99).map(record => record.identity.canonicalId))];
    if (JSON.stringify(ENDGAME_IDS) !== JSON.stringify(expectedEndgameIds)) errors.push('终局挑战未覆盖全部99级唯一身份');
    if (CHARACTER_CATALOG['slaughter-king']?.identity?.canonicalId !== 'tang-chen') errors.push('杀戮之王没有归入唐晨身份');
    return {pass:errors.length === 0,errors,count:ids.size,douluoOneCount,battleCapable:Object.values(CHARACTER_CATALOG).filter(item => item.battleCapable).length,locations:Object.keys(LOCATION_INDEX).length,endgameIds:clone(ENDGAME_IDS)};
  }

  function mechanicsCoverageReport() {
    const records = Object.values(CHARACTER_CATALOG);
    const target = records.filter(record => record.mechanics.scope === 'douluo-one');
    const soulMasters = target.filter(record => record.kind === 'soul-master');
    const soulBeasts = target.filter(record => record.kind === 'soul-beast');
    const ringLoadouts = soulMasters.flatMap(record => record.mechanics.ringLoadouts.map(loadout => ({recordId:record.id,...clone(loadout)})));
    const rings = ringLoadouts.flatMap(loadout => loadout.rings.map(ring => ({recordId:loadout.recordId,soulName:loadout.soulName,...clone(ring)})));
    const skills = rings.flatMap(ring => ring.skills.map(skill => ({recordId:ring.recordId,soulName:ring.soulName,ringOrdinal:ring.ordinal,...clone(skill)})));
    const soulBones = target.flatMap(record => record.mechanics.soulBones.map(item => ({recordId:record.id,...clone(item)})));
    const equipment = target.flatMap(record => record.mechanics.equipment.map(item => ({recordId:record.id,...clone(item)})));
    const mechanismGaps = target.flatMap(record => record.mechanics.mechanismGaps.map(item => ({recordId:record.id,characterName:record.name,...clone(item)})));
    const excludedSkills = target.flatMap(record => record.mechanics.excludedSkills.map(item => ({recordId:record.id,characterName:record.name,...clone(item)})));
    const contentConflicts = target.flatMap(record => record.mechanics.contentConflicts.map(item => ({recordId:record.id,characterName:record.name,...clone(item)})));
    return {
      version:'3.0.0',mechanicsVersion:CANON_MECHANICS_VERSION,scope:'douluo-one',characters:target.length,soulMasters:soulMasters.length,soulBeasts:soulBeasts.length,
      martialSouls:soulMasters.reduce((sum,record)=>sum + record.martialSouls.length,0),ringLoadouts:ringLoadouts.length,rings:rings.length,ringSkills:skills.length,
      canonNamedRingSkills:skills.filter(item => ['canon-mechanics-explicit','canon-name-only-adapted'].includes(item.evidence)).length,
      canonMechanicsExplicit:skills.filter(item => item.evidence === 'canon-mechanics-explicit').length,
      canonNameOnlyAdapted:skills.filter(item => item.evidence === 'canon-name-only-adapted').length,
      inferredRingSkills:skills.filter(item => item.evidence.startsWith('mechanical-inference')).length,
      soulBones:soulBones.filter(item => !item.skipped).length,soulBonesSkipped:soulBones.filter(item => item.skipped).length,equipmentIncluded:equipment.filter(item => !item.excluded).length,storageSoulDevicesExcluded:equipment.filter(item => item.category === 'storage-soul-device').length,
      mechanismGaps,coreMechanisms:clone(CORE_MECHANISM_CATALOG),excludedSkills,contentConflicts,excludedItems:equipment.filter(item => item.excluded),validation:validateCatalog()
    };
  }

  return Object.freeze({
    VERSION,CANON_MECHANICS_VERSION,ARCHETYPES,CHARACTER_CATALOG,LOCATION_INDEX,CANONICAL_IDENTITY_OVERRIDES,LEVEL_99_RECORD_IDS,ENDGAME_IDS,canonicalIdentityId,CANON_EXPLICIT_SKILL_BLUEPRINTS,CORE_MECHANISM_CATALOG,validateNativeOrigins,assertNativeOriginSkill,selfCondensationSpec,registeredRingColor,
    COMPETITION_LEVELS,COMPETITION_VENUES,LOCATION_COMPETITION_INDEX,COMPETITION_ROUNDS,COMPETITION_REWARD_RULES,SLAUGHTER_ARENA,
    normalizeState,listAtLocation,completeCatalogueLoadout,instantiateCharacter,instantiateCompetitionParticipant,removeGenerated,persistentCharacterId,ensurePersistentCharacter,configureOpeningCharacter,
    WORLD_IDENTITY_GROUPS,worldCharacterIdentityId,persistentCharacterConflict,persistentCharacterBlockReason,
    WORLD_CHARACTER_PLACEMENTS,WORLD_CHARACTER_EXCLUSIONS,WORLD_FUTURE_PROFILES,WORLD_STORY_PROFILES,WORLD_STORY_SELECTIONS,worldCharacterUnavailableReason,worldCharacterRecord,worldCharacterRecords,worldCharacterLocation,
    startSpar,startEndgameChallenge,previewEndgameChallenge,validateHistoricalProjection,beginSlaughterRun,startSlaughterBout,slaughterSoulBoneCarryChance,
    competitionDivisionForPlayer,competitionCandidates,competitionPrizeBudget,previewCompetitionRewardPool,competitionRewardAmounts,previewCompetitionRewardContents,beginSoloCompetition,startCompetitionMatch,withdrawCompetition,reconcileAftermath,presentGeneratedNames,
    sparCharacterRecord,previewSparExperience,previewSparAvailability,rewardForPlacement,rewardForRank,validateCatalog,mechanicsCoverageReport
  });
});
