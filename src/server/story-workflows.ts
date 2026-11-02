import {checkedArchivedProseOriginal} from '../shared/story-archived-prose';
import {validateStoryAbilitySelections} from './story-ability-selection';
import {immediateGiftAvailability} from '../runtime/story-immediate-gifts';
import {personContractSourceOptions} from './person-contract-presentation';
import {pendingImmediateGifts,deferredImmediateGifts} from '../shared/story-immediate-gifts';
import {hostContinuationEvidence} from './story-host-continuation';
import {validateStoryLogisticsInterfaces} from './story-logistics-interfaces';
import {validateStoryCompetitionReferences} from './story-competition-interfaces';
import {validateStoryDungeonReferences} from './story-dungeon-references';
import {storySourceInput} from '../shared/story-source-input';
import {pendingStoryPersonWorldWork} from '../runtime/person-world-work';
import {personalFieldSkillOptions,personalMaintenanceOptions} from '../runtime/personal-field-abilities';
import {pendingCooperationResponses} from '../shared/person-cooperation';
import {pendingStoryCustodyTrades,pendingStoryCustodyAuctions,pendingStoryCustodyMarket} from '../runtime/story-custody-market';
import {prepareCustodyTradeResponse} from './person-custody-trade-workflow';
import {prepareCustodyAuctionDecision} from './person-custody-auction-workflow';
import {pendingStoryControlledGifts} from '../shared/story-controlled-gifts';
import {prepareGiftResponse} from './person-gift-workflow';

import {promptMessage} from '../runtime/model-prompt-templates';
import {preparePrivateReplyPrompt,runPrivateReplies} from './story-private-messages';
import {ModelPromptCapacityError} from '../runtime/model-prompt-check';
import {planStoryBattleWritingSections,previousWritingSectionReserve,storyWritingSectionCards,type PreviousWritingSection} from './story-battle-writing-sections';
import {writeBattleSections,preflightWritingSection,type SectionWritingRecovery} from './story-battle-section-writer';
import {preflightStoryWritingCycle} from './story-writing-capacity';
import {writeStoryNovel,storyNovelPresentation,type StoryNovelReview} from './story-novel';
import {storyInlineCards,inlineCardProtocol,extractStoryInlineCards,inlineStoryWithMarkers,completeStoryInlinePresentation} from '../shared/story-inline-cards';
import {storyHostActions} from './story-plan-tasks';
import {createHostCatalog} from './story-host-catalog';
import {shortFeedbackPlan} from '../shared/story-short-feedback';
import {STORY_TRADE_INTERFACES,validateStoryTradeInterfaces} from '../runtime/story-commerce';
import {projectCommerceAuctionReadings} from '../runtime/story-commerce-reading';
import {compactStoryPacketReadings} from './story-host-record-columns';

import {compileStoryCurrentContext} from '../runtime/story-writing-facts';
import {compileCommitment} from '../runtime/story-social-writing-facts';

import {validateStoryPlanConversation} from '../runtime/story-plan-conversation';
import {STORY_BATTLE_OUTCOMES} from '../shared/story-battles';
import {prepareStoryAuthorPrompt} from './story-author-prompt';
import {createStoryWritingPackage,assertStoryWritingPackageCurrent,type StoryWritingPackage} from './story-writing-package';
import {selectStoryWritingView} from './story-writing-view';




import {ModelRecoveryBudget} from '../runtime/model-recovery-budget';
import {MAX_STORY_PROSE_LENGTH} from '../shared/story-prose';
import {pendingStoryRingNaming} from '../shared/story-ring-naming';
import {preparePartyReplyPrompt,runPartyReplies} from './story-party-replies';
import type {StoryTurn} from '../runtime/story-turns';
import {isPartyTurn,partyMessageForTurn} from '../shared/story-party-chat';
import {resolvePrivateRoute} from '../runtime/story-private-route';
import {communicationAvailability,soulContact,REMOTE_STORY_ACTIONS} from '../shared/story-communication';
import {pendingNpcDecisions} from '../shared/npc-autonomy';
import {attestStoryObjectSources,validateStoryGiftReferences} from './story-object-sources';


import {storyTravelOptions} from '../runtime/story-travel-options';
import {requestStoryPlan} from './story-plan-request';
import {assertStoryPlanAuthority,STORY_PLAN_AUTHORITY_VERSION} from './story-plan-authority';
import {storyCreationProgress} from './story-creation-progress';
import {stateFingerprint} from './workflow-ticket';
import {storyHostChannelScope} from './story-host-channel';
import {pendingStoryBeliefs,validateBeliefResponse} from '../shared/story-person-knowledge';
import {selectStorySummaries,selectPersonStorySummaries,selectHostPrivateSummaries} from '../shared/story-summary';
import {PREFILL_MODES} from '../runtime/model-protocol';
import {rules} from '../rules';
import {requestMartialSoulDraft} from '../runtime/game-model-orchestrator';
import {checkedHostPrivateRecall,checkedStoryRecall,personStoryRecall} from '../shared/story-recall';
import {pendingStoryExtraction} from '../shared/story-extraction';
import {pendingStoryRoom} from '../shared/story-room';
import {privateStoryActionResources,supportManufacturingResources} from '../runtime/story-action-resources';
import {storyPresetOptions} from '../runtime/story-preset-options';
import {battleActionOptions} from '../runtime/battle-action-options';
import {withLightActionState} from '../runtime/story-state-writing-facts';
import {privateStoryActionAllowed,validatePrivateStoryPlan} from '../runtime/story-private-actions';
import type {StoryWritingDiagnostics} from './story-writing-diagnostics';
import type {GameSnapshot} from '../runtime/contracts';
import {ModelGatewayError,ModelGateway} from '../runtime/model-gateway';
import {CloudError} from '../cloud/protocol';
import {compileStoryPrompt,emptyStoryPromptConfig,type StoryPromptConfig} from '../runtime/story-prompts';
import {STORY_ACTION_SCHEMA,storyTurnFacts,checkPrivatePerson,storyLedger,validateStoryPlan} from '../runtime/story-turns';
import {issueWorkflowTicket} from './workflow-ticket';
import {pendingStoryCommitments,deferredStoryCommitments} from '../shared/story-commitments';
import {validateCommitmentResponse,invitationAvailability} from '../runtime/story-commitments';

const partyWriterInput=(turn:StoryTurn)=>turn.results.some(r=>r.action.kind==='tell-party')?partyMessageForTurn(turn)?.text??'这次队伍消息发送失败，没有人收到新话语。':turn.input;

