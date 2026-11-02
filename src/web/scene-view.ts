import {rules} from '../rules';
import {playerText} from '../runtime/player-text';
import {characterSummary} from '../runtime/arena-view';
import type {PageId} from './App';

/** Presentation only. Access, costs and outcomes remain in the rule engine. */
export function locationLandscape(state:any,locationId:string){
  const location = state?.地图?.地点?.[locationId] ?? rules.world.LOCATION_TEMPLATES[locationId];
  const dungeons = (Object.values(rules.expedition.DUNGEON_PROFILES) as any[]).filter(dungeon => dungeon.locationId === locationId);
  const summary = String(location?.summary ?? '');
  const description = /小说|原著|交通节点|用于补足|游戏补充/.test(summary)
    ? `${location.name}坐落于${location.region || '大陆之上'}。${(location.backgroundCategories ?? []).join('、')}的身影与这里的风物，共同构成旅途中的一站。`
    : playerText(summary,state,`${location?.name ?? '此地'}的风物，等待你亲自探访。`);
  return {location,description,dungeons};
}

export function locationScene(state: any, locationId: string) {
  const {location,description,dungeons}=locationLandscape(state,locationId);
  const playerId = state?.角色?.主控单位ID;
  const canonical = (rules.arena.worldCharacterRecords(state) as any[]).filter(person => rules.arena.worldCharacterLocation(state,person.id) === locationId&&!state?.人物?.列表?.[rules.arena.persistentCharacterId(person.id)]);
  const residents = (Object.values(state?.人物?.列表 ?? {}) as any[]).filter(person => person.id !== playerId && person.locationId === locationId && !rules.interiorSpaces.membership(state,person.id) && (!playerId||state.人物.列表[playerId].locationId!==locationId||rules.actions.colocated(state,playerId,person.id)) && person.status !== 'dead' && state?.战斗单位?.列表?.[person.combatantId??person.id]?.存活状态 !== '死亡');
  const people = [...canonical.map(person => {const record=characterSummary(state,person.id)!;return {id:person.id,name:record.name,detail:`${record.period} · ${record.kind==='soul-beast'?'魂兽':record.soul}`,canonical:true};}),
    ...residents.map(person => {const record=characterSummary(state,person.id)!;return {id:person.id,name:record.name,detail:record.occupation || record.identity || record.faction,canonical:false};})];
  const service = rules.expedition.serviceAtLocation(state,locationId);
  const shops = (Object.values(state?.商店?.列表 ?? {}) as any[]).filter(shop => shop.locationId === locationId && shop.status === 'open' && shop.id !== service?.id);
  if(service)shops.push(service);
  const venues = (Object.values(rules.arena.COMPETITION_VENUES) as any[]).filter(venue => venue.locationId === locationId);
  return {location,description,people,shops,service,dungeons,venues,canRest:rules.world.SAFE_RECOVERY_LOCATION_IDS.includes(locationId)};
}

export {worldParentId,journeyAction,travelerArt} from './scene-navigation';
