import {Component,useEffect,useState,type ReactNode} from 'react';
import DiagnosticExportButton from './DiagnosticExportButton';
import {useGame} from '../game-context';
import {Button} from '../components';
import {describeError} from '../error-text';
import {downloadPrepared} from '../file-transfer';

function RecoveryPage({resourceFailure,onOpenSaves,error}:{resourceFailure:boolean;onOpenSaves?:()=>void;error?:unknown}) {
  const {controller,view}=useGame();
  useEffect(()=>{if(error)void controller.reportFailure('ui.render',error);},[controller,error]);
  const [message,setMessage]=useState(''),[exporting,setExporting]=useState(false);
  const exportJourney=async()=>{
    setExporting(true);setMessage('');
    try {
      downloadPrepared(await controller.exportSaveFile(undefined,'douluo-journey-backup.json'));
      setMessage('旅程副本已导出。');
    }catch(error){setMessage(describeError(error))}finally{setExporting(false)}
  };
  return <section className="journey-recovery" aria-labelledby="page-recovery-heading">
    <div className="journey-recovery__sigil" aria-hidden="true">✦</div><small>旅程档案 · 界面恢复</small>
    <h1 id="page-recovery-heading">这页暂时未能展开</h1>
    <p>{resourceFailure?'界面资源未能完整载入。请检查连接后刷新页面，或先保存一份旅程副本。':'这页遇到了问题。可以先打开存档管理，或导出旅程后刷新页面。'}</p>
    <p>刷新会重新读取此浏览器中已保存的进度。</p>
    <div className="card-actions" style={{justifyContent:'center'}}>
      <Button onClick={()=>location.reload()} disabled={exporting}>刷新并重新读取</Button>
      {onOpenSaves&&<Button variant="secondary" onClick={onOpenSaves}>打开存档管理</Button>}
      <Button variant="ghost" disabled={exporting||view.busy} onClick={()=>void exportJourney()}>导出旅程副本</Button>
      <DiagnosticExportButton/>
    </div>
    {message&&<p role="status">{message}</p>}
  </section>;
}

export default class PageRecoveryBoundary extends Component<{children:ReactNode;onOpenSaves?:()=>void},{failed:boolean;resourceFailure:boolean;error?:unknown}> {
  state:{failed:boolean;resourceFailure:boolean;error?:unknown}={failed:false,resourceFailure:false};
  static getDerivedStateFromError(error:unknown) {
    const message=error instanceof Error?error.message:'';
    return {failed:true,error,resourceFailure:/dynamically imported|module script|loading chunk|failed to fetch|import.*failed/i.test(message)};
  }
  render(){return this.state.failed?<RecoveryPage error={this.state.error} resourceFailure={this.state.resourceFailure} onOpenSaves={this.props.onOpenSaves}/>:this.props.children;}
}
