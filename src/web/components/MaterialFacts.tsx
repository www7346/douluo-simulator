import type {materialFacts,MaterialSummary} from '../../runtime/player-presentation';
import {useServerQuery} from '../use-game-query';
import {useGame} from '../game-context';
import {playerText,materialPartName} from '../../runtime/player-text';

export default function MaterialFacts({material,compact=false,facts:provided,summary}:{material:any;compact?:boolean;facts?:ReturnType<typeof materialFacts>;summary?:MaterialSummary}) {
  const {state}=useGame();
  const query=useServerQuery<ReturnType<typeof materialFacts>>('presentation.material',{material},{enabled:!provided&&!(compact&&summary)});
  const facts=provided??query.data,brief=summary??facts;
  const pending=<small role={query.error?'alert':'status'}>{query.error?<button onClick={query.retry}>材料信息未读取，点击重试</button>:'正在读取材料…'}</small>;
  if(compact){if(!brief)return pending;return <span className="material-facts material-facts--compact"><small>{materialPartName(material,state)} · {brief.value} 工艺价值</small>{brief.attributes.length>0&&<small title={brief.attributes.map(a=>a.name).join('、')}>{brief.attributes.slice(0,2).map(a=>a.name).join(' · ')}{brief.attributes.length>2?' …':''}</small>}</span>;}
  if(!facts)return pending;
  return <span className="material-facts">
    {!compact&&material.description&&<small>{playerText(material.description,state,'')}</small>}
    <small>{facts.quality} · 持有 {facts.quantity} 份 · 每份工艺价值 {facts.value}</small>
    {facts.attributes.length>0&&<small>属性：{facts.attributes.map(attribute=>`${attribute.name} ${attribute.strength}`).join('、')}</small>}
    {facts.uses.length>0&&<small>用途：{facts.uses.join('、')}</small>}
    {!compact&&facts.sources.length>0&&<small>来自：{facts.sources.slice(0,3).join('、')}{facts.sources.length>3?`等 ${facts.sources.length} 个来源`:''}</small>}
  </span>;
}
