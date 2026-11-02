import BattleReplayButton from './BattleReplayButton';
import StoryChat from './StoryChat';
import {useEffect,useState} from 'react';
import {useGame} from '../game-context';
import {Button,Modal} from '../components';
import {describeError} from '../error-text';
import type {JourneyRecoveryChoice} from '../../runtime/journey-recovery';
import BattleLog from './BattleLog';

export default function JourneyRecovery({onOpenSaves,onRecovered}:{onOpenSaves:()=>void;onRecovered:()=>void}) {
  const {controller,view,state}=useGame();
  const [logOpen,setLogOpen]=useState(false);
  const [choices,setChoices]=useState<JourneyRecoveryChoice[]|null>(null),[selected,setSelected]=useState<JourneyRecoveryChoice|null>(null),[error,setError]=useState('');
  useEffect(()=>{
    let alive=true;
    void controller.listJourneyRecovery().then(rows=>{if(alive)setChoices(rows)}).catch(reason=>{if(alive){setError(describeError(reason));setChoices([])}});
    return()=>{alive=false};
  },[controller,view.profileId,view.sessionId]);
  const recover=async()=>{
    if(!selected)return;
    try {
      if(selected.kind==='backup')await controller.restoreBackup(selected.id);else await controller.loadSlot(selected.id);
      onRecovered();
    }catch(reason){setError(describeError(reason));setSelected(null)}
  };
  return <section className="journey-recovery" aria-labelledby="journey-recovery-title">
    <div className="journey-recovery__sigil" aria-hidden="true">✦</div>
    <small>故事未尽 · 旅程回望</small><h1 id="journey-recovery-title">这一程，暂告落幕</h1>
    <p>当前魂师已无法继续行动。你可以读取此前保存的进度，重新选择接下来的路。</p>
    {state.战斗?.id&&<Button variant="secondary" onClick={()=>setLogOpen(true)}>查看战斗记录</Button>}
    <BattleReplayButton/>
    {state.扩展?.story&&<StoryChat allowInput={false}/>}
    {logOpen&&<BattleLog events={view.events} state={state} onClose={()=>setLogOpen(false)}/>}
    {error&&<p role="alert">{error}</p>}
    {choices===null?<p role="status">正在寻找已保存的旅程…</p>:choices.length?<div className="journey-recovery__choices">{choices.map(choice=><article key={choice.id}>
      <div><small>{choice.recommended?'建议从这里继续':'其他旅程节点'}</small><h2>{choice.label}</h2><p>{choice.location} · {choice.level} 级 · {new Date(choice.updatedAt).toLocaleString('zh-CN')}</p></div>
      <Button variant={choice.recommended?'primary':'secondary'} disabled={view.busy} onClick={()=>setSelected(choice)}>读取这段旅程</Button>
    </article>)}</div>:<p>此档案尚未找到可以继续的节点。可以在存档页导入以前导出的存档，或开启另一位魂师的旅程。</p>}
    <Button variant="ghost" onClick={onOpenSaves}>查看存档与其他魂师</Button>
    <Modal open={Boolean(selected)} title="回到这段旅程" onClose={()=>setSelected(null)} actions={<><Button variant="ghost" onClick={()=>setSelected(null)}>返回</Button><Button disabled={view.busy} onClick={()=>void recover()}>确认读取并继续</Button></>}>
      <p>将回到“{selected?.label}”。此节点之后获得的经验、物品和探索进度都会回退，生命与魂力恢复到当时的数值。</p><p>当前记录会先保留为读取前备份。</p>
    </Modal>
  </section>;
}
