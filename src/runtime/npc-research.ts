import {rules} from '../rules';
const e=rules.expedition,hash=rules.abilities.hash;
const recipeId=(category:string,materials:any[])=>hash({category,materials});
export function validateNpcWorkshopDecision(value:any){
 if(!value||typeof value!=='object'||Array.isArray(value)||!['research','craft'].includes(value.kind))throw Error('人物工坊决定类型无效');
 const fields=value.kind==='research'?['kind','motive','optionId','concept','hostDesign']:['kind','motive','blueprintId','quantity'];
 if(Object.keys(value).some(k=>!fields.includes(k))||typeof value.motive!=='string'||!value.motive.trim()||value.motive.length>400)throw Error('人物工坊决定只接受本人理由及已开放条款');
 if(value.kind==='research'&&(typeof value.optionId!=='string'||!value.optionId||typeof value.concept!=='string'||value.concept.trim().length<4||value.concept.length>400))throw Error('研究须引用本人实际配料方案，并说明4至400字构想');
 if(value.kind==='research'&&value.hostDesign!==undefined){const d=value.hostDesign;if(!d||typeof d!=='object'||Array.isArray(d)||d.version!==1||typeof d.carrierTemplateId!=='string'||!d.definition||typeof d.definition!=='object'||Array.isArray(d.definition)||Object.keys(d).some(k=>!['version','carrierTemplateId','definition'].includes(k)))throw Error('人物宿主研发须提交完整载体与固定设计');}
 if(value.kind==='craft'&&(typeof value.blueprintId!=='string'||!value.blueprintId||!Number.isSafeInteger(value.quantity)||value.quantity<1||value.quantity>999))throw Error('制造须引用本人图纸与1至999整数数量');
 return structuredClone(value);
}
export function npcWorkshopOptions(state:any,actorId:string){
 const empty={researchOptions:[] as any[],craftOptions:[] as any[]};
 if(actorId===state.角色.主控单位ID||!state.人物?.列表?.[actorId])return empty;
 const pending=(Object.values(state.研发?.待处理??{}) as any[]).some(p=>p.actorId===actorId&&['awaiting-llm','candidates-ready'].includes(p.status));
 const hasMaterials = Object.values(e.personMaterials(state, actorId)).some((stack: any) => stack.quantity > 0);
 const blueprints=([...Object.values(state.研发?.蓝图??{}),...rules.deviceKeyManufacturing.blueprints(state,actorId)] as any[]).filter(b=>b.ownerId===actorId);
 if((pending||!hasMaterials)&&!blueprints.length)return empty;
 if(!e.previewWorkshopAccess(state,{actorId}).available)return empty;
 if(!pending && hasMaterials)for(const category of e.PRODUCT_CATEGORIES){
  try{
   const found=e.recommendResearchMaterials(state,{category},{actorId});if(!found.found)continue;
   const concept='依照现有材料制作适合本人使用的成品';
   const quote=e.previewResearch(state,{category,concept,materials:found.materials},{actorId});if(!quote.pass)continue;
   empty.researchOptions.push({optionId:recipeId(category,found.materials),category,materials:structuredClone(found.materials),totalUnits:quote.totalUnits,totalMaterialValue:quote.totalMaterialValue,choiceRule:quote.choiceRule,plannedEffects:quote.plannedEffects,consumption:'选择研发将立即实际消耗所列材料，不退还；命名后由本人另行选定一个原型。'});
  }catch{/* This category has no current legal offer; do not fabricate a recipe. */}
 }
 for(const b of blueprints){
  try{const q=e.previewBlueprintCraft(state,b.id,{quantity:1,includeMaximum:false},{actorId});if(q.pass)empty.craftOptions.push({blueprintId:b.id,name:b.name,category:b.category??'工具',quantity:1,requiredValueEach:q.requiredValueEach,allocations:q.allocations});}catch{}
 }
 return empty;
}
/** Called inside applyNpcDecision while its exact original job is still pending. */
export function applyNpcWorkshopDecision(state:any,job:any,choice:any,sourceId:string){
 choice=validateNpcWorkshopDecision(choice);
 const actual=(state.世界?.npcDecisions??[]).find((r:any)=>r.id===job.id);
 if(!actual||actual.status!=='pending'||actual.ownerId!==job.ownerId||actual.branchId!==job.branchId||actual.turn!==job.turn||job.ownerId===state.角色.主控单位ID)throw Error('研发须来自该人物原独立决定');
 const options=npcWorkshopOptions(state,job.ownerId);
 const decisionOrigin={kind:'npc-workshop-goal',requestId:job.id,branchId:job.branchId,turn:job.turn,sourceId,decision:structuredClone(choice)};
 if(choice.kind==='research'){
  const option=options.researchOptions.find(o=>o.optionId===choice.optionId);if(!option)throw Error('研发配料不在本人当前可执行方案中');
  const request={category:option.category,concept:choice.concept,materials:option.materials,confirmed:true,...(choice.hostDesign?{hostDesign:choice.hostDesign}:{})};
  const quote=e.previewResearch(state,request,{actorId:job.ownerId});if(!quote.pass)throw Error(quote.reason);
  const transactionId=`npc-research:${sourceId}`;
  const result=e.beginResearch(state,{...request,expectedMechanicsHash:quote.mechanicsHash},transactionId,{actorId:job.ownerId,decisionOrigin});
  return {...result,goalFields:{researchTransactionId:transactionId,pendingId:result.receipt.pendingId}};
 }
 if(choice.kind==='craft'){
  if(!options.craftOptions.some(o=>o.blueprintId===choice.blueprintId))throw Error('没有本人当前可制造的图纸');
  const transactionId=`npc-craft:${sourceId}`;
  const result=e.craftBlueprint(state,choice.blueprintId,{quantity:choice.quantity,includeMaximum:false},transactionId,{actorId:job.ownerId,decisionOrigin});
  return {...result,goalFields:{craftTransactionId:transactionId,blueprintId:choice.blueprintId}};
 }
 throw Error('不是人物研发或制造决定');
}