/** Baseline only: future receipts and battle logs must be checked again when they exist. */
export function preflightStoryWriter(snapshot:GameSnapshot,input:Record<string,any>,gateway:ModelGateway,scope:Pick<StoryTurn,'partyChat'|'privatePersonId'|'battleId'>={}){
 const state=snapshot.state as any,ledger=storyLedger(state),turn={...ledger.active!,...scope};
 const copy={...snapshot,state:{...state,扩展:{...state.扩展,story:{...ledger,active:turn}}}};
 turn.status='resolved';turn.results=[];delete turn.hostProgress;delete turn.continuation;turn.before=storyTurnFacts(copy.state,turn.privatePersonId,turn.input);turn.after=structuredClone(turn.before);
 try{
  const authorTask=turn.privatePersonId?'private-chat':isPartyTurn(turn)?'party-chat':'story-writer';
  gateway.checkTaskSettings(authorTask);
  const writer=turn.privatePersonId?preparePrivateReplyPrompt(copy,input):isPartyTurn(turn)?preparePartyReplyPrompt(copy,input):prepareStoryPrompt(copy,'story-writer',input);
  return preflightStoryWritingCycle(gateway,writer.writingPackage!,writer.compiled.messages,writer.promptStructure,{authorTask});
 }
 catch(error){throw new Error(`正文基础上下文预检未通过，尚未执行本轮行动：${(error as Error).message}`);}
}

function checkedCurrentStoryTurn(snapshot:GameSnapshot,kind:'story-host'|'story-writer'|'story-rewrite',input:Record<string,any>){
 const ledger=storyLedger(snapshot.state),turn=ledger.active;
 if(!turn)throw Error('没有等待处理的叙事回合');
 if(input.branchId!==ledger.branchId||input.turn!==turn.number)throw Error('叙事分支或回合已经变化');
 if(kind!=='story-host'&&pendingStoryPersonWorldWork(snapshot.state).length)throw Error('请先等待这次行动的相关人物回应');
 if(kind!=='story-host'&&pendingCooperationResponses(snapshot.state,true).length)throw Error('请先等待人物回应合作');
 if(kind!=='story-host'&&pendingStoryCustodyMarket(snapshot.state))throw Error('看管交接或现场竞拍尚待人物独立回应');
 if(kind!=='story-host'&&pendingStoryControlledGifts(snapshot.state).length)throw Error('请先等待赠物接收人独立回应');
 if(kind!=='story-host'&&pendingNpcDecisions(snapshot.state).length)throw Error('请先等待人物形成自己的打算');
 if(kind!=='story-host'&&pendingStoryRoom(snapshot.state))throw Error('请先完成当前房间生成，再写下故事');
 if(kind!=='story-host'&&pendingStoryRingNaming(snapshot.state))throw Error('请先完成已保留魂环的来源与候选命名，再写下故事');
 if(kind!=='story-host'&&pendingStoryBeliefs(snapshot.state).length)throw Error('请先等待人物判断听闻');
 if(kind!=='story-host'&&pendingImmediateGifts(snapshot.state).length)throw Error('请先等待对方回应赠礼');
 if(kind!=='story-host'&&pendingStoryCommitments(snapshot.state).length)throw Error('请先等待人物回应约定');
 if(pendingStoryExtraction(snapshot.state))throw Error('请先确认撤离损失，再继续故事');
 if(kind!=='story-host'&&(turn.hostProgress&&['waiting','ready'].includes(turn.hostProgress.status)||turn.continuation))throw Error('请先继续执行已保存的后续行动');
 return {ledger,turn};
}

