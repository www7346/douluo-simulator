(function attachSoulSaveTransferCore(root,factory){
  const codec=root?.SoulSaveCodec ?? (typeof require==='function'?require('../../shared/save-format.js'):null);
  const core=root?.SoulMartialSoulCore ?? (typeof require==='function'?require('./martial-soul-core.js'):null);
  const talents=root?.SoulTalentCore ?? (typeof require==='function'?require('./talent-core.js'):null);
  const api=factory(codec,core,talents);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.SoulSaveTransferCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function createSoulSaveTransferCore(codec,core,talents){
  'use strict';
  if(!codec||!core||!talents)throw new Error('Save transfer dependencies are missing');
  const {createEnvelope,KINDS,normalizeAvatarDescriptor}=codec;
  const SIX_ATTRIBUTES=Object.freeze(['力量','身法','体魄','悟性','感知','意志']);
  const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
  const clean=(value,fallback='')=>String(value??'').trim()||fallback;
  const list=value=>Array.isArray(value)?value:[];

function martialSoulDraftFrom(source = {}) {
    const compiled = source?.扩展?.结构化武魂 ?? source?.结构化武魂 ?? source?.系统编译;
    const raw = compiled?.definition ?? source?.definition ?? source;
    const inspection=core.inspectDraft(raw);
    if(inspection.unsupported.some(item=>item.field==='attributes'))throw new Error('武魂含有无法识别的属性，不能导出');
    return {
      ...(raw.presetId?{presetId:raw.presetId}:{}),
      ...(raw.artId?{artId:raw.artId}:{}),
      exchangeContracts:clone(raw.exchangeContracts??[]),
      name: clean(raw?.name ?? raw?.名称),
      concept: clean(raw?.concept ?? raw?.概念描述),
      form: clean(raw?.form ?? raw?.显化形态),
      role: clean(raw?.role ?? raw?.战斗定位),
      categories: [...new Set(list(raw?.categories ?? raw?.类别).map(value => clean(value)).filter(Boolean))],
      attributeVersion:core.ATTRIBUTE_VERSION,
      attributes: inspection.draft.attributes,
      channels: [...new Set(list(raw?.channels ?? raw?.表达机制).map(value => clean(value)).filter(Boolean))],
      traits: list(raw?.traits ?? raw?.先天特性).map(entry => ({templateId: clean(entry?.templateId ?? entry), parameter: clean(entry?.parameter), level: Number(entry?.level ?? 1)})).filter(entry => entry.templateId),
      weaknesses: list(raw?.weaknesses ?? raw?.限制).map(entry => ({templateId: clean(entry?.templateId ?? entry), parameter: clean(entry?.parameter), level: Number(entry?.level ?? 1)})).filter(entry => entry.templateId),
      baseAction: clone(inspection.draft.baseAction),
      sourceDescription: clean(raw?.sourceDescription ?? raw?.玩家描述, `导入的${clean(raw?.name ?? raw?.名称, '武魂')}配置`),
      playerConfirmed: false
    };
  }

function characterCreationPayload(draft = {}) {
    if(Object.hasOwn(draft,'level'))throw new Error('当前角色方案不支持选择起始等级，请使用新版方案');
    if(!draft.background)throw Error('旧角色方案仅可查看与导出，请选择新版背景');
    globalThis.SoulBackgroundCore.selection(draft.background);
    if(!['normal','unlimited',undefined].includes(draft.difficulty))throw Error('创建难度无效');
    const opening=talents.inspectSelection(draft.opening);
    if(!opening.pass)throw new Error(opening.errors.join('；'));
    const martialSoulDrafts = globalThis.SoulBackgroundCore.policy(draft.background).readonly?clone(draft.martialSoulDrafts):list(draft.martialSoulDrafts).map(martialSoulDraftFrom);
    const count = Math.max(1, Math.min(3, Number(draft.martialSoulCount ?? martialSoulDrafts.length ?? 1) || 1));
    return {
      mode: 'awakening',
      difficulty:draft.difficulty??'normal',
      ...(draft.openingWorkshop!==undefined?{openingWorkshop:clone(draft.openingWorkshop)}:{}),
      name: clean(draft.name),
      age: Number(draft.age ?? 12),
      gender: clean(draft.gender),
      origin: clean(draft.origin),
      appearance: clean(draft.appearance),
      background: clone(draft.background),
      opening:clone(opening.selection),
      avatar: normalizeAvatarDescriptor(draft.avatar),
      attributes: Object.fromEntries(SIX_ATTRIBUTES.map(key => [key, Number(draft?.attributes?.[key] ?? 8)])),
      martialSoulCount: count,
      martialSoulDrafts: martialSoulDrafts.slice(0, count)
    };
  }

function createMartialSoulConfig(source, options = {}) {
    const payload = martialSoulDraftFrom(source);
    return createEnvelope(KINDS.martialSoul, payload, {
      ...options,
      summary: options.summary ?? {name: payload.name, quality: clean(source?.品级标签 ?? source?.quality?.name ?? source?.扩展?.结构化武魂?.quality?.name)}
    });
  }

function createCharacterCreationConfig(draft, options = {}) {
    const payload = characterCreationPayload(draft);
    return createEnvelope(KINDS.character, payload, {
      ...options,
      summary: options.summary ?? {name:payload.name,martialSoulCount:payload.martialSoulCount}
    });
  }

  return Object.freeze({...codec,martialSoulDraftFrom,characterCreationPayload,createMartialSoulConfig,createCharacterCreationConfig});
});
