import {storyResourceChanges as resourceChanges} from '../shared/story-result-changes';
import {CONTRACT_RECEIPT_TYPES,compileContractReceipt,compileContractView,compileContractObservation,contractPenaltyAccount} from './story-contract-writing-facts';
import {compileFieldOperation,FIELD_CONTROL_RECEIPT_TYPES} from './story-field-control-writing-facts';
import {authoredDescription} from './player-copy';
import {compileSealingReceipt,SEALING_RECEIPT_TYPES} from './story-sealing-writing-facts';
import {storyInteractionContinuity,storyEncounterKnowledge} from './story-encounter-knowledge';
import type {StoryTurn,StoryStepResult} from './story-turns';
import {compileStoryBattleNarrative} from './story-battle-narrative';
import {storyBattleConclusion} from './story-battle-conclusion';
import {compileStoryCheckReceipt,STORY_CHECK_RECEIPT_FIELDS} from './story-check-writing-facts';
import {compileGrowthEquipmentReceipt,GROWTH_EQUIPMENT_RECEIPT_FIELDS} from './story-growth-equipment-writing-facts';
import {compileCommerceReceipt,compileCommerceContext,COMMERCE_RECEIPT_FIELDS} from './story-commerce-writing-facts';
import {compileItemUseReceipt,ITEM_USE_RECEIPT_TYPES} from './story-item-use-writing-facts';
import {compileWorkshopReceipt,compileWorkshopContext} from './story-workshop-writing-facts';
import {compileTimeReceipt,compileLongActionContext,TIME_RECEIPT_FIELDS} from './story-time-writing-facts';
import {compileSocialReceipt,compileCommitment,SOCIAL_RECEIPT_FIELDS} from './story-social-writing-facts';
import {compileNpcReceipt,compileNpcGoal,compileNpcCollaborations,compileNpcPlans,compileRelease,NPC_RECEIPT_FIELDS} from './story-npc-writing-facts';
import {compileObjectReceipt,compileObjectContext,OBJECT_RECEIPT_FIELDS} from './story-object-writing-facts';
import {compileCommunicationReceipt,compileCommunicationContext,COMMUNICATION_RECEIPT_FIELDS} from './story-communication-writing-facts';
import {compileHistoryReceipt,compileHireAgreement,compileSharedEvent,compileNpcRequest,compileCityEvent,HISTORY_RECEIPT_FIELDS} from './story-history-writing-facts';
import {compileDossierReceipt,compileDossier,compileMechanicalRegistration,compileEraBasis,compileOwnedItems,compileOwnedAbilities,compileOwnedSouls,compileOwnedRings} from './story-person-writing-facts';
import {compileRingReceipt,compileRingContext} from './story-ring-writing-facts';
import {compileAdventureReceipt,compileExpeditionContext,compilePartyContext,adventureEventAccount,ADVENTURE_RECEIPT_FIELDS} from './story-adventure-writing-facts';
import {compileOpeningReceipt,compileOpeningSituation,compileOpeningGuidance,OPENING_RECEIPT_FIELDS} from './story-opening-writing-facts';
import {compileActionState} from './story-state-writing-facts';
import {storyBoundBattleView} from '../shared/story-bound-battle';
import {storyEventAccount} from './story-event-account';
import {STORY_QUERY_ACTIONS} from './story-action-semantics';
import {storyWritingPersonReferences} from './story-writing-person-scope';
import {storyWorldAfterTurn} from './story-writing-time-scope';
import {storyTurnPeople,storyPersonObservations,storyObjectObservations} from '../shared/story-event-context';
import {storyEventNames} from './story-event-names';
import {storyBattleBackgroundObservation} from './story-battle-background';
import {relationshipPresentation} from '../shared/cognition-view';

