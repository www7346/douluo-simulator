import type {GameSnapshot} from '../runtime/contracts';
import type {ModelGateway} from '../runtime/model-gateway';
import {pendingPersonChangeReactions,reactionRecipients,personChangeActionViews,ownReactionMemory,resolvePersonChangeReaction} from '../runtime/person-change-reaction';
import {storyPersona} from '../runtime/story-personas';
import {rules} from '../rules';
import {promptMessage} from '../runtime/model-prompt-templates';
import {issueWorkflowTicket} from './workflow-ticket';

export function preparePersonChangeReaction(snapshot:GameSnapshot,input:any){
 if(!input||Object.keys(input).some(key=>key!=='reactionId')||typeof input.reactionId!=='string')throw Error('人物变化回应只接受实际知情待办编号');
 const state=snapshot.state as any,job=pendingPersonChangeReactions(state).find(job=>job.id===input.reactionId);
 if(!job)throw Error('没有该人物当前可以察觉的未回应变化');
 const person=state.人物.列表[job.observerId];
 const packet={time:state.世界.时间,self:{id:person.id,name:person.name,characterization:storyPersona(state,person)},perceivedChange:job.experience,ownReactionMemory:ownReactionMemory(state,person.id),relationships:(globalThis as any).SoulPersonChangeKnowledge?.safeRelations(state,person.id)??[],heardStatements:rules.social.speechFacts(state,person.id).slice(-8),listeners:reactionRecipients(state,person.id),actionOptions:personChangeActionViews(state,job)};
 return {job,messages:[promptMessage('person-change-reaction'),{role:'user' as const,content:JSON.stringify(packet)}]};
}
export async function runPersonChangeReactionWorkflow(snapshot:GameSnapshot,worldId:string,input:any,gateway:ModelGateway,secret:string,signal:AbortSignal){
 const {job,messages}=preparePersonChangeReaction(snapshot,input);
 const decision=await gateway.structured(messages,(decision:any)=>{resolvePersonChangeReaction(structuredClone(snapshot.state),{reactionId:job.id,decision},'change-response:'+job.id);return decision;},{task:'person-change-reaction',signal,promptStructure:{strict:true}});
 signal.throwIfAborted();
 return {ticket:issueWorkflowTicket(secret,worldId,snapshot,{type:'person.resolve-change-reaction',payload:{reactionId:job.id,decision}}),value:{stage:'person-change-reaction',personId:job.observerId}};
}
