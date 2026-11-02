import {playerText} from '../runtime/player-text';
import display from '../shared/display-labels.json';
import type {PageId} from './App';

export function worldParentId(state: any, locationId: string): string {
  const locations = state?.地图?.地点 ?? {};
  let location = locations[locationId];
  const seen = new Set<string>();
  while (location?.parentId && !seen.has(location.id)) {
    seen.add(location.id);
    location = locations[location.parentId];
  }
  return location?.id ?? locationId;
}

export function journeyAction(state: any): {page:PageId;title:string;description:string;action:string} {
  const playerId = state?.角色?.主控单位ID;
  if (!playerId) return {page:'creation',title:'旅途之始',description:'选择你的背景，描绘身份与武魂，写下旅途的第一页。',action:'创建角色'};
  if (state?.战斗?.状态 === '进行中') return {page:'battle',title:'战局未决',description:'战场仍在等待你的下一次选择。',action:'返回战场'};
  if (state?.战斗?.扩展?.竞技 && (state?.切磋?.当前 || state?.终局挑战?.当前 || state?.比赛?.当前?.match || state?.杀戮场?.当前?.match)) return {page:'battle',title:'胜负已分',description:'这一战已经结束，领取战果后继续前行。',action:'查看战果'};
  if (Object.values(state?.魂环?.待选择 ?? {}).some((item:any) => item.status === 'pending')) return {page:'adventure',title:'魂环的回响',description:'新的力量已经凝聚，选择与你相契合的魂技。',action:'领悟魂技'};
  if (state?.远征?.当前?.status === 'active') return {page:'adventure',title:playerText(state.远征.当前.dungeonName,state,'深入秘境'),description:'沿着已经探明的路线，继续寻找魂兽与珍藏。',action:'继续探索'};
  if (Object.values(state?.研发?.待处理 ?? {}).some((item:any)=>item.actorId===playerId&&['awaiting-llm','candidates-ready'].includes(item.status))) return {page:'inventory',title:'工坊中的新作',description:'已经投入的材料正等待你的决定，继续完成这件作品。',action:'返回工坊'};
  if (state?.比赛?.当前 && !['completed','failed'].includes(state.比赛.当前.status)) return {page:'competition',title:'斗魂之约',description:'比赛尚未结束，下一场对手正在等待。',action:'返回赛场'};
  if (state?.杀戮场?.当前 && !['completed','failed'].includes(state.杀戮场.当前.status)) return {page:'slaughter',title:'杀戮之都',description:'死斗尚未结束，带着现有的力量迎接下一战。',action:'返回杀戮场'};
  if (state?.比赛?.当前?.reward && (display.venueLocations as Record<string,string>)[state.比赛.当前.venueId]===state?.地图?.当前地点ID) return {page:'competition',title:'本届战绩',description:'查看完整赛程与实得奖励，再启下一程。',action:'查看赛事结果'};
  const growth=state?.成长?.列表?.[playerId];
  const ringCount=(growth?.武魂ID列表 ?? []).reduce((count:number,id:string) => count+(state?.武魂?.列表?.[id]?.魂环ID列表?.length ?? 0),0);
  return ringCount === 0
    ? {page:'adventure',title:'第一枚魂环',description:'寻找与你武魂契合的第一枚魂环。',action:'展开旅程'}
    : {page:'adventure',title:'大陆辽阔，旅途未止',description:'踏入新的地域，寻找魂兽与材料，让每一次归来都成为下一次启程的力量。',action:'继续旅程'};
}

export function travelerArt(gender: string): string {
  return gender === '女' || gender === '女性' ? '/art/traveler-female-v1.png' : '/art/traveler-male-v1.png';
}
