import {useState} from 'react';
import {ActionSection,Button} from '../components';
import {useGame} from '../game-context';
import {useActionFeedback} from '../use-action-feedback';
import ActionFeedback from './ActionFeedback';
import {SealingSelfActions} from './SealingPanel';

export interface EscapeChoice {id:string;label:string;command:string;payload:Record<string,unknown>}
export interface SelfStatusFacts {label:string;statuses:any[];choices:EscapeChoice[];custodianId?:string|null;sealed?:any;conversationTargets?:any[];inBattle?:boolean;room?:{name:string;actions:Array<EscapeChoice&{available:boolean;reason?:string}>}|null}
export function StatusEscapeView({facts,busy=false,inBattle=false,onEscape,onTalk}:{facts:SelfStatusFacts;busy?:boolean;inBattle?:boolean;onEscape:(choice:EscapeChoice)=>void;onTalk?:()=>void}){
 const [selected,setSelected]=useState('');
 const choice=facts.choices.find(c=>c.id===selected)??facts.choices[0];
 if(facts.label==='自由行动'&&!facts.statuses.length&&!choice&&!facts.room)return null;
 return <section className="self-status-actions" aria-label="当前状态与脱困"><strong>{facts.label}</strong>
  {facts.statuses.length>0&&<p className="self-status-actions__labels">{facts.statuses.map(s=><span key={s.instanceId}>{s.name}{Number.isFinite(s.remainingMinutes)?` · ${s.remainingMinutes}分钟`:Number.isFinite(s.remainingRounds)&&s.remainingRounds>0?` · ${s.remainingRounds}回合`:''}</span>)}</p>}
  {facts.room&&<div className="self-status-actions__room"><p>{facts.room.name}</p><div className="field-actions">{facts.room.actions.map(action=><Button key={action.id} variant="secondary" disabled={busy||inBattle||!action.available} onClick={()=>onEscape(action)}>{action.label}</Button>)}</div>{[...new Set(facts.room.actions.filter(action=>!action.available&&action.reason).map(action=>action.reason))].map(reason=><p className="muted" key={reason}>{reason}</p>)}</div>}
  {choice&&<><Button disabled={busy||inBattle} title={choice.label} onClick={()=>onEscape(choice)}>尝试挣脱 · 10分钟</Button>{facts.choices.length>1&&<ActionSection title={<>其他挣脱方式</>}><label>挣脱方式<select aria-label="挣脱方式" value={choice.id} onChange={e=>setSelected(e.target.value)}>{facts.choices.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label></ActionSection>}</>}
  {inBattle&&choice&&<p className="muted">交战中请在战斗行动里选择挣脱。</p>}
  {facts.custodianId&&onTalk&&<Button variant="ghost" disabled={busy||inBattle} onClick={onTalk}>与关押者交谈</Button>}
 </section>;
}
export default function StatusEscapeActions({facts}:{facts?:SelfStatusFacts|null}){
 const {view,controller}=useGame(),feedback=useActionFeedback();
 if(!facts)return null;
 return <><StatusEscapeView facts={facts} busy={view.busy} inBattle={facts.inBattle} onEscape={choice=>void feedback.run(()=>controller.dispatch(choice.command,choice.payload))} onTalk={facts.custodianId?()=>void feedback.run(()=>controller.openStoryConversation(facts.custodianId!)):undefined}/>
  {facts.sealed&&<details className="self-status-actions"><summary>封神台中的处境</summary><SealingSelfActions self={facts.sealed} targets={facts.conversationTargets}/></details>}<ActionFeedback feedback={feedback}/></>;
}
