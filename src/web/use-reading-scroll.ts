import {useLayoutEffect,useRef,type RefObject} from 'react';
import {ReadingScroll} from './reading-scroll';

export function useReadingScroll(ref:RefObject<HTMLDivElement|null>,{scope,conversation='',contentKey,enabled=true,onFollowChange}:{scope:string;conversation?:string;contentKey:unknown;enabled?:boolean;onFollowChange?:(following:boolean)=>void}){
 const positions=useRef({scope,readings:new Map<string,ReadingScroll>()});
 if(positions.current.scope!==scope)positions.current={scope,readings:new Map()};
 let reading=positions.current.readings.get(conversation);if(!reading){reading=new ReadingScroll();positions.current.readings.set(conversation,reading);}
 reading.onFollowChange=onFollowChange;
 useLayoutEffect(()=>{
  const history=ref.current;if(!enabled||!history)return;
  reading.attach(history);
  const observer=new ResizeObserver(()=>reading.restore());
  observer.observe(history);if(history.firstElementChild)observer.observe(history.firstElementChild);
  return()=>{observer.disconnect();reading.detach(history);};
 },[reading,enabled]);
 useLayoutEffect(()=>{if(enabled)reading.restore();},[reading,enabled,contentKey]);
 return reading;
}
