import {useState} from 'react';
import {Button,Modal,Progress} from '../components';
import {useGame} from '../game-context';
import {useServerQuery} from '../use-game-query';
import {useActionFeedback} from '../use-action-feedback';
import QueryStatus from './QueryStatus';
import ActionFeedback from './ActionFeedback';
import CharacterPortrait from './CharacterPortrait';
import SummonOrders from './SummonOrders';
import './party-panel.css';
export default function PartyPanel({onPerson}:{onPerson:(id:string)=>void}){
 const {state,view,controller}=useGame(),[open,setOpen]=useState(false),feedback=useActionFeedback();
 const query=useServerQuery<any[]>('presentation.party',{}, {enabled:open}),members=query.data??[];
 return <><Button variant="secondary" onClick={()=>setOpen(true)}>队伍</Button><Modal open={open} title="我的队伍" className="party-status-dialog" onClose={()=>setOpen(false)}>
  <p>查看同伴的状态、培养与魂环。城镇和副本入口可以全队休整；森林内的火堆可为存活队员恢复三成生命与魂力。</p>
  <QueryStatus query={query}/><ActionFeedback feedback={feedback}/><Button disabled={view.busy||!members.some(p=>p.canRecover)} onClick={()=>void feedback.run(()=>controller.dispatch('party.recover',{}))}>全队休整</Button>
  <div className="party-status-grid">{members.map(p=><article key={p.personId}>
   <button className="party-status-identity" onClick={()=>{setOpen(false);onPerson(p.personId);}}><span><CharacterPortrait state={state} figureUrl={view.figureUrl} person={state.人物.列表[p.personId]}/></span><div><strong>{p.name}</strong><small>{p.level??'未知'}级 · {p.membership==='self'?'你':p.membership==='projection'?'投影 · 不占队友名额':p.membership==='long-term'?'长期队友':'临时队友'}</small><small>{p.rings.map((s:any)=>`${s.name} · ${s.count}环`).join('；')}</small></div></button>
   {p.health?<><Progress label="生命" value={p.health.当前} maximum={p.health.最大} tone="life"/><Progress label={p.sharedSoulPower?'画主魂力（共用）':'魂力'} value={p.soulPower.当前} maximum={p.soulPower.最大} tone="soul"/>{p.experience&&<Progress label="经验" value={p.experience.current} maximum={p.experience.maximum} tone="gold"/>}</>:<p>不在场，无法查看即时状态。</p>}
   <div className="party-status-actions"><Button variant="secondary" onClick={()=>{setOpen(false);onPerson(p.personId);}}>查看状态</Button><Button disabled={view.busy||!p.canRecover} onClick={()=>void feedback.run(()=>controller.dispatch('party.recover',{personId:p.personId}))}>休整恢复</Button></div>{p.recoveryReason&&<p className="muted">{p.recoveryReason}</p>}
  </article>)}</div>{open&&<SummonOrders/>}
 </Modal></>;
}
