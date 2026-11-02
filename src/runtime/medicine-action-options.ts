import {rules} from '../rules';

/** Actual carried sources and present recipients shared by player UI and action host. */
export function medicineActionOptions(state:any,item:any,actorId=state.角色.主控单位ID){
 if(!item||!rules.world.isCarriedItem(state,item,actorId))return null;
 const skills=rules.world.inspectItem(state,item).skills,medicine=skills.find((s:any)=>s.medicine)?.medicine;
 const sources=rules.poison.facts(state,actorId).sources,coatings=sources.filter((s:any)=>s.status==='active'&&s.carrier.kind==='coating'&&s.carrier.itemId===item.id);
 if(!medicine&&!coatings.length)return null;
 const battle=rules.actions.battleOf(state,actorId),ids=battle?battle.参与者ID列表.filter((id:string)=>battle.扩展?.成员?.[id]?.status==='active'):Object.keys(state.人物.列表);
 const carried=(Object.values(state.物品.实例) as any[]).filter(v=>v.id!==item.id&&rules.world.isCarriedItem(state,v,actorId));
 const food=(v:any)=>{try{rules.world.supportFoodCarrier(state,v);return true;}catch{return false;}};
 const carriers=carried.filter(v=>medicine?.route==='oral'?food(v):v.quantity===1&&!v.attachment).map(v=>({id:v.id,name:v.name}));
 const targets=ids.filter((id:string)=>{try{rules.actions.resolve(state,{actorId,targetIds:[id]});return id===actorId||rules.actions.perception(state,actorId,id);}catch{return false;}}).map((id:string)=>({id,name:state.人物.列表[id]?.name??state.战斗单位.列表[id]?.名称??id}));
 return {...(medicine??{}),battleId:battle?.id??null,operations:[...(medicine?(medicine.route==='oral'?[...(carried.some(food)?['prepare-poisoned-serving']:[]),'offer-disguised-drug']:medicine.route==='contact'?['coat-item','apply-contact-drug']:['direct-spray','release-toxic-cloud']):[]),...(coatings.length?['touch-coated-item']:[])],targets,carriers,sources:sources.filter((s:any)=>s.carrier.itemId===item.id||state.世界.poisons.sources.find((r:any)=>r.id===s.id)?.itemProof.id===item.id)};
}
