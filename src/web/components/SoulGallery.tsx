import CharacterPortrait from './CharacterPortrait';
import {ownedNineBeautiesSouls,residentRingSlot} from '../../shared/resident-realm-ui';
import {useServerQuery} from '../use-game-query';
import PersonLink from './PersonLink';
import SpiritIllustration from './SpiritIllustration';
import SoulImageEditor from './SoulImageEditor';
import {playerSoulImageSlot} from '../../runtime/soul-images';
import {useMemo,useRef,useState} from 'react';
import {useGame} from '../game-context';
import {Button,Modal,SoulRing} from '../components';
import {skillArtwork} from '../../runtime/generated-art';
import {skillName} from '../../runtime/player-text';
import {abilityPage,ABILITY_KIND_LABELS,soulYearsLabel} from '../../runtime/ability-sources';
import {PortraitImage} from './PortraitArt';
import GradeBadge,{soulGrade} from './GradeBadge';
import AbilityDetails from './AbilityDetails';
import SoulGrowthTree from './SoulGrowthTree';
import {useGameQuery} from '../use-game-query';
import QueryStatus from './QueryStatus';
import {describeError} from '../controller';

export default function SoulGallery({souls,catalog,onExport,onInspectRing,onOpenRealm,actorId,activeSoulId,ringRecords,readOnly=false}:{actorId?:string;activeSoulId?:string;ringRecords?:Record<string,any>;readOnly?:boolean;onOpenRealm?:(soulId:string,personId?:string)=>void;souls:any[];catalog:Array<{skill:any;source:import('../../runtime/ability-sources').AbilitySource}>;onExport?:(soul:any)=>void;onInspectRing:(id:string)=>void}) {
  const {state,view,controller}=useGame();
  const archiveRef=useRef<HTMLElement>(null);
  const playerId=actorId??state.角色.主控单位ID,self=!readOnly&&playerId===state.角色.主控单位ID,active=activeSoulId??state.成长.列表[playerId]?.激活武魂ID;
  const realmQuery=useServerQuery<any>('presentation.resident-realms',{scope:'gallery'}, {enabled:self&&ownedNineBeautiesSouls(state,playerId).length>0});
  const [imageOpen,setImageOpen]=useState(false),[group,setGroup]=useState(souls.length?'ring':'other'),[soulId,setSoulId]=useState(active),[ringId,setRingId]=useState(''),[skillId,setSkillId]=useState(''),[page,setPage]=useState(0),[kind,setKind]=useState('all');
  const [switchError,setSwitchError]=useState<{context:string;message:string}|null>(null);

  const soul=souls.find(s=>s.id===soulId)??souls[0];
  const growthContent=[globalThis.SoulBegoniaContent,globalThis.SoulRoyalSwanContent,...globalThis.SoulCanonicalWomenContent.PROFILES].find(content=>content.NODES.length&&content.isSoul(soul)),hasGrowthRoute=!!growthContent;
  const inBattle=state.战斗?.状态==='进行中';
  const switchContext=`${view.sessionId}:${view.snapshot.revision}:${soul?.id}`;
  const switchPreview=useGameQuery(`soul-switch:${playerId}:${soul?.id}`,()=>controller.previewWorldIntent({type:'switch-martial-soul',entityId:playerId,martialSoulId:soul?.id}),{enabled:Boolean(self&&soul&&soul.id!==active&&group==='ring'&&!inBattle)});
  const switchRequiresBattleConsole=inBattle||Boolean(switchPreview.data?.costsMainAction);
  const rings=(soul?.魂环ID列表??[]).map((id:string)=>(ringRecords??state.魂环.列表)[id]).filter(Boolean).sort((a:any,b:any)=>a.序号-b.序号);
  const ring=rings.find((r:any)=>r.id===ringId)??rings[0],realm=realmQuery.data?.realms?.find((r:any)=>r.soulId===soul?.id),bound=residentRingSlot(realmQuery.data?.realms??[],soul?.id,ring?.序号);
  const other=catalog.filter(entry=>['other','basic'].includes(entry.source.group));
  const entries=group==='ring'?catalog.filter(entry=>entry.source.soulId===soul?.id&&entry.source.ringId===ring?.id):other.filter(entry=>kind==='all'||entry.source.kind===kind);
  const paged=abilityPage(entries,page,8),entry=entries.find(e=>e.skill.id===skillId)??paged.items[0],skill=entry?.skill;
  const reset=()=>{setSkillId('');setPage(0);};
  return <section ref={archiveRef} className="ability-archive" aria-label="武魂与技能">
    <nav className="ability-tabs" aria-label="能力分类">{[['ring','魂环技能'],...(hasGrowthRoute?[['tree','成长路线']]:[]),['other','其他技能']].map(([id,label])=><button key={id} aria-pressed={group===id} onClick={()=>{setGroup(id);reset();if(id==='tree')requestAnimationFrame(()=>archiveRef.current?.scrollIntoView({block:'start'}));}}>{label}</button>)}{self&&<a href="#/inventory">装备与道具 →</a>}</nav>
    {group==='tree'&&hasGrowthRoute?<SoulGrowthTree soul={soul} rings={rings} catalog={catalog} content={growthContent}/>:group==='ring'&&soul?<>
      <nav className="ability-souls" aria-label="查看武魂">{souls.map(s=><button key={s.id} aria-pressed={s.id===soul.id} onClick={()=>{setSoulId(s.id);setRingId('');reset();}}>{s.名称}<small>{s.id===active?'当前激活':'仅查看'}</small></button>)}</nav>
      <div className="ability-soul-summary"><SpiritIllustration soul={soul} slot={self?undefined:''} className="spirit-illustration"/><div><h2>{soul.名称} <GradeBadge grade={soulGrade(soul.品级标签)}/></h2><p>{soul.定位} · 已有 {rings.length} 枚魂环</p>
        {self&&soul.id!==active&&!inBattle&&<QueryStatus query={switchPreview} label="正在检查切换条件…"/>}
        {switchError?.context===switchContext&&<p role="alert" className="danger-text">{switchError.message}</p>}
        {self&&<div className="field-actions">{soul.id!==active&&<Button disabled={view.busy||switchRequiresBattleConsole||switchPreview.loading||Boolean(switchPreview.error)||!switchPreview.data} onClick={()=>{
          setSwitchError(null);
          void controller.dispatch('world.intent',{type:'switch-martial-soul',entityId:playerId,martialSoulId:soul.id}).catch(error=>setSwitchError({context:switchContext,message:describeError(error,state)}));
        }}>{switchRequiresBattleConsole?'请在战斗战术栏切换':'激活此武魂'}</Button>}{soul.id===active&&<Button variant="secondary" disabled={view.busy||inBattle} onClick={()=>void controller.dispatch('world.intent',{type:'retract-martial-soul',entityId:playerId}).catch(error=>setSwitchError({context:switchContext,message:describeError(error,state)}))}>{inBattle?'战术栏可收回武魂':'收回武魂 · 1分钟'}</Button>}{onOpenRealm&&ownedNineBeautiesSouls(state).some(s=>s.id===soul.id)&&<Button onClick={()=>onOpenRealm(soul.id)}>展开九美图</Button>}<Button variant="secondary" onClick={()=>setImageOpen(true)}>更换武魂图片</Button><Button variant="ghost" onClick={()=>onExport?.(soul)}>导出配置</Button></div>}
      </div></div>
      <nav className="ability-rings" aria-label="选择来源魂环">{Array.from({length:9},(_,i)=>{const r=rings.find((r:any)=>r.序号===i+1);return <button key={i} disabled={!r} aria-pressed={Boolean(r&&r.id===ring?.id)} onClick={()=>{setRingId(r.id);reset();}}>{r?<SoulRing index={r.序号} years={r.年限} color={r.颜色}/>:<span className="ability-empty-ring">{i+1}</span>}<b>第{i+1}魂环</b><small>{r?soulYearsLabel(r.年限):'尚未获得'}</small>{realm&&r&&(()=>{const slot=realm.slots.find((s:any)=>s.index===i+1);return slot?<><span className="ability-ring-resident"><CharacterPortrait person={slot.person} state={state} large/></span><small>{slot.name}</small></>:<small>未绑定人物</small>;})()}{r&&<small>{r.魂技ID列表.length}项技能</small>}</button>;})}</nav>
    </>:group==='ring'?<p>尚未觉醒武魂，可切换到其他技能查看已有能力。</p>:<div className="ability-other-filters"><p>武魂本能、魂骨及其他非魂环能力。被动效果无需施放。</p><label>能力来源<select value={kind} onChange={e=>{setKind(e.target.value);reset();}}><option value="all">全部来源</option>{[...new Set(other.map(e=>e.source.kind))].map(id=><option key={id} value={id}>{ABILITY_KIND_LABELS[id]??'其他技能'}</option>)}</select></label></div>}
    {group==='ring'&&bound&&<section className="resident-ring-detail" aria-label="魂环绑定人物"><h3>第{bound.index}魂环 · {bound.name}</h3><p>{(bound.equipment??[]).map((item:any)=>item.name).join(' · ')}</p><div className="resident-ring-detail__figure"><PersonLink personId={bound.personId}><CharacterPortrait person={bound.person} state={state} large/></PersonLink></div><p>{bound.level}级 · 服从度 {bound.obedience}/100 · 对应魂环 {bound.ringLink.years}年 · 属性增幅 {bound.ringLink.percent}%</p>{onOpenRealm&&<Button onClick={()=>onOpenRealm(soul.id,bound.personId)}>在画卷中查看{bound.name}</Button>}</section>}
    {group!=='tree'&&<div className="ability-workspace"><section className="ability-library"><header><h3>{group==='ring'?(ring?'第'+ring.序号+'魂环 · '+soulYearsLabel(ring.年限):'尚未吸收魂环'):'其他技能'}</h3>{group==='ring'&&ring&&<button className="text-link" onClick={()=>onInspectRing(ring.id)}>查看魂环来源 ↗</button>}</header>
      <div className="ability-skill-grid">{paged.items.map(e=><button key={e.skill.id} data-skill-id={e.skill.id} aria-pressed={e.skill.id===skill?.id} onClick={()=>setSkillId(e.skill.id)}><PortraitImage art={skillArtwork(e.skill)} name={skillName(e.skill,state)}/><span><b>{skillName(e.skill,state)}</b><small>{e.source.label}</small>{e.source.issue&&<small className="danger-text">暂时无法读取这项能力</small>}</span></button>)}</div>
      {!entries.length&&<p className="muted">{group==='ring'?'获得魂环后，可在这里查看本环的全部技能。':'当前没有此类能力。'}</p>}
      {paged.count>1&&<nav className="ability-pagination"><button disabled={!paged.index} onClick={()=>{setPage(paged.index-1);setSkillId('');}}>上一页</button><span>{paged.index+1} / {paged.count} · 共{paged.total}项</span><button disabled={paged.index===paged.count-1} onClick={()=>{setPage(paged.index+1);setSkillId('');}}>下一页</button></nav>}
    </section><aside className="ability-inspector" aria-label="所选技能详情">{skill?<><header><PortraitImage art={skillArtwork(skill)} name={skillName(skill,state)}/><div><small>{entry.source.label}</small><h2>{skillName(skill,state)}</h2></div></header>{entry.source.issue&&<p className="danger-text">暂时无法读取这项能力，请重新打开。</p>}<AbilityDetails skill={skill} showName={false}/></>:<p>选择一项技能，查看完整效果。</p>}</aside></div>}
    <Modal open={imageOpen} className="appearance-modal" title="更换武魂图片" onClose={()=>setImageOpen(false)}>{imageOpen&&<SoulImageEditor key={view.sessionId+'-'+soul.id} soul={soul} slot={playerSoulImageSlot(state,soul.id)} onSaved={()=>setImageOpen(false)}/>}</Modal>
  </section>;
}
