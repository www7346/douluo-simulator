import {useState} from 'react';
import type {characterCombatArchive} from '../../runtime/character-archive';
import {useServerQuery} from '../use-game-query';
import QueryStatus from './QueryStatus';
import {playerText,skillName} from '../../runtime/player-text';
import AbilityDetails,{PassiveDetails} from './AbilityDetails';
import GradeBadge,{soulGrade} from './GradeBadge';
import {Button} from '../components';

export default function CharacterCombatArchive({characterId,state,battleCapable=true,expanded=false,historical=false}:{historical?:boolean;characterId:string;state?:any;battleCapable?:boolean;expanded?:boolean}) {
 const [open,setOpen]=useState(expanded);
 const query=useServerQuery<ReturnType<typeof characterCombatArchive>>('presentation.archive',{characterId,...(historical?{scope:'historical-projection'}:{})},{enabled:open});
 const archive=query.data;
 const text=(value:unknown,fallback='')=>playerText(value,state,fallback);
 const ability=(skill:any)=><details className="archive-ability" key={skill.id}><summary><span>{skillName(skill,state)}</span><small>{skill.displayInfo?.activation==='passive'?'被动':`魂力 ${skill.soulPowerCost??0}`}</small></summary><AbilityDetails skill={skill} showName={false} showAvailability={false}/></details>;
 return <section className="character-combat-archive">
  {!expanded&&<Button variant="secondary" onClick={()=>setOpen(!open)} aria-expanded={open}>{open?'收起详细资料':battleCapable?'查看魂环与战斗能力':'查看随身物品'}</Button>}
  {open&&archive&&<div className="character-combat-archive__body">
   <p>{historical?'这里记下了历史投影的武魂、魂环与装备。':archive.source==='catalog-sample'?'你尚未与此人相遇，以下为人物志资料；相遇后可查看近况。':'这里记下了对方当前的能力与随身物品。'}</p>
   {archive.battleCapable&&<div className="archive-resources"><span>生命上限 <b>{archive.healthMax??'未明'}</b></span><span>魂力上限 <b>{archive.soulPowerMax??'未明'}</b></span></div>}
   {archive.souls.map(soul=><section key={soul.id}><h4 className="grade-name" data-grade={soulGrade(soul.grade)?.id}>{text(soul.name,'武魂')} <GradeBadge grade={soulGrade(soul.grade)}/></h4>{soul.rings.map((ring:any)=><div className="archive-ring" key={ring.id}><span className="eyebrow">第{ring.ordinal}魂环 · {ring.years}年</span>{ring.skills.map(ability)}</div>)}</section>)}
   {archive.otherSkills.length>0&&<section><h4>{archive.kind==='soul-beast'&&!archive.souls.length?'魂兽能力':'其他招式'}</h4>{archive.otherSkills.map(ability)}</section>}
   {archive.items.length>0&&<section><h4>随身物品与装备</h4>{archive.items.map((item:any)=><details className="archive-item" key={item.itemId}><summary data-grade={item.grade?.id}>{text(item.name,'随身装备')} <GradeBadge grade={item.grade}/><small>{text(item.type)}{item.quantity>1?` · ${item.quantity}件`:''}</small></summary>{item.description&&<p>{text(item.description)}</p>}<PassiveDetails modifiers={item.modifiers} passive={item.passiveCombat}/>{item.passiveEffectGraph&&<AbilityDetails skill={{name:"装备被动",category:item.type,effectGraph:item.passiveEffectGraph}} presentation={item.passiveInfo} showAvailability={false}/>} {item.skills.map(ability)}</details>)}</section>}
  </div>}
  {open&&<QueryStatus query={query}/>}
  {open&&archive===null&&<p>这份卷宗尚未记载战斗能力。</p>}
 </section>;
}
