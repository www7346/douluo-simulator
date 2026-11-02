import {rules} from '../rules';
import {designAdviceIntentValue} from './design-advice-wire';
import {assertDesignRepairNodeEnvelope,requiredStructureCorrections} from './design-advice-mechanics';

const object=(value:any)=>!!value&&typeof value==='object'&&!Array.isArray(value);
const same=(a:any,b:any)=>a===undefined||b===undefined?a===b:rules.abilities.hash(a)===rules.abilities.hash(b);
const clone=(value:any)=>structuredClone(value);

/** A repair fixes invalid structure; legal mechanics are held by code, not model assurances. */
export function assertResearchRepairPreservesLegal(initial:any,repaired:any,correctDependencies=false):void {
 if(repaired?.mode==='question')return;
 const before=clone(designAdviceIntentValue(initial)?.design?.definition),after=repaired?.design?.definition;
 if(!object(before)||!object(after))throw Error('结构修复缺少可核对的原机械定义，不能凭空新增能力');
 if(correctDependencies&&Array.isArray(before.requestedBranches))for(const branch of before.requestedBranches){if(Array.isArray(branch.nodes)){const corrected=requiredStructureCorrections(branch.nodes.map((raw:any)=>({effectId:Array.isArray(raw)?raw[0]:raw?.effectId,params:Array.isArray(raw)?raw[1]:raw?.params,branchId:branch.id,activation:branch.activation})));if(corrected.changes.length)branch.nodes=corrected.rows.map(row=>[row.effectId,row.params]);}}
 const preserve=(key:string,value:any)=>{if(!same(value,after[key]))throw Error('结构修复必须保留原设计已合法的参数或消耗：'+key);};
 const forms=rules.foundation.EQUIPMENT_AFFIXES;
 if(before.modifiers===undefined&&Object.values(after.modifiers?.attributes??{}).some(Boolean))throw Error('结构修复不能新增原无的装备六维加成');
 for(const key of ['host','restraint'])if(before[key]===undefined&&after[key]!==undefined)throw Error('结构修复不能新增原无的机械定义：'+key);
 if(forms.FORMS.some((form:any)=>form.id===before.fixedFormId))preserve('fixedFormId',before.fixedFormId);
 if(['自动',...new Set(forms.FORMS.map((form:any)=>form.kind))].includes(before.equipmentKind))preserve('equipmentKind',before.equipmentKind);
 if(['攻击','防御','辅助','移动','侦测'].includes(before.deviceCategory))preserve('deviceCategory',before.deviceCategory);
 if(object(before.modifiers)){
  let valid=false;try{forms.priceAttributes(before.modifiers.attributes??{});valid=true;}catch{}
  if(valid){if(Object.keys(before.modifiers).every(key=>key==='attributes'))preserve('modifiers',before.modifiers);
   else if(!same(before.modifiers.attributes??{},after.modifiers?.attributes??{}))throw Error('结构修复必须保留原设计已合法的六维加成');}
 }
 const base:any={id:'research-design-repair-probe',sourceKind:'soul-device',soulPowerCost:0,requirements:[]};
 for(const key of ['soulPowerCost','cooldownTurns','requirements','resourceCosts','maintenanceCosts','usageRules','outputScale','nativeCastRank','minimumCastRank','soulPowerCostRate']){
  if(before[key]!==undefined&&rules.abilities.validate({...base,[key]:clone(before[key])}).pass)preserve(key,before[key]);
 }
 if(Number.isSafeInteger(before.durabilityCost)&&before.durabilityCost>=0&&before.durabilityCost<=100)preserve('durabilityCost',before.durabilityCost);
 if(before.medicine!==undefined&&rules.abilities.validate({...base,sourceKind:'consumable',requirements:before.requirements??[],medicine:before.medicine}).pass)preserve('medicine',before.medicine);
 if(before.castModes!==undefined||before.defaultCastMode!==undefined){
  const declaration={castModes:before.castModes??[],...(before.defaultCastMode!==undefined?{defaultCastMode:before.defaultCastMode}:{})};
  if(rules.abilities.validate({...base,requirements:before.requirements??[],resourceCosts:before.resourceCosts??[],...declaration}).pass)for(const key of ['castModes','defaultCastMode'])if(before[key]!==undefined)preserve(key,before[key]);
 }
 for(const key of ['ageTier','mechanismCap']){
  const allowed=key==='ageTier'?['十年','百年','千年','万年','十万年','百万年']:['基础','进阶','强力','规则','神话'];
  if(allowed.includes(before[key]))preserve(key,before[key]);
 }
 if(before.host!==undefined){let valid=false;try{rules.host.normalize(before.host);valid=true;}catch{}if(valid)preserve('host',before.host);else if(!same(before.host,after.host))throw Error('结构修复无法可信核验原host定义，不能改写该整套能力');}
 if(before.restraint!==undefined){let valid=false;try{rules.backgroundRestraints.compile({...before.restraint,name:'结构修复验收',description:'中性器具',appearance:'素色器具'});valid=true;}catch{}if(valid)preserve('restraint',before.restraint);else if(!same(before.restraint,after.restraint))throw Error('结构修复无法可信核验原restraint定义，不能改写该整套能力');}
 if(!Array.isArray(before.requestedBranches)){
  if(after.requestedBranches?.length)throw Error('结构修复不能新增原无的效果分支');
  return;
 }
 if(!Array.isArray(after.requestedBranches)||after.requestedBranches.length!==before.requestedBranches.length||after.requestedBranches.some((branch:any)=>!before.requestedBranches.some((prior:any)=>prior?.id===branch?.id&&prior?.activation===branch?.activation)))throw Error('结构修复不能新增或删掉原效果分支');
 const rows=(branches:any[])=>branches.flatMap(branch=>Array.isArray(branch?.nodes)?branch.nodes.map((raw:any)=>({effectId:Array.isArray(raw)?raw[0]:raw?.effectId,params:Array.isArray(raw)?raw[1]:raw?.params,branchId:branch.id,activation:branch.activation})):[]);
 assertDesignRepairNodeEnvelope(rows(before.requestedBranches),rows(after.requestedBranches));
 const ids=before.requestedBranches.map((b:any)=>b?.id);
 for(const branch of before.requestedBranches){
  if(!object(branch)||typeof branch.id!=='string'||!/^[-a-zA-Z0-9_]+$/.test(branch.id)||ids.filter((id:any)=>id===branch.id).length!==1||!['active','passive'].includes(branch.activation)||!Array.isArray(branch.nodes))continue;
  const pins:any[]=[];
  for(const raw of branch.nodes){
   const effectId=Array.isArray(raw)?raw[0]:raw?.effectId,params=Array.isArray(raw)?raw[1]:raw?.params;
   if(typeof effectId!=='string'||!rules.effects.EFFECT_REGISTRY[effectId]||!object(params))continue;
   const legal=Object.fromEntries(Object.entries(params).filter(([key,value])=>rules.effects.effectParameterAllowed(effectId,key,value,params)));
   let normalized:any;try{normalized=rules.effects.normalizeEffectParams(effectId,params,branch.activation);}catch{}
   const complete=normalized&&Object.entries(params).every(([key,value])=>Object.hasOwn(normalized,key)&&same(value,normalized[key]));
   pins.push({effectId,params:complete?normalized:legal,partial:!complete});
  }
  if(!pins.length)continue;
  const candidates=after.requestedBranches?.filter((b:any)=>b?.id===branch.id)??[];
  if(candidates.length!==1||candidates[0].activation!==branch.activation)throw Error('结构修复必须保留原设计已合法的效果分支：'+branch.id);
  let actual:any[]=[];try{actual=rules.effects.graphBranches(rules.effects.makeBranchedGraph([candidates[0]]))[0].nodes;}catch{throw Error('结构修复未保留可读取的效果分支：'+branch.id);}
  let cursor=0;
  for(const pin of pins){const index=actual.findIndex((node:any,index:number)=>index>=cursor&&node.effectId===pin.effectId&&(pin.partial?Object.entries(pin.params).every(([key,value])=>same(value,node.params[key])):same(node.params,pin.params)));if(index<0)throw Error('结构修复必须保留原设计已合法的效果及参数：'+pin.effectId);cursor=index+1;}
 }
}
