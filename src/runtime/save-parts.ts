import {isSealedValue} from '../shared/frozen-snapshot';
import type {GameSnapshot} from './contracts';
import type {SaveSlotRecord} from './storage';

type PartRef={field:string;extension:boolean;report?:boolean;key:string};
export type StoredSlot<T extends SaveSlotRecord=SaveSlotRecord>=T & {
  stateParts?:PartRef[]; replayPart?:string; partKeys?:string[];
  saveDiagnostic?:ReturnType<typeof import('../shared/diagnostic-summary').diagnosticSave>;
  listing?:SaveListing;menuEntry?:string;
};
export type SaveListing=Pick<SaveSlotRecord,'slotId'|'label'|'kind'|'profileId'|'revision'|'updatedAt'|'autosaveEmpty'> & {
  current:boolean; summary:string; locationId:string; id?:string; createdAt?:string; recoveryLabel?:string;
};
export const PARTS='saveParts';
const read=<T>(request:IDBRequest<T>):Promise<T>=>new Promise((resolve,reject)=>{
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
});
async function contentKey(text:string){
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('');
}

// IndexedDB also preserves values which JSON cannot represent (e.g. old optional fields).
// Keep such a section inline so its neighbours can still be de-duplicated losslessly.
function losslessJson(source:unknown):string|undefined {
  let plain=true;
  const value=JSON.stringify(source,function(key,value){
    const original=this[key];
    if(original===undefined||typeof original==='number'&&(!Number.isFinite(original)||Object.is(original,-0))||
      original&&typeof original==='object'&&!Array.isArray(original)&&Object.getPrototypeOf(original)!==Object.prototype&&Object.getPrototypeOf(original)!==null)plain=false;
    return value;
  });
  return plain?value:undefined;
}
const immutableKeys=new WeakMap<object,Promise<string|undefined>>();
function partKey(value:object){
  const cached=immutableKeys.get(value);if(cached)return cached;
  const text=losslessJson(value);
  const key=text&&text.length>=8192?contentKey(text):Promise.resolve(undefined);
  if(isSealedValue(value))immutableKeys.set(value,key);
  return key;
}
export async function prepareStateParts(source:GameSnapshot){
  const state={...source.state as Record<string,any>};
  const parts=new Map<string,unknown>(),refs:PartRef[]=[];
  if(state.扩展)state.扩展={...state.扩展};
  const reports=state.扩展?.battleReports;
  const splitReports=reports&&typeof reports==='object'&&!Array.isArray(reports)&&Object.values(reports).some(value=>value!==null&&typeof value==='object');
  if(splitReports)state.扩展.battleReports={...reports};
  async function prepare(record:Record<string,any>,field:string,extension:boolean,report=false){
    const value=record[field];
    if(value===null||typeof value!=='object'||!globalThis.crypto?.subtle)return;
    const key=await partKey(value);
    if(!key)return;
    parts.set(key,value);refs.push({field,extension,key,...(report?{report:true}:{})});record[field]=null;
  }
  await Promise.all([...Object.keys(state).filter(field=>field!=='系统'&&field!=='扩展').map(field=>prepare(state,field,false)),
    ...Object.keys(state.扩展??{}).filter(field=>field!=='battleReports'||!splitReports).map(field=>prepare(state.扩展,field,true)),
    ...(splitReports?Object.keys(reports).map(field=>prepare(state.扩展.battleReports,field,true,true)):[])]);
  return {snapshot:{...source,state},parts,refs};
}
export async function prepareReplayPart(snapshot:GameSnapshot|undefined){
  if(!snapshot||!globalThis.crypto?.subtle)return undefined;
  const json=losslessJson(snapshot);
  return {key:json?await contentKey(json):'replay:'+crypto.randomUUID(),value:snapshot};
}
export async function materialize<T extends SaveSlotRecord>(tx:IDBTransaction,stored:StoredSlot<T>,replayOnly=false):Promise<T>{
  const {stateParts,replayPart,partKeys,listing,menuEntry,saveDiagnostic,...plain}=stored;
  if(!stateParts?.length&&!replayPart)return plain as T;
  const store=tx.objectStore(PARTS);
  const fetch=async(key:string)=>{
    const cell=await read(store.get(key));
    if(!cell)throw Error('存档引用的数据缺失，请保留当前档案并读取备份');
    return cell.value;
  };
  const state={...stored.snapshot.state as Record<string,any>};
  if(state.扩展)state.扩展={...state.扩展};
  if(stateParts?.some(ref=>ref.report)&&state.扩展?.battleReports)state.扩展.battleReports={...state.扩展.battleReports};
  await Promise.all([
    ...(!replayOnly&&stateParts?stateParts.map(async ref=>{
      const target=ref.report?state.扩展?.battleReports:ref.extension?state.扩展:state;
      if(!target||!Object.hasOwn(target,ref.field)||target[ref.field]!==null)throw Error('存档数据引用不匹配');
      target[ref.field]=await fetch(ref.key);
    }):[]),
    ...(replayPart&&plain.battleReplay?[fetch(replayPart).then(value=>{plain.battleReplay={...plain.battleReplay!,snapshot:value};})]:[])
  ]);
  plain.snapshot={...stored.snapshot,state};
  return plain as T;
}
export async function retainParts(store:IDBObjectStore,parts:Map<string,unknown>,retained:Set<string>){
  await Promise.all(Array.from(parts,async([key,value])=>{
    if(!retained.has(key)&&await read(store.getKey(key))===undefined)store.add({key,value});
  }));
}
export async function pruneParts(tx:IDBTransaction,candidates:Set<string>){
  const saves=tx.objectStore('saves').index('partKeys'),backups=tx.objectStore('backups').index('partKeys');
  await Promise.all(Array.from(candidates,async key=>{
    const [a,b]=await Promise.all([read(saves.getKey(key)),read(backups.getKey(key))]);
    if(a===undefined&&b===undefined)tx.objectStore(PARTS).delete(key);
  }));
}
