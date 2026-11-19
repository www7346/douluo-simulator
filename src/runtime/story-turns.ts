import {EVOLUTION_ACTION_FIELDS,evolutionStoryCommand,evolutionActionSchema,validateEvolutionParameter,evolutionStoryFacts} from './story-evolution';
import {checkedArchivedProseOriginal} from '../shared/story-archived-prose';
import {personContractFacts} from './person-contract';
import {createStoryHireFactsReader} from './story-hire-facts';
import {PERSON_CONTRACT_ACTION_FIELDS,personContractActionMetadata,validatePersonContractActionParameter} from './person-contract-actions';
import {offerImmediateGift,validateImmediateGiftResult,deferImmediateGifts,validateDeferredImmediateGifts} from './story-immediate-gifts';
import {createScenePersonReader,heardScenePerson,perceivedScenePerson} from './story-scene-people';
import {pendingImmediateGifts} from '../shared/story-immediate-gifts';
import {narrativeCustodyFacts} from './narrative-practice';
import {RESIDENT_ACTION_FIELDS,residentActionMetadata,validateResidentActionParameter} from './resident-actions';
import {residentNarrativeContext} from './resident-narrative';
import {assertNeutralWearableStoryAction} from './story-neutral-wearables';
import {jsonEqual} from '../shared/json-identity';
import {MAX_STORY_PROSE_LENGTH} from '../shared/story-prose';
import {storySourceInput} from '../shared/story-source-input';
import {privateStoryCloseReason} from './story-private-close';
import {STORY_QUERY_ACTIONS} from './story-action-semantics';
import {pendingStoryPersonWorldWork} from './person-world-work';
import {readOnlyStoryAction} from './story-action-capabilities';
import {inspectStoryInventory} from './story-inventory';
import {PLAYER_REASON_ACTIONS} from './player-action-defaults';
import {pendingCooperationResponses} from '../shared/person-cooperation';
import {pendingStoryCustodyMarket,custodyResponseFacts} from './story-custody-market';
import {pendingStoryControlledGifts} from '../shared/story-controlled-gifts';
import {subjectivePerson,personCognition,relationshipPresentation} from '../shared/cognition-view';
import {changeInteractionContext} from './person-change-context';
import {validatePrivateMessages,privateMessageProse,PRIVATE_CONVERSATION_ENDED} from '../shared/story-private-messages';
import {STORY_ACTION_PURPOSES} from './story-action-semantics';
import {privateStoryActionReferenceReason,privateStoryActionScopeReason} from './story-private-actions';
import {BATTLE_ACTION_FIELDS,BATTLE_ACTION_TYPES,assertBattleActionInput} from '../shared/battle-action-input';
import {battleActionReport} from './battle-reports';
import type {BattleTurnView} from './player-presentation';
import {captureStoryEventContext,validateStoryEventContext,type StoryEventContext} from '../shared/story-event-context';
import {storyInlineCards,validateStoryInlinePresentation,type StoryInlinePresentation} from '../shared/story-inline-cards';
import {storySourcesCoverInput,storySourceCoverageEvidence,storySourceInputStarts} from './story-source-coverage';
import {StoryPlanValidationError,storyPlanObjectIssues,type StoryPlanValidationIssue} from './story-plan-validation-error';
import {validateStoryPlanActivityOrder} from './story-plan-activity';
import {validateStoryPlanConversation} from './story-plan-conversation';
import {PARTY_PROPOSAL_ACTIONS,partyProposalReplies} from '../shared/story-party-proposals';
import {storyActionState,withStoryActionsRead,type StoryActionsReader} from './story-state-writing-facts';
import {storyItemSource,storyItemResult} from '../shared/story-item-result';
import {pendingStoryResearch} from '../shared/story-research';
import {storyGrowthFacts} from './story-growth';
import {storyWorkshopFacts} from './story-workshop';
import {storyMaterialFacts} from './story-materials';
import {recordPartyMessage,partyConversationFacts,partyChatRoster,finishPartyReplies} from './story-party-chat';
import {validatePartyMessages,validatePartyReplyProposal,partyMessageForTurn,isPartyTurn,personPartyConversation,type PartyMessage} from '../shared/story-party-chat';
import {checkPrivateRouteRequest,validatePrivateStoryRoute,type PrivateStoryRoute,type PrivateRouteRequest} from '../shared/story-private-route';
import {resolvePrivateRoute} from './story-private-route';
import {meetStoryPerson} from './story-people';
import {communicationAvailability,soulContact} from '../shared/story-communication';
import {conversationActivityOptions} from './story-communication-activity';
import {captivityFacts,releaseFacts} from './story-captivity';
import {pendingNpcDecisions,visibleNpcGoals,npcCollaborationFacts,npcConversationGoals} from '../shared/npc-autonomy';
import {storyCommerceFacts} from './story-commerce';
import {storyObjectContext,rememberStoryObject,resolveStoryObject,validateStoryObjectAction,storyObjectActionIssues} from './story-objects';
import {STORY_OBJECT_FROM_SCHEMA,STORY_OBJECT_DETAILS_SCHEMA} from '../shared/story-object-contract';
import {validateHarvestTargets} from './story-harvest';
import {storyCheckHistory,validateStoryCheckHistory,type StoryCheckRecord} from './story-check-history';
import {STORY_BATTLE_OUTCOMES,type StoryBattleOutcome} from '../shared/story-battles';
import {resolveStoryPersonName,recordStoryPersonLabel,storyPersonLabels,storyPersonReferences,validateStoryPersonLabels} from './story-person-names';
import {pendingStoryBeliefs,validateBeliefResponse} from '../shared/story-person-knowledge';
import {recordStoryStatement,validateStoryKnowledge,personHeardStatements} from './story-person-knowledge';
import {checkPrivateMemoryRetention,checkStorySummary,summaryMatchesTurn,type StorySummary} from '../shared/story-summary';
import {AUTOMATIC_BATTLE_REPORT_INPUT,checkStorySummaryOriginal,summaryOriginalTurn} from '../shared/story-summary-original';
import {checkStageOriginals,checkStoryStageSummary,type StoryStageSummary} from '../shared/story-stage-summary';
import {pendingStoryRoom} from '../shared/story-room';
import {pendingStoryExtraction} from '../shared/story-extraction';
import {resolveStoryExtraction} from './story-extraction';
import {storyRingFacts,readStoryRingChoices} from './story-rings';
import {rules} from '../rules';
import {battleAftermathCommand} from './journey-status';
import {initializeBattlePreferences} from './battle-preferences';
import {effectiveBattlePreferences,battleNeedsWriter} from '../shared/battle-preferences';
import {validateStoryPersonCreation,storyPersonCreationOptions} from './story-person-creation';
import {validateStoryCheck,validateStoryCheckReceipt,validateStoryOpposedCheck,validateStoryOpposedReceipt,STORY_CHECK_ATTRIBUTES,STORY_CHECK_DIFFICULTIES} from './story-checks';
import {validateFreeAction,freeActionFacts,FREE_ACTION_BRANCH_LIMIT,FREE_ACTION_INTENT_SCHEMA,FREE_ACTION_CHECK_SCHEMA,freeActionEffectSchema,freeActionShapeIssues} from './story-free-actions';
import {storyFieldResources} from './story-field-resources';
import {recordStoryAddress,personAddresses} from './story-addresses';
import type {GameCommand} from './contracts';
import {knownStoryDossier,storyAbilityFacts,storySoulFacts,storyEraFacts,storyOwnedItemFacts,storyOwnedRingFacts} from './story-person-dossier';
import {storyPersona,storyConversationIdentity,storyBackgroundContext} from './story-personas';
import {recentBattleReports,readBattleReport,sharedBattleEncounters} from './battle-reports';
import {PERSON_HISTORY_CATEGORIES,storyPersonHistorySummary} from './story-person-history';
import {expireStoryCommitments,personCommitments,commitmentView,personRelationship,recentEndedCommitments,RELATIONSHIP_LABELS} from './story-commitments';
import {pendingStoryCommitments} from '../shared/story-commitments';

export interface StoryAction {kind:string;[key:string]:unknown}
export interface StorySegment {source:string;action:StoryAction;refreshAfter?:true;when?:{step:number;status?:'succeeded'|'failed';outcome?:StoryBattleOutcome;belief?:'believes'|'doubts'|'uncertain';agreementStatus?:'proposed'|'accepted'|'sourceUnavailable'|'active'|'rejected'|'fulfilled'|'breached'|'ended';marketStatus?:'pending'|'open'|'completed'|'rejected'|'cancelled'|'expired'|'invalidated'|'unsold'}}
export interface StoryPlan {segments:StorySegment[];privateTo?:PrivateRouteRequest}
export interface StoryStepResult {step:number;source:string;action:StoryAction;status:'succeeded'|'failed'|'skipped'|'described'|'clarify';receipt?:Record<string,any>;reason?:string;context?:StoryEventContext;executionSourceId?:string;condition?:{when:NonNullable<StorySegment['when']>;observed:string;matched:boolean}}
export interface StoryTurn {
 number:number;input:string;status:'planning'|'resolved'|'complete';results:StoryStepResult[];
 privatePersonId?:string;
 partyChat?:true;
 privateRoute?:PrivateStoryRoute;
 battleId?:string;
 continuation?:{plan:StoryPlan;nextStep:number;battleId?:string};
 hostProgress?:{requestId:string;reason:'clarification'|'scene-refresh'|'query-refresh';status:'waiting'|'ready'|'used'|'cancelled';baseStep:number;plan:StoryPlan;question?:string;answer?:string;acceptedPlan?:StoryPlan};
 before?:Record<string,any>;after?:Record<string,any>;prose?:string;
 privateMessages?:string[];
 inlinePresentation?:StoryInlinePresentation;
}
const personReferenceStep=(r:any)=>r?.status==='succeeded'&&(r.action?.kind==='introduce-person'&&r.receipt?.type==='story-person-created'||r.action?.kind==='resolve-person'&&r.receipt?.type==='person-name-resolved'&&r.receipt.status==='unique')&&typeof r.receipt.personId==='string';
const personFromStep=(results:StoryStepResult[],index:unknown)=>{const r=results[Number(index)];if(!personReferenceStep(r))throw Error('前置人物尚未成功创建或唯一确认，不能引用');return r.receipt!.personId;};

function hostRefreshReason(results:StoryStepResult[],plan:StoryPlan,next:number):'clarification'|'scene-refresh'|'query-refresh'|null{
 const last=results.at(-1);if(!last)return null;
 if(last.status==='clarify')return 'clarification';
 if(last.status!=='succeeded')return null;
 if(plan.segments[last.step]?.refreshAfter)return 'query-refresh';
 if(next<plan.segments.length&&['travel','visit-custody-cell','withdraw-captive','place-captive'].includes(last.action.kind)&&JSON.stringify(last.context?.before.location)!==JSON.stringify(last.context?.after.location))return 'scene-refresh';
 return null;
}

export interface StoryLedger {pendingPublicIntroductions?:string[];partyMessages?:PartyMessage[];checks?:StoryCheckRecord[];version:1;branchId:string;nextTurn:number;active:StoryTurn|null;summaries?:StorySummary[];stageSummaries?:StoryStageSummary[];inheritedBranchId?:string;deferredBattle?:{battleId:string;turn:StoryTurn}}
export const newStoryLedger=():StoryLedger=>({version:1,branchId:'initial',nextTurn:1,active:null});
const object=(v:any):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
// Parsed saves do not retain object identity between results and their continuation plan.
const sameJson=(a:any,b:any):boolean=>a===b||Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>sameJson(v,b[i]))||object(a)&&object(b)&&Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>Object.hasOwn(b,k)&&sameJson(a[k],b[k]));
const fields=(value:any,allowed:string[])=>{if(!object(value)||Object.keys(value).some(k=>!allowed.includes(k)))throw Error('叙事提案含有未支持的字段');};
const text=(v:any,label:string,max=160)=>{if(typeof v!=='string'||!v.trim()||v.length>max)throw Error(`${label}缺失或过长`);return v;};
const count=(v:any,min=1,max=999)=>{if(!Number.isSafeInteger(v)||v<min||v>max)throw Error('叙事提案数量超出范围');return v as number;};

export function storyLedger(state:any):StoryLedger {
 const ledger=state?.扩展?.story;
 if(!ledger||ledger.version!==1)throw Error('这份旅程没有叙事数据，请从新版本创建新的故事');
 return ledger;
}
export function validateStoryLedger(state:any):void {
 validateDeferredImmediateGifts(state);
 const ledger=state?.扩展?.story;if(ledger===undefined)return;
 validateStoryKnowledge(state);validatePartyMessages(state);validateStoryPersonLabels(state);
 fields(ledger,['version','branchId','nextTurn','active','inheritedBranchId','deferredBattle','summaries','stageSummaries','checks','partyMessages','pendingPublicIntroductions']);
 if(ledger.pendingPublicIntroductions!==undefined&&(!Array.isArray(ledger.pendingPublicIntroductions)||new Set(ledger.pendingPublicIntroductions).size!==ledger.pendingPublicIntroductions.length||ledger.pendingPublicIntroductions.some((id:any)=>typeof id!=='string'||!state.人物.列表[id])))throw Error('待展示的人物介绍无效');
 validateStoryCheckHistory(ledger.checks,ledger.nextTurn);
 if(ledger.stageSummaries!==undefined){if(!Array.isArray(ledger.stageSummaries))throw Error('阶段记忆存档无效');for(const raw of ledger.stageSummaries){const stage=checkStoryStageSummary(raw);if(stage.sources.some(s=>s.source.turn>=ledger.nextTurn))throw Error('阶段记忆来源尚未完成');}}
 if(ledger.summaries!==undefined){if(!Array.isArray(ledger.summaries))throw Error('摘要存档无效');const seen=new Set<number>();for(const raw of ledger.summaries){const summary=checkStorySummary(raw);if(summary.source.turn>=ledger.nextTurn||seen.has(summary.source.turn))throw Error('摘要回合重复或尚未完成');seen.add(summary.source.turn);}}
 if(ledger.version!==1)throw Error('叙事存档版本不受支持');text(ledger.branchId,'叙事分支');count(ledger.nextTurn,1,Number.MAX_SAFE_INTEGER);
 if(ledger.inheritedBranchId!==undefined){text(ledger.inheritedBranchId,'继承正文分支');if(ledger.active?.status!=='complete'||ledger.inheritedBranchId===ledger.branchId)throw Error('继承正文分支无效');}
 if(ledger.active!==null){const t=ledger.active;fields(t,['number','input','status','results','before','after','prose','privateMessages','inlinePresentation','privatePersonId','privateRoute','partyChat','battleId','continuation','hostProgress']);count(t.number,1,ledger.nextTurn-1);text(t.input,'玩家输入',8000);
  if(t.partyChat!==undefined&&(t.partyChat!==true||t.privatePersonId||t.battleId))throw Error('队伍会话不能混为私聊或战报');
  if(t.privatePersonId!==undefined)text(t.privatePersonId,'私聊人物');
  if(t.battleId!==undefined){text(t.battleId,'战斗记录');if(t.privatePersonId)throw Error('战斗记录不能写入私聊回合');}
  if(!['planning','resolved','complete'].includes(t.status)||!Array.isArray(t.results)||t.results.length>12)throw Error('叙事回合状态无效');
  if(t.status==='planning'&&t.results.length)throw Error('待裁定回合不能包含已执行结果');
  if(t.status!=='planning'&&(!object(t.before)||!object(t.after)))throw Error('叙事回合缺少结算事实');
  if(t.status==='complete')text(t.prose,'小说正文',MAX_STORY_PROSE_LENGTH);
  if(t.privateMessages!==undefined){const ended=t.prose===PRIVATE_CONVERSATION_ENDED;if(!t.privatePersonId||t.inlinePresentation!==undefined||t.status!=='complete'||privateMessageProse(validatePrivateMessages({messages:t.privateMessages},ended||t.after?.communication?.available===false),ended)!==t.prose)throw Error('私聊短消息与正文记录不一致');}
  if(t.inlinePresentation!==undefined)validateStoryInlinePresentation(t.prose??'',t.inlinePresentation,storyInlineCards(t));
  validatePrivateStoryRoute(t);
  const bound=t.after?.battle?.report;
  if(bound){
   const official=state.扩展?.battleReports?.[bound.id];
   if(bound.id!==t.battleId||bound.status!=='已结束'||bound.storyTurn!==t.number||official&&!sameJson(bound,official))throw Error('整场战果与本段故事来源不一致');
  }
  for(const result of t.results){
   if(result.receipt?.type==='person-contract'&&!rules.personContracts.receiptProof(state,result.receipt,state.角色.主控单位ID,result.action,result.action.characterStep===undefined?null:personFromStep(t.results,result.action.characterStep)))throw Error('人物契约步骤与原外层命令回执不一致');
   if(['spar','person-duel','competition-match','enter-room'].includes(result.action?.kind)&&result.receipt?.report){
    const report=result.receipt.report,official=state.扩展?.battleReports?.[result.receipt.battleId];
    if(report.id!==result.receipt.battleId||report.status!=='已结束'||report.storyTurn!==t.number||official&&!sameJson(report,official))throw Error('开战步骤与整场战果来源不一致');
   }
   validateImmediateGiftResult(state,t,result,ledger.branchId);
   if(result.context!==undefined)validateStoryEventContext(result.context);
   if(result.condition!==undefined){const c=result.condition;fields(c,['when','observed','matched']);if(!object(c.when)||!Number.isSafeInteger(c.when.step)||c.when.step<0||c.when.step>=result.step||typeof c.observed!=='string'||c.matched!==(c.observed===String(c.when.agreementStatus??c.when.marketStatus??c.when.belief??c.when.outcome??c.when.status)))throw Error('行动条件与判定记录不一致');}
   if(result.action?.kind==='battle-action'&&result.receipt){
    const receipt=result.receipt,report=receipt.report,native={...receipt};delete native.report;
    if(receipt.type!=='combat-action'||report?.id!==receipt.battleId||report?.completeFromStart!==false||report.actions?.length!==1||report.opening?.battleId!==receipt.battleId||report.closing?.battleId!==receipt.battleId||!sameJson(report.actions[0].receipt,native))throw Error('点名战斗记录与实际行动不一致');
    const official=state.扩展?.battleReports?.[receipt.battleId];
    if(official){const recorded=official.actions.find((a:any)=>a.receipt.actionId===receipt.actionId);if(!recorded||recorded.sequence!==report.actions[0].sequence||!sameJson(recorded.receipt,native))throw Error('点名战斗记录缺少正式行动来源');}
   }
   if(result.action?.kind==='resolve-person'&&result.receipt){
    const r=result.receipt;fields(r,['type','query','status','matches','personId']);
    if(r.type!=='person-name-resolved'||r.query!==result.action.name||!Array.isArray(r.matches)||!['unique','ambiguous','missing'].includes(r.status))throw Error('人物查找回执无效');
    const ids=new Set<string>();for(const m of r.matches){fields(m,['id','name']);text(m.id,'人物编号');text(m.name,'人物姓名');if(ids.has(m.id))throw Error('人物查找候选重复');ids.add(m.id);}
    if(r.status!==(r.matches.length===1?'unique':r.matches.length?'ambiguous':'missing')||result.status!==(r.status==='unique'?'succeeded':'clarify')||(r.status==='unique'?r.personId!==r.matches[0].id:r.personId!==undefined))throw Error('人物查找状态与候选不一致');
   }
   if(result.action?.characterStep!==undefined){
    const index=count(result.action.characterStep,0,t.results.indexOf(result)-1),source=t.results[index];
    if(result.action.characterId!==undefined||!['introduce-person','resolve-person'].includes(source?.action?.kind))throw Error('人物步骤引用与创建来源不一致');
    if(result.receipt&&!personReferenceStep(source))throw Error('人物步骤缺少成功创建回执');
   }
   if(result.action?.itemStep!==undefined){
    const index=count(result.action.itemStep,0,t.results.indexOf(result)-1),source=t.results[index];
    if(result.action.itemId!==undefined||!storyItemSource(source?.action))throw Error('物品步骤引用与实际取得实物的来源不一致');
    if(result.receipt&&!storyItemResult(source))throw Error('物品步骤缺少唯一成功取得实物的回执');
   }
   if(result.receipt?.type==='story-opposed-check'){
    const r=result.receipt;validateStoryOpposedReceipt(r);
    const characterId=result.action?.characterStep===undefined?result.action?.characterId:t.results[result.action.characterStep]?.receipt?.personId;
    if(result.action?.kind!=='opposed-check'||r.attribute!==result.action.attribute||r.characterId!==characterId||r.defender.attribute!==result.action.defenderAttribute||r.reason!==result.action.reason||result.status!==(r.passed?'succeeded':'failed'))throw Error('对抗检定回执与原行动不一致');
   }
   if(result.receipt?.type==='story-attribute-check'){
    const r=result.receipt;validateStoryCheckReceipt(r);
    if(result.action?.kind!=='attribute-check'||r.attribute!==result.action.attribute||r.difficulty!==result.action.difficulty||r.reason!==result.action.reason||result.status!==(r.passed?'succeeded':'failed'))throw Error('检定回执与原行动不一致');
   }
   const receipt=result.receipt;if(receipt?.type!=='story-extraction-confirmation')continue;
   if(result.action?.kind!=='extract-expedition'||!['pending','accepted','declined'].includes(receipt.decision)||!Array.isArray(receipt.losses)||!receipt.losses.length)throw Error('撤离确认记录不完整');
   text(receipt.expeditionId,'确认远征');if(receipt.nodeId!==null)text(receipt.nodeId,'确认房间');
   for(const loss of receipt.losses){
    if(!object(loss)||!['materials','ring','camp','chest'].includes(loss.kind))throw Error('撤离损失清单无效');
    text(loss.name,'损失名称');if(loss.years!==undefined)count(loss.years,1,Number.MAX_SAFE_INTEGER);
   }
   if(receipt.decision!=='accepted'&&receipt.settlement!==undefined)throw Error('未接受撤离不能已有结算');
   if(receipt.decision==='pending'&&(t.status!=='resolved'||result!==t.results.at(-1)))throw Error('待确认撤离不能已经完成或继续执行');
   if(receipt.decision==='accepted'?(result.status!=='succeeded'||receipt.settlement?.type!=='expedition-safely-extracted'):result.status!=='failed')throw Error('撤离确认与实际结果不一致');
  }
  if(t.hostProgress!==undefined){
   const h=t.hostProgress;fields(h,['requestId','reason','status','baseStep','plan','question','answer','acceptedPlan']);text(h.requestId,'待续安排');
   if(!['clarification','scene-refresh','query-refresh'].includes(h.reason)||!['waiting','ready','used','cancelled'].includes(h.status))throw Error('待续安排阶段无效');
   const original=validateStoryPlan(h.plan,t.input);count(h.baseStep,1,t.results.length);
   if(h.question!==undefined)text(h.question,'待补充选择',8000);if(h.answer!==undefined){text(h.answer,'补充选择',8000);if(storySourceInput(t).length>8000)throw Error('本次输入与补充超出范围');}
   if(h.status==='used'){if(!h.acceptedPlan||h.reason==='clarification'&&!h.answer)throw Error('补充安排缺少原始选择');const accepted=validateStoryPlan(h.acceptedPlan,storySourceInput(t));for(const [i,r] of t.results.entries())if(r.source!==accepted.segments[i]?.source||!sameJson(r.action,accepted.segments[i]?.action))throw Error('补充安排与执行结果不一致');}
   if(h.reason==='clarification'&&t.results[h.baseStep-1].status!=='clarify'||h.status==='waiting'&&(h.reason!=='clarification'||!h.question||h.answer!==undefined)||h.status==='ready'&&h.reason==='clarification'&&!h.answer)throw Error('追问与补充选择不一致');
   if(['waiting','ready'].includes(h.status)&&(t.status!=='resolved'||t.continuation||t.results.length!==h.baseStep))throw Error('待续安排不能越过未完成步骤');
   for(let i=0;i<h.baseStep;i++)if(!sameJson(t.results[i].action,original.segments[i]?.action)||t.results[i].source!==original.segments[i]?.source)throw Error('待续安排不能改变已执行步骤');
  }
  if(t.continuation!==undefined){
   fields(t.continuation,['plan','nextStep','battleId']);if(t.continuation.battleId!==undefined)text(t.continuation.battleId,'后续战斗');const plan=validateStoryPlan(t.continuation.plan,storySourceInput(t));
   count(t.continuation.nextStep,0,plan.segments.length);
   const battleWait=t.continuation.battleId;
   if(battleWait&&!(t.results.some((r:any)=>r.status==='succeeded'&&['spar','person-duel','enter-room','competition-match'].includes(r.action.kind)&&r.receipt?.battleId===battleWait)||t.before?.battle?.id===battleWait||t.results.some((r:any)=>r.action.kind==='battle-action'&&r.receipt?.battleId===battleWait)))throw Error('后续行动缺少同一场战斗记录');
   const lastResult=t.results.at(-1),lastReceipt=lastResult?.receipt;
   const pendingGift=lastResult?.status==='succeeded'&&lastReceipt?.type==='field-control-order'&&lastReceipt.status==='executed'&&lastReceipt.action?.type==='propose-gift';
   const pendingMarket=lastResult?.status==='succeeded'&&(lastReceipt?.type==='custody-trade'&&lastReceipt.status==='pending'||lastReceipt?.type==='custody-auction'&&lastReceipt.status==='open');
   const performanceContinuation=lastResult?.status==='succeeded'&&lastResult.action.kind==='propose-performance-agreement'&&lastReceipt?.type==='performance-agreement'&&typeof lastReceipt.agreementId==='string';
   const personContractContinuation=lastResult?.status==='succeeded'&&rules.personContracts.INTENTS.includes(lastResult.action.kind)&&rules.personContracts.receiptProof(state,lastReceipt,state.角色.主控单位ID,lastResult.action,lastResult.action.characterStep===undefined?null:personFromStep(t.results,lastResult.action.characterStep));
   const pendingChange=lastResult?.status==='succeeded'&&rules.personChangeKnowledge.receiptExperiences(state,lastReceipt).some((e:any)=>e.turn===t.number&&e.observers.some((o:any)=>o.personId!==state.角色.主控单位ID));
   const pendingCooperation=lastResult?.status==='succeeded'&&lastReceipt?.type==='person-cooperation'&&lastReceipt.status==='proposed';
   if(t.status!=='resolved'||t.results.length!==t.continuation.nextStep||!(battleWait||pendingChange||pendingMarket||pendingGift||pendingCooperation||performanceContinuation||personContractContinuation||['person-growth-requested','commitment-proposed','person-gift-offered','story-extraction-confirmation','person-heard-statement','npc-goal-requested','research-materials-consumed'].includes(lastReceipt?.type??'')||lastResult?.status==='succeeded'&&['spar','person-duel','enter-room','competition-match'].includes(lastResult?.action.kind??'')))throw Error('后续行动与已执行步骤不一致');
   for(const [i,r] of t.results.entries()){
    const segment=plan.segments[i];
    if(r.step!==i||r.source!==segment.source||!object(r.action)||!sameJson(r.action,segment.action))throw Error('后续行动不能替换已执行的片段');
   }
  }
 }
 if(ledger.deferredBattle!==undefined){
  const pending=ledger.deferredBattle;fields(pending,['battleId','turn']);text(pending.battleId,'待续战斗');
  if(pending.turn?.results?.at(-1)?.receipt?.battleId!==pending.battleId)throw Error('战后行动缺少原开战来源');
  if(pending.turn?.continuation?.battleId!==pending.battleId||!ledger.active||pending.turn.number>ledger.active.number||pending.turn.privatePersonId||pending.turn.partyChat)throw Error('战后行动与开战故事不一致');
  if(pending.turn.number===ledger.active.number&&(ledger.active.status!=='complete'||pending.turn.input!==ledger.active.input||!jsonEqual(pending.turn.results,ledger.active.results)))throw Error('战后行动与开战故事不一致');
  if(pending.turn.number<ledger.active.number&&(ledger.active.privatePersonId||ledger.active.partyChat||ledger.active.results.some((r:StoryStepResult)=>!['battle-action','battle-strategy','battle-report','describe','clarify'].includes(r.action.kind))))throw Error('战后计划待续期间只能插入当前战斗操作');
  validateStoryLedger({扩展:{story:{version:1,branchId:ledger.branchId,nextTurn:ledger.nextTurn,active:pending.turn}}});
 }
}

