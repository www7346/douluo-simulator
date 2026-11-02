import {residentNarrativeContext} from '../runtime/resident-narrative';
import type {GameSnapshot} from '../runtime/contracts';
import type {ModelGateway} from '../runtime/model-gateway';
import {rules} from '../rules';
import {storyPersona} from '../runtime/story-personas';
import {personCognition,perceivedRelations} from '../shared/cognition-view';
import {pendingCooperationResponses} from '../shared/person-cooperation';
import {respondNpcCooperation} from '../runtime/person-cooperation';
import {issueWorkflowTicket} from './workflow-ticket';

export function prepareCooperationResponse(snapshot:GameSnapshot,input:any){
 if(!input||Object.keys(input).some(k=>k!=='cooperationId'))throw Error('合作回应只接受原提议编号');
 const state=snapshot.state as any,r=pendingCooperationResponses(state).find(r=>r.id===input.cooperationId);
 if(!r||rules.cooperation.responseReason(state,r))throw Error('没有可回应的原合作提议');
 const person=state.人物.列表[r.memberId];let acceptanceReason='';
 try{respondNpcCooperation(structuredClone(state),{cooperationId:r.id,decision:{accept:true,reason:'可行性预检'}},`preview:${r.id}`);}catch(error){acceptanceReason=(error as Error).message;}
 const proposal=rules.cooperation.facts(state,person.id).find((a:any)=>a.id===r.id);
 const packet={residentContext:residentNarrativeContext(state,person.id),time:state.世界.时间,self:{id:person.id,name:person.name,characterization:storyPersona(state,person),cognition:personCognition(state,person.id)},relationships:perceivedRelations(state,person.id),proposal,acceptanceReason,allowedResponses:acceptanceReason?[false]:[true,false]};
 return {record:r,messages:[{role:'system' as const,content:'你扮演提议的受邀者。依据本人处境与双方提出的实际合作范围，独立接受或拒绝。暂时迫于处境配合不等于忠诚或感情改变。只返回JSON {"accept":boolean,"reason":string}，理由1至600字。决定不会解除看管、改变物品归属或代签收获分配。'},{role:'user' as const,content:JSON.stringify(packet)}]};
}
export async function runCooperationResponseWorkflow(snapshot:GameSnapshot,worldId:string,input:any,gateway:ModelGateway,secret:string,signal:AbortSignal){
 const {messages,record}=prepareCooperationResponse(snapshot,input);
 const decision=await gateway.structured(messages,(d:unknown)=>{respondNpcCooperation(structuredClone(snapshot.state),{cooperationId:record.id,decision:d},`npc-cooperation:${record.id}`);return d;},{task:'npc-autonomy',signal,promptStructure:{strict:true}});
 signal.throwIfAborted();return {ticket:issueWorkflowTicket(secret,worldId,snapshot,{type:'person.respond-cooperation',payload:{cooperationId:record.id,decision}}),value:{stage:'person-cooperation',personId:record.memberId}};
}
