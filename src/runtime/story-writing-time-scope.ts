/** Existing world values after the entire turn, distinct from battle-time frames.
 * These are a frozen reading only; no new gameplay state is stored or inferred. */
export const BATTLE_WORLD_PARTICIPANT_FIELDS=['locationId','level','rank','lifeStatus','resources','preparedPills','gold','partyMembership','membershipKind','martialSouls','ownedRings','actionState'] as const;

export function storyWorldAfterTurn(person:any,time:unknown){
 return {scope:'本轮全部行动与战后结算完成时的世界状态',time:structuredClone(time??null),
  ...Object.fromEntries(BATTLE_WORLD_PARTICIPANT_FIELDS.filter(key=>Object.hasOwn(person,key)).map(key=>[key,structuredClone(person[key])]))};
}
