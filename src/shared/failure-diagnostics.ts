import {checkedStoryHistory} from './story-archive';

export interface DiagnosticEvent {id:string;at:string;worldId:string;stage:string;status:'started'|'complete'|'failed';operationId?:string;revision?:number;elapsedMs?:number;details?:unknown;error?:unknown}
const privateField=/^(?:api.?key|authorization|proxy.authorization|access.?token|refresh.?token|token|secret|credentialHeaders|headers|signature|cookie|set-cookie)$/i;
/** The caller supplies live credentials for exact redaction before anything is persisted. */
export function sanitizeDiagnostic(value:unknown,secrets:string[]=[]):any {
 const seen=new WeakSet<object>();
 const credentialValues=[...new Set(secrets.filter(Boolean).flatMap(s=>[s,encodeURIComponent(s)]))].sort((a,b)=>b.length-a.length);
 const cleanText=(s:string)=>{
  for(const secret of credentialValues)s=s.split(secret).join('[REDACTED]');
  return s.replace(/\bBearer\s+[^\s"<>]+/gi,'Bearer [REDACTED]')
   .replace(/(https?:\/\/)[^\s/@:]+:[^\s/@]+@/gi,'$1[REDACTED]@')
   .replace(/\b(?:sk-|gg-gcli-)[A-Za-z0-9_-]+/g,'[REDACTED]')
   .replace(/([?&](?:key|api[-_]?key|token|access_token|secret|auth|authorization)=)[^&\s"<>]+/gi,'$1[REDACTED]')
   .replace(/(\b(?:api[-_ ]?key|authorization|access[-_ ]?token|secret)\s*[=:]\s*)[^\s,;"<>]+/gi,'$1[REDACTED]');
 };
 const walk=(v:any,depth=0):any=>{
  if(typeof v==='string')return cleanText(v);
  if(typeof v==='bigint')return String(v);
  if(v===null||typeof v!=='object')return v;
  if(depth>100)return '[depth limit]';
  if(seen.has(v))return '[circular]';seen.add(v);
  try{
   if(v instanceof Error)return walk({name:v.name,message:v.message,stack:v.stack,code:(v as any).code,kind:(v as any).kind,status:(v as any).status,requestId:(v as any).requestId,jobId:(v as any).jobId,cause:(v as any).cause,budget:(v as any).budget,issue:(v as any).issue},depth+1);
   if(Array.isArray(v))return v.map(x=>walk(x,depth+1));
   return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,privateField.test(k)?'[REDACTED]':walk(x,depth+1)]));
  }finally{seen.delete(v);}
 };
 return walk(value);
}

/** Read-only consistency checks also run when normal save export rejects the world. */
export function inspectDiagnosticHistory(worldId:string,records:any[],nodes:any[]){
 const index=new Map(nodes.filter(n=>n?.worldId===worldId).map(n=>[n.id,n]));
 const checks:any[]=[];
 const inspect=(record:any,path:string)=>{
  const errors:any[]=[],entries:any[]=[],seen=new Set<string>();let id=record?.storyHeadId??null;
  while(id){
   if(seen.has(id)){errors.push({code:'history-cycle',nodeId:id});break;}seen.add(id);
   const node=index.get(id);if(!node){errors.push({code:'history-node-missing',nodeId:id});break;}
   entries.push(node);id=node.previousId;
  }
  const active=record?.snapshot?.state?.扩展?.story?.active;
  try{checkedStoryHistory(record?.snapshot,entries.slice().reverse());}catch(error){errors.push({code:'history-invalid',error:sanitizeDiagnostic(error)});}
  checks.push({path,revision:record?.snapshot?.revision,headId:record?.storyHeadId??null,activeTurn:active?.number??null,activeStatus:active?.status??null,expectedTurns:active?active.number-(active.status==='complete'?0:1):0,actualTurns:entries.length,turns:entries.map(n=>({id:n.id,turn:n.turn?.number,branchId:n.branchId,previousId:n.previousId})),ok:!errors.length,errors});
 };
 for(const [i,record] of records.entries()){
  const path=`${record?.id?'backup':'save'}:${record?.id??record?.slotId??i}`;
  inspect(record,path);if(record?.battleReplay)inspect(record.battleReplay,path+'.battleReplay');
 }
 return checks;
}
