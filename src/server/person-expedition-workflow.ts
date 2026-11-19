import type {GameSnapshot} from '../runtime/contracts';
import type {ModelGateway} from '../runtime/model-gateway';
import {rules} from '../rules';
import {personRoomRequest,resolvePersonRoom,personRingRequest,namePersonRing,choosePersonRing,preferredPersonRingCandidate} from '../runtime/person-expedition';
import {requestExpeditionNarrative,requestRingSkillNarrative} from '../runtime/game-model-orchestrator';
import {storyPersona} from '../runtime/story-personas';
import {personCognition} from '../shared/cognition-view';
import {issueWorkflowTicket} from './workflow-ticket';

/** Each wait resumes only its original mechanical request and never advances time. */
export async function runPersonExpeditionWorkflow(snapshot:GameSnapshot,worldId:string,kind:'person-room'|'person-ring-naming'|'person-ring-choice',input:any,gateway:ModelGateway,secret:string,signal:AbortSignal){
 const state=snapshot.state as any;let type:string,payload:any;
 if(kind==='person-room'){
  const {source}=personRoomRequest(state,input),narrative=await requestExpeditionNarrative(gateway,source,signal);
  payload={...input,narrative};resolvePersonRoom(structuredClone(state),payload,`npc-room:${source.expeditionId}:${source.nodeId}`);type='person.resolve-room';
 }else{
  const pending=personRingRequest(state,input);
  if(kind==='person-ring-naming'){
   const {candidates}=await requestRingSkillNarrative(gateway,state,pending.id,signal);
   payload={...input,candidates};namePersonRing(structuredClone(state),payload,`npc-ring-name:${pending.id}`);type='person.name-ring';
  }else{
   if(pending.naming?.source!=='llm-frozen-mechanics-narrative'||pending.naming?.pendingCandidateIds?.length)throw Error('须先完成原候选的命名');
   const p=state.人物.列表[pending.playerId],own=rules.cycle.ringSkillChoiceNamingRequest(state,pending.id,p.id);
   const packet={self:{id:p.id,name:p.name,characterization:storyPersona(state,p),cognition:personCognition(state,p.id)},choice:own};
   const preferred=preferredPersonRingCandidate(state,pending);
   const decision=preferred?{candidateId:preferred.id,reason:'本环预设符合自己的武魂和实际魂环条件，优先领悟这项能力。'}:await gateway.structured([{role:'system',content:'你扮演正在吸收魂环的人物，依据本人武魂、处境和候选实际效果选择一项。只返回JSON {"candidateId":string,"reason":string}，理由1至600字。'},{role:'user',content:JSON.stringify(packet)}],(decision:unknown)=>{choosePersonRing(structuredClone(state),{...input,decision},`npc-ring-choice:${pending.id}`);return decision;},{task:'npc-autonomy',signal,promptStructure:{strict:true}});
   type='person.choose-ring';payload={...input,decision};
  }
 }
 signal.throwIfAborted();return {ticket:issueWorkflowTicket(secret,worldId,snapshot,{type,payload}),value:{stage:kind}};
}
