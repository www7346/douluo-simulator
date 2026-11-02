import {UpdatesPage,UpdateNoticePopup} from './components/UpdateNotices';
import { lazy, Suspense, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { GameProvider } from './game-context';
import { Button, Panel, LoadingPanel, ToastRegion } from './components';
import { WebGameController } from './controller';
import JourneyRecovery from './components/JourneyRecovery';
import {playerText} from '../runtime/player-text';
import {scenePlace} from './scene-place';
import {pendingBattleAftermath} from '../runtime/journey-status';
import PageRecoveryBoundary from './components/PageRecoveryBoundary';
import DiagnosticExportButton from './components/DiagnosticExportButton';
import {gameAudio} from './game-audio';
import JourneyFeedback from './components/JourneyFeedback';
import ResultRecovery from './components/ResultRecovery';
import ConnectionNotice from './components/ConnectionNotice';
import ModelTaskStatus from './components/ModelTaskStatus';
import PlayScene from './components/PlayScene';
import QuickSoundControl from './components/QuickSoundControl';
import UiIcon from './components/UiIcon';
import CalculationStatus from './components/CalculationStatus';
import './styles.css';
import './components/bound-portrait.css';
import './scenes.css';
import './soul-rings.css';
import './inventory-scenes.css';
import './menu-settings.css';
import './candidate-selection.css';
import './feedback-polish.css';
import './quick-sound.css';
import './quality-grades.css';
import './generated-art.css';
import './battle-scenes.css';
import './play-scene.css';
import './expedition-scenes.css';
import './creation-scenes.css';
import './world-scenes.css';
import './fantasy-v4.css';
import './fantasy-interiors.css';
import './fantasy-character.css';
import './fantasy-supplement.css';
import './fantasy-final.css';
import './fantasy-responsive.css';
import './ui-refinement.css';
import './components/master-guidance.css';
import './components/opening-stage.css';
import './dungeon-atlas.css';
import './competition-scene.css';
import './activity-scenes.css';
import './ability-console.css';
import './inventory-responsive.css';
import './story-play-layout.css';
import './worn-restraints.css';
import './captivity.css';
import './creation-quick.css';
import './opening-workshop.css';
import './creation-usability.css';
import './action-visibility.css';
import './workspace-pages.css';
import {playReturnRoute} from '../runtime/play-scene';

const HomePage = lazy(() => import('./pages/HomePage'));
const CreationPage = lazy(() => import('./pages/CreationPage'));
const SystemPage = lazy(() => import('./pages/SystemPage'));
const SavesPage = lazy(() => import('./pages/SavesPage'));

export type PageId = 'updates' | 'home' | 'creation' | 'character' | 'adventure' | 'inventory' | 'world' | 'system' | 'saves' | 'battle' | 'competition' | 'slaughter';

const PAGES: Record<PageId, {label: string; glyph: string}> = {
  updates: {label:'更新公告',glyph:'✦'},
  home: {label: '首页', glyph: '✦'},
  creation: {label: '觉醒', glyph: '◇'},
  character: {label: '魂师', glyph: '◈'},
  adventure: {label: '征途', glyph: '⌁'},
  inventory: {label: '行囊', glyph: '▱'},
  world: {label: '万象', glyph: '◎'},
  system: {label: '设置', glyph: '⚙'},
  saves: {label: '存档', glyph: '▱'},
  slaughter: {label:'杀戮场',glyph:'⚔'},
  competition: {label:'赛事',glyph:'♜'},
  battle: {label: '战斗', glyph: '⚔'},
};

function currentRoute(): PageId {
  const route = location.hash.replace(/^#\/?/, '').split('?')[0] as PageId;
  return route in PAGES ? route : 'home';
}

function Shell({controller}: {controller: WebGameController}) {
  const view = useSyncExternalStore(controller.subscribe, controller.getScreenView, controller.getScreenView);
  const [noticeReturn,setNoticeReturn]=useState('/home');
  const [page, setPage] = useState<PageId>(currentRoute);
  const state = view.snapshot.state as any;
  const playerId = state?.角色?.主控单位ID;
  const person = state?.人物?.列表?.[playerId];
  const battleActive = state?.战斗?.状态 === '进行中';
  const aftermathPending=pendingBattleAftermath(state);
  const journeyEnded=state?.战斗单位?.列表?.[playerId]?.存活状态==='死亡'&&!battleActive&&!aftermathPending;

  useEffect(() => {
    const onHash = () => setPage(currentRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(()=>{if(view.ready&&!view.connecting&&!view.loadError&&!view.connectionError)void window.douluoDesktop?.booted().catch(()=>{});},[view.ready,view.connecting,view.loadError,view.connectionError]);
  useEffect(() => { document.documentElement.dataset.performance = view.performance; }, [view.performance]);
  useEffect(()=>gameAudio.attach(),[]);
  useEffect(()=>gameAudio.configure(view.sound),[view.sound]);
  useEffect(()=>{if(page==='system'||page==='saves')return;gameAudio.setScene(battleActive||aftermathPending?'battle':person?'forest':'cultivation');},[page,battleActive,aftermathPending,Boolean(person)]);
  useEffect(() => {window.scrollTo({top:0,left:0,behavior:'instant'});},[page,view.profileId,view.sessionId,state?.远征?.当前?.id]);

  const navigate = (next: PageId) => {
    if(next==='updates')setNoticeReturn(location.hash.replace(/^#/,'')||'/home');
    const source=playReturnRoute(state,location.hash);
    const route = `/${next}${['saves','system'].includes(next)&&['/competition','/slaughter'].includes(source.split('?')[0])?'?from='+source.split('?')[0].slice(1)+(source.includes('?')?'&'+source.split('?')[1]:''):''}`;
    if(page==='system'&&next!=='system'){window.dispatchEvent(new CustomEvent('douluo:leave-settings',{detail:{route}}));return;}
    location.hash = route;
    setPage(next);
  };

  if (!view.ready) return <LoadingPanel label="正在读取旅程…" />;

  const content = (() => {
    if(view.loadError&&!['home','system','saves','updates'].includes(page))return <Panel title={view.connectionError?'旅程等待连接':'旅程暂未读取'}><p role="alert">{view.loadError}</p><Button onClick={()=>navigate('saves')}>打开存档</Button><DiagnosticExportButton/></Panel>;
    if(journeyEnded&&!['home','system','saves','updates'].includes(page))return <JourneyRecovery key={`${view.profileId}:${view.sessionId}`} onOpenSaves={()=>navigate('saves')} onRecovered={()=>navigate('adventure')}/>;
    if (page === 'updates') return <UpdatesPage onReturn={()=>{location.hash=noticeReturn;}}/>;
    if (page === 'home') return <HomePage onNavigate={navigate} />;
    if (page === 'creation') return <CreationPage key={`${view.profileId}:${view.sessionId}`} onNavigate={navigate} />;
    if (page === 'system') return <SystemPage />;
    if (page === 'saves') return <SavesPage onNavigate={navigate} />;
    return <PlayScene page={page} onNavigate={navigate}/>;
  })();

  const inPlay = ['character','adventure','inventory','world','battle','competition','slaughter'].includes(page)&&!journeyEnded;
  const fullBattle = false;
  return (
    <div className={`app-shell app-shell--${page}${inPlay ? ' app-shell--play' : ''}`}>
      <div className="scene-backdrop" aria-hidden="true"/>
      {!fullBattle && <header className="topbar">
        <button className="brand" onClick={() => navigate('home')} aria-label="返回首页"><span className="brand__sigil"><UiIcon name="forest"/></span><span><strong>斗罗大陆</strong><small>武魂模拟器</small></span></button>
        <div className="topbar__tools"><div className="topbar__status">{person ? <><span>{playerText(person.name,state,'旅者')}</span><span>{state?.成长?.列表?.[playerId]?.魂力等级 ?? 1} 级</span><span>{scenePlace(state)}</span></> : <span>武魂觉醒，故事由你书写</span>}</div>{inPlay&&<><button className="text-link" onClick={()=>navigate('saves')}>存档</button><button className="text-link" onClick={()=>navigate('system')}>设置</button></>}{page!=='system'&&<QuickSoundControl key={page}/>}<button className="text-link" onClick={()=>navigate('updates')}>更新公告</button></div>
      </header>}
      <main className={fullBattle ? 'page-stage page-stage--battle' : 'page-stage'}><JourneyFeedback view={view}/>
        <ResultRecovery inline={page==='saves'||page==='home'} key={`${view.profileId}:${view.sessionId}`}/>
        {view.connecting&&<p role="status">已读取本机存档，正在连接计算服务…</p>}
        <ConnectionNotice onOpenSaves={()=>navigate('saves')}/>
        {view.modelTask && !inPlay && <ModelTaskStatus task={view.modelTask} onCancel={()=>controller.cancelModelTask()}/>}
        <PageRecoveryBoundary key={page==='saves'?'saves':`${inPlay?'play':page}:${view.profileId}:${view.sessionId}`} onOpenSaves={page==='saves'?undefined:()=>navigate('saves')}><Suspense fallback={<LoadingPanel label="正在装载界面…" />}>{content}</Suspense></PageRecoveryBoundary></main>
      {view.busy && <div className="busy-line" role="progressbar" aria-label="正在结算" />}
      <CalculationStatus key={`${view.profileId}:${view.sessionId}`}/>
      <UpdateNoticePopup safe={page==='home'&&!view.busy&&!view.modelTask&&!battleActive&&!aftermathPending} onOpen={()=>navigate('updates')}/>
      <ToastRegion notices={view.notices} dismiss={id => controller.dismissNotice(id)} />
    </div>
  );
}

export function App() {
  const controller = useMemo(() => new WebGameController(), []);
  useEffect(() => { void controller.initialize(); }, [controller]);
  return <GameProvider controller={controller}><PageRecoveryBoundary><Shell controller={controller} /></PageRecoveryBoundary></GameProvider>;
}
