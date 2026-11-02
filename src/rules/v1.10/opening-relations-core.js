(function(root,factory){const get=(n,f)=>root?.[n]??(typeof require==='function'?require(f):null);const api=factory(get('SoulWorldSocial','./world-social-core.js'),get('SoulCustodyCore','./custody-core.js'),get('SoulAbilityContract','./ability-contract-core.js'),get('SoulPersonCore','./person-core.js'));if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulOpeningRelations=api;})(typeof globalThis!=='undefined'?globalThis:this,function(social,custody,abilities,people){
 'use strict';
 const clone=v=>JSON.parse(JSON.stringify(v)),same=(a,b)=>abilities.hash(a)===abilities.hash(b),valid=r=>r&&r.hash===abilities.hash(Object.fromEntries(Object.entries(r).filter(([k])=>k!=='hash')));
 const catalog=()=>globalThis.SoulBackgroundCatalog,arena=()=>globalThis.SoulCanonArenaEngine;
 const ref=(source,key)=>source==='canon'?{source,characterId:key}:{source,personId:key};
 function targetRef(key){return arena()?.CHARACTER_CATALOG[key]?ref('canon',arena().WORLD_STORY_SELECTIONS[arena().worldCharacterIdentityId(key)]??key):ref('person',key);}
 function defaults(config){
  const b=config.background??{id:'custom'},definitions=catalog()?.BACKGROUNDS??{},buyers=catalog()?.BUYERS??{},rows=[];
  const add=(actor,tuple)=>{const [key,name,kind,label]=tuple,inverse=kind==='employment'?'雇主':kind==='hierarchy'?(label==='上级'?'下属':'上级'):kind==='kin'?(/叔|伯|姨|舅/.test(label)?'晚辈':/兄|姐/.test(label)?'弟妹':/弟|妹/.test(label)?'兄姐':'亲属'):social.DEFAULT_ROLES[kind]?.[0];rows.push({actor,target:targetRef(key),kind,roles:{self:inverse??label,other:label||social.DEFAULT_ROLES[kind]?.[1]},history:`故事开始前已经相识：${label}。`,contact:true,custody:null});};
  if(['prince-cat','sealed-titled'].includes(b.id)){
   const buyer=b.actors?.buyer;if(!buyer||buyer.source==='default')for(const row of b.id==='prince-cat'?definitions[b.id]?.relations??[]:buyers[b.buyerId]?.relations??[])add({source:'opening',side:'buyer'},row);
   const captive=b.actors?.captive;if(b.id==='sealed-titled'&&(!captive||captive.source==='default'))add({source:'opening',side:'captive'},['commerce-comrade-lu','陆行舟','comrades','同门']);
  }else for(const row of definitions[b.id]?.relations??[])add({source:'opening',side:'main'},row);
  if(b.id==='custom')for(const [i,c] of (b.contacts??[]).entries())rows.push({target:ref('person',`background-familiar-${i+1}`),kind:c.relationship,roles:social.normalizeRoles(c.relationship),history:c.history,contact:c.contact,custody:null});
  return rows;
 }
 function placement(row){if(row.startTogether!==undefined&&typeof row.startTogether!=='boolean')throw Error('请选择合法的开局同地安排');if(row.initialRealm!==undefined&&typeof row.initialRealm!=='boolean')throw Error('请选择合法的开局入画安排');return {...(row.startTogether?{startTogether:true}:{}),...(row.initialRealm?{initialRealm:true}:{})};}
 function normalizeRelations(rows){if(!Array.isArray(rows))throw Error('开局关系须为人物关系列表');return rows.map(row=>({...(row.actor?{actor:clone(row.actor)}:{}),target:clone(row.target),kind:row.kind??null,roles:row.kind?social.normalizeRoles(row.kind,row.roles):null,history:String(row.history??'').trim(),contact:row.contact===true,custody:row.custody??null,...placement(row)}));}
 // Editing and reopening a draft must retain an unfinished text field. Only
 // validateDraft/initialize may turn these rows into established relationships.
 function draftRelations(rows){
  if(!Array.isArray(rows))throw Error('开局关系须为人物关系列表');
  return rows.map(row=>{
   if(!row||typeof row!=='object'||Array.isArray(row))throw Error('开局关系格式无效');
   const kind=row.kind??null,defaults=kind?social.DEFAULT_ROLES[kind]:null;
   if(kind&&!defaults)throw Error('关系类型无效');
   if(row.roles!==undefined&&row.roles!==null&&(typeof row.roles!=='object'||Array.isArray(row.roles)))throw Error('双方身份格式无效');
   const roles=kind?{self:row.roles?.self??row.roles?.target??defaults[0],other:row.roles?.other??defaults[1]}:null;
   if(roles&&Object.values(roles).some(value=>typeof value!=='string'||value.length>30))throw Error('双方身份最多30字');
   return {...(row.actor?{actor:clone(row.actor)}:{}),target:clone(row.target),kind,roles,history:String(row.history??'').trim(),contact:row.contact===true,custody:row.custody??null,...placement(row)};
  });
 }
 function referenceDetails(config){
  const b=config.background??{id:'custom'},backgrounds=globalThis.SoulBackgroundCore,slots=b.id==='sealed-titled'?backgrounds.resolveSlots(config):null,mainId=backgrounds.playerId(b,'opening-main');
  const idOf=r=>r.source==='canon'?arena().persistentCharacterId(r.characterId):r.source==='person'?r.personId:r.side==='main'?mainId:r.side==='buyer'?(slots?.buyer.id??'resident-xue-beng'):(slots?.captive.id??'captive-cat-liu');
  const names=new Map(Object.values(catalog().BACKGROUNDS).flatMap(v=>v.relations??[]).concat(Object.values(catalog().BUYERS).flatMap(v=>v.relations??[])).map(row=>[row[0],row[1]]));names.set('commerce-comrade-lu','陆行舟');for(const [i,c] of (b.contacts??[]).entries())names.set(`background-familiar-${i+1}`,c.name);
  const nameOf=r=>r.source==='canon'?arena().worldCharacterRecord(r.characterId,config,'catalog')?.name:r.source==='person'?names.get(r.personId)??r.personId:r.side==='main'?config.name:r.side==='buyer'?slots?.buyer.draft.name??'雪崩':slots?.captive.draft.name??'柳青葭';
  return {idOf,nameOf,mainId};
 }
 function summary(config){
  const b=config.background??{id:'custom'},{idOf,nameOf,mainId}=referenceDetails(config);
  return draftRelations(b.relations??defaults(config)).flatMap(row=>{const actor=row.actor??{source:'opening',side:'main'},a=idOf(actor),t=idOf(row.target);if(a!==mainId&&t!==mainId)return [];const forward=a===mainId,other=forward?row.target:actor,roles=row.roles?forward?row.roles:{self:row.roles.other,other:row.roles.self}:null,custody=forward?row.custody:row.custody==='master'?'slave':row.custody==='slave'?'master':null;return [{name:nameOf(other),kind:row.kind,label:roles?.other?.trim()||(roles?'身份待填写':custody==='master'?'被看管者':custody==='slave'?'主人':'关系'),roles,history:row.history,contact:row.contact,custody,target:idOf(other),...placement(row)}];});
 }
 function custodyTargets(config){const {nameOf,idOf}=referenceDetails(config);return draftRelations(config.background?.relations??defaults(config)).flatMap((row,entryIndex)=>{if(!row.custody)return [];const actor=row.actor??{source:'opening',side:'main'},controllerRef=clone(row.custody==='master'?actor:row.target),targetRef=clone(row.custody==='master'?row.target:actor);return [{entryIndex,controllerRef,targetRef,key:'relation:'+referenceKey(targetRef),targetId:idOf(targetRef),controllerId:idOf(controllerRef),name:nameOf(targetRef),controllerName:nameOf(controllerRef)}];});}
 function fixedPlacementTarget(config,target){if(target.source==='opening')return true;const {idOf,mainId}=referenceDetails(config),ids=[mainId];if(['prince-cat','sealed-titled'].includes(config.background?.id))ids.push(idOf({source:'opening',side:'buyer'}),idOf({source:'opening',side:'captive'}));return ids.includes(idOf(target));}
 function referenceKey(r){if(r?.source==='opening'&&['main','buyer','captive'].includes(r.side))return `opening:${r.side}`;if(r?.source==='canon'&&arena()?.CHARACTER_CATALOG[r.characterId])return `canon:${arena().worldCharacterIdentityId(r.characterId)}`;if(r?.source==='person'&&typeof r.personId==='string'&&r.personId)return `person:${r.personId}`;throw Error('请选择实际的原著人物或已有背景人物');}
 function validateDraft(config){const errors=[];try{const b=config.background??{},rows=normalizeRelations(b.relations??defaults(config)),pairs=new Set();for(const r of rows){const a=referenceKey(r.actor??{source:'opening',side:'main'}),t=referenceKey(r.target),pair=[a,t].sort().join('|');if(a===t||pairs.has(pair))throw Error('每对人物只能配置一条主要关系与一条独立归属');pairs.add(pair);if(r.startTogether&&fixedPlacementTarget(config,r.target))throw Error('本次开局人物的位置由所选场景安排，请为新增人物设置同地');if(r.kind!==null&&!social.RELATIONSHIPS[r.kind]||!r.kind&&!r.custody||!['master','slave',null].includes(r.custody)||r.history.length<1||r.history.length>1200)throw Error('请填写合法关系、归属及1至1200字相识经历');if(r.initialRealm&&(b.id!=='jiumeitu-heir'||a!=='opening:main'||r.custody!=='master'||r.target.source!=='canon'))throw Error('只有九美图传人预设能将主角看管的原著人物设为开局画中囚犯');if(r.target.source==='canon'){const reason=arena().worldCharacterUnavailableReason?.(r.target.characterId,config,'catalog');if(reason)throw Error(reason);if(r.initialRealm){const person=arena().worldCharacterRecord(r.target.characterId,config,'catalog'),realm=globalThis.SoulResidentRealms,eligibility=realm.captureGenderEligibility(person?.worldPersona?.gender,realm.PROFILES['nine-beauties-v1']);if(!eligibility.pass)throw Error((person?.name??'所选人物')+'无法开局入画：'+eligibility.reason);}}}
  const selected=rows.filter(r=>r.initialRealm),opened=Math.min(9,Math.floor((catalog().policy(b,config.difficulty).level-1)/10));if(selected.length>opened)throw Error(`开局画中囚犯有${selected.length}人，当前仅开放${opened}席；请提高开局等级并配置对应魂环，或减少囚犯`);
 }catch(e){errors.push(e.message);}return errors;}
 function replace(s,next){if(s===next)return;const opening=s.世界?.opening;for(const key of Object.keys(s))delete s[key];Object.assign(s,next);if(opening)s.世界.opening=opening;}
 function resolve(s,r,config,w,context,sourceId){
  if(r.source==='opening'){const id=r.side==='buyer'?context.buyerId:r.side==='captive'?context.subjectId:context.mainId;if(!s.人物.列表[id])throw Error('开局角色尚未建立');return id;}
  if(r.source==='canon'){const result=arena().ensurePersistentCharacter(s,r.characterId);replace(s,result.state);return result.unitId;}
  if(s.人物.列表[r.personId])return r.personId;
  const index=/^background-familiar-(\d+)$/.exec(r.personId),contact=index?config.background.contacts?.[Number(index[1])-1]:null;
  const names=Object.values(catalog()?.BUYERS??{}).flatMap(b=>b.relations??[]).concat(Object.values(catalog()?.BACKGROUNDS??{}).flatMap(b=>b.relations??[])),name=contact?.name??names.find(row=>row[0]===r.personId)?.[1];
  if(!name||!context.ensurePerson)throw Error('此背景人物没有正式创建来源');const id=context.ensurePerson(s,r.personId,name,w,sourceId);if(contact){const p=s.人物.列表[id];p.扩展.characterProfile.data.biography=contact.history;}return id;
 }
 function installCustody(s,entry,w){
  const ownerId=entry.custody==='master'?entry.actorId:entry.targetId,targetId=entry.custody==='master'?entry.targetId:entry.actorId,existing=custody.active(s,targetId);
  if(existing){if(existing.custodianId!==ownerId)throw Error('开局归属与场景已经成立的归属冲突，请修改该条主奴设定');entry.custodyId=existing.id;entry.custodySource='scene';return;}
  const p=s.人物.列表[ownerId];w.commerceHooks().move(s,[targetId],p.locationId,p.spaceId??'');const db=custody.table(s,true),old=db.byPerson[targetId];if(old)db.history.push(clone(old));
  const sourceId=`opening-relation:${entry.id}`,record=custody.stamp({id:`custody:${sourceId}:${targetId}`,personId:targetId,captorId:ownerId,custodianId:ownerId,authorityVersion:1,authorityEventId:`custody-event:${sourceId}:custody-initialized:${targetId}`,defeatId:null,originKind:'opening-relation',openingEntryId:entry.id,status:'held',arrangement:'held-at-scene',since:people.now(s),sourceId,restraintItemIds:[]});db.byPerson[targetId]=record;entry.custodyId=record.id;entry.custodySource='opening';
  custody.event(s,'custody-initialized',ownerId,targetId,sourceId,{custodyId:record.id,authority:custody.authorityRef(record),initialSource:{kind:'opening-relation',entryId:entry.id,sourceId:s.世界.opening.committedTransactionId},terms:'玩家确认的开局既往归属；没有拍卖、战斗、同意或忠诚记录。'});
 }
 function initialize(s,config,sourceId,w,context={}){
  if(sourceId!==s.世界.opening.committedTransactionId||s.世界.processedTransactions?.[sourceId]||s.世界.opening.relations)throw Error('开局关系只能在本次创建事务中建立一次');const errors=validateDraft(config);if(errors.length)throw Error(errors.join('；'));
  const rows=normalizeRelations(config.background?.relations??defaults(config)),db={version:1,sourceId,rows:clone(rows),entries:[]};s.世界.opening.relations=db;context={mainId:s.角色.主控单位ID,...context};
  for(const [index,row] of rows.entries()){const actorId=resolve(s,row.actor??{source:'opening',side:'main'},config,w,context,sourceId),targetId=resolve(s,row.target,config,w,context,sourceId);if(actorId===targetId||db.entries.some(e=>[e.actorId,e.targetId].includes(actorId)&&[e.actorId,e.targetId].includes(targetId)))throw Error('同一实际人物不能重复建立开局关系');const entry={id:`${sourceId}:${index}`,index,actorId,targetId,...clone(row),relationshipId:null,contactId:null};db.entries.push(entry);
   if(row.startTogether){const actor=s.人物.列表[actorId];if([context.mainId,context.buyerId,context.subjectId].includes(targetId))throw Error('本次开局人物的位置由所选场景安排，请为新增人物设置同地');w.commerceHooks().move(s,[targetId],actor.locationId,actor.spaceId??'');}
   if(row.kind){const r=social.establishRelation(s,{actorId,targetId,kind:row.kind,roles:row.roles,history:row.history,origin:{kind:'opening',sourceId,entryId:entry.id}},`${sourceId}:${index}`);entry.relationshipId=r.id;}
   if(row.contact){const prior=(s.人物.列表[targetId].扩展?.社交约定??[]).find(r=>r.kind==='contact'&&r.playerId===actorId&&r.status==='completed');if(prior)entry.contactId=prior.id;else{const r={id:`opening-contact:${sourceId}:${index}`,kind:'contact',playerId:actorId,personId:targetId,locationId:s.人物.列表[actorId].locationId,status:'completed',channel:'soul-device',origin:{kind:'opening',sourceId,entryId:entry.id},events:[]};social.appendCommitmentEvent(s,r,'completed',`${sourceId}:${index}:contact`,{channel:'soul-device',cause:'opening',reason:row.history});(s.人物.列表[targetId].扩展.社交约定??=[]).push(r);entry.contactId=r.id;}}
   if(row.custody)installCustody(s,entry,w);
  }
  custody.stamp(db);return db;
 }
 /** A preset choice performs the same paid capture as play; no slot is injected. */
 function installInitialRealms(s,config,sourceId){
  const rows=s.世界.opening?.relations?.entries.filter(e=>e.initialRealm)??[];if(!rows.length)return;
  if(sourceId!==s.世界.opening.committedTransactionId||s.世界.processedTransactions?.[sourceId]||config.background?.id!=='jiumeitu-heir')throw Error('开局入画只能在九美图预设的创建过程中安排');
  const errors=validateDraft(config);if(errors.length)throw Error(errors.join('；'));
  for(const row of rows){
   const soulId=s.成长.列表[row.actorId].武魂ID列表[0],realm=globalThis.SoulResidentRealms.table(s).records.find(r=>r.ownerId===row.actorId&&r.soulId===soulId&&r.profileId==='nine-beauties-v1');
   if(!realm)throw Error('开局入画需要保留九美图的独立画境能力');
   const eligibility=globalThis.SoulResidentRealms.captureGenderEligibility(globalThis.SoulTargetConditions.read(s,row.actorId,row.targetId,'gender'),globalThis.SoulResidentRealms.PROFILES['nine-beauties-v1']);if(!eligibility.pass)throw Error(`${s.人物.列表[row.targetId]?.name??'所选囚犯'}无法开局入画：${eligibility.reason}`);
   try{const result=globalThis.SoulCombatEngine.activateFieldAbility(s,row.actorId,`${realm.id}:capture`,row.targetId,`${sourceId}:initial-realm:${row.index}`);globalThis.SoulCombatFoundation.commitStateDraft(s,result.state);}
   catch(error){throw Error(`${s.人物.列表[row.targetId]?.name??'所选囚犯'}无法开局入画：${error.message}`);}
  }
 }
 function validOrigin(s,origin,actorId,targetId,kind,recordId){const db=s.世界.opening?.relations,e=db?.entries?.find(e=>e.id===origin?.entryId);return !!(db&&db.sourceId===s.世界.opening.committedTransactionId&&origin?.sourceId===db.sourceId&&e?.actorId===actorId&&e?.targetId===targetId&&(kind===undefined||e.kind===kind)&&(recordId===undefined||recordId===e.relationshipId||recordId===e.contactId));}
 function acquainted(s,actorId,targetId){const db=s.世界?.opening?.relations;return !!(valid(db)&&db.sourceId===s.世界.opening.committedTransactionId&&db.entries.some(e=>e.actorId===actorId&&e.targetId===targetId||e.actorId===targetId&&e.targetId===actorId));}
 function initialCustodySource(s,c){const db=s.世界.opening?.relations,e=db?.entries?.find(e=>e.id===c?.openingEntryId),owner=e?.custody==='master'?e.actorId:e?.targetId,target=e?.custody==='master'?e.targetId:e?.actorId;return !!(valid(db)&&e?.custodySource==='opening'&&db.sourceId===s.世界.opening.committedTransactionId&&c.originKind==='opening-relation'&&c.sourceId===`opening-relation:${e.id}`&&c.captorId===owner&&c.personId===target&&c.defeatId===null&&c.restraintItemIds?.length===0&&custody.table(s).events.some(v=>v.type==='custody-initialized'&&v.custodyId===c.id&&v.initialSource?.entryId===e.id));}
 function validate(s){
  const db=s.世界.opening?.relations,background=s.世界.opening?.background;if(!db)return background?['开局关系创建来源缺失']:[];const errors=[];
  if(!valid(db)||db.version!==1||db.sourceId!==s.世界.opening.committedTransactionId||!Array.isArray(db.entries)||db.entries.length!==db.rows?.length)return ['开局关系创建来源无效'];
  try{const expected=normalizeRelations(background.config.background.relations??defaults(background.config));if(!same(expected,db.rows))errors.push('开局关系列表不符最终确认的创建配置');errors.push(...validateDraft(background.config));}catch{errors.push('最终开局关系配置缺失');}
  const referenceId=r=>r.source==='canon'?arena().persistentCharacterId(r.characterId):r.source==='person'?r.personId:r.side==='buyer'?background.buyerId:r.side==='captive'?background.subjectId:background.mainId;
  for(const [i,e] of db.entries.entries()){
   const row=db.rows[i],records=s.人物.列表[e.targetId]?.扩展?.社交约定??[],r=records.find(r=>r.id===e.relationshipId),contact=records.find(r=>r.id===e.contactId);
   if(e.index!==i||e.id!==`${db.sourceId}:${i}`||e.actorId!==referenceId(row.actor??{source:'opening',side:'main'})||e.targetId!==referenceId(row.target)||e.startTogether!==row.startTogether||e.initialRealm!==row.initialRealm||!s.人物.列表[e.actorId]||e.actorId===e.targetId||row.kind&&(r?.relationship!==row.kind||!same(r.roles,row.roles)||r.history!==row.history)||row.contact&&(!contact||contact.kind!=='contact'||contact.playerId!==e.actorId))errors.push('最终开局关系与实际人物、身份或联络来源不一致');
   if(row.initialRealm&&!globalThis.SoulResidentRealms.table(s).events.some(event=>{const sourceId=`${db.sourceId}:initial-realm:${i}`,realm=globalThis.SoulResidentRealms.get(s,event.realmId);return event.type==='captured'&&event.id===`realm-capture:${sourceId}`&&event.actorId===e.actorId&&event.targetId===e.targetId&&event.sourceId===sourceId&&realm?.profileId==='nine-beauties-v1'&&realm.ownerId===e.actorId&&realm.installedBy===db.sourceId&&realm.soulId===s.成长.列表[e.actorId].武魂ID列表[0]&&event.skill.id===`${realm.id}:capture`;}))errors.push('开局画中囚犯缺少本次正式收押记录');
   const initial=(record,kind)=>{const first=record?.events?.[0];return record?.kind===kind&&record.playerId===e.actorId&&record.personId===e.targetId&&record.origin?.kind==='opening'&&record.origin.sourceId===db.sourceId&&record.origin.entryId===e.id&&first?.status==='completed'&&first.cause==='opening'&&first.reason===row.history&&first.sourceId===(kind==='contact'?`${e.id}:contact`:e.id)&&(kind==='contact'?first.channel==='soul-device':first.relationship===row.kind);};
   if(row.kind&&(!initial(r,'relationship')||e.relationshipId!==`opening-relationship:${e.id}:${e.actorId}:${e.targetId}`))errors.push('开局关系缺少实际既往成立事件');
   if(row.contact&&(!initial(contact,'contact')||e.contactId!==`opening-contact:${db.sourceId}:${i}`))errors.push('开局联络缺少实际既往成立事件');
   if(row.custody&&!Object.values(custody.table(s).byPerson).concat(custody.table(s).history).some(c=>c.id===e.custodyId))errors.push('开局主奴缺少真实归属记录');
  }return errors;
 }
 return Object.freeze({defaults,summary,custodyTargets,normalizeRelations,draftRelations,validateDraft,initialize,installInitialRealms,validate,validOrigin,acquainted,initialCustodySource});
});
