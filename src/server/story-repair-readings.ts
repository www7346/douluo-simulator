type Move={from:string;to:string};
type SharedReading={value:any;sourcePaths:string[]};
const pointer=(key:string)=>key.replaceAll('~','~0').replaceAll('/','~1');
function at(packet:any,path:string):any {
 let value=packet;
 for(const key of path.slice(1).split('/').map(key=>key.replaceAll('~1','/').replaceAll('~0','~'))){
  if(!value||typeof value!=='object'||!Object.hasOwn(value,key))throw Error('修复阅读位置不存在');
  value=value[key];
 }
 return value;
}
/** Share only byte-for-byte equal read-only values. The semantic packet and all
 * edit authority remain unchanged; transport references retain their sources. */
export function compactStoryRepairReadings(input:Record<string,any>):Record<string,any> {
 const packet=structuredClone(input),counts=new Map<string,number>();
 const count=(value:any):void=>{if(!value||typeof value!=='object')return;const raw=JSON.stringify(value);if(Buffer.byteLength(raw)>160)counts.set(raw,(counts.get(raw)??0)+1);for(const child of Object.values(value))count(child);};
 count(packet.writingFacts);count(packet.writingUnits);
 const dictionary:Record<string,SharedReading>={},keys=new Map<string,string>(),moves:Move[]=[];
 const replace=(value:any,path:string):any=>{
  if(!value||typeof value!=='object')return value;
  const raw=JSON.stringify(value),bytes=Buffer.byteLength(raw),copies=counts.get(raw)??0;
  if(copies>1&&copies*(bytes-70)-bytes-160>64){
   let key=keys.get(raw);if(!key){key='c'+(keys.size+1);keys.set(raw,key);dictionary[key]={value:structuredClone(value),sourcePaths:[]};}
   dictionary[key].sourcePaths.push(path);const to='/sharedRepairReadings/'+key+'/value';moves.push({from:path,to});return {sharedContextPath:to};
  }
  return Array.isArray(value)?value.map((child,index)=>replace(child,path+'/'+index)):Object.fromEntries(Object.entries(value).map(([key,child])=>[key,replace(child,path+'/'+pointer(key))]));
 };
 packet.writingFacts=replace(packet.writingFacts,'/writingFacts');packet.writingUnits=replace(packet.writingUnits,'/writingUnits');
 const textCounts=new Map<string,number>(),textMoves:Move[]=[];
 const countText=(value:any):void=>{if(typeof value==='string'){if(Buffer.byteLength(JSON.stringify(value))>260)textCounts.set(value,(textCounts.get(value)??0)+1);return;}if(value&&typeof value==='object')for(const child of Object.values(value))countText(child);};
 countText(packet.writingFacts);countText(packet.writingUnits);for(const entry of Object.values(dictionary))countText(entry.value);
 const textKeys=new Map<string,string>();
 const replaceText=(value:any,path:string):any=>{
  if(typeof value==='string'){
   const bytes=Buffer.byteLength(JSON.stringify(value)),copies=textCounts.get(value)??0;
   if(copies>1&&copies*(bytes-70)-bytes-260>128){
    let key=textKeys.get(value);if(!key){key='c'+(Object.keys(dictionary).length+1);textKeys.set(value,key);dictionary[key]={value,sourcePaths:[]};}
    dictionary[key].sourcePaths.push(path);const to='/sharedRepairReadings/'+key+'/value';textMoves.push({from:path,to});return {sharedContextPath:to};
   }
   return value;
  }
  return Array.isArray(value)?value.map((child,index)=>replaceText(child,path+'/'+index)):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,child])=>[key,replaceText(child,path+'/'+pointer(key))])):value;
 };
 packet.writingFacts=replaceText(packet.writingFacts,'/writingFacts');packet.writingUnits=replaceText(packet.writingUnits,'/writingUnits');
 for(const key of Object.keys(dictionary))if(!textKeys.has(dictionary[key].value))dictionary[key].value=replaceText(dictionary[key].value,'/sharedRepairReadings/'+key+'/value');
 if(!Object.keys(dictionary).length)return packet;
 packet.sharedRepairReadings=dictionary;
 packet.sharedRepairReadingFormat='sharedContextPath指向本请求内保存的一份完整原读物，按该路径展开读取。sourcePaths保留原始阅读位置；事实出处及编辑范围不变。引用对象不能替代修复正文。';
 const remapOne=(path:string,rows:Move[])=>{const move=rows.find(move=>path===move.from||path.startsWith(move.from+'/'));return move?move.to+path.slice(move.from.length):path;};
 const remap=(path:string)=>remapOne(remapOne(path,moves),textMoves);
 for(const reference of packet.referencedFacts)reference.readingPaths=reference.readingPaths.map(remap);
 for(const range of packet.editableRanges)for(const issue of range.issues)for(const reference of issue.references)if(reference.readingPaths)reference.readingPaths=reference.readingPaths.map(remap);
 for(const reference of packet.referencedFacts)for(const path of reference.readingPaths)at(packet,path);
 return packet;
}
/** Resolve an actual transport reading, retaining the canonical fact path used
 * by review and replacement validators. No model response uses this decoder. */
export function storyRepairReadingAt(packet:Record<string,any>,path:string):any {
 const expand=(value:any,seen:Set<string>):any=>{
  if(value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===1&&typeof value.sharedContextPath==='string'&&value.sharedContextPath.startsWith('/sharedRepairReadings/')){
   if(seen.has(value.sharedContextPath))throw Error('修复阅读引用循环');
   return expand(at(packet,value.sharedContextPath),new Set([...seen,value.sharedContextPath]));
  }
  return Array.isArray(value)?value.map(child=>expand(child,seen)):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,child])=>[key,expand(child,seen)])):value;
 };
 return expand(at(packet,path),new Set());
}
