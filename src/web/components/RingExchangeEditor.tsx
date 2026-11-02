import {useEffect,useState} from 'react';
import {ActionSection} from '../components';
import {useServerQuery} from '../use-game-query';
import {useGame} from '../game-context';
import QueryStatus from './QueryStatus';
import ExchangeBuilder from './ExchangeBuilder';
import AbilityDetails from './AbilityDetails';

export default function RingExchangeEditor({source,onChange,onValidity}:{source:{itemId?:string;beastUnitId?:string;martialSoulId:string};onChange:(skills:any[]|undefined)=>void;onValidity?:(valid:boolean)=>void}){
 const {state,view}=useGame(),[open,setOpen]=useState(false),[planId,setPlanId]=useState(''),[skillIndex,setSkillIndex]=useState(0),[requested,setRequested]=useState<any[]|undefined>(),[notice,setNotice]=useState('');
 const query=useServerQuery<any>('ring.exchange-options',source,{enabled:open}),plans=query.data?.generationPlans??[],plan=plans.find((p:any)=>p.id===planId);
 const preview=useServerQuery<any>('ring.exchange-options',{...source,requestedSkills:requested},{enabled:!!requested,delay:200});
 useEffect(()=>{onValidity?.(!requested||Boolean(preview.data?.requestedPreview)&&!preview.error);},[requested,preview.data,preview.error,onValidity]);
 const skills=requested??plan?.requestedSkills??[],selected=skills[skillIndex],branches=(plan?.branchChoices??[]).filter((b:any)=>b.skillIndex===skillIndex).map((b:any)=>({id:b.branchId,label:b.label,activation:b.activation}));
 const owned=(state.战斗单位.列表[state.角色.主控单位ID].能力.技能ID??[]).map((id:string)=>state.技能.列表[id]).filter(Boolean);
 const update=(contracts:any[])=>{const next=structuredClone(skills);next[skillIndex].exchangeContracts=contracts;setRequested(next);onValidity?.(false);onChange(next);};
 return <ActionSection title={<>设计限制与强化（可选）</>} className="soul-editor__section ring-exchange-editor" onOpenChange={setOpen}>{open&&<>
  <QueryStatus query={query}/>{plans.length>0&&<label>领悟方向<select aria-label="选择魂技效果方向" disabled={view.busy} value={planId} onChange={e=>{const next=plans.find((p:any)=>p.id===e.target.value);setPlanId(next?.id??'');setSkillIndex(0);setRequested(next?.requestedSkills);onValidity?.(!next);onChange(next?.requestedSkills);setNotice(next?'已选择这套效果；可继续添加限制与强化。':'将按来源自动领悟，不指定方向。');}}><option value="">按来源自动领悟</option>{plans.map((p:any)=><option key={p.id} value={p.id}>{p.label} · {p.summary.slice(0,64)} · {p.budget.spent} / {p.budget.available}点</option>)}</select></label>}
  {!plan&&plans.length>0&&<div className="ring-plan-overview" aria-label="可设计的魂技效果">{plans.map((p:any)=><p key={p.id}><b>{p.label}</b>：{p.summary}</p>)}<p>选择具体效果后，可查看完整数值并设计限制。</p></div>}
  {plan?<>
  {skills.length>1&&<label>增强哪项魂技<select value={skillIndex} onChange={e=>setSkillIndex(Number(e.target.value))}>{skills.map((s:any,i:number)=><option key={i} value={i}>第{i+1}项魂技 · {s.name}</option>)}</select></label>}
  {notice&&<p role="status">{notice}</p>}
  <QueryStatus query={preview}/>{preview.data?.requestedPreview&&<section aria-label="当前魂技设计预览"><p>领悟后的效果 · 消耗 {preview.data.requestedPreview.budget.spent} / {preview.data.requestedPreview.budget.available}点</p>{preview.data.requestedPreview.skills.map((skill:any,i:number)=><AbilityDetails key={i} skill={skill} showAvailability={false}/>)}</section>}
  <ExchangeBuilder key={`${plan.id}:${skillIndex}`} branches={branches} contracts={selected?.exchangeContracts??[]} skills={owned} onAdd={c=>{setNotice('');update([...(selected.exchangeContracts??[]),c]);}} onRemove={index=>update(selected.exchangeContracts.filter((_:any,i:number)=>i!==index))}/>
  </>:!query.loading&&!plans.length&&<p role="status">{query.data?.generationPlanReasons?.[0]??'这枚魂环尚未形成可编辑的能力方向。'}</p>}
 </>}</ActionSection>;
}
