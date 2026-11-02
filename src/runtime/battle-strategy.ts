import {rules} from '../rules';
export interface BattleStrategy {focusTargetId:string|null;protectTargetId:string|null;reservePercent:number;retreatPercent:number}
export function validateBattleStrategy(value:any):void {
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['focusTargetId','protectTargetId','reservePercent','retreatPercent'].includes(k)))throw Error('战术字段无效');
 for(const key of ['focusTargetId','protectTargetId'])if(value[key]!==null&&(typeof value[key]!=='string'||!value[key]||value[key].length>160))throw Error('战术目标无效');
 for(const key of ['reservePercent','retreatPercent'])if(!Number.isInteger(value[key])||value[key]<0||value[key]>100)throw Error('战术比例必须为0到100的整数');
}
export function setBattleStrategy(state:any,payload:any){
 if(state.战斗?.状态!=='进行中')throw Error('请在当前遭遇开始后制定战术');
 const strategy:BattleStrategy={focusTargetId:payload.focusTargetId==='none'?null:payload.focusTargetId,protectTargetId:payload.protectTargetId==='none'?null:payload.protectTargetId,reservePercent:payload.reservePercent,retreatPercent:payload.retreatPercent};
 validateBattleStrategy(strategy);
 const player=state.战斗单位.列表[state.角色.主控单位ID];
 for(const [key,friendly] of [['focusTargetId',false],['protectTargetId',true]] as const){const id=strategy[key];if(!id)continue;
  const unit=state.战斗单位.列表[id];if(!unit||!rules.combat.isActiveParticipant(state,id)||rules.combat.sameSide(state,player,unit)!==friendly)throw Error(friendly?'保护目标必须是当前可行动的队友':'集火目标必须是当前可行动的敌人');
 }
 state.战斗.扩展.strategy=strategy;
 return {state,receipt:{type:'battle-strategy',strategy:structuredClone(strategy),summary:'已更新本场自动战斗战术'}};
}
