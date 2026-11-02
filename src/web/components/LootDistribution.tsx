import {useState} from 'react';
import {Button} from '../components';
import CharacterPortrait from './CharacterPortrait';
import {useGame} from '../game-context';
import {useServerQuery} from '../use-game-query';
import {playerText} from '../../runtime/player-text';

export default function LootDistribution(){
  const {controller,view,state}=useGame(),query=useServerQuery<any>('expedition.allocations'),[error,setError]=useState(''),distributions=query.data?.distributions??[],reactions=query.data?.reactions??[];
  if(!distributions.length&&!reactions.length)return null;
  const collect=async(allocationId:string)=>{setError('');try{await controller.dispatch('expedition.collect-returned-loot',{allocationId});}catch(e){setError((e as Error).message);}};
  return <>{distributions.map((row:any)=><section key={row.allocationId} className="loot-distribution-notice" aria-label="带回的收获"><p>共同材料按份额分配，物品按约定优先归属，其他物品收进行囊。</p><Button disabled={view.busy} onClick={()=>void collect(row.allocationId)}>收取带回的收获</Button></section>)}{error&&<p role="alert">{playerText(error,state)}</p>}
    {reactions.length>0&&<section className="loot-reaction-notice" aria-label="战利品回应"><h3>队友的回应</h3>{reactions.map((message:any)=><article className="loot-reaction-message" key={message.id}><span className="loot-reaction-portrait"><CharacterPortrait state={state} figureUrl={view.figureUrl} person={{...state.人物.列表[message.speakerId],id:message.speakerId,name:message.name}}/></span><div><strong>{playerText(message.name,state)}</strong><p>{playerText(message.text,state)}</p></div></article>)}<small className="muted">也可在通讯的「人物私信与群组」中继续交谈。</small></section>}
  </>;
}
