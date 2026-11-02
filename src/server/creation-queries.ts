import {jsonMatchesText} from '../shared/json-identity';
import {workshopAdviceMatches} from '../shared/opening-workshop-advice';
import {playerCopy} from '../runtime/player-copy';
import {martialSoulTraitTiming,martialSoulTraitMeaning} from '../runtime/martial-soul-writing';
import {ringLore} from './reward-presentation';
import {inspectCreationAdvice} from './creation-advisor';
import {rules} from '../rules';
import {presetPresentation} from './preset-queries';
import {inspectItemAdvice} from './creation-item-advisor';
import {inspectWorkshopAdvice} from './creation-workshop-advisor';
import {starterDraft,defaultStarterDraft,completeStarterHistory} from './creation-starters';
import {createWorkspace,importWorkspace,creationPreview,editWorkspaceSoul,replaceSoulEntry,setSoulCount,soulTemplateDraft,validateCreationWorkspace} from '../runtime/creation-workbench';
import {CloudError} from '../cloud/protocol';
import {creationReason} from '../shared/creation-draft';
import {abilityPresentation} from '../runtime/ability-presentation';
import {openingRingPresentationState} from './opening-ring-presentation';
import {unlockOpeningRingSource} from './ring-design-advisor';

const pick=(value:any,keys:string[])=>Object.fromEntries(keys.filter(key=>value[key]!==undefined).map(key=>[key,value[key]]));
const entries=(value:any,keys:string[])=>Object.fromEntries(Object.entries(value).map(([id,item])=>[id,pick(item,keys)]));
const soulCore=rules.martialSoul;
const traitPresentation=(v:any)=>({...pick(v,selectionFields),meaning:playerCopy(martialSoulTraitMeaning(v)),timing:martialSoulTraitTiming(v),parameterMeanings:Object.fromEntries((soulCore.PARAMETER_OPTIONS[v.parameters]??[]).map((parameter:string)=>[parameter,playerCopy(martialSoulTraitMeaning(v,parameter))]))});
const selectionFields=['id','name','parameters','selectable','minimumInvestment','maximumInvestment','maxLevel'];
const catalog={
  situations:rules.talents.SITUATIONS,situationPointCap:rules.talents.SITUATION_POINT_CAP,
  soul:{CATEGORY_REGISTRY:entries(soulCore.CATEGORY_REGISTRY,selectionFields),ATTRIBUTE_REGISTRY:entries(soulCore.ATTRIBUTE_REGISTRY,selectionFields),CHANNEL_REGISTRY:entries(soulCore.CHANNEL_REGISTRY,selectionFields),BASE_ACTION_MODES:entries(soulCore.BASE_ACTION_MODES,selectionFields),
    TRAIT_TEMPLATES:soulCore.TRAIT_TEMPLATES.map(traitPresentation),WEAKNESS_TEMPLATES:soulCore.WEAKNESS_TEMPLATES.map(traitPresentation),PARAMETER_OPTIONS:soulCore.PARAMETER_OPTIONS},
  templates:Object.fromEntries(Object.entries(rules.world.MARTIAL_SOUL_TEMPLATES).map(([id,v]:[string,any])=>[id,{name:v.名称,grade:v.品级标签}]).concat(rules.presets.list({category:'武魂'}).map((v:any)=>[v.id,{...presetPresentation(v),grade:'精品范本'}]))),
  characterSources:rules.canonicalGrowth.sources(),
  backgrounds:rules.backgrounds.BACKGROUNDS,buyers:rules.backgrounds.BUYERS,
  relationTypes:rules.social.RELATIONSHIPS,relationshipRoles:rules.social.DEFAULT_ROLES,
  worldPeople:rules.commerceDesigns.CONTACTS.map((p:any)=>({id:p.id,name:p.name,gender:p.gender,age:p.age,level:p.level})),
  canonicalPeople:Object.values(rules.arena.CHARACTER_CATALOG).filter((p:any)=>p.kind!=='soul-beast').map((p:any)=>({id:p.id,name:p.name,periodLabel:p.periodLabel,sourcePolicy:p.sourcePolicy,level:p.level,...(p.openingLevel?{openingLevel:p.openingLevel}:{}),identityLoadout:!!p.mechanics.identityLoadout,blockedReason:rules.arena.worldCharacterUnavailableReason(p.id,undefined,'catalog')||(!p.battleCapable?'此人物没有可用的完整魂师档案':'')})),
  restraintTemplates:rules.backgroundRestraints.catalog(),
  attributes:pick(rules.world.CREATION_RULES,['attributeMinimum','attributeMaximum']),attributePresets:{balanced:{name:'载入27点均衡分配',attributes:rules.world.attributePreset('balanced')}},
  talents:entries(rules.talents.TALENTS,['id','name','cost','description']),opportunities:entries(rules.talents.OPPORTUNITIES,['id','name','cost','description','enabled','hidden','years']),
  sources:{divine:rules.talents.GODS,million:rules.talents.MILLION_SOURCES,'boon-ring':Object.fromEntries(Object.entries(rules.talents.BOON_SOURCES).map(([id,v]:[string,any])=>[id,v.name])),'boon-bone':Object.fromEntries(Object.entries(rules.talents.BOON_SOURCES).map(([id,v]:[string,any])=>[id,v.name]))},
  sourceDetails:Object.fromEntries(['divine','million','boon-ring','boon-bone'].flatMap(kind=>Object.keys(kind==='divine'?rules.talents.GODS:kind==='million'?rules.talents.MILLION_SOURCES:rules.talents.BOON_SOURCES).map(sourceId=>[`${kind}:${sourceId}`,{...rules.talents.sourceDetails({kind,sourceId}),...(['boon-ring','boon-bone'].includes(kind)?{description:ringLore({payload:{ringSource:{kind:'boon-ring',sourceId,years:423}}}).description}:{})}]))),
  labels:{'nine-beauties-v1':'九席收押画境',...Object.fromEntries([soulCore.CATEGORY_REGISTRY,soulCore.ATTRIBUTE_REGISTRY,soulCore.CHANNEL_REGISTRY,Object.fromEntries(soulCore.TRAIT_TEMPLATES.map((v:any)=>[v.id,v])),Object.fromEntries(soulCore.WEAKNESS_TEMPLATES.map((v:any)=>[v.id,v]))].flatMap(v=>Object.keys(v??{}).map(id=>[id,v[id].name??soulCore.humanizeRegisteredToken(id,id)])))},
};

