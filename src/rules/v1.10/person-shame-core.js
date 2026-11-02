(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulPersonShame=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const POLICY=Object.freeze({minimum:0,maximum:100,adaptationPerHour:2,appraisalSteps:Object.freeze({none:0,mild:5,noticeable:10,strong:20})});
 const clone=v=>JSON.parse(JSON.stringify(v)),hash=v=>globalThis.SoulAbilityContract.hash(v),now=s=>globalThis.SoulPersonCore.now(s),clamp=n=>Math.max(POLICY.minimum,Math.min(POLICY.maximum,n));
 const table=s=>s.扩展?.personShame??{version:1,events:[]},get=(s,id)=>s.人物?.列表?.[id]?.扩展?.shame??null,value=(s,id)=>get(s,id)?.value??0;
 const stamp=v=>{delete v.hash;v.hash=hash(v);return v;},valid=v=>!!v&&v.hash===hash(Object.fromEntries(Object.entries(v).filter(([k])=>k!=='hash')));
 function appraisal(input){
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join(',')!=='degree,direction,reason'||!Object.hasOwn(POLICY.appraisalSteps,input.degree)||!['increase','decrease','unchanged'].includes(input.direction)||typeof input.reason!=='string'||!input.reason.trim()||input.reason.length>600||input.degree==='none'&&input.direction!=='unchanged'||input.degree!=='none'&&input.direction==='unchanged')throw Error('羞耻感受须选择无、轻微、明显或强烈及对应增减方向，不能直接指定数值');
  return {...clone(input),reason:input.reason.trim()};
 }
 function triggerEvidence(s,personId,trigger,decisionOrder=Infinity){
  if(trigger?.kind!=='experience')return null;
  const social=globalThis.SoulWorldSocial,db=social.table(s),observation=db.observations.find(o=>o.id===trigger.observationId&&o.observerId===personId&&o.factId===trigger.id),fact=db.facts[trigger.id],experience=fact?.subject?.experience;
  if(!valid(observation)||!valid(fact)||fact.kind!=='personal-experience'||!['participant','witness'].includes(observation.channel)||observation.learnedOrder!==trigger.order||observation.learnedAt!==trigger.at||observation.learnedOrder>=decisionOrder||!experience||trigger.rootId!==`experience:${experience.source.kind}:${experience.source.id}`)return null;
  if(decisionOrder===Infinity?!social.known(s,personId).some(k=>k.observation.id===observation.id):!social.remembersAtOrder(s,personId,observation.learnedOrder,decisionOrder))return null;
  try{const actual=globalThis.SoulExperiences.describe(s,experience.source,fact.subject.personId);if(hash(actual)!==hash(experience))return null;}catch{return null;}
  return {rootId:trigger.rootId,observationId:observation.id,factId:fact.id,source:clone(experience.source),experience:clone(experience),channel:observation.channel};
 }
 function appraisalContext(s,personId,trigger){const evidence=triggerEvidence(s,personId,trigger);return {eligible:!!evidence,current:value(s,personId),steps:clone(POLICY.appraisalSteps),source:evidence?{rootId:evidence.rootId,experience:evidence.experience,channel:evidence.channel}:null,meaning:evidence?'只评价这次本人当时实际感知、目前仍记得的经历如何影响当前羞耻感；按本人性格判断，可以完全没有变化。':'本次触发没有本人直接感知的正式经历依据，羞耻评价须为none/unchanged；消息中的说法不自动成为已经发生的动作。'};}
 function source(s,decisionId){
  const d=globalThis.SoulConversations.table(s).decisions.find(d=>d.id===decisionId);if(!valid(d)||!d.decision?.appraisal)return null;
  const assessment=appraisal(d.decision.appraisal),evidence=triggerEvidence(s,d.personId,d.trigger,d.order);
  if(!evidence&&assessment.degree!=='none')throw Error('羞耻变化缺少本人当时实际知情且记得的经历');
  if(!evidence)return null;
  return {personId:d.personId,decisionId:d.id,at:d.at,order:d.order,assessment,...evidence};
 }
 function awareness(s,personId,at=now(s),order=s.扩展.personEventSequence??0){
  const proof=globalThis.SoulWorldSocial.communicationProof(s,personId),perceiving=globalThis.SoulWorldSocial.validCommunicationProof(s,proof,personId,false,at,order)&&globalThis.SoulInfluenceCore.autonomyAt(s,personId,at,order).canDecide&&(!globalThis.SoulSealingCore?.isStasis(s,personId)||!!proof.carrier);
  return {at,order,perceiving:!!perceiving,proof:clone(proof)};
 }
 function validAwareness(s,personId,a){
  if(!a||Object.keys(a).sort().join(',')!=='at,order,perceiving,proof'||!Number.isSafeInteger(a.at)||a.at<0||a.at>now(s)||!Number.isSafeInteger(a.order)||a.order<0||a.order>(s.扩展.personEventSequence??0)||typeof a.perceiving!=='boolean')return false;
  const proof=a.proof,perceiving=globalThis.SoulWorldSocial.validCommunicationProof(s,proof,personId,false,a.at,a.order)&&globalThis.SoulInfluenceCore.autonomyAt(s,personId,a.at,a.order).canDecide;
  return a.perceiving===!!perceiving;
 }
 function saveEvent(s,e,carryMinutes,a){
  s.扩展.personShame??={version:1,events:[]};table(s).events.push(stamp(e));const person=s.人物.列表[e.personId];person.扩展??={};person.扩展.shame={version:1,value:e.after,lastAt:e.at,carryMinutes,awareness:a,lastEventId:e.id};return clone(e);
 }
 function advanceOne(s,personId,at,force=false){
  const r=get(s,personId);if(!r||!force&&r.value===0)return null;if(!Number.isSafeInteger(at)||at!==now(s)||at<r.lastAt)throw Error('羞耻适应须按真实世界时刻顺序推进');
  const proposed=awareness(s,personId),minutes=at-r.lastAt;
  if(!minutes&&proposed.perceiving===r.awareness.perceiving)return null;
  const eligibleMinutes=r.awareness.perceiving?minutes:0,total=r.carryMinutes+eligibleMinutes,hours=Math.floor(total/60),after=clamp(r.value-hours*POLICY.adaptationPerHour),carryMinutes=after===0?0:total%60,order=globalThis.SoulPersonCore.nextEventOrder(s),a=awareness(s,personId,at,order);
  return saveEvent(s,{id:`person-shame:clock:${personId}:${order}`,type:'adaptation',personId,at,order,from:r.lastAt,before:r.value,requestedDelta:-hours*POLICY.adaptationPerHour,delta:after-r.value,after,eligibleMinutes,carryBefore:r.carryMinutes,carryAfter:carryMinutes,previousAwareness:clone(r.awareness),awareness:a},carryMinutes,a);
 }
 function applyConversation(s,decisionId){
  const evidence=source(s,decisionId);if(!evidence||evidence.assessment.degree==='none')return null;
  const prior=table(s).events.find(e=>e.type==='appraisal'&&e.personId===evidence.personId&&e.rootId===evidence.rootId);if(prior)return clone(prior);
  if(evidence.at!==now(s))throw Error('羞耻感受必须随本次实际人物决定结算');
  advanceOne(s,evidence.personId,now(s),true);const before=value(s,evidence.personId),magnitude=POLICY.appraisalSteps[evidence.assessment.degree],requestedDelta=evidence.assessment.direction==='increase'?magnitude:-magnitude,after=clamp(before+requestedDelta);
  if(!get(s,evidence.personId)&&after===0)return null;
  const order=globalThis.SoulPersonCore.nextEventOrder(s),a=awareness(s,evidence.personId,now(s),order);
  return saveEvent(s,{id:`person-shame:appraisal:${decisionId}`,type:'appraisal',personId:evidence.personId,at:now(s),order,source:{kind:'conversation',id:decisionId},rootId:evidence.rootId,observationId:evidence.observationId,assessment:clone(evidence.assessment),before,requestedDelta,delta:after-before,after,carryAfter:0,awareness:a},0,a);
 }
 function advanceAt(s,at=now(s)){for(const person of Object.values(s.人物?.列表??{}))if(person.扩展?.shame?.value>0)advanceOne(s,person.id,at);}
 function nextAt(s,through=Infinity){const due=Object.values(s.人物?.列表??{}).map(p=>get(s,p.id)).filter(r=>r?.value>0&&r.awareness.perceiving).map(r=>r.lastAt+60-r.carryMinutes).filter(at=>at>now(s)&&at<=through);return due.length?Math.min(...due):null;}
 function facts(s,viewerId,subjectId=viewerId){
  if(viewerId!==subjectId||!s.人物?.列表?.[subjectId])return null;
  const remembered=new Set(globalThis.SoulWorldSocial.known(s,subjectId).map(k=>k.observation.id)),changes=table(s).events.filter(e=>e.personId===subjectId&&e.type==='appraisal'&&remembered.has(e.observationId)).slice(-12).map(e=>({at:e.at,source:clone(e.source),degree:e.assessment.degree,direction:e.assessment.direction,reason:e.assessment.reason,delta:e.delta,after:e.after}));
  return {personId:subjectId,value:value(s,subjectId),minimum:POLICY.minimum,maximum:POLICY.maximum,changes,adaptationPerHour:POLICY.adaptationPerHour,meaning:'本人当前感受到的羞耻程度；与服从、好感、是否同意分别独立。平稳清醒并有自主感知时逐渐适应，静滞、失能或精神接管期间不照常适应。精确感受和私有评价理由不属于其他人物的已知事实。'};
 }
 function validate(s){
  const db=s.扩展?.personShame;if(!db){return Object.values(s.人物?.列表??{}).some(p=>p.扩展?.shame!==undefined)?['人物羞耻字段缺少真实经历账本']:[];}
  if(db.version!==1||!Array.isArray(db.events))return ['人物羞耻账本结构无效'];
  const errors=[],latest=new Map(),ids=new Set(),roots=new Set();
  for(const e of db.events)try{
   const previous=latest.get(e.personId);if(!s.人物?.列表?.[e.personId]||!valid(e)||ids.has(e.id)||!Number.isSafeInteger(e.at)||e.at<0||e.at>now(s)||!Number.isSafeInteger(e.order)||e.order>(s.扩展.personEventSequence??0)||previous&&(e.at<previous.at||e.order<=previous.order)||e.before!==(previous?.after??0)||!validAwareness(s,e.personId,e.awareness)||e.awareness.at!==e.at||e.awareness.order!==e.order)throw Error('真实时刻、感知或前值');
   if(e.type==='appraisal'){
    const evidence=source(s,e.source?.id),root=e.personId+':'+e.rootId;if(!evidence||e.source.kind!=='conversation'||e.id!==`person-shame:appraisal:${evidence.decisionId}`||evidence.personId!==e.personId||evidence.at!==e.at||evidence.order>=e.order||e.rootId!==evidence.rootId||e.observationId!==evidence.observationId||hash(e.assessment)!==hash(evidence.assessment)||roots.has(root)||e.assessment.degree==='none'||e.carryAfter!==0)throw Error('本人感知的唯一评价来源');
    const magnitude=POLICY.appraisalSteps[e.assessment.degree],requested=e.assessment.direction==='increase'?magnitude:-magnitude;if(e.requestedDelta!==requested||e.after!==clamp(e.before+requested)||e.delta!==e.after-e.before)throw Error('有界感受结算');roots.add(root);
   }else if(e.type==='adaptation'){
    if(!previous||e.id!==`person-shame:clock:${e.personId}:${e.order}`||e.from!==previous.at||hash(e.previousAwareness)!==hash(previous.awareness)||e.carryBefore!==previous.carryAfter)throw Error('适应起点');
    const minutes=previous.awareness.perceiving?e.at-e.from:0,total=e.carryBefore+minutes,requested=-Math.floor(total/60)*POLICY.adaptationPerHour,after=clamp(e.before+requested);if(e.eligibleMinutes!==minutes||e.requestedDelta!==requested||e.after!==after||e.delta!==after-e.before||e.carryAfter!==(after===0?0:total%60))throw Error('实际自主感知时间');
   }else throw Error('未知羞耻变化');
   if(!Number.isSafeInteger(e.after)||e.after<POLICY.minimum||e.after>POLICY.maximum)throw Error('羞耻范围');ids.add(e.id);latest.set(e.personId,e);
  }catch(error){errors.push(`人物羞耻${e.id}无效：${error.message}`);}
  for(const person of Object.values(s.人物?.列表??{})){const record=get(s,person.id),last=latest.get(person.id);if(!record&&!last)continue;const expected=last?{version:1,value:last.after,lastAt:last.at,carryMinutes:last.carryAfter,awareness:last.awareness,lastEventId:last.id}:null;if(hash(record)!==hash(expected))errors.push(`人物${person.id}当前羞耻没有对应的经历结算`);}
  return errors;
 }
 return Object.freeze({POLICY,table,get,value,appraisal,appraisalContext,triggerEvidence,source,applyConversation,advanceAt,nextAt,facts,validate});
});
