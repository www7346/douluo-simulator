import {npcPartnerCandidates} from '../runtime/npc-partner-candidates';
import {residentNarrativeContext} from '../runtime/resident-narrative';
import {npcDeviceOptions} from '../runtime/npc-devices';
import {npcAbilityOptions} from '../runtime/npc-abilities';
import {npcCommerceOptions} from '../runtime/npc-commerce';
import {personCognition,perceivedRelations,remembersRecord} from '../shared/cognition-view';
import {promptMessage} from '../runtime/model-prompt-templates';
import {storyPersona,storyBackgroundContext} from '../runtime/story-personas';
import type {GameSnapshot} from '../runtime/contracts';
import type {ModelGateway} from '../runtime/model-gateway';
import {rules} from '../rules';
import {pendingNpcDecisions,deferredNpcDecisions,npcCollaborationFacts} from '../shared/npc-autonomy';
import {applyNpcDecision,assertNpcDecisionResponseReady,npcDecisionWindow,npcCustodyNewsOptions,npcCustodyDutyOptions,npcIntimateOptions} from '../runtime/npc-autonomy';
import {npcPurchaseOptions} from '../runtime/npc-purchases';
import {npcWorkshopOptions} from '../runtime/npc-research';
import {compileStoryCurrentContext} from '../runtime/story-writing-facts';
import {compileNpcCollaborations} from '../runtime/story-npc-writing-facts';
import {NPC_DECISION_PROTOCOLS,npcDecisionResponseSchema} from './story-npc-contract';
import {storyTurnFacts} from '../runtime/story-turns';
import {compileStoryPrompt,emptyStoryPromptConfig} from '../runtime/story-prompts';
import {issueWorkflowTicket} from './workflow-ticket';
import {checkedStoryRecall,personStoryRecall} from '../shared/story-recall';
import {selectPersonStorySummaries} from '../shared/story-summary';

function prepareGoalOptions(state: any, personId: string) {
 const available = rules.world.intentAvailability(state);
 const destinations = rules.world.npcGoalDestinations(state, personId);
 const supplyOptions = rules.world.npcSupplyOptions(state, personId);
 const expeditionOptions = rules.expedition.npcExpeditionOptions(state, personId);
 const deviceOptions = npcDeviceOptions(state, personId);
 const abilityOptions = npcAbilityOptions(state, personId, available);
 const commerceOptions = npcCommerceOptions(state, personId);
 const purchaseOptions = npcPurchaseOptions(state, personId);
 const workshop = npcWorkshopOptions(state, personId);
 const newsOptions = npcCustodyNewsOptions(state, personId, available);
 const dutyOptions = npcCustodyDutyOptions(state, personId);
 const intimateOptions = npcIntimateOptions(state, personId, available);
 const canLeave = rules.world.partyMembers(state).some((member: any) => member.personId === personId)
   && !rules.world.worldActionBlockReason(state);
 const allowedKinds = [
   'idle',
   ...(deviceOptions.length ? ['device'] : []),
   ...(abilityOptions.length ? ['ability'] : []),
   ...(commerceOptions.length ? ['commerce'] : []),
   ...(dutyOptions.length ? ['permit-custody-duty'] : []),
   ...(newsOptions.recipients.length ? ['tell-custody-news'] : []),
   ...(intimateOptions ? ['intimate'] : []),
   ...(workshop.researchOptions.length ? ['research'] : []),
   ...(workshop.craftOptions.length ? ['craft'] : []),
   ...(purchaseOptions.length ? ['purchase'] : []),
   ...(expeditionOptions.length ? ['expedition'] : []),
   ...(destinations.length ? ['visit', ...(supplyOptions.length ? ['supply-trip'] : [])] : []),
   ...(canLeave ? ['leave-party'] : []),
 ];
 return {
   options: {
     allowedKinds,
     visitWindow: npcDecisionWindow(state, 'visit'),
     supplyWindow: npcDecisionWindow(state, 'supply-trip'),
     expeditionWindow: npcDecisionWindow(state, 'expedition'),
   },
   deviceOptions: deviceOptions.map(({intent, source, ...option}: any) => option),
   abilityOptions: abilityOptions.map(({intent, contract, ...option}: any) => option),
   newsOptions, dutyOptions, intimateOptions, destinations, supplyOptions, expeditionOptions, purchaseOptions, commerceOptions,
   commercialMessages: rules.commerceMessages.facts(state, personId),
   ...workshop,
 };
}

