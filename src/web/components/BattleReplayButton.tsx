import {latestReplayBattleId} from '../../shared/story-battles';
import {useEffect,useState} from 'react';
import {useGame} from '../game-context';
import {Button,Modal} from '../components';
export default function BattleReplayButton(){
 const {controller,view,state}=useGame(),battleId=latestReplayBattleId(state);
 const [available,setAvailable]=useState(false),[open,setOpen]=useState(false),[logOpen,setLogOpen]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let current=true;setAvailable(false);setOpen(false);setError('');if(battleId)void controller.canReplayBattle(battleId).then(value=>{if(current)setAvailable(value);}).catch(()=>{if(current)setError('暂时未能读取战前记录，可关闭后重试。');});return()=>{current=false;};},[controller,battleId,view.sessionId,view.snapshot.revision]);
 const report=battleId?state.扩展?.battleReports?.[battleId]:null;
 if(!battleId||!report)return null;
 return <div className="battle-result-actions">{report.status==='已结束'&&<Button variant="ghost" onClick={()=>setLogOpen(true)}>查看战报</Button>}{report.status==='已结束'&&!available&&<span className="muted" role="status">{error||'这场战斗没有可用的完整战前记录，无法手动重打。'}</span>}{available&&<Button variant="secondary" disabled={view.busy} onClick={()=>setOpen(true)}>手动重打</Button>}
 <Modal open={logOpen} title="这场交锋" onClose={()=>setLogOpen(false)}><p>{report.outcome?.outcome??'交战中'} · {report.actions.length}次行动</p><details><summary>展开行动记录</summary><div className="record-list">{report.actions.map((action:any)=><article key={action.id}><strong>第{action.round}回合</strong><p>{action.summary}</p></article>)}</div></details></Modal>
 <Modal open={open} title="重打这场战斗" onClose={()=>setOpen(false)} actions={<><Button variant="ghost" onClick={()=>setOpen(false)}>保留当前进度</Button><Button disabled={view.busy} onClick={async()=>{setError('');try{await controller.replayBattleManually(battleId);location.hash='/battle';}catch(e){setError((e as Error).message);}}}>确认回到战前</Button></>}>
 <p>回到这场遭遇已生成、尚未行动的时刻，沿用同一批敌人和能力。之后的伤势、消耗、奖励、故事和共同经历都会退回当时的记录。</p><p>当前进度会保留为读取前备份；返回后由你手动战斗。</p>{error&&<p role="alert">{error}</p>}
 </Modal></div>;
}
