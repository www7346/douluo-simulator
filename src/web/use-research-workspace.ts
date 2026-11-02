import {useEffect,useRef,useState} from 'react';
import {researchWorkspace,type ResearchWorkspace} from '../runtime/research-workbench';
import {playerText} from '../runtime/player-text';
import {useGame} from './game-context';

export function useResearchWorkspace() {
  const {controller,view}=useGame();
  const [draft,setDraft]=useState(()=>researchWorkspace(view.researchWorkspace));
  const [saveState,setSaveState]=useState(view.researchWorkspace?'草稿已保存':'构想和选材会自动保存');
  const latest=useRef(draft),generation=useRef(0),session=useRef(view.sessionId),mounted=useRef(true),saving=useRef<Promise<void>>(Promise.resolve());
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[]);
  useEffect(()=>{if(generation.current===0){const next=researchWorkspace(view.researchWorkspace);latest.current=next;setDraft(next);if(view.researchWorkspace)setSaveState('草稿已保存')}},[view.researchWorkspace]);
  const change=(update:(current:ResearchWorkspace)=>ResearchWorkspace)=>{
    if(controller.getView().sessionId!==session.current)return;
    try {
      const next=researchWorkspace(update(latest.current));
      latest.current=next;setDraft(next);setSaveState('正在保存草稿…');
      const current=++generation.current;
      saving.current=controller.saveResearchWorkspace(next);
      void saving.current.then(()=>{if(mounted.current&&generation.current===current)setSaveState('草稿已保存')}).catch(error=>{if(mounted.current&&generation.current===current)setSaveState(playerText(error.message,controller.getView().snapshot.state,'草稿尚未保存，请稍后重试'))});
    }catch(error){controller.notify(playerText((error as Error).message,controller.getView().snapshot.state),'danger')}
  };
  const refresh=()=>{if(controller.getView().sessionId!==session.current||!mounted.current)return;const next=researchWorkspace(controller.getView().researchWorkspace);latest.current=next;setDraft(next);setSaveState('草稿已保存')};
  return {draft,change,saveState,refresh,flush:()=>saving.current};
}
