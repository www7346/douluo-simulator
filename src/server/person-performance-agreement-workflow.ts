import {residentNarrativeContext} from '../runtime/resident-narrative';
import type {GameSnapshot} from '../runtime/contracts';
import type {ModelGateway} from '../runtime/model-gateway';
import {rules} from '../rules';
import {storyPersona} from '../runtime/story-personas';
import {personCognition,perceivedRelations} from '../shared/cognition-view';
import {respondNpcPerformanceAgreement} from '../runtime/person-performance-agreement';
import {issueWorkflowTicket} from './workflow-ticket';
export function preparePerformanceAgreementResponse(snapshot:GameSnapshot,input:any){
 if(!input||Object.keys(input).some(k=>k!=='agreementId'))throw Error('协议回应只接受原提议编号');
 const state=snapshot.state as any,r=rules.performanceAgreements.pending(state).find((r:any)=>r.id===input.agreementId);if(!r)throw Error('原协议目前无法本人回应');
 const person=state.人物.列表[r.subjectId];let acceptanceReason='';try{respondNpcPerformanceAgreement(structuredClone(state),{agreementId:r.id,decision:{accept:true,reason:'可行性预检'}},'preview-agreement-response:'+r.id);}catch(e){acceptanceReason=(e as Error).message;}
 const residentContext=residentNarrativeContext(state,person.id);const packet={residentContext,time:state.世界.时间,self:{id:person.id,name:person.name,characterization:storyPersona(state,person),cognition:personCognition(state,person.id),attitude:person.relationship?.player??0},relationships:perceivedRelations(state,person.id),proposal:residentContext.agreements.find((a:any)=>a.id===r.id),acceptanceReason,allowedResponses:acceptanceReason?[false]:[true,false]};
 return {record:r,messages:[{role:'system' as const,content:'你扮演协议受邀者，依据本人处境、实际经历、原有关系和条款独立接受或拒绝。服从、态度与同意分别判断，迫于处境接受不等于忠诚。只返回JSON {"accept":boolean,"reason":string}，理由1至600字。接受后约定环境与活动许可立即落实，实际维持约定时长后才结算履约；不得声称已经出战、升级、释放或获得未结算奖励。'},{role:'user' as const,content:JSON.stringify(packet)}]};
}
export async function runPerformanceAgreementResponseWorkflow(snapshot:GameSnapshot,worldId:string,input:any,gateway:ModelGateway,secret:string,signal:AbortSignal){
 const {messages,record}=preparePerformanceAgreementResponse(snapshot,input),decision=await gateway.structured(messages,(d:unknown)=>{respondNpcPerformanceAgreement(structuredClone(snapshot.state),{agreementId:record.id,decision:d},'npc-agreement:'+record.id);return d;},{task:'npc-autonomy',signal,promptStructure:{strict:true}});
 signal.throwIfAborted();return {ticket:issueWorkflowTicket(secret,worldId,snapshot,{type:'person.respond-performance-agreement',payload:{agreementId:record.id,decision}}),value:{stage:'person-performance-agreement',personId:record.subjectId}};
}
