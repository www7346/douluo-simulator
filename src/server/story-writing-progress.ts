import {createHash,randomUUID} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync,renameSync,openSync,closeSync,fsyncSync,unlinkSync} from 'node:fs';
import {join,resolve} from 'node:path';
import type {StoryFactReview} from './story-fact-review';
import type {StoryProseRepair} from './story-prose-repair';
import {MAX_STORY_PROSE_LENGTH} from '../shared/story-prose';

/** Private completed outputs, not engine state, prompt text, or credentials. */
export interface StorySectionProgress {
 version:1;packageId:string;initialRaw?:string;initialReview?:StoryFactReview;
 repairReserved?:boolean;repairedRaw?:string;reviewReserved?:boolean;repairedReview?:StoryFactReview;
}
export interface StoryReportRepairProgress {
 version:1;packageId:string;repairReserved?:true;response?:StoryProseRepair;reviewReserved?:true;reviews:StoryFactReview[];
}
export interface StoryWritingProgressStore {
 read(key:string):StorySectionProgress|undefined;write(key:string,value:StorySectionProgress):void;
 readRepair(key:string):StoryReportRepairProgress|undefined;writeRepair(key:string,value:StoryReportRepairProgress):void;
}
export const storyWritingProgressKey=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function valid(value:any):asserts value is StorySectionProgress{
 const fields=['version','packageId','initialRaw','initialReview','repairReserved','repairedRaw','reviewReserved','repairedReview'];
 if(!value||value.version!==1||typeof value.packageId!=='string'||!/^[a-f0-9]{64}$/.test(value.packageId)||Object.keys(value).some(k=>!fields.includes(k)))throw Error('战报阶段进度不完整，已确定的结果保留');
 if(value.initialRaw!==undefined&&(typeof value.initialRaw!=='string'||value.initialRaw.length>MAX_STORY_PROSE_LENGTH))throw Error('作者稿件记录超过实际保存容量或格式无效');
 // Historical review and repair evidence is inert. A failed/incomplete review
 // must never prevent recovery of this source-bound original author output.
}
function validRepair(value:any):asserts value is StoryReportRepairProgress{
 const fields=['version','packageId','repairReserved','response','reviewReserved','reviews'];
 if(!value||value.version!==1||!/^[a-f0-9]{64}$/.test(value.packageId)||Object.keys(value).some(key=>!fields.includes(key))
  ||value.repairReserved!==undefined&&value.repairReserved!==true||value.reviewReserved!==undefined&&value.reviewReserved!==true||!Array.isArray(value.reviews))throw Error('整篇修复进度不完整');
 if(value.response){
  const r=value.response;
  if(!/^[a-f0-9]{64}$/.test(r.candidateId)||Object.keys(r).some(key=>!['candidateId','replacements'].includes(key))||!Array.isArray(r.replacements)
   ||r.replacements.some((v:any)=>!v||Object.keys(v).some(key=>!['rangeId','text'].includes(key))||typeof v.rangeId!=='string'||typeof v.text!=='string')
   ||r.replacements.reduce((sum:number,v:any)=>sum+v.text.length,0)>24000)throw Error('整篇修复返回记录无效');
 }
 if(value.response&&!value.repairReserved||value.reviewReserved&&!value.response||value.reviews.length&&!value.reviewReserved)throw Error('整篇修复顺序记录无效');
 for(const r of value.reviews)if(!/^[a-f0-9]{64}$/.test(r?.packageId)||typeof r.requested!=='boolean'||!r.requested&&(r.conflicts?.length||r.observations?.length||r.unverified?.length)||!Array.isArray(r.conflicts)||!Array.isArray(r.observations)||!Array.isArray(r.unverified))throw Error('整篇复审记录无效');
 if(new Set(value.reviews.map((r:any)=>r.packageId)).size!==value.reviews.length)throw Error('整篇复审记录重复');
}
/** Atomic files survive model-worker/service restarts. Source/config hashes isolate
 * changed scenes and user attempts. A checksum detects partial or corrupted files. */
export class FileStoryWritingProgress implements StoryWritingProgressStore {
 private directory:string;
 constructor(directory:string){this.directory=resolve(directory);}
 private path(key:string){if(!/^[a-f0-9]{64}$/.test(key))throw Error('战报阶段进度编号无效');return join(this.directory,key+'.json');}
 private readRecord(key:string){
  const path=this.path(key);if(!existsSync(path))return;
  const record=JSON.parse(readFileSync(path,'utf8'));
  if(record.key!==key||record.checksum!==storyWritingProgressKey(record.value))throw Error('战报阶段进度校验失败，未重新请求模型');
  return record.value;
 }
 read(key:string){const value=this.readRecord(key);if(value===undefined)return;valid(value);return value;}
 readRepair(key:string){const value=this.readRecord(key);if(value===undefined)return;validRepair(value);return value;}
 write(key:string,value:StorySectionProgress){valid(value);this.writeRecord(key,value);}
 writeRepair(key:string,value:StoryReportRepairProgress){validRepair(value);this.writeRecord(key,value);}
 private writeRecord(key:string,value:StorySectionProgress|StoryReportRepairProgress){
  const path=this.path(key);mkdirSync(this.directory,{recursive:true});
  const temporary=path+'.'+randomUUID()+'.tmp',fd=openSync(temporary,'wx');
  try{writeFileSync(fd,JSON.stringify({key,checksum:storyWritingProgressKey(value),value}));fsyncSync(fd);}finally{closeSync(fd);}
  try{renameSync(temporary,path);}finally{if(existsSync(temporary))unlinkSync(temporary);}
 }
}
