import {compileFieldOperation} from './story-field-control-writing-facts';
import {compileCommitment} from './story-social-writing-facts';
import {compileAddress} from './story-communication-writing-facts';
const copy=<T>(v:T):T=>structuredClone(v);
const pick=(v:any,keys:string[])=>Object.fromEntries(keys.filter(k=>v&&Object.hasOwn(v,k)).map(k=>[k,copy(v[k])]));
function known(v:any,fields:string[],label:string){const unknown=Object.keys(v).filter(k=>!['type','id','transactionType','summary','meaning',...fields].includes(k));if(unknown.length)throw Error(`人物自主结果缺少字段编译：${label}/${unknown.join(',')}`);}
export function compileNpcGoal(g:any){
 known(g,['ownerId','kind','membershipId','motive','createdAt','destinationId','arriveAt','branchId','turn','requestId','decisionSourceId','requestIdRef','reconsiderAfter','reconsiderWindowOpen','invitationId','invitation','dungeonId','difficultyId','purchase','dutyPermission','abilityUse'],'人物目标');
 const choices:Record<string,string>={ability:'本人已按原能力实际施放或发出本次施用请求；抵抗、消耗与变化以下方实际结果为准','permit-custody-duty':'本人同意一次职责许可；未自动上岗、出发、领取工资或入队，实际安排以职责记录为准','tell-custody-news':'已实际向所选听者转告本人获知的事件；原事件只证明其发生时的位置和状态',research:'已投入本人的材料开始研发；后续命名和选定以本人实际结果为准',craft:'已用本人的材料按本人掌握图纸制造成品',purchase:'已用本人的钱币在实际店铺购得物资',expedition:'说明了本人前往入口探索的计划；这条原决定不代表已经出发或取得收获',idle:'选择维持日常',visit:'决定按自己的计划到访','supply-trip':'决定准备补给并出行','leave-party':'已按本人意愿结束同行'};
 if(!choices[g.kind])throw Error(`人物目标类型缺少编译：${g.kind}`);
 return {...pick(g,['id','ownerId','kind','motive','createdAt','branchId','turn','requestId','decisionSourceId']),decision:choices[g.kind],
  ...(g.kind==='ability'?{actualAbility:{skillName:g.abilityUse.skillName,...compileFieldOperation({} as any,{receipt:g.abilityUse.receipt} as any)}}:{}),
  ...(g.kind==='permit-custody-duty'?{actualDutyPermission:copy(g.dutyPermission)}:{}),
  ...(g.kind==='expedition'?{plannedExpedition:{dungeonId:g.dungeonId,difficultyId:g.difficultyId,entranceLocationId:g.destinationId,arriveAt:copy(g.arriveAt)}}:{}),
  ...(g.kind==='leave-party'?{endedMembershipId:g.membershipId}:{}),
  ...(g.kind==='purchase'?{actualPurchase:copy(g.purchase)}:{}),
  ...(['visit','supply-trip'].includes(g.kind)?{plannedVisit:{destinationId:g.destinationId,arriveAt:copy(g.arriveAt)},supplyRequestId:g.requestIdRef??null}:{}),
  playerInvitation:{issued:Boolean(g.invitation),stage:g.invitation?'已发出，履行以约定记录为准':'未发出'},
  invitation:g.invitation?compileCommitment(g.invitation):null,reconsiderAfterWorldMinute:g.reconsiderAfter,reconsiderWindowOpen:g.reconsiderWindowOpen};
}
export function compileNpcCollaborations(rows:any[]){return rows.map(r=>{
 known(r,['goalId','initiatorId','personId','locationId','startsAt','endsAt','motive','branchId','knownStatus','events'],'人物合作');
 const stages:Record<string,string>={pending:'合作提议待回应',accepted:'已接受，尚待双方到场',rejected:'合作已拒绝',completed:'双方已经实际会合',missed:'未按时会合',blocked:'合作安排受阻'};
 const events=r.events.map((e:any)=>{known(e,['status','sourceId','time','locationId','knownBy','reason'],'可知合作事件');if(!stages[e.status])throw Error(`合作阶段缺少编译：${e.status}`);return {...pick(e,['sourceId','time','locationId','knownBy','reason']),stage:stages[e.status]};});
 return {...pick(r,['id','goalId','initiatorId','personId','locationId','startsAt','motive','branchId']),windowEndsAtWorldMinute:r.endsAt,lastObservedStage:stages[r.knownStatus],observedEvents:events};
});}
/** Only already-filtered, personally observed plan events can describe executed travel. */
export function compileNpcPlans(rows:any[]){return rows.map(plan=>{
 known(plan,['ownerId','sourceId','goal','motive','agreementStatus','plannedArrival','destinationId','events'],'可知人物行程');
 const stages:Record<string,string>={departed:'已出发并支付本段旅费',arrived:'实际抵达路段终点',waiting:'已到访目的地',succeeded:'本次行程已经结束',missed:'会面窗口已经错过',cancelled:'原安排已取消',blocked:'行程受阻'};
 const agreement:Record<string,string>={pending:'原提议待回应',accepted:'原约定已接受，尚待履行',completed:'原约定已履行',rejected:'原提议已拒绝',expired:'原约定已过期',cancelled:'原约定已撤回',ended:'原关系或同行已结束'};
 if(plan.agreementStatus!==undefined&&!agreement[plan.agreementStatus])throw Error('可知人物行程缺少原约定阶段编译');
 const observedEvents=plan.events.map((event:any)=>{
  known(event,['kind','time','sourceId','knownBy','reason','locationId','from','to','routeId','paidGold','custodySourceId'],'亲历行程事件');
  if(!stages[event.kind])throw Error(`亲历行程事件缺少编译：${event.kind}`);
  return {eventId:event.id,kind:event.kind,stage:stages[event.kind],at:copy(event.time),...pick(event,['sourceId','knownBy','reason','locationId','routeId','custodySourceId']),
   ...(event.kind==='departed'?{intendedNextLocationId:event.to,paidGold:event.paidGold}:{}),...(event.kind==='arrived'?{previousLocationId:event.from}:{})};
 });
 return {planId:plan.id,ownerId:plan.ownerId,sourceId:plan.sourceId,
  intention:{goal:plan.goal,motive:plan.motive,destinationId:plan.destinationId,plannedArrival:copy(plan.plannedArrival)},
  sourceAgreementStage:plan.agreementStatus===undefined?null:agreement[plan.agreementStatus],observedEvents};
});}
export function compileRelease(r:any){
 known(r,['requestId','captivityId','captorId','playerId','requestText','source','decisionSourceId','release','reason','time','custodyAuthority','decisionOrder'],'放行决定');
 return {stage:r.release?'看守已解除本次关押并拆下可操作的拘束器，其他来源限制按实际状态保留':'看守拒绝放行，拘押限制仍在',...pick(r,['id','requestId','captivityId','captorId','playerId','requestText','source','decisionSourceId','reason','time']),released:r.release};
}
export const NPC_RECEIPT_FIELDS:Record<string,string[]>={
 'npc-goal-requested':['requestId','personId','goal','commitment','releaseDecision','collaborations','partnerDecisions','address'],
 'npc-goal-existing':['personId','goal','address'],'npc-goal-decided':['personId','goal'],
 'custody-response':['releaseDecision'],'npc-partner-decided':['personId','decision'],
};
function partnerDecision(d:any){
 known(d,['partnerId','motive','accept'],'合作决定');
 return {reason:d.motive,...(Object.hasOwn(d,'partnerId')?{partnerId:d.partnerId,decision:d.partnerId?'向此人提议合作':'决定按个人安排继续'}:{accepted:d.accept,decision:d.accept?'本人接受合作':'本人拒绝合作'})};
}
export function compileNpcReceipt(c:any){
 const fields=NPC_RECEIPT_FIELDS[c.type];if(!fields)throw Error(`人物自主回执缺少编译：${c.type}`);known(c,fields,c.type);
 const actorId=c.personId??c.goal?.ownerId??c.releaseDecision?.captorId??null;
 if(c.releaseDecision)return {actorId,...compileRelease(c.releaseDecision)};
 const partnerDecisions=(c.partnerDecisions??[]).map((r:any)=>{
  known(r,['personId','requestId','sourceId','observerId','locationId','time','decision'],'合作决定来源');
  return {...pick(r,['personId','requestId','sourceId','observerId','locationId','time']),...partnerDecision(r.decision)};
 });
 if(c.type==='npc-partner-decided')return {actorId,stage:'人物已作出合作决定',...partnerDecision(c.decision)};
 return {actorId,stage:c.type==='npc-goal-existing'?'本次沿用已记录的安排':c.goal?'人物已作出自己的安排':partnerDecisions.length?'人物已作出另行安排或合作回应':'已提出请求，尚无已记录的决定',
  requestId:c.requestId??null,goal:c.goal?compileNpcGoal(c.goal):null,
  ...(c.address?{deliveredContact:compileAddress(c.address)}:{}),
  ...(c.commitment?{answeredInvitation:compileCommitment(c.commitment)}:{}),
  partnerDecisions,knownCollaborations:compileNpcCollaborations(c.collaborations??[])};
}
