import {rules} from '../rules';
import {exchangeBurdenText as burdenCopy,exchangeModeCopy} from '../shared/exchange-copy';
import type {ExchangeCopyOptions} from '../shared/exchange-copy';
export {exchangeModeCopy} from '../shared/exchange-copy';

/** Formats declared restrictions; all matching, pricing and settlement stay in the rules. */
export function exchangeBurdenText(b:any,options:ExchangeCopyOptions={}){
 const defaults=rules.effects.EFFECT_REGISTRY[b.effectId==='ability.lock'?'status.power_seal':b.effectId]?.parameterDefaults??{};
 return burdenCopy(b,{...options,defaults:{...defaults,...options.defaults}});
}

export function exchangeLines(source:any,kind='skill',state:any={}){
 return rules.exchange.describe(source.exchangeContracts??[],kind).map((c:any)=>{
  const copy=exchangeModeCopy[c.mode],original=source.exchangeContracts.find((v:any)=>v.id===c.id);
  const burdens=c.burdens.map((b:any,i:number)=>exchangeBurdenText({...b,lockedAbilities:original?.burdens[i]?.lockedAbilities},{mode:c.mode,durationMinutes:c.durationMinutes,state})).join('；');
  return `${copy.title} · ${c.mode==='condition'?'需要已有的限制':'发动时承担的限制'}：${burdens}。${copy.description}`;
 });
}
export function exchangeStateFacts(state:any,id:string){
 const statuses=rules.combat.listStatusViews(state,id);
 const records=(Object.values(state.扩展?.abilityExchanges??{}) as any[]).filter(r=>r.actorId===id&&r.status==='active').map(r=>({id:r.id,name:r.sourceSnapshot.name,mode:r.contract.mode,lines:exchangeLines({exchangeContracts:[r.contract]},r.kind,state),remainingMinutes:r.contract.mode==='fixed'?Math.max(0,r.contract.durationMinutes-(rules.sealing.personalNow(state,id)-rules.sealing.personalNow(state,id,r.startedAt))):null,sourceIds:[...r.selfStatusIds,...r.supportingStatusIds],benefitRefs:r.benefitRefs}));
 return {statuses,records,breakableStatusIds:rules.controls.breakable(state,id).map((s:any)=>s.id),desire:rules.exchange.desireFacts(state,id),effectiveAttributes:rules.foundation.battleAttributeView(state,state.战斗单位.列表[id]).attributes.有效};
}
