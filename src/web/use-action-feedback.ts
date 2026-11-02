import {useGame} from './game-context';
import {beginInteraction,readyInteraction,settleInteraction,interactionErrorOutcome} from './ui-interaction-timing';
import {useState} from 'react';
import {playerText} from '../runtime/player-text';
import {describeError} from './error-text';

/** Keep the actual command failure readable until dismissed or another attempt starts. */
export function useActionFeedback(){
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');
  const {controller,view}=useGame();
  const run=async(action:()=>Promise<unknown>)=>{
    setError('');
    setSuccess('');
    const id=beginInteraction({worldId:controller.runtime.slotId,sessionId:view.sessionId,revision:view.snapshot.revision,kind:'action'},controller.database);
    try{const result=await action();if(Array.isArray(result)){const summary=result.find(event=>typeof event?.summary==='string'&&event.summary)?.summary;setSuccess(summary?playerText(summary,controller.getView().snapshot.state,'操作已完成。'):'');}readyInteraction(id);settleInteraction(id);return true;}
    catch(reason){settleInteraction(id,interactionErrorOutcome(reason));setError(describeError(reason,controller.getView().snapshot.state));return false;}
  };
  return {error,success,run,dismiss:()=>{setError('');setSuccess('');}};
}
