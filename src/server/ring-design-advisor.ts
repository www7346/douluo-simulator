import {assertRingBudgetAlternative} from './ring-budget-alternative';
import {preserveRingDesignText} from '../shared/ring-design-editing';
import {ringDiscussionContext} from '../shared/ring-design-discussion';
import {fitOpeningRingYears} from './opening-ring-years';
import {completeOpeningRingSoul} from './opening-ring-soul';
import {effectDesignEntry,effectCompositionRules,designPromptCatalogue} from './effect-design-catalogue';
import {preflightDesignAdvice} from './design-advice-preflight';
import {rules} from '../rules';
import {CloudError} from '../cloud/protocol';
import type {ModelGateway} from '../runtime/model-gateway';
import {creativeMessages} from '../runtime/model-prompts';
import {ringPackagePresentation} from './ring-exchange-options';
import {validateCreationWorkspace} from '../runtime/creation-workbench';
import {openingRingPresentationState} from './opening-ring-presentation';
import type {DesignAdviceProgressStore} from '../shared/design-advice-progress';
import {collectRingRequirements,diagnoseRingRequirements,completeOpeningRingSource,declaredMechanismDiagnostics,ringDiagnosticSummary,unsupportedRingMechanisms,type RingDesignDiagnostic} from './ring-design-requirements';
import {parseDesignAdviceWire,isUnparsedDesignAdvice,designAdviceIntentValue} from './design-advice-wire';
import {assertDesignRepairNodeEnvelope,declaredContractRepairEffects,requiredStructureCorrections} from './design-advice-mechanics';

