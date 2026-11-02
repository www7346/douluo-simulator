import type {GameEvent} from '../runtime/contracts';

export interface PlaybackState {queue:GameEvent[];after:boolean}
export type PlaybackAction = {type:'append';events:GameEvent[]} | {type:'after';id:string} | {type:'next';id:string} | {type:'skip'};
export function battleTurns(events:GameEvent[],battleId:string) {
  return events.filter(event => event.battleView?.before.battleId === battleId && event.type !== 'battle-auto-settled')
    .sort((a,b)=>a.revision-b.revision || (a.sequence ?? 0)-(b.sequence ?? 0));
}
export function playbackReducer(state:PlaybackState,action:PlaybackAction):PlaybackState {
  if(action.type === 'skip') return {queue:[],after:false};
  if(action.type === 'append') {
    const ids=new Set(state.queue.map(event=>event.id));
    return {...state,queue:[...state.queue,...action.events.filter(event=>!ids.has(event.id) && ids.add(event.id))]};
  }
  if(state.queue[0]?.id !== action.id) return state;
  return action.type === 'after' ? {...state,after:true} : {queue:state.queue.slice(1),after:false};
}
