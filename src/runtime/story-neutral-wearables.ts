import {rules} from '../rules';

/** The public story adapter only exposes existing neutral equipment mechanics. */
export function assertNeutralWearableStoryAction(state:any,action:any){
 if(action.kind==='intimate-craft'){
  if(!rules.wearables.registered(action.templateId))throw Error('故事制作仅支持登记的中性眼、口、颈器具');
  return;
 }
 if(['intimate-equip','intimate-detach'].includes(action.kind)&&!rules.wearables.registered(state?.物品?.实例?.[action.itemId]))throw Error('故事装卸仅支持登记的中性眼、口、颈器具');
}
