import {rules} from '../rules';
import {remembersRecord} from '../shared/cognition-view';
import {npcAbilityOptions} from './npc-abilities';
import {personContractFacts} from './person-contract';

const clone=<T>(value:T):T=>structuredClone(value);
const knowledge=()=> (globalThis as any).SoulPersonChangeKnowledge;
const hash=(value:any)=>rules.abilities.hash(value);
const same=(a:any,b:any)=>hash(a)===hash(b);
const rows=(state:any):any[]=>state.扩展?.personChangeReactions?.records??[];
const signed=(record:any)=>{if(!record||typeof record.hash!=='string')return false;const {hash:_,...body}=record;return record.hash===hash(body);};
const stamp=(record:any)=>{const {hash:_,...body}=record;return {...body,hash:hash(body)};};
function ready(state:any,id:string){
 const person=state.人物?.列表?.[id],unit=state.战斗单位?.列表?.[id];
 return person?.status==='active'&&id!==state.角色?.主控单位ID&&(knowledge()?.conscious?.(state,id)??true)&&(!unit||unit.存活状态==='存活'&&unit.资源.生命.当前>0)&&!rules.actions.battleOf(state,id)&&!rules.controls.active(state,id).some((status:any)=>['status.sleep','status.stun'].includes(status.模板ID));
}
function remembered(state:any,id:string,record:any){return remembersRecord(state,id,record)&&(knowledge()?.remembersRecord?.(state,id,record)??true);}
export function reactionRecipients(state:any,observerId:string){
 if(!state.战斗单位?.列表?.[observerId])return [];
 return Object.values(state.人物?.列表??{}).filter((person:any)=>person.id!==observerId).flatMap((person:any)=>{
  try{rules.social.communicate(state,observerId,person.id);return [{id:person.id,name:person.name}];}catch{return [];}
 });
}

/** A known perceived change is the queue. Hidden patches and unconscious targets
 * do not become a second omniscient job ledger. */
