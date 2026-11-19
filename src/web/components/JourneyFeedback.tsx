import {useEffect,useRef,useState} from 'react';
import type {ControllerView} from '../controller';
import {FeedbackCursor,receiptCue} from '../game-feedback';
import {gameAudio} from '../game-audio';
import {Button} from '../components';

export default function JourneyFeedback({view}:{view:ControllerView}){
  const cursor=useRef(new FeedbackCursor()),notices=useRef(new Set(view.notices.map(n=>n.id)));
  const previous=useRef<{session:string;level:number}|null>(null);
  const [growth,setGrowth]=useState<{from:number;to:number}|null>(null);
  useEffect(()=>{
    const state:any=view.snapshot.state,session=`${view.profileId}:${view.sessionId}`,level=Number(state?.成长?.列表?.[state?.角色?.主控单位ID]?.魂力等级??0);
    const fresh=cursor.current.read(view.events,session);
    for(const event of fresh){const cue=receiptCue(event);if(cue)void gameAudio.play(cue);}
    if(previous.current?.session!==session)setGrowth(null);
    else if(fresh.length&&level>previous.current.level&&previous.current.level>0){setGrowth({from:previous.current.level,to:level});void gameAudio.play('ascend');}
    previous.current={session,level};
  },[view.events,view.profileId,view.sessionId,view.snapshot]);
  useEffect(()=>{if(view.notices.some(n=>n.tone==='danger'&&!notices.current.has(n.id)))void gameAudio.play('reject');notices.current=new Set(view.notices.map(n=>n.id));},[view.notices]);
  useEffect(()=>{if(!growth)return;const timer=window.setTimeout(()=>setGrowth(null),7000);return()=>window.clearTimeout(timer);},[growth]);
  return growth?<section className="growth-feedback" role="status"><span className="growth-feedback__seal" aria-hidden="true">升</span><div><small>修炼有成</small><strong>{growth.from} 级 <span aria-hidden="true">→</span> {growth.to} 级</strong><p>新的力量已经融入武魂。</p></div><Button variant="ghost" onClick={()=>setGrowth(null)}>收起</Button></section>:null;
}