export function prepareNpcAutonomyPrompt(snapshot:GameSnapshot,input:any){
 const state=snapshot.state as any,job=input.requestId?deferredNpcDecisions(state).find(j=>j.id===input.requestId):pendingNpcDecisions(state)[0],turn=state.扩展.story.active;
 if(!job||!input.requestId&&(input.branchId!==state.扩展.story.branchId||input.turn!==turn?.number))throw Error('没有对应的待决定人物打算');
 rules.influence.assertVoluntary(state,job.ownerId);
 if(input.requestId)assertNpcDecisionResponseReady(state,job);
 const person=state.人物.列表[job.ownerId],playerId=state.角色.主控单位ID,operation: keyof typeof NPC_DECISION_PROTOCOLS=job.kind??'goal';
 const cooperation=job.kind==='partner-response'?(state.世界.npcCollaborations??[]).find((r:any)=>r.id===job.collaborationId):null;
 const personalGoal=job.kind==='seek-partner'?state.世界.npcGoals.find((g:any)=>g.id===job.goalId):null;
 // Rank this person's existing memories by the actual delivered contact, not the
 // player's entire turn (which may contain thoughts or speech to someone else).
 const contacts=[...(person.扩展?.交谈意图??[]),...(person.扩展?.听闻记录??[])]
  .filter((r:any)=>r.listenerId===person.id&&r.source.branchId===job.branchId&&r.source.turn===job.turn);
 const rememberedGoal=personalGoal&&remembersRecord(state,person.id,personalGoal),rememberedProposal=cooperation&&remembersRecord(state,person.id,cooperation.events?.[0]??cooperation);
 const topic=(rememberedProposal?cooperation?.motive:null)??(rememberedGoal?personalGoal?.motive:null)??(job.kind==='release-response'?job.text:[...new Set(contacts.filter((r:any)=>remembersRecord(state,person.id,r)).map((r:any)=>r.intent??r.text))].join('\n'));
 // A peer response receives its actual proposal, not the player's turn or inferred presence.
 const facts=job.kind==='partner-response'?{time:state.世界.时间,player:{id:playerId,name:state.人物.列表[playerId].name},location:{id:person.locationId,name:state.地图.地点[person.locationId]?.name},people:[{id:person.id,name:person.name,occupation:person.occupation,characterization:storyPersona(state,person),backgroundContext:storyBackgroundContext(state,person.id)}]}:storyTurnFacts(state,person.id,topic,person.id);
 const context=compileStoryCurrentContext(facts,turn.number,person.id),recall=personStoryRecall(state,person.id,checkedStoryRecall(input.recall,turn.number,person.id)),summaries=selectPersonStorySummaries(state,turn.number,person.id,recall.map(r=>r.source.turn),topic);
 const travelAvailability=cooperation?rules.world.appointmentTravelAvailability(state,cooperation):null;
 const goalOptions = operation === 'goal' ? prepareGoalOptions(state, person.id) : null;
 const audience=cooperation?{channel:'NPC之间实际当面交谈',personIds:[cooperation.initiatorId,person.id]}:{channel:facts.communication?.mode==='soul-device'?'远程魂导通讯':'本人当面说明',personIds:[person.id,playerId]};
 const protocol = goalOptions
   ? Object.fromEntries(Object.entries(NPC_DECISION_PROTOCOLS.goal).filter(([kind]) => goalOptions.options.allowedKinds.includes(kind)))
   : NPC_DECISION_PROTOCOLS[operation];
 const responseSchema=npcDecisionResponseSchema(protocol);
 const packet={operation,context,residentContext:residentNarrativeContext(state,person.id),cognition:personCognition(state,person.id),relationships:perceivedRelations(state,person.id),worldSpeech:rules.social.speechFacts(state,person.id).slice(-8),audience,ownSituation:{personId:person.id,position:rules.actions.positionOf(state,person.id),locationName:rules.interiorSpaces.membership(state,person.id)?.space.name??state.地图.地点[person.locationId]?.name,characterization:storyPersona(state,person),playerRelationship:storyBackgroundContext(state,playerId,person.id)},selfBudget:{gold:state.钱包.列表[person.walletId].gold},recall,summaries,ownCollaborations:compileNpcCollaborations(npcCollaborationFacts(state,person.id)),
  ...goalOptions,
  ...(['goal','seek-partner'].includes(operation)?{candidates:npcPartnerCandidates(state,person.id).map(({id,name,occupation})=>({id,name,occupation}))}:{}),
  ...(job.kind==='release-response'?{request:{text:job.text,captivityId:job.captivityId,createdAt:job.createdAt}}:{}),
  ...(personalGoal&&rememberedGoal?{originalPlan:{destinationId:personalGoal.destinationId,arriveAt:personalGoal.arriveAt,motive:personalGoal.motive}}:{}),
  ...(cooperation?{proposal:{id:cooperation.id,initiatorId:cooperation.initiatorId,initiatorName:state.人物.列表[cooperation.initiatorId].name,locationId:cooperation.locationId,startsAt:cooperation.startsAt,endsAt:cooperation.endsAt,motive:rememberedProposal?cooperation.motive:null},travelAvailability,allowedResponses:travelAvailability.available?[true,false]:[false]}:{})};
 const compiled=compileStoryPrompt(input.prompts??emptyStoryPromptConfig(),{target:'host',trigger:'normal',user:facts.player.name,character:person.name,slots:{main:[
  promptMessage('npc-autonomy'),{role:'system',content:JSON.stringify({responseSchema})}
 ],chatHistory:[{role:'user',content:JSON.stringify(packet)}]}});
 if(compiled.prefill)throw Error('人物打算使用JSON协议，不能使用小说预填充');return {compiled,job};
}
export async function runNpcAutonomyWorkflow(snapshot:GameSnapshot,worldId:string,input:any,gateway:ModelGateway,secret:string,signal:AbortSignal){
 const {compiled,job}=prepareNpcAutonomyPrompt(snapshot,input);
 const validate=(decision:unknown)=>{applyNpcDecision(structuredClone(snapshot.state),{...(input.requestId?{deferred:true}:{branchId:input.branchId,turn:input.turn}),requestId:job.id,decision},`npc-decision:${job.id}`);return decision;};
 const decision=await gateway.structured(compiled.messages,validate,{task:'npc-autonomy',signal,promptStructure:{strict:true}});signal.throwIfAborted();
 return {ticket:issueWorkflowTicket(secret,worldId,snapshot,{type:'story.resolve-npc-goal',payload:{...(input.requestId?{deferred:true}:{branchId:input.branchId,turn:input.turn}),requestId:job.id,decision}}),value:{stage:'npc-autonomy',personId:job.ownerId}};
}
