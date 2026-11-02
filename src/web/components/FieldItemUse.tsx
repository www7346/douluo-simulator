import {useState} from 'react';
import {useActionFeedback} from '../use-action-feedback';
import ActionError from './ActionError';
import {Button} from '../components';
import {useGame} from '../game-context';
import {playerText} from '../../runtime/player-text';
import {PillEffectList} from './PreparedPills';

export function PrebattlePillUse({itemId,facts}:{itemId:string;facts:any}) {
  const {controller,state,view}=useGame();
  const [targetId,setTargetId]=useState(facts.targetId??state.角色.主控单位ID);
  const feedback=useActionFeedback();
  const use=async()=>{await feedback.run(()=>controller.dispatch('world.intent',{type:'use-prebattle-pill',itemId,targetId}));};
  return <div className="field-item-use"><ActionError message={feedback.error} onDismiss={feedback.dismiss}/><p>消耗一枚，药效在两小时内的下一场战斗开始时生效。</p>
    {!!facts.targets?.length&&<label>服药对象<select aria-label="战前服药对象" value={targetId} onChange={e=>setTargetId(e.target.value)}>{facts.targets.map((v:any)=><option key={v.id} value={v.id}>{v.self?'自己':playerText(v.name,state)}</option>)}</select></label>}
    {!!facts.effects?.length&&<PillEffectList effects={facts.effects}/>}
    {facts.hasRestoration&&<p>恢复效果立即作用于服药者。</p>}
    {!facts.available&&<p className="muted">{playerText(facts.reason,state)}</p>}
    <Button disabled={view.busy||!facts.available} onClick={()=>void use()}>战前服用</Button>
  </div>;
}

export default function FieldItemUse({itemId,facts}:{itemId:string;facts:any}) {
  const {controller,state,view}=useGame();
  const [targetId,setTargetId]=useState(facts.targetId??'');
  const targets=facts.targets??[];
  const target=targets.find((entry:any)=>entry.id===targetId);
  const feedback=useActionFeedback();
  const use=async()=>{await feedback.run(()=>controller.dispatch('world.intent',{type:'use-restorative-item',itemId,targetId}));};
  return <div className="field-item-use"><ActionError message={feedback.error} onDismiss={feedback.dismiss}/>
    {facts.available?<><label>使用对象<select aria-label="恢复物品使用对象" value={targetId} onChange={event=>setTargetId(event.target.value)}>
      {!target&&<option value="">请选择同场人物</option>}
      {targets.map((entry:any)=><option key={entry.id} value={entry.id}>{entry.self?'自己':playerText(entry.name,state)} · 生命 {entry.health.当前}/{entry.health.最大} · 魂力 {entry.soulPower.当前}/{entry.soulPower.最大}</option>)}
    </select></label><p className="muted">消耗一份，为所选对象恢复。同行队友的恢复结果会保留到下一房间。</p></>:<p className="muted">{playerText(facts.reason,state)}</p>}
    <Button disabled={view.busy||!facts.available||!target} onClick={()=>void use()}>使用恢复物品</Button>
  </div>;
}
