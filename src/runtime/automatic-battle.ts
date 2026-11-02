import {rules} from '../rules';
import {setAutomaticBattle} from './battle-preferences';
import {captureBattleView,type BattleTurnView} from './player-presentation';

export function settleAutomaticBattle(state:any, committed:boolean, type:'battle.auto-step'|'battle.auto-until-player', payload:Record<string,any>,takeover?:()=>boolean){
  if(state.战斗?.扩展?.automation?.waitingStoryTurn)throw Error('请先完成抵达故事，或接管为手动战斗');
  let current = state;
  const turns: Record<string, any>[] = [];
  const frames:BattleTurnView[]=[];
  const includePlayer=type==='battle.auto-step';
  const automatic=state.战斗?.扩展?.automation?.enabled===true;
  let handoff=false;
  const limit = Number(payload.limit ?? (includePlayer?1:48));
  if(!Number.isSafeInteger(limit)||limit<(includePlayer?1:8)||limit>(includePlayer?8:48))throw Error('自动行动次数超出本次上限');
  // Continue through the existing batch protocol after complete actions.
  // Smaller responses keep long NPC turns responsive on large worlds.
  for (let index = 0; index < Math.min(limit,8); index += 1) {
    if (current?.战斗?.状态 !== '进行中') break;
    if(automatic&&takeover?.()){handoff=true;break;}
    const actorId = String(current?.战斗?.当前行动单位ID ?? '');
    const member = current?.战斗?.扩展?.成员?.[actorId];
    if (!actorId || !includePlayer&&member?.controller === 'player'&&!rules.influence.pendingOrder(current,actorId)) break;
    if(member?.controller!=='player'&&rules.poison.table(current).offers.some((o:any)=>o.targetId===actorId&&o.status==='pending'))break;
    const actionId=`battle:${current.战斗.id}:automatic-action:${Object.keys(current.战斗.扩展.已结算行动).length+1}`;
    const intent = rules.combat.chooseAiIntent(current, actorId, actionId);
    // Between consecutive actions only the automation counter changes.
    // The next opening frame is the preceding action's settled view.
    const beforeFrame=frames.at(-1)?.after??captureBattleView(current);
    const action={...intent,id:actionId};
    const result=committed&&current===state
      ? rules.cycle.settleCommittedCombatAction(current,action)
      : rules.cycle.settleCombatAction(current,action,{owned:index>0});
    frames.push({before:beforeFrame,after:captureBattleView(result.state),receipt:structuredClone(result.receipt ?? {})});
    current = result.state;
    if(automatic&&current.战斗.扩展?.automation?.enabled){
      const automation=current.战斗.扩展.automation;automation.steps++;
      if(automation.steps>=600||current.战斗.状态!=='进行中')automation.enabled=false;
    }
    turns.push(result.receipt ?? {});
    if(automatic&&current.战斗.扩展?.automation?.steps>=600)break;
  }
  // Publish the pause with the completed prefix under the original operation id.
  // A pause before the first action still needs an owned draft and a receipt.
  if(committed&&current===state)current=structuredClone(current);
  if(automatic&&current.战斗?.状态==='进行中'&&(handoff||takeover?.())){
    setAutomaticBattle(current,false);
    handoff=true;
  }
  const readyActorId = current?.战斗?.状态 === '进行中' ? String(current?.战斗?.当前行动单位ID ?? '') : '';
  return {
    state: current,
    frames,
    receipt: {
      type: 'battle-auto-settled',
      battleId:current.战斗?.id,
      stopReason:handoff?'manual-control':current.战斗?.状态!=='进行中'?'ended':current.战斗?.扩展?.automation?.steps>=600?'limit-reached':turns.length?'batch-complete':'awaiting-response',
      turns,
      readyActorId,
      battleStatus: current?.战斗?.状态,
      summary: handoff ? '已交还手动控制' : turns.length ? `自动完成${turns.length}次行动` : '当前没有待推进的自动行动',
    },
    idempotent: turns.length === 0&&!handoff,
  };
}