/** Frozen rule results only. This module never executes actions or reads generated prose. */
const LABEL_GROUPS:Record<string,string[]>={
 契约:['propose-person-contract','respond-person-contract','retry-person-contract','end-person-contract','declare-person-contract-breach','issue-person-contract-order','decline-person-contract-order','form-controlled-contract','withdraw-control-source'],
 封存:['permit-seal','revoke-seal-permission','seal-person','awaken-seal','open-seal','strike-seal-device','seize-seal-device','transfer-seal-control','await-seal-release'],
 商事:['inspect-commerce','trade-commerce-material','start-curated-auction','start-asset-auction','bid-asset-auction','register-auction-proxy','cancel-auction-proxy','take-auction-proxy','take-asset-auction-host','cancel-asset-auction','relist-asset-auction','collect-auction-item','ship-shop-auction','set-commerce-subscription','read-commerce-message','reply-commerce-message'],
 药剂:['prepare-poisoned-serving','offer-disguised-drug','respond-disguised-drug','consume-food-drink','coat-item','apply-contact-drug','direct-spray','release-toxic-cloud','touch-coated-item'],
 战败与看管:['request-person-growth','set-realm-arrangement','reshape-realm','arrange-realm-resident','end-realm-visit','move-realm-guest','set-resident-permissions','reward-resident','punish-resident','propose-performance-agreement','respond-performance-agreement','end-performance-agreement','deploy-resident','recall-resident','discuss-resident-tactics','propose-custody-transfer','respond-custody-transfer','cancel-custody-transfer','start-custody-auction','bid-custody-auction','pass-custody-auction','cancel-custody-auction','issue-field-control','use-field-ability','stop-maintenance','dismiss-disguise','inspect-disguise','disclose-identity','request-ability-use','respond-ability-use','prepare-cooperation-battle','recover-cooperation-restraints','close-cooperation-preparation','propose-person-cooperation','respond-person-cooperation','impose-person-cooperation','end-person-cooperation','resume-person-cooperation','observe-custody-person','tell-custody-news','send-custody-letter','acquire-custody-facility','visit-custody-cell','set-custody-cell-door','repair-custody-facility','admit-captive','place-captive','withdraw-captive','permit-custody-duty','assign-custody-guard','end-custody-duty','start-custody-escort','pause-custody-escort','resume-custody-escort','cancel-custody-escort','captive-daily','person-duel','capture-person','spare-person','execute-person','search-captive','release-captive','set-restraint-mode','detach-restraint','attach-restraint','permit-restraint','request-restraint-permission','revoke-restraint-permission','respond-restraint-permission-request'],
 赛事:['register-competition','competition-match','competition-withdraw'],
 工坊查询:['inspect-workshop','recommend-research','preview-research','inspect-research','preview-craft','quote-material-sale','quote-item-sale'],
 工坊结算:['begin-research','choose-research','craft-blueprint','sell-material','sell-item'],
 魂环:['inspect-ring','prepare-ring','inspect-ring-item','prepare-ring-item','inspect-ring-choices','choose-ring'],
 成长:['inspect-growth','allocate-growth'],
 人物决定:['consider-person-goal','answer-person-plan','ask-release','respond-npc-request'],
 社会交互:['promise-gold','promise-item','give-gold','give-item','invite','invite-date','fulfill-promise','cancel-promise','attend-invitation','exchange-contact','propose-loot','propose-loot-resolution','collect-loot','invite-party','end-party','propose-relationship','respond-person-relation','end-relationship'],
 交谈:['tell-person','address-person','tell-party'],
 查询:['inspect-inventory','city-history','check-history','person-history','resolve-person','resolve-object','inspect-person','quote-hire'],
 对象记录:['remember-object','instantiate-item','introduce-person','label-person','meet'],
 时间与移动:['travel','wait-until','wait-until-date','cultivate','resume-long-action','abandon-long-action','escape-captivity'],
 财物与装备:['device.lock','device.unlock','device.suppress-lock','device.break-rule','device.analyze-lock','device.create-key','device.arcane-lock','intimate-craft','intimate-equip','intimate-detach','host.set-suppression','host.set-form','host.set-appearance','recover','recover-party','buy','sell','equip','unequip','use-item','switch-soul','retract-martial-soul','restrain-desire','break-restraint','store-item','retrieve-item','loot-item','loot-coins','use-prebattle-pill','supply-buy','create-support-consumable'],
 冒险与队伍:['world-event','hire','dismiss','battle-strategy','enter-room','extract-expedition','use-camp','open-chest','harvest-beast','harvest-beasts','start-expedition','bargain-hire','accept-hire-offer','spar','choose-guide'],
 开局:['opening-situation','opening-guidance','inspect-opening'],
 自由检定:['attribute-check','opposed-check','free-action'],
 战报:['battle-report'],战斗行动:['battle-action'],叙述:['describe'],澄清:['clarify'],
};
export const STORY_WRITING_ACTION_GROUPS=Object.freeze(Object.fromEntries(Object.entries(LABEL_GROUPS).flatMap(([label,actions])=>actions.map(a=>[a,label]))));
const copy=<T>(v:T):T=>structuredClone(v);
const pick=(v:any,keys:string[])=>Object.fromEntries(keys.filter(k=>v&&Object.hasOwn(v,k)).map(k=>[k,copy(v[k])]));
function participantRelationships(person:any,playerId:string){
 if(person.relationship)person.relationship=relationshipPresentation(person.relationship,playerId,person.id);
 if(person.backgroundContext?.relationship)person.backgroundContext.relationship=relationshipPresentation(person.backgroundContext.relationship,playerId,person.id);
 if(person.characterization?.relationshipToPlayer)person.characterization.relationshipToPlayer=relationshipPresentation(person.characterization.relationshipToPlayer,person.id,playerId);
 if(Array.isArray(person.relationships))person.relationships=person.relationships.map((relation:any)=>relationshipPresentation(relation,person.id,relation.personId));
 return person;
}
const statusNames={succeeded:'执行成功',failed:'执行失败',skipped:'未执行',described:'叙述性互动',clarify:'待澄清'};
const people=(f:any)=>[f?.player,...(f?.people??[])].filter((v:any)=>v?.id);

