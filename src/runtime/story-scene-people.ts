import {rules} from '../rules';
import {personCognition,relationshipPresentation} from '../shared/cognition-view';
import {soulContact} from '../shared/story-communication';
import {sharedBattleEncounters} from './battle-reports';
import {changeInteractionContext} from './person-change-context';
import {commitmentView,personCommitments,personRelationship,recentEndedCommitments} from './story-commitments';
import {freeActionFacts} from './story-free-actions';
import {createStoryHireFactsReader} from './story-hire-facts';
import {storyNpcMechanicsFacts} from './story-npc-mechanics';
import {storyAbilityFacts,storyEraFacts,storyOwnedItemFacts,storyOwnedRingFacts,storyRankFacts,storySoulFacts} from './story-person-dossier';
import {storyPersonHistorySummary} from './story-person-history';
import {storyPersonLabels} from './story-person-names';
import {storyBackgroundContext,storyPersona} from './story-personas';
import {storyActionState,type StoryActionsReader} from './story-state-writing-facts';
import {personVisualIdentity} from './visual-identity';

/** The scene and private conversations must agree on who the player can actually perceive. */
export function perceivedScenePerson(state:any, person:any){
 const playerId=state.角色?.主控单位ID;
 if(!person||person.id===playerId||!state.人物?.列表?.[playerId])return null;
 const together=rules.actions.colocated(state,playerId,person.id)||
  !rules.interiorSpaces.membership(state,person.id)&&!rules.interiorSpaces.membership(state,playerId)&&
  globalThis.SoulScenePosition.communicationColocated(state,playerId,person.id);
 if(!together||!rules.actions.perception(state,playerId,person.id))return null;
 return rules.actions.perception(state,playerId,person.id,'vision')?'visible':'heard';
}

export function heardScenePerson(state:any,person:any){
 const playerId=state.角色.主控单位ID;
 return {id:person.id,name:person.扩展?.已知档案?.[playerId]?.name??person.name,scope:'heard',
  encounter:structuredClone(person.扩展?.已知档案?.[playerId]??null),speech:rules.social.speechFacts(state,playerId)};
}

/** Visible dossiers share service and ability reads within a single observation. */
export function createScenePersonReader(state:any,readActions?:StoryActionsReader){
 const id=state.角色?.主控单位ID,hireFacts=createStoryHireFactsReader(state,id);
 return (actual:any)=>{
  const p=rules.disguise.viewPerson(state,actual,id);
  const appearance=p.id===id?null:rules.disguise.presentation(state,p.id,id);
  const masked=p.id!==id&&(!!rules.disguise.winner(state,p.id)||appearance.identityHidden);
  const auraHidden=masked&&appearance.auraHidden;
  const isPlayer=p.id===id;
  return {
   id:p.id,name:p.name,cognition:personCognition(state,p.id,id),playerLabels:storyPersonLabels(state,p.id),
   locationId:p.locationId,identity:p.identity,occupation:p.occupation,
   encounter:structuredClone(p.扩展?.相遇记录?.[id]??null),
   characterization:storyPersona(state,p,id),visualIdentity:personVisualIdentity(p),
   backgroundContext:masked?null:storyBackgroundContext(state,p.id),
   mechanics:masked?null:storyNpcMechanicsFacts(p),eraBasis:masked?null:storyEraFacts(state,p.id),
   ...hireFacts(p.id,masked),
   partyMembership:rules.world.partyMembers(state).find((member:any)=>member.personId===p.id)??null,
   relationshipScore:!isPlayer&&Number.isFinite(p.relationship?.player)?p.relationship.player:null,
   relationship:isPlayer?null:relationshipPresentation(personRelationship(state,p.id),id,p.id),
   soulContactId:soulContact(state,p.id)?.id??null,
   level:auraHidden?null:state.成长?.列表?.[p.id]?.魂力等级??null,
   rank:auraHidden?null:storyRankFacts(state,p.id),
   resources:auraHidden?null:state.战斗单位?.列表?.[p.id]?.资源??null,
   preparedPills:rules.combat.preparedPillViews(state,p.id),
   canonicalId:masked?null:state.战斗单位?.列表?.[p.id]?.扩展?.角色库ID??p.扩展?.角色库ID??null,
   lifeStatus:state.战斗单位?.列表?.[p.id]?.存活状态??({active:'存活',dead:'死亡'} as Record<string,string>)[p.status]??null,
   commitments:isPlayer?[]:personCommitments(state,p.id).map((r:any)=>commitmentView(state,r)).filter((r:any)=>['pending','accepted'].includes(r.status)),
   recentEndedCommitments:isPlayer?[]:recentEndedCommitments(state,p.id),
   ...(!isPlayer?{history:storyPersonHistorySummary(state,p.id)}:{}),
   recentCompanionAgreements:(p.扩展?.同行约定??[]).filter((a:any)=>a.playerId===id).slice(-8),
   recentSharedEvents:(p.扩展?.共同见闻??[]).filter((event:any)=>event.playerId===id&&event.participants?.includes(p.id)).slice(-8),
   sharedBattleEncounters:sharedBattleEncounters(state,p.id),
   ...(!isPlayer?{freeActions:freeActionFacts(state,p.id)}:{}),
   items:storyOwnedItemFacts(state,p.id),
   martialSouls:masked?[{name:appearance.martialSoul}]:storySoulFacts(state,p.id),
   ownedRings:masked?[]:storyOwnedRingFacts(state,p.id),
   actionState:storyActionState(state,p.id,true,readActions),changeInteractions:changeInteractionContext(state,id,p.id),
   abilities:masked?[]:storyAbilityFacts(state,p.id,readActions),
  };
 };
}
