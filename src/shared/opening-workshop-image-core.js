(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulOpeningWorkshopImage=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const MAX_LENGTH=900000,alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
 /** Embedded raster data only. This does not resolve paths or request remote resources. */
 function valid(value){
  if(typeof value!=='string'||value.length>MAX_LENGTH)return false;
  const m=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);if(!m||m[2].length%4!==0||m[2].length<16)return false;
  const bytes=[];for(let i=0;i<16;i+=4){const n=(alphabet.indexOf(m[2][i])<<18)|(alphabet.indexOf(m[2][i+1])<<12)|(alphabet.indexOf(m[2][i+2])<<6)|alphabet.indexOf(m[2][i+3]);bytes.push((n>>>16)&255,(n>>>8)&255,n&255);}
  return m[1]==='png'?[137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b):m[1]==='jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:[82,73,70,70].every((b,i)=>bytes[i]===b)&&[87,69,66,80].every((b,i)=>bytes[8+i]===b);
 }
 function checked(value){if(!valid(value))throw Error('作品图片须为压缩后的PNG、JPEG或WebP，图片正文不超过900000字符');return value;}
 function identity(value){let a=2166136261,b=5381;for(let i=0;i<value.length;i++){a=Math.imul(a^value.charCodeAt(i),16777619);b=Math.imul(b,33)^value.charCodeAt(i);}return 'embedded-raster:'+value.length+':'+(a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');}
 return Object.freeze({MAX_LENGTH,valid,checked,identity});
});