export function pendingPersonChangeReactions(state:any,options:{story?:boolean}={}){
 const result:any[]=[],turn=state.扩展?.story?.active;
 const awaitingPlayerSettings=new Set(rules.personRewrite.pending(state,state.角色?.主控单位ID).map((grant:any)=>grant.targetId));
 const origins=new Map<string,any>((state.扩展?.personaRewrites?.experiences??[]).map((experience:any)=>[experience.id,experience]));
 for(const observerId of Object.keys(state.人物?.列表??{})){
  if(!ready(state,observerId))continue;
  const experiences=knowledge()?.facts(state,observerId)??[],latestInfluence=new Map<string,string>();
  for(const experience of experiences)if(['control','cognition-operation'].includes(experience.kind)){const origin=origins.get(experience.id);if(origin)latestInfluence.set(origin.sourceKind+':'+origin.sourceId,experience.id);}
  for(const experience of experiences){
   if(experience.targetId===observerId&&awaitingPlayerSettings.has(observerId))continue;
   if(['control','cognition-operation'].includes(experience.kind)&&experience.targetId!==observerId)continue;
   if(['control','cognition-operation'].includes(experience.kind)){const origin=origins.get(experience.id);if(origin&&latestInfluence.get(origin.sourceKind+':'+origin.sourceId)!==experience.id)continue;}
   if(!['body','appearance','control','cognition-operation'].includes(experience.kind)||experience.phase==='noticed'&&['body','appearance'].includes(experience.kind)&&!Object.keys(experience.before??{}).length||options.story&&experience.turn!==turn?.number&&!['control','cognition-operation'].includes(experience.kind))continue;
   const id='change-reaction:'+hash([observerId,experience.id]);
   if(rows(state).some(record=>record.observerId===observerId&&(record.experienceId===experience.id||record.handledExperienceIds?.includes(experience.id))))continue;
   result.push({id,observerId,experience:clone(experience)});
  }
 }
 return result;
}
export function validateChangeReactionDecision(input:any){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!['attitude','reason','speech','actionOptionId'].includes(key))||!['question','accept','keep','restore','uncertain','resent','revenge','seek-help','dependent'].includes(input.attitude)||typeof input.reason!=='string'||!input.reason.trim()||input.reason.length>600||input.actionOptionId!==undefined&&input.actionOptionId!==null&&(typeof input.actionOptionId!=='string'||!input.actionOptionId||input.actionOptionId.length>240))throw Error('变化回应须包含本人态度与1至600字理由');
 const speech=input.speech??null;
 if(speech!==null&&(!speech||typeof speech!=='object'||Array.isArray(speech)||Object.keys(speech).some(key=>!['targetId','text'].includes(key))||typeof speech.targetId!=='string'||!speech.targetId||typeof speech.text!=='string'||!speech.text.trim()||speech.text.length>2000))throw Error('变化回应只可向一名实际听者说出1至2000字原话');
 return {attitude:input.attitude,reason:input.reason,speech:clone(speech),...(input.actionOptionId===undefined?{}:{actionOptionId:input.actionOptionId})};
}
const optionKey=(reactionId:string,kind:string,intent:any,source?:any)=>hash([reactionId,kind,intent,source?rules.abilities.fingerprint(source):null]);
/** Finite proposals through existing executors, never powers granted by an attitude. */
export function personChangeActionOptions(state:any,job:any){
 const actorId=job.observerId,result:any[]=[],add=(kind:string,intent:any,label:string,details:any={},source?:any)=>{try{const preview=rules.world.previewIntent(state,intent);if(!preview.available)return;result.push({optionId:optionKey(job.id,kind,intent,source),kind,label,...details,intent:clone(intent),...(source?{source:clone(source)}:{})});}catch{}};
 if(!ready(state,actorId))return result;
 if(job.experience.targetId===actorId){
  const beforeGender=job.experience.before?.gender;
  for(const option of npcAbilityOptions(state,actorId)){
   if(option.intent.type!=='use-field-ability'||option.targetId!==actorId)continue;
   const nodes=rules.abilities.selectFieldBranches(option.contract,option.intent.branchIds).flatMap((b:any)=>b.nodes),restores=nodes.some((n:any)=>['payload.cleanse','payload.dispel'].includes(n.effectId)||n.effectId==='transform.sex'&&(n.params.目标性别==='原始'||n.params.目标性别==='反转'&&beforeGender&&beforeGender!==state.人物.列表[actorId].gender||n.params.目标性别===beforeGender));
   if(restores)add('ability',option.intent,`使用${option.skillName}尝试恢复本人`,{effects:option.effects,payment:option.payment,creationQuotes:option.creationQuotes},option.contract);
  }
 }
 for(const contract of personContractFacts(state,actorId))if(contract.status==='active'&&!contract.forced)add('contract',{type:'end-person-contract',actorId,contractId:contract.id,versionHash:contract.versionHash},'结束本人这份契约',{consequence:contract.kind==='soul'?{penalty:contract.penaltyLabel,duration:contract.penaltyDuration,remainingUses:contract.remainingUses?.[actorId]??0}:null});
 for(const relation of rules.social.relations(state,actorId))if(relation.sourceId&&relation.kind!=='custody')add('relationship',{type:'end-person-relation',actorId,relationId:relation.sourceId},`结束与${state.人物.列表[relation.personId]?.name??'对方'}的${relation.label}关系`,{targetId:relation.personId});
 const cooperation=rules.cooperation.table(state).agreements.filter((r:any)=>[r.leaderId,r.memberId].includes(actorId)&&['proposed','active','suspended'].includes(r.status));
 for(const c of cooperation)add('cooperation',{type:'end-person-cooperation',actorId,cooperationId:c.id,reason:'本人对当前变化作出决定，结束这份合作。'},'结束本人当前合作');
 for(const leaderId of rules.world.partyLeadersOf(state,actorId))for(const member of rules.world.partyMembers(state,leaderId))if(member.personId===actorId&&!member.cooperationId){try{const draft=clone(state);rules.actions.resolve(draft,{actorId,battleId:null});const block=rules.world.worldActionBlockReason(draft,{actorId});if(block)continue;rules.world.endPartyMembership(draft,actorId,member.membershipId,'preview-change-leave',actorId,'本人结束同行',leaderId);const intent={actorId,leaderId,membershipId:member.membershipId};result.push({optionId:optionKey(job.id,'membership',intent),kind:'membership',label:'结束本人的自愿同行',intent});}catch{}}
 const original=(state.扩展?.personaRewrites?.experiences??[]).find((e:any)=>e.id===job.experience.id),operator=job.experience.operator??(original?knowledge()?.knownOperator(state,actorId,{sourceKind:original.sourceKind,sourceId:original.sourceId}):null);
 if(operator?.id&&operator.id!==actorId&&state.人物.列表[operator.id]){const evidence=(state.扩展?.personaRewrites?.experiences??[]).find((e:any)=>e.actorId&&(e.actorId===operator.id||(state.扩展?.controlEpisodes?.[e.sourceId]??state.扩展?.cognitionChanges?.[e.sourceId])?.controllerId===operator.id)&&e.observers.some((o:any)=>o.personId===actorId&&o.operatorVisible)&&knowledge()?.remembers(state,actorId,e));if(evidence)add('revenge',{type:'person-duel',actorId,targetId:operator.id},`向已知施术者${operator.name}发起死斗`,{knownOperatorExperienceId:evidence.id,consequence:'实际发起可能死亡的战斗，胜负尚未决定。'});}
 return result;
}
/** Only the person receives owned choices. Internal source contracts stay server-side. */
export function personChangeActionViews(state:any,job:any){return personChangeActionOptions(state,job).map(({intent,source,knownOperatorExperienceId,...view})=>view);}
function actionStatusIds(receipt:any){return [...new Set<string>((receipt.targets??[]).flatMap((t:any)=>(t.effects??[]).flatMap((e:any)=>[...(e.statusId?[e.statusId]:[]),...(e.removedStatusIds??[])])))];}
function handledExperiences(state:any,record:any,receipt:any){const ids=new Set(actionStatusIds(receipt)),end=rules.personContracts.committedActionSource(state,record.action?.actionRef)?.order??record.order;return (state.扩展?.personaRewrites?.experiences??[]).filter((e:any)=>e.targetId===record.observerId&&e.order>record.order&&e.order<end&&e.observers.some((o:any)=>o.personId===record.observerId)&&ids.has(e.sourceKind==='control'?e.sourceId:e.sourceKind==='body'?state.扩展.bodyChanges?.[e.sourceId]?.sourceStatusId:e.sourceKind==='cognition'?state.扩展.cognitionChanges?.[e.sourceId]?.sourceStatusId:'')).map((e:any)=>e.id);}
export function validChangeReactionSpeech(state:any,input:{reactionId:string;sourceId:string;speakerId:string;listenerId:string;text:string}){
 const record=rows(state).find(record=>record.id===input.reactionId),speech=record?.decision?.speech;
 return !!(signed(record)&&record.observerId!==state.角色?.主控单位ID&&record.observerId===input.speakerId&&record.sourceId+':speech'===input.sourceId&&speech?.targetId===input.listenerId&&speech.text===input.text);
}
export function resolvePersonChangeReaction(state:any,input:any,sourceId:string){
 if(!input||Object.keys(input).some(key=>!['reactionId','decision'].includes(key))||typeof input.reactionId!=='string')throw Error('变化回应只接受实际待办编号与本人决定');
 const decision=validateChangeReactionDecision(input.decision),prior=rows(state).find(record=>record.id===input.reactionId);
 if(prior){if(!signed(prior)||!same(prior.decision,decision))throw Error('已完成的变化回应不能替换原决定');return {state,receipt:{type:'person-change-reacted',reactionId:prior.id,personId:prior.observerId,...(prior.action?{settlement:clone(prior.action.receipt)}:{}),summary:'本人已回应这次变化。'},idempotent:true};}
 const pending=pendingPersonChangeReactions(state).find(record=>record.id===input.reactionId);
 if(!pending)throw Error('没有本人当前可知且尚未回应的变化');
 if(decision.speech&&!reactionRecipients(state,pending.observerId).some(person=>person.id===decision.speech.targetId))throw Error('这段回应没有可以实际听见的现场听者');
 const selected=decision.actionOptionId?personChangeActionOptions(state,pending).find(o=>o.optionId===decision.actionOptionId):null;if(decision.actionOptionId&&!selected)throw Error('本人所选行动的能力、关系、来源或费用已经变化');
 state=clone(state);const turn=Math.max(0,Number(state.扩展?.story?.active?.number??Number(state.扩展?.story?.nextTurn??1)-1));
 const record=stamp({version:1,id:pending.id,observerId:pending.observerId,experienceId:pending.experience.id,experience:clone(pending.experience),decision,sourceId,at:rules.people.now(state),order:rules.people.nextEventOrder(state),turn,audienceIds:[pending.observerId,...(decision.speech?[decision.speech.targetId]:[])]});
 state.扩展.personChangeReactions??={version:1,records:[]};state.扩展.personChangeReactions.records.push(record);
 const speech=decision.speech?(rules.social as any).recordAutonomousSpeech(state,record.observerId,decision.speech.targetId,decision.speech.text,sourceId+':speech',record.id):null;
 let settlement:any=null;
 if(selected){const option=personChangeActionOptions(state,pending).find(o=>o.optionId===selected.optionId);if(!option||!same(option,selected))throw Error('原话送达后所选行动已无法按原条件执行');const actionId=sourceId+':action';let action:any;
  if(option.kind==='membership'){const q=option.intent,membership=rules.world.endPartyMembership(state,q.actorId,q.membershipId,actionId,q.actorId,decision.reason,q.leaderId);settlement={id:actionId,type:'person-membership-ended',actorId:q.actorId,membershipId:membership.id,leaderId:q.leaderId};action={...option,receipt:clone(settlement)};}
  else{const result=rules.world.settleIntent(state,{...option.intent,id:actionId});state=result.state;settlement=result.receipt;const committed=rules.personContracts.retainAction(state,{...option.intent,id:actionId},settlement,'reaction',option.source??null);action={...option,receipt:clone(settlement),actionRef:rules.personContracts.ref(committed)};}
  const saved=rows(state).find(r=>r.id===record.id);saved.action=action;saved.handledExperienceIds=handledExperiences(state,saved,settlement);Object.assign(saved,stamp(saved));
 }
 return {state,receipt:{type:'person-change-reacted',reactionId:record.id,personId:record.observerId,...(speech?{speech:speech.statement}:{}),...(settlement?{settlement}:{}),summary:settlement?'本人已经按自己的决定执行实际行动。':speech?'对方已说出对眼前变化的回应。':'本人已记下自己的看法。'}};
}