/** Two independent, revision-bound jobs. Provider waits never mutate the engine. */
export function prepareStoryPrompt(snapshot:GameSnapshot,kind:'story-host'|'story-writer'|'story-rewrite',input:Record<string,any>,worldId:string|null=null,sectionContext?:{writingPackage:StoryWritingPackage;previousSection?:PreviousWritingSection}){
 if(!['story-host','story-writer','story-rewrite'].includes(kind))throw Error('这项正文操作已停用');
 if(input.original!==undefined){
  if(kind!=='story-rewrite')throw Error('旧段正文只允许明确补写或重写');
  const source=checkedArchivedProseOriginal(snapshot.state,input),turn=source.turn,ledger=storyLedger(snapshot.state),history=input.history??[];
  if(!Array.isArray(history)||history.length>12||history.some((entry:any,index:number)=>!Number.isSafeInteger(entry.number)||entry.number<1||entry.number>=turn.number||index>0&&history[index-1].number>=entry.number||typeof entry.input!=='string'||entry.input.length>8000||typeof entry.prose!=='string'||entry.prose.length>MAX_STORY_PROSE_LENGTH||entry.privatePersonId!==undefined))throw Error('旧段写作的近期来源无效');
  const recall=checkedStoryRecall(input.recall,turn.number,undefined,history.map((entry:any)=>entry.number));
  if(sectionContext)assertStoryWritingPackageCurrent(sectionContext.writingPackage,snapshot,worldId!);
  const writingPackage=sectionContext?.writingPackage??createStoryWritingPackage(snapshot,worldId,turn,true);
  return {...prepareStoryAuthorPrompt({turn,writingPackage,kind,config:input.prompts??emptyStoryPromptConfig(),input,history,recall,narrativeSummaries:[],...(sectionContext?.previousSection?{previousSection:sectionContext.previousSection}:{})}),turn,ledger,history,recall};
 }
 const {ledger,turn}=checkedCurrentStoryTurn(snapshot,kind,input);
 if(kind!=='story-host'&&isPartyTurn(turn)){if(kind!=='story-writer')throw Error('已说出的群消息保留原话，请发新消息继续');return {...preparePartyReplyPrompt(snapshot,input,worldId),target:'writer' as const,turn,ledger,history:[],recall:[]};}
 if(kind!=='story-host'&&turn.privatePersonId){if(kind!=='story-writer')throw Error('已发送的私聊保留原话，请发送新消息继续');return preparePrivateReplyPrompt(snapshot,input,worldId);}
 const config:StoryPromptConfig=input.prompts??emptyStoryPromptConfig();
 const target=kind==='story-host'?'host':turn.privatePersonId?'private':'writer';
 const travelOptions=target==='host'&&!turn.privatePersonId?storyTravelOptions(snapshot.state,turn.input):null;
 const supplementaryHost=kind==='story-host'&&turn.status==='resolved'&&turn.hostProgress?.status==='ready';
 if(!supplementaryHost&&turn.status!==((kind==='story-rewrite')?'complete':target==='host'?'planning':'resolved'))throw Error('当前回合不处于这项生成任务的阶段');
 const group=isPartyTurn(turn);
 const history=group?[]:input.history??[];
 if(!Array.isArray(history)||history.length>12)throw Error('本次近期故事数量超出范围');
 let priorNumber=0;
 const recent=history.flatMap((entry:any)=>{
  if(!entry||!Number.isSafeInteger(entry.number)||entry.number<=priorNumber||entry.number>=turn.number||typeof entry.input!=='string'||entry.input.length>8000||typeof entry.prose!=='string'||entry.prose.length>MAX_STORY_PROSE_LENGTH)throw Error('近期故事记录格式不完整');
  if(entry.privatePersonId!==undefined&&(typeof entry.privatePersonId!=='string'||!entry.privatePersonId||entry.privatePersonId.length>160))throw Error('私聊历史对象无效');
  priorNumber=entry.number;if(entry.privatePersonId!==turn.privatePersonId)return [];
  return [{role:'user' as const,turn:entry.number,field:'input',content:entry.input},{role:'assistant' as const,turn:entry.number,field:'prose',content:entry.prose}];
 });
 const recall=checkedStoryRecall(group?[]:input.recall,turn.number,turn.privatePersonId,history.filter((e:any)=>e.privatePersonId===turn.privatePersonId).map((e:any)=>e.number));
 const narrativeSummaries=group?[]:selectStorySummaries(snapshot.state,turn.number,turn.privatePersonId,[...history.map((e:any)=>e.number),...recall.map(r=>r.source.turn)],turn.input);
 const hostPrivateRecall=target==='host'&&!turn.privatePersonId&&!group?checkedHostPrivateRecall(snapshot.state,input.hostPrivateRecall,turn.number):[];
 const hostPrivateMemories=target==='host'&&!turn.privatePersonId&&!group?selectHostPrivateSummaries(snapshot.state,turn.number,turn.input,hostPrivateRecall.map(r=>r.source.turn)):[];
 if(sectionContext){if(!sectionContext.writingPackage.origin.writingSection||sectionContext.writingPackage.origin.battleId!==turn.battleId)throw Error('写作阶段不属于当前战报');assertStoryWritingPackageCurrent(sectionContext.writingPackage,snapshot,worldId!);}
 if(kind!=='story-host')return {...prepareStoryAuthorPrompt({turn,writingPackage:sectionContext?.writingPackage??createStoryWritingPackage(snapshot,worldId,turn),kind,config,input,history,recall,narrativeSummaries,...(sectionContext?.previousSection?{previousSection:sectionContext.previousSection}:{})}),turn,ledger,history,recall};
 const facts=withLightActionState(snapshot.state as object,()=>storyTurnFacts(snapshot.state,turn.privatePersonId,turn.input,(snapshot.state as any).角色.主控单位ID));
 if(facts.player?.actionState)facts.player.actionState.abilityConditionsIndex='已有能力索引；不代表此刻已通过费用、目标或动作检查。点名后由正式预览决定。';
 if(facts.commerce){facts.commerce.interfaces={service:STORY_TRADE_INTERFACES.supply,shops:STORY_TRADE_INTERFACES.stock};facts.commerce.auctions=projectCommerceAuctionReadings(facts.commerce.auctions,turn.input);}
 // Action planning needs final outcomes, not every intermediate proposal event.
 // Full histories remain in state and in person-history; active commitments are untouched.
 if(target==='host')for(const person of facts.people??[]){
  if(!person.recentEndedCommitments?.length)continue;
  person.endedCommitmentLookup={characterId:person.id,category:'commitments',before:-1,kind:'person-history',scope:'ended-outcome-index'};
  person.recentEndedCommitments=person.recentEndedCommitments.map((record:any)=>{
   const {terms,events,...identity}=record,last=events.at(-1),{reason,sourceId,revision,...outcome}=last??{};
   return {...identity,events:last?[outcome]:[],historyEventCount:events.length};
  });
 }
 if(target==='host'&&facts.workshop?.pending?.length){
  for(const pending of facts.workshop.pending){pending.choicesLookup={kind:'inspect-research',pendingId:pending.pendingId,scope:'pending-candidate-index'};pending.candidates=pending.candidates.map(({meaning,...choice}:any)=>choice);}
 }
 if(target==='host'&&facts.workshop?.blueprints?.length){facts.workshop.blueprintDetailAction='inspect-workshop';facts.workshop.blueprints=facts.workshop.blueprints.map(({meaning,...blueprint}:any)=>blueprint);}
 // The ability reader's summary is an exact second copy of its ordered parts.
 // Keep each part, condition and usage cost in the planning packet; the full
 // reader remains unchanged for dossiers, UI and author workflows.
 const compactMeanings=(value:any):void=>{
  if(!value||typeof value!=='object')return;
  if(typeof value.activation==='string'&&value.usage&&Array.isArray(value.parts)&&value.parts.length
    &&value.parts.every((part:any)=>typeof part.statement==='string')
    &&value.summary===value.parts.map((part:any)=>part.statement).join('\n'))delete value.summary;
  for(const child of Object.values(value))compactMeanings(child);
 };
 compactMeanings(facts);
 for(const person of [facts.player,...(facts.people??[])]){
  const action=person?.actionState;
  if(action?.constraints&&JSON.stringify(action.constraints.influence)===JSON.stringify(action.influence)){
   delete action.constraints.influence;action.constraints.influenceFrom='actionState.influence';
  }
 }
 if(Array.isArray(facts.lootTemplates)&&facts.lootTemplates.every((entry:any)=>Object.keys(entry).every(key=>['id','name','stackable'].includes(key))))facts.lootTemplates={columns:['id','name','stackable'],entries:facts.lootTemplates.map((entry:any)=>[entry.id,entry.name,entry.stackable])};
 const creationOptions=facts.personCreationOptions;
 if(creationOptions?.length){
  // Each archetype filters the same immutable preset catalog by its paid soul
  // budget. Send that catalog once, with the exact eligibility rule.
  const presets=new Map<string,any>();
  for(const option of [...creationOptions].sort((a,b)=>(b.presetSouls?.length??0)-(a.presetSouls?.length??0)))for(const entry of option.presetSouls??[])presets.set(entry.id,entry);
  const entries=[...presets.values()];
  if(creationOptions.every((option:any)=>JSON.stringify(option.presetSouls??[])===JSON.stringify(option.full?entries.filter((entry:any)=>entry.value<=option.budget.martialSoul):[]))){
   facts.personCreationPresetSouls={entries,eligibility:{requiresFullArchetype:true,budgetField:'budget.martialSoul'}};
   for(const option of creationOptions)delete option.presetSouls;
  }
  const fields=creationOptions[0].profileFields;
  if(Array.isArray(fields)&&creationOptions.every((option:any)=>JSON.stringify(option.profileFields)===JSON.stringify(fields))){
   facts.personCreationProfileFields=fields;
   for(const option of creationOptions)delete option.profileFields;
   if(creationOptions.every((option:any)=>JSON.stringify(option.budget?.attributes)===JSON.stringify(creationOptions[0].budget?.attributes))){facts.personCreationAttributeBudget=creationOptions[0].budget.attributes;for(const option of creationOptions){delete option.budget.attributes;option.attributeBudgetFrom='personCreationAttributeBudget';}}
  }
  // These aliases read the exact same compiler budgets; retain the values once.
  const aliases={levels:'levels',customSoulBudget:'martialSoul'};
  facts.personCreationFieldSources={};
  for(const [field,budgetField] of Object.entries(aliases)){
   if(!creationOptions.every((option:any)=>Object.hasOwn(option,field)&&Object.hasOwn(option.budget??{},budgetField)&&JSON.stringify(option[field])===JSON.stringify(option.budget[budgetField])))continue;
   facts.personCreationFieldSources[field]='budget.'+budgetField;
   for(const option of creationOptions)delete option[field];
  }
 }
 const privateName=turn.privatePersonId?(snapshot.state as any).人物.列表[turn.privatePersonId]?.name:null;
 const conversation={channel:group?'party':turn.privatePersonId?'private':'public',personId:turn.privatePersonId??null,personName:privateName,communication:facts.communication??null,...(group?{delivery:{firstAction:'tell-party',followingActions:'可继续安排已登记的实际行动；由各行动原生检查地点、权限、费用和本人回应。'}}:{})};
 const remote=!!turn.privatePersonId&&communicationAvailability(snapshot.state,turn.privatePersonId).mode==='soul-device';
 const actions=turn.privatePersonId?STORY_ACTION_SCHEMA.filter(a=>privateStoryActionAllowed(a.kind,remote)):(snapshot.state as any).战斗?.状态==='进行中'?STORY_ACTION_SCHEMA.filter(a=>['battle-action','battle-strategy','battle-report','describe','clarify'].includes(a.kind)):STORY_ACTION_SCHEMA;
 const hostActions=storyHostActions(actions,snapshot.state);
 const inBattle=!turn.privatePersonId&&(snapshot.state as any).战斗?.状态==='进行中';
 const presetOptions=inBattle?{entries:[]}:storyPresetOptions(turn.input);
 if(!turn.privatePersonId&&facts.battle){const state:any=snapshot.state;facts.battle.currentActorId=state.战斗.当前行动单位ID;facts.battle.automatic=state.战斗.扩展?.automation?.enabled===true;facts.battle.actions=rules.combat.listActionIndexPrepared(state,state.角色.主控单位ID);facts.battle.actionIndexPurpose='已有能力及输入参数索引；不是可施放报价。点名动作在本人下个行动时正式预览，执行一次后继续自动。';for(const p of facts.battle.participants)p.position=structuredClone(state.战斗单位.列表[p.id].位置);}
 if(inBattle){
  const keep=new Set(['location','time','calendar','player','people','knownPeople','personReferences','narrativeObjects','battle','party','poisons','inventory','rings','growth','recentBattles','expedition','competition']);
  for(const key of Object.keys(facts))if(!keep.has(key))delete facts[key];
  const participants=new Set(facts.battle?.participants?.map((p:any)=>p.id)??[]);
  for(const key of ['people','knownPeople'])if(Array.isArray(facts[key]))facts[key]=facts[key].filter((p:any)=>participants.has(p.id));
 }
 // Keep all visible people addressable, but do not send every bystander's
 // full ability description on every command. Named people and the private
 // counterpart retain their details; exact IDs, sources and restrictions remain
 // available for everyone, with the ordinary dossier action for further lookup.
 if(!inBattle)for(const person of [facts.player,...(facts.people??[])].filter(Boolean)){
  const focused=person.id===turn.privatePersonId||turn.input.includes(person.name)||(person.abilities??[]).some((ability:any)=>typeof ability.name==='string'&&ability.name&&turn.input.includes(ability.name))||(person.martialSouls??[]).some((soul:any)=>typeof soul.name==='string'&&soul.name&&turn.input.includes(soul.name));
  person.abilityDetailLookup={kind:'inspect-person',characterId:person.id,scope:'owned-abilities-and-martial-souls'};
  if(!focused)for(const key of ['abilities','martialSouls'])if(Array.isArray(person[key]))person[key]=person[key].map(({meaning,...entry}:any)=>entry);
  if(Array.isArray(person.ownedRings)&&person.ownedRings.every((ring:any)=>(person.abilities??[]).some((a:any)=>a.source?.ringId===ring.id&&a.source.soulId===ring.martialSoulId&&a.source.ordinal===ring.ordinal&&a.source.years===ring.years))){
   person.ownedRingIndex={from:'abilities.source',details:person.abilityDetailLookup};delete person.ownedRings;
  }
  if(Array.isArray(person.actionState?.abilityConditions)){
   const indexed=new Map((person.abilities??[]).map((ability:any)=>[ability.id,ability]));
   const otherActions=[];
   for(const condition of person.actionState.abilityConditions){
    const ability:any=indexed.get(condition.id);
    if(!ability){otherActions.push(condition);continue;}
    const {id,name,sourceKind,sourceItemId,sourceMartialSoulId,sourceRingId,...costs}=condition;
    ability.selfConditions=costs;
   }
   person.actionState.abilityConditionsIndex={from:'abilities.selfConditions',otherActions};delete person.actionState.abilityConditions;
  }
  for(const ability of person.abilities??[])if(ability.source){const {label,soulName,originNote,...source}=ability.source;ability.source=Object.fromEntries(Object.entries(source).filter(([,v])=>v!==''));}
  const soulIds=[...new Set((person.abilities??[]).map((ability:any)=>ability.source?.soulId).filter(Boolean))];
  if(soulIds.length===1){person.abilitySoulId=soulIds[0];for(const ability of person.abilities??[])if(ability.source?.soulId===soulIds[0]){delete ability.source.soulId;ability.source.sharedSoul=true;}}


 }
 const supportManufacturing=actions.some(action=>action.kind==='create-support-consumable')?supportManufacturingResources(snapshot.state):null;
 const extras={conversation,...(supportManufacturing?{supportManufacturing}:{}),...(actions.some(action=>action.kind==='stop-maintenance')?{maintenanceOptions:personalMaintenanceOptions(snapshot.state)}:{}),actionOutcomes:STORY_BATTLE_OUTCOMES,...(presetOptions.entries.length?{presetOptions}:{}),...(recent.length?{recentNarrative:recent}:{}),...(hostPrivateRecall.length?{hostPrivateRecall}:{}),...(hostPrivateMemories.length?{hostPrivateMemories}:{}),...(narrativeSummaries.length?{narrativeSummaries}:{}),...(turn.privatePersonId?{privateActionResources:privateStoryActionResources(snapshot.state,turn.privatePersonId)}:{}),...(recall.length?{recalledNarrative:recall}:{}),...(travelOptions?{travelOptions}:{})};
 const hostCatalog=createHostCatalog(hostActions,facts,{...extras,disguiseSources:rules.disguise.options(snapshot.state),contractSources:actions.some(a=>a.kind==='propose-person-contract')?personContractSourceOptions(snapshot.state):[],fieldAbilitySources:actions.some(a=>a.kind==='use-field-ability')?personalFieldSkillOptions(snapshot.state):[]},Boolean(turn.partyChat||inBattle),turn.input);
 const hostInstructionIds=['story-host','summary-guidance',...(hostPrivateMemories.length||hostPrivateRecall.length?['private-memory-guidance']:[]),...(recall.length?['recall-guidance']:[])];
 const compiled=compileStoryPrompt(config,{target,trigger:'normal',user:((snapshot.state as any).人物?.列表?.[(snapshot.state as any).角色?.主控单位ID]?.name??'玩家'),character:privateName??'主持人',slots:{
  main:[promptMessage(hostInstructionIds),{role:'system',content:JSON.stringify(compactStoryPacketReadings(hostCatalog.initial))}],
  chatHistory:[{role:'user',content:storySourceInput(turn)}],
 }});
 if(supplementaryHost){
  const h=turn.hostProgress!;
  compiled.messages.push({role:'system',content:JSON.stringify({kind:'story-host-continuation',requestId:h.requestId,reason:h.reason,answer:h.answer??null,baseStep:h.baseStep,executed:hostContinuationEvidence(turn),remaining:h.plan.segments.slice(h.baseStep),instruction:'已执行步骤保持原样，只返回未执行的segments后缀；source仍须引用本轮原输入或补充原话。所有Step引用使用baseStep开始的全局编号，可引用executed里的正式成果。不得重做前缀、切换会话或再次刷新。若查询后首次缺少玩家选择，只能在末尾clarify交还玩家，本轮直接结束，不再续办；已经回答过追问则不能重复提问。目录补齐额度与本回合初次主持共用。按最新地点、服务与实际结果安排后续；不能把执行失败改成成功。'} )});
 }
 if(recall.length)compiled.notes.push(`检索到 ${recall.length} 段历史原文片段（最多四段）；按词片相关性选择，来源与截取位置见 recalledNarrative，不代表检索已覆盖所有相关经历。`);
 if(hostPrivateMemories.length)compiled.notes.push(`公共主持按本次话题或具名人物取回 ${hostPrivateMemories.length} 份相关私聊摘要（最多四份），来源和类别见 hostPrivateMemories；仅供主持参考，不自动成为其他人物的知识。未整理摘要的私聊不在此次检索范围内。`);
 if(hostPrivateRecall.length)compiled.notes.push(`公共主持取回 ${hostPrivateRecall.length} 段相关私聊原文片段，见 hostPrivateRecall；相同回合不再重复发送私聊摘要，其他人物回应不接收这些片段。`);
 if(compiled.prefill&&target==='host')throw Error('行动裁定使用 JSON 协议，不能套用小说预填充');
 const promptStructure={strict:true as const,...(compiled.prefill?{prefill:{content:compiled.prefill,mode:input.prefillMode}}:{})};
 if(compiled.prefill&&!PREFILL_MODES.includes(input.prefillMode))throw Error('请选择所用模型支持的预填充方式');
 return {compiled,promptStructure,target,turn,ledger,history,recall,writingPackage:null,hostCatalog:hostCatalog.access};
}

