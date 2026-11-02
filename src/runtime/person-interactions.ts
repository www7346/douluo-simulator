import {rules} from '../rules';
import {communicationAvailability,soulContact} from '../shared/story-communication';
import {readStoryRelationship} from './story-person-history';
import {storyMeetingAvailability} from './story-people';
import {medicineActionOptions} from './medicine-action-options';
import {conversationActivityOptions} from './story-communication-activity';

/** A read-only menu, never an invitation, encounter or reward. */
export function personInteractions(state:any,input:Record<string,any>){
 if(Object.keys(input).some(k=>k!=='characterId'))throw Error('人物互动参数无效');
 const relation=readStoryRelationship(state,{characterId:input.characterId,before:-1}),personId=relation.personId,person=state.人物.列表[personId];
 const canonical=rules.arena.CHARACTER_CATALOG[input.characterId],name=person?.name??canonical?.name;
 const meeting=storyMeetingAvailability(state,input.characterId);
 const communication=person?communicationAvailability(state,personId):{available:meeting.available,mode:'in-person',reason:meeting.reason||'尚未当面相识',contactId:null,channel:undefined};
 const realmContact=communication.channel?.kind==='realm';
 const block=(realmContact?rules.world.worldActionBlockReason(state,conversationActivityOptions(state,personId)):communication.mode==='in-person'?meeting.reason:rules.world.worldActionBlockReason(state,{allowCaptivity:true,allowContained:rules.sealing.isAwakeContained(state,state.角色?.主控单位ID)}))||(!communication.available?communication.reason||'这位人物目前不在此处':'');
 const member=rules.world.partyMembers(state).find((m:any)=>m.personId===personId),join=rules.world.partyJoinAvailability(state,personId,'long-term',!!soulContact(state,personId));
 const actions=[
  ...(!realmContact&&!soulContact(state,personId)&&communication.mode==='in-person'?[{id:'contact',label:'交换联络',draft:'我想和你交换魂导通讯联络方式，方便以后联系，你愿意吗？',reason:block}]:[]),
  ...(!person||member?.membership==='long-term'?[]:[{id:'party',label:member?'商量长期同行':'邀请长期同行',draft:'我想邀请你长期同行，你愿意吗？不必为了我放下自己的安排。',reason:block||join.reason}])];
 const spar=rules.arena.previewSparAvailability(state,input.characterId);
 const duel=person?rules.world.previewIntent(state,{type:'person-duel',targetId:personId}):{available:false,reason:'请先与此人当面相遇'};
 const viewer=state.角色.主控单位ID,inventory=state.人物.列表[viewer]?.inventoryContainerId;
 const medicineItems=(state.容器.列表[inventory]?.itemIds??[]).flatMap((id:string)=>{
  const item=state.物品.实例[id];if(!item)return [];
  const options=medicineActionOptions(state,item,viewer);return options?[{id,name:item.name??item.名称,options}]:[];
 });
 return {combat:{spar,duel,experience:rules.arena.previewSparExperience(state,input.characterId)},medicineItems,personId,characterId:input.characterId,name:person?rules.disguise.presentation(state,personId,state.角色.主控单位ID).name:name,registered:!!person,communication,block,member:member??null,actions};
}
