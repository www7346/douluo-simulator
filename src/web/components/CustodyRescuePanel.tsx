import {useState} from 'react';
import {Button} from '../components';
import {useGame} from '../game-context';
import {useActionFeedback} from '../use-action-feedback';
import ActionFeedback from './ActionFeedback';
import {useSceneQuery} from '../use-game-query';
import QueryStatus from './QueryStatus';
const stages:Record<string,string>={planning:'准备与等候',travelling:'行进中',searching:'现场调查',fighting:'与看守交战',freeing:'处理牢门或拘束',paused:'已暂停','awaiting-evacuation':'等待撤离回应',evacuating:'撤离中','evacuation-paused':'撤离暂停',completed:'本次营救已结算',failed:'营救失败',abandoned:'已放弃', 'lost-trail':'等候新线索'};
function Evacuation({row,facts,act,busy}:{row:any;facts:any;act:(t:string,p:any)=>Promise<void>;busy:boolean}){
 const [destination,setDestination]=useState(row.evacuation.destinationId),e=row.evacuation,id=row.id,viewer=facts.social.viewerId;
 const destinations=facts.logistics.destinations.some((d:any)=>d.id===e.destinationId)?facts.logistics.destinations:[{id:e.destinationId,name:e.destinationName??'约定地点'},...facts.logistics.destinations];
 return <div><Button variant="secondary" disabled={busy} onClick={()=>void act('await-rescue',{rescueId:id,minutes:60})}>在现场度过一小时</Button><p>约定撤离地点：{e.destinationName??facts.logistics.destinations.find((d:any)=>d.id===e.destinationId)?.name??'约定地点'}。双方须能步行，并经受援者本人同意；伤势与财物保持现状。</p>
  {row.targetId===viewer&&['awaiting-evacuation','evacuation-paused','evacuating'].includes(row.status)&&<div className="field-actions"><Button disabled={busy||row.status==='evacuating'} onClick={()=>void act('respond-rescue-evacuation',{rescueId:id,accept:true,reason:'同意本次撤离'})}>同意同行撤离</Button><Button variant="secondary" disabled={busy} onClick={()=>void act('respond-rescue-evacuation',{rescueId:id,accept:false,reason:'自行决定后续去向'})}>拒绝或停止同行</Button></div>}
  {row.ownerId===viewer&&['awaiting-evacuation','evacuation-paused'].includes(row.status)&&<><label>撤离地点<select disabled={row.status==='evacuation-paused'} value={destination} onChange={e=>setDestination(e.target.value)}>{destinations.map((d:any)=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label><div className="field-actions"><Button disabled={busy} onClick={()=>void act('prepare-rescue-evacuation',{rescueId:id,destinationId:destination})}>提出撤离安排</Button><Button variant="secondary" disabled={busy} onClick={()=>void act('start-rescue-evacuation',{rescueId:id})}>确认同行并启程</Button></div></>}
 </div>;
}
export default function CustodyRescuePanel({facts,active=true}:{facts:any;active?:boolean}){
 const {view,controller}=useGame(),rows=facts.rescues??[],targets=new Map<string,any>();
 const routes=useSceneQuery<any>('scene.custody',{scope:'routes'},'rescue-routes',{enabled:active&&rows.some((r:any)=>r.evacuation&&r.ownerId===facts.social.viewerId&&['awaiting-evacuation','evacuation-paused'].includes(r.status))});
 const routedFacts={...facts,logistics:{...facts.logistics,destinations:routes.data?.destinations??facts.logistics?.destinations??[]}};
 const feedback=useActionFeedback(),act=async(type:string,payload:any)=>{await feedback.run(()=>controller.dispatch('world.intent',{type,...payload}));};
 for(const k of facts.social?.knowledge??[])if(k.fact.subject.status==='held'&&k.fact.subject.personId!==facts.social.viewerId&&k.fact.subject.custodianId!==facts.social.viewerId)targets.set(k.fact.subject.personId,k.fact.subject);
 return <section><h4>调查与营救</h4><p>根据已知消息前往营救。途中可能遇到看守；获胜后还需处理牢门、拘束和伤势。</p>{rows.some((r:any)=>r.evacuation&&r.ownerId===facts.social.viewerId&&['awaiting-evacuation','evacuation-paused'].includes(r.status))&&<QueryStatus query={routes}/>}
  <ActionFeedback feedback={feedback}/>
  {[...targets.values()].filter(p=>!rows.some((r:any)=>r.targetId===p.personId)).map(p=><p key={p.personId}>{p.name}<Button disabled={view.busy} onClick={()=>void act('start-person-rescue',{targetId:p.personId})}>根据已知线索营救</Button></p>)}
  {rows.map((r:any)=><article key={r.id}><h4>{r.clue.name} · {stages[r.status]??r.status}</h4><p>{r.reason}{r.paidGold>0?` · 已付旅费${r.paidGold}金魂币`:''}</p>{r.evacuation&&<Evacuation row={r} facts={routedFacts} act={act} busy={view.busy||routes.loading}/>} {r.ownerId===facts.social.viewerId&&<div className="field-actions">{['paused','lost-trail','evacuation-paused'].includes(r.status)&&<Button disabled={view.busy} onClick={()=>void act('resume-person-rescue',{rescueId:r.id})}>继续营救或撤离</Button>}{['planning','travelling','searching','freeing','evacuating'].includes(r.status)&&<Button variant="secondary" disabled={view.busy} onClick={()=>void act('pause-person-rescue',{rescueId:r.id})}>暂停</Button>}{!['completed','failed','abandoned','lost-trail'].includes(r.status)&&<Button variant="ghost" disabled={view.busy||r.status==='fighting'} onClick={()=>void act('abandon-person-rescue',{rescueId:r.id})}>放弃后续营救</Button>}</div>}</article>)}
  {!targets.size&&!rows.length&&<p className="captivity__empty">暂时没有可追寻的关押线索。</p>}
 </section>;
}
