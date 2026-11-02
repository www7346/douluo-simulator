import {effectDesignEntry,effectCompositionRules} from './effect-design-catalogue';
import {workshopAdviceMatches} from '../shared/opening-workshop-advice';
import {rules} from '../rules';
import type {ModelGateway} from '../runtime/model-gateway';
import {creativeMessages} from '../runtime/model-prompts';
import {validateCreationWorkspace} from '../runtime/creation-workbench';

const object=(v:any)=>v&&typeof v==='object'&&!Array.isArray(v);
const text=(v:any,max:number)=>typeof v==='string'&&!!v.trim()&&v===v.trim()&&v.length<=max;
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
 const context={workshop:true,request:description,exchanges,pendingProposal:proposal?{reply:proposal.reply,design:withoutImage(proposal.design)}:null,current:withoutImage(editing),currentQuote:{pass:quote.pass,errors:quote.errors,quote:quote.quote,summary:quote.summary},
  categories:catalog.categories,templates:catalog.templates.filter((t:any)=>t.design.category===before.category),compositionRules:effectCompositionRules(),effects:Object.fromEntries(Object.entries(catalog.effects).filter(([,entry]:[string,any])=>entry.authorable!==false).map(([id,entry]:[string,any])=>[id,effectDesignEntry(id,entry)])),forms:catalog.forms,tools:catalog.tools,restraints:catalog.restraints,
  manufacture:{materials:0,gold:0,characterPoints:0,waitingMinutes:0,location:'开局工坊',source:'冻结的开局制造来源'},
  rules:'只设计当前一件作品。采用已登记效果、参数、能力合同和制式；构造requestedBranches并明确主动/常驻。魂导器可自由组合合法效果；拘束器仍用restraint正式制式，工具只用templateId。人物点数与制造免费，使用费用可设非负整数，实际魂力、耐久、冷却、次数、条件、目标、抵抗、装备和药剂途径按设计执行。按 responseShape 返回作品草案，正式采用时由工坊建立物品。',
  responseShape:{mode:'proposal',reply:'说明作品外观、真实作用与使用条件',design:'当前完整design结构，修改name/description/appearance/artId/definition；id/category/recipient/placement/quantity保留，adopted=false'}
 };
 const result=await gateway.structured(creativeMessages('creation-item-advisor',context),value=>inspectWorkshopAdvice(config,designId,value),{task:'creation-item-advisor',signal});
 // The image stays in the local design. Proposal review restores it before adoption;
 // model-job results do not duplicate binary attachments or cross their text limit.
 if(result.mode!=='proposal')return result;
 // Recompute the compiled preview when the UI reviews the candidate, rather than
 // duplicating its graphs in retained model-job results and editing history.
 const {preview,...answer}=result;return {...answer,design:withoutImage(result.design)};
}
