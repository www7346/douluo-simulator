import {useEffect,useMemo,useState} from 'react';
import {abilityPage,abilitySourceResolver,castReceiptLabel, type AbilitySource} from '../../runtime/ability-sources';
import {battleActionArtwork} from '../../runtime/generated-art';
import {playerText,skillName} from '../../runtime/player-text';
import {Modal,SoulRing} from '../components';
import {PortraitImage,type PortraitOverride} from './PortraitArt';
import {ringSkillImageSlot} from '../../runtime/soul-images';
import UiIcon,{type UiIconName} from './UiIcon';
import AbilityDetails from './AbilityDetails';

export const ACTION_CATEGORIES=['常用','基础','魂环技能','其他技能','装备与道具','战术'];
export function actionCategory(source:AbilitySource) {
  return source.group==='ring'?'魂环技能':source.group==='item'?'装备与道具':source.group==='tactic'?'战术':source.kind==='ordinary'||source.kind==='martial-base'?'基础':'其他技能';
}
export function selectConsoleActions(entries:any[],filter:{category:string;soulId:string;ordinal:number;query:string;kind:string},favorites:string[]) {
  const query=filter.query.trim().toLocaleLowerCase();
  return entries.filter(({action,source})=>{
    const category=actionCategory(source);
    if(filter.category==='常用'?(favorites.length?!favorites.includes(action.id):!['基础','魂环技能'].includes(category)):category!==filter.category)return false;
    if((filter.category==='魂环技能'||filter.category==='常用'&&!favorites.length)&&source.group==='ring') {
      if(filter.soulId&&source.soulId!==filter.soulId)return false;
      if(filter.ordinal&&source.ordinal!==filter.ordinal)return false;
    }
    if(['其他技能','装备与道具'].includes(filter.category)&&filter.kind!=='all'&&source.kind!==filter.kind)return false;
    return !query||[action.name,source.label,source.years?source.years+'年':''].some(text=>String(text).toLocaleLowerCase().includes(query));
  });
}
export function favoriteStorageKey(worldId:string,unitId:string){return 'douluo:battle-favorites:'+encodeURIComponent(worldId)+':'+encodeURIComponent(unitId);}

function actionIcon(action:any):UiIconName|null {
  if(action.id==='tactic:move')return 'move';
  if(action.sourceKind==='ordinary')return 'battle';
  if(action.sourceKind==='martial-switch')return 'reroll';
  return action.sourceKind==='tactic'?({'防御':'shield','移动':'move','逃跑':'escape','协助撤退':'escape','放弃行动':'wait','认输':'flag','挣脱':'reroll'} as Record<string,UiIconName>)[action.actionType]??'battle':null;
}

