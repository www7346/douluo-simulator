(function(root,factory){const get=(n,p)=>root?.[n]??(typeof require==='function'?require(p):null);const api=factory({foundation:get('SoulCombatFoundation','./foundation-core.js'),effects:get('SoulEffectCompiler','./effects-core.js'),abilities:get('SoulAbilityContract','./ability-contract-core.js'),cycle:get('SoulCycleEngine','./cycle-engine.js'),narrative:get('SoulNarrative','./narrative-core.js')});if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulBackgroundHistory=api;})(typeof globalThis!=='undefined'?globalThis:this,function historicalRingCore({foundation:f,effects:e,abilities:a,cycle:c,narrative:n}) {
  const VERSION = '1.0.0-background-history';
  const STANDARD_YEARS = Object.freeze([423,764,1760,4500,12000,25000,40000,65000,85000]);
  const ACQUISITION_KINDS=Object.freeze({hunt:'普通猎杀',divine:'神赐魂环',sacrifice:'魂兽献祭','self-condensed':'自主凝环','beast-transformation':'魂兽化形凝环'});
  const clone = v => JSON.parse(JSON.stringify(v));
  const hash = v => a.hash(v);
  const cache = new Map();
  const AVATAR_BASE = Object.freeze({属性增幅档:1,身心防御加值:1,基础动作增幅:1,同源魂技增幅:1,持续回合:2,锁定魂力:16,每回合魂力:6,禁用其他武魂:true});
  const AVATAR_MODES = Object.freeze([
    {name:'凝魄真身',description:'强化自身六维，真身维持两回合。',params:{...AVATAR_BASE,属性增幅档:2}},
    {name:'守岳真身',description:'强化身心防御，真身维持四回合。',params:{...AVATAR_BASE,身心防御加值:2,持续回合:4}},
    {name:'战魂真身',description:'强化武魂基础动作与同源魂技，真身维持两回合。',params:{...AVATAR_BASE,基础动作增幅:2,同源魂技增幅:2}}
  ]);
  function compiledOf(soul) {return soul?.扩展?.结构化武魂 ?? soul?.结构化武魂;}
  function normalizeDesigns(input=[]) {
    if(!Array.isArray(input)||input.length>9)throw Error('开局魂环设计最多九枚');
    const seen=new Set();
    return input.map(raw=>{
      if(!raw||Object.keys(raw).some(k=>!['ordinal','years','acquisition','source','requestedSkills','sourceProofVersion','sourceLocked','soulBinding'].includes(k))||!Number.isInteger(raw.ordinal)||raw.ordinal<1||raw.ordinal>9||seen.has(raw.ordinal))throw Error('请选择不重复的魂环序号');
      seen.add(raw.ordinal);const result={ordinal:raw.ordinal};
      if(raw.soulBinding!==undefined){if(typeof raw.soulBinding!=='string'||raw.soulBinding.length>80||!raw.requestedSkills?.length)throw Error('魂技武魂绑定无效');result.soulBinding=raw.soulBinding;}
      if(raw.years!==undefined){if(!Number.isSafeInteger(raw.years)||raw.years<1)throw Error('魂环年限须为大于零的安全整数');result.years=raw.years;}
      if(raw.acquisition!==undefined){
        const source=raw.acquisition;
        if(!source||Object.keys(source).some(k=>!['kind','note'].includes(k))||!Object.hasOwn(ACQUISITION_KINDS,source.kind)||typeof source.note!=='string'||source.note.length>300||source.kind!=='hunt'&&!source.note.trim())throw Error('请选择魂环取得方式；特殊来源需要填写取得经历');
        result.acquisition={kind:source.kind,note:source.note.trim()};
      }
      if(raw.source!==undefined){
        const source=raw.source,core=f.MARTIAL_SOUL_CORE;
        if(!source||Object.keys(source).some(k=>!['name','description','years','categories','attributes','channels'].includes(k))||typeof source.name!=='string'||!source.name.trim()||source.name.length>30||typeof source.description!=='string'||source.description.length>600)throw Error('请填写魂兽名称和来源说明');
        if(!Number.isSafeInteger(source.years)||source.years<1)throw Error('魂环年限须为大于零的安全整数');
        if(raw.years!==undefined&&raw.years!==source.years)throw Error('魂兽来源与魂环年限不一致，请统一年限');
        for(const [key,registry,max] of [['categories',core.CATEGORY_REGISTRY,3],['attributes',core.ATTRIBUTE_REGISTRY,5],['channels',core.CHANNEL_REGISTRY,16]]){
          if(!Array.isArray(source[key])||!source[key].length||source[key].length>max||new Set(source[key]).size!==source[key].length||source[key].some(id=>!registry[id]||registry[id].selectable===false||key==='categories'&&registry[id].family!=='生物'))throw Error('魂兽的种类、属性或能力方向尚未登记，请调整来源');
        }
        result.source=clone(source);
      }
      if(raw.sourceProofVersion!==undefined){
        if(raw.sourceProofVersion!==1||!result.source)throw Error('新来源证明版本无效或缺少完整来源');
        result.sourceProofVersion=1;
      }
      if(raw.sourceLocked!==undefined){
        if(raw.sourceLocked!==true||!result.source)throw Error('固定来源偏好须绑定完整新开局来源');
        result.sourceLocked=true;
      }
      if(raw.requestedSkills!==undefined){
        if(!Array.isArray(raw.requestedSkills)||!raw.requestedSkills.length||raw.requestedSkills.length>4)throw Error('请填写完整的魂技效果设计');
        result.requestedSkills=clone(raw.requestedSkills).map(skill=>({...skill,strictEffects:true,autoAllocate:false}));
      }
      if(!result.source&&!result.requestedSkills&&result.years===undefined&&!result.acquisition)throw Error('魂环设计缺少年限、来源或希望领悟的能力');
      return result;
    }).sort((a,b)=>a.ordinal-b.ordinal);
  }
  function designedLineage(source){
    const core=f.MARTIAL_SOUL_CORE,attributes=[...new Set([...source.attributes,'attribute.life'])];
    return f.BEAST_VALUE.compileLineage({attributeVersion:core.ATTRIBUTE_VERSION,name:source.name,concept:source.description||source.name,form:source.name,role:'本能战斗',categories:source.categories,
      attributes:attributes.map(id=>({id,investment:core.ATTRIBUTE_REGISTRY[id].minimumInvestment??1})),channels:[...new Set(['channel.melee',...source.channels])],traits:[],weaknesses:[],exchangeContracts:[],baseAction:{mode:'melee',powerTier:0,attributeId:attributes[0]},playerConfirmed:true});
  }
  function checkedAttributes(raw) {
    if (!raw || Object.keys(raw).some(k=>!f.ATTRIBUTE_KEYS.includes(k))) throw Error('历史六维格式无效');
    for(const k of f.ATTRIBUTE_KEYS)if(!Number.isSafeInteger(raw[k])||raw[k]<1||raw[k]>99)throw Error('历史六维必须为1至99的整数');
    return clone(raw);
  }
  function lineageOf(soul) {
    const compiled=compiledOf(soul),d=clone(compiled.definition),core=f.MARTIAL_SOUL_CORE;
    const categories=d.categories.map(id=>core.CATEGORY_REGISTRY[id]).filter(item=>item?.family==='生物'&&item.selectable!==false);
    const category=categories[0]??core.CATEGORY_REGISTRY['category.bovine'];
    if(!category)throw Error('历史来源缺少可用生物种类');
    const primary=d.attributes[0]?.id;
    // This is an authored paid biological source, not a fake current kill.
    // It buys each requested channel and attribute via compileLineage.
    return f.BEAST_VALUE.compileLineage({
      ...d,presetId:'',draftId:'',name:`${core.ATTRIBUTE_REGISTRY[primary]?.name??'魂纹'}${category.name}`,
      concept:'背景档案中已吸收的同源魂兽',form:category.name,role:'本能战斗',categories:[category.id],
      attributes:[...d.attributes.filter(item=>item.id!=='attribute.life'),{id:'attribute.life',investment:1}],
      channels:[...new Set(['channel.melee',...d.channels])],traits:[],weaknesses:[],exchangeContracts:[],
      baseAction:{mode:'melee',powerTier:0,attributeId:primary},playerConfirmed:true
    });
  }
  function stageFacts(soul,attributes,ordinal,profile) {
    // A clean historical stage excludes present captivity, equipment and final-level resources.
    const level=ordinal*10,ownerId=soul.持有者单位ID??'background-history',stage=f.makeDefaultState();
    let unit=f.normalizeCombatant({id:ownerId,名称:'历史承载',单位种类:'魂师NPC',六维:{基础:attributes},成长:{类型:'魂师',魂力等级:level},能力:{技能ID:[]}}, {id:ownerId,kind:'魂师NPC',level});
    stage.战斗单位.列表[ownerId]=unit;stage.武魂.列表[soul.id]=clone(soul);
    stage.成长.列表[ownerId]={魂力等级:level,武魂ID列表:[soul.id],激活武魂ID:soul.id};
    unit=f.applyMartialSoulCombatModifiers(unit,soul,stage);
    const gates=c.absorptionGates(unit,profile);
    const acquisition=profile.扩展?.backgroundAcquisition;
    if(acquisition&&acquisition.kind!=='hunt'){
      normalizeDesigns([{ordinal,acquisition}]);
      gates.承载={...gates.承载,通过:true,机缘豁免:true};gates.肉身={...gates.承载};gates.灵魂={...gates.承载};
    }
    if(!gates.承载.通过)throw Error(`第${ordinal}环历史承载不足：${profile.年限}年压力${gates.承载.压力}，${level}级上限${gates.承载.上限}；请调整已付款的六维或武魂特性`);
    return {level,gates,snapshot:{魂力等级:level,六维:clone(unit.六维.有效),生命上限:unit.派生.生命上限,魂力上限:unit.派生.魂力上限,魂环承载上限:unit.派生.魂环承载上限}};
  }
  function makeProfile(soul,lineage,ordinal,years,key,design) {
    if(design?.source)lineage=designedLineage(design.source);
    const category=lineage.compiled.categories[0];
    const profile=f.normalizeSoulBeastProfile({
      id:`profile-background-${key}-${ordinal}`,单位ID:`history-beast-${key}-${ordinal}`,
      物种ID:category.id,名称:lineage.compiled.name,血脉:clone(lineage),年限:years,完整度:1,
      类别标签:[category.name],种族特征:clone(lineage.compiled.semanticTags),解剖标签:['完整结构'],
      肉身威胁:1,精神威胁:1,残留意志:1,技能种子:`background-source:${key}:${ordinal}`,魂环状态:'已吸收',归属武魂ID:soul.id,
      扩展:{generatedBy:VERSION,notPresentInScene:true,sourceOrigin:'魂兽猎杀',sourceNote:'背景档案中既往吸收；不是当前场景击杀'}
    },`history-beast-${key}-${ordinal}`);
    if(design?.source){profile.名称=design.source.name;profile.扩展.描述=design.source.description;}
    if(design?.acquisition){profile.扩展.backgroundAcquisition=clone(design.acquisition);profile.扩展.sourceOrigin=ACQUISITION_KINDS[design.acquisition.kind];profile.扩展.sourceNote=design.acquisition.note||'背景档案中既往猎杀吸收；不是当前场景击杀';}
    // Explicit new contracts only. Legacy histories retain their original graph,
    // evidence and candidate hashes; merely loading them never authorizes a source.
    const beastCompilation=e.compileSoulBeastSkills(profile,{...(design?.sourceProofVersion===1?e.sourceBeastOptions(profile):{}),seed:profile.技能种子});
    profile.扩展.能力账本=clone(beastCompilation);
    if(design?.sourceProofVersion===1){
      profile.扩展.backgroundSourceProof={version:1,sourceHash:hash(design.source),lineageHash:hash(profile.血脉)};
      e.freezeSourceBridges(profile,beastCompilation);
    }
    return {profile,beastCompilation};
  }
  function avatarVariants(soul,profile,beastSkills,ordinal,choiceSeed,compatibility) {
    const compiled=compiledOf(soul);
    if(!compiled.definition.channels.includes('channel.transform')) {
      const cost=f.MARTIAL_SOUL_CORE.CHANNEL_REGISTRY['channel.transform'].cost;
      throw Error(`第七环武魂真身需要购买形态变化通道（${cost}造化点）；当前武魂不能无偿补齐`);
    }
    const variants=AVATAR_MODES.map((mode,index)=>{
      const request={name:mode.name,strictEffects:true,allowProceduralFallback:false,requirements:['soul-power','martial-soul'],
        requestedEffects:[['target.self',{}],['transform.martial_avatar',clone(mode.params)]]};
      const result=e.compileRingSkills({martialSoul:soul,beastProfile:profile,beastSkills,ringOrdinal:ordinal,
        options:{requestedSkills:[request],compatibility,casterLevel:70,attributeSeed:`background-history:${choiceSeed}`,autoAllocate:false,allowProceduralFallback:false,skillIdPrefix:`history-avatar-${choiceSeed}-${index+1}`}});
      if(!result.skills.every(skill=>skill.effectGraph.nodes.some(node=>node.effectId==='transform.martial_avatar'))||result.budget.residualFallback||result.budget.baseActionFallback)throw Error('第七环未保留合法武魂真身');
      return {...result,title:mode.name,description:mode.description,avatarMode:index+1};
    });
    // Separate check for three true avatar specializations. The global ordinary
    // selector deliberately requires different primary roles and cannot express
    // three specializations within the same mandatory seventh-ring mechanism.
    const axes=['属性增幅档','身心防御加值','基础动作增幅','同源魂技增幅','持续回合'];
    for(let i=0;i<variants.length;i++)for(let j=i+1;j<variants.length;j++){
      const params=v=>v.skills[0].effectGraph.nodes.find(node=>node.effectId==='transform.martial_avatar').params;
      const left=params(variants[i]),right=params(variants[j]);
      if(!axes.some(k=>left[k]>right[k])||!axes.some(k=>left[k]<right[k]))throw Error('真身候选缺少真实参数取舍');
    }
    return variants;
  }
  function label(candidate,soul,design) {
    if(design?.requestedSkills){
      for(const [i,skill] of candidate.skills.entries()){
        const request=design.requestedSkills[i];skill.name=request.name;skill.description=request.description??'';skill.namingSource='ring-design';a.seal(skill);
      }
      candidate.title=candidate.skills.map(s=>s.name).join('、');candidate.description=candidate.skills.map(s=>s.description).filter(Boolean).join('；');return candidate;
    }
    if(candidate.avatarMode){
      for(const skill of candidate.skills){skill.name=candidate.title;skill.description=candidate.description;skill.namingSource='background-local-avatar';a.seal(skill);}
      return candidate;
    }
    if(candidate.presetId)return candidate;
    const labels=n.packageNarrative(candidate,soul.名称,new Set());candidate.title=labels.title;candidate.description=labels.description;
    for(const skill of candidate.skills){const item=labels.skills.find(row=>row.skillId===skill.id);skill.name=item.name;skill.description=item.description;skill.namingSource='background-local-mechanics';a.seal(skill);}
    return candidate;
  }
  function ringChoices(soul,attributes,seed,years,ordinal,prefix,design,compatibility=1) {
    const allowAdultMechanics=!seed.endsWith(':ordinary-only');
    const key=hash({version:VERSION,seed,definition:compiledOf(soul).definition,attributes,years,prefix,...(design?{design}:{})});
    const cacheKey=`${key}:${ordinal}:${soul.id}:${compatibility}`;
    if(cache.has(cacheKey))return clone(cache.get(cacheKey));
    const lineage=lineageOf(soul),{profile,beastCompilation}=makeProfile(soul,lineage,ordinal,years,key,design);
    const stage=stageFacts(soul,attributes,ordinal,profile),choiceSeed=`${key}:${ordinal}`;
    if(!e.fixedRealmPolicy(soul)&&ordinal===7&&design?.requestedSkills&&!design.requestedSkills.some(skill=>JSON.stringify(skill).includes('transform.martial_avatar')))throw Error('第七环须保留武魂真身；可讨论真身的具体强化，不能改为其他魂技');
    const raw=!e.fixedRealmPolicy(soul)&&ordinal===7&&!design?.requestedSkills?avatarVariants(soul,profile,beastCompilation.skills,ordinal,choiceSeed,compatibility):e.compileRingSkillChoices({
      martialSoul:soul,beastProfile:profile,beastSkills:beastCompilation.skills,ringOrdinal:ordinal,choiceCount:3,
      options:{choiceSeed,compatibility,allowAdultMechanics,casterLevel:stage.level,attributeSeed:`background-history:${choiceSeed}`,allowProceduralFallback:false,...(design?.requestedSkills?{requestedSkills:design.requestedSkills,acceptFixedRequestedPackage:design.requestedSkills.every(skill=>skill.strictEffects===true&&skill.autoAllocate===false)}:{})}
    }).candidates;
    if(!raw.length)throw Error(`第${ordinal}环尚不能形成合法魂技；请检查武魂已选择的能力方向与本能动作`);
    const candidates=raw.map((candidate,index)=>{
      const fingerprint=e.ringSkillPackageFingerprint(candidate);
      const result=label({...clone(candidate),id:`background-ring-choice-${key}-${ordinal}-${fingerprint}`,index,fingerprint},soul,design);
      if(!e.validateRingSkillPackage(result,profile,result.budget,{martialSoul:soul}).pass)throw Error('历史候选完整预算校验未通过');
      return result;
    });
    if(new Set(candidates.map(row=>row.fingerprint)).size!==candidates.length)throw Error('历史候选机械指纹重复');
    const result={ordinal,years,profile,stage,candidates,mechanicsHash:hash(candidates.map(row=>({id:row.id,fingerprint:row.fingerprint})))};
    if(cache.size>=64)cache.delete(cache.keys().next().value);cache.set(cacheKey,clone(result));return result;
  }
  function role(candidate) {return candidate.choiceRole?.role??candidate.choiceRole?.id??candidate.skills.flatMap(skill=>skill.effectGraph.nodes).map(node=>node.effectId).join('|');}
  function selectLocal(candidates,soul,previous) {
    const text=[soul.定位,soul.名称].join(' '),used=new Set(previous.map(row=>role(row.candidate)));
    const preferred=/辅助|治疗|圣愈/u.test(text)?['recovery','enhance','defense']:/防御|盾/u.test(text)?['defense','damage','enhance']:['damage','control','weaken'];
    return [...candidates].map(candidate=>{
      const r=role(candidate),avatar=candidate.skills[0].effectGraph.nodes.find(node=>node.effectId==='transform.martial_avatar');
      const preferredBonus=preferred.includes(r)?12-preferred.indexOf(r)*2:0;
      const conditions=candidate.skills.reduce((sum,skill)=>sum+(skill.requirements?.length??0)+Number(skill.cooldownTurns??0),0);
      const avatarBonus=avatar?(preferred[0]==='defense'?avatar.params.身心防御加值*3+avatar.params.持续回合:avatar.params.同源魂技增幅*3+avatar.params.基础动作增幅):0;
      return {candidate,score:(used.has(r)?0:8)+preferredBonus+avatarBonus-conditions*.15};
    }).sort((left,right)=>right.score-left.score||left.candidate.id.localeCompare(right.candidate.id))[0].candidate;
  }
  // Only committed history supplies a record. New choices must still come from the active menu.
  function verifiedPaidChoice(row,ring,soul,id,ratio){
    const skills=row?.skillDefinitions;
    if(!Array.isArray(skills)||!skills.length||row.ordinal!==ring.ordinal||row.selectionId!==id||
       !skills.every((s,i)=>a.verify(s).pass&&s.id==='history-ring-skill:'+soul.id+':'+row.ordinal+':'+(i+1)&&
        s.ringOrdinal===ring.ordinal&&s.ageYears===ring.years&&s.sourceRingId===row.ringId&&s.sourceBeastProfileId===row.profileId&&
        s.sourceMartialSoulId===soul.id&&s.presetId&&globalThis.SoulPresetCatalog.verifyHistoricalRing(s.presetId,s)))return null;
    const fingerprint=e.ringSkillPackageFingerprint({skills});
    const expected=ring.candidates[0].id.slice(0,ring.candidates[0].id.lastIndexOf('-')+1)+fingerprint;
    if(fingerprint!==row.candidateFingerprint||id!==expected)return null;
    const source=e.calculateRingBudget(ring.profile,soul,ratio),spent=skills.reduce((n,s)=>n+s.budget.spent,0);
    const budget={...source,available:source.usable,allocations:skills.map(s=>s.budget.available),spent,unallocated:source.usable-spent};
    const candidate={id,skills,skillCount:skills.length,compatibility:skills[0].compatibility,budget,fingerprint};
    return e.validateRingSkillPackage(candidate,ring.profile,source,{martialSoul:soul}).pass?candidate:null;
  }
  function prepare({martialSoul,attributes,seed='background',years=STANDARD_YEARS,selectedIds=[],autoSelect=false,designs,compatibilityByOrdinal,paidRecords}) {
    const soul=f.normalizeMartialSoul(clone(martialSoul),martialSoul.持有者单位ID),attrs=checkedAttributes(attributes),schedule=[...years];
    if(schedule.length>9||schedule.some(year=>!Number.isSafeInteger(year)||year<1)||selectedIds.length>schedule.length)throw Error('历史魂环配置长度或年限无效');
    const checkedDesigns=designs===undefined?undefined:normalizeDesigns(designs);
    if(checkedDesigns?.some(d=>d.ordinal>schedule.length))throw Error('开局等级尚未达到这枚魂环，请先调整等级或设计序号');
    const rings=[],selected=[];
    for(let i=0;i<schedule.length;i++){
      const design=checkedDesigns?.find(d=>d.ordinal===i+1);if(design?.source)schedule[i]=design.source.years;else if(design?.years!==undefined)schedule[i]=design.years;
      let ring;for(;;)try{ring=ringChoices(soul,attrs,seed,schedule[i],i+1,selected.map(row=>row.candidate.id),design,compatibilityByOrdinal?.[i+1]??1);break;}catch(error){if(design||!/历史承载不足/.test(error.message)||schedule[i]===1)throw error;schedule[i]=Math.max(1,Math.floor(schedule[i]*.8));}rings.push(ring);
      const id=selectedIds[i];
      let candidate=id?ring.candidates.find(row=>row.id===id):autoSelect?selectLocal(ring.candidates,soul,selected):null;
      if(id&&!candidate&&paidRecords){
        const paid=paidRecords[i];
        candidate=verifiedPaidChoice(paid,ring,soul,id,compatibilityByOrdinal?.[i+1]??1);
        // The paid selection has been verified independently of the other offers.
      }
      if(id&&!candidate)throw Error(`第${i+1}环选择ID已失效，必须重新选择这一环及后续魂环`);
      if(!candidate)break;
      selected.push({ordinal:i+1,candidate:clone(candidate),profile:clone(ring.profile),stage:clone(ring.stage),mechanicsHash:ring.mechanicsHash});
    }
    return {version:VERSION,complete:selected.length===schedule.length,request:{seed,attributes:attrs,years:schedule,...(checkedDesigns?.length?{designs:clone(checkedDesigns)}:{})},rings,selected,selectedIds:selected.map(row=>row.candidate.id)};
  }
  function materializeChosen(prepared, soul) {
  const e = globalThis.SoulEffectCompiler;
  const a = globalThis.SoulAbilityContract;
  const copy = value => JSON.parse(JSON.stringify(value));
  const chosen = copy(prepared);
  const profile = chosen.profile;
  profile.id = `${prepared.profile.id}:${soul.id}`;
  profile.单位ID = `${prepared.profile.单位ID}:${soul.id}`;
  profile.归属武魂ID = soul.id;
  // Recompile instead of partially rewriting a nested source ledger. This
  // creates all beast skill ids, source handles, provenance and hashes anew
  // from the same paid lineage and unchanged mechanical seed.
  profile.扩展.能力账本 = copy(e.compileSoulBeastSkills(profile, {...(profile.扩展.backgroundSourceProof?.version===1?e.sourceBeastOptions(profile):{}),seed: profile.技能种子}));
  if(profile.扩展.backgroundSourceProof?.version===1)e.freezeSourceBridges(profile,profile.扩展.能力账本);
  chosen.candidate.skills = chosen.candidate.skills.map((skill, index) => {
    skill.id = `history-ring-skill:${soul.id}:${chosen.ordinal}:${index + 1}`;
    skill.sourceMartialSoulId = soul.id;
    skill.sourceBeastProfileId = profile.id;
    return a.seal(skill);
  });
  if (e.ringSkillPackageFingerprint(chosen.candidate) !== prepared.candidate.fingerprint) {
    throw Error('历史来源实例化改变了候选机械合同');
  }
  return chosen;
}
  function install(state,{actorId,soulId,seed='background',years=STANDARD_YEARS,selectedIds,sourceId,designs}) {
    const soul=state.武魂.列表[soulId],growth=state.成长.列表[actorId],unit=state.战斗单位.列表[actorId];
    if(!sourceId||!soul||soul.持有者单位ID!==actorId||!growth||!unit||soul.魂环ID列表.length||growth.可用属性点!==0||growth.已投入属性点!==0||growth.魂力等级<years.length*10+1)throw Error('历史配置只能给创建事务内未配置魂环且等级合法的本人登记一次');
    const q=prepare({martialSoul:soul,attributes:unit.六维.基础,seed,years,selectedIds,designs});
    if(!q.complete)throw Error('历史魂环尚未全部选择');
    // Caller performs one creation transaction on a cloned new world. This
    // installer must not be exposed as a public ordinary command.
    const records=[];
    for(const prepared of q.selected){const chosen=materializeChosen(prepared,soul);
      const {ordinal,candidate,profile,stage}=chosen,tier=f.getAgeTier(profile.年限),ringId=`ring-${soul.id}-${ordinal}-${profile.id}`;
      if(state.魂环.列表[ringId]||state.魂兽档案.列表[profile.id])throw Error('历史魂环或来源重复');
      state.魂兽档案.列表[profile.id]=clone(profile);
      const skills=candidate.skills.map(skill=>{
        const registered={...clone(skill),名称:skill.name,类型:'魂环魂技',sourceKind:'soul-ring',持有者单位ID:actorId,ownerId:actorId,
          来源武魂ID:soul.id,sourceMartialSoulId:soul.id,来源魂环ID:ringId,sourceRingId:ringId,来源魂兽档案ID:profile.id,sourceBeastProfileId:profile.id,
          蓝图版本:f.VERSION,效果图:clone(skill.effectGraph),扩展:{预算:clone(skill.budget),契合:clone(skill.compatibility),generatedBy:VERSION,backgroundSourceId:sourceId,selectionId:candidate.id}};
        return a.seal(registered);
      });
      state.魂环.列表[ringId]={id:ringId,持有者单位ID:actorId,武魂ID:soul.id,序号:ordinal,年限:profile.年限,年限档:tier.名称,颜色:tier.颜色,
        来源魂兽档案ID:profile.id,契合:{分数:candidate.compatibility.score,转化率:candidate.budget.conversion,语义桥ID:clone(candidate.compatibility.bridgeIds),冲突:[]},
        吸收双门:clone(stage.gates),吸收时快照:clone(stage.snapshot),
        价值:{潜在点数:candidate.budget.potential,可用点数:candidate.budget.available,技能分配:clone(candidate.budget.allocations),已花费:candidate.budget.spent,未分配:candidate.budget.unallocated},
        永久属性增益:Object.fromEntries(f.ATTRIBUTE_KEYS.map(k=>[k,0])),魂技ID列表:skills.map(skill=>skill.id),
        扩展:{generatedBy:VERSION,backgroundSourceId:sourceId,selectionId:candidate.id,自由属性点:c.RING_ATTRIBUTE_POINTS,编译器版本:e.VERSION,效果注册表版本:e.REGISTRY_VERSION,蓝图哈希列表:skills.map(skill=>skill.immutableHash)}};
      for(const skill of skills){if(state.技能.列表[skill.id])throw Error('历史魂技身份重复');state.技能.列表[skill.id]=skill;}
      soul.魂环ID列表.push(ringId);unit.能力.技能ID.push(...skills.map(skill=>skill.id));growth.可用属性点+=c.RING_ATTRIBUTE_POINTS;
      records.push({ordinal,ringId,profileId:profile.id,selectionId:candidate.id,mechanicsHash:chosen.mechanicsHash,candidateFingerprint:candidate.fingerprint,skillDefinitions:clone(skills),stage:clone(stage)});
    }
    c.refreshCombatant(state,actorId);c.refreshTitleEligibility(state,actorId);
    return {version:VERSION,sourceId,actorId,soulId,request:clone(q.request),selectedIds:clone(q.selectedIds),attributePointsGranted:q.selected.length*c.RING_ATTRIBUTE_POINTS,records};
  }
  function frozenCompatibility(receipt){
    // Replay the sealed, already-paid budget through the same compiler when defaults change.
    if(!Array.isArray(receipt.records))throw Error('历史魂技冻结记录缺失');
    return Object.fromEntries(receipt.records.map(row=>{
      const skills=row.skillDefinitions,ratio=skills?.[0]?.budget?.compatibility;
      if(!skills?.length||!Number.isFinite(ratio)||ratio<.2||ratio>1||skills.some(skill=>!a.verify(skill).pass||skill.budget?.compatibility!==ratio))throw Error('历史魂技契合与原预算封印不符');
      return [row.ordinal,ratio];
    }));
  }
  function matchesPaidProfile(actual,generated){
    if(!actual)return false;
    if(hash(actual)===hash(generated))return true;
    // Channel support lists have changed across releases. Validate the archived
    // compilation against the registered historical lineage before comparing its source.
    const old=f.BEAST_VALUE.validateLineage(actual.血脉);
    return hash(old.definition)===hash(generated.血脉.definition)&&hash({...actual,血脉:generated.血脉})===hash(generated);
  }
  function usedHistoricalMenu(state,receipt){
    return receipt.records.some(r=>{
      const lineage=state.魂兽档案.列表[r.profileId]?.血脉;
      if(lineage&&hash(f.BEAST_VALUE.validateLineage(lineage).compiled)!==hash(f.BEAST_VALUE.compileLineage(lineage.definition).compiled))return true;
      return r.skillDefinitions?.some(skill=>skill.presetId&&!globalThis.SoulPresetCatalog.verifySignature(skill.presetId,skill).pass&&globalThis.SoulPresetCatalog.verifyHistoricalRing(skill.presetId,skill));
    });
  }
  function validate(state,receipt) {
    const errors=[];
    try{
      const soul=state.武魂.列表[receipt.soulId],unit=state.战斗单位.列表[receipt.actorId];
      if(receipt.version!==VERSION||!receipt.sourceId||!soul||soul.持有者单位ID!==receipt.actorId||!unit)throw Error('背景历史来源或本人不符');
      if(!receipt.request||Object.keys(receipt.request).some(k=>!['attributes','seed','years','designs'].includes(k))||!receipt.request.attributes||!receipt.request.seed||!receipt.request.years)throw Error('历史请求字段无效');
      const historicalMenu=usedHistoricalMenu(state,receipt);
      const q=prepare({martialSoul:soul,seed:receipt.request.seed,attributes:receipt.request.attributes,years:receipt.request.years,selectedIds:receipt.selectedIds,designs:receipt.request.designs,compatibilityByOrdinal:frozenCompatibility(receipt),paidRecords:historicalMenu?receipt.records:undefined});
      if(!q.complete||q.selected.length!==receipt.records.length||receipt.attributePointsGranted!==q.selected.length*c.RING_ATTRIBUTE_POINTS)throw Error('背景历史数量或成长证据不符');
      for(const prepared of q.selected){const chosen=materializeChosen(prepared,soul);
        const row=receipt.records.find(item=>item.ordinal===chosen.ordinal),ring=state.魂环.列表[row?.ringId],profile=state.魂兽档案.列表[row?.profileId];
        if(!row||row.selectionId!==chosen.candidate.id||(row.mechanicsHash!==chosen.mechanicsHash&&!(historicalMenu&&/^ability-v1:[0-9a-f]{16}$/.test(row.mechanicsHash)))||row.candidateFingerprint!==chosen.candidate.fingerprint||hash(row.stage)!==hash(chosen.stage)||!matchesPaidProfile(profile,chosen.profile))throw Error('背景魂环来源、选择或历史承载证据被更改');
        if(!ring||ring.持有者单位ID!==receipt.actorId||ring.武魂ID!==soul.id||ring.序号!==chosen.ordinal||ring.年限!==chosen.profile.年限||ring.来源魂兽档案ID!==chosen.profile.id||ring.扩展?.backgroundSourceId!==receipt.sourceId||ring.扩展?.selectionId!==row.selectionId||hash(ring.吸收时快照)!==hash(chosen.stage.snapshot)||hash(ring.吸收双门)!==hash(chosen.stage.gates)||ring.扩展?.自由属性点!==c.RING_ATTRIBUTE_POINTS)throw Error('背景魂环实际状态与历史证据不符');
        const budget=chosen.candidate.budget,value={潜在点数:budget.potential,可用点数:budget.available,技能分配:clone(budget.allocations),已花费:budget.spent,未分配:budget.unallocated};
        if(hash(ring.价值)!==hash(value)||!soul.魂环ID列表.includes(ring.id)||hash(ring.永久属性增益)!==hash(Object.fromEntries(f.ATTRIBUTE_KEYS.map(k=>[k,0]))))throw Error('背景魂环预算、归属或永久收益不符');
        const expectedSkills=clone(chosen.candidate.skills).map(skill=>a.seal({...skill,名称:skill.name,类型:'魂环魂技',sourceKind:'soul-ring',持有者单位ID:receipt.actorId,ownerId:receipt.actorId,来源武魂ID:soul.id,sourceMartialSoulId:soul.id,来源魂环ID:ring.id,sourceRingId:ring.id,来源魂兽档案ID:profile.id,sourceBeastProfileId:profile.id,蓝图版本:f.VERSION,效果图:clone(skill.effectGraph)}));
        if(hash(ring.魂技ID列表)!==hash(expectedSkills.map(skill=>skill.id)))throw Error('背景魂技列表不符');
        for(const expected of expectedSkills){const actual=state.技能.列表[expected.id],recorded=row.skillDefinitions.find(skill=>skill.id===expected.id);if(!actual||!unit.能力.技能ID.includes(expected.id)||a.fingerprint(expected)!==a.fingerprint(actual)||!recorded||a.fingerprint(recorded)!==a.fingerprint(expected)||actual.presetId!==expected.presetId||actual.artId!==expected.artId)throw Error('背景魂技与合法候选完整合同不符');}
      }
    }catch(error){errors.push(error.message);}
    return errors;
  }
  function ringPackageSoul(soul){
    const {artId,sourceDescription,playerConfirmed,...identity}=globalThis.SoulSaveTransferCore.martialSoulDraftFrom(soul);
    return identity;
  }
  function soulBinding(soul){return hash(ringPackageSoul(soul));}
  function assertDesignSoul(draft,designs){
    if(designs?.some(d=>d.soulBinding&&d.soulBinding!==soulBinding(draft.martialSoulDrafts[0])))throw Error('已导入的魂技绑定了另一套武魂，请恢复对应武魂或移除导入的魂技');
  }
  function prepareDraft(draft,{level=92,manual=false,selectedIds=[],budget=9999,designs,soulId='background-preview-soul',actorId='background-preview',compatibilityByOrdinal,paidRecords}={}) {
    assertDesignSoul(draft,designs);
    const compiled=f.MARTIAL_SOUL_CORE.finalizeDraft({...draft.martialSoulDrafts[0],playerConfirmed:true},{budget,id:soulId});
    const soul=f.normalizeMartialSoul({id:compiled.id,名称:compiled.name,持有者单位ID:actorId,结构化武魂:compiled,扩展:{结构化武魂:compiled}},actorId);
    return prepare({martialSoul:soul,attributes:draft.attributes,years:STANDARD_YEARS.slice(0,Math.min(9,Math.floor((level-1)/10))),seed:'background-history-v2'+(globalThis.SoulControlCore.adultDraft(draft)?'':':ordinary-only'),selectedIds,autoSelect:!manual,designs:designs?.filter(d=>d.ordinal<=Math.min(9,Math.floor((level-1)/10))),compatibilityByOrdinal,paidRecords});
  }
  /** Source inspection must work even when no automatic skill fits the wish. */
  function sourceDraft(draft,{ordinal,budget=9999,selectedIds=[],designs=[]}={}){
    if(!Number.isInteger(ordinal)||ordinal<1||ordinal>9)throw Error('请选择魂环序号');
    const compiled=f.MARTIAL_SOUL_CORE.finalizeDraft({...draft.martialSoulDrafts[0],playerConfirmed:true},{budget,id:'background-preview-soul'});
    const soul=f.normalizeMartialSoul({id:compiled.id,名称:compiled.name,持有者单位ID:'background-preview',结构化武魂:compiled,扩展:{结构化武魂:compiled}},'background-preview');
    const checked=normalizeDesigns(designs),attributes=checkedAttributes(draft.attributes),seed='background-history-v2'+(globalThis.SoulControlCore.adultDraft(draft)?'':':ordinary-only');
    const prior=prepare({martialSoul:soul,attributes,seed,years:STANDARD_YEARS.slice(0,ordinal-1),selectedIds,autoSelect:true,designs:checked.filter(d=>d.ordinal<ordinal)});
    const design=checked.find(d=>d.ordinal===ordinal),prefix=prior.selectedIds;
    let years=design?.source?.years??design?.years??STANDARD_YEARS[ordinal-1];
    for(;;)try{
      const key=hash({version:VERSION,seed,definition:compiled.definition,attributes,years,prefix,...(design?{design}:{})});
      const {profile,beastCompilation}=makeProfile(soul,lineageOf(soul),ordinal,years,key,design),stage=stageFacts(soul,attributes,ordinal,profile);
      return {soul,profile,stage,beastSkills:beastCompilation.skills};
    }catch(error){if(design||!/历史承载不足/.test(error.message)||years===1)throw error;years=Math.max(1,Math.floor(years*.8));}
  }
  function installDraft(state,actorId,draft,{manual=false,sourceId,selectedIds=[],designs}={}) {
    const growth=state.成长.列表[actorId],soulId=growth.武魂ID列表[0],soul=state.武魂.列表[soulId],level=growth.魂力等级;
    assertDesignSoul(draft,designs);
    const count=Math.min(9,Math.floor((level-1)/10));
    const q=prepare({martialSoul:soul,attributes:draft.attributes,years:STANDARD_YEARS.slice(0,count),seed:'background-history-v2'+(globalThis.SoulControlCore.adultDraft(draft)?'':':ordinary-only'),selectedIds,autoSelect:!manual,designs:designs?.filter(d=>d.ordinal<=count)});
    const receipt=install(state,{actorId,soulId,sourceId,...q.request,selectedIds:q.selectedIds});
    (growth.扩展??={}).backgroundHistory=receipt;
    if(level>=91)growth.封号=f.normalizeTitleRecord({封号:titleName(soul.名称,soul.定位),来源:'代码生成',取得等级:level},level);
    return receipt;
  }
  function recordedTitleName(name,role){const raw=name.replace(/武魂|之|的/g,'').slice(0,2)+(/防御|盾/.test(role)?'御':/治疗|辅助/.test(role)?'华':'玄');return f.normalizeTitleRecord({封号:raw,来源:'代码生成',取得等级:92},92).封号;}
  function titleName(name,role){
    const core=String(name??'').replace(/武魂|真身|斗罗|之|的/g,'').replace(/[^\p{Script=Han}]/gu,''),authored={'磐纹盾':'磐御','七宝琉璃塔':'琉璃','蓝电霸王龙':'雷霆','昊天锤':'昊天','圣愈杖':'圣愈'};
    const fallback=/防御|盾/.test(role)?'镇岳':/治疗/.test(role)?'圣愈':/辅助/.test(role)?'星华':/控制/.test(role)?'缚影':/敏攻/.test(role)?'逐影':'惊锋';
    const letters=Array.from(core),raw=authored[core]??(letters.length?letters.slice(0,2).join(''):fallback);
    return f.normalizeTitleRecord({封号:raw,来源:'代码生成',取得等级:92},92).封号;
  }
  function generateTitle(draft){const compiled=f.MARTIAL_SOUL_CORE.finalizeDraft({...draft.martialSoulDrafts[0],playerConfirmed:true},{budget:9999,id:'background-preview-soul'});return titleName(compiled.name,compiled.definition.role);}
  function validateCreationBinding(state,actorId,receipt){
    const errors=[];try{
      const opening=state.世界.opening?.background,config=opening?.config,b=config?.background,bg=globalThis.SoulBackgroundCore;
      if(!['sealed-titled','jiumeitu-heir','custom'].includes(b?.id))throw Error('历史能力只能绑定本次已配置魂环的开局');
      const actor=['custom','jiumeitu-heir'].includes(b.id)&&actorId===opening.mainId?{...bg.resolveActor(config,'main'),id:opening.mainId}:b.id==='sealed-titled'?Object.values(bg.resolveSlots(config)).find(actor=>actor.id===actorId):null;if(!actor||actor.source==='canon')throw Error('历史能力承担者不属于本次原创人物');
      const soul=state.武魂.列表[receipt.soulId],expected=f.MARTIAL_SOUL_CORE.finalizeDraft({...actor.draft.martialSoulDrafts[0],playerConfirmed:true},{budget:actor.budget,id:soul.id});
      if(hash(compiledOf(soul).definition)!==hash(expected.definition))throw Error('历史武魂与人物创建配置不符');
      // Rebuild from the creation definition in its real namespace so receipt validation can reuse the same pure compilation.
      if((actor.ringChoices??[]).some((choice,i)=>choice&&choice!==receipt.selectedIds[i]))throw Error('历史魂环与已确认人物选择不符');
      const historicalMenu=usedHistoricalMenu(state,receipt);
      const planned=prepareDraft(actor.draft,{level:actor.level,manual:false,selectedIds:historicalMenu?receipt.selectedIds:actor.ringChoices,budget:actor.budget,designs:actor.ringDesigns,soulId:soul.id,actorId,compatibilityByOrdinal:frozenCompatibility(receipt),paidRecords:historicalMenu?receipt.records:undefined});
      if(!planned.complete||hash(receipt.request)!==hash(planned.request)||hash(receipt.selectedIds)!==hash(planned.selectedIds))throw Error('历史魂环与已确认人物配置不符');
      if(actor.level>=91){const title=state.成长.列表[actorId].封号;if(title?.封号!==titleName(expected.name,expected.definition.role)||title.来源!=='代码生成'||title.取得等级!==actor.level)throw Error('已确认封号与开局配置不符');}
    }catch(error){errors.push(error.message);}return errors;
  }
  function validateActor(state,actorId){
    const r=state.成长.列表[actorId]?.扩展?.backgroundHistory;if(!r||r.actorId!==actorId||r.soulId!==state.成长.列表[actorId].武魂ID列表[0])return ['背景历史能力来源缺失或本人与武魂不符'];
    if(r.sourceId!==state.世界.opening?.background?.sourceId)return ['历史能力未绑定本次背景创建'];
    return [...validateCreationBinding(state,actorId,r),...validate(state,r)];
  }
  return Object.freeze({VERSION,STANDARD_YEARS,ACQUISITION_KINDS,lineageOf,stageFacts,normalizeDesigns,ringPackageSoul,soulBinding,prepare,prepareDraft,sourceDraft,generateTitle,selectLocal,install:installDraft,validate:validateActor,validateReceipt:validate});
});
