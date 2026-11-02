'use strict';
const {app,ipcMain}=require('electron');
const {autoUpdater,CancellationToken}=require('electron-updater');
const {execFile,spawn}=require('node:child_process');
const {randomUUID}=require('node:crypto');
const fs=require('node:fs/promises');
const path=require('node:path');
const {digest,updateRoot,recoveryRoots}=require('./update-install.cjs');
const {promisify}=require('node:util');
const run=promisify(execFile);
const versionPattern=/^\d+\.\d+\.\d+$/;

function allowedFeed(address){
  const u=new URL(address);
  if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)throw Error('更新来源无效');
  return u.href.replace(/\/?$/,'/');
}
function installerFile(feed,info){
  if(!versionPattern.test(info.version)||info.files?.length!==1)throw Error('更新清单无效');
  const file=info.files[0],name='Douluo-Setup-'+info.version+'-x64.exe';
  if(file.url!==name||!Number.isSafeInteger(file.size)||file.size<=0||file.size>1024**3||
      !/^[A-Za-z0-9+/]{86}==$/.test(file.sha512))throw Error('更新安装包或校验信息无效');
  return new URL(name,feed).href;
}
async function installerVersion(file){
  const script='[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false); (Get-Item -LiteralPath $env:DOULUO_INSPECT_INSTALLER).VersionInfo.ProductVersion';
  const {stdout}=await run('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],
    {windowsHide:true,timeout:20000,env:{...process.env,DOULUO_INSPECT_INSTALLER:file}});
  return stdout.trim();
}
async function recoveryPoint(dataDir){
  for(const root of recoveryRoots(dataDir))try{
    const record=JSON.parse(await fs.readFile(path.join(root,'recovery.json'),'utf8'));
    if(!/^stage-[a-f0-9-]{36}$/.test(record.stage))return null;
    const stage=path.join(root,record.stage),appFile=path.join(stage,'previous-app',path.basename(process.execPath)),data=path.join(stage,'previous-data');
    if(await fs.stat(path.join(stage,'rolled-back')).then(()=>true,()=>false))return null;
    if(!(await fs.stat(appFile)).isFile()||!(await fs.stat(data)).isDirectory())return null;
    return {stage,appFile,data,record};
  }catch{/* A pre-refactor update may still have its backup beside the old profile. */}
  return null;
}
async function startDetached(file,args){
  const child=spawn(file,args,{detached:true,stdio:'ignore',windowsHide:true,cwd:path.dirname(file)});
  await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});child.unref();
}
function attachUpdater(policy,backendPid,confirmHealth){
  let phase='idle',note='',target=null,progress=0,busy=false,cancel=null,downloadedFile=null;
  const dataDir=app.getPath('userData'),initialPoint=recoveryPoint(dataDir);
  const status=async()=>({phase,note,version:app.getVersion(),target:target?.version??null,progress,rollbackVersion:(await initialPoint)?.record.oldVersion??null});
  autoUpdater.autoDownload=false;
  autoUpdater.autoInstallOnAppQuit=false;
  autoUpdater.disableDifferentialDownload=true;
  autoUpdater.disableWebInstaller=true;
  autoUpdater.allowDowngrade=false;
  autoUpdater.logger=null;
  autoUpdater.on('error',()=>{}); // Rejections are shown by the operation that initiated the request.
  autoUpdater.on('download-progress',event=>{progress=Math.max(0,Math.min(100,Math.floor(event.percent)));});
  ipcMain.handle('game-update',async(event,action)=>{
    if(event.senderFrame!==event.sender.mainFrame||!event.senderFrame.url.startsWith('douluo://app/'))throw Error('无效的游戏窗口');
    if(action==='status')return status();
    if(action==='booted'){
      const point=await initialPoint;
      if(point&&point.record.target===app.getVersion()&&await confirmHealth())await fs.writeFile(path.join(point.stage,'healthy'),'ok');
      return status();
    }
    if(action==='rollback'){
      const point=await initialPoint;
      if(!point||busy)throw Error('找不到可以返回的备份版本');
      const job=JSON.parse(await fs.readFile(path.join(point.stage,'job.json'),'utf8'));
      if(path.resolve(job.installDir)!==path.dirname(process.execPath)||job.dataDir!==dataDir)throw Error('当前安装位置与备份不符');
      const request=path.join(point.stage,'rollback-'+randomUUID()+'.json');
      await fs.writeFile(request,JSON.stringify({...job,mode:'rollback',gamePid:process.pid,backendPid:backendPid()}),{flag:'wx'});
      await startDetached(path.join(point.stage,'node.exe'),[path.join(point.stage,'update-install.cjs'),request]);
      phase='installing';note='正在恢复之前的程序与存档';app.quit();return status();
    }
    if(action==='cancel'){cancel?.cancel();return status();}
    if(busy)return status();
    busy=true;
    try{
      if(action==='check'){
        target=null;downloadedFile=null;progress=0;
        if(!policy.publisher){phase='manual';note='此本地试玩版可以离线使用。正式更新渠道启用后，将在这里提供新版。';return status();}
        phase='checking';note='正在检查版本';
        let result,feed;
        for(const url of policy.feeds){
          try{feed=allowedFeed(url);autoUpdater.setFeedURL({provider:'generic',url:feed});result=await autoUpdater.checkForUpdates();break;}
          catch(error){if(url===policy.feeds.at(-1))throw error;}
        }
        if(!result?.isUpdateAvailable){phase='current';note='已经是最新版本';return status();}
        installerFile(feed,result.updateInfo);
        target=result.updateInfo;phase='available';note='找到新版本，可以开始下载。';
      }else if(action==='download'&&phase==='available'&&target){
        phase='downloading';progress=0;note='正在下载安装包';cancel=new CancellationToken();
        const files=await autoUpdater.downloadUpdate(cancel);
        const file=files[0];
        if(!file||await installerVersion(file)!==target.version)throw Error('安装包实际版本与清单不符');
        if(await autoUpdater.verifyUpdateCodeSignature([policy.publisher],file)!==null)throw Error('安装包发行人签名验证失败');
        downloadedFile=file;phase='downloaded';progress=100;note='安装包已验证，可在保存旅程后重启更新。';
      }else if(action==='install'&&phase==='downloaded'&&downloadedFile&&target){
        if(await installerVersion(downloadedFile)!==target.version||await autoUpdater.verifyUpdateCodeSignature([policy.publisher],downloadedFile)!==null)throw Error('安装包复核失败');
        const file=target.files[0],sha512=await digest(downloadedFile);
        if(sha512!==file.sha512)throw Error('安装包校验值已变化');
        const installDir=path.dirname(process.execPath),base=updateRoot(dataDir),stage=path.join(base,'stage-'+randomUUID());
        if(stage.startsWith(installDir+path.sep)||stage.startsWith(dataDir+path.sep))throw Error('更新备份目录与安装目录冲突');
        await fs.mkdir(stage,{recursive:true});
        const helper=path.join(stage,'update-install.cjs'),node=path.join(stage,'node.exe'),job=path.join(stage,'job.json');
        await fs.copyFile(path.join(__dirname,'update-install.cjs'),helper);
        await fs.copyFile(path.join(process.resourcesPath,'game','node.exe'),node);
        await fs.writeFile(job,JSON.stringify({gamePid:process.pid,backendPid:backendPid(),dataDir,installDir,executable:path.basename(process.execPath),
          current:app.getVersion(),target:target.version,installer:downloadedFile,sha512}),{flag:'wx'});
        await startDetached(node,[helper,job]);
        phase='installing';note='正在备份并安装新版';app.quit();
      }
    }catch(error){
      downloadedFile=null;
      const cancelled=cancel?.cancelled;
      phase=cancelled?'available':'error';note=cancelled?'已取消下载，可重新下载。':'更新未完成。请检查更新来源，或稍后重试。';
    }finally{busy=false;cancel=null;}
    return status();
  });
}
module.exports={attachUpdater,allowedFeed,installerFile};
