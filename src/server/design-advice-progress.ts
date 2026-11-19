import {existsSync,mkdirSync,readFileSync,writeFileSync,renameSync,unlinkSync,openSync,closeSync,fsyncSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {CloudError} from '../cloud/protocol';
import type {DesignAdviceProgress,DesignAdviceProgressStore} from '../shared/design-advice-progress';
const checksum=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

/** Stored only for the exact server-owned workflow identity. No profile or input. */
export class FileDesignAdviceProgress implements DesignAdviceProgressStore {
 readonly path:string;
 constructor(directory:string,key:string){
  if(!/^[a-f0-9]{64}$/.test(key))throw new CloudError('model-recovery-record','原设计任务标识无效',409);
  mkdirSync(resolve(directory),{recursive:true});this.path=join(resolve(directory),key+'.json');
 }
 read():DesignAdviceProgress {
  if(!existsSync(this.path))return {version:1};
  const raw=readFileSync(this.path,'utf8');
  if(raw.length>1000000)throw new CloudError('model-recovery-record','原设计答复记录过大，请保留诊断后重试',409);
  const record=JSON.parse(raw),value=record.value;
  if(!value||typeof record.checksum!=='string'||record.checksum!==checksum(value))throw new CloudError('model-recovery-record','原设计答复校验失败，未重新请求模型',409);
  if(value.version!==1||Object.keys(value).some(k=>!['version','requested','initial','repaired'].includes(k))||value.requested!==undefined&&(!Array.isArray(value.requested)||value.requested.length>2||new Set(value.requested).size!==value.requested.length||value.requested.some((s:any)=>!['initial','repaired'].includes(s))))throw new CloudError('model-recovery-record','原设计答复尚未完整保存，请保留记录',409);
  return value;
 }
 write(stage:'initial'|'repaired',value:unknown){
  if(!['initial','repaired'].includes(stage))throw new CloudError('model-recovery-record','设计阶段无效',409);
  this.persist({...this.read(),[stage]:structuredClone(value)});
 }
 reserve(stage:'initial'|'repaired'){
  if(!['initial','repaired'].includes(stage))throw new CloudError('model-recovery-record','设计阶段无效',409);
  const current=this.read();
  if(current.requested?.includes(stage)||current[stage]!==undefined)throw new CloudError('model-recovery-record','原设计请求已经发送，答复尚未完整取回。原输入已保留；请取回原任务或明确重新发起设计，不会自动重复请求。',409);
  this.persist({...current,requested:[...(current.requested??[]),stage]});
 }
 private persist(next:DesignAdviceProgress){
  const raw=JSON.stringify({checksum:checksum(next),value:next});
  if(raw.length>1000000)throw new CloudError('model-result-limit','本次设计答复过大，原输入仍保留',413);
  const temporary=this.path+'.'+randomUUID()+'.tmp';
  try{const fd=openSync(temporary,'wx',0o600);try{writeFileSync(fd,raw);fsyncSync(fd);}finally{closeSync(fd);}renameSync(temporary,this.path);}
  finally{if(existsSync(temporary))unlinkSync(temporary);}
 }
}
