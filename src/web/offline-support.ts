type OfflineStatus='online'|'preparing'|'prepared'|'ready'|'update'|'unavailable';
let status:OfflineStatus='online';
const listeners=new Set<()=>void>();
let versions={page:typeof document==='undefined'?'':document.querySelector<HTMLMetaElement>('meta[name="douluo-build"]')?.content??'旧版（未标记）',server:'尚未检查',active:'尚未核对',waiting:'无',message:''};
export const getVersionStatus=()=>versions;
const versionPatch=(patch:Partial<typeof versions>)=>{versions={...versions,...patch};listeners.forEach(listener=>listener());};
async function workerVersion(worker:ServiceWorker|null):Promise<string>{if(!worker)return '无';return new Promise(resolve=>{const channel=new MessageChannel();const timer=setTimeout(()=>{channel.port1.close();resolve('旧版（未标记）');},1800);channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();resolve(String(e.data?.build??'未知'));};worker.postMessage({type:'DOULUO_OFFLINE_STATUS'},[channel.port2]);});}
export async function checkGameUpdate(){
 versionPatch({message:'正在检查…'});
 try{const response=await fetch('/version.json',{cache:'no-store',signal:AbortSignal.timeout(5000)});if(!response.ok)throw Error();const value=await response.json();if(value.app!=='douluo-independent-web')throw Error();versionPatch({server:value.build});
  const registration=await navigator.serviceWorker?.getRegistration();if(registration)await registration.update();
  versionPatch({active:await workerVersion(navigator.serviceWorker?.controller??null),waiting:await workerVersion(registration?.waiting??null),message:versions.page===value.build?'当前页面已是入口提供的版本。':'发现新版。刷新或下次进入游戏时会自动更新，也可现在保存并更新。'});
 }catch{versionPatch({message:'暂时无法检查更新。本机进度仍保留，恢复连接后可以重试。'});}
}
const publish=(next:OfflineStatus)=>{status=next;listeners.forEach(listener=>listener());};
export const subscribeOffline=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
export const getOfflineStatus=()=>status;
export const offlineMessages:Record<OfflineStatus,string>={
  online:'玩法计算需要连接服务器，存档保存在本机。',
  preparing:'正在准备存档查看界面，图片会在用到时下载。',
  prepared:'本地查看界面已准备，重新打开后可在断网时导出存档。推进旅程需要联网。',
  ready:'已缓存必要界面和看过的素材。断网时可以导出本地存档，推进旅程需要联网。',
  update:'新版界面已准备，可先保存进度再更新。',
  unavailable:'本地查看界面尚未缓存。请保持连接，并及时导出需要保留的存档。',
};
export async function registerOfflineSupport(){
  if(!('serviceWorker'in navigator)||location.protocol==='file:'){publish('unavailable');return;}
  publish('preparing');
  try{
    const registration=await navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'});
    const ask=()=>navigator.serviceWorker.controller?.postMessage({type:'DOULUO_OFFLINE_STATUS'});
    navigator.serviceWorker.addEventListener('message',event=>{
      if(event.source===navigator.serviceWorker.controller&&event.data?.type==='DOULUO_OFFLINE_STATUS'&&event.data.assets>0){versionPatch({active:String(event.data.build)});publish(registration.waiting?'update':'ready');}
    });
    navigator.serviceWorker.addEventListener('controllerchange',ask);
    const observe=()=>{
      if(registration.waiting){publish('update');return;}
      const installing=registration.installing;
      if(installing)installing.addEventListener('statechange',()=>{
        if(installing.state==='installed')publish(navigator.serviceWorker.controller?'update':'prepared');
        if(installing.state==='redundant')publish('unavailable');
      });
      else if(registration.active&&!navigator.serviceWorker.controller)publish('prepared');
      ask();
    };
    registration.addEventListener('updatefound',observe);observe();
    // Registration and update failures are contained; local saves stay usable.
    void registration.update().catch(()=>{if(status==='preparing')publish('unavailable');});
  }catch{publish('unavailable');}
}
