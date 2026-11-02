import {rules} from '../rules';
import {pendingNpcRestraintPermissions} from './person-restraint-permission';
import {pendingNpcRescueResponses} from './person-rescue';
import {changeReactionAudience} from './person-change-reaction';
import type {GameCommand} from './contracts';

/** Event visibility is frozen by the verified original command, not its prose. */
export function personEventAudience(state:any,command:GameCommand):string[]|undefined{
 const actual=command.type==='generation.apply'?command.payload.command as GameCommand:command;
 if(!actual.type.startsWith('person.'))return undefined;
 const p=actual.payload as any;
 if(actual.type==='person.respond-contract'||actual.type==='person.respond-contract-order'){const order=actual.type==='person.respond-contract-order'?rules.personContracts.table(state).orders.find((o:any)=>o.id===p.orderId):null,r=rules.personContracts.get(state,order?.contractId??p.contractId);return r?(r.forcedSourceStatusId?[r.proposerId]:r.parties):[];}
 if(actual.type==='person.resolve-conversation')return rules.conversations.audience(state,p);
 if(actual.type==='person.respond-growth'){const r=rules.personGrowth.table(state).requests.find((r:any)=>r.id===p.requestId);return r?[r.actorId,r.personId]:[];}
 if(actual.type==='person.resolve-change-reaction')return changeReactionAudience(state,p);
 if(['person.name-research','person.choose-research'].includes(actual.type)){const actorId=state.研发?.待处理?.[p.pendingId]?.actorId;return actorId?[actorId]:[];}
 if(actual.type==='person.decide-defeat'){
  const r=rules.custody.pendingDefeatDecisions(state).find((r:any)=>r.key===p.decisionKey);if(!r)return [];
  return Object.keys(state.人物.列表).filter(id=>rules.actions.colocated(state,id,r.ownerId)&&rules.social.validCommunicationProof(state,rules.social.communicationProof(state,id),id));
 }
 if(actual.type==='person.decide-restraint-permission'){const r=pendingNpcRestraintPermissions(state).find((r:any)=>r.key===p.decisionKey);return r?[r.ownerId,r.operatorId]:[];}
 if(actual.type==='person.respond-drug-offer'){const r=rules.poison.table(state).offers.find((r:any)=>r.id===p.offerId);return r?[r.actorId,r.targetId]:[];}
 if(actual.type==='person.respond-ability-use'){const r=rules.world.abilityUseTable(state).requests.find((r:any)=>r.id===p.permissionId);return r?[r.actorId,r.targetId]:[];}
 if(actual.type==='person.respond-rescue'){const r=pendingNpcRescueResponses(state).find((r:any)=>r.key===p.decisionKey);return r?[r.ownerId,r.rescuerId]:[];}
 if(actual.type==='person.decide-custody-disposition'){
  const r=rules.custodyMarket.pendingDispositions(state).find((r:any)=>r.key===p.decisionKey);if(!r)return [];
  if(p.decision.kind==='offer')return [r.ownerId,p.decision.buyerId];
  if(['propose-cooperation','impose-cooperation','renew-cooperation','end-cooperation','prepare','recover','close-preparation'].includes(p.decision.kind))return [r.ownerId,r.personId];
  if(['auction','escort','release','house','care','treat','escort-operation','withdraw-and-escort'].includes(p.decision.kind))return Object.keys(state.人物.列表).filter(id=>rules.actions.colocated(state,id,r.ownerId)&&rules.social.validCommunicationProof(state,rules.social.communicationProof(state,id),id));
  return [r.ownerId];
 }
 if(actual.type==='person.decide-custody-auction'){const r=rules.custodyAuction.lot(state,p.auctionId);return r?Object.keys(state.人物.列表).filter(id=>rules.actions.colocated(state,id,r.sellerId)&&rules.social.validCommunicationProof(state,rules.social.communicationProof(state,id),id)):[];}
 if(actual.type==='person.respond-custody-trade'){const r=rules.custodyMarket.offer(state,p.offerId);return r?[r.sellerId,r.buyerId]:[];}
 if(actual.type==='person.respond-gift'){
  const r=rules.gifts.record(state,p.commitmentId);return r?[r.playerId,r.personId]:[];
 }
 if(actual.type==='person.assess-speech'){
  const r=rules.social.speechTable(state).statements.find((r:any)=>r.id===p.statementId);return r?[r.listenerId]:[];
 }
 if(actual.type==='person.respond-performance-agreement'){const r=rules.performanceAgreements.get(state,p.agreementId);return r?[r.authorityId,r.subjectId]:[];}
 if(actual.type==='person.respond-cooperation'){
  const a=rules.cooperation.table(state).agreements.find((a:any)=>a.id===p.cooperationId);return a?[a.leaderId,a.memberId]:[];
 }
 if(actual.type==='person.respond-loot'){
  const r=rules.expedition.loot.pendingResponses(state).find((r:any)=>r.id===p.commitmentId);return r?[r.playerId,r.personId].filter(Boolean):[];
 }
 if(actual.type==='person.resolve-room')return rules.expeditionContext.participantIds(rules.expeditionContext.byId(state,p.expeditionId),{presentOnly:true});
 if(['person.name-ring','person.choose-ring'].includes(actual.type)){const personId=state.魂环.待选择[p.pendingId]?.playerId;return personId?[personId]:[];}
 return [];
}
