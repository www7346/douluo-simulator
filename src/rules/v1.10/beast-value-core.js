(function attach(root, factory) {
  const core = root?.SoulMartialSoulCore ?? (typeof require === 'function' ? require('./martial-soul-core.js') : null);
  const api = factory(core);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SoulBeastValue = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(core) {
  'use strict';
  const VERSION = '1.0.0';
  const clone = value => JSON.parse(JSON.stringify(value));
  // Cache only the pure expected compilation, keyed by the entire definition.
  // Validation below still compares every stored field against that expectation.
  const lineageCache=new Map(),lineageCacheBytes=4*1024*1024;
  let cachedLineageBytes=0;
  const GRADES = Object.freeze(['低阶','普通','稀有','顶级','神级'].map((name,index) => Object.freeze({value:index+1,name,color:['white','green','blue','purple','gold'][index]})));
  function yearsLevel(years) {
    if (!Number.isSafeInteger(years) || years < 1) throw new Error('魂兽年限必须是正整数');
    const x = Math.min(6,Math.log10(years)), levels = [1,5,14,28,55,90,99];
    const index = Math.min(5,Math.floor(x));
    return Math.round(levels[index]+(levels[index+1]-levels[index])*(x-index));
  }
  function growthQuote(years) {
    const level = yearsLevel(years), chassis = 200+20*level, enhancement = Math.ceil(20*Math.sqrt(years));
    return {years,level,chassis,enhancement,total:chassis+enhancement};
  }
  function compileLineage(definition) {
    const key=JSON.stringify(definition),cached=lineageCache.get(key);
    if(cached){lineageCache.delete(key);lineageCache.set(key,cached);return JSON.parse(cached.text);}
    // Authored sources can inherit a fully paid unlimited-opening soul. Their
    // structure sets its actual price; wild generation enforces its own cap.
    const draft = {...JSON.parse(key),playerConfirmed:true};
    const budget = core.componentCost(core.normalizeDraft(draft)).total;
    const compiled = clone(core.finalizeDraft(draft,{budget}));
    const points = compiled.pricing.total;
    // Exchange prices can contain fractions. Inherit the exact paid price;
    // validateLineage still compares the complete authoritative compilation.
    if (!Number.isFinite(points) || points < 0 || !Number.isSafeInteger(Math.round(points*20))) throw new Error('血脉结构点数无效');
    const result={version:VERSION,definition:compiled.definition,compiled,points,value:Math.round(points*20),grade:clone(GRADES[compiled.quality.value-1])};
    const text=JSON.stringify(result),bytes=2*(key.length+text.length);
    if(bytes<=lineageCacheBytes){
      while(lineageCache.size>=512||cachedLineageBytes+bytes>lineageCacheBytes){const first=lineageCache.keys().next().value;cachedLineageBytes-=lineageCache.get(first).bytes;lineageCache.delete(first);}
      lineageCache.set(key,{text,bytes});cachedLineageBytes+=bytes;
    }
    return result;
  }
  // Frozen pre-device sources retain their complete original channel permission contract.
  // Only these exact historical registry rows are accepted; saved data is never rewritten.
  const LEGACY_CHANNEL_IDS = Object.freeze(["channel.hit-interference","channel.melee","channel.touch","channel.projectile","channel.beam","channel.breath","channel.burst","channel.chain","channel.aura","channel.entangle","channel.poison","channel.burn","channel.freeze","channel.paralyze","channel.armor_break","channel.shield","channel.repair","channel.fabricate","channel.heal","channel.cleanse","channel.drain","channel.buff","channel.debuff","channel.fear","channel.charm","channel.sleep","channel.blind","channel.silence","channel.stealth","channel.movement","channel.status-guard","channel.resistance","channel.resource","channel.sensory","channel.flight","channel.teleport","channel.area-shaping","channel.domain","channel.summon","channel.transform","channel.counter","channel.sustain","channel.absorption","channel.invulnerability","channel.revive","channel.soul-interference","channel.seal","channel.formation"]);
  const LEGACY_CHANNEL_EFFECTS = Object.freeze({"channel.melee":["release.melee","target.single","check.physical_attack","payload.damage"],"channel.touch":["release.touch","target.single","check.soul_attack"],"channel.entangle":["release.projectile","target.single","check.save","status.bind","status.limb_bind","status.mute","move.pull"],"channel.drain":["target.single","payload.drain","payload.soul_damage","payload.soul_restore"],"channel.debuff":["target.single","check.save","status.buff","status.slow","status.eternal_wound"],"channel.charm":["target.single","check.save","status.charm","status.desire","status.mind_control","status.cognition_shift"]});
  function legacyLineageCompilation(expected) {
    if(expected.compiled.channels.some(channel=>!LEGACY_CHANNEL_IDS.includes(channel.id)))return null;
    const historical=clone(expected);
    historical.compiled.channels=historical.compiled.channels.map(channel=>LEGACY_CHANNEL_EFFECTS[channel.id]?{...channel,effectIds:[...LEGACY_CHANNEL_EFFECTS[channel.id]]}:channel);
    historical.compiled.allowedEffectIds=[...new Set(historical.compiled.channels.flatMap(channel=>channel.effectIds))];
    return historical;
  }
  function matchesLineage(lineage,expected){return expected&&expected.points===lineage.points&&expected.value===lineage.value&&JSON.stringify(expected.grade)===JSON.stringify(lineage.grade)&&JSON.stringify(expected.compiled)===JSON.stringify(lineage.compiled);}
  function beforeSustainedSupport(expected){
    const historical=clone(expected);
    historical.compiled.channels=historical.compiled.channels.map(channel=>channel.id==='channel.buff'?{...channel,effectIds:['target.self','target.single','status.buff','status.haste','modifier.next_skill']}:channel);
    historical.compiled.allowedEffectIds=[...new Set(historical.compiled.channels.flatMap(channel=>channel.effectIds))];
    return historical;
  }
  function validateLineage(lineage) {
    if (!lineage || lineage.version !== VERSION || !lineage.definition) throw new Error('魂兽缺少当前血脉结构');
    const expected = compileLineage(lineage.definition);
    if(matchesLineage(lineage,expected))return expected;
    const historical=legacyLineageCompilation(expected),beforeSupport=beforeSustainedSupport(expected);
    const accepted=[historical,beforeSupport,legacyLineageCompilation(beforeSupport)].find(candidate=>matchesLineage(lineage,candidate));
    if(!accepted)throw new Error('血脉结构与价值不一致');
    return accepted;
  }
  function quote(lineage,years) {
    const bloodline = validateLineage(lineage), growth = growthQuote(years);
    return {bloodlineValue:bloodline.value,growth,total:bloodline.value+growth.total};
  }
  function yearsForBudget(budget,lineage) {
    const remaining = Math.floor(budget)-validateLineage(lineage).value;
    if (remaining < growthQuote(1).total) throw new Error('预算不足以生成完整魂兽');
    let low=1,high=Math.min(Number.MAX_SAFE_INTEGER,Math.max(1,Math.floor((remaining/20)**2)));
    while(low<high){const middle=low+Math.ceil((high-low)/2);if(growthQuote(middle).total<=remaining)low=middle;else high=middle-1;}
    return low;
  }
  function random(seed) {
    let state=2166136261;for(const character of String(seed)){state^=character.codePointAt(0);state=Math.imul(state,16777619);}
    return ()=>{state+=0x6D2B79F5;let n=state;n=Math.imul(n^n>>>15,n|1);n^=n+Math.imul(n^n>>>7,n|61);return ((n^n>>>14)>>>0)/4294967296;};
  }
  function generateLineage(options={}) {
    const rng=random(options.seed),pick=values=>values[Math.floor(rng()*values.length)];
    const categories=(options.categoryIds??Object.keys(core.CATEGORY_REGISTRY)).filter(id=>core.CATEGORY_REGISTRY[id]?.family==='生物'&&core.CATEGORY_REGISTRY[id].selectable!==false);
    if(!categories.length)throw new Error('魂兽种类池为空');
    const category=pick(categories),attributePool=(options.attributeIds??Object.keys(core.ATTRIBUTE_REGISTRY)).filter(id=>core.ATTRIBUTE_REGISTRY[id]);
    if(!attributePool.length)throw new Error('魂兽种类缺少属性来源');
    const primary=pick(attributePool),attributes=[...new Set([primary,'attribute.life'])].map(id=>({id,investment:core.ATTRIBUTE_REGISTRY[id].minimumInvestment}));
    const maximum=Math.min(100,Math.floor(options.maxPoints??100));
    const definition={name:core.CATEGORY_REGISTRY[category].name,concept:'魂兽血脉',form:core.CATEGORY_REGISTRY[category].name,role:'本能战斗',attributeVersion:core.ATTRIBUTE_VERSION,categories:[category],attributes,channels:['channel.melee'],traits:[],weaknesses:[],baseAction:{mode:'melee',powerTier:0,attributeId:primary},playerConfirmed:true};
    let lineage=compileLineage(definition);
    if(lineage.points>maximum)throw new Error('预算无法容纳该种类的基础血脉');
    // Sample inside the affordable interval. Clipping an unrestricted draw to
    // maximum made low-budget beasts spend almost everything on bloodline.
    const minimum=lineage.points;
    const target=options.targetPoints===undefined
      ?minimum+Math.floor(rng()*(maximum-minimum+1))
      :Math.min(maximum,Math.max(minimum,Math.floor(options.targetPoints)));
    const additions=(options.channelIds??Object.keys(core.CHANNEL_REGISTRY)).filter(id=>id!=='channel.melee'&&core.CHANNEL_REGISTRY[id]).map(id=>({kind:'channel',id}));
    for(const id of attributePool.filter(id=>!attributes.some(item=>item.id===id)))additions.push({kind:'attribute',id});
    for(const trait of core.TRAIT_TEMPLATES.filter(item=>item.parameters==='none'&&options.includeTraits!==false))additions.push({kind:'trait',id:trait.id});
    for(let i=additions.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[additions[i],additions[j]]=[additions[j],additions[i]];}
    for(const addition of additions){
      const candidate=clone(lineage.definition);
      if(addition.kind==='channel')candidate.channels.push(addition.id);
      else if(addition.kind==='trait')candidate.traits.push({templateId:addition.id,level:1});
      else candidate.attributes.push({id:addition.id,investment:core.ATTRIBUTE_REGISTRY[addition.id].minimumInvestment});
      if(core.componentCost(candidate).total>Math.min(target,maximum))continue;
      const next=compileLineage(candidate);
      if(next.points<=target&&next.points<=maximum)lineage=next;
    }
    return lineage;
  }
  // Authoring constructor for new named sources. Saved profiles never call this constructor.
  function sourceLineage(source={},requiredEffects=[]) {
    const tags=[...(source.类别标签??[]),...(source.种族特征??[])];
    const categories=Object.values(core.CATEGORY_REGISTRY).filter(item=>item.selectable!==false&&tags.some(tag=>item.id===tag||item.name===tag)).map(item=>item.id);
    const specs=[['target.self',{}],...requiredEffects.map(spec=>Array.isArray(spec)?spec:[spec,{}])];
    const declared=[...(source.属性谱?.主属性??[]),...(source.属性谱?.副属性??[]),...tags];
    const names=[...declared,...specs.flatMap(([id,params])=>core.effectAttributeIds(id,params,declared)),'生命'];
    const attributes=Object.values(core.ATTRIBUTE_REGISTRY).filter(item=>names.some(name=>name===item.id||name===item.name||item.aliases.includes(name))).map(item=>({id:item.id,investment:item.minimumInvestment}));
    const channels=['channel.melee','channel.projectile','channel.touch'];
    for(const item of Object.values(core.CHANNEL_REGISTRY))if(tags.includes(item.id)||tags.includes(item.name))channels.push(item.id);
    for(const [effectId,params] of specs){
      const supports=item=>core.channelSupportsEffect(item,effectId,params);
      if(channels.some(id=>supports(core.CHANNEL_REGISTRY[id])))continue;
      const candidate=Object.values(core.CHANNEL_REGISTRY).filter(supports).sort((a,b)=>a.cost-b.cost||a.id.localeCompare(b.id))[0];
      if(!candidate)throw new Error(`来源能力没有可购买通道：${effectId}`);
      channels.push(candidate.id);
    }
    return compileLineage({name:source.名称??'魂兽血脉',concept:'已登记来源的能力结构',form:source.名称??'魂兽',role:'来源能力',attributeVersion:core.ATTRIBUTE_VERSION,categories:categories.length?categories:['category.humanoid'],attributes,channels:[...new Set(channels)],traits:[],weaknesses:[],baseAction:{mode:'melee',powerTier:0,attributeId:attributes[0].id},playerConfirmed:true});
  }
  return Object.freeze({VERSION,GRADES,yearsLevel,growthQuote,compileLineage,validateLineage,quote,yearsForBudget,generateLineage,sourceLineage});
});
