import {promptDataMessage} from '../runtime/model-prompt-templates';
import {ModelRecoveryBudget} from '../runtime/model-recovery-budget';
import {STORY_STAGE_REPAIR_CONTRACT} from './story-memory-contract';
import {ModelGatewayError,type ModelGateway,type ChatMessage} from '../runtime/model-gateway';
import {stageSummaryCandidates,stageQuoteCatalog} from '../shared/story-stage-summary';
import type {StorySummaryOriginal} from '../shared/story-summary-original';

/** Repair a rejected extraction once; never remap an invalid source reference in code. */
export async function requestStageCandidates(gateway:ModelGateway,messages:ChatMessage[],originals:StorySummaryOriginal[],signal:AbortSignal,recoveryBudget=gateway.recoveryBudget??new ModelRecoveryBudget()){
 let rejected:unknown,reason:string|undefined;
 const validate=(value:unknown)=>{try{return stageSummaryCandidates(value,originals);}catch(error){rejected=value;reason=(error as Error).message;throw error;}};
 const options={task:'stage-summary',signal,recoveryBudget};
 try{return await gateway.structured(messages,validate,options);}
 catch(error){
  if(signal.aborted||!(error instanceof ModelGatewayError)||error.kind!=='invalid-response'||reason===undefined)throw error;
  recoveryBudget.consume('memory-correction');
  return gateway.structured([...messages,{role:'assistant',content:JSON.stringify(rejected)},promptDataMessage({
   kind:'stage-memory-correction',validationError:reason,
   sources:originals.map(o=>({turn:o.turn,allowedQuoteIds:stageQuoteCatalog(o).map(q=>q.id)})),
   instruction:STORY_STAGE_REPAIR_CONTRACT
  },{instruction:'memory-repair'})],validate,options);
 }
}
