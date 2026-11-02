import {playerDescription} from '../../runtime/player-copy';
import {assetUrl} from '../asset-delivery';
import {PortraitImage} from './PortraitArt';
import {useEffect,useRef,useState,type CSSProperties,type ReactNode} from 'react';
import {Button,Modal,SoulRingHalo} from '../components';
import {gameAudio} from '../game-audio';
import {useGame} from '../game-context';
import {playerText} from '../../runtime/player-text';
import type {candidateCardPresentation} from '../candidate-presentation';
import AbilityDetails from './AbilityDetails';
import {useServerQuery} from '../use-game-query';
import QueryStatus from './QueryStatus';
import ChoiceEmblem from './ChoiceEmblem';
import GradeBadge,{type ValueGrade} from './GradeBadge';
import UiIcon from './UiIcon';
import ChoiceAvailability,{type ChoiceAvailabilityReport} from './ChoiceAvailability';

export interface ChoiceOption {id:string;revision:string;title:string;description:string;skills:any[];kind:string;grade?:ValueGrade;rerollReason?:string;canReplacePreset?:boolean;growthSummary?:string;testId?:string;choiceRole?:{id:string;label:string};fixedForm?:{id:string;name:string;bodyLabel:string;kind?:string}}
interface Props {
  title:string;subtitle:string;options:ChoiceOption[];tier?:string;ringYears?:number;sourceDetails?:ReactNode;
  onClose:()=>void;closeLabel:string;successCloseLabel?:string;confirmLabel:string;confirmTestId:string;
  onConfirm:(option:ChoiceOption)=>Promise<void>;onReroll?:(option:ChoiceOption)=>Promise<void>;rerollUsed?:boolean;onReplacePreset?:(option:ChoiceOption)=>Promise<void>;
  onName?:()=>Promise<void>;onLocalName?:()=>Promise<void>;emptyMessage?:string;blockedReason?:string;successLink:{href:string;label:string};
  requestedCount?:number;explainAvailability?:()=>ChoiceAvailabilityReport|Promise<ChoiceAvailabilityReport>;
  namingStatus?:{phase:string;reason:string};
}

