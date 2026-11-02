import {playerDescription} from '../runtime/player-copy';
import {ModelObservationDetachedError} from '../runtime/model-task';
import ModelTaskStatus from './components/ModelTaskStatus';
import {creationRequest,withCreationCancellation} from './creation-request';
import {jsonMatchesText} from '../shared/json-identity';
import {useEffect,useRef,useState} from 'react';
import {useGame} from './game-context';
import {useServerQuery} from './use-game-query';
import {Button,ModalActions} from './components';
import {blankItemDiscussion,rememberItemAdvice,adoptItemAdvice} from '../shared/creation-item-discussion';
import {creationReason,type CreationWorkspace} from '../shared/creation-draft';

export default function CreationItemAdvisor({workspace,change,current,flush,disabled,onWorking,onSettings}:{workspace:CreationWorkspace;change:(update:any)=>void;current:()=>CreationWorkspace;flush:()=>Promise<void>;disabled:boolean;onWorking:(v:boolean)=>void;onSettings:()=>void}){
 const {controller,view}=useGame(),active=useRef(false),pending=useRef<AbortController|null>(null),[working,setWorking]=useState(false),[error,setError]=useState('');
 useEffect(()=>()=>{pending.current?.abort(new ModelObservationDetachedError());},[controller]);
 const discussion=workspace.itemDiscussion??blankItemDiscussion(),proposal=discussion.proposal,stale=!!proposal&&!jsonMatchesText(workspace.config,proposal.base);
 const review=useServerQuery<any>('creation.review-item-advice',{config:workspace.config,proposal},{enabled:!!proposal&&!stale,delay:120});
 const consult=async()=>{
  if(active.current||!discussion.request.trim())return;
  const session=view.sessionId,input=discussion.request.trim(),cancel=new AbortController();pending.current=cancel;active.current=true;setWorking(true);onWorking(true);setError('');
  try{
   await withCreationCancellation(flush(),cancel.signal);if(cancel.signal.aborted||controller.getView().sessionId!==session)return;
   const fresh=current(),base=JSON.stringify(fresh.config),previous=fresh.itemDiscussion;
   const answer=await controller.consultCreationItems(input,fresh.config,previous?.exchanges,previous?.proposal&&jsonMatchesText(fresh.config,previous.proposal.base)?previous.proposal:undefined,{signal:cancel.signal});const result=answer.value;
   if(cancel.signal.aborted||controller.getView().sessionId!==session)return;
   if(!answer.alreadyApplied)change((v:CreationWorkspace)=>rememberItemAdvice(v,base,input,result));await flush();await controller.acknowledgeCreationAdvice(answer.id);
  }catch(e){if(controller.getView().sessionId===session&&!cancel.signal.aborted){await controller.revealCreationAdviceRecovery();setError(creationReason((e as Error).message));}}
  finally{active.current=false;pending.current=null;setWorking(false);onWorking(false);}
 };
 const adopt=async()=>{
  if(active.current||!proposal)return;
  const session=view.sessionId,cancel=new AbortController();pending.current=cancel;active.current=true;setWorking(true);onWorking(true);setError('');
  try{await withCreationCancellation(flush(),cancel.signal);if(cancel.signal.aborted||controller.getView().sessionId!==session)return;const checked=await creationRequest(controller,'creation.review-item-advice',{config:current().config,proposal},cancel.signal);if(cancel.signal.aborted||controller.getView().sessionId!==session)return;change((v:CreationWorkspace)=>adoptItemAdvice(v,proposal,checked));await flush();controller.notify('已采用这套器具设计','success');}
  catch(e){if(controller.getView().sessionId===session&&!cancel.signal.aborted)setError(creationReason((e as Error).message));}
  finally{active.current=false;pending.current=null;setWorking(false);onWorking(false);}
 };
 return <section className="creation-item-host" aria-label="道具主持人">
  <h3>把你的想法交给主持人</h3><p>说说器具的模样与想要的限制。主持人会提出完整设计，你看过后再决定是否采用。</p>
  {!view.modelEnabled&&<div className="creation-quick-notice"><p>预设已可直接使用。连接创作顾问后可对话设计，也可以切到“手工调整”。</p><Button variant="secondary" onClick={onSettings}>设置创作顾问</Button></div>}
  {discussion.exchanges.length>0&&<details><summary>此前的讨论 · {discussion.exchanges.length}轮</summary>{discussion.exchanges.map((e,i)=><div key={i}><p><b>你：</b>{e.input}</p><p><b>主持人：</b>{playerDescription(e.reply)}</p></div>)}</details>}
  {discussion.exchanges.length>0&&<blockquote data-testid="creation-item-host-reply">{discussion.exchanges[discussion.exchanges.length-1].reply}</blockquote>}
  <label>道具构想<textarea data-testid="creation-item-host-request" disabled={disabled||working} maxLength={4000} value={discussion.request} placeholder="例如：一副暗银色的腕铐，把双手固定在身后，束缚两层；造型精巧，保留说话能力。" onChange={e=>{const request=e.target.value;change((v:CreationWorkspace)=>({...v,itemDiscussion:{...(v.itemDiscussion??blankItemDiscussion()),request}}));}}/></label>
  <div className="creation-item-host-actions"><Button data-testid="creation-item-host-send" disabled={disabled||working||!view.modelEnabled||!discussion.request.trim()||discussion.exchanges.length>=20} onClick={()=>void consult()}>{working?(view.modelTask?'AI 请求处理中…':'正在核对并保存…'):'请 AI 主持人设计'}</Button>{working&&<Button variant="ghost" onClick={()=>{pending.current?.abort();view.modelTask&&controller.cancelModelTask(view.modelTask.id);}}>停止构思</Button>}</div>
  {working&&view.modelTask&&<ModelTaskStatus task={view.modelTask} onCancel={()=>{pending.current?.abort();view.modelTask&&controller.cancelModelTask(view.modelTask.id);}}/>}
  {error&&<p role="alert">{error}。你的输入与现有设计已保留。</p>}
  {proposal&&<section className="creation-item-proposal" aria-label="道具候选方案"><h3>主持人的设计</h3><p>{playerDescription(proposal.reply)}</p>{proposal.items.map((item:any,i:number)=>{const actual=review.data?.quote.items.find((v:any)=>v.index===i);return <article key={i}><h4>{item.name}</h4><p>{playerDescription(item.description)}</p><p className="muted">{playerDescription(item.appearance)}</p><small>{actual?.modes.find((m:any)=>m.id===item.mode)?.name??'设计尚待核对'} · {item.binding?`${actual?(actual.activeBinding?'采用后拘束：':'仅锁定时：'):'设计结构：'}${item.binding.pose}${item.binding.part} · ${item.binding.layers}层 · 挣脱加值${item.binding.difficultyBonus}`:''}{item.limits?` · 魂力${item.limits.soulPowerPercent}%${item.limits.damagePercent!==undefined?` · 伤害${item.limits.damagePercent}%`:''} · 最高${item.limits.permission?.maxCastRank??9}环` :''}</small></article>;})}{stale?<p role="status">角色草稿已经改变，请基于当前设定重新讨论。</p>:review.error?<p role="alert">{review.error}</p>:review.data?<><p>器具额度：{review.data.quote.total} / {review.data.quote.maximum}金</p>{review.data.quote.errors.map((e:string,i:number)=><p role="alert" key={i}>{e}</p>)}</>:<p role="status">正在核对设计…</p>}<ModalActions><Button data-testid="creation-item-host-adopt" disabled={disabled||working||stale||!review.data||!review.data.quote.pass||!!review.error} onClick={()=>void adopt()}>采用这套设计</Button></ModalActions><Button variant="ghost" disabled={disabled||working} onClick={()=>change((v:CreationWorkspace)=>({...v,itemDiscussion:{request:v.itemDiscussion?.request??'',exchanges:v.itemDiscussion?.exchanges??[]}}))}>放弃候选</Button></section>}
  <Button variant="ghost" disabled={disabled||working} onClick={()=>change((v:CreationWorkspace)=>({...v,itemDiscussion:blankItemDiscussion()}))}>清空讨论，保留器具</Button>
 </section>;
}
