import {useState} from 'react';
import {useGame} from '../game-context';
import {useSceneQuery} from '../use-game-query';
import {useActionFeedback} from '../use-action-feedback';
import {ActionSection,Button} from '../components';
import QuerySurface from './QuerySurface';
import CooperationPanel from './CooperationPanel';
import CooperationPreparationPanel from './CooperationPreparationPanel';
import ControlledGiftPanel from './ControlledGiftPanel';
import WorldSpeechPanel from './WorldSpeechPanel';
import ActionFeedback from './ActionFeedback';

export default function PersonCooperation({personId,expanded=false}:{personId:string;expanded?:boolean}){
 const [open,setOpen]=useState(expanded),[socialOpen,setSocialOpen]=useState(expanded),{view,controller}=useGame(),feedback=useActionFeedback();
 const query=useSceneQuery<any>('scene.custody',{scope:'cooperation',selectedPersonId:personId},'person-cooperation'+personId,{enabled:open});
 const social=useSceneQuery<any>('scene.custody',{scope:'social',selectedPersonId:personId},'person-social'+personId,{enabled:socialOpen});
 const respond=(relationId:string,accept:boolean)=>feedback.run(()=>controller.dispatch('world.intent',{type:'respond-person-relation',relationId,accept,reason:accept?'同意这项关系':'拒绝这项关系'}));
 const cooperation=<>{open&&<QuerySurface query={query}>{query.data&&<><CooperationPanel facts={query.data} targetId={personId}/><CooperationPreparationPanel facts={query.data}/><ControlledGiftPanel gifts={query.data.gifts}/></>}</QuerySurface>}</>;const socialContent=<>{socialOpen&&<QuerySurface query={social}>{social.data&&<>
   <ActionFeedback feedback={feedback}/>
   {social.data.social.pendingRelations.filter((r:any)=>r.personId===social.data.social.viewerId).map((r:any)=><div key={r.id}><p>对方希望确认与你的关系。</p><div className="field-actions">{[true,false].map(accept=><Button key={String(accept)} variant={accept?'secondary':'ghost'} disabled={view.busy} onClick={()=>void respond(r.id,accept)}>{accept?'同意':'拒绝'}</Button>)}</div></div>)}
   <WorldSpeechPanel social={social.data.social}/>{!social.data.social.pendingRelations.length&&!social.data.social.speech.length&&<p className="muted">暂时没有待回应的关系或新的听闻。</p>}
  </>}</QuerySurface>}</>;return expanded?<div className="person-cooperation-page"><section>{cooperation}</section><section><h4>关系回应与听闻</h4>{socialContent}</section></div>:<><ActionSection title={<>同行与合作</>} onOpenChange={setOpen}>{cooperation}</ActionSection><ActionSection title={<>关系回应与听闻</>} onOpenChange={setSocialOpen}>{socialContent}</ActionSection></>;
}
