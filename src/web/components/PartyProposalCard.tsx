import {useGame} from '../game-context';
import {Button} from '../components';

export default function PartyProposalCard({card,onDiscuss}:{card:any;onDiscuss:(text:string)=>void}){
 const {state,view}=useGame(),name=(id:string)=>state.人物.列表[id]?.name??'原参与者',t=card.terms;
 const status=card.status==='superseded'?'已有更新条款':card.status==='completed'?'已交付':card.status==='departed'?'已随本次出发确认':card.status==='agreed'?(card.kind==='loot'?'各方已确认':'各方已同意，待领取'):card.status==='rejected'?'尚未达成一致':'等待各方回应';
 return <aside className="party-proposal" aria-label="队伍分配提议">
  <header><strong>{card.kind==='loot'?'自愿分配约定':'暂存收获协商'}</strong><span>{status}</span></header>
  {card.kind==='loot'?<><p>{Object.entries(t.shares).map(([id,n])=>`${name(id)} ${n}份`).join('、')}</p>{(t.itemTargets??[]).map((target:any)=><p key={target.templateId+':'+(target.name??'')}>{target.name??card.itemNames[target.templateId]} · 带回时最多 {target.quantity} 件分给{name(target.personId)}，其余另议。</p>)}<p>余数{t.remainderOwner?`归${name(t.remainderOwner)}`:'暂存协商'}；未指定物品另议。</p><details><summary>查看指定物品条款</summary>{Object.entries(t.itemOwners).length?Object.entries(t.itemOwners).map(([id,owner])=><p key={id}>{card.itemNames[id]??'指定物品'} → {name(String(owner))}</p>):<p>没有预先指定物品归属。</p>}</details></>:<p>{t.name} × {t.quantity} → {name(t.recipientId)}</p>}
  {t.nextPriority&&<p>本次交付后，下次这些队员共同取得一件{t.nextPriority.name??card.itemNames[t.nextPriority.templateId]}时，先向{name(t.nextPriority.personId)}协商。</p>}
  <ul>{card.people.map((p:any)=><li key={p.personId}>{p.name} · {p.status==='completed'?(p.retained?'保留原确认':'已确认'):p.status==='rejected'?'未接受':p.status==='unasked'?'尚待征求意见':'等待本人回应'}</li>)}</ul>
  {card.delivery&&<p>第 {card.delivery.at.day} 日已交付 {card.delivery.quantity} 件。</p>}
  <Button variant="ghost" disabled={view.busy||!!view.modelTask||!!state.扩展.story.active&&state.扩展.story.active.status!=='complete'} onClick={()=>onDiscuss(card.kind==='loot'?'关于这次分配，我想再商量一下：':`关于${t.name}的分配，我想再商量一下：`)}>继续商量</Button>
 </aside>;
}
