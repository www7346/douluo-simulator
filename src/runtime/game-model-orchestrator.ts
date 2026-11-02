import {promptMessage} from './model-prompt-templates';
import {rules} from '../rules';
import {ModelGateway} from './model-gateway';
import {creativeMessages} from './model-prompts';
import {materialWritingContext,soulWritingContext,beastWritingContext,establishedName} from './creative-context';
import {abilityWritingMeaning,researchAbilityWritingSource} from './ability-writing';
import {martialSoulWritingMeaning,martialSoulTraitMeaning,martialSoulDesignAuthority} from './martial-soul-writing';
import {checkedDesign,reviewDesignAuthority} from './model-design-authority';
import {ModelProposalValidationError} from '../shared/model-proposal-validation-error';

const clone = <T,>(value: T): T => structuredClone(value);

export interface MartialSoulGeneration {
  draft: Record<string, any>;
  inspection: Record<string, any>;
  advisorReply: string;
}

export interface MartialSoulAdvice {
  mode?: 'question'|'proposal';
  session: Record<string, any>;
  inspection: Record<string, any> | null;
  advisorReply: string;
}

export async function requestMartialSoulDraft(
  gateway: ModelGateway,
  sourceDescription: string,
  options: {budget?: number; draftId?: string; signal?: AbortSignal} = {},
): Promise<MartialSoulGeneration> {
  const advice = await requestMartialSoulAdvice(gateway,sourceDescription,{...options,requireCompleteProposal:true});
  if (!advice.inspection || advice.inspection.status !== 'awaiting-adjustment') throw new Error(advice.inspection?.nextQuestion || '顾问还需要了解你的想法，请继续讨论');
  const inspection=rules.martialSoul.inspectDraft({...advice.inspection.draft,playerConfirmed:true},{budget:options.budget ?? 70});
  if (!inspection.accepted) throw new Error(inspection.nextQuestion || '武魂方案尚需调整');
  return {draft:clone(inspection.draft),inspection:clone(inspection),advisorReply:advice.advisorReply};
}

