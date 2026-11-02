import {rules} from '../rules';
/** NPC identity is derived from the original proposal and never accepted from the caller. */
export function respondNpcPerformanceAgreement(state:any,input:any,sourceId:string){
 if(!input||Object.keys(input).some(k=>!['agreementId','decision'].includes(k)))throw Error('协议回应字段无效');
 const r=rules.performanceAgreements.pending(state).find((r:any)=>r.id===input.agreementId),d=input.decision;
 if(!r)throw Error('没有可由该人物本人回应的原协议');
 if(!d||typeof d!=='object'||Array.isArray(d)||Object.keys(d).some(k=>!['accept','reason'].includes(k))||typeof d.accept!=='boolean'||typeof d.reason!=='string'||!d.reason.trim()||d.reason.length>600)throw Error('人物须明确接受或拒绝，并给出自己的理由');
 const result=rules.world.settleIntent(state,{id:sourceId,type:'respond-performance-agreement',actorId:r.subjectId,agreementId:r.id,...d});
 for(const step of result.state.扩展?.story?.active?.results??[])if(step.receipt?.type==='performance-agreement'&&step.receipt.agreementId===r.id){step.receipt.status=result.receipt.status;step.receipt.summary=result.receipt.summary;}
 return result;
}
