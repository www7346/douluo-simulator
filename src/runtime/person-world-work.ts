import {pendingPersonContractResponses,pendingPersonContractOrders} from './person-contract';
import {storyCustodyMarketIds} from '../shared/story-custody-market';
import {rules} from '../rules';
import {pendingPersonResearchWork} from './person-research';
import {pendingCooperationResponses} from '../shared/person-cooperation';
import {personRoomRequest,personRingRequest} from './person-expedition';
import {pendingStoryControlledGifts} from '../shared/story-controlled-gifts';
import {pendingNpcRestraintPermissions} from './person-restraint-permission';
import {pendingNpcRescueResponses} from './person-rescue';
import {pendingPersonChangeReactions} from './person-change-reaction';
import {activeHistoricalProjection,projectionRewriteGrant} from '../shared/historical-projection';
import {deferredStoryCommitments} from '../shared/story-commitments';
import {deferredImmediateGifts} from '../shared/story-immediate-gifts';
import {respondStoryCommitment} from './story-commitments';
import {respondImmediateGift} from './story-immediate-gifts';
import {deferredNpcDecisions} from '../shared/npc-autonomy';
import {assertNpcDecisionResponseReady} from './npc-autonomy';

export type PersonWorldWork={kind:'evolution-response'|'person-contract'|'person-contract-order'|'story-social'|'story-autonomy'|'person-conversation'|'person-growth'|'person-growth-allocation'|'person-performance-agreement'|'person-change-reaction'|'person-rewrite'|'person-research-naming'|'person-research-choice'|'person-defeat'|'person-custody-disposition'|'person-restraint-permission'|'person-drug-offer'|'person-ability-use'|'person-rescue-response'|'person-custody-auction'|'person-custody-trade'|'person-gift'|'person-speech-assessment'|'person-cooperation'|'person-loot'|'person-room'|'person-ring-naming'|'person-ring-choice';input:Record<string,any>};
function drugOffers(state:any,ids?:ReadonlySet<string>){return rules.poison.table(state).offers.filter((r:any)=>(!ids||ids.has(r.id))&&!rules.influence.voluntaryReason(state,r.targetId)&&r.targetId!==state.角色.主控单位ID&&!rules.consciousness.carrierForPerson(state,r.targetId)&&r.status==='pending'&&rules.actions.colocated(state,r.actorId,r.targetId)&&(!rules.actions.battleOf(state,r.targetId)||(rules.actions.battleOf(state,r.targetId)?.id===state.战斗.id&&state.战斗.当前行动单位ID===r.targetId))&&state.战斗单位.列表[r.targetId]?.存活状态==='存活'&&state.战斗单位.列表[r.targetId].资源.生命.当前>0&&!rules.controls.active(state,r.targetId).some((st:any)=>['status.sleep','status.stun'].includes(st.模板ID)));}
function abilityRequests(state:any,ids?:ReadonlySet<string>){return rules.world.abilityUseTable(state).requests.filter((r:any)=>(!ids||ids.has(r.id))&&!rules.influence.voluntaryReason(state,r.targetId)&&r.targetId!==state.角色.主控单位ID&&!rules.consciousness.carrierForPerson(state,r.targetId)&&r.status==='pending'&&r.expiresAt>rules.people.now(state)&&rules.actions.colocated(state,r.actorId,r.targetId)&&!rules.actions.battleOf(state,r.targetId)&&state.战斗单位.列表[r.targetId]?.存活状态==='存活'&&state.战斗单位.列表[r.targetId].资源.生命.当前>0&&!rules.controls.active(state,r.targetId).some((s:any)=>['status.sleep','status.stun'].includes(s.模板ID)));}
/** Internal work only: derive waits from their originals, without cloning a second queue. */
export function pendingPersonWorldWork(state:any):PersonWorldWork[]{
 if(activeHistoricalProjection(state))return rules.personRewrite.pending(state).filter((a:any)=>a.actorId!==state.角色.主控单位ID&&projectionRewriteGrant(state,a.id)).map((a:any)=>({kind:'person-rewrite' as const,input:{grantId:a.id}}));
 const result:PersonWorldWork[]=[],turn=state.扩展?.story?.active,storySteps=turn?.status==='resolved'?turn.results??[]:[];
 for(const [immediate,records] of [[false,deferredStoryCommitments(state)],[true,deferredImmediateGifts(state)]] as const)for(const r of records){
  try{const input={deferred:true,...(immediate?{giftId:r.id}:{commitmentId:r.id}),response:{accept:false,reason:'回应通道可行性预检'}};if(immediate)respondImmediateGift(structuredClone(state),input,'preview-social:'+r.id);else respondStoryCommitment(structuredClone(state),input,'preview-social:'+r.id);result.push({kind:'story-social',input:{proposalId:r.id}});}catch{/* Retain the original proposal until the person can actually respond. */}
 }
 for(const job of deferredNpcDecisions(state)){
  try{assertNpcDecisionResponseReady(state,job);result.push({kind:'story-autonomy',input:{requestId:job.id}});}catch{/* Keep a person's original unanswered request until contact is possible. */}
 }
 for(const r of pendingPersonContractResponses(state))result.push({kind:'person-contract',input:{contractId:r.contractId,versionHash:r.versionHash}});
 for(const r of pendingPersonContractOrders(state))result.push({kind:'person-contract-order',input:{orderId:r.orderId,versionHash:r.versionHash,orderRef:r.orderRef}});
 for(const p of rules.evolution.table(state).plans)if(p.status==='proposed')result.push({kind:'evolution-response',input:{planId:p.id}});
 for(const r of rules.personGrowth.pending(state))result.push({kind:'person-growth',input:{requestId:r.id}});
 for(const input of rules.personGrowth.pendingAllocations(state))result.push({kind:'person-growth-allocation',input});
 for(const a of rules.personRewrite.pending(state))if(a.actorId!==state.角色.主控单位ID)result.push({kind:'person-rewrite',input:{grantId:a.id}});
 for(const reaction of pendingPersonChangeReactions(state))result.push({kind:'person-change-reaction',input:{reactionId:reaction.id}});
 const storyCooperation=new Set(storySteps.map((r:any)=>r.receipt?.cooperationId)),storyLoot=new Set(storySteps.map((r:any)=>r.receipt?.commitment?.id));
 const market=storyCustodyMarketIds(state);
 for(const r of rules.custodyAuction.pending(state))if(!market.auctions.has(r.auctionId))result.push({kind:'person-custody-auction',input:r});
 const storyGifts=new Set(pendingStoryControlledGifts(state).map(r=>r.id));
 for(const r of rules.custodyMarket.table(state).offers)if(r.buyerId!==state.角色.主控单位ID&&!market.offers.has(r.id)&&!rules.custodyMarket.responseReason(state,r))result.push({kind:'person-custody-trade',input:{offerId:r.id}});
 for(const r of rules.gifts.records(state))if(r.personId!==state.角色.主控单位ID&&!storyGifts.has(r.id)&&!rules.gifts.responseReason(state,r))result.push({kind:'person-gift',input:{commitmentId:r.id}});
 for(const r of rules.social.speechTable(state).statements)if(r.listenerId!==state.角色.主控单位ID&&!rules.social.speechAssessmentReason(state,r))result.push({kind:'person-speech-assessment',input:{statementId:r.id}});
 for(const r of rules.performanceAgreements.pending(state))if(!(turn?.status==='resolved'&&(turn.results??[]).some((x:any)=>x.receipt?.agreementId===r.id)))result.push({kind:'person-performance-agreement',input:{agreementId:r.id}});
 for(const a of pendingCooperationResponses(state))if(!storyCooperation.has(a.id)&&!rules.cooperation.responseReason(state,a))result.push({kind:'person-cooperation',input:{cooperationId:a.id}});
 for(const r of rules.expedition.loot.pendingResponses(state))if(r.personId!==state.角色.主控单位ID&&!storyLoot.has(r.id)&&!rules.expedition.loot.responseReason(state,r))result.push({kind:'person-loot',input:{commitmentId:r.id}});
 for(const a of rules.expeditionContext.instances(state)){
  if(a.leaderId===state.角色.主控单位ID||a.phase!=='awaiting-narrative')continue;
  const q=a.currentRoom.narrativeRequest,input={expeditionId:a.id,nodeId:q.nodeId,mechanicsHash:q.mechanicsHash};
  try{personRoomRequest(state,input);result.push({kind:'person-room',input});}catch{/* A blocked person retains the original room. */}
 }
 for(const p of Object.values(state.魂环?.待选择??{}) as any[]){
  if(p.playerId===state.角色.主控单位ID||p.status!=='pending')continue;
  const input={pendingId:p.id,mechanicsHash:p.mechanicsHash};
  try{personRingRequest(state,input);result.push({kind:p.naming?.source!=='llm-frozen-mechanics-narrative'||p.naming?.pendingCandidateIds?.length?'person-ring-naming':'person-ring-choice',input});}catch{/* Keep the source; no forced choice or default label. */}
 }
 for(const r of rules.custody.pendingDefeatDecisions(state))result.push({kind:'person-defeat',input:{decisionKey:r.key}});
 for(const r of pendingNpcRescueResponses(state))result.push({kind:'person-rescue-response',input:{decisionKey:r.key}});
 for(const r of pendingNpcRestraintPermissions(state))result.push({kind:'person-restraint-permission',input:{decisionKey:r.key}});
 for(const r of drugOffers(state))result.push({kind:'person-drug-offer',input:{offerId:r.id}});
 for(const r of abilityRequests(state))result.push({kind:'person-ability-use',input:{permissionId:r.id}});
 for(const r of rules.custodyMarket.pendingDispositions(state))result.push({kind:'person-custody-disposition',input:{decisionKey:r.key}});
 result.push(...pendingPersonResearchWork(state));
 for(const job of rules.conversations.pending(state))result.push({kind:'person-conversation',input:{decisionKey:job.key}});
 return result;
}

