import {medicineCopy} from '../../runtime/player-copy';
import {skillArtwork} from '../../runtime/generated-art';
import RestraintDetails from './RestraintDetails';
import {PortraitImage} from './PortraitArt';
import {modifierPresentation} from '../../runtime/ability-text';
import type {abilityPresentation,defensePresentation} from '../../runtime/ability-presentation';
import {useServerQuery} from '../use-game-query';
import QueryStatus from './QueryStatus';
import {playerText,skillName} from '../../runtime/player-text';
import {useGame} from '../game-context';

export function PassiveDetails({modifiers,passive}:{modifiers?:any;passive?:any}) {
  const {state}=useGame();
  const rows=modifierPresentation(modifiers,passive,state);
  return rows.length>0?<dl className="ability-passives">{rows.map((row,index)=><div key={index}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>:null;
}

export function DefenseDetails({unitId,state}:{unitId:string;state:any}) {
  const query=useServerQuery<ReturnType<typeof defensePresentation>>('presentation.defense',{unitId});
  if(!query.data)return <QueryStatus query={query}/>;
  const rows=query.data;
  if(!rows.length)return null;
  return <details className="defense-sources"><summary>装备加成、防护与弱点 <span>{rows.length}</span></summary><ul>{rows.map(row=><li key={row.key}><b>{row.label}</b><small>{row.source} · {row.temporary?'临时效果':'持续生效'}</small></li>)}</ul></details>;
}

export default function AbilityDetails({skill,showName=true,showDescription=true,showCosts=true,showLimits=true,showAvailability=true,stateOverride,presentation}:{skill:any;showName?:boolean;showDescription?:boolean;showCosts?:boolean;showLimits?:boolean;showAvailability?:boolean;stateOverride?:any;presentation?:ReturnType<typeof abilityPresentation>}) {
  const context=useGame(),state=stateOverride??context.state;
  const provided=presentation??skill?.displayInfo;
  const query=useServerQuery<ReturnType<typeof abilityPresentation>>('presentation.ability',{skill},{enabled:Boolean(skill)&&!provided});
  if(!skill)return null;
  const info:ReturnType<typeof abilityPresentation>|undefined=provided??query.data;
  if(!info)return <QueryStatus query={query}/>;
  if(info.restraint)return <RestraintDetails device={info.restraint}/>;
  const description=info.description,food=state?.物品?.实例?.[skill.sourceItemId]?.type==='辅助食品';
  return <section className="ability-details">
    {showName&&<h4 className="ability-art-heading"><PortraitImage art={skillArtwork(skill)} name={skillName(skill,state,'能力')} className="generated-art generated-art--small"/>{skillName(skill,state,'主动能力')}</h4>}
    {description&&showDescription&&<p className="ability-description">{description}</p>}
    {info.host&&<p>{info.host.summary}</p>}
    {info.castRelease&&<div className="ability-release-strength"><p>{info.castRelease.currentRank>0?`当前释放 ${info.castRelease.currentRank} 环强度 · 原生 ${info.castRelease.nativeRank} 环强度`:`原生 ${info.castRelease.nativeRank} 环强度 · 暂未掌握`}</p>{info.castRelease.reason&&<p className="muted">{info.castRelease.reason}</p>}{info.castRelease.downcast&&!info.castRelease.reason&&<small>以下为当前可用效果；升级并取得更多魂环后逐步释放更强力量。</small>}{info.castRelease.lockedBranches?.length>0&&<ul>{info.castRelease.lockedBranches.map((branch:any)=><li key={branch.id}>{branch.label}：{branch.unlockText}</li>)}</ul>}</div>}
    {info.medicine?.medicine&&<p>{info.medicine.classification} · {info.medicine.formLabel} · {info.medicine.routeLabel} · 每件 {info.medicine.doses} 剂{info.medicine.sourceDurationMinutes>0&&` · ${info.medicine.medicine.route==='inhaled'?'药雾':info.medicine.medicine.route==='contact'?'涂层':'药源'}保留 ${info.medicine.sourceDurationMinutes} 分钟`}</p>}
    {info.medicine?.warning&&<p className="danger-text">{medicineCopy(info.medicine)}</p>}
    {skill.restorativeConsumable&&<p className="muted">{food?'可以自己食用，也可喂给身边的人；战斗中喂食需要先靠近，并消耗一次主行动。':'战外可给同场存活人物用药；昏迷者恢复生命后会醒来。战斗中给队友用药需要先靠近至接触距离，并消耗一次主行动。'}</p>}
    <div className="ability-form"><span>{info.activationLabel}</span>{info.activation!=='active'&&<small>{showAvailability&&info.passiveState.owned?info.passiveState.reason:info.passiveCondition}</small>}</div>
    {info.effects.length>0&&<>
      {showCosts&&info.activation!=='passive'&&<div className="ability-costs"><span>{info.costLabel} <b>{info.cost}</b></span>{info.cooldown>0&&<span>冷却 <b>{info.cooldown} 回合</b></span>}{Number(skill.durabilityCost)>0&&<span>耐久消耗 <b>{skill.durabilityCost}</b></span>}</div>}
      {showCosts&&info.activation!=='passive'&&<>{info.costLines.length>0&&<p>确认施放时支付（未命中也消耗）：{info.costLines.join('；')}</p>}{info.exchangeLines?.length>0&&<div aria-label="条件与代价交换">{info.exchangeLines.map((line:string,i:number)=><p key={i}>{line}</p>)}</div>}{info.requirementLines.length>0&&<p>出手前须满足：{info.requirementLines.join('、')}</p>}{info.maintenanceLines.length>0&&<p>维持费用：{info.maintenanceLines.join('；')}。施放当刻不收维持费；经过第一个世界分钟边界首次支付，之后每分钟一次。停止维持或无法支付时结束对应持续效果</p>}{info.modes.length>0&&<dl>{info.modes.map(mode=><div key={mode.id}><dt>{mode.name}</dt><dd>{mode.costLines.join('；')}</dd></div>)}</dl>}</>}
      {info.primary.length>0&&<div className="ability-outcomes"><span className="ability-section-label">主要效果</span><ul className="ability-effects">{info.primary.map(effect=><li key={effect.key}><b>{info.activation==='hybrid'&&<em>{effect.passive?'被动':'主动'} · </em>}{effect.branch&&<em>{effect.branch} · </em>}{effect.name}</b><span>{effect.values.join(' · ')}</span></li>)}</ul></div>}
      {showCosts&&info.value&&<details><summary>能力价值与代价</summary><p>主动效果 {info.value.active} 点 · 被动效果 {info.value.passive} 点 · 代价返还 {info.value.reduction} 点 · 所需能力点 {info.value.net} 点</p>{info.value.mode&&<p>按代价最小的施放方式「{info.value.mode}」计算能力点。</p>}{info.value.ringBaseCost!==undefined&&<p>本魂技基础魂力消耗 {info.value.ringBaseCost}。</p>}</details>}
      <dl className="ability-context">{info.context.map(group=><div key={group.label}><dt>{group.label}</dt><dd>{group.entries.map(effect=><p key={effect.key}><strong>{effect.branch&&`${effect.branch} · `}{effect.name}</strong>{effect.values.length>0&&<span>{effect.values.join(' · ')}</span>}</p>)}</dd></div>)}</dl>
      {showLimits&&info.activation!=='passive'&&<div className="ability-limits">
        {info.usage.perBattleLimit>0&&<span>每场最多 {info.usage.perBattleLimit} 次{showAvailability&&info.availability&&state.战斗?.状态==='进行中'?` · 剩余 ${info.availability.perBattleRemaining} 次`:''}</span>}
        {info.usage.perBattleGroupLimit>0&&<span>{playerText(info.usage.perBattleGroupLabel,state,'同类能力')}在战斗中每场共 {info.usage.perBattleGroupLimit} 次</span>}
        {info.usage.dailyLimit>0&&<span>每日最多 {info.usage.dailyLimit} 次{showAvailability&&info.availability?` · 今日剩余 ${info.availability.dailyRemaining} 次`:''}</span>}
        {info.usage.worldCooldownDays>0&&<span>使用后需等待 {info.usage.worldCooldownDays} 日</span>}
        {showAvailability&&info.availability?.reason&&<span>{playerText(info.availability.reason,state)}</span>}
      </div>}
    </>}
    <PassiveDetails modifiers={skill.modifiers} passive={skill.passiveCombat}/>
  </section>;
}

export function AbilityList({unitId}:{unitId:string}) {
  const query=useServerQuery<Array<{skill:any;info:ReturnType<typeof abilityPresentation>}>>('presentation.unit',{unitId});
  if(!query.data)return <QueryStatus query={query}/>;
  return <>{query.data.map(entry=><AbilityDetails key={entry.skill.id} skill={entry.skill} presentation={entry.info}/>)}</>;
}
