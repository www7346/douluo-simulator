import {Button,Panel} from '../components';
import {useGame} from '../game-context';
import {useServerQuery} from '../use-game-query';
import {useActionFeedback} from '../use-action-feedback';
import ActionFeedback from './ActionFeedback';
import QuerySurface from './QuerySurface';
import {DEVICE_OPERATION_LABELS,deviceLockLabel} from '../../shared/device-operation-display';

export default function DeviceOperationsPanel(){
 const {state,view,controller}=useGame(),query=useServerQuery<any>('presentation.device-operations',{}),feedback=useActionFeedback();
 const inBattle=state.战斗?.状态==='进行中';
 return <Panel title="锁具与器体操作"><ActionFeedback feedback={feedback}/><QuerySurface query={query}>{query.data&&<>
  {query.data.items.length===0&&<p>当前没有可操作的已声明锁具或规则器体。</p>}
  {query.data.items.map((item:any)=><article key={item.itemId}><h3>{item.name}</h3>{item.locks.length?item.locks.map((lock:any)=><p key={lock.lockId}>{deviceLockLabel(item.locks,lock.lockId)} · {lock.expired?'已到期':!lock.locked?'已打开':lock.suppressedUntil?'锁效暂时受抑制':'已闭合'}</p>):<p>特殊规则保护</p>}
   <div className="field-actions">{item.operations.filter((op:any)=>op.available).map((op:any,i:number)=><Button key={i} variant="secondary" disabled={view.busy||inBattle} onClick={()=>{const {actorId,...intent}=op.intent;void feedback.run(()=>controller.dispatch('world.intent',intent));}}>{DEVICE_OPERATION_LABELS[op.type]} · {deviceLockLabel(item.locks,op.lockId)}{op.method==='key'?' · 匹配钥匙':op.skillId?` · ${state.技能?.列表?.[op.skillId]?.name??'实际能力'}`:''} · {op.minutes}分钟{op.soulPowerCost?` · 魂力${op.soulPowerCost}`:''}</Button>)}</div>
   {item.operations.every((op:any)=>!op.available)&&<p role="status">{[...new Set(item.operations.map((op:any)=>op.reason).filter(Boolean))].join('；')}</p>}
  </article>)}{inBattle&&<a className="text-link" href="#/battle">前往战斗行动栏使用实际能力</a>}
 </>}</QuerySurface></Panel>;
}
