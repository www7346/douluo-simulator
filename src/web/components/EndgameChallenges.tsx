import {useSceneQuery} from '../use-game-query';
import QueryStatus from '../components/QueryStatus';
import QuerySurface from '../components/QuerySurface';

import {playerText} from '../../runtime/player-text';
import {characterPortrait} from '../../runtime/visual-identity';
import {characterFigure} from '../character-figures';
import {Button} from '../components';
import BattleUnitPortrait from './BattleUnitPortrait';

type Props={state:any;busy:boolean;onPerson:(id:string)=>void;onRoute:(id:string)=>void;onChallenge:(id:string,name:string)=>void};
export default function EndgameChallenges(props:Props) {
 const {state}=props;
 const facts=useSceneQuery<any[]>('scene.endgame',{},state?.地图?.当前地点ID);
 if(!facts.data)return <QueryStatus query={facts}/>;
 return <QuerySurface query={facts}><EndgameChallengeCards {...props} entries={facts.data}/></QuerySurface>;
}
export function EndgameChallengeCards({state,busy,onPerson,onRoute,onChallenge,entries}:Props&{entries:any[]}) {
 return <section className="world-endgame"><div className="world-section-heading"><div><span className="eyebrow">九十九级 · 至少一武魂九环</span><h2>巅峰对手</h2></div><span>{entries.filter(entry=>entry.preview.victory).length} / {entries.length} 已战胜</span></div>
  <p className="endgame-introduction">挑战 99 级巅峰投影。胜利计入战绩，败北时角色死亡。</p>
  <div className="world-endgame-grid">{entries.map(({id,preview,person,record}:any)=>{
   return <article key={id} data-character-id={id} className={preview.victory?'is-victorious':''}>
    <div className="endgame-card-heading"><div className="endgame-insignia"><BattleUnitPortrait name={person.name} portrait={characterPortrait(person)} figure={characterFigure(person)}/></div><div className="endgame-identity"><span className="eyebrow">{preview.victory?'已战胜':'等待挑战'}</span><h3>{person.name}</h3><p>{person.soul}</p><small>{person.locationName}</small></div></div>
    {record.latest&&<div className="endgame-record-summary" aria-label={`${person.name}最近战绩`}><span>最近：<b className={record.latest.won?'is-win':'is-loss'}>{record.latest.won?'胜利':'败北'}</b>{record.latest.round!==null?` · ${record.latest.round} 回合`:''}</span>{record.bestRound!==null&&<span>最佳胜场：<b>{record.bestRound} 回合</b></span>}</div>}
    {!record.latest&&record.bestRound!==null&&<p className="endgame-record-summary">最佳胜场：{record.bestRound} 回合</p>}
    {preview.reasons.length>0&&<ul className="endgame-requirements">{preview.reasons.map((reason:string)=><li key={reason}>{playerText(reason,state)}</li>)}</ul>}
    <div className="field-actions"><Button variant="ghost" onClick={()=>onPerson(id)}>投影档案</Button><Button disabled={busy||!preview.available} onClick={()=>onChallenge(id,person.name)}>挑战历史投影</Button></div>
    {record.history.length>0&&<details className="endgame-history"><summary>挑战记录（{record.history.length}）</summary><ol>{record.history.map((entry:any)=><li key={entry.id}><span>第 {entry.attempt} 次挑战</span><b className={entry.won?'is-win':'is-loss'}>{entry.won?'胜利':'败北'}</b><span>{entry.round===null?'回合未记录':`${entry.round} 回合`}</span></li>)}</ol></details>}
   </article>;
  })}</div>
 </section>;
}
