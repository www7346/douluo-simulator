import {compileStatement,compileAddress} from './story-communication-writing-facts';
import {compileCommitment} from './story-social-writing-facts';
import {compileNpcGoal,compileNpcCollaborations,compileRelease} from './story-npc-writing-facts';
import {storyEventTime,type StoryEventNames} from './story-event-names';
import {socialEventAccount} from './story-social-writing-facts';
import {communicationEventAccount} from './story-communication-writing-facts';
const copy=<T>(v:T):T=>structuredClone(v);
const pick=(v:any,keys:string[])=>Object.fromEntries(keys.filter(k=>v&&Object.hasOwn(v,k)).map(k=>[k,copy(v[k])]));
function known(v:any,fields:string[],label:string){const unknown=Object.keys(v).filter(k=>!['type','id','transactionType','summary','meaning',...fields].includes(k));if(unknown.length)throw Error(`人物历史资料缺少字段编译：${label}/${unknown.join(',')}`);}
const hireTerms={chargeBasis:'一次猎魂同行',payment:'签约时全额预付托管，出发后支付雇员',refund:'出发前取消全额退还原雇主'};
function compileBodyParticipation(ref:any,kind:'outing'|'departure'|'arrival'){
 known(ref,['provider','deploymentId','eventId'],'原人物真身同行来源');
 if(ref.provider!=='resident-body'||typeof ref.deploymentId!=='string'||!ref.deploymentId||(kind!=='outing'&&typeof ref.eventId!=='string'))throw Error('原人物真身同行来源无效');
 const meaning={outing:'原人物以真身出画参与本次正式同行，保留原身份和队伍席位',departure:'原人物因真实召回或出画来源结束离开本趟，原同行与财物约定继续留存',arrival:'原人物凭新的实际真身出画回到本趟原有席位'};
 return {...pick(ref,['provider','deploymentId','eventId']),meaning:meaning[kind]};
}
export function compileHireOffer(r:any){
 known(r,['playerId','personId','characterId','dungeonId','locationId','day','baseFee','offeredFee','fee','currency','accepted','status','revision','time','at','order','source','commitmentId'],'雇佣议价');
 if(!['offered','used'].includes(r.status))throw Error('雇佣报价状态缺少编译');
 return {...pick(r,['id','playerId','personId','characterId','dungeonId','revision','time','at','order','source','commitmentId']),stage:r.status==='used'?'此报价已用于雇佣':'已提出报价，尚未成交',
  negotiation:r.source==='personal'?'本人提出本次同行报价':r.accepted?'同意雇主出价':'未接受雇主出价，提出另一价格',playerOfferedGold:r.source==='personal'?null:r.offeredFee,originalFeeGold:r.source==='personal'?null:r.baseFee,quotedGold:r.fee,
  validity:{day:r.day,locationId:r.locationId,status:r.status},terms:copy(hireTerms)};
}
export function compileHireAgreement(r:any){
 known(r,['playerId','personId','characterId','dungeonId','fee','status','events'],'同行合同');
 const stages:Record<string,string>={accepted:'合同成立，尚待出发',active:'已开始本次同行',departed:'已离开本次同行',completed:'本次同行已结束',cancelled:'出发前已取消'};
 if(!stages[r.status])throw Error(`同行合同阶段缺少编译：${r.status}`);
 return {...pick(r,['id','playerId','personId','characterId','dungeonId']),contractFeeGold:r.fee,stage:stages[r.status],terms:copy(hireTerms),
  timeline:r.events.map((e:any)=>{known(e,['status','revision','time','paid','refund','expeditionId','outcome','rescueUsed','battleId','encounterId','position','leftAt','cooperationId','sourceId','battleStatus','settlementId','authorityEventId','order','paymentId','deathId','bodyOutingRef','departureRef','arrivalRef'],'同行合同事件');if(!stages[e.status])throw Error('同行事件阶段缺少编译');
   return {stage:stages[e.status],...pick(e,['revision','time','expeditionId','outcome','rescueUsed','battleId','encounterId','position','leftAt','cooperationId','sourceId','battleStatus','settlementId','authorityEventId','order','paymentId','deathId']),...(e.bodyOutingRef?{bodyOuting:compileBodyParticipation(e.bodyOutingRef,'outing')}:{}),...(e.departureRef?{departure:compileBodyParticipation(e.departureRef,'departure')}:{}),...(e.arrivalRef?{arrival:compileBodyParticipation(e.arrivalRef,'arrival')}:{}),...(Object.hasOwn(e,'paid')?{paidGold:e.paid}:{}),...(Object.hasOwn(e,'refund')?{refundedGold:e.refund}:{})};})};
}
export function compileNpcSupplySettlement(r:any){
 known(r,['sourceId','itemId','from','to','quantity','gold','time'],'补给实际交付');
 return {stage:'物资已交付并收取对方价款',...pick(r,['sourceId','itemId','quantity','time']),itemFromPersonId:r.from,itemToPersonId:r.to,payerId:r.to,payeeId:r.from,paidGold:r.gold};
}
export function compileNpcRequest(r:any){
 known(r,['ownerId','ownerName','goalId','templateId','itemName','quantity','priceGold','deadline','deadlinePassed','knownStatus','events','fallback','settlement'],'可知补给请求');
 const statuses:Record<string,string>={open:'请求已提出，尚未成交',fulfilled:'已交付并收款',declined:'玩家已拒绝',expired:'请求已过期',cancelled:'请求已取消','not-needed':'对方已有所需补给'};
 const causes:Record<string,string>={delivered:'在场获知请求',opened:'请求开始',fulfilled:'完成交付',declined:'拒绝请求',expired:'到期',unavailable:'出行条件失效',unaffordable:'资金不足','already-supplied':'已有所需补给'};
 if(!statuses[r.knownStatus])throw Error('可知补给请求阶段缺少编译');
 return {...pick(r,['id','ownerId','ownerName','goalId','templateId','itemName']),requestedQuantity:r.quantity,offeredGold:r.priceGold,deadline:copy(r.deadline),deadlinePassed:r.deadlinePassed,
  lastObservedStage:statuses[r.knownStatus],fallback:r.fallback==='go-without'?'未获补给仍按个人安排出发':r.fallback==='cancel-trip'?'未获补给则取消本人行程':(()=>{throw Error('补给后续选择缺少编译');})(),
  observedEvents:r.events.map((e:any)=>{known(e,['kind','status','sourceId','time','locationId','knownBy'],'可知补给事件');if(!statuses[e.status]||!causes[e.kind])throw Error('补给事件类型缺少编译');return {...pick(e,['id','sourceId','time','locationId','knownBy']),stage:statuses[e.status],cause:causes[e.kind]};}),
  actualSettlement:r.settlement?compileNpcSupplySettlement(r.settlement):null};
}
export function compileSharedEvent(r:any){
 const fields:Record<string,string[]>={'daily-scene':['source'],travel:['from','to','minutes'], 'npc-supply':['requestId','templateId','quantity','gold'],'custody-response':['releaseId','release','reason']};
 if(!fields[r.kind])throw Error(`共同经历类型缺少编译：${r.kind}`);known(r,['kind','playerId','participants','time','revision',...fields[r.kind]],'共同经历');
 return {...pick(r,['id','kind','playerId','participants','time','revision']),
  ...(r.kind==='daily-scene'?{stage:'双方共同经历的日常片段',summary:r.summary,source:copy(r.source)}:r.kind==='travel'?{stage:'曾实际一起旅行',from:copy(r.from),to:copy(r.to),elapsedMinutes:r.minutes}:r.kind==='npc-supply'?{stage:'曾实际交付补给并收款',requestId:r.requestId,templateId:r.templateId,quantity:r.quantity,receivedGold:r.gold}:{stage:r.release?'看守当时已实际放行':'看守当时拒绝放行',releaseId:r.releaseId,reason:r.reason})};
}
export function compileCityEvent(e:any){
 known(e,['kind','time','sourceId','planId','ownerId','locationId','branchId','observations'],'城市观察');
 const stages:Record<string,string>={'shop-unattended':'掌柜外出，商行暂歇','shop-returned':'掌柜返回，商行可依当前条件营业'};if(!stages[e.kind])throw Error('城市事件类型缺少编译');
 return {...pick(e,['id','sourceId','planId','ownerId','locationId','branchId']),stage:stages[e.kind],occurredAt:copy(e.time),
  observations:e.observations.map((o:any)=>{known(o,['observerId','at','channel','sourceId'],'城市获知来源');if(!['witness','local-notice'].includes(o.channel))throw Error('城市获知渠道缺少编译');return {...pick(o,['observerId','sourceId']),learnedAt:copy(o.at),channel:o.channel==='witness'?'本人在场亲历':'看到当地公开告示'};})};
}
export const HISTORY_CATEGORY_COMPILERS:Record<string,(r:any)=>any>={
 negotiations:compileHireOffer,agreements:compileHireAgreement,'shared-events':compileSharedEvent,commitments:compileCommitment,statements:compileStatement,addresses:compileAddress,
 goals:compileNpcGoal,collaborations:r=>compileNpcCollaborations([r])[0],requests:compileNpcRequest,custody:r=>{
  if(!['background-purchase-history','background-found-history'].includes(r.type))return compileRelease(r);
  known(r,['sourceId','text','at'],'既往购买经历');
  return {stage:r.type==='background-found-history'?'已经发现、带回并唤醒':'已经购买并交付',...pick(r,['sourceId','at']),account:r.text};
 },
};
export const HISTORY_RECEIPT_FIELDS:Record<string,string[]>={
 'person-history':['personId','category','total','records','nextBefore'],'city-history':['locationId','total','nextBefore','events'],
 'hire-quoted':['characterId','personId','playerId','dungeonId','fee','currency','quoteId','kind','available','availabilityReason','revision','terms'],
 'hire-negotiated':['playerId','personId','characterId','dungeonId','locationId','day','baseFee','offeredFee','fee','currency','accepted','status','at','order','revision','time','source','commitmentId'],
 'companion-hired':['actorId','characterId','personId','fee','dungeonId','dungeonName','agreement','payment','hirePayment'],'companion-dismissed':['actorId','personId','refund','agreement','payment','hirePayment'],
 'npc-request-declined':['requestId','personId','fallback'],'npc-request-fulfilled':['requestId','personId','settlement'],
};
export function compileHistoryReceipt(c:any){
 const fields=HISTORY_RECEIPT_FIELDS[c.type];if(!fields)throw Error(`历史回执缺少编译：${c.type}`);known(c,fields,c.type);
 if(c.type==='person-history'){const compile=HISTORY_CATEGORY_COMPILERS[c.category];if(!compile)throw Error(`人物历史分类缺少编译：${c.category}`);return {stage:'读取双方此前留存的交往记录',personId:c.personId,category:c.category,totalRetained:c.total,nextBefore:c.nextBefore,records:c.records.map((r:any)=>({index:r.index,record:compile(r.record)}))};}
 if(c.type==='city-history')return {stage:'读取本人已经获知的城市事件',locationId:c.locationId,totalKnown:c.total,nextBefore:c.nextBefore,events:c.events.map(compileCityEvent)};
 if(c.type==='hire-negotiated')return compileHireOffer(c);
 if(c.type==='hire-quoted')return {stage:'本次查询取得同行报价',...pick(c,['characterId','personId','playerId','dungeonId','quoteId','revision']),quotedGold:c.fee,
  service:c.kind==='first-hunt-guide'?'首次免费护航':c.kind==='paid-hire'?'付费同行':(()=>{throw Error('雇佣查询种类缺少编译');})(),currentAvailability:{available:c.available,reason:c.availabilityReason},terms:c.kind==='paid-hire'?copy(hireTerms):{chargeBasis:'本次首次猎魂免费同行'}};
 if(c.type==='npc-request-declined')return {stage:'玩家已拒绝补给请求',requestId:c.requestId,personId:c.personId,personalNextPlan:c.fallback==='go-without'?'对方保留独自出行安排':'对方已取消自己的行程'};
 if(c.type==='npc-request-fulfilled')return {requestId:c.requestId,personId:c.personId,...compileNpcSupplySettlement(c.settlement)};
 if(c.payment)known(c.payment,['playerId','before','after'],'实际雇佣款项');
 return {stage:c.type==='companion-hired'?'已签约并全额预付托管，尚待出发':'已取消出发前雇佣并退还原雇主',...pick(c,['actorId','personId','characterId','dungeonId','dungeonName']),
  ...(c.type==='companion-hired'?{paidGold:c.fee}:{refundedGold:c.refund}),playerWallet:copy(c.payment??null),hirePayment:c.hirePayment?compileHirePayment(c.hirePayment):null,agreement:c.agreement?compileHireAgreement(c.agreement):null};
}
export function compileHirePayment(p:any){
 known(p,['sourceId','agreementId','kind','payerId','payeeId','amount','fromWalletId','toWalletId','toRemainsId','fromBefore','fromAfter','toBefore','toAfter','at','order','deathTrigger','contract'],'雇佣实际付款');
 const stages:Record<string,string>={deposit:'雇主预付款进入托管',release:'预付款已实际支付雇员',refund:'预付款已退还原雇主财产'};if(!stages[p.kind])throw Error('雇佣款项阶段缺少编译');
 return {stage:stages[p.kind],...pick(p,['id','sourceId','agreementId','payerId','payeeId','amount','fromWalletId','toWalletId','toRemainsId','fromBefore','fromAfter','toBefore','toAfter','at','order','deathTrigger'])};
}