/** Reuse actual writing checks without credentials or provider requests. */
function previewWritingValidation(prepared:any,input:Record<string,any>,authorTask:string){
 if(!input.previewProfile||!prepared.writingPackage)return {};
 // The saved profile contains settings only. This gateway cannot send a request.
 const gateway=new ModelGateway({...input.previewProfile,apiKey:''},async()=>{throw Error('消息预览不能请求模型');});
 try{
  preflightStoryWritingCycle(gateway,prepared.writingPackage,prepared.compiled.messages,prepared.promptStructure,{authorTask,cards:prepared.cards});
  return {writingValidation:{status:'passed'}};
 }catch(error){return {writingValidation:{status:'failed',error:(error as Error).message}};}
}
/** A draft host turn exists only in this copy, never in the game session. */
export function previewStoryPrompt(snapshot:GameSnapshot,input:Record<string,any>,worldId:string|null=null){
 if(input.revision!==snapshot.revision)throw Error('预览对应的游戏进度已经变化');
 const copy=structuredClone(snapshot),ledger=storyLedger(copy.state);
 if(!ledger.active||ledger.active.status==='complete'){
  if(typeof input.text!=='string'||!input.text.trim()||input.text.length>8000)throw Error('请先填写本次行动（最多8000字）');
  ledger.active={number:ledger.nextTurn++,input:input.text,status:'planning',results:[],...(input.partyChat?{partyChat:true}:{})};
  if(input.privatePersonId!==undefined){checkPrivatePerson(copy.state,input.privatePersonId);ledger.active.privatePersonId=input.privatePersonId;}
 }
 if(pendingStoryBeliefs(copy.state).length){const prepared=prepareBeliefPrompt(copy,{...input,branchId:ledger.branchId,turn:ledger.active.number});return {revision:snapshot.revision,branchId:ledger.branchId,turn:ledger.active.number,stage:'npc-belief',...prepared.compiled,promptStructure:prepared.promptStructure};}
 if(pendingImmediateGifts(copy.state).length||pendingStoryCommitments(copy.state).length){const prepared=prepareCommitmentPrompt(copy,{...input,branchId:ledger.branchId,turn:ledger.active.number});return {revision:snapshot.revision,branchId:ledger.branchId,turn:ledger.active.number,stage:'npc-response',...prepared.compiled,promptStructure:prepared.promptStructure};}
 const trade=pendingStoryCustodyTrades(copy.state)[0],auction=pendingStoryCustodyAuctions(copy.state)[0];
 if(trade||auction){if(trade?.buyerId===(copy.state as any).角色.主控单位ID)throw Error('这份报价等待你本人接受或拒绝，无需模型代答');const prepared=trade?prepareCustodyTradeResponse(copy,{offerId:trade.id}):prepareCustodyAuctionDecision(copy,auction),stage=trade?'npc-custody-trade':'npc-custody-auction';return {revision:snapshot.revision,branchId:ledger.branchId,turn:ledger.active.number,stage,messages:prepared.messages,notes:[],trace:prepared.messages.map((m,index)=>({index,source:`${stage}-${index?'facts':'instructions'}`,role:m.role,characters:m.content.length})),promptStructure:{strict:true}};}
 if(pendingStoryControlledGifts(copy.state).length){const gift=pendingStoryControlledGifts(copy.state)[0];if(gift.personId===(copy.state as any).角色.主控单位ID)throw Error('这份赠物等待你本人接受或拒绝，无需模型代答');const prepared=prepareGiftResponse(copy,{commitmentId:gift.id});return {revision:snapshot.revision,branchId:ledger.branchId,turn:ledger.active.number,stage:'npc-gift',messages:prepared.messages,notes:[],trace:prepared.messages.map((m,index)=>({index,source:index?'person-gift-facts':'person-gift-instructions',role:m.role,characters:m.content.length})),promptStructure:{strict:true}};}
 if(ledger.active.status==='resolved'&&isPartyTurn(ledger.active)){const prepared=preparePartyReplyPrompt(copy,{...input,branchId:ledger.branchId,turn:ledger.active.number},worldId);return {revision:snapshot.revision,branchId:ledger.branchId,turn:ledger.active.number,stage:'party',...prepared.compiled,promptStructure:prepared.promptStructure,...(prepared.audience.length&&!prepared.message?.proposals?previewWritingValidation(prepared,input,'party-chat'):{})};}
 const kind=ledger.active.status==='planning'?'story-host':'story-writer';
 const prepared=prepareStoryPrompt(copy,kind,{...input,branchId:ledger.branchId,turn:ledger.active.number},worldId);
 return {revision:snapshot.revision,branchId:ledger.branchId,turn:ledger.active.number,stage:prepared.target,...prepared.compiled,promptStructure:prepared.promptStructure,...previewWritingValidation(prepared,input,prepared.target==='private'?'private-chat':'story-writer')};
}

