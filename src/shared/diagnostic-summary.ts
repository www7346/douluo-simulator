/** Small read-only projections. Full saves and pending results stay in storage. */
export function diagnosticValue(value:any):any {
 let remaining=160,budget=16000;
 const walk=(value:any,depth=0):any=>{
 if(--remaining<0)return '[omitted: size]';
 if(typeof value==='string'){const text=value.slice(0,Math.max(0,Math.min(1600,budget)));budget-=text.length;return text.length<value.length?text+'…[omitted]':text;}
 if(value===null||typeof value==='boolean'||typeof value==='number')return value;
 if(value===undefined)return undefined;
 if(depth>=5)return '[omitted: depth]';
 if(value instanceof Error)return walk({name:value.name,message:value.message,stack:value.stack,code:(value as any).code,status:(value as any).status,requestId:(value as any).requestId,cause:(value as any).cause},depth+1);
 if(Array.isArray(value))return value.slice(0,12).map(v=>walk(v,depth+1));
 if(typeof value==='object')return Object.fromEntries(Object.entries(value).slice(0,24).map(([k,v])=>[k.slice(0,120),walk(v,depth+1)]));
 return String(value);
 };return walk(value);
}
export function diagnosticSnapshot(snapshot:any){
 const state=snapshot?.state,story=state?.扩展?.story,active=story?.active;
 return {schemaVersion:snapshot?.schemaVersion,revision:snapshot?.revision,rulesetVersion:snapshot?.rulesetVersion,savedAt:snapshot?.savedAt,
  playerCreated:!!state?.角色?.已建立,playerId:state?.角色?.主控单位ID??null,
  story:story?{branchId:story.branchId,inheritedBranchId:story.inheritedBranchId??null,activeTurn:active?.number??null,activeStatus:active?.status??null}:null};
}
export function diagnosticSave(record:any){
 const replay=record?.battleReplay;
 return diagnosticValue({id:record?.id,slotId:record?.slotId,profileId:record?.profileId,kind:record?.kind,revision:record?.revision,storageVersion:record?.storageVersion,updatedAt:record?.updatedAt,createdAt:record?.createdAt,autosaveEmpty:record?.autosaveEmpty,storyHeadId:record?.storyHeadId??null,
  snapshot:diagnosticSnapshot(record?.snapshot),hasWorkspace:!!record?.workspace,
  battleReplay:replay?{storyHeadId:replay.storyHeadId??null,snapshot:diagnosticSnapshot(replay.snapshot)}:null});
}
export function diagnosticNode(node:any){return diagnosticValue({id:node?.id,worldId:node?.worldId,previousId:node?.previousId??null,branchId:node?.branchId,revision:node?.revision,turn:node?.turn?.number,status:node?.turn?.status});}
export function diagnosticEvidence(record:any){return diagnosticValue({id:record?.id,kind:record?.kind,status:record?.status,startedAt:record?.startedAt,elapsedMs:record?.elapsedMs,snapshotRevision:record?.snapshotRevision,branchId:record?.branchId,turn:record?.turn,sequence:record?.sequence,draftCount:record?.drafts?.length,callCount:record?.calls?.length,failure:record?.failure});}
export function diagnosticPending(key:string,value:any){
 const command=value?.command;
 return diagnosticValue({key,present:!!value,phase:value?.phase??(key.startsWith('cloud-ack:')?'ack':null),worldId:value?.worldId,createdAt:value?.createdAt,operationId:value?.operationId??command?.id,resultId:value?.resultId,commandType:command?.type,expectedRevision:command?.expectedRevision,hasTicket:!!command?.payload?.ticket,payloadOmitted:!!command?.payload});
}
/** This checks links and turn metadata only; it never claims to validate prose or frames. */
export function inspectDiagnosticLinks(records:any[],nodes:any[],complete=true){
 const index=new Map(nodes.map(node=>[node.id,node])),checks:any[]=[];
 const inspect=(record:any,path:string)=>{
  const errors:any[]=[],seen=new Set<string>();let id=record.storyHeadId??null,lastTurn:number|undefined,actualTurns=0;
  while(id){
   if(seen.has(id)){errors.push({code:'history-cycle',nodeId:id});break;}seen.add(id);
   const node=index.get(id);if(!node){errors.push({code:complete?'history-node-missing':'history-index-incomplete',nodeId:id});break;}
   if(node.status!=='complete'||!Number.isSafeInteger(node.turn)||node.turn<1||lastTurn!==undefined&&node.turn!==lastTurn-1)errors.push({code:'history-turn-invalid',nodeId:id,turn:node.turn});
   lastTurn=node.turn;actualTurns++;id=node.previousId;
  }
  const story=record.snapshot?.story,expectedTurns=story?.activeTurn?story.activeTurn-(story.activeStatus==='complete'?0:1):0;
  const head=index.get(record.storyHeadId);
  if(head&&head.turn!==expectedTurns)errors.push({code:'history-head-turn-mismatch',expectedTurns,actual:head.turn});
  if(!id&&actualTurns&&lastTurn!==1)errors.push({code:'history-first-turn-missing',actual:lastTurn});
  if(head&&story?.activeStatus==='complete'&&head.branchId!==(story.inheritedBranchId??story.branchId))errors.push({code:'history-head-branch-mismatch',nodeId:head.id});
  if(complete&&actualTurns!==expectedTurns)errors.push({code:'history-count-mismatch',expectedTurns,actualTurns});
  checks.push({path,revision:record.snapshot?.revision,headId:record.storyHeadId??null,activeTurn:story?.activeTurn??null,activeStatus:story?.activeStatus??null,expectedTurns,actualTurns,ok:complete&&!errors.length,scope:'links-and-turn-metadata',contentValidation:'not-run',complete,errors:errors.slice(0,20)});
 };
 for(const record of records){const path=`${record.id?'backup':'save'}:${record.id??record.slotId}`;inspect(record,path);if(record.battleReplay)inspect(record.battleReplay,path+'.battleReplay');}
 return checks;
}
export const MAX_DIAGNOSTIC_BYTES=2*1024*1024;
export function stringifyDiagnostic(report:any):string {
 // Each section is already bounded. Keep a final byte budget for unusual/corrupt data.
 const bytes=(s:string)=>new TextEncoder().encode(s).length;
 let json=JSON.stringify(report);
 for(const key of ['diagnostics','checks','backups','saves','storyTurns','records','events','pendingOperations']){
  if(bytes(json)<=MAX_DIAGNOSTIC_BYTES)break;
  const rows=report[key];if(!Array.isArray(rows))continue;
  while(rows.length>5&&bytes(json)>MAX_DIAGNOSTIC_BYTES){const removed=rows.splice(0,Math.ceil(rows.length/2)).length;report.omitted??={};report.omitted[key]=(report.omitted[key]??0)+removed;report.truncated=true;json=JSON.stringify(report);}
 }
 if(bytes(json)>MAX_DIAGNOSTIC_BYTES)throw Error('诊断信息过大，请重新打开页面后再导出');
 return json;
}
