/** Compile the recorded ending and later settlement as distinct points in time.
 * This is factual source material for the author, not the delivered novel. */
import {isHistoricalProjection,HISTORICAL_PROJECTION_MEANING} from '../shared/historical-projection';
const statuses:Record<string,string>={active:'仍在参战',defeated:'已被击败',escaped:'已脱离战斗',surrendered:'已投降'};
function unitState(unit:any){return [
 typeof unit.life==='string'&&unit.life?`存活状态为${unit.life}`:null,
 Number.isFinite(unit.hp)?`生命为${unit.hp}`:null,
 typeof unit.memberStatus==='string'?`参战状态为${statuses[unit.memberStatus]??unit.memberStatus}`:null,
].filter(Boolean).join('，')||'状态未记录';}

/** Read the recorded interval checkpoint, never the current world or final frame. */
export function storyBattleCheckpointSummary(checkpoint:any,label:string):string{
 if(!checkpoint?.known)return `${label}：${checkpoint?.reason??'检查点未记录'}。`;
 const units=checkpoint.units??[];
 if(!units.length)return `${label}：未记录单位状态。`;
 return `${label}：`+units.map((u:any)=>{
  const name=u.name??u.id,display=units.filter((v:any)=>(v.name??v.id)===name).length>1?`${name}（${u.id}）`:name;
  const values=u.values??{};
  return display+unitState({life:values.存活状态,hp:values.生命,memberStatus:values.参战状态});
 }).join('；')+'。';
}

export function storyBattleConclusion(battle:any):string{
 if(battle.status!=='已结束')return `所附战斗记录：${battle.status}。`;
 const units=battle.closing?.units??[],settled=battle.aftermath?.units??[];
 const display=(unit:any)=>{
  const name=unit.name??unit.id;
  const sameName=new Set([...units,...settled].filter(u=>(u.name??u.id)===name).map(u=>u.id));
  return sameName.size>1?`${name}（${unit.id}）`:name;
 };
 const state=unitState;
 const round=battle.outcome?.endedRound;
 const lines=[...(battle.classification?[`本场战斗类型为${battle.classification.name}。`]:[]),`这场战斗${Number.isSafeInteger(round)&&round>0?`于第${round}回合`:''}结束${typeof battle.outcome?.outcome==='string'?`，记录的战果为${battle.outcome.outcome}`:''}。`];
 if(isHistoricalProjection(battle.context))lines.unshift(HISTORICAL_PROJECTION_MEANING);
 if(battle.completeFromStart===false)lines.push('这份经过从战斗中途开始留存。');
 if(units.length)lines.push('战斗结束时：'+units.map((unit:any)=>`${display(unit)}${state(unit)}`).join('；')+'。');
 if(battle.settlement?.operation)lines.push(`随后${battle.settlement.operation}。`);
 if(settled.length)lines.push('场外结算后：'+settled.map((unit:any)=>`${display(unit)}${state(unit)}`).join('；')+'。');
 return lines.join('\n');
}
