import CompanionPanel from '../components/CompanionPanel';
import PersonDossier from '../components/PersonDossier';
import {useEffect,useMemo,useState} from 'react';
import {useSceneQuery} from '../use-game-query';
import QueryStatus from '../components/QueryStatus';
import QuerySurface from '../components/QuerySurface';
import {useServerQuery} from '../use-game-query';
import {playerText} from '../../runtime/player-text';
import {Button,EmptyState,Modal} from '../components';
import {useGame} from '../game-context';
import TravelQuote from '../components/TravelQuote';
import CharacterPortrait from '../components/CharacterPortrait';
import SlaughterTrial from '../components/SlaughterTrial';
import EndgameChallenges from '../components/EndgameChallenges';

import type {PageId} from '../App';


const MODES=['人物','终局挑战'];
export default function WorldPage({onNavigate,activity,onOpen}:{onNavigate:(page:PageId)=>void;activity?:'slaughter';onOpen?:(page:PageId,tab?:string)=>void}) {
  const {controller,state,view}=useGame();
  const initial=new URLSearchParams(window.location.hash.split('?')[1]??'');
  const [mode,setMode]=useState(()=>activity?'杀戮之都':MODES.includes(initial.get('tab')??'')?initial.get('tab')!:'人物');
  const [query,setQuery]=useState('');
  const [showAtlas,setShowAtlas]=useState(false);
  const [personId,setPersonId]=useState(initial.get('person')??'');
  const [destinationId,setDestinationId]=useState('');
  const [travelMode,setTravelMode]=useState('balanced');
  const [confirmation,setConfirmation]=useState<{title:string;description:string;type:string;payload:Record<string,unknown>;danger?:boolean}|null>(null);
  const playerId=state?.角色?.主控单位ID,currentId=state?.地图?.当前地点ID;
  const text=(value:unknown,fallback='')=>playerText(value,state,fallback);
  const facts=useSceneQuery('scene.people',{localOnly:!showAtlas,includePeople:mode==='人物'},currentId);
  const records:any[]=facts.data?.people??[];
  const personTarget=personId;
  const personQuery=useServerQuery('scene.person',{characterId:personTarget,...(mode==='终局挑战'?{scope:'historical-projection'}:{})},{enabled:Boolean(personTarget)}),person=personQuery.data;
  const [page,setPage]=useState(0);
  useEffect(()=>setPage(0),[query,showAtlas,currentId]);
  const destinationQuery=useServerQuery('scene.destination',{locationId:destinationId,mode:travelMode},{enabled:Boolean(destinationId)});
  const destination=destinationQuery.data;
  const filtered=records.filter(record=>(showAtlas||record.locationId===currentId)&&(!query||`${record.name}${record.period}${record.soul}${record.faction}`.includes(query)));
  const pages=Math.max(1,Math.ceil(filtered.length/30)),currentPage=Math.min(page,pages-1),visible=filtered.slice(currentPage*30,(currentPage+1)*30);
  const block=text(facts.data?.block);
  const level=state?.成长?.列表?.[playerId]?.魂力等级??0;
  if(!playerId)return <EmptyState title="世界仍是静默的">完成觉醒，便可循着地图与大陆上的魂师相逢。</EmptyState>;

  const run=async(type:string,payload:Record<string,unknown>={})=>{
    try{
      await controller.dispatch(type,payload);setConfirmation(null);
      if((controller.getView().snapshot.state as any)?.战斗?.状态==='进行中'){
        await controller.settleAiTurns();onNavigate('battle');
      }
    }catch{}
  };
  const plan=(id:string)=>{setPersonId('');setDestinationId(id);};
  const travel=async()=>{
    if(!destination?.canTravel)return;
    try{
      await controller.dispatch(destination.quote?.resumeActionId?'world.resume-long-action':'world.intent',destination.quote?.resumeActionId?{actionId:destination.quote.resumeActionId}:{type:'travel',destinationId,mode:travelMode});setDestinationId('');
      const settled=controller.getView().snapshot.state as any,arrived=settled.地图.当前地点ID===destinationId;controller.notify(arrived?`已抵达${destination.name}，可以查看当地人物与赛事`:`行程暂歇于${settled.地图.地点[settled.地图.当前地点ID].name}，可处理约定后继续。`,'success');onNavigate('adventure');
    }catch{}
  };

  if(!facts.data)return <QueryStatus query={facts}/>;
  return <QuerySurface query={facts}><div className={`world-scene${activity?' world-scene--slaughter':''}${mode==='终局挑战'?' world-scene--endgame':''}`}>
    <header className="world-masthead"><div><span className="eyebrow">大陆相逢 · 斗魂之约</span><h1>{mode==='人物'?'万象人物志':mode==='杀戮之都'?'血色试炼':'九环登临'}</h1><p>{text(state.地图.地点[currentId]?.name)} · {mode==='人物'?'循着故人的行踪，走进新的故事':'带上已经积累的力量，面对下一次挑战'}</p></div><div className="world-masthead__level"><b>{level}</b><span>魂力等级</span></div></header>
    {!activity&&<nav className="world-tabs" aria-label="万象分类">{MODES.map(item=><button key={item} aria-current={mode===item?'page':undefined} onClick={()=>setMode(item)}>{item}</button>)}<button onClick={()=>onNavigate('competition')}>斗魂赛事 ↗</button></nav>}

    {mode==='人物'&&<section className="world-people"><div className="world-section-heading"><div><span className="eyebrow">{showAtlas?'大陆卷宗':'此地相逢'}</span><h2>{filtered.length} 位人物</h2></div><div className="field-actions"><Button variant="ghost" onClick={()=>setShowAtlas(!showAtlas)}>{showAtlas?'只看此地':'查阅大陆人物志'}</Button><input className="search" aria-label="搜索人物" placeholder="姓名、武魂、所属势力" value={query} onChange={event=>setQuery(event.target.value)}/></div></div><div className="world-person-grid">{visible.map(record=><button className="world-person-card" key={record.id} onClick={()=>setPersonId(record.id)}><div className="world-person-card__seal"><CharacterPortrait state={state} figureUrl={view.figureUrl} person={record}/></div><span className="world-person-card__text"><small>{record.period}</small><b>{record.name}</b><span>{record.soul}</span><small>{record.locationName}{record.level?` · ${record.level} 级`:''}</small></span><span className="world-person-card__arrow" aria-hidden="true">↗</span></button>)}</div>{pages>1&&<div className="field-actions"><Button variant="ghost" disabled={currentPage===0} onClick={()=>setPage(currentPage-1)}>上一页</Button><span>{currentPage+1} / {pages}</span><Button variant="ghost" disabled={currentPage+1>=pages} onClick={()=>setPage(currentPage+1)}>下一页</Button></div>}{!filtered.length&&<EmptyState title="暂未寻得这位人物">试着查阅大陆人物志，或调整搜索词。</EmptyState>}</section>}


    {mode==='杀戮之都'&&<SlaughterTrial atEntrance={currentId===facts.data.slaughterLocationId} block={block}
      onOpen={onOpen??((page,tab)=>{location.hash=`/${page}?from=slaughter&tab=${encodeURIComponent(tab??'')}`;})}
      onStart={()=>currentId===facts.data.slaughterLocationId?setConfirmation({title:'进入五场连续死斗',description:'进入即开始第一场战斗。无法逃跑，途中不能返回城镇休整。请确认随身装备和补给已备妥；失败会失去尚未带出的累计收获。',type:'arena.slaughter.begin',payload:{},danger:true}):plan(facts.data.slaughterLocationId)}
      onNext={()=>void run('arena.slaughter.bout')} onBattle={()=>onNavigate('battle')} onRoad={()=>plan('loc-hell-road')} onReturn={()=>onNavigate('adventure')}/>}

    {mode==='终局挑战'&&<EndgameChallenges state={state} busy={view.busy} onPerson={setPersonId} onRoute={plan} onChallenge={(id,name)=>setConfirmation({title:`${name} · 历史投影`,description:'与 99 级历史投影单独交锋。胜利记入战绩，败北或认输时角色死亡。',danger:true,type:'arena.endgame',payload:{characterId:id}})}/>}

    <Modal className="modal--person" open={Boolean(personId)} title={person?.name??'人物详情'} onClose={()=>setPersonId('')}>
      <QueryStatus query={personQuery}/>{person&&<PersonDossier key={`${mode}:${person.id}`} historical={mode==='终局挑战'} person={person} state={state} notice={block||undefined} onReturn={()=>setPersonId('')} actions={<><Button variant="secondary" onClick={()=>setPersonId('')}>{mode==='终局挑战'?'返回挑战列表':'返回人物列表'}</Button>{mode==='终局挑战'?null:person.locationId!==currentId?<Button onClick={()=>plan(person.locationId)}>查看前往路线</Button>:person.spar?null:person.endgame?(mode!=='终局挑战'&&<Button onClick={()=>{setPersonId('');setMode('终局挑战');}}>查看终局挑战</Button>):<Button onClick={()=>{setPersonId('');onNavigate('adventure');}}>查看此地见闻与服务</Button>}</>}/>}
    </Modal>
    <Modal open={Boolean(destinationId)} title={`前往${destination?.name??''}`} onClose={()=>setDestinationId('')} actions={<><Button variant="ghost" onClick={()=>setDestinationId('')}>返回</Button>{destination?.atLocation?<Button onClick={()=>{setDestinationId('');onNavigate('adventure');}}>查看此地见闻与入口</Button>:<Button disabled={view.busy||!destination?.canTravel} onClick={()=>void travel()}>{destination?.quote?.resumeActionId?'继续原行程':'确认出发'}</Button>}</>}>
      <QueryStatus query={destinationQuery}/>{destination&&<><div className="field-actions" aria-label="出行方式">{Object.entries(facts.data.modes).map(([id,value]:[string,any])=><button className={`button button--${travelMode===id?'secondary':'ghost'}`} aria-pressed={travelMode===id} key={id} onClick={()=>setTravelMode(id)}>{value.name}</button>)}</div><TravelQuote quote={destination.quote}/>{destination.atLocation&&<p>你已经在这里，可以前往征途查看当地入口与见闻。</p>}{destination.reasons.map((reason:string)=><p className="danger-text" key={reason}>{reason}</p>)}{destination.guidance.length>0&&<div className="destination-guidance"><h3>从这些线索开始</h3>{destination.guidance.map((source:{locationId:string;eventName:string;locationName:string},index:number)=><div key={index}><span>{source.locationName} · {source.eventName}</span><Button variant="ghost" onClick={()=>source.locationId===currentId?(setDestinationId(''),onNavigate('adventure')):plan(source.locationId)}>{source.locationId===currentId?'查看当地见闻':'查看线索地点路线'}</Button></div>)}</div>}</>}
    </Modal>
    <Modal open={Boolean(confirmation)} title={confirmation?.title??''} onClose={()=>setConfirmation(null)} actions={<><Button variant="ghost" onClick={()=>setConfirmation(null)}>返回准备</Button><Button variant={confirmation?.danger?'danger':'primary'} disabled={view.busy} onClick={()=>confirmation&&void run(confirmation.type,confirmation.payload)}>{confirmation?.danger?'确认进入':'确认开始'}</Button></>}><p>{confirmation?.description}</p></Modal>
  </div></QuerySurface>;
}
