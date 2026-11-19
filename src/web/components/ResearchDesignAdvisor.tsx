import {playerDescription} from '../../runtime/player-copy';
import {useEffect,useRef,useState} from 'react';
import {Button,ModalActions} from '../components';
import {useGame} from '../game-context';
import {sendMessageOnEnter} from '../message-enter';
import {blankResearchDiscussion,type ResearchDesignDiscussion} from '../../shared/research-design-discussion';
import type {ResearchWorkspace} from '../../runtime/research-workbench';
import AbilityDetails,{PassiveDetails} from './AbilityDetails';

export default function ResearchDesignAdvisor({draft,materials,onAdopt,flush,ownedOnly,onOwnedOnly,goal,onGoal}:{draft:ResearchWorkspace;materials:any[];ownedOnly:boolean;onOwnedOnly:(value:boolean)=>void;goal:'purpose'|'value';onGoal:(value:'purpose'|'value')=>void;onAdopt:(design:any,materials?:any[])=>void;flush:()=>Promise<void>}){
 const {controller,view}=useGame(),[discussion,setDiscussion]=useState<ResearchDesignDiscussion>(blankResearchDiscussion),[working,setWorking]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const live=useRef(true),latest=useRef(discussion),abort=useRef<AbortController|null>(null),save=useRef(Promise.resolve());
 const category=draft.category,worldId=controller.runtime.slotId;
 const draftBasis=JSON.stringify({draft,materials,ownedOnly,goal}),currentBasis=useRef(draftBasis);currentBasis.current=draftBasis;
 useEffect(()=>{let active=true;live.current=true;setLoading(true);setError('');void controller.researchDesignDiscussion(category).then(value=>{if(active){latest.current=value;setDiscussion(value);setLoading(false);}},e=>{if(active){setError(e.message);setLoading(false);}});return()=>{active=false;live.current=false;abort.current?.abort();};},[controller,worldId,category]);
 useEffect(()=>{if(working||view.busy||!discussion.pending||view.resultRecovery)return;let active=true;void controller.researchDesignDiscussion(category).then(value=>{if(active&&!value.pending){latest.current=value;setDiscussion(value);}},e=>{if(active)setError(e.message);});return()=>{active=false;};},[controller,worldId,category,working,view.busy,Boolean(discussion.pending),view.resultRecovery]);
 const remember=(value:ResearchDesignDiscussion)=>{const previous=latest.current;latest.current=value;setDiscussion(value);save.current=save.current.catch(()=>{}).then(async()=>{const saved=await controller.saveResearchDesignDiscussion(category,value,worldId,previous);if(live.current&&latest.current===value&&controller.runtime.slotId===worldId){latest.current=saved;setDiscussion(saved);}});void save.current.catch(e=>{if(live.current)setError(e.message);});};
 const consult=async(restart=false)=>{
  if(abort.current||working)return;const cancel=new AbortController();abort.current=cancel;setWorking(true);setError('');
  try{await save.current;await flush();if(!live.current||controller.runtime.slotId!==worldId)return;if(currentBasis.current!==draftBasis)throw Error('构想或用料已改变，请按当前内容重新设计。');const stored=await controller.researchDesignDiscussion(category);if(latest.current.pending&&!stored.pending&&stored.answer){latest.current=stored;setDiscussion(stored);return;}const value=await controller.consultResearchDesign({category,materials,ownedOnly,goal,confirmedDesign:draft.confirmedDesign,basis:{revision:view.snapshot.revision,category}},{signal:cancel.signal,restart});if(live.current&&controller.runtime.slotId===worldId){latest.current=value;setDiscussion(value);}}
  catch(e){
   if(live.current){
    setError((e as Error).message);
    try{const value=await controller.researchDesignDiscussion(category);if(live.current){latest.current=value;setDiscussion(value);}}
    catch{/* The original task stays retained. */}
   }
  }finally{if(live.current)setWorking(false);abort.current=null;}
 };
 const proposal=discussion.answer?.proposal,design=proposal?.confirmedDesign;
 const adopt=async()=>{
  if(working||!design)return;setWorking(true);setError('');
  try{await flush();if(!live.current||controller.runtime.slotId!==worldId)return;if(currentBasis.current!==draftBasis)throw Error('构想或用料已改变，请按当前内容重新核对设计。');const result=await controller.query('research.design-review',{category,concept:design.description,materials,ownedOnly,confirmedDesign:design});if(!live.current||controller.runtime.slotId!==worldId)return;if(currentBasis.current!==draftBasis)throw Error('构想或用料已改变，请按当前内容重新核对设计。');if(!result.confirmedDesign||ownedOnly&&!result.pass)throw Error(result.reasons?.join('；')||'当前条件不能制作，请调整设计。');onAdopt(result.confirmedDesign,result.recommendation?.found?result.recommendation.materials:undefined);}
  catch(e){if(live.current)setError((e as Error).message);}finally{if(live.current)setWorking(false);}
 };
 const blocked=working||loading||view.busy;
 const canConsult=!blocked&&view.modelEnabled&&(!!discussion.pending||!!discussion.request.trim()&&discussion.exchanges.length<20);
 const send=()=>{if(canConsult)void consult();};
 return <section className="research-design-advisor" aria-label="制作前主持人设计">
  <h3>设计{category}图纸</h3><p>描述用途和外形，讨论方案后再投入材料试制。定稿后获得图纸及一件样品。</p>
  <label>作品构想<textarea rows={3} maxLength={4000} onKeyDown={e=>sendMessageOnEnter(e,send)} enterKeyHint="send" value={discussion.request} disabled={blocked||!!discussion.pending} placeholder="例如：设计一件能修复装备的随身魂导器，并说明使用代价。" onChange={event=>remember({...latest.current,request:event.target.value})}/></label>
  <label className="workshop-option"><input type="checkbox" checked={ownedOnly} disabled={blocked||!!discussion.pending} onChange={e=>onOwnedOnly(e.target.checked)}/>仅用现有可用材料</label><label>方案目标<select value={goal} disabled={blocked||!!discussion.pending} onChange={e=>onGoal(e.target.value as 'purpose'|'value')}><option value="purpose">优先满足我的用途</option><option value="value">优先成品估值</option></select></label>
  <div className="field-actions"><Button disabled={!canConsult} onClick={send}>{discussion.pending?.notStarted?'连接恢复后继续原设计':discussion.pending?'取回原设计答复':working?'主持人正在设计…':'生成方案'}</Button>{working&&<Button variant="ghost" onClick={()=>{abort.current?.abort();if(view.modelTask)controller.cancelModelTask(view.modelTask.id);}}>停止构思</Button>}{discussion.pending&&!discussion.pending.notStarted&&!working&&<Button variant="secondary" disabled={!view.modelEnabled} onClick={()=>void consult(true)}>重新发起设计</Button>}</div>
  {discussion.exchanges.length>=20&&!discussion.pending&&<p>本轮讨论已满，可以先采用候选，或清空本品类讨论重新构思。</p>}
  {!view.modelEnabled&&<p>请先在设置中连接主持人；构想会保留。</p>}
  {discussion.pending?.notStarted&&!working&&<p>本次设计尚未发送，原构想与用料仍保留。继续原设计会先恢复连接，再提交原请求。</p>}
  {error&&<p role="alert">{error}</p>}
  {discussion.exchanges.length>0&&<details><summary>此前讨论 · {discussion.exchanges.length}轮</summary>{discussion.exchanges.map((entry,index)=><div key={index}><p>你：{entry.input}</p><p>主持人：{entry.reply}</p></div>)}</details>}
  {discussion.answer&&<article aria-label="主持人作品候选">{discussion.answer.structuralAlternative&&<><strong>组合修正备选</strong><p>本方案已按正式依赖修正释放或目标，请查看实际效果后选择。</p><details><summary>修正前构想</summary><p>{discussion.answer.originalDesign?.name}</p><p>{playerDescription(discussion.answer.originalDesign?.description)}</p></details></>}<p>{playerDescription(discussion.answer.reply)}</p>{design&&<><h4>{design.name}</h4><p>{playerDescription(design.description)}</p><p>{playerDescription(design.appearance)}</p><p>成品估值：{proposal.designQuote?.valueGold??'待核对'}金 · 材料工艺价值：{proposal.designQuote?.materialValue??'待核对'}</p>{proposal.reasons?.map((reason:string,index:number)=><p key={index}>{reason}</p>)}{proposal.preview?.plannedEffects?.length>0&&<p>实际效果：{proposal.preview.plannedEffects.map((effect:any)=>effect.name??effect.id).join('、')}</p>}{(proposal.designQuote?.activeSkill??proposal.skill)&&<AbilityDetails skill={proposal.designQuote?.activeSkill??proposal.skill}/>}{proposal.designQuote?.passiveEffectGraph&&<AbilityDetails skill={{name:'装备被动',category,effectGraph:proposal.designQuote.passiveEffectGraph}} showName={false} showAvailability={false}/>}<PassiveDetails modifiers={proposal.designQuote?.modifiers}/><div className="field-actions"><Button disabled={blocked||ownedOnly&&!proposal.pass} onClick={()=>void adopt()}>采用方案</Button><span role="status">{proposal.pass?'当前条件可制作':'目标设计 · 当前不能制作'}</span></div><p>确认试制时消耗清单中的材料。</p></>}</article>}
  {discussion.exchanges.length>0&&!discussion.pending&&<Button variant="ghost" disabled={blocked} onClick={()=>remember(blankResearchDiscussion())}>清空本品类讨论</Button>}
 </section>;
}
