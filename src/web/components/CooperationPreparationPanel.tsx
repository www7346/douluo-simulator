import {useState} from 'react';
import {ActionSection,Button} from '../components';
import {useGame} from '../game-context';
import {useActionFeedback} from '../use-action-feedback';
import ActionFeedback from './ActionFeedback';
import PowerLimitFields from './PowerLimitFields';


const modes:Record<string,string>={released:'佩戴中解放',escort:'押送模式',detached:'完全拆除',locked:'锁定',limited:'受限活动'};
function PreparationForm({option,operate,busy}:{option:any;operate:(type:string,p:any)=>Promise<void>;busy:boolean}){
 const [selected,setSelected]=useState<Record<string,{mode:string;returnMode:string;minutes:string;limits:any}>>({});
 const operations=option.devices.filter((d:any)=>selected[d.itemId]).map((d:any)=>{const v=selected[d.itemId];return {itemId:d.itemId,mode:v.mode,returnMode:v.returnMode,...(d.supportsFineLimits&&v.mode==='limited'?{limits:v.limits}:{}),...(d.supportsFineLimits&&v.returnMode==='limited'?{returnLimits:d.limits??v.limits}:{}),...(d.autoRelock&&v.mode!=='detached'&&Number(v.minutes)>0?{relockAfterMinutes:Number(v.minutes)}:{})};});
 return <ActionSection title={<>为{option.memberName}准备出战</>}><p>分别选择要调整的器具；未调整的限制仍会保留。若彻底拆除，战后重新佩戴还需对方配合，或具备控制、压制条件。</p>{option.reason&&<p>{option.reason}</p>}
  {option.devices.map((d:any)=>{const v=selected[d.itemId],change=(patch:any)=>setSelected({...selected,[d.itemId]:{...v,...patch}});return <fieldset key={d.itemId}><legend>{d.name} · {modes[d.mode]}</legend>
   <label><input type="checkbox" checked={!!v} disabled={busy||!d.canControl} onChange={e=>{if(e.target.checked)setSelected({...selected,[d.itemId]:{mode:d.mode==='released'?'detached':'released',returnMode:d.mode==='limited'?'limited':'locked',minutes:'0',limits:d.supportsFineLimits?(d.limits??d.choices.presets.find((p:any)=>p.id==='restricted').limits):null}});else{const next={...selected};delete next[d.itemId];setSelected(next);}}}/>本次操作</label>{d.reason&&<p>{d.reason}</p>}
   {v&&<><label>战前<select value={v.mode} onChange={e=>change({mode:e.target.value})}>{[...d.modes.filter((m:string)=>m!=='locked'&&m!==d.mode),'detached'].map((m:string)=><option key={m} value={m}>{modes[m]}</option>)}</select></label>
   {d.supportsFineLimits&&v.mode==='limited'&&<PowerLimitFields limits={v.limits} choices={d.choices} supportsDamage={d.supportsDamage} disabled={busy} onChange={limits=>change({limits})}/>}
   <label>战后尝试重新设置为<select value={v.returnMode} onChange={e=>change({returnMode:e.target.value})}>{d.modes.filter((m:string)=>['locked','escort','limited'].includes(m)).map((m:string)=><option key={m} value={m}>{modes[m]}</option>)}</select></label>
   {d.autoRelock&&v.mode!=='detached'&&<label>佩戴中定时复锁（分钟，0为不设置）<input type="number" min="0" max="1440" value={v.minutes} onChange={e=>change({minutes:e.target.value})}/></label>}</>}
  </fieldset>;})}
  {!option.devices.length&&<p>当前没有可调整的佩戴器具。</p>}
  <Button disabled={busy||!!option.reason||!operations.length} onClick={()=>void operate('prepare-cooperation-battle',{cooperationId:option.cooperationId,deviceOperations:operations})}>执行所选战前操作</Button>
 </ActionSection>;
}
export default function CooperationPreparationPanel({facts}:{facts:any}){
 const {view,controller}=useGame(),[reason,setReason]=useState('');
 const feedback=useActionFeedback();
 const operate=async(type:string,p:any)=>{await feedback.run(()=>controller.dispatch('world.intent',{type,...p}));};
 if(!facts.preparations?.length&&!facts.preparationOptions?.length)return null;
 const stages:Record<string,string>={prepared:'准备完成',fighting:'正在参战','recovery-pending':'等待收束',closed:'已收尾'};
 return <section><h3>出战准备与战后收束</h3><ActionFeedback feedback={feedback}/>{(facts.preparationOptions??[]).map((o:any)=><PreparationForm key={o.cooperationId} option={o} operate={operate} busy={view.busy}/>)}
  {(facts.preparations??[]).map((p:any)=><article key={p.id}><h4>{p.memberName} · {stages[p.status]}</h4>{p.operations.map((o:any)=><p key={o.itemId}>{o.itemName}：{modes[o.mode]}；战后目标为{modes[o.returnMode]}</p>)}
   {p.attempts.map((a:any,i:number)=><p key={i}>{p.operations.find((o:any)=>o.itemId===a.itemId)?.itemName??a.itemId}：{a.status==='failed'?`未能完成，${a.reason}`:a.status==='already-restored'?'确认已恢复':'已恢复'}</p>)}
   {p.closeReason&&<p>{p.closeReason}</p>}{p.canRecover&&<><Button disabled={view.busy} onClick={()=>void operate('recover-cooperation-restraints',{preparationId:p.id})}>尝试恢复战后配置</Button><label>结束这次安排的理由（选填）<input value={reason} maxLength={600} onChange={e=>setReason(e.target.value)}/></label><Button variant="ghost" disabled={view.busy} onClick={()=>void operate('close-cooperation-preparation',{preparationId:p.id,reason})}>结束安排，保留器具当前状态</Button></>}
  </article>)}
 </section>;
}
