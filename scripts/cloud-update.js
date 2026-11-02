const message=document.querySelector('#message'),retry=document.querySelector('#retry');
const describe=text=>{message.textContent=text;};
document.querySelector('a[href="/#/saves"]')?.setAttribute('href','/#/saves?recovery=1');
const requestedReturn=new URLSearchParams(location.search).get('return')??'#/saves';
const returnHash=/^#\/(home|creation|character|adventure|inventory|world|system|saves|battle|competition|slaughter|updates)(\?[^#\r\n]*)?$/.test(requestedReturn)?requestedReturn:'#/saves';
const returnToGame=()=>location.replace('/'+returnHash);
function version(worker){return new Promise(resolve=>{
  if(!worker){resolve(null);return;}
  const channel=new MessageChannel(),timer=setTimeout(()=>{channel.port1.close();resolve(null);},2000);
  channel.port1.onmessage=event=>{clearTimeout(timer);channel.port1.close();resolve(event.data?.build??null);};
  worker.postMessage({type:'DOULUO_OFFLINE_STATUS'},[channel.port2]);
});}
async function update(){
  retry.disabled=true;
  try{
    describe('正在检查新版本。存档和本机设置会保留。');
    const response=await fetch('/version.json',{cache:'no-store',signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw Error();const next=await response.json();
    if(next.app!=='douluo-independent-web'||next.delivery!=='cloud')throw Error();
    if(!('serviceWorker' in navigator)){returnToGame();return;}
    const registration=await navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'});await registration.update();
    const end=Date.now()+90000;
    while(Date.now()<end){
      if(await version(registration.active)===next.build){returnToGame();return;}
      if(registration.waiting&&await version(registration.waiting)===next.build){
        describe('新版已准备，正在等待其他游戏标签页。请先在其他页面保存，再关闭或刷新它们；本页会继续更新，不会打断其他页面的游戏。');
        registration.waiting.postMessage({type:'DOULUO_ACTIVATE',build:next.build});
      }else describe('正在准备新版界面，仅下载必要资源，请保持连接。');
      await new Promise(resolve=>setTimeout(resolve,1200));
    }
    describe('更新尚未完成。请关闭其他游戏标签页后重试，本机存档仍保留。');
  }catch{describe('暂时无法更新。请恢复连接后重试，或返回查看本机存档。');}
  finally{retry.disabled=false;}
}
retry.addEventListener('click',()=>void update());void update();
