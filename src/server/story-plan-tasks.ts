import {STORY_ACTION_SCHEMA,validateStoryPlan,type StoryPlan,type StorySegment} from '../runtime/story-turns';
import {StoryPlanValidationError} from '../runtime/story-plan-validation-error';
import {STORY_QUERY_ACTIONS} from '../runtime/story-action-semantics';
import {rules} from '../rules';
import {assertBattleActionType} from '../shared/battle-action-input';

const contactResponses={conversation:'address-person',belief:'tell-person',plans:'consider-person-goal'} as const;
const contactKinds=new Set<string>(Object.values(contactResponses));
const responsePurposes={conversation:'日常交往与表达，不需要事实可信度判断或本人安排',belief:'告知一条消息，请本人判断相信、怀疑或不确定',plans:'询问人物本人准备做什么，包括是否转告本人已知事件；读取已有安排，必要时由本人形成决定。商店库存、报价及制作条件使用对应正式查询，不由人物打算回答'};
/** One interpersonal operation, with an explicit required response. No new world state. */
export function storyHostActions(actions:typeof STORY_ACTION_SCHEMA,state?:any){
 if(state){const actorId=state.角色.主控单位ID;actions=actions.filter(action=>action.kind==='ship-shop-auction'?rules.stock.operatorShops(state,actorId).length>0:action.kind==='take-asset-auction-host'?rules.commerceAuction.hasHostRole(state,actorId):true);}
 const contact=actions.find(a=>contactKinds.has(a.kind));
 const ordinary=actions.filter(a=>!contactKinds.has(a.kind)&&a.kind!=='pass-custody-auction').map(({sourceText,jsonStringParameters,...action})=>({...action,...(sourceText?{parameters:action.parameters.filter(p=>p!==sourceText.parameter).concat('deliverySource'),optionalParameters:[...(action.optionalParameters??[]).filter(p=>p!==sourceText.parameter),'deliverySource']} :{}),...(jsonStringParameters?{objectParameters:jsonStringParameters}:{}),...(action.kind==='stop-maintenance'?{referenceParameters:{maintenanceSourceId:{from:'maintenanceOptions',valueField:'maintenanceSourceId',matchFields:['skillId','skillName','createdAt'],requiredStatus:'maintaining',owner:'player',multipleUnresolved:'clarify'}}}:{})}));
 const registration=ordinary.find(a=>a.kind==='register-competition');if(registration)Object.assign(registration,{purpose:'报名玩家明确选择的正式赛事。venueId须对应原话或本次补充回答的正式名称、别名或ID；未知场馆先clarify确认真实替代赛事，不按同城擅自替换。未点名地点或赛事的当地报名才可省略venueId。'});
 if(contact){const {sourceText,optionalParameters,...schema}=contact;const optional=[...(optionalParameters??[]).filter(p=>!['intent','text'].includes(p)),'deliverySource'];ordinary.push({...schema,optionalParameters:optional,kind:'contact-person',purpose:'向人物交流，并指定这次需要的回应类型',parameters:schema.parameters.filter(p=>!['intent','text'].includes(p)).concat('response','deliverySource'),valueOptions:{response:Object.entries(contactResponses).filter(([,kind])=>actions.some(a=>a.kind===kind)).map(([value])=>({value,label:responsePurposes[value as keyof typeof responsePurposes]}))}});}
 return ordinary;
}

