import {effectDesignEntry,effectCompositionRules} from './effect-design-catalogue';
import {workshopAdviceMatches} from '../shared/opening-workshop-advice';
import {rules} from '../rules';
import {ModelGatewayError,type ModelGateway} from '../runtime/model-gateway';
import {creativeMessages} from '../runtime/model-prompts';
import {validateCreationWorkspace} from '../runtime/creation-workbench';
import {parseDesignAdviceWire,isUnparsedDesignAdvice,designAdviceIntentValue} from './design-advice-wire';
import {assertResearchRepairPreservesLegal} from './research-design-repair';
import {preflightDesignAdvice} from './design-advice-preflight';

const object=(v:any)=>v&&typeof v==='object'&&!Array.isArray(v);
const text=(v:any,max:number)=>typeof v==='string'&&!!v.trim()&&v===v.trim()&&v.length<=max;
/** Field paths are correction context for the model, never silently stripped. */
function unknownFields(value:any,grammar:any):string[]{
 const paths:string[]=[],check=(v:any,fields:string[],path:string)=>{if(object(v))for(const key of Object.keys(v))if(!fields.includes(key))paths.push(path+key);};
 check(value,['mode','reply','design'],'');check(value?.design,grammar.designFields,'design.');check(value?.design?.definition,grammar.definitionFields,'design.definition.');
 const branches=value?.design?.definition?.requestedBranches;if(Array.isArray(branches))branches.forEach((branch:any,index:number)=>check(branch,grammar.branchFields,`design.definition.requestedBranches[${index}].`));
 return paths;
}
/** A checked projection tells the model which mechanics already work. The
 * original candidate remains intact and only the full repaired reply is used. */
