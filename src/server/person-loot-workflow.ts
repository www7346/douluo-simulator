import {residentNarrativeContext} from '../runtime/resident-narrative';
import type {GameSnapshot} from '../runtime/contracts';
import type {ModelGateway} from '../runtime/model-gateway';
import {rules} from '../rules';
import {storyPersona} from '../runtime/story-personas';
import {personCognition} from '../shared/cognition-view';
import {respondNpcLoot} from '../runtime/person-loot';
import {issueWorkflowTicket} from './workflow-ticket';

export function prepareLootResponse(snapshot:GameSnapshot,input:any){
 if(!input||Object.keys(input).some(k=>k!=='commitmentId'))throw Error('分配回应只接受原提议编号');
 const state=snapshot.state as any,record=rules.expedition.loot.pendingResponses(state).find((r:any)=>r.id===input.commitmentId&&r.personId!==state.角色.主控单位ID);
 if(!record)throw Error('没有可由人物回应的原分配提议；玩家须亲自决定');
 const reason=rules.expedition.loot.responseReason(state,record);if(reason)throw Error(reason);
 let acceptanceReason='';try{respondNpcLoot(structuredClone(state),{commitmentId:record.id,decision:{accept:true,reason:'可行性预检'}},`preview:${record.id}`);}catch(error){acceptanceReason=(error as Error).message;}
 const person=state.人物.列表[record.personId],membership=record.kind==='loot'?rules.expedition.loot.records(state).find((a:any)=>a.id===record.allocationId)?.membership.find((m:any)=>m.personId===person.id):null;
 const packet={time:state.世界.时间,residentContext:residentNarrativeContext(state,person.id),participation:rules.world.partyMembers(state,record.playerId).find((m:any)=>m.personId===person.id)??null,self:{id:person.id,name:person.name,characterization:storyPersona(state,person),cognition:personCognition(state,person.id)},proposal:{id:record.id,kind:record.kind,proposerId:record.playerId,proposerName:state.人物.列表[record.playerId].name,terms:record.terms,membership,dungeon:record.kind==='loot'?{id:record.dungeonId,name:rules.expedition.DUNGEON_PROFILES[record.dungeonId]?.name}:null,meaning:record.kind==='loot'?'在实际出发前约定这一趟共同远征未来实际取得的收获如何分配；现在没有现货转移，不要求确认尚未取得的物品已经存在，也不预分消散魂环。':'对原返程收获提出实际交付方案。'},acceptanceReason,allowedResponses:acceptanceReason?[false]:[true,false]};
 return {record,messages:[{role:'system' as const,content:'你扮演收到分配提议的人物，依据本人处境和收到的具体条款独立接受或拒绝，只决定你本人的权益。同行、受控参战或临时服从均不等于已同意财物分配。只返回JSON {"accept":boolean,"reason":string}，理由1至600字。'},{role:'user' as const,content:JSON.stringify(packet)}]};
}
export async function runLootResponseWorkflow(snapshot:GameSnapshot,worldId:string,input:any,gateway:ModelGateway,secret:string,signal:AbortSignal){
 const {messages,record}=prepareLootResponse(snapshot,input);
 const decision=await gateway.structured(messages,(value:unknown)=>{respondNpcLoot(structuredClone(snapshot.state),{commitmentId:record.id,decision:value},`npc-loot:${record.id}`);return value;},{task:'npc-autonomy',signal,promptStructure:{strict:true}});
 signal.throwIfAborted();return {ticket:issueWorkflowTicket(secret,worldId,snapshot,{type:'person.respond-loot',payload:{commitmentId:record.id,decision}}),value:{stage:'person-loot',personId:record.personId}};
}
