import {makeStorySummaryOriginal} from '../shared/story-summary-original';
import {isPartyTurn} from '../shared/story-party-chat';
import {assertCurrentSnapshot} from '../shared/snapshot-version';
import {RemoteEngine} from '../cloud/remote-engine';
import type {RuntimeEngine,EngineResult} from './runtime-engine';
import {CloudError,type PendingOperation} from '../cloud/protocol';
import {isAutomaticBattleCommand,type GameCommand,type GameEvent,type GameSnapshot,type JsonValue,type TransactionResult} from './contracts';
import { GameDatabase, type AvatarRecord, type SaveOptions, type SaveSlotRecord } from './storage';
import {researchWorkspace} from './research-workbench';
import {workspaceFormat} from '../shared/workspace-format';
import {assertSoulImageSlot,type SoulImageInput} from './soul-images';
import type {ModelLog} from './model-gateway';
import {jsonEqual} from '../shared/json-identity';
import type {CalculationProgress} from '../shared/calculation-progress';

/** Only definitive command refusals can end a durable intent. A signed model
 * result keeps its recovery record even when its original revision is stale. */
function rejectedCloudCommand(command:GameCommand,error:unknown):boolean{
 return error instanceof CloudError&&(['invalid-command','rule-rejected','invalid-input','input-limit'].includes(error.code)||error.code==='revision-conflict'&&error.status===409&&command.type!=='workflow.apply'||command.type==='story.continue-locally'&&error.code==='model-busy');
}

interface LoadOptions {
  resumePending?:boolean;
  initialRecord?:SaveSlotRecord|null;
  onLocalReady?:()=>void;
}

export interface PendingRecovery {
  phase:'awaiting-generation'|'command'|'ack'|'none';
  command?:GameCommand;
  original?:GameCommand;
}

export class GameRuntime {
  readonly #engine: RuntimeEngine;
  readonly #usesReceipts:boolean;
  readonly #database: GameDatabase;
  readonly #slotId: string;
  #stored: SaveSlotRecord | null = null;
  #queue: Promise<unknown> = Promise.resolve();
  #loaded=false;
  #deferredCommandId:string|null=null;
  #calculation:CalculationProgress|null=null;
  onCalculationProgress?:(progress:CalculationProgress|null)=>void;
  #reportCalculation(progress:CalculationProgress|null){this.#calculation=progress;try{this.onCalculationProgress?.(progress?{...progress,...(progress.work?{work:{...progress.work}}:{})}:null);}catch{/* Display-only observer. */}}

  constructor(options: {engine?: RuntimeEngine; database?: GameDatabase; slotId?: string} = {}) {
    this.#database = options.database ?? new GameDatabase();
    this.#slotId = options.slotId ?? 'auto';
    this.#engine = options.engine ?? new RemoteEngine(this.#slotId);
    this.#engine.onCalculationWork=work=>{if(this.#calculation)this.#reportCalculation({...this.#calculation,work});};
    this.#usesReceipts=this.#engine.commitProtocol===undefined?Boolean(this.#engine.remote):this.#engine.commitProtocol==='acknowledged';
    this.#loaded=!this.#usesReceipts;
  }

