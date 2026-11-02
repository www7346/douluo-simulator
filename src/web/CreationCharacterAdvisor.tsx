import {ModelObservationDetachedError} from '../runtime/model-task';
import {creationRequest,withCreationCancellation} from './creation-request';
import ModelTaskStatus from './components/ModelTaskStatus';
import {personAgePresentation} from '../shared/person-age-presentation';
import {jsonMatchesText} from '../shared/json-identity';
import {useEffect,useRef,useState} from 'react';
import {Button,Panel,ModalActions} from './components';
import {useGame} from './game-context';
import {useServerQuery} from './use-game-query';
import {useCreationCatalog} from './creation-context';
import {creationReason,type CreationWorkspace} from '../shared/creation-draft';
import {adoptCreationAdvice,blankCreationDiscussion,rememberCreationAdvice} from '../shared/creation-discussion';
import {runCreationSoulRequests} from './creation-soul-requests';
type Props={workspace:CreationWorkspace;change:(update:(current:CreationWorkspace)=>CreationWorkspace)=>void;current:()=>CreationWorkspace;flush:()=>Promise<void>;disabled:boolean;onWorking:(v:boolean)=>void;adviceTarget?:{side:'buyer'|'captive';actorKey:string}};
const labels:Record<string,string>={name:'姓名',age:'年龄',gender:'性别',origin:'家乡',appearance:'外貌',martialSoulCount:'武魂数量'};
export function CreationCharacterAdvisor({workspace,change,current,flush,disabled,onWorking,adviceTarget}:Props){
 const {controller,view}=useGame(),catalog=useCreationCatalog(),active=useRef(false),pending=useRef<AbortController|null>(null);
 const [working,setWorking]=useState(false),[error,setError]=useState('');
 useEffect(()=>()=>{pending.current?.abort(new ModelObservationDetachedError());onWorking(false);},[]);
 const discussion=workspace.characterDiscussion??blankCreationDiscussion(),proposal=discussion.proposal;
 const stale=!!proposal&&!jsonMatchesText(workspace.config,proposal.base);
 const review=useServerQuery<any>('creation.review-advice',{config:workspace.config,proposal,reserveSouls:workspace.reserveSouls},{enabled:!!proposal&&!stale,delay:120});
 const consult=async()=>{
  if(active.current)return;const session=view.sessionId,input=discussion.request.trim();if(!input)return;
  active.current=true;const cancellation=new AbortController();pending.current=cancellation;setWorking(true);onWorking(true);setError('');
  try{
   await withCreationCancellation(flush(),cancellation.signal);if(controller.getView().sessionId!==session)return;if(cancellation.signal.aborted)throw Error('已停止构思，已保存的草稿和候选保留');
   const fresh=current(),base=JSON.stringify(fresh.config);
   const answer=await withCreationCancellation(controller.consultCreation(input,fresh.config,fresh.characterDiscussion?.exchanges??[],fresh.characterDiscussion?.proposal&&jsonMatchesText(fresh.config,fresh.characterDiscussion.proposal.base)?fresh.characterDiscussion.proposal:undefined,fresh.reserveSouls,{target:adviceTarget,signal:cancellation.signal}),cancellation.signal);const result=answer.value;
   if(controller.getView().sessionId!==session)return;if(cancellation.signal.aborted)throw Error('已停止构思，已保存的草稿和候选保留');
   if(!answer.alreadyApplied)change(value=>rememberCreationAdvice(value,base,input,result));await flush();await controller.acknowledgeCreationAdvice(answer.id);
  }catch(e){if(controller.getView().sessionId===session){if(!cancellation.signal.aborted)await controller.revealCreationAdviceRecovery();setError(creationReason((e as Error).message));}}
  finally{if(pending.current===cancellation)pending.current=null;active.current=false;setWorking(false);onWorking(false);}
 };
 const adopt=async()=>{
  if(active.current||!proposal)return;const session=view.sessionId;active.current=true;const cancellation=new AbortController();pending.current=cancellation;setWorking(true);onWorking(true);setError('');
  try{
   await withCreationCancellation(flush(),cancellation.signal);if(controller.getView().sessionId!==session)return;if(cancellation.signal.aborted)throw Error('已停止构思，已保存的草稿和候选保留');
   const checked=await creationRequest(controller,'creation.review-advice',{config:current().config,proposal,reserveSouls:current().reserveSouls},cancellation.signal);
   if(controller.getView().sessionId!==session)return;if(cancellation.signal.aborted)throw Error('已停止构思，已保存的草稿和候选保留');
   change(value=>adoptCreationAdvice(value,proposal,checked.config));await flush();if(cancellation.signal.aborted)throw Error('已停止构思，待处理输入已保存，可到武魂页继续');
   const soulRequests=proposal.patch.soulRequests??[];
   if(soulRequests.length){
    await runCreationSoulRequests(soulRequests,{current,change,flush,signal:cancellation.signal,assertCurrent:()=>{if(controller.getView().sessionId!==session)throw Error('当前故事已切换');},preview:config=>creationRequest(controller,'creation.preview',{config},cancellation.signal),consult:(...args)=>controller.consultMartialSoul(...args,{target:{index:current().config.martialSoulDrafts.findIndex((s:any)=>s.draftId===args[2]),...adviceTarget},signal:cancellation.signal})});
    change(value=>({...value,step:2,activeSoul:soulRequests[0].index}));await flush();
   }
  }catch(e){if(controller.getView().sessionId===session)setError(creationReason((e as Error).message));}
  finally{if(pending.current===cancellation)pending.current=null;active.current=false;setWorking(false);onWorking(false);}
 };
 const display=(key:string,value:any)=>String(value??'');
 const openingText=(group:string,values:any[])=>values.map(v=>group==='talentIds'?catalog.talents[v]?.name??String(v):[catalog.opportunities[v?.kind]?.name??String(v?.kind??"无效选择"),catalog.sources[v?.kind]?.[v?.sourceId]].filter(Boolean).join(' · ')).join('、')||'无';
 const rows=proposal?Object.entries(proposal.patch).flatMap(([key,value])=>key==='soulRequests'?(value as any[]).map(r=>({label:`武魂${r.index+1}的构想`,before:'尚未生成',after:r.description})):key==='opening'?Object.entries(value).map(([group,entries])=>({label:group==='talentIds'?'天赋':'机缘',before:openingText(group,workspace.config.opening[group]),after:openingText(group,entries as any[])})):key==='attributes'?Object.entries(value).map(([attribute,score])=>({label:attribute,before:workspace.config.attributes[attribute],after:score})): [{label:labels[key]??key,before:display(key,workspace.config[key]),after:display(key,value)}]):[];
 return <Panel title="与角色顾问讨论">
  <p>说说你想扮演谁，也可以让顾问调整姓名、年龄、家乡、外貌、六项素质{['custom','shrek-student','seven-treasure','clear-sky','blue-dragon'].includes(workspace.config.background.id)?'、天赋与开局机缘':''}。也可以描述自定义武魂，采用后会交给武魂顾问构思，再由你查看候选。武魂数量与六维范围由当前背景决定。</p>
  <details open={discussion.exchanges.length>0}><summary>本次讨论（{discussion.exchanges.length}/20）</summary>{discussion.exchanges.map((entry,index)=><div key={index}><p><strong>你：</strong>{entry.input}</p><p><strong>顾问：</strong>{entry.reply}</p></div>)}</details>
  <label>你的构想<textarea aria-label="角色构想" maxLength={4000} value={discussion.request} disabled={disabled||working} onChange={e=>{const request=e.target.value;change(value=>({...value,characterDiscussion:{...(value.characterDiscussion??blankCreationDiscussion()),request}}));}} placeholder="我想扮演一位二十五岁的猎魂人，名叫月织，感知敏锐，其他设定先保留。"/></label>
  <Button disabled={disabled||working||!discussion.request.trim()||discussion.exchanges.length>=20} onClick={()=>void consult()}>{working?'正在处理…':'发送构想'}</Button>
  {working&&view.modelTask&&<ModelTaskStatus task={view.modelTask} onCancel={()=>{pending.current?.abort();view.modelTask&&controller.cancelModelTask(view.modelTask.id);}}/>}
  {working&&<Button variant="ghost" onClick={()=>{pending.current?.abort();view.modelTask&&controller.cancelModelTask(view.modelTask.id);}}>停止构思</Button>}
  <Button variant="ghost" disabled={disabled||working} onClick={()=>change(value=>({...value,characterDiscussion:blankCreationDiscussion()}))}>清空讨论，保留角色草稿</Button>
  {error&&<p role="alert">{error}</p>}
  {proposal&&<section aria-label="角色候选方案"><h3>待采用的修改</h3><dl>{rows.map(row=><div key={row.label}><dt>{row.label}</dt><dd>{row.label==='年龄'?personAgePresentation({...workspace.config,age:row.before}).label:String(row.before)} → {row.label==='年龄'?personAgePresentation({...workspace.config,age:row.after}).label:String(row.after)}</dd></div>)}</dl>
   {stale?<p role="status">角色草稿已改变，请基于当前资料重新讨论。</p>:review.error?<p role="alert">{review.error}</p>:review.data?<><p>采用后剩余造化点：{review.data.preview.ledger.remaining}</p>{review.data.preview.errors.length>0&&<ul>{review.data.preview.errors.map((e:string,i:number)=><li key={i}>{e}</li>)}</ul>}<p>采用后还可以继续调整，再决定是否启程。</p></>:<p>正在检查候选方案…</p>}
   <ModalActions><Button disabled={disabled||working||stale||!review.data||!!review.error} onClick={()=>void adopt()}>{proposal.patch.soulRequests?.length?'采用并构思武魂':'采用到角色草稿'}</Button></ModalActions><Button variant="ghost" disabled={disabled||working} onClick={()=>change(value=>{const d=value.characterDiscussion??blankCreationDiscussion();return {...value,characterDiscussion:{request:d.request,exchanges:d.exchanges}};})}>放弃候选，基于当前草稿讨论</Button>
  </section>}
 </Panel>;
}