export interface WritingChange {subjectId:string;subjectName:string;field:string;before:unknown;after:unknown;delta?:number;statement:string}
export interface WritingEvent {step:number;group:string;action:string;status:string;source:{receiptType:string|null;actorId:string|null;receiptId:string|null};occurrence?:{before:{time:any;location:any};after:{time:any;location:any}};query?:{readerId:string|null;communicationOccurred:false};intent:string;statement:string;facts:Record<string,any>}
export interface StoryWritingFacts {version:1;turn:number;scene:Record<string,any>;participants:any[];events:WritingEvent[];changes:WritingChange[];continuity:Record<string,any>;pending:Record<string,any>}

/** A readable account of the already recorded decision, not another decision generator. */
function npcEventStatement(turn:StoryTurn,facts:Record<string,any>,receiptType:string):string{
 const participants=storyTurnPeople(turn).map(o=>o.person);
 const person=(id:string|null)=>participants.find(p=>p.id===id)?.name??id??'人物';
 const parts:string[]=[],actor=person(facts.actorId),goal=facts.goal;
 if(facts.deliveredContact)parts.push(`${person(facts.deliveredContact.speakerId)}已向${actor}表达：${facts.deliveredContact.interactionIntent}。`);
 if(facts.deliveredContact&&!goal)parts.push(`${actor}：${facts.stage}。`);
 if(goal){
  const decidedThisTurn=receiptType!=='npc-goal-existing'&&goal.turn===turn.number;
  const at=goal.createdAt;
  const recordedAt=at&&[at.day,at.hour,at.minute].every(Number.isInteger)?`第${at.day}天${at.hour}时${at.minute}分`:null;
  parts.push(`${actor}${decidedThisTurn?'本次作出决定：':'已记录的安排：'}${goal.decision}。${recordedAt?`这项决定形成于${recordedAt}。`:''}当时的本人理由：${goal.motive}`);
  if(!decidedThisTurn)parts.push(`本次读取原安排，未形成新的目标决定。`);
  if(goal.plannedVisit){
   const visit=goal.plannedVisit,time=visit.arriveAt;
   const locations=[turn.before?.location,turn.after?.location,...(turn.before?.huntingDestinations??[]),...(turn.after?.huntingDestinations??[])];
   const destination=locations.find(p=>p?.id===visit.destinationId)?.name??visit.destinationId;
   parts.push(`计划目的地为${destination}，计划到达时间为第${time.day}天${time.hour}时${time.minute}分。`);
  }
  if(goal.playerInvitation)parts.push(goal.playerInvitation.issued?`向玩家发出的会面邀约：${goal.invitation.stage}。`:`这项安排没有向玩家发出会面邀约。`);
 }
 if(facts.answeredInvitation)parts.push(`玩家对邀约的实际回应结果：${facts.answeredInvitation.stage}。`);
 if(Object.hasOwn(facts,'released'))parts.push(`${actor}的回应结果：${facts.stage}。本人理由：${facts.reason}`);
 if(facts.decision)parts.push(`${actor}${facts.decision}。本人理由：${facts.reason}`);
 for(const decision of facts.partnerDecisions??[])parts.push(`${person(decision.personId)}${decision.decision}。本人理由：${decision.reason}`);
 return parts.length?parts.join('\n'):`${actor}：${facts.stage}`;
}
type BattleSourceCollector=(step:number,sources:ReturnType<typeof compileStoryBattleNarrative>['sources'])=>void;
function compileEvent(turn:StoryTurn,r:StoryStepResult,narrative=true,onBattleSource?:BattleSourceCollector):WritingEvent{
 // A completed battle may be attached to an earlier action when a deferred plan resumes.
 // Compile that action and its battle independently, retaining both actual time stages.
 const report=r.receipt?.report;
 if(report)r={...r,receipt:Object.fromEntries(Object.entries(r.receipt!).filter(([key])=>key!=='report'))};
 const a=r.action,group=STORY_WRITING_ACTION_GROUPS[a.kind];if(!group)throw Error(`写作事实缺少行动编译：${a.kind}`);
 const observation=compileContractObservation(r.receipt?.personContracts);if(r.receipt?.personContracts)r={...r,receipt:Object.fromEntries(Object.entries(r.receipt).filter(([key])=>key!=='personContracts'))};
 const c=r.receipt,actorId=typeof a.actorId==='string'?a.actorId:turn.after?.player?.id??null;
 const event:WritingEvent={step:r.step,group,action:a.kind,status:statusNames[r.status],source:{receiptType:c?.type??null,actorId,receiptId:c?.id??c?.sourceId??null},intent:r.source,statement:r.reason??'',facts:{}};
 if(r.context)event.occurrence={before:pick(r.context.before,['time','location']) as any,after:pick(r.context.after,['time','location']) as any};
 if(turn.partyChat||turn.results.some(s=>s.action.kind==='tell-party')){
  const delivered=turn.results.find(s=>s.receipt?.type==='party-message-sent')?.receipt?.message;
  event.intent=delivered?.text??'';
 }
 if(!c){
  if(r.status==='succeeded')throw Error(`写作事实缺少已成功行动回执：${a.kind}`);
  if(r.status==='failed'||r.status==='skipped'){
   event.facts={stage:'本步骤未执行',actorId,requestedAction:a.kind,requested:Object.fromEntries(Object.entries(a).filter(([key])=>['characterId','targetId','targetIds','itemId','itemStep','characterStep','facilityId','cellId','destinationId','locationId','mode','slot','quantity','templateId','skillId'].includes(key))),...(r.condition?{condition:copy(r.condition)}:{}),reason:r.reason??null,recordedResult:null};
    event.statement=`这次${r.status==='skipped'?'安排暂未进行':'行动没能完成'}${r.reason?`：${r.reason.replace(/[。；]+$/u,'')}`:''}。`;
  }else if(r.status==='described'){
   // A host's interpretation is not an observation, inventory query or settled result.
   // Keep that interpretation in the original turn evidence, outside the author's facts.
   event.statement='玩家的叙述意图已保留，本步骤没有执行规则行动或查询';
   event.facts={stage:'叙述意图',recordedResult:null};
   if(a.mode==='daily'){event.statement='本段按街市与生活场景叙写，当场享用。';event.facts={stage:'日常生活片段',scope:'场景中的一次性消费',resourceChanges:[],participant:a.characterId??null};}
  }else if(!event.statement)event.statement=r.status==='clarify'?'本步骤等待澄清':'本步骤未完成';
  return event;
 }
 if(typeof c.type!=='string')throw Error(`写作事实回执类型缺失：${a.kind}`);
 event.statement=typeof c.summary==='string'?c.summary:typeof r.reason==='string'?r.reason:`${group}的实际结果已记录`;
 if(CONTRACT_RECEIPT_TYPES.includes(c.type)){event.facts=compileContractReceipt(turn,r);event.statement=event.facts.stage;}
 else if(Object.hasOwn(STORY_CHECK_RECEIPT_FIELDS,c.type)){
  event.facts=compileStoryCheckReceipt(c);event.source.actorId=event.facts.actorId;
  event.statement=c.type==='story-free-action'?`局部行动${event.facts.result}，耗时、检定与现场叙事记录已确定`:`${event.facts.attribute}检定${event.facts.outcome}`;
 }
 else if(Object.hasOwn(GROWTH_EQUIPMENT_RECEIPT_FIELDS,c.type)){
  event.facts=compileGrowthEquipmentReceipt(turn,r);event.source.actorId=event.facts.actorId;event.statement=event.facts.stage;
 }
 else if(Object.hasOwn(COMMERCE_RECEIPT_FIELDS,c.type)||c.type==='workshop-inspected'&&['quote-material-sale','quote-item-sale'].includes(c.operation)){
  event.facts=compileCommerceReceipt(turn,c);event.source.actorId=event.facts.actorId;event.statement=event.facts.stage;
 }
 else if(SEALING_RECEIPT_TYPES.includes(c.type)){event.facts=compileSealingReceipt(turn,r);event.source.actorId=event.facts.actorId;}
 else if(FIELD_CONTROL_RECEIPT_TYPES.includes(c.type)){event.facts=compileFieldOperation(turn,r);event.source.actorId=event.facts.actorId;event.statement=event.facts.stage;}
 else if(ITEM_USE_RECEIPT_TYPES.includes(c.type)){
  event.facts=compileItemUseReceipt(c);event.source.actorId=event.facts.actorId;event.statement=event.facts.stage;
 }
 else if(Object.hasOwn(TIME_RECEIPT_FIELDS,c.type)){
  event.facts=compileTimeReceipt(turn,c);event.source.actorId=event.facts.actorId;event.statement=event.facts.stage;
 }
 else if(Object.hasOwn(SOCIAL_RECEIPT_FIELDS,c.type)){
  event.facts=compileSocialReceipt(c);event.statement=event.facts.stage;
 }
 else if(Object.hasOwn(NPC_RECEIPT_FIELDS,c.type)){
  event.facts=compileNpcReceipt(c);event.source.actorId=event.facts.actorId;event.statement=npcEventStatement(turn,event.facts,c.type);
 }
 else if(Object.hasOwn(OBJECT_RECEIPT_FIELDS,c.type)){
  event.facts=compileObjectReceipt(c);event.statement=event.facts.stage;
 }
 else if(Object.hasOwn(COMMUNICATION_RECEIPT_FIELDS,c.type)){
  event.facts=compileCommunicationReceipt(c);event.source.actorId=event.facts.speakerId??actorId;event.statement=event.facts.stage;
 }
 else if(Object.hasOwn(HISTORY_RECEIPT_FIELDS,c.type)){
  event.facts=compileHistoryReceipt(c);event.statement=event.facts.stage;
 }
 else if(Object.hasOwn(ADVENTURE_RECEIPT_FIELDS,c.type)){
  event.facts=compileAdventureReceipt(c);event.source.actorId=event.facts.actorId??actorId;
  const names=storyEventNames(turn,r,event.source.actorId),person=(id:string)=>[...storyTurnPeople(turn).map(o=>o.person),...(turn.after?.battle?.participants??[])].find(p=>p.id===id)?.name??id??'人物';
  event.statement=adventureEventAccount(c.type,event.facts,person(event.source.actorId!),person,names.soul,names.item);
 }
 else if(c.type==='stock-by-name'){event.facts={stage:'本地货架查询',itemName:c.itemName,inStock:c.available,offers:c.matches};event.statement=c.summary;}
 else if(Object.hasOwn(OPENING_RECEIPT_FIELDS,c.type)){event.facts=compileOpeningReceipt(c);event.statement=event.facts.stage;}
 else if(['set-realm-arrangement','reshape-realm','arrange-realm-resident','end-realm-visit','move-realm-guest','set-resident-permissions','reward-resident','punish-resident','resident-deployed','resident-recalled','resident-tactics','performance-agreement'].includes(c.type)){event.facts={stage:c.summary,...pick(c,['actorId','targetId','realmId','result','obedience','agreementId','action','status','terms','deploymentId','unitId','mode','percent','cost','text','reservePercent'])};}
 else if(c.type==='person-dossier'){event.facts=compileDossierReceipt(c);event.statement=event.facts.stage;}
 else if(group==='魂环'){event.facts=compileRingReceipt(turn,r);event.statement=event.facts.stage;event.source.actorId=event.facts.actorId??actorId;}
 else if(group==='工坊查询'||group==='工坊结算'){event.facts=compileWorkshopReceipt(turn,r);event.source.actorId=event.facts.actorId??null;event.statement=event.facts.stage;}
 else if(c.type==='combat-action'){event.facts={actorId:c.actorId,battleId:c.battleId,actionId:c.actionId,stage:'本人本次战斗行动已结算'};}
 else if(c.type==='battle-report'&&report){
  const unknown=Object.keys(c).filter(key=>!['type','id','transactionType','summary'].includes(key));
  if(unknown.length)throw Error(`战报查询缺少字段编译：${unknown.join(',')}`);
  event.facts={};
 }
 else throw Error(`写作事实缺少回执编译：${a.kind}/${c.type}`);
 if(observation)event.facts.contractObservation=observation;
 const account=storyEventAccount(a.kind,c.type,event.facts,storyEventNames(turn,r,event.source.actorId),!narrative);
 if(account!==null)event.statement=account;
 else if(!Object.hasOwn(NPC_RECEIPT_FIELDS,c.type)&&!Object.hasOwn(ADVENTURE_RECEIPT_FIELDS,c.type)&&c.type!=='battle-report')throw Error(`实际事件经过缺少编译：${c.type}`);
 if(observation?.penalties.length)event.statement+=observation.penalties.map((p:any)=>contractPenaltyAccount(p,storyEventNames(turn,r,event.source.actorId))).join('');
 if(report){
  const compiledBattle=compileStoryBattleNarrative(report);
  event.facts.battle=compiledBattle.facts;onBattleSource?.(r.step,structuredClone(compiledBattle.sources));event.statement+='\n'+storyBattleConclusion(event.facts.battle);
  const observation=storyBattleBackgroundObservation(turn,r,report);
  event.facts.battleBackground=observation?{source:observation.source,...compileStoryCurrentContext(observation.facts,turn.number)}
   :{source:{kind:'unrecorded',battleId:report.id,scope:'没有留存可证明早于战斗行动的世界背景；战斗经过仍按实际回执编译'}};
 }
 if(r.status==='succeeded'&&STORY_QUERY_ACTIONS.includes(a.kind)&&!(a.kind==='quote-hire'&&c.type==='commitment-proposed')){
  const reader=turn.after?.player??turn.before?.player;
  event.query={readerId:reader?.id??null,communicationOccurred:false};
  if(narrative)event.statement=`${reader?.id?`${reader.name??reader.id}本人查看已有资料`:'本次查询返回已有资料，查看者身份未记录'}，本步骤没有向人物传话。\n${event.statement}`;
 }
 event.statement=authoredDescription(event.statement);
 return event;
}

