import {appendFileSync,chmodSync,existsSync,mkdirSync,renameSync,statSync,unlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {PUBLIC_COMMANDS} from './input';
import {CALCULATION_STAGES,calculationNumbers,worldIntentLabel} from './calculation-observation';

export type ServerDiagnosticSink=(event:Record<string,unknown>)=>void;
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
export const diagnosticRef=(value:unknown)=>typeof value==='string'&&value?hash(value):undefined;
const label=(value:unknown)=>typeof value==='string'&&/^[a-z][a-z0-9_.-]{0,79}$/.test(value)?value:undefined;
const number=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)&&value>=0?value:undefined;
const uuid=(value:unknown)=>typeof value==='string'&&/^[a-f0-9-]{36}$/i.test(value)?value:undefined;
const errorCodes=new Set('authentication permission quota unsupported-parameter provider-tls cancelled client-version command-id connection-lost content-encoding content-type delta-conflict evaluation-ledger evaluation-limit generation-required input-limit invalid-ack invalid-command invalid-delta invalid-input invalid-json invalid-model invalid-operation invalid-query invalid-receipt invalid-response invalid-save invalid-workflow invalid-world method model-busy model-evidence-pending model-expired model-failed model-interrupted model-recovery-record model-result-limit model-save-pending model-unavailable model-unconfirmed network-cors not-found origin provider-connect provider-dns provider-environment provider-limit provider-redirect provider-request provider-url rate-limit revision-conflict rule-rejected save-unacknowledged server server-error service-busy service-unavailable session-expired snapshot-version stale-preview stale-query stale-workflow story-prompt-preflight timeout unknown'.split(' '));
const modelLabels=new Set('generation generation-repair generation-rebuild list test generation-test draft advice creation-advice room ring-skills ring-item research title combat story-host story-social story-autonomy story-belief story-writer story-rewrite story-continue story-summary story-stage-summary character-profile person-rewrite ability-narrative prose-repair party-repair npc-autonomy npc-belief stage-summary memory-selection format-repair private-chat private-repair party-chat story-review creation-advisor ring-item-narrative martial-soul-advisor expedition-narrative ring-skill-narrative research-narrative title-narrative combat-intent workflow.prepare'.split(' '));
modelLabels.add('ring-advice');modelLabels.add('ring-design-advisor');
modelLabels.add('research-advice');
errorCodes.add('request-cancelled');errorCodes.add('model-result-pending');errorCodes.add('model-result-unverified');errorCodes.add('calculation-interrupted');errorCodes.add('invalid-checkpoint');
/** No raw error messages, stack text, URLs, request bodies or model content on disk. */
export function serverError(error:any,depth=0):Record<string,unknown>|undefined {
 if(!error||depth>4)return undefined;
 return {name:['Error','TypeError','SyntaxError','RangeError','CloudError','ModelGatewayError','CommandRejectedError','AbortError','ModelPromptCapacityError','StoryPlanValidationError'].includes(error.name)?error.name:undefined,
  code:errorCodes.has(error.code)?error.code:undefined,kind:errorCodes.has(error.kind)?error.kind:undefined,status:number(error.status),
  codeHash:typeof error.code==='string'&&!errorCodes.has(error.code)?hash(error.code):undefined,
  systemCode:typeof error.code==='string'&&/^(?:E[A-Z0-9_]{2,30}|UND_ERR_[A-Z_]{1,40})$/.test(error.code)?error.code:undefined,
  messageHash:typeof error.message==='string'?hash(error.message):/^[a-f0-9]{64}$/.test(error.messageHash)?error.messageHash:undefined,
  locations:typeof error.stack==='string'?[...error.stack.matchAll(/(?:^|[/\\( ])((?:main|calculation-worker|model-worker)\.cjs|[a-z][a-z0-9-]*\.ts):(\d+):(\d+)\)?$/gm)].slice(0,8).map(m=>`${m[1]}:${m[2]}:${m[3]}`):Array.isArray(error.locations)?error.locations.filter((s:unknown)=>typeof s==='string'&&/^(?:(?:main|calculation-worker|model-worker)\.cjs|[a-z][a-z0-9-]*\.ts):\d+:\d+$/.test(s)).slice(0,8):undefined,
  budget:error.budget&&modelLabels.has(error.budget.task)?{task:error.budget.task,capacity:number(error.budget.capacity),estimatedInput:number(error.budget.estimatedInput),outputReserve:number(error.budget.outputReserve),total:number(error.budget.total)}:undefined,
  residentCapacity:error.residentCapacity?{snapshotBytes:number(error.residentCapacity.snapshotBytes),sessionBytes:number(error.residentCapacity.sessionBytes),usedBytes:number(error.residentCapacity.usedBytes),limitBytes:number(error.residentCapacity.limitBytes),...(number(error.residentCapacity.receiptBytes)===undefined?{}:{receiptBytes:number(error.residentCapacity.receiptBytes)})}:undefined,
  validation:error.issue&&['type','maxItems'].includes(error.issue.keyword)&&/^\/segments\/\d+\/action\/(onSuccess|onFailure)$/.test(error.issue.instancePath)?{path:error.issue.instancePath,keyword:error.issue.keyword,...(error.issue.keyword==='maxItems'?{count:number(error.issue.submitted),limit:number(error.issue.reference?.value?.maxItems)}:{expected:'array',actual:['undefined','string','number','object','null','boolean'].includes(error.issue.submitted)?error.issue.submitted:undefined})}:undefined,
  cause:serverError(error.cause,depth+1)};
}
/** Only internal labels and opaque hashes/IDs belong in the journal API. */
export function diagnosticRecord(event:Record<string,any>){
 const out:Record<string,unknown>={version:1,at:new Date().toISOString()};
 for(const key of ['event','stage','route','outcome','reason','category','operation','query']){const value=label(event[key]);if(value)out[key]=value;}
 if(PUBLIC_COMMANDS.includes(event.command))out.command=event.command;
 const intent=worldIntentLabel(event.intent);if(intent)out.intent=intent;
 if(CALCULATION_STAGES.includes(event.calculationStage))out.calculationStage=event.calculationStage;
 Object.assign(out,calculationNumbers(event));
 if(typeof event.sessionsPreserved==='boolean')out.sessionsPreserved=event.sessionsPreserved;
 for(const key of ['kind','task','firstFailureTask'])if(modelLabels.has(event[key]))out[key]=event[key];
 if(typeof event.finishReason==='string'&&['stop','length','max_tokens','end_turn','stop_sequence','tool_calls','content_filter','safety','recitation','malformed_function_call'].includes(event.finishReason.toLowerCase()))out.finishReason=event.finishReason.toLowerCase();
 for(const key of ['requestId']){const value=uuid(event[key]);if(value)out[key]=value;}
 if(typeof event.jobId==='string'&&/^[A-Za-z0-9_-]{32}$/.test(event.jobId))out.jobId=event.jobId;
 if(typeof event.buildId==='string'&&/^cloud-[a-f0-9]{20}$/.test(event.buildId))out.buildId=event.buildId;
 for(const key of ['worldRef','operationRef','resultRef','attemptRef'])if(typeof event[key]==='string'&&/^[a-f0-9]{64}$/.test(event[key]))out[key]=event[key];
 for(const key of ['revision','resultRevision','status','elapsedMs','worker','calls','attempts','httpStatus','firstByteMs','firstReasoningMs','firstContentMs','lastContentMs','providerElapsedMs','inputTokens','outputTokens','recoveryUsed','activeJobs','estimatedInput','outputReserve','contextCapacity','dispatchedAttempts','queuedMs','runningMs','queuedJobs','queuedBytes','exitCode','stageMs']){const value=number(event[key]);if(value!==undefined)out[key]=value;}
 if(event.error)out.error=serverError(event.error);
 if(event.firstFailure)out.firstFailure=serverError(event.firstFailure);
 if(event.providerError)out.providerError=serverError(event.providerError);
 return out;
}
/** Private bounded JSONL journal. Logging failure never changes gameplay results. */
export class ServerDiagnostics {
 private warnedAt=0;
 constructor(readonly directory:string,readonly buildId:string,readonly maxBytes=8*1024*1024,readonly files=8,readonly retentionMs=14*86400000){
  if(maxBytes<2048||!Number.isInteger(files)||files<1||files>32||retentionMs<=0)throw Error('Invalid diagnostic journal limits');
 }
 readonly record:ServerDiagnosticSink=event=>{
  try{
   mkdirSync(this.directory,{recursive:true,mode:0o700});chmodSync(this.directory,0o700);
   const path=(index:number)=>join(this.directory,index?`events.${index}.jsonl`:'events.jsonl');
   const now=Date.now();
   for(let index=0;index<this.files;index++)if(existsSync(path(index))&&now-statSync(path(index)).mtimeMs>this.retentionMs)unlinkSync(path(index));
   const line=JSON.stringify(diagnosticRecord({...event,buildId:this.buildId}))+'\n';
   if(Buffer.byteLength(line)>this.maxBytes)return;
   if(existsSync(path(0))&&statSync(path(0)).size+Buffer.byteLength(line)>this.maxBytes){
    if(existsSync(path(this.files-1)))unlinkSync(path(this.files-1));
    for(let index=this.files-2;index>=0;index--)if(existsSync(path(index)))renameSync(path(index),path(index+1));
   }
   appendFileSync(path(0),line,{mode:0o600});chmodSync(path(0),0o600);
  }catch{
   if(Date.now()-this.warnedAt>60000){this.warnedAt=Date.now();process.stderr.write('douluo diagnostic-write-failed: private journal unavailable\n');}
  }
 };
}
