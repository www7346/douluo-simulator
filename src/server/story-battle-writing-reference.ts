/** Read-only reference material outside the current writing interval. The full
 * source package retains its original fields for audit and existing consumers. */
export const BATTLE_WHOLE_REFERENCE_FIELDS=['context','status','outcome','completeFromStart','opening','closing','usedAbilities','endingActions','evidenceCoverage'] as const;
import {isHistoricalProjection,HISTORICAL_PROJECTION_MEANING} from '../shared/historical-projection';
import {BATTLE_WORLD_PARTICIPANT_FIELDS} from '../runtime/story-writing-time-scope';
export {BATTLE_WORLD_PARTICIPANT_FIELDS} from '../runtime/story-writing-time-scope';

const pick=(value:any,keys:readonly string[])=>Object.fromEntries(keys.filter(key=>Object.hasOwn(value,key)).map(key=>[key,structuredClone(value[key])]));
export function storyBattleWritingReference(eventStatement:string,battle:any,participants:any[]){
 return {id:battle.id,scope:'整场已结算的开局、终局及招式使用概览；当前写作阶段的经过和起止另列',eventStatement,
  ...pick(battle,BATTLE_WHOLE_REFERENCE_FIELDS),
  worldParticipants:{scope:isHistoricalProjection(battle.context)?HISTORICAL_PROJECTION_MEANING:'本轮结算完成后的世界人物状态',records:participants.filter(person=>!isHistoricalProjection(battle.context)||person.id===battle.context.playerId).map(person=>({id:person.id,name:person.name,...pick(person,BATTLE_WORLD_PARTICIPANT_FIELDS)}))},
 };
}
