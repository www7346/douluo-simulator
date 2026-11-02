import {useState} from 'react';
import {useGame} from '../game-context';
import {useGameQuery} from '../use-game-query';
import {Button} from '../components';
import type {OpeningDirection} from '../../runtime/opening-directions';

const labels:Record<string,string>={active:'尚待处理',overdue:'逾期未还',expired:'已错过期限',declined:'已放弃',available:'可邀请同行',used:'已使用引荐',completed:'已办结',returned:'已归还'};
export default function OpeningDirections({onChoose,disabled}:{onChoose:(text:string)=>void;disabled:boolean}){
 const {controller,view}=useGame();
 const query=useGameQuery<{locationName:string;directions:OpeningDirection[];situations:any[];blocked:string}>(`opening.directions:${view.sessionId}:${view.snapshot.revision}`,()=>controller.query('opening.directions',{}));
 const [expanded,setExpanded]=useState(true);
 const choose=(text:string)=>{onChoose(text);setExpanded(false);};
 if(query.error)return <p role="alert">眼下的去向暂未读出：{query.error}</p>;
 if(!query.data||query.data.blocked)return null;
 const {situations,directions,locationName}=query.data;
 const options:OpeningDirection[]=[...situations.filter(r=>r.availableActions.length||r.status==='available').map(r=>({
  id:r.id,label:`${r.contactName} · ${r.name}`,detail:r.next,
  input:r.availableActions.includes('return')?`我带着受托铜匣去找${r.contactName}，归还物品；我知道已错过保证金和酬劳。`:r.status==='available'?`我找${r.contactName}询问同行的实际报价和条件，先不付钱签约。`:`我先回顾一下与${r.contactName}的${r.name}约定，看看现在能做什么。`
 })),...directions];
 const card=(r:OpeningDirection)=><section key={r.id}><strong>{r.label}</strong><p>{r.detail}</p><Button disabled={disabled} onClick={()=>choose(r.input)}>考虑这条方向</Button></section>;
 return <details className="opening-directions" open={expanded} onToggle={e=>setExpanded(e.currentTarget.open)}>
  <summary>眼下的处境与去向</summary><p>你在{locationName}。可先选一条，也可直接写自己的行动。点选只填写草稿。</p>
  {options.slice(0,3).map(card)}
  {options.length>3&&<details><summary>其他去向（{options.length-3}）</summary>{options.slice(3).map(card)}</details>}
  {!!situations.length&&<details><summary>开局约定与进展（{situations.length}）</summary>{situations.map(r=><section key={r.id}>
   <strong>{r.name} · {labels[r.status]}</strong><p>{r.contactName} · {r.locationName} · 原约定第{r.dueDay}日结束前</p><p>{r.summary}</p>
   <details><summary>原有条款</summary><p>{r.description}</p><p>{r.benefitDescription}</p></details>
  </section>)}</details>}
 </details>;
}
