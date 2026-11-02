import {storyEventTime,type StoryEventNames} from './story-event-names';
const copy=<T>(v:T):T=>structuredClone(v);
const pick=(v:any,keys:string[])=>Object.fromEntries(keys.filter(k=>v&&Object.hasOwn(v,k)).map(k=>[k,copy(v[k])]));
function known(v:any,fields:readonly string[],label:string){const unknown=Object.keys(v).filter(k=>!['type','id','transactionType','summary',...fields].includes(k));if(unknown.length)throw Error(`社会交互结果缺少字段编译：${label}/${unknown.join(',')}`);}
const kinds:Record<string,string>={'realm-guest':'邀请入住画境','realm-return':'邀请出画同行','give-gold':'赠款约定','give-item':'赠物约定',meeting:'约见',relationship:'正式关系',party:'自愿同行',contact:'魂导通讯联络',hire:'本次同行询价',loot:'收获分配约定','loot-resolution':'暂存收获分配方案'};
const completed:Record<string,string>={'realm-guest':'受邀人自愿入住房间','realm-return':'住客已决定出画同行','give-gold':'钱款已经交付','give-item':'物品已经交付',meeting:'双方已实际赴约',relationship:'双方已确认关系',party:'人物已自愿入队',contact:'联络方式已交换',hire:'本人报价已记录，尚待玩家接受和付款',loot:'本人已确认分配条款','loot-resolution':'本人已确认暂存分配方案'};
const stages:Record<string,string>={pending:'提议待回应',accepted:'已接受，尚待履行',rejected:'提议已拒绝',expired:'约定已过期',cancelled:'约定已撤回',ended:'关系或同行已结束'};
const commonRecord=['kind','playerId','personId','locationId','status','events','expiryReason','initiatorId','goalId','origin'];
const termFields:Record<string,string[]>={
 'give-gold':['amount','dueDay'],'give-item':['itemId','itemName','templateId','quantity','dueDay'],
 'realm-guest':['realmId','regionId'],'realm-return':['guestRealmId','membership','dungeonId'],meeting:['startsAt','endsAt','dueDay'],relationship:['relationship','roles','history'],party:['membership','dungeonId','guestRealmId'],contact:['channel'],hire:['dungeonId','dueDay'],
 loot:['allocationId','dungeonId','terms'],'loot-resolution':['resolutionId','terms'],
};
function stage(kind:string,status:string){const text=status==='completed'?completed[kind]:stages[status];if(!text)throw Error(`约定阶段缺少编译：${kind}/${status}`);return text;}

/** Interpret frozen terms; never predict drops, distribute stock or recalculate entitlements. */
export function compileLootTerms(terms:any){
 known(terms,['shares','itemOwners','remainderOwner','itemTargets'],'分配条款');
 return {scope:'共同实际取得的收获',materialWeights:Object.entries(terms.shares).map(([personId,weight])=>({personId,weight})),
  integerRemainder:terms.remainderOwner?{recipientId:terms.remainderOwner}:{stage:'暂存协商'},
  itemAssignments:[...Object.entries(terms.itemOwners??{}).map(([templateId,personId])=>({templateId,personId,quantityLimit:'全部该类实际收获'})),
   ...(terms.itemTargets??[]).map((target:any)=>({...copy(target),quantityLimit:'前quantity件实际收获'}))],
  remainingItems:{stage:'暂存协商'}};
}
export function compileLootResolutionTerms(terms:any){
 known(terms,['allocationId','resourceKind','resourceId','recipientId','quantity','participants','locationId','name','nextPriority'],'暂存方案条款');
 const {nextPriority,...current}=terms;
 return {...copy(current),scope:'本次暂存收获的指定数量',
  ...(nextPriority?{nextJointHarvestFirstConsultation:{...copy(nextPriority),participants:copy(terms.participants),quantity:1,startsAfter:'本次实际交付'}}:{})};
}

