import {rules} from '../rules';

/** Existing ownership and actual interior membership; never a new permission record. */
export function isManagedResident(state:any,personId:string,viewerId=state.角色?.主控单位ID){
 const binding=rules.residentRealms.binding(state,personId);
 return Boolean(binding&&binding.realm.ownerId===viewerId&&rules.interiorSpaces.membership(state,personId)?.space.id===binding.realm.id);
}

export function canInspectPersonEquipment(state:any,personId:string,viewerId=state.角色?.主控单位ID){
 return Boolean(state.人物?.列表?.[personId]&&(personId===viewerId||isManagedResident(state,personId,viewerId)||rules.sealing.canObserveContained(state,viewerId,personId)||rules.actions.communicationColocated(state,viewerId,personId)&&rules.actions.perception(state,viewerId,personId,'vision')));
}
