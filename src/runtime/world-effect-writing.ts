import type {StoryEventNames} from './story-event-names';

export const WORLD_EFFECT_RECEIPT_FIELDS=['periodicEffectSettlements','creationSettlements'];
export function compileWorldEffectSettlements(receipt:any){
 const periodic=(receipt.periodicEffectSettlements??[]).map((row:any)=>{
  const keys=['eventId','statusId','sourceUnitId','sourceSkillId','targetId','at','pulseAt','before','amount','remainingHp','event'];
  if(Object.keys(row).some(k=>!keys.includes(k))||row.event!=='world-regeneration-tick'||!Number.isSafeInteger(row.amount)||row.amount<0||row.remainingHp!==row.before+row.amount||!Number.isSafeInteger(row.at)||row.pulseAt>row.at)throw Error('持续生命恢复缺少实际结算');
  return structuredClone(row);
 });
 const creation=(receipt.creationSettlements??[]).map((row:any)=>{
  const keys=['eventId','constructId','kind','actorId','targetId','sourceId','skillId','at','event','reason','unitId','durabilityBefore','durabilityAfter','damage','remainsId'];
  if(Object.keys(row).some(k=>!keys.includes(k))||!['wall','summon'].includes(row.kind)||!['ended','wall-damaged','battle-bound','possessions-left','materials-collected'].includes(row.event)||!Number.isSafeInteger(row.at))throw Error('构造物经历缺少实际结算');
  if(row.event==='wall-damaged'&&(row.durabilityAfter!==Math.max(0,row.durabilityBefore-row.damage)||row.damage<0))throw Error('墙体损耗与实际数值不符');
  return structuredClone(row);
 });
 return {...(periodic.length?{periodicEffectSettlements:periodic}:{}),...(creation.length?{creationSettlements:creation}:{})};
}
export function worldEffectAccount(facts:any,names:StoryEventNames){
 const lines:string[]=[];
 for(const row of facts.periodicEffectSettlements??[])lines.push(`${names.person(row.targetId)}的持续再生实际恢复${row.amount}点生命，生命${row.before} → ${row.remainingHp}。`);
 const reasons:Record<string,string>={expired:'持续时间已到',destroyed:'已经被摧毁','source-dead':'施术者死亡',manual:'施术者主动解除','effects-ended':'持续来源结束','source-invalidated':'持续来源失效'};
 for(const row of facts.creationSettlements??[]){
  const name=row.kind==='wall'?'元素屏障':'召唤实体';
  if(row.event==='ended')lines.push(`${name}因${reasons[row.reason]??'持续条件结束'}消散。`);
  else if(row.event==='wall-damaged')lines.push(`屏障实际承担攻击，耐久${row.durabilityBefore} → ${row.durabilityAfter}。`);
  else if(row.event==='possessions-left')lines.push('召唤实体持有的物品与剩余材料留在原场景，可以实际拾取。');
  else if(row.event==='materials-collected')lines.push('构造遗留材料已实际领取。');
  else lines.push('已有构造实体以原有生命与剩余期限加入战斗。');
 }
 return lines;
}
