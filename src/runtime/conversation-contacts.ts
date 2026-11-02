import {rules} from '../rules';
import {communicationAvailability,soulContact} from '../shared/story-communication';

/** Eligibility is calculated beside story execution, never in a partial browser rules bundle. */
export function conversationContactFacts(state:any){
 const actorId=state.角色?.主控单位ID;
 return (Object.values(state.人物?.列表??{}) as any[]).filter(p=>p.id!==actorId).map(p=>({
  personId:p.id,
  known:!!(globalThis.SoulScenePosition.communicationColocated(state,actorId,p.id)||p.locationId===state.地图?.当前地点ID||p.扩展?.相遇记录?.[actorId]||soulContact(state,p.id)||rules.residentRealms.binding(state,p.id)?.realm.ownerId===actorId),
  communication:communicationAvailability(state,p.id),
 }));
}
