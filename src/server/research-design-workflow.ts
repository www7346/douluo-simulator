import {effectDesignEntry,effectCompositionRules,designPromptCatalogue} from './effect-design-catalogue';
import {preflightDesignAdvice} from './design-advice-preflight';
import {rules} from '../rules';
import type {ModelGateway} from '../runtime/model-gateway';
import {creativeMessages} from '../runtime/model-prompts';
import type {DesignAdviceProgressStore} from '../shared/design-advice-progress';
import {inspectPaidDesign} from './research-design-advisor';
import {parseDesignAdviceWire,isUnparsedDesignAdvice,designAdviceIntentValue} from './design-advice-wire';
import {assertResearchRepairPreservesLegal} from './research-design-repair';
import {materialName} from '../runtime/player-text';

const categories=['魂导器','丹药','毒药','暗器','拘束器'];
const object=(value:any)=>!!value&&typeof value==='object'&&!Array.isArray(value);
const text=(value:any,max:number)=>typeof value==='string'&&!!value.trim()&&value.length<=max;

export function researchDesignCatalogue(state:any,input:any){
 if(!categories.includes(input.category))throw Error('请选择已有的工坊品类');
 const actorId=state.角色?.主控单位ID;if(!state.角色?.已建立||!actorId)throw Error('请先创建人物，再讨论材料研发');
 const catalog=rules.openingWorkshop.catalog(),materials=rules.expedition.personMaterials(state,actorId);
 return {category:input.category,materialLimits:{minimumUnits:1,maximumUnits:10},compositionRules:effectCompositionRules(),templates:catalog.templates.filter((entry:any)=>entry.design.category===input.category),forms:catalog.forms,
  effects:Object.entries(catalog.effects).filter(([,entry]:[string,any])=>entry.authorable!==false).map(([id,entry]:[string,any])=>effectDesignEntry(id,entry)),
  materials:Object.values(materials).map((entry:any)=>({fingerprint:entry.fingerprint,name:materialName(entry,state),quantity:entry.quantity,unitValue:entry.unitValue,attributes:entry.attributeSpectrum,channels:entry.channels})),
  access:rules.expedition.previewWorkshopAccess(state)};
}

