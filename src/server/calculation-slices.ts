import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {CloudError} from '../cloud/protocol';
import {sliceWork} from './calculation-work';
import type {CalculationWork} from '../shared/calculation-progress';

/** Internal execution transport only. Never accept this through a public save/query API. */
export interface CalculationSlicesIdentity {
  commandHash:string;
  baseRevision:number;
  baseSnapshotHash:string;
  seed:string;
}
export interface CalculationSliceRecordV1 {
  kind:'arena-bracket'|'travel-events';
  inputHash:string;
  completed:boolean;
  packed:Uint8Array;
  unpackedBytes:number;
  outputHash:string;
}
export interface CalculationSlicesCheckpointV1 extends CalculationSlicesIdentity {
  version:1;
  step:number;
  records:CalculationSliceRecordV1[];
}
export type CalculationSlicesCheckpoint=CalculationSlicesCheckpointV1;
export const SLICES_MAX_PACKED_BYTES=32*1024*1024;
export const SLICES_MAX_DECODED_BYTES=64*1024*1024;
export const CALCULATION_SLICES_LIMITS=Object.freeze({records:16,steps:1024,packedBytes:SLICES_MAX_PACKED_BYTES,unpackedBytes:SLICES_MAX_DECODED_BYTES,nodes:2_000_000,depth:80});

const MAX=CALCULATION_SLICES_LIMITS,HEX=/^[a-f0-9]{64}$/;
const hash=(value:string|Uint8Array)=>createHash('sha256').update(value).digest('hex');
function fail(message:string):never{throw new CloudError('invalid-checkpoint','计算过程未通过内部一致性核对，原进度已保留；请重试原操作',409,new Error(`私有计算分片无效：${message}`));}
function plain(value:unknown):value is Record<string,unknown>{
  if(value===null||typeof value!=='object'||Array.isArray(value))return false;
  const prototype=Object.getPrototypeOf(value);return prototype===Object.prototype||prototype===null;
}
function dataFields(value:unknown,keys:readonly string[],label:string):asserts value is Record<string,any>{
  if(!plain(value)||Reflect.ownKeys(value).length!==keys.length)fail(label+'结构不符');
  for(const key of Reflect.ownKeys(value)){
    if(typeof key!=='string'||!keys.includes(key))fail(label+'含未知字段');
    const descriptor=Object.getOwnPropertyDescriptor(value,key)!;
    if(!Object.hasOwn(descriptor,'value'))fail(label+'含访问器');
  }
}
function identity(value:CalculationSlicesIdentity):CalculationSlicesIdentity{
  dataFields(value,['commandHash','baseRevision','baseSnapshotHash','seed'],'身份');
  if(typeof value.commandHash!=='string'||!HEX.test(value.commandHash)||typeof value.baseSnapshotHash!=='string'||!HEX.test(value.baseSnapshotHash)||!Number.isSafeInteger(value.baseRevision)||value.baseRevision<0||typeof value.seed!=='string'||!value.seed||value.seed.length>8192)fail('身份字段不符');
  return {commandHash:value.commandHash,baseRevision:value.baseRevision,baseSnapshotHash:value.baseSnapshotHash,seed:value.seed};
}
function sameIdentity(a:CalculationSlicesIdentity,b:CalculationSlicesIdentity){return a.commandHash===b.commandHash&&a.baseRevision===b.baseRevision&&a.baseSnapshotHash===b.baseSnapshotHash&&a.seed===b.seed;}