const clone=<T,>(v:T):T=>structuredClone(v);
const object=(v:any)=>!!v&&typeof v==='object'&&!Array.isArray(v);
const text=(v:any,max:number)=>typeof v==='string'&&!!v.trim()&&v.length<=max;
const requestKeys=['name','description','requestedEffects','requestedEffectIds','requestedBranches','strictEffects','autoAllocate','exchangeContracts','requirements','resourceCosts','maintenanceCosts','castModes','defaultCastMode','usageRules','cooldownTurns'];
export function strictRingRequests(input:any):any[]{
 if(!Array.isArray(input)||!input.length||input.length>4)throw Error('请提出一至四项完整魂技');
 return input.map(raw=>{
  if(!object(raw)||Object.keys(raw).some(k=>!requestKeys.includes(k))||!text(raw.name,30)||raw.description!==undefined&&!text(raw.description,globalThis.SoulSkillProse.descriptionLimit))throw Error('魂技须有名称和已支持的效果设计');
  if(['requestedEffects','requestedEffectIds','requestedBranches'].some(key=>raw[key]!==undefined&&!Array.isArray(raw[key])))throw Error('魂技的效果、效果ID和分支须使用完整列表，不能用说明文字代替。');
  if(!raw.requestedEffects?.length&&!raw.requestedEffectIds?.length&&!raw.requestedBranches?.length)throw Error('魂技尚未指定实际效果，不能只填写技能名称');
  return {...clone(raw),...(raw.requestedBranches?{requestedBranches:raw.requestedBranches.map((b:any)=>({...clone(b),optional:false}))}:{}),strictEffects:true,autoAllocate:false};
 });
}
function effectEntries(skills:any[]):Array<[string,any]>{
 return skills.flatMap(s=>rules.effects.ringRequestEffectSpecs(s).map((row:any)=>[row.effectId,row.params] as [string,any]));
}
function openingHistoryActor(config:any,side:string){
 if(!(['custom','jiumeitu-heir'].includes(config.background?.id)&&side==='main'||config.background?.id==='sealed-titled'&&['buyer','captive'].includes(side)))throw Error('请选择当前创建人物的开局魂环');
 return rules.backgrounds.resolveActor(config,side);
}
function saveOpeningRingSelection(config:any,side:string,ringDesigns:any[],ringChoices:string[]){
 const b=config.background;if(['custom','jiumeitu-heir'].includes(b.id)&&side==='main'){b.ringDesigns=ringDesigns;b.ringChoices=ringChoices;return;}
 b.actors={...b.actors,[side]:{...b.actors?.[side],ringDesigns,ringChoices}};
 if(b.perspective===side){b.ringDesigns=ringDesigns;b.ringChoices=ringChoices;}
}
export function ringDesignContext(state:any,target:any,source?:any,acquisition?:any,sourceProofVersion?:number):any{
 if(!object(target))throw Error('请选择要设计的魂环');
 let soul:any,profile:any,beastSkills:any[],ordinal:number,actor:any,stage:any,effectiveSource:any,effectiveAcquisition:any,currentDesign:any;
 if(target.kind==='opening'){
  if(Object.keys(target).some(k=>!['kind','config','side','ordinal'].includes(k))||typeof target.side!=='string')throw Error('请选择开局人物与魂环');
  validateCreationWorkspace({version:5,config:target.config});
  actor=openingHistoryActor(target.config,target.side);
  ordinal=target.ordinal;
  if(actor.source==='canon')throw Error('原著人物保留本人魂环；请转为自定义人物后设计');
  if(!Number.isSafeInteger(ordinal)||ordinal<1||ordinal>actor.ringCount)throw Error('当前开局等级还没有这枚魂环');
  const current=(actor.ringDesigns??[]).find((d:any)=>d.ordinal===ordinal);
  currentDesign=current;
  effectiveSource=source!==undefined?source:current?.source;
  sourceProofVersion=sourceProofVersion??current?.sourceProofVersion;
  effectiveAcquisition=acquisition!==undefined?acquisition:current?.acquisition;
  const designs=(actor.ringDesigns??[]).filter((d:any)=>d.ordinal<ordinal);
  // The source projection does not reuse an old skill request while replacing its source.
  const projection={ordinal,...(effectiveSource!==undefined?{source:effectiveSource}:current?.years!==undefined?{years:current.years}:{}),...(effectiveAcquisition!==undefined?{acquisition:effectiveAcquisition}:{}),...(sourceProofVersion!==undefined?{sourceProofVersion}:{})};
  if(Object.keys(projection).length>1)designs.push(...rules.backgroundHistory.normalizeDesigns([projection]));
  ({soul,profile,stage,beastSkills}=rules.backgroundHistory.sourceDraft(actor.draft,{ordinal,selectedIds:actor.ringChoices.slice(0,ordinal-1),budget:actor.budget,designs}));
 }else{
  if(!['item','beast'].includes(target.kind)||Object.keys(target).some(k=>!['kind','itemId','beastUnitId','martialSoulId'].includes(k)))throw Error('请选择持有或现场的魂环');
  if(source!==undefined)throw Error('这枚实际魂环的来源已经确定，不能在讨论中改成另一种魂兽');
  if(acquisition!==undefined)throw Error('这枚实际魂环的取得方式已经确定，不能靠改写经历绕过承载规则');
  const request=target.kind==='item'?{itemId:target.itemId,martialSoulId:target.martialSoulId}:{beastUnitId:target.beastUnitId,martialSoulId:target.martialSoulId};
  const quote=target.kind==='item'?rules.cycle.previewRingItem(state,request):rules.expedition.previewRingChoice(state,request);
  if(!quote.pass)throw Error(quote.reasons?.join('；')||'当前还不能领悟这枚魂环');
  if(quote.pendingId)throw Error('这枚魂环已有保留方案，请先查看原方案；本次讨论不会改写已冻结的选择');
  profile=target.kind==='item'?quote.source:(Object.values(state.魂兽档案.列表) as any[]).find(p=>p.单位ID===target.beastUnitId);
  soul=state.武魂.列表[quote.martialSoulId??target.martialSoulId];
  ordinal=target.kind==='item'?quote.eligibility.nextOrdinal:quote.ordinal;
  beastSkills=(state.战斗单位.列表[profile?.单位ID]?.能力?.技能ID??[]).map((id:string)=>state.技能.列表[id]).filter(Boolean);
 }
 const calculated=rules.cycle.calculateCompatibility(soul,profile,beastSkills),compatibility=target.kind==='opening'?{...calculated,score:100,ratio:1}:calculated;
 const budget=rules.effects.calculateRingBudget(profile,soul,compatibility.ratio);
 const key=rules.abilities.hash({target,profile,soul,beastSkills});
 return {soul,profile,beastSkills,ordinal,actor,stage,compatibility,budget,key,effectiveSource,effectiveAcquisition,currentDesign,opening:target.kind==='opening',sourceProofVersion};
}
export function ringDesignFailureReason(error:unknown){
 const message=String((error as Error).message);
 return message.replace(/status\.[a-z_]+|payload\.[a-z_]+|transform\.[a-z_]+|release\.[a-z_]+|target\.[a-z_]+|check\.[a-z_]+/g,id=>rules.effects.EFFECT_REGISTRY[id]?.displayName??id)
  .replace(/武魂没有开放该效果或参数的表达机制/g,'武魂尚未具备这项能力方向或属性')
  .replace(/魂兽血脉没有购买该效果或参数/g,'魂兽来源尚未具备这项能力或参数')
  .replace(/请调整已付款的六维或武魂特性/g,'请降低魂环年限，或调整六维、武魂特性来提高承载能力')
  .replace(/(历史承载不足[^；]+)；/,'$1；普通猎杀不能超出承载。若设定为神赐、魂兽献祭、自主凝环或魂兽化形凝环，请明确选择取得方式并说明经历；')
  .replace(/^当前来源未形成达到年限质量要求的完整魂技：/,'')
  .replace(/来源链不允许效果：([^；。]+)/g,'魂兽来源与武魂之间缺少「$1」能力桥梁')
  .replace(/没有合法来源交集|没有可用语义桥|没有找到.*语义桥/g,'魂兽来源与武魂之间缺少对应能力桥梁');
}
function failureDiagnostic(error:unknown):RingDesignDiagnostic{
 const message=ringDesignFailureReason(error);
 const quote=(error as any)?.ringBudget;
 if(quote&&Number.isFinite(quote.required)&&Number.isFinite(quote.available))return {kind:'constraint',code:'budget-limit',message,budget:{required:quote.required,available:quote.available},action:'adjust-design'};
 if(/请填写魂兽名称|属性或能力方向尚未登记|证明版本无效|效果设计|字段|格式/.test(message))return {kind:'generation',code:'proposal-schema',message,action:'retry'};
 if(/预算|承载|年限|机制档|仅支持|至少需要|技能数量|超出五档|上限|第七环/.test(message))return {kind:'constraint',code:'actual-limit',message,action:'adjust-design'};
 if(/武魂|真身需要购买/.test(message)&&!/来源与武魂之间/.test(message))return {kind:'martial-soul',code:'martial-soul-compilation',message,action:'edit-martial-soul'};
 if(/来源|桥梁|血脉/.test(message))return {kind:'source',code:'source-compilation',message,action:'adjust-design'};
 return {kind:'generation',code:'proposal-compilation',message,action:'retry'};
}
export function inspectRingDesign(state:any,target:any,proposal:any):any{
 if(!object(proposal)||Object.keys(proposal).some(k=>!['name','description','acquisition','source','skills','sourceProofVersion','sourceLocked','unsupportedMechanisms','evolutionTarget'].includes(k))||!text(proposal.name,30)||!text(proposal.description,600))throw Error('请提供完整的魂环方案名称、说明和技能设计');
 let canonical=clone(proposal),context:any,sourceAdjustment:any,yearAdjustment:any,martialSoulAdjustment:any,openingConfig:any,inspectionTarget=target,evolution:any;
 const diagnostics:RingDesignDiagnostic[]=[];
 const failed=()=>({id:'ring-design:'+rules.abilities.hash(canonical),pass:false,name:proposal.name,description:proposal.description,proposal:canonical,diagnostics,summary:ringDiagnosticSummary(diagnostics),reasons:diagnostics.map(x=>x.message),...(sourceAdjustment?{sourceAdjustment}:{}),...(yearAdjustment?{yearAdjustment}:{}),...(martialSoulAdjustment?{martialSoulAdjustment}:{})});
 try{
  diagnostics.push(...declaredMechanismDiagnostics(proposal.unsupportedMechanisms));
  if(diagnostics.length)return failed();
  if(proposal.sourceProofVersion!==undefined&&(proposal.sourceProofVersion!==1||target?.kind!=='opening'||!proposal.source))throw Error('新来源证明版本无效或缺少完整来源');
  if(proposal.sourceLocked!==undefined&&(proposal.sourceLocked!==true||target?.kind!=='opening'||!proposal.source))throw Error('固定来源偏好只适用于完整的新开局来源。');
  const requestedSkills=strictRingRequests(proposal.skills).map(skill=>({...skill,description:skill.description??globalThis.SoulSkillProse.compose(skill)}));
  context=ringDesignContext(state,target,proposal.source,proposal.acquisition,proposal.sourceProofVersion);
  if(rules.effects.fixedRealmPolicy(context.soul)){
   diagnostics.push({kind:'constraint',code:'fixed-realm-ring',message:'这项武魂的魂环固定对应画中席位与召唤，不能把自定义魂技替换成固定召唤后宣称设计成功。请回到魂环配置调整年限；若要另一套魂技，请先调整武魂。',action:'adjust-design'});return failed();
  }
  if(context.opening&&context.currentDesign?.sourceLocked===true&&proposal.source!==undefined&&rules.abilities.hash(proposal.source)!==rules.abilities.hash(context.currentDesign.source)){
   diagnostics.push({kind:'source',code:'locked-source-redefinition',message:'这枚开局魂环的来源已由玩家固定；模型不能通过重填source改写它。请先明确解除来源固定，再调整来源。',action:'adjust-design'});
   canonical={...canonical,source:clone(context.currentDesign.source),sourceLocked:true};return failed();
  }
  if(proposal.evolutionTarget){
   if(context.opening)throw Error('开局历史请直接调整创建武魂；新魂环牵引用于当前真实武魂');
   evolution=rules.evolution.planRingExpression(context.soul,proposal.evolutionTarget,context.profile);
   for(const ringId of context.soul.魂环ID列表){const ring=state.魂环.列表[ringId];if(!ring.扩展?.evolutionSealed&&ring.魂技ID列表.some((id:string)=>!rules.evolution.compatible(state.技能.列表[id],evolution.soul)))throw Error('本次变化与旧魂技不兼容，请先重构或封存对应魂环');}
  }
  const collected=collectRingRequirements(requestedSkills,evolution?.soul??rules.effects.ringExpressionForSource(context.soul,context.profile));
  diagnostics.push(...collected.diagnostics);
  if(context.opening&&!collected.diagnostics.length){
   const completion=completeOpeningRingSoul(target.config,target.side,context,collected.requirements);
   if(completion.changed){openingConfig=completion.config;martialSoulAdjustment=completion.adjustment;inspectionTarget={...target,config:openingConfig};context=ringDesignContext(state,inspectionTarget,proposal.source,proposal.acquisition,proposal.sourceProofVersion);}
   sourceAdjustment=completeOpeningRingSource(context,collected.requirements);
   const sourceLocked=proposal.sourceLocked===true||context.currentDesign?.sourceLocked===true;
   if(sourceLocked&&(sourceAdjustment.addedChannels.length||sourceAdjustment.addedAttributes.length)){
    const missingChannels=sourceAdjustment.addedChannels.map((id:string)=>rules.martialSoul.CHANNEL_REGISTRY[id]),missingAttributes=sourceAdjustment.addedAttributes.map((id:string)=>rules.martialSoul.ATTRIBUTE_REGISTRY[id]);
    diagnostics.push({kind:'source',code:'locked-opening-source',message:'已固定的魂兽来源缺少所需能力'+(missingChannels.length?'（方向：'+missingChannels.map((c:any)=>c.name).join('、')+'）':'')+(missingAttributes.length?'（属性：'+missingAttributes.map((a:any)=>a.name).join('、')+'）':'')+'。来源未被改写，请决定是否允许调整来源或修改魂技。',missingChannels:missingChannels.map((c:any)=>({id:c.id,name:c.name,cost:c.cost})),missingAttributes:missingAttributes.map((a:any)=>({id:a.id,name:a.name,minimumInvestment:a.minimumInvestment})),action:'adjust-design'});
    sourceAdjustment={...sourceAdjustment,applied:false,requiresSourceDecision:true};canonical={...canonical,source:clone(context.effectiveSource),sourceProofVersion:1,sourceLocked:true,skills:clone(requestedSkills)};return failed();
   }
   canonical={...canonical,source:clone(sourceAdjustment.source),sourceProofVersion:1,...(sourceLocked?{sourceLocked:true}:{}),skills:clone(requestedSkills)};
   context=ringDesignContext(state,inspectionTarget,canonical.source,proposal.acquisition,1);
  }
  if(context.opening&&context.ordinal===7&&!rules.effects.fixedRealmPolicy(context.soul)&&!effectEntries(requestedSkills).some(([id])=>id==='transform.martial_avatar'))diagnostics.push({kind:'constraint',code:'seventh-ring-avatar',message:'第七环须保留武魂真身，不能改成其他魂技。',action:'adjust-design'});
  const requirementDiagnostics=diagnoseRingRequirements(evolution?{...context,soul:evolution.soul}:context,collected.requirements);
  diagnostics.push(...requirementDiagnostics.filter(d=>!context.opening||d.code!=='age-mechanism'));
  if(diagnostics.length){if(context.opening)diagnostics.push(...requirementDiagnostics.filter(d=>d.code==='age-mechanism'));return failed();}
  const compile=(source:any)=>rules.effects.compileRingSkills({martialSoul:source.soul,beastProfile:source.profile,beastSkills:source.beastSkills,ringOrdinal:source.ordinal,
   options:{requestedSkills,...(proposal.evolutionTarget?{evolutionTarget:proposal.evolutionTarget}:{}),preferredSkillCount:requestedSkills.length,compatibility:source.compatibility.ratio,casterLevel:source.stage?.level,autoAllocate:false,allowProceduralFallback:false}});
  let compiled:any,yearFailure:any;
  if(context.opening&&(requirementDiagnostics.some(d=>d.code==='age-mechanism')||requestedSkills.length>rules.effects.ringSkillLimit(context.profile)))yearFailure={};
  else try{compiled=compile(context);}catch(error){if(!context.opening||!(error as any)?.ringBudget)throw error;yearFailure=error;}
  if(yearFailure){
   const fitted=fitOpeningRingYears({context,requirements:collected.requirements,skillCount:requestedSkills.length,requiredBudget:yearFailure.ringBudget?.required,
    locked:canonical.sourceLocked===true,rebuild:years=>ringDesignContext(state,inspectionTarget,{...canonical.source,years},canonical.acquisition,1),compile});
   yearAdjustment=fitted.adjustment;
   if(fitted.diagnostic){diagnostics.push(fitted.diagnostic);if(fitted.diagnostic.code==='source-year-locked')sourceAdjustment={...sourceAdjustment,applied:false,requiresSourceDecision:true};return failed();}
   context=fitted.context;compiled=fitted.compiled;canonical={...canonical,source:{...canonical.source,years:context.profile.年限}};
  }
  for(const [i,skill]of compiled.skills.entries()){
   const timing=rules.effects.designActionTimingErrors(skill);if(timing.length)throw Error(timing.join('；'));
   const balance=rules.effects.designBalanceErrors(skill);if(balance.length){diagnostics.push(...balance.map((message:string)=>({kind:'constraint' as const,code:'design-balance',message,action:'adjust-design' as const})));return failed();}
   skill.name=requestedSkills[i].name;skill.description=requestedSkills[i].description??globalThis.SoulSkillProse.compose(skill);rules.abilities.seal(skill);
  }
  let presentationState=state;
  if(context.opening)presentationState=openingRingPresentationState(context.actor,context.soul).state;
  const presented=ringPackagePresentation(presentationState,evolution?.soul??context.soul,compiled,context.opening?context.actor.ringCount:context.ordinal);
  const design={ordinal:context.ordinal,...(context.effectiveSource!==undefined?{source:clone(context.effectiveSource)}:context.opening?{years:context.profile.年限}:{}),...(context.sourceProofVersion!==undefined?{sourceProofVersion:context.sourceProofVersion}:{}),...(canonical.sourceLocked?{sourceLocked:true}:{}),...(context.effectiveAcquisition?{acquisition:clone(context.effectiveAcquisition)}:{}),requestedSkills};
  return {id:'ring-design:'+rules.abilities.hash({key:context.key,proposal:canonical}),pass:true,name:proposal.name,description:proposal.description,sourceKey:context.key,source:{name:context.profile.名称,years:context.profile.年限},compatibility:context.compatibility,budget:compiled.budget,
    ...presented,requestedSkills,...(evolution?{evolutionTarget:clone(proposal.evolutionTarget),evolutionPreview:{name:evolution.soul.名称,form:rules.evolution.definition(evolution.soul).form,charges:evolution.growth.charges,cost:evolution.growth.cost}}:{}),design,acquisition:context.effectiveAcquisition?{...context.effectiveAcquisition,label:rules.backgroundHistory.ACQUISITION_KINDS[context.effectiveAcquisition.kind]}:null,warnings:context.stage?.gates.承载.机缘豁免?['本方案按明确登记的特殊取得经历免除承载门槛，仍需满足技能年限、桥梁、预算与当前等级的释放限制。']:[],proposal:canonical,diagnostics:[],summary:ringDiagnosticSummary([],true),...(sourceAdjustment?{sourceAdjustment}:{}),...(yearAdjustment?{yearAdjustment}:{}),...(martialSoulAdjustment?{martialSoulAdjustment,openingConfig}:{}),reasons:[]};
 }catch(error){diagnostics.push(failureDiagnostic(error));return failed();}
}
export function ringDesignCatalogue(state:any,target:any){
 const context=ringDesignContext(state,target),bridges=rules.effects.resolveBridges(context.soul,context.profile,context.beastSkills),core=rules.martialSoul;
 const tier=rules.foundation.getAgeTier(context.profile.年限);
 return {evolutionDesign:!context.opening?{current:rules.evolution.definition(context.soul),rule:'可在方案顶层填写完整 evolutionTarget，由本次真实魂环支付逐组件结构费用；预算按变化前武魂计算，魂技使用剩余额度。跨类型只可先建立保留旧结构的过渡形态；不兼容旧魂技应先单独重构或封存。',attributes:Object.values(core.ATTRIBUTE_REGISTRY),categories:Object.values(core.CATEGORY_REGISTRY),channels:Object.values(core.CHANNEL_REGISTRY),traits:core.TRAIT_TEMPLATES}:null,evolutionGuides:!context.opening&&context.ordinal>=3&&context.ordinal<=9?rules.evolutionContent.GUIDES.map((g:any)=>rules.evolutionContent.guideStep(context.soul,g.id,context.ordinal)):[],phase:context.opening?'opening-history':'actual-ring',sourceKey:context.key,source:{name:context.profile.名称,years:context.profile.年限,color:rules.foundation.getAgeTier(context.profile.年限).颜色,description:context.profile.扩展?.描述??'',attributes:context.profile.属性谱,locked:!context.opening,automaticPlaceholder:context.opening&&!context.effectiveSource},
  sourceInstruction:context.opening?'创建阶段保留技能原意、参数、费用、次数及来源名称与主题。按正式目录补齐来源能力和桥梁，按完整效果提高所需年限。武魂缺少的通道和属性按创建点数最小补齐，采用时保留已有投入和其他武魂。调整固定来源先征得玩家允许。普通猎杀按历史承载核验，特殊取得使用玩家指定的经历。':'实际游玩沿用已取得魂环的来源与年限，设计该来源支持的技能。',
  currentDesign:context.currentDesign,contractDesign:rules.effects.contractDesignGrammar(),unsupportedMechanisms:clone(unsupportedRingMechanisms),
  sourceLockInstruction:context.opening?'玩家明确固定来源能力时，提交 sourceLocked:true 和完整 source。需要调整时列出改动，由玩家决定。其余开局提案按来源设计规则填写。':'实际来源已固定，proposal 只提交技能方案。',
  unsupportedResponseShape:{mode:'proposal',reply:'明确说明未实现的作用并提示联系作者；保留构想。',proposals:[{name:'机制名称',description:'具体要求的作用；不是近似效果。',unsupportedMechanisms:['mechanism.time-stop']}]},
  acquisition:context.effectiveAcquisition??{kind:'hunt',note:''},
  martialSoul:{name:context.soul.名称,definition:context.soul.扩展?.结构化武魂?.definition},ringOrdinal:context.ordinal,compatibility:context.compatibility,budget:context.budget,
  sourceDesign:context.opening?{minimumYears:1,maximumYears:Number.MAX_SAFE_INTEGER,acquisitionKinds:Object.entries(rules.backgroundHistory.ACQUISITION_KINDS).map(([kind,label])=>({kind,label,requiresNote:kind!=='hunt'})),capacity:context.stage?.gates?.承载,absorptionLevel:context.stage?.level,categories:Object.values(core.CATEGORY_REGISTRY).filter((c:any)=>c.family==='生物'&&c.selectable!==false).map((c:any)=>({id:c.id,name:c.name})),attributes:Object.values(core.ATTRIBUTE_REGISTRY).map((a:any)=>({id:a.id,name:a.name})),channels:Object.values(core.CHANNEL_REGISTRY).map((c:any)=>({id:c.id,name:c.name,effects:c.effectIds}))}:null,
  ageRules:{tier:tier.名称,mechanismLimit:tier.机制上限,maximumSkillCount:rules.effects.ringSkillLimit(context.profile),minimumRawValuePerSkill:rules.effects.ringSkillMinimumBudget(context.profile),requiredEffects:context.opening&&context.ordinal===7&&!rules.effects.fixedRealmPolicy(context.soul)?['transform.martial_avatar']:[]},
  compositionRules:effectCompositionRules(),balanceRules:{...rules.effects.DESIGN_BALANCE_POLICY,instructions:['持续减伤最多75%，点数无需全部花完。','直接死亡须有目标豁免，可重复使用时还须实际消耗及冷却或次数限制。','防护、复苏或死亡不能同时零消耗、无冷却且不限次数。']},
  effects:Object.entries(rules.effects.EFFECT_REGISTRY).filter(([,e]:[string,any])=>e.authorable!==false).map(([id,e]:[string,any])=>{
   const bridgeAvailable=bridges.some((b:any)=>b.effectIds.includes(id)),martialSoulAllowed=core.allowsEffect(context.soul,id,{}),ageAllowed=rules.effects.TIER_RANK[tier.名称]>=rules.effects.TIER_RANK[e.minimumAgeTier]&&rules.effects.MECHANISM_RANK[tier.机制上限]>=rules.effects.MECHANISM_RANK[e.mechanismLevel];
   return {...effectDesignEntry(id,e),id,name:e.displayName,family:e.family,minimumAgeTier:e.minimumAgeTier,mechanismLevel:e.mechanismLevel,baseCost:e.baseCost,parameterBounds:e.parameterBounds,parameterDefaults:e.parameterDefaults,...(e.optionalParameterBounds?{optionalParameterBounds:e.optionalParameterBounds}:{}),...(e.structuredParameterBounds?{structuredParameterBounds:e.structuredParameterBounds}:{}),bridgeAvailable,martialSoulAllowed,ageAllowed,sourceCanBeDesigned:context.opening,martialSoulCanBeCompleted:context.opening,eligibleNow:(context.opening||bridgeAvailable)&&martialSoulAllowed&&ageAllowed};}),
  responseShape:{mode:'proposal',reply:'回应玩家的魂兽与技能构想；说明实际取舍',proposals:[{name:'方案名称',description:'作用与取舍',...(context.opening?{source:{name:'魂兽名称',description:'来源能力说明',years:context.profile.年限,categories:['category.insect'],attributes:['attribute.mind'],channels:['channel.projectile','channel.fear']}}:{}),skills:[{name:'魂技名称',description:'面向玩家的正式技能介绍',requestedEffects:[['release.projectile',{}],['target.single',{}],['check.save',{属性:'意志'}],['status.fear',{持续回合:1}]]}]}]}};
}
function checkedRingAdvice(value:any){
 if(!object(value)||Object.keys(value).some(k=>!['mode','reply','proposals'].includes(k))||!['question','proposal'].includes(value.mode)||!text(value.reply,2000))throw Error('魂环主持人的答复不完整，请重试原讨论');
 if(value.mode==='question'){if(value.proposals!==undefined)throw Error('追问时不应同时改写魂环');return clone(value);}
 if(!Array.isArray(value.proposals)||!value.proposals.length||value.proposals.length>3)throw Error('请给出一至三套可供比较的魂技方案');
 return clone(value);
}
function reviewedRingAnswer(state:any,target:any,raw:any,sourceKey:string):any{
 try{if(isUnparsedDesignAdvice(raw))throw Error('本次答复不是完整JSON，原文已保留。');raw=checkedRingAdvice(raw);}catch(error){
  const diagnostics:RingDesignDiagnostic[]=[{kind:'generation',code:isUnparsedDesignAdvice(raw)?'reply-json':'reply-shape',message:ringDesignFailureReason(error),action:'retry'}];
  return {mode:'proposal',reply:'本次设计答复尚未完整，原构想已保留。',sourceKey,proposals:[],diagnostics,summary:ringDiagnosticSummary(diagnostics)};
 }
 if(raw.mode==='question')return {mode:raw.mode,reply:raw.reply,sourceKey};
 const proposals=raw.proposals.map((proposal:any)=>{
  try{return inspectRingDesign(state,target,proposal);}catch(error){
   const diagnostics:RingDesignDiagnostic[]=[{kind:'generation',code:'proposal-shape',message:ringDesignFailureReason(error),action:'retry'}];
   return {id:'ring-design:'+rules.abilities.hash(proposal),name:typeof proposal?.name==='string'?proposal.name:'待完善方案',description:typeof proposal?.description==='string'?proposal.description:'',pass:false,proposal:clone(proposal),diagnostics,summary:ringDiagnosticSummary(diagnostics),reasons:diagnostics.map(x=>x.message)};
  }
 }),diagnostics=proposals.flatMap((p:any)=>p.diagnostics),ready=proposals.filter((p:any)=>p.pass).length;
 return {mode:raw.mode,reply:raw.reply,sourceKey,proposals,diagnostics,summary:ready?{status:'ready',message:ready===proposals.length?'全部方案已通过完整规则核验，可以采用。':ready+'份方案可以采用，其余方案仍需按诊断调整。'}:ringDiagnosticSummary(diagnostics)};
}
/** Repair can correct malformed/unknown fields. Every already legal requested
 * node, its explicit parameters and required branch identity remain mandatory. */
