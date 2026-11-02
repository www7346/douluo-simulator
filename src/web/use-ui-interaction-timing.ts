import {useLayoutEffect,useEffect,type MutableRefObject} from 'react';
import {interactionScope,leaveInteraction,readyInteraction,visibleInteraction,unobservedInteraction} from './ui-interaction-timing';
import type {StoryArchiveRecord} from '../shared/story-archive';
/** Observe only the matching final body, including clipping by its scrolling container. */
export function useUiInteractionTiming(id:MutableRefObject<string|null>,ready:boolean,entries:StoryArchiveRecord[],sessionId:number,owner:string,route:string,{enabled=true,ownsLifecycle=true}:{enabled?:boolean;ownsLifecycle?:boolean}={}){
 useLayoutEffect(()=>{
  if(!enabled)return;
  const current=id.current;if(!current)return;
  const scope=interactionScope(current);if(!scope||scope.sessionId!==sessionId)return;
  if(ready)readyInteraction(current);
  const entry=entries.find(row=>row.branchId===scope.branchId&&row.turn.number===scope.turn);if(!entry)return;
  const nodes=[...document.querySelectorAll<HTMLElement>('[data-story-body]')];
  const element=nodes.find(node=>node.dataset.storyOwner===owner&&node.dataset.storyWorld===scope.worldId&&Number(node.dataset.storySession)===scope.sessionId&&node.dataset.storyBody===entry.id&&node.getBoundingClientRect().width>0);
  if(!element){if(ready)unobservedInteraction(current);return;}
  let first=0,second=0,intersecting=false,observer:IntersectionObserver|undefined;
  const paint=()=>{cancelAnimationFrame(first);cancelAnimationFrame(second);first=requestAnimationFrame(()=>{second=requestAnimationFrame(()=>{const r=element.getBoundingClientRect();if(document.visibilityState==='visible'&&(!observer||intersecting)&&r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth)visibleInteraction(current);else if(ready)unobservedInteraction(current);});});};
  if(typeof IntersectionObserver!=='undefined'){observer=new IntersectionObserver(rows=>{intersecting=rows.some(row=>row.isIntersecting);paint();});observer.observe(element);}else paint();
  const reveal=()=>{if(document.visibilityState==='visible')paint();else if(ready)unobservedInteraction(current);};document.addEventListener('visibilitychange',reveal);
  if(document.visibilityState!=='visible'&&ready)unobservedInteraction(current);
  return()=>{observer?.disconnect();cancelAnimationFrame(first);cancelAnimationFrame(second);document.removeEventListener('visibilitychange',reveal);};
 },[id,ready,entries,sessionId,owner,route,enabled]);
 useEffect(()=>()=>{if(ownsLifecycle){if(id.current)leaveInteraction(id.current);id.current=null;}},[id,sessionId,ownsLifecycle]);
}
