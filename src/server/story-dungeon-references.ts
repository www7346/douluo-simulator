import {storyHuntingDestinations,type StoryPlan} from '../runtime/story-turns';
import {StoryPlanValidationError} from '../runtime/story-plan-validation-error';

/** A host proposal selects a known expedition, rather than a map location.
 * Attest references before signing; execution still owns access and consent. */
export function validateStoryDungeonReferences(state:any,plan:StoryPlan){
 const destinations=storyHuntingDestinations(state);
 for(const [index,{action}] of plan.segments.entries()){
  const invitation=action.kind==='invite-party';
  const omit=invitation&&action.membership==='long-term';
  const required=invitation&&action.membership==='temporary';
  if(action.dungeonId===undefined&&!required)continue;
  if(!omit&&destinations.some(d=>d.id===action.dungeonId))continue;
  throw new StoryPlanValidationError(omit?'长期入队不绑定单次远征，请省略远征目的地':'远征目的地须选择当前已知的具体猎场，不能使用地图地点编号',{
   instancePath:`/segments/${index}/action/dungeonId`,keyword:'dungeon-reference',submitted:action.dungeonId??null,
   reference:{instancePath:'/facts/huntingDestinations',value:{destinations,...(invitation?{membership:action.membership,parameter:omit?'omit':'dungeonId'}:{parameter:'dungeonId'})}},
  });
 }
}