export async function requestMartialSoulAdvice(
  gateway: ModelGateway,
  sourceDescription: string,
  options: {budget?: number; draftId?: string; signal?: AbortSignal; session?: Record<string, any>;currentDraft?:Record<string,any>;peerSouls?:Record<string,any>[];requireCompleteProposal?:boolean} = {},
): Promise<MartialSoulAdvice> {
  const description = sourceDescription.trim();
  if (!description) throw new Error('请先写下希望武魂具备的形态、属性或定位');
  const budget = Math.max(1, Math.floor(options.budget ?? 70));
  const session = options.session ? rules.martialSoul.normalizeAdvisorSession(options.session) : rules.martialSoul.startAdvisorSession(description, {draftId: options.draftId});
  if(options.currentDraft)session.draft=rules.martialSoul.normalizeDraft(options.currentDraft);
  const contextDraft=session.draft?clone(session.draft):null;
  // Old template descriptions are archival data, not the player's current design.
  if(contextDraft)delete contextDraft.sourceDescription;
  if(options.peerSouls!==undefined&&(!Array.isArray(options.peerSouls)||options.peerSouls.length>2))throw Error('同角色最多提供另外两个武魂');
  const peerSouls=(options.peerSouls??[]).map(draft=>{
    const inspected=rules.martialSoul.inspectDraft(draft,{budget:1000000});
    const complete=![...inspected.missing,...inspected.ambiguities,...inspected.conflicts,...inspected.unsupported].length;
    return {name:inspected.draft.name,quality:complete?inspected.quality:null,meaning:martialSoulWritingMeaning(inspected.draft)};
  });
  const registry = {
    designAuthority:{stage:'武魂创建提案，尚未采用或创建',inputRole:'playerInput 描述期望的外形、主题、背景与玩法。已持有的能力取自当前角色资料',mechanicalSource:'按登记项与实际 budget 编译类别、属性投入、基础动作、特性与交换。名称和来历用于形象描写',budget,selection:'强度诉求可在预算内提出较高投入；支出由具体选择计价，玩家采用方案后生效'},
    creationPeers:{souls:peerSouls,qualityRequirement:'同一角色完整武魂品级一致'},
    budget,attributeVersion:rules.martialSoul.ATTRIBUTE_VERSION,
    session:{draft:contextDraft,messages:session.messages,remembered:session.remembered,turn:session.turn},
    playerInput:description,
    currentMeaning:contextDraft?martialSoulWritingMeaning(contextDraft):null,
    categories: Object.values(rules.martialSoul.CATEGORY_REGISTRY).filter((item: any) => item.selectable !== false).map((item: any) => ({id:item.id,name:item.name,family:item.family,cost:item.cost})),
    attributes: Object.values(rules.martialSoul.ATTRIBUTE_REGISTRY).map((item: any) => ({id:item.id,name:item.name,minimumInvestment:item.minimumInvestment,maximumInvestment:item.maximumInvestment,levels:Array.from({length:item.maximumInvestment-item.minimumInvestment+1},(_,index)=>({investment:index+item.minimumInvestment,weight:10+rules.martialSoul.attributeStrength({id:item.id,investment:index+item.minimumInvestment})}))})),
    channels: Object.values(rules.martialSoul.CHANNEL_REGISTRY).map((item: any) => ({id:item.id,name:item.name,cost:item.cost,attributeHints:rules.martialSoul.channelAttributeIds(item.id),effects:item.effectIds.map((id:string)=>rules.effects.EFFECT_REGISTRY[id]?.displayName??id)})),
    baseActionModes: Object.values(rules.martialSoul.BASE_ACTION_MODES).map((item: any) => ({id:item.id,name:item.name,
      levels:[0,1,2].map(powerTier=>({powerTier,cost:rules.martialSoul.componentCost(rules.martialSoul.normalizeDraft({baseAction:{mode:item.id,powerTier,attributeId:'attribute.ice'}})).total}))})),
    pricing:{positiveCosts:['categories.cost','attributes.investment','channels.cost','traits.cost','baseActionModes.levels.cost'],weaknessRefundMaximumFraction:0.25,refundRounding:'向下取整',budget},
    traitTemplates: rules.martialSoul.TRAIT_TEMPLATES.map((t:any)=>({...t,meaning:martialSoulTraitMeaning(t)})),
    weaknessTemplates: rules.martialSoul.WEAKNESS_TEMPLATES.map((t:any)=>({...t,meaning:martialSoulTraitMeaning(t)})),
    parameterOptions:rules.martialSoul.PARAMETER_OPTIONS,
    exchangeOptions:{modes:rules.exchange.MODES,burdens:rules.exchange.REGISTRY,description:'exchangeContracts 绑定已购正面 trait 的 templateId:index，条件交换复用真实负面，linked/fixed 在启用时实际自付；价格由编译器核算'},
    currentInspection:session.draft?((inspection:any)=>({status:inspection.status,pricing:inspection.pricing,issues:inspection.issues,nextQuestion:inspection.nextQuestion}))(rules.martialSoul.inspectDraft(session.draft,{budget})):null,
    responseShape: {
      mode:'proposal',reply:'面向玩家的说明',remembered:['构想关键词'],
      patch:{name:'名称',concept:'核心概念',form:'显化形态',role:'战斗定位',categories:['登记ID'],attributes:[{id:'登记ID',investment:1}],channels:['登记ID'],traits:[],weaknesses:[],baseAction:{mode:'登记ID',powerTier:0,attributeId:'武魂已有属性ID'}},
      question:{text:'是否采用',options:['采用','调整'],allowDelegate:true},
    },
  };
  return checkedDesign(gateway,{task:'martial-soul-advisor',messages:creativeMessages('martial-soul-advisor',registry),read:value=>{
    if(!value||typeof value!=='object'||Array.isArray(value)||!['question','proposal'].includes((value as any).mode))throw new ModelProposalValidationError('AI武魂顾问必须选择question或proposal模式',{responseShape:registry.responseShape});
    const advanced = rules.martialSoul.advanceAdvisorSession(session, options.session ? description : '', value, {budget});
    if(options.requireCompleteProposal){
      if(!advanced.inspection)throw Error('自动创建需要完整武魂提案，请直接提供预算内的完整方案');
      try{
        const inspection=advanced.inspection;
        const issues=[...inspection.missing,...inspection.ambiguities,...inspection.conflicts,...inspection.unsupported];
        if(issues.length)throw Error(issues.map((issue:any)=>issue.reason).join('；'));
        rules.martialSoul.finalizeDraft({...inspection.draft,playerConfirmed:true},{budget});
      }
      catch(error){throw new ModelProposalValidationError((error as Error).message,{budget,pricing:advanced.inspection.pricing,issues:advanced.inspection.issues,missing:advanced.inspection.missing,ambiguities:advanced.inspection.ambiguities,conflicts:advanced.inspection.conflicts,unsupported:advanced.inspection.unsupported});}
    }
    if((value as {mode:string}).mode==='proposal'&&advanced.inspection){
      const expected=peerSouls.flatMap(peer=>peer.quality?[peer.quality]:[]);
      const actual=advanced.inspection.quality;
      if(expected.some(quality=>quality.value!==actual.value||quality.name!==actual.name))throw new Error('同一角色多个武魂必须保持相同品级：已有完整武魂为'+expected.map(q=>q.name).join('、')+'，本候选为'+actual.name+'。请保留其他武魂，在当前预算内调整本候选。需要取舍时请玩家选择。');
    }
    return {mode:(value as {mode:'question'|'proposal'}).mode,session:clone(advanced.session),inspection:clone(advanced.inspection),advisorReply:advanced.session.advisorMessage};
  },signal:options.signal,repairValidation:error=>options.requireCompleteProposal===true||error instanceof ModelProposalValidationError,review:async(result,budget)=>{
   if(result.mode!=='proposal'||!result.inspection)return [];
   const draft=result.inspection.draft;
   return reviewDesignAuthority(gateway,{task:'martial-soul-advisor',intent:description,signal:options.signal,budget,
    authority:{stage:'尚未采用的武魂创建提案',budget:registry.budget,pricing:result.inspection.pricing,...martialSoulDesignAuthority(draft)},
    texts:[{path:'/advisorReply',text:result.advisorReply},...['concept','form','role'].map(key=>({path:'/draft/'+key,text:draft[key]}))]});
  }});
}

