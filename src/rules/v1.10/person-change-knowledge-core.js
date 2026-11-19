(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulPersonChangeKnowledge=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';if(typeof require==='function'&&!globalThis.SoulPersonPresentation)require('../../shared/person-presentation-core.js');
 const clone=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
 const hash=v=>globalThis.SoulAbilityContract.hash(v),same=(a,b)=>hash(a??null)===hash(b??null);
 const now=s=>globalThis.SoulPersonCore.now(s),next=s=>globalThis.SoulPersonCore.nextEventOrder(s);
 const turn=s=>Math.max(0,Number(s.扩展?.story?.active?.number??s.扩展?.story?.nextTurn-1)||0);
 const stamp=r=>{const {hash:_,...body}=r;r.hash=hash(body);return r;};
 const signed=r=>{if(!r)return false;const {hash:h,...body}=r;return h===hash(body);};
 const rows=s=>s.扩展?.personaRewrites?.experiences??[];
 function operatorIdentity(s,id){const p=s.人物?.列表?.[id];if(p)return {id:p.id,name:p.name};const u=s.战斗单位?.列表?.[id];return u?{id:u.id,name:u.名称}:null;}
 function store(s){s.扩展??={};s.扩展.personaRewrites??={version:1,grants:{},patches:{},baselines:{},materialized:{}};return s.扩展.personaRewrites.experiences??=[];}
 function recording(s,id){const carrier=globalThis.SoulConsciousness?.carrierForPerson(s,id),unitId=carrier?.unitId??id,p=s.人物?.列表?.[id],u=s.战斗单位?.列表?.[unitId];return !!p&&p.status!=='dead'&&(!u||u.存活状态==='存活'&&u.资源.生命.当前>0)&&(!!carrier||!globalThis.SoulSealingCore?.isStasis(s,id))&&!globalThis.SoulControlCore.active(s,unitId).some(r=>['status.sleep','status.stun'].includes(r.模板ID));}
 function conscious(s,id){return recording(s,id)&&!globalThis.SoulInfluenceCore?.autonomy(s,id).puppet;}
 function sees(s,id,target){try{return recording(s,id)&&globalThis.SoulActionContext.perception(s,id,target,'vision');}catch{return false;}}
 function proof(s,id,basis,operatorVisible=false){const autonomous=conscious(s,id);return {personId:id,basis,operatorVisible,position:clone(globalThis.SoulConsciousness?.positionOf(s,id)??globalThis.SoulActionContext.positionOf(s,id)),...(globalThis.SoulConsciousness?.proof(s,id)?{carrier:globalThis.SoulConsciousness.proof(s,id)}:{}),conscious:autonomous,...(!autonomous?{recordingSources:globalThis.SoulInfluenceCore.controlled(s,id).filter(r=>r.kind==='status.mind_control').map(r=>r.sourceStatusId)}:{})};}
 function source(s,kind,id){return kind==='control'?s.扩展?.controlEpisodes?.[id]:kind==='disguise'?s.扩展?.disguises?.episodes?.[id]:kind==='body'?s.扩展?.bodyChanges?.[id]:kind==='patch'?s.扩展?.personaRewrites?.patches?.[id]:kind==='cognition'?s.扩展?.cognitionChanges?.[id]:kind==='appearance-edit'?s.扩展?.playerAppearanceEdits?.records?.find(r=>r.id===id):rows(s).find(r=>r.id===id);}
 function live(s,r){return r.retention==='保留'||!r.endedOrder&&s.状态实例?.列表?.[r.sourceStatusId]?.状态==='生效';}
 /** The current replacement, rather than every historical layer, defines memory. */
 const memoryCutoff=(...args)=>globalThis.SoulPersonPresentation.memoryCutoff(...args),remembers=(...args)=>globalThis.SoulPersonPresentation.remembers(...args);
 const visible=p=>({gender:p.gender??null,appearance:p.appearance??null});
 // The materializer adds this fixed current-sex prefix; it is not a second
 // physical change when an unseen round trip returns to the original shape.
 const sameVisible=(a,b)=>same({...a,appearance:typeof a.appearance==='string'?a.appearance.replace(/^身体呈[男女]性形态；原有衣着与特征：/,''):a.appearance},{...b,appearance:typeof b.appearance==='string'?b.appearance.replace(/^身体呈[男女]性形态；原有衣着与特征：/,''):b.appearance});
 function directOperator(s,r,phase,at=now(s)){
  if(phase!=='applied')return false;
  const contract=r.contract??s.扩展?.cognitionChanges?.[s.扩展?.personaRewrites?.grants?.[r.grantId]?.cognitionId]?.contract;
  // A delayed mental edit, a poison exposure, and a source ending do not identify
  // a culprit merely because a person happens to stand beside the target.
  const passive=contract?.effectGraph?.branches?.some(b=>b.activation==='passive'&&b.nodeIds?.includes(r.source?.效果ID));
  const actorId=r.actorId??r.subjectId,origin=contract?.effectGraph?.nodes?.find(n=>n.id===r.source?.效果ID);
  return !!(contract&&!r.source?.领域ID&&!passive&&actorId&&r.appliedAt===at&&(r.startedAt===undefined||r.startedAt===r.appliedAt&&origin?.params.改造方式==='立即')&&contract.effectGraph?.nodes?.some(n=>['release.touch','release.melee','release.projectile','release.line','release.cone'].includes(n.effectId))&&!['poison','medicine','consumable'].includes(contract.sourceKind));
 }
 function releasePerceptions(s,actorId,targetIds){return [...new Set(targetIds??[])].filter(id=>!!s.人物?.列表?.[globalThis.SoulInfluenceCore?.personId(s,id)??id]).map(targetUnitId=>{
  const targetId=globalThis.SoulInfluenceCore?.personId(s,targetUnitId)??targetUnitId,carrier=globalThis.SoulConsciousness?.personForCarrier(s,actorId),operatorId=carrier?.source.kind==='resident-projection'?carrier.personId:actorId,visible=recording(s,targetId)&&sees(s,targetId,actorId);
  return {targetUnitId,targetId,actorId,operatorId,at:now(s),visible,observer:visible?proof(s,targetId,'experienced',true):null,operatorPosition:clone(globalThis.SoulScenePosition.positionOf(s,actorId))};
 });}
 /** Stored on the original episode before its source hash is sealed. */
 function captureOperator(s,r){
  const actorId=r.actorId??r.subjectId;if(!directOperator(s,r,'applied')||!recording(s,r.targetId)||!sees(s,r.targetId,actorId))return null;
  const status=r.status??s.状态实例?.列表?.[r.sourceStatusId],perception=status?.扩展?.施术感知;if(!perception?.visible)return null;
  return {sourceId:r.id,...clone(perception)};
 }
 function validOperatorObservation(s,r){
  const p=r?.operatorObservation;if(!p||p.sourceId!==r.id||p.at!==r.appliedAt||p.actorId!==(r.actorId??r.subjectId)||p.observer?.personId!==r.targetId||p.observer.operatorVisible!==true||!p.visible||!p.operatorPosition||!directOperator(s,r,'applied',p.at))return false;
  const action=globalThis.SoulPersonContracts?.table(s).actions.find(x=>x.kind==='person-change-release'&&x.sourceId===r.source.结算单ID),receipt=action?.receipt,perception=receipt?.contractReleaseProof?.perceptions?.find(v=>v.targetUnitId===r.sourceTargetId&&v.actorId===p.actorId),{sourceId:_,...body}=p;
  const status=r.status??s.状态实例?.列表?.[r.sourceStatusId],current=s.状态实例?.列表?.[r.sourceStatusId??r.id];
  return !!status&&status.id===(r.sourceStatusId??r.id)&&globalThis.SoulCombatEngine.validateControlSourceProof(status,r.sourceTargetId,r.appliedAt,s)&&same(body,status.扩展?.施术感知)&&(!current||same(current.扩展?.施术感知,status.扩展?.施术感知)&&current.扩展.来源合同指纹===status.扩展.来源合同指纹)&&!!action&&signed(action)&&globalThis.SoulPersonContracts.paidReleaseValid(s,receipt,action.source)&&same(body,perception)&&receipt.targets?.some(t=>t.targetId===r.sourceTargetId&&t.effects.some(e=>e.statusId===(r.sourceStatusId??r.id)));
 }
 /** Called only by the formal materializer after it has selected the real layer. */
 function transition(s,{sourceKind,sourceId,targetId,phase='applied',before,after}){
  const b=visible(before),a=visible(after);if(sameVisible(a,b))return null;
  const original=source(s,sourceKind,sourceId);if(!original)return null;
  const actorId=original.actorId??original.subjectId,order=next(s),id='change:'+hash({sourceKind,sourceId,phase,order,targetId}),direct=directOperator(s,original,phase);
  const observers=[];
  for(const id of Object.keys(s.人物?.列表??{})){
   if(!recording(s,id))continue;
   const physicalTarget=sourceKind==='disguise'?original.sourceTargetId:targetId,carrier=globalThis.SoulConsciousness?.carrierForPerson(s,id);
   if(id===targetId&&(carrier?carrier.unitId!==physicalTarget:physicalTarget!==targetId))continue;
   if(id!==targetId&&!sees(s,id,physicalTarget))continue;
   const operatorVisible=phase==='applied'&&(id===actorId||direct&&sees(s,id,actorId));
   observers.push(proof(s,id,id===targetId?'experienced':id===actorId?'performed':'witnessed',operatorVisible));
  }
  const e=stamp({version:1,id,sourceKind,sourceId,targetId,actorId,kind:b.gender!==a.gender?'body':'appearance',phase,before:b,after:a,at:now(s),order,turn:turn(s),revision:s.系统.revision,observers});
  store(s).push(e);return clone(e);
 }
 /** The affected person's current experience never identifies a hidden operator. */
 function influenceExperience(s,r,sourceKind,phase){
  const db=store(s);if(db.some(e=>e.sourceKind===sourceKind&&e.sourceId===r.id&&e.phase===phase))return;
  const actorId=r.actorId??r.subjectId,observers=[];
  if(recording(s,r.targetId))observers.push(proof(s,r.targetId,phase==='noticed'?'noticed':'experienced',phase==='applied'&&!!r.operatorObservation));
  if(phase==='applied'&&actorId!==r.targetId&&conscious(s,actorId))observers.push(proof(s,actorId,'performed',true));
  const id='change:'+hash(sourceKind==='cognition'&&phase==='applied'?{sourceKind,sourceId:r.id}:{sourceKind,sourceId:r.id,phase});
  db.push(stamp({version:1,id,sourceKind,sourceId:r.id,targetId:r.targetId,actorId,kind:sourceKind==='control'?'control':'cognition-operation',phase,before:{},after:{},at:now(s),order:next(s),turn:turn(s),revision:s.系统.revision,observers}));
 }
 function cognition(s,c,phase='applied'){influenceExperience(s,c,'cognition',phase);}
 function control(s,c,phase='applied'){influenceExperience(s,c,'control',phase);}
 /** Called at a write boundary. A later discovery never fabricates a witnessed cast. */
 function observe(s){
  for(const r of Object.values(s.扩展?.controlEpisodes??{}))if(!r.endedOrder&&recording(s,r.targetId)&&!rows(s).some(e=>e.sourceKind==='control'&&e.sourceId===r.id&&e.observers.some(o=>o.personId===r.targetId)))control(s,r,'noticed');
  for(const r of Object.values(s.扩展?.cognitionChanges??{}))if(live(s,r)&&recording(s,r.targetId)&&!rows(s).some(e=>e.sourceKind==='cognition'&&e.sourceId===r.id&&e.observers.some(o=>o.personId===r.targetId)))cognition(s,r,'noticed');
  const original=rows(s).filter(e=>['body','appearance'].includes(e.kind)&&e.sourceKind!=='notice');
  for(const targetId of new Set(original.map(e=>e.targetId))){
   if(!conscious(s,targetId)||globalThis.SoulConsciousness?.carrierForPerson(s,targetId))continue;
   const p=s.人物.列表[targetId],current=visible(p),latest=original.filter(e=>e.targetId===targetId).at(-1);
   if(!latest||!sameVisible(current,latest.after))continue;
   const known=rows(s).filter(e=>['body','appearance'].includes(e.kind)&&e.targetId===targetId&&e.observers.some(o=>o.personId===targetId)&&remembers(s,targetId,e)).at(-1);
   if(known&&sameVisible(known.after,current))continue;
   const first=original.find(e=>e.targetId===targetId&&e.order>(known?.order??0));
   // Compare with the last personally known shape, not an intermediate change
   // made during unconsciousness. A full unseen round trip leaves no memory.
   const before=known?known.after:first?.before;
   if(!before||sameVisible(before,current)||!remembers(s,targetId,first??latest))continue;
   const id='change:'+hash({notice:latest.id,targetId,cutoff:memoryCutoff(s,targetId)});
   if(rows(s).some(e=>e.id===id))continue;
   store(s).push(stamp({version:1,id,sourceKind:'notice',sourceId:latest.id,targetId,actorId:null,kind:before.gender!==current.gender?'body':'appearance',phase:'noticed',before:clone(before),after:current,at:now(s),order:next(s),turn:turn(s),revision:s.系统.revision,observers:[proof(s,targetId,'noticed',false)]}));
  }
 }
 function facts(s,observerId,{targetId,changeId}={}){
  if(globalThis.SoulInfluenceCore?.autonomy(s,observerId).puppet)return [];
  return rows(s).filter(e=>(!targetId||e.targetId===targetId)&&(!changeId||e.id===changeId)&&signed(e)&&remembers(s,observerId,e)).flatMap(e=>{
   const view=e.observers.find(o=>o.personId===observerId);if(!view)return [];
   const operator=view.operatorVisible&&e.actorId&&operatorIdentity(s,source(s,e.sourceKind,e.sourceId)?.operatorObservation?.operatorId??e.actorId);
   const influence=e.kind==='control'||e.kind==='cognition-operation',r=source(s,e.sourceKind,e.sourceId),label=e.kind==='cognition-operation'?'认知变化':r?.kind==='status.mind_control'?'精神接管':'灵魂约束';
   return [{id:e.id,kind:e.kind,targetId:e.targetId,targetName:s.人物.列表[e.targetId].name,phase:e.phase,at:e.at,order:e.order,turn:e.turn,...(e.sourceKind==='appearance-edit'?{occurrence:{phase:r.turn>0?'after-completed-story-turn':'before-first-story-turn',...(r.turn>0?{afterCompletedStoryTurn:r.turn}:{beforeStoryTurn:1}),sourceRevision:r.sourceRevision,appliedRevision:r.sourceRevision+1}}:{}),before:clone(e.before),after:clone(e.after),knowledge:view.basis,...(operator?{operator:{id:operator.id,name:operator.name}}:{}),meaning:e.sourceKind==='appearance-edit'?(r.turn>0?'本次外貌变化发生在此前故事回合已经完成之后；前后形象按当时所见保留。':'本次外貌变化发生在第一轮故事开始之前；前后形象按当时所见保留。'):influence?(e.phase==='restored'?`本人经历的${label}来源已经结束，期间实际经历仍可记起；其他来源及记忆遮蔽分别有效。`:view.basis==='performed'?`本人实际施加了${label}。`:`本人经历了${label}，依当前认知理解自身；原因与施术者仅凭已知事实判断。`):e.phase==='noticed'?'本人现在察觉自己的身体或外貌；原因与施术过程尚未获知。':operator?'本人当时感知到的变化；施用者身份来自当时直接可见的施用。':'本人当时感知到身体或外貌变化；原因与施术者尚未获知。'}];
  });
 }
 /** Safe mental input. Source ids and hidden mechanisms never imply self-awareness. */
 function safeCognition(s,personId,observerId=personId){
  if(observerId!==personId)return [];
  return facts(s,observerId,{targetId:personId}).filter(e=>['cognition-operation','control'].includes(e.kind)).map(e=>({experienceId:e.id,phase:e.phase,meaning:e.meaning}));
 }
 function safeRelations(s,personId){
  return globalThis.SoulWorldSocial.relations(s,personId).map(r=>({personId:r.personId,kind:r.kind,label:r.kind==='custody'?'主奴关系':r.label,selfRole:r.selfRole,otherRole:r.otherRole,...(r.cognitiveCustody?{custody:{selfRole:r.cognitiveCustody.selfRole,otherRole:r.cognitiveCustody.otherRole}}:{})}));
 }
 function receiptExperiences(s,receipt){const ids=new Set([receipt?.statusId,...(receipt?.targets??[]).flatMap(t=>(t.effects??[]).map(e=>e.statusId))].filter(Boolean));return rows(s).filter(e=>{const r=source(s,e.sourceKind,e.sourceId);return r&&(ids.has(r.sourceStatusId)||receipt?.id&&(r.source?.结算单ID===receipt.id||r.source?.来源?.结算单ID===receipt.id));}).map(clone);}
 function hasExperience(s,observerId,id){const e=rows(s).find(e=>e.id===id);return !!(signed(e)&&e.observers.some(o=>o.personId===observerId));}
 function knownOperator(s,observerId,{sourceKind,sourceId}={}){const e=rows(s).find(e=>(!sourceKind||e.sourceKind===sourceKind)&&(!sourceId||e.sourceId===sourceId)&&signed(e)&&remembers(s,observerId,e)&&e.observers.some(o=>o.personId===observerId&&o.operatorVisible));if(!e)return null;return operatorIdentity(s,source(s,e.sourceKind,e.sourceId)?.operatorObservation?.operatorId??e.actorId);}
 function observerValid(s,o,e){
  if(!s.人物?.列表?.[o.personId]||!['experienced','witnessed','performed','noticed'].includes(o.basis)||typeof o.operatorVisible!=='boolean'||!o.position||o.carrier&&!globalThis.SoulConsciousness?.validProof(s,o.carrier,e.at,e.order))return false;
  if(o.conscious===true)return !o.recordingSources;
  return o.conscious===false&&Array.isArray(o.recordingSources)&&o.recordingSources.length>0&&o.recordingSources.every(id=>{const r=s.扩展?.controlEpisodes?.[id];return r?.kind==='status.mind_control'&&r.targetId===o.personId&&r.appliedOrder<e.order&&(!r.endedOrder||e.order<=r.endedOrder);});
 }
 function validate(s){
  const errors=[],ids=new Set();if(s.扩展?.personaRewrites?.experiences!==undefined&&!Array.isArray(s.扩展.personaRewrites.experiences))return ['人物变化经历格式无效'];
  for(const e of rows(s))try{
   const r=source(s,e.sourceKind,e.sourceId);
   if(['control','cognition'].includes(e.sourceKind)){
    const actorId=r?.actorId??r?.subjectId,mental=e.sourceKind==='cognition',expectedId='change:'+hash(mental&&e.phase==='applied'?{sourceKind:e.sourceKind,sourceId:e.sourceId}:{sourceKind:e.sourceKind,sourceId:e.sourceId,phase:e.phase});
    if(!signed(e)||e.version!==1||ids.has(e.id)||!r||e.id!==expectedId||e.targetId!==r.targetId||e.actorId!==actorId||e.kind!==(mental?'cognition-operation':'control')||!['applied','restored','noticed'].includes(e.phase)||!Number.isSafeInteger(e.order)||e.order<1||e.order>s.扩展.personEventSequence||!Number.isSafeInteger(e.at)||e.at>now(s)||e.at<(r.appliedAt??0)||e.phase==='restored'&&e.at!==r.endedAt||e.phase==='applied'&&e.at!==r.appliedAt||!Number.isSafeInteger(e.turn)||e.turn<0||e.turn>turn(s)||!Number.isSafeInteger(e.revision)||e.revision>s.系统.revision||!Array.isArray(e.observers)||Object.keys(e.before??{}).length||Object.keys(e.after??{}).length)throw Error('控制经历');
    const seen=new Set();for(const o of e.observers){if(!observerValid(s,o,e)||seen.has(o.personId)||![actorId,e.targetId].includes(o.personId)||o.personId===e.targetId&&o.operatorVisible&&(e.phase!=='applied'||!validOperatorObservation(s,r))||o.operatorVisible&&![actorId,e.targetId].includes(o.personId))throw Error('控制知情');seen.add(o.personId);}ids.add(e.id);continue;
   }
   if(!signed(e)||e.version!==1||ids.has(e.id)||!e.id.startsWith('change:')||!['body','patch','disguise','cognition','notice','appearance-edit'].includes(e.sourceKind)||!r||r.targetId!==e.targetId||!s.人物?.列表?.[e.targetId]||e.actorId!==null&&!operatorIdentity(s,e.actorId)||!['body','appearance','cognition-operation'].includes(e.kind)||!['applied','restored','noticed'].includes(e.phase)||!Number.isSafeInteger(e.at)||e.at>now(s)||!Number.isSafeInteger(e.order)||e.order<1||e.order>s.扩展.personEventSequence||!Number.isSafeInteger(e.turn)||e.turn<0||e.turn>turn(s)||!Number.isSafeInteger(e.revision)||e.revision>s.系统.revision||!Array.isArray(e.observers))throw Error('记录');
   if(e.sourceKind==='notice'&&(e.phase!=='noticed'||e.actorId!==null||e.kind==='cognition-operation')||e.sourceKind==='cognition'&&(e.kind!=='cognition-operation'||e.actorId!==r.subjectId)||e.sourceKind==='body'&&e.actorId!==r.actorId||e.sourceKind==='patch'&&e.actorId!==r.actorId)throw Error('来源');
   if(e.sourceKind!=='notice'&&e.phase==='noticed'||e.sourceKind==='cognition'&&e.phase!=='applied'||e.sourceKind==='notice'&&(e.order<=r.order||e.at<r.at)||e.sourceKind!=='notice'&&(e.phase==='applied'?e.at!==(r.appliedAt??r.at):e.at!==r.endedAt))throw Error('来源时点');
   if(e.sourceKind==='cognition'&&e.id!=='change:'+hash({sourceKind:'cognition',sourceId:e.sourceId})||['body','patch','disguise','appearance-edit'].includes(e.sourceKind)&&e.id!=='change:'+hash({sourceKind:e.sourceKind,sourceId:e.sourceId,phase:e.phase,order:e.order,targetId:e.targetId}))throw Error('事件编号');
   if(e.sourceKind==='body'&&e.phase==='applied'&&(e.before.gender!==(r.previousGender??null)||e.after.gender!==(r.gender??null)))throw Error('真实身体结果');
   if(e.sourceKind==='appearance-edit'&&(r.mode!=='change'||e.phase!=='applied'||e.actorId!==r.actorId||e.order<=r.appliedOrder||!same(e.before,r.before)||!same(e.after,r.after)))throw Error('样貌修改来源');
   for(const value of [e.before,e.after])if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['gender','appearance'].includes(k))||Object.values(value).some(v=>v!==null&&(typeof v!=='string'||v.length>16000))||e.kind==='cognition-operation'&&Object.keys(value).length)throw Error('可见变化');
   const seen=new Set();for(const o of e.observers){if(seen.has(o.personId)||!observerValid(s,o,e)||e.kind==='cognition-operation'&&o.personId!==e.actorId||e.phase==='noticed'&&(o.personId!==e.targetId||o.operatorVisible))throw Error('见证');seen.add(o.personId);}
   ids.add(e.id);
  }catch{errors.push(`人物变化经历${e?.id}来源或感知证据无效`);}
  return errors;
 }
 return Object.freeze({observerProof:proof,validateObserver:observerValid,conscious,recording,memoryCutoff,memoryBoundary:memoryCutoff,remembers,remembersRecord:remembers,remembersTurn:(s,id,n)=>remembers(s,id,{turn:n}),releasePerceptions,captureOperator,knownOperator,transition,cognition,control,observe,facts,safeCognition,safeRelations,receiptExperiences,hasExperience,validate});
});
