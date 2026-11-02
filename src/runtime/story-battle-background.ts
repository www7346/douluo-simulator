import type {StoryStepResult,StoryTurn} from './story-turns';
import {isHistoricalProjection,HISTORICAL_PROJECTION_MEANING} from '../shared/historical-projection';

const clone=<T>(value:T):T=>structuredClone(value);
const pick=(value:any,keys:string[])=>Object.fromEntries(keys.filter(key=>Object.hasOwn(value,key)).map(key=>[key,clone(value[key])]));

/** A public observation at an actual command boundary, not additional world state.
 * No menus, remote profiles, private conversations or whole-world copy are retained. */
export function captureBattleStoryBackground(facts:any,report:any,commandId:string){
 if(isHistoricalProjection(report.context))return {source:{kind:'battle-opening-observation',commandId,battleId:report.id,afterAction:0,scope:HISTORICAL_PROJECTION_MEANING,audience:'public'},facts:{location:{name:'历史投影试炼'},player:clone(facts.player),people:[],participants:report.opening.units.map((u:any)=>({id:u.id,name:u.name,role:u.id===report.context.playerId?'玩家的试炼化身':'历史投影'}))}};
 const ids=new Set<string>(report.opening.units.map((unit:any)=>unit.id));
 return {source:{kind:'battle-opening-observation',commandId,battleId:report.id,afterAction:0,
  scope:'开战结算完成、首次战斗行动之前已知的背景',audience:'public'},
  facts:selectBattleBackgroundFacts(facts,ids)};
}

function selectBattleBackgroundFacts(facts:any,ids:Set<string>){
 const result=pick(facts,['time','calendar','location','party','lootAgreements','lootPriorities']);
 if(facts.player&&ids.has(facts.player.id))result.player=clone(facts.player);
 result.people=(facts.people??[]).filter((person:any)=>ids.has(person.id)).map(clone);
 if(result.party){
  result.party.members=(result.party.members??[]).filter((person:any)=>ids.has(person.personId));
  result.party.occupiedCompanionIds=(result.party.occupiedCompanionIds??[]).filter((id:string)=>ids.has(id));
 }
 return result;
}

/** A deferred entry/spar action proves chronology even when the world clock has
 * not advanced. A standalone report's `before` is never evidence of battle start. */
export function storyBattleBackgroundObservation(turn:StoryTurn,result:StoryStepResult,report:any){
 if(turn.privatePersonId||turn.partyChat||turn.results.some(r=>r.action.kind==='tell-party'))return null;
 if(report.storyBackground?.source?.kind==='battle-opening-observation'&&report.storyBackground.source.battleId===report.id
  &&report.storyBackground.source.afterAction===0&&report.storyBackground.source.audience==='public')return clone(report.storyBackground);
 if(!['enter-room','spar','competition-match'].includes(result.action.kind)||result.status!=='succeeded')return null;
 const ids=new Set<string>(report.opening.units.map((unit:any)=>unit.id));
 // Keep actual earlier observations; do not project later profiles backwards.
 const observed=result.context?.after;
 const playerId=turn.before?.player?.id;
 const earlier=selectBattleBackgroundFacts(observed?{...observed,player:observed.people.find(p=>p.id===playerId),people:observed.people.filter(p=>p.id!==playerId)}:turn.before,ids);
 return {source:{kind:observed?'entry-event-observation':'deferred-turn-observation',battleId:report.id,step:result.step,
  scope:observed?'引发本场战斗的行动结算时已知背景':'引发本场战斗的叙事回合开始时已知背景；没有开战时的新观察',audience:'public'},facts:earlier};
}
