import {rules} from '../rules';

/** Actual local remains only. A successful investigation never creates this stock. */
export function storyFieldResources(state:any){
 const locationId=state.地图?.当前地点ID;
 const visualAvailable=!rules.controls.restrictions(state,state.角色?.主控单位ID).blocked.vision?.length;
 const remains=visualAvailable?(Object.values(state.战利品?.遗骸列表??{}) as any[]).filter(r=>r.locationId===locationId&&(!r.position||rules.abilities.hash(r.position)===rules.abilities.hash(rules.actions.positionOf(state,state.角色.主控单位ID)))&&!rules.world.isExpeditionRemains(state,r)):[];
 return {remains:remains.map(r=>({id:r.id,name:r.name??state.战斗单位?.列表?.[r.unitId]?.名称??'遗骸',legalOwnerEntityId:r.legalOwnerEntityId??'',coinGold:r.coinGold??0,
  items:(state.容器?.列表?.[r.containerId]?.itemIds??[]).flatMap((id:string)=>{const i=state.物品?.实例?.[id];return i?[{id:i.id,name:i.name,quantity:i.quantity,legalOwnerEntityId:i.legalOwnerEntityId??''}]:[];})})),
  visualAvailable,events:rules.world.listWorldEvents(state),
  meaning:'只列当前地点已存在的野外遗骸及专用地点事件。调查线索不增加其中库存；拾取必须引用真实遗骸和物品，未知所有权不自动变成合法赠予。副本收获仍走当前房间规则。'};
}
