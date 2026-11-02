import {compileDisguiseOperation} from './disguise-writing';
import {compileWorldEffectSettlements,worldEffectAccount,WORLD_EFFECT_RECEIPT_FIELDS} from './world-effect-writing';
import {compileCommittedEffect} from './committed-effect-facts';
import {compileBattleLifecycle} from './battle-lifecycle-facts';
import {committedOutcomeReading,playerOutcomeReading} from './committed-effect-reading';
import {compileItemUseReceipt,ITEM_USE_RECEIPT_TYPES,itemUseEventAccount} from './story-item-use-writing-facts';
import {compileGrowthEquipmentReceipt,equipmentEventAccount} from './story-growth-equipment-writing-facts';
import {compileAdventureReceipt,adventureEventAccount} from './story-adventure-writing-facts';
import type {StoryTurn,StoryStepResult} from './story-turns';
import type {StoryEventNames} from './story-event-names';
import {compileTimeReceipt,timeEventAccount} from './story-time-writing-facts';
import {compileCommitment,socialEventAccount} from './story-social-writing-facts';
const copy=<T>(v:T):T=>structuredClone(v);
const pick=(c:any,keys:string[])=>Object.fromEntries(keys.filter(k=>Object.hasOwn(c,k)).map(k=>[k,copy(c[k])]));
const known=(c:any,fields:string[])=>{const extra=Object.keys(c).filter(k=>!['type','id','transactionType','summary',...fields].includes(k));if(extra.length)throw Error(`场外行动缺少字段编译：${c.type}/${extra.join(',')}`);};
export const FIELD_CONTROL_RECEIPT_TYPES=['medicine-operation','field-control-order','field-ability-used','stop-maintenance','ability-use-requested','ability-use-responded','dismiss-disguise','inspect-disguise','disclose-identity'];
export function compileFieldOperation(turn:StoryTurn,result:StoryStepResult):any{
 const c=result.receipt!;
 if(['dismiss-disguise','inspect-disguise','disclose-identity'].includes(c.type))return compileDisguiseOperation(c);
 if(c.type==='medicine-operation'){known(c,['operation','actorId','targets','exposure','exposures','payment','foodPayment','ingestion','sourceId','servingItemId','offerId','detected','decision','contact','requestHash']);return {stage:'本次用药操作已完成',...pick(c,['operation','actorId','sourceId','servingItemId','offerId','detected','decision','contact','ingestion']),targets:(c.targets??[]).map((t:any)=>({targetId:t.targetId,check:t.check,affected:t.affected,effects:t.effects.map((e:any)=>compileCommittedEffect(e,c.actorId,t.targetId))}))};}
 if(c.type==='field-control-order'){
  known(c,['orderId','actorId','executorId','domain','action','status','reason','settlement']);
  return {stage:c.summary,...pick(c,['orderId','actorId','executorId','domain','action','status','reason']),settlement:c.settlement?{type:c.settlement.type,facts:compileFieldOperation(turn,{...result,receipt:c.settlement})}:null};
 }
 if(ITEM_USE_RECEIPT_TYPES.includes(c.type))return compileItemUseReceipt(c);
 if(c.type==='travel-completed')return compileTimeReceipt(turn,c);
 if(['controlled-gift-proposed','controlled-gift-completed'].includes(c.type)){
  known(c,['actorId','commitmentId','eventId','status','commitment','itemId','delivery']);
  const agreement=compileCommitment(c.commitment),viewerId=turn.before?.player?.id??turn.after?.player?.id;
  if(![c.commitment.playerId,c.commitment.personId].includes(viewerId))for(const event of agreement.timeline)delete event.reason;
  return {stage:c.summary,actorId:c.actorId,commitmentId:c.commitmentId,eventId:c.eventId,agreement,...(c.delivery?{delivery:pick(c.delivery,['itemId','deliveredItemId','templateId','quantity','donorId','recipientId','fromContainerId','toContainerId','quantityBefore','remainingQuantity','deliveredQuantity'])}:{})};
 }
 if(c.type==='person-spoke'){
  known(c,['actorId','statement']);const r=c.statement;
  known(r,['sourceId','speakerId','listenerId','text','truth','at','order','fieldOrderRef','autonomousRef','contractOrderRef','participants','memoryContexts','hash']);
  if(r.truth!=='unverified')throw Error('发言不能直接证明内容真实');
  return {stage:'话已传达',...pick(r,['id','speakerId','listenerId','text','at','order'])};
 }
 if(['item-equipped','item-unequipped'].includes(c.type))return compileGrowthEquipmentReceipt(turn,result);
 if(c.type==='martial-soul-switched')return compileAdventureReceipt(c);
 if(c.type==='stop-maintenance'){
  known(c,['actorId','maintenance']);known(c.maintenance,['sourceId','actorId','skillId','battleId','at','event','reason']);
  return {stage:'本人已停止该来源的维持',actorId:c.actorId,maintenance:pick(c.maintenance,['sourceId','actorId','skillId','battleId','at','event','reason'])};
 }
 if(['ability-use-requested','ability-use-responded'].includes(c.type)){
  known(c,['permissionId','actorId','targetId','skillId','status','expiresAt']);return {stage:c.summary,...pick(c,['permissionId','actorId','targetId','skillId','status','expiresAt'])};
 }
 if(c.type!=='field-ability-used')throw Error(`场外行动缺少编译：${c.type}`);
 known(c,[...WORLD_EFFECT_RECEIPT_FIELDS,'requestHash','scope','actorId','skillId','targetId','targets','statusEvents','usageLedger','payment','sacrificeDeath','sourceItem','actionStateBefore','stateChanges','statusLifecycle','fieldLifecycle','maintenance','application','ingestion','contractReleaseProof','exchangeIds','backlash','exposure']);
 return {...compileWorldEffectSettlements(c),stage:c.ingestion?.swallowed===false?'强制给药未吞服':'能力已实际施放',...pick(c,['scope','actorId','skillId','targetId','application','ingestion']),paidCosts:c.payment?{operationId:c.payment.operationId,modeId:c.payment.contract.modeId,...copy(c.payment.totals),items:copy(c.payment.items)}:null,usageAfter:copy(c.usageLedger??null),sacrificeDeath:copy(c.sacrificeDeath??null),maintenance:c.maintenance?pick(c.maintenance,['sourceId','actorId','skillId','at','event','reason']):null,
  ...(c.exchangeIds?.length?{exchangeIds:copy(c.exchangeIds)}:{}),...(c.backlash?{backlash:copy(c.backlash)}:{}),targets:c.targets.map((t:any)=>({targetId:t.targetId,affected:t.affected,effects:t.effects.map((e:any)=>compileCommittedEffect(e,c.actorId,t.targetId))})),...compileBattleLifecycle(c)};
}
export function fieldOperationAccount(type:string,f:any,n:StoryEventNames,playerFacing=false):string{
 const outcome=playerFacing?playerOutcomeReading:committedOutcomeReading;
 const effectLines=(targets:any[])=>targets.flatMap((t:any)=>t.effects.flatMap((e:any)=>e.outcomes.flatMap((o:any)=>{const text=outcome(o);return text?[`${n.person(o.subjectId??t.targetId)}：${e.name}，${text}。`]:[];})));
 if(type==='medicine-operation'){
  const actions:Record<string,string>={'prepare-poisoned-serving':'将毒药混入食物或饮品','offer-disguised-drug':'提出用药建议','respond-disguised-drug':'回应了用药提议','consume-food-drink':'食用或饮用了这份食物饮品','coat-item':'为物品涂毒','apply-contact-drug':'尝试接触施毒','direct-spray':'喷出药剂','release-toxic-cloud':'释放毒雾','touch-coated-item':'尝试用涂毒物品接触目标'};
  return `${n.person(f.actorId)}${actions[f.operation]??'使用了药剂'}。${f.ingestion?.swallowed?'已经服下。':''}${f.decision==='accept'?'答应用药。':f.decision==='refuse'?'拒绝了药物。':f.decision==='inspect'?'检查了药物。':''}${f.contact?(f.contact.hit?'已接触到目标。':'未接触到目标。'):''}${effectLines(f.targets).join('')}`;
 }
 if(type==='field-control-order')return `${n.person(f.actorId)}向${n.person(f.executorId)}下达${f.domain}命令。${f.stage}${f.settlement?fieldOperationAccount(f.settlement.type,f.settlement.facts,n,playerFacing):''}`;
 if(ITEM_USE_RECEIPT_TYPES.includes(type))return itemUseEventAccount(f,n);
 if(type==='travel-completed')return timeEventAccount(type,f,n);
 if(['controlled-gift-proposed','controlled-gift-completed'].includes(type))return socialEventAccount(type,{...f,delivery:null},n);
 if(type==='person-spoke')return `${n.person(f.speakerId)}对${n.person(f.listenerId)}说：“${f.text}”`;
 if(['item-equipped','item-unequipped'].includes(type))return equipmentEventAccount(type,f,n.person(f.actorId),n.item(f.itemId));
 if(type==='martial-soul-switched')return adventureEventAccount(type,f,n.person(f.actorId),n.person,n.soul);
 if(['dismiss-disguise','inspect-disguise','disclose-identity'].includes(type))return `${n.person(f.actorId)}：${f.stage}${type==='disclose-identity'?`（${f.name}）`:''}。`;
 if(type==='stop-maintenance')return `${n.person(f.actorId)}停止维持这次施放的能力。`;
 if(['ability-use-requested','ability-use-responded'].includes(type))return `${n.person(f.actorId)}对${n.person(f.targetId)}的本次能力施用请求：${f.stage}`;
 const p=f.paidCosts,lines=[f.ingestion?.swallowed===false?`${n.person(f.actorId)}尝试对${n.person(f.targetId)}强制给药，对方反抗成功，未吞服，药物仍保留。`:`${n.person(f.actorId)}对${n.person(f.targetId)}施放了${n.skill?.(f.skillId)??'这项能力'}。`];
 if(p){const costs=[...(p.soulPower?[`魂力${p.soulPower}`]:[]),...(p.health?[`生命${p.health}`]:[]),...(p.lifespan?[`寿命${p.lifespan}分钟`]:[]),...(p.items??[]).map((i:any)=>`${n.item(i.itemId)}×${i.quantity}`)];if(costs.length)lines.push(`消耗${costs.join('、')}。`);}
 lines.push(...effectLines(f.targets),...worldEffectAccount(f,n));
 if(f.sacrificeDeath)lines.push('本次效果完成后，施术者因献祭耗尽寿命而死亡。');return lines.join('');
}
