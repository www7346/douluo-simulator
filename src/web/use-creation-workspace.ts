import {useEffect,useRef,useState} from 'react';
import type {CreationWorkspace} from '../shared/creation-draft';
import {creationReason} from '../shared/creation-draft';
import {useGame} from './game-context';

/** Each edit immediately queues an atomic draft save; no navigation debounce can strand it. */
export function useCreationWorkspace(initial:CreationWorkspace) {
  const {controller,view}=useGame();
  const [workspace,setWorkspace]=useState(initial);
  const [saveState,setSaveState]=useState(view.creationWorkspace ? '已保存' : '等待写入你的构想');
  const latest=useRef(workspace),lastSave=useRef<Promise<void>>(Promise.resolve());
  const generation=useRef(0),mounted=useRef(true),session=useRef(view.sessionId);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const persist=(next:CreationWorkspace)=>{
    const version=++generation.current;
    setSaveState('保存中…');
    const pending=controller.saveCreationWorkspace(next).then(()=>{
      if(mounted.current && version===generation.current)setSaveState('已保存');
    }).catch(error=>{
      if(mounted.current && version===generation.current)setSaveState(`尚未保存：${creationReason(error.message)}`);
      throw error;
    });
    lastSave.current=pending;
    void pending.catch(()=>undefined);
    return pending;
  };
  const change=(update:CreationWorkspace|((current:CreationWorkspace)=>CreationWorkspace))=>{
    if(controller.getView().sessionId!==session.current || (controller.getView().snapshot.state as any).角色?.已建立)return;
    try {
      const next=typeof update==='function'?update(latest.current):update;
      latest.current=next;setWorkspace(next);void persist(next);
    }catch(error){controller.notify(creationReason((error as Error).message),'danger');}
  };
  return {workspace,change,saveState,current:()=>latest.current,flush:async()=>{await lastSave.current;},retry:()=>persist(latest.current)};
}
