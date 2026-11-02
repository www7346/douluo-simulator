import {stockByName} from './story-commerce';
import {settleAutomaticBattle} from './automatic-battle';
import {isSealedValue,mutableSnapshotCopy,sealOwned} from '../shared/frozen-snapshot';
import {initializeBattlePreferences,setBattlePreferences,setAutomaticBattle} from './battle-preferences';
import {respondNpcContract,respondNpcContractOrder} from './person-contract';
import {personInteractions} from './person-interactions';
import {pendingStoryPersonWorldWork} from './person-world-work';
import {projectionRewriteGrant} from '../shared/historical-projection';
import {playerCommandDefaults,playerIntentDefaults} from './player-action-defaults';
import {respondImmediateGift} from './story-immediate-gifts';
import {assertWorldCommandActor} from './world-command-actor';
import {localStoryFinishCommand} from './story-local-continuation';
import {decideNpcRestraintPermission} from './person-restraint-permission';
import {battleActionOptions} from './battle-action-options';
import {respondNpcRescue} from './person-rescue';
import {decideNpcDefeat} from './person-defeat';
import {decideNpcCustodyDisposition} from './person-custody-disposition';
import {storyCustodyMarketIds} from '../shared/story-custody-market';
import {decideNpcCustodyAuction} from './person-custody-auction';
import {personEventAudience} from './person-event-audience';
import {assessNpcSpeech} from './person-speech';
import {resolvePersonChangeReaction,validatePersonChangeReactions} from './person-change-reaction';
import {respondNpcCustodyTrade} from './person-custody-trade';
import {respondNpcGift} from './person-gift';
import {respondNpcPerformanceAgreement} from './person-performance-agreement';
import {respondNpcCooperation} from './person-cooperation';
import {respondNpcLoot} from './person-loot';
import {assertCurrentSnapshot,SNAPSHOT_SCHEMA_VERSION} from '../shared/snapshot-version';
import {escapeCaptivity,validateCaptivity,requestRelease} from './story-captivity';
import {generationTargets,applyGenerationLabels,assertExplicitGenerationSoulSources} from './generation-completion';
import {commandCannotGenerate} from './story-generation-capabilities';
import {rebuildServiceCharacters} from './service-character-rebuild';
import {storyCommerceFacts} from './story-commerce';
import {inspectWorkshop,readResearchChoices} from './story-workshop';
import {namePersonResearch,choosePersonResearch} from './person-research';
import {requestNpcDecision,applyNpcDecision,answerNpcInvitation,validateNpcAutonomy} from './npc-autonomy';
import {ensureStoryNpcMechanics} from './story-npc-mechanics';
import {harvestStoryBeasts} from './story-harvest';
import {requestStoryExtraction} from './story-extraction';
import {readStoryRingChoices} from './story-rings';
import {setBattleStrategy} from './battle-strategy';
import {pendingStoryRoom} from '../shared/story-room';
import { rules } from '../rules';
import {resolveStoryCheck,resolveStoryOpposedCheck} from './story-checks';
import {resolveFreeAction} from './story-free-actions';
import {meetStoryPerson,quoteStoryHire} from './story-people';
import {inspectStoryPerson,rememberStoryPerson} from './story-person-dossier';
import {introduceStoryPerson} from './story-person-creation';
import {instantiateStoryItem} from './story-item-creation';
import {readStoryPersonHistory} from './story-person-history';
import {expireStoryCommitments,hasExpiringStoryCommitments,proposeGoldPromise,proposeItemPromise,respondStoryCommitment,settleStoryPromise,proposeInvitation,attendInvitation,proposeRealmVisit,proposeRelationship,endStoryRelationship,proposeParty,endStoryParty,proposeSoulContact,proposeLoot,proposeLootResolution,collectLoot} from './story-commitments';
import {validateCurrentState} from './current-state';
import {reuseNormalizedStoryWorld,storyRecordCommand} from './story-world-transition';
import {captureBattleView,type BattleTurnView} from './player-presentation';
import {captureBattleStoryBackground} from './story-battle-background';
import {receiptSummary} from './player-text';
import {newStoryLedger,settleStoryCommand,storyFacts,storyTurnFacts} from './story-turns';
import {retainBattleReport,readBattleReport,retainArenaAftermath} from './battle-reports';
import {
  CommandRejectedError,
  type GameCommand,
  type GameEvent,
  type GameSnapshot,
  type TransactionResult,
} from './contracts';

import {inspectStoryGrowth} from './story-growth';
import {resolvePersonRoom,namePersonRing,choosePersonRing} from './person-expedition';

const clone = <T>(value: T): T => structuredClone(value);

function refreshStoryRingPreparation<T extends {state:any}>(result:T,pendingId:string):T {
 const turn=result.state.扩展?.story?.active;
 if(turn?.status==='resolved'&&!turn.privatePersonId&&turn.results.some((r:any)=>r.status==='succeeded'&&['prepare-ring','prepare-ring-item'].includes(r.action.kind)&&r.receipt?.pendingId===pendingId)){
  for(const r of turn.results)if(r.status==='succeeded'&&['prepare-ring','prepare-ring-item'].includes(r.action.kind)&&r.receipt?.pendingId===pendingId)r.receipt.choices=readStoryRingChoices(result.state,pendingId);
  turn.after=storyTurnFacts(result.state,turn.privatePersonId,turn.input);
 }
 return result;
}
export class GameEngine {
  #snapshot!: GameSnapshot;
  #normalized=false;
  #calculationCacheBudget=0;
  #calculationCacheHits=0;
  #generationProbe?:{parent:GameSnapshot;command:string;source:string;probe:GameEngine;base:GameSnapshot;bytes:number;inUse:boolean};

