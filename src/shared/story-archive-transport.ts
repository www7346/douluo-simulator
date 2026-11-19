/** Derived full-save transport only. No engine, database, model or game-state dependency. */
export const MAX_EXPANDED_ARCHIVE_NODES=3_000_000;
export const ARCHIVE_TRANSPORT_BYTES=64*1024*1024;
const WIRE_NODES=2_000_000,DEPTH=80,FRAME_KEY='$storyFrame';
const forbidden=new Set(['__proto__','prototype','constructor']);
const plain=(value:any)=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value)&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);
function utf8(value:string){
 // Counting JSON token bytes avoids allocating one TextEncoder buffer per node.
 let bytes=0;for(let i=0;i<value.length;i++){
  const code=value.charCodeAt(i);
  if(code<0x80)bytes++;else if(code<0x800)bytes+=2;
  else if(code>=0xD800&&code<=0xDBFF&&i+1<value.length&&value.charCodeAt(i+1)>=0xDC00&&value.charCodeAt(i+1)<=0xDFFF){bytes+=4;i++;}
  else bytes+=3;
 }return bytes;
}
export interface JsonSize {nodes:number;bytes:number;depth:number}
export interface ArchiveLimits {maxExpandedNodes?:number;maxBytes?:number;maxDepth?:number}
interface FrameReference {$storyFrame:number}
export interface StoryArchiveWire {codec:'story-frames';version:1;entries:any[];frames:Record<string,any>[]}

/** JSON representation size, counted without materializing a whole expanded JSON string. */
export function measureArchiveJson(value:any,options:{maxNodes?:number;maxBytes?:number;maxDepth?:number;forbidFrameKey?:boolean}={}):JsonSize{
 const maxNodes=options.maxNodes??MAX_EXPANDED_ARCHIVE_NODES,maxBytes=options.maxBytes??ARCHIVE_TRANSPORT_BYTES,maxDepth=options.maxDepth??DEPTH;
 let nodes=0,bytes=0,deepest=0;const path=new WeakSet<object>();
 const token=(text:string)=>{bytes+=utf8(text);if(bytes>maxBytes)throw Error('故事历史还原后超过64MB，暂时无法读取');};
 const visit=(item:any,depth:number)=>{
  if(++nodes>maxNodes)throw Error('故事历史过大，超出当前读取范围');
  if(depth>maxDepth)throw Error('故事历史内容层次过深，无法读取');deepest=Math.max(deepest,depth);
  if(item===null){token('null');return;}
  if(['string','boolean','number'].includes(typeof item)){if(typeof item==='number'&&!Number.isFinite(item))throw Error('故事历史中有无法读取的数值');token(JSON.stringify(item));return;}
  if(!Array.isArray(item)&&!plain(item))throw Error('故事历史片段格式不完整');
  if(path.has(item))throw Error('故事历史中的片段相互引用，无法读取');path.add(item);
  if(Array.isArray(item)){
   token('[');for(let i=0;i<item.length;i++){if(i)token(',');visit(item[i]===undefined?null:item[i],depth+1);}token(']');
  }else{
   const keys=Object.keys(item);let count=0;token('{');
   for(const key of keys){
    if(forbidden.has(key))throw Error('故事历史中有无法读取的内容');
    if(options.forbidFrameKey&&key===FRAME_KEY)throw Error('历史快照不能在其他片段中互相引用');
    if(item[key]===undefined)continue;
    if(count++)token(',');token(JSON.stringify(key));token(':');visit(item[key],depth+1);
   }token('}');
  }path.delete(item);
 };
 visit(value,0);return {nodes,bytes,depth:deepest};
}
const reference=(index:number):FrameReference=>({$storyFrame:index});
function referenceIndex(value:any,length:number):number{
 if(!plain(value)||Object.keys(value).length!==1||!Object.hasOwn(value,FRAME_KEY)||!Number.isSafeInteger(value[FRAME_KEY])||value[FRAME_KEY]<0||value[FRAME_KEY]>=length)throw Error('故事历史引用的快照不存在或格式不完整');
 return value[FRAME_KEY];
}
function limits(value:ArchiveLimits={}){
 const bounded=(candidate:number|undefined,maximum:number)=>{if(candidate===undefined)return maximum;if(!Number.isSafeInteger(candidate)||candidate<1||candidate>maximum)throw Error('无法确认故事历史的读取范围');return candidate;};
 return {maxNodes:bounded(value.maxExpandedNodes,MAX_EXPANDED_ARCHIVE_NODES),maxBytes:bounded(value.maxBytes,ARCHIVE_TRANSPORT_BYTES),maxDepth:bounded(value.maxDepth,DEPTH)};
}
function inspectWire(wire:unknown,budget:ArchiveLimits={}){
 const cap=limits(budget);
 if(!plain(wire)||(wire as any).codec!=='story-frames'||(wire as any).version!==1||Object.keys(wire as object).sort().join(',')!=='codec,entries,frames,version')throw Error('故事历史的快照目录格式不完整');
 const archive=wire as StoryArchiveWire;
 if(!Array.isArray(archive.entries)||!Array.isArray(archive.frames)||archive.frames.length<1||archive.frames.length>archive.entries.length*2)throw Error('故事历史的快照目录不完整');
 const seen=new Set<string>(),texts:string[]=[],sizes:JsonSize[]=[],uses=Array(archive.frames.length).fill(0);
 for(const frame of archive.frames){
  if(!plain(frame))throw Error('故事历史缺少完整快照');
  const size=measureArchiveJson(frame,{...cap,forbidFrameKey:true}),text=JSON.stringify(frame);
  if(seen.has(text))throw Error('故事历史的快照目录有重复片段');seen.add(text);texts.push(text);sizes.push(size);
 }
 const body=measureArchiveJson(archive.entries,cap);
 let nodes=body.nodes,bytes=body.bytes,depth=body.depth;
 for(const entry of archive.entries){
  if(!plain(entry)||!plain(entry.turn))throw Error('故事历史条目无效');
  const metadata={...entry,turn:{...entry.turn}};delete metadata.turn.before;delete metadata.turn.after;
  measureArchiveJson(metadata,{...cap,forbidFrameKey:true});
  for(const side of ['before','after']){
   const marker=entry.turn[side],index=referenceIndex(marker,archive.frames.length),markerSize=measureArchiveJson(marker),size=sizes[index];uses[index]++;
   nodes+=size.nodes-markerSize.nodes;bytes+=size.bytes-markerSize.bytes;
   // history[entry].turn.side is depth three relative to the expanded history.
   depth=Math.max(depth,3+size.depth);
   if(nodes>cap.maxNodes)throw Error('故事历史过大，超出当前读取范围');
   if(bytes>cap.maxBytes)throw Error('故事历史还原后超过64MB，暂时无法读取');
   if(depth+2>cap.maxDepth)throw Error('故事历史内容层次过深，无法读取');
  }
 }
 if(uses.some(count=>count===0))throw Error('故事历史的快照目录有未使用的片段');
 if(!uses.some(count=>count>1))throw Error('故事历史的快照目录没有可共用的片段');
 return {archive,texts,expanded:{nodes,bytes,depth},wire:measureArchiveJson(archive,{maxNodes:WIRE_NODES,maxBytes:cap.maxBytes,maxDepth:cap.maxDepth}),uses};
}

