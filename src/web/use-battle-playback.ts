import {useEffect,useLayoutEffect,useReducer,useRef} from 'react';
import type {GameEvent} from '../runtime/contracts';
import type {BattleViewFrame} from '../runtime/player-presentation';
import type {PerformanceLevel} from './controller';
import {battleTurns,playbackReducer} from './battle-playback';
import {battleCues} from './game-feedback';
import {gameAudio} from './game-audio';

/** A mounted battle starts at its saved frame; only newly committed turns are animated. */
export function useBattlePlayback(events:GameEvent[],live:BattleViewFrame,performance:PerformanceLevel) {
  const [systemReduced,setSystemReduced]=useReducer((_:boolean,value:boolean)=>value,false);
  useEffect(()=>{const query=matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setSystemReduced(query.matches);update();query.addEventListener('change',update);return()=>query.removeEventListener('change',update);},[]);
  const reduced=performance==='reduced'||systemReduced;
  const seen=useRef(new Set(events.map(event=>event.id)));
  const [playback,dispatch]=useReducer(playbackReducer,{queue:[],after:false});
  useLayoutEffect(()=>{
    const turns=battleTurns(events,live.battleId).filter(event=>!seen.current.has(event.id));
    for(const event of events) seen.current.add(event.id);
    if(reduced){dispatch({type:'skip'});for(const turn of turns.slice(-1))for(const cue of battleCues(turn))void gameAudio.play(cue);}
    else if(turns.length) dispatch({type:'append',events:turns});
  },[events,live.battleId,reduced]);
  const event=playback.queue[0];
  useEffect(()=>{
    if(!event) return;
    const show=setTimeout(()=>{dispatch({type:'after',id:event.id});for(const cue of battleCues(event))void gameAudio.play(cue);},performance === 'smooth' ? 20 : 130);
    const finish=setTimeout(()=>dispatch({type:'next',id:event.id}),performance === 'cinematic' ? 1450 : performance === 'standard' ? 900 : 300);
    return ()=>{clearTimeout(show);clearTimeout(finish);};
  },[event?.id,performance]);
  useEffect(()=>()=>gameAudio.stopEffects(),[]);
  useEffect(()=>{const hidden=()=>{if(document.hidden){dispatch({type:'skip'});gameAudio.stopEffects();}};document.addEventListener('visibilitychange',hidden);return()=>document.removeEventListener('visibilitychange',hidden);},[]);
  return {event,after:playback.after,playing:Boolean(event),remaining:playback.queue.length,
    frame:event?.battleView ? (playback.after ? event.battleView.after : event.battleView.before) : live,
    skip:()=>{gameAudio.stopEffects();dispatch({type:'skip'});}};
}
