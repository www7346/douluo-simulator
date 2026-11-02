import {useState} from 'react';
import {Button,Modal} from '../components';
import {useGame} from '../game-context';
import {useServerQuery} from '../use-game-query';
import {useActionFeedback} from '../use-action-feedback';
import ActionFeedback from './ActionFeedback';
import QueryStatus from './QueryStatus';
export default function PartyRingAllocation({beastUnitId}:{beastUnitId:string}){
 const {controller,view,state}=useGame(),[open,setOpen]=useState(false),feedback=useActionFeedback();
 const profile:any=Object.values(state.魂兽档案.列表).find((p:any)=>p.单位ID===beastUnitId);
 const query=useServerQuery<any[]>('presentation.party-ring',{beastUnitId},{enabled:open});
 return <><Button variant="secondary" onClick={()=>setOpen(true)}>分配给队友</Button><Modal open={open} title="分配现场魂环" onClose={()=>setOpen(false)}>
  {profile&&<h3>{profile.名称} · {profile.年限}年</h3>}
  <p>这枚魂环只能在当前房间吸收。队友与主角使用相同的突破、环位和年限承载条件。</p><QueryStatus query={query}/><ActionFeedback feedback={feedback}/>
  {query.data?.map(p=><section key={p.personId}><h3>{p.name} · {p.level}级</h3><p>{p.available?'满足吸收条件，可以向队友提出分配。':p.reason}</p><Button disabled={!p.available||view.busy} onClick={()=>void feedback.run(()=>controller.dispatch('character.request-growth',{personId:p.personId,source:p.source}))}>交给{p.name}吸收</Button></section>)}
  {query.data&&!query.data.length&&<p>当前没有在场的队友。</p>}
 </Modal></>;
}