/** Whole before/after frames only, compared by their exact ordinary JSON bytes and key order. */
export function encodeStoryArchiveFrames(history:any[]):any[]|StoryArchiveWire{
 if(!Array.isArray(history))throw Error('故事历史格式无效');
 if(history.length===0)return history;
 const frames:Record<string,any>[]=[],indices=new Map<string,number>();let duplicate=false;
 const entries=history.map(entry=>{
  if(!plain(entry)||!plain(entry.turn))throw Error('故事历史条目无效');
  const metadata={...entry,turn:{...entry.turn}};delete metadata.turn.before;delete metadata.turn.after;
  measureArchiveJson(metadata,{forbidFrameKey:true});
  const turn={...entry.turn};
  for(const side of ['before','after']){
   const frame=entry.turn[side];if(!plain(frame))throw Error('故事历史缺少完整快照');
   measureArchiveJson(frame,{forbidFrameKey:true});const text=JSON.stringify(frame);
   let index=indices.get(text);if(index===undefined){index=frames.length;indices.set(text,index);frames.push(JSON.parse(text));}else duplicate=true;
   turn[side]=reference(index);
  }return {...entry,turn};
 });
 if(!duplicate)return history;
 const wire:StoryArchiveWire={codec:'story-frames',version:1,entries,frames};
 const report=inspectWire(wire);
 // Small/no-gain histories remain the existing array representation.
 if(report.wire.bytes>=report.expanded.bytes)return history;
 return wire;
}

/** Budget the full logical envelope before allocating a single expanded frame. */
export function inspectExpandedStoryArchiveEnvelope(envelope:any,budget:ArchiveLimits={}){
 const cap=limits(budget),source=envelope?.summary?.storyHistory??[];
 const envelopeSize=measureArchiveJson(envelope,{maxNodes:WIRE_NODES,maxBytes:cap.maxBytes,maxDepth:cap.maxDepth});
 if(Array.isArray(source)){
  const expanded=measureArchiveJson(source,{...cap,forbidFrameKey:true});if(expanded.depth+2>cap.maxDepth)throw Error('故事历史内容层次过深，无法读取');
  return {wireNodes:envelopeSize.nodes,wireBytes:envelopeSize.bytes,archiveNodes:expanded.nodes,archiveBytes:expanded.bytes,logicalNodes:envelopeSize.nodes,logicalBytes:envelopeSize.bytes,frameCount:0,referenceCount:0};
 }
 const {expanded,wire,uses}=inspectWire(source,budget),logicalBytes=envelopeSize.bytes-wire.bytes+expanded.bytes;
 if(logicalBytes>cap.maxBytes)throw Error('完整存档还原后超过64MB，暂时无法读取');
 return {wireNodes:envelopeSize.nodes,wireBytes:envelopeSize.bytes,archiveNodes:expanded.nodes,archiveBytes:expanded.bytes,logicalNodes:envelopeSize.nodes-wire.nodes+expanded.nodes,logicalBytes,frameCount:uses.length,referenceCount:uses.reduce((sum,count)=>sum+count,0)};
}

/** The resulting array has no shared object aliases, even between two equal private frames. */
export function decodeStoryArchiveFrames(envelope:any,budget:ArchiveLimits={}):any[]{
 inspectExpandedStoryArchiveEnvelope(envelope,budget);
 const source=envelope.summary?.storyHistory??[];
 if(Array.isArray(source))return structuredClone(source);
 const {archive,texts}=inspectWire(source,budget);
 return archive.entries.map(entry=>{
  const turn={...entry.turn};
  for(const side of ['before','after'])turn[side]=JSON.parse(texts[referenceIndex(entry.turn[side],texts.length)]);
  // Clones receipts/prose/metadata too; transport input is never returned by reference.
  return structuredClone({...entry,turn});
 });
}
