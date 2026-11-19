import {avatarRecordToAttachment,type ExportSource} from '../runtime/save-export';
import {prepareWorldExport} from './save-export-client';
import {mergeDesignDiscussionEdit} from '../shared/design-discussion-edit';
import {BattleProgression} from './battle-progression';
import {isWorld,readStartupWorld} from './startup-world';
import {readBattlePreferences,effectiveBattlePreferences,battleNeedsWriter,hasBattleStoryFollowup,type BattlePreferences} from '../shared/battle-preferences';
import {storySourceInput} from '../shared/story-source-input';
import {makeStorySummaryOriginal} from '../shared/story-summary-original';
import {validatePrivateStoryRoute} from '../shared/story-private-route';
import {checkedRingDiscussion,ringDiscussionKey,ringDiscussionIdentity,ringActiveDiscussionKey,ringAdviceTarget,ringDiscussionContext,retainRingAnswer,finishRingAnswer,type RingDesignDiscussion} from '../shared/ring-design-discussion';
import {checkedResearchDiscussion,researchDiscussionKey,researchActiveDiscussionKey,retainResearchAnswer,finishResearchAnswer,type ResearchDesignDiscussion} from '../shared/research-design-discussion';
import {publishInteraction} from './ui-interaction-timing';
import type {StoryResponses} from '../shared/story-responses';
import {isCurrentSnapshot} from '../shared/snapshot-version';
import {workflowAttemptSource,supportsWorkflowAttempt,type WorkflowAttempt} from '../shared/workflow-attempt';
import {adoptModelLibrary,normalizeModelLibrary,resolveTaskProfile,publicModelConfiguration} from '../runtime/model-library';
import {normalizeWriterProfile} from '../runtime/model-writer-profile';
import {latestReplayBattleId} from '../shared/story-battles';
import {restoredStoryNeedsFork} from '../shared/story-restoration';
import {applySoulAdviceRecovery,checkedSoulAdviceRecovery,createSoulAdviceRecovery,retainSoulAdviceValue,soulAdviceAlreadyApplied,soulAdviceRecoveryKey,soulAdviceSourceMatches,type SoulAdviceRecovery,type SoulAdviceTarget} from '../shared/soul-advice-recovery';
import {applyCreationAdvisorRecovery,checkedCreationAdvisorRecovery,createCreationAdvisorRecovery,retainCreationAdvisorValue,creationAdvisorSourceMatches,creationAdvisorAlreadyApplied,type CreationAdvisorRecovery,type CreationAdvisorKind,type CreationAdvisorTarget,type CreationAdvisorAnswer} from '../shared/creation-advisor-recovery';
import type {CreationWorkspace} from '../shared/creation-draft';
import {jsonEqual} from '../shared/json-identity';
import {isPartyTurn,PARTY_CONVERSATION_ID} from '../shared/story-party-chat';
import {pendingStoryResearch} from '../shared/story-research';
import {pendingStoryRingNaming} from '../shared/story-ring-naming';
import {carryStoryDrafts} from './story-draft';
import {retainedStoryProse} from './story-pending-prose';
import {pendingStoryBeliefs} from '../shared/story-person-knowledge';
import {dialogueParticipants} from '../shared/story-dialogue-memory';
import {readStoryContext} from '../shared/story-recall';
import {storyMemorySettings,type StoryMemorySettings} from '../shared/story-memory-settings';
import {checkedStoryEntry} from '../shared/story-archive';
import {pendingStoryExtraction} from '../shared/story-extraction';
import {pendingStoryRoom} from '../shared/story-room';
import {credentialScope,rejectInlineCredentials,validateConnection,validateHeaders} from '../runtime/model-protocol';
import {saveCodec} from '../shared/save-codec';
import {readCharacterCreationBundle,withCharacterCreationAppearance} from '../shared/character-creation-bundle';
import {CloudError,classifyResultFailure,type ModelRecoveryMetadata} from '../cloud/protocol';
import {DEFAULT_SOUND,validateSound,type SoundSettings} from './audio-settings';
import type { GameCommand, GameEvent, GameSnapshot, JsonValue } from '../runtime/contracts';
import { GameRuntime } from '../runtime/game-runtime';
import { ModelKeyStore, GameDatabase, UiPreferenceStore, type AvatarRecord, type BackupRecord, type NarrativeRecord, type SaveSlotRecord } from '../runtime/storage';
import type {ModelListResult, ModelProfile, ModelLog} from '../runtime/model-gateway';
import {modelContextBudget} from '../shared/model-context';
import {resolveModelSettings} from '../runtime/model-settings';
import {previewModelPrompt,resolveModelPromptParts} from '../runtime/model-prompt-check';
import {isStoryAuthorTask} from '../runtime/model-response-sections';
import {openingPlaybackKey} from '../runtime/opening-scene';
import {storyPromptBudgetSources} from '../runtime/story-prompt-budget';
import {validateGeneration,validatePrompts,validateRequest,MODEL_TASKS,checkModelTaskSettings} from '../runtime/model-settings';
import { ModelTaskRunner, TaskCancelledError, isTaskCancelled, isModelObservationDetached, type ModelTaskView } from '../runtime/model-task';
import {playerText} from '../runtime/player-text';
import {recoveryCandidates,rankRecoveryChoices,type JourneyRecoveryChoice} from '../shared/journey-recovery';
import type {SoulImageInput,SoulImageInputs} from '../runtime/soul-images';
import type {MartialSoulAdvice} from '../runtime/game-model-orchestrator';
import {readFullSaveBundle,type FullSaveBundle} from '../shared/save-bundle';
import {diagnosticSnapshot,diagnosticValue,stringifyDiagnostic} from '../shared/diagnostic-summary';
import {emptyStoryPromptConfig,storyInitialVariables,type StoryPromptConfig} from '../runtime/story-prompts';
import {validateWriterPrompts} from '../runtime/story-writer-prompts';
import {writingPromptsForFamily} from '../runtime/prompt-presets';

export type PerformanceLevel = 'cinematic' | 'standard' | 'smooth' | 'reduced';

export interface UiNotice {
  id: string;
  tone: 'success' | 'danger' | 'info';
  message: string;
}

export interface ControllerView {
  calculationProgress?:import('../shared/calculation-progress').CalculationProgress|null;
  ready: boolean;
  connecting?:boolean;
  busy: boolean;
  modelTask: ModelTaskView | null;
  pendingGeneration?:GameCommand|null;
  resultRecovery?:ModelRecoveryMetadata&{message:string;phase:'awaiting-generation'|'command'|'ack'|'none';rejected?:boolean}|null;
  snapshot: GameSnapshot;
  events: GameEvent[];
  notices: UiNotice[];
  performance: PerformanceLevel;
  sound: SoundSettings;
  modelProfile: Omit<ModelProfile, 'apiKey'>;
  modelEnabled: boolean;
  modelCombatEnabled: boolean;
  avatarUrl: string;
  figureUrl: string;
  soulImages:Record<string,{kind:'preset';key:string}|{kind:'upload';url:string}>;
  profileId: string;
  profileLabel: string;
  creationWorkspace: Record<string, any> | null;
  pendingSoulAdvice?:{id:string;target:SoulAdviceTarget;status:'pending'|'ready'|'conflict';message:string}|null;
  pendingCreationAdvice?:{id:string;kind:CreationAdvisorKind;target:CreationAdvisorTarget;status:'pending'|'ready'|'conflict';message:string}|null;
  soulAdviceAppliedId?:string;
  researchWorkspace: Record<string, any> | null;
  sessionId: number;
  modelLogs:ModelLog[];
  loadError: string | null;
  connectionError?: string | null;
  reconnecting?:boolean;
  battleTurnError: {battleId:string;revision:number;message:string} | null;
  battlePauseRequested?:boolean;
  storyConversationRequest?:{key:string;personId:string;draft?:string}|null;
  storyError: {sessionId:number;branchId:string;turn:number;message:string} | null;
}

const DEFAULT_PROFILE: Omit<ModelProfile, 'apiKey'> = {
  id: 'primary',
  label: '自定义服务',
  baseUrl: '',
  model: '',
};

const clone = <T,>(value: T): T => structuredClone(value);
const modelRequestNotSent=(error:unknown)=>error instanceof CloudError&&['session-expired','client-version','model-recovery-unavailable'].includes(error.code)&&error.recovery?.stage==='model-request-preflight';
type RecoveredHostStory={runtime:GameRuntime;epoch:number;branchId:string;turn:number;privatePersonId?:string};

export {avatarRecordToAttachment} from '../runtime/save-export';

export function avatarAttachmentToRecord(attachment: Record<string, any>): AvatarRecord {
  const normalized = attachment.kind==='soul-image'?saveCodec.normalizeSoulImageAttachment(attachment):attachment.kind==='figure'?saveCodec.normalizeFigureAttachment(attachment):saveCodec.normalizeAvatarAttachment(attachment);
  const encoded = String(normalized.dataUrl).split(',', 2)[1] ?? '';
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  return {
    assetId: normalized.kind==='figure'?'player-figure':'player-avatar',width:normalized.width,height:normalized.height,
    mimeType: normalized.mimeType,
    byteLength: normalized.byteLength,
    checksum: normalized.checksum,
    blob: new Blob([bytes], {type: normalized.mimeType}),
    updatedAt: new Date().toISOString(),
  };
}

function commandId(type: string): string {
  return `${type}:${Date.now()}:${crypto.randomUUID()}`;
}

export {describeError} from './error-text';
import {describeError} from './error-text';

