import {createHash,randomBytes} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {GameEngine} from '../runtime/engine';
import {rules} from '../rules';
import type {GameCommand,GameSnapshot} from '../runtime/contracts';
import {CloudError,validDeltaFields,type CloudReceipt,type StateDelta} from '../cloud/protocol';
import {assertSnapshot,parseSnapshotBytes,validateCommand} from './input';
import {verifyWorkflowTicket} from './workflow-ticket';
import {generationTargets} from '../runtime/generation-completion';
import type {CalculationStage} from './calculation-observation';
import {isDeepStrictEqual} from 'node:util';
import {SavedStateValidationError} from '../runtime/current-state';
import {isRecord,sectionTables,validSectionChanges,type FieldChanges,type SectionChange} from '../cloud/section-delta';
import {diffList,worldJournalLists,type JournalChange} from '../cloud/world-journal-delta';

export const SESSION_CACHE_LIMIT=32*1024*1024;
// Keep the existing single-world execution ceiling; the larger wire allowance
// also serves recovery envelopes and does not describe the worker's heap use.
export const SESSION_SNAPSHOT_LIMIT=32*1024*1024;
export function assertSessionSize(bytes:number):void {
  if(bytes>SESSION_SNAPSHOT_LIMIT)throw Object.assign(new CloudError('input-limit','这份旅程超过当前计算服务可读取的大小，请导出世界和故障诊断以便排查；本机存档仍保留',413),{residentCapacity:{snapshotBytes:bytes,limitBytes:SESSION_SNAPSHOT_LIMIT}});
}
export function sessionCapacityError(snapshotBytes:number,sessionBytes:number,usedBytes:number):CloudError {
  const alone=sessionBytes>SESSION_CACHE_LIMIT;
  return Object.assign(new CloudError(alone?'input-limit':'service-busy',alone
    ?'这份旅程超过当前计算服务可读取的大小，请导出世界和故障诊断以便排查；本机存档仍保留'
    :'计算服务正在处理较多旅程，请稍后重试；本次进度未改变，本机存档仍保留',alone?413:503),
    {residentCapacity:{snapshotBytes,sessionBytes,usedBytes,limitBytes:SESSION_CACHE_LIMIT}});
}

