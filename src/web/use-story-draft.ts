import {useEffect,useState} from 'react';
import {clearSubmittedStoryDraft,readStoryDraft,storyDraftKey,writeStoryDraft,type StoryDraftScope} from './story-draft';
export function useStoryDraft(scope:StoryDraftScope){
 const key=storyDraftKey(scope);
 const read=()=>{try{return {key,value:readStoryDraft(window.sessionStorage,key),failed:false};}catch{return {key,value:'',failed:true};}};
 const [entry,setEntry]=useState(read);
 // Reset during render so another conversation never briefly displays the previous draft.
 if(entry.key!==key)setEntry(read());
 const value=entry.key===key?entry.value:'';
 const hasDraft=Boolean(value);
 useEffect(()=>{
  if(!hasDraft)return;
  const protect=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
  window.addEventListener('beforeunload',protect);
  return()=>window.removeEventListener('beforeunload',protect);
 },[hasDraft]);
 const setValue=(value:string)=>{
  let failed=false;try{writeStoryDraft(window.sessionStorage,key,value);}catch{failed=true;}
  setEntry({key,value,failed});
 };
 const clearSubmitted=(submitted:string)=>{
  let failed=false;try{clearSubmittedStoryDraft(window.sessionStorage,key,submitted);}catch{failed=true;}
  setEntry(current=>current.key===key&&current.value===submitted?{key,value:'',failed}:current);
 };
 return {value,setValue,clearSubmitted,storageFailed:entry.key===key&&entry.failed};
}
