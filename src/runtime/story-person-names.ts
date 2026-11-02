import {rules} from '../rules';
import {knownStoryPerson} from '../shared/story-communication';
export const storyNameKey=(value:string)=>value.normalize('NFKC').replace(/\s/g,'');
export function storyPersonLabels(state:any,personId:string):string[]{
 const labels=(state.人物?.列表?.[personId]?.扩展?.玩家称呼??[]).filter((r:any)=>r.playerId===state.角色?.主控单位ID).map((r:any)=>r.name);
 const object=(state.扩展?.storyObjects??[]).find((r:any)=>r.type==='person'&&r.entityId===personId);
 return [...new Set<string>([...labels,...(object?.mentions??[]).filter((m:any)=>!m.source.privatePersonId).flatMap((m:any)=>[m.name,...m.aliases])])];
}
/** Exact names/labels and actual current occupations; travel can precede this lookup. */
export function resolveStoryPersonName(state:any,name:string,onlyPersonId?:string){
 const playerId=state.角色?.主控单位ID,key=storyNameKey(name);
 const localMerchant=rules.expedition.serviceAtLocation(state,state.地图?.当前地点ID)?.merchantId;
 const matches=(Object.values(state.人物?.列表??{}) as any[]).filter(p=>{
  if(p.id===playerId||onlyPersonId&&p.id!==onlyPersonId)return false;
  const local=rules.actions.colocated(state,playerId,p.id)||rules.actions.communicationColocated(state,playerId,p.id)&&rules.actions.perception(state,playerId,p.id);
  if(!local&&!knownStoryPerson(state,p.id,playerId))return false;
  const roles=local&&p.status!=='dead'?[p.occupation,p.identity,...(p.id===localMerchant?['掌柜','商行掌柜','店主']:[]),...(p.identity==='城镇守卫'?['守卫']:[])].filter(n=>typeof n==='string'&&n):[];
  return [p.name,...storyPersonLabels(state,p.id),...roles].some(n=>storyNameKey(n)===key);
 }).map(p=>({id:p.id,name:p.name}));
 return {type:'person-name-resolved',query:name,status:matches.length===1?'unique':matches.length?'ambiguous':'missing',matches,...(matches.length===1?{personId:matches[0].id}:{})};
}
/** An explicit lookup table for the host; duplicate labels never silently pick a person. */
export function storyPersonReferences(state:any,onlyPersonId?:string){
 const playerId=state.角色?.主控单位ID,groups=new Map<string,{name:string;people:{id:string;name:string}[]}>();
 const labels=new Set<string>();
 for(const p of Object.values(state.人物?.列表??{}) as any[]){
  if(p.id===playerId||onlyPersonId&&p.id!==onlyPersonId)continue;
  if(!onlyPersonId&&!rules.actions.colocated(state,playerId,p.id)&&!rules.actions.communicationColocated(state,playerId,p.id)&&!knownStoryPerson(state,p.id,playerId))continue;
  const aliases=storyPersonLabels(state,p.id);for(const name of aliases)labels.add(storyNameKey(name));
  for(const name of [p.name,...aliases]){
   const key=storyNameKey(name),group:{name:string;people:{id:string;name:string}[]}=groups.get(key)??{name,people:[]};
   if(!group.people.some(v=>v.id===p.id))group.people.push({id:p.id,name:p.name});groups.set(key,group);
  }
 }
 // Canonical names already live in the dossiers. Emit only aliases, retaining collisions with names.
 return [...groups.entries()].filter(([key])=>labels.has(key)).map(([,g])=>({...g,status:g.people.length===1?'unique':'ambiguous',playerId,scope:'当前玩家的称呼映射'}));
}
export function recordStoryPersonLabel(state:any,characterId:unknown,name:string,source:{id:string;branchId:string;turn:number;step:number}){
 const id=typeof characterId==='string'&&rules.arena.CHARACTER_CATALOG[characterId]?rules.arena.persistentCharacterId(characterId):characterId;
 const p=state.人物?.列表?.[String(id)],playerId=state.角色?.主控单位ID;
 if(!p||p.id===playerId||!knownStoryPerson(state,p.id,playerId))throw Error('请先与这位人物相识，再记录称呼');
 if(!name.trim()||name!==name.trim()||name.length>40)throw Error('称呼需为1至40字，不能包含首尾空白');
 p.扩展??={};const records=p.扩展.玩家称呼??=[];
 let record=records.find((r:any)=>r.playerId===playerId&&storyNameKey(r.name)===storyNameKey(name));
 if(!record){if(records.filter((r:any)=>r.playerId===playerId).length>=8)throw Error('这位人物已有八个称呼，请沿用已记录称呼');record={name,playerId,source:structuredClone(source)};records.push(record);}
 return {state,receipt:{type:'person-label-recorded',personId:p.id,name:p.name,label:structuredClone(record),scope:'当前玩家的称呼记录'}};
}
export function validateStoryPersonLabels(state:any){
 for(const p of Object.values(state.人物?.列表??{}) as any[]){
  const labels=p.扩展?.玩家称呼;if(labels===undefined)continue;
  if(!Array.isArray(labels))throw Error('人物称呼记录无效');
  const seen=new Set<string>(),counts=new Map<string,number>();
  for(const r of labels){
   const s=r?.source;
   if(!r||Object.keys(r).some(k=>!['name','playerId','source'].includes(k))||typeof r.name!=='string'||!r.name.trim()||r.name!==r.name.trim()||r.name.length>40||typeof r.playerId!=='string'||!state.人物?.列表?.[r.playerId]||!knownStoryPerson(state,p.id,r.playerId)||!s||Object.keys(s).some(k=>!['id','branchId','turn','step'].includes(k))||typeof s.id!=='string'||!s.id||typeof s.branchId!=='string'||!s.branchId||!Number.isSafeInteger(s.turn)||s.turn<1||!Number.isSafeInteger(s.step)||s.step<0||s.step>11)throw Error('人物称呼或来源不完整');
   if(r.playerId===p.id||s.id!==`story:${s.branchId}:${s.turn}:${s.step}`||s.turn>=state.扩展?.story?.nextTurn)throw Error('人物称呼来源与回合不一致');
   const key=JSON.stringify([r.playerId,storyNameKey(r.name)]);if(seen.has(key))throw Error('人物称呼重复');seen.add(key);
   const count=(counts.get(r.playerId)??0)+1;if(count>8)throw Error('人物称呼过多');counts.set(r.playerId,count);
  }
 }
}
