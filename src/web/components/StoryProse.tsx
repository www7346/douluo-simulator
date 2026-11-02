import {useMemo,type ReactNode} from 'react';
import {storyActionFooter} from '../../shared/story-action-options';
import type {StoryTurn} from '../../runtime/story-turns';
import {storyInlineCards,storyInlinePersonPortrait,storyInlineBattleSettlement,completeStoryInlinePresentation,type StoryInlineCard,type StoryInlinePresentation} from '../../shared/story-inline-cards';
import type {PortraitPerson} from '../../runtime/visual-identity';
import CharacterPortrait from './CharacterPortrait';
import {BattleActionJudgments} from './StoryBattleReport';
import './story-inline-cards.css';

function Resources({hp,hpMax,sp,spMax,shield}:{hp?:number;hpMax?:number;sp?:number;spMax?:number;shield?:number}){return <div className="story-inline-card__resources">{typeof hp==='number'&&<span>生命 <b>{hp}{typeof hpMax==='number'?` / ${hpMax}`:''}</b></span>}{typeof sp==='number'&&<span>魂力 <b>{sp}{typeof spMax==='number'?` / ${spMax}`:''}</b></span>}{typeof shield==='number'&&shield>0&&<span>护盾 <b>{shield}</b></span>}</div>;}
export function StoryInlineCardView({card,portrait,settlement,state,figureUrl}:{card:StoryInlineCard;portrait?:PortraitPerson;settlement?:ReturnType<typeof storyInlineBattleSettlement>;state?:any;figureUrl?:string}){
 const data=card.data;
 return <aside className="story-inline-card" aria-label={card.kind==='person'?`${card.title}的人物资料`:`${card.source.moment}·判定记录`}>
  <header><strong>{card.title}</strong>{card.title!==card.source.moment&&<small>{card.source.moment}</small>}</header>
  {card.kind==='person'?<>
   <div className="story-inline-card__person"><span className="conversation-avatar"><CharacterPortrait frozen state={state} figureUrl={figureUrl} person={portrait??{id:data.canonicalId??data.id,name:data.name,kind:data.canonicalId?'character':'resident'}}/></span><span>{[data.identity,data.occupation,typeof data.level==='number'?`${data.level}级`:null,data.rank?.name,data.lifeStatus].filter(Boolean).join(' · ')}</span></div>
   <Resources hp={data.resources?.生命?.当前} hpMax={data.resources?.生命?.最大} sp={data.resources?.魂力?.当前} spMax={data.resources?.魂力?.最大} shield={data.resources?.生命?.临时}/>
   {!!data.martialSouls?.length&&<p>{data.martialSouls.map((s:any)=>s.name).join(' · ')}</p>}
   {!!data.ownedRings?.length&&<details><summary>魂环 · {data.ownedRings.length}枚</summary>{data.ownedRings.map((r:any)=><span className="story-inline-card__ring" key={r.id}>第{r.ordinal}环 · {r.years}年 · {r.color}色</span>)}</details>}
  </>:card.kind==='battle-state'?<div className="story-inline-card__units">{data.units.map((unit:any)=>{
   const after=settlement?.participants?.find((p:any)=>p.id===unit.id)?.afterSettlement;
   return <div key={unit.id}><strong>{unit.name}</strong><Resources hp={unit.hp} hpMax={unit.hpMax} sp={unit.sp} spMax={unit.spMax} shield={unit.shield}/><small>{unit.hp===0&&after?.life==='存活'?'交锋中生命归零':unit.life}{unit.statuses?.length?' · '+unit.statuses.map((s:any)=>s.name).join('、'):''}</small>{after&&<p><small>{settlement!.kind}结算后：{after.life??'状态未记录'} · 生命 {after.hp} · 魂力 {after.sp}</small></p>}</div>;
  })}</div>:card.kind==='battle-action'?<BattleActionJudgments action={data}/>:<p>{data.reason}</p>}
 </aside>;
}
export default function StoryProse({turn,actionChoices,state,figureUrl}:{turn:StoryTurn;actionChoices?:ReactNode;state?:any;figureUrl?:string}){
 const cards=useMemo(()=>storyInlineCards(turn),[turn]);
 const prose=turn.prose??'';let presentation:StoryInlinePresentation|undefined;
 const retained=new Set(turn.inlinePresentation?.placements.map(p=>p.cardId));
 try{presentation=completeStoryInlinePresentation(prose,turn.inlinePresentation,cards.filter(c=>c.kind==='person'||retained.has(c.id)));}catch{return <><div className="story-chat__prose">{prose}<small role="status">这段故事的附卡暂时无法显示，正文已保留。</small></div>{actionChoices}</>;}
 const placements=presentation?.placements??[];
 const footer=actionChoices?storyActionFooter(prose):undefined;
 // Never lose a source card if a stored placement reaches into the footer.
 const displayEnd=footer&&placements.every(p=>p.offset<=footer.start)?footer.start:prose.length;
 let start=0;const content:React.ReactNode[]=[];
 for(const [i,placement] of placements.entries()){
  content.push(<div className="story-chat__prose" key={`text-${i}`}>{prose.slice(start,placement.offset)}</div>);
  const card=cards.find(c=>c.id===placement.cardId)!;
  content.push(<StoryInlineCardView state={state} figureUrl={figureUrl} key={placement.cardId} card={card} portrait={storyInlinePersonPortrait(turn,card)} settlement={storyInlineBattleSettlement(turn,card)}/>);start=placement.offset;
 }
 content.push(<div className="story-chat__prose" key="text-last">{displayEnd<prose.length?prose.slice(start,displayEnd).trimEnd():prose.slice(start)}</div>);
 return <div className="story-prose">{content}{actionChoices}</div>;
}
