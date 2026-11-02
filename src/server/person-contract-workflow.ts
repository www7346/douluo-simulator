import {rules} from '../rules';
import type {GameSnapshot} from '../runtime/contracts';
import type {ModelGateway} from '../runtime/model-gateway';
import {storyPersona} from '../runtime/story-personas';
import {personCognition,perceivedRelations} from '../shared/cognition-view';
import {residentNarrativeContext} from '../runtime/resident-narrative';
import {personContractFacts,pendingPersonContractResponses,pendingPersonContractOrders,respondNpcContract,respondNpcContractOrder} from '../runtime/person-contract';
import {personContractActionMetadata} from '../runtime/person-contract-actions';
import {issueWorkflowTicket} from './workflow-ticket';

export function preparePersonContractResponse(snapshot:GameSnapshot,input:any){
 if(!input||Object.keys(input).some(k=>!['contractId','versionHash'].includes(k)))throw Error('契约回应只读取原版本');
 const state:any=snapshot.state,job=pendingPersonContractResponses(state).find((j:any)=>j.contractId===input.contractId&&j.versionHash===input.versionHash);if(!job)throw Error('没有人物当前可回应的契约');
 const person=state.人物.列表[job.personId],proposal=personContractFacts(state,person.id).find((r:any)=>r.id===job.contractId);
 let acceptanceReason='';try{respondNpcContract(structuredClone(state),{...input,decision:{decision:'accept',reason:'当前完整版本可行性预检'}},'preview-contract:'+job.contractId);}catch(e){acceptanceReason=(e as Error).message;}
 const packet={time:state.世界.时间,self:{id:person.id,name:person.name,characterization:storyPersona(state,person),cognition:personCognition(state,person.id)},relationships:perceivedRelations(state,person.id),residentContext:residentNarrativeContext(state,person.id),proposal,acceptanceReason};
 return {job,packet,messages:[{role:'system' as const,content:'扮演契约中尚未同意这一完整版本的本人，按自己的性格、经历、处境、双方全部条款和明确列出的处罚程度/次数决定同意、拒绝或反提。普通契约可违约；自愿灵魂契约违约或单方解除会按约定处罚。处罚现在只是约定，尚未执行。不要替另一方同意，不把合作变成感情或忠诚改变。反提必须给出完整 terms；可以用 penaltyParams 调低当前已选处罚的程度，不能换成未提供的能力或新增惩罚。JSON仅含 decision(accept/reject/counter)、reason(本人回应理由1至600字)；只有counter可加terms和penaltyParams。来源暂时不足不等于本人拒绝，仍可同意等待。'},{role:'user' as const,content:JSON.stringify(packet)}]};
}
export async function runPersonContractResponseWorkflow(snapshot:GameSnapshot,worldId:string,input:any,gateway:ModelGateway,secret:string,signal:AbortSignal){
 const {job,messages}=preparePersonContractResponse(snapshot,input),responseSchema={type:'object',additionalProperties:false,required:['decision','reason'],properties:{decision:{type:'string',enum:['accept','reject','counter']},reason:{type:'string',minLength:1,maxLength:600},terms:personContractActionMetadata('propose-person-contract').objectParameters.terms,penaltyParams:{type:'object',maxProperties:12,additionalProperties:{anyOf:[{type:['integer','string']},{type:'object',maxProperties:20,additionalProperties:{type:['integer','string']}}]}}}};
 const decision=await gateway.structured(messages,(d:any)=>{respondNpcContract(structuredClone(snapshot.state),{...input,decision:d},'preview-npc-contract:'+job.contractId);return d;},{task:'npc-autonomy',signal,promptStructure:{strict:true},responseSchema});signal.throwIfAborted();return {ticket:issueWorkflowTicket(secret,worldId,snapshot,{type:'person.respond-contract',payload:{...input,decision}}),value:{stage:'person-contract',personId:job.personId}};
}
export async function runPersonContractOrderWorkflow(snapshot:GameSnapshot,worldId:string,input:any,gateway:ModelGateway,secret:string,signal:AbortSignal){
 const state:any=snapshot.state,job=pendingPersonContractOrders(state).find((j:any)=>j.orderId===input.orderId&&j.versionHash===input.versionHash);if(!job||!rules.personContracts.validateOrderRef(state,input.orderRef))throw Error('没有当前可履行的原契约要求');
 const order=rules.personContracts.table(state).orders.find((o:any)=>o.id===job.orderId),person=state.人物.列表[job.personId],proposal=personContractFacts(state,order.subjectId).find((r:any)=>r.id===order.contractId);
 let decision:any={decision:'execute',reason:'依照原有效灵魂控制命令执行。'};
 if(!job.forced){const packet={self:{id:person.id,name:person.name,characterization:storyPersona(state,person),cognition:personCognition(state,person.id)},relationships:perceivedRelations(state,person.id),residentContext:residentNarrativeContext(state,person.id),proposal,requestedAction:order.action};decision=await gateway.structured([{role:'system',content:'扮演收到原契约具体要求的本人，依据全部约定、当前可行行动和自己的意愿选择执行或拒绝。自愿灵魂契约实际拒绝会触发已同意的处罚；普通契约可以拒绝且无魔法处罚。只返回JSON {"decision":"execute"|"decline","reason":string}，理由1至600字，不替别人决定，不新增行动。'},{role:'user',content:JSON.stringify(packet)}],(d:any)=>{respondNpcContractOrder(structuredClone(state),{...input,decision:d},'preview-order:'+job.orderId);return d;},{task:'npc-autonomy',signal,promptStructure:{strict:true}});}
 signal.throwIfAborted();return {ticket:issueWorkflowTicket(secret,worldId,snapshot,{type:'person.respond-contract-order',payload:{...input,decision}}),value:{stage:'person-contract-order',personId:job.personId}};
}
