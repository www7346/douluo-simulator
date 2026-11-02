/** Formal source-based structures for the optional exchange editor. */
import {rules} from '../rules';
import {abilityPresentation} from '../runtime/ability-presentation';
const copy = <T,>(v:T):T => structuredClone(v);
const costKeys = ['exchangeContracts','requirements','resourceCosts','maintenanceCosts','castModes','defaultCastMode','usageRules','cooldownTurns'] as const;

function branchShape(skill:any) {
  return rules.effects.graphBranches(skill.effectGraph).map((b:any) => ({
    id:b.id,label:b.label,activation:b.activation,optional:b.optional,
    priority:b.priority,targetPolicy:b.targetPolicy,
    requestedEffects:b.nodes.map((n:any) => [n.effectId,copy(n.params)]),
  }));
}
export function compiledPackageRequests(compiled:any) {
  return compiled.skills.map((skill:any) => ({
    name:skill.name,strictEffects:true,autoAllocate:false,requestedBranches:branchShape(skill),
    ...Object.fromEntries(costKeys.filter(k=>skill[k]!==undefined).map(k=>[k,copy(skill[k])])),
  }));
}

function proposeGenerationPlans(state:any,kind:'ring.item'|'ring.beast',input:any,quote:any) {
 if(!quote.pass||quote.pendingId)return {generationPlans:[],generationPlanReasons:[],compileCalls:0};
 const profile:any=kind==='ring.item'?quote.source:Object.values(state.魂兽档案.列表).find((p:any)=>p.单位ID===quote.beastUnitId),soul=state.武魂.列表[quote.martialSoulId??input.martialSoulId];
 if(!profile||!soul)return {generationPlans:[],generationPlanReasons:['请先选择魂环与归属武魂'],compileCalls:0};
 const beastSkills=(state.战斗单位.列表[profile.单位ID]?.能力?.技能ID??[]).map((id:string)=>state.技能.列表[id]).filter(Boolean);
 const context={martialSoul:soul,beastProfile:profile,beastSkills,ringOrdinal:kind==='ring.item'?quote.eligibility.nextOrdinal:quote.ordinal};
 const bridges=rules.effects.resolveBridges(soul,profile,beastSkills),tier=rules.foundation.getAgeTier(profile.年限),effects=rules.effects.EFFECT_REGISTRY;
 const supported=[...new Set<string>(bridges.flatMap((b:any)=>b.effectIds))].filter(id=>effects[id]&&rules.effects.TIER_RANK[tier.名称]>=rules.effects.TIER_RANK[effects[id].minimumAgeTier]&&rules.effects.MECHANISM_RANK[tier.机制上限]>=rules.effects.MECHANISM_RANK[effects[id].mechanismLevel]);
 const variants=(id:string)=> {
   const types=effects[id].parameterBounds?.类型;
   const sources=Array.isArray(types)?profile.属性谱.主属性.filter((t:string)=>types.includes(t)).map((类型:string)=>({类型})):[{}];
   return sources.flatMap((raw:any)=>rules.effects.soulEffectVariants(soul,id,raw,bridges));
 };
 const defensive=new Set(['status.resistance_shift','status.status_guard']);
 const passive=supported.filter(id=>defensive.has(id)).flatMap(id=>variants(id).filter((p:any)=>p.模式!=='易伤').map((p:any)=>{
   const params=copy(p);delete params.持续回合;
   const b={label:effects[id].displayName,activation:'passive',optional:false,requestedEffects:[[id,params]]};
   return {branch:b,cost:rules.effects.minimumDirectedCost([b])};
 })).sort((a,b)=>a.cost-b.cost);
 const releases=['release.touch','release.melee','release.projectile'].flatMap(id=>rules.effects.soulEffectVariants(soul,id,{},bridges).map((params:any)=>[id,params]));
 const checks=['check.physical_attack','check.soul_attack','check.save'].flatMap(id=>rules.effects.soulEffectVariants(soul,id,{},bridges).map((params:any)=>[id,params]));
 const active=supported.filter(id=>!defensive.has(id)&&!id.startsWith('passive.')&&!['release','targeting','check'].includes(effects[id].family)&&effects[id].placement!=='action.before-check').flatMap(id=>variants(id).flatMap((params:any)=>{
   const beneficial=rules.effects.effectPolarity(id,params)==='beneficial';
   if(!beneficial&&(!releases.length||!checks.length))return [];
   const b={label:effects[id].displayName,activation:'active',optional:false,targetPolicy:beneficial?'self':'enemy',requestedEffects:[...(beneficial?[]:[releases[0],checks[0]]),[id,params]]};
   try{return [{branch:b,cost:rules.effects.minimumDirectedCost([b])}];}catch{return [];}
 })).sort((a,b)=>a.cost-b.cost);
 const requests:any[]=[];
 if(active[0])requests.push({preferredSkillCount:1,autoAllocate:false,requestedBranches:[active[0].branch]});
 if(passive[0])requests.push({preferredSkillCount:1,autoAllocate:false,requestedBranches:[passive[0].branch]});
 if(active[0]&&passive[0])requests.push({preferredSkillCount:1,autoAllocate:false,requestedBranches:[active[0].branch,passive[0].branch]});
 const plans:any[]=[],reasons:string[]=[],seen=new Set<string>();let calls=0;
 const shape=(p:any)=>compiledPackageRequests(p);
 function tryPlan(options:any) {
   if(calls>6)return;
   try {
     calls++;const base=rules.effects.compileRingSkills({...context,options:{compatibility:quote.compatibility.ratio,allowProceduralFallback:false,...options}}),requestedSkills=shape(base);
     calls++;const rebuilt=rules.effects.compileRingSkills({...context,options:{compatibility:quote.compatibility.ratio,requestedSkills,preferredSkillCount:requestedSkills.length,allowProceduralFallback:false,autoAllocate:false}});
     for(const skill of rebuilt.skills)for(const branch of rules.effects.graphBranches(skill.effectGraph)){
       const payloads=branch.nodes.filter((n:any)=>!['release','targeting','check','sustain'].includes(effects[n.effectId]?.family));
       if(branch.targetPolicy==='self'&&payloads.length&&payloads.every((n:any)=>rules.effects.effectPolarity(n.effectId,n.params)==='harmful'))throw Error('自动领悟不采用只会伤害自身的收益方案');
     }
     if(JSON.stringify(shape(base))!==JSON.stringify(shape(rebuilt))||base.budget.spent!==rebuilt.budget.spent)throw Error('这套领悟方向尚未通过完整核对');
     const fingerprint=rules.effects.ringSkillPackageFingerprint(rebuilt);if(seen.has(fingerprint))return;seen.add(fingerprint);
     const branchChoices=rebuilt.skills.flatMap((skill:any,skillIndex:number)=>{
       const raw=rules.effects.rawAbilityValue(skill.effectGraph);
       return rules.effects.graphBranches(skill.effectGraph).map((b:any)=>({skillIndex,branchId:b.id,label:b.label,activation:b.activation,optional:b.optional,targetPolicy:b.targetPolicy,rawValue:raw.nodes.filter((n:any)=>n.branchId===b.id).reduce((sum:number,n:any)=>sum+n.rawValue,0)}));
     });
     const kinds=new Set(branchChoices.map((b:any)=>b.activation));
     plans.push({id:'ring-plan:'+rules.abilities.hash({fingerprint}),fingerprint,label:rebuilt.skills.map((s:any)=>s.name).join('、'),activation:kinds.size>1?'hybrid':branchChoices[0]?.activation??'active',requestedSkills,branchChoices,budget:copy(rebuilt.budget),skills:copy(rebuilt.skills)});
   }catch(error:any){if(!reasons.includes(error.message))reasons.push(error.message);}
 }
 for(const request of requests)if(plans.length<3)tryPlan(request);
 for(let offset=0;calls<=6&&plans.length<3;offset++)tryPlan({proceduralVariantOffset:offset,allowProceduralFallback:true});
 return {generationPlans:plans,generationPlanReasons:reasons,compileCalls:calls};
}