// Values are wrapped, so user keys cannot masquerade as transport tags.
// Object IDs preserve repeated aliases. Ancestor references/cycles are rejected.
// Property flags and insertion order are preserved in the packed value. Hashing
// independently visits sorted property keys, using UTF-16 sort, never localeCompare.
type Wire=null|boolean|string|number|any[];
function encode(value:unknown,canonical:boolean):Wire{
  const seen=new Map<object,number>(),active=new Set<object>(),heights:number[]=[];let nodes=0;
  const height=(wire:Wire)=>Array.isArray(wire)&&['object','array','ref'].includes(wire[0])?heights[wire[1]]:0;
  function visit(current:unknown,depth:number):Wire{
    if(++nodes>MAX.nodes||depth>MAX.depth)fail('值超过节点或深度上限');
    if(current===null||typeof current==='string'||typeof current==='boolean')return current;
    if(typeof current==='number')return Number.isFinite(current)&&!Object.is(current,-0)?current:['number',Number.isNaN(current)?'nan':current===Infinity?'infinity':current===-Infinity?'-infinity':'-zero'];
    if(current===undefined)return ['undefined'];
    if(typeof current!=='object')fail('值含函数、符号或其他非JSON类型');
    if(active.has(current))fail('值含循环引用');
    const previous=seen.get(current);if(previous!==undefined){if(depth+heights[previous]>MAX.depth)fail('引用展开深度超过上限');return ['ref',previous];}
    const array=Array.isArray(current),prototype=Object.getPrototypeOf(current);
    if(array?prototype!==Array.prototype:prototype!==Object.prototype&&prototype!==null)fail('值含非plain对象');
    const id=seen.size;seen.set(current,id);active.add(current);
    const descriptors=Object.getOwnPropertyDescriptors(current),symbols=Object.getOwnPropertySymbols(current);
    if(symbols.length)fail('值含符号字段');
    let keys=Object.getOwnPropertyNames(current).filter(key=>!array||key!=='length');if(canonical)keys=keys.sort();
    const entries=keys.map(key=>{
      const descriptor=descriptors[key];if(!Object.hasOwn(descriptor,'value'))fail('值含访问器');
      const flags=(descriptor.enumerable?1:0)|(descriptor.writable?2:0)|(descriptor.configurable?4:0);
      return [key,visit(descriptor.value,depth+1),flags];
    });
    heights[id]=entries.reduce((maximum,entry)=>Math.max(maximum,1+height(entry[1])),0);active.delete(current);
    if(array){
      const length=descriptors.length.value;if(!Number.isSafeInteger(length)||length>MAX.nodes)fail('数组长度超过上限');
      return ['array',id,length,descriptors.length.writable===true,entries];
    }
    return ['object',id,prototype===null?0:1,entries];
  }
  return visit(value,0);
}

/** Validate without constructing game objects when called by the owner process. */
function readWire(wire:unknown,materialize:boolean):unknown{
  const objects:any[]=[],active=new Set<number>(),heights:number[]=[];let nodes=0;
  const height=(wire:Wire)=>Array.isArray(wire)&&['object','array','ref'].includes(wire[0])?heights[wire[1]]:0;
  function visit(current:any,depth:number):any{
    if(++nodes>MAX.nodes||depth>MAX.depth)fail('值超过节点或深度上限');
    if(current===null||typeof current==='string'||typeof current==='boolean')return current;
    if(typeof current==='number'){if(!Number.isFinite(current)||Object.is(current,-0))fail('数字编码不符');return current;}
    if(!Array.isArray(current))fail('值编码不符');
    const tag=current[0];
    if(tag==='undefined'){if(current.length!==1)fail('undefined编码不符');return undefined;}
    if(tag==='number'){
      if(current.length!==2||!['nan','infinity','-infinity','-zero'].includes(current[1]))fail('特殊数字编码不符');
      return ({nan:NaN,infinity:Infinity,'-infinity':-Infinity,'-zero':-0} as any)[current[1]];
    }
    if(tag==='ref'){
      const id=current[1];if(current.length!==2||!Number.isSafeInteger(id)||id<0||id>=objects.length||active.has(id))fail('引用身份或循环无效');if(depth+heights[id]>MAX.depth)fail('引用展开深度超过上限');return objects[id];
    }
    const array=tag==='array';if(!array&&tag!=='object')fail('未知值编码');
    if(current.length!==(array?5:4)||current[1]!==objects.length)fail('对象序号或结构不符');
    const id=current[1],entries=current[array?4:3];
    if(!Array.isArray(entries)||entries.length>MAX.nodes)fail('对象字段编码不符');
    let result:any;
    if(array){
      if(!Number.isSafeInteger(current[2])||current[2]<0||current[2]>MAX.nodes||typeof current[3]!=='boolean')fail('数组长度或属性不符');
      result=materialize?new Array(current[2]):null;
    }else{
      if(current[2]!==0&&current[2]!==1)fail('对象原型编码不符');
      result=materialize?Object.create(current[2]===0?null:Object.prototype):null;
    }
    objects.push(result);active.add(id);const keys=new Set<string>();
    for(const entry of entries){
      if(!Array.isArray(entry)||entry.length!==3||typeof entry[0]!=='string'||keys.has(entry[0])||!Number.isInteger(entry[2])||entry[2]<0||entry[2]>7)fail('对象字段或标志不符');
      const key=entry[0];keys.add(key);
      if(array){
        if(key==='length')fail('数组重复长度');
        // A defined array index must fit the frozen length; extra string fields remain legal.
        const index=Number(key);if(String(index)===key&&Number.isInteger(index)&&index>=0&&index<0xffffffff&&index>=current[2])fail('数组索引越界');
      }
      const value=visit(entry[1],depth+1),flags=entry[2];
      if(materialize)Object.defineProperty(result,key,{value,enumerable:!!(flags&1),writable:!!(flags&2),configurable:!!(flags&4)});
    }
    if(array&&materialize&&!current[3])Object.defineProperty(result,'length',{writable:false});
    heights[id]=entries.reduce((maximum:number,entry:any[])=>Math.max(maximum,1+height(entry[1])),0);active.delete(id);return result;
  }
  return visit(wire,0);
}
function serialized(value:unknown,canonical=false):Buffer{
  const json=JSON.stringify({version:1,value:encode(value,canonical)}),bytes=Buffer.from(json,'utf8');
  if(bytes.byteLength>MAX.unpackedBytes)fail('单值解压容量超过64MiB');return bytes;
}
function unpack(record:CalculationSliceRecordV1,materialize:boolean):unknown{
  let bytes:Buffer;
  try{bytes=gunzipSync(record.packed,{maxOutputLength:MAX.unpackedBytes});}catch{fail('压缩数据损坏或解压容量超过64MiB');}
  if(bytes.byteLength!==record.unpackedBytes||hash(bytes)!==record.outputHash)fail('解压长度或内容指纹不符');
  let wire:unknown;try{wire=JSON.parse(bytes.toString('utf8'));}catch{fail('压缩值不是有效JSON');}
  dataFields(wire,['version','value'],'值封装');if(wire.version!==1)fail('值封装版本不符');return readWire(wire.value,materialize);
}
function pack(value:unknown):Pick<CalculationSliceRecordV1,'packed'|'unpackedBytes'|'outputHash'>{
  // Internal continuations favor bounded CPU work, as session checkpoints do.
  // The exact decoded graph/hash and all existing byte limits still apply.
  const bytes=serialized(value),packed=new Uint8Array(gzipSync(bytes,{level:1}));
  if(packed.byteLength>MAX.packedBytes)fail('压缩容量超过32MiB');
  return {packed,unpackedBytes:bytes.byteLength,outputHash:hash(bytes)};
}