  get revision():number{return this.#engine.revision??this.readSnapshot().revision;}
  get storyHeadId():string|null{return this.#stored?.storyHeadId??null;}
  get slotId(): string {return this.#slotId;}
  getSnapshot(): GameSnapshot {return this.#engine.getSnapshot();}
  readSnapshot():GameSnapshot{return this.#engine.readSnapshot?.()??this.#engine.getSnapshot();}
  getSlotHead(){
    if(!this.#stored)return null;
    const {snapshot,workspace,battleReplay,...head}=this.#stored;
    return structuredClone(head);
  }
  get replayableBattleId():string|null{
    const battle=(this.#stored?.battleReplay?.snapshot.state as any)?.战斗;
    return battle?.状态==='进行中'&&typeof battle.id==='string'?battle.id:null;
  }
  getRecord(): SaveSlotRecord | null {return this.#stored ? structuredClone(this.#stored) : null;}
  getWorkspace(): JsonValue | null {return structuredClone(this.#stored?.workspace ?? null);}
  connectionDiagnostics(){return {loaded:this.#loaded,remote:Boolean(this.#engine.remote),commitProtocol:this.#usesReceipts?'acknowledged':'direct',...this.#engine.connectionDiagnostics?.()};}
  getResearchWorkspace():Record<string,any>|null {
    const workspace=this.getWorkspace() as any;
    return workspace?.kind==='player-workbenches' ? workspace.drafts?.research ?? null : null;
  }
  async #settlePending():Promise<void> {
    // A background response may already be durable when local saving fails.
    // Foreground work first recovers that same command, before taking a revision.
    if(this.#loaded&&this.#usesReceipts){
      await this.#retryAcknowledgement();
      const pending=await this.#database.getSetting<any>(`cloud-pending:${this.#slotId}`) as PendingOperation|null;
      if(pending?.phase==='command'&&pending.command.type==='workflow.apply'&&pending.command.id!==this.#deferredCommandId)await this.#dispatch(pending.command,{});
    }
  }
  flushPending():Promise<void>{return this.#enqueue(()=>this.#settlePending());}
  flush(readOnly=false):Promise<GameSnapshot>{
    return this.#enqueue(async()=>{await this.#settlePending();return readOnly?this.readSnapshot():this.getSnapshot();});
  }
  async waitForLocalWrites():Promise<void>{await this.#queue;}
  savedProgressMatches():Promise<boolean> {
    return this.#enqueue(async()=>{
      if(!this.#stored)return true;
      const snapshot=this.readSnapshot();
      return snapshot===this.#stored.snapshot||jsonEqual(snapshot,this.#stored.snapshot);
    });
  }
  captureSave():Promise<{snapshot:GameSnapshot;record:SaveSlotRecord|null}> {
    return this.#enqueue(async()=>({snapshot:this.getSnapshot(),record:this.getRecord()}));
  }
  async listBattleActions(actorId: string): Promise<any[]> {return this.#engine.listBattleActions(actorId);}
  async previewBattleAction(intent: Record<string, unknown>,signal?:AbortSignal): Promise<Record<string, any>> {return this.#engine.previewBattleAction(intent,signal);}
  async previewWorldIntent(intent: Record<string, unknown>,signal?:AbortSignal): Promise<Record<string, any>> {return this.#engine.previewWorldIntent(intent,signal);}
  async previewExpeditionRisk(dungeonId: string, difficultyId: string): Promise<Record<string, any>> {return this.#engine.previewExpeditionRisk(dungeonId,difficultyId);}
  async query(name:string,input:Record<string,unknown>,signal?:AbortSignal):Promise<any>{
    if(!this.#engine.query)throw new Error('查询服务未连接');
    return this.#engine.query(name,input,signal);
  }
  async close(){await this.flushPending();await this.#engine.close?.();}
  async model(request:Record<string,unknown>,signal?:AbortSignal,observe?:(log:ModelLog)=>void,retainValue?:(value:any)=>Promise<void>){
    if(!this.#engine.model)throw new Error('模型计算服务未连接');
    this.#database.rememberModelSecrets(request.profile);
    let prepared:{revision:number;pending:PendingOperation|null;recovered?:boolean};
    try{prepared=await this.#enqueue(async()=>{
      signal?.throwIfAborted();await this.#ensureLoaded();await this.#retryAcknowledgement();
      const pending=await this.#database.getSetting<any>(`cloud-pending:${this.#slotId}`) as PendingOperation|null;
      if(this.#usesReceipts&&pending?.phase==='command'&&pending.command.type==='workflow.apply'){
        const source=(pending.command.payload as any).ticket?.data?.command?.payload?.command,input=request.input as any;
        const resumesGeneration=request.kind==='generation'&&source&&input?.commandId===source.id&&input.type===source.type&&jsonEqual(input.payload,source.payload);
        await this.#dispatch(pending.command,{});
        if(resumesGeneration||request.recoverOnly===true)return {revision:this.revision,pending:null,recovered:true};
        throw new CloudError('stale-workflow','上次结果已恢复，请按当前进度继续',409);
      }
      return {revision:this.revision,pending};
    });}
    catch(error){await this.#database.recordDiagnostic(this.#slotId,{stage:'model.prepare',status:'failed',revision:this.revision,error});throw error;}
    if(prepared.recovered)return {value:{recovered:true}};
    const {revision,pending}=prepared;
    const input=request.input as any,original=pending?.phase==='awaiting-generation'?pending.command:null;
    const same=jsonEqual;
    const generationMatches=(command:GameCommand)=>request.kind==='generation'&&input?.commandId===command.id&&input.type===command.type&&same(input.payload,command.payload)&&command.expectedRevision===revision;
    if(pending){
      const ticket=(pending.command.payload as any)?.ticket,source=ticket?.data?.command?.payload?.command;
      if(pending.phase==='command'&&source&&generationMatches(source)){
        await this.#database.recordDiagnostic(this.#slotId,{stage:'model.result.reuse',status:'complete',revision,operationId:pending.command.id});return {ticket};
      }
      if(!original||!generationMatches(original)){
        const error=new CloudError('save-unacknowledged','上一项结果尚未保存，请先恢复连接取回结果再继续',409);
        await this.#database.recordDiagnostic(this.#slotId,{stage:'model.prepare',status:'failed',revision,operationId:pending.command.id,error});throw error;
      }
    }
    return this.#database.traceDiagnostic(this.#slotId,'model.generate',{revision,kind:request.kind,input:request.kind==='generation'?{type:(request.input as any)?.type,creationAttemptId:(request.input as any)?.creationAttemptId}:undefined,model:this.#database.sanitizeDiagnostic(request.profile)},()=>this.#engine.model!(request,signal,observe,async result=>{
      // Read-only advice has no signed command. Retain its value before the
      // transport releases the completed job, just as signed results are saved.
      if(retainValue)await retainValue(result.value);
      if(!result.ticket)return;
      await this.#enqueue(async()=>{
        if(signal?.aborted||revision!==this.revision)throw new CloudError('stale-workflow','当前旅程已变化，旧生成结果未写入',409);
        // Persist only the signed result, never the request/profile/API key.
        const command={id:`workflow:${crypto.randomUUID()}`,type:'workflow.apply',expectedRevision:revision,payload:{ticket:result.ticket}};
        const pending=await this.#database.traceDiagnostic(this.#slotId,'model.result.persist',{revision,operationId:command.id},()=>original?this.#database.replaceAwaitingGeneration(this.#slotId,original,command):this.#database.beginCloudOperation({worldId:this.#slotId,command,phase:'command',createdAt:new Date().toISOString()}));
        if(!jsonEqual(pending.command.payload,command.payload))throw new CloudError('save-unacknowledged','还有一项操作等待保存，请重新连接后继续',409);
      });
    },async evidence=>{try{await this.#database.putModelEvidence(this.#slotId,evidence);}catch(error){await this.#database.recordDiagnostic(this.#slotId,{stage:'model.evidence.persist',status:'failed',revision,details:{id:evidence.id,sequence:evidence.sequence},error});throw error;}}));
  }
  async pendingGeneration():Promise<GameCommand|null>{
    return (await this.pendingRecovery()).original??null;
  }
  async pendingRecovery():Promise<PendingRecovery>{
    return this.#enqueue(async()=>{
      const pending=await this.#database.getSetting<any>(`cloud-pending:${this.#slotId}`) as PendingOperation|null;
      if(pending){
        const validCommand=(command:any)=>command&&typeof command.id==='string'&&command.id&&typeof command.type==='string'&&command.type&&Number.isSafeInteger(command.expectedRevision)&&command.expectedRevision>=0&&command.payload&&typeof command.payload==='object'&&!Array.isArray(command.payload);
        if(pending.worldId!==this.#slotId||!['command','awaiting-generation'].includes(pending.phase)||!validCommand(pending.command))throw new CloudError('save-unacknowledged','待恢复操作记录不完整，请保留当前页面并导出故障诊断',409);
        const source=(pending.command.payload as any).ticket?.data?.command;
        const original=pending.phase==='awaiting-generation'?pending.command:pending.command.type==='workflow.apply'&&source?.type==='generation.apply'?source.payload?.command:undefined;
        if(original&&(!validCommand(original)||original.expectedRevision!==pending.command.expectedRevision||(pending.command.payload as any).ticket&&(pending.command.payload as any).ticket.data?.worldId!==this.#slotId))throw new CloudError('save-unacknowledged','生成结果与当前待恢复操作不一致，请保留当前页面并导出故障诊断',409);
        return {phase:pending.phase,command:structuredClone(pending.command),...(original?{original:structuredClone(original)}:{})};
      }
      return {phase:await this.#database.getSetting(`cloud-ack:${this.#slotId}`)?'ack':'none'};
    });
  }
  async discardRetainedModel(expectedJobId?:string):Promise<void>{await this.#engine.discardRetainedModel?.(expectedJobId);}
  cancelPendingGeneration(original:GameCommand|null):Promise<boolean>{return this.#enqueue(()=>original?this.#database.cancelAwaitingGeneration(this.#slotId,original):Promise.resolve(false));}
  /** Recheck the exact pending command without requesting or discarding a model job. */
  retryPendingGeneration(original:GameCommand):Promise<boolean>{return this.#enqueue(async()=>{
    await this.#ensureLoaded();await this.#retryAcknowledgement();
    if(this.#engine.hasRetainedModel?.())return false;
    if(original.expectedRevision!==this.revision)throw new CloudError('stale-workflow','当前进度已变化，请重新查看原操作',409);
    await this.#database.retryAwaitingGeneration(this.#slotId,original);
    // Use the formal command path so expensive settlements retain calculation
    // slices. A query preview cannot safely execute a full tournament.
    try{await this.#dispatch(original,{});return true;}
    catch(error){if(error instanceof CloudError&&error.code==='generation-required')return false;throw error;}
  });}
  modelEvidence(){return this.#database.listModelEvidence(this.#slotId);}
  /** A background result is still cancellable until the durable apply begins.
   * Once queued, dispatch owns persistence/acknowledgement and finishes that exact
   * operation even if the foreground takes priority during the short commit. */
  async #backgroundModel(kind:string,input:Record<string,unknown>,profile:Record<string,unknown>,signal:AbortSignal,revision:number){
    this.#database.rememberModelSecrets(profile);
    return this.#database.traceDiagnostic(this.#slotId,'model.background',{revision,kind,model:this.#database.sanitizeDiagnostic(profile)},()=>this.#engine.model!({kind,input,profile},signal,undefined,undefined,async evidence=>{
      try{await this.#database.putModelEvidence(this.#slotId,evidence);}catch(error){await this.#database.recordDiagnostic(this.#slotId,{stage:'model.evidence.persist',status:'failed',revision,details:{id:evidence.id,sequence:evidence.sequence},error});throw error;}
    }));
  }
  async backgroundPeople(profile:Record<string,unknown>,signal:AbortSignal):Promise<EngineResult|null>{
    if(!this.#engine.model)throw new Error('模型计算服务未连接');
    const revision=await this.#enqueue(async()=>{
      signal.throwIfAborted();await this.#ensureLoaded();await this.#retryAcknowledgement();
      if(await this.#database.getSetting(`cloud-pending:${this.#slotId}`))throw new CloudError('save-unacknowledged','上次行动尚待保存',409);
      return this.revision;
    });
    const work=await this.query('world.people-work',{revision},signal);
    signal.throwIfAborted();
    if(revision!==this.revision)throw new CloudError('stale-workflow','旅程已变化，人物原待办保留',409);
    if(!work.pending)return null;
    const result=await this.#backgroundModel('world-people',{},profile,signal,revision);
    return this.#enqueue(async()=>{
      signal.throwIfAborted();
      if(revision!==this.revision)throw new CloudError('stale-workflow','旅程已变化，人物原待办保留',409);
      if(!result.ticket)return null;
      return this.#dispatch({id:`world-people:${crypto.randomUUID()}`,type:'workflow.apply',expectedRevision:revision,payload:{ticket:result.ticket}},{});
    });
  }
  async backgroundSummary(profile:Record<string,unknown>,signal:AbortSignal):Promise<EngineResult|null>{
    if(!this.#engine.model)return null;
    const snapshot=await this.#enqueue(async()=>{signal.throwIfAborted();await this.#ensureLoaded();await this.#retryAcknowledgement();if(await this.#database.getSetting(`cloud-pending:${this.#slotId}`))throw new CloudError('save-unacknowledged','上次行动尚待保存',409);return this.readSnapshot();});
    const ledger=(snapshot.state as any).扩展?.story,turn=ledger?.active;
    if(turn?.status!=='complete')return null;
    const summaries=[...(ledger.summaries??[]),...(ledger.stageSummaries??[]).flatMap((stage:any)=>stage.sources)];
    const missing=(entry:any)=>!entry.turn.privatePersonId&&!isPartyTurn(entry.turn)&&entry.turn.prose&&!summaries.some((row:any)=>row.source.branchId===entry.branchId&&row.source.turn===entry.turn.number);
    const current={branchId:ledger.inheritedBranchId??ledger.branchId,revision:snapshot.revision,turn};
    let selected:any=missing(current)?current:null,nextId:string|null|undefined;
    while(!selected&&this.#stored?.storyHeadId){
      signal.throwIfAborted();const page=await this.#database.storyPage(this.#stored,{nextId,limit:50});
      selected=page.entries.find(entry=>entry.turn.number<turn.number&&entry.revision<snapshot.revision&&missing(entry));nextId=page.nextId;
      if(!nextId)break;
    }
    if(!selected)return null;
    const input={branchId:ledger.branchId,turn:selected.turn.number,...(selected!==current?{original:makeStorySummaryOriginal(selected.branchId,selected.revision,selected.turn)}:{})};
    const result=await this.#backgroundModel('story-summary',input,profile,signal,snapshot.revision);
    return this.#enqueue(async()=>{signal.throwIfAborted();if(snapshot.revision!==this.revision)throw new CloudError('stale-workflow','旅程已变化，稍后再整理记忆',409);return result.ticket?this.#dispatch({id:`world-summary:${crypto.randomUUID()}`,type:'workflow.apply',expectedRevision:snapshot.revision,payload:{ticket:result.ticket}},{}):null;});
  }
  blankSnapshot():Promise<GameSnapshot>{return this.#enqueue(async()=>{
    await this.#ensureLoaded();
    if(this.#engine.query)return this.#engine.query('world.blank',{});
    throw new Error('创建旅程的服务尚未连接');
  });}

  /** Recovery browsing must not depend on opening or validating a cloud session. */
  loadLocalRecord(initialRecord?:SaveSlotRecord|null):Promise<void> {
    return this.#enqueue(async()=>{
      this.#loaded=false;
      this.#stored=await this.#readLocalRecord(initialRecord);
      if(this.#stored)try{assertCurrentSnapshot(this.#stored.snapshot);this.#engine.accept?.(this.#stored.snapshot);}catch{/* The original record remains available for export. */}
    });
  }

  async #readLocalRecord(initialRecord?:SaveSlotRecord|null){
    const record=initialRecord===undefined?await this.#database.loadSlot(this.#slotId,{forPlay:true}):initialRecord;
    if(record&&record.slotId!==this.#slotId)throw Error('本机进度不属于当前世界');
    return record;
  }

  /** The controller only needs completion. Public load callers still own an editable snapshot. */
  open(options:LoadOptions={}):Promise<void> {return this.#enqueue(()=>this.#load(options));}
  load(options:LoadOptions={}):Promise<GameSnapshot> {
    return this.#enqueue(async()=>{await this.#load(options);return this.getSnapshot();});
  }
  #load({resumePending=true,initialRecord,onLocalReady}:LoadOptions):Promise<void> {
    return this.#database.traceDiagnostic(this.#slotId,'journey.load',{},async () => {
      this.#loaded=false;
      const record = await this.#database.traceDiagnostic(this.#slotId,'save.read',{},()=>this.#readLocalRecord(initialRecord));
      await this.#connectRecord(record,onLocalReady);
      if(this.#usesReceipts){
        // Resume the same durable operation; never invent a new command on reload.
        const pending=await this.#database.getSetting<any>(`cloud-pending:${this.#slotId}`) as PendingOperation|null;
        this.#deferredCommandId=!resumePending&&pending?.phase==='command'?pending.command.id:null;
        if(resumePending&&pending&&pending.phase!=='awaiting-generation')try{await this.#database.traceDiagnostic(this.#slotId,'operation.resume',{operationId:pending.command.id,revision:pending.command.expectedRevision},()=>this.#dispatch(pending.command,{}));}catch(error){
          // A rejected command was not committed and #dispatch has cleared it.
          // Keep its diagnostic without making the saved journey unreadable.
          if(!(error instanceof CloudError)||error.code!=='generation-required'&&(!rejectedCloudCommand(pending.command,error)||await this.#database.getSetting(`cloud-pending:${this.#slotId}`)))throw error;
        }
      }
    });
  }

  dispatch(command: GameCommand, options: {avatar?: AvatarRecord | null} = {},readOnly=false,takeover?:AbortSignal): Promise<TransactionResult> {
    return this.#enqueue(async()=>{const result=await this.#dispatch(command,options,takeover);
      return !readOnly&&this.#engine.readSnapshot?{...result,snapshot:structuredClone(result.snapshot)}:result;
    });
  }

  async #applyEngine(command:GameCommand,takeover?:AbortSignal,retained=false):Promise<EngineResult>{
    const execute=()=>this.#engine.dispatchReadOnly?this.#engine.dispatchReadOnly(command):this.#engine.dispatch(command);
    if(!isAutomaticBattleCommand(command.type)||!this.#engine.requestBattleTakeover||!takeover&&!retained)return execute();
    const request=()=>this.#engine.requestBattleTakeover!(command.id,command.expectedRevision);
    const remember=()=>this.#database.rememberBattleTakeover(this.#slotId,command);
    if(retained||takeover!.aborted){
      // A recovered command must carry the player's original stop request.
      if(!retained)await remember();
      await request();
      return execute();
    }
    let marking:Promise<void>|undefined;
    const stop=()=>{
      // The ordinary pause command still closes automation if the batch has
      // already finished. Never cancel or discard the running command receipt.
      marking=remember();void marking.catch(()=>{});
      void request().catch(()=>{});
    };
    takeover!.addEventListener('abort',stop,{once:true});
    try{return await execute();}
    finally{takeover!.removeEventListener('abort',stop);await marking;}
  }

  async #dispatch(command:GameCommand,options:{avatar?:AvatarRecord|null},takeover?:AbortSignal):Promise<EngineResult>{
      await this.#ensureLoaded();
      await this.#retryAcknowledgement();
      const before = this.readSnapshot();
      let retainedTakeover=false;
      if(this.#usesReceipts){
        const pending=await this.#database.beginCloudOperation({worldId:this.#slotId,command,phase:'command',createdAt:new Date().toISOString(),...(Object.hasOwn(options,'avatar')?{options}:{})});
        retainedTakeover=pending.battleTakeover===true;
        if(pending.options)options={...pending.options,...options};
        if(command.type==='workflow.apply'&&pending.command.type===command.type&&command.expectedRevision===pending.command.expectedRevision&&jsonEqual(command.payload,pending.command.payload))command=pending.command;
        if(pending.phase!=='command'||!jsonEqual(pending.command,command))throw new CloudError('save-unacknowledged','还有一项操作等待保存，请重新连接后继续',409);
      }
      this.#reportCalculation({operationId:command.id,phase:'calculating',startedAt:Date.now()});
      try {
        const result = await this.#database.traceDiagnostic(this.#slotId,'operation.apply',{operationId:command.id,revision:command.expectedRevision,type:command.type},()=>this.#applyEngine(command,takeover,retainedTakeover));
        this.#reportCalculation({...this.#calculation!,phase:'saving'});
        const checkpoint = this.#checkpoint(command,before,result.snapshot);
        // Signed workflows wrap player.create; finish the workspace from the
        // committed state transition, in the same transaction as the new player.
        const playerCreated=!(before.state as any).角色?.已建立&&Boolean((result.snapshot.state as any).角色?.已建立);
        const workspace=this.getWorkspace() as any;
        if(command.type==='research.begin'&&workspace?.kind==='player-workbenches'&&workspace.drafts?.research)workspace.drafts.research.selection={};
        const receipt=result.cloudReceipt;
        await this.#persist({backup:!result.idempotent,events:result.events,...options,
          ...(checkpoint ? {checkpoint} : {}),
          ...((result.snapshot.state as any).战斗?.状态==='进行中'&&((before.state as any).战斗?.状态!=='进行中'||(before.state as any).战斗?.id!==(result.snapshot.state as any).战斗.id)?{battleOpening:true}:{}),
          ...(command.type==='research.begin'&&workspace?.kind==='player-workbenches'?{workspace}:{}),
          ...(playerCreated ? {workspace:null} : {}),
          ...(receipt?{cloudCommit:{operationId:command.id,resultId:receipt.resultId,baseRevision:receipt.delta.baseRevision}}:{})},result.snapshot);
        this.#engine.accept?.(result.snapshot,receipt);
        if(command.id===this.#deferredCommandId)this.#deferredCommandId=null;
        if(receipt)try{await this.#retryAcknowledgement();}catch{/* Saved locally; retry confirmation before the next command. */}
        return result;
      } catch (error) {
        if(!this.#usesReceipts)await this.#engine.restore(before);
        else if(error instanceof CloudError&&error.code==='generation-required')await this.#database.markAwaitingGeneration(this.#slotId,command);
        else if(rejectedCloudCommand(command,error))await this.#database.clearRejectedCloudOperation(this.#slotId,command.id);
        throw error;
      }finally{this.#reportCalculation(null);}
  }

  saveMetadata(options: Pick<SaveOptions,'label' | 'avatar' | 'figure' | 'workspace' | 'kind' | 'profileId'>): Promise<void> {
    return this.#enqueue(async()=>{await this.#ensureLoaded();await this.#persist({...options,backup:false});});
  }

  saveCreationWorkspace(workspace:JsonValue):Promise<void> {
    const saved=structuredClone(workspace);
    return this.#enqueue(async()=>{
      if((this.readSnapshot().state as any)?.角色?.已建立) throw new Error('觉醒已经完成，未写入过时的创建草稿');
      await this.#persist({workspace:saved,backup:false});
    });
  }

  updateCreationWorkspace(update:(current:JsonValue|null)=>JsonValue):Promise<JsonValue> {
    return this.#enqueue(async()=>{
      if((this.readSnapshot().state as any)?.角色?.已建立)throw Error('觉醒已经完成，原武魂建议未写入');
      const workspace=update(this.getWorkspace());
      await this.#persist({workspace,backup:false});
      return structuredClone(workspace);
    });
  }

  saveSoulImage(slot:string,image:SoulImageInput|null):Promise<void>{
    assertSoulImageSlot(slot);
    const saved=image?structuredClone(image):null;
    return this.#enqueue(async()=>{
      const state=this.readSnapshot().state as any;
      const count=state?.角色?.已建立?state.成长.列表[state.角色.主控单位ID].武魂ID列表.length:(this.getWorkspace() as any)?.config?.martialSoulDrafts?.length;
      if(!count||Number(slot)>count)throw new Error('这个武魂尚未建立，请重新打开武魂面板');
      const images=await this.#database.getSlotSoulImages(this.#stored);
      if(saved)images[slot]=saved;else delete images[slot];
      await this.#persist({soulImages:images,backup:false});
    });
  }

  saveResearchWorkspace(input:Record<string,any>):Promise<void> {
    const saved=researchWorkspace(input);
    return this.#enqueue(async()=>{
      if(!(this.readSnapshot().state as any)?.角色?.已建立)throw new Error('请先完成魂师觉醒，再使用工坊');
      const prior=this.getWorkspace() as any;
      const workspace=prior?.kind==='player-workbenches'?prior:{kind:'player-workbenches',version:1,drafts:{}};
      workspace.drafts.research=saved;
      await this.#persist({workspace,backup:false});
    });
  }

  async saveAs(slotId: string, label = '手动存档'): Promise<void> {
    await this.#enqueue(() => this.#withBrowserLock(async () => {
      const current = await this.#database.loadSlot(slotId);
      const [history,avatar,figure,soulImages] = await Promise.all([this.#database.listEvents(this.#slotId),this.#database.getSlotAvatar(this.#stored),this.#database.getSlotFigure(this.#stored),this.#database.getSlotSoulImages(this.#stored)]);
      const saved = await this.#database.saveSlot(slotId,this.readSnapshot(),{
        label,expectedStoredRevision:current?.revision ?? null,expectedStorageVersion:current ? current.storageVersion ?? 0 : null,
        events:history.map(record => record.event),replaceEvents:true,avatar,figure,soulImages,workspace:this.getWorkspace(),
        storyHeadId:this.#stored?.storyHeadId??null,
        battleReplay:this.#stored?.battleReplay??null,
        profileId:this.#slotId,kind:slotId === this.#slotId ? 'profile' : 'checkpoint',
      });
      if (slotId === this.#slotId) this.#stored=saved;
    },slotId));
  }

  restoreSnapshot(snapshot: GameSnapshot, events: GameEvent[] = [], options: Pick<SaveOptions,'label'|'avatar' | 'figure' | 'soulImages' | 'workspace' | 'storyHeadId' | 'storyHistory' | 'battleReplay' | 'battleReplayImport'> = {}): Promise<void> {
    return this.#enqueue(() => this.#database.traceDiagnostic(this.#slotId,'journey.restore',{revision:snapshot.revision},async () => {
      // A valid backup must remain recoverable even when connecting the broken current save failed.
      if(!this.#stored)this.#stored=await this.#database.loadSlot(this.#slotId);
      assertCurrentSnapshot(snapshot);
      if(this.#stored)assertCurrentSnapshot(this.#stored.snapshot);
      const before = this.getSnapshot();
      const wasLoaded=this.#loaded;
      try {
        if(options.battleReplayImport){
          const opening=options.battleReplayImport.record;
          await this.#engine.restore(opening.snapshot);
          if(opening.workspace&&this.#engine.query)await this.#engine.query('workspace.validate',{workspace:opening.workspace});
        }
        await this.#engine.restore(snapshot);
        if(options.workspace&&this.#engine.query)await this.#engine.query('workspace.validate',{workspace:options.workspace});
        await this.#persist({events,replaceEvents:true,resetCloudOperation:true,checkpoint:{key:'restore',label:'读取其他进度前'},...options});
        this.#loaded=true;
      } catch (error) {try{if(wasLoaded)await this.#engine.restore(before);}catch(rollbackError){await this.#database.recordDiagnostic(this.#slotId,{stage:'journey.restore.rollback',status:'failed',error:rollbackError});}this.#loaded=wasLoaded;throw error;}
    }));
  }

  #checkpoint(command: GameCommand, before: GameSnapshot, after: GameSnapshot): SaveOptions['checkpoint'] {
    const previous:any=before.state, current:any=after.state;
    if (current.战斗?.状态 === '进行中' && previous.战斗?.状态 !== '进行中') return {key:'battle',label:'进入战斗前'};
    if (command.type === 'expedition.start') return {key:'expedition',label:'远征出发前'};
    if (['ring.confirm-choice','ring.absorb','expedition.absorb-ring'].includes(command.type)) return {key:'ring',label:'吸收魂环前'};
    if (command.type === 'research.begin') return {key:'research',label:'投入研发材料前'};
    return undefined;
  }

  async #persist(options: SaveOptions,snapshot=this.readSnapshot()): Promise<void> {
    const saved = await this.#withBrowserLock(() => this.#database.saveSlot(this.#slotId,snapshot,{
      label:this.#stored?.label ?? (this.#slotId === 'auto' ? '我的旅程' : '新的旅程'),kind:'profile',profileId:this.#slotId,...options,
      expectedStoredRevision:this.#stored?.revision ?? null,
      expectedStorageVersion:this.#stored ? this.#stored.storageVersion ?? 0 : null,
    }));
    this.#stored=saved;
  }

  async #connectRecord(record:SaveSlotRecord|null,onLocalReady?:()=>void){
    // Keep the actual disk revision available for recovery even if validation fails.
    this.#stored=record;
    if (record) {
      assertCurrentSnapshot(record.snapshot);
      workspaceFormat(record.workspace,record.snapshot.state);
      this.#engine.accept?.(record.snapshot);
      if(this.#usesReceipts)onLocalReady?.();
    }
    if(this.#engine.connect)await this.#database.traceDiagnostic(this.#slotId,'session.connect',{revision:record?.revision},()=>this.#engine.connect!(record?.snapshot));
    else if(record)await this.#engine.restore(record.snapshot);
    if(record?.workspace&&this.#engine.query)await this.#engine.query('workspace.validate',{workspace:record.workspace});
    this.#loaded=true;
  }
  async #ensureLoaded(){
    if(!this.#loaded)await this.#connectRecord(await this.#readLocalRecord());
  }

  async #retryAcknowledgement(){
    if(!this.#engine.acknowledge)return;
    const ack=await this.#database.getSetting<any>(`cloud-ack:${this.#slotId}`);
    if(!ack)return;
    try{await this.#database.traceDiagnostic(this.#slotId,'operation.acknowledge',{revision:ack.revision,resultId:ack.resultId},()=>this.#engine.acknowledge!(ack.resultId,ack.revision));}
    catch(error){if(!(error instanceof CloudError)||!['invalid-ack','session-expired'].includes(error.code))throw error;}
    await this.#database.putSetting(`cloud-ack:${this.#slotId}`,null);
  }

  #enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const pending=this.#queue.then(operation,operation);
    this.#queue=pending.catch(() => undefined);
    return pending;
  }

  async #withBrowserLock<T>(operation: () => Promise<T>, slotId=this.#slotId): Promise<T> {
    const manager=typeof navigator !== 'undefined' ? navigator.locks : undefined;
    return manager?.request ? manager.request(`douluo-save:${slotId}`,operation) : operation();
  }
}
