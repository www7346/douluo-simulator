import {useGame} from '../game-context';
import {playerText} from '../../runtime/player-text';
import './consumables.css';

export function PillEffectList({effects}:{effects:any[]}) {
  return <ul>{effects.map((effect,index)=><li key={index}>{effect.attribute} {typeof effect.value==='number'?`+${effect.value}`:effect.value} · 持续 {effect.rounds} 回合</li>)}</ul>;
}

export default function PreparedPills({entries}:{entries:any[]}) {
  const {state}=useGame();
  if(!entries?.length)return null;
  return <section className="prepared-pills" aria-label="待激活药效"><h3>药效待激活</h3><p>服药后两小时内的下一场战斗开始生效。同一属性取较强效果。</p>
    {entries.map(entry=><div key={entry.id}><b>{playerText(entry.name,state,'属性丹药')}</b><PillEffectList effects={entry.effects}/></div>)}
  </section>;
}
