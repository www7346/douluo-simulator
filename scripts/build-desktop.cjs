'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {build}=require('esbuild');
const root=path.resolve(__dirname,'..'),out=path.join(root,'build','desktop');
async function fingerprint(dir,hash){
  const entries=(await fs.readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name,'en'));
  for(const entry of entries){
    const file=path.join(dir,entry.name);
    if(entry.isDirectory()){await fingerprint(file,hash);continue;}
    hash.update(path.relative(root,file).replaceAll('\\','/')+'\0');hash.update(await fs.readFile(file));
  }
}
async function main(){
  if(process.platform!=='win32'||process.arch!=='x64'||process.versions.node!=='24.15.0')throw Error('桌面包需 Windows x64 和 Node 24.15.0 构建。');
  const hash=crypto.createHash('sha256');
  await fingerprint(path.join(root,'src'),hash);
  for(const file of ['vite.config.mts','index.html','build/web-art/asset-manifest.json','package-lock.json','scripts/build-desktop.cjs','desktop/main.cjs','desktop/preload.cjs','desktop/updater.cjs','desktop/update-install.cjs','desktop/service.ts','desktop/model-wire.ts','desktop/model-credentials.cjs','desktop/chatgpt-plan.cjs','desktop/package.json','desktop/package-lock.json','desktop/electron-builder.cjs'])hash.update(await fs.readFile(path.join(root,file)));
  hash.update(JSON.stringify([process.env.DOULUO_UPDATE_PRIMARY,process.env.DOULUO_UPDATE_MIRROR,process.env.DOULUO_UPDATE_PUBLISHER]));
  const id='desktop-'+hash.digest('hex').slice(0,20);
  execFileSync(process.execPath,[path.join(path.dirname(require.resolve('vite/package.json')),'bin','vite.js'), 'build','--mode','desktop','--config','vite.config.mts'],{
    cwd:root,env:{...process.env,DOULUO_BUILD_ID:id},stdio:'inherit'});
  const wasm=await fs.readFile(require.resolve('highs/runtime'));
  await build({define:{__DOULUO_BLUEPRINT_WASM__:JSON.stringify(wasm.toString('base64'))},absWorkingDir:root,entryPoints:{'desktop-service':'desktop/service.ts','model-wire':'desktop/model-wire.ts','calculation-worker':'src/server/calculation-worker.ts','model-worker':'src/server/model-worker.ts'},
    tsconfig:'tsconfig.app.json',outdir:path.join(out,'service'),outExtension:{'.js':'.cjs'},platform:'node',target:'node24',format:'cjs',bundle:true});
  await fs.copyFile(path.join(path.dirname(require.resolve('highs/runtime')),'..','LICENSE'),path.join(out,'HiGHS-LICENSE'));
  await fs.copyFile(process.execPath,path.join(out,'node.exe'));
  await fs.copyFile(path.join(root,'desktop','node-LICENSE'),path.join(out,'node-LICENSE'));
  await fs.writeFile(path.join(out,'version.json'),JSON.stringify({id,node:process.versions.node})+'\n');
  const publisher=process.env.DOULUO_UPDATE_PUBLISHER||null;
  const feeds=[process.env.DOULUO_UPDATE_PRIMARY||'https://douluo.it.com/updates/windows/x64/stable/',process.env.DOULUO_UPDATE_MIRROR].filter(Boolean);
  if(feeds.some(url=>new URL(url).protocol!=='https:'))throw Error('桌面更新地址须使用 HTTPS');
  await fs.writeFile(path.join(out,'update-policy.json'),JSON.stringify({publisher,feeds}));
  const desktop=path.join(root,'desktop');
  // Current Electron packages download their binary on first use.
  if(!require('node:fs').existsSync(path.join(desktop,'node_modules/electron/dist/electron.exe'))){
    execFileSync(process.execPath,[path.join(desktop,'node_modules/electron/install.js')],{cwd:desktop,stdio:'inherit'});
  }
  execFileSync(process.execPath,[require.resolve('electron-builder/cli.js',{paths:[desktop]}),'--win',...(process.argv.includes('--dir')?['--dir']:[]),'--x64','--config','electron-builder.cjs','--publish','never'],{cwd:desktop,stdio:'inherit'});
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
