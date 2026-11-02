import {compactStoryPacketReadings} from './story-host-record-columns';
import {promptDataMessage} from '../runtime/model-prompt-templates';
import {ModelRecoveryBudget} from '../runtime/model-recovery-budget';
import type {ModelGateway} from '../runtime/model-gateway';
import {ModelGatewayError} from '../runtime/model-gateway';
import {type StoryPlan,type StorySegment} from '../runtime/story-turns';
import type {ChatMessage} from '../runtime/model-gateway';
import {validateStoryHostPlan} from './story-plan-tasks';
import {StoryPlanValidationError,type StoryPlanValidationIssue} from '../runtime/story-plan-validation-error';
import {readStoryHostChannel,type StoryHostChannel} from './story-host-channel';
import type {HostCatalogAccess,HostCatalogProgress} from './story-host-catalog';

/** A rejected proposal has not executed anything. Repair it once against the same input. */
export async function requestStoryPlan(gateway:ModelGateway,messages:ChatMessage[],input:string,signal:AbortSignal,attest?:(plan:StoryPlan,channel:StoryHostChannel)=>StoryPlan,catalog?:HostCatalogAccess,progress?:{data:{catalog?:HostCatalogProgress;correctionUsed?:boolean};save():void},prefix:StorySegment[]=[],authority?:(messages:ChatMessage[],plan:StoryPlan)=>Promise<void>){
 let rejected:unknown,reason:string|undefined,issue:StoryPlanValidationIssue|undefined,issues:StoryPlanValidationIssue[]|undefined;
  let allowLookup=!progress?.data.catalog,currentMessages=messages,loadedGroups:string[]|undefined=progress?.data.catalog?.groups;
 const load=(groups:string[])=>{
  if(!catalog)throw Error('当前行动没有可补充的分类。');
  return [...messages,{role:'assistant' as const,content:JSON.stringify({catalogGroups:groups})},promptDataMessage({kind:'action-catalog-details',...compactStoryPacketReadings(catalog.read(groups)),instruction:'分类已一次补齐。现在返回完整channel/segments计划，不再请求目录；本次尚未执行任何行动。'},{instruction:'action-catalog'})];
 };
 if(progress?.data.catalog){if(!catalog)throw Error('当前会话没有可用的行动目录');const groups=catalog.validate(progress.data.catalog.groups);if(progress.data.catalog.version!==catalog.version){progress.data.catalog={version:catalog.version,groups};progress.save();}currentMessages=load(groups);}
 const validate=(value:unknown)=>{
  try{
   if(value&&typeof value==='object'&&Object.hasOwn(value,'catalogGroups')){
    if(!catalog||!allowLookup||Object.keys(value).length!==1)throw Error('请直接返回完整行动计划，分类只能集中补充一次，不能同时提交行动。');
    return {catalogGroups:catalog.validate((value as any).catalogGroups)};
   }
   const segments=(value as any)?.segments;
   if(Array.isArray(segments)&&segments.some(s=>s?.action?.martialSoulDraft!==undefined||s?.action?.evidence!==undefined))throw Error('主持人不能代填专用生成器草案或已核对的来源证据');
   const {channel,proposal}=readStoryHostChannel(structuredClone(value));
   const plan=validateStoryHostPlan(proposal,input,attest?plan=>attest(plan,channel):undefined,prefix);
   catalog?.validatePlan?.(plan,prefix.length);
   return {channel,plan};
  }
  catch(error){rejected=value;reason=(error as Error).message;issue=error instanceof StoryPlanValidationError?structuredClone(error.issue):undefined;issues=error instanceof StoryPlanValidationError?structuredClone(error.issues):undefined;throw error;}
 };
 const recoveryBudget=gateway.recoveryBudget??new ModelRecoveryBudget(),options={task:'story-host',signal,promptStructure:{strict:true as const},recoveryBudget,parseStructured:(source:string)=>{
  try{return {value:JSON.parse(source)};}
  catch(error){rejected=source;reason='行动计划不是完整有效的JSON，请按原协议重新提供；逐字引用含引号时须正确转义，或使用协议中的完整输入引用。';issue={instancePath:'/',keyword:'invalid-json',submitted:source,reference:{instancePath:'/input',value:input}};issues=[issue];throw error;}
 }};
 const obtain=async()=>{
   let result=await gateway.structured(currentMessages,validate,{...options,responseSchema:catalog?.responseSchema?.(loadedGroups)});
  if(result.catalogGroups){
    allowLookup=false;loadedGroups=result.catalogGroups;
   if(progress){progress.data.catalog={version:catalog!.version,groups:result.catalogGroups};progress.save();}
    currentMessages=load(result.catalogGroups);gateway.checkPrompt(currentMessages,{task:'story-host',promptStructure:{strict:true},json:true,responseSchema:catalog?.responseSchema?.(loadedGroups)});signal.throwIfAborted();
    result=await gateway.structured(currentMessages,validate,{...options,responseSchema:catalog?.responseSchema?.(loadedGroups)});
  }
  if(!('plan' in result)||!result.plan)throw Error('请返回完整行动计划。');
  if(authority){
   try{await authority(currentMessages,result.plan);}
   catch(error){
    // A reviewer transport/coverage failure is not evidence that the proposal
    // is wrong. Fail closed without spending the plan correction on it.
    if(!(error instanceof StoryPlanValidationError))throw error;
    rejected={channel:result.channel,...result.plan};reason=error.message;issue=structuredClone(error.issue);issues=structuredClone(error.issues);
    throw new ModelGatewayError('invalid-response',error.message,{cause:error});
   }
  }
  return result;
 };
 try{return {...await obtain(),repaired:false};}
 catch(error){
  if(signal.aborted||!(error instanceof ModelGatewayError)||!['invalid-response','invalid-json'].includes(error.kind)||reason===undefined)throw error;
  // The submitted operations identify their own missing interface groups. Supply
  // those exact contracts locally in the existing repair, without an extra model
  // call or guessing an action from natural language.
  const missingGroups=allowLookup&&Array.isArray((rejected as any)?.segments)?catalog?.groupsForActions?.((rejected as any).segments.map((segment:any)=>segment?.action?.kind))??[]:[];
  if(missingGroups.length){allowLookup=false;loadedGroups=missingGroups;if(progress){progress.data.catalog={version:catalog!.version,groups:missingGroups};progress.save();}currentMessages=load(missingGroups);}
  const corrected=[...currentMessages,{role:'assistant' as const,content:typeof rejected==='string'?rejected:JSON.stringify(rejected)},promptDataMessage({kind:'story-plan-correction',input,validationError:reason,...(issue?{validationIssue:issue}:{}),...(issues&&issues.length>1?{validationIssues:issues}:{}),instruction:'上份提案尚未执行。依据同一原输入、事实和实际接口修正validationError，返回完整提案。'},{instruction:'plan-repair'})];
  gateway.checkPrompt(corrected,{task:'story-host',promptStructure:{strict:true},json:true,responseSchema:catalog?.responseSchema?.(loadedGroups)});signal.throwIfAborted();
  // The recovery budget belongs to this generation job. A new explicit player
  // retry gets its own bounded correction; a turn-wide persisted flag must not
  // disable it forever after the first rejected proposal.
  try{recoveryBudget.consume('plan-repair');}
  catch(recoveryError){
   throw new ModelGatewayError('invalid-response',`${error.message}；${recoveryError instanceof Error?recoveryError.message:String(recoveryError)}`);
  }
  currentMessages=corrected;
  try{return {...await obtain(),repaired:true};}
  catch(second){
   // A disputed transaction has executed nothing. Let the player settle its scope
   // instead of sending an ungrounded purchase on to the writer for another retry.
   const conflict=second instanceof ModelGatewayError?second.cause:null;
   if(prefix.length||signal.aborted||!(conflict instanceof StoryPlanValidationError)||!conflict.issues.every(e=>e.keyword==='transaction-intent'))throw second;
   const channel=(rejected as any)?.channel??'current';
   const result=validate({channel,segments:[{source:{input:true},action:{kind:'clarify',reason:'你希望把这段写成当场的生活经历，还是实际付款、收取物品并记入行囊？'}}]});
   return {...result,repaired:true};
  }
 }
}
