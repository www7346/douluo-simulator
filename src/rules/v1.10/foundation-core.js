(function attachSoulCombatFoundation(root, factory) {
  const martialSoulCore = root?.SoulMartialSoulCore ?? (typeof require === 'function' ? require('./martial-soul-core.js') : null);
  const equipment = root?.SoulEquipmentAffixes ?? (typeof require === 'function' ? require('./equipment-affixes.js') : null);
  const beastValue = root?.SoulBeastValue ?? (typeof require === 'function' ? require('./beast-value-core.js') : null);
  const controls=root?.SoulControlCore??(typeof require==='function'?require('./control-core.js'):null);
  const foundation = factory(martialSoulCore,equipment,beastValue,controls);
  if (typeof module !== 'undefined' && module.exports) module.exports = foundation;
  if (root) root.SoulCombatFoundation = foundation;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createSoulCombatFoundation(martialSoulCore,equipment,beastValue,controls) {
  'use strict';

  if (!martialSoulCore) throw new Error('SoulCombatFoundation requires SoulMartialSoulCore');
  const STATUS_GUARD_TARGETS = Object.freeze(['status.hit_disadvantage','status.bind','status.paralysis','status.burn','status.poison','status.armor_break','status.stun','status.fear','status.charm','status.blind','status.silence','status.mute','status.limb_bind','status.power_seal','status.mind_control','status.soul_control','status.cognition_shift','status.sleep','status.slow','status.eternal_wound','status.buff','status.resistance_shift','status.desire']);
  function negativeStatus(effectId, params = {}) {
    if(effectId==='status.damage_over_time')return true;
    if(effectId==='status.next_check_penalty')return Number(params.数值)<0;
    if (effectId === 'status.buff') return Number(params.数值) < 0;
    if (effectId === 'status.resistance_shift') return params.模式 === '易伤';
    return STATUS_GUARD_TARGETS.includes(effectId);
  }

  // Source descriptors are derived on demand, never written into innate arrays.
  function intrinsicSoulSkillBlockReason(unit,skill) {
    const restriction=unit?.扩展?.固有战斗限制;
    if(!restriction?.soulSkillsLocked||!skill)return '';
    const soulSkill=skill.id==='martial.base'||skill.类型==='魂技'||(skill.sourceKind??skill.source?.kind)==='soul-ring'||skill.来源魂环ID||skill.sourceRingId;
    return soulSkill?(restriction.reason||'人物当前状态无法使用魂技'):'';
  }
  function defenseSources(state,unitOrId){const unit=typeof unitOrId==='string'?state.战斗单位?.列表?.[unitOrId]:unitOrId,cache=battleDefenseReads.get(state);if(cache?.has(unit))return cache.get(unit);const result=defenseSourcesUncached(state,unitOrId);cache?.set(unit,result);return result;}
  function defenseSourcesUncached(state, unitOrId) {
    const unit = typeof unitOrId === 'string' ? state.战斗单位?.列表?.[unitOrId] : unitOrId;
    if (!unit) return [];
    const result = [];
    const add = (sourceId, name, kind, effectId, params) => result.push({sourceId, name, kind, effectId, params:deepClone(params)});
    const innateFields = {伤害抗性:['status.resistance_shift','抗性'],伤害免疫:['status.resistance_shift','免疫'],伤害易伤:['status.resistance_shift','易伤'],属性吸收:['status.resistance_shift','吸收'],状态抗性:['status.status_guard','抗性'],状态免疫:['status.status_guard','免疫']};
    for (const [field,[effectId,mode]] of Object.entries(innateFields)) for (const value of cleanList(unit.抗性?.[field])) add(`innate:${unit.id}:${field}:${value}`,unit.名称,'innate',effectId,{[effectId === 'status.status_guard' ? '防护对象' : '类型']:value,模式:mode});
    const soul = activeMartialSoul(state,unit.id) ?? beastLineageSource(state,unit.id);
    const soulSealed=soul&&controls.martialSoulSealed(state,unit.id,soul.id);
    for (const hook of soulSealed?[]:globalThis.SoulAbilityExchange.hooks(state,unit.id,soul)) {
      const attribute = martialSoulCore.ATTRIBUTE_REGISTRY[hook.parameter]?.name;
      if (hook.type === 'resistance' && attribute) add(`soul:${soul.id}:${hook.sourceId}:${attribute}`,soul.名称,'martial-soul','status.resistance_shift',{类型:attribute,模式:'抗性'});
      if (hook.type === 'physicalVulnerability') add(`soul:${soul.id}:${hook.sourceId}`,soul.名称,'martial-soul','status.resistance_shift',{类型:'物理',模式:'易伤'});
    }
    const config = state.装备?.配置?.[unit.id];
    const itemIds = new Set([...Object.values(config?.slots ?? {}),...Object.values(config?.soulBoneSlots ?? {})].filter(Boolean));
    const validItem = item => item && item.ownerEntityId === unit.id && Number(item.quantity) > 0 && itemIds.has(item.id) && (item.type === '魂骨' ? item.boundToEntityId === unit.id : item.type==='魂导器');
    for (const itemId of itemIds) {
      const item = state.物品?.实例?.[itemId];
      if (!validItem(item)||!controls.itemEffectsAllowed(state,unit.id,item)) continue;
      for (const node of item.payload?.passiveEffectGraph?.nodes ?? []) if (['status.resistance_shift','status.status_guard'].includes(node.effectId)) add(`item-passive:${itemId}:${node.id}`,item.name,'equipment',node.effectId,node.params);
      for (const attribute of cleanList(item.payload?.modifiers?.resistances)) add(`item:${itemId}:${attribute}`,item.name,'equipment','status.resistance_shift',{类型:attribute,模式:'抗性'});
    }
    for (const skillId of cleanList(unit.能力?.技能ID)) {
      const skill = state.技能?.列表?.[skillId];
      if (!skill || (skill.持有者单位ID && skill.持有者单位ID !== unit.id)) continue;
      if (intrinsicSoulSkillBlockReason(unit,skill)) continue;
      if (controls.passiveReason(state,unit.id,skill)) continue;
      const sourceSoulId = skill.sourceMartialSoulId || skill.来源武魂ID || skill.source?.martialSoulId || '';
      const copied = ['copied','summoned-copy'].includes(skill.sourceKind);
      if ([state.战斗,...Object.values(state.世界?.backgroundBattles??{})].some(b=>b?.状态==='进行中'&&b.扩展?.成员?.[unit.id]?.status==='active'&&b.扩展?.规则?.soulSkillsLocked) && (skill.类型==='魂技'||skill.sourceKind==='soul-ring'||skill.来源魂环ID||skill.sourceRingId)) continue;
      if (!copied && sourceSoulId && sourceSoulId !== soul?.id) continue;
      if (!copied && skill.sourceItemId && !validItem(state.物品?.实例?.[skill.sourceItemId])) continue;
      if (skill.sourceKind === 'copied' && !Object.values(state.状态实例?.列表 ?? {}).some(status => status.状态 === '生效' && status.扩展?.复制技能ID列表?.includes(skillId))) continue;
      if (skill.sourceKind === 'summoned-copy' && !(unit.扩展?.召唤?.constructId?unit.扩展.召唤.expiresAt>(globalThis.SoulPersonCore?.now(state)??0):Number(unit.扩展?.召唤?.剩余回合)>0)) continue;
      let released;try{released=globalThis.SoulEffectCompiler?.currentSoulRingCastSkill(state,unit,skill)??skill;}catch{continue;}
      if(globalThis.SoulEffectCompiler?.soulRingCastRelease(released).reason)continue;
      const graph = released.effectGraph;
      const passiveIds = new Set((graph?.branches ?? []).filter(branch => branch.activation === 'passive'&&globalThis.SoulAbilityExchange.branchActive(state,unit.id,skill,branch.id)).flatMap(branch => branch.nodeIds ?? []));
      for (const node of graph?.nodes ?? []) if (passiveIds.has(node.id) && ['status.resistance_shift','status.status_guard'].includes(node.effectId) && node.params?.模式 !== '易伤') add(`skill:${skillId}:${node.id}`,skill.name ?? skill.名称,'skill',node.effectId,node.params);
    }
    for (const status of Object.values(state.状态实例?.列表 ?? {})) if (status.状态 === '生效' && status.目标单位ID === unit.id && ['status.resistance_shift','status.status_guard'].includes(status.模板ID)) add(`status:${status.id}`,state.技能?.列表?.[status.来源?.技能ID]?.name ?? '临时防护','temporary',status.模板ID,status.快照?.参数 ?? {});
    return result;
  }

  function passiveSkillState(state,skill) {
    const ownerId=skill?.持有者单位ID ?? state?.角色?.主控单位ID;
    const owned=Boolean(state?.技能?.列表?.[skill?.id] && state?.战斗单位?.列表?.[ownerId]?.能力?.技能ID?.includes(skill.id));
    if(!owned)return {owned:false,active:false,reason:'获得后随来源生效'};
    let releaseReason='';try{const released=globalThis.SoulEffectCompiler?.currentSoulRingCastSkill(state,state.战斗单位?.列表?.[ownerId],skill);if(released)releaseReason=globalThis.SoulEffectCompiler.soulRingCastRelease(released).reason;}catch(error){releaseReason=error.message;}
    const blocked=releaseReason||intrinsicSoulSkillBlockReason(state.战斗单位?.列表?.[ownerId],skill)||controls.passiveReason(state,ownerId,skill);
    if(blocked)return {owned:true,active:false,reason:blocked};
    const active=defenseSources(state,ownerId).some(source=>source.sourceId.startsWith(`skill:${skill.id}:`));
    if(active)return {owned:true,active:true,reason:'当前已生效'};
    const soulId=skill.sourceMartialSoulId||skill.来源武魂ID;
    const item=state.物品?.实例?.[skill.sourceItemId];
    const reason=soulId&&soulId!==activeMartialSoulId(state,ownerId)?'对应武魂未启用':item&&Number(item.durability)<=0?'装备耐久耗尽':item?'需要装备并保持来源有效':'来源当前未生效';
    return {owned:true,active:false,reason};
  }

  const VERSION = '2.10.0';
  const STORAGE_STRATEGY = 'multi-floor';
  const ATTRIBUTE_KEYS = Object.freeze(['力量', '身法', '体魄', '悟性', '感知', '意志']);
  const AFFINITY_ATTRIBUTES = Object.freeze(Object.values(martialSoulCore.ATTRIBUTE_REGISTRY).map(item => item.name));
  const DAMAGE_TYPES = Object.freeze([...martialSoulCore.DAMAGE_TYPES]);
  const DAMAGE_FAMILIES = Object.freeze({
    物理: ['物理'], 五行: ['金','木','水','火','土'], 自然: ['风','雷','冰','毒蚀'],
    光暗: ['光','暗'], 生死: ['生命','死亡'], 法则: ['毁灭','空间','时间'], 精神: ['精神'], 灵魂: ['灵魂'], 阴:['阴'], 阳:['阳'], 淫:['淫']
  });
  const UNIT_KINDS = Object.freeze(['玩家魂师', '魂师NPC', '魂兽', '普通人']);
  const LIFE_STATES = Object.freeze(['存活', '昏迷', '死亡']);
  const DISTANCE_ZONES = Object.freeze(['接触', '近距', '中距', '远距', '极远', '未部署']);
  const TRANSACTION_TYPES = Object.freeze([
    '无',
    '建立角色与武魂',
    '创建武魂草案',
    '更新武魂草案',
    '确认武魂草案',
    '创建武魂',
    '切换武魂',
    '生成魂兽',
    '判断战斗场景',
    '开始战斗',
    '加入战斗',
    '离开战斗',
    '提交战斗行动',
    '结算战斗回合',
    '结束战斗',
    '凝聚魂环',
    '结算战斗经验',
    '分配成长属性',
    '生成魂技候选',
    '命名魂技候选',
    '确认魂技候选',
    '吸收魂环',
    '登记封号候选',
    '确认封号',
    '创建玩家',
    '生成人物',
    '晋升人物',
    '移动地点',
    '转移物品',
    '装备物品',
    '卸下物品',
    '购买物品',
    '出售物品',
    '商店补货',
    '创建遗骸',
    '采集魂兽',
    '拾取物品',
    '拾取钱币',
    '生成魂骨',
    '融合魂骨',
    '制造辅助食品',
    '推进世界时间',
    '开始远征',
    '进入远征房间',
    '结算远征战斗',
    '采集远征魂兽',
    '开启远征宝箱',
    '使用远征火堆',
    '完成远征房间',
    '远征安全撤离',
    '补给铺购买',
    '补给铺出售',
    '开始配方研发',
    '解析研发候选',
    '确认研发图纸',
    '按图纸打造',
    '开始切磋',
    '结算切磋',
    '创建单人赛',
    '开始单人赛对局',
    '结算单人赛',
    '开始终局挑战',
    '结算终局挑战',
    '开始杀戮场',
    '开始杀戮场死斗',
    '结算杀戮场'
  ]);

  const MARTIAL_SOUL_GRADES = Object.freeze(martialSoulCore.QUALITY_GRADES.map(item => ({
    数值: item.value, 标签: item.name, ID: item.id, 价值下限: item.minValue, 价值上限: item.maxValue,
    转化倍率: item.conversion,
    身体容量修正: 0, 灵魂稳定修正: 0
  })));

  const SOUL_BEAST_GRADES = Object.freeze(beastValue.GRADES.map(grade => Object.freeze({数值:grade.value,标签:grade.name,颜色:grade.color})));

  const AGE_TIERS = Object.freeze([
    {名称: '十年', 最小: 1, 最大: 99, 颜色: '白', 机制上限: '基础'},
    {名称: '百年', 最小: 100, 最大: 999, 颜色: '黄', 机制上限: '基础'},
    {名称: '千年', 最小: 1000, 最大: 9999, 颜色: '紫', 机制上限: '进阶'},
    {名称: '万年', 最小: 10000, 最大: 99999, 颜色: '黑', 机制上限: '强力'},
    {名称: '十万年', 最小: 100000, 最大: 999999, 颜色: '红', 机制上限: '规则'},
    {名称: '百万年', 最小: 1000000, 最大: Number.MAX_SAFE_INTEGER, 颜色: '金', 机制上限: '神话'}
  ]);

  const FORMULA_CONFIG = Object.freeze({
    熟练: {基础: 2, 每段等级: 20, 最大: 6},
    生命: {基础: 20, 每有效等级: 3, 体魄阈值: 10, 每点超额体魄: 4},
    魂力: {每有效等级: 4.5, 体魄: 1, 意志: 1.4, 悟性: 0.8},
    封号斗罗魂力质量: {
      95: 1,
      96: 1.2,
      97: 1.44,
      98: 1.872,
      99: 2.6208
    },
    承载等级锚点: [1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99],
    承载年限锚点: [100, 450, 900, 2200, 6000, 15000, 30000, 55000, 85000, 120000, 260000, 650000],
    承载评分: {六维每点: 1, 生命平方根: 3, 魂力平方根: 3},
    魂兽有效等级: {
      年限对数锚点: [0, 1, 2, 3, 4, 5, 6], 等级锚点: [1, 5, 14, 28, 55, 90, 99],
      最小: 1, 最大: 99
    },
    战斗回蓝: 0,
    普通魂技统一冷却: 0
  });

  const STATE_ROOT_KEYS = Object.freeze([
    '系统', '角色', '成长', '战斗单位', '武魂', '魂环', '技能', '魂兽档案',
    '场景', '遭遇', '战斗', '状态实例', '战利品', '世界', '人物', '物品',
    '容器', '装备', '钱包', '地图', '商店', '交易流水', '切磋', '比赛', '杀戮场', '终局挑战', '事务', '历史', '扩展'
  ]);

  function clamp(value, minimum, maximum) {
    const number = Number(value);
    if (!Number.isFinite(number)) return minimum;
    return Math.min(maximum, Math.max(minimum, number));
  }

  function round(value, digits = 0) {
    const factor = 10 ** digits;
    return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
  }

  function grantTemporaryHealth(unit, offeredAmount, sourceId = '', domainId = '') {
    if (!unit?.资源?.生命) throw new Error('临时生命目标缺少生命资源');
    const before = Math.max(0, round(unit.资源.生命.临时 ?? 0));
    const offered = Math.max(0, round(offeredAmount));
    const after = Math.max(before, offered);
    const gained = after - before;
    unit.资源.生命.临时 = after;
    if(offered>0&&offered>=before){unit.扩展??={};if(sourceId)unit.扩展.temporaryHealthSource=String(sourceId);else delete unit.扩展.temporaryHealthSource;}
    if(offered>0&&offered>=before){if(domainId)unit.扩展.temporaryHealthDomainId=String(domainId);else delete unit.扩展.temporaryHealthDomainId;}
    return {before, offered, gained, after, unused: Math.max(0, offered - gained)};
  }

  function clearTemporaryHealth(unit) {
    if (!unit?.资源?.生命) return 0;
    const before = Math.max(0, round(unit.资源.生命.临时 ?? 0));
    unit.资源.生命.临时 = 0;
    if(unit.扩展)delete unit.扩展.temporaryHealthSource;
    if(unit.扩展)delete unit.扩展.temporaryHealthDomainId;
    return before;
  }

  function deepClone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function deepMerge(base, patch) {
    if (!isPlainObject(base) || !isPlainObject(patch)) return deepClone(patch);
    const result = deepClone(base);
    for (const [key, value] of Object.entries(patch)) {
      if (isPlainObject(value) && isPlainObject(result[key])) result[key] = deepMerge(result[key], value);
      else result[key] = deepClone(value);
    }
    return result;
  }

  function cleanText(value, fallback = '') {
    const text = String(value ?? '').trim();
    return text || fallback;
  }

  function cleanList(value, maximum = 32) {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.map(item => cleanText(item)).filter(Boolean))].slice(0, maximum);
  }

  function sanitizeId(value, fallback) {
    const cleaned = cleanText(value, fallback)
      .toLowerCase()
      .replace(/[^\p{L}\p{N}_-]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64);
    return cleaned || fallback;
  }

  function pickUnknown(raw, knownKeys) {
    if (!isPlainObject(raw)) return {};
    const known = new Set(knownKeys);
    return Object.fromEntries(Object.entries(raw).filter(([key]) => !known.has(key)).map(([key, value]) => [key, deepClone(value)]));
  }

  function emptyAttributes(value = 0) {
    return Object.fromEntries(ATTRIBUTE_KEYS.map(key => [key, value]));
  }

  function normalizeAttributeMap(raw, minimum = -999, maximum = 999, fallback = 0) {
    const source = isPlainObject(raw) ? raw : {};
    return Object.fromEntries(ATTRIBUTE_KEYS.map(key => [key, round(clamp(source[key] ?? fallback, minimum, maximum))]));
  }

  function canonicalDamageType(value) {
    const aliases = {
      钝击:'物理',斩击:'物理',穿刺:'物理',火焰:'火',高温:'火',寒冰:'冰',冰霜:'冰',寒冷:'冰',
      雷电:'雷',电击:'雷',声音:'风',声波:'风',震荡:'风',毒:'毒蚀',毒素:'毒蚀',腐蚀:'毒蚀',酸蚀:'毒蚀',
      光明:'光',神圣:'光',黑暗:'暗',阴影:'暗',心灵:'精神',梦境:'精神',幻象:'精神',记忆:'精神',情绪:'精神',力场:'毁灭'
    };
    const type = aliases[cleanText(value)] ?? cleanText(value, '物理');
    return DAMAGE_TYPES.includes(type) ? type : '物理';
  }

  function damageTypeFamily(value) {
    const type = canonicalDamageType(value);
    return Object.entries(DAMAGE_FAMILIES).find(([, members]) => members.includes(type))?.[0] ?? '物理';
  }

  function resistanceMatches(values, damageType) {
    const list = cleanList(values).map(canonicalDamageType);
    const type = canonicalDamageType(damageType);
    return list.includes(type);
  }

  function normalizeAffinitySpectrum(raw, fallbackTags = []) {
    const source = isPlainObject(raw) ? raw : {};
    const strengthSource = isPlainObject(source.强度)
      ? source.强度
      : Object.fromEntries(Object.entries(source).filter(([, value]) => Number.isFinite(Number(value))));
    const fallback = cleanList(fallbackTags).filter(tag => AFFINITY_ATTRIBUTES.includes(tag));
    const strengths = Object.fromEntries(AFFINITY_ATTRIBUTES.map(attribute => [
      attribute,
      round(clamp(strengthSource[attribute] ?? (fallback.includes(attribute) ? 50 : 0), 0, 100))
    ]));
    const ranked = AFFINITY_ATTRIBUTES.filter(attribute => strengths[attribute] > 0)
      .sort((left, right) => strengths[right] - strengths[left] || left.localeCompare(right));
    const primary = cleanList(source.主属性).filter(attribute => AFFINITY_ATTRIBUTES.includes(attribute));
    const secondary = cleanList(source.副属性).filter(attribute => AFFINITY_ATTRIBUTES.includes(attribute) && !primary.includes(attribute));
    return {
      主属性: (primary.length ? primary : ranked.slice(0, 2)).slice(0, 3),
      副属性: (secondary.length ? secondary : ranked.slice(2, 6)).slice(0, 6),
      强度: strengths
    };
  }

  function abilityModifier(score) {
    return Math.floor((clamp(score, 1, 999) - 10) / 2);
  }

  function proficiencyBonus(effectiveLevel) {
    const config = FORMULA_CONFIG.熟练;
    return Math.min(config.最大, config.基础 + Math.floor((clamp(effectiveLevel, 1, 99) - 1) / config.每段等级));
  }

  function interpolateAnchors(value, xAnchors, yAnchors) {
    const x = Number(value) || 0;
    if (x <= xAnchors[0]) return yAnchors[0];
    const last = xAnchors.length - 1;
    if (x >= xAnchors[last]) return yAnchors[last];
    const upper = xAnchors.findIndex(anchor => anchor >= x);
    const lower = upper - 1;
    const ratio = (x - xAnchors[lower]) / (xAnchors[upper] - xAnchors[lower]);
    return yAnchors[lower] + (yAnchors[upper] - yAnchors[lower]) * ratio;
  }

  function interpolateLogAnchors(value, xAnchors, yAnchors) {
    const x = Number(value) || 0;
    const last = xAnchors.length - 1;
    const upper = x <= xAnchors[0]
      ? 1
      : x >= xAnchors[last]
        ? last
        : xAnchors.findIndex(anchor => anchor >= x);
    const lower = Math.max(0, upper - 1);
    const span = xAnchors[upper] - xAnchors[lower] || 1;
    const ratio = (x - xAnchors[lower]) / span;
    const lowerLog = Math.log(Math.max(1, yAnchors[lower]));
    const upperLog = Math.log(Math.max(1, yAnchors[upper]));
    return Math.exp(lowerLog + (upperLog - lowerLog) * ratio);
  }

  function growthAttributePointCost() {
    return 1;
  }

  function getMartialSoulGrade(value) {
    const grade = round(clamp(value, 1, 5));
    return deepClone(MARTIAL_SOUL_GRADES[grade - 1]);
  }

  function getSoulBeastGrade(value) {
    const grade = Number(value);
    if(!Number.isInteger(grade)||grade<1||grade>5)throw new Error('魂兽血脉阶级必须为一至五阶');
    return deepClone(SOUL_BEAST_GRADES[grade - 1]);
  }

  function getAgeTier(yearsInput) {
    const years = round(clamp(yearsInput, 1, Number.MAX_SAFE_INTEGER));
    const tier = AGE_TIERS.find(item => years >= item.最小 && years <= item.最大) ?? AGE_TIERS.at(-1);
    return {...deepClone(tier), 年限: years};
  }

  function soulBeastEffectiveLevel(years) { return beastValue.yearsLevel(Math.max(1,Math.round(Number(years)||1))); }

  function normalizeSixAttributes(raw) {
    const source = isPlainObject(raw) ? raw : {};
    const base = normalizeAttributeMap(source.基础, 1, 99, 10);
    const permanent = normalizeAttributeMap(source.永久加成, 0, 999, 0);
    const origin = normalizeAttributeMap(source.本源加成, 0, 999, 0);
    const temporary = normalizeAttributeMap(source.临时加成, -999, 999, 0);
    const effective = Object.fromEntries(ATTRIBUTE_KEYS.map(key => [key, Math.max(1, base[key] + permanent[key] + origin[key] + temporary[key])]));
    const modifiers = Object.fromEntries(ATTRIBUTE_KEYS.map(key => [key, abilityModifier(effective[key])]));
    return {基础: base, 永久加成: permanent, 本源加成:origin, 临时加成: temporary, 有效: effective, 调整值: modifiers};
  }

  // Authored innate bodies are independent paid sources, not equipment or ring gains.
  // Saves contain a reference only; authoritative grants always come from this registry.
  const nativeOrigins = new Map();
  const originHash=value=>globalThis.SoulAbilityContract.hash(value);
  function registerNativeOrigin(definition){
    const d=deepClone(definition);
    if(!d?.id||!d.recordId||!d.sourceId||d.version!==1||!Number.isSafeInteger(d.minimumLevel))throw Error('本源体质定义无效');
    const attributes=normalizeAttributeMap(d.attributes,0,999,0);
    if(originHash(attributes)!==originHash(d.attributes))throw Error('本源六维定义无效');
    const resources=d.resources;
    if(!resources||Object.keys(resources).some(k=>!['生命上限','魂力上限'].includes(k))||Object.values(resources).some(v=>!Number.isSafeInteger(v)||v<0))throw Error('本源资源定义无效');
    const spent=ATTRIBUTE_KEYS.reduce((n,k)=>n+attributes[k]*20,0)+Object.values(resources).reduce((n,v)=>n+v*12,0);
    if(d.bodyBudget!==spent||!Number.isSafeInteger(d.abilityBudget)||d.skills.reduce((n,s)=>n+s.budget,0)>d.abilityBudget)throw Error('本源价值账本不符');
    const hash=originHash(d),old=nativeOrigins.get(d.id);
    if(old&&old.hash!==hash)throw Error('本源定义重复');
    nativeOrigins.set(d.id,{definition:d,hash});return hash;
  }
  function nativeOriginBinding(id,ownerId){
    const entry=nativeOrigins.get(id);if(!entry)throw Error('本源体质未登记');const d=entry.definition;
    return {version:1,definitionId:id,definitionHash:entry.hash,recordId:d.recordId,sourceId:d.sourceId,ownerId,representation:'native'};
  }
  function nativeOriginDefinition(unit){
    const b=unit?.扩展?.nativeOrigin;if(!b)return null;
    const entry=nativeOrigins.get(b.definitionId);
    if(!entry||originHash(b)!==originHash(nativeOriginBinding(b.definitionId,unit.id))||unit.扩展?.角色库ID!==entry.definition.recordId||Number(unit.成长?.魂力等级??0)<entry.definition.minimumLevel)throw Error('本源体质与人物来源不符');
    return deepClone(entry.definition);
  }
  function nativeOriginResources(unit){return nativeOriginDefinition(unit)?.resources??{};}
  function validateNativeOriginUnit(unit){
    try{
      const d=nativeOriginDefinition(unit),expected=d?.attributes??emptyAttributes(0);
      if(originHash(unit.六维?.本源加成??emptyAttributes(0))!==originHash(expected))return ['人物本源六维与来源不符'];
      return [];
    }catch(e){return [e.message];}
  }

  const SOUL_MASTER_RANK_NAMES = Object.freeze(['魂士', '魂师', '大魂师', '魂尊', '魂宗', '魂王', '魂帝', '魂圣', '魂斗罗', '封号斗罗', '巅峰斗罗', '绝世斗罗']);
  // Narrative titles follow the same ten-level gates as ring progression; no stat changes.
  function soulMasterRankProfile(level) {
    if (!Number.isSafeInteger(level) || level < 1 || level > 99) return null;
    const base = SOUL_MASTER_RANK_NAMES[Math.floor((level - 1) / 10)];
    const name = level >= 96 ? soulMasterRealm(level).名称 : base;
    return {name, allowedTitles: [...new Set([base, name, '魂师'])], meaning: '依据已登记魂力等级的当前称谓；十级瓶颈不提前算作下一境界，魂师也可作职业泛称。称谓不授予魂环、技能、封号名或额外属性。'};
  }

  function soulMasterRealm(levelInput) {
    const level = round(clamp(levelInput, 1, 99));
    const quality = FORMULA_CONFIG.封号斗罗魂力质量;
    if (level === 99) return {名称: '绝世斗罗', 魂力质量倍率: quality[99], 原著增幅: '较九十八级约提升百分之四十'};
    if (level === 98) return {名称: '巅峰斗罗', 魂力质量倍率: quality[98], 原著增幅: '较九十七级约提升百分之三十'};
    if (level === 97) return {名称: '巅峰斗罗', 魂力质量倍率: quality[97], 原著增幅: '较九十六级约提升百分之二十'};
    if (level === 96) return {名称: '巅峰斗罗', 魂力质量倍率: quality[96], 原著增幅: '较九十五级约提升百分之二十'};
    if (level >= 91) return {名称: '封号斗罗', 魂力质量倍率: 1, 原著增幅: '九十一至九十五级保持线性成长'};
    return {名称: level === 90 ? '魂斗罗瓶颈' : '魂师', 魂力质量倍率: 1, 原著增幅: '常规线性成长'};
  }

  function normalizeTitleRecord(raw, levelInput = 1) {
    const source = isPlainObject(raw) ? raw : {};
    const level = round(clamp(levelInput, 1, 99));
    const cleanTitle = value => cleanText(value).replace(/[<>\u0000-\u001f\u007f]/g, '').replace(/(?:斗罗|冕下)$/u, '').slice(0, 8);
    const cleanEpithet = value => cleanText(value).replace(/[<>\u0000-\u001f\u007f]/g, '').slice(0, 120);
    const title = cleanTitle(source.封号);
    const candidateSource = isPlainObject(source.候选) ? source.候选 : {};
    const candidate = {
      封号: cleanTitle(candidateSource.封号),
      诗号: cleanEpithet(candidateSource.诗号)
    };
    const eligible = level >= 91;
    const status = title ? '已确认'
      : candidate.封号 ? '候选待确认'
        : eligible ? '待铸名' : '不可获取';
    return {
      状态: status,
      封号: title,
      诗号: cleanEpithet(source.诗号),
      来源: ['LLM提案', '玩家自定', '原著称号', '代码生成'].includes(source.来源) ? source.来源 : '',
      候选: candidate,
      重铸次数: round(clamp(source.重铸次数 ?? 0, 0, Number.MAX_SAFE_INTEGER)),
      取得等级: title ? round(clamp(source.取得等级 ?? level, 91, 99)) : 0
    };
  }

  function soulMasterCombatBonus(level, applicable = true) {
    return applicable ? Math.max(0, Math.min(4, Math.floor(Number(level) || 0) - 95)) : 0;
  }

  function combatRealm(unit) {
    const applicable = Boolean(unit) && !['魂兽', '普通人'].includes(unit.单位种类);
    const level = Number(unit?.派生?.有效等级 ?? unit?.成长?.魂力等级 ?? 0);
    return {quality: applicable ? soulMasterRealm(level).魂力质量倍率 : 1, bonus: soulMasterCombatBonus(level, applicable)};
  }

  function calculateDerived({attributes, effectiveLevel, equipmentStats = {}, nativeResources = {}, finalHealth, finalSoulPower, capacityModifier = 0, stabilityModifier = 0, healthMultiplier = 1, soulPowerMultiplier = 1, applySoulMasterRealm = true}) {
    const six = normalizeSixAttributes(attributes);
    const effective = six.有效;
    const level = round(clamp(effectiveLevel, 1, 99));
    const realm = applySoulMasterRealm ? soulMasterRealm(level) : {名称: '魂兽年限体系', 魂力质量倍率: 1, 原著增幅: '不适用'};
    const realmBonus = soulMasterCombatBonus(level, applySoulMasterRealm);
    const proficiency = proficiencyBonus(level);
    const hp = FORMULA_CONFIG.生命;
    const sp = FORMULA_CONFIG.魂力;
    const maxHealth = finalHealth ?? Number(nativeResources.生命上限??0) + Number(equipmentStats.生命上限??0) + Math.max(1, round((hp.基础 + level * hp.每有效等级 + Math.max(0, effective.体魄 - hp.体魄阈值) * hp.每点超额体魄) * clamp(healthMultiplier, 0.25, 5)));
    const maxSoulPower = finalSoulPower ?? Number(nativeResources.魂力上限??0) + Number(equipmentStats.魂力上限??0) + Math.max(0, round((level * sp.每有效等级 + effective.体魄 * sp.体魄 + effective.意志 * sp.意志 + effective.悟性 * sp.悟性) * clamp(soulPowerMultiplier, 0.25, 5) * realm.魂力质量倍率));
    const capacityRule = FORMULA_CONFIG.承载评分;
    const capacityScore = ATTRIBUTE_KEYS.reduce((sum, key) => sum + effective[key] * capacityRule.六维每点, 0) +
      Math.sqrt(maxHealth) * capacityRule.生命平方根 + Math.sqrt(maxSoulPower) * capacityRule.魂力平方根;
    const referenceScores = FORMULA_CONFIG.承载等级锚点.map(anchorLevel => {
      const anchorRealm = applySoulMasterRealm ? soulMasterRealm(anchorLevel) : {魂力质量倍率: 1};
      const anchorHealth = hp.基础 + anchorLevel * hp.每有效等级;
      const anchorSoulPower = (anchorLevel * sp.每有效等级 + 10 * sp.体魄 + 10 * sp.意志 + 10 * sp.悟性) * anchorRealm.魂力质量倍率;
      return 60 * capacityRule.六维每点 + Math.sqrt(anchorHealth) * capacityRule.生命平方根 + Math.sqrt(anchorSoulPower) * capacityRule.魂力平方根;
    });
    const ringCapacity = Math.max(1, round(interpolateLogAnchors(capacityScore, referenceScores, FORMULA_CONFIG.承载年限锚点)));
    return {
      有效等级: level,
      熟练加值: proficiency,
      生命上限: maxHealth,
      魂力上限: maxSoulPower,
      魂师阶段: realm.名称,
      魂力质量倍率: realm.魂力质量倍率,
      阶段增幅说明: realm.原著增幅,
      先攻: six.调整值.身法 + proficiency,
      物理防御: Number(equipmentStats.物理防御??0) + 10 + Math.floor((six.调整值.身法 + six.调整值.体魄) / 2) + Math.floor(proficiency / 2) + realmBonus,
      魂技防御: Number(equipmentStats.魂技防御??0) + 10 + six.调整值.意志 + Math.floor(proficiency / 2) + realmBonus,
      物理命中: proficiency + Math.max(six.调整值.力量, six.调整值.身法) + realmBonus,
      魂技命中: proficiency + Math.max(six.调整值.悟性, six.调整值.感知, six.调整值.意志) + realmBonus,
      魂技DC: 8 + proficiency + Math.max(six.调整值.悟性, six.调整值.感知, six.调整值.意志) + realmBonus,
      移动区: (effective.身法 >= 16 ? 2 : 1) + Number(equipmentStats.移动区??0),
      抗打断: 10 + proficiency + Math.max(six.调整值.体魄, six.调整值.意志) + realmBonus,
      魂环承载评分: round(capacityScore, 3),
      魂环承载上限: ringCapacity,
      身体容量: ringCapacity,
      灵魂稳定: ringCapacity,
      身体承载倍率: 1,
      灵魂承载倍率: 1,
      身体安全年限: ringCapacity,
      灵魂安全年限: ringCapacity
    };
  }

  function makeDefaultState() {
    return {
      系统: {
        schema_version: VERSION,
        ruleset_version: VERSION,
        storage_strategy: STORAGE_STRATEGY,
        revision: 0,
        last_transaction_id: '',
        last_error: '',
        migrated_from: '',
        formula_note: '魂环序号开放同一武魂的等级瓶颈；永久六维、生命与魂力决定魂环承载；每环获得2点自由属性；96级起境界提高战斗命中、防御与抵抗，自身攻击按双方魂力质量差异获得相对收益，不改变永久资源与承载',
        扩展: {}
      },
      角色: {已建立: false, 主控单位ID: '', 档案: {}, 扩展: {}},
      成长: {列表: {}},
      战斗单位: {列表: {}},
      武魂: {列表: {}, 草案: {列表: {}, 当前草案ID: ''}},
      魂环: {列表: {}, 待选择: {}},
      技能: {列表: {}},
      魂兽档案: {列表: {}},
      场景: {章节: '', 地点: '', 时间: '', 状态: '', 强制现场绑定: false, 当前魂兽ID: '', 上次吸收结果: {}, 扩展: {}},
      遭遇: {当前遭遇ID: '', 列表: {}},
      战斗: {
        id: '', 状态: '未开始', 回合: 0, 阶段: '无', 当前行动单位ID: '', 参与者ID列表: [],
        距离区顺序: ['接触', '近距', '中距', '远距', '极远'], 动作队列: [], 临时结算: {}, 最近结算单: {},
        扩展: {
          场景判定: {}, 成员: {}, 队伍: {}, 先攻: [], 先攻顺序: [], 随机: {},
          已结算行动: {}, 结算单列表: [], 击杀记录: [], 结果: {},
          区域效果: {}, 领域实例: {}, 召唤记录: {}, 撤退协助: {}, 武魂触发: {}
        }
      },
      状态实例: {列表: {}},
      战利品: {列表: {}},
      切磋: {当前: null, 历史: []},
      比赛: {当前: null, 历史: [], processedTransactions: {}},
      杀戮场: {当前: null, 历史: [], processedTransactions: {}},
      终局挑战: {当前: null, 历史: []},
      事务: {id: '', 类型: '无', 状态: '空闲', 请求提交: false, 提案: {}, 结算: {}},
      历史: [],
      扩展: {迁移保留: {}}
    };
  }

  function normalizeResource(raw, maximum, lifeState, allowZero = false) {
    const source = isPlainObject(raw) ? raw : {};
    const max = Math.max(allowZero ? 0 : 1, round(clamp(source.最大 ?? maximum, allowZero ? 0 : 1, Number.MAX_SAFE_INTEGER)));
    const currentDefault = lifeState === '死亡' ? 0 : max;
    const current = round(clamp(source.当前 ?? currentDefault, 0, max));
    return {
      当前: current,
      最大: max,
      临时: round(clamp(source.临时 ?? 0, 0, Number.MAX_SAFE_INTEGER)),
      锁定: allowZero ? round(clamp(source.锁定 ?? 0, 0, current)) : 0,
      持续消耗: allowZero ? round(clamp(source.持续消耗 ?? 0, 0, Number.MAX_SAFE_INTEGER)) : 0
    };
  }

  function normalizeCombatant(raw, context = {}) {
    const source = isPlainObject(raw) ? raw : {};
    const id = cleanText(source.id, context.id || 'combatant-unknown');
    const kind = UNIT_KINDS.includes(source.单位种类) ? source.单位种类 : (context.kind || '魂师NPC');
    const lifeState = LIFE_STATES.includes(source.存活状态) ? source.存活状态 : '存活';
    const native=nativeOriginDefinition(source);
    if(source.六维?.本源加成&&originHash(source.六维.本源加成)!==originHash(native?.attributes??emptyAttributes(0)))throw Error('人物本源六维与来源不符');
    const attributes = normalizeSixAttributes({...source.六维,本源加成:native?.attributes??emptyAttributes(0)});
    const beastGrade = getSoulBeastGrade(context.beastGrade ?? source.成长?.种族品级 ?? 1).数值;
    const beastYears = context.beastYears ?? source.成长?.年限 ?? 1;
    const effectiveLevel = kind === '魂兽'
      ? soulBeastEffectiveLevel(beastYears)
      : round(clamp(context.level ?? source.成长?.魂力等级 ?? 1, 1, 99));
    // 魂兽用体魄与生命池承受伤害；同等有效等级下，常规魂兽应当比魂师更耐打。
    // 年限进一步放大魂兽的生理优势。
    const beastAgeHealthScale = {十年: 1.18, 百年: 1.25, 千年: 1.32, 万年: 1.42, 十万年: 1.65, 百万年: 2.1}[getAgeTier(beastYears).名称] ?? 1.18;
    const beastHealthMultiplier = kind === '魂兽'
      ? beastAgeHealthScale
      : 1;
    const derived = calculateDerived({
      attributes,
      equipmentStats: source.扩展?.装备战斗修正??{},
      nativeResources:native?.resources??{},
      effectiveLevel,
      martialSoulGrade: context.martialSoulGrade ?? 3,
      capacityModifier: context.capacityModifier ?? 0,
      stabilityModifier: context.stabilityModifier ?? 0,
      healthMultiplier: beastHealthMultiplier,
      applySoulMasterRealm: kind !== '魂兽' && kind !== '普通人',
      ...(kind==='普通人'?{finalSoulPower:0}:{})
    });
    // Summoned carriers may freeze the source's derived combat scores alongside
    // their already frozen inherited attributes. The deployment proof verifies it.
    for(const key of ['先攻','物理防御','魂技防御','物理命中','魂技命中','魂技DC','移动区','抗打断'])if(Number.isFinite(source.扩展?.召唤?.继承派生?.[key]))derived[key]=source.扩展.召唤.继承派生[key];
    const health = normalizeResource(source.资源?.生命, derived.生命上限, lifeState, false);
    if (lifeState === '死亡') health.当前 = 0;
    const soulPower = normalizeResource(source.资源?.魂力, derived.魂力上限, lifeState, true);
    const duplicateStatus = Object.fromEntries(
      ['状态', '状态实例', '状态ID列表']
        .filter(key => Object.hasOwn(source, key))
        .map(key => [key, deepClone(source[key])])
    );
    const knownKeys = [
      'id', '名称', '阵营', '单位种类', '体型', '标签', '存活状态', '六维', '资源', '派生',
      '属性谱', '抗性', '能力', '位置', '成长', '扩展', '状态', '状态实例', '状态ID列表'
    ];
    const damageImmunity = cleanList(source.抗性?.伤害免疫 ?? source.抗性?.免疫).map(canonicalDamageType);
    const lifeTags=cleanList([...(source.标签??[]),'生命',...(/亡灵|不死|尸骸|幽魂/.test(`${source.名称??''}${(source.标签??[]).join('')}`)?['死亡']:[])]);
    return {
      id,
      名称: cleanText(source.名称, '未命名单位'),
      阵营: cleanText(source.阵营, kind === '魂兽' ? '野生' : '中立'),
      单位种类: kind,
      体型: cleanText(source.体型, '中型'),
      标签: cleanList(source.标签),
      存活状态: lifeState,
      六维: attributes,
      属性谱: normalizeAffinitySpectrum(source.属性谱, lifeTags),
      资源: {生命: health, 魂力: soulPower},
      派生: derived,
      抗性: {
        伤害抗性: cleanList(source.抗性?.伤害抗性).map(canonicalDamageType),
        伤害免疫: damageImmunity,
        伤害易伤: cleanList(source.抗性?.伤害易伤 ?? source.抗性?.易伤).map(canonicalDamageType),
        属性吸收: cleanList(source.抗性?.属性吸收).map(canonicalDamageType),
        状态抗性: cleanList(source.抗性?.状态抗性),
        状态免疫: cleanList(source.抗性?.状态免疫),
        免疫: damageImmunity,
        易伤: cleanList(source.抗性?.伤害易伤 ?? source.抗性?.易伤).map(canonicalDamageType),
        解剖限制: cleanList(source.抗性?.解剖限制)
      },
      能力: {
        基础动作ID: cleanList([...(source.能力?.基础动作ID ?? []), 'ordinary.attack']),
        // 双武魂、十万年双魂技和多块魂骨叠加后会合法超过32项；
        // 这里是行动/UI共同入口，不能沿用普通标签列表的默认截断上限。
        技能ID: cleanList(source.能力?.技能ID, 256),
        反应ID: cleanList(source.能力?.反应ID),
        被动ID: cleanList(source.能力?.被动ID)
      },
      位置: {
        距离区: DISTANCE_ZONES.includes(source.位置?.距离区) ? source.位置.距离区 : '未部署',
        站位簇: cleanText(source.位置?.站位簇),
        战场坐标: {
          x: Number.isFinite(Number(source.位置?.战场坐标?.x)) ? clamp(source.位置.战场坐标.x, 0, 100) : null,
          y: Number.isFinite(Number(source.位置?.战场坐标?.y)) ? clamp(source.位置.战场坐标.y, 0, 100) : null
        },
        地形标签: cleanList(source.位置?.地形标签),
        掩体: cleanText(source.位置?.掩体, '无'),
        高度: ['地面', '低空', '高空'].includes(source.位置?.高度) ? source.位置.高度 : '地面',
        接战单位ID: cleanList(source.位置?.接战单位ID)
      },
      成长: kind === '魂兽'
        ? {
          类型: '魂兽', 年限: round(clamp(beastYears, 1, Number.MAX_SAFE_INTEGER)),
          种族品级: round(beastGrade),
          有效等级: effectiveLevel
        }
        : kind==='普通人'?{类型:'普通人',魂力等级:0,成长记录ID:''}: {类型: '魂师', 魂力等级: effectiveLevel, 成长记录ID: cleanText(source.成长?.成长记录ID, id)},
      扩展: deepMerge(isPlainObject(source.扩展) ? source.扩展 : {}, {
        保留字段: pickUnknown(source, knownKeys),
        迁移状态副本: duplicateStatus
      })
    };
  }

  function normalizeMartialSoul(raw, ownerId) {
    const source = isPlainObject(raw) ? raw : {};
    let compiled = source.扩展?.结构化武魂 ?? source.结构化武魂 ?? source.系统编译;
    if (!compiled?.quality || !compiled?.definition || !Array.isArray(compiled?.allowedEffectIds)) {
      throw new Error(`武魂${cleanText(source.名称, source.id)}缺少v1.10代码终审结构，不能登记`);
    }
    compiled = martialSoulCore.normalizeCompiledAttributes(compiled);
    const grade = getMartialSoulGrade(compiled.quality.value);
    const attributeAffinity = Object.fromEntries((compiled.attributes ?? []).map(item => [item.name, martialSoulCore.attributeStrength(item)]));
    const attributeNames = Object.keys(attributeAffinity);
    return {
      id: cleanText(source.id, compiled.id || `wuhun-${sanitizeId(compiled.name, 'unknown')}`),
      持有者单位ID: cleanText(source.持有者单位ID, ownerId),
      名称: cleanText(source.名称, compiled.name),
      品级: grade.数值,
      品级标签: grade.标签,
      品级规则版本: VERSION,
      形态: cleanText(source.形态, compiled.definition.form),
      显现状态: cleanText(source.显现状态, '已显现'),
      定位: cleanText(source.定位, compiled.definition.role),
      类别标签: cleanList(compiled.semanticTags),
      属性标签: attributeNames,
      属性谱: {契合: attributeAffinity, 主属性: attributeNames.slice(0, 2), 副属性: attributeNames.slice(2, 6)},
      表达机制: cleanList((compiled.channels ?? []).flatMap(item => [item.id, item.name, ...(item.tags ?? [])])),
      先天特性: cleanList((compiled.traits ?? []).map(item => martialSoulCore.TRAIT_TEMPLATES.find(template => template.id === item.templateId)?.name)),
      转化效率修正: round(compiled.quality.conversion - 1, 4),
      转化效率倍率: round(compiled.quality.conversion, 4),
      身体容量修正: 0,
      灵魂稳定修正: 0,
      魂环ID列表: cleanList(source.魂环ID列表),
      扩展: deepMerge(isPlainObject(source.扩展) ? source.扩展 : {}, {
        结构化武魂: deepClone(compiled),
        价值账本: deepClone(compiled.pricing),
        允许效果ID: cleanList(compiled.allowedEffectIds),
        机械钩子: deepClone(compiled.mechanicalHooks ?? []),
        专属基础动作: deepClone(compiled.baseAction)
      })
    };
  }

  function finalizeMartialSoulDraft(rawDraft, options = {}) {
    const compiled = martialSoulCore.finalizeDraft(rawDraft, options);
    return normalizeMartialSoul({id: options.id ?? compiled.id, 持有者单位ID: options.ownerId, 名称: compiled.name, 结构化武魂: compiled}, options.ownerId);
  }

  function stripMartialSoulCombatModifiers(rawUnit) {
    const unit = rawUnit;
    const summary = unit?.扩展?.武魂战斗修正;
    if (!unit || !summary) return unit;
    for (const key of ATTRIBUTE_KEYS) {
      const amount = Number(summary.六维临时加成?.[key] ?? 0);
      if (amount) unit.六维.临时加成[key] = Number(unit.六维.临时加成?.[key] ?? 0) - amount;
    }
    const remove = (values, removed) => cleanList(values).filter(value => !cleanList(removed).includes(value));
    unit.能力.被动ID = remove(unit.能力.被动ID, summary.武魂被动ID);
    unit.能力.基础动作ID = remove(unit.能力.基础动作ID, ['martial.base']);
    delete unit.扩展.武魂战斗修正;
    delete unit.扩展.武魂基础动作;
    return unit;
  }

  function applyMartialSoulCombatModifiers(rawUnit, soul, state=null) {
    const unit = rawUnit;
    const original=soul?.扩展?.结构化武魂;
    if (!unit || !original) return unit;
    const sealed=!!state&&controls.martialSoulSealed(state,unit.id,soul.id);
    const compiled = sealed?{...original,mechanicalHooks:[]}:original;
    const summary = {
      基础动作威力:0, 基础动作命中:0, 魂技威力:0, 魂力折扣:0, 维持减耗:0,
      检定加值:{物理攻击:0,魂技攻击:0,魂技DC:0}, 豁免优势:[], 先攻优势:false,
      挣脱加值:0, 撤退加值:0, 属性专精:[], 机制专修:[],
      击杀回魂比例:0, 魂力消耗倍率:1, 维持额外消耗:0,
      首回合禁用高阶机制:false, 破损攻击减值:0,
      防御加值:{物理防御:0,魂技防御:0},
      来源武魂ID:soul.id,
      封印:sealed,
      六维临时加成:emptyAttributes(0), 获得抗性:[], 获得易伤:[], 武魂被动ID:[]
    };
    const abilityBonuses = emptyAttributes(0);
    const originalHpMax=unit.资源.生命.最大; const originalSpMax=unit.资源.魂力.最大;
    let soulCapacityMultiplier=1;
    for (const hook of (state?globalThis.SoulAbilityExchange.hooks(state,unit.id,compiled):compiled.mechanicalHooks??[])) {
      const level = round(clamp(hook.level ?? 1, 1, 3));
      const attributeName=martialSoulCore.ATTRIBUTE_REGISTRY[hook.parameter]?.name;
      if(hook.type==='abilityScore'&&ATTRIBUTE_KEYS.includes(hook.parameter))abilityBonuses[hook.parameter]+=level;
      else if(hook.type==='checkBonus'&&Object.hasOwn(summary.检定加值,hook.parameter))summary.检定加值[hook.parameter]+=1;
      else if(hook.type==='saveAdvantage'&&ATTRIBUTE_KEYS.includes(hook.parameter))summary.豁免优势.push(hook.parameter);
      else if(hook.type==='initiativeAdvantage')summary.先攻优势=true;
      else if(hook.type==='breakFreeBonus')summary.挣脱加值+=2;
      else if(hook.type==='escapeBonus')summary.撤退加值+=2;
      else if(hook.type==='soulPowerCapacity')soulCapacityMultiplier*=1.1;
      else if(hook.type==='soulPowerDiscount')summary.魂力折扣=Math.min(0.3,summary.魂力折扣+0.1);
      else if(hook.type==='sustainDiscount')summary.维持减耗+=1;
      else if(hook.type==='killSoulRecovery')summary.击杀回魂比例=0.1;
      else if(hook.type==='attributeMastery'&&hook.parameter)summary.属性专精.push(hook.parameter);
      else if(hook.type==='channelMastery'&&hook.parameter)summary.机制专修.push(hook.parameter);
      else if(hook.type==='baseActionPower')summary.基础动作威力+=1;
      else if(hook.type==='baseActionAccuracy')summary.基础动作命中+=1;
      else if(hook.type==='defenseBonus'&&hook.parameter==='物理防御')summary.防御加值.物理防御+=1;
      else if(hook.type==='defenseBonus'&&hook.parameter==='魂技防御')summary.防御加值.魂技防御+=1;
      else if(hook.type==='soulCostIncrease')summary.魂力消耗倍率*=1.25;
      else if(hook.type==='advancedFirstRoundLock')summary.首回合禁用高阶机制=true;
      else if(hook.type==='sustainCostIncrease')summary.维持额外消耗+=1;
      else if(hook.type==='damagedAttackPenalty')summary.破损攻击减值=1;
    }
    if(Object.values(abilityBonuses).some(Boolean)){
      summary.六维临时加成=deepClone(abilityBonuses);
      const attributes=deepClone(unit.六维); attributes.临时加成=Object.fromEntries(ATTRIBUTE_KEYS.map(key=>[key,(attributes.临时加成?.[key]??0)+abilityBonuses[key]]));
      const six=normalizeSixAttributes(attributes); unit.六维=six;
      unit.派生=calculateDerived({attributes,effectiveLevel:unit.派生.有效等级,equipmentStats:unit.扩展?.装备战斗修正??{},nativeResources:nativeOriginResources(unit),applySoulMasterRealm:!['魂兽','普通人'].includes(unit.单位种类)});
    }
    unit.派生.物理防御+=summary.防御加值.物理防御;
    unit.派生.魂技防御+=summary.防御加值.魂技防御;
    unit.派生.魂力上限=Math.max(0,round((unit.派生.魂力上限-Number(unit.扩展?.装备战斗修正?.魂力上限??0))*soulCapacityMultiplier))+Number(unit.扩展?.装备战斗修正?.魂力上限??0);
    refreshEquipmentCapacity(unit);
    unit.资源.生命.最大=unit.派生.生命上限; unit.资源.魂力.最大=unit.派生.魂力上限;
    if(unit.资源.生命.当前===originalHpMax)unit.资源.生命.当前=unit.资源.生命.最大;
    if(unit.资源.魂力.当前===originalSpMax)unit.资源.魂力.当前=unit.资源.魂力.最大;
    summary.武魂被动ID=cleanList((compiled.mechanicalHooks ?? []).map(item => item.sourceId).filter(id => !cleanList(unit.能力.被动ID).includes(id)));
    summary.豁免优势=cleanList(summary.豁免优势); summary.属性专精=cleanList(summary.属性专精); summary.机制专修=cleanList(summary.机制专修); summary.获得抗性=cleanList(summary.获得抗性); summary.获得易伤=cleanList(summary.获得易伤);
    unit.扩展 = deepMerge(unit.扩展 ?? {}, {武魂战斗修正: summary});
    if (unit.单位种类 === '魂兽') delete unit.扩展.武魂基础动作;
    else unit.扩展.武魂基础动作 = deepClone(compiled.baseAction);
    unit.能力.基础动作ID = cleanList([...(unit.能力.基础动作ID ?? []), 'ordinary.attack', ...(unit.单位种类==='魂兽'?[]:['martial.base'])]);
    unit.能力.被动ID = cleanList([...(unit.能力.被动ID ?? []), ...(compiled.mechanicalHooks ?? []).map(item => item.sourceId)]);
    return unit;
  }

  function refreshEquipmentCapacity(unit) {
    if(!Number(unit.扩展?.装备战斗修正?.生命上限??0)&&!Number(unit.扩展?.装备战斗修正?.魂力上限??0))return unit;
    const d=calculateDerived({attributes:unit.六维,effectiveLevel:unit.派生.有效等级,finalHealth:unit.派生.生命上限,finalSoulPower:unit.派生.魂力上限,applySoulMasterRealm:unit.单位种类!=='魂兽'});
    for(const key of ['魂环承载评分','魂环承载上限','身体容量','灵魂稳定','身体安全年限','灵魂安全年限'])unit.派生[key]=d[key];
    return unit;
  }

  function equipmentElementSummary(state,unitId){
    const raw={},values={},excess={},sources={};
    const ids=new Set(Object.values(state.装备?.配置?.[unitId]?.slots??{}).filter(Boolean));
    for(const id of ids){
      const item=state.物品?.实例?.[id];
      if(!item||item.type!=='魂导器'||item.ownerEntityId!==unitId||item.quantity<1||!controls.itemEffectsAllowed(state,unitId,item))continue;
      for(const [type,percent] of Object.entries(equipment.elementsFromGraph(item.payload?.passiveEffectGraph))){
        if(globalThis.SoulControlCore.adultReason(state,unitId,{params:{类型:type}}))continue;
        if(!DAMAGE_TYPES.includes(type))throw new Error('未登记的属性伤害增幅类型：'+type);
        raw[type]=(raw[type]??0)+percent;(sources[type]??=[]).push({itemId:id,name:item.name,percent});
      }
    }
    for(const [type,n] of Object.entries(raw)){values[type]=Math.min(equipment.ELEMENT_LIMITS.total,n);if(n>values[type])excess[type]=n-values[type];}
    return {raw,values,excess,sources};
  }
  function elementDamageProfile(state,unitId,type){
    const damageType=canonicalDamageType(type),summary=equipmentElementSummary(state,unitId);
    return {damageType,percent:summary.values[damageType]??0,sources:summary.sources[damageType]??[]};
  }
  function amplifyElementDamage(amount,profile={}){
    const before=Math.max(0,Math.floor(amount)),percent=Math.min(60,Math.max(0,Number(profile.percent??0)))+Math.max(0,Number(profile.supportPercent??0));
    const total=Math.floor(before*(100+percent)/100);
    return {before,amount:total,gain:total-before,percent,sources:deepClone(profile.sources??[]),damageType:profile.damageType};
  }

  // Battle statuses have raw-score units. This view never overwrites persistent
  // attributes or ring capacity, so absorption cannot bank a temporary form.
  const battleReads=new WeakMap(),battleDefenseReads=new WeakMap();
  function withBattleReadCache(state,read){const previous=battleReads.get(state);if(!previous){battleReads.set(state,new Map());battleDefenseReads.set(state,new Map());}try{return read();}finally{if(!previous){battleReads.delete(state);battleDefenseReads.delete(state);}}}
  function battleAttributeView(state,unit){const cache=battleReads.get(state);if(cache?.has(unit))return cache.get(unit);const value=battleAttributeViewUncached(state,unit);cache?.set(unit,value);return value;}
  function battleAttributeViewUncached(state,unit){
    if(unit.存活状态!=='存活'&&(unit.存活状态==='死亡'||!(globalThis.SoulAttributeLinks?.sources(state,unit.id).length)))return {attributes:unit.六维,derived:unit.派生};
    const statuses=globalThis.SoulControlCore?.active(state,unit.id)??Object.values(state.状态实例?.列表??{}).filter(s=>s.目标单位ID===unit.id&&s.状态!=='已结束');
    let form=0,avatar=0;
    const bonuses=Object.fromEntries(ATTRIBUTE_KEYS.map(key=>[key,{positive:0,negative:0}]));
    for(const status of statuses){const params=status.快照?.参数??{};
      if(status.模板ID==='transform.form')form=Math.max(form,Number(params.属性加值??0));
      else if(status.模板ID==='transform.martial_avatar')avatar=Math.max(avatar,Number(params.属性增幅档??0));
      else if(status.模板ID==='status.buff'&&Object.hasOwn(bonuses,params.属性)){const row=bonuses[params.属性],value=Number(params.数值);row.positive=Math.max(row.positive,value);row.negative=Math.min(row.negative,value);}
      else if(status.模板ID==='status.amplify'&&Object.hasOwn(bonuses,params.指标)){const row=bonuses[params.指标];row.positive=Math.max(row.positive,globalThis.SoulSupportCore.value(state,status));}
    }
    // Host attributes use the same strongest-negative rule as status.buff.
    // A preset that already emits the penalty must not charge it a second time.
    for(const item of globalThis.SoulHostCore?.hostItems(state,unit.id)??[]){
      const penalty=globalThis.SoulHostCore.capabilityActive(state,item,'binding')?globalThis.SoulHostCore.read(item).capabilities.binding?.agilityPenalty??0:0;
      bonuses.身法.negative=Math.min(bonuses.身法.negative,-penalty);
    }
    const linked=globalThis.SoulAttributeLinks?.bonuses(state,unit)??{};
    const extras=ATTRIBUTE_KEYS.map(key=>bonuses[key].positive+bonuses[key].negative+form+2*avatar+(linked[key]??0));
    const direct=Object.fromEntries(['魂技DC','移动区'].map(key=>[key,globalThis.SoulSupportCore?.stat(state,unit.id,key)??0]));
    if(extras.every(value=>value===0))return {attributes:unit.六维,derived:{...unit.派生,...Object.fromEntries(Object.entries(direct).map(([key,value])=>[key,unit.派生[key]+value]))}};
    const attributes=deepClone(unit.六维);
    ATTRIBUTE_KEYS.forEach((key,index)=>{attributes.临时加成[key]+=extras[index];});
    const nextAttributes=normalizeSixAttributes(attributes),native=nativeOriginDefinition(unit),kind=unit.单位种类;
    const healthMultiplier=kind==='魂兽'?({十年:1.18,百年:1.25,千年:1.32,万年:1.42,十万年:1.65,百万年:2.1}[getAgeTier(unit.成长.年限).名称]??1.18):1;
    const options={effectiveLevel:unit.派生.有效等级,equipmentStats:unit.扩展?.装备战斗修正??{},nativeResources:native?.resources??{},healthMultiplier,applySoulMasterRealm:!['魂兽','普通人'].includes(kind),...(kind==='普通人'?{finalSoulPower:0}:{})};
    const base={派生:calculateDerived({...options,attributes:unit.六维})},next={六维:nextAttributes,派生:calculateDerived({...options,attributes:nextAttributes})},derived={...unit.派生};
    for(const key of ['生命上限','魂力上限','先攻','物理防御','魂技防御','物理命中','魂技命中','魂技DC','移动区','抗打断']){
      let delta=next.派生[key]-base.派生[key];
      if(key==='魂力上限'){
        const equipment=Number(unit.扩展?.装备战斗修正?.魂力上限??0);
        delta=Math.round(delta*(unit.派生[key]-equipment)/Math.max(1,base.派生[key]-equipment));
      }
      derived[key]+=delta;
    }
    for(const [key,value]of Object.entries(direct))derived[key]+=value;
    return {attributes:next.六维,derived};
  }
  function refreshBattleAttributeResources(state,unit,options={}){
    if(!unit)return;
    const {derived}=battleAttributeView(state,unit);
    for(const [resource,key] of [['生命','生命上限'],['魂力','魂力上限']]){
      // Summon resource allocation is frozen separately from raw-score scaling.
      const summonBase=unit.扩展?.召唤?.基础资源上限?.[resource];
      if(unit.扩展?.召唤&&!Number.isFinite(summonBase))throw new Error('召唤单位缺少当前规则的基础资源快照');
      const maximum=unit.扩展?.召唤?summonBase+derived[key]-unit.派生[key]:derived[key];
      const pool=unit.资源[resource];pool.最大=Math.max(resource==='生命'?1:0,maximum);
      pool.当前=Math.min(pool.当前,pool.最大);
      if(resource==='魂力'&&options.reconcile!==false)globalThis.SoulCombatEngine?.reconcilePowerCapacity(state);
    }
  }

  function ownedMartialSoulIds(state, unitId) {
    return cleanList(state?.成长?.列表?.[unitId]?.武魂ID列表).filter(id => state?.武魂?.列表?.[id]?.持有者单位ID === unitId);
  }

  function activeMartialSoulId(state, unitId) {
    const growth = state?.成长?.列表?.[unitId];
    const owned = ownedMartialSoulIds(state, unitId);
    return owned.includes(growth?.激活武魂ID) ? growth.激活武魂ID : '';
  }

  function activeMartialSoul(state, unitId) {
    return state?.武魂?.列表?.[activeMartialSoulId(state, unitId)] ?? null;
  }

  function beastLineageSource(state,unitId){
    const profile=Object.values(state.魂兽档案?.列表??{}).find(item=>item.单位ID===unitId);
    return profile?{id:profile.id,名称:profile.名称,扩展:{结构化武魂:profile.血脉.compiled}}:null;
  }

  function refreshActiveMartialSoul(state, unitId, options = {}) {
    const current = state?.战斗单位?.列表?.[unitId];
    if (!current) throw new Error(`战斗单位不存在：${unitId}`);
    const growth = state.成长?.列表?.[unitId];
    const soul = activeMartialSoul(state, unitId) ?? beastLineageSource(state,unitId);
    const beastProfile = Object.values(state.魂兽档案?.列表 ?? {}).find(profile => profile.单位ID === unitId);
    const source = stripMartialSoulCombatModifiers(deepClone(current));
    const oldHealth = deepClone(current.资源?.生命 ?? {});
    const oldSoulPower = deepClone(current.资源?.魂力 ?? {});
    const normalized = normalizeCombatant(source, {
      id: unitId,
      kind: current.单位种类,
      level: growth?.魂力等级 ?? current.成长?.魂力等级 ?? 1,
      beastYears: current.成长?.年限,
      beastGrade: current.成长?.种族品级,
      martialSoulGrade: soul?.品级 ?? 3,
      capacityModifier: soul?.身体容量修正 ?? 0,
      stabilityModifier: soul?.灵魂稳定修正 ?? 0
    });
    if (soul) applyMartialSoulCombatModifiers(normalized, soul,state);
    refreshBattleAttributeResources(state,normalized);
    if (options.preserveResources !== false) {
      normalized.资源.生命.当前 = clamp(oldHealth.当前 ?? normalized.资源.生命.当前, 0, normalized.资源.生命.最大);
      normalized.资源.生命.临时 = clamp(oldHealth.临时 ?? 0, 0, Number.MAX_SAFE_INTEGER);
      normalized.资源.魂力.当前 = clamp(oldSoulPower.当前 ?? normalized.资源.魂力.当前, 0, normalized.资源.魂力.最大);
      normalized.资源.魂力.锁定 = Math.max(0,oldSoulPower.锁定 ?? 0);
      normalized.资源.魂力.持续消耗 = clamp(oldSoulPower.持续消耗 ?? 0, 0, Number.MAX_SAFE_INTEGER);
    }
    const result=options.inPlace?commitStateDraft(current,normalized):normalized;
    state.战斗单位.列表[unitId] = result;
    globalThis.SoulCombatEngine?.reconcilePowerCapacity(state);
    return result;
  }

  function refreshSoulSeal(state,unitId){
    const unit=state.战斗单位?.列表?.[unitId],soul=unit&&(activeMartialSoul(state,unitId)??beastLineageSource(state,unitId));
    if(unit&&soul&&Boolean(unit.扩展?.武魂战斗修正?.封印)!==controls.martialSoulSealed(state,unitId,soul.id))return refreshActiveMartialSoul(state,unitId,{inPlace:true});
    return unit;
  }

  function releaseDomainMaintenance(state, domain) {
    for(const target of Object.values(state.战斗单位?.列表??{}))if(domain?.id&&target.扩展?.temporaryHealthDomainId===domain.id)clearTemporaryHealth(target);
    const unit = state.战斗单位?.列表?.[domain?.来源?.单位ID];
    const ledger = domain?.维持;
    if (!unit || !ledger?.需要) return;
    unit.资源.魂力.锁定 = Math.max(0,Number(unit.资源.魂力.锁定 ?? 0)-Number(ledger.锁定魂力 ?? 0));
    unit.资源.魂力.持续消耗 = Math.max(0,Number(unit.资源.魂力.持续消耗 ?? 0)-Number(ledger.每回合魂力 ?? 0));
    ledger.需要 = false;
    const entries=state.战斗?.扩展?.维持占用??{};
    for(const [id,entry] of Object.entries(entries))if(entry.domainId===domain.id)delete entries[id];
  }

  function switchActiveMartialSoul(state, unitId, targetSoulId, options={}) {
    const growth = state?.成长?.列表?.[unitId];
    const owned = ownedMartialSoulIds(state, unitId);
    if (!growth || targetSoulId&&!owned.includes(targetSoulId)) throw new Error('目标武魂不属于该魂师');
    if(targetSoulId)controls.assertAction(state,unitId,'switch-soul',{soulId:targetSoulId});
    const previousSoulId = activeMartialSoulId(state, unitId);
    if (previousSoulId === targetSoulId) return {unit: state.战斗单位.列表[unitId], previousSoulId, targetSoulId, endedStatusIds: [], endedDomainIds: []};
    const avatar = Object.values(state.状态实例?.列表 ?? {}).find(status => status.目标单位ID === unitId && status.模板ID === 'transform.martial_avatar' && status.状态 !== '已结束');
    if (avatar) throw new Error('武魂真身持续期间不能切换武魂');
    const endedStatusIds = [];
    for (const [statusId, status] of Object.entries(state.状态实例?.列表 ?? {})) {
      if (status.来源?.单位ID !== unitId || status.来源?.武魂ID !== previousSoulId) continue;
      if (!status.扩展?.锁定魂力 && !status.扩展?.每回合魂力 && status.模板ID !== 'sustain.maintain') continue;
      const unit = state.战斗单位.列表[unitId];
      unit.资源.魂力.锁定 = Math.max(0, Number(unit.资源.魂力.锁定 ?? 0) - Number(status.扩展?.锁定魂力 ?? 0));
      unit.资源.魂力.持续消耗 = Math.max(0, Number(unit.资源.魂力.持续消耗 ?? 0) - Number(status.扩展?.每回合魂力 ?? 0));
      delete state.状态实例.列表[statusId];
      endedStatusIds.push(statusId);
    }
    const endedDomainIds = [];
    for (const [domainId, domain] of Object.entries(state.战斗?.扩展?.领域实例 ?? {})) {
      if (domain.来源?.单位ID === unitId && domain.来源?.武魂ID === previousSoulId) {
        releaseDomainMaintenance(state,domain);
        delete state.战斗.扩展.领域实例[domainId];
        endedDomainIds.push(domainId);
      }
    }
    for (const [zoneId, zone] of Object.entries(state.战斗?.扩展?.区域效果 ?? {})) {
      if (zone.来源?.单位ID === unitId && zone.来源?.武魂ID === previousSoulId && zone.扩展?.维持型) delete state.战斗.扩展.区域效果[zoneId];
    }
    growth.激活武魂ID = targetSoulId;
    globalThis.SoulAbilityExchange.reconcile(state);
    const compiled=state.武魂?.列表?.[targetSoulId]?.扩展?.结构化武魂;
    if(compiled?.exchangeContracts?.some(c=>c.mode!=='condition'))globalThis.SoulAbilityExchange.pay(state,unitId,compiled,options.operationId??`soul:${unitId}:${state.系统.revision}`,null,{kind:'martialSoul',paidOnly:true});
    const unit = refreshActiveMartialSoul(state, unitId);
    return {unit, previousSoulId, targetSoulId, endedStatusIds, endedDomainIds};
  }

  function normalizeSoulBeastProfile(raw, unitId) {
    const source = isPlainObject(raw) ? raw : {};
    const years = round(clamp(source.年限 ?? 1, 1, Number.MAX_SAFE_INTEGER));
    const tier = getAgeTier(years);
    const lineage = beastValue.validateLineage(source.血脉);
    const grade = getSoulBeastGrade(lineage.grade.value);
    const paidAttributes=lineage.compiled.attributes;
    const paidNames=paidAttributes.map(item=>item.name);
    const declaredPrimary=cleanList(source.属性谱?.主属性).filter(name=>paidNames.includes(name));
    const primary=declaredPrimary.length?declaredPrimary:paidNames.slice(0,2);
    return {
      id: cleanText(source.id, `beast-profile-${sanitizeId(unitId, 'unknown')}`),
      单位ID: cleanText(source.单位ID, unitId),
      物种ID: cleanText(source.物种ID, `species-${sanitizeId(source.名称, 'unknown')}`),
      名称: cleanText(source.名称, '未命名魂兽'),
      年限: years,
      年限档: tier.名称,
      种族品级: grade.数值,
      品级标签: grade.标签,
      品级规则版本: beastValue.VERSION,
      血脉: lineage,

      完整度: round(clamp(source.完整度 ?? 1, 0, 1), 3),
      成长阶段: cleanText(source.成长阶段, tier.名称),
      类别标签: cleanList(source.类别标签),
      // Frozen source proofs follow the descriptive traits. Keep the supplied
      // bounded record intact; normalization must not invent missing proofs.
      种族特征: cleanList(source.种族特征 ?? source.特性, 128),
      个体变异: cleanList(source.个体变异),
      解剖标签: cleanList(source.解剖标签),
      属性谱: {主属性:primary,副属性:paidNames.filter(name=>!primary.includes(name)),强度:Object.fromEntries(paidAttributes.map(item=>[item.name,martialSoulCore.attributeStrength(item)]))},
      肉身威胁: round(clamp(source.肉身威胁 ?? 1, 0.5, 2), 3),
      精神威胁: round(clamp(source.精神威胁 ?? 0.6, 0, 2), 3),
      残留意志: round(clamp(source.残留意志 ?? 0.5, 0, 2), 3),
      属性偏向: normalizeAttributeMap(source.属性偏向, 0, 1000, 0),
      技能种子: cleanText(source.技能种子, source.id || unitId),
      魂环状态: cleanText(source.魂环状态, '无'),
      归属武魂ID: cleanText(source.归属武魂ID),
      处理事务ID: cleanText(source.处理事务ID),
      推荐契合: isPlainObject(source.推荐契合) ? deepClone(source.推荐契合) : {},
      候选魂技: isPlainObject(source.候选魂技) ? deepClone(source.候选魂技) : {},
      扩展: isPlainObject(source.扩展) ? deepClone(source.扩展) : {}
    };
  }

  function inferBeastAttributes(profile) {
    const growth = Math.floor(soulBeastEffectiveLevel(profile.年限) / 5);
    return Object.fromEntries(ATTRIBUTE_KEYS.map(key => [key, clamp(10 + growth, 1, 99)]));
  }

  function convertLegacyRing(raw, soul, ownerId, state) {
    const source = isPlainObject(raw) ? raw : {};
    const ordinal = round(clamp(source.序号 ?? soul.魂环ID列表.length + 1, 1, 99));
    const ringId = cleanText(source.id, `${soul.id}-ring-${ordinal}`);
    const beastSnapshot = isPlainObject(source.魂兽快照) ? source.魂兽快照 : {};
    const beastProfileId = `beast-profile-source-${sanitizeId(ringId, 'ring')}`;
    if (Object.keys(beastSnapshot).length > 0 && !state.魂兽档案.列表[beastProfileId]) {
      state.魂兽档案.列表[beastProfileId] = normalizeSoulBeastProfile({
        ...deepClone(beastSnapshot),
        id: beastProfileId,
        单位ID: '',
        魂环状态: '已吸收'
      }, '');
    }
    const skillSource = isPlainObject(source.魂技) ? source.魂技 : {};
    const skillId = cleanText(skillSource.id, `${ringId}-skill`);
    if (Object.keys(skillSource).length > 0) {
      state.技能.列表[skillId] = {
        id: skillId,
        名称: cleanText(skillSource.名称, `${soul.名称}魂技`),
        类型: '魂技',
        持有者单位ID: ownerId,
        来源武魂ID: soul.id,
        来源魂环ID: ringId,
        来源魂兽档案ID: beastProfileId,
        蓝图版本: 'legacy-v0.2',
        效果图: isPlainObject(skillSource.效果图) ? deepClone(skillSource.效果图) : {},
        扩展: {legacyBlueprint: deepClone(skillSource)}
      };
    }
    state.魂环.列表[ringId] = {
      id: ringId,
      持有者单位ID: ownerId,
      武魂ID: soul.id,
      序号: ordinal,
      年限: round(clamp(source.年限 ?? 1, 1, Number.MAX_SAFE_INTEGER)),
      年限档: cleanText(source.年限档, getAgeTier(source.年限 ?? 1).名称),
      颜色: cleanText(source.颜色, getAgeTier(source.年限 ?? 1).颜色),
      来源魂兽档案ID: Object.keys(beastSnapshot).length > 0 ? beastProfileId : '',
      契合: isPlainObject(source.契合) ? deepClone(source.契合) : {},
      吸收双门: isPlainObject(source.吸收双门) ? deepClone(source.吸收双门) : {},
      吸收时快照: isPlainObject(source.吸收时快照) ? deepClone(source.吸收时快照) : {},
      价值: isPlainObject(source.价值) ? deepClone(source.价值) : {},
      永久属性增益: normalizeAttributeMap(source.永久属性增益, 0, 999, 0),
      魂技ID列表: Object.keys(skillSource).length > 0 ? [skillId] : [],
      扩展: {legacy: pickUnknown(source, ['id', '序号', '年限', '年限档', '颜色', '魂兽快照', '契合', '吸收双门', '吸收时快照', '价值', '永久属性增益', '魂技'])}
    };
    soul.魂环ID列表.push(ringId);
  }

  function migrateLegacyState(raw) {
    const legacy = isPlainObject(raw) ? deepClone(raw) : {};
    const state = makeDefaultState();
    const legacyVersion = cleanText(legacy.系统?.schema_version, '0.2.0');
    const playerId = 'combatant-player-main';
    const legacyRole = isPlainObject(legacy.角色) ? legacy.角色 : {};
    const legacySouls = isPlainObject(legacy.武魂?.列表) ? legacy.武魂.列表 : {};
    const activeLegacySoul = legacySouls[legacy.武魂?.激活武魂ID] ?? Object.values(legacySouls)[0] ?? {};
    const activeGrade = getMartialSoulGrade(activeLegacySoul.等阶 ?? 1);

    state.系统 = {
      ...state.系统,
      revision: round(clamp(legacy.系统?.revision ?? 0, 0, Number.MAX_SAFE_INTEGER)),
      last_transaction_id: cleanText(legacy.系统?.last_transaction_id),
      last_error: cleanText(legacy.系统?.last_error),
      migrated_from: legacyVersion,
      扩展: {legacy: pickUnknown(legacy.系统, ['schema_version', 'ruleset_version', 'revision', 'last_transaction_id', 'last_error', 'formula_note'])}
    };
    state.角色 = {
      已建立: Boolean(legacyRole.已建立),
      主控单位ID: playerId,
      档案: isPlainObject(legacyRole.档案) ? deepClone(legacyRole.档案) : {},
      扩展: {legacy: pickUnknown(legacyRole, ['已建立', '姓名', '魂力等级', '档案', '六维', '衍生'])}
    };
    state.成长.列表[playerId] = {
      id: playerId,
      单位ID: playerId,
      魂力等级: round(clamp(legacyRole.魂力等级 ?? 10, 1, 99)),
      当前经验: 0,
      当前等级需求: 100,
      瓶颈等级: Math.ceil(round(clamp(legacyRole.魂力等级 ?? 10, 1, 99)) / 10) * 10,
      瓶颈状态: round(clamp(legacyRole.魂力等级 ?? 10, 1, 99)) % 10 === 0 ? '积累经验' : '未到瓶颈',
      溢出经验: 0,
      武魂ID列表: Object.keys(legacySouls),
      激活武魂ID: Object.keys(legacySouls)[0] ?? '',
      扩展: {}
    };
    state.战斗单位.列表[playerId] = normalizeCombatant({
      id: playerId,
      名称: cleanText(legacyRole.姓名, '{{user}}'),
      阵营: '玩家方',
      单位种类: '玩家魂师',
      标签: ['魂师', '玩家角色'],
      存活状态: '存活',
      六维: legacyRole.六维,
      成长: {类型: '魂师', 魂力等级: legacyRole.魂力等级, 成长记录ID: playerId},
      扩展: {legacyDerived: isPlainObject(legacyRole.衍生) ? deepClone(legacyRole.衍生) : {}}
    }, {
      id: playerId,
      kind: '玩家魂师',
      level: legacyRole.魂力等级,
      martialSoulGrade: activeGrade.数值,
      capacityModifier: activeLegacySoul.身体容量修正 ?? 0
    });

    for (const [legacyId, rawSoul] of Object.entries(legacySouls)) {
      const soul = normalizeMartialSoul({...deepClone(rawSoul), id: cleanText(rawSoul?.id, legacyId)}, playerId);
      soul.魂环ID列表 = [];
      soul.扩展.legacy = pickUnknown(rawSoul, ['id', '名称', '等阶', '等阶说明', '形态', '显现状态', '定位', '类别标签', '属性标签', '技能类型池', '核心特性', '身体容量修正', '魂环']);
      state.武魂.列表[soul.id] = soul;
      for (const ring of Array.isArray(rawSoul?.魂环) ? rawSoul.魂环 : []) convertLegacyRing(ring, soul, playerId, state);
    }
    state.成长.列表[playerId].激活武魂ID = state.武魂.列表[legacy.武魂?.激活武魂ID]
      ? legacy.武魂.激活武魂ID
      : Object.keys(state.武魂.列表)[0] ?? '';

    const legacyBeast = isPlainObject(legacy.场景?.当前魂兽) ? legacy.场景.当前魂兽 : {};
    if (Object.keys(legacyBeast).length > 0) {
      const beastUnitId = cleanText(legacyBeast.id, 'combatant-beast-current');
      const beastProfile = normalizeSoulBeastProfile({...deepClone(legacyBeast), id: `beast-profile-${sanitizeId(beastUnitId, 'current')}`}, beastUnitId);
      beastProfile.扩展.legacy = pickUnknown(legacyBeast, ['id', '名称', '已死亡', '年限', '种族品级', '质量', '完整度', '类别标签', '特性', '肉身威胁', '精神威胁', '残留意志', '属性偏向', '魂环状态', '归属武魂ID', '现场描述', '推荐契合', '候选魂技', '处理事务ID']);
      state.魂兽档案.列表[beastProfile.id] = beastProfile;
      state.战斗单位.列表[beastUnitId] = normalizeCombatant({
        id: beastUnitId,
        名称: beastProfile.名称,
        阵营: '野生',
        单位种类: '魂兽',
        标签: beastProfile.类别标签,
        存活状态: legacyBeast.已死亡 ? '死亡' : '存活',
        六维: {基础: inferBeastAttributes(beastProfile)},
        成长: {类型: '魂兽', 年限: beastProfile.年限, 种族品级: beastProfile.种族品级},
        抗性: {解剖限制: beastProfile.解剖标签},
        扩展: {魂兽档案ID: beastProfile.id}
      }, {id: beastUnitId, kind: '魂兽', beastYears: beastProfile.年限, beastGrade: beastProfile.种族品级});
      state.场景.当前魂兽ID = beastUnitId;
    }
    state.场景 = {
      ...state.场景,
      章节: cleanText(legacy.场景?.章节),
      地点: cleanText(legacy.场景?.地点),
      时间: cleanText(legacy.场景?.时间),
      状态: cleanText(legacy.场景?.状态),
      强制现场绑定: Boolean(legacy.场景?.强制现场绑定),
      上次吸收结果: isPlainObject(legacy.场景?.上次吸收结果) ? deepClone(legacy.场景.上次吸收结果) : {},
      扩展: {legacy: pickUnknown(legacy.场景, ['章节', '地点', '时间', '状态', '强制现场绑定', '当前魂兽', '上次吸收结果'])}
    };
    state.事务 = {
      id: cleanText(legacy.事务?.id),
      类型: TRANSACTION_TYPES.includes(legacy.事务?.类型) ? legacy.事务.类型 : '无',
      状态: cleanText(legacy.事务?.状态, '空闲'),
      请求提交: Boolean(legacy.事务?.请求提交),
      提案: isPlainObject(legacy.事务?.提案) ? deepClone(legacy.事务.提案) : {},
      结算: isPlainObject(legacy.事务?.结算) ? deepClone(legacy.事务.结算) : {}
    };
    state.历史 = Array.isArray(legacy.历史) ? deepClone(legacy.历史).slice(-50) : [];
    state.扩展.迁移保留 = {
      顶层: pickUnknown(legacy, ['系统', '角色', '武魂', '场景', '技能试算', '事务', '历史']),
      技能试算: isPlainObject(legacy.技能试算) ? deepClone(legacy.技能试算) : {}
    };
    return normalizeV04State(state);
  }

  // Only an already independent transaction draft may borrow its own branches.
  // Apply every default and every normalization rule; avoid copying unrelated
  // private histories and skill definitions again for each background action.
  function mergeOwnedDefaults(base, patch) {
    if (!isPlainObject(base) || !isPlainObject(patch)) return patch;
    const result = {};
    for (const [key,value] of Object.entries(base)) result[key] = Object.hasOwn(patch,key)
      ? isPlainObject(value) && isPlainObject(patch[key]) ? mergeOwnedDefaults(value,patch[key]) : patch[key]
      : deepClone(value);
    for (const [key,value] of Object.entries(patch)) if (!Object.hasOwn(base,key)) result[key]=value;
    return result;
  }
  function normalizeOwnedState(raw) {
    const version = cleanText(raw?.系统?.schema_version);
    if (version !== VERSION || raw?.系统?.ruleset_version !== VERSION) throw new Error(`2.0仅接受当前版本新档：${version || '缺失版本'}`);
    return normalizeV04State(raw,true);
  }

  // Only source-only normalizers are memoized. Units, growth, equipment effects,
  // maintenance and battle records still read the current world on every pass.
  // Cache full JSON input and independent JSON output, never a live object.
  const ownedSourceCache=new Map(),ownedSourceLimit=8*1024*1024;
  let ownedSourceBytes=0;
  function normalizeOwnedSource(kind,source,id,ownerId,normalize) {
    const normalizedId=cleanText(source?.id,id);
    if(typeof ownerId!=='string')return normalize({...deepClone(source),id:normalizedId},ownerId);
    const sourceText=JSON.stringify(source),key=JSON.stringify([kind,normalizedId,ownerId])+'\n'+sourceText,hit=ownedSourceCache.get(key);
    if(hit){ownedSourceCache.delete(key);ownedSourceCache.set(key,hit);return hit.unchanged&&!Object.isFrozen(source)?source:JSON.parse(hit.text);}
    const value=normalize({...deepClone(source),id:normalizedId},ownerId);
    const text=JSON.stringify(value),unchanged=text===sourceText,bytes=2*(key.length+text.length);
    if(bytes<=ownedSourceLimit){
      while(ownedSourceCache.size>=512||ownedSourceBytes+bytes>ownedSourceLimit){
        const first=ownedSourceCache.keys().next().value;ownedSourceBytes-=ownedSourceCache.get(first).bytes;ownedSourceCache.delete(first);
      }
      ownedSourceCache.set(key,{text,bytes,unchanged});ownedSourceBytes+=bytes;
    }
    // Equality proves this exact current draft already has every normalized field.
    // Borrow that draft, never an object retained from a different world/call.
    return unchanged&&!Object.isFrozen(source)?source:value;
  }

  function normalizeV04State(raw, owned = false) {
    const defaults=makeDefaultState();
    const state = owned ? mergeOwnedDefaults(defaults,raw) : deepMerge(defaults,isPlainObject(raw)?raw:{});
    state.系统.schema_version = VERSION;
    state.系统.ruleset_version = VERSION;
    state.系统.storage_strategy = STORAGE_STRATEGY;
    state.系统.revision = round(clamp(state.系统.revision, 0, Number.MAX_SAFE_INTEGER));
    state.系统.last_transaction_id = cleanText(state.系统.last_transaction_id);
    state.系统.last_error = cleanText(state.系统.last_error);
    state.角色.主控单位ID = cleanText(state.角色.主控单位ID);
    if (!isPlainObject(state.战斗单位.列表)) state.战斗单位.列表 = {};
    if (!isPlainObject(state.成长.列表)) state.成长.列表 = {};
    if (!isPlainObject(state.武魂.列表)) state.武魂.列表 = {};
    if (!isPlainObject(state.武魂.草案)) state.武魂.草案 = {列表: {}, 当前草案ID: ''};
    if (!isPlainObject(state.武魂.草案.列表)) state.武魂.草案.列表 = {};
    state.武魂.草案.当前草案ID = cleanText(state.武魂.草案.当前草案ID);
    for(const [id,draft] of Object.entries(state.武魂.草案.列表)){
      const inspection=martialSoulCore.inspectDraft(draft);
      if(inspection.unsupported.some(item=>item.field==='attributes'))throw new Error('武魂草案含有无法识别的属性');
      state.武魂.草案.列表[id]={...draft,attributeVersion:martialSoulCore.ATTRIBUTE_VERSION,attributes:inspection.draft.attributes,
        ...(draft.compiled?{compiled:martialSoulCore.normalizeCompiledAttributes(draft.compiled)}:{})};
    }
    if (!isPlainObject(state.魂环.列表)) state.魂环.列表 = {};
    if (!isPlainObject(state.魂环.待选择)) state.魂环.待选择 = {};
    if (!isPlainObject(state.技能.列表)) state.技能.列表 = {};
    if (!isPlainObject(state.魂兽档案.列表)) state.魂兽档案.列表 = {};
    const normalizedSouls = {};
    for (const [id, soul] of Object.entries(state.武魂.列表)) {
      const ownerId=soul?.持有者单位ID ?? state.角色.主控单位ID;
      const normalized = owned ? normalizeOwnedSource('soul',soul,id,ownerId,normalizeMartialSoul)
        : normalizeMartialSoul({...deepClone(soul), id: cleanText(soul?.id, id)},ownerId);
      normalizedSouls[normalized.id] = normalized;
    }
    state.武魂.列表 = normalizedSouls;
    const normalizedBeasts = {};
    for (const [id, profile] of Object.entries(state.魂兽档案.列表)) {
      const ownerId=profile?.单位ID ?? '';
      const normalized = owned ? normalizeOwnedSource('beast',profile,id,ownerId,normalizeSoulBeastProfile)
        : normalizeSoulBeastProfile({...deepClone(profile), id: cleanText(profile?.id, id)},ownerId);
      normalizedBeasts[normalized.id] = normalized;
    }
    state.魂兽档案.列表 = normalizedBeasts;
    for (const [id, rawGrowth] of Object.entries(state.成长.列表)) {
      const growth = isPlainObject(rawGrowth) ? rawGrowth : {};
      growth.id = cleanText(growth.id, `growth-${id}`);
      growth.单位ID = cleanText(growth.单位ID, id);
      growth.魂力等级 = round(clamp(growth.魂力等级 ?? 1, 1, 99));
      growth.当前经验 = round(clamp(growth.当前经验 ?? 0, 0, Number.MAX_SAFE_INTEGER));
      growth.当前等级需求 = round(clamp(growth.当前等级需求 ?? (100 + growth.魂力等级 * 25), 1, Number.MAX_SAFE_INTEGER));
      growth.瓶颈等级 = round(clamp(growth.瓶颈等级 ?? Math.min(100, Math.ceil(growth.魂力等级 / 10) * 10), 10, 100));
      growth.瓶颈状态 = growth.魂力等级 === 99
        ? '最高等级'
        : growth.魂力等级 % 10 === 0
          ? growth.当前经验 >= growth.当前等级需求 ? '等待魂环' : '积累经验'
          : '未到瓶颈';
      if (growth.瓶颈状态 === '等待魂环') growth.当前经验 = growth.当前等级需求;
      growth.溢出经验 = 0;
      growth.可用属性点 = round(clamp(growth.可用属性点 ?? 0, 0, Number.MAX_SAFE_INTEGER));
      growth.已投入属性点 = round(clamp(growth.已投入属性点 ?? 0, 0, Number.MAX_SAFE_INTEGER));
      growth.每级属性点 = 0;
      growth.属性投入 = normalizeAttributeMap(growth.属性投入, 0, Number.MAX_SAFE_INTEGER, 0);
      growth.武魂ID列表 = cleanList(growth.武魂ID列表).filter(soulId => state.武魂.列表[soulId]?.持有者单位ID === growth.单位ID);
      growth.激活武魂ID = growth.激活武魂ID === '' || growth.武魂ID列表.includes(growth.激活武魂ID)
        ? growth.激活武魂ID
        : (growth.武魂ID列表[0] ?? '');
      growth.封号 = normalizeTitleRecord(growth.封号, growth.魂力等级);
      state.成长.列表[id] = growth;
    }
    // With no active maintenance, rebuilding units reads a stable source inventory.
    // Closing a maintained ability can change the world between units, so use live reads there.
    const sourceHosts=globalThis.SoulHostCore;
    state.战斗单位.列表 = sourceHosts&&!Object.keys(state.扩展?.abilityMaintenance??{}).length
      ? sourceHosts.withReadIndex(state,()=>normalizeCombatants(state)) : normalizeCombatants(state);
    state.战斗=normalizeBattleRecord(state.战斗,state,owned);
    if(state.世界?.backgroundBattles){
      if(!isPlainObject(state.世界.backgroundBattles))throw Error('后台战斗容器无效');
      for(const [id,battle] of Object.entries(state.世界.backgroundBattles)){
        if(id!==battle?.id||id===state.战斗.id)throw Error('战斗实例重复或ID无效');
        normalizeBattleRecord(battle,state,owned);
      }
    }
    state.历史 = Array.isArray(state.历史) ? state.历史.slice(-50) : [];
    state.事务 = {
      id: cleanText(state.事务?.id),
      类型: TRANSACTION_TYPES.includes(state.事务?.类型) ? state.事务.类型 : '无',
      状态: cleanText(state.事务?.状态, '空闲'),
      请求提交: Boolean(state.事务?.请求提交),
      提案: isPlainObject(state.事务?.提案) ? deepClone(state.事务.提案) : {},
      结算: isPlainObject(state.事务?.结算) ? deepClone(state.事务.结算) : {}
    };
    return state;
  }

  function normalizeCombatants(state) {
    const normalizedCombatants = {};
    for (const [id, unit] of Object.entries(state.战斗单位.列表)) {
      const growth = unit?.成长 ?? {};
      const activeSoul = activeMartialSoul(state, id) ?? beastLineageSource(state,id);
      const normalized = normalizeCombatant({...stripMartialSoulCombatModifiers(deepClone(unit)), id: cleanText(unit?.id, id)}, {
        id,
        kind: unit?.单位种类,
        level: growth.魂力等级 ?? state.成长.列表[id]?.魂力等级,
        beastYears: growth.年限,
        beastGrade: growth.种族品级,
        martialSoulGrade: activeSoul?.品级 ?? 3,
        capacityModifier: activeSoul?.身体容量修正 ?? 0,
        stabilityModifier: activeSoul?.灵魂稳定修正 ?? 0
      });
      normalizedCombatants[normalized.id] = applyMartialSoulCombatModifiers(normalized, activeSoul,state);
      refreshBattleAttributeResources(state,normalized);
      // State normalization is not a heal, including while a temporary cap is up.
      for(const key of ['生命','魂力'])if(Number.isFinite(unit.资源?.[key]?.当前))normalized.资源[key].当前=Math.min(unit.资源[key].当前,normalized.资源[key].最大);
    }
    return normalizedCombatants;
  }

  function normalizeBattleRecord(battle,state,owned=false) {
    if (!isPlainObject(battle)) throw Error('战斗实例不是对象');
    // Summons remain in the battle history after expiry; do not truncate later living participants.
    battle.参与者ID列表 = cleanList(battle.参与者ID列表,Number.MAX_SAFE_INTEGER);
    // Internal owned drafts already contain canonical JSON history. Old
    // receipts are immutable leaves, as in projectionCore.fork; only their
    // containers change. Keep every other (including unknown) branch copied.
    const source=isPlainObject(battle.扩展)?battle.扩展:{};
    const shareHistory=owned&&isPlainObject(source.已结算行动)&&Array.isArray(source.结算单列表);
    battle.扩展=deepMerge(makeDefaultState().战斗.扩展,shareHistory?{...source,已结算行动:{},结算单列表:[]}:source);
    if(shareHistory){battle.扩展.已结算行动={...source.已结算行动};battle.扩展.结算单列表=source.结算单列表.slice();}
    if (!isPlainObject(battle.扩展.成员)) battle.扩展.成员 = {};
    for (const unitId of battle.参与者ID列表) {
      const unit = state.战斗单位.列表[unitId];
      if (!unit) continue;
      const previous = isPlainObject(battle.扩展.成员[unitId]) ? battle.扩展.成员[unitId] : {};
      battle.扩展.成员[unitId] = {
        unitId,
        sideId: cleanText(previous.sideId, unit.阵营),
        controller: ['player', 'ai'].includes(previous.controller) ? previous.controller : (unitId === state.角色.主控单位ID ? 'player' : 'ai'),
        status: ['active', 'escaped', 'surrendered', 'defeated', 'removed'].includes(previous.status)
          ? previous.status
          : (unit.存活状态 === '存活' ? 'active' : 'defeated'),
        canFlee: previous.canFlee !== false,
        morale: round(clamp(previous.morale ?? 50, 0, 100)),
        surprisedRound: round(clamp(previous.surprisedRound ?? 0, 0, Number.MAX_SAFE_INTEGER)),
        joinedRound: round(clamp(previous.joinedRound ?? 1, 0, Number.MAX_SAFE_INTEGER)),
        extension: isPlainObject(previous.extension) ? deepClone(previous.extension) : {}
      };
    }
    if (!isPlainObject(battle.扩展.队伍)) battle.扩展.队伍 = {};
    for (const member of Object.values(battle.扩展.成员)) {
      battle.扩展.队伍[member.sideId] ??= {id: member.sideId, name: member.sideId, memberIds: []};
      const team = battle.扩展.队伍[member.sideId];
      team.id = member.sideId;
      team.name = cleanText(team.name, member.sideId);
      team.memberIds = cleanList([...(team.memberIds ?? []), member.unitId],Number.MAX_SAFE_INTEGER);
    }
    return battle;
  }

  // Commit a transaction draft without invalidating scheduler-held action/wallet/plan references.
  function commitStateDraft(target,source) { return commitDraft(target,source,false); }
  // Both graphs belong to the current private transaction. Shared branches have
  // already been updated in place; retain them without replaying their history.
  function commitOwnedStateDraft(target,source) { return commitDraft(target,source,true); }
  function commitDraft(target,source,owned) {
    if(owned&&target===source)return target;
    if(Array.isArray(source)){
      const prior=Array.isArray(target)?[...target]:[];
      const idCounts=values=>{const counts=new Map();for(const value of values)if(isPlainObject(value)&&value.id)counts.set(value.id,(counts.get(value.id)??0)+1);return counts;};
      const priorCounts=idCounts(prior),sourceCounts=idCounts(source);
      // Effect arrays can repeat an ID with different parameters. Only unique entity IDs identify reusable references.
      const byId=new Map(prior.filter(v=>isPlainObject(v)&&v.id&&priorCounts.get(v.id)===1&&sourceCounts.get(v.id)===1).map(v=>[v.id,v]));
      const result=Array.isArray(target)?target:[];
      const values=source.map((value,index)=>commitDraft(value?.id?byId.get(value.id):prior[index]?.id?undefined:prior[index],value,owned));
      result.length=values.length;for(let i=0;i<values.length;i++)result[i]=values[i];return result;
    }
    if(isPlainObject(source)){
      const result=isPlainObject(target)?target:{};
      for(const key of Object.keys(result))if(!Object.hasOwn(source,key))delete result[key];
      for(const [key,value] of Object.entries(source)){
        if(['__proto__','prototype','constructor'].includes(key))throw Error('状态字段无效');
        result[key]=commitDraft(result[key],value,owned);
      }
      return result;
    }
    return source;
  }

  function normalizeState(raw) {
    const version = cleanText(raw?.系统?.schema_version);
    if (version !== VERSION || raw?.系统?.ruleset_version !== VERSION) throw new Error(`2.0仅接受当前版本新档：${version || '缺失版本'}`);
    return normalizeV04State(raw);
  }

  function migrateState(raw) {
    const fromVersion = cleanText(raw?.系统?.schema_version);
    if (fromVersion !== VERSION) throw new Error(`本版本没有旧存档迁移：${fromVersion || '缺失版本'}`);
    return {state: normalizeState(raw), migrated: false, fromVersion, toVersion: VERSION};
  }

  function validateState(raw) {
    const state = normalizeState(raw);
    const errors = normalizedStateErrors(state);
    return {state, errors, pass: errors.length === 0};
  }

  // The world validator already owns the normalized result, including equipped unit stats.
  function normalizedStateErrors(state) {
    const errors = [];
    if (state.系统.storage_strategy !== STORAGE_STRATEGY) errors.push('存储策略必须是multi-floor');
    if (Object.hasOwn(state.武魂, '激活武魂ID')) errors.push('v1.10禁止使用全局激活武魂ID');
    if (state.角色.已建立 && !state.战斗单位.列表[state.角色.主控单位ID]) errors.push('主控单位ID未指向战斗单位');
    for (const [unitId, growth] of Object.entries(state.成长.列表)) {
      const owned = cleanList(growth.武魂ID列表);
      const isSoulMaster = state.战斗单位.列表[unitId]?.单位种类 !== '魂兽';
      if (isSoulMaster && (owned.length < 1 || owned.length > 3)) errors.push(`魂师${unitId}必须持有1至3个武魂`);
      if (owned.length !== new Set(owned).size) errors.push(`魂师${unitId}武魂列表存在重复项`);
      if (owned.length && growth.激活武魂ID !== '' && !owned.includes(growth.激活武魂ID)) errors.push(`魂师${unitId}激活武魂不属于自己`);
      const grades = new Set();
      for (const soulId of owned) {
        const soul = state.武魂.列表[soulId];
        if (!soul || soul.持有者单位ID !== unitId) errors.push(`魂师${unitId}引用非法武魂${soulId}`);
        else grades.add(`${soul.品级}:${soul.品级标签}`);
      }
      if (grades.size > 1&&!owned.some(id=>state.武魂.列表[id]?.扩展?.expressionHistory?.length)) errors.push(`魂师${unitId}的多个武魂品级不一致`);
    }
    for (const soul of Object.values(state.武魂.列表)) {
      if (!state.战斗单位.列表[soul.持有者单位ID]) errors.push(`武魂${soul.id}缺少持有者单位`);
      if (soul.品级 < 1 || soul.品级 > 5) errors.push(`武魂${soul.id}品质越界`);
      for (const ringId of soul.魂环ID列表) if (!state.魂环.列表[ringId]) errors.push(`武魂${soul.id}引用不存在魂环${ringId}`);
    }
    for (const ring of Object.values(state.魂环.列表)) {
      if (!state.武魂.列表[ring.武魂ID]) errors.push(`魂环${ring.id}引用不存在武魂`);
      if (!Array.isArray(ring.魂技ID列表) || !ring.魂技ID列表.length) errors.push(`魂环${ring.id}没有魂技列表`);
      for (const skillId of ring.魂技ID列表 ?? []) if (!state.技能.列表[skillId]) errors.push(`魂环${ring.id}引用不存在魂技${skillId}`);
    }
    for (const [pendingId, pending] of Object.entries(state.魂环.待选择)) {
      if (!isPlainObject(pending) || cleanText(pending.id) !== pendingId) {
        errors.push(`魂技待选记录ID不一致：${pendingId}`);
        continue;
      }
      if (!state.战利品.列表[pending.sourceLootId]) errors.push(`魂技待选记录${pendingId}引用不存在魂环胚胎`);
      if (!state.武魂.列表[pending.martialSoulId]) errors.push(`魂技待选记录${pendingId}引用不存在武魂`);
      if (state.武魂.列表[pending.martialSoulId]?.持有者单位ID!==pending.playerId)errors.push(`魂技待选记录${pendingId}与实际武魂持有人不符`);
      if (!state.魂兽档案.列表[pending.beastProfileId]) errors.push(`魂技待选记录${pendingId}引用不存在魂兽来源`);
      const candidates = Array.isArray(pending.candidates) ? pending.candidates : [];
      const choiceCount = Number(pending.choiceCount ?? candidates.length);
      if(!Number.isInteger(choiceCount)||choiceCount<1||choiceCount>4)errors.push(`魂技待选记录${pendingId}候选数量超出范围`);
      if (candidates.length !== choiceCount) errors.push(`魂技待选记录${pendingId}候选数量不一致`);
      const candidateIds = candidates.map(candidate => cleanText(candidate?.id)).filter(Boolean);
      const fingerprints = candidates.map(candidate => cleanText(candidate?.fingerprint)).filter(Boolean);
      if (candidateIds.length !== candidates.length || new Set(candidateIds).size !== candidates.length) errors.push(`魂技待选记录${pendingId}候选ID重复或缺失`);
      if (fingerprints.length !== candidates.length) errors.push(`魂技待选记录${pendingId}缺少机械指纹`);
      const seenFingerprints = new Map();
      for (const candidate of candidates) {
        const fingerprint = cleanText(candidate?.fingerprint);
        const equivalentOf = cleanText(candidate?.equivalentOfCandidateId);
        if (seenFingerprints.has(fingerprint) && (!candidate?.equivalentFallback || equivalentOf !== seenFingerprints.get(fingerprint))) errors.push(`魂技待选记录${pendingId}存在未声明的等价候选`);
        else if (!seenFingerprints.has(fingerprint)) seenFingerprints.set(fingerprint,candidate.id);
      }
    }
    for (const profile of Object.values(state.魂兽档案.列表)) {
      if (profile.种族品级 < 1 || profile.种族品级 > 5) errors.push(`魂兽档案${profile.id}种族品级越界`);
      try { beastValue.validateLineage(profile.血脉); } catch(error) { errors.push(String(error.message)); }
      if (profile.完整度 < 0 || profile.完整度 > 1) errors.push(`魂兽档案${profile.id}完整度越界`);
    }
    for (const unit of Object.values(state.战斗单位.列表)) {
      if (unit.资源.魂力.当前 - unit.资源.魂力.锁定 < 0) errors.push(`单位${unit.id}可用魂力为负`);
      if (unit.存活状态 === '死亡' && unit.资源.生命.当前 !== 0) errors.push(`死亡单位${unit.id}生命不为0`);
    }
    for (const unitId of state.战斗.参与者ID列表) {
      if (!state.战斗单位.列表[unitId]) errors.push(`战斗参与者不存在：${unitId}`);
      if (!state.战斗.扩展?.成员?.[unitId]) errors.push(`战斗参与者缺少成员合同：${unitId}`);
    }
    for (const [unitId, member] of Object.entries(state.战斗.扩展?.成员 ?? {})) {
      if (!state.战斗单位.列表[unitId]) errors.push(`战斗成员引用不存在单位：${unitId}`);
      if (!cleanText(member.sideId)) errors.push(`战斗成员缺少队伍：${unitId}`);
      if (!['player', 'ai'].includes(member.controller)) errors.push(`战斗成员控制权非法：${unitId}`);
      if (!['active', 'escaped', 'surrendered', 'defeated', 'removed'].includes(member.status)) errors.push(`战斗成员状态非法：${unitId}`);
    }
    for (const status of Object.values(state.状态实例.列表)) {
      if (!state.战斗单位.列表[status.目标单位ID]) errors.push(`状态${status.id}目标不存在`);
      if (!isPlainObject(status.来源)) errors.push(`状态${status.id}缺少来源对象`);
      if (!Number.isInteger(Number(status.层数)) || Number(status.层数) < 1) errors.push(`状态${status.id}层数非法`);
      if (!isPlainObject(status.持续)) errors.push(`状态${status.id}缺少持续对象`);
      else {
        const battleBound=['本场战斗','来源维持','来源下回合'].includes(status.持续.模式);
        if(battleBound){
          const battle=[state.战斗,...Object.values(state.世界?.backgroundBattles??{})].find(value=>value?.id===status.持续.战斗ID);
          const bound=status.模板ID==='transform.martial_avatar'||status.快照?.参数?.持续方式===(status.持续.模式==='来源维持'?'来源维持':'来源下回合');
          if(!bound||!battle||battle.状态!=='进行中'||status.来源?.战斗ID!==battle.id||!battle.参与者ID列表?.includes(status.目标单位ID)||Object.keys(status.持续).some(key=>!['模式','战斗ID'].includes(key)))errors.push(`状态${status.id}的战斗维持期限无效`);
        }else if(!controls.persistent(status)){
          const remaining = Number(status.持续.剩余回合);
          if (!Number.isFinite(remaining) || !Number.isInteger(remaining) || remaining < 0) errors.push(`状态${status.id}剩余回合非法`);
        }else if(Object.hasOwn(status.持续,'剩余回合'))errors.push(`状态${status.id}不能混用两种计时`);
        if (!cleanText(status.持续.模式)) errors.push(`状态${status.id}持续模式为空`);
        if (!battleBound&&!Array.isArray(status.持续.触发时点)) errors.push(`状态${status.id}触发时点非法`);
      }
    }
    return errors;
  }

  return Object.freeze({
    registerNativeOrigin,nativeOriginBinding,nativeOriginDefinition,nativeOriginResources,validateNativeOriginUnit,
    refreshSoulSeal,
    CONTROL_CORE:controls,
    VERSION,
    commitStateDraft, commitOwnedStateDraft,
    STORAGE_STRATEGY,
    ATTRIBUTE_KEYS,
    STATUS_GUARD_TARGETS,
    equipmentElementSummary,elementDamageProfile,amplifyElementDamage,
    negativeStatus,
    defenseSources,
    passiveSkillState,
    intrinsicSoulSkillBlockReason,
    AFFINITY_ATTRIBUTES,
    DAMAGE_TYPES,
    DAMAGE_FAMILIES,
    UNIT_KINDS,
    LIFE_STATES,
    DISTANCE_ZONES,
    TRANSACTION_TYPES,
    MARTIAL_SOUL_GRADES,
    SOUL_BEAST_GRADES,
    AGE_TIERS,
    FORMULA_CONFIG,
    EQUIPMENT_AFFIXES:equipment,
    refreshEquipmentCapacity,
    battleAttributeView,withBattleReadCache,refreshBattleAttributeResources,
    STATE_ROOT_KEYS,
    canonicalDamageType,
    damageTypeFamily,
    resistanceMatches,
    normalizeAffinitySpectrum,
    abilityModifier,
    proficiencyBonus,
    growthAttributePointCost,
    getMartialSoulGrade,
    getSoulBeastGrade,
    getAgeTier,
    soulBeastEffectiveLevel,
    soulMasterRealm,
    soulMasterCombatBonus,combatRealm,
    SOUL_MASTER_RANK_NAMES,
    soulMasterRankProfile,
    normalizeSixAttributes,
    normalizeTitleRecord,
    calculateDerived,
    makeDefaultState,
    normalizeCombatant,
    BEAST_VALUE: beastValue,
    normalizeMartialSoul,
    finalizeMartialSoulDraft,
    stripMartialSoulCombatModifiers,
    applyMartialSoulCombatModifiers,
    ownedMartialSoulIds,
    activeMartialSoulId,
    activeMartialSoul,
    refreshActiveMartialSoul,
    switchActiveMartialSoul,
    releaseDomainMaintenance,
    MARTIAL_SOUL_CORE: martialSoulCore,
    normalizeSoulBeastProfile,
    grantTemporaryHealth,
    clearTemporaryHealth,
    normalizeState,
    normalizeOwnedState,
    migrateState,
    normalizedStateErrors,
    validateState
  });
});