export async function runStoryWorkflow(snapshot:GameSnapshot,worldId:string,kind:'story-host'|'story-writer'|'story-rewrite',input:Record<string,any>,gateway:ModelGateway,secret:string,signal:AbortSignal,diagnostics?:StoryWritingDiagnostics,sectionRecovery?:SectionWritingRecovery,persistCreation=false){
 const active=storyLedger(snapshot.state).active;if(input.original===undefined&&active&&isPartyTurn(active)&&kind!=='story-host'){if(kind!=='story-writer')throw Error('已说出的群消息保留原话，请发新消息继续');return runPartyReplies(snapshot,worldId,input,gateway,secret,signal,diagnostics,sectionRecovery);}
 if(input.original===undefined&&active?.privatePersonId&&kind!=='story-host'){
  checkedCurrentStoryTurn(snapshot,kind,input);
  if(kind!=='story-writer')throw Error('已发送的私聊保留原话，请发送新消息继续');
  return runPrivateReplies(snapshot,worldId,input,gateway,secret,signal,diagnostics,sectionRecovery);
 }
 const preparationStarted=performance.now(),prepared=prepareStoryPrompt(snapshot,kind,input,worldId),preparationMs=performance.now()-preparationStarted;
 const {compiled,promptStructure,target,turn,ledger,history,recall,writingPackage}=prepared;
 const hostCatalog='hostCatalog' in prepared?prepared.hostCatalog:undefined;
 if(writingPackage)diagnostics?.bindPackage(writingPackage,'writingView' in prepared?prepared.writingView:selectStoryWritingView(writingPackage));
 // Queries need only the interpreter. Writing dependencies are checked once the plan requires them.
 const authorTask=turn.privatePersonId?'private-chat':isPartyTurn(turn)?'party-chat':kind==='story-host'?'story-writer':kind;
 for(const task of target==='host'?['story-host']:[authorTask]){
   try{gateway.checkTaskSettings(task);}catch(error){throw new Error(`${task==='story-writer'?'故事正文':'行动主持'}参数预检未通过：${(error as Error).message}`);}
 }
 let sections:StoryWritingPackage[]|undefined;
 const reviewCards=writingPackage?storyInlineCards(turn,writingPackage.facts):[];
 const selectedMarkers=new Set(inlineCardProtocol(reviewCards).items.map(card=>card.marker));
 const selectedCards=reviewCards.filter(card=>selectedMarkers.has(`[[card:${card.id}]]`));
 const prepareSection=(p:StoryWritingPackage,previousSection?:PreviousWritingSection)=>({
  ...prepareStoryPrompt(snapshot,kind,input,worldId,{writingPackage:p,previousSection}),authorTask,
  // Reserve the whole novel's display slots once, then distribute its cards.
  // Per-section selection could exhaust six slots before the actual ending.
  cards:storyWritingSectionCards(p,selectedCards),
 });
 let budget:ReturnType<ModelGateway['checkPrompt']>,writerBaselineBudget:ReturnType<ModelGateway['checkPrompt']>|undefined;
 try{
  if(target!=='host'&&writingPackage?.origin.battleId){
    let capacityFailure:ModelPromptCapacityError|undefined;
    let planned:StoryWritingPackage[];
    try{planned=planStoryBattleWritingSections(writingPackage,p=>{
     try{
      if(!p.origin.writingSection)preflightStoryWritingCycle(gateway,p,compiled.messages,promptStructure,{cards:reviewCards,authorTask});
      else preflightWritingSection(gateway,p,prepareSection,p.origin.writingSection.includesOpening?undefined:previousWritingSectionReserve());
      return true;
     }catch(failure){if(failure instanceof ModelPromptCapacityError){capacityFailure=failure;return false;}throw failure;}
    });}catch(error){if(capacityFailure)throw new ModelPromptCapacityError(`${(error as Error).message}。${capacityFailure.message}`,capacityFailure.budget);throw error;}
    if(planned[0].origin.writingSection){
     sections=planned;budget=preflightWritingSection(gateway,sections[0],prepareSection);
     compiled.notes.push('按作者容量分段写作，完成后合为同一篇战报。');
    }else budget=preflightStoryWritingCycle(gateway,writingPackage,compiled.messages,promptStructure,{cards:reviewCards,authorTask});
  }else budget=writingPackage?preflightStoryWritingCycle(gateway,writingPackage,compiled.messages,promptStructure,{cards:reviewCards,authorTask}):gateway.checkPrompt(compiled.messages,{task:'story-host',promptStructure,json:true});
  writerBaselineBudget=undefined;
 }catch(error){throw new CloudError('story-prompt-preflight',(error as Error).message,400,error);}
 let command:{type:string;payload:Record<string,any>},writingConsistency:Record<string,any>|undefined;
 if(target==='host'){
  const progress=storyCreationProgress([worldId,stateFingerprint(snapshot),turn.number,turn.input,hostCatalog?.version,STORY_PLAN_AUTHORITY_VERSION,'private-scope-1'],persistCreation);
  const sharedProgress=storyCreationProgress([worldId,ledger.branchId,turn.number,turn.input,'host-turn-2'],persistCreation);
  const host=turn.hostProgress?.status==='ready'?turn.hostProgress:undefined,prefix=host?host.plan.segments.slice(0,host.baseStep):[];
  if(host){if(sharedProgress.data.supplementReserved&&sharedProgress.data.supplementReserved!==host.requestId)throw Error('本轮补充安排已用完，请开始新的行动');sharedProgress.data.supplementReserved=host.requestId;sharedProgress.save();}
  const requested=progress.data.requested??await requestStoryPlan(gateway,compiled.messages,storySourceInput(turn),signal,(plan,channel)=>{
   let scope={...turn,...storyHostChannelScope(plan,channel,turn)};
   if(plan.privateTo){if(turn.privatePersonId||scope.partyChat||turn.battleId)throw Error('已有会话不能改投另一人物');const target=resolvePrivateRoute(snapshot.state,plan.privateTo,turn.input);scope={...scope,privatePersonId:target.id};}
   if(host&&(plan.privateTo||channel!==(turn.partyChat?'party':'current')))throw Error('补充安排不能切换会话');
   const remaining={...plan,segments:plan.segments.slice(prefix.length)};
   attestStoryObjectSources(remaining,scope,history,recall);validateStoryAbilitySelections(snapshot.state,remaining);validateStoryGiftReferences(snapshot.state,remaining);validateStoryTradeInterfaces(snapshot.state,remaining);validateStoryLogisticsInterfaces(snapshot.state,remaining);validateStoryCompetitionReferences(snapshot.state,remaining,host?.answer);validateStoryDungeonReferences(snapshot.state,remaining);validateStoryPlanConversation(remaining,scope);validatePrivateStoryPlan(snapshot.state,plan,scope.privatePersonId,prefix.length);return {...plan,segments:[...prefix,...remaining.segments]};
  },hostCatalog,sharedProgress,prefix,(materials,plan)=>assertStoryPlanAuthority(gateway,materials,plan,storySourceInput(turn),signal,gateway.recoveryBudget??new ModelRecoveryBudget(),prefix.length)),plan=requested.plan;
  if(!progress.data.requested){progress.data.requested=structuredClone(requested);progress.save();}
  if(requested.repaired)compiled.notes.push('主持提案未通过行动协议校验，已按同一原话和事实修复一次；旧提案未执行，修复后仍须通过完整校验。');
  const scope={...turn,...storyHostChannelScope(plan,requested.channel,turn)};
  if(plan.privateTo)scope.privatePersonId=resolvePrivateRoute(snapshot.state,plan.privateTo,turn.input).id;
  if(scope.privatePersonId||scope.partyChat)writerBaselineBudget=preflightStoryWriter(snapshot,input,gateway,scope);
  for(const [index,segment] of plan.segments.entries()){
   if(index<prefix.length)continue;
   const action=segment.action;
   if(action.kind==='introduce-person'&&typeof action.martialSoulDescription==='string'&&!(snapshot.state as any).扩展?.storyObjects?.some((r:any)=>r.id===action.objectId&&r.entityId)){
    const key=String(index),budget=rules.world.npcMartialSoulBudget(action.archetypeId);
    if(!progress.data.drafts[key]){const designBudget=rules.world.npcMartialSoulDesignBudget(action.archetypeId);const description=`${action.martialSoulDescription}。人物定位：${JSON.stringify({name:action.name,identity:action.identity,occupation:action.occupation,level:action.level,archetype:rules.world.NPC_ARCHETYPES[action.archetypeId],budget:designBudget})}。按定位设计普通原创武魂，使用当前世界合法来源。`;const draft=(await requestMartialSoulDraft(gateway,description,{budget:designBudget,draftId:`npc-soul:${ledger.branchId}:${turn.number}:${index}`,signal})).draft;rules.npcLoadouts.assertOrdinarySoul(draft);progress.data.drafts[key]=draft;progress.save();}
    rules.martialSoul.finalizeDraft(progress.data.drafts[key],{budget});action.martialSoulDraft=structuredClone(progress.data.drafts[key]);
   }
  }
  validateStoryPlan(plan,storySourceInput(turn));
  command={type:host?'story.supplement':'story.execute',payload:{branchId:ledger.branchId,turn:turn.number,...(host?{requestId:host.requestId}:{}),...(!host&&requested.channel==='party'?{partyChat:true}:{}),plan}};
 }else{
  if(!writingPackage)throw Error('正文缺少绑定事实包');
  let prose:string,reviews:StoryNovelReview[]=[],writingRecovery:ReturnType<ModelRecoveryBudget['snapshot']>|undefined,sectionResults:Awaited<ReturnType<typeof writeBattleSections>>['parts']|undefined;
  if(sections){
   const written=await writeBattleSections({source:writingPackage,cards:reviewCards,sections,turn,prepare:prepareSection,gateway,budget:gateway.recoveryBudget??new ModelRecoveryBudget(),signal,history,diagnostics,recovery:sectionRecovery});
   prose=written.prose;sectionResults=written.parts;writingRecovery=written.recovery;
  }else{
   const written=await writeStoryNovel({source:writingPackage,gateway,messages:compiled.messages,promptStructure,task:authorTask,signal,diagnostics,recovery:sectionRecovery});
   prose=written.prose;reviews=written.reviews;writingRecovery=written.recovery;
  }
  assertStoryWritingPackageCurrent(writingPackage,snapshot,worldId);
  const presentation=storyNovelPresentation(prose,reviewCards);
  writingConsistency={packageId:writingPackage.id,factsHash:writingPackage.factsHash,policy:'author-only',reviews,recovery:writingRecovery,...(sectionResults?{sections:sectionResults}:{})};
  command=input.original!==undefined?{type:'story.rewrite-archived-prose',payload:{branchId:ledger.branchId,turn:ledger.active!.number,original:checkedArchivedProseOriginal(snapshot.state,input),prose,...(presentation?{inlinePresentation:presentation}:{})}}:{type:(kind==='story-rewrite')?'story.rewrite-prose':'story.finish',payload:{branchId:ledger.branchId,turn:turn.number,prose,...(presentation?{inlinePresentation:presentation}:{})}};
 }

 signal.throwIfAborted();
 return {timings:{preparationMs},ticket:issueWorkflowTicket(secret,worldId,snapshot,command),value:{turn:turn.number,branchId:ledger.branchId,stage:target,trace:compiled.trace,notes:compiled.notes,budget,...(writingConsistency?{consistency:writingConsistency}:{}),...(writerBaselineBudget?{writerBaselineBudget}:{} )}};
}

