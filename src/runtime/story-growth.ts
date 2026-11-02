import {rules} from '../rules';
export function storyGrowthFacts(state:any){
 const id=state.角色?.主控单位ID,g=state.成长?.列表?.[id],u=state.战斗单位?.列表?.[id];
 if(!g||!u)return null;
 return {availablePoints:g.可用属性点,baseAttributes:structuredClone(u.六维.基础),
  progression:{level:g.魂力等级,experience:g.当前经验,requirement:g.当前等级需求,bottleneckLevel:g.瓶颈等级,bottleneck:g.瓶颈状态}};
}
export function inspectStoryGrowth(state:any){
 const facts=storyGrowthFacts(state);if(!facts)throw Error('玩家成长档案不存在');
 const id=state.角色.主控单位ID,growth=state.成长.列表[id];
 const effective=rules.foundation.battleAttributeView(state,state.战斗单位.列表[id]).attributes.有效;
 return {...facts,attributes:rules.foundation.ATTRIBUTE_KEYS.map((attribute:string)=>({attribute,base:facts.baseAttributes[attribute],current:effective[attribute],cost:rules.foundation.growthAttributePointCost(facts.baseAttributes[attribute]),maximum:99})),
  derived:structuredClone(state.战斗单位.列表[id].派生),
  cultivation:structuredClone(rules.world.cultivationFacts(state)),
  ringAdvancement: growth.武魂ID列表.map((soulId:string)=>({martialSoulName:state.武魂.列表[soulId]?.名称??null,
   eligibility:structuredClone(rules.cycle.ringAdvancementEligibility(state,id,soulId))}))};
}
