import {rules} from '../rules';
export function pendingNpcRestraintPermissions(state:any,scope?:{requestIds:ReadonlySet<string>;preparationIds:ReadonlySet<string>;sourceIds:ReadonlySet<string>}):any[]{
 return [...rules.preparations.pendingPermissions(state,scope),...rules.custody.pendingRequestedPermissions(state,scope?.requestIds).filter((r:any)=>{
  const origin=rules.custody.table(state).events.find((e:any)=>e.id===r.requestEventId);
  return r.ownerId!==state.角色.主控单位ID&&rules.social.remembers(state,r.ownerId,origin.at,[],origin.order);
 })];
}
export function decideNpcRestraintPermission(state:any,input:any,sourceId:string){
 if(!input||Object.keys(input).some(k=>!['decisionKey','decision'].includes(k)))throw Error('装配配合只接受原待办编号与本人决定');
 const old=rules.custody.table(state).events.find((e:any)=>e.type==='restraint-permission-decided'&&e.sourceId===sourceId);
 const r=old?{ownerId:old.actorId,key:input.decisionKey,requestEventId:old.requestEventId}:pendingNpcRestraintPermissions(state).find((r:any)=>r.key===input.decisionKey);if(!r||r.ownerId===state.角色.主控单位ID)throw Error('本人没有这项待回应装配请求或复戴失败');
 if(r.requestEventId){
  const d=input.decision;if(!d||Array.isArray(d)||Object.keys(d).some(k=>!['accept','reason'].includes(k)))throw Error('本人装配决定只接受是否同意及理由');
  return rules.world.settleIntent(state,{id:sourceId,type:'decide-restraint-permission-request',actorId:r.ownerId,permissionId:r.key,accept:d.accept,reason:d.reason});
 }
 return rules.world.settleIntent(state,{id:sourceId,type:'decide-cooperation-restraint-permission',actorId:r.ownerId,decisionKey:r.key,decision:input.decision});
}
