import {useEffect,useState,useSyncExternalStore} from 'react';
import {useGameController} from '../game-context';
import {createPortal} from 'react-dom';
import type {CalculationProgress} from '../../shared/calculation-progress';
import './calculation-status.css';

export default function CalculationStatus(){
 const controller=useGameController();
 const progress=useSyncExternalStore(controller.subscribe,controller.getCalculationProgress,controller.getCalculationProgress);
 return progress?<ProgressNotice key={progress.operationId} progress={progress}/>:null;
}

function ProgressNotice({progress}:{progress:CalculationProgress}){
 const [visible,setVisible]=useState(false);
 useEffect(()=>{setVisible(false);const timer=setTimeout(()=>setVisible(true),Math.max(0,2000-(Date.now()-progress.startedAt)));return()=>clearTimeout(timer);},[progress.operationId,progress.startedAt]);
 if(!visible)return null;
 const work=progress.work,saving=progress.phase==='saving';
 const title=saving?'正在保存行动结果':work?.kind==='arena'?'正在结算赛事':work?.kind==='travel'?'正在处理行程':'正在处理这次行动';
 const detail=saving?'保存完成后即可继续。':work?.kind==='arena'?`已处理 ${work.completed} / ${work.total} 场${work.round&&work.completed<work.total?` · 正在推演第 ${work.round} 轮`:''}`:work?.kind==='travel'?`已走完 ${work.completed} / ${work.total} 段${work.legPercent!==undefined?` · 当前路段 ${work.legPercent}%`:''}`:'计算完成后会自动保存，你可以继续查看人物和资料。';
 return createPortal(<section className="calculation-status" role="status" aria-live="polite" aria-label="行动计算进度" data-testid="calculation-status"><span className="loading-ring" aria-hidden="true"/><div><strong>{title}</strong><p>{detail}</p></div></section>,document.body);
}
