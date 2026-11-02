import {rules} from '../rules';

export function rebuildServiceCharacters(state:any,personIds:string[],transactionId:string){
 if(state.远征?.当前||rules.world.worldActionBlockReason(state))throw Error('请在本次战斗或远征结束后重建服务人员');
 if(!Array.isArray(personIds)||!personIds.length||personIds.length>12||new Set(personIds).size!==personIds.length)throw Error('请选择职业服务人员');
 const changes=[];
 for(const id of personIds){
  const person=state.人物?.列表?.[id],archetype=rules.world.NPC_ARCHETYPES[person?.扩展?.archetypeId];
  if(!person||!archetype?.full||!archetype.escort||person.扩展.角色库ID)throw Error('只有生成的职业服务人员可进行机制重建');
  const old=structuredClone(state.战斗单位.列表[id]),level=state.成长.列表[id]?.魂力等级;
  const sources:any={souls:[],rings:[],skills:[],growth:structuredClone(state.成长.列表[id]),unit:old};
  for(const [key,field] of [['souls','武魂'],['rings','魂环'],['skills','技能']]){
   for(const [entryId,entry] of Object.entries(state[field].列表) as [string,any][]){if(entry.持有者单位ID===id){sources[key].push(structuredClone(entry));delete state[field].列表[entryId];}}
  }
  delete state.战斗单位.列表[id];delete state.成长.列表[id];
  person.tier='light';if(person.扩展.characterProfile)person.扩展.characterProfile={...person.扩展.characterProfile,status:'draft',source:'rules-draft'};
  const result=rules.world.promoteNpc(state,{personId:id,level},transactionId+':'+id);state=result.state;
  const current=state.战斗单位.列表[id];
  if(old){current.位置=structuredClone(old.位置);current.状态=structuredClone(old.状态);for(const key of ['生命','魂力'])current.资源[key].当前=Math.min(current.资源[key].最大,old.资源[key].当前);}
  state.人物.列表[id].扩展.serviceRebuild={version:1,previous:sources,transactionId};
  changes.push({personId:id,name:person.name,level,previousSouls:sources.souls.map((s:any)=>s.名称),newSouls:Object.values(state.武魂.列表).filter((s:any)=>s.持有者单位ID===id).map((s:any)=>s.名称)});
 }
 return {state,receipt:{type:'service-characters-rebuilt',changes,summary:'已按职业预算重建服务人员的武魂与能力'}};
}
