import {useState} from 'react';
import {useServerQuery} from '../use-game-query';
import {Button,Progress} from '../components';
import QueryStatus from './QueryStatus';
import GrowthAllocation from './GrowthAllocation';
import type {InspectionEffect} from '../../runtime/character-status-presentation';

/** Shared inspect sheet. The server supplies current effective values and source lifetimes. */
export default function CharacterInspection({facts,self=false}:{facts:any;self?:boolean}){
 const [allocate,setAllocate]=useState(false),[filter,setFilter]=useState('全部');
 if(!facts||facts.hidden)return <p className="inspection-unavailable">当前无法获知这位人物的详细属性与效果。</p>;
 const effects:InspectionEffect[]=facts.effects??[],rows=effects.filter(row=>filter==='全部'||(filter==='负面'?row.negative:row.category===filter)),groups=[...new Set(rows.map(row=>row.category))];
 return <section className="character-inspection" aria-label="人物检视">
  {facts.projection&&<section aria-label="当前投影"><strong>意识正在投影中 · 输出{facts.projection.percent}%</strong><Progress label="投影生命" value={facts.projection.health.当前} maximum={facts.projection.health.最大} tone="life"/><Progress label={facts.projection.sharedSoulPower?'画主魂力（共用）':'投影魂力'} value={facts.projection.soulPower.当前} maximum={facts.projection.soulPower.最大} tone="soul"/><p className="muted">以下为原体状态；原体与投影共用本人经历。</p></section>}
  <div className={`inspection-resources${self?' inspection-resources--self':''}`}><strong>{facts.level?`${facts.level} 级`:''}</strong><Progress label="生命" value={facts.resources?.生命?.当前} maximum={facts.resources?.生命?.最大} tone="life"/><Progress label="魂力" value={facts.resources?.魂力?.当前} maximum={facts.resources?.魂力?.最大} tone="soul"/>{facts.experienceRequired&&<small>经验 {facts.experience} / {facts.experienceRequired}</small>}</div>
  <section className="inspection-attributes" aria-label="六维属性">{['力量','身法','体魄','悟性','感知','意志'].map(key=><div key={key}><strong>{facts.attributes?.有效?.[key]??'—'}</strong><span>{key}</span><small>基础 {facts.attributes?.基础?.[key]??'—'}</small></div>)}</section>
  {self&&<><Button className="inspection-allocate" variant="ghost" onClick={()=>setAllocate(value=>!value)}>{allocate?'收起加点':'分配属性'}</Button>{allocate&&<section className="inspection-allocation"><GrowthAllocation/></section>}</>}
  <dl className="inspection-derived">{['物理防御','魂技防御','物理命中','魂技命中','魂技DC','先攻','移动区','抗打断'].map(key=><div key={key}><dt>{key}</dt><dd>{facts.derived?.[key]??'—'}</dd></div>)}</dl>
  <div className="inspection-effects-heading"><h2>状态与效果 <small>{effects.length}</small></h2><label>筛选<select aria-label="筛选状态效果" value={filter} onChange={event=>setFilter(event.target.value)}>{['全部','负面',...new Set(effects.map(row=>row.category))].map(value=><option key={value}>{value}</option>)}</select></label></div>
  {!effects.length&&<p className="muted">当前没有额外生效的状态或特性。</p>}
  {groups.map(group=><section className="inspection-effect-group" key={group}><h3>{group}</h3><div>{rows.filter(row=>row.category===group).map(row=><article key={row.id} className={row.negative?'is-negative':''}><header><strong>{row.name}</strong><span>持续时间：{row.duration}</span></header><p className="inspection-source">来源：{row.source}</p><ul>{row.lines.map((line,index)=><li key={index}>{line}</li>)}</ul>{row.condition&&<small>{row.condition}</small>}</article>)}</div></section>)}
 </section>;
}
export function PersonInspection({personId}:{personId:string}){
 const query=useServerQuery<any>('presentation.inspection',{personId});
 if(query.loading&&!query.data)return <QueryStatus query={query}/>;
 return <><QueryStatus query={query}/><CharacterInspection facts={query.data}/></>;
}
