import {credentialRef,nativeModelCredentials,scopeCredentialWrite,type CredentialWrite,type CredentialValues,type CredentialOwner} from './desktop-model-credentials';
import {requestResult,transactionDone} from './idb-read';
import {STORY_UNDO,storyUndoTargets,storyUndoBefore,visitStoryUndo,type StoredStoryUndo} from './story-undo';
import {serializeDatabaseWorld,type ExportSource} from './save-export';
import {createObjectMark,isSealedValue,sealOwned} from '../shared/frozen-snapshot';
import {PARTS,prepareStateParts,prepareReplayPart,materialize,retainParts,pruneParts,type StoredSlot,type SaveListing} from './save-parts';
import {playerText} from './player-text';
import {scenePlace} from '../shared/scene-place';
import {isCurrentSnapshot,assertCurrentSnapshot,SNAPSHOT_SCHEMA_VERSION} from '../shared/snapshot-version';
import {saveCodec} from '../shared/save-codec';
import type { GameCommand, GameEvent, GameSnapshot, JsonValue } from './contracts';
import {assertCharacterImageSlot,normalizeSoulImageRefs,type SoulImageRefs,type SoulImageInputs} from './soul-images';
import type {PendingOperation} from '../cloud/protocol';
import {checkedStoryEntry,checkedStoryHistory,type StoryArchiveEntry,type StoryArchiveRecord,type StoryArchivePage} from '../shared/story-archive';
import {validateModelEvidence,type ModelEvidence} from '../shared/model-evidence';
import {sanitizeDiagnostic,type DiagnosticEvent} from '../shared/failure-diagnostics';
import {jsonEqual} from '../shared/json-identity';
import {diagnosticValue,diagnosticSave,diagnosticNode,diagnosticEvidence,diagnosticPending,inspectDiagnosticLinks} from '../shared/diagnostic-summary';

export const DATABASE_NAME = 'douluo-independent-web';
export const DATABASE_VERSION = 7;

export interface SaveSlotRecord {
  slotId: string;
  label: string;
  revision: number;
  storageVersion?: number;
  updatedAt: string;
  snapshot: GameSnapshot;
  kind?: 'profile' | 'checkpoint';
  profileId?: string;
  avatarAssetId?: string | null;
  figureAssetId?: string | null;
  soulImages?: SoulImageRefs;
  workspace?: JsonValue | null;
  autosaveEmpty?: boolean;
  storyHeadId?:string|null;
  storyUndoHeadId?:string|null;
  battleReplay?:BattleReplayRecord|null;
}

export type SaveSlotHead=Omit<SaveSlotRecord,'snapshot'|'workspace'|'battleReplay'>;

export type BattleReplayRecord = Pick<SaveSlotRecord,'snapshot'|'avatarAssetId'|'figureAssetId'|'soulImages'|'workspace'|'storyHeadId'|'storyUndoHeadId'>;

export interface SaveOptions {
  label?: string;
  expectedStoredRevision?: number | null;
  expectedStorageVersion?: number | null;
  backup?: boolean;
  events?: GameEvent[];
  replaceEvents?: boolean;
  kind?: SaveSlotRecord['kind'];
  profileId?: string;
  avatar?: AvatarRecord | null;
  figure?: AvatarRecord | null;
  soulImages?: SoulImageInputs;
  workspace?: JsonValue | null;
  battleOpening?:boolean;
  battleReplay?:BattleReplayRecord|null;
  battleReplayImport?:{record:BattleReplayRecord;storyHistory:StoryArchiveEntry[];assets:AvatarRecord[]};
  checkpoint?: {key:'battle'|'expedition'|'ring'|'research'|'restore'|'attribute-investment-v2';label:string};
  cloudCommit?: {operationId:string;resultId:string;baseRevision:number};
  resetCloudOperation?:boolean;
  storyHeadId?:string|null;
  storyHistory?:StoryArchiveEntry[];
  storyUndoHeadId?:string|null;
  storyOpening?:{branchId:string;turn:number};
}

export interface BackupRecord extends SaveSlotRecord {
  id: string;
  createdAt: string;
  recoveryLabel?: string;
}

export interface AvatarRecord {
  width?: number;
  height?: number;
  assetId: string;
  mimeType: string;
  byteLength: number;
  checksum: string;
  blob: Blob;
  updatedAt: string;
}

export interface NarrativeRecord {
  id: string;
  slotId: string;
  revision: number;
  createdAt: string;
  event: GameEvent;
}

export class StorageConflictError extends Error {
  constructor(message = '此存档已在另一个页面更新，请重新读取后再保存') {
    super(message);
    this.name = 'StorageConflictError';
  }
}

const clone = <T>(value: T): T => structuredClone(value);

async function preparePortrait(record: AvatarRecord,kind:'avatar'|'figure'='avatar'): Promise<AvatarRecord> {
  if (!['image/png','image/jpeg','image/webp'].includes(record.mimeType) || !(record.blob instanceof Blob)) throw new Error('头像图片类型不受支持');
  if (record.blob.size <= 0 || record.blob.size > (kind==='figure'?2*1024*1024:128*1024) || record.byteLength !== record.blob.size) throw new Error(`${kind==='figure'?'立绘':'头像'}大小不符合要求`);
  if(kind==='figure'&&(!Number.isInteger(record.width)||!Number.isInteger(record.height)||record.width!<1||record.height!<1||record.width!>2048||record.height!>2048))throw new Error('立绘尺寸不符合要求');
  const bytes = await record.blob.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256',bytes);
  const checksum = [...new Uint8Array(hash)].map(value => value.toString(16).padStart(2,'0')).join('');
  return {...clone(record),assetId:`portrait-${checksum}`,checksum};
}

function assertSafeIdentifier(value: string, label: string, maximum = 80): string {
  const normalized = String(value ?? '').trim();
  if (!/^[a-z0-9][a-z0-9._:-]*$/i.test(normalized) || normalized.length > maximum) throw new Error(`${label}不合法`);
  return normalized;
}

const secretChecked=createObjectMark();
export function assertNoSecretShape(value:unknown):void {
  if(!value||typeof value!=='object'||secretChecked.has(value))return;
  const checked:object[]=[],seen=new WeakSet<object>();
  function visit(node:object){
    if(secretChecked.has(node)||seen.has(node))return;
    seen.add(node);
    for(const [key,child] of Object.entries(node)){
      const conversationSource=key==='authorization'&&(child===null||!!child&&typeof child==='object'&&!Array.isArray(child)&&Object.keys(child).sort().join(',')==='decisionKey,provider'&&child.provider==='person-conversation'&&/^conversation-decision:ability-v1:[0-9a-f]{16}$/.test(child.decisionKey));
      if(/api.?key|authorization|access.?token|secret/i.test(key)&&!conversationSource)throw new Error('存档包含疑似密钥字段，已拒绝写入');
      if(child&&typeof child==='object')visit(child);
    }
    if(isSealedValue(node))checked.push(node);
  }
  visit(value);
  // Publish successful checks only after every reachable field passed, including cycles.
  for(const node of checked)secretChecked.add(node);
}

function saveListing(record:StoredSlot<SaveSlotRecord>&{id?:string;createdAt?:string;recoveryLabel?:string}):SaveListing {
  const {slotId,profileId,label,kind,revision,updatedAt,autosaveEmpty,id,createdAt,recoveryLabel}=record;
  const state=record.snapshot.state as any,personId=state?.角色?.主控单位ID;
  const locationId=record.listing?.locationId??state?.地图?.当前地点ID??'';
  const summary=record.listing?.summary??(autosaveEmpty?'空存档':personId?
    `${playerText(state.人物?.列表?.[personId]?.name,state,'旅者')} · ${state.成长?.列表?.[personId]?.魂力等级??1} 级 · ${scenePlace(state)}`:'角色创建未完成');
  return {slotId,profileId,label,kind,revision,updatedAt,autosaveEmpty,id,createdAt,recoveryLabel,summary,locationId,current:isCurrentSnapshot(record.snapshot)};
}

function putListed(store:IDBObjectStore,row:StoredSlot&{id?:string;createdAt?:string;recoveryLabel?:string}){
  const listing=saveListing(row);
  store.put({...row,listing,menuEntry:JSON.stringify(listing)});
}
async function readSaveMenu(store:IDBObjectStore,slotId?:string):Promise<SaveListing[]>{
  const selected=slotId===undefined?store.getAllKeys():store.index('slotId').getAllKeys(slotId);
  const keys=await requestResult(selected),remaining=new Set(keys);
  const rows:SaveListing[]=[];
  const range=slotId!==undefined&&globalThis.IDBKeyRange?IDBKeyRange.bound([slotId],[slotId,[]]):undefined;
  await new Promise<void>((resolve,reject)=>{
    const req=store.index('menuEntry').openKeyCursor(range);
    req.onerror=()=>reject(req.error);
    req.onsuccess=()=>{
      const cursor=req.result;
      if(!cursor){resolve();return;}
      if(remaining.has(cursor.primaryKey)&&Array.isArray(cursor.key)&&typeof cursor.key[1]==='string'){
        try{
          const row=JSON.parse(cursor.key[1]) as SaveListing;
          if(row.slotId===cursor.key[0]&&(row.id??row.slotId)===cursor.primaryKey&&typeof row.summary==='string'&&typeof row.updatedAt==='string'){
            rows.push(row);remaining.delete(cursor.primaryKey);
          }
        }catch{/* Read a pre-index or damaged listing from its original record below. */}
      }
      cursor.continue();
    };
  });
  // Hold only one legacy full record at a time, including when a world has many large backups.
  for(const key of remaining){
    const old=await requestResult<StoredSlot|undefined>(store.get(key));
    if(old)rows.push(saveListing(old));
  }
  return rows;
}

