import type {StoryTurn,StoryStepResult} from './story-turns';
const copy=<T>(v:T):T=>structuredClone(v);
const pick=(v:any,keys:string[])=>Object.fromEntries(keys.filter(k=>v&&Object.hasOwn(v,k)).map(k=>[k,copy(v[k])]));
const COMMON=['type','id','transactionType','summary'];
export const WORKSHOP_RECEIPT_FIELDS:Record<string,readonly string[]>={
 'preset-blueprint-learned':['actorId','presetId','name','itemId','blueprintId','studyHash'],
 'workshop-inspected':['operation','data'],
 'research-materials-consumed':['actorId','pendingId','category','concept','consumedMaterials','totalUnits','totalMaterialValue','mechanicBudget','llmCandidatesRequired','choiceRule','mechanicsHash','namingRequest','choices'],
 'research-blueprint-created':['actorId','recipientId','pendingId','chosenIndex','blueprintId','prototypeItemId','productValue','requiredValue','bridgeClauses','discardedCandidateIndexes'],
 'blueprint-crafted':['actorId','recipientId','blueprintId','itemId','itemIds','itemChanges','quantity','productValueEach','requiredValueEach','bridgeClauses','materialAllocations','materialBatches','consumedValue','surplusValue','remainingValue'],
};
function known(v:any,fields:readonly string[],label:string){const unknown=Object.keys(v).filter(k=>![...COMMON,...fields].includes(k));if(unknown.length)throw Error(`工坊结果缺少字段编译：${label}/${unknown.join(',')}`);}
const product=(b:any)=>b?pick(b,['blueprintId','name','category','description','form','requiredValue','bridgeClauses','presetId','hostDesign','hostQuote','confirmedDesign','designQuote','meaning']):null;
function candidates(q:any){
 known(q,['presetId','pendingId','status','category','concept','materials','totalUnits','totalMaterialValue','chosenIndex','blueprintId','candidates'],'研发候选查询');
 return {...(q.presetId?{presetId:q.presetId}:{}),researchId:q.pendingId,stage:({ 'awaiting-llm':'方案已准备好，正在补全名称和介绍','candidates-ready':'设计已完成，等待选择',completed:'方案已经选定'} as Record<string,string>)[q.status]??q.status,
  category:q.category,concept:q.concept,investedMaterials:copy(q.materials),investedUnits:q.totalUnits,investedCraftValue:q.totalMaterialValue,
  chosenIndex:q.chosenIndex,blueprintId:q.blueprintId,choices:q.candidates.map((c:any)=>({...product(c),index:c.candidateIndex,displayNumber:c.number}))};
}
export function compileWorkshopContext(q:any){
 known(q,['access','currency','pending','blueprints','meaning'],'工坊当前资料');
 return {access:copy(q.access),currency:copy(q.currency),pendingResearch:q.pending.map(candidates),ownedBlueprints:q.blueprints.map(product)};
}

