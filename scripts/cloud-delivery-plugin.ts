import {readFileSync} from 'node:fs';
import {readdir,readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,relative,extname} from 'node:path';
import {createHash} from 'node:crypto';
import type {Plugin} from 'vite';

export function cloudDeliveryPlugin(root:string,build:string):Plugin {
  if(!/^[a-zA-Z0-9._-]{1,80}$/.test(build))throw Error('无效的发布版本');
  let out='',written=false,shell=new Set<string>();
  const mime:Record<string,string[]>={'.html':['text/html'],'.js':['application/javascript','text/javascript'],'.css':['text/css'],'.webp':['image/webp'],'.png':['image/png'],'.svg':['image/svg+xml'],'.mp3':['audio/mpeg'],'.ogg':['audio/ogg'],'.wav':['audio/wav','audio/x-wav'],'.webmanifest':['application/manifest+json','application/json']};
  return {name:'cloud-delivery',
    buildStart(){written=false;},
    writeBundle(){written=true;},
    configResolved(config){out=resolve(root,config.build.outDir);},
    transformIndexHtml(){return [{tag:'meta',attrs:{name:'douluo-build',content:build},injectTo:'head'}];},
    async generateBundle(_options,bundle){
      const visit=(name:string)=>{if(shell.has(name))return;shell.add(name);const file=bundle[name];if(file?.type==='chunk')file.imports.forEach(visit);};
      for(const file of Object.values(bundle)){
        if(file.type==='chunk'&&(file.isEntry||/\/(HomePage|SavesPage|SystemPage)\.tsx$/.test(file.facadeModuleId??'')))visit(file.fileName);
        if(file.fileName.endsWith('.css'))shell.add(file.fileName);
      }
      shell.add('index.html');


    },
    closeBundle:{order:'post',sequential:true,async handler(){
      if(!written)return;
      const files:{path:string;mime:string[];bytes:number;hash:string;shell:boolean}[]=[];
      async function scan(dir:string){for(const entry of await readdir(dir,{withFileTypes:true})){
        const file=resolve(dir,entry.name);if(entry.isDirectory()){await scan(file);continue;}
        const name=relative(out,file).replaceAll('\\','/'),type=mime[extname(name)];if(!type)continue;
        const bytes=await readFile(file);files.push({path:'/'+name,mime:type,bytes:bytes.length,hash:createHash('sha256').update(bytes).digest('hex'),shell:shell.has(name)});
      }}
      await scan(out);files.sort((a,b)=>a.path.localeCompare(b.path));
      if(!files.some(file=>file.path.includes('SavesPage')&&file.shell))throw Error('缺少离线导出界面');
      const worker=readFileSync(resolve(root,'scripts/cloud-service-worker.template.js'),'utf8').replace('__CLOUD_VERSION__',JSON.stringify(build)).replace('__CLOUD_FILES__',JSON.stringify(files));
      await writeFile(resolve(out,'sw.js'),worker);
      await writeFile(resolve(out,'version.json'),JSON.stringify({app:'douluo-independent-web',delivery:'cloud',build})+'\n');
      await writeFile(resolve(out,'update.js'),readFileSync(resolve(root,'scripts/cloud-update.js')));
      await writeFile(resolve(out,'update.html'),'<!doctype html><html lang="zh-CN"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>更新游戏</title><style>body{background:#f5efdf;color:#60492e;font:18px/1.8 system-ui;max-width:660px;margin:12vh auto;padding:24px}button,a{display:inline-block;padding:12px 24px;border:1px solid #b09256;border-radius:6px;background:#fffbf0;color:inherit;margin:12px 8px 0 0;text-decoration:none}button:disabled{opacity:.5}</style><h1>更新旅程界面</h1><p id="message" role="status">正在检查…</p><button id="retry">重试更新</button><a href="/#/saves">查看本机存档</a><script src="/update.js" defer></script></html>');
      await mkdir(resolve(root,'build/cloud'),{recursive:true});
      await writeFile(resolve(root,'build/cloud/resource-audit.json'),JSON.stringify({build,files,essentialBytes:files.filter(file=>file.shell).reduce((n,file)=>n+file.bytes,0),publicBytes:files.reduce((n,file)=>n+file.bytes,0)},null,2)+'\n');
    }},
  };
}
