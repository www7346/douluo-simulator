import type {GameSnapshot} from '../runtime/contracts';
import type {ModelGateway} from '../runtime/model-gateway';
import {rules} from '../rules';
import {storyPersona} from '../runtime/story-personas';
import {personCognition,perceivedRelations} from '../shared/cognition-view';
import {decideNpcRestraintPermission,pendingNpcRestraintPermissions} from '../runtime/person-restraint-permission';
import {issueWorkflowTicket} from './workflow-ticket';
export function prepareRestraintPermission(snapshot:GameSnapshot,input:any){
 if(!input||Object.keys(input).some(k=>k!=='decisionKey'))throw Error('只接受原佩戴者装配失败编号');
 const s=snapshot.state as any,r=pendingNpcRestraintPermissions(s).find((r:any)=>r.key===input.decisionKey);if(!r)throw Error('本人当前不能独立回应这项装配');
 const person=s.人物.列表[r.ownerId],item=s.物品.实例[r.itemId];
 const packet={time:s.世界.时间,self:{id:person.id,name:person.name,characterization:storyPersona(s,person),cognition:personCognition(s,person.id)},operator:{id:r.operatorId,name:s.人物.列表[r.operatorId].name},item:{id:item.id,name:item.name,part:rules.custody.resolveDevice(item).part,modes:Object.keys(rules.custody.resolveDevice(item).modes).map(mode=>({mode,effects:rules.custody.effectSpecs(item,mode)}))},request:{...(r.requestEventId?{requestId:r.requestEventId}:{preparationId:r.preparationId}),meaning:r.requestEventId?'对方当前实际在场，已当面请求给你装配这件尚未佩戴的器具一次。接受仅生成15分钟内一次装配许可，尚不进行装配，不改变合作、看管或财物归属。':'原战前拆下的这件器具尚未重新装配，对方当前实际在场。接受仅生成15分钟内一次装配许可，尚不进行装配，不改变合作、看管或财物归属。'},relationships:perceivedRelations(s,person.id),allowedResponses:[true,false]};
 return {record:r,messages:[{role:'system' as const,content:'你扮演被请求佩戴器具的人，只依据本人可知处境和器具实际限制独立决定是否同意本次装配。已有合作不代表你已同意装配。接受或拒绝都有效，不代替对方决定，不自行执行装配。只返回JSON {"accept":boolean,"reason":string}，理由1至600字，属于本人私有思考。'},{role:'user' as const,content:JSON.stringify(packet)}]};
}
export async function runRestraintPermissionWorkflow(snapshot:GameSnapshot,worldId:string,input:any,gateway:ModelGateway,secret:string,signal:AbortSignal){
 const {record,messages}=prepareRestraintPermission(snapshot,input);
 const decision=await gateway.structured(messages,(d:unknown)=>{decideNpcRestraintPermission(structuredClone(snapshot.state),{decisionKey:record.key,decision:d},`npc-restraint-response:${record.key}`);return d;},{task:'npc-autonomy',signal,promptStructure:{strict:true}});
 signal.throwIfAborted();return {ticket:issueWorkflowTicket(secret,worldId,snapshot,{type:'person.decide-restraint-permission',payload:{decisionKey:record.key,decision}}),value:{stage:'person-restraint-permission',personId:record.ownerId}};
}
