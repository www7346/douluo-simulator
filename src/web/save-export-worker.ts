import {GameDatabase} from '../runtime/storage';
import type {ExportSource} from '../runtime/save-export';
import {prepareJsonDownload} from './file-transfer';

self.onmessage=async({data}:{data:{source:ExportSource;name?:string}})=>{
  self.postMessage({started:true});
  try{
    const text=await new GameDatabase().serializeWorld(data.source);
    const value=data.name===undefined?text:await prepareJsonDownload(text,data.name);
    self.postMessage({value});
  }catch(error){self.postMessage({error:error instanceof Error?error.message:'无法导出这个存档'});}
};
