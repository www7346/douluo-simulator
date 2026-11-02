import {rules} from '../rules';
import {compileCommittedEffect} from './committed-effect-facts';
import {compileBattleLifecycle} from './battle-lifecycle-facts';
import {committedOutcomeReading} from './committed-effect-reading';
import {scalarBattleChangesReading} from './story-battle-action-reading';
import {battleLifecycleReading} from './story-battle-lifecycle-reading';
import type {StoryEventNames} from './story-event-names';

const fields=['id','type','transactionType','summary','actorId','itemId','name','targetId','targetName','targets','statusEvents','soulPowerCost','usageLedger','sourceItem','preparedEffects','actionStateBefore','stateChanges','statusLifecycle','fieldLifecycle','payment','sacrificeDeath','exchangeIds','backlash','ingestion','exposure'];
export const ITEM_USE_RECEIPT_TYPES=['field-item-used','prebattle-pill-prepared','support-consumable-created'];
export function compileItemUseReceipt(receipt:any){
 if(receipt.type==='support-consumable-created'){
  const allowed=['id','type','transactionType','summary','entityId','itemId','recipeId','soulPowerCost','modifierSkillId','outputScale','modifierActivation','expiresAtDay','effectAtoms','quantity','itemIds','results'];
  const unknown=Object.keys(receipt).filter(k=>!allowed.includes(k));if(unknown.length)throw Error('食品制造回执含未登记字段：'+unknown.join(','));
  const recipe=rules.world.SUPPORT_CONSUMABLE_RECIPES[receipt.recipeId];if(!recipe)throw Error('食品制造配方未登记');
  const m=receipt.modifierActivation;
  if(m){const extra=Object.keys(m).filter(k=>!['skillId','name','params','soulPowerCost','usageLedger','payment','sourceItem','sacrificeDeath'].includes(k));if(extra.length)throw Error('食品增幅回执含未登记字段：'+extra.join(','));}
  return {stage:'辅助食品已经制成',actorId:receipt.entityId,item:{id:receipt.itemId,...(receipt.itemIds?{ids:structuredClone(receipt.itemIds)}:{}),name:recipe.name,quantity:receipt.quantity??1},recipeId:receipt.recipeId,outputScale:receipt.outputScale,expiresAtDay:receipt.expiresAtDay,effectAtoms:structuredClone(receipt.effectAtoms),paidSoulPower:receipt.soulPowerCost,paidCosts:m?.payment?{operationId:m.payment.operationId,sourceId:m.payment.sourceId,modeId:m.payment.contract.modeId,health:m.payment.totals.health,lifespanMinutes:m.payment.totals.lifespan,items:structuredClone(m.payment.items)}:null,modifier:m?{skillId:m.skillId,name:m.name,params:structuredClone(m.params),usageAfter:structuredClone(m.usageLedger),sourceItem:structuredClone(m.sourceItem??null)}:null,sacrificeDeath:structuredClone(m?.sacrificeDeath??null)};
 }

 const unknown=Object.keys(receipt).filter(key=>!fields.includes(key));
 if(!ITEM_USE_RECEIPT_TYPES.includes(receipt.type)||unknown.length)throw Error(`物品使用缺少编译：${receipt.type}/${unknown.join(',')}`);
 const s=receipt.sourceItem;
 const result={stage:'物品已经使用',actorId:receipt.actorId,item:{id:receipt.itemId,name:receipt.name,
  sourceKind:s?.sourceKind,quantityBefore:s?.quantityBefore??null,quantityAfter:s?.quantity??null,cooldownRemaining:s?.cooldownRemaining??null},
  paidSoulPower:receipt.payment?.totals.soulPower??receipt.soulPowerCost,
  paidCosts:receipt.payment?{operationId:receipt.payment.operationId,sourceId:receipt.payment.sourceId,modeId:receipt.payment.contract.modeId,health:receipt.payment.totals.health,lifespanMinutes:receipt.payment.totals.lifespan,items:structuredClone(receipt.payment.items)}:null,
  sacrificeDeath:structuredClone(receipt.sacrificeDeath??null),
  ...(receipt.exchangeIds?.length?{exchangeIds:structuredClone(receipt.exchangeIds)}:{}),...(receipt.backlash?{backlash:structuredClone(receipt.backlash)}:{}),
  immediateEffects:(receipt.targets??[]).map((target:any)=>({targetId:target.targetId,sourceSkillId:target.skillId,
   effects:target.effects.map((effect:any)=>compileCommittedEffect(effect,receipt.actorId,target.targetId))})),
  usageAfter:structuredClone(receipt.usageLedger??null),...compileBattleLifecycle(receipt)};
 return receipt.type==='prebattle-pill-prepared'?{...result,stage:'战前丹药已经服用',nextBattleEffects:structuredClone(receipt.preparedEffects??null)}:result;
}

export function itemUseEventAccount(f:any,n:StoryEventNames):string{
 if(f.stage==='辅助食品已经制成'){const lines=[`${n.person(f.actorId)}消耗${f.paidSoulPower}点魂力，制成一份${f.item.name}，可用至第${f.expiresAtDay}日。`];if(f.modifier)lines.push(`本次制造使用${f.modifier.name}增幅，成品效果倍率为${f.outputScale*100}%。`);if(f.paidCosts?.health)lines.push(`实际消耗生命${f.paidCosts.health}。`);if(f.paidCosts?.lifespanMinutes)lines.push(`实际消耗寿命${f.paidCosts.lifespanMinutes}分钟。`);for(const fee of f.paidCosts?.items??[])lines.push(`代价消耗${n.item(fee.itemId)}×${fee.quantity}。`);if(f.modifier?.sourceItem?.sourceKind==='consumable')lines.push(`已使用${n.item(f.modifier.sourceItem.itemId)}作为制造增幅来源。`);if(f.sacrificeDeath)lines.push('本次制造结算后，制造者因献祭耗尽寿命而死亡。');return lines.join('\n');}
 const i=f.item,lines=[`${n.person(f.actorId)}实际使用${i.name??n.item(i.id)}，支付魂力${f.paidSoulPower}。`];
 if(i.quantityBefore!==null&&i.quantityAfter!==null)lines.push(`该物品数量${i.quantityBefore} → ${i.quantityAfter}。`);
 if(f.paidCosts?.health)lines.push(`实际消耗生命${f.paidCosts.health}。`);
 if(f.paidCosts?.lifespanMinutes)lines.push(`实际消耗寿命${f.paidCosts.lifespanMinutes}分钟。`);
 for(const fee of f.paidCosts?.items??[])lines.push(`代价消耗${n.item(fee.itemId)}×${fee.quantity}。`);
 if(f.sacrificeDeath)lines.push('本次效果结算后，使用者因献祭耗尽寿命而死亡。');
 for(const target of f.immediateEffects)for(const effect of target.effects)for(const outcome of effect.outcomes)lines.push(`${n.person(outcome.subjectId??target.targetId)}：${effect.name}，${committedOutcomeReading(outcome)}。`);
 // Reuse battle readings for the same settled effect/lifecycle structures.
 for(const change of f.stateChanges)lines.push(...(scalarBattleChangesReading([change],n.person)??[]));
 for(const event of battleLifecycleReading(f,n.person)??[])lines.push(event.statement);
 if(f.nextBattleEffects)lines.push(`已为下一场战斗准备：${f.nextBattleEffects.map((e:any)=>`${e.attribute}增加${e.value}、持续${e.rounds}回合`).join('；')}。这些增幅在下一场开战时生效。`);
 return lines.join('\n');
}
