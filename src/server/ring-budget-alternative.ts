import {rules} from '../rules';

const same=(a:any,b:any)=>rules.abilities.hash(a??null)===rules.abilities.hash(b??null);
const durationKeys=new Set(['持续回合','持续分钟']);
const damageKeys=new Set(['骰数','骰面','加值']);

/** A separately offered lower specification, never an edit to a confirmed skill.
 * Scope, source, costs and node counts remain fixed. Only a small set of
 * monotone efficacy parameters may move toward their weaker bound. */
export function assertRingBudgetAlternative(before:any,after:any){
 if(!Array.isArray(before?.proposals)||!Array.isArray(after?.proposals)||before.proposals.length!==after.proposals.length)throw Error('预算备选必须保留原方案数量');
 const changes:Array<{proposal:number;skill:number;effectId:string;parameter:string;before:number;after:number}>=[];
 before.proposals.forEach((original:any,i:number)=>{
  const next=after.proposals[i];
  for(const field of ['source','sourceLocked','sourceProofVersion','acquisition','unsupportedMechanisms'])if(!same(original[field],next[field]))throw Error('预算备选不能改写原来源、年限或取得方式');
  if(!Array.isArray(original.skills)||!Array.isArray(next.skills)||original.skills.length!==next.skills.length)throw Error('预算备选不能增删魂技');
  original.skills.forEach((skill:any,j:number)=>{
   const candidate=next.skills[j];
   for(const field of ['exchangeContracts','requirements','resourceCosts','maintenanceCosts','castModes','defaultCastMode','usageRules','cooldownTurns'])if(!same(skill[field],candidate[field]))throw Error('预算备选不能改写代价、条件或次数');
   const branches=(value:any)=>(value.requestedBranches??[]).map(({nodes,requestedEffects,requestedEffectIds,...branch}:any)=>branch);
   if(!same(branches(skill),branches(candidate)))throw Error('预算备选不能改变分支用途');
   const prior=rules.effects.ringRequestEffectSpecs(skill),revised=rules.effects.ringRequestEffectSpecs(candidate);
   if(prior.length!==revised.length)throw Error('预算备选不能增删效果');
   const deferred=new Set<any>();
   const scope=(row:any)=>JSON.stringify([row.branchId??null,row.activation??'active']);
   for(const identity of new Set(prior.map(scope))){const branch=prior.filter((row:any)=>scope(row)===identity),immediate=rules.effects.immediateRequestSpecs(branch.map((row:any)=>[row.effectId,row.params]));for(const row of branch.slice(immediate.length))deferred.add(row);}
   prior.forEach((row:any,k:number)=>{
    const other=revised[k],definition=rules.effects.EFFECT_REGISTRY[row.effectId];
    if(row.effectId!==other.effectId||row.branchId!==other.branchId||row.activation!==other.activation)throw Error('预算备选不能替换效果、目标或分支');
    const a=rules.effects.normalizeEffectParams(row.effectId,row.params,row.activation),b=rules.effects.normalizeEffectParams(other.effectId,other.params,other.activation);
    for(const [params,normalized] of [[row.params??{},a],[other.params??{},b]])if(Object.entries(params).some(([key,value])=>!Object.hasOwn(normalized,key)||!same(value,normalized[key])))throw Error('预算备选必须使用合法的明确参数');
    if(!same(Object.keys(a).sort(),Object.keys(b).sort()))throw Error('预算备选不能改变参数结构');
    for(const key of Object.keys(a)){
     if(same(a[key],b[key]))continue;
     if(deferred.has(row))throw Error('预算备选不能改写延后触发的契约处罚');
     const duration=definition.family==='status'&&durationKeys.has(key),damage=row.effectId==='payload.damage'&&damageKeys.has(key),buff=row.effectId==='status.buff'&&key==='数值',accuracy=['check.physical_attack','check.soul_attack'].includes(row.effectId)&&key==='命中加值';
     const weaker=typeof a[key]==='number'&&typeof b[key]==='number'&&Number.isFinite(b[key])&&Math.abs(b[key])<=Math.abs(a[key])&&(b[key]===0||Math.sign(b[key])===Math.sign(a[key]));
     if(!(duration||damage||buff||accuracy)||!weaker||(damage||accuracy)&&(a[key]<0||b[key]<0)||duration&&b[key]<1)throw Error('预算备选只能降低明确的效能参数，不能增强或改换机制');
     changes.push({proposal:i,skill:j,effectId:row.effectId,parameter:key,before:a[key],after:b[key]});
    }
    if(rules.effects.calculateNodeCost(row.effectId,b)>rules.effects.calculateNodeCost(row.effectId,a))throw Error('预算备选不能提高任何一个效果的计价');
   });
  });
 });
 if(!changes.length)throw Error('预算备选没有作出实际取舍');
 return changes;
}
