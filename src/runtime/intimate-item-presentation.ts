import {rules} from '../rules';
/** Project actual registered device facts into both unbought and owned item details. */
export function intimateItemPresentation(item:any){
 const definition=rules.intimate.DEVICES[item?.templateId];if(!definition)return null;
 return {slots:[...definition.slots],covers:[...definition.covers],effects:definition.effects.map((id:string)=>rules.effects.EFFECT_REGISTRY[id]?.displayName??({'status.chastity':'部位限制','status.sensitive':'敏感','status.urine_lock':'排尿限制','status.mute':'禁声','status.collared':'项圈','status.blind':'失明'} as Record<string,string>)[id]??'器具状态'),
  maxStimLevel:definition.maxStimLevel,remote:definition.remote===true,needsKey:definition.needsKey===true,breakDifficulty:definition.breakDifficulty,
  blocksUrine:definition.blocksUrine===true,description:rules.world.ITEM_TEMPLATES[item.templateId].description};
}
