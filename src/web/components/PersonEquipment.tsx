import {useState} from 'react';
import {Button} from '../components';
import {useGame} from '../game-context';
import {useServerQuery} from '../use-game-query';
import {useActionFeedback} from '../use-action-feedback';
import QueryStatus from './QueryStatus';
import ActionFeedback from './ActionFeedback';
import ItemDetails from './ItemDetails';
import RelicIllustration from './RelicIllustration';
import {RestraintActions} from './WornRestraints';
import './person-equipment.css';

export default function PersonEquipment({personId}:{personId:string}){
 const {controller,view,state}=useGame(),query=useServerQuery<any>('presentation.person-equipment',{personId}),feedback=useActionFeedback(),[selected,setSelected]=useState(''),[itemId,setItemId]=useState('');
 const data=query.data,choice=data?.available.find((item:any)=>item.itemId===itemId);
 return <section className="person-equipment" aria-label="人物装备与器具"><QueryStatus query={query}/><ActionFeedback feedback={feedback}/>{data&&!data.hidden&&<>
  <header><h3>当前佩戴</h3><span>{data.worn.length} 件</span></header>
  {!data.worn.length&&<p className="muted">当前没有佩戴装备或器具。</p>}
  {data.worn.map((entry:any)=><article className="person-equipment__item" key={entry.itemId}><Button variant="ghost" className="person-equipment__summary" aria-expanded={selected===entry.itemId} onClick={()=>setSelected(selected===entry.itemId?'':entry.itemId)}><RelicIllustration item={state.物品.实例[entry.itemId]} kind={entry.kind} name={entry.name}/><span><strong>{entry.name}</strong><small>{[entry.part,entry.modeLabel,entry.permanent?'魂环绑定':''].filter(Boolean).join(' · ')}</small></span><span>{selected===entry.itemId?'收起':'详情'}</span></Button>
   {selected===entry.itemId&&<div className="person-equipment__detail"><ItemDetails item={state.物品.实例[entry.itemId]} wearing/>
    {!entry.managed&&entry.restraint?<RestraintActions device={entry.restraint}/>:entry.remove?<><Button variant="secondary" disabled={view.busy||!entry.remove.available} onClick={()=>void feedback.run(()=>controller.dispatch('world.intent',entry.remove.intent))}>卸下{entry.remove.cost?` · 魂力${entry.remove.cost}`:''}</Button>{entry.remove.reason&&<p role="status">{entry.remove.reason}</p>}</>:entry.permanent?<p className="muted">与魂环席位绑定。</p>:null}
   </div>}
  </article>)}
  <section className="person-equipment__available"><h3>随身可用装备</h3>{data.available.length?<><label>选择物品<select aria-label="为此人选择装备" value={itemId} disabled={view.busy} onChange={e=>setItemId(e.target.value)}><option value="">选择行囊中的物品</option>{data.available.map((item:any)=><option key={item.itemId} value={item.itemId}>{item.name}</option>)}</select></label>{choice&&<><ItemDetails item={state.物品.实例[choice.itemId]} catalog/>{choice.reason&&<p role="status">{choice.reason}</p>}<Button disabled={view.busy||query.loading||!choice.available} onClick={()=>void feedback.run(()=>controller.dispatch('world.intent',choice.intent)).then(ok=>{if(ok)setItemId('');})}>装备给此人</Button></>}</>:<p className="muted">行囊中暂无可在此装配的装备。</p>}</section>
 </>}{data?.hidden&&<p className="muted">当前无法查看这位人物的装备。</p>}</section>;
}