export function checkPrivatePerson(state:any,personId:string){
 text(personId,'私聊人物');
 const p=state.人物?.列表?.[personId];
 if(!p||personId===state.角色?.主控单位ID)throw Error('没有可以交谈的已登记人物');
 const contact=communicationAvailability(state,personId,{receiving:true});if(!contact.available)throw Error(contact.reason);
 const block=rules.world.worldActionBlockReason(state,{...conversationActivityOptions(state,personId),allowCaptivity:contact.mode==='in-person'});if(block)throw Error(block);
 if(p.status==='dead')throw Error('这位人物目前无法回应');
 return p;
}

function publicStoryFacts(state:any){const facts=storyFacts(state);facts.custody.responses=custodyResponseFacts(state,facts.custody);return facts;}

// Scene facts are stored as JSON dossiers, detached from mutable game state.
function jsonFacts<T>(value:T):T{return JSON.parse(JSON.stringify(value));}

function privateScenePerson(state:any,personId:string,observerId:string){
 const registered=state.人物.列表[personId],sense=perceivedScenePerson(state,registered);
 if(!sense)return null;
 const knowsOwnAbilities=observerId===personId;
 const observe=(readActions?:StoryActionsReader)=>{
  const observed=sense==='visible'?createScenePersonReader(state,readActions)(registered):heardScenePerson(state,registered);
  return {
   ...jsonFacts(observed),
   ...(knowsOwnAbilities?{
    actionState:storyActionState(state,personId,false,readActions),
    martialSouls:storySoulFacts(state,personId),
    ownedRings:storyOwnedRingFacts(state,personId),
    abilities:storyAbilityFacts(state,personId,readActions),
    eraBasis:storyEraFacts(state,personId),
   }:{}),
   characterization:storyPersona(state,registered,observerId),
   cognition:personCognition(state,personId),
   changeInteractions:changeInteractionContext(state,personId),
  };
 };
 return sense==='visible'||knowsOwnAbilities?withStoryActionsRead(state,observe):observe();
}

/** Characterization belongs to the actual audience. Private conversation does not grant the other person's inner memories. */
export function storyTurnFacts(state:any,privatePersonId?:string,query='',observerId=privatePersonId??state.角色?.主控单位ID):Record<string,any>{return rules.controls.withReadIndex(state,()=>readStoryTurnFacts(state,privatePersonId,query,observerId));}
function readStoryTurnFacts(state:any,privatePersonId?:string,query='',observerId=state.角色?.主控单位ID):Record<string,any>{
 const active=state.扩展?.story?.active;if(!privatePersonId&&active?.partyChat&&active.status==='planning')return {evolution:evolutionStoryFacts(state),partyChat:true,partyChatRecipients:partyChatRoster(state),partyLoot:{templates:rules.expedition.loot.templates(),priorities:rules.expedition.loot.priorityFacts(state),dungeonId:rules.expedition.DUNGEON_ID,members:rules.expedition.loot.roster(state,rules.expedition.DUNGEON_ID),agreements:rules.expedition.loot.visibleRecords(state).filter((a:any)=>!a.expeditionId).slice(-3),pending:rules.expedition.loot.pending(state),meaning:'自愿提前约定才需逐人同意，且不是进本条件；pending 中 post-trip 收获由原领队在战利品窗口直接分配，无需 AI 同意。仅主持解析使用，不传入人物共享回复。'},player:storyConversationIdentity(state.人物.列表[state.角色.主控单位ID]),time:state.世界.时间,calendar:rules.world.storyCalendarDate(state)};if(!privatePersonId&&active?.results.some((r:any)=>r.action.kind==='tell-party'))return partyConversationFacts(state,partyMessageForTurn(active));
 if(!privatePersonId)return {...publicStoryFacts(state),narrativeObjects:storyObjectContext(state,undefined,query)};
 const playerId=state.角色.主控单位ID;
 let person:any=privateScenePerson(state,privatePersonId,observerId);
 const facts=jsonFacts({
  evolution:evolutionStoryFacts(state,privatePersonId),
  time:state.世界?.时间,calendar:rules.world.storyCalendarDate(state),
  huntingDestinations:storyHuntingDestinations(state),
  pendingCompanions:storyPendingCompanions(state).filter((contract:any)=>contract.personId===privatePersonId),
 });
 const blocked=state.扩展?.story?.active?.privatePersonId===privatePersonId?state.扩展.story.active.privateRoute?.blockedReason:undefined;
 const channel=communicationAvailability(state,privatePersonId);
 const canSeePlayer=(channel.mode==='in-person'||channel.mode==='projection')&&rules.actions.perception(state,privatePersonId,playerId,'vision');
 const communication={...channel,canSeePlayer,...(blocked?{available:false,reason:blocked}:{})};
 if(communication.mode==='realm'||communication.mode==='soul-device')person=undefined;
 if(!person&&communication.mode==='in-person'){
  const p=state.人物.列表[privatePersonId],d=knownStoryDossier(state,privatePersonId);
  if(!p)throw Error('没有可以交谈的已登记人物');
  const persona=storyPersona(state,p,observerId);
  person={id:p.id,name:p.name,scope:'voice-conversation',characterization:persona,speechStyle:persona.profile?.speech??persona.reference?.speech??null,backgroundContext:storyBackgroundContext(state,p.id),lastEncounter:d?structuredClone(d):null,relationship:relationshipPresentation(personRelationship(state,p.id),state.角色.主控单位ID,p.id),speechFacts:rules.social.speechFacts(state,state.角色.主控单位ID).filter((r:any)=>r.speakerId===p.id)};
 }
 if(!person){
  const p=state.人物.列表[privatePersonId],d=knownStoryDossier(state,privatePersonId);
  if(!p||communication.mode==='soul-device'&&!soulContact(state,p.id)&&!blocked)throw Error('尚未与此人建立魂导通讯联系');
  const member=rules.world.partyMembers(state).find((m:any)=>m.personId===p.id);
  person={id:p.id,name:p.name,canonicalId:p.扩展?.角色库ID??state.战斗单位?.列表?.[p.id]?.扩展?.角色库ID??null,identity:d?.identity??null,occupation:d?.occupation??null,
   characterization:storyPersona(state,p,observerId),backgroundContext:storyBackgroundContext(state,p.id),lastEncounter:d?structuredClone(d):null,
   relationshipScore:Number.isFinite(p.relationship?.player)?p.relationship.player:null,relationship:relationshipPresentation(personRelationship(state,p.id),state.角色.主控单位ID,p.id),soulContactId:soulContact(state,p.id)?.id,partyMembership:member?{personId:member.personId,membershipId:member.membershipId,membership:member.membership,dungeonId:member.dungeonId,present:false}:null,
   commitments:personCommitments(state,p.id).map((r:any)=>commitmentView(state,r)).filter((r:any)=>['pending','accepted'].includes(r.status)),recentEndedCommitments:recentEndedCommitments(state,p.id),history:storyPersonHistorySummary(state,p.id),
   ...createStoryHireFactsReader(state)(p.id),recentCompanionAgreements:(p.扩展?.同行约定??[]).filter((a:any)=>a.playerId===state.角色.主控单位ID).slice(-8),recentSharedEvents:(p.扩展?.共同见闻??[]).filter((e:any)=>e.playerId===state.角色.主控单位ID&&e.participants?.includes(p.id)).slice(-8)};
  person=subjectivePerson(state,{...person,sharedBattleEncounters:sharedBattleEncounters(state,privatePersonId)});
  return {personContracts:personContractFacts(state,privatePersonId).filter((r:any)=>rules.personContracts.get(state,r.id).parties.includes(state.角色.主控单位ID)),residentContext:residentNarrativeContext(state,privatePersonId,state.角色.主控单位ID),communication,custody:conversationCustodyFacts(state,privatePersonId,true),location:{id:null,name:communication.mode==='soul-device'?'魂导通讯':communication.label},time:facts.time,calendar:facts.calendar,player:storyConversationIdentity(state.人物.列表[playerId],canSeePlayer),people:[person],personReferences:storyPersonReferences(state,privatePersonId),partyConversation:personPartyConversation(state,p.id,query),personalKnowledge:personHeardStatements(state,p.id,query),personalContacts:personAddresses(state,p.id,query),npcGoals:npcConversationGoals(state,p.id),autonomousPlans:rules.world.npcPlanFacts(state,p.id,p.id),huntingDestinations:facts.huntingDestinations,pendingCompanions:facts.pendingCompanions,narrativeObjects:storyObjectContext(state,privatePersonId,query)};
 }

 person=subjectivePerson(state,{...person,sharedBattleEncounters:sharedBattleEncounters(state,privatePersonId)});
 const position=rules.actions.positionOf(state,playerId);
 return {personContracts:personContractFacts(state,privatePersonId).filter((r:any)=>rules.personContracts.get(state,r.id).parties.includes(state.角色.主控单位ID)),residentContext:residentNarrativeContext(state,privatePersonId,state.角色.主控单位ID),communication,location:jsonFacts(storyLocation(state,position,position?.locationId??state.地图?.当前地点ID)),time:facts.time,calendar:facts.calendar,custody:conversationCustodyFacts(state,privatePersonId),captivity:jsonFacts(captivityFacts(state)),releaseResponses:releaseFacts(state,privatePersonId).slice(-8),npcRequests:rules.world.npcRequestFacts(state,state.角色.主控单位ID,privatePersonId),npcCollaborations:npcCollaborationFacts(state,privatePersonId,privatePersonId),npcGoals:npcConversationGoals(state,privatePersonId),autonomousPlans:rules.world.npcPlanFacts(state,privatePersonId,privatePersonId),player:storyConversationIdentity(state.人物.列表[playerId],canSeePlayer),people:[person],personReferences:storyPersonReferences(state,privatePersonId),partyConversation:personPartyConversation(state,privatePersonId,query),personalKnowledge:personHeardStatements(state,privatePersonId,query),personalContacts:personAddresses(state,privatePersonId,query),huntingDestinations:facts.huntingDestinations,
  pendingCompanions:facts.pendingCompanions,narrativeObjects:storyObjectContext(state,privatePersonId,query)};
}

function conversationCustodyFacts(state:any,personId:string,remote=false){
 const facts=remote?{social:rules.social.facts(state,personId),logistics:null,permissions:[],devices:[],defeats:[],held:[]}:rules.world.custodyFacts(state,personId),playerId=state.角色.主控单位ID;
 const participants=new Set([playerId,personId]);
 if(facts.sealing)facts.sealing.targets=facts.sealing.targets.filter((p:any)=>participants.has(p.id));
 for(const field of ['recipients','nearby'])facts.social[field]=facts.social[field].filter((r:any)=>participants.has(r.id));
 const shared=new Set(rules.social.speechFacts(state,playerId).map((r:any)=>r.id));
 facts.social.speech=facts.social.speech.filter((r:any)=>shared.has(r.id)).map(({assessment,assessmentReason,...heard}:any)=>heard);
 if(facts.fieldOrders)facts.fieldOrders=facts.fieldOrders.filter((r:any)=>!['speak-person','propose-gift','fulfill-gift'].includes(r.action.type)||[r.issuerId,r.executorId].includes(playerId));
 if(facts.trades)facts.trades=facts.trades.filter((r:any)=>[r.sellerId,r.buyerId].includes(playerId));
 if(facts.auctions){const sharedAuctions=new Set(rules.custodyAuction.facts(state,playerId).map((r:any)=>r.eventId));facts.auctions=facts.auctions.filter((r:any)=>sharedAuctions.has(r.eventId));}
 delete facts.tradeOptions;
 if(facts.gifts)facts.gifts=facts.gifts.filter((r:any)=>[r.donorId,r.recipientId].includes(playerId));
 facts.responses=custodyResponseFacts(state,facts);return narrativeCustodyFacts(facts);
}

const RING_GENERATION_FIELDS=['evolutionTarget',"presetId","exchangeContracts","requestedEffects","requestedBranches","requestedSkills","requestedEffectIds","requirements","resourceCosts","maintenanceCosts","castModes","defaultCastMode","usageRules","cooldownTurns"];
/** Read-only input contract shared with the native controls.limitSpec validator. */
export const CONTROL_LIMIT_PARAMETERS=Object.freeze({
 type:'object',additionalProperties:false,minProperties:1,
 properties:{
  soulPowerPercent:{type:'integer',minimum:0,maximum:100},
  damagePercent:{type:'integer',minimum:0,maximum:100},
  denyOrigins:{type:'array',items:{type:'string',minLength:1},minItems:1,maxItems:64,uniqueItems:true,meaning:'已登记能力原始来源的实际禁用集合'},
  permission:{type:'object',additionalProperties:false,properties:{
   soulIds:{type:'array',items:{type:'string',minLength:1,maxLength:200},maxItems:64,uniqueItems:true,reference:'目标实际持有的武魂原ID'},
   ringIds:{type:'array',items:{type:'string',minLength:1,maxLength:200},maxItems:64,uniqueItems:true,reference:'目标实际持有的魂环原ID'},
   skillIds:{type:'array',items:{type:'string',minLength:1,maxLength:200},maxItems:64,uniqueItems:true,reference:'目标实际持有的技能原ID'},
   allowedKinds:{type:'array',items:{type:'string',enum:rules.controls.ABILITY_KINDS},maxItems:64,uniqueItems:true,meaning:'允许的能力类别；列出魂环并不会限制其他类别，须分别明确类别名单'},
   maxCastRank:{type:'integer',minimum:0,maximum:9,meaning:'允许施放的最高环阶；省略ringIds时由执行器绑定当前已拥有、环阶不高于此值的魂环'}
  },meaning:'各名单同时生效；省略维度不额外限制，空数组[]禁用该维度全部能力，null不合法；名单不能写成字符串'}
 },meaning:'仅填写实际需要限制的维度；比例为整数。具体器具支持范围、目标来源与控制权限由正式预览和执行再核对。'
});
const COOPERATION_DEVICE_PARAMETERS=Object.freeze({
 type:'object',additionalProperties:false,required:['itemId','mode'],
 properties:{
  itemId:{type:'string',minLength:1,reference:'当前合作成员实际佩戴的原器具ID'},
  mode:{type:'string',enum:['released','escort','detached','limited']},
  limits:CONTROL_LIMIT_PARAMETERS,
  returnMode:{type:'string',enum:['locked','escort','limited']},
  returnLimits:CONTROL_LIMIT_PARAMETERS,
  relockAfterMinutes:{type:'integer',minimum:1,maximum:1440}
 },meaning:'逐件指定临战操作和收束目标；limits只用于支持精细配置器具的limited模式，returnLimits用于收束目标limited。完全拆除不允许定时复锁。'
});
const COOPERATION_PREPARATION_LIFECYCLE=Object.freeze({
 reference:'custody.preparations.id',parameter:'preparationId',stateField:'status',
 applicableStates:['prepared','recovery-pending'],unavailableStates:['fighting','closed'],
 actor:'原领队',battleCondition:'目标没有尚未结算的战斗',authorityCondition:'原看管权未被交接',
 recover:{allRestored:{status:'closed',recovered:true,automaticallyCloses:true},someFailed:{status:'recovery-pending',preservesSuccessfulOperations:true}},
 close:{status:'closed',recovered:false,keepsCurrentDeviceState:true,requiresStillOpen:true},
 meaning:'恢复全部成功就自动完成这份安排，无需再关闭；部分恢复失败时保留已完成操作，仍可重试或明确放弃。关闭是对尚未收尾安排的放弃，已closed的同一记录不能再次关闭。'
});

