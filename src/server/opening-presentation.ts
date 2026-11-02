import {rules} from '../rules';
import {portraitCanonicalId} from '../runtime/visual-identity';
import type {OpeningSceneFacts} from '../runtime/opening-scene';

export function openingSceneFacts(state:any):OpeningSceneFacts|null{
 const r=state.世界?.opening?.background;if(!r)return null;
 const b=r.config.background,playerId=state.角色.主控单位ID;
 const mentor=state.世界.opening.relations?.entries.find((entry:any)=>entry.actorId===playerId&&entry.targetId===rules.arena.persistentCharacterId('yu-xiaogang-notting')&&entry.kind==='mentor');
 const guides:Record<string,string>={'jiumeitu-heir':mentor?'yu-xiaogang-notting':'','shrek-student':'yu-xiaogang-notting','seven-treasure':'ning-fengzhi','clear-sky':'tang-xiao','blue-dragon':'yu-yuanzhen'},canonical=guides[b.id];
 const guideId=canonical?rules.arena.persistentCharacterId(rules.arena.WORLD_STORY_SELECTIONS[rules.arena.worldCharacterIdentityId(canonical)]??canonical):'';
 const ids=[...new Set([playerId,r.buyerId,r.subjectId,guideId].filter(Boolean))] as string[];
 const people=ids.flatMap(id=>{
  const p=state.人物.列表[id];if(!p)return [];
  const side=id===r.buyerId?'buyer':id===r.subjectId?'captive':null;
  const draft=id===r.mainId?r.config:b.id==='sealed-titled'&&side?b.actors?.[side]?.config:null;
  const historical=draft??(id===r.buyerId&&b.id==='sealed-titled'?rules.backgrounds.BUYERS[b.buyerId]:p);
  const present=id===playerId||Boolean(rules.actions.communicationColocated(state,playerId,id)&&rules.actions.perception(state,playerId,id));
  return [{id,name:historical.name,gender:historical.gender,age:historical.age,appearance:historical.appearance,canonicalId:portraitCanonicalId(p)??'',title:id===r.subjectId&&b.id==='sealed-titled'?state.成长.列表[id].封号.封号:'',present}];
 });
 const purchase=rules.backgroundOpening.acquisition(r),awakening=purchase?.awakeningSealEventId?state.世界.sealings?.events.find((event:any)=>event.id===purchase.awakeningSealEventId&&event.type==='awakened'):null;
 const initialHistory=state.成长.列表[playerId]?.扩展?.backgroundHistory;
 const openingRealm={opened:initialHistory?.sourceId===r.sourceId?initialHistory.records.length:0,prisonerNames:(b.relations??[]).filter((row:any)=>row.initialRealm).map((row:any)=>rules.arena.CHARACTER_CATALOG[row.target.characterId]?.name).filter(Boolean)};
 return {sourceId:r.sourceId,backgroundId:b.id,acquisitionKind:b.acquisitionKind??'auction',perspective:b.perspective,buyerKind:b.buyerId??'',title:rules.backgrounds.BACKGROUNDS[b.id].name,locationName:rules.world.LOCATION_TEMPLATES[rules.backgrounds.policy(b).definition.locationId]?.name,playerId,buyerId:r.buyerId??'',subjectId:r.subjectId??'',guideId:people.some(p=>p.id===guideId)?guideId:'',people,
  ...(b.id==='sealed-titled'?{containment:{mode:awakening?'awake' as const:'open' as const,itemId:purchase.platformItemId}}:{}),
  ...(b.id==='jiumeitu-heir'?{realm:openingRealm,guideContact:mentor?.contact===true}:{}),
  devices:r.subjectId?(b.creationItems??[rules.backgroundRestraints.defaults(b.id==='prince-cat'?'rope':'restraint-seal-platform')]).map((item:any)=>({name:item.name,templateId:item.templateId,mode:item.mode,...(item.binding?{binding:{part:item.binding.part,pose:item.binding.pose}}:{})})):[]};
}
