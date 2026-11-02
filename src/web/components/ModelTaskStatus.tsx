import {useEffect,useState} from 'react';
import type {ModelTaskView} from '../../runtime/model-task';
import {Button} from '../components';

export function modelTaskPresentation(task:ModelTaskView){
 const phase=task.phase??'';
 if(/正在构思/.test(phase))return {title:'AI 正在思考',detail:phase};
 if(/正在接收/.test(phase))return {title:'正在接收 AI 答复',detail:phase};
 if(/完成|已收到/.test(phase))return {title:'AI 已答复，正在整理结果',detail:phase};
 if(/等待模型答复/.test(phase))return {title:'AI 请求进行中',detail:'正在等待模型服务答复'};
 return {title:'正在准备 AI 请求',detail:phase||'正在保存输入并与服务器核对'};
}
export default function ModelTaskStatus({task,onCancel}:{task:ModelTaskView;onCancel:()=>void}){
 const [now,setNow]=useState(Date.now());
 useEffect(()=>{setNow(Date.now());const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[task.id]);
 const text=modelTaskPresentation(task),seconds=Math.max(0,Math.floor((now-task.startedAt)/1000));
 return <section className="model-task-status" role="status" aria-live="polite" data-testid="model-task-status">
  <span className="loading-ring" aria-hidden="true"/><div><strong>{text.title}</strong><p>{task.label} · {text.detail}</p><small>已等待 {seconds} 秒</small></div>
  <Button variant="secondary" onClick={onCancel}>停止 AI 请求</Button>
 </section>;
}