export default function BattleConsole({state,worldId,unitId,actions,locked,pending,castReceipt,playing,onChoose,onCancel,soulImages}:{state:any;worldId:string;unitId:string;actions:any[];locked:boolean;pending:any;castReceipt:any;playing:boolean;onChoose:(action:any)=>void;onCancel:()=>void;soulImages?:Record<string,PortraitOverride>}) {
  const active=state.成长?.列表?.[unitId]?.激活武魂ID;
  const souls=(state.成长?.列表?.[unitId]?.武魂ID列表??[]).map((id:string)=>state.武魂?.列表?.[id]).filter(Boolean);
  const storageKey=favoriteStorageKey(worldId,unitId);
  const [favorites,setFavorites]=useState<string[]>(()=>{try{const value=JSON.parse(localStorage.getItem(storageKey)??'[]');return Array.isArray(value)?value.filter(id=>typeof id==='string'):[];}catch{return [];}});
  const [filter,setFilter]=useState({category:'常用',soulId:active??souls[0]?.id??'',ordinal:0,query:'',kind:'all'}),[page,setPage]=useState(0),[size,setSize]=useState(8),[details,setDetails]=useState<any>(null);
  const [storageError,setStorageError]=useState(false);
  useEffect(()=>{const update=()=>setSize(innerWidth<=720?4:innerWidth<1600?8:10);update();window.addEventListener('resize',update);return()=>window.removeEventListener('resize',update);},[]);
  const entries=useMemo(()=>{const resolve=abilitySourceResolver(state,unitId);return actions.map(action=>({action,source:resolve({...state.技能?.列表?.[action.id],...action})}));},[state,unitId,actions]);
  const chosenSoul=souls.find((s:any)=>s.id===filter.soulId)??souls.find((s:any)=>s.id===active)??souls[0];
  const paged=abilityPage(selectConsoleActions(entries,{...filter,soulId:chosenSoul?.id??''},favorites),page,size);
  const update=(patch:Partial<typeof filter>)=>{setFilter({...filter,...patch});setPage(0);onCancel();};
  const favorite=(id:string)=>{const next=favorites.includes(id)?favorites.filter(v=>v!==id):[...favorites,id];setFavorites(next);try{localStorage.setItem(storageKey,JSON.stringify(next));setStorageError(false);}catch{setStorageError(true);}};
  const staleFavorites=favorites.filter(id=>!entries.some(entry=>entry.action.id===id));
  const clearStale=()=>{const next=favorites.filter(id=>!staleFavorites.includes(id));setFavorites(next);try{localStorage.setItem(storageKey,JSON.stringify(next));setStorageError(false);}catch{setStorageError(true);}};
  const cast=castReceipt?.actorId===unitId&&castReceipt.skill?.sourceRingId?castReceipt.skill:null;
  const displaySoul=playing&&cast?souls.find((s:any)=>s.id===cast.sourceMartialSoulId)??chosenSoul:chosenSoul;
  const ringIds=displaySoul?.魂环ID列表??[];
  const showRings=['魂环技能','常用'].includes(filter.category);
  const sourceKinds=[...new Set(entries.filter(e=>actionCategory(e.source)===filter.category).map(e=>e.source.kind))];
  return <section className="battle-console" aria-label="战斗行动">
    <header><nav className="battle-console__tabs" aria-label="行动类型">{ACTION_CATEGORIES.map(name=><button key={name} aria-pressed={filter.category===name} onClick={()=>update({category:name,kind:'all'})}>{name}</button>)}</nav><label className="battle-console__search"><span className="sr-only">搜索技能或来源</span><input type="search" aria-label="搜索技能或来源" placeholder="搜索技能、武魂或第几魂环" value={filter.query} onChange={e=>update({query:e.target.value})}/></label></header>
    {showRings&&<><nav className="battle-console__souls" aria-label="浏览武魂技能">{souls.map((s:any)=><button key={s.id} aria-pressed={displaySoul?.id===s.id} onClick={()=>update({soulId:s.id,ordinal:0,category:'魂环技能'})}>{s.名称}<small>{active===s.id?'当前激活':'仅查看'}</small></button>)}</nav>
    <nav className="battle-console__rings" aria-label="魂环筛选"><button aria-pressed={filter.ordinal===0} onClick={()=>update({ordinal:0,category:'魂环技能'})}>全部</button>{Array.from({length:9},(_,i)=>{const ring=ringIds.map((id:string)=>state.魂环.列表[id]).find((r:any)=>r?.序号===i+1);return <button key={i} disabled={!ring} aria-label={'第'+(i+1)+'魂环'+(ring?' · '+ring.年限+'年':' · 尚未获得')} aria-pressed={filter.ordinal===i+1} className={(ring&&ring.id===pending?.action.sourceRingId?' is-preview-source':'')+(ring&&ring.id===cast?.sourceRingId?(playing?' is-cast-source':' is-last-source'):'')} data-ring-id={ring?.id} onClick={()=>update({ordinal:i+1,category:'魂环技能',soulId:displaySoul.id})}>{ring?<SoulRing index={ring.序号} years={ring.年限} color={ring.颜色}/>:<span className="battle-console__empty-ring"/>}<b>{i+1}</b></button>;})}<span>{pending?.action.sourceRingOrdinal?'柔光：所选技能来源':cast?'标记：上次施放来源':''}</span></nav></>}
    {['其他技能','装备与道具'].includes(filter.category)&&<label className="battle-console__kind">来源<select value={filter.kind} onChange={e=>update({kind:e.target.value})}><option value="all">全部来源</option>{sourceKinds.map(kind=><option key={kind} value={kind}>{({copied:'复制技能','summoned-copy':'临时技能','martial-skill':'非魂环技能','soul-bone':'魂骨',beast:'魂兽能力','soul-device':'魂导器',consumable:'消耗品','hidden-weapon':'暗器'} as Record<string,string>)[kind]??kind}</option>)}</select></label>}
    {storageError&&<p role="status">收藏暂时无法保存，当前页面仍可使用。</p>}
    {filter.category==='常用'&&staleFavorites.length>0&&<div className="battle-console__stale"><span>{staleFavorites.length}项收藏的来源已不在当前行动中。</span><button onClick={clearStale}>清除失效收藏</button></div>}
    <div className="battle-console__grid" style={{gridTemplateColumns:'repeat('+size/2+',minmax(0,1fr))'}}>{paged.items.map(({action,source})=>{
      const skill=state.技能?.列表?.[action.id]??action;
      const reason=source.issue?'暂时无法读取这项能力，请重新打开。':!action.available?playerText(action.reason,state,'当前不可用'):'';
      return <article key={action.id} data-action-id={action.id} data-source-ring={source.ringId} className={pending?.action.id===action.id?'is-selected':''}>
        <button className="battle-console__choose" disabled={locked||Boolean(reason)} onClick={()=>onChoose({...action,sourceMartialSoulId:source.soulId,sourceMartialSoulName:source.soulName,sourceRingId:source.ringId,sourceRingOrdinal:source.ordinal,sourceRingYears:source.years})} aria-label={action.name+'，'+source.label}>
          {actionIcon(action)?<UiIcon name={actionIcon(action)!}/>:<PortraitImage art={battleActionArtwork(skill,state)} name={action.name} custom={source.group==='ring'?soulImages?.[ringSkillImageSlot(action.id)]:undefined}/>}
          <span><b>{action.name}</b><small>{source.label}</small><em>{reason||((action.sourceKind==='martial-switch'?'消耗主行动':action.sourceKind==='tactic'?action.description:'魂力 '+action.soulPowerCost)+(action.nativeCastRank?' · 当前'+action.currentCastRank+'环强度 / 原生'+action.nativeCastRank+'环强度':''))}</em></span>
        </button>{action.resourceSummary&&<small>{action.resourceSummary}</small>}<footer><button aria-label={(favorites.includes(action.id)?'取消收藏':'收藏')+action.name} aria-pressed={favorites.includes(action.id)} onClick={()=>favorite(action.id)}>★</button><button onClick={()=>setDetails({skill,source,action})}>详情</button>{action.perBattleRemaining!=null&&<small>本场余{action.perBattleRemaining}次</small>}</footer>
      </article>;
    })}</div>
    {!paged.total&&<p className="battle-console__empty">{filter.category==='常用'&&favorites.length?'当前没有可用的收藏行动，可在其他分类重新选择。':'当前筛选没有行动。'}{state.战斗?.状态!=='进行中'?'本场战斗已结束。':''}</p>}
    <footer className="battle-console__pager"><button disabled={!paged.index} onClick={()=>{setPage(paged.index-1);onCancel();}}>上一页</button><span>第 {paged.index+1} / {paged.count} 页 · 共 {paged.total} 项{filter.category==='常用'&&!favorites.length?' · 点击★收藏常用行动':''}</span><button disabled={paged.index===paged.count-1} onClick={()=>{setPage(paged.index+1);onCancel();}}>下一页</button></footer>
    {cast&&<p className="battle-console__last-cast">{playing?'正在施放：':'上次施放：'}{castReceiptLabel(castReceipt)}</p>}
    <Modal open={Boolean(details)} title={details?skillName(details.skill,state):'能力详情'} onClose={()=>setDetails(null)}>{details&&<><p>{details.source.label}{details.source.years?' · '+details.source.years+'年':''}</p>{details.source.issue&&<p>暂时无法读取这项能力，请重新打开。</p>}{details.action.reason&&<p>{playerText(details.action.reason,state)}</p>}{details.action.sourceKind==='tactic'||details.action.sourceKind==='martial-switch'?<p>{details.action.description??'切换武魂消耗本回合主行动。'}</p>:<AbilityDetails skill={details.skill}/>}</>}</Modal>
  </section>;
}