function validatedMechanics(value:any,grammar:any,before:any){
 if(!object(value?.design)||!object(value.design.definition))return null;
 const definition=Object.fromEntries(Object.entries(value.design.definition).filter(([key])=>grammar.definitionFields.includes(key))),design=Object.fromEntries(Object.entries(value.design).filter(([key])=>grammar.designFields.includes(key)));
 const checked=rules.openingWorkshop.inspectDesign({...design,definition,id:before.id,category:before.category,recipient:before.recipient,placement:before.placement,quantity:before.quantity,adopted:false});
 return checked.pass?{definition}:null;
}
function selected(config:any,designId:unknown){
 validateCreationWorkspace({version:5,config});
 if(config.difficulty!=='unlimited')throw Error('请先开启无限点数，再与工坊主持人讨论');
 const d=rules.openingWorkshop.normalize(config.openingWorkshop).designs.find((d:any)=>d.id===designId);if(!d)throw Error('请选择需要讨论的作品');return d;
}
export function inspectWorkshopAdvice(config:any,designId:unknown,value:any){
 const before=selected(config,designId);
 if(!object(value)||Object.keys(value).some(k=>!['mode','reply','design'].includes(k))||!['question','proposal'].includes(value.mode)||!text(value.reply,2000))throw Error('工坊主持人需返回完整追问或作品提案');
 if(value.mode==='question'){if(Object.hasOwn(value,'design'))throw Error('追问不能同时修改作品');return {mode:'question',reply:value.reply};}
 if(!object(value.design))throw Error('作品提案缺少设计');
 if(!object(value.design.definition))throw Error('作品方案没有写全，当前草稿已保留，请重新发送构想');
 const design={...structuredClone(value.design),id:before.id,category:before.category,recipient:before.recipient,placement:before.placement,quantity:before.quantity,adopted:false,...(before.customImage?{customImage:before.customImage}:{})};
 const check=rules.openingWorkshop.inspectDesign(design);if(!check.pass)throw Error(check.errors.join('；'));
 return {mode:'proposal',reply:value.reply,design:check.design,quote:check.quote,summary:check.summary,preview:check.preview};
}
export async function requestWorkshopAdvice(gateway:ModelGateway,config:any,designId:unknown,description:unknown,signal?:AbortSignal,exchanges:{input:string;reply:string}[]=[],proposal?:{base:string;reply:string;design:any}){
 const before=selected(config,designId);
 if(!text(description,4000))throw Error('请填写1至4000字的道具构想');
 if(!Array.isArray(exchanges)||exchanges.length>=20||exchanges.some(e=>!object(e)||!text(e.input,4000)||!text(e.reply,2000)))throw Error('工坊讨论记录无效或已满20轮，请清空讨论后继续');
 let editing=before;
 if(proposal){if(!workshopAdviceMatches(config,proposal.base))throw Error('作品草稿已经改变，请重新讨论');editing=inspectWorkshopAdvice(config,designId,{mode:'proposal',reply:proposal.reply,design:proposal.design}).design;}
 const catalog=rules.openingWorkshop.catalog(config);
 const withoutImage=(design:any)=>{const {customImage,...textDesign}=design;return textDesign;},quote=rules.openingWorkshop.inspectDesign(editing);
 const designGrammar=rules.openingWorkshop.designGrammar();
 const context={workshop:true,opening:true,request:description,exchanges,pendingProposal:proposal?{reply:proposal.reply,design:withoutImage(proposal.design)}:null,current:withoutImage(editing),currentQuote:{pass:quote.pass,errors:quote.errors,quote:quote.quote,summary:quote.summary},
  categories:catalog.categories,templates:catalog.templates.filter((t:any)=>t.design.category===before.category),compositionRules:effectCompositionRules(),effects:Object.fromEntries(Object.entries(catalog.effects).filter(([,entry]:[string,any])=>entry.authorable!==false).map(([id,entry]:[string,any])=>[id,effectDesignEntry(id,entry)])),forms:catalog.forms,tools:catalog.tools,restraints:catalog.restraints,
  manufacture:{materials:0,gold:0,characterPoints:0,waitingMinutes:0,location:'开局工坊',source:'冻结的开局制造来源'},
  rules:'只设计当前一件作品。采用已登记效果、参数、能力合同和制式；构造requestedBranches并明确主动/常驻。魂导器可自由组合合法效果；拘束器仍用restraint正式制式，工具只用templateId。人物点数与制造免费，使用费用可设非负整数，实际魂力、耐久、冷却、次数、条件、目标、抵抗、装备和药剂途径按设计执行。按 responseShape 返回作品草案，正式采用时由工坊建立物品。',
  designGrammar,branchShape:{id:'main',label:'能力用途',activation:'active 或 passive',nodes:[['登记的effectId',{参数名:'目录规定的参数值'}]]},
  responseRules:'回复完整JSON对象。提案的顶层字段为mode、reply、design，追问的顶层字段为mode、reply；reply为1至2000字。design、definition及每个分支分别使用designGrammar列出的字段，效果节点使用[effectId,params]二元数组。id、category、recipient、placement、quantity沿用current，adopted为false。文字介绍、外形与图鉴分别写description、appearance、artId；图片附件由原草稿保存。',
  questionResponseShape:{mode:'question',reply:'需要玩家决定的具体取舍'},
  responseShape:{mode:'proposal',reply:'说明作品外观、真实作用与使用条件',design:{...withoutImage(editing),adopted:false}}
 };
 const generate=async(packet:any,validate:(value:any)=>ReturnType<typeof inspectWorkshopAdvice>,repair=false)=>{
  signal?.throwIfAborted();const messages=creativeMessages('creation-item-advisor',packet);preflightDesignAdvice(gateway,messages,'creation-item-advisor');
  return gateway.structured(messages,validate,{task:'creation-item-advisor',signal,parseStructured:parseDesignAdviceWire,repairFormat:false,repairValidation:false,...(repair?{recoveryKind:'opening-workshop-design-repair'}:{})});
 };
 const inspect=(value:any)=>{if(isUnparsedDesignAdvice(value))throw Error('工坊主持人的答复格式不完整');return inspectWorkshopAdvice(config,designId,value);};
 // Keep one bounded correction in the selected design model. Provider failures
 // and cancellation propagate directly; a failed correction never calls again.
 let initial:any,received=false,result:ReturnType<typeof inspectWorkshopAdvice>;
 try{result=await generate(context,value=>{initial=value;received=true;return inspect(value);});}
 catch(error){
  if(signal?.aborted||!received||!(error instanceof ModelGatewayError)||!['invalid-response','invalid-json'].includes(error.kind))throw error;
  if(gateway.recoveryBudget?.snapshot().used.some(entry=>entry.kind==='opening-workshop-design-repair'))throw new ModelGatewayError('invalid-response','本轮已经修复过作品方案，请保留构想后重试',{cause:error});
  const original=designAdviceIntentValue(initial),hasDefinition=object(original?.design?.definition)&&Object.keys(original.design.definition).some(key=>designGrammar.definitionFields.includes(key));
  // There is no candidate to structurally repair when its definition is absent.
  // Re-request a full, unadopted proposal from the unchanged player context once.
  // Existing mechanical declarations still use the strict preservation guard.
  const recoveryMode=hasDefinition?'preserve-proposal':'regenerate-proposal';let repaired:any;
  const correction={mode:recoveryMode,reason:error.message,unknownFields:unknownFields(original,designGrammar),validatedMechanics:validatedMechanics(original,designGrammar,before),instruction:hasDefinition?
   '依据原构想和同一份登记目录修复答复结构，保留原方案合法的效果、参数、费用、分支与制式。validatedMechanics列出已通过实际规则核验的字段和值，完整原样保留，包括空数组与零费用；其余内容按designGrammar填写完整设计。原候选previous和玩家要求共同保留，实际效果仍由原规则核验。需要改变用途、参数或取舍时，返回question说明具体问题。':
   '上份答复尚未形成作品方案。依据原request、exchanges、current和同一份登记目录重新提供完整作品提案，design.definition写出全部机制；玩家仍须审阅并采用。current是当前编辑草稿，按玩家本次构想设计。需要玩家决定用途、参数或取舍时，返回question说明具体问题。'};
  try{
   result=await generate({...context,previous:initial,correction},value=>{
    repaired=value;
    if(hasDefinition){
     if(value?.mode!=='question'&&!object(value?.design?.definition))inspect(value);
     assertResearchRepairPreservesLegal(initial,value);
     const templateId=original?.design?.definition?.templateId;
     if(value?.mode!=='question'&&typeof templateId==='string'&&catalog.templates.some((t:any)=>t.design.category===before.category&&t.design.definition.templateId===templateId)&&value?.design?.definition?.templateId!==templateId)throw Error('结构修复须保留原作品的合法制式');
    }
    return inspect(value);
   },true);
  }catch(cause){
   if(signal?.aborted||!(cause instanceof ModelGatewayError)||!['invalid-response','invalid-json'].includes(cause.kind))throw cause;
   throw new ModelGatewayError('invalid-response',cause.message,{cause:{stage:'opening-workshop-advice',recoveryMode,initialIssue:error.message,recoveryIssue:cause.message,initialHasDefinition:!!hasDefinition,recoveryHasDefinition:!!object(repaired?.design?.definition),cause}});
  }
 }
 // The image stays in the local design. Proposal review restores it before adoption;
 // model-job results do not duplicate binary attachments or cross their text limit.
 if(result.mode!=='proposal')return result;
 // Recompute the compiled preview when the UI reviews the candidate, rather than
 // duplicating its graphs in retained model-job results and editing history.
 const {preview,...answer}=result;return {...answer,design:withoutImage(result.design)};
}