export function prepareCommitmentPrompt(snapshot:GameSnapshot,input:Record<string,any>){
 const ledger=storyLedger(snapshot.state),turn=ledger.active;
 const deferred=typeof input.proposalId==='string';
 if(!deferred&&(!turn||ledger.branchId!==input.branchId||turn.number!==input.turn))throw Error('约定回应的回合或分支已经变化');
 const immediate=deferred?deferredImmediateGifts(snapshot.state).find(r=>r.id===input.proposalId):pendingImmediateGifts(snapshot.state)[0],commitment=immediate??(deferred?deferredStoryCommitments(snapshot.state).find(r=>r.id===input.proposalId):pendingStoryCommitments(snapshot.state)[0]);if(!commitment)throw Error('没有本人当前可自主回应的约定');
 rules.influence.assertVoluntary(snapshot.state,commitment.personId);
 const number=turn?.number??ledger.nextTurn,sourceInput=deferred?'':turn!.input;
 if(deferred){const remote=!rules.actions.communicationColocated(snapshot.state,commitment.personId,commitment.playerId);if(remote&&!soulContact(snapshot.state,commitment.personId))throw Error('双方当前没有可接通的回应通道');rules.social.communicate(snapshot.state,commitment.personId,commitment.playerId,remote);}
 const facts=storyTurnFacts(snapshot.state,commitment.personId,sourceInput,commitment.personId),config:StoryPromptConfig=input.prompts??emptyStoryPromptConfig();
 const context=compileStoryCurrentContext(facts,number,commitment.personId),proposal=immediate?{activity:immediate.kind==='give-item'?'当场赠物':'当场赠款',stage:'赠送待本人回应',participants:{playerId:immediate.playerId,personId:immediate.personId},terms:immediate.kind==='give-item'?{itemId:immediate.itemId,itemName:immediate.itemName,quantity:immediate.quantity}:{gold:immediate.amount},delivery:'接受后立即交付'}:compileCommitment(commitment);
 const recall=personStoryRecall(snapshot.state,commitment.personId,checkedStoryRecall(input.recall,number,commitment.personId));
 const availability=immediate?immediateGiftAvailability(snapshot.state,immediate):invitationAvailability(snapshot.state,commitment);
 if(deferred&&immediate&&!availability.available)throw Error('原赠送目前无法履行，保留待回应：'+availability.reason);
 const narrativeSummaries=selectPersonStorySummaries(snapshot.state,number,commitment.personId,recall.map(r=>r.source.turn),sourceInput);
 const allowedResponses=availability.available?[true,false]:[false];
 const responseSchema=commitment.kind==='hire'?{anyOf:allowedResponses.map(accept=>({type:'object',properties:{accept:{type:'boolean',enum:[accept]},reason:{type:'string',minLength:1,maxLength:600},...(accept?{fee:{type:'integer',minimum:1,maximum:Number.MAX_SAFE_INTEGER}}:{})},required:accept?['accept','reason','fee']:['accept','reason'],additionalProperties:false}))} as const:undefined;
 const audience=!deferred&&turn!.partyChat?{channel:'party',personIds:partyMessageForTurn(turn!)?.audience.filter(a=>a.delivered).map(a=>a.personId)??[]}:{channel:'player',personIds:[facts.player.id]};
 const sourceAgreement=commitment.kind==='loot'?rules.expedition.loot.records(snapshot.state).find((a:any)=>a.id===commitment.allocationId):null;
 const participation=sourceAgreement?.membership.find((m:any)=>m.personId===commitment.personId)??null;
 const compiled=compileStoryPrompt(config,{target:'host',trigger:'normal',user:facts.player.name,character:facts.people[0].name,slots:{
  main:[promptMessage(['story-social','summary-guidance',...(recall.length?['recall-guidance']:[])]),
   {role:'system',content:JSON.stringify({context,worldSpeech:rules.social.speechFacts(snapshot.state,commitment.personId).slice(-8),proposal,availability,allowedResponses,...(commitment.kind==='hire'?{responseShape:{accept:'是否愿意为本次目的地提供付费同行',fee:'接受时给出本人决定的正整数金币报价；拒绝时省略',reason:'本人理由，至多600字'},decisionMeaning:'本人可报价或拒绝。报价仅当日原地点有效，尚待玩家接受和实际支付；此回应不入队、不付款。'}:{}),audience,participation,...(narrativeSummaries.length?{narrativeSummaries}:{}),...(recall.length?{recalledNarrative:recall}:{})})}],chatHistory:[promptMessage('social-instruction','user')],
 }});
 if(recall.length)compiled.notes.push(`本次人物回应取回 ${recall.length} 段同范围私聊原文：输入按实际送达范围选取，正文按现有可感知分类选取，并剔除私密区间；片段保留原位置，可能不连续。`);
 if(narrativeSummaries.length)compiled.notes.push(`本次人物回应取回 ${narrativeSummaries.length} 份双方私聊摘要，保留原文引句；已排除内心条目及已有原文覆盖的回合。`);
 if(compiled.prefill)throw Error('人物回应使用 JSON 协议，不能套用小说预填充');
 return {compiled,commitment,immediate:!!immediate,deferred,allowedResponses,responseSchema,promptStructure:{strict:true as const}};
}

