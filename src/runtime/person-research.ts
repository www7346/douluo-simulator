import {rules} from '../rules';

type Stage='naming'|'choice';
type Ref={pendingId:string;mechanicsHash:string};
const types={naming:'解析研发候选',choice:'确认研发图纸'};
const receipts={naming:'research-candidates-resolved',choice:'research-blueprint-created'};
function fields(input:any,allowed:string[],required=['pendingId','mechanicsHash']){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!allowed.includes(k))||required.some(k=>typeof input[k]!=='string'||!input[k]))throw Error('人物研发回应只能引用原项目，不能指定执行者或收件人');
}
const origin=(ref:Ref,stage:Stage)=>({kind:'person-research',stage,pendingId:ref.pendingId,mechanicsHash:ref.mechanicsHash});
const same=(a:any,b:any)=>rules.abilities.hash(a)===rules.abilities.hash(b);
/** Exact reference shared by queue, server admission and actual execution. */
export function personResearchRequest(state:any,input:Ref,stage?:Stage){
 fields(input,['pendingId','mechanicsHash']);
 const p=state.研发?.待处理?.[input.pendingId];
 if(!p||p.actorId===state.角色.主控单位ID||!state.人物?.列表?.[p.actorId]||p.mechanicsHash!==input.mechanicsHash||!['awaiting-llm','candidates-ready'].includes(p.status))throw Error('没有对应的人物本人研发请求');
 rules.expedition.assertResearchOwner(state,p,p.actorId);
 const access=rules.expedition.previewWorkshopAccess(state,{actorId:p.actorId});
 if(!access.available)throw Error(access.reason);
 const actualStage=p.status==='awaiting-llm'||p.pendingNamingIds?.length?'naming':'choice';
 if(stage&&actualStage!==stage)throw Error('人物研发阶段已经变化');
 return {actorId:p.actorId,pending:p,stage:actualStage as Stage};
}
/** A retry may outlive the pending stage; recover only the original permanent actor. */
function operationActor(state:any,ref:Ref,stage:Stage,sourceId:string){
 const old=state.远征?.commandRequests?.[sourceId],receipt=state.远征?.processedTransactions?.[sourceId];
 if(!old&&!receipt)return personResearchRequest(state,ref,stage).actorId;
 if(!old||!receipt||old.type!==types[stage]||receipt.type!==receipts[stage]||old.request?.pendingId!==ref.pendingId||!same(old.request.decisionOrigin,origin(ref,stage)))throw Error('人物研发重放不能替换原项目、阶段或机械版本');
 const actorId=old.request.actorId;
 if(actorId===state.角色.主控单位ID||!state.人物?.列表?.[actorId]||state.研发?.待处理?.[ref.pendingId]?.actorId!==actorId)throw Error('人物研发重放缺少原项目主人');
 return actorId;
}
export function namePersonResearch(state:any,input:any,sourceId:string){
 fields(input,['pendingId','mechanicsHash','candidates']);
 const ref={pendingId:input.pendingId,mechanicsHash:input.mechanicsHash};
 const actorId=operationActor(state,ref,'naming',sourceId);
 // Preserve the original return format of requestResearchNarrative: {candidates:[...]}
 return rules.expedition.resolveResearch(state,ref.pendingId,input.candidates,sourceId,{actorId,decisionOrigin:origin(ref,'naming')});
}
export function choosePersonResearch(state:any,input:any,sourceId:string){
 fields(input,['pendingId','mechanicsHash','decision']);
 const d=input.decision;
 if(!d||typeof d!=='object'||Array.isArray(d)||Object.keys(d).some(k=>!['candidateIndex','reason'].includes(k))||!Number.isSafeInteger(d.candidateIndex)||d.candidateIndex<0||typeof d.reason!=='string'||!d.reason.trim()||d.reason.length>600)throw Error('人物须从本人已命名候选中选择并说明理由');
 const ref={pendingId:input.pendingId,mechanicsHash:input.mechanicsHash};
 const actorId=operationActor(state,ref,'choice',sourceId);
 if(!state.远征?.processedTransactions?.[sourceId]){
  const {pending}=personResearchRequest(state,ref,'choice');
  if(!pending.successfulIndexes.includes(d.candidateIndex)||!pending.candidates[d.candidateIndex]?.pass)throw Error('选择不属于本人当前通过终审的候选');
 }
 return rules.expedition.chooseResearchCandidate(state,ref.pendingId,d.candidateIndex,sourceId,{actorId,decisionOrigin:origin(ref,'choice'),decisionReason:d.reason.trim()});
}
export function pendingPersonResearchWork(state:any){
 const result:{kind:'person-research-naming'|'person-research-choice';input:Ref}[]=[];
 for(const p of Object.values(state.研发?.待处理??{}) as any[]){
  if(p.actorId===state.角色.主控单位ID||!['awaiting-llm','candidates-ready'].includes(p.status))continue;
  const input={pendingId:p.id,mechanicsHash:p.mechanicsHash};
  try{const {stage}=personResearchRequest(state,input);result.push({kind:stage==='naming'?'person-research-naming':'person-research-choice',input});}catch{/* Actual project remains pending; no refund, default choice or replacement. */}
 }
 return result;
}

/** Validate original person-owned operations even when no story goals exist. */
export function validatePersonResearchOperations(state:any){
 for(const [id,source] of Object.entries(state.远征?.commandRequests??{}) as [string,any][]){
  const q=source.request,o=q?.decisionOrigin;
  if(o?.kind!=='person-research')continue;
  const r=state.远征?.processedTransactions?.[id],p=state.研发?.待处理?.[q.pendingId];
  if(Object.keys(o).some(k=>!['kind','stage','pendingId','mechanicsHash'].includes(k))||!['naming','choice'].includes(o.stage)||o.pendingId!==q.pendingId||typeof o.mechanicsHash!=='string'||!o.mechanicsHash||q.actorId===state.角色.主控单位ID||p?.actorId!==q.actorId||source.type!==types[o.stage as Stage]||r?.type!==receipts[o.stage as Stage]||r.actorId!==q.actorId||r.pendingId!==q.pendingId)throw Error('人物研发回应缺少原项目、本人或永久结算');
  if(o.stage==='naming'){
   if(r.mechanicsHash!==o.mechanicsHash||q.decisionReason!==undefined)throw Error('人物命名回应改写了原机械版本');
   // Do not compare an old naming hash with p.mechanicsHash: a later legal reroll
   // can create a new version. Core research provenance must validate each version.
  }else if(typeof q.decisionReason!=='string'||!q.decisionReason.trim()||q.decisionReason.length>600||p.status!=='completed'||p.chosenIndex!==q.candidateIndex||r.chosenIndex!==q.candidateIndex||r.blueprintId!==p.blueprintId||o.mechanicsHash!==p.mechanicsHash)throw Error('人物选定缺少原本人理由、候选与实际图纸');
 }
}
