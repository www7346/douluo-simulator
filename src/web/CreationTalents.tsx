import {playerDescription} from '../runtime/player-copy';
import {useRef,useState} from 'react';
import {useCreationCatalog} from './creation-context';
import {PortraitImage} from './components/PortraitArt';
import {atlas} from './illustration-catalog';
import {Button} from './components';
const boonArt=(id:string)=>({src:`/art/opening-boons/${id}.webp`,cell:0,columns:1,rows:1});
const rewardArt=(id:string)=>['boon-ring','boon-bone','starter-supplies'].includes(id)?boonArt(id):atlas('fates',Math.max(0,['ring-choice','craft-choice','reroll','divine','sacrifice','million'].indexOf(id)),3,2,0);

export function CreationTalents({selection,onChange,sourcePreferences,onSourceChange,disabled=false,souls=[]}:{selection:any;onChange:(value:any)=>void;sourcePreferences:Record<string,string>;onSourceChange:(kind:string,sourceId:string)=>void;disabled?:boolean;souls?:any[]}) {
  const data=useCreationCatalog();
  const catalog=[...Object.values(data.talents).map((item:any)=>({...item,kind:'talent'})),...Object.values(data.opportunities).map((item:any)=>({...item,kind:'opportunity'}))].filter(item=>!item.hidden||selection.opportunities.some((v:any)=>v.kind===item.id));
  const [active,setActive]=useState('boon-ring');
  const detailRef=useRef<HTMLElement>(null);
  const selectEntry=(id:string)=>{setActive(id);if(window.matchMedia('(max-width:720px)').matches)requestAnimationFrame(()=>detailRef.current?.scrollIntoView({block:'start',behavior:'smooth'}));};
  const entry=catalog.find(item=>item.id===active)??catalog[0];
  const selected=(item:any)=>item.kind==='talent'?selection.talentIds.includes(item.id):selection.opportunities.some((value:any)=>value.kind===item.id);
  const toggle=(item:any)=>{
    const next=structuredClone(selection);
    if(item.kind==='talent')next.talentIds=selected(item)?next.talentIds.filter((id:string)=>id!==item.id):[...next.talentIds,item.id];
    else next.opportunities=selected(item)?next.opportunities.filter((value:any)=>value.kind!==item.id):[...next.opportunities,{kind:item.id,...(data.sources[item.id]?{sourceId:sourcePreferences[item.id]??'asura'}:{})}];
    onChange(next);
  };
  const gift=selection.opportunities.find((item:any)=>item.kind===entry.id);
  const sources=entry.enabled===false?null:data.sources[entry.id];
  const sourceChange=(sourceId:string)=>onSourceChange(entry.id,sourceId);
  const sourceId=gift?.sourceId??sourcePreferences[entry.id]??'asura';
  const sourceInfo=data.sourceDetails[`${entry.id}:${sourceId}`];
  const boon=['boon-ring','boon-bone'].includes(entry.id);
  const soulAttributes=[...new Set(souls.flatMap(soul=>(soul.attributes??[]).map((attribute:any)=>data.soul.ATTRIBUTE_REGISTRY[attribute.id]?.name).filter(Boolean)))];
  const matching=sourceInfo?.attributes?.filter((name:string)=>soulAttributes.includes(name))??[];
  const details:Record<string,string>={
    'boon-ring':'从十二种恩赐中选择一枚423年黄色魂环，可领悟一个与恩赐属性相应的魂技。吸收不受身体承载年限限制，仍需足够等级、经验和空环位。',
    'boon-bone':'十二来源任选一块500年魂骨，每块魂骨都有独特的魂骨技与护身之效，部位见下方说明。不占魂环位置，收入行囊后自行融合。',
    'starter-supplies':'铜纹护腕：普通攻击命中+2、伤害+3、魂技攻击命中+2。青玉坠：物理防御+2、魂技防御+2、生命上限+20。劲力丹、轻身丹、固元丹各3颗，分别提升力量、身法、体魄3点，持续4个自身战斗回合，可战前服用。另有1200金魂币，备好行囊再启程。',
    'ring-choice':'普通魂环和特殊机缘均适用。十万年每套最多两种魂技，百万年每套最多四种；最终选择一整套。可选方案取决于魂环与武魂的搭配。',
    'craft-choice':'研发新魂导器时增加候选方案；按已有图纸制作、炼药和打造暗器仍使用原来的候选数量。方案种类取决于配料。',
    reroll:'替换你指定的一整套魂技或一份魂导器方案，其余选择保持不变。每次选取各有一次机会，不重复消耗魂环或研发材料。',
    'attuned-423':'这项机缘已由恩赐魂环替代，请取消后重新选择。',
    sacrifice:'准备吸收时选择归属武魂，献祭魂兽与魂技会随它的属性生成。可以保留，以后再用。',
    divine:'神祇决定赐福的主题，具体魂技与你的武魂相融而生。确认启程后，神赐魂环会收入行囊，使用时再选择魂技。',
    million:'来源保持自身属性，选择适合你构想的一种。百万年魂环蕴藏远胜十万年的力量，适合与它属性相融的武魂。可领悟最多四种完整魂技。'
  };
  return <section className="opening-talents" aria-label="天赋与机缘"><header><span className="eyebrow">天赋与机缘</span><h2>天赋与机缘</h2><p>选择伴你启程的机缘。尚无魂技时，不妨雇佣一位同行者；遇到强敌，平安归来比深入险地更重要。</p></header>
    <div className="opening-talents__layout"><div className="opening-talents__list">{catalog.map((item,index)=><button type="button" key={item.id} className={`${active===item.id?'is-active ':''}${selected(item)?'is-selected':''}`} aria-pressed={active===item.id} onClick={()=>selectEntry(item.id)}><PortraitImage fit="meet" art={rewardArt(item.id)} name={item.name}/><small>{item.enabled===false?'暂时停用':item.kind==='talent'?'长久天赋':'一次机缘'}</small><strong>{item.name}</strong><p>{playerDescription(item.description)}</p><span>{item.cost} 造化点 <b>{selected(item)?'已选择':item.enabled===false?'暂时停用':'未选择'}</b></span></button>)}</div>
      <article ref={detailRef} className="opening-talents__detail"><span className="eyebrow">{entry.kind==='talent'?'A LASTING GIFT':'A FATE TO EMBRACE'}</span><PortraitImage art={rewardArt(entry.id)} name={entry.name} className="opening-talents__detail-art"/><h2>{entry.name}</h2><p>{entry.enabled===false?entry.description:details[entry.id]}</p>
        {entry.id==='boon-ring'&&<p className="opening-talents__condition">吸收时不受身体承载年限限制，仍需满足等级、经验和魂环位置要求。你可以先保留这份机缘。</p>}
        {boon&&<div className="boon-sources" aria-label="选择恩赐来源">{Object.entries(sources??{}).map(([id,name])=><button type="button" key={id} disabled={disabled} aria-label={String(name)} aria-pressed={sourceId===id} className={sourceId===id?'is-selected':''} onClick={()=>sourceChange(id)}><PortraitImage art={boonArt(entry.id==='boon-bone'?'bone-'+id:id)} name={String(name)}/><strong>{String(name)}</strong></button>)}</div>}{sources&&!boon&&<label>魂环来源<select disabled={disabled} value={gift?.sourceId??sourcePreferences[entry.id]} onChange={event=>sourceChange(event.target.value)}>{Object.entries(sources).map(([id,name])=><option key={id} value={id}>{String(name)}</option>)}</select>{!gift&&<small>先挑选来源，再决定是否选取这份机缘。</small>}</label>}
        {entry.enabled!==false&&!boon&&sourceInfo?.attributes&&<div className="opening-talents__source"><p>来源属性：{sourceInfo.attributes.join('、')}</p><p>力量主题：{sourceInfo.tags.join('、')}</p><small>{soulAttributes.length?(matching.length?'当前构想相合的属性：'+matching.join('、')+'。最终魂技还需与你的能力方向相融。':'当前构想没有相同属性，可能无法领悟完整魂技。可以先调整武魂，或换一种机缘。'):'完成武魂构想后，可在此查看属性是否相合。'}</small></div>}
        {boon&&sourceInfo&&<div className="opening-talents__source"><h3>{sourceInfo.name}</h3>{sourceInfo.description&&<p>{playerDescription(sourceInfo.description)}</p>}<p>来源属性：{sourceInfo.attributes.join('、')}</p><p>能力方向：{sourceInfo.channels.map((id:string)=>data.labels[id]??'魂力运用').join('、')}</p>{entry.id==='boon-bone'?<p>固定部位：{sourceInfo.slot} · 魂骨技：{sourceInfo.skillName}</p>:<p>恩赐影响魂技的属性与能力方向。</p>}</div>}<Button disabled={disabled||(entry.enabled===false&&!selected(entry))} onClick={()=>toggle(entry)} variant={selected(entry)?'secondary':'primary'}>{selected(entry)?'取消选择':entry.enabled===false?'暂时停用 · 等待平衡':`选择 · ${entry.cost} 造化点`}</Button>
      </article></div></section>;
}
