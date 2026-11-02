(function(root,factory){
  const get=(name,file)=>root?.[name]??(typeof require==='function'?require(file):null);
  const api=factory(get('SoulCustodyCore','./custody-core.js'),get('SoulPersonCore','./person-core.js'),get('SoulActionContext','./action-context-core.js'),get('SoulControlCore','./control-core.js'),get('SoulAbilityContract','./ability-contract-core.js'));
  if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulWorldSocial=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(custody,people,actions,controls,abilities){
  'use strict';
  const clone=v=>JSON.parse(JSON.stringify(v)),same=(a,b)=>abilities.hash(a)===abilities.hash(b);
  const RELATIONSHIPS=Object.freeze({friends:'朋友',partners:'伴侣',kin:'亲属',mentor:'师徒',comrades:'同门',school:'师生',known:'熟识',employment:'雇佣',hierarchy:'上下级',hostile:'仇敌'});
  const DEFAULT_ROLES=Object.freeze({friends:['朋友','朋友'],partners:['伴侣','伴侣'],kin:['亲属','亲属'],mentor:['徒弟','师父'],comrades:['同门','同门'],school:['学生','老师'],known:['熟人','熟人'],employment:['雇员','雇主'],hierarchy:['下属','上级'],hostile:['仇敌','仇敌']});
  function normalizeRoles(kind,roles){const defaults=DEFAULT_ROLES[kind];if(!defaults)throw Error('关系类型无效');const result={self:roles?.self??roles?.target??defaults[0],other:roles?.other??defaults[1]};if(Object.values(result).some(v=>typeof v!=='string'||!v.trim()||v.trim().length>30))throw Error('双方身份须为1至30字');return {self:result.self.trim(),other:result.other.trim()};}
  const INTENTS=Object.freeze(['speak-person','propose-person-relation','respond-person-relation','end-person-relation','observe-custody-person','tell-custody-news','send-custody-letter','message-custody-news']);
  const OBSERVABLE=Object.freeze(['personal-experience','captured','custody-initialized','custody-arranged','released','escaped','custody-death','custody-sighted','custody-transferred','captive-treated']);
  const now=s=>people.now(s),validTime=(s,n)=>Number.isSafeInteger(n)&&n>=0&&n<=now(s);
  function table(s,create=false){if(create)s.世界.social??={version:1,facts:{},observations:[],messages:[]};return s.世界?.social??{version:1,facts:{},observations:[],messages:[]};}
  function validStamp(v){if(!v)return false;const c={...v};delete c.hash;return abilities.hash(c)===v.hash;}
  function masks(s,id){return Object.values(s.扩展?.cognitionChanges??{}).filter(c=>c.targetId===id&&c.direction==='屏蔽既往经历'&&(c.retention==='保留'||s.状态实例?.列表?.[c.sourceStatusId]?.状态==='生效'));}
  function remembers(s,id,at,context=[],order=null){
    const knowledge=globalThis.SoulPersonChangeKnowledge;
    if(knowledge?.remembersRecord(s,id,{at,...(Number.isSafeInteger(order)?{order}:{})})===false){
      const cutoff=knowledge.memoryCutoff(s,id);
      // Older same-minute observations carry their actual masking context. This
      // exception belongs only to that exact mask, never a later memory rewrite.
      const provenAfterMask=!Number.isSafeInteger(order)&&masks(s,id).some(c=>c.appliedOrder===cutoff.order&&at===c.appliedAt&&context.includes(c.id));
      if(!provenAfterMask)return false;
    }
    return masks(s,id).every(c=>order!==null?order>c.appliedOrder:at>c.appliedAt||at===c.appliedAt&&context.includes(c.id));
  }
  function masksAtOrder(s,id,order){return Object.values(s.扩展?.cognitionChanges??{}).filter(c=>c.targetId===id&&c.direction==='屏蔽既往经历'&&c.appliedOrder<order&&(c.retention==='保留'||!c.endedOrder||order<c.endedOrder)).map(c=>c.id).sort();}
  function remembersAtOrder(s,id,learnedOrder,decisionOrder){const cutoff=globalThis.SoulPersonChangeKnowledge.memoryCutoff(s,id,decisionOrder);return Number.isSafeInteger(learnedOrder)&&learnedOrder<decisionOrder&&learnedOrder>cutoff.order;}
  const memoryContext=(s,id)=>masks(s,id).map(c=>c.id).sort();
  const knowledgeId=(factId,id,proof)=>`knowledge:${factId}:${id}:${proof.eventId??proof.messageId}`;
  function aware(s,id,vision=false){const carrier=globalThis.SoulConsciousness?.carrierForPerson(s,id),unitId=carrier?.unitId??id,p=s.人物?.列表?.[id],u=s.战斗单位?.列表?.[unitId];return !!p&&(!!carrier||!globalThis.SoulSealingCore?.isStasis(s,id))&&p.status!=='dead'&&(!u||u.存活状态==='存活'&&u.资源.生命.当前>0)&&!controls.active(s,unitId).some(v=>(['status.sleep','status.stun'].includes(v.模板ID)||vision&&v.模板ID==='status.blind'));}
  function snapshot(s,targetId,visibleOnly=false){
    const p=s.人物.列表[targetId],r=custody.table(s).byPerson[targetId],sealed=globalThis.SoulSealingCore?.active(s,targetId),position=sealed?globalThis.SoulSealingCore.itemPosition(s,sealed.itemId):actions.positionOf(s,targetId);
    const devices=custody.attached(s,targetId).map(i=>({itemId:i.id,name:i.name,part:i.attachment.part}));
    return {personId:targetId,name:p.name,position:clone(position),...(sealed?{containment:{sealId:sealed.id,itemId:sealed.itemId,carrierId:globalThis.SoulSealingCore.carrier(s,targetId)?.id??null}}:{}),status:p.status==='dead'?'dead':visibleOnly?'unconfirmed':r?.status??'free',custodyId:visibleOnly?null:r?.id??null,captorId:visibleOnly?null:r?.captorId??null,custodianId:visibleOnly?null:r?.custodianId??r?.captorId??null,arrangement:visibleOnly?null:r?clone(r.arrangement):null,devices,visibleCondition:devices.length?'restrained':'no-visible-restraints'};
  }
  // Called at the instant of the event, before its hash is sealed. Reading later never adds witnesses.
  function departureRecord(s,actorId,targetId,details,sourceId,at){
    if(details.arrangement?.kind!=='escort')return null;
    const e=custody.table(s).events.find(e=>e.type==='logistics-escorts'&&e.entityId===details.arrangement.escortId&&e.sourceId===e.record?.sourceId),r=e?.record,run=r?.runs?.[0];
    return r&&r.leaderId===actorId&&Array.isArray(r.custodyRefs)&&r.custodyRefs.some(v=>v.personId===targetId&&v.custodyId===details.custodyId)&&sourceId===`${r.sourceId}:arrange:${targetId}`&&e.at===at&&r.createdAt===at&&r.status==='travelling'&&r.runs.length===1&&run.beganAt===at&&run.startOffset===0&&run.endOffset===0?{escort:r,run}:null;
  }
  const witnessProof=(e,w)=>({eventId:e.id,position:w.position,...(w.carrier?{carrier:clone(w.carrier)}:{}),...(w.handledFacilityId?{handledFacilityId:w.handledFacilityId}:{}),...(w.witnessedFacilityId?{witnessedFacilityId:w.witnessedFacilityId}:{}),...(w.departedEscortId?{departedEscortId:w.departedEscortId}:{}),...(w.interiorView?{interiorView:clone(w.interiorView)}:{})});
  function experienceAudience(s,experience,targetId){
    const observerId=experience.observationPersonId??targetId,position=clone(actions.positionOf(s,observerId));
    const participants=[...new Set([experience.actorId,...(experience.allowAffected&&!(experience.source.kind==='realm'&&experience.data.method!=='项圈电击'&&globalThis.SoulConsciousness?.carrierForPerson(s,targetId))?[targetId]:[])])].filter(id=>aware(s,id)).map(id=>({personId:id,role:id===experience.actorId?'executor':'affected',position:clone(globalThis.SoulConsciousness?.positionOf(s,id)??actions.positionOf(s,id)),awareness:speechPersonProof(s,id)}));
    const witnesses=experience.allowWitnesses===false?[]:Object.keys(s.人物.列表).filter(id=>aware(s,id,true)&&actions.perception(s,id,observerId,'vision')&&!participants.some(p=>p.personId===id)).map(id=>({personId:id,position:clone(globalThis.SoulConsciousness?.positionOf(s,id)??actions.positionOf(s,id)),awareness:speechPersonProof(s,id),...(globalThis.SoulInteriorSpaces.visibilityProof(s,id,observerId)?{interiorView:globalThis.SoulInteriorSpaces.visibilityProof(s,id,observerId)}:{})}));
    const restrictions=controls.restrictions(s,targetId).blocked;
    return {position,participants,witnesses,subjectState:speechPersonProof(s,targetId),practiceBlocks:{focus:clone(restrictions.focus??[]),soulPower:clone(restrictions['soul-power']??[])}};
  }
  function observationAt(s,type,actorId,targetId,details={},sourceId=''){
    if(!OBSERVABLE.includes(type)||!s.人物?.列表?.[targetId])return null;
    const subject=snapshot(s,targetId,type==='custody-sighted'),witnesses=Object.keys(s.人物.列表).filter(id=>aware(s,id,true)&&(globalThis.SoulSealingCore?.active(s,targetId)?same(globalThis.SoulConsciousness?.positionOf(s,id)??actions.positionOf(s,id),subject.position):actions.colocated(s,globalThis.SoulConsciousness?.unitId(s,id)??id,targetId))).map(id=>({personId:id,position:clone(globalThis.SoulConsciousness?.positionOf(s,id)??actions.positionOf(s,id)),...(globalThis.SoulConsciousness?.proof(s,id)?{carrier:globalThis.SoulConsciousness.proof(s,id)}:{})}));
    if(type==='custody-arranged'&&details.arrangement?.kind==='facility'&&!witnesses.some(w=>w.personId===actorId)&&aware(s,actorId,true)){
      const f=custody.table(s).facilities?.find(f=>f.id===details.arrangement.facilityId),c=f?.cells.find(c=>c.id===details.arrangement.cellId),p=actions.positionOf(s,actorId);
      if(f&&f.operatorIds.includes(actorId)&&p.kind==='location'&&p.locationId===f.locationId&&(!p.sceneId||p.sceneId===c?.spaceId)&&c&&!c.locked&&subject.position.sceneId===c.spaceId){
        witnesses.push({personId:actorId,position:clone(p),handledFacilityId:f.id});
        if(!p.sceneId)for(const id of Object.keys(s.人物.列表))if(aware(s,id,true)&&actions.colocated(s,id,actorId)&&!witnesses.some(w=>w.personId===id))witnesses.push({personId:id,position:clone(actions.positionOf(s,id)),witnessedFacilityId:f.id});
      }
    }
    const departure=type==='custody-arranged'?departureRecord(s,actorId,targetId,details,sourceId,now(s)):null;
    if(departure&&subject.position.kind==='transit'&&subject.position.sceneId===departure.escort.id&&subject.position.routeId===departure.run.routeId&&subject.position.elapsedMinutes===0)for(const id of Object.keys(s.人物.列表)){
      const p=actions.positionOf(s,id);if(aware(s,id,true)&&p.kind==='location'&&!p.sceneId&&p.locationId===departure.run.from&&!witnesses.some(w=>w.personId===id))witnesses.push({personId:id,position:clone(p),departedEscortId:departure.escort.id});
    }
    if(details.captureAbilityEventId)subject.captureAbilityEventId=details.captureAbilityEventId;
    if(type==='personal-experience'){
      const experience=globalThis.SoulExperiences.describe(s,details.experience,targetId),audience=globalThis.SoulExperiences.source(s,details.experience).experienceAudiences?.[targetId];
      if(!audience)throw Error('人物经历缺少发生当时的知觉记录');
      return {subject:{...snapshot(s,targetId,true),position:clone(audience.position),experience},subjectState:clone(audience.subjectState),practiceBlocks:clone(audience.practiceBlocks),witnesses:clone(audience.witnesses),participants:clone(audience.participants),order:people.nextEventOrder(s)};
    }
    return {subject,witnesses,order:people.nextEventOrder(s)};
  }
  function grant(s,factId,observerId,channel,proof,at=now(s),order){
    const db=table(s,true),id=knowledgeId(factId,observerId,proof),existing=db.observations.find(o=>o.id===id);if(existing)return existing;
    const o=custody.stamp({id,factId,observerId,learnedAt:at,learnedOrder:order,memoryContext:masksAtOrder(s,observerId,order),channel,proof:clone(proof)});db.observations.push(o);return o;
  }
  function ingest(s){
    for(const e of custody.table(s).events){if(!e.observation)continue;
      const db=table(s,true),id=`fact:${e.id}`;if(db.facts[id])continue;
      const f=custody.stamp({id,sourceId:e.id,kind:e.type,occurredAt:e.at,subject:clone(e.observation.subject)});db.facts[id]=f;
      for(const witness of e.observation.witnesses)grant(s,id,witness.personId,'witness',witnessProof(e,witness),e.at,e.observation.order);
      for(const participant of e.observation.participants??[])grant(s,id,participant.personId,'participant',{eventId:e.id,role:participant.role},e.at,e.observation.order);
    }
  }
  function observations(s,id){return table(s).observations.filter(o=>o.observerId===id);}
  function known(s,id){const found=new Map();for(const o of observations(s,id))if(remembers(s,id,o.learnedAt,o.memoryContext,o.learnedOrder))found.set(o.factId,{observation:clone(o),fact:clone(table(s).facts[o.factId])});return [...found.values()];}
  function latest(s,viewerId,targetId){return known(s,viewerId).filter(k=>k.fact.kind!=='personal-experience'&&k.fact.subject.personId===targetId).sort((a,b)=>b.fact.occurredAt-a.fact.occurredAt||custody.table(s).events.findIndex(e=>e.id===b.fact.sourceId)-custody.table(s).events.findIndex(e=>e.id===a.fact.sourceId))[0]??null;}
  function allRelations(s){return Object.values(s.人物?.列表??{}).flatMap(p=>p.扩展?.社交约定??[]).filter(r=>r.kind==='relationship');}
  function relationshipBetween(s,a,b){
    const records=[...(s.人物?.列表?.[a]?.扩展?.社交约定??[]),...(s.人物?.列表?.[b]?.扩展?.社交约定??[])].filter(r=>r.kind==='relationship'&&[r.playerId,r.personId].includes(a)&&[r.playerId,r.personId].includes(b)&&a!==b&&['completed','ended'].includes(r.status));
    const r=records.sort((a,b)=>{const x=a.events.at(-1),y=b.events.at(-1);return (x.time.day*1440+x.time.hour*60+x.time.minute)-(y.time.day*1440+y.time.hour*60+y.time.minute)||(x.order??0)-(y.order??0)||x.revision-y.revision;}).at(-1);
    const roles=r?.roles??(r?normalizeRoles(r.relationship):null),forward=r?.playerId===a;
    const base=r?{kind:r.status==='completed'?r.relationship:null,label:r.status==='completed'?RELATIONSHIPS[r.relationship]:'关系已结束',sourceId:r.id,participants:[r.playerId,r.personId],selfRole:roles[forward?'self':'other'],otherRole:roles[forward?'other':'self'],roles,eventOrder:r.events.at(-1).order??0,history:r.history??null,...(r.origin?{cause:r.origin.kind}:{}),...(r.status==='ended'?{previousKind:r.relationship,endedSourceId:r.events.at(-1).sourceId}:{})}:null;
    return globalThis.SoulRelationRewrites?.objective(s,a,b,base)??base;
  }
  function relations(s,id){
    const records=allRelations(s).filter(r=>[r.playerId,r.personId].includes(id)),others=[...new Set([...records.map(r=>r.playerId===id?r.personId:r.playerId),...(globalThis.SoulRelationRewrites?.others(s,id)??[])])];
    return others.flatMap(other=>{let relation=relationshipBetween(s,id,other);const e=records.find(x=>x.id===relation?.sourceId)?.events.at(-1);if(e&&!remembers(s,id,e.time.day*1440+e.time.hour*60+e.time.minute,e.memoryContexts?.[id]??[],e.order??null))relation=null;relation=globalThis.SoulRelationRewrites?.subjective(s,id,other,relation)??relation;const cognitiveCustody=globalThis.SoulRelationRewrites?.subjectiveCustody(s,id,other);return relation?.kind?[{personId:other,...relation,...(cognitiveCustody?{cognitiveCustody}:{})}]:cognitiveCustody?[{personId:other,...cognitiveCustody}]:[];});
  }
  function establishRelation(s,input,sourceId){
    const {actorId,targetId,kind,origin}=input;if(!s.人物?.列表?.[actorId]||!s.人物?.列表?.[targetId]||actorId===targetId||!RELATIONSHIPS[kind]||origin?.kind!=='opening'||sourceId!==origin.entryId||!globalThis.SoulOpeningRelations?.validOrigin(s,origin,actorId,targetId,kind))throw Error('既往关系缺少正式开局来源');
    const id=`opening-relationship:${sourceId}:${actorId}:${targetId}`,old=allRelations(s).find(r=>r.id===id);if(old)return old;
    const record={id,kind:'relationship',relationship:kind,roles:normalizeRoles(kind,input.roles),history:input.history,origin:clone(origin),playerId:actorId,personId:targetId,locationId:s.人物.列表[actorId].locationId,status:'completed',events:[]};
    relationEvent(s,record,'completed',sourceId,{relationship:kind,cause:'opening',reason:input.history});(s.人物.列表[targetId].扩展.社交约定??=[]).push(record);return record;
  }
  function validEnding(s,r){const original=globalThis.SoulRelationRewrites?.table(s).records.find(v=>v.id===r.origin?.previousSourceId);return !!(r.origin?.kind==='explicit-ending'&&original?.channel==='reality'&&original.kind===r.relationship&&[original.targetId,original.otherId].includes(r.playerId)&&[original.targetId,original.otherId].includes(r.personId)&&r.events[0]?.status==='ended'&&r.events[0].sourceId===r.origin.sourceId&&r.events[0].order>original.order);}
  function endRewrittenRelation(s,actorId,targetId,sourceId){const current=relationshipBetween(s,actorId,targetId);if(!current?.kind||current.cause!=='ability-rewrite')throw Error('没有当前能力造成的正式关系');const record={id:`relation-end:${sourceId}`,kind:'relationship',relationship:current.kind,roles:normalizeRoles(current.kind,{self:current.selfRole,other:current.otherRole}),playerId:actorId,personId:targetId,locationId:s.人物.列表[actorId].locationId,status:'ended',origin:{kind:'explicit-ending',sourceId,previousSourceId:current.sourceId},events:[]};relationEvent(s,record,'ended',sourceId,{relationship:current.kind,endedBy:actorId,reason:'本人明确结束当前关系；不改变既往能力事件。'});(s.人物.列表[targetId].扩展.社交约定??=[]).push(record);return record;}
  function communicate(s,actorId,targetId,remote=false){
    people.assertAlive(s,actorId);if(!s.人物?.列表?.[targetId])throw Error('收信人尚未登记');if(!remote)people.assertAlive(s,targetId);
    if(!aware(s,actorId))throw Error('本人当前无法清醒交流');
    actions.resolve(s,{actorId,battleId:null,...(!remote?{targetIds:[targetId],containmentAction:'communication'}:{}),requirements:[remote?'gesture':'voice']});
    if(!remote&&!aware(s,targetId))throw Error('对方当前无法接收交流');
  }
  const speechTable=(s,create=false)=>{if(create)s.世界.speech??={version:1,statements:[],assessments:[],requests:{},receipts:{}};return s.世界.speech??{version:1,statements:[],assessments:[],requests:{},receipts:{}};};
  function speechPersonProof(s,id){
    const carrier=globalThis.SoulConsciousness?.proof(s,id),unitId=carrier?.unitId??id,p=s.人物.列表[id],u=s.战斗单位.列表[unitId],position=clone(carrier?actions.communicationPosition(s,id):actions.positionOf(s,id)),seal=globalThis.SoulSealingCore?.active(s,id),source=seal?.status==='confined'?globalThis.SoulSealingCore.awakeSourceAt(s,seal.id):null;
    return {personId:id,position,...(carrier?{carrier}:{}),status:p.status,hadUnit:!!u,lifeState:u?.存活状态??null,health:u?.资源.生命.当前??null,battleId:actions.battleOf(s,unitId)?.id??null,restrictions:controls.active(s,unitId).filter(v=>['status.sleep','status.stun','status.mute'].includes(v.模板ID)).map(v=>({id:v.id,templateId:v.模板ID})),...(source?{containment:{sealId:seal.id,sourceEventId:source.id,position:clone(actions.communicationPosition(s,id))}}:{})};
  }
  function validCommunicationProof(s,p,id,voice=false,at=now(s),order=Infinity){
    const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&Object.keys(v).every(k=>keys.includes(k));
    const validPosition=x=>x&&typeof x.sceneId==='string'&&(x.kind==='location'?exact(x,['kind','locationId','sceneId'])&&!!s.地图.地点[x.locationId]:x.kind==='transit'&&exact(x,['kind','locationId','sceneId','routeId','elapsedMinutes'])&&x.locationId===''&&x.sceneId&&typeof x.routeId==='string'&&x.routeId&&Number.isFinite(x.elapsedMinutes)&&x.elapsedMinutes>=0);
    const x=p?.position,c=p?.containment,carrier=p?.carrier,seal=c&&globalThis.SoulSealingCore?.record(s,c.sealId),source=c&&globalThis.SoulSealingCore?.awakeSourceAt(s,c.sealId,at,order);
    const contained=x?.kind==='contained'&&exact(x,['kind','locationId','sceneId','itemId'])&&x.locationId===''&&exact(c,['sealId','sourceEventId','position'])&&seal?.targetId===id&&seal.itemId===x.itemId&&seal.id===x.sceneId&&source?.id===c.sourceEventId&&validPosition(c.position);
    if(voice&&!globalThis.SoulInfluenceCore.autonomyAt(s,id,at,order).canSpeak)return false;
    if(voice&&!carrier&&globalThis.SoulInteriorSpaces?.permissionAt(s,id,'voice',at,order)===false)return false;
    return !!(exact(p,['personId','position','status','hadUnit','lifeState','health','battleId','restrictions',...(c?['containment']:[]),...(carrier?['carrier']:[])])&&(!carrier||globalThis.SoulConsciousness?.validProof(s,carrier,at,order)&&carrier.personId===id)&&p.personId===id&&s.人物.列表[id]&&p.status==='active'&&(c?contained:validPosition(x))&&typeof p.hadUnit==='boolean'&&(p.hadUnit?p.lifeState==='存活'&&Number.isSafeInteger(p.health)&&p.health>0:p.lifeState===null&&p.health===null)&&p.battleId===null&&Array.isArray(p.restrictions)&&new Set(p.restrictions.map(v=>v.id)).size===p.restrictions.length&&p.restrictions.every(v=>exact(v,['id','templateId'])&&typeof v.id==='string'&&v.id&&v.id.length<=600&&['status.sleep','status.stun','status.mute'].includes(v.templateId))&&!p.restrictions.some(v=>['status.sleep','status.stun',...(voice?['status.mute']:[])].includes(v.templateId)));
  }
  const audiblePosition=p=>p.containment?.position??p.position;
  function recordSpeech(s,actorId,targetId,text,sourceId,fieldOrderRef,autonomousRef){
    if(typeof text!=='string'||!text.trim()||text.length>2000||actorId===targetId)throw Error('发言须指定另一位听者与不超过2000字的原话');
    if(autonomousRef&&(!globalThis.SoulPersonChangeReactions?.validSpeechSource(s,{reactionId:autonomousRef.reactionId,sourceId,speakerId:actorId,listenerId:targetId,text})||fieldOrderRef))throw Error('人物自主发言缺少已完成的本人决定');
    const contractOrderRef=!fieldOrderRef&&!autonomousRef?globalThis.SoulPersonContracts?.speechOrderRef(s,{actorId,targetId,text,sourceId}):null;
    if(!fieldOrderRef&&!autonomousRef&&!contractOrderRef&&actorId!==s.角色.主控单位ID)throw Error('只能由本人自主发言');
    const db=speechTable(s,true),request={kind:'speak-person',actorId,targetId,text},key=`speech:${sourceId}`;
    if(!fieldOrderRef&&db.receipts[key]){if(!same(db.requests[key],request))throw Error('发言编号不能替换听者或原话');return clone(db.receipts[key]);}
    communicate(s,actorId,targetId);
    const id=`speech:${sourceId}`;if(db.statements.some(r=>r.id===id))throw Error('发言编号已经使用');
    const interiorChannel=globalThis.SoulInteriorSpaces?.communicationProof(s,actorId,targetId),order=people.nextEventOrder(s),record=custody.stamp({...(interiorChannel?{interiorChannel}:{}),id,sourceId,speakerId:actorId,listenerId:targetId,text,truth:'unverified',at:now(s),order,fieldOrderRef:clone(fieldOrderRef),...(autonomousRef?{autonomousRef:clone(autonomousRef)}:{}),...(contractOrderRef?{contractOrderRef:clone(contractOrderRef)}:{}),participants:[speechPersonProof(s,actorId),speechPersonProof(s,targetId)],memoryContexts:Object.fromEntries([actorId,targetId].map(id=>[id,masksAtOrder(s,id,order)]))});
    db.statements.push(record);const receipt={type:'person-spoke',actorId,statement:clone(record),summary:'话已传达。'};if(!fieldOrderRef){db.requests[key]=clone(request);db.receipts[key]=clone(receipt);}return receipt;
  }
  function recordAutonomousSpeech(s,actorId,targetId,text,sourceId,reactionId){return recordSpeech(s,actorId,targetId,text,sourceId,null,{reactionId});}
  function speechAssessmentReason(s,r){
    if(!r||!speechTable(s).statements.includes(r))return '原听闻不存在';
    if(speechTable(s).assessments.some(a=>a.statementId===r.id))return '本人已经对这段原话作出判断';
    if(!aware(s,r.listenerId))return '听者目前无法清醒判断';
    if(!remembers(s,r.listenerId,r.at,r.memoryContexts[r.listenerId],r.order))return '听者目前无法记起这段听闻';
    try{actions.resolve(s,{actorId:r.listenerId,battleId:null,containmentAction:'communication',requirements:[]});}catch(error){return error.message;}return '';
  }
  function beliefDecision(d){if(!d||typeof d!=='object'||Array.isArray(d)||Object.keys(d).some(k=>!['stance','reason'].includes(k))||!['believes','doubts','uncertain'].includes(d.stance)||typeof d.reason!=='string'||!d.reason.trim()||d.reason.length>300)throw Error('听闻判断须为相信、怀疑或不确定，并附1至300字的本人理由');return clone(d);}
  function assessSpeech(s,actorId,statementId,decision,sourceId){
    const db=speechTable(s,true),request={actorId,statementId,decision:beliefDecision(decision)},prior=db.receipts[sourceId];
    if(prior){if(!same(db.requests[sourceId],request))throw Error('判断编号不能替换原听者或回应');return clone(prior);}
    const r=db.statements.find(r=>r.id===statementId);if(!r||r.listenerId!==actorId)throw Error('只能判断本人实际听到的原话');const reason=speechAssessmentReason(s,r);if(reason)throw Error(reason);
    const order=people.nextEventOrder(s),assessment=custody.stamp({id:`speech-assessment:${sourceId}`,sourceId,statementId,listenerId:actorId,...request.decision,at:now(s),order,memoryContext:masksAtOrder(s,actorId,order),personProof:speechPersonProof(s,actorId)});
    const receipt={type:'person-speech-assessed',actorId,statementId,assessment:clone(assessment),summary:'对方已表达自己对这段话的判断。'};
    (s.人物.列表[actorId].扩展.世界听闻判断??=[]).push({sourceId,statementId,assessmentId:assessment.id,hash:assessment.hash});
    db.assessments.push(assessment);db.requests[sourceId]=clone(request);db.receipts[sourceId]=clone(receipt);return receipt;
  }
  // Only the actual speaker/listener retain this projection. The listener's belief is private.
  function speechFacts(s,viewerId){const db=speechTable(s);return db.statements.filter(r=>[r.speakerId,r.listenerId].includes(viewerId)&&remembers(s,viewerId,r.at,r.memoryContexts[viewerId],r.order)).map(r=>{const a=viewerId===r.listenerId?db.assessments.find(a=>a.statementId===r.id&&remembers(s,viewerId,a.at,a.memoryContext,a.order)):null;return {id:r.id,speakerId:r.speakerId,speakerName:s.人物.列表[r.speakerId].name,listenerId:r.listenerId,listenerName:s.人物.列表[r.listenerId].name,text:r.text,truth:r.truth,at:r.at,order:r.order,position:clone(r.participants[0].position),...(viewerId===r.listenerId?{assessment:a?{id:a.id,statementId:a.statementId,listenerId:a.listenerId,stance:a.stance,reason:a.reason,at:a.at,order:a.order}:null,assessmentReason:speechAssessmentReason(s,r)}:{})};});}
  function validateSpeech(s){
    const db=speechTable(s),errors=[],orders=s.世界.fieldControl?.orders??[],ids=new Set(),sequences=new Set(),assessmentIds=new Set(),sources=new Set(),assessed=new Set();
    if(db.version!==1||!Array.isArray(db.statements)||!Array.isArray(db.assessments)||!db.requests||Array.isArray(db.requests)||!db.receipts||Array.isArray(db.receipts))return ['人物发言账本格式无效'];
    const orderValid=n=>Number.isSafeInteger(n)&&n>0&&n<=s.扩展.personEventSequence;
    const exact=(v,fields)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===fields.length&&Object.keys(v).every(k=>fields.includes(k));
    const validPosition=p=>p&&typeof p.sceneId==='string'&&(p.kind==='location'?exact(p,['kind','locationId','sceneId'])&&!!s.地图.地点[p.locationId]:p.kind==='transit'&&exact(p,['kind','locationId','sceneId','routeId','elapsedMinutes'])&&p.locationId===''&&p.sceneId&&typeof p.routeId==='string'&&p.routeId&&Number.isFinite(p.elapsedMinutes)&&p.elapsedMinutes>=0);
    const validPerson=(p,id,speaker,at,order)=>validCommunicationProof(s,p,id,speaker,at,order)&&(!speaker||p.hadUnit);
    for(const r of db.statements)try{
      const o=orders.find(o=>o.id===r.fieldOrderRef?.orderId);
      if(!exact(r,['id','sourceId','speakerId','listenerId','text','truth','at','order','fieldOrderRef','participants','memoryContexts','hash',...(r.autonomousRef?['autonomousRef']:[]),...(r.contractOrderRef?['contractOrderRef']:[]),...(r.interiorChannel?['interiorChannel']:[])])||(r.fieldOrderRef!==null&&!exact(r.fieldOrderRef,['orderId','sourceStatusId']))||r.autonomousRef&&(!exact(r.autonomousRef,['reactionId'])||r.fieldOrderRef!==null)||r.contractOrderRef&&(!exact(r.contractOrderRef,['orderId','sourceId'])||r.fieldOrderRef!==null||r.autonomousRef)||!exact(r.memoryContexts,[r.speakerId,r.listenerId])||!validStamp(r)||ids.has(r.id)||r.id!==`speech:${r.sourceId}`||r.truth!=='unverified'||r.speakerId===r.listenerId||typeof r.text!=='string'||!r.text.trim()||r.text.length>2000||!validTime(s,r.at)||!orderValid(r.order)||sequences.has(r.order))throw Error('原话或发生顺序');
      ids.add(r.id);sequences.add(r.order);
      if(r.fieldOrderRef===null){const key=`speech:${r.sourceId}`,ownSource=r.contractOrderRef?globalThis.SoulPersonContracts?.validSpeechSource(s,r):r.autonomousRef?globalThis.SoulPersonChangeReactions?.validSpeechSource(s,{reactionId:r.autonomousRef.reactionId,sourceId:r.sourceId,speakerId:r.speakerId,listenerId:r.listenerId,text:r.text}):r.speakerId===s.角色.主控单位ID;if(!ownSource||!same(db.requests[key],{kind:'speak-person',actorId:r.speakerId,targetId:r.listenerId,text:r.text})||db.receipts[key]?.type!=='person-spoke'||!same(db.receipts[key]?.statement,r))throw Error('自主发言永久来源');sources.add(key);}
      else if(!o||o.status!=='executed'||o.action.type!=='speak-person'||o.executionId!==r.sourceId||o.issuedAt!==r.at||o.resolvedAt!==r.at||o.executorId!==r.speakerId||o.action.targetId!==r.listenerId||o.action.text!==r.text||r.fieldOrderRef.sourceStatusId!==o.sourceStatusId||!same(o.receipt?.statement,r))throw Error('原场外命令');
      if(!Array.isArray(r.participants)||r.participants.length!==2||!validPerson(r.participants[0],r.speakerId,true,r.at,r.order)||!validPerson(r.participants[1],r.listenerId,false,r.at,r.order)||!(r.interiorChannel?globalThis.SoulInteriorSpaces?.validCommunication(s,r.interiorChannel,r.participants,r.at,r.order):same(audiblePosition(r.participants[0]),audiblePosition(r.participants[1]))))throw Error('实际发声与听见的现场');
      for(const id of [r.speakerId,r.listenerId])if(!same(r.memoryContexts?.[id],masksAtOrder(s,id,r.order)))throw Error('听闻时认知来源');
      if(o){const events=s.世界.fieldControl.events.filter(e=>e.orderId===o.id);if(!(events[0].order<r.order&&r.order<events[1].order))throw Error('发言与命令事件顺序');}
    }catch(error){errors.push(`发言${r?.id}无效：${error.message}`);}
    for(const o of orders)if(o.status==='executed'&&o.action.type==='speak-person'&&!ids.has(o.receipt?.statement?.id))errors.push('已执行发言缺少永久听闻记录');
    for(const a of db.assessments)try{
      beliefDecision({stance:a.stance,reason:a.reason});const r=db.statements.find(r=>r.id===a.statementId),q=db.requests[a.sourceId],c=db.receipts[a.sourceId];
      if(!exact(a,['id','sourceId','statementId','listenerId','stance','reason','at','order','memoryContext','personProof','hash'])||!validStamp(a)||assessmentIds.has(a.id)||sources.has(a.sourceId)||assessed.has(a.statementId)||a.id!==`speech-assessment:${a.sourceId}`||!r||a.listenerId!==r.listenerId||!validTime(s,a.at)||a.at<r.at||!orderValid(a.order)||a.order<=r.order||sequences.has(a.order)||!validPerson(a.personProof,a.listenerId,false,a.at,a.order))throw Error('本人或发生顺序');
      if(!same(a.memoryContext,masksAtOrder(s,a.listenerId,a.order))||a.memoryContext.some(id=>s.扩展.cognitionChanges[id].appliedOrder>=r.order))throw Error('判断时已无法记起原话');
      if(!same(q,{actorId:a.listenerId,statementId:a.statementId,decision:{stance:a.stance,reason:a.reason}})||!c||c.type!=='person-speech-assessed'||c.actorId!==a.listenerId||c.statementId!==a.statementId||!same(c.assessment,a))throw Error('永久判断请求或回执');
      if(!(s.人物.列表[a.listenerId].扩展.世界听闻判断??[]).some(e=>same(e,{sourceId:a.sourceId,statementId:a.statementId,assessmentId:a.id,hash:a.hash})))throw Error('本人判断历史');
      assessmentIds.add(a.id);sources.add(a.sourceId);assessed.add(a.statementId);sequences.add(a.order);
    }catch(error){errors.push(`听闻判断${a?.id}无效：${error.message}`);}
    for(const id of new Set([...Object.keys(db.requests),...Object.keys(db.receipts)]))if(!sources.has(id))errors.push('判断永久来源缺少对应记录');
    for(const p of Object.values(s.人物.列表)){const rows=p.扩展?.世界听闻判断??[];if(!Array.isArray(rows)||new Set(rows.map(e=>e.assessmentId)).size!==rows.length){errors.push('本人听闻判断历史格式无效');continue;}for(const e of rows)if(!db.assessments.some(a=>a.listenerId===p.id&&same(e,{sourceId:a.sourceId,statementId:a.statementId,assessmentId:a.id,hash:a.hash})))errors.push('本人判断历史缺少永久结算');}
    return errors;
  }
  function relationEvent(s,r,status,sourceId,detail={}){r.status=status;r.events.push({status,sourceId,revision:s.系统.revision,time:clone(s.世界.时间),order:people.nextEventOrder(s),memoryContexts:Object.fromEntries([r.playerId,r.personId].map(id=>[id,masks(s,id).map(c=>c.id)])),...detail});}
  function relationCommand(s,r,sourceId){
    globalThis.SoulInfluenceCore.assertVoluntary(s,r.actorId);
    if(r.type==='propose-person-relation'){
      communicate(s,r.actorId,r.targetId);if(r.actorId===r.targetId||!RELATIONSHIPS[r.relationship])throw Error('关系双方或类型无效');
      const existing=relationshipBetween(s,r.actorId,r.targetId);if(existing?.kind===r.relationship||existing?.kind==='partners')throw Error('双方已有该关系或须先结束既有伴侣关系');
      if(allRelations(s).some(p=>p.status==='pending'&&[p.playerId,p.personId].includes(r.actorId)&&[p.playerId,p.personId].includes(r.targetId)))throw Error('双方已有待回应关系提议');
      const record={id:`relation:${sourceId}`,kind:'relationship',relationship:r.relationship,roles:normalizeRoles(r.relationship,r.roles),playerId:r.actorId,personId:r.targetId,locationId:s.人物.列表[r.actorId].locationId,status:'pending',events:[]};
      relationEvent(s,record,'pending',sourceId,{reason:'本人提出关系，等待另一方独立回应'});(s.人物.列表[r.targetId].扩展.社交约定??=[]).push(record);return {relationId:record.id,status:'pending'};
    }
    const record=allRelations(s).find(p=>p.id===r.relationId);if(!record){const changed=globalThis.SoulRelationRewrites?.table(s).records.find(v=>v.id===r.relationId&&v.channel==='reality'&&[v.targetId,v.otherId].includes(r.actorId)),other=changed&&[changed.targetId,changed.otherId].find(id=>id!==r.actorId);if(r.type==='end-person-relation'&&other&&relationshipBetween(s,r.actorId,other)?.sourceId===r.relationId){communicate(s,r.actorId,other);const ended=endRewrittenRelation(s,r.actorId,other,sourceId);return {relationId:ended.id,status:'ended'};}throw Error('不存在这项关系');}
    const other=[record.playerId,record.personId].find(id=>id!==r.actorId);if(!other||![record.playerId,record.personId].includes(r.actorId))throw Error('只有关系双方能够处理本人关系');
    communicate(s,r.actorId,other);
    if(r.type==='respond-person-relation'){
      if(record.personId!==r.actorId||record.status!=='pending'||typeof r.accept!=='boolean'||typeof r.reason!=='string'||!r.reason.trim()||r.reason.length>600)throw Error('须由实际受邀者明确回应及理由');
      relationEvent(s,record,r.accept?'accepted':'rejected',sourceId,{reason:r.reason});if(r.accept)relationEvent(s,record,'completed',sourceId,{relationship:record.relationship,reason:r.reason});
    }else{
      if(record.status!=='completed'||relationshipBetween(s,r.actorId,other)?.sourceId!==record.id)throw Error('这项关系已结束或被新关系替代');
      relationEvent(s,record,'ended',sourceId,{relationship:record.relationship,endedBy:r.actorId,reason:'本人明确结束关系'});
    }
    return {relationId:record.id,status:record.status};
  }
  function newsSources(s,r){
    const remote=r.type==='message-custody-news';communicate(s,r.actorId,r.targetId,remote||r.type==='send-custody-letter');
    if(remote){const link=globalThis.SoulCommerceMessages.contact(s,r.actorId,r.targetId),message=globalThis.SoulCommerceMessages.table(s).messages.find(v=>v.id===r.commerceMessageId);if(!link||link.id!==r.contactId||!message||message.senderId!==r.actorId||message.recipientId!==r.targetId||message.deliveredAt!==now(s))throw Error('商业事件知识须来自真实联络与本次已送达留言');}
    if(r.actorId===r.targetId||!Array.isArray(r.factIds)||!r.factIds.length||r.factIds.length>8||new Set(r.factIds).size!==r.factIds.length)throw Error('须指定接收者和1至8条不重复的实际消息');
    const knowledge=known(s,r.actorId);
    const sources=r.factIds.map(id=>knowledge.find(k=>k.fact.id===id)?.observation);if(sources.some(o=>!o))throw Error('本人没有获知这些事件，不能替世界全知传信');
    return sources;
  }
  function tell(s,r,sourceId,h){
    ingest(s);
    const sources=newsSources(s,r),remote=r.type==='message-custody-news';
    const at=now(s),letter=r.type==='send-custody-letter',position=letter?actions.positionOf(s,r.actorId):actions.communicationPosition(s,r.actorId);let duration=0,cost=0,destinationId=position.locationId,routeProof=null,payment=null;
    if(letter){
      if(position.kind!=='location'||position.sceneId)throw Error('须到公共驿递处寄信');controls.assertAction(s,r.actorId,'requirements',{requirements:['gesture']});
      destinationId=r.destinationId;if(!h.locations[destinationId]||h.locations[destinationId].discovery==='hidden')throw Error('收信地址必须是已登记的公开地点');
      const path=h.route(s,r.actorId,destinationId,position.locationId);duration=path.totalMinutes+30;cost=5+Math.ceil(path.totalMinutes/60);routeProof={from:position.locationId,to:destinationId,routeIds:clone(path.routeIds),locationIds:clone(path.locationIds)};
      const wallet=s.钱包.列表[s.人物.列表[r.actorId].walletId];if(wallet.gold<cost)throw Error('邮资不足');payment={walletId:wallet.id,before:wallet.gold,after:wallet.gold-cost};wallet.gold-=cost;
      s.钱包.列表['wallet-world-post']??={id:'wallet-world-post',ownerEntityId:'world-post',gold:0,扩展:{type:'post-sink'}};s.钱包.列表['wallet-world-post'].gold+=cost;
    }
    const interiorChannel=!letter&&!remote?globalThis.SoulInteriorSpaces?.communicationProof(s,r.actorId,r.targetId):null,participants=!letter&&!remote?[speechPersonProof(s,r.actorId),speechPersonProof(s,r.targetId)]:null;
    const sentOrder=people.nextEventOrder(s),deliveryOrder=letter?null:people.nextEventOrder(s);
    const m={id:`message:${sourceId}`,sourceId,senderId:r.actorId,recipientId:r.targetId,factIds:clone(r.factIds),sourceObservationIds:sources.map(o=>o.id),channel:letter?'letter':remote?'soul-device':interiorChannel?'interior':'face-to-face',...(participants?{participants}:{}),...(interiorChannel?{interiorChannel}:{}),...(remote?{contactId:r.contactId,commerceMessageId:r.commerceMessageId}:{}),sentAt:at,sentOrder,deliveryOrder,senderMemoryContext:masks(s,r.actorId).map(c=>c.id),senderPosition:clone(position),destinationId,duration,routeProof,payment,costGold:cost,status:letter?'travelling':'delivered',dueAt:at+duration,expiresAt:at+duration+7*1440,deliveredAt:letter?null:at,deliveryPosition:letter?null:clone(actions.communicationPosition(s,r.targetId))};
    if(!letter)for(const factId of m.factIds)grant(s,factId,m.recipientId,'message',{messageId:m.id},at,deliveryOrder);
    table(s,true).messages.push(custody.stamp(m));return {messageId:m.id,status:m.status,costGold:cost,dueAt:m.dueAt};
  }
  function advanceAt(s,at){
    ingest(s);
    for(const m of table(s).messages){if(!['travelling','waiting'].includes(m.status)||m.dueAt>at)continue;
      const p=actions.positionOf(s,m.recipientId);
      if(s.人物.列表[m.recipientId].status==='dead'||at>=m.expiresAt){m.status='undelivered';m.endedAt=at;custody.stamp(m);continue;}
      if(p.kind==='location'&&!p.sceneId&&p.locationId===m.destinationId&&aware(s,m.recipientId,true)&&!controls.actionReason(s,m.recipientId,'requirements',{requirements:['gesture']})){
        m.status='delivered';m.deliveredAt=at;m.deliveryOrder=people.nextEventOrder(s);m.deliveryPosition=clone(p);for(const factId of m.factIds)grant(s,factId,m.recipientId,'message',{messageId:m.id},at,m.deliveryOrder);
      }else m.status='waiting';custody.stamp(m);
    }
  }
  function nextAt(s,through){const times=table(s).messages.flatMap(m=>m.status==='travelling'?[m.dueAt]:m.status==='waiting'?[m.expiresAt]:[]).filter(t=>t<=through);return times.length?Math.min(...times):null;}
  function execute(s,r,sourceId,h){
    if(r.type==='speak-person')return recordSpeech(s,r.actorId,r.targetId,r.text,sourceId,null);
    let result;if(r.type.includes('person-relation'))result=relationCommand(s,r,sourceId);
    else if(r.type==='observe-custody-person'){
      if(!aware(s,r.actorId,true)||!(actions.colocated(s,r.actorId,r.targetId)||globalThis.SoulSealingCore?.canObserveContained(s,r.actorId,r.targetId)))throw Error('只能观察实际同场的人物');
      const e=custody.event(s,'custody-sighted',r.actorId,r.targetId,sourceId);ingest(s);result={factId:`fact:${e.id}`,subject:clone(e.observation.subject)};
    }else result=tell(s,r,sourceId,h);
    return {type:'world-social',action:r.type,actorId:r.actorId,targetId:r.targetId??null,...result,summary:result.relationId?'已保存对方的关系回应。':result.factId?'已记下眼前的情况。':result.status==='delivered'?'消息已送达。':'信件已寄出，需抵达收信地后才能交付。'};
  }
  function facts(s,viewerId,{includeSpeech=true}={}){
    const knowledge=known(s,viewerId),bonds=relations(s,viewerId),heard=observations(s,viewerId).filter(o=>remembers(s,viewerId,o.learnedAt,o.memoryContext,o.learnedOrder)),nearby=Object.values(s.人物?.列表??{}).filter(p=>p.id!==viewerId&&actions.communicationColocated(s,viewerId,p.id)&&actions.perception(s,viewerId,p.id)).map(p=>({id:p.id,name:p.name}));
    const recipientIds=new Set([...nearby.map(p=>p.id),...bonds.map(r=>r.personId),...knowledge.map(k=>k.fact.subject.personId)]);recipientIds.delete(viewerId);
    return {viewerId,recipients:[...recipientIds].map(id=>({id,name:s.人物.列表[id].name})),nearby,knowledge,relations:bonds,speech:includeSpeech?speechFacts(s,viewerId):[],
      pendingRelations:allRelations(s).filter(r=>r.status==='pending'&&[r.playerId,r.personId].includes(viewerId)&&remembers(s,viewerId,r.events[0].time.day*1440+r.events[0].time.hour*60+r.events[0].time.minute,r.events[0].memoryContexts?.[viewerId]??[],r.events[0].order??null)).map(clone),
      messages:table(s).messages.filter(m=>m.senderId===viewerId&&remembers(s,viewerId,m.sentAt,m.senderMemoryContext,m.sentOrder)||m.recipientId===viewerId&&m.status==='delivered'&&heard.some(o=>o.proof.messageId===m.id)).map(m=>m.senderId===viewerId&&m.recipientId!==viewerId?{id:m.id,senderId:m.senderId,recipientId:m.recipientId,channel:m.channel,factIds:clone(m.factIds),sentAt:m.sentAt,destinationId:m.destinationId,costGold:m.costGold,status:m.channel==='letter'?'sent':'delivered'}:{id:m.id,senderId:m.senderId,recipientId:m.recipientId,channel:m.channel,factIds:clone(m.factIds),sentAt:m.sentAt,deliveredAt:m.deliveredAt,status:'delivered'})};
  }
  function validate(s,h={}){
    const db=s.世界?.social,errors=[...validateSpeech(s),...(globalThis.SoulRelationRewrites?.validate(s)??[])],sourceEvents=custody.table(s).events;
    const orderValid=n=>Number.isSafeInteger(n)&&n>0&&n<=Number(s.扩展.personEventSequence);
    const relationOrders=new Set();
    for(const r of allRelations(s)){
      try{if(!RELATIONSHIPS[r.relationship]||r.roles&&!same(r.roles,normalizeRoles(r.relationship,r.roles)))throw Error('角色');if(r.origin?.kind==='opening'&&!globalThis.SoulOpeningRelations?.validOrigin(s,r.origin,r.playerId,r.personId,r.relationship,r.id)||r.origin?.kind==='explicit-ending'&&!validEnding(s,r))throw Error('来源');}catch{errors.push('关系类型、双方身份或正式来源无效');}
      let previous=0;
      for(const e of r.events??[]){
        if(!orderValid(e.order)||e.order<=previous||relationOrders.has(e.order))errors.push('关系事件缺少实际发生顺序');
        relationOrders.add(e.order);previous=e.order;
        for(const id of [r.playerId,r.personId])if(!same(e.memoryContexts?.[id],masksAtOrder(s,id,e.order)))errors.push('关系事件认知来源与发生时刻不符');
      }
    }
    if(sourceEvents.some(e=>OBSERVABLE.includes(e.type)&&!e.observation))errors.push('实际事件缺少发生时观察快照');if(!db)return sourceEvents.some(e=>e.observation)?[...errors,'实际目击事件缺少知识账本']:errors;
    if(db.version!==1||!db.facts||Array.isArray(db.facts)||!Array.isArray(db.observations)||!Array.isArray(db.messages))return ['人物消息账本格式无效'];
    const events=custody.table(s).events,observationsById=new Map(),messages=new Map();
    for(const m of db.messages)messages.set(m.id,m);
    for(const e of events.filter(e=>e.observation)){const f=db.facts[`fact:${e.id}`];if(!f||f.sourceId!==e.id||f.occurredAt!==e.at||f.kind!==e.type||!same(f.subject,e.observation.subject))errors.push('事件知识缺少实际来源或目击内容已改变');}
    for(const e of events.filter(e=>e.observation)){
      const o=e.observation;if(!orderValid(o.order)||!OBSERVABLE.includes(e.type)||o.subject.personId!==e.targetId||!Array.isArray(o.witnesses)||new Set(o.witnesses.map(w=>w.personId)).size!==o.witnesses.length)errors.push('目击快照格式无效');
      for(const w of o.witnesses){
        if(w.carrier&&!globalThis.SoulConsciousness?.validProof(s,w.carrier,e.at,o.order))errors.push('目击意识载体来源无效');
        if(!s.人物.列表[w.personId]){errors.push('目击人物未登记');continue;}
        if([w.handledFacilityId,w.witnessedFacilityId,w.departedEscortId].filter(Boolean).length>1)errors.push('目击者不能混用现场交接来源');
        if(w.handledFacilityId||w.witnessedFacilityId){
          const facilityId=w.handledFacilityId??w.witnessedFacilityId,f=events.find(x=>x.type==='logistics-facilities'&&x.sourceId===e.sourceId&&x.entityId===facilityId)?.record,c=f?.cells.find(c=>c.spaceId===o.subject.position.sceneId),handler=o.witnesses.find(v=>v.personId===e.actorId&&v.handledFacilityId===facilityId);
          if(e.type!=='custody-arranged'||!f?.operatorIds.includes(e.actorId)||w.position.kind!=='location'||w.position.locationId!==f.locationId||!c||c.locked||e.arrangement?.facilityId!==f.id||(w.handledFacilityId?e.actorId!==w.personId:!handler||w.position.sceneId!==''||!same(w.position,handler.position)))errors.push('入监知情缺少实际办理现场凭证');
        }else if(w.departedEscortId){
          const d=departureRecord(s,e.actorId,e.targetId,e,e.sourceId,e.at);
          if(!d||w.departedEscortId!==d.escort.id||w.position.kind!=='location'||w.position.sceneId!==''||w.position.locationId!==d.run.from||o.subject.position.kind!=='transit'||o.subject.position.sceneId!==d.escort.id||o.subject.position.routeId!==d.run.routeId||o.subject.position.elapsedMinutes!==0)errors.push('押送目击缺少实际启程现场凭证');
        }else if(w.interiorView){const proof=w.interiorView;if(proof.observerId!==w.personId||proof.targetId!==e.targetId||!globalThis.SoulInteriorSpaces.validVisibilityProof(s,proof,e.at,o.order)||w.position.sceneId!==`interior:${proof.spaceId}:${proof.observerRegionId}`||o.subject.position.sceneId!==`interior:${proof.spaceId}:${proof.targetRegionId}`||w.position.locationId!==o.subject.position.locationId)errors.push('画境目击缺少发生当时的房间视线来源');}else if(!same(w.position,o.subject.position))errors.push('目击者没有实际同场');
      }
      if(e.type==='custody-sighted'&&(o.subject.custodyId!==null||o.subject.captorId!==null||o.subject.custodianId!==null||o.subject.arrangement!==null||!['unconfirmed','dead'].includes(o.subject.status)))errors.push('肉眼观察不能获知旧看管历史或幕后权限');
    }
    for(const [id,f] of Object.entries(db.facts))if(id!==f.id||id!==`fact:${f.sourceId}`||!validStamp(f)||!events.some(e=>e.id===f.sourceId&&e.observation)||!validTime(s,f.occurredAt))errors.push('客观事件知识无效');
    for(const o of db.observations){
      if(observationsById.has(o.id)||o.id!==knowledgeId(o.factId,o.observerId,o.proof)||!validStamp(o)||!db.facts[o.factId]||!s.人物.列表[o.observerId]||!orderValid(o.learnedOrder)||!validTime(s,o.learnedAt)||o.learnedAt<db.facts[o.factId]?.occurredAt)errors.push('人物获知记录无效');observationsById.set(o.id,o);
      if(!same(o.memoryContext,masksAtOrder(s,o.observerId,o.learnedOrder))||!Array.isArray(o.memoryContext)||new Set(o.memoryContext).size!==o.memoryContext.length||o.memoryContext.some(id=>{const c=s.扩展?.cognitionChanges?.[id];return !c||c.targetId!==o.observerId||c.direction!=='屏蔽既往经历'||c.appliedAt>o.learnedAt;}))errors.push('获知时认知来源无效');
      if(o.channel==='witness'){const e=events.find(e=>e.id===o.proof.eventId);if(!e||o.factId!==`fact:${e.id}`||o.learnedAt!==e.at||o.learnedOrder!==e.observation?.order||!e.observation?.witnesses.some(w=>w.personId===o.observerId&&same(witnessProof(e,w),o.proof)))errors.push('目击者不在事件当时的实际观察记录中');}
      else if(o.channel==='participant'){const e=events.find(e=>e.id===o.proof.eventId);if(!e||e.type!=='personal-experience'||o.factId!=='fact:'+e.id||o.learnedAt!==e.at||o.learnedOrder!==e.observation.order||!e.observation.participants?.some(p=>p.personId===o.observerId&&p.role===o.proof.role&&p.personId===(p.role==='executor'?e.actorId:e.targetId)))errors.push('当事人经历缺少实际来源');}
      else if(o.channel==='message'){const m=messages.get(o.proof.messageId);if(!m||m.recipientId!==o.observerId||m.status!=='delivered'||m.deliveredAt!==o.learnedAt||m.deliveryOrder!==o.learnedOrder||!m.factIds.includes(o.factId))errors.push('听闻没有已送达消息');}
      else errors.push('知识渠道无效');
    }
    for(const e of events.filter(e=>e.observation))for(const w of e.observation.witnesses)if(!observationsById.has(knowledgeId(`fact:${e.id}`,w.personId,{eventId:e.id})))errors.push('实际目击知识已被删除');
    for(const e of events.filter(e=>e.observation?.participants))for(const p of e.observation.participants)if(!observationsById.has(knowledgeId('fact:'+e.id,p.personId,{eventId:e.id})))errors.push('实际当事人经历已被删除');
    const tracing=new Set(),traced=new Set();
    function trace(id){if(traced.has(id))return true;if(tracing.has(id))return false;const o=observationsById.get(id);if(!o)return false;if(['witness','participant'].includes(o.channel)){traced.add(id);return true;}tracing.add(id);const m=messages.get(o.proof?.messageId),index=m?.factIds.indexOf(o.factId),source=m?.sourceObservationIds[index];const pass=!!source&&trace(source);tracing.delete(id);if(pass)traced.add(id);return pass;}
    for(const o of db.observations)if(!trace(o.id))errors.push('消息知识必须无环并可追溯到实际目击');
    const ids=new Set();for(const m of db.messages)try{
      if(ids.has(m.id)||m.id!==`message:${m.sourceId}`||!validStamp(m)||!s.人物.列表[m.senderId]||!s.人物.列表[m.recipientId]||m.senderId===m.recipientId||!Array.isArray(m.factIds)||!m.factIds.length||m.factIds.length>8||new Set(m.factIds).size!==m.factIds.length||m.sourceObservationIds.length!==m.factIds.length||!orderValid(m.sentOrder)||!validTime(s,m.sentAt))throw Error('字段');ids.add(m.id);
      if(!same([...m.senderMemoryContext].sort(),masksAtOrder(s,m.senderId,m.sentOrder))||!Array.isArray(m.senderMemoryContext)||m.senderMemoryContext.some(id=>{const c=s.扩展?.cognitionChanges?.[id];return !c||c.targetId!==m.senderId||c.direction!=='屏蔽既往经历'||c.appliedAt>m.sentAt;}))throw Error('发信时认知来源');
      for(let i=0;i<m.factIds.length;i++){const o=observationsById.get(m.sourceObservationIds[i]);if(!o||o.observerId!==m.senderId||o.factId!==m.factIds[i]||o.learnedAt>m.sentAt||o.learnedOrder>=m.sentOrder||o.proof.messageId===m.id||m.senderMemoryContext.some(id=>{const c=s.扩展.cognitionChanges[id];return o.learnedOrder<c.appliedOrder;}))throw Error('发信人知识来源');}
      if(!['letter','face-to-face','soul-device','interior'].includes(m.channel)||!['travelling','waiting','delivered','undelivered'].includes(m.status)||!Number.isSafeInteger(m.duration)||m.duration<0||m.dueAt!==m.sentAt+m.duration||m.expiresAt!==m.dueAt+7*1440||(m.channel==='letter'?(m.duration<30||m.costGold!==5+Math.ceil((m.duration-30)/60)):m.duration!==0||m.costGold!==0))throw Error('渠道或邮资');
      if(m.channel==='soul-device'){const original=globalThis.SoulCommerceMessages.table(s).messages.find(v=>v.id===m.commerceMessageId),link=globalThis.SoulCommerceMessages.contact(s,m.senderId,m.recipientId);if(!original||original.senderId!==m.senderId||original.recipientId!==m.recipientId||original.deliveredAt!==m.deliveredAt||link?.id!==m.contactId)throw Error('远程实际联络和留言来源');}
      if(m.channel==='letter'){const p=m.routeProof;if(!p||p.from!==m.senderPosition.locationId||p.to!==m.destinationId||!Array.isArray(p.routeIds)||!Array.isArray(p.locationIds)||p.locationIds.length!==p.routeIds.length+1||p.locationIds[0]!==p.from||p.locationIds.at(-1)!==p.to)throw Error('邮路凭证');let minutes=0;for(let i=0;i<p.routeIds.length;i++){const r=h.routes?.[p.routeIds[i]];if(!r||![r.from,r.to].includes(p.locationIds[i])||(r.from===p.locationIds[i]?r.to:r.from)!==p.locationIds[i+1])throw Error('邮路连接');minutes+=r.minutes;}if(m.duration!==minutes+30||m.payment?.walletId!==s.人物.列表[m.senderId].walletId||!Number.isSafeInteger(m.payment.before)||m.payment.before-m.payment.after!==m.costGold||m.payment.after<0)throw Error('实际邮路或付款');}
      else if(m.routeProof!==null||m.payment!==null)throw Error('当面转告不产生邮路或付款');
      if(m.status==='delivered'){
        if(!orderValid(m.deliveryOrder)||m.deliveryOrder<=m.sentOrder||!validTime(s,m.deliveredAt)||m.deliveredAt<m.dueAt||!m.deliveryPosition||m.channel==='letter'&&(m.deliveryPosition.kind!=='location'||m.deliveryPosition.sceneId||m.deliveryPosition.locationId!==m.destinationId))throw Error('交付位置');
        if(m.channel==='interior'&&(!Array.isArray(m.participants)||m.participants.length!==2||!validCommunicationProof(s,m.participants[0],m.senderId,true,m.sentAt,m.sentOrder)||!validCommunicationProof(s,m.participants[1],m.recipientId,false,m.sentAt,m.sentOrder)||!same(m.participants[0].position,m.senderPosition)||!same(m.participants[1].position,m.deliveryPosition)||!globalThis.SoulInteriorSpaces.validCommunication(s,m.interiorChannel,m.participants,m.sentAt,m.sentOrder)))throw Error('画境交流通道');
        if(m.channel==='face-to-face'&&(!same(m.senderPosition,m.deliveryPosition)||!Array.isArray(m.participants)||m.participants.length!==2||!validCommunicationProof(s,m.participants[0],m.senderId,true,m.sentAt,m.sentOrder)||!validCommunicationProof(s,m.participants[1],m.recipientId,false,m.sentAt,m.sentOrder)||!same(m.participants[0].position,m.senderPosition)||!same(m.participants[1].position,m.deliveryPosition)))throw Error('现场交流位置或意识载体来源');
        for(const id of m.factIds){const o=observationsById.get(knowledgeId(id,m.recipientId,{messageId:m.id}));if(!o||o.learnedAt!==m.deliveredAt)throw Error('交付知识');}
      }else if(m.deliveredAt!==null||m.deliveryOrder!==null||m.deliveryPosition!==null||m.status==='undelivered'&&!validTime(s,m.endedAt))throw Error('未交付');
    }catch(error){errors.push(`消息${m.id}无效：${error.message}`);}
    if((s.钱包.列表['wallet-world-post']?.gold??0)!==db.messages.reduce((n,m)=>n+m.costGold,0))errors.push('邮资流水与实收不一致');
    return errors;
  }
  return Object.freeze({INTENTS,RELATIONSHIPS,DEFAULT_ROLES,normalizeRoles,establishRelation,validEnding,endRewrittenRelation,OBSERVABLE,table,experienceAudience,observationAt,ingest,newsSources,known,latest,relations,relationshipBetween,memoryContext,masksAtOrder,remembers,remembersAtOrder,communicate,communicationProof:speechPersonProof,validCommunicationProof,speechTable,recordSpeech,recordAutonomousSpeech,assessSpeech,speechAssessmentReason,speechFacts,appendCommitmentEvent:relationEvent,rewriteRelation:(s,r)=>globalThis.SoulRelationRewrites.rewriteRelation(s,r),rewriteSubjectiveRelation:(s,r)=>globalThis.SoulRelationRewrites.rewriteSubjectiveRelation(s,r),rewriteCustody:(s,r)=>globalThis.SoulCustodyRewrites.rewriteCustody(s,r),revokeRelationSource:(s,id,sourceId)=>globalThis.SoulRelationRewrites.revokeSource(s,id,sourceId),execute,nextAt,advanceAt,facts,validate});
});
