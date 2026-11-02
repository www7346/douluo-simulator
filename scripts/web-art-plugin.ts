import {readFileSync,existsSync,createReadStream} from 'node:fs';
import {readdir,mkdir,copyFile} from 'node:fs/promises';
import {resolve,dirname,extname} from 'node:path';
import type {Plugin} from 'vite';

export function webArtPlugin(root:string):{plugin:Plugin;manifest:unknown}{
  const source=resolve(root,'build/web-art/asset-manifest.json');
  if(!existsSync(source))throw new Error('请先生成网页素材，再构建在线页面');
  const manifest=JSON.parse(readFileSync(source,'utf8'));
  let outDir='';
  async function copyTree(from:string,to:string,filter:(file:string)=>boolean){
    for(const entry of await readdir(from,{withFileTypes:true})){
      const src=resolve(from,entry.name),dest=resolve(to,entry.name);
      if(entry.isDirectory())await copyTree(src,dest,filter);
      else if(filter(src)){await mkdir(dirname(dest),{recursive:true});await copyFile(src,dest);}
    }
  }
  return {manifest,plugin:{name:'reviewed-web-art',enforce:'pre',
    configResolved(config){outDir=resolve(root,config.build.outDir);},
    configureServer(server){
      const files=new Map<string,string>(([...Object.values(manifest.images),...Object.values(manifest.portraits)] as string[]).map(url=>[url,resolve(root,'build/web-art/files',url.split('/').at(-1)!)]));
      server.middlewares.use((request,response,next)=>{
        const file=files.get((request.url??'').split('?')[0]);
        if(!file)return next();
        response.setHeader('Content-Type',extname(file)==='.webp'?'image/webp':extname(file)==='.svg'?'image/svg+xml':'image/png');
        response.setHeader('Cache-Control','no-cache');
        const stream=createReadStream(file);
        stream.on('error',()=>{response.statusCode=404;response.end();});
        stream.pipe(response);
      });
    },
    transform(code,id){
      if(!id.endsWith('.css'))return;
      return code.replace(/url\((['"]?)(\/art\/[^)'"\s]+)\1\)/g,(_all,_quote,url)=>`url("${manifest.images[url]??url}")`);
    },
    async closeBundle(){
      await copyTree(resolve(root,'public'),outDir,file=>{
        const relative=file.slice(resolve(root,'public').length).replaceAll('\\','/');
        if(relative.startsWith('/art/')&&extname(file)==='.png')return false;
        return ['.svg','.png','.webp','.jpg','.jpeg','.webmanifest','.mp3','.ogg','.wav'].includes(extname(file));
      });
      const urls=new Set<string>([...Object.values(manifest.images),...Object.values(manifest.portraits)] as string[]);
      for(const url of urls){const dest=resolve(outDir,url.slice(1));await mkdir(dirname(dest),{recursive:true});await copyFile(resolve(root,'build/web-art/files',url.split('/').at(-1)!),dest);}
    },
  }};
}
