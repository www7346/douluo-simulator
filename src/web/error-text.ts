import {playerText} from '../runtime/player-text';

export function describeError(error:unknown,state:any={}):string {
  const message=String((error as Error)?.message??error??'未知错误');
  return playerText(message,state).slice(0,280);
}