export async function runCommitmentWorkflow(snapshot:GameSnapshot,worldId:string,input:Record<string,any>,gateway:ModelGateway,secret:string,signal:AbortSignal){
 const prepared=prepareCommitmentPrompt(snapshot,input);
 const response=await gateway.structured(prepared.compiled.messages,value=>{const response=validateCommitmentResponse(value,prepared.commitment);if(!prepared.allowedResponses.includes(response.accept))throw Error('当前规则条件不允许接受这项提议');return response;},{task:'story-social',signal,promptStructure:prepared.promptStructure,...(prepared.responseSchema?{responseSchema:prepared.responseSchema}:{})});
 signal.throwIfAborted();
 return {ticket:issueWorkflowTicket(secret,worldId,snapshot,{type:prepared.immediate?'story.respond-immediate-gift':'story.respond-commitment',payload:{...(prepared.deferred?{deferred:true}:{branchId:input.branchId,turn:input.turn}),...(prepared.immediate?{giftId:prepared.commitment.id}:{commitmentId:prepared.commitment.id}),response}}),value:{stage:'npc-response',commitmentId:prepared.commitment.id}};
}

export function prepareBeliefPrompt(snapshot:GameSnapshot,input:Record<string,any>){
 const ledger=storyLedger(snapshot.state),turn=ledger.active,statement=pendingStoryBeliefs(snapshot.state)[0];
 if(!turn||turn.number!==input.turn||ledger.branchId!==input.branchId||!statement)throw Error('没有当前回合待判断的听闻');
 const facts=storyTurnFacts(snapshot.state,statement.listenerId,statement.text,statement.listenerId),recall=personStoryRecall(snapshot.state,statement.listenerId,checkedStoryRecall(input.recall,turn.number,statement.listenerId));
 const narrativeSummaries=selectPersonStorySummaries(snapshot.state,turn.number,statement.listenerId,recall.map(r=>r.source.turn),statement.text);
 const compiled=compileStoryPrompt(input.prompts??emptyStoryPromptConfig(),{target:'host',trigger:'normal',user:facts.player.name,character:facts.people[0].name,slots:{
  main:[promptMessage(['npc-belief','summary-guidance',...(recall.length?['recall-guidance']:[])]),
   {role:'system',content:JSON.stringify({context:compileStoryCurrentContext(facts,turn.number,statement.listenerId),worldSpeech:rules.social.speechFacts(snapshot.state,statement.listenerId).slice(-8),statement,audience:{channel:'player',personIds:[facts.player.id]},...(narrativeSummaries.length?{narrativeSummaries}:{}),...(recall.length?{recalledNarrative:recall}:{})})}],
  chatHistory:[promptMessage('belief-instruction','user')],
 }});
 if(compiled.prefill)throw Error('人物听闻判断使用JSON协议，不能套用小说预填充');
 return {compiled,statement,promptStructure:{strict:true as const}};
}
export async function runBeliefWorkflow(snapshot:GameSnapshot,worldId:string,input:Record<string,any>,gateway:ModelGateway,secret:string,signal:AbortSignal){
 const p=prepareBeliefPrompt(snapshot,input),response=await gateway.structured(p.compiled.messages,validateBeliefResponse,{task:'npc-belief',signal,promptStructure:p.promptStructure});signal.throwIfAborted();
 return {ticket:issueWorkflowTicket(secret,worldId,snapshot,{type:'story.respond-belief',payload:{branchId:input.branchId,turn:input.turn,statementId:p.statement.id,response}}),value:{stage:'npc-response',statementId:p.statement.id}};
}