// Check an existing slot and its four compatibility stamps without deserializing the world.
async function currentSlotRevision(store:IDBObjectStore,id:string,expected:number):Promise<number|undefined>{
  const version=saveCodec.VERSION;
  if(await requestResult(store.index('commandRevision').getKey([id,SNAPSHOT_SCHEMA_VERSION,version,version,version,expected]))!==undefined)return expected;
  const saved=await requestResult<SaveSlotRecord|undefined>(store.get(id));
  if(saved)assertCurrentSnapshot(saved.snapshot);
  return saved?.revision;
}

async function diagnosticKeysInTimeOrder(store:IDBObjectStore,worldId:string):Promise<IDBValidKey[]>{
  const index=store.index('diagnosticTime'),prefix='failure-diagnostic:'+worldId+':';
  if(globalThis.IDBKeyRange){
    const keys=await requestResult(index.getAllKeys(IDBKeyRange.bound([worldId],[worldId,[]])));
    return keys.filter(key=>typeof key==='string'&&key.startsWith(prefix));
  }
  // An injected IndexedDB factory can exist without a global IDBKeyRange.
  return new Promise((resolve,reject)=>{
    const keys:IDBValidKey[]=[],request=index.openKeyCursor();
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{
      const cursor=request.result;
      if(!cursor){resolve(keys);return;}
      if(Array.isArray(cursor.key)&&cursor.key[0]===worldId&&typeof cursor.primaryKey==='string'&&cursor.primaryKey.startsWith(prefix))keys.push(cursor.primaryKey);
      cursor.continue();
    };
  });
}

export class GameDatabase {
  readonly #factory: IDBFactory;
  #database?: Promise<IDBDatabase>;
  #replayCache?:{key:string;snapshot:GameSnapshot};
  #diagnosticSecrets=new Set<string>();
  #diagnosticMemory=new Map<string,DiagnosticEvent[]>();
  #diagnosticWrites:Promise<void>=Promise.resolve();
  #diagnosticWriteErrors=new Map<string,unknown>();