export async function requestExpeditionNarrative(gateway: ModelGateway, request: Record<string, any>, signal?: AbortSignal): Promise<Record<string, any>> {
  const context={...request,beasts:request.beasts.map((beast:any)=>({...beast,
    skills:beast.skills.map((skill:any)=>({id:skill.id,meaning:abilityWritingMeaning(skill,'beast')})),
  }))};
  return gateway.structured(creativeMessages('expedition-narrative',context), value => rules.expedition.validateRoomNarrative(request, value), {signal});
}

export async function requestRingSkillNarrative(
  gateway: ModelGateway,
  state: Record<string, any>,
  pendingId: string,
  signal?: AbortSignal,
): Promise<{candidates: Record<string, any>[]}> {
  const pending=state.魂环.待选择[pendingId];
  if(!pending||pending.status!=='pending')throw new Error('没有等待取名的魂技');
  const soul=state.武魂.列表[pending.martialSoulId];
  const source=state.魂兽档案?.列表?.[pending.beastProfileId];
  const sourceItemId=pending.sourceSettlement?.kind==='ring-item'?pending.sourceSettlement.itemIds[0]:'';
  const sourceFacts=sourceItemId?rules.cycle.ringItemNarrativeRequest(state,sourceItemId,pending.playerId):{kind:'beast',years:source?.年限,source:{kind:'野生魂兽遗留魂环',profileId:pending.beastProfileId}};
  const identity={martialSoul:soulWritingContext(soul),ringSource:{...beastWritingContext(source),...sourceFacts,name:source?.扩展?.机缘叙事?.name??source?.名称,attributes:source?.属性谱}};
  const fixed=new Map<string,Record<string,any>>(),mutable=pending.candidates.filter((candidate:any)=>{
    const kept=!!candidate.presetId||candidate.skills?.some((s:any)=>(globalThis as any).SoulNineCourts?.ofSkill(s))||pending.naming?.pendingCandidateIds?.length&&!pending.naming.pendingCandidateIds.includes(candidate.id);
    if(kept)fixed.set(candidate.id,{candidateId:candidate.id,title:candidate.title,description:candidate.description,skills:candidate.skills.map((skill:any)=>({skillId:skill.id,name:skill.name,description:skill.description}))});
    return !kept;
  });
  const merge=(value:any)=>{
    const entries=value?.candidates;if(!Array.isArray(entries)||entries.length!==mutable.length||new Set(entries.map((v:any)=>v.candidateId)).size!==mutable.length||entries.some((v:any)=>!mutable.some((c:any)=>c.id===v.candidateId)))throw Error('命名须逐项对应本批待命名候选');
    const byId=new Map(entries.map((v:any)=>[v.candidateId,v]));
    return rules.cycle.validateRingSkillChoiceNarrative(state,pendingId,{candidates:pending.candidates.map((c:any)=>fixed.get(c.id)??byId.get(c.id))});
  };
  if(!mutable.length)return {candidates:merge({candidates:[]})};
  const request=rules.cycle.ringSkillChoiceNamingRequest(state,pendingId,pending.playerId);
  const candidates=request.candidates.filter((r:any)=>mutable.some((c:any)=>c.id===r.candidateId)).map((r:any)=>{
    const candidate=mutable.find((c:any)=>c.id===r.candidateId);
    return {candidateId:r.candidateId,index:r.index,fingerprint:r.fingerprint,choiceRole:candidate.choiceRole,skills:candidate.skills.map((skill:any)=>({skillId:skill.id,meaning:abilityWritingMeaning(skill,'soul')}))};
  });
  const comparison=pending.candidates.map((c:any)=>({candidateId:c.id,choiceRole:c.choiceRole,name:fixed.get(c.id)?.title??establishedName(pending.naming?.source,c.title)}));
  return {candidates:await gateway.structured(creativeMessages('ring-skill-narrative',{...request,constraints:{...request.constraints,candidateCount:mutable.length},candidates,...identity,comparison}),merge,{signal,repairValidation:true})};
}

