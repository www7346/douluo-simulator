(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulDisguise=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';if(typeof require==='function'&&!globalThis.SoulPersonPresentation)require('../../shared/person-presentation-core.js');
 const EFFECT='transform.disguise',clone=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
 const initializing=new Set();
 function withInitialization(receiptId,operation){initializing.add(receiptId);try{return operation();}finally{initializing.delete(receiptId);}}
 const hash=v=>globalThis.SoulAbilityContract.hash(v),same=(a,b)=>hash(a??null)===hash(b??null);
 const now=s=>globalThis.SoulPersonCore.now(s),order=s=>globalThis.SoulPersonCore.nextEventOrder(s);
 const stamp=r=>{const {hash:_,...body}=r;r.hash=hash(body);return r;};
 const signed=r=>{if(!r)return false;const {hash:h,...body}=r;return h===hash(body);};
 const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
 const KEYS=Object.freeze(['公开名','公开性别','外貌','公开身份','声音','武魂表象','魂环表象','立绘','头像']);
 function template(input){
  if(!plain(input)||Object.keys(input).some(k=>!KEYS.includes(k)))throw Error('伪装模板包含未登记内容');
  const out={};
  for(const [k,v] of Object.entries(input)){
   if(typeof v!=='string'||!v.trim()||v.length>(['外貌','声音','武魂表象','魂环表象'].includes(k)?1200:180))throw Error('伪装模板内容无效：'+k);
   if(k==='公开性别'&&!['男','女','不变'].includes(v))throw Error('伪装公开性别无效');
   if(['立绘','头像'].includes(k)&&!globalThis.SoulPersonaArt?.has(v))throw Error('请选择已登记的伪装形象');
   out[k]=v.trim();
  }
  if(!out.外貌)throw Error('伪装须明确外貌');
  return out;
 }
 function baseParams(raw,draft=false){
  const input=raw??{伪装方式:'幻象',持续方式:'世界分钟',持续分钟:10,来源依赖:'施术武魂',伪装模板:{公开名:'陌生旅者',公开性别:'不变',外貌:'仪容与平日不同的旅者。'}};
  const compiler=globalThis.SoulEffectCompiler;
  if(!compiler)throw Error('伪装基础动作需要正式效果编译器');
  const keys=new Set([...Object.keys(compiler.EFFECT_REGISTRY[EFFECT].parameterBounds),'伪装模板']);
  if(!plain(input)||Object.keys(input).some(k=>!keys.has(k)))throw Error('伪装基础动作包含未登记参数');
  const pending=draft&&plain(input.伪装模板)&&typeof input.伪装模板.外貌==='string'&&!input.伪装模板.外貌.trim();
  const source=clone(input);
  if(draft&&plain(source.伪装模板))for(const [key,value] of Object.entries(source.伪装模板))if(key!=='外貌'&&typeof value==='string'&&!value.trim())delete source.伪装模板[key];
  if(pending)source.伪装模板.外貌='待填写的外貌';
  const graph=compiler.makeLinearGraph([['target.self',{}],[EFFECT,source]]),params=clone(graph.nodes.find(n=>n.effectId===EFFECT).params);
  if(pending)params.伪装模板.外貌='';
  return params;
 }
 function basePointCost(params){const raw=clone(params);if(raw?.伪装模板&&!raw.伪装模板.外貌?.trim())raw.伪装模板.外貌='待填写的外貌';return 2+Math.ceil(globalThis.SoulEffectCompiler.calculateNodeCost(EFFECT,baseParams(raw))/40);}
 function personId(s,id){return id?(globalThis.SoulConsciousness?.personForCarrier(s,id)?.personId??id):id;}
 function store(s){s.扩展??={};return s.扩展.disguises??={version:1,episodes:{},observations:[]};}
 const episodes=s=>Object.values(s.扩展?.disguises?.episodes??{});
 function active(s,id,ignored){return episodes(s).filter(r=>r.sourceTargetId===id&&r.sourceStatusId!==ignored&&!r.endedOrder&&s.状态实例?.列表?.[r.sourceStatusId]?.状态==='生效').sort((a,b)=>b.strength-a.strength||b.appliedOrder-a.appliedOrder);}
 function winner(s,id,ignored){return active(s,id,ignored)[0]??null;}
 function fields(r){const p=r.template,figure=p.立绘??r.visual;return {...(p.公开名?{name:p.公开名}:{}),appearance:p.外貌,figure,avatar:p.头像??figure};}
 function layers(s,id,ignored){const r=winner(s,id,ignored);return r?[{order:r.appliedOrder,strength:r.strength,fields:fields(r)}]:[];}
 function canSee(s,observer,target){try{return globalThis.SoulPersonChangeKnowledge.recording(s,observer)&&globalThis.SoulActionContext.perception(s,observer,target,'vision');}catch{return false;}}
 function record(s,r,phase,before,after){
  if(same(before,after))return;
  const experience=s.人物?.列表?.[r.targetId]?globalThis.SoulPersonChangeKnowledge.transition(s,{sourceKind:'disguise',sourceId:r.id,targetId:r.targetId,phase:phase==='removed'?'restored':'applied',before,after}):null;
  const observers=experience?.observers.map(o=>o.personId)??[];
  const event=stamp({version:1,id:'disguise:'+r.id+':'+phase+':'+order(s),episodeId:r.id,targetId:r.targetId,phase,before:clone(before),after:clone(after),observers,...(experience?{experienceId:experience.id}:{}),at:now(s),order:order(s),turn:Math.max(0,Number(s.扩展?.story?.nextTurn??1)-1)});
  store(s).observations.push(event);
 }
 const presentation=(...args)=>globalThis.SoulPersonPresentation.presentation(...args),viewPerson=(...args)=>globalThis.SoulPersonPresentation.viewPerson(...args),viewCarrier=(...args)=>globalThis.SoulPersonPresentation.viewCarrier(...args);
 function syncDisplay(s,id,ignored){const p=s.人物?.列表?.[id];if(!p)return;const r=winner(s,id,ignored);p.扩展??={};if(r)p.扩展.disguisePresentation={gender:r.template.公开性别??'不变',martialSoul:r.template.武魂表象??'尚未显露',identity:r.template.公开身份??'',kind:r.kind};else delete p.扩展.disguisePresentation;}
 function onApplied(s,status){
  if(status.模板ID!==EFFECT)return;
  const id=status.id+':disguise',t=store(s);if(t.episodes[id])return;
  const targetId=personId(s,status.目标单位ID),p=s.人物?.列表?.[status.目标单位ID],unit=s.战斗单位?.列表?.[status.目标单位ID];
  if(!p&&!unit)throw Error('伪装对象必须是实际登记的主体');
  const before=p?{name:p.name,appearance:p.appearance}: {name:unit.名称,appearance:s.人物?.列表?.[targetId]?.appearance};
  const params=status.快照.参数,mask=template(params.伪装模板),gender=mask.公开性别&&mask.公开性别!=='不变'?mask.公开性别:p?.gender??s.人物?.列表?.[targetId]?.gender;
  const visibleBody=p?globalThis.SoulGenericVisuals.body({...p,gender}):null;
  const candidates=visibleBody?(globalThis.SoulGenericVisuals?.assets??[]).filter(a=>a.gender===visibleBody.gender&&a.band===visibleBody.band):[];
  const visual=mask.立绘??candidates[parseInt(hash({targetId:status.目标单位ID,template:mask,body:visibleBody}).slice(0,8),16)%Math.max(1,candidates.length)]?.src;
  const r=stamp({version:1,id,sourceStatusId:status.id,targetId,sourceTargetId:status.目标单位ID,actorId:status.来源.单位ID,kind:params.伪装方式,strength:params.强度,template:mask,...(visual?{visual}:{}),source:clone(status),appliedOrder:order(s),appliedAt:now(s),initial:initializing.has(status.来源.结算单ID),...(p?{}:{unitBaseline:winner(s,status.目标单位ID)?.unitBaseline??unit.名称})});
  t.episodes[id]=r;
  if(p)globalThis.SoulPersonRewrite.applyPresentation(s,status.目标单位ID,Object.keys(fields(r)));else unit.名称=r.template.公开名??unit.名称;
  if(!r.initial)record(s,r,'applied',before,p?{name:p.name,appearance:p.appearance}:{name:unit.名称,appearance:mask.外貌});
 }
 function onRemoved(s,status){
  if(status.模板ID!==EFFECT)return;const r=s.扩展?.disguises?.episodes?.[status.id+':disguise'];if(!r||r.endedOrder)return;
  const p=s.人物?.列表?.[r.sourceTargetId],u=s.战斗单位?.列表?.[r.sourceTargetId],before=p?{name:p.name,appearance:p.appearance}:{name:u?.名称,appearance:r.template.外貌};
  r.endedOrder=order(s);r.endedAt=now(s);stamp(r);
  if(p)globalThis.SoulPersonRewrite.applyPresentation(s,r.targetId,Object.keys(fields(r)),status.id);else if(u)u.名称=winner(s,r.sourceTargetId)?.template.公开名??r.unitBaseline;
  record(s,r,'removed',before,p?{name:p.name,appearance:p.appearance}:{name:u?.名称,appearance:s.人物?.列表?.[r.targetId]?.appearance});
 }
 const knownRecords=(...args)=>globalThis.SoulPersonPresentation.knownRecords(...args);
 function revealMartialAction(s,actorId,skill,receipt){
  const soulId=skill?.sourceMartialSoulId??skill?.来源武魂ID;
  const ownSoul=soulId&&s.武魂?.列表?.[soulId]?.持有者单位ID===actorId;
  if(!ownSoul||['consumable','hidden-weapon','soul-device','copied','summoned-copy'].includes(skill.sourceKind))return [];
  if(skill.effectGraph?.nodes?.some(node=>node.effectId===EFFECT))return [];
  // A self-maintained martial appearance cannot survive visibly using its real source.
  // External imposed transformations and disguises of appearance alone are unaffected.
  const masks=active(s,actorId).filter(r=>r.actorId===actorId&&r.source.快照.参数.武魂伪装),ended=[];
  for(const mask of masks){const status=s.状态实例?.列表?.[mask.sourceStatusId];if(!status)continue;
   globalThis.SoulCombatEngine.removeStatus(s,status,'martial-soul-revealed',receipt);ended.push(status.id);
  }
  if(ended.length)receipt.narrationFacts.push('行动者动用真实武魂，掩饰武魂的伪装随之解除；在场目击者看到了外貌变化。');
  return ended;
 }
 function knowledge(s,observerId,targetId){const records=knownRecords(s,observerId,targetId),secret=s.人物?.列表?.[personId(s,targetId)]?.扩展?.身份呈现?.actualName,knows=observerId===personId(s,targetId)||records.some(e=>e.phase==='named'),visible=value=>{const out=clone(value);if(!knows&&secret&&out?.name===secret)out.name='未具名的面貌';return out;};return records.map(e=>({id:e.id,targetId:e.targetId,phase:e.phase,before:visible(e.before),after:visible(e.after),at:e.at}));}
 function retain(s,intent,result,id,event){const receipt={...clone(result),id,...(event?{observation:clone(event)}:{})},action=globalThis.SoulPersonContracts.retainAction(s,intent,receipt,'disguise');if(event){event.actionRef=globalThis.SoulPersonContracts.ref(action);stamp(event);}return result;}
 function inspect(s,actorId,targetId,receiptId,method='visual'){
  const target=personId(s,targetId),r=winner(s,targetId);
  quote(s,{type:'inspect-disguise',actorId,targetId,method});
  const contact=method==='contact'?globalThis.SoulCombatEngine.physicalContactCheck(s,actorId,targetId,'disguise:'+receiptId):null;
  if(contact&&!contact.hit)return {type:'inspect-disguise',actorId,targetId:target,method,contact,detected:false,summary:'未能实际触及目标，尚未完成触感检查。'};
  if(!r)return {type:'inspect-disguise',actorId,targetId:target,method,...(contact?{contact}:{}),detected:false,summary:'暂未发现足以识破伪装的线索。'};
  const u=s.战斗单位.列表[actorId],rng=globalThis.SoulCombatEngine.makeRng(`${s.世界.seed}:disguise-inspect:${receiptId}`),die=globalThis.SoulCombatEngine.rollDice(rng,1,20,'辨认伪装').total;
  const modifier=Math.floor((Number(u?.六维?.有效?.感知??u?.六维?.基础?.感知??u?.六维?.感知??10)-10)/2)+Number(u?.派生?.熟练加值??0),dc=Number(s.状态实例.列表[r.sourceStatusId].快照.施加者DC)+Number(s.状态实例.列表[r.sourceStatusId].快照.参数.识破难度加值??0),detected=contact&&r.kind==='幻象'||die===20||die!==1&&die+modifier>=dc;
  let event;if(detected){event=stamp({version:1,id:'disguise:inspect:'+receiptId,episodeId:r.id,targetId:target,phase:'detected',before:{name:s.人物?.列表?.[target]?.name??''},after:{disguised:true},observers:[personId(s,actorId)],at:now(s),order:order(s),turn:Math.max(0,Number(s.扩展?.story?.nextTurn??1)-1),method,...(contact?{contact}:{}),check:{die,modifier,dc}});store(s).observations.push(event);}
  return retain(s,{type:'inspect-disguise',actorId,targetId,method},{type:'inspect-disguise',actorId,targetId:target,method,...(contact?{contact}:{}),detected:!!detected,check:{die,modifier,dc},summary:detected?'察觉目标正在伪装，外形尚未解除。':'暂未发现足以识破伪装的线索。'},receiptId,event);
 }
 // A first actual sight of this disguise uses the existing perception check and
 // private action ledger. Queries, repeated meetings and save restoration cannot
 // grant another roll for the same observer/source, including failed checks.
 function observeMeetings(s){
  const records=globalThis.SoulPersonContracts.table(s).actions;
  for(const episode of episodes(s)){
   const targetId=episode.sourceTargetId;if(winner(s,targetId)?.id!==episode.id)continue;
   for(const observerId of Object.keys(s.人物?.列表??{})){
    if(observerId===episode.targetId||knownRecords(s,observerId,targetId).some(e=>e.episodeId===episode.id&&['applied','detected','removed'].includes(e.phase)))continue;
    const actorId=globalThis.SoulConsciousness?.unitId(s,observerId)??observerId;
    if(!s.战斗单位?.列表?.[actorId]||!canSee(s,observerId,targetId))continue;
    const receiptId='meeting-disguise:'+hash({episodeId:episode.id,observerId});
    if(records.some(action=>action.kind==='disguise'&&action.sourceId===receiptId))continue;
    inspect(s,actorId,targetId,receiptId);
   }
  }
 }
 function dismiss(s,actorId,statusId,receipt){const status=s.状态实例?.列表?.[statusId];if(status?.模板ID!==EFFECT||status.来源.单位ID!==actorId)throw Error('只能解除本人施放的伪装');globalThis.SoulCombatEngine.removeStatus(s,status,'dismissed',typeof receipt==='object'?receipt:undefined);return retain(s,{type:'dismiss-disguise',actorId,statusId},{type:'dismiss-disguise',actorId,statusId,summary:'已解除这次伪装。'},typeof receipt==='object'?receipt.id:receipt);}
 function quote(s,intent){
  const actorId=intent.actorId??s.角色.主控单位ID;
  if(intent.type==='dismiss-disguise'){
   const status=s.状态实例?.列表?.[intent.statusId];
   if(status?.模板ID!==EFFECT||status.来源.单位ID!==actorId)throw Error('只能解除本人施放的伪装');
   return {type:intent.type,actorId,statusId:status.id,available:true};
  }
  if(intent.type==='disclose-identity'){
   const targetId=personId(s,actorId),name=s.人物?.列表?.[targetId]?.扩展?.身份呈现?.actualName;
   const episode=episodes(s).filter(r=>r.targetId===targetId).sort((a,b)=>b.appliedOrder-a.appliedOrder)[0];
   if(!name||!episode)throw Error('没有可说明的另一身份');
   return {type:intent.type,actorId,targetId,name,episodeId:episode.id,available:true};
  }
  if(intent.type!=='inspect-disguise')throw Error('未知的伪装行动');
  const targetId=intent.targetId,method=intent.method??'visual';if(!targetId||!s.人物?.列表?.[targetId]&&!s.战斗单位?.列表?.[targetId])throw Error('请选择实际目标');if(!['visual','contact'].includes(method))throw Error('检查方式无效');
  if(method==='contact')globalThis.SoulCombatEngine.physicalContactProfile(s,actorId,targetId);else if(!targetId||!canSee(s,personId(s,actorId),targetId))throw Error('须实际看见目标才能检查伪装');
  return {type:intent.type,actorId,targetId,method,available:true};
 }
 function disclose(s,actorId,receiptId){
  const q=quote(s,{type:'disclose-identity',actorId});
  const observers=Object.keys(s.人物?.列表??{}).filter(id=>{
   if(!globalThis.SoulPersonChangeKnowledge.recording(s,id))return false;
   try{if(id!==q.targetId)globalThis.SoulWorldSocial.communicate(s,q.targetId,id);return true;}catch{return false;}
  });
  const event=stamp({version:1,id:'disguise:name:'+receiptId,episodeId:q.episodeId,targetId:q.targetId,phase:'named',before:{},after:{name:q.name},observers,audienceProofs:observers.map(id=>globalThis.SoulWorldSocial.communicationProof(s,id)),speakerProof:globalThis.SoulWorldSocial.communicationProof(s,q.targetId),at:now(s),order:order(s),turn:Math.max(0,Number(s.扩展?.story?.nextTurn??1)-1)});
  store(s).observations.push(event);return retain(s,{type:'disclose-identity',actorId},{type:'disclose-identity',actorId,name:q.name,summary:'已向当前能听见的人说明真实身份。'},receiptId,event);
 }
 function options(s,actorId=s.角色?.主控单位ID){
  return Object.values(s.状态实例?.列表??{}).filter(r=>r.模板ID===EFFECT&&r.来源.单位ID===actorId).map(r=>{
   const request={type:'dismiss-disguise',actorId,statusId:r.id};
   const preview=globalThis.SoulWorldEngine.previewIntent(s,request);
   return {statusId:r.id,targetId:r.目标单位ID,name:s.技能?.列表?.[r.来源.技能ID]?.name??'伪装',available:preview.available!==false,reason:preview.reason??'',action:request};
  });
 }
 function validate(s){
  const errors=[],t=s.扩展?.disguises;if(!t)return Object.values(s.状态实例?.列表??{}).some(r=>r.模板ID===EFFECT)?['伪装状态缺少成立记录']:errors;
  if(t.version!==1||!plain(t.episodes)||!Array.isArray(t.observations))return ['伪装记录格式无效'];
  for(const [id,r] of Object.entries(t.episodes))try{
   const status=s.状态实例?.列表?.[r.sourceStatusId]??r.source,node=r.source?.扩展?.持续来源合同?.effectGraph?.nodes?.find(n=>n.id===r.source.来源.效果ID);
   if(!signed(r)||id!==r.id||id!==r.sourceStatusId+':disguise'||!node||node.effectId!==EFFECT||!same(template(node.params.伪装模板),r.template)||r.kind!==node.params.伪装方式||r.strength!==node.params.强度||status.模板ID!==EFFECT||r.targetId!==personId(s,r.sourceTargetId)||!globalThis.SoulCombatEngine.validateControlSourceProof(r.source,r.sourceTargetId,r.appliedAt,s)||Boolean(r.endedOrder)===Boolean(s.状态实例?.列表?.[r.sourceStatusId])||!Number.isSafeInteger(r.appliedOrder)||r.appliedAt>now(s))throw Error('来源或状态');
  }catch{errors.push('伪装记录'+id+'无效');}
  for(const status of Object.values(s.状态实例?.列表??{}))if(status.模板ID===EFFECT&&!t.episodes[status.id+':disguise'])errors.push('伪装状态缺少成立记录');
  for(const p of Object.values(s.人物?.列表??{})){const r=winner(s,p.id),expected=r?{gender:r.template.公开性别??'不变',martialSoul:r.template.武魂表象??'尚未显露',identity:r.template.公开身份??'',kind:r.kind}:undefined;if(!same(p.扩展?.disguisePresentation,expected))errors.push('伪装呈现缓存与实际来源不符');}
  for(const e of t.observations){const experience=e.experienceId?(s.扩展?.personaRewrites?.experiences??[]).find(x=>x.id===e.experienceId):null;const action=e.actionRef?globalThis.SoulPersonContracts.committedActionSource(s,e.actionRef):null,{actionRef:_,hash:__,...frozen}=e;if(e.phase==='named'&&(!globalThis.SoulWorldSocial.validCommunicationProof(s,e.speakerProof,e.targetId,true,e.at,e.order)||!Array.isArray(e.audienceProofs)||!same(e.audienceProofs.map(p=>p.personId),e.observers)||e.audienceProofs.some(p=>!globalThis.SoulWorldSocial.validCommunicationProof(s,p,p.personId,false,e.at,e.order))))errors.push('身份告知缺少实际交流依据');if(!['applied','removed','detected','named'].includes(e.phase)||!Number.isSafeInteger(e.order)||e.order<1||e.order>s.扩展.personEventSequence||!Number.isSafeInteger(e.at)||e.at<0||['detected','named'].includes(e.phase)&&(!action||action.kind!=='disguise'||!same((({hash:_,...body})=>body)(action.receipt.observation??{}),frozen)||action.at!==e.at)||!signed(e)||!t.episodes[e.episodeId]||e.targetId!==t.episodes[e.episodeId].targetId||!Array.isArray(e.observers)||e.observers.some(id=>!s.人物?.列表?.[id])||e.at>now(s)||['applied','removed'].includes(e.phase)&&s.人物?.列表?.[e.targetId]&&(!experience||experience.sourceKind!=='disguise'||experience.sourceId!==e.episodeId||!same(experience.observers.map(o=>o.personId),e.observers)))errors.push('伪装识别经历无效');}
  return errors;
 }
 return Object.freeze({EFFECT,KEYS,template,baseParams,basePointCost,personId,active,winner,layers,presentation,viewPerson,viewCarrier,syncDisplay,onApplied,onRemoved,revealMartialAction,knowledge,inspect,observeMeetings,dismiss,disclose,quote,options,withInitialization,validate});
});