const ACTION_FIELDS:Record<string,string[]>={...RESIDENT_ACTION_FIELDS,...PERSON_CONTRACT_ACTION_FIELDS,
 'inspect-commerce':['auctionId','itemName'],
 'trade-commerce-material':['direction','shopId','fingerprint','quantity','accountId','quoteVersion','maximumGold'],
 'start-curated-auction':['catalogId'],
 'start-asset-auction':['assetKind','itemId','targetId','fingerprint','quantity','reserveGold','auctionClass','accountId','deviceTerms','materials'],
 'bid-asset-auction':['auctionId','auctionStep','gold','reason','quoteEventId','accountId'],
 'register-auction-proxy':['auctionId','auctionStep','maximumGold','reason','accountId'],
 'cancel-auction-proxy':['auctionId','auctionStep'],'take-auction-proxy':['auctionId','auctionStep'],'take-asset-auction-host':['auctionId','auctionStep'],
 'cancel-asset-auction':['auctionId','auctionStep'],'relist-asset-auction':['auctionId','auctionStep'],'collect-auction-item':['auctionId','auctionStep'],
 'ship-shop-auction':['shopId','itemId','fingerprint','quantity'],
 'set-commerce-subscription':['merchantId','enabled','flags','filters'],
 'read-commerce-message':['messageId'],'reply-commerce-message':['messageId','text'],

 'register-competition':['venueId'],'competition-match':[],'competition-withdraw':[],
 'inspect-workshop':[],'recommend-research':['category','concept','presetId','hostDesign','confirmedDesign'],'preview-research':['category','concept','materials','presetId','hostDesign','confirmedDesign'],
 'begin-research':['category','concept','materials','confirmed','presetId','hostDesign','confirmedDesign','expectedMechanicsHash'],'inspect-research':['pendingId'],'choose-research':['pendingId','candidateIndex'],
 'learn-preset-blueprint':['itemId'],
 'preview-craft':['blueprintId','quantity','materials'],'craft-blueprint':['blueprintId','quantity','materials'],
 'quote-material-sale':['fingerprint','quantity'],'sell-material':['fingerprint','quantity'],'quote-item-sale':['itemId','quantity'],'sell-item':['itemId','quantity'],
 'city-history':['locationId','before'],'ask-release':['characterId','text'],'consider-person-goal':['characterId','intent'],'answer-person-plan':['goalId','accept'],
 'opening-situation':['situationId','action'],
 'inspect-opening':[],
 'opening-guidance':['action','giftId'],
 'remember-object':['objectId','objectType','name','aliases','quote','reason','from','evidence','details'],'resolve-object':['name'],
 'instantiate-item':['objectId','objectStep'],
 travel:['destinationId','mode'],recover:[],'recover-party':['memberId'],buy:['shopId','itemId','quantity','maximumGold'],sell:['shopId','itemId','quantity'],
 equip:['itemId','slot'],unequip:['slot'],'use-item':['itemId','actorId','targetId'],'switch-soul':['martialSoulId'],'retract-martial-soul':[],'restrain-desire':[],'break-restraint':['statusId','method'],
 'store-item':['actorId','itemId','quantity'],'retrieve-item':['actorId','itemId','quantity'],
 'loot-item':['actorId','remainsId','itemId','quantity'],'loot-coins':['actorId','remainsId'],
 'create-support-consumable':['recipeId','modifierSkillId','modeId'],
 'use-prebattle-pill':['actorId','itemId'],'world-event':['eventId'],
 'supply-buy':['templateId','quantity','maximumGold'],hire:['characterId','dungeonId'],dismiss:['characterId'],meet:['characterId'],
 'battle-strategy':['focusTargetId','protectTargetId','reservePercent','retreatPercent'],
 'battle-action':['intent'],
 'enter-room':['nodeId','routeIndex'],'extract-expedition':[],'use-camp':[],'open-chest':[],'harvest-beast':['beastUnitId'],'harvest-beasts':['beastUnitIds'],
 'check-history':['before'],'battle-report':['battleId'],'quote-hire':['characterId','dungeonId'],'start-expedition':['dungeonId','difficultyId'],describe:['reason','mode','characterId'],clarify:['reason'],
 'bargain-hire':['characterId','dungeonId','offeredFee'],'accept-hire-offer':['characterId','dungeonId','quoteId','quoteStep'],
 'person-history':['characterId','category','before'],
 'resolve-person':['name'],'label-person':['characterId','name'],'inspect-person':['characterId'],'tell-party':['text'],'tell-person':['characterId','text'],'address-person':['characterId','intent'],
 'promise-gold':['characterId','amount','dueDay'],'fulfill-promise':['characterId','commitmentId','commitmentStep'],'cancel-promise':['characterId','commitmentId','commitmentStep'],
 'promise-item':['characterId','itemId','quantity','dueDay'],
 'give-item':['characterId','itemId','quantity'],'give-gold':['characterId','amount'],
 invite:['characterId','locationId','day','hour','minute'],'attend-invitation':['characterId','commitmentId','commitmentStep'],'respond-npc-request':['requestId','action','itemId'],'escape-captivity':['statusId'],cultivate:['days','hours','minutes'],'wait-until':['day','hour','minute'],'resume-long-action':['actionId'],'abandon-long-action':['actionId'],
 'invite-date':['characterId','locationId','year','month','day','hour','minute'],'wait-until-date':['year','month','day','hour','minute'],
 spar:['characterId'],
 'propose-custody-transfer':['characterId','buyerId','gold','expiresInMinutes','deviceTerms'],'respond-custody-transfer':['offerId','accept','reason'],'cancel-custody-transfer':['offerId','offerStep'],
 'start-custody-auction':['characterId','reserveGold','durationMinutes','deviceTerms'],'bid-custody-auction':['auctionId','gold','quoteEventId','reason'],'pass-custody-auction':['auctionId','quoteEventId','reason'],'cancel-custody-auction':['auctionId','auctionStep'],
 'person-duel':['characterId'],'capture-person':['characterId','defeatId','restraintItemIds'],'spare-person':['characterId','defeatId'],'execute-person':['characterId','defeatId'],
 'search-captive':['characterId','resourceKind','itemId','quantity'],'release-captive':['characterId'],'set-restraint-mode':['itemId','mode','relockAfterMinutes','limits'],'detach-restraint':['itemId'],'attach-restraint':['characterId','itemId'],'permit-restraint':['characterId','itemId'],'request-restraint-permission':['characterId','itemId'],'revoke-restraint-permission':['permissionId'],
 'intimate-craft':['templateId'],'intimate-equip':['itemId','targetId','slot','forced'],'intimate-detach':['itemId'],
 'device.lock':['itemId','lockId'],'device.unlock':['itemId','lockId','keyItemId','skillId','nodeId'],'device.suppress-lock':['itemId','lockId','skillId','nodeId'],'device.break-rule':['itemId','lockId','skillId','nodeId'],'device.analyze-lock':['itemId','lockId','skillId','nodeId'],'device.create-key':['itemId','lockId','skillId','nodeId','knowledgeId','materials'],'device.arcane-lock':['itemId','lockId','skillId','nodeId'],
 'host.set-suppression':['itemId','percent'],'host.set-form':['itemId','slot','formId','level'],'host.set-appearance':['itemId','preset'],
 'permit-seal':['itemId','operatorId','releaseAfterMinutes','mode'],'revoke-seal-permission':['permissionId'],'seal-person':['itemId','targetId','permissionId','defeatId','mode'],'awaken-seal':['itemId'],'open-seal':['itemId'],'strike-seal-device':['itemId'],'seize-seal-device':['itemId'],'transfer-seal-control':['itemId','targetId'],'await-seal-release':['minutes'],
 'issue-field-control':['characterId','command','giftStep'],'prepare-poisoned-serving':['itemId','carrierItemId'],'offer-disguised-drug':['itemId','targetId','claim','covert'],'respond-disguised-drug':['offerId','decision'],'consume-food-drink':['itemId','offerId'],'coat-item':['itemId','carrierItemId'],'apply-contact-drug':['itemId','targetId'],'direct-spray':['itemId','targetId'],'release-toxic-cloud':['itemId'],'touch-coated-item':['itemId','targetId'],
 'use-field-ability':['deviceNodeId','lockId','knowledgeId','skillId','targetId','modeId','force','permissionId','branchIds','targetItemId','recipeId','blueprintId','materials','quantity'],'request-ability-use':['deviceNodeId','lockId','knowledgeId','skillId','targetId','modeId','branchIds','targetItemId','recipeId','blueprintId','materials','quantity'],'respond-ability-use':['permissionId','accept','reason'],'stop-maintenance':['maintenanceSourceId'],'dismiss-disguise':['statusId'],'inspect-disguise':['targetId','method'],'disclose-identity':[],
 'prepare-cooperation-battle':['cooperationId','deviceOperations'],'recover-cooperation-restraints':['preparationId'],'close-cooperation-preparation':['preparationId','reason'],
 'propose-person-cooperation':['characterId','basis','membership','dungeonId','allowTravel','allowCombat','durationMinutes'],'respond-person-cooperation':['cooperationId','accept','reason'],'impose-person-cooperation':['characterId','membership','dungeonId','allowTravel','allowCombat','durationMinutes'],'end-person-cooperation':['cooperationId','reason'],'resume-person-cooperation':['cooperationId'],
 'observe-custody-person':['characterId'],'tell-custody-news':['characterId','factIds'],'send-custody-letter':['characterId','factIds','destinationId'],
 'acquire-custody-facility':['templateId','mode'],
 'visit-custody-cell':['facilityId','cellId'],'set-custody-cell-door':['facilityId','cellId','locked'],'break-custody-cell-door':['facilityId','cellId'],'repair-custody-facility':['facilityId'],'place-captive':['facilityId','cellId','characterId'],'admit-captive':['facilityId','cellId','characterId'],'withdraw-captive':['facilityId','characterId'],
 'permit-custody-duty':['characterId','mode'],'assign-custody-guard':['facilityId','characterId'],'end-custody-duty':['dutyId'],
 'start-custody-escort':['targetIds','destinationId','guardIds'],'pause-custody-escort':['escortId'],'resume-custody-escort':['escortId'],'cancel-custody-escort':['escortId'],'captive-daily':['minutes'],
 'exchange-contact':['characterId'],
 'propose-loot-resolution':['characterId','allocationId','resourceKind','resourceId','recipientId','quantity','nextPriority'],'collect-loot':['resolutionId','resolutionStep'],
 'propose-loot':['characterId','dungeonId','terms'],
 'invite-party':['characterId','membership','dungeonId'],'end-party':['characterId','membershipId'],'choose-guide':['enabled'],
 'invite-realm-guest':['characterId','realmId','regionId'],'propose-relationship':['characterId','relationship','roles'],
 'respond-person-relation':['relationId','accept','reason'],
 'respond-restraint-permission-request':['permissionId','accept','reason'],
 'end-relationship':['characterId','relationshipId'],
 'attribute-check':['attribute','difficulty','reason'],
 'free-action':['intent','actorId','objective','minutes','check','onSuccess','onFailure'],
 'opposed-check':['characterId','attribute','defenderAttribute','reason'],
 'introduce-person':['objectId','objectStep','identity','occupation','archetypeId','name','age','gender','appearance','personality','profile','level','martialSoulTemplateId','martialSoulDescription','martialSoulDraft','presetId'],
 'inspect-inventory':['view','selectedItemId'],'inspect-growth':[],...EVOLUTION_ACTION_FIELDS,'allocate-growth':['attribute','steps'],
 'inspect-ring':['beastUnitId','martialSoulId'],'prepare-ring':['beastUnitId','martialSoulId',...RING_GENERATION_FIELDS],
 'inspect-ring-item':['itemId','martialSoulId'],'prepare-ring-item':['itemId','martialSoulId',...RING_GENERATION_FIELDS],
 'inspect-ring-choices':['pendingId'],'choose-ring':['pendingId','candidateId'],
};
for(const [kind,parameters] of Object.entries(ACTION_FIELDS))if(kind!=='describe'&&parameters.includes('characterId'))parameters.push('characterStep');
for(const parameters of Object.values(ACTION_FIELDS))if(parameters.includes('itemId'))parameters.push('itemStep');
const FIELD_ABILITY_OPTIONAL:Record<string,string[]>={'inspect-disguise':['method'],
 'use-field-ability':['deviceNodeId','lockId','knowledgeId','targetId','modeId','force','permissionId','branchIds','targetItemId','recipeId','blueprintId','materials','quantity'],
 'request-ability-use':['deviceNodeId','lockId','knowledgeId','modeId','branchIds','targetItemId','recipeId','blueprintId','materials','quantity'],
};
const ACTION_VALUE_OPTIONS:Record<string,Record<string,readonly unknown[]>>={
 equip:{slot:rules.world.EQUIPMENT_SLOTS},unequip:{slot:rules.world.EQUIPMENT_SLOTS},
 'opening-situation':{action:['settle','decline','return']},
 'opening-guidance':{action:['claim','defer','skip'],giftId:Object.keys(rules.talents.MASTER_GIFTS)},
 travel:{mode:Object.entries(rules.world.PATH_MODES).map(([value,meaning])=>({value,...meaning as object}))},
 'propose-relationship':{relationship:Object.entries(RELATIONSHIP_LABELS).map(([value,label])=>({value,label}))},
 'invite-party':{membership:['temporary','long-term']},'choose-guide':{enabled:[true,false]},
 'person-history':{category:PERSON_HISTORY_CATEGORIES},
 'attribute-check':{attribute:STORY_CHECK_ATTRIBUTES,difficulty:STORY_CHECK_DIFFICULTIES},
 'allocate-growth':{attribute:STORY_CHECK_ATTRIBUTES},
 'opposed-check':{attribute:STORY_CHECK_ATTRIBUTES,defenderAttribute:STORY_CHECK_ATTRIBUTES},
};
const NON_EXECUTING_RESULTS:Readonly<Record<string,StoryStepResult['status']>>={describe:'described',clarify:'clarify'};
const REFERENCE_PAIRS=[['characterId','characterStep'],['itemId','itemStep'],['commitmentId','commitmentStep'],['quoteId','quoteStep'],['resolutionId','resolutionStep'],['offerId','offerStep'],['auctionId','auctionStep']];
const INTEGER_PARAMETERS=new Set(['percent','steps','objectStep','itemStep','characterStep','commitmentStep','quoteStep','resolutionStep','giftStep','offerStep','auctionStep','year','month','day','hour','minute','amount','dueDay','quantity','before','offeredFee','reservePercent','retreatPercent','difficulty','age','level','durationMinutes','gold','reserveGold','maximumGold','expiresInMinutes']);
const COMMERCE_LOT_REFERENCE=Object.freeze({source:'commerce.auctions.lots',valueField:'id',matchFields:['name','assetKind','status','sellerId'],meaning:'引用当前可见拍品记录的完整id；操作来源sourceId和报价版本quoteEventId不是拍品id。无唯一对应项时先查询或澄清。'});
const COMMERCE_LOT_ELIGIBILITY:Readonly<Record<string,string>>=Object.freeze({'bid-asset-auction':'canBid','register-auction-proxy':'canProxy','cancel-asset-auction':'canCancel','relist-asset-auction':'canRelist','collect-auction-item':'canCollect','take-asset-auction-host':'canTakeHost'});
const COMMERCE_LOT_ACTIONS=new Set(['inspect-commerce',...Object.keys(COMMERCE_LOT_ELIGIBILITY),'cancel-auction-proxy','take-auction-proxy']);
function commerceReferenceParameters(kind:string):Record<string,any>{
 if(COMMERCE_LOT_ACTIONS.has(kind))return {auctionId:{...COMMERCE_LOT_REFERENCE,...(COMMERCE_LOT_ELIGIBILITY[kind]?{eligibilityField:COMMERCE_LOT_ELIGIBILITY[kind]}:{}),...(['cancel-auction-proxy','take-auction-proxy'].includes(kind)?{requiredRecord:{field:'proxy.status',value:'active'}}:{})}};
 if(kind==='start-curated-auction')return {catalogId:{source:'commerce.auctions.catalog',valueField:'id',matchFields:['name','assetKind'],eligibilityField:'canStart'}};
 if(kind==='start-asset-auction')return {itemId:{source:'commerce.ownedAssets',valueField:'itemId',matchFields:['name','assetKind'],applicableWhen:{assetKind:['item','loaded-seal']}},fingerprint:{source:'commerce.ownedAssets',valueField:'fingerprint',matchFields:['name','assetKind'],applicableWhen:{assetKind:['material']}},materials:{source:'commerce.ownedAssets',valueField:'fingerprint',matchFields:['name','assetKind'],applicableWhen:{assetKind:['materials']}}};
 return {};
}
export const STORY_ACTION_SCHEMA=Object.entries(ACTION_FIELDS).map(([kind,parameters])=>({...residentActionMetadata(kind),...personContractActionMetadata(kind),
 ...(kind==='propose-relationship'?{optionalParameters:['roles'],objectParameters:{roles:{fields:['self','other'],meaning:'关系双方身份；self为提出者，other为受邀者，例如{self:徒弟,other:师父}。省略采用该关系默认方向。'}}}:{}),
 ...(kind==='recover-party'?{optionalParameters:['memberId']} :{}),
 ...evolutionActionSchema(kind),
 ...(kind==='inspect-inventory'?{optionalParameters:['view','selectedItemId'],valueOptions:{view:['summary','details','equipment-comparison']}}:{}),
 ...(kind==='describe'?{optionalParameters:['mode','characterId'],valueOptions:{mode:['scene','daily','explanation']},parameterMeanings:{mode:'daily写当场享用的日常小事，characterId可指定一名在场参与者。scene表达其他文学场景；explanation仅解释同轮正式行动的条件，不另写小说，也不作为数值或行动结果'}}:{}),
  ...(COMMERCE_LOT_ACTIONS.has(kind)||['start-curated-auction','start-asset-auction'].includes(kind)?{referenceParameters:commerceReferenceParameters(kind)}:{}),
 ...(kind==='inspect-commerce'?{optionalParameters:['auctionId','itemName'],parameterMeanings:{itemName:'按玩家的商品原名查看此地实际货架，并报告是否有货。',auctionId:'当前可见拍品的原lotId；指定时只看此件，省略查看市场索引；不出价、不付款、不推进时间'}}:{}),
 purpose:STORY_ACTION_PURPOSES[kind],
 ...(kind==='intimate-craft'?{valueOptions:{templateId:Object.keys(rules.wearables.REGISTRY)},parameterMeanings:{templateId:'仅登记的中性眼、口、颈器具；沿原制式价格制作'}}:{}),
 ...(kind==='intimate-equip'?{optionalParameters:['targetId','slot','forced'],booleanParameters:['forced'],parameterMeanings:{targetId:'省略为本人；他人仍须满足原无反抗能力及现场条件',slot:'省略为该器具原默认部位',forced:'仅明确请求他人装配时为true，仍交原权限判断'}}:{}),
 ...(['device.lock','device.unlock','device.suppress-lock','device.break-rule','device.analyze-lock','device.create-key','device.arcane-lock'].includes(kind)?{optionalParameters:parameters.filter(p=>['lockId','nodeId','keyItemId','materials'].includes(p)||kind==='device.unlock'&&p==='skillId'),parameterMeanings:{itemId:'deviceOperations中实际可操作的器具ID',lockId:'省略时读取实物当前锁；指定须与当前实际锁完全匹配',skillId:'须引用本人实际持有且支持该器具效果的正式技能；复锁不得填技能',nodeId:'所选技能中对应的唯一正式器具效果节点',keyItemId:'实际持有并匹配锁实例或图纸的钥匙，不与解锁技能并用',knowledgeId:'本人通过真实解析取得且匹配当前锁的知识；不会从名称推断知识'}}:{}),
 ...(kind==='device.create-key'?{arrayParameters:{materials:{items:'{fingerprint:本人永久材料原指纹,quantity:实际投入数量}',minItems:1,maxItems:24,uniqueItems:true}}}:{}),
 ...(kind==='host.set-suppression'?{requiredParameters:['percent'],ranges:{percent:[0,100]},parameterMeanings:{percent:'原宿主抑制比例的整数百分比；不改变冻结的能力清单'}}:{}),
 ...(kind==='host.set-form'?{requiredParameters:['slot','formId'],optionalParameters:['level'],ranges:{level:[0,5]},parameterMeanings:{slot:'正式登记且未被占用的部位',formId:'正式登记的形态ID；空字符串仅清空所选部位',level:'省略为0；最终上限由原形态登记决定，不能增加原宿主能力'}}:{}),
 ...(kind==='host.set-appearance'?{requiredParameters:['preset'],parameterMeanings:{preset:'所选宿主已经登记的原外观预设，不生成新预设'}}:{}),
 ...(kind==='battle-action'?{objectParameters:{intent:{fields:[...BATTLE_ACTION_FIELDS],typeValues:[...BATTLE_ACTION_TYPES],meaning:'type取索引actionType原值；普通攻击和魂技均为“技能”，skillId取能力id，targetIds填真实参战单位id。只能操作本人，目标、移动、费用和限制交正式战斗预览与执行。开战前安排点名魂技也使用同一结构。'}}}:{}),
 ...(['prepare-ring','prepare-ring-item'].includes(kind)?{optionalParameters:RING_GENERATION_FIELDS,arrayParameters:Object.fromEntries(RING_GENERATION_FIELDS.filter(k=>!['evolutionTarget','presetId','defaultCastMode','usageRules','cooldownTurns'].includes(k)).map(k=>[k,{items:'正式规则结构化提案',minItems:0,maxItems:k==='exchangeContracts'?8:32}])),objectParameters:{evolutionTarget:{meaning:'本次新环牵引的完整目标武魂，结构费用与魂技共用变化前冻结额度'},usageRules:{meaning:'每日/本场/共享次数及世界冷却'}},integerParameters:['cooldownTurns']}:{}),
 ...(['recommend-research','preview-research','begin-research'].includes(kind)?{optionalParameters:['presetId','hostDesign','confirmedDesign',...(kind==='begin-research'?['expectedMechanicsHash']:[])],objectParameters:{confirmedDesign:{fields:['version','category','name','description','appearance','definition','carrierTemplateId'],meaning:'玩家审阅确认的当前五类完整固定设计；与presetId/hostDesign互斥。定义、能力、费用及材料桥梁均由正式规则报价，不能凭名称补造。'},hostDesign:{fields:['version','carrierTemplateId','definition'],meaning:'已确认的宿主提案；version=1，carrierTemplateId为实际载体制式，definition包含正式host与原效果。不与精品presetId同时使用，具体成本、材料和可执行性由正式研发报价判断。'}},parameterMeanings:{presetId:'玩家点名的正式精品预设ID；省略则使用普通生成',hostDesign:'仅传递玩家已明确确认的能力组合，不替玩家补选、增删或降低强度；先查看正式报价再投入',confirmedDesign:'从玩家已审阅的实际提案完整传递，不改变品类、载体、节点或参数；先预览再确认实际hash投入',expectedMechanicsHash:'仅begin-research使用，对应当前完整设计与实际材料的正式预览mechanicsHash；不得猜测或沿用旧hash'}}:{}),
 ...(rules.sealing.INTENTS.includes(kind)?{optionalParameters:parameters.filter(p=>['permissionId','defeatId','mode'].includes(p)),integerParameters:parameters.filter(p=>['releaseAfterMinutes','minutes'].includes(p)),ranges:{releaseAfterMinutes:[1,525600],minutes:[1,1440]},...(parameters.includes('mode')?{valueOptions:{mode:['awake','stasis']}}:{}),parameterMeanings:{permissionId:'已授予、尚未使用的本人封存许可',operatorId:'实际持有空封神台且有控制权的同场操作者',targetId:'实际同场人物；开罩释放与解除其他拘束分别执行',mode:'awake为闭罩清醒囚禁；stasis或省略为个人时间暂停的静滞封存'}}:{}),
 ...(kind==='start-asset-auction'?{optionalParameters:['itemId','targetId','fingerprint','reserveGold','auctionClass','accountId','deviceTerms','materials'],valueOptions:{assetKind:['item','loaded-seal','person','material','materials'],auctionClass:['regular','rare']},parameterMeanings:{quantity:'同一实物堆栈或来源材料的实际数量；人物和载人器组合仅为1',reserveGold:'明确指定的保留价；省略按机制估值70%',auctionClass:'省略按实际总机制估值选择；常规至少1000，珍品至少50000'},arrayParameters:{materials:{items:'{fingerprint:本人永久材料原指纹,quantity:实际选入组的数量}',minItems:1,maxItems:24,uniqueItems:true},deviceTerms:{items:'{itemId:本人实际拥有或有控制权的器具ID,transferOwnership:boolean,transferControl:boolean}',minItems:0,maxItems:6,uniqueItems:true}}}:{}),
 ...(['trade-commerce-material','bid-asset-auction','register-auction-proxy'].includes(kind)?{optionalParameters:parameters.filter(p=>['accountId','quoteVersion'].includes(p)),integerParameters:parameters.filter(p=>['gold','maximumGold','quantity'].includes(p)),ranges:{gold:[0,1000000000],maximumGold:[0,1000000000]},parameterMeanings:{accountId:'省略为本人私人钱包；指定账户必须是本人登记经营账户，退款沿原账户',maximumGold:'全额代理预存上限M，按最低合法价p成交，余额退原账户'}}:{}),
 ...(kind==='ship-shop-auction'?{optionalParameters:['itemId','fingerprint'],integerParameters:['quantity'],parameterMeanings:{itemId:'实际店铺经营者拥有的原实物ID；与fingerprint二选一',fingerprint:'该店原材料指纹；送达前原店不能再次销售',quantity:'明确实际数量；按真实路线时间和运费运输，先预留未来拍位'}}:{}),
 ...(['buy','supply-buy','trade-commerce-material'].includes(kind)?{optionalParameters:[...parameters.filter(p=>['accountId','quoteVersion','maximumGold'].includes(p))],parameterMeanings:{maximumGold:'购买实际总付款的最高金币；包括原价余量，超过即不成交。省略时没有新增上限。'}}:{}),
 ...(kind==='set-commerce-subscription'?{booleanParameters:['enabled'],optionalParameters:['flags','filters'],objectParameters:{flags:{meaning:'stock/preview/owned/newProduct/firstStock布尔开关；上新和首批库存默认关闭'},filters:{meaning:'minimumGold/maximumGold/minimumYears/maximumYears非负整数，categories/templateIds字符串数组，keyword名称关键词'}}}:{}),
 ...(kind==='reply-commerce-message'?{sourceText:{parameter:'text',verbatim:true,maxLength:2000}}:{}),

 ...(['propose-custody-transfer','start-custody-auction'].includes(kind)?{optionalParameters:kind==='propose-custody-transfer'?['deviceTerms','expiresInMinutes']:['deviceTerms','durationMinutes'],arrayParameters:{deviceTerms:{items:'{itemId:实际佩戴器具ID,transferOwnership:boolean,transferControl:boolean}',minItems:0,maxItems:6,uniqueItems:true}},ranges:{gold:[0,1000000000],reserveGold:[0,1000000000],expiresInMinutes:[1,1440],durationMinutes:[1,1440]},parameterMeanings:{deviceTerms:'仅明确列出的器具权益随同交付；未列出的所有权、控制权保留',expiresInMinutes:'报价有效分钟，省略为60',durationMinutes:'逐件时长由实际场次登记（常规5分钟、珍品10分钟），输入数值不改变排期'}}:{}),
 ...(kind==='respond-custody-transfer'?{booleanParameters:['accept']}:{}),
 ...(['bid-custody-auction','pass-custody-auction'].includes(kind)?{parameterMeanings:{quoteEventId:'当前实际可见拍卖的报价版本；不得猜测或沿用已变化版本'},ranges:{gold:[0,1000000000]}}:{}),
 ...(kind==='issue-field-control'?{optionalParameters:['giftStep'],parameterMeanings:{giftStep:'履行本轮前面 propose-gift 的零基步骤编号；command={type:fulfill-gift}，不可猜新约定ID，也不能和commitmentId混用。提出成功不等于接收人已经同意。'},objectParameters:{command:{types:rules.fieldControl.ACTIONS,meaning:'一项具体场外行动；执行者由characterId指定，不得嵌套命令或任意修改。speak-person 的 text 须逐字取自本片段中唯一出现的完整原话，不得替玩家创作或改写。'}}}:{}),
 ...(kind==='inspect-disguise'?{optionalParameters:['method'],valueOptions:{method:['visual','contact']},parameterMeanings:{method:'visual为观察，contact先按实际距离和身体限制完成触及检定；识破不解除来源，也不自动知道真名'}}:{}),
 ...(['use-field-ability','request-ability-use'].includes(kind)?{optionalParameters:FIELD_ABILITY_OPTIONAL[kind],parameterMeanings:{modeId:'只可填写该能力modes列表中的实际费用模式id；modes为空时整个省略modeId字段，不填null、空字符串或用途id。用途分支id只填入branchIds，不能当作费用模式。',branchIds:'该能力branches列表中的实际用途id，可按原能力声明组合；不是费用模式。'},arrayParameters:{branchIds:{items:'能力索引中实际用途id',minItems:1,maxItems:16,uniqueItems:true}},integerParameters:['quantity']}:{}),
 ...(kind==='use-field-ability'?{booleanParameters:['force'],parameterMeanings:{modeId:'只可填写该能力modes列表中的实际费用模式id；modes为空时整个省略modeId字段，不填null、空字符串或用途id。用途分支id只填入branchIds，不能当作费用模式。',branchIds:'该能力branches列表中的实际用途id，不是费用模式。',force:'仅玩家明确要求强制施用时为true；普通拒绝不能自动升级。实际全身拘束或有效精神控制支持强制喂服；部分束缚或实际囚禁可场外对抗，未吞服不耗药；仍须同场且口部可吞服。自由目标的有害施用仍须先取得实际控制',permissionId:'已接受且尚未使用的实际本次施用请求ID'}}:{}),
 ...(kind==='prepare-cooperation-battle'?{arrayParameters:{deviceOperations:{items:COOPERATION_DEVICE_PARAMETERS,minItems:1,maxItems:6,uniqueItems:true}},parameterMeanings:{deviceOperations:'逐件明确临战操作与战后目标；同一itemId不得重复。完全拆下不承诺戰后能重新戴回'}}:{}),
 ...(['recover-cooperation-restraints','close-cooperation-preparation'].includes(kind)?{lifecycle:COOPERATION_PREPARATION_LIFECYCLE}:{}),
 ...(rules.cooperation.INTENTS.includes(kind)?{booleanParameters:parameters.filter(p=>['allowTravel','allowCombat','accept'].includes(p)),optionalParameters:parameters.filter(p=>['dungeonId','durationMinutes','allowTravel','allowCombat'].includes(p)),valueOptions:{basis:['voluntary','coerced'],membership:['temporary','long-term'],allowTravel:[true,false],allowCombat:[true,false],accept:[true,false]},parameterMeanings:{durationMinutes:'临时合作期限，1至43200分钟；长期不使用',allowTravel:'实际旅行许可',allowCombat:'实际参战许可；不代签战利品或移交拘束器'}}:{}),
 ...(kind==='register-competition'?{optionalParameters:['venueId'],defaults:{venueId:'当前地点登记的赛场'},valueOptions:{venueId:Object.values(rules.arena.COMPETITION_VENUES).map((v:any)=>({value:v.id,name:v.name,locationId:v.locationId}))}}:{}),
 ...(NON_EXECUTING_RESULTS[kind]?{resultStatuses:[NON_EXECUTING_RESULTS[kind]]}:{}),
 ...(kind==='enter-room'?{exactlyOneOf:[['nodeId','routeIndex']],integerParameters:['routeIndex'],parameterMeanings:{nodeId:'已知的实际路线编号',routeIndex:'玩家明确指定的可选路线顺序，零基；执行时读取当时规则可选列表，可用于本轮出发后才生成的路线；未指定顺序时不代选'}}:{}),
 ...(parameters.includes('before')?{pagination:{before:-1,pageSize:8,next:'nextBefore'}}:{}),
 ...(['tell-custody-news','send-custody-letter'].includes(kind)?{arrayParameters:{factIds:{items:'string',minItems:1,maxItems:8,uniqueItems:true}}}:{}),
 ...(kind==='start-custody-escort'?{optionalParameters:['guardIds'],arrayParameters:{targetIds:{items:'string',minItems:1,maxItems:20,uniqueItems:true},guardIds:{items:'string',minItems:0,maxItems:3,uniqueItems:true}}}:{}),
 ...(kind==='visit-custody-cell'?{optionalParameters:['cellId']}:{}),
 ...(kind==='escape-captivity'?{parameterMeanings:{statusId:'当前实际脱困选项的statusId；空字符串表示避开看守'}}:{}),
 ...(['capture-person','spare-person','execute-person'].includes(kind)?{optionalParameters:['defeatId'],parameterMeanings:{defeatId:'已知的死斗战败资格；省略时执行器只接受对该人物唯一有效的待处置资格'}}:{}),
 ...(kind==='capture-person'?{arrayParameters:{restraintItemIds:{items:'本人随身的真实拘束器ID',minItems:1,maxItems:6,uniqueItems:true}}}:{}),
 ...(kind==='search-captive'?{optionalParameters:['itemId','itemStep'],valueOptions:{resourceKind:['item','coins']}}:{}),
 ...(kind==='set-restraint-mode'?{optionalParameters:['relockAfterMinutes','limits'],integerParameters:['relockAfterMinutes'],ranges:{relockAfterMinutes:[1,1440]},valueOptions:{mode:['locked','escort','released','limited']},objectParameters:{limits:CONTROL_LIMIT_PARAMETERS},parameterMeanings:{limits:'支持精细配置的器具在limited模式下必须提交实际配置；禁魂项圈不具备伤害调节能力，其他来源独立取最严'}}:{}),
 ...(['tell-person','tell-party','ask-release'].includes(kind)?{sourceText:{parameter:'text',verbatim:true,maxLength:2000}}:{}),
 ...(['address-person','consider-person-goal'].includes(kind)?{sourceText:{parameter:'intent',verbatim:true,maxLength:2000}}:{}),
 ...(kind==='consider-person-goal'?{optionalParameters:['intent']}:{}),
 ...(kind==='travel'?{defaults:{mode:'balanced'},parameterMeanings:{mode:'路线偏好'}}:{}),
 ...(kind==='equip'?{optionalParameters:['slot']}:{}),
 ...(['invite','wait-until','promise-gold','promise-item'].includes(kind)?{dateBasis:'世界日，当前为time.day'}:{}),
 ...(['invite-date','wait-until-date'].includes(kind)?{dateBasis:'斗罗历calendar.date；每月30日，每年12月'}:{}),
 ...(kind==='cultivate'?{integerParameters:['days','hours','minutes'],duration:{unit:'minute',min:1,max:44640},parameterMinimum:0}:{}),
 ...(kind==='free-action'?{duration:{unit:'minute',min:0,max:60}}:{}),
 ...(kind==='battle-strategy'?{defaults:'未提及字段沿用battle.strategy；空目标用字符串none',ranges:{reservePercent:[0,100],retreatPercent:[0,100]},parameterMeanings:{focusTargetId:'优先攻击目标',protectTargetId:'优先支援目标',reservePercent:'保留的最大魂力百分比',retreatPercent:'生命不高于最大生命该百分比时尝试撤离，0关闭'}}:{}),
 ...(kind==='propose-loot'?{jsonStringParameters:{terms:{shares:'参与者ID到正整数权重，均分为1',itemOwners:'物品模板ID到获得全部此类收获的成员ID，默认{}',itemTargets:'可选[{templateId,personId,quantity,name?}]，限定前quantity件、可限定完全同名',remainderOwner:'明确指定的余数获得者ID，默认null暂存协商'}},termScope:'实际取得的非魂环收获；未指定独立物品暂存协商，雇员默认按雇佣合同'}:{}),
 ...(kind==='propose-loot-resolution'?{optionalParameters:['nextPriority'],valueOptions:{resourceKind:['item','material']},jsonStringParameters:{nextPriority:{personId:'原参与者ID',templateId:'非魂环物品模板ID',name:'可选的完全同名限制'}},parameterMeanings:{nextPriority:'本次交付后，原参与者下次共同取得一件对应收获时先征求该人分配意见'}}:{}),
 ...(kind==='respond-npc-request'?{optionalParameters:['itemId','itemStep'],requiredReferenceWhen:{fields:['itemId','itemStep'],action:'fulfill'},valueOptions:{action:['decline','fulfill']}}:{}),
 ...(kind==='allocate-growth'?{ranges:{steps:[1,99]}}:{}),
 ...(parameters.includes('materials')?{arrayParameters:{materials:{items:'{fingerprint:玩家永久材料库真实指纹,quantity:正整数}',minItems:1,maxItems:24}},selection:'玩家选定或同意的实际用料'}:{}),
 ...(kind==='begin-research'?{booleanParameters:['confirmed'],confirmation:{confirmed:true,scope:'具体材料的不可退还投入'}}:{}),
 ...(kind==='choose-research'?{integerParameters:['candidateIndex'],selection:'已知候选的零基编号，玩家选择或明确委托'}:{}),
 ...(kind==='answer-person-plan'?{booleanParameters:['accept'],selection:'玩家对已有NPC邀约的实际答复'}:{}),
 ...(kind==='await-rescue'?{integerParameters:['minutes'],ranges:{minutes:[1,1440]}}:{}),
 ...(kind==='respond-rescue-evacuation'?{booleanParameters:['accept']}:{}),
 ...(kind==='opening-guidance'?{optionalParameters:['giftId'],requiredWhen:{giftId:{action:'claim'}},selection:'玩家选择的已有giftId'}:{}),
 ...(kind==='create-support-consumable'?{optionalParameters:['modifierSkillId','modeId'],valueOptions:{recipeId:Object.entries(rules.world.SUPPORT_CONSUMABLE_RECIPES).map(([value,r]:[string,any])=>({value,name:r.name}))},parameterMeanings:{recipeId:'已有食品制造资格时选择正式配方；具体可用配方、本人增幅和费用见supportManufacturing；只操作本人',modifierSkillId:'本人实际拥有的制造增幅能力，省略不附加增幅',modeId:'该增幅实际登记的费用模式，省略沿用默认模式'}}:{}),
 ...(kind==='use-item'?{optionalParameters:['actorId','targetId'],defaults:{actorId:'player.id',targetId:'actorId'}}:{}),
 ...(kind==='free-action'?{allParametersRequired:true,objectParameters:{intent:FREE_ACTION_INTENT_SCHEMA,check:FREE_ACTION_CHECK_SCHEMA},arrayParameters:{onSuccess:{items:freeActionEffectSchema(),maxItems:FREE_ACTION_BRANCH_LIMIT},onFailure:{items:freeActionEffectSchema(),maxItems:FREE_ACTION_BRANCH_LIMIT}},updateStates:{clue:['confirmed'],opportunity:['used','closed'],event:['advanced','resolved']},integerParameters:['minutes']}:{}),
 ...(kind==='remember-object'?{requiredParameters:['objectType','name','quote','reason'],optionalParameters:['objectId','aliases','from','details'],arrayParameters:{aliases:{items:'string',maxItems:8,uniqueItems:true}},objectParameters:{from:STORY_OBJECT_FROM_SCHEMA,details:STORY_OBJECT_DETAILS_SCHEMA},valueOptions:{objectType:['person','item']}}:{}),
 ...(kind==='instantiate-item'?{exactlyOneOf:[['objectId','objectStep']],source:'已确立持有人的叙事物件'}:{}),
 ...(kind==='invite-party'?{optionalParameters:['dungeonId'],requiredWhen:{dungeonId:{membership:'temporary'}},omittedWhen:{dungeonId:{membership:'long-term'}}}:{}),
 ...(['give-item','give-gold'].includes(kind)?{sequence:['offer','independent-response-and-delivery']}:{}),
 ...(kind==='introduce-person'?{optionalParameters:['objectId','objectStep','identity','occupation','presetId','martialSoulTemplateId','martialSoulDescription'],parameterMeanings:{martialSoulTemplateId:'沿用personCreationOptions的正式模板id时，省略presetId、martialSoulDescription和martialSoulDraft',presetId:'选择定位预算内的精品id时，省略自定义构想和草案，模板字段省略或填空字符串',martialSoulDescription:'自定义构想与模板、精品互斥；模板字段填空字符串，工作流生成并校验草案，主持不自行编造martialSoulDraft'},referenceParameters:{objectId:'已有叙事对象ID',objectStep:'同轮前置remember-object/resolve-object的步骤号；与objectId互斥'},linkedObjectDefaults:{biography:'关联叙事对象时age/gender/appearance/personality可省略，保留未知或已确定来源',mechanics:'关联叙事对象时level/martialSoulTemplateId可省略，保留原型并延后能力/初始财产，实际切磋或数值检定时才补齐；civilian不凭空觉醒'}}:{}),
 ...(kind==='harvest-beasts'?{arrayParameters:{beastUnitIds:{items:'string',minItems:1,maxItems:12,uniqueItems:true}}}:{}),
 kind,parameters:parameters.filter(key=>!['martialSoulDraft','evidence'].includes(key)),
 ...(parameters.some(key=>INTEGER_PARAMETERS.has(key))?{integerParameters:parameters.filter(key=>INTEGER_PARAMETERS.has(key))}:{}),
 ...(REFERENCE_PAIRS.some(pair=>pair.every(key=>parameters.includes(key)))?{exactlyOneOf:REFERENCE_PAIRS.filter(pair=>pair.every(key=>parameters.includes(key)))}:{}),
 ...(ACTION_VALUE_OPTIONS[kind]?{valueOptions:ACTION_VALUE_OPTIONS[kind]}:{}),
})).map(entry=>(PLAYER_REASON_ACTIONS as readonly string[]).includes(entry.kind)?{...entry,optionalParameters:[...new Set([...(entry.optionalParameters??[]),'reason'])]}:entry);
export function validateStoryPlan(value:unknown,input:string):StoryPlan {
 const rootIssues=storyPlanObjectIssues(value,['segments','privateTo'],'');
 if(rootIssues.length)throw new StoryPlanValidationError('叙事提案含有未支持的字段或对象结构',rootIssues[0],rootIssues);
 fields(value,['segments','privateTo']);const privateTo=(value as any).privateTo===undefined?undefined:checkPrivateRouteRequest((value as any).privateTo,input);let segments=(value as any).segments;
 if(!Array.isArray(segments)||!segments.length||segments.length>12)throw Error('主持人需给出 1 到 12 个有序片段');
 const structuralIssues:StoryPlanValidationIssue[]=[];
 // Report source coordinates before macro expansion. A reference addresses an earlier
 // result, never this action, a later action, or a previous turn's step number.
 for(const [index,segment] of segments.entries()){
  const references=['characterStep','objectStep','itemStep','commitmentStep','quoteStep','resolutionStep','giftStep','offerStep','auctionStep'].map(key=>({path:`/segments/${index}/action/${key}`,value:segment?.action?.[key]}));
  if(segment?.when!==undefined)references.push({path:`/segments/${index}/when/step`,value:segment.when?.step??null});
  for(const ref of references)if(ref.value!==undefined&&(!Number.isSafeInteger(ref.value)||ref.value<0||ref.value>=index))structuralIssues.push({
   instancePath:ref.path,keyword:'prior-step-reference',submitted:ref.value,
   reference:{instancePath:'/segments',value:segments.slice(0,index).map((prior:any,step:number)=>({step,kind:prior?.action?.kind??null}))},
  });
  structuralIssues.push(...storyPlanObjectIssues(segment,['source','action','when','refreshAfter'],`/segments/${index}`),
    ...storyPlanObjectIssues(segment?.action,['kind',...(ACTION_FIELDS[segment?.action?.kind]??[])],`/segments/${index}/action`),
    ...storyObjectActionIssues(segment?.action,`/segments/${index}/action`),...freeActionShapeIssues(segment?.action,`/segments/${index}/action`));
  if(segment?.when!==undefined)structuralIssues.push(...storyPlanObjectIssues(segment.when,['step','status','outcome','belief','marketStatus','agreementStatus'],`/segments/${index}/when`));
 }
 const originalSources=segments.map((s:any)=>s?.source);
 if(originalSources.every(source=>typeof source==='string')&&!storySourcesCoverInput(input,originalSources))structuralIssues.push({
  instancePath:'/segments',keyword:'source-coverage',submitted:originalSources,reference:{instancePath:'/input',value:input},evidence:storySourceCoverageEvidence(input,originalSources),
 });
 if(structuralIssues.length)throw new StoryPlanValidationError(structuralIssues[0].keyword==='prior-step-reference'?'步骤引用须指向本轮更早的步骤结果':structuralIssues[0].keyword==='source-coverage'?'主持人必须完整引用玩家全部原话，不得省略条件或改写输入':'叙事提案含有未支持的字段或对象结构',structuralIssues[0],structuralIssues);
 for(let i=0;i<segments.length;i++){
  const s=segments[i];fields(s,['source','action','when','refreshAfter']);
  if(s.refreshAfter!==undefined&&(s.refreshAfter!==true||!STORY_QUERY_ACTIONS.includes(s.action?.kind)))throw Error('仅查询可以要求读取结果后继续安排');text(s.source,'原话片段',8000);
  if(!object(s.action)||!Object.hasOwn(ACTION_FIELDS,s.action.kind))throw Error('主持人选择了尚未接入的行动');
  fields(s.action,['kind',...ACTION_FIELDS[s.action.kind]]);
  if(s.action.kind==='describe'&&s.action.mode!==undefined&&!['scene','daily','explanation'].includes(s.action.mode))throw Error('请选择场景表达或行动说明');
  if(s.action.kind==='enter-room'&&(s.action.nodeId===undefined)===(s.action.routeIndex===undefined))throw Error('进房须指定实际路线编号或明确的可选路线顺序之一');
  if(s.action.kind==='answer-person-plan'){text(s.action.goalId,'人物目标');if(typeof s.action.accept!=='boolean')throw Error('须明确接受或拒绝人物邀约');}
  if(['remember-object','resolve-object'].includes(s.action.kind))validateStoryObjectAction(s.action,s.source);
  if(['introduce-person','instantiate-item'].includes(s.action.kind)&&s.action.objectStep!==undefined){count(s.action.objectStep,0,i-1);if(s.action.objectId!==undefined||!['remember-object','resolve-object'].includes(segments[s.action.objectStep].action.kind))throw Error('正式化须引用前置叙事对象步骤，不能混用对象ID');}
  if(s.action.kind==='instantiate-item'&&(s.action.objectId===undefined)===(s.action.objectStep===undefined))throw Error('物品实例化须指定对象ID或本轮对象步骤之一');
  if(ACTION_FIELDS[s.action.kind].includes('itemId')&&!(s.action.kind==='respond-npc-request'&&s.action.action==='decline')&&!(s.action.kind==='search-captive'&&s.action.resourceKind==='coins')&&!(s.action.kind==='consume-food-drink'&&s.action.offerId)){
   if((s.action.itemId===undefined)===(s.action.itemStep===undefined))throw Error('物品行动须指定已有编号或本轮实际取得实物的步骤之一');
   if(s.action.itemStep!==undefined){count(s.action.itemStep,0,i-1);if(!storyItemSource(segments[s.action.itemStep].action))throw Error('物品步骤须引用前面实际取得实物的成果');}
  }
  if(ACTION_FIELDS[s.action.kind].includes('characterStep')){
   if((s.action.characterId===undefined)===(s.action.characterStep===undefined))throw Error('人物行动须指定已有编号或本轮创建步骤之一');
   if(s.action.characterStep!==undefined){
    count(s.action.characterStep,0,i-1);
    if(!['introduce-person','resolve-person'].includes(segments[s.action.characterStep].action.kind))throw Error('人物步骤须引用前面的人物创建或称呼查找行动');
   }
  }
  if(s.action.kind==='collect-loot'&&((s.action.resolutionId===undefined)===(s.action.resolutionStep===undefined)))throw Error('领取须指定已有方案编号或本轮方案步骤之一');
  if(['fulfill-promise','cancel-promise','attend-invitation'].includes(s.action.kind)&&((s.action.commitmentId===undefined)===(s.action.commitmentStep===undefined)))throw Error('约定行动须指定已有编号或本轮承诺步骤之一');
  if(s.action.kind==='accept-hire-offer'&&((s.action.quoteId===undefined)===(s.action.quoteStep===undefined)))throw Error('接受报价须指定已有编号或本轮议价步骤之一');
  if(s.action.kind==='search-captive'&&(!['item','coins'].includes(s.action.resourceKind)||s.action.resourceKind==='coins'&&(s.action.itemId!==undefined||s.action.itemStep!==undefined)))throw Error('搜取须明确物品或钱币，钱币不使用物品编号');
  for(const [idKey,stepKey,priorKind] of [['offerId','offerStep','propose-custody-transfer'],['auctionId','auctionStep','start-custody-auction']])if(ACTION_FIELDS[s.action.kind].includes(stepKey)){
   if((s.action[idKey]===undefined)===(s.action[stepKey]===undefined))throw Error('撤回须指定已有编号或本轮实际发起步骤之一');
   if(s.action[stepKey]!==undefined){count(s.action[stepKey],0,i-1);const allowed=stepKey==='auctionStep'?['start-custody-auction','start-asset-auction','start-curated-auction']:[priorKind];if(!allowed.includes(segments[s.action[stepKey]].action.kind))throw Error('须引用前面实际提出的交接或拍卖');}
  }
  if(s.action.kind==='start-asset-auction'){if(!['item','loaded-seal','person','material','materials'].includes(s.action.assetKind))throw Error('拍品须指定实际类别');const required=s.action.assetKind==='person'?'targetId':s.action.assetKind==='material'?'fingerprint':'itemId';if(s.action.assetKind==='materials'){if(!Array.isArray(s.action.materials)||!s.action.materials.length)throw Error('须明确原同质材料组');}else text(s.action[required],'拍品原实体');if(s.action.auctionClass!==undefined&&!['regular','rare'].includes(s.action.auctionClass))throw Error('拍卖场次类型无效');}
  if(s.action.kind==='ship-shop-auction'){if((s.action.itemId===undefined)===(s.action.fingerprint===undefined))throw Error('送拍须指定原实物或材料指纹之一');}
  if(s.action.kind==='trade-commerce-material'&&!['buy','sell'].includes(s.action.direction))throw Error('材料交易方向无效');
  if(['prepare-ring','prepare-ring-item'].includes(s.action.kind)){const proposal=Object.fromEntries(RING_GENERATION_FIELDS.filter(k=>k!=='presetId'&&s.action[k]!==undefined).map(k=>[k,s.action[k]]));if(proposal.exchangeContracts!==undefined)rules.exchange.normalize(proposal.exchangeContracts);const check=rules.abilities.validate({id:'story-ring-proposal',...proposal});if(!check.pass)throw Error(check.errors.join('；'));}
  if(s.action.kind==='create-support-consumable'&&s.action.modeId!==undefined&&s.action.modifierSkillId===undefined)throw Error('请先选择制造增幅，再选择它的施放方式');
  if(s.action.kind==='intimate-craft')assertNeutralWearableStoryAction(null,s.action);
  if(s.action.kind==='device.unlock'&&s.action.keyItemId!==undefined&&s.action.skillId!==undefined)throw Error('解锁请选择实体钥匙或正式技能之一');
  for(const key of ACTION_FIELDS[s.action.kind]){
   if(validateEvolutionParameter(s.action,key))continue;
   if(validateResidentActionParameter(s.action,key)||validatePersonContractActionParameter(s.action,key))continue;
   if(s.action.kind==='break-restraint'&&key==='method'&&s.action.method===undefined)continue;
   if(FIELD_ABILITY_OPTIONAL[s.action.kind]?.includes(key)&&s.action[key]===undefined)continue;
   if(s.action.kind==='intimate-equip'&&['targetId','slot','forced'].includes(key)){if(s.action[key]===undefined)continue;if(key==='forced'){if(typeof s.action.forced!=='boolean')throw Error('请明确是否请求他人装配');continue;}}
   if(['respond-restraint-permission-request','respond-person-relation'].includes(s.action.kind)&&key==='accept'){if(typeof s.action.accept!=='boolean')throw Error('请明确同意或拒绝这项请求');continue;}
   if(s.action.kind==='inspect-inventory'){if(s.action[key]===undefined)continue;if(key==='view'&&!['summary','details','equipment-comparison'].includes(s.action[key] as string))throw Error('请选择物品清单、详情或装备比较');text(s.action[key],key);continue;}
   if(s.action.kind==='device.create-key'&&key==='materials'){const list=s.action.materials;if(list===undefined)continue;if(!Array.isArray(list)||!list.length||list.length>24||new Set(list.map((m:any)=>m?.fingerprint)).size!==list.length)throw Error('钥匙材料须引用一至二十四项不重复的实际材料');for(const m of list){fields(m,['fingerprint','quantity']);text(m.fingerprint,'材料原指纹');count(m.quantity,1,999999);}continue;}
   if(['device.lock','device.unlock','device.suppress-lock','device.break-rule','device.analyze-lock','device.create-key','device.arcane-lock'].includes(s.action.kind)&&key!=='itemId'&&key!=='itemStep'){if(s.action[key]===undefined&&(['lockId','nodeId','keyItemId'].includes(key)||s.action.kind==='device.unlock'&&key==='skillId'))continue;text(s.action[key],key);continue;}
   if(s.action.kind==='host.set-suppression'&&key==='percent'){count(s.action.percent,0,100);continue;}
   if(s.action.kind==='host.set-form'&&key==='level'){if(s.action.level!==undefined)count(s.action.level,0,5);continue;}
   if(s.action.kind==='host.set-form'&&key==='formId'){if(typeof s.action.formId!=='string'||s.action.formId.length>160)throw Error('须选择登记形态，空字符串表示清空部位');continue;}
   if(s.action.kind==='describe'&&['mode','characterId'].includes(key)&&s.action[key]===undefined)continue;
   if(s.action.kind==='inspect-commerce'&&['auctionId','itemName'].includes(key)&&s.action[key]===undefined)continue;
   if(s.action.kind==='battle-action'&&key==='intent'){assertBattleActionInput(s.action.intent);continue;}
   if(['prepare-ring','prepare-ring-item'].includes(s.action.kind)&&RING_GENERATION_FIELDS.includes(key)){const v=s.action[key];if(v===undefined)continue;if(['presetId','defaultCastMode'].includes(key))text(v,key);else if(key==='cooldownTurns')count(v,0,10080);else if(key==='evolutionTarget'){if(!v||typeof v!=='object'||Array.isArray(v))throw Error('进化目标必须是完整武魂对象');}else if(key==='usageRules'){if(!v||typeof v!=='object'||Array.isArray(v))throw Error('次数必须是结构化对象');}else if(!Array.isArray(v)||v.length>32)throw Error('魂技提案必须是有界结构化数组');continue;}
   if(key==='presetId'&&['recommend-research','preview-research','begin-research'].includes(s.action.kind)){if(s.action[key]!==undefined)text(s.action[key],key);continue;}
   if(key==='expectedMechanicsHash'&&s.action.kind==='begin-research'){if(s.action[key]!==undefined)text(s.action[key],key);continue;}
   if(key==='confirmedDesign'&&['recommend-research','preview-research','begin-research'].includes(s.action.kind)){
    const value=s.action.confirmedDesign;if(value===undefined)continue;
    if(s.action.presetId||s.action.hostDesign||JSON.stringify(value).length>100000)throw Error('固定设计不能同时指定其他配方或宿主设计');
    rules.paidDesign.normalize(s.action.category,value);continue;
   }
   if(key==='hostDesign'&&['recommend-research','preview-research','begin-research'].includes(s.action.kind)){
    const value=s.action.hostDesign;if(value===undefined)continue;
    if(!value||typeof value!=='object'||Array.isArray(value)||value.version!==1||typeof value.carrierTemplateId!=='string'||!value.carrierTemplateId||!value.definition||typeof value.definition!=='object'||Array.isArray(value.definition)||Object.keys(value).some(k=>!['version','carrierTemplateId','definition'].includes(k))||s.action.presetId||s.action.confirmedDesign)throw Error('宿主研发须提交完整设计，不能同时指定精品配方');
    continue;
   }
   if(rules.sealing.INTENTS.includes(s.action.kind)){
    if(['permissionId','defeatId'].includes(key)&&s.action[key]===undefined)continue;
    if(key==='mode'){if(s.action[key]!==undefined&&!['awake','stasis'].includes(s.action[key]))throw Error('请选择清醒囚禁或静滞封存');continue;}
    if(key==='releaseAfterMinutes'){count(s.action[key],1,525600);continue;}
    if(key==='minutes'){count(s.action[key],1,1440);continue;}
   }
   if(rules.rescue.INTENTS.includes(s.action.kind)){
    if(key==='minutes'){count(s.action[key],1,1440);continue;}
    if(key==='accept'){if(typeof s.action.accept!=='boolean')throw Error('须明确接受或拒绝撤离安排');continue;}
   }
   if(key==='auctionStep'||key==='auctionId'&&s.action.auctionStep!==undefined)continue;
   if(['start-asset-auction','trade-commerce-material','bid-asset-auction','register-auction-proxy','set-commerce-subscription','ship-shop-auction'].includes(s.action.kind)){
    if(['accountId','quoteVersion','maximumGold','itemId','targetId','fingerprint','reserveGold','auctionClass','deviceTerms','materials','flags','filters'].includes(key)&&s.action[key]===undefined)continue;
    if(['gold','reserveGold','maximumGold'].includes(key)){count(s.action[key],0,1000000000);continue;}
    if(key==='enabled'){if(typeof s.action.enabled!=='boolean')throw Error('须明确订阅开关');continue;}
    if(['flags','filters'].includes(key)){if(!s.action[key]||typeof s.action[key]!=='object'||Array.isArray(s.action[key]))throw Error('商业订阅条款须为实际对象');continue;}
    if(key==='deviceTerms'){const terms=s.action[key];if(!Array.isArray(terms)||terms.length>6||new Set(terms.map((t:any)=>t?.itemId)).size!==terms.length)throw Error('器具条款须引用不重复实际原件');for(const t of terms){fields(t,['itemId','transferOwnership','transferControl']);text(t.itemId,'器具');if(typeof t.transferOwnership!=='boolean'||typeof t.transferControl!=='boolean')throw Error('器具权利须明确');}continue;}
   }

   if(rules.custodyMarket.INTENTS.includes(s.action.kind)||rules.custodyAuction.INTENTS.includes(s.action.kind)){
    if(key==='deviceTerms'){const terms=s.action[key]??[];if(!Array.isArray(terms)||terms.length>6||new Set(terms.map((t:any)=>t?.itemId)).size!==terms.length)throw Error('交付条款须为至多六件不重复的实际器具');for(const t of terms){fields(t,['itemId','transferOwnership','transferControl']);text(t.itemId,'器具编号');if(typeof t.transferOwnership!=='boolean'||typeof t.transferControl!=='boolean'||!t.transferOwnership&&!t.transferControl)throw Error('须明确至少一项转交权益');}continue;}
    if(['gold','reserveGold'].includes(key)){count(s.action[key],0,1000000000);continue;}
    if(['expiresInMinutes','durationMinutes'].includes(key)){if(s.action[key]!==undefined)count(s.action[key],1,1440);continue;}
    if(key==='accept'){if(typeof s.action[key]!=='boolean')throw Error('须明确接受或拒绝报价');continue;}
    if(key==='reason'){text(s.action[key],'本人回应理由',600);continue;}
    if(['offerStep','auctionStep'].includes(key)||key==='offerId'&&s.action.offerStep!==undefined||key==='auctionId'&&s.action.auctionStep!==undefined)continue;
   }
   if(s.action.kind==='issue-field-control'&&key==='giftStep'){if(s.action.giftStep!==undefined){count(s.action.giftStep,0,i-1);const prior=segments[s.action.giftStep].action;if(s.action.command?.type!=='fulfill-gift'||s.action.command.commitmentId!==undefined||prior.kind!=='issue-field-control'||prior.command?.type!=='propose-gift')throw Error('赠物履约须引用前面的受控赠物提议，不能混用旧编号');}continue;}
   if(s.action.kind==='issue-field-control'&&key==='command'){const command=rules.fieldControl.canonical(s.action.giftStep===undefined?s.action.command:{...s.action.command,commitmentId:'story-gift-reference'});if(command.type==='speak-person'&&(!s.source.includes(command.text)||s.source.indexOf(command.text)!==s.source.lastIndexOf(command.text)))throw Error('受控发言须逐字取自本片段中唯一出现的完整原话');continue;}
   if(rules.poison.INTENTS.includes(s.action.kind)&&['itemId','offerId','covert'].includes(key)&&s.action[key]===undefined)continue;
   if(key==='covert'){if(typeof s.action[key]!=='boolean')throw Error('暗中施用须明确选择');continue;}
   if(key==='decision'&&s.action.kind==='respond-disguised-drug'){if(!['accept','refuse','inspect'].includes(s.action[key]))throw Error('药物回应无效');continue;}
   if(key==='force'){if(typeof s.action[key]!=='boolean')throw Error('强制施用须明确选择');continue;}
   if(key==='roles'&&s.action.kind==='propose-relationship'){if(s.action.roles!==undefined){fields(s.action.roles,['self','other']);rules.social.normalizeRoles(s.action.relationship,s.action.roles);}continue;}
   if(key==='limits'){if(s.action.mode==='limited'&&s.action.limits!==undefined)rules.controls.limitSpec(s.action.limits);else if(s.action.mode!=='limited'&&s.action.limits!==undefined)throw Error('只有精细模式接受配置');continue;}
   if(s.action.kind==='respond-ability-use'&&key==='accept'){if(typeof s.action.accept!=='boolean')throw Error('本人须明确接受或拒绝施用');continue;}
   if(key==='deviceOperations'){const ops=s.action[key];if(!Array.isArray(ops)||!ops.length||ops.length>6||new Set(ops.map((o:any)=>o?.itemId)).size!==ops.length)throw Error('器具操作须为一至六件不重复的实际器具');for(const o of ops){fields(o,['itemId','mode','returnMode','relockAfterMinutes','limits','returnLimits']);if(o.mode==='limited'&&o.limits!==undefined)rules.controls.limitSpec(o.limits);if(o.returnMode==='limited'&&o.returnLimits!==undefined)rules.controls.limitSpec(o.returnLimits);text(o.itemId,'器具编号');if(!['released','escort','detached','limited'].includes(o.mode)||o.returnMode!==undefined&&!['locked','escort','limited'].includes(o.returnMode))throw Error('器具操作模式无效');if(o.relockAfterMinutes!==undefined)count(o.relockAfterMinutes,1,1440);}continue;}
   if(rules.cooperation.INTENTS.includes(s.action.kind)){
    if(['dungeonId','durationMinutes','allowTravel','allowCombat'].includes(key)&&s.action[key]===undefined)continue;
    if(['allowTravel','allowCombat','accept'].includes(key)){if(typeof s.action[key]!=='boolean')throw Error('合作须使用明确的布尔许可或回应');continue;}
    if(key==='durationMinutes'){count(s.action[key],1,43200);continue;}
   }

   if(s.action.kind==='create-support-consumable'){if(['modifierSkillId','modeId'].includes(key)&&s.action[key]===undefined)continue;if(key==='recipeId'&&!Object.hasOwn(rules.world.SUPPORT_CONSUMABLE_RECIPES,s.action[key]))throw Error('辅助食品配方未登记');}
   if(s.action.kind==='start-custody-escort'){
    if(['targetIds','guardIds'].includes(key)){const ids=s.action[key]??(key==='guardIds'?[]:null);if(!Array.isArray(ids)||ids.length>(key==='guardIds'?3:20)||key==='targetIds'&&!ids.length||new Set(ids).size!==ids.length)throw Error('押送名单无效');for(const id of ids)text(id,'人物编号');continue;}
   }
   if(s.action.kind==='visit-custody-cell'&&key==='cellId'&&(s.action[key]===undefined||s.action[key]===''))continue;
   if(s.action.kind==='captive-daily'&&key==='minutes'){count(s.action[key],1,1440);continue;}
   if(key==='factIds'){const ids=s.action[key];if(!Array.isArray(ids)||!ids.length||ids.length>8||new Set(ids).size!==ids.length)throw Error('消息须选1至8条实际事件');for(const id of ids)text(id,'事实编号');continue;}
   if(key==='locked'){if(typeof s.action[key]!=='boolean')throw Error('须明确房门锁定状态');continue;}
   if(key==='defeatId'&&s.action[key]===undefined)continue;
   if(key==='relockAfterMinutes'){if(s.action[key]!==undefined)count(s.action[key],1,1440);continue;}
   if(s.action.kind==='search-captive'&&s.action.resourceKind==='coins'&&['itemId','itemStep'].includes(key))continue;
   if(key==='restraintItemIds'){const ids=s.action[key];if(!Array.isArray(ids)||!ids.length||ids.length>6||new Set(ids).size!==ids.length)throw Error('捕获须选择不重复的实际拘束器');for(const id of ids)text(id,'拘束器');continue;}
   if(s.action.kind==='escape-captivity'&&key==='statusId'){if(typeof s.action.statusId!=='string'||s.action.statusId.length>500)throw Error('须选择实际束缚，空标识表示避开看守');continue;}
   if(s.action.kind==='register-competition'&&key==='venueId'&&s.action[key]===undefined)continue;
   if(key==='slot'&&['equip','unequip'].includes(s.action.kind)){
    if(s.action.kind==='equip'&&s.action.slot===undefined)continue;
    if(!rules.world.EQUIPMENT_SLOTS.includes(s.action.slot))throw new StoryPlanValidationError('装备槽位不存在，请使用当前规则槽位',{
     instancePath:`/segments/${i}/action/slot`,keyword:'enum',submitted:s.action.slot??null,reference:{instancePath:`/actionCatalog/${s.action.kind}/valueOptions/slot`,value:rules.world.EQUIPMENT_SLOTS},
    });continue;
   }
   if(s.action.kind==='enter-room'){if(s.action[key]!==undefined){if(key==='routeIndex')count(s.action[key],0,Number.MAX_SAFE_INTEGER);else text(s.action[key],key);}continue;}
   if(key==='branchIds'){const list=s.action.branchIds;if(!Array.isArray(list)||!list.length||list.length>16||new Set(list).size!==list.length)throw Error('须选择实际能力用途');for(const id of list)text(id,'能力用途',200);continue;}
   if(key==='materials'){const list=s.action.materials;if(!Array.isArray(list)||!list.length||list.length>24||new Set(list.map((m:any)=>m?.fingerprint)).size!==list.length)throw Error('须明确不重复的实际用料');for(const m of list){fields(m,['fingerprint','quantity']);text(m.fingerprint,'材料指纹',2000);count(m.quantity,1,999);}continue;}
   if(key==='confirmed'){if(s.action.confirmed!==true)throw Error('研发投入须明确确认不可退还');continue;}
   if(key==='candidateIndex'){count(s.action[key],0,7);continue;}
   if(key==='fingerprint'){text(s.action[key],key,2000);continue;}
   if(key==='nextPriority'){if(s.action.nextPriority!==undefined)text(s.action.nextPriority,'下次优先条款',2000);continue;}
   if(s.action.kind==='free-action'||s.action.kind==='answer-person-plan')continue;
   if(s.action.kind==='invite-party'&&key==='dungeonId'&&s.action.membership==='long-term'&&s.action.dungeonId===undefined)continue;
   if(s.action.kind==='choose-guide'){if(typeof s.action.enabled!=='boolean')throw Error('须明确启用或暂停免费护航');continue;}
   if(s.action.kind==='opening-guidance'&&key==='giftId'&&s.action.action!=='claim'&&s.action.giftId===undefined)continue;
   if(s.action.kind==='consider-person-goal'&&key==='intent'&&s.action.intent===undefined)continue;
   if(s.action.kind==='use-item'&&['actorId','targetId'].includes(key)&&s.action[key]===undefined)continue;
  if(['remember-object','resolve-object'].includes(s.action.kind))continue;
   if(s.action.kind==='instantiate-item'){if(key==='objectId'&&s.action.objectId!==undefined)text(s.action.objectId,key,200);continue;}
   if(s.action.kind==='respond-npc-request'&&key==='itemId'&&s.action.action==='decline'&&s.action.itemId===undefined)continue;
   if(key==='beastUnitIds'){validateHarvestTargets(s.action[key]);continue;}
   if(key==='characterStep')continue;
   if(key==='itemStep'||key==='itemId'&&s.action.itemStep!==undefined)continue;
   if(s.action.kind==='recover-party'&&key==='memberId'&&s.action[key]===undefined)continue;
   if(key==='characterId'&&s.action.characterStep!==undefined)continue;
   if(s.action.kind==='introduce-person')continue;
   if(key==='difficulty'){count(s.action[key],5,30);continue;}
   if(key==='steps'){count(s.action[key],1,99);continue;}
   if(s.action.kind==='cultivate'&&['days','hours','minutes'].includes(key)){count(s.action[key],0,44640);continue;}
   if(key==='year'||key==='month'){count(s.action[key],1,key==='year'?999999:12);continue;}
   if(['day','hour','minute'].includes(key)){count(s.action[key],key==='day'?1:0,key==='day'?Number.MAX_SAFE_INTEGER:key==='hour'?23:59);continue;}
   if(['resolutionId','resolutionStep'].includes(key)){if(s.action[key]!==undefined){if(key==='resolutionStep')count(s.action[key],0,i-1);else text(s.action[key],key);}continue;}
   if(['commitmentId','commitmentStep'].includes(key)){
    if(s.action[key]!==undefined){if(key==='commitmentStep')count(s.action[key],0,i-1);else text(s.action[key],key);}continue;
   }
   if(['amount','dueDay'].includes(key)){count(s.action[key],1,Number.MAX_SAFE_INTEGER);continue;}
   if(s.action.kind==='accept-hire-offer'&&['quoteId','quoteStep'].includes(key)){
    if(s.action[key]!==undefined){if(key==='quoteStep')count(s.action[key],0,i-1);else text(s.action[key],key);}continue;
   }
   if(key==='reason'&&(PLAYER_REASON_ACTIONS as readonly string[]).includes(s.action.kind)&&(s.action[key]===undefined||typeof s.action[key]==='string'&&!s.action[key].trim()))continue;
   if(key==='maximumGold'&&['buy','supply-buy'].includes(s.action.kind)){if(s.action[key]!==undefined)count(s.action[key],0,1000000000);continue;}
   if(key==='quantity')count(s.action[key]);else if(key==='before')count(s.action[key],-1,Number.MAX_SAFE_INTEGER);else if(key==='offeredFee')count(s.action[key],0,Number.MAX_SAFE_INTEGER);else if(['reservePercent','retreatPercent'].includes(key))count(s.action[key],0,100);else text(s.action[key],key,key==='terms'?2000:key==='reason'?1000:['text','intent'].includes(key)?2000:160);
  }
  if(['label-person','resolve-person'].includes(s.action.kind)&&(s.action.name.length>40||s.action.name!==s.action.name.trim()||!s.source.includes(s.action.name)||s.source.indexOf(s.action.name)!==s.source.lastIndexOf(s.action.name)))throw Error('称呼须逐字取自本片段中唯一出现的文字，最多40字');
  const sourceText=STORY_ACTION_SCHEMA.find(entry=>entry.kind===s.action.kind)?.sourceText;
  if(sourceText&&!(s.action.kind==='consider-person-goal'&&s.action.intent===undefined)){
   const value=s.action[sourceText.parameter];
   if(!s.source.includes(value)||s.source.indexOf(value)!==s.source.lastIndexOf(value))throw new StoryPlanValidationError(sourceText.parameter==='intent'?'交谈意图须是本片段中唯一出现的原始概述':'告知内容须是本片段中唯一出现的完整原话',{
    instancePath:`/segments/${i}/action/${sourceText.parameter}`,keyword:'unique-source-substring',submitted:value,reference:{instancePath:`/segments/${i}/source`,value:s.source},
   });
  }
  if(s.action.kind==='travel'&&!Object.hasOwn(rules.world.PATH_MODES,s.action.mode))throw Error('旅行方式不存在');
  if(s.action.kind==='opening-guidance'&&(!['claim','defer','skip'].includes(s.action.action)||s.action.giftId!==undefined&&!Object.hasOwn(rules.talents.MASTER_GIFTS,s.action.giftId)))throw Error('请选择已有赠环或暂缓交谈');
  if(['wait-until-date','invite-date'].includes(s.action.kind)&&s.action.day>30)throw Error('斗罗历日期无效，每月只有30日');
  if(s.action.kind==='attribute-check')validateStoryCheck(s.action);
  if(s.action.kind==='free-action')validateFreeAction(s.action,`/segments/${i}/action`);
  if(s.action.kind==='opposed-check')validateStoryOpposedCheck({...s.action,characterId:s.action.characterStep===undefined?s.action.characterId:'prior-created-person'});
  if(s.action.kind==='introduce-person')validateStoryPersonCreation(s.action);
  if(s.action.kind==='invite-party'&&!['temporary','long-term'].includes(s.action.membership))throw Error('同行期限无效');
  if(s.action.kind==='propose-relationship'&&!Object.hasOwn(RELATIONSHIP_LABELS,s.action.relationship))throw Error('关系提议类型无效');
  if(s.action.kind==='person-history'&&!PERSON_HISTORY_CATEGORIES.includes(s.action.category))throw Error('人物记录类型无效');
  if(s.when!==undefined){
   fields(s.when,['step','status','outcome','belief','marketStatus','agreementStatus']);count(s.when.step,0,i-1);
   if([s.when.status,s.when.outcome,s.when.belief,s.when.marketStatus,s.when.agreementStatus].filter(v=>v!==undefined).length!==1)throw Error('行动条件须指定执行状态、战果、听闻判断、实际交易状态或协议状态之一');
   if(s.when.agreementStatus!==undefined&&(!(rules.personContracts.INTENTS.includes(segments[s.when.step].action.kind)?['proposed','accepted','sourceUnavailable','active','rejected','ended']:['proposed','active','rejected','fulfilled','breached','ended']).includes(s.when.agreementStatus)||![...rules.performanceAgreements.INTENTS,...rules.personContracts.INTENTS.filter((k:string)=>k!=='withdraw-control-source')].includes(segments[s.when.step].action.kind)))throw Error('协议状态条件须引用前面的实际协议动作');
   if(s.when.marketStatus!==undefined){const prior=segments[s.when.step].action.kind,states=rules.custodyMarket.INTENTS.includes(prior)?['pending','completed','rejected','cancelled','expired','invalidated']:[...rules.custodyAuction.INTENTS,...rules.commerceAuction.INTENTS].includes(prior)?['queued','scheduled','open','paused','completed','cancelled','unsold','invalidated','reconsigned']:[];if(!states.includes(s.when.marketStatus))throw Error('交易状态条件须引用前面的真实交接或拍卖动作');}
   if(s.when.belief!==undefined&&(!['believes','doubts','uncertain'].includes(s.when.belief)||segments[s.when.step].action.kind!=='tell-person'))throw Error('听闻判断条件须引用前面的告知步骤');
   if(s.when.status!==undefined&&!['succeeded','failed'].includes(s.when.status))throw Error('行动条件无效');
   if(s.when.status!==undefined&&NON_EXECUTING_RESULTS[segments[s.when.step].action.kind])throw new StoryPlanValidationError('条件引用的前置步骤不会产生该执行状态',{
    instancePath:`/segments/${i}/when/status`,keyword:'unreachable-result-status',submitted:s.when.status,
    reference:{instancePath:`/segments/${s.when.step}/action/kind`,value:{kind:segments[s.when.step].action.kind,resultStatuses:[NON_EXECUTING_RESULTS[segments[s.when.step].action.kind]]}},
   });
   if(s.when.outcome!==undefined&&(!(STORY_BATTLE_OUTCOMES as readonly string[]).includes(s.when.outcome)||!['spar','person-duel','enter-room','competition-match','battle-action','battle-report'].includes(segments[s.when.step].action.kind)))throw Error('战果条件须引用战斗步骤');
  }
 }
 const sources:string[]=segments.map((s:any)=>s.source);
 if(!storySourcesCoverInput(input,sources))throw Error('主持人必须完整引用玩家全部原话，不得省略条件或改写输入');
 validateStoryPlanActivityOrder({segments});
 return structuredClone({segments,...(privateTo?{privateTo}:{})}) as StoryPlan;
}

