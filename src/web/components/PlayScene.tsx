import PersonalQuickAction from './PersonalQuickAction';
import {hasBattleStoryFollowup} from '../../shared/battle-preferences';
import BattleQuickSettings from './BattleQuickSettings';
import PersonalWithdrawal from './PersonalWithdrawal';
import BackgroundPrologue from './BackgroundPrologue';
import BattleReplayButton from './BattleReplayButton';
import CompetitionResumeAction from './CompetitionResumeAction';
import LootDistribution from './LootDistribution';
import {assetUrl} from '../asset-delivery';
import CompanionPanel from './CompanionPanel';
import PartyPanel from './PartyPanel';
import ResidentRealmPanel from './ResidentRealmPanel';
import StatusEscapeActions from './StatusEscapeActions';
import {ownedNineBeautiesSouls} from '../../shared/resident-realm-ui';
import StoryChat from './StoryChat';
import OpeningGuidance from './OpeningGuidance';
import PersonDossier from './PersonDossier';
import {PersonWornRestraints} from './WornRestraints';
import PersonInteractions from './PersonInteractions';
import {lazy,Suspense,useEffect,useRef,useState} from 'react';
import {useGame} from '../game-context';
import {Avatar,Button,LoadingPanel,Modal,Progress,WorkspacePage} from '../components';
import {BackgroundQueriesPaused,useSceneQuery,useServerQuery} from '../use-game-query';
import QuerySurface from '../components/QuerySurface';

import {materialName,playerText} from '../../runtime/player-text';
import {playSceneKind,playReturnRoute} from '../../runtime/play-scene';

import CharacterPortrait from './CharacterPortrait';
import BattleUnitPortrait from './BattleUnitPortrait';
import CharacterCombatArchive from './CharacterCombatArchive';
import {AbilityList} from './AbilityDetails';
import {PortraitImage} from './PortraitArt';
import {beastPortrait,unitPortrait} from '../../runtime/visual-identity';
import type {PageId} from '../App';
import UiIcon, {type UiIconName} from './UiIcon';


import {DungeonShortcutSymbol} from './DungeonSymbol';
import MaterialIllustration from './MaterialIllustration';
import RelicIllustration from './RelicIllustration';
import {unitFigure} from '../fantasy-art';

const CompetitionPage=lazy(()=>import('../pages/CompetitionPage'));
const AdventurePage=lazy(()=>import('../pages/AdventurePage'));
const ExpeditionScene=lazy(()=>import('./ExpeditionScene'));
const BattlePage=lazy(()=>import('../pages/BattlePage'));
const CharacterPage=lazy(()=>import('../pages/CharacterPage'));
const InventoryPage=lazy(()=>import('../pages/InventoryPage'));
const WorldPage=lazy(()=>import('../pages/WorldPage'));

