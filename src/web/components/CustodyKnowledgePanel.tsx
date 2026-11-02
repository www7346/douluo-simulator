import {useState} from 'react';
import {ActionSection,Button} from '../components';
import {useGame} from '../game-context';
import WorldSpeechPanel from './WorldSpeechPanel';
import {useActionFeedback} from '../use-action-feedback';
import ActionFeedback from './ActionFeedback';
import {useSceneQuery} from '../use-game-query';
import QueryStatus from './QueryStatus';

export default function CustodyKnowledgePanel({facts,active=true}:{facts:any;active?:boolean}){
 const {view,controller}=useGame(),[recipient,setRecipient]=useState(''),[destination,setDestination]=useState('');
 const [open,setOpen]=useState(false),feedback=useActionFeedback(),routes=useSceneQuery<any>('scene.custody',{scope:'routes'},'news-routes',{enabled:active&&open});
 const social=facts.social;if(!social)return null;
 const send=(type:string,payload:any)=>feedback.run(()=>controller.dispatch('world.intent',{type,...payload}));
 const seen=new Map<string,any>();for(const row of social.knowledge){const prior=seen.get(row.fact.subject.personId);if(!prior||prior.fact.occurredAt<=row.fact.occurredAt)seen.set(row.fact.subject.personId,row);}
 const time=(at:number)=>`第${Math.floor(at/1440)}天 ${Math.floor(at%1440/60)}:${String(at%60).padStart(2,'0')}`;
 return <ActionSection title={<>已知消息与转告</>} onOpenChange={setOpen}><ActionFeedback feedback={feedback}/><p>这里保留获知时的情况。离开视线后，目标可能已经移动或获释。</p><QueryStatus query={routes}/>
  <label>收信人<select value={recipient} onChange={e=>setRecipient(e.target.value)}><option value="">选择人物</option>{social.recipients.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
  <label>寄信地址<select value={destination} onChange={e=>setDestination(e.target.value)}><option value="">选择公开地点</option>{(routes.data?.destinations??facts.logistics?.destinations??[]).map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
  {[...seen.values()].map((k:any)=><article key={k.fact.id}><strong>{k.fact.subject.name}</strong><p>{k.fact.subject.status==='unconfirmed'?(k.fact.subject.visibleCondition==='restrained'?'看见佩戴束具，其他情况未确认':'未看见束具，关押历史未确认'):k.fact.subject.status==='held'?'当时被囚禁':k.fact.subject.status==='dead'?'当时已死亡':'当时已不再被关押'} · 事件发生于{time(k.fact.occurredAt)}，本人获知于{time(k.observation.learnedAt)}</p><p>最后已知位置：{k.fact.subject.position.kind==='transit'?'道路途中':facts.logistics?.destinations.find((d:any)=>d.id===k.fact.subject.position.locationId)?.name??'已记录地点'}{k.fact.subject.position.sceneId&&k.fact.subject.position.kind==='location'?'的独立房间':''}</p><div className="field-actions"><Button variant="secondary" disabled={view.busy||!social.nearby.some((p:any)=>p.id===recipient)} onClick={()=>void send('tell-custody-news',{targetId:recipient,factIds:[k.fact.id]})}>当面转告</Button><Button variant="ghost" disabled={view.busy||!recipient||!destination} onClick={()=>void send('send-custody-letter',{targetId:recipient,factIds:[k.fact.id],destinationId:destination})}>寄送此消息</Button></div></article>)}
  {social.nearby.map((p:any)=><Button key={p.id} variant="ghost" disabled={view.busy} onClick={()=>void send('observe-custody-person',{targetId:p.id})}>观察{p.name}的现状</Button>)}
  {social.messages.map((m:any)=><p key={m.id}>{m.senderId===social.viewerId?'发出':'收到'}的{m.channel==='letter'?'信件':'口信'} · {time(m.sentAt)} · {m.status==='sent'?'已寄出，尚未确认送达':'已收到'}</p>)}
  {social.pendingRelations.filter((r:any)=>r.personId===social.viewerId).map((r:any)=><p key={r.id}>有人提出确认双方关系。<Button disabled={view.busy} onClick={()=>void send('respond-person-relation',{relationId:r.id,accept:true,reason:'同意这项关系'})}>同意</Button><Button variant="ghost" disabled={view.busy} onClick={()=>void send('respond-person-relation',{relationId:r.id,accept:false,reason:'拒绝这项关系'})}>拒绝</Button></p>)}
 </ActionSection>;
}
