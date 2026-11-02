'use strict';
const fs=require('node:fs/promises');
const {createReadStream}=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {homedir}=require('node:os');
const {spawn}=require('node:child_process');
const {setTimeout:delay}=require('node:timers/promises');

async function digest(file){
  const hash=createHash('sha512');
  for await(const chunk of createReadStream(file))hash.update(chunk);
  return hash.digest('base64');
}
async function copyColdWorld(from,to){
  // Chromium and the rules service must both have exited before this copy.
  // Caches are reproducible. IndexedDB, preferences and local recovery keys stay together.
  const skip=new Set(['Cache','Code Cache','GPUCache','DawnGraphiteCache','DawnWebGPUCache','Crashpad','ShaderCache','GrShaderCache','DevToolsActivePort','SingletonLock','SingletonCookie','SingletonSocket']);
  await fs.cp(from,to,{recursive:true,errorOnExist:true,force:false,filter:async name=>{
    if(skip.has(path.relative(from,name).split(path.sep)[0]))return false;
    if((await fs.lstat(name)).isSymbolicLink())throw Error('更新备份中出现了外部文件链接');
    return true;
  }});
}
// Chromium's IndexedDB still fails on some Windows paths near MAX_PATH.
// Cold filesystem copies can be longer, but a profile we launch must stay short.
function updateRoot(dataDir){
  const data=path.resolve(dataDir),legacy=data+'-updates';
  if(path.join(legacy,'stage-'+'0'.repeat(36),'previous-data').length<=180)return legacy;
  const local=process.env.LOCALAPPDATA||path.join(homedir(),'AppData','Local');
  const key=createHash('sha256').update(process.platform==='win32'?data.toLowerCase():data).digest('hex').slice(0,16);
  const root=path.join(local,'DouluoRecovery',key);
  if(path.join(root,'stage-'+'0'.repeat(36),'previous-data').length>180)throw Error('本机用户目录过长，请把游戏数据放在较短的目录后再更新');
  return root;
}
function recoveryRoots(dataDir){return [...new Set([updateRoot(dataDir),path.resolve(dataDir)+'-updates'])];}
async function prepareRecoveryProfile(dataDir,source){
  const root=updateRoot(dataDir);await fs.mkdir(root,{recursive:true});
  const saved=await fs.mkdtemp(path.join(root,'saved-')),profile=path.join(saved,'data');
  await copyColdWorld(source,profile);return profile;
}
async function waitForExit(pid,maximum=60000){
  if(!pid)return;
  const end=Date.now()+maximum;
  while(Date.now()<end){
    try{process.kill(pid,0);}catch(error){if(error.code==='ESRCH')return;throw error;}
    await delay(250);
  }
  throw Error('游戏进程仍在保存，已推迟更新');
}
function launch(executable,args){
  // This process is the player's game window. The installer and backup helper stay hidden.
  const child=spawn(executable,args,{cwd:path.dirname(executable),detached:true,stdio:'ignore',windowsHide:false});
  child.once('error',()=>{});child.unref();return child;
}
async function restorePair(stage,job){
  const install=path.resolve(job.installDir),data=path.resolve(job.dataDir),tag=path.basename(stage);
  if(!/^stage-[a-f0-9-]{36}$/.test(tag)||!recoveryRoots(data).includes(path.dirname(path.resolve(stage)))||
     [install,data].some(dir=>dir===path.parse(dir).root)||install===data||install.startsWith(data+path.sep)||data.startsWith(install+path.sep)||
     path.basename(job.executable)!==job.executable||!(await fs.stat(path.join(stage,'previous-app',job.executable))).isFile())throw Error('无法核对升级备份目录');
  const appCopy=install+'-restore-'+tag,dataCopy=data+'-restore-'+tag,oldApp=install+'-superseded-'+tag,oldData=data+'-superseded-'+tag;
  // Prepare both copies before renaming either live directory. Retain the newer world for export.
  await fs.cp(path.join(stage,'previous-app'),appCopy,{recursive:true,errorOnExist:true,force:false});
  await copyColdWorld(path.join(stage,'previous-data'),dataCopy);
  // Preserve the newer progress in an independently playable, short profile before
  // changing either live directory. The original renamed pair also remains intact.
  const liveData=await fs.stat(data).then(()=>true,error=>{if(error.code==='ENOENT')return false;throw error;});
  const retained=liveData?await prepareRecoveryProfile(data,data):null;
  const renamed=[];
  try{
    for(const [target,keep,prepared] of [[install,oldApp,appCopy],[data,oldData,dataCopy]]){
      const exists=await fs.stat(target).then(()=>true,e=>{if(e.code==='ENOENT')return false;throw e;});
      if(exists){await fs.rename(target,keep);renamed.push([keep,target]);}
      await fs.rename(prepared,target);renamed.push([target,prepared]);
    }
  }catch(error){for(const [from,to] of renamed.reverse())await fs.rename(from,to);throw error;}
  if(retained)await fs.writeFile(path.join(stage,'retained.json'),JSON.stringify({data:retained,app:oldApp,version:job.target}),{flag:'wx'});
  await fs.writeFile(path.join(stage,'rolled-back'),'ok');
}
async function launchColdBackup(stage,job){
  const profile=await prepareRecoveryProfile(job.dataDir,path.join(stage,'previous-data'));
  launch(path.join(stage,'previous-app',job.executable),['--user-data-dir='+profile]);
}
async function install(jobFile){
  const job=JSON.parse(await fs.readFile(jobFile,'utf8')),stage=path.dirname(jobFile),base=path.dirname(stage);
  if(!recoveryRoots(job.dataDir).includes(path.resolve(base))||!/^stage-[a-f0-9-]{36}$/.test(path.basename(stage))||
    path.basename(job.executable)!==job.executable||!/^\d+\.\d+\.\d+$/.test(job.target))throw Error('更新暂存信息有误');
  const backupApp=path.join(stage,'previous-app'),backupData=path.join(stage,'previous-data'),marker=path.join(stage,'healthy');
  let saved=false;
  if(job.mode==='rollback'){
    await waitForExit(job.gamePid);await waitForExit(job.backendPid);
    try{
      await restorePair(stage,job);
      launch(path.join(job.installDir,job.executable),['--user-data-dir='+job.dataDir]);
    }catch(error){
      await fs.writeFile(path.join(stage,'failure.txt'),String(error.message).slice(0,300)).catch(()=>{});
      await launchColdBackup(stage,job);
    }
    return;
  }
  try{
    await waitForExit(job.gamePid);await waitForExit(job.backendPid);
    if(await digest(job.installer)!==job.sha512)throw Error('安装包内容发生变化');
    await copyColdWorld(job.dataDir,backupData);
    await fs.cp(job.installDir,backupApp,{recursive:true,errorOnExist:true,force:false});
    saved=true;
    const event={stage:path.basename(stage),oldVersion:job.current,target:job.target};
    const pointer=path.join(base,'recovery.json'),temp=pointer+'.'+path.basename(stage);
    await fs.writeFile(temp,JSON.stringify(event),{flag:'wx'});await fs.rename(temp,pointer);
    await new Promise((resolve,reject)=>{
      // NSIS treats everything after the final /D= as the directory, including quotes.
      // Quote only argv[0] for a downloaded installer whose own path contains spaces.
      const child=spawn(job.installer,['--updated','/S','/D='+job.installDir],{
        argv0:'"'+job.installer+'"',windowsVerbatimArguments:true,windowsHide:true,stdio:'ignore'
      });
      child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error('新版未能安装')));
    });
    const next=launch(path.join(job.installDir,job.executable),['--user-data-dir='+job.dataDir]);let exited=false;
    next.once('exit',()=>{exited=true;});next.once('error',()=>{exited=true;});
    for(let i=0;i<360;i++){
      if(await fs.stat(marker).then(()=>true,()=>false))return;
      if(exited)throw Error('新版未能启动');
      await delay(250);
    }
    // A slow, still-open window can explicitly return to the backed-up version.
    await fs.writeFile(path.join(stage,'slow-start'),'新版尚未确认启动完成。');
  }catch(error){
    await fs.writeFile(path.join(stage,'failure.txt'),String(error.message).slice(0,300)).catch(()=>{});
    if(saved)try{await restorePair(stage,job);}catch{
      // Both cold copies are still available when Windows locks a directory.
      await launchColdBackup(stage,job);return;
    }
    launch(path.join(job.installDir,job.executable),['--user-data-dir='+job.dataDir]);
  }
}
if(require.main===module)install(process.argv[2]).catch(()=>{process.exitCode=1;});
module.exports={digest,copyColdWorld,waitForExit,restorePair,updateRoot,recoveryRoots,prepareRecoveryProfile};
