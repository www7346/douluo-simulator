(function attachSaveFormat(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.SoulSaveCodec=api;
})(typeof globalThis!=='undefined'?globalThis:this,function createSaveFormat(){
  'use strict';

  const VERSION = '2.10.0';
  const FORMAT = 'soul-cycle-transfer';
  const FORMAT_VERSION = 1;
  const MAX_IMPORT_BYTES = 12 * 1024 * 1024;
  const MAX_IMPORT_DEPTH = 80;
  const MAX_IMPORT_NODES = 300000;
  // Full journeys include real battle recovery snapshots and acquired skills.
  // Their transport allowance is separate from small creation configurations.
  const MAX_FULL_SAVE_BYTES = 64 * 1024 * 1024;
  const MAX_FULL_SAVE_NODES = 2000000;
  const AVATAR_ASSET_VERSION = 1;
  const AVATAR_OUTPUT_SIZE = 256;
  const AVATAR_MAX_BYTES = 128 * 1024;
  const AVATAR_MAX_ATTACHMENTS = 64;
  const AVATAR_MIME_TYPES = Object.freeze(['image/png', 'image/jpeg', 'image/webp']);
  const KINDS = Object.freeze({
    save: 'full-save',
    martialSoul: 'martial-soul-config',
    character: 'character-creation-config',
    diagnostic: 'diagnostic'
  });
  const DANGEROUS_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const clean = (value, fallback = '') => String(value ?? '').trim() || fallback;
  const list = value => Array.isArray(value) ? value : [];
  const plain = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

  function utf8ByteLength(text) {
    const source = String(text ?? '');
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(source).length;
    if (typeof Buffer !== 'undefined') return Buffer.byteLength(source, 'utf8');
    return encodeURIComponent(source).replace(/%[0-9A-F]{2}|./gi, 'x').length;
  }

  function inspectJsonShape(value, maximumNodes = MAX_IMPORT_NODES) {
    let nodes = 0;
    const stack = [{value, depth: 0}];
    while (stack.length) {
      const current = stack.pop();
      nodes += 1;
      if (nodes > maximumNodes) throw new Error('导入文件结构过大，已拒绝读取');
      if (current.depth > MAX_IMPORT_DEPTH) throw new Error('导入文件嵌套过深，已拒绝读取');
      if (!current.value || typeof current.value !== 'object') continue;
      for (const [key, child] of Object.entries(current.value)) {
        if (DANGEROUS_KEYS.has(key)) throw new Error(`导入文件包含禁止字段：${key}`);
        stack.push({value: child, depth: current.depth + 1});
      }
    }
    return nodes;
  }

  function canonicalize(value) {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (!plain(value)) return value;
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
  }

  function checksum(value) {
    const text = JSON.stringify(canonicalize(value));
    let hash = 0x811c9dc5;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, '0').toUpperCase();
  }

  function avatarDataUrlInfo(dataUrl) {
    const source = String(dataUrl ?? '');
    const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(source);
    if (!match || match[2].length % 4 !== 0) throw new Error('头像附件不是受支持的PNG、JPEG或WebP图片');
    const padding = match[2].endsWith('==') ? 2 : match[2].endsWith('=') ? 1 : 0;
    const byteLength = match[2].length / 4 * 3 - padding;
    if (!Number.isInteger(byteLength) || byteLength <= 0 || byteLength > AVATAR_MAX_BYTES) throw new Error('头像成品超过128KB安全上限');
    return {mimeType: match[1], byteLength, checksum: checksum(source)};
  }

  function normalizeAvatarDescriptor(source) {
    if (source === undefined || source === null || source === '') return null;
    if (!plain(source)) throw new Error('头像引用格式不合法');
    if (Object.hasOwn(source, 'dataUrl') || Object.hasOwn(source, 'data')) throw new Error('头像引用不得包含图片正文');
    const descriptor = {
      version: Number(source.version),
      assetId: clean(source.assetId),
      mimeType: clean(source.mimeType).toLowerCase(),
      width: Number(source.width),
      height: Number(source.height),
      byteLength: Number(source.byteLength),
      checksum: clean(source.checksum).toUpperCase()
    };
    if (descriptor.version !== AVATAR_ASSET_VERSION) throw new Error('头像引用版本不受支持');
    if (!/^avatar-[A-F0-9]{8}-\d{1,6}$/.test(descriptor.assetId)) throw new Error('头像资源编号不合法');
    if (!AVATAR_MIME_TYPES.includes(descriptor.mimeType)) throw new Error('头像图片类型不受支持');
    if (descriptor.width !== AVATAR_OUTPUT_SIZE || descriptor.height !== AVATAR_OUTPUT_SIZE) throw new Error('头像成品必须是256×256像素');
    if (!Number.isInteger(descriptor.byteLength) || descriptor.byteLength <= 0 || descriptor.byteLength > AVATAR_MAX_BYTES) throw new Error('头像成品超过128KB安全上限');
    if (!/^[A-F0-9]{8}$/.test(descriptor.checksum)) throw new Error('头像资源校验值不合法');
    if (descriptor.assetId !== `avatar-${descriptor.checksum}-${descriptor.byteLength}`) throw new Error('头像资源编号与内容摘要不一致');
    return descriptor;
  }

  function createAvatarAttachment(dataUrl) {
    const info = avatarDataUrlInfo(dataUrl);
    return {
      kind: 'avatar',
      version: AVATAR_ASSET_VERSION,
      assetId: `avatar-${info.checksum}-${info.byteLength}`,
      mimeType: info.mimeType,
      width: AVATAR_OUTPUT_SIZE,
      height: AVATAR_OUTPUT_SIZE,
      byteLength: info.byteLength,
      checksum: info.checksum,
      dataUrl: String(dataUrl)
    };
  }

  function normalizeAvatarAttachment(source) {
    if (!plain(source) || source.kind !== 'avatar') throw new Error('存档包含未知附件');
    const info = avatarDataUrlInfo(source.dataUrl);
    const {kind, dataUrl, ...descriptorSource} = source;
    const descriptor = normalizeAvatarDescriptor(descriptorSource);
    if (descriptor.mimeType !== info.mimeType || descriptor.byteLength !== info.byteLength || descriptor.checksum !== info.checksum) throw new Error('头像附件校验失败，内容可能损坏或被修改');
    return {kind: 'avatar', ...descriptor, dataUrl: String(source.dataUrl)};
  }

  function createFigureAttachment(dataUrl,width,height) {
    const match=/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(String(dataUrl));
    if(!match||match[2].length%4!==0)throw new Error('立绘附件不是受支持的图片');
    const byteLength=match[2].length/4*3-(match[2].endsWith('==')?2:match[2].endsWith('=')?1:0);
    if(byteLength<=0||byteLength>2*1024*1024)throw new Error('立绘成品超过2MB上限');
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>2048||height>2048)throw new Error('立绘尺寸不合法');
    const digest=checksum(String(dataUrl));
    return {kind:'figure',version:1,assetId:'figure-'+digest+'-'+byteLength,mimeType:match[1],width,height,byteLength,checksum:digest,dataUrl:String(dataUrl)};
  }
  function normalizeFigureAttachment(source){
    if(!plain(source)||source.kind!=='figure'||source.version!==1)throw new Error('立绘附件不合法');
    const expected=createFigureAttachment(source.dataUrl,source.width,source.height);
    for(const key of ['assetId','mimeType','byteLength','checksum'])if(source[key]!==expected[key])throw new Error('立绘附件校验失败');
    return expected;
  }
  function createSoulImageAttachment(dataUrl,width,height){
    const figure=createFigureAttachment(dataUrl,width,height);
    return {...figure,kind:'soul-image',assetId:figure.assetId.replace(/^figure-/,'soul-image-')};
  }
  function normalizeSoulImageAttachment(source){
    if(!plain(source)||source.kind!=='soul-image'||source.version!==1)throw new Error('武魂图片附件不合法');
    const expected=createSoulImageAttachment(source.dataUrl,source.width,source.height);
    for(const key of ['assetId','mimeType','byteLength','checksum'])if(source[key]!==expected[key])throw new Error('武魂图片附件校验失败');
    return expected;
  }
  function normalizeAttachments(value) {
    if (value === undefined || value === null) return undefined;
    if (!Array.isArray(value) || value.length > AVATAR_MAX_ATTACHMENTS) throw new Error('存档附件数量不合法');
    const normalized = value.map(item=>item?.kind==='soul-image'?normalizeSoulImageAttachment(item):item?.kind==='figure'?normalizeFigureAttachment(item):normalizeAvatarAttachment(item));
    if (new Set(normalized.map(item => item.assetId)).size !== normalized.length) throw new Error('存档包含重复头像附件');
    return normalized;
  }

  function avatarDescriptorFromAttachment(attachment) {
    const normalized = normalizeAvatarAttachment(attachment);
    const {kind, dataUrl, ...descriptor} = normalized;
    return descriptor;
  }

  function checksumSource(envelope) {
    const source = {
      format: envelope.format,
      formatVersion: envelope.formatVersion,
      kind: envelope.kind,
      rulesetVersion: envelope.rulesetVersion,
      summary: envelope.summary ?? {},
      payload: envelope.payload
    };
    if (envelope.attachments !== undefined) source.attachments = envelope.attachments;
    return source;
  }

  function createEnvelope(kind, payload, options = {}) {
    if (!Object.values(KINDS).includes(kind)) throw new Error(`未知导出类型：${kind || '空'}`);
    const envelope = {
      format: FORMAT,
      formatVersion: FORMAT_VERSION,
      kind,
      rulesetVersion: clean(options.rulesetVersion, VERSION),
      exportedAt: clean(options.exportedAt, new Date().toISOString()),
      summary: clone(options.summary ?? {}),
      payload: clone(payload)
    };
    const attachments = normalizeAttachments(options.attachments);
    if (attachments?.length) envelope.attachments = attachments;
    inspectJsonShape(envelope,kind === KINDS.save ? MAX_FULL_SAVE_NODES : MAX_IMPORT_NODES);
    envelope.integrity = {algorithm: 'FNV-1a-32', value: checksum(checksumSource(envelope))};
    return envelope;
  }

  function parseEnvelope(input, options = {}) {
    const text = typeof input === 'string' ? input : JSON.stringify(input);
    if (!text.trim()) throw new Error('导入文件为空');
    const bytes = utf8ByteLength(text);
    const hardLimit = Math.min(Number(options.maxBytes ?? MAX_FULL_SAVE_BYTES),MAX_FULL_SAVE_BYTES);
    if (bytes > hardLimit) throw new Error(`导入文件超过${Math.round(hardLimit / 1024 / 1024)}MB安全上限`);
    let envelope;
    try { envelope = JSON.parse(text); }
    catch (_) { throw new Error('导入文件不是有效JSON'); }
    const fullSave = envelope?.kind === KINDS.save;
    const limit = Math.min(hardLimit,fullSave ? MAX_FULL_SAVE_BYTES : MAX_IMPORT_BYTES);
    if (bytes > limit) throw new Error(`导入文件超过${Math.round(limit / 1024 / 1024)}MB安全上限`);
    inspectJsonShape(envelope,fullSave ? MAX_FULL_SAVE_NODES : MAX_IMPORT_NODES);
    if (!plain(envelope) || envelope.format !== FORMAT) throw new Error('这不是武魂与魂环的导入文件');
    if (Number(envelope.formatVersion) !== FORMAT_VERSION) throw new Error(`不支持的导入格式版本：${envelope.formatVersion ?? '缺失'}`);
    const expectedKinds = list(options.expectedKinds).length ? options.expectedKinds : Object.values(KINDS);
    if (!expectedKinds.includes(envelope.kind)) throw new Error(`文件类型不匹配：${envelope.kind ?? '缺失'}`);
    if (options.rulesetVersion && envelope.rulesetVersion !== options.rulesetVersion) throw new Error(`规则版本不匹配：需要${options.rulesetVersion}，文件为${envelope.rulesetVersion ?? '缺失'}`);
    if (!plain(envelope.payload)) throw new Error('导入文件缺少有效内容');
    if (envelope.attachments !== undefined) envelope.attachments = normalizeAttachments(envelope.attachments);
    if (envelope.integrity?.algorithm !== 'FNV-1a-32' || envelope.integrity?.value !== checksum(checksumSource(envelope))) throw new Error('导入文件校验失败，内容可能损坏或被修改');
    return clone(envelope);
  }

  function createFullSave(state, options = {}) {
    return createEnvelope(KINDS.save, state, options);
  }

  function fileName(prefix, envelope) {
    const label = clean(envelope?.summary?.name ?? envelope?.summary?.playerName ?? '未命名').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').slice(0, 40) || '未命名';
    const date = clean(envelope?.exportedAt).slice(0, 10) || 'undated';
    return `${prefix}-${label}-${date}.json`;
  }

  function stringifyEnvelope(envelope) {
    const text = `${JSON.stringify(envelope, null, envelope.kind === KINDS.save ? 0 : 2)}\n`;
    const limit = envelope.kind === KINDS.save ? MAX_FULL_SAVE_BYTES : MAX_IMPORT_BYTES;
    if (utf8ByteLength(text) > limit) throw new Error(`存档超过${Math.round(limit / 1024 / 1024)}MB，请保留当前游戏并导出诊断`);
    return text;
  }

  return Object.freeze({
    VERSION, FORMAT, FORMAT_VERSION, KINDS, MAX_IMPORT_BYTES, MAX_FULL_SAVE_BYTES, MAX_FULL_SAVE_NODES,
    AVATAR_ASSET_VERSION, AVATAR_OUTPUT_SIZE, AVATAR_MAX_BYTES, AVATAR_MIME_TYPES,
    inspectJsonShape, utf8ByteLength, checksum, createEnvelope, parseEnvelope,
    createSoulImageAttachment,normalizeSoulImageAttachment,createFigureAttachment, normalizeFigureAttachment, avatarDataUrlInfo, normalizeAvatarDescriptor, createAvatarAttachment, normalizeAvatarAttachment, avatarDescriptorFromAttachment,
    createFullSave,
    fileName, stringifyEnvelope
  });
});
