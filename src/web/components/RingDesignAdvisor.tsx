import {playerDescription} from '../../runtime/player-copy';
import {useEffect,useRef,useState} from 'react';
import {useGame} from '../game-context';
import {sendMessageOnEnter} from '../message-enter';
import {useServerQuery} from '../use-game-query';
import {Button} from '../components';
import AbilityDetails from './AbilityDetails';
import QueryStatus from './QueryStatus';
import {blankRingDiscussion,ringDiscussionKey,ringAdviceTarget,checkpointRingDiscussion,restoreRingDiscussion,type RingDesignDiscussion} from '../../shared/ring-design-discussion';
import {editableRingProposal} from '../../shared/ring-design-editing';
import {EffectCatalogue} from './EffectCatalogue';
import RingManualEditor from './RingManualEditor';
import {jsonEqual} from '../../shared/json-identity';
import {ringDesignFeedback,ringDesignRequestText,ringDesignContinuationRequest,recheckedRingDesignAnswer,unlockRingDesignAnswer} from '../../shared/ring-design-feedback';

export function RingDesignFeedback({value,requestText='',onEditMartialSoul,disabled=false}:{value:any;requestText?:string;onEditMartialSoul?:()=>void;disabled?:boolean}){
 const feedback=ringDesignFeedback(value),[copyState,setCopyState]=useState<'copied'|'manual'|''>('');
 return <section className="ring-design-feedback" aria-label="魂技设计核验结果" data-status={feedback.status} style={{minWidth:0,overflowWrap:'anywhere'}}>
  <p role="status"><strong>{feedback.title}</strong></p>
  {feedback.rows.length>0&&feedback.status==='ready'&&feedback.message&&<p>{feedback.message}</p>}
  {feedback.rows.length>0?<ul>{feedback.rows.map((row:any,i:number)=><li key={i}><strong>{row.label}{row.effectName?` · ${row.effectName}`:''}</strong><p>{row.message}</p>{row.channels.length>0&&<p>所需武魂能力方向：{row.channels.join('、')}</p>}{row.attributes.length>0&&<p>{row.attributeLabel}：{row.attributes.join('、')}</p>}</li>)}</ul>:feedback.message?<p>{feedback.message}</p>:feedback.legacyReasons.length>0?<ul>{feedback.legacyReasons.map((reason:string,i:number)=><li key={i}>{reason}</li>)}</ul>:null}
  {feedback.needsMartialSoul&&<><p>由你决定是否补充武魂能力；当前构想与讨论会保留。补充后仍需按新设定重新核验。</p>{onEditMartialSoul&&<Button data-testid="ring-design-edit-martial-soul" variant="secondary" disabled={disabled} onClick={onEditMartialSoul}>前往补充武魂能力</Button>}</>}
  {feedback.contactAuthor&&<><p>这个版本暂时无法制作上述未实现的效果，可以联系作者增加；是否修改构想由你决定。</p><Button data-testid="ring-design-copy-request" variant="secondary" disabled={disabled||!requestText} onClick={()=>{void (async()=>{try{if(!navigator.clipboard?.writeText)throw Error('clipboard');await navigator.clipboard.writeText(requestText);setCopyState('copied');}catch{setCopyState('manual');}})();}}>复制原构想</Button>{copyState==='copied'&&<p role="status">构想已复制，可自行反馈作者。</p>}{copyState==='manual'&&<label>当前浏览器未能自动复制，可在这里选取原构想<textarea readOnly value={requestText} onFocus={e=>e.currentTarget.select()}/></label>}</>}
 </section>;
}

/** Keep adoption feedback beside its button even after a long ability preview. */
export function RingDesignAdoptionAction({working=false,error='',disabled=false,onAdopt}:{working?:boolean;error?:string;disabled?:boolean;onAdopt:()=>void}){
 return <div className="ring-design-adoption">
  <Button data-testid="ring-design-adopt" disabled={disabled||working} onClick={onAdopt}>{working?'正在采用这套魂技…':'采用这套魂技'}</Button>
  {working&&<p role="status">正在核验并采用，原方案会保留。</p>}
  {error&&<p role="alert" data-testid="ring-design-adoption-error">未能采用：{error}</p>}
 </div>;
}

