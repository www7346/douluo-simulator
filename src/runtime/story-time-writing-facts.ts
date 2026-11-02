import {compileWorldEffectSettlements,worldEffectAccount,WORLD_EFFECT_RECEIPT_FIELDS} from './world-effect-writing';
import type {StoryTurn} from './story-turns';
import {storyEventTime,type StoryEventNames} from './story-event-names';
const copy=<T>(v:T):T=>structuredClone(v);
const pick=(v:any,keys:string[])=>Object.fromEntries(keys.filter(k=>v&&Object.hasOwn(v,k)).map(k=>[k,copy(v[k])]));
const timed=[...WORLD_EFFECT_RECEIPT_FIELDS,'before','after','minutes','longActionId','interrupted','remainingMinutes','interruption'];
export const TIME_RECEIPT_FIELDS:Record<string,readonly string[]>={
 'world-waited':[...timed,'dutySettlements','abilitySettlements'],'world-cultivated':[...timed,'progress'],
 'travel-completed':[...timed,'actorId','from','to','current','destinationId','mode','completed','path','legs','costGold','castIds','companionIds','remainingGold','position','transit'],
 'long-action-abandoned':['longActionId','kind','ownerId','cancelledAt','minutesExecuted','remainingMinutes','paidGold','locationId','position','transit'],
 'captivity-escape':['sourceId','actorId','captivityId','guarded','guardId','statusId','before','after','check','result','escaped','interruption'],
 'world-event-completed':['eventId','locationId','speaker','name','grantedFlags','discoveredLocationIds'],
};
function known(v:any,fields:readonly string[],label:string){const unknown=Object.keys(v).filter(k=>!['id','type','transactionType','summary',...fields].includes(k));if(unknown.length)throw Error(`时间世界结果缺少字段编译：${label}/${unknown.join(',')}`);}
const kindNames:Record<string,string>={wait:'等待',travel:'旅行',cultivation:'修炼'};
function interruption(v:any){
 if(!v)return null;
 const names:Record<string,string>={meeting:'已接受约见需要处理','npc-request':'实际收到人物请求','growth-boundary':'达到成长阶段上限','life-exhausted':'寿命耗尽','person-death':'行动参与者死亡','action-blocked':'实际行动条件失效','battle-started':'现场营救战斗开始','cooperation-ended':'同行许可或原控制来源失效','field-control-ended':'本次移动命令的原控制来源失效','foreground-battle':'当前战斗需要本人决定，旅行已暂停'};
 if(!names[v.kind])throw Error(`长行动打断缺少编译：${v.kind}`);
 known(v,['orderId','cooperationId','authorityEventId','battleId','actionId','rescueId','kind','at','sourceId','messageId','personId','locationId','receivedAt','reason','startsAt','scheduledAt','time','decisionSourceId','statusId','requirement','proof','desireEventRef','order','controlEpisodeId'],'长行动打断');
 return {kind:names[v.kind],...pick(v,['cooperationId','authorityEventId','battleId','actionId','rescueId','id','sourceId','messageId','personId','locationId','reason','startsAt','time','decisionSourceId','statusId','requirement','desireEventRef']),atWorldMinute:v.at,receivedAtWorldMinute:v.receivedAt??null,scheduledAtWorldMinute:v.scheduledAt??null};
}
const minute=(t:any)=>t.day*1440+t.hour*60+t.minute;
export function compileLongActionContext(rows:any[]){return rows.map(a=>{
 known(a,['kind','status','startedAt','targetAt','progressedTo','minutesExecuted','remainingMinutes','paidGold','interruptions','experienceGained','cultivationMeaning','destinationId','destinationName','mode','lastLocationId','remainingGold','estimateFrom','canResume','meaning','resumeReason','position','transit'],'长行动当前进度');
 if(!kindNames[a.kind])throw Error(`长行动类型缺少编译：${a.kind}`);
 return {actionId:a.id,activity:kindNames[a.kind],stage:({interrupted:'已暂停',completed:'已完成',cancelled:'已放弃剩余部分'} as Record<string,string>)[a.status],
  ...pick(a,['startedAt','targetAt','progressedTo','minutesExecuted','remainingMinutes','paidGold','experienceGained','destinationId','destinationName','mode','lastLocationId','remainingGold','estimateFrom','canResume','resumeReason','position','transit']),interruptions:a.interruptions.map(interruption)};
});}