/** Interpreter obligations, not new world properties or an additional model call. */
const specialTasks={
 query:STORY_QUERY_ACTIONS,
 communication:['tell-person','tell-party','address-person','meet'],
 'npc-choice':['propose-person-contract','issue-person-contract-order','request-person-growth','propose-performance-agreement','propose-custody-transfer','start-custody-auction','propose-person-cooperation','resume-person-cooperation','consider-person-goal','ask-release','bargain-hire','promise-gold','promise-item','give-item','give-gold','invite','invite-date','exchange-contact','propose-loot-resolution','propose-loot','invite-party','propose-relationship'],
 'player-choice':['clarify'],
 expression:['describe'],
} as const;
const special=Object.fromEntries(Object.entries(specialTasks).flatMap(([task,actions])=>actions.map(action=>[action,task])));
export const STORY_ACTION_TASKS:Readonly<Record<string,string>>=Object.freeze({...Object.fromEntries(STORY_ACTION_SCHEMA.map(a=>[a.kind,special[a.kind]??'rule-action'])),'contact-person':'communication'});
const meanings:Record<string,string>={query:'查询已有资料或可行条件',communication:'向对象送达原话、交谈意图或实际接触', 'npc-choice':'需要人物本人的目标或对提议的独立选择','rule-action':'执行玩家要求的规则行动','player-choice':'缺少玩家必要选择或尚有歧义',expression:'只需文学表达的观察、神态、内心或假设'};
export function storyTaskCatalog(actions:ReadonlyArray<{kind:string}>){
 return Object.entries(meanings).map(([kind,meaning])=>({kind,meaning,actions:actions.filter(a=>STORY_ACTION_TASKS[a.kind]===kind).map(a=>a.kind)})).filter(task=>task.actions.length);
}

/** A declared obligation cannot be discharged by an unrelated action or mere prose.
 * This does not claim to verify the model's interpretation of arbitrary natural language.
 * The metadata is retained in provider evidence, stripped before the existing rule plan.
 */
