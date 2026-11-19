import {playerCopy} from '../../runtime/player-copy';
import {useState} from 'react';
import {useServerQuery} from '../use-game-query';
import {Button} from '../components';
import QueryStatus from './QueryStatus';
import PersonAgreements from './PersonAgreements';
import PersonContracts from './PersonContracts';

export function PersonRelationshipSummary({data}:{data:any}){
 const identity=data.context?.relationship?.label,ordinary=data.current?.label,history=data.context?.history??[],sparring=data.sparring??[];
 return <>{typeof data.score==='number'&&<p>对你的态度 <strong>{data.score}</strong></p>}{data.attitudeChanges?.length>0&&<details><summary>最近的态度变化</summary><ul>{data.attitudeChanges.map((e:any)=><li key={e.sourceId}>第 {e.day} 日 · {e.label} {e.delta>0?'+':''}{e.delta}</li>)}</ul></details>}{data.party&&<p className="person-membership">{data.party.membership==='long-term'?'长期队友':'临时队友'} · {data.party.present?'当前在场':'暂不在场'}</p>}<p><strong>{identity||ordinary||(data.party?'已建立同行约定':sparring.length?'已有切磋往来':'尚无交往记录')}</strong></p>{identity&&ordinary&&identity!==ordinary&&<p>交往关系：{ordinary}</p>}
  {history.length>0&&<details><summary>共同经历 · {history.length}</summary><ul>{history.map((event:any,index:number)=><li key={event.sourceId+':'+event.kind+':'+index}>{playerCopy(event.text)}</li>)}</ul></details>}
  {sparring.length>0&&<details open><summary>最近切磋 · {sparring.length}</summary><ul>{[...sparring].reverse().map((record:any)=><li key={record.battleId}>你的结果：{record.settledSpar.playerOutcome}。{playerCopy(record.settledSpar.summary)}</li>)}</ul></details>}
 </>;
}

export default function PersonRelationship({characterId}:{characterId:string}){
 const [before,setBefore]=useState(-1),[page,setPage]=useState('overview'),query=useServerQuery('character.relationship',{characterId,before});
 if(!query.data)return <QueryStatus query={query}/>;
 const data=query.data;
 return <section className="person-relationship-page" aria-label="与你的关系">
 {page==='overview'?<><PersonRelationshipSummary data={data}/><div className="person-interaction-grid"><button onClick={()=>setPage('history')}><strong>查看关系历程</strong><span>关系变化与同行约定的经过</span></button>{data.registered&&<><button onClick={()=>setPage('contracts')}><strong>契约与约定</strong><span>查看生效条款或拟定新契约</span></button><button onClick={()=>setPage('hiring')}><strong>雇佣账目</strong><span>费用、付款与退款记录</span></button></>}</div></>:<>
 <header className="person-interaction-page-heading"><Button variant="ghost" onClick={()=>setPage('overview')}>‹ 返回关系概况</Button><h3>{page==='history'?'关系历程':page==='contracts'?'契约与约定':'雇佣账目'}</h3></header>
 {page==='contracts'?<PersonContracts personId={data.personId}/>:page==='hiring'?<PersonAgreements personId={data.personId} initialCategory="agreements" showContracts={false}/>:<>
 {data.records.map((record:any)=><article className="person-history-record" key={record.id}><h4>{record.label} · {record.status}</h4>{record.events.map((event:any,index:number)=><p key={index}>第 {event.time.day} 日 · {event.status}{event.reason?`：${playerCopy(event.reason)}`:''}</p>)}</article>)}
 <div className="field-actions">{data.nextBefore!==null&&<Button variant="ghost" onClick={()=>setBefore(data.nextBefore)}>更早的关系记录</Button>}{before!==-1&&<Button variant="ghost" onClick={()=>setBefore(-1)}>返回最新记录</Button>}</div>
 {data.registered&&<PersonAgreements personId={data.personId} showContracts={false}/>}</>}
 </>}
 </section>;
}
