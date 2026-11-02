import {useState} from 'react';
import {Button} from '../components';
import {useGame} from '../game-context';
import {useActionFeedback} from '../use-action-feedback';
import ActionFeedback from './ActionFeedback';
const stages:Record<string,string>={pending:'等待本人回应',accepted:'已接受，尚未交付',rejected:'已拒绝',completed:'已交付',expired:'已过期'};
export function GiftResponse({commitmentId,continueStory=false}:{commitmentId:string;continueStory?:boolean}){
 const {view,controller}=useGame(),[reason,setReason]=useState('');
 const feedback=useActionFeedback();
 const respond=async(accept:boolean)=>{const saved=await feedback.run(()=>controller.dispatch('character.respond-gift',{commitmentId,decision:{accept,reason:reason.trim()||(accept?'接受这次赠物约定':'拒绝这次赠物约定')}}));if(saved&&continueStory&&view.modelEnabled)await feedback.run(async()=>{try{await controller.continueStory();}catch{throw Error('回应已保存，故事暂未继续。请重试生成。');}});};
 return <div><ActionFeedback feedback={feedback}/><label>回应理由（可选）<input value={reason} maxLength={600} onChange={e=>setReason(e.target.value)}/></label><div className="field-actions"><Button disabled={view.busy} onClick={()=>void respond(true)}>接受承诺</Button><Button variant="ghost" disabled={view.busy} onClick={()=>void respond(false)}>拒绝</Button></div><p>接受约定后，还需交付物品。</p></div>;
}
export default function ControlledGiftPanel({gifts}:{gifts:any[]}){
 const {state}=useGame(),playerId=state.角色.主控单位ID;if(!gifts?.length)return null;
 return <details><summary>赠物承诺</summary>{gifts.slice(-16).reverse().map(r=><article key={r.id}><p>{r.donorName} → {r.recipientName}：{r.itemName} ×{r.quantity}</p><p>{stages[r.status]} · 期限为第{r.dueDay}日结束前</p>{r.recipientId===playerId&&r.status==='pending'&&(r.responseReason?<p>{r.responseReason}</p>:<GiftResponse commitmentId={r.id}/>)}</article>)}</details>;
}
