import type {GameSnapshot} from '../runtime/contracts';
import type {ModelGateway} from '../runtime/model-gateway';
import {personResearchRequest,namePersonResearch,choosePersonResearch} from '../runtime/person-research';
import {requestResearchNarrative} from '../runtime/game-model-orchestrator';
import {readResearchChoices} from '../runtime/story-workshop';
import {storyPersona} from '../runtime/story-personas';
import {personCognition} from '../shared/cognition-view';
import {issueWorkflowTicket} from './workflow-ticket';

export async function runPersonResearchWorkflow(snapshot:GameSnapshot,worldId:string,kind:'person-research-naming'|'person-research-choice',input:any,gateway:ModelGateway,secret:string,signal:AbortSignal){
 const state=snapshot.state as any,stage=kind==='person-research-naming'?'naming':'choice';
 const {actorId,pending}=personResearchRequest(state,input,stage);let type:string,payload:any;
 if(stage==='naming'){
  const candidates=await requestResearchNarrative(gateway,pending,signal);
  payload={...input,candidates};
  namePersonResearch(structuredClone(state),payload,`npc-research-name:${pending.id}:${pending.mechanicsHash}`);type='person.name-research';
 }else{
  const person=state.人物.列表[actorId];
  // A single person's own projection. Never storyTurnFacts(main), global blueprints,
  // the player's stock, or a private conversation belonging to someone else.
  const packet={self:{id:actorId,name:person.name,characterization:storyPersona(state,person),cognition:personCognition(state,actorId)},choice:readResearchChoices(state,pending.id,actorId)};
  const decision=await gateway.structured([
   {role:'system',content:'你扮演正在研发的本人。材料已经实际消耗；依据本人处境、构想与这些候选的实际效果选定一个，不更改候选机械。只返回 JSON {"candidateIndex":非负整数,"reason":字符串}；reason 为 1 至 600 字的本人理由，属于内部决定，不向旁人发布。'},
   {role:'user',content:JSON.stringify(packet)}
  ],(decision:unknown)=>{choosePersonResearch(structuredClone(state),{...input,decision},`npc-research-choice:${pending.id}:${pending.mechanicsHash}`);return decision;},{task:'npc-autonomy',signal,promptStructure:{strict:true}});
  payload={...input,decision};type='person.choose-research';
 }
 signal.throwIfAborted();
 return {ticket:issueWorkflowTicket(secret,worldId,snapshot,{type,payload}),value:{stage:kind}};
}
