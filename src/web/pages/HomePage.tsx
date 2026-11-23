import {assetUrl} from '../asset-delivery';
import {useState} from 'react';
import {Button,Modal} from '../components';
import {useGame} from '../game-context';
import {describeError} from '../error-text';
import type {PageId} from '../App';
import UiIcon from '../components/UiIcon';
import DesktopUpdate from '../components/DesktopUpdate';
import DiagnosticExportButton from '../components/DiagnosticExportButton';
import '../title-scene.css';
import {isAndroidGame} from '../../runtime/android-platform';

export default function HomePage({onNavigate}:{onNavigate:(page:PageId)=>void}) {
  const {controller,view}=useGame();
  const [open,setOpen]=useState(false),[name,setName]=useState('新的旅程'),[error,setError]=useState('');
  const [updating,setUpdating]=useState(false);
  const update=async()=>{setUpdating(true);setError('');try{await controller.prepareUpdate();location.assign('/update.html?return=%23%2Fhome');}catch(e){setError(describeError(e));setUpdating(false);}};
  const start=async()=>{try {setError('');await controller.createProfile(name);setOpen(false);onNavigate('creation');}catch(e){setError(describeError(e));}};
  return <section className="title-scene">
    <img className="title-scene__landscape" src={assetUrl("/art/fantasy-v3/cover.png")} alt="花园与学院前的三位魂师" fetchPriority="high"/>
    <div className="title-scene__veil" aria-hidden="true"/><div className="title-scene__petals" aria-hidden="true"><i/><i/><i/><i/><i/></div>
    <div className="title-scene__copy"><span className="eyebrow">与你相遇 · 由此启程</span><h1 aria-label="斗罗大陆：武魂模拟器">斗罗大陆</h1>
      <p className="title-scene__subtitle"><span aria-hidden="true"/>武魂模拟器<span aria-hidden="true"/></p><p className="title-scene__intro">唤醒属于你的武魂，<br/>在这片大陆上，写下自己的故事。</p>
      <div className="title-scene__actions" aria-label="主菜单">
        <Button disabled={view.busy||updating} onClick={()=>setOpen(true)} data-testid="new-story"><UiIcon name="forest"/>新的故事 <UiIcon name="forward"/></Button>
        <Button variant="secondary" disabled={updating} onClick={()=>onNavigate('saves')}><UiIcon name="book"/>读取存档 <UiIcon name="forward"/></Button>
        <Button variant="ghost" disabled={updating} onClick={()=>onNavigate('system')}><UiIcon name="settings"/>设置 <UiIcon name="forward"/></Button>
      </div>
      {!isAndroidGame&&<div className="title-scene__utilities">{window.douluoDesktop?<DesktopUpdate/>:<Button variant="ghost" disabled={updating||view.busy&&!view.loadError||!!view.modelTask} onClick={()=>void update()} data-testid="manual-update">{updating?'正在准备更新…':'手动更新'}</Button>}</div>}
      {view.loadError&&<div className="diagnostic-message"><p role="alert">{view.loadError}</p><a href="/#/saves?recovery=1">打开本机存档</a>{!isAndroidGame&&<>{' · '}{window.douluoDesktop?<DesktopUpdate/>:<a href="/update.html?return=%23%2Fhome" onClick={event=>{event.preventDefault();if(!updating)void update();}}>打开更新页</a>}</>}<DiagnosticExportButton/></div>}
      {error&&!open&&<p role="alert">{error}</p>}
    </div><footer className="title-scene__footer"><span>斗罗同人 · 免费游玩</span><button className="text-link" onClick={()=>onNavigate('updates')}>更新公告与后续计划</button><span>武魂觉醒 · 秘境猎魂 · 九环登临</span></footer>
    <Modal open={open} title="开启新的故事" onClose={()=>{if(!view.busy)setOpen(false);}} actions={<><Button variant="ghost" disabled={view.busy} onClick={()=>setOpen(false)}>取消</Button><Button disabled={view.busy||!name.trim()} onClick={()=>void start()}>创建世界与角色</Button></>}>
      <p>每段故事拥有独立的世界和一位主角，以及三个手动存档位和一个自动存档位。已有旅程会保留。</p>
      <label>世界名称<input value={name} maxLength={60} onChange={e=>setName(e.target.value)} /></label><p className="muted">接下来为这段故事创建主角与武魂。</p>{error&&<p role="alert">{error}</p>}
    </Modal>
  </section>;
}
