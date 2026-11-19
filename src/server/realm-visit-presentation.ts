import {rules} from '../rules';
import {invitationAvailability} from '../runtime/story-commitments';

/** Host-only command choices. Do not replace the private counterpart's own
 * residentContext with the owner's rooms, occupants or management readings. */
export function realmVisitOptions(state:any,knownPeople:ReadonlyArray<{id:string}>){
 const actorId=state.角色.主控单位ID;
 const targets=[...new Set(knownPeople.map(person=>person.id))].filter(id=>id!==actorId&&state.人物.列表[id]);
 const realms=rules.residentRealms.facts(state,actorId)
  .filter((realm:any)=>realm.ownerId===actorId&&realm.profileId==='nine-beauties-v1'&&realm.endedAt===undefined&&realm.space?.collapsedAt===undefined)
  .map((realm:any)=>({
   id:realm.id,name:realm.name,
   rooms:realm.space.regions.map((room:any)=>({id:room.id,name:room.name})),
   invitees:targets.map(characterId=>{
    const availability=invitationAvailability(state,{kind:'realm-guest',playerId:actorId,personId:characterId,realmId:realm.id,regionId:realm.space.regions[0]?.id});
    return {characterId,name:state.人物.列表[characterId].name,...availability};
   }),
  }));
 return {realms,process:'invite-realm-guest提出自愿入住邀请，使用所选画境的realmId和实际房间regionId；本人独立答应后入住，可以自行活动、修炼、离开，不占永久收纳席位。邀请条件及不能邀请的原因见invitees；move-realm-guest为已经自愿入住的人换房，end-realm-visit结束入住。'};
}
