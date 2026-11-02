import {slaughterView} from '../../runtime/slaughter-view';
import {playerText} from '../../runtime/player-text';
import {unitPortrait} from '../../runtime/visual-identity';
import {unitFigure} from '../fantasy-art';
import {Button,Progress} from '../components';
import {useGame} from '../game-context';
import BattleUnitPortrait from './BattleUnitPortrait';
import type {PageId} from '../App';

export default function SlaughterTrial({onOpen,onStart,onNext,onBattle,onRoad,onReturn,atEntrance,block}:{
  onOpen:(page:PageId,tab?:string)=>void;onStart:()=>void;onNext:()=>void;onBattle:()=>void;onRoad:()=>void;onReturn:()=>void;atEntrance:boolean;block:string;
}) {
  const {state,view}=useGame(),trial=slaughterView(state),run=state.杀戮场?.当前;
  const id=state.角色.主控单位ID,unit=state.战斗单位.列表[id],name=playerText(state.人物.列表[id]?.name,state,'旅者');
  const stages=trial?.stages??Array.from({length:5},(_,i)=>({bout:i+1,status:'waiting',label:'未开始'}));
  return <section className="world-trial">
    <div className="world-trial__intro"><span className="eyebrow">魂环魂技封禁 · 五场连续死斗</span><h2>地狱杀戮场</h2>
      <p>每场十个独立阵营，只有一位生还者。生命、魂力、状态、耐久与消耗品跨场保留，进入后无法逃跑或中途结算。</p>
      <div className="trial-stages" aria-label="五场死斗进度">{stages.map(stage=><div key={stage.bout} className={`is-${stage.status}`} aria-current={stage.status==='current'?'step':undefined}><b>{String(stage.bout).padStart(2,'0')}</b><span>{stage.label}</span></div>)}</div>
      <div className="trial-next"><strong>{trial?.label??'入场前准备'}</strong>
        {trial?.active?run.match?<Button onClick={onBattle}>返回死斗战场</Button>:<Button variant="danger" disabled={view.busy} onClick={onNext}>开始第 {run.nextBout} 场</Button>:<Button variant="danger" disabled={view.busy||atEntrance&&Boolean(block)} onClick={onStart}>{atEntrance?'进入杀戮场':'寻找杀戮场入口'}</Button>}
      </div>
      <p className="trial-status-note">{trial?.completed?'五场全胜，奖励已结算，地狱路资格已取得。':trial?.failed?'本次试炼已结束，累计未带出的奖励已失去。你已在场外苏醒，可以重新整备。':'五场全胜才能带出累计奖励；场间可以查看人物、整理行囊，资源不会自动恢复。'}</p>
      {!trial?.active&&block&&<p className="danger-text">{block}</p>}
      {trial&&<section className="trial-earnings" aria-label={trial.earningsLabel}><h3>{trial.earningsLabel}</h3><p className="trial-experience"><b>{trial.experience.toLocaleString('zh-CN')}</b> 经验</p>
        <ul>{trial.loot.map(item=><li key={item.key}><span>{item.name}</span><b>× {item.quantity}</b></li>)}{trial.bones.map((itemId:string)=><li key={itemId}>{playerText(state.物品.实例[itemId]?.name,state,'魂骨')}</li>)}</ul>
        {!trial.loot.length&&!trial.bones.length&&<p>暂无物品收获。</p>}
        {trial.levelResult&&<p>本次提升 {trial.levelResult.levelsGained??0} 级{trial.levelResult.bottleneck?` · ${playerText(trial.levelResult.bottleneck,state)}`:''}</p>}
      </section>}
      {Boolean(trial?.history.length)&&<section className="trial-history" aria-label="本次试炼战绩"><h3>本次试炼战绩</h3>{trial!.history.map((record:any)=><details key={record.bout}><summary>第 {record.bout} 场 <b>{record.won?'胜出':'败北'}</b><span>{record.won?`+${record.experience} 经验`:'试炼结束'}</span></summary><p>生还者：{record.survivors||'无人'}</p>{record.won&&<ul>{record.loot.map((item:any)=><li key={item.key}>{item.name} × {item.quantity}</li>)}</ul>}</details>)}</section>}
    </div>
    <aside className="world-trial__road"><div className="trial-player"><BattleUnitPortrait name={name} avatarUrl={view.avatarUrl} portrait={unitPortrait(state,id)} figure={unitFigure(state,id,view.figureUrl)}/><div><h3>{name}</h3><p>{state.成长.列表[id]?.魂力等级} 级魂师</p></div></div>
      <Progress label="生命" value={unit.资源.生命.当前} maximum={unit.资源.生命.最大} tone="life"/><Progress label="魂力" value={unit.资源.魂力.当前} maximum={unit.资源.魂力.最大} tone="soul"/>
      <nav className="trial-shortcuts" aria-label="试炼整备"><Button variant="secondary" onClick={()=>onOpen('character','状态')}>人物</Button><Button variant="secondary" onClick={()=>onOpen('inventory','items')}>行囊</Button><Button variant="secondary" onClick={()=>onOpen('character','武魂与技能')}>武魂与技能</Button></nav>
      {!trial?.active&&<div className="trial-road"><span className="eyebrow">胜者的下一程</span><h3>地狱路</h3><p>查看资格与路线，整备后再踏上下一程。</p><Button variant="secondary" onClick={onRoad}>查看资格与路线</Button><Button variant="ghost" onClick={onReturn}>返回大地图</Button></div>}
    </aside>
  </section>;
}
