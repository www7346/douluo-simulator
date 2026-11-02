import {rules} from '../rules';
import type {StoryPlan} from '../runtime/story-turns';
import {StoryPlanValidationError} from '../runtime/story-plan-validation-error';

/** Validate current immutable source selectors without executing future actions. */
export function validateStoryAbilitySelections(state:any,plan:StoryPlan){
 for(const [index,{action}] of plan.segments.entries()){
  if(!['use-field-ability','request-ability-use'].includes(action.kind))continue;
  const source=rules.combat.actionSkillContract(state,{type:'use-field-ability',actorId:state.角色?.主控单位ID,skillId:action.skillId});
  // A later acquisition has no current source to attest. Its real execution still
  // resolves ownership, parameters, conditions and payment after that acquisition.
  if(!source)continue;
  try{rules.abilities.describe(source,{modeId:action.modeId});rules.abilities.selectFieldBranches(source,action.branchIds);}
  catch(error){throw new StoryPlanValidationError(`能力选择不符合实际来源：${(error as Error).message}。modeId只能使用费用模式，branches中的用途id只填branchIds；没有费用模式时省略modeId。`,{
   instancePath:`/segments/${index}/action`,keyword:'ability-source-selection',submitted:{skillId:action.skillId,modeId:action.modeId??null,branchIds:action.branchIds??null},
   reference:{instancePath:'/fieldResources/skills',value:{skillId:source.id,modeIds:(source.castModes??[]).map((m:any)=>m.id),omittedParameters:source.castModes?.length?[]:['modeId'],defaultFieldSelection:{skillId:source.id,branchIds:rules.abilities.selectFieldBranches(source).map((b:any)=>b.id),...(source.defaultCastMode?{modeId:source.defaultCastMode}:{})},branchIds:rules.abilities.fieldBranches(source.effectGraph,{indivisible:!!source.medicine||source.sourceKind==='consumable'}).map((b:any)=>b.id)}},
  });}
 }
}
