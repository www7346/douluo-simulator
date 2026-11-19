import {issueWorkflowTicket} from './workflow-ticket';
import {requestEvolutionDecision} from './evolution-advisor';
import {runPersonContractResponseWorkflow,runPersonContractOrderWorkflow} from './person-contract-workflow';
import {runPerformanceAgreementResponseWorkflow} from './person-performance-agreement-workflow';
import {runPersonGrowthWorkflow,runPersonGrowthAllocationWorkflow} from './person-growth-workflow';
import {runPersonConversationWorkflow} from './person-conversation-workflow';
import {runRestraintPermissionWorkflow} from './person-restraint-permission-workflow';
import {runDrugOfferWorkflow} from './person-drug-offer-workflow';
import {runAbilityUseWorkflow} from './person-ability-use-workflow';
import {runPersonRewriteWorkflow} from './person-rewrite-workflow';
import {runPersonChangeReactionWorkflow} from './person-change-reaction-workflow';
import {runRescueResponseWorkflow} from './person-rescue-workflow';
import {runPersonResearchWorkflow} from './person-research-workflow';
import {runDefeatDecisionWorkflow} from './person-defeat-workflow';
import {runCustodyDispositionWorkflow} from './person-custody-disposition-workflow';
import {runCustodyAuctionDecisionWorkflow} from './person-custody-auction-workflow';
import type {GameSnapshot} from '../runtime/contracts';
import type {ModelGateway} from '../runtime/model-gateway';
import {scopedPersonWorldWork,validPersonWorkScope} from '../runtime/person-world-work';
import {runCooperationResponseWorkflow} from './person-cooperation-workflow';
import {runLootResponseWorkflow} from './person-loot-workflow';
import {runPersonExpeditionWorkflow} from './person-expedition-workflow';
import {runSpeechAssessmentWorkflow} from './person-speech-workflow';
import {runCustodyTradeResponseWorkflow} from './person-custody-trade-workflow';
import {runGiftResponseWorkflow} from './person-gift-workflow';
import {runCommitmentWorkflow} from './story-workflows';
import {runNpcAutonomyWorkflow} from './npc-autonomy-workflow';

/** One existing wait per request; the browser does not select a remote person's action. */
export async function runPersonWorldWorkflow(snapshot:GameSnapshot,worldId:string,input:any,gateway:ModelGateway,secret:string,signal:AbortSignal){
 if(!input||typeof input!=='object'||Array.isArray(input)||(Object.keys(input).some(k=>k!=='scope')||!validPersonWorkScope(input.scope)))throw Error('世界人物调度从实际待办选取，不接受指定人物或结果');
 const next=scopedPersonWorldWork(snapshot.state,input.scope)[0];if(!next)return {value:{pending:false}};
 if(next.kind==='person-contract'||next.kind==='person-contract-order'){const r=next.kind==='person-contract'?await runPersonContractResponseWorkflow(snapshot,worldId,next.input,gateway,secret,signal):await runPersonContractOrderWorkflow(snapshot,worldId,next.input,gateway,secret,signal);return {ticket:r.ticket,value:{pending:true}};}
 if(next.kind==='story-social'){const r=await runCommitmentWorkflow(snapshot,worldId,next.input,gateway,secret,signal);return {ticket:r.ticket,value:{pending:true}};}
 if(next.kind==='story-autonomy'){const r=await runNpcAutonomyWorkflow(snapshot,worldId,next.input,gateway,secret,signal);return {ticket:r.ticket,value:{pending:true}};}
 if(next.kind==='person-performance-agreement'){const r=await runPerformanceAgreementResponseWorkflow(snapshot,worldId,next.input,gateway,secret,signal);return {ticket:r.ticket,value:{pending:true}};}
 if(next.kind==='evolution-response'){return {ticket:issueWorkflowTicket(secret,worldId,snapshot,{type:'person.respond-evolution',payload:await requestEvolutionDecision(gateway,snapshot.state,next.input.planId,signal)}),value:{pending:true}};}
 if(next.kind==='person-growth'){const r=await runPersonGrowthWorkflow(snapshot,worldId,next.input,gateway,secret,signal);return {ticket:r.ticket,value:{pending:true}};}
 if(next.kind==='person-growth-allocation'){const r=await runPersonGrowthAllocationWorkflow(snapshot,worldId,next.input,gateway,secret,signal);return {ticket:r.ticket,value:{pending:true}};}
 if(next.kind==='person-conversation'){const r=await runPersonConversationWorkflow(snapshot,worldId,next.input,gateway,secret,signal);return {ticket:r.ticket,value:{pending:true}};}
 if(next.kind==='person-change-reaction'){const r=await runPersonChangeReactionWorkflow(snapshot,worldId,next.input,gateway,secret,signal);return {ticket:r.ticket,value:{pending:true}};}
 if(next.kind==='person-rewrite'){const r=await runPersonRewriteWorkflow(snapshot,worldId,next.input,gateway,secret,signal);return {ticket:r.ticket,value:{pending:true}};}
 if(next.kind==='person-research-naming'||next.kind==='person-research-choice'){const r=await runPersonResearchWorkflow(snapshot,worldId,next.kind,next.input,gateway,secret,signal);return {ticket:r.ticket,value:{pending:true}};}
 if(next.kind==='person-defeat'){const r=await runDefeatDecisionWorkflow(snapshot,worldId,next.input,gateway,secret,signal);return {ticket:r.ticket,value:{pending:true}};}
 if(next.kind==='person-restraint-permission'){const r=await runRestraintPermissionWorkflow(snapshot,worldId,next.input,gateway,secret,signal);return {ticket:r.ticket,value:{pending:true}};}
 if(next.kind==='person-drug-offer'){const r=await runDrugOfferWorkflow(snapshot,worldId,next.input,gateway,secret,signal);return {ticket:r.ticket,value:{pending:true}};}
 if(next.kind==='person-ability-use'){const r=await runAbilityUseWorkflow(snapshot,worldId,next.input,gateway,secret,signal);return {ticket:r.ticket,value:{pending:true}};}
 if(next.kind==='person-rescue-response'){const r=await runRescueResponseWorkflow(snapshot,worldId,next.input,gateway,secret,signal);return {ticket:r.ticket,value:{pending:true}};}
 if(next.kind==='person-custody-disposition'){const r=await runCustodyDispositionWorkflow(snapshot,worldId,next.input,gateway,secret,signal);return {ticket:r.ticket,value:{pending:true}};}
 if(next.kind==='person-custody-auction'){const r=await runCustodyAuctionDecisionWorkflow(snapshot,worldId,next.input,gateway,secret,signal);return {ticket:r.ticket,value:{pending:true}};}
 if(next.kind==='person-custody-trade'){const r=await runCustodyTradeResponseWorkflow(snapshot,worldId,next.input,gateway,secret,signal);return {ticket:r.ticket,value:{pending:true}};}
 if(next.kind==='person-gift'){const r=await runGiftResponseWorkflow(snapshot,worldId,next.input,gateway,secret,signal);return {ticket:r.ticket,value:{pending:true}};}
 const r=next.kind==='person-speech-assessment'?await runSpeechAssessmentWorkflow(snapshot,worldId,next.input,gateway,secret,signal):next.kind==='person-cooperation'?await runCooperationResponseWorkflow(snapshot,worldId,next.input,gateway,secret,signal):next.kind==='person-loot'?await runLootResponseWorkflow(snapshot,worldId,next.input,gateway,secret,signal):await runPersonExpeditionWorkflow(snapshot,worldId,next.kind,next.input,gateway,secret,signal);
 return {ticket:r.ticket,value:{pending:true}};
}