export default function PlayScene({page,onNavigate}:{page:PageId;onNavigate:(page:PageId)=>void}) {
  const [openingPlaying,setOpeningPlaying]=useState(false);
  const {state,view,controller}=useGame();
  const stage=playSceneKind(state),playerId=state.角色.主控单位ID;
  const person=state.人物.列表[playerId],unit=state.战斗单位.列表[playerId],growth=state.成长.列表[playerId];
  const sceneScope=`${stage}:${state.地图.当前地点ID}:${state.远征?.当前?.id??''}:${state.战斗?.id??''}`;
  const automatic=stage==='battle'&&state.战斗?.状态==='进行中'&&state.战斗?.扩展?.automation?.enabled;
  const [expeditionOpen,setExpeditionOpen]=useState(false),[battlePlaying,setBattlePlaying]=useState(false);
  const battleInFront=stage==='battle'&&page==='battle';
  const activityOpen=stage==='battle'?battleInFront:expeditionOpen;
  const opponentSettling=stage==='battle'&&state.战斗?.状态==='进行中'&&view.busy&&!view.modelTask&&state.战斗.扩展?.成员?.[state.战斗.当前行动单位ID]?.controller==='ai';
  const [mapOpen,setMapOpen]=useState(false),[practiceOpen,setPracticeOpen]=useState(false),[dailyOpen,setDailyOpen]=useState(false);
  const [communicationsOpen,setCommunicationsOpen]=useState(false);
  const backgroundHidden=battleInFront||opponentSettling||mapOpen||practiceOpen||dailyOpen;
  const sceneCovered=backgroundHidden||communicationsOpen;
  const facts=useSceneQuery('scene.play',{},sceneScope,{enabled:!automatic&&!sceneCovered&&page!=='inventory'});
  const scene=facts.data?.scene??{location:state.地图?.地点?.[state.地图?.当前地点ID],dungeons:[],shops:[],venues:[],canRest:false},room=state.远征?.当前?.currentRoom;
  const [actorHireContext,setActorHireContext]=useState<{personId:string;dungeonId?:string}|null>(null);
  const [actorId,setActorId]=useState(''),[eventsOpen,setEventsOpen]=useState(false);
  const [hash,setHash]=useState(location.hash);
  const selectHirePerson=(personId:string,dungeonId?:string)=>{setActorHireContext({personId,dungeonId});setActorId(personId);};
  useEffect(()=>{if(actorHireContext&&actorHireContext.personId!==actorId)setActorHireContext(null);},[actorId,actorHireContext]);
  const [cargoOpen,setCargoOpen]=useState(false);
  const [realmSelection,setRealmSelection]=useState<{realmId:string;soulId:string;personId?:string}|null>(null);
  const [hostArrangement,setHostArrangement]=useState<{key:string;text?:string}|null>(null);
  const realmSouls=ownedNineBeautiesSouls(state);
  const [narrow,setNarrow]=useState(()=>typeof window!=='undefined'&&Boolean(window.matchMedia?.('(max-width:800px)').matches));
  useEffect(()=>{const media=window.matchMedia('(max-width:800px)'),update=()=>setNarrow(media.matches);media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
  const actorDetails=useSceneQuery<any>('scene.person',{characterId:facts.data?.actors?.find((row:any)=>row.id===actorId)?.record?.id??actorId},sceneScope,{enabled:Boolean(actorId)});
  const openActivity=()=>{if(stage==='battle')onNavigate('battle');else setExpeditionOpen(true);};
  const inExpedition=state.远征?.当前?.status==='active';
  useEffect(()=>{setMapOpen(false);setPracticeOpen(false);setDailyOpen(false);setExpeditionOpen(false);setBattlePlaying(false);setRealmSelection(null);setHostArrangement(null);setActorId('');},[view.profileId,view.sessionId]);
  const previousBattle=useRef(state.战斗?.id);
  useEffect(()=>{const update=()=>setHash(location.hash);window.addEventListener('hashchange',update);return()=>window.removeEventListener('hashchange',update);},[]);
  useEffect(()=>{if(previousBattle.current!==state.战斗?.id)setExpeditionOpen(false);previousBattle.current=state.战斗?.id;},[stage,state.战斗?.id]);
  useEffect(()=>{if(!view.busy&&!view.battleTurnError&&(state.战斗?.扩展?.automation?.enabled||hasBattleStoryFollowup(state)))void controller.ensureAutomaticBattle().catch(()=>{});},[controller,view.sessionId,view.snapshot.revision,view.busy,view.battleTurnError]);
  const pane=['character','inventory','world'].includes(page)?page:'';
  const params=new URLSearchParams(hash.split('?')[1]??'');
  const competitionScene=page==='competition'||params.get('from')==='competition';
  const slaughterScene=page==='slaughter'||params.get('from')==='slaughter';
  const open=(target:PageId,tab='')=>{const query=new URLSearchParams();if(tab)query.set('tab',tab);if(slaughterScene)query.set('from','slaughter');if(competitionScene){query.set('from','competition');if(params.get('history'))query.set('history',params.get('history')!);}location.hash=`/${target}?${query}`;};
  const run=async(type:string,payload:Record<string,unknown>={})=>{try{await controller.dispatch(type,payload);}catch{}};
  const actors:any[]=facts.data?.actors??[];
  const actor=actors.find((item:any)=>item.id===actorId),record=actorDetails.data;
  const localEvents:any[]=facts.data?.localEvents??[],block=facts.data?.block;
  const services=stage==='world';
  const recoveryReason=!services?'离开战斗或探索后，可在安全地点恢复':!scene.canRest?'请在城镇、村落或副本入口休整':block?playerText(block,state):'免费回满生命与魂力，清除可恢复的临时状态';
  const openRealm=(soulId:string,personId?:string)=>{if(!realmSouls.some(s=>s.id===soulId))return;const source=state.扩展?.residentRealms?.records?.find((r:any)=>r.soulId===soulId&&r.ownerId===playerId&&r.endedAt===undefined);if(!source){controller.notify('画境目前无法打开','danger');return;}if(pane)location.hash=playReturnRoute(state,hash);setRealmSelection({realmId:source.id,soulId,personId});};
  const arrangeWithHost=(text?:string)=>{setRealmSelection(null);if(pane)location.hash=playReturnRoute(state,hash);setHostArrangement({key:crypto.randomUUID(),text});};
  const detail=<Modal open={Boolean(pane)} className={`play-detail${pane==='inventory'&&params.get('tab')==='research'?' play-detail--workshop':''}`} title={pane==='character'?'人物档案':pane==='inventory'?'行囊与工坊':'人物与挑战'} onClose={()=>{location.hash=playReturnRoute(state,hash);}}><Suspense fallback={<LoadingPanel label="正在打开详情…"/>}>{pane==='character'?<CharacterPage key={hash} onOpenRealm={openRealm} onArrange={arrangeWithHost}/>:pane==='inventory'?<InventoryPage/>:pane==='world'?<WorldPage key={hash} onNavigate={onNavigate}/>:null}</Suspense></Modal>;
  const tools=<nav className="play-world-tools" aria-label="快捷操作"><PersonalQuickAction/><button className="play-world-tools__recover" disabled={view.busy||facts.loading||Boolean(facts.error)||!services||!scene.canRest||Boolean(block)} title={recoveryReason} onClick={()=>void run('party.recover',{})}><UiIcon name="camp"/><span>休整恢复<small>{services&&scene.canRest&&!block?'免费回满生命与魂力':recoveryReason}</small></span></button>{stage==='world'&&<><button className="play-world-tools__map" onClick={()=>setMapOpen(true)} aria-haspopup="dialog"><UiIcon name="forest"/><span>地图</span></button><button onClick={()=>setPracticeOpen(true)} aria-haspopup="dialog"><UiIcon name="ring"/><span>修炼</span></button><button onClick={()=>setDailyOpen(true)} aria-haspopup="dialog"><UiIcon name="wait"/><span>日常</span>{facts.data?.dailyPendingCount>0&&<small className="play-tool-badge">{facts.data.dailyPendingCount}</small>}</button></>}{(inExpedition||stage==='battle')&&<button onClick={openActivity} aria-haspopup="dialog"><UiIcon name={stage==='battle'?'beast':'forest'}/><span>{stage==='battle'?'战斗':'路线'}</span></button>}<button onClick={()=>onNavigate('competition')} aria-haspopup="dialog"><UiIcon name="cup"/><span>斗魂</span></button>{realmSouls.length>0&&<button data-testid="open-nine-beauties" onClick={()=>openRealm(realmSouls[0].id)} aria-haspopup="dialog"><UiIcon name="book"/><span>九美图</span></button>}</nav>;
  if(pane==='inventory')return <WorkspacePage onReturn={()=>{location.hash=playReturnRoute(state,hash);}}><Suspense fallback={<LoadingPanel label="正在打开工坊与行囊…"/>}><InventoryPage/></Suspense></WorkspacePage>;
  return <div inert={openingPlaying} aria-hidden={openingPlaying||undefined} className={`play-scene play-scene--story play-scene--${stage}${openingPlaying?' play-scene--opening':''}`}>
    <BackgroundQueriesPaused.Provider value={sceneCovered}>{narrow&&<div className="play-mobile-tools"><StatusEscapeActions facts={facts.data?.selfStatus}/>{tools}</div>}
    <aside className="play-cast" aria-label="当前场景人物">{stage==='dungeon'&&<div className="dungeon-location-title"><h1>{state.远征.当前.dungeonName}</h1><p>林深有魂 · 步履生光</p></div>}<QuerySurface query={facts}><div className="play-cast__sheet"><header><small>{stage==='dungeon'?'当前房间':'身在此地'}</small><h2>{stage==='dungeon'?'当前房间':'此地人物'}</h2></header>
      {stage==='dungeon'&&<div className="play-room-art" data-room={room?.type}>
        {['火堆','宝箱'].includes(room?.type)?<div className="play-room-art__painting" role="img" aria-label={room.type==='火堆'?'遗迹下的林间营火':'遗迹中的宝箱'}/>:<img src={assetUrl("/art/fantasy-v3/forest.png")} alt="林间景象"/>}
        <i className="play-room-art__symbol"><UiIcon name={room?.type==='火堆'?'camp':room?.type==='宝箱'?'chest':room?.type==='首领战斗'?'boss':room?.type==='精英战斗'?'elite':'beast'}/></i><span>{room?.type==='火堆'?'林间营火':room?.type==='宝箱'?(room.opened?'宝箱已开启':'静待开启的宝箱'):'林深处，万物有灵'}</span></div>}
      <div className="play-cast__list">{actors.map((item:any)=><button key={item.id} className="play-person" data-bloodline={item.beast?.lineage?.grade?.color} onClick={()=>setActorId(item.id)} aria-label={`查看${item.name}`}>
        <span className="play-person__art">{item.record?<CharacterPortrait state={state} figureUrl={view.figureUrl} person={item.record}/>:item.beast?<PortraitImage art={beastPortrait(item.beast)} name={item.name}/>:unitPortrait(state,item.id)?<PortraitImage art={unitPortrait(state,item.id)!} name={item.name}/>:<Avatar name={item.name}/>}</span><b>{item.name}</b><small>{item.detail}</small></button>)}{!actors.length&&<p className="muted">{stage==='dungeon'?'此间无人':'此处暂未见到可交互的人物。'}</p>}</div>
      {stage==='dungeon'&&<p className="play-cast__verse">风拂过林梢，<br/>只有树影与光在低语。</p>}</div></QuerySurface>
    </aside>
    </BackgroundQueriesPaused.Provider>
    <section className="play-center" aria-label="故事对话">
      <BackgroundPrologue onOpenChange={setOpeningPlaying}/>
      {view.modelTask&&<div className="play-model-task" role="status"><span>{view.modelTask.phase??view.modelTask.label}…</span><Button variant="ghost" onClick={()=>controller.cancelModelTask()}>取消</Button></div>}
      {stage==='battle'&&<section className="battle-background" role="status"><span>{automatic?`正在交战 · 第${state.战斗.回合}回合`:view.battleTurnError?.message??(state.战斗?.状态==='已结束'?'战斗已结束，等待结算':'交战已暂停')}</span><BattleQuickSettings/>{automatic?<Button variant="ghost" disabled={view.battlePauseRequested} onClick={()=>void controller.pauseAutomaticBattle()}>{view.battlePauseRequested?'正在暂停…':'暂停交战'}</Button>:<Button disabled={view.busy} onClick={()=>void controller.resumeAutomaticBattle().catch(()=>{})}>{state.战斗?.状态==='已结束'?'继续结算':'继续自动'}</Button>}</section>}
      <CompetitionResumeAction onContinue={()=>onNavigate('competition')}/>
      <BackgroundQueriesPaused.Provider value={sceneCovered}><LootDistribution/>
      {state.扩展?.story&&<BackgroundQueriesPaused.Provider value={backgroundHidden}><StoryChat deferBattleNarration={battlePlaying} arrangementRequest={hostArrangement} onArrangementConsumed={()=>setHostArrangement(null)} onCommunicationOpenChange={setCommunicationsOpen}/></BackgroundQueriesPaused.Provider>}
      {(stage!=='battle'||!activityOpen)&&<BattleReplayButton/>}
      <PersonalWithdrawal/></BackgroundQueriesPaused.Provider>

    </section>
    <BackgroundQueriesPaused.Provider value={sceneCovered}><aside className="play-hero" aria-label="主角状态与服务"><QuerySurface query={facts}><div className="play-hero__sheet"><button className="play-hero__identity" onClick={()=>open('character')}><span className="play-hero__portrait"><BattleUnitPortrait name={playerText(person?.name,state,'旅者')} avatarUrl={view.avatarUrl} portrait={unitPortrait(state,playerId)} figure={unitFigure(state,playerId,view.figureUrl)}/></span> <span><small>{growth?.魂力等级} 级魂师</small><strong>{playerText(person?.name,state,'旅者')}</strong><small>{scene.location?.name}</small></span><span aria-hidden="true">↗</span></button>
      <div className="play-hero__vitals">{growth?.可用属性点>0&&<button className="growth-points-notice" onClick={()=>open('character','状态')}>待分配属性点 · {growth.可用属性点} <span>加点 ↗</span></button>}<Progress label="生命" value={unit?.资源?.生命?.当前} maximum={unit?.资源?.生命?.最大} tone="life"/><Progress label="魂力" value={unit?.资源?.魂力?.当前} maximum={unit?.资源?.魂力?.最大} tone="soul"/>
        {stage!=='dungeon'&&<Progress label="经验" value={growth?.当前经验} maximum={growth?.当前等级需求}/>}<button className="text-link" onClick={()=>open('character','状态')}>状态与成长详情 ↗</button></div>
      {!narrow&&<StatusEscapeActions facts={facts.data?.selfStatus}/>}{facts.data?.custodyPendingCount>0&&<button className="text-link" onClick={()=>open('world','人物')}>战后人物待处置 · {facts.data.custodyPendingCount}</button>}
      {!narrow&&tools}
      <PartyPanel onPerson={setActorId}/><nav className="play-hero__links" aria-label="人物详情入口">{(stage==='dungeon'?[['人物','character','状态','person'],['武魂','character','武魂与技能','ring'],['行囊','inventory','items','bag']]:[['行囊','inventory','items','bag'],['装备','character','装备','equip'],['武魂','character','武魂与技能','ring'],['天赋','character','天赋','person'],['档案','world','人物','book']]).map(([label,target,tab,icon])=><button key={label} onClick={()=>open(target as PageId,tab)}>{stage==='dungeon'?<DungeonShortcutSymbol kind={icon}/>:<UiIcon name={icon as UiIconName}/>}<span className="play-shortcut-label">{label}</span></button>)}</nav></div>
      {services&&<section className="play-services" aria-label="当前地点服务"><small>{services?'此地可用':'秘境之中'}</small><h2>{services?'歇脚与整备':'此行探索'}</h2>
        {scene.location?.id==='loc-heaven-auction'&&<Button variant="secondary" disabled={Boolean(block)} onClick={()=>open('inventory','services')}>拍卖与委托</Button>}
        {services?<>{(scene.canRest||scene.dungeons.length>0)&&<CompanionPanel dungeonId={scene.dungeons[0]?.id} onSelectPerson={selectHirePerson}/>}  {scene.shops.length>0&&<Button variant="secondary" disabled={Boolean(block)} onClick={()=>open('inventory','services')}>商店与补给</Button>}{scene.service&&<Button variant="secondary" disabled={Boolean(block)} onClick={()=>open('inventory','research')}>工坊制作</Button>}{scene.venues.length>0&&<Button variant="secondary" onClick={()=>onNavigate('competition')}>斗魂比赛</Button>}{scene.location?.id===facts.data?.slaughterLocationId&&<Button variant="secondary" onClick={()=>onNavigate('slaughter')}>杀戮场</Button>}{localEvents.length>0&&<Button variant="ghost" onClick={()=>setEventsOpen(true)}>此地见闻</Button>}<Button variant="ghost" onClick={()=>open('world','终局挑战')}>终局挑战与旅程记录</Button>{block&&<p className="muted">{playerText(block,state)}</p>}</>:<p className="muted">选择路线继续探索；已取得的收获在安全撤离后带回。休整、商店与工坊在离开副本后开放。</p>}
      </section>}
      {stage==='dungeon'&&<section className="play-cargo"><h2>此行收获</h2><div>{(Object.values(state.远征?.当前?.tempMaterials??{}) as any[]).slice(0,4).map(stack=><span key={stack.fingerprint}><MaterialIllustration material={stack} name={materialName(stack,state)}/><b>×{stack.quantity}</b></span>)}{(state.远征?.当前?.tempItemIds??[]).slice(0,Math.max(0,4-Object.keys(state.远征?.当前?.tempMaterials??{}).length)).map((id:string)=>{const item=state.物品.实例[id];return item?<span key={id}><RelicIllustration item={item} kind={item.type} name={playerText(item.name,state,'珍藏')}/><b>×{item.quantity}</b></span>:null;})}</div>{!Object.keys(state.远征?.当前?.tempMaterials??{}).length&&!state.远征?.当前?.tempItemIds?.length&&<p>沿途的收获将留在这里。</p>}<button onClick={()=>setCargoOpen(true)}>查看战利品 <UiIcon name="forward"/></button><p className="play-cargo__verse">行于林，见自己。</p></section>}
    </QuerySurface></aside></BackgroundQueriesPaused.Provider>
    <Suspense fallback={null}><AdventurePage onNavigate={onNavigate} onSelectPerson={selectHirePerson} slaughterLocationId={facts.data?.slaughterLocationId} mapOpen={mapOpen} practiceOpen={practiceOpen} dailyOpen={dailyOpen} onCloseMap={()=>setMapOpen(false)} onClosePractice={()=>setPracticeOpen(false)} onCloseDaily={()=>setDailyOpen(false)}/></Suspense>
    {(stage==='battle'?battleInFront:inExpedition)&&<Modal open={activityOpen} title={stage==='battle'?'战斗与行动':'探索路线'} className={`play-activity-dialog ${stage==='battle'?'play-battle-dialog':'play-expedition-dialog'}`} onClose={()=>stage==='battle'?onNavigate(competitionScene?'competition':slaughterScene?'slaughter':'adventure'):setExpeditionOpen(false)}><div className={stage==='battle'?'play-activity-dialog__scene play-scene--battle':'play-activity-dialog__scene'}><Suspense fallback={<LoadingPanel label="正在展开场景…"/>}>{stage==='battle'?<BattlePage embedded onPlaybackChange={setBattlePlaying} onNavigate={onNavigate}/>:<ExpeditionScene onNavigate={onNavigate}/>}</Suspense><BattleReplayButton/></div></Modal>}
    <Modal open={cargoOpen} title="此行收获" onClose={()=>setCargoOpen(false)}><p>安全撤离后收入行囊。</p><div className="record-list">{(Object.values(state.远征?.当前?.tempMaterials??{}) as any[]).map(stack=><article key={stack.fingerprint}><b>{materialName(stack,state)}</b><span>×{stack.quantity}</span></article>)}{(state.远征?.当前?.tempItemIds??[]).map((id:string)=>{const item=state.物品.实例[id];return item?<article key={id}><b>{playerText(item.name,state,'珍藏')}</b><span>×{item.quantity}</span></article>:null;})}{!Object.keys(state.远征?.当前?.tempMaterials??{}).length&&!state.远征?.当前?.tempItemIds?.length&&<p>还没有收入此行行囊的物品。</p>}</div></Modal>
    <Modal open={Boolean(realmSelection&&realmSouls.some(s=>s.id===realmSelection.soulId))} title="九美图" className="realm-scroll-dialog" onClose={()=>setRealmSelection(null)}>{realmSelection&&<ResidentRealmPanel key={view.sessionId+realmSelection.realmId} realmId={realmSelection.realmId} personId={realmSelection.personId} onArrange={arrangeWithHost}/>}</Modal>
    {detail}
    <Modal open={competitionScene&&!pane} title="斗魂赛事" className="play-activity-dialog play-competition-dialog" onClose={()=>onNavigate('adventure')}><Suspense fallback={<LoadingPanel label="正在展开赛事…"/>}><CompetitionPage onNavigate={onNavigate} onOpen={open} historyId={params.get('history')??''}/></Suspense></Modal>
    <Modal open={slaughterScene&&!pane} title="杀戮试炼" className="play-activity-dialog" onClose={()=>onNavigate('adventure')}><Suspense fallback={<LoadingPanel label="正在展开试炼…"/>}><WorldPage activity="slaughter" onNavigate={onNavigate} onOpen={open}/></Suspense></Modal>
    <Modal className={record||state.人物.列表[actorId]?'modal--person':'modal--beast'} open={Boolean(actorId)} title={record?.name??actor?.name??'人物资料'} onClose={()=>{setActorId('');}} ><QuerySurface query={actorDetails}>
      {record?<PersonDossier key={`${view.sessionId}:${sceneScope}:${actorId}`} extraActions={<>{record.canonicalId==='yu-xiaogang-notting'&&stage==='world'&&(scene.location?.id==='loc-hunting-forest'||state.世界?.opening?.background?.config?.background?.id==='shrek-student')&&<OpeningGuidance onFinish={()=>setActorId('')}/>}</>} hireDungeonId={actorHireContext?.personId===actorId?actorHireContext.dungeonId:undefined} person={record} state={state} onReturn={()=>setActorId('')} notice={playerText(block,state,'')||undefined}/>:actorId&&(actorDetails.loading||actorDetails.error)?null:actor&&<>{!actor.beast&&state.人物.列表[actor.id]&&actor.id!==playerId&&<PersonInteractions characterId={actor.id} onOpen={()=>setActorId('')}/>}<div className="play-actor-detail" data-bloodline={actor.beast?.lineage?.grade?.color}>{record?<CharacterPortrait state={state} figureUrl={view.figureUrl} person={record} large/>:actor.beast?<PortraitImage art={beastPortrait(actor.beast)} name={actor.name}/>:unitPortrait(state,actor.id)?<PortraitImage art={unitPortrait(state,actor.id)!} name={actor.name}/>:<Avatar name={actor.name}/>}<p>{record?`${record.period} · ${record.faction} · ${record.level}级 · ${record.soul}`:actor.detail}</p>{actor.beast?.description&&<p>{playerText(actor.beast.description,state,'')}</p>}</div>{state.战斗单位.列表[actor.id]&&<><Progress label="生命" value={state.战斗单位.列表[actor.id].资源.生命.当前} maximum={state.战斗单位.列表[actor.id].资源.生命.最大} tone="life"/><Progress label="魂力" value={state.战斗单位.列表[actor.id].资源.魂力.当前} maximum={state.战斗单位.列表[actor.id].资源.魂力.最大} tone="soul"/></>}{record?<CharacterCombatArchive characterId={record.id} state={state} battleCapable={record.battleCapable}/>:<><PersonWornRestraints personId={actor.id}/><AbilityList unitId={actor.id}/></>}</>}
    </QuerySurface></Modal>
    <Modal open={eventsOpen&&services} title="此地见闻" onClose={()=>setEventsOpen(false)}><div className="choice-list">{localEvents.map((event:any)=><article key={event.id}><h3>{event.name}</h3><small>{event.speaker}</small><p>{event.completed?event.result:event.description}</p>{!event.completed&&<><p>{event.reasons.map((reason:string)=>playerText(reason,state)).join('；')}</p><Button disabled={!event.available||view.busy||facts.loading||Boolean(facts.error)} onClick={()=>void run('world.intent',{type:'world-event',eventId:event.id})}>与{event.speaker}交谈</Button></>}</article>)}</div></Modal>
  </div>;
}
