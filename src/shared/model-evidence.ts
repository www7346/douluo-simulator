/** Private local generation records, separate from game history and credentials. */
export interface ModelCandidateRecord {callId:string;task:string;attempt:number;at:string;elapsedMs:number;content:string;transportComplete:boolean;finishReason:string|null;usage:Record<string,unknown>|null}
export interface ModelEvidence {
 version:1;id:string;worldId:string;kind:string;branchId:string|null;turn:number|null;snapshotRevision:number;
 sequence:number;startedAt:string;elapsedMs:number;status:'running'|'complete'|'failed'|'cancelled';
 writingPackage:Record<string,any>|null;drafts:Array<Record<string,any>>;calls:Array<Record<string,any>>;
 failure?:Record<string,any>;
}
export type ModelEvidenceConsumer=(evidence:ModelEvidence)=>Promise<void>;
// A long original can occur both in provider evidence and in the readable draft.
export const MODEL_EVIDENCE_LIMIT=32*1024*1024;
export function validateModelEvidence(value:any):asserts value is ModelEvidence {
 const fields=['version','id','worldId','kind','branchId','turn','snapshotRevision','sequence','startedAt','elapsedMs','status','writingPackage','drafts','calls','failure'];
 if(!value||Object.keys(value).some(k=>!fields.includes(k)))throw Error('生成记录包含未知字段');
 if(!value||value.version!==1||typeof value.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(value.id)||typeof value.worldId!=='string'||!value.worldId||typeof value.kind!=='string'||!Number.isSafeInteger(value.sequence)||value.sequence<1||!Number.isSafeInteger(value.snapshotRevision)||!['running','complete','failed','cancelled'].includes(value.status)||!Array.isArray(value.calls)||!Array.isArray(value.drafts)||!Number.isFinite(value.elapsedMs)||value.elapsedMs<0)throw Error('生成记录格式无效');
 if(new TextEncoder().encode(JSON.stringify(value)).length>MODEL_EVIDENCE_LIMIT)throw Error('生成记录超过本机保存上限，已接收的记录保留');
}
