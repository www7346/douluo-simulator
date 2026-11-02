'use strict';
const {app, BrowserWindow, dialog, protocol, net, safeStorage, ipcMain, shell} = require('electron');
const {fork} = require('node:child_process');
const {randomBytes} = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const {pathToFileURL} = require('node:url');

protocol.registerSchemesAsPrivileged([{scheme:'douluo',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true}}]);
app.enableSandbox();
app.setName('斗罗大陆：武魂模拟器');
app.setPath('userData',app.commandLine.getSwitchValue('user-data-dir') || path.join(app.getPath('appData'),'DouluoSimulator'));
const resources=app.isPackaged?path.join(process.resourcesPath,'game'):path.resolve(__dirname,'../build/desktop');
let backend, backendReady, closing=false,modelWire,chatgpt;
const queryRequests=new Map(),earlyQueryCancels=new Map();
const queryIdPattern=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

async function readWorkflowSecret(directory) {
  const filename=path.join(directory,'workflow-key.bin');
  try { return safeStorage.decryptString(await fs.readFile(filename)); }
  catch (error) { if (error.code!=='ENOENT') throw error; }
  const value=randomBytes(32).toString('hex');
  const temporary=filename+'.'+randomBytes(8).toString('hex');
  await fs.writeFile(temporary,safeStorage.encryptString(value),{flag:'wx'});
  await fs.rename(temporary,filename);
  return value;
}

async function launchService() {
  const directory=app.getPath('userData');
  await fs.mkdir(directory,{recursive:true});
  const build=JSON.parse(await fs.readFile(path.join(resources,'version.json'),'utf8'));
  const origin='http://'+randomBytes(32).toString('hex')+'.localhost';
  const child=fork(path.join(resources,'service','desktop-service.cjs'),[],{
    execPath:path.join(resources,'node.exe'),execArgv:[],cwd:directory,windowsHide:true,
    stdio:['ignore','ignore','ignore','ipc'],
    env:{...process.env,DOULUO_BUILD_ID:build.id,DOULUO_WORKFLOW_SECRET:await readWorkflowSecret(directory),
      DOULUO_DESKTOP_ORIGIN:origin,DOULUO_MODEL_DNS:process.env.DOULUO_MODEL_DNS||'desktop-auto',DOULUO_MODEL_RECOVERY_DIR:path.join(directory,'model-recovery'),DOULUO_DIAGNOSTIC_DIR:path.join(directory,'diagnostics')}
  });
  backend=child;
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{child.kill();reject(Error('本机计算进程启动超时'));},30000);
    child.once('error',error=>{clearTimeout(timer);reject(error);});
    child.once('exit',()=>{clearTimeout(timer);if(backend===child){backend=null;backendReady=null;}reject(Error('本机计算进程已退出'));});
    child.once('message',message=>{
      if(!Number.isInteger(message?.port)||message.port<1||message.port>65535){child.kill();return;}
      clearTimeout(timer);resolve({port:message.port,origin});
    });
  });
}
function localService(){
  if(closing)throw Error('游戏正在关闭');
  if(!backendReady)backendReady=launchService().catch(error=>{backendReady=null;throw error;});
  return backendReady;
}

async function handleRequest(request) {
  const url=new URL(request.url);
  if(url.host!=='app')return new Response(null,{status:403});
  if(url.pathname.startsWith('/desktop-plan/'))return chatgpt.send(request);
  if(url.pathname.startsWith('/desktop-model/'))return modelWire.send(request);
  if(url.pathname.startsWith('/api/')){
    if(request.method!=='POST'&&!(request.method==='GET'&&url.pathname==='/api/health'))return new Response(null,{status:405});
    const headers=new Headers();
    for(const name of ['content-type','authorization','x-douluo-protocol','x-douluo-build','x-douluo-request-id']){
      if(request.headers.has(name))headers.set(name,request.headers.get(name));
    }
    const id=headers.get('x-douluo-request-id');
    const cancellable=url.pathname==='/api/query'&&queryIdPattern.test(id);
    const cancel=cancellable?new AbortController():null;
    if(cancel){
      if(queryRequests.has(id))return new Response(null,{status:409});
      const deadline=earlyQueryCancels.get(id);earlyQueryCancels.delete(id);
      if(deadline>Date.now())return new Response(null,{status:499});
      queryRequests.set(id,cancel);
    }
    try{
      const local=await localService();
      headers.set('origin',local.origin);headers.set('accept-encoding','identity');
      return await fetch('http://127.0.0.1:'+local.port+url.pathname,{
        method:request.method,headers,body:request.body??undefined,duplex:'half',
        signal:cancel?AbortSignal.any([request.signal,cancel.signal]):request.signal,redirect:'error'
      });
    }catch(error){if(cancel?.signal.aborted)return new Response(null,{status:499});throw error;}
    finally{if(cancel)queryRequests.delete(id);}
  }
  if(request.method!=='GET'&&request.method!=='HEAD')return new Response(null,{status:405});
  let name;
  try{name=decodeURIComponent(url.pathname);}catch{return new Response(null,{status:400});}
  if(name==='/')name='/index.html';
  if(!/^\/[A-Za-z0-9_./%-]+$/.test(name)||name.includes('..'))return new Response(null,{status:404});
  const root=path.join(resources,'public'),file=path.resolve(root,'.'+name);
  if(!file.startsWith(root+path.sep))return new Response(null,{status:404});
  try{return await net.fetch(pathToFileURL(file).href,{method:request.method});}
  catch{return new Response(null,{status:404});}
}

