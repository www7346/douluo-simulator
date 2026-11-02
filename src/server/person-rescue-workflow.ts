import type {GameSnapshot} from '../runtime/contracts';
import type {ModelGateway} from '../runtime/model-gateway';
import {rules} from '../rules';
import {storyPersona} from '../runtime/story-personas';
import {personCognition,perceivedRelations} from '../shared/cognition-view';
import {pendingNpcRescueResponses,respondNpcRescue} from '../runtime/person-rescue';
import {issueWorkflowTicket} from './workflow-ticket';

export function prepareRescueResponse(snapshot:GameSnapshot,input:any){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>k!=='decisionKey'))throw Error('撤离回应只接受原提议编号');
 const s=snapshot.state as any,r=pendingNpcRescueResponses(s).find(r=>r.key===input.decisionKey);
 if(!r)throw Error('本人当前不能回应这项撤离');
 const person=s.人物.列表[r.ownerId];let acceptanceReason='';
 try{respondNpcRescue(structuredClone(s),{decisionKey:r.key,decision:{accept:true,reason:'接受可行性预检'}},`preview-rescue-accept:${r.key}`);}catch(error){acceptanceReason=(error as Error).message;}
 const packet={time:s.世界.时间,self:{id:person.id,name:person.name,characterization:storyPersona(s,person),cognition:personCognition(s,person.id)},rescuer:{id:r.rescuerId,name:s.人物.列表[r.rescuerId].name},proposal:rules.rescue.facts(s,r.ownerId).find((g:any)=>g.id===r.rescueId),relationships:perceivedRelations(s,r.ownerId),acceptanceReason,allowedResponses:acceptanceReason?[false]:[true,false]};
 return {record:r,messages:[{role:'system' as const,content:'你扮演已获救且清醒的受援者，只依据本人可知处境和当前实际撤离安排，独立决定是否同行。被救出不等于已经同意跟随，也不等于加入队伍或永久忠诚。接受或拒绝都有效；拒绝不恢复关押，接受仍须按实际路线、行动条件和费用撤离。只返回JSON {"accept":boolean,"reason":string}，理由1至600字，属于本人私有思考。'},{role:'user' as const,content:JSON.stringify(packet)}]};
}

export async function runRescueResponseWorkflow(snapshot:GameSnapshot,worldId:string,input:any,gateway:ModelGateway,secret:string,signal:AbortSignal){
 const {record,messages}=prepareRescueResponse(snapshot,input);
 const decision=await gateway.structured(messages,(d:unknown)=>{respondNpcRescue(structuredClone(snapshot.state),{decisionKey:record.key,decision:d},`npc-rescue-response:${record.key}`);return d;},{task:'npc-autonomy',signal,promptStructure:{strict:true}});
 signal.throwIfAborted();return {ticket:issueWorkflowTicket(secret,worldId,snapshot,{type:'person.respond-rescue',payload:{decisionKey:record.key,decision}}),value:{stage:'person-rescue-response',personId:record.ownerId}};
}
