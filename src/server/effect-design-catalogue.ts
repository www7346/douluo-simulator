import {rules} from '../rules';
import {effectProse} from '../runtime/effect-prose';

/** The authoring view includes executable dependency metadata, not just nodes. */
export function effectDesignEntry(id:string,entry:any){
 const params=rules.effects.normalizeEffectParams(id,entry.parameterDefaults??{});
 const description=effectProse(id,params,'',{}).join('；')||[entry.displayName,entry.duration,entry.stacking,entry.cleanup].filter(Boolean).join('；');
 return {id,name:entry.displayName,description,exampleParameters:params,family:entry.family,baseCost:entry.baseCost,minimumAgeTier:entry.minimumAgeTier,mechanismLevel:entry.mechanismLevel,
  parameterDefaults:entry.parameterDefaults,parameterBounds:entry.parameterBounds,
  ...Object.fromEntries(['optionalParameterBounds','structuredParameterBounds','placement','hitRule','requires','conflicts','requiresExplicitParameters','allowedContexts','authorable'].filter(key=>entry[key]!==undefined).map(key=>[key,entry[key]]))};
}

// Only share the same named parameter when both its bounds and its declared
// default match. A variant stays on the effect that owns it.
function shareEffectParameters(rows:Record<string,any>[]){
 const counts=new Map<string,Map<string,number>>();
 function definition(row:Record<string,any>,name:string){
  const bounds=row.parameterBounds[name],value=row.parameterDefaults?.[name];
  return value===undefined?{bounds}:{bounds,default:value};
 }
 for(const row of rows)for(const name of Object.keys(row.parameterBounds??{})){
  const signature=JSON.stringify(definition(row,name));
  let variants=counts.get(name);
  if(!variants){variants=new Map();counts.set(name,variants);}
  variants.set(signature,(variants.get(signature)??0)+1);
 }
 const shared=new Map<string,string>();
 for(const [name,variants] of counts){
  const [signature,count]=[...variants].sort((a,b)=>b[1]-a[1])[0];
  if(count>=3&&(count-1)*Buffer.byteLength(signature)>80)shared.set(name,signature);
 }
 const commonParameters=Object.fromEntries([...shared].map(([name,signature])=>[name,JSON.parse(signature)]));
 const effects=rows.map<Record<string,any>>(row=>{
  const names=Object.keys(row.parameterBounds??{}).filter(name=>
   shared.has(name)&&shared.get(name)===JSON.stringify(definition(row,name)));
  if(!names.length)return {...row};
  const parameterBounds={...row.parameterBounds},parameterDefaults={...row.parameterDefaults};
  for(const name of names){delete parameterBounds[name];delete parameterDefaults[name];}
  return {...row,parameterBounds,...(row.parameterDefaults?{parameterDefaults}:{}),useParameters:names};
 });
 return {effects,commonParameters};
}

/** Keep effect names and IDs on every row. Frequent fields have one named default
 * in the model packet, with every exception still attached to its own effect. */
export function designPromptCatalogue(catalogue:{effects:Record<string,any>[];compositionRules:{contracts:unknown};contractDesign?:unknown;templates?:Record<string,any>[]},customPrompt:boolean){
 // Player-facing examples repeat parameter data; the model already receives
 // the full authoritative bounds and defaults below.
 catalogue={...catalogue,effects:catalogue.effects.map(({description,exampleParameters,...effect})=>effect)};
 if(customPrompt||catalogue.effects.length<2)return catalogue;
 const defaults:Record<string,unknown>={}, {effects,commonParameters}=shareEffectParameters(catalogue.effects);
 for(const key of Object.keys(effects[0])){
  if(['id','name','family','useParameters'].includes(key)||effects.some(row=>row[key]===undefined))continue;
  const counts=new Map<string,number>(),values=effects.map(row=>JSON.stringify(row[key]));
  for(const value of values)counts.set(value,(counts.get(value)??0)+1);
  const common=values.find(value=>(counts.get(value)??0)>effects.length/2);
  if(common===undefined)continue;
  defaults[key]=effects[values.indexOf(common)][key];
  for(const [index,row] of effects.entries())if(values[index]===common)delete row[key];
 }
 const {contractDesign,templates,...rest}=catalogue;
 // Workshop templates carry a full reusable design. Refer to its fields when every
 // template has exactly the same data on the outside as on the inside.
 const fieldsFromDesign=templates?.length
  ? Object.keys(templates[0]).filter(key=>key!=='id'&&key!=='design'&&templates.every(row=>
    row[key]!==undefined&&JSON.stringify(row[key])===JSON.stringify(row.design?.[key]))):[];
 const templatePacket=templates?{
  templates:templates.map(row=>Object.fromEntries(Object.entries(row).filter(([key])=>!fieldsFromDesign.includes(key)))),
  templateFieldsFromDesign:fieldsFromDesign
 }:{};
 const sharedContract=contractDesign!==undefined&&JSON.stringify(contractDesign)===JSON.stringify(catalogue.compositionRules.contracts);
 return {...rest,...templatePacket,...(contractDesign!==undefined&&!sharedContract?{contractDesign}:{}),effects,effectDefaults:defaults,...(Object.keys(commonParameters).length?{commonParameters}:{}),
  catalogueGuide:'读取每项效果时先取 effectDefaults，再以该项自己列出的字段覆盖同名默认值。'+(Object.keys(commonParameters).length?'本行 useParameters 列出的参数采用 commonParameters 中同名的 bounds 和 default（如有），分别补入 parameterBounds 和 parameterDefaults。其余参数按本行读取。':'')+(sharedContract?'契约的详细协议见 compositionRules.contracts。':'')+(fieldsFromDesign.length?'模板中 templateFieldsFromDesign 列出的字段都在该模板的 design 中。':'')};
}

