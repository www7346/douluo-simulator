import type {GameSnapshot} from '../runtime/contracts';
import type {ModelGateway} from '../runtime/model-gateway';
import {rules} from '../rules';
import {storyPersona} from '../runtime/story-personas';
import {personCognition,perceivedRelations} from '../shared/cognition-view';
import {storyActionState,compileActionState} from '../runtime/story-state-writing-facts';
import {issueWorkflowTicket} from './workflow-ticket';
export async function runAbilityUseWorkflow(snapshot:GameSnapshot,worldId:string,input:any,gateway:ModelGateway,secret:string,signal:AbortSignal){
 if(!input||Object.keys(input).some(k=>k!=='permissionId'))throw Error('施用回应只接受原请求编号');
 const s=snapshot.state as any,r=rules.world.abilityUseTable(s).requests.find((r:any)=>r.id===input.permissionId&&r.status==='pending'&&r.expiresAt>rules.people.now(s));
 if(!r||r.targetId===s.角色.主控单位ID)throw Error('没有该人物当前可回应的施用请求');
 rules.influence.assertVoluntary(s,r.targetId);
 rules.actions.resolve(s,{actorId:r.targetId,battleId:null,targetIds:[r.actorId]});
 const person=s.人物.列表[r.targetId],packet={time:s.世界.时间,self:{id:person.id,name:person.name,characterization:storyPersona(s,person),cognition:personCognition(s,person.id),actionState:compileActionState(storyActionState(s,person.id,true))},operator:{id:r.actorId,name:s.人物.列表[r.actorId].name},ability:{name:r.contract.name,effects:rules.abilities.selectFieldBranches(r.contract,r.scope.branchIds).flatMap((b:any)=>b.nodes.filter((n:any)=>!['release','targeting','check'].includes(n.family)).map((n:any)=>({name:rules.effects.EFFECT_REGISTRY[n.effectId].displayName,params:n.params}))),scope:r.scope,requirements:r.contract.requirements},request:{id:r.id,expiresAt:r.expiresAt},relationships:perceivedRelations(s,person.id)};
 const messages=[{role:'system' as const,content:'你扮演被请求接受能力或药物施用的人物，依据本人可知处境、实际能力效果和意愿独立决定。接受仅允许原请求的一次施用，不保证效果成功，不改变看管、财物或永久关系。只返回JSON {"accept":boolean,"reason":string}，理由1至600字，为本人私有思考。'},{role:'user' as const,content:JSON.stringify(packet)}];
 const decision=await gateway.structured(messages,(d:any)=>{if(!d||Object.keys(d).some(k=>!['accept','reason'].includes(k))||typeof d.accept!=='boolean'||typeof d.reason!=='string'||!d.reason.trim()||d.reason.length>600)throw Error('本人施用回应无效');return d;},{task:'npc-autonomy',signal,promptStructure:{strict:true}});
 signal.throwIfAborted();return {ticket:issueWorkflowTicket(secret,worldId,snapshot,{type:'person.respond-ability-use',payload:{permissionId:r.id,decision}}),value:{stage:'person-ability-use',personId:r.targetId}};
}
