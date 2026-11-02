(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulCombatProjection=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 // Simulations own ordinary JSON trees. Copy dynamic records without rebuilding all
 // of their strings. Special values keep JSON serialization's original behaviour.
 function clone(value, key = '', depth = 0) {
  if (value === null) return null;
  switch (typeof value) {
   case 'string': case 'boolean': return value;
   case 'number': return Number.isFinite(value) ? value || 0 : null;
   case 'undefined': case 'symbol': return undefined;
  }
  if (depth < 64 && typeof value === 'object' && !('toJSON' in value)) {
   if (Array.isArray(value)) {
    const array = new Array(value.length);
    for (let i = 0; i < array.length; i++) array[i] = clone(value[i], i, depth + 1) ?? null;
    return array;
   }
   const proto = Object.getPrototypeOf(value);
   if (proto === Object.prototype || proto === null) {
    const copy = {};
    for (const name of Object.keys(value)) {
     const child = clone(value[name], name, depth + 1);
     if (child === undefined) continue;
     if (name === '__proto__') Object.defineProperty(copy,name,{value:child,writable:true,enumerable:true,configurable:true});
     else copy[name] = child;
    }
    return copy;
   }
  }
  // Preserve toJSON's property key, boxed values, and rejection of cyclic data.
  const wrapped = JSON.parse(JSON.stringify({[key]:value}));
  return Object.hasOwn(wrapped,key) ? wrapped[key] : undefined;
 }
 function freeze(value){if(!value||typeof value!=='object'||Object.isFrozen(value))return value;Object.values(value).forEach(freeze);return Object.freeze(value);}
 const archiveKeys=['battleReports','webRuntime','story'];
 const immutableArchives=new WeakSet();
 // Store independent, deeply frozen JSON copies, never the caller's live objects.
 // Compare all content on every read: IDs and revisions cannot prove immutability.
 // The limit bounds retained serialized weight, not the VM's exact heap usage.
 const immutableCopies=new Map(),maxCopyEntries=512,maxCopyTextBytes=8*1024*1024;
 let copyTextBytes=0;
 function immutableCopy(value){
  const text=JSON.stringify(value);
  if(text===undefined)return undefined;
  const hit=immutableCopies.get(text);
  if(hit){immutableCopies.delete(text);immutableCopies.set(text,hit);return hit.value;}
  const result=freeze(JSON.parse(text)),bytes=text.length*2;
  if(result&&typeof result==='object'&&bytes<=maxCopyTextBytes){
   while(immutableCopies.size>=maxCopyEntries||copyTextBytes+bytes>maxCopyTextBytes){
    const oldest=immutableCopies.keys().next().value;copyTextBytes-=immutableCopies.get(oldest).bytes;immutableCopies.delete(oldest);
   }
   immutableCopies.set(text,{value:result,bytes});copyTextBytes+=bytes;
  }
  return result;
 }
 function mutableContainer(value){
  return Array.isArray(value)?[...value]:value&&typeof value==='object'?{...value}:value;
 }
 function seed(input){
  const shell={...input},shared=[];
  function detach(container,key,path,mutable=false){
   if(!Object.hasOwn(container,key)||container[key]===undefined)return;
   const value=immutableCopy(container[key]);
   container[key]=null;shared.push({path,key,value,mutable});
  }
  // Clone dynamic state once. Only private, deeply frozen copies are shared;
  // the skill/ledger containers stay writable for new summons and receipts.
  for(const key of ['魂兽档案','魂环','地图'])detach(shell,key,[]);
  if(input.扩展&&typeof input.扩展==='object'){
   shell.扩展={...input.扩展};
   for(const key of archiveKeys)detach(shell.扩展,key,['扩展']);
  }
  if(input.技能&&typeof input.技能==='object'){
   shell.技能={...input.技能};detach(shell.技能,'列表',['技能'],true);
  }
  if(input.战斗&&typeof input.战斗==='object'){
   shell.战斗={...input.战斗};detach(shell.战斗,'最近结算单',['战斗']);
   if(input.战斗.扩展&&typeof input.战斗.扩展==='object'){
    shell.战斗.扩展={...input.战斗.扩展};
    for(const key of ['已结算行动','结算单列表'])detach(shell.战斗.扩展,key,['战斗','扩展'],true);
   }
  }
  const state=clone(shell);
  for(const {path,key,value,mutable} of shared){
   const container=path.reduce((parent,name)=>parent[name],state);
   container[key]=mutable?mutableContainer(value):value;
   if(path.length===1&&path[0]==='扩展'&&value&&typeof value==='object')immutableArchives.add(value);
  }
  return state;
 }
 // Static source records are immutable within battle settlement. Mutable tables,
 // units, resources, items and ledgers are copied for each disposable branch.
 function fork(input,sealed){
  const ledger=input.战斗?.扩展,frame=input.战斗?{...input.战斗,扩展:{...ledger,已结算行动:null,结算单列表:null},最近结算单:null}:input.战斗;
  const archived=Object.entries(input.扩展??{}).filter(([name,value])=>immutableArchives.has(value)||(sealed&&archiveKeys.includes(name)&&sealed(value)));
  const extension=archived.length?{...input.扩展}:input.扩展;
  for(const [name] of archived)extension[name]=null;
  const state=clone({...input,...(extension?{扩展:extension}:{}),战斗:frame,魂兽档案:null,魂环:null,地图:null,技能:null});
  for(const [name,value] of archived)state.扩展[name]=value;
  if(ledger){state.战斗.扩展.已结算行动={...ledger.已结算行动};state.战斗.扩展.结算单列表=[...ledger.结算单列表??[]];state.战斗.最近结算单=input.战斗.最近结算单;}
  state.魂兽档案=input.魂兽档案;state.魂环=input.魂环;state.地图=input.地图;
  state.技能={...input.技能,列表:{...input.技能?.列表}};
  return {state,finish:()=>state};
 }
 return Object.freeze({seed,fork});
});
