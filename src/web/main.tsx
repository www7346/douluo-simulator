import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import {registerOfflineSupport} from './offline-support';
import {startupUpdateTarget} from './startup-update';

const container = document.getElementById('root');
if (!container) throw new Error('页面根节点不存在');

async function start(){
 if(import.meta.env.PROD&&import.meta.env.MODE!=='art-review'&&import.meta.env.MODE!=='desktop'){
  container!.textContent='正在检查游戏版本…';
  const build=document.querySelector<HTMLMetaElement>('meta[name="douluo-build"]')?.content??'';
  const target=await startupUpdateTarget(build,location.hash);
  if(target){location.replace(target);return;}
  void registerOfflineSupport();
 }
 createRoot(container!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
}
void start();
