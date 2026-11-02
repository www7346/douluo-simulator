import {rules} from '../rules';
import type {RingRequirement,RingDesignDiagnostic} from './ring-design-requirements';

// calculateRingBudget reaches its maximum progress at ten million years.
// Larger ages cannot buy more budget and must not cause an unbounded search.
const SATURATED_YEARS=10_000_000;
export function fitOpeningRingYears({context,requirements,skillCount,requiredBudget=0,locked=false,rebuild,compile}:{
 context:any;requirements:RingRequirement[];skillCount:number;requiredBudget?:number;locked?:boolean;
 rebuild:(years:number)=>any;compile:(context:any)=>any;
}):any{
 const before=context.profile.年限,maximumYears=Math.max(before,SATURATED_YEARS);
 const quote=(years:number)=>rules.effects.calculateRingBudget({...context.profile,年限:years},context.soul,context.compatibility.ratio).usable;
 const maximumBudget=quote(maximumYears),beforeBudget=quote(before);
 const adjustment=(years:number,applied=false)=>({beforeYears:before,years,beforeBudget,availableBudget:quote(years),requiredBudget,maximumBudget,applied});
 const blocked=(code:string,message:string,years=before,kind='constraint')=>({
  diagnostic:{kind,code,message,action:'adjust-design'} as RingDesignDiagnostic,adjustment:adjustment(years)
 });
 const eligible=(years:number)=>{
  const tier=rules.foundation.getAgeTier(years);
  return rules.effects.ringSkillLimit(years)>=skillCount&&requirements.every(row=>{
   const effect=rules.effects.EFFECT_REGISTRY[row.effectId];
   return rules.effects.TIER_RANK[tier.名称]>=rules.effects.TIER_RANK[effect.minimumAgeTier]&&rules.effects.MECHANISM_RANK[tier.机制上限]>=rules.effects.MECHANISM_RANK[effect.mechanismLevel];
  });
 };
 if(requiredBudget>maximumBudget)return blocked('year-budget-ceiling',`保留完整效果需要至少${requiredBudget}点；现有年限预算最多提供${maximumBudget}点，继续提高年限也无法容纳。原效果未被降低。`,maximumYears);
 for(const tier of rules.foundation.AGE_TIERS){
  const lower=Math.max(before,tier.最小),upper=Math.min(maximumYears,tier.最大);
  if(lower>upper||!eligible(lower))continue;
  // Search only the monotone budget inside one tier. Compilation itself is
  // not monotone across tiers: skill counts and minimum quality also change.
  for(let attempt=0;attempt<=skillCount+1;attempt++){
   if(quote(upper)<requiredBudget)break;
   let lo=lower,hi=upper;
   while(lo<hi){const middle=lo+Math.floor((hi-lo)/2);if(quote(middle)>=requiredBudget)hi=middle;else lo=middle+1;}
   const years=lo;
   if(locked)return blocked('source-year-locked',`保留完整效果需将魂环年限从${before}年提高到至少${years}年；当前来源已固定，请允许调整来源后重新核验。`,years,'source');
   let next:any;
   try{next=rebuild(years);}catch(error){
    return blocked('year-capacity',`保留完整效果需将魂环年限从${before}年提高到至少${years}年；${String((error as Error).message)}。未自动改成神赐或献祭，也未降低效果。`,years);
   }
   try{return {context:next,compiled:compile(next),adjustment:adjustment(years,true)};}catch(error){
    const required=(error as any)?.ringBudget?.required;
    if(Number.isFinite(required)&&required>requiredBudget){requiredBudget=required;if(requiredBudget>maximumBudget)return blocked('year-budget-ceiling',`保留完整效果需要至少${requiredBudget}点；现有年限预算最多提供${maximumBudget}点，继续提高年限也无法容纳。原效果未被降低。`,maximumYears);continue;}
    // Quality, source, execution and parameter failures are not permission to
    // weaken a request or to keep searching arbitrary ages.
    throw error;
   }
  }
 }
 return blocked('year-budget-ceiling',`现有年限规则无法容纳这套完整魂技，最高可用${maximumBudget}点；原效果、费用和次数均保留。`,maximumYears);
}