/** Private motive and preference are returned only to their actual owner. */
function actionOutcome(c:any):any{
 const effect=(e:any)=>({effectId:e.effectId,name:rules.effects.EFFECT_REGISTRY[e.effectId]?.displayName??e.effectId,...Object.fromEntries(['amount','hpDamage','remainingHp','remainingSoulPower','before','after','prevented','layers','triggered'].filter(k=>e[k]!==undefined&&['string','number','boolean'].includes(typeof e[k])).map(k=>[k,e[k]])),...(Array.isArray(e.removedStatusIds)?{removedCount:e.removedStatusIds.length}:{})});
 return {type:c.type,...(c.battleId?{battleId:c.battleId}:{}),...(c.status?{status:c.status}:{}),...(c.payment?{payment:{totals:clone(c.payment.totals),items:c.payment.items.map((i:any)=>({quantity:i.quantity}))}}:{}),...(c.targets?{targets:c.targets.map((t:any)=>({targetId:t.targetId,effects:(t.effects??[]).map(effect)}))}:{}),...(c.punishment?{punishment:actionOutcome(c.punishment)}:{})};
}
export function ownReactionMemory(state:any,ownerId:string){
 return rows(state).filter(record=>record.observerId===ownerId&&remembered(state,ownerId,record)).map(record=>({id:record.id,experienceId:record.experienceId,experience:clone(record.experience),...clone(record.decision),...(record.action?{action:{label:record.action.label,receipt:actionOutcome(record.action.receipt)}}:{}),at:record.at,order:record.order,turn:record.turn,meaning:record.action?'本人当时的看法与已经完成的实际行动；之后仍可因新经历改变想法。':'本人当时对察觉变化的看法与实际原话；诉求尚未自动变成施法或关系改变。'}));
}
/** Public context contains delivered words, never another person's private reason. */
export function personChangeReactionFacts(state:any,viewerId:string,options:{ownerId?:string}={}){
 const speech=rules.social.speechFacts(state,viewerId);
 return rows(state).filter(record=>(!options.ownerId||record.observerId===options.ownerId)).flatMap(record=>{
  if(record.observerId===viewerId)return ownReactionMemory(state,viewerId).filter(memory=>memory.id===record.id);
  const heard=speech.find((statement:any)=>statement.sourceId===record.sourceId+':speech'||statement.id==='speech:'+record.sourceId+':speech');
  return heard?[{id:record.id,personId:record.observerId,speech:clone(heard),at:record.at,order:record.order,turn:record.turn,meaning:'本人实际听到的原话；不能据此获知对方未说出的私有理由，诉求也不等于恢复已经发生。'}]:[];
 });
}
export function changeReactionAudience(state:any,input:any){
 const pending=pendingPersonChangeReactions(state).find(record=>record.id===input?.reactionId),prior=rows(state).find(record=>record.id===input?.reactionId),owner=pending?.observerId??prior?.observerId;
 return owner?[owner,...(input?.decision?.speech?[input.decision.speech.targetId]:[])]:[];
}
function validateReactionAction(state:any,record:any){
 const action=record.action;
 if(!action){if(record.decision.actionOptionId||record.handledExperienceIds!==undefined)throw Error('变化行动缺少真实结算');return;}
 const q=action.intent,c=action.receipt,id=record.sourceId+':action';
 if(!q||q.actorId!==record.observerId||c?.id!==id||record.decision.actionOptionId!==action.optionId||action.optionId!==optionKey(record.id,action.kind,q,action.source)||typeof action.label!=='string')throw Error('变化行动与本人原决定不符');
 if(action.kind==='membership'){
  const member=state.人物.列表[record.observerId].扩展?.社交约定?.find((r:any)=>r.id===q.membershipId&&r.playerId===q.leaderId&&r.kind==='party'),event=member?.events.find((e:any)=>e.sourceId===id&&e.status==='ended'&&e.endedBy===record.observerId);
  if(!event||c.type!=='person-membership-ended'||c.actorId!==q.actorId||c.leaderId!==q.leaderId||c.membershipId!==q.membershipId||c.membershipId!==member.id)throw Error('变化离队缺少原永久同行事件');
 }else{
  const original=rules.personContracts.committedActionSource(state,action.actionRef);
  if(!original||original.actorId!==record.observerId||original.order<=record.order||!same(original.receipt,c)||!same(original.source,action.source??null)||!same(original.intent,(({actorId:_,...intent})=>intent)(q)))throw Error('变化行动缺少原永久执行证明');
  if(action.kind==='ability'){
   if(q.type!=='use-field-ability'||q.targetId!==record.observerId||!action.source||action.source.持有者单位ID!==record.observerId||!rules.abilities.verify(action.source).pass||c.type!=='field-ability-used'||!(rules.personContracts as any).paidReleaseValid(state,c,action.source))throw Error('变化恢复能力缺少本人原来源或真实支付');
  }else if(action.kind==='contract'){
   if(q.type!=='end-person-contract'||c.type!=='person-contract'||c.contractId!==q.contractId||c.status!=='ended'||!rules.personContracts.receiptProof(state,c,record.observerId,{kind:q.type,contractId:q.contractId,versionHash:q.versionHash})||!rules.personContracts.table(state).events.some((e:any)=>e.contractId===q.contractId&&e.type==='ended'&&e.sourceId===id&&e.reason==='unilateral-exit'))throw Error('变化解约缺少真实结束事件');
  }else if(action.kind==='relationship'){
   const relation=(Object.values(state.人物.列表) as any[]).flatMap(p=>p.扩展?.社交约定??[]).find(r=>r.id===c.relationId),event=relation?.events.find((e:any)=>e.sourceId===id&&e.status==='ended'&&e.endedBy===record.observerId);
   const matches=relation?.id===q.relationId||relation?.origin?.previousSourceId===q.relationId&&relation.origin.sourceId===id&&rules.social.validEnding(state,relation);
   if(q.type!=='end-person-relation'||!matches||c.actorId!==q.actorId||c.type!=='world-social'||c.status!=='ended'||!event||![relation.playerId,relation.personId].includes(record.observerId))throw Error('变化关系结束缺少原关系事件');
  }else if(action.kind==='cooperation'){
   const agreement=rules.cooperation.table(state).agreements.find((r:any)=>r.id===q.cooperationId);
   if(q.type!=='end-person-cooperation'||c.type!=='person-cooperation'||c.action!==q.type||c.actorId!==q.actorId||c.cooperationId!==q.cooperationId||c.status!=='ended'||c.targetId!==agreement?.memberId||![agreement?.leaderId,agreement?.memberId].includes(record.observerId)||!rules.cooperation.table(state).events.some((e:any)=>e.agreementId===q.cooperationId&&e.kind==='ended'&&e.sourceId===id&&e.actorId===record.observerId))throw Error('变化合作结束缺少原协议事件');
  }else if(action.kind==='revenge'){
   const e=(state.扩展?.personaRewrites?.experiences??[]).find((e:any)=>e.id===action.knownOperatorExperienceId),operatorId=(state.扩展?.controlEpisodes?.[e?.sourceId]??state.扩展?.cognitionChanges?.[e?.sourceId])?.controllerId??e?.actorId;
   const battle=state.战斗?.id===c.battleId?state.战斗:state.世界.backgroundBattles?.[c.battleId],report=state.扩展?.battleReports?.[c.battleId],opening=battle?.扩展?.开战结算单??report?.openingReceipt;
   const participants=(opening?.initiative??[]).map((x:any)=>x.unitId).sort();
   if(q.type!=='person-duel'||c.type!=='person-duel-started'||q.actorId!==c.actorId||q.targetId!==c.targetId||c.battleId!==`duel:${id}`||!e||operatorId!==q.targetId||!e.observers.some((o:any)=>o.personId===record.observerId&&o.operatorVisible)||!rules.social.remembersAtOrder(state,record.observerId,e.order,record.order)||!opening||opening.battleId!==c.battleId||!same(participants,[q.actorId,q.targetId].sort()))throw Error('变化复仇缺少当时真实识别与实际开战');
  }else throw Error('变化行动类型未登记');
 }
 if(!Array.isArray(record.handledExperienceIds)||!same(record.handledExperienceIds,handledExperiences(state,record,c)))throw Error('变化恢复不得吞掉其他人物或后来经历');
}
export function validatePersonChangeReactions(state:any){
 const table=state.扩展?.personChangeReactions;if(table===undefined)return;
 if(table.version!==1||!Array.isArray(table.records))throw Error('人物变化回应记录无效');
 const ids=new Set<string>(),sources=new Set<string>();
 for(const record of table.records){
  const decision=validateChangeReactionDecision(record.decision),exists=knowledge()?.hasExperience?.(state,record.observerId,record.experienceId);
  if(!signed(record)||record.version!==1||record.id!=='change-reaction:'+hash([record.observerId,record.experienceId])||ids.has(record.id)||!state.人物?.列表?.[record.observerId]||record.observerId===state.角色.主控单位ID||!exists||record.experience?.id!==record.experienceId||!['body','appearance','control','cognition-operation'].includes(record.experience.kind)||!same(decision,record.decision)||typeof record.sourceId!=='string'||!record.sourceId||sources.has(record.sourceId)||!Number.isSafeInteger(record.order)||record.order<1||record.order>state.扩展.personEventSequence||!Number.isSafeInteger(record.at)||record.at>rules.people.now(state)||!Number.isSafeInteger(record.turn)||record.turn<0||!same(record.audienceIds,[record.observerId,...(decision.speech?[decision.speech.targetId]:[])]))throw Error('人物变化回应缺少本人真实知情与唯一决定来源');
  if(decision.speech){const statement=rules.social.speechTable(state).statements.find((entry:any)=>entry.sourceId===record.sourceId+':speech');if(!statement||statement.autonomousRef?.reactionId!==record.id||statement.order<=record.order||!validChangeReactionSpeech(state,{reactionId:record.id,sourceId:statement.sourceId,speakerId:statement.speakerId,listenerId:statement.listenerId,text:statement.text}))throw Error('人物变化回应缺少真实送达原话');}
  validateReactionAction(state,record);
  ids.add(record.id);sources.add(record.sourceId);
 }
}
(globalThis as any).SoulPersonChangeReactions={validSpeechSource:validChangeReactionSpeech};