/** Read only registered state. No character archive instantiation or offscreen simulation. */
export function storyExpeditionFacts(state:any,readActions?:StoryActionsReader){
 const active=state.远征?.当前;if(!active)return null;
 const actions=rules.expedition.previewRoomActions(state),room=active.currentRoom,playerId=state.角色.主控单位ID,vision=!rules.controls.restrictions(state,playerId).blocked.vision?.length;
 return {id:active.id,dungeonId:active.dungeonId,dungeonName:active.dungeonName,phase:active.phase,currentNodeId:active.currentNodeId,completedNodeIds:structuredClone(active.completedNodeIds),
  companions:(active.companions??[]).filter((c:any)=>c.active).map((c:any)=>({personId:c.unitId,characterId:c.characterId,name:state.人物?.列表?.[c.unitId]?.name??c.name,kind:c.kind})),
  room:room?{nodeId:room.nodeId,type:room.type,layer:room.layer,campUsed:room.campUsed,opened:room.opened,
   description:vision?room.narrative?.sceneDescription??null:null,
   beasts:(room.roster??[]).filter((b:any)=>state.战斗单位?.列表?.[b.unitId]&&vision).map((b:any)=>({unitId:b.unitId,name:b.name,years:b.years,
    appearance:b.appearance??null,categories:structuredClone(b.categoryTags),attributes:structuredClone(b.affinitySpectrum),
    abilities:storyAbilityFacts(state,b.unitId,readActions),
    lifeStatus:state.战斗单位.列表[b.unitId].存活状态,harvested:(room.harvestedUnitIds??[]).includes(b.unitId)}))}:null,
  routes:actions.availableNodeIds.map((id:string)=>{const node=active.map.nodes[id];return {nodeId:id,layer:node.layer,type:node.type};}),
  finish:actions.finish,extract:actions.extract};
}
export function storyHuntingDestinations(state:any){
 return (Object.values(state.地图?.地点??{}) as any[]).filter(p=>rules.world.isLocationKnown(state,p.id)).flatMap(p=>rules.expedition.dungeonsAtLocation(p.id).map((d:any)=>({id:d.id,name:d.name,locationId:p.id,difficulties:d.difficultyIds.map((id:string)=>({id,name:rules.expedition.DIFFICULTIES[id].name}))})));
}
function storyLocation(state:any,position:any,locationId:string){
 return {id:locationId,name:position?.kind==='transit'?`道路途中（路段进度 ${position.elapsedMinutes*4} 单位）`:position?.sceneId?`当前房间（${state.地图?.地点?.[locationId]?.name??locationId}）`:state.地图?.地点?.[locationId]?.name??state.场景?.地点,...(position?{position}: {})};
}
function storyPendingCompanions(state:any){
 return (state.远征?.companionContracts??[]).filter((c:any)=>c.leaderId===state.角色.主控单位ID).map((c:any)=>({agreementId:c.agreementId,characterId:c.characterId,personId:c.unitId,name:c.name,paidFee:c.fee,dungeonId:c.dungeonId,dungeonName:c.dungeonName}));
}
export function storyFacts(state:any):Record<string,any> {
 return rules.controls.withReadIndex(state,()=>withStoryActionsRead(state,readActions=>readStoryFacts(state,readActions)));
}
function readStoryFacts(state:any,readActions?:StoryActionsReader):Record<string,any> {
 const id=state.角色?.主控单位ID,person=state.人物?.列表?.[id],position=person?rules.actions.positionOf(state,id):null,locationId=position?.locationId??state.地图?.当前地点ID,publicPlace=position?.kind==='location'&&!position.sceneId;
 const actualLocation=storyLocation(state,position,locationId);
 const parentService=position?.sceneId?rules.expedition.serviceAtLocation(state,locationId):null;
 const currentFacilities=position?.sceneId?(rules.logistics.facts(state,id,{includeDestinations:false})?.facilities??[]).filter((f:any)=>f.cells.some((c:any)=>c.spaceId===position.sceneId)):[];
 const personFacts=createScenePersonReader(state,readActions);
 return jsonFacts({evolution:evolutionStoryFacts(state),deviceOperations:rules.deviceOperations.facts(state,id),location:actualLocation,time:state.世界?.时间,calendar:rules.world.storyCalendarDate(state),
  lootTemplates:rules.expedition.loot.templates(),lootPriorities:rules.expedition.loot.priorityFacts(state),
  lootAgreements:rules.expedition.loot.visibleRecords(state).filter((r:any)=>!r.expeditionId).slice(-3),
  lootRoster:rules.expedition.loot.roster(state,rules.expedition.DUNGEON_ID),
  pendingLoot:rules.expedition.loot.pending(state),
  recentLootAllocations:rules.expedition.loot.view(state).records,
  lootResolutions:rules.expedition.loot.visibleResolutions(state).slice(-8),
  personReferences:storyPersonReferences(state),
  narrativeObjects:storyObjectContext(state),
  commerce:storyCommerceFacts(state),
  parentServices:parentService?[{id:parentService.id,name:parentService.name,locationId,workshopId:parentService.workshopId,workshopName:parentService.workshopName,requiresPublicAccess:true}]:[],
  currentFacility:currentFacilities[0]?{id:currentFacilities[0].id,name:currentFacilities[0].name,locationId,canManage:currentFacilities[0].canManage,cells:currentFacilities[0].cells,occupants:currentFacilities[0].occupants,exitSteps:['有门禁权限的在场人物可用set-custody-cell-door实际开门；有有效物品控制权时可用issue-field-control让该人物执行此命令','自由行动者破坏当前锁门用break-custody-cell-door，仍被关押时用escape-captivity中的破坏牢门选项','visit-custody-cell省略cellId让本人回公共通道','withdraw-captive将人物领到本人所在公共通道'],sameCityServices:'到公共区域后读取当前商店；同城访问服务不使用跨城押送'}:null,
  personCreationOptions:storyPersonCreationOptions(state.世界.npcGender),
  recentChecks:storyCheckHistory(state),
  freeActions:freeActionFacts(state),
  fieldResources:storyFieldResources(state),
  attributeChecks:state.战斗单位?.列表?.[id]?{difficulties:STORY_CHECK_DIFFICULTIES,modifiers:Object.fromEntries(STORY_CHECK_ATTRIBUTES.map(attribute=>[attribute,rules.combat.attributeModifier(state,state.战斗单位.列表[id],attribute)])),registeredBonus:0}:null,
  cityStages:rules.world.cityStageFacts(state),
  personContracts:personContractFacts(state,id),residentContext:residentNarrativeContext(state,id),poisons:rules.poison.facts(state,id),custody:narrativeCustodyFacts(rules.world.custodyFacts(state,state.角色.主控单位ID)),abilityUseRequests:rules.world.abilityUseFacts(state,id),captivity:captivityFacts(state),releaseResponses:releaseFacts(state).slice(-8),npcRequests:rules.world.npcRequestFacts(state),longActions:rules.world.longActionFacts(state),cultivation:rules.world.cultivationFacts(state),
  npcCollaborations:npcCollaborationFacts(state,id),
  npcGoals:visibleNpcGoals(state),
  autonomousPlans:rules.world.npcPlanFacts(state),
  ...rules.world.storyOpeningFacts(state),
  player:person?{...personFacts(person),gold:state.钱包?.列表?.[person.walletId]?.gold??0}:null,
  people:(Object.values(state.人物?.列表??{}) as any[]).flatMap(p=>{
   const sense=perceivedScenePerson(state,p);
   return sense?[sense==='visible'?personFacts(p):heardScenePerson(state,p)]:[];
  }),
  knownPeople:(Object.values(state.人物?.列表??{}) as any[]).filter(p=>p.id!==id&&(!person||!globalThis.SoulScenePosition.communicationColocated(state,id,p.id))).flatMap(p=>{
   const history=storyPersonHistorySummary(state,p.id);
   return p.扩展?.相遇记录?.[id]||Object.values(history.counts).some(n=>n>0)?[{id:p.id,name:p.name,encounter:structuredClone(p.扩展?.相遇记录?.[id]??null),playerLabels:storyPersonLabels(state,p.id),communication:communicationAvailability(state,p.id),history}]:[];
  }),
  partyChatRecipients:partyChatRoster(state),
  party:{maximum:4,members:rules.world.partyMembers(state).map((p:any)=>({...p,locationId:p.present?p.locationId:null})),occupiedCompanionIds:rules.world.occupiedCompanionIds(state),guide:state.远征?.配置?.firstHuntingEscort?{...state.远征.配置.firstHuntingEscort,name:rules.arena.CHARACTER_CATALOG[state.远征.配置.firstHuntingEscort.characterId]?.name??null}:null},
  pendingCompanions:storyPendingCompanions(state),
  battle:state.战斗?.状态==='进行中'?{id:state.战斗.id,status:state.战斗.状态,recordedActionCount:state.扩展?.battleReports?.[state.战斗.id]?.actions?.length??null,strategy:state.战斗.扩展?.strategy??{focusTargetId:null,protectTargetId:null,reservePercent:0,retreatPercent:0},
   participants:(state.战斗.参与者ID列表??[]).filter((unitId:string)=>rules.combat.isActiveParticipant(state,unitId)&&(unitId===id||rules.actions.perception(state,id,unitId))).map((unitId:string)=>{const u=state.战斗单位.列表[unitId];return {id:unitId,name:u.名称,friendly:rules.combat.sameSide(state,state.战斗单位.列表[id],u),resources:unitId===id||rules.actions.perception(state,id,unitId,'vision')?u.资源:null,canFlee:state.战斗.扩展?.成员?.[unitId]?.canFlee??false};})}:null,
  expedition:storyExpeditionFacts(state,readActions),
  competition:{division:rules.arena.competitionDivisionForPlayer(state.成长?.列表?.[id]?.魂力等级??0),
   localVenueId:publicPlace?rules.arena.LOCATION_COMPETITION_INDEX[locationId]??null:null,
   venues:(Object.values(rules.arena.COMPETITION_VENUES) as any[]).filter(v=>rules.world.isLocationKnown(state,v.locationId)).map(v=>({id:v.id,name:v.name,locationId:v.locationId,locationName:state.地图?.地点?.[v.locationId]?.name??v.name})),
   current:state.比赛?.当前?{id:state.比赛.当前.id,venueId:state.比赛.当前.venueId,name:state.比赛.当前.venueName,status:state.比赛.当前.status,division:state.比赛.当前.division?.label,wins:state.比赛.当前.wins,placement:state.比赛.当前.placement}:null},
  rings:storyRingFacts(state),growth:storyGrowthFacts(state),
  workshop:storyWorkshopFacts(state),
  recentBattles:recentBattleReports(state),
  availableCharacters:(rules.arena.worldCharacterRecords(state) as any[]).filter(p=>publicPlace&&!rules.controls.restrictions(state,id).blocked.vision?.length&&rules.arena.worldCharacterLocation(state,p.id)===locationId&&p.kind!=='soul-beast'&&!state.人物?.列表?.[rules.arena.persistentCharacterId(p.id)]).map(p=>({characterId:p.id,name:p.name,locationId})),
  sparringPartners:[...(rules.arena.worldCharacterRecords(state) as any[]).filter(p=>p.sparEligible&&p.kind!=='soul-beast').flatMap(p=>{
   if(rules.arena.persistentCharacterConflict(state,p.id))return [];
   const record=rules.arena.sparCharacterRecord(state,p.id);if(!record)return [];
   const unitId=rules.arena.persistentCharacterId(p.id),person=state.人物?.列表?.[unitId],unit=state.战斗单位?.列表?.[unitId];
   if(!publicPlace||rules.controls.restrictions(state,id).blocked.vision?.length||record.locationId!==locationId||person&&!rules.actions.colocated(state,id,person.id)||person?.status==='dead'||unit&&(unit.存活状态!=='存活'||unit.资源.生命.当前<=0))return [];
   return [{characterId:p.id,personId:person?.id??null,name:record.name,level:record.level}];
  }),...(Object.values(state.人物?.列表??{}) as any[]).filter(p=>publicPlace&&!rules.controls.restrictions(state,id).blocked.vision?.length&&p.id!==id&&rules.actions.colocated(state,id,p.id)&&p.status!=='dead'&&!state.战斗单位?.列表?.[p.id]?.扩展?.角色库ID).flatMap(p=>{
   const record=rules.arena.sparCharacterRecord(state,p.id),unit=state.战斗单位?.列表?.[p.id];
   return record&&unit?.存活状态==='存活'&&unit.资源.生命.当前>0?[{characterId:p.id,personId:p.id,name:p.name,level:record.level}]:[];
  })],
  knownLocations:(Object.values(state.地图?.地点??{}) as any[]).filter(p=>rules.world.isLocationKnown(state,p.id)).map(p=>({id:p.id,name:p.name})),
  huntingDestinations:storyHuntingDestinations(state),
  inventory:storyOwnedItemFacts(state,id),
  materials:storyMaterialFacts(state),
 });
}