export default function RingDesignAdvisor({target,onAdopt,disabled=false,onEditMartialSoul,onUnlockSource}:{target:any;onAdopt:(plan:any)=>Promise<void>|void;disabled?:boolean;onEditMartialSoul?:()=>Promise<void>|void;onUnlockSource?:()=>Promise<any>}){
 const {controller,view}=useGame(),[discussion,setDiscussion]=useState<RingDesignDiscussion>(blankRingDiscussion),[loading,setLoading]=useState(true),[working,setWorking]=useState(false),[error,setError]=useState(''),[adoption,setAdoption]=useState<{id:string;error?:string}|null>(null);
 const abort=useRef<AbortController|null>(null),save=useRef(Promise.resolve()),alive=useRef(true),draft=useRef(discussion),latestTarget=useRef(target);latestTarget.current=target;
 const [manualOpen,setManualOpen]=useState(true);
 const identity=ringDiscussionKey(view.profileId??view.sessionId,target),opening=target.kind==='opening',basis=ringAdviceTarget(target);
 const catalogue=useServerQuery<any>(opening?'creation.ring-design-catalogue':'ring.design-catalogue',opening?{config:basis.config,side:target.side,ordinal:target.ordinal}:{target});
 useEffect(()=>{let active=true;alive.current=true;setLoading(true);setError('');setAdoption(null);void controller.ringDesignDiscussion(target).then(value=>{if(active){draft.current=value;setDiscussion(value);setLoading(false);}},e=>{if(active){setError(e.message);setLoading(false);}});return()=>{active=false;alive.current=false;abort.current?.abort();};},[identity,controller]);
 useEffect(()=>{if(working||view.busy||!discussion.pending||view.resultRecovery)return;let active=true;void controller.ringDesignDiscussion(target).then(value=>{if(active&&!value.pending){draft.current=value;setDiscussion(value);}},e=>{if(active)setError(e.message);});return()=>{active=false;};},[identity,working,view.busy,Boolean(discussion.pending),view.resultRecovery,controller]);
 const remember=(value:RingDesignDiscussion)=>{const source=structuredClone(target),worldId=controller.runtime.slotId,previous=draft.current;draft.current=value;setDiscussion(value);save.current=save.current.catch(()=>{}).then(async()=>{const saved=await controller.saveRingDesignDiscussion(source,value,worldId,previous);if(alive.current&&draft.current===value&&controller.runtime.slotId===worldId){draft.current=saved;setDiscussion(saved);}});void save.current.catch(e=>{if(alive.current)setError(e.message);});};
 const startManual=(proposal?:any)=>{setManualOpen(true);if(!proposal&&draft.current.manual)return;remember(checkpointRingDiscussion(draft.current,{...draft.current,manual:editableRingProposal(catalogue.data,proposal??draft.current.answer?.proposals?.[0]?.proposal??draft.current.lastProposals?.[0]?.proposal)}));};
 const previewManual=async()=>{
  if(working||draft.current.pending||!draft.current.manual)return;
  const source=structuredClone(target),worldId=controller.runtime.slotId,sessionId=view.sessionId,previous=draft.current;setWorking(true);setError('');setAdoption(null);
  try{await save.current;const review=await controller.query(opening?'creation.ring-design-review':'ring.design-review',opening?{config:source.config,side:source.side,ordinal:source.ordinal,proposal:previous.manual}:{target:source,proposal:previous.manual});
   if(!alive.current||controller.runtime.slotId!==worldId||controller.getView().sessionId!==sessionId||!jsonEqual(source,latestTarget.current))throw Error('人物或魂环设定已改变，请按当前设定重新预览');
   const next=checkpointRingDiscussion({...previous,manual:undefined},{...previous,lastProposals:[review],answer:{mode:'proposal',reply:'已按手动设置预览，请查看实际效果、范围和消耗。',proposals:[review],summary:review.summary,diagnostics:review.diagnostics},answerTarget:ringAdviceTarget(source)});
   const saved=await controller.saveRingDesignDiscussion(source,next,worldId,previous);if(alive.current&&controller.runtime.slotId===worldId&&jsonEqual(source,latestTarget.current)){draft.current=saved;setDiscussion(saved);setManualOpen(false);}
  }catch(e){if(alive.current)setError((e as Error).message);}finally{if(alive.current)setWorking(false);}
 };
 const consult=async(restart=false)=>{
  if(abort.current||working)return;const source=structuredClone(target),worldId=controller.runtime.slotId,cancel=new AbortController();abort.current=cancel;setWorking(true);setError('');setAdoption(null);
  try{await save.current;const stored=await controller.ringDesignDiscussion(source);if(!alive.current||controller.runtime.slotId!==worldId)throw Error('当前故事已经切换');if(draft.current.pending&&!stored.pending&&stored.answer){draft.current=stored;setDiscussion(stored);return;}const value=await controller.consultRingDesign(source,{signal:cancel.signal,restart});if(alive.current&&controller.runtime.slotId===worldId&&ringDiscussionKey(worldId,source)===ringDiscussionKey(worldId,latestTarget.current)){draft.current=value;setDiscussion(value);}}
  catch(e){if(alive.current&&controller.runtime.slotId===worldId){setError((e as Error).message);try{const value=await controller.ringDesignDiscussion(source);if(alive.current&&controller.runtime.slotId===worldId&&ringDiscussionKey(worldId,source)===ringDiscussionKey(worldId,latestTarget.current)){draft.current=value;setDiscussion(value);}}catch(readError){if(alive.current)setError((readError as Error).message);}}}
  finally{if(alive.current)setWorking(false);abort.current=null;}
 };
 const adopt=async(plan:any)=>{
  if(working)return;
  const proposal=plan.proposal,source=structuredClone(target),worldId=controller.runtime.slotId,sessionId=view.sessionId;setWorking(true);setError('');setAdoption({id:plan.id});
  try{const review=await controller.query(opening?'creation.ring-design-review':'ring.design-review',opening?{config:source.config,side:source.side,ordinal:source.ordinal,proposal}:{target:source,proposal});
   if(!alive.current||controller.runtime.slotId!==worldId||controller.getView().sessionId!==sessionId)throw Error('当前故事已切换或设计页已关闭');
   if(!jsonEqual(source,latestTarget.current))throw Error('人物或魂环设定已改变，请按当前设定继续讨论');
   if(!ringDesignFeedback(review).canAdopt)throw Error(review.summary?.message??review.reasons?.join('；')??'本次设计尚未通过实际核验');await onAdopt(review);
  }catch(e){if(alive.current&&controller.runtime.slotId===worldId&&controller.getView().sessionId===sessionId&&jsonEqual(source,latestTarget.current))setAdoption({id:plan.id,error:(e as Error).message});}finally{if(alive.current)setWorking(false);}
 };
 const editMartialSoul=async()=>{
  if(!onEditMartialSoul||working)return;
  const source=structuredClone(target),worldId=controller.runtime.slotId;setWorking(true);setError('');
  try{await save.current;if(!alive.current||controller.runtime.slotId!==worldId||!jsonEqual(source,latestTarget.current))throw Error('当前人物或魂环已改变，请按现有设定继续');await onEditMartialSoul();}
  catch(e){if(alive.current)setError((e as Error).message);}finally{if(alive.current)setWorking(false);}
 };
 const recheckOriginal=async()=>{
  if(working||!draft.current.answer?.proposals?.length)return;
  const source=structuredClone(target),worldId=controller.runtime.slotId,sessionId=view.sessionId,previous=draft.current,original=previous.answer;setWorking(true);setError('');
  try{await save.current;const reviews=[];for(const plan of original.proposals){if(!plan.proposal)throw Error('原提案缺少正式定义，请保留构想后继续设计');reviews.push(await controller.query(opening?'creation.ring-design-review':'ring.design-review',opening?{config:source.config,side:source.side,ordinal:source.ordinal,proposal:plan.proposal}:{target:source,proposal:plan.proposal}));}
   if(!alive.current||controller.runtime.slotId!==worldId||controller.getView().sessionId!==sessionId||!jsonEqual(source,latestTarget.current))throw Error('人物或魂环设定已改变，请按当前设定重新核验');
   const next={...draft.current,answer:recheckedRingDesignAnswer(original,reviews),answerTarget:ringAdviceTarget(source)};await controller.saveRingDesignDiscussion(source,next,worldId,previous);if(alive.current&&controller.runtime.slotId===worldId&&jsonEqual(source,latestTarget.current)){draft.current=next;setDiscussion(next);}
  }catch(e){if(alive.current)setError((e as Error).message);}finally{if(alive.current)setWorking(false);}
 };
 const continueOriginal=async()=>{const request=ringDesignContinuationRequest(draft.current);if(!request||working)return;remember({...draft.current,request});await consult();};
 const unlockSource=async()=>{
  if(working||!opening||!onUnlockSource||!draft.current.answer)return;const source=structuredClone(target),worldId=controller.runtime.slotId,sessionId=view.sessionId,previous=draft.current;setWorking(true);setError('');
  try{await save.current;const nextTarget=await onUnlockSource();if(!alive.current||controller.runtime.slotId!==worldId||controller.getView().sessionId!==sessionId||!jsonEqual(latestTarget.current,source)&&!jsonEqual(latestTarget.current,nextTarget))throw Error('当前人物或魂环已改变，请保留构想后继续');const next={...draft.current,answer:unlockRingDesignAnswer(draft.current.answer),answerTarget:ringAdviceTarget(nextTarget)};await controller.saveRingDesignDiscussion(nextTarget,next,worldId,previous);if(alive.current&&controller.runtime.slotId===worldId){draft.current=next;setDiscussion(next);}}
  catch(e){if(alive.current)setError((e as Error).message);}finally{if(alive.current)setWorking(false);}
 };
 const stale=discussion.answer?.needsRecheck||discussion.answerTarget&&!jsonEqual(discussion.answerTarget,basis),locked=disabled||working||loading;
 const canConsult=!locked&&view.modelEnabled&&(!!discussion.pending||!!catalogue.data&&!!discussion.request.trim());
 const send=()=>{if(canConsult)void consult();};
 return <section className="ring-design-advisor" aria-label="魂环与魂技主持人">
  <h3>与主持人设计魂技</h3><p>{opening?'描述希望获得的魂技和已经确认的来源要求。优先保留完整效果；预算或机制档不足时提高魂环年限，并核对取得方式与承载。缺少的武魂能力也会按创建点数补齐，采用时一起保存；已固定来源仍由你决定是否调整。':'描述这枚魂环的能力与你想领悟的魂技。实际来源和年限保持不变，主持人会按它能提供的力量设计。'}</p>
  <QueryStatus query={catalogue}/>{catalogue.data&&<p>{catalogue.data.source.automaticPlaceholder?'当前自动来源':'魂环来源'}：{catalogue.data.source.name} · {catalogue.data.source.years}年 · 契合{Math.round(catalogue.data.compatibility.ratio*100)}% · 可用{catalogue.data.budget.usable}点</p>}
  {catalogue.data&&<EffectCatalogue effects={catalogue.data.effects}/>}
  <div className="field-actions"><Button variant="secondary" disabled={locked||!!discussion.pending||!catalogue.data} onClick={()=>startManual()}>手动编辑魂技</Button><Button variant="ghost" disabled={locked||!!discussion.pending||!discussion.undo?.length} onClick={()=>remember(restoreRingDiscussion(draft.current,'undo'))}>撤销上次设计</Button><Button variant="ghost" disabled={locked||!!discussion.pending||!discussion.redo?.length} onClick={()=>remember(restoreRingDiscussion(draft.current,'redo'))}>重做</Button></div>
  <p className="muted">可回退最近20个设计版本；已采用的魂环不受草稿回退影响。讨论轮数不再限制，完整记录保留在此处。</p>
  {discussion.manual&&manualOpen&&catalogue.data&&<RingManualEditor value={discussion.manual} catalogue={catalogue.data} disabled={locked||!!discussion.pending} onChange={manual=>remember({...draft.current,manual})} onPreview={()=>void previewManual()} onClose={()=>setManualOpen(false)}/>}
  {discussion.exchanges.length>0&&<details><summary>此前的讨论 · {discussion.exchanges.length}轮</summary>{discussion.exchanges.map((e,i)=><div key={i}><p><b>你：</b>{e.input}</p><p><b>主持人：</b>{playerDescription(e.reply)}</p></div>)}</details>}
  {catalogue.data?.evolutionGuides?.length>0&&<details><summary>武魂成长参考</summary>{catalogue.data.evolutionGuides.map((g:any)=><Button key={g.guideId} variant="secondary" disabled={locked||!!discussion.pending} onClick={()=>remember({...draft.current,request:'参考'+g.name+'，使用这枚实际魂环设计适合当前武魂的能力。保留实际来源、年限与费用；若本环来源支持所需的武魂变化，在方案中给出完整 evolutionTarget；从本次魂环中支付结构成长与魂技费用，先预览再采用。不满足的来源明确列出缺口。'})}>{g.name}</Button>)}</details>}
  <label>魂兽来源与魂技构想<textarea rows={4} maxLength={4000} onKeyDown={e=>sendMessageOnEnter(e,send)} enterKeyHint="send" disabled={locked||!!discussion.pending} value={discussion.request} placeholder="例如：魂环来自擅长梦境的精神系魂兽，希望领悟让目标短暂入梦的能力；不想要攻击技能。" onChange={e=>remember({...draft.current,request:e.target.value})}/></label>
  <label className="opening-workshop__check"><input type="checkbox" checked={discussion.preserveText!==false} disabled={locked||!!discussion.pending} onChange={e=>remember({...draft.current,preserveText:e.target.checked})}/>继续讨论时保留已有名称与介绍，只调整效果</label>
  {working&&<p className="creation-calculation" role="status"><span className="loading-ring" aria-hidden="true"/>{view.modelTask?'AI 主持人正在构思方案…':'正在保存并核对设计…'}</p>}
  <div className="field-actions"><Button disabled={!canConsult} onClick={send}>{discussion.pending?.notStarted?'连接恢复后继续原设计':discussion.pending?'取回原讨论答复':'请主持人设计'}</Button>{working&&<Button variant="ghost" onClick={()=>{abort.current?.abort();if(view.modelTask)controller.cancelModelTask(view.modelTask.id);}}>停止构思</Button>}</div>
  {!view.modelEnabled&&<p>手动编辑无需模型；与主持人讨论需在设置中连接模型。</p>}
  {discussion.pending&&!discussion.pending.notStarted&&!working&&<><p>可先取回上次答复。如果取回失败，可重新发起设计。</p><Button variant="secondary" disabled={disabled||!view.modelEnabled} onClick={()=>void consult(true)}>重新发起设计</Button></>}
  {discussion.pending?.notStarted&&!working&&<p>本次设计尚未发送，原输入与讨论仍保留。继续原设计会先恢复连接，再提交这一份原构想。</p>}
  {error&&<p role="alert">{error}</p>}
  {discussion.answer&&<section aria-label="主持人的魂技方案">{stale&&<p role="status">设定已经改变，原方案保留供参考；请按当前设定继续讨论后采用。</p>}
   {stale&&!discussion.pending&&<div className="field-actions">{discussion.answer.proposals?.length?<Button data-testid="ring-design-recheck-original" disabled={locked} onClick={()=>void recheckOriginal()}>按当前设定重新核验原方案</Button>:<Button data-testid="ring-design-continue-original" disabled={locked||!view.modelEnabled||!ringDesignContinuationRequest(discussion)} onClick={()=>void continueOriginal()}>按原构想继续设计</Button>}</div>}
   {discussion.answer.proposals?.length?<p role="status"><strong>{ringDesignFeedback(discussion.answer).title}</strong></p>:<RingDesignFeedback value={discussion.answer} requestText={ringDesignRequestText(discussion)} disabled={locked} onEditMartialSoul={onEditMartialSoul?()=>void editMartialSoul():undefined}/>}
   {discussion.answer.reply&&<details open={discussion.answer.mode==='question'&&!discussion.answer.summary&&!discussion.answer.diagnostics?.length}><summary>主持人的说明</summary><p>{playerDescription(discussion.answer.reply)}</p></details>}
   {discussion.answer.proposals?.map((plan:any)=><article className="ring-design-proposal" key={plan.id}><h4>{plan.name}</h4>{plan.evolutionPreview&&<><strong>本环牵引武魂变化</strong><p>{plan.evolutionPreview.name}：{plan.evolutionPreview.form}</p><ul>{plan.evolutionPreview.charges.map((c:any)=><li key={c.key}>{c.label}</li>)}</ul><p>结构成长与魂技共用本次魂环额度；原有魂环保留。</p></>}{plan.martialSoulAdjustment&&<><strong>按完整魂技补齐武魂能力</strong><p>新增能力方向：{plan.martialSoulAdjustment.addedChannels.map((id:string)=>catalogue.data?.sourceDesign?.channels.find((c:any)=>c.id===id)?.name??'所需方向').join('、')||'无'}。新增属性：{plan.martialSoulAdjustment.addedAttributes.map((id:string)=>catalogue.data?.sourceDesign?.attributes.find((a:any)=>a.id===id)?.name??'所需属性').join('、')||'无'}。武魂消耗：{plan.martialSoulAdjustment.beforeCost} → {plan.martialSoulAdjustment.cost}点。</p><p>采用后保留已写明的魂技设计；武魂变化后，历史魂环选择需要重新确认。</p></>}{plan.yearAdjustment?.applied&&<><strong>按完整效果提高魂环年限</strong><p>魂环年限：{plan.yearAdjustment.beforeYears}年 → {plan.yearAdjustment.years}年。原效果、费用和次数均保留；采用后使用新的年限与来源。</p></>}{plan.structuralAlternative&&<><strong>组合修正备选</strong><p>原构想保留在上方。此方案已按实际要求修正释放或目标方式，请查看下方实际效果后选择。</p></>}{plan.budgetAlternative&&<><strong>当前预算内的降配备选</strong><p>原方案仍保留在上方；此备选降低了以下数值，请比较实际效果后选择。</p><ul>{plan.budgetAlternative.changes.map((change:any,i:number)=><li key={i}>第{change.skill+1}项魂技 · {change.parameter}：{change.before} → {change.after}</li>)}</ul></>}{!plan.pass&&<p>以下为待修正的设计构想，尚未形成可采用的魂技。</p>}<p>{playerDescription(plan.description)}</p>{plan.source&&<p>来源：{plan.source.name} · {plan.source.years}年</p>}{plan.acquisition&&<p>取得方式：{plan.acquisition.label} · {plan.acquisition.note}</p>}{plan.warnings?.map((warning:string,i:number)=><p role="status" key={i}>{warning}</p>)}
    <RingDesignFeedback value={plan} requestText={ringDesignRequestText(discussion)} disabled={locked} onEditMartialSoul={onEditMartialSoul?()=>void editMartialSoul():undefined}/>
    {plan.proposal?.skills?.length>0&&<Button variant="secondary" disabled={locked||!!discussion.pending} onClick={()=>startManual(plan.proposal)}>手动修改这套方案</Button>}
    {opening&&onUnlockSource&&!discussion.answer.needsRecheck&&(plan.sourceAdjustment?.requiresSourceDecision||plan.diagnostics?.some((d:any)=>d.code==='locked-source-redefinition'))&&<><p>你已将来源能力设为固定。允许调整后会保留来源主题与完整魂技，重新核验所需年限、能力及承载；已有魂环选择须重新确认。</p><Button data-testid="ring-design-unlock-source" variant="secondary" disabled={locked} onClick={()=>void unlockSource()}>允许按魂技补齐来源</Button></>}
    {ringDesignFeedback(plan).canAdopt&&<><p>消耗{plan.budget.spent} / {plan.budget.available}点 · 契合{Math.round(plan.compatibility.ratio*100)}%</p><p>剩余{Math.max(0,plan.budget.available-plan.budget.spent)}点，可以保留余额，无需为了用完点数增加效果。</p>{plan.skills.map((skill:any,i:number)=><AbilityDetails key={i} skill={skill} showAvailability={false}/>)}<RingDesignAdoptionAction disabled={locked||!!stale} working={working&&adoption?.id===plan.id} error={adoption&&adoption.id===plan.id?adoption.error:undefined} onAdopt={()=>void adopt(plan)}/></>}
   </article>)}
  </section>}
  {discussion.exchanges.length>0&&!discussion.pending&&<Button variant="ghost" disabled={locked} onClick={()=>remember(checkpointRingDiscussion(draft.current,{...blankRingDiscussion(),preserveText:draft.current.preserveText}))}>清空讨论，重新构思</Button>}
 </section>;
}
