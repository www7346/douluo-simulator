import {createContext,useContext,useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {useGameController} from './game-context';
import {describeError} from './error-text';
import {creationRequest} from './creation-request';

export const BackgroundQueriesPaused=createContext(false);

/** Revision-bound queries never display the preceding world's quote or target set. */
export function useGameQuery<T>(key:string,query:(signal:AbortSignal)=>Promise<T>,options:{enabled?:boolean;delay?:number;keepPrevious?:boolean}={}){
  const controller=useGameController();
  const {sessionId,revision,connecting}=useSyncExternalStore(controller.subscribe,controller.getQueryContext,controller.getQueryContext);
  const context=`${sessionId}:${revision}:`,identity=context+key;
  const paused=useContext(BackgroundQueriesPaused),enabled=!paused&&!connecting&&options.enabled!==false;
  const callback=useRef(query);callback.current=query;
  const [result,setResult]=useState<{identity:string;data?:T;error?:string}>({identity:''});
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    if(!enabled)return;
    let active=true;const abort=new AbortController(),source=controller.getView().snapshot.state;
    const timer=setTimeout(()=>{void callback.current(abort.signal).then(data=>{if(active)setResult({identity,data});},error=>{if(active)setResult({identity,error:describeError(error,source)});});},options.delay??0);
    return()=>{active=false;clearTimeout(timer);abort.abort();};
  },[identity,enabled,options.delay,attempt]);
  return {sessionId,data:result.identity===identity||options.keepPrevious&&result.identity.startsWith(context)?result.data:undefined,error:result.identity===identity?result.error:undefined,loading:enabled&&result.identity!==identity,retry:()=>{setResult({identity:''});setAttempt(value=>value+1);}};
}

export function useServerQuery<T=any>(name:string,input:Record<string,unknown>={},options:{enabled?:boolean;delay?:number;keepPrevious?:boolean}={}) {
  const controller=useGameController(),serialized=JSON.stringify(input);
  return useGameQuery<T>(name+':'+serialized,signal=>name.startsWith('creation.')?creationRequest(controller,name,JSON.parse(serialized),signal):controller.query(name,JSON.parse(serialized),signal),options);
}

/** Retains presentation only within the same scene, never action permission or another world's data. */
export function useSceneQuery<T=any>(name:string,input:Record<string,unknown>={},scope='',options:{enabled?:boolean}={}) {
  const query=useServerQuery<T>(name,input,options);
  const identity=`${query.sessionId}:${name}:${scope}:${JSON.stringify(input)}`;
  const previous=useRef<{identity:string;data?:T}>({identity:''});
  if(previous.current.identity!==identity)previous.current={identity};
  if(query.data!==undefined)previous.current={identity,data:query.data};
  return {...query,data:query.data??previous.current.data};
}
