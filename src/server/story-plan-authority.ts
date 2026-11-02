import {promptMessage,promptDataMessage} from '../runtime/model-prompt-templates';
import type {ChatMessage,ModelGateway} from '../runtime/model-gateway';
import type {ModelRecoveryBudget} from '../runtime/model-recovery-budget';
import type {StoryPlan} from '../runtime/story-turns';
import {StoryPlanValidationError} from '../runtime/story-plan-validation-error';
import type {ModelJsonSchema} from '../shared/model-json-schema';
import {ModelProposalValidationError} from '../shared/model-proposal-validation-error';

export const STORY_PLAN_AUTHORITY_VERSION=2;
// Check both narrative consequences and the intention to spend or transfer property. Dedicated
// commands still decide their own availability and effects at execution time.
const transfers=new Set(['buy','supply-buy','give-item','give-gold']);
const authored=new Set([...transfers,'free-action','attribute-check','opposed-check','describe','clarify','remember-object']);
export function storyPlanAuthorityTargets(plan:StoryPlan,prefixLength=0){
 return plan.segments.flatMap((segment,step)=>step>=prefixLength&&authored.has(segment.action.kind)?[{step,path:`/segments/${step}/action`,source:segment.source,action:segment.action}]:[]);
}
export function storyPlanAuthoritySchema(steps:number[]):ModelJsonSchema{
 return {type:'object',properties:{checks:{type:'array',minItems:steps.length,maxItems:steps.length,items:{type:'object',properties:{step:{type:'integer',enum:steps},verdict:{type:'string',enum:['within-scope','requires-rule-action','unsupported-assertion']},reason:{type:'string',minLength:1,maxLength:600}},required:['step','verdict','reason'],additionalProperties:false}}},required:['checks'],additionalProperties:false};
}
/** Validate coverage independently of the semantic judgment. No partial or
 * fabricated clearance can authorize a candidate, and no text is rewritten. */
export function readStoryPlanAuthority(value:any,targets:ReturnType<typeof storyPlanAuthorityTargets>){
 if(!value||Object.keys(value).some(key=>key!=='checks')||!Array.isArray(value.checks)||value.checks.length!==targets.length)throw Error('行动结果核对未覆盖全部待核对步骤');
 const seen=new Set<number>();
 return value.checks.map((check:any)=>{
  const target=targets.find(target=>target.step===check?.step);
  if(!target||seen.has(check.step)||Object.keys(check).some(key=>!['step','verdict','reason'].includes(key))||!['within-scope','requires-rule-action','unsupported-assertion'].includes(check.verdict)||typeof check.reason!=='string'||!check.reason.trim()||check.reason.length>600)throw new ModelProposalValidationError('行动结果核对包含无效、重复或外来步骤',{responseSchema:storyPlanAuthoritySchema(targets.map(target=>target.step))});
  seen.add(check.step);return {...check,target};
 });
}
export async function assertStoryPlanAuthority(gateway:ModelGateway,messages:ChatMessage[],plan:StoryPlan,input:string,signal:AbortSignal,recoveryBudget:ModelRecoveryBudget,prefixLength=0){
 const targets=storyPlanAuthorityTargets(plan,prefixLength);if(!targets.length)return;
 const schema=storyPlanAuthoritySchema(targets.map(target=>target.step));
 const sceneOnly=plan.segments.every(s=>s.action.kind==='describe'&&s.action.mode==='daily'||s.action.kind==='address-person');
 const review=[promptMessage('story-plan-authority'),promptDataMessage({kind:'story-plan-authority',input,
  ...(sceneOnly?{sceneContract:'daily 记录本段在场人物共同经历。世界账本只有玩家明确要求持久结果时才参与。一般市井消费在当场用完即结束；即便原话说买或付账，也不能仅据这个词要求正式交易。核对原话是否另有入包、实际扣除某个金额、持久状态、装备或强加他人决定等要求。'}:{planningMaterials:messages.map(({role,content})=>({role,content}))}),targets},{})];
 const checks=await gateway.structured(review,value=>readStoryPlanAuthority(value,targets),{task:'story-host',signal,responseSchema:schema,recoveryBudget,repairValidation:true});
 const conflicts=checks.filter((check:any)=>check.verdict!=='within-scope');
 if(conflicts.length){
  const issues=conflicts.map((check:any)=>({instancePath:check.target.path,keyword:transfers.has(check.target.action.kind)||check.target.action.mode==='daily'?'transaction-intent':'action-authority',submitted:check.target.action,reference:{instancePath:'/actionAuthority',value:{verdict:check.verdict,reason:check.reason}}}));
  throw new StoryPlanValidationError(conflicts.map((check:any)=>`步骤${check.step}：${check.reason}`).join('；'),issues[0],issues);
 }
 signal.throwIfAborted();
}
