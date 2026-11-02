import {rules} from '../rules';
/** Quotes use the person's actual scene, purse and pack; querying never creates stock or people. */
export const npcPurchaseOptions = rules.expedition.npcPurchaseOptions;
export function validateNpcPurchases(state:any){
 const goals=state.世界?.npcGoals??[],jobs=state.世界?.npcDecisions??[],receipts=state.远征?.processedTransactions??{},requests=state.远征?.commandRequests??{};
 for(const g of goals.filter((g:any)=>g.kind==='purchase')){
  const job=jobs.find((j:any)=>j.id===g.requestId),r=receipts[g.purchaseTransactionId],o=requests[g.purchaseTransactionId]?.request?.decisionOrigin;
  if(g.status!=='completed'||job?.status!=='decided'||job.goalId!==g.id||g.purchaseTransactionId!==`npc-purchase:${g.decisionSourceId}`||r?.type!=='supply-bought'||r.buyerId!==g.ownerId||o?.sourceId!==g.decisionSourceId||o.requestId!==g.requestId||o.branchId!==g.branchId||o.turn!==g.turn||job?.decisionSourceId!==g.decisionSourceId||rules.abilities.hash(o.decision)!==rules.abilities.hash(job.decision)||job.decision.motive!==g.motive||job.decision.templateId!==r.templateId||job.decision.quantity!==r.quantity)throw Error('人物采购目标缺少原独立决定或真实交付');
 }
 for(const [id,source] of Object.entries(requests) as [string,any][]){
  if(!(source.request?.decisionOrigin&&(source.type==='补给铺购买'||receipts[id]?.type==='supply-bought'))&&!id.startsWith('npc-purchase:'))continue;
  if(goals.filter((g:any)=>g.kind==='purchase'&&g.purchaseTransactionId===id).length!==1)throw Error('永久人物采购缺少唯一原目标');
 }
}
