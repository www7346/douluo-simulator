import {CONTRACT_RECEIPT_TYPES,contractEventAccount} from './story-contract-writing-facts';
import {inventoryDetailReading} from './story-inventory-reading';
import {FIELD_CONTROL_RECEIPT_TYPES,fieldOperationAccount} from './story-field-control-writing-facts';
/** Readable event accounts compiled from already settled domain facts, never from a novel. */
import type {StoryEventNames} from './story-event-names';
import {TIME_RECEIPT_FIELDS,timeEventAccount} from './story-time-writing-facts';
import {ITEM_USE_RECEIPT_TYPES,itemUseEventAccount} from './story-item-use-writing-facts';
import {SOCIAL_RECEIPT_FIELDS,socialEventAccount} from './story-social-writing-facts';
import {RING_RECEIPT_FIELDS,ringEventAccount} from './story-ring-writing-facts';
import {COMMUNICATION_RECEIPT_FIELDS,communicationEventAccount} from './story-communication-writing-facts';
import {OBJECT_RECEIPT_FIELDS,objectEventAccount} from './story-object-writing-facts';
import {OPENING_RECEIPT_FIELDS,openingEventAccount} from './story-opening-writing-facts';
import {HISTORY_RECEIPT_FIELDS,historyEventAccount} from './story-history-writing-facts';
import {dossierEventAccount} from './story-person-writing-facts';
import {equipmentEventAccount} from './story-growth-equipment-writing-facts';
import {SEALING_RECEIPT_TYPES,sealingEventAccount} from './story-sealing-writing-facts';
export function storyEventAccount(action:string,type:string,f:any,names:StoryEventNames,playerFacing=false):string|null{
 if(['soul-evolution','soul-evolution-query','soul-manifestation'].includes(type))return f.stage;
 if(CONTRACT_RECEIPT_TYPES.includes(type))return contractEventAccount(type,f,names);
 if(['reward-resident','punish-resident'].includes(type))return `${names.person(f.actorId)}对${names.person(f.targetId)}执行${f.result.name}，实际支付${f.result.payment.totals.soulPower}点魂力；待遇与许可已按实际结果落实。${f.obedience?`对该管理者的服从由${f.obedience.before}变为${f.obedience.after}。`:''}`;
 if(type==='reshape-realm')return `${names.person(f.actorId)}改变了指定房间或公共区的环境：${f.result.description}；仅场景发生变化，不自动改变人物情绪。`;
 if(type==='set-realm-arrangement')return `${names.person(f.actorId)}调整了${names.person(f.targetId)}的固定与装备；本次改变已由实际器具落实，支付${f.result.payment.totals.soulPower}点魂力，经过${f.result.minutes}分钟；未列出的安排保持原状。`;
 if(type==='end-realm-visit')return names.person(f.targetId)+'结束了这次入住，已经出画。';
 if(type==='move-realm-guest')return names.person(f.targetId)+'换入了新的房间。';
 if(type==='arrange-realm-resident')return `${names.person(f.actorId)}将${names.person(f.targetId)}安排到${f.result.regionId}，永久身份席位不变。`;
 if(type==='set-resident-permissions')return `${names.person(f.actorId)}调整了${names.person(f.targetId)}在画境内的独立活动许可；仅本次列出的许可发生改变。`;
 if(type==='performance-agreement')return `${f.stage}条款：${f.terms.description}，约定${f.terms.service.minutes}分钟，协议当前状态为${({proposed:'等待本人回应',active:'正在履行',rejected:'本人拒绝',fulfilled:'已实际履约',breached:'已经违约',ended:'已结束'} as Record<string,string>)[f.status]??f.status}。`;
 if(type==='resident-deployed')return `${names.person(f.targetId)}以${f.mode==='body'?'原人物真身':'弱化投影'}准备出战，实际支付${f.cost}点魂力，能力比例${f.percent}%；战斗中自行行动。`;
 if(type==='resident-recalled')return `${names.person(f.targetId)}的本次出战已经收回，原人物伤势、资源消耗、装备及永久席位继续保留。`;
 if(type==='resident-tactics')return `${names.person(f.targetId)}收到战前安排：“${f.text}”，约定保留${f.reservePercent}%魂力，自行判断具体战斗行动。`;
 if(type==='intimate-craft')return `${names.person(f.actorId)}制作了${names.item(f.itemId)}，实际支付${f.gold}金币，用时${f.minutes}分钟。`;
 if(type==='intimate-equip')return `${names.person(f.actorId)}将${names.item(f.itemId)}装在${f.slot}，用时${f.minutes}分钟。`;
 if(type==='intimate-detach')return `${names.person(f.actorId)}拆下${names.item(f.itemId)}并收入行囊，用时${f.minutes}分钟。`;
 if(['device.lock','device.unlock'].includes(type))return `${names.person(f.actorId)}对${names.item(f.itemId)}${type==='device.lock'?'闭合':'打开'}实体锁，实际经过${f.minutes}分钟。`;
 if(['host.set-suppression','host.set-form','host.set-appearance'].includes(type)){
  const label=type==='host.set-suppression'?'抑制比例':type==='host.set-form'?'形态':'外观';
  const result=type==='host.set-suppression'?`${f.detail?.percent}%`:type==='host.set-form'?f.detail?`已采用所选形态（${f.detail.level}档）`:'已清空所选部位':String(f.detail);
  return `${names.person(f.actorId)}对${names.item(f.itemId)}进行${label}调节，用时${f.minutes}分钟；${f.completed?`${label}结果：${result}`:`未完成：${f.reason??f.interruption?.kind??'实际行动被中断'}`}。`;
 }
 if(type==='combat-action')return `${names.person(f.actorId)}完成了本次战斗行动。`;
 if(SEALING_RECEIPT_TYPES.includes(type))return sealingEventAccount(type,f,names);
 if(FIELD_CONTROL_RECEIPT_TYPES.includes(type))return fieldOperationAccount(type,f,names,playerFacing);
 if(Object.hasOwn(TIME_RECEIPT_FIELDS,type))return timeEventAccount(type,f,names);
 if(ITEM_USE_RECEIPT_TYPES.includes(type))return itemUseEventAccount(f,names);
 if(Object.hasOwn(SOCIAL_RECEIPT_FIELDS,type))return socialEventAccount(type,f,names);
 if(Object.hasOwn(RING_RECEIPT_FIELDS,type))return ringEventAccount(type,f,names);
 if(Object.hasOwn(COMMUNICATION_RECEIPT_FIELDS,type))return communicationEventAccount(type,f,names);
 if(Object.hasOwn(OBJECT_RECEIPT_FIELDS,type))return objectEventAccount(type,f,names);
 if(Object.hasOwn(OPENING_RECEIPT_FIELDS,type))return openingEventAccount(type,f,names);
 if(Object.hasOwn(HISTORY_RECEIPT_FIELDS,type))return historyEventAccount(type,f,names);
 if(type==='person-dossier')return dossierEventAccount(f,names);
 const actor=names.person(f.actorId),item=(row:any)=>row?.name??names.item(row?.id??row?.itemId??row?.fingerprint);
 const materials=(rows:any[])=>rows.map(row=>`${item(row)}×${row.quantity}`).join('、');
 const wallet=(record:any,total:number,incoming:boolean)=>record?`钱袋由${record.before}金币${incoming?'收入':'支付'}${total}金币后变为${record.after}金币。`:'';
 if(type==='stock-by-name')return f.inStock?'当前货架有「'+f.itemName+'」，可按报价选购。':'当前货架没有在售的「'+f.itemName+'」。';
 if(type==='commerce-inspected'){
  const d=f.data,offers=d.materialOffers??[];
  if(d.scope?.startsWith('视觉受限'))return '当前无法查看实时货架，尚不能确认材料库存。';
  if(!d.supplyService)return '附近没有可查看的商店，尚不能确认材料货源。';
  return `${d.supplyService?.name??'当前商店'}：`+(offers.length?`在售原材料：${offers.map((m:any)=>`${m.name}×${m.quantity}，每份${m.unitGold}金币`).join('；')}。`:'没有在售原材料。')+`货架上有${d.shops.reduce((sum:number,s:any)=>sum+s.stock.length,0)}种成品。`;
 }
 if(['asset-auction','auction-proxy','commerce-debt','shop-auction-shipment','commercial-subscription','commercial-message-read','commercial-message-replied'].includes(type))return f.stage;
 if(type==='material-bought')return `${actor}已买入${names.item(f.assetRef.fingerprint)}×${f.quantity}，实际支付${f.totalGold}金币。`;
  if(type==='inventory-inspected')return `${actor}查看了本人现有物品。`+(f.answer.length?f.answer.map((row:any)=>`${item(row)}${row.quantity===null?'（当前数量未获知）':`×${row.quantity}`}，${row.soulDeviceSlot?`装备于${row.soulDeviceSlot}`:row.carried?'随身携带':row.storage?.kind==='custody-facility-stock'?`存于${row.storage.locationName??row.storage.locationId}的${row.storage.facilityName}设施给养仓库`:row.storage?`寄存在${row.storage.positionLabel??row.storage.locationName??row.storage.locationId}`:row.integrated?'已经融合':'未记录为随身携带'}。`).join(''):'没有登记属于本人的物品。')+(f.details?'\n'+inventoryDetailReading(f.details,f.comparison):'');
 if(type==='story-free-action')return [
  `${actor}尝试${f.objective}，结果：${f.result}；经过${f.time.elapsedMinutes}分钟。`,
  ...(f.check?[`${f.check.attribute}检定${f.check.outcome}，合计${f.check.draw.total}。`]:[]),
  ...(f.committedEffects.length?f.committedEffects.map((effect:any)=>`${effect.kind}${effect.state}：${effect.description}`):[])
 ].join('\n');
 if(['story-attribute-check','story-opposed-check'].includes(type))return `${actor}为“${f.objective}”进行${f.attribute}检定，实际合计${f.draw.total}${f.opponent?`；对方${names.person(f.opponent.actorId)}的${f.opponent.attribute}合计${f.opponent.total}`:`，难度${f.difficulty}`}，结果${f.outcome}。`;
 if(f.proposedSale){const sale=f.proposedSale;return `${actor}询问出售${item(sale.object)}×${sale.quantity}的条件，回收报价为${sale.totalGold}金币。`;}
 if(f.settlement&&['material-sold','item-sold'].includes(type)){const sale=f.settlement;return `${actor}已出售${item(sale.object)}×${sale.quantity}，实际收到${sale.totalGold}金币；本次结算后该物品剩余${sale.remainingQuantity}，余额${sale.remainingGold}金币。${wallet(sale.wallet,sale.totalGold,true)}`;}
 if(type==='supply-bought')return `${actor}已买入${item(f.receivedItem)}×${f.quantityPurchased}，实际支付${f.payment.totalGold}金币。${wallet(f.payment.wallet,f.payment.totalGold,false)}`;
 if(['item-bought','item-sold'].includes(type))return `${actor}已${type==='item-bought'?'买入':'卖出'}${f.item.name??names.item(f.item.receivedItemId??f.item.originalItemId)}×${f.item.quantity}，实际${type==='item-bought'?'支付':'收到'}${f.payment.totalGold}金币。`;
  if(['item-stored','item-retrieved'].includes(type))return `${actor}已将${item(f.item)}×${f.item.quantity}${type==='item-stored'?`存入${f.movement.positionLabel??'此地储物处'}`:`从${f.movement.positionLabel??'储物处'}取回行囊`}。物品归${names.person(f.item.legalOwnerEntityId)}。`;
 if(type==='coins-looted')return `${actor}已从所记录的遗骸拾取${f.goldReceived}金币${f.recordedAsStolen?'，此行为已记为盗取':''}。`;
  if(type==='item-looted'||type==='stored-item-claimed')return `${actor}已${type==='item-looted'?'从所记录的遗骸拾取':`从${f.positionLabel??'暂存处'}领回`}${names.item(f.receivedItemId??f.itemId)}×${f.quantity}${f.recordedAsStolen?'，此行为已记为盗取':''}。`;
 if(type==='growth-attribute-allocated')return `${actor}实际消耗${f.pointsSpent}属性点，${f.attribute}提升${f.attributeIncrease}，本次分配后为${f.attributeAfter}；剩余可用属性点${f.pointsRemaining}。`;
 if(type==='growth-inspected'){
  const {progression,cultivation,ringAdvancement}=f.answer;
  return [
   `${actor}查看当前成长条件：可用属性点${f.answer.availablePoints}。`,
   ...(f.answer.attributes??[]).map((a:any)=>`${a.attribute}当前${a.current??a.base}（基础${a.base}），提升下一点需${a.cost}属性点。`),
   ...(progression?[`当前魂力${progression.level}级，经验${progression.experience}/${progression.requirement}，当前阶段为“${progression.bottleneck}”。`]:[]),
   ...(cultivation?[`当前${cultivation.available?'可以修炼':`不能修炼：${cultivation.reason}`}。${cultivation.meaning}`]:[]),
   ...(ringAdvancement??[]).map((entry:any)=>{const q=entry.eligibility;return `${entry.martialSoulName??q.martialSoulId}的下一枚为第${q.nextOrdinal}魂环（${q.mode}），${q.pass?'已满足吸收条件':q.reasons.join('；')}。`;}),
   ...(playerFacing?[]:['魂环成长资格不等于已取得或已吸收魂环，具体来源仍按魂环预览核对。本次只查询，没有修炼、吸收或分配属性。'])
  ].join('');
 }
 if(type==='item-equipped'||type==='item-unequipped')return equipmentEventAccount(type,f,actor,item(f.itemIdentity??{id:f.itemId}));
 if(type==='retract-martial-soul')return `${actor}收回了武魂，用时${f.minutes}分钟。`;
 if(type==='restrain-desire')return `${actor}主动克制欲火，经过${f.minutes}分钟。${f.check?`自控检定${f.check.total}，难度${f.check.dc}，${f.check.success?'成功解除发作限制，常驻负担仍在':'失败，发作限制仍在'}。`:'时间推进期间欲火已到期或行动被中断，没有追加克制检定。'}`;
 if(type==='break-restraint')return `${actor}尝试挣脱拘束，经过${f.minutes}分钟，检定${f.total}，难度${f.dc}，${f.passed?'检定成功':'检定失败'}；结算后剩余${f.remainingLayers}层${f.interruption?'，过程被实际事件中断':''}。`;
 if(type==='party-recovered')return f.recoveries.map((r:any)=>`${names.person(r.actorId)}：生命${r.resources.find((x:any)=>x.resource==='生命')?.before} → ${r.resources.find((x:any)=>x.resource==='生命')?.after}；魂力${r.resources.find((x:any)=>x.resource==='魂力')?.before} → ${r.resources.find((x:any)=>x.resource==='魂力')?.after}`).concat(f.skipped.map((r:any)=>`${names.person(r.personId)}未休整：${r.reason}`)).join('\n');
 if(type==='safe-point-recovered')return [
  `${actor}已完成本次安全点休整；实际清除${f.clearedStatusCount}项状态。`,
  ...f.resources.map((r:any)=>`${r.resource}：${r.before===null?'原值未记录':r.before} → ${r.after}`)
 ].join('\n');
 if(type==='preset-blueprint-learned')return `${actor}学习了“${f.name}”的制作图纸，可准备材料后按图制作。`;
 if(type==='research-materials-consumed')return `${actor}已为“${f.concept}”投入${f.investedUnits}份材料（制作价值${f.investedCraftValue}），现有${f.candidateCount}套方案待选。`;
 if(type==='research-blueprint-created')return `${actor}已选定“${f.blueprint?.name??f.blueprintId}”的研发方案，取得图纸及${f.prototypeQuantity}件样品。`;
 if(type==='blueprint-crafted')return [
  `工坊已按“${f.blueprint?.name??f.blueprintId}”图纸完成${f.quantity}件成品，${names.person(f.recipientId)}已收到成品；实际消耗材料：${materials(f.consumedMaterials)}。`,
  `实际消耗制作价值${f.craftValue.actuallyConsumed}，其中超额消耗${f.craftValue.surplusConsumed}。`,
  ...f.inventoryChanges.map((change:any)=>`${names.item(change.itemId)}${change.storageResult}，本次增加${change.receivedQuantity}，数量${change.quantityBefore} → ${change.quantityAfter}。`)
 ].join('\n');
 if(type!=='workshop-inspected')return null;
 if(action==='preview-craft')return `${actor}查看“${f.blueprint?.name??'所选图纸'}”的${f.quantity}件制作条件：${f.result}${f.reason?`，原因：${f.reason}`:''}。所需材料：${f.requiredMaterials.length?materials(f.requiredMaterials):'尚无可用配料'}；所需制作价值${f.proposedCraft.requiredValueTotal}。`;
 if(action==='preview-research')return `${actor}查看${f.proposedResearch.category}研发条件：${f.canBegin?'当前可以开始':'当前不能开始'}${f.reason?`，原因：${f.reason}`:''}。所选材料${materials(f.proposedResearch.materials)}，制作价值${f.proposedResearch.craftValue}，最低要求${f.proposedResearch.minimumCraftValue}。`;
 if(action==='recommend-research'){
  const p=f.proposedResearch,s=f.materialSupply;
  return [`${actor}查看${p.name??'作品'}的研发配料：${f.found?`找到配料${materials(p.materials)}，制作价值${p.craftValue}`:'当前未找到可用配料，未投入材料、尚未开始研发'}。`,Number.isFinite(p.minimumCraftValue)?`所需制作价值至少${p.minimumCraftValue}。`:'',...(p.materialRequirements??[]).map((c:any)=>`${c.label}：${c.anyOf.join('／')}。`),s?s.visualAvailable?s.service?s.offers.length?`${s.service.name}在售材料：${s.offers.map((m:any)=>`${m.name}×${m.quantity}，每份${m.unitGold}金币`).join('；')}；配料要求可在图纸中查看。`:`${s.service.name}目前没有在售原材料，暂时无法在这里买齐。`:'附近没有可查看的材料商店。':'当前无法查看实时材料货架。':'',''].filter(Boolean).join('');
 }
 if(action==='inspect-research')return `${actor}查看“${f.research.concept}”的研发记录：${f.research.stage}；已投入${f.research.investedUnits}份材料，有${f.research.choices.length}套方案待选。`;
 if(action==='inspect-workshop')return [
  `${actor}查看工坊：${f.access.available?'当前可以使用工坊':`当前不能使用工坊：${f.access.reason}`}。`,
  ...(f.materials?[f.materials.permanent.length?`材料袋现有：${materials(f.materials.permanent)}。`:'材料袋里还没有材料。',f.materials.expeditionCargo.length?`本次探索收集的材料：${materials(f.materials.expeditionCargo)}，尚未带回。`:'本次探索还没有收集到材料。']:[]),
  f.ownedBlueprints.length?`已有图纸：${f.ownedBlueprints.map((b:any)=>`“${b.name}”（${b.category}），每件需制作价值${b.requiredValue}`).join('；')}。选一张图纸，即可查看所需材料和可制作数量。`:'还没有图纸，可以先研发一份设计。',
  f.pendingResearch.length?`尚待处理的研发：${f.pendingResearch.map((r:any)=>`“${r.concept}”：${r.stage}`).join('；')}。`:'没有待处理的研发方案。',
  ''
 ].join('');
 return null;
}
