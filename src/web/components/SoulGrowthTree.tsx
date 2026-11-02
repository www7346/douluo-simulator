import {playerDescription} from '../../runtime/player-copy';
import {useState} from 'react';
import {artwork} from '../../runtime/art-catalog';
import {PortraitImage} from './PortraitArt';
import AbilityDetails from './AbilityDetails';
import '../begonia-tree.css';

/** A view of the existing ring route. Opening a node never acquires an ability. */
export default function SoulGrowthTree({soul,rings,catalog,content}:{soul:any;rings:any[];catalog:any[];content:any}){
 const [selected,setSelected]=useState(1),node=content.get(selected);
 const own=(n:any)=>catalog.find(entry=>entry.source.soulId===soul.id&&(content.ownsPreset?content.ownsPreset(n,entry.skill):entry.skill.presetId===n.presetId)&&content.matches(n,entry.skill));
 const learned=own(node),ring=rings.find(r=>r.序号===selected);
 return <section className="begonia-tree" aria-label={content.SOUL.name+'技能成长路线'} data-spirit={content.SOUL.id}>
  <header className="begonia-tree__heading"><div><small>{content.TREE?.tagline??'碧心凝露 · 一脉护生'}</small><h3>{content.SOUL.name} · 技能成长路线</h3><p>{content.TREE?.description??'救急、续疗与群体救护相互补足；第七环以真身贯通花息。'}</p></div><span>已吸收 {rings.length} 环</span></header>
  <div className="begonia-tree__layout"><div className="begonia-tree__paths">{Object.keys(content.TREE?.branches??{急救:'',续疗:'',群体:''}).map(branch=><section key={branch} aria-label={branch+'路线'}><header><h4>{branch}</h4><p>{(content.TREE?.branches??{急救:'稳住伤者，再涤去浊息',续疗:'延续生机，盛放本源',群体:'花雨照拂并肩之人'})[branch]}</p></header><ol>{content.NODES.filter((n:any)=>n.branch===branch).map((n:any)=>{const actual=own(n),hasRing=rings.some(r=>r.序号===n.ordinal);return <li key={n.id}><button type="button" aria-pressed={selected===n.ordinal} aria-label={`第${n.ordinal}魂环 ${n.name} ${actual?'已获得':hasRing?'本环已有其他技能':'成长方向'}`} data-learned={!!actual} onClick={()=>setSelected(n.ordinal)}><PortraitImage art={artwork(n.artId)} name={n.name}/><span><small>第{n.ordinal}魂环</small><b>{n.name}</b><em>{actual?'已获得':hasRing?'本环已有其他技能':'成长方向'}</em></span></button></li>;})}</ol></section>)}</div>
  <aside className="begonia-tree__detail" aria-label="成长技能详情"><PortraitImage art={artwork(node.artId)} name={node.name}/><small>第{node.ordinal}魂环 · {node.subtitle}</small><h3>{node.name}</h3>{learned?<AbilityDetails skill={learned.skill} showName={false}/>:<><p>{playerDescription(node.description)}</p><p className="begonia-tree__summary">{node.summary}</p><p className="muted">{ring?'这一环已习得其他技能。':'尚未获得。吸收相应魂环时，可从符合来源与年限的候选中选择。'}</p></>}<p className="begonia-tree__note">{content.TREE?.note??'本游戏设计的治疗成长路线。'}</p></aside></div>
 </section>;
}