export function compileCommitment(record:any){
 if(!kinds[record.kind])throw Error(`约定类型缺少编译：${record.kind}`);known(record,[...commonRecord,...termFields[record.kind]],record.kind);
 if(record.origin){if(record.origin.kind==='opening')known(record.origin,['kind','sourceId','entryId'],'开局既往来源');else if(record.origin.kind==='explicit-ending')known(record.origin,['kind','sourceId','previousSourceId'],'明确结束来源');else{known(record.origin,['control'],'提议来源');known(record.origin.control,['issuerId','executorId','orderId','sourceStatusId'],'控制来源');}}
 const terms=pick(record,termFields[record.kind]);
 const recordStage=(status:string)=>status==='completed'&&record.origin?.kind==='opening'?'故事开始前已经成立':stage(record.kind,status);
 if(record.kind==='give-gold'){delete terms.amount;terms.promisedGold=record.amount;}
 if(record.kind==='give-item'){delete terms.quantity;terms.promisedQuantity=record.quantity;}
 if(record.kind==='meeting'){delete terms.endsAt;terms.windowEndsAtWorldMinute=record.endsAt;}
 if(record.kind==='party')terms.membership=record.membership==='long-term'?'长期':'本次临时';
 if(record.kind==='loot'){delete terms.terms;terms.allocation=compileLootTerms(record.terms);}
 if(record.kind==='loot-resolution'){delete terms.terms;terms.allocation=compileLootResolutionTerms(record.terms);}
 const timeline=record.events.map((event:any,index:number)=>{
  known(event,['status','sourceId','actorId','revision','time','memoryContexts','order','reason','paid','quantity','deliveredItemId','locationId','participants','relationship','membership','endedBy','channel','allocationId','resolutionId','cause','fee','quoteId'],'约定事件');
  return {index,stage:recordStage(event.status),...pick(event,['sourceId','actorId','revision','time','reason','endedBy']),...(record.origin?.control&&event.status==='pending'?{reason:'提出此版赠物条款，尚待本人回应'}:{}),
   ...(record.kind==='hire'&&event.fee!==undefined?{quote:{quoteId:event.quoteId,gold:event.fee}}:{}),
   ...(event.status==='completed'&&record.kind!=='hire'?{fulfillment:{...pick(event,['quantity','deliveredItemId','locationId','participants','relationship','membership','channel','allocationId','resolutionId']),...(Object.hasOwn(event,'paid')?{paidGold:event.paid}:{})}}:{})};
 });
 return {id:record.id,kind:record.kind,activity:kinds[record.kind],stage:recordStage(record.status),...(record.origin?.kind?{origin:pick(record.origin,['kind','sourceId','entryId','previousSourceId'])}:{}),
  participants:{playerId:record.playerId,personId:record.personId,initiatorId:record.initiatorId??record.playerId},locationId:record.locationId,
  terms,timeline,...pick(record,['goalId','expiryReason'])};
}
export function compileLootDelivery(d:any){
 if(!d)return null;known(d,['resolutionId','status','reason','sourceId','actorId','at','recipientId','quantity','resourceKind','resourceId','receivedItemId','containerId','locationId','name'],'暂存交付');
 const stages:Record<string,string>={agreed:'各方已同意，尚未交付',completed:'已实际交付','already-completed':'此前已交付，本次未重复领取'};
 if(!stages[d.status])throw Error(`暂存交付阶段缺少编译：${d.status}`);
 return {stage:stages[d.status],...pick(d,['resolutionId','reason','sourceId','actorId','at','recipientId','quantity','resourceKind','resourceId','receivedItemId','containerId','locationId','name'])};
}
export const SOCIAL_RECEIPT_FIELDS:Record<string,string[]>={
 'person-gift-offered':['kind','playerId','personId','locationId','itemId','itemName','templateId','quantity','amount','response','delivery'],
 'commitment-proposed':['commitment','response','lootDelivery'],'commitment-responded':['commitment','response','lootDelivery'],
 'commitment-completed':['commitment','quantity','deliveredItemId','paid'],'commitment-cancelled':['commitment'],
 'relationship-ended':['personId','relationship','ended','cancelledProposalIds'],'party-ended':['personId','ended'],
 'npc-invitation-answered':['goalId','commitment'],
 'loot-agreement-existing':['commitment','agreementId','currentTerms','inheritedFrom'],
 'loot-resolution-existing':['commitment','resolutionId'],'loot-collected':['actorId','lootDelivery'],
};
export function compileSocialReceipt(c:any){
 const fields=SOCIAL_RECEIPT_FIELDS[c.type];if(!fields)throw Error(`社会交互结果缺少编译：${c.type}`);known(c,fields,c.type);
 if(c.type==='person-gift-offered')return {stage:!c.response?'当场赠送待回应':c.response.accept?'已接受并交付':'已拒绝，未交付',...pick(c,fields)};
 if(c.type==='loot-collected'){const delivery=compileLootDelivery(c.lootDelivery);return {stage:delivery!.stage,delivery};}
 if(c.ended){const ended=compileCommitment(c.ended);return {stage:ended.stage,personId:c.personId,ended,...pick(c,['relationship','cancelledProposalIds'])};}
 const agreement=compileCommitment(c.commitment);
 if(c.response)known(c.response,['accept','reason','status','fee','quoteId'],'人物回应');
 return {stage:agreement.stage,agreement,
  ...(c.response?{response:{personId:c.commitment.personId,accepted:c.response.accept,reason:c.response.reason,stage:stage(c.commitment.kind,c.response.status),...(c.commitment.kind==='hire'&&c.response.accept?{quotedGold:c.response.fee,quoteId:c.response.quoteId}:{})}}:{}),
  ...(c.lootDelivery?{delivery:compileLootDelivery(c.lootDelivery)}:{}),
  ...pick(c,['goalId','agreementId','currentTerms','inheritedFrom','resolutionId'])};
}

