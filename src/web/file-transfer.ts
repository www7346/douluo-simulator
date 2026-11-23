import {isSectionedSave,MAX_SECTIONED_SAVE_BYTES} from '../shared/save-sections';
import {saveCodec} from '../shared/save-codec';
import {androidSaveFile,isAndroidGame} from '../runtime/android-platform';

export type PreparedDownload={blob:Blob;name:string;originalBytes:number};

/** Gzip is only a lossless file wrapper; the inner save format and checks stay unchanged. */
export async function prepareJsonDownload(json:string,name:string){
 const plain=new Blob([json],{type:'application/json'});
 if(plain.size>=64*1024&&typeof CompressionStream!=='undefined'&&typeof DecompressionStream!=='undefined'){
  try{const compressed=await new Response(plain.stream().pipeThrough(new CompressionStream('gzip'))).blob();
   if(compressed.size<plain.size)return {blob:new Blob([compressed],{type:'application/gzip'}),name:name+'.gz',originalBytes:plain.size};
  }catch{/* Browsers without working compression can still export the original JSON. */}
 }
 return {blob:plain,name,originalBytes:plain.size};
}
export async function downloadJson(json:string,name:string){
 return downloadPrepared(await prepareJsonDownload(json,name));
}
export async function downloadPlainJson(json:string,name:string){
 const blob=new Blob([json],{type:'application/json'});
 return downloadPrepared({blob,name,originalBytes:blob.size});
}
export async function downloadPrepared(file:PreparedDownload){
 if(isAndroidGame){await androidSaveFile(file.blob,file.name);return file;}
 const url=URL.createObjectURL(file.blob),link=document.createElement('a');
 link.href=url;link.download=file.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 return file;
}
export async function readSaveFile(file:Blob,maximum=MAX_SECTIONED_SAVE_BYTES,signal?:AbortSignal):Promise<string>{
 signal?.throwIfAborted();
 const magic=new Uint8Array(await file.slice(0,2).arrayBuffer()),gzip=magic[0]===0x1f&&magic[1]===0x8b;
 signal?.throwIfAborted();
 if(!gzip&&file.size>maximum)throw Error('存档文件超过读取上限');
 if(gzip&&typeof DecompressionStream==='undefined')throw Error('当前浏览器不能读取压缩存档，请更新浏览器后再导入');
 const stream=gzip?file.stream().pipeThrough(new DecompressionStream('gzip')):file.stream();
 const reader=stream.getReader(),decoder=new TextDecoder('utf-8',{fatal:true}),parts:string[]=[];
 const abort=()=>{void reader.cancel(signal?.reason).catch(()=>{});};signal?.addEventListener('abort',abort,{once:true});
 let total=0,prefix='';
 try{
  for(;;){signal?.throwIfAborted();const {done,value}=await reader.read();signal?.throwIfAborted();if(done)break;total+=value.byteLength;const text=decoder.decode(value,{stream:true});
    if(prefix.length<128)prefix+=text.slice(0,128-prefix.length);
    const limit=isSectionedSave(prefix)?maximum:Math.min(maximum,saveCodec.MAX_FULL_SAVE_BYTES);
    if(total>limit)throw new RangeError(gzip?'存档解压后超过读取上限':'存档文件超过读取上限');parts.push(text);}
  parts.push(decoder.decode());return parts.join('');
 }catch(error){await reader.cancel().catch(()=>{});if(signal?.aborted||error instanceof RangeError)throw error;throw new Error(gzip?'压缩存档损坏或不完整，请重新选择导出的原文件':'存档文字编码无效，请重新选择导出的原文件',{cause:error});}
 finally{signal?.removeEventListener('abort',abort);reader.releaseLock();}
}
