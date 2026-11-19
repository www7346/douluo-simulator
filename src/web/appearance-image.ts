import type {AvatarRecord} from '../runtime/storage';

export function avatarCrop(width:number,height:number,zoom:number,x:number,y:number) {
  const side=Math.min(width,height)/Math.max(1,zoom);
  return {side,x:(width-side)*Math.max(0,Math.min(100,x))/100,y:(height-side)*Math.max(0,Math.min(100,y))/100};
}

/** Dragging translates image pixels while keeping the saved square inside the source. */
export function dragAvatarCrop(width:number,height:number,zoom:number,x:number,y:number,dx:number,dy:number,previewWidth:number) {
  const crop=avatarCrop(width,height,zoom,x,y),scale=crop.side/Math.max(1,previewWidth);
  const clamp=(value:number)=>Math.max(0,Math.min(100,value));
  return {x:width>crop.side?clamp((crop.x-dx*scale)/(width-crop.side)*100):50,y:height>crop.side?clamp((crop.y-dy*scale)/(height-crop.side)*100):50};
}

/** Wheel zoom keeps the point under the cursor fixed unless a source edge is reached. */
export function zoomAvatarCrop(width:number,height:number,zoom:number,x:number,y:number,delta:number,anchorX=.5,anchorY=.5) {
  const nextZoom=Math.max(1,Math.min(4,zoom*Math.exp(-delta*.002)));
  if(nextZoom===zoom)return {zoom,x,y};
  const before=avatarCrop(width,height,zoom,x,y),after=avatarCrop(width,height,nextZoom,x,y);
  const ax=Math.max(0,Math.min(1,anchorX)),ay=Math.max(0,Math.min(1,anchorY));
  const clamp=(value:number)=>Math.max(0,Math.min(100,value));
  return {zoom:nextZoom,x:width>after.side?clamp((before.x+(before.side-after.side)*ax)/(width-after.side)*100):50,y:height>after.side?clamp((before.y+(before.side-after.side)*ay)/(height-after.side)*100):50};
}

export async function readAppearanceImage(blob:Blob):Promise<ImageBitmap> {
  if(!['image/png','image/jpeg','image/webp'].includes(blob.type)||blob.size>20*1024*1024)throw new Error('请选择 20 MB 以内的 PNG、JPG 或 WebP 图片');
  const bitmap=await createImageBitmap(blob);
  if(bitmap.width*bitmap.height>40000000){bitmap.close();throw new Error('图片尺寸过大，请缩小后导入');}
  return bitmap;
}

export async function encodeAppearance(blob:Blob,kind:'avatar'|'figure',zoom=1,x=50,y=50):Promise<AvatarRecord> {
  const bitmap=await readAppearanceImage(blob),canvas=document.createElement('canvas');
  const ratio=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
  canvas.width=kind==='avatar'?256:Math.max(1,Math.round(bitmap.width*ratio));
  canvas.height=kind==='avatar'?256:Math.max(1,Math.round(bitmap.height*ratio));
  const context=canvas.getContext('2d');
  if(!context){bitmap.close();throw new Error('无法处理图片，请重试');}
  if(kind==='avatar'){const c=avatarCrop(bitmap.width,bitmap.height,zoom,x,y);context.drawImage(bitmap,c.x,c.y,c.side,c.side,0,0,256,256);}
  else context.drawImage(bitmap,0,0,canvas.width,canvas.height);
  bitmap.close();
  const encode=(quality:number)=>new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('图片保存失败')),'image/webp',quality));
  let result=await encode(.86);const limit=kind==='avatar'?128*1024:2*1024*1024;
  if(result.size>limit)result=await encode(.65);
  if(result.size>limit)throw new Error('这张图片内容过于复杂，请缩小后重试');
  const hash=await crypto.subtle.digest('SHA-256',await result.arrayBuffer());
  return {assetId:'player-'+kind,mimeType:result.type,byteLength:result.size,blob:result,checksum:[...new Uint8Array(hash)].map(v=>v.toString(16).padStart(2,'0')).join(''),width:canvas.width,height:canvas.height,updatedAt:new Date().toISOString()};
}
