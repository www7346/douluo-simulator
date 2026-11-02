import {rules} from '../rules';

export type RingDiagnosticKind='martial-soul'|'source'|'unsupported'|'constraint'|'generation';
export interface RingDesignDiagnostic {
 kind:RingDiagnosticKind;code:string;message:string;effectId?:string;effectName?:string;skillIndex?:number;branchId?:string;
 missingChannels?:Array<{id:string;name:string;cost:number}>;
 missingAttributes?:Array<{id:string;name:string;minimumInvestment:number}>;
 budget?:{required:number;available:number};
 attributeMode?:'any';action?:'edit-martial-soul'|'contact-author'|'adjust-design'|'retry';
}
export interface RingRequirement {effectId:string;params:any;rawParams:any;skillIndex:number;branchId?:string;activation:string}
const clone=<T,>(v:T):T=>structuredClone(v);
const obj=(v:any)=>!!v&&typeof v==='object'&&!Array.isArray(v);
const core=rules.martialSoul,fx=rules.effects;
// Explicit semantic requirements, never a search over a player's prose or a skill name.
// An unknown model token is a generation error, not evidence of a missing engine feature.
export const unsupportedRingMechanisms=Object.freeze([
 {id:'mechanism.time-stop',name:'完整时间停止',description:'停止目标的时间流动及相关时间机制；不是仅禁止移动、行动或降低速度。',message:'目前还没有实现完整时间停止的底层效果，这个版本暂时无法制作。可以联系作者增加；你的构想已保留。'}
]);
export function declaredMechanismDiagnostics(value:any):RingDesignDiagnostic[]{
 if(value===undefined)return [];
 if(!Array.isArray(value)||value.length>8||new Set(value).size!==value.length)return [{kind:'generation',code:'mechanism-shape',message:'未支持机制清单的格式不完整，请修正原提案。',action:'retry'}];
 return value.map((id:any)=>{
  const known=unsupportedRingMechanisms.find(x=>x.id===id);
  return known?{kind:'unsupported',code:'unimplemented-mechanism',message:known.message,action:'contact-author'}:
   {kind:'generation',code:'unknown-mechanism',message:'这项机制尚未对应到登记目录，请先核对完整作用和可用节点；不能仅凭模型说法判定底层未实现。',action:'retry'};
 });
}
export function ringDiagnosticSummary(diagnostics:RingDesignDiagnostic[],pass=false){
 const status=pass?'ready':diagnostics.some(x=>x.kind==='unsupported')?'unsupported':diagnostics.some(x=>x.kind==='martial-soul')?'needs-martial-soul':diagnostics.some(x=>x.kind==='constraint'||x.kind==='source')?'blocked':'incomplete';
 return {status,message:pass?'完整来源与魂技已通过规则核验，可以采用。':diagnostics.map(x=>x.message).join('；')||'本次设计尚未完成，原构想已保留。'};
}
function candidateChannels(effectId:string,params:any):any[]{
 return (Object.values(core.CHANNEL_REGISTRY) as any[]).filter(c=>core.channelsForEffect({channels:[c]},effectId,params).length&&fx.channelAllowsParams(c,effectId,params))
  .sort((a,b)=>a.cost-b.cost||a.effectIds.length-b.effectIds.length||a.id.localeCompare(b.id));
}
/** Shared irredundant cover for opening soul and beast-source completion. */
export function openingChannelAdditions(existingIds:string[],requirements:RingRequirement[]){
 const covers=(id:string,row:RingRequirement)=>candidateChannels(row.effectId,row.params).some(c=>c.id===id);
 const remaining=requirements.filter(row=>!existingIds.some(id=>covers(id,row))),additions:string[]=[];
 let uncovered=[...remaining];
 while(uncovered.length){
  const candidates=(Object.values(core.CHANNEL_REGISTRY) as any[]).filter(c=>!existingIds.includes(c.id)&&!additions.includes(c.id)).map(c=>({c,count:uncovered.filter(row=>covers(c.id,row)).length})).filter(x=>x.count);
  candidates.sort((a,b)=>b.count/b.c.cost-a.count/a.c.cost||b.count-a.count||a.c.cost-b.c.cost||a.c.id.localeCompare(b.c.id));
  if(!candidates.length)throw Error(`没有覆盖「${fx.EFFECT_REGISTRY[uncovered[0].effectId].displayName}」参数的登记能力方向。`);
  const id=candidates[0].c.id;additions.push(id);uncovered=uncovered.filter(row=>!covers(id,row));
 }
 for(let i=additions.length-1;i>=0;i--){const kept=additions.filter((_,j)=>j!==i);if(remaining.every(row=>kept.some(id=>covers(id,row))))additions.splice(i,1);}
 return additions;
}
export function collectRingRequirements(skills:any[],soul:any):{requirements:RingRequirement[];diagnostics:RingDesignDiagnostic[]}{
 const diagnostics:RingDesignDiagnostic[]=[],requirements:RingRequirement[]=[];
 for(const [skillIndex,skill]of skills.entries()){
  let rows:any[];
  try{rows=fx.ringRequestEffectSpecs(skill);}catch(error){diagnostics.push({kind:'generation',code:'request-shape',skillIndex,message:String((error as Error).message),action:'retry'});continue;}
  if(rows.length>(skill.requestedBranches?.length?40:12)||new Set(rows.map(row=>row.branchId).filter(Boolean)).size>4||rows.some(row=>row.branchId&&rows.filter(other=>other.branchId===row.branchId).length>12)){
   diagnostics.push({kind:'constraint',code:'graph-size',skillIndex,message:'效果图超过现有节点或分支上限：线性最多12节点，最多4分支、每分支12节点、全图40节点。',action:'adjust-design'});continue;
  }
  for(const row of rows){
   const {effectId,params:rawParams,branchId,activation}=row,definition=fx.EFFECT_REGISTRY[effectId],meta={effectId,skillIndex,...(branchId?{branchId}:{})};
   if(!definition){diagnostics.push({kind:'generation',code:'unknown-effect',...meta,message:`提案中的效果「${String(effectId).slice(0,80)}」未匹配到效果，请重新核对该方案。`,action:'retry'});continue;}
   const base={...meta,effectName:definition.displayName};
   if(!obj(rawParams)){diagnostics.push({kind:'generation',code:'effect-parameters',...base,message:`「${definition.displayName}」的参数应为完整效果对象。`,action:'retry'});continue;}
   let invalid=false;
   for(const [key,value]of Object.entries(rawParams)){
    const bounds=definition.parameterBounds?.[key]??definition.optionalParameterBounds?.[key];
    if(!Array.isArray(bounds)){
     if(definition.structuredParameterBounds?.[key]){if(!fx.effectParameterAllowed(effectId,key,value,rawParams)){diagnostics.push({kind:'generation',code:'effect-parameters',...base,message:`「${definition.displayName}」的${key}格式或内容无效，请保留原意修正。`,action:'retry'});invalid=true;}continue;}
     if(!['领域阵营','限制'].includes(key)){diagnostics.push({kind:'generation',code:'unknown-parameter',...base,message:`「${definition.displayName}」没有登记参数「${key}」，请修正提案，不能静默丢弃要求。`,action:'retry'});invalid=true;}
     continue;
    }
    const numeric=bounds.length===2&&bounds.every((x:any)=>typeof x==='number');
    if(numeric&&(typeof value!=='number'||!Number.isFinite(value)||value<bounds[0]||value>bounds[1])){diagnostics.push({kind:'constraint',code:'parameter-range',...base,message:`「${definition.displayName}」的${key}须在${bounds[0]}至${bounds[1]}之间，不能自动降低或换档。`,action:'adjust-design'});invalid=true;}
    if(!numeric&&!bounds.includes(value)){diagnostics.push({kind:'constraint',code:'parameter-choice',...base,message:`「${definition.displayName}」的${key}没有登记「${String(value).slice(0,60)}」，可选值为：${bounds.join('、')}。请选择符合构想的取值。`,action:'adjust-design'});invalid=true;}
   }
   if(invalid)continue;
   try{
    const params=fx.soulEffectVariants(soul,effectId,rawParams,[])[0]??fx.normalizeEffectParams(effectId,rawParams,activation);
    requirements.push({...meta,params,rawParams:clone(rawParams),activation});
   }catch(error){diagnostics.push({kind:'generation',code:'effect-parameters',...base,message:`「${definition.displayName}」的参数尚未完整：${String((error as Error).message)}`,action:'retry'});}
  }
 }
 return {requirements,diagnostics};
}
export function diagnoseRingRequirements(context:any,requirements:RingRequirement[]):RingDesignDiagnostic[]{
 const expression=fx.ringExpressionForSource(context.soul,context.profile);
 const diagnostics:RingDesignDiagnostic[]=[],tier=rules.foundation.getAgeTier(context.profile.年限),compiled=expression.扩展?.结构化武魂??expression.结构化武魂??expression;
 for(const row of requirements){
  const {effectId,params,skillIndex,branchId}=row,definition=fx.EFFECT_REGISTRY[effectId],base={effectId,effectName:definition.displayName,skillIndex,...(branchId?{branchId}:{})};
  if(fx.TIER_RANK[tier.名称]<fx.TIER_RANK[definition.minimumAgeTier]||fx.MECHANISM_RANK[tier.机制上限]<fx.MECHANISM_RANK[definition.mechanismLevel])diagnostics.push({kind:'constraint',code:'age-mechanism',...base,message:`「${definition.displayName}」至少需要${definition.minimumAgeTier}魂环及${definition.mechanismLevel}机制，当前为${context.profile.年限}年（${tier.名称}，仅支持${tier.机制上限}机制）。`,action:'adjust-design'});
  if(!core.allowsEffect(expression,effectId,params)){
   const candidates=candidateChannels(effectId,params),ownedChannels=core.channelsForEffect(expression,effectId,params),ownedAttrs=compiled.attributes??[];
   const missingAttributes=core.allowsEffect({...compiled,channels:candidates},effectId,params)?[]:(Object.values(core.ATTRIBUTE_REGISTRY) as any[]).filter(a=>!ownedAttrs.some((x:any)=>x.id===a.id)&&core.allowsEffect({...compiled,attributes:[...ownedAttrs,{id:a.id}],channels:candidates},effectId,params)).map(a=>({id:a.id,name:a.name,minimumInvestment:a.minimumInvestment}));
   const missingChannels=ownedChannels.length?[]:candidates.map(c=>({id:c.id,name:c.name,cost:c.cost}));
   const parts=[missingChannels.length?`能力方向可选：${missingChannels.map(c=>c.name).join('、')}`:'',missingAttributes.length?`需补属性${missingAttributes.length>1?'之一':''}：${missingAttributes.map(a=>a.name).join('、')}`:''].filter(Boolean);
   diagnostics.push({kind:'martial-soul',code:'martial-soul-expression',...base,message:`武魂尚不能表达「${definition.displayName}」的要求${parts.length?'（'+parts.join('；')+'）':''}。请补充武魂能力后返回复验。`,missingChannels,missingAttributes,...(missingAttributes.length>1?{attributeMode:'any' as const}:{}),action:'edit-martial-soul'});
  }
  if(!context.opening){
   const sourceAllowed=core.allowsEffect(context.profile.血脉.compiled,effectId,params),bridges=fx.resolveBridges(context.soul,context.profile,context.beastSkills);
   const typed=(Object.values(core.ATTRIBUTE_REGISTRY) as any[]).some(a=>a.name===params.类型);
   if(typed&&!core.attributeDrawPool(expression,[...(context.profile.属性谱?.主属性??[]),...(context.profile.属性谱?.副属性??[])]).some((a:any)=>a.name===params.类型))diagnostics.push({kind:'source',code:'frozen-source-attribute',...base,message:`实际魂兽来源没有「${params.类型}」属性，不能凭空改成这种属性的${definition.displayName}。`,action:'adjust-design'});
   if(!sourceAllowed||!bridges.some((b:any)=>fx.bridgeSupportsParams(b,effectId,params)))diagnostics.push({kind:'source',code:sourceAllowed?'frozen-source-proof':'frozen-source-expression',...base,message:`实际魂环来源不能提供「${definition.displayName}」的这项要求；来源已确定，不能在讨论中改造。`,action:'adjust-design'});
  }
 }
 return diagnostics;
}
/** Keep declared themes and purchased choices. Add a deterministic irredundant
 * cover of the remaining exact effects, rather than all channels in the registry. */