/** Cross-node conditions describe the same graph contracts used by the compiler. */
export function effectCompositionRules(){
 return {
  balance:{maximumSustainedReduction:rules.effects.DESIGN_BALANCE_POLICY.maximumSustainedReduction,directDeathRequiresSave:true,reusableDeathRequiresBothCostAndLimit:true,freeUnlimitedDefenseForbidden:true,unspentBudgetAllowed:true},
  graphLimits:{linearNodes:12,branches:4,nodesPerBranch:12,totalNodes:40},
  sameBranchDependencies:true,
  registeredDependencies:Object.entries(rules.effects.EFFECT_REGISTRY).flatMap(([id,e]:[string,any])=>(e.requires??[]).map((required:string)=>({effectId:id,requires:required}))),
  approach:{effect:'move.approach',release:'release.touch',target:'target.single',targetCount:1,normalCheck:true,placement:'before-check',excludedFamilies:['domain','zone','summon'],maximumPerAbility:1,preCastContactRequirementForbidden:true,contactTiming:'contact是施放前已经接触目标；release.touch是本行动接触后命中。先追击后触及的设计使用release.touch，不能再添加contact前提；保留正常手部动作、身体动作、魂力、耐久等真实条件和费用。'},
  requirements:Object.fromEntries(rules.abilities.REQUIREMENTS.map((id:string)=>[id,{label:rules.abilities.LABELS[id],timing:'before-action'}])),
  domain:{effect:'domain.field',maximumPerAbility:1,minimumChildCount:1,childFamilies:['payload','status','movement'],explicitChildParameter:{领域阵营:['敌方','友方','所有']},excludes:['transform.martial_avatar']},
  avatar:{effect:'transform.martial_avatar',target:'target.self',maximumPerAbility:1,excludes:['domain.field']},
  resourceDamage:{effects:['payload.stack_confluence','payload.resource_damage'],target:'target.single',targetCount:1,resourceAttackChecks:['check.physical_attack','check.soul_attack'],attackCheckEffects:['payload.resource_damage'],conditionalAttackCheck:{effect:'status.next_check_penalty',when:{命中后抵抗:true}},minimumLayerParameter:'最低层数',maximumLayerParameter:'最大计入层数',minimumNotGreaterThanMaximum:true,endstateRequires:'payload.resource_damage'},
  containment:{effects:['realm.store','realm.capture'],maximumPerBranch:1,excludedFamilies:['domain','zone','summon']},
  selfBenefit:{pureBeneficialSelfTargetExcludes:['check.physical_attack','check.soul_attack']},
  inlineHit:{effects:Object.entries(rules.effects.EFFECT_REGISTRY).filter(([,e]:[string,any])=>e.hitRule?.inline).map(([id])=>id),sameBranchAnyCheck:['check.physical_attack','check.soul_attack'],sameBranchAnyPayload:['payload.damage','payload.drain','payload.resource_damage'],graze:{effect:'modifier.miss_graze',requiresPayload:'payload.damage'}},
  passive:{allowedEffects:['status.battle_resource','status.resistance_shift','status.status_guard','passive.equipment_stat','passive.element_amplify'],forbiddenMode:'易伤',forbiddenParameters:['持续回合'],requiredPassive:['status.battle_resource'],requiredPassivePrefixes:['passive.'],abilityUniqueSlot:{effect:'status.battle_resource',parameter:'资源槽'},nonEquipmentDuplicateKey:['effectId','类型??防护对象??属性']},
  worldPersistence:{effects:[...rules.controls.PERSISTENT_STATUS_IDS],nonRoundRequiresCanPersist:true,buffWorldAttributes:['力量','身法','体魄','悟性','感知','意志'],buffWorldNonzero:true,sourceValidRequiresDependencyOtherThan:'独立',nonRoundExcludesGraphEffects:['sustain.maintain'],nonRoundExcludesGraphFamilies:['domain'],gradualCognition:{effect:'status.cognition_shift',when:{改造方式:'渐进'},forbiddenDuration:'回合'}},
  summonInheritance:{effect:'summon.entity',optionalParametersRequiringTrueInheritance:['魂力分配','继承环序上限','继承技能ID','离散缩放'],inheritedSkillCountMaximumParameter:'技能继承数量',explicitSoulPowerRequiresPercentage:0},
  longDuration:{effect:'modifier.world_duration',mustImmediatelyPrecede:{effects:['contract.oath','realm.store'],persistentStatusesWithWorldMinutes:rules.controls.PERSISTENT_STATUS_IDS.filter((id:string)=>!['status.poison','status.regeneration'].includes(id))},minutesMinimum:10081,minutesMaximum:rules.effects.WORLD_DURATION_MAX,modifierMinutesAtLeastTargetMinutes:true},
  medicine:{forbiddenEffects:['realm.store','realm.capture','contract.oath']},
  contracts:rules.effects.contractDesignGrammar(),
 };
}