// Read-only presentation of the existing starting-ring contract. Original
// characters keep their actual rings on every soul; custom histories belong to
// the first soul, exactly as the creation transaction installs them.
const canonicalHistoryCache=new Map<string,any>();
function historySkill(skill:any,state?:any){
  const displayInfo=abilityPresentation(skill,state);
  return {...pick(skill,['id','name','description','type','category','activation','artId','presetId','sourceKind','sourceMartialSoulId','sourceBeastProfileId','sourceRingId','sourceItemId','modifiers','passiveCombat','requirements','resourceCosts','maintenanceCosts','castModes','defaultCastMode','cooldownTurns','usageRules','soulPowerCost','soulPowerCostRate','outputScale','nativeCastRank','minimumCastRank']),
    name:skill.name??skill.名称,description:displayInfo.description,type:skill.type??skill.类型??'魂环魂技',activation:displayInfo.activation,effectGraph:skill.effectGraph??skill.效果图,displayInfo};
}
const historyCandidate=(candidate:any,projection?:ReturnType<typeof openingRingPresentationState>)=>{const skills=candidate.skills.map((skill:any)=>historySkill(projection?{...skill,sourceMartialSoulId:projection.soul.id,来源武魂ID:projection.soul.id,持有者单位ID:projection.ownerId}:skill,projection?.state));return {...pick(candidate,['id','index','title','fingerprint','choiceRole','presetId','artId','budget','compatibility']),description:skills.map((s:any)=>s.description).join('\n'),skills};};
const historyProfile=(profile:any)=>pick(profile,['id','名称','年限']);
function historyProblem(error:unknown){
  const message=(error as Error).message;
  const stale=/^第(\d+)环选择ID已失效/.exec(message);
  return stale?`第${stale[1]}环的原方案已不适用，请重新选择这一环及之后的魂环`:creationReason(message.replace(/^武魂草案尚未通过玩家确认与代码终审：/,'武魂设定尚未完成：'));
}
function canonicalHistory(actor:any,perspective:string){
  const player=actor.side===perspective,key=rules.abilities.hash({characterId:actor.characterId,level:actor.level,draft:actor.draft,player});
  if(canonicalHistoryCache.has(key))return structuredClone(canonicalHistoryCache.get(key));
  const preview=rules.world.makeInitialState('opening-canon-preview');
  preview.世界.characterSources=rules.canonicalGrowth.selectedSources({background:{canonicalPlayer:{characterId:actor.characterId}}});
  const made=rules.arena.configureOpeningCharacter(preview,actor.characterId,{draft:actor.draft,level:actor.level,player}),state=made.state,growth=state.成长.列表[made.unitId];
  const souls=growth.武魂ID列表.map((id:string,index:number)=>({index,id,name:state.武魂.列表[id].名称,ringCount:state.武魂.列表[id].魂环ID列表.length,isHistoricalSource:true}));
  const rings=souls.flatMap((soul:any)=>state.武魂.列表[soul.id].魂环ID列表.map((id:string)=>{
    const ring=state.魂环.列表[id],skills=ring.魂技ID列表.map((skillId:string)=>historySkill(state.技能.列表[skillId],state));
    const profile=state.魂兽档案?.列表?.[ring.来源魂兽档案ID];
    const candidate={id:'canonical-history:'+id,index:0,title:skills.map((skill:any)=>skill.name??skill.名称).join('、'),description:skills.map((skill:any)=>skill.description??'').filter(Boolean).join('\n'),skills,budget:{spent:ring.价值?.已花费??0,available:ring.价值?.可用点数??0}};
    return {id,ordinal:ring.序号,years:ring.年限,color:ring.颜色,martialSoulIndex:soul.index,martialSoulId:soul.id,martialSoulName:soul.name,profile:{...(profile?{名称:profile.名称}:{}),年限:ring.年限},skills,candidates:[candidate],stage:{level:ring.吸收时快照?.魂力等级??ring.序号*10}};
  }));
  const result={complete:true,selected:rings.map(({skills,candidates,...ring}:any)=>({...ring,candidate:candidates[0]})),selectedIds:[],rings,souls,canonical:true};
  if(canonicalHistoryCache.size>=16)canonicalHistoryCache.delete(canonicalHistoryCache.keys().next().value!);
  canonicalHistoryCache.set(key,structuredClone(result));return result;
}
function actorHistory(actor:any,perspective:string){
  const meta={actorId:actor.id,side:actor.side,name:actor.draft.name,level:actor.level,canonical:actor.source==='canon',manual:actor.source!=='canon'&&actor.side===perspective,
    martialSoulId:'background-preview-soul',title:actor.canonical?.title??'',hasRingDesigns:Boolean(actor.ringDesigns?.length),
    souls:(actor.draft.martialSoulDrafts??[]).map((soul:any,index:number)=>({index,id:index===0?'background-preview-soul':`background-preview-soul-${index+1}`,name:soul.name,ringCount:index===0?actor.ringCount:0,isHistoricalSource:index===0}))};
  try{
    if(actor.source==='canon'){
      const history=canonicalHistory(actor,perspective);return {...meta,...history,martialSoulId:history.souls[0]?.id,ready:true,errors:[]};
    }
    const errors=(actor.draft.martialSoulDrafts??[]).flatMap((soul:any,index:number)=>{
      const inspection=soulCore.inspectDraft(soul,{budget:actor.budget});
      return [...inspection.missing,...inspection.ambiguities,...inspection.conflicts].map((entry:any)=>`第${index+1}武魂：${creationReason(entry.reason)}`)
        .concat(inspection.unsupported.length?[`第${index+1}武魂含无法识别的选择，请重新选择`]:[])
        .concat(inspection.overBudget?[`第${index+1}武魂超出可用造化点${inspection.overBudget}点`]:[]);
    });
    if(!actor.draft.martialSoulDrafts?.length)errors.push('请先选择武魂');
    if(errors.length)return {...meta,ready:false,errors,complete:false,rings:[],selected:[],selectedIds:[]};
    (meta as any).designableRingCount=actor.ringCount;
    let history;
    try{history=rules.backgroundHistory.prepareDraft(actor.draft,{level:actor.level,manual:meta.manual,selectedIds:actor.ringChoices,budget:actor.budget,designs:actor.ringDesigns});}
    catch(error){
      // An explicitly edited, unchosen source may be valid even when no default
      // package fits it (notably high-age seventh-ring avatars). Keep its editor
      // available; only a subsequently validated skill package can be selected.
      for(const design of [...actor.ringDesigns??[]].sort((a:any,b:any)=>a.ordinal-b.ordinal)){
        const ordinal=design.ordinal;
        if(ordinal<=actor.ringChoices.length||ordinal>actor.ringCount||design.requestedSkills?.length)continue;
        const options={manual:meta.manual,selectedIds:actor.ringChoices,budget:actor.budget};
        // The other actor may have an automatic prefix, rather than stored
        // selections. Find the actual first failing edited ring in either mode.
        try{rules.backgroundHistory.prepareDraft(actor.draft,{...options,level:ordinal*10+1,designs:actor.ringDesigns.filter((d:any)=>d.ordinal<=ordinal)});continue;}catch{}
        const prior=rules.backgroundHistory.prepareDraft(actor.draft,{...options,level:ordinal*10,designs:actor.ringDesigns.filter((d:any)=>d.ordinal<ordinal)});
        if(!prior.complete)throw error;
        const source=rules.backgroundHistory.sourceDraft(actor.draft,{ordinal,selectedIds:prior.selectedIds,budget:actor.budget,designs:actor.ringDesigns.filter((d:any)=>d.ordinal<=ordinal)});
        history={...prior,complete:false,rings:[...prior.rings,{ordinal,years:source.profile.年限,profile:source.profile,stage:source.stage,candidates:[],designPending:true}]};
        break;
      }
      if(!history)throw error;
    }
    const projection=openingRingPresentationState(actor);
    const ringMeta={martialSoulIndex:0,martialSoulId:meta.martialSoulId,martialSoulName:meta.souls[0]?.name};
    return {...meta,...history,ready:true,errors:[],title:actor.level>=91?rules.backgroundHistory.generateTitle(actor.draft):'',
      rings:history.rings.map((ring:any)=>({...pick(ring,['ordinal','years','mechanicsHash','designPending']),...ringMeta,stage:{level:ring.stage.level},profile:historyProfile(ring.profile),color:rules.foundation.getAgeTier(ring.years).颜色,acquisition:ring.profile.扩展?.backgroundAcquisition??{kind:'hunt',note:''},yearRules:{minimum:1,maximum:Number.MAX_SAFE_INTEGER,acquisitionKinds:Object.entries(rules.backgroundHistory.ACQUISITION_KINDS).map(([kind,label])=>({kind,label,requiresNote:kind!=='hunt'}))},candidates:ring.candidates.map((candidate:any)=>historyCandidate(candidate,projection))})),
      selected:history.selected.map((ring:any)=>({...pick(ring,['ordinal','mechanicsHash']),...ringMeta,stage:{level:ring.stage.level},profile:historyProfile(ring.profile),years:ring.profile.年限,color:rules.foundation.getAgeTier(ring.profile.年限).颜色,candidate:historyCandidate(ring.candidate,projection)}))};
  }catch(error){const stale=/^第(\d+)环选择ID已失效/.exec((error as Error).message);return {...meta,ready:false,errors:[historyProblem(error)],...(stale?{staleSelectionFrom:Number(stale[1])}:{}),complete:false,rings:[],selected:[],selectedIds:[]};}
}

