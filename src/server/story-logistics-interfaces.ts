import {rules} from '../rules';
/** Static input and route identity checks share the native logistics contract.
 * Future payment, doors, permission and mobility still settle at each actual step. */
export function validateStoryLogisticsInterfaces(state:any,plan:any){
 const actorId=state.角色.主控单位ID,position=rules.actions.positionOf(state,actorId);let mayTravel=position.kind==='transit';
 for(const segment of plan.segments){const a=segment.action;
  if(a.kind==='start-custody-escort'){
   rules.logistics.escortRoster(actorId,a.targetIds,a.guardIds??[]);
   if(!mayTravel)rules.logistics.assertEscortDestination(position.locationId,a.destinationId);
  }
  if(['travel','start-custody-escort','start-expedition'].includes(a.kind))mayTravel=true;
 }
}
