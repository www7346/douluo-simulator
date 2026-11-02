import {compileFieldOperation} from './story-field-control-writing-facts';
import {compileBattleLifecycle} from './battle-lifecycle-facts';
import type {StoryTurn,StoryStepResult} from './story-turns';
import type {StoryEventNames} from './story-event-names';
import {compileCommittedEffect} from './committed-effect-facts';
import {committedOutcomeReading} from './committed-effect-reading';
const copy=<T>(v:T):T=>structuredClone(v);
const known=(v:any,fields:string[],label:string)=>{const extra=Object.keys(v).filter(k=>!['type','id','transactionType','summary','requestHash',...fields].includes(k));if(extra.length)throw Error(`契约事实缺少字段编译：${label}/${extra.join(',')}`);};
export const CONTRACT_RECEIPT_TYPES=['person-contract','person-contract-control-failed','control-source-withdrawn'];
export function compileContractPenalty(c:any){
 known(c,['triggerId','actorId','targetId','sourceHash','selection','targets','terminal','death','actionStateBefore','stateChanges','statusLifecycle','fieldLifecycle'],'实际处罚');
 if(c.type!=='contract-penalty')throw Error('处罚须来自原实际执行器');
 return {...compileBattleLifecycle(c),triggerId:c.triggerId,targetId:c.targetId,terminal:c.terminal??null,targets:(c.targets??[]).map((t:any)=>({targetId:t.targetId,effects:(t.effects??[]).map((e:any)=>compileCommittedEffect(e,c.actorId,t.targetId))}))};
}
export function compileContractObservation(c:any){
 if(!c)return null;if(Object.keys(c).some(k=>!['actionRef','penalties'].includes(k))||c.actionRef?.kind!=='person-contract-action'||!Array.isArray(c.penalties))throw Error('契约行为附记须有实际永久来源');
 return {actionId:c.actionRef.id,penalties:c.penalties.map(compileContractPenalty)};
}
/** The retained internal response contains real executor data; only compiled outcomes leave it. */
export function compileContractOrderSettlement(c:any):any{
 const observation=compileContractObservation(c.personContracts),receipt=Object.fromEntries(Object.entries(c).filter(([key])=>key!=='personContracts'));
 if(c.type==='person-contract')return {type:c.type,status:c.status,contractId:c.contractId,orderId:c.orderId??null,punishment:c.punishment?compileContractPenalty(c.punishment):null};
 if(c.type==='combat-action')return {type:c.type,battleId:c.battleId,actionId:c.actionId,actorId:c.actorId,actionType:c.actionType,...compileBattleLifecycle(c),paidCosts:paidCosts(c),targets:(c.targets??[]).map((t:any)=>({targetId:t.targetId,effects:(t.effects??[]).map((e:any)=>compileCommittedEffect(e,t.sourceUnitId??c.actorId,t.targetId))})),...(c.issuedControlOrder?{issuedControlOrder:{id:c.issuedControlOrder.id,actorId:c.issuedControlOrder.actorId,issuerId:c.issuedControlOrder.issuerId,intent:copy(c.issuedControlOrder.intent),status:c.issuedControlOrder.status}}:{}),contractObservation:observation};
 return {type:c.type,...compileFieldOperation({results:[],before:{player:{id:c.actorId}}} as any,{receipt} as any),contractObservation:observation};
}
export function compileContractView(view:any){
 return {id:view.id,kind:view.kind,status:view.status,statusLabel:view.statusLabel,version:view.version,versionHash:view.versionHash,parties:copy(view.parties),forced:view.forced,controllerKnown:view.controllerKnown,knowledge:view.knowledge,terms:copy(view.terms),clauseLabels:copy(view.clauseLabels??[]),durationLabel:view.durationLabel,selectedPenalty:copy(view.selectedPenalty),penaltyLabel:view.penaltyLabel,penaltyDuration:view.penaltyDuration,remainingUses:copy(view.remainingUses),events:(view.events??[]).map((e:any)=>({...copy(e),...(e.penalty?{penalty:{triggerId:e.penalty.triggerId,targetId:e.penalty.targetId,terminal:e.penalty.terminal,targets:(e.penalty.targets??[]).map((t:any)=>({targetId:t.targetId,effects:t.effects.map((effect:any)=>compileCommittedEffect(effect,'contract-source',t.targetId))}))}}:{})}))};
}
export function compileContractReceipt(turn:StoryTurn,result:StoryStepResult){
 const c=result.receipt!;
 if(c.type==='control-source-withdrawn'){known(c,['statusId','actorId','targetId','minutes'],'来源撤回');return {stage:c.summary,actorId:c.actorId,targetId:c.targetId,statusId:c.statusId,minutes:c.minutes};}
 if(c.type==='person-contract-control-failed'){known(c,['actorId','targetId','release'],'强签失败');return {stage:c.summary,actorId:c.actorId,targetId:c.targetId,formed:false,releaseId:c.release?.id,paidCosts:paidCosts(c.release)};}
 known(c,['contractId','contractKind','status','versionHash','version','sourceUnavailable','reason','release','punishment','orderId'],'契约命令');
 const candidates=[...((result.context?.after as any)?.personContracts??[]),...(turn.before?.personContracts??[]),...(turn.after?.personContracts??[])],view=candidates.find((r:any)=>r.id===c.contractId&&r.versionHash===c.versionHash);
 return {stage:c.summary,contractId:c.contractId,kind:c.contractKind,status:c.status,version:c.version,versionHash:c.versionHash,reason:c.reason??'',sourceUnavailable:c.sourceUnavailable,orderId:c.orderId??null,agreement:view?compileContractView(view):null,paidCosts:paidCosts(c.release),punishment:c.punishment?compileContractPenalty(c.punishment):null};
}
function paidCosts(release:any){const p=release?.payment;return p?{operationId:p.operationId,...copy(p.totals),items:p.items.map((i:any)=>({itemId:i.itemId,quantity:i.quantity}))}:null;}
export function contractPenaltyAccount(p:any,n:StoryEventNames){
 if(p.terminal==='target-already-dead')return `${n.person(p.targetId)}已在此前真实结算中死亡，本次记录触发与次数，没有再次施罚。`;
 return p.targets.flatMap((t:any)=>t.effects.flatMap((e:any)=>e.outcomes.map((o:any)=>`${n.person(t.targetId)}：${e.name}，${committedOutcomeReading(o)}。`))).join('');
}
export function contractEventAccount(type:string,f:any,n:StoryEventNames){
 if(type==='control-source-withdrawn')return `${n.person(f.actorId)}撤回了对${n.person(f.targetId)}的一项真实控制来源，用时${f.minutes}分钟。`;
 if(type==='person-contract-control-failed')return `${n.person(f.actorId)}对${n.person(f.targetId)}尝试灵魂控制，未实际形成强签契约。${f.paidCosts?`实际消耗魂力${f.paidCosts.soulPower}。`:''}`;
 const a=f.agreement,parts=[f.stage];if(a){parts.push(`本版约定：${a.clauseLabels.join('；')}。期限${a.durationLabel}。`);if(a.selectedPenalty)parts.push(`约定的违约处罚为${a.penaltyLabel}${a.penaltyDuration?`，持续${a.penaltyDuration}`:''}，每人最多${a.selectedPenalty.perPersonUses}次。这是约定的后果，是否已经处罚只看实际处罚记录。`);}
 if(f.paidCosts)parts.push(`本次誓约真实消耗魂力${f.paidCosts.soulPower}${f.paidCosts.items.length?`，消耗${f.paidCosts.items.map((i:any)=>`${n.item(i.itemId)}×${i.quantity}`).join('、')}`:''}。`);
 if(f.punishment)parts.push(contractPenaltyAccount(f.punishment,n));return parts.join('');
}