  constructor(seed = 'douluo-web',snapshot?:GameSnapshot) {
    if(snapshot){this.restore(snapshot);return;}
    const state = rules.world.makeInitialState(seed);
    state.扩展.story=newStoryLedger();
    this.#snapshot = {
      schemaVersion: SNAPSHOT_SCHEMA_VERSION,
      rulesetVersion: rules.foundation.VERSION,
      revision: Number(state?.系统?.revision ?? 0),
      savedAt: new Date(0).toISOString(),
      state,
    };
  }

  hasCompletedCommand(id:string):boolean{return ((this.#snapshot.state as any)?.扩展?.webRuntime?.completedCommands??[]).some((row:any)=>row.id===id);}
  get revision():number{return this.#snapshot.revision;}
  /** Executor-only disposable validation cache; never part of a snapshot. */
  get calculationCacheBytes():number{return this.#generationProbe?.bytes??0;}
  get calculationCacheHits():number{return this.#calculationCacheHits;}
  discardCalculationCache():void{this.#generationProbe=undefined;}
  setCalculationCacheBudget(bytes:number):void{
    this.#calculationCacheBudget=Number.isSafeInteger(bytes)&&bytes>0?bytes:0;
    if(this.calculationCacheBytes>this.#calculationCacheBudget)this.discardCalculationCache();
  }

  readSnapshot():GameSnapshot{return sealOwned(this.#snapshot);}

  getSnapshot(): GameSnapshot {
    return mutableSnapshotCopy(this.#snapshot);
  }

  listBattleActions(actorId: string): any[] {
    this.discardCalculationCache();
    return clone(battleActionOptions(this.readSnapshot().state,actorId));
  }

  previewBattleAction(intent: Record<string, unknown>): Record<string, any> {
    this.discardCalculationCache();
    return clone(rules.combat.previewCurrentAction(this.readSnapshot().state,intent,isSealedValue));
  }

  previewWorldIntent(intent: Record<string, unknown>): Record<string, any> {
    this.discardCalculationCache();
    assertWorldCommandActor(this.#snapshot.state,intent);
    try {
      const request=playerIntentDefaults(this.#snapshot.state,intent);
      const preview=request.type==='travel'?rules.world.previewCommittedTravel(this.readSnapshot().state,request):rules.world.previewIntent(this.#snapshot.state,request);
      if(request.type==='safe-point-recover'&&preview.available===false)throw Error(preview.reason);
      return clone(preview);
    }
    catch (error) {
      throw new CommandRejectedError('rule-rejected', String((error as Error)?.message ?? error));
    }
  }

  previewExpeditionRisk(dungeonId: string, difficultyId: string): Record<string, any> {
    this.discardCalculationCache();
    return clone(rules.expedition.previewExpeditionRisk(this.#snapshot.state, dungeonId, difficultyId));
  }

  restore(snapshot: GameSnapshot): void {
    this.discardCalculationCache();
    try{assertCurrentSnapshot(snapshot);}catch(error){throw new CommandRejectedError('snapshot-version',(error as Error).message);}
    const state=validateCurrentState(snapshot.state);
    this.#snapshot = {
      ...Object.fromEntries(Object.entries(snapshot).filter(([key])=>key!=='state').map(([key,value])=>[key,clone(value)])) as Omit<GameSnapshot,'state'>,
      revision: Number(state?.系统?.revision ?? snapshot.revision ?? 0),
      state,
    };
    this.#normalized=true;
  }

  dispatch(command: GameCommand,observe?:(stage:'command.settle'|'command.follow-up'|'command.validation'|'command.receipt'|'command.snapshot')=>void,readOnlyResult=false,takeover?:()=>boolean): TransactionResult {
    const journal=(globalThis as any).SoulCalculationSlices;
    let generationKey:string|undefined;
    if(command.type==='generation.apply'&&this.#calculationCacheBudget&&typeof journal?.yielded==='boolean'&&typeof journal?.run==='function'){
      try{generationKey=JSON.stringify(command);}catch{/* Non-JSON callers retain the original uncached path. */}
    }
    if(!generationKey||this.#generationProbe?.parent!==this.#snapshot||this.#generationProbe.command!==generationKey||this.#generationProbe.inUse)this.discardCalculationCache();
    const phase=(stage:Parameters<NonNullable<typeof observe>>[0])=>{try{observe?.(stage);}catch{/* Observation never changes a transaction. */}};
    if(command.type==='arena.reconcile')command={...command,payload:{...command.payload,receipt:clone((this.#snapshot.state as any)?.战斗?.最近结算单??{})}};
    if (!command.id?.trim()) throw new CommandRejectedError('command-id', '命令缺少幂等编号');
    const beforeJournal = (this.#snapshot.state as any)?.扩展?.webRuntime ?? {};
    const completed: Array<{id: string; revision: number}> = Array.isArray(beforeJournal.completedCommands) ? beforeJournal.completedCommands : [];
    // A replay acknowledges the CURRENT snapshot; caching past snapshots rewinds saves.
    if (completed.some(entry => entry.id === command.id)) return {snapshot:readOnlyResult?this.readSnapshot():this.getSnapshot(),events:[],idempotent:true};
    if (command.expectedRevision !== this.#snapshot.revision) {
      throw new CommandRejectedError('revision-conflict', '游戏状态已变化，请刷新后重试');
    }

    const calculationParent=this.#snapshot;
    // These rule entry points create private drafts before mutating the world.
    // Expiring a story commitment is the one pre-settlement write and must keep its own draft.
    const automaticBattle=command.type==='battle.auto-step'||command.type==='battle.auto-until-player';
    const ruleOwnsDraft=automaticBattle||command.type==='battle.action'||command.type==='world.intent'&&command.payload.type==='travel';
    const recordOnly=storyRecordCommand(command.type);
    const normalizedBase=recordOnly&&this.#normalized?this.readSnapshot().state:null;
    const before=ruleOwnsDraft&&!hasExpiringStoryCommitments(this.#snapshot.state)?this.readSnapshot():this.getSnapshot();
    const withoutGeneration=['story.execute','story.supplement'].includes(command.type)&&commandCannotGenerate(command,before.state);
    let settled: {state: any; receipt?: Record<string, any>; idempotent?: boolean; frames?:BattleTurnView[]};
    try {
      phase('command.settle');
      settled = this.#settle(ruleOwnsDraft||recordOnly?{...command,payload:clone(command.payload)}:command, before.state,generationKey?{parent:calculationParent,state:before.state,command,key:generationKey,journal}:undefined,takeover);
      this.discardCalculationCache();
      phase('command.follow-up');
      rules.people.settleAt(settled.state);
      rules.personRewrite.reconcile(settled.state);
      rules.personChangeKnowledge.observe(settled.state);
      rules.disguise.observeMeetings(settled.state);
      if(!settled.idempotent)rules.personGrowth.observe(before.state,settled.state,command.id,settled.receipt);
      const currentReply=['person.respond-drug-offer','person.respond-ability-use','person.decide-restraint-permission','person.respond-rescue','person.resolve-change-reaction','person.respond-growth','person.name-ring','person.choose-ring'].includes(command.type)&&pendingStoryPersonWorldWork(calculationParent.state).some(work=>({'person-drug-offer':'person.respond-drug-offer','person-ability-use':'person.respond-ability-use','person-restraint-permission':'person.decide-restraint-permission','person-rescue-response':'person.respond-rescue','person-change-reaction':'person.resolve-change-reaction','person-growth':'person.respond-growth','person-ring-naming':'person.name-ring','person-ring-choice':'person.choose-ring'} as Record<string,string>)[work.kind]===command.type&&Object.entries(work.input).every(([key,value])=>command.payload[key]===value));
      if((currentReply||['person.apply-rewrite','person.resolve-rewrite'].includes(command.type))&&settled.state.扩展?.story?.active?.status==='resolved')settled.state.扩展.story.active.after=storyTurnFacts(settled.state,settled.state.扩展.story.active.privatePersonId,settled.state.扩展.story.active.input);
      // Opening a person from the UI registers them without a public narrative appearance.
      if(command.type==='character.meet'&&settled.receipt?.metBefore===false&&settled.state.扩展?.story){
        const ledger=settled.state.扩展.story;ledger.pendingPublicIntroductions=[...new Set([...(ledger.pendingPublicIntroductions??[]),settled.receipt.personId])];
      }
      expireStoryCommitments(settled.state);
      if(settled.state.战斗?.id!==(before.state as any).战斗?.id)initializeBattlePreferences(settled.state);
      validateNpcAutonomy(settled.state);
      validatePersonChangeReactions(settled.state);
      validateCaptivity(settled.state);
      rules.world.progressOpeningSituations(settled.state);
      if (settled.idempotent) return {snapshot:readOnlyResult?this.readSnapshot():this.getSnapshot(),events:[],idempotent:true};
      const storyTurn=settled.state.扩展?.story?.active,previousTurn=(before.state as any).扩展?.story?.active;
      // Finish the source snapshot after mechanical reports are retained, only when this
      // command produced a new resolved view. Later battle actions must not rewrite it.
      const freezeResolvedView=storyTurn?.status==='resolved'&&storyTurn.after&&
        (storyTurn.number!==previousTurn?.number||JSON.stringify(storyTurn.after)!==JSON.stringify(previousTurn?.after));
      retainBattleReport(before.state,settled.state,settled.frames??[],command.id);
      const battleId=settled.state.战斗?.id,report=settled.state.扩展?.battleReports?.[battleId];
      // Capture only at an observed start, before any combat action. A later
      // report request cannot fill a missing opening from the current world.
      if(report&&!(before.state as any).扩展?.battleReports?.[battleId]&&report.completeFromStart
        &&(before.state as any).战斗?.id!==battleId&&!report.actions.length){
        report.storyBackground=captureBattleStoryBackground(storyFacts(settled.state),report,command.id);
      }
      const market=storyCustodyMarketIds(settled.state);
      const lastStoryResult=storyTurn?.results.at(-1),openingBattle=!storyTurn?.battleId&&lastStoryResult?.status==='succeeded'&&['spar-started','person-duel-started','solo-competition-match-started','expedition-combat-entered','expedition-narrative-required'].includes(lastStoryResult.receipt?.type);
      if(freezeResolvedView||storyTurn?.status==='resolved'&&!openingBattle&&!storyTurn.continuation?.battleId&&(market.offers.size||market.auctions.size)){
        const official=settled.state.扩展?.battleReports?.[storyTurn.battleId];
        const bound=official?.status==='已结束'&&official.storyTurn===storyTurn.number?clone(official):storyTurn.after?.battle?.report;
        storyTurn.after={...storyTurnFacts(settled.state,storyTurn.privatePersonId,storyTurn.input),...(bound?{battle:{id:bound.id,status:'已结束',report:bound}}:{})};
      }
      // Arena rollback restores gameplay roots, while the runtime owns the commit clock and journal.
      const revision = Math.max(before.revision + 1, Number(settled.state?.系统?.revision) || 0);
      settled.state.系统.revision = revision;
      settled.state.扩展 ??= {};
      settled.state.扩展.webRuntime = {...clone(beforeJournal),completedCommands:[...completed,...(command.type==='generation.apply'&&!completed.some(row=>row.id===(command.payload.command as GameCommand).id)?[{id:(command.payload.command as GameCommand).id,revision}]:[]),{id:command.id,revision}].slice(-256)};
      rules.personRewrite.reconcile(settled.state);
      phase('command.validation');
      const sharedWorld=normalizedBase&&reuseNormalizedStoryWorld(normalizedBase,settled.state);
      const validation=sharedWorld?rules.world.validateNormalizedStoryWorld(sharedWorld):
        ruleOwnsDraft||recordOnly?rules.world.validateOwnedState(settled.state):rules.world.validateState(settled.state);
      if (!validation.pass) throw new Error(validation.errors.join('；'));
      settled.state = validation.state;
      if(withoutGeneration&&generationTargets(before.state,settled.state).length)throw Error('本次操作产生了尚未完成的人物或能力资料，请重新查看后继续');
    } catch (error) {
      if(!journal?.yielded)this.discardCalculationCache();
      throw new CommandRejectedError('rule-rejected', String((error as Error)?.message ?? error));
    }

    phase('command.receipt');
    const revision = Number(settled.state?.系统?.revision ?? before.revision + 1);
    const receipt = settled.receipt ?? {};
    const audienceIds=personEventAudience(before.state,command);
    const event: GameEvent = {
      id: `${command.id}:event`,
      commandId: command.id,
      revision,
      type: String(receipt.type ?? command.type),
      occurredAt: new Date().toISOString(),
      summary: receiptSummary(command.type,receipt,settled.state),
      payload: clone(receipt),
      sequence:0,...(audienceIds===undefined?{}:{audienceIds}),
      ...(command.type === 'battle.action' && settled.frames?.[0] ? {battleView:{before:settled.frames[0].before,after:settled.frames[0].after}} : {}),
    };
    phase('command.snapshot');
    this.#snapshot = {
      schemaVersion: SNAPSHOT_SCHEMA_VERSION,
      rulesetVersion: rules.foundation.VERSION,
      revision,
      savedAt: event.occurredAt,
      // validateState returned a detached, normalized world. Callers receive a separate snapshot below.
      state: settled.state,
    };
    this.#normalized=true;
    const turnEvents: GameEvent[] = ['battle.auto-until-player','battle.auto-step','story.execute','story.resume','story.supplement'].includes(command.type) ? (settled.frames ?? []).map((frame,index) => ({
      id:`${command.id}:turn:${String(index + 1).padStart(3,'0')}`,commandId:command.id,revision,type:'combat-action',occurredAt:event.occurredAt,
      summary:receiptSummary('battle.action',frame.receipt,settled.state),payload:clone(frame.receipt),
      parentEventId:event.id,sequence:index + 1,battleView:{before:clone(frame.before),after:clone(frame.after)},
    })) : [];
    const result = {snapshot: readOnlyResult?this.readSnapshot():this.getSnapshot(), events: [event,...turnEvents], idempotent: Boolean(settled.idempotent)};
    return result;
  }

  #settle(command: GameCommand, state: any,root?:{parent:GameSnapshot;state:any;command:GameCommand;key:string;journal:any},takeover?:()=>boolean): {state: any; receipt?: Record<string, any>; idempotent?: boolean;frames?:BattleTurnView[]} {
    if(state.终局挑战?.当前?.projection?.scope==='historical-projection'){
      const rewrite=['person.apply-rewrite','person.resolve-rewrite'].includes(command.type)&&projectionRewriteGrant(state,command.payload.grantId);
      if(!rewrite&&!['battle.action','battle.auto-step','battle.auto-until-player','battle.set-strategy','battle.set-automatic','battle.set-preferences','battle.report','arena.reconcile','story.begin-battle-report'].includes(command.type))throw Error('请先完成当前历史投影挑战，再处理现实中的事务');
      if(['battle.report','story.begin-battle-report'].includes(command.type)&&command.payload.battleId!==state.终局挑战.当前.battleId)throw Error('请先完成当前历史投影的战报');
    }
    expireStoryCommitments(state);
    const payload = playerCommandDefaults(state,command.type,command.payload) as any;
    if(command.type.startsWith('research.')||command.type==='blueprint.craft'||command.type==='workshop.inspect-story'){
      assertWorldCommandActor(state,payload);if(payload.request)assertWorldCommandActor(state,payload.request);
      if(payload.pendingId)rules.expedition.assertResearchOwner(state,state.研发?.待处理?.[payload.pendingId],state.角色.主控单位ID);
      if(payload.blueprintId)rules.expedition.assertBlueprintOwner(state,state.研发?.蓝图?.[payload.blueprintId]??rules.deviceLocks.keyBlueprint(state,state.角色.主控单位ID,payload.blueprintId),state.角色.主控单位ID);
    }
    if(command.type.startsWith('ring.')){
      assertWorldCommandActor(state,payload);
      const pending=state.魂环?.待选择?.[String(payload.pendingId??'')];
      if(pending&&pending.playerId!==state.角色.主控单位ID)throw Error('不能直接操作其他人物的魂技候选');
    }
    if(command.type.startsWith('companion.')||['character.quote-hire','character.bargain-hire'].includes(command.type))assertWorldCommandActor(state,payload);
    if(command.type.startsWith('expedition.')){
      assertWorldCommandActor(state,payload);
      if(payload.expeditionId&&payload.expeditionId!==rules.expeditionContext.forActor(state,state.角色.主控单位ID)?.id)throw Error('不能直接操作其他人物的远征');
      if(payload.options){assertWorldCommandActor(state,payload.options);if(payload.options.expeditionId&&payload.options.expeditionId!==state.远征?.当前?.id)throw Error('不能直接操作其他人物的远征');}
    }
    // Enforce personal restrictions for physical actions even when a subsystem bypasses world travel.
    if(/^(encounter\.(create|judge)|battle\.start|world\.intent|companion\.hire|supply\.buy|inventory\.claim-stored|material\.sell|item\.sell|research\.(begin|reroll|choose)|blueprint\.craft|arena\.(spar|endgame|slaughter\.(begin|bout)|competition\.(begin|match))|expedition\.(start|enter|harvest|harvest-many|open-chest|use-camp|condense-ring|absorb-ring|finish-room|extract)|ring\.(condense|self-condense|absorb|item\.prepare|reroll|replace-preset|prepare-choice|prepare-from-beast|confirm-choice)|growth\.allocate(?:-batch)?|character\.(start-spar|fulfill-promise|attend-invitation|answer-npc-plan))$/.test(command.type)){
      const playerId=state.角色.主控单位ID,selfBreak=command.type==='world.intent'&&payload.type==='break-restraint'&&['actorId','entityId'].every(key=>!payload[key]||payload[key]===playerId)&&rules.controls.breakable(state,playerId).some((status:any)=>!payload.statusId||status.id===payload.statusId);
      const containment=rules.sealing.active(state,playerId),insideAction=command.type==='world.intent'&&containment?.status==='confined'&&(selfBreak||payload.type==='await-seal-release'||payload.type==='speak-person'||payload.type==='strike-seal-device'&&payload.itemId===containment.itemId);
      const blocked=rules.world.personalActionBlockReason(state,{allowContained:insideAction,allowSealed:command.type==='world.intent'&&payload.type==='await-seal-release',allowIncapacitated:command.type==='world.intent'&&['captive-daily',].includes(payload.type),allowCaptivity:selfBreak||insideAction||command.type==='world.intent'&&['equip','unequip','use-restorative-item','use-prebattle-pill','use-field-ability','stop-maintenance','dismiss-disguise','inspect-disguise','switch-martial-soul'].includes(payload.type)&&rules.cooperation.preparationAllowed(state,state.角色.主控单位ID,payload)||command.type==='world.intent'&&['dismiss-disguise','inspect-disguise','disclose-identity','issue-field-control','permit-restraint','request-restraint-permission','request-ability-use','respond-ability-use','respond-disguised-drug','respond-restraint-permission-request','revoke-restraint-permission','captive-daily','await-seal-release',...rules.social.INTENTS,...rules.cooperation.INTENTS].includes(payload.type)||command.type==='world.intent'&&(['use-field-ability','consume-food-drink','use-restorative-item'].includes(payload.type)&&rules.world.isSelfFoodUse(state,payload)||payload.type==='consume-food-drink'&&typeof payload.offerId==='string')||command.type==='world.intent'&&payload.type==='detach-restraint'&&state.物品.实例[payload.itemId]?.attachment?.wearerId===state.角色.主控单位ID&&state.物品.实例[payload.itemId]?.durability===0});if(blocked)throw Error(blocked);
    }
    switch (command.type) {
      case 'person.apply-rewrite':case 'person.resolve-rewrite':{
        const actorId=command.type==='person.apply-rewrite'?state.角色.主控单位ID:payload.actorId;
        if(command.type==='person.resolve-rewrite'&&actorId===state.角色.主控单位ID)throw Error('玩家的认知改造应由玩家手动设定');
        const result=rules.personRewrite.apply(state,{...payload,actorId,patchId:payload.patchId??command.id,allowUpload:command.type==='person.apply-rewrite'});
        return {state,receipt:{type:'person-rewritten',personId:result.targetId,grantId:result.grantId,patchId:result.id,summary:`${state.人物.列表[result.targetId].name}的改造设定已经生效`}};
      }
      case 'generation.apply': {
        if(!payload.command||['generation.apply','workflow.apply'].includes(payload.command.type)||payload.command.expectedRevision!==this.#snapshot.revision)throw Error('人物生成来源操作无效');
        // The probe validates and detaches this private transaction draft on restore.
        const source={...this.#snapshot,state:payload.npcDrafts?{...state,扩展:{...state.扩展,npcCreationDrafts:clone(payload.npcDrafts)}}:state};
        let sourceText:string|undefined;
        if(root?.parent===this.#snapshot&&root.state===state&&root.command===command){try{sourceText=JSON.stringify(source);}catch{/* Keep the original validation path. */}}
        let cached=sourceText&&this.#generationProbe;
        if(!cached||cached.source!==sourceText||cached.parent!==this.#snapshot||cached.command!==root?.key||cached.inUse||cached.probe.#snapshot!==cached.base){this.discardCalculationCache();cached=undefined;}
        const probe=cached?cached.probe:new GameEngine('',source);
        if(cached)this.#calculationCacheHits++;
        if(!cached&&sourceText&&root){
          const bytes=new TextEncoder().encode(sourceText).byteLength+new TextEncoder().encode(root.key).byteLength+new TextEncoder().encode(JSON.stringify(probe.#snapshot)).byteLength;
          if(bytes<=this.#calculationCacheBudget)this.#generationProbe=cached={parent:this.#snapshot,command:root.key,source:sourceText,probe,base:probe.#snapshot,bytes,inUse:false};
        }
        if(cached)cached.inUse=true;
        let completed:TransactionResult;
        try{completed=probe.dispatch(payload.command);this.discardCalculationCache();}
        catch(error){if(!root?.journal.yielded||!cached||probe.#snapshot!==cached.base)this.discardCalculationCache();throw error;}
        finally{if(cached)cached.inUse=false;}
        const next:any=completed.snapshot.state;
        delete next.扩展.npcCreationDrafts;
        assertExplicitGenerationSoulSources(state,next,payload.command,completed.events[0]?.payload);
        const retained=new Set<string>(Array.isArray(payload.labels)?payload.labels.map((l:any)=>l?.kind+':'+l?.id):[]);
        applyGenerationLabels(next,generationTargets(state,next,payload.repairIds??[],retained),payload.labels);
        const turn=next.扩展?.story?.active;
        if(turn?.status==='resolved'&&turn.after)turn.after=storyTurnFacts(next,turn.privatePersonId,turn.input);
        return {state:next,receipt:completed.events[0]?.payload??{summary:'人物与能力已创建'}};
      }
      case 'generation.repair-preview': return {state,receipt:{type:'generation-repair-preview',summary:'已检查人物资料与技能名称'}};
      case 'generation.rebuild-service': return rebuildServiceCharacters(state,payload.personIds,command.id);
      case 'character.quick-action':{
        if(Object.keys(payload).some(k=>!['characterId','action'].includes(k))||!['contact','party'].includes(payload.action))throw Error('请选择交换联络或邀请同行');
        const menu=personInteractions(state,{characterId:payload.characterId}),selected=menu.actions.find((a:any)=>a.id===payload.action);
        if(!selected||selected.reason)throw Error(selected?.reason||'这项互动目前不可用');
        if(!menu.registered)state=meetStoryPerson(state,payload.characterId).state;
        const ledger=state.扩展.story,turn=ledger.nextTurn;
        let next=this.#settle({id:command.id+':begin',expectedRevision:command.expectedRevision,type:'story.begin',payload:{branchId:ledger.branchId,turn,input:selected.draft,privatePersonId:menu.personId}},state).state;
        return this.#settle({id:command.id+':proposal',expectedRevision:command.expectedRevision,type:'story.execute',payload:{branchId:ledger.branchId,turn,plan:{segments:[{source:selected.draft,action:payload.action==='contact'?{kind:'exchange-contact',characterId:payload.characterId}:{kind:'invite-party',characterId:payload.characterId,membership:'long-term'}}]}}},next);
      }
      case 'story.continue-locally': {
        const result=this.#settle(localStoryFinishCommand(state,command),state),turn=result.state.扩展?.story?.active;
        if(turn?.battleId){result.state.扩展.battleNarration??={};result.state.扩展.battleNarration[turn.battleId]={kind:'local',turn:turn.number};}
        return result;
      }
      case 'story.rewrite-archived-prose':case 'story.close-private':case 'story.close-party':case 'story.answer':case 'story.cancel-remaining':case 'story.supplement':case 'story.respond-belief':case 'story.fork':case 'story.begin':case 'story.begin-battle-report':case 'story.execute':case 'story.resume':case 'story.resolve-extraction':case 'story.finish':case 'story.rewrite-prose':case 'story.record-summary':case 'story.record-stage-summary':
        return settleStoryCommand(state,command,(next,action)=>this.#settle(action,next));
      case 'battle.report':return {state,receipt:{type:'battle-report',report:readBattleReport(state,payload.battleId),summary:'已读取真实战斗记录'}};
      case 'opening.situation':return rules.world.settleOpeningSituation(state,payload,command.id);
      case 'opening.inspect-story':return {state,receipt:{type:'opening-inspected',situations:rules.world.openingSituationFacts(state),summary:'已查看全部开局事项，尚未办理或领取收益'}};
      case 'opening.guidance':return rules.world.settleOpeningGuidance(state,payload,command.id);
      case 'player.create':
        if(payload.situations?.length)throw Error('开局处境暂时停用，请移除原处境选择后继续');
        if((payload.situations??[]).some((v:any)=>Object.values(rules.arena.CHARACTER_CATALOG).some((p:any)=>[p.name,p.name.split('·')[0]].includes(v.contactName??rules.talents.SITUATIONS[v.id]?.contact))))throw Error('处境联系人与已有原著人物重名');
        return rules.world.createPlayer(state, payload, command.id);
      case 'martial-soul.draft-start':
        return rules.cycle.startMartialSoulDraft(state, payload, command.id);
      case 'martial-soul.draft-update':
        return rules.cycle.updateMartialSoulDraft(state, payload, command.id);
      case 'martial-soul.draft-confirm':
        return rules.cycle.confirmMartialSoulDraft(state, payload, command.id);
      case 'encounter.create':
        assertWorldCommandActor(state,payload);
        return rules.cycle.createEncounter(state, payload, command.id);
      case 'encounter.judge':
        assertWorldCommandActor(state,payload);
        return rules.cycle.judgeHuntScene(state, {...payload,actorId:state.角色.主控单位ID}, command.id);
      case 'battle.start':
        assertWorldCommandActor(state,payload);
        return rules.cycle.startHuntBattle(state, {...payload,actorId:state.角色.主控单位ID}, command.id);
      case 'battle.action': {
        const settle=state===this.#snapshot.state?rules.cycle.settleCommittedCombatAction:rules.cycle.settleCombatAction;
        const result=settle(state,{...payload,id:command.id});
        return {...result,frames:[{before:captureBattleView(state),after:captureBattleView(result.state),receipt:result.receipt}]};
      }
      case 'battle.set-strategy':return setBattleStrategy(state,payload);
      case 'battle.set-preferences':return setBattlePreferences(state,payload);
      case 'battle.set-automatic':return setAutomaticBattle(state,payload.enabled);
      case 'battle.auto-step':
      case 'battle.auto-until-player':
        return settleAutomaticBattle(state,state===this.#snapshot.state,command.type,payload,takeover);
      case 'ring.inspect-story-source':
        return {state,receipt:{type:'ring-source-inspected',quote:rules.expedition.previewRingChoice(state,payload),summary:'已查看实际吸收条件，尚未凝聚或吸收魂环'}};
      case 'ring.inspect-story-item':
        return {state,receipt:{type:'ring-item-inspected',quote:rules.cycle.previewRingItem(state,payload),summary:'已查看这枚随身魂环的实际吸收条件，尚未消耗或吸收'}};
      case 'ring.inspect-story-choices':
        return {state,receipt:{type:'ring-choices-inspected',choices:readStoryRingChoices(state,String(payload.pendingId)),summary:'已查看保留的魂技方案，尚未选择或吸收'}};
      case 'ring.condense':
        return rules.cycle.condenseRing(state, payload, command.id);
      case 'ring.self-condense':
        return rules.world.condenseSelfRing(state,payload,command.id);
      case 'ring.absorb':
        return rules.cycle.absorbRing(state, payload, command.id);
      case 'ring.item.name-source':
        {const result=rules.cycle.nameRingItem(state,payload,command.id);return refreshStoryRingPreparation(result,result.state.物品.实例[payload.itemId]?.payload?.ringPreparation?.pendingId);}
      case 'ring.item.prepare':
        return rules.cycle.prepareRingItem(state,payload,command.id);
      case 'ring.replace-preset':
        return rules.cycle.replacePresetRingSkillChoice(state,payload,command.id);
      case 'ring.reroll':
        return rules.cycle.rerollRingSkillChoice(state,payload,command.id);
      case 'ring.prepare-choice':
        return rules.cycle.prepareRingSkillChoice(state, payload, command.id);
      case 'ring.prepare-from-beast':
        return rules.expedition.prepareRingChoice(state,payload,command.id);
      case 'ring.name-choices':
        return refreshStoryRingPreparation(rules.cycle.nameRingSkillChoices(state, payload, command.id),payload.pendingId);
      case 'ring.confirm-choice': {
        const pending=state.魂环?.待选择?.[String(payload.pendingId)];
        if(pending?.status==='pending'&&pending.sourceSettlement?.kind!=='ring-item'){
          const quote=rules.expedition.previewRingChoice(state,{lootId:pending.sourceLootId,martialSoulId:pending.martialSoulId});
          if(!quote.pass)throw Error(quote.reasons.join('；'));
        }
        return rules.cycle.confirmRingSkillChoice(state, payload, command.id);
      }
      case 'growth.inspect-story':
        return {state,receipt:{type:'growth-inspected',growth:inspectStoryGrowth(state),summary:'已查看等级经验、成长瓶颈、修炼与魂环资格及属性提升代价，尚未执行成长'}};
      case 'growth.allocate':
        return rules.cycle.allocateGrowthAttribute(state, payload, command.id);
      case 'growth.allocate-batch':
        return rules.cycle.allocateGrowthAttributes(state, payload, command.id);
      case 'title.register':
        return rules.cycle.registerTitleCandidate(state, payload, command.id);
      case 'title.confirm':
        return rules.cycle.confirmTitle(state, payload, command.id);
      case 'party.recover':return rules.world.recoverParty(state,payload,command.id);
      case 'world.intent':
        assertWorldCommandActor(state,payload);
        if(payload.type==='travel'&&state===this.#snapshot.state)return rules.world.settleCommittedTravel(state,{...payload,id:command.id});
        return rules.world.settleIntent(state, {...payload, id: command.id});
      case 'world.resolve-battle': {
        const encounter = state?.遭遇?.列表?.[state?.遭遇?.当前遭遇ID];
        if (!encounter || encounter.状态 !== '已结束' || state?.战斗?.状态 !== '已结束') {
          throw new Error('当前没有可结算的野外战斗');
        }
        const defeatedUnitIds = (encounter.战斗单位ID列表 ?? []).filter((id: string) =>
          state?.战斗单位?.列表?.[id]?.存活状态 === '死亡' && !state?.战斗单位?.列表?.[id]?.扩展?.remainsId,
        );
        if (!defeatedUnitIds.length) throw new Error('本次野外战斗已经结算');
        const reconciled = rules.world.reconcileAftermath(state, state?.战斗?.最近结算单 ?? {});
        const granted = rules.cycle.grantCombatExperience(reconciled.state, {defeatedUnitIds}, command.id);
        return {
          state: granted.state,
          receipt: {
            type: 'world-battle-resolved',
            encounterId: encounter.id,
            defeatedUnitIds,
            remainsIds: reconciled.createdRemainsIds,
            experience: granted.receipt,
            summary: `野外战果已结算，获得${granted.receipt.experienceGained}点经验，发现${reconciled.createdRemainsIds.length}处遗骸`,
          },
        };
      }
      case 'expedition.start':
        return rules.expedition.startExpedition(state, payload, command.id);
      case 'companion.prepare-roster': return rules.expedition.prepareCompanionRoster(state,payload,command.id);
      case 'companion.hire': return rules.expedition.hireCompanion(state,payload,command.id);
      case 'character.bargain-hire': {
        const met=meetStoryPerson(state,payload.characterId);
        return rules.expedition.negotiateCompanion(met.state,payload,command.id);
      }
      case 'character.meet': return meetStoryPerson(state,payload.characterId);
      case 'character.request-growth':return rules.personGrowth.request(state,payload,command.id);
      case 'person.respond-growth':return rules.personGrowth.respond(state,payload,command.id);
      case 'person.allocate-growth':return rules.personGrowth.allocate(state,payload,command.id);
      case 'conversation.create':return rules.conversations.create(state,payload,command.id);
      case 'conversation.send':return rules.conversations.send(state,payload,command.id);
      case 'person.resolve-conversation':return rules.conversations.resolve(state,payload,command.id);
      case 'character.introduce': return introduceStoryPerson(state,payload,command.id);
      case 'story.instantiate-item': return instantiateStoryItem(state,payload,command.id);
      case 'story.attribute-check':return resolveStoryCheck(state,payload,command.id);
      case 'story.consider-npc-goal':return requestNpcDecision(state,payload.characterId,command.id);
      case 'character.answer-npc-plan':return answerNpcInvitation(state,payload,command.id);
      case 'person.assess-speech':return assessNpcSpeech(state,payload,command.id);
      case 'person.resolve-change-reaction':{const result=resolvePersonChangeReaction(state,payload,command.id);const actual=result.receipt.settlement;return actual?.type==='combat-action'?{...result,frames:[{before:captureBattleView(state),after:captureBattleView(result.state),receipt:actual}]}:result;}
      case 'person.decide-defeat':return decideNpcDefeat(state,payload,command.id);
      case 'person.decide-restraint-permission':return decideNpcRestraintPermission(state,payload,command.id);
      case 'person.respond-drug-offer':{
        const d=payload.decision as any,r=rules.poison.table(state).offers.find((r:any)=>r.id===payload.offerId);if(!r||r.targetId===state.角色.主控单位ID||!d||Object.keys(d).some(k=>!['decision','swallow'].includes(k))||!['accept','refuse','inspect'].includes(d.decision)||typeof d.swallow!=='boolean'||d.decision!=='accept'&&d.swallow||d.swallow&&!rules.poison.canConsumeOffer(state,r))throw Error('本人药物回应来源无效');
        const battle=rules.actions.battleOf(state,r.targetId);if(battle){if(battle.id!==state.战斗.id||battle.当前行动单位ID!==r.targetId)throw Error('药物回应须在本人实际战斗回合进行');return rules.cycle.settleCombatAction(state,{id:command.id,actorId:r.targetId,type:'药剂施用',operation:'respond-disguised-drug',offerId:r.id,decision:d.decision,swallow:d.swallow});}
        const response=rules.world.settleIntent(state,{id:command.id+':response',type:'respond-disguised-drug',actorId:r.targetId,offerId:r.id,decision:d.decision});if(!d.swallow)return response;
        const used=rules.world.settleIntent(response.state,{id:command.id+':ingestion',type:'consume-food-drink',actorId:r.targetId,offerId:r.id});return {...used,receipt:{...used.receipt,decision:d.decision,offerId:r.id}};
      }
      case 'person.respond-ability-use':{
        const d=payload.decision as any,r=rules.world.abilityUseTable(state).requests.find((r:any)=>r.id===payload.permissionId);
        if(!r||r.targetId===state.角色.主控单位ID||!d||Object.keys(d).some(k=>!['accept','reason'].includes(k)))throw Error('本人施用回应来源无效');
        return rules.world.settleIntent(state,{id:command.id,type:'respond-ability-use',actorId:r.targetId,permissionId:r.id,accept:d.accept,reason:d.reason});
      }
      case 'person.respond-rescue':return respondNpcRescue(state,payload,command.id);
      case 'person.decide-custody-disposition':return decideNpcCustodyDisposition(state,payload,command.id);
      case 'person.decide-custody-auction':
      case 'person.respond-custody-trade':
      case 'character.respond-custody-trade':{
        const d=payload.decision as any;if(command.type==='character.respond-custody-trade'&&(!d||Object.keys(d).some(k=>!['accept','reason'].includes(k))))throw Error('交接回应字段无效');
        const result=command.type==='person.decide-custody-auction'?decideNpcCustodyAuction(state,payload,command.id):command.type==='person.respond-custody-trade'?respondNpcCustodyTrade(state,payload,command.id):rules.world.settleIntent(state,{id:command.id,type:'respond-custody-transfer',actorId:state.角色.主控单位ID,offerId:payload.offerId,accept:d.accept,reason:d.reason});
        return result;
      }
      case 'person.respond-gift':
      case 'character.respond-gift':{
        const d=payload.decision as any;if(!d||Object.keys(d).some(k=>!['accept','reason'].includes(k)))throw Error('赠物回应字段无效');
        const result=command.type==='person.respond-gift'?respondNpcGift(state,payload,command.id):rules.world.settleIntent(state,{id:command.id,type:'respond-controlled-gift',actorId:state.角色.主控单位ID,commitmentId:payload.commitmentId,accept:d.accept,reason:d.reason});
        const turn=result.state.扩展?.story?.active;
        if(turn?.status==='resolved'&&turn.results.some((r:any)=>r.receipt?.type==='field-control-order'&&r.receipt.settlement?.commitmentId===payload.commitmentId))turn.after=storyTurnFacts(result.state,turn.privatePersonId,turn.input);
        return result;
      }
      case 'character.assess-speech':return rules.world.settleIntent(state,{id:command.id,type:'assess-person-speech',actorId:state.角色.主控单位ID,statementId:payload.statementId,decision:payload.decision});
      case 'person.respond-performance-agreement':{const result=respondNpcPerformanceAgreement(state,payload,command.id);if(result.state.扩展?.story?.active?.status==='resolved')result.state.扩展.story.active.after=storyTurnFacts(result.state,result.state.扩展.story.active.privatePersonId);return result;}
      case 'person.respond-contract':case 'person.respond-contract-order':{const result=command.type==='person.respond-contract'?respondNpcContract(state,payload,command.id):respondNpcContractOrder(state,payload,command.id);if(result.state.扩展?.story?.active?.status==='resolved')result.state.扩展.story.active.after=storyTurnFacts(result.state,result.state.扩展.story.active.privatePersonId,result.state.扩展.story.active.input);const actual=(result.receipt as any).settlement;return actual?.type==='combat-action'?{...result,frames:[{before:captureBattleView(state),after:captureBattleView(result.state),receipt:actual}]}:result;}
      case 'person.respond-cooperation':{const result=respondNpcCooperation(state,payload,command.id);if(result.state.扩展?.story?.active?.status==='resolved')result.state.扩展.story.active.after=storyTurnFacts(result.state,result.state.扩展.story.active.privatePersonId);return result;}
      case 'story.resolve-npc-goal':{const result=applyNpcDecision(state,payload,command.id);if(!payload.deferred)result.state.扩展.story.active.after=storyTurnFacts(result.state,result.state.扩展.story.active.privatePersonId);return result;}
      case 'story.free-action':return resolveFreeAction(state,payload,command.id);
      case 'story.opposed-check':return resolveStoryOpposedCheck(ensureStoryNpcMechanics(state,payload.characterId,command.id),payload,command.id);
      case 'character.start-spar':{
        const met=meetStoryPerson(state,payload.characterId),personId=met.receipt.personId;
        met.state=ensureStoryNpcMechanics(met.state,personId,command.id);
        const characterId=met.state.战斗单位.列表[personId]?.扩展?.角色库ID??personId;
        if(!met.state.战斗单位.列表[personId])throw Error('这位人物没有可用的切磋档案');
        return rules.arena.startSpar(met.state,characterId,command.id);
      }
      case 'character.history': return {state,receipt:readStoryPersonHistory(state,payload)};
      case 'character.inspect': return {state,receipt:inspectStoryPerson(state,payload)};
      case 'character.promise-gold':return proposeGoldPromise(state,payload,command.id);
      case 'character.promise-item':return proposeItemPromise(state,payload,command.id);
      case 'character.invite':return proposeInvitation(state,payload,command.id);
      case 'character.exchange-contact':return proposeSoulContact(state,payload,command.id);
      case 'character.propose-loot-resolution':return proposeLootResolution(state,payload,command.id);
      case 'expedition.propose-loot':return rules.expedition.proposeLootAgreement(state,payload,command.id);
      case 'expedition.propose-loot-resolution':return rules.expedition.proposeLootResolution(state,payload,command.id);
      case 'expedition.respond-loot':return rules.expedition.respondLoot(state,{...payload,actorId:state.角色.主控单位ID},command.id);
      case 'person.respond-loot':{const result=respondNpcLoot(state,payload,command.id);if(result.state.扩展?.story?.active?.status==='resolved')result.state.扩展.story.active.after=storyTurnFacts(result.state,result.state.扩展.story.active.privatePersonId);return result;}
      case 'expedition.collect-loot':return rules.expedition.collectLoot(state,{...payload,actorId:state.角色.主控单位ID},command.id);
      case 'expedition.collect-returned-loot':return rules.expedition.collectReturnedLoot(state,payload,command.id);
      case 'expedition.distribute-loot':return rules.expedition.distributeLoot(state,{...payload,actorId:state.角色.主控单位ID},command.id);
      case 'character.propose-loot':return proposeLoot(state,payload,command.id);
      case 'character.invite-party':return proposeParty(state,payload,command.id);
      case 'character.end-party':{const result=endStoryParty(state,payload,command.id);if(result.state.扩展?.story?.active?.status==='resolved')result.state.扩展.story.active.after=storyTurnFacts(result.state,result.state.扩展.story.active.privatePersonId);return result;}
      case 'companion.guide-choice':return rules.expedition.chooseFreeGuide(state,payload,command.id);
      case 'character.invite-realm-guest':return proposeRealmVisit(state,payload,command.id);
      case 'character.propose-relationship':return proposeRelationship(state,payload,command.id);
      case 'character.end-relationship':return endStoryRelationship(state,payload,command.id);
      case 'character.attend-invitation':return attendInvitation(state,payload,command.id);
      case 'world.city-history':return {state,receipt:rules.world.cityHistory(state,payload)};
      case 'character.respond-npc-request':return rules.world.respondNpcRequest(state,payload,command.id);
      case 'character.ask-release':return requestRelease(state,payload,command.id);
      case 'world.escape-captivity':return escapeCaptivity(state,payload,command.id);
      case 'world.cultivate':return rules.world.cultivate(state,payload,command.id);
      case 'world.wait-until':return rules.world.waitUntil(state,payload,command.id);
      case 'world.resume-long-action':assertWorldCommandActor(state,payload);return rules.world.resumeLongAction(state,payload,command.id);
      case 'world.abandon-long-action':assertWorldCommandActor(state,payload);return rules.world.abandonLongAction(state,payload,command.id);
      case 'character.fulfill-promise':return settleStoryPromise(state,payload,command.id);
      case 'character.cancel-promise':return settleStoryPromise(state,payload,command.id,true);
      case 'story.respond-immediate-gift':{const result=respondImmediateGift(state,payload,command.id);if(!payload.deferred)result.state.扩展.story.active.after=storyTurnFacts(result.state,result.state.扩展.story.active.privatePersonId);return result;}
      case 'story.respond-commitment':{
        const result=respondStoryCommitment(state,payload,command.id);
        if(!payload.deferred)result.state.扩展.story.active.after=storyTurnFacts(result.state,result.state.扩展.story.active.privatePersonId);
        return result;
      }
      case 'character.quote-hire': return quoteStoryHire(state,payload.characterId,payload.dungeonId,command.id);
      case 'companion.dismiss': return rules.expedition.dismissCompanion(state,payload,command.id);
      case 'expedition.enter':
        return rules.expedition.enterRoom(state, payload.nodeId, command.id, payload);
      case 'person.resolve-room':return resolvePersonRoom(state,payload,command.id);
      case 'person.name-research':return namePersonResearch(state,payload,command.id);
      case 'person.choose-research':return choosePersonResearch(state,payload,command.id);
      case 'person.name-ring':return namePersonRing(state,payload,command.id);
      case 'person.choose-ring':return choosePersonRing(state,payload,command.id);
      case 'expedition.resolve-narrative': {
        const linked=pendingStoryRoom(state),nodeId=state.远征?.当前?.currentRoom?.nodeId;
        const result=rules.expedition.resolveRoomNarrative(state,payload.narrative,command.id);
        if(linked&&!result.idempotent){
          const turn=result.state.扩展.story.active;
          const step=turn.results.find((r:any)=>r.status==='succeeded'&&r.action.kind==='enter-room'&&r.receipt?.type==='expedition-narrative-required'&&r.receipt.nodeId===nodeId);
          step.receipt={...structuredClone(result.receipt),...(result.state.战斗?.状态==='进行中'?{battleId:result.state.远征.当前.currentRoom.battleId}:{}),arrival:step.receipt};
          if(result.state.战斗?.状态==='进行中')initializeBattlePreferences(result.state);
          if(turn.continuation&&result.state.战斗?.状态==='进行中')turn.continuation.battleId=result.state.战斗.id;
          turn.after=storyFacts(result.state);
        }
        return result;
      }
      case 'expedition.resolve-battle':
        return rules.expedition.resolveCurrentBattle(state, command.id);
      case 'expedition.request-story-extract':
        return requestStoryExtraction(state,command.id);
      case 'expedition.harvest-many':
        return harvestStoryBeasts(state,payload.beastUnitIds,command.id);
      case 'expedition.harvest':
        return rules.expedition.harvestBeast(state, payload.beastUnitId, payload.options ?? {}, command.id);
      case 'expedition.open-chest':
        return rules.expedition.openChest(state, command.id);
      case 'expedition.use-camp':
        return rules.expedition.useCampfire(state, command.id);
      case 'expedition.condense-ring':
        return rules.expedition.condenseCurrentRing(state, payload.beastUnitId, command.id,payload);
      case 'expedition.absorb-ring':
        return rules.expedition.absorbCurrentRing(state, payload, command.id);
      case 'expedition.finish-room':
        return rules.expedition.finishRoom(state, command.id, payload);
      case 'expedition.extract':
        return rules.expedition.extractSafely(state, command.id, payload);
      case 'expedition.withdraw-personally':
        return rules.expedition.withdrawPersonally(state,payload,command.id);
      case 'supply.buy':
        assertWorldCommandActor(state,payload);
        return rules.expedition.buySupply(state, payload.templateId, payload.quantity ?? 1, command.id,payload);
      case 'inventory.claim-stored':
        return rules.expedition.claimStoredItem(state, payload.itemId, command.id);
      case 'material.sell':
        return rules.expedition.sellMaterial(state, payload.fingerprint, payload.quantity ?? 1, command.id, payload);
      case 'item.sell':
        return rules.expedition.sellItem(state, payload.itemId, payload.quantity ?? 1, command.id);
      case 'research.begin':
        return rules.expedition.beginResearch(state, payload, command.id);
      case 'research.reroll':
        return rules.expedition.rerollResearchCandidate(state,payload,command.id);
      case 'research.resolve':
        {const result=rules.expedition.resolveResearch(state, payload.pendingId, payload.candidates, command.id),turn=result.state.扩展?.story?.active;
         if(turn?.status==='resolved'&&turn.results.some((r:any)=>r.status==='succeeded'&&r.action.kind==='begin-research'&&r.receipt?.pendingId===payload.pendingId)){
          for(const r of turn.results)if(r.action.kind==='begin-research'&&r.receipt?.pendingId===payload.pendingId)r.receipt.choices=readResearchChoices(result.state,payload.pendingId);
          turn.after=storyTurnFacts(result.state,turn.privatePersonId,turn.input);
         }return result;}
      case 'commerce.inspect-story':if(payload.itemName!==undefined){if(Object.keys(payload).some(k=>k!=='itemName'))throw Error('请单独查询商品名称');return {state,receipt:stockByName(state,payload.itemName)};}if(Object.keys(payload).some(key=>key!=='auctionId'))throw Error('拍品查看参数无效');return {state,receipt:{type:'commerce-inspected',data:storyCommerceFacts(state,payload.auctionId),summary:'已查看当前实际货架、排期与本人商业记录。'}};
      case 'workshop.inspect-story':return inspectWorkshop(state,payload);
      case 'research.naming-status':
        return rules.expedition.recordResearchNaming(state,payload,command.id);
      case 'research.choose':
        return rules.expedition.chooseResearchCandidate(state, payload.pendingId, payload.candidateIndex, command.id);
      case 'blueprint.craft':
        return rules.expedition.craftBlueprint(state, payload.blueprintId, payload.request ?? {}, command.id);
      case 'arena.spar':
        return rules.arena.startSpar(ensureStoryNpcMechanics(state,payload.characterId,command.id), payload.characterId, command.id);
      case 'arena.endgame':
        return rules.arena.startEndgameChallenge(state, payload.characterId, command.id);
      case 'arena.slaughter.begin':
        return rules.arena.beginSlaughterRun(state, payload, command.id);
      case 'arena.slaughter.bout':
        return rules.arena.startSlaughterBout(state, command.id);
      case 'arena.competition.begin':
        return rules.arena.beginSoloCompetition(state, payload, command.id);
      case 'arena.competition.withdraw':return rules.arena.withdrawCompetition(state,command.id);
      case 'arena.competition.match': {
        const result=rules.arena.startCompetitionMatch(state, command.id);
        const match=result.state.比赛.当前.match;
        if(match?.opponentId)rememberStoryPerson(result.state,match.opponentId);
        return result;
      }
      case 'arena.reconcile': {
        const result=rules.arena.reconcileAftermath(state, payload.receipt ?? {});
        // Narrative projections retain their own stable records after local arena recovery.
        result.state.扩展??={};
        retainArenaAftermath(result.state,state.战斗?.id,result.receipt);
        return result;
      }
      default:
        throw new Error(`未知游戏命令：${command.type}`);
    }
  }
}