/** Cross-links independent job -> goal -> permanent real operation, in both directions. */
export function validateNpcWorkshopGoals(state:any){
 const goals=state.世界?.npcGoals??[],jobs=state.世界?.npcDecisions??[],sources=state.远征?.commandRequests??{},receipts=state.远征?.processedTransactions??{};
 const seen=new Set<string>();
 for(const g of goals.filter((g:any)=>['research','craft'].includes(g.kind))){
  const job=jobs.find((j:any)=>j.id===g.requestId),tx=g.kind==='research'?g.researchTransactionId:g.craftTransactionId,q=sources[tx]?.request,r=receipts[tx],o=q?.decisionOrigin,d=job?.decision;
  if(seen.has(tx)||g.ownerId===state.角色.主控单位ID||g.status!=='completed'||job?.status!=='decided'||job.goalId!==g.id||job.ownerId!==g.ownerId||job.branchId!==g.branchId||job.turn!==g.turn||job.decisionSourceId!==g.decisionSourceId||tx!==`${g.kind==='research'?'npc-research':'npc-craft'}:${g.decisionSourceId}`||o?.kind!=='npc-workshop-goal'||o.requestId!==g.requestId||o.sourceId!==g.decisionSourceId||o.branchId!==g.branchId||o.turn!==g.turn||hash(o.decision)!==hash(d)||d?.kind!==g.kind||d.motive!==g.motive||q.actorId!==g.ownerId||r?.actorId!==g.ownerId)throw Error('人物工坊目标缺少原独立决定或实际永久结算');
  seen.add(tx);
  if(g.kind==='research'){
   if(r.type!=='research-materials-consumed'||r.pendingId!==g.pendingId||state.研发?.待处理?.[g.pendingId]?.actorId!==g.ownerId||q.request?.confirmed!==true||q.request.concept!==d.concept||hash(q.request.hostDesign??null)!==hash(d.hostDesign??null)||recipeId(q.request.category,q.request.materials)!==d.optionId)throw Error('人物研究目标与真实投入不一致');
  }else if(r.type!=='blueprint-crafted'||q.blueprintId!==d.blueprintId||g.blueprintId!==d.blueprintId||q.request?.quantity!==d.quantity||r.quantity!==d.quantity)throw Error('人物制造目标与实际图纸、数量不一致');
 }
 for(const [id,source] of Object.entries(sources) as [string,any][]){
  if(source.request?.decisionOrigin?.kind==='npc-workshop-goal'||id.startsWith('npc-research:')||id.startsWith('npc-craft:'))if(!seen.has(id))throw Error('永久人物工坊行动缺少唯一原目标');
 }
}
