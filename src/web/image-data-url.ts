/** Small embedded images remain portable with a character or a workshop work. */
export async function compressedImageDataUrl(file:File){
 if(!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size>12*1024*1024)throw Error('请选择不超过12MB的PNG、JPEG或WebP图片');
 const image=await createImageBitmap(file);
 try{const ratio=Math.min(1,1200/Math.max(image.width,image.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*ratio));canvas.height=Math.max(1,Math.round(image.height*ratio));canvas.getContext('2d')!.drawImage(image,0,0,canvas.width,canvas.height);const value=canvas.toDataURL('image/webp',.83);if(value.length>900000)throw Error('图片细节过多，请选择较小的图片');return value;}finally{image.close();}
}