export function creationQuery(name:string,input:Record<string,any>):any {
  switch(name){
    case 'creation.ring.unlock-source-preference':
      if(Object.keys(input).some(key=>!['config','side','ordinal'].includes(key)))throw new CloudError('invalid-query','解除来源固定只接受当前创建草稿、人物与魂环序号');
      return unlockOpeningRingSource(input.config,input.side,input.ordinal);
    case 'creation.workshop-catalog':return rules.openingWorkshop.catalog(input.config);
    case 'creation.workshop':return rules.openingWorkshop.quote(input.config);
    case 'creation.workshop-design':return rules.openingWorkshop.inspectDesign(input.design);
    case 'creation.review-workshop-advice':
      if(!workshopAdviceMatches(input.config,input.proposal?.base))throw new CloudError('stale-query','作品草稿已经改变，请重新讨论后采用');
      return inspectWorkshopAdvice(input.config,input.designId,{mode:'proposal',reply:input.proposal.reply,design:input.proposal.design});
    case 'creation.trait-preview':{
      const group=input.group==='weaknesses'?'weaknesses':'traits';
      const before=soulCore.inspectDraft(input.soul),after=soulCore.applyManualEdit(input.soul,{action:'add',group,value:input.value});
      const addedConflicts=after.conflicts.filter((entry:any)=>!before.conflicts.some((prior:any)=>prior.field===entry.field));
      return {cost:after.pricing.total-before.pricing.total,pricing:after.pricing,conflicts:after.conflicts,addedConflicts};
    }
    case 'creation.review-advice':
      if(!jsonMatchesText(input.config,input.proposal?.base))throw new CloudError('stale-query','草稿已经改变，请重新讨论后采用');
      return inspectCreationAdvice(input.config,{mode:'proposal',reply:input.proposal.reply,patch:input.proposal.patch},input.reserveSouls);
    case 'creation.review-item-advice':
      if(!jsonMatchesText(input.config,input.proposal?.base))throw new CloudError('stale-query','草稿已经改变，请重新讨论道具后采用');
      return inspectItemAdvice(input.config,{mode:'proposal',reply:input.proposal.reply,items:input.proposal.items});
    case 'creation.import':return importWorkspace(input.config);
    case 'creation.bootstrap':return {catalog,workspace:createWorkspace(defaultStarterDraft(),input.workspace)};
    case 'creation.background':return createWorkspace(starterDraft(input.config,input.background));
    case 'creation.restore-background':return createWorkspace(input.config.background.id==='sealed-titled'?rules.backgrounds.selectDraft(input.config,input.background):input.config);
    case 'creation.canon':return {...rules.backgrounds.canonicalDraft(input.characterId,input.level,input.mode),characterId:input.characterId};
    case 'creation.actor':return createWorkspace(rules.backgrounds.chooseActor(input.config,input.side,input.source,input.characterId));
    case 'creation.actors':return input.config.background.id==='sealed-titled'?rules.backgrounds.resolveSlots(input.config):null;
    case 'creation.relations':return {summary:rules.openingRelations.summary(input.config),rows:rules.openingRelations.draftRelations(input.config.background.relations??rules.openingRelations.defaults(input.config)),errors:rules.openingRelations.validateDraft(input.config)};
    case 'creation.complete-history':try{return createWorkspace(completeStarterHistory(input.config));}catch(error){throw new CloudError('invalid-query',historyProblem(error),422);}
    case 'creation.items':{
      const b=rules.backgrounds.selection(input.config.background);
      try{return rules.backgroundRestraints.quote(b);}catch(e){return {pass:false,errors:[(e as Error).message],items:[],total:0,maximum:rules.backgroundRestraints.budget(b.id),wearerLevel:b.id==='sealed-titled'?rules.backgrounds.resolveActor(input.config,'captive').level:9};}
    }
    case 'creation.history':{
      const b=rules.backgrounds.selection(input.config.background);
      if(b.id==='jiumeitu-heir'){
        const main=actorHistory(rules.backgrounds.resolveActor(input.config,'main'),'main'),actorErrors=!main.ready||main.rings.some((ring:any)=>ring.designPending)?[{side:'main',actorId:main.actorId,name:main.name,errors:main.ready?main.rings.filter((ring:any)=>ring.designPending).map((ring:any)=>`请完成第${ring.ordinal}环的魂技设计`):main.errors}]:[];
        return {ready:!actorErrors.length,actorErrors,actors:{main},main,title:main.title};
      }
      if(b.id!=='sealed-titled')return null;
      const slots=rules.backgrounds.resolveSlots(input.config),actors={buyer:actorHistory(slots.buyer,b.perspective),captive:actorHistory(slots.captive,b.perspective)};
      const actorErrors=Object.values(actors).filter(actor=>!actor.ready||actor.rings.some((ring:any)=>ring.designPending)).map(actor=>({side:actor.side,actorId:actor.actorId,name:actor.name,errors:actor.ready?actor.rings.filter((ring:any)=>ring.designPending).map((ring:any)=>`请完成第${ring.ordinal}环的魂技设计`):actor.errors}));
      return {ready:!actorErrors.length,actorErrors,actors,captive:actors.captive,title:actors.captive.title,buyer:actors.buyer,slots};
    }
    case 'creation.preview':{
      const result=creationPreview(input.config),background=rules.backgrounds.policy(input.config.background,input.config.difficulty);
      if(['sealed-titled','jiumeitu-heir'].includes(input.config.background.id)&&result.pass){try{const history=creationQuery('creation.history',input);if(!history.ready){result.pass=false;result.errors.push(...history.actorErrors.flatMap((actor:any)=>actor.errors.map((error:string)=>`${actor.name}：${error}`)));}else if(!history.actors[input.config.background.id==='jiumeitu-heir'?'main':input.config.background.perspective].complete){result.pass=false;result.errors.push('请完成当前人物的历史魂环选择，或请主持人配齐剩余魂环');}}catch(e){result.pass=false;result.errors.push(creationReason((e as Error).message));}}
      let creationItems;try{creationItems=rules.backgroundRestraints.quote(input.config.background);}catch(e){creationItems={pass:false,errors:[(e as Error).message]};}
      const actor=input.config.background.id==='sealed-titled'?rules.backgrounds.resolveActor(input.config,input.config.background.perspective):null,wallet=actor?.canonical?.wallet??background.wallet;
      return {...result,background,creationItems,identity:{name:background.definition.name,currency:rules.world.formatCurrency(wallet+(background.ordinary?rules.talents.inspectSelection(input.config.opening,{purchase:false}).selection.opportunities.reduce((sum:number,v:any)=>sum+rules.talents.opportunityGold(v.kind),0):0))},opportunities:(input.config.opening?.opportunities??[]).map((v:any)=>({kind:v.kind,name:rules.talents.ringItemName(v),tier:v.kind==='starter-supplies'?'补给':rules.foundation.getAgeTier(rules.talents.OPPORTUNITIES[v.kind]?.years).名称}))};
    }
    case 'creation.template':return rules.presets.get(input.templateId)?.category==='武魂'?rules.martialSoul.normalizeDraft({...rules.presets.request(input.templateId),draftId:input.draftId,playerConfirmed:false}):input.templateId?soulTemplateDraft(input.templateId):rules.martialSoul.normalizeDraft({draftId:input.draftId,sourceDescription:''});
    case 'creation.edit':{
      const workspace=validateCreationWorkspace(input.workspace) as any,index=input.index;
      if(rules.backgrounds.policy(workspace.config.background).readonly)throw new CloudError('invalid-query','雪崩皇子完整档案只读');
      if(input.kind==='count')return setSoulCount(workspace,input.count);
      if(!Number.isInteger(index)||!workspace.config.martialSoulDrafts[index])throw new CloudError('invalid-query','请选择需要修改的武魂');
      if(input.kind==='entry')return replaceSoulEntry(workspace,index,input.group,input.entryIndex,input.value);
      if(input.kind==='edit')return editWorkspaceSoul(workspace,index,input.operation);
      throw new CloudError('invalid-query','不支持这项武魂编辑');
    }
    default:throw new CloudError('invalid-query','不支持这项觉醒操作');
  }
}
