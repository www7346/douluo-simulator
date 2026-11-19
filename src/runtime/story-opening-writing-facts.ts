import type {StoryEventNames} from './story-event-names';
const copy=<T>(v:T):T=>structuredClone(v);
const pick=(v:any,keys:string[])=>Object.fromEntries(keys.filter(k=>v&&Object.hasOwn(v,k)).map(k=>[k,copy(v[k])]));
function known(v:any,fields:string[],label:string){const unknown=Object.keys(v).filter(k=>!['type','id','transactionType','summary','meaning',...fields].includes(k));if(unknown.length)throw Error(`开局结果缺少字段编译：${label}/${unknown.join(',')}`);}
const stages:Record<string,string>={created:'开局处境已登记',active:'尚待履行',overdue:'债务已逾期',expired:'机会已过期',declined:'玩家已放弃',completed:'处境已办结',available:'已会面，可另行询价雇佣',used:'引荐已用于实际雇佣',returned:'逾期或撤回后已归还受托物'};
function stage(s:string){if(!stages[s])throw Error(`开局阶段缺少编译：${s}`);return stages[s];}
const purposes:Record<string,string>={advance:'实际周转资助',deposit:'已交保证金',debt:'实际偿还债务',fee:'实际办理费用','deposit-refund':'实际退还保证金',reward:'实际报酬'};
function payments(rows:any[]){return rows.map(p=>{known(p,['purpose','fromId','toId','paidGold','before','after'],'收付款');if(!purposes[p.purpose])throw Error(`处境款项缺少编译：${p.purpose}`);return {purpose:purposes[p.purpose],...pick(p,['fromId','toId','paidGold','before','after'])};});}
export function compileOpeningSituation(r:any){
 known(r,['createdAt','pointsGranted','advanceGold','discountGold','kind','benefit','personId','locationId','status','deposit','owed','dueDay','sourceId','events','itemId','name','contactName','locationName','description','contact','benefitDescription','next','availableActions','terms'],'处境');
 if(r.terms)known(r.terms,['feeGold','rewardGold','lateFeeGold','advanceGold','depositGold','hireDiscountGold'],'原约定款项');
 const timeline=r.events.map((e:any)=>{known(e,['time','sourceId','lostDeposit','owed','playerGoldChange','paid','payments','itemTransfers'],'处境事件');return {stage:stage(e.type),...pick(e,['time','sourceId']),
  ...(e.payments?{payments:payments(e.payments)}:{}),
  ...(e.itemTransfers?{itemTransfers:e.itemTransfers.map((i:any)=>{known(i,['sourceItemId','itemId','name','quantity','fromId','toId','fromContainerId','toContainerId','legalOwnerEntityId'],'交付');return pick(i,['sourceItemId','itemId','name','quantity','fromId','toId','fromContainerId','toContainerId','legalOwnerEntityId']);})}:{}),
  ...(Object.hasOwn(e,'playerGoldChange')?{netPlayerGoldChange:e.playerGoldChange}:{}),
  ...(Object.hasOwn(e,'lostDeposit')?{forfeitedDepositGold:e.lostDeposit}:{}),
  ...(Object.hasOwn(e,'owed')?{debtAfter:e.owed}:{}),
  ...(Object.hasOwn(e,'paid')?{actualHirePaymentGold:e.paid}:{})};});
 return {id:r.id,kind:r.kind,stage:stage(r.status),...pick(r,['name','personId','contactName','locationId','locationName','sourceId','createdAt','dueDay','itemId','availableActions','next']),
  selectedBenefit:r.benefit==='points'?'创建点数':'故事内收益',creationPointsAlreadyGranted:r.pointsGranted,originalDepositGold:r.deposit,agreedAmounts:copy(r.terms??null),
  ...(r.kind==='debt'?{debt:{amount:r.owed,settled:r.status==='completed'}}:{}),
  ...(r.kind==='referral'?{hireDiscount:{amount:r.discountGold,available:r.status==='available',used:r.status==='used'}}:{}),timeline,
  ...(r.contact?{contact:{...pick(r.contact,['id','registered','tier','identity','occupation']),...(r.contact.service?{escortService:pick(r.contact.service,['fee','role','referenceDungeonId','referenceDungeonName'])}:{})}}:{})};
}
function guidance(g:any){if(!g)return null;known(g,['status','giftStatus','giftId','itemId','tutorialSkipped'],'教学进度');return {introStage:g.status==='pending'?'开场引导待处理':'开场引导已处理',giftStage:g.giftStatus==='claimed'?'赠礼已实际领取':'赠礼仍可领取',...pick(g,['giftId','itemId','tutorialSkipped'])};}
export function compileOpeningGuidance(g:any){if(!g)return null;known(g,['academy','guidance','reason','gifts','giftItem','hasRing'],'当前教学');return {academy:g.academy??false,progress:guidance(g.guidance),unavailableReason:g.reason,availableChoices:g.gifts.map((c:any)=>{known(c,['name','years','attuned','description'],'赠礼选项');return {id:c.id,...pick(c,['name','years','attuned','description'])};}),carriedGift:copy(g.giftItem),hasAbsorbedRing:g.hasRing};}
export const OPENING_RECEIPT_FIELDS:Record<string,string[]>={'opening-inspected':['situations'],'opening-situation-settled':['situation'],'opening-skipped':['guidance'],'opening-deferred':['guidance'],'opening-gift-claimed':['itemId','guidance','item']};
export function compileOpeningReceipt(c:any){known(c,OPENING_RECEIPT_FIELDS[c.type],c.type);
 if(c.type==='opening-inspected'){
  const situations=c.situations.map(compileOpeningSituation);
  return {stage:situations.length?situations.map((s:any)=>`${s.name??s.kind}：${s.stage}；联系人${s.contactName??s.personId}，地点${s.locationName??s.locationId}，期限为世界第${s.dueDay}日`).join('。'):'当前没有已登记的开局事项',situations};
 }
 if(c.type==='opening-situation-settled'){const situation=compileOpeningSituation(c.situation);return {stage:situation.stage,situation};}
 const progress=guidance(c.guidance);
 if(c.type==='opening-gift-claimed')return {stage:'赠礼已领取为随身魂环来源',itemId:c.itemId,progress,item:c.item?{...pick(c.item,['id','name','ownerId','containerId']),ringSource:pick(c.item.source,['kind','sourceId','years'])}:null};
 return {stage:c.type==='opening-skipped'?'已跳过教程':'已暂缓开场交谈',progress};
}

