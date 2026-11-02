import {playSceneKind} from '../../runtime/play-scene';
import {Button} from '../components';
import {useGame} from '../game-context';

/** Navigation only; the competition page still submits the next match command. */
export default function CompetitionResumeAction({onContinue}:{onContinue:()=>void}) {
  const {state}=useGame();
  if(playSceneKind(state)!=='competition')return null;
  return <div className="battle-result-actions"><Button icon="cup" onClick={onContinue}>返回赛事，继续参赛</Button></div>;
}
