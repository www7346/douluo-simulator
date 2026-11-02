import {useState} from 'react';
import {ActionSection,Button,Panel} from '../components';
import {useGame} from '../game-context';
import {useActionFeedback} from '../use-action-feedback';
import ActionFeedback from './ActionFeedback';
import {useServerQuery} from '../use-game-query';
import RelicIllustration from './RelicIllustration';

function SealAction({request,label,onRun,enabled=true,variant='primary',selectReason=''}:{request:any;label:string;onRun:(request:any)=>unknown;enabled?:boolean;variant?:'primary'|'secondary'|'ghost';selectReason?:string}){
 const {view}=useGame(),query=useServerQuery<any>('world.preview',request,{enabled,delay:120});
 const reason=enabled?(query.error??query.data?.reason):selectReason;
 return <div className="sealing-action"><Button variant={variant} disabled={view.busy||!enabled||query.loading||!query.data?.available} onClick={()=>void onRun(request)}>{label}</Button>{reason&&<p className="muted" role="status">{reason}</p>}</div>;
}

function SealControlTransfer({device,targets,active=true}:{device:any;targets:any[];active?:boolean}){
 const {view,controller}=useGame(),feedback=useActionFeedback(),[targetId,setTargetId]=useState(''),[open,setOpen]=useState(false);
 const request={type:'transfer-seal-control',itemId:device.itemId,targetId},query=useServerQuery<any>('world.preview',request,{enabled:active&&open&&!!targetId,delay:120});
 return <ActionSection title={<>转交封神台操控权限</>} onOpenChange={setOpen}><ActionFeedback feedback={feedback}/><label>接管者<select aria-label="封神台接管者" value={targetId} onChange={e=>setTargetId(e.target.value)}><option value="">选择在场人物</option>{targets.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>{(query.error||query.data?.reason)&&<p role="status">{query.error??query.data.reason}</p>}<Button disabled={view.busy||query.loading||!query.data?.available} onClick={()=>void feedback.run(()=>controller.dispatch('world.intent',request))}>确认转交</Button></ActionSection>;
}

export function SealingSelfActions({self,targets=[],active=true,onClose}:{self:any;targets?:any[];active?:boolean;onClose?:()=>void}){
 const {view,controller}=useGame(),feedback=useActionFeedback(),[personId,setPersonId]=useState('');
 const awake=self.mode==='awake',selected=targets.find(p=>p.id===personId)??targets[0];
 const send=(payload:any)=>feedback.run(()=>controller.dispatch('world.intent',payload));
 return <section className="captivity__task"><h4>{awake?'封罩内':'等待封神台开启'}</h4>
  <p>{awake?'封罩仍然关闭，台内的时间照常流逝。':'身体与伤势停留在封存时刻，等待封神台开启。'}{self.releaseAt===null?'未设自动开罩时间。':'将在约定时间自动开罩。'}</p>
  <ActionFeedback feedback={feedback}/>
  {awake&&<>
   <p>{self.canObserve?'可以观察封罩外的动静。':'眼下的视线受到限制。'}{self.canSpeak?'可以隔罩说话。':'当前无法开口。'}</p>
   <SealAction enabled={active} variant="secondary" request={{type:'strike-seal-device',itemId:self.itemId}} label="从内部尝试挣脱" onRun={send}/>
   {targets.length>0&&<div className="field-actions"><label>封罩外的人<select aria-label="封罩外交谈对象" value={selected?.id??''} onChange={e=>setPersonId(e.target.value)}>{targets.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><Button variant="secondary" disabled={!active||view.busy||!self.canSpeak||!selected} onClick={async()=>{if(await feedback.run(()=>controller.openStoryConversation(selected.id,'')))onClose?.();}}>与对方交谈</Button></div>}
  </>}
  <SealAction enabled={active} variant="ghost" request={{type:'await-seal-release',minutes:60}} label={awake?'等待一小时':'等待外部世界一小时'} onRun={send}/>
 </section>;
}

export default function SealingPanel({facts,active=true,onClose}:{facts:any;active?:boolean;onClose?:()=>void}){
 const {view,controller,state}=useGame(),feedback=useActionFeedback(),[targetId,setTargetId]=useState(''),[minutes,setMinutes]=useState(60),[deviceId,setDeviceId]=useState(''),[advanced,setAdvanced]=useState(false),[mode,setMode]=useState('awake'),[permissionMode,setPermissionMode]=useState('awake');
 if(!facts||!facts.self&&!facts.devices.length)return null;
 const send=(payload:any)=>feedback.run(()=>controller.dispatch('world.intent',payload));
 return <Panel title="封神台"><p>每座封神台容纳一人。闭罩囚禁时仍可保持清醒；静滞封存会让身体与伤势停留在入台时刻。</p>
  <ActionFeedback feedback={feedback}/>
  {!facts.self&&facts.devices.length>0&&<label>查看封神台<select aria-label="查看封神台" value={facts.devices.some((d:any)=>d.itemId===deviceId)?deviceId:facts.devices[0].itemId} onChange={e=>{setDeviceId(e.target.value);setTargetId('');}}>{facts.devices.map((d:any)=><option key={d.itemId} value={d.itemId}>{d.name}</option>)}</select></label>}
  {facts.self&&<SealingSelfActions self={facts.self} targets={facts.conversationTargets} active={active} onClose={onClose}/>}
  {!facts.self&&facts.devices.filter((d:any)=>d.itemId===(facts.devices.some((v:any)=>v.itemId===deviceId)?deviceId:facts.devices[0]?.itemId)).map((d:any)=><article key={d.itemId}><div className="captivity__artifact"><RelicIllustration kind="器具" item={state.物品.实例[d.itemId]} name={d.name}/><div><h4>{d.name}</h4><span className="captivity__state">{d.sealed?(d.sealed.known===false?'封罩关闭':d.sealed.mode==='awake'?'闭罩清醒':'静滞封存'):'空置'}</span><p>耐久 {d.durability}/60</p></div></div>{d.sealed?<><p>{d.sealed.known?`${d.sealed.name} · ${d.sealed.level}级 · 占用魂力${d.sealed.lock} · ${d.sealed.voluntary?'自愿入台':'强制收容'}`:'封罩内有一人，身份尚不清楚。'}</p><div className="field-actions">{d.sealed.mode!=='awake'&&<SealAction enabled={active} variant="secondary" request={{type:'awaken-seal',itemId:d.itemId}} label="唤醒 · 保持闭罩" onRun={send}/>}<SealAction enabled={active} request={{type:'open-seal',itemId:d.itemId}} label="打开封罩" onRun={send}/>{d.sealed.mode==='awake'&&facts.conversationTargets?.some((p:any)=>p.id===d.sealed.targetId)&&<Button variant="secondary" disabled={!active||view.busy} onClick={async()=>{if(await feedback.run(()=>controller.openStoryConversation(d.sealed.targetId,'')))onClose?.();}}>隔罩交谈</Button>}</div></>:d.canControl&&d.carried&&<div><label>入台对象<select aria-label="封入对象" value={targetId} onChange={e=>setTargetId(e.target.value)}><option value="">选择在场人物</option>{facts.targets.map((p:any)=><option key={p.id} value={p.id}>{p.name} · {p.level}级</option>)}</select></label><label>入台后<select aria-label="封神台收容方式" value={mode} onChange={e=>setMode(e.target.value)}><option value="awake">闭罩清醒囚禁</option><option value="stasis">静滞封存</option></select></label><SealAction enabled={active&&!!targetId} selectReason="先选择要入台的人物。" request={{type:'seal-person',itemId:d.itemId,targetId,mode,...((()=>{const p=facts.permissions.find((p:any)=>p.itemId===d.itemId&&p.targetId===targetId&&p.status==='granted'&&(p.mode??'stasis')===mode);return p?{permissionId:p.id}:{};})())}} label={mode==='awake'?'闭罩囚禁':'静滞封存'} onRun={send}/></div>}
   <ActionSection title={<>授权与器具操作</>} onOpenChange={setAdvanced}><p>台体占用目标魂力：10＋等级÷5（向上取整）。强制收容前，须先制住对方；自愿入台需本人许可。</p>
   {!d.canControl&&d.carriedByOther&&<div><label>同意的入台方式<select aria-label="封神台许可方式" value={permissionMode} onChange={e=>setPermissionMode(e.target.value)}><option value="awake">保持清醒，封罩关闭</option><option value="stasis">静滞封存，个人时间暂停</option></select></label><label>进入后多久自动开罩（分钟）<input aria-label="自动开封分钟" type="number" min={1} max={525600} value={minutes} onChange={e=>setMinutes(Number(e.target.value))}/></label><SealAction enabled={active&&advanced} request={{type:'permit-seal',itemId:d.itemId,operatorId:d.carriedByOther,releaseAfterMinutes:minutes,mode:permissionMode}} label="同意这次入台" onRun={send}/>{permissionMode==='stasis'&&<p>静滞期间无法呼救，请先商定开罩时间。</p>}</div>}
   {!d.carried&&<SealAction enabled={active&&advanced} variant="secondary" request={{type:'seize-seal-device',itemId:d.itemId}} label="在现场夺取器体" onRun={send}/>}
   <SealAction enabled={active&&advanced} variant="ghost" request={{type:'strike-seal-device',itemId:d.itemId}} label="定向打击器体" onRun={send}/>
   {d.canControl&&<SealControlTransfer active={active&&advanced} key={d.itemId} device={d} targets={facts.targets}/>}
   </ActionSection>
  </article>)}{facts.permissions.filter((p:any)=>p.status==='granted'&&p.canRevoke).map((p:any)=><SealAction enabled={active} key={p.id} variant="ghost" request={{type:'revoke-seal-permission',permissionId:p.id}} label="撤回封存许可" onRun={send}/>)}
 </Panel>;
}