export function compileTimeReceipt(turn:StoryTurn,c:any){
 const fields=TIME_RECEIPT_FIELDS[c.type];if(!fields)throw Error(`时间世界结果缺少编译：${c.type}`);known(c,fields,c.type);
 const actorId=c.actorId??c.ownerId??c.progress?.unitId??c.check?.actorId??turn.after?.player?.id??null;
 if(c.type==='world-event-completed')return {actorId,stage:'地点见闻已经历',eventId:c.eventId,locationId:c.locationId,name:c.name,speaker:c.speaker,
  actualAccount:c.summary,worldFlagsAdded:copy(c.grantedFlags??null),discoveredLocationIds:copy(c.discoveredLocationIds??null)};
 if(c.type==='long-action-abandoned')return {actorId,stage:'剩余长行动已放弃',actionId:c.longActionId,activity:kindNames[c.kind]??null,
  cancelledAt:copy(c.cancelledAt??null),minutesAlreadyExecuted:c.minutesExecuted??null,remainingMinutesAtCancellation:c.remainingMinutes??null,alreadyPaidGold:c.paidGold??null,locationId:c.locationId??null,position:copy(c.position??null),transit:copy(c.transit??null)};
 const time={before:copy(c.before),after:copy(c.after),elapsedMinutes:minute(c.after)-minute(c.before)};
 if(c.type==='captivity-escape'){
  const stages:Record<string,string>={'door-broken':'牢门已破坏，身体限制与关押仍保留','attempt-failed':'脱困尝试失败，实际限制保留',interrupted:'尝试被实际状态变化打断','source-ended':'原关押或束缚来源已变化','restraint-layer-broken':'所选拘束已解除一层，剩余层数与关押仍保留','restraint-broken':'所选束缚已解除，仍被囚禁',escaped:'已脱离本次关押，其他封印按实际来源保留'};
  if(!stages[c.result]||c.escaped!==(c.result==='escaped'))throw Error('脱困结果与实际关押状态不一致');
  known(c.check,['attribute','difficulty','modifier','die','total','passed'],'脱困检定');
  return {actorId,stage:stages[c.result],captivityId:c.captivityId,guardPresentAtAttempt:c.guarded,guardId:c.guardId,statusId:c.statusId,escaped:c.escaped,time,
   check:{...copy(c.check),outcome:c.check.die===null?'无需掷骰':c.check.passed?'通过':'未通过'},interruption:copy(c.interruption??null)};
 }
 if(time.elapsedMinutes!==c.minutes)throw Error('长行动回执的实际用时与时间不一致');
 const common={...compileWorldEffectSettlements(c),actorId,time,actionId:c.longActionId??null,stage:c.interrupted?'行动已暂停':'行动已完成',remainingMinutes:c.remainingMinutes??null,interruption:interruption(c.interruption)};
 if(c.type==='world-waited'){
  const duties=(c.dutySettlements??[]).map((r:any)=>{
   known(r,['eventId','dutyId','facilityId','facilityName','personId','personName','at','status','reason'],'看守安排');
   if(!Number.isSafeInteger(r.at)||r.at<minute(c.before)||r.at>minute(c.after)||r.status!=='ended')throw Error('看守结束时间与实际等待时间不符');
   return {...pick(r,['eventId','dutyId','facilityId','facilityName','personId','personName','reason']),settledAt:{day:Math.floor(r.at/1440),hour:Math.floor(r.at%1440/60),minute:r.at%60},stage:'值守已结束'};
  });
  const abilities=(c.abilitySettlements??[]).map((r:any)=>{
   known(r,['eventId','sourceId','actorId','skillId','skillName','at','event','reason','failure','totals','items'],'能力实际维持结算');
   if(r.actorId!==actorId||!Number.isSafeInteger(r.at)||r.at<minute(c.before)||r.at>minute(c.after)||!['paid','stopped'].includes(r.event))throw Error('能力维持结算与本人或实际等待时间不符');
   const reasons:Record<string,string>={'maintenance-broken':'维持代价不足','source-invalidated':'施术者失去维持能力','battle-ended':'来源战斗已结束','battle-left':'施术者已退出来源战斗','martial-soul-switched':'来源武魂已切换','effects-ended':'该来源的持续效果已结束',manual:'本人停止维持'};
   if(r.event==='stopped'&&(!reasons[r.reason]||r.totals!==undefined||r.items!==undefined))throw Error('能力维持结束原因或费用无效');
   let payment;
   if(r.event==='paid'){
    known(r.totals,['soulPower','health','lifespan'],'实际维持费用');
    if(r.reason||!['soulPower','health','lifespan'].every(k=>Number.isSafeInteger(r.totals[k])&&r.totals[k]>=0)||!Array.isArray(r.items))throw Error('能力维持付款无效');
    const items=r.items.map((i:any)=>{known(i,['itemId','itemName','quantity','quantityBefore','quantityAfter'],'维持物品付款');if(!Number.isSafeInteger(i.quantity)||i.quantity<=0||!Number.isSafeInteger(i.quantityBefore)||!Number.isSafeInteger(i.quantityAfter)||i.quantityAfter<0||i.quantityBefore-i.quantityAfter!==i.quantity)throw Error('能力维持物品付款无效');return copy(i);});
    payment={...copy(r.totals),items};
   }
   return {...pick(r,['eventId','sourceId','actorId','skillId','skillName']),settledAt:{day:Math.floor(r.at/1440),hour:Math.floor(r.at%1440/60),minute:r.at%60},stage:r.event==='paid'?'维持费已支付':'该次施放的维持已结束',...(payment?{payment}:{reason:reasons[r.reason]})};
  });
  return {...common,activity:'等待',...(duties.length?{dutySettlements:duties}:{}),...(abilities.length?{abilitySettlements:abilities}:{})};
 }
 if(c.type==='travel-completed')return {...common,activity:'旅行',startLocationId:c.from,actualLocationId:c.current,position:copy(c.position??null),transit:copy(c.transit??null),intendedDestinationId:c.destinationId,reachedDestination:c.completed,
  mode:c.mode,actualLegs:copy(c.legs),paidGold:c.costGold,travelingCompanionIds:copy(c.companionIds),castAtActualLocation:copy(c.castIds),remainingGoldEstimate:c.remainingGold??null};
 const p=c.progress;known(p,['unitId','minutes','carryBefore','carryAfter','experienceGained','levelsGained','before','after','attributePointsGained'],'实际修炼成长');
 return {...common,activity:'修炼',growth:{experienceGained:p.experienceGained,levelsGained:p.levelsGained,attributePointsGained:p.attributePointsGained,
  before:copy(p.before),after:copy(p.after),unconvertedPracticeMinutesBefore:p.carryBefore,unconvertedPracticeMinutesAfter:p.carryAfter}};
}