function readSlicesCheckpoint(checkpoint:unknown,expected:CalculationSlicesIdentity,materializeLast=false):{bytes:number;step:number;decoded?:{index:number;value:unknown}}{
  const binding=identity(expected);
  dataFields(checkpoint,['version','commandHash','baseRevision','baseSnapshotHash','seed','step','records'],'检查点');
  const cp=checkpoint as unknown as CalculationSlicesCheckpointV1;
  if(cp.version!==1||!sameIdentity(cp,binding)||!Number.isSafeInteger(cp.step)||cp.step<0||cp.step>MAX.steps||!Array.isArray(cp.records)||cp.records.length>MAX.records)fail('检查点版本、身份或进度不符');
  let bytes=0,partial=false,decoded:{index:number;value:unknown}|undefined;
  for(const [index,record] of cp.records.entries()){
    dataFields(record,['kind','inputHash','completed','packed','unpackedBytes','outputHash'],'作用域记录');
    if(partial||!['arena-bracket','travel-events'].includes(record.kind)||typeof record.inputHash!=='string'||!HEX.test(record.inputHash)||typeof record.completed!=='boolean'||typeof record.outputHash!=='string'||!HEX.test(record.outputHash)||!(record.packed instanceof Uint8Array)||record.packed.byteOffset!==0||record.packed.byteLength!==record.packed.buffer.byteLength||record.packed.byteLength<1||!Number.isSafeInteger(record.unpackedBytes)||record.unpackedBytes<1||record.unpackedBytes>MAX.unpackedBytes)fail('作用域记录字段或顺序不符');
    bytes+=record.packed.byteLength;if(bytes>MAX.packedBytes)fail('检查点压缩总容量超过32MiB');
    partial=!record.completed;
    const materialize=materializeLast&&index===cp.records.length-1,value=unpack(record,materialize);
    if(materialize)decoded={index,value};
  }
  if(partial&&cp.step===0)fail('未完成作用域缺少保存进度');
  return {bytes,step:cp.step,decoded};
}
export function inspectSlicesCheckpoint(checkpoint:unknown,expected:CalculationSlicesIdentity):{bytes:number;step:number}{
  const {bytes,step}=readSlicesCheckpoint(checkpoint,expected);return {bytes,step};
}
function cloneCheckpoint(cp:CalculationSlicesCheckpointV1):CalculationSlicesCheckpointV1{
  return {...cp,records:cp.records.map(record=>({...record,packed:new Uint8Array(record.packed)}))};
}

