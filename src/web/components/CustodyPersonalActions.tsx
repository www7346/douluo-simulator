import {useState} from 'react';
import QuantityPicker from './QuantityPicker';
import {useGame} from '../game-context';
import {useServerQuery} from '../use-game-query';
import {useActionFeedback} from '../use-action-feedback';
import {ActionSection,Button} from '../components';
import QueryStatus from './QueryStatus';
import ActionFeedback from './ActionFeedback';

export function SelfCustodyConsent({kind,active=true}:{kind:'duties'|'restraints';active?:boolean}){
 const {view,controller}=useGame(),[open,setOpen]=useState(false),[selected,setSelected]=useState(''),[mode,setMode]=useState('guard'),feedback=useActionFeedback();
 const query=useServerQuery<any>('custody.self-permissions',{}, {enabled:active&&open}),choices=query.data?.[kind]??[],choice=choices.find((c:any)=>(kind==='duties'?c.targetId:c.itemId)===selected)??choices[0];
 const quote=kind==='duties'?choice?.modes.find((m:any)=>m.id===mode):choice;
 return <ActionSection title={<>{kind==='duties'?'本人同意看守或护送':'同意佩戴拘束器'}</>} onOpenChange={setOpen}>{open&&<><QueryStatus query={query}/><ActionFeedback feedback={feedback}/>{choice?<>
  <label>{kind==='duties'?'为谁承担职责':'由谁为我佩戴哪件拘束器'}<select value={kind==='duties'?choice.targetId:choice.itemId} disabled={view.busy} onChange={e=>setSelected(e.target.value)}>{choices.map((c:any)=><option key={kind==='duties'?c.targetId:c.itemId} value={kind==='duties'?c.targetId:c.itemId}>{kind==='duties'?c.name:`${c.operatorName} · ${c.name}`}</option>)}</select></label>
  {kind==='duties'&&<label>配合职责<select value={mode} onChange={e=>setMode(e.target.value)}><option value="guard">看守</option><option value="escort">护送</option></select></label>}
  <p>允许对方在15分钟内安排这一次{kind==='duties'?(mode==='guard'?'看守':'护送'):'装配'}。</p>{quote?.reason&&<p role="status">{quote.reason}</p>}
  <Button disabled={view.busy||query.loading||!quote?.available} onClick={()=>void feedback.run(()=>controller.dispatch('world.intent',{type:kind==='duties'?'permit-custody-duty':'permit-restraint',targetId:choice.targetId,...(kind==='duties'?{mode}:{itemId:choice.itemId})}))}>同意这一次{kind==='duties'?(mode==='guard'?'看守':'护送'):'装配'}</Button>
  </>:!query.loading&&<p>{kind==='duties'?'眼下没有同场可商议职责的人。':'先由对方提出具体器具的装配请求，即可在这里查看。'}</p>}</>}</ActionSection>;
}
export function CaptiveSearch({targetId,active=true}:{targetId:string;active?:boolean}){
 const {view,controller}=useGame(),[open,setOpen]=useState(false),[itemId,setItemId]=useState(''),[quantity,setQuantity]=useState('1'),feedback=useActionFeedback();
 const options=useServerQuery<any>('custody.search-options',{targetId},{enabled:active&&open}),intent={type:'search-captive',targetId,...(itemId?{itemId}:{}),quantity:Number(quantity)},quote=useServerQuery<any>('world.preview',intent,{enabled:active&&open&&!!options.data,delay:120});
 return <ActionSection title={<>搜取随身财物</>} onOpenChange={setOpen}>{open&&<><QueryStatus query={options}/><ActionFeedback feedback={feedback}/><label>搜取内容<select value={itemId} onChange={e=>{setItemId(e.target.value);setQuantity('1');}}><option value="">钱币 · 可搜取{options.data?.coins.maximum??0}金</option>{options.data?.items.map((i:any)=><option key={i.itemId} value={i.itemId}>{i.name} · {i.maxQuantity}件</option>)}</select></label><p>数量</p><QuantityPicker label="搜取数量" min={1} max={itemId?options.data?.items.find((item:any)=>item.itemId===itemId)?.maxQuantity??0:options.data?.coins.maximum??0} value={Number(quantity)} disabled={view.busy||options.loading} onChange={value=>setQuantity(String(value))} onMaximum={async()=>itemId?options.data?.items.find((item:any)=>item.itemId===itemId)?.maxQuantity??0:options.data?.coins.maximum??0}/>{(options.data?.reason||quote.error||quote.data?.reason)&&<p role="status">{options.data?.reason||quote.error||quote.data?.reason}</p>}<Button disabled={view.busy||quote.loading||!quote.data?.available} onClick={()=>void feedback.run(()=>controller.dispatch('world.intent',intent))}>确认搜取</Button></>}</ActionSection>;
}
