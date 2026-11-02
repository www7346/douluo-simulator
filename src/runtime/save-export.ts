import {exportFullSave} from '../shared/save-bundle';
import {saveCodec} from '../shared/save-codec';
import {isCurrentSnapshot} from '../shared/snapshot-version';
import {latestReplayBattleId} from '../shared/story-battles';
import type {StoryArchiveEntry,StoryArchiveRecord} from '../shared/story-archive';
import type {GameSnapshot} from './contracts';
import {requestResult,transactionDone} from './idb-read';
import {materialize,PARTS,type StoredSlot} from './save-parts';
import {normalizeSoulImageRefs,type SoulImageRefs} from './soul-images';
import type {AvatarRecord,BackupRecord,BattleReplayRecord,NarrativeRecord,SaveSlotRecord} from './storage';

export type ExportSource={slotId:string}|{snapshot:GameSnapshot;record:SaveSlotRecord|null};
type CompareKeys=(a:IDBValidKey,b:IDBValidKey)=>number;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export async function avatarRecordToAttachment(record: AvatarRecord,kind:'avatar'|'figure'|'soul-image'='avatar'): Promise<Record<string, any>> {
  const bytes = new Uint8Array(await record.blob.arrayBuffer());
  const data=`data:${record.mimeType};base64,${bytesToBase64(bytes)}`;
  return kind==='soul-image'?saveCodec.createSoulImageAttachment(data,record.width,record.height):kind==='figure'?saveCodec.createFigureAttachment(data,record.width,record.height):saveCodec.createAvatarAttachment(data);
}

/** Use the stored snapshot and its exact history and artwork, including the
 * replay's own references. Encoding blobs or validating a large world happens
 * after the read transaction so subsequent writes can proceed. */
export async function serializeDatabaseWorld(db:IDBDatabase,source:ExportSource,archiveOnly:boolean,compare:CompareKeys){
  const tx=db.transaction(['saves','backups','narratives','storyTurns','avatars',PARTS],'readonly');
  const done=transactionDone(tx);void done.catch(()=>{});
  try{
    let record:SaveSlotRecord|null,snapshot:GameSnapshot;
    if('slotId' in source){
      const raw=await requestResult<StoredSlot|undefined>(tx.objectStore('saves').get(source.slotId));
      if(!raw)throw Error('没有找到需要备份的本地存档');
      if(archiveOnly||!isCurrentSnapshot(raw.snapshot))return await serializeReadOnlyArchive(tx,done,raw,compare);
      record=await materialize(tx,raw);snapshot=record.snapshot;
    }else{
      ({snapshot,record}=source);
      if(record&&!isCurrentSnapshot(record.snapshot)){
        const raw=await requestResult<StoredSlot|undefined>(tx.objectStore('saves').get(record.slotId));
        if(!raw||isCurrentSnapshot(raw.snapshot))throw Error('原来的旧档已变化，请重新选择需要备份的世界');
        return await serializeReadOnlyArchive(tx,done,raw,compare);
      }
    }
    const assets=new Map<string,Promise<AvatarRecord|undefined>>(),turns=new Map<string,Promise<StoryArchiveRecord|undefined>>();
    const asset=(id:string|null|undefined)=>{
      if(!id)return undefined;
      let result=assets.get(id);
      if(!result){result=requestResult(tx.objectStore('avatars').get(id));assets.set(id,result);}
      return result;
    };
    const history=async(head:string|null|undefined)=>{
      const entries:StoryArchiveEntry[]=[],seen=new Set<string>();
      while(head){
        if(seen.has(head))throw Error('故事历史引用循环');
        seen.add(head);
        let pending=turns.get(head);
        if(!pending){pending=requestResult(tx.objectStore('storyTurns').get(head));turns.set(head,pending);}
        const entry=await pending;
        if(!entry||entry.worldId!==(record?.profileId??'auto'))throw Error('故事历史缺失或不属于此世界');
        entries.push({branchId:entry.branchId,revision:entry.revision,turn:entry.turn});head=entry.previousId;
      }
      return entries.reverse();
    };
    const capture=async(state:GameSnapshot,head:BattleReplayRecord|null)=>{
      const refs=normalizeSoulImageRefs(head?.soulImages);
      const [avatar,figure,images,storyHistory]=await Promise.all([
        asset(head&&head.avatarAssetId===undefined?'player-avatar':head?.avatarAssetId),asset(head?.figureAssetId),
        Promise.all(Object.entries(refs).map(async([slot,ref])=>{
          if(ref.kind==='preset')return [slot,ref] as const;
          const image=await asset(ref.assetId);
          if(!image)throw Error('武魂图片文件缺失，请恢复存档或重新选择图片');
          return [slot,{kind:'upload',image}] as const;
        })),history(head?.storyHeadId)
      ]);
      return {state,workspace:head?.workspace,avatar,figure,images,storyHistory};
    };
    const opening=record?.battleReplay;
    const matchesBattle=opening&&(opening.snapshot.state as any).战斗?.id===latestReplayBattleId(snapshot.state);
    // Older replay heads may omit unchanged attachment and workspace references.
    const [world,replay]=await Promise.all([
      capture(snapshot,record),
      matchesBattle?capture(opening.snapshot,{...record,...opening}):null
    ]);
    await done;
    const encode=async(data:typeof world,battleReplay?:string)=>{
      const attachments:Record<string,any>[]=[];
      if(data.avatar)attachments.push(await avatarRecordToAttachment(data.avatar));
      if(data.figure)attachments.push(await avatarRecordToAttachment(data.figure,'figure'));
      const soulImages:SoulImageRefs={};
      for(const [slot,image] of data.images){
        if(image.kind==='preset')soulImages[slot]=image;
        else{
          const attachment=await avatarRecordToAttachment(image.image,'soul-image');
          if(!attachments.some(item=>item.assetId===attachment.assetId))attachments.push(attachment);
          soulImages[slot]={kind:'upload',assetId:attachment.assetId};
        }
      }
      const state=data.state.state as any,playerName=state?.人物?.列表?.[state?.角色?.主控单位ID]?.name;
      return exportFullSave(data.state,{playerName,attachments,workspace:data.workspace,soulImages,storyHistory:data.storyHistory,battleReplay});
    };
    return encode(world,replay?await encode(replay):undefined);
  }catch(error){try{tx.abort();}catch{}await done.catch(()=>{});throw error;}
}

