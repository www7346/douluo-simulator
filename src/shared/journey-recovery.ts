import type {BackupRecord,SaveSlotRecord} from '../runtime/storage';
export interface JourneyRecoveryChoice {id:string;kind:'backup'|'slot';label:string;level:number;location:string;updatedAt:string;revision:number;recommended:boolean}
export function recoveryCandidates(profileId:string,backups:BackupRecord[],slots:SaveSlotRecord[]) {
  return [...backups.filter(record=>record.slotId===profileId).map(record=>({record,kind:'backup' as const,id:record.id})),
    ...slots.filter(record=>record.slotId!==profileId&&record.kind!=='profile'&&(record.profileId??'auto')===profileId).map(record=>({record,kind:'slot' as const,id:record.slotId}))];
}
/** Rank already inspected checkpoints; no validity or activity rules run here. */
export function rankRecoveryChoices(current:any,profileId:string,backups:BackupRecord[],slots:SaveSlotRecord[],inspections:Map<object,{pass:boolean;outsideActivity:boolean}>):JourneyRecoveryChoice[] {
  const playerId=current?.角色?.主控单位ID;if(!playerId)return [];
  const ranked=recoveryCandidates(profileId,backups,slots).flatMap(({record,kind,id})=>{
    const inspected=inspections.get(record);if(!inspected?.pass)return [];
    const state:any=record.snapshot.state,named='recoveryLabel' in record&&record.recoveryLabel;
    const priority=inspected.outsideActivity?(named?0:1):kind==='slot'?2:named?3:4;
    return [{id,kind,label:String(named||record.label||'已保存的旅程'),level:state.成长?.列表?.[playerId]?.魂力等级??1,
      location:state.地图?.地点?.[state.地图?.当前地点ID]?.name??'旅程途中',updatedAt:record.updatedAt,revision:record.revision,recommended:false,priority,content:JSON.stringify({state,avatar:record.avatarAssetId,figure:record.figureAssetId,workspace:record.workspace})}];
  }).sort((a,b)=>a.priority-b.priority||b.updatedAt.localeCompare(a.updatedAt)||b.revision-a.revision);
  const seen=new Set<string>();
  return ranked.filter(choice=>{if(seen.has(choice.content))return false;seen.add(choice.content);return true;}).slice(0,6).map(({priority,content,...choice},index)=>({...choice,recommended:index===0}));
}