export async function requestResearchDesignAdvice(gateway:ModelGateway,state:any,input:any,signal?:AbortSignal,progress?:DesignAdviceProgressStore){
 if(!object(input)||input.ownedOnly!==undefined&&typeof input.ownedOnly!=='boolean'||input.goal!==undefined&&!['purpose','value'].includes(input.goal)||!text(input.description,4000)||!Array.isArray(input.exchanges??[])||(input.exchanges??[]).length>=20||(input.exchanges??[]).some((entry:any)=>!text(entry.input,4000)||!text(entry.reply,2000)))throw Error('请填写作品构想，讨论最多二十轮');
 const catalogue=researchDesignCatalogue(state,input);
 if(input.ownedOnly!==false&&!catalogue.materials.length)return {mode:'question',reply:'当前没有已带回且可用于制作的材料。请先安全带回材料，或关闭“仅用现有可用材料”讨论目标设计。'};
 if(input.ownedOnly!==false&&!catalogue.access.available)return {mode:'question',reply:`当前工坊条件不满足：${catalogue.access.reason}。可关闭材料限制先讨论目标设计，或前往可用工坊。`};
 const context={...designPromptCatalogue(catalogue,gateway.hasPromptOverride?.('creation-item-advisor')??true),workshop:true,paidResearch:true,request:input.description,exchanges:input.exchanges??[],previous:input.previous??null,current:input.confirmedDesign??null,selectedMaterials:input.materials??[],ownedOnly:input.ownedOnly!==false,goal:input.goal??'purpose',
  materialConstraint:input.ownedOnly!==false?'以已持有且数量足够的材料构建可通过制作预览的方案，逐项核对材料桥梁。有缺口时返回 question，列出所需材料及数量。':'按目标设计，列出当前材料与所需材料的差额。',
  valueGoal:input.goal==='value'?'在当前品类、现有材料与合法能力范围中，按候选成品的正式估值优先选取。':'优先满足玩家描述的实际用途。',
  rules:'设计当前品类的一件作品。按现有材料的属性、通道及对应制式登记值填写完整 design.definition。逐项核对玩家指定的载体、制式编号、部位、形态、目标和参数，沿用前一版已经确认的其他机制。缺少所需登记值或材料时，用 question 指出具体缺口并请玩家选择。材料和费用在正式确认研发时结算。',
  responseShape:{mode:'proposal',reply:'作品实际作用、代价与用料的简洁说明',design:{version:1,category:input.category,name:'作品名称',description:'真实作用',appearance:'作品外形',definition:'沿当前品类模板的完整正式definition，可参考templates中的design.definition'}}};
 const read=(value:any)=>{
  if(isUnparsedDesignAdvice(value))throw Error('主持人答复不是完整JSON，请在原设计用途修复原文结构');
  if(!object(value)||Object.keys(value).some(k=>!['mode','reply','design'].includes(k))||!['question','proposal'].includes(value.mode)||!text(value.reply,2000))throw Error('工坊主持人须返回完整的追问或设计');
  if(value.mode==='question'){if(value.design!==undefined)throw Error('追问不能同时修改作品');return value;}
  if(!object(value.design)||value.design.category!==input.category)throw Error('主持人设计必须保留当前作品品类');
  return value;
 };
 const inspect=(value:any)=>{
  const answer=read(value);if(answer.mode==='question')return answer;
  const proposal=inspectPaidDesign(state,{category:input.category,concept:input.description,materials:input.materials??[],ownedOnly:input.ownedOnly!==false,confirmedDesign:answer.design});
  if(input.ownedOnly!==false&&!proposal.pass)return {mode:'question',reply:`当前材料和工坊条件不能制作这份设计：${proposal.reasons.join('；')}。可以调整用途或增加材料后再设计。`};
  return {mode:'proposal',reply:answer.reply,proposal};
 };
 const cached=progress?.read();let initial=cached?.initial;
 if(initial===undefined){
  const messages=creativeMessages('creation-item-advisor',context);
  preflightDesignAdvice(gateway,messages,'creation-item-advisor');
  progress?.reserve?.('initial');
  initial=await gateway.structured(messages,value=>value,{task:'creation-item-advisor',signal,parseStructured:parseDesignAdviceWire,repairFormat:false,repairValidation:false});progress?.write('initial',initial);
 }
 try{return inspect(initial);}
 catch(error){
  const used=gateway.recoveryBudget?.snapshot().used??[];
  const inspectRepair=(value:any)=>{let corrected=false;try{assertResearchRepairPreservesLegal(initial,value);}catch{assertResearchRepairPreservesLegal(initial,value,true);corrected=true;}const result=inspect(value);return corrected?{...result,structuralAlternative:true,originalDesign:structuredClone(designAdviceIntentValue(initial)?.design)}:result;};
  if(cached?.repaired!==undefined)return inspectRepair(cached.repaired);
  if(used.some(entry=>entry.kind==='research-design-repair'))throw error;
  const messages=creativeMessages('creation-item-advisor',{...context,previous:initial,correction:{reason:String((error as Error).message),instruction:'沿用玩家要求、品类、载荷及明确参数，仅修复设计结构。释放或目标违反 requires 时，按同分支正式要求提供默认结构的备选并说明变化。以登记能力、价格和实际材料为依据，列明缺口。'}});
  preflightDesignAdvice(gateway,messages,'creation-item-advisor');
  progress?.reserve?.('repaired');
  const repaired=await gateway.structured(messages,value=>value,{task:'creation-item-advisor',signal,parseStructured:parseDesignAdviceWire,repairFormat:false,repairValidation:false,recoveryKind:'research-design-repair'});
  progress?.write('repaired',repaired);return inspectRepair(repaired);
 }
}