export function validateStoryHostPlan(value:unknown,input:string,attest?:(plan:StoryPlan)=>StoryPlan,prefix:StorySegment[]=[]):StoryPlan{
 const raw=value as any;
 if(!raw||!Array.isArray(raw.segments))return validateStoryPlan(value,input);
 if(prefix.length){
  const questions=raw.segments.filter((s:any)=>s?.action?.kind==='clarify');
  if(raw.segments.some((s:any)=>s?.refreshAfter)||questions.length&&(prefix.some(s=>s.action.kind==='clarify')||questions.length>1||raw.segments.at(-1)?.action?.kind!=='clarify'))throw Error('补充安排不能再次刷新或重复追问；新的必要选择只能放在末尾交还玩家，本次行动随之结束。');
 }
 const candidate={...raw,segments:raw.segments.map((segment:any,index:number)=>{
  if(!segment||typeof segment!=='object')return segment;
  const {task,...ruleSegment}=segment;
  if(segment.source&&typeof segment.source==='object'){
   if(Array.isArray(segment.source)||Object.keys(segment.source).length!==1||segment.source.input!==true)throw new StoryPlanValidationError('原话引用须选择本轮完整输入，或填写连续原文',{instancePath:`/segments/${index}/source`,keyword:'input-reference',submitted:segment.source,reference:{instancePath:'/catalogProtocol/source/wholeInput',value:{input:true}}});
   ruleSegment.source=input;
  }
  const {deliverySource,...submittedAction}=segment.action??{};
  if(submittedAction.kind==='battle-action')assertBattleActionType(submittedAction.intent);
  ruleSegment.action=submittedAction;
  if(segment.action?.kind==='pass-custody-auction')throw new StoryPlanValidationError('旁观拍卖无需提交动作；只有出价或撤回拍卖才需执行',{instancePath:`/segments/${index}/action/kind`,keyword:'retired-host-operation',submitted:segment.action.kind,reference:{instancePath:'/actionCatalog',value:['bid-custody-auction','cancel-custody-auction']}});
  if(contactKinds.has(segment.action?.kind))throw new StoryPlanValidationError('人物交流使用contact-person并明确response，由代码接到现有回应流程',{instancePath:`/segments/${index}/action/kind`,keyword:'host-operation',submitted:segment.action.kind,reference:{instancePath:'/actionCatalog',value:'contact-person'}});
  if(segment.action?.kind==='contact-person'){
   const {response,...action}=submittedAction;
   if(typeof response!=='string'||!Object.hasOwn(contactResponses,response))throw new StoryPlanValidationError('人物交流须选择conversation、belief或plans回应',{instancePath:`/segments/${index}/action/response`,keyword:'response-kind',submitted:response??null,reference:{instancePath:'/actionCatalog/contact-person/response',value:Object.keys(contactResponses)}});
   ruleSegment.action={...action,kind:contactResponses[response as keyof typeof contactResponses]};
  }
  const schema=STORY_ACTION_SCHEMA.find(schema=>schema.kind===ruleSegment.action?.kind),binding=schema?.sourceText;
  // Coverage is the reason for an operation; delivery is the selected original
  // utterance. They need not have the same boundary. Neither is rewritten here.
  if(Object.hasOwn(segment.action??{},'deliverySource')){
   const instancePath=`/segments/${index}/action/deliverySource`,submitted=deliverySource??null;
   if(!binding)throw new StoryPlanValidationError(`${segment.action.kind}不使用deliverySource，请按当前动作的参数提交`,{
    instancePath,keyword:'delivery-source-not-supported',submitted,
    reference:{instancePath:`/actionCatalog/${segment.action.kind}`,value:{kind:segment.action.kind,allowedFields:['kind',...(schema?.parameters??[])]}},
   });
   const reference={instancePath:`/segments/${index}/source`,value:ruleSegment.source};
   if(typeof deliverySource!=='string'||!deliverySource.trim())throw new StoryPlanValidationError('deliverySource须为非空字符串，且必须逐字取自本交流片段',{
    instancePath,keyword:'delivery-source-type',submitted,reference,
   });
   if(typeof ruleSegment.source!=='string'||!ruleSegment.source.includes(deliverySource))throw new StoryPlanValidationError('deliverySource须是本交流片段中的连续原文，当前source中没有这段原话',{
    instancePath,keyword:'delivery-source-not-contained',submitted,reference,
   });
   if(ruleSegment.source.indexOf(deliverySource)!==ruleSegment.source.lastIndexOf(deliverySource))throw new StoryPlanValidationError('deliverySource须是本交流片段中唯一出现的连续原文，当前source含有重复原话',{
    instancePath,keyword:'delivery-source-ambiguous',submitted,reference,
   });
  }
  // The host supplies structured values; only code performs the rule command's serialization.
  // This is a wire adapter, not a second source of terms or a save migration.
  for(const [parameter,shape] of Object.entries(schema?.jsonStringParameters??{})){
   const value=ruleSegment.action[parameter];
   if(value===undefined)continue;
   if(!value||typeof value!=='object'||Array.isArray(value))throw new StoryPlanValidationError('结构化行动参数须为对象',{
    instancePath:`/segments/${index}/action/${parameter}`,keyword:'object-parameter',submitted:value,
    reference:{instancePath:`/actionCatalog/${ruleSegment.action.kind}/objectParameters/${parameter}`,value:shape},
   });
   ruleSegment.action={...ruleSegment.action,[parameter]:JSON.stringify(value)};
  }
  if(binding){
   if(typeof segment.source==='object'&&deliverySource===undefined)throw new StoryPlanValidationError('交流须选出实际要送达的连续原话',{instancePath:`/segments/${index}/action/deliverySource`,keyword:'delivery-source',submitted:null,reference:{instancePath:`/segments/${index}/source`,value:ruleSegment.source}});
   if(Object.hasOwn(segment.action,binding.parameter))throw new StoryPlanValidationError('交流内容由已选source片段绑定，行动参数无需重复提供',{
    instancePath:`/segments/${index}/action/${binding.parameter}`,keyword:'code-bound-source',submitted:segment.action[binding.parameter],reference:{instancePath:`/segments/${index}/source`,value:ruleSegment.source},
   });
   ruleSegment.action={...ruleSegment.action,[binding.parameter]:deliverySource??ruleSegment.source};
  }
  return ruleSegment;
 })};
 if(!prefix.length&&candidate.segments.length&&candidate.segments.every((s:any)=>s.action.kind==='describe'&&s.action.mode==='explanation'))throw Error('行动说明不能代替正式查询或操作；请使用目录里的实际查询返回结果，或clarify说明缺少的选择。文学场景才使用describe的scene模式。');
 // The already executed prefix is supplied by code, never rewritten by the model.
 candidate.segments=[...structuredClone(prefix),...candidate.segments];
 // Keep the rule validation and source/permission attestation as the authority.
 const plan=validateStoryPlan(attest?attest(candidate):candidate,input);
 for(const [index,segment] of raw.segments.entries()){
  const expected=STORY_ACTION_TASKS[segment.action.kind];
  if(segment.task!==undefined&&segment.task!==expected)throw Error(`片段${index}的${segment.task}职责不能由${segment.action.kind}完成，该接口属于${expected}`);
 }
 return plan;
}