function changedFields(previous:Record<string,unknown>,current:Record<string,unknown>,skip:ReadonlySet<string>=new Set()):FieldChanges{
  return {replace:Object.fromEntries(Object.entries(current).filter(([key,value])=>!skip.has(key)&&!isDeepStrictEqual(previous[key],value)&&JSON.stringify(previous[key])!==JSON.stringify(value))),
    remove:Object.keys(previous).filter(key=>!skip.has(key)&&!Object.hasOwn(current,key))};
}
function hasChanges(fields:FieldChanges){return fields.remove.length>0||Object.keys(fields.replace).length>0;}
// Some rules iterate object keys. A sparse merge cannot move an existing string key.
function preservesKeyOrder(left:Record<string,unknown>,right:Record<string,unknown>){
  const keys=Object.keys(right),merged=Object.create(null);
  for(const key of Object.keys(left))if(Object.hasOwn(right,key))merged[key]=true;
  for(const key of keys)merged[key]=true;
  return Object.keys(merged).every((key,index)=>key===keys[index]);
}
function diffWorldJournal(name:string,old:unknown,next:unknown):JournalChange|undefined {
  const keys=worldJournalLists[name],lists:JournalChange['lists']={};
  if(keys===null){
    if(!Array.isArray(old)||!Array.isArray(next))return;
    const change=diffList(old,next);
    return change?{lists:{items:change}}:undefined;
  }
  if(!isRecord(old)||!isRecord(next)||!preservesKeyOrder(old,next))return;
  const skip=new Set<string>();
  for(const key of keys){
    const a=old[key],b=next[key];
    if(!Array.isArray(a)||!Array.isArray(b))continue;
    skip.add(key);
    if(a!==b){const diff=diffList(a,b);if(diff)lists[key]=diff;}
  }
  return {fields:changedFields(old,next,skip),lists};
}
export function stateDelta(before:GameSnapshot,after:GameSnapshot,splitSections=true,fineCollections=true):StateDelta {
  const previous=before.state as Record<string,unknown>,current=after.state as Record<string,unknown>;
  const split=object(previous.扩展)&&object(current.扩展);
  const skip=new Set(split?['扩展']:[]);
  const sections:Record<string,SectionChange>={};
  const orderedReplacements:Record<string,unknown>={};
  if(splitSections)for(const [name,table] of Object.entries(sectionTables)){
    const left=previous[name],right=current[name];
    if(!isRecord(left)||!isRecord(right))continue;
    skip.add(name);
    if(left===right)continue;
    if(!preservesKeyOrder(left,right)){orderedReplacements[name]=right;continue;}
    const oldTable=table?left[table]:null,newTable=table?right[table]:null;
    const splitTable=!!table&&isRecord(oldTable)&&isRecord(newTable);
    const fields=changedFields(left,right,splitTable?new Set([table]):undefined);
    const change:SectionChange={fields};
    if(name==='世界'&&fineCollections){
      for(const [key,replacement] of Object.entries(fields.replace)){
        if(!Object.hasOwn(worldJournalLists,key))continue;
        const patch=diffWorldJournal(key,left[key],replacement);
        if(patch&&JSON.stringify(patch).length<JSON.stringify(replacement).length){
          (change.journals??={})[key]=patch;delete fields.replace[key];
        }
      }
    }
    let entries:FieldChanges|undefined;
    if(splitTable&&oldTable!==newTable){
      entries=changedFields(oldTable,newTable);
      if(!preservesKeyOrder(oldTable,newTable)){
        if(fineCollections)change.entryOrder=Object.keys(newTable);
        else{fields.replace[table]=newTable;entries=undefined;}
      }
    }
    if(entries&&(hasChanges(entries)||change.entryOrder))change.entries=entries;
    if(change.entries||change.journals||hasChanges(fields))sections[name]=change;
  }
  const delta:StateDelta={baseRevision:before.revision,revision:after.revision,savedAt:after.savedAt,rulesetVersion:after.rulesetVersion,
    ...changedFields(previous,current,skip)};
  Object.assign(delta.replace,orderedReplacements);
  if(Object.keys(sections).length)delta.sections=sections;
  if(split){
    const left=previous.扩展 as Record<string,unknown>,right=current.扩展 as Record<string,unknown>;
    const splitReports=object(left.battleReports)&&object(right.battleReports);
    if(splitReports){
      const reports=changedFields(left.battleReports as Record<string,unknown>,right.battleReports as Record<string,unknown>);
      if(reports.remove.length||Object.keys(reports.replace).length)delta.battleReports=reports;
    }
    const extension=changedFields(left,right,splitReports?new Set(['battleReports']):undefined);
    if(extension.remove.length||Object.keys(extension.replace).length)delta.extension=extension;
  }
  return delta;
}
function canonical(value:any):string {
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';
  return JSON.stringify(value);
}
/** Server-internal transport only. Never a player save or a public RPC input. */
export interface SessionCheckpointV1 {
  version:1;seed:string;snapshot:Uint8Array;snapshotBytes:number;revision:number;
  pending:null|{hash:string;receipt:Uint8Array;resultId:string;revision:number};
  acknowledged:string[];
}
export interface SessionCheckpointIdentity {revision:number;snapshotHash:string}
export interface SessionCheckpointCommit extends SessionCheckpointIdentity {command:GameCommand}
export function sessionCommandHash(command:GameCommand):string {
  return createHash('sha256').update(canonical(command)).digest('hex');
}
const checkpointFailure=()=>new CloudError('invalid-checkpoint','计算结果未通过内部一致性核对，原进度已保留',409);
const object=(value:any)=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const exactKeys=(value:any,keys:string[])=>object(value)&&Object.keys(value).length===keys.length&&Object.keys(value).every(key=>keys.includes(key));
const resultId=(value:any)=>typeof value==='string'&&/^[A-Za-z0-9_-]{32}$/.test(value);
const packedCopy=(value:any)=>{
  if(!(value instanceof Uint8Array)||!value.byteLength||value.byteLength>SESSION_CACHE_LIMIT)throw checkpointFailure();
  return Buffer.from(value);
};
function readCheckpoint(input:SessionCheckpointV1){
  if(!exactKeys(input,['version','seed','snapshot','snapshotBytes','revision','pending','acknowledged'])||input.version!==1||typeof input.seed!=='string'||!input.seed||input.seed.length>200||!Number.isSafeInteger(input.revision)||input.revision<0||!Number.isSafeInteger(input.snapshotBytes)||input.snapshotBytes<1||input.snapshotBytes>SESSION_SNAPSHOT_LIMIT||!Array.isArray(input.acknowledged)||input.acknowledged.length>16||input.acknowledged.some(id=>!resultId(id))||new Set(input.acknowledged).size!==input.acknowledged.length)throw checkpointFailure();
  try{
    const snapshot=packedCopy(input.snapshot),text=gunzipSync(snapshot,{maxOutputLength:SESSION_SNAPSHOT_LIMIT});
    if(text.byteLength!==input.snapshotBytes)throw checkpointFailure();
    const value=parseSnapshotBytes(text);
    if(value.revision!==input.revision)throw checkpointFailure();
    let pending:null|{hash:string;receipt:Buffer;resultId:string;revision:number}=null,receipt:CloudReceipt|null=null;
    if(input.pending!==null){
      const row=input.pending;
      if(!exactKeys(row,['hash','receipt','resultId','revision'])||typeof row.hash!=='string'||!/^[a-f0-9]{64}$/.test(row.hash)||!resultId(row.resultId)||row.revision!==input.revision||input.acknowledged.includes(row.resultId))throw checkpointFailure();
      const packed=packedCopy(row.receipt),unpacked=gunzipSync(packed,{maxOutputLength:SESSION_SNAPSHOT_LIMIT});
      receipt=JSON.parse(unpacked.toString('utf8')) as CloudReceipt;
      if(!object(receipt)||Object.keys(receipt).some(key=>!['operationId','resultId','delta','events','idempotent','timings'].includes(key))||typeof receipt.operationId!=='string'||!receipt.operationId.trim()||receipt.operationId.length>180||receipt.resultId!==row.resultId||!Array.isArray(receipt.events)||typeof receipt.idempotent!=='boolean'||!exactKeys(receipt.delta,['baseRevision','revision','savedAt','rulesetVersion','replace','remove',...(receipt.delta?.sections===undefined?[]:['sections']),...(receipt.delta?.extension===undefined?[]:['extension']),...(receipt.delta?.battleReports===undefined?[]:['battleReports'])])||!validDeltaFields(receipt.delta)||receipt.delta.sections!==undefined&&!validSectionChanges(receipt.delta.sections,receipt.delta)||receipt.delta.extension!==undefined&&(!exactKeys(receipt.delta.extension,['replace','remove'])||!validDeltaFields(receipt.delta.extension)||Object.hasOwn(receipt.delta.replace,'扩展')||receipt.delta.remove.includes('扩展'))||receipt.delta.battleReports!==undefined&&(!exactKeys(receipt.delta.battleReports,['replace','remove'])||!validDeltaFields(receipt.delta.battleReports)||Object.hasOwn(receipt.delta.replace,'扩展')||receipt.delta.remove.includes('扩展')||Object.hasOwn(receipt.delta.extension?.replace??{},'battleReports')||receipt.delta.extension?.remove.includes('battleReports'))||!Number.isSafeInteger(receipt.delta.baseRevision)||receipt.delta.baseRevision<0||receipt.delta.baseRevision>input.revision||receipt.delta.revision!==input.revision||receipt.delta.savedAt!==value.savedAt||receipt.delta.rulesetVersion!==value.rulesetVersion||!object(receipt.delta.replace)||!Array.isArray(receipt.delta.remove)||receipt.delta.remove.some(key=>typeof key!=='string')||[...Object.keys(receipt.delta.replace),...receipt.delta.remove].some(key=>['__proto__','prototype','constructor'].includes(key)))throw checkpointFailure();
      pending={hash:row.hash,receipt:packed,resultId:row.resultId,revision:row.revision};
    }
    if(snapshot.byteLength+(pending?.receipt.byteLength??0)>SESSION_CACHE_LIMIT)throw checkpointFailure();
    return {snapshot,value,pending,receipt,acknowledged:[...input.acknowledged]};
  }catch(error){if(error instanceof CloudError)throw error;throw checkpointFailure();}
}
const retainCheckpointToken=Symbol('private-executor-checkpoint');
interface RetainedCheckpoint {token:typeof retainCheckpointToken;input:SessionCheckpointV1;checked:ReturnType<typeof readCheckpoint>}
export class CalculationSession {
  // One decoded, previously verified base per desktop pool. A byte-buffer identity
  // binds it to the exact checkpoint. Public servers keep only compressed owners.
  static #localBases=new WeakMap<object,{packed:Buffer;world:GameSnapshot}>();
  #localScope?:object;
  #engine:GameEngine|undefined;
  #snapshot!:Buffer;
  #revision=0;#snapshotBytes=0;
  #unread=0;
  get unreadCommerceMessages(){return this.#unread;}
  #pending:{hash:string;receipt:Buffer;resultId:string;revision:number}|null=null;
  #acknowledged:string[]=[];
  #stateBytes=0;#pendingBytes=0;
  constructor(readonly seed:string,snapshot?:GameSnapshot,readonly workflowSecret='',retained?:RetainedCheckpoint){
    if(retained){
      if(retained.token!==retainCheckpointToken||retained.input.seed!==seed||snapshot!==undefined)throw checkpointFailure();
      this.#retainCheckpoint(retained.input,retained.checked);return;
    }
    if(snapshot){assertSnapshot(snapshot);assertSessionSize(Buffer.byteLength(JSON.stringify(snapshot)));}
    try{this.#engine=new GameEngine(seed,snapshot);}
    catch(error){if(error instanceof SavedStateValidationError)throw new CloudError('invalid-save',error.message,422,error);throw error;}
    const current=this.#engine.readSnapshot(),text=JSON.stringify(current);
    this.#unread=rules.commerceMessages.unreadCount(current.state);
    assertSessionSize(Buffer.byteLength(text));this.#snapshot=gzipSync(text,{level:1});
    this.#stateBytes=this.#snapshot.length;this.#snapshotBytes=Buffer.byteLength(text);this.#revision=current.revision;
  }
  /** Cold sessions retain the full world and command journal without a live engine. */
  get engine():GameEngine{return this.#engine??=new GameEngine(this.seed,this.snapshot());}
  get revision():number{return this.#revision;}
  get hotBytes():number{return this.#engine?this.#snapshotBytes+this.#engine.calculationCacheBytes:0;}
  get calculationCacheBytes():number{return this.#engine?.calculationCacheBytes??0;}
  get calculationCacheHits():number{return this.#engine?.calculationCacheHits??0;}
  discardCalculationCache():void{this.#engine?.discardCalculationCache();}
  get snapshotBytes():number{return this.#snapshotBytes;}
  /** Executor-only guard captured BEFORE dispatch. A yielded transaction may
   * keep its validated base engine, never a partially/fully committed candidate.
   * Compressed identity alone cannot detect a dirty hot engine. */
  captureBaseRetentionGuard():()=>boolean {
    const engine=this.engine,base=engine.readSnapshot(),packed=this.#snapshot,revision=this.#revision,pending=this.#pending,acknowledged=this.#acknowledged;
    return ()=>{
      if(this.#engine!==engine||this.#snapshot!==packed||this.#revision!==revision||this.#pending!==pending||this.#acknowledged!==acknowledged)return false;
      const current=engine.readSnapshot();
      return current===base||isDeepStrictEqual(current,base);
    };
  }
  suspend():void{
    this.#engine=undefined;
    if(this.#localScope&&CalculationSession.#localBases.get(this.#localScope)?.packed===this.#snapshot)
      CalculationSession.#localBases.delete(this.#localScope);
  }
  get hasPending():boolean{return this.#pending!==null;}
  get residentBytes():number{return this.#stateBytes+this.#pendingBytes;}
  get pending():CloudReceipt|null{return this.#pending?JSON.parse(gunzipSync(this.#pending.receipt,{maxOutputLength:SESSION_SNAPSHOT_LIMIT}).toString('utf8')):null;}
  snapshot():GameSnapshot{return this.#engine?this.#engine.getSnapshot():JSON.parse(gunzipSync(this.#snapshot,{maxOutputLength:SESSION_SNAPSHOT_LIMIT}).toString('utf8'));}
  /** Read-only projections may inspect the committed hot snapshot. Cold reads still get a private decoded copy. */
  readSnapshot():GameSnapshot{return this.#engine?.readSnapshot()??this.snapshot();}
  #syncDigests=new WeakMap<Uint8Array,string>();
  syncHead(){
    let digest=this.#syncDigests.get(this.#snapshot);
    if(!digest){
      const bytes=gunzipSync(this.#snapshot,{maxOutputLength:SESSION_SNAPSHOT_LIMIT});
      digest=createHash('sha256').update(bytes).digest('hex');this.#syncDigests.set(this.#snapshot,digest);
    }
    return {worldId:this.seed,revision:this.#revision,digest,hasPending:this.hasPending};
  }
  checkpointIdentity():SessionCheckpointIdentity {
    return {revision:this.#revision,snapshotHash:createHash('sha256').update(this.#snapshot).digest('hex')};
  }
  checkpoint():SessionCheckpointV1 {
    return {version:1,seed:this.seed,snapshot:Buffer.from(this.#snapshot),snapshotBytes:this.#snapshotBytes,revision:this.#revision,
      pending:this.#pending?{...this.#pending,receipt:Buffer.from(this.#pending.receipt)}:null,acknowledged:[...this.#acknowledged]};
  }
  #retainCheckpoint(input:SessionCheckpointV1,checked:ReturnType<typeof readCheckpoint>){
    this.#unread=rules.commerceMessages.unreadCount(checked.value.state);
    this.#snapshot=checked.snapshot;this.#snapshotBytes=input.snapshotBytes;this.#revision=input.revision;
    this.#pending=checked.pending;this.#acknowledged=checked.acknowledged;
    this.#stateBytes=checked.snapshot.byteLength;this.#pendingBytes=checked.pending?.receipt.byteLength??0;
  }
  #retainLocalBase(world:GameSnapshot):void{
    if(!this.#localScope)return;
    if(this.#snapshotBytes<=24*1024*1024)CalculationSession.#localBases.set(this.#localScope,{packed:this.#snapshot,world});
    else CalculationSession.#localBases.delete(this.#localScope);
  }
  /** Owner-only factory for results of a fully validated private executor.
   * It is deliberately absent from every public input/query/command protocol. */
  static retainCheckpoint(input:SessionCheckpointV1,workflowSecret='',localScope?:object):CalculationSession {
    const checked=readCheckpoint(input);
    const session=new CalculationSession(input.seed,undefined,workflowSecret,{token:retainCheckpointToken,input,checked});
    session.#localScope=localScope;
    session.#retainLocalBase(checked.value);
    return session;
  }
  /** A local read worker receives only the checkpoint already accepted by the owning pool.
   * Keep this read-cache entry separate from every command session. */
  static openCommittedRead(input:SessionCheckpointV1, owner:SessionCheckpointIdentity & {seed:string}) {
    if (!input || !owner || input.seed !== owner.seed || input.revision !== owner.revision) throw checkpointFailure();
    const checked = readCheckpoint(input);
    if (createHash('sha256').update(checked.snapshot).digest('hex') !== owner.snapshotHash) throw checkpointFailure();
    const session = new CalculationSession(input.seed, undefined, '', {token:retainCheckpointToken,input,checked});
    return {session, snapshot:checked.value};
  }

  /** Executor-only reconstruction: retain every old source and validate the world. */
  static fromCheckpoint(input:SessionCheckpointV1,workflowSecret=''):CalculationSession {
    const checked=readCheckpoint(input);
    const session=new CalculationSession(input.seed,undefined,workflowSecret,{token:retainCheckpointToken,input,checked});
    try{session.#engine=new GameEngine(input.seed,checked.value);}
    catch(error){if(error instanceof SavedStateValidationError)throw new CloudError('invalid-save',error.message,422,error);throw error;}
    if(!isDeepStrictEqual(session.#engine.readSnapshot(),checked.value))throw checkpointFailure();
    return session;
  }
  /** Executor cache only: an identical already-validated world can receive its
   * owner's later ACK metadata without restoring every game rule again. */
  refreshCheckpointMetadata(input:SessionCheckpointV1):boolean {
    // An ACK changes only the journal. Prove the exact transition against the retained bytes.
    if(this.#pending&&input?.pending===null&&input.seed===this.seed&&input.revision===this.#revision&&
      input.snapshotBytes===this.#snapshotBytes&&input.version===1&&input.snapshot instanceof Uint8Array&&
      exactKeys(input,['version','seed','snapshot','snapshotBytes','revision','pending','acknowledged'])&&
      isDeepStrictEqual(input.acknowledged,[...this.#acknowledged,this.#pending.resultId].slice(-16))&&this.#snapshot.equals(input.snapshot)){
      this.acknowledge(this.#pending.resultId,this.#revision);return true;
    }
    const checked=readCheckpoint(input),identity=this.checkpointIdentity();
    if(input.seed!==this.seed||input.revision!==identity.revision||createHash('sha256').update(checked.snapshot).digest('hex')!==identity.snapshotHash)return false;
    this.#pending=checked.pending;this.#acknowledged=checked.acknowledged;this.#pendingBytes=checked.pending?.receipt.byteLength??0;
    return true;
  }
  /** A fast owner-side pending check. Full revision/rule/ticket checks run in the executor. */
  pendingCommand(input:GameCommand):CloudReceipt|null {
    const hash=sessionCommandHash(validateCommand(input));
    if(!this.#pending)return null;
    if(this.#pending.hash!==hash)throw new CloudError('save-unacknowledged','上次行动还未保存到本机，请先重试保存',409);
    return this.pending;
  }
  /** Commit only a private executor's terminal result under the caller's lease.
   * The pool additionally owns session epoch/lease invalidation. No world restore
   * or rule execution is allowed on this owner-side commit path. */
  commitCheckpoint(input:SessionCheckpointV1,expected:SessionCheckpointCommit,residentBudget=Number.POSITIVE_INFINITY):CloudReceipt {
    const identity=this.checkpointIdentity(),command=validateCommand(expected.command),hash=sessionCommandHash(command);
    if(expected.revision!==identity.revision||expected.snapshotHash!==identity.snapshotHash||input.seed!==this.seed)throw checkpointFailure();
    const current=this.pendingCommand(command);
    if(current)return current;
    const checked=readCheckpoint(input),receipt=checked.receipt;
    if(!receipt||!checked.pending||checked.pending.hash!==hash||receipt.operationId!==command.id||receipt.delta.baseRevision!==identity.revision||!isDeepStrictEqual(checked.acknowledged,this.#acknowledged))throw checkpointFailure();
    // The complete private executor already ran restore, command/ticket checks,
    // generation gates and world validation. Here compare only its wire delta to
    // the two bounded JSON snapshots; never re-run those expensive game rules.
    const cached=this.#localScope&&CalculationSession.#localBases.get(this.#localScope);
    const before=cached?.packed===this.#snapshot?cached.world:
      JSON.parse(gunzipSync(this.#snapshot,{maxOutputLength:SESSION_SNAPSHOT_LIMIT}).toString('utf8')) as GameSnapshot;
    if(!isDeepStrictEqual(stateDelta(before,checked.value),receipt.delta)&&
      !isDeepStrictEqual(stateDelta(before,checked.value,receipt.delta.sections!==undefined,false),receipt.delta))throw checkpointFailure();
    const resident=checked.snapshot.byteLength+checked.pending.receipt.byteLength;
    if(resident>residentBudget)throw sessionCapacityError(input.snapshotBytes,resident,Math.max(0,SESSION_CACHE_LIMIT-residentBudget));
    this.#snapshot=checked.snapshot;this.#snapshotBytes=input.snapshotBytes;this.#revision=input.revision;this.#pending=checked.pending;
    this.#unread=rules.commerceMessages.unreadCount(checked.value.state);
    this.#stateBytes=checked.snapshot.byteLength;this.#pendingBytes=checked.pending.receipt.byteLength;this.#engine=undefined;
    this.#retainLocalBase(checked.value);
    return structuredClone(receipt);
  }
  dispatch(input:GameCommand,residentBudget=Number.POSITIVE_INFINITY,progress?:(stage:CalculationStage,stats?:Record<string,number>)=>void,takeover?:()=>boolean):CloudReceipt {
    const started=performance.now();
    const report=(stage:CalculationStage,stats?:Record<string,number>)=>{try{progress?.(stage,stats);}catch{/* Observation cannot change a game result. */}};
    report('command.prepare',{snapshotBytes:this.#snapshotBytes});
    let command:GameCommand;try{command=validateCommand(input);}catch(error){this.discardCalculationCache();throw error;}
    const hash=sessionCommandHash(command);
    if(this.#pending){
      if(this.#pending.hash===hash)return this.pending!;
      throw new CloudError('save-unacknowledged','上次行动还未保存到本机，请先重试保存',409);
    }
    const before=this.engine.readSnapshot();
    if(command.expectedRevision!==before.revision&&!this.engine.hasCompletedCommand(command.id)){this.discardCalculationCache();throw new CloudError('revision-conflict','进度已变化，请重新连接后继续',409);}
    try{if(command.type==='workflow.apply'&&!this.engine.hasCompletedCommand(command.id))Object.assign(command,verifyWorkflowTicket(this.workflowSecret,this.seed,before,command.payload.ticket));}
    catch(error){this.discardCalculationCache();throw error;}
    this.engine.setCalculationCacheBudget(this.#snapshotBytes*3<=SESSION_CACHE_LIMIT?SESSION_CACHE_LIMIT-this.#snapshotBytes:0);
    const prepared=performance.now();
    const state=before.state as any;
    report('command.execute',{unitCount:Object.keys(state.战斗单位?.列表??{}).length,skillCount:Object.keys(state.技能?.列表??{}).length,beastCount:Object.keys(state.魂兽档案?.列表??{}).length,itemCount:Object.keys(state.物品?.实例??{}).length});
    const result=this.engine.dispatch(command,stage=>report(stage),true,takeover),executed=performance.now();
    report('command.generation-check');
    // The engine validated every label against the projected command before
    // applying it. Promotion still appears in the before/after comparison, but
    // its freshly validated profile is no longer an unfinished generation.
    const completedLabels=command.type==='generation.apply'&&Array.isArray(command.payload.labels)?command.payload.labels:[];
    const unfinished=generationTargets(before.state,result.snapshot.state).filter(target=>!completedLabels.some((label:any)=>label.kind===target.kind&&label.id===target.id));
    if(this.workflowSecret&&unfinished.length){
      this.engine.restore(before);throw new CloudError('generation-required','人物或新能力尚未完成生成，请先完成模型创建',422);
    }
    const checked=performance.now();
    report('command.delta');
    const receipt:CloudReceipt={operationId:command.id,resultId:randomBytes(24).toString('base64url'),delta:stateDelta(before,result.snapshot),events:result.events,idempotent:result.idempotent};
    const deltaDone=performance.now();
    receipt.timings={prepareMs:prepared-started,executeMs:executed-prepared,generationCheckMs:checked-executed,deltaMs:deltaDone-checked,totalMs:deltaDone-started};
    report('command.commit');
    try{
      const text=JSON.stringify(result.snapshot),snapshotBytes=Buffer.byteLength(text);
      assertSessionSize(snapshotBytes);
      const receiptText=JSON.stringify(receipt),receiptBytes=Buffer.byteLength(receiptText);
      if(receiptBytes>SESSION_SNAPSHOT_LIMIT)throw Object.assign(new CloudError('input-limit','本次行动产生的内容较多，请减少连续行动次数后重试；本次进度未改变',413),{residentCapacity:{snapshotBytes,receiptBytes,limitBytes:SESSION_SNAPSHOT_LIMIT}});
      const packed=gzipSync(text,{level:1}),pending=gzipSync(receiptText,{level:1});
      if(packed.length+pending.length>SESSION_CACHE_LIMIT||packed.length+pending.length>residentBudget)throw sessionCapacityError(snapshotBytes,packed.length+pending.length,Math.max(0,SESSION_CACHE_LIMIT-residentBudget));
      this.#snapshot=packed;this.#snapshotBytes=snapshotBytes;this.#revision=result.snapshot.revision;
      this.#unread=rules.commerceMessages.unreadCount(result.snapshot.state);
      this.#stateBytes=packed.length;this.#pendingBytes=pending.length;
      this.#pending={hash,receipt:pending,resultId:receipt.resultId,revision:receipt.delta.revision};
    }catch(error){this.engine.restore(before);throw error;}
    return structuredClone(receipt);
  }
  acknowledge(resultId:string,revision:number):void {
    if(this.#acknowledged.includes(resultId))return;
    if(!this.#pending||this.#pending.resultId!==resultId||this.#pending.revision!==revision)throw new CloudError('invalid-ack','保存确认与本次结果不一致',409);
    this.#acknowledged=[...this.#acknowledged,resultId].slice(-16);
    this.#pending=null;
    this.#pendingBytes=0;
  }
}
