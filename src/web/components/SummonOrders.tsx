import {useState} from 'react';
import {Button} from '../components';
import {useGame} from '../game-context';
import {useServerQuery} from '../use-game-query';
import {useActionFeedback} from '../use-action-feedback';
import ActionFeedback from './ActionFeedback';

type Choice={id:string;name:string};
type Member=Choice&{casts:{skillId:string;name:string;targetId:string;targetName:string}[];skills:string[];targets:(Choice&{ally:boolean})[];canGuard:boolean;places:Choice[];order:{mode:string;targetId:string;skillId?:string}|null};
type Orders={members:Member[];report:{place:string;observations:string[]}|null};

function UnitOrders({member,busy,onOrder}:{member:Member;busy:boolean;onOrder:(payload:Record<string,string>)=>void}){
 const [selected,setSelected]=useState('');
 const options=[
  ...member.casts.map(c=>({mode:'cast',id:c.targetId,skillId:c.skillId,name:c.name+' · '+c.targetName})),
  ...member.targets.filter(t=>!t.ally||member.canGuard).map(t=>({mode:t.ally?'guard':'focus',id:t.id,name:(t.ally?'保护 · ':'集火 · ')+t.name})),
  ...member.places.map(t=>({mode:'scout',id:t.id,name:'侦察 · '+t.name})),
  ...(member.targets.length?[{mode:'free',id:'',name:'自由行动'}]:[]),
 ];
 const key=(o:{mode:string;id:string;skillId?:string})=>JSON.stringify([o.mode,o.skillId,o.id]);
 const choice=options.find(o=>key(o)===selected)??options[0];
 return <article><strong>{member.name}</strong><p>{member.skills.join(' · ')}</p>
  {member.order&&<p>当前指令 · {options.find(o=>o.id===member.order?.targetId&&o.mode===member.order.mode&&(!('skillId' in o)||o.skillId===member.order.skillId))?.name??'目标已离场'}</p>}
  {choice&&<label>指令 <select aria-label={member.name+'的指令'} value={key(choice)} onChange={e=>setSelected(e.target.value)}>{options.map(o=><option key={key(o)} value={key(o)}>{o.name}</option>)}</select> <Button disabled={busy} onClick={()=>onOrder({unitId:member.id,mode:choice.mode,...('skillId' in choice?{skillId:String(choice.skillId)}:{}),...(choice.mode==='scout'?{destinationId:choice.id}:choice.id?{targetId:choice.id}:{})})}>下达指令</Button></label>}
 </article>;
}

export default function SummonOrders(){
 const {view,controller}=useGame(),query=useServerQuery<Orders>('presentation.summons'),feedback=useActionFeedback();
 const data=query.data;
 if(!data?.members.length&&!data?.report)return null;
 return <section className="summon-orders" aria-label="召唤指令"><h3>召唤指令</h3>
  {data.members.map(m=><UnitOrders key={m.id} member={m} busy={view.busy} onOrder={p=>void feedback.run(()=>controller.dispatch('summon.order',p))}/>)}
  {data.report&&<p aria-live="polite"><b>最近侦察 · {data.report.place}</b>　{data.report.observations.join('，')}</p>}
  <ActionFeedback feedback={feedback}/>
 </section>;
}