function storyAgreementStatus(state:any,result:StoryStepResult|undefined):string|undefined{
 if(result?.status!=='succeeded')return;if(result.receipt?.type==='person-contract'){const r=rules.personContracts.currentStatus(state,result.receipt.contractId);return rules.personContracts.receiptProof(state,result.receipt,state.角色.主控单位ID,result.action,result.action.characterStep===undefined?null:personFromStep(storyLedger(state).active?.results??[],result.action.characterStep))&&r?.versionHash===result.receipt.versionHash?r.status:undefined;}if(result.receipt?.type!=='performance-agreement')return;const r=rules.performanceAgreements.get(state,result.receipt.agreementId);return r&&[r.authorityId,r.subjectId].includes(state.角色.主控单位ID)?r.status:undefined;
}

function storyMarketStatus(state:any,result:StoryStepResult|undefined):string|undefined{
 if(result?.status!=='succeeded')return;const c=result.receipt,viewer=state.角色.主控单位ID;
 return c?.type==='custody-trade'?rules.custodyMarket.facts(state,viewer).find((r:any)=>r.id===c.offerId)?.status:c?.type==='asset-auction'?rules.commerceAuction.facts(state,viewer).lots.find((r:any)=>r.id===c.auctionId)?.status:undefined;
}

function commandFor(action:StoryAction,id:string,state:any):{type:string;payload:Record<string,any>} {
 const {kind,...params}=action;
 if(['device.lock','device.unlock','device.suppress-lock','device.break-rule','device.analyze-lock','device.create-key','device.arcane-lock','intimate-craft','intimate-equip','intimate-detach','host.set-suppression','host.set-form','host.set-appearance'].includes(kind))return {type:'world.intent',payload:{type:kind,...params}};
 if(kind==='battle-action')return {type:'battle.action',payload:params.intent as Record<string,any>};
 if(kind==='inspect-commerce')return {type:'commerce.inspect-story',payload:params};
 if(rules.commerceAuction.INTENTS.includes(kind)||rules.commerceAssets.INTENTS.includes(kind)||rules.commerceMessages.INTENTS.includes(kind)||rules.stock.INTENTS.includes(kind))return {type:'world.intent',payload:{type:kind,...params}};
 if(kind==='issue-field-control')return {type:'world.intent',payload:{type:kind,characterId:params.characterId,action:params.command}};
 if(kind==='break-custody-cell-door')return {type:'world.intent',payload:{type:kind,...params}};
 if(rules.poison.INTENTS.includes(kind))return {type:'world.intent',payload:{type:kind,...params}};
 if(rules.personContracts.INTENTS.includes(kind)||rules.residentRealms.INTENTS.includes(kind)||rules.performanceAgreements.INTENTS.includes(kind)||rules.combatDeployments.INTENTS.includes(kind))return {type:'world.intent',payload:{type:kind,...params}};
 if(rules.sealing.INTENTS.includes(kind))return {type:'world.intent',payload:{type:kind,...params}};
 if(['learn-preset-blueprint','use-field-ability','stop-maintenance','dismiss-disguise','inspect-disguise','disclose-identity','request-ability-use','respond-ability-use','retract-martial-soul','restrain-desire','break-restraint'].includes(kind))return {type:'world.intent',payload:{type:kind,...params}};
 if(rules.custodyMarket.INTENTS.includes(kind)||rules.custodyAuction.INTENTS.includes(kind)||rules.preparations.INTENTS.includes(kind)||rules.cooperation.INTENTS.includes(kind)||rules.rescue.INTENTS.includes(kind)||rules.social.INTENTS.includes(kind)||rules.logistics.INTENTS.includes(kind))return {type:'world.intent',payload:{type:kind,...params}};
 if(['propose-person-contract','form-controlled-contract','set-realm-arrangement','arrange-realm-resident','end-realm-visit','move-realm-guest','set-resident-permissions','reward-resident','punish-resident','propose-performance-agreement','deploy-resident','recall-resident','discuss-resident-tactics','propose-custody-transfer','start-custody-auction','person-duel','capture-person','spare-person','execute-person','search-captive','release-captive','set-restraint-mode','detach-restraint','attach-restraint','permit-restraint','request-restraint-permission','revoke-restraint-permission','respond-restraint-permission-request'].includes(kind))return {type:'world.intent',payload:{type:kind,...params}};
 if(kind==='register-competition')return {type:'arena.competition.begin',payload:params};
 if(kind==='competition-match')return {type:'arena.competition.match',payload:{}};
 if(kind==='competition-withdraw')return {type:'arena.competition.withdraw',payload:{}};
 if(['inspect-workshop','recommend-research','preview-research','inspect-research','preview-craft','quote-material-sale','quote-item-sale'].includes(kind))return {type:'workshop.inspect-story',payload:action};
 if(kind==='begin-research')return {type:'research.begin',payload:params};
 if(kind==='choose-research')return {type:'research.choose',payload:params};
 if(kind==='craft-blueprint')return {type:'blueprint.craft',payload:{blueprintId:params.blueprintId,request:{quantity:params.quantity,materials:params.materials,includeMaximum:false}}};
 if(kind==='sell-material'||kind==='sell-item')return {type:kind==='sell-material'?'material.sell':'item.sell',payload:params};
 if(kind==='opening-situation')return {type:'opening.situation',payload:params};
 if(kind==='inspect-opening')return {type:'opening.inspect-story',payload:{}};
 if(kind==='opening-guidance')return {type:'opening.guidance',payload:params};
 if(kind==='travel'||kind==='buy'||kind==='sell'||kind==='equip'||kind==='unequip')return {type:'world.intent',payload:{type:kind,...params}};
 if(kind==='recover-party')return {type:'party.recover',payload:{...(params.memberId?{personId:params.memberId}:{})}};
 if(kind==='recover')return {type:'world.intent',payload:{type:'safe-point-recover'}};
 if(kind==='create-support-consumable')return {type:'world.intent',payload:{type:kind,...params}};
 if(kind==='use-item')return {type:'world.intent',payload:{type:'use-restorative-item',...params}};
 if(['store-item','retrieve-item','loot-coins','use-prebattle-pill','world-event'].includes(kind))return {type:'world.intent',payload:{type:kind,...params}};
 if(kind==='loot-item')return {type:'world.intent',payload:{type:'loot',...params}};
 if(kind==='switch-soul')return {type:'world.intent',payload:{type:'switch-martial-soul',...params}};
 if(kind==='supply-buy')return {type:'supply.buy',payload:params};
 if(kind==='hire'||kind==='dismiss')return {type:`companion.${kind}`,payload:params};
 if(kind==='meet')return {type:'character.meet',payload:params};
 if(kind==='quote-hire')return {type:'character.quote-hire',payload:params};
 if(kind==='bargain-hire')return {type:'character.bargain-hire',payload:params};
 if(kind==='accept-hire-offer')return {type:'companion.hire',payload:params};
 if(kind==='person-history')return {type:'character.history',payload:params};
 if(kind==='inspect-person')return {type:'character.inspect',payload:params};
 if(['promise-gold','promise-item','fulfill-promise','cancel-promise'].includes(kind))return {type:`character.${kind}`,payload:params};
 if(kind==='invite'||kind==='attend-invitation')return {type:`character.${kind}`,payload:params};
 if(kind==='invite-date'){const {year,month,day,hour,minute,...target}=params;return {type:'character.invite',payload:{...target,...rules.world.storyWorldTimeAtDate({year,month,day,hour,minute},state)}};}
 if(kind==='exchange-contact')return {type:'character.exchange-contact',payload:params};
 if(kind==='propose-loot-resolution')return {type:'character.propose-loot-resolution',payload:params};
 if(kind==='collect-loot')return {type:'expedition.collect-loot',payload:params};
 if(kind==='propose-loot')return {type:'character.propose-loot',payload:params};
 if(kind==='invite-party')return {type:'character.invite-party',payload:params};
 if(kind==='end-party')return {type:'character.end-party',payload:params};
 if(kind==='choose-guide')return {type:'companion.guide-choice',payload:params};
 if(kind==='invite-realm-guest')return {type:'character.invite-realm-guest',payload:params};
 if(kind==='propose-relationship')return {type:'character.propose-relationship',payload:params};
 if(kind==='end-relationship')return {type:'character.end-relationship',payload:params};
 if(kind==='attribute-check')return {type:'story.attribute-check',payload:params};
 if(kind==='free-action')return {type:'story.free-action',payload:params};
 if(kind==='opposed-check')return {type:'story.opposed-check',payload:params};
 if(kind==='introduce-person')return {type:'character.introduce',payload:params};
 if(kind==='instantiate-item')return {type:'story.instantiate-item',payload:params};
 if(kind==='city-history')return {type:'world.city-history',payload:params};
 if(kind==='consider-person-goal')return {type:'story.consider-npc-goal',payload:params};
 if(kind==='answer-person-plan')return {type:'character.answer-npc-plan',payload:params};
 if(kind==='ask-release')return {type:'character.ask-release',payload:params};
 if(kind==='escape-captivity')return {type:'world.escape-captivity',payload:params};
 if(kind==='respond-npc-request')return {type:'character.respond-npc-request',payload:params};
 if(kind==='cultivate')return {type:'world.cultivate',payload:params};
 if(kind==='request-person-growth')return {type:'character.request-growth',payload:params};
 if(kind==='wait-until')return {type:'world.wait-until',payload:params};
 if(kind==='resume-long-action')return {type:'world.resume-long-action',payload:params};
 if(kind==='abandon-long-action')return {type:'world.abandon-long-action',payload:params};
 if(kind==='wait-until-date')return {type:'world.wait-until',payload:rules.world.storyWorldTimeAtDate(params,state)};
 if(kind==='spar')return {type:'character.start-spar',payload:params};
 if(kind==='battle-report')return {type:'battle.report',payload:params};
 if(kind==='battle-strategy')return {type:'battle.set-strategy',payload:params};
 if(kind==='enter-room')return {type:'expedition.enter',payload:params};
 if(kind==='extract-expedition')return {type:'expedition.request-story-extract',payload:{}};
 if(kind==='use-camp'||kind==='open-chest')return {type:`expedition.${kind}`,payload:{}};
 const evolutionCommand=evolutionStoryCommand(kind,params);if(evolutionCommand)return evolutionCommand;
 if(kind==='inspect-growth')return {type:'growth.inspect-story',payload:{}};
 if(kind==='allocate-growth')return {type:'growth.allocate',payload:{attribute:params.attribute,steps:count(params.steps,1,99)}};
 if(kind==='inspect-ring')return {type:'ring.inspect-story-source',payload:params};
 if(kind==='inspect-ring-item')return {type:'ring.inspect-story-item',payload:params};
 if(kind==='prepare-ring-item')return {type:'ring.item.prepare',payload:params};
 if(kind==='inspect-ring-choices')return {type:'ring.inspect-story-choices',payload:params};
 if(kind==='prepare-ring')return {type:'ring.prepare-from-beast',payload:params};
 if(kind==='choose-ring')return {type:'ring.confirm-choice',payload:params};
 if(kind==='harvest-beasts')return {type:'expedition.harvest-many',payload:params};
 if(kind==='harvest-beast')return {type:'expedition.harvest',payload:params};
 if(kind==='start-expedition')return {type:'expedition.start',payload:{...params,seed:id}};
 throw Error('此片段没有可执行的游戏行动');
}