function historyRecordAccount(category:string,r:any,n:StoryEventNames):string{
 if(category==='commitments')return socialEventAccount('history',{agreement:r},n);
 if(category==='statements'||category==='addresses')return communicationEventAccount(category==='statements'?'person-heard-statement':'person-addressed',r,n);
 if(category==='negotiations')return `${r.negotiation}，报价${r.quotedGold}金币；${r.stage}。`;
 if(category==='agreements')return `${n.person(r.personId)}的同行合同：${r.stage}，合同费用${r.contractFeeGold}金币。`;
 if(category==='shared-events')return r.kind==='travel'?`曾一起从${n.location(r.from?.id??r.from)}旅行至${n.location(r.to?.id??r.to)}，实际${r.elapsedMinutes}分钟。`:r.kind==='npc-supply'?`此前交付补给${r.quantity}份，收到${r.receivedGold}金币。`:`${r.stage}；当时理由：${r.reason}。`;
 if(category==='goals')return `${storyEventTime(r.createdAt)}，${n.person(r.ownerId)}${r.decision}；当时理由：${r.motive}。`;
 if(category==='collaborations')return `${n.person(r.initiatorId)}与${n.person(r.personId)}的合作：${r.lastObservedStage}，地点${n.location(r.locationId)}。`;
 if(category==='requests')return `${n.person(r.ownerId)}请求${r.itemName}×${r.requestedQuantity}，出价${r.offeredGold}金币；已知阶段${r.lastObservedStage}。`;
 if(category==='custody')return r.account??`${r.stage}；本人理由：${r.reason}。`;
 throw Error(`人物历史经过缺少编译：${category}`);
}
export function historyEventAccount(type:string,f:any,n:StoryEventNames):string{
 const person=n.person(f.personId);
 if(type==='person-history')return `已读取与${person}的已有交往，本次显示${f.records.length}条、共${f.totalRetained}条。\n`+f.records.map((r:any)=>historyRecordAccount(f.category,r.record,n)).join('\n');
 if(type==='city-history')return `已查看${n.location(f.locationId)}的已知城市事件，本次显示${f.events.length}条、共获知${f.totalKnown}条。\n`+f.events.map((e:any)=>`${storyEventTime(e.occurredAt)}，${n.person(e.ownerId)}：${e.stage}。`).join('\n');
 if(type==='hire-quoted')return `${person}的${f.service}报价为${f.quotedGold}金币；${f.currentAvailability.available?'当前可雇佣':`当前不能雇佣：${f.currentAvailability.reason}`}。本次为询价，可以按此报价雇佣。`;
 if(type==='hire-negotiated')return f.source==='personal'?`${person}本人提出本次同行报价${f.quotedGold}金币；${f.stage}。`:`${person}${f.negotiation}：雇主出价${f.playerOfferedGold}金币，对方报价${f.quotedGold}金币；${f.stage}。`;
 if(type==='companion-hired')return `已经雇佣${person}${f.dungeonName?`同行前往${f.dungeonName}`:''}，预付${f.paidGold}金币，等待出发。`;
 if(type==='companion-dismissed')return `已经取消${person}出发前的雇佣，实际退款${f.refundedGold}金币。`;
 if(type==='npc-request-declined')return `玩家已经拒绝${person}的补给请求；${f.personalNextPlan}。`;
 return `${n.person(f.itemFromPersonId)}已向${n.person(f.itemToPersonId)}实际交付${n.item(f.itemId)}×${f.quantity}，由${n.person(f.payerId)}向${n.person(f.payeeId)}支付${f.paidGold}金币。`;
}
