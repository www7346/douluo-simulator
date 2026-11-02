(function(root,factory){const get=(n,f)=>root?.[n]??(typeof require==='function'?require(f):null);const api=factory(get('SoulAbilityContract','./ability-contract-core.js'),get('SoulPersonCore','./person-core.js'));if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulRelationRewrites=api;})(typeof globalThis!=='undefined'?globalThis:this,function(abilities,people){
 'use strict';
 const clone=v=>JSON.parse(JSON.stringify(v)),hash=v=>abilities.hash(v),same=(a,b)=>hash(a)===hash(b);
 const table=(s,create=false)=>{if(create){s.扩展??={};s.扩展.relationRewrites??={version:1,records:[],revocations:[]};}return s.扩展?.relationRewrites??{version:1,records:[],revocations:[]};};
 const valid=r=>r&&r.hash===hash(Object.fromEntries(Object.entries(r).filter(([k])=>k!=='hash')));
 const stamp=r=>{r.hash=hash(Object.fromEntries(Object.entries(r).filter(([k])=>k!=='hash')));return r;};
 function grant(s,input,reality=false,current=true){
  const source=input.source,a=s.扩展?.personaRewrites?.grants?.[source?.id],c=s.扩展?.cognitionChanges?.[a?.cognitionId];
  if(!valid(a)||a.version!==1||a.actorId!==input.actorId||a.targetId!==input.targetId||a.sourceStatusId!==source?.statusId||a.id!==`${a.sourceStatusId}:rewrite`||a.cognitionId!==`${a.sourceStatusId}:cognition`||a.retention!==source.retention||a.strength!==source.strength||!['pending','consumed'].includes(a.status)||a.status==='consumed'&&a.patchId!==input.patchId||reality&&!a.allowReality||!valid(c)||c.direction!=='自由改造'||c.sourceStatusId!==a.sourceStatusId||c.subjectId!==a.actorId||c.targetId!==a.targetId||c.retention!==a.retention||c.strength!==a.strength||!abilities.verify(c.contract).pass)throw Error('关系改写缺少已完成的同源认知授权');
  if(current&&a.retention==='随来源'&&s.状态实例?.列表?.[a.sourceStatusId]?.状态!=='生效')throw Error('关系改写来源已经失效');
  const node=c.contract.effectGraph?.nodes?.find(n=>n.id===c.source?.效果ID);if(!node||node.effectId!=='status.cognition_shift'||node.params.认知方向!=='自由改造'||a.allowReality!==(node.params.关系作用域==='认知与现实'))throw Error('关系改写作用域与能力合同不符');
  return a;
 }
 function active(s,r){return !table(s).revocations.some(e=>e.grantId===r.source.id)&&(r.source.retention==='保留'||s.状态实例?.列表?.[r.source.statusId]?.状态==='生效');}
 function rewrite(s,input,channel){
  grant(s,input,channel==='reality');const social=globalThis.SoulWorldSocial;
  if(!s.人物?.列表?.[input.targetId]||!s.人物?.列表?.[input.otherId]||input.targetId===input.otherId||typeof input.patchId!=='string'||!input.patchId||input.kind!==null&&!social.RELATIONSHIPS[input.kind]&&!(channel==='subjective'&&input.kind==='custody'))throw Error('改写关系双方或类型无效');
  const roles=input.kind===null?null:input.kind==='custody'?{self:input.roles?.self??input.roles?.target??'受控者',other:input.roles?.other??'控制者'}:social.normalizeRoles(input.kind,input.roles),id=`relation-rewrite:${input.source.id}:${input.patchId}:${channel}:${input.targetId}:${input.otherId}${input.kind==='custody'?':custody':''}`,db=table(s,true),old=db.records.find(r=>r.id===id);
  if(roles&&Object.values(roles).some(v=>typeof v!=='string'||!v.trim()||v.length>30))throw Error('关系身份格式无效');
  const body={id,channel,actorId:input.actorId,targetId:input.targetId,otherId:input.otherId,kind:input.kind,roles,source:clone(input.source),patchId:input.patchId,reason:String(input.reason??'能力成功后的关系改写').trim().slice(0,1200)};
  if(old){if(!same(body,Object.fromEntries(Object.entries(old).filter(([k])=>!['order','at','revision','hash'].includes(k)))))throw Error('同一改造编号不能改写为另一关系');return clone(old);}
  if(db.records.some(r=>r.source.id===input.source.id&&r.patchId!==input.patchId))throw Error('同一授权不能提交两份不同修改');
  const record=stamp({...body,at:people.now(s),revision:s.系统.revision,order:people.nextEventOrder(s)});db.records.push(record);return clone(record);
 }
 const rewriteRelation=(s,input)=>rewrite(s,input,'reality');
 const rewriteSubjectiveRelation=(s,input)=>rewrite(s,input,'subjective');
 function revokeSource(s,grantId,sourceId){const db=table(s,true);if(db.revocations.some(e=>e.grantId===grantId))return;const a=s.扩展?.personaRewrites?.grants?.[grantId];if(!a||a.retention!=='随来源')throw Error('此关系来源不允许撤销');db.revocations.push(stamp({grantId,sourceId:String(sourceId),at:people.now(s),order:people.nextEventOrder(s)}));}
 function select(s,a,b,channel,base,custodyLayer=false){
  const candidates=table(s).records.filter(r=>r.channel===channel&&(channel!=='subjective'||(r.kind==='custody')===custodyLayer)&&(channel==='subjective'?r.targetId===a&&r.otherId===b:[r.targetId,r.otherId].includes(a)&&[r.targetId,r.otherId].includes(b))&&active(s,r)&&(channel==='subjective'||r.order>(base?.eventOrder??0)));
  const r=candidates.sort((x,y)=>x.source.strength-y.source.strength||x.order-y.order).at(-1);if(!r)return base;
  const forward=r.targetId===a,selfRole=r.roles?.[forward?'self':'other'],otherRole=r.roles?.[forward?'other':'self'];
  return {kind:r.kind,label:r.kind==='custody'?'认知中的主奴':r.kind?globalThis.SoulWorldSocial.RELATIONSHIPS[r.kind]:'关系已结束',sourceId:r.id,participants:[r.targetId,r.otherId],selfRole,otherRole,roles:r.roles,eventOrder:r.order,cause:'ability-rewrite',channel,grantId:r.source.id,reason:r.reason};
 }
 function others(s,id,subjective=true){return [...new Set(table(s).records.filter(r=>r.channel==='reality'?[r.targetId,r.otherId].includes(id):subjective&&r.targetId===id).map(r=>r.targetId===id?r.otherId:r.targetId))];}
 function rescueSource(s,id,ownerId,targetId,atOrder){const r=table(s).records.find(r=>r.id===id),c=r&&s.扩展?.cognitionChanges?.[`${r.source.statusId}:cognition`];return !!(valid(r)&&r.kind&&r.kind!=='hostile'&&r.order<atOrder&&(r.channel==='subjective'?r.targetId===ownerId&&r.otherId===targetId:[r.targetId,r.otherId].includes(ownerId)&&[r.targetId,r.otherId].includes(targetId))&&!table(s).revocations.some(e=>e.grantId===r.source.id&&e.order<atOrder)&&(r.source.retention==='保留'||!c?.endedOrder||c.endedOrder>=atOrder));}
 function validate(s){const errors=[],db=table(s),ids=new Set();if(db.version!==1||!Array.isArray(db.records)||!Array.isArray(db.revocations))return ['关系改写记录格式无效'];for(const r of db.records)try{if(!valid(r)||r.id!==`relation-rewrite:${r.source.id}:${r.patchId}:${r.channel}:${r.targetId}:${r.otherId}${r.kind==='custody'?':custody':''}`||ids.has(r.id)||!['reality','subjective'].includes(r.channel)||!Number.isSafeInteger(r.order)||r.order<1||r.order>s.扩展.personEventSequence||r.at>people.now(s)||r.revision>s.系统.revision)throw Error('记录');ids.add(r.id);grant(s,{...r,source:r.source},r.channel==='reality',false);if(r.kind!==null&&!globalThis.SoulWorldSocial.RELATIONSHIPS[r.kind]&&!(r.channel==='subjective'&&r.kind==='custody')||!s.人物.列表[r.otherId]||r.targetId===r.otherId)throw Error('关系');}catch{errors.push(`关系改写${r?.id}来源或内容无效`);}for(const e of db.revocations)if(!valid(e)||!s.扩展?.personaRewrites?.grants?.[e.grantId]||e.order>s.扩展.personEventSequence)errors.push('关系来源撤销记录无效');return errors;}
 return Object.freeze({table,grant,rewriteRelation,rewriteSubjectiveRelation,revokeSource,rescueSource,objective:(s,a,b,base)=>select(s,a,b,'reality',base),subjective:(s,a,b,base)=>select(s,a,b,'subjective',base),subjectiveCustody:(s,a,b)=>select(s,a,b,'subjective',null,true),others,validate});
});
