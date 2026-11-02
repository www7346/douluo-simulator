import type {ExportSource} from '../runtime/save-export';
import type {GameDatabase} from '../runtime/storage';
import {prepareJsonDownload,type PreparedDownload} from './file-transfer';

export function prepareWorldExport(db:GameDatabase,source:ExportSource,name?:undefined,signal?:AbortSignal):Promise<string>;
export function prepareWorldExport(db:GameDatabase,source:ExportSource,name:string,signal?:AbortSignal):Promise<PreparedDownload>;
export async function prepareWorldExport(db:GameDatabase,source:ExportSource,name?:string,signal?:AbortSignal):Promise<string|PreparedDownload>{
  signal?.throwIfAborted();
  const locally=async()=>{
    const json=await db.serializeWorld(source);
    signal?.throwIfAborted();
    return name===undefined?json:prepareJsonDownload(json,name);
  };
  if(typeof Worker==='undefined'||!db.sharesBrowserDatabase)return locally();
  return new Promise((resolve,reject)=>{
    let worker:Worker,started=false;
    try{worker=new Worker(new URL('./save-export-worker.ts',import.meta.url),{type:'module'});}
    catch{resolve(locally());return;}
    const stop=()=>{signal?.removeEventListener('abort',abort);worker.terminate();};
    const abort=()=>{stop();reject(signal?.reason);};
    signal?.addEventListener('abort',abort,{once:true});
    worker.onmessage=({data})=>{
      if(data.started){started=true;return;}
      stop();if(data.error)reject(Error(data.error));else resolve(data.value);
    };
    worker.onerror=worker.onmessageerror=()=>{
      stop();
      // The recovery page must still export when a cached worker asset cannot load.
      if(!started&&!signal?.aborted)resolve(locally());
      else reject(Error('存档导出中断，请重新导出'));
    };
    try{worker.postMessage({source,name});}catch(error){stop();reject(error);}
  });
}
