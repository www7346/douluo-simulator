import type {FullSaveBundle} from '../shared/save-bundle';

export function inspectSave(input:File|string,signal:AbortSignal):Promise<FullSaveBundle>{
  signal.throwIfAborted();
  return new Promise((resolve,reject)=>{
    const worker=new Worker(new URL('./save-import-worker.ts',import.meta.url),{type:'module'});
    const stop=()=>{signal.removeEventListener('abort',abort);worker.terminate();};
    const abort=()=>{stop();reject(signal.reason);};
    signal.addEventListener('abort',abort,{once:true});
    worker.onmessage=({data})=>{stop();if(data.error)reject(Error(data.error));else resolve(data.bundle);};
    worker.onerror=()=>{stop();reject(Error('存档读取中断，请重新选择文件'));};
    worker.postMessage(input);
  });
}
export function importSummary(bundle:FullSaveBundle){
  const state=bundle.snapshot.state as any,id=state?.角色?.主控单位ID,time=state?.世界?.时间;
  const name=state?.人物?.列表?.[id]?.name,level=state?.成长?.列表?.[id]?.魂力等级;
  return [name?`${name} · ${level??1} 级`:'创建中的角色',
    time?`第 ${time.day} 天 ${String(time.hour).padStart(2,'0')}:${String(time.minute).padStart(2,'0')}`:'',
    `${bundle.storyHistory.length} 段历史`,bundle.battleReplay?'含战前存档':''].filter(Boolean).join(' · ');
}
