import {playerCopy} from '../../runtime/player-copy';
import {useState} from 'react';
import {ActionSection,Button,Panel} from '../components';
import {useGame} from '../game-context';
import {useSceneQuery} from '../use-game-query';
import {useActionFeedback} from '../use-action-feedback';
import ActionError from './ActionError';

function durationLabel(minutes:number){
 const days=Math.floor(minutes/1440),hours=Math.floor(minutes%1440/60),rest=minutes%60;
 return [days?`${days}天`:'',hours?`${hours}小时`:'',rest?`${rest}分钟`:''].filter(Boolean).join('')||'0分钟';
}

/** Optional controls submit the same commands used by natural-language actions. */
export default function LongActionPlans({mode='all',active=true}:{mode?:'all'|'notices'|'cultivation';active?:boolean}={}){
 const {state,view,controller}=useGame(),query=useSceneQuery('scene.daily',{},state.地图.当前地点ID,{enabled:active});
 const [hours,setHours]=useState('1'),[escapeStatus,setEscapeStatus]=useState<string|null>(null);
 const feedback=useActionFeedback();
 const captivity=query.data?.captivity,practice=query.data?.cultivation,requests=query.data?.npcRequests??[];
 const escapeChoice=captivity?.choices.find((c:any)=>c.statusId===escapeStatus)??captivity?.choices[0];
 const actions=(query.data?.longActions??[]).filter((a:any)=>a.status==='interrupted');
 const notices=mode!=='cultivation',cultivation=mode!=='notices';
 if(!(notices&&(captivity||requests.length||actions.length))&&!(cultivation&&practice))return mode==='notices'?<Panel title="日常与安排"><p>{query.loading?'正在查看今天的安排…':'眼下没有待处理的委托或暂停的行程。可以自在探索，也可以安排修炼。'}</p><ActionError message={query.error??''} onDismiss={query.retry}/></Panel>:null;
 const act=(type:string,payload:any)=>feedback.run(()=>controller.dispatch(type,payload));
 const run=(type:string,actionId:string)=>act(type,{actionId});
 return <><ActionError message={feedback.error} onDismiss={feedback.dismiss}/>{notices&&captivity&&<Panel><h3>当前行动受限</h3><p>{captivity.text}</p><p>{playerCopy(captivity.meaning)}</p><label>脱困方式<select value={escapeChoice?.statusId??''} onChange={e=>setEscapeStatus(e.target.value)}>{captivity.choices.map((c:any)=><option key={c.statusId} value={c.statusId}>{c.label} · {c.attribute}{c.modifier>=0?'+':''}{c.modifier} · {c.dc?`难度${c.dc}`:'无看守阻拦'}</option>)}</select></label><Button disabled={view.busy||query.loading||!escapeChoice} onClick={()=>void act('world.escape-captivity',{statusId:escapeChoice.statusId})}>尝试脱困 · 10分钟</Button><p>也可以与身边的人交谈，争取放行。</p></Panel>}{notices&&requests.length>0&&<Panel><ActionSection title={<>收到的补给委托 · {requests.length}</>} defaultOpen>{requests.map((r:any)=><article key={r.id}><h3>{r.ownerName}需要{r.itemName}</h3><p>交付{r.quantity}份，对方支付{r.priceGold}金币。须在第{r.deadline.day}日{r.deadline.hour}时{r.deadline.minute}分动身前完成。</p><p>{r.fulfillReason||(r.items.length?'可交付随身物资，也可拒绝后继续原安排。':'还没有可交付的物资；可以自行准备，也可以拒绝。')}</p><div className="field-actions">{r.items.slice(0,1).map((i:any)=><Button key={i.id} disabled={view.busy||query.loading||!!r.fulfillReason} onClick={()=>void act('character.respond-npc-request',{requestId:r.id,action:'fulfill',itemId:i.id})}>交付{r.itemName}</Button>)}<Button variant="ghost" disabled={view.busy||query.loading||!!r.reason} onClick={()=>void act('character.respond-npc-request',{requestId:r.id,action:'decline'})}>拒绝这次委托</Button></div></article>)}</ActionSection></Panel>}{cultivation&&<Panel><ActionSection title={<>安排修炼</>} defaultOpen={mode==='cultivation'||undefined}>{practice&&<><p>{playerCopy(practice.meaning)}</p><p>当前{practice.level}级，经验{practice.experience}/{practice.requirement}；已积累零碎练习{practice.carryMinutes}分钟。</p>{practice.reason&&<p>{practice.reason}</p>}<label>修炼小时数<input type="number" min="1" max="744" step="1" value={hours} onChange={e=>setHours(e.target.value)}/></label><Button disabled={view.busy||query.loading||!practice.available||!!practice.pendingActionId||!Number.isInteger(Number(hours))||Number(hours)<1||Number(hours)>744} onClick={()=>void act('world.cultivate',{days:0,hours:Number(hours),minutes:0})}>开始修炼</Button></>}</ActionSection></Panel>}{notices&&actions.length>0&&<Panel><ActionSection title={<>尚未完成的安排 · {actions.length}</>} className="action-preview"><div className="choice-list">{actions.map((a:any)=><article key={a.id}>
  <h3>{a.kind==='travel'?`前往${a.destinationName}`:a.kind==='cultivation'?'继续修炼':'原来的等待'}</h3>
  <p>{a.kind==='cultivation'?`已修炼${durationLabel(a.minutesExecuted)}，获得${a.experienceGained}点经验；尚余${durationLabel(a.remainingMinutes)}。处理其他事情不抵扣剩余练习。`:a.kind==='travel'?`已行进${durationLabel(a.minutesExecuted)}，已付${a.paidGold}金币。上次暂停点预计还需${durationLabel(a.remainingMinutes)}、${a.remainingGold}金币；绕路后继续会重新核对。`:`原目标：第${a.targetAt.day}日${a.targetAt.hour}时${a.targetAt.minute}分。`}</p>
  {a.transit&&<p>正在途中：已走过本段{a.transit.elapsedMinutes}/{a.transit.totalMinutes}分钟。</p>}<p>{a.interruptions.at(-1)?.reason}</p>{a.resumeReason&&<p>{a.resumeReason}</p>}<div className="field-actions"><Button disabled={view.busy||query.loading||!a.canResume} onClick={()=>void run('world.resume-long-action',a.id)}>继续原安排</Button><Button variant="ghost" disabled={view.busy||query.loading} onClick={()=>void run('world.abandon-long-action',a.id)}>放弃剩余安排</Button></div>
 </article>)}</div></ActionSection></Panel>}</>;
}