const cache=new Map<string,ReturnType<typeof proposeGenerationPlans>>();
/** A read-only post-absorption projection uses the actual release rules. */
export function ringPackagePresentation(state:any,soul:any,compiled:any,ordinal:number){
 const ids=[...(soul.魂环ID列表??[])];
 while(ids.length<ordinal)ids.push(`ring-preview-${ids.length+1}`);
 const projected={...state,武魂:{...state.武魂,列表:{...state.武魂.列表,[soul.id]:{...soul,魂环ID列表:ids}}}};
 const skills=compiled.skills.map((original:any)=>{
   const skill={...copy(original),sourceMartialSoulId:soul.id,来源武魂ID:soul.id,持有者单位ID:soul.持有者单位ID};
   return {...skill,displayInfo:abilityPresentation(skill,projected)};
 });
 const effects=[...new Set<string>(skills.flatMap((s:any)=>s.displayInfo.primary.map((p:any)=>p.name)))];
 return {skills,label:effects.join('、')||compiled.label,summary:skills.flatMap((s:any)=>s.displayInfo.primary.map((p:any)=>`${p.name}${p.values.length?'：'+p.values.join('，'):''}`)).join('；')};
}
export function ringExchangeOptions(state:any,input:Record<string,any>){
 if(Object.keys(input).some(k=>!['itemId','beastUnitId','martialSoulId','requestedSkills'].includes(k))||(!!input.itemId===!!input.beastUnitId)||typeof input.martialSoulId!=='string')throw Error('请选择实际魂环来源与武魂');
 const kind=input.itemId?'ring.item':'ring.beast',request=Object.fromEntries(Object.entries(input).filter(([k])=>['itemId','beastUnitId','martialSoulId'].includes(k)&&k!==(input.itemId?'beastUnitId':'itemId')));
 const quote=input.itemId?rules.cycle.previewRingItem(state,request):rules.expedition.previewRingChoice(state,request);
 if(!quote.pass)return {generationPlans:[],generationPlanReasons:quote.reasons??['这枚魂环目前无法领悟']};
 const profile=input.itemId?quote.source:(Object.values(state.魂兽档案.列表) as any[]).find(p=>p.单位ID===quote.beastUnitId);
 const soul=state.武魂.列表[quote.martialSoulId??input.martialSoulId];
 const skillIds=state.战斗单位.列表[profile?.单位ID]?.能力?.技能ID??[];
 const key=rules.abilities.hash({kind,request,profile,soul,quote,skills:skillIds.map((id:string)=>state.技能.列表[id])});
 let result=cache.get(key);if(!result){result=proposeGenerationPlans(state,kind,input,quote);if(cache.size>=24)cache.delete(cache.keys().next().value!);cache.set(key,result);}
 const ordinal=input.itemId?quote.eligibility.nextOrdinal:quote.ordinal;
 const presented={...copy(result),generationPlans:result.generationPlans.map((p:any)=>({...copy(p),...ringPackagePresentation(state,soul,p,ordinal)}))};
 if(input.requestedSkills!==undefined){
   if(!Array.isArray(input.requestedSkills)||!input.requestedSkills.length||input.requestedSkills.length>4)throw Error('请选择完整的魂技设计');
   const beastSkills=skillIds.map((id:string)=>state.技能.列表[id]).filter(Boolean);
   const compiled=rules.effects.compileRingSkills({martialSoul:soul,beastProfile:profile,beastSkills,ringOrdinal:ordinal,options:{compatibility:quote.compatibility.ratio,requestedSkills:input.requestedSkills,preferredSkillCount:input.requestedSkills.length,autoAllocate:false,allowProceduralFallback:false}});
   return {...presented,requestedPreview:{...ringPackagePresentation(state,soul,compiled,ordinal),budget:copy(compiled.budget)}};
 }
 return presented;
}