export function openingEventAccount(type:string,f:any,n:StoryEventNames):string{
 if(type==='opening-inspected')return f.stage+f.situations.map((s:any)=>`\n${s.name??s.kind}选择的收益为${s.selectedBenefit}，已授予创建点数${s.creationPointsAlreadyGranted}${s.debt?`；当前债务${s.debt.amount}金币`:''}${s.hireDiscount?`；雇佣优惠${s.hireDiscount.amount}金币，${s.hireDiscount.available?'当前可用':s.hireDiscount.used?'已使用':'尚不可用'}`:''}。`).join('');
 if(type==='opening-situation-settled'){
  const s=f.situation,current=s.timeline.at(-1),lines=[`${s.name??s.kind}：${s.stage}。`];
  for(const p of current?.payments??[])lines.push(`${p.purpose}：${n.person(p.fromId)}向${n.person(p.toId)}实际支付${p.paidGold}金币。`);
  for(const i of current?.itemTransfers??[])lines.push(`${n.person(i.fromId)}向${n.person(i.toId)}实际交付${i.name??n.item(i.itemId)}×${i.quantity}。`);
  if(current?.forfeitedDepositGold!==undefined)lines.push(`保证金实际损失${current.forfeitedDepositGold}金币。`);
  if(s.debt)lines.push(`当前记录债务${s.debt.amount}金币，${s.debt.settled?'已结清':'尚未结清'}。`);
  if(s.hireDiscount)lines.push(`雇佣优惠${s.hireDiscount.amount}金币，${s.hireDiscount.used?'已经使用':s.hireDiscount.available?'可以在实际雇佣时使用':'尚未可用'}。`);
  return lines.join('\n');
 }
 if(type==='opening-gift-claimed')return `${n.person(n.actorId)}实际领到${f.item?.name??n.item(f.itemId)}${f.item?.ringSource?.years?`，为${f.item.ringSource.years}年的魂环来源`:''}；当前作为随身实物，尚未吸收。`;
 return `${f.stage}；${f.progress.giftStage}。`;
}
