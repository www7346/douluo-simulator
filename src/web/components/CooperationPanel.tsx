import {useState} from 'react';
import {ActionSection,Button} from '../components';
import {useGame} from '../game-context';
import {cooperationBases as bases} from '../cooperation-presentation';
import {useActionFeedback} from '../use-action-feedback';
import ActionFeedback from './ActionFeedback';

export default function CooperationPanel({facts,targetId,hideProposal=false}:{facts:any;targetId?:string;hideProposal?:boolean}){
 const {view,controller}=useGame(),[target,setTarget]=useState(''),[basis,setBasis]=useState('voluntary'),[membership,setMembership]=useState('temporary'),[duration,setDuration]=useState('1440'),[combat,setCombat]=useState(false),[reason,setReason]=useState('');
 const feedback=useActionFeedback();
 const selectedTarget=targetId??target;
 if(!facts)return null;
 const viewer=facts.logistics.viewerId,rows=facts.cooperations??[];
 const operate=async(type:string,payload:any)=>{await feedback.run(()=>controller.dispatch('world.intent',{type,...payload}));};
 const respond=async(id:string)=>{await feedback.run(()=>controller.respondCooperation(id));};
 const statuses:Record<string,string>={proposed:'待本人回应',active:'合作中',suspended:'已暂停',ended:'已结束',rejected:'未接受'};
 return <section><h3>合作与同行</h3><p>队伍连同领队最多四人。确认同行与参战后即可出发，战利品返程后在窗口直接分配；出发前请检查同伴的拘束状态。</p>
  <ActionFeedback feedback={feedback}/>
  {!hideProposal&&<ActionSection title={<>提出合作</>}>{!targetId&&<label>对方<select value={target} onChange={e=>setTarget(e.target.value)}><option value="">选择在场人物</option>{facts.social.nearby.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
   <label>合作方式<select value={basis} onChange={e=>setBasis(e.target.value)}>{Object.entries(bases).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
   <label>期限<select value={membership} onChange={e=>setMembership(e.target.value)}><option value="temporary">本次临时合作</option><option value="long-term">长期同行</option></select></label>
   {membership==='temporary'&&<label>有效分钟数<input type="number" min="1" max="43200" value={duration} onChange={e=>setDuration(e.target.value)}/></label>}
   <label><input type="checkbox" checked={combat} onChange={e=>setCombat(e.target.checked)}/>包含参战</label>
   {!facts.social.nearby.some((p:any)=>p.id===selectedTarget)&&<p className="muted">请与对方同场后再提出合作。</p>}<Button disabled={view.busy||!selectedTarget||!facts.social.nearby.some((p:any)=>p.id===selectedTarget)} onClick={()=>void operate(basis==='controlled'?'impose-person-cooperation':'propose-person-cooperation',{targetId:selectedTarget,...(basis!=='controlled'?{basis}:{}),membership,allowTravel:true,allowCombat:combat,durationMinutes:Number(duration)})}>{basis==='controlled'?'下达合作安排':'提出，等待对方回应'}</Button>
  </ActionSection>}
  {rows.length>0&&<label>回应或结束合作的理由（选填）<input value={reason} maxLength={600} onChange={e=>setReason(e.target.value)} placeholder="说明自己的决定"/></label>}
  {!rows.length&&<p className="muted">目前没有待回应或进行中的合作。</p>}{rows.map((r:any)=><ActionSection title={<>{r.leaderName}与{r.memberName} · {statuses[r.status]}</>} key={r.id} defaultOpen={["proposed","active","suspended"].includes(r.status)}><p>{bases[r.basis]} · {r.membership==='temporary'?'临时':'长期'} · {r.allowTravel?'允许同行':'未许可同行'} · {r.allowCombat?'允许参战':'未许可参战'}{r.expiresAt!==null?` · 世界第${Math.floor(r.expiresAt/1440)}天 ${Math.floor(r.expiresAt%1440/60)}:${String(r.expiresAt%60).padStart(2,'0')}到期`:''}</p>{r.response&&<p>{r.memberName}：{r.response.reason||(r.response.accept?'已接受本次约定范围':'未接受本次提议')}</p>}{r.reason&&<p>{r.reason}</p>}
   <div className="field-actions">{r.canRespond&&[true,false].map(accept=><Button key={String(accept)} disabled={view.busy} onClick={()=>void operate('respond-person-cooperation',{cooperationId:r.id,accept,reason:reason.trim()||(accept?'我同意这次合作。':'我不接受这次合作。')})}>{accept?'同意合作':'拒绝提议'}</Button>)}
    {r.canAwaitNpc&&<Button disabled={view.busy} onClick={()=>void respond(r.id)}>听取{r.memberName}的回应</Button>}
    {r.status==='suspended'&&r.leaderId===viewer&&<Button disabled={view.busy} onClick={()=>void operate('resume-person-cooperation',{cooperationId:r.id})}>重新提出合作</Button>}
    {['proposed','active','suspended'].includes(r.status)&&<Button variant="ghost" disabled={view.busy} onClick={()=>void operate('end-person-cooperation',{cooperationId:r.id,reason})}>结束这项合作</Button>}
   </div></ActionSection>)}
 </section>;
}