  rememberModelSecrets(profile:any):void {
    if(!profile||typeof profile!=='object')return;
    if(typeof profile.apiKey==='string'&&profile.apiKey)this.#diagnosticSecrets.add(profile.apiKey);
    for(const value of Object.values(profile.credentialHeaders??{}))if(typeof value==='string'&&value)this.#diagnosticSecrets.add(value);
    try{for(const [key,value] of new URL(profile.baseUrl).searchParams)if(/key|token|secret|auth/i.test(key)&&value)this.#diagnosticSecrets.add(value);}catch{}
    for(const child of [profile.writer,...(profile.modelLibrary??[])])this.rememberModelSecrets(child);
  }
  sanitizeDiagnostic(value:unknown){return sanitizeDiagnostic(value,[...this.#diagnosticSecrets]);}
  async recordDiagnostic(worldId:string,event:Omit<DiagnosticEvent,'id'|'at'|'worldId'>):Promise<void>{
    const row=this.sanitizeDiagnostic({...event,id:crypto.randomUUID(),at:new Date().toISOString(),worldId}) as DiagnosticEvent;
    if(JSON.stringify(row).length>32000)row.details={omitted:'诊断元数据过长；完整进度请单独导出存档'};
    const rows=[...(this.#diagnosticMemory.get(worldId)??[]),row].slice(-200);this.#diagnosticMemory.set(worldId,rows);
    const write=async()=>{try{
      const db=await this.open(),tx=db.transaction('settings','readwrite'),done=transactionDone(tx),store=tx.objectStore('settings');void done.catch(()=>{});
      const prefix=`failure-diagnostic:${worldId}:`;
      const keys=await diagnosticKeysInTimeOrder(store,worldId);
      for(const key of keys.slice(0,Math.max(0,keys.length-199)))store.delete(key);
      store.put({key:prefix+row.id,value:row});await done;
    }catch(error){this.#diagnosticWriteErrors.set(worldId,this.sanitizeDiagnostic(error));}};
    this.#diagnosticWrites=this.#diagnosticWrites.then(write,write);await this.#diagnosticWrites;
  }
  async traceDiagnostic<T>(worldId:string,stage:string,details:Record<string,any>,run:()=>Promise<T>|T):Promise<T>{
    const operationId=details.operationId??crypto.randomUUID(),at=Date.now(),base={stage,operationId,revision:details.revision,details};
    await this.recordDiagnostic(worldId,{...base,status:'started'});
    try{const result=await run();await this.recordDiagnostic(worldId,{...base,status:'complete',elapsedMs:Date.now()-at});return result;}
    catch(error){await this.recordDiagnostic(worldId,{...base,status:'failed',elapsedMs:Date.now()-at,error});throw error;}
  }

  /** Metadata only: never repairs, overwrites, or copies full worlds into diagnostics. */
  async exportDiagnostics(worldIdInput:string):Promise<any>{
    const worldId=assertSafeIdentifier(worldIdInput,'世界编号');await this.#diagnosticWrites;
    const readErrors:any[]=[],counts:Record<string,number>={},omitted:Record<string,number>={};
    const read=async(name:string,run:()=>Promise<void>)=>{try{await run();}catch(error){readErrors.push({section:name,error:diagnosticValue(this.sanitizeDiagnostic(error))});}};
    // A cursor releases each large record after projecting it, unlike getAll().
    const scan=async(store:string,visit:(row:any,key:IDBValidKey)=>void,index?:string,key?:IDBValidKey)=>{
      const db=await this.open(),tx=db.transaction(store,'readonly'),done=transactionDone(tx);void done.catch(()=>{});
      const source=index?tx.objectStore(store).index(index):tx.objectStore(store);
      await new Promise<void>((resolve,reject)=>{const request=source.openCursor(key);request.onerror=()=>reject(request.error);request.onsuccess=()=>{try{const cursor=request.result;if(!cursor){resolve();return;}visit(cursor.value,cursor.primaryKey);cursor.continue();}catch(error){reject(error);}};});await done;
    };
    const saves:any[]=[],backups:any[]=[],storyIndex:any[]=[],events:any[]=[],records:any[]=[],pendingOperations:any[]=[],journal=new Map<string,DiagnosticEvent>(),slotIds=new Set([worldId]);let pendingSoulAdvice:any=null;
    const append=(section:string,rows:any[],value:any,limit:number)=>{counts[section]=(counts[section]??0)+1;rows.push(value);if(section==='records')rows.sort((a,b)=>String(a.startedAt??'').localeCompare(String(b.startedAt??'')));if(section==='events')rows.sort((a,b)=>(a.revision??0)-(b.revision??0)||String(a.createdAt??'').localeCompare(String(b.createdAt??'')));if(rows.length>limit){rows.shift();omitted[section]=(omitted[section]??0)+1;}};
    await read('saves',()=>scan('saves',row=>{if(row?.slotId===worldId||row?.profileId===worldId){slotIds.add(row.slotId);append('saves',saves,row.saveDiagnostic??diagnosticSave(row),256);}}));
    await read('backups',()=>scan('backups',row=>{if(slotIds.has(row?.slotId))append('backups',backups,row.saveDiagnostic?{...row.saveDiagnostic,id:row.id,createdAt:row.createdAt}:diagnosticSave(row),256);}));
    await read('storyTurns',()=>scan('storyTurns',row=>append('storyTurns',storyIndex,diagnosticNode(row),25000),'worldId',worldId));
    await read('events',()=>scan('narratives',row=>{if(slotIds.has(row?.slotId))append('events',events,diagnosticValue({id:row.id,slotId:row.slotId,revision:row.revision,createdAt:row.createdAt,type:row.event?.type}),50);}));
    await read('operation-and-generation-records',()=>scan('settings',(row,key)=>{
      if(typeof key!=='string')return;
      if(key.startsWith(`failure-diagnostic:${worldId}:`)){
        const value=row?.value;if(value&&typeof value.id==='string'&&typeof value.at==='string')journal.set(value.id,diagnosticValue(this.sanitizeDiagnostic(value)));
        else readErrors.push({section:key,error:{message:'诊断记录格式损坏'}});
      }else if(key===`soul-advice-recovery:${worldId}`){if(row.value)pendingSoulAdvice=diagnosticValue({id:row.value.id,...(row.value.kind==='advice'?{}:{kind:row.value.kind}),status:row.value.status,target:row.value.target,createdAt:row.value.createdAt,hasValue:!!row.value.value});}
      else if(key.startsWith(`model-evidence:${worldId}:`))append('records',records,diagnosticEvidence(this.sanitizeDiagnostic({id:row.value?.id,kind:row.value?.kind,status:row.value?.status,startedAt:row.value?.startedAt,elapsedMs:row.value?.elapsedMs,snapshotRevision:row.value?.snapshotRevision,branchId:row.value?.branchId,turn:row.value?.turn,sequence:row.value?.sequence,drafts:{length:row.value?.drafts?.length},calls:{length:row.value?.calls?.length},failure:row.value?.failure})),20);
      else if([...slotIds].some(id=>key===`cloud-pending:${id}`||key===`cloud-ack:${id}`))append('pendingOperations',pendingOperations,diagnosticPending(key,row.value),256);
    }));
    for(const row of this.#diagnosticMemory.get(worldId)??[])journal.set(row.id,diagnosticValue(this.sanitizeDiagnostic(row)));
    const diagnostics=[...journal.values()].sort((a,b)=>a.at.localeCompare(b.at)).slice(-200);
    const checks=inspectDiagnosticLinks([...saves,...backups],storyIndex,!omitted.storyTurns&&!readErrors.some(r=>r.section==='storyTurns'));
    const recentNodes=storyIndex.slice().sort((a,b)=>(a.turn??0)-(b.turn??0)).slice(-100);
    return this.sanitizeDiagnostic({format:'douluo-failure-diagnostic',version:2,worldId,exportedAt:new Date().toISOString(),readOnly:true,restorable:false,
      summary:{failedStages:diagnostics.filter(r=>r.status==='failed').slice(-20),historyProblems:checks.filter(r=>!r.ok).slice(-20),readErrors:readErrors.slice(-30),diagnosticPersistenceError:diagnosticValue(this.#diagnosticWriteErrors.get(worldId)??null),retention:'最近200条运行诊断；存档、备份、历史、待完成操作和生成记录仅列摘要。此文件不能恢复存档。'},
      counts:{...counts,diagnostics:journal.size},omitted:{...omitted,storyTurns:Math.max(0,(counts.storyTurns??0)-recentNodes.length)},metadata:{pendingSoulAdvice},diagnostics,checks,saves,backups,storyTurns:recentNodes,events,pendingOperations,records,
    });
  }

  constructor(factory: IDBFactory = indexedDB) {
    this.#factory = factory;
  }

  open(): Promise<IDBDatabase> {
    if (this.#database) return this.#database;
    this.#database = new Promise((resolve, reject) => {
      const request = this.#factory.open(DATABASE_NAME, DATABASE_VERSION);
      let abandoned=false;
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains('saves')) database.createObjectStore('saves', {keyPath: 'slotId'});
        if (!database.objectStoreNames.contains('backups')) {
          const store = database.createObjectStore('backups', {keyPath: 'id'});
          store.createIndex('slotId', 'slotId');
          store.createIndex('createdAt', 'createdAt');
        }
        if(!database.objectStoreNames.contains(PARTS))database.createObjectStore(PARTS,{keyPath:'key'});
        if(!database.objectStoreNames.contains(STORY_UNDO)){
          const undo=database.createObjectStore(STORY_UNDO,{keyPath:'id'});
          undo.createIndex('worldId','worldId');undo.createIndex('partKeys','partKeys',{multiEntry:true});
          undo.createIndex('chain',['id','previousId','worldId','branchId','turn']);
        }
        for(const name of ['saves','backups']){
          const store=request.transaction!.objectStore(name);
          if(!store.indexNames.contains('profileId'))store.createIndex('profileId','profileId');
          if(!store.indexNames.contains('partKeys'))store.createIndex('partKeys','partKeys',{multiEntry:true});
          if(!store.indexNames.contains('menuEntry'))store.createIndex('menuEntry',['slotId','menuEntry']);
        }
        if (!database.objectStoreNames.contains('avatars')) database.createObjectStore('avatars', {keyPath: 'assetId'});
        if (!database.objectStoreNames.contains('narratives')) {
          const store = database.createObjectStore('narratives', {keyPath: 'id'});
          store.createIndex('slotId', 'slotId');
          store.createIndex('createdAt', 'createdAt');
        }
        const narratives=request.transaction!.objectStore('narratives');
        if(!narratives.indexNames.contains('slotRevision'))narratives.createIndex('slotRevision',['slotId','revision']);
        if (!database.objectStoreNames.contains('settings')) database.createObjectStore('settings', {keyPath: 'key'});
        const settings=request.transaction!.objectStore('settings'),slots=request.transaction!.objectStore('saves');
        if(!settings.indexNames.contains('diagnosticTime'))settings.createIndex('diagnosticTime',['value.worldId','value.at']);
        if(!slots.indexNames.contains('commandRevision'))slots.createIndex('commandRevision',['slotId','snapshot.schemaVersion','snapshot.rulesetVersion','snapshot.state.系统.schema_version','snapshot.state.系统.ruleset_version','revision']);
        if (!database.objectStoreNames.contains('storyTurns')) {
          const store=database.createObjectStore('storyTurns',{keyPath:'id'});
          store.createIndex('worldId','worldId');
        }
      };
      request.onsuccess = () => {if(abandoned){request.result.close();return;}
        request.result.onversionchange=()=>{request.result.close();this.#database=undefined;};resolve(request.result);};
      request.onerror = () => reject(request.error ?? new Error('无法打开浏览器存储'));
      request.onblocked = () => {abandoned=true;reject(new Error('另一个页面阻止了存储升级，请关闭旧页面后重试'));};
    });
    const attempt=this.#database;
    void attempt.catch(()=>{if(this.#database===attempt)this.#database=undefined;});
    return attempt;
  }

  async saveSlot(slotIdInput: string, snapshot: GameSnapshot, options: SaveOptions = {}): Promise<SaveSlotRecord> {
    return this.traceDiagnostic(options.profileId??slotIdInput,'save.persist',{slotId:slotIdInput,revision:snapshot.revision,operationId:options.cloudCommit?.operationId,storyHeadId:options.storyHeadId,activeTurn:(snapshot.state as any)?.扩展?.story?.active?.number},()=>this.#saveSlot(slotIdInput,snapshot,options));
  }
  async #saveSlot(slotIdInput: string, snapshot: GameSnapshot, options: SaveOptions): Promise<SaveSlotRecord> {
    assertCurrentSnapshot(snapshot);
    if(options.battleReplay)assertCurrentSnapshot(options.battleReplay.snapshot);
    if(options.battleReplayImport)assertCurrentSnapshot(options.battleReplayImport.record.snapshot);
    const slotId = assertSafeIdentifier(slotIdInput, '存档槽编号');
    assertNoSecretShape(snapshot);
    assertNoSecretShape(options.events);
    assertNoSecretShape(options.workspace);
    assertNoSecretShape(options.storyHistory);
    assertNoSecretShape(options.battleReplay);
    if(options.battleReplayImport){
      assertNoSecretShape(options.battleReplayImport.record);
      assertNoSecretShape(options.battleReplayImport.storyHistory);
      checkedStoryHistory(options.battleReplayImport.record.snapshot,options.battleReplayImport.storyHistory);
    }
    if(options.storyHistory!==undefined)checkedStoryHistory(snapshot,options.storyHistory);
    if (options.workspace && JSON.stringify(options.workspace).length > 256_000) throw new Error('觉醒草稿过长，请精简后保存');
    if (options.profileId) assertSafeIdentifier(options.profileId,'角色档案编号');
    if (!Number.isSafeInteger(snapshot.revision) || snapshot.revision < 0) throw new Error('存档进度编号无效');
    const portrait = options.avatar ? await preparePortrait(options.avatar) : options.avatar;
    const figure = options.figure ? await preparePortrait(options.figure,'figure') : options.figure;
    const soulImages:SoulImageRefs={};
    const soulAssets:AvatarRecord[]=[];
    const replayAssets=await Promise.all((options.battleReplayImport?.assets??[]).map(asset=>preparePortrait(asset,'figure')));
    if(options.soulImages!==undefined){
      for(const [slot,entry] of Object.entries(options.soulImages)){
        assertCharacterImageSlot(slot);
        if(entry.kind==='upload'){
          const asset=await preparePortrait(entry.image,'figure');
          soulAssets.push(asset);soulImages[slot]={kind:'upload',assetId:asset.assetId};
        }else soulImages[slot]={...entry};
      }
      normalizeSoulImageRefs(soulImages);
    }
    const database = await this.open();
    const detached=isSealedValue(snapshot)?snapshot:clone(snapshot),explicitReplay=options.battleReplayImport?.record??options.battleReplay;
    const [prepared,preparedReplay]=await Promise.all([prepareStateParts(detached),prepareReplayPart(options.battleOpening?detached:explicitReplay?.snapshot)]);
    const transaction = database.transaction(['saves', 'backups', 'narratives','avatars','settings','storyTurns',STORY_UNDO,PARTS], 'readwrite');
    const finished = transactionDone(transaction);
    void finished.catch(() => undefined);
    try {
      const saves = transaction.objectStore('saves');
      const backups = transaction.objectStore('backups');
      const narratives = transaction.objectStore('narratives');
      const previous = await requestResult<StoredSlot | undefined>(saves.get(slotId));
      let current:SaveSlotRecord|undefined=previous;
      if(previous?.replayPart&&previous.battleReplay&&!options.battleOpening&&options.battleReplay===undefined&&!options.battleReplayImport){
        if(isSealedValue(snapshot)&&this.#replayCache?.key===previous.replayPart){
          current={...previous,battleReplay:{...previous.battleReplay,snapshot:this.#replayCache.snapshot}};
        }else{
          current=await materialize(transaction,previous,true);
          if(isSealedValue(snapshot))this.#replayCache={key:previous.replayPart,snapshot:sealOwned(current.battleReplay!.snapshot)};
        }
      }
      const prune=new Set(previous?.partKeys);
      const owner = options.profileId ?? current?.profileId ?? 'auto';
      const worldId=owner;
      if(current)assertCurrentSnapshot(current.snapshot);
      const owningWorld=owner===slotId?current:await requestResult<SaveSlotRecord|undefined>(saves.get(owner));
      if(owningWorld)assertCurrentSnapshot(owningWorld.snapshot);
      if (await requestResult(transaction.objectStore('settings').get(`deleted-world:${owner}`))) throw new StorageConflictError('这个世界已被删除，请返回首页选择其他旅程');
      if (options.expectedStoredRevision !== undefined && (current?.revision ?? null) !== options.expectedStoredRevision) throw new StorageConflictError();
      const storageVersion = current ? current.storageVersion ?? 0 : null;
      if (options.expectedStorageVersion !== undefined && storageVersion !== options.expectedStorageVersion) throw new StorageConflictError();
      if(options.cloudCommit){
        const pending=await requestResult<{value:PendingOperation}|undefined>(transaction.objectStore('settings').get(`cloud-pending:${slotId}`));
        if(pending?.value.command.id!==options.cloudCommit.operationId||pending.value.command.expectedRevision!==options.cloudCommit.baseRevision)throw new StorageConflictError('待完成操作与保存结果不一致');
        transaction.objectStore('settings').delete(`cloud-pending:${slotId}`);
        transaction.objectStore('settings').put({key:`cloud-ack:${slotId}`,value:{resultId:options.cloudCommit.resultId,revision:snapshot.revision}});
      }
      if(options.resetCloudOperation){
        transaction.objectStore('settings').delete(`cloud-pending:${slotId}`);
        transaction.objectStore('settings').delete(`cloud-ack:${slotId}`);
      }
      const updatedAt = new Date().toISOString();
      const record: SaveSlotRecord = {
        slotId,label:String(options.label ?? current?.label ?? slotId).slice(0,60),revision:snapshot.revision,
        storageVersion:(storageVersion ?? 0) + 1,updatedAt,snapshot:detached,
        kind:options.kind ?? current?.kind ?? (slotId === 'auto' || slotId.startsWith('profile-') ? 'profile' : 'checkpoint'),
        profileId:options.profileId ?? current?.profileId ?? 'auto',
        avatarAssetId:portrait === undefined ? current?.avatarAssetId ?? (slotId === 'auto' ? 'player-avatar' : null) : portrait?.assetId ?? null,
        figureAssetId:figure===undefined?current?.figureAssetId??null:figure?.assetId??null,
        soulImages:options.soulImages===undefined?normalizeSoulImageRefs(current?.soulImages):soulImages,
        workspace:options.workspace === undefined ? clone(current?.workspace ?? null) : clone(options.workspace),
        storyHeadId:options.storyHeadId===undefined?current?.storyHeadId??null:options.storyHeadId,
        storyUndoHeadId:options.storyUndoHeadId===undefined?(options.storyHistory!==undefined?null:current?.storyUndoHeadId??null):options.storyUndoHeadId,
        battleReplay:options.battleReplay===undefined?current?.battleReplay??null:clone(options.battleReplay),
      };
      const archive=transaction.objectStore('storyTurns');
      if(options.battleReplayImport){
        record.battleReplay=clone(options.battleReplayImport.record);
        const remap=(id:string|null|undefined)=>{
          if(!id)return null;
          const index=options.battleReplayImport!.assets.findIndex(asset=>asset.assetId===id);
          if(index<0)throw new Error('战前检查点缺少图片资源');
          return replayAssets[index].assetId;
        };
        record.battleReplay.avatarAssetId=remap(record.battleReplay.avatarAssetId);
        record.battleReplay.figureAssetId=remap(record.battleReplay.figureAssetId);
        for(const image of Object.values(record.battleReplay.soulImages??{}))if(image.kind==='upload')image.assetId=remap(image.assetId)!;
        record.battleReplay.storyHeadId=null;
        for(const entry of options.battleReplayImport.storyHistory){
          const node:StoryArchiveRecord={...clone(entry),id:crypto.randomUUID(),worldId,previousId:record.battleReplay.storyHeadId};
          archive.put(node);record.battleReplay.storyHeadId=node.id;
        }
        for(const asset of replayAssets)transaction.objectStore('avatars').put(asset);
      }
      if(options.storyHistory!==undefined){
        record.storyHeadId=null;
        for(const entry of options.storyHistory){const node:StoryArchiveRecord={...clone(entry),id:crypto.randomUUID(),worldId,previousId:record.storyHeadId};archive.put(node);record.storyHeadId=node.id;}
      }
      const archivedRewrite=options.events?.find(event=>event.type==='story-archived-rewritten'&&event.revision===snapshot.revision)?.payload;
      if(archivedRewrite){
        const original=checkedStoryEntry(archivedRewrite.original),suffix:StoryArchiveRecord[]=[],seen=new Set<string>();let cursor=record.storyHeadId;
        while(cursor){
          if(seen.has(cursor))throw new StorageConflictError('故事历史引用重复，旧段正文尚未写入');seen.add(cursor);
          const node=await requestResult<StoryArchiveRecord|undefined>(archive.get(cursor));
          if(!node||node.worldId!==worldId)throw new StorageConflictError('故事历史缺失，旧段正文尚未写入');
          suffix.push(node);if(node.turn.number===original.turn.number)break;cursor=node.previousId;
        }
        const target=suffix.at(-1);
        if(!target||!jsonEqual(checkedStoryEntry(target),original))throw new StorageConflictError('原段落与当前历史不同，生成正文未覆盖原记录');
        const turn={...clone(target.turn),prose:archivedRewrite.prose};
        if(archivedRewrite.inlinePresentation)turn.inlinePresentation=clone(archivedRewrite.inlinePresentation) as any;else delete turn.inlinePresentation;
        let previousId=target.previousId;
        for(const node of suffix.reverse()){
          const entry=node.id===target.id?checkedStoryEntry({branchId:node.branchId,revision:snapshot.revision,turn}):checkedStoryEntry(node);
          const replacement:StoryArchiveRecord={...entry,id:crypto.randomUUID(),worldId,previousId};archive.put(replacement);previousId=replacement.id;
        }
        record.storyHeadId=previousId;
      }
      const active=(snapshot.state as any)?.扩展?.story?.active;
      let head=record.storyHeadId?await requestResult<StoryArchiveRecord|undefined>(archive.get(record.storyHeadId)):undefined;
      if(record.storyHeadId&&(!head||head.worldId!==worldId))throw new StorageConflictError('故事历史引用不属于当前世界或已经缺失');
      if(!active){record.storyHeadId=null;head=undefined;}
      else if(active.status==='complete'){
        const ledger=(snapshot.state as any).扩展.story;
        const entry=checkedStoryEntry({branchId:ledger.inheritedBranchId??ledger.branchId,revision:snapshot.revision,turn:active});
        if(head&&head.turn.number===active.number){
          if(head.branchId!==entry.branchId||!jsonEqual(head.turn,active)){
            const rewrite=options.events?.some(e=>e.type==='story-rewritten'&&e.revision===snapshot.revision&&e.payload.turn===active.number);
            const rewritten={...head.turn,prose:active.prose};
            if(active.inlinePresentation===undefined)delete rewritten.inlinePresentation;else rewritten.inlinePresentation=active.inlinePresentation;
            if(!rewrite||!jsonEqual(rewritten,active))throw new StorageConflictError('当前回合与已有故事不同，请先明确恢复对应的历史位置');
            // Immutable replacement: manual saves and backups retain the previous version's head.
            const node:StoryArchiveRecord={...entry,id:crypto.randomUUID(),worldId,previousId:head.previousId};archive.put(node);record.storyHeadId=node.id;
          }
        }else{
          if((head?.turn.number??0)!==active.number-1)throw new StorageConflictError('故事历史不连续，请读取完整存档');
          const node:StoryArchiveRecord={...entry,id:crypto.randomUUID(),worldId,previousId:record.storyHeadId??null};archive.put(node);record.storyHeadId=node.id;
        }
      }else if((head?.turn.number??0)!==active.number-1)throw new StorageConflictError('当前行动与故事历史位置不一致');
      // Portraits are immutable by content hash; backups keep their own portrait reference.
      if (portrait) transaction.objectStore('avatars').put(portrait);
      if (figure) transaction.objectStore('avatars').put(figure);
      for(const asset of soulAssets)transaction.objectStore('avatars').put(asset);
      // Previous versions stored the battle opening inline. Move it once, in the same transaction
      // as the next save and its backup. A unique key also preserves non-JSON IndexedDB values.
      const keepReplay=!options.battleOpening&&options.battleReplay===undefined&&!options.battleReplayImport;
      let previousPhysical=previous;
      if(previous?.battleReplay&&!previous.replayPart&&(keepReplay||options.backup!==false)){
        const key='legacy-replay:'+crypto.randomUUID();
        prepared.parts.set(key,previous.battleReplay.snapshot);
        previousPhysical={...previous,replayPart:key,partKeys:[...(previous.partKeys??[]),key],
          battleReplay:{...previous.battleReplay,snapshot:{...previous.battleReplay.snapshot,state:null}}};
      }
      if (current && options.backup !== false) {
        // IndexedDB already detached the previous record on read and copies it on put.
        const backup: StoredSlot<BackupRecord> = {...previousPhysical!,id:`${slotId}:${record.storageVersion}:${Date.now()}`,createdAt:updatedAt};
        putListed(backups,backup);
        if (options.checkpoint){
          const id=`${slotId}:checkpoint:${options.checkpoint.key}`;
          const replaced=await requestResult<StoredSlot|undefined>(backups.get(id));
          replaced?.partKeys?.forEach(key=>prune.add(key));
          putListed(backups,{...backup,id,recoveryLabel:options.checkpoint.label});
        }
      }
      if(options.storyOpening){
        const opening=options.storyOpening,ledger=(snapshot.state as any).扩展?.story;
        if(!previousPhysical||owner!==slotId||ledger?.branchId!==opening.branchId||ledger.active?.number!==opening.turn)throw new StorageConflictError('发送前的进度尚未保存，请重试');
        const id=crypto.randomUUID(),undo:StoredStoryUndo={...opening,id,worldId,previousId:previousPhysical.storyUndoHeadId??'',before:previousPhysical,partKeys:previousPhysical.partKeys??[]};
        transaction.objectStore(STORY_UNDO).add(undo);record.storyUndoHeadId=id;
      }
      if(options.battleOpening){
        const {snapshot,avatarAssetId,figureAssetId,soulImages,workspace,storyHeadId,storyUndoHeadId}=record;
        record.battleReplay=clone({snapshot,avatarAssetId,figureAssetId,soulImages,workspace,storyHeadId,storyUndoHeadId});
      }
      const replayPart=preparedReplay?.key??(keepReplay?previousPhysical?.replayPart:undefined);
      if(preparedReplay)prepared.parts.set(preparedReplay.key,preparedReplay.value);
      const physical:StoredSlot={...record,snapshot:prepared.snapshot,stateParts:prepared.refs,replayPart,
        partKeys:[...new Set([...prepared.refs.map(ref=>ref.key),...(replayPart?[replayPart]:[])])],listing:saveListing(record),saveDiagnostic:diagnosticSave(record)};
      if(replayPart&&physical.battleReplay)physical.battleReplay={...physical.battleReplay,snapshot:{...physical.battleReplay.snapshot,state:null}};
      await retainParts(transaction.objectStore(PARTS),prepared.parts,new Set(previous?.partKeys));
      putListed(saves,physical);
      if (options.replaceEvents) {
        const ids = await requestResult<IDBValidKey[]>(narratives.index('slotId').getAllKeys(slotId));
        for (const id of ids) narratives.delete(id);
      }
      for (const event of options.events ?? []) {
        const narrative: NarrativeRecord = {id:`${slotId}:${event.revision}:${event.id}`,slotId,revision:event.revision,createdAt:event.occurredAt,event:clone(event)};
        narratives.put(narrative);
      }
      // Keep bounded automatic recovery/history; manual slots remain explicit durable checkpoints.
      const backupIds = (await requestResult<IDBValidKey[]>(backups.index('slotId').getAllKeys(slotId))).filter(id => !String(id).startsWith(`${slotId}:checkpoint:`));
      backupIds.sort((a,b) => Number(String(a).split(':').at(-1)) - Number(String(b).split(':').at(-1)) || Number(String(a).split(':').at(-2)) - Number(String(b).split(':').at(-2)));
      for (const id of backupIds.slice(0,Math.max(0,backupIds.length - 20))){
        const retired=await requestResult<StoredSlot|undefined>(backups.get(id));
        retired?.partKeys?.forEach(key=>prune.add(key));backups.delete(id);
      }
      for(const key of physical.partKeys!)prune.delete(key);
      await pruneParts(transaction,prune);
      const eventIds = await requestResult<IDBValidKey[]>(narratives.index('slotId').getAllKeys(slotId));
      const eventRevision = (id: IDBValidKey) => Number(String(id).slice(slotId.length + 1).split(':')[0]);
      eventIds.sort((a,b) => eventRevision(a) - eventRevision(b) || String(a).localeCompare(String(b)));
      for (const id of eventIds.slice(0,Math.max(0,eventIds.length - 500))) narratives.delete(id);
      await finished;
      // All caller-owned data was copied while assembling this record.
      return record;
    } catch (error) {
      try { transaction.abort(); } catch { /* It may already have aborted due to a failed request. */ }
      await finished.catch(() => undefined);
      throw error;
    }
  }

  async loadSlot(slotIdInput: string,options:{forPlay?:boolean}={}): Promise<SaveSlotRecord | null> {
    const database = await this.open();
    const transaction = database.transaction(['saves',PARTS], 'readonly');
    const record = await requestResult<StoredSlot | undefined>(transaction.objectStore('saves').get(assertSafeIdentifier(slotIdInput, '存档槽编号')));
    const result=record?await materialize(transaction,record):null;
    await transactionDone(transaction);
    if(result&&options.forPlay&&isCurrentSnapshot(result.snapshot)){
      // IndexedDB detached these objects on read. Active play shares immutable
      // snapshots; the default load path still returns an editable, isolated copy.
      sealOwned(result.snapshot);
      if(record?.replayPart&&result.battleReplay){
        this.#replayCache={key:record.replayPart,snapshot:sealOwned(result.battleReplay.snapshot)};
      }
    }
    return result;
  }

  async getSlotAvatar(record: Pick<SaveSlotRecord,'avatarAssetId'> | null): Promise<AvatarRecord | null> {
    if (!record) return null;
    const assetId = record.avatarAssetId === undefined ? 'player-avatar' : record.avatarAssetId;
    return assetId ? this.getAvatar(assetId) : null;
  }

  async getSlotFigure(record:Pick<SaveSlotRecord,'figureAssetId'>|null):Promise<AvatarRecord|null>{return record?.figureAssetId?this.getAvatar(record.figureAssetId):null;}

  async getSlotSoulImages(record:Pick<SaveSlotRecord,'soulImages'>|null):Promise<SoulImageInputs>{
    const entries=await Promise.all(Object.entries(normalizeSoulImageRefs(record?.soulImages)).map(async([slot,entry])=>{
      if(entry.kind==='preset')return [slot,entry] as const;
      const image=await this.getAvatar(entry.assetId);
      if(!image)throw new Error('武魂图片文件缺失，请恢复存档或重新选择图片');
      return [slot,{kind:'upload',image} as const] as const;
    }));
    return Object.fromEntries(entries);
  }

  /** Persist intent before sending; another tab may only resume the same operation. */
  async beginCloudOperation(operation:PendingOperation):Promise<PendingOperation>{
    const id=assertSafeIdentifier(operation.worldId,'世界编号');assertNoSecretShape(operation);
    const database=await this.open(),tx=database.transaction(['settings','saves'],'readwrite');
    const done=transactionDone(tx);void done.catch(()=>{});
    try{
      const settings=tx.objectStore('settings'),key=`cloud-pending:${id}`;
      if(await requestResult(settings.get(`deleted-world:${id}`)))throw new StorageConflictError('这个世界已删除');
      const revision=await currentSlotRevision(tx.objectStore('saves'),id,operation.command.expectedRevision);
      const prior=await requestResult<{value:PendingOperation}|undefined>(settings.get(key));
      if(prior){await done;return clone(prior.value);}
      if(revision!==undefined&&revision!==operation.command.expectedRevision)throw new StorageConflictError();
      settings.put({key,value:clone(operation)});await done;return clone(operation);
    }catch(error){try{tx.abort();}catch{}await done.catch(()=>{});throw error;}
  }

  async rememberBattleTakeover(worldId:string,command:GameCommand):Promise<void>{
    const key=`cloud-pending:${assertSafeIdentifier(worldId,'世界编号')}`,database=await this.open();
    const tx=database.transaction('settings','readwrite'),settings=tx.objectStore('settings'),done=transactionDone(tx);
    void done.catch(()=>{});
    const prior=await requestResult<{value:PendingOperation}|undefined>(settings.get(key));
    const pending=prior?.value;
    if(pending?.phase==='command'&&pending.command.id===command.id&&pending.command.type===command.type&&pending.command.expectedRevision===command.expectedRevision){
      settings.put({key,value:{...pending,battleTakeover:true}});
    }
    await done;
  }

  async markAwaitingGeneration(worldId:string,original:GameCommand):Promise<PendingOperation>{
    return this.#generationOperation(worldId,original,'mark');
  }
  async replaceAwaitingGeneration(worldId:string,original:GameCommand,command:GameCommand):Promise<PendingOperation>{
    return this.#generationOperation(worldId,original,'replace',command);
  }
  async retryAwaitingGeneration(worldId:string,original:GameCommand):Promise<PendingOperation>{
    return this.#generationOperation(worldId,original,'retry');
  }
  async cancelAwaitingGeneration(worldId:string,original:GameCommand):Promise<boolean>{
    try{await this.#generationOperation(worldId,original,'cancel');return true;}catch(error){if(error instanceof StorageConflictError)return false;throw error;}
  }
  async #generationOperation(worldId:string,original:GameCommand,action:'mark'|'replace'|'cancel'|'retry',command?:GameCommand):Promise<PendingOperation>{
    const id=assertSafeIdentifier(worldId,'世界编号'),database=await this.open(),tx=database.transaction(['settings','saves'],'readwrite'),done=transactionDone(tx);void done.catch(()=>{});
    const same=jsonEqual;
    try{
      const settings=tx.objectStore('settings'),key=`cloud-pending:${id}`,prior=(await requestResult<{value:PendingOperation}|undefined>(settings.get(key)))?.value;
      const revision=await currentSlotRevision(tx.objectStore('saves'),id,original.expectedRevision);
      const ack=(await requestResult<{value:unknown}|undefined>(settings.get(`cloud-ack:${id}`)))?.value;
      if(ack||await requestResult(settings.get(`deleted-world:${id}`))||(revision??0)!==original.expectedRevision)throw new StorageConflictError();
      if(action==='replace'){const ticket=(command?.payload as any)?.ticket,source=ticket?.data?.command;if(!command||command.type!=='workflow.apply'||command.id===original.id||command.expectedRevision!==original.expectedRevision||ticket?.data?.worldId!==id||source?.type!=='generation.apply'||!same(source.payload?.command,original))throw new StorageConflictError('生成结果与原操作不一致');}
      if(action==='replace'&&prior?.phase==='command'&&command&&same(prior.command.payload,command.payload)&&prior.command.expectedRevision===original.expectedRevision){await done;return clone(prior);}
      if(!prior||prior.worldId!==id||!same(prior.command,original)||action!=='mark'&&prior.phase!=='awaiting-generation')throw new StorageConflictError('这次操作已变化，请继续当前进度');
      let next:PendingOperation={...prior,phase:'awaiting-generation'};
      if(action==='retry')next={...prior,phase:'command'};
      if(action==='replace'){
        next={worldId:id,command:command!,phase:'command',createdAt:prior.createdAt,...(prior.options?{options:prior.options}:{})};
      }
      if(action==='cancel')settings.delete(key);else settings.put({key,value:clone(next)});
      await done;return clone(next);
    }catch(error){try{tx.abort();}catch{}await done.catch(()=>{});throw error;}
  }

  async markRejectedWorkflow(worldId:string,command:GameCommand,code:NonNullable<PendingOperation['rejection']>):Promise<void>{
    const id=assertSafeIdentifier(worldId,'世界编号'),database=await this.open(),tx=database.transaction('settings','readwrite');
    const done=transactionDone(tx),settings=tx.objectStore('settings'),key=`cloud-pending:${id}`;
    void done.catch(()=>{});
    const prior=(await requestResult<{value:PendingOperation}|undefined>(settings.get(key)))?.value;
    if(prior?.phase==='command'&&prior.command.type==='workflow.apply'&&jsonEqual(prior.command,command))settings.put({key,value:{...prior,rejection:code}});
    await done;
  }

  /** The player explicitly keeps the saved world. Retain the complete refused
   * result before releasing its intent, atomically and without sending an ACK. */
  async archiveRejectedWorkflow(worldId:string,command:GameCommand):Promise<void>{
    const id=assertSafeIdentifier(worldId,'世界编号'),database=await this.open(),tx=database.transaction(['settings','saves'],'readwrite');
    const done=transactionDone(tx),settings=tx.objectStore('settings'),key=`cloud-pending:${id}`;
    void done.catch(()=>{});
    try{
      const prior=(await requestResult<{value:PendingOperation}|undefined>(settings.get(key)))?.value;
      const revision=await currentSlotRevision(tx.objectStore('saves'),id,command.expectedRevision);
      const ack=await requestResult<{value:unknown}|undefined>(settings.get(`cloud-ack:${id}`));
      if(!prior?.rejection||prior.phase!=='command'||command.type!=='workflow.apply'||!jsonEqual(prior.command,command)||revision!==command.expectedRevision||ack?.value)throw new StorageConflictError('原来的操作已经变化，请重新查看');
      settings.put({key:`cloud-rejected:${id}:${command.id}`,value:{...prior,archivedAt:new Date().toISOString()}});
      settings.delete(key);await done;
    }catch(error){try{tx.abort();}catch{}await done.catch(()=>{});throw error;}
  }

  async rejectedWorkflowResults(worldId:string):Promise<PendingOperation[]>{
    const id=assertSafeIdentifier(worldId,'世界编号'),database=await this.open();
    const store=database.transaction('settings','readonly').objectStore('settings');
    const keys=await requestResult<IDBValidKey[]>(store.getAllKeys());
    const rows=await Promise.all(keys.filter(key=>typeof key==='string'&&key.startsWith(`cloud-rejected:${id}:`)).map(key=>requestResult<{value:PendingOperation}>(store.get(key))));
    return rows.filter(row=>row.value.worldId===id).map(row=>clone(row.value));
  }
  async rejectedWorkflowCount(worldId:string):Promise<number>{
    const id=assertSafeIdentifier(worldId,'世界编号'),database=await this.open();
    const keys=await requestResult<IDBValidKey[]>(database.transaction('settings','readonly').objectStore('settings').getAllKeys());
    return keys.filter(key=>typeof key==='string'&&key.startsWith(`cloud-rejected:${id}:`)).length;
  }

  async clearRejectedCloudOperation(worldId:string,operationId:string):Promise<void>{
    const id=assertSafeIdentifier(worldId,'世界编号'),database=await this.open(),tx=database.transaction('settings','readwrite');
    const done=transactionDone(tx),settings=tx.objectStore('settings'),key=`cloud-pending:${id}`;
    const record=await requestResult<{value:PendingOperation}|undefined>(settings.get(key));
    if(record?.value.command.id===operationId)settings.delete(key);await done;
  }

  async slotOwner(slotId:string):Promise<string>{
    const id=assertSafeIdentifier(slotId,'存档槽编号'),db=await this.open();
    const index=db.transaction('saves','readonly').objectStore('saves').index('profileId');
    return new Promise((resolve,reject)=>{
      const request=index.openKeyCursor();
      request.onerror=()=>reject(request.error);
      request.onsuccess=()=>{
        const cursor=request.result;
        if(!cursor){resolve(id);return;}
        if(cursor.primaryKey===id){resolve(String(cursor.key));return;}
        cursor.continue();
      };
    });
  }

  async listSaveMenu(worldId?:string){
    const db=await this.open(),tx=db.transaction(worldId===undefined?'saves':['saves','backups'],'readonly');
    const [slots,backups]=await Promise.all([readSaveMenu(tx.objectStore('saves')),worldId===undefined?[]:readSaveMenu(tx.objectStore('backups'),worldId)]);
    return {slots:slots.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)),backups:backups.sort((a,b)=>b.createdAt!.localeCompare(a.createdAt!))};
  }

  async listSlots(): Promise<SaveSlotRecord[]> {
    const database = await this.open();
    const transaction = database.transaction(['saves',PARTS], 'readonly');
    const raw = await requestResult<StoredSlot[]>(transaction.objectStore('saves').getAll());
    const records=await Promise.all(raw.map(row=>materialize(transaction,row)));
    await transactionDone(transaction);
    return records.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async listBackups(slotIdInput: string): Promise<BackupRecord[]> {
    const slotId = assertSafeIdentifier(slotIdInput, '存档槽编号');
    const database = await this.open();
    const transaction = database.transaction(['backups',PARTS], 'readonly');
    const raw = await requestResult<StoredSlot<BackupRecord>[]>(transaction.objectStore('backups').index('slotId').getAll(slotId));
    const records=await Promise.all(raw.map(row=>materialize(transaction,row)));
    await transactionDone(transaction);
    return records.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async loadBackup(backupIdInput: string): Promise<BackupRecord | null> {
    const backupId = assertSafeIdentifier(backupIdInput, '备份编号', 200);
    const database = await this.open();
    const transaction = database.transaction(['backups',PARTS], 'readonly');
    const record = await requestResult<StoredSlot<BackupRecord> | undefined>(transaction.objectStore('backups').get(backupId));
    const result=record?await materialize(transaction,record):null;
    await transactionDone(transaction);
    return result;
  }

  async deleteSlot(slotIdInput: string): Promise<void> {
    await this.removeRecords(slotIdInput, 'slot');
  }

  async removeRecords(idInput: string, mode: 'slot' | 'world' | 'autosave', emptySnapshot?: GameSnapshot): Promise<void> {
    const id = assertSafeIdentifier(idInput, '存档编号');
    const db = await this.open();
    const tx = db.transaction(['saves','backups','narratives','avatars','settings','storyTurns',STORY_UNDO,PARTS], 'readwrite');
    const done = transactionDone(tx); void done.catch(() => undefined);
    try {
      const saves = tx.objectStore('saves');
      const all = await requestResult<StoredSlot[]>(saves.getAll());
      const prune=new Set<string>();
      const target = all.find(record => record.slotId === id);
      if (!target) throw new Error('存档已不存在，请刷新列表');
      if(mode==='autosave'){assertCurrentSnapshot(target.snapshot);assertCurrentSnapshot(emptySnapshot);}
      if (mode === 'slot' && (target.kind === 'profile' || id === 'auto')) throw new Error('请使用删除自动存档或删除世界');
      if (mode !== 'slot' && target.kind !== 'profile' && id !== 'auto') throw new Error('没有找到该世界');
      const ids = new Set(all.filter(record => record.slotId === id || (mode === 'world' && (record.profileId ?? 'auto') === id)).map(record => record.slotId));
      for (const slotId of ids) {
        all.find(row=>row.slotId===slotId)?.partKeys?.forEach(key=>prune.add(key));
        saves.delete(slotId);
        for (const name of ['backups','narratives']) {
          const store = tx.objectStore(name);
          for (const key of await requestResult<IDBValidKey[]>(store.index('slotId').getAllKeys(slotId))){
            if(name==='backups'){const row=await requestResult<StoredSlot>(store.get(key));row?.partKeys?.forEach(key=>prune.add(key));}
            store.delete(key);
          }
        }
      }
      if (mode === 'world') {tx.objectStore('settings').put({key:`deleted-world:${id}`,value:true});tx.objectStore('settings').delete(`soul-advice-recovery:${id}`);}
      if(mode==='world'){const settings=tx.objectStore('settings');for(const key of await requestResult<IDBValidKey[]>(settings.getAllKeys()))if(typeof key==='string'&&[`model-evidence:${id}:`,`failure-diagnostic:${id}:`,`cloud-rejected:${id}:`].some(prefix=>key.startsWith(prefix)))settings.delete(key);this.#diagnosticMemory.delete(id);}
      if(mode==='world'){const archive=tx.objectStore('storyTurns');for(const key of await requestResult<IDBValidKey[]>(archive.index('worldId').getAllKeys(id)))archive.delete(key);}
      if(mode==='world')await visitStoryUndo(tx,(row,cursor)=>{row.partKeys.forEach(key=>prune.add(key));cursor.delete();},id);
      if (mode === 'autosave') {
        if (!emptySnapshot) throw new Error('缺少空存档');
        putListed(saves,{...target,stateParts:undefined,replayPart:undefined,partKeys:undefined,listing:undefined,saveDiagnostic:undefined,snapshot:clone(emptySnapshot),revision:emptySnapshot.revision,storageVersion:(target.storageVersion ?? 0)+1,updatedAt:new Date().toISOString(),avatarAssetId:null,figureAssetId:null,soulImages:{},workspace:null,storyHeadId:null,storyUndoHeadId:null,battleReplay:null,autosaveEmpty:true});
      }
      await pruneParts(tx,prune);
      const remaining = await requestResult<SaveSlotRecord[]>(saves.getAll());
      const backups = await requestResult<BackupRecord[]>(tx.objectStore('backups').getAll());
      const assets=(record:SaveSlotRecord)=>[record,...(record.battleReplay?[record.battleReplay]:[])].flatMap(record=>[record.avatarAssetId===undefined?'player-avatar':record.avatarAssetId,record.figureAssetId,...Object.values(record.soulImages??{}).flatMap(image=>image.kind==='upload'?[image.assetId]:[])]);
      const used=new Set([...remaining,...backups].flatMap(assets));
      await visitStoryUndo(tx,row=>assets(row.before).forEach(id=>used.add(id)));
      for (const asset of await requestResult<AvatarRecord[]>(tx.objectStore('avatars').getAll())) if (!used.has(asset.assetId)) tx.objectStore('avatars').delete(asset.assetId);
      await done;
    } catch(error) {try {tx.abort();} catch {} await done.catch(() => undefined); throw error;}
  }

  async putAvatar(record: AvatarRecord): Promise<void> {
    assertSafeIdentifier(record.assetId, '头像资源编号');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(record.mimeType)) throw new Error('头像图片类型不受支持');
    if (record.byteLength <= 0 || record.byteLength > 128 * 1024) throw new Error('头像超过128KB安全上限');
    const database = await this.open();
    const transaction = database.transaction('avatars', 'readwrite');
    transaction.objectStore('avatars').put(clone(record));
    await transactionDone(transaction);
  }

  async getAvatar(assetId: string): Promise<AvatarRecord | null> {
    const database = await this.open();
    const transaction = database.transaction('avatars', 'readonly');
    const record = await requestResult<AvatarRecord | undefined>(transaction.objectStore('avatars').get(assertSafeIdentifier(assetId, '头像资源编号')));
    await transactionDone(transaction);
    return record ? clone(record) : null;
  }

  async deleteAvatar(assetIdInput: string): Promise<void> {
    const database = await this.open();
    const transaction = database.transaction('avatars', 'readwrite');
    transaction.objectStore('avatars').delete(assertSafeIdentifier(assetIdInput, '头像资源编号'));
    await transactionDone(transaction);
  }

  async appendEvents(slotIdInput: string, events: GameEvent[]): Promise<void> {
    if (!events.length) return;
    const slotId = assertSafeIdentifier(slotIdInput, '存档槽编号');
    assertNoSecretShape(events);
    const database = await this.open();
    const transaction = database.transaction('narratives', 'readwrite');
    const store = transaction.objectStore('narratives');
    for (const event of events) {
      const record: NarrativeRecord = {
        id: `${slotId}:${event.revision}:${event.id}`,
        slotId,
        revision: event.revision,
        createdAt: event.occurredAt,
        event: clone(event),
      };
      store.put(record);
    }
    await transactionDone(transaction);
  }

  async listEvents(slotIdInput:string,limit?:number):Promise<NarrativeRecord[]> {
    const slotId=assertSafeIdentifier(slotIdInput,'存档槽编号');
    if(limit!==undefined&&(!Number.isSafeInteger(limit)||limit<1))throw Error('事件条数无效');
    const database=await this.open(),tx=database.transaction('narratives','readonly');
    const store=tx.objectStore('narratives'),bySlot=store.index('slotId'),byRevision=store.index('slotRevision');
    const order=(a:NarrativeRecord,b:NarrativeRecord)=>a.revision-b.revision||
      (a.event.sequence??0)-(b.event.sequence??0)||this.#factory.cmp(a.id,b.id);
    const range=limit!==undefined&&globalThis.IDBKeyRange?IDBKeyRange.bound([slotId,0],[slotId,Number.MAX_SAFE_INTEGER]):null;
    const counts=range?await Promise.all([requestResult(bySlot.count(slotId)),requestResult(byRevision.count(range))]):null;
    // Older records without an indexed revision retain their original ordering.
    if(!range||limit===undefined||!counts||counts[0]<=limit||counts[0]!==counts[1]){
      const rows=await requestResult<NarrativeRecord[]>(bySlot.getAll(slotId));
      await transactionDone(tx);rows.sort(order);return limit===undefined?rows:rows.slice(-limit);
    }
    // Locate the oldest requested revision using keys, then use one bulk read
    // for the ordinary case. Include the entire boundary turn before sorting.
    const boundary=await new Promise<IDBValidKey>((resolve,reject)=>{
      const request=byRevision.openKeyCursor(range,'prev');let advance=limit-1;
      request.onerror=()=>reject(request.error);
      request.onsuccess=()=>{
        const cursor=request.result;
        if(!cursor){reject(Error('存档事件索引缺少记录'));return;}
        if(advance){cursor.advance(advance);advance=0;}else resolve(cursor.key);
      };
    });
    const tail=IDBKeyRange.bound(boundary,range.upper);
    if(await requestResult(byRevision.count(tail))<=2*limit){
      const rows=await requestResult<NarrativeRecord[]>(byRevision.getAll(tail));
      await transactionDone(tx);return rows.sort(order).slice(-limit);
    }
    // An unusually large single turn must not allocate all its event bodies.
    const rows:NarrativeRecord[]=[];
    await new Promise<void>((resolve,reject)=>{
      const request=byRevision.openCursor(tail,'prev');
      request.onerror=()=>reject(request.error);
      request.onsuccess=()=>{
        const cursor=request.result;
        if(!cursor){resolve();return;}
        rows.push(cursor.value);
        if(rows.length===2*limit){rows.sort(order);rows.splice(0,limit);}
        cursor.continue();
      };
    });
    await transactionDone(tx);return rows.sort(order).slice(-limit);
  }

  async storyWithdrawalTargets(record:Pick<SaveSlotRecord,'profileId'|'slotId'|'storyUndoHeadId'>){
    const db=await this.open(),tx=db.transaction(STORY_UNDO,'readonly');
    return storyUndoTargets(tx,record);
  }

  async storyWithdrawalBefore(record:SaveSlotRecord,id:string){
    const db=await this.open(),tx=db.transaction([STORY_UNDO,PARTS],'readonly');
    return storyUndoBefore(tx,record,id);
  }

  /** Newest first along immutable links. Keep the captured record when requesting later pages. */
  async storyPage(record:Pick<SaveSlotRecord,'profileId'|'storyHeadId'>,options:{nextId?:string|null;limit?:number}={}):Promise<StoryArchivePage>{
    const limit=options.limit??25;if(!Number.isInteger(limit)||limit<1||limit>100)throw Error('每次读取 1 到 100 段故事');
    const headId=record.storyHeadId??null,worldId=record.profileId??'auto';
    if(!headId)return {entries:[],headId:null,nextId:null};
    const database=await this.open(),tx=database.transaction('storyTurns','readonly'),done=transactionDone(tx);void done.catch(()=>{});
    const entries:StoryArchiveRecord[]=[],seen=new Set<string>();let id=options.nextId===undefined?headId:options.nextId;
    try{
      while(id&&entries.length<limit){if(seen.has(id))throw Error('故事历史引用循环');seen.add(id);const entry=await requestResult<StoryArchiveRecord|undefined>(tx.objectStore('storyTurns').get(id));
        if(!entry||entry.worldId!==worldId)throw Error('故事历史缺失或不属于此世界');entries.push(clone(entry));id=entry.previousId;}
      await done;return {entries,headId,nextId:id??null};
    }catch(error){try{tx.abort();}catch{}await done.catch(()=>{});throw error;}
  }

  async exportStoryHistory(record:SaveSlotRecord|null):Promise<StoryArchiveEntry[]>{
    if(!record)return [];
    const entries:StoryArchiveEntry[]=[],seen=new Set<string>();let nextId: string|null|undefined;
    do{const page=await this.storyPage(record,{nextId,limit:100});for(const entry of page.entries){if(seen.has(entry.id))throw Error('故事历史引用循环');seen.add(entry.id);entries.push(checkedStoryEntry(entry));}nextId=page.nextId;}while(nextId);
    return checkedStoryHistory(record.snapshot,entries.reverse());
  }

  get sharesBrowserDatabase(){return typeof indexedDB!=='undefined'&&this.#factory===indexedDB;}

  async serializeWorld(source:ExportSource,archiveOnly=false):Promise<string>{
    if('slotId' in source)assertSafeIdentifier(source.slotId,'存档槽编号');
    return serializeDatabaseWorld(await this.open(),source,archiveOnly,(a,b)=>this.#factory.cmp(a,b));
  }

  exportReadOnlyWorld(slotId:string):Promise<string>{return this.serializeWorld({slotId},true);}

  async putModelEvidence(worldIdInput:string,evidence:ModelEvidence):Promise<void>{
    const worldId=assertSafeIdentifier(worldIdInput,'世界编号');validateModelEvidence(evidence);
    if(evidence.worldId!==worldId)throw new StorageConflictError('生成记录不属于本旅程');
    const database=await this.open(),tx=database.transaction('settings','readwrite'),done=transactionDone(tx);void done.catch(()=>{});
    try{
      const store=tx.objectStore('settings'),key=`model-evidence:${worldId}:${evidence.id}`;
      if(await requestResult(store.get(`deleted-world:${worldId}`)))throw new StorageConflictError('这个世界已删除，旧生成记录未重新写入');
      const prior=await requestResult<{value:ModelEvidence}|undefined>(store.get(key));
      if(prior&&['kind','branchId','turn','snapshotRevision','startedAt'].some(k=>(prior.value as any)[k]!== (evidence as any)[k]))throw new StorageConflictError('同一生成记录的来源发生变化');
      if(!prior||prior.value.sequence<evidence.sequence)store.put({key,value:clone(evidence)});
      await done;
    }catch(error){try{tx.abort();}catch{}await done.catch(()=>{});throw error;}
  }

  async listModelEvidence(worldIdInput:string):Promise<ModelEvidence[]>{
    const worldId=assertSafeIdentifier(worldIdInput,'世界编号'),prefix=`model-evidence:${worldId}:`,database=await this.open(),tx=database.transaction('settings','readonly');
    const store=tx.objectStore('settings'),done=transactionDone(tx),keys=await requestResult<IDBValidKey[]>(store.getAllKeys());
    const rows=await Promise.all(keys.filter(key=>typeof key==='string'&&key.startsWith(prefix)).map(key=>requestResult<{value:ModelEvidence}>(store.get(key))));await done;
    return rows.map(r=>clone(r.value)).sort((a,b)=>a.startedAt.localeCompare(b.startedAt)||a.id.localeCompare(b.id));
  }

  async putSetting(keyInput: string, value: JsonValue): Promise<void> {
    const key = assertSafeIdentifier(keyInput, '设置编号');
    const database = await this.open();
    const transaction = database.transaction('settings', 'readwrite');
    transaction.objectStore('settings').put({key, value: clone(value)});
    await transactionDone(transaction);
  }

  /** A retained task can only replace/clear the setting it still owns. */
  async updateSetting(keyInput:string,update:(value:JsonValue|null)=>JsonValue):Promise<JsonValue>{
    const key=assertSafeIdentifier(keyInput,'设置编号'),database=await this.open(),tx=database.transaction('settings','readwrite'),done=transactionDone(tx);
    void done.catch(()=>{});
    try{
      const store=tx.objectStore('settings'),prior=await requestResult<{value:JsonValue}|undefined>(store.get(key));
      const value=update(prior?.value??null);store.put({key,value:clone(value)});await done;return clone(value);
    }catch(error){try{tx.abort();}catch{}await done.catch(()=>{});throw error;}
  }

  async getSetting<T extends JsonValue>(keyInput: string): Promise<T | null> {
    const database = await this.open();
    const transaction = database.transaction('settings', 'readonly');
    const record = await requestResult<{key: string; value: T} | undefined>(transaction.objectStore('settings').get(assertSafeIdentifier(keyInput, '设置编号')));
    await transactionDone(transaction);
    return record ? clone(record.value) : null;
  }

}

/** Local model credentials are separate from preferences, worlds and exports. */
export class ModelKeyStore {
  #session=new Map<string,string>();
  #saving=false;
  warning='';
  constructor(readonly storage: Storage = localStorage) {}

  #read(id:string){return this.#session.get(id)??this.storage.getItem(id);}
  #write(id:string,disk:string|null,active:string|null=disk){
    if(disk===null)this.storage.removeItem(id);else this.storage.setItem(id,disk);
    if(active!==null&&disk!==active)this.#session.set(id,active);else this.#session.delete(id);
  }
  getKey(profileId: string): string {
    return this.#read(this.#id(profileId)) ?? '';
  }

  getHeaders(profileId:string):Record<string,string> {
    const raw=this.#read(this.#id(profileId)+':headers');return raw?JSON.parse(raw):{};
  }
  saveHeaders(profileId:string,headers:Record<string,string>):void {
    const id=this.#id(profileId)+':headers',entries=Object.entries(headers);
    if(nativeModelCredentials()&&entries.some(([,value])=>value&&!credentialRef(value)))throw Error('请在模型设置中保存认证信息');
    const durable=entries.filter(([,value])=>credentialRef(value)!=='session');
    this.#write(id,durable.length?JSON.stringify(Object.fromEntries(durable)):null,entries.length?JSON.stringify(headers):null);
  }

  status(profileId: string): 'saved' | 'session' | 'missing' {
    const key=this.getKey(profileId);return credentialRef(key)==='session'?'session':key?'saved':'missing';
  }

  saveKey(profileId: string, apiKey: string): void {
    const id = this.#id(profileId);
    if(nativeModelCredentials()&&apiKey&&!credentialRef(apiKey))throw Error('请在模型设置中保存密钥');
    this.#write(id,credentialRef(apiKey)==='session'?null:apiKey||null,apiKey||null);
  }

  clearKey(profileId:string){return this.replace([{id:profileId,baseUrl:'',apiKey:'',credentialHeaders:{}}],()=>{});}

  migrate(models:CredentialOwner[]){
    if(!nativeModelCredentials())return;
    const legacy:CredentialWrite[]=[];
    const ids=new Set<string>();
    for(let i=0;i<this.storage.length;i++){
      const key=this.storage.key(i);
      if(key?.startsWith('douluo:credential:'))ids.add(key.slice('douluo:credential:'.length).replace(/:headers$/,''));
    }
    for(const id of ids){
      const apiKey=this.getKey(id),credentialHeaders=this.getHeaders(id);
      if([apiKey,...Object.values(credentialHeaders)].some(value=>value&&!credentialRef(value))){
        const owner=models.find(model=>model.id===id);
        legacy.push({id,baseUrl:owner?.baseUrl??'',transport:owner?.transport,apiKey,credentialHeaders});
      }
    }
    if(legacy.length)return this.replace(legacy,()=>{},true);
  }

  replace(writes:CredentialWrite[],saveSettings:()=>void,migrating=false):void|Promise<void>{
    const bridge=nativeModelCredentials();
    if(bridge&&this.#saving)throw Error('模型设置正在保存，请稍后重试');
    if(!migrating)writes=writes.filter(row=>row.apiKey!==this.getKey(row.id)||JSON.stringify(row.credentialHeaders)!==JSON.stringify(this.getHeaders(row.id)));
    if(!writes.length){saveSettings();return;}
    type Row=CredentialValues&{id:string};
    const apply=(rows:Row[])=>{
      const previous=new Map<string,{disk:string|null;active:string|null}>();
      for(const row of rows)for(const key of [this.#id(row.id),this.#id(row.id)+':headers'])previous.set(key,{disk:this.storage.getItem(key),active:this.#read(key)});
      try{for(const row of rows){this.saveKey(row.id,row.apiKey);this.saveHeaders(row.id,row.credentialHeaders);}saveSettings();}
      catch(error){for(const [key,old] of previous)this.#write(key,old.disk,old.active);throw error;}
    };
    if(!bridge)return apply(writes);
    this.#saving=true;
    const refs=(rows:CredentialValues[])=>rows.flatMap(row=>[row.apiKey,...Object.values(row.credentialHeaders)]).filter(value=>credentialRef(value));
    return (async()=>{
      const previous=refs(writes.map(row=>({apiKey:this.getKey(row.id),credentialHeaders:this.getHeaders(row.id)})));
      const result=await bridge.seal(writes.map(scopeCredentialWrite)),retained=new Set(refs(result.profiles));
      const sessionOnly=[...retained].some(ref=>credentialRef(ref)==='session');
      try{
        if(migrating&&sessionOnly)throw Error('Windows 暂时无法加密旧模型凭据，原配置已保留。恢复后重新打开游戏即可迁移。');
        apply(result.profiles);
      }catch(error){await bridge.forget(result.created).catch(()=>{});throw error;}
      this.warning=this.#session.size?'Windows 加密暂不可用。新输入的模型凭据仅本次会话有效。':'';
      await bridge.forget(previous.filter(ref=>!retained.has(ref))).catch(()=>{this.warning='设置已保存，旧加密文件暂未清理。';});
    })().finally(()=>{this.#saving=false;});
  }

  #id(profileId: string): string {
    return `douluo:credential:${assertSafeIdentifier(profileId, '模型配置编号')}`;
  }
}

export class UiPreferenceStore {
  readonly #storage: Storage;

  constructor(storage: Storage = localStorage) {
    this.#storage = storage;
  }

  get<T extends JsonValue>(key: string, fallback: T): T {
    try {
      const raw = this.#storage.getItem(`douluo:ui:${assertSafeIdentifier(key, '界面设置编号')}`);
      return raw === null ? fallback : JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  set(key: string, value: JsonValue): void {
    this.#storage.setItem(`douluo:ui:${assertSafeIdentifier(key, '界面设置编号')}`, JSON.stringify(value));
  }
}