/** The same settled answers, without writer-only context or unrelated participant dossiers. */
export function compileStoryFeedbackEvents(turn:StoryTurn){return turn.results.map(r=>compileEvent(turn,r,false));}

/** A worn device can remain attached after its restraint effects stop. */
function compileHeldCustody(r:any){
 return {...pick(r,['id','personId','personName','captorId','captorName','custodianId','custodianName','arrangement','position','canRelease','power']),
  devices:(r.devices??[]).map((d:any)=>({...copy(d),effectReading:d.durability===0
   ?'器具已经损坏；其禁声、肢体拘束及封印效果不再生效，器具仍戴在身上。'
   :d.mode==='released'
    ?'器具已解放，暂时不限制行动，仍戴在身上。'
    :'器具仍在限制行动，可用动作见当前人物状态。'}))};
}
/** Independent NPC decisions consume known events, not the narrator's object-reference index. */
export function compileStoryCurrentContext(facts:Record<string,any>,turnNumber:number,observerId=facts.player?.id){
 const {narrativeObjects:references,...knownFacts}=facts;
 const compiled=compileStoryWritingFacts({number:turnNumber,input:'',status:'resolved',results:[],before:knownFacts,after:knownFacts},observerId);
 return {scene:compiled.scene.after,participants:compiled.participants,continuity:compiled.continuity,pending:compiled.pending};
}
export function compileStoryWritingFacts(turn:StoryTurn,observerId=turn.privatePersonId??turn.after?.player?.id??turn.before?.player?.id,onBattleSource?:BattleSourceCollector):StoryWritingFacts{
 turn=storyBoundBattleView(turn);
 if(!turn.before||!turn.after||turn.status==='planning')throw Error('写作事实需要已经结算的冻结回合');
 const before=turn.before,after=turn.after;
 const time=(f:any)=>({value:copy(f.time??null),label:f.calendar?.label??null});
 const minutes=(v:any)=>v&&[v.day,v.hour,v.minute].every(Number.isInteger)?v.day*1440+v.hour*60+v.minute:null;
 const start=minutes(before.time),end=minutes(after.time);if(start!==null&&end!==null&&end<start)throw Error('写作事实时间倒退');
 const events=turn.results.map(r=>compileEvent(turn,r,true,onBattleSource));
 const changes=resourceChanges(turn);
 const battleOnly=turn.results.length>0&&turn.results.every(r=>r.action.kind==='battle-report'&&r.receipt?.report);
 const battleWriting=battleOnly||Boolean(turn.battleId&&events.some(e=>e.facts.battle?.id===turn.battleId));
 const battlePeople=battleWriting?storyWritingPersonReferences(events,changes,turn.results.map(r=>r.action)):null;
 if(battlePeople&&turn.privatePersonId)battlePeople.add(turn.privatePersonId);
 // The world location remains the expedition entrance; it does not put everyone
 // registered there inside the current room. Keep full profiles in the frozen source.
 const expeditionPeople=after.expedition&&Array.isArray(after.expedition.companions)?new Set([after.player?.id,...after.expedition.companions.map((c:any)=>c.personId??c.unitId)]):null;
 const references=storyWritingPersonReferences(events,changes,turn.results.map(r=>r.action));
 const selectedPeople=storyTurnPeople(turn).filter(({person:p})=>(p.scope!=='resident-known'||references.has(p.id)||turn.privatePersonId===p.id)).filter(({person:p})=>battlePeople?battlePeople.has(p.id):!expeditionPeople||expeditionPeople.has(p.id)||references.has(p.id));
 const currentPeople=selectedPeople.map(o=>o.person);
 const participants=currentPeople.map(p=>({...participantRelationships(pick(p,['scope','id','name','playerLabels','identity','occupation','personality','characterization','backgroundContext','cognition','relationships','changeInteractions','eraBasis','locationId','level','lifeStatus','resources','relationshipScore','relationship','partyMembership','soulContactId','canonicalId','preparedPills','gold','membershipKind','speechStyle','communication','escortService','hireAvailability','lastHireInquiry','lastHireOffer']),after.player?.id??before.player?.id),
  ...(p.rank?{rank:pick(p.rank,['name','allowedTitles'])}:{}),
  ...(p.abilities?{abilities:compileOwnedAbilities(p.abilities)}:{}),
  ...(p.martialSouls?{martialSouls:compileOwnedSouls(p.martialSouls)}:{}),
  ...(p.ownedRings?{ownedRings:compileOwnedRings(p.ownedRings)}:{}),
  ...(p.actionState?{actionState:compileActionState(p.actionState)}:{}),
  ...(p.items?{items:compileOwnedItems(p.items)}:{}),
  ...(p.mechanics?{registration:compileMechanicalRegistration(p.mechanics)}:{}),
  ...(p.eraBasis?{eraBasis:compileEraBasis(p.eraBasis)}:{}),
  ...(p.lastEncounter?{lastEncounter:{scope:'上次实际相遇的旧档案',dossier:compileDossier(p.lastEncounter)}}:{})}));
 // Frozen facts can outlive the call that collected them. Apply the actual
 // audience without mutating their stored source or erasing the owner's memory.
 for(const person of participants){
  const characterization=person.characterization;
  if(!characterization||person.id===observerId)continue;
  delete characterization.personalSettings;
  if(characterization.personalExperience?.ownerId!==observerId)delete characterization.personalExperience;
 }
 for(const [index,observed] of selectedPeople.entries())if(observed.source.step!==undefined||observed.source.snapshot==='before')Object.assign(participants[index],{observation:{scope:'本轮较早行动时的已知资料',...copy(observed.source)}});
 if(battleWriting)for(const person of participants)Object.assign(person,{afterTurn:storyWorldAfterTurn(person,after.time)});
 // An event's received query is its full answer. Other profiles remain just the relevant present people.
 const continuity=pick(after,['residentContext','communication','personalKnowledge','personalContacts','partyConversation','narrativeObjects','npcCollaborations','releaseResponses','openingSituations','openingGuidance','inventory','materials','freeActions','captivity']);
 if(after.personContracts)continuity.personContracts=after.personContracts.map(compileContractView);
 Object.assign(continuity,compileCommunicationContext(after));
 if(after.party)continuity.party=compilePartyContext(after.party);
 if(after.commerce)continuity.commerce=compileCommerceContext(after.commerce);
 if(after.openingSituations)continuity.openingSituations=after.openingSituations.map(compileOpeningSituation);
 if(after.openingGuidance)continuity.openingGuidance=compileOpeningGuidance(after.openingGuidance);
 if(after.releaseResponses)continuity.releaseResponses=after.releaseResponses.map(compileRelease);
 if(after.custody)continuity.custody={auctions:copy(after.custody.auctions??[]),trades:copy(after.custody.trades??[]),gifts:copy(after.custody.gifts??[]),fieldOrders:copy(after.custody.fieldOrders??[]),preparations:copy(after.custody.preparations??[]),cooperations:copy(after.custody.cooperations??[]),brokenDevices:copy(after.custody.brokenDevices??[]),rescues:copy(after.custody.rescues??[]),social:copy(after.custody.social??null),logistics:copy(after.custody.logistics??null),permissions:copy(after.custody.permissions??[]),pendingDefeats:after.custody.defeats.map((r:any)=>pick(r,['id','targetId','targetName','available','reason'])),held:after.custody.held.map(compileHeldCustody)};
 if(after.custody?.sealing)continuity.custody.sealing=copy(after.custody.sealing);
 if(after.abilityUseRequests)continuity.abilityUseRequests=copy(after.abilityUseRequests);
 if(after.captivity)continuity.captivity={stage:'实际拘押限制仍在',...pick(after.captivity,['id','actorId','captorId','captorName','captorRole','custodianId','custodianName','custodianRelationship','sourceId','locationId','since','guarded','text']),escapeAttempt:{choices:copy(after.captivity.choices),minutes:after.captivity.attemptMinutes}};
 if(after.freeActions)continuity.freeActions={current:copy(after.freeActions.current??[]),recent:(after.freeActions.recent??[]).map(compileStoryCheckReceipt)};
 if(after.npcCollaborations)continuity.npcCollaborations=compileNpcCollaborations(after.npcCollaborations);
 if(after.narrativeObjects)continuity.narrativeObjects=compileObjectContext(after.narrativeObjects);
 if(after.cityStages)continuity.cityStages=after.cityStages.map((c:any)=>({...pick(c,['locationId','name','merchantId','currentBusiness']),totalKnown:c.totalKnownEvents,observedEvents:c.events.map(compileCityEvent)}));
 const histories:Record<string,any>[]=currentPeople.map(p=>({personId:p.id,...pick(p,['commitments','recentEndedCommitments','history','recentCompanionAgreements','recentSharedEvents','sharedBattleEncounters'])}));
 for(const person of histories)for(const field of ['commitments','recentEndedCommitments'])if(Array.isArray(person[field]))person[field]=person[field].map(compileCommitment);
 for(const person of histories){
  if(person.recentCompanionAgreements)person.recentCompanionAgreements=person.recentCompanionAgreements.map(compileHireAgreement);
  if(person.recentSharedEvents)person.recentSharedEvents=person.recentSharedEvents.map(compileSharedEvent);
  if(person.history)person.history={retainedCounts:copy(person.history.counts),unresolvedAgreements:person.history.unresolvedAgreements.map(compileHireAgreement),unresolvedCommitments:person.history.unresolvedCommitments.map(compileCommitment)};
 }
 continuity.people=histories;
 const prior=storyInteractionContinuity(turn);
 if(prior)continuity.priorInteractions={scope:'本轮开始之前的已记录交往',playerId:prior.playerId,participants:copy(prior.participants)};
 const encountered=storyEncounterKnowledge(turn);
 if(encountered)continuity.encounters={scope:'本轮首次建立正式档案',player:copy(encountered.player),participants:encountered.participants.map(p=>({...pick(p,['id','name','createdStep','statements']),sharedEvents:p.sharedEvents.map(compileSharedEvent)}))};
 const pending=pick(after,['npcRequests','longActions','autonomousPlans','npcGoals','pendingCompanions','pendingLoot','lootPriorities','lootAgreements','battle','expedition']);
 if(pending.battle?.report)pending.battle={id:pending.battle.id,status:pending.battle.status};
 if(after.workshop)pending.workshop=compileWorkshopContext(after.workshop);
 if(after.longActions)pending.longActions=compileLongActionContext(after.longActions);
 if(after.npcGoals)pending.npcGoals=after.npcGoals.map(compileNpcGoal);
 if(after.autonomousPlans)pending.autonomousPlans=compileNpcPlans(after.autonomousPlans);
 if(after.npcRequests)pending.npcRequests=after.npcRequests.map(compileNpcRequest);
 if(after.rings)pending.rings=compileRingContext(after.rings);
 if(after.expedition)pending.expedition=compileExpeditionContext(after.expedition);
 // Querying/giving/equipping refers to existing objects; keep their actual named identity beside the event.
 const requestedIds=new Set<string>();for(const r of turn.results)for(const key of ['itemId','prototypeItemId','consumedItemIds','itemIds'])for(const v of [r.action?.[key],r.receipt?.[key],r.receipt?.sourceSettlement?.[key]])if(typeof v==='string')requestedIds.add(v);else if(Array.isArray(v))for(const id of v)if(typeof id==='string')requestedIds.add(id);
 const objects:any[]=[],latest=new Map<string,{fingerprint:string;entry:any;observations:Set<string>}>();
 for(const {object,source} of storyObjectObservations(turn)){
  const id=object.id??object.itemId;if(!requestedIds.has(id))continue;
  const fingerprint=JSON.stringify(object),observation=JSON.stringify(source),previous=latest.get(id);
  // Only identical consecutive observations share a record. A→B→A keeps all
  // three states; quantities/owners at different times are never flattened.
  if(previous?.fingerprint===fingerprint){
   // Inventory and the owner's item list can project the same observation.
   // Only exact duplicates within this unchanged state are redundant.
   if(!previous.observations.has(observation)){previous.entry.observations.push(copy(source));previous.observations.add(observation);}
  }
  else {
   const entry={...copy(object),observations:[copy(source)]};objects.push(entry);latest.set(id,{fingerprint,entry,observations:new Set([observation])});
  }
 }
 if(objects.length)continuity.objects=objects;
 const scene=(f:any)=>({location:copy(f.location),time:time(f),...(f.expedition?{expedition:pick(compileExpeditionContext(f.expedition),['id','dungeonName','stage','currentNodeId','companions'])}:{})});
 if(battleWriting){
  const observation={scope:'本轮全部行动与战后结算完成时的已知世界资料',time:copy(after.time??null)};
  continuity.observation=copy(observation);pending.observation=copy(observation);
 }
 return {version:1,turn:turn.number,scene:{before:scene(before),after:scene(after),elapsedMinutes:start===null||end===null?null:end-start},participants,events,changes,continuity,pending};
}
