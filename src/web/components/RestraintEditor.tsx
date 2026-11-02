import {useState} from 'react';
import {ActionSection,Button} from '../components';
import {useGame} from '../game-context';
import {useServerQuery} from '../use-game-query';
import {useActionFeedback} from '../use-action-feedback';
import ActionFeedback from './ActionFeedback';
import PowerLimitFields,{PowerLimitSummary,RESTRAINT_MODE_LABELS} from './PowerLimitFields';

export default function RestraintEditor({device,active=true}:{device:any;active?:boolean}){
 const {view,controller}=useGame(),feedback=useActionFeedback();
 const [open,setOpen]=useState(false);
 const [mode,setMode]=useState('limited'),[limits,setLimits]=useState<any>(device.limits??device.choices.presets.find((p:any)=>p.id==='restricted').limits),[minutes,setMinutes]=useState('0');
 const intent={type:'set-restraint-mode',itemId:device.itemId,mode,...(mode==='limited'?{limits}:{}),...(device.autoRelock&&mode!=='locked'&&Number(minutes)>0?{relockAfterMinutes:Number(minutes)}:{})};
 const query=useServerQuery<any>('world.preview',intent,{enabled:active&&open&&device.canControl,delay:120});
 return <ActionSection title={<>调节完整配置</>} onOpenChange={setOpen}><ActionFeedback feedback={feedback}/><label>器具模式<select aria-label="器具模式" value={mode} disabled={view.busy} onChange={e=>setMode(e.target.value)}>{device.modes.map((m:string)=><option key={m} value={m}>{RESTRAINT_MODE_LABELS[m]}</option>)}</select></label>
  {mode==='limited'&&<PowerLimitFields limits={limits} choices={device.choices} supportsDamage={device.supportsDamage} disabled={view.busy} onChange={setLimits}/>}
  {device.autoRelock&&mode!=='locked'&&<label>定时恢复（分钟，0为不设置）<input aria-label="定时恢复分钟" type="number" min="0" max="1440" step="1" value={minutes} onChange={e=>setMinutes(e.target.value)}/></label>}
  {query.data?.receipt?.power&&<><p>调节后预览：</p><PowerLimitSummary power={query.data.receipt.power}/></>}
  {query.data?.receipt?.summary&&<p>{query.data.receipt.summary}</p>}
  {(query.error||query.data?.reason)&&<p role="status">{query.error??query.data.reason}</p>}
  <Button disabled={view.busy||query.loading||!query.data?.available} onClick={()=>void feedback.run(()=>controller.dispatch('world.intent',intent))}>确认调节 · 1分钟</Button>
 </ActionSection>;
}
