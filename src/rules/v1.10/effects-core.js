(function attachSoulEffectCompiler(root, factory) {
  if(!root.SoulNineCourts&&typeof require==='function')require('../../shared/nine-court-skills.js');
  const foundation = root?.SoulCombatFoundation ?? (typeof require === 'function' ? require('./foundation-core.js') : null);
  const diversity = root?.SoulCandidateDiversity ?? (typeof require === 'function' ? require('./candidate-diversity.js') : null);
  const talents = root?.SoulTalentCore ?? (typeof require === 'function' ? require('./talent-core.js') : null);
  const abilities=root?.SoulAbilityContract??(typeof require==='function'?require('./ability-contract-core.js'):null);
  const phases=root?.SoulEffectPhases??(typeof require==='function'?require('./effect-phase-core.js'):null);
  if(typeof require==='function'&&!root?.SoulDisguise)require('./disguise-core.js');
  if(typeof require==='function'&&!root?.SoulSupportCore)require('./support-core.js');
  const api = factory(foundation, diversity, talents, abilities,phases);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SoulEffectCompiler = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createSoulEffectCompiler(foundation, diversity, talents, abilities,phases) {
  'use strict';

  if (!foundation) throw new Error('SoulEffectCompiler requires SoulCombatFoundation');

  const VERSION = '2.10.0';
  const REGISTRY_VERSION = '0.12.0-hit-interference';
  const MECHANISM_RANK = Object.freeze({基础: 0, 进阶: 1, 强力: 2, 规则: 3, 神话: 4});
  const TIER_RANK = Object.freeze({十年: 0, 百年: 1, 千年: 2, 万年: 3, 十万年: 4, 百万年: 5});
  const TIER_OUTPUT_SCALE = Object.freeze({十年: 0.9, 百年: 1, 千年: 1.08, 万年: 1.16, 十万年: 1.25, 百万年: 1.35});
  const TIER_SOUL_COST_RATE = Object.freeze({十年: 0.06, 百年: 0.07, 千年: 0.08, 万年: 0.1, 十万年: 0.12, 百万年: 0.15});
  const SOUL_RING_CAST_COST = Object.freeze([0, 6, 10, 15, 21, 28, 36, 45, 55, 66]);
  const SOUL_RING_UPCAST_TOTAL = Object.freeze([0, 0, 4, 9, 15, 22, 30, 39, 49, 60]);
  const DAMAGE_TYPES = foundation.DAMAGE_TYPES;
  const SAVE_ATTRIBUTES = Object.freeze([...foundation.ATTRIBUTE_KEYS]);
  const TARGET_FACTIONS = Object.freeze(['自动', '敌方', '友方', '任意', '无差别']);
  const TARGET_MODES = Object.freeze(['主目标', '自动最近', '自动最低生命', '全部合法']);
  const DOMAIN_FACTIONS = Object.freeze(['敌方', '友方', '所有']);
  const ALLOCATION_STYLES = Object.freeze({
    威力集中: {powerShare: [0.65, 0.85], targetUtilization: 0.9},
    均衡: {powerShare: [0.45, 0.65], targetUtilization: 0.86},
    机制丰富: {powerShare: [0.25, 0.45], targetUtilization: 0.82},
    精准塑形: {powerShare: [0.55, 0.75], targetUtilization: 0.88}
  });
  const TARGET_COMMON_BOUNDS = Object.freeze({阵营规则: TARGET_FACTIONS, 选择模式: TARGET_MODES});
  const HARMFUL_EFFECT_IDS = Object.freeze(new Set(['payload.death','contract.oath','realm.store','realm.capture','payload.stack_confluence','payload.resource_damage','status.next_check_penalty','payload.arcane_lock','payload.damage','payload.residual','payload.soul_damage','payload.drain','status.bind','status.paralysis','status.burn','status.poison','status.damage_over_time','status.armor_break','status.stun','status.fear','status.charm','status.desire','status.blind','status.silence','status.mute','status.limb_bind','status.power_seal','status.mind_control','status.soul_control','status.cognition_shift','transform.sex','transform.disguise','status.sleep','status.slow','status.eternal_wound','status.hit_disadvantage','move.knockback','move.pull','zone.hazard','intimate.stimulate','intimate.climax']));
  const BENEFICIAL_EFFECT_IDS = Object.freeze(new Set(['status.amplify','status.limited_followup','status.battle_resource','payload.zone_dispel','status.hit_advantage','status.hit_reroll','status.evasion_reroll','status.sure_hit','status.absolute_evasion','status.critical_guarantee','status.critical_guard','status.miss_graze','zone.wall','payload.repair_item','payload.fabricate','payload.shield','payload.heal','payload.soul_restore','payload.restore','payload.cleanse','payload.revive','status.buff','status.haste','status.invisibility','status.invulnerable','status.regeneration','status.resistance_shift','status.status_guard','copy.skillset','modifier.next_skill','move.teleport','move.flight','summon.entity','transform.form','transform.martial_avatar','reaction.counter','reaction.reflect']));

  const clamp = (value, minimum, maximum) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return minimum;
    return Math.min(maximum, Math.max(minimum, number));
  };
  const round = (value, digits = 0) => {
    const factor = 10 ** digits;
    return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
  };
  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  // Keep the production ordering for mechanical choices and fingerprints on every OS.
  const mechanicalOrder=(left,right)=>left.localeCompare(right,'en-US');
  const cleanList = value => Array.isArray(value)
    ? [...new Set(value.map(item => String(item ?? '').trim()).filter(Boolean))]
    : [];
  const tagSet = (...sources) => new Set(sources.flatMap(cleanList).map(value => value.toLowerCase()));
  const intersects = (left, right) => [...left].some(item => right.has(item));
  const stableHash = value => {
    let hash = 2166136261;
    for (const char of String(value ?? '')) {
      hash ^= char.codePointAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  };
  function effectPolarity(effectId, params = {}) {
    if (effectId === 'status.buff') return Number(params?.数值 ?? 1) < 0 ? 'harmful' : 'beneficial';
    if (effectId === 'status.resistance_shift') return params?.模式 === '易伤' ? 'harmful' : 'beneficial';
    if (HARMFUL_EFFECT_IDS.has(effectId)) return 'harmful';
    if (BENEFICIAL_EFFECT_IDS.has(effectId)) return 'beneficial';
    return 'neutral';
  }

  function effect(definition) {
    return Object.freeze({
      version: '1.0.0',
      mechanismLevel: '基础',
      minimumAgeTier: '十年',
      baseCost: 0,
      sourceTags: [],
      expressionTags: [],
      requires: [],
      conflicts: [],
      synergyGroups: [],
      parameterBounds: {},
      parameterDefaults: {},
      timing: '行动结算',
      duration: '瞬时',
      stacking: '无',
      cleanup: '无需清理',
      narrationFacts: [],
      ...definition
    });
  }

  // Optional additions are deliberately absent from old normalized graphs.
  // Their explicit presence buys the complete reachable behavior; runtime state
  // (current charges/resources) is never a price input.
  const OPTIONAL_EFFECT_PARAMETERS=Object.freeze({
    'trigger.contract':{处罚方式:['单项','组合']},
    'payload.damage':{事件槽:[1,8],发动魂力:[0,999],定额发动:[true,false],领域触发:['展开','回合开始'],引爆状态:['灼烧','中毒'],状态来源:['自身','自身与所属召唤'],消耗状态:[true,false]},
    'payload.shield':{发动魂力:[0,999],定额发动:[true,false]},
    'payload.cleanse':{发动魂力:[0,999],定额发动:[true,false]},
    'target.allies':{每目标魂力:[1,20]},
    'target.single':{沿用首目标:[true,false]},
    'status.bind':{命中后抵抗:[true,false],抵抗属性:['力量','身法','体魄','悟性','感知','意志']},
    'status.resistance_shift':{减免百分比:[0,100]},
    'status.slow':{领域触发:['范围内']},
    'status.burn':{加值:[0,99],同施术者取最高:[true,false]},
    'status.amplify':{作用范围:['同源武魂'],伤害属性:['火','冰','雷','水','风','土','光','暗','物理','精神','灵魂','毒蚀','生命','死亡','空间','阴','阳'],叠加方式:['同源相加']},
    'move.flight':{持续方式:['来源维持']},
    'move.step':{发动魂力:[0,999],定额发动:[true,false]},
    'domain.field':{持续方式:['来源维持'],发动魂力:[0,999],定额发动:[true,false]},
    'status.battle_resource':{名称:['归乡回响','战斗蓄能','战意','印记']},
    'target.burst':{本人优先:[true,false],落点:['自身'],覆盖全部:[true,false]},
    'summon.entity':{魂力分配:[0,9999],继承环序上限:[1,9],离散缩放:['不放大','向下取整最少1'],同源继承:[true,false],固定继承:[true,false],最大同时存在:[1,3],范围减伤百分比:[0,50],发动魂力:[0,999],定额发动:[true,false]},
    'transform.martial_avatar':{持续方式:['本场战斗'],同源伤害增幅百分比:[0,100],同源射程增幅:[0,2],同源范围增幅:[0,2],范围魂环序号:[1,9],召唤技能效果倍率:[20,100],精神防护加值:[0,4],同源启动减耗百分比:[0,50],同源维持减耗百分比:[0,50],发动魂力:[0,999],定额发动:[true,false],同源命中加值:[0,10],同源难度加值:[0,10],冷却起点:['结束']},
    'sustain.maintain':{计费方式:['逐目标'],启动魂力:[1,20],维持距离区:[1,4],发动魂力:[0,999],定额发动:[true,false],冷却起点:['结束']},
    'status.invulnerable':{持续方式:['来源维持','来源下回合'],发动魂力:[0,999],高阶抵挡次数:[1,9],低阶转盾百分比:[0,100],护盾上限百分比:[1,100]}
  });
  const BATTLE_EVENT_KINDS=Object.freeze(['charges-created','action-hit','action-release','confluence']);
  function checkedStructuredParameter(effectId,key,value){
    if(effectId==='status.amplify'&&key==='成长序列'){
      if(!Array.isArray(value)||value.length!==9||value.some(v=>!Number.isInteger(v)||v<0||v>100)||value.some((v,i)=>i&&v<value[i-1]))throw Error('增幅成长须为九个递增或持平的整数（0至100）');
      return clone(value);
    }
    if(effectId==='transform.disguise'&&key==='伪装模板')return globalThis.SoulDisguise.template(value);
    if(effectId==='summon.entity'&&key==='继承技能ID'){
      if(!Array.isArray(value)||value.length>18||value.some(id=>typeof id!=='string'||!id||id.length>180)||new Set(value).size!==value.length)throw Error('指定继承技能必须是互不重复的真实技能编号');
      return clone(value);
    }
    if(effectId==='status.battle_resource'&&key==='事件规则'){
      if(!Array.isArray(value)||!value.length||value.length>16)throw Error('战斗资源必须声明1至16条事件规则');
      const seen=new Set();
      return value.map(rule=>{
        if(!rule||Array.isArray(rule)||Object.keys(rule).some(k=>!['事件','事件槽','数量'].includes(k))||Object.keys(rule).length!==3||!BATTLE_EVENT_KINDS.includes(rule.事件)||!Number.isInteger(rule.事件槽)||rule.事件槽<1||rule.事件槽>8||(rule.数量!=='实际'&&(!Number.isInteger(rule.数量)||rule.数量<1||rule.数量>99)))throw Error('战斗资源事件、槽位或数量无效');
        const key=rule.事件+':'+rule.事件槽;if(seen.has(key))throw Error('同一战斗资源不得重复登记相同事件');seen.add(key);return clone(rule);
      });
    }
    return undefined;
  }
  function validateNewParameters(effectId,p={},activation='active'){
    const template=EFFECT_REGISTRY[effectId];
    if(['status.limited_followup','payload.stack_confluence','status.next_check_penalty','status.battle_resource','payload.resource_damage','payload.resource_endstate','payload.zone_dispel'].includes(effectId))for(const [key,value] of Object.entries(p)){
      const bounds=template.parameterBounds[key];if(!bounds)continue;
      const numeric=bounds.length===2&&bounds.every(Number.isFinite);
      if(numeric?!Number.isInteger(value)||value<bounds[0]||value>bounds[1]:!bounds.includes(value))throw Error(`效果参数越界：${effectId}/${key}`);
    }
    for(const [key,bounds] of Object.entries(OPTIONAL_EFFECT_PARAMETERS[effectId]??{}))if(Object.hasOwn(p,key)){
      const value=p[key],numeric=bounds.length===2&&bounds.every(Number.isFinite);
      if(numeric?!Number.isInteger(value)||value<bounds[0]||value>bounds[1]:!bounds.includes(value))throw Error(`效果参数越界：${effectId}/${key}`);
    }
    for(const key of ['继承技能ID','事件规则','伪装模板','成长序列'])if(Object.hasOwn(p,key)){
      if(checkedStructuredParameter(effectId,key,p[key])===undefined)throw Error(`效果参数未登记：${effectId}/${key}`);
    }
    if(p.定额发动===true&&!Number.isInteger(p.发动魂力))throw Error('定额发动须声明完整魂力费用');
    if(effectId==='payload.damage'&&(p.状态来源!==undefined||p.消耗状态!==undefined)&&!p.引爆状态)throw Error('状态引爆须声明实际状态条件');
    if(effectId==='status.amplify'&&p.叠加方式==='同源相加'&&p.作用范围!=='同源武魂')throw Error('同源加算须限定本来源武魂');
    if(effectId==='transform.martial_avatar'&&p.同源范围增幅&&!p.范围魂环序号)throw Error('范围强化须声明来源魂环序号');
    if(effectId==='summon.entity'&&(p.固定继承||p.同源继承)&&!p.继承能力)throw Error('固定同源继承需要真实继承召唤');
    if(effectId==='transform.disguise'){
      const t=globalThis.SoulDisguise.template(p.伪装模板);
      if(t.声音&&!p.掩饰声音)throw Error('声音伪装须配置并支付掩饰声音');
      if((t.武魂表象||t.魂环表象)&&!p.武魂伪装)throw Error('武魂与魂环表象须配置并支付武魂伪装');
    }
    if(effectId==='status.battle_resource'){
      if(activation!=='passive')throw Error('战斗资源规则只能登记在持有期间的被动分支');
      checkedStructuredParameter(effectId,'事件规则',p.事件规则);
    }
    if(effectId==='summon.entity'&&['魂力分配','继承环序上限','继承技能ID','离散缩放'].some(k=>Object.hasOwn(p,k))){
      if(p.继承能力!==true)throw Error('指定技能或魂力分配必须使用真实继承召唤');
      if(p.继承技能ID&&p.继承技能ID.length>Number(p.技能继承数量??0))throw Error('指定继承技能超过已付费技能数量');
      if(Object.hasOwn(p,'魂力分配')&&Number(p.魂力继承百分比??0)!==0)throw Error('真实魂力转移不能同时免费生成比例魂力');
    }
    if(effectId==='status.power_seal'&&p.封印对象==='装备与道具'&&p.范围!=='全部')throw Error('装备与道具封锁使用全部随身物品范围');
    if(effectId==='payload.resource_damage'&&p.最低层数>p.最大计入层数)throw Error('累计攻击最低层数超过已计价最大层数');
    if(template?.requiresExplicitParameters)for(const key of template.requiresExplicitParameters)if(!Object.hasOwn(p,key))throw Error(`效果参数缺失：${effectId}/${key}`);
  }
  function effectParameterAllowed(effectId,key,value,params={}){
    const template=EFFECT_REGISTRY[effectId];if(!template)return false;
    const bounds=template.parameterBounds[key]??OPTIONAL_EFFECT_PARAMETERS[effectId]?.[key];
    if(bounds){const numeric=bounds.length===2&&bounds.every(Number.isFinite);return numeric?Number.isInteger(value)&&value>=bounds[0]&&value<=bounds[1]:bounds.includes(value);}
    try{
      if(checkedStructuredParameter(effectId,key,value)!==undefined)return true;
      if(key==='限制'&&effectId==='status.power_seal'&&params.封印对象==='精细')return abilities.hash(controlCore.limitSpec(value))===abilities.hash(value);
      return key==='领域阵营'&&['payload','status','movement'].includes(template.family)&&DOMAIN_FACTIONS.includes(value);
    }catch{return false;}
  }

  const controlCore = foundation.CONTROL_CORE;
  const influenceBounds={...controlCore.DURATION_BOUNDS,持续回合:[1,6],强度:[1,6],命令域:['战斗','移动','言语','物品','全部'],控制距离:['同场','远程']};
  const influenceDefaults={...controlCore.DURATION_DEFAULTS,来源依赖:'施术者清醒',持续回合:2,强度:1,命令域:'战斗',控制距离:'同场'};
  // Status grants and attack-local overlays share the same combat arbitration.
  const HIT_RULE_SPECS=Object.freeze({
    hit_advantage:{name:'命中优势',cost:72,age:'百年',rank:'进阶',inline:true},
    hit_disadvantage:{name:'命中干扰',cost:82,age:'百年',rank:'进阶'},
    hit_reroll:{name:'失手重掷',cost:110,age:'千年',rank:'进阶',inline:true},
    evasion_reroll:{name:'规避重掷',cost:125,age:'千年',rank:'进阶'},
    sure_hit:{name:'必中',cost:200,age:'万年',rank:'规则',inline:true,graded:true},
    absolute_evasion:{name:'绝对闪避',cost:220,age:'万年',rank:'规则',graded:true},
    critical_guarantee:{name:'会心保证',cost:190,age:'万年',rank:'强力',inline:true},
    critical_guard:{name:'暴击抑制',cost:120,age:'千年',rank:'进阶'},
    miss_graze:{name:'失手补偿',cost:90,age:'千年',rank:'进阶',inline:true,graze:true}
  });
  const HIT_RULE_IDS=Object.freeze(Object.keys(HIT_RULE_SPECS).flatMap(kind=>['status.'+kind,...(HIT_RULE_SPECS[kind].inline?['modifier.'+kind]:[])]));
  function hitRuleDefinition(kind,inline){
    const spec=HIT_RULE_SPECS[kind],bounds={...(spec.graded?{等级:[1,3]}:{}),...(spec.graze?{擦伤比例:[10,50]}:{}),...(!inline?{次数:[1,9],持续回合:[1,6]}:{})};
    const defaults={...(spec.graded?{等级:1}:{}),...(spec.graze?{擦伤比例:25}:{}),...(!inline?{次数:1,持续回合:2}:{})};
    return effect({family:'status',displayName:(inline?'本次攻击·':'')+spec.name,baseCost:inline?Math.max(35,spec.cost-50):spec.cost,executor:inline?'modifyHitCheck':'applyStatus',mechanismLevel:spec.rank,minimumAgeTier:spec.age,sourceTags:['命中干涉','命运','因果','预知','锁定'],expressionTags:['判定干涉',spec.name],parameterBounds:bounds,parameterDefaults:defaults,hitRule:{kind,inline},...(inline?{placement:'attack.check'}:{duration:'固定回合或次数耗尽',stacking:'同来源刷新，不同来源独立，仅最高适用来源生效',cleanup:'次数耗尽、持续结束或驱散'})});
  }
  const EFFECT_REGISTRY = Object.freeze(Object.fromEntries(Object.entries({
    'contract.oath':effect({family:'contract',displayName:'灵魂誓约',baseCost:200,executor:'formPersonContract',minimumAgeTier:'万年',mechanismLevel:'强力',sourceTags:['灵魂','契约'],expressionTags:['誓约'],parameterBounds:{持续分钟:[1,10080]},parameterDefaults:{持续分钟:1440}}),
    'trigger.contract':effect({family:'trigger',displayName:'背誓与解约发作',baseCost:120,executor:'contractTrigger',minimumAgeTier:'万年',mechanismLevel:'强力',sourceTags:['灵魂','契约'],expressionTags:['违约'],parameterBounds:{每人次数:[1,99]},parameterDefaults:{每人次数:1}}),
    'payload.death':effect({family:'payload',displayName:'死亡',baseCost:2400,executor:'realDeath',minimumAgeTier:'十万年',mechanismLevel:'规则',sourceTags:['死亡'],expressionTags:['死亡'],parameterBounds:{},parameterDefaults:{}}),
    'modifier.world_duration':effect({family:'modifier',displayName:'长期世界期限',baseCost:320,executor:'worldDuration',minimumAgeTier:'万年',mechanismLevel:'强力',sourceTags:['时间','持续'],expressionTags:['长期'],parameterBounds:{持续分钟:[10081,5184000]},parameterDefaults:{持续分钟:518400}}),
    'status.limited_followup':effect({family:'status',displayName:'蓄势追击',baseCost:64,executor:'limitedFollowup',minimumAgeTier:'千年',mechanismLevel:'进阶',sourceTags:['有限追击'],expressionTags:['追击','同源载荷'],parameterBounds:{资源槽:[1,8],层数:[1,9],每回合上限:[1,3],持续回合:[1,6],类型:DAMAGE_TYPES,骰数:[1,96],骰面:[4,12],加值:[0,400],事件槽:[1,8]},parameterDefaults:{资源槽:1,层数:3,每回合上限:1,持续回合:3,类型:'阴',骰数:2,骰面:6,加值:4,事件槽:2},duration:'固定回合或层数耗尽',stacking:'同源同槽刷新',cleanup:'耗尽、到期或驱散'}),
    'payload.stack_confluence':effect({family:'payload',displayName:'追击合流',baseCost:80,executor:'stackConfluence',minimumAgeTier:'千年',mechanismLevel:'进阶',sourceTags:['有限追击'],expressionTags:['合流','同源载荷'],parameterBounds:{资源槽:[1,8],最大数量:[1,9],事件槽:[1,8]},parameterDefaults:{资源槽:1,最大数量:3,事件槽:4}}),
    'status.next_check_penalty':effect({family:'status',displayName:'出手干扰',baseCost:82,executor:'nextCheckPenalty',minimumAgeTier:'千年',mechanismLevel:'进阶',sourceTags:['检定压制'],expressionTags:['检定','削弱'],parameterBounds:{检定:['魂力攻击','物理攻击','豁免'],数值:[-6,-1],次数:[1,3],持续回合:[1,6],命中后抵抗:[true,false],抵抗属性:SAVE_ATTRIBUTES},parameterDefaults:{检定:'魂力攻击',数值:-2,次数:1,持续回合:1,命中后抵抗:true,抵抗属性:'意志'}}),
    'status.battle_resource':effect({family:'status',displayName:'战斗蓄能',baseCost:64,executor:'battleResource',minimumAgeTier:'万年',mechanismLevel:'强力',sourceTags:['战斗资源'],expressionTags:['积累','资源'],parameterBounds:{资源槽:[1,8],容量:[1,99],归属:['本体']},requiresExplicitParameters:['事件规则'],parameterDefaults:{资源槽:2,容量:30,归属:'本体'},timing:'持有能力且来源可用期间',duration:'本场战斗',stacking:'同一本体同槽唯一',cleanup:'战斗结束清空'}),
    'payload.resource_damage':effect({family:'payload',displayName:'蓄势一击',baseCost:80,executor:'resourceDamage',minimumAgeTier:'万年',mechanismLevel:'强力',sourceTags:['战斗资源'],expressionTags:['积累','伤害'],parameterBounds:{资源槽:[1,8],类型:DAMAGE_TYPES,骰数:[1,96],骰面:[4,12],加值:[0,400],每层骰数:[0,12],每层加值:[0,100],最低层数:[1,99],最大计入层数:[1,99]},requiresExplicitParameters:['最大计入层数'],parameterDefaults:{资源槽:2,类型:'阴',骰数:8,骰面:6,加值:24,每层骰数:1,每层加值:2,最低层数:1}}),
    'payload.resource_endstate':effect({family:'payload',displayName:'力竭',baseCost:0,executor:'resourceEndstate',minimumAgeTier:'万年',mechanismLevel:'强力',sourceTags:['战斗资源'],expressionTags:['代价','资源'],parameterBounds:{承担者:['本体','施术者'],生命终值:[1,1],魂力终值:[0,0]},parameterDefaults:{承担者:'本体',生命终值:1,魂力终值:0},timing:'攻击与反应完成后',cleanup:'不可净化的本次代价'}),
    'payload.zone_dispel':effect({family:'payload',displayName:'破除遮蔽',baseCost:118,executor:'zoneDispel',minimumAgeTier:'千年',mechanismLevel:'进阶',sourceTags:['区域驱散'],expressionTags:['净化','空间解除'],parameterBounds:{类别:['遮蔽'],半径区:[0,3],最大数量:[1,4],落点:['自身']},parameterDefaults:{类别:'遮蔽',半径区:1,最大数量:2,落点:'自身'}}),
    ...Object.fromEntries(HIT_RULE_IDS.map(id=>[id,hitRuleDefinition(id.split('.')[1],id.startsWith('modifier.'))])),
    'status.mind_control':effect({family:'status',displayName:'精神控制',baseCost:170,executor:'applyStatus',mechanismLevel:'进阶',minimumAgeTier:'千年',sourceTags:['精神','封印'],expressionTags:['控制','精神'],parameterBounds:influenceBounds,parameterDefaults:influenceDefaults,duration:'声明期限',stacking:'不同来源独立',cleanup:'指定来源结束或净化'}),
    'status.soul_control':effect({family:'status',displayName:'灵魂控制',baseCost:240,executor:'applyStatus',mechanismLevel:'强力',minimumAgeTier:'万年',sourceTags:['灵魂','封印'],expressionTags:['控制','灵魂'],parameterBounds:influenceBounds,parameterDefaults:influenceDefaults,duration:'声明期限',stacking:'不同来源独立',cleanup:'指定来源结束或净化'}),
    'status.cognition_shift':effect({family:'status',displayName:'认知改造',baseCost:260,executor:'applyStatus',mechanismLevel:'强力',minimumAgeTier:'万年',sourceTags:['精神','灵魂'],expressionTags:['控制','认知'],parameterBounds:{...controlCore.DURATION_BOUNDS,持续回合:[1,6],强度:[1,6],认知方向:['信任施术者','畏惧施术者','服从施术者','屏蔽既往经历','自由改造'],关系作用域:['本人认知','认知与现实'],认知保留:['随来源','保留'],改造方式:['渐进','立即'],改造分钟:[1,1440]},parameterDefaults:{...controlCore.DURATION_DEFAULTS,持续方式:'世界分钟',持续分钟:60,来源依赖:'施术者清醒',持续回合:2,强度:1,认知方向:'信任施术者',关系作用域:'本人认知',认知保留:'随来源',改造方式:'渐进',改造分钟:10},duration:'声明期限',stacking:'不同来源独立',cleanup:'状态逐来源结束；永久认知保留'}),
    'transform.disguise':effect({family:'transform',displayName:'伪装',selfApplication:'voluntary',baseCost:120,executor:'applyStatus',mechanismLevel:'进阶',minimumAgeTier:'千年',sourceTags:['变身','幻象','伪装'],expressionTags:['伪装','易容'],parameterBounds:{...controlCore.DURATION_BOUNDS,持续回合:[1,6],强度:[1,6],伪装方式:['幻象','高级拟态'],掩饰声音:[false,true],掩饰魂息:[false,true],武魂伪装:[false,true],识破难度加值:[0,4]},parameterDefaults:{...controlCore.DURATION_DEFAULTS,持续方式:'世界分钟',持续分钟:60,来源依赖:'独立',持续回合:2,强度:1,伪装方式:'幻象',掩饰声音:false,掩饰魂息:false,武魂伪装:false,识破难度加值:0},requiresExplicitParameters:['伪装模板'],structuredParameterBounds:{伪装模板:{type:'object',required:['外貌'],additionalProperties:false,properties:Object.fromEntries(globalThis.SoulDisguise.KEYS.map(key=>[key,key==='公开性别'?{enum:['男','女','不变']}:{type:'string',maxLength:['外貌','声音','武魂表象','魂环表象'].includes(key)?1200:180}]))}},duration:'声明期限',stacking:'不同来源独立，强度与事件顺序决定当前表象',cleanup:'声明期限、主动解除或合法驱散'}),
    'transform.sex':effect({family:'transform',displayName:'身体性转',baseCost:220,executor:'applyStatus',mechanismLevel:'强力',minimumAgeTier:'万年',sourceTags:['生命','变身','阴','阳'],expressionTags:['身体','性转'],parameterBounds:{...controlCore.DURATION_BOUNDS,持续回合:[1,6],强度:[1,6],目标性别:['男','女','反转','原始'],变化保留:['随来源','保留']},parameterDefaults:{...controlCore.DURATION_DEFAULTS,持续方式:'世界分钟',持续分钟:60,来源依赖:'独立',持续回合:2,强度:1,目标性别:'反转',变化保留:'随来源'},duration:'声明期限',stacking:'不同来源独立，强度及事件顺序决定当前身体',cleanup:'随来源的变化按来源移除；保留形态需明确逆转'}),
    'release.touch': effect({family: 'release', displayName: '接触释放', baseCost: 8, executor: 'selectRelease', sourceTags: ['接触', '触须', '爪牙'], expressionTags: ['接触', '近战']}),
    'release.melee': effect({family: 'release', displayName: '近战释放', baseCost: 12, executor: 'selectRelease', sourceTags: ['近战', '肢体', '武器'], expressionTags: ['近战', '器武魂']}),
    'release.projectile': effect({family: 'release', displayName: '投射释放', baseCost: 28, executor: 'selectRelease', sourceTags: ['喷吐', '射击', '延伸', '能量'], expressionTags: ['远程', '投射', '延伸'], parameterBounds: {距离区: [1, 5]}}),
    'target.single': effect({family: 'targeting', displayName: '单体目标', baseCost: 8, executor: 'selectTargets', parameterBounds: {目标数: [1, 1], ...TARGET_COMMON_BOUNDS}}),
    'target.allies':effect({family:'targeting',displayName:'自选友方',baseCost:18,executor:'selectTargets',sourceTags:['能量','守护','增幅'],expressionTags:['增幅','光环','群体'],parameterBounds:{距离区:[1,4],阵营规则:['友方']},parameterDefaults:{距离区:3,阵营规则:'友方'}}),
    'status.amplify':effect({family:'status',displayName:'持续增幅',baseCost:12,executor:'applyStatus',sourceTags:['增幅','守护','生命','能量'],expressionTags:['增幅','防御','魂力','强化'],parameterBounds:{指标:globalThis.SoulSupportCore.METRICS,数值:[0,100],持续方式:['来源维持']},parameterDefaults:{数值:1,持续方式:'来源维持'},duration:'由来源维持',stacking:'同指标取最高，不同指标相加',cleanup:'来源停止、离距、退场、失能或战斗结束'}),
    'target.cluster': effect({family: 'targeting', displayName: '小范围簇', baseCost: 70, executor: 'selectTargets', minimumAgeTier: '百年', sourceTags: ['爆发', '扩散', '群体'], expressionTags: ['范围', '扩散'], parameterBounds: {最大目标: [2, 5], ...TARGET_COMMON_BOUNDS}}),
    'target.line': effect({family: 'targeting', displayName: '直线', baseCost: 58, executor: 'selectTargets', minimumAgeTier: '百年', sourceTags: ['冲锋', '射线', '长体'], expressionTags: ['直线', '突进', '延伸'], parameterBounds: {最大目标: [2, 6], ...TARGET_COMMON_BOUNDS}}),
    'target.self': effect({family: 'targeting', displayName: '自身', baseCost: 4, executor: 'selectTargets', expressionTags: ['自我强化', '防御'], parameterBounds: {...TARGET_COMMON_BOUNDS}}),
    'target.aura': effect({family: 'targeting', displayName: '光环快照', baseCost: 105, executor: 'selectTargets', mechanismLevel: '进阶', minimumAgeTier: '千年', sourceTags: ['领域', '气味', '威压'], expressionTags: ['光环', '领域'], parameterBounds: {距离区: [0, 2], ...TARGET_COMMON_BOUNDS}}),
    'target.cone': effect({family: 'targeting', displayName: '锥形区域', baseCost: 82, executor: 'selectTargets', minimumAgeTier: '百年', sourceTags: ['吐息', '扩散', '扇形'], expressionTags: ['锥形', '范围'], parameterBounds: {距离区: [1, 3], 最大目标: [2, 6], ...TARGET_COMMON_BOUNDS}}),
    'target.burst': effect({family: 'targeting', displayName: '指定爆发区域', baseCost: 88, executor: 'selectTargets', minimumAgeTier: '百年', sourceTags: ['爆发', '领域', '群体'], expressionTags: ['范围', '锁定'], parameterBounds: {半径区: [0, 3], 最大目标: [2, 16], ...TARGET_COMMON_BOUNDS}}),
    'target.chain': effect({family: 'targeting', displayName: '连锁多目标', baseCost: 92, executor: 'selectTargets', mechanismLevel: '进阶', minimumAgeTier: '千年', sourceTags: ['连锁', '多段', '传导'], expressionTags: ['多目标', '连锁'], parameterBounds: {最大目标: [2, 6], 跳跃区: [0, 2], ...TARGET_COMMON_BOUNDS}}),
    'check.physical_attack': effect({family: 'check', displayName: '物理攻击检定', baseCost: 22, executor: 'rollAttack', expressionTags: ['近战', '武器', '力量', '敏捷'], parameterBounds: {命中加值: [0, 60], 护甲穿透: [0, 3]}}),
    'check.soul_attack': effect({family: 'check', displayName: '魂力攻击检定', baseCost: 28, executor: 'rollAttack', expressionTags: ['魂力', '操控', '远程'], parameterBounds: {命中加值: [0, 60]}}),
    'check.save': effect({family: 'check', displayName: '属性豁免', baseCost: 30, executor: 'rollSave', parameterBounds: {属性: SAVE_ATTRIBUTES, 成功效果: ['无', '伤害减半'], 难度加值: [0, 60]}}),
    'payload.damage': effect({family: 'payload', displayName: '伤害', baseCost: 42, executor: 'dealDamage', sourceTags: ['力量', '火焰', '毒素', '精神', '冲击'], expressionTags: ['伤害', '力量', '元素', '精神'], parameterBounds: {类型: DAMAGE_TYPES, 骰数: [1, 96], 骰面: [4, 12], 加值: [0, 400], 穿透档: [0, 1]}}),
    'payload.residual': effect({family: 'payload', displayName: '微弱残响', baseCost: 0, executor: 'dealDamage', sourceTags: ['残响', '本能', '魂环'], expressionTags: ['微弱伤害', '残响'], parameterBounds: {类型: DAMAGE_TYPES, 数值: [1, 1]}}),
    'payload.shield': effect({family: 'payload', displayName: '护盾', baseCost: 48, executor: 'grantShield', sourceTags: ['甲壳', '韧性', '守护'], expressionTags: ['防御', '护盾'], parameterBounds: {骰数: [1, 96], 骰面: [4, 12], 加值: [0, 400]}}),
    'payload.heal': effect({family: 'payload', displayName: '治疗', baseCost: 60, executor: 'heal', sourceTags: ['生命', '再生'], expressionTags: ['生命', '治疗'], parameterBounds: {骰数: [1, 96], 骰面: [4, 12], 加值: [0, 400]}}),
    'payload.arcane_lock': effect({family:'payload',displayName:'临时魔法锁',baseCost:160,executor:'deviceOperation',minimumAgeTier:'千年',mechanismLevel:'进阶',sourceTags:['锁定解构','封印','灵魂'],expressionTags:['魔法锁'],requires:['release.touch'],parameterBounds:{最高品级:[1,9],锁难度:[10,40],持续分钟:[1,10080]},parameterDefaults:{最高品级:1,锁难度:14,持续分钟:10}}),
    'payload.unlock': effect({family:'payload',displayName:'实体解锁',baseCost:100,executor:'deviceOperation',minimumAgeTier:'百年',mechanismLevel:'进阶',sourceTags:['锁定解构','金属','灵魂'],expressionTags:['解锁'],requires:['release.touch'],parameterBounds:{最高品级:[1,9],强度:[1,9]},parameterDefaults:{最高品级:1,强度:1}}),
    'payload.suppress_lock': effect({family:'payload',displayName:'暂抑锁效',baseCost:140,executor:'deviceOperation',minimumAgeTier:'千年',mechanismLevel:'进阶',sourceTags:['锁定解构','封印','灵魂'],expressionTags:['抑制锁效'],requires:['release.touch'],parameterBounds:{最高品级:[1,9],强度:[1,9],持续分钟:[1,10080]},parameterDefaults:{最高品级:1,强度:1,持续分钟:1}}),
    'payload.rule_break': effect({family:'payload',displayName:'条件规则破坏',baseCost:260,executor:'deviceOperation',minimumAgeTier:'万年',mechanismLevel:'规则',sourceTags:['毁灭','条件规则破坏'],expressionTags:['毁器'],requires:['release.touch'],parameterBounds:{破坏规则:['destruction'],最高品级:[1,9],强度:[1,9]},parameterDefaults:{破坏规则:'destruction',最高品级:1,强度:1}}),
    'payload.analyze_lock': effect({family:'payload',displayName:'分析实体锁',baseCost:80,executor:'deviceOperation',minimumAgeTier:'百年',mechanismLevel:'进阶',sourceTags:['锁定解构','金属','灵魂'],expressionTags:['锁知识'],requires:['release.touch'],parameterBounds:{最高品级:[1,9],强度:[1,9]},parameterDefaults:{最高品级:1,强度:1}}),
    'payload.create_key': effect({family:'payload',displayName:'实体钥匙造物',baseCost:200,executor:'deviceOperation',minimumAgeTier:'千年',mechanismLevel:'进阶',sourceTags:['永久造物','锁定解构','金属'],expressionTags:['制造','钥匙'],requires:['release.touch'],parameterBounds:{最高品级:[1,9],价值上限:[20,100000]},parameterDefaults:{最高品级:1,价值上限:100}}),
    'payload.repair_item': effect({family:'payload',displayName:'装备修复',baseCost:120,executor:'repairItem',minimumAgeTier:'千年',mechanismLevel:'进阶',sourceTags:['物质修复','金属','木质','土'],expressionTags:['修复','构造'],parameterBounds:{修复量:[1,100],价值上限:[20,10000000]},parameterDefaults:{修复量:10,价值上限:100}}),
    'realm.store':effect({family:'payload',displayName:'空间收容',allowedContexts:['field'],copyable:false,baseCost:200,executor:'captureResident',minimumAgeTier:'万年',mechanismLevel:'强力',sourceTags:['空间','封印'],expressionTags:['收容'],parameterBounds:{容量:[1,9],持续分钟:[1,10080],投影比例:[0,100],真身调遣:[false,true],来源依赖:['独立','施术者存活','施术者清醒','施术武魂','道具有效']},parameterDefaults:{容量:1,持续分钟:60,投影比例:0,真身调遣:false,来源依赖:'独立'}}),
    'realm.capture': effect({family:'payload',displayName:'收入独立空间',allowedContexts:['field'],authorable:false,copyable:false,baseCost:40,executor:'captureResident',minimumAgeTier:'十年',mechanismLevel:'基础',sourceTags:['空间','封印'],expressionTags:['收押'],parameterBounds:{},parameterDefaults:{}}),
    'realm.deploy': effect({family:'payload',displayName:'召唤对应画中人物',allowedContexts:['field','battle'],authorable:false,copyable:false,baseCost:16,executor:'deployResident',minimumAgeTier:'十年',mechanismLevel:'基础',sourceTags:['空间'],expressionTags:['召唤'],parameterBounds:{席位:[1,9]},parameterDefaults:{席位:1}}),
    'payload.fabricate': effect({family:'payload',displayName:'永久造物',baseCost:200,executor:'fabricateItem',minimumAgeTier:'千年',mechanismLevel:'进阶',sourceTags:['永久造物','创造','金属','木质','土'],expressionTags:['制造','构造'],parameterBounds:{价值上限:[20,100000],最大数量:[1,10]},parameterDefaults:{价值上限:100,最大数量:1}}),
    'payload.soul_damage': effect({family: 'payload', displayName: '魂力损伤', baseCost: 76, executor: 'changeSoulPower', mechanismLevel: '进阶', minimumAgeTier: '千年', sourceTags: ['吞噬', '灵魂', '精神'], expressionTags: ['魂力', '精神'], parameterBounds: {数值: [1, 50]}}),
    'payload.soul_restore': effect({family: 'payload', displayName: '魂力恢复', baseCost: 82, executor: 'changeSoulPower', mechanismLevel: '进阶', minimumAgeTier: '千年', sourceTags: ['生命', '能量', '吞噬'], expressionTags: ['魂力', '恢复'], parameterBounds: {数值: [1, 50]}}),
    'payload.restore': effect({family: 'payload', displayName: '动态生命魂力恢复', baseCost: 80, executor: 'restoreResources', mechanismLevel: '进阶', minimumAgeTier: '千年', sourceTags: ['生命', '能量', '再生', '食物'], expressionTags: ['生命', '魂力', '恢复'], parameterBounds: {生命模式: ['无', '定量', '缺失比例', '恢复至上限'], 生命数值: [0, 100], 魂力模式: ['无', '定量', '缺失比例', '恢复至上限'], 魂力数值: [0, 100], 世界日冷却: [0, 30], 每日次数: [0, 20]}, parameterDefaults: {生命模式: '无', 生命数值: 0, 魂力模式: '无', 魂力数值: 0, 世界日冷却: 0, 每日次数: 0}}),
    'payload.cleanse': effect({family: 'payload', displayName: '净化', baseCost: 92, executor: 'cleanseStatuses', minimumAgeTier: '百年', sourceTags: ['净化', '生命', '解毒'], expressionTags: ['治疗', '解除'], parameterBounds: {类别: ['负面', '毒素', '精神', '灵魂', '控制', '任意'], 最大数量: [1, 5]}}),
    'payload.dispel': effect({family: 'payload', displayName: '驱散', baseCost: 118, executor: 'dispelEffects', mechanismLevel: '进阶', minimumAgeTier: '千年', sourceTags: ['净化', '精神', '规则'], expressionTags: ['解除', '反制'], parameterBounds: {最大数量: [1, 4]}}),
    'payload.revive': effect({family: 'payload', displayName: '复活', baseCost: 340, executor: 'reviveTarget', mechanismLevel: '强力', minimumAgeTier: '万年', sourceTags: ['生命', '神圣', '复苏'], expressionTags: ['复活', '生命'], parameterBounds: {生命百分比: [1, 50]}}),
    'payload.drain': effect({family: 'payload', displayName: '生命汲取', baseCost: 112, executor: 'drainLife', mechanismLevel: '进阶', minimumAgeTier: '千年', sourceTags: ['吞噬', '黑暗', '生命'], expressionTags: ['伤害', '治疗'], parameterBounds: {类型: DAMAGE_TYPES, 骰数: [1, 6], 骰面: [4, 10], 加值: [0, 20], 转化百分比: [25, 100], 穿透档: [0, 1]}}),
    'status.bind': effect({family: 'status', displayName: '束缚', baseCost: 92, executor: 'applyStatus', sourceTags: ['藤蔓', '缠绕', '丝网', '长体'], expressionTags: ['控制', '缠绕', '延伸'], parameterBounds: {持续回合: [1, 4], 挣脱属性: ['力量', '身法']}, duration: '固定回合或挣脱', stacking: '刷新', cleanup: '持续结束或挣脱成功'}),
    'status.paralysis': effect({family: 'status', displayName: '麻痹积累', baseCost: 88, executor: 'applyStatus', sourceTags: ['神经毒', '雷电', '麻痹'], expressionTags: ['毒素', '雷电', '控制'], parameterBounds: {层数: [1, 3], 阈值: [2, 5], 持续回合: [1, 4]}, duration: '固定回合', stacking: '叠层', cleanup: '持续结束'}),
    'status.burn': effect({family: 'status', displayName: '灼烧', baseCost: 72, executor: 'applyStatus', sourceTags: ['火焰', '高温'], expressionTags: ['火焰', '能量'], parameterBounds: {持续回合: [1, 5], 骰数: [1, 4], 骰面: [4, 8]}, duration: '固定回合', stacking: '刷新或叠层', cleanup: '持续结束或灭火'}),
    'status.poison': effect({family: 'status', displayName: '中毒', baseCost: 76, executor: 'applyStatus', sourceTags: ['毒液', '毒素'], expressionTags: ['毒素', '生命'], parameterBounds: {持续回合: [1, 6], 骰数: [1, 4], 骰面: [4, 8]}, duration: '固定回合', stacking: '叠层', cleanup: '持续结束或解毒'}),
    'status.armor_break': effect({family: 'status', displayName: '破甲', baseCost: 78, executor: 'applyStatus', sourceTags: ['冲击', '穿透', '利爪'], expressionTags: ['力量', '破坏', '武器'], parameterBounds: {数值: [1, 5], 持续回合: [1, 4]}, duration: '固定回合', stacking: '取最高', cleanup: '持续结束'}),
    'passive.equipment_stat': effect({family:'status',displayName:'装备常驻加成',baseCost:0,executor:'equipmentStat',timing:'装备期间自然生效',duration:'装备期间',stacking:'按装备来源汇总，受整套上限限制',cleanup:'卸下装备后失效',parameterBounds:{属性:Object.keys(foundation.EQUIPMENT_AFFIXES.REGISTRY),数值:[1,400]},parameterDefaults:{数值:1}}),
    'passive.element_amplify': effect({family:'status',displayName:'属性伤害增幅',baseCost:0,executor:'equipmentElementAmplify',timing:'装备期间对应属性伤害结算时',duration:'装备期间',stacking:'同属性相加，单件30%，整套60%',cleanup:'卸下装备后失效；已施加持续伤害保留来源快照',parameterBounds:{类型:DAMAGE_TYPES,数值:[5,30]},parameterDefaults:{数值:5}}),
    'status.buff': effect({family: 'status', displayName: '战斗数值修正', baseCost: 64, executor: 'applyStatus', sourceTags: ['生命', '速度', '韧性', '力量'], expressionTags: ['增幅', '压制', '辅助'], parameterBounds: {属性: [...foundation.ATTRIBUTE_KEYS, '物理防御', '魂技防御', '移动区', '攻击检定', '豁免检定', '伤害加值'], 数值: [-6, 6], 持续回合: [1, 5]}, parameterDefaults: {数值: 1}, duration: '固定回合', stacking: '取绝对值最高', cleanup: '持续结束'}),
    'status.stun': effect({family: 'status', displayName: '眩晕', baseCost: 168, executor: 'applyStatus', mechanismLevel: '进阶', minimumAgeTier: '千年', sourceTags: ['震荡', '精神', '麻痹'], expressionTags: ['硬控制'], parameterBounds: {持续回合: [1, 3]}, duration: '固定回合', stacking: '同来源刷新，不同来源独立', cleanup: '持续结束或净化'}),
    'status.fear': effect({family: 'status', displayName: '恐惧', baseCost: 112, executor: 'applyStatus', minimumAgeTier: '百年', sourceTags: ['威压', '精神', '杀气'], expressionTags: ['控制', '压制'], parameterBounds: {持续回合: [1, 5]}, duration: '固定回合', stacking: '同来源刷新，不同来源独立', cleanup: '持续结束、来源失能或净化'}),
    'status.charm': effect({family: 'status', displayName: '魅惑', baseCost: 122, executor: 'applyStatus', minimumAgeTier: '百年', sourceTags: ['精神', '魅惑'], expressionTags: ['控制', '心灵'], parameterBounds: {持续回合: [1, 4]}, duration: '固定回合', stacking: '同来源刷新，不同来源独立', cleanup: '持续结束、来源失能或净化'}),
    'status.blind': effect({family: 'status', displayName: '致盲', baseCost: 102, executor: 'applyStatus', minimumAgeTier: '百年', sourceTags: ['黑暗', '强光', '烟雾'], expressionTags: ['感知', '控制'], parameterBounds: {持续回合: [1, 4]}, duration: '固定回合', stacking: '同来源刷新，不同来源独立', cleanup: '持续结束或净化'}),
    'status.silence': effect({family: 'status', displayName: '封技', baseCost: 136, executor: 'applyStatus', mechanismLevel: '进阶', minimumAgeTier: '千年', sourceTags: ['沉默', '封印', '精神'], expressionTags: ['控制', '封技'], parameterBounds: {持续回合: [1, 4]}, duration: '固定回合', stacking: '同来源刷新，不同来源独立', cleanup: '持续结束或净化'}),
    'status.mute': effect({family:'status',displayName:'禁声',baseCost:60,executor:'applyStatus',sourceTags:['封印','缠绕','声音'],expressionTags:['控制','发声'],parameterBounds:{...controlCore.DURATION_BOUNDS,持续回合:[1,6]},parameterDefaults:{...controlCore.DURATION_DEFAULTS},duration:'固定回合',stacking:'不同来源独立',cleanup:'持续结束或净化'}),
    'status.desire': effect({family:'status',displayName:'欲火',baseCost:112,executor:'applyStatus',minimumAgeTier:'百年',sourceTags:['精神','心灵','情绪'],expressionTags:['精神','情绪'],parameterBounds:{...controlCore.DURATION_BOUNDS,强度:[1,3],持续回合:[1,6]},parameterDefaults:{持续方式:'世界分钟',持续分钟:10,来源依赖:'独立',强度:1},duration:'个人分钟',stacking:'同来源刷新，不同来源独立，强度取最高',cleanup:'到期或净化'}),
    'intimate.stimulate': effect({family:'payload',displayName:'情欲刺激',baseCost:96,executor:'applyIntimate',minimumAgeTier:'百年',sourceTags:['精神','淫','欲念'],expressionTags:['精神','情绪','淫'],parameterBounds:{...controlCore.DURATION_BOUNDS,数值:[10,100],部位:['下体前','阴蒂','尿道','后庭','乳头','口腔']},parameterDefaults:{数值:30,部位:'下体前'},duration:'立即',stacking:'每次独立',cleanup:'立即结算'}),
    'intimate.climax': effect({family:'payload',displayName:'强制高潮',baseCost:210,executor:'applyIntimate',minimumAgeTier:'万年',sourceTags:['精神','淫','欲念'],expressionTags:['精神','控制','淫'],parameterBounds:{...controlCore.DURATION_BOUNDS,部位:['下体前','阴蒂','尿道','后庭','乳头','口腔']},parameterDefaults:{部位:'下体前'},duration:'立即',stacking:'每次独立',cleanup:'立即结算'}),
    'status.limb_bind': effect({family:'status',displayName:'肢体拘束',baseCost:82,executor:'applyStatus',sourceTags:['藤蔓','缠绕','封印'],expressionTags:['控制','动作'],parameterBounds:{...controlCore.DURATION_BOUNDS,部位:['双手','双腿','全身'],姿态:['身前','身后'],层数:[1,6],挣脱难度加值:[0,6],挣脱属性:['力量','身法'],持续回合:[1,6]},parameterDefaults:{...controlCore.DURATION_DEFAULTS,部位:'双手',姿态:'身前',层数:1,挣脱难度加值:0,挣脱属性:'力量',持续回合:2},duration:'固定回合或挣脱',stacking:'同来源刷新取最大层数，不同来源独立',cleanup:'逐层挣脱或净化'}),
    'status.power_seal': effect({family:'status',displayName:'能力封印',baseCost:150,executor:'applyStatus',mechanismLevel:'进阶',minimumAgeTier:'千年',sourceTags:['封印','灵魂','精神'],expressionTags:['控制','封印'],parameterBounds:{...controlCore.DURATION_BOUNDS,封印对象:['魂力','武魂','魂技','精细','装备与道具'],范围:['全部','当前武魂'],持续回合:[1,6]},parameterDefaults:{...controlCore.DURATION_DEFAULTS,封印对象:'魂力',范围:'全部',持续回合:2},duration:'固定回合',stacking:'不同来源独立',cleanup:'指定来源净化或驱散'}),
    'status.sleep': effect({family: 'status', displayName: '睡眠', baseCost: 124, executor: 'applyStatus', minimumAgeTier: '百年', sourceTags: ['梦境', '精神', '孢子'], expressionTags: ['控制', '睡眠'], parameterBounds: {持续回合: [1, 5]}, duration: '固定回合或受伤解除', stacking: '同来源刷新，不同来源独立', cleanup: '持续结束、受伤或净化'}),
    'status.slow': effect({family: 'status', displayName: '迟缓', baseCost: 98, executor: 'applyStatus', minimumAgeTier: '百年', sourceTags: ['寒冰', '重力', '束缚'], expressionTags: ['减速', '压制'], parameterBounds: {数值: [1, 3], 持续回合: [1, 5]}, duration: '固定回合', stacking: '不同来源独立，生效取最高', cleanup: '持续结束或净化'}),
    'status.haste': effect({family: 'status', displayName: '加速', baseCost: 126, executor: 'applyStatus', mechanismLevel: '进阶', minimumAgeTier: '千年', sourceTags: ['速度', '雷电', '风'], expressionTags: ['速度', '增幅'], parameterBounds: {数值: [1, 3], 持续回合: [1, 5]}, duration: '固定回合', stacking: '不同来源独立，生效取最高', cleanup: '持续结束或驱散'}),
    'status.invisibility': effect({family: 'status', displayName: '隐身', baseCost: 154, executor: 'applyStatus', mechanismLevel: '进阶', minimumAgeTier: '千年', sourceTags: ['阴影', '幻象', '虚无'], expressionTags: ['隐匿', '幻象'], parameterBounds: {持续回合: [1, 5], 攻击后解除: [false, true]}, duration: '固定回合或攻击后解除', stacking: '同来源刷新，不同来源独立', cleanup: '持续结束、攻击、来源失能或驱散'}),
    'status.invulnerable': effect({family: 'status', displayName: '条件无敌', baseCost: 220, executor: 'applyStatus', mechanismLevel: '进阶', minimumAgeTier: '千年', sourceTags: ['绝对防御', '神圣', '虚无'], expressionTags: ['无敌', '防御'], parameterBounds: {持续回合: [1, 5], 次数: [1, 99], 最大攻击魂技序号: [0, 9], 最大攻击者等级: [0, 100], 每日次数: [0, 20]}, parameterDefaults: {持续回合: 1, 次数: 1, 最大攻击魂技序号: 0, 最大攻击者等级: 0, 每日次数: 0}, duration: '固定回合或次数耗尽', stacking: '不同来源独立', cleanup: '持续结束、次数耗尽或驱散'}),
    'status.regeneration': effect({family: 'status', displayName: '再生', baseCost: 106, executor: 'applyStatus', mechanismLevel: '进阶', minimumAgeTier: '千年', sourceTags: ['生命', '再生', '植物'], expressionTags: ['恢复', '生命'], parameterBounds: {...controlCore.DURATION_BOUNDS,持续方式:[...controlCore.DURATION_BOUNDS.持续方式,'来源维持'],持续回合: [1, 6], 骰数: [1, 16], 骰面: [4, 12],加值:[0,100]}, parameterDefaults:{...controlCore.DURATION_DEFAULTS,加值:0}, duration: '回合开始或每世界分钟恢复', stacking: '不同来源独立', cleanup: '持续结束、来源失能或驱散'}),
    'status.status_guard': effect({family: 'status', displayName: '状态防护', baseCost: 124, executor: 'applyStatus', mechanismLevel: '进阶', minimumAgeTier: '千年', sourceTags: ['韧性', '守护'], expressionTags: ['防护'], parameterBounds: {防护对象: foundation.STATUS_GUARD_TARGETS, 模式: ['抗性', '免疫'], 持续回合: [1, 5]}, duration: '固定回合', stacking: '同来源刷新，不同来源独立', cleanup: '持续结束或驱散'}),
    'status.resistance_shift': effect({family: 'status', displayName: '抗性改变', baseCost: 124, executor: 'applyStatus', mechanismLevel: '进阶', minimumAgeTier: '千年', sourceTags: ['属性', '甲壳', '适应'], expressionTags: ['抗性', '免疫', '易伤'], parameterBounds: {类型: DAMAGE_TYPES, 模式: ['抗性', '免疫', '易伤', '吸收'], 持续回合: [1, 5]}, duration: '固定回合', stacking: '不同来源独立，按类型共同结算', cleanup: '持续结束、来源失能或驱散'}),
    'status.damage_over_time':effect({family:'status',displayName:'持续创伤',allowedContexts:['battle'],baseCost:56,executor:'applyStatus',minimumAgeTier:'百年',sourceTags:['创伤','切割','流血'],expressionTags:['持续伤害','创伤'],parameterBounds:{类型:DAMAGE_TYPES,骰数:[1,4],骰面:[4,12],持续回合:[1,6]},parameterDefaults:{类型:'物理',骰数:1,骰面:4,持续回合:2},duration:'固定回合',stacking:'同来源刷新，不同来源独立',cleanup:'持续结束、战斗结束或净化'}),
    'status.mark': effect({family: 'status', displayName: '持续标记追踪', baseCost: 24, executor: 'applyStatus', sourceTags: ['追踪', '定位', '感知', '重力'], expressionTags: ['标记', '追踪'], parameterBounds: {持续回合: [1, 8], 追踪距离区: [1, 4], 不可隐藏: [false, true]}, parameterDefaults: {持续回合: 3, 追踪距离区: 3, 不可隐藏: true}, duration: '固定回合', stacking: '不同来源独立', cleanup: '持续结束、来源失能或净化'}),
    'status.eternal_wound': effect({family: 'status', displayName: '复合永久创伤', baseCost: 80, executor: 'applyStatus', mechanismLevel: '进阶', minimumAgeTier: '千年', sourceTags: ['毒素', '腐蚀', '灵魂', '创伤'], expressionTags: ['持续伤害', '禁疗', '魂力维持'], parameterBounds: {持续回合: [1, 99], 每回合魂力: [1, 30], 治疗削减百分比: [0, 100], 骰数: [1, 4], 骰面: [4, 12], 魂力耗尽倍率: [1, 4], 战斗后保留: [false, true]}, parameterDefaults: {持续回合: 6, 每回合魂力: 5, 治疗削减百分比: 50, 骰数: 1, 骰面: 8, 魂力耗尽倍率: 2, 战斗后保留: true}, duration: '固定回合，可跨战斗保留', stacking: '不同来源独立', cleanup: '持续结束或净化'}),
    'copy.skillset': effect({family: 'status', displayName: '临时技能复制', baseCost: 116, executor: 'copySkills', mechanismLevel: '进阶', minimumAgeTier: '千年', sourceTags: ['复制', '镜像', '精神'], expressionTags: ['复制', '临时技能'], parameterBounds: {复制比例: [10, 100], 持续回合: [1, 10], 最大技能数: [1, 9], 排除魂骨: [false, true], 排除领域: [false, true]}, parameterDefaults: {复制比例: 70, 持续回合: 3, 最大技能数: 1, 排除魂骨: true, 排除领域: true}, duration: '固定回合', stacking: '每次复制独立', cleanup: '持续结束、来源失能或驱散时移除复制技能'}),
    'modifier.next_skill': effect({family: 'status', displayName: '下次技能或制造增幅', baseCost: 72, executor: 'applyStatus', sourceTags: ['增幅', '食物', '制造', '坚固'], expressionTags: ['下次技能', '制造增幅'], parameterBounds: {效果倍率: [100, 200], 魂力消耗倍率: [50, 150], 制造速度倍率: [100, 300], 成品效果倍率: [100, 200], 次数: [1, 3], 持续回合: [1, 6]}, parameterDefaults: {效果倍率: 100, 魂力消耗倍率: 100, 制造速度倍率: 100, 成品效果倍率: 100, 次数: 1, 持续回合: 3}, duration: '固定回合或次数耗尽', stacking: '不同来源独立', cleanup: '持续结束、次数耗尽、来源失能或驱散'}),
    'move.step':effect({family:'movement',displayName:'挪步',allowedContexts:['battle'],baseCost:46,executor:'moveTarget',minimumAgeTier:'百年',sourceTags:['风','速度','步法'],expressionTags:['位移','步法'],requires:['target.self'],parameterBounds:{距离区:[1,2]},parameterDefaults:{距离区:1}}),
    'move.knockback': effect({family: 'movement', displayName: '击退', baseCost: 58, executor: 'moveTarget', sourceTags: ['冲击', '力量', '冲锋'], expressionTags: ['力量', '震荡', '位移'], parameterBounds: {距离区: [1, 2]}}),
    'move.pull': effect({family: 'movement', displayName: '拉拽', baseCost: 58, executor: 'moveTarget', sourceTags: ['藤蔓', '引力', '触须'], expressionTags: ['控制', '位移'], parameterBounds: {距离区: [1, 2]}}),
    'move.teleport': effect({family: 'movement', displayName: '瞬移', baseCost: 176, executor: 'moveTarget', mechanismLevel: '进阶', minimumAgeTier: '千年', sourceTags: ['空间', '闪现', '阴影'], expressionTags: ['空间', '位移'], parameterBounds: {距离区: [1, 4], 目的: ['接近施术者', '远离施术者', '指定站位']}}),
    'move.flight': effect({family: 'movement', displayName: '飞行', baseCost: 134, executor: 'moveTarget', mechanismLevel: '进阶', minimumAgeTier: '千年', sourceTags: ['飞行', '翅膀', '风'], expressionTags: ['飞行', '位移'], parameterBounds: {持续回合: [1, 6], 高度: ['低空', '高空']}, duration: '固定回合', stacking: '不同来源独立，高度取最高', cleanup: '持续结束、来源失能或驱散时重算高度'}),
    'move.approach': effect({family:'movement',displayName:'触及追击',baseCost:30,executor:'approachTarget',placement:'action.before-check',requires:['release.touch','target.single'],minimumAgeTier:'百年',sourceTags:['速度','突进','冲锋','追踪'],expressionTags:['追击','位移','触及'],parameterBounds:{距离区:[1,4]},parameterDefaults:{距离区:1}}),
    'move.pursuit': effect({family: 'movement', displayName: '标记追击', baseCost: 30, executor: 'moveTarget', minimumAgeTier: '百年', sourceTags: ['追踪', '定位', '突进'], expressionTags: ['追击', '位移'], parameterBounds: {距离区: [1, 4], 需要自身标记: [false, true]}, parameterDefaults: {距离区: 2, 需要自身标记: true}}),
    'zone.hazard': effect({family: 'zone', displayName: '危险区域', baseCost: 138, executor: 'createZone', mechanismLevel: '进阶', minimumAgeTier: '千年', sourceTags: ['领域', '火焰', '毒雾', '蛛网'], expressionTags: ['区域', '持续'], parameterBounds: {类型: DAMAGE_TYPES, 骰数: [0, 4], 骰面: [4, 8], 持续回合: [1, 6], 移动修正: [-2, 0]}}),
    'zone.wall': effect({family: 'zone', displayName: '墙体', baseCost: 184, executor: 'createZone', mechanismLevel: '进阶', minimumAgeTier: '千年', sourceTags: ['屏障', '冰墙', '火墙', '力场'], expressionTags: ['阻隔', '地形'], parameterBounds: {持续方式:['回合','世界分钟'],持续分钟:[1,120],耐久: [10, 200], 持续回合: [1, 6], 阻挡: ['移动', '投射', '全部']},parameterDefaults:{持续方式:'回合',持续分钟:1}}),
    'zone.obscure': effect({family: 'zone', displayName: '遮蔽区域', baseCost: 104, executor: 'createZone', minimumAgeTier: '百年', sourceTags: ['烟雾', '黑暗', '幻象'], expressionTags: ['遮蔽', '感知'], parameterBounds: {持续回合: [1, 6], 强度: [1, 3]}}),
    'domain.field': effect({family: 'domain', displayName: '动态领域', baseCost: 176, executor: 'createDomain', mechanismLevel: '进阶', minimumAgeTier: '千年', sourceTags: ['领域', '威压', '环境', '神圣', '精神'], expressionTags: ['领域', '光环', '持续'], parameterBounds: {半径区: [0, 3], 持续回合: [1, 8], 跟随施术者: [false, true], 领域强度: [1, 10], 触发时机: ['进入', '回合开始', '进入与回合开始'], 阵营规则: TARGET_FACTIONS}, cleanup: '持续结束、来源失能或维持中断'}),
    'summon.entity': effect({
      family: 'summon', displayName: '召唤实体', baseCost: 216, executor: 'summonEntity', mechanismLevel: '进阶', minimumAgeTier: '千年',
      sourceTags: ['召唤', '分身', '元素', '镜像'], expressionTags: ['召唤', '分身', '镜像', '能力继承'],
      parameterBounds: {
        持续方式:['回合','世界分钟'],持续分钟:[1,120],模板: ['灵体', '分身', '元素', '兽影'], 数量: [1, 3], 生命百分比: [10, 100], 持续回合: [1, 8],
        继承能力: [false, true], 属性继承百分比: [0, 100], 魂力继承百分比: [0, 100], 技能继承数量: [0, 18], 技能效果倍率: [20, 100],
        排除魂骨: [false, true], 排除领域: [false, true]
      },
      parameterDefaults: {
        持续方式:'回合',持续分钟:1,数量: 1, 生命百分比: 10, 持续回合: 1, 继承能力: false, 属性继承百分比: 0, 魂力继承百分比: 0, 技能继承数量: 0,
        技能效果倍率: 100, 排除魂骨: true, 排除领域: true
      },
      duration: '固定回合', stacking: '每个召唤实体独立', cleanup: '持续结束、死亡或战斗结束时移除实体持有的临时继承技能'
    }),
    'transform.form': effect({family: 'transform', displayName: '形态变化', baseCost: 188, executor: 'transformForm', mechanismLevel: '进阶', minimumAgeTier: '千年', sourceTags: ['变身', '石化', '复制'], expressionTags: ['变身', '形态'], parameterBounds: {属性加值: [0, 8], 持续回合: [1, 6], 形态: ['强化形态', '兽形', '元素形态', '石化', '复制形态']}, duration: '固定回合', stacking: '不同来源独立，同形态生效取最高', cleanup: '持续结束、来源失能或驱散'}),
    'transform.martial_avatar': effect({family: 'transform', displayName: '武魂真身', baseCost: 280, executor: 'transformMartialAvatar', mechanismLevel: '强力', minimumAgeTier: '万年', sourceTags: ['武魂', '血脉', '真身'], expressionTags: ['武魂真身', '同源强化'], parameterBounds: {属性增幅档: [0, 4], 身心防御加值: [0, 4], 基础动作增幅: [0, 4], 同源魂技增幅: [0, 4], 持续回合: [2, 6], 锁定魂力: [8, 30], 每回合魂力: [2, 15], 禁用其他武魂: [true, false]}, parameterDefaults: {属性增幅档: 2, 身心防御加值: 2, 基础动作增幅: 2, 同源魂技增幅: 2, 持续回合: 3, 锁定魂力: 12, 每回合魂力: 5, 禁用其他武魂: true}, duration: '本场战斗、主动解除或维持中断', stacking: '每单位仅一个；同武魂每场一次', cleanup: '死亡、失能、维持中断、战斗结束或主动解除'}),
    'reaction.counter': effect({family: 'reaction', displayName: '反制', baseCost: 224, executor: 'registerReaction', mechanismLevel: '强力', minimumAgeTier: '万年', sourceTags: ['反制', '干扰', '守护'], expressionTags: ['反应', '打断'], parameterBounds: {次数: [1, 3], 强度: [1, 6], 持续回合: [1, 6]}, parameterDefaults: {持续回合: 2}, duration: '固定回合或次数耗尽', stacking: '不同来源独立', cleanup: '持续结束、次数耗尽、来源失能或驱散'}),
    'reaction.reflect': effect({family: 'reaction', displayName: '反弹吸收转化', baseCost: 24, executor: 'registerReaction', sourceTags: ['反弹', '守护', '不动', '神圣'], expressionTags: ['反射', '吸收', '转化'], parameterBounds: {次数: [1, 9], 反射百分比: [0, 100], 最大距离区: [0, 4], 最大攻击魂技序号: [0, 9], 吸收转护盾百分比: [0, 100], 吸收转魂力百分比: [0, 100], 持续回合: [1, 6]}, parameterDefaults: {次数: 1, 反射百分比: 50, 最大距离区: 1, 最大攻击魂技序号: 0, 吸收转护盾百分比: 0, 吸收转魂力百分比: 0, 持续回合: 2}, duration: '固定回合或次数耗尽', stacking: '不同来源独立', cleanup: '持续结束、次数耗尽、来源失能或驱散'}),
    'sustain.maintain': effect({family: 'sustain', displayName: '维持', baseCost: 44, executor: 'maintainEffect', sourceTags: ['持续', '领域', '控制'], expressionTags: ['持续', '维持'], parameterBounds: {锁定魂力: [0, 30], 每回合魂力: [0, 20]}, cleanup: '停止维持、失能或魂力不足'})
  }).map(([id,definition])=>{
    if(OPTIONAL_EFFECT_PARAMETERS[id])definition=Object.freeze({...definition,optionalParameterBounds:OPTIONAL_EFFECT_PARAMETERS[id]});
    if(id==='status.battle_resource')definition=Object.freeze({...definition,structuredParameterBounds:{事件规则:{minimum:1,maximum:16,事件:BATTLE_EVENT_KINDS,事件槽:[1,8],数量:[1,99,'实际']}}});
    if(id==='summon.entity')definition=Object.freeze({...definition,structuredParameterBounds:{继承技能ID:{minimum:0,maximum:18,unique:true,type:'skill-id'}}});
    const penaltyPolicy={'payload.damage':'damage','payload.death':'instant','payload.soul_damage':'instant','status.power_seal':'power','status.buff':'negative-world','status.mute':'world'}[id];
    if(penaltyPolicy)definition=Object.freeze({...definition,contractPenaltyPolicy:penaltyPolicy});
    return [id,controlCore.PERSISTENT_STATUS_IDS.includes(id)?Object.freeze({...definition,parameterBounds:{...controlCore.DURATION_BOUNDS,...definition.parameterBounds},parameterDefaults:{...controlCore.DURATION_DEFAULTS,...definition.parameterDefaults}}):definition];
  })));

  const EFFECT_IDS_BY_TEMPLATE=new WeakMap(Object.entries(EFFECT_REGISTRY).map(([id,template])=>[template,id]));
  const VALUE_REGISTRY = Object.freeze({
    version: '0.5.0-value1',
    rule: '节点基础价与所有机械参数价相加；伤害类型、豁免属性、表现标签等纯语义选择为显式零价。',
    zeroCostSemanticParameters: ['类型', '属性', '挣脱属性', '类别', '模板', '形态', '高度', '目的', '阻挡'],
    targetFactionPrice: {自动: 0, 敌方: 4, 友方: 4, 任意: 28, 无差别: -12},
    targetSelectionPrice: {主目标: 0, 自动最近: 10, 自动最低生命: 26, 全部合法: 34},
    allocationStyles: clone(ALLOCATION_STYLES),
    invariant: '魂环序号不提供威力；身体容量决定可吸收年限，年限与契合度共同决定可用点数。'
  });

  const STATUS_GUARD_BRIDGES = Object.freeze({
    'bridge.plant-entangle':['status.bind','status.mute','status.limb_bind'],
    'bridge.venom-transmission':['status.poison','status.paralysis'],
    'bridge.hammer-kinetic':['status.stun','status.armor_break'],
    'bridge.flame-conduction':['status.burn'],
    'bridge.vitality-shaping':['status.poison','status.eternal_wound'],
    'bridge.motion-expression':['status.slow'],
    'bridge.mind-resonance':['status.fear','status.charm','status.desire','status.sleep','status.mind_control','status.cognition_shift'],
    'bridge.yin-expression':['status.buff','status.slow'],
    'bridge.yang-expression':['status.buff','status.armor_break'],
    'bridge.lust-resonance':['status.charm','status.desire','intimate.stimulate','intimate.climax'],
    'bridge.soul-resonance':['status.soul_control'],
    'bridge.frost-structure':['status.slow'],
    'bridge.lightning-conduction':['status.paralysis','status.stun'],
    'bridge.shadow-illusion':['status.blind','status.fear'],
    'bridge.space-fold':['status.bind'],
    'bridge.holy-radiance':['status.buff','status.resistance_shift']
  });
  const SOURCE_PROOF_PREFIX = 'bridge.paid-source.';
  const shellEffect = id => ['release','targeting','check'].includes(EFFECT_REGISTRY[id]?.family);
  const shellEffectIds = Object.keys(EFFECT_REGISTRY).filter(shellEffect);
  const PAID_SOURCE_BRIDGES = Object.freeze([
    ...Object.values(foundation.MARTIAL_SOUL_CORE.CHANNEL_REGISTRY).filter(channel=>channel.id!=='channel.status-guard').map(channel=>({
      id:SOURCE_PROOF_PREFIX+channel.id.slice('channel.'.length),name:channel.name+'转译',paidSourceChannelId:channel.id,
      beastTags:[],soulTags:[],guardTargets:[],efficiency:.9,
      effectIds:cleanList([...channel.effectIds.filter(id=>!shellEffect(id)),...shellEffectIds])
    })),
    ...foundation.STATUS_GUARD_TARGETS.map(target=>({
      id:SOURCE_PROOF_PREFIX+'status-guard.'+target,name:'状态防护转译',paidSourceChannelId:'channel.status-guard',
      beastTags:[],soulTags:[],guardTargets:[target],efficiency:.9,effectIds:['status.status_guard',...shellEffectIds]
    }))
  ]);
  const SEMANTIC_BRIDGES = Object.freeze([
    {id:'bridge.hit-interference',name:'命中干涉转译',beastTags:['命中干涉','命运','因果','预知','必中','绝对闪避'],soulTags:['命中干涉','命运','因果','预知','必中','绝对闪避'],effectIds:['target.self','target.single','release.touch','release.melee','release.projectile','check.physical_attack','check.soul_attack','check.save','payload.damage',...HIT_RULE_IDS],efficiency:.86},
    {id:'bridge.device-lock',name:'锁结构转译',beastTags:['锁定解构','封印','金属','灵魂'],soulTags:['锁定解构','金属','灵魂'],effectIds:['release.touch','target.self','target.single','payload.unlock','payload.suppress_lock','payload.analyze_lock','payload.arcane_lock'],efficiency:.9},
    {id:'bridge.rule-destruction',name:'条件毁灭转译',requiredAttribute:'attribute.destruction',beastTags:['毁灭','条件规则破坏'],soulTags:['毁灭','条件规则破坏'],effectIds:['release.touch','target.self','target.single','payload.rule_break'],efficiency:.9},
    {id:'bridge.key-creation',name:'实体钥匙结构转译',beastTags:['实体钥匙造物'],soulTags:['实体钥匙造物'],effectIds:['release.touch','target.self','target.single','payload.create_key'],efficiency:.9},
    {id:'bridge.material-shaping',name:'物质结构转译',beastTags:['物质修复','永久造物','区域塑形','实体召唤','金属','木质','土','冰','创造'],soulTags:['物质修复','永久造物','区域塑形','实体召唤','金属','木质','土','冰','创造'],effectIds:['release.touch','target.self','target.single','target.burst','payload.repair_item','payload.fabricate','zone.wall','summon.entity'],efficiency:.9},
    {id:'bridge.body-identity',name:'身体形态转译',requiredAttribute:'attribute.life',beastTags:['生命','变身','血脉'],soulTags:['生命','变身','形态变化'],effectIds:['release.touch','target.self','target.single','check.save','transform.sex','sustain.maintain'],efficiency:.9},
    {id:'bridge.yin-expression',name:'阴性力量转译',requiredAttribute:'attribute.yin',beastTags:['阴','阴性'],soulTags:['阴','阴性'],effectIds:['release.touch','release.melee','release.projectile','target.self','target.single','target.line','target.burst','target.aura','check.physical_attack','check.soul_attack','check.save','payload.damage','payload.shield','status.buff','status.slow','status.resistance_shift','zone.hazard','sustain.maintain'],efficiency:.94},
    {id:'bridge.yang-expression',name:'阳性力量转译',requiredAttribute:'attribute.yang',beastTags:['阳','阳性'],soulTags:['阳','阳性'],effectIds:['release.touch','release.melee','release.projectile','target.self','target.single','target.line','target.cone','target.burst','check.physical_attack','check.soul_attack','check.save','payload.damage','status.buff','status.armor_break','status.resistance_shift','move.knockback','sustain.maintain'],efficiency:.94},
    {id:'bridge.lust-resonance',name:'欲念力量转译',requiredAttribute:'attribute.lust',beastTags:['淫','欲念'],soulTags:['淫','欲念'],effectIds:['release.touch','release.melee','release.projectile','target.self','target.single','target.burst','target.chain','target.aura','check.physical_attack','check.soul_attack','check.save','payload.damage','status.desire','status.charm','intimate.stimulate','intimate.climax','status.resistance_shift','sustain.maintain'],efficiency:.9},
    {id: 'bridge.plant-entangle', name: '植物缠绕转译', beastTags: ['藤蔓', '缠绕', '长体', '植物', '生长'], soulTags: ['植物', '藤蔓', '控制', '延伸', '生长', '缠绕拘束'], effectIds: ['release.touch', 'release.melee', 'release.projectile', 'target.single', 'target.line', 'target.burst', 'target.aura', 'check.save', 'payload.damage', 'payload.heal', 'payload.restore', 'payload.cleanse', 'status.bind','status.limb_bind','status.mute', 'status.paralysis', 'status.poison', 'status.regeneration', 'move.pull', 'zone.hazard', 'zone.wall', 'sustain.maintain'], efficiency: 1},
    {id: 'bridge.venom-transmission', name: '毒性传导转译', beastTags: ['毒液', '毒素', '神经毒', '腐蚀'], soulTags: ['植物', '毒素', '生命', '能量', '延伸', '毒', '毒蚀传递', '神经麻痹'], effectIds: ['release.touch', 'release.projectile', 'target.single', 'target.cluster', 'target.burst', 'check.physical_attack', 'check.soul_attack', 'check.save', 'payload.damage', 'payload.cleanse', 'status.poison', 'status.paralysis', 'status.blind', 'zone.obscure', 'status.eternal_wound', 'status.resistance_shift', 'zone.hazard', 'sustain.maintain'], efficiency: 0.95},
    {id: 'bridge.hammer-kinetic', name: '重兵震荡转译', beastTags: ['冲击', '力量', '甲壳', '冲锋', '利爪', '震荡', '重力', '追踪', '定位', '不动', '反弹'], soulTags: ['锤', '器武魂', '力量', '震荡', '破坏', '金属'], effectIds: ['release.melee', 'release.projectile', 'target.single', 'target.line', 'target.cone', 'target.burst', 'check.physical_attack', 'check.save', 'payload.damage', 'payload.shield', 'status.armor_break', 'status.stun', 'status.slow', 'status.buff', 'status.mark', 'move.knockback', 'move.pull', 'move.pursuit', 'zone.wall', 'reaction.reflect'], efficiency: 1},
    {id: 'bridge.blade-piercing', name: '刃锋穿刺转译', beastTags: ['穿刺', '利爪', '尖牙', '剑刃', '弱点', '猎杀'], soulTags: ['剑', '刀', '枪', '矛', '针', '器武魂', '利爪', '尖牙', '穿透', '武器'], effectIds: ['release.touch', 'release.melee', 'release.projectile', 'target.single', 'target.line', 'check.physical_attack', 'check.save', 'payload.damage', 'status.armor_break'], efficiency: 0.98},
    {id: 'bridge.artillery-penetration', name: '炮击贯穿转译', beastTags: ['冲击', '穿透', '甲壳', '雷电', '火焰', '光明', '金属'], soulTags: ['魂导炮', '炮', '金属', '射线', '远程', '能量', '器武魂'], effectIds: ['release.projectile', 'target.single', 'target.line', 'target.burst', 'check.physical_attack', 'check.soul_attack', 'check.save', 'payload.damage', 'status.armor_break', 'move.knockback'], efficiency: 0.94},
    {id: 'bridge.flame-conduction', name: '火焰能量转译', beastTags: ['火焰', '高温', '喷吐', '龙', '飞行'], soulTags: ['火焰', '能量', '龙', '远程', '扩散'], effectIds: ['release.touch', 'release.projectile', 'target.single', 'target.cluster', 'target.line', 'target.cone', 'target.burst', 'target.aura', 'check.soul_attack', 'check.save', 'payload.damage', 'status.burn', 'status.resistance_shift', 'status.haste', 'move.flight', 'zone.hazard', 'zone.wall', 'sustain.maintain'], efficiency: 1},
    {id: 'bridge.vitality-shaping', name: '生命结构转译', beastTags: ['生命', '能量', '再生', '甲壳', '韧性', '神圣'], soulTags: ['生命', '治疗', '防御', '护盾', '增幅', '植物', '神圣', '生命治疗', '魂力循环'], effectIds: ['release.touch', 'release.projectile', 'target.self', 'target.single', 'target.burst', 'target.chain', 'target.aura', 'payload.shield', 'payload.heal', 'payload.soul_restore', 'payload.restore', 'payload.cleanse', 'payload.dispel', 'payload.revive', 'status.buff', 'status.regeneration', 'status.invulnerable', 'copy.skillset', 'modifier.next_skill', 'status.resistance_shift', 'sustain.maintain'], efficiency: 0.88},
    {id: 'bridge.motion-expression', name: '运动特征转译', beastTags: ['速度', '突袭', '冲锋', '飞行', '闪现', '风'], soulTags: ['敏捷', '速度', '位移', '远程', '武器', '风', '机动位移', '空间跃迁', '飞行升空'], effectIds: ['release.melee', 'release.projectile', 'target.self', 'target.single', 'target.line', 'target.chain', 'check.physical_attack', 'status.buff', 'status.haste', 'status.invisibility', 'status.mark', 'move.knockback', 'move.teleport', 'move.approach', 'move.pursuit', 'move.flight', 'summon.entity'], efficiency: 0.84},
    {id:'bridge.mind-resonance',name:'精神转译',requiredAttribute:'attribute.mind',beastTags:['精神','心灵','梦境','幻象','记忆','情绪'],soulTags:['精神','心灵','梦境','幻象','记忆','情绪'],effectIds:['release.touch','release.projectile','target.self','target.single','target.burst','target.chain','target.aura','check.soul_attack','check.save','payload.damage','payload.dispel','status.buff','status.silence','status.mute','status.power_seal','status.mark','reaction.counter','sustain.maintain','status.fear','status.charm','status.desire','status.mind_control','status.cognition_shift','status.sleep','status.blind','status.invisibility','zone.obscure','copy.skillset'],efficiency:.9},
    {id:'bridge.soul-resonance',name:'灵魂转译',requiredAttribute:'attribute.soul',beastTags:['灵魂'],soulTags:['灵魂'],effectIds:['release.touch','release.projectile','target.self','target.single','target.burst','target.chain','target.aura','check.soul_attack','check.save','payload.damage','payload.dispel','status.buff','status.silence','status.mute','status.power_seal','status.mark','reaction.counter','sustain.maintain','payload.soul_damage','payload.soul_restore','payload.drain','status.soul_control','summon.entity','transform.form'],efficiency:.9},
    {id: 'bridge.frost-structure', name: '寒冰结构转译', beastTags: ['冰霜', '寒冰', '甲壳', '迟缓'], soulTags: ['冰霜', '水', '防御', '控制', '冻结塑形'], effectIds: ['release.touch', 'release.melee', 'release.projectile', 'target.single', 'target.cone', 'target.burst', 'check.physical_attack', 'check.soul_attack', 'check.save', 'payload.damage', 'payload.shield', 'status.slow', 'status.resistance_shift', 'zone.obscure', 'zone.hazard', 'zone.wall', 'domain.field', 'sustain.maintain'], efficiency: 0.94},
    {id: 'bridge.lightning-conduction', name: '雷电传导转译', beastTags: ['雷电', '麻痹', '速度', '飞行'], soulTags: ['雷电', '能量', '速度', '远程', '神经麻痹'], effectIds: ['release.touch', 'release.projectile', 'target.single', 'target.line', 'target.chain', 'check.soul_attack', 'check.save', 'payload.damage', 'status.paralysis', 'status.stun', 'status.haste', 'move.teleport', 'move.flight'], efficiency: 0.96},
    {id: 'bridge.form-expression', name: '形态血脉转译', beastTags: ['变身', '血脉', '真身', '力量', '韧性'], soulTags: ['形态变化', '武魂', '血脉', '变身'], effectIds: ['target.self', 'transform.form', 'transform.martial_avatar', 'sustain.maintain'], efficiency: 0.92},
    {id: 'bridge.shadow-illusion', name: '阴影幻象转译', beastTags: ['阴影', '隐匿', '幻象', '突袭'], soulTags: ['黑暗', '阴影', '敏捷', '幻象'], effectIds: ['release.melee', 'release.projectile', 'target.self', 'target.single', 'target.burst', 'check.physical_attack', 'check.soul_attack', 'payload.damage', 'status.blind', 'status.fear', 'status.invisibility', 'move.teleport', 'zone.obscure', 'summon.entity', 'transform.form'], efficiency: 0.92},
    {id:'bridge.disguise',name:'仪容伪装转译',beastTags:['仪容伪装'],soulTags:['仪容伪装'],effectIds:['release.touch','target.self','target.single','check.save','transform.disguise','sustain.maintain'],efficiency:.92},
    {id:'bridge.realm-storage',name:'空间收容转译',requiredAttribute:'attribute.space',beastTags:['空间','虚无','封印'],soulTags:['空间','封印'],effectIds:['release.touch','release.projectile','target.single','check.save','realm.store'],efficiency:.9},
    {id: 'bridge.space-fold', name: '空间折叠转译', beastTags: ['空间', '闪现', '传送', '虚无'], soulTags: ['空间', '位移', '控制', '能量'], effectIds: ['release.projectile', 'target.self', 'target.single', 'target.chain', 'check.soul_attack', 'check.save', 'payload.damage', 'payload.dispel', 'status.invulnerable', 'status.mark', 'move.teleport', 'move.approach', 'move.pursuit', 'zone.wall', 'reaction.counter', 'sustain.maintain'], efficiency: 0.86},
    {id: 'bridge.holy-radiance', name: '光明神圣转译', beastTags: ['光明', '神圣', '生命', '能量', '守护'], soulTags: ['光明', '神圣', '生命', '守护', '天使', '魂力循环'], effectIds: ['release.touch', 'release.projectile', 'target.self', 'target.single', 'target.chain', 'target.aura', 'check.soul_attack', 'payload.damage', 'payload.shield', 'payload.heal', 'payload.soul_restore', 'payload.restore', 'payload.cleanse', 'payload.dispel', 'payload.revive', 'status.buff', 'status.blind', 'status.invulnerable', 'status.regeneration', 'status.resistance_shift', 'reaction.counter', 'reaction.reflect', 'sustain.maintain'], efficiency: 0.98},
    {id: 'bridge.residual-imprint', name: '本能残响转译', beastTags: [], soulTags: [], effectIds: ['release.melee','release.touch','release.projectile','target.single','check.physical_attack','check.soul_attack','payload.damage','payload.residual'], efficiency: 0, fallbackOnly: true}
  ].map(bridge => ({...bridge,guardTargets:STATUS_GUARD_BRIDGES[bridge.id] ?? [],effectIds:STATUS_GUARD_BRIDGES[bridge.id] ? [...new Set([...bridge.effectIds,'target.self','status.status_guard'])] : bridge.effectIds})).concat(PAID_SOURCE_BRIDGES));

  const SPECIES_TEMPLATES = Object.freeze({
    'biwen-vine-snake': {
      aliases: ['碧纹藤蛇', '藤蛇'], tags: ['藤蔓', '缠绕', '长体', '毒液', '神经毒', '植物'],
      baseAction: {name: '藤尾抽击', nodes: [
        ['release.melee', {}], ['target.single', {}], ['check.physical_attack', {}],
        ['payload.damage', {类型: '物理', 骰数: 1, 骰面: 6, 加值: 1}]
      ]},
      signature: {name: '碧纹绞缚', minimumTier: '百年', nodes: [
        ['release.projectile', {距离区: 2}], ['target.single', {}], ['check.save', {属性: '力量'}],
        ['status.bind', {持续回合: 2, 挣脱属性: '力量'}], ['status.paralysis', {层数: 1, 阈值: 3, 持续回合: 2}]
      ]}
    },
    'night-shadow-cat': {
      aliases: ['夜影猫', '影猫'], tags: ['速度', '突袭', '利爪', '感知', '精神'],
      baseAction: {name: '影爪', nodes: [
        ['release.melee', {}], ['target.single', {}], ['check.physical_attack', {}],
        ['payload.damage', {类型: '物理', 骰数: 1, 骰面: 8, 加值: 1}]
      ]},
      signature: {name: '夜影扑杀', minimumTier: '百年', nodes: [
        ['release.melee', {}], ['target.single', {}], ['check.physical_attack', {}],
        ['payload.damage', {类型: '物理', 骰数: 2, 骰面: 6, 加值: 0}], ['status.buff', {属性: '身法', 数值: 2, 持续回合: 1}]
      ]}
    },
    'crimson-flame-lizard': {
      aliases: ['赤焰蜥', '火蜥'], tags: ['火焰', '高温', '喷吐', '甲壳', '龙'],
      baseAction: {name: '炎牙', nodes: [
        ['release.melee', {}], ['target.single', {}], ['check.physical_attack', {}],
        ['payload.damage', {类型: '物理', 骰数: 1, 骰面: 8, 加值: 1}]
      ]},
      signature: {name: '赤焰吐息', minimumTier: '百年', nodes: [
        ['release.projectile', {距离区: 2}], ['target.cone', {距离区: 2, 最大目标: 3}], ['check.save', {属性: '身法'}],
        ['payload.damage', {类型: '火焰', 骰数: 2, 骰面: 6, 加值: 0}], ['status.burn', {持续回合: 2, 骰数: 1, 骰面: 4}]
      ]}
    },
    'frost-shell-turtle': {
      aliases: ['霜甲龟', '寒甲龟'], tags: ['冰霜', '寒冰', '甲壳', '迟缓', '防御'],
      baseAction: {name: '霜甲撞击', nodes: [
        ['release.melee', {}], ['target.single', {}], ['check.physical_attack', {}],
        ['payload.damage', {类型: '钝击', 骰数: 1, 骰面: 8, 加值: 1}]
      ]},
      signature: {name: '寒潮甲域', minimumTier: '千年', nodes: [
        ['target.self', {}], ['payload.shield', {骰数: 2, 骰面: 6, 加值: 2}],
        ['status.resistance_shift', {类型: '冰霜', 模式: '免疫', 持续回合: 2}]
      ]}
    },
    'storm-wing-hawk': {
      aliases: ['雷翼鹰', '风雷隼'], tags: ['雷电', '麻痹', '速度', '飞行', '风'],
      baseAction: {name: '雷爪', nodes: [
        ['release.melee', {}], ['target.single', {}], ['check.physical_attack', {}],
        ['payload.damage', {类型: '穿刺', 骰数: 1, 骰面: 8, 加值: 1}]
      ]},
      signature: {name: '雷翼贯流', minimumTier: '千年', nodes: [
        ['release.projectile', {距离区: 3}], ['target.line', {最大目标: 4}], ['check.save', {属性: '身法'}],
        ['payload.damage', {类型: '雷电', 骰数: 2, 骰面: 6, 加值: 0}], ['status.paralysis', {层数: 1, 阈值: 2, 持续回合: 2}]
      ]}
    },
    'shadow-step-fox': {
      aliases: ['踏影狐', '幽影狐'], tags: ['阴影', '隐匿', '幻象', '突袭', '闪现'],
      baseAction: {name: '影牙', nodes: [
        ['release.melee', {}], ['target.single', {}], ['check.physical_attack', {}],
        ['payload.damage', {类型: '斩击', 骰数: 1, 骰面: 8, 加值: 1}]
      ]},
      signature: {name: '踏影分身', minimumTier: '千年', nodes: [
        ['target.self', {}], ['status.invisibility', {持续回合: 2, 攻击后解除: true}],
        ['summon.entity', {模板: '分身', 数量: 1, 生命百分比: 25, 持续回合: 2}]
      ]}
    },
    'light-antler-deer': {
      aliases: ['圣辉角鹿', '光角鹿'], tags: ['光明', '神圣', '生命', '守护', '再生'],
      baseAction: {name: '辉角冲撞', nodes: [
        ['release.melee', {}], ['target.single', {}], ['check.physical_attack', {}],
        ['payload.damage', {类型: '钝击', 骰数: 1, 骰面: 6, 加值: 0}]
      ]},
      signature: {name: '圣辉复苏', minimumTier: '千年', nodes: [
        ['release.touch', {}], ['target.single', {}], ['payload.heal', {骰数: 2, 骰面: 6, 加值: 2}],
        ['payload.cleanse', {类别: '负面', 最大数量: 1}], ['status.regeneration', {持续回合: 2, 骰数: 1, 骰面: 4}]
      ]}
    }
  });

  function normalizeParams(template, raw, activation = 'active') {
    const source = raw && typeof raw === 'object' ? raw : {};
    const result = {};
    for (const [key, bounds] of Object.entries(template.parameterBounds)) {
      if (activation === 'passive' && key === '持续回合') continue;
      const declared = source[key] ?? template.parameterDefaults?.[key];
      const value = key === '类型' ? foundation.canonicalDamageType(declared) : declared;
      if (Array.isArray(bounds) && bounds.length === 2 && bounds.every(Number.isFinite)) {
        result[key] = round(clamp(value ?? template.parameterDefaults?.[key] ?? bounds[0], bounds[0], bounds[1]));
      } else if (Array.isArray(bounds)) {
        result[key] = bounds.includes(value) ? value : bounds[0];
      }
    }
    for(const [key,bounds] of Object.entries(OPTIONAL_EFFECT_PARAMETERS[EFFECT_IDS_BY_TEMPLATE.get(template)]??{}))if(Object.hasOwn(source,key)){
      const value=source[key],numeric=bounds.length===2&&bounds.every(Number.isFinite);
      if(numeric?!Number.isInteger(value)||value<bounds[0]||value>bounds[1]:!bounds.includes(value))throw Error(`效果参数越界：${key}`);
      result[key]=value;
    }
    const effectId=EFFECT_IDS_BY_TEMPLATE.get(template);
    for(const key of ['继承技能ID','事件规则','伪装模板','成长序列'])if(Object.hasOwn(source,key)){const checked=checkedStructuredParameter(effectId,key,source[key]);if(checked!==undefined)result[key]=checked;}
    if (['payload', 'status', 'movement'].includes(template.family) && DOMAIN_FACTIONS.includes(source.领域阵营)) {
      result.领域阵营 = source.领域阵营;
    }
    if(template.displayName==='能力封印'&&source.封印对象==='精细')result.限制=controlCore.limitSpec(source.限制);
    return result;
  }

  const CHANNEL_RULE_PARAMETER_KEYS = Object.freeze({modes: '模式'});
  const WORLD_CONTROL_VARIANTS=Object.freeze({
    'status.regeneration':{},'status.buff':{},'status.slow':{},'status.paralysis':{},'status.sleep':{},'status.blind':{},'status.fear':{},'status.charm':{},'status.silence':{},'status.poison':{},
    'status.mute':{},
    'status.limb_bind':{部位:'双手',挣脱属性:'力量'},
    'status.power_seal':{封印对象:'魂力',范围:'全部'},
    'status.mind_control':{强度:1,命令域:'移动',控制距离:'同场'},
    'status.soul_control':{强度:1,命令域:'全部',控制距离:'同场'},
    'status.cognition_shift':{强度:1,认知方向:'信任施术者',认知保留:'随来源',改造方式:'渐进',改造分钟:3}
  });
  function soulEffectVariants(martialSoul, effectId, rawParams = {}, bridges = []) {
    const template = EFFECT_REGISTRY[effectId];
    if (!template) return [];
    // Event recipes need an actual authored event contract, not guessed labels.
    if(template.requiresExplicitParameters?.some(key=>!Object.hasOwn(rawParams??{},key)))return [];
    const source = rawParams && typeof rawParams === 'object' ? {...rawParams} : {};
    const boon=talents.BOON_SOURCES[martialSoul?.扩展?.boonExpressionSource];
    if(boon&&effectId==='payload.damage'){
      if(source.类型!==undefined&&!boon.attributes.includes(source.类型))return [];
      source.类型??=boon.attributes[0];
    }
    if(boon&&effectId==='status.buff'){
      if(!boon.channels.includes('channel.buff')&&!boon.channels.includes('channel.sensory'))source.数值=-Math.abs(source.数值??1);
      if(martialSoul.扩展.boonExpressionSource==='dream-iceworm')source.属性='感知';
      if(martialSoul.扩展.boonExpressionSource==='soft-rabbit')source.属性='身法';
    }
    const channelIds = foundation.MARTIAL_SOUL_CORE.channelsForEffect(martialSoul, effectId, {});
    if (!channelIds.length) return [];
    if (effectId==='payload.restore' && !Object.hasOwn(source,'生命模式') && !Object.hasOwn(source,'魂力模式')) {
      // An automatic restoration must restore something. Select only resources
      // supported by this soul, then let the existing value optimizer size it.
      if(channelIds.includes('channel.heal'))Object.assign(source,{生命模式:'定量',生命数值:1});
      if(channelIds.includes('channel.resource'))Object.assign(source,{魂力模式:'定量',魂力数值:1});
    }
    if(effectId==='modifier.next_skill'&&!['效果倍率','魂力消耗倍率','制造速度倍率','成品效果倍率'].some(key=>Object.hasOwn(source,key)))source.效果倍率=101;
    if(effectId==='transform.disguise'&&!Object.hasOwn(source,'伪装模板'))source.伪装模板={公开名:'陌生旅者',公开性别:'不变',外貌:'轮廓和仪容经过掩饰的旅者。'};
    if(effectId==='transform.form'&&!Object.hasOwn(source,'属性加值'))source.属性加值=2;
    // These new typed mechanisms have no inherent yin element. Automatic
    // generation selects only an element actually bought by both endpoints;
    // an explicit authored type is never substituted.
    let candidates = [{...source}];
    if(['status.limited_followup','payload.resource_damage'].includes(effectId)&&source.类型===undefined){
      const expression=martialSoul?.扩展?.结构化武魂??martialSoul?.结构化武魂??martialSoul;
      const types=cleanList((expression?.attributes??[]).map(a=>a.name??foundation.MARTIAL_SOUL_CORE.ATTRIBUTE_REGISTRY[a.id]?.name)).filter(type=>DAMAGE_TYPES.includes(type));
      candidates=types.map(type=>({...source,类型:type}));
    }
    for (const [ruleKey, parameterKey] of Object.entries(CHANNEL_RULE_PARAMETER_KEYS)) {
      const bounds = template.parameterBounds?.[parameterKey];
      if (Object.prototype.hasOwnProperty.call(source, parameterKey)) {
        if (Array.isArray(bounds) && !bounds.includes(source[parameterKey])) return [];
        continue;
      }
      const values = [...new Set(channelIds.flatMap(channelId => {
        const channel = foundation.MARTIAL_SOUL_CORE.CHANNEL_REGISTRY[channelId];
        return Array.isArray(channel?.effectRules?.[ruleKey]) ? channel.effectRules[ruleKey] : [];
      }))].filter(value => !Array.isArray(bounds) || bounds.includes(value));
      if (values.length) candidates = candidates.flatMap(candidate => values.map(value => ({...candidate, [parameterKey]: value})));
    }
    if (effectId === 'status.status_guard') {
      const targets = cleanList(bridges.flatMap(bridge => bridge.guardTargets ?? []));
      if (source.防护对象 !== undefined && !targets.includes(source.防护对象)) return [];
      candidates = candidates.flatMap(candidate => (source.防护对象 ? [source.防护对象] : targets).map(target => ({...candidate,防护对象:target})));
    }
    if(['zone.wall','summon.entity'].includes(effectId)&&source.持续方式===undefined)candidates=candidates.flatMap(candidate=>[candidate,{...candidate,持续方式:'世界分钟',持续分钟:10}]);
    if(template.hitRule&&template.parameterBounds?.等级&&source.等级===undefined)candidates=candidates.flatMap(candidate=>[1,2,3].map(等级=>({...candidate,等级})));
    if(WORLD_CONTROL_VARIANTS[effectId]&&controlCore.canPersist(effectId,source)&&source.持续方式===undefined){
      candidates=candidates.flatMap(candidate=>[candidate,{持续方式:'世界分钟',持续分钟:10,来源依赖:'施术者清醒',持续回合:1,...WORLD_CONTROL_VARIANTS[effectId],...candidate}]);
    }
    return candidates.filter(candidate => {
      const params=normalizeParams(template,candidate);
      return foundation.MARTIAL_SOUL_CORE.allowsEffect(martialSoul,effectId,params) && sourceAllowsEffect(bridges,effectId,params);
    });
  }
  function concretizeSoulEffectParams(martialSoul,effectId,rawParams={},bridges=[]) {
    return soulEffectVariants(martialSoul,effectId,rawParams,bridges)[0] ?? null;
  }

  // Attack-local modifiers are never standalone payloads. Every carrier buys
  // the same genuine attack shell and damage in addition to its rule node.
  function hitInterferenceAttackSpecs(effectId,params={},options={}) {
    if(!EFFECT_REGISTRY[effectId]?.hitRule?.inline)return null;
    const allows=options.allowsEffect??(()=>true),variant=Math.max(0,round(options.variant??0));
    const shells=[['release.melee','check.physical_attack'],['release.projectile','check.soul_attack'],['release.touch','check.soul_attack'],['release.projectile','check.physical_attack']];
    const legal=shells.map(([release,check])=>[[release,release==='release.projectile'?{距离区:2}:{}],['target.single',{阵营规则:'敌方'}],[check,{}],[effectId,clone(params)],['payload.damage',{类型:options.damageType??'物理',骰数:1,骰面:4,加值:0}]]).filter(specs=>specs.every(([id,p])=>allows(id,p)));
    return legal.length?clone(legal[variant%legal.length]):null;
  }

  function calculateNodeCost(effectId, params = {}, options = {}) {
    // Node/provenance prices are always raw. Burdens are settled once, for the
    // complete ability, by abilityValueLedger (never by adding node rebates).
    options={...options,rawValue:true};
    const template = EFFECT_REGISTRY[effectId];
    if (!template) throw new Error(`未登记效果ID：${effectId}`);
    if(template.requiresExplicitParameters)validateNewParameters(effectId,params,effectId==='status.battle_resource'?'passive':options.activation??'active');
    if(template.hitRule&&params?.等级!==undefined&&![1,2,3].includes(params.等级))throw new Error('命中干涉等级只支持1至3级');
    if (Object.hasOwn(params, '穿透档') && ![0, 1].includes(params.穿透档)) throw new Error('伤害抗性穿透只支持 0／1');
    if(effectId==='status.battle_resource'){
      validateNewParameters(effectId,params,'passive');
      const p=normalizeParams(template,params,'passive');
      // Bounded battle-local storage and event routing; no output is granted by
      // holding the pool. Damage pays its full separately declared maximum.
      return template.baseCost+p.容量*3+p.事件规则.reduce((sum,r)=>sum+18+(r.数量==='实际'?30:r.数量*3),0);
    }
    if(effectId==='passive.equipment_stat'){
      if(options.activation!=='passive'||Object.keys(params).some(k=>!['属性','数值'].includes(k)))throw new Error('装备数值只能作为常驻被动');
      return foundation.EQUIPMENT_AFFIXES.price(params.属性,params.数值);
    }
    if(effectId==='passive.element_amplify'){
      if(options.activation!=='passive'||!DAMAGE_TYPES.includes(params.类型)||Object.keys(params).some(k=>!['类型','数值'].includes(k)))throw new Error('属性伤害增幅只能作为合法属性的装备常驻被动');
      return foundation.EQUIPMENT_AFFIXES.elementPrice(params.数值);
    }
    if (options.activation === 'passive') {
      if (!['status.resistance_shift', 'status.status_guard'].includes(effectId) || params.模式 === '易伤' || Object.hasOwn(params, '持续回合')) throw new Error('常驻防护不接受持续回合、易伤或其他载荷');
      return calculateNodeCost(effectId, {...params, 持续回合: 1},{rawValue:options.rawValue}) * 5;
    }
    const p = normalizeParams(template, params);
    validateNewParameters(effectId,p,options.activation??'active');
    let cost = template.baseCost;
    if(effectId==='status.amplify'){
      const peak=Math.max(p.数值,...(p.成长序列??[])),flat=['力量','身法','体魄','悟性','感知','意志','移动区','魂技DC','攻击检定','物理防御','魂技防御'].includes(p.指标);
      cost+=flat?peak*4:Math.ceil(peak*.2);
      if(p.成长序列)cost+=9;
      if(p.叠加方式==='同源相加')cost+=20;
      return cost;
    }
    if(effectId==='payload.damage'&&p.引爆状态)cost+=30;
    if(effectId==='status.burn')cost+=Number(p.加值??0)*Number(p.持续回合??1)*3;
    if(effectId==='transform.martial_avatar')cost+=Number(p.同源范围增幅??0)*35;
    if(effectId==='summon.entity')cost+=Number(p.范围减伤百分比??0)*4;
    if(effectId==='target.allies')cost+=(p.距离区-1)*12;
    if(effectId==='status.invulnerable')cost+=(p.高阶抵挡次数??0)*18+(p.低阶转盾百分比??0)+(p.持续方式==='来源维持'?120:0)+(p.持续方式==='来源下回合'?300:0)+(p.发动魂力===0?200:0);
    if(effectId==='contract.oath')cost+=Math.ceil(Math.sqrt(p.持续分钟))*2;
    if(effectId==='modifier.world_duration')cost+=Math.ceil(Math.sqrt(p.持续分钟))*8;
    if(effectId==='status.limited_followup')cost+=p.层数*calculateNodeCost('payload.damage',{类型:p.类型,骰数:p.骰数,骰面:p.骰面,加值:p.加值})+Math.max(0,p.持续回合-1)*22+Math.max(0,p.每回合上限-1)*36;
    if(effectId==='payload.stack_confluence')cost+=p.最大数量*35;
    if(effectId==='status.next_check_penalty')cost+=Math.abs(p.数值)*24*p.次数+Math.max(0,p.持续回合-1)*22+(p.命中后抵抗?0:40);
    if(effectId==='realm.store')cost+=p.容量*80+Math.ceil(Math.sqrt(p.持续分钟))*2+p.投影比例*6+(p.真身调遣?160:0);
    if(effectId==='payload.resource_damage')cost+=(p.骰数+p.每层骰数*p.最大计入层数)*p.骰面*3+(p.加值+p.每层加值*p.最大计入层数)*6;
    if(effectId==='payload.zone_dispel')cost+=p.最大数量*42+p.半径区*55;
    if (effectId === 'release.projectile') cost += Math.max(0, (p.距离区 ?? 1) - 1) * 18;
    if (template.family === 'targeting') {
      cost += ({自动: 0, 敌方: 4, 友方: 4, 任意: 28, 无差别: options.rawValue?0:-12}[p.阵营规则] ?? 0);
      cost += ({主目标: 0, 自动最近: 10, 自动最低生命: 26, 全部合法: 34}[p.选择模式] ?? 0);
    }
    if (p.领域阵营) cost += ({敌方: 8, 友方: 8, 所有: 0}[p.领域阵营] ?? 0);
    if (effectId === 'payload.damage' || effectId === 'payload.shield' || effectId === 'payload.heal') {
      cost += (p.骰数 ?? 1) * (p.骰面 ?? 4) * 3 + (p.加值 ?? 0) * 6;
    }
    if (effectId === 'payload.damage') cost += (p.穿透档 ?? 0) * 70;
    if (effectId === 'payload.drain') {
      cost += (p.骰数 ?? 1) * (p.骰面 ?? 4) * 4 + (p.加值 ?? 0) * 7 + (p.转化百分比 ?? 25) * 1.2 + (p.穿透档 ?? 0) * 70;
    }
    if (effectId === 'payload.soul_damage' || effectId === 'payload.soul_restore') cost += (p.数值 ?? 1) * 7;
    if (effectId === 'payload.restore') {
      cost += p.生命模式 === '定量' ? (p.生命数值 ?? 0) * 2 : p.生命模式 === '缺失比例' ? (p.生命数值 ?? 0) : 0;
      cost += p.魂力模式 === '定量' ? (p.魂力数值 ?? 0) * 3 : p.魂力模式 === '缺失比例' ? (p.魂力数值 ?? 0) * 1.5 : 0;
      cost += (p.生命模式 === '恢复至上限' ? 180 : 0);
      cost += (p.魂力模式 === '恢复至上限' ? 220 : 0);
      cost += !options.rawValue&&(p.世界日冷却 ?? 0) > 0 ? -Math.min(80, (p.世界日冷却 ?? 0) * 10) : 0;
    }
    if(['payload.unlock','payload.suppress_lock','payload.rule_break','payload.analyze_lock','payload.create_key','payload.arcane_lock'].includes(effectId))cost+=(p.最高品级-1)*60+Math.max(0,(p.强度??1)-1)*30;
    if(effectId==='payload.arcane_lock')cost+=(p.锁难度-10)*12+Math.max(0,p.持续分钟-1)*22;
    if(effectId==='payload.suppress_lock')cost+=Math.max(0,p.持续分钟-1)*22;
    if(effectId==='payload.create_key')cost+=Math.ceil(p.价值上限/10);
    if(effectId==='payload.repair_item')cost+=p.修复量*6+Math.ceil(Math.sqrt(p.价值上限)/2);
    if(effectId==='payload.fabricate')cost+=Math.ceil(p.价值上限/10)+(p.最大数量-1)*80;
    if(['zone.wall','summon.entity'].includes(effectId)&&p.持续方式==='世界分钟')cost+=80+Math.max(0,p.持续分钟-1)*22;
    if (effectId === 'payload.cleanse') cost += (p.最大数量 ?? 1) * 28 + ({毒素: 0, 精神:8, 灵魂:8, 控制: 8, 负面: 22, 任意: 62}[p.类别] ?? 0);
    if (effectId === 'payload.dispel') cost += (p.最大数量 ?? 1) * 42;
    if (effectId === 'payload.revive') cost += (p.生命百分比 ?? 1) * 8;
    if (effectId === 'check.save' && p.成功效果 === '伤害减半') cost += 22;
    if (effectId === 'check.save') cost += (p.难度加值 ?? 0) * 40;
    if(template.hitRule){const h=template.hitRule,grade=[0,180,480][(p.等级??1)-1]??0,graze=h.kind==='miss_graze'?Math.max(0,p.擦伤比例-10)*3:0;cost+=grade+graze;if(!h.inline)cost+=(p.次数-1)*(Math.ceil(template.baseCost*.55)+grade+graze)+(p.持续回合-1)*24;}
    if (effectId === 'check.physical_attack' || effectId === 'check.soul_attack') cost += (p.命中加值 ?? 0) * 36;
    if (effectId === 'check.physical_attack') cost += (p.护甲穿透 ?? 0) * 52;
    if (['status.bind', 'status.paralysis', 'status.burn', 'status.poison', 'status.buff', 'status.armor_break', 'status.stun', 'status.fear',
      'status.charm', 'status.blind', 'status.desire', 'status.silence', 'status.mute','status.limb_bind','status.power_seal','status.mind_control','status.soul_control','status.cognition_shift', 'status.sleep', 'status.slow', 'status.haste', 'status.invisibility',
      'status.invulnerable', 'status.regeneration', 'status.resistance_shift', 'status.status_guard', 'copy.skillset', 'modifier.next_skill'].includes(effectId)) {
      if(!p.持续方式||p.持续方式==='回合')cost += Math.max(0, (p.持续回合 ?? 1) - 1) * 22;
    }
    if (effectId === 'status.buff') cost += Math.abs(p.数值 ?? 1) * 18;
    if(effectId==='status.limb_bind'&&p.部位==='全身')cost+=45;
    if(effectId==='status.desire')cost+=24*((p.强度??1)-1);
    if(effectId==='status.power_seal'&&p.封印对象==='装备与道具')cost+=180;
    if(effectId==='target.burst'&&p.本人优先)cost+=20;
    if(effectId==='payload.damage'&&p.事件槽!==undefined)cost+=8;
    if(effectId==='summon.entity'&&p.继承环序上限!==undefined)cost+=p.技能继承数量*12;
    if(effectId==='summon.entity'&&p.继承技能ID!==undefined)cost+=p.继承技能ID.length*12;
    if(effectId==='summon.entity'&&p.离散缩放==='向下取整最少1')cost+=20;
    if(effectId==='status.power_seal')cost+=(p.范围==='全部'?60:0)+(p.封印对象==='魂力'?50:0);
    if(effectId==='status.power_seal'&&p.封印对象==='精细'){
      const spec=controlCore.limitSpec(p.限制);
      cost+=(100-(spec.soulPowerPercent??100))*2+(100-(spec.damagePercent??100))*3+(spec.permission?240:0);
    }
    if (['status.burn', 'status.poison', 'status.damage_over_time', 'status.regeneration'].includes(effectId)) cost += ((p.骰数 ?? 1) * (p.骰面 ?? 4) * 4+(p.加值??0)*6)*(effectId==='status.regeneration'&&p.持续方式==='世界分钟'?Math.max(1,p.持续分钟):1);
    if(effectId==='status.regeneration'&&p.持续方式==='来源维持')cost+=88;
    if (['status.armor_break', 'status.slow', 'status.haste'].includes(effectId)) cost += (p.数值 ?? 1) * 24;
    if (effectId === 'status.invulnerable') {
      cost += Math.min(3,p.次数 ?? 1) * 55;
      if (!options.rawValue&&(p.最大攻击魂技序号 ?? 0) > 0) cost -= Math.max(0, 9 - p.最大攻击魂技序号) * 18;
      if (!options.rawValue&&(p.最大攻击者等级 ?? 0) > 0) cost -= Math.max(0, 100 - p.最大攻击者等级) * 2;
    }
    if (effectId === 'status.mark') cost += Math.max(0,(p.持续回合 ?? 1)-1)*8 + (p.追踪距离区 ?? 1) * 8 + (p.不可隐藏 ? 30 : 0);
    if (effectId === 'status.eternal_wound') cost += Math.min(5,Math.max(0,(p.持续回合 ?? 1)-1))*22 + (p.每回合魂力 ?? 1) * 5 + (p.治疗削减百分比 ?? 0) + (p.骰数 ?? 1) * (p.骰面 ?? 4) * 3 + (p.战斗后保留 ? 60 : 0);
    if (effectId === 'copy.skillset') cost += (p.复制比例 ?? 10) * 2 + (p.最大技能数 ?? 1) * 55 + (p.持续回合 ?? 1) * 18;
    if (effectId === 'modifier.next_skill') cost += Math.max(0, (p.效果倍率 ?? 100) - 100) * 2 + Math.max(0, (p.成品效果倍率 ?? 100) - 100) * 2 + (p.次数 ?? 1) * 30;
    if (effectId === 'status.invisibility' && p.攻击后解除 === false) cost += 38;
    if (effectId === 'status.status_guard' && p.模式 === '免疫') cost += 120;
    if (effectId === 'status.resistance_shift') cost += ({抗性: 0, 易伤: 30, 免疫: 120, 吸收: 165}[p.模式] ?? 0);
    if (effectId === 'status.paralysis') cost += (p.层数 ?? 1) * 16 + Math.max(0, 4 - (p.阈值 ?? 3)) * 24;
    if (['target.cluster', 'target.line', 'target.cone', 'target.burst', 'target.chain'].includes(effectId)) cost += Math.max(0, (p.最大目标 ?? 2) - 2) * 28;
    if (effectId === 'target.cone') cost += Math.max(0, (p.距离区 ?? 1) - 1) * 35;
    if (effectId === 'target.chain') cost += (p.跳跃区 ?? 0) * 30;
    if (effectId === 'target.aura') cost += (p.距离区 ?? 0) * 60;
    if (effectId === 'target.burst') cost += (p.半径区 ?? 0) * 55;
    if (['move.knockback', 'move.pull', 'move.teleport', 'move.approach', 'move.pursuit'].includes(effectId)) cost += Math.max(0, (p.距离区 ?? 1) - 1) * (effectId === 'move.teleport' ? 55 : 36);
    if (effectId === 'move.flight') cost += Math.max(0, (p.持续回合 ?? 1) - 1) * 26 + (p.高度 === '高空' ? 45 : 0);
    if (effectId === 'zone.hazard') cost += (p.骰数 ?? 0) * (p.骰面 ?? 4) * 4 + Math.max(0, (p.持续回合 ?? 1) - 1) * 32 + Math.abs(Math.min(0, p.移动修正 ?? 0)) * 28;
    if (effectId === 'zone.wall') cost += Math.floor((p.耐久 ?? 10) / 5) * 4 + Math.max(0, (p.持续回合 ?? 1) - 1) * 34 + (p.阻挡 === '全部' ? 48 : 0);
    if (effectId === 'zone.obscure') cost += (p.强度 ?? 1) * 22 + Math.max(0, (p.持续回合 ?? 1) - 1) * 24;
    if (effectId === 'summon.entity') {
      const count = p.数量 ?? 1;
      cost += count * 95 + (p.生命百分比 ?? 10) * 2 + Math.max(0, (p.持续回合 ?? 1) - 1) * 35;
      if (p.继承能力) {
        cost += count * (
          (p.属性继承百分比 ?? 0) * 0.4 +
          (p.魂力继承百分比 ?? 0) * 0.25 +
          (p.技能继承数量 ?? 0) * 4 +
          Math.max(0, (p.技能效果倍率 ?? 20) - 20) * 0.36
        );
      }
    }
    if (effectId === 'transform.form') cost += (p.属性加值 ?? 0) * 32 + Math.max(0, (p.持续回合 ?? 1) - 1) * 28;
    if (effectId === 'transform.martial_avatar') {
      cost+=(p.同源伤害增幅百分比??0)*6+(p.同源射程增幅??0)*90+Math.max(0,(p.召唤技能效果倍率??50)-50)*4+(p.精神防护加值??0)*28+(p.同源启动减耗百分比??0)*.5+(p.同源维持减耗百分比??0)*.5;
      cost += (p.属性增幅档 ?? 1) * 46 + (p.身心防御加值 ?? 1) * 38 + (p.基础动作增幅 ?? 1) * 34 + (p.同源魂技增幅 ?? 1) * 42;
      cost += Math.max(0, (p.持续回合 ?? 2) - 2) * 44 + (options.rawValue?0:Math.max(0, (p.锁定魂力 ?? 8) - 8) * 2 + Math.max(0, (p.每回合魂力 ?? 2) - 2) * 8);
    }
    if (effectId === 'move.teleport' && p.目的 === '指定站位') cost += 34;
    if (effectId === 'reaction.counter') cost += (p.次数 ?? 1) * 85 + (p.强度 ?? 1) * 24;
    if (effectId === 'reaction.reflect') cost += (p.次数 ?? 1) * 12 + (p.反射百分比 ?? 0) + (p.吸收转护盾百分比 ?? 0) + (p.吸收转魂力百分比 ?? 0);
    if (!options.rawValue&&effectId === 'sustain.maintain') cost -= (p.锁定魂力 ?? 1) + (p.每回合魂力 ?? 0) * 2;
    if (effectId === 'domain.field') {
      cost += (p.半径区 ?? 0) * 76 + Math.max(0, (p.持续回合 ?? 1) - 1) * 42 + (p.领域强度 ?? 1) * 28;
      cost += p.跟随施术者 ? 82 : 0;
      cost += ({进入: 0, 回合开始: 18, 进入与回合开始: 72}[p.触发时机] ?? 0);
      cost += ({自动: 0, 敌方: 10, 友方: 10, 任意: 36, 无差别: options.rawValue?0:-18}[p.阵营规则] ?? 0);
    }
    if(controlCore.canPersist(effectId,p)){
      if(p.持续方式==='世界分钟')cost+=Math.max(0,(p.持续分钟??1)-1)*22+80;
      if(p.持续方式==='来源有效')cost+=420;
      if(['status.mind_control','status.soul_control','status.cognition_shift'].includes(effectId))cost+=(p.强度??1)*35;
      if(p.命令域==='全部')cost+=160;
      if(p.控制距离==='远程')cost+=240;
      if(p.认知保留==='保留')cost+=260;
      if(p.改造方式==='立即')cost+=180;
      if(effectId==='status.cognition_shift'&&p.认知方向==='自由改造')cost+=260;
      if(effectId==='status.cognition_shift'&&p.关系作用域==='认知与现实')cost+=320;
      if(effectId==='transform.disguise')cost+=(p.强度??1)*20+(p.伪装方式==='高级拟态'?100:0)+(p.掩饰声音?40:0)+(p.掩饰魂息?80:0)+(p.武魂伪装?100:0)+(p.识破难度加值??0)*30;
      if(effectId==='transform.sex')cost+=(p.强度??1)*35+(p.变化保留==='保留'?260:0);
    }
    return round(effectId==='status.limb_bind'?(p.层数??1)*(cost+40*(p.挣脱难度加值??0)):cost);
  }

  function nodeCostBreakdown(effectId, params = {}) {
    const template = EFFECT_REGISTRY[effectId];
    if (!template) throw new Error(`未登记效果ID：${effectId}`);
    if(template.requiresExplicitParameters)validateNewParameters(effectId,params,effectId==='status.battle_resource'?'passive':'active');
    const normalized = normalizeParams(template, params);
    const total = calculateNodeCost(effectId, normalized, effectId.startsWith('passive.')?{activation:'passive'}:{});
    return {effectId, base: template.baseCost, parameters: total - template.baseCost, total, normalized};
  }

  function soulPowerCostForValue(rawActiveValue,active=true){
    if(!Number.isSafeInteger(rawActiveValue)||rawActiveValue<0)throw Error('原始主动价值必须为非负整数');
    return active?Math.max(1,Math.ceil(rawActiveValue/32)):0;
  }
  const phase=phases.create({graphBranches,calculateNodeCost,controls:controlCore,attributes:foundation.ATTRIBUTE_KEYS,abilities,registry:EFFECT_REGISTRY});
  function rawAbilityValue(graph){
    const branches=graphBranches(graph),nodes=branches.flatMap(branch=>branch.nodes.map(node=>({nodeId:node.id,branchId:branch.id,activation:branch.activation,rawValue:calculateNodeCost(node.effectId,node.params,{activation:branch.activation,rawValue:true})})));
    nodes.push(...phase.graphValueSurcharge(graph));
    const rawActiveValue=nodes.filter(n=>n.activation!=='passive').reduce((sum,n)=>sum+n.rawValue,0);
    let rawPassiveValue=nodes.filter(n=>n.activation==='passive').reduce((sum,n)=>sum+n.rawValue,0);
    const equipment=(graph.nodes??[]).filter(n=>['passive.equipment_stat','passive.element_amplify'].includes(n.effectId));
    if(equipment.length)rawPassiveValue+=foundation.EQUIPMENT_AFFIXES.mergedEquipmentNodes({nodes:equipment}).reduce((sum,n)=>sum+calculateNodeCost(n.effectId,n.params,{activation:'passive',rawValue:true}),0)-equipment.reduce((sum,n)=>sum+calculateNodeCost(n.effectId,n.params,{activation:'passive',rawValue:true}),0);
    const declared=graph.nodes.filter(n=>n.params?.定额发动===true).map(n=>n.params.发动魂力);
    const targetFee=graph.nodes.find(n=>n.effectId==='target.allies'&&n.params?.每目标魂力)?.params.每目标魂力;
    if(targetFee!==undefined)declared.push(targetFee);
    if(new Set(declared).size>1)throw Error('同一技能不能声明互相矛盾的发动魂力');
    return {version:'2.0.0',nodes,rawActiveValue,rawPassiveValue,baseSoulPowerCost:declared.length?declared[0]:soulPowerCostForValue(rawActiveValue,branches.some(b=>b.activation!=='passive'))};
  }
  function declaredAbilityCosts(options={}){
    return Object.fromEntries(['exchangeContracts','requirements','resourceCosts','maintenanceCosts','castModes','defaultCastMode','cooldownTurns','usageKey','targetConditions','effectConditions'].filter(key=>options[key]!==undefined).map(key=>[key,clone(options[key])]));
  }
  const VALUE_POLICY=Object.freeze({version:'2.0.0',maximumReduction:.5,requirementRate:.05,requirementCap:.15,immediateCap:.2,lockCap:.1,maintenanceCap:.2,lifespanCap:.3});
  // Fixed valuation sources: market fluctuation and an authored price never
  // increase a fee rebate. Unregistered templates / individual instances get 0.
  const FEE_ITEM_VALUES=Object.freeze({'bandage':45,'basic-soul-tonic':80,'antidote-pill':120,'material-hide':160,'material-scale':190,'material-venom':340,'material-core':520,'material-meat':70});
  function abilityValueLedger(skill,options={}){
    const graph=skill.effectGraph??{nodes:[]};
    return priceAbilityWithBasis(skill,options,graph,rawAbilityValue(graph));
  }
  // Only internal callers can provide a basis computed from this exact graph.
  function priceAbilityWithBasis(skill,options,graph,basis){
    const branches=graphBranches(graph);
    const checked=abilities.validate({...skill,id:skill.id??'value-quote'});if(!checked.pass)throw Error(checked.errors.join('；'));
    const active=basis.rawActiveValue,passive=basis.rawPassiveValue,raw=active+passive,medicine=skill.medicine?abilities.medicineContract(skill.medicine):null;
    const baselineCredit=Math.max(0,Number(options.baselineCredit??0));
    if(!Number.isSafeInteger(baselineCredit)||baselineCredit>raw)throw Error('基础动作抵扣无效');
    const fieldUseEligible=abilities.hasFieldUse(skill),usage=abilities.skillUsageRules(skill),perBattle=fieldUseEligible?0:Math.min(...[usage.perBattleLimit,usage.perBattleGroup?usage.perBattleGroupLimit:0].filter(n=>n>0));
    const limitRate=(n,values)=>n>0?(values[n]??0):0;
    const availabilityRate=Math.max(Math.min(.1,Number(skill.cooldownTurns??0)*.02),limitRate(perBattle,{1:.15,2:.1,3:.05}),limitRate(usage.dailyLimit,{1:.2,2:.15,3:.1,4:.05,5:.05}),usage.worldCooldownDays>=7?.35:usage.worldCooldownDays>=3?.3:usage.worldCooldownDays>0?.25:0);
    const feeValue=costs=>costs.reduce((sum,cost)=>sum+(cost.kind==='soulPower'?cost.amount*8:cost.kind==='health'?cost.amount*2:cost.kind==='item'?(FEE_ITEM_VALUES[cost.templateId]??0)*cost.quantity*.25:0),0);
    const lifespanRate=costs=>Math.min(.3,costs.filter(c=>c.kind==='lifespan').reduce((sum,c)=>sum+c.amount,0)/(2400*1440));
    const maintenance=abilities.describe({...skill,id:skill.id??'value-quote'},{soulPowerCost:0}).maintenance;
    const activeNodes=branches.filter(b=>b.activation!=='passive').flatMap(b=>b.nodes);
    const persistence=new Map(activeNodes.map(n=>{
      const p=n.params??{},domain=branches.find(b=>b.nodes.includes(n))?.nodes.find(x=>x.effectId==='domain.field');
      const eligible=n.effectId==='status.cognition_shift'?p.改造方式==='渐进'&&p.认知保留!=='保留':n.family==='status'||['zone','domain','summon','transform','reaction'].includes(n.family)||n.effectId==='payload.shield'||n.effectId==='move.flight';
      const duration=domain?.params?.持续方式==='来源维持'?4:p.持续方式==='来源有效'?4:p.持续方式==='世界分钟'?Number(p.持续分钟??1):Number(domain?.params?.持续回合??p.持续回合??1);
      return [n.id,eligible?Math.min(3,Math.max(0,duration-1)):0];
    }));
    const sustainedRaw=basis.nodes.filter(n=>n.activation!=='passive'&&persistence.get(n.nodeId)>0).reduce((sum,n)=>sum+n.rawValue,0);
    const branchFees=new Map(branches.map(branch=>[branch.id,{
      lock:branch.nodes.reduce((sum,n)=>sum+(n.effectId==='sustain.maintain'?Number(n.params.锁定魂力??1):0),0),
      upkeep:branch.nodes.reduce((sum,n)=>sum+(n.effectId==='sustain.maintain'?Number(n.params.每回合魂力??0):0),0),
      sustainedRaw:basis.nodes.filter(n=>n.branchId===branch.id&&persistence.get(n.nodeId)>0).reduce((sum,n)=>sum+n.rawValue,0)
    }]));
    const exchange=globalThis.SoulAbilityExchange??(typeof require==='function'?require('./ability-exchange-core.js'):null);
    const exchangeRows=basis.nodes.map(row=>{const n=graph.nodes.find(n=>n.id===row.nodeId);const branch=branches.find(b=>b.id===row.branchId);return {...row,attribute:branch?.nodes.some(n=>n.effectId==='target.self')&&n.effectId==='status.buff'?n.params.属性:'',amount:n.effectId==='status.buff'?n.params.数值:0};});
    const exchangeQuotes=exchange.quoteContracts(skill.exchangeContracts??[],'skill',exchangeRows);
    const modes=(skill.castModes?.length?skill.castModes:[{id:''}]).map(mode=>{
      const contract=abilities.describe({...skill,id:skill.id??'value-quote'},{soulPowerCost:0,...(mode.id?{modeId:mode.id}:{})});
      const modeExchangeQuotes=exchange.quoteContracts(exchangeQuotes.filter(q=>!q.contract.castModeIds.length||q.contract.castModeIds.includes(mode.id)).map(q=>q.contract),'skill',exchangeRows);
      if(exchangeQuotes.some(q=>q.contract.castModeIds.some(id=>!(skill.castModes??[]).some(m=>m.id===id))))throw Error('交换引用的费用模式不存在');
      const paidBurdens=modeExchangeQuotes.flatMap(q=>q.contract.burdens);
      const nettingCredit=exchangeRows.reduce((sum,row)=>{if(!row.attribute||row.amount<=0)return sum;const q=modeExchangeQuotes.find(q=>q.contract.benefits.branchIds.includes(row.branchId)),b=q?.contract.burdens.find(b=>b.effectId==='status.buff'&&b.params.属性===row.attribute);if(!b)return sum;const node=graph.nodes.find(n=>n.id===row.nodeId),net=Math.max(0,row.amount+b.params.数值);return sum+row.rawValue-(net?calculateNodeCost(node.effectId,{...node.params,数值:net}):0);},0);
      const requirementsRate=Math.min(.15,contract.requirements.filter(r=>['voice','gesture','movement'].includes(r)&&!(r==='voice'&&paidBurdens.some(b=>b.effectId==='status.mute'))&&!(r==='gesture'&&paidBurdens.some(b=>b.effectId==='status.limb_bind'&&['双手','全身'].includes(b.params.部位)))&&!(r==='movement'&&paidBurdens.some(b=>b.effectId==='status.limb_bind'&&['双腿','全身'].includes(b.params.部位)))).length*.05);
      const fixedFee=graph.nodes.some(n=>n.params?.定额发动===true||n.effectId==='target.allies'&&n.params?.每目标魂力)?basis.baseSoulPowerCost*8:0;
      const immediateRate=active?Math.min(.2,(feeValue(contract.costs)+fixedFee)/active):0;
      const lifeRate=lifespanRate(contract.costs),globalRate=requirementsRate+availabilityRate+immediateRate+lifeRate;
      const nodes=basis.nodes.map(row=>{
        const exchanges=modeExchangeQuotes.filter(q=>q.contract.benefits.branchIds.includes(row.branchId));
        const exchangeValue=exchanges.reduce((sum,q)=>sum+row.rawValue*(row.activation==='passive'?q.passiveRate:q.activeRate)+(q.rawValue&&(row.activation!=='passive'||q.contract.mode==='condition')?q.lockReduction*row.rawValue/q.rawValue*(row.activation==='passive'?.5:1):0),0);
        const exchangeBurdens=exchanges.map(q=>({kind:'exchange',contractId:q.contract.id,value:row.rawValue*(row.activation==='passive'?q.passiveRate:q.activeRate)+(q.rawValue&&(row.activation!=='passive'||q.contract.mode==='condition')?q.lockReduction*row.rawValue/q.rawValue*(row.activation==='passive'?.5:1):0)}));
        if(row.activation==='passive')return {...row,reduction:Math.min(row.rawValue*.25,exchangeValue),burdens:exchangeBurdens};
        const node=activeNodes.find(n=>n.id===row.nodeId),p=node.params??{},payments=persistence.get(row.nodeId)??0;
        const local=[];
        if(p.阵营规则==='无差别'&&['targeting','domain'].includes(node.family))local.push({kind:'indiscriminate',value:node.family==='domain'?18:12});
        if(node.effectId==='status.invulnerable'){
          if(p.最大攻击魂技序号>0)local.push({kind:'attack-rank-cap',value:Math.max(0,9-p.最大攻击魂技序号)*18});
          if(p.最大攻击者等级>0)local.push({kind:'attacker-level-cap',value:Math.max(0,100-p.最大攻击者等级)*2});
        }
        const branch=branchFees.get(row.branchId);
        const avatar=node.effectId==='transform.martial_avatar';
        const lockRate=payments&&branch?.sustainedRaw?Math.min(.1,branch.lock*2/branch.sustainedRaw+(avatar?Number(p.锁定魂力??8)*2/row.rawValue:0)):0;
        const maintenanceRate=payments&&sustainedRaw?Math.min(.2,(feeValue(maintenance)/sustainedRaw+(branch?.sustainedRaw?branch.upkeep*8/branch.sustainedRaw:0)+(avatar?Number(p.每回合魂力??2)*8/row.rawValue:0))*payments+lifespanRate(maintenance)*payments):0;
        const value=exchangeValue+local.reduce((sum,r)=>sum+r.value,0)+row.rawValue*(globalRate+lockRate+maintenanceRate);
        return {...row,reduction:Math.min(row.rawValue*.5,value),burdens:[...exchangeBurdens,...local,...Object.entries({requirements:requirementsRate,availability:availabilityRate,immediate:immediateRate,lifespan:lifeRate,lock:lockRate,maintenance:maintenanceRate}).filter(([,rate])=>rate>0).map(([kind,rate])=>({kind,value:row.rawValue*rate}))]};
      });
      const activeReduction=Math.min(Math.floor(nodes.filter(n=>n.activation!=='passive').reduce((sum,n)=>sum+n.reduction,0)+1e-8),Math.floor(Math.max(0,active-baselineCredit)*.5));
      const passiveReduction=Math.min(Math.floor(nodes.filter(n=>n.activation==='passive').reduce((sum,n)=>sum+n.reduction,0)+1e-8),Math.floor(passive*.25));
      const reduction=activeReduction+passiveReduction;
      const perDoseValue=raw-baselineCredit-nettingCredit-reduction;
      return {modeId:mode.id,requirements:contract.requirements,costs:contract.costs,nodes,reduction,...(exchangeQuotes.length?{activeReduction,passiveReduction,nettingCredit,exchangeQuotes:modeExchangeQuotes}:{}),netValue:medicine?perDoseValue*medicine.doses+abilities.medicineSourceValue(medicine):perDoseValue,...(medicine?{perDoseValue,doses:medicine.doses,sourceValue:abilities.medicineSourceValue(medicine)}:{})};
    });
    const selected=[...modes].sort((a,b)=>b.netValue-a.netValue||mechanicalOrder(a.modeId,b.modeId))[0];
    return {version:VALUE_POLICY.version,rawActiveValue:active,rawPassiveValue:passive,baselineCredit,maintenance,usage,fieldUseEligible,modes,pricedModeId:selected.modeId,reduction:selected.reduction,netValue:selected.netValue,baseSoulPowerCost:basis.baseSoulPowerCost};
  }
  function validateAbilityValue(skill,options={}){
    try{return skill.abilityValue&&abilities.hash(skill.abilityValue)===abilities.hash(abilityValueLedger(skill,options))?[]:['能力价值账本缺失或与完整合同不一致'];}catch(error){return [error.message];}
  }
  function sealPricedAbility(skill){skill.abilityValue=abilityValueLedger(skill);return abilities.seal(skill);}
  function hasValueBurdens(contract,nodeSpecs){
    return !!contract.medicine||['exchangeContracts','requirements','resourceCosts','maintenanceCosts','castModes'].some(key=>contract[key]?.length)||contract.cooldownTurns||Object.keys(contract.usageRules??{}).length||nodeSpecs.some(([id,p])=>['payload.restore','payload.soul_restore','sustain.maintain','transform.martial_avatar','status.invulnerable','trigger.contract','modifier.world_duration'].includes(id)||p?.阵营规则==='无差别');
  }
  function validateValueBasis(skill,required=false){
    try{
      required=required||skill?.sourceKind==='soul-ring'||!!skill?.sourceRingId||!!skill?.来源魂环ID||(skill?.ownerKind==='魂师'&&Number(skill?.ringOrdinal)>0);
      const origin=skill?.扩展?.copyOrigin?.source;
      if(['copied','summoned-copy'].includes(skill?.sourceKind)){
        if(!origin)return ['复制能力缺少原始能力'];
        const errors=validateValueBasis(origin);if(errors.length)return errors;
        required=required||!!origin.valueBasis;
      }
      if(!skill?.valueBasis)return required?['魂技缺少原始价值账本']:[];
      const value=rawAbilityValue(skill.effectGraph);
      const discreteCopy=origin&&skill.扩展.copyOrigin.spec?.discreteScale==='向下取整最少1'&&abilities.verify(skill).pass;
      // A weaker inherited control still pays the actual original ability fee.
      const expectedFee=discreteCopy?origin.soulPowerCost:value.baseSoulPowerCost;
      if(abilities.hash(value)!==abilities.hash(skill.valueBasis)||skill.soulPowerCost!==expectedFee||Number(skill.soulPowerCostRate??0)!==0)return ['魂技原始价值或基础耗魂与效果不一致'];
      const baselineCredit=skill.compatibility?.baseActionFallback?(skill.effectGraph?.nodes??[]).filter(n=>n.effectId!=='payload.damage').reduce((sum,n)=>sum+calculateNodeCost(n.effectId,n.params),0):0;
      const pricing=validateAbilityValue(skill,{baselineCredit});if(pricing.length)return pricing;
      return [];
    }catch(error){return [error.message];}
  }

  function makeNode(effectId, params, index, provenance = null, costForNode = calculateNodeCost, idPrefix = 'node', activation = 'active') {
    const template = EFFECT_REGISTRY[effectId];
    if (!template) throw new Error(`未登记效果ID：${effectId}`);
    validateNewParameters(effectId,params??{},activation);
    if(template.hitRule&&params?.等级!==undefined&&![1,2,3].includes(params.等级))throw new Error('命中干涉等级只支持1至3级');
    if (params?.穿透档 !== undefined && ![0, 1].includes(params.穿透档)) throw new Error('伤害抗性穿透只支持 0／1');
    if (['status.resistance_shift','status.status_guard'].includes(effectId)) for (const key of ['模式','防护对象']) if (params?.[key]!==undefined && !template.parameterBounds[key]?.includes(params[key])) throw new Error(`防护参数不合法：${key}`);
    if (activation === 'passive' && Object.hasOwn(params ?? {}, '持续回合')) throw new Error('常驻防护不接受持续回合');
    return {
      id: `${idPrefix}-${index + 1}-${effectId.replace(/[^a-z0-9]+/gi, '-')}`,
      effectId,
      effectVersion: template.version,
      family: template.family,
      params: normalizeParams(template, params, activation),
      executor: template.executor,
      ...(template.placement?{placement:template.placement}:{}),
      cost: costForNode(effectId, normalizeParams(template, params, activation), {activation}),
      provenance: provenance ? clone(provenance) : null
    };
  }

  function makeLinearGraph(nodeSpecs, options = {}) {
    const costForNode = options.costForNode ?? calculateNodeCost;
    const nodes = nodeSpecs.map(([effectId, params], index) => makeNode(effectId, params, index, options.provenanceByNode?.[index] ?? options.provenanceByEffect?.[effectId] ?? options.provenance ?? null, costForNode));
    return {
      registryVersion: REGISTRY_VERSION,
      entryNodeId: nodes[0]?.id ?? '',
      nodes,
      edges: nodes.slice(1).map((node, index) => ({from: nodes[index].id, to: node.id, trigger: 'next'})),
      maxTriggerDepth: 12
    };
  }

  function graphBranches(graph) {
    const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
    const declared = Array.isArray(graph?.branches) ? graph.branches : [];
    if (!declared.length) return [{
      id: 'branch-main', activation: 'active', label: '主要效果', order: 1, optional: false, priority: 100,
      targetPolicy: 'auto', entryNodeId: graph?.entryNodeId ?? nodes[0]?.id ?? '', nodes
    }];
    const byId = new Map(nodes.map(node => [node.id,node]));
    return declared.map((branch,index) => ({
      id: String(branch.id || `branch-${index + 1}`),
      activation: branch.activation ?? 'active',
      label: String(branch.label || `效果分支${index + 1}`),
      order: Number(branch.order ?? index + 1),
      optional: Boolean(branch.optional),
      priority: Number(branch.priority ?? Math.max(1,100-index)),
      targetPolicy: String(branch.targetPolicy ?? 'auto'),
      entryNodeId: String(branch.entryNodeId ?? ''),
      nodes: cleanList(branch.nodeIds).map(id => byId.get(id)).filter(Boolean)
    })).sort((left,right) => left.order - right.order || right.priority - left.priority || mechanicalOrder(left.id,right.id));
  }

  function makeBranchedGraph(branchSpecs, options = {}) {
    const costForNode = options.costForNode ?? calculateNodeCost;
    const nodes = [];
    const edges = [];
    const branches = [];
    for (const [branchIndex,raw] of (Array.isArray(branchSpecs) ? branchSpecs : []).entries()) {
      const id = String(raw?.id || `branch-${branchIndex + 1}`).replace(/[^a-z0-9_-]+/gi,'-');
      const branchNodes = (raw?.nodes ?? []).map(([effectId,params],nodeIndex) => {
        const proof = options.provenanceByBranchNode?.[id]?.[nodeIndex] ?? options.provenanceByBranchEffect?.[id]?.[effectId] ?? options.provenanceByEffect?.[effectId] ?? options.provenance ?? null;
        const node = makeNode(effectId,params,nodeIndex,proof,costForNode,`node-${id}`,raw.activation ?? 'active');
        node.branchId = id;
        node.branchOrder = branchIndex + 1;
        return node;
      });
      nodes.push(...branchNodes);
      edges.push(...branchNodes.slice(1).map((node,index) => ({from:branchNodes[index].id,to:node.id,trigger:'next',branchId:id})));
      branches.push({
        id,
        activation:raw?.activation ?? 'active',
        label:String(raw?.label || `效果分支${branchIndex + 1}`),
        order:branchIndex + 1,
        optional:Boolean(raw?.optional),
        priority:Number(raw?.priority ?? Math.max(1,100-branchIndex)),
        targetPolicy:String(raw?.targetPolicy ?? 'auto'),
        entryNodeId:branchNodes[0]?.id ?? '',
        nodeIds:branchNodes.map(node => node.id)
      });
    }
    return {
      registryVersion:REGISTRY_VERSION,
      graphKind:'multi-branch',
      entryNodeId:branches[0]?.entryNodeId ?? '',
      branches,
      nodes,
      edges,
      maxTriggerDepth:12
    };
  }

  function validateGraph(graph, options = {}) {
    const errors = [];
    const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
    const edges = Array.isArray(graph?.edges) ? graph.edges : [];
    if (!nodes.length) errors.push('效果图没有节点');
    const branches = graphBranches(graph);
    if(options.costContract?.medicine&&nodes.some(n=>['realm.store','realm.capture'].includes(n.effectId)))errors.push('药剂释放载体不能承载直接空间收入；请使用直接施用的空间消耗品');
    const declaredBranches = Array.isArray(graph?.branches) && graph.branches.length > 0;
    if ((!declaredBranches && nodes.length > 12) || (declaredBranches && nodes.length > 40)) errors.push(`效果图节点超过${declaredBranches ? 40 : 12}`);
    if (declaredBranches && branches.length > 4) errors.push('效果图分支超过4');
    const activationByNode = new Map(branches.flatMap(branch => branch.nodes.map(node => [node.id, branch.activation])));
    const ids = new Set();
    const families = new Set();
    let spent = 0;
    const costForNode = options.costForNode ?? calculateNodeCost;
    for (const node of nodes) {
      if (!node?.id || ids.has(node.id)) errors.push(`重复或缺失节点ID：${node?.id ?? ''}`);
      ids.add(node?.id);
      const template = EFFECT_REGISTRY[node?.effectId];
      if (!template) {
        errors.push(`未登记效果ID：${node?.effectId ?? ''}`);
        continue;
      }
      const activation = activationByNode.get(node.id) ?? 'active';
      if(['status.limited_followup','payload.stack_confluence','status.next_check_penalty','status.battle_resource','payload.resource_damage','payload.resource_endstate','payload.zone_dispel'].includes(node.effectId))for(const key of Object.keys(template.parameterBounds))if(!Object.hasOwn(node.params??{},key))errors.push(`效果参数缺失：${node.effectId}/${key}`);
      if(node.placement!==template.placement)errors.push(`效果执行位置未登记：${node.effectId}`);
      if(node.effectId.startsWith('passive.')&&activation!=='passive')errors.push('装备数值不能作为主动技能');
      if (activation === 'passive' && (!['status.battle_resource','status.resistance_shift', 'status.status_guard','passive.equipment_stat','passive.element_amplify'].includes(node.effectId) || node.params?.模式 === '易伤')) errors.push(`常驻分支含不支持的载荷：${node.effectId}`);
      if (['status.resistance_shift', 'status.status_guard'].includes(node.effectId)) {
        for (const key of Object.keys(template.parameterBounds).filter(key => activation !== 'passive' || key !== '持续回合')) if (!Object.hasOwn(node.params ?? {}, key)) errors.push(`防护参数缺失：${node.effectId}/${key}`);
      }
      if (activation === 'passive' && Object.hasOwn(node.params ?? {}, '持续回合')) errors.push('常驻防护不接受持续回合');
      if(node.effectId==='status.power_seal'&&node.params?.封印对象==='魂力'&&node.params?.范围==='当前武魂')errors.push('共用魂力封印不能限定单个武魂');
      if(node.effectId==='status.power_seal'&&node.params?.封印对象==='精细'){
        if(node.params.范围!=='全部')errors.push('精细封印按真实许可引用范围，不接受当前武魂范围');
        try{controlCore.limitSpec(node.params.限制);}catch(error){errors.push(error.message);}
      }
      if(controlCore.PERSISTENT_STATUS_IDS.includes(node.effectId)){
        if(node.effectId==='status.cognition_shift'&&node.params?.改造方式==='渐进'&&node.params?.持续方式==='回合')errors.push('渐进认知改造必须使用世界分钟或来源有效期限');
        if(node.params?.持续方式&&!['回合','来源维持'].includes(node.params.持续方式)&&!controlCore.canPersist(node.effectId,node.params))errors.push('该效果或属性参数不能使用日常持续期限');
        if(node.params?.持续方式==='来源有效'&&(!node.params.来源依赖||node.params.来源依赖==='独立'))errors.push('来源有效期限必须声明真实依赖');
        if(node.params?.持续方式&&!['回合','来源维持'].includes(node.params.持续方式)&&(graph.nodes??[]).some(n=>n.effectId==='sustain.maintain'))errors.push('世界持续效果使用maintenanceCosts，不使用战斗锁定维持');
        if(node.params?.持续方式&&!['回合','来源维持'].includes(node.params.持续方式)&&(graph.nodes??[]).some(n=>n.family==='domain'))errors.push('领域内反复施加的限制使用领域期限，不独立登记世界期限');
      }
      try{validateNewParameters(node.effectId,node.params,activation);}catch(error){errors.push(error.message);}
      families.add(template.family);
      // Constructors may clamp a draft; validation must never price a clamped
      // value while allowing the original value to reach the executor.
      for (const [key, value] of Object.entries(node.params ?? {})) {
        const bounds = template.parameterBounds[key]??OPTIONAL_EFFECT_PARAMETERS[node.effectId]?.[key];
        if(node.effectId==='status.amplify'&&key==='成长序列')continue;
        if((node.effectId==='summon.entity'&&key==='继承技能ID')||(node.effectId==='status.battle_resource'&&key==='事件规则')||(node.effectId==='transform.disguise'&&key==='伪装模板'))continue;
        if(key==='限制'&&node.effectId==='status.power_seal'&&node.params?.封印对象==='精细')continue;
        if (key === '领域阵营' && ['payload','status','movement'].includes(template.family) && DOMAIN_FACTIONS.includes(value)) continue;
        if (!Array.isArray(bounds)) { errors.push(`效果参数未登记：${node.effectId}/${key}`); continue; }
        const numeric = bounds.length === 2 && bounds.every(Number.isFinite);
        if (numeric ? !Number.isInteger(value) || value < bounds[0] || value > bounds[1] : !bounds.includes(value)) {
          errors.push(`效果参数越界：${node.effectId}/${key}`);
        }
      }
      if (node.effectVersion !== template.version) errors.push(`效果版本不匹配：${node.effectId}`);
      if (TIER_RANK[options.ageTier ?? '十万年'] < TIER_RANK[template.minimumAgeTier]) errors.push(`年限档不足：${node.effectId}`);
      if (MECHANISM_RANK[options.mechanismCap ?? '规则'] < MECHANISM_RANK[template.mechanismLevel]) errors.push(`机制越级：${node.effectId}`);
      try { spent += costForNode(node.effectId, node.params, {activation}); } catch (error) { errors.push(error.message); }
      if (options.requireDualProvenance && ['payload', 'status', 'movement', 'zone', 'domain', 'summon', 'transform', 'reaction', 'sustain','contract','trigger','modifier'].includes(template.family)) {
        const proof = node.provenance;
        if (!proof?.martialSoulEvidence || !proof?.beastEvidence || !proof?.bridgeId) errors.push(`核心节点缺少双端来源凭证：${node.effectId}`);
        const proofBridge=SEMANTIC_BRIDGES.find(bridge=>bridge.id===proof?.bridgeId);
        if (!bridgeSupportsParams(proofBridge,node.effectId,node.params)) errors.push(`语义桥不允许效果或参数：${node.effectId}`);
        if (node.effectId === 'status.status_guard' && !proofBridge?.guardTargets?.includes(node.params?.防护对象)) errors.push('状态防护对象缺少具体来源凭证');
        if (Number(proof?.cost) !== costForNode(node.effectId, node.params, {activation})) errors.push(`来源凭证花费不匹配：${node.effectId}`);
      }
    }
    for(const branch of branches)if(branch.nodes.some(n=>EFFECT_REGISTRY[n.effectId]?.hitRule?.inline)){
      if(!branch.nodes.some(n=>['check.physical_attack','check.soul_attack'].includes(n.effectId)))errors.push('本次攻击的命中干涉必须与同分支的物理或魂力命中判定组合');
      if(!branch.nodes.some(n=>['payload.damage','payload.drain','payload.resource_damage'].includes(n.effectId)))errors.push('本次攻击的命中干涉必须与同分支的伤害载荷组合');
      if(branch.nodes.some(n=>n.effectId==='modifier.miss_graze')&&!branch.nodes.some(n=>n.effectId==='payload.damage'))errors.push('失手补偿必须与同分支的直接伤害载荷组合');
    }
    // A permanent item's split stat nodes pay the merged nonlinear price and
    // share one per-item cap. Node order does not provide additional capacity.
    const equipmentNodes=nodes.filter(n=>n.effectId==='passive.equipment_stat'||n.effectId==='passive.element_amplify');
    if(equipmentNodes.length){
      try {
        const merged=foundation.EQUIPMENT_AFFIXES.mergedEquipmentNodes({nodes:equipmentNodes});
        spent+=merged.reduce((sum,n)=>sum+calculateNodeCost(n.effectId,n.params,{activation:'passive'}),0)
          -equipmentNodes.reduce((sum,n)=>sum+calculateNodeCost(n.effectId,n.params,{activation:'passive'}),0);
      }catch(error){errors.push(error.message);}
    }
    if (declaredBranches) {
      const assigned = new Set();
      const branchIds = new Set();
      for (const branch of branches) {
        if (!branch.id || branchIds.has(branch.id)) errors.push(`重复或缺失分支ID：${branch.id}`);
        branchIds.add(branch.id);
        if (!['active', 'passive'].includes(branch.activation)) errors.push(`未知分支形态：${branch.activation}`);
        if (!branch.nodes.length) errors.push(`效果分支没有节点：${branch.id}`);
        if (branch.nodes.length > 12) errors.push(`效果分支节点超过12：${branch.id}`);
        const branchFamilies = new Set(branch.nodes.map(node => EFFECT_REGISTRY[node.effectId]?.family).filter(Boolean));
        const deliveryless = branch.nodes.some(node => ['target.self','target.aura'].includes(node.effectId)||node.effectId==='target.burst'&&node.params?.落点==='自身');
        const reactionOnly = branchFamilies.has('reaction') && !branchFamilies.has('payload') && !branchFamilies.has('status') && !branchFamilies.has('movement');
        if (branch.activation !== 'passive' && !branchFamilies.has('release') && !deliveryless && !reactionOnly) errors.push(`效果分支缺少释放节点：${branch.id}`);
        if (branch.activation !== 'passive' && !branchFamilies.has('targeting') && !reactionOnly) errors.push(`效果分支缺少目标节点：${branch.id}`);
        if (!['payload','status','movement','zone','domain','summon','transform','reaction','contract','trigger','modifier'].some(family => branchFamilies.has(family))) errors.push(`效果分支缺少可结算载荷：${branch.id}`);
        for (const node of branch.nodes) {
          if (assigned.has(node.id)) errors.push(`节点被多个分支引用：${node.id}`);
          assigned.add(node.id);
          if (node.branchId !== branch.id) errors.push(`节点分支标记不一致：${node.id}`);
        }
      }
      for (const node of nodes) if (!assigned.has(node.id)) errors.push(`节点未归属任何分支：${node.id}`);
    }
    const deliverylessTarget = nodes.some(node => ['target.self','target.aura'].includes(node.effectId)||node.effectId==='target.burst'&&node.params?.落点==='自身');
    const reactionOnly = families.has('reaction') && !families.has('payload') && !families.has('status') && !families.has('movement');
    if (!declaredBranches && !families.has('release') && !deliverylessTarget && !reactionOnly) errors.push('效果图缺少释放节点');
    if (!declaredBranches && !families.has('targeting') && !reactionOnly) errors.push('效果图缺少目标节点');
    if (!['payload', 'status', 'movement', 'zone', 'domain', 'summon', 'transform', 'reaction','contract','trigger','modifier'].some(family => families.has(family))) errors.push('效果图缺少可结算载荷');
    const passiveNodes = branches.filter(branch => branch.activation === 'passive').flatMap(branch => branch.nodes);
    for (const [index,node] of passiveNodes.entries()) {
      if(node.effectId==='passive.equipment_stat'||node.effectId==='passive.element_amplify')continue;
      if(node.effectId==='status.battle_resource'){if(passiveNodes.slice(0,index).some(other=>other.effectId===node.effectId&&other.params.资源槽===node.params.资源槽))errors.push('同一能力不能重复声明相同战斗资源槽');continue;}
      const target = node.params?.类型 ?? node.params?.防护对象 ?? node.params?.属性;
      if (passiveNodes.slice(0,index).some(other => other.effectId === node.effectId && (other.params?.类型 ?? other.params?.防护对象 ?? other.params?.属性) === target)) errors.push('同一常驻方案不得重复购买重叠防护');
    }
    errors.push(...phase.contractGraphErrors(graph));
    if(!errors.length)spent+=phase.graphValueSurcharge(graph).reduce((sum,row)=>sum+row.rawValue,0);
    const validationScopes = declaredBranches ? branches : [{id:'',nodes}];
    if(nodes.filter(n=>n.effectId==='move.approach').length>1)errors.push('同一能力只能登记一次施放前触及追击');
    if(nodes.filter(node=>node.effectId==='transform.martial_avatar').length>1)errors.push('同一能力只能登记一个武魂真身');
    if(nodes.filter(node=>node.effectId==='domain.field').length>1)errors.push('同一能力只能登记一个领域');
    for (const scope of validationScopes) {
      const scopeNodes = scope.nodes ?? [];
      if(scopeNodes.some(n=>n.effectId==='target.single'&&n.params.沿用首目标)&&(!declaredBranches||scope===branches[0]||branches[0]?.optional||!branches[0]?.nodes.some(n=>n.effectId==='target.single')))errors.push('沿用首目标需要前置的必需单体分支');
      if(scopeNodes.some(n=>EFFECT_REGISTRY[n.effectId]?.allowedContexts?.includes('field')&&!EFFECT_REGISTRY[n.effectId].allowedContexts.includes('battle'))&&scopeNodes.some(n=>['check.physical_attack','check.soul_attack'].includes(n.effectId)))errors.push('仅能在场外施用的效果不能搭配战斗攻击检定，请选择豁免检定');
      if(scopeNodes.some(n=>['payload.stack_confluence','payload.resource_damage'].includes(n.effectId))&&(scopeNodes.filter(n=>n.family==='targeting').length!==1||!scopeNodes.some(n=>n.effectId==='target.single'&&n.params.目标数===1)))errors.push('层数合流和累计资源攻击只能使用单体目标');
      if(scopeNodes.some(n=>n.effectId==='payload.resource_damage'||n.effectId==='status.next_check_penalty'&&n.params.命中后抵抗)&&!scopeNodes.some(n=>['check.physical_attack','check.soul_attack'].includes(n.effectId)))errors.push('累计资源攻击与命中后抵抗必须保留正常攻击检定');
      if(scopeNodes.some(n=>n.effectId==='payload.resource_endstate')&&!scopeNodes.some(n=>n.effectId==='payload.resource_damage'))errors.push('攻击后资源清算必须与同分支的累计资源攻击组合');
      const approach=scopeNodes.find(n=>n.effectId==='move.approach');
      if(approach&&(!scopeNodes.some(n=>n.effectId==='release.touch')||scopeNodes.filter(n=>n.family==='targeting').length!==1||!scopeNodes.some(n=>n.effectId==='target.single')||!scopeNodes.some(n=>n.family==='check')||scopeNodes.indexOf(approach)>=scopeNodes.findIndex(n=>n.family==='check')||scopeNodes.some(n=>['domain','zone','summon'].includes(n.family))))errors.push('施放前追击须为单目标触及行动，并位于正常检定之前');
      for(const node of scopeNodes){
        const definition=EFFECT_REGISTRY[node.effectId];
        for(const required of definition?.requires??[])if(!scopeNodes.some(other=>other.effectId===required))errors.push(`${definition.displayName}需要同一分支的${EFFECT_REGISTRY[required]?.displayName??required}`);
        for(const conflict of definition?.conflicts??[])if(scopeNodes.some(other=>other.effectId===conflict))errors.push(`${definition.displayName}不能与同一分支的${EFFECT_REGISTRY[conflict]?.displayName??conflict}组合`);
      }
      if(scopeNodes.some(n=>n.effectId==='domain.field')&&scopeNodes.some(n=>n.effectId==='transform.martial_avatar'))errors.push('武魂真身不能作为领域子效果');
      if(scopeNodes.some(n=>n.effectId==='transform.martial_avatar')&&(scopeNodes.filter(n=>n.family==='targeting').length!==1||!scopeNodes.some(n=>n.effectId==='target.self')))errors.push('武魂真身必须仅以施术者自身为目标');
      if(scopeNodes.some(n=>n.effectId==='status.amplify'||n.params?.持续方式==='来源维持')&&!scopeNodes.some(n=>n.effectId==='sustain.maintain'))errors.push('来源维持效果必须支付持续维持');
      if(scopeNodes.some(n=>n.effectId==='target.allies')&&!scopeNodes.some(n=>n.effectId==='sustain.maintain'&&n.params?.计费方式==='逐目标'||n.effectId==='target.allies'&&n.params?.每目标魂力))errors.push('自选友方须使用逐目标计费');
      if(scopeNodes.filter(n=>['realm.store','realm.capture'].includes(n.effectId)).length>1)errors.push('同一用途只能包含一次人物收容');
      if(scopeNodes.some(n=>['realm.store','realm.capture'].includes(n.effectId))&&scopeNodes.some(n=>['domain','zone','summon'].includes(n.family)))errors.push('人物收容不能作为区域或领域的重复子效果');
      const executable = scopeNodes.filter(node => ['payload','status','movement','zone','domain','summon','transform','reaction','contract','trigger','modifier'].includes(EFFECT_REGISTRY[node.effectId]?.family));
      const pureSelfBenefit = scopeNodes.some(node => node.effectId === 'target.self') &&
        executable.some(node => effectPolarity(node.effectId,node.params) === 'beneficial') &&
        executable.every(node => effectPolarity(node.effectId,node.params) !== 'harmful');
      const attackCheck = scopeNodes.find(node => ['check.physical_attack','check.soul_attack'].includes(node.effectId));
      if (pureSelfBenefit && attackCheck) errors.push(`${scope.id ? `效果分支${scope.id}` : '纯自身增益'}不应包含攻击检定：${attackCheck.effectId}`);
    }
    for(const scope of validationScopes.filter(scope=>scope.nodes.some(node=>node.effectId==='domain.field'))){
      const domainChildren = scope.nodes.filter(node => ['payload', 'status', 'movement'].includes(EFFECT_REGISTRY[node.effectId]?.family));
      if (!domainChildren.length) errors.push('领域必须至少包含一个载荷、状态或位移子效果');
      for (const child of domainChildren) if (!DOMAIN_FACTIONS.includes(child.params?.领域阵营)) errors.push(`领域子效果必须显式声明领域阵营：${child.effectId}`);
    }
    const adjacency = new Map([...ids].map(id => [id, []]));
    for (const edge of edges) {
      if (!ids.has(edge.from) || !ids.has(edge.to)) errors.push(`效果边引用不存在节点：${edge.from}->${edge.to}`);
      else adjacency.get(edge.from).push(edge.to);
    }
    const visiting = new Set();
    const visited = new Set();
    let maximumDepth = 0;
    function visit(id, depth) {
      if (visiting.has(id)) { errors.push('效果图存在循环'); return; }
      if (visited.has(id)) return;
      visiting.add(id);
      maximumDepth = Math.max(maximumDepth, depth);
      for (const next of adjacency.get(id) ?? []) visit(next, depth + 1);
      visiting.delete(id);
      visited.add(id);
    }
    const entryNodeIds = declaredBranches ? branches.map(branch => branch.entryNodeId) : [graph?.entryNodeId];
    for (const entryNodeId of entryNodeIds) {
      if (entryNodeId && ids.has(entryNodeId)) visit(entryNodeId,1);
      else errors.push('效果图入口节点不存在');
    }
    if (maximumDepth > (graph?.maxTriggerDepth ?? 8)) errors.push('效果图触发深度越界');
    let abilityValue=null,rawSpent=spent;
    if(!errors.length)try{
      const raw=rawAbilityValue(graph);
      abilityValue=priceAbilityWithBasis({...options.costContract,effectGraph:graph},{baselineCredit:Math.max(0,raw.rawActiveValue+raw.rawPassiveValue-spent)},graph,raw);
      spent=abilityValue.netValue;
    }catch(error){errors.push(error.message);}
    if (Number.isFinite(options.budget) && spent > options.budget) errors.push(`效果图超预算：${spent}/${options.budget}`);
    return {pass: errors.length === 0, errors: [...new Set(errors)], spent, rawSpent, abilityValue, maximumDepth};
  }

  function resolveSpeciesTemplate(profile) {
    const explicit = SPECIES_TEMPLATES[profile?.物种ID];
    if (explicit) return {id: profile.物种ID, ...explicit};
    const name = String(profile?.名称 ?? '');
    const found = Object.entries(SPECIES_TEMPLATES).find(([, template]) => template.aliases.some(alias => name.includes(alias)));
    if (found) return {id: found[0], ...found[1]};
    return {
      id: 'generic-beast', aliases: [], tags: cleanList(profile?.种族特征).length ? cleanList(profile.种族特征) : ['力量'],
      baseAction: {name: '兽击', nodes: [['release.melee', {}], ['target.single', {}], ['check.physical_attack', {}], ['payload.damage', {类型: '物理', 骰数: 1, 骰面: 6, 加值: 0}]]},
      signature: null
    };
  }

  function supplementalBeastPlans(profile, tier) {
    const primary = cleanList(profile?.属性谱?.主属性)[0] ?? '物理';
    const damageType = foundation.canonicalDamageType(primary);
    const prefix = cleanList(profile?.种族特征)[0] ?? String(profile?.名称 ?? '魂兽');
    const plans = [
      {name: `${prefix}猎杀`, minimumTier: '百年', nodes: [
        ['release.melee', {}], ['target.single', {}], ['check.physical_attack', {}],
        ['payload.damage', {类型: damageType, 骰数: 2, 骰面: 6, 加值: 2}]
      ]},
      {name: `${prefix}护体`, minimumTier: '千年', nodes: [
        ['target.self', {}], ['payload.shield', {骰数: 2, 骰面: 8, 加值: 4}]
      ]},
      {name: `${primary}兽潮`, minimumTier: '万年', nodes: [
        ['release.projectile', {距离区: 2}], ['target.cone', {距离区: 2, 最大目标: 4}], ['check.save', {属性: '身法', 成功效果: '伤害减半'}],
        ['payload.damage', {类型: damageType, 骰数: 3, 骰面: 8, 加值: 8}]
      ]},
      {name: `${prefix}威域`, minimumTier: '十万年', nodes: [
        ['release.projectile', {距离区: 3}], ['target.burst', {半径区: 1, 最大目标: 5}], ['check.save', {属性: '意志', 成功效果: '伤害减半'}],
        ['payload.damage', {类型: damageType, 骰数: 6, 骰面: 10, 加值: 15}], ['status.fear', {持续回合: 2}]
      ]},
      {name: `${prefix}神话天劫`, minimumTier: '百万年', nodes: [
        ['release.projectile', {距离区: 4}], ['target.single', {}], ['check.soul_attack', {命中加值: 4}],
        ['payload.damage', {类型: damageType, 骰数: 8, 骰面: 12, 加值: 30, 穿透档: 1}], ['status.stun', {持续回合: 1}]
      ]}
    ];
    return plans.filter(plan => TIER_RANK[tier.名称] >= TIER_RANK[plan.minimumTier]);
  }

  function calculateBeastBudget(profile) {
    return foundation.BEAST_VALUE.growthQuote(profile.年限).enhancement;
  }

  function compileSoulBeastSkills(profile, options = {}, compareUpgrades=mechanicalOrder) {
    const lineage=foundation.BEAST_VALUE.validateLineage(profile.血脉);
    const soul=lineage.compiled, tier=foundation.getAgeTier(profile.年限), budget=calculateBeastBudget(profile);
    const seed=stableHash(options.seed??profile.技能种子??profile.id);
    const tags=clone(soul.semanticTags), core=foundation.MARTIAL_SOUL_CORE;
    const baseline=clone(soul.baseAction.effectSpecs);
    const baselineCost=baseline.reduce((sum,[id,p])=>sum+calculateNodeCost(id,p),0);
    if(baselineCost>200)throw new Error('魂兽基础攻击超出本体基础包');
    if(options.requestedSkills?.length){
      const requested=options.requestedSkills;
      const allocation=Math.floor(budget/requested.length);
      const authored=requested.map((item,index)=>{
        const directed=compileDirectedGraph({requestedBranches:item.requestedBranches,costContract:item,ageTier:tier.名称,mechanismCap:tier.机制上限,budget:allocation,provenance:{source:'priced-beast-lineage',profileId:profile.id}},compareUpgrades);
        if(directed.graph.nodes.some(node=>!core.allowsEffect(soul,node.effectId,node.params)))throw new Error(`具名魂兽能力缺少付费通道：${item.name}`);
        return {id:`beast-skill-${profile.id}-${index+2}`,name:item.name,ownerKind:'魂兽',sourceBeastProfileId:profile.id,speciesTemplateId:profile.物种ID,tags,effectGraph:directed.graph,
          budget:{allocated:allocation,spent:directed.spent,unallocated:directed.unallocated},soulPowerCost:Math.round(directed.spent/32),soulPowerCostRate:TIER_SOUL_COST_RATE[tier.名称],outputScale:1,ageTier:tier.名称,
          ...declaredAbilityCosts(item),usageRules:clone(item.usageRules??{}),directedPlan:directed,abilityValue:directed.abilityValue,immutableHash:stableHash(JSON.stringify(directed.graph)).toString(16)};
      });
      const remaining=budget-authored.reduce((sum,item)=>sum+item.budget.spent,0);
      const naturalAllowance=Math.min(remaining,Math.floor(budget*.2),foundation.BEAST_VALUE.yearsLevel(profile.年限)*2);
      const allocated=optimizePlanToBudget(baseline,baselineCost+naturalAllowance,'均衡',calculateNodeCost,seed%7,baselineCost+naturalAllowance,null,{},compareUpgrades);
      const graph=makeBranchedGraph([{activation:'active',nodes:allocated.nodes}],{provenance:{source:'priced-beast-lineage',profileId:profile.id}});
      const checked=validateGraph(graph,{ageTier:tier.名称,mechanismCap:tier.机制上限,budget:baselineCost+naturalAllowance});
      if(!checked.pass)throw new Error(checked.errors.join('；'));
      const natural={id:`beast-skill-${profile.id}-1`,name:soul.baseAction.name,ownerKind:'魂兽',sourceBeastProfileId:profile.id,speciesTemplateId:profile.物种ID,tags,effectGraph:graph,
        budget:{allocated:baselineCost+naturalAllowance,spent:checked.spent,unallocated:baselineCost+naturalAllowance-checked.spent},abilityValue:checked.abilityValue,soulPowerCost:0,soulPowerCostRate:0,outputScale:1,ageTier:tier.名称,immutableHash:stableHash(JSON.stringify(graph)).toString(16)};
      const spent=budget-remaining+checked.spent-baselineCost;
      return {registryVersion:REGISTRY_VERSION,speciesTemplateId:profile.物种ID,tags,baselineCost,budget:{total:budget,spent,unallocated:budget-spent},skills:[natural,...authored].map(abilities.seal)};
    }
    const plans=[];
    const passiveKeys=new Set();
    const validatePlan=plan=>{
      if(plan.nodes.some(([id,p])=>!core.allowsEffect(soul,id,p)))return false;
      try {
        const graph=plan.activation==='passive'?makeBranchedGraph([{activation:'passive',nodes:plan.nodes}]):makeLinearGraph(plan.nodes);
        return validateGraph(graph,{ageTier:tier.名称,mechanismCap:tier.机制上限,budget}).pass;
      }catch{return false;}
    };
    const payloadIds=[...new Set(soul.allowedEffectIds)].filter(id=>EFFECT_REGISTRY[id]&&!EFFECT_REGISTRY[id].hitRule?.inline&&['payload','status','movement','zone','summon','transform','reaction','domain'].includes(EFFECT_REGISTRY[id].family));
    const ordered=payloadIds.sort((a,b)=>stableHash(`${seed}:${a}`)-stableHash(`${seed}:${b}`));
    for(const id of ordered){
      const guardPool=id==='status.status_guard'&&options.guardTargets
        ? [{guardTargets:cleanList(options.guardTargets).filter(target=>foundation.STATUS_GUARD_TARGETS.includes(target))}] : [];
      const variants=soulEffectVariants(soul,id,{},guardPool).filter(params=>!EFFECT_REGISTRY[id]?.hitRule||calculateNodeCost(id,params)<=budget*.5-8);
      if(!variants.length)continue;
      const params=clone(variants[seed%variants.length]);
      // Wild recovery is a finite reserve, not an endlessly repeatable full reset.
      if(id==='payload.restore'){params.生命模式='定量';params.生命数值=Math.min(25,foundation.BEAST_VALUE.yearsLevel(profile.年限));params.魂力模式='无';params.魂力数值=0;params.每日次数=1;}
      if(['payload.shield','payload.heal','status.regeneration'].includes(id)){params.骰数=1;params.骰面=6;params.加值=Math.min(12,Math.floor(foundation.BEAST_VALUE.yearsLevel(profile.年限)/4));if(id==='status.regeneration')params.持续回合=2;}
      const beneficial=effectPolarity(id,params)==='beneficial';
      const targeting=id==='realm.store'?[['release.touch',{}],['target.single',{阵营规则:'任意'}]]:beneficial&&core.allowsEffect(soul,'target.self',{})?[['target.self',{}]]:[['release.melee',{}],['target.single',{}],...(!beneficial?[['check.physical_attack',{}]]:[])];
      const plan={name:EFFECT_REGISTRY[id].displayName,activation:'active',nodes:[...targeting,[id,params]]};
      if(validatePlan(plan))plans.push(plan);
      if(['status.resistance_shift','status.status_guard'].includes(id)&&params.模式!=='易伤'){
        const passiveParams={...params};delete passiveParams.持续回合;
        const key=JSON.stringify([id,passiveParams]);
        const passive={name:EFFECT_REGISTRY[id].displayName,activation:'passive',nodes:[[id,passiveParams]]};
        if(!passiveKeys.has(key)&&validatePlan(passive)){plans.push(passive);passiveKeys.add(key);}
      }
    }
    for(const id of [...new Set(soul.allowedEffectIds)].filter(id=>EFFECT_REGISTRY[id]?.hitRule?.inline).sort((x,y)=>stableHash(`${seed}:${x}`)-stableHash(`${seed}:${y}`))){
      const variants=soulEffectVariants(soul,id,{}).map(params=>hitInterferenceAttackSpecs(id,params,{variant:seed,damageType:soul.attributes?.[0]?.name??'物理',allowsEffect:(effectId,p)=>core.allowsEffect(soul,effectId,p)})).filter(nodes=>nodes&&nodes.reduce((total,[effectId,p])=>total+calculateNodeCost(effectId,p),0)<=budget*.5);
      const nodes=variants[seed%Math.max(1,variants.length)];if(!nodes)continue;const plan={name:EFFECT_REGISTRY[id].displayName,activation:'active',nodes};if(validatePlan(plan))plans.push(plan);
    }
    if(plans.some(plan=>plan.nodes.some(([id])=>EFFECT_REGISTRY[id]?.hitRule?.inline)))plans.sort((left,right)=>stableHash(`${seed}:hit-plan:${left.name}`)-stableHash(`${seed}:hit-plan:${right.name}`));
    const limit=TIER_RANK[tier.名称]+1;
    const selected=[];let reserved=0;
    for(const plan of plans){
      if(selected.length>=limit-1)break;
      const cost=plan.nodes.reduce((sum,[id,p])=>sum+calculateNodeCost(id,p,{activation:plan.activation}),0);
      if(reserved+cost>budget*.5)continue;
      selected.push({...plan,minimum:cost});reserved+=cost;
    }
    const all=[{name:soul.baseAction.name,activation:'active',nodes:baseline,minimum:baselineCost},...selected];
    const activeCount=all.filter(plan=>plan.activation!=='passive').length;
    const extra=Math.max(0,budget-reserved);
    let remainder=budget+baselineCost;
    const skills=all.map((plan,index)=>{
      const addition=plan.activation==='passive'?0:Math.min(Math.floor(extra/activeCount),index===0?Math.min(Math.floor(budget*.2),foundation.BEAST_VALUE.yearsLevel(profile.年限)*2):foundation.BEAST_VALUE.yearsLevel(profile.年限)*4+40);
      const target=plan.minimum+addition;
      const recovery=plan.nodes.some(([id])=>['payload.repair_item','payload.fabricate','payload.shield','payload.heal','payload.restore','payload.soul_restore','status.regeneration'].includes(id));
      const allocation=plan.activation==='passive'||recovery?{nodes:plan.nodes}:optimizePlanToBudget(plan.nodes,target,'均衡',calculateNodeCost,seed%7,target);
      const graph=makeBranchedGraph([{activation:plan.activation,nodes:allocation.nodes}],{provenance:{source:'priced-beast-lineage',profileId:profile.id}});
      const validation=validateGraph(graph,{ageTier:tier.名称,mechanismCap:tier.机制上限,budget:remainder});
      if(!validation.pass)throw new Error(validation.errors.join('；'));
      remainder-=validation.spent;
      return {id:`beast-skill-${profile.id}-${index+1}`,name:plan.name,ownerKind:'魂兽',sourceBeastProfileId:profile.id,speciesTemplateId:profile.物种ID,tags,
        effectGraph:graph,abilityValue:validation.abilityValue,budget:{allocated:target,spent:validation.spent,unallocated:target-validation.spent},
        soulPowerCost:index===0||plan.activation==='passive'?0:Math.round(validation.spent/32),soulPowerCostRate:index===0||plan.activation==='passive'?0:TIER_SOUL_COST_RATE[tier.名称],
        outputScale:1,ageTier:tier.名称,immutableHash:stableHash(JSON.stringify(graph)).toString(16)};
    });
    // Unused construction allowance stays unused; it never inflates a free attack.
    const spent=skills.reduce((sum,skill)=>sum+skill.budget.spent,0)-baselineCost;
    return {registryVersion:REGISTRY_VERSION,speciesTemplateId:profile.物种ID,tags,baselineCost,budget:{total:budget,spent,unallocated:budget-spent},skills:skills.map(abilities.seal)};
  }

  function martialSoulTags(soul) {
    return tagSet(soul?.类别标签, soul?.属性标签, soul?.属性谱?.主属性, soul?.属性谱?.副属性,
      soul?.表达机制, soul?.先天特性, soul?.扩展?.结构化武魂?.semanticTags, [soul?.名称]);
  }

  function isPaidBeastBaseAction(profile,compilation,skill,index){
    if(index!==0||skill.id!==`beast-skill-${profile.id}-1`||skill.soulPowerCost!==0||skill.soulPowerCostRate!==0)return false;
    const baseline=foundation.BEAST_VALUE.validateLineage(profile.血脉).compiled.baseAction.effectSpecs;
    const baseCost=baseline.reduce((sum,[id,p])=>sum+calculateNodeCost(id,p),0),target=skill.budget?.allocated;
    const ceiling=baseCost+Math.min(Math.floor(calculateBeastBudget(profile)*.2),foundation.BEAST_VALUE.yearsLevel(profile.年限)*2);
    if(!Number.isSafeInteger(target)||target<baseCost||target>ceiling||skill.budget.spent>target)return false;
    // The compiler can use an explicitly supplied seed. Its seven optimizer variants
    // are the complete legal native shapes; arbitrary damage or targeting is never accepted.
    for(let variant=0;variant<7;variant++){
      const allocated=optimizePlanToBudget(clone(baseline),target,'均衡',calculateNodeCost,variant,target);
      const graph=makeBranchedGraph([{activation:'active',nodes:allocated.nodes}],{provenance:{source:'priced-beast-lineage',profileId:profile.id}});
      if(abilities.hash(graph)===abilities.hash(skill.effectGraph))return true;
    }
    return false;
  }

  function validateBeastCompilation(profile, compilation) {
    const lineage=foundation.BEAST_VALUE.validateLineage(profile.血脉);
    const tier=foundation.getAgeTier(profile.年限),budget=calculateBeastBudget(profile);
    if(!compilation?.skills?.length||compilation.budget.total!==budget)throw new Error('魂兽技能额度与年限不一致');
    const baselineCost=lineage.compiled.baseAction.effectSpecs.reduce((sum,[id,p])=>sum+calculateNodeCost(id,p),0);
    let total=0;
    const ids=new Set();
    for(const [index,skill] of compilation.skills.entries()){
      if(ids.has(skill.id)||skill.sourceBeastProfileId!==profile.id)throw new Error('魂兽技能来源或编号不一致');
      ids.add(skill.id);
      if(!abilities.verify(skill).pass)throw new Error('魂兽技能完整合同已改变');
      if(skill.effectGraph.nodes.some(node=>!foundation.MARTIAL_SOUL_CORE.allowsEffect(lineage.compiled,node.effectId,node.params))&&!isPaidBeastBaseAction(profile,compilation,skill,index))throw new Error('魂兽技能使用了未购买的血脉通道');
      const checked=validateGraph(skill.effectGraph,{ageTier:tier.名称,mechanismCap:tier.机制上限,budget:budget+baselineCost,costContract:skill});
      if(validateAbilityValue(skill).length)throw Error('魂兽能力价值账本无效');
      if(!checked.pass||checked.spent!==skill.budget.spent||skill.outputScale!==1)throw new Error('魂兽技能效果与计价不一致');
      total+=checked.spent;
    }
    const spent=total-baselineCost;
    if(compilation.baselineCost!==baselineCost||spent>budget||spent!==compilation.budget.spent||budget-spent!==compilation.budget.unallocated)throw new Error('魂兽实际能力与总账不一致');
    return compilation;
  }

  function beastSourceTags(profile, beastSkills = []) {
    const lineage=foundation.BEAST_VALUE.validateLineage(profile?.血脉);
    return tagSet(lineage.compiled.semanticTags, profile?.类别标签, profile?.种族特征, profile?.解剖标签);
  }

  // Source authors freeze semantic evidence from purchased channels, never from a name.
  // Unlisted channels continue to use their ordinary attribute/species evidence.
  const SOURCE_CHANNEL_BRIDGES = Object.freeze({
    'channel.entangle':['bridge.plant-entangle'],
    'channel.armor_break':['bridge.hammer-kinetic'],
    'channel.burn':['bridge.flame-conduction'],
    'channel.debuff':['bridge.venom-transmission','bridge.frost-structure'],
    'channel.buff':['bridge.motion-expression'],
    'channel.movement':['bridge.motion-expression','bridge.hammer-kinetic'],
    'channel.freeze':['bridge.frost-structure'],
    'channel.blind':['bridge.shadow-illusion'],
    'channel.stealth':['bridge.shadow-illusion']
  });
  function sourceBridgeTags(channels = []) {
    return cleanList(channels.flatMap(id=>foundation.MARTIAL_SOUL_CORE.CHANNEL_REGISTRY[id] ? SOURCE_CHANNEL_BRIDGES[id]??[] : []));
  }

  function paidSourceBridgeTags(profile, compilation = profile?.扩展?.能力账本) {
    const lineage=foundation.BEAST_VALUE.validateLineage(profile.血脉).compiled;
    const channels=new Set(lineage.definition.channels),guards=new Set();
    if(channels.has('channel.status-guard')){
      // Native protection must come from a valid, paid ability, not a free-form label.
      const native=validateBeastCompilation(profile,compilation??compileSoulBeastSkills(profile));
      for(const skill of native.skills)for(const node of skill.effectGraph.nodes)
        if(node.effectId==='status.status_guard')guards.add(node.params.防护对象);
      const plain={...profile,种族特征:cleanList(profile.种族特征).filter(id=>!id.startsWith(SOURCE_PROOF_PREFIX))};
      const expression={名称:profile.名称,扩展:{结构化武魂:lineage}};
      for(const bridge of resolveBridges(expression,plain))for(const target of bridge.guardTargets??[])guards.add(target);
    }
    return PAID_SOURCE_BRIDGES.filter(bridge=>channels.has(bridge.paidSourceChannelId)&&
      (!bridge.guardTargets.length||bridge.guardTargets.some(target=>guards.has(target)))).map(bridge=>bridge.id);
  }

  function sourceTraitsWithBridges(profile, compilation) {
    return cleanList([...cleanList(profile.种族特征),...paidSourceBridgeTags(profile,compilation)]);
  }

  function sourceBeastOptions(profile) {
    const lineage=foundation.BEAST_VALUE.validateLineage(profile.血脉).compiled;
    return lineage.definition.channels.includes('channel.status-guard')?{guardTargets:clone(foundation.STATUS_GUARD_TARGETS)}:{};
  }

  function freezeSourceBridges(profile, compilation = profile?.扩展?.能力账本) {
    if(!compilation&&profile.血脉.definition.channels.includes('channel.status-guard')){
      compilation=compileSoulBeastSkills(profile,{...sourceBeastOptions(profile),seed:profile.技能种子});
      profile.扩展??={};
      profile.扩展.能力账本=clone(validateBeastCompilation(profile,compilation));
    }
    profile.种族特征=sourceTraitsWithBridges(profile,compilation);
    return profile;
  }

  function sourceTraitsMatch(profile, declaredTraits, compilation) {
    const traits=cleanList(profile.种族特征),declared=cleanList(declaredTraits);
    if(!traits.some(id=>id.startsWith(SOURCE_PROOF_PREFIX)))return abilities.hash(traits)===abilities.hash(declared);
    const expected=sourceTraitsWithBridges({...profile,种族特征:declared},compilation);
    return abilities.hash(traits)===abilities.hash(expected);
  }

  function boonExpression(soul,profile){
    if(profile?.扩展?.kind!=='boon-ring'||profile.年限!==423)return soul;
    const theme=talents.BOON_SOURCES[profile.扩展.sourceId];
    if(!theme)throw new Error('恩赐来源未登记');
    const expression=foundation.BEAST_VALUE.sourceLineage({名称:theme.name,种族特征:theme.channels,属性谱:{主属性:theme.attributes}}).compiled;
    const permitted=new Set(theme.channels.flatMap(id=>foundation.MARTIAL_SOUL_CORE.CHANNEL_REGISTRY[id].effectIds));
    expression.allowedEffectIds=expression.allowedEffectIds.filter(id=>permitted.has(id)||['release','targeting','check'].includes(EFFECT_REGISTRY[id]?.family));
    expression.channels=expression.channels.map(channel=>({...channel,effectIds:channel.effectIds.filter(id=>expression.allowedEffectIds.includes(id))}));
    return {...soul,属性谱:{主属性:theme.attributes,副属性:[]},属性标签:theme.attributes,表达机制:theme.channels,扩展:{...soul.扩展,boonExpressionSource:theme.id,结构化武魂:expression}};
  }
  function resolveBridges(soul, profile, beastSkills = []) {
    soul=boonExpression(soul,profile);
    const soulTags = martialSoulTags(soul);
    const beastTags = beastSourceTags(profile, beastSkills);
    const allowed=new Set(foundation.BEAST_VALUE.validateLineage(profile.血脉).compiled.allowedEffectIds);
    if(soul?.扩展?.boonExpressionSource)for(const id of allowed)if(!soul.扩展.结构化武魂.allowedEffectIds.includes(id))allowed.delete(id);
    const expression=soul?.扩展?.结构化武魂??soul?.结构化武魂??soul;
    const lineage=foundation.BEAST_VALUE.validateLineage(profile.血脉).compiled;
    // Only explicit, frozen evidence backed by the actual lineage can extend matching.
    // Re-reading an already prepared source does not infer or rewrite its evidence.
    const sourceEvidence=new Set(sourceBridgeTags(lineage.definition.channels).filter(id=>cleanList(profile.种族特征).includes(id)));
    const expressionEvidence=new Set(sourceBridgeTags(expression.definition?.channels??[]));
    const declaredMatch=bridge=>sourceEvidence.has(bridge.id)&&expressionEvidence.has(bridge.id);
    const paidEvidence=new Set(cleanList(profile.种族特征).some(id=>id.startsWith(SOURCE_PROOF_PREFIX))?paidSourceBridgeTags(profile):[]);
    return SEMANTIC_BRIDGES.filter(bridge => !bridge.fallbackOnly && (bridge.paidSourceChannelId
      ? paidEvidence.has(bridge.id)&&cleanList(profile.种族特征).includes(bridge.id)&&bridge.effectIds.some(id=>!shellEffect(id)&&foundation.MARTIAL_SOUL_CORE.allowsEffect(expression,id,{}))
      : (!bridge.requiredAttribute||expression.attributes?.some(a=>a.id===bridge.requiredAttribute)&&lineage.attributes.some(a=>a.id===bridge.requiredAttribute)) && (intersects(soulTags, tagSet(bridge.soulTags))||declaredMatch(bridge)) && (intersects(beastTags, tagSet(bridge.beastTags))||sourceEvidence.has(bridge.id))))
      .map(bridge => {
        const soulEvidence = [...soulTags].filter(tag => tagSet(bridge.soulTags).has(tag));
        const beastEvidence = [...beastTags].filter(tag => tagSet(bridge.beastTags).has(tag));
        if(declaredMatch(bridge))soulEvidence.push(bridge.id);
        if(sourceEvidence.has(bridge.id))beastEvidence.push(bridge.id);
        if(bridge.paidSourceChannelId){soulEvidence.push(bridge.paidSourceChannelId);beastEvidence.push(bridge.id);}
        return {...clone(bridge), sourceStructure:profile.血脉.compiled, effectIds:bridge.effectIds.filter(id=>allowed.has(id)), soulEvidence, beastEvidence, evidenceScore: soulEvidence.length + beastEvidence.length};
      })
      .filter(bridge=>bridge.effectIds.some(id=>!id.startsWith('release.')&&!id.startsWith('target.')&&!id.startsWith('check.')))
      .sort((left, right) => right.evidenceScore - left.evidenceScore || right.efficiency - left.efficiency || mechanicalOrder(left.id,right.id));
  }

  function bridgeAllowsEffect(bridge, effectId) {
    if(bridge?.paidSourceChannelId)return bridge.effectIds.includes(effectId);
    return Boolean(bridge?.effectIds?.includes(effectId) ||
      (effectId === 'target.self' && bridge) ||
      (effectId === 'domain.field' && bridge?.effectIds?.includes('target.aura')) ||
      (effectId === 'transform.martial_avatar' && bridge));
  }

  function bridgeSupportsParams(bridge,effectId,params={}) {
    if(!bridgeAllowsEffect(bridge,effectId))return false;
    if(effectId==='status.status_guard'&&!bridge.guardTargets?.includes(params.防护对象))return false;
    if(bridge.paidSourceChannelId&&!shellEffect(effectId)){
      const channel=foundation.MARTIAL_SOUL_CORE.CHANNEL_REGISTRY[bridge.paidSourceChannelId];
      if(!channelAllowsParams(channel,effectId,params))return false;
    }
    if(!bridge.sourceStructure)return true;
    const source=bridge.paidSourceChannelId&&!shellEffect(effectId)
      ? {...bridge.sourceStructure,channels:bridge.sourceStructure.channels.filter(channel=>channel.id===bridge.paidSourceChannelId)}
      : bridge.sourceStructure;
    return foundation.MARTIAL_SOUL_CORE.allowsEffect(source,effectId,params);
  }

  function supportingSourceBridge(bridges,effectId,params,preferredId) {
    return bridges.find(bridge=>bridge.id===preferredId&&bridgeSupportsParams(bridge,effectId,params))??
      bridges.find(bridge=>bridgeSupportsParams(bridge,effectId,params));
  }

  function sourceAllowsEffect(bridges,effectId,params) {
    if(effectId==='intimate.stimulate'||effectId==='intimate.climax')return bridges.some(bridge=>bridgeAllowsEffect(bridge,effectId));
    const sources=bridges.filter(bridge=>bridge.sourceStructure);
    if(!sources.length)return true;
    return sources.some(bridge=>bridgeSupportsParams(bridge,effectId,params));
  }

  const RESIDUAL_BRIDGE_ID = 'bridge.residual-imprint';
  const RESIDUAL_RING_MINIMUM_BUDGET = 38;

  function residualBridge(soul, profile) {
    const registered = SEMANTIC_BRIDGES.find(bridge => bridge.id === RESIDUAL_BRIDGE_ID);
    const compiled = soul?.扩展?.结构化武魂 ?? soul?.结构化武魂 ?? soul;
    const baseAction = compiled?.baseAction ?? soul?.扩展?.专属基础动作 ?? {};
    return {
      ...clone(registered),
      soulEvidence: cleanList([soul?.名称, soul?.name, baseAction.modeName, baseAction.damageType]).slice(0, 4),
      beastEvidence: cleanList([
        profile?.名称,
        ...cleanList(profile?.属性谱?.主属性),
        ...cleanList(profile?.种族特征)
      ]).slice(0, 4),
      evidenceScore: 0,
      residualFallback: true
    };
  }

  function residualRingPlan(martialSoul, beastProfile, bridge, options = {}) {
    const compiled = martialSoul?.扩展?.结构化武魂 ?? martialSoul?.结构化武魂 ?? martialSoul;
    const baseAction = compiled?.baseAction ?? martialSoul?.扩展?.专属基础动作 ?? {};
    const mode=foundation.MARTIAL_SOUL_CORE.BASE_ACTION_MODES[baseAction.mode];
    if(!mode||!baseAction.attributeId||!baseAction.damageType)throw new Error('武魂基础动作不完整，无法生成本能残响');
    const damageType = foundation.canonicalDamageType(baseAction.damageType);
    const minimumDamageParams = {类型: damageType, 骰数: 1, 骰面: 4, 加值: 0, 穿透档: 0};
    const damageBudget = Math.max(0, round(options.availableBudget ?? 0));
    const canBuyDamage = damageBudget >= calculateNodeCost('payload.damage', minimumDamageParams);
    const nodes = [
      [mode.releaseId, {}],
      ['target.single', {}],
      [mode.checkId, {}],
      canBuyDamage ? ['payload.damage', minimumDamageParams] : ['payload.residual', {类型: damageType, 数值: 1}]
    ];
    return {
      name: options.name || `${martialSoul?.名称 ?? martialSoul?.name ?? '武魂'}·${beastProfile?.名称 ?? '魂兽'}${canBuyDamage ? '本能技' : '残响'}`,
      bridgeId: bridge.id,
      bridgeByEffect: Object.fromEntries(nodes.map(([effectId]) => [effectId, bridge.id])),
      residualFallback: !canBuyDamage,
      baseActionFallback: true,
      freeBaseActionShell: true,
      residualBaseAction:{mode:baseAction.mode,attributeId:baseAction.attributeId,damageType},
      nodes
    };
  }

  function validateBaseActionFallbackPlan(plan,martialSoul){
    if(!plan?.baseActionFallback)return false;
    const compiled=martialSoul?.扩展?.结构化武魂??martialSoul?.结构化武魂??martialSoul;
    const baseAction=compiled?.baseAction??martialSoul?.扩展?.专属基础动作??{};
    const mode=foundation.MARTIAL_SOUL_CORE.BASE_ACTION_MODES[baseAction.mode];
    const payloadId=plan.residualFallback?'payload.residual':'payload.damage';
    const expected=[mode?.releaseId,'target.single',mode?.checkId,payloadId];
    const actual=(plan.nodes??[]).map(([effectId])=>effectId);
    if(!mode||actual.length!==expected.length||actual.some((effectId,index)=>effectId!==expected[index]))throw new Error('基础动作保底必须严格复用武魂基础动作外壳，不能借用或夹带表达机制');
    const payload=plan.nodes[3]?.[1]??{};
    const damageType=foundation.canonicalDamageType(baseAction.damageType);
    if(payload.类型!==damageType)throw new Error('基础动作保底只能使用所选武魂基础动作的伤害属性');
    if(plan.residualFallback&&Number(payload.数值)!==1)throw new Error('本能残响只能造成所选武魂属性的1点微弱伤害');
    if(!plan.residualFallback&&(!Number.isFinite(Number(payload.骰数))||Number(payload.骰数)<1||!Number.isFinite(Number(payload.骰面))||Number(payload.骰面)<4))throw new Error('付费基础动作保底必须包含合法伤害骰');
    return true;
  }

  // A soul ring keeps its actual age, source and native blueprint. This pure
  // execution profile releases only the strength the current wielder can use.
  // castOrigin is a reproducible execution proof, never a replacement skill.
  function soulRingCastSource(skill){
    let source=skill,depth=0;
    while(source&&depth++<12){
      if(source.castOrigin){source=source.castOrigin.source;continue;}
      if(['copied','summoned-copy'].includes(source.sourceKind)){source=source.扩展?.copyOrigin?.source;continue;}
      return source;
    }
    return null;
  }
  function soulRingNativeRank(skill){
    const source=soulRingCastSource(skill);
    if(!source||!(source.来源魂环ID||source.sourceRingId||source.sourceKind==='soul-ring'||source.ringOrdinal))return 0;
    const years=Number(source.ageYears??source.年限??0),ageRank=years>=1000000?9:years>=100000?7:0;
    return Math.max(1,Math.min(9,round(source.nativeCastRank??source.minimumCastRank??source.ringOrdinal??1)),ageRank);
  }
  function soulRingMinimumRank(skill){
    const source=skill?.castOrigin?.source??skill;
    if(['copied','summoned-copy'].includes(source?.sourceKind))return 1;
    return Math.max(1,Math.min(9,round(source?.minimumCastRank??source?.ringOrdinal??1)));
  }
  function soulRingAvailableRank(state,actor,skill){
    const ids=foundation.ownedMartialSoulIds(state,actor?.id),count=Math.max(0,...ids.map(id=>state.武魂?.列表?.[id]?.魂环ID列表?.length??0));
    const level=Number(state.成长?.列表?.[actor?.id]?.魂力等级??actor?.成长?.魂力等级??actor?.派生?.有效等级??0);
    const levelRank=Math.max(1,Math.min(9,Math.floor(Math.max(10,level)/10)));
    const copied=['copied','summoned-copy'].includes((skill?.castOrigin?.source??skill)?.sourceKind);
    return Math.min(levelRank,copied?levelRank:Math.max(1,count),globalThis.SoulControlCore?.maximumCastRank(state,actor?.id)??9);
  }
  function downcastNodeRank(node){
    const p=node.params??{},id=node.effectId;
    if(['payload.revive','transform.martial_avatar','status.invulnerable'].includes(id))return 7;
    if(id==='status.resistance_shift'&&['免疫','吸收'].includes(p.模式)||id==='status.status_guard'&&p.模式==='免疫')return 7;
    if(id==='payload.restore'&&[p.生命模式,p.魂力模式].includes('恢复至上限'))return 7;
    if((p.持续方式&&p.持续方式!=='回合'&&p.持续方式!=='世界分钟')||p.变化保留||p.认知保留||p.战斗后保留)return 7;
    if(['status.power_seal','status.mind_control','status.soul_control','status.cognition_shift'].includes(id))return 5;
    if(['payload.fabricate','payload.repair_item','payload.create_key','payload.suppress_lock','payload.arcane_lock'].includes(id))return 5;if(id==='payload.rule_break')return 7;
    const minimum=EFFECT_REGISTRY[id]?.minimumAgeTier??'十年';
    return ({十年:1,百年:1,千年:3,万年:5,十万年:7,百万年:9})[minimum]??9;
  }
  function downcastParams(node,fraction,rank,activation){
    const template=EFFECT_REGISTRY[node.effectId],p=clone(node.params??{}),id=node.effectId;
    if(['contract.oath','trigger.contract','modifier.world_duration','payload.death'].includes(id))return p;
    // These are costs, limitations or inverted thresholds. They never become
    // cheaper/easier merely because the benefit has been released at low rank.
    const unchanged=new Set(['资源槽','事件槽','最低层数','锁定魂力','每回合魂力','每日次数','世界日冷却','阈值','魂力耗尽倍率','最大攻击魂技序号','最大攻击者等级']);
    for(const [key,bounds] of Object.entries(template?.parameterBounds??{})){
      if(unchanged.has(key)||!Array.isArray(bounds)||bounds.length!==2||!bounds.every(Number.isFinite)||!Number.isFinite(Number(p[key])))continue;
      const n=Number(p[key]),baseline=['效果倍率','制造速度倍率','成品效果倍率','魂力消耗倍率'].includes(key)?100:0;
      if(key==='魂力消耗倍率'&&n>=100)continue;
      const reduced=baseline+Math.sign(n-baseline)*Math.floor(Math.abs(n-baseline)*fraction);
      // Legacy avatars paid a minimum rank of one in these four dimensions.
      // Explicit zero dimensions belong to the new directional-avatar contract;
      // extending authoring bounds must not rewrite old downcast proofs.
      const minimum=id==='transform.martial_avatar'&&['属性增幅档','身心防御加值','基础动作增幅','同源魂技增幅'].includes(key)&&!Object.keys(OPTIONAL_EFFECT_PARAMETERS[id]).some(k=>Object.hasOwn(p,k))?1:bounds[0];
      p[key]=clamp(reduced,minimum,bounds[1]);
      if(key==='骰面')p[key]=Math.max(bounds[0],Math.floor(p[key]/2)*2);
      if(['命中加值','难度加值','挣脱难度加值'].includes(key))p[key]=Math.min(p[key],rank*2);
      if(key==='持续回合')p[key]=Math.min(p[key],Math.max(1,Math.ceil(rank/2)));
      if(key==='持续分钟')p[key]=Math.min(p[key],Math.max(1,rank*2));
      if(['目标数','最大目标','跳跃数','数量','最大技能数','技能继承数量','最大数量'].includes(key))p[key]=Math.min(p[key],Math.max(bounds[0],Math.ceil(rank/3)));
      if(key==='穿透档'||key==='护甲穿透')p[key]=0;
    }
    // Zero means unlimited in these contracts, so it must never be produced as
    // the result of reducing a limit. Rules that have no safe weak form lock.
    if(id==='status.invulnerable'){p.最大攻击魂技序号=Math.min(p.最大攻击魂技序号||9,rank);p.最大攻击者等级=Math.min(p.最大攻击者等级||100,rank*10+10);}
    if(id==='reaction.reflect'){
      p.最大攻击魂技序号=Math.min(p.最大攻击魂技序号||9,rank);
      if(p.最大距离区===0)p.最大距离区=1;
    }
    if(id==='status.mark')p.不可隐藏=false;
    if(id==='status.invisibility')p.攻击后解除=true;
    if(id==='move.flight')p.高度='低空';
    if(id==='domain.field')p.触发时机='回合开始';
    if(['copy.skillset','summon.entity'].includes(id)){p.排除魂骨=true;p.排除领域=true;}
    return normalizeParams(template,p,activation);
  }
  function compactCastSource(source){
    const {version,origin,...mechanical}=abilities.mechanics(source);
    return {...mechanical,...(origin?{扩展:origin}:{}),...(source.name?{name:source.name}:{}),...(source.名称?{名称:source.名称}:{}),immutableHash:source.immutableHash};
  }
  function ringReleasePlan(source,rank){
    const native=soulRingNativeRank(source),basis=rawAbilityValue(source.effectGraph),full=basis.rawActiveValue+basis.rawPassiveValue,minimum=soulRingMinimumRank(source),progress=(rank-minimum)/Math.max(1,native-minimum);
    const ceiling=Math.floor(Math.min(full,480)+Math.max(0,full-480)*progress*progress);
    const branches=graphBranches(source.effectGraph),lockedBranches=branches.map(branch=>({id:branch.id,label:branch.label,activation:branch.activation,optional:branch.optional,requiredRank:Math.max(1,...branch.nodes.map(downcastNodeRank))})).filter(v=>v.requiredRank>rank);
    const lockedIds=new Set(lockedBranches.map(v=>v.id)),usableActive=branches.some(b=>b.activation!=='passive'&&!lockedIds.has(b.id));
    const locked=lockedBranches.filter(v=>!v.optional&&(v.activation!=='passive'||!usableActive));
    const nothing=branches.every(b=>lockedIds.has(b.id));
    const reason=source.exchangeContracts?.length?'这项交换能力须掌握完整力量后使用':locked.length||nothing?`这项用途需要${(locked.length?Math.max(...locked.map(v=>v.requiredRank)):Math.min(...lockedBranches.map(v=>v.requiredRank)))}环强度，当前只能释放${rank}环强度`:'';
    return {native,full,ceiling,lockedBranches,lockedIds,reason};
  }
  function deriveSoulRingCastSkill(rawSkill,rankInput){
    const original=rawSkill?.castOrigin?.source??rawSkill,native=soulRingNativeRank(original),rank=Number(rankInput);
    if(!native||rank>=native)return original;
    if(!Number.isInteger(rank)||rank<soulRingMinimumRank(original))throw Error('所选释放强度尚未掌握');
    const source=compactCastSource(original),plan=ringReleasePlan(source,rank);
    function build(fraction){
      const graph=clone(source.effectGraph),removed=new Set(plan.lockedBranches.filter(v=>v.optional||v.activation==='passive').map(v=>v.id));
      // A wholly locked use keeps a valid, inspectable native graph. The release
      // decision forbids it; an empty graph must never pretend to be castable.
      if(!plan.reason&&removed.size&&graph.branches?.length){
        graph.branches=graph.branches.filter(b=>!removed.has(b.id));
        const kept=new Set(graph.branches.flatMap(b=>b.nodeIds));
        graph.nodes=graph.nodes.filter(n=>kept.has(n.id));graph.edges=(graph.edges??[]).filter(e=>kept.has(e.from)&&kept.has(e.to));
        graph.entryNodeId=graph.branches[0]?.entryNodeId??graph.nodes[0]?.id;
      }
      for(const branch of graphBranches(graph))if(!plan.lockedIds.has(branch.id))for(const node of branch.nodes){
        graph.nodes.find(n=>n.id===node.id).params=downcastParams(node,fraction,rank,branch.activation);
      }
      return graph;
    }
    const price=graph=>{const value=rawAbilityValue(graph);return value.rawActiveValue+value.rawPassiveValue;};
    let fraction=plan.full?Math.min(1,plan.ceiling/plan.full):1,graph=build(fraction);
    // Some registered prices are nonlinear (repair uses sqrt(value)). Fit the
    // entire derived graph, including all branches, rather than each magnitude.
    if(!plan.reason&&price(graph)>plan.ceiling){
      let lower=0,upper=fraction,best=build(0);
      for(let i=0;i<28;i++){const mid=(lower+upper)/2,candidate=build(mid);if(price(candidate)<=plan.ceiling){lower=mid;best=candidate;}else upper=mid;}
      graph=best;
    }
    const scoped=clone(source);if(scoped.effectConditions)scoped.effectConditions=Object.fromEntries(Object.entries(scoped.effectConditions).filter(([id])=>graph.nodes.some(n=>n.id===id)));
    const value=rawAbilityValue(graph),result={...scoped,effectGraph:graph,效果图:source.效果图?clone(graph):undefined,
      valueBasis:value,soulPowerCost:value.baseSoulPowerCost,abilityValue:abilityValueLedger({...scoped,effectGraph:graph}),
      castOrigin:{version:1,source,rank},immutableHash:''};
    if(result.效果图===undefined)delete result.效果图;
    if(result.effectConditions)result.effectConditions=Object.fromEntries(Object.entries(result.effectConditions).filter(([id])=>graph.nodes.some(n=>n.id===id)));
    return abilities.seal(result);
  }
  function soulRingCastRelease(skill){
    const proof=skill?.castOrigin;if(!proof)return {downcast:false,rank:soulRingNativeRank(skill),nativeRank:soulRingNativeRank(skill),reason:'',lockedBranches:[]};
    const plan=ringReleasePlan(proof.source,proof.rank),value=rawAbilityValue(skill.effectGraph);
    return {downcast:true,rank:proof.rank,nativeRank:plan.native,ceiling:plan.ceiling,lockedBranches:plan.lockedBranches.map(branch=>({...branch,unlockText:`达到${branch.requiredRank*10}级，且可释放${branch.requiredRank}环强度后开放`})),reason:plan.reason||(value.rawActiveValue+value.rawPassiveValue>plan.ceiling?'当前等级还无法释放这项用途的完整机制':'')};
  }
  function currentSoulRingCastSkill(state,actor,skill,requestedRank){
    const native=soulRingNativeRank(skill);if(!native)return skill;
    const source=skill.castOrigin?.source??skill,maximum=soulRingAvailableRank(state,actor,source),minimum=soulRingMinimumRank(source);
    const rank=requestedRank===undefined?(skill.castOrigin?.rank??Math.min(native,maximum)):Number(requestedRank);
    if(rank<minimum||rank>maximum||!Number.isInteger(rank))throw Error(maximum<minimum?`这项魂技需要至少${minimum}环强度，当前最多释放${maximum}环强度`:`释放强度须在${minimum}至${maximum}环之间`);
    return deriveSoulRingCastSkill(source,rank);
  }

  function calculateRingBudget(profile, soul, compatibility = 1) {
    const years = Math.max(1, Number(profile?.年限) || 1);

    const integrity = clamp(profile?.完整度 ?? 1, 0, 1);
    const tier = foundation.getAgeTier(years);
    // Million-year rings have five times the entire hundred-thousand-year budget.
    const ageMultiplier = tier.名称 === '百万年' ? 5 : 1;
    const potentialBase = {十年:240,百年:320,千年:460,万年:680,十万年:2040,百万年:2040}[tier.名称];
    const rangeLog = Math.max(1, Math.log10(tier.最大 === Number.MAX_SAFE_INTEGER ? tier.最小 * 10 : tier.最大) - Math.log10(tier.最小));
    const progress = clamp((Math.log10(years) - Math.log10(tier.最小)) / rangeLog, 0, 1);
    const potential = round(potentialBase * (1 + progress * 0.15) * integrity) * ageMultiplier;
    const soulGrade = foundation.getMartialSoulGrade(soul?.品级 ?? 1);
    const qualityMultiplier = clamp(soul?.转化效率倍率 ?? soulGrade.转化倍率 ?? 1, 0.75, 1.1);
    const conversion = clamp(compatibility * qualityMultiplier, 0.2, 1.1);
    const converted = Math.max(0, round(potential / ageMultiplier * conversion) * ageMultiplier);
    const guaranteedMinimum = potential > 0 ? Math.min(potential, RESIDUAL_RING_MINIMUM_BUDGET * ageMultiplier) : 0;
    const usable = Math.max(converted, guaranteedMinimum);
    return {potential, compatibility: round(compatibility, 4), qualityMultiplier: round(qualityMultiplier, 4), conversion: round(conversion, 4), converted, guaranteedMinimum, usable};
  }

  function ringSkillLimit(profileOrYears) {
    const years = Math.max(1, Number(typeof profileOrYears === 'object' ? profileOrYears?.年限 : profileOrYears) || 1);
    if (years >= 1000000) return 4;
    if (years >= 100000) return 2;
    return 1;
  }


  function ringSkillMinimumBudget(profileOrYears) {
    const years = Number(typeof profileOrYears === 'object' ? profileOrYears?.年限 : profileOrYears) || 1;
    return years >= 1000000 ? 2040 : years >= 100000 ? 680 : 0;
  }

  function skillPurposeFingerprint(skill) {
    const purposes = (skill.effectGraph?.nodes ?? []).map(node => ({
      effectId:node.effectId,
      activation:graphBranches(skill.effectGraph).find(branch=>branch.nodes.some(item=>item.id===node.id))?.activation ?? 'active',
      params:Object.fromEntries(Object.entries(node.params ?? {}).filter(([key]) =>
        ['类型','模式','防护对象','属性','目的','阵营规则','选择模式','最大目标','距离区','半径区','跳跃区','领域阵营','持续方式','持续分钟','价值上限','修复量','最大数量'].includes(key)))
    }));
    return JSON.stringify(purposes.sort((a,b)=>mechanicalOrder(JSON.stringify(a),JSON.stringify(b))));
  }

  function validateRingSkillPackage(compiled, profile, sourceBudget, context={}) {
    const errors=[], skills=compiled?.skills ?? [];
    const fixed=fixedRealmPolicy(context.martialSoul)&&skills.length===1&&fixedRealmSkillMatches(skills[0],context.martialSoul,profile);
    const floor=fixed?0:ringSkillMinimumBudget(profile), cap=fixed?1:ringSkillLimit(profile);
    if (!Array.isArray(skills) || !skills.length || skills.length > cap || compiled.skillCount !== skills.length)
      return {pass:false,errors:['魂技数量不符合年限上限'],spent:0};
    let spent=0;const purposes=new Set(),ids=new Set(),passives=new Set();
    for(const skill of skills){
      if(!abilities.verify(skill).pass)errors.push('魂技完整合同指纹无效');
      errors.push(...validateValueBasis(skill,true));
      const freeShell=skill.compatibility?.baseActionFallback && floor===0;
      const checked=validateGraph(skill.effectGraph,{ageTier:foundation.getAgeTier(profile.年限).名称,
        mechanismCap:foundation.getAgeTier(profile.年限).机制上限,budget:skill.budget?.available,
        requireDualProvenance:!fixed,costContract:skill,costForNode:freeShell?(id,params)=>id==='payload.damage'?calculateNodeCost(id,params):0:calculateNodeCost});
      errors.push(...checked.errors);
      if(skill.effectGraph?.nodes?.some(node=>node.provenance?.bridgeId?.startsWith(SOURCE_PROOF_PREFIX))){
        const validEvidence=new Set(paidSourceBridgeTags(profile));
        const sourceStructure=foundation.BEAST_VALUE.validateLineage(profile.血脉).compiled;
        for(const node of skill.effectGraph.nodes){
          if(!node.provenance?.bridgeId?.startsWith(SOURCE_PROOF_PREFIX))continue;
          const registered=PAID_SOURCE_BRIDGES.find(bridge=>bridge.id===node.provenance.bridgeId);
          if(!registered||!validEvidence.has(registered.id)||!profile.种族特征.includes(registered.id)||!bridgeSupportsParams({...registered,sourceStructure},node.effectId,node.params))errors.push('魂技节点缺少实际付费来源或参数凭证');
        }
      }
      if(abilities.hash(checked.abilityValue)!==abilities.hash(skill.abilityValue))errors.push('魂技价值账本与完整合同不一致');
      if(checked.spent!==skill.budget?.spent||checked.rawSpent<floor)errors.push('魂技实际花费未达到质量底线或记录不一致');
      if(floor && (skill.compatibility?.residualFallback || skill.compatibility?.baseActionFallback))errors.push('高年限魂环不能使用弱保底');
      if(!Number.isFinite(skill.budget?.available)||skill.budget.available<checked.spent)errors.push('魂技分配不足');
      if(!skill.id||ids.has(skill.id))errors.push('魂技身份重复');ids.add(skill.id);
      const purpose=skillPurposeFingerprint(skill);
      if(purposes.has(purpose))errors.push('同一魂环不能拆出用途重复的魂技');purposes.add(purpose);
      for (const branch of graphBranches(skill.effectGraph).filter(branch=>branch.activation==='passive')) for (const node of branch.nodes) {
        const key=node.effectId+':'+(node.params.类型 ?? node.params.防护对象);
        if (passives.has(key)) errors.push('同一魂环不得重复购买重叠常驻防护');
        passives.add(key);
      }
      spent+=checked.spent;
    }
    const allocated=skills.reduce((sum,skill)=>sum+Number(skill.budget?.available ?? 0),0);
    const growth=compiled.expressionGrowth,E=growth?.cost??0,skillAvailable=sourceBudget.usable-E;
    if(growth&&(!Number.isSafeInteger(E)||E<0||E!==growth.creationPoints*20||growth.conversion!==20||compiled.budget.expressionCost!==E||compiled.budget.skillAvailable!==skillAvailable||compiled.budget.totalSpent!==spent+E||compiled.budget.unallocated!==skillAvailable-spent))errors.push('武魂成长与魂技共用额度不符');
    if(compiled.budget?.available!==sourceBudget.usable||spent>skillAvailable||allocated>skillAvailable||
      spent!==compiled.budget?.spent)errors.push('整环预算不一致或重复分配');
    return {pass:errors.length===0,errors,spent,minimumSkillBudget:floor,skillLimit:cap};
  }

  function validateFrozenRingSources(compiled,martialSoul,profile,beastSkills=[]){
    if(compiled.skills?.some(skill=>skill.effectGraph?.nodes?.some(n=>n.effectId==='realm.deploy'))){const pass=!!fixedRealmPolicy(martialSoul)&&compiled.skills.length===1&&fixedRealmSkillMatches(compiled.skills[0],martialSoul,profile);return {pass,errors:pass?[]:['对应席位召唤缺少已购买的画境特性或实际魂环来源']};}
    const errors=[];martialSoul=boonExpression(martialSoul,profile);
    const realBridges=resolveBridges(martialSoul,profile,beastSkills),same=(a,b)=>abilities.hash(a)===abilities.hash(b);
    for(const skill of compiled.skills??[]){
      const fallback=Boolean(skill.compatibility?.baseActionFallback),bridges=fallback?[residualBridge(martialSoul,profile)]:realBridges;
      if(fallback)try{validateBaseActionFallbackPlan({baseActionFallback:true,residualFallback:skill.compatibility.residualFallback,nodes:skill.effectGraph.nodes.map(n=>[n.effectId,n.params])},martialSoul);}catch(e){errors.push(e.message);}
      if(skill.sourceMartialSoulId!==martialSoul.id||skill.sourceBeastProfileId!==profile.id)errors.push('冻结魂技的武魂或魂兽来源已改变');
      for(const branch of graphBranches(skill.effectGraph))for(const node of branch.nodes){
        const proof=node.provenance,bridge=bridges.find(b=>b.id===proof?.bridgeId);
        if(!bridge||!bridgeSupportsParams(bridge,node.effectId,node.params)||!same(proof.martialSoulEvidence,bridge.soulEvidence)||!same(proof.beastEvidence,bridge.beastEvidence))errors.push('冻结魂技缺少实际双端来源或语义桥：'+node.effectId);
        if(!fallback){
          const channel=skill.channelByBranchEffect?.[`${branch.id}:${node.effectId}`]??skill.channelByEffect?.[node.effectId];
          if(!foundation.MARTIAL_SOUL_CORE.allowsEffect(martialSoul,node.effectId,node.params)||!foundation.MARTIAL_SOUL_CORE.channelsForEffect(martialSoul,node.effectId,node.params).includes(channel)||!sourceAllowsEffect(realBridges,node.effectId,node.params))errors.push('冻结魂技超出实际已购表达或魂兽血脉：'+node.effectId);
        }
      }
    }
    return {pass:!errors.length,errors};
  }

  function splitValueBudget(totalInput, countInput) {
    const total = Math.max(0, round(totalInput));
    const count = Math.max(1, round(countInput));
    const base = Math.floor(total / count);
    const remainder = total - base * count;
    return Array.from({length: count}, (_, index) => base + Number(index < remainder));
  }

  function splitWeightedValueBudget(totalInput, weightsInput) {
    const total = Math.max(0,round(totalInput));
    const weights = Array.isArray(weightsInput) ? weightsInput.map(value => Math.max(1,round(value))) : [];
    if (!weights.length) return [total];
    const weightTotal = weights.reduce((sum,value) => sum + value,0);
    const exact = weights.map(value => total * value / weightTotal);
    const result = exact.map(Math.floor);
    let remainder = total - result.reduce((sum,value) => sum + value,0);
    const order = exact.map((value,index) => ({index,fraction:value - Math.floor(value)})).sort((left,right) => right.fraction-left.fraction || left.index-right.index);
    for (let index = 0; index < remainder; index += 1) result[order[index % order.length].index] += 1;
    return result;
  }

  function chooseRingPlan(bridges, profile, options = {}) {
    const requestedSpecs = Array.isArray(options.requestedEffects)
      ? options.requestedEffects.map(item => Array.isArray(item)
        ? [String(item[0] ?? ''), clone(item[1] ?? {})]
        : [String(item?.effectId ?? ''), clone(item?.params ?? {})]).filter(([id]) => id)
      : cleanList(options.requestedEffectIds).map(id => [id, {}]);
    const requested = cleanList(requestedSpecs.map(([id]) => id));
    const allowed = new Set(bridges.flatMap(bridge => bridge.effectIds));
    if (bridges.some(bridge => bridgeAllowsEffect(bridge, 'domain.field'))) allowed.add('domain.field');
    if (bridges.length) {
      allowed.add('target.self');
      allowed.add('transform.martial_avatar');
    }
    const concreteBySoul=(id,params={})=>{const concrete=allowed.has(id)?concretizeSoulEffectParams(options.martialSoul,id,params,bridges):null;return concrete&&!(options.allowAdultMechanics===false&&globalThis.SoulControlCore.adultMechanic({effectId:id,params:concrete}))?concrete:null;};
    const usableBySoul=(id,params={})=>Boolean(concreteBySoul(id,params));
    for (const [id,params] of requestedSpecs) {
      if (!EFFECT_REGISTRY[id]) throw new Error(`未登记效果ID：${id}`);
      if (!allowed.has(id)) throw new Error(`来源链不允许效果：${id}`);
      const concrete = concreteBySoul(id,params);
      if (!concrete) throw new Error(`武魂表达机制不允许效果或参数：${id}`);
      Object.assign(params,concrete);
    }
    if (requested.length) {
      const byFamily = family => requestedSpecs.filter(([id]) => EFFECT_REGISTRY[id]?.family === family);
      const executableFamilies = new Set(['payload', 'status', 'movement', 'zone', 'domain', 'summon', 'transform', 'reaction', 'sustain','contract','trigger','modifier']);
      const executable = requestedSpecs.filter(([id]) => executableFamilies.has(EFFECT_REGISTRY[id]?.family));
      if (!executable.some(([id]) => EFFECT_REGISTRY[id].family !== 'sustain')) throw new Error('效果提案缺少可结算载荷');
      const oathOnly=phase.isOathFormationOnly(executable);
      const isHarmfulSpec = ([id,params]) => effectPolarity(id,params) === 'harmful';
      const isBeneficialSpec = ([id,params]) => effectPolarity(id,params) === 'beneficial';
      const selfPreferred = !requestedSpecs.some(isHarmfulSpec) && executable.some(isBeneficialSpec);
      const targetlessReaction=executable.length>0&&executable.every(([id])=>EFFECT_REGISTRY[id]?.family==='reaction');
      const targetSpecs = byFamily('targeting');
      if (!targetSpecs.length&&!targetlessReaction) {
        const preferred = selfPreferred ? 'target.self' : 'target.single';
        const targetId = usableBySoul(preferred) ? preferred : [...allowed].find(id => EFFECT_REGISTRY[id]?.family === 'targeting'&&usableBySoul(id));
        if (!targetId) throw new Error('来源链无法补齐目标结构');
        targetSpecs.push([targetId, concreteBySoul(targetId,{})]);
      }
      const releaseSpecs = byFamily('release');
      if (!releaseSpecs.length&&!targetlessReaction && !targetSpecs.some(([id,p]) => ['target.self','target.aura'].includes(id)||id==='target.burst'&&p?.落点==='自身')) {
        // 原作只给机制而未指定释放形式时，优先选择价值最低的合法通道，
        // 避免高价表现形式挤掉已经明确要求保留的核心效果。
        const releaseId = [...allowed]
          .filter(id => EFFECT_REGISTRY[id]?.family === 'release' && usableBySoul(id))
          .sort((left,right) => calculateNodeCost(left,{}) - calculateNodeCost(right,{}) || mechanicalOrder(left,right))[0];
        if (!releaseId) throw new Error('来源链无法补齐释放方式');
        releaseSpecs.push([releaseId, concreteBySoul(releaseId,{})]);
      }
      const checkSpecs=byFamily('check');
      const captureOnly=executable.some(([id])=>id==='realm.store')&&!executable.some(([id,p])=>id!=='realm.store'&&effectPolarity(id,p)==='harmful');
      if(!checkSpecs.length&&!selfPreferred&&!targetlessReaction&&!captureOnly&&!oathOnly){
        const fieldOnly=executable.some(([id])=>EFFECT_REGISTRY[id]?.allowedContexts?.includes('field')&&!EFFECT_REGISTRY[id].allowedContexts.includes('battle'));
        const checkId=(fieldOnly?['check.save']:['check.soul_attack','check.physical_attack','check.save']).find(id=>usableBySoul(id));
        if(!checkId)throw new Error('来源链与武魂表达机制无法补齐检定结构');
        checkSpecs.push([checkId,concreteBySoul(checkId,checkId==='check.save'?{属性:'意志'}:{})]);
      }
      const ordered = [
        ...releaseSpecs,
        ...targetSpecs,
        ...executable.filter(([id]) => EFFECT_REGISTRY[id].placement === 'action.before-check'),
        ...checkSpecs,
        ...executable.filter(([id]) => EFFECT_REGISTRY[id].family !== 'sustain' && EFFECT_REGISTRY[id].placement !== 'action.before-check'),
        ...byFamily('sustain')
      ];
      const seen = new Set();
      const nodes = ordered.filter(([id,params]) => {const key=id+':'+JSON.stringify(params);return !seen.has(key)&&seen.add(key);});
      const bridgeByEffect = Object.fromEntries(nodes.map(([id,params]) => [id, supportingSourceBridge(bridges,id,params)?.id ?? '']));
      return {name: options.name || '自选魂环技', bridgeId: bridgeByEffect[executable[0][0]], bridgeByEffect, nodes};
    }
    if (!options.allowProceduralFallback) throw new Error('魂环需要玩家或LLM提交魂技效果提案，代码不会套用预设配方');
    {
    const variantIndex=Math.max(0,round(options.proceduralVariantIndex??0));
    const proceduralBridge=bridges[variantIndex%bridges.length];
    if(!proceduralBridge)throw new Error('武魂与魂兽之间没有已登记语义桥，拒绝编译魂技');
    const bridgeEffects=[...new Set(bridges.flatMap(bridge=>bridge.effectIds))].filter(id=>EFFECT_REGISTRY[id]?.placement!=='action.before-check');
    const executableFamilies=new Set(['payload','status','movement','zone','domain','summon','transform','reaction','contract','trigger','modifier']);
    const concreteEffects=bridgeEffects.flatMap(id=>soulEffectVariants(options.martialSoul,id,id==='check.save'?{属性:'意志'}:{},bridges).map(params=>({id,params})));
    const payloadCandidates=concreteEffects.filter(item=>executableFamilies.has(EFFECT_REGISTRY[item.id]?.family)&&!EFFECT_REGISTRY[item.id]?.hitRule?.inline);
    const payload=payloadCandidates[variantIndex%payloadCandidates.length];
    if(!payload)throw new Error('登记来源没有可程序组合的执行载荷');
    const harmful=effectPolarity(payload.id,payload.params)==='harmful';
    const targetOptions=concreteEffects.filter(item=>EFFECT_REGISTRY[item.id]?.family==='targeting'&&(!harmful||item.id!=='target.self'));
    const targetCandidates=!harmful&&targetOptions.some(item=>item.id==='target.self')?targetOptions.filter(item=>item.id==='target.self'):targetOptions;
    const selectedTarget=targetCandidates[variantIndex%targetCandidates.length];
    const target=selectedTarget?{...selectedTarget,params:{...selectedTarget.params,阵营规则:harmful?'敌方':'友方'}}:null;
    if(!target)throw new Error('登记来源与武魂表达机制无法共同提供目标结构');
    const releaseCandidates=concreteEffects.filter(item=>EFFECT_REGISTRY[item.id]?.family==='release');
    const release=target.id==='target.self'?null:releaseCandidates[variantIndex%releaseCandidates.length];
    if(target.id!=='target.self'&&!release)throw new Error('登记来源与武魂表达机制无法共同提供释放结构');
    const check=harmful?concreteEffects.find(item=>EFFECT_REGISTRY[item.id]?.family==='check'):null;
    const nodes=[...(release?[[release.id,release.params]]:[]),[target.id,target.params],...(check?[[check.id,check.params]]:[]),[payload.id,payload.params]];
    const bridgeByEffect=Object.fromEntries(nodes.map(([id,params])=>[id,supportingSourceBridge(bridges,id,params)?.id??'']));
    return {name:options.name||'程序组合魂技',bridgeId:bridgeByEffect[payload.id]||proceduralBridge.id,bridgeByEffect,nodes};
    }
  }

  const POWER_PARAMETER_KEYS = Object.freeze(new Set(['骰数', '骰面', '加值', '数值', '生命数值', '魂力数值', '效果倍率', '成品效果倍率', '属性加值', '生命百分比', '耐久', '命中加值', '难度加值', '护甲穿透', '穿透档', '属性增幅档', '身心防御加值', '基础动作增幅', '同源魂技增幅','修复量','价值上限']));
  const NON_POWER_PARAMETER_KEYS = Object.freeze(new Set(['持续回合', '持续分钟', '距离区', '最大目标', '半径区', '跳跃区', '层数', '领域强度', '强度', '次数', '最大数量', '数量']));
  const OPTIONAL_MECHANISMS = Object.freeze({
    'bridge.plant-entangle': [['status.poison', {持续回合: 2, 骰数: 1, 骰面: 4}], ['zone.hazard', {类型: '毒素', 骰数: 1, 骰面: 4, 持续回合: 2, 移动修正: -1}]],
    'bridge.venom-transmission': [['zone.hazard', {类型: '毒素', 骰数: 1, 骰面: 4, 持续回合: 2, 移动修正: -1}], ['status.paralysis', {层数: 1, 阈值: 3, 持续回合: 2}]],
    'bridge.hammer-kinetic': [['status.armor_break', {数值: 1, 持续回合: 2}], ['zone.wall', {耐久: 20, 持续回合: 2, 阻挡: '移动'}]],
    'bridge.flame-conduction': [['zone.hazard', {类型: '火焰', 骰数: 1, 骰面: 4, 持续回合: 2, 移动修正: -1}], ['zone.wall', {耐久: 20, 持续回合: 2, 阻挡: '全部'}]],
    'bridge.vitality-shaping': [['status.regeneration', {持续回合: 2, 骰数: 1, 骰面: 4}], ['status.resistance_shift', {类型: '物理', 模式: '抗性', 持续回合: 2}]],
    'bridge.motion-expression': [['status.haste', {数值: 1, 持续回合: 2}], ['summon.entity', {模板: '兽影', 数量: 1, 生命百分比: 20, 持续回合: 2}]],
    'bridge.mind-resonance': [['zone.obscure', {持续回合: 2, 强度: 1}], ['reaction.counter', {次数: 1, 强度: 1}]],
    'bridge.frost-structure': [['zone.wall', {耐久: 20, 持续回合: 2, 阻挡: '移动'}], ['status.slow', {数值: 1, 持续回合: 2}]],
    'bridge.lightning-conduction': [['status.stun', {持续回合: 1}], ['move.teleport', {距离区: 1, 目的: '指定站位'}]],
    'bridge.shadow-illusion': [['zone.obscure', {持续回合: 2, 强度: 1}], ['summon.entity', {模板: '分身', 数量: 1, 生命百分比: 20, 持续回合: 2}]],
    'bridge.space-fold': [['zone.wall', {耐久: 20, 持续回合: 2, 阻挡: '投射'}], ['reaction.counter', {次数: 1, 强度: 1}]],
    'bridge.holy-radiance': [['status.regeneration', {持续回合: 2, 骰数: 1, 骰面: 4}], ['reaction.counter', {次数: 1, 强度: 1}]]
  });

  function augmentPlanForStyle(plan, ageTier, budget, styleName, martialSoul, costForNode = calculateNodeCost, sourceBridges = []) {
    const desired = styleName === '机制丰富' ? 2 : styleName === '均衡' ? 1 : 0;
    if (!desired || TIER_RANK[ageTier] < TIER_RANK.千年) return [];
    const candidates = OPTIONAL_MECHANISMS[plan.bridgeId] ?? [];
    const existing = new Set(plan.nodes.map(([id]) => id));
    const added = [];
    const primary=plan.nodes.find(([id])=>['payload','status','movement','zone','domain','summon','transform','reaction','contract','trigger','modifier'].includes(EFFECT_REGISTRY[id]?.family));
    const polarity=effectPolarity(primary?.[0],primary?.[1]);
    let spent = plan.nodes.reduce((sum, [id, params]) => sum + costForNode(id, params), 0);
    for (const [effectId, params] of candidates) {
      const template = EFFECT_REGISTRY[effectId];
      if (effectPolarity(effectId,params) !== polarity || added.length >= desired || existing.has(effectId) || !bridgeAllowsEffect(sourceBridges.find(item => item.id === plan.bridgeId), effectId)) continue;
      if (!foundation.MARTIAL_SOUL_CORE.allowsEffect(martialSoul, effectId, params)) continue;
      if (!sourceAllowsEffect(sourceBridges,effectId,params)) continue;
      if (TIER_RANK[ageTier] < TIER_RANK[template.minimumAgeTier]) continue;
      const cost = costForNode(effectId, params);
      if (spent + cost > budget) continue;
      const sustainIndex = plan.nodes.findIndex(([id]) => id === 'sustain.maintain');
      const insertAt = sustainIndex < 0 ? plan.nodes.length : sustainIndex;
      plan.nodes.splice(insertAt, 0, [effectId, clone(params)]);
      existing.add(effectId);
      spent += cost;
      added.push({effectId, cost});
    }
    return added;
  }

  function incrementCandidates(nodeSpecs, costForNode = calculateNodeCost) {
    const candidates = [];
    for (const [index, [effectId, rawParams]] of nodeSpecs.entries()) {
      const template = EFFECT_REGISTRY[effectId];
      const params = normalizeParams(template, rawParams);
      for (const [key, bounds] of Object.entries(template.parameterBounds)) {
        if((key==='持续回合'&&params.持续方式&&params.持续方式!=='回合')||(key==='持续分钟'&&params.持续方式!=='世界分钟'))continue;
        if (!Array.isArray(bounds) || bounds.length !== 2 || !bounds.every(Number.isFinite)) continue;
        if (!POWER_PARAMETER_KEYS.has(key) && !NON_POWER_PARAMETER_KEYS.has(key)) continue;
        const current = Number(params[key] ?? bounds[0]);
        // Five-zone releases require an explicit authored declaration. Preserve
        // the historical auto-allocation ceiling and frozen beast compilations.
        if(effectId==='release.projectile'&&key==='距离区'&&current>=4)continue;
        const step = effectId==='status.buff'&&key==='数值'&&current<0?-1:key === '骰面' ? 2 : 1;
        if (current + step > bounds[1]||current+step<bounds[0]) continue;
        const nextParams = {...params, [key]: current + step};
        const delta = costForNode(effectId, nextParams) - costForNode(effectId, params);
        if (delta <= 0) continue;
        candidates.push({index, effectId, key, params: nextParams, delta, category: POWER_PARAMETER_KEYS.has(key) ? 'power' : 'utility'});
      }
    }
    return candidates;
  }

  function allocationPrice(specs,costForNode,costContract) {
    if(!hasValueBurdens(costContract,specs))return specs.reduce((sum,[id,params])=>sum+costForNode(id,params),0);
    const graph=makeLinearGraph(specs),raw=rawAbilityValue(graph);
    const nodeTotal=specs.reduce((sum,[id,params])=>sum+costForNode(id,params),0);
    const baselineCredit=raw.rawActiveValue-nodeTotal-phase.graphValueSurcharge(graph).reduce((sum,row)=>sum+row.rawValue,0);
    return priceAbilityWithBasis({...costContract,effectGraph:graph},{baselineCredit:Math.max(0,baselineCredit)},graph,raw).netValue;
  }

  // A workshop search compares many budgets against the same registered nodes.
  // Keep exact whole-graph prices within this search. Selections and candidate objects are never shared.
  function createWorkshopAllocator() {
    const entries=new Map(),quotes=new Map();
    let nextId=0, keyChars=0;
    function entryFor(value){
      const text=JSON.stringify(value),existing=entries.get(text);
      if(existing!==undefined)return existing;
      // Never recycle an ID while any quote or active walk might still use it.
      const entry={id:++nextId};
      if(text.length<=524288){
        if(entries.size>=8192||keyChars+text.length>524288){entries.clear();keyChars=0;}
        entries.set(text,entry);
        keyChars+=text.length;
      }
      return entry;
    }
    function nodeCost(effectId,params){
      const entry=entryFor([effectId,params]);
      return entry.cost??=calculateNodeCost(effectId,params);
    }
    return (nodes,budget,style,variant,contract)=>{
      const contractId=entryFor(contract).id,nodeIds=new WeakMap();
      const price=specs=>{
        // An allocation replaces an upgraded tuple, leaving every other tuple intact.
        const key=contractId+':'+specs.map(spec=>{
          let id=nodeIds.get(spec);
          if(id===undefined){id=entryFor(spec).id;nodeIds.set(spec,id);}
          return id;
        }).join(',');
        const cached=quotes.get(key);
        if(cached!==undefined)return cached;
        const value=allocationPrice(specs,nodeCost,contract);
        if(quotes.size>=32768)quotes.clear();
        quotes.set(key,value);
        return value;
      };
      return optimizePlanToBudget(nodes,budget,style,nodeCost,variant,0,null,contract,mechanicalOrder,price);
    };
  }

  function optimizePlanToBudget(nodeSpecs, budget, styleName = '均衡', costForNode = calculateNodeCost, variantIndexInput = 0, minimumSpent = 0, allocatedTarget = null, costContract = {}, compareUpgrades=mechanicalOrder, price=specs=>allocationPrice(specs,costForNode,costContract)) {
    const style = ALLOCATION_STYLES[styleName] ?? ALLOCATION_STYLES.均衡;
    const nodes = nodeSpecs.map(([id, params]) => [id, normalizeParams(EFFECT_REGISTRY[id], params)]);
    const repricesWhole=hasValueBurdens(costContract,nodes);
    const baseSpent = price(nodes);
    const targetSpent = Math.min(budget, Math.max(baseSpent, minimumSpent, allocatedTarget ?? Math.floor(Math.max(0, budget) * style.targetUtilization)));
    const targetAdded = Math.max(0, targetSpent - baseSpent);
    const desiredPower = targetAdded * ((style.powerShare[0] + style.powerShare[1]) / 2);
    let spent = baseSpent;
    let addedPower = 0;
    let addedUtility = 0;
    let guard = 0;
    const variantIndex = Math.max(0,round(variantIndexInput));
    while (spent < targetSpent && guard < 600) {
      guard += 1;
      const remaining = Math.min(targetSpent, budget) - spent;
      const increments=incrementCandidates(nodes,costForNode);
      const allCandidates=repricesWhole?increments.map(candidate=>{const next=nodes.map((spec,index)=>index===candidate.index?[candidate.effectId,candidate.params]:spec);return {...candidate,delta:price(next)-spent};}):increments;
      const candidates = allCandidates.filter(candidate => candidate.delta>0&&candidate.delta <= remaining);
      if (!candidates.length) break;
      const needPower = addedPower < desiredPower;
      const preferred = styleName === '机制丰富' ? (needPower && addedUtility > targetAdded * 0.55 ? 'power' : 'utility')
        : styleName === '威力集中' ? (needPower ? 'power' : 'utility')
          : (needPower ? 'power' : 'utility');
      const pool = candidates.filter(candidate => candidate.category === preferred);
      const currentShare = addedPower + addedUtility > 0 ? addedPower / (addedPower + addedUtility) : (preferred === 'power' ? 0 : 1);
      const fallbackImprovesBand = preferred === 'utility'
        ? currentShare < style.powerShare[0]
        : currentShare > style.powerShare[1];
      const preferredExistsAtAnyPrice = allCandidates.some(candidate => candidate.category === preferred);
      if (spent >= minimumSpent && !pool.length && !fallbackImprovesBand && preferredExistsAtAnyPrice) break;
      const ranked = (pool.length ? pool : candidates)
        .sort((left, right) => left.delta - right.delta || left.index - right.index || compareUpgrades(left.key,right.key));
      const chosen = variantIndex === 0 ? ranked[0] : ranked[(variantIndex + guard - 2) % Math.min(4,ranked.length)];
      nodes[chosen.index] = [chosen.effectId, chosen.params];
      spent += chosen.delta;
      if (chosen.category === 'power') addedPower += chosen.delta;
      else addedUtility += chosen.delta;
    }
    const added = addedPower + addedUtility;
    const share = added ? round(addedPower / added, 4) : 0;
    return {
      nodes,
      report: {
        style: ALLOCATION_STYLES[styleName] ? styleName : '均衡',
        baseSpent,
        targetSpent,
        finalSpent: spent,
        addedPowerPoints: addedPower,
        addedUtilityPoints: addedUtility,
        powerShareOfAdded: share,
        desiredPowerShareBand: clone(style.powerShare),
        withinStyleBand: added === 0 || (share >= style.powerShare[0] && share <= style.powerShare[1]),
        utilization: budget > 0 ? round(spent / budget, 4) : 0,
        limitsReached: spent < targetSpent
      }
    };
  }

  function contextualChannelForEffect(martialSoul, effectId, params, nodeSpecs) {
    const candidates = foundation.MARTIAL_SOUL_CORE.channelsForEffect(martialSoul, effectId, params);
    if (candidates.length <= 1) return candidates[0] ?? '';
    const familyWeight = Object.freeze({
      release: 1,
      targeting: 1,
      check: 2,
      payload: 6,
      status: 6,
      movement: 6,
      zone: 7,
      domain: 9,
      summon: 9,
      transform: 9,
      reaction: 9,
      sustain: 3
    });
    return candidates.map(channelId => {
      const channel = foundation.MARTIAL_SOUL_CORE.CHANNEL_REGISTRY[channelId];
      const score = nodeSpecs.reduce((sum, [plannedEffectId, plannedParams]) => {
        if (!foundation.MARTIAL_SOUL_CORE.channelsForEffect({channels: [channel]}, plannedEffectId, plannedParams).length) return sum;
        return sum + (familyWeight[EFFECT_REGISTRY[plannedEffectId]?.family] ?? 1);
      }, 0);
      return {channelId, score, breadth: channel?.effectIds?.length ?? Number.POSITIVE_INFINITY};
    }).sort((left, right) => right.score - left.score || left.breadth - right.breadth || mechanicalOrder(left.channelId,right.channelId))[0].channelId;
  }

  function normalizeRequestedBranches(value) {
    if (!Array.isArray(value)) return [];
    if (value.length > 4) throw new Error('单个魂技最多登记4个效果分支');
    return value.map((raw,index) => {
      const requestedEffects = Array.isArray(raw?.requestedEffects)
        ? raw.requestedEffects.map(item => Array.isArray(item)
          ? [String(item[0] ?? ''),clone(item[1] ?? {})]
          : [String(item?.effectId ?? ''),clone(item?.params ?? {})]).filter(([id]) => id)
        : cleanList(raw?.requestedEffectIds).map(id => [id,{}]);
      if (!requestedEffects.length) throw new Error(`效果分支${index + 1}没有效果提案`);
      const id = String(raw?.id || `branch-${index + 1}`).replace(/[^a-z0-9_-]+/gi,'-');
      return {
        id,
        activation:raw?.activation ?? 'active',
        label:String(raw?.label || `效果分支${index + 1}`),
        order:index + 1,
        optional:index > 0 ? raw?.optional !== false : Boolean(raw?.optional),
        priority:Number(raw?.priority ?? Math.max(1,100-index)),
        targetPolicy:['auto','enemy','ally','self','any'].includes(raw?.targetPolicy) ? raw.targetPolicy : 'auto',
        requestedEffects
      };
    });
  }

  // Shared exact request projection for advisor diagnostics and source authoring.
  // It uses the compiler's branch shell rules, not a second guessed graph.
  function ringRequestEffectSpecs(request) {
    if(request.requestedBranches?.length)return normalizeRequestedBranches(request.requestedBranches).flatMap(branch=>
      structuralizeDirectedBranch(branch).map(([effectId,params])=>({effectId,params,branchId:branch.id,activation:branch.activation})));
    const entries=Array.isArray(request.requestedEffects)?request.requestedEffects:cleanList(request.requestedEffectIds).map(id=>[id,{}]);
    return entries.map(item=>Array.isArray(item)?{effectId:String(item[0]??''),params:clone(item[1]??{}),activation:'active'}:
      {effectId:String(item?.effectId??''),params:clone(item?.params??{}),activation:'active'});
  }

  function structuralizeDirectedBranch(branch) {
    if (branch.activation === 'passive') return clone(branch.requestedEffects);
    const requested = branch.requestedEffects.map(([effectId,params]) => [effectId,clone(params ?? {})]);
    const byFamily = family => requested.filter(([effectId]) => EFFECT_REGISTRY[effectId]?.family === family);
    const nonStructural = requested.filter(([effectId]) => !['release','targeting','check'].includes(EFFECT_REGISTRY[effectId]?.family));
    const immediate=phase.immediateRequestSpecs(nonStructural),oathOnly=phase.isOathFormationOnly(nonStructural);
    const hasHarmful = immediate.some(([effectId,params]) => effectPolarity(effectId,params) === 'harmful');
    const hasBeneficial = immediate.some(([effectId,params]) => effectPolarity(effectId,params) === 'beneficial');
    const inferredPolicy = branch.targetPolicy === 'auto'
      ? (oathOnly?'any':hasHarmful ? 'enemy' : hasBeneficial ? 'self' : 'enemy')
      : branch.targetPolicy;
    const requiredShells=[...new Set(nonStructural.flatMap(([id])=>EFFECT_REGISTRY[id]?.requires??[]))].filter(id=>['release','check'].includes(EFFECT_REGISTRY[id]?.family));
    if (inferredPolicy === 'self') {
      const requiredRelease=requiredShells.filter(id=>EFFECT_REGISTRY[id].family==='release'),release=requiredRelease.length?(byFamily('release').length?byFamily('release'):requiredRelease.map(id=>[id,{}])):[];
      const checks=requiredShells.filter(id=>EFFECT_REGISTRY[id].family==='check').map(id=>requested.find(([effectId])=>effectId===id)??[id,{}]);
      return [...release,['target.self',{}],...checks,...nonStructural];
    }
    const faction = {enemy:'敌方',ally:'友方',any:'任意'}[inferredPolicy] ?? '敌方';
    const releases = byFamily('release');
    const targets = byFamily('targeting');
    const checks = byFamily('check');
    const selfAnchored=targets.some(([id,p])=>id==='target.burst'&&p?.落点==='自身');
    const release = releases.length ? releases : selfAnchored?[]:[[requiredShells.find(id=>EFFECT_REGISTRY[id].family==='release')??(inferredPolicy === 'ally' ? 'release.touch' : 'release.projectile'),{}]];
    const target = targets.length
      ? targets.map(([effectId,params]) => [effectId,{...params,阵营规则:faction}])
      : [['target.single',{阵营规则:faction,选择模式:inferredPolicy === 'ally' ? '自动最低生命' : '主目标'}]];
    const captureOnly=nonStructural.some(([id])=>id==='realm.store')&&!nonStructural.some(([id,p])=>id!=='realm.store'&&effectPolarity(id,p)==='harmful');
    const fieldOnly=nonStructural.some(([id])=>EFFECT_REGISTRY[id]?.allowedContexts?.includes('field')&&!EFFECT_REGISTRY[id].allowedContexts.includes('battle'));
    const check = checks.length || !hasHarmful || captureOnly || oathOnly ? checks : [[fieldOnly?'check.save':'check.soul_attack',fieldOnly?{属性:'意志'}:{}]];
    const beforeCheck=nonStructural.filter(([id])=>EFFECT_REGISTRY[id]?.placement==='action.before-check');
    return [...release,...target,...beforeCheck,...check,...nonStructural.filter(([id])=>EFFECT_REGISTRY[id]?.placement!=='action.before-check')];
  }

  function exchangeBranchSelection(contract) {
    const exchange=globalThis.SoulAbilityExchange??(typeof require==='function'?require('./ability-exchange-core.js'):null);
    const contracts=exchange.normalize(contract.exchangeContracts??[],'skill');
    const boundIds=new Set(contracts.flatMap(item=>item.benefits.branchIds));
    return {boundIds,partial(entries){
      const ids=new Set(entries.map(branch=>branch.id));
      return {...contract,exchangeContracts:contracts.map(item=>({...item,benefits:{...item.benefits,branchIds:item.benefits.branchIds.filter(id=>ids.has(id))}})).filter(item=>item.benefits.branchIds.length)};
    }};
  }

  function compileDirectedGraph(options = {},compareUpgrades=mechanicalOrder) {
    const ageTier = options.ageTier ?? '十万年';
    const mechanismCap = options.mechanismCap ?? '规则';
    const budget = Math.max(1,round(options.budget ?? Number.MAX_SAFE_INTEGER));
    const requested = normalizeRequestedBranches(options.requestedBranches);
    if (!requested.length) throw new Error('定向技能缺少效果分支');
    const candidates = [];
    const droppedBranches = [];
    for (const branch of requested) {
      try {
        const nodes = structuralizeDirectedBranch(branch);
        const conflict = nodes.find(([effectId]) => {
          const template = EFFECT_REGISTRY[effectId];
          return !template || TIER_RANK[ageTier] < TIER_RANK[template.minimumAgeTier] || MECHANISM_RANK[mechanismCap] < MECHANISM_RANK[template.mechanismLevel];
        });
        if (conflict) throw new Error(`年限或机制档不足：${conflict[0]}`);
        const baseCost = nodes.reduce((sum,[effectId,params]) => sum + calculateNodeCost(effectId,params,{activation:branch.activation}),0);
        candidates.push({...branch,nodes,baseCost});
      } catch (error) {
        if (!branch.optional) throw error;
        droppedBranches.push({id:branch.id,label:branch.label,reason:String(error?.message ?? error)});
      }
    }
    const costContract=options.costContract??{},selection=exchangeBranchSelection(costContract);
    if(selection.boundIds.size)abilityValueLedger({...costContract,effectGraph:makeBranchedGraph(candidates)});
    if (!candidates.some(branch=>!branch.optional)) throw new Error('定向技能没有必选效果分支');
    const required = candidates.filter(branch => !branch.optional||selection.boundIds.has(branch.id));
    const priceEntries=entries=>abilityValueLedger({...selection.partial(entries),effectGraph:makeBranchedGraph(entries)}).netValue;
    const requiredCost = priceEntries(required);
    if (requiredCost > budget) throw Object.assign(new Error(`定向技能必选效果超出预算：${requiredCost}/${budget}`),{ringBudget:{required:requiredCost,available:budget}});
    const selected = [...required];
    let minimumSpent = requiredCost;
    for (const branch of candidates.filter(item => item.optional&&!selection.boundIds.has(item.id)).sort((left,right) => right.priority-left.priority || left.order-right.order)) {
      if (priceEntries([...selected,branch]) > budget) {
        droppedBranches.push({id:branch.id,label:branch.label,reason:`共享预算不足：至少还需${branch.baseCost}点，剩余${budget-minimumSpent}点`});
        continue;
      }
      selected.push(branch);
      minimumSpent = priceEntries(selected);
    }
    selected.sort((left,right) => left.order-right.order);
    const styleName = ALLOCATION_STYLES[options.allocationStyle] ? options.allocationStyle : '均衡';
    const targetSpent = Math.max(minimumSpent,Math.floor(budget * ALLOCATION_STYLES[styleName].targetUtilization));
    const activeBranches=selected.filter(branch=>branch.activation!=='passive');
    const activeAdditions=splitValueBudget(Math.max(0,targetSpent-minimumSpent),Math.max(1,activeBranches.length));
    const additions=selected.map(branch=>branch.activation==='passive'?0:activeAdditions[activeBranches.indexOf(branch)]);
    const optimized=optimizeBranchesToBudget(selected,budget,styleName,costContract,0,options.autoAllocate!==false,compareUpgrades);
    const allocated = selected.map((branch,index) => ({
      ...branch,
      allocation:optimized[index]
    }));
    const branchSpecs = allocated.map(branch => ({
      id:branch.id,activation:branch.activation,label:branch.label,optional:branch.optional,priority:branch.priority,targetPolicy:branch.targetPolicy,nodes:branch.allocation.nodes
    }));
    const graph = makeBranchedGraph(branchSpecs,{provenance:clone(options.provenance ?? {source:'directed-skill'})});
    const validation = validateGraph(graph,{ageTier,mechanismCap,budget,costContract});
    if (!validation.pass) throw new Error(`定向技能效果图不合法：${validation.errors.join('；')}`);
    return {
      graph,
      abilityValue:validation.abilityValue,
      spent:validation.spent,
      unallocated:budget-validation.spent,
      selectedBranches:allocated.map(branch => ({id:branch.id,label:branch.label,optional:branch.optional,requestedEffects:clone(branch.requestedEffects),actualEffectIds:branch.allocation.nodes.map(([effectId]) => effectId)})),
      droppedBranches
    };
  }

  function minimumDirectedCost(branches,costContract={}) {
    const all=normalizeRequestedBranches(branches).map(branch=>({...branch,nodes:structuralizeDirectedBranch(branch)})),selection=exchangeBranchSelection(costContract);
    if(selection.boundIds.size)abilityValueLedger({...costContract,effectGraph:makeBranchedGraph(all)});
    const specs=all.filter(branch=>!branch.optional||selection.boundIds.has(branch.id));
    return specs.length?abilityValueLedger({...selection.partial(specs),effectGraph:makeBranchedGraph(specs)}).netValue:0;
  }
  function optimizeBranchesToBudget(branchSpecs,budget,styleName='均衡',contract={},minimumRaw=0,autoAllocate=true,compareUpgrades=mechanicalOrder){
    if(!hasValueBurdens(contract,branchSpecs.flatMap(b=>b.nodes))){
      const minima=branchSpecs.map(b=>b.nodes.reduce((sum,[id,p])=>sum+calculateNodeCost(id,p,{activation:b.activation}),0)),base=minima.reduce((sum,n)=>sum+n,0);
      const active=branchSpecs.map((b,i)=>b.activation!=='passive'?i:-1).filter(i=>i>=0),target=Math.max(base,minimumRaw,Math.floor(budget*(ALLOCATION_STYLES[styleName]?.targetUtilization??.9)));
      const extras=splitValueBudget(Math.max(0,target-base),Math.max(1,active.length));
      return branchSpecs.map((b,i)=>!autoAllocate||b.activation==='passive'?{nodes:clone(b.nodes),report:{finalSpent:minima[i]}}:optimizePlanToBudget(b.nodes,minima[i]+extras[active.indexOf(i)],styleName,calculateNodeCost,0,minima[i],minima[i]+extras[active.indexOf(i)],{},compareUpgrades));
    }
    const specs=clone(branchSpecs),price=()=>abilityValueLedger({...contract,effectGraph:makeBranchedGraph(specs)});
    let ledger=price();const baseSpent=ledger.netValue,target=Math.max(baseSpent,Math.floor(budget*(ALLOCATION_STYLES[styleName]?.targetUtilization??.9)));
    if(baseSpent>budget)throw Object.assign(new Error(`指定能力预算不足：${baseSpent}/${budget}`),{ringBudget:{required:baseSpent,available:budget}});
    let guard=0;
    while(autoAllocate&&guard++<600&&(ledger.netValue<target||ledger.rawActiveValue+ledger.rawPassiveValue<minimumRaw)){
      let best=null;
      for(const [branchIndex,branch] of specs.entries())if(branch.activation!=='passive')for(const candidate of incrementCandidates(branch.nodes)){
        const previous=branch.nodes[candidate.index];branch.nodes[candidate.index]=[candidate.effectId,candidate.params];
        const next=price();branch.nodes[candidate.index]=previous;const delta=next.netValue-ledger.netValue;
        const limit=ledger.rawActiveValue+ledger.rawPassiveValue<minimumRaw?budget:target;
        if(delta>0&&next.netValue<=limit&&(!best||delta<best.delta))best={branchIndex,...candidate,delta,next};
      }
      if(!best)break;
      specs[best.branchIndex].nodes[best.index]=[best.effectId,best.params];ledger=best.next;
    }
    return specs.map(branch=>({nodes:branch.nodes,report:{baseSpent,finalSpent:ledger.netValue,sharedBudget:true}}));
  }

  function applyBranchTargetPolicy(plan, branch, bridges, martialSoul) {
    const policy = branch.targetPolicy;
    if (policy === 'auto') return;
    const targetIndex = plan.nodes.findIndex(([effectId]) => EFFECT_REGISTRY[effectId]?.family === 'targeting');
    if (policy === 'self') {
      const domain=plan.nodes.some(([id])=>id==='domain.field');
      plan.nodes = plan.nodes.filter(([effectId]) => !['release','targeting',...(domain?[]:['check'])].includes(EFFECT_REGISTRY[effectId]?.family));
      plan.nodes.unshift(['target.self',{}]);
      plan.bridgeByEffect['target.self'] = bridges.find(item => bridgeAllowsEffect(item,'target.self'))?.id ?? plan.bridgeId;
      return;
    }
    const factionRule = {enemy:'敌方',ally:'友方',any:'任意'}[policy];
    if (targetIndex < 0) return;
    const [targetId,targetParams] = plan.nodes[targetIndex];
    let nextTargetId = targetId;
    if (targetId === 'target.self') {
      const replacement = bridges.find(item => bridgeAllowsEffect(item,'target.single'));
      if (!replacement) throw new Error(`效果分支${branch.label}没有可用于${policy}目标的选择机制`);
      nextTargetId = 'target.single';
      plan.bridgeByEffect[nextTargetId] = replacement.id;
    }
    plan.nodes[targetIndex] = [nextTargetId,{...clone(targetParams ?? {}),阵营规则:factionRule,选择模式:policy === 'ally' ? '自动最低生命' : '主目标'}];
    if (!plan.nodes.some(([effectId]) => EFFECT_REGISTRY[effectId]?.family === 'release')&&!plan.nodes.some(([id,p])=>id==='target.burst'&&p?.落点==='自身')) {
      const release = bridges.flatMap(item => item.effectIds.map(effectId => ({item,effectId})))
        .filter(entry => EFFECT_REGISTRY[entry.effectId]?.family === 'release' && foundation.MARTIAL_SOUL_CORE.allowsEffect(martialSoul,entry.effectId,{}))
        .sort((left,right) => calculateNodeCost(left.effectId,{})-calculateNodeCost(right.effectId,{}) || mechanicalOrder(left.effectId,right.effectId))[0];
      if (!release) throw new Error(`效果分支${branch.label}没有可用于${policy}目标的释放机制`);
      plan.nodes.unshift([release.effectId,{}]);
      plan.bridgeByEffect[release.effectId] = release.item.id;
    }
  }

  function compileRequestedBranchSkill(context) {
    const {martialSoul,beastProfile,ringOrdinal,options,bridges,tier,compatibility,budget,attributeDraw,sourceAttributes,costForNode} = context;
    const requested = normalizeRequestedBranches(options.requestedBranches);
    if (!requested.length) return null;
    const droppedBranches = [];
    const candidates = [];
    for (const branch of requested) {
      let plan;
      try {
        plan = chooseRingPlan(bridges,beastProfile,{...options,martialSoul,name:branch.label,requestedEffects:branch.requestedEffects,requestedEffectIds:[]});
        if (attributeDraw) {
          plan.nodes = plan.nodes.map(([effectId,params]) => {
            const next = clone(params ?? {});
            if (next.类型 === undefined && Array.isArray(EFFECT_REGISTRY[effectId]?.parameterBounds?.类型)) next.类型 = attributeDraw.name;
            return [effectId,next];
          });
        }
        if (branch.activation === 'passive') plan.nodes = plan.nodes.filter(([id])=>!['release','targeting','check'].includes(EFFECT_REGISTRY[id]?.family));
        else applyBranchTargetPolicy(plan,branch,bridges,martialSoul);
        const ageConflict = plan.nodes.find(([effectId]) => {
          const item = EFFECT_REGISTRY[effectId];
          return !item || TIER_RANK[tier.名称] < TIER_RANK[item.minimumAgeTier] || MECHANISM_RANK[tier.机制上限] < MECHANISM_RANK[item.mechanismLevel];
        });
        if (ageConflict) throw new Error(`年限或机制档不足：${ageConflict[0]}`);
        const baseCost = plan.nodes.reduce((sum,[effectId,params]) => sum + costForNode(effectId,params,{activation:branch.activation}),0);
        candidates.push({...branch,plan,baseCost});
      } catch (error) {
        if (!branch.optional) throw error;
        droppedBranches.push({id:branch.id,label:branch.label,reason:error.message});
      }
    }
    const selection=exchangeBranchSelection(options);
    if(selection.boundIds.size)abilityValueLedger({...options,effectGraph:makeBranchedGraph(candidates.map(branch=>({...branch,nodes:branch.plan.nodes})))});
    const required = candidates.filter(branch=>!branch.optional||selection.boundIds.has(branch.id));
    const priceCandidates=entries=>abilityValueLedger({...selection.partial(entries),effectGraph:makeBranchedGraph(entries.map(branch=>({...branch,nodes:branch.plan.nodes})))}).netValue;
    const requiredCost = required.length?priceCandidates(required):0;
    if (!candidates.some(branch=>!branch.optional) || requiredCost > budget.usable) {
      const error=new Error(requested.some(branch=>branch.activation==='passive')?'常驻防护预算不足':`指定能力预算不足：${requiredCost}/${budget.usable}`);
      if(requiredCost>budget.usable)error.ringBudget={required:requiredCost,available:budget.usable};
      throw error;
    }
    const selected = [...required];
    let minimumSpent = requiredCost;
    for (const candidate of candidates.filter(branch=>branch.optional&&!selection.boundIds.has(branch.id)).sort((left,right) => right.priority-left.priority || left.order-right.order)) {
      if (priceCandidates([...selected,candidate]) > budget.usable) {
        droppedBranches.push({id:candidate.id,label:candidate.label,reason:`共享预算不足：至少还需${candidate.baseCost}点，剩余${budget.usable-minimumSpent}点`});
        continue;
      }
      selected.push(candidate);
      minimumSpent = priceCandidates(selected);
    }
    selected.sort((left,right) => left.order-right.order);
    const styleName = options.allocationStyle ?? '均衡';
    const utilization = ALLOCATION_STYLES[styleName]?.targetUtilization ?? ALLOCATION_STYLES.均衡.targetUtilization;
    const qualityMinimum = Math.min(budget.usable,Math.max(0,Number(options.minimumSkillBudget ?? 0)));
    const targetSpent = Math.max(minimumSpent,qualityMinimum,Math.floor(budget.usable*utilization));
    const activeBranches=selected.filter(branch=>branch.activation!=='passive');
    const activeAdditions=splitValueBudget(Math.max(0,targetSpent-minimumSpent),Math.max(1,activeBranches.length));
    const additions=selected.map(branch=>branch.activation==='passive'?0:activeAdditions[activeBranches.indexOf(branch)]);
    const qualityAdditions = splitValueBudget(Math.max(0,qualityMinimum-minimumSpent),Math.max(1,activeBranches.length));
    // The shared target already applies the allocation style's utilization.
    // Do not discount each branch a second time when filling that allocation.
    const allocations = optimizeBranchesToBudget(selected.map(branch=>({...branch,nodes:branch.plan.nodes})),budget.usable,styleName,options,qualityMinimum,options.autoAllocate!==false);
    const provenanceByBranchEffect = {};
    const provenanceByBranchNode = {};
    const branchSpecs = [];
    const channelByBranchEffect = {};
    const channelByEffect = {};
    for (const [index,branch] of selected.entries()) {
      const nodes = allocations[index].nodes;
      const proofs = {};
      const nodeProofs = [];
      for (const [effectId,params] of nodes) {
        if (!foundation.MARTIAL_SOUL_CORE.allowsEffect(martialSoul,effectId,params)) throw new Error(`武魂没有开放该效果或参数的表达机制：${effectId}`);
        if (!sourceAllowsEffect(bridges,effectId,params)) throw new Error(`魂兽血脉没有购买该效果或参数：${effectId}`);
        const bridgeId = branch.plan.bridgeByEffect?.[effectId] ?? branch.plan.bridgeId;
        const supportingBridge = supportingSourceBridge(bridges,effectId,params,bridgeId);
        if (!supportingBridge || !bridgeAllowsEffect(supportingBridge,effectId)) throw new Error(`效果分支${branch.label}缺少语义桥：${effectId}`);
        proofs[effectId] = {martialSoulEvidence:supportingBridge.soulEvidence,beastEvidence:supportingBridge.beastEvidence,bridgeId:supportingBridge.id,cost:costForNode(effectId,params,{activation:branch.activation})};
        nodeProofs.push(proofs[effectId]);
        const channelId = contextualChannelForEffect(martialSoul,effectId,params,nodes);
        channelByBranchEffect[`${branch.id}:${effectId}`] = channelId;
        channelByEffect[effectId] ??= channelId;
      }
      provenanceByBranchEffect[branch.id] = proofs;
      provenanceByBranchNode[branch.id] = nodeProofs;
      branchSpecs.push({id:branch.id,activation:branch.activation,label:branch.label,optional:branch.optional,priority:branch.priority,targetPolicy:branch.targetPolicy,nodes});
    }
    const graph = makeBranchedGraph(branchSpecs,{provenanceByBranchEffect,provenanceByBranchNode,costForNode});
    for (const branch of graphBranches(graph)) for (const node of branch.nodes) {
      const bridge = supportingSourceBridge(bridges,node.effectId,node.params,node.provenance?.bridgeId);
      if (bridge) node.provenance={martialSoulEvidence:bridge.soulEvidence,beastEvidence:bridge.beastEvidence,bridgeId:bridge.id,cost:costForNode(node.effectId,node.params,{activation:branch.activation})};
    }
    const validation = validateGraph(graph,{ageTier:tier.名称,mechanismCap:tier.机制上限,budget:budget.usable,requireDualProvenance:true,costForNode,costContract:options});
    if (!validation.pass) throw new Error(`多分支魂环魂技编译失败：${validation.errors.join('；')}`);
    const selectedBridgeId = selected[0].plan.bridgeId;
    return abilities.seal({
      id:options.skillId || `ring-skill-${martialSoul.id}-${beastProfile.id}`,
      name:options.name || selected.map(item => item.label).join('·'),
      ownerKind:'魂师',sourceMartialSoulId:martialSoul.id,sourceBeastProfileId:beastProfile.id,
      ringOrdinal:Math.max(1,round(ringOrdinal)),ageYears:tier.年限,ageTier:tier.名称,mechanismCap:tier.机制上限,
      sourceChannelIds:cleanList(Object.values(channelByBranchEffect)),channelByEffect,channelByBranchEffect,
      compatibility:{score:round(compatibility,4),bridgeIds:bridges.map(item=>item.id),selectedBridgeId,residualFallback:false,baseActionFallback:false,attributeDraw:attributeDraw?{id:attributeDraw.id,name:attributeDraw.name,weight:attributeDraw.weight,owned:attributeDraw.owned,sourceAttributes}:null},
      effectGraph:graph,
      budget:{potential:budget.potential,compatibility:budget.compatibility,qualityMultiplier:budget.qualityMultiplier,conversion:budget.conversion,converted:budget.converted,guaranteedMinimum:budget.guaranteedMinimum,available:budget.usable,spent:validation.spent,unallocated:budget.usable-validation.spent,residualFallback:false,baseActionFallback:false},
      allocation:{style:styleName,branchCount:selected.length,requestedBranchCount:requested.length,droppedBranches,branches:selected.map((branch,index)=>({id:branch.id,label:branch.label,minimum:branch.baseCost,allocated:branch.baseCost+additions[index],spent:allocations[index].report.finalSpent,report:allocations[index].report}))},
      nativeCastRank:Math.max(1,Math.min(9,round(ringOrdinal))),minimumCastRank:Math.max(1,Math.min(9,round(ringOrdinal))),
      abilityValue:validation.abilityValue,valueBasis:rawAbilityValue(graph),soulPowerCost:rawAbilityValue(graph).baseSoulPowerCost,soulPowerCostRate:0,outputScale:1,
      ...declaredAbilityCosts(options),
      usageRules:clone(options.usageRules ?? {}),
      immutableHash:''
    });
  }

  function proceduralDefenseBranches(martialSoul, profile, bridges, attributeDraw, budget, options) {
    const variant = Math.max(0,round(options.proceduralVariantIndex ?? 0));
    const formVariant=stableHash(`defense-form:${variant}`)%4;
    if (formVariant > 1 || TIER_RANK[foundation.getAgeTier(profile.年限).名称] < TIER_RANK.千年) return null;
    const specs = ['status.resistance_shift','status.status_guard'].filter(id=>bridges.some(bridge=>bridgeAllowsEffect(bridge,id))).flatMap(id => soulEffectVariants(martialSoul,id,id==='status.resistance_shift'?{类型:attributeDraw?.name ?? profile.属性谱?.主属性?.[0]}:{},bridges).filter(params=>params.模式!=='易伤').map(params=>[id,params]));
    if (!specs.length) return null;
    const start = Math.floor(variant / 4) % specs.length;
    const ordered = [...specs.slice(start),...specs.slice(0,start)];
    if (!ordered.some(([id,params])=>calculateNodeCost(id,params,{activation:'passive'})<=budget)) return null;
    const chosen=[],seen=new Set(); let spent=0;
    const hybrid = formVariant === 1;
    let active;
    if (hybrid) {
      active=chooseRingPlan(bridges,profile,{...options,martialSoul,requestedEffects:[],requestedEffectIds:[],proceduralVariantIndex:variant+2,allowProceduralFallback:true});
      active.nodes=active.nodes.map(([id,params])=>[id,Array.isArray(EFFECT_REGISTRY[id]?.parameterBounds?.类型)&&params.类型===undefined?{...params,类型:attributeDraw?.name ?? '物理'}:params]);
      if(active.nodes.some(([id])=>['status.resistance_shift','status.status_guard'].includes(id))) active=null;
    }
    const activeCost=active?.nodes.reduce((sum,[id,params])=>sum+calculateNodeCost(id,params),0) ?? 0;
    for (const [id,params] of ordered) {
      const key=id+':'+(params.类型 ?? params.防护对象);
      const cost=calculateNodeCost(id,params,{activation:'passive'});
      if (seen.has(key) || spent+cost+activeCost>budget) continue;
      chosen.push([id,params]);seen.add(key);spent+=cost;
      if (chosen.length >= 4 || (spent >= Number(options.minimumSkillBudget ?? 0) && (active || chosen.length >= 2))) break;
    }
    if (!chosen.length || (!active && spent < Number(options.minimumSkillBudget ?? 0))) return null;
    return [{id:'passive',label:'常驻防护',activation:'passive',optional:false,requestedEffects:chosen},...(active?[{id:'active',label:'主动能力',activation:'active',optional:false,requestedEffects:active.nodes}]:[])];
  }

  const MATERIAL_GUARD_ATTRIBUTES = Object.freeze({
    'realm.store':['空间'],'status.bind':['木','空间'],'status.paralysis':['雷','毒蚀'],'status.burn':['火'],
    'status.poison':['毒蚀','生命'],'status.armor_break':['金','土','阳'],'status.stun':['雷','土'],
    'status.fear':['精神'],'status.charm':['精神','淫'],'status.desire':['精神','淫'],'intimate.stimulate':['淫','精神'],'intimate.climax':['淫','精神'],'status.blind':['暗','光'],
    'status.mute':['木','灵魂'],'status.limb_bind':['木','金','空间'],'status.mind_control':['精神'],'status.soul_control':['灵魂'],'status.cognition_shift':['精神'],'status.power_seal':['灵魂'],'status.silence':['灵魂'],'status.sleep':['精神','生命','毒蚀'],'status.slow':['冰','时间','阴'],
    'status.eternal_wound':['生命'],'status.buff':['光','阴','阳'],'status.resistance_shift':['光','阳']
  });
  function channelAllowsParams(channel,effectId,params={}) {
    return foundation.MARTIAL_SOUL_CORE.channelSupportsEffect(channel,effectId,params);
  }
  function materialDefenseVariants(attributes,channels,category='魂导器') {
    const sourceAttributes=cleanList(attributes).map(foundation.canonicalDamageType);
    const records=cleanList(channels).map(value=>Object.values(foundation.MARTIAL_SOUL_CORE.CHANNEL_REGISTRY).find(channel=>channel.id===value||channel.name===value)).filter(Boolean);
    const specs=[];
    for (const type of sourceAttributes) for (const mode of ['抗性','易伤','免疫','吸收']) {
      const params={类型:type,模式:mode,持续回合:1};
      if ((category==='暗器'?mode==='易伤':category==='丹药'?mode!=='易伤':true) && records.some(channel=>channelAllowsParams(channel,'status.resistance_shift',params))) specs.push(['status.resistance_shift',params]);
    }
    if (category!=='暗器') for (const [target,attrs] of Object.entries(MATERIAL_GUARD_ATTRIBUTES)) if (foundation.STATUS_GUARD_TARGETS.includes(target)&&attrs.some(attr=>sourceAttributes.includes(attr))) for (const mode of ['抗性','免疫']) {
      const params={防护对象:target,模式:mode,持续回合:1};
      if(records.some(channel=>channelAllowsParams(channel,'status.status_guard',params))) specs.push(['status.status_guard',params]);
    }
    return specs;
  }

  function compileRingSkill({martialSoul, beastProfile, beastSkills = [], ringOrdinal = 1, options = {}, budgetContext}) {
    martialSoul=boonExpression(martialSoul,beastProfile);
    const tier = foundation.getAgeTier(beastProfile?.年限 ?? 1);
    const resolvedBridges = resolveBridges(martialSoul, beastProfile, beastSkills);
    let bridges = resolvedBridges.length ? resolvedBridges : [residualBridge(martialSoul, beastProfile)];
    const sourceAttributes=cleanList([...(beastProfile?.属性谱?.主属性??[]),...(beastProfile?.属性谱?.副属性??[])]);
    const deterministicRoll=options.attributeRoll===undefined
      ? stableHash(`${options.attributeSeed??`${martialSoul?.id??martialSoul?.名称}:${beastProfile?.id??beastProfile?.名称}`}:${ringOrdinal}:${options.proceduralVariantIndex??0}`)/0x100000000
      : clamp(options.attributeRoll,0,0.999999999);
    const attributeDraw=foundation.MARTIAL_SOUL_CORE.drawSourceAttribute(martialSoul,sourceAttributes,()=>deterministicRoll);
    const compatibility = clamp(options.compatibility ?? (resolvedBridges.length ? Math.min(1, 0.55 + resolvedBridges.reduce((sum, item) => sum + item.efficiency, 0) * 0.18) : 0.2), 0.2, 1);
    const sourceBudget = budgetContext?.sourceBudget??calculateRingBudget(beastProfile, martialSoul, compatibility);
    const allocatedUsable = options.availableBudget === undefined
      ? sourceBudget.usable
      : round(clamp(options.availableBudget, 0, sourceBudget.usable));
    const allocatedPotential = sourceBudget.usable > 0
      ? round(sourceBudget.potential * allocatedUsable / sourceBudget.usable)
      : 0;
    const allocationRatio = sourceBudget.usable > 0 ? allocatedUsable / sourceBudget.usable : 0;
    const budget = {
      ...sourceBudget,
      sourcePotential: sourceBudget.potential,
      sourceUsable: sourceBudget.usable,
      potential: allocatedPotential,
      converted: round(sourceBudget.converted * allocationRatio),
      guaranteedMinimum: round(sourceBudget.guaranteedMinimum * allocationRatio),
      usable: allocatedUsable
    };
    if(options.candidateRole&&resolvedBridges.length&&!options.requestedEffects?.length&&!options.requestedBranches?.length&&!options.requestedEffectIds?.length){
      const variants=[];
      for(const id of [...new Set(bridges.flatMap(b=>b.effectIds))]){
        const definition=EFFECT_REGISTRY[id];
        if(!definition||definition.hitRule?.inline||definition.placement==='action.before-check'||TIER_RANK[tier.名称]<TIER_RANK[definition.minimumAgeTier]||MECHANISM_RANK[tier.机制上限]<MECHANISM_RANK[definition.mechanismLevel])continue;
        for(const params of soulEffectVariants(martialSoul,id,{},bridges))if(diversity.effectRole(id,params)===options.candidateRole){
          const next={...params};if(next.类型===undefined&&definition.parameterBounds?.类型)next.类型=attributeDraw?.name??'物理';
          if(options.allowAdultMechanics!==false||!globalThis.SoulControlCore.adultMechanic({effectId:id,params:next}))variants.push([id,next]);
        }
      }
      if(options.candidateRole==='damage')for(const id of [...new Set(bridges.flatMap(b=>b.effectIds))].filter(id=>EFFECT_REGISTRY[id]?.hitRule?.inline)){
        const definition=EFFECT_REGISTRY[id];if(TIER_RANK[tier.名称]<TIER_RANK[definition.minimumAgeTier]||MECHANISM_RANK[tier.机制上限]<MECHANISM_RANK[definition.mechanismLevel])continue;
        for(const params of soulEffectVariants(martialSoul,id,{},bridges)){
          const nodes=hitInterferenceAttackSpecs(id,params,{variant:options.proceduralVariantIndex,damageType:attributeDraw?.name??'物理',allowsEffect:(effectId,p)=>soulEffectVariants(martialSoul,effectId,p,bridges).length>0});
          if(nodes&&(options.allowAdultMechanics!==false||!globalThis.SoulControlCore.adultMechanic(nodes)))variants.push([id,params,nodes]);
        }
      }
      if(!variants.length)throw new Error('当前来源没有该用途的合法效果');
      const variant=Math.max(0,round(options.proceduralVariantIndex??0));
      const chosen=variants[variant%variants.length];
      options={...options,requestedEffects:chosen[2]??[chosen],allowProceduralFallback:false};
      if(WORLD_CONTROL_VARIANTS[chosen[0]]&&chosen[1].持续方式==='世界分钟'){
        const structure=[['release.touch',{}],['target.single',{阵营规则:'敌方'}],['check.save',{属性:'意志'}]];
        if(structure.every(([id,params])=>soulEffectVariants(martialSoul,id,params,bridges).length))options.requestedEffects=[...structure,chosen];
      }
      if(options.candidateRole==='defense'&&variant%3===0&&['status.resistance_shift','status.status_guard'].includes(chosen[0])){
        const params={...chosen[1]};delete params.持续回合;
        options.requestedEffects=undefined;
        options.requestedBranches=[{activation:'passive',label:'武魂启用时生效',requestedEffects:[[chosen[0],params]]}];
      }
    }else if(options.candidateRole&&options.candidateRole!=='damage'&&!options.requestedEffects?.length&&!options.requestedBranches?.length&&!options.requestedEffectIds?.length)throw new Error('当前来源只支持基础攻击魂技');
    if (!options.candidateRole && !options.requestedBranches?.length && !options.requestedEffects?.length && !options.requestedEffectIds?.length && options.allowProceduralFallback) {
      const generated = proceduralDefenseBranches(martialSoul,beastProfile,bridges,attributeDraw,budget.usable,options);
      if (generated) options={...options,requestedBranches:generated};
    }
    const strictExplicit=options.strictEffects===true&&Boolean(options.requestedEffects?.length||options.requestedEffectIds?.length||options.requestedBranches?.length);
    if (Array.isArray(options.requestedBranches) && options.requestedBranches.length) {
      const branched = compileRequestedBranchSkill({martialSoul,beastProfile,ringOrdinal,options,bridges,tier,compatibility,budget,attributeDraw,sourceAttributes,costForNode:calculateNodeCost});
      if (branched) return branched;
      if(options.exchangeContracts?.length||strictExplicit)throw new Error('指定魂技分支无法完整生成，请调整方案；不会改成其他能力');
      const firstBranch = normalizeRequestedBranches(options.requestedBranches)[0];
      options = {...options,requestedBranches:undefined,requestedEffects:firstBranch.requestedEffects,requestedEffectIds:[],name:options.name || firstBranch.label};
    }
    let plan;
    if (!resolvedBridges.length) {
      if(strictExplicit)throw new Error('魂环来源与武魂之间没有可用的能力桥梁，请更换来源或补足武魂能力方向');
      if(options.exchangeContracts?.length&&(options.requestedEffects?.length||options.requestedEffectIds?.length))throw new Error('指定交换收益没有合法来源交集，不能替换为残响');
      plan = residualRingPlan(martialSoul, beastProfile, bridges[0], {...options,availableBudget:budget.usable});
    } else {
      try {
        plan = chooseRingPlan(bridges, beastProfile, {...options, martialSoul});
      } catch (error) {
        if (strictExplicit||options.allowProceduralFallback === false||options.exchangeContracts?.length&&(options.requestedEffects?.length||options.requestedEffectIds?.length)) throw error;
        const residual = residualBridge(martialSoul, beastProfile);
        bridges = [...bridges, residual];
        plan = residualRingPlan(martialSoul, beastProfile, residual, {...options,availableBudget:budget.usable});
        plan.fallbackReason = error.message;
      }
    }
    if(options.preferAllyTargets&&!plan.baseActionFallback&&plan.nodes.some(([id,p])=>effectPolarity(id,p)==='beneficial')&&!plan.nodes.some(([id,p])=>effectPolarity(id,p)==='harmful')){
      applyBranchTargetPolicy(plan,{targetPolicy:'ally',label:'辅助对象'},bridges,martialSoul);
    }
    if(!plan.residualFallback&&attributeDraw){
      plan.nodes=plan.nodes.map(([effectId,params])=>{
        const next=clone(params??{});
        if(next.类型===undefined&&Array.isArray(EFFECT_REGISTRY[effectId]?.parameterBounds?.类型))next.类型=attributeDraw.name;
        return [effectId,next];
      });
    }
    // 年限档与机制档必须真实约束最终方案；玩家点名的效果不会因为被自动补齐而越过门槛。
    const tierName=tier?.名称??'十年',tierCap=tier?.机制上限??'基础';
    const overTier=plan.nodes.filter(([effectId])=>TIER_RANK[tierName]<TIER_RANK[EFFECT_REGISTRY[effectId]?.minimumAgeTier??'十年']||MECHANISM_RANK[tierCap]<MECHANISM_RANK[EFFECT_REGISTRY[effectId]?.mechanismLevel??'基础']);
    if(overTier.length){
      const explicit=Boolean(options.requestedEffects?.length||options.requestedBranches?.length||options.requestedEffectIds?.length||strictExplicit);
      if(explicit)throw Error(`魂技效果超出当前年限档（${tierName}）：${overTier.map(([effectId])=>EFFECT_REGISTRY[effectId]?.displayName??effectId).join('、')}`);
      plan.nodes=plan.nodes.filter(([effectId])=>!overTier.some(([id])=>id===effectId));
    }
    // 低契合保底复用武魂已经购买的基础动作外壳，不再次购买释放、目标或检定机制；
    // 可用预算足够时必须购买最低伤害载荷，只有连最低伤害都买不起时才退回1点残响。
    const costForNode=(effectId,params)=>plan.freeBaseActionShell&&effectId!=='payload.damage'?0:round(calculateNodeCost(effectId,params));
    plan.bridgeByEffect ??= {};
    const planFamilies = () => new Set(plan.nodes.map(([effectId]) => EFFECT_REGISTRY[effectId]?.family));
    if (!planFamilies().has('targeting')&&!planFamilies().has('reaction')) {
      const targetBridge = bridges.find(item => item.effectIds.some(id => EFFECT_REGISTRY[id]?.family === 'targeting' && foundation.MARTIAL_SOUL_CORE.allowsEffect(martialSoul, id)));
      const targetId = targetBridge?.effectIds.find(id => EFFECT_REGISTRY[id]?.family === 'targeting' && foundation.MARTIAL_SOUL_CORE.allowsEffect(martialSoul, id));
      if(!targetId)throw new Error('武魂与魂兽来源无法共同提供目标机制');
      const releaseIndex = plan.nodes.findIndex(([id]) => EFFECT_REGISTRY[id]?.family === 'release');
      plan.nodes.splice(releaseIndex < 0 ? 0 : releaseIndex + 1, 0, [targetId, {}]);
      plan.bridgeByEffect[targetId] = targetBridge?.id ?? plan.bridgeId;
    }
    if (!planFamilies().has('release') && !plan.nodes.some(([id,p]) => ['target.self','target.aura'].includes(id)||id==='target.burst'&&p?.落点==='自身') && !planFamilies().has('reaction')) {
      const releaseBridge = bridges.find(item => item.effectIds.some(id => EFFECT_REGISTRY[id]?.family === 'release' && foundation.MARTIAL_SOUL_CORE.allowsEffect(martialSoul, id)));
      const releaseId = releaseBridge?.effectIds.find(id => EFFECT_REGISTRY[id]?.family === 'release' && foundation.MARTIAL_SOUL_CORE.allowsEffect(martialSoul, id));
      if(!releaseId)throw new Error('武魂与魂兽来源无法共同提供释放机制');
      plan.nodes.unshift([releaseId, {}]);
      plan.bridgeByEffect[releaseId] = releaseBridge?.id ?? plan.bridgeId;
    }
    const executableFamilies = new Set(['payload', 'status', 'movement', 'zone', 'domain', 'summon', 'transform', 'reaction','contract','trigger','modifier']);
    const ageAllows = effectId => {
      const item = EFFECT_REGISTRY[effectId];
      return item && TIER_RANK[tier.名称] >= TIER_RANK[item.minimumAgeTier] && MECHANISM_RANK[tier.机制上限] >= MECHANISM_RANK[item.mechanismLevel];
    };
    if (![...planFamilies()].some(family => executableFamilies.has(family))) {
      const payloadCandidate = bridges.flatMap(bridge => bridge.effectIds.map(effectId => ({
        bridge,
        effectId,
        params: concretizeSoulEffectParams(martialSoul,effectId,{},bridges)
      }))).find(item => executableFamilies.has(EFFECT_REGISTRY[item.effectId]?.family) && !EFFECT_REGISTRY[item.effectId]?.hitRule?.inline && EFFECT_REGISTRY[item.effectId]?.placement!=='action.before-check' && ageAllows(item.effectId) && item.params);
      if (!payloadCandidate) throw new Error('武魂与魂兽的交集没有当前年限可执行载荷');
      plan.nodes.push([payloadCandidate.effectId,payloadCandidate.params]);
      plan.bridgeByEffect[payloadCandidate.effectId] = payloadCandidate.bridge.id;
    }
    const planCost = () => {const graph=makeLinearGraph(plan.nodes),basis=rawAbilityValue(graph);return priceAbilityWithBasis({...options,effectGraph:graph},{baselineCredit:basis.rawActiveValue-plan.nodes.reduce((sum,[id,p])=>sum+costForNode(id,p),0)-phase.graphValueSurcharge(graph).reduce((sum,row)=>sum+row.rawValue,0)},graph,basis).netValue;};
    const requiredMechanics=strictExplicit||plan.nodes.some(([id])=>['contract.oath','trigger.contract','modifier.world_duration','payload.death'].includes(id))||Boolean(options.exchangeContracts?.length&&(options.requestedEffects?.length||options.requestedEffectIds?.length));
    if(strictExplicit){
      const conflict=plan.nodes.find(([id])=>!ageAllows(id));
      if(conflict){const definition=EFFECT_REGISTRY[conflict[0]];throw new Error(`「${definition?.displayName??conflict[0]}」需要至少${definition?.minimumAgeTier??'更高年限'}魂环及${definition?.mechanismLevel??'对应'}机制；当前${beastProfile.年限}年（${tier.名称}），不能更换成攻击代替`);}
      if(planCost()>budget.usable)throw Object.assign(new Error(`这套指定效果至少需要${planCost()}点，当前魂环可用${budget.usable}点；可缩短持续时间、减少效果或换用更高年限魂环`),{ringBudget:{required:planCost(),available:budget.usable}});
    }
    if(requiredMechanics&&plan.nodes.some(([id])=>!ageAllows(id)))throw new Error('指定完整机制超出当前年限，不能删减或替换');
    if(requiredMechanics&&planCost()>budget.usable)throw new Error(`指定完整机制至少需要${planCost()}点，当前魂环可用${budget.usable}点，不能删减或替换`);
    while (!requiredMechanics && planCost() > budget.usable) {
      const executableIndexes = plan.nodes.map(([id], index) => executableFamilies.has(EFFECT_REGISTRY[id]?.family) ? index : -1).filter(index => index >= 0);
      if (executableIndexes.length <= 1) break;
      const removable = executableIndexes.sort((left, right) => costForNode(plan.nodes[right][0], plan.nodes[right][1]) - costForNode(plan.nodes[left][0], plan.nodes[left][1]))[0];
      plan.nodes.splice(removable, 1);
    }
    const hasAgeConflict = () => plan.nodes.some(([effectId]) => !ageAllows(effectId));
    if ((planCost() > budget.usable || hasAgeConflict()) && options.requestedEffects?.some(entry=>['status.resistance_shift','status.status_guard'].includes(Array.isArray(entry)?entry[0]:entry?.effectId))) throw new Error('指定防护超出当前预算或年限，不能更换为其他模式');
    if (planCost() > budget.usable || hasAgeConflict()) {
      const collectCandidates = predicate => {
        const byEffect = new Map();
        for (const bridge of bridges) {
          for (const effectId of bridge.effectIds) {
            if (!predicate(effectId) || EFFECT_REGISTRY[effectId]?.hitRule?.inline || EFFECT_REGISTRY[effectId]?.placement==='action.before-check' || !ageAllows(effectId)) continue;
            for (const raw of soulEffectVariants(martialSoul,effectId,effectId === 'check.save' ? {属性:'意志'} : {},[bridge])) {
              const params={...raw};if(params.类型===undefined&&Array.isArray(EFFECT_REGISTRY[effectId]?.parameterBounds?.类型))params.类型=attributeDraw?.name ?? '物理';
              const key=effectId+':'+JSON.stringify(params);
              if(!byEffect.has(key))byEffect.set(key,{effectId,bridgeId:bridge.id,params,cost:costForNode(effectId,params)});
            }
          }
        }
        return [...byEffect.values()].sort((left, right) => left.cost - right.cost || mechanicalOrder(left.effectId,right.effectId));
      };
      const payloadCandidates = collectCandidates(id => {
        const family = EFFECT_REGISTRY[id]?.family;
        return executableFamilies.has(family) && family !== 'domain';
      });
      const targetCandidates = collectCandidates(id => EFFECT_REGISTRY[id]?.family === 'targeting');
      const releaseCandidates = collectCandidates(id => EFFECT_REGISTRY[id]?.family === 'release');
      const checkCandidates = collectCandidates(id => EFFECT_REGISTRY[id]?.family === 'check');
      const fallbackPlans = [];
      for (const payload of payloadCandidates) {
        if (EFFECT_REGISTRY[payload.effectId]?.family === 'reaction') {
          fallbackPlans.push({nodes: [[payload.effectId, payload.params]], bridgeByEffect: {[payload.effectId]: payload.bridgeId}, bridgeId: payload.bridgeId, cost: payload.cost});
          continue;
        }
        const harmful = effectPolarity(payload.effectId,payload.params) === 'harmful';
        for (const target of targetCandidates) {
          if (harmful && target.effectId === 'target.self') continue;
          const releaseOptions = ['target.self','target.aura'].includes(target.effectId) ? [null] : releaseCandidates;
          const checkOptions = harmful ? checkCandidates : [null];
          for (const release of releaseOptions) for (const check of checkOptions) {
            if (!releaseOptions.length || !checkOptions.length) continue;
            const entries = [release, target, check, payload].filter(Boolean);
            const nodes = entries.map(entry => [entry.effectId, entry.params]);
            fallbackPlans.push({
              nodes,
              bridgeByEffect: Object.fromEntries(entries.map(entry => [entry.effectId, entry.bridgeId])),
              bridgeId: payload.bridgeId,
              cost: entries.reduce((sum, entry) => sum + entry.cost, 0)
            });
          }
        }
      }
      fallbackPlans.sort((left, right) => left.cost - right.cost || mechanicalOrder(JSON.stringify(left.nodes),JSON.stringify(right.nodes)));
      const fallback = fallbackPlans.find(item => item.cost <= budget.usable);
      if (!fallback) {
        const residual = residualBridge(martialSoul, beastProfile);
        bridges = [...bridges, residual];
        plan = residualRingPlan(martialSoul, beastProfile, residual, {...options,availableBudget:budget.usable});
      } else {
        plan.nodes = fallback.nodes;
        plan.bridgeByEffect = fallback.bridgeByEffect;
        plan.bridgeId = fallback.bridgeId;
        plan.name = `${plan.name}·雏形`;
      }
    }
    const explicitProposal = (Array.isArray(options.requestedEffects) && options.requestedEffects.length) || cleanList(options.requestedEffectIds).length;
    const mechanismsAdded = explicitProposal || plan.baseActionFallback || options.autoAllocate === false ? [] : augmentPlanForStyle(plan, tier.名称, budget.usable, options.allocationStyle ?? '均衡', martialSoul, costForNode, bridges);
    const allocation = plan.residualFallback
      ? {nodes: plan.nodes, report: {style: '保底残响', disabled: true, residualFallback: true,baseActionFallback:true}}
      : options.autoAllocate === false
      ? {nodes: plan.nodes, report: {style: options.allocationStyle ?? '均衡', disabled: true}}
      : optimizePlanToBudget(plan.nodes, budget.usable, options.allocationStyle ?? '均衡', costForNode, options.optimizationVariantIndex ?? 0, options.minimumSkillBudget ?? 0,null,options);
    plan.nodes = allocation.nodes;
    allocation.report.mechanismsAdded = mechanismsAdded;
    const bridge = bridges.find(item => item.id === plan.bridgeId);
    if (!bridge) throw new Error(`魂技计划引用不存在语义桥：${plan.bridgeId}`);
    const baseActionFallback=validateBaseActionFallbackPlan(plan,martialSoul);
    const provenanceByNode=[];
    for (const [effectId,params] of plan.nodes) {
      const boon=talents.BOON_SOURCES[martialSoul?.扩展?.boonExpressionSource];
      if(boon&&effectId==='payload.damage'&&!boon.attributes.includes(params.类型))throw new Error('恩赐魂技不能改变来源属性');
      if(!baseActionFallback&&!foundation.MARTIAL_SOUL_CORE.allowsEffect(martialSoul,effectId,params))throw new Error(`武魂没有开放该效果或参数的表达机制：${effectId}`);
      if(!baseActionFallback&&!sourceAllowsEffect(bridges,effectId,params))throw new Error(`魂兽血脉没有购买该效果或参数：${effectId}`);
      const supportingBridge = supportingSourceBridge(bridges,effectId,params,plan.bridgeByEffect?.[effectId] ?? plan.bridgeId);
      if (effectId === 'status.status_guard' && supportingBridge) plan.bridgeByEffect[effectId] = supportingBridge.id;
      if (!bridgeAllowsEffect(supportingBridge, effectId)) throw new Error(`语义桥${supportingBridge?.id ?? plan.bridgeId}不允许效果：${effectId}`);
      provenanceByNode.push({martialSoulEvidence:supportingBridge.soulEvidence,beastEvidence:supportingBridge.beastEvidence,bridgeId:supportingBridge.id,cost:costForNode(effectId,params)});
    }
    const provenanceByEffect = Object.fromEntries(plan.nodes.map(([effectId, params]) => [effectId, {
      martialSoulEvidence: (bridges.find(item => item.id === (plan.bridgeByEffect?.[effectId] ?? plan.bridgeId)) ?? bridge).soulEvidence,
      beastEvidence: (bridges.find(item => item.id === (plan.bridgeByEffect?.[effectId] ?? plan.bridgeId)) ?? bridge).beastEvidence,
      bridgeId: (bridges.find(item => item.id === (plan.bridgeByEffect?.[effectId] ?? plan.bridgeId)) ?? bridge).id,
      cost: costForNode(effectId, params)
    }]));
    const graph = makeLinearGraph(plan.nodes, {provenanceByEffect,provenanceByNode,costForNode});
    const validation = validateGraph(graph, {ageTier: tier.名称, mechanismCap: tier.机制上限, budget: budget.usable, requireDualProvenance: true,costForNode,costContract:options});
    if (!validation.pass) throw new Error(`魂环魂技编译失败：${validation.errors.join('；')}`);
    const channelByEffect=Object.fromEntries(plan.nodes.map(([effectId,params])=>[effectId,baseActionFallback?'':contextualChannelForEffect(martialSoul,effectId,params,plan.nodes)]));
    const sourceChannelIds=cleanList(Object.values(channelByEffect));
    return abilities.seal({
      id: options.skillId || `ring-skill-${martialSoul.id}-${beastProfile.id}`,
      name: plan.name,
      ownerKind: '魂师',
      sourceMartialSoulId: martialSoul.id,
      sourceBeastProfileId: beastProfile.id,
      ringOrdinal: Math.max(1, round(ringOrdinal)),
      ageYears: tier.年限,
      ageTier: tier.名称,
      mechanismCap: tier.机制上限,
      sourceChannelIds,
      channelByEffect,
      compatibility: {score: round(compatibility, 4), bridgeIds: bridges.map(item => item.id), selectedBridgeId: bridge.id, residualFallback: Boolean(plan.residualFallback), baseActionFallback, attributeDraw:attributeDraw?{id:attributeDraw.id,name:attributeDraw.name,weight:attributeDraw.weight,owned:attributeDraw.owned,sourceAttributes}:null},
      effectGraph: graph,
      budget: {potential: budget.potential, compatibility: budget.compatibility, qualityMultiplier: budget.qualityMultiplier, conversion: budget.conversion, converted: budget.converted, guaranteedMinimum: budget.guaranteedMinimum, available: budget.usable, spent: validation.spent, unallocated: budget.usable - validation.spent, residualFallback: Boolean(plan.residualFallback), baseActionFallback},
      allocation: allocation.report,
      nativeCastRank: Math.max(1, Math.min(9, round(ringOrdinal))),
      minimumCastRank: Math.max(1, Math.min(9, round(ringOrdinal))),
      abilityValue:validation.abilityValue,valueBasis:rawAbilityValue(graph),soulPowerCost:rawAbilityValue(graph).baseSoulPowerCost,
      ...declaredAbilityCosts(options),
      soulPowerCostRate: 0,
      outputScale: 1,
      usageRules: clone(options.usageRules ?? {}),
      immutableHash:''
    });
  }


  function fixedRealmPolicy(soul){return (soul?.扩展?.结构化武魂??soul?.结构化武魂)?.mechanicalHooks?.find(h=>h.type==='independentRealm'&&h.sourceId==='trait.independent-realm'&&h.parameter==='nine-beauties-v1')??null;}
  function compileFixedRealmRing({martialSoul,beastProfile,beastSkills=[],ringOrdinal=1,options={}}){
    if(!fixedRealmPolicy(martialSoul)||!Number.isInteger(ringOrdinal)||ringOrdinal<1||ringOrdinal>9)throw Error('没有取得对应席位召唤能力');
    const bridges=resolveBridges(martialSoul,beastProfile,beastSkills),ratio=clamp(options.compatibility??(bridges.length?Math.min(1,.55+bridges.reduce((n,b)=>n+b.efficiency,0)*.18):.2),.2,1),budget=calculateRingBudget(beastProfile,martialSoul,ratio);
    const graph=makeLinearGraph([['target.self',{}],['realm.deploy',{席位:ringOrdinal}]]),basis=rawAbilityValue(graph),fee=basis.baseSoulPowerCost;
    const skill={id:options.skillId??`${options.skillIdPrefix??'realm-ring-'+martialSoul.id+'-'+beastProfile.id+'-'+ringOrdinal}-1`,...globalThis.SoulNineCourts.courts[ringOrdinal-1],namingSource:'preset',sourceKind:'soul-ring',sourceMartialSoulId:martialSoul.id,sourceBeastProfileId:beastProfile.id,ringOrdinal,ageYears:beastProfile.年限,ageTier:foundation.getAgeTier(beastProfile.年限).名称,mechanismCap:foundation.getAgeTier(beastProfile.年限).机制上限,effectGraph:graph,requirements:['gesture','martial-soul','soul-power'],nativeCastRank:ringOrdinal,minimumCastRank:ringOrdinal,compatibility:{ratio,bridgeIds:[],residualFallback:false,baseActionFallback:false},valueBasis:basis,soulPowerCost:fee,soulPowerCostRate:0,outputScale:1,usageRules:{},castModes:[{id:'body',name:'真身出战',resourceCosts:fee<4?[{kind:'soulPower',amount:4-fee}]:[]},{id:'projection',name:'强制投影',resourceCosts:fee<8?[{kind:'soulPower',amount:8-fee}]:[]}],defaultCastMode:'projection'};
    const value=abilityValueLedger(skill),spent=value.netValue;skill.abilityValue=value;skill.budget={...budget,available:budget.usable,spent,unallocated:budget.usable-spent,residualFallback:false,baseActionFallback:false};skill.intentIndex=0;
    const checked=validateGraph(graph,{ageTier:foundation.getAgeTier(beastProfile.年限).名称,mechanismCap:foundation.getAgeTier(beastProfile.年限).机制上限,budget:budget.usable,costContract:skill});if(!checked.pass)throw Error(checked.errors.join('；'));abilities.seal(skill);
    return {skillCount:1,skillLimit:1,minimumSkillBudget:0,skills:[skill],compatibility:clone(skill.compatibility),budget:{...budget,available:budget.usable,allocations:[budget.usable],spent,unallocated:budget.usable-spent,residualFallback:false,baseActionFallback:false}};
  }
  function fixedRealmSkillMatches(skill,soul,profile){try{const expected=compileFixedRealmRing({martialSoul:soul,beastProfile:profile,ringOrdinal:skill.nativeCastRank,options:{skillId:skill.id,compatibility:skill.compatibility.ratio}}).skills[0];return abilities.verify(skill).pass&&Object.keys(abilities.mechanics(expected)).every(key=>abilities.hash(abilities.mechanics(skill)[key])===abilities.hash(abilities.mechanics(expected)[key]))&&abilities.hash(skill.budget)===abilities.hash(expected.budget);}catch{return false;}}
  function compileRingSkills({martialSoul, beastProfile, beastSkills = [], ringOrdinal = 1, options = {}, budgetContext}) {
    if(fixedRealmPolicy(martialSoul))return compileFixedRealmRing({martialSoul,beastProfile,beastSkills,ringOrdinal,options});
    martialSoul=boonExpression(martialSoul,beastProfile);
    const bridges=resolveBridges(martialSoul,beastProfile,beastSkills);
    const compatibility=clamp(options.compatibility ?? (bridges.length?Math.min(1,0.55+bridges.reduce((sum,b)=>sum+b.efficiency,0)*0.18):0.2),0.2,1);
    const sourceBudget=budgetContext?.sourceBudget??calculateRingBudget(beastProfile,martialSoul,compatibility);
    const expressionGrowth=budgetContext?.expressionGrowth??null,expressionCost=expressionGrowth?.cost??0,skillAvailable=sourceBudget.usable-expressionCost;
    if(skillAvailable<0)throw Error('魂环力量不足以购买所需能力方向');
    const floor=ringSkillMinimumBudget(beastProfile),limit=ringSkillLimit(beastProfile);
    const requestedSkills=Array.isArray(options.requestedSkills)?options.requestedSkills:[];
    const explicit=spec=>Boolean(spec?.requestedEffects?.length || spec?.requestedBranches?.length || spec?.requestedEffectIds?.length);
    const firstRequest=explicit(options)?{requestedEffects:options.requestedEffects,requestedBranches:options.requestedBranches,requestedEffectIds:options.requestedEffectIds,name:options.name}:null;
    const requiredCount=requestedSkills.some(explicit)?requestedSkills.length:firstRequest?1:0;
    if(requiredCount>limit)throw new Error('明示魂技数量超过魂环年限上限');
    const affordable=floor?Math.floor(skillAvailable/floor):1;
    const maxCount=Math.min(limit,affordable,options.preferredSkillCount ?? limit);
    if(floor&&requiredCount>affordable)throw Object.assign(new Error('整环预算不足以容纳完整魂技'),{ringBudget:{required:requiredCount*floor,available:skillAvailable}});
    const shared={...options};
    for(const key of ['requestedSkills','requestedEffects','requestedBranches','requestedEffectIds','skillId','skillIdPrefix',
      'proceduralVariantOffset','proceduralVariantStride','optimizationVariantOffset','packageAllocationWeights','preferredSkillCount'])delete shared[key];
    const offset=Math.max(0,round(options.proceduralVariantOffset ?? 0)),stride=Math.max(1,round(options.proceduralVariantStride ?? 1));
    const prefix=String(options.skillIdPrefix || 'ring-skill-'+martialSoul.id+'-'+beastProfile.id+'-'+ringOrdinal);
    let lastError;
    const choiceFailures = new Set();
    if(floor&&skillAvailable<floor)choiceFailures.add('budget');
    for(let count=maxCount;count>=Math.max(1,requiredCount);count--){
      const attempts=floor && !requiredCount ? 8 : 1;
      for(let attempt=0;attempt<attempts;attempt++){
        try{
          const specs=Array.from({length:count},(_,index)=>{
            const request=requestedSkills[index] ?? (index===0&&firstRequest?firstRequest:{});
            return {...shared,...request,compatibility,
              candidateRole:index===0?options.candidateRole:options.candidateSecondaryRoles?.[(index-1)%options.candidateSecondaryRoles.length]??options.candidateRole,
              proceduralVariantIndex:offset+index*stride+attempt*count,
              optimizationVariantIndex:Math.max(0,round(options.optimizationVariantOffset ?? 0))+index*stride,
              minimumSkillBudget:floor,
              allowProceduralFallback:explicit(request)?Boolean(request.allowProceduralFallback ?? options.allowProceduralFallback):true,
              skillId:request.skillId || prefix+'-'+(index+1),
              name:request.name || (count>1?foundation.getAgeTier(beastProfile.年限).名称+'魂技·'+(index+1):options.name)};
          });
          let allocations;
          if(!floor && count===1)allocations=[skillAvailable];
          else{
            const prototypes=specs.map(spec=>compileRingSkill({martialSoul,beastProfile,beastSkills,ringOrdinal,budgetContext:{sourceBudget},
              options:{...spec,availableBudget:skillAvailable,autoAllocate:false}}));
            const minimums=prototypes.map(skill=>Math.max(floor,skill.budget.spent));
            const minimumTotal=minimums.reduce((sum,value)=>sum+value,0);
            if(minimumTotal>skillAvailable)throw Object.assign(new Error('整环预算不足以容纳完整魂技'),{ringBudget:{required:minimumTotal,available:skillAvailable}});
            const weights=options.packageAllocationWeights?.slice(0,count) ?? Array(count).fill(1);
            const extras=splitWeightedValueBudget(skillAvailable-minimumTotal,weights);
            allocations=minimums.map((minimum,index)=>minimum+extras[index]);
          }
          const skills=specs.map((spec,index)=>({...compileRingSkill({martialSoul,beastProfile,beastSkills,ringOrdinal,budgetContext:{sourceBudget},
            options:{...spec,availableBudget:allocations[index]}}),intentIndex:index}));
          const spent=skills.reduce((sum,skill)=>sum+skill.budget.spent,0);
          const compiled={skillCount:skills.length,skillLimit:limit,minimumSkillBudget:floor,skills,
            compatibility:clone(skills[0].compatibility),
            ...(expressionGrowth?{expressionGrowth:clone(expressionGrowth)}:{}),
            budget:{...sourceBudget,available:sourceBudget.usable,allocations,spent,unallocated:skillAvailable-spent,...(expressionGrowth?{expressionCost,skillAvailable,totalSpent:expressionCost+spent}:{}),
              residualFallback:skills.some(skill=>skill.compatibility.residualFallback),
              baseActionFallback:skills.some(skill=>skill.compatibility.baseActionFallback)}};
          const quality=validateRingSkillPackage(compiled,beastProfile,sourceBudget);
          if(!quality.pass){
            const error=new Error(quality.errors.join('；'));
            if(skills.some(skill=>skill.budget.spent<floor))error.choiceFailures=['quality-floor'];
            throw error;
          }
          if(options.candidateRole){
            const profile=diversity.strongProfile(compiled,calculateNodeCost);
            if(!profile.valid||profile.main!==options.candidateRole)throw new Error('方案未保持明确的主要用途');
            if(profile.skills.some((skill,index)=>skill.main!==specs[index].candidateRole))throw new Error('技能优化改变了指定用途');
          }
          return compiled;
        }catch(error){
          lastError=error;
          for(const reason of error.choiceFailures??[])choiceFailures.add(reason);
          if(/来源链.*补齐|武魂表达机制不允许|没有该用途的合法效果/u.test(error.message))choiceFailures.add('expression');
          if(/整环预算不足|分配不足/u.test(error.message))choiceFailures.add('budget');
        }
      }
    }
    const error=new Error('当前来源未形成达到年限质量要求的完整魂技'+(lastError?'：'+lastError.message:''));
    error.choiceFailures=[...choiceFailures];
    if(lastError){
      error.cause=lastError;
      if(lastError.ringBudget)error.ringBudget=clone(lastError.ringBudget);
    }
    throw error;
  }

  // Authoring preflight only. Existing frozen contracts keep their original
  // execution semantics; a new approach must not promise to satisfy its own
  // pre-cast contact prerequisite after the prerequisite has been checked.
  function designActionTimingErrors(skill){
    if(!(skill?.effectGraph?.nodes??[]).some(node=>node.effectId==='move.approach'))return [];
    const modes=[...(skill.requirements??[]),...(skill.castModes??[]).flatMap(mode=>mode.requirements??[])];
    return modes.includes('contact')?['触及追击不能同时把接触目标设为施放前提；接触前提在追击之前检查。从非接触位置发动时，请用触及释放表示追击后的接触，并重新核对条件与费用。']:[];
  }

  function ringSkillPackageFingerprint(compiled) {
    const normalized = (compiled?.skills ?? []).map(skill => {
      const graph = skill?.effectGraph ?? {};
      const nodes = (graph.nodes ?? []).map(node => ({
        effectId: node.effectId,
        params: clone(node.params ?? {}),
        branchIndex: (graph.branches??[]).findIndex(branch=>branch.id===node.branchId)
      }));
      const branches = (graph.branches ?? []).map(branch => ({
        optional: Boolean(branch.optional),
        priority: Number(branch.priority ?? 0),
        activation: branch.activation ?? 'active',
        targetPolicy: branch.targetPolicy ?? 'auto',
        nodeEffects: (branch.nodeIds ?? []).map(nodeId => graph.nodes?.find(node => node.id === nodeId)?.effectId ?? '')
      }));
      return {
        nodes,
        branches,
        soulPowerCost: Number(skill.soulPowerCost ?? 0),
        nativeCastRank: Number(skill.nativeCastRank ?? 0),
        spent: Number(skill.budget?.spent ?? 0),
        valueBasis:skill.valueBasis?{version:skill.valueBasis.version,rawActiveValue:skill.valueBasis.rawActiveValue,rawPassiveValue:skill.valueBasis.rawPassiveValue,baseSoulPowerCost:skill.valueBasis.baseSoulPowerCost}:null,
        abilityValue:skill.abilityValue?{version:skill.abilityValue.version,baselineCredit:skill.abilityValue.baselineCredit,pricedModeId:skill.abilityValue.pricedModeId,netValue:skill.abilityValue.netValue,reduction:skill.abilityValue.reduction}:null,
        contract:Object.fromEntries(['exchangeContracts','requirements','resourceCosts','maintenanceCosts','castModes','defaultCastMode','usageRules','usageKey','cooldownTurns','nativeCastRank','minimumCastRank','outputScale','soulPowerCostRate','origin','targetConditions','effectConditions'].filter(key=>abilities.mechanics(skill)[key]!==undefined).map(key=>[key,abilities.mechanics(skill)[key]]))
      };
    });
    normalized.sort((a,b)=>mechanicalOrder(JSON.stringify(a),JSON.stringify(b)));
    return stableHash(JSON.stringify({skills:normalized,expressionGrowth:compiled.expressionGrowth??null})).toString(16).padStart(8, '0');
  }

  function ringCandidateRoles(martialSoul,beastProfile,beastSkills=[]){return [...new Set(resolveBridges(martialSoul,beastProfile,beastSkills).flatMap(bridge=>bridge.effectIds.flatMap(id=>soulEffectVariants(martialSoul,id,{},[bridge]).map(params=>diversity.effectRole(id,params)))).filter(role=>role&&role!=='shell'))];}
  function compileRingSkillChoices({martialSoul, beastProfile, beastSkills = [], ringOrdinal = 1, choiceCount = 2, options = {}}) {
    if(fixedRealmPolicy(martialSoul)){const compiled=compileFixedRealmRing({martialSoul,beastProfile,beastSkills,ringOrdinal,options}),fingerprint=ringSkillPackageFingerprint(compiled),candidate={...compiled,id:`realm-ring-choice-${martialSoul.id}-${beastProfile.id}-${ringOrdinal}-${fingerprint}`,index:0,fingerprint,title:compiled.skills[0].name,description:compiled.skills[0].description};return {choiceCount:1,distinctChoiceCount:1,candidates:[candidate],mechanicsHash:stableHash(JSON.stringify([fingerprint])).toString(16).padStart(8,'0'),sourceBudget:{...calculateRingBudget(beastProfile,martialSoul,compiled.compatibility.ratio),available:compiled.budget.usable},presetFailures:[],availability:{requestedCount:1,actualCount:1,summary:'对应席位的召唤魂技',details:['魂环年限增强对应人物，召唤方式由当前服从和人数决定。']}};}
    martialSoul=boonExpression(martialSoul,beastProfile);
    const sourceBridges=resolveBridges(martialSoul,beastProfile,beastSkills);
    const frozenCompatibility=clamp(options.compatibility??(sourceBridges.length?Math.min(1,0.55+sourceBridges.reduce((n,b)=>n+b.efficiency,0)*0.18):0.2),0.2,1);
    options={...options,compatibility:frozenCompatibility};
    const requestedCount = Math.max(2, Math.min(4, round(choiceCount)));
    const styles = ['均衡', '威力集中', '机制丰富', '精准塑形'];
    const pool = [];
    const fingerprints = new Set(options.excludedFingerprints ?? []);
    const seedOffset = stableHash(String(options.choiceSeed ?? `${martialSoul?.id}:${beastProfile?.id}:${ringOrdinal}`)) % 97;
    const catalogue=globalThis.SoulPresetCatalog;
    const directed=options.requestedEffects?.length||options.requestedBranches?.length||options.requestedEffectIds?.length||options.requestedSkills?.length||options.exchangeContracts?.length||options.resourceCosts?.length||options.maintenanceCosts?.length||options.requirements?.length||options.castModes?.length||options.usageRules||options.cooldownTurns!==undefined;
    const presetPool=[],presetFailures=[];
    if(options.allowPresets!==false&&catalogue&&(!directed||options.presetId)){
      const entries=options.presetId?[catalogue.get(options.presetId)].filter(Boolean):catalogue.list({category:'魂技'}).filter(e=>e.gates.minimumYears<=beastProfile.年限).sort((a,b)=>Number((options.preferredPresetIds??[]).includes(b.id))-Number((options.preferredPresetIds??[]).includes(a.id))||stableHash(options.choiceSeed+':'+a.id)-stableHash(options.choiceSeed+':'+b.id));
      if(options.presetId&&(!entries.length||entries[0].category!=='魂技'))throw Error('所选魂技预设不可用');
      for(const entry of entries){
        const contract=Object.fromEntries(['exchangeContracts','requirements','resourceCosts','maintenanceCosts','castModes','defaultCastMode','usageRules','cooldownTurns','targetConditions','effectConditions'].filter(key=>options[key]!==undefined).map(key=>[key,clone(options[key])]));
        const result=catalogue.compile(entry.id,{martialSoul,beastProfile,beastSkills,ringOrdinal,allowExpressionGrowth:true,options:{skillIdPrefix:`ring-skill-${martialSoul.id}-${beastProfile.id}-${ringOrdinal}-${entry.id}`,compatibility:options.compatibility,...contract}});
        if(!result.pass){if((options.preferredPresetIds??[]).includes(entry.id))presetFailures.push(entry.name+'：'+result.reason);if(options.presetId)throw Error(result.reason);continue;}
        const compiled=result.mechanics,presentation=catalogue.presentation(entry,martialSoul);
        if(options.allowAdultMechanics===false&&globalThis.SoulControlCore.adultMechanic(compiled.skills))continue;
        for(const [index,skill]of compiled.skills.entries()){
          skill.name=presentation.skillNames?.[index]??(compiled.skills.length===1?presentation.name:skill.name||`${presentation.name}·${index+1}`);skill.description=presentation.description;skill.namingSource='preset';skill.presetId=entry.id;skill.artId=entry.artId;
        }
        const fingerprint=ringSkillPackageFingerprint(compiled);if(fingerprints.has(fingerprint))continue;
        fingerprints.add(fingerprint);
        const candidate={...compiled,id:`ring-choice-${martialSoul.id}-${beastProfile.id}-${ringOrdinal}-${entry.id}`,index:presetPool.length,title:presentation.name,description:presentation.description,allocationStyle:'精品预设',proceduralVariantOffset:0,presetId:entry.id,fingerprint};
        pool.push(candidate);presetPool.push(candidate);if(presetPool.length>=12)break;
      }
      if(options.presetId&&!presetPool.length)throw Error('该预设不符合当前魂环预算或表达通道');
    }
    const maxAttempts = options.presetId?0:72;
    const legalRoles=ringCandidateRoles(martialSoul,beastProfile,beastSkills);
    if(!legalRoles.length)legalRoles.push('damage');
    let lastError = null;
    const failedRoles = new Map();
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const candidateNumber = pool.length + 1;
      const style = styles[(attempt + seedOffset) % styles.length];
      const proceduralVariantOffset = seedOffset + Math.floor(attempt/legalRoles.length);
      const skillCount = ringSkillLimit(beastProfile);
      const allocationMode = Math.floor(attempt / styles.length) % Math.max(1,skillCount + 1);
      const packageAllocationWeights = skillCount > 1
        ? Array.from({length:skillCount},(_,index) => allocationMode === 0 ? 1 : 1 + ((index + allocationMode - 1) % skillCount))
        : undefined;
      try {
        const compiled = compileRingSkills({
          martialSoul,
          beastProfile,
          beastSkills,
          ringOrdinal,
          options: {
            ...options,
            candidateRole:options.requestedEffects?.length||options.requestedBranches?.length||options.requestedEffectIds?.length||options.requestedSkills?.length?undefined:legalRoles[(attempt+seedOffset)%legalRoles.length],
            candidateSecondaryRoles:legalRoles.filter(role=>role!==legalRoles[(attempt+seedOffset)%legalRoles.length]).sort((a,b)=>stableHash(a+Math.floor(attempt/legalRoles.length))-stableHash(b+Math.floor(attempt/legalRoles.length))),
            requestedEffects: options.requestedEffects,
            requestedBranches: options.requestedBranches,
            requestedEffectIds: options.requestedEffectIds,
            requestedSkills: options.requestedSkills,
            name: undefined,
            allocationStyle: style,
            proceduralVariantOffset,
            proceduralVariantStride: 1 + Math.floor(attempt / styles.length),
            optimizationVariantOffset: attempt + 1,
            packageAllocationWeights,
            preferredSkillCount: options.requestedSkills?.length&&options.requestedSkills.every(s=>s.strictEffects===true&&s.autoAllocate===false)?options.requestedSkills.length:Math.max(1, skillCount - (Math.floor(attempt / styles.length) % skillCount)),
            skillIdPrefix: `ring-skill-${martialSoul.id}-${beastProfile.id}-${ringOrdinal}-choice-${candidateNumber}`,
            allowProceduralFallback: true
          }
        });
        if(options.allowAdultMechanics===false&&globalThis.SoulControlCore.adultMechanic(compiled.skills))continue;
        const fingerprint = ringSkillPackageFingerprint(compiled);
        if (fingerprints.has(fingerprint)) continue;
        fingerprints.add(fingerprint);
        const candidateId = `ring-choice-${martialSoul.id}-${beastProfile.id}-${ringOrdinal}-${candidateNumber}`;
        pool.push({
          id: candidateId,
          index: candidateNumber - 1,
          title: `魂技演化·${['一','二','三','四'][candidateNumber - 1]}`,
          description: '查看这套魂技的用途与消耗，选择适合自己的力量。',
          allocationStyle: style,
          proceduralVariantOffset,
          fingerprint,
          ...compiled
        });
      } catch (error) {
        lastError = error;
        const role=legalRoles[(attempt+seedOffset)%legalRoles.length];
        if(!failedRoles.has(role))failedRoles.set(role,new Set());
        for(const reason of error.choiceFailures??[])failedRoles.get(role).add(reason);
      }
    }
    // When no age-legal purchased direction can execute, retain the existing
    // low-age base-action fallback. This does not create another option or
    // introduce a new effect permission, and high-age floors still apply.
    if(!pool.length&&!ringSkillMinimumBudget(beastProfile)){
      const compiled=compileRingSkills({martialSoul,beastProfile,beastSkills,ringOrdinal,options:{...options,preferredSkillCount:1,proceduralVariantOffset:seedOffset,allowProceduralFallback:true}});
      const fingerprint=ringSkillPackageFingerprint(compiled);
      if(!fingerprints.has(fingerprint))pool.push({id:`ring-choice-${martialSoul.id}-${beastProfile.id}-${ringOrdinal}-fallback`,index:0,fingerprint,...compiled});
    }
    const excludedCandidates=options.excludedCandidates??[];
    // Find the maximum compatible set before applying the seeded route preference.
    // A preferred card may only occupy a slot if the central diversity selector
    // can still complete that many legal choices from the same paid source pool.
    // The replaced card is leaving this choice. It may share a role with its
    // successor, but the successor must make a substantive mechanical tradeoff.
    // Cards that remain still require the usual distinct roles.
    let eligible=pool.filter(candidate=>(options.allowAdultMechanics!==false||!globalThis.SoulControlCore.adultMechanic(candidate.skills))&&diversity.strongProfile(candidate,calculateNodeCost).valid&&excludedCandidates.every(other=>diversity.compareStrong(candidate,other,calculateNodeCost).different)&&(!options.replacementCandidate||diversity.compare(candidate,options.replacementCandidate,EFFECT_REGISTRY).different));
    eligible=eligible.filter(candidate=>!eligible.some(other=>other!==candidate&&diversity.compare(candidate,other,EFFECT_REGISTRY).dominance<0));
    eligible.sort((a,b)=>(b.skills?.length??1)-(a.skills?.length??1));
    const maximumSet=diversity.selectStrong(eligible,requestedCount,excludedCandidates,EFFECT_REGISTRY,calculateNodeCost),maximum=maximumSet.length;
    const selected=[];
    for(let index=0;index<maximum;index++){
      const route=options.presetId||(options.preferredPresetIds?.length&&index===0)?'preset':catalogue&&!directed?catalogue.routeFor(options.choiceSeed??seedOffset,'ring-choice',index):'random';
      const preferred=candidate=>route==='preset'?!!candidate.presetId:!candidate.presetId;
      const priority=candidate=>(options.preferredPresetIds??[]).includes(candidate.presetId);const ordered=[...eligible.filter(priority),...eligible.filter(candidate=>!priority(candidate)&&preferred(candidate)),...eligible.filter(candidate=>!priority(candidate)&&!preferred(candidate))];
      const excluded=[...excludedCandidates,...selected],remaining=maximum-selected.length-1;
      for(const candidate of ordered){
        if(selected.some(c=>c.fingerprint===candidate.fingerprint)||!excluded.every(other=>diversity.compareStrong(candidate,other,calculateNodeCost).different)||selected.some(other=>diversity.compare(candidate,other,EFFECT_REGISTRY).dominance!==0))continue;
        const qualified=diversity.selectStrong([candidate],1,excluded,EFFECT_REGISTRY,calculateNodeCost)[0];if(!qualified)continue;
        const completion=remaining?diversity.selectStrong(eligible,remaining,[...excluded,candidate],EFFECT_REGISTRY,calculateNodeCost):[];
        if(completion.length!==remaining)continue;
        selected.push(qualified);break;
      }
    }
    if(selected.length<maximum)selected.splice(0,selected.length,...maximumSet);
    const inherited=pool.find(candidate=>(options.preferredPresetIds??[]).includes(candidate.presetId)&&diversity.strongProfile(candidate,calculateNodeCost).valid&&excludedCandidates.every(other=>diversity.compareStrong(candidate,other,calculateNodeCost).different));
    if(inherited){
      const role=diversity.strongProfile(inherited,calculateNodeCost),anchor={...inherited,choiceRole:{id:role.main,label:role.label}};
      const rest=diversity.selectStrong(pool.filter(c=>c!==inherited),requestedCount-1,[...excludedCandidates,anchor],EFFECT_REGISTRY,calculateNodeCost);
      selected.splice(0,selected.length,anchor,...rest);
    }
    // An adopted opening design is one fixed, fully compiled package, not a
    // request for several random roles. Keep every existing successful choice
    // unchanged; only recover a legal fixed package when diversity alone emptied
    // the ordinary selection. No reroll, exclusion or preset may use this route.
    const fixedRequestedPackage=!selected.length&&options.acceptFixedRequestedPackage===true&&
      Array.isArray(options.requestedSkills)&&options.requestedSkills.length>0&&
      options.requestedSkills.every(skill=>skill?.strictEffects===true&&skill.autoAllocate===false&&
        (skill.requestedEffects?.length||skill.requestedEffectIds?.length||skill.requestedBranches?.some(branch=>branch.requestedEffects?.length||branch.requestedEffectIds?.length)))&&
      !(options.excludedFingerprints?.length||excludedCandidates.length||options.replacementCandidate||options.presetId||options.preferredPresetIds?.length)&&
      pool.find(candidate=>!candidate.presetId&&candidate.skills.length===options.requestedSkills.length);
    if(fixedRequestedPackage)selected.push({...fixedRequestedPackage,choiceRole:{id:'fixed-requested-package',label:'已确认组合'}});
    const candidates=selected.map((candidate,index)=>({...candidate,index,title:candidate.presetId?candidate.title:`魂技演化·${['一','二','三','四'][index]}`}));
    if (!candidates.length) {
      throw new Error(`当前来源没有形成合法魂技候选${lastError ? `：${lastError.message}` : ''}`);
    }
    const distinctCount = candidates.length;
    const successfulRoles=new Set(pool.map(candidate=>diversity.strongProfile(candidate,calculateNodeCost).main));
    const tierName=foundation.getAgeTier(beastProfile.年限).名称;
    const details=[...presetFailures];
    for(const [role,reasons] of failedRoles)if(!successfulRoles.has(role)){
      const label=diversity.ROLE_LABELS[role];
      const reason=reasons.has('quality-floor')?`现有组合未达到${tierName}魂技的强度要求`
        :reasons.has('budget')?'当前魂环的力量不足以组成完整魂技'
        :reasons.has('expression')?'现有能力方向与魂环来源未能组成完整施展方式'
        :'现有组合未形成完整且有效的魂技';
      details.push(`${label}：${reason}。`);
    }
    if(successfulRoles.size>candidates.length)details.push('其余已形成的方案用途重叠，或与已有方案缺少明显取舍，因此未重复列出。');
    const compiledSoul=martialSoul.扩展?.结构化武魂??martialSoul.结构化武魂;
    const channels=(compiledSoul?.definition?.channels??[]).map(channel=>foundation.MARTIAL_SOUL_CORE.CHANNEL_REGISTRY[typeof channel==='string'?channel:channel.id]?.name).filter(Boolean);
    const availability=fixedRequestedPackage?{requestedCount:1,actualCount:1,
      summary:'已形成这一套完整魂技设计',details:['按已确认的效果、分支、技能数量与消耗形成固定方案。']}
      :{requestedCount,actualCount:candidates.length,
      summary:`本次形成 ${candidates.length} / ${requestedCount} 套可选魂技方案`,
      details:candidates.length<requestedCount?[
        `来源魂环：${beastProfile.年限}年；本次可形成的用途为${legalRoles.map(role=>diversity.ROLE_LABELS[role]??role).join('、')}。`,
        ...(legalRoles.length<requestedCount?[`这枚魂环与武魂相融后只有${legalRoles.length}类可用用途，不能仅靠更换名称补足${requestedCount}套选择。`]:[]),
        ...(channels.length?[`武魂当前能力方向：${channels.join('、')}。`]:[]),
        `本次可选用途：${[...new Set(candidates.map(candidate=>candidate.choiceRole.label))].join('、')}。`,
        ...details,
        '同类方案的重复版本不会充当额外选项。增加合适的能力方向，或选择其他来源的魂环，可尝试更多用途。'
      ]:details};
    const mechanicsHash = stableHash(JSON.stringify(candidates.map(candidate => candidate.fingerprint))).toString(16).padStart(8, '0');
    return {
      choiceCount: candidates.length,
      distinctChoiceCount: distinctCount,
      candidates,
      mechanicsHash,
      sourceBudget: {...calculateRingBudget(beastProfile,martialSoul,frozenCompatibility),available:calculateRingBudget(beastProfile,martialSoul,frozenCompatibility).usable},
      presetFailures,
      availability
    };
  }

  // Reject a verified model failure before descriptive text is stored. Numeric
  // combat behavior always comes from the graph, never from this prose check.
  function validateDefenseNarrative(nodes, text, graph, options={}) {
    // Check concrete spatial/time claims against the same graph used in combat.
    // This rejects observed contradictions, not arbitrary visual metaphors.
    const functionalNodes=graph?.nodes??nodes??[];
    if(functionalNodes.some(node=>Number(node.params?.持续回合)>0)&&/[一二两三四五六七八九十百\d]+\s*(?:秒|息)(?:内|之内|之间|后|间|钟|$|[，。；])/u.test(text))throw new Error('持续效果以回合结算，不能在介绍中改成秒或息');
    const ranges=functionalNodes.filter(node=>node.effectId.startsWith('release.')&&Number.isFinite(node.params?.距离区)).map(node=>node.params.距离区);
    const integerText=value=>{
      if(/^\d+$/u.test(value))return Number(value);
      const digits={零:0,一:1,二:2,两:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9};
      if(Object.hasOwn(digits,value))return digits[value];
      const parts=value.split('十');return parts.length===2?(parts[0]?digits[parts[0]]:1)*10+(parts[1]?digits[parts[1]]:0):NaN;
    };
    if(ranges.length)for(const claim of text.matchAll(/(?:向|缠住|命中|攻击|锁定|作用于)(?:最远|位于|距离)?([零一二两三四五六七八九十\d]+)\s*(?:个)?(?:区|区域)(?:以)?外/gu)){
      if(/不|无法|不能|禁止/u.test(text.slice(Math.max(0,claim.index-4),claim.index)))continue;
      if(integerText(claim[1])>=Math.max(...ranges))throw new Error('介绍把作用目标写到了实际射程之外');
    }
    const absorption=(nodes ?? []).some(node=>node.effectId==='status.resistance_shift'&&node.params?.模式==='吸收');
    if(absorption&&/护盾[^。；]{0,30}(?:取|等于|达到|按|与|为)[^。；]{0,24}(?:生命上限|最大生命|生命最大值|血量上限)/u.test(text)) {
      throw new Error('吸收说明与实际效果不符：临时护盾只与原有临时护盾取较大值，不与生命上限比较');
    }
    if(/伤害(?:翻倍|加倍)|易伤/u.test(text))for(const node of nodes ?? []){
      // A package overview may name a typed vulnerability briefly; each skill
      // is still validated below with its complete, separate effect description.
      if(options.summary&&!/翻倍|加倍/u.test(text)&&node.effectId==='status.resistance_shift'&&node.params?.模式==='易伤'&&new RegExp(`${node.params.类型}[^。；，]{0,16}易伤`,'u').test(text))continue;
      if(node.effectId==='status.resistance_shift'&&node.params?.模式==='易伤'&&!new RegExp(`(?:受到|承受|所受|遭受)的?${node.params.类型}(?:属性)?伤害`,'u').test(text))throw new Error(`易伤说明必须明确写出“目标受到的${node.params.类型}属性伤害翻倍”，不能扩大为所有伤害或增加目标输出`);
    }
    // A passive defense cannot be handed to the target of a separate active branch.
    // Check this observed, literal claim only; visual metaphors remain unrestricted.
    if(graph){
      const branches=graphBranches(graph);
      const passiveDefense=branches.some(branch=>branch.activation==='passive'&&branch.nodes.some(node=>['status.resistance_shift','status.status_guard'].includes(node.effectId)));
      const activeDefense=branches.some(branch=>branch.activation!=='passive'&&branch.nodes.some(node=>['status.resistance_shift','status.status_guard'].includes(node.effectId)&&node.params?.模式!=='易伤'));
      if(passiveDefense&&!activeDefense&&/(?:抗性|免疫|防护)[^。；]{0,12}(?:渡给|传给|赋予|交给)(?:对方|他人|目标|敌人)/u.test(text))throw new Error('被动防护只作用于持有者，不能写成转交给主动技能的目标');
    }
    return text;
  }

  return Object.freeze({
    validateDefenseNarrative,designActionTimingErrors,
    CANDIDATE_ROLE_LABELS:diversity.ROLE_LABELS,
    candidateEffectRole:diversity.effectRole,
    strongCandidateProfile:candidate=>diversity.strongProfile(candidate,calculateNodeCost),
    compareStrongCandidates:(a,b)=>diversity.compareStrong(a,b,calculateNodeCost),
    selectStrongCandidates:(pool,count,excluded=[])=>diversity.selectStrong(pool,count,excluded,EFFECT_REGISTRY,calculateNodeCost),
    compareCandidates: (a,b) => diversity.compare(a,b,EFFECT_REGISTRY),
    selectDiverseCandidates: (pool,count,excluded=[]) => diversity.select(pool,count,excluded,EFFECT_REGISTRY),
    candidateFacts: candidate => diversity.facts(candidate,EFFECT_REGISTRY),
    uniqueCandidateNames: (names,candidates,limit=18,mutable) => diversity.uniqueNames(names,candidates,EFFECT_REGISTRY,limit,mutable),
    VERSION,
    REGISTRY_VERSION,
    MECHANISM_RANK,
    TIER_RANK,
    TIER_OUTPUT_SCALE,
    TIER_SOUL_COST_RATE,
    SOUL_RING_CAST_COST,
    SOUL_RING_UPCAST_TOTAL,
    DAMAGE_TYPES,
    SAVE_ATTRIBUTES,
    EFFECT_REGISTRY,
    VALUE_REGISTRY,
    SEMANTIC_BRIDGES,
    SPECIES_TEMPLATES,
    calculateNodeCost,...phase,
    rawAbilityValue,
    fixedRealmPolicy,compileFixedRealmRing,fixedRealmSkillMatches,
    VALUE_POLICY,FEE_ITEM_VALUES,abilityValueLedger,validateAbilityValue,sealPricedAbility,
    soulPowerCostForValue,
    validateValueBasis,
    nodeCostBreakdown,
    effectPolarity,HIT_RULE_SPECS,HIT_RULE_IDS,
    effectParameterAllowed,OPTIONAL_EFFECT_PARAMETERS,BATTLE_EVENT_KINDS,
    makeLinearGraph,
    makeBranchedGraph,
    graphBranches,
    soulEffectVariants,
    ringRequestEffectSpecs,
    normalizeEffectParams:(id,params,activation)=>normalizeParams(EFFECT_REGISTRY[id],params,activation),
    hitInterferenceAttackSpecs,
    STATUS_GUARD_BRIDGES,
    MATERIAL_GUARD_ATTRIBUTES,
    materialDefenseVariants,
    channelAllowsParams,
    skillActivation: graph => { const branches = graphBranches(graph); const passive = branches.some(branch => branch.activation === 'passive'); return passive ? branches.some(branch => branch.activation === 'active') ? 'hybrid' : 'passive' : 'active'; },
    validateGraph,
    calculateBeastBudget,
    compileSoulBeastSkills,
    minimumDirectedCost,
    validateBeastCompilation,
    resolveBridges,
    ringExpressionForSource:boonExpression,
    sourceBridgeTags,
    paidSourceBridgeTags,
    sourceTraitsWithBridges,
    sourceBeastOptions,
    freezeSourceBridges,
    sourceTraitsMatch,
    bridgeSupportsParams,
    soulRingCastSource,soulRingNativeRank,soulRingMinimumRank,soulRingAvailableRank,deriveSoulRingCastSkill,currentSoulRingCastSkill,soulRingCastRelease,
    calculateRingBudget,
    ringSkillLimit,
    ringSkillMinimumBudget,
    validateRingSkillPackage,
    validateFrozenRingSources,
    skillPurposeFingerprint,
    splitValueBudget,
    optimizePlanToBudget,createWorkshopAllocator,
    compileDirectedGraph,
    compileRingSkill,
    compileRingSkills,ringCandidateRoles,
    ringSkillPackageFingerprint,
    compileRingSkillChoices
  });
});
