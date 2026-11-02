import {useState} from 'react';
import {ActionSection,Button} from '../components';
import {useGame} from '../game-context';
import {useSceneQuery,useServerQuery} from '../use-game-query';
import {useActionFeedback} from '../use-action-feedback';
import ActionFeedback from './ActionFeedback';
import QuerySurface from './QuerySurface';
import RelicIllustration from './RelicIllustration';
import ItemDetails from './ItemDetails';
import RestraintEditor from './RestraintEditor';

function BreakRestraintAction({statusId,disabled,onAttempt,active=true,method='physical'}:{statusId:string;disabled:boolean;onAttempt:()=>void;active?:boolean;method?:'physical'|'soul'}){
 const query=useServerQuery<any>('world.preview',{type:'break-restraint',statusId,method},{enabled:active,delay:120});
 const available=query.data?.type==='break-restraint'&&query.data?.statusId===statusId&&query.data?.available!==false;
 const reason=query.error||query.data?.reason||(!query.loading&&query.data&&!available?'暂时无法挣脱这道束缚。':'');
 return <div><Button variant="secondary" disabled={disabled||query.loading||Boolean(query.error)||!available} onClick={onAttempt}>{method==='soul'?'魂力对抗':'物理挣脱'} · {query.data?.minutes??10}分钟{query.data?.soulPowerCost?` · 魂力${query.data.soulPowerCost}`:''}</Button>{reason&&<p role="status">{reason}</p>}</div>;
}

export function RestraintActions({device,active=true}:{device:any;active?:boolean}){
 const {view,controller}=useGame(),feedback=useActionFeedback(),[mode,setMode]=useState(device.modes.find((m:string)=>m!==device.mode)??device.mode),[minutes,setMinutes]=useState('0');
 const intent={type:'set-restraint-mode',itemId:device.itemId,mode,...(device.autoRelock&&mode!=='locked'&&Number(minutes)>0?{relockAfterMinutes:Number(minutes)}:{})},query=useServerQuery<any>('world.preview',intent,{enabled:active&&device.canControl&&!device.battleId&&!device.supportsFineLimits,delay:120});
 return <div className="worn-restraints__actions"><ActionFeedback feedback={feedback}/>
  {device.battleId?<a className="text-link" href="#/battle">前往战斗行动栏</a>:<>
   {device.timer&&<p>已安排定时复锁，世界第{Math.floor(device.timer.dueAt/1440)}日 {Math.floor(device.timer.dueAt%1440/60)}:{String(device.timer.dueAt%60).padStart(2,'0')}执行。</p>}
   {device.canControl&&<div className="field-actions">{device.modes.filter((m:string)=>m!==device.mode&&['locked','released','escort'].includes(m)).map((m:string)=><Button key={m} variant="secondary" disabled={view.busy} onClick={()=>void feedback.run(()=>controller.dispatch('world.intent',{type:'set-restraint-mode',itemId:device.itemId,mode:m}))}>{m==='released'?'暂时解放':m==='escort'?'押送模式':'重新锁定'}</Button>)}</div>}
   {device.canControl&&(device.supportsFineLimits?<RestraintEditor active={active} device={device}/>:<ActionSection title={<>更多调节</>}><label>调节模式<select aria-label={`调节${device.name}模式`} value={mode} onChange={e=>setMode(e.target.value)}>{device.details.modes.map((m:any)=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>{device.autoRelock&&mode!=='locked'&&<label>定时复锁（分钟，0为不设置）<input type="number" min="0" max="1440" value={minutes} onChange={e=>setMinutes(e.target.value)}/></label>}<Button disabled={view.busy||query.loading||!query.data?.available} onClick={()=>void feedback.run(()=>controller.dispatch('world.intent',intent))}>确认调节 · 1分钟</Button>{(query.error||query.data?.reason)&&<p role="status">{query.error??query.data.reason}</p>}</ActionSection>)}
   {device.canDetach&&<Button variant="ghost" disabled={view.busy} onClick={()=>void feedback.run(()=>controller.dispatch('world.intent',{type:'detach-restraint',itemId:device.itemId}))}>{device.broken?'拆除损坏的器具':'拆除器具'}</Button>}
   {device.effects.filter((e:any)=>e.canBreak).flatMap((e:any)=>(['physical','soul'] as const).map(method=><BreakRestraintAction key={e.statusId+method} method={method} active={active} statusId={e.statusId} disabled={view.busy} onAttempt={()=>void feedback.run(()=>controller.dispatch('world.intent',{type:'break-restraint',statusId:e.statusId,method}))}/>))}
   {!device.canDetach&&<p className="muted">{device.detachReason}</p>}
  </>}
 </div>;
}
export default function WornRestraints({devices,active=true}:{devices:any[];active?:boolean}){
 const {state}=useGame(),[selected,setSelected]=useState<string|null>(null);
 if(!devices.length)return null;
 return <section className="worn-restraints" aria-label="佩戴的拘束器"><header><h2>拘束器</h2><span>{devices.length}件佩戴中</span></header>
  {devices.map(device=><article key={device.itemId} className="worn-restraints__item"><button className="worn-restraints__summary" aria-expanded={selected===device.itemId} onClick={()=>setSelected(selected===device.itemId?null:device.itemId)}>
   <RelicIllustration item={state.物品.实例[device.itemId]} kind="拘束器" name={device.name}/><span><b>{device.name}</b><small>{device.part} · {device.modeLabel}{device.broken?' · 已损坏':device.expired?' · 已失效':''}</small><small>{device.effects.length?device.effects.map((e:any)=>e.lines[0]??e.name).join('；'):'未施加限制'}</small></span><span aria-hidden="true">{selected===device.itemId?'−':'＋'}</span>
  </button>{selected===device.itemId&&<div className="worn-restraints__detail"><ItemDetails item={state.物品.实例[device.itemId]} wearing/>{device.effects.map((e:any)=><p key={e.statusId}>{e.lines.join('；')}{e.dc!==null&&`；挣脱难度 ${e.dc}`}</p>)}<RestraintActions key={device.itemId} active={active} device={device}/></div>}</article>)}
 </section>;
}
export function PersonWornRestraints({personId,active=true}:{personId:string;active?:boolean}){
 const query=useSceneQuery<any[]>('presentation.worn-restraints',{personId},personId,{enabled:active});
 return <QuerySurface query={query}>{query.data&&<WornRestraints active={active} devices={query.data}/>}</QuerySurface>;
}