export function timeEventAccount(type:string,f:any,n:StoryEventNames):string{
 const actor=n.person(f.actorId);
 if(type==='world-event-completed')return `${actor}在${n.location(f.locationId)}经历“${f.name}”：${f.actualAccount}`;
 if(type==='long-action-abandoned')return `${actor}在${storyEventTime(f.cancelledAt)}放弃剩余${f.activity}。此前已经执行${f.minutesAlreadyExecuted}分钟、支付${f.alreadyPaidGold}金币；取消时尚余${f.remainingMinutesAtCancellation}分钟，当前位置为${f.transit?`${n.location(f.transit.from)}至${n.location(f.transit.to)}途中（路段进度 ${f.transit.progressUnits}/${f.transit.totalUnits}）`:n.location(f.locationId)}。`;
 const elapsed=`从${storyEventTime(f.time.before)}至${storyEventTime(f.time.after)}，实际经过${f.time.elapsedMinutes}分钟`;
 if(type==='captivity-escape')return `${actor}尝试脱困，${elapsed}；${f.check.attribute}检定${f.check.outcome}，${f.stage}。`;
 const lines=[`${actor}${f.activity}，${elapsed}。`,...worldEffectAccount(f,n)];
 for(const r of f.abilitySettlements??[]){
  if(r.payment){const p=r.payment,costs=[...(p.soulPower?[`魂力${p.soulPower}`]:[]),...(p.health?[`生命${p.health}`]:[]),...(p.lifespan?[`寿命${p.lifespan}分钟（另于自然经过时间）`]:[]),...p.items.map((i:any)=>`${i.itemName}${i.quantity}份`)];lines.push(`${actor}在${storyEventTime(r.settledAt)}为“${r.skillName}”这次施放实际支付维持费：${costs.length?costs.join('、'):'没有资源消耗'}。`);}
  else lines.push(`${actor}在${storyEventTime(r.settledAt)}因${r.reason}结束“${r.skillName}”这次施放的维持；该次结束没有再支付维持费。`);
 }
 for(const r of f.dutySettlements??[])lines.push(`${r.personName}在${storyEventTime(r.settledAt)}结束值守：${r.reason}。`);
 if(type==='travel-completed')lines.push(`从${n.location(f.startLocationId)}出发，${f.transit?`当前在${n.location(f.transit.from)}至${n.location(f.transit.to)}途中（路段进度 ${f.transit.progressUnits}/${f.transit.totalUnits}）`:`实际到达${n.location(f.actualLocationId)}`}，${f.reachedDestination?'已抵达预定终点':`尚未抵达预定终点${n.location(f.intendedDestinationId)}`}；本次实际支付${f.paidGold}金币。`,
  ...(f.travelingCompanionIds.length?[`实际同行者：${f.travelingCompanionIds.map(n.person).join('、')}。`]:[]));
 if(f.growth){const g=f.growth;lines.push(`本次修炼实际获得经验${g.experienceGained}、提升${g.levelsGained}级、获得属性点${g.attributePointsGained}。等级${g.before.level} → ${g.after.level}，经验${g.before.experience} → ${g.after.experience}；尚未折算的修炼时间${g.unconvertedPracticeMinutesBefore} → ${g.unconvertedPracticeMinutesAfter}分钟。`);}
 lines.push(f.interruption?`${f.activity}已暂停：${f.interruption.kind}${f.interruption.reason?`，${f.interruption.reason}`:''}；尚余${f.remainingMinutes}分钟未执行。`:`本次${f.activity}已完成。`);
 return lines.join('\n');
}
