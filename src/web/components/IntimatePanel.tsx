import {useState} from 'react';
import {Button,Panel,Progress,Modal} from '../components';
import RelicIllustration from './RelicIllustration';
import ItemDetails from './ItemDetails';
import {useGame} from '../game-context';
import {useServerQuery} from '../use-game-query';
import QueryStatus from './QueryStatus';
import {useActionFeedback} from '../use-action-feedback';
import ActionError from './ActionError';

type IntimateFacts = {
  personId:string; gold:number; urineLocked:boolean;
  physiology:{快感:number;尿意:number;敏感:number;不应期至:number|null};
  worn:{id:string;name:string;icon:string;slot:string;level:number;forced:boolean;concealment:number}[];
  catalog:{id:string;name:string;icon:string;price:number;slots:string[];maxStimLevel:number;needsKey:boolean}[];
  owned:{id:string;templateId:string;name:string}[];
  present:{id:string;name:string;self:boolean}[];
  hostForms:{id:string;name:string;slots:string[];maxLevel:number}[];
  hosts:{itemId:string;wearerId:string;wearerName:string;name:string;appearance:any;suppression:any;forms:any;actions:{action:string;label:string;available:boolean;minutes:number;reason:string}[];facts:any}[];
};

export default function IntimatePanel(){
  const {controller,view,state}=useGame(),feedback=useActionFeedback();
  const query=useServerQuery<IntimateFacts>('presentation.intimate',{});
  const facts=query.data;
  const [inspect,setInspect]=useState('');
  const [itemId,setItemId]=useState(''),[target,setTarget]=useState('');
  const run=async(payload:Record<string,unknown>)=>{const done=await feedback.run(()=>controller.dispatch('world.intent',payload));if(done)setItemId('');};
  const level=async(id:string,next:number,max:number)=>run({type:'intimate-level',itemId:id,level:Math.max(0,Math.min(max,next))});
  return <Panel className="intimate-panel" title="情具装备栏">
    <QueryStatus query={query}/><ActionError message={feedback.error} onDismiss={feedback.dismiss}/>
    {inspect&&<Modal open dismissOnBackdrop={false} title="器具详情" onClose={()=>setInspect('')}><ItemDetails item={state.物品.实例[inspect]}/></Modal>}
    {facts&&<>
      {(facts.worn.length>0||facts.physiology.快感>0||facts.physiology.尿意>0)&&<details><summary>查看身体状态</summary><Progress value={facts.physiology.快感} maximum={100} label="快感" tone="life"/><Progress value={facts.physiology.尿意} maximum={100} label={facts.urineLocked?'尿意 · 尿道锁':'尿意'} tone="soul"/>{facts.physiology.敏感>0&&<p>敏感 +{facts.physiology.敏感} 层</p>}</details>}
      <section className="intimate-worn"><h3>佩戴中 · {facts.worn.length}件</h3>
        {facts.worn.map(entry=>{const info=facts.catalog.find(v=>v.id===state.物品.实例[entry.id]?.templateId);const max=info?.maxStimLevel??0;return <div key={entry.id} className="intimate-row">
          <RelicIllustration item={state.物品.实例[entry.id]} kind="情具" name={entry.name}/><span><strong>{entry.name}</strong><small>{entry.slot}{entry.forced?' · 强制':''}</small></span>
          {max>0?<span className="intimate-level"><Button variant="ghost" disabled={entry.level<=0} onClick={()=>void level(entry.id,entry.level-1,max)}>−</Button><b>{entry.level}/{max}</b><Button variant="ghost" disabled={entry.level>=max} onClick={()=>void level(entry.id,entry.level+1,max)}>＋</Button></span>:<small>无振动档位</small>}
          <Button variant="ghost" onClick={()=>setInspect(entry.id)}>详情</Button><Button variant="secondary" disabled={view.busy} onClick={()=>void run({type:'intimate-detach',itemId:entry.id})}>解除</Button>
        </div>;})}
        {!facts.worn.length&&<p className="muted">身上没有佩戴情具。</p>}
      </section>
      <section className="intimate-owned"><h3>随身情具 · {facts.owned.length}件</h3>
        {facts.owned.length>0&&<div className="form-grid">
          <label>器具<select value={itemId} onChange={event=>setItemId(event.target.value)}><option value="">选择一件</option>{facts.owned.map(entry=>{const icon=facts.catalog.find(v=>v.id===entry.templateId)?.icon??'';return <option key={entry.id} value={entry.id}>{icon} {entry.name}</option>;})}</select></label>
          <label>佩戴者<select value={target} onChange={event=>setTarget(event.target.value)}><option value="">自己</option>{facts.present.filter(person=>!person.self).map(person=><option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
          <Button disabled={!itemId} onClick={()=>void run({type:'intimate-equip',itemId,...(target?{targetId:target,forced:true}:{})})}>{target?'强制佩戴':'佩戴'}</Button>
        </div>}
        {!facts.owned.length&&<p className="muted">行囊里没有未佩戴的情具。可前往工坊制作，或在商店购买。</p>}
      </section>
      {facts.hosts.map(host=><section key={host.itemId} className="intimate-host"><h3>{host.name}{host.wearerName?` · ${host.wearerName}`:''}</h3>
        {host.appearance&&<div className="form-grid"><label>外观<select disabled={view.busy||!host.actions.some(action=>action.action==='host.set-appearance'&&action.available)} value={host.appearance.current} onChange={event=>void run({type:'host.set-appearance',itemId:host.itemId,preset:event.target.value})}>{host.appearance.presets.map((preset:string)=><option key={preset} value={preset}>{preset}</option>)}</select></label></div>}
        {host.suppression&&<div className="form-grid"><label>禁魔（{host.suppression.percent}%）<select disabled={view.busy||!host.actions.some(action=>action.action==='host.set-suppression'&&action.available)} value={host.suppression.percent} onChange={event=>void run({type:'host.set-suppression',itemId:host.itemId,percent:Number(event.target.value)})}>{Array.from({length:101},(_,percent)=><option key={percent} value={percent}>{percent}%</option>)}</select></label></div>}
        {host.actions.filter(action=>!action.available).map(action=><p className="muted" key={action.action}>{action.label}：{action.reason}</p>)}
        {host.forms&&<fieldset disabled={view.busy||!host.actions.some(action=>action.action==='host.set-form'&&action.available)} className="intimate-host__forms">{['口腔','眼部','颈部','下体前','阴蒂','后庭','尿道'].map(slot=>{const current=host.forms.slots?.[slot],options=(facts.hostForms??[]).filter(form=>form.slots.includes(slot));return <div key={slot} className="intimate-row"><span><strong>{slot}</strong></span>
          <select value={current?.form??''} onChange={event=>void run({type:'host.set-form',itemId:host.itemId,slot,formId:event.target.value,level:0})}><option value="">不拟态</option>{options.map(form=><option key={form.id} value={form.id}>{form.name}</option>)}</select>
          {current&&options.find(form=>form.id===current.form)?.maxLevel?<span className="intimate-level"><Button variant="ghost" onClick={()=>void run({type:'host.set-form',itemId:host.itemId,slot,formId:current.form,level:Math.max(0,current.level-1)})}>−</Button><b>{current.level}</b><Button variant="ghost" onClick={()=>void run({type:'host.set-form',itemId:host.itemId,slot,formId:current.form,level:current.level+1})}>＋</Button></span>:null}
        </div>;})}</fieldset>}
        {host.actions.some(action=>action.action==='host.release'&&action.available)&&<Button variant="secondary" onClick={()=>void run({type:'detach-restraint',itemId:host.itemId})}>解除{host.name}</Button>}
      </section>)}
    </>}
  </Panel>;
}