export default function CandidateSelectionScene(props:Props){
  const {state,view,controller}=useGame();
  const [selected,setSelected]=useState<{id:string;revision:string}|null>(null);
  const [detail,setDetail]=useState<string|null>(null),[index,setIndex]=useState(0);
  const [working,setWorking]=useState(''),[error,setError]=useState('');
  const [reward,setReward]=useState<ChoiceOption|null>(null);
  useEffect(()=>{void gameAudio.play('reveal');},[]);
  const guard=useRef(false),rail=useRef<HTMLDivElement>(null),detailButton=useRef<HTMLButtonElement|null>(null),detailPanel=useRef<HTMLElement>(null);
  const option=props.options.find(entry=>entry.id===selected?.id&&entry.revision===selected.revision);
  const detailed=props.options.find(entry=>entry.id===detail);
  const candidateQuery=useServerQuery<Array<ReturnType<typeof candidateCardPresentation>>>('presentation.candidates',{options:reward?[reward]:props.options});
  const cards=candidateQuery.data;
  const busy=view.busy||Boolean(working)||!cards; 
  // A reroll changes mechanical identity; naming updates do not deselect a card.
  useEffect(()=>{if(selected&&!option)setSelected(null);},[selected,option]);
  useEffect(()=>{if(detail)detailPanel.current?.focus();},[detail]);
  useEffect(()=>{const shell=document.querySelector<HTMLElement>('.app-shell');if(!shell)return;const previous=shell.inert;shell.inert=true;return()=>{shell.inert=previous;};},[]);
  const execute=async(action:()=>Promise<void>,label:string)=>{
    if(guard.current||view.busy)return;
    guard.current=true;setWorking(label);setError('');
    try{await action();}catch(reason){setError(playerText((reason as Error).message,state,'暂时未能完成，请重试。'));}
    finally{guard.current=false;setWorking('');}
  };
  const move=(next:number)=>{
    const bounded=Math.max(0,Math.min(props.options.length-1,next));setIndex(bounded);
    const card=rail.current?.children[bounded] as HTMLElement|undefined;
    if(card&&rail.current)rail.current.scrollTo({left:card.offsetLeft-rail.current.offsetLeft,behavior:'instant'});
  };
  const back=()=>{if(detail){setDetail(null);requestAnimationFrame(()=>detailButton.current?.focus());}else props.onClose();};
  const rewardArt=reward?cards?.[0]:null;
  const actions=reward?<><Button variant="ghost" onClick={props.onClose}>{props.successCloseLabel??props.closeLabel}</Button><a className="button button--primary" href={props.successLink.href} onClick={props.onClose}>{props.successLink.label}</a></>:<>
    <div className="choice-scene__decision"><span>{option?`已选择 · ${option.title}`:'选择一张卡，留下属于你的力量'}</span><small>{props.blockedReason||'确认后无法改选'}</small></div>
    <Button variant="ghost" onClick={back}>{detail?'返回比较':props.closeLabel}</Button>
    <Button disabled={!option||busy||Boolean(props.blockedReason)} data-testid={props.confirmTestId} onClick={()=>option&&void execute(async()=>{await props.onConfirm(option);setReward(option);setDetail(null);},'正在铭刻')}>{working==='正在铭刻'?'正在完成…':props.confirmLabel}</Button>
  </>;
  return <Modal open className={`modal--candidate-scene ${props.ringYears?'choice-theme-soul':'choice-theme-craft'}${reward?' is-complete':''}`} title={reward?'这一份力量，属于你':props.title} onClose={back} actions={actions}>
    <div className="choice-scene soul-ring-palette" data-testid="candidate-selection-scene" data-tier={props.tier??'百万年'}>
      {reward&&rewardArt?<div className="choice-reward" data-grade={reward.grade?.id} role="status">{props.ringYears?<SoulRingHalo years={props.ringYears}/>:<PortraitImage art={rewardArt.art} name={reward.title} className="generated-art generated-art--reward"/>}<span className="eyebrow">{props.ringYears?'魂环吸收完成':'作品与图纸已获得'}</span><GradeBadge grade={reward.grade}/><h3>{reward.title}</h3><div className="choice-reward__skills">{reward.skills.map((skill,i)=><p key={i}><span aria-hidden="true">✓</span> {playerText(skill.name??skill.名称,state,reward.title)}</p>)}</div><p className="muted">{props.ringYears?'新的魂技已经掌握，可在魂师页面查看。':'作品已收入行囊，图纸可用于后续制造。'}</p></div>:<>
        <div className="choice-scene__context"><p>{props.subtitle}</p><div>{props.onReroll&&<span className="choice-reroll-count">{props.rerollUsed?'本次重抽已用完':'本次可重抽 1 次'}</span>}{props.sourceDetails&&<Button variant="ghost" onClick={()=>setDetail('source')}>魂环详情</Button>}{props.onName&&<Button variant="ghost" disabled={busy} onClick={()=>void execute(props.onName!,'正在取名')}>重新取名</Button>}{props.onLocalName&&<Button variant="ghost" disabled={busy} onClick={()=>void execute(props.onLocalName!,'正在整理作品')}>采用工坊命名</Button>}</div></div>
        <QueryStatus query={candidateQuery} label="正在展开候选效果…"/><ChoiceAvailability key={props.options.map(entry=>entry.revision).join('|')} requestedCount={props.requestedCount??props.options.length} actualCount={props.options.length} explain={props.explainAvailability}/>
        <div className="choice-scene__status" aria-live="polite">{view.modelTask?<><span className="choice-spark"/><span>{view.modelTask.phase??view.modelTask.label}…</span><Button variant="ghost" onClick={()=>controller.cancelModelTask()}>取消取名</Button></>:working?<span>{working}…</span>:null}{error&&<span role="alert">{error}</span>}</div>
        {!busy&&!error&&props.namingStatus&&props.namingStatus.phase!=='completed'&&<p className="choice-naming-notice" role="status">{props.namingStatus.phase==='running'?'上次取名未完成，当前没有正在运行的请求。':props.namingStatus.reason||'上次取名未完成。'} 方案与材料投入已保存；可重新取名或采用工坊命名。</p>}
        <div className="choice-scene__overview" hidden={Boolean(detail)}>{props.ringYears&&<div className="choice-guide" aria-hidden="true"><img src={assetUrl("/art/fantasy-v4/guide.png")} alt=""/></div>}
          <div className="choice-scene__rail" ref={rail} data-count={props.options.length} onScroll={event=>{const element=event.currentTarget;const children=Array.from(element.children) as HTMLElement[];const nearest=children.reduce((best,card,i)=>Math.abs(card.offsetLeft-element.offsetLeft-element.scrollLeft)<Math.abs((children[best]?.offsetLeft??0)-element.offsetLeft-element.scrollLeft)?i:best,0);setIndex(nearest);}}>
            {props.options.map((entry,i)=>{
              const art=cards?.[i];if(!art)return null;const active=entry.id===option?.id,multi=entry.skills.length>1,four=entry.skills.length===4;
              return <div className="choice-slot" key={entry.id} style={{'--choice-order':i} as CSSProperties}>
                <article className={`choice-card${active?' is-selected':''}${multi?' is-multi':''}${four?' is-four':''}`} data-testid="candidate-card" data-grade={entry.grade?.id} data-attribute={art.attribute} onClick={event=>{if(!busy&&!(event.target as HTMLElement).closest('button,details')){setSelected({id:entry.id,revision:entry.revision});setError('');void gameAudio.play('select');}}}>
                  <button className="choice-card__select" data-sound="select" aria-label={`选择${entry.title}`} aria-pressed={active} disabled={busy} data-testid={entry.testId} onClick={()=>{setSelected({id:entry.id,revision:entry.revision});setError('');}} onKeyDown={event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();const next=Math.max(0,Math.min(props.options.length-1,i+(event.key==='ArrowRight'?1:-1)));move(next);(rail.current?.children[next]?.querySelector('.choice-card__select') as HTMLElement)?.focus();}}}>{active?'已选择此方案':'选择此方案'}</button>
                  <div className="choice-card__crown" aria-hidden="true">✦</div><span className="choice-card__ordinal">{String(i+1).padStart(2,'0')} / {entry.fixedForm?.kind??entry.kind}{entry.fixedForm?.name&&entry.fixedForm.name!==entry.fixedForm.kind?' · '+entry.fixedForm.name:''}</span>
                  <div className="choice-card__art" key={entry.revision}><PortraitImage art={art.art} name={entry.title} className="generated-art generated-art--choice"/>{entry.kind!=='魂技'&&<span className="choice-card__effect-badge"><ChoiceEmblem motif={art.effectMotif}/></span>}</div>
                  <div className="choice-card__body">{entry.growthSummary&&<p>{entry.growthSummary}</p>}{entry.canReplacePreset&&props.onReplacePreset&&<Button className="choice-card__free-replace" disabled={busy||Boolean(props.blockedReason)} variant="secondary" onClick={()=>void execute(()=>props.onReplacePreset!(entry),'正在替换预设')}>免费换成随机方案（此槽1次）</Button>}<span className="choice-card__category">{entry.choiceRole?[...new Set([entry.choiceRole.label,...(entry.fixedForm?[entry.fixedForm.bodyLabel,entry.fixedForm.name]:[multi?`${entry.skills.length} 项魂技`:art.tags[0]])])].filter(Boolean).join(' · '):multi?`获得 ${entry.skills.length} 项魂技`:art.tags.slice(0,2).join(' · ')||entry.kind}</span><h3>{entry.title}</h3>{entry.grade&&<div className="choice-card__grade"><GradeBadge grade={entry.grade}/></div>}
                    <div className="choice-card__facts">{entry.description&&<details className="choice-card__flavor-toggle"><summary>阅读描述</summary><p className="choice-card__flavor">{playerDescription(entry.description)}</p></details>}{art.rows.map((row,j)=><section key={j}>{multi&&<h4><span>{j+1}</span>{row.name}{four&&<small>{[...row.costs,...row.limits].join(' · ')}</small>}</h4>}
                      <p className="choice-card__effect">{row.primary.join('；')||(entry.skills[j]?.hostDesign||entry.skills[j]?.host?'固定宿主能力':'被动强化')}</p>
                      {row.condition&&<p className="choice-card__target">被动部分：{row.condition}</p>}
                      {!multi&&<p className="choice-card__target">{row.context.join(' · ')}</p>}
                      {row.passive.length>0&&<p className="choice-card__passive">装备时 · {row.passive.join(' · ')}</p>}
                      {multi&&!four&&<p className="choice-card__cost">{[...row.costs,...row.limits].join(' · ')}</p>}
                    </section>)}</div>
                    {!multi&&art.rows[0]&&<p className="choice-card__summary">{[...art.rows[0].costs,...art.rows[0].limits].join(' · ')}</p>}
                  </div>
                  <button className="choice-card__details" onClick={event=>{detailButton.current=event.currentTarget;setDetail(entry.id);}}>查看完整能力 <span aria-hidden="true">↗</span></button>
{props.onReroll&&<button className="choice-reroll" disabled={busy||props.rerollUsed||Boolean(props.blockedReason)||Boolean(entry.rerollReason)} title={entry.rerollReason} aria-label={`重抽方案${i+1}`} onClick={()=>void execute(()=>props.onReroll!(entry),'正在重抽')}><UiIcon name="reroll"/>{props.rerollUsed?'已用完':entry.rerollReason?'暂无其他方案':'重抽此方案'}</button>}
                  <span className="choice-card__chosen" aria-hidden="true">{active?'已选定':'◇'}</span>
                </article>

                {props.onReroll&&entry.rerollReason&&!props.rerollUsed&&<small className="choice-reroll-reason">{entry.rerollReason}</small>}
              </div>;
            })}
          </div>
          {!props.options.length&&<div className="choice-scene__empty" role="status">{busy&&<span className="loading-ring"/>}<h3>{busy?'作品正在成形':'作品取名尚未完成'}</h3><p>{busy?(props.emptyMessage??'方案已保留，正在整理名称与介绍。'):'取名尚未完成。可以点击“重新取名”，或保留当前名称继续选择。本次重试不再消耗材料。'}</p></div>}
          {props.options.length>1&&<div className="choice-scene__pager"><Button variant="ghost" aria-label="上一个方案" disabled={index===0} onClick={()=>move(index-1)}>‹</Button><span>{index+1} / {props.options.length}</span><Button variant="ghost" aria-label="下一个方案" disabled={index===props.options.length-1} onClick={()=>move(index+1)}>›</Button></div>}
        </div>
        {detail&&<section className="choice-scene__details" tabIndex={-1} ref={detailPanel} aria-label="候选完整详情"><Button variant="ghost" onClick={back}>← 返回全部方案</Button>{detail==='source'?props.sourceDetails:detailed&&<><GradeBadge grade={detailed.grade}/><h3 className="grade-name" data-grade={detailed.grade?.id}>{detailed.title}</h3><p>{playerDescription(detailed.description)}</p>{detailed.skills.map((skill,i)=><AbilityDetails key={i} skill={skill} showName={detailed.skills.length>1} showAvailability={false}/>)}<Button disabled={busy} onClick={()=>{setSelected({id:detailed.id,revision:detailed.revision});back();}}>选择这套方案</Button></>}</section>}
      </>}
    </div>
  </Modal>;
}