export async function requestResearchNarrative(gateway:ModelGateway,pending:Record<string,any>,signal?:AbortSignal):Promise<{candidates:Record<string,any>[]}>{
  const fixed=new Map<string,Record<string,any>>(),mutable=pending.mechanicCandidates.filter((candidate:any,index:number)=>{
    const old=pending.candidates?.find((entry:any)=>entry.index===index)?.normalized;
    if(candidate.presetId){const projected={...pending,mechanicCandidates:[candidate],choiceCount:1};fixed.set(candidate.candidateId,rules.expedition.deterministicResearchNarrativeFixture(projected).candidates[0]);return false;}
    if(old&&pending.pendingNamingIds?.length&&!pending.pendingNamingIds.includes(candidate.candidateId)){fixed.set(candidate.candidateId,{candidateId:candidate.candidateId,name:old.name,description:old.description,form:old.form});return false;}
    return true;
  });
  const merge=(value:any)=>{
    const entries=value?.candidates;if(!Array.isArray(entries)||entries.length!==mutable.length||new Set(entries.map((v:any)=>v.candidateId)).size!==mutable.length||entries.some((v:any)=>!mutable.some((c:any)=>c.candidateId===v.candidateId)))throw Error('命名须逐项对应本批待命名作品');
    const byId=new Map(entries.map((v:any)=>[v.candidateId,v])),labels=pending.mechanicCandidates.map((c:any)=>fixed.get(c.candidateId)??byId.get(c.candidateId));
    const checked=rules.expedition.validateResearchNarrative(pending,{candidates:labels});
    return checked.map((v:any)=>({candidateId:v.candidateId,name:v.name,description:v.description,form:v.form}));
  };
  if(!mutable.length)return {candidates:merge({candidates:[]})};
  const request=rules.expedition.researchNarrativeRequest(pending);
  const candidates=request.candidates.filter((r:any)=>mutable.some((c:any)=>c.candidateId===r.candidateId)).map((r:any)=>{
    const candidate=mutable.find((c:any)=>c.candidateId===r.candidateId);
    return {candidateId:r.candidateId,deviceCategory:r.deviceCategory,fixedForm:r.fixedForm,equipmentKind:r.equipmentKind,choiceRole:r.choiceRole,grade:r.grade,kept:r.kept,lifetime:r.lifetime,
      meaning:{...abilityWritingMeaning(candidate,researchAbilityWritingSource(pending.category,candidate)),itemKind:pending.category,lifetime:r.lifetime}};
  });
  const comparison=pending.mechanicCandidates.map((c:any,i:number)=>({candidateId:c.candidateId,fixedForm:c.fixedForm,choiceRole:c.choiceRole,name:fixed.get(c.candidateId)?.name??establishedName(pending.candidates?.[i]?.normalized?.narrativeSource,pending.candidates?.[i]?.normalized?.name)}));
  return {candidates:await gateway.structured(creativeMessages('research-narrative',{...request,constraints:{...request.constraints,candidateCount:mutable.length},candidates,concept:{playerPreference:pending.concept,scope:'器物外观与风格偏好'},comparison,materialProperties:pending.evidence,materials:materialWritingContext(pending.materialSnapshot)}),merge,{signal,repairValidation:true})};
}

export async function requestRingItemNarrative(gateway:ModelGateway,state:Record<string,any>,itemId:string,signal?:AbortSignal){
  const request=rules.cycle.ringItemNarrativeRequest(state,itemId);
  return gateway.structured(creativeMessages('ring-item-narrative',request),value=>rules.cycle.validateRingItemNarrative(request,value),{signal,repairValidation:true});
}

export async function requestTitleProposal(
  gateway: ModelGateway,
  state: Record<string, any>,
  unitId: string,
  signal?: AbortSignal,
): Promise<{title: string; epithet: string}> {
  const context = rules.cycle.titleProposalContext(state, unitId);
  return gateway.structured(creativeMessages('title-narrative',context), value => {
    const candidate = rules.cycle.validateTitleProposal(state, unitId, value);
    return {title:candidate.title,epithet:candidate.epithet};
  }, {signal});
}

export async function requestCombatDecision(gateway: ModelGateway, request: Record<string, any>, signal?: AbortSignal): Promise<string> {
  const response = await gateway.structured([
    promptMessage(['combat-system','combat-intent']),
    {role:'user',content:`[DOULUO_TASK:combat-intent]\n${request.messages.user}`},
  ],value=>rules.combat.parseLlmBattleDecision(JSON.stringify(value)),{signal});
  return JSON.stringify(response);
}
