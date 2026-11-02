import type {GameDatabase,SaveSlotRecord} from '../runtime/storage';
import {isCurrentSnapshot} from '../shared/snapshot-version';

export function isWorld<T extends Pick<SaveSlotRecord,'slotId'|'kind'|'profileId'>>(record:T|null):record is T {
  return Boolean(record && /^profile-[a-z0-9-]+$/.test(record.slotId) && record.kind === 'profile' && record.profileId === record.slotId);
}

/** Choose the durable world before opening a calculation session, including offline recovery. */
export async function readStartupWorld(database:GameDatabase,preferredId:string):Promise<{slotId:string;record:SaveSlotRecord|null}> {
  const preferred=await database.loadSlot(preferredId,{forPlay:true});
  if(isWorld(preferred)&&isCurrentSnapshot(preferred.snapshot))return {slotId:preferredId,record:preferred};

  const {slots}=await database.listSaveMenu();
  for(const slot of slots){
    if(!slot.current||!isWorld(slot))continue;
    const record=await database.loadSlot(slot.slotId,{forPlay:true});
    if(isWorld(record)&&isCurrentSnapshot(record.snapshot))return {slotId:record.slotId,record};
  }
  const discardId=preferred!==null||await database.getSetting(`deleted-world:${preferredId}`);
  return {slotId:discardId?`profile-${crypto.randomUUID()}`:preferredId,record:null};
}
