import {promptMessage,promptDataMessage} from './model-prompt-templates';
import {ModelGatewayError,type ModelGateway,type ChatMessage} from './model-gateway';
import {ModelRecoveryBudget} from './model-recovery-budget';
import type {ModelJsonSchema} from '../shared/model-json-schema';
export interface DesignText {path:string;text:string}
export interface DesignConflict {path:string;reason:string;authority:unknown}

/** Request-local language check against existing compiler outputs. It neither
 * adopts the proposal nor adds a game concept or a second mechanical state. */
export async function reviewDesignAuthority(gateway:ModelGateway,args:{task:string;intent:string;authority:unknown;texts:DesignText[];signal?:AbortSignal;budget:ModelRecoveryBudget}){
 const {texts}=args;if(!texts.length)return [];
 const schema:ModelJsonSchema={type:'object',properties:{checks:{type:'array',minItems:texts.length,maxItems:texts.length,items:{type:'object',properties:{path:{type:'string',enum:texts.map(text=>text.path)},verdict:{type:'string',enum:['consistent','unsupported-claim']},reason:{type:'string',minLength:1,maxLength:600}},required:['path','verdict','reason'],additionalProperties:false}}},required:['checks'],additionalProperties:false};
 return gateway.structured([promptMessage('design-authority'),promptDataMessage({kind:'design-authority',intent:args.intent,authority:args.authority,texts},{})],(value:any):DesignConflict[]=>{
  if(!value||Object.keys(value).some(key=>key!=='checks')||!Array.isArray(value.checks)||value.checks.length!==texts.length)throw Error('创建说明核对没有覆盖全部文字');
  const seen=new Set<string>(),conflicts:DesignConflict[]=[];
  for(const check of value.checks){
   if(!check||Object.keys(check).some(key=>!['path','verdict','reason'].includes(key))||!texts.some(text=>text.path===check.path)||seen.has(check.path)||!['consistent','unsupported-claim'].includes(check.verdict)||typeof check.reason!=='string'||!check.reason.trim()||check.reason.length>600)throw Error('创建说明核对含无效或重复位置');
   seen.add(check.path);if(check.verdict==='unsupported-claim')conflicts.push({path:check.path,reason:check.reason,authority:args.authority});
  }
  return conflicts;
 },{task:args.task,signal:args.signal,promptStructure:{strict:true},responseSchema:schema,recoveryBudget:args.budget,repairFormat:false});
}
/** Exactly one semantic correction, keeping the first rejected candidate and
 * the same compiler context. A remaining disagreement never adopts a design. */
export async function checkedDesign<T>(gateway:ModelGateway,args:{task:string;messages:ChatMessage[];correctionBase?:()=>ChatMessage[];read:(value:unknown)=>T;review:(value:T,budget:ModelRecoveryBudget)=>Promise<DesignConflict[]>;signal?:AbortSignal;repairValidation?:boolean|((error:unknown)=>boolean)}){
 const budget=gateway.recoveryBudget??new ModelRecoveryBudget();
 let raw:unknown;
 const obtain=(messages:ChatMessage[])=>gateway.structured(messages,value=>{raw=structuredClone(value);return args.read(value);},{task:args.task,signal:args.signal,recoveryBudget:budget,repairValidation:args.repairValidation});
 let result=await obtain(args.messages),conflicts=await args.review(result,budget);
 if(conflicts.length){
  budget.consume('design-repair');
  const repair=[...(args.correctionBase?.()??args.messages),{role:'assistant' as const,content:JSON.stringify(raw)},promptDataMessage({kind:'design-correction',authority:conflicts[0].authority,conflicts:conflicts.map(({authority,...issue})=>issue),instruction:'依据相同玩家意图、预算与代码作用说明修正这些文字或对应选择。提案尚未采用，返回完整原协议JSON。'},{instruction:'design-repair'})];
  result=await obtain(repair);conflicts=await args.review(result,budget);
  if(conflicts.length)throw new ModelGatewayError('invalid-response','创建说明仍与实际方案不符，尚未采用；请调整构想后重试。');
 }
 return result;
}
