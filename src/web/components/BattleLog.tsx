import {castReceiptLabel} from '../../runtime/ability-sources';
import type {GameEvent} from '../../runtime/contracts';
import {createPortal} from 'react-dom';
import {playerText,receiptSummary} from '../../runtime/player-text';
import {battleTurns} from '../battle-playback';
import BattleJudgmentDetails from './BattleJudgmentDetails';


export function BattleRecentLog({events,state,onOpen}:{events:GameEvent[];state:any;onOpen:()=>void}) {
  const recent=battleTurns(events,state.战斗?.id).slice(-2).reverse();
  return <section className="battle-recent-log fantasy-panel"><header><h2>战斗记录</h2><button onClick={onOpen} aria-label="查看全部战斗记录">全部 ↗</button></header>{recent.map(event=><article key={event.id}><small>第{Number(event.payload.round)}回合</small><p>{receiptSummary('battle.action',event.payload,state)}</p>{castReceiptLabel(event.payload)&&<p className="battle-cast-label">{castReceiptLabel(event.payload)}</p>}<BattleJudgmentDetails receipt={event.payload} state={state}/></article>)}{!recent.length&&<p>交锋即将开始。每次行动的判定会记录在这里。</p>}</section>;
}

export default function BattleLog({events,state,onClose}:{events:GameEvent[];state:any;onClose:()=>void}){
  const recent=battleTurns(events,state.战斗?.id).slice(-60).reverse();
  return createPortal(<aside className="combat-log" aria-label="战斗记录" style={{textAlign:'left'}}><header><h2>战斗记录</h2><button className="icon-button" aria-label="关闭战斗记录" onClick={onClose}>×</button></header><div>
    {recent.map(event=><article key={event.id}><small>第{Number(event.payload.round)}回合 · {playerText(state.战斗单位.列表[String(event.payload.actorId)]?.名称,state,'魂师')}</small><p>{receiptSummary('battle.action',event.payload,state)}</p>{castReceiptLabel(event.payload)&&<p className="battle-cast-label">{castReceiptLabel(event.payload)}</p>}<BattleJudgmentDetails receipt={event.payload} state={state}/></article>)}
    {!recent.length&&<p>战斗刚刚开始。</p>}
  </div></aside>,document.body);
}
