'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('douluoDesktop',{
  chatgpt:{
    accounts:()=>ipcRenderer.invoke('game-chatgpt','accounts'),
    signIn:id=>ipcRenderer.invoke('game-chatgpt','signIn',id),
    cancel:()=>ipcRenderer.invoke('game-chatgpt','cancel'),
    disconnect:id=>ipcRenderer.invoke('game-chatgpt','disconnect',id),
    permit:(id,target,method)=>ipcRenderer.invoke('game-chatgpt','permit',id,target,method),
    usage:()=>ipcRenderer.invoke('game-chatgpt','usage')
  },
  credentials:{
    importVertex:(id,location)=>ipcRenderer.invoke('game-credentials','vertex',{id,location}),
    seal:profiles=>ipcRenderer.invoke('game-credentials','seal',profiles),
    resolve:profile=>ipcRenderer.invoke('game-credentials','resolve',profile),
    forget:refs=>ipcRenderer.invoke('game-credentials','forget',refs)
  },
  version:()=>ipcRenderer.invoke('game-update','status'),check:()=>ipcRenderer.invoke('game-update','check'),
  download:()=>ipcRenderer.invoke('game-update','download'),cancel:()=>ipcRenderer.invoke('game-update','cancel'),
  install:()=>ipcRenderer.invoke('game-update','install'),rollback:()=>ipcRenderer.invoke('game-update','rollback'),
  cancelQuery:id=>ipcRenderer.send('game-cancel-query',id),
  modelPermit:(base,target,method)=>ipcRenderer.invoke('game-model-permit',base,target,method),
  booted:()=>ipcRenderer.invoke('game-update','booted')
});