function openGame(){
  const win=new BrowserWindow({width:1366,height:875,minWidth:650,minHeight:480,show:false,
    autoHideMenuBar:true,backgroundColor:'#f5eddf',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith('douluo://app/'))event.preventDefault();});
  win.once('ready-to-show',()=>win.show());
  return win.loadURL('douluo://app/index.html');
}

if(!app.requestSingleInstanceLock())app.quit();
else{
  app.on('second-instance',()=>{const win=BrowserWindow.getAllWindows()[0];if(win){if(win.isMinimized())win.restore();win.focus();}});
  app.on('before-quit',()=>{closing=true;chatgpt?.cancel();if(backend?.connected)backend.disconnect();});
  app.on('window-all-closed',()=>app.quit());
  app.whenReady().then(async()=>{
    chatgpt=require('./chatgpt-plan.cjs').createChatGPTPlan({
      directory:app.getPath('userData'),encryption:safeStorage,openBrowser:url=>shell.openExternal(url),
      fetcher:(url,init)=>net.fetch(url,init)
    });
    ipcMain.handle('game-chatgpt',(event,action,...args)=>{
      if(event.senderFrame!==event.sender.mainFrame||!event.senderFrame.url.startsWith('douluo://app/'))throw Error('请在游戏设置中操作 ChatGPT 连接');
      if(!['accounts','signIn','cancel','disconnect','permit','usage'].includes(action))throw Error('未知的 ChatGPT 操作');
      return chatgpt[action](...args);
    });
    modelWire=require(path.join(resources,'service','model-wire.cjs')).modelWire(async()=>(await localService()).port);
    // Chromium can abort a renderer fetch before our custom protocol receives a disconnect.
    ipcMain.on('game-cancel-query',(event,id)=>{
      if(event.senderFrame!==event.sender.mainFrame||!event.senderFrame?.url.startsWith('douluo://app/')||typeof id!=='string'||!queryIdPattern.test(id))return;
      const running=queryRequests.get(id);
      if(running){running.abort();return;}
      if(earlyQueryCancels.size>=256)earlyQueryCancels.delete(earlyQueryCancels.keys().next().value);
      earlyQueryCancels.set(id,Date.now()+5000);
    });
    const credentials=require('./model-credentials.cjs').credentialVault(app.getPath('userData'),safeStorage);
    ipcMain.handle('game-credentials',async(event,action,value)=>{
      if(event.senderFrame!==event.sender.mainFrame||!event.senderFrame?.url.startsWith('douluo://app/'))throw Error('请在游戏设置中访问模型凭据');
      if(action==='vertex'){
        const selection=await dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender),{title:'选择 Google Cloud 服务账号',properties:['openFile'],filters:[{name:'服务账号',extensions:['json']}]});
        return selection.canceled?null:credentials.importVertex(value.id,value.location,selection.filePaths[0]);
      }
      if(action==='seal')return credentials.seal(value);
      if(action==='resolve')return credentials.resolve(value);
      if(action==='forget')return credentials.forget(value);
      throw Error('模型凭据操作无效');
    });
    ipcMain.handle('game-model-permit',(event,base,target,method)=>{
      if(event.senderFrame!==event.sender.mainFrame||!event.senderFrame.url.startsWith('douluo://app/'))throw Error('请在游戏窗口内连接模型');
      return modelWire.authorize(base,target,method);
    });
    protocol.handle('douluo',handleRequest);
    require('./updater.cjs').attachUpdater(JSON.parse(await fs.readFile(path.join(resources,'update-policy.json'),'utf8')),()=>backend?.pid,async()=>{
      const {port}=await localService();
      const response=await fetch('http://127.0.0.1:'+port+'/api/health',{signal:AbortSignal.timeout(10000)});
      return response.ok&&(await response.json()).ready===true;
    });
    await openGame();})
    .catch(()=>{dialog.showErrorBox('斗罗大陆','本机游戏未能启动，请重新打开安装包修复游戏文件。');app.quit();});
}
