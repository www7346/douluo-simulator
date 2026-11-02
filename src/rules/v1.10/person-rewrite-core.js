(function(root,factory){if(typeof require==='function')require('./person-change-knowledge-core.js');const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulPersonRewrite=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';if(typeof require==='function'&&!globalThis.SoulPersonPresentation)require('../../shared/person-presentation-core.js');
 const BODY_EFFECT='transform.sex',PROFILE=['biography','values','speech','shortTermGoal','longTermGoal'];
 const clone=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
 const hash=v=>globalThis.SoulAbilityContract.hash(v),same=(a,b)=>hash(a??null)===hash(b??null);
 const people=()=>globalThis.SoulPersonCore,now=s=>people().now(s),order=s=>people().nextEventOrder(s);
 const sign=v=>{const {hash:_,...body}=v;v.hash=hash(body);return v;};
 const signed=v=>{if(!v)return false;const {hash:h,...body}=v;return h===hash(body);};
 const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
 function table(s){s.扩展??={};return s.扩展.personaRewrites??={version:1,grants:{},patches:{},baselines:{},materialized:{}};}
 function person(s,id){const p=s.人物?.列表?.[id];if(!p)throw Error('改造目标必须是已登记人物');return p;}
 function sourceNode(record){
  const c=record.contract,n=c?.effectGraph?.nodes?.find(n=>n.id===record.source?.效果ID);
  if(!c||!globalThis.SoulAbilityContract.verify(c).pass||c.id!==record.source?.技能ID||record.source?.单位ID!==record.actorId||!n)throw Error('人物变化缺少真实能力来源');
  return n;
 }
 function live(s,r,ignored){return r.retention==='保留'||r.sourceStatusId!==ignored&&!r.endedOrder&&s.状态实例?.列表?.[r.sourceStatusId]?.状态==='生效';}
 function fieldsOf(patch){
  const out={};
  for(const [k,v] of Object.entries(patch.identity??{}))out[k==='selfIdentity'?'cognition.selfIdentity':k]=v;
  for(const [k,v] of Object.entries(patch.profile??{}))out['profile.'+k]=v;
  for(const [k,v] of Object.entries(patch.cognition??{}))out['cognition.'+k]=v;
  for(const [k,v] of Object.entries(patch.appearance??{}))out[k==='description'?'appearance':k==='figure'?'figure':'avatar']=v;
  return out;
 }
 function read(p,k){if(k.startsWith('profile.'))return p.扩展?.characterProfile?.data?.[k.slice(8)];if(k.startsWith('cognition.'))return p.扩展?.cognitivePersona?.[k.slice(10)];if(k==='figure'||k==='avatar')return p.扩展?.[k==='figure'?'currentFigure':'currentAvatar'];return p[k];}
 function write(s,p,k,value){
  p.扩展??={};
  if(k.startsWith('profile.')){
   p.扩展.characterProfile??={version:1,source:'ability-rewrite',status:'complete',data:Object.fromEntries(PROFILE.map(f=>[f,f==='biography'?p.name+'的现有人物经历。':'依照本人现有判断行事。']))};
   p.扩展.characterProfile.source='ability-rewrite';p.扩展.characterProfile.status='complete';p.扩展.characterProfile.data[k.slice(8)]=clone(value);
  }else if(k.startsWith('cognition.')){p.扩展.cognitivePersona??={};if(value===undefined)delete p.扩展.cognitivePersona[k.slice(10)];else p.扩展.cognitivePersona[k.slice(10)]=clone(value);}
  else if(k==='figure'||k==='avatar'){const key=k==='figure'?'currentFigure':'currentAvatar';if(value===undefined)delete p.扩展[key];else p.扩展[key]=value;}
  else{if(value===undefined)delete p[k];else p[k]=clone(value);}
  const u=s.战斗单位?.列表?.[p.id];if(k==='name'&&u)u.名称=p.name;
  if(s.角色?.主控单位ID===p.id&&s.角色.档案){const key={name:'姓名',gender:'性别',appearance:'外貌'}[k];if(key)s.角色.档案[key]=p[k];}
 }
 function capture(s,id,keys){
  const t=table(s),p=person(s,id),base=t.baselines[id]??={},material=t.materialized[id]??={};
  if(keys.some(k=>k.startsWith('profile.'))){p.扩展??={};p.扩展.characterProfile??=clone(globalThis.SoulBackgroundOpening?.effectiveProfile(s,id))??{version:1,source:'ability-rewrite',status:'complete',data:{}};for(const k of PROFILE)p.扩展.characterProfile.data[k]??=k==='biography'?p.name+'的现有人物经历。':'依照本人现有判断行事。';}
  for(const key of keys){
   const actual=read(p,key),previous=material[key];
   if(!base[key])base[key]={present:actual!==undefined,...(actual===undefined?{}:{value:clone(actual)}),order:0};
   // A later ordinary event can supersede an old layer. Never restore an entire
   // saved person over subsequent injuries, purchases, or changes by other sources.
   if(previous&&!same(actual,previous.value))base[key]={present:actual!==undefined,...(actual===undefined?{}:{value:clone(actual)}),order:order(s),turn:Math.max(0,Number(s.扩展?.story?.active?.number??s.扩展?.story?.nextTurn-1)||0),at:now(s),revision:s.系统.revision};
  }
 }
 const rewriteLayers=(...args)=>globalThis.SoulPersonPresentation.rewriteLayers(...args),baselineValue=(...args)=>globalThis.SoulPersonPresentation.baselineValue(...args);
 function materialize(s,id,ignored,experience){
  const t=table(s),p=person(s,id),base=t.baselines[id]??{},rows=rewriteLayers(s,id,ignored),before={gender:p.gender,appearance:p.appearance},visualBefore={...p,扩展:clone(p.扩展)};
  const presentation=globalThis.SoulDisguise?.layers(s,id,ignored)?.[0]?.fields??{};
  t.materialized[id]??={};
  for(const [key,b] of Object.entries(base)){
   const value=Object.hasOwn(presentation,key)?presentation[key]:baselineValue(rows,key,b);write(s,p,key,value);t.materialized[id][key]={...(value===undefined?{}:{value:clone(value)})};
  }
  (globalThis.SoulGenericVisuals??(typeof require==='function'?require('../../shared/generic-human-art-core.js'):null))?.assignBody(s,p,visualBefore);
  globalThis.SoulDisguise?.syncDisplay(s,id,ignored);
  if(experience)globalThis.SoulPersonChangeKnowledge?.transition(s,{...experience,targetId:id,before,after:{gender:p.gender,appearance:p.appearance}});
 }
 const underlyingAppearance=(...args)=>globalThis.SoulPersonPresentation.underlyingAppearance(...args);
 function applyPresentation(s,id,keys,ignored){capture(s,id,keys);materialize(s,id,ignored);}
 function onBodyApplied(s,status){
  if(status.模板ID!==BODY_EFFECT)return;
  const p=person(s,status.目标单位ID),id=status.id+':body';s.扩展.bodyChanges??={};if(s.扩展.bodyChanges[id])return;
  if(status.快照.参数.目标性别==='反转'&&!['男','女'].includes(p.gender))throw Error('目标当前身体性别未登记，请先明确设定或使用指定男、女形态的能力');
  capture(s,p.id,['gender','appearance']);p.扩展??={};p.扩展.bodyIdentity??={gender:table(s).baselines[p.id].gender.value};const initial=p.扩展.bodyIdentity.gender,params=status.快照.参数;
  const gender=params.目标性别==='反转'?(p.gender==='女'?'男':'女'):params.目标性别==='原始'?initial:params.目标性别;
  if(!['男','女'].includes(gender)&&!(params.目标性别==='原始'&&gender===initial))throw Error('性转目标缺少有效的原始身体性别');
  const appearance=params.目标性别==='原始'?table(s).baselines[p.id].appearance.value:`身体呈${gender==='女'?'女性':'男性'}形态；原有衣着与特征：${table(s).baselines[p.id].appearance.value??'沿用原有外貌特征。'}`;
  const r={version:1,id,sourceStatusId:status.id,actorId:status.来源.单位ID,targetId:p.id,source:clone(status.来源),contract:clone(status.扩展.持续来源合同),gender,previousGender:p.gender,initialGender:initial,appearance,retention:params.变化保留,strength:params.强度,appliedOrder:order(s),appliedAt:now(s)};
  if(sourceNode(r).effectId!==BODY_EFFECT)throw Error('身体变化来源不符');s.扩展.bodyChanges[id]=sign(r);materialize(s,p.id,undefined,{sourceKind:'body',sourceId:id,phase:'applied'});
 }
 function onCognitionCompleted(s,change){
  if(change.direction!=='自由改造')return;
  const t=table(s),id=change.sourceStatusId+':rewrite';if(t.grants[id])return;
  const node=change.contract.effectGraph.nodes.find(n=>n.id===change.source.效果ID);
  t.grants[id]=sign({version:1,id,cognitionId:change.id,sourceStatusId:change.sourceStatusId,actorId:change.controllerId,sourceActorId:change.subjectId,targetId:change.targetId,allowReality:node.params.关系作用域==='认知与现实',retention:change.retention,strength:change.strength,createdAt:now(s),createdRevision:s.系统.revision,order:order(s),status:'pending'});
 }
 function onRemoved(s,status){
  globalThis.SoulCustodyRewrites?.onRemoved(s,status);
  const t=s.扩展?.personaRewrites;if(!t&&!s.扩展?.bodyChanges)return;
  const targetId=s.扩展?.cognitionChanges?.[status.id+':cognition']?.targetId??status.目标单位ID;if(t?.baselines[targetId])capture(s,targetId,Object.keys(t.baselines[targetId]));
  for(const r of Object.values(s.扩展.bodyChanges??{}))if(r.sourceStatusId===status.id&&!r.endedOrder){r.endedAt=now(s);r.endedOrder=order(s);sign(r);}
  if(t)for(const r of Object.values(t.patches))if(r.sourceStatusId===status.id&&!r.endedOrder){r.endedAt=now(s);r.endedOrder=order(s);sign(r);}
  if(t?.baselines[targetId]){const body=s.扩展.bodyChanges?.[status.id+':body'],patch=Object.values(t.patches).find(r=>r.sourceStatusId===status.id);materialize(s,targetId,status.id,body?{sourceKind:'body',sourceId:body.id,phase:'restored'}:patch?{sourceKind:'patch',sourceId:patch.id,phase:'restored'}:undefined);}
 }
 function grant(s,id,actorId,current=true){
  const a=s.扩展?.personaRewrites?.grants?.[id],c=a&&s.扩展.cognitionChanges?.[a.cognitionId];
  if(!a||!signed(a)||!c||!signed(c)||c.direction!=='自由改造'||c.targetId!==a.targetId||c.controllerId!==a.actorId||c.sourceStatusId!==a.sourceStatusId||c.retention!==a.retention||c.strength!==a.strength||actorId&&actorId!==a.actorId)throw Error('没有这次已完成改造的编辑授权');
  const n=sourceNode({contract:c.contract,source:c.source,actorId:a.sourceActorId});
  if(n.effectId!=='status.cognition_shift'||n.params.认知方向!=='自由改造'||a.allowReality!==(n.params.关系作用域==='认知与现实'))throw Error('认知改造作用域不符');
  if(current&&a.retention!=='保留'&&(c.endedOrder||s.状态实例?.列表?.[a.sourceStatusId]?.状态!=='生效'))throw Error('本次改造来源已结束');return a;
 }
 function validatePatch(input,{allowReality=false,allowUpload=true}={}){
  if(!plain(input)||Object.keys(input).some(k=>!['identity','profile','cognition','appearance','relationships','custody'].includes(k)))throw Error('改造设定包含未开放的领域');
  const patch=clone(input),fieldLists={identity:['name','personality','occupation','faction','selfIdentity'],profile:PROFILE,cognition:['preferences','beliefs','memories','forgottenBeforeTurn'],appearance:['description','figure','avatar']};
  for(const [domain,keys] of Object.entries(fieldLists))if(patch[domain]!==undefined){
   const values=patch[domain];if(!plain(values)||Object.keys(values).some(k=>!keys.includes(k)))throw Error('改造设定包含未开放的人物字段');
   for(const [key,v] of Object.entries(values)){
    if(key==='forgottenBeforeTurn'){if(!Number.isSafeInteger(v)||v<0)throw Error('屏蔽记忆回合必须为非负整数');continue;}
    if(typeof v!=='string'||v.length>(['figure','avatar'].includes(key)?900000:domain==='profile'?(key==='biography'?800:240):domain==='cognition'?8000:1000))throw Error('人物设定文字为空或超过保存容量');
    if(['figure','avatar'].includes(key)&&v){const art=globalThis.SoulPersonaArt??(typeof require==='function'?require('../../shared/persona-art-core.js'):null),registered=art?.has(v),upload=allowUpload&&/^data:image\/(?:png|webp|jpeg);base64,[A-Za-z0-9+/=]+$/.test(v);if(!registered&&!upload)throw Error('请选择已登记图片或上传本机形象');}
    if(domain==='profile'&&!v.trim()||domain==='identity'&&key==='name'&&(!v.trim()||v.length>30))throw Error('姓名及人物小传字段需要填写有效文字');
   }
  }
  if(patch.relationships!==undefined){
   if(!Array.isArray(patch.relationships)||patch.relationships.length>256)throw Error('关系列表超过当前人物目录容量');const seen=new Set();
   for(const row of patch.relationships){if(!plain(row)||Object.keys(row).some(k=>!['otherId','scope','kind','roles','reason'].includes(k))||typeof row.otherId!=='string'||!['subjective','reality'].includes(row.scope)||row.scope==='reality'&&!allowReality||row.kind!==null&&typeof row.kind!=='string'||!plain(row.roles)||typeof row.roles.target!=='string'||typeof row.roles.other!=='string'||Object.keys(row.roles).some(k=>!['target','other'].includes(k))||typeof row.reason!=='string'||row.reason.length>1000||seen.has(row.scope+':'+row.otherId+(row.kind==='custody'?':custody':':social')))throw Error('关系对象、双方身份或作用范围无效');seen.add(row.scope+':'+row.otherId+(row.kind==='custody'?':custody':':social'));}
  }
  if(patch.custody!==undefined){const c=patch.custody;if(!allowReality||!plain(c)||Object.keys(c).some(k=>!['action','controllerId'].includes(k))||!['assign','release'].includes(c.action)||c.action==='assign'&&typeof c.controllerId!=='string')throw Error('真实看管改写不在本次授权范围');}
  if(!Object.keys(fieldsOf(patch)).length&&!patch.relationships?.length&&!patch.custody)throw Error('请至少修改一项人物设定');return patch;
 }
 function token(s,id){
  const a=grant(s,id);return hash({revision:s.系统.revision,grant:a,people:s.人物,relations:s.世界?.social,custody:s.世界?.custody,rewrites:s.扩展?.relationRewrites});
 }
 function preview(s,id,actorId){
  const a=grant(s,id,actorId),p=person(s,a.targetId),social=globalThis.SoulWorldSocial;
  // Only the editable public domains leave the server. Private intentions,
  // unrevealed plans and internal custody evidence are not an editor field.
  const editable=Object.fromEntries(['id','name','gender','age','appearance','personality','occupation','faction'].filter(k=>p[k]!==undefined).map(k=>[k,clone(p[k])]));
  editable.扩展={characterProfile:clone(p.扩展?.characterProfile??globalThis.SoulBackgroundOpening?.effectiveProfile(s,p.id)),cognitivePersona:clone(p.扩展?.cognitivePersona??{}),currentFigure:p.扩展?.currentFigure??'',currentAvatar:p.扩展?.currentAvatar??''};
  const others=Object.values(s.人物?.列表??{}).filter(p=>p.id!==a.targetId);
  return {grant:clone(a),token:token(s,id),person:editable,people:others.map(p=>({id:p.id,name:p.name,gender:p.gender})),relations:social?.relations(s,a.targetId)??[],reality:others.map(p=>({otherId:p.id,relation:social?.relationshipBetween(s,a.targetId,p.id)??null})),relationTypes:clone(social?.RELATIONSHIPS??{}),roleDefaults:clone(social?.DEFAULT_ROLES??{}),art:clone(globalThis.SoulPersonaArt?.paths??[]),currentTurn:Math.max(0,Number(s.扩展?.story?.nextTurn??1)-1)};
 }
 function apply(s,{grantId,patchId,actorId,expectedToken,patch:input,allowUpload=true}){
  const t=table(s),prior=t.patches[patchId];
  if(prior){const a=grant(s,grantId,actorId,false);if(!signed(prior)||prior.grantId!==a.id||prior.actorId!==actorId||!same(prior.patch,input))throw Error('改造编号不能替换已提交设定');return clone(prior);}
  const a=grant(s,grantId,actorId);
  if(a.status!=='pending'||typeof patchId!=='string'||!patchId||patchId.length>180)throw Error('这次改造授权已经使用');
  if(expectedToken!==token(s,a.id))throw Error('相关人物、关系或看管已经变化，请重新查看改造设定');
  const patch=validatePatch(input,{allowReality:a.allowReality,allowUpload}),p=person(s,a.targetId),fields=fieldsOf(patch);
  if(patch.cognition?.forgottenBeforeTurn>Math.max(0,Number(s.扩展?.story?.nextTurn??1)-1))throw Error('不能屏蔽尚未发生的回合');
  for(const r of patch.relationships??[])if(r.otherId===p.id||!s.人物.列表[r.otherId])throw Error('请选择已经登记的其他人物');
  capture(s,p.id,Object.keys(fields));
  const before=Object.fromEntries(Object.keys(fields).map(k=>[k,read(p,k)??null])),source={id:a.id,statusId:a.sourceStatusId,retention:a.retention,strength:a.strength};
  // The surrounding rule command executes on a scratch state. All domains commit
  // together; a rejected relationship or custody update leaves the paid effect pending.
  for(const r of patch.relationships??[]){const method=r.scope==='reality'?'rewriteRelation':'rewriteSubjectiveRelation';if(!globalThis.SoulWorldSocial?.[method])throw Error('关系改造执行器尚未装载');globalThis.SoulWorldSocial[method](s,{actorId,targetId:p.id,otherId:r.otherId,kind:r.kind,roles:r.roles,reason:r.reason,source,patchId});}
  if(patch.custody){if(!globalThis.SoulWorldSocial?.rewriteCustody)throw Error('真实看管改造执行器尚未装载');globalThis.SoulWorldSocial.rewriteCustody(s,{actorId,targetId:p.id,...patch.custody,source,patchId});}
  const r=sign({version:1,id:patchId,grantId:a.id,sourceStatusId:a.sourceStatusId,actorId,targetId:p.id,retention:a.retention,strength:a.strength,order:order(s),at:now(s),storyTurn:Math.max(0,Number(s.扩展?.story?.active?.number??s.扩展?.story?.nextTurn-1)||0),sourceRevision:s.系统.revision,patch,fields,before});
  t.patches[patchId]=r;a.status='consumed';a.patchId=patchId;sign(a);materialize(s,p.id,undefined,{sourceKind:'patch',sourceId:patchId,phase:'applied'});return clone(r);
 }
 function pending(s,actorId){return Object.values(s.扩展?.personaRewrites?.grants??{}).filter(a=>a.status==='pending'&&(!actorId||a.actorId===actorId)).filter(a=>{try{grant(s,a.id);return true;}catch{return false;}}).map(clone);}
 function reconcile(s){const t=s.扩展?.personaRewrites;if(!t)return;for(const id of Object.keys(t.baselines)){capture(s,id,Object.keys(t.baselines[id]));materialize(s,id);}}
 function validate(s){
  const errors=[],t=s.扩展?.personaRewrites;
  for(const [id,r] of Object.entries(s.扩展?.bodyChanges??{}))try{const n=sourceNode(r),expected=n.params.目标性别==='反转'?(r.previousGender==='女'?'男':'女'):n.params.目标性别==='原始'?r.initialGender:n.params.目标性别;if(!signed(r)||id!==r.sourceStatusId+':body'||id!==r.id||n.effectId!==BODY_EFFECT||!s.人物?.列表?.[r.targetId]||(!['男','女'].includes(r.gender)&&!(n.params.目标性别==='原始'&&r.gender===r.initialGender))||r.gender!==expected||n.params.变化保留!==r.retention||n.params.强度!==r.strength||!Number.isSafeInteger(r.appliedOrder)||r.appliedOrder<1)throw Error('来源');}catch{errors.push('身体变化记录'+id+'无效');}
  if(t){
   if(t.version!==1||!plain(t.grants)||!plain(t.patches)||!plain(t.baselines)||!plain(t.materialized))return [...errors,'人物改造记录不完整'];
   for(const [id,a] of Object.entries(t.grants))try{
    const c=s.扩展?.cognitionChanges?.[a.cognitionId],n=c&&sourceNode({contract:c.contract,source:c.source,actorId:a.sourceActorId});
    if(!signed(a)||!signed(c)||id!==a.id||id!==a.sourceStatusId+':rewrite'||c.direction!=='自由改造'||c.targetId!==a.targetId||c.controllerId!==a.actorId||(n.params.关系作用域==='认知与现实')!==a.allowReality||!['pending','consumed'].includes(a.status)||a.status==='consumed'&&!t.patches[a.patchId]||a.status==='pending'&&a.patchId)throw Error('授权');
   }catch{errors.push('人物改造授权'+id+'无效');}
   for(const [id,r] of Object.entries(t.patches))try{const a=t.grants[r.grantId];if(!signed(r)||id!==r.id||a?.patchId!==id||a.targetId!==r.targetId||a.actorId!==r.actorId||!same(fieldsOf(validatePatch(r.patch,{allowReality:a.allowReality})),r.fields))throw Error('修改');}catch{errors.push('人物改造修改'+id+'无效');}
   const copy=clone(s);for(const id of Object.keys(t.baselines))try{materialize(copy,id);for(const key of Object.keys(t.baselines[id]))if(!same(read(person(s,id),key),read(person(copy,id),key)))throw Error('当前值');}catch{errors.push('人物'+id+'当前改造结果与有效来源不一致');}
  }
  return [...errors,...(globalThis.SoulPersonChangeKnowledge?.validate(s)??[]),...(globalThis.SoulDisguise?.validate(s)??[])];
 }
 return Object.freeze({BODY_EFFECT,PROFILE,underlyingAppearance,applyPresentation,onBodyApplied,onCognitionCompleted,onRemoved,grant,validatePatch,token,preview,apply,pending,reconcile,validate});
});