function ringRepairPreservesIntent(before:any,after:any,correctDependencies=false){
 before=designAdviceIntentValue(before);
 if(!object(after)||!['question','proposal'].includes(after.mode))return false;
 const originals=Array.isArray(before?.proposals)?before.proposals:object(before?.proposal)?[before.proposal]:[];
 if(!originals.length)return true;
 if(after.mode!=='proposal')return false;
 if(originals.length>3)return after.proposals.every((next:any)=>originals.some((proposal:any)=>ringRepairPreservesIntent({mode:'proposal',proposals:[proposal]},{mode:'proposal',proposals:[next]})));
 if(originals.length!==after.proposals.length)return false;
 const same=(a:any,b:any)=>rules.abilities.hash(a)===rules.abilities.hash(b);
 return originals.every((proposal:any,i:number)=>{
  const next=after.proposals[i];if(!object(proposal)||!object(next))return false;
  if(proposal.sourceLocked===true&&next.sourceLocked!==true)return false;
  if(proposal.acquisition!==undefined&&!same(proposal.acquisition,next.acquisition))return false;
  if(!same(proposal.evolutionTarget??null,next.evolutionTarget??null))return false;
  for(const key of ['name','description','years'])if(proposal.source?.[key]!==undefined&&proposal.source[key]!==next.source?.[key])return false;
  for(const [key,registry]of [['categories',rules.martialSoul.CATEGORY_REGISTRY],['attributes',rules.martialSoul.ATTRIBUTE_REGISTRY],['channels',rules.martialSoul.CHANNEL_REGISTRY]] as const)if(Array.isArray(proposal.source?.[key])&&proposal.source[key].filter((id:string)=>registry[id]).some((id:string)=>!next.source?.[key]?.includes(id)))return false;
  if(!Array.isArray(proposal.skills)||!proposal.skills.length)return !next.skills?.length;
  if(!Array.isArray(next.skills)||next.skills.length!==proposal.skills.length)return false;
  return proposal.skills.every((skill:any,j:number)=>{
   for(const key of ['exchangeContracts','requirements','resourceCosts','maintenanceCosts','castModes','defaultCastMode','usageRules','cooldownTurns'])if(skill[key]!==undefined&&!same(skill[key],next.skills[j][key]))return false;
   let original:any[],revised:any[];try{original=rules.effects.ringRequestEffectSpecs(skill);revised=rules.effects.ringRequestEffectSpecs(next.skills[j]);}catch{return false;}
   try{original=declaredContractRepairEffects(original);if(correctDependencies)original=requiredStructureCorrections(original).rows;assertDesignRepairNodeEnvelope(original,revised);}catch{return false;}
   const branches=skill.requestedBranches??[],nextBranches=next.skills[j].requestedBranches??[];
   if(nextBranches.length!==branches.length||nextBranches.some((branch:any)=>!branches.some((prior:any)=>prior.id===branch.id&&prior.activation===branch.activation)))return false;
   if(skill.requestedBranches?.some((branch:any,k:number)=>['id','activation','targetPolicy'].some(key=>branch[key]!==undefined&&branch[key]!==next.skills[j].requestedBranches?.[k]?.[key])))return false;
   const used=new Set<number>();
   return original.filter(row=>rules.effects.EFFECT_REGISTRY[row.effectId]).every(row=>{
    const definition=rules.effects.EFFECT_REGISTRY[row.effectId];
    const valid=Object.fromEntries(Object.entries(row.params??{}).filter(([key,value])=>rules.effects.effectParameterAllowed(row.effectId,key,value,row.params)));
    let normalized:any;try{normalized=rules.effects.normalizeEffectParams(row.effectId,row.params,row.activation);}catch{return false;}
    const complete=Object.entries(row.params??{}).every(([key,value])=>Object.hasOwn(normalized,key)&&same(value,normalized[key]));
    const match=revised.findIndex((candidate,index)=>{
     if(used.has(index)||candidate.effectId!==row.effectId||candidate.activation!==row.activation||candidate.branchId!==row.branchId||!Object.entries(valid).every(([key,value])=>same(value,candidate.params?.[key])))return false;
     try{return !complete||same(normalized,rules.effects.normalizeEffectParams(candidate.effectId,candidate.params,candidate.activation));}catch{return false;}
    });
    if(match<0)return false;used.add(match);return true;
   });
  });
 });
}
export async function requestRingDesignAdvice(gateway:ModelGateway,state:any,input:any,signal?:AbortSignal,progress?:DesignAdviceProgressStore){
 if(signal?.aborted)throw signal.reason??Error('魂环设计已取消，原构想保留。');
 if(!text(input.description,4000)||!Array.isArray(input.exchanges??[])||(input.exchanges??[]).some((e:any)=>!text(e.input,4000)||!text(e.reply,2000))||input.preserveText!==undefined&&typeof input.preserveText!=='boolean')throw Error('请填写完整的魂兽来源与魂技构想');
 input={...input,exchanges:ringDiscussionContext(input.exchanges??[])};
 const catalogue=ringDesignCatalogue(state,input.target),saved=progress?.read();
 const promptCatalogue=()=>designPromptCatalogue(catalogue,gateway.hasPromptOverride?.('ring-design-advisor')??true);
 let initial:any;
 if(saved?.initial===undefined){
  const messages=creativeMessages('ring-design-advisor',{...promptCatalogue(),request:input.description,preserveExistingText:input.preserveText!==false,exchanges:input.exchanges??[],previous:input.previous??null});
  // Local prompt/profile compilation must pass before marking a stage as sent.
  preflightDesignAdvice(gateway,messages,'ring-design-advisor');
  progress?.reserve?.('initial');
  initial=await gateway.structured(messages,value=>value,{task:'ring-design-advisor',signal,parseStructured:parseDesignAdviceWire,repairFormat:false,repairValidation:false});
  progress?.write('initial',initial);
 }else initial=clone(saved.initial);
 initial=preserveRingDesignText(initial,input.previous,input.preserveText!==false);
 const initialReview=reviewedRingAnswer(state,input.target,initial,catalogue.sourceKey);
 if(initialReview.mode==='question')return initialReview;
 // Opening budgets are fitted by raising the authored age. An old cached
 // lower-effect answer is not permission to replace the player's exact design.
 if(input.target.kind==='opening'&&!initialReview.diagnostics?.some((d:any)=>d.kind==='generation')){
  return {...initialReview,repair:{attempted:false,maximum:1,finished:false,available:false}};
 }
 const used=gateway.recoveryBudget?.snapshot().used.some(row=>row.kind==='ring-design-repair')??false;
 const budgetOnly=input.target.kind!=='opening'&&initialReview.proposals?.length>0&&initialReview.proposals.every((p:any)=>!p.pass&&p.diagnostics?.length>0&&p.diagnostics.every((d:any)=>d.code==='budget-limit'));
 const retryable=budgetOnly||initialReview.diagnostics?.some((d:any)=>d.kind==='generation')&&!initialReview.diagnostics?.some((d:any)=>['martial-soul','unsupported','constraint'].includes(d.kind));
 let repaired:any=saved?.repaired;
 if(repaired===undefined&&retryable&&!used&&(gateway.recoveryBudget?.remaining??1)>0){
  const messages=creativeMessages('ring-design-advisor',{...promptCatalogue(),request:input.description,preserveExistingText:input.preserveText!==false,exchanges:input.exchanges??[],previous:input.previous??null,
   repair:{attempt:1,maximum:1,original:initial,diagnostics:initialReview.diagnostics,...(budgetOnly?{mode:'budget-alternative',instruction:'原稿已经保留。proposals 按原顺序返回预算内备选，沿用各方案的技能、效果、分支、来源、属性、目标、条件、费用、次数、契约处罚、长期机制和年限。可降低伤害骰数、骰面、非负伤害或命中加值、状态持续回合或分钟（至少1），或将强化数值向零调整。在 reply 列出实际下调的数值。每套备选均须通过规则与预算核验。'}:{instruction:'返回完整 question/proposal 协议，修正错误节点、格式和遗漏字段。释放或目标与 requires 不符时，按同分支正式依赖给出备选并说明具体变化。沿用玩家原构想、武魂、方案和技能数量、合法效果及明确参数、年限、来源主题和固定偏好，从原始资料读取来源。'})}});
  preflightDesignAdvice(gateway,messages,'ring-design-advisor');
  progress?.reserve?.('repaired');
  repaired=await gateway.structured(messages,value=>value,{task:'ring-design-advisor',signal,parseStructured:parseDesignAdviceWire,repairFormat:false,repairValidation:false,recoveryKind:'ring-design-repair'});
  progress?.write('repaired',repaired);
 }
 if(repaired!==undefined){
  repaired=preserveRingDesignText(repaired,input.previous,input.preserveText!==false);
  try{if(isUnparsedDesignAdvice(repaired))throw Error('格式仍未完整');checkedRingAdvice(repaired);}catch{
   return {...reviewedRingAnswer(state,input.target,repaired,catalogue.sourceKey),repair:{attempted:true,maximum:1,finished:false}};
  }
  if(budgetOnly){
   try{
    const alternatives:any[]=[],seen=new Set<string>();
    for(const candidate of repaired.proposals){
     for(const [index,original] of initial.proposals.entries()){
      let changes:any[];try{changes=assertRingBudgetAlternative({proposals:[original]},{proposals:[candidate]}).map(change=>({...change,proposal:index}));}catch{continue;}
      const reviewed=inspectRingDesign(state,input.target,candidate),mechanics=rules.abilities.hash({source:candidate.source,acquisition:candidate.acquisition,skills:(candidate.skills??[]).map(({name,description,...mechanics}:any)=>mechanics)});
      if(!reviewed.pass||seen.has(mechanics))continue;
      seen.add(mechanics);alternatives.push({...reviewed,budgetAlternative:{originalId:initialReview.proposals[index].id,changes}});break;
     }
    }
    if(!alternatives.length)return {...initialReview,repair:{attempted:true,maximum:1,finished:false}};
    return {...initialReview,proposals:[...initialReview.proposals,...alternatives],summary:{status:'ready',message:'原构想已保留；另有当前预算以内的降配备选，请比较实际效果后选择。'},repair:{attempted:true,maximum:1,finished:true}};
   }catch{return {...initialReview,repair:{attempted:true,maximum:1,finished:false}};}
  }
  if(!ringRepairPreservesIntent(initial,repaired)&&ringRepairPreservesIntent(initial,repaired,true)){
   const corrected=reviewedRingAnswer(state,input.target,repaired,catalogue.sourceKey);
   if(corrected.proposals?.some((p:any)=>p.pass)){const alternatives=corrected.proposals.filter((p:any)=>p.pass).map((p:any)=>({...p,structuralAlternative:true}));return {...corrected,proposals:[...initialReview.proposals,...alternatives],diagnostics:[...initialReview.diagnostics,...corrected.diagnostics],summary:{status:'ready',message:'原构想保留；另有按正式组合要求修正的可用备选，请查看释放与目标变化后选择。'},repair:{attempted:true,maximum:1,finished:true}};}
  }
  if(!ringRepairPreservesIntent(initial,repaired)){
   const diagnostic:RingDesignDiagnostic={kind:'generation',code:'repair-changed-intent',message:'本次内部修复改变了已确认的效果、参数、数量或来源；未采用替代方案，原构想已保留。',action:'retry'};
   return {...initialReview,diagnostics:[...initialReview.diagnostics,diagnostic],summary:ringDiagnosticSummary([...initialReview.diagnostics,diagnostic]),repair:{attempted:true,maximum:1,finished:false}};
  }
  return {...reviewedRingAnswer(state,input.target,repaired,catalogue.sourceKey),repair:{attempted:true,maximum:1,finished:true}};
 }
 return {...initialReview,repair:{attempted:used,maximum:1,finished:false,available:retryable&&!used&&(gateway.recoveryBudget?.remaining??1)>0}};
}
export function adoptOpeningRingDesign(config:any,side:string,ordinal:number,proposal:any){
 const target={kind:'opening',config,side,ordinal},review=inspectRingDesign(undefined,target,proposal);
 if(!review.pass){
  // Only this explicit review rejection is public. Compiler exception text stays
  // in the cause for the existing hashed diagnostic; it is never the wire message.
  const kind=review.diagnostics.find((d:any)=>['unsupported','martial-soul','source','constraint'].includes(d.kind))?.kind;
  const messages:Record<string,string>={unsupported:'这套魂技包含当前版本尚未实现的机制，无法采用。',
   'martial-soul':'这套魂技尚未满足武魂的能力方向或属性要求，未能采用。请按当前设定重新核验。',
   source:'这套魂技的来源或能力桥梁尚未满足要求，未能采用。请按当前设定重新核验。',
   constraint:'这套魂技尚未满足年限、预算、承载或参数限制，未能采用。请查看方案核验结果。'};
  throw new CloudError('rule-rejected',messages[kind]??'这套魂技尚未通过完整设计核验，未能采用。原构想已保留，请重新核验。',422,Error(review.reasons.join('；')));
 }
  const next=clone(review.openingConfig??config),b=next.background,actor=openingHistoryActor(next,side);
 const designs=rules.backgroundHistory.normalizeDesigns([...(actor.ringDesigns??[]).filter((d:any)=>d.ordinal!==ordinal),review.design]);
 if(review.martialSoulAdjustment){saveOpeningRingSelection(next,side,designs,[]);return {config:next,review};}
 const history=rules.backgroundHistory.prepareDraft(actor.draft,{level:ordinal*10+1,manual:false,selectedIds:actor.ringChoices.slice(0,ordinal-1),budget:actor.budget,designs:designs.filter((d:any)=>d.ordinal<=ordinal)});
 const ringChoices=history.selectedIds;
 saveOpeningRingSelection(next,side,designs,ringChoices);
 return {config:next,review};
}

