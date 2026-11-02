import {useEffect,useState} from 'react';
import {Button,Modal} from '../components';
import {useGameController} from '../game-context';
interface UpdateState {phase:string;note:string;version:string;target:string|null;progress:number;rollbackVersion:string|null}
declare global {
  interface Window {douluoDesktop?:Record<'version'|'check'|'download'|'cancel'|'install'|'rollback'|'booted',()=>Promise<UpdateState>>&{chatgpt?:import('../../shared/chatgpt-plan').DesktopChatGPT;credentials?:import('../../runtime/desktop-model-credentials').DesktopCredentials;cancelQuery?:(requestId:string)=>void;modelPermit:(base:string,url:string,method:string)=>Promise<string>}}
}
export default function DesktopUpdate(){
  const controller=useGameController(), bridge=window.douluoDesktop;
  const [open,setOpen]=useState(false),[state,setState]=useState<UpdateState|null>(null),[error,setError]=useState('');
  const [working,setWorking]=useState(false);
  useEffect(()=>{
    if(!open||!bridge)return;
    let current=true;
    const refresh=()=>bridge.version().then(value=>{if(current)setState(value);}).catch(()=>{if(current)setError('暂时无法读取更新状态');});
    void refresh();const timer=setInterval(refresh,600);
    return ()=>{current=false;clearInterval(timer);};
  },[open,bridge]);
  if(!bridge)return null;
  const run=async(action:'check'|'download'|'cancel'|'install'|'rollback')=>{
    if(working&&action!=='cancel')return;
    setWorking(true);setError('');
    try{
      setState(action==='install'||action==='rollback'?await controller.installDesktopUpdate(()=>bridge[action]()):await bridge[action]());
    }catch(failure){setError(failure instanceof Error?failure.message:'更新未完成');}
    finally{setWorking(false);}
  };
  return <><Button variant="ghost" onClick={()=>{setOpen(true);if(!state||['idle','manual','current','error'].includes(state.phase))void run('check');}}>检查桌面更新</Button>
    <Modal open={open} onClose={()=>setOpen(false)} title="桌面游戏更新">
      {state&&<p>当前版本 {state.version}{state.target?' · 可更新至 '+state.target:''}</p>}
      <p role="status">{error||state?.note||'正在检查版本…'}</p>
      {state?.phase==='downloading'&&<><progress max={100} value={state.progress}/><Button onClick={()=>void run('cancel')}>取消下载</Button></>}
      {state?.phase==='available'&&<Button disabled={working} onClick={()=>void run('download')}>下载新版</Button>}
      {state?.phase==='downloaded'&&<Button disabled={working} onClick={()=>void run('install')}>保存并重启更新</Button>}
      {state?.rollbackVersion&&<Button variant="ghost" disabled={working} onClick={()=>void run('rollback')}>打开更新前的 {state.rollbackVersion} 和备份存档</Button>}
      {state?.phase==='error'&&<Button disabled={working} onClick={()=>void run('check')}>重新检查</Button>}
    </Modal></>;
}
