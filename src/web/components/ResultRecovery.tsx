import {useEffect,useRef,useState} from 'react';
import {useGame} from '../game-context';
import {Button,Modal} from '../components';
import DiagnosticExportButton from './DiagnosticExportButton';
import './result-recovery.css';
import {resultRecoveryIdentity} from '../../shared/result-recovery-identity';

export default function ResultRecovery({inline=false}:{inline?:boolean}={}){
 const {view,controller}=useGame(),[working,setWorking]=useState(false),[localError,setLocalError]=useState('');
 const [dismissed,setDismissed]=useState('');
 const mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 const recovery=view.resultRecovery,pending=view.pendingGeneration;
 const identity=resultRecoveryIdentity(view);
 if(!recovery&&!pending)return null;
 const expired=recovery?.category==='expired',saved=recovery?.phase==='command'||recovery?.phase==='ack';
 const needsNew=expired||!saved&&recovery?.canRetrySameJob===false&&['model-result-failed','model-cancel-confirmed'].includes(recovery.stage);
 const execute=async(regenerate=false)=>{if(working)return;setWorking(true);setLocalError('');try{await controller.resumePendingGeneration(regenerate);}catch(error){if(mounted.current)setLocalError((error as Error).message);}finally{if(mounted.current)setWorking(false);}};
 const abandon=async()=>{if(working)return;setWorking(true);setLocalError('');try{await controller.abandonPendingResult();}catch(error){if(mounted.current)setLocalError((error as Error).message);}finally{if(mounted.current)setWorking(false);}};
 const active=working||!!view.modelTask;
 const card=<section className="result-recovery" data-testid="result-recovery" role={recovery?'alert':'status'}>
  <div className="result-recovery__body"><strong>{saved?'完成这次保存':expired?'原生成任务已无法取回':needsNew?'原生成任务未完成':recovery?'这次操作还差一步':'继续完成这次行动'}</strong>
   <p>{recovery?.message??'这次行动需要补全人物或能力资料。先取回原任务，再继续原来的操作。'}</p>
   {recovery?.expiresAt&&!expired&&<small>原结果保留至 {new Date(recovery.expiresAt).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</small>}
   {needsNew&&<p>系统会先检查原操作；仍需生成时，会发起一次新的模型请求。</p>}
   {localError&&localError!==recovery?.message&&<p role="alert">{localError}</p>}
  </div>
  <div className="result-recovery__actions"><Button disabled={active} onClick={()=>void execute(needsNew)}>{working?'正在继续…':saved?'完成保存':needsNew?'重新生成':'取回并完成'}</Button>
   {active&&view.modelTask?<Button variant="ghost" onClick={()=>controller.cancelModelTask()}>停止生成</Button>:<DiagnosticExportButton/>}
   {!saved&&!active&&<Button variant="ghost" onClick={()=>void abandon()}>放弃这次未执行的操作</Button>}
   {!inline&&dismissed===identity&&recovery&&<Button variant="ghost" onClick={()=>setDismissed('')}>展开恢复提示</Button>}
  </div>
 </section>;
 return !inline&&recovery&&dismissed!==identity?<Modal open title="继续这次操作" className="result-recovery-dialog" onClose={()=>setDismissed(identity)}>{card}<p className="muted">{saved?'关闭后仍可查看旅程，原行动留待继续保存。':'关闭只收起提示；不需要这次设计时，可以放弃未执行的操作。'}</p></Modal>:card;
}