export class WebGameController {
  #initialization:Promise<void>|null=null;
  readonly database: GameDatabase;
  readonly modelKeys: ModelKeyStore;
  readonly preferences: UiPreferenceStore;
  #runtime: GameRuntime;
  #calculationRuntime?:GameRuntime;
  readonly #runtimeFactory:(options:{database:GameDatabase;slotId:string})=>GameRuntime;
  #view: ControllerView;
  #viewWithProgress?:ControllerView;
  #queryContext?:{sessionId:number;revision:number;connecting:boolean};
  #listeners = new Set<() => void>();
  #battleTurns = this.#newBattleProgression();
  #newBattleProgression(){
    return new BattleProgression({
      state:()=>this.runtime.readSnapshot().state,
      command:(type,payload={},interactive=false,takeover)=>this.#dispatchCommand(type,payload,{},interactive,takeover),
      work:delta=>this.#work(delta),
      error:(battleId,message)=>this.#set({battleTurnError:{battleId,revision:this.runtime.revision,message}}),
    });
  }
  #battleNarrationPaused=new Set<string>();
  #pendingWork = 0;
  #personWorkFlight:Promise<void>|null=null;
  #personWorkAbort:AbortController|null=null;
  #personWorkAttempt='';
  #preparingUpdate=false;
  #desktopInstallPending=false;
  #sessionEpoch = 0;
  #creatingPlayerEpoch:number|null=null;
  #transitioning = false;
  #recoveryWorkflow:{runtime:GameRuntime;epoch:number;label:string;kind:string;input:Record<string,unknown>;local:boolean;dispatchOptions:{avatar?:AvatarRecord|null};attempt?:{value?:WorkflowAttempt}}|null=null;
  #recoveryFlight:Promise<void>|null=null;
  #soulAdviceApplying:string|null=null;
  readonly #modelTasks = new ModelTaskRunner(modelTask => this.#set({modelTask,busy:this.#pendingWork > 0 || Boolean(modelTask)||Boolean(this.#view?.pendingGeneration)||Boolean(this.#view?.resultRecovery)}));

  constructor(options: {database?: GameDatabase; runtime?: GameRuntime;runtimeFactory?:(options:{database:GameDatabase;slotId:string})=>GameRuntime} = {}) {
    this.database = options.database ?? new GameDatabase();
    this.modelKeys = new ModelKeyStore();
    this.preferences = new UiPreferenceStore();
    const createRuntime=options.runtimeFactory??(options=>new GameRuntime(options));
    this.#runtimeFactory=options=>this.#observeCalculation(createRuntime(options));
    const preferred = this.preferences.get('active-profile','');
    this.#runtime = options.runtime ? this.#observeCalculation(options.runtime) : this.#runtimeFactory({database:this.database,slotId:/^profile-[a-z0-9-]+$/.test(preferred) ? preferred : `profile-${crypto.randomUUID()}`});
    this.#view = {
      ready: false,
      busy: false,
      modelTask: null,
      snapshot: this.runtime.getSnapshot(),
      events: [],
      notices: [],
      performance: this.preferences.get<PerformanceLevel>('performance', 'standard'),
      sound: {...DEFAULT_SOUND},
      modelProfile: this.preferences.get<any>('model-profile', DEFAULT_PROFILE as any),
      modelEnabled: this.preferences.get('model-enabled', true),
      modelCombatEnabled: this.preferences.get('model-combat-enabled', false),
      avatarUrl: '',
      figureUrl: '',
      soulImages:{},
      profileId:this.runtime.slotId,
      profileLabel:'我的旅程',
      creationWorkspace:null,
      researchWorkspace:null,
      sessionId:0,
      modelLogs:[],
      calculationProgress:null,
      loadError:null,
      battleTurnError:null,
      storyError:null,
    };
    const settings=this.preferences.get<any>('settings-v2',null);
    if(settings) this.#view={...this.#view,performance:settings.performance,sound:validateSound(settings.sound??DEFAULT_SOUND),modelEnabled:settings.modelEnabled,modelCombatEnabled:settings.modelCombatEnabled,modelProfile:settings.modelProfile};
  }

  #observeCalculation(runtime:GameRuntime):GameRuntime {
    runtime.onCalculationProgress=progress=>{
      if(runtime!==this.#runtime)return;
      this.#calculationRuntime=runtime;
      this.#viewWithProgress=progress?{...this.#view,calculationProgress:progress}:undefined;
      this.#emitView();
    };
    return runtime;
  }
  get runtime(): GameRuntime {return this.#runtime;}

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  // Keep the complete snapshot available to observers. Progress alone does not
  // change the snapshot used by the game screen or revision-bound queries.
  getView = (): ControllerView => this.#viewWithProgress??this.#view;
  getScreenView = (): Omit<ControllerView,'calculationProgress'> => this.#view;
  getCalculationProgress = () => this.#viewWithProgress?.calculationProgress??null;
  getQueryContext = () => {
    const {sessionId,snapshot,connecting=false}=this.#view,prior=this.#queryContext;
    if(prior&&prior.sessionId===sessionId&&prior.revision===snapshot.revision&&prior.connecting===connecting)return prior;
    return this.#queryContext={sessionId,revision:snapshot.revision,connecting};
  };
  #emitView(){for(const listener of this.#listeners)listener();}

  initialize(): Promise<void> {
    return this.#initialization??=this.#initializeOnce();
  }
  async #initializeOnce(): Promise<void> {
    if(typeof window!=='undefined'&&window.addEventListener){
      window.addEventListener('error',event=>{void this.reportFailure('browser.error',event.error??Error(event.message),{file:event.filename,line:event.lineno,column:event.colno});});
      window.addEventListener('unhandledrejection',event=>{void this.reportFailure('browser.unhandled-rejection',event.reason);});
    }
    let owner=this.runtime;
    const initialEpoch=this.#sessionEpoch;
    try {
      try{await this.modelKeys.migrate(adoptModelLibrary(this.#view.modelProfile).modelLibrary!);}
      catch{this.modelKeys.warning='旧模型凭据尚未迁入 Windows 加密存储，原配置已保留。重新打开游戏可重试。';this.notify(this.modelKeys.warning,'info');}
      const {slotId,record:selected}=await readStartupWorld(this.database,owner.slotId);
      if(initialEpoch!==this.#sessionEpoch||owner!==this.runtime)return;
      if(slotId!==owner.slotId){
        const previous=owner;
        owner=this.#runtime=this.#runtimeFactory({database:this.database,slotId});
        void previous.close().catch(()=>{});
      }
      if(isWorld(selected))this.#rememberActiveProfile();
      if(typeof location!=='undefined'&&location.hash==='#/saves?recovery=1'){
        await owner.loadLocalRecord(selected);
        if(owner!==this.runtime)return;
        await this.#refreshSessionView();
        if(owner!==this.runtime)return;
        this.#set({ready:true,loadError:'已打开本机存档，可查看并导出已有世界。读取进度时会重新连接游戏。'});
        return;
      }
      // Startup must not replay a costly in-flight operation before the player can open their save.
      await owner.open({resumePending:false,initialRecord:selected,onLocalReady:()=>{
        if(owner===this.runtime)this.#set({ready:true,connecting:true,snapshot:owner.readSnapshot(),profileId:owner.slotId,profileLabel:selected?.label??'我的旅程'});
      }});
      if(owner!==this.runtime)return;
      await this.#refreshSessionView();
      if(owner===this.runtime)this.#set({ready:true,connecting:false,loadError:null});
    } catch (error) {
      if(owner!==this.runtime)return;
      await this.reportFailure('journey.initialize',error);
      if(owner!==this.runtime)return;
      const connectionFailure=this.#observeCloudFailure(error);
      await this.#refreshSessionView().catch(()=>{});
      if(owner!==this.runtime)return;
      this.#set({ready:true,connecting:false,loadError:connectionFailure&&isCurrentSnapshot(owner.readSnapshot())?null:connectionFailure?'本机旅程已保留，暂时无法连接计算服务。请使用“重新连接”继续，无需恢复备份。':'上次的旅程未能读取。请到存档中重新读取或恢复备份，已有世界会保留。'});
      this.notify(describeError(error), 'danger');
    }
  }

  async dispatch(type: string, payload: Record<string, unknown> = {}, options: {avatar?: AvatarRecord | null} = {}): Promise<GameEvent[]> {
    return this.#dispatchCommand(type,payload,options);
  }
  async #dispatchCommand(type:string,payload:Record<string,unknown>={},options:{avatar?:AvatarRecord|null}={},interactive=true,takeover?:AbortSignal):Promise<GameEvent[]>{
    this.#assertSessionAvailable();
    if(interactive&&['arena.reconcile','expedition.resolve-battle'].includes(type)&&this.#view.busy)throw Error('请等待当前行动完成后再结算战果');
    if(interactive){this.#modelTasks.cancel();this.#cancelPersonWork();if(type==='battle.set-automatic'&&payload.enabled===true||['arena.spar','arena.endgame','arena.slaughter.bout','arena.competition.match','expedition.enter','battle.start'].includes(type)||type==='world.intent'&&payload.type==='person-duel')this.#battleTurns.paused=false;}
    const epoch = this.#sessionEpoch,runtime=this.runtime;
    const assertCurrent=()=>{if(runtime!==this.runtime||epoch!==this.#sessionEpoch)throw new TaskCancelledError('当前旅程已切换');};
    this.#work(1);
    try {
      const before=type==='workflow.apply'?runtime.readSnapshot():await runtime.flush(true);
      assertCurrent();
      if(takeover?.aborted)return [];
      const beforeHead=runtime.storyHeadId;
      const original:GameCommand={id:commandId(type),type,expectedRevision:before.revision,payload};
      let result;
      try{result=await runtime.dispatch(original,options,true,takeover);}
      catch(error){
        assertCurrent();
        if(!(error instanceof CloudError)||error.code!=='generation-required')throw error;
        await this.#syncPendingGeneration();
        assertCurrent();
        this.#requireModelEnabled();
        const previousEventIds=new Set(this.#view.events.map(event=>event.id));
        await this.#runWorkflow('创建人物与能力','generation',{commandId:original.id,type:original.type,payload:original.payload},false,options);
        assertCurrent();
        if(type==='player.create'){await this.#refreshSessionView();assertCurrent();}
        if(type==='research.begin')this.#set({researchWorkspace:this.runtime.getResearchWorkspace()});
        return this.#view.events.filter(event=>!previousEventIds.has(event.id));
      }
      assertCurrent();
      try{if(typeof sessionStorage!=='undefined')carryStoryDrafts(sessionStorage,this.runtime.slotId,before,beforeHead,result.snapshot,this.runtime.storyHeadId);}
      catch{this.notify('行动已保存，但部分未发送草稿未能带到当前会话。请保留或复制仍显示的文字。','info');}
      this.#set({pendingGeneration:null,snapshot: result.snapshot, events: [...this.#view.events, ...result.events].slice(-160),battleTurnError:null});
      if (type === 'player.create'){await this.#refreshSessionView();assertCurrent();}
      if (type === 'research.begin') this.#set({researchWorkspace:this.runtime.getResearchWorkspace()});
      const finished=(result.snapshot.state as any).扩展?.story;if(finished?.active?.status==='complete'&&result.events.some(event=>event.type==='story-finished'))publishInteraction(this.runtime.slotId,this.#sessionEpoch,finished.branchId,finished.active.number,type==='story.continue-locally',isPartyTurn(finished.active)?PARTY_CONVERSATION_ID:finished.active.privatePersonId);
      const events=result.events.filter(event=>this.#eventVisible(event));
      const battleWorkflow=type==='workflow.apply'&&(payload.ticket as any)?.data?.command?.type==='battle.action';
      if (events[0]?.summary && !battleWorkflow&&!['battle.action','battle.auto-until-player','battle.auto-step'].includes(type)) this.notify(events[0].summary, 'success');
      return events;
    } catch (error) {
      assertCurrent();
      await this.#syncPendingGeneration();
      assertCurrent();
      await this.reportFailure('action.dispatch',error,{type});
      assertCurrent();
      this.#observeCloudFailure(error);
      if (!isTaskCancelled(error)) this.notify(error instanceof ReferenceError || error instanceof TypeError ? '这次行动未能完成，当前进度已保留，请重试。' : describeError(error), 'danger');
      throw error;
    } finally {
      this.#work(-1);
    }
  }

  async createPlayer(draft: Record<string, unknown>, avatar?: AvatarRecord): Promise<void> {
    if(this.#creatingPlayerEpoch!==null)throw new Error('角色正在创建，请等待当前尝试完成');
    const epoch=this.#sessionEpoch;this.#creatingPlayerEpoch=epoch;
    try{await this.dispatch('player.create',draft,avatar ? {avatar} : {});if(this.#sessionEpoch===epoch){const record=(this.runtime.readSnapshot().state as any).世界?.opening?.background;if(record)this.preferences.set(openingPlaybackKey(this.#view.profileId??'',record.sourceId),{status:'reading',index:0});}}
    finally{if(this.#creatingPlayerEpoch===epoch)this.#creatingPlayerEpoch=null;}
  }

  #storyRunning=false;
  async #storyContext(record:Pick<SaveSlotRecord,'profileId'|'storyHeadId'>|null,query:string,privatePersonId?:string,recentLimit=6,includeHostPrivate=false){
    const runtime=this.runtime,epoch=this.#sessionEpoch,revision=runtime.revision;
    const ledger=(runtime.readSnapshot().state as any).扩展?.story,active=ledger?.active;
    const beforeTurn=active&&active.status!=='complete'?active.number:ledger?.nextTurn??1;
    const current=()=>{if(runtime!==this.runtime||epoch!==this.#sessionEpoch||runtime.revision!==revision)throw new TaskCancelledError('游戏进度已变化，请重新读取故事记忆');};
    const addressed=active?dialogueParticipants(active):[];
    const dialoguePersonId=addressed.length===1?addressed[0]:undefined;
    return readStoryContext(async nextId=>{current();const page=record?await this.database.storyPage(record,{limit:25,...(nextId?{nextId}:{})}):{entries:[],headId:null,nextId:null};current();return page;},{query,beforeTurn,privatePersonId,recentLimit,includeHostPrivate,dialoguePersonId});
  }
  async summarizeCurrentStory():Promise<void>{
    this.#assertSessionAvailable();if(this.#storyRunning||this.#view.busy||this.#view.modelTask)throw Error('请等待当前行动完成');
    if(!this.#view.modelEnabled)throw Error('请先启用叙事模型');
    const ledger=(this.runtime.readSnapshot().state as any).扩展?.story;
    if(ledger?.active?.status!=='complete')throw Error('请先完成当前故事');
    await this.#runWorkflow('整理故事记忆','story-summary',{branchId:ledger.branchId,turn:ledger.active.number},false,{},this.#newWorkflowAttempt('story-summary'));
  }
  async rewriteCurrentStory():Promise<void>{
    const kind='story-rewrite';
    this.#assertSessionAvailable();this.#requireModelEnabled();
    if(this.#storyRunning||this.#view.busy||this.#view.modelTask)throw Error('请等待当前行动完成');
    const runtime=this.runtime,epoch=this.#sessionEpoch,snapshot=runtime.readSnapshot(),ledger=(snapshot.state as any).扩展?.story;
    if(ledger?.active?.status!=='complete')throw Error('请先完成当前故事');
    if(ledger.active.privatePersonId||isPartyTurn(ledger.active))throw Error('已发送的私聊和群聊保留原话，请发送新消息继续');
    this.#storyRunning=true;this.#work(1);
    try{
      const prompts=await this.storyPrompts(),context=await this.#storyContext(runtime.getSlotHead(),ledger.active.input,ledger.active.privatePersonId);
      if(runtime!==this.runtime||epoch!==this.#sessionEpoch||runtime.revision!==snapshot.revision)throw new TaskCancelledError('旅程已变化，请重新选择正文操作');
      const history=context.history.filter((entry:any)=>entry.number<ledger.active.number),recall=context.recall.filter((entry:any)=>entry.source.turn<ledger.active.number);
      await this.#runWorkflow('重写本段正文',kind,{branchId:ledger.branchId,turn:ledger.active.number,prompts,history,recall,dialogue:context.dialogue,proseAttemptId:crypto.randomUUID(),...(prompts.prefillMode?{prefillMode:prompts.prefillMode}:{})});
    }finally{this.#storyRunning=false;this.#work(-1);}
  }
  async rewriteArchivedStory(number:number):Promise<void>{
    this.#assertSessionAvailable();this.#requireModelEnabled();
    if(this.#storyRunning||this.#view.busy||this.#view.modelTask)throw Error('请等待当前行动完成');
    const runtime=this.runtime,epoch=this.#sessionEpoch,revision=runtime.revision,record=runtime.getSlotHead(),ledger=(runtime.readSnapshot().state as any).扩展?.story;
    if(!record||ledger?.active?.status!=='complete'||!Number.isSafeInteger(number)||number>=ledger.active.number)throw Error('请先完成当前行动，再选择旧段正文');
    const current=()=>{if(runtime!==this.runtime||epoch!==this.#sessionEpoch||runtime.revision!==revision)throw new TaskCancelledError('旅程已变化，请重新选择旧段正文');};
    this.#storyRunning=true;this.#work(1);
    try{
      let original:ReturnType<typeof checkedStoryEntry>|undefined,previousId:string|null=null,nextId:string|undefined,prior=ledger.active.number;
      const history:any[]=[],seen=new Set<string>();
      do{
        current();const page=await this.database.storyPage(record,{limit:25,...(nextId?{nextId}:{})});current();
        for(const entry of page.entries){
          if(seen.has(entry.id)||entry.turn.number!==prior)throw Error('故事历史不完整，请保留当前进度。');seen.add(entry.id);prior--;
          if(entry.turn.number===number){original=checkedStoryEntry(entry);previousId=entry.previousId;if(original.turn.privatePersonId||isPartyTurn(original.turn))throw Error('已发送的对话保留原话。');}
          else if(original&&!entry.turn.privatePersonId&&!isPartyTurn(entry.turn)){history.unshift({number:entry.turn.number,input:storySourceInput(entry.turn),prose:entry.turn.prose});if(history.length>=6)break;}
        }
        nextId=page.nextId??undefined;
      }while(nextId&&(!original||history.length<6));
      if(!original)throw Error('当前旅程没有这段故事。');
      const prompts=await this.storyPrompts();current();
      const addressed=dialogueParticipants(original.turn);
      const earlier=addressed.length===1&&previousId?await readStoryContext(async cursor=>{
        current();const page=await this.database.storyPage(record,{limit:25,nextId:cursor??previousId!});current();return page;
      },{query:original.turn.input,beforeTurn:number,dialoguePersonId:addressed[0],recentLimit:0}):null;
      await this.#runWorkflow('补写旧段正文','story-rewrite',{branchId:ledger.branchId,turn:ledger.active.number,original,prompts,history,recall:[],dialogue:earlier?.dialogue,proseAttemptId:crypto.randomUUID(),...(prompts.prefillMode?{prefillMode:prompts.prefillMode}:{})});
    }finally{this.#storyRunning=false;this.#work(-1);}
  }
  async summarizeStoryStage(privatePersonId?:string):Promise<void>{
    this.#assertSessionAvailable();this.#requireModelEnabled();
    if(this.#storyRunning||this.#view.busy||this.#view.modelTask)throw Error('请等待当前行动完成');
    const runtime=this.runtime,epoch=this.#sessionEpoch,record=runtime.getSlotHead(),revision=runtime.revision;
    const ledger=(runtime.readSnapshot().state as any).扩展?.story;
    if(!record||ledger?.active?.status!=='complete')throw Error('请先完成当前故事');
    const current=()=>{if(runtime!==this.runtime||epoch!==this.#sessionEpoch||runtime.revision!==revision)throw new TaskCancelledError('旅程已变化，请重新整理阶段记忆');};
    this.#work(1);
    try{
      const originals:any[]=[],seen=new Set<string>(),cursors=new Set<string>();let nextId:string|undefined,prior=ledger.active.number;
      do{
        if(nextId){if(cursors.has(nextId))throw Error('故事记录读取异常，请稍后重试。');cursors.add(nextId);}
        current();const page=await this.database.storyPage(record,{limit:25,...(nextId?{nextId}:{})});current();
        for(const entry of page.entries){
          if(seen.has(entry.id)||entry.turn.number!==prior)throw Error('故事记录不完整，暂时无法打开。');seen.add(entry.id);prior=entry.turn.number-1;
          const source=checkedStoryEntry(entry);if(source.turn.privatePersonId!==privatePersonId||isPartyTurn(source.turn))continue;
          originals.push(makeStorySummaryOriginal(source.branchId,source.revision,source.turn));
          if(originals.length===8)break;
        }
        nextId=page.nextId??undefined;
      }while(nextId&&originals.length<8);
      if(originals.length<2)throw Error('当前交谈范围至少需要两段已完成故事');
      current();await this.#runWorkflow('整理近期阶段记忆','story-stage-summary',{branchId:ledger.branchId,turn:ledger.active.number,originals:originals.reverse()},false,{},this.#newWorkflowAttempt('story-stage-summary'));
    }finally{this.#work(-1);}
  }
  async storyPrompts():Promise<StoryPromptConfig>{
    const config=await this.database.getSetting<any>('story-prompts')??emptyStoryPromptConfig();
    return writingPromptsForFamily(config,this.#view.modelProfile.globalPromptPreset?.active);
  }
  async summarizeArchivedStory(entryId:string):Promise<void>{
    this.#assertSessionAvailable();this.#requireModelEnabled();
    if(this.#storyRunning||this.#view.busy||this.#view.modelTask)throw Error('请等待当前行动完成');
    const runtime=this.runtime,epoch=this.#sessionEpoch,record=runtime.getSlotHead(),revision=runtime.revision;
    if(!record||typeof entryId!=='string'||!entryId)throw Error('请选择当前旅程的一段旧故事');
    const current=()=>{if(runtime!==this.runtime||epoch!==this.#sessionEpoch||runtime.revision!==revision)throw new TaskCancelledError('旅程已变化，请重新选择旧故事');};
    this.#work(1);
    try{
      const ledger=(runtime.readSnapshot().state as any).扩展?.story;
      const seen=new Set<string>(),cursors=new Set<string>();let nextId:string|undefined,prior=(ledger?.active?.number??0)-(ledger?.active?.status==='complete'?0:1);
      do{
        if(nextId){if(cursors.has(nextId))throw Error('故事记录读取异常，请稍后重试。');cursors.add(nextId);}
        current();const page=await this.database.storyPage(record,{limit:25,...(nextId?{nextId}:{})});current();
        for(const entry of page.entries){
          if(seen.has(entry.id)||entry.turn.number!==prior)throw Error('故事记录不完整，暂时无法打开。');seen.add(entry.id);prior=entry.turn.number-1;
          if(entry.id!==entryId)continue;
          const source=checkedStoryEntry(entry);
          if(source.turn.number>=ledger.active.number)throw Error('当前故事请使用本段记忆整理');
          if(isPartyTurn(source.turn))throw Error('队伍交谈已保留原话，无需整理为故事摘要。');
          await this.#runWorkflow('补整理旧段记忆','story-summary',{branchId:ledger.branchId,turn:source.turn.number,original:makeStorySummaryOriginal(source.branchId,source.revision,source.turn)},false,{},this.#newWorkflowAttempt('story-summary'));
          return;
        }
        nextId=page.nextId??undefined;
      }while(nextId);
      throw Error('当前存档没有这段故事记录。');
    }finally{this.#work(-1);}
  }
  async storyMemorySettings():Promise<StoryMemorySettings>{return storyMemorySettings(await this.database.getSetting('story-memory')??undefined);}
  async saveStoryMemorySettings(value:StoryMemorySettings):Promise<void>{await this.database.putSetting('story-memory',storyMemorySettings(value) as unknown as JsonValue);}
  async saveStoryPrompts(config:StoryPromptConfig):Promise<void>{
    if(config.version!==1||typeof config.style!=='string'||typeof config.nsfw!=='string'||!Array.isArray(config.modules)||!Array.isArray(config.layout))throw Error('提示词配置不完整');
    validateWriterPrompts(config);storyInitialVariables(config.initialVariables);storyInitialVariables(config.globalVariables,'全局变量');storyInitialVariables(config.externalParameters,'外部参数');
    await this.database.putSetting('story-prompts',config as unknown as JsonValue);
  }
  async previewStoryMessages(text:string,prompts:StoryPromptConfig,privatePersonId?:string):Promise<any>{
    this.#assertSessionAvailable();const runtime=this.runtime,epoch=this.#sessionEpoch,revision=runtime.revision,record=runtime.getSlotHead(),modelProfile=this.#view.modelProfile;
    const active=(runtime.readSnapshot().state as any).扩展?.story?.active;
    const responses=await this.#storyResponses();
    const commitment=responses.immediateGifts[0]??responses.commitments[0],belief=pendingStoryBeliefs(runtime.readSnapshot().state)[0];
    const gift=responses.controlledGifts[0];
    const context=gift||responses.trades.length||responses.auctions.length?{}:await this.#storyContext(record,belief?.text??(active&&active.status!=='complete'?active.input:text),belief?.listenerId??commitment?.personId??(active&&active.status!=='complete'?active.privatePersonId:privatePersonId),(belief||commitment)?0:6,!belief&&!commitment&&(!active||active.status==='complete'||active.status==='planning'));
    const current=()=>{if(runtime!==this.runtime||epoch!==this.#sessionEpoch||runtime.revision!==revision||modelProfile!==this.#view.modelProfile)throw new TaskCancelledError('游戏进度或模型设置已变化，请重新预览');};
    current();const result=await this.query('story.prompt-preview',{revision,text,prompts,previewProfile:JSON.parse(JSON.stringify(publicModelConfiguration(modelProfile))),...context,...(privatePersonId?{privatePersonId}:{}),...(prompts.prefillMode?{prefillMode:prompts.prefillMode}:{})});current();
    const task=result.stage==='host'?'story-host':['npc-gift','npc-custody-trade','npc-custody-auction'].includes(result.stage)?'npc-autonomy':result.stage==='npc-belief'?'npc-belief':result.stage==='npc-response'?'story-social':result.stage==='private'?'private-chat':result.stage==='party'?'party-chat':'story-writer';
    const advisory=isStoryAuthorTask(task);
    let validation:any,requestPreview:any=null;
    try{
      const preview=previewModelPrompt(modelProfile,result.messages,{task,promptStructure:result.promptStructure,json:!advisory});
      if(result.writingValidation?.status==='failed')throw Error(result.writingValidation.error);
      validation={status:'passed',task,budget:preview.budget};requestPreview={protocol:preview.protocol,body:preview.body,sent:preview.sent};}
    catch(error){validation={status:'failed',task,error:(error as Error).message,budget:(error as any)?.budget};}
    const parts=resolveModelPromptParts(modelProfile,result.messages,task,result.promptStructure),messages=[...parts.before,...parts.main,...parts.after];
    const config=resolveModelSettings(resolveTaskProfile(modelProfile,task),task);
    const budget=validation.budget??modelContextBudget(messages,config.contextTokens,config.outputTokens,result.promptStructure?.prefill?.content);
    const trace=[...parts.globalIndexes.map(index=>({source:'global-prompts',index,role:messages[index].role,characters:messages[index].content.length})),...result.trace.map((entry:any)=>({...entry,index:parts.sourceIndexes[entry.index],characters:messages[parts.sourceIndexes[entry.index]]?.content.length??entry.characters}))].sort((a,b)=>a.index-b.index);
    return {...result,messages,trace,validation,requestPreview,contextBudget:{...budget,advisory,sources:storyPromptBudgetSources(trace,budget,prompts)}};
  }
  async resolveStoryExtraction(accept:boolean):Promise<void>{
    this.#assertSessionAvailable();if(this.#storyRunning||this.#view.busy||this.#view.modelTask)throw Error('请等待当前行动完成');
    const runtime=this.runtime,epoch=this.#sessionEpoch,state=runtime.readSnapshot().state as any,ledger=state.扩展?.story;
    if(!pendingStoryExtraction(state))throw Error('没有待确认的撤离');
    await this.dispatch('story.resolve-extraction',{branchId:ledger.branchId,turn:ledger.active.number,accept});
    if(runtime!==this.runtime||epoch!==this.#sessionEpoch)throw new TaskCancelledError();
    if(this.#view.modelEnabled)await this.continueStory();
  }
  async openStoryConversation(characterId:string,draft?:string):Promise<void>{
    this.#assertSessionAvailable();const runtime=this.runtime,epoch=this.#sessionEpoch;
    const person=await this.query('character.interactions',{characterId}) as any;
    if(runtime!==this.runtime||epoch!==this.#sessionEpoch)throw new TaskCancelledError();
    if(draft&&person.block)throw Error(person.block);
    if(!person.registered){if(person.block)throw Error(person.block);await this.dispatch('character.meet',{characterId});}
    if(runtime!==this.runtime||epoch!==this.#sessionEpoch)throw new TaskCancelledError();
    this.#set({storyConversationRequest:{key:crypto.randomUUID(),personId:person.personId,...(draft?{draft}:{})}});
  }
  async quickStoryAction(characterId:string,action:'contact'|'party',onStarted?:()=>void):Promise<void>{
    this.#assertSessionAvailable();this.#requireModelEnabled();
    const runtime=this.runtime,epoch=this.#sessionEpoch;
    await this.dispatch('character.quick-action',{characterId,action});
    if(runtime!==this.runtime||epoch!==this.#sessionEpoch)throw new TaskCancelledError();
    const personId=(runtime.readSnapshot().state as any).扩展.story.active.privatePersonId;
    this.#set({storyConversationRequest:{key:crypto.randomUUID(),personId}});
    onStarted?.();
    await this.continueStory();
  }
  consumeStoryConversation(key:string){if(this.#view.storyConversationRequest?.key===key)this.#set({storyConversationRequest:null});}
  async narrateBattle(battleId:string):Promise<void>{this.#battleNarrationPaused.delete(`${this.#sessionEpoch}:${battleId}`);return this.continueStory(undefined,undefined,battleId);}
  async #storyResponses():Promise<StoryResponses>{
    const runtime=this.runtime,epoch=this.#sessionEpoch,revision=runtime.revision;
    const result=await this.query('story.responses',{revision}) as StoryResponses;
    if(runtime!==this.runtime||epoch!==this.#sessionEpoch||runtime.revision!==revision||result.revision!==revision)throw new TaskCancelledError('故事进度已变化，请重新查看');
    return result;
  }
  async retryStoryStep():Promise<void>{
    this.#assertSessionAvailable();
    const runtime=this.runtime,epoch=this.#sessionEpoch,snapshot=runtime.readSnapshot(),ledger=(snapshot.state as any).扩展?.story;
    if(!ledger?.active||ledger.active.status==='complete')throw Error('当前没有待继续的故事');
    // Retrying an already settled turn first resumes its paid author candidate.
    // Only the separate rewrite action requests a fresh prose attempt.
    const responses=await this.#storyResponses();
    if(runtime!==this.runtime||epoch!==this.#sessionEpoch||runtime.revision!==snapshot.revision)throw new TaskCancelledError('这段故事已经变化');
    if(responses.canRetryProse)return this.#continueStory();
    const attempt={value:{id:crypto.randomUUID(),source:workflowAttemptSource(snapshot.state,'story-host',snapshot.revision)}};
    return this.#continueStory(undefined,undefined,undefined,false,undefined,attempt);
  }
  async retryStoryProse():Promise<void>{
    this.#assertSessionAvailable();
    const work=await this.#storyResponses();if(work.trades.length||work.auctions.length)return this.retryStoryStep();
    if(!work.canRetryProse)throw Error('请先完成当前人物回应或行动，再重试正文');
    return this.#continueStory(undefined,undefined,undefined,false,crypto.randomUUID());
  }
  async continueStoryLocally():Promise<void>{
    this.#assertSessionAvailable();
    const idle=()=>{if(this.#storyRunning||this.#view.busy||this.#view.modelTask||this.#personWorkFlight)throw Error('请先等待当前构思或取消操作结束');};
    idle();const runtime=this.runtime,epoch=this.#sessionEpoch,snapshot=runtime.readSnapshot(),ledger=(snapshot.state as any).扩展?.story;
    const source={revision:snapshot.revision,branchId:ledger?.branchId,turn:ledger?.active?.number};
    const preview=await this.query('story.local-continuation-preview',source) as any;
    if(runtime!==this.runtime||epoch!==this.#sessionEpoch)throw new TaskCancelledError();
    idle();
    if(runtime.revision!==source.revision||preview.revision!==source.revision||preview.branchId!==source.branchId||preview.turn!==source.turn)throw Error('这段故事已变化，请重新查看当前安排。');
    if(!preview.available)throw Error(preview.reason||'还有当前事项需要完成。');
    await this.dispatch('story.continue-locally',{branchId:source.branchId,turn:source.turn});
    if(runtime!==this.runtime||epoch!==this.#sessionEpoch)throw new TaskCancelledError();
    this.#set({storyError:null});
  }
  async closePrivateStory(party=false):Promise<void>{
    this.#assertSessionAvailable();
    const idle=()=>{if(this.#storyRunning||this.#view.busy||this.#view.modelTask||this.#personWorkFlight)throw Error('请先等待当前构思或取消操作结束');};
    idle();const runtime=this.runtime,epoch=this.#sessionEpoch,snapshot=runtime.readSnapshot(),ledger=(snapshot.state as any).扩展?.story;
    const source={revision:snapshot.revision,branchId:ledger?.branchId,turn:ledger?.active?.number};
    const preview=await this.query('story.private-close-preview',source) as any;
    if(runtime!==this.runtime||epoch!==this.#sessionEpoch)throw new TaskCancelledError();
    idle();
    if(runtime.revision!==source.revision||preview.revision!==source.revision||preview.branchId!==source.branchId||preview.turn!==source.turn)throw Error('这段会话已变化，请重新查看当前安排。');
    if(!preview.available)throw Error(preview.reason||'还有当前事项需要完成。');
    await this.dispatch(party?'story.close-party':'story.close-private',{branchId:source.branchId,turn:source.turn});
    if(runtime!==this.runtime||epoch!==this.#sessionEpoch)throw new TaskCancelledError();
    this.#set({storyError:null});
  }
  async answerStory(requestId:string,answer:string):Promise<void>{
    const ledger=(this.runtime.readSnapshot().state as any).扩展?.story;
    if(!ledger?.active)throw Error('当前没有等待补充的安排');
    await this.dispatch('story.answer',{branchId:ledger.branchId,turn:ledger.active.number,requestId,answer});
    return this.continueStory();
  }
  async cancelRemainingStory(requestId:string):Promise<void>{
    const ledger=(this.runtime.readSnapshot().state as any).扩展?.story;
    if(!ledger?.active)throw Error('当前没有等待补充的安排');
    await this.dispatch('story.cancel-remaining',{branchId:ledger.branchId,turn:ledger.active.number,requestId});
    if(ledger.active.privatePersonId||ledger.active.partyChat)await this.continueStory();else await this.continueStoryLocally();
  }
  async continueStory(input?:string,privatePersonId?:string,battleId?:string,partyChat=false):Promise<void>{
    return this.#continueStory(input,privatePersonId,battleId,partyChat);
  }
  async #continueStory(input?:string,privatePersonId?:string,battleId?:string,partyChat=false,proseAttemptId?:string,attempt:{value?:WorkflowAttempt}={}):Promise<void>{
    this.#assertSessionAvailable();if(input!==undefined||battleId)this.#requireModelEnabled();
    if(this.#storyRunning||this.#view.busy||this.#view.modelTask)throw Error('请等待当前行动完成');
    const runtime=this.runtime,epoch=this.#sessionEpoch;
    let writingBattle=false;
    const workflow=(label:string,kind:string,input:Record<string,unknown>={})=>{if(kind!=='room')this.#requireModelEnabled();if(kind==='story-writer')writingBattle=!!(runtime.readSnapshot().state as any).扩展?.story?.active?.battleId;return this.#runWorkflow(label,kind,input,kind==='room',{},attempt);};
    const current=()=>{
      if(runtime!==this.runtime||epoch!==this.#sessionEpoch)throw new TaskCancelledError();
      const ledger=(runtime.readSnapshot().state as any)?.扩展?.story;
      if(!ledger)throw Error('请在新版本创建新的故事');return ledger;
    };
    if(input!==undefined)this.#battleTurns.paused=false;
    this.#storyRunning=true;this.#set({storyError:null});this.#work(1);
    try{
      let ledger=current();
      const resumingResolvedTurn=input===undefined&&ledger.active?.status==='resolved';
      if(battleId){
        const reported=(runtime.readSnapshot().state as any).扩展?.battleReports?.[battleId]?.storyTurn;
        if(reported!==undefined&&!battleNeedsWriter(runtime.readSnapshot().state,(runtime.readSnapshot().state as any).扩展?.battleReports?.[battleId])&&(ledger.active?.number!==reported||ledger.active.status==='complete'))return;
        if(reported===undefined||(runtime.readSnapshot().state as any).扩展?.battleNarration?.[battleId]?.kind==='local'){await this.dispatch('story.begin-battle-report',{branchId:ledger.branchId,turn:ledger.nextTurn,battleId});ledger=current();}
      }
      if(input!==undefined){
        if(ledger.active&&ledger.active.status!=='complete')throw Error('请先继续完成上一段故事');
        await this.dispatch('story.begin',{branchId:ledger.branchId,turn:ledger.nextTurn,input,...(partyChat?{partyChat:true}:{}),...(privatePersonId?{privatePersonId}:{})});ledger=current();
      }
      if(!ledger.active||ledger.active.status==='complete')return;
      const prompts=await this.storyPrompts(),record=runtime.getSlotHead();
      const {hostPrivateRecall,...context}=await this.#storyContext(record,ledger.active.input,ledger.active.privatePersonId,6,ledger.active.status==='planning');
      ledger=current();let args={branchId:ledger.branchId,turn:ledger.active.number,prompts,...context,...(prompts.prefillMode?{prefillMode:prompts.prefillMode}:{})};
      if(proseAttemptId&&!(await this.#storyResponses()).canRetryProse)throw new TaskCancelledError('行动状态已变化，请重新选择正文操作');
      const originalScope=ledger.active.privatePersonId;
      if(ledger.active.status==='planning')await workflow('理解你的行动','story-host',{...args,hostPrivateRecall});
      ledger=current();
      const pointed=ledger.active?.continuation?.plan.segments.some((s:any)=>s.action.kind==='battle-action'||s.action.kind==='battle-strategy');
      const openingState:any=runtime.readSnapshot().state;
      if(input!==undefined&&pointed&&effectiveBattlePreferences(openingState).defaultMode==='auto'&&!this.#battleTurns.paused&&openingState.战斗?.状态==='进行中'&&!openingState.战斗.扩展?.automation?.enabled&&ledger.active!.results.at(-1)?.status!=='failed')await this.#dispatchCommand('battle.set-automatic',{enabled:true},{},false);
      if(ledger.active.privatePersonId!==originalScope){const routed=await this.#storyContext(runtime.getSlotHead(),ledger.active.input,ledger.active.privatePersonId,6);args={...args,...routed};ledger=current();}
      for(let phase=0;phase<36;phase++){
        if(proseAttemptId)break;
        const state=runtime.readSnapshot().state,responses=await this.#storyResponses(),market=responses;current();
        if(pendingStoryExtraction(state))return;
        if(pendingStoryBeliefs(state).length){
          const belief=pendingStoryBeliefs(state)[0],socialContext=await this.#storyContext(runtime.getSlotHead(),belief.text,belief.listenerId,0);
          await workflow('等待对方判断这句话','story-belief',{...args,recall:socialContext.recall,dialogue:socialContext.dialogue});
        }
        else if(responses.immediateGifts.length||responses.commitments.length){
          const personId=(responses.immediateGifts[0]??responses.commitments[0]).personId;
          const socialContext=await this.#storyContext(runtime.getSlotHead(),ledger.active.input,personId,0);
          await workflow('等待对方回应约定','story-social',{...args,recall:socialContext.recall,dialogue:socialContext.dialogue});
        }
        else if(responses.cooperation.length)await workflow('等待对方回应合作','person-cooperation',{cooperationId:responses.cooperation[0].id});
        else if(market.trades.length){const trade=market.trades[0];if(trade.buyerId===(state as any).角色.主控单位ID)return;await workflow('等待买主答复报价','person-custody-trade',{offerId:trade.offerId});}
        else if(market.auctions.length)await workflow('等待现场人物决定是否竞拍','person-custody-auction',market.auctions[0]);
        else if(responses.controlledGifts.length){const gift=responses.controlledGifts[0];if(gift.personId===(state as any).角色.主控单位ID)return;await workflow('等待接收人回应赠物','person-gift',{commitmentId:gift.id});}
        else if(responses.npcDecisions.length){
          const personId=responses.npcDecisions[0].ownerId;const socialContext=await this.#storyContext(runtime.getSlotHead(),'',personId,0);
          await workflow('人物在考虑自己的打算','story-autonomy',{...args,recall:socialContext.recall,dialogue:socialContext.dialogue});
        }
        else if(pendingStoryRoom(state))await workflow('探索前方景象','room',{});
        else if(pendingStoryResearch(state))await this.resolveResearchNaming(pendingStoryResearch(state)!,false,false,attempt);
        else if(pendingStoryRingNaming(state)){const next=pendingStoryRingNaming(state)!;await workflow(next.kind==='ring-item'?'记述魂环来历':'构思魂技名称',next.kind,next.input);}
        else if(responses.pendingPersonWork??(await runtime.query('world.people-work',{revision:runtime.revision,scope:'story'})).pending)await workflow('等待相关人物回应','world-people',{scope:'story'});
        else if(ledger.active.hostProgress?.status==='waiting')return;
        else if(ledger.active.hostProgress?.status==='ready')await workflow('继续安排剩余行动','story-host',{...args,hostPrivateRecall});
        else if(ledger.active.continuation?.battleId){
          const manual=(state as any).战斗?.状态==='进行中'&&!(state as any).战斗.扩展?.automation?.enabled;
          if(manual){
            const next=ledger.active.continuation.plan.segments[ledger.active.continuation.nextStep]?.action.kind;
            if(!['battle-action','battle-strategy'].includes(next))return;
            await this.#battleTurns.opponents(undefined,true);ledger=current();
          }else{await this.advanceAutomaticBattle();ledger=current();}
          if(this.#battleTurns.paused)return;
          const latest:any=runtime.readSnapshot().state;
          if(latest.战斗?.状态==='进行中'&&!latest.战斗.扩展?.automation?.enabled&&(!manual||latest.战斗.当前行动单位ID!==latest.角色.主控单位ID))return;
          await this.#dispatchCommand('story.resume',{branchId:ledger.branchId,turn:ledger.active!.number,nextStep:ledger.active!.continuation!.nextStep},{},false);
          ledger=current();
          const failed=ledger.active!.results.at(-1);
          if(failed?.action.kind==='battle-action'&&failed.status==='failed'&&(runtime.readSnapshot().state as any).战斗?.状态==='进行中'){await this.pauseAutomaticBattle();return;}
        }
        else if(ledger.active.continuation)await this.dispatch('story.resume',{branchId:ledger.branchId,turn:ledger.active.number,nextStep:ledger.active.continuation.nextStep});
        else break;
        ledger=current();
      }
      if(ledger.active.status==='resolved'){
        // Public outcomes finish from native receipts. NPC/private/group replies retain their own workflows.
        const localPublic=!ledger.active.privatePersonId&&!isPartyTurn(ledger.active)&&!battleId&&!proseAttemptId;
        const source={revision:runtime.revision,branchId:ledger.branchId,turn:ledger.active.number};
        const retained=localPublic&&resumingResolvedTurn&&retainedStoryProse(await runtime.modelEvidence(),{...source,worldId:runtime.slotId});
        current();
        if(runtime.revision!==source.revision)throw new TaskCancelledError('这段故事已变化，请重新查看当前安排。');
        if(localPublic&&!retained){
          const preview=await runtime.query('story.local-continuation-preview',source);current();
          if(runtime.revision!==source.revision||preview.revision!==source.revision||preview.branchId!==source.branchId||preview.turn!==source.turn)throw new TaskCancelledError('这段故事已变化，请重新查看当前安排。');
          if(!preview.available)throw Error(preview.reason??'还有事项需要处理，请继续当前行动。');
          await this.dispatch('story.continue-locally',{branchId:source.branchId,turn:source.turn});
        }else await workflow('写下这段故事','story-writer',{...args,...(proseAttemptId?{proseAttemptId}:{})});
      }
      ledger=current();
    }catch(error){
      if(writingBattle){const failed=(runtime.readSnapshot().state as any).扩展?.story?.active?.battleId;if(failed)this.#battleNarrationPaused.add(`${epoch}:${failed}`);}
      if(runtime===this.runtime&&epoch===this.#sessionEpoch&&!isTaskCancelled(error)){
        const ledger=(runtime.readSnapshot().state as any).扩展?.story;
        if(writingBattle&&ledger?.active?.status==='resolved'&&ledger.active.battleId){
          const recovery=await runtime.pendingRecovery();current();
          if(recovery.phase==='none'){
            const source={revision:runtime.revision,branchId:ledger.branchId,turn:ledger.active.number};
            const preview=await runtime.query('story.local-continuation-preview',source);current();
            if(preview.available){await this.#dispatchCommand('story.continue-locally',{branchId:source.branchId,turn:source.turn},{},false);this.#set({storyError:null});this.notify('战斗已结算，经过暂未写成，可稍后补写。');return;}
          }
        }
        if(ledger?.active&&ledger.active.status!=='complete')this.#set({storyError:{sessionId:this.#view.sessionId,branchId:ledger.branchId,turn:ledger.active.number,message:(error as Error).message}});
      }
      throw error;
    }finally{this.#storyRunning=false;this.#work(-1);}
  }

  async saveCreationWorkspace(workspace: Record<string, any>): Promise<void> {
    this.#assertSessionAvailable(false,{allowDisconnected:true});
    if(this.#creatingPlayerEpoch===this.#sessionEpoch)throw Error('觉醒已经完成提交，请等待人物创建结果');
    if ((this.#view.snapshot.state as any)?.角色?.已建立) throw new Error('这位魂师已完成觉醒，请另建角色档案');
    if (workspace.version !== 5 || !workspace.config || ![1,2,3,4].includes(workspace.step)) throw new Error('觉醒草稿格式不完整');
    this.#modelTasks.cancel();
    const epoch=this.#sessionEpoch;
    this.#work(1);
    try {
      await this.runtime.saveCreationWorkspace(clone(workspace) as JsonValue);
      if (epoch !== this.#sessionEpoch) throw new TaskCancelledError();
      this.#set({creationWorkspace:clone(workspace)});
    } finally {this.#work(-1);}
  }

  async saveResearchWorkspace(workspace:Record<string,any>):Promise<void> {
    this.#assertSessionAvailable();
    const runtime=this.runtime,epoch=this.#sessionEpoch;
    try {
      await runtime.saveResearchWorkspace(workspace);
      if(runtime!==this.runtime||epoch!==this.#sessionEpoch)throw new TaskCancelledError();
      this.#set({researchWorkspace:runtime.getResearchWorkspace()});
    }catch(error){if(runtime===this.runtime&&epoch===this.#sessionEpoch&&!isTaskCancelled(error))this.notify(describeError(error),'danger');throw error;}
  }

  async saveMenu(){
    const worldId=this.runtime.slotId,{slots,backups}=await this.database.listSaveMenu(worldId);
    const profiles=slots.filter(isWorld);
    const positions=new Set([worldId,...[1,2,3].map(n=>`${worldId}:manual:${n}`)]);
    return {profiles,slots:profiles.some(row=>row.slotId===worldId)?slots.filter(row=>row.profileId===worldId&&positions.has(row.slotId)):[],backups,rejectedResults:await this.database.rejectedWorkflowCount(worldId)};
  }
  async exportRejectedResults():Promise<string>{
    const worldId=this.runtime.slotId,records=await this.database.rejectedWorkflowResults(worldId);
    return JSON.stringify({format:'douluo-unapplied-results',version:1,worldId,exportedAt:new Date().toISOString(),records});
  }

  async listProfiles(): Promise<SaveSlotRecord[]> {
    return (await this.database.listSlots()).filter(isWorld);
  }

  async createProfile(label = '新的旅程'): Promise<string> {
    const slotId=`profile-${crypto.randomUUID()}`;
    await this.#replaceSession(async () => {
      const runtime=this.#runtimeFactory({database:this.database,slotId});
      try{await runtime.saveMetadata({kind:'profile',profileId:slotId,label:label.trim() || '新的旅程',avatar:null,workspace:null});}
      catch(error){try{await runtime.close();}catch{/* A retained bearer can be retried; local saves are untouched. */}throw error;}
      this.#runtime=runtime;
      this.preferences.set('active-profile',slotId);
    });
    return slotId;
  }

  async copyWorldForCharacterRepair():Promise<string>{
    const sourceId=this.runtime.slotId,label=this.#view.profileLabel;
    const exported=await this.exportSave();
    const copyId=await this.createProfile(label+' · 人物补全副本');
    try{await this.importSave(exported);this.preferences.set('character-repair-copy:'+copyId,sourceId);return copyId;}
    catch(error){await this.switchProfile(sourceId);throw error;}
  }

  isCharacterRepairCopy():boolean{return !!this.preferences.get('character-repair-copy:'+this.runtime.slotId,'');}

  async completeCharacterDetails(personIds:string[]):Promise<any>{
    this.#requireModelEnabled();
    return this.#runWorkflow('补全人物资料与技能名称','generation-repair',{personIds},false,{},this.#newWorkflowAttempt('generation-repair'));
  }
  async rebuildServiceCharacterDetails(personIds:string[]):Promise<any>{
    this.#requireModelEnabled();return this.#runWorkflow('按职业重建服务人物','generation-rebuild',{personIds},false,{},this.#newWorkflowAttempt('generation-rebuild'));
  }

  async switchProfile(slotId: string): Promise<void> {
    await this.#replaceSession(async () => {
      // Reload the active world's owner in place: a second remote runtime can
      // resume its token, which closing the old owner would then invalidate.
      const runtime=slotId===this.runtime.slotId?this.runtime:this.#runtimeFactory({database:this.database,slotId});
      try{
        await runtime.open();
        if(!isWorld(runtime.getSlotHead()))throw new Error('没有找到该世界');
      }catch(error){if(runtime!==this.runtime)try{await runtime.close();}catch{/* Preserve a remembered bearer if release could not be confirmed. */}throw error;}
      this.#runtime=runtime;
      this.preferences.set('active-profile',slotId);
    },{destination:slotId});
  }

  async #refreshSessionView(): Promise<void> {
    const runtime=this.runtime;
    const epoch=this.#sessionEpoch;
    const record=runtime.getSlotHead();
    const [history,avatar,figure,soulImages,pending,advice,creationAdvice] = await Promise.all([this.database.listEvents(runtime.slotId,160),this.database.getSlotAvatar(record),this.database.getSlotFigure(record),this.database.getSlotSoulImages(record),runtime.pendingRecovery(),this.#soulAdviceRecord(runtime),this.#creationAdvisorRecord(runtime)]);
    const pendingGeneration=pending.original??null;
    if (runtime !== this.runtime || epoch !== this.#sessionEpoch) return;
    const workspace=runtime.getWorkspace() as Record<string,any>|null;
    const pendingSoulAdvice=advice?this.#soulAdvicePresentation(advice,workspace as CreationWorkspace|null):null;
    const pendingCreationAdvice=creationAdvice?this.#creationAdvisorPresentation(creationAdvice,workspace as CreationWorkspace|null):null,pendingAdvice=pendingSoulAdvice??pendingCreationAdvice;
    const adviceRecovery=pendingAdvice&&!pendingGeneration&&!this.#view.modelTask?{category:pendingAdvice.status==='conflict'?'conflict' as const:'unknown' as const,stage:'model-result-retrieve',kind:creationAdvice?.kind??'advice',canRetrySameJob:true,message:pendingAdvice.message,phase:'none' as const}:null;
    const recovery=pending.phase==='command'?{phase:'command' as const,stage:'save-progress',category:pending.rejection?'conflict' as const:'transaction' as const,canRetrySameJob:!pending.rejection,...(pending.rejection?{rejected:true}:{}),message:pending.rejection?'这份旧结果与当前进度不一致，尚未执行。保留进度并继续后，原结果会留在本机备查。':'上次行动尚待保存。可以先查看或导出存档，再继续原操作。'}:adviceRecovery;
    this.#set({pendingGeneration,pendingSoulAdvice,pendingCreationAdvice,...(recovery?{resultRecovery:recovery}:{}),busy:this.#pendingWork>0||Boolean(this.#view.modelTask)||Boolean(pendingGeneration)||Boolean(recovery||this.#view.resultRecovery),snapshot:runtime.readSnapshot(),events:history.map(item => item.event),avatarUrl:this.#avatarUrl(avatar),figureUrl:this.#avatarUrl(figure,'figureUrl'),soulImages:this.#soulImageView(soulImages),
      profileId:runtime.slotId,profileLabel:record?.label ?? '我的旅程',creationWorkspace:workspace?.kind==='player-workbenches'?null:workspace,researchWorkspace:runtime.getResearchWorkspace(),sessionId:epoch,battleTurnError:null,battlePauseRequested:this.#transitioning?false:this.#view.battlePauseRequested,storyError:null,storyConversationRequest:null});
  }

  async settleAiTurns(retry = false): Promise<void> {
    if (this.#battleTurns.running) return this.#battleTurns.running;
    const epoch=this.#sessionEpoch;
    const battle=(this.#view.snapshot.state as any)?.战斗;
    if(battle?.扩展?.automation?.waitingStoryTurn)return;
    const failure=this.#view.battleTurnError;
    if (!retry && failure?.battleId===battle?.id && failure?.revision===this.#view.snapshot.revision) return;
    if (failure) this.#set({battleTurnError:null});
    // Page transitions and the mounted scene may request progress together.
    // Automatic combat owns both sides; never start a second opponent loop.
    if (battle?.状态==='进行中'&&battle.扩展?.automation?.enabled) return this.advanceAutomaticBattle();
    const attempt=retry?{value:{id:crypto.randomUUID(),source:workflowAttemptSource(this.#view.snapshot.state,'combat',this.#view.snapshot.revision)}}:undefined;
    const decide = this.#view.modelEnabled && this.#view.modelCombatEnabled
      ? ()=>this.#runWorkflow('对手正在行动','combat',{},false,{},attempt) : undefined;
    try { await this.#battleTurns.opponents(decide); }
    catch (error) {
      if (epoch===this.#sessionEpoch && !isTaskCancelled(error)) {
        const current=(this.#view.snapshot.state as any)?.战斗;
        this.#set({battleTurnError:{battleId:current?.id,revision:this.#view.snapshot.revision,message:'对手的行动未能完成，战斗进度已保留。请重试。'}});
      }
      throw error;
    }
  }

  async ensureAutomaticBattle():Promise<void>{
    const state:any=this.runtime.readSnapshot().state,turn=state.扩展?.story?.active;
    if(this.#storyRunning||this.#view.busy||this.#transitioning||this.#view.battleTurnError||this.#view.storyError||this.#view.resultRecovery)return;
    const ledger=state.扩展?.story;
    if(turn?.battleId&&this.#battleNarrationPaused.has(`${this.#sessionEpoch}:${turn.battleId}`))return;
    if(ledger?.deferredBattle&&hasBattleStoryFollowup(state)){
      const epoch=this.#sessionEpoch;
      await this.dispatch('story.begin-battle-report',{branchId:ledger.branchId,turn:ledger.nextTurn,battleId:ledger.deferredBattle.battleId});
      if(epoch===this.#sessionEpoch)await this.continueStory();return;
    }
    if(hasBattleStoryFollowup(state)){await this.continueStory();return;}
    if(state.战斗?.状态==='进行中'&&state.战斗.扩展?.automation?.enabled)await this.advanceAutomaticBattle();
  }

  advanceAutomaticBattle():Promise<void>{return this.#battleTurns.advance();}

  async pauseAutomaticBattle():Promise<void>{
    const turns=this.#battleTurns,epoch=this.#sessionEpoch;
    const pause=turns.pause();
    this.#set({battlePauseRequested:true});
    try{await pause;}
    finally{if(epoch===this.#sessionEpoch)this.#set({battlePauseRequested:false});}
  }
  async resumeAutomaticBattle():Promise<void>{
    if(this.#battleTurns.automatic)return this.#battleTurns.automatic;
    const epoch=this.#sessionEpoch;
    if(this.#view.pendingGeneration||this.#view.resultRecovery){await this.resumePendingGeneration();if(epoch===this.#sessionEpoch)this.#set({battleTurnError:null});return;}
    if(this.#view.busy)throw Error('请等待当前行动完成');
    this.#set({battleTurnError:null});
    if((this.runtime.readSnapshot().state as any).战斗?.状态!=='进行中'){await this.advanceAutomaticBattle();return;}
    await this.dispatch('battle.set-automatic',{enabled:true});
    if(epoch===this.#sessionEpoch)await this.ensureAutomaticBattle();
  }

  async evolutionAdvice(input:Record<string,unknown>):Promise<any>{this.#requireModelEnabled();return this.#runWorkflow('正在讨论武魂变化','evolution-advice',input);}
  async respondEvolution(planId:string):Promise<any>{this.#requireModelEnabled();return this.#runWorkflow('等待本人考虑进化方案','evolution-response',{planId});}
  async respondLoot(commitmentId:string):Promise<void>{this.#requireModelEnabled();await this.#runWorkflow('等待对方回应分配','person-loot',{commitmentId});}

  async respondCustodyTrade(offerId:string):Promise<void>{this.#requireModelEnabled();await this.#runWorkflow('等待买主答复报价','person-custody-trade',{offerId},false,{},this.#newWorkflowAttempt('person-custody-trade'));}
  async respondPerformanceAgreement(agreementId:string):Promise<void>{this.#requireModelEnabled();await this.#runWorkflow('等待对方回应协议','person-performance-agreement',{agreementId},false,{},this.#newWorkflowAttempt('person-performance-agreement'));}
  async respondCooperation(cooperationId:string):Promise<void>{this.#requireModelEnabled();await this.#runWorkflow('等待对方回应合作','person-cooperation',{cooperationId},false,{},this.#newWorkflowAttempt('person-cooperation'));}

  #observeCloudFailure(error:unknown):boolean {
    let source:unknown=error;
    for(let depth=0;depth<4&&source instanceof Error;depth++,source=source.cause){
      if(source instanceof CloudError&&['connection-lost','session-expired','calculation-interrupted','service-busy','service-unavailable','save-unacknowledged','revision-conflict','delta-conflict'].includes(source.code)){
        this.#set({connectionError:source.code==='calculation-interrupted'?'这次计算暂时中断，原进度与待完成操作仍保留。点击“重新连接”后会先核对并重试原操作。':source.code==='service-busy'?'计算服务正在处理较多旅程，本机进度与待完成操作仍保留。请稍后点击“重新连接”继续。':'计算连接暂时中断，本机进度与待完成操作仍保留。重新连接后会先核对原来的操作。'});
        return true;
      }
    }
    return false;
  }
  canReconnect():boolean{return !this.#transitioning&&(this.#pendingWork===0&&!this.#view.modelTask||this.#pendingWork===1&&!!this.#view.modelTask);}
  async reconnect():Promise<void>{
    if(!this.canReconnect())return;
    this.#set({reconnecting:true});
    try{await this.#replaceSession(()=>this.runtime.open(),{reconnect:true});this.#set({connectionError:null,loadError:null});this.notify('已从本机进度恢复连接','success');}
    catch(error){this.#observeCloudFailure(error);this.notify(describeError(error),'danger');}
    finally{this.#set({reconnecting:false});}
  }
  async #restoreModelConnection(){
    if(!this.#view.connectionError)return;
    const runtime=this.runtime,epoch=this.#sessionEpoch;
    // Wait for queued local writes without retrying network ACKs on a broken
    // connection. A draft save finishing now must not block the recovery click.
    await runtime.waitForLocalWrites();
    if(runtime!==this.runtime||epoch!==this.#sessionEpoch)throw new TaskCancelledError('当前故事已经切换');
    if(!this.#view.connectionError)return;
    if(!this.canReconnect())throw new CloudError('service-busy','请先等待当前操作完成，再恢复连接继续原设计',409);
    await this.reconnect();
    if(runtime!==this.runtime||this.#sessionEpoch!==epoch+1)throw new TaskCancelledError('当前故事已经切换');
    if(this.#view.connectionError||this.#view.loadError)throw new CloudError('session-expired',this.#view.connectionError??this.#view.loadError!,410);
  }
  async #retainUnsentDesign(key:string,input:any,check:(value:any)=>RingDesignDiscussion|ResearchDesignDiscussion){
    await this.database.updateSetting(key,prior=>{
      const record=check(prior);
      if(!record.pending||record.pending.value!==undefined||!jsonEqual(record.pending.input,input))return prior;
      return {...record,pending:{input:record.pending.input,notStarted:true}} as any;
    });
  }
  async #cloud<T>(request:()=>Promise<T>,name:string,signal?:AbortSignal):Promise<T>{
    const runtime=this.runtime,epoch=this.#sessionEpoch,started=Date.now();
    try{return await request();}catch(error){
      if(!signal?.aborted&&runtime===this.runtime&&epoch===this.#sessionEpoch){
        // A failed read belongs to its panel. Only an expired session requires global recovery.
        if(error instanceof CloudError && error.code==='session-expired')this.#observeCloudFailure(error);
        await this.reportFailure('cloud.query',error,{name:/^[a-z][a-z0-9.-]{0,79}$/.test(name)?name:'unregistered-query',elapsedMs:Date.now()-started});
      }
      throw error;
    }
  }
  async query(name:string,input:Record<string,unknown>={},signal?:AbortSignal):Promise<any>{return this.#cloud(()=>this.runtime.query(name,input,signal),name,signal);}

  async listBattleActions(actorId: string): Promise<any[]> {
    return this.#cloud(()=>this.runtime.listBattleActions(actorId),'battle.actions');
  }

  async previewBattleAction(intent: Record<string, unknown>,signal?:AbortSignal): Promise<Record<string, any> | null> {
    try { return await this.#cloud(()=>this.runtime.previewBattleAction(intent,signal),'battle.preview',signal); }
    catch (error) { return {ready: false, reason: describeError(error,this.#view.snapshot.state)}; }
  }

  async previewWorldIntent(intent: Record<string, unknown>,signal?:AbortSignal): Promise<Record<string, any> | null> {
    return this.#cloud(()=>this.runtime.previewWorldIntent(intent,signal),'world.preview',signal);
  }

  async previewExpeditionRisk(dungeonId: string, difficultyId: string): Promise<Record<string, any> | null> {
    return this.#cloud(()=>this.runtime.previewExpeditionRisk(dungeonId,difficultyId),'expedition.risk');
  }

  async startExpedition(dungeonId = '', difficultyId = 'outer', travelMode?:string): Promise<boolean> {
    const dungeon = await this.query('expedition.entry',{dungeonId});
    dungeonId=dungeon.id;
    if (!dungeon) throw new Error('副本不存在');
    let state = this.#view.snapshot.state as any;
    let locationId = state?.地图?.当前地点ID;
    if (locationId !== dungeon.locationId) {
      const plan=await this.previewWorldIntent({type:'travel',destinationId:dungeon.locationId,mode:travelMode??state?.地图?.扩展?.路径模式??'balanced'});
      await this.dispatch(plan?.resumeActionId?'world.resume-long-action':'world.intent',plan?.resumeActionId?{actionId:plan.resumeActionId}:{type:'travel',destinationId:dungeon.locationId,mode:travelMode??state?.地图?.扩展?.路径模式??'balanced'});
      state = this.#view.snapshot.state as any;
      locationId = state?.地图?.当前地点ID;
    }
    if(locationId!==dungeon.locationId)throw new Error('行程已经暂停，尚未抵达副本入口；请先处理约定或继续原行程');
    await this.dispatch('expedition.start', {dungeonId, difficultyId});
    return true;
  }

  async enterExpeditionRoom(nodeId: string, confirmAbandon=false): Promise<void> {
    const events = await this.dispatch('expedition.enter', {nodeId,confirmAbandon});
    const request = events[0]?.payload?.namingRequest;
    if(request)await this.#runWorkflow('探索前方景象','room',{},true);
    await this.settleAiTurns();
  }

  async resumeExpeditionNarrative(useLocal = false): Promise<void> {
    const state = this.#view.snapshot.state as any;
    const request = state?.远征?.当前?.currentRoom?.narrativeRequest;
    if (!request) throw new Error('当前房间没有待补写的描述。');
    await this.#runWorkflow('探索前方景象','room',{},true,{},this.#newWorkflowAttempt('room'));
    await this.settleAiTurns();
  }

  async resolveOpenWorldBattle(): Promise<void> {
    await this.dispatch('world.resolve-battle');
  }

  async exportCharacterDraft(draft: Record<string, unknown>): Promise<string> {
    const runtime=this.runtime,epoch=this.#sessionEpoch;
    await runtime.waitForLocalWrites();
    const record=runtime.getSlotHead();
    const [serialized,avatar,figure]=await Promise.all([this.query('config.export-character',{draft}),this.database.getSlotAvatar(record),this.database.getSlotFigure(record)]);
    const attachments=[...(avatar?[await avatarRecordToAttachment(avatar)]:[]),...(figure?[await avatarRecordToAttachment(figure,'figure')]:[])];
    if(runtime!==this.runtime||epoch!==this.#sessionEpoch)throw new TaskCancelledError();
    return withCharacterCreationAppearance(serialized,attachments);
  }

  async importCharacterDraft(input: string): Promise<Record<string,unknown>> {
    return this.query('config.import-character',{serialized:readCharacterCreationBundle(input).serializedDraft});
  }

  async applyCharacterDraftImport(input:string,workspace:Record<string,any>):Promise<void> {
    this.#assertSessionAvailable();
    const runtime=this.runtime,epoch=this.#sessionEpoch,{attachments}=readCharacterCreationBundle(input);
    if((runtime.readSnapshot().state as any)?.角色?.已建立)throw new Error('觉醒已经完成，请另建角色后导入方案');
    const avatarAttachment=attachments.find(item=>item.kind==='avatar'),figureAttachment=attachments.find(item=>item.kind==='figure');
    const avatar=avatarAttachment?avatarAttachmentToRecord(avatarAttachment):null,figure=figureAttachment?avatarAttachmentToRecord(figureAttachment):null;
    await runtime.saveMetadata({workspace:workspace as JsonValue,avatar,figure});
    if(runtime!==this.runtime||epoch!==this.#sessionEpoch)throw new TaskCancelledError();
    this.#set({creationWorkspace:workspace,avatarUrl:this.#avatarUrl(avatar),figureUrl:this.#avatarUrl(figure,'figureUrl')});
  }

  async exportMartialSoul(soul: Record<string, unknown>): Promise<string> {return this.query('config.export-soul',{soul});}

  async importMartialSoul(input: string): Promise<Record<string,unknown>> {return this.query('config.import-soul',{serialized:input});}

  setPerformance(performance: PerformanceLevel): void {
    this.saveSettings({...this.settingsDraft(),performance});
  }

  setModelEnabled(modelEnabled: boolean): void {
    if (this.#view.modelEnabled !== modelEnabled) this.#modelTasks.cancel();
    this.saveSettings({...this.settingsDraft(),modelEnabled});
  }

  setModelCombatEnabled(modelCombatEnabled: boolean): void {
    if (this.#view.modelCombatEnabled !== modelCombatEnabled) this.#modelTasks.cancel();
    this.saveSettings({...this.settingsDraft(),modelCombatEnabled});
  }

  async generateMartialSoul(description: string, budget = 70, draftId = ''): Promise<Record<string, any>> {
    this.#requireModelEnabled();
    const result = await this.#runWorkflow('构思武魂','draft',{description,budget,draftId});
    this.notify(`${result.draft.name}已准备好，可以查看和调整`, 'success');
    return result.draft;
  }

  async consultMartialSoul(description: string, budget: number, draftId: string, session?: Record<string, any>,currentDraft?:Record<string,any>,peerSouls?:Record<string,any>[],options:{target?:SoulAdviceTarget;signal?:AbortSignal}={}): Promise<MartialSoulAdvice> {
    this.#requireModelEnabled();
    this.#assertSessionAvailable(false,{allowDisconnected:true});
    if(this.#view.modelTask||this.#soulAdviceApplying)throw Error('请先等待当前构思完成');
    options.signal?.throwIfAborted();
    if(this.#view.connectionError){await this.#restoreModelConnection();options.signal?.throwIfAborted();}
    const runtime=this.runtime,epoch=this.#sessionEpoch;
    if(this.#view.modelTask||this.#soulAdviceApplying)throw Error('请先等待当前构思完成');
    await runtime.flushPending();options.signal?.throwIfAborted();
    if(runtime!==this.runtime||epoch!==this.#sessionEpoch)throw new TaskCancelledError();
    const input={description,budget,draftId,...(session?{session}:{}),...(currentDraft?{currentDraft}:{}),...(peerSouls?{peerSouls}:{})};
    const workspace=runtime.getWorkspace() as unknown as CreationWorkspace|null;
    let record=await this.#soulAdviceRecord(runtime);const recovering=Boolean(record);
    if(record){
      if(!jsonEqual(record.input,input)||options.target&&!jsonEqual(record.target,options.target))throw Error('还有一份武魂建议等待处理，请先取回或明确放弃原任务');
      if(!soulAdviceSourceMatches(workspace,record)&&!soulAdviceAlreadyApplied(workspace,record))throw Error('武魂草稿或讨论输入已改变，原建议保留，请先处理原任务');
      if(record.value){await this.#applySoulAdvice(runtime,epoch,record,false);return record.value as MartialSoulAdvice;}
    }else if(workspace?.version===5&&currentDraft){
      if(await this.#creationAdvisorRecord(runtime))throw Error('还有一份创作答复等待处理，请先取回或放弃原任务');
      const matches=workspace.config.martialSoulDrafts.map((soul:any,index:number)=>({soul,index})).filter((entry:any)=>entry.soul.draftId===draftId&&jsonEqual(entry.soul,currentDraft));
      const target=options.target??(matches.length===1?{index:matches[0].index}:undefined);
      if(!target)throw Error('请选择需要讨论的那一份武魂构想');
      record=createSoulAdviceRecovery(workspace,input,target,runtime.slotId);
      const owned=record;
      await this.database.updateSetting(soulAdviceRecoveryKey(runtime.slotId),prior=>{if(prior)throw Error('还有一份武魂建议等待处理，请先取回原任务');return owned as unknown as JsonValue;});
    }
    options.signal?.throwIfAborted();
    if(runtime!==this.runtime||epoch!==this.#sessionEpoch)throw new TaskCancelledError();
    return this.#runWorkflow('武魂顾问正在构思','advice',input,false,{},undefined,recovering,false,record?.id,options.signal);
  }

  async #soulAdviceRecord(runtime=this.runtime):Promise<SoulAdviceRecovery|null>{
    return checkedSoulAdviceRecovery(await this.database.getSetting(soulAdviceRecoveryKey(runtime.slotId)),runtime.slotId);
  }
  #soulAdvicePresentation(record:SoulAdviceRecovery,workspace:CreationWorkspace|null){
    const conflict=!soulAdviceSourceMatches(workspace,record)&&!soulAdviceAlreadyApplied(workspace,record);
    return {id:record.id,target:record.target,status:conflict?'conflict' as const:record.value?'ready' as const:'pending' as const,message:conflict?'武魂草稿或讨论输入已改变，原建议仍保留。请先处理原任务，再开始新的讨论。':record.value?'原武魂建议已保存在本机，可以完成保存并查看候选，无需重新生成。':'还有一次武魂顾问讨论等待取回。点击取回可继续原任务。'};
  }
  async #retainSoulAdvice(runtime:GameRuntime,id:string,value:any):Promise<SoulAdviceRecovery>{
    return await this.database.updateSetting(soulAdviceRecoveryKey(runtime.slotId),prior=>{
      const record=checkedSoulAdviceRecovery(prior,runtime.slotId);
      if(!record||record.id!==id)throw new TaskCancelledError('原顾问任务已经变化，旧建议未写入');
      return retainSoulAdviceValue(record,value) as unknown as JsonValue;
    }) as unknown as SoulAdviceRecovery;
  }
  async #applySoulAdvice(runtime:GameRuntime,epoch:number,record:SoulAdviceRecovery,notifyApplied:boolean):Promise<void>{
    if(this.#soulAdviceApplying)throw Error('正在保存原武魂建议，请稍候');
    this.#soulAdviceApplying=record.id;this.#work(1);
    try{
      if(runtime!==this.runtime||epoch!==this.#sessionEpoch)throw new TaskCancelledError();
      const owned=await this.#soulAdviceRecord(runtime);
      if(!owned||owned.id!==record.id)throw new TaskCancelledError('原顾问任务已经变化');
      const workspace=await runtime.updateCreationWorkspace(current=>{
        if(runtime!==this.runtime||epoch!==this.#sessionEpoch)throw new TaskCancelledError();
        return applySoulAdviceRecovery(current as unknown as CreationWorkspace,owned) as unknown as JsonValue;
      });
      await this.database.updateSetting(soulAdviceRecoveryKey(runtime.slotId),prior=>checkedSoulAdviceRecovery(prior,runtime.slotId)?.id===record.id?null:prior);
      if(runtime===this.runtime&&epoch===this.#sessionEpoch)this.#set({creationWorkspace:workspace as Record<string,any>,pendingSoulAdvice:null,...(notifyApplied?{soulAdviceAppliedId:record.id}:{}),resultRecovery:null});
    }catch(error){
      if(runtime===this.runtime&&epoch===this.#sessionEpoch&&!isTaskCancelled(error)){
        const pending=this.#soulAdvicePresentation(record,runtime.getWorkspace() as unknown as CreationWorkspace|null);
        this.#set({pendingSoulAdvice:pending,resultRecovery:{category:pending.status==='conflict'?'conflict':'unknown',stage:'model-result-consume',kind:'advice',canRetrySameJob:true,message:pending.status==='conflict'?pending.message:describeError(error),phase:'none'}});
      }
      throw error;
    }finally{this.#soulAdviceApplying=null;this.#work(-1);}
  }
  async #creationAdvisorRecord(runtime=this.runtime):Promise<CreationAdvisorRecovery|null>{
    return checkedCreationAdvisorRecovery(await this.database.getSetting(soulAdviceRecoveryKey(runtime.slotId)),runtime.slotId);
  }
  #creationAdvisorPresentation(record:CreationAdvisorRecovery,workspace:CreationWorkspace|null){
    const conflict=!creationAdvisorSourceMatches(workspace,record)&&!creationAdvisorAlreadyApplied(workspace,record);
    return {id:record.id,kind:record.kind,target:record.target,status:conflict?'conflict' as const:record.value?'ready' as const:'pending' as const,message:conflict?'草稿或讨论输入已改变，原答复仍保留。请先处理原任务。':record.value?'原顾问答复已保存在本机，可以查看候选，无需重新生成。':'还有一次创作讨论等待取回。点击取回可继续原任务。'};
  }
  async #retainCreationAdvisor(runtime:GameRuntime,id:string,value:any):Promise<CreationAdvisorRecovery>{
    return await this.database.updateSetting(soulAdviceRecoveryKey(runtime.slotId),prior=>{
      const record=checkedCreationAdvisorRecovery(prior,runtime.slotId);
      if(!record||record.id!==id)throw new TaskCancelledError('原顾问任务已经变化，旧答复未写入');
      return retainCreationAdvisorValue(record,value) as unknown as JsonValue;
    }) as unknown as CreationAdvisorRecovery;
  }
  async #applyCreationAdvisor(runtime:GameRuntime,epoch:number,record:CreationAdvisorRecovery):Promise<void>{
    const workspace=await runtime.updateCreationWorkspace(current=>{
      if(runtime!==this.runtime||epoch!==this.#sessionEpoch)throw new TaskCancelledError();
      return applyCreationAdvisorRecovery(current as unknown as CreationWorkspace,record) as unknown as JsonValue;
    });
    await this.acknowledgeCreationAdvice(record.id);
    if(runtime===this.runtime&&epoch===this.#sessionEpoch)this.#set({creationWorkspace:workspace as Record<string,any>,soulAdviceAppliedId:record.id,pendingCreationAdvice:null,resultRecovery:null});
  }
  async revealCreationAdviceRecovery():Promise<void>{
    const runtime=this.runtime,epoch=this.#sessionEpoch,record=await this.#creationAdvisorRecord(runtime);
    if(!record||runtime!==this.runtime||epoch!==this.#sessionEpoch||this.#view.modelTask)return;
    const pendingCreationAdvice=this.#creationAdvisorPresentation(record,runtime.getWorkspace() as unknown as CreationWorkspace);
    this.#set({pendingCreationAdvice,...(!this.#view.resultRecovery?{resultRecovery:{category:pendingCreationAdvice.status==='conflict'?'conflict' as const:'unknown' as const,stage:'model-result-consume',kind:record.kind,canRetrySameJob:true,message:pendingCreationAdvice.message,phase:'none' as const}}:{}),busy:true});
  }
  async #revealDetachedAdvisor(runtime:GameRuntime,epoch:number,id:string):Promise<void>{
    const record=await this.database.getSetting<any>(soulAdviceRecoveryKey(runtime.slotId));
    if(record?.id!==id||runtime!==this.runtime||epoch!==this.#sessionEpoch||this.#view.modelTask)return;
    if(this.#view.resultRecovery&&this.#view.pendingSoulAdvice?.id!==id&&this.#view.pendingCreationAdvice?.id!==id)return;
    const soul=checkedSoulAdviceRecovery(record,runtime.slotId),creation=checkedCreationAdvisorRecovery(record,runtime.slotId),workspace=runtime.getWorkspace() as unknown as CreationWorkspace;
    const pendingSoulAdvice=soul?this.#soulAdvicePresentation(soul,workspace):null,pendingCreationAdvice=creation?this.#creationAdvisorPresentation(creation,workspace):null,pending=pendingSoulAdvice??pendingCreationAdvice;
    if(!pending)return;
    this.#set({pendingSoulAdvice,pendingCreationAdvice,resultRecovery:{category:pending.status==='conflict'?'conflict':'unknown',stage:'model-result-retrieve',kind:record.kind,canRetrySameJob:true,message:pending.message,phase:'none'},busy:true});
  }
  async acknowledgeCreationAdvice(id:string):Promise<void>{
    const runtime=this.runtime,epoch=this.#sessionEpoch;
    try{
      await runtime.flushPending();const record=await this.#creationAdvisorRecord(runtime);
      if(!record||record.id!==id)throw new TaskCancelledError('原顾问任务已经变化');
      if(!creationAdvisorAlreadyApplied(runtime.getWorkspace() as unknown as CreationWorkspace,record))throw Error('顾问候选尚未保存，原答复仍保留');
      await this.database.updateSetting(soulAdviceRecoveryKey(runtime.slotId),prior=>checkedCreationAdvisorRecovery(prior,runtime.slotId)?.id===id?null:prior);
      if(runtime===this.runtime&&epoch===this.#sessionEpoch)this.#set({pendingCreationAdvice:null,resultRecovery:null});
    }catch(error){if(runtime===this.runtime&&epoch===this.#sessionEpoch)await this.revealCreationAdviceRecovery();throw error;}
  }
  async #consultCreationAdvisor(label:string,kind:CreationAdvisorKind,input:Record<string,any>,target:CreationAdvisorTarget={},signal?:AbortSignal):Promise<CreationAdvisorAnswer>{
    this.#requireModelEnabled();this.#assertSessionAvailable();const runtime=this.runtime,epoch=this.#sessionEpoch;
    if(this.#view.modelTask||this.#soulAdviceApplying)throw Error('请先等待当前构思完成');
    signal?.throwIfAborted();await runtime.flushPending();signal?.throwIfAborted();
    if(runtime!==this.runtime||epoch!==this.#sessionEpoch)throw new TaskCancelledError();
    if(await this.#soulAdviceRecord(runtime))throw Error('还有一份武魂建议等待处理，请先取回或放弃原任务');
    let record=await this.#creationAdvisorRecord(runtime);const recovering=!!record;
    const workspace=runtime.getWorkspace() as unknown as CreationWorkspace;
    if(record){
      if(record.kind!==kind||!jsonEqual(record.input,input)||!jsonEqual(record.target,target))throw Error('还有一份创作答复等待处理，请先取回或放弃原任务');
      const applied=creationAdvisorAlreadyApplied(workspace,record);
      if(!applied&&!creationAdvisorSourceMatches(workspace,record))throw Error('草稿或讨论输入已改变，原答复保留，请先处理原任务');
      if(record.value)return {id:record.id,value:record.value,alreadyApplied:applied};
    }else{
      record=createCreationAdvisorRecovery(workspace,kind,input,target,runtime.slotId);const owned=record;
      await this.database.updateSetting(soulAdviceRecoveryKey(runtime.slotId),prior=>{if(prior)throw Error('还有一份顾问答复等待处理');return owned as unknown as JsonValue;});
    }
    if(signal?.aborted){if(!recovering)await this.database.updateSetting(soulAdviceRecoveryKey(runtime.slotId),prior=>(prior as any)?.id===record!.id?null:prior);signal.throwIfAborted();}
    const value=await this.#runWorkflow(label,kind,input,false,{},undefined,recovering,false,record.id,signal);
    return {id:record.id,value,alreadyApplied:false};
  }
  async consultCreation(description:string,config:Record<string,any>,exchanges:{input:string;reply:string}[]=[],proposal?:{base:string;reply:string;patch:Record<string,any>},reserveSouls?:Record<string,any>[],options:{target?:CreationAdvisorTarget;signal?:AbortSignal}={}){
    return this.#consultCreationAdvisor('角色顾问正在构思','creation-advice',{description,config,exchanges,proposal,reserveSouls},options.target,options.signal);
  }
  async consultCreationItems(description:string,config:Record<string,any>,exchanges:{input:string;reply:string}[]=[],proposal?:{base:string;reply:string;items:Record<string,any>[]},options:{signal?:AbortSignal}={}){
    return this.#consultCreationAdvisor('道具主持人正在构思','creation-item-advice',{description,config,exchanges,proposal},{},options.signal);
  }
  async requestWorkshopAdvice(description:string,config:Record<string,any>,designId:string,exchanges:{input:string;reply:string}[]=[],proposal?:{base:string;reply:string;design:Record<string,any>},options:{signal?:AbortSignal}={}){
    return this.#consultCreationAdvisor('工坊顾问正在构思','creation-workshop-advice',{description,config,designId,exchanges,proposal},{designId},options.signal);
  }

  async nameRingSkillChoices(pendingId: string,retry=false): Promise<void> {
    this.#requireModelEnabled();
    await this.#runWorkflow('构思魂技名称','ring-skills',{pendingId},false,{},retry?this.#newWorkflowAttempt('ring-skills'):undefined);
  }

  async ringDesignDiscussion(target:any):Promise<RingDesignDiscussion>{
    const identity=ringDiscussionIdentity(this.runtime.slotId,target),record=checkedRingDiscussion(await this.database.getSetting(ringDiscussionKey(this.runtime.slotId,target)));
    if(record.identity&&record.identity!==identity)throw Error('保留的讨论属于另一枚魂环，未覆盖原记录');
    return {...record,identity};
  }
  async saveRingDesignDiscussion(target:any,discussion:RingDesignDiscussion,expectedWorldId?:string,expected?:RingDesignDiscussion){
    const runtime=this.runtime,key=ringDiscussionKey(runtime.slotId,target),identity=ringDiscussionIdentity(runtime.slotId,target),value=checkedRingDiscussion({...discussion,identity});
    if(expectedWorldId!==undefined&&runtime.slotId!==expectedWorldId)throw new TaskCancelledError('当前故事已经切换');
    const previous=checkedRingDiscussion(await this.database.getSetting(key));
    if(runtime!==this.runtime)throw new TaskCancelledError('当前故事已经切换');
    if(previous.identity&&previous.identity!==identity)throw Error('保留的讨论属于另一枚魂环，未覆盖原记录');
    const committed=expected===undefined?(await this.database.putSetting(key,value as any),value):checkedRingDiscussion(await this.database.updateSetting(key,prior=>{
      const stored=checkedRingDiscussion(prior);
      if(stored.identity&&stored.identity!==identity)throw Error('保留的讨论属于另一枚魂环，未覆盖原记录');
      const current={...stored,identity};
      return mergeDesignDiscussionEdit(current,checkedRingDiscussion({...expected,identity}),value) as any;
    }));
    const saved=checkedRingDiscussion(await this.database.getSetting(key));
    if(!jsonEqual(saved,committed))throw Error('魂环讨论尚未保存，未发送新的AI请求');
    return saved;
  }
  async consultRingDesign(target:any,options:{signal?:AbortSignal;restart?:boolean}={}):Promise<RingDesignDiscussion>{
    this.#requireModelEnabled();this.#assertSessionAvailable(false,{allowDisconnected:true});
    if(this.#view.modelTask)throw Error('请先等待当前AI请求完成');
    options.signal?.throwIfAborted();
    if(this.#view.connectionError){await this.#restoreModelConnection();options.signal?.throwIfAborted();}
    return this.#withDesignDiscussion(async()=>{
    const runtime=this.runtime,epoch=this.#sessionEpoch;
    const current=()=>{if(runtime!==this.runtime||epoch!==this.#sessionEpoch)throw new TaskCancelledError('当前故事已经切换');};
    if(this.#view.modelTask)throw Error('请先等待当前AI请求完成');
    options.signal?.throwIfAborted();await runtime.flushPending();current();
    const key=ringDiscussionKey(runtime.slotId,target),activeKey=ringActiveDiscussionKey(runtime.slotId);
    let discussion=await this.ringDesignDiscussion(target),recovering=!!discussion.pending&&!discussion.pending.notStarted;current();
    const active=await this.database.getSetting<any>(activeKey);current();
    if(active&&(active.worldId!==runtime.slotId||ringDiscussionKey(runtime.slotId,active.target)!==key))throw Error('另一枚魂环的原讨论仍待处理，请先取回原答复');
    if(options.restart&&!discussion.pending?.notStarted){
      if(!discussion.pending)throw Error('当前没有需要重新发起的魂环讨论');
      await runtime.discardRetainedModel();current();
      const {pending,...rest}=discussion;discussion=rest;recovering=false;
    }
    const input=discussion.pending?.input??{adviceAttemptId:crypto.randomUUID(),target:ringAdviceTarget(target),description:discussion.request.trim(),exchanges:ringDiscussionContext(discussion.exchanges),preserveText:discussion.preserveText!==false,previous:(discussion.answer?.proposals?.length?discussion.answer.proposals:discussion.lastProposals)?.map((p:any)=>({proposal:p.proposal,pass:p.pass,reasons:p.reasons,source:p.source,budget:p.budget}))??null};
    if(!input.description)throw Error('请先描述魂兽来源、已有能力与想要的魂技');
    if(!discussion.pending||discussion.pending.notStarted)discussion=await this.saveRingDesignDiscussion(target,{...discussion,pending:{input}},runtime.slotId);current();
    const pointer={worldId:runtime.slotId,target:input.target};
    await this.database.putSetting(activeKey,pointer);current();
    const storedPointer=await this.database.getSetting(activeKey);current();
    if(!jsonEqual(storedPointer,pointer))throw Error('原讨论入口尚未保存，未发送新的AI请求');
    if(runtime!==this.runtime||epoch!==this.#sessionEpoch)throw new TaskCancelledError();
    let record=discussion;
    const retain=async(value:any)=>{
      const current=checkedRingDiscussion(await this.database.getSetting(key));
      record=retainRingAnswer(current,input,value);
      await this.database.putSetting(key,record as any);
      if(!jsonEqual(checkedRingDiscussion(await this.database.getSetting(key)),record))throw Error('魂环答复尚未保存，原生成任务仍保留');
    };
    let value:any;
    try{value=record.pending?.value??await this.#runWorkflow('AI主持人正在设计魂环','ring-advice',input,false,{},undefined,recovering,false,undefined,options.signal,retain);}
    catch(error){if(modelRequestNotSent(error))await this.#retainUnsentDesign(key,input,checkedRingDiscussion);throw error;}
    current();
    const finished=finishRingAnswer(checkedRingDiscussion(await this.database.getSetting(key)),input,value);
    await this.database.putSetting(key,finished as any);
    if(!jsonEqual(checkedRingDiscussion(await this.database.getSetting(key)),finished))throw Error('魂环讨论尚未完整保存，原答复仍保留');
    await this.database.updateSetting(activeKey,prior=>jsonEqual(prior,pointer)?null:prior);
    return finished;
    });
  }

  async researchDesignDiscussion(category:string):Promise<ResearchDesignDiscussion>{
    const runtime=this.runtime,value=checkedResearchDiscussion(await this.database.getSetting(researchDiscussionKey(runtime.slotId,category)));
    if(runtime!==this.runtime)throw new TaskCancelledError('当前故事已经切换');
    if(value.pending&&value.pending.input.category!==category)throw Error('原工坊讨论与品类不匹配，记录仍保留');
    return value;
  }
  async saveResearchDesignDiscussion(category:string,discussion:ResearchDesignDiscussion,expectedWorldId?:string,expected?:ResearchDesignDiscussion){
    const runtime=this.runtime,key=researchDiscussionKey(runtime.slotId,category),value=checkedResearchDiscussion(discussion);
    if(expectedWorldId!==undefined&&runtime.slotId!==expectedWorldId)throw new TaskCancelledError('当前故事已经切换');
    if(value.pending&&value.pending.input.category!==category)throw Error('原工坊讨论不能写入其他品类');
    const committed=expected===undefined?(await this.database.putSetting(key,value as any),value):checkedResearchDiscussion(await this.database.updateSetting(key,prior=>mergeDesignDiscussionEdit(checkedResearchDiscussion(prior),checkedResearchDiscussion(expected),value) as any));
    if(runtime!==this.runtime)throw new TaskCancelledError('当前故事已经切换');
    if(!jsonEqual(checkedResearchDiscussion(await this.database.getSetting(key)),committed))throw Error('工坊讨论尚未保存，未发送新的AI请求');
    return committed;
  }
  async consultResearchDesign(request:{category:string;materials?:any[];confirmedDesign?:any;basis?:any;ownedOnly?:boolean;goal?:'purpose'|'value'},options:{signal?:AbortSignal;restart?:boolean}={}):Promise<ResearchDesignDiscussion>{
    this.#requireModelEnabled();this.#assertSessionAvailable(false,{allowDisconnected:true});
    if(this.#view.modelTask)throw Error('请先等待当前AI请求完成');
    options.signal?.throwIfAborted();
    if(this.#view.connectionError){await this.#restoreModelConnection();options.signal?.throwIfAborted();}
    return this.#withDesignDiscussion(async()=>{
    const runtime=this.runtime,epoch=this.#sessionEpoch;
    const current=()=>{if(runtime!==this.runtime||epoch!==this.#sessionEpoch)throw new TaskCancelledError('当前故事已经切换');};
    if(this.#view.modelTask)throw Error('请先等待当前AI请求完成');
    options.signal?.throwIfAborted();await runtime.flushPending();current();
    const category=request.category,key=researchDiscussionKey(runtime.slotId,category),activeKey=researchActiveDiscussionKey(runtime.slotId);
    let discussion=await this.researchDesignDiscussion(category),recovering=!!discussion.pending&&!discussion.pending.notStarted;current();
    const active=await this.database.getSetting<any>(activeKey);current();
    if(active&&(active.worldId!==runtime.slotId||active.category!==category))throw Error('另一品类的原工坊讨论仍待处理，请先取回答复');
    if(options.restart&&!discussion.pending?.notStarted){if(!discussion.pending)throw Error('当前没有需要重新发起的工坊讨论');await runtime.discardRetainedModel();current();const {pending,...rest}=discussion;discussion=rest;recovering=false;}
    if(discussion.exchanges.length>=20)throw Error('本轮工坊讨论已有二十次，请先处理候选或清空讨论');
    const input=discussion.pending?.input??{adviceAttemptId:crypto.randomUUID(),category,description:discussion.request.trim(),materials:request.materials??[],ownedOnly:request.ownedOnly!==false,goal:request.goal??'purpose',...(request.confirmedDesign?{confirmedDesign:request.confirmedDesign}:{}),exchanges:discussion.exchanges,previous:discussion.answer?.proposal?.confirmedDesign??null,...(request.basis?{basis:request.basis}:{})};
    if(!input.description)throw Error('请先描述想要制作的作品');
    if(!discussion.pending||discussion.pending.notStarted)discussion=await this.saveResearchDesignDiscussion(category,{...discussion,pending:{input}},runtime.slotId);current();
    const pointer={worldId:runtime.slotId,category};await this.database.putSetting(activeKey,pointer);current();
    if(!jsonEqual(await this.database.getSetting(activeKey),pointer))throw Error('原工坊讨论入口尚未保存，未发送新的AI请求');
    let record=discussion;
    const retain=async(value:any)=>{record=retainResearchAnswer(checkedResearchDiscussion(await this.database.getSetting(key)),input,value);await this.database.putSetting(key,record as any);if(!jsonEqual(checkedResearchDiscussion(await this.database.getSetting(key)),record))throw Error('工坊答复尚未完整保存，原任务仍保留');};
    let value:any;
    try{value=record.pending?.value??await this.#runWorkflow('主持人正在设计作品','research-advice',input,false,{},undefined,recovering,false,undefined,options.signal,retain);}
    catch(error){if(modelRequestNotSent(error))await this.#retainUnsentDesign(key,input,checkedResearchDiscussion);throw error;}current();
    const finished=finishResearchAnswer(checkedResearchDiscussion(await this.database.getSetting(key)),input,value);await this.database.putSetting(key,finished as any);
    if(!jsonEqual(checkedResearchDiscussion(await this.database.getSetting(key)),finished))throw Error('工坊讨论尚未完整保存，原答复仍保留');
    await this.database.updateSetting(activeKey,prior=>jsonEqual(prior,pointer)?null:prior);return finished;
    });
  }

  hasNamingModel(task:'research-narrative'|'ring-item-narrative'|'ring-skill-narrative'):boolean {
    if(!this.#view.modelEnabled)return false;
    const model=resolveTaskProfile(this.#view.modelProfile,task);
    return Boolean(model.baseUrl?.trim()&&model.model?.trim());
  }

  async nameRingItem(itemId:string,retry=false):Promise<void>{
    this.#requireModelEnabled();
    await this.#runWorkflow('记述魂环来历','ring-item',{itemId},false,{},retry?this.#newWorkflowAttempt('ring-item'):undefined);
  }

  async prepareRingItem(payload:{itemId:string;martialSoulId:string;exchangeContracts?:any[];requestedSkills?:any[];evolutionTarget?:any}):Promise<string>{
    const current=(this.#view.snapshot.state as any).物品.实例[payload.itemId];
    const previous=current?.payload?.ringPreparation?.pendingId;
    const events=await this.dispatch('ring.item.prepare',payload);
    const pendingId=String((events[0]?.payload as any)?.pendingId??previous??'');
    if(pendingId&&!previous){
      try{if(this.hasNamingModel('ring-item-narrative'))await this.nameRingItem(payload.itemId);}
      catch(error){if(isTaskCancelled(error))throw error;this.notify('魂环已保留，可以稍后重试描述来源','info');}
      try{if(!payload.requestedSkills&&this.hasNamingModel('ring-skill-narrative'))await this.nameRingSkillChoices(pendingId);}
      catch(error){if(isTaskCancelled(error))throw error;this.notify('魂技方案已保留，可以重试命名或直接选择','info');}
    }
    return pendingId;
  }

  async replacePresetRingSkillChoice(payload:{pendingId:string;candidateId:string}):Promise<void>{
    await this.dispatch('ring.replace-preset',payload);
  }

  async rerollRingSkillChoice(payload:{pendingId:string;candidateId:string}):Promise<void>{
    await this.dispatch('ring.reroll',payload);
    if(this.hasNamingModel('ring-skill-narrative')){
      try{await this.nameRingSkillChoices(payload.pendingId);}
      catch(error){if(isTaskCancelled(error))throw error;this.notify('新魂技方案已保留，重试取名不会再次重抽','info');}
    }
  }

  async rerollResearchCandidate(payload:{pendingId:string;candidateIndex:number}):Promise<void>{
    await this.dispatch('research.reroll',payload);
    if(this.#view.modelEnabled){
      try{await this.resolveResearchNaming(payload.pendingId);}
      catch(error){if(isTaskCancelled(error))throw error;this.notify('新作品方案已保留，重试取名不会再投入材料','info');}
    }
  }

  async prepareRingSkillChoice(payload: {lootId: string; martialSoulId: string}): Promise<string> {
    const events = await this.dispatch('ring.prepare-choice', payload);
    const pendingId = String((events[0]?.payload as any)?.pendingId ?? '');
    if (pendingId && this.hasNamingModel('ring-skill-narrative')) {
      try { await this.nameRingSkillChoices(pendingId); }
      catch (error) { if (isTaskCancelled(error)) throw error; this.notify('魂技方案已保留，可重试命名或直接采用当前名称', 'info'); }
    }
    return pendingId;
  }

  async prepareRingFromBeast(payload:{beastUnitId:string;martialSoulId:string;exchangeContracts?:any[];requestedSkills?:any[];evolutionTarget?:any}):Promise<string> {
    const events=await this.dispatch('ring.prepare-from-beast',payload);
    const state=this.#view.snapshot.state as any;
    const profile=(Object.values(state.魂兽档案?.列表 ?? {}) as any[]).find(item=>item.单位ID===payload.beastUnitId);
    const pendingId=String((events[0]?.payload as any)?.pendingId ?? (Object.values(state.魂环?.待选择 ?? {}) as any[]).find(item=>item.status==='pending'&&item.beastProfileId===profile?.id)?.id ?? '');
    if(pendingId && events.length && !payload.requestedSkills && this.hasNamingModel('ring-skill-narrative')) {
      try {await this.nameRingSkillChoices(pendingId);}
      catch(error) {if(isTaskCancelled(error))throw error;this.notify('魂技方案已经保存，可以继续选择或稍后重试命名','info');}
    }
    return pendingId;
  }

  readonly #researchNaming = new Set<string>();
  async resolveResearchNaming(pendingId: string, useLocal = false,retry=false,attempt?:{value?:WorkflowAttempt}): Promise<void> {
    const state = this.#view.snapshot.state as any;
    const pending = state?.研发?.待处理?.[pendingId];
    if (!pending || pending.actorId!==state.角色.主控单位ID || (pending.status !== 'awaiting-llm' && !pending.pendingNamingIds?.length)) throw new Error('当前没有需要补充名称的研发方案。');
    const mechanicsHash = pending.mechanicsHash;
    if(this.#researchNaming.has(pendingId)||this.#view.modelTask)throw new Error('还有正在进行的取名请求，请等待完成或取消后重试');
    const epoch=this.#sessionEpoch;
    this.#researchNaming.add(pendingId);
    try {
    await this.dispatch('research.naming-status',{pendingId,mechanicsHash,phase:'running'});
    if(retry)attempt=this.#newWorkflowAttempt('research');
    await this.#runWorkflow('构思作品名称','research',{pendingId},useLocal||!this.hasNamingModel('research-narrative')||pending.mechanicCandidates.every((candidate:any)=>Boolean(candidate.presetId)),{},attempt);
    const ready=(this.#view.snapshot.state as any)?.研发?.待处理?.[pendingId];
    if(epoch===this.#sessionEpoch&&ready?.status==='candidates-ready'&&!ready.pendingNamingIds?.length&&ready.mechanicCandidates.length===1&&ready.mechanicCandidates[0].presetId&&ready.successfulIndexes.length===1){
      const candidateIndex=ready.successfulIndexes[0];
      if(ready.candidates[candidateIndex]?.normalized?.candidateId===ready.mechanicCandidates[0].candidateId)await this.dispatch('research.choose',{pendingId,candidateIndex});
    }
    } catch(error) {
      const current=(this.#view.snapshot.state as any)?.研发?.待处理?.[pendingId];
      if(epoch===this.#sessionEpoch&&current?.actorId===pending.actorId&&current?.mechanicsHash===mechanicsHash){
        await this.dispatch('research.naming-status',{pendingId,mechanicsHash,phase:isTaskCancelled(error)?'cancelled':'failed',reason:isTaskCancelled(error)?'本次取名已取消或被中断。':describeError(error,this.#view.snapshot.state)});
      }
      throw error;
    } finally {this.#researchNaming.delete(pendingId);}
  }

  async beginResearch(payload: Record<string, unknown>): Promise<string> {
    const events = await this.dispatch('research.begin', payload);
    const pendingId = String((events[0]?.payload as any)?.pendingId ?? '');
    const pending = (this.#view.snapshot.state as any)?.研发?.待处理?.[pendingId];
    if (!pending||pending.status==='candidates-ready') return pendingId;
    if (this.hasNamingModel('research-narrative')) {
      try { await this.resolveResearchNaming(pendingId); }
      catch (error) { if (isTaskCancelled(error)) throw error; this.notify('作品方案已保留，不会再次投入材料；可重试命名或采用当前名称', 'info'); }
    } else {
      await this.resolveResearchNaming(pendingId,true);
    }
    return pendingId;
  }

  async proposeTitle(unitId: string): Promise<{title: string; epithet: string}> {
    this.#requireModelEnabled();
    return this.#runWorkflow('构思封号','title',{unitId},false,{},this.#newWorkflowAttempt('title'));
  }

  setModelProfile(profile: Omit<ModelProfile, 'apiKey'>, apiKey?: string): void {
    this.saveSettings({...this.settingsDraft(),modelProfile:profile},apiKey);
  }

  battlePreferences():BattlePreferences{return readBattlePreferences(this.runtime.readSnapshot().state);}
  async saveBattlePreferences(preferences:BattlePreferences,scope:'world'|'battle'='world'):Promise<void>{if(scope==='battle'&&preferences.defaultMode==='auto')this.#battleTurns.paused=false;await this.dispatch('battle.set-preferences',{scope,preferences});}

  settingsDraft() {
    const {performance,sound,modelEnabled,modelCombatEnabled,modelProfile}=this.#view;
    return clone({performance,sound,modelEnabled,modelCombatEnabled,modelProfile:adoptModelLibrary(modelProfile)});
  }

  saveSound(sound:SoundSettings):void {
    const next=validateSound(sound);
    this.preferences.set('settings-v2',{...this.settingsDraft(),sound:next} as any);
    this.#set({sound:next});
  }

  saveSettings(input:ReturnType<WebGameController['settingsDraft']>,apiKey?:string,credentialHeaders?:Record<string,string>,writerApiKey?:string):void|Promise<void> {
    const source=input.modelProfile;
    const profile=adoptModelLibrary(source.modelLibrary?source:{...source,writer:normalizeWriterProfile(source.id,source.writer)});
    const keys:Record<string,string>={};if(apiKey!==undefined)keys[source.id]=apiKey;if(writerApiKey!==undefined&&source.writer)keys[profile.modelLibrary![0].id]=writerApiKey;
    return this.saveModelLibrary({...input,modelProfile:profile},keys,credentialHeaders?{[source.id]:credentialHeaders}:{});
  }

  saveModelLibrary(input:ReturnType<WebGameController['settingsDraft']>,keys:Record<string,string>={},headers:Record<string,Record<string,string>>={}):void|Promise<void> {
    const modelProfile=normalizeModelLibrary(adoptModelLibrary(input.modelProfile)),models=modelProfile.modelLibrary!;
    const previous=adoptModelLibrary(this.#view.modelProfile).modelLibrary!;
    const settings={...input,sound:validateSound(input.sound),modelProfile};
    const writes=models.map(model=>{
      const same=this.modelCredentialMatches(model);
      return {id:model.id,baseUrl:model.baseUrl,transport:model.transport,apiKey:keys[model.id]??(same?this.modelKeys.getKey(model.id):''),credentialHeaders:headers[model.id]??(same&&keys[model.id]!==''?this.modelKeys.getHeaders(model.id):{})};
    });
    for(const old of previous)if(!models.some(model=>model.id===old.id))writes.push({id:old.id,baseUrl:old.baseUrl,transport:old.transport,apiKey:'',credentialHeaders:{}});
    return this.modelKeys.replace(writes,()=>{
      this.preferences.set('settings-v2',settings as any);
      if(settings.modelEnabled!==this.#view.modelEnabled||settings.modelCombatEnabled!==this.#view.modelCombatEnabled){this.#modelTasks.cancel();this.#cancelPersonWork();}
      this.#set(settings);
    });
  }

  async savePromptSettings(input:ReturnType<WebGameController['settingsDraft']>,keys:Record<string,string>,prompts:StoryPromptConfig):Promise<void>{
    const previous=await this.database.getSetting<JsonValue>('story-prompts')??emptyStoryPromptConfig() as unknown as JsonValue;
    // The asynchronous store is written first; a failed settings write restores it.
    await this.saveStoryPrompts(prompts);
    try{await this.saveModelLibrary(input,keys);}catch(error){await this.database.putSetting('story-prompts',previous);throw error;}
  }

  #observeModel=(log:ModelLog)=>{this.#modelTasks.progress(`${log.label} · ${log.status}`);this.#set({modelLogs:[log,...this.#view.modelLogs.filter(item=>item.id!==log.id)].slice(0,8)});};

  #newWorkflowAttempt(kind:string):{value?:WorkflowAttempt}{
    const snapshot=this.runtime.readSnapshot();return {value:{id:crypto.randomUUID(),source:workflowAttemptSource(snapshot.state,kind,snapshot.revision)}};
  }

  async #runWorkflow(label:string,kind:string,input:Record<string,unknown>={},local=false,dispatchOptions:{avatar?:AvatarRecord|null}={},attempt?:{value?:WorkflowAttempt},recoverOnly=false,adviceRecovery=false,adviceId?:string,externalSignal?:AbortSignal,retainReadOnlyValue?:(value:any)=>Promise<void>):Promise<any>{
    const runtime=this.runtime,epoch=this.#sessionEpoch;let remoteAttempted=false;
    try{
      const advice=kind==='advice'?await this.#soulAdviceRecord(runtime):null;
      const creationAdvice=['creation-advice','creation-item-advice','creation-workshop-advice'].includes(kind)?await this.#creationAdvisorRecord(runtime):null;
      if(epoch!==this.#sessionEpoch||runtime!==this.runtime)throw new TaskCancelledError();
      if(advice&&(!jsonEqual(advice.input,input)||adviceId&&advice.id!==adviceId))throw Error('原顾问任务已经变化，请先处理原建议');
      if(creationAdvice&&(!jsonEqual(creationAdvice.input,input)||adviceId&&creationAdvice.id!==adviceId))throw Error('原顾问任务已经变化，请先处理原答复');
      const result=await this.#modelRequest(label,signal=>{remoteAttempted=true;return runtime.model({kind,input,local,...(recoverOnly?{recoverOnly:true}:{}),...(attempt?.value?{retryAttempt:attempt.value}:{}),...(local||recoverOnly?{}:{profile:{...this.#writerCredentials(this.#view.modelProfile),apiKey:this.modelKeys.getKey(this.#view.modelProfile.id),credentialHeaders:this.modelKeys.getHeaders(this.#view.modelProfile.id)}})},signal,log=>{
        if(!signal.aborted&&epoch===this.#sessionEpoch&&runtime===this.runtime)this.#observeModel(log);
      },advice?async value=>{await this.#retainSoulAdvice(runtime,advice.id,value);}:creationAdvice?async value=>{await this.#retainCreationAdvisor(runtime,creationAdvice.id,value);}:retainReadOnlyValue).catch(async error=>{
        if(error instanceof CloudError&&error.code==='cancelled'&&error.recovery?.stage==='model-cancel-confirmed'){
          const id=advice?.id??creationAdvice?.id;let cleared=false;
          if(id)await this.database.updateSetting(soulAdviceRecoveryKey(runtime.slotId),prior=>{const v=prior as any;cleared=v?.id===id&&!v.value;return cleared?null:prior;});
          if(cleared&&runtime===this.runtime&&!this.#view.modelTask)this.#set({pendingSoulAdvice:null,pendingCreationAdvice:null,resultRecovery:null});
        }
        throw error;
      });},externalSignal);
      if(epoch!==this.#sessionEpoch||runtime!==this.runtime)throw new TaskCancelledError();
      if(advice){
        // Real cloud transport retains before releasing. The fallback also
        // supports local engines which return a value without a consume hook.
        const ready=await this.#retainSoulAdvice(runtime,advice.id,result.value);
        await this.#applySoulAdvice(runtime,epoch,ready,adviceRecovery);
      }
      if(creationAdvice)await this.#retainCreationAdvisor(runtime,creationAdvice.id,result.value);
      if(retainReadOnlyValue)await retainReadOnlyValue(result.value);
      if(epoch!==this.#sessionEpoch||runtime!==this.runtime)throw new TaskCancelledError();
      if(attempt&&Object.hasOwn(result,'retryAttempt'))attempt.value=result.retryAttempt??undefined;
      if(result.ticket)await this.dispatch('workflow.apply',{ticket:result.ticket},dispatchOptions);
      if(epoch!==this.#sessionEpoch||runtime!==this.runtime)throw new TaskCancelledError();
      this.#recoveryWorkflow=null;this.#set({resultRecovery:null,...(['story-writer','story-rewrite'].includes(kind)?{storyError:null}:{})});
      return result.value;
    }catch(error){
      const notSent=!recoverOnly&&modelRequestNotSent(error);
      if(notSent&&runtime===this.runtime&&epoch===this.#sessionEpoch){this.#recoveryWorkflow=null;this.#set({resultRecovery:null});}
      if(notSent&&adviceId){
        await this.database.updateSetting(soulAdviceRecoveryKey(runtime.slotId),prior=>(prior as any)?.id===adviceId&&!(prior as any).value?null:prior);
        if(runtime===this.runtime&&epoch===this.#sessionEpoch&&!this.#view.modelTask&&(this.#view.pendingSoulAdvice?.id===adviceId||this.#view.pendingCreationAdvice?.id===adviceId))this.#set({pendingSoulAdvice:null,pendingCreationAdvice:null,resultRecovery:null});
      }
      if(!remoteAttempted&&!recoverOnly&&adviceId&&isTaskCancelled(error))await this.database.updateSetting(soulAdviceRecoveryKey(runtime.slotId),prior=>(prior as any)?.id===adviceId&&!(prior as any).value?null:prior);
      if(adviceId&&(isModelObservationDetached(error)||isModelObservationDetached(externalSignal?.reason)))await this.#revealDetachedAdvisor(runtime,epoch,adviceId);
      if(epoch===this.#sessionEpoch&&runtime===this.runtime&&!isTaskCancelled(error)&&!notSent){
        if(kind==='advice'){
          const record=await this.#soulAdviceRecord(runtime);
          if(record){
            const pendingSoulAdvice=this.#soulAdvicePresentation(record,runtime.getWorkspace() as unknown as CreationWorkspace|null);
            this.#set({pendingSoulAdvice,resultRecovery:{category:pendingSoulAdvice.status==='conflict'?'conflict':'unknown',stage:'model-result-retrieve',kind:'advice',canRetrySameJob:true,message:pendingSoulAdvice.status==='conflict'?pendingSoulAdvice.message:describeError(error),phase:'none'}});
          }
        }
        if(['creation-advice','creation-item-advice','creation-workshop-advice'].includes(kind)){
          const record=await this.#creationAdvisorRecord(runtime);if(record){const pendingCreationAdvice=this.#creationAdvisorPresentation(record,runtime.getWorkspace() as unknown as CreationWorkspace);this.#set({pendingCreationAdvice,resultRecovery:{category:pendingCreationAdvice.status==='conflict'?'conflict':'unknown',stage:'model-result-retrieve',kind,canRetrySameJob:true,message:pendingCreationAdvice.message,phase:'none'}});}
        }
        const pending=await runtime.pendingRecovery().catch(()=>({phase:'none' as const,rejection:undefined}));
        const recoverable=error instanceof CloudError&&['model-save-pending','model-evidence-pending','model-result-pending','model-result-unverified','model-unconfirmed','model-recovery-unavailable','model-expired','session-expired','save-unacknowledged','connection-lost'].includes(error.code);
        if(epoch!==this.#sessionEpoch||runtime!==this.runtime)throw error;
        const terminalAuthor=error instanceof CloudError&&error.recovery?.stage==='model-result-failed'&&['story-writer','story-rewrite'].includes(kind);
        if(terminalAuthor&&pending.phase==='none'){
          this.#recoveryWorkflow=null;this.#set({resultRecovery:null});
        }else if(recoverable||pending.phase!=='none'||error instanceof CloudError&&error.recovery?.stage==='model-result-failed'){
          this.#recoveryWorkflow={runtime,epoch,label,kind,input:clone(input),local,dispatchOptions,attempt};
          const details=error instanceof CloudError?error.recovery:undefined;
          this.#set({resultRecovery:{category:classifyResultFailure(error),stage:'save-progress',canRetrySameJob:!pending.rejection,...details,...(pending.rejection?{rejected:true}:{}),message:describeError(error),phase:pending.phase},busy:true});
        }
      }
      throw error;
    }
  }

  modelCredentialMatches(profile:Omit<ModelProfile,'apiKey'>):boolean {return [this.#view.modelProfile,this.#view.modelProfile.writer,...(this.#view.modelProfile.modelLibrary??[])].some(saved=>saved&&profile.id===saved.id&&(profile.channelMode==='chatgpt')===(saved.channelMode==='chatgpt')&&profile.transport===saved.transport&&credentialScope(profile.baseUrl)===credentialScope(saved.baseUrl));}

  #writerCredentials(profile:Omit<ModelProfile,'apiKey'>,key?:string){
    if(profile.modelLibrary)return {...profile,modelLibrary:profile.modelLibrary.map(model=>({...model,apiKey:this.modelCredentialMatches(model)?this.modelKeys.getKey(model.id):'',credentialHeaders:this.modelCredentialMatches(model)?this.modelKeys.getHeaders(model.id):{}}))};
    const writer=normalizeWriterProfile(profile.id,profile.writer);
    if(!writer)return {...profile,writer:undefined};
    const matches=this.modelCredentialMatches(writer);
    return {...profile,writer:{...writer,apiKey:key??(matches?this.modelKeys.getKey(writer.id):''),credentialHeaders:matches?this.modelKeys.getHeaders(writer.id):{}}};
  }

  previewModel(profile:Omit<ModelProfile,'apiKey'>,apiKey='',credentialHeaders?:Record<string,string>,writerApiKey?:string) {
    rejectInlineCredentials(profile.baseUrl);
    const sameScope=this.modelCredentialMatches(profile);
    const run=async(kind:string,input:Record<string,unknown>,signal?:AbortSignal)=>{
      const result=await this.runtime.model({kind,input,profile:{...this.#writerCredentials(profile,writerApiKey),apiKey:apiKey.trim()||(sameScope?this.modelKeys.getKey(profile.id):''),credentialHeaders:validateHeaders(credentialHeaders??(sameScope?this.modelKeys.getHeaders(profile.id):{}))}},signal,this.#observeModel);
      return result.value;
    };
    return {listModels:(signal?:AbortSignal):Promise<ModelListResult>=>run('list',{},signal),testConnection:(signal?:AbortSignal):Promise<{model:string;message:string}>=>run('test',{},signal),testGeneration:(task:string,signal?:AbortSignal)=>run('generation-test',{task},signal)};
  }

  modelGateway(){return this.previewModel(this.#view.modelProfile);}

  listModels(signal?: AbortSignal): Promise<ModelListResult> {
    return this.#modelRequest('获取模型列表', taskSignal => this.modelGateway().listModels(signal ? AbortSignal.any([signal,taskSignal]) : taskSignal));
  }

  testModel(signal?: AbortSignal): Promise<{model: string; message: string}> {
    return this.#modelRequest('测试模型连接', taskSignal => this.modelGateway().testConnection(signal ? AbortSignal.any([signal,taskSignal]) : taskSignal));
  }

  #requireModelEnabled(): void {
    if (!this.#view.modelEnabled) throw new Error('请先在系统页启用并配置叙事模型');
  }

  async #modelRequest<T>(label: string, request: (signal: AbortSignal) => Promise<T>,externalSignal?:AbortSignal): Promise<T> {
    this.#assertSessionAvailable();
    const personWork=this.#personWorkFlight;
    this.#cancelPersonWork();this.#work(1);
    const runtime=this.runtime,epoch=this.#sessionEpoch;
    try {
      return await this.#modelTasks.run(label,() => String(this.#sessionEpoch),async taskSignal=>{
        const signal=externalSignal?AbortSignal.any([taskSignal,externalSignal]):taskSignal;
        signal.throwIfAborted();
        this.#modelTasks.progress('正在核对本机进度');
        await personWork;
        if(signal.aborted||runtime!==this.runtime||epoch!==this.#sessionEpoch)throw new TaskCancelledError();
        const snapshot=await runtime.flush(true);
        if(signal.aborted||runtime!==this.runtime||epoch!==this.#sessionEpoch)throw new TaskCancelledError();
        const revision=snapshot.revision;
        this.#set({snapshot});
        this.#modelTasks.progress('正在请求AI服务');
        const result=await request(signal);
        if(runtime!==this.runtime||epoch!==this.#sessionEpoch||runtime.revision!==revision)throw new TaskCancelledError('当前旅程已变化，请继续当前进度');
        return result;
      });
    }
    catch (error) {
      if(runtime!==this.runtime||epoch!==this.#sessionEpoch)throw new TaskCancelledError('当前旅程已切换');
      this.#observeCloudFailure(error);
      if (!isTaskCancelled(error)) this.notify(`${label}失败：${describeError(error)}`, 'danger');
      throw error;
    }finally{this.#work(-1);}
  }

  detachModelTask(taskId?:string):void {this.#modelTasks.detach(taskId);}
  cancelModelTask(taskId?:string): void {
    if(taskId&&this.#view.modelTask?.id!==taskId)return;
    this.#modelTasks.cancel(taskId);this.#cancelPersonWork();
    const runtime=this.runtime,epoch=this.#sessionEpoch;
    void runtime.flushPending().then(()=>{if(runtime===this.runtime&&epoch===this.#sessionEpoch)return this.#syncPendingGeneration();}).catch(error=>{if(runtime===this.runtime&&epoch===this.#sessionEpoch)this.notify(describeError(error),'danger');});
  }
  async #syncPendingGeneration():Promise<void>{
    const runtime=this.runtime,epoch=this.#sessionEpoch,pendingGeneration=await runtime.pendingGeneration();
    if(runtime===this.runtime&&epoch===this.#sessionEpoch)this.#set({pendingGeneration,busy:this.#pendingWork>0||Boolean(this.#view.modelTask)||Boolean(pendingGeneration)||Boolean(this.#view.resultRecovery)});
  }
  resumePendingGeneration(regenerate=false):Promise<void>{
    if(this.#recoveryFlight)return this.#recoveryFlight;
    // Resume the original story only after recovery has released its busy state.
    // The normal story loop owns NPC decisions, saved suffixes and the author.
    const flight=this.#resumePendingResult(regenerate).then(async source=>{
      if(!source||source.runtime!==this.runtime||source.epoch!==this.#sessionEpoch)return;
      const story=(this.runtime.readSnapshot().state as any).扩展?.story,turn=story?.active;
      if(story?.branchId!==source.branchId||turn?.number!==source.turn)return;
      if(turn.privatePersonId!==source.privatePersonId){
        if(source.privatePersonId!==undefined||!turn.privateRoute)return;
        try{validatePrivateStoryRoute(turn);}catch{return;}
      }
      const old=this.#view.storyError;
      if(old?.sessionId===source.epoch&&old.branchId===source.branchId&&old.turn===source.turn)this.#set({storyError:null});
      if(turn.status!=='complete'&&this.#view.modelEnabled&&!this.#transitioning)await this.#continueStory();
    });this.#recoveryFlight=flight;
    void flight.finally(()=>{if(this.#recoveryFlight===flight)this.#recoveryFlight=null;}).catch(()=>{});
    return flight;
  }
  async #resumePendingResult(regenerate:boolean):Promise<RecoveredHostStory|undefined>{
    this.#assertSessionAvailable(true);
    const runtime=this.runtime,openingEpoch=this.#sessionEpoch;
    let recoveredCommand:GameCommand|undefined;
    if(this.#view.connectionError){
      // Reconnecting can acknowledge the saved host result. Keep its story
      // identity for continuation; only the durable queue can replay the command.
      recoveredCommand=(await runtime.pendingRecovery()).command??undefined;
      if(runtime!==this.runtime||openingEpoch!==this.#sessionEpoch)throw new TaskCancelledError('当前旅程已切换');
      await this.#restoreModelConnection();
    }
    this.#assertSessionAvailable();
    if(runtime!==this.runtime)throw new TaskCancelledError('当前旅程已切换');
    const epoch=this.#sessionEpoch;
    const current=()=>{if(runtime!==this.runtime||epoch!==this.#sessionEpoch)throw new TaskCancelledError('当前旅程已切换');};
    const wasCreated=Boolean((runtime.readSnapshot().state as any).角色?.已建立);
    this.#work(1);
    try{
      const pending=await runtime.pendingRecovery();
      current();
      const work=this.#recoveryWorkflow?.runtime===runtime&&this.#recoveryWorkflow.epoch===epoch?this.#recoveryWorkflow:null;
      const sourceCommand=pending.command??recoveredCommand;
      const retainedCommand=sourceCommand?.type==='workflow.apply'?(sourceCommand.payload as any)?.ticket?.data?.command:sourceCommand;
      const savedCommand=retainedCommand?.type==='generation.apply'?retainedCommand.payload?.command:retainedCommand;
      const hostInput=savedCommand?(['story.execute','story.supplement'].includes(savedCommand.type)?savedCommand.payload:undefined):work?.kind==='story-host'?work.input:undefined;
      const story=(runtime.readSnapshot().state as any).扩展?.story,active=story?.active;
      const recoveredHost:RecoveredHostStory|undefined=hostInput&&hostInput.branchId===story?.branchId&&hostInput.turn===active?.number
        ?{runtime,epoch,branchId:story.branchId,turn:active.number,...(active.privatePersonId?{privatePersonId:active.privatePersonId}:{})}:undefined;
      if(pending.phase==='command'||pending.phase==='ack'){
        await runtime.flushPending();current();
        const remaining=await runtime.pendingRecovery();
        current();
        if(remaining.phase==='command'&&remaining.command){await runtime.dispatch(remaining.command);current();}
        await runtime.flushPending();current();this.#recoveryWorkflow=null;this.#set({resultRecovery:null,connectionError:null});
        await this.#refreshSessionView();current();this.#resumeOpening(wasCreated);this.notify('原来的结果已保存，可以继续了','success');return recoveredHost;
      }
      const original=pending.original??pending.command;
      const retrySettlement=pending.phase==='awaiting-generation'&&original&&['arena.reconcile','expedition.resolve-battle','research.choose','blueprint.craft'].includes(original.type);
      const finishOriginal=async()=>{current();this.#recoveryWorkflow=null;this.#set({resultRecovery:null,connectionError:null,battleTurnError:null});await this.#refreshSessionView();current();this.#resumeOpening(wasCreated);this.notify('原来的操作已完成，可以继续了','success');};
      if(retrySettlement&&this.#view.resultRecovery?.canRetrySameJob!==true&&await runtime.retryPendingGeneration(original)){
        await finishOriginal();return;
      }
      const creationAdvice=!original?await this.#creationAdvisorRecord(runtime):null;
      if(creationAdvice){
        await runtime.flushPending();current();
        if(!creationAdvisorSourceMatches(runtime.getWorkspace() as unknown as CreationWorkspace,creationAdvice)&&!creationAdvisorAlreadyApplied(runtime.getWorkspace() as unknown as CreationWorkspace,creationAdvice))throw new CloudError('stale-workflow','草稿或讨论输入已改变，原答复保留，请先处理原任务',409);
        if(!creationAdvice.value){
          if(regenerate){this.#requireModelEnabled();await runtime.discardRetainedModel(this.#view.resultRecovery?.jobId);current();}
          await this.#runWorkflow(regenerate?'重新构思':'取回原顾问答复',creationAdvice.kind,creationAdvice.input,false,{},undefined,!regenerate,true,creationAdvice.id);
        }
        const ready=await this.#creationAdvisorRecord(runtime);current();if(!ready||ready.id!==creationAdvice.id)throw new TaskCancelledError();
        await this.#applyCreationAdvisor(runtime,epoch,ready);current();this.#recoveryWorkflow=null;await this.#refreshSessionView();this.notify('原顾问答复已保存，可以查看候选','success');return;
      }
      const advice=!original?await this.#soulAdviceRecord(runtime):null;
      if(advice){
        await runtime.flushPending();current();
        if(!soulAdviceSourceMatches(runtime.getWorkspace() as unknown as CreationWorkspace|null,advice)&&!soulAdviceAlreadyApplied(runtime.getWorkspace() as unknown as CreationWorkspace|null,advice)){
          this.#set({pendingSoulAdvice:this.#soulAdvicePresentation(advice,runtime.getWorkspace() as unknown as CreationWorkspace|null)});
          throw new CloudError('stale-workflow','武魂草稿或讨论输入已改变，原建议保留，请先处理原任务',409);
        }
        if(advice.value)await this.#applySoulAdvice(runtime,epoch,advice,true);
        else{
          if(regenerate){this.#requireModelEnabled();await runtime.discardRetainedModel(this.#view.resultRecovery?.jobId);current();}
          await this.#runWorkflow(regenerate?'重新构思武魂':'取回原武魂建议','advice',advice.input,false,{},undefined,!regenerate,true,advice.id);
        }
        current();this.#recoveryWorkflow=null;await this.#refreshSessionView();current();this.notify('原武魂建议已保存，可以查看并选择是否采用','success');return;
      }
      const researchPointer=!original?await this.database.getSetting<any>(researchActiveDiscussionKey(runtime.slotId)):null;current();
      if(researchPointer){
        if(researchPointer.worldId!==runtime.slotId)throw Error('原工坊讨论与当前故事不符，记录仍保留');
        const discussion=await this.researchDesignDiscussion(researchPointer.category);current();
        if(discussion.pending?.notStarted&&!regenerate){this.#recoveryWorkflow=null;this.#set({resultRecovery:null});this.notify('这次工坊设计尚未向AI发送，请返回设计页继续原设计','info');return;}
        if(discussion.pending)await this.consultResearchDesign(discussion.pending.input,{restart:regenerate});
        else if(discussion.answer)await this.database.updateSetting(researchActiveDiscussionKey(runtime.slotId),prior=>jsonEqual(prior,researchPointer)?null:prior);
        else throw Error('原工坊讨论资料尚未完整读取，请保留记录并重试');
        current();this.#recoveryWorkflow=null;this.#set({resultRecovery:null});await this.#refreshSessionView();current();this.notify('原工坊设计答复已保存，请在对应品类查看','success');return;
      }
      const ringPointer=!original?await this.database.getSetting<any>(ringActiveDiscussionKey(runtime.slotId)):null;current();
      if(ringPointer){
        if(ringPointer.worldId!==runtime.slotId)throw Error('原魂环讨论与当前故事不符，记录仍保留');
        const discussion=await this.ringDesignDiscussion(ringPointer.target);current();
        if(discussion.pending?.notStarted&&!regenerate){this.#recoveryWorkflow=null;this.#set({resultRecovery:null});this.notify('这次魂环设计尚未向AI发送，请返回设计页继续原设计','info');return;}
        if(discussion.pending)await this.consultRingDesign(ringPointer.target,{restart:regenerate});
        else if(discussion.answer)await this.database.updateSetting(ringActiveDiscussionKey(runtime.slotId),prior=>jsonEqual(prior,ringPointer)?null:prior);
        else throw Error('原魂环讨论资料尚未完整读取，请保留记录并重试');
        current();this.#recoveryWorkflow=null;this.#set({resultRecovery:null});await this.#refreshSessionView();current();this.notify('原魂环讨论答复已保存，请在对应魂环处查看方案','success');return;
      }
      if(!work&&!original){this.#set({resultRecovery:null});return recoveredHost;}
      if(work?.kind==='ring-advice'&&!original){
        await this.consultRingDesign((work.input as any).target,{restart:regenerate});current();
        this.#recoveryWorkflow=null;await this.#refreshSessionView();current();
        this.notify('原魂环讨论答复已保存，请在对应魂环处查看方案','success');return;
      }
      if(work?.kind==='research-advice'&&!original){
        await this.consultResearchDesign(work.input as any,{restart:regenerate});current();
        this.#recoveryWorkflow=null;await this.#refreshSessionView();current();this.notify('原工坊设计答复已保存，请在对应品类查看','success');return;
      }
      if(regenerate){
        this.#requireModelEnabled();await runtime.discardRetainedModel(this.#view.resultRecovery?.jobId);current();
        if(retrySettlement&&await runtime.retryPendingGeneration(original)){await finishOriginal();return;}
      }
      const kind=original?'generation':work!.kind,input=original?{commandId:original.id,type:original.type,payload:original.payload}:clone(work!.input);
      // A deliberate new generation has its own bounded recovery allowance;
      // keep the original command so paid checkpoints and settlement stay shared.
      if(regenerate&&['story-writer','story-rewrite'].includes(kind))input.proseAttemptId=crypto.randomUUID();
      const attempt=regenerate&&(input.proseAttemptId||input.creationAttemptId)?undefined:regenerate&&supportsWorkflowAttempt(kind)?this.#newWorkflowAttempt(kind):work?.attempt;
      await this.#runWorkflow(regenerate?'重新生成':'取回并完成原操作',kind,input,work?.local??false,work?.dispatchOptions??{},attempt,!regenerate);
      current();await this.#refreshSessionView();current();this.#resumeOpening(wasCreated);this.notify('这次操作已完成','success');
      return recoveredHost;
    }catch(error){
      if(runtime===this.runtime&&epoch===this.#sessionEpoch&&!isTaskCancelled(error)){
        const pending=await runtime.pendingRecovery().catch(()=>({phase:'none' as const,rejection:undefined}));
        current();
        const details=error instanceof CloudError?error.recovery:undefined;
        if(details?.stage==='model-result-failed'&&['story-writer','story-rewrite'].includes(details.kind??'')&&pending.phase==='none'){
          this.#recoveryWorkflow=null;
          const story=(runtime.readSnapshot().state as any).扩展?.story;
          this.#set({resultRecovery:null,...(story?.active?.status==='resolved'?{storyError:{sessionId:this.#view.sessionId,branchId:story.branchId,turn:story.active.number,message:describeError(error)}}:{})});
        }else this.#set({resultRecovery:{category:classifyResultFailure(error),stage:'save-progress',canRetrySameJob:!pending.rejection,...details,...(pending.rejection?{rejected:true}:{}),message:describeError(error),phase:pending.phase}});
      }
      throw error;
    }finally{if(runtime===this.runtime&&epoch===this.#sessionEpoch)await this.#syncPendingGeneration();this.#work(-1);}
  }
  #resumeOpening(wasCreated:boolean):void {
    const state=this.runtime.readSnapshot().state as any,record=state.世界?.opening?.background;
    if(!wasCreated&&state.角色?.已建立&&record)this.preferences.set(openingPlaybackKey(this.#view.profileId,record.sourceId),{status:'reading',index:0});
  }
  async keepProgressAfterRejectedResult():Promise<void>{
    this.#assertSessionAvailable();
    if(this.#view.modelTask||this.#recoveryFlight||this.#pendingWork||this.#transitioning)throw Error('请先等待当前操作完成');
    const runtime=this.runtime,epoch=this.#sessionEpoch;
    this.#work(1);
    try{
      await runtime.keepProgressAfterRejectedResult();
      if(runtime!==this.runtime||epoch!==this.#sessionEpoch)throw new TaskCancelledError('当前旅程已切换');
      this.#recoveryWorkflow=null;this.#set({resultRecovery:null,loadError:null,connectionError:null});
      await this.#refreshSessionView();this.notify('已保留当前进度，可以继续旅程','success');
    }catch(error){this.#observeCloudFailure(error);throw error;}
    finally{this.#work(-1);}
  }
  async abandonPendingResult():Promise<void>{
    this.#assertSessionAvailable(false,{allowDisconnected:true});if(this.#view.modelTask||this.#recoveryFlight||this.#soulAdviceApplying)throw Error('请先等待当前取回操作结束');
    const runtime=this.runtime;
    let epoch=this.#sessionEpoch,pending=await runtime.pendingRecovery();
    if(runtime!==this.runtime||epoch!==this.#sessionEpoch)throw new TaskCancelledError('当前旅程已切换');
    if(pending.phase==='command'||pending.phase==='ack')throw Error('这次操作已经提交，请先完成保存');
    if(this.#view.connectionError){
      await this.#restoreModelConnection();epoch=this.#sessionEpoch;
      pending=await runtime.pendingRecovery();
      if(runtime!==this.runtime||epoch!==this.#sessionEpoch)throw new TaskCancelledError('当前旅程已切换');
      if(pending.phase==='command'||pending.phase==='ack')throw Error('这次操作已经提交，请先完成保存');
    }
    if(this.#view.modelTask||this.#recoveryFlight||this.#soulAdviceApplying)throw Error('请先等待当前取回操作结束');
    const advice=await this.#soulAdviceRecord(runtime),creationAdvice=await this.#creationAdvisorRecord(runtime),ringPointer=await this.database.getSetting<any>(ringActiveDiscussionKey(runtime.slotId)),researchPointer=await this.database.getSetting<any>(researchActiveDiscussionKey(runtime.slotId));
    if(runtime!==this.runtime||epoch!==this.#sessionEpoch)throw new TaskCancelledError('当前旅程已切换');
    try{await runtime.discardRetainedModel(this.#view.resultRecovery?.jobId);}
    catch(error){if(runtime===this.runtime&&epoch===this.#sessionEpoch)this.#observeCloudFailure(error);throw error;}
    if(runtime!==this.runtime||epoch!==this.#sessionEpoch)throw new TaskCancelledError('当前旅程已切换');
    if(pending.phase==='awaiting-generation'&&pending.command&&!await runtime.cancelPendingGeneration(pending.command))throw Error('原来的操作已经变化，请按当前进度继续');
    if(advice)await this.database.updateSetting(soulAdviceRecoveryKey(runtime.slotId),prior=>checkedSoulAdviceRecovery(prior,runtime.slotId)?.id===advice.id?null:prior);
    if(creationAdvice)await this.database.updateSetting(soulAdviceRecoveryKey(runtime.slotId),prior=>checkedCreationAdvisorRecovery(prior,runtime.slotId)?.id===creationAdvice.id?null:prior);
    if(ringPointer?.worldId===runtime.slotId){
      await this.database.updateSetting(ringDiscussionKey(runtime.slotId,ringPointer.target),prior=>{
        const record=checkedRingDiscussion(prior);
        if(!record.pending||!jsonEqual(record.pending.input.target,ringPointer.target))return prior;
        const {pending,...kept}=record;return kept as any;
      });
      await this.database.updateSetting(ringActiveDiscussionKey(runtime.slotId),prior=>jsonEqual(prior,ringPointer)?null:prior);
    }
    if(researchPointer?.worldId===runtime.slotId){
      await this.database.updateSetting(researchDiscussionKey(runtime.slotId,researchPointer.category),prior=>{const record=checkedResearchDiscussion(prior);if(record.pending?.input.category!==researchPointer.category)return prior;const {pending,...kept}=record;return kept as any;});
      await this.database.updateSetting(researchActiveDiscussionKey(runtime.slotId),prior=>jsonEqual(prior,researchPointer)?null:prior);
    }
    if(runtime===this.runtime&&epoch===this.#sessionEpoch){this.#recoveryWorkflow=null;this.#set({resultRecovery:null,pendingSoulAdvice:null,pendingCreationAdvice:null});await this.#syncPendingGeneration();this.notify('已放弃这次尚未执行的操作','info');}
  }

  clearModelLogs():void {this.#set({modelLogs:[]});}
  modelEvidence(){return this.runtime.modelEvidence();}
  async exportModelEvidence():Promise<string>{
    const worldId=this.runtime.slotId;
    try{this.database.rememberModelSecrets({...this.#writerCredentials(this.#view.modelProfile),apiKey:this.modelKeys.getKey(this.#view.modelProfile.id),credentialHeaders:this.modelKeys.getHeaders(this.#view.modelProfile.id)});}catch{}
    const records=await this.database.listModelEvidence(worldId);
    return JSON.stringify(this.database.sanitizeDiagnostic({format:'douluo-model-evidence',version:1,worldId,exportedAt:new Date().toISOString(),readOnly:true,records}));
  }

  #eventVisible(event:GameEvent):boolean{
    return event.audienceIds===undefined||event.audienceIds.includes((this.#view.snapshot.state as any).角色?.主控单位ID);
  }
  #cancelPersonWork():void{this.#personWorkAbort?.abort();this.#personWorkAttempt='';}
  async retryPersonWorldWork():Promise<void>{
    if(this.#view.busy||this.#view.modelTask)return;
    const runtime=this.runtime,epoch=this.#sessionEpoch;
    this.#work(1);
    try{
      this.#requireModelEnabled();await this.#personWorkFlight;
      if(runtime!==this.runtime||epoch!==this.#sessionEpoch)throw new TaskCancelledError();
      await runtime.flushPending();
      const revision=runtime.revision,work=await this.query('world.people-work',{revision,scope:'background'}) as any;
      if(runtime!==this.runtime||epoch!==this.#sessionEpoch||runtime.revision!==revision)throw new TaskCancelledError();
      if(work.pending)await this.#runWorkflow('等待人物回应','world-people',{scope:'background'},false,{},this.#newWorkflowAttempt('world-people'));
    }catch(error){if(!isTaskCancelled(error)&&runtime===this.runtime&&epoch===this.#sessionEpoch&&!this.#view.resultRecovery)this.notify(describeError(error),'danger');}
    finally{this.#work(-1);}
  }
  #queuePersonWork():void{
    const v=this.#view,profile=v.modelProfile;
    if(this.#preparingUpdate||this.#personWorkFlight||!v.ready||v.connecting||v.busy||this.#transitioning||this.#storyRunning||v.loadError||v.connectionError||!v.modelEnabled||!(v.snapshot.state as any).角色?.已建立)return;
    const active=(v.snapshot.state as any).扩展?.story?.active;if(active&&active.status!=='complete')return;
    const assigned=resolveTaskProfile(profile,'npc-autonomy');
    if(!assigned.baseUrl||!assigned.model)return;
    const runtime=this.runtime,epoch=this.#sessionEpoch,key=`${epoch}:${runtime.revision}`;
    if(this.#personWorkAttempt===key)return;
    const abort=new AbortController();this.#personWorkAbort=abort;this.#personWorkAttempt=key;
    const flight=(async()=>{
      try{
        while(!abort.signal.aborted&&runtime===this.runtime&&epoch===this.#sessionEpoch&&!this.#view.busy){
          const active=(runtime.readSnapshot().state as any).扩展?.story?.active;if(active&&active.status!=='complete')return;
          this.#personWorkAttempt=`${epoch}:${runtime.revision}`;
          let result=await runtime.backgroundPeople({...this.#writerCredentials(profile),apiKey:this.modelKeys.getKey(profile.id),credentialHeaders:this.modelKeys.getHeaders(profile.id)},abort.signal);
          if(!result&&(await this.storyMemorySettings()).autoSummarize)result=await runtime.backgroundSummary({...this.#writerCredentials(profile),apiKey:this.modelKeys.getKey(profile.id),credentialHeaders:this.modelKeys.getHeaders(profile.id)},abort.signal);
          if(runtime!==this.runtime||epoch!==this.#sessionEpoch)return;
          // An already durable apply finishes even after cancellation. Reflect its
          // saved revision; foreground commands flush before taking their revision.
          if(result)this.#set({snapshot:result.snapshot,events:[...this.#view.events,...result.events].slice(-160)});
          if(!result)return;
        }
      }catch{/* The original wait survives. Foreground activity or reload can retry;
                no private NPC prompt, name or failure is shown as player news. */}
    })();
    this.#personWorkFlight=flight;
    void flight.finally(()=>{
      if(this.#personWorkFlight!==flight)return;
      this.#personWorkFlight=null;this.#personWorkAbort=null;
      if(abort.signal.aborted)queueMicrotask(()=>this.#queuePersonWork());
    });
  }

  async reportFailure(stage:string,error:unknown,details:Record<string,unknown>={},worldId=this.runtime.slotId):Promise<void>{
    try{this.database.rememberModelSecrets({...this.#writerCredentials(this.#view.modelProfile),apiKey:this.modelKeys.getKey(this.#view.modelProfile.id),credentialHeaders:this.modelKeys.getHeaders(this.#view.modelProfile.id)});}catch{}
    await this.database.recordDiagnostic(worldId,{stage,status:'failed',revision:this.runtime.revision,details,error});
  }
  async exportDiagnostics(worldId=this.runtime.slotId,versions:unknown={}):Promise<string>{
    try{this.database.rememberModelSecrets({...this.#writerCredentials(this.#view.modelProfile),apiKey:this.modelKeys.getKey(this.#view.modelProfile.id),credentialHeaders:this.modelKeys.getHeaders(this.#view.modelProfile.id)});}catch{}
    const report=await this.database.exportDiagnostics(worldId);
    const context=worldId===this.runtime.slotId?diagnosticValue(this.database.sanitizeDiagnostic({loadError:this.#view.loadError,connectionError:this.#view.connectionError??null,reconnecting:!!this.#view.reconnecting,pendingWork:this.#pendingWork,transitioning:this.#transitioning,runtimeConnection:this.runtime.connectionDiagnostics(),busy:this.#view.busy,modelTask:this.#view.modelTask,currentRevision:this.runtime.revision,liveSnapshot:diagnosticSnapshot(this.runtime.getSnapshot()),route:typeof location==='undefined'?null:location.hash,modelLogs:this.#view.modelLogs.slice(-10).map(log=>({id:log.id,at:log.at,label:log.label,status:log.status,elapsedMs:log.detail?.elapsedMs})),modelSettingsAtExport:{model:this.#view.modelProfile.model,baseUrl:this.#view.modelProfile.baseUrl}})):null;
    let storageEstimate:unknown=null;
    try{if(typeof navigator!=='undefined'&&navigator.storage?.estimate)storageEstimate=await navigator.storage.estimate();}catch(error){storageEstimate={error:this.database.sanitizeDiagnostic(error)};}
    const environment={userAgent:typeof navigator==='undefined'?null:navigator.userAgent,language:typeof navigator==='undefined'?null:navigator.language,online:typeof navigator==='undefined'?null:navigator.onLine,origin:typeof location==='undefined'?null:location.origin,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,storageEstimate};
    return stringifyDiagnostic(this.database.sanitizeDiagnostic({...report,versions:diagnosticValue(versions),environment,context}));
  }

  async installDesktopUpdate<T extends {phase:string}>(install:()=>Promise<T>):Promise<T>{
    if(this.#desktopInstallPending)throw Error('已在准备更新');
    if((this.#view.snapshot.state as any)?.战斗?.状态==='进行中')throw Error('请先结束当前战斗再安装更新');
    this.#desktopInstallPending=true;
    try{
      await this.prepareUpdate();
      if((await this.runtime.pendingRecovery()).phase!=='none')throw Error('请先完成待保存的行动');
      const result=await install();
      if(result.phase!=='installing'){this.#desktopInstallPending=false;this.#preparingUpdate=false;}
      return result;
    }catch(error){this.#desktopInstallPending=false;this.#preparingUpdate=false;throw error;}
  }

  async prepareUpdate():Promise<void> {
    if(this.#personWorkFlight||this.#pendingWork>0||this.#transitioning||this.#view.modelTask||this.#view.busy&&!this.#view.loadError)throw new Error('请等待当前操作完成后再更新');
    const runtime=this.runtime,epoch=this.#sessionEpoch;
    this.#preparingUpdate=true;
    // Every completed action is already durable. Wait for local writes without
    // reconnecting an old client, replaying a command or acknowledging a result.
    try{
      let saved=true;
      if(this.#view.loadError)await runtime.waitForLocalWrites();
      else saved=await runtime.savedProgressMatches();
      if(runtime!==this.runtime||epoch!==this.#sessionEpoch||this.#pendingWork>0||this.#view.modelTask)throw new Error('旅程正在变化，请等待当前操作完成后再更新');
      if(!this.#view.loadError&&!saved)throw new Error('当前进度尚未保存，请先到存档中保存后再更新');
    }catch(error){this.#preparingUpdate=false;throw error;}
  }

  #assertSessionAvailable(allowRecovery=false,{allowDisconnected=false}={}): void {
    if(this.#view.connecting&&!allowRecovery)throw new TaskCancelledError('正在连接本机进度，连接完成后即可行动');
    if(this.#desktopInstallPending)throw new TaskCancelledError('正在准备更新，请稍候');
    if (this.#transitioning) throw new TaskCancelledError('正在读取旅程，请稍候');
    if(!allowRecovery&&!allowDisconnected&&this.#view.connectionError)throw new CloudError('connection-lost',this.#view.connectionError,503);
    if (this.#view.loadError&&!allowRecovery) throw new Error(this.#view.loadError);
  }

  #designDiscussionBusy=false;
  async #withDesignDiscussion<T>(run:()=>Promise<T>):Promise<T>{
    if(this.#designDiscussionBusy)throw Error('请先等待当前设计完成');
    this.#designDiscussionBusy=true;this.#work(1);
    try{return await run();}finally{this.#designDiscussionBusy=false;this.#work(-1);}
  }

  #work(delta: number): void {
    if(delta>0){this.#preparingUpdate=false;this.#cancelPersonWork();}
    this.#pendingWork += delta;
    this.#set({busy:this.#pendingWork > 0 || Boolean(this.#view.modelTask)||Boolean(this.#view.pendingGeneration)||Boolean(this.#view.resultRecovery)});
  }

  async #replaceSession(operation: () => Promise<void>,options:{reconnect?:boolean;destination?:string}={}): Promise<void> {
    this.#assertSessionAvailable(true);
    // Initial open only reads the old world. A different save has its own queue.
    const leavingStartup=this.#view.connecting&&options.destination!==undefined&&options.destination!==this.runtime.slotId;
    this.#battleTurns.retire();
    this.#transitioning = true;
    this.#sessionEpoch += 1;
    if(options.reconnect){
      if(this.#recoveryWorkflow?.runtime===this.runtime)this.#recoveryWorkflow={...this.#recoveryWorkflow,epoch:this.#sessionEpoch};
    }else{this.#recoveryWorkflow=null;this.#recoveryFlight=null;this.#set({resultRecovery:null});}
    if(options.reconnect)this.#modelTasks.detach();else this.#modelTasks.cancel();
    this.#work(1);
    let completed=false,failed=false;
    const priorRuntime=this.runtime;
    try {
      // load already drains the runtime queue. Recovery must reconnect before
      // it resumes the same durable operation, rather than use the broken bearer.
      if(!options.reconnect&&!leavingStartup)await this.runtime.flushPending();
      await operation();completed=true;
    }
    catch(error){failed=true;await this.reportFailure('journey.replace',error);throw error;}
    finally {
      try {
        if(completed||!options.reconnect&&!leavingStartup)await this.runtime.flushPending();
        if(options.reconnect&&completed&&['command','ack'].includes(this.#view.resultRecovery?.phase??'')&&(await this.runtime.pendingRecovery()).phase==='none'){
          this.#recoveryWorkflow=null;this.#set({resultRecovery:null});
        }
        if(completed||!leavingStartup)await this.#refreshSessionView();
        if(completed)this.#set({ready:true,connecting:false,loadError:null,connectionError:null});
      } catch(error) {
        await this.reportFailure('journey.refresh-view',error);
        if(!failed)throw error;
      } finally {
        if(priorRuntime!==this.runtime)void priorRuntime.close().catch(()=>{});
        this.#battleTurns=this.#newBattleProgression();
        this.#transitioning = false; this.#work(-1);
      }
    }
  }

  clearModelKey():void|Promise<void>{
    this.#modelTasks.cancel();this.#cancelPersonWork();
    const done=this.modelKeys.clearKey(this.#view.modelProfile.id);
    const notify=()=>this.notify('本机保存的模型密钥已删除','info');
    if(done)return done.then(notify);
    notify();
  }

  async listSlots(): Promise<SaveSlotRecord[]> {
    const records=await this.database.listSlots(),worldId=this.runtime.slotId;
    if (!records.some(record=>record.slotId===worldId && isWorld(record))) return [];
    const manualIds=[1,2,3].map(position=>`${worldId}:manual:${position}`);
    return records.filter(record=>record.profileId===worldId && (record.slotId===worldId || (record.kind==='checkpoint' && manualIds.includes(record.slotId))));
  }

  async listHistory(): Promise<NarrativeRecord[]> {
    return (await this.database.listEvents(this.runtime.slotId)).filter(r=>this.#eventVisible(r.event));
  }

  async listBackups(): Promise<BackupRecord[]> {
    return this.database.listBackups(this.runtime.slotId);
  }

  async listJourneyRecovery():Promise<JourneyRecoveryChoice[]> {
    const runtime=this.runtime,epoch=this.#sessionEpoch;
    const [backups,slots]=await Promise.all([this.database.listBackups(runtime.slotId),this.database.listSlots()]);
    if(runtime!==this.runtime||epoch!==this.#sessionEpoch)throw new TaskCancelledError();
    const inspections=new Map<object,{pass:boolean;outsideActivity:boolean}>();
    for(const {record} of recoveryCandidates(runtime.slotId,backups,slots)){
      const result=await this.query('recovery.inspect',{snapshot:record.snapshot},new AbortController().signal);
      if(runtime!==this.runtime||epoch!==this.#sessionEpoch)throw new TaskCancelledError();
      inspections.set(record,result);
    }
    return rankRecoveryChoices(this.#view.snapshot.state,runtime.slotId,backups,slots,inspections);
  }

  async saveAs(slotId: string, label: string): Promise<void> {
    this.#assertSessionAvailable();
    await this.runtime.saveAs(slotId, label);
    this.notify(`已保存到“${label}”`, 'success');
  }

  async saveManualSlot(position:number):Promise<void> {
    if(![1,2,3].includes(position))throw new Error('请选择1至3号存档位');
    const head=this.runtime.getSlotHead();
    if(!head||head.autosaveEmpty)throw new Error('请先创建角色或读取已有进度');
    await this.saveAs(`${this.runtime.slotId}:manual:${position}`,`手动存档 ${position}`);
  }

  async deleteSave(slotId:string):Promise<void> {
    await this.#replaceSession(async()=>{
      const record=await this.database.loadSlot(slotId);
      if(!record || record.profileId!==this.runtime.slotId)throw new Error('请先选择该存档所属的世界');
      if(slotId===this.runtime.slotId){
        const runtime=this.#runtimeFactory({database:this.database,slotId});
        await this.database.removeRecords(slotId,'autosave',await runtime.blankSnapshot());
        await runtime.open();this.#runtime=runtime;
      } else await this.database.deleteSlot(slotId);
    });
  }

  async deleteWorld(profileId:string):Promise<void> {
    await this.#replaceSession(async()=>{
      if (!isWorld(await this.database.loadSlot(profileId))) throw new Error('没有找到该世界');
      await this.database.removeRecords(profileId,'world');
      if(this.runtime.slotId===profileId){
        const profiles=(await this.saveMenu()).profiles.filter(profile=>profile.current);
        const nextId=profiles[0]?.slotId ?? `profile-${crypto.randomUUID()}`;
        this.#runtime=this.#runtimeFactory({database:this.database,slotId:nextId});
        await this.runtime.open();this.preferences.set('active-profile',nextId);
      }
    });
  }

  async loadSlot(slotId: string): Promise<void> {
    const previous=this.runtime.readSnapshot().state;
    await this.#replaceSession(async () => {
      const [record,history] = await Promise.all([this.database.loadSlot(slotId,{forPlay:true}),this.database.listEvents(slotId)]);
      if (!record) throw new Error('没有找到该存档');
      if (record.autosaveEmpty) throw new Error('这个自动存档位置为空，请读取手动存档或开启新的故事');
      if (record.profileId !== this.runtime.slotId) throw new Error('请先切换到该存档所属的世界');
      const events = history.map(item => item.event);
      const avatar=await this.database.getSlotAvatar(record),figure=await this.database.getSlotFigure(record);
      await this.runtime.restoreSnapshot(record.snapshot,events,{avatar,figure,soulImages:await this.database.getSlotSoulImages(record),workspace:record.workspace ?? null,storyHeadId:record.storyHeadId??null,storyUndoHeadId:record.storyUndoHeadId??null,battleReplay:record.battleReplay??null});
      await this.#forkRestoredStory(previous);
      this.#set({snapshot: this.runtime.getSnapshot(), events: events.slice(-160)});
      this.notify(`已读取“${record.label}”`, 'success');
    });
  }

  async canReplayBattle(battleId:string):Promise<boolean>{
    const runtime=this.runtime;
    return runtime.replayableBattleId===battleId&&latestReplayBattleId(runtime.readSnapshot().state)===battleId;
  }

  async replayBattleManually(battleId:string):Promise<void>{
    await this.pauseAutomaticBattle();
    await this.#replaceSession(async()=>{
      const runtime=this.runtime,current=runtime.readSnapshot().state as any;
      if(latestReplayBattleId(current)!==battleId)throw Error('当前战斗已变化，请重新选择');
      const saved=runtime.getRecord(),record=saved?.battleReplay?{...saved,...saved.battleReplay,storyUndoHeadId:saved.battleReplay.storyUndoHeadId??null}:null,opening=record?.snapshot.state as any;
      if(!record||record.slotId!==runtime.slotId||opening?.战斗?.id!==battleId||opening.战斗.状态!=='进行中')throw Error('没有这场遭遇的完整战前记录');
      await runtime.restoreSnapshot(record.snapshot,[],{avatar:await this.database.getSlotAvatar(record),figure:await this.database.getSlotFigure(record),soulImages:await this.database.getSlotSoulImages(record),workspace:record.workspace??null,storyHeadId:record.storyHeadId??null,storyUndoHeadId:record.storyUndoHeadId??null,battleReplay:record.battleReplay??null});
      await runtime.dispatch({id:crypto.randomUUID(),expectedRevision:runtime.revision,type:'story.fork',payload:{branchId:opening.扩展.story.branchId}});
      const result=await runtime.dispatch({id:crypto.randomUUID(),expectedRevision:runtime.revision,type:'battle.set-automatic',payload:{enabled:false}});
      this.#set({snapshot:result.snapshot,events:result.events});
      this.notify('已回到同一场遭遇的首次行动前，由你手动控制','success');
    });
  }

  async restoreBackup(backupId: string): Promise<void> {
    const previous=this.runtime.readSnapshot().state;
    await this.#replaceSession(async () => {
      const record = await this.database.loadBackup(backupId);
      if (!record) throw new Error('没有找到该自动备份');
      if (record.slotId !== this.runtime.slotId) throw new Error('请先切换到该备份所属的魂师档案');
      const avatar=await this.database.getSlotAvatar(record),figure=await this.database.getSlotFigure(record);
      await this.runtime.restoreSnapshot(record.snapshot,[],{avatar,figure,soulImages:await this.database.getSlotSoulImages(record),workspace:record.workspace ?? null,storyHeadId:record.storyHeadId??null,storyUndoHeadId:record.storyUndoHeadId??null,battleReplay:record.battleReplay??null});
      await this.#forkRestoredStory(previous);
      this.#set({snapshot: this.runtime.getSnapshot(), events: []});
      this.notify('已恢复所选旅程进度', 'success');
    });
  }

  async prepareStoryWithdrawal(branchId:string,turn:number){
    this.#assertSessionAvailable(true);
    const runtime=this.runtime,sessionId=this.#sessionEpoch,record=runtime.getSlotHead();
    const target=record&&(await this.database.storyWithdrawalTargets(record)).find(row=>row.branchId===branchId&&row.turn===turn);
    if(!target||!record?.storyUndoHeadId)throw Error('这层楼没有保存发送前的完整进度。启用撤回功能后新发送的内容可以撤回。');
    if(runtime!==this.runtime||sessionId!==this.#sessionEpoch||record.storyUndoHeadId!==runtime.getSlotHead()?.storyUndoHeadId)throw Error('故事已变化，请重新选择撤回位置');
    return {...target,headId:record.storyUndoHeadId,sessionId,count:((runtime.readSnapshot().state as any).扩展.story.active?.number??turn)-turn+1};
  }

  async withdrawStory(target:{id:string;headId:string;sessionId:number}):Promise<void>{
    if(target.sessionId!==this.#sessionEpoch||target.headId!==this.runtime.getSlotHead()?.storyUndoHeadId)throw Error('故事已变化，请重新选择撤回位置');
    await this.#replaceSession(()=>this.runtime.withdrawStory(target.id,target.headId));
    this.notify('已撤回所选楼层及后续内容，回到发送前','success');
  }

  async savePlayerAvatar(record: AvatarRecord|null): Promise<void> {
    this.#assertSessionAvailable();
    const epoch=this.#sessionEpoch;
    await this.runtime.saveMetadata({avatar:record});
    if (epoch !== this.#sessionEpoch) throw new TaskCancelledError();
    this.#set({avatarUrl:this.#avatarUrl(record)});
  }

  async savePlayerFigure(record:AvatarRecord|null):Promise<void>{
    this.#assertSessionAvailable();const epoch=this.#sessionEpoch;
    await this.runtime.saveMetadata({figure:record});
    if(epoch!==this.#sessionEpoch)throw new TaskCancelledError();
    this.#set({figureUrl:this.#avatarUrl(record,'figureUrl')});
  }

  exportSave(slotId?:string):Promise<string>{return this.#exportSave(slotId);}
  exportSaveFile(slotId:string|undefined,name:string,signal?:AbortSignal){return this.#exportSave(slotId,name,signal);}
  async #exportSave(slotId?:string,name?:undefined,signal?:AbortSignal):Promise<string>;
  async #exportSave(slotId:string|undefined,name:string,signal?:AbortSignal):Promise<import('./file-transfer').PreparedDownload>;
  async #exportSave(slotId?:string,name?:string,signal?:AbortSignal){
    this.#assertSessionAvailable(true);
    const runtime=this.runtime,epoch=this.#sessionEpoch;
    // A saved slot is read in the exporter's transaction. Live recovery also
    // supports a world without a stored slot and keeps its exact captured state.
    const source:ExportSource=slotId?{slotId}:await runtime.captureSave();
    let worldId=runtime.slotId;
    if(slotId)try{worldId=await this.database.slotOwner(slotId);}
    catch(error){await this.reportFailure('save.export.read',error,{slotId},slotId);throw error;}
    return this.database.traceDiagnostic(worldId,'save.export',{slotId},async()=>{
      signal?.throwIfAborted();
      const result=name===undefined?await prepareWorldExport(this.database,source,undefined,signal):await prepareWorldExport(this.database,source,name,signal);
      if(runtime!==this.runtime||epoch!==this.#sessionEpoch)throw new TaskCancelledError();
      return result;
    });
  }

  async importSave(input: string): Promise<void> {
    try{await this.#importSave(readFullSaveBundle(input));}
    catch(error){this.notify(describeError(error),'danger');throw error;}
  }

  #rememberActiveProfile():void {
    try{this.preferences.set('active-profile',this.runtime.slotId);}
    catch(error){
      // The IndexedDB world remains authoritative when browser preferences
      // cannot be written; startup can resolve it locally again next time.
      void this.database.recordDiagnostic(this.runtime.slotId,{stage:'journey.active-profile.persist',status:'failed',error}).catch(()=>{});
    }
  }

  async importAsNewWorld(bundle:FullSaveBundle):Promise<void>{await this.#importSave(bundle,true);}

  async #importSave(bundle:FullSaveBundle,newWorld=false): Promise<void> {
    const previous=this.runtime.readSnapshot().state;
    const {snapshot, attachments,workspace,soulImages:refs,storyHistory,battleReplay} = bundle;
    const soulImages:SoulImageInputs=Object.fromEntries(Object.entries(refs).map(([slot,entry])=>[slot,entry.kind==='preset'?entry:{kind:'upload',image:avatarAttachmentToRecord(attachments.find(a=>a.assetId===entry.assetId)!)}]));
    const avatarAttachment = attachments.find(attachment => attachment.kind === 'avatar');
    const avatar = avatarAttachment ? avatarAttachmentToRecord(avatarAttachment) : null;
    const figureAttachment=attachments.find(attachment=>attachment.kind==='figure');
    const figure=figureAttachment?avatarAttachmentToRecord(figureAttachment):null;
    const battleReplayImport=battleReplay?{
      record:{snapshot:battleReplay.snapshot,workspace:battleReplay.workspace,soulImages:battleReplay.soulImages,
        avatarAssetId:battleReplay.attachments.find(a=>a.kind==='avatar')?.assetId??null,
        figureAssetId:battleReplay.attachments.find(a=>a.kind==='figure')?.assetId??null},
      assets:battleReplay.attachments.map(attachment=>({...avatarAttachmentToRecord(attachment),assetId:attachment.assetId})),storyHistory:battleReplay.storyHistory,
    }:undefined;
    await this.#replaceSession(async () => {
      const target=newWorld?this.#runtimeFactory({database:this.database,slotId:`profile-${crypto.randomUUID()}`}):this.runtime;
      const state=snapshot.state as any,player=state?.人物?.列表?.[state?.角色?.主控单位ID];
      try{await target.restoreSnapshot(snapshot,[],{avatar,figure,soulImages,workspace,storyHistory,battleReplay:null,battleReplayImport,
        ...(newWorld?{label:player?.name?`${player.name}的旅程`:'导入的旅程'}:{})});}
      catch(error){if(newWorld)void target.close().catch(()=>{});throw error;}
      if(newWorld)this.#runtime=target;else await this.#forkRestoredStory(previous);
      this.#rememberActiveProfile();
      this.#set({snapshot: this.runtime.getSnapshot(), events:[], avatarUrl: this.#avatarUrl(avatar),figureUrl:this.#avatarUrl(figure,'figureUrl')});
      this.notify('存档导入完成', 'success');
    });
  }

  async #forkRestoredStory(previous:any):Promise<void>{
    const state=this.runtime.readSnapshot().state as any;
    if(restoredStoryNeedsFork(previous,state))await this.runtime.dispatch({id:crypto.randomUUID(),type:'story.fork',expectedRevision:this.runtime.revision,payload:{branchId:state.扩展.story.branchId}});
  }

  notify(message: string, tone: UiNotice['tone'] = 'info'): void {
    const notice = {id: crypto.randomUUID(), tone, message:playerText(message,this.#view.snapshot.state,tone === 'danger' ? '这项操作暂时无法完成，请返回当前旅程重试' : '旅程已更新')};
    this.#set({notices: [...this.#view.notices, notice].slice(-4)});
    window.setTimeout(() => this.dismissNotice(notice.id), 4_500);
  }

  dismissNotice(id: string): void {
    this.#set({notices: this.#view.notices.filter(notice => notice.id !== id)});
  }

  #set(patch: Partial<Omit<ControllerView,'calculationProgress'>>): void {
    const progress=this.#calculationRuntime===this.#runtime?this.getCalculationProgress():null;
    this.#view = {...this.#view, ...patch};
    this.#view.busy=this.#pendingWork>0||Boolean(this.#view.modelTask)||Boolean(this.#view.pendingGeneration)||Boolean(this.#view.resultRecovery);
    if(patch.events)this.#view.events=patch.events.filter(e=>this.#eventVisible(e));
    this.#viewWithProgress=progress?{...this.#view,calculationProgress:progress}:undefined;
    this.#emitView();
    if(patch.snapshot||patch.ready||patch.busy===false||patch.modelEnabled!==undefined||patch.modelProfile)queueMicrotask(()=>this.#queuePersonWork());
  }

  #avatarUrl(record: AvatarRecord | null,key:'avatarUrl'|'figureUrl'='avatarUrl'): string {
    if (this.#view[key] && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(this.#view[key]);
    if (!record || typeof URL.createObjectURL !== 'function') return '';
    return URL.createObjectURL(record.blob);
  }

  async saveSoulImage(slot:string,image:SoulImageInput|null):Promise<void>{
    this.#assertSessionAvailable();const epoch=this.#sessionEpoch,runtime=this.runtime;
    await runtime.saveSoulImage(slot,image);
    const saved=await this.database.getSlotSoulImages(runtime.getSlotHead());
    if(epoch!==this.#sessionEpoch||runtime!==this.runtime)throw new TaskCancelledError();
    this.#set({soulImages:this.#soulImageView(saved)});
  }

  #soulImageView(images:SoulImageInputs):ControllerView['soulImages']{
    for(const entry of Object.values(this.#view.soulImages))if(entry.kind==='upload')URL.revokeObjectURL(entry.url);
    return Object.fromEntries(Object.entries(images).map(([slot,entry])=>[slot,entry.kind==='preset'?entry:{kind:'upload',url:URL.createObjectURL(entry.image.blob)}]));
  }
}
