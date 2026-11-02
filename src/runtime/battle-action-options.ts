import {rules} from '../rules';
import {isSealedValue} from '../shared/frozen-snapshot';

export function battleActionOptions(state:any,actorId:string):any[]{
 if(state.战斗?.状态!=='进行中'||state.战斗.当前行动单位ID!==actorId)return [];
 const order=rules.influence.pendingOrder(state,actorId);
 if(order)return [{id:'tactic:obey',name:'执行控制命令',sourceKind:'tactic',actionType:'放弃行动',available:true,description:`${state.战斗单位.列表[order.issuerId]?.名称??'施术者'}命令：${order.intent.type}；条件不满足则本回合失败。`,controlOrder:rules.influence.facts(state,actorId).pendingOrder}];
 const impairment=rules.combat.actionImpairment(state,actorId);
 return [...rules.combat.listCurrentActions(state,actorId,isSealedValue).map((action:any)=>impairment.reason?{...action,available:false,reason:`当前因${impairment.reason}无法采取主行动`}:action),...rules.combat.listTacticalActions(state,actorId)];
}