/** Compile queries as conditional information; executed crafting uses its own frozen receipt. */
export function compileWorkshopReceipt(turn:StoryTurn,r:StoryStepResult){
 const c=r.receipt!,a=r.action,fields=WORKSHOP_RECEIPT_FIELDS[c.type];if(!fields)throw Error(`工坊结果缺少编译：${c.type}`);known(c,fields,c.type);
 const materials=(rows:any[])=>rows.map(row=>{const m=[...(r.context?.before.objects??[]),...(r.context?.after.objects??[]),...(turn.before?.materials?.permanent??[]),...(turn.after?.materials?.permanent??[])].find((m:any)=>m.fingerprint===row.fingerprint);return {...copy(row),...pick(m,['name','description'])};});
 const blueprint=[...(turn.after?.workshop?.blueprints??[]),...(turn.before?.workshop?.blueprints??[])].find((b:any)=>b.blueprintId===(c.blueprintId??a.blueprintId??c.data?.blueprintId));
 const research=(turn.after?.workshop?.pending??[]).find((pending:any)=>pending.pendingId===c.pendingId);
 const actorId=c.actorId??turn.after?.player?.id??null;
 const readyChoices=c.choices??(research?.status==='candidates-ready'?research:null);
 if(c.type!=='workshop-inspected'&&(!c.actorId||(['research-blueprint-created','blueprint-crafted'].includes(c.type)&&c.recipientId!==c.actorId)))throw Error('工坊回执缺少实际材料主体和成品收件人');
 if(c.type==='preset-blueprint-learned')return {actorId,stage:`已掌握${c.name}的制作图纸`,name:c.name,presetId:c.presetId,blueprintId:c.blueprintId,sourceItemId:c.itemId,productCreated:false};
 if(c.type==='research-materials-consumed')return {actorId,...(research?.presetId?{presetId:research.presetId}:{}),stage:'研发材料已投入，方案已准备好',researchId:c.pendingId,category:c.category,concept:c.concept,
  consumedMaterials:copy(c.consumedMaterials??null),investedUnits:c.totalUnits,investedCraftValue:c.totalMaterialValue,candidateCount:c.choiceRule?.finalCount??c.llmCandidatesRequired,...pick(research?.candidates?.length===1?research.candidates[0]:null,['confirmedDesign','designQuote']),
  namingResult:readyChoices?candidates(readyChoices):null,remainingStep:readyChoices?'选择一个已形成的候选':'完成候选名称描述后选择方案',mechanicsHash:c.mechanicsHash};
 if(c.type==='research-blueprint-created')return {actorId,stage:'研发方案已选定，图纸与原型已取得',recipientId:c.recipientId,researchId:c.pendingId,chosenIndex:c.chosenIndex,discardedCandidateIndexes:copy(c.discardedCandidateIndexes),
  blueprint:product(blueprint),blueprintId:c.blueprintId,prototypeItemId:c.prototypeItemId,prototypeQuantity:1,productValuation:c.productValue,
  replicationConditions:{requiredCraftValueEach:c.requiredValue,materialRequirements:copy(c.bridgeClauses)}};
 // The actor owns the consumed stock; the receipt does not establish whose
 // hands made the product. Writing facts identify the actual recipient.
 if(c.type==='blueprint-crafted')return {recipientId:c.recipientId,stage:'工坊制作已完成，成品已入库',blueprint:product(blueprint),blueprintId:c.blueprintId,
  receivedItemIds:copy(c.itemIds),quantity:c.quantity,inventoryChanges:(c.itemChanges??[]).map((item:any)=>({...copy(item),receivedQuantity:item.quantityAfter-item.quantityBefore,storageResult:item.quantityBefore>0?'与行囊中的同类物品放在一起':'已放入行囊'})),consumedMaterials:materials(c.materialAllocations),batches:copy(c.materialBatches),
  craftValue:{requiredEach:c.requiredValueEach,actuallyConsumed:c.consumedValue,surplusConsumed:c.surplusValue,selectedMaterialsRemaining:c.remainingValue},productValuationEach:c.productValueEach,materialRequirements:copy(c.bridgeClauses)};
 const q=c.data,operation=c.operation;
 if(operation==='preview-craft'){
  known(q,['blueprintId','quantity','pass','maximumCraftable','placement','requiredValueEach','requiredValueTotal','selectedValue','allocations','batches','remainingMaterials','bridgeClauses','coverage','consumedValue','surplusValue','remainingValue','message'],operation);
  return {actorId,stage:'制作条件查询已完成',operation:'按已有图纸查看制作条件',result:q.pass?'当前条件可以制造指定成品':'当前条件不足',blueprint:product(blueprint),quantity:q.quantity,requiredMaterials:materials(q.allocations),
   reason:q.pass?null:q.message,proposedCraft:{maximumCraftable:q.maximumCraftable,requiredValueEach:q.requiredValueEach,requiredValueTotal:q.requiredValueTotal,selectedCraftValue:q.selectedValue,consumedCraftValue:q.consumedValue,surplusConsumedValue:q.surplusValue,remainingCraftValue:q.remainingValue,
    remainingMaterials:copy(q.remainingMaterials),batches:copy(q.batches),materialRequirements:copy(q.bridgeClauses),requirementCoverage:copy(q.coverage),placement:copy(q.placement)}};
 }
 if(operation==='inspect-research')return {actorId,stage:'研发候选查询已完成',research:candidates(q)};
 if(operation==='inspect-workshop'){
  const {materials,...context}=q;
  return {actorId,stage:'工坊查询已完成',...compileWorkshopContext(context),materials:copy(materials)};
 }
 if(operation==='recommend-research'){
  known(q,['presetId','presetName','materialRequirements','materialSupply','found','materials','message','totalUnits','totalMaterialValue','minimumBudget','productValue','compared','searchScope','alternatives','access','hostQuote','confirmedDesign','designQuote'],operation);
  return {actorId,stage:'研发配料建议查询已完成',access:copy(q.access),found:q.found,reason:q.message,...(q.materialSupply?{materialSupply:copy(q.materialSupply)}:{}),
   proposedResearch:{...(q.presetId?{presetId:q.presetId,name:q.presetName}:{}),...(q.hostQuote?{hostQuote:copy(q.hostQuote)}:{}),...pick(q,['confirmedDesign','designQuote']),materials:materials(q.materials),units:q.totalUnits,craftValue:q.totalMaterialValue,minimumCraftValue:q.minimumBudget,...pick(q,['productValue','compared','searchScope','alternatives']),...(q.materialRequirements?{materialRequirements:copy(q.materialRequirements)}:{})}};
 }
 if(operation==='preview-research'){
  known(q,['presetId','category','goldCost','maximumProductValue','totalUnits','totalMaterialValue','minimumBudget','budgetDeficit','pass','reason','evidence','unlockedEffects','choiceRule','availability','mechanicsHash','plannedEffects','access','materials','materialsRefundable','hostQuote','confirmedDesign','designQuote'],operation);
  return {actorId,stage:'研发条件查询已完成',access:copy(q.access),canBegin:q.pass,reason:q.reason,
   proposedResearch:{...(q.presetId?{presetId:q.presetId}:{}),...(q.hostQuote?{hostQuote:copy(q.hostQuote)}:{}),...pick(q,['confirmedDesign','designQuote']),category:q.category,...pick(q,['goldCost','maximumProductValue']),materials:materials(q.materials),units:q.totalUnits,craftValue:q.totalMaterialValue,minimumCraftValue:q.minimumBudget,deficit:q.budgetDeficit,refundable:q.materialsRefundable,
    possibleEffects:copy(q.plannedEffects),materialSupportedEffects:copy(q.unlockedEffects),materialEvidence:copy(q.evidence),candidateCount:q.choiceRule?.finalCount??null,candidateAvailability:copy(q.availability),mechanicsHash:q.mechanicsHash}};
 }
 throw Error(`工坊查询缺少编译：${operation}`);
}