/** An explicit creation editor action. It clears an editing preference, never
 * grants source capabilities or edits any existing world/ring instance. */
export function unlockOpeningRingSource(config:any,side:string,ordinal:number){
 validateCreationWorkspace({version:5,config});
 const actor=openingHistoryActor(config,side);
 if(actor.source==='canon')throw Error('原著人物保留本人来源；请先明确转为自定义人物。');
 if(!Number.isSafeInteger(ordinal)||ordinal<1||ordinal>actor.ringCount)throw Error('当前创建等级没有这枚魂环。');
 const current=(actor.ringDesigns??[]).find((d:any)=>d.ordinal===ordinal),next=clone(config);
 if(!current?.sourceLocked)return {config:next,changed:false,requiresReview:true};
 const designs=(actor.ringDesigns??[]).map((d:any)=>{const value=clone(d);if(value.ordinal===ordinal)delete value.sourceLocked;return value;});
 const checked=rules.backgroundHistory.normalizeDesigns(designs),ringChoices=actor.ringChoices.slice(0,ordinal-1),b=next.background;
 saveOpeningRingSelection(next,side,checked,ringChoices);
 return {config:next,changed:true,requiresReview:true,clearedChoicesFrom:ordinal};
}

/** Validate an age edit before the caller replaces the saved draft. */
export function changeOpeningRingYears(config:any,side:string,ordinal:number,years?:number,acquisition?:any){
 validateCreationWorkspace({version:5,config});
 const actor=openingHistoryActor(config,side);
 if(actor.source==='canon')throw Error('原著人物保留本人魂环；请先转为自定义人物');
 if(ordinal===0&&years===undefined){
  const next=clone(config);saveOpeningRingSelection(next,side,[],[]);return {config:next};
 }
 if(!Number.isSafeInteger(ordinal)||ordinal<1||ordinal>actor.ringCount)throw Error('当前等级没有这枚魂环');
 const designs=(actor.ringDesigns??[]).filter((d:any)=>d.ordinal!==ordinal);
 if(years!==undefined){
  if(!Number.isSafeInteger(years)||years<1)throw Error('请输入大于零的整数年限');
  const old=(actor.ringDesigns??[]).find((d:any)=>d.ordinal===ordinal);
  const {years:previousYears,...kept}=old??{};
  designs.push({...kept,ordinal,...(old?.source?{source:{...old.source,years}}:{years}),...(acquisition!==undefined?{acquisition}:{})});
 }
 const checked=rules.backgroundHistory.normalizeDesigns(designs);
 // Changing a source is not choosing its soul skills. Validate its historical
 // capacity without requiring the automatic candidate generator to fit it.
 const source=rules.backgroundHistory.sourceDraft(actor.draft,{ordinal,selectedIds:actor.ringChoices.slice(0,ordinal-1),budget:actor.budget,designs:checked.filter((d:any)=>d.ordinal<=ordinal)});
 const next=clone(config),b=next.background,ringChoices=actor.ringChoices.slice(0,ordinal-1);
 saveOpeningRingSelection(next,side,checked,ringChoices);
 return {config:next,ring:{years:source.profile.年限,color:rules.foundation.getAgeTier(source.profile.年限).颜色}};
}