/** A single command's server-owned, lossless continuation journal. */
export class CalculationSlices {
  readonly #identity:CalculationSlicesIdentity;
  #checkpoint:CalculationSlicesCheckpointV1;
  #cursor=0;
  #active:number|null=null;
  #yielded=false;
  #decoded:{index:number;value:unknown}|undefined;
  #timings={sliceInspectMs:0,sliceDecodeMs:0,sliceEncodeMs:0,sliceHashMs:0};
  readonly #yieldSignal=new Error('私有计算分片已保存');
  readonly isNewDirectTravel:boolean;
  constructor(binding:CalculationSlicesIdentity,checkpoint?:CalculationSlicesCheckpointV1,directTravel=false,readonly observeWork?:(work:CalculationWork)=>void){
    this.isNewDirectTravel=directTravel&&!checkpoint;
    this.#identity=identity(binding);
    if(checkpoint){
      const started=performance.now(),checked=readSlicesCheckpoint(checkpoint,this.#identity,true);
      this.#timings.sliceInspectMs=performance.now()-started;this.#decoded=checked.decoded;this.#checkpoint=cloneCheckpoint(checkpoint);
      if(checked.decoded)this.#reportWork(checkpoint.records[checked.decoded.index].kind,checked.decoded.value);
    }
    else this.#checkpoint={version:1,...this.#identity,step:0,records:[]};
  }
  #reportWork(kind:string,value:unknown){try{const work=sliceWork(kind,value);if(work)this.observeWork?.(work);}catch{/* Progress cannot change the transaction. */}}
  get yielded(){return this.#yielded;}
  get timings(){return {...this.#timings};}
  #unpack(index:number,record:CalculationSliceRecordV1):unknown {
    if(this.#decoded?.index===index){const value=this.#decoded.value;this.#decoded=undefined;return value;}
    const started=performance.now();try{return unpack(record,true);}finally{this.#timings.sliceDecodeMs+=performance.now()-started;}
  }
  #pack(value:unknown){const started=performance.now();try{return pack(value);}finally{this.#timings.sliceEncodeMs+=performance.now()-started;}}
  checkpoint():CalculationSlicesCheckpointV1{return cloneCheckpoint(this.#checkpoint);}
  readonly run=<T>(kind:CalculationSliceRecordV1['kind'],input:unknown,execute:(resume:unknown|null,save:(partial:unknown)=>never)=>T):T=>{
    if(this.#yielded)throw this.#yieldSignal;
    if(this.#active!==null)fail('作用域不能嵌套');
    if(!['arena-bracket','travel-events'].includes(kind)||typeof execute!=='function')fail('作用域种类不符');
    const index=this.#cursor++;if(index>=MAX.records)fail('作用域数量超过16');
    const hashing=performance.now(),inputHash=hash(serialized(input,true)),prior=this.#checkpoint.records[index];this.#timings.sliceHashMs+=performance.now()-hashing;
    if(prior&&(prior.kind!==kind||prior.inputHash!==inputHash))fail('作用域顺序或完整输入不匹配');
    if(prior?.completed)return this.#unpack(index,prior) as T;
    this.#active=index;
    const save=(partial:unknown):never=>{
      if(this.#yielded)throw this.#yieldSignal;
      if(this.#active!==index)fail('保存发生在作用域结束后');
      if(this.#checkpoint.step>=MAX.steps)fail('保存步数超过1024');
      this.#reportWork(kind,partial);
      const record:CalculationSliceRecordV1={kind,inputHash,completed:false,...this.#pack(partial)};
      const records=this.#checkpoint.records.slice(0,index);records.push(record);
      const bytes=records.reduce((sum,row)=>sum+row.packed.byteLength,0);if(bytes>MAX.packedBytes)fail('检查点压缩总容量超过32MiB');
      this.#checkpoint={version:1,...this.#identity,step:this.#checkpoint.step+1,records};this.#yielded=true;throw this.#yieldSignal;
    };
    try{
      const result=execute(prior?this.#unpack(index,prior):null,save);
      // A rule catch must never convert a saved yield into a final receipt.
      if(this.#yielded)throw this.#yieldSignal;
      const record:CalculationSliceRecordV1={kind,inputHash,completed:true,...this.#pack(result)},records=this.#checkpoint.records.slice(0,index);records.push(record);
      if(records.reduce((sum,row)=>sum+row.packed.byteLength,0)>MAX.packedBytes)fail('检查点压缩总容量超过32MiB');
      this.#checkpoint={...this.#checkpoint,records};return this.#unpack(-1,record) as T;
    }finally{this.#active=null;}
  };
}
