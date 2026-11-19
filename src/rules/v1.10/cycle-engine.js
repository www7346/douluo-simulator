(function attachSoulCycleEngine(root, factory) {
  const foundation = root?.SoulCombatFoundation ?? (typeof require === 'function' ? require('./foundation-core.js') : null);
  const effects = root?.SoulEffectCompiler ?? (typeof require === 'function' ? require('./effects-core.js') : null);
  const combat = root?.SoulCombatEngine ?? (typeof require === 'function' ? require('./combat-engine.js') : null);
  const talents = root?.SoulTalentCore ?? (typeof require === 'function' ? require('./talent-core.js') : null);
  const narrative = root?.SoulNarrative ?? (typeof require === 'function' ? require('./narrative-core.js') : null);
  const people = root?.SoulPersonCore ?? (typeof require === 'function' ? require('./person-core.js') : null);
  const abilities=root?.SoulAbilityContract??(typeof require==='function'?require('./ability-contract-core.js'):null);
  const expeditions=root?.SoulExpeditionContext??(typeof require==='function'?require('../../shared/expedition-context-core.js'):null);
  const positions=root?.SoulScenePosition??(typeof require==='function'?require('../../shared/scene-position-core.js'):null);
  const actions=root?.SoulActionContext??(typeof require==='function'?require('./action-context-core.js'):null);
  const controls=root?.SoulControlCore??(typeof require==='function'?require('./control-core.js'):null);
  const presets=root?.SoulPresetCatalog??(typeof require==='function'?require('./preset-catalog-core.js'):null);
  const canonicalGrowth=root?.SoulCanonicalGrowth??(typeof require==='function'?require('./canonical-growth-core.js'):null);
  const api = factory(foundation, effects, combat, talents, narrative, people, abilities,expeditions,positions,actions,controls,presets);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SoulCycleEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createSoulCycleEngine(foundation, effects, combat, talents, narrative, people, abilities,expeditions,positions,actions,controls,presets) {
  'use strict';

  if (!foundation || !effects || !combat) throw new Error('SoulCycleEngine requires foundation, effects and combat');

  const VERSION = '2.1.0';
  const RING_ATTRIBUTE_POINTS = 2;
  const RING_SKILL_CHOICE_RULES = Object.freeze({baseCount: 2, minimum: 2, maximum: 4});
  const RING_GENERATION_KEYS=Object.freeze(['evolutionTarget','presetId','requestedEffects','requestedBranches','requestedEffectIds','requestedSkills','exchangeContracts','requirements','resourceCosts','maintenanceCosts','castModes','defaultCastMode','cooldownTurns','usageRules']);
  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const clamp = (value, minimum, maximum) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return minimum;
    return Math.min(maximum, Math.max(minimum, number));
  };
  const round = value => Math.round(Number(value) || 0);
  const clean = (value, fallback = '') => String(value ?? '').trim() || fallback;
  const cleanList = value => Array.isArray(value) ? [...new Set(value.map(item => clean(item)).filter(Boolean))] : [];

  function stableHash(value) {
    let hash = 2166136261;
    for (const character of String(value ?? '')) {
      hash ^= character.codePointAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function seededPick(items, seed, offset = 0) {
    if (!items.length) return null;
    return items[(stableHash(`${seed}:${offset}`) + offset) % items.length];
  }

  function soulBeastYearsForLevel(levelInput) {
    const level = clamp(levelInput, 1, 99);
    const levelAnchors = [1, 5, 14, 28, 55, 90, 99];
    const logAnchors = [0, 1, 2, 3, 4, 5, 6];
    if (level <= levelAnchors[0]) return 1;
    if (level >= levelAnchors.at(-1)) return 1000000;
    const upper = levelAnchors.findIndex(anchor => anchor >= level);
    const lower = upper - 1;
    const ratio = (level - levelAnchors[lower]) / (levelAnchors[upper] - levelAnchors[lower]);
    return Math.max(1, round(10 ** (logAnchors[lower] + (logAnchors[upper] - logAnchors[lower]) * ratio)));
  }

  function generateSoulBeastProposal(options = {}) {
    const seed=clean(options.seed,'soul-beast');
    const lineage=foundation.BEAST_VALUE.generateLineage({seed,categoryIds:options.biologicalCategoryIds,attributeIds:options.attributeIds,targetPoints:options.lineagePoints});
    const years=options.budget!==undefined?foundation.BEAST_VALUE.yearsForBudget(options.budget,lineage):round(clamp(options.years??soulBeastYearsForLevel(options.targetLevel??10),1,Number.MAX_SAFE_INTEGER));
    const attributes=lineage.compiled.attributes;
    const category=lineage.compiled.categories[0];
    return {speciesId:category.id,name:clean(options.name,category.name),years,lineage,speciesGrade:lineage.grade.value,integrity:clamp(options.integrity??1,0,1),
      categoryTags:[category.name],speciesTraits:effects.sourceTraitsWithBridges({id:'proposal-'+seed,名称:clean(options.name,category.name),物种ID:category.id,血脉:lineage,年限:years,技能种子:clean(options.skillSeed,seed),种族特征:lineage.compiled.semanticTags}),mutations:[],anatomyTags:cleanList(options.anatomyTags??['完整结构']),
      affinitySpectrum:{主属性:attributes.map(item=>item.name),副属性:[],强度:Object.fromEntries(attributes.map(item=>[item.name,foundation.MARTIAL_SOUL_CORE.attributeStrength(item)]))},
      physicalThreat:1,spiritualThreat:1,residualWill:1,attributeBias:{},skillSeed:clean(options.skillSeed,seed),seed,
      generation:{source:'付费血脉结构',baseCategoryId:category.id,attributeIds:attributes.map(item=>item.id)}};
  }

  function transactionGuard(state, transactionId) {
    const id = clean(transactionId);
    if (!id) throw new Error('事务ID不能为空');
    if (state.系统.last_transaction_id === id) return {duplicate: true, id};
    return {duplicate: false, id};
  }

  function commit(state, transactionId, type, receipt) {
    globalThis.SoulManifestation?.reconcile(state);
    state.系统.revision += 1;
    state.系统.last_transaction_id = transactionId;
    state.系统.last_error = '';
    state.事务 = {id: transactionId, 类型: type, 状态: '已结算', 请求提交: false, 提案: {}, 结算: clone(receipt)};
    state.历史.push({type, transactionId, summary: receipt.summary ?? '', revision: state.系统.revision});
    state.历史 = state.历史.slice(-50);
    return {state, receipt, idempotent: false};
  }

  function encounterTransaction(state,transactionId,kind,request){
    const id=clean(transactionId);if(!id)throw Error('遭遇事务ID不能为空');
    const prior=Object.values(state.遭遇.列表).flatMap(e=>Object.values(e.operations??{})).find(o=>o.id===id),requestHash=abilities.hash(request);
    if(prior){if(prior.kind!==kind||prior.requestHash!==requestHash)throw Error('遭遇事务编号不能用于其他请求或场次');return {id,kind,requestHash,request,receipt:clone(prior.receipt),duplicate:true};}
    if(state.系统.last_transaction_id===id)throw Error('遭遇事务编号已被其他操作使用');
    return {id,kind,requestHash,request,duplicate:false};
  }
  function saveEncounterOperation(state,encounterId,guard,receipt){
    const e=state.遭遇.列表[encounterId];e.operations??={};e.operations[guard.id]={id:guard.id,kind:guard.kind,request:clone(guard.request),requestHash:guard.requestHash,receipt:clone(receipt)};
  }

  function ringTransaction(state,id,kind,proposal){
    if(typeof id!=='string'||!id.trim())throw Error('魂环事务ID不能为空');id=id.trim();
    const errors=validateRingOperations(state);if(errors.length)throw Error(errors.join('；'));
    const request={...clone(proposal),actorId:clean(proposal.actorId,state.角色.主控单位ID)},requestHash=abilities.hash(request),prior=state.魂环.operations?.[id];
    if(prior){if(prior.kind!==kind||prior.requestHash!==requestHash)throw Error('魂环事务编号不能用于其他请求');return {id,kind,request,requestHash,duplicate:true,receipt:clone(prior.receipt)};}
    if(state.系统.last_transaction_id===id)throw Error('魂环事务编号已被其他操作使用');
    return {id,kind,request,requestHash,duplicate:false};
  }
  function commitRing(state,guard,type,receipt){
    state.魂环.operations??={};
    state.魂环.operations[guard.id]={id:guard.id,kind:guard.kind,request:clone(guard.request),requestHash:guard.requestHash,receipt:clone(receipt),receiptHash:abilities.hash(receipt)};
    return commit(state,guard.id,type,receipt);
  }
  function validateRingOperations(state){
    const errors=[];
    if(state.魂环?.operations!==undefined&&(!state.魂环.operations||Array.isArray(state.魂环.operations)||typeof state.魂环.operations!=='object'))return ['魂环操作账本无效'];
    for(const [id,o] of Object.entries(state.魂环?.operations??{})){
      if(o?.id!==id||!['condense','absorb','prepare','name','reroll','replace-preset','confirm','prepare-item','name-item'].includes(o.kind)||o.requestHash!==abilities.hash(o.request)||!o.receipt||o.receiptHash!==abilities.hash(o.receipt)||!state.战斗单位?.列表?.[o.request?.actorId]){errors.push('魂环操作请求或回执无效');continue;}
      if(['absorb','confirm'].includes(o.kind)){
        const r=state.魂环?.列表?.[o.receipt.ringId],soul=state.武魂?.列表?.[o.receipt.martialSoulId];
        if(!r||r.持有者单位ID!==o.request.actorId||o.receipt.playerId!==o.request.actorId||r.武魂ID!==soul?.id||r.年限!==o.receipt.years||r.序号!==o.receipt.ringOrdinal||abilities.hash(r.扩展?.evolutionOriginalSkillIds??r.魂技ID列表)!==abilities.hash(o.receipt.skillIds))errors.push('魂环吸收回执与实际人物或魂环不符');
        if(o.kind==='absorb'&&r?.扩展?.absorptionTransactionId!==id)errors.push('魂环缺少对应吸收事务');
        if(o.kind==='absorb')for(const expected of o.receipt.skillDefinitions??[])if(expected.presetId){
          const actual=state.技能?.列表?.[expected.id];
          if(!actual||actual.presetId!==expected.presetId||actual.artId!==expected.artId||abilities.fingerprint(actual)!==abilities.fingerprint(expected))errors.push('精品魂技与永久吸收的完整来源不符');
        }
        if(o.kind==='confirm'){
          const absorbed=state.魂环.operations[`${id}:absorb`],base=clone(o.receipt);delete base.selection;delete base.sourceSettlement;delete base.summary;
          const comparison=clone(absorbed?.receipt??{});delete comparison.summary;
          if(absorbed?.kind!=='absorb'||absorbed.request.actorId!==o.request.actorId||abilities.hash(base)!==abilities.hash(comparison)||o.receipt.selection?.pendingId!==o.request.pendingId||o.receipt.selection?.candidateId!==o.request.candidateId)errors.push('魂技确认与实际吸收或候选不符');
        }
      }
    }
    for(const r of Object.values(state.魂环?.列表??{}))if(r.扩展?.absorptionTransactionId&&state.魂环?.operations?.[r.扩展.absorptionTransactionId]?.receipt?.ringId!==r.id)errors.push('魂环永久吸收凭据缺失');
    for(const loot of Object.values(state.战利品?.列表??{}))if(loot.类型==='魂环胚胎'&&loot.扩展?.sourceSettlement?.kind!=='ring-item'){
      const x=loot.扩展??{},o=state.魂环?.operations?.[x.condenseTransactionId],origin=x.origin,e=state.遭遇?.列表?.[origin?.encounterId],b=state.战斗?.id===origin?.battleId?state.战斗:state.世界?.backgroundBattles?.[origin?.battleId],proof=e?.terminal??o?.receipt?.battleProof,kills=b?.扩展?.击杀记录??proof?.kills??[];
      if(o?.kind!=='condense'||o.receipt.lootId!==loot.id||o.receipt.beastProfileId!==loot.来源魂兽档案ID||o.request.actorId!==x.condensedBy||abilities.hash(o.receipt.origin)!==abilities.hash(origin)||origin?.kill?.targetId!==state.魂兽档案?.列表?.[loot.来源魂兽档案ID]?.单位ID||!kills.some(k=>abilities.hash(k)===abilities.hash(origin.kill))||e&&(origin.battleId!==e.battleId||origin.expeditionId!==(e.expeditionId??'')||origin.nodeId!==(e.nodeId??'')||abilities.hash(origin.position)!==abilities.hash(e.position))||x.originBattleId!==origin?.battleId||x.originRoomId!==origin?.nodeId||x.originExpeditionId!==origin?.expeditionId)errors.push('魂环凝聚来源或永久结算缺失');
      if(!b&&(!proof||proof.battleId!==origin?.battleId||!proof.participantIds?.includes(origin?.kill?.targetId)||!proof.participantIds?.includes(origin?.kill?.killerId)||!proof.sides?.[origin?.kill?.killerId]||proof.sides[origin?.kill?.targetId]===proof.sides[origin?.kill?.killerId]))errors.push('魂环原战斗终局凭据无效');
      const actualEncounter=b?.扩展?.encounterId??o?.receipt?.battleProof?.encounterId??'';
      if(actualEncounter!==(origin?.encounterId??'')||origin?.encounterId&&!e)errors.push('魂环原始遭遇不符或已缺失');
    }
    for(const p of Object.values(state.魂环?.待选择??{})){
      const loot=state.战利品?.列表?.[p.sourceLootId],soul=state.武魂?.列表?.[p.martialSoulId],o=state.魂环?.operations?.[p.preparationTransactionId];
      if(!soul||soul.持有者单位ID!==p.playerId||!loot||loot.来源魂兽档案ID!==p.beastProfileId||abilities.hash(p.origin??null)!==abilities.hash(loot.扩展?.origin??null)||o?.kind!=='prepare'||o.receipt.pendingId!==p.id||o.request.actorId!==p.playerId)errors.push('魂技候选人物、现场或永久准备结算不符');
      if(o?.kind==='prepare'){
        const expected=Object.fromEntries(RING_GENERATION_KEYS.filter(k=>o.request[k]!==undefined).map(k=>[k,o.request[k]])),profile=state.魂兽档案?.列表?.[p.beastProfileId];
        const seed=clean(o.request.choiceSeed,`${loot?.id}:${soul?.id}:${profile?.技能种子||profile?.id}:${p.ringOrdinal}`);
        if(abilities.hash(expected)!==abilities.hash(p.generationOptions??{})||!([seed,seed+':ordinary-only'].includes(p.choiceSeed)))errors.push('魂技候选代价或领悟方向与原准备请求不符');
        for(const [saved,receipt] of [['choiceCount','choiceCount'],['distinctChoiceCount','distinctChoiceCount'],['choiceRule','choiceRule'],['sourceBudget','budget']])if(abilities.hash(p[saved])!==abilities.hash(o.receipt[receipt]))errors.push('魂技候选预算或选取规则与原准备回执不符');
        const operations=p.candidateOperations??[],recorded=Object.values(state.魂环.operations).filter(v=>['reroll','replace-preset'].includes(v.kind)&&v.request.pendingId===p.id),used=new Set();
        if(operations.length!==recorded.length||operations.length>5)errors.push('魂技替换记录缺失或重复');
        let previous=o.receipt.mechanicsHash,rerolls=0;
        for(const step of operations){const op=state.魂环.operations[step.operationId],slot='slot-'+(step.index+1);
          if(!op||op.kind!==step.kind||op.request.actorId!==p.playerId||op.request.pendingId!==p.id||op.receipt.beforeHash!==previous||op.receipt.slotId!==slot||op.receipt.index!==step.index)errors.push('魂技替换与实际来源或先后顺序不符');
          if(step.kind==='replace-preset'){if(used.has(slot)||p.freeReplacements?.[slot]?.operationId!==step.operationId)errors.push('此预设槽的免费替换次数不符');used.add(slot);}else rerolls++;
          previous=op?.receipt?.mechanicsHash;
        }
        if(previous!==p.mechanicsHash||Object.keys(p.freeReplacements??{}).length!==used.size||rerolls>1||Boolean(p.reroll?.used)!==Boolean(rerolls))errors.push('魂技选取与冻结替换结果不符');
      }
    }
    return errors;
  }

  function allocate(totalInput, weightsInput) {
    const total = Math.max(0, round(totalInput));
    const keys = foundation.ATTRIBUTE_KEYS;
    const weights = keys.map(key => Math.max(0, Number(weightsInput?.[key]) || 0));
    const safe = weights.some(Boolean) ? weights : [2, 1, 3, 0, 0, 1];
    const sum = safe.reduce((a, b) => a + b, 0);
    const exact = safe.map(value => value * total / sum);
    const result = exact.map(Math.floor);
    let remaining = total - result.reduce((a, b) => a + b, 0);
    for (const index of exact.map((value, index) => ({index, fraction: value - Math.floor(value)})).sort((a, b) => b.fraction - a.fraction || a.index - b.index)) {
      if (remaining-- <= 0) break;
      result[index.index] += 1;
    }
    return Object.fromEntries(keys.map((key, index) => [key, result[index]]));
  }

  function startMartialSoulDraft(rawState, proposal = {}, transactionId = 'start-martial-soul-draft') {
    const state = foundation.normalizeState(clone(rawState));
    const guard = transactionGuard(state, transactionId);
    if (guard.duplicate) return {state, receipt: clone(state.事务.结算), idempotent: true};
    const inspection = foundation.MARTIAL_SOUL_CORE.startInterview(proposal.description, {draftId: proposal.draftId, budget: proposal.budget});
    state.武魂.草案.列表[inspection.draftId] = clone(inspection.draft);
    state.武魂.草案.当前草案ID = inspection.draftId;
    const receipt = {type: 'martial-soul-draft-started', ...clone(inspection), llmRequired: true, summary: `武魂构想已记下，还需补充：${inspection.nextQuestion}`};
    return commit(state, guard.id, '创建武魂草案', receipt);
  }

  function updateMartialSoulDraft(rawState, proposal = {}, transactionId = 'update-martial-soul-draft') {
    const state = foundation.normalizeState(clone(rawState));
    const guard = transactionGuard(state, transactionId);
    if (guard.duplicate) return {state, receipt: clone(state.事务.结算), idempotent: true};
    const draftId = clean(proposal.draftId, state.武魂.草案.当前草案ID);
    const draft = state.武魂.草案.列表[draftId];
    if (!draft) throw new Error('武魂草案不存在');
    const inspection = foundation.MARTIAL_SOUL_CORE.applyLLMPatch(draft, proposal.llmProposal, {budget: proposal.budget});
    state.武魂.草案.列表[draftId] = clone(inspection.draft);
    const receipt = {type: 'martial-soul-draft-updated', ...clone(inspection), llmRequired: true, summary: inspection.nextQuestion || '武魂结构已完整，等待玩家确认'};
    return commit(state, guard.id, '更新武魂草案', receipt);
  }

  function confirmMartialSoulDraft(rawState, proposal = {}, transactionId = 'confirm-martial-soul-draft') {
    const state = foundation.normalizeState(clone(rawState));
    const guard = transactionGuard(state, transactionId);
    if (guard.duplicate) return {state, receipt: clone(state.事务.结算), idempotent: true};
    const draftId = clean(proposal.draftId, state.武魂.草案.当前草案ID);
    const draft = state.武魂.草案.列表[draftId];
    if (!draft) throw new Error('武魂草案不存在');
    const confirmed = {...clone(draft), playerConfirmed: proposal.playerConfirmed === true};
    const compiled = foundation.MARTIAL_SOUL_CORE.finalizeDraft(confirmed, {budget: proposal.budget, id: proposal.soulId, revision: state.系统.revision + 1});
    state.武魂.草案.列表[draftId] = {...confirmed, status: 'finalized', compiledId: compiled.id, compiled: clone(compiled)};
    const ownerId = clean(proposal.ownerId);
    let martialSoul = null;
    if (ownerId) {
      martialSoul = foundation.normalizeMartialSoul({id: compiled.id, 持有者单位ID: ownerId, 名称: compiled.name, 结构化武魂: compiled}, ownerId);
      if (state.武魂.列表[martialSoul.id]) throw new Error(`重复武魂ID：${martialSoul.id}`);
      state.武魂.列表[martialSoul.id] = martialSoul;
    }
    const receipt = {type: 'martial-soul-draft-finalized', draftId, compiled: clone(compiled), registeredSoulId: martialSoul?.id ?? '', quality: compiled.quality.name, value: compiled.pricing.total, summary: `${compiled.name}已确定，品质为${compiled.quality.name}`};
    return commit(state, guard.id, '确认武魂草案', receipt);
  }

  function refreshCombatant(state, unitId) {
    if(state.人物?.列表?.[unitId]?.life)people.syncGrowth(state,unitId);
    return foundation.refreshActiveMartialSoul(state, unitId);
  }

  function createCharacter(rawState, proposal = {}, transactionId = 'create-character') {
    const state = foundation.normalizeState(rawState);
    const guard = transactionGuard(state, transactionId);
    if (guard.duplicate) return {state, receipt: clone(state.事务.结算), idempotent: true};
    const controller = proposal.controller === 'npc' ? 'npc' : 'player';
    const id = clean(proposal.id, controller === 'player' ? 'player-main' : 'npc-soul-master');
    if (controller === 'player' && state.角色.已建立 && state.角色.主控单位ID !== id) throw new Error('当前档案已有主控角色');
    if (state.战斗单位.列表[id]) throw new Error(`重复战斗单位ID：${id}`);
    const souls = Array.isArray(proposal.martialSouls) ? proposal.martialSouls : [];
    if (souls.length < 1 || souls.length > 3) throw new Error('角色建立必须使用1至3个已经由LLM访谈、玩家确认并经代码终审的武魂');
    const level = round(clamp(proposal.level ?? 10, 1, 99));
    const normalizedSouls = souls.map(rawSoul => foundation.normalizeMartialSoul(rawSoul, id));
    const firstSoul = normalizedSouls[0];
    if (new Set(normalizedSouls.map(soul => soul.id)).size !== normalizedSouls.length) throw new Error('同一角色不能登记重复武魂ID');
    if (new Set(normalizedSouls.map(soul => `${soul.品级}:${soul.品级标签}`)).size !== 1) throw new Error('同一角色的多个武魂必须保持相同品级');
    const unitKind = controller === 'player' ? '玩家魂师' : '魂师NPC';
    const faction = clean(proposal.faction, controller === 'player' ? 'player' : 'neutral');
    const tags = cleanList([controller === 'player' ? '主控角色' : '非玩家魂师', ...(proposal.tags ?? [])]);
    const unit = foundation.normalizeCombatant({
      id, 名称: clean(proposal.name, '未命名魂师'), 阵营: faction, 单位种类: unitKind,
      标签: tags, 六维: {基础: proposal.attributes ?? {}}, 属性谱: proposal.affinitySpectrum ?? {}, 抗性: proposal.resistances ?? {},
      位置: {距离区: clean(proposal.zone, '近距'), 站位簇: clean(proposal.cluster, controller === 'player' ? 'player' : 'npc'), 地形标签: cleanList(proposal.terrainTags), 掩体: clean(proposal.cover, '无'), 接战单位ID: []},
      成长: {类型: '魂师', 魂力等级: level, 成长记录ID: id},
      扩展: {...clone(proposal.unitExtensions ?? {}),普通攻击档案:abilities.seal({id:'ordinary.attack',name:'徒手攻击',source:'unarmed',soulPowerCost:0,requirements:['gesture'],effectSpecs:[['release.melee',{}],['target.single',{}],['check.physical_attack',{}],['payload.damage',{类型:'物理',骰数:1,骰面:4,加值:0}]]})}
    }, {id, kind: unitKind, level, martialSoulGrade: firstSoul.品级, capacityModifier: firstSoul.身体容量修正, stabilityModifier: firstSoul.灵魂稳定修正});
    if (controller === 'player') state.角色 = {已建立: true, 主控单位ID: id, 档案: clone(proposal.dossier ?? {}), 扩展: {createdBy: 'cycle-engine'}};
    state.战斗单位.列表[id] = unit;
    state.成长.列表[id] = {
      id: `growth-${id}`, 单位ID: id, 魂力等级: level, 当前经验: 0,
      当前等级需求: 100 + level * 25, 瓶颈等级: Math.ceil(level / 10) * 10,
      瓶颈状态: level % 10 === 0 && level < 99 ? '积累经验' : '未到瓶颈', 溢出经验: 0,
      可用属性点: 0, 已投入属性点: 0, 每级属性点: 0, 属性投入: allocate(0, {}),
      武魂ID列表: [], 激活武魂ID: firstSoul.id, 封号: foundation.normalizeTitleRecord(proposal.title ?? {}, level), 扩展: clone(proposal.growthExtensions ?? {})
    };
    for (const martialSoul of normalizedSouls) {
      if (state.武魂.列表[martialSoul.id]) throw new Error(`重复武魂ID：${martialSoul.id}`);
      state.武魂.列表[martialSoul.id] = martialSoul;
      state.成长.列表[id].武魂ID列表.push(martialSoul.id);
    }
    foundation.refreshActiveMartialSoul(state, id, {preserveResources: false});
    const receipt = {type: 'character-created', controller, unitId: id, level, martialSoulIds: clone(state.成长.列表[id].武魂ID列表), attributes: clone(unit.六维), derived: clone(unit.派生), summary: `建立${unit.名称}与${souls.length}个武魂`};
    return commit(state, guard.id, '建立角色与武魂', receipt);
  }

  function switchMartialSoul(rawState, proposal = {}, transactionId = 'switch-martial-soul') {
    const state = foundation.normalizeState(clone(rawState));
    const guard = transactionGuard(state, transactionId);
    if (guard.duplicate) return {state, receipt: clone(state.事务.结算), idempotent: true};
    const unitId = clean(proposal.unitId, state.角色.主控单位ID);
    if(combat.occupiedBattle(state,unitId))throw new Error('战斗中切换武魂必须作为本场主行动结算');
    if(state.人物?.列表?.[unitId])people.assertAlive(state,unitId);
    if(state.战斗单位.列表[unitId]?.存活状态!=='存活'||state.战斗单位.列表[unitId]?.资源.生命.当前<=0)throw Error('行动者已失能，不能切换武魂');
    const targetSoulId = clean(proposal.martialSoulId ?? proposal.targetSoulId);
      const switched = foundation.switchActiveMartialSoul(state, unitId, targetSoulId,{operationId:transactionId});
      combat.pruneMaintenance(state);
    const target = state.武魂.列表[targetSoulId];
    const receipt = {
      type: 'martial-soul-switched', unitId, previousSoulId: switched.previousSoulId, martialSoulId: targetSoulId,
      endedStatusIds: switched.endedStatusIds, endedDomainIds: switched.endedDomainIds,
      summary: `${state.战斗单位.列表[unitId].名称}切换为${target?.名称??'收回武魂'}`
    };
    return commit(state, guard.id, '切换武魂', receipt);
  }

  function inferBeastAttributes(profile) {
    const level=foundation.soulBeastEffectiveLevel(profile.年限);
    // Age already supplies levels, resources and skill budget. Six attributes share
    // one growth pool; applying the whole age gain to every attribute multiplied it sixfold.
    const attributes={力量:13,身法:11,体魄:14,悟性:8,感知:11,意志:10};
    const order=['体魄','力量','身法','感知','意志','悟性'].sort((left,right)=>Number(profile.属性偏向?.[right]??0)-Number(profile.属性偏向?.[left]??0));
    const allocation=[order[0],order[1],order[0],order[1],order[2],order[3]];
    for(let point=0;point<2*Math.floor(level/10);point++)attributes[allocation[point%allocation.length]]++;
    return attributes;
  }

  function beastCompilationHash(compilation){
    return abilities.hash({registryVersion:compilation?.registryVersion,speciesTemplateId:compilation?.speciesTemplateId,tags:compilation?.tags,baselineCost:compilation?.baselineCost,budget:compilation?.budget,skills:(compilation?.skills??[]).map(skill=>abilities.fingerprint(skill))});
  }
  // Older Chinese desktop builds used zh-CN for equal-budget upgrade ties.
  // Reconstruct the whole registered package, including every skill and cost.
  function matchSavedBeastPreset(id,context,savedHash){
    const expected=presets.compile(id,context);
    if(!expected.pass)return null;
    if(beastCompilationHash(expected.mechanics.compilation)===savedHash)return expected;
    const former=presets.compile(id,context,(left,right)=>left.localeCompare(right,'zh-CN'));
    return former.pass&&beastCompilationHash(former.mechanics.compilation)===savedHash?former:null;
  }
  function validatePresetBeastProfile(profile){
    const x=profile?.扩展??{},id=x.presetId;
    if(!id){if(x.presetSource||x.presetContractHash||x.生成谱系?.presetId)throw Error('精品魂兽来源编号缺失');return null;}
    const entry=presets.get(id),recipeHash=entry&&abilities.hash({category:entry.category,recipe:entry.recipe});
    if(!entry||entry.category!=='魂兽'||x.artId!==entry.artId||x.presetContractHash!==recipeHash)throw Error('精品魂兽登记配方或图片来源不符');
    const compilationHash=beastCompilationHash(x.能力账本);
    const expected=matchSavedBeastPreset(id,{years:profile.年限,seed:profile.技能种子,id:profile.id},compilationHash);
    if(!expected)throw Error('精品魂兽完整血脉、能力或实际来源已改变');
    const source={presetId:id,recipeHash,speciesId:entry.recipe.speciesId,profileId:profile.id,unitId:profile.单位ID,years:profile.年限,skillSeed:profile.技能种子,lineageHash:abilities.hash(expected.mechanics.lineage),compilationHash};
    const declared=foundation.normalizeSoulBeastProfile({...expected.mechanics.profile,物种ID:entry.recipe.speciesId,单位ID:profile.单位ID},profile.单位ID);
    if(abilities.hash(x.presetSource)!==abilities.hash(source)||profile.物种ID!==entry.recipe.speciesId||profile.名称!==entry.name||abilities.hash(profile.血脉)!==source.lineageHash||!effects.sourceTraitsMatch(profile,declared.种族特征,expected.mechanics.compilation)||['类别标签','解剖标签','属性谱'].some(key=>abilities.hash(profile[key])!==abilities.hash(declared[key])))throw Error('精品魂兽完整血脉、能力或实际来源已改变');
    if(x.生成谱系?.presetId!==id)throw Error('精品魂兽生成谱系缺少原预设');
    return entry;
  }
  function validatePresetBeasts(state){
    const errors=[];
    for(const profile of Object.values(state.魂兽档案?.列表??{}))try{
      const entry=validatePresetBeastProfile(profile);if(!entry)continue;
      const unit=state.战斗单位?.列表?.[profile.单位ID],x=profile.扩展;
      if(!unit||unit.扩展?.魂兽档案ID!==profile.id||unit.扩展.presetId!==entry.id||unit.扩展.artId!==entry.artId||unit.扩展.presetContractHash!==x.presetContractHash)throw Error('精品魂兽实际单位与档案来源不符');
      const natural=x.能力账本.skills[0],attack=unit.扩展.普通攻击档案;
      if(abilities.hash(attack?.effectSpecs)!==abilities.hash(natural.effectGraph.nodes.map(node=>[node.effectId,node.params??{}])))throw Error('精品魂兽原生攻击被替换');
      for(const skill of x.能力账本.skills.slice(1))if(!unit.能力.技能ID.includes(skill.id)||abilities.fingerprint(state.技能?.列表?.[skill.id]??{})!==abilities.fingerprint(skill))throw Error('精品魂兽实际技能与完整登记配方不符');
    }catch(error){errors.push('精品魂兽'+profile.id+'来源无效：'+error.message);}
    for(const encounter of Object.values(state.遭遇?.列表??{}))for(const operation of Object.values(encounter.operations??{}))if(operation.kind==='create')for(const member of operation.request.members??[operation.request])if(member.presetId){
      const profile=state.魂兽档案?.列表?.[member.profileId??('profile-'+member.unitId)];
      if(!profile||profile.扩展?.presetId!==member.presetId||profile.扩展?.presetContractHash!==member.presetContractHash||profile.扩展?.artId!==member.artId||abilities.hash(profile.血脉)!==abilities.hash(member.lineage)||beastCompilationHash(profile.扩展?.能力账本)!==beastCompilationHash(member.compilation))errors.push('精品魂兽永久遭遇来源与正式档案不符');
    }
    return errors;
  }

  function createEncounter(rawState, proposal = {}, transactionId = 'create-encounter') {
    const state = foundation.normalizeState(clone(rawState));
    const guard = encounterTransaction(state,transactionId,'create',proposal);
    if (guard.duplicate) return {state, receipt:guard.receipt, idempotent: true};
    if (!state.角色.已建立) throw new Error('请先建立角色档案');
    const encounterId = clean(proposal.encounterId, `encounter-${state.系统.revision + 1}`);
    if(state.遭遇.列表[encounterId])throw Error('遭遇编号已经使用，不能覆盖原场次');
    const leaderId=clean(proposal.actorId,state.角色.主控单位ID),leader=state.人物?.列表?.[leaderId];people.assertAlive(state,leaderId);
    const position=positions.positionOf(state,leaderId);if(position.kind!=='location')throw Error('须先抵达实际场所再建立猎魂遭遇');
    const locationId=clean(proposal.locationId,leader.locationId);if(locationId!==leader.locationId)throw Error('遭遇地点与实际领队不符');
    if(proposal.expeditionId){const a=expeditions.resolve(state,{actorId:leaderId,sessionId:proposal.expeditionId});if(a.leaderId!==leaderId||a.currentNodeId!==proposal.nodeId||a.entranceLocationId!==locationId)throw Error('遭遇不属于领队的当前远征房间');}
    const members = Array.isArray(proposal.members) && proposal.members.length ? proposal.members : [proposal];
    const profileIds = [];
    const unitIds = [];
    const participantConfigs = {};
    const compiled = [];
    for (const [index, rawMemberProposal] of members.entries()) {
      const kind = rawMemberProposal.kind === 'existing' || clean(rawMemberProposal.existingUnitId) ? 'existing'
        : rawMemberProposal.kind === 'ally' ? 'ally' : 'beast';
      const generated = kind === 'beast' && !clean(rawMemberProposal.speciesId)
        ? generateSoulBeastProposal({...rawMemberProposal, seed: clean(rawMemberProposal.seed, `${encounterId}-${index + 1}`)})
        : {};
      const memberProposal = {...generated, ...rawMemberProposal};
      if(kind==='beast'&&!memberProposal.lineage)memberProposal.lineage=foundation.BEAST_VALUE.generateLineage({seed:memberProposal.skillSeed??memberProposal.seed??`${encounterId}:${index}`});
      const unitId = kind === 'existing'
        ? clean(memberProposal.existingUnitId ?? memberProposal.unitId)
        : clean(memberProposal.unitId, `${kind}-${encounterId}-${index + 1}`);
      if (unitIds.includes(unitId)) throw new Error(`重复遭遇单位ID：${unitId}`);
      if (kind !== 'existing' && state.战斗单位.列表[unitId]) throw new Error(`重复遭遇单位ID：${unitId}`);
      let unit;
      if (kind === 'existing') {
        unit = state.战斗单位.列表[unitId];
        if (!unit) throw new Error(`既有参战单位不存在：${unitId}`);
        unit.扩展 = {...clone(unit.扩展 ?? {}), 遭遇队友:true};
      } else if (kind === 'ally') {
        const level = round(clamp(memberProposal.level ?? state.成长.列表[leaderId]?.魂力等级 ?? 10, 1, 99));
        unit = foundation.normalizeCombatant({
          id: unitId,
          名称: clean(memberProposal.name, '同行魂师'),
          阵营: 'ally',
          单位种类: '魂师NPC',
          标签: cleanList(['队友', ...(memberProposal.tags ?? [])]),
          六维: {基础: memberProposal.attributes ?? {力量: 10, 身法: 11, 体魄: 11, 悟性: 10, 感知: 10, 意志: 10}},
          属性谱: memberProposal.affinitySpectrum ?? {},
          位置: {距离区: clean(memberProposal.zone, '近距'), 站位簇: clean(memberProposal.cluster, 'hunters'), 地形标签: cleanList(memberProposal.terrainTags), 掩体: clean(memberProposal.cover, '无'), 接战单位ID: []},
          成长: {类型: '魂师', 魂力等级: level},
          抗性: memberProposal.resistances ?? {},
          能力: {技能ID: cleanList(memberProposal.skillIds)},
          扩展: {遭遇队友:true,普通攻击档案:abilities.seal({id:'ordinary.attack',name:'徒手攻击',source:'unarmed',soulPowerCost:0,requirements:['gesture'],effectSpecs:[['release.melee',{}],['target.single',{}],['check.physical_attack',{}],['payload.damage',{类型:'物理',骰数:1,骰面:4,加值:0}]]})}
        }, {id: unitId, kind: '魂师NPC', level});
      } else {
        const profile = foundation.normalizeSoulBeastProfile({
          id: clean(memberProposal.profileId, `profile-${unitId}`), 单位ID: unitId,
          物种ID: clean(memberProposal.speciesId, 'generic-beast'), 名称: clean(memberProposal.name, '未命名魂兽'),
          年限: memberProposal.years ?? 50, 血脉: memberProposal.lineage,
          完整度: memberProposal.integrity ?? 1,
          类别标签: memberProposal.categoryTags ?? [], 种族特征: memberProposal.speciesTraits ?? [],
          个体变异: memberProposal.mutations ?? [], 解剖标签: memberProposal.anatomyTags ?? [],
          属性谱: memberProposal.affinitySpectrum ?? memberProposal.attributeSpectrum ?? {},
          肉身威胁: memberProposal.physicalThreat ?? 1, 精神威胁: memberProposal.spiritualThreat ?? 0.6,
          残留意志: memberProposal.residualWill ?? 0.5, 属性偏向: memberProposal.attributeBias ?? {},
          技能种子: clean(memberProposal.skillSeed, `${encounterId}-${index + 1}`), 魂环状态: '无',
          扩展: {
            生成谱系: {...clone(memberProposal.generation ?? {}),...(memberProposal.presetId?{presetId:memberProposal.presetId}:{})},描述:clean(memberProposal.description),外形:clean(memberProposal.appearance),
            生态:clean(memberProposal.ecology),地域来源:clone(memberProposal.regionalOrigin ?? {}),头像URL:clean(memberProposal.avatarUrl),
            ...(memberProposal.presetId?{presetId:memberProposal.presetId,artId:memberProposal.artId,presetContractHash:memberProposal.presetContractHash}:{})
          }
        }, unitId);
        const compilation = memberProposal.compilation ? clone(memberProposal.compilation) : effects.compileSoulBeastSkills(profile, {...effects.sourceBeastOptions(profile),seed: profile.技能种子});
        effects.validateBeastCompilation(profile,compilation);
        profile.扩展.能力账本=clone(compilation);
        // Supplied compilation belongs to a frozen roster; preserve its original evidence.
        if(!memberProposal.compilation)profile.种族特征=effects.sourceTraitsWithBridges(profile,compilation);
        if(memberProposal.presetId){
          const entry=presets.get(memberProposal.presetId);
          if(!entry||entry.category!=='魂兽')throw Error('遭遇精品魂兽来源不存在');
          profile.扩展.presetSource={presetId:entry.id,recipeHash:abilities.hash({category:entry.category,recipe:entry.recipe}),speciesId:entry.recipe.speciesId,profileId:profile.id,unitId,years:profile.年限,skillSeed:profile.技能种子,lineageHash:abilities.hash(profile.血脉),compilationHash:beastCompilationHash(compilation)};
          validatePresetBeastProfile(profile);
        }
        unit = foundation.normalizeCombatant({
          id: unitId, 名称: profile.名称, 阵营: 'beast', 单位种类: '魂兽',
          标签: [...profile.类别标签, ...profile.种族特征], 六维: {基础: inferBeastAttributes(profile)},
          属性谱: profile.属性谱,
          位置: {距离区: clean(memberProposal.zone, '近距'), 站位簇: clean(memberProposal.cluster, 'beasts'), 地形标签: cleanList(memberProposal.terrainTags), 掩体: clean(memberProposal.cover, '无'), 接战单位ID: []},
          成长: {类型: '魂兽', 年限: profile.年限, 种族品级: profile.种族品级},
          抗性: memberProposal.resistances ?? {}, 扩展: {魂兽档案ID: profile.id,描述:clean(memberProposal.description),外形:clean(memberProposal.appearance),生态:clean(memberProposal.ecology),头像URL:clean(memberProposal.avatarUrl),头像接口:'unit.扩展.头像URL',...(memberProposal.presetId?{presetId:profile.扩展.presetId,artId:profile.扩展.artId,presetContractHash:profile.扩展.presetContractHash}: {})}
        }, {
          id: unitId, kind: '魂兽', beastYears: profile.年限, beastGrade: profile.种族品级
        });
        const natural = compilation.skills[0];
        if (natural) unit.扩展.普通攻击档案 = abilities.seal({
          id:'ordinary.attack',soulPowerCost:0,requirements:['gesture'],
          name: clean(memberProposal.naturalAttackName, natural.name),
          source: 'soul-beast-anatomy',
          effectSpecs: natural.effectGraph.nodes.map(node => [node.effectId, clone(node.params ?? {})])
        });
        for (const [skillIndex, skill] of compilation.skills.slice(1).entries()) {
          const narrative = memberProposal.skillNarratives?.[skillIndex];
          if (clean(narrative?.name)) skill.name = clean(narrative.name);
          skill.名称 = skill.name;
          skill.扩展 = {...clone(skill.扩展 ?? {}), 描述:clean(narrative?.description), 命名来源:clean(narrative?.name) ? 'llm-frozen-mechanics-narrative' : 'code-placeholder'};
          state.技能.列表[skill.id] = clone(skill);
          unit.能力.技能ID.push(skill.id);
        }
        state.魂兽档案.列表[profile.id] = profile;
        profileIds.push(profile.id);
        compiled.push({profile, unit, compilation});
      }
      state.战斗单位.列表[unitId] = unit;
      unitIds.push(unitId);
      participantConfigs[unitId] = {
        sideId: clean(memberProposal.sideId, kind === 'beast' ? 'beasts' : 'hunters'),
        sideName: clean(memberProposal.sideName, kind === 'beast' ? '魂兽群' : '猎魂小队'),
        controller: memberProposal.controller === 'player' ? 'player' : 'ai',
        canFlee: memberProposal.canFlee !== false,
        morale: round(clamp(memberProposal.morale ?? (kind === 'beast' ? 45 : 65), 0, 100))
      };
    }
    const foreground=[leaderId,...unitIds].includes(state.角色.主控单位ID);
    if(proposal.foreground!==undefined&&proposal.foreground!==foreground)throw Error('遭遇前后台须由实际玩家是否参与决定');
    if(foreground)state.遭遇.当前遭遇ID = encounterId;
    state.遭遇.列表[encounterId] = {
      id: encounterId, leaderId,locationId,position:clone(position),foreground,expeditionId:proposal.expeditionId??null,nodeId:proposal.nodeId??null,battleId:'',状态: '待判定', 魂兽档案ID列表: profileIds, 战斗单位ID列表: unitIds,
      地点: clean(proposal.location, '猎魂森林'), 危险度: clean(proposal.danger, '适中'), seed: clean(proposal.seed, encounterId),
      扩展: {参战配置: participantConfigs, 场景信号: cleanList(proposal.sceneSignals?.length ? proposal.sceneSignals : ['敌对遭遇', '主动攻击']), 战斗判定: {}}
    };
    if(foreground){state.场景.当前魂兽ID = compiled[0]?.unit.id ?? '';state.场景.地点 = state.遭遇.列表[encounterId].地点;state.场景.状态 = '遭遇待判定';}
    const first = compiled[0];
    const receipt = {
      type: 'encounter-created', encounterId, leaderId,position:clone(position),beastProfileId: first?.profile.id ?? '', unitId: first?.unit.id ?? unitIds[0],
      beastProfileIds: clone(profileIds), unitIds: clone(unitIds), participantConfigs: clone(participantConfigs),
      speciesTemplateId: first?.compilation.speciesTemplateId ?? '', years: first?.profile.年限 ?? 0, speciesGrade: first?.profile.种族品级 ?? 0,
      effectiveLevel: first?.unit.派生.有效等级 ?? 0, skillIds: clone(first?.unit.能力.技能ID ?? []), budget: clone(first?.compilation.budget ?? {}),
      summary: `生成${unitIds.length}名单位的${profileIds.length > 1 ? '多人魂兽遭遇' : '遭遇'}`
    };
    saveEncounterOperation(state,encounterId,guard,receipt);return commit(state, guard.id, '生成魂兽', receipt);
  }

  function encounterParticipants(state, encounter) {
    const playerId = encounter.leaderId;
    const participantIds = cleanList([playerId, ...encounter.战斗单位ID列表]);
    const participantConfigs = clone(encounter.扩展?.参战配置 ?? {});
    participantConfigs[playerId] = {sideId: 'hunters', sideName: '猎魂小队', controller:playerId===state.角色.主控单位ID?'player':'ai', canFlee: true, morale: 70};
    return {participantIds, participantConfigs};
  }

  function huntEncounter(state,options){
    const encounter=state.遭遇.列表[clean(options.encounterId,state.遭遇.当前遭遇ID)];if(!encounter)throw Error('没有指定的猎魂遭遇');
    if(options.actorId!==undefined&&options.actorId!==encounter.leaderId||options.expeditionId!==undefined&&options.expeditionId!==encounter.expeditionId)throw Error('遭遇实际领队或远征来源不符');
    people.assertAlive(state,encounter.leaderId);
    if(abilities.hash(positions.positionOf(state,encounter.leaderId))!==abilities.hash(encounter.position))throw Error('领队已经离开原遭遇实际现场');
    if(encounter.expeditionId){const a=expeditions.resolve(state,{sessionId:encounter.expeditionId,actorId:encounter.leaderId});if(a.leaderId!==encounter.leaderId||a.currentNodeId!==encounter.nodeId)throw Error('原遭遇房间已经变化');}
    return encounter;
  }

  function judgeHuntScene(rawState, options = {}, transactionId = 'judge-hunt-scene') {
    const state = foundation.normalizeState(clone(rawState));
    const guard = encounterTransaction(state,transactionId,'judge',options);
    if (guard.duplicate) return {state, receipt:guard.receipt, idempotent: true};
    const encounter = huntEncounter(state,options);
    if(encounter.battleId||encounter.状态==='已结束')throw Error('该遭遇已经开战或结束，不能重新判定');
    const participants = encounterParticipants(state, encounter);
    const evaluation = combat.evaluateCombatScene(state, {
      ...participants,
      signals: options.signals ?? encounter.扩展?.场景信号 ?? [],
      surprisedIds: options.surprisedIds ?? encounter.扩展?.措手不及单位ID列表 ?? []
    });
    encounter.扩展.战斗判定 = clone(evaluation);
    encounter.状态 = evaluation.canStart ? '待战斗' : evaluation.decision;
    if(encounter.foreground)state.场景.状态 = evaluation.decision;
    const receipt = {...evaluation, encounterId: encounter.id, summary: `场景判定：${evaluation.decision}（${evaluation.reason}）`};
    saveEncounterOperation(state,encounter.id,guard,receipt);return commit(state, guard.id, '判断战斗场景', receipt);
  }

  function startHuntBattle(rawState, options = {}, transactionId = 'start-hunt') {
    const state = foundation.normalizeState(clone(rawState));
    const guard = encounterTransaction(state,transactionId,'start',options);
    if (guard.duplicate) return {state, receipt:guard.receipt, idempotent: true};
    const encounter = huntEncounter(state,options);
    if(encounter.battleId||encounter.状态==='已结束')throw Error('该遭遇已经开战或结束');
    const participants = encounterParticipants(state, encounter);
    for(const id of participants.participantIds)if(state.人物?.列表?.[id]){people.assertAlive(state,id);if(!positions.colocated(state,encounter.leaderId,id))throw Error('原遭遇参与者已不在同一实际现场');}
    const foreground=participants.participantIds.includes(state.角色.主控单位ID);if(options.background!==undefined&&options.background===foreground)throw Error('战斗前后台与实际玩家参与不符');
    const evaluation = combat.evaluateCombatScene(state, {...participants, signals: options.signals ?? encounter.扩展?.场景信号 ?? ['主动攻击'], surprisedIds: options.surprisedIds??encounter.扩展?.战斗判定?.surprisedIds});
    const started = (foreground?combat.startBattle:combat.startBackgroundBattle)(state, {
      id: clean(options.battleId, `battle-${encounter.id}`),
      battleKind:'hunt',
      locationId:encounter.locationId,
      ...participants,
      sceneEvaluation: evaluation,
      seed: options.seed ?? 1,
      positions: options.positions,
      objective: options.objective ?? '击败魂兽或安全撤离',
      escapeRoutes: options.escapeRoutes
    });
    const recorded=started.state.遭遇.列表[encounter.id];recorded.状态 = '战斗中';recorded.battleId=started.receipt.battleId;
    const battle=foreground?started.state.战斗:started.state.世界.backgroundBattles[recorded.battleId];battle.扩展.encounterId=encounter.id;
    started.state.系统.last_transaction_id = guard.id;
    started.state.事务 = {id: guard.id, 类型: '开始战斗', 状态: '已结算', 请求提交: false, 提案: {}, 结算: clone(started.receipt)};
    saveEncounterOperation(started.state,encounter.id,guard,started.receipt);
    return started;
  }

  function reconcileEncounterBattle(state,battleId){
    const battle=state.战斗?.id===battleId?state.战斗:state.世界?.backgroundBattles?.[battleId];if(!battle)return null;
    const encounter=state.遭遇?.列表?.[battle.扩展?.encounterId];if(!encounter)return null;
    if(encounter.battleId!==battleId)throw Error('遭遇与实际战斗绑定不一致');
    if(battle.状态==='已结束'){encounter.状态='已结束';encounter.terminal=encounterTerminal(battle);encounter.扩展.战斗结果=clone(battle.扩展.结果);if(state.遭遇.当前遭遇ID===encounter.id&&encounter.foreground)state.场景.状态=battle.扩展.结果.outcome??'战斗结束';}
    return encounter;
  }
  function encounterTerminal(battle){return {battleId:battle.id,encounterId:battle.扩展.encounterId,locationId:battle.扩展.地点ID,participantIds:clone(battle.参与者ID列表),sides:Object.fromEntries(Object.entries(battle.扩展.成员).map(([id,m])=>[id,m.sideId])),memberStatuses:Object.fromEntries(Object.entries(battle.扩展.成员).map(([id,m])=>[id,m.status])),kills:clone(battle.扩展.击杀记录??[]),result:clone(battle.扩展.结果),lastReceipt:clone(battle.最近结算单)};}
  function validEncounterParticipants(state,encounter,started){
    const terminal=encounter.terminal,base=[encounter.leaderId,...encounter.战斗单位ID列表],teams=started.receipt.teams??{},initial=Object.values(teams).flatMap(t=>t.memberIds??[]),actual=terminal.participantIds;
    if(!Array.isArray(actual)||new Set(actual).size!==actual.length||new Set(initial).size!==initial.length||base.some(id=>!initial.includes(id))||initial.some(id=>!actual.includes(id)))return false;
    for(const id of actual){const team=Object.values(teams).find(t=>t.memberIds?.includes(id));if(team&&terminal.sides[id]!==team.id)return false;if(base.includes(id))continue;
      const deployment=globalThis.SoulCombatDeployments?.table(state).records.find(r=>r.unitId===id&&globalThis.SoulCombatDeployments.table(state).events.some(e=>e.deploymentId===r.id&&e.type==='joined'&&e.battleId===encounter.battleId)),unit=state.战斗单位.列表[id],summon=unit?.扩展?.召唤;
      if(deployment&&actual.includes(deployment.casterId)&&terminal.sides[id]===terminal.sides[deployment.casterId])continue;
      const construct=state.扩展?.creationConstructs?.records?.find(r=>r.unitId===id&&r.kind==='summon');if(construct&&initial.includes(id)&&state.扩展.creationConstructs.events.some(e=>e.constructId===construct.id&&e.kind==='battle-bound'&&e.battleId===encounter.battleId)&&terminal.sides[id]===terminal.sides[construct.actorId])continue;
      if(summon?.战斗ID===encounter.battleId&&actual.includes(summon.来源单位ID)&&terminal.sides[id]===terminal.sides[summon.来源单位ID])continue;
      return false;
    }
    return true;
  }
  function validateEncounterBindings(state){
    const errors=[],operationIds=new Set(),battleIds=new Set();
    for(const [id,e] of Object.entries(state.遭遇?.列表??{}))try{
      if(e.id!==id||!state.人物?.列表?.[e.leaderId]||!state.地图?.地点?.[e.locationId]||typeof e.foreground!=='boolean'||!e.operations||Array.isArray(e.operations))throw Error('遭遇身份或操作记录缺失');
      const operations=Object.values(e.operations),created=operations.filter(o=>o.kind==='create'),started=operations.filter(o=>o.kind==='start');
      if(created.length!==1||started.length>1||!!e.battleId!==(started.length===1)||created[0].receipt.encounterId!==id)throw Error('遭遇创建与开战记录不一致');
      if(e.position?.kind!=='location'||e.position.locationId!==e.locationId||created[0].receipt.leaderId!==e.leaderId||abilities.hash(created[0].receipt.position)!==abilities.hash(e.position)||e.foreground!==[e.leaderId,...e.战斗单位ID列表].includes(state.角色.主控单位ID))throw Error('遭遇现场或前后台来源不符');
      if(abilities.hash(created[0].receipt.unitIds)!==abilities.hash(e.战斗单位ID列表)||abilities.hash(created[0].receipt.beastProfileIds)!==abilities.hash(e.魂兽档案ID列表)||abilities.hash(created[0].receipt.participantConfigs)!==abilities.hash(e.扩展.参战配置))throw Error('遭遇生成名单与永久回执不符');
      const request=created[0].request;if((request.actorId??state.角色.主控单位ID)!==e.leaderId||request.locationId!==undefined&&request.locationId!==e.locationId||(request.expeditionId??null)!==e.expeditionId||(request.nodeId??null)!==e.nodeId)throw Error('遭遇来源被替换');
      for(const [key,o] of Object.entries(e.operations)){if(o.id!==key||operationIds.has(key)||!['create','judge','start'].includes(o.kind)||o.requestHash!==abilities.hash(o.request)||!o.receipt||o.kind!=='start'&&o.receipt.encounterId!==id||o.request.encounterId!==undefined&&o.request.encounterId!==id)throw Error('遭遇事务内容或编号无效');operationIds.add(key);}
      if(e.battleId){
        if(battleIds.has(e.battleId)||started[0].receipt.battleId!==e.battleId)throw Error('遭遇战斗重复或被替换');battleIds.add(e.battleId);
        const b=state.战斗?.id===e.battleId?state.战斗:state.世界?.backgroundBattles?.[e.battleId];
        if(b&&(b.扩展?.encounterId!==id||b.扩展?.地点ID!==e.locationId||!b.参与者ID列表.includes(e.leaderId)||e.战斗单位ID列表.some(uid=>!b.参与者ID列表.includes(uid))))throw Error('遭遇与实际战斗来源不符');
        if(b&&(e.状态==='已结束')!==(b.状态==='已结束'))throw Error('遭遇与实际战斗阶段不符');
        if(e.terminal&&(e.terminal.battleId!==e.battleId||e.terminal.encounterId!==id||e.terminal.locationId!==e.locationId||!validEncounterParticipants(state,e,started[0])||b&&abilities.hash(e.terminal)!==abilities.hash(encounterTerminal(b))))throw Error('遭遇终局凭证与实际战斗不符');
        if(!b&&(!e.foreground||e.状态!=='已结束'||!e.terminal))throw Error('遭遇缺少实际战斗或终局凭证');
      }
      if(e.expeditionReward){
        if(e.expeditionReward.recipientId!==e.leaderId)throw Error('远征领队经验来源被替换');
        const t=e.terminal,rewards=[e.expeditionReward,...(e.expeditionReward.companions??[])];
        if(new Set(rewards.map(r=>r.recipientId)).size!==rewards.length)throw Error('Duplicate experience recipients');
        for(const r of rewards){
        if(!t||!e.expeditionId||r.expeditionId!==e.expeditionId||r.nodeId!==e.nodeId||r.battleId!==e.battleId||!t.participantIds.includes(r.recipientId)||t.sides[r.recipientId]!==t.sides[e.leaderId]||!['paid','skipped-dead','no-growth'].includes(r.status)||!Number.isSafeInteger(r.at)||!Array.isArray(r.kills)||!r.receipt||r.receipt.unitId!==r.recipientId)throw Error('远征经验缺少对应终局来源');
        const expected=t.kills.filter(k=>e.战斗单位ID列表.includes(k.targetId)&&t.sides[k.targetId]!==t.sides[r.recipientId]&&t.sides[k.killerId]===t.sides[r.recipientId]);
        if(abilities.hash(expected)!==abilities.hash(r.kills)||abilities.hash(cleanList(r.kills.map(k=>k.targetId)))!==abilities.hash(r.defeatedIds)||abilities.hash(r.receipt.defeatedUnitIds)!==abilities.hash(r.defeatedIds))throw Error('远征经验击杀来源被替换');
        const amount=r.status==='paid'?r.defeatedIds.reduce((sum,id)=>{const u=state.战斗单位.列表[id];if(!u||u.存活状态!=='死亡')throw Error('经验目标不是实际死亡单位');return sum+scaleExperienceReward(baseExperienceForLevels(u.派生.有效等级,r.recipientLevel,u.单位种类));},0):0;
        if(r.status!=='no-growth'&&!Number.isSafeInteger(r.recipientLevel)||r.receipt.experienceGained!==amount)throw Error('远征经验数额与实际规则不符');
        if(state.远征?.processedTransactions?.[r.transactionId]?.transactionType!=='结算远征战斗')throw Error('远征经验缺少永久结算事务');
        }
      }
    }catch(error){errors.push(`遭遇${id}无效：${error.message}`);}
    for(const b of [state.战斗,...Object.values(state.世界?.backgroundBattles??{})])if(b?.扩展?.encounterId&&state.遭遇?.列表?.[b.扩展.encounterId]?.battleId!==b.id)errors.push('实际战斗缺少对应遭遇或绑定不一致');
    return errors;
  }
  function settleCombatAction(rawState, intent,options={}) {
    const battleId=clean(options.battleId,rawState.战斗.id);
    if(options.encounterId&&rawState.遭遇.列表[options.encounterId]?.battleId!==battleId)throw Error('行动战斗与指定遭遇不符');
    return finishCombatAction(combat.settleBattleAction(rawState,battleId,intent,options.owned===true),battleId,intent);
  }
  function settleCommittedCombatAction(state,intent) {
    return finishCombatAction(combat.settleCommittedAction(state,intent),state.战斗.id,intent);
  }
  function finishCombatAction(result,battleId,intent) {
    reconcileEncounterBattle(result.state,battleId);
    result.state.事务 = {id: intent.id, 类型: '结算战斗回合', 状态: '已结算', 请求提交: false, 提案: {}, 结算: clone(result.receipt)};
    return result;
  }

  function creditedCombatSource(state, sourceUnitId) {
    let currentId = clean(sourceUnitId);
    const seen = new Set();
    while (currentId && !seen.has(currentId)) {
      seen.add(currentId);
      const source = state.战斗单位.列表[currentId];
      if (!source) return '';
      const summonerId = clean(globalThis.SoulCombatDeployments?.sourceContext(state,currentId)?.creditOwnerId??source.扩展?.召唤?.来源单位ID);
      if (!summonerId || summonerId===currentId || !state.战斗单位.列表[summonerId]) return currentId;
      currentId = summonerId;
    }
    return '';
  }

  function recoverKillRecord(state, targetId, battle) {
    const receipts = [...(battle.扩展?.结算单列表 ?? [])];
    const target = state.战斗单位.列表[targetId];
    if (!target || target.存活状态 !== '死亡') return null;
    for (let index = receipts.length - 1; index >= 0; index -= 1) {
      const receipt = receipts[index];
      const directTarget = (receipt.targets ?? []).find(item => item.targetId === targetId && (
        item.defeated || (item.effects ?? []).some(effect => effect.remainingHp === 0 && Number(effect.hpDamage ?? 0) > 0)
      ));
      let sourceUnitId = directTarget ? clean(receipt.actorId) : '';
      let sourceType = directTarget ? 'direct' : '';
      let sourceId = directTarget ? clean(receipt.skill?.id) : '';
      let sourceSkillId = directTarget ? clean(receipt.skill?.id) : '';
      if (!sourceUnitId) {
        const event = (receipt.statusEvents ?? []).find(item => Number(item.remainingHp) === 0 && (
          item.targetId === targetId || (item.statusId && String(item.statusId).includes(`-${targetId}-`))
        ));
        if (!event) continue;
        sourceType = event.event === 'hazard-tick' ? 'zone' : 'status';
        sourceId = clean(event.statusId ?? event.zoneId);
        sourceSkillId = clean(event.sourceSkillId);
        sourceUnitId = clean(event.creditedKillerId ?? event.sourceUnitId);
        if (!sourceUnitId && sourceId) {
          for (let applicationIndex = index; applicationIndex >= 0 && !sourceUnitId; applicationIndex -= 1) {
            const application = receipts[applicationIndex];
            const applicationTarget = (application.targets ?? []).find(item => (item.effects ?? []).some(effect =>
              effect.statusId === sourceId || effect.zoneId === sourceId
            ));
            if (!applicationTarget) continue;
            sourceUnitId = clean(application.actorId);
            sourceSkillId = clean(applicationTarget.skillId ?? application.skill?.id);
          }
        }
      }
      const killerId = creditedCombatSource(state, sourceUnitId);
      const killer = state.战斗单位.列表[killerId];
      if (!killer || killerId === targetId || !battle.扩展.成员[killerId] || battle.扩展.成员[killerId].sideId === battle.扩展.成员[targetId]?.sideId) continue;
      const record = {
        targetId,
        killerId,
        directSourceUnitId: sourceUnitId,
        receiptId: clean(receipt.id),
        round: round(receipt.round),
        sourceType,
        sourceId,
        sourceSkillId,
        recoveredFromReceipt: true
      };
      battle.扩展.击杀记录.push(record);
      reconcileEncounterBattle(state,battle.id);
      return record;
    }
    return null;
  }

  function ringActor(state,proposal={},soulId=''){
    const actorId=clean(proposal.actorId,state.角色.主控单位ID),u=state.战斗单位.列表[actorId];
    if(!u||u.存活状态!=='存活'||u.资源.生命.当前<=0)throw Error('魂环处理者已失能或不存在');
    if(controls.active(state,actorId).some(s=>['status.stun','status.sleep'].includes(s.模板ID)))throw Error('魂环处理者当前无法清醒行动');
    if(state.人物?.列表?.[actorId])actions.resolve(state,{actorId,battleId:null,requirements:soulId?['soul-power','martial-soul']:[]});
    else if(combat.occupiedBattle(state,actorId))throw Error('战斗中不能处理魂环');
    if(soulId&&controls.martialSoulSealed(state,actorId,soulId))throw Error('指定武魂已经封印，不能吸收魂环');
    return actorId;
  }
  function ringBattleOrigin(state,beastId,proposal={}){
    const encounters=Object.values(state.遭遇.列表).filter(e=>e.战斗单位ID列表?.includes(beastId)&&e.battleId);
    if(encounters.length>1)throw Error('魂环来源对应多个遭遇');
    const e=encounters[0],battleId=clean(proposal.battleId,e?.battleId??state.战斗?.id),b=state.战斗?.id===battleId?state.战斗:state.世界?.backgroundBattles?.[battleId];
    if(e&&e.battleId!==battleId||proposal.encounterId&&proposal.encounterId!==e?.id)throw Error('魂环不属于指定战斗或遭遇');
    const t=e?.terminal,participants=b?.参与者ID列表??t?.participantIds,sides=b?Object.fromEntries(Object.entries(b.扩展.成员??{}).map(([id,m])=>[id,m.sideId])):t?.sides;
    if(!participants?.includes(beastId)||b&&b.状态!=='已结束'||!b&&!t)throw Error('魂环缺少已结束的实际战斗');
    const kills=b?.扩展?.击杀记录??t?.kills??[];
    const kill=[...kills].reverse().find(k=>k.targetId===beastId)??(b?recoverKillRecord(state,beastId,b):null);
    if(!kill||!participants.includes(kill.killerId)||!sides[kill.killerId]||sides[kill.killerId]===sides[beastId])throw Error('没有合法战斗击杀记录');
    const position=clone(e?.position??{kind:'location',locationId:b?.扩展?.地点ID??'',sceneId:''});
    return {battleId,encounterId:e?.id??'',expeditionId:e?.expeditionId??'',nodeId:e?.nodeId??'',position,kill:clone(kill)};
  }
  function assertRingOrigin(state,actorId,origin,proposal={}){
    for(const key of ['battleId','encounterId','expeditionId','nodeId'])if(proposal[key]!==undefined&&proposal[key]!==origin[key])throw Error('魂环来源与指定现场不一致');
    if(origin.expeditionId){
      const a=expeditions.resolve(state,{actorId,sessionId:origin.expeditionId});
      if(a.phase!=='postcombat'||a.currentNodeId!==origin.nodeId||a.currentRoom?.battleId!==origin.battleId)throw Error('只能在原远征战后房间处理魂环');
    }
    if(state.人物?.列表?.[actorId]&&abilities.hash(positions.positionOf(state,actorId))!==abilities.hash(origin.position))throw Error('请回到魂环的实际现场');
  }

  function condenseRing(rawState, proposal = {}, transactionId = 'condense-ring') {
    const state = foundation.normalizeState(clone(rawState));
    const guard = ringTransaction(state,transactionId,'condense',proposal);
    if (guard.duplicate) return {state, receipt: guard.receipt, idempotent: true};
    const unitId = clean(proposal.beastUnitId, state.场景.当前魂兽ID);
    const unit = state.战斗单位.列表[unitId];
    if (!unit || unit.单位种类 !== '魂兽') throw new Error('目标不是已登记魂兽');
    if (unit.存活状态 !== '死亡') throw new Error('魂兽未死亡，不能凝聚魂环');
    const profile = Object.values(state.魂兽档案.列表).find(item => item.单位ID === unitId);
    if (!profile) throw new Error('魂兽缺少来源档案');
    const actorId=ringActor(state,proposal),origin=ringBattleOrigin(state,unitId,proposal),kill=origin.kill;
    assertRingOrigin(state,actorId,origin,proposal);
    if (profile.魂环状态 !== '无') throw new Error(`魂兽魂环状态不是可凝聚：${profile.魂环状态}`);
    const lootId = `loot-ring-${profile.id}`;
    profile.魂环状态 = '待吸收';
    profile.处理事务ID = guard.id;
    state.战利品.列表[lootId] = {
      id: lootId, 类型: '魂环胚胎', 状态: '待吸收', 来源魂兽档案ID: profile.id,
      击杀者单位ID: kill.killerId, 击杀结算单ID: kill.receiptId,
      年限: profile.年限, 种族品级: profile.种族品级, 完整度: profile.完整度,
      创建revision: state.系统.revision + 1, 扩展: {origin,condensedBy:actorId,condenseTransactionId:guard.id,originExpeditionId:origin.expeditionId,originRoomId:origin.nodeId,originBattleId:origin.battleId}
    };
    if(actorId===state.角色.主控单位ID){state.场景.强制现场绑定 = true;state.场景.状态 = '魂环待吸收';}
    const sourceBattle=state.战斗?.id===origin.battleId?state.战斗:state.世界?.backgroundBattles?.[origin.battleId];
    const receipt = {type: 'ring-condensed',actorId,origin:clone(origin),battleProof:sourceBattle?encounterTerminal(sourceBattle):clone(state.遭遇.列表[origin.encounterId].terminal), lootId, beastProfileId: profile.id, killerId: kill.killerId, years: profile.年限, speciesGrade: profile.种族品级, integrity: profile.完整度, summary: `${profile.名称}凝聚出${profile.年限}年魂环`};
    return commitRing(state, guard, '凝聚魂环', receipt);
  }

  function calculateCompatibility(martialSoul, profile, beastSkills) {
    const bridges = effects.resolveBridges(martialSoul, profile, beastSkills);
    const axes = foundation.MARTIAL_SOUL_CORE.calculateCompatibilityAxes(martialSoul, profile, beastSkills, bridges);
    const boon=profile?.扩展?.kind==='boon-ring'&&profile.年限===423&&Boolean(talents.BOON_SOURCES[profile.扩展.sourceId]);
    return {...axes,...(boon?{score:100,ratio:1,blessing:true}:{}), bridges: bridges.map(bridge => bridge.id), residualFallbackRequired: bridges.length === 0};
  }

  function absorptionGates(unit, profile) {
    const conflictFactor = 1;
    const threatFactor = (Math.max(0, Number(profile.肉身威胁 ?? 0)) +
      Math.max(0, Number(profile.精神威胁 ?? 0)) * Math.max(0, Number(profile.残留意志 ?? 0))) / 2;
    const pressure = round(profile.年限 * threatFactor * conflictFactor);
    const limit = Number(unit.派生.魂环承载上限 ?? unit.派生.身体安全年限 ?? 0);
    const gate = {通过: pressure <= limit, 压力: pressure, 上限: limit, 威胁系数: round(threatFactor, 4), 冲突系数: round(conflictFactor, 4)};
    return {
      承载: gate,
      肉身: {...gate, 兼容别名: true},
      灵魂: {...gate, 兼容别名: true}
    };
  }

  function ringPermanentGainTotal() {
    return 0;
  }

  function ownedRingCount(state, growth) {
    return cleanList(growth?.武魂ID列表).reduce((sum, id) => sum + (state.武魂.列表[id]?.魂环ID列表.length ?? 0), 0);
  }

  function ringAttributePointEntitlement(state, growth) {
    return ownedRingCount(state, growth) * RING_ATTRIBUTE_POINTS;
  }

  function highestRingCount(state, growth) {
    return cleanList(growth?.武魂ID列表).reduce((highest, id) => Math.max(highest, state.武魂.列表[id]?.魂环ID列表.length ?? 0), 0);
  }

  function ringAdvancementEligibility(state, unitId, martialSoulId = '') {
    const growth = state.成长.列表[unitId];
    const unit = state.战斗单位.列表[unitId];
    const soul = state.武魂.列表[clean(martialSoulId, foundation.activeMartialSoulId(state, unitId))];
    const level = Number(growth?.魂力等级 ?? 0);
    const requirement = Number(growth?.当前等级需求 ?? 1);
    const experience = Number(growth?.当前经验 ?? 0);
    const requiredOrdinal = level >= 10 && level <= 90 && level % 10 === 0 ? level / 10 : 0;
    const nextOrdinal = soul ? soul.魂环ID列表.length + 1 : 0;
    const backfillLimit = Math.min(9, Math.floor(Math.max(0, level - 1) / 10));
    const breakthrough = Boolean(requiredOrdinal && nextOrdinal === requiredOrdinal);
    const supplementary = Boolean(nextOrdinal && nextOrdinal <= backfillLimit);
    const mode = breakthrough ? '突破' : supplementary ? '补环' : '不可吸收';
    const reasons = [];
    if (!growth || !unit || unit.单位种类 === '魂兽') reasons.push('只有已登记的人类魂师才能吸收魂环');
    if (!soul || soul.持有者单位ID !== unitId) reasons.push('目标武魂不属于该魂师');
    else if (mode === '不可吸收') reasons.push(`${level}级最多允许为该武魂补至第${backfillLimit}环；整十级突破只允许吸收对应序号魂环`);
    if (breakthrough && experience < requirement) reasons.push(`必须先把${level}级经验练满（当前${experience}/${requirement}）`);
    return {
      pass: reasons.length === 0,
      reasons,
      unitId,
      martialSoulId: soul?.id ?? '',
      level,
      experience,
      requirement,
      experienceFull: experience >= requirement,
      requiredOrdinal,
      nextOrdinal,
      backfillLimit,
      mode
    };
  }

  function refreshGrowthBottleneckState(state, growth) {
    if (!growth) return '';
    if (growth.魂力等级 === 99) {
      growth.瓶颈状态 = '最高等级';
      growth.溢出经验 = 0;
      return growth.瓶颈状态;
    }
    if (growth.魂力等级 % 10 !== 0) {
      growth.瓶颈状态 = '未到瓶颈';
      growth.溢出经验 = 0;
      return growth.瓶颈状态;
    }
    const experienceFull = growth.当前经验 >= growth.当前等级需求;
    growth.瓶颈状态 = experienceFull ? '等待魂环' : '积累经验';
    if (experienceFull) growth.当前经验 = growth.当前等级需求;
    growth.溢出经验 = 0;
    return growth.瓶颈状态;
  }

  function titleEligibility(state, unitId) {
    const growth = state.成长.列表[unitId];
    const unit = state.战斗单位.列表[unitId];
    const reasons = [];
    if (!growth || !unit || unit.单位种类 === '魂兽') reasons.push('只有已登记的人类魂师才能取得封号');
    if (Number(growth?.魂力等级 ?? 0) < 91) reasons.push('魂力等级达到九十一级后才能取得封号');
    if (highestRingCount(state, growth) < 9) reasons.push('必须在同一武魂上取得第九魂环');
    return {pass: reasons.length === 0, reasons, unitId, level: Number(growth?.魂力等级 ?? 0), highestRingCount: highestRingCount(state, growth)};
  }

  function refreshTitleEligibility(state, unitId) {
    const growth = state.成长.列表[unitId];
    if (!growth) return null;
    growth.封号 = foundation.normalizeTitleRecord(growth.封号, growth.魂力等级);
    const eligibility = titleEligibility(state, unitId);
    if (eligibility.pass && !growth.封号.封号 && !growth.封号.候选.封号) growth.封号.状态 = '待铸名';
    return {eligibility, title: clone(growth.封号)};
  }

  function cleanTitleCandidate(proposal = {}) {
    const rawTitle = clean(proposal.封号 ?? proposal.title).replace(/(?:斗罗|冕下)$/u, '').trim();
    const rawEpithet = clean(proposal.诗号 ?? proposal.epithet).replace(/\s+/g, ' ').trim();
    if (!/^[\p{L}\p{N}·]{1,8}$/u.test(rawTitle)) throw new Error('封号必须是1至8个文字、字母或数字，不含“斗罗”后缀');
    if (rawEpithet.length < 4 || rawEpithet.length > 120 || /[<>\u0000-\u001f\u007f]/u.test(rawEpithet)) throw new Error('诗号或介绍必须是4至120个安全字符');
    return {封号: rawTitle, 诗号: rawEpithet};
  }

  function titleProposalContext(rawState, unitId = '') {
    const state = foundation.normalizeState(clone(rawState));
    const id = clean(unitId, state.角色.主控单位ID);
    const eligibility = titleEligibility(state, id);
    if (!eligibility.pass) throw new Error(eligibility.reasons.join('；'));
    const unit = state.战斗单位.列表[id];
    const growth = state.成长.列表[id];
    const souls = cleanList(growth.武魂ID列表).map(soulId => state.武魂.列表[soulId]).filter(Boolean);
    const rings = Object.values(state.魂环.列表).filter(ring => ring.持有者单位ID === id);
    const skills = cleanList(unit.能力?.技能ID).map(skillId => state.技能.列表[skillId]).filter(Boolean);
    const equipment = state.装备?.配置?.[id] ?? {};
    const itemIds = cleanList([...Object.values(equipment.slots ?? {}), ...Object.values(equipment.soulBoneSlots ?? {})]);
    const items = itemIds.map(itemId => state.物品?.实例?.[itemId]).filter(Boolean);
    return {
      unitId: id,
      name: unit.名称,
      level: growth.魂力等级,
      realm: unit.派生?.魂师阶段,
      martialSouls: souls.map(soul => ({name: soul.名称, role: soul.定位, attributes: clone(soul.属性标签), mechanisms: clone(soul.表达机制)})),
      rings: rings.map(ring => ({ordinal: ring.序号, years: ring.年限, soulId: ring.武魂ID})),
      skills: skills.map(skill => clean(skill.名称 ?? skill.name, skill.id)),
      equipment: items.map(item => clean(item.name, item.id)),
      dominantAttributes: Object.entries(unit.六维?.有效 ?? {}).sort((left, right) => right[1] - left[1]).slice(0, 3).map(([key, value]) => ({key, value})),
      previousCandidates: clone(growth.封号?.候选?.封号 ? [growth.封号.候选.封号] : [])
    };
  }

  function validateTitleProposal(rawState, unitIdInput = '', rawProposal = {}) {
    const state = foundation.normalizeState(clone(rawState));
    const unitId = clean(unitIdInput, state.角色.主控单位ID);
    const eligibility = titleEligibility(state, unitId);
    if (!eligibility.pass) throw new Error(eligibility.reasons.join('；'));
    const candidate = cleanTitleCandidate(rawProposal);
    return {unitId,title:candidate.封号,epithet:candidate.诗号,封号:candidate.封号,诗号:candidate.诗号};
  }

  function registerTitleCandidate(rawState, proposal = {}, transactionId = 'register-title-candidate') {
    const state = foundation.normalizeState(clone(rawState));
    const guard = transactionGuard(state, transactionId);
    if (guard.duplicate) return {state, receipt: clone(state.事务.结算), idempotent: true};
    const unitId = clean(proposal.unitId, state.角色.主控单位ID);
    if (unitId !== state.角色.主控单位ID) throw new Error('动态封号提案只属于主控角色；原著角色使用固定原著封号');
    const eligibility = titleEligibility(state, unitId);
    if (!eligibility.pass) throw new Error(eligibility.reasons.join('；'));
    const growth = state.成长.列表[unitId];
    if (growth.封号?.封号) throw new Error('封号已经确认，当前无需再生成候选');
    const candidate = cleanTitleCandidate(proposal);
    const previousRolls = Number(growth.封号?.重铸次数 ?? 0);
    growth.封号 = foundation.normalizeTitleRecord({
      ...clone(growth.封号), 候选: candidate, 重铸次数: previousRolls + 1
    }, growth.魂力等级);
    const receipt = {type: 'title-candidate-registered', unitId, candidate: clone(candidate), rerolls: growth.封号.重铸次数, summary: `封号候选“${candidate.封号}”已拟好，可以确认或重拟`};
    return commit(state, guard.id, '登记封号候选', receipt);
  }

  function confirmTitle(rawState, proposal = {}, transactionId = 'confirm-title') {
    const state = foundation.normalizeState(clone(rawState));
    const guard = transactionGuard(state, transactionId);
    if (guard.duplicate) return {state, receipt: clone(state.事务.结算), idempotent: true};
    const unitId = clean(proposal.unitId, state.角色.主控单位ID);
    if (unitId !== state.角色.主控单位ID) throw new Error('只能确认主控角色的动态封号');
    const eligibility = titleEligibility(state, unitId);
    if (!eligibility.pass) throw new Error(eligibility.reasons.join('；'));
    const growth = state.成长.列表[unitId];
    if (growth.封号?.封号) return {state, receipt: {type: 'title-already-confirmed', unitId, title: clone(growth.封号), summary: `封号“${growth.封号.封号}”已经确认`}, idempotent: true};
    const custom = proposal.mode === 'custom';
    const candidate = custom ? cleanTitleCandidate(proposal) : cleanTitleCandidate(growth.封号?.候选 ?? {});
    growth.封号 = foundation.normalizeTitleRecord({
      ...clone(growth.封号), 封号: candidate.封号, 诗号: candidate.诗号, 来源: custom ? '玩家自定' : 'LLM提案', 候选: {}, 取得等级: growth.魂力等级
    }, growth.魂力等级);
    const receipt = {type: 'title-confirmed', unitId, title: clone(growth.封号), summary: `封号已成：${growth.封号.封号}斗罗——${growth.封号.诗号}`};
    return commit(state, guard.id, '确认封号', receipt);
  }

  function applyStoredExperience(state, unitId,practiceMinutes=0) {
    const growth = state.成长.列表[unitId];
    if (!growth) throw new Error('成长记录不存在');
    let levelsGained = 0;
    while (growth.魂力等级 < 99 && growth.当前经验 >= growth.当前等级需求) {
      const training=globalThis.SoulCanonicalGrowth?.trainingGate(state,unitId,practiceMinutes);if(training&&!training.pass){growth.当前经验=Math.min(growth.当前经验,growth.当前等级需求);break;}
      if (growth.魂力等级 % 10 === 0) {
        const neededRings = Math.floor(growth.魂力等级 / 10);
        if (highestRingCount(state, growth) < neededRings) {
          refreshGrowthBottleneckState(state, growth);
          break;
        }
        growth.瓶颈状态 = '已突破';
      }
      growth.当前经验 -= growth.当前等级需求;
      growth.魂力等级 += 1;
      levelsGained += 1;
      growth.当前等级需求 = 100 + growth.魂力等级 * 25;
      growth.瓶颈等级 = Math.min(100, Math.ceil(growth.魂力等级 / 10) * 10);
      growth.溢出经验 = 0;
    }
    refreshGrowthBottleneckState(state, growth);
    const title = refreshTitleEligibility(state, unitId);
    return {levelsGained, attributePointsGained: 0, titleUnlocked: Boolean(title?.eligibility?.pass && title?.title?.状态 === '待铸名')};
  }

  // Quotes are scaled once; explicit amounts passed to applyCombatExperience are already final.
  const EXPERIENCE_REWARD_MULTIPLIER = 2;
  function scaleExperienceReward(baseAmount) {
    return Math.max(0, round(Number(baseAmount) * EXPERIENCE_REWARD_MULTIPLIER));
  }

  function baseExperienceForLevels(targetLevelInput, recipientLevelInput, kind = '魂师NPC') {
    const targetLevel = Math.max(1, Number(targetLevelInput));
    const recipientLevel = Math.max(1, Number(recipientLevelInput));
    const levelFactor = clamp(1 + (targetLevel - recipientLevel) * 0.05, 0.25, 2);
    const kindFactor = kind === '魂兽' ? 1.2 : 1;
    return Math.max(8, round((35 + targetLevel * 12) * levelFactor * kindFactor));
  }

  function baseExperienceRewardForUnit(state, targetId, recipientId = state.角色.主控单位ID) {
    const target = state.战斗单位.列表[targetId];
    const recipient = state.战斗单位.列表[recipientId];
    if (!target || !recipient || targetId === recipientId || target.存活状态 !== '死亡') return 0;
    const targetLevel = Math.max(1, Number(target.派生?.有效等级 ?? target.成长?.魂力等级 ?? 1));
    const recipientLevel = Math.max(1, Number(state.成长.列表[recipientId]?.魂力等级 ?? recipient.派生?.有效等级 ?? 1));
    return baseExperienceForLevels(targetLevel, recipientLevel, target.单位种类);
  }

  function experienceRewardForUnit(state, targetId, recipientId = state.角色.主控单位ID) {
    return scaleExperienceReward(baseExperienceRewardForUnit(state, targetId, recipientId));
  }

  function applyCombatExperience(rawState, proposal = {}) {
    const state = foundation.normalizeState(clone(rawState));
    const unitId = clean(proposal.unitId, state.角色.主控单位ID);
    const growth = state.成长.列表[unitId];
    if (!growth) throw new Error('成长记录不存在');
    const defeatedUnitIds = cleanList(proposal.defeatedUnitIds);
    const calculated = defeatedUnitIds.reduce((sum, targetId) => sum + experienceRewardForUnit(state, targetId, unitId), 0);
    const gained = Math.max(0, round(proposal.experience ?? calculated));
    growth.当前经验 += gained;
    const advancement = applyStoredExperience(state, unitId);
    const unit = refreshCombatant(state, unitId);
    return {
      state,
      receipt: {
        type: 'combat-experience-applied', unitId, defeatedUnitIds, experienceGained: gained,
        levelsGained: advancement.levelsGained, attributePointsGained: advancement.attributePointsGained,
        availableAttributePoints: growth.可用属性点, level: growth.魂力等级,
        experience: growth.当前经验, requirement: growth.当前等级需求, bottleneck: growth.瓶颈状态,
        derived: clone(unit.派生),
        summary: `${unit.名称}获得${gained}点战斗经验${advancement.levelsGained ? `，提升${advancement.levelsGained}级，生命与魂力上限随等级成长` : ''}`
      }
    };
  }

  const CULTIVATION_MINUTES_PER_EXPERIENCE = 60;
  const PLAYER_CULTIVATION_MINUTES_PER_EXPERIENCE = 20;
  // Shared practice keeps its hourly clock. At a new rate, only boundaries crossed during this practice earn experience.
  function practiceExperience(minutes,carryMinutes,minutesPerExperience){
    return Math.floor((minutes+carryMinutes%minutesPerExperience)/minutesPerExperience);
  }
  function validateCultivationProgress(p,unitId,minutesPerExperience=CULTIVATION_MINUTES_PER_EXPERIENCE){
    if(!p||p.unitId!==unitId||!Number.isSafeInteger(p.minutes)||p.minutes<0||p.minutes>31*1440||!Number.isSafeInteger(p.carryBefore)||p.carryBefore<0||p.carryBefore>=CULTIVATION_MINUTES_PER_EXPERIENCE||p.carryAfter!==(p.carryBefore+p.minutes)%CULTIVATION_MINUTES_PER_EXPERIENCE||p.experienceGained!==practiceExperience(p.minutes,p.carryBefore,minutesPerExperience)||p.attributePointsGained!==0)throw Error('修炼结算');
    const b=p.before,c=p.after;if(!b||!c||![b.level,c.level,b.experience,c.experience,b.requirement,c.requirement,p.levelsGained].every(Number.isSafeInteger)||b.level<1||c.level>99||c.level<b.level||p.levelsGained!==c.level-b.level||b.requirement!==100+b.level*25||c.requirement!==100+c.level*25)throw Error('修炼成长');
    let consumed=0;for(let level=b.level;level<c.level;level++)consumed+=100+level*25;
    if(c.experience!==b.experience+p.experienceGained-consumed||b.experience<0||c.experience<0||c.experience>c.requirement)throw Error('修炼经验');return true;
  }
  function cultivationCapacity(state, unitId = state.角色.主控单位ID) {
    const growth=state.成长.列表[unitId];if(!growth)throw new Error('成长记录不存在');
    if(growth.魂力等级>=99)return 0;
    const training=globalThis.SoulCanonicalGrowth?.trainingGate(state,unitId);if(training&&!training.pass)return Math.max(1,growth.当前等级需求-growth.当前经验);
    let capacity=0;
    for(let level=growth.魂力等级;level<99;level++){
      capacity+=(level===growth.魂力等级?growth.当前等级需求-growth.当前经验:100+level*25);
      if(level%10===0&&highestRingCount(state,growth)<Math.floor(level/10))break;
    }
    return Math.max(0,capacity);
  }
  /** Called inside a world transaction; time and practice provenance belong to that transaction. */
  function applyCultivationMinutes(state, minutes, carryMinutes, unitId = state.角色.主控单位ID, minutesPerExperience=CULTIVATION_MINUTES_PER_EXPERIENCE) {
    if(!Number.isSafeInteger(minutes)||minutes<0||minutes>31*1440||!Number.isSafeInteger(carryMinutes)||carryMinutes<0||carryMinutes>=CULTIVATION_MINUTES_PER_EXPERIENCE)throw new Error('修炼时长无效');
    const experienceGained=practiceExperience(minutes,carryMinutes,minutesPerExperience);
    if(experienceGained>cultivationCapacity(state,unitId))throw new Error('修炼不能越过魂环瓶颈或最高等级');
    const growth=state.成长.列表[unitId],before={level:growth.魂力等级,experience:growth.当前经验,requirement:growth.当前等级需求};
    growth.当前经验+=experienceGained;
    const advancement=applyStoredExperience(state,unitId,minutes);refreshCombatant(state,unitId);
    return {unitId,minutes,carryBefore:carryMinutes,carryAfter:(minutes+carryMinutes)%CULTIVATION_MINUTES_PER_EXPERIENCE,experienceGained,levelsGained:advancement.levelsGained,
      before,after:{level:growth.魂力等级,experience:growth.当前经验,requirement:growth.当前等级需求,bottleneck:growth.瓶颈状态},attributePointsGained:0};
  }


  const ringInteger=(value,min,max=Number.MAX_SAFE_INTEGER)=>round(clamp(value,min,max));
  function isRingItem(item) {return item?.type==='魂环' && item.templateId==='ring-source';}
  function ringItemDefinition(item) {
    const source=item?.payload?.ringSource;
    if(!isRingItem(item)||source?.version!==1)throw new Error('这件魂环物品格式不受支持');
    if(source.kind==='authored-commerce'){
      if(!source.profile||source.profile.年限!==source.years||!source.sourceId||!source.seed||!source.profile.血脉)throw Error('寄售魂环缺少原年限、来源和冻结魂兽档案');foundation.BEAST_VALUE.validateLineage(source.profile.血脉);
    }else if(source.kind==='master-gift'){
      const definition=talents.MASTER_GIFTS[source.sourceId];
      if(!definition||source.years!==definition.years||!source.seed)throw new Error('大师赠环来源不完整');
    }else if(source.kind==='competition'){
      if(!Number.isInteger(source.divisionLevel)||source.divisionLevel<20||source.divisionLevel>90||source.divisionLevel%10||source.ringOrdinal!==source.divisionLevel/10||!Number.isInteger(source.years)||source.years<1||source.years>1000000||!Array.isArray(source.attributes)||!source.competitionId||!source.venueId)throw new Error('赛事魂环来源不完整');
    }else{
      const definition=talents.OPPORTUNITIES[source.kind];
      if(!definition||definition.years!==source.years||!source.seed)throw new Error('魂环来源或年限不一致');
      if(['boon-bone','starter-supplies'].includes(source.kind))throw new Error('这项奖励不是魂环');
      const checked=talents.inspectSelection({version:1,talentIds:[],opportunities:[{kind:source.kind,...(source.sourceId?{sourceId:source.sourceId}:{})}]},{purchase:false});
      if(!checked.pass)throw new Error(checked.errors.join('；'));
    }
    return source;
  }
  function carriedRingItem(state,itemId,actorId=state.角色.主控单位ID) {
    const item=state.物品?.实例?.[clean(itemId)],id=actorId;
    if(!item||!isRingItem(item)||item.ownerEntityId!==id)throw new Error('行囊中没有这枚可用的魂环');
    const containerId=state.人物?.列表?.[id]?.inventoryContainerId;
    if(item.containerId!==containerId||state.容器?.列表?.[containerId]?.ownerEntityId!==id||!state.容器.列表[containerId].itemIds.includes(item.id))throw new Error('请先将这枚魂环领入行囊');
    ringItemDefinition(item);
    return item;
  }
  function ringItemSettlement(item,unitIds=[],skillIds=[]) {
    return {kind:'ring-item',itemIds:[item.id],sourceHash:stableHash(JSON.stringify(item.payload.ringSource)),unitIds,skillIds};
  }
  function ownedRingItemForLoot(state,loot,actorId=state.角色.主控单位ID) {
    const settlement=loot?.扩展?.sourceSettlement;
    if(settlement?.kind!=='ring-item')return null;
    if(settlement.itemIds?.length!==1)throw new Error('魂环物品来源不一致');
    const item=carriedRingItem(state,settlement.itemIds[0],actorId);
    if(settlement.sourceHash!==stableHash(JSON.stringify(item.payload.ringSource)))throw new Error('魂环来源发生变化，请检查物品');
    const prepared=item.payload.ringPreparation;
    if(!prepared||prepared.profileId!==loot.来源魂兽档案ID)throw new Error('魂环与待选方案的来源不一致');
    return item;
  }
  function ringItemFacts(item) {
    const source=ringItemDefinition(item),details=talents.sourceDetails(source);
    return {name:item.name,years:source.years,ageTier:foundation.getAgeTier(source.years).名称,kind:source.kind,
      attributes:['competition','authored-commerce'].includes(source.kind)?clone(source.attributes):source.kind==='master-gift'&&!talents.MASTER_GIFTS[source.sourceId].attuned?['木']:details?.attributes??[],
      bypassCapacity:['divine','sacrifice','million','attuned-423','boon-ring'].includes(source.kind)||(source.kind==='master-gift'&&source.sourceId==='attuned-100'),divisionLevel:source.divisionLevel,ringOrdinal:source.ringOrdinal};
  }
  function ringIdentity(state,ring) {
    const profile=state.魂兽档案?.列表?.[ring.来源魂兽档案ID];
    return {id:ring.id,ownerId:ring.持有者单位ID,martialSoulId:ring.武魂ID,ordinal:ring.序号,years:ring.年限,color:ring.颜色,ageTier:ring.年限档,
      sourceProfileId:ring.来源魂兽档案ID,sourceName:profile?.名称??null,attributes:clone(profile?.属性谱??null),skillIds:clone(ring.魂技ID列表),
      sourceKind:profile?(profile.扩展?.backgroundAcquisition?'background-history':profile.扩展?.kind??(profile.扩展?.generatedBy==='solo-competition-prize'?'competition':'beast-remains')):null,
      ...(profile?.扩展?.backgroundAcquisition?{acquisition:{...clone(profile.扩展.backgroundAcquisition),label:globalThis.SoulBackgroundHistory.ACQUISITION_KINDS[profile.扩展.backgroundAcquisition.kind],historicalOnly:true,capacityExempt:profile.扩展.backgroundAcquisition.kind!=='hunt'}}:{})};
  }
  function giftRingSource(state,item,martialSoul) {
    if(item.payload.ringSource.kind==='authored-commerce'){const source=ringItemDefinition(item),profile=clone(source.profile);profile.id=`source-${item.id}`;profile.单位ID='';profile.魂环状态='待吸收';profile.扩展={...profile.扩展,ringItemId:item.id,kind:source.kind,sourceId:source.sourceId};return profile;}
    const source=ringItemDefinition(item),definition=source.kind==='master-gift'?talents.MASTER_GIFTS[source.sourceId]:talents.OPPORTUNITIES[source.kind];
    const attuned=['sacrifice','attuned-423'].includes(source.kind)||(source.kind==='master-gift'&&definition.attuned);
    const soulAttributes=cleanList([...martialSoul.属性谱.主属性,...martialSoul.属性谱.副属性]).map(foundation.canonicalDamageType);
    const fixed=talents.MILLION_DETAILS,gods=talents.DIVINE_DETAILS;
    let theme;
    if(source.kind==='master-gift'&&!definition.attuned)theme={name:'孤竹',attributes:['木'],tags:['竹','植物','坚韧','穿刺','守护'],channels:['channel.shield','channel.armor_break']};
    else if(source.kind==='boon-ring')theme=talents.BOON_SOURCES[source.sourceId];
    else if(source.kind==='million')theme=fixed[source.sourceId];
    else if(source.kind==='divine'){
      const god=gods[source.sourceId];if(god)theme={...god,name:talents.GODS[source.sourceId]+'赐福'};
    }else{
      theme={name:(martialSoul.属性谱.主属性[0]??'灵辉')+'灵兽',attributes:soulAttributes,
        tags:cleanList([...martialSoul.类别标签,...martialSoul.属性标签,...martialSoul.表达机制,...(martialSoul.扩展?.结构化武魂?.semanticTags??[])])};
    }
    if(!theme)throw new Error('请选择有效的机缘来源');
    const tags=cleanList([...theme.tags,...theme.attributes,...(theme.channels??[]),...effects.sourceBridgeTags(theme.channels??[])]);
    const lineage=attuned
      ?foundation.BEAST_VALUE.compileLineage(martialSoul.扩展.结构化武魂.definition)
      :foundation.BEAST_VALUE.sourceLineage({名称:theme.name,类别标签:theme.categories??['category.humanoid'],种族特征:tags,属性谱:{主属性:theme.attributes}});
    const profile=foundation.normalizeSoulBeastProfile({
      id:'source-'+item.id,单位ID:'',名称:theme.name,年限:definition.years,血脉:lineage,
      完整度:1,类别标签:theme.tags,种族特征:tags,解剖标签:['完整结构'],
      属性谱:{主属性:theme.attributes,副属性:[],强度:Object.fromEntries(theme.attributes.map(a=>[a,source.kind==='boon-ring'?10:80]))},
      魂环状态:'待吸收',技能种子:source.seed,肉身威胁:1,精神威胁:1,残留意志:1
    },'');
    profile.扩展={ringItemId:item.id,kind:source.kind,sourceId:source.sourceId??'',描述:source.kind==='sacrifice'?'与你武魂相合的灵兽献出魂环。':'这枚魂环承载着'+theme.name+'的力量。'};
    effects.freezeSourceBridges(profile);
    return profile;
  }
  function competitionRingSource(state,item,playerId) {
    const source=ringItemDefinition(item),ordinal=source.ringOrdinal;
    const venue = {id:source.venueId,shortName:source.venueName};
    const years = ringInteger(source.years,1,1000000);
    const sourceUnitId = `competition-ring-source-unit-${item.id}`;
    const profileId = `competition-ring-source-${item.id}`;
    const attributes = cleanList(source.attributes);
    const primary = attributes[0] ?? '物理';
    const channels=cleanList(source.channels).map(name=>Object.values(foundation.MARTIAL_SOUL_CORE.CHANNEL_REGISTRY).find(channel=>channel.id===name||channel.name===name)?.id).filter(Boolean);
    if(source.channels?.length&&channels.length!==cleanList(source.channels).length)throw Error('赛事魂环方向未登记');
    const lineage=foundation.BEAST_VALUE.generateLineage({seed:source.seed??item.id,targetPoints:Math.min(85,15+ordinal*7),...(channels.length?{channelIds:channels}:{}),attributeIds:attributes.map(name=>Object.values(foundation.MARTIAL_SOUL_CORE.ATTRIBUTE_REGISTRY).find(item=>item.name===name||item.damageType===name)?.id).filter(Boolean)});
    const profile = foundation.normalizeSoulBeastProfile({
      id:profileId,单位ID:sourceUnitId,血脉:lineage,物种ID:`competition-source-${venue?.id ?? 'arena'}`,名称:`${venue?.shortName ?? '赛事'}冠军魂环源`,年限:years,完整度:1,
      类别标签:['赛事奖励源'],种族特征:[...attributes,'能量凝聚'],解剖标签:['无遗骸'],属性谱:{主属性:[primary],强度:Object.fromEntries(attributes.map((name,index) => [name,Math.max(45,90-index*15)]))},
      肉身威胁:0.9,精神威胁:0.35,残留意志:0.35,属性偏向:{力量:primary === '物理' || primary === '雷' ? 4 : 1,身法:primary === '风' ? 4 : 1,体魄:['水','土','生命'].includes(primary) ? 4 : 2,悟性:['木','冰','毒蚀'].includes(primary) ? 4 : 2,感知:2,意志:['光','灵魂'].includes(primary) ? 4 : 2},
      技能种子:`${item.id}:ring-source`,魂环状态:'待吸收',扩展:{generatedBy:'solo-competition-prize',competitionId:source.competitionId,venueId:source.venueId,noCorpse:true}
    },sourceUnitId);
    const compiled = effects.compileSoulBeastSkills(profile,{...effects.sourceBeastOptions(profile),seed:profile.技能种子});
    profile.扩展.能力账本=clone(compiled);
    profile.种族特征=effects.sourceTraitsWithBridges(profile,compiled);
    for (const skill of compiled.skills) state.技能.列表[skill.id] = skill;
    state.战斗单位.列表[sourceUnitId] = foundation.normalizeCombatant({id:sourceUnitId,名称:profile.名称,阵营:'赛事魂环源',单位种类:'魂兽',六维:{基础:{力量:10,身法:10,体魄:10,悟性:10,感知:10,意志:10}},属性谱:profile.属性谱,能力:{技能ID:compiled.skills.map(skill => skill.id)},成长:{类型:'魂兽',年限:years},扩展:{魂兽档案ID:profileId,noBattle:true}},{id:sourceUnitId,kind:'魂兽',beastYears:years,beastGrade:profile.种族品级});
    state.魂兽档案.列表[profileId] = profile;
    const lootId = `competition-ring-loot-${item.id}`;
    const sourceSettlement = ringItemSettlement(item,[sourceUnitId],compiled.skills.map(skill=>skill.id));
    state.战利品.列表[lootId] = {id:lootId,类型:'魂环胚胎',状态:'待吸收',来源魂兽档案ID:profileId,击杀者单位ID:playerId,击杀结算单ID:source.competitionId,年限:years,种族品级:profile.种族品级,完整度:1,创建revision:state.系统.revision,扩展:{competitionPrizeItemId:item.id,sourceSettlement}};
    return {profile,lootId};
  }
  function assertRingItemUseContext(state,actorId=state.角色.主控单位ID) {
    ringActor(state,{actorId});
    const competition=state.比赛?.当前,slaughter=state.杀戮场?.当前;
    if(expeditions.forActor(state,actorId)||(actorId===state.角色.主控单位ID&&((competition&&!['completed','failed'].includes(competition.status))||(slaughter&&!['completed','failed'].includes(slaughter.status))||state.切磋?.当前||state.终局挑战?.当前)))throw new Error('请先完成当前战斗或远征，再使用魂环');
  }
  function materializeRingItem(state,proposal) {
    const playerId=clean(proposal.actorId,state.角色.主控单位ID);
    assertRingItemUseContext(state,playerId);
    const item=carriedRingItem(state,proposal.itemId,playerId),source=ringItemDefinition(item);
    const soulId=clean(proposal.martialSoulId,foundation.activeMartialSoulId(state,playerId)),soul=state.武魂.列表[soulId];
    if(!soul||soul.持有者单位ID!==playerId)throw new Error('请选择自己的武魂');
    const eligibility=ringAdvancementEligibility(state,playerId,soulId);
    if(source.kind==='competition'){
      if(state.成长.列表[playerId].魂力等级!==source.divisionLevel)throw new Error(`这枚赛事魂环需在${source.divisionLevel}级使用`);
      if(soul.魂环ID列表.length+1!==source.ringOrdinal)throw new Error(`这枚赛事魂环只适用于第${source.ringOrdinal}魂环`);
    }
    const prepared=item.payload.ringPreparation;
    if(prepared){
      if(prepared.martialSoulId!==soulId)throw new Error('这枚魂环已为另一个武魂准备，请继续原有选择');
      const profile=state.魂兽档案.列表[prepared.profileId];
      if(!profile)throw new Error('魂环来源记录不完整');
      const lootId=prepared.lootId;
      ownedRingItemForLoot(state,state.战利品.列表[lootId],playerId);
      return {item,profile,lootId,soul,eligibility,pendingId:prepared.pendingId};
    }
    let profile,lootId;
    if(source.kind==='competition')({profile,lootId}=competitionRingSource(state,item,playerId));
    else{
      profile=giftRingSource(state,item,soul);lootId='loot-'+item.id;
      state.魂兽档案.列表[profile.id]=profile;
      state.战利品.列表[lootId]={id:lootId,类型:'魂环胚胎',状态:'待吸收',来源魂兽档案ID:profile.id,年限:profile.年限,种族品级:profile.种族品级,完整度:1,创建revision:state.系统.revision+1,扩展:{sourceSettlement:ringItemSettlement(item)}};
    }
    item.payload.ringPreparation={profileId:profile.id,lootId,martialSoulId:soul.id,actorId:playerId};
    return {item,profile,lootId,soul,eligibility,pendingId:''};
  }
  function previewRingItem(rawState,proposal={},options={}) {
    try{
      const state=foundation.normalizeState(clone(rawState)),context=materializeRingItem(state,proposal);
      const details=ringAbsorptionDetails(state,{actorId:proposal.actorId,lootId:context.lootId,martialSoulId:context.soul.id});
      const reasons=clone(details.eligibility.reasons);
      if(!details.gates.承载.通过)reasons.push('这枚魂环超过了你目前的身体承载能力');
      if(options.compileSkills!==false&&details.eligibility.pass&&!context.pendingId){
        try{effects.compileRingSkills({martialSoul:details.martialSoul,beastProfile:details.profile,beastSkills:details.beastSkills,ringOrdinal:details.ordinal,options:{compatibility:details.compatibility.ratio}});}
        catch{reasons.push('这枚魂环暂时无法与你的武魂形成完整魂技，可以先保留，或选择更契合的武魂');}
      }
      return {pass:!reasons.length,reasons,itemId:context.item.id,name:context.item.name,source:context.profile,years:context.profile.年限,eligibility:details.eligibility,compatibility:details.compatibility,gates:details.gates,pendingId:context.pendingId,martialSoulId:context.soul.id};
    }catch(error){return {pass:false,reasons:[error.message]};}
  }
  function prepareRingItem(rawState,proposal={},transactionId='prepare-ring-item') {
    const state=foundation.normalizeState(clone(rawState)),guard=ringTransaction(state,transactionId,'prepare-item',proposal);
    if(guard.duplicate)return {state,receipt:guard.receipt,idempotent:true};
    const context=materializeRingItem(state,proposal);
    if(!context.eligibility.pass)throw new Error(context.eligibility.reasons.join('；'));
    const result=prepareRingSkillChoice(state,{...proposal,actorId:guard.request.actorId,lootId:context.lootId,martialSoulId:context.soul.id,...(context.item.payload.ringSource.kind==='competition'?{choiceSeed:`competition:${context.item.id}:${context.item.payload.ringSource.competitionId}`}:{})},`${guard.id}:prepare`);
    result.state.物品.实例[context.item.id].payload.ringPreparation.pendingId=result.receipt.pendingId;
    return commitRing(result.state,guard,'准备物品魂环',result.receipt);
  }
  function ringItemNarrativeRequest(state,itemId,actorId=state.角色.主控单位ID) {
    const item=carriedRingItem(state,itemId,actorId),prepared=item.payload.ringPreparation;
    if(!prepared?.pendingId)throw new Error('没有等待描述的魂环');
    const source=state.魂兽档案.列表[prepared.profileId],soul=state.武魂.列表[prepared.martialSoulId];
    return {itemId,kind:item.payload.ringSource.kind,fixedName:item.payload.ringSource.kind==='sacrifice'?'':source.名称,
      years:source.年限,ageTier:foundation.getAgeTier(source.年限).名称,ringColor:foundation.getAgeTier(source.年限).颜色,attributes:clone(source.属性谱.主属性),traits:clone(source.类别标签),
      martialSoul:{name:soul.名称,form:soul.扩展?.结构化武魂?.definition?.form},
      source:{profileId:prepared.profileId,kind:({'boon-ring':'指定来源凝聚的恩赐','attuned-423':'契合武魂的开局赠环','master-gift':'固定孤竹来源赠环',sacrifice:'独立魂兽献祭',divine:'指定神祇凝聚的神赐魂环',million:'指定百万年魂兽来源',competition:'赛事已发放的魂环奖励'})[item.payload.ringSource.kind],name:source.名称},
      stage:'已持有，待选择魂技并吸收',
      appearance:{form:'能量光环',mainColor:foundation.getAgeTier(source.年限).颜色,patternAttributes:clone(source.属性谱.主属性)},
      responseShape:{name:'来源名称',description:'来历介绍',appearance:'光环外观'}};
  }
  function validateRingItemNarrative(request,value) {
    const result={};
    for(const [key,min,max] of [['name',2,16],['description',8,120],['appearance',4,80]]){
      const text=clean(value?.[key]).replace(/\s+/gu,' ');
      if(text.length<min||text.length>max)throw new Error(`魂环来源${key}须为${min}至${max}字（含标点），当前${text.length}字；请精简文字，不改变来源`);
      if(/[<>\x60]/u.test(text))throw new Error('魂环来源描述不能包含HTML或代码标记');
      result[key]=text;
    }
    if(request.fixedName && result.name!==request.fixedName)throw new Error('这份机缘的来源名称不能改变');
    const expectedTier=foundation.getAgeTier(request.years).名称;
    const statedYears=Object.values(result).join(' ').match(/百万年|十万年|万年|千年|百年|十年|\d[\d,]*年/gu)??[];
    if(statedYears.some(text=>/^\d/u.test(text)?Number(text.replace(/[,年]/gu,''))!==request.years:text!==expectedTier))throw new Error('机缘描述中的年限与来源不一致，请按实际年限重新描述');
    return result;
  }

  function nameRingItem(rawState,proposal={},transactionId='name-ring-item') {
    const state=foundation.normalizeState(clone(rawState)),guard=ringTransaction(state,transactionId,'name-item',proposal);
    if(guard.duplicate)return {state,receipt:guard.receipt,idempotent:true};
    const actorId=clean(proposal.actorId,state.角色.主控单位ID),item=carriedRingItem(state,proposal.itemId,actorId),prepared=item.payload.ringPreparation;
    const pending=prepared&&state.魂环.待选择[prepared.pendingId];
    if(!pending||pending.mechanicsHash!==proposal.mechanicsHash)throw new Error('魂技方案已经变化，请重新取名');
    ringAbsorptionDetails(state,{actorId,lootId:pending.sourceLootId,martialSoulId:pending.martialSoulId});
    const narrative=validateRingItemNarrative(ringItemNarrativeRequest(state,item.id,actorId),proposal.narrative);
    item.payload.narrative=narrative;
    state.魂兽档案.列表[prepared.profileId].扩展.机缘叙事=clone(narrative);
    return commitRing(state,guard,'魂环来源描述',{type:'ring-item-named',itemId:item.id,summary:'魂环的来历已记入旅途'});
  }
  function validateRingItems(state) {
    const errors=[];
    for(const unit of Object.values(state.战斗单位?.列表??{})){
      const record=unit.扩展?.openingTalents;
      if(record&&(record.version!==2||Object.hasOwn(record,'opportunities')))errors.push('这份存档的机缘持有格式不受支持，请使用当前版本创建的存档');
    }
    for(const item of Object.values(state.物品?.实例??{})){
      if(item.type==='赛事魂环凭证'||item.templateId==='competition-ring-source')errors.push('这份存档的魂环物品格式不受支持');
      if(!isRingItem(item))continue;
      try{
        ringItemDefinition(item);
        const prepared=item.payload.ringPreparation;
        if(prepared){
          const pending=state.魂环?.待选择?.[prepared.pendingId];
          if(!pending||pending.status!=='pending'||pending.sourceLootId!==prepared.lootId||pending.martialSoulId!==prepared.martialSoulId||pending.playerId!==prepared.actorId||pending.playerId!==item.ownerEntityId)throw new Error('魂环物品与待选方案不一致');
          ownedRingItemForLoot(state,state.战利品?.列表?.[prepared.lootId],pending.playerId);
        }
      }catch(error){errors.push(error.message);}
    }
    for(const pending of Object.values(state.魂环?.待选择??{})){
      if(pending.sourceSettlement?.kind==='ring-item')try{
        const item=ownedRingItemForLoot(state,state.战利品?.列表?.[pending.sourceLootId],pending.playerId);
        if(!item||item.payload.ringPreparation.pendingId!==pending.id)throw new Error('待选魂技缺少对应的魂环物品');
      }catch(error){errors.push(error.message);}
    }
    return errors;
  }

  function resolveRingSkillChoiceCount(rawState, unitId = '', options = {}) {
    const state = foundation.normalizeState(clone(rawState));
    const resolvedUnitId = clean(unitId, state.角色.主控单位ID);
    const unit = state.战斗单位.列表[resolvedUnitId];
    if (!unit) throw new Error('魂技候选数量解析缺少有效角色');
    const sources = [
      ...(talents.has(state,'ring-choice',resolvedUnitId)?[{sourceId:'ring-choice',sourceName:'灵光一现',delta:1}]:[]),
      ...(Array.isArray(state.扩展?.魂技选择修正) ? state.扩展.魂技选择修正 : []),
      ...(Array.isArray(unit.扩展?.魂技选择修正) ? unit.扩展.魂技选择修正 : []),
      ...(Array.isArray(options.trustedModifiers) ? options.trustedModifiers : [])
    ].map((item,index) => ({
      sourceId: clean(item?.sourceId, `ring-choice-modifier-${index + 1}`),
      sourceName: clean(item?.sourceName, '魂技选择修正'),
      delta: round(clamp(item?.delta ?? 0, -2, 2))
    })).filter(item => item.delta !== 0);
    const rawCount = RING_SKILL_CHOICE_RULES.baseCount + sources.reduce((sum,item) => sum + item.delta,0);
    return {
      baseCount: RING_SKILL_CHOICE_RULES.baseCount,
      modifiers: sources,
      rawCount,
      finalCount: round(clamp(rawCount,RING_SKILL_CHOICE_RULES.minimum,RING_SKILL_CHOICE_RULES.maximum)),
      minimum: RING_SKILL_CHOICE_RULES.minimum,
      maximum: RING_SKILL_CHOICE_RULES.maximum
    };
  }

  function ringAbsorptionDetails(rawState, proposal = {}) {
    const state = foundation.normalizeState(clone(rawState));
    const playerId = clean(proposal.actorId,state.角色.主控单位ID);
    const unit = state.战斗单位.列表[playerId];
    const growth = state.成长.列表[playerId];
    const martialSoulId = clean(proposal.martialSoulId, foundation.activeMartialSoulId(state, playerId));
    const martialSoul = state.武魂.列表[martialSoulId];
    if (!unit || !growth || !martialSoul || martialSoul.持有者单位ID !== playerId) throw new Error('角色或目标武魂不存在');
    if(foundation.nativeOriginDefinition(unit))throw Error('此人物不能吸收魂环');
    const loot = state.战利品.列表[clean(proposal.lootId)];
    if (!loot || loot.类型 !== '魂环胚胎' || loot.状态 !== '待吸收') throw new Error('没有合法待吸收魂环');
    const eligibility = ringAdvancementEligibility(state, playerId, martialSoul.id);
    const profile = state.魂兽档案.列表[loot.来源魂兽档案ID];
    if (!profile || profile.魂环状态 !== '待吸收') throw new Error('现场魂兽与魂环来源不一致');
    const beastUnit = state.战斗单位.列表[profile.单位ID];
    ringActor(state,proposal,martialSoulId);
    const ringItem=ownedRingItemForLoot(state,loot,playerId);
    if(!ringItem){
      if(!loot.扩展?.origin)throw Error('魂环缺少实际凝聚来源');
      assertRingOrigin(state,playerId,loot.扩展.origin,proposal);
    }
    if(!beastUnit && !ringItem)throw new Error('魂环来源的魂兽机械档案不完整');
    const beastSkills=beastUnit?beastUnit.能力.技能ID.map(id=>state.技能.列表[id]).filter(Boolean):[];
    const compatibility = calculateCompatibility(martialSoul, profile, beastSkills);
    const gateState = clone(state);
    gateState.成长.列表[playerId].激活武魂ID = martialSoul.id;
    const gateUnit = foundation.refreshActiveMartialSoul(gateState, playerId);
    const gates = absorptionGates(gateUnit, profile, compatibility);
    if(ringItem){
      assertRingItemUseContext(state,playerId);
      const source=ringItem.payload.ringSource;
      if(ringItem.payload.ringPreparation.martialSoulId!==martialSoul.id)throw new Error('魂环归属武魂不一致');
      if(source.kind==='competition'&&(growth.魂力等级!==source.divisionLevel||eligibility.nextOrdinal!==source.ringOrdinal))throw new Error('这枚赛事魂环的等级或环位不再适用');
    }
    if(ringItem && ringItemFacts(ringItem).bypassCapacity){
      if(ringItem.payload.ringPreparation.martialSoulId!==martialSoul.id)throw new Error('机缘归属武魂不一致');
      gates.承载={...gates.承载,通过:true,机缘豁免:true};
      gates.肉身={...gates.承载};gates.灵魂={...gates.承载};
    }
    return {state,playerId,unit,growth,martialSoul,loot,eligibility,profile,beastUnit,beastSkills,compatibility,gateUnit,gates,ordinal:eligibility.nextOrdinal};
  }

  function ringAbsorptionContext(rawState, proposal = {}) {
    const context = ringAbsorptionDetails(rawState,proposal);
    if (!context.eligibility.pass) throw new Error(`魂环突破资格未满足：${context.eligibility.reasons.join('；')}`);
    if (!context.gates.承载.通过) throw new Error(`魂环承载失败：压力${context.gates.承载.压力}超过上限${context.gates.承载.上限}`);
    return context;
  }

  function previewRingAbsorption(rawState, proposal = {}) {
    let state = foundation.normalizeState(clone(rawState));
    let lootId = clean(proposal.lootId);
    let condensed = true;
    try {
      if (!lootId) {
        const profile = Object.values(state.魂兽档案.列表).find(item => item.单位ID === clean(proposal.beastUnitId));
        if (!profile) throw new Error('没有找到这只魂兽的来源');
        const existingLoot = Object.values(state.战利品.列表).find(item => item?.类型 === '魂环胚胎' && item.来源魂兽档案ID === profile.id);
        if (existingLoot) lootId = existingLoot.id;
        else {
          condensed = false;
          let previewId = 'ring-absorption-preview';
          while (state.系统.last_transaction_id === previewId) previewId += '-next';
          const probe = condenseRing(state,{...proposal,beastUnitId:profile.单位ID},previewId);
          state = probe.state;
          lootId = probe.receipt.lootId;
        }
      }
      const context = ringAbsorptionDetails(state,{...proposal,lootId});
      const {profile,martialSoul,eligibility,gates,compatibility,ordinal} = context;
      const pending = Object.values(state.魂环.待选择).find(item => item?.status === 'pending' && item.sourceLootId === lootId);
      const reasons = [...eligibility.reasons];
      if (!gates.承载.通过) reasons.push(`魂环压力${gates.承载.压力}超过当前承载上限${gates.承载.上限}`);
      if (pending && (pending.martialSoulId !== martialSoul.id || pending.playerId !== context.playerId)) reasons.push(`这枚魂环已为${state.武魂.列表[pending.martialSoulId]?.名称 ?? '另一个武魂'}保留魂技方案，请继续已有选择`);
      return {pass:!reasons.length,reasons,lootId,condensed,beastUnitId:profile.单位ID,beastName:profile.名称,years:profile.年限,ageTier:foundation.getAgeTier(profile.年限).名称,
        martialSoulId:martialSoul.id,martialSoulName:martialSoul.名称,ordinal,eligibility:clone(eligibility),gates:clone(gates),compatibility:clone(compatibility),
        pendingId:pending?.id ?? '',pendingMartialSoulId:pending?.martialSoulId ?? '',choiceCount:pending?.choiceCount ?? resolveRingSkillChoiceCount(state,context.playerId).finalCount};
    } catch (error) { return {pass:false,reasons:[String(error.message)],lootId,condensed,beastUnitId:clean(proposal.beastUnitId)}; }
  }

  function absorbRing(rawState, proposal = {}, transactionId = 'absorb-ring') {
    const preliminaryState = foundation.normalizeState(clone(rawState));
    const guard = ringTransaction(preliminaryState,transactionId,'absorb',proposal);
    if (guard.duplicate) return {state: preliminaryState, receipt: guard.receipt, idempotent: true};
    const context = ringAbsorptionContext(preliminaryState,proposal);
    const {state,playerId,unit,growth,martialSoul,loot,eligibility,profile,beastSkills,compatibility,gateUnit,gates,ordinal} = context;
    const compiled = proposal.frozenCandidate ? clone(proposal.frozenCandidate) : effects.compileRingSkills({
      martialSoul, beastProfile: profile, beastSkills, ringOrdinal: ordinal,
      options: {
        compatibility: compatibility.ratio,
        requestedEffectIds: proposal.requestedEffectIds,
        requestedEffects: proposal.requestedEffects,
        evolutionTarget:proposal.evolutionTarget,
        requestedBranches: proposal.requestedBranches,
        requestedSkills: proposal.requestedSkills,
        allowProceduralFallback: proposal.allowProceduralFallback !== false,
        name: proposal.skillName
      }
    });
    if (proposal.frozenCandidate) {
      const fingerprint = effects.ringSkillPackageFingerprint(compiled);
      if (!proposal.expectedFingerprint || fingerprint !== proposal.expectedFingerprint) throw new Error('待选魂技机械指纹不一致，拒绝吸收');

      const sourceBudget = effects.calculateRingBudget(profile,martialSoul,compatibility.ratio);
      const checked=effects.validateRingSkillPackage(compiled,profile,sourceBudget,{martialSoul});
      if(!checked.pass)throw new Error(checked.errors.join('；'));
    }
    const resolvedCompatibility = {
      ...compatibility,
      bridges: clone(compiled.compatibility.bridgeIds),
      residualFallback: Boolean(compiled.compatibility.residualFallback),
      baseActionFallback: Boolean(compiled.compatibility.baseActionFallback)
    };
    let effectiveSoul=martialSoul;
    if(compiled.expressionGrowth)effectiveSoul=globalThis.SoulCanonicalGrowth.applyExpression(state,martialSoul,compiled.expressionGrowth,profile,guard.id);
    const skills = compiled.skills;
    const tier = foundation.getAgeTier(profile.年限);
    const gains = allocate(0, {});
    const ringId = `ring-${martialSoul.id}-${ordinal}-${profile.id}`;
    const ring = {
      id: ringId, 持有者单位ID: playerId, 武魂ID: martialSoul.id, 序号: ordinal,
      年限: profile.年限, 年限档: tier.名称, 颜色: tier.颜色, 来源魂兽档案ID: profile.id,
      契合: {分数: compatibility.score, 转化率: compiled.budget.conversion, 语义桥ID: clone(resolvedCompatibility.bridges), 冲突: clone(compatibility.conflicts), 基础动作保底: resolvedCompatibility.baseActionFallback, 保底残响: resolvedCompatibility.residualFallback},
      吸收双门: clone(gates),
      吸收时快照: {魂力等级: gateUnit.派生.有效等级, 六维: clone(gateUnit.六维.有效), 生命上限: gateUnit.派生.生命上限, 魂力上限: gateUnit.派生.魂力上限, 魂环承载上限: gateUnit.派生.魂环承载上限},
      价值: {潜在点数: compiled.budget.potential, 可用点数: compiled.budget.available, 技能分配: clone(compiled.budget.allocations), 已花费: compiled.budget.spent, 未分配: compiled.budget.unallocated},
      永久属性增益: gains, 魂技ID列表: skills.map(skill => skill.id),
      扩展: {absorptionTransactionId:guard.id,编译器版本: effects.VERSION, 效果注册表版本: effects.REGISTRY_VERSION, 技能数量: compiled.skillCount, 蓝图哈希列表: skills.map(skill => skill.immutableHash), 自由属性点: RING_ATTRIBUTE_POINTS}
    };
    if(compiled.expressionGrowth){ring.扩展.expressionGrowth={...clone(compiled.expressionGrowth),profileId:profile.id,sourceId:guard.id};ring.价值.表达成长=compiled.expressionGrowth.cost;ring.价值.总支出=compiled.budget.totalSpent;}
    state.魂环.列表[ringId] = ring;
    for (const skill of skills) {
      skill.名称 = skill.name;
      skill.类型 = '魂环魂技';
      skill.持有者单位ID = playerId;
      skill.来源武魂ID = martialSoul.id;
      skill.来源魂环ID = ringId;
      skill.来源魂兽档案ID = profile.id;
      skill.蓝图版本 = VERSION;
      skill.效果图 = clone(skill.effectGraph);
      skill.扩展 = {预算: clone(skill.budget), 契合: clone(skill.compatibility), 魂力消耗: skill.soulPowerCost, 不可变哈希: skill.immutableHash, 描述: clean(skill.description ?? skill.扩展?.描述), 命名来源: clean(skill.namingSource ?? skill.扩展?.命名来源,'code-frozen-fallback')};
      state.技能.列表[skill.id] = abilities.seal(skill);
    }
    effectiveSoul.魂环ID列表.push(ringId);
    ring.扩展.蓝图哈希列表=skills.map(skill=>skill.immutableHash);
    unit.能力.技能ID.push(...skills.map(skill => skill.id));
    growth.可用属性点 += RING_ATTRIBUTE_POINTS;
    let refreshed = refreshCombatant(state, playerId);
    refreshed.能力.技能ID = cleanList([...refreshed.能力.技能ID, ...skills.map(skill => skill.id)]);
    if(loot.扩展?.sourceSettlement?.kind==='ring-item')settleRingChoiceSource(state,{sourceSettlement:loot.扩展.sourceSettlement});
    loot.状态 = '已吸收';
    loot.归属武魂ID = martialSoul.id;
    profile.魂环状态 = '已吸收';
    profile.归属武魂ID = martialSoul.id;
    profile.处理事务ID = guard.id;
    if(playerId===state.角色.主控单位ID){
      state.场景.状态 = '魂环已吸收';state.场景.强制现场绑定 = false;
      state.场景.上次吸收结果 = {事务ID: guard.id, 通过: true, 武魂ID: martialSoul.id, 魂环ID: ringId, 魂技ID列表: skills.map(skill => skill.id)};
    }
    const released = eligibility.mode === '突破'
      ? applyStoredExperience(state, playerId)
      : {levelsGained: 0, attributePointsGained: 0, titleUnlocked: Boolean(refreshTitleEligibility(state, playerId)?.eligibility?.pass)};
    if (eligibility.mode === '突破' && released.levelsGained !== 1) throw new Error('突破魂环吸收后必须且只能自动升级一级，事务已取消');
    if (eligibility.mode === '补环') refreshGrowthBottleneckState(state, growth);
    refreshed = refreshCombatant(state, playerId);
    const receipt = {
      type: 'ring-absorbed', playerId, martialSoulId: martialSoul.id, ringId, ringOrdinal: ordinal, absorptionMode: eligibility.mode,
      ringIdentity:ringIdentity(state,ring),
      skillDefinitions:clone(skills),
      years: profile.年限, ageTier: tier.名称, gates, compatibility: resolvedCompatibility, budget: clone(compiled.budget),
      permanentGains: gains, attributePointsGained: RING_ATTRIBUTE_POINTS,
      totalOwnedRingCount: ownedRingCount(state, growth), totalRingAttributePoints: ringAttributePointEntitlement(state, growth),
      availableAttributePoints: growth.可用属性点, skillIds: skills.map(skill => skill.id), skillNames: skills.map(skill => skill.name),
      effectIdsBySkill: skills.map(skill => skill.effectGraph.nodes.map(node => node.effectId)),
      releasedStoredExperience: released,
      derivedAfter: clone(refreshed.派生), summary: `${martialSoul.名称}${eligibility.mode === '补环' ? '补充' : '突破吸收'}${profile.年限}年${profile.名称}魂环，获得${RING_ATTRIBUTE_POINTS}点自由属性与${skills.length}个魂技：${skills.map(skill => skill.name).join('、')}`
    };
    for(const [id,p] of Object.entries(state.魂环.待选择))if(p.sourceLootId===loot.id)delete state.魂环.待选择[id];
    return commitRing(state, guard, '吸收魂环', receipt);
  }

  function pendingRingSkillChoice(rawState, pendingId = '',actorId=rawState.角色.主控单位ID) {
    const state = foundation.normalizeState(clone(rawState));
    if (pendingId) {const p=state.魂环.待选择[pendingId];return clone(p?.playerId===actorId?p:null);}
    return clone(Object.values(state.魂环.待选择).find(item => item?.status === 'pending'&&item.playerId===actorId) ?? null);
  }

  function prepareRingSkillChoice(rawState, proposal = {}, transactionId = 'prepare-ring-skill-choice') {
    const preliminaryState = foundation.normalizeState(clone(rawState));
    const guard = ringTransaction(preliminaryState,transactionId,'prepare',proposal);
    if (guard.duplicate) return {state:preliminaryState,receipt:guard.receipt,idempotent:true};
    const context = ringAbsorptionContext(preliminaryState,proposal);
    const existing = Object.values(preliminaryState.魂环.待选择).find(item => item?.status === 'pending' && item.sourceLootId === clean(proposal.lootId));
    if (existing) {
      if(existing.playerId!==context.playerId||existing.martialSoulId!==context.martialSoul.id)throw Error('这枚魂环已为另一位人物或武魂保留候选');
      if(RING_GENERATION_KEYS.some(k=>proposal[k]!==undefined&&(existing.generationOptions?.[k]===undefined||abilities.hash(proposal[k])!==abilities.hash(existing.generationOptions[k]))))throw Error('这枚魂环已有保留方案，请继续选择原方案；新设计只能用于尚未领悟的魂环');
      return commitRing(preliminaryState,guard,'生成魂技候选',{type:'ring-skill-choice-prepared',pendingId:existing.id,choiceCount:existing.choiceCount,mechanicsHash:existing.mechanicsHash,summary:`已有${existing.choiceCount}个冻结魂技候选，继续选择即可`});
    }
    const {state,playerId,martialSoul,loot,eligibility,profile,beastSkills,compatibility,gates,ordinal} = context;
    const choiceRule = resolveRingSkillChoiceCount(state,playerId);
    const seedBase=clean(proposal.choiceSeed,`${loot.id}:${martialSoul.id}:${profile.技能种子 || profile.id}:${ordinal}`),choiceSeed=controls.adultPerson(state,playerId)||seedBase.endsWith(':ordinary-only')?seedBase:seedBase+':ordinary-only';
    const generationOptions=Object.fromEntries(RING_GENERATION_KEYS.filter(k=>proposal[k]!==undefined).map(k=>[k,clone(proposal[k])]));
    const compiledChoices = effects.compileRingSkillChoices({
      martialSoul,
      beastProfile:profile,
      beastSkills,
      ringOrdinal:ordinal,
      choiceCount:choiceRule.finalCount,
      options:{...generationOptions,preferredPresetIds:globalThis.SoulCanonicalGrowth.preferredIds(state,martialSoul,ordinal,profile),compatibility:compatibility.ratio,choiceSeed,allowAdultMechanics:!choiceSeed.endsWith(':ordinary-only'),allowProceduralFallback:true}
    });
    const pendingId = `pending-${loot.id}-${martialSoul.id}-${ordinal}`;
    state.魂环.待选择[pendingId] = {
      id:pendingId,
      status:'pending',
      sourceLootId:loot.id,
      beastProfileId:profile.id,
      martialSoulId:martialSoul.id,
      playerId,
      origin:clone(loot.扩展?.origin??null),
      preparationTransactionId:guard.id,
      ringOrdinal:ordinal,
      years:profile.年限,
      ageTier:foundation.getAgeTier(profile.年限).名称,
      choiceCount:compiledChoices.choiceCount,
      distinctChoiceCount:compiledChoices.distinctChoiceCount,
      choiceRule,
      choiceSeed,
      generationOptions,
      mechanicsHash:compiledChoices.mechanicsHash,
      compatibility:clone(compatibility),
      gates:clone(gates),
      sourceBudget:clone(compiledChoices.sourceBudget),
      presetFailures:clone(compiledChoices.presetFailures??[]),
      sourceSettlement:clone(loot.扩展?.sourceSettlement ?? null),
      candidates:compiledChoices.candidates.map((c,index)=>({...clone(c),slotId:'slot-'+(index+1)})),
      candidateOperations:[],freeReplacements:{},
      naming:{status:'fallback',source:'code-frozen-fallback'},
      createdRevision:state.系统.revision + 1
    };
    const authored=generationOptions.requestedSkills;
    if(authored?.length&&authored.every(s=>s.strictEffects===true&&s.autoAllocate===false)){
      const pending=state.魂环.待选择[pendingId];
      for(const candidate of pending.candidates){
        if(candidate.skills.length!==authored.length)throw Error('魂技设计数量与已确认方案不一致');
        for(const [i,skill] of candidate.skills.entries()){skill.name=authored[i].name;skill.description=authored[i].description??'';skill.namingSource='ring-design';abilities.seal(skill);}
        candidate.title=candidate.skills.map(s=>s.name).join('、');candidate.description=candidate.skills.map(s=>s.description).filter(Boolean).join('；');
      }
      pending.naming={status:'named',source:'ring-design'};
    }
    state.魂环.待选择[pendingId] = ringSkillChoicePresentation(state,pendingId);
    const receipt = {
      type:'ring-skill-choice-prepared',pendingId,lootId:loot.id,martialSoulId:martialSoul.id,beastProfileId:profile.id,
      ringOrdinal:ordinal,absorptionMode:eligibility.mode,years:profile.年限,choiceCount:compiledChoices.choiceCount,
      distinctChoiceCount:compiledChoices.distinctChoiceCount,
      choiceRule:clone(choiceRule),mechanicsHash:compiledChoices.mechanicsHash,budget:clone(compiledChoices.sourceBudget),
      summary:`${profile.年限}年${profile.名称}魂环已形成${compiledChoices.choiceCount}套不同魂技候选，确认前不会消耗魂环`
    };
    return commitRing(state,guard,'生成魂技候选',receipt);
  }

  function ringSkillChoiceNamingRequest(rawState, pendingIdInput = '',actorId=rawState.角色.主控单位ID) {
    const state = foundation.normalizeState(clone(rawState));
    const pending = pendingRingSkillChoice(state,clean(pendingIdInput),actorId);
    if (!pending || pending.status !== 'pending') throw new Error('没有待命名的魂技候选');
    return {
      type:'ring-skill-choice-narrative',version:1,pendingId:pending.id,actorId:pending.playerId,origin:clone(pending.origin),years:pending.years,ageTier:pending.ageTier,
      mechanicsHash:pending.mechanicsHash,compatibility:clone(pending.compatibility),
      candidates:pending.candidates.map(candidate => ({
        candidateId:candidate.id,index:candidate.index,fingerprint:candidate.fingerprint,
        facts:effects.candidateFacts(candidate),kept:pending.naming?.pendingCandidateIds?.length?!pending.naming.pendingCandidateIds.includes(candidate.id):false,
        skills:candidate.skills.map(skill => ({
          skillId:skill.id,effects:(skill.effectGraph?.nodes ?? []).map(node => ({effectId:node.effectId,params:clone(node.params ?? {})})),
          soulPowerCost:Number(skill.soulPowerCost ?? 0),cooldownTurns:Number(skill.cooldownTurns ?? 0)
        }))
      })),
      constraints:{candidateCount:pending.candidates.length,mechanicsImmutable:true,namingOnly:true,titleLength:[2,18],descriptionLength:[8,narrative.SKILL_DESCRIPTION_LIMIT],skillNameLength:[2,16],skillDescriptionLength:[8,narrative.SKILL_DESCRIPTION_LIMIT]}
    };
  }

  // Naming runs after compilation. It cannot participate in budgets, seeds or fingerprints.
  // Local labels describe the current immutable candidate list.
  function ringSkillChoicePresentation(rawState, pendingIdInput) {
    const pending = clone(rawState.魂环?.待选择?.[clean(pendingIdInput)]);
    if (!pending || pending.status !== 'pending' || pending.naming?.status === 'named') return pending ?? null;
    const soul = rawState.武魂?.列表?.[pending.martialSoulId];
    const identity = [soul?.名称,soul?.扩展?.结构化武魂?.definition?.form].filter(Boolean).join('，');
    const used = new Set();
    const labels = pending.candidates.map(candidate => narrative.packageNarrative(candidate,identity,used));
    const validated = validateRingSkillChoiceNarrative(rawState,pending.id,{candidates:labels});
    applyRingSkillLabels(pending,validated,'local-frozen-mechanics-narrative');
    return pending;
  }

  function applyRingSkillLabels(pending, labels, source) {
    const byId = new Map(labels.map(item => [item.candidateId,item]));
    const mutable=pending.candidates.map((_,i)=>i).filter(i=>!pending.candidates[i].presetId&&(source!=='llm-frozen-mechanics-narrative'||!pending.naming?.pendingCandidateIds?.length||pending.naming.pendingCandidateIds.includes(pending.candidates[i].id)));
    const names=pending.candidates.map((candidate,i)=>mutable.includes(i)?byId.get(candidate.id).title:candidate.title);
    const unique=effects.uniqueCandidateNames(names,pending.candidates,18,mutable);
    for(const i of mutable)byId.get(pending.candidates[i].id).title=unique[i];
    for (const candidate of pending.candidates) {
      if(candidate.presetId)continue;
      if(source==='llm-frozen-mechanics-narrative' && pending.naming?.pendingCandidateIds?.length && !pending.naming.pendingCandidateIds.includes(candidate.id))continue;
      const entry = byId.get(candidate.id);
      const skillById = new Map(entry.skills.map(item => [item.skillId,item]));
      candidate.title = entry.title;
      candidate.description = entry.description;
      for (const skill of candidate.skills) {
        const label = skillById.get(skill.id);
        skill.name = label.name;
        skill.description = label.description;
        skill.namingSource = source;
      }
    }
    const allSkills=pending.candidates.flatMap(candidate=>candidate.skills);
    const mutableSkills=allSkills.map((_,i)=>i).filter(i=>pending.candidates.some((candidate,j)=>mutable.includes(j)&&candidate.skills.includes(allSkills[i])));
    const skillNames=effects.uniqueCandidateNames(allSkills.map(skill=>skill.name),allSkills,16,mutableSkills);
    for(const i of mutableSkills)allSkills[i].name=skillNames[i];
    for(const i of mutable){const candidate=pending.candidates[i];if(candidate.skills.length===1){candidate.title=candidate.skills[0].name;candidate.description=candidate.skills[0].description;}}
    pending.naming = {status:'named',source};
  }

  function validateRingSkillChoiceNarrative(rawState, pendingIdInput, rawNarrative) {
    const state = foundation.normalizeState(clone(rawState));
    const pending = state.魂环.待选择[clean(pendingIdInput)];
    if (!pending || pending.status !== 'pending') throw new Error('没有可命名的魂技候选');
    const entries = Array.isArray(rawNarrative) ? rawNarrative : rawNarrative?.candidates;
    if (!Array.isArray(entries) || entries.length !== pending.candidates.length) throw new Error('魂技候选命名数量不一致');
    const byId = new Map(entries.map(item => [clean(item?.candidateId),item]));
    if (byId.size !== pending.candidates.length) throw new Error('魂技候选命名含重复候选ID');
    const narrative = (value,label,minimum,maximum) => {
      const text = clean(value).replace(/\s+/gu,' ');
      if (text.length < minimum || text.length > maximum || /[<>`]/u.test(text)) throw new Error(`${label}不符合安全或长度约束`);
      return text;
    };
    return pending.candidates.map(candidate => {
      const entry = byId.get(candidate.id);
      if (!entry) throw new Error(`缺少魂技候选命名：${candidate.id}`);
      const skills = Array.isArray(entry.skills) ? entry.skills : [];
      if (skills.length !== candidate.skills.length) throw new Error(`候选${candidate.index + 1}的魂技命名数量不一致`);
      const skillById = new Map(skills.map(item => [clean(item?.skillId),item]));
      return {
        candidateId:candidate.id,
        title:narrative(entry.title,'候选名称',2,18),
        description:effects.validateDefenseNarrative(candidate.skills.flatMap(skill=>skill.effectGraph?.nodes ?? []),narrative(entry.description,'候选说明',8,globalThis.SoulSkillProse.descriptionLimit),undefined,{summary:candidate.skills.length>1}),
        skills:candidate.skills.map(skill => {
          const label = skillById.get(skill.id);
          if (!label) throw new Error(`缺少冻结技能槽命名：${skill.id}`);
          return {skillId:skill.id,name:narrative(label.name,'魂技名',2,16),description:effects.validateDefenseNarrative(skill.effectGraph?.nodes,narrative(label.description,'魂技介绍',8,globalThis.SoulSkillProse.descriptionLimit),skill.effectGraph)};
        })
      };
    });
  }

  function nameRingSkillChoices(rawState, proposal = {}, transactionId = 'name-ring-skill-choices') {
    const state = foundation.normalizeState(clone(rawState));
    const guard = ringTransaction(state,transactionId,'name',proposal);
    if (guard.duplicate) return {state,receipt:guard.receipt,idempotent:true};
    const pending = state.魂环.待选择[clean(proposal.pendingId)];
    if (!pending || pending.status !== 'pending') throw new Error('没有可命名的魂技候选');
    if(pending.playerId!==guard.request.actorId||proposal.mechanicsHash!==undefined&&proposal.mechanicsHash!==pending.mechanicsHash)throw Error('魂技候选人物或冻结来源不一致');
    ringAbsorptionDetails(state,{actorId:pending.playerId,lootId:pending.sourceLootId,martialSoulId:pending.martialSoulId});
    const labels = validateRingSkillChoiceNarrative(state,pending.id,{candidates:proposal.candidates});
    applyRingSkillLabels(pending,labels,'llm-frozen-mechanics-narrative');
    return commitRing(state,guard,'命名魂技候选',{type:'ring-skill-choices-named',pendingId:pending.id,actorId:pending.playerId,choiceCount:pending.choiceCount,mechanicsHash:pending.mechanicsHash,summary:`${pending.choiceCount}套冻结魂技候选已完成命名，可由吸收者选择`});
  }

  function settleRingChoiceSource(state, pending) {
    const settlement = pending?.sourceSettlement;
    if (!settlement || typeof settlement !== 'object') return {consumedItemIds:[],removedUnitIds:[],removedSkillIds:[]};
    const consumedItemIds = [];
    for (const itemId of cleanList(settlement.itemIds)) {
      const item = state.物品?.实例?.[itemId];
      if (!item) throw new Error('魂环来源物品已经不存在');
      const container = state.容器?.列表?.[item.containerId];
      if (container) container.itemIds = cleanList(container.itemIds).filter(id => id !== itemId);
      globalThis.SoulCommerceProvenance?.consumed?.(state,item,{kind:'ring-absorption',operationId:pending.id??`ring-source:${item.id}`,actorId:item.payload.ringPreparation.actorId,quantity:item.quantity});
      delete state.物品.实例[itemId];
      consumedItemIds.push(itemId);
    }
    const removedSkillIds = [];
    for (const skillId of cleanList(settlement.skillIds)) {
      if (!state.技能.列表[skillId]) continue;
      delete state.技能.列表[skillId];
      removedSkillIds.push(skillId);
    }
    const removedUnitIds = [];
    for (const unitId of cleanList(settlement.unitIds)) {
      if (!state.战斗单位.列表[unitId]) continue;
      delete state.战斗单位.列表[unitId];
      removedUnitIds.push(unitId);
    }
    return {consumedItemIds,removedUnitIds,removedSkillIds};
  }


  function verifiedFrozenRingChoices(context,pending) {
    const errors=validateRingItems(context.state),sourceBudget=effects.calculateRingBudget(context.profile,context.martialSoul,context.compatibility.ratio);
    if(abilities.hash({...sourceBudget,available:sourceBudget.usable})!==abilities.hash(pending.sourceBudget))errors.push('魂技准备时的实际来源预算已改变');
    const candidates=pending.candidates??[],ids=new Set(),fingerprints=[];
    if(candidates.length!==pending.choiceCount||candidates.length!==pending.distinctChoiceCount)errors.push('冻结魂技候选数量不符');
    for(const candidate of candidates){
      if(ids.has(candidate.id)||candidate.fingerprint!==effects.ringSkillPackageFingerprint(candidate))errors.push('冻结魂技身份或机械指纹已改变');ids.add(candidate.id);fingerprints.push(candidate.fingerprint);
      const checked=effects.validateRingSkillPackage(candidate,context.profile,sourceBudget,{martialSoul:context.martialSoul});errors.push(...checked.errors);
      let soul=context.martialSoul;
      if(candidate.expressionGrowth)try{soul=globalThis.SoulCanonicalGrowth.replayExpression(soul,candidate.expressionGrowth,context.profile).soul;}catch(e){errors.push(e.message);}
      errors.push(...effects.validateFrozenRingSources(candidate,soul,context.profile,context.beastSkills).errors);
    }
    if(stableHash(JSON.stringify(fingerprints)).toString(16).padStart(8,'0')!==pending.mechanicsHash)errors.push('冻结魂技全集与准备或替换回执不符');
    if(errors.length)throw Error([...new Set(errors)].join('；'));
    return {candidates:clone(candidates),mechanicsHash:pending.mechanicsHash};
  }

  // Read-only inspection of the same source and generation seed. It never
  // replaces a saved choice, consumes a ring, or spends a reroll.
  function explainRingSkillChoices(rawState,pendingId) {
    const pending=rawState.魂环?.待选择?.[clean(pendingId)];
    if(!pending)throw new Error('这枚魂环已处理');
    const context=ringAbsorptionDetails(rawState,{actorId:pending.playerId,lootId:pending.sourceLootId,martialSoulId:pending.martialSoulId});
    const {availability}=effects.compileRingSkillChoices({martialSoul:context.martialSoul,beastProfile:context.profile,
      beastSkills:context.beastSkills,ringOrdinal:pending.ringOrdinal,choiceCount:pending.choiceRule.finalCount,
      options:{...pending.generationOptions,compatibility:pending.compatibility.ratio,choiceSeed:pending.choiceSeed,allowAdultMechanics:!pending.choiceSeed.endsWith(':ordinary-only'),allowProceduralFallback:true}});
    return availability;
  }

  function generateRingReplacement(context,pending,candidates,index,kind='reroll') {
    if(!Number.isInteger(index)||!candidates[index])throw new Error('请选择要重抽的一套魂技');
    const replacementOptions=kind==='replace-preset'?{allowPresets:false}:{...pending.generationOptions};
    // A recipe selected for the initial choice does not force every talent reroll.
    delete replacementOptions.presetId;
    let pool;
    try{pool=effects.compileRingSkillChoices({martialSoul:context.martialSoul,beastProfile:context.profile,
      beastSkills:context.beastSkills,ringOrdinal:context.ordinal,choiceCount:2,
      options:{...replacementOptions,allowAdultMechanics:!pending.choiceSeed.endsWith(':ordinary-only'),compatibility:context.compatibility.ratio,choiceSeed:pending.choiceSeed+':'+kind+':'+index+':'+candidates[index].id,
        excludedFingerprints:candidates.map(c=>c.fingerprint),excludedCandidates:kind==='replace-preset'?candidates.filter((_,i)=>i!==index):candidates,
        ...(kind==='replace-preset'?{replacementCandidate:candidates[index]}:{}),allowProceduralFallback:true}});}
    catch{throw new Error('暂未找到新的完整方案，原方案与重抽机会已保留');}
    const replacement=clone(pool.candidates[0]);if(!replacement)throw new Error('暂未找到不同的完整方案，原方案与重抽机会已保留');
    replacement.id=candidates[index].id+'-'+kind;replacement.index=index;replacement.slotId=candidates[index].slotId??'slot-'+(index+1);
    replacement.skills=replacement.skills.map((skill,i)=>abilities.seal({...skill,id:replacement.id+'-skill-'+(i+1)}));
    return replacement;
  }

  function rerollRingSkillChoice(rawState,proposal={},transactionId='reroll-ring-choice') {
    const state=foundation.normalizeState(clone(rawState)),guard=ringTransaction(state,transactionId,'reroll',proposal);
    if(guard.duplicate)return {state,receipt:guard.receipt,idempotent:true};
    if(!talents.has(state,'reroll',guard.request.actorId))throw new Error('尚未拥有时来运转天赋');
    const pending=state.魂环.待选择[clean(proposal.pendingId)];
    if(!pending||pending.status!=='pending')throw new Error('没有可重抽的魂技方案');
    if(pending.playerId!==guard.request.actorId)throw Error('不能替其他人物选择魂技');
    if(pending.reroll?.used)throw new Error('这次选取的重抽机会已使用');
    const index=pending.candidates.findIndex(candidate=>candidate.id===proposal.candidateId);
    const context=ringAbsorptionContext(state,{actorId:pending.playerId,lootId:pending.sourceLootId,martialSoulId:pending.martialSoulId});
    const replacement=generateRingReplacement(context,pending,pending.candidates,index);
    const beforeHash=pending.mechanicsHash,kept=pending.candidates.map(clone);pending.candidates[index]=replacement;
    (pending.candidateOperations??=[]).push({kind:'reroll',index,operationId:guard.id});
    pending.reroll={used:true,index};pending.naming={status:'fallback',source:'local'};
    pending.mechanicsHash=stableHash(JSON.stringify(pending.candidates.map(c=>c.fingerprint))).toString(16).padStart(8,'0');
    const presented=ringSkillChoicePresentation(state,pending.id);
    presented.candidates=presented.candidates.map((candidate,i)=>i===index?candidate:kept[i]);
    presented.naming={status:'named',source:'mixed-local',pendingCandidateIds:[replacement.id]};
    state.魂环.待选择[pending.id]=presented;
    return commitRing(state,guard,'重抽魂技方案',{type:'ring-skill-choice-rerolled',pendingId:pending.id,candidateId:replacement.id,index,slotId:replacement.slotId,beforeHash,mechanicsHash:pending.mechanicsHash,summary:'已换成一套新的魂技方案'});
  }

  function replacePresetRingSkillChoice(rawState,proposal={},transactionId='replace-ring-preset'){
    const state=foundation.normalizeState(clone(rawState)),guard=ringTransaction(state,transactionId,'replace-preset',proposal);
    if(guard.duplicate)return {state,receipt:guard.receipt,idempotent:true};
    const pending=state.魂环.待选择[clean(proposal.pendingId)];
    if(!pending||pending.status!=='pending'||pending.playerId!==guard.request.actorId)throw Error('没有本人可替换的魂技预设');
    const index=pending.candidates.findIndex(c=>c.id===proposal.candidateId),candidate=pending.candidates[index],slot='slot-'+(index+1);
    if(!candidate?.presetId||pending.freeReplacements?.[slot])throw Error('这套预设的免费替换机会已用完，或当前已是随机方案');
    const context=ringAbsorptionContext(state,{actorId:pending.playerId,lootId:pending.sourceLootId,martialSoulId:pending.martialSoulId});
    verifiedFrozenRingChoices(context,pending);
    const replacement=generateRingReplacement(context,pending,pending.candidates,index,'replace-preset'),beforeHash=pending.mechanicsHash;
    pending.candidates[index]=replacement;(pending.freeReplacements??={})[slot]={used:true,operationId:guard.id};
    (pending.candidateOperations??=[]).push({kind:'replace-preset',index,operationId:guard.id});
    pending.mechanicsHash=stableHash(JSON.stringify(pending.candidates.map(c=>c.fingerprint))).toString(16).padStart(8,'0');
    pending.naming={status:'named',source:'mixed-local',pendingCandidateIds:[replacement.id]};
    return commitRing(state,guard,'免费替换预设魂技',{type:'ring-skill-preset-replaced',pendingId:pending.id,candidateId:replacement.id,index,slotId:slot,beforeHash,mechanicsHash:pending.mechanicsHash,summary:'已免费换为随机方案，原预设槽的替换机会已使用'});
  }

  function confirmRingSkillChoice(rawState, proposal = {}, transactionId = 'confirm-ring-skill-choice') {
    const preliminaryState = foundation.normalizeState(clone(rawState));
    const guard = ringTransaction(preliminaryState,transactionId,'confirm',proposal);
    if (guard.duplicate) return {state:preliminaryState,receipt:guard.receipt,idempotent:true};
    const pending = ringSkillChoicePresentation(preliminaryState,clean(proposal.pendingId));
    if (!pending || pending.status !== 'pending') throw new Error('没有可确认的魂技候选');
    if(pending.playerId!==guard.request.actorId)throw Error('不能替其他人物选择魂技');
    const storedCandidate = pending.candidates.find(candidate => candidate.id === clean(proposal.candidateId));
    if (!storedCandidate) throw new Error('所选魂技候选不存在');
    for(const candidate of pending.candidates)if(candidate.fingerprint!==effects.ringSkillPackageFingerprint(candidate)||candidate.skills.some(skill=>!abilities.verify(skill).pass))throw Error('冻结魂技完整合同已改变');
    const context = ringAbsorptionContext(preliminaryState,{actorId:pending.playerId,lootId:pending.sourceLootId,martialSoulId:pending.martialSoulId});
    if (context.ordinal !== pending.ringOrdinal || context.profile.id !== pending.beastProfileId) throw new Error('魂环吸收环境已经变化，请重新检查');
    const regenerated=verifiedFrozenRingChoices(context,pending);
    if (regenerated.mechanicsHash !== pending.mechanicsHash) throw new Error('魂技候选机械校验失败，拒绝提交');
    const freshCandidate = regenerated.candidates.find(candidate => candidate.id === storedCandidate.id && candidate.fingerprint === storedCandidate.fingerprint);
    if (!freshCandidate||freshCandidate.presetId!==storedCandidate.presetId) throw new Error('所选魂技候选与冻结记录不一致');
    freshCandidate.title = storedCandidate.title;
    freshCandidate.description = storedCandidate.description;
    for (const skill of freshCandidate.skills) {
      const storedSkill = storedCandidate.skills.find(item => item.id === skill.id);
      if (!storedSkill) throw new Error(`冻结魂技槽缺失：${skill.id}`);
      skill.name = storedSkill.name;
      skill.description = storedSkill.description;
      skill.namingSource = storedSkill.namingSource ?? 'code-frozen-fallback';
    }
    const absorbed = absorbRing(preliminaryState,{
      actorId:pending.playerId,
      lootId:pending.sourceLootId,
      martialSoulId:pending.martialSoulId,
      frozenCandidate:freshCandidate,
      expectedFingerprint:freshCandidate.fingerprint
    },`${guard.id}:absorb`);
    const state = absorbed.state;
    const sourceSettlement = {consumedItemIds:cleanList(pending.sourceSettlement?.itemIds),removedUnitIds:cleanList(pending.sourceSettlement?.unitIds),removedSkillIds:cleanList(pending.sourceSettlement?.skillIds)};
    delete state.魂环.待选择[pending.id];
    absorbed.receipt.selection = {
      pendingId:pending.id,candidateId:freshCandidate.id,candidateIndex:freshCandidate.index,
      choiceCount:pending.choiceCount,mechanicsHash:pending.mechanicsHash,fingerprint:freshCandidate.fingerprint,
      unchosenCandidateIds:pending.candidates.filter(candidate => candidate.id !== freshCandidate.id).map(candidate => candidate.id)
    };
    absorbed.receipt.sourceSettlement = sourceSettlement;
    absorbed.receipt.summary = `${absorbed.receipt.summary}；已从${pending.choiceCount}套候选中选择“${freshCandidate.title}”`;
    return commitRing(state,guard,'确认魂技候选',absorbed.receipt);
  }

  function grantCombatExperience(rawState, proposal = {}, transactionId = 'grant-combat-experience') {
    const state = foundation.normalizeState(clone(rawState));
    const guard = transactionGuard(state, transactionId);
    if (guard.duplicate) return {state, receipt: clone(state.事务.结算), idempotent: true};
    const applied = applyCombatExperience(state, proposal);
    return commit(applied.state, guard.id, '结算战斗经验', {...applied.receipt, type: 'combat-experience-granted'});
  }

  function previewGrowthAttribute(state,proposal={}){
    const unitId=clean(proposal.unitId,state.角色.主控单位ID),attribute=clean(proposal.attribute??proposal.属性),steps=proposal.steps??proposal.次数??1;
    if(!Number.isSafeInteger(steps)||steps<1||steps>99)throw Error('提升次数须为1至99的整数');
    const growth=state.成长.列表[unitId],unit=state.战斗单位.列表[unitId];
    if(!growth||!unit)throw Error('成长记录或战斗单位不存在');
    if(!foundation.ATTRIBUTE_KEYS.includes(attribute))throw Error(`未知成长属性：${attribute}`);
    let score=unit.六维.基础[attribute],spent=0,raised=0;
    while(raised<steps&&score<99){const cost=foundation.growthAttributePointCost(score);if(spent+cost>growth.可用属性点)break;spent+=cost;score++;raised++;}
    const nextCost=foundation.growthAttributePointCost(score);
    return {pass:raised>0,unitId,attribute,requested:steps,raised,spent,score,nextCost,availableAttributePoints:growth.可用属性点-spent,reason:raised?'':score>=99?`${attribute}已经达到99点上限`:`${attribute}提升需要${nextCost}点成长属性，当前只有${growth.可用属性点}点`};
  }
  function growthAllocationKey(state){
    const unitId=state.角色.主控单位ID,growth=state.成长.列表[unitId],unit=state.战斗单位.列表[unitId];
    if(!growth||!unit)throw Error('成长记录或战斗单位不存在');
    return abilities.hash({unitId,available:growth.可用属性点,base:unit.六维.基础});
  }
  /** Native quotes for a local draft. Editing the draft needs no world transaction. */
  function growthAllocationOptions(state){
    const unitId=state.角色.主控单位ID;
    return {sourceKey:growthAllocationKey(state),available:state.成长.列表[unitId].可用属性点,
      attributes:foundation.ATTRIBUTE_KEYS.map(attribute=>{
        const base=state.战斗单位.列表[unitId].六维.基础[attribute],options=[{steps:0,score:base,spent:0}];
        for(let steps=1;steps<=99;steps++){
          const quote=previewGrowthAttribute(state,{attribute,steps});
          if(!quote.pass||quote.raised!==steps)break;
          options.push({steps,score:quote.score,spent:quote.spent});
        }
        return {attribute,base,options};
      })};
  }
  function applyGrowthAttributeQuote(state,quote){
    const growth=state.成长.列表[quote.unitId],unit=state.战斗单位.列表[quote.unitId];
    growth.可用属性点-=quote.spent;growth.已投入属性点+=quote.spent;
    growth.属性投入[quote.attribute]=(growth.属性投入[quote.attribute]??0)+quote.spent;
    unit.六维.基础[quote.attribute]=quote.score;
  }
  /** Validate the whole player plan and refresh/commit only once. Failure leaves rawState intact. */
  function allocateGrowthAttributes(rawState,proposal={},transactionId='allocate-growth-attributes'){
    const state=foundation.normalizeState(clone(rawState)),guard=transactionGuard(state,transactionId);
    if(guard.duplicate)return {state,receipt:clone(state.事务.结算),idempotent:true};
    if(!proposal||Array.isArray(proposal)||Object.keys(proposal).some(key=>!['sourceKey','allocations'].includes(key)))throw Error('批量加点只接受本人当前方案');
    if(typeof proposal.sourceKey!=='string'||proposal.sourceKey!==growthAllocationKey(state))throw Error('属性或可用点数已变化，请按当前属性重新分配');
    if(!Array.isArray(proposal.allocations)||!proposal.allocations.length||proposal.allocations.length>foundation.ATTRIBUTE_KEYS.length)throw Error('请选择一至六项属性分配');
    const seen=new Set(),allocations=[];
    for(const row of proposal.allocations){
      if(!row||Array.isArray(row)||Object.keys(row).some(key=>!['attribute','steps'].includes(key))||!foundation.ATTRIBUTE_KEYS.includes(row.attribute)||seen.has(row.attribute))throw Error('属性分配必须使用六维名称且不能重复');
      seen.add(row.attribute);
      const quote=previewGrowthAttribute(state,row);
      if(!quote.pass||quote.raised!==row.steps)throw Error(quote.reason||'本次方案点数不足或超过属性上限，请重新分配');
      applyGrowthAttributeQuote(state,quote);
      allocations.push({attribute:quote.attribute,raised:quote.raised,spent:quote.spent,score:quote.score});
    }
    const unitId=state.角色.主控单位ID,refreshed=refreshCombatant(state,unitId),spent=allocations.reduce((total,row)=>total+row.spent,0);
    return commit(state,guard.id,'分配成长属性',{type:'growth-attributes-allocated',unitId,allocations,spent,
      availableAttributePoints:state.成长.列表[unitId].可用属性点,derivedAfter:clone(refreshed.派生),
      summary:`${refreshed.名称}投入${spent}点自由属性，${allocations.map(row=>`${row.attribute}+${row.raised}`).join('、')}`});
  }
  function allocateGrowthAttribute(rawState, proposal = {}, transactionId = 'allocate-growth-attribute') {
    const state = foundation.normalizeState(rawState);
    const guard = transactionGuard(state, transactionId);
    if (guard.duplicate) return {state, receipt: clone(state.事务.结算), idempotent: true};
    const unitId = clean(proposal.unitId, state.角色.主控单位ID);
    const attribute = clean(proposal.attribute ?? proposal.属性);
    const quote=previewGrowthAttribute(state,proposal);
    const growth = state.成长.列表[unitId];
    const unit = state.战斗单位.列表[unitId];
    if (!growth || !unit) throw new Error('成长记录或战斗单位不存在');
    if (!foundation.ATTRIBUTE_KEYS.includes(attribute)) throw new Error(`未知成长属性：${attribute}`);
    if(!quote.pass)throw Error(quote.reason);
    const {spent,raised}=quote;
    applyGrowthAttributeQuote(state,quote);
    const refreshed = refreshCombatant(state, unitId);
    const nextCost = foundation.growthAttributePointCost(refreshed.六维.基础[attribute]);
    const receipt = {
      type: 'growth-attribute-allocated', unitId, attribute, raised, spent, score: refreshed.六维.基础[attribute],
      availableAttributePoints: growth.可用属性点, nextCost, derivedAfter: clone(refreshed.派生),
      summary: `${refreshed.名称}投入${spent}点自由属性，${attribute}+${raised}（每提升1点属性固定消耗1点）`
    };
    return commit(state, guard.id, '分配成长属性', receipt);
  }

  function settleTransaction(rawState, request = {}) {
    const type = clean(request.type ?? request.类型);
    const id = clean(request.id);
    const proposal = request.proposal ?? request.提案 ?? {};
    if (type === '创建武魂草案') return startMartialSoulDraft(rawState, proposal, id);
    if (type === '更新武魂草案') return updateMartialSoulDraft(rawState, proposal, id);
    if (type === '确认武魂草案') return confirmMartialSoulDraft(rawState, proposal, id);
    if (type === '建立角色与武魂') return createCharacter(rawState, proposal, id);
    if (type === '切换武魂') return switchMartialSoul(rawState, proposal, id);
    if (type === '生成魂兽') return createEncounter(rawState, proposal, id);
    if (type === '判断战斗场景') return judgeHuntScene(rawState, proposal, id);
    if (type === '开始战斗') return startHuntBattle(rawState, proposal, id);
    if (type === '提交战斗行动' || type === '结算战斗回合') return settleCombatAction(rawState, {...proposal, id});
    if (type === '凝聚魂环') return condenseRing(rawState, proposal, id);
    if (type === '生成魂技候选') return prepareRingSkillChoice(rawState, proposal, id);
    if (type === '命名魂技候选') return nameRingSkillChoices(rawState, proposal, id);
    if (type === '确认魂技候选') return confirmRingSkillChoice(rawState, proposal, id);
    if (type === '吸收魂环') return absorbRing(rawState, proposal, id);
    if (type === '结算战斗经验') return grantCombatExperience(rawState, proposal, id);
    if (type === '分配成长属性') return allocateGrowthAttribute(rawState, proposal, id);
    if (type === '登记封号候选') return registerTitleCandidate(rawState, proposal, id);
    if (type === '确认封号') return confirmTitle(rawState, proposal, id);
    throw new Error(`未知事务类型：${type}`);
  }

  return Object.freeze({
    VERSION,
    RING_ATTRIBUTE_POINTS,
    RING_SKILL_CHOICE_RULES,
    allocate,
    soulBeastYearsForLevel,
    generateSoulBeastProposal,
    startMartialSoulDraft,
    updateMartialSoulDraft,
    confirmMartialSoulDraft,
    refreshCombatant,
    createCharacter,
    switchMartialSoul,
    createEncounter,
    judgeHuntScene,
    startHuntBattle,
    settleCombatAction,settleCommittedCombatAction,reconcileEncounterBattle,validateEncounterBindings,validateRingOperations,beastCompilationHash,matchSavedBeastPreset,validatePresetBeastProfile,validatePresetBeasts,
    condenseRing,
    calculateCompatibility,
    absorptionGates,
    previewRingAbsorption,
    absorbRing,
    isRingItem, ringItemFacts, ringIdentity, previewRingItem, prepareRingItem, ringItemNarrativeRequest, validateRingItemNarrative, nameRingItem, validateRingItems,
    resolveRingSkillChoiceCount,
    pendingRingSkillChoice,
    prepareRingSkillChoice, explainRingSkillChoices,
    rerollRingSkillChoice,
    replacePresetRingSkillChoice,
    ringSkillChoiceNamingRequest,
    ringSkillChoicePresentation,
    validateRingSkillChoiceNarrative,
    nameRingSkillChoices,
    confirmRingSkillChoice,
    ownedRingCount,
    ringAttributePointEntitlement,
    highestRingCount,
    ringAdvancementEligibility,
    refreshGrowthBottleneckState,
    titleEligibility,
    refreshTitleEligibility,
    titleProposalContext,
    validateTitleProposal,
    registerTitleCandidate,
    confirmTitle,
    applyStoredExperience,
    EXPERIENCE_REWARD_MULTIPLIER, scaleExperienceReward, baseExperienceForLevels, baseExperienceRewardForUnit,
    experienceRewardForUnit,
    applyCombatExperience,
    CULTIVATION_MINUTES_PER_EXPERIENCE, PLAYER_CULTIVATION_MINUTES_PER_EXPERIENCE, cultivationCapacity, applyCultivationMinutes, validateCultivationProgress,
    grantCombatExperience,
    allocateGrowthAttribute,previewGrowthAttribute,allocateGrowthAttributes,growthAllocationOptions,
    ringPermanentGainTotal,
    settleTransaction
  });
});
