import {rules} from '../rules';

/** Execution-only activity permission; public message/save helpers do not import rules. */
export function conversationActivityOptions(state:any,personId:string){
 return {allowActivities:rules.world.partyRoster(state).some((p:any)=>p.personId===personId)||rules.residentRealms.binding(state,personId)?.realm.ownerId===state.角色?.主控单位ID?['expedition']:[],allowContained:rules.sealing.isAwakeContained(state,state.角色?.主控单位ID)};
}