export function validPersonWorkScope(scope:unknown):scope is 'story'|'background'|undefined{
 return scope===undefined||scope==='story'||scope==='background';
}

/** Both the status query and the worker select jobs from the same revision and scope. */
export function scopedPersonWorldWork(state:any,scope:'story'|'background'|undefined){
 if(scope==='story')return pendingStoryPersonWorldWork(state);
 const active=state.扩展?.story?.active;
 return active&&active.status!=='complete'?[]:pendingPersonWorldWork(state);
}

/** Only actual requests produced by the unfinished player turn block its publication. */
export function pendingStoryPersonWorldWork(state:any,results?:any[]):PersonWorldWork[]{
 if(activeHistoricalProjection(state))return [];
 const turn=state.扩展?.story?.active;if(!results&&turn?.status!=='resolved')return [];
 const receipts:any[]=[];
 const add=(receipt:any,depth=0)=>{if(!receipt||depth>2)return;receipts.push(receipt);if(receipt.type==='field-control-order')add(receipt.settlement,depth+1);if(receipt.type==='combat-action')add(receipt.medicine,depth+1);};
 for(const row of results??turn?.results??[])if(row.status==='succeeded')add(row.receipt);
 const contractIds=new Set<string>(receipts.filter(r=>r.type==='person-contract'&&rules.personContracts.receiptProof(state,r,state.角色.主控单位ID)).map(r=>r.contractId));
 const growthIds=new Set(receipts.filter(r=>r.type==='person-growth-requested').map(r=>r.requestId));
 const agreements=new Set(receipts.filter(r=>r.type==='performance-agreement').map(r=>r.agreementId));
 const drugs=new Set(receipts.filter(r=>r.type==='medicine-operation'&&r.operation==='offer-disguised-drug').map(r=>r.offerId));
 const abilities=new Set(receipts.filter(r=>r.type==='ability-use-requested').map(r=>r.permissionId));
 const requests=new Set(receipts.filter(r=>r.type==='restraint-permission-requested').map(r=>r.requestId));
 const rescues=new Set(receipts.filter(r=>r.type==='person-rescue').map(r=>r.rescueId));
 const result:PersonWorldWork[]=[];
 for(const r of pendingPersonContractResponses(state,contractIds))result.push({kind:'person-contract',input:{contractId:r.contractId,versionHash:r.versionHash}});
 for(const r of pendingPersonContractOrders(state,contractIds))result.push({kind:'person-contract-order',input:{orderId:r.orderId,versionHash:r.versionHash,orderRef:r.orderRef}});
 for(const r of rules.personGrowth.table(state).requests.filter((r:any)=>growthIds.has(r.id)&&r.status==='accepted'&&r.execution?.pendingId)){const p=state.魂环?.待选择?.[r.execution.pendingId];if(!p||p.status!=='pending')continue;const input={pendingId:p.id,mechanicsHash:p.mechanicsHash};try{personRingRequest(state,input);result.push({kind:p.naming?.source!=='llm-frozen-mechanics-narrative'||p.naming?.pendingCandidateIds?.length?'person-ring-naming':'person-ring-choice',input});}catch{}}
 for(const p of rules.evolution.table(state).plans)if(p.status==='proposed'&&receipts.some(r=>r.type==='soul-evolution'&&r.planId===p.id))result.push({kind:'evolution-response',input:{planId:p.id}});
 for(const r of rules.personGrowth.pending(state))if(growthIds.has(r.id))result.push({kind:'person-growth',input:{requestId:r.id}});
 for(const a of rules.personRewrite.pending(state))if(a.actorId!==state.角色.主控单位ID)result.push({kind:'person-rewrite',input:{grantId:a.id}});
 for(const reaction of pendingPersonChangeReactions(state,{story:true}))result.push({kind:'person-change-reaction',input:{reactionId:reaction.id}});
 for(const r of rules.performanceAgreements.pending(state))if(agreements.has(r.id))result.push({kind:'person-performance-agreement',input:{agreementId:r.id}});
 for(const r of drugs.size?drugOffers(state,drugs):[])if(drugs.has(r.id))result.push({kind:'person-drug-offer',input:{offerId:r.id}});
 for(const r of abilities.size?abilityRequests(state,abilities):[])if(abilities.has(r.id))result.push({kind:'person-ability-use',input:{permissionId:r.id}});
 for(const r of requests.size||receipts.some(r=>r.type==='cooperation-preparation')?pendingNpcRestraintPermissions(state,{requestIds:requests,preparationIds:new Set(receipts.filter(r=>r.type==='cooperation-preparation').map(r=>r.preparationId)),sourceIds:new Set(receipts.filter(r=>r.type==='cooperation-preparation').map(r=>r.id))}):[]){
  const related=r.requestEventId?requests.has(r.requestEventId):receipts.some(receipt=>receipt.type==='cooperation-preparation'&&receipt.preparationId===r.preparationId&&rules.preparations.table(state).events.some((event:any)=>event.id===r.originEventId&&event.sourceId===receipt.id));
  if(related)result.push({kind:'person-restraint-permission',input:{decisionKey:r.key}});
 }
 for(const r of rescues.size?pendingNpcRescueResponses(state,rescues):[])if(rescues.has(r.rescueId))result.push({kind:'person-rescue-response',input:{decisionKey:r.key}});
 return result;
}
