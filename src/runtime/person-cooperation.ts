import {rules} from '../rules';
import {pendingCooperationResponses} from '../shared/person-cooperation';

/** Only the internal signed workflow may choose an NPC response. Identity comes from the proposal. */
export function respondNpcCooperation(state:any,input:any,sourceId:string){
 if(!input||Object.keys(input).some(k=>!['cooperationId','decision'].includes(k)))throw Error('合作回应字段无效');
 const r=pendingCooperationResponses(state).find(r=>r.id===input.cooperationId),d=input.decision;
 if(!r||rules.cooperation.responseReason(state,r))throw Error('没有可由该人物当面回应的原合作提议');
 if(!d||typeof d!=='object'||Array.isArray(d)||Object.keys(d).some(k=>!['accept','reason'].includes(k))||typeof d.accept!=='boolean'||typeof d.reason!=='string'||!d.reason.trim()||d.reason.length>600)throw Error('人物须明确接受或拒绝，并给出自己的理由');
 const result=rules.world.settleIntent(state,{id:sourceId,type:'respond-person-cooperation',actorId:r.memberId,cooperationId:r.id,...d});
 for(const step of result.state.扩展?.story?.active?.results??[])if(step.receipt?.type==='person-cooperation'&&step.receipt.cooperationId===r.id){step.receipt.status=result.receipt.status;step.receipt.summary=result.receipt.summary;}
 return result;
}