export function completeOpeningRingSource(context:any,requirements:RingRequirement[]){
 const definition=context.profile.血脉.definition,previous=context.effectiveSource;
 // An automatic placeholder mirrors the whole soul, not a source the player
 // chose. Start a new source with only the capabilities this design needs.
 const source=previous?clone(previous):{name:context.profile.名称,description:context.profile.扩展?.描述??definition.concept??context.profile.名称,years:context.profile.年限,categories:clone(definition.categories),attributes:[],channels:['channel.melee']};
 const before=clone(source),soul=context.soul.扩展?.结构化武魂??context.soul.结构化武魂??context.soul;
 for(const row of requirements){
  const attrs=core.effectAttributeIds(row.effectId,row.params,[...source.attributes,...(soul.attributes??[]).map((a:any)=>a.id)]);
  for(const id of attrs)if(!source.attributes.includes(id))source.attributes.push(id);
 }
 if(!source.attributes.length)source.attributes=['attribute.life'];
 const additions=openingChannelAdditions([...source.channels,'channel.melee'],requirements);
 source.channels.push(...additions);
 // Keep the real source field limits and paid lineage pricing. Never raise
 // years, remove declared choices, or grant skill budget.
 if(source.attributes.length>5||source.channels.length>16)throw Error(`来源补齐需要${source.attributes.length}项属性与${source.channels.length}项方向，现有上限为5项属性、16项方向；已确认内容没有被删除，请决定调整方案。`);
 rules.backgroundHistory.normalizeDesigns([{ordinal:context.ordinal,source,sourceProofVersion:1}]);
 return {source,sourceProofVersion:1,addedChannels:source.channels.filter((id:string)=>!before.channels.includes(id)),addedAttributes:source.attributes.filter((id:string)=>!before.attributes.includes(id))};
}