export function settleStoryCommand(state:any,command:GameCommand,execute:(state:any,command:GameCommand)=>{state:any;receipt?:Record<string,any>;frames?:BattleTurnView[]}) {
 let ledger=storyLedger(state);const p=command.payload;
 if(p.branchId!==ledger.branchId)throw Error('叙事分支已变化，旧请求不能写入');
 if(command.type==='story.rewrite-archived-prose'){
  fields(p,['branchId','turn','original','prose','inlinePresentation']);
  const original=checkedArchivedProseOriginal(state,p),number=original.turn.number,prose=text(p.prose,'小说正文',MAX_STORY_PROSE_LENGTH);
  const battleId=original.turn.battleId;
  if(battleId&&state.扩展?.battleReports?.[battleId]?.storyTurn===number){state.扩展.battleNarration??={};state.扩展.battleNarration[battleId]={kind:'writer',turn:number};}
  let presentation=p.inlinePresentation as StoryInlinePresentation|undefined;
  try{validateStoryInlinePresentation(prose,presentation,presentation?storyInlineCards(original.turn):[]);}catch{presentation=undefined;}
  ledger.summaries=(ledger.summaries??[]).filter(summary=>summary.source.turn!==number);
  ledger.stageSummaries=(ledger.stageSummaries??[]).flatMap(stage=>{const sources=stage.sources.filter(source=>source.source.turn!==number);return sources.length?[{title:'其他段落的记忆',sources}]:[];});
  return {state,receipt:{type:'story-archived-rewritten',turn:number,original,prose,...(presentation?{inlinePresentation:structuredClone(presentation)}:{}),summary:`第${number}段正文已写好，原行动与结算保持。`}};
 }
 if(command.type==='story.fork'){
  fields(p,['branchId']);
  const next=text(command.id,'新叙事分支');
  if(next===ledger.branchId)throw Error('新分支编号不能与当前分支相同');
  if(ledger.active?.status==='complete')ledger.inheritedBranchId=ledger.inheritedBranchId??ledger.branchId;
  else delete ledger.inheritedBranchId;
  ledger.branchId=next;
  return {state,receipt:{type:'story-forked',branchId:next,summary:'已从当前进度开启新的故事分支'}};
 }
 if(command.type==='story.begin-battle-report'){
  fields(p,['branchId','turn','battleId']);const battleId=text(p.battleId,'战斗记录');let report=readBattleReport(state,battleId);
  if(report.status!=='已结束')throw Error('战斗尚未结束，不能生成整场战报');
  if(!battleNeedsWriter(state,report))return {state,idempotent:true};
  count(p.turn,1,Number.MAX_SAFE_INTEGER-1);
  if(p.turn!==ledger.nextTurn||ledger.active&&ledger.active.status!=='complete')throw Error('请先完成已有故事再记录战报');
  // Standalone duels need the same recovery as duels with queued follow-up actions.
  const aftermath=state.战斗?.id===battleId?battleAftermathCommand(state):null;
  if(aftermath){
   state=execute(state,{id:command.id+':aftermath',expectedRevision:Number(state.系统.revision),type:aftermath,payload:aftermath==='arena.reconcile'?{receipt:state.战斗?.最近结算单??{}}:{}}).state;
   ledger=storyLedger(state);report=readBattleReport(state,battleId);
  }
  if(ledger.deferredBattle){
   // A finished opening stays in history; its frozen plan resumes in a new turn.
   const pending=ledger.deferredBattle;
   if(pending.battleId!==battleId)throw Error('请先完成已保存行动对应的战斗');
   if(state.战斗?.状态==='进行中')throw Error('请先结束当前战斗');
   ledger=storyLedger(state);const number=ledger.nextTurn++,resumed=structuredClone(pending.turn);
   resumed.number=number;resumed.battleId=battleId;delete resumed.continuation!.battleId;
   state.扩展.battleReports[battleId].storyTurn=number;report=readBattleReport(state,battleId);
   resumed.results.at(-1)!.receipt!.report=report;
   resumed.after=publicStoryFacts(state);ledger.active=resumed;
   delete ledger.deferredBattle;delete ledger.inheritedBranchId;
   return {state,receipt:{type:'story-resolved',turn:number,battleId,summary:'已读取真实战果，继续原先保存的战后行动'}};
  }
  const number=ledger.nextTurn++,input=AUTOMATIC_BATTLE_REPORT_INPUT,facts=publicStoryFacts(state);
  delete ledger.inheritedBranchId;
  state.扩展.battleReports[battleId].storyTurn=number;report=readBattleReport(state,battleId);
  ledger.active={number,input,battleId,status:'resolved',before:facts,after:structuredClone(facts),results:[{step:0,source:input,action:{kind:'battle-report',battleId},status:'succeeded',receipt:{type:'battle-report',report}}]};
  return {state,receipt:{type:'story-resolved',turn:number,battleId,summary:'战斗已结算，正在准备故事战报'}};
 }
 if(command.type==='story.begin'){
  fields(p,['branchId','turn','input','privatePersonId','partyChat']);if(p.partyChat!==undefined&&(p.partyChat!==true||p.privatePersonId))throw Error('队伍会话对象无效');const input=text(p.input,'玩家输入',8000),turn=count(p.turn,1,Number.MAX_SAFE_INTEGER-1);
  if(ledger.active?.number===turn){if(ledger.active.input!==input||ledger.active.privatePersonId!==p.privatePersonId||ledger.active.partyChat!==p.partyChat)throw Error('同一回合不能替换原始输入或私聊对象');return {state,idempotent:true};}
  if(ledger.deferredBattle&&(state.战斗?.状态!=='进行中'||state.战斗.id!==ledger.deferredBattle.battleId||p.privatePersonId||p.partyChat))throw Error('请先完成战斗并继续已保存的战后行动');
  if(turn!==ledger.nextTurn)throw Error('叙事回合编号已经使用或不连续');
  if(ledger.active&&ledger.active.status!=='complete')throw Error('请先完成已有回合的裁定或小说');
  if(!state.角色?.主控单位ID)throw Error('请先创建角色');
  const privatePersonId=p.privatePersonId===undefined?undefined:text(p.privatePersonId,'私聊人物');
  if(privatePersonId!==undefined){
   const person=checkPrivatePerson(state,privatePersonId);
   if(communicationAvailability(state,privatePersonId).mode==='in-person'&&(person.扩展?.角色库ID||person.generatedBy==='competition-encounter'&&person.扩展?.赛事人物)&&!person.扩展?.相遇记录?.[state.角色.主控单位ID]){state=meetStoryPerson(state,privatePersonId).state;ledger=storyLedger(state);}
  }
  delete ledger.inheritedBranchId;
  ledger.active={number:turn,input,status:'planning',results:[],...(p.partyChat?{partyChat:true}:{}),...(privatePersonId!==undefined?{privatePersonId}:{})};ledger.nextTurn++;
  return {state,receipt:{type:'story-began',turn,branchId:ledger.branchId,summary:'已记下你的行动'}};
 }
 let turn=ledger.active;
 if(command.type==='story.record-stage-summary'){
  fields(p,['branchId','turn','stage','originals']);
  if(!turn||turn.status!=='complete'||p.turn!==turn.number)throw Error('请先完成当前故事');
  const originals=checkStageOriginals(p.originals,turn.number+1,Number(state.系统.revision)+1);if(originals.some(o=>ledger.partyMessages?.some(m=>m.source.turn===o.turn)))throw Error('群消息不混入公共故事摘要');const stage=checkStoryStageSummary(p.stage);
  if(stage.sources.length!==originals.length)throw Error('阶段记忆来源不完整');
  stage.sources.forEach((s,index)=>{
   const original=originals[index];summaryMatchesTurn(s,summaryOriginalTurn(original),original.branchId);
   if(original.turn===turn!.number)summaryMatchesTurn(s,turn!,ledger.inheritedBranchId??ledger.branchId);
  });
  checkPrivateMemoryRetention([...(ledger.summaries??[]),...(ledger.stageSummaries??[]).flatMap(s=>s.sources)],stage.sources);
  const key=(s:StoryStageSummary)=>JSON.stringify(s.sources.map(v=>v.source));
  ledger.stageSummaries=[...(ledger.stageSummaries??[]).filter(s=>key(s)!==key(stage)),stage];
  return {state,receipt:{type:'story-stage-summary-recorded',summary:'已保存阶段记忆，原文与行动结果保持不变'}};
 }
 if(command.type==='story.record-summary'){
  fields(p,['branchId','turn','summary','original']);
  const original=p.original===undefined?undefined:checkStorySummaryOriginal(p.original,turn?.number??0,Number(state.系统.revision));
  const source=original?summaryOriginalTurn(original):turn;
  if(!source||source.number!==p.turn)throw Error('叙事回合已经变化');
  if(isPartyTurn(source)||ledger.partyMessages?.some(m=>m.source.turn===source.number))throw Error('群消息不混入公共故事摘要');
  const summary=checkStorySummary(p.summary);summaryMatchesTurn(summary,source,original?.branchId??ledger.inheritedBranchId??ledger.branchId);
  checkPrivateMemoryRetention([...(ledger.summaries??[]),...(ledger.stageSummaries??[]).flatMap(s=>s.sources)],[summary]);
  ledger.summaries=[...(ledger.summaries??[]).filter(s=>s.source.turn!==source.number),summary];
  return {state,receipt:{type:'story-summary-recorded',turn:source.number,summary:'已保存本段叙事记忆，原文保持不变'}};
 }
 if(!turn||turn.number!==p.turn)throw Error('叙事回合已经变化');
 if(command.type==='story.close-private'||command.type==='story.close-party'){
  if(command.type==='story.close-party'?!isPartyTurn(turn):!turn.privatePersonId)throw Error('请选择当前会话');
  fields(p,['branchId','turn']);
  const reason=privateStoryCloseReason(state);if(reason)throw Error(reason);
  turn.before??=storyTurnFacts(state,turn.privatePersonId,turn.input);
  const h=turn.hostProgress,plan=turn.continuation?.plan??(h&&['waiting','ready'].includes(h.status)?h.plan:undefined);
  if(plan)for(let i=turn.results.length;i<plan.segments.length;i++){const segment=plan.segments[i];turn.results.push({step:i,source:segment.source,action:segment.action,status:'skipped',reason:'你结束了本次会话，后续安排未执行'});}
  if(h&&['waiting','ready'].includes(h.status))h.status='cancelled';
  delete turn.continuation;
  turn.after=storyTurnFacts(state,turn.privatePersonId,turn.input);
  if(isPartyTurn(turn)){
   const original=partyMessageForTurn(turn),message=ledger.partyMessages?.find(m=>m.id===original?.id);
   if(message){turn.prose=finishPartyReplies(state,message,{messages:message.proposals?partyProposalReplies(state,message,message.audience.filter(a=>a.delivered).map(a=>a.personId)):[]},command.id);turn.results.find(r=>r.receipt?.type==='party-message-sent')!.receipt!.message=structuredClone(message);}
   else turn.prose='本次队伍会话已结束，消息未发送。';
  }else{turn.privateMessages=[];turn.prose=privateMessageProse([],true);}
  turn.status='complete';
  return {state,receipt:{type:'story-finished',branchId:ledger.branchId,turn:turn.number,prose:turn.prose,summary:turn.prose}};
 }
 if(command.type==='story.resolve-extraction'){
  fields(p,['branchId','turn','accept']);if(typeof p.accept!=='boolean')throw Error('撤离确认必须明确接受或取消');
  const settled=resolveStoryExtraction(state,p.accept,command.id);
  storyLedger(settled.state).active!.after=storyTurnFacts(settled.state);
  return settled;
 }
 if(command.type==='story.respond-belief'){
  fields(p,['branchId','turn','statementId','response']);const response=validateBeliefResponse(p.response),record=pendingStoryBeliefs(state).find(r=>r.id===p.statementId);
  if(!record)throw Error('没有匹配的待判断听闻');
  record.assessment={...response,sourceId:command.id,revision:Number(state.系统.revision)};
  const result=turn.results.find(r=>r.receipt?.type==='person-heard-statement'&&r.receipt.statement.id===record.id)!;result.receipt!.statement=structuredClone(record);
  turn.after=storyTurnFacts(state,turn.privatePersonId,turn.input);
  return {state,receipt:{type:'person-belief-recorded',statementId:record.id,assessment:structuredClone(record.assessment),summary:'已记录人物对这句话的判断，不改变陈述的真实性或其他行动结果'}};
 }
 if(command.type==='story.answer'||command.type==='story.cancel-remaining'){
  fields(p,command.type==='story.answer'?['branchId','turn','requestId','answer']:['branchId','turn','requestId']);
  const h=turn.hostProgress;if(turn.status!=='resolved'||!h||!['waiting','ready'].includes(h.status)||h.requestId!==p.requestId)throw Error('这次安排已变化，请查看当前问题');
  if(command.type==='story.answer'){if(h.status!=='waiting')throw Error('这次补充已经收到');h.answer=text(p.answer,'补充选择',8000);if(storySourceInput(turn).length>8000)throw Error('这次安排较长，请简要补充选择');h.status='ready';}
  else {h.status='cancelled';for(let i=h.baseStep;i<h.plan.segments.length;i++){const segment=h.plan.segments[i];turn.results.push({step:i,source:segment.source,action:segment.action,status:'skipped',reason:'你结束了剩余安排'});}delete turn.continuation;}
  return {state,receipt:{type:command.type==='story.answer'?'story-answer-recorded':'story-remaining-cancelled',summary:command.type==='story.answer'?'已记下你的选择，继续安排':'已结束剩余安排'}};
 }
 if(command.type==='story.execute'||command.type==='story.resume'||command.type==='story.supplement'){

  const supplement=command.type==='story.supplement',resuming=command.type==='story.resume'||supplement;
  const host=turn.hostProgress;
  fields(p,supplement?['branchId','turn','requestId','plan']:resuming?['branchId','turn','nextStep']:['branchId','turn','plan','partyChat']);
  if(resuming){
   if(supplement){if(turn.status!=='resolved'||!host||host.status!=='ready'||p.requestId!==host.requestId)throw Error('没有匹配的补充安排，不能重复执行');}
   else if(turn.status!=='resolved'||!turn.continuation||p.nextStep!==turn.continuation.nextStep)throw Error('没有匹配的后续行动，不能重复执行');
   if(pendingStoryRoom(state))throw Error('请先完成当前房间生成，再继续后续行动');
   if(pendingStoryResearch(state))throw Error('请先完成本次研发命名，再继续；无需再次投入');
   if(turn.continuation?.battleId){
    const battleId=turn.continuation.battleId;
    if(state.战斗?.id===battleId&&state.战斗.状态==='进行中'){
     if(turn.continuation.plan.segments[turn.continuation.nextStep]?.action.kind!=='battle-action'||state.战斗.当前行动单位ID!==state.角色.主控单位ID)throw Error('交战仍在继续，请等待战况更新');
    }else{
     let report=readBattleReport(state,battleId);if(report.status!=='已结束')throw Error('这场战斗尚未结束');
     if(report.storyTurn!==undefined&&report.storyTurn!==turn.number)throw Error('这场战斗已经记入另一段故事');
     const aftermath=state.战斗?.id===battleId?battleAftermathCommand(state):null;
     if(aftermath)state=execute(state,{id:command.id+':aftermath',expectedRevision:Number(state.系统.revision),type:aftermath,payload:aftermath==='arena.reconcile'?{receipt:state.战斗?.最近结算单??{}}:{}}).state;
     ledger=storyLedger(state);turn=ledger.active!;state.扩展.battleReports[battleId].storyTurn=turn.number;
     report=readBattleReport(state,battleId);turn.battleId=battleId;
     const opening=turn.results.find(r=>r.receipt?.battleId===battleId&&['spar','person-duel','competition-match','enter-room'].includes(r.action.kind));
     if(opening)opening.receipt!.report=structuredClone(report);
     turn.after={...storyTurnFacts(state,turn.privatePersonId,turn.input),battle:{id:battleId,status:'已结束',report}};
     delete turn.continuation!.battleId;
    }
   }
   if(pendingStoryPersonWorldWork(state).length)throw Error('请先等待这次行动的相关人物回应');
   if(pendingCooperationResponses(state,true).length)throw Error('请先等待人物回应合作');
  if(pendingNpcDecisions(state).length)throw Error('请先等待人物形成自己的打算');
   if(pendingStoryBeliefs(state).length)throw Error('请先等待人物判断听闻');
   if(pendingImmediateGifts(state).length)throw Error('对方尚未回应赠礼');
   if(pendingStoryCommitments(state).length)throw Error('人物尚未回应约定');
   if(pendingStoryControlledGifts(state).length)throw Error('赠物接收人尚未独立回应');
  if(pendingStoryCustodyMarket(state))throw Error('这笔交易或竞拍还在等待对方回应');
   if(pendingStoryExtraction(state))throw Error('请先确认是否放弃收获并撤离');
  }else if(turn.status!=='planning')throw Error('本回合已结算，不能再次执行行动');
  const plan=validateStoryPlan(resuming&&!supplement?turn.continuation!.plan:p.plan,storySourceInput(turn));
  if(supplement){if(plan.privateTo)throw Error('补充安排不能切换会话');for(let i=0;i<host!.baseStep;i++){const r=turn.results[i],s=plan.segments[i];if(!s||r.source!==s.source||!sameJson(r.action,s.action))throw Error('补充安排不能重写已执行的步骤');}if(plan.segments.length<=host!.baseStep)throw Error('请提供尚未执行的后续安排');host!.acceptedPlan=structuredClone(plan);host!.status='used';}
  const sourceStarts=storySourceInputStarts(storySourceInput(turn),plan.segments.map(s=>s.source))!;
  if(p.partyChat!==undefined&&(p.partyChat!==true||turn.privatePersonId||turn.battleId||plan.privateTo))throw Error('本次执行的队伍会话渠道无效');
  if(plan.privateTo){
   if(resuming||turn.privatePersonId||turn.partyChat||turn.battleId)throw Error('已有会话范围不能改投另一人物');
   const target=resolvePrivateRoute(state,plan.privateTo,turn.input);
   const person=state.人物?.列表?.[target.id],unmetCompetition=person?.generatedBy==='competition-encounter'&&person.扩展?.赛事人物&&!person.扩展?.相遇记录?.[state.角色.主控单位ID];
   if(target.canonicalId||unmetCompetition){const met=meetStoryPerson(state,target.canonicalId??target.id);state=met.state;ledger=storyLedger(state);turn=ledger.active!;if(met.receipt.metBefore===false){ledger.pendingPublicIntroductions=[...new Set([...(ledger.pendingPublicIntroductions??[]),met.receipt.personId])];}}
   const source=plan.privateTo.source,inputStart=turn.input.indexOf(source);
   turn.privatePersonId=target.id;turn.privateRoute={...plan.privateTo,personId:target.id,inputStart,inputEnd:inputStart+source.length};
   try{checkPrivatePerson(state,target.id);}catch(error){turn.privateRoute.blockedReason=(error as Error).message;}
   delete plan.privateTo;
  }
  validateStoryPlanConversation(plan,p.partyChat?{...turn,partyChat:true}:turn,supplement?host!.baseStep:resuming?turn.results.length:0);
  if(p.partyChat||plan.segments.some(s=>s.action.kind==='tell-party'))turn.partyChat=true;
  const before=resuming?turn.before!:{...storyTurnFacts(state,turn.privatePersonId,turn.input),...(!turn.privatePersonId&&ledger.pendingPublicIntroductions?.length?{pendingPublicIntroductions:[...ledger.pendingPublicIntroductions]}:{})},results:StoryStepResult[]=resuming?structuredClone(turn.results):[];
  const start=supplement?host!.baseStep:resuming?turn.continuation!.nextStep:0;
  for(const r of results)if(r.receipt?.type==='commitment-proposed'){
   if(r.receipt.response)continue;
   const record=personCommitments(state,r.receipt.commitment.personId).find((c:any)=>c.id===r.receipt!.commitment.id);
   if(!record)throw Error('后续行动缺少原承诺记录');
   const current=commitmentView(state,record);r.receipt.commitment=current;
   r.status=['accepted','completed'].includes(current.status)?'succeeded':'failed';
   if(r.status==='failed')r.reason=current.status==='pending'?'对方暂时无法自主回应，原提议仍待答复':'原承诺未获接受或已经结束';
  }
  if(state.战斗?.状态==='进行中'&&!resuming&&(plan.privateTo||turn.privatePersonId||turn.partyChat||plan.segments.some(s=>!['battle-action','battle-strategy','battle-report','describe','clarify'].includes(s.action.kind))))throw Error('交战中请使用当前战斗行动或调整战术');
  let current=state;
  const observedScope={privatePersonId:turn.privatePersonId,input:turn.input};
  let observedView:Record<string,any>|null=resuming?null:before;
  const observeCurrent=()=>observedView??=storyTurnFacts(current,observedScope.privatePersonId,observedScope.input);
  const frames:BattleTurnView[]=[];
  for(const [index,segment] of plan.segments.entries()){
   if(index<start)continue;
   if(current.战斗?.状态==='进行中'&&segment.action.kind==='battle-action'&&current.战斗.当前行动单位ID!==current.角色.主控单位ID)break;
   if(current.战斗?.状态==='进行中'&&resuming&&!['battle-action','battle-strategy','battle-report','describe','clarify'].includes(segment.action.kind))break;
   if(!turn.hostProgress&&hostRefreshReason(results,plan,index))break;
   const result:StoryStepResult={step:index,source:segment.source,action:segment.action,status:'skipped'};
   const observedBefore=observeCurrent();
   try{
   if(turn.privateRoute?.blockedReason){result.status='failed';result.reason=turn.privateRoute.blockedReason;results.push(result);continue;}
   const groupMessageResult=results.find(r=>r.action.kind==='tell-party');
   const previous=(turn.partyChat&&(PARTY_PROPOSAL_ACTIONS as readonly string[]).includes(segment.action.kind))?groupMessageResult:supplement&&index===start?undefined:results.at(-1);
   if(segment.when){const w=segment.when,source=results[w.step],sourceBattleId=source?.receipt?.battleId??source?.receipt?.report?.id,bound=turn.after?.battle?.report,observed=String(w.agreementStatus!==undefined?storyAgreementStatus(current,source):w.marketStatus!==undefined?storyMarketStatus(current,source):w.belief!==undefined?source?.receipt?.statement?.assessment?.stance:w.outcome!==undefined?(bound?.id===sourceBattleId?bound.outcome?.outcome:source?.receipt?.report?.outcome?.outcome):source?.status),expected=w.agreementStatus??w.marketStatus??w.belief??w.outcome??w.status;result.condition={when:structuredClone(w),observed,matched:observed===expected};}
   if(result.condition?!result.condition.matched:previous&&['failed','skipped','clarify'].includes(previous.status)){result.reason=result.condition?'未采用这个备用分支':'前一步未完成，后续安排暂未进行';results.push(result);continue;}
   if(turn.partyChat&&(PARTY_PROPOSAL_ACTIONS as readonly string[]).includes(segment.action.kind)){
    const m=groupMessageResult?.receipt?.message as PartyMessage|undefined;
    if(!m?.audience.some(a=>a.personId===segment.action.characterId&&a.delivered)){result.status='failed';result.reason='本人没有接通这条群消息，不能替其提出或确认分配';results.push(result);continue;}
   }
   if(turn.privatePersonId){
    const person=before.people[0],a=segment.action;
    const channelMode=communicationAvailability(current,person.id).mode;
    const reference=a.characterStep===undefined?a.characterId:results[Number(a.characterStep)]?.receipt?.personId;
    if(rules.custodyMarket.INTENTS.includes(a.kind)){const offerId=a.offerStep===undefined?a.offerId:results[Number(a.offerStep)]?.receipt?.offerId,offer=rules.custodyMarket.offer(current,offerId);if(a.kind==='propose-custody-transfer'?a.buyerId!==person.id:!offer||![offer.sellerId,offer.buyerId].includes(person.id)){result.status='failed';result.reason='请与这笔交易的买主或卖方商谈';results.push(result);continue;}}
    if(a.kind==='issue-field-control'&&(a.command as any)?.targetId!==undefined&&![person.id,current.角色.主控单位ID].includes((a.command as any).targetId)){result.status='failed';result.reason='私聊控制命令不能涉及当前交谈之外的第三人';results.push(result);continue;}
    if(rules.preparations.INTENTS.includes(a.kind)){
     const memberId=a.kind==='prepare-cooperation-battle'?rules.cooperation.table(current).agreements.find((r:any)=>r.id===a.cooperationId)?.memberId:rules.preparations.table(current).records.find((r:any)=>r.id===a.preparationId)?.memberId;
     if(memberId!==person.id){result.status='failed';result.reason='私聊只能处理当前对象的出战准备与收束';results.push(result);continue;}
    }
    if(a.kind==='revoke-restraint-permission'&&(rules.custody.table(current).permissions??[]).find((p:any)=>p.id===a.permissionId)?.operatorId!==person.id){result.status='failed';result.reason='私聊只能处理给予当前对象的许可';results.push(result);continue;}
    const scopeReason=privateStoryActionScopeReason(current,person.id,{...a,...(a.itemStep===undefined?{}:{itemId:storyItemResult(results[Number(a.itemStep)])})});
    if(scopeReason){result.status='failed';result.reason=scopeReason;results.push(result);continue;}
    if(a.kind==='respond-npc-request'&&(current.世界.npcRequests??[]).find((r:any)=>r.id===a.requestId)?.ownerId!==turn.privatePersonId){result.status='failed';result.reason='私聊只能处理当前人物的委托';results.push(result);continue;}
    if(a.kind==='answer-person-plan'&&(current.世界.npcGoals??[]).find((g:any)=>g.id===a.goalId)?.ownerId!==turn.privatePersonId){result.status='failed';result.reason='私聊只能答复当前人物的邀约';results.push(result);continue;}
    const referenceReason=a.characterStep!==undefined&&results[Number(a.characterStep)]?.action.kind!=='resolve-person'?'私聊只能引用本次交谈中已确认的人物':privateStoryActionReferenceReason(current,person.id,a,channelMode,reference);
    if(referenceReason){
     result.status='failed';result.reason=referenceReason;results.push(result);continue;
    }
   }
   if(NON_EXECUTING_RESULTS[segment.action.kind]){result.status=NON_EXECUTING_RESULTS[segment.action.kind];result.reason=String(segment.action.reason);results.push(result);continue;}
   if(segment.action.kind==='tell-party'){
    try{const said=String(segment.action.text),inputStart=sourceStarts[index]+segment.source.indexOf(said),settled=recordPartyMessage(structuredClone(current),said,{branchId:ledger.branchId,turn:turn.number,step:index,revision:Number(current.系统.revision),inputStart,inputEnd:inputStart+said.length},`party:${ledger.branchId}:${turn.number}:${index}`);current=settled.state;result.status='succeeded';result.receipt=settled.receipt;}catch(error){result.status='failed';result.reason=(error as Error).message;}
    results.push(result);continue;
   }
   if(segment.action.kind==='remember-object'){
    try{
     const settled=rememberStoryObject(structuredClone(current),segment.action,segment.source,{id:`story:${ledger.branchId}:${turn.number}:${index}`,branchId:ledger.branchId,turn:turn.number,step:index,...(turn.privatePersonId?{privatePersonId:turn.privatePersonId}:{})});
     current=settled.state;result.status='succeeded';result.receipt=settled.receipt;
    }catch(error){result.status='failed';result.reason=(error as Error).message;}
    results.push(result);continue;
   }
   if(segment.action.kind==='resolve-object'){
    result.receipt=resolveStoryObject(current,String(segment.action.name),turn.privatePersonId);
    result.status=result.receipt.status==='unique'?'succeeded':'clarify';
    if(result.status==='clarify')result.reason='叙事对象尚未唯一确认，不能猜测身份或建立副本';
    results.push(result);continue;
   }
   if(segment.action.kind==='check-history'){
    result.receipt=storyCheckHistory(current,Number(segment.action.before));result.status='succeeded';results.push(result);continue;
   }
   if(segment.action.kind==='inspect-inventory'){
    result.receipt=inspectStoryInventory(current,segment.action);
    result.status='succeeded';results.push(result);continue;
   }
   if(segment.action.kind==='resolve-person'){
    result.receipt=resolveStoryPersonName(current,String(segment.action.name),turn.privatePersonId);
    result.status=result.receipt.status==='unique'?'succeeded':'clarify';
    if(result.status==='clarify')result.reason=result.receipt.status==='ambiguous'?'这个称呼对应多位已知人物，请说明是哪一位':'没有该称呼的唯一已知人物，请先澄清身份';
    results.push(result);continue;
   }
   if(['give-item','give-gold'].includes(segment.action.kind)){
    try{
     const action:any={...segment.action};if(action.characterStep!==undefined)action.characterId=personFromStep(results,action.characterStep);
     if(action.itemStep!==undefined){action.itemId=storyItemResult(results[action.itemStep]);if(!action.itemId)throw Error('前置步骤没有可赠送的物品');}
     const offered=offerImmediateGift(structuredClone(current),action,`story:${ledger.branchId}:${turn.number}:${index}`);
     current=offered.state;result.status='succeeded';result.receipt=offered.receipt;result.executionSourceId=offered.receipt.id;
    }catch(error){result.status='failed';result.reason=String((error as Error).message);}
    results.push(result);if(result.status==='succeeded')break;continue;
   }
   if(segment.action.kind==='label-person'){
    try{
     let characterId=segment.action.characterId;
     if(segment.action.characterStep!==undefined)characterId=personFromStep(results,segment.action.characterStep);
     const settled=recordStoryPersonLabel(structuredClone(current),characterId,String(segment.action.name),{id:`story:${ledger.branchId}:${turn.number}:${index}`,branchId:ledger.branchId,turn:turn.number,step:index});
     current=settled.state;result.status='succeeded';result.receipt=settled.receipt;
    }catch(error){result.status='failed';result.reason=String((error as Error).message);}
    results.push(result);continue;
   }
   if(['tell-person','address-person'].includes(segment.action.kind)||segment.action.kind==='consider-person-goal'&&segment.action.intent!==undefined){
    try{
     let characterId=segment.action.characterId;
     if(segment.action.characterStep!==undefined)characterId=personFromStep(results,segment.action.characterStep);
     const said=String(segment.action.kind==='tell-person'?segment.action.text:segment.action.intent),inputStart=sourceStarts[index]+segment.source.indexOf(said);
     if(segment.action.kind!=='tell-person'){
      const settled=recordStoryAddress(structuredClone(current),String(characterId),said,{branchId:ledger.branchId,turn:turn.number,step:index,inputStart,inputEnd:inputStart+said.length});
      if(segment.action.kind==='consider-person-goal'){
       const planned=execute(settled.state,{id:`story:${ledger.branchId}:${turn.number}:${index}`,type:'story.consider-npc-goal',payload:{characterId},expectedRevision:Number(current.系统.revision)});
       current=planned.state;result.receipt={...planned.receipt,personId:settled.receipt.personId,address:settled.receipt.address};
      }else{current=settled.state;result.receipt=settled.receipt;}
      result.status='succeeded';results.push(result);if(segment.action.kind==='consider-person-goal'&&pendingNpcDecisions(current).length)break;continue;
     }
     const settled=recordStoryStatement(structuredClone(current),characterId,said,{branchId:ledger.branchId,turn:turn.number,step:index,revision:Number(current.系统.revision),inputStart,inputEnd:inputStart+said.length},`story:${ledger.branchId}:${turn.number}:${index}`);
     current=settled.state;result.status='succeeded';result.receipt=settled.receipt;
    }catch(error){result.status='failed';result.reason=String((error as Error).message);}
    results.push(result);if(result.status==='succeeded'&&plan.segments.slice(index+1).some(s=>s.when?.belief&&s.when.step===index))break;continue;
   }
   try{
    const actionId=`story:${ledger.branchId}:${turn.number}:${index}`,mapped=commandFor(segment.action,actionId,current);
    if(segment.action.kind==='start-expedition')mapped.payload.seed=`${command.id}:departure:${index}`;
    if(segment.action.kind==='escape-captivity')result.executionSourceId=actionId;
    if(segment.action.kind==='enter-room'&&segment.action.routeIndex!==undefined){
     const nodeId=rules.expedition.previewRoomActions(current).availableNodeIds[Number(segment.action.routeIndex)];
     if(typeof nodeId!=='string')throw Error('指定顺序的可选路线当前不存在');
     delete mapped.payload.routeIndex;mapped.payload.nodeId=nodeId;
    }
    if(segment.action.objectStep!==undefined){
     const previous=results[Number(segment.action.objectStep)];
     if(previous?.status!=='succeeded'||typeof previous.receipt?.objectId!=='string')throw Error('前置叙事对象尚未成功登记或唯一确认');
     delete mapped.payload.objectStep;mapped.payload.objectId=previous.receipt.objectId;
    }
    if(segment.action.itemStep!==undefined){
     const previous=results[Number(segment.action.itemStep)];
     const itemId=storyItemResult(previous);
     if(!itemId||!current.物品?.实例?.[itemId])throw Error('前置步骤尚未产生唯一可引用实物，不能引用');
     delete mapped.payload.itemStep;mapped.payload.itemId=itemId;
    }
    if(['intimate-craft','intimate-equip','intimate-detach'].includes(segment.action.kind))assertNeutralWearableStoryAction(current,{...segment.action,...mapped.payload});
    if(segment.action.characterStep!==undefined){
     const personId=personFromStep(results,segment.action.characterStep);
     if(!current.人物?.列表?.[personId])throw Error('前置人物档案不存在，不能引用');
     delete mapped.payload.characterStep;mapped.payload.characterId=personId;
    }
    if(segment.action.kind==='issue-field-control'){
     mapped.payload.executorId=mapped.payload.characterId;delete mapped.payload.characterId;
     if(segment.action.giftStep!==undefined){const source=results[Number(segment.action.giftStep)],c=source?.receipt;if(source?.status!=='succeeded'||c?.type!=='field-control-order'||c.status!=='executed'||c.action.type!=='propose-gift'||c.executorId!==mapped.payload.executorId)throw Error('前置步骤没有该赠送者实际提出的赠物承诺');mapped.payload.action={...mapped.payload.action,commitmentId:c.settlement.commitmentId};}
    }
    if(segment.action.kind==='request-person-growth'){mapped.payload.personId=mapped.payload.characterId;delete mapped.payload.characterId;mapped.payload.source=mapped.payload.growth;delete mapped.payload.growth;}
    if(['propose-person-contract','form-controlled-contract','set-realm-arrangement','arrange-realm-resident','end-realm-visit','move-realm-guest','set-resident-permissions','reward-resident','punish-resident','propose-performance-agreement','deploy-resident','recall-resident','discuss-resident-tactics','propose-custody-transfer','start-custody-auction','person-duel','capture-person','spare-person','execute-person','search-captive','release-captive','attach-restraint','permit-restraint','request-restraint-permission','admit-captive','place-captive','withdraw-captive','permit-custody-duty','assign-custody-guard','observe-custody-person','tell-custody-news','send-custody-letter','propose-person-cooperation','impose-person-cooperation'].includes(segment.action.kind)){
     mapped.payload.targetId=mapped.payload.characterId;delete mapped.payload.characterId;
     if(['capture-person','spare-person','execute-person'].includes(segment.action.kind)&&mapped.payload.defeatId===undefined){
      const matches=rules.custody.facts(current,current.角色.主控单位ID).defeats.filter((d:any)=>d.targetId===mapped.payload.targetId&&d.available);
      if(matches.length!==1)throw Error('没有唯一有效的死斗战败处置资格');mapped.payload.defeatId=matches[0].id;
     }
     if(segment.action.kind==='search-captive')delete mapped.payload.resourceKind;
    }
    for(const [idKey,stepKey,receiptType] of [['offerId','offerStep','custody-trade'],['auctionId','auctionStep','asset-auction']])if(segment.action[stepKey]!==undefined){const prior=results[Number(segment.action[stepKey])];if(prior?.status!=='succeeded'||prior.receipt?.type!==receiptType||!prior.receipt[idKey])throw Error('前置步骤没有实际发起的交接或拍卖');delete mapped.payload[stepKey];mapped.payload[idKey]=prior.receipt[idKey];}
    if(segment.action.kind==='collect-loot'&&segment.action.resolutionStep!==undefined){const source=results[Number(segment.action.resolutionStep)],record=source?.receipt?.commitment;if(record?.kind!=='loot-resolution'||!record.resolutionId)throw Error('前置步骤没有真实暂存分配方案');delete mapped.payload.resolutionStep;mapped.payload.resolutionId=record.resolutionId;}
    if(['fulfill-promise','cancel-promise','attend-invitation'].includes(segment.action.kind)&&segment.action.commitmentStep!==undefined){
     const source=results[Number(segment.action.commitmentStep)],record=source?.receipt?.commitment;
     const canonical=record&&(current.战斗单位?.列表?.[record.personId]?.扩展?.角色库ID??record.personId);
     if(source?.receipt?.type!=='commitment-proposed'||![record.personId,canonical].includes(mapped.payload.characterId))throw Error('前置承诺与当前人物不一致');
     delete mapped.payload.commitmentStep;mapped.payload.commitmentId=record.id;
    }
    if(segment.action.kind==='accept-hire-offer'&&segment.action.quoteStep!==undefined){
     const source=results[Number(segment.action.quoteStep)],quote=source?.receipt;
     if(source?.status!=='succeeded'||quote?.type!=='hire-negotiated'||!quote.accepted
       ||![quote.characterId,quote.personId].includes(mapped.payload.characterId)||quote.dungeonId!==segment.action.dungeonId)throw Error('前置议价尚未同意该人物与目的地的出价');
     delete mapped.payload.quoteStep;mapped.payload.quoteId=quote.id;
    }
    if(segment.action.kind==='dismiss'){
     const contracts=(current.远征?.companionContracts??[]).filter((c:any)=>c.leaderId===current.角色.主控单位ID&&[c.characterId,c.unitId].includes(mapped.payload.characterId));
     if(contracts.length!==1)throw Error('没有这位人物唯一的待发雇佣合同');mapped.payload={agreementId:contracts[0].agreementId};
    }
    if(['free-action','ask-release'].includes(segment.action.kind))mapped.payload.source={branchId:ledger.branchId,turn:turn.number,step:index,input:segment.source};
    let attempt=structuredClone(current);
    if(segment.action.kind==='battle-action'){
     const actorId=current.角色.主控单位ID;
     if(current.战斗?.状态!=='进行中'||current.战斗.当前行动单位ID!==actorId)throw Error('还没有轮到你行动，请先等待当前战斗动作结束');
     if(mapped.payload.actorId!==undefined&&mapped.payload.actorId!==actorId)throw Error('只能点名执行自己的战斗行动');
     mapped.payload={...mapped.payload,actorId};
     const preview=rules.combat.previewAction(current,{...mapped.payload,id:actionId});
     if(!preview.ready)throw Error(preview.reason||'当前无法执行这项战斗行动');
    }
    const settled=execute(attempt,{id:actionId,expectedRevision:Number(current.系统.revision),...mapped});
    const checked=rules.world.validateState(settled.state);if(!checked.pass)throw Error(checked.errors.join('；'));
    const receipt=structuredClone(settled.receipt??{});
    if(segment.action.kind==='battle-action')receipt.report=battleActionReport(current,checked.state,settled.frames??[],actionId,(current.扩展?.battleReports?.[current.战斗.id]?.actions?.length??0)+frames.length);
    frames.push(...(settled.frames??[]));
    if(['prepare-ring','prepare-ring-item'].includes(segment.action.kind)&&receipt.pendingId)receipt.choices=readStoryRingChoices(checked.state,receipt.pendingId);
    current=checked.state;result.status='succeeded';result.receipt=receipt;
    if(receipt.type==='field-control-order'&&receipt.status!=='executed'){result.status='failed';result.reason=receipt.reason||receipt.summary;}
    if(receipt.type==='story-free-action'){
     if(receipt.check){const journal=storyLedger(current);(journal.checks??=[]).push({branchId:ledger.branchId,turn:turn.number,step:index,receipt:structuredClone(receipt.check)});}
     if(!receipt.passed){result.status='failed';result.reason=receipt.interruption?'行动因寿命耗尽终止，未产生预定后果':'按事先冻结的失败后果结算，实际耗时已记录';}
    }
    if(['story-attribute-check','story-opposed-check'].includes(receipt.type)){
     const journal=storyLedger(current);(journal.checks??=[]).push({branchId:ledger.branchId,turn:turn.number,step:index,receipt:structuredClone(receipt)});
    }
    if(receipt.type==='captivity-escape'&&!['escaped','restraint-broken','restraint-layer-broken','door-broken'].includes(receipt.result)){result.status='failed';result.reason=receipt.summary;}
    if(receipt.type==='custody-door-break'&&!receipt.broken){result.status='failed';result.reason=receipt.summary;}
    if(receipt.type==='story-attribute-check'&&!receipt.passed){result.status='failed';result.reason='本次检定未达到难度，按失败条件继续';}
    if(receipt.type==='story-opposed-check'&&!receipt.passed){result.status='failed';result.reason='本次对抗未胜过对方，按失败条件继续';}
    if(result.receipt.type==='story-extraction-confirmation'){result.status='failed';result.reason='等待玩家确认损失清单，尚未撤离';}
    if(result.receipt.type==='expedition-combat-entered'&&current.远征?.当前?.currentRoom?.nodeId===receipt.nodeId)result.receipt.battleId=current.远征.当前.currentRoom.battleId;
    if(['spar-started','person-duel-started','solo-competition-match-started'].includes(result.receipt.type))initializeBattlePreferences(current);
    if(result.receipt.type==='hire-negotiated'&&!result.receipt.accepted){result.status='failed';result.reason='对方未接受玩家出价，已提出新报价，尚未雇佣';}
   }catch(error){result.status='failed';result.reason=String((error as Error).message);}
   if(turn.partyChat&&(PARTY_PROPOSAL_ACTIONS as readonly string[]).includes(segment.action.kind)&&result.receipt?.commitment){
    const c=result.receipt.commitment,m=storyLedger(current).partyMessages!.find(m=>m.id===groupMessageResult!.receipt!.message.id)!;
    (m.proposals??=[]).push({kind:c.kind,id:result.receipt.agreementId??result.receipt.resolutionId??c.allocationId??c.resolutionId,personId:c.personId,commitmentId:c.id,step:index,fresh:result.receipt.type==='commitment-proposed'});
    groupMessageResult!.receipt!.message=structuredClone(m);
   }
   results.push(result);
   if(result.receipt?.interrupted){
    for(let pending=index+1;pending<plan.segments.length;pending++){const next=plan.segments[pending];results.push({step:pending,source:next.source,action:next.action,status:'skipped',reason:'长行动已暂停，后续行动需玩家重新选择，不自动越过打断'});}
    break;
   }
   if(result.status==='succeeded'&&rules.personContracts.pendingReceipt(current,result.receipt,current.角色.主控单位ID))break;
   if(result.action.kind==='battle-action'&&current.战斗?.状态==='进行中')break;
   if(pendingStoryPersonWorldWork(current,results).length)break;
   if(result.status==='succeeded'&&(result.receipt?.type==='custody-trade'&&result.receipt.status==='pending'||result.receipt?.type==='custody-auction'&&result.receipt.status==='open')||result.receipt?.type==='field-control-order'&&result.receipt.status==='executed'&&result.receipt.action.type==='propose-gift'||result.receipt?.type==='person-cooperation'&&result.receipt.status==='proposed'||['person-growth-requested','commitment-proposed','story-extraction-confirmation','npc-goal-requested','research-materials-consumed'].includes(result.receipt?.type??'')||result.status==='succeeded'&&['spar','person-duel','enter-room','competition-match'].includes(result.action.kind))break;
   }finally{
    if(!readOnlyStoryAction(result.action.kind)&&!['skipped','described','clarify'].includes(result.status))observedView=null;
    result.context=captureStoryEventContext(result,observedBefore,observeCurrent());
   }
  }
  if(expireStoryCommitments(current))observedView=null;
  if(turn.privatePersonId){const pending=storyLedger(current).pendingPublicIntroductions??[];for(const r of results)if(r.status==='succeeded'&&(r.receipt?.type==='character-met'&&r.receipt.metBefore===false||r.receipt?.type==='story-person-created'&&!r.receipt.reused)&&!pending.includes(r.receipt!.personId))pending.push(r.receipt!.personId);if(pending.length)storyLedger(current).pendingPublicIntroductions=pending;}
  const active=storyLedger(current).active!,boundReport=turn.after?.battle?.report;active.status='resolved';active.results=results;if(active.partyChat)observedView=null;active.before=results.some(r=>r.action.kind==='tell-party')?partyConversationFacts(current,partyMessageForTurn(active)):before;active.after={...observeCurrent(),...(boundReport?{battle:{id:boundReport.id,status:'已结束',report:boundReport}}:{})};
  const refresh=!active.hostProgress?hostRefreshReason(results,plan,results.length):null;
  const needsBattle=current.战斗?.id&&active.battleId!==current.战斗.id&&(current.战斗.状态==='进行中'||results.some(r=>r.receipt?.battleId===current.战斗.id&&['battle-action','spar','person-duel','competition-match','enter-room'].includes(r.action.kind)));
  if(needsBattle&&!turn.privatePersonId&&!turn.partyChat)active.continuation={plan,nextStep:results.length,battleId:current.战斗.id};
  else if(refresh){const last=results.at(-1)!;active.hostProgress={requestId:`${command.id}:host:${results.length}`,reason:refresh,status:refresh==='clarification'?'waiting':'ready',baseStep:results.length,plan:structuredClone(plan),...(refresh==='clarification'?{question:String(last.action.reason??last.reason??'请补充你的选择。')}:{} )};delete active.continuation;}
  else if(results.length<plan.segments.length||pendingStoryRoom(current))active.continuation={plan,nextStep:results.length};else delete active.continuation;
  return {state:current,frames,receipt:{type:'story-resolved',branchId:ledger.branchId,turn:turn.number,results,summary:pendingStoryExtraction(current)?'请确认撤离损失，后续行动已保留':active.continuation?'已保存行动顺序，当前阶段完成后继续。':'本次行动已经结算，等待写下故事'}};
 }
 if(command.type==='story.rewrite-prose'){
  if(isPartyTurn(turn)||turn.privatePersonId)throw Error('已说出的消息保留原话，请发送新消息继续交谈');
  fields(p,['branchId','turn','prose','inlinePresentation']);if(turn.status!=='complete')throw Error('只能重写已完成故事');
  turn.prose=text(p.prose,'小说正文',MAX_STORY_PROSE_LENGTH);
  if(turn.battleId){state.扩展.battleNarration??={};state.扩展.battleNarration[turn.battleId]={kind:'writer',turn:turn.number};}
  let presentation=p.inlinePresentation as StoryInlinePresentation|undefined;
  try{validateStoryInlinePresentation(turn.prose,presentation,presentation?storyInlineCards(turn):[]);}catch{presentation=undefined;}
  if(presentation)turn.inlinePresentation=structuredClone(presentation);else delete turn.inlinePresentation;
  if(!turn.privatePersonId&&ledger.pendingPublicIntroductions?.length){const shown=new Set(storyInlineCards(turn).filter(c=>c.kind==='person'&&(presentation as any)?.placements.some((v:any)=>v.cardId===c.id)).map(c=>c.data.id));ledger.pendingPublicIntroductions=ledger.pendingPublicIntroductions.filter(id=>!shown.has(id));}
  delete ledger.inheritedBranchId;
  ledger.summaries=(ledger.summaries??[]).filter(s=>s.source.turn!==turn.number);
  ledger.stageSummaries=(ledger.stageSummaries??[]).flatMap(stage=>{
   if(!stage.sources.some(source=>source.source.turn===turn.number))return [stage];
   const sources=stage.sources.filter(source=>source.source.turn!==turn.number);
   // Original quotes and privacy annotations from other turns remain valid.
   // The old title may describe the replaced prose, so it is not reused.
   return sources.length?[{title:'其他段落的记忆',sources}]:[];
  });
  return {state,receipt:{type:'story-rewritten',turn:turn.number,summary:'这一段故事已重新写好。'}};
 }
 if(command.type==='story.finish'){
  if(pendingStoryPersonWorldWork(state).length)throw Error('请先等待这次行动的相关人物回应');
  if(pendingStoryExtraction(state))throw Error('请先确认撤离损失，再写下故事');
  if(pendingStoryResearch(state))throw Error('作品方案已保存，请继续命名，不会再次投入材料');
  if(turn.hostProgress&&['waiting','ready'].includes(turn.hostProgress.status)||turn.continuation)throw Error('还有未执行的后续行动，不能提前写完故事');
  if(pendingCooperationResponses(state,true).length)throw Error('请先等待人物回应合作');
  if(pendingStoryControlledGifts(state).length)throw Error('赠物接收人尚未独立回应');
  if(pendingStoryCustodyMarket(state))throw Error('这笔交易或竞拍还在等待对方回应');
  if(pendingNpcDecisions(state).length)throw Error('请先等待人物形成自己的打算');
   if(pendingStoryBeliefs(state).length)throw Error('请先等待人物判断听闻');
   if(pendingImmediateGifts(state).length)throw Error('请先等待对方回应赠礼');
   if(pendingStoryCommitments(state).length)throw Error('请先等待人物回应约定，再写下故事');
  if(isPartyTurn(turn)&&p.inlinePresentation!==undefined)throw Error('群聊只保存头像与消息，不接收正文卡片');
  fields(p,['branchId','turn','prose','privateMessages','partyReplies','inlinePresentation']);if(turn.status!=='resolved')throw Error('本回合尚未结算或已完成');
  if(isPartyTurn(turn)){
   const receipt=partyMessageForTurn(turn),message=ledger.partyMessages?.find(m=>m.id===receipt?.id);
   if(message){turn.prose=finishPartyReplies(state,message,p.partyReplies,command.id);turn.results.find(r=>r.receipt?.type==='party-message-sent')!.receipt!.message=structuredClone(message);turn.after=storyTurnFacts(state,undefined,turn.input);}
   else{validatePartyReplyProposal(p.partyReplies,[]);turn.prose=turn.results.map(r=>r.reason).filter(Boolean).join('；')||'消息没有送达，暂时没有新的队伍回复。';}
  }else if(turn.privatePersonId){if(p.partyReplies!==undefined||p.inlinePresentation!==undefined||p.prose!==undefined)throw Error('新私聊只接收结构化短消息');turn.privateMessages=validatePrivateMessages({messages:p.privateMessages},turn.after?.communication?.available===false);turn.prose=privateMessageProse(turn.privateMessages);}
  else{if(p.privateMessages!==undefined||p.partyReplies!==undefined)throw Error('普通故事不能写入聊天消息');turn.prose=text(p.prose,'小说正文',MAX_STORY_PROSE_LENGTH);}
  let presentation=p.inlinePresentation as StoryInlinePresentation|undefined;
  try{validateStoryInlinePresentation(turn.prose!,presentation,presentation?storyInlineCards(turn):[]);}catch{presentation=undefined;}
  if(presentation)turn.inlinePresentation=structuredClone(presentation);else delete turn.inlinePresentation;
  if(!turn.privatePersonId&&ledger.pendingPublicIntroductions?.length){const shown=new Set(storyInlineCards(turn).filter(c=>c.kind==='person'&&(presentation as any)?.placements.some((v:any)=>v.cardId===c.id)).map(c=>c.data.id));ledger.pendingPublicIntroductions=ledger.pendingPublicIntroductions.filter(id=>!shown.has(id));}
  deferImmediateGifts(state,turn,ledger.branchId);
  for(const result of turn.results){
   if(result.status!=='described'||result.action.mode!=='daily'||!result.action.characterId)continue;
   const playerId=state.角色.主控单位ID,ref=String(result.action.characterId);
   const person=state.人物.列表[ref]??state.人物.列表[rules.arena.persistentCharacterId(ref)];
   if(!person||person.id===playerId||person.status==='dead'||!rules.actions.colocated(state,playerId,person.id))continue;
   const id='scene:'+ledger.branchId+':'+turn.number+':'+result.step;
   const events=(person.扩展.共同见闻??=[]);
   if(!events.some((e:any)=>e.id===id))events.push({id,kind:'daily-scene',playerId,participants:[playerId,person.id],source:{branchId:ledger.branchId,turn:turn.number,step:result.step},time:structuredClone(state.世界.时间),summary:result.source.slice(0,500)});
  }
  turn.status='complete';
  if(turn.battleId){state.扩展.battleNarration??={};state.扩展.battleNarration[turn.battleId]={kind:'writer',turn:turn.number};}
  const automation=state.战斗?.扩展?.automation;
  if(state.战斗?.状态==='进行中'&&automation?.waitingStoryTurn===turn.number){automation.enabled=effectiveBattlePreferences(state).defaultMode==='auto';delete automation.waitingStoryTurn;}
  return {state,receipt:{type:'story-finished',branchId:ledger.branchId,turn:turn.number,prose:turn.prose,summary:'故事已记录'}};
 }
 throw Error('未支持的叙事命令');
}
