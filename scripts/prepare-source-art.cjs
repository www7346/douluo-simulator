'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'build/web-art'),files=path.join(out,'files');
fs.mkdirSync(files,{recursive:true});
const index=require('../source-assets/asset-index.json'),assets=process.env.DOULUO_ART_ROOT;
const placeholder='/media/source-placeholder.svg';
fs.copyFileSync(path.join(root,'source-assets/placeholder.svg'),path.join(files,'source-placeholder.svg'));
for(const group of [index.images,index.portraits])for(const [key,url] of Object.entries(group)){
 const name=path.basename(url),src=assets&&path.join(assets,'media',name);
 if(src&&fs.existsSync(src))fs.copyFileSync(src,path.join(files,name));else group[key]=placeholder;
}
fs.writeFileSync(path.join(out,'asset-manifest.json'),JSON.stringify(index));
