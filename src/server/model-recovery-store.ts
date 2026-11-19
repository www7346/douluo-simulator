import {pendingStoryPersonWorldWork} from '../runtime/person-world-work';
import {closeSync,existsSync,fsyncSync,mkdirSync,openSync,readFileSync,renameSync,unlinkSync,writeFileSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {join,resolve} from 'node:path';
import {CloudError} from '../cloud/protocol';
import {ModelRecoveryBudget,type ModelRecoveryState,type ModelRecoveryStore} from '../runtime/model-recovery-budget';
import {validateStoryProseAttempt} from '../shared/story-prose-attempt';
import {validateWorkflowAttempt} from '../shared/workflow-attempt';
import {validateCreationAttempt} from '../shared/creation-attempt';
import {FileStoryWritingProgress,type StoryWritingProgressStore} from './story-writing-progress';
import {storyWritingProgressKey} from './story-writing-progress';
import {ModelGateway} from '../runtime/model-gateway';
import {validateModelEvidence,type ModelEvidence} from '../shared/model-evidence';
import {preparePrivateReplyPrompt} from './story-private-messages';
import {preparePartyReplyPrompt} from './story-party-replies';
import {assertStoryWritingPackageCurrent} from './story-writing-package';
import {STORY_NOVEL_VERSION} from './story-novel';
import {separateNovelResponse,modelAnalysisBoundaries} from '../runtime/model-response-sections';
import {MAX_STORY_PROSE_LENGTH} from '../shared/story-prose';
import {FileDesignAdviceProgress} from './design-advice-progress';
import type {DesignAdviceProgressStore} from '../shared/design-advice-progress';

interface RecordState extends ModelRecoveryState {version:1;operations:string[]}
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const error=(message:string)=>new CloudError('model-recovery-record',message,409);
const STORY_STAGES=new Set(['world-people','generation','generation-repair','generation-rebuild','story-host','story-social','story-belief','story-autonomy','story-writer','room','person-growth','person-conversation','ring-skills','ring-item','research','title','combat','person-performance-agreement','person-cooperation','person-custody-trade','person-custody-auction','person-gift']);
/** Interactive setup/connection probes are independent user operations, not a pending game turn. */
export function hasPersistentModelRecovery(kind:string){return STORY_STAGES.has(kind)||['evolution-advice','evolution-response','ring-advice','research-advice','person-rewrite','story-rewrite','story-summary','story-stage-summary'].includes(kind);}
export function defaultModelRecoveryDirectory(){return resolve(process.env.DOULUO_MODEL_RECOVERY_DIR??'output/local-runtime/model-recovery');}
/** Actual turn identity spans rule revisions and all of its necessary model stages. */
export function modelRecoveryIdentity(worldId:string,snapshot:any,request:any){
 const story=snapshot.state?.扩展?.story,active=story?.active,input=request.input??{};
 validateWorkflowAttempt(snapshot.state,request);
 validateStoryProseAttempt(snapshot.state,request.kind,input,undefined,pendingStoryPersonWorldWork(snapshot.state).length>0);
 validateCreationAttempt(snapshot.state,request.kind,input);
 if(request.retryAttempt)return {scope:hash([worldId,'explicit-attempt',request.retryAttempt.source,request.retryAttempt.id]),operation:hash([request.kind,snapshot.revision])};
 if(input.creationAttemptId){const {creationAttemptId,...source}=input;return {scope:hash([worldId,snapshot.revision,request.kind,hash(source),'creation-attempt',creationAttemptId]),operation:hash([request.kind,snapshot.revision])};}
 if(input.proseAttemptId)return {scope:hash([worldId,story.branchId,active.number,snapshot.revision,'prose-attempt',input.proseAttemptId,hash([active.before,active.results,active.after]),...(input.original!==undefined?[hash(input.original)]:[])]),operation:hash([request.kind,snapshot.revision])};
 const continuation=active&&active.status!=='complete'&&STORY_STAGES.has(request.kind);
 const scope=continuation?[worldId,story.branchId,active.number,'settlement']:
  ['story-rewrite'].includes(request.kind)?[worldId,story?.branchId,input.turn,request.kind,snapshot.revision]:
  [worldId,story?.branchId??null,snapshot.revision,request.kind,hash(input)];
 return {scope:hash(scope),operation:hash([request.kind,snapshot.revision])};
}
function validate(value:any):asserts value is RecordState{
 if(value?.version!==1||!Number.isFinite(value.startedAt)||!Array.isArray(value.used)||value.used.length>2||!Array.isArray(value.operations)||value.operations.length>1024||value.operations.some((s:any)=>typeof s!=='string'||!/^[a-f0-9]{64}$/.test(s))||new Set(value.operations).size!==value.operations.length||value.used.some((r:any)=>typeof r.kind!=='string'||!r.kind||r.kind.length>80||!Number.isFinite(r.elapsedMs)||r.elapsedMs<0)||value.used.filter((r:any)=>r.kind==='semantic-rewrite').length>1)throw error('恢复次数记录不完整，已确定的结果保留；尚未重新请求模型');
}
/** Only hashes, counts and timing are persisted. No prompts, saves or credentials. */
export class PersistentModelRecoveryStore implements ModelRecoveryStore {
 readonly path:string;
 constructor(directory:string,scope:string){if(!/^[a-f0-9]{64}$/.test(scope))throw error('恢复操作编号无效');this.path=join(resolve(directory),scope+'.json');mkdirSync(resolve(directory),{recursive:true});}
 read():RecordState {
  if(!existsSync(this.path))return this.update(()=>{});
  const value=JSON.parse(readFileSync(this.path,'utf8'));validate(value);return value;
 }
 update(edit:(state:RecordState)=>void):RecordState {
  const lock=this.path+'.lock';let fd:number;
  try{fd=openSync(lock,'wx');}
  catch(cause:any){
   if(cause.code!=='EEXIST')throw cause;
   // A service restart may reclaim a lock only after its owning process has exited.
   try{const pid=Number(readFileSync(lock,'utf8'));if(Number.isSafeInteger(pid)&&pid>0){try{process.kill(pid,0);}catch(e:any){if(e.code==='ESRCH')unlinkSync(lock);}}}catch{/* An incomplete/live lock remains closed. */}
   try{fd=openSync(lock,'wx');}catch{throw error('恢复次数正在记录，已确定的结果保留；尚未重新请求模型');}
  }
  const temporary=this.path+'.'+randomUUID()+'.tmp';
  try{
   writeFileSync(fd,String(process.pid));fsyncSync(fd);
   const value:RecordState=existsSync(this.path)?JSON.parse(readFileSync(this.path,'utf8')):{version:1,startedAt:Date.now(),used:[],operations:[]};validate(value);edit(value);validate(value);
   const file=openSync(temporary,'wx');try{writeFileSync(file,JSON.stringify(value));fsyncSync(file);}finally{closeSync(file);}
   renameSync(temporary,this.path);return structuredClone(value);
  }finally{closeSync(fd);if(existsSync(temporary))unlinkSync(temporary);unlinkSync(lock);}
 }
}
export interface WorkflowRecovery {budget:ModelRecoveryBudget;beforeRequest(requiredRecovery?:number):void;sectionProgress?:StoryWritingProgressStore;authorProgress?:StoryWritingProgressStore;designProgress?:DesignAdviceProgressStore}
/** Server-worker entry only: callers must obtain evidence from their own Job pool,
 * never from request input. A complete frozen source is rechecked before caching. */
export function seedRetainedChatAuthor(recovery:WorkflowRecovery,worldId:string,snapshot:any,request:any,evidence:ModelEvidence):boolean{
 try{
  validateModelEvidence(evidence);const story=snapshot.state?.扩展?.story,turn=story?.active;
  if(request.kind!=='story-writer'||request.revision!==snapshot.revision||turn?.status!=='resolved'||evidence.kind!=='story-writer'||evidence.status!=='failed'||evidence.worldId!==worldId||evidence.snapshotRevision!==snapshot.revision||evidence.branchId!==story.branchId||evidence.turn!==turn.number||!recovery.authorProgress)return false;
  const party=!turn.privatePersonId&&(turn.partyChat||turn.results.some((result:any)=>result.action.kind==='tell-party'));
  const speakerId=evidence.writingPackage?.origin.replyPersonId;
  if(party&&(typeof speakerId!=='string'||!speakerId||request.input.speakerId!==undefined&&request.input.speakerId!==speakerId))return false;
  // Old aggregate evidence has no per-draft speaker proof. The original
  // per-person progress files remain authoritative; never assign another
  // speaker's retained words to the last person whose package was observed.
  if(party&&(evidence.calls.filter(call=>call.task==='party-chat').length>1||evidence.drafts.filter(value=>value.phase==='initial'&&!value.section&&value.prose?.trim()).length>1))return false;
  const prepared=turn.privatePersonId?preparePrivateReplyPrompt(snapshot,request.input,worldId):party?preparePartyReplyPrompt(snapshot,{...request.input,speakerId},worldId):null;
  if(!prepared||evidence.writingPackage?.id!==prepared.writingPackage.id)return false;
  assertStoryWritingPackageCurrent(evidence.writingPackage as any,snapshot,worldId);
  const task=turn.privatePersonId?'private-chat':'party-chat',draft=evidence.drafts.find(value=>value.phase==='initial'&&!value.section&&typeof value.prose==='string'&&value.prose.trim());
  let raw=draft?.prose;
  if(raw===undefined){
   const candidate=evidence.calls.filter(call=>call.task===task).flatMap(call=>call.attempts??[]).find(attempt=>attempt.transportComplete===true&&['stop','length'].includes(attempt.finishReason)&&typeof attempt.content==='string'&&attempt.content.trim());
   if(!candidate)return false;
   raw=separateNovelResponse(candidate.content,modelAnalysisBoundaries(request.profile??{},task)).content;
  }
  if(typeof raw!=='string'||!raw.trim()||raw.length>MAX_STORY_PROSE_LENGTH)return false;
  const gateway=new ModelGateway(request.profile),key=storyWritingProgressKey(['readable-novel',STORY_NOVEL_VERSION,prepared.writingPackage.id,prepared.compiled.messages,prepared.promptStructure,gateway.identity(task),gateway.settings(task)]);
  if(recovery.authorProgress.read(key)?.initialRaw!==undefined||recovery.sectionProgress?.read(key)?.initialRaw!==undefined)return true;
  recovery.authorProgress.write(key,{version:1,packageId:prepared.writingPackage.id,initialRaw:raw});return true;
 }catch{return false;}
}
export function persistentWorkflowRecovery(directory:string,worldId:string,snapshot:any,request:any):WorkflowRecovery {
 const identity=modelRecoveryIdentity(worldId,snapshot,request),store=new PersistentModelRecoveryStore(directory,identity.scope),budget=new ModelRecoveryBudget(2,store);let started=false;
 const {apiKey:_apiKey,credentialHeaders:_headers,writer,...publicProfile}=request.profile??{};
 const {apiKey:_writerKey,credentialHeaders:_writerHeaders,...publicWriter}=writer??{};
 const profile={...publicProfile,...(publicProfile.modelLibrary?{modelLibrary:publicProfile.modelLibrary.map(({apiKey,credentialHeaders,...model}:any)=>model)}:{}),...(writer?{writer:publicWriter}:{})};
 const sectionProgress=['story-writer','story-rewrite'].includes(request.kind)
  ?new FileStoryWritingProgress(join(directory,'writing-sections',identity.scope,hash([identity.operation,request.input,profile]))):undefined;
 const authorProgress=sectionProgress?new FileStoryWritingProgress(join(directory,'writing-candidates',hash([worldId,identity.operation,request.input]))):undefined;
 const designProgress=['ring-advice','research-advice'].includes(request.kind)?new FileDesignAdviceProgress(join(directory,'design-advice',identity.scope),hash([identity.operation,profile])):undefined;
 return {budget,sectionProgress,authorProgress,designProgress,beforeRequest(requiredRecovery=0){
  if(started){budget.require(requiredRecovery);return;}
  store.update(state=>{
   const repeated=state.operations.includes(identity.operation);
   if(state.used.length+requiredRecovery+(repeated?1:0)>2)throw error('本轮额外恢复次数已用尽；已结算结果保留，尚未重新请求模型');
   if(repeated){
    if(state.used.length>=2)throw error('本轮额外恢复次数已用尽；已结算结果保留，尚未重新请求模型');
    state.used.push({kind:'workflow-retry',elapsedMs:Math.max(0,Date.now()-state.startedAt)});
   }else state.operations.push(identity.operation);
  });started=true;
 }};
}
