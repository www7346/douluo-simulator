import {BoundFigure,collarAppearance} from './BoundPortrait';
import BoundChainStatus from './BoundChainStatus';
import {assetUrl} from '../asset-delivery';
import {useState} from 'react';
import {playerText} from '../../runtime/player-text';

import {unitPortrait} from '../../runtime/visual-identity';
import {unitFigure} from '../fantasy-art';
import {PortraitImage} from './PortraitArt';
import {Avatar,Button,Modal,Progress} from '../components';
import {AbilityList,DefenseDetails} from './AbilityDetails';
import BattleUnitPortrait from './BattleUnitPortrait';

export default function BattleIntel({state,unit,avatarUrl='',figureUrl='',title='敌方情报',compact=false}:{state:any;unit:any;avatarUrl?:string;figureUrl?:string;title?:string;compact?:boolean}) {
  const [details,setDetails]=useState(false);
  if(!unit)return null;
  const model=state.战斗单位?.列表?.[unit.id];
  const profile=state.魂兽档案?.列表?.[model?.扩展?.魂兽档案ID];
  const appearance=collarAppearance(state,unit.id);
  const figure=unitFigure(state,unit.id,figureUrl),portrait=unit.portrait??unitPortrait(state,unit.id);
  return <section className="battle-intel fantasy-panel" data-bloodline={profile?.血脉?.grade?.color}>
    <h2>{title}</h2><div className="battle-intel__art">{compact?<BattleUnitPortrait name={unit.name} avatarUrl={avatarUrl} portrait={portrait} figure={figure} appearance={appearance}/>:figure&&appearance?<BoundFigure figure={figure} name={unit.name} appearance={appearance}/>:figure?<img src={assetUrl(figure)} alt={unit.name}/>:portrait?<PortraitImage art={portrait} name={unit.name}/>:<Avatar name={unit.name} imageUrl={avatarUrl}/>}</div>
    <div className="battle-intel__name"><h3>{unit.name}</h3>{profile?.血脉?.grade&&<span className="battle-bloodline">{profile.血脉.grade.name}</span>}</div>
    {appearance&&<BoundChainStatus obedience={appearance.obedience}/>}
    {profile&&<p className="battle-age">{profile.年限.toLocaleString()} 年 <small>魂兽年限</small></p>}
    <Progress label="生命" value={unit.hp} maximum={unit.hpMax} tone="life"/><Progress label="魂力" value={unit.sp} maximum={unit.spMax} tone="soul"/>
    {profile?.属性谱?.主属性?.length>0&&<p>属性 · {profile.属性谱.主属性.join('、')}</p>}
    {unit.shield>0&&<p>护盾 · {unit.shield}</p>}
    {unit.resources?.map((resource:any)=><p key={`${resource.sourceMartialSoulId}:${resource.slot}`} aria-label={resource.name}>{resource.name} · {resource.current} / {resource.maximum}</p>)}
    <div className="battle-intel__statuses">{unit.statuses?.length?unit.statuses.map((status:any)=><span key={status.id}>{status.name}{status.level?` ${status.level}级`:''}{status.usesRemaining!==undefined?` · 剩余${status.usesRemaining}次`:''}{status.maintained?' · 维持中':status.remaining===null?'':` · ${status.remaining}回合`}{status.source&&<small>来源：{status.source}</small>}</span>):<span>暂无额外状态</span>}</div>
    <Button variant="secondary" onClick={()=>setDetails(true)}>查看完整情报</Button>
    <Modal open={details} title={unit.name} onClose={()=>setDetails(false)}><p>{playerText(profile?.描述,state,'')}</p><DefenseDetails unitId={unit.id} state={state}/><AbilityList unitId={unit.id}/></Modal>
  </section>;
}
