import BattleUnitPortrait from './BattleUnitPortrait';
import {unitFigure} from '../fantasy-art';
import {useGame} from '../game-context';
import display from '../../shared/display-labels.json';
import {characterPortrait,unitPortrait} from '../../runtime/visual-identity';
import {characterFigure,temporaryHumanFigure} from '../character-figures';
import UiIcon from './UiIcon';

export default function CompetitionPortrait({person}:{person:any}) {
  const {state,view}=useGame();
  if(person.waiting)return <span className="competition-silhouette"><UiIcon name="person"/></span>;
  if(person.isPlayer)return <BattleUnitPortrait name={person.name} avatarUrl={view.avatarUrl} portrait={unitPortrait(state,state.角色.主控单位ID)} figure={unitFigure(state,state.角色.主控单位ID,view.figureUrl)}/>;
  const record=person.kind==='canon'&&person.characterId?{id:person.characterId,...(display.people as Record<string,{name:string;kind:string}>)[person.characterId]}:null;
  // The same source order as combat; a temporary record never borrows a named character by name.
  const metadata=record??{...person,id:person.characterId||person.temporaryRecordId||person.id,kind:'resident'};
  return <BattleUnitPortrait name={person.name} portrait={characterPortrait(metadata)} figure={person.temporaryRecordId?temporaryHumanFigure(person.temporaryRecordId,person.level,metadata):characterFigure(metadata)}/>;
}