export function socialEventAccount(type:string,f:any,n:StoryEventNames):string{
 if(type==='person-gift-offered'){const gift=f.kind==='give-gold'?`${f.amount}金币`:`${f.itemName??n.item(f.itemId)}×${f.quantity}`;return `${n.person(f.playerId)}向${n.person(f.personId)}赠送${gift}：${f.stage}。${f.response?`本人答复：${f.response.reason}`:''}`;}
 const a=f.agreement??f.ended,lines:string[]=[];
 if(a){
  const t=a.terms,p=a.participants;
  lines.push(`${n.person(p.playerId)}与${n.person(p.personId)}的${a.activity}：${a.stage}。`);
  if(a.kind==='give-gold')lines.push(`约定由${n.person(p.playerId)}向${n.person(p.personId)}交付${t.promisedGold}金币，期限第${t.dueDay}日。`);
  if(a.kind==='give-item')lines.push(`约定由${n.person(p.playerId)}向${n.person(p.personId)}交付${t.itemName??n.item(t.itemId)}×${t.promisedQuantity}，期限第${t.dueDay}日。`);
  if(a.kind==='meeting')lines.push(`约定在${n.location(a.locationId)}于${storyEventTime(t.startsAt)}会面。`);
  if(a.kind==='party')lines.push(`本次约定为${t.membership}同行。`);
  if(a.kind==='hire'){const quote=a.timeline.at(-1)?.quote;lines.push(quote?`本人本次同行报价为${quote.gold}金币，尚待玩家接受和付款；未因报价而入队。`:'本次仅询问同行报价，尚未确定金额或入队。');}
  if(a.kind==='relationship')lines.push(`关系类型：${t.relationship}。${t.roles?`${n.person(p.playerId)}为${t.roles.self}，${n.person(p.personId)}为${t.roles.other}。`:''}${t.history??''}`);
  if(a.kind==='loot'){const terms=t.allocation;lines.push(`约定的材料分配权重：${terms.materialWeights.map((v:any)=>`${n.person(v.personId)}${v.weight}`).join('、')}；余数${terms.integerRemainder.recipientId?`归${n.person(terms.integerRemainder.recipientId)}`:terms.integerRemainder.stage}。`);}
  if(a.kind==='loot-resolution'){const d=t.allocation;lines.push(`本次暂存分配方案：${d.name??d.resourceId}×${d.quantity}交给${n.person(d.recipientId)}。`);}
  if(f.response)lines.push(`${n.person(f.response.personId)}${f.response.accepted?'接受':'拒绝'}；本人理由：${f.response.reason}。`);
  // The timeline is an existing agreement's provenance; only its current fulfillment is this receipt's delivery.
  const current=a.timeline.at(-1);
  if(current?.fulfillment&&a.stage===current.stage){const d=current.fulfillment;
   if(d.paidGold!==undefined)lines.push(`已实际交付${d.paidGold}金币。`);
   if(d.quantity!==undefined)lines.push(`已实际交付${t.itemName??n.item(d.deliveredItemId??t.itemId)}×${d.quantity}。`);
  }
  if(['loot-agreement-existing','loot-resolution-existing'].includes(type))lines.push('本次读取已经成立的约定。');
 }
 if(f.delivery){const d=f.delivery;lines.push(`${d.stage}${d.quantity!==undefined?`：${d.name??d.resourceId}×${d.quantity}，接收人为${n.person(d.recipientId)}`:''}${d.reason?`；${d.reason}`:''}。`);}
 return lines.join('\n');
}