async function serializeReadOnlyArchive(tx:IDBTransaction,done:Promise<void>,source:StoredSlot,compare:CompareKeys){
  const worldId=source.profileId??source.slotId;
  const belongs=(record:SaveSlotRecord)=>(record.profileId??record.slotId)===worldId;
  const readWorldRows=async<T extends SaveSlotRecord>(table:'saves'|'backups',alreadyRead?:StoredSlot<T>)=>{
    const store=tx.objectStore(table);
    const keys=new Set(await requestResult(store.index('profileId').getAllKeys(worldId)));
    // Records from before profileId use their slot as the world identifier.
    if(table==='saves')keys.add(worldId);
    else for(const key of await requestResult(store.index('slotId').getAllKeys(worldId)))keys.add(key);
    const rows:T[]=[];
    for(const key of [...keys].sort((a,b)=>compare(a,b))){
      const raw=alreadyRead?.slotId===key?alreadyRead:await requestResult<StoredSlot<T>|undefined>(store.get(key));
      if(raw&&belongs(raw))rows.push(await materialize(tx,raw));
    }
    return rows;
  };
  const [saves,backups]=await Promise.all([readWorldRows<SaveSlotRecord>('saves',source),readWorldRows<BackupRecord>('backups')]);
  const storyTurns=await requestResult<StoryArchiveRecord[]>(tx.objectStore('storyTurns').index('worldId').getAll(worldId));
  const slots=new Set([...saves,...backups].map(record=>record.slotId));
  const bySlot=tx.objectStore('narratives').index('slotId');
  const narratives=(await Promise.all([...slots].map(id=>requestResult<NarrativeRecord[]>(bySlot.getAll(id))))).flat()
    .sort((a,b)=>compare(a.id,b.id));
  const assetIds=new Set<string>();
  const collect=(record:Pick<SaveSlotRecord,'avatarAssetId'|'figureAssetId'|'soulImages'|'battleReplay'>)=>{
    const avatar=record.avatarAssetId===undefined?'player-avatar':record.avatarAssetId;
    if(avatar)assetIds.add(avatar);
    if(record.figureAssetId)assetIds.add(record.figureAssetId);
    for(const image of Object.values(record.soulImages??{}))if(image?.kind==='upload')assetIds.add(image.assetId);
    if(record.battleReplay)collect(record.battleReplay);
  };
  [...saves,...backups].forEach(collect);
  const avatars=tx.objectStore('avatars');
  const assets=(await Promise.all([...assetIds].sort().map(id=>requestResult<AvatarRecord|undefined>(avatars.get(id)))))
    .filter((asset):asset is AvatarRecord=>asset!==undefined);
  await done;
  const archivedAssets=await Promise.all(assets.map(async asset=>{
    // JSON cannot encode Blob. Preserve original bytes without decoding,
    // resizing or applying the current image acceptance rules.
    const bytes=new Uint8Array(await asset.blob.arrayBuffer());let binary='';
    for(let offset=0;offset<bytes.length;offset+=8192)binary+=String.fromCharCode(...bytes.subarray(offset,offset+8192));
    return {...asset,blob:{encoding:'base64',type:asset.blob.type,data:btoa(binary)}};
  }));
  return JSON.stringify({format:'douluo-readonly-world-archive',archiveVersion:1,exportedAt:new Date().toISOString(),worldId,saves,backups,storyTurns,narratives,assets:archivedAssets});
}
