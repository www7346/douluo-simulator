import {rules} from '../rules';
export function personGrowthPresentation(state:any,personId:string){
 const actorId=state.角色.主控单位ID,person=state.人物.列表[personId],allowed=rules.world.partyRoster(state,actorId).some((p:any)=>p.personId===personId)||rules.residentRealms.binding(state,personId)?.realm.ownerId===actorId;
 if(!person)return null;
 if(!allowed)return {allowed:false,reason:'这位人物尚未加入你的队伍。成为同伴后，可在这里安排修炼和赠送魂环。'};
 let reason='';try{rules.social.communicate(state,actorId,personId);}catch(error){reason=(error as Error).message;}
 const proposals:any[]=[];
 for(const item of Object.values(state.物品.实例) as any[])if(rules.cycle.isRingItem(item)&&[personId,actorId].includes(item.ownerEntityId)&&rules.world.isCarriedItem(state,item,item.ownerEntityId))proposals.push({kind:item.ownerEntityId===actorId?'offered-ring':'item-ring',itemId:item.id});
 const eligibility=Object.values(state.武魂.列表).filter((s:any)=>s.持有者单位ID===personId).map((s:any)=>({name:s.名称,...rules.cycle.ringAdvancementEligibility(state,personId,s.id)}));
 const ready=eligibility.some((q:any)=>q.pass),rings=proposals.map(source=>({source,label:state.物品.实例[source.itemId]?.name,...(ready?rules.personGrowth.quote(state,{actorId,personId,source},{compileSkills:false}):{available:false,reason:eligibility.flatMap((q:any)=>q.reasons).join('；')})}));
 return {allowed:true,personId,name:person.name,eligibility,pendingIds:rules.personGrowth.pending(state).filter((r:any)=>r.personId===personId).map((r:any)=>r.id),reason,consciousnessReason:rules.consciousness.originalActionReason(state,personId),cultivation:rules.world.cultivationFacts(state,personId),longActions:rules.world.longActionFacts(state,personId),rings,requests:rules.personGrowth.facts(state,actorId,{compileSkills:false}).filter((r:any)=>r.personId===personId)};
}

export function partyRingPresentation(state:any,beastUnitId:string){
 const actorId=state.角色.主控单位ID,expedition=rules.expeditionContext.forActor(state,actorId);
 if(!expedition||expedition.phase!=='postcombat'||!expedition.currentRoom?.roster.some((b:any)=>b.unitId===beastUnitId))throw Error('请在魂兽所在房间的战后阶段分配魂环');
 const source={kind:'beast-ring',beastUnitId};
 return rules.world.partyRoster(state,actorId).filter((p:any)=>p.present).map((p:any)=>{
  const eligibility=Object.values(state.武魂.列表).filter((s:any)=>s.持有者单位ID===p.personId).map((s:any)=>rules.cycle.ringAdvancementEligibility(state,p.personId,s.id));
  const quote=eligibility.some((q:any)=>q.pass)?rules.personGrowth.quote(state,{actorId,personId:p.personId,source}):{available:false,reason:eligibility.flatMap((q:any)=>q.reasons).join('；')||'尚未觉醒武魂'};
  return {personId:p.personId,name:p.name,level:state.成长.列表[p.personId]?.魂力等级,source,...quote};
 });
}
