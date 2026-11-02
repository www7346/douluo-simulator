import RingLore from './RingLore';
import {useEffect,useMemo,useRef,useState} from 'react';
import {useServerQuery} from '../use-game-query';
import QueryStatus from './QueryStatus';
import {ringDisplay} from '../../shared/ring-display';
import {useGame} from '../game-context';
import {Button,Modal,SoulRingHalo} from '../components';
import {playerText} from '../../runtime/player-text';
import {RingChoiceScene} from './RingWorkbench';
import RingExchangeEditor from './RingExchangeEditor';
import RingDesignAdvisor from './RingDesignAdvisor';
import AbilityDetails from './AbilityDetails';

export default function RingItemDialog({itemId,onClose}:{itemId:string;onClose:()=>void}) {
  const {state,controller,view}=useGame();
  const item=state.物品.实例[itemId],playerId=state.角色.主控单位ID;
  const [soulId,setSoulId]=useState(item?.payload.ringPreparation?.martialSoulId??state.成长.列表[playerId].激活武魂ID);
  const [message,setMessage]=useState(''),[working,setWorking]=useState(false);
  const [requestedSkills,setRequestedSkills]=useState<any[]|undefined>();
  const [designValid,setDesignValid]=useState(true);
  const [advised,setAdvised]=useState<any>(null),[discuss,setDiscuss]=useState(false);
  const activePending=useRef('');
  // Absorption consumes the item; keep the mounted choice scene for its success screen.
  useEffect(()=>{if(!item&&!activePending.current)onClose();},[item,onClose]);
  const guard=useRef(false);
  const query=useServerQuery<any>('ring.item',{itemId,martialSoulId:soulId},{enabled:Boolean(item)});
  const quote=query.data;
  const pendingId=item?.payload.ringPreparation?.pendingId;
  if(pendingId)activePending.current=pendingId;
  const souls=state.成长.列表[playerId].武魂ID列表.map((id:string)=>state.武魂.列表[id]);
  const prepare=async()=>{if(guard.current)return;guard.current=true;setWorking(true);setMessage('');try{if(advised){const review=await controller.query('ring.design-review',{target:{kind:'item',itemId,martialSoulId:soulId},proposal:advised.proposal});if(!review.pass)throw Error(review.reasons.join('；'));}await controller.prepareRingItem({itemId,martialSoulId:soulId,...(requestedSkills?{requestedSkills}:{})});}catch(error){setMessage(playerText((error as Error).message,state,'暂时无法使用这枚魂环'));}finally{guard.current=false;setWorking(false)}};
  if(activePending.current)return <RingChoiceScene pendingId={activePending.current} onClose={onClose}/>;
  return <Modal open className="modal--ring-item" title={quote?.lore?.name??item?.name??'魂环物品'} onClose={onClose} actions={<><Button variant="ghost" onClick={onClose}>暂不吸收</Button><Button disabled={!quote?.pass||view.busy||working||!designValid} onClick={()=>void prepare()}>{working?'魂环正在共鸣…':'领悟魂技方案'}</Button></>}>
    <QueryStatus query={query}/>{item?<>
      <div className="ring-inspection"><SoulRingHalo years={item.payload.ringSource.years}/><div><h3>{ringDisplay(item.payload.ringSource.years).名称}魂环</h3><label>归属武魂<select aria-label="魂环归属武魂" value={soulId} disabled={Boolean(pendingId)||view.busy||working} onChange={event=>{setSoulId(event.target.value);setRequestedSkills(undefined);setDesignValid(true);setAdvised(null);setDiscuss(false);}}>{souls.map((soul:any)=><option key={soul.id} value={soul.id}>{soul.名称} · 已有{soul.魂环ID列表.length}环</option>)}</select></label>{quote&&<p>{quote.facts.bypassCapacity?'不受身体承载年限限制':'需满足当前身体承载能力'}</p>}</div></div>
      {quote?.eligibility&&<p>当前经验 {quote.eligibility.experience} / {quote.eligibility.requirement} · 第{quote.eligibility.nextOrdinal}魂环</p>}
      {quote?.reasons.map((reason:string)=><p className="danger-text" key={reason}>{playerText(reason,state)}</p>)}
      <RingLore lore={quote?.lore}/>
      <Button variant="secondary" disabled={!quote?.pass||view.busy||working} onClick={()=>setDiscuss(v=>!v)}>{discuss?'收起主持人讨论':'和主持人讨论魂技方向'}</Button>
      {discuss&&<RingDesignAdvisor key={'advisor:'+soulId} target={{kind:'item',itemId,martialSoulId:soulId}} disabled={working||view.busy} onAdopt={plan=>{setAdvised(plan);setRequestedSkills(plan.requestedSkills);setDesignValid(true);setDiscuss(false);}}/>}
      {advised?<section className="ring-adopted-design"><h3>已选：{advised.name}</h3><p>来源与年限不变，确认领悟后生成这套魂技。</p>{advised.skills.map((skill:any,i:number)=><AbilityDetails key={i} skill={skill} showAvailability={false}/>)}<Button variant="secondary" onClick={()=>{setAdvised(null);setRequestedSkills(undefined);setDesignValid(true);setAdvised(null);setDiscuss(false);}}>取消此设计，改用自动领悟</Button></section>:<RingExchangeEditor key={'exchange:'+soulId} source={{itemId,martialSoulId:soulId}} onChange={setRequestedSkills} onValidity={setDesignValid}/>}
      <p>确认吸收时消耗物品。已生成的方案可以稍后选择。</p>
      {message&&<p role="alert" className="danger-text">{message}</p>}
    </>:<p role="alert">这枚魂环已经不在行囊中，请返回查看。</p>}
  </Modal>;
}
