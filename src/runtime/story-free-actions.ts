import {validateActionTime} from './action-time';
import {ensureStoryNpcMechanics} from './story-npc-mechanics';
import {rules} from '../rules';
import {resolveStoryCheck,validateStoryCheck,validateStoryCheckReceipt,STORY_CHECK_ATTRIBUTES,STORY_CHECK_DIFFICULTIES} from './story-checks';
import {modelShapeIssues,type ModelJsonSchema} from '../shared/model-json-schema';
import {StoryPlanValidationError} from './story-plan-validation-error';

export const FREE_ACTION_BRANCH_LIMIT=3;

const STATES={clue:['discovered','confirmed'],opportunity:['available','used','closed'],event:['started','advanced','resolved']} as const;
const TRANSITIONS:Record<string,string[]>={discovered:['confirmed'],confirmed:[],available:['used','closed'],used:[],closed:[],started:['advanced','resolved'],advanced:['advanced','resolved'],resolved:[]};
const idList={type:'array',items:{type:'string',minLength:1,maxLength:200},maxItems:64,uniqueItems:true};
export const FREE_ACTION_INTENT_SCHEMA:ModelJsonSchema={type:'object',properties:{requirements:{...idList,items:{type:'string',enum:Object.keys(rules.controls.LABELS)}},targetIds:idList,approachTargetIds:idList,harmfulTargetIds:idList},required:['requirements','targetIds','approachTargetIds','harmfulTargetIds'],additionalProperties:false};
export const FREE_ACTION_CHECK_SCHEMA:ModelJsonSchema={anyOf:[{type:'null'},{type:'object',properties:{attribute:{type:'string',enum:[...STORY_CHECK_ATTRIBUTES]},difficulty:{type:'integer',enum:[...STORY_CHECK_DIFFICULTIES]}},required:['attribute','difficulty'],additionalProperties:false}]};
export function freeActionEffectSchema(current?:any[]):ModelJsonSchema{
 const fresh=Object.entries(STATES).map(([kind,statuses])=>({type:'object',properties:{kind:{type:'string',enum:[kind]},status:{type:'string',enum:[statuses[0]]},text:{type:'string',minLength:1,maxLength:1000}},required:['kind','status','text'],additionalProperties:false}));
 const updates=(current??Object.keys(STATES).map(kind=>({kind}))).filter(record=>Object.hasOwn(STATES,record.kind)).flatMap(record=>{
  const statuses=record.status?TRANSITIONS[record.status]??[]:STATES[record.kind as keyof typeof STATES];
  return statuses.length?[{type:'object',properties:{kind:{type:'string',enum:[record.kind]},status:{type:'string',enum:statuses},text:{type:'string',minLength:1,maxLength:1000},recordId:{type:'string',...(record.id?{enum:[record.id]}:{minLength:1})}},required:['kind','status','text','recordId'],additionalProperties:false}]:[];
 });
 return {anyOf:[...fresh,...updates]};
}
export function freeActionShapeIssues(action:any,path:string){
 if(action?.kind!=='free-action')return [];
 const schemas:Record<string,ModelJsonSchema>={intent:FREE_ACTION_INTENT_SCHEMA,actorId:{type:'string',minLength:1,maxLength:200},objective:{type:'string',minLength:1,maxLength:1000},minutes:{type:'integer',minimum:0,maximum:60},check:FREE_ACTION_CHECK_SCHEMA,onSuccess:{type:'array',maxItems:FREE_ACTION_BRANCH_LIMIT,items:freeActionEffectSchema()},onFailure:{type:'array',maxItems:FREE_ACTION_BRANCH_LIMIT,items:freeActionEffectSchema()}};
 return Object.entries(schemas).flatMap(([name,schema])=>modelShapeIssues(action[name],schema,path+'/'+name));
}
type Effect={kind:keyof typeof STATES;status:string;text:string;recordId?:string};
type Intent={requirements:string[];targetIds:string[];approachTargetIds:string[];harmfulTargetIds:string[]};
type Plan={intent:Intent;actorId:string;objective:string;minutes:number;check:{attribute:string;difficulty:number}|null;onSuccess:Effect[];onFailure:Effect[]};
type Scope={locationId:string;expeditionId:string|null;nodeId:string|null;position:any};
const equal=(a:any,b:any):boolean=>a===b||!!a&&!!b&&typeof a==='object'&&typeof b==='object'&&Array.isArray(a)===Array.isArray(b)&&Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>Object.hasOwn(b,k)&&equal(a[k],b[k]));
function fields(v:any,keys:string[]){if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!keys.includes(k)))throw Error('自由行动字段无效');}
function text(v:any,max=1000){if(typeof v!=='string'||!v.trim()||v!==v.trim()||v.length>max)throw Error('自由行动文字无效');}
export function validateFreeAction(a:any,path=''):asserts a is Plan{
 fields(a,['kind','intent','actorId','objective','minutes','check','onSuccess','onFailure']);text(a.actorId,200);text(a.objective);
 fields(a.intent,['requirements','targetIds','approachTargetIds','harmfulTargetIds']);for(const key of ['requirements','targetIds','approachTargetIds','harmfulTargetIds']){const ids=a.intent[key];if(!Array.isArray(ids)||ids.length>64||new Set(ids).size!==ids.length||ids.some((v:any)=>typeof v!=='string'||!v||v.length>200))throw Error('自由行动意图须包含不重复的正式条件与目标');}if(a.intent.requirements.some((v:string)=>!Object.hasOwn(rules.controls.LABELS,v))||[...a.intent.approachTargetIds,...a.intent.harmfulTargetIds].some((id:string)=>!a.intent.targetIds.includes(id))||a.intent.approachTargetIds.length&&!a.intent.requirements.includes('movement'))throw Error('接近与伤害目标须引用实际目标，接近须声明移动');
 if(a.kind!==undefined&&a.kind!=='free-action')throw Error('自由行动类别无效');
 if(!Number.isSafeInteger(a.minutes)||a.minutes<0||a.minutes>60)throw Error('自由行动单段耗时须为0至60分钟，长行动须分段处理');
 if(a.check!==null){fields(a.check,['attribute','difficulty']);validateStoryCheck({...a.check,reason:a.objective});}
 for(const branch of ['onSuccess','onFailure'] as const){
  const effects=a[branch],instancePath=path+'/'+branch;
  if(!Array.isArray(effects))throw new StoryPlanValidationError('自由行动成功与失败后果须分别填写数组',{instancePath,keyword:'type',submitted:effects===null?'null':typeof effects,reference:{instancePath,value:{type:'array'}}});
  if(effects.length>FREE_ACTION_BRANCH_LIMIT)throw new StoryPlanValidationError('自由行动每个分支至多3项后果',{instancePath,keyword:'maxItems',submitted:effects.length,reference:{instancePath,value:{maxItems:FREE_ACTION_BRANCH_LIMIT}}});
  const seen=new Set<string>();for(const effect of effects){
   fields(effect,['kind','status','text','recordId']);text(effect.text);if(effect.recordId!==undefined)text(effect.recordId,240);
   if(!Object.hasOwn(STATES,effect.kind)||!(STATES[effect.kind as keyof typeof STATES] as readonly string[]).includes(effect.status))throw Error('自由行动后果种类或状态无效');
   const key=effect.recordId??effect.kind+':'+effect.text;if(seen.has(key))throw Error('自由行动后果重复');seen.add(key);
   if(!effect.recordId&&effect.status!==STATES[effect.kind as keyof typeof STATES][0])throw Error('新后果须从发现、可用或开始状态登记');
  }
 }
 if(a.check===null&&a.onFailure.length)throw Error('确定行动不使用失败检定分支');
}
function scope(state:any):Scope {const active=state.远征?.当前;return {locationId:state.人物.列表[state.角色.主控单位ID]?.locationId??state.地图.当前地点ID,position:state.人物.列表[state.角色.主控单位ID]?rules.actions.positionOf(state,state.角色.主控单位ID):null,expeditionId:active?.id??null,nodeId:active?.currentRoom?.nodeId??null};}
function stamp(time:any){return time.day*1440+time.hour*60+time.minute;}
function validateTime(time:any){fields(time,['day','hour','minute']);if(!Number.isSafeInteger(time.day)||time.day<1||!Number.isSafeInteger(time.hour)||time.hour<0||time.hour>23||!Number.isSafeInteger(time.minute)||time.minute<0||time.minute>59)throw Error('自由行动时间无效');}
function planOf(a:Plan):Plan{return structuredClone({intent:a.intent,actorId:a.actorId,objective:a.objective,minutes:a.minutes,check:a.check,onSuccess:a.onSuccess,onFailure:a.onFailure});}
function canUpdate(prior:any,effect:Effect,actorId:string,place:Scope){
 if(!prior||prior.kind!==effect.kind||prior.actorId!==actorId||!equal(prior.scope,place))throw Error('后果只能更新本行动者在同一现场的已有记录');
 if(!TRANSITIONS[prior.status]?.includes(effect.status))throw Error('自由行动后果状态不能倒退或重复完成');
}
/** Immutable operations are the authority. The current local state is a projection of their selected branches. */
function project(records:any[]){const current=new Map<string,any>();for(const r of records)for(const effect of r.effects)current.set(effect.id,{...effect,actorId:r.plan.actorId,scope:r.scope,sourceId:r.sourceId,at:r.after});return current;}
export function freeActionFacts(state:any,actorId=state.角色?.主控单位ID){
 const records=state.扩展?.storyFreeActions??[],place=scope(state);
 const all=[...project(records).values()].filter(r=>r.actorId===actorId);
 return {current:structuredClone(all.filter(r=>equal(r.scope,place))),recent:structuredClone(records.filter((r:any)=>r.plan.actorId===actorId).slice(-4)),
  meaning:'这些记录仅结算耗时、骰点与现场局部线索、机会和事件。文字及检定成功不等于其他系统已执行；持有资源、能力、人物状态、地点、关系、权限和任务进展以各自档案与专用回执为准。只向实际行动者登记所得，NPC行动不自动让玩家知情。'};
}
export function resolveFreeAction(state:any,input:any,sourceId:string){
 const {source,...a}=input;validateFreeAction(a);fields(source,['branchId','turn','step','input']);text(source.input,8000);
 if(sourceId!==`story:${source.branchId}:${source.turn}:${source.step}`||source.branchId!==state.扩展?.story?.branchId||source.turn!==state.扩展.story.active?.number||!state.扩展.story.active.input.includes(source.input)||!Number.isSafeInteger(source.step)||source.step<0||source.step>11)throw Error('自由行动须绑定原始故事步骤');
 const records=state.扩展?.storyFreeActions??[];
 const existing=records.find((r:any)=>r.sourceId===sourceId);if(existing){if(!equal(existing.plan,planOf(a))||!equal(existing.source,source))throw Error('自由行动原计划已经冻结');return {state,receipt:structuredClone(existing)};}
 const block=rules.world.worldActionBlockReason(state,{allowActivities:['expedition']});if(block)throw Error(block);
 const expedition=state.远征?.当前;
 if(expedition&&!['awaiting-room','interaction','postcombat'].includes(expedition.phase))throw Error('房间仍在准备或战斗中，请先完成专用行动');
 const person=state.人物?.列表?.[a.actorId],unit=state.战斗单位?.列表?.[a.actorId];
 if(!person||person.status==='dead'||!rules.actions.colocated(state,a.actorId,state.角色.主控单位ID)||unit&&(unit.存活状态!=='存活'||unit.资源.生命.当前<=0))throw Error('自由行动者须为在场且能够行动的已登记人物');
 if(expedition&&a.actorId!==state.角色.主控单位ID&&!expedition.companions.some((c:any)=>c.unitId===a.actorId&&c.active))throw Error('该人物不在本次远征队伍中');
 rules.actions.resolve(state,{actorId:a.actorId,battleId:null,...a.intent});
 const scheduleReason=rules.world.npcActionScheduleReason(state,a.actorId,a.minutes);if(scheduleReason)throw Error(scheduleReason);
 const place=scope(state),current=project(records);
 // Validate both branches before drawing, so a failed proposal cannot be repaired after seeing the die.
 for(const effect of [...a.onSuccess,...a.onFailure]){
  if(effect.recordId)canUpdate(current.get(effect.recordId),effect,a.actorId,place);
  else if([...current.values()].some(p=>p.actorId===a.actorId&&equal(p.scope,place)&&p.kind===effect.kind&&p.text===effect.text))throw Error('这个后果已有记录，请引用原编号');
 }
 if(a.check)state=ensureStoryNpcMechanics(state,a.actorId,sourceId);
 const check=a.check?resolveStoryCheck(state,{...a.check,reason:a.objective},sourceId,{actorId:a.actorId,allowExpedition:true}).receipt:null;
 const passed=check?.passed??true,chosen=passed?a.onSuccess:a.onFailure;
 const effects=chosen.map((effect,i)=>{
  const {recordId,...value}=effect;return {id:recordId??`free:${sourceId}:${i}`,...value};
 });
 const next=structuredClone(state),timing=rules.world.advanceActionTime(next,a.actorId,a.minutes);
 const receipt={type:'story-free-action',sourceId,source:structuredClone(source),plan:planOf(a),scope:place,before:timing.before,after:timing.after,check,passed:timing.interruption?false:passed,effects:timing.interruption?[]:effects,
  ...(timing.interruption?{interruption:timing.interruption}:{}),
  summary:`${person.name}：${a.objective}；${timing.interruption?'寿命耗尽，行动终止，未产生预定后果':check?(passed?'检定通过':'检定未通过'):'已完成'}，实际用时${timing.minutes}分钟。`};
 (next.扩展.storyFreeActions??=[]).push(structuredClone(receipt));return {state:next,receipt};
}
export function validateFreeActions(state:any){
 const records=state.扩展?.storyFreeActions;if(records===undefined)return;if(!Array.isArray(records))throw Error('自由行动存档无效');
 const seen=new Set<string>(),current=new Map<string,any>();let lastTurn=0,lastStep=-1;
 for(const r of records){
  fields(r,['type','sourceId','source','plan','scope','before','after','check','passed','effects','summary','interruption']);validateFreeAction(r.plan);fields(r.source,['branchId','turn','step','input']);text(r.source.branchId,200);text(r.source.input,8000);text(r.summary);
  const s=r.source;
  if(r.type!=='story-free-action'||!Number.isSafeInteger(s.turn)||s.turn<1||s.turn>=state.扩展.story.nextTurn||!Number.isSafeInteger(s.step)||s.step<0||s.step>11||s.turn<lastTurn||s.turn===lastTurn&&s.step<=lastStep||r.sourceId!==`story:${s.branchId}:${s.turn}:${s.step}`||seen.has(r.sourceId))throw Error('自由行动来源无效或重复');
  seen.add(r.sourceId);lastTurn=s.turn;lastStep=s.step;fields(r.scope,['locationId','expeditionId','nodeId','position']);if(r.scope.position?.kind!=='transit')text(r.scope.locationId);for(const k of ['expeditionId','nodeId'])if(r.scope[k]!==null)text(r.scope[k]);
  if(!state.人物?.列表?.[r.plan.actorId]||!(r.scope.position?.kind==='transit'?r.scope.locationId===''&&rules.world.ROUTE_TEMPLATES[r.scope.position.routeId]&&Number.isFinite(r.scope.position.elapsedMinutes)&&r.scope.position.elapsedMinutes>=0&&r.scope.position.elapsedMinutes<=rules.world.ROUTE_TEMPLATES[r.scope.position.routeId].minutes:state.地图?.地点?.[r.scope.locationId]&&r.scope.position?.locationId===r.scope.locationId)||r.scope.nodeId!==null&&r.scope.expeditionId===null)throw Error('自由行动人物或现场无效');
  validateTime(r.before);validateTime(r.after);validateActionTime(state,r.plan.actorId,r.plan.minutes,r.before,r.after,r.interruption);
  if(r.plan.check){validateStoryCheckReceipt(r.check);if(r.check.sourceId!==r.sourceId||r.check.actorId!==r.plan.actorId||r.check.attribute!==r.plan.check.attribute||r.check.difficulty!==r.plan.check.difficulty||r.check.reason!==r.plan.objective||!equal(state.扩展.story.checks?.find((c:any)=>c.receipt?.sourceId===r.sourceId)?.receipt,r.check))throw Error('自由行动检定与原计划或骰点历史不一致');}else if(r.check!==null)throw Error('确定行动不能有骰点');
  if(r.passed!==(r.interruption?false:r.check?.passed??true))throw Error('自由行动分支与骰点不一致');
  for(const effect of [...r.plan.onSuccess,...r.plan.onFailure]){
   if(effect.recordId)canUpdate(current.get(effect.recordId),effect,r.plan.actorId,r.scope);
   else if([...current.values()].some(p=>p.actorId===r.plan.actorId&&equal(p.scope,r.scope)&&p.kind===effect.kind&&p.text===effect.text))throw Error('自由行动重复创建已有后果');
  }
  const expected=(r.interruption?[]:r.passed?r.plan.onSuccess:r.plan.onFailure).map((e:Effect,i:number)=>{const {recordId,...v}=e;return {id:recordId??`free:${r.sourceId}:${i}`,...v};});
  if(!equal(expected,r.effects))throw Error('自由行动后果与冻结分支不一致');
  for(const effect of r.effects)current.set(effect.id,{...effect,actorId:r.plan.actorId,scope:r.scope});
 }
 const turn=state.扩展.story.active;
 for(const result of turn?.results??[])if(result.receipt?.type==='story-free-action'){
  const r=result.receipt,stored=records.find((v:any)=>v.sourceId===r.sourceId);
  if(result.action.kind!=='free-action'||!equal(planOf(result.action),r.plan)||!equal(stored,r)||r.source.turn!==turn.number||r.source.step!==result.step||r.source.input!==result.source||result.status!==(r.passed?'succeeded':'failed'))throw Error('自由行动回执与原始步骤不一致');
 }
}
