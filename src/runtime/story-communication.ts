import {rules} from '../rules';
import {meetStoryPerson} from './story-people';
import {communicationAvailability} from '../shared/story-communication';
import {conversationActivityOptions} from './story-communication-activity';

/** Remote conversation does not count as a new physical encounter or refresh a dossier. */
export function contactStoryPerson(state:any,rawId:unknown,scope?:{party:true}):any{
 const id=typeof rawId==='string'&&rules.arena.CHARACTER_CATALOG[rawId]?rules.arena.persistentCharacterId(rawId):rawId;
 const person=state.人物?.列表?.[id as string];
 if(!person)return meetStoryPerson(state,rawId);
 const binding=rules.residentRealms.binding(state,person.id),playerId=state.角色.主控单位ID;
 if(binding?.realm.ownerId===playerId){
  const contact=communicationAvailability(state,person.id,{receiving:true}),block=rules.world.worldActionBlockReason(state,conversationActivityOptions(state,person.id));
  if(block)throw Error(block);if(!contact.available)throw Error(contact.reason);
  rules.social.communicate(state,playerId,person.id);
  return {state,receipt:{type:'person-contacted',personId:person.id,name:person.name,channel:contact.channel,summary:'通过画境接通本人当前的意识载体。'}};
 }
 if(globalThis.SoulScenePosition.communicationColocated(state,person.id,state.角色.主控单位ID)){
  rules.actions.resolve(state,{actorId:state.角色.主控单位ID,battleId:null,targetIds:[person.id],requirements:['voice'],containmentAction:'communication'});
  return meetStoryPerson(state,rawId);
 }
 const contact=communicationAvailability(state,person.id,{receiving:true});
 if(state.扩展?.story?.active?.privatePersonId!==person.id&&!(scope?.party&&rules.world.partyRoster(state).some((p:any)=>p.personId===person.id)))throw Error('远程交谈须在对应人物的魂导通讯会话中进行');
 const block=rules.world.worldActionBlockReason(state,conversationActivityOptions(state,person.id));if(block)throw Error(block);
 if(!contact.available)throw Error(contact.reason);
 return {state,receipt:{type:'person-contacted',personId:person.id,name:person.name,channel:{kind:'soul-device',contactId:contact.contactId},summary:'通过已交换的魂导通讯联络方式接通；没有相遇、移动人物或传送财物。'}};
}
