(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulPersonPresentation=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clone=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
 function personId(s,id){if(!id)return id;const linked=globalThis.SoulConsciousness?.personForCarrier(s,id)?.personId;if(linked)return linked;const deploymentId=s.战斗单位?.列表?.[id]?.扩展?.projection?.deploymentId;return s.扩展?.combatDeployments?.records?.find(r=>r.id===deploymentId)?.prototypeId??id;}
 function live(s,r,ignored){return r.retention==='保留'||r.sourceStatusId!==ignored&&!r.endedOrder&&s.状态实例?.列表?.[r.sourceStatusId]?.状态==='生效';}
 function memoryCutoff(s,id,beforeOrder=Infinity){
  const historical=Number.isFinite(beforeOrder),activeAt=(r,order)=>historical?order<beforeOrder&&(r.retention==='保留'||!r.endedOrder||beforeOrder<r.endedOrder):live(s,r);
  const explicit=historical?undefined:s.人物?.列表?.[id]?.扩展?.cognitivePersona?.forgottenBeforeTurn;
  let result={order:0,turn:-1,at:-1,revision:-1,explicitTurn:Number.isSafeInteger(explicit)?explicit:-1};
  const candidates=[];
  for(const c of Object.values(s.扩展?.cognitionChanges??{}))if(c.targetId===id&&c.direction==='屏蔽既往经历'&&activeAt(c,c.appliedOrder))candidates.push({order:c.appliedOrder,turn:c.storyTurn,at:c.appliedAt,revision:c.startedRevision});
  const storedBase=s.扩展?.personaRewrites?.baselines?.[id]?.['cognition.memories'],base=storedBase?.order<beforeOrder?storedBase:null;
  const patches=Object.values(s.扩展?.personaRewrites?.patches??{}).filter(r=>r.targetId===id&&Object.hasOwn(r.fields,'cognition.memories')&&activeAt(r,r.order)&&r.order>(base?.order??0)).sort((a,b)=>b.strength-a.strength||b.order-a.order);
  const active=patches[0];if(active)candidates.push({order:active.order,turn:active.storyTurn??s.扩展?.cognitionChanges?.[s.扩展?.personaRewrites?.grants?.[active.grantId]?.cognitionId]?.storyTurn??0,at:active.at,revision:active.sourceRevision});
  else if(base?.order>0)candidates.push({order:base.order,turn:base.turn??0,at:base.at??0,revision:base.revision??0});
  for(const c of candidates)if(c.order>result.order)result={...result,...c};
  return result;
 }
 function remembers(s,id,record){
  const cutoff=memoryCutoff(s,id),n=record?.source?.turn??record?.turn;
  if(Number.isSafeInteger(n)&&n<=cutoff.explicitTurn)return false;
  const order=record?.learnedOrder??record?.order??record?.appliedOrder??record?.events?.at(-1)?.order;
  if(Number.isSafeInteger(order))return order>cutoff.order;
  if(!cutoff.order)return true;
  if(Number.isSafeInteger(n))return n>cutoff.turn;
  const value=record?.at??record?.time??record?.createdAt??record?.events?.[0]?.time;
  const at=Number.isSafeInteger(value)?value:value&&Number.isSafeInteger(value.day)?value.day*1440+value.hour*60+value.minute:null;
  if(at!==null)return at>cutoff.at;
  const revision=record?.firstRevision??record?.source?.revision;
  return Number.isSafeInteger(revision)&&revision>cutoff.revision;
 }
 function read(p,k){if(k.startsWith('profile.'))return p.扩展?.characterProfile?.data?.[k.slice(8)];if(k.startsWith('cognition.'))return p.扩展?.cognitivePersona?.[k.slice(10)];if(k==='figure'||k==='avatar')return p.扩展?.[k==='figure'?'currentFigure':'currentAvatar'];return p[k];}
 function rewriteLayers(s,id,ignored){
  const rows=[];
  for(const r of Object.values(s.扩展.bodyChanges??{}))if(r.targetId===id&&live(s,r,ignored))rows.push({order:r.appliedOrder,strength:r.strength,fields:{gender:r.gender,appearance:r.appearance}});
  for(const r of Object.values(s.扩展?.personaRewrites?.patches??{}))if(r.targetId===id&&live(s,r,ignored))rows.push({order:r.order,strength:r.strength,fields:r.fields});
  return rows;
 }
 function baselineValue(rows,key,b){const best=rows.filter(r=>Object.hasOwn(r.fields,key)&&r.order>b.order).sort((a,b)=>b.strength-a.strength||b.order-a.order)[0];return best?best.fields[key]:b.present?b.value:undefined;}
 function underlyingAppearance(s,id){
  const p=s.人物?.列表?.[id]??{},base=s.扩展?.personaRewrites?.baselines?.[id]??{},rows=rewriteLayers(s,id);
  return Object.fromEntries(['name','gender','appearance','figure','avatar'].map(key=>[key,base[key]?baselineValue(rows,key,base[key]):read(p,key)]));
 }
 const episodes=s=>Object.values(s.扩展?.disguises?.episodes??{});
 function active(s,id,ignored){return episodes(s).filter(r=>r.sourceTargetId===id&&r.sourceStatusId!==ignored&&!r.endedOrder&&s.状态实例?.列表?.[r.sourceStatusId]?.状态==='生效').sort((a,b)=>b.strength-a.strength||b.appliedOrder-a.appliedOrder);}
 function winner(s,id,ignored){return active(s,id,ignored)[0]??null;}
 function fields(r){const p=r.template,figure=p.立绘??r.visual;return {...(p.公开名?{name:p.公开名}:{}),appearance:p.外貌,figure,avatar:p.头像??figure};}
 function layers(s,id,ignored){const r=winner(s,id,ignored);return r?[{order:r.appliedOrder,strength:r.strength,fields:fields(r)}]:[];}
 function knownRecords(s,observerId,targetId){return (s.扩展?.disguises?.observations??[]).filter(e=>e.targetId===personId(s,targetId)&&e.observers.includes(personId(s,observerId))&&remembers(s,personId(s,observerId),e));}
 function presentation(s,id,observerId){
  const target=personId(s,id),p=s.人物?.列表?.[target],u=s.战斗单位?.列表?.[id]??s.战斗单位?.列表?.[target],r=winner(s,id),t=r?.template??{};
  const known=observerId?knownRecords(s,observerId,target):[];
  const seenThrough=!!(p&&r?.kind==='幻象'&&observerId!==target&&known.some(e=>e.episodeId===r.id&&e.phase==='detected')),underlying=seenThrough||id!==target&&!r?underlyingAppearance(s,target):null;
  const gender=seenThrough?p.gender:t.公开性别&&t.公开性别!=='不变'?t.公开性别:p?.gender??null;
  const visibleName=underlying?.name??(!seenThrough?t.公开名:undefined)??p?.name??u?.名称??'',secret=p?.扩展?.身份呈现?.actualName,unknownName=observerId&&observerId!==target&&secret&&visibleName===secret&&!known.some(e=>e.phase==='named');
  const name=unknownName?(seenThrough?'伪装下的人':known.some(e=>e.phase==='removed')?'解除伪装的人':'陌生人'):visibleName;
  const knownIdentity=known.filter(e=>e.phase==='named').at(-1)?.after?.name;
  return {personId:target,identityHidden:!!(secret&&observerId&&observerId!==target&&!knownIdentity),name,gender,appearance:underlying?.appearance??t.外貌??p?.appearance??'',identity:t.公开身份??p?.identity??'',seenThrough,...(knownIdentity?{knownIdentity}:{}),...(r?.source.快照.参数.掩饰声音?{voice:t.声音??'经过掩饰的声线'}:{}),...(r?{disguised:true,auraHidden:!!r.source.快照.参数.掩饰魂息,appearanceKind:r.kind,martialSoulMasked:!!r.source.快照.参数.武魂伪装,martialSoul:r.source.快照.参数.武魂伪装?(seenThrough?'表象已识破，真实武魂尚未显露':t.武魂表象??'尚未显露'):(s.成长?.列表?.[target]?.武魂ID列表??[]).map(id=>s.武魂?.列表?.[id]?.名称).filter(Boolean).join(' / ')||p?.soul||'尚未显露',rings:r.source.快照.参数.武魂伪装?t.魂环表象??'尚未显露':null,detected:observerId===target||known.some(e=>e.episodeId===r.id&&['applied','detected','removed'].includes(e.phase))}:{disguised:false})};
 }
 function viewCarrier(s,id,observerId){const original=s.人物?.列表?.[personId(s,id)];if(!original)return null;if(original.id===id)return viewPerson(s,original,observerId);const p=clone(original),r=winner(s,id);p.id=id;delete p.扩展?.disguisePresentation;if(r){for(const [key,value] of Object.entries(fields(r))){if(key==='figure'||key==='avatar'){p.扩展??={};p.扩展[key==='figure'?'currentFigure':'currentAvatar']=value;}else p[key]=value;}}else{const base=underlyingAppearance(s,original.id);p.name=base.name;p.appearance=base.appearance;for(const key of ['figure','avatar']){if(base[key])p.扩展[key==='figure'?'currentFigure':'currentAvatar']=base[key];else delete p.扩展?.[key==='figure'?'currentFigure':'currentAvatar'];}}return viewPerson(s,p,observerId);}
 function viewPerson(s,person,observerId){
  if(!person||!observerId||person.id===personId(s,observerId))return clone(person);
  const out=clone(person),v=presentation(s,person.id,observerId),r=winner(s,person.id);
  out.name=v.name;out.gender=v.gender;out.appearance=v.appearance;out.identity=v.identity;
  if(out.扩展?.身份呈现)out.扩展.身份呈现={publicName:v.name,publicGender:v.gender,publicIdentity:v.identity};
  if(v.identityHidden){delete out.扩展?.characterProfile;delete out.扩展?.角色库ID;}
  if(r){out.occupation=v.identity||out.occupation;out.soul=v.martialSoul;out.扩展??={};out.扩展.disguisePresentation={gender:v.gender,martialSoul:v.martialSoul,identity:v.identity,kind:r.kind};delete out.扩展.characterProfile;delete out.扩展.角色库ID;delete out.扩展.cognitivePersona;}
  if(v.seenThrough){const base=underlyingAppearance(s,person.id);for(const [key,field] of [['currentFigure','figure'],['currentAvatar','avatar']]){if(base[field])out.扩展[key]=base[field];else delete out.扩展[key];}delete out.扩展.disguisePresentation;}
  return out;
 }
 return Object.freeze({personId,memoryCutoff,remembers,rewriteLayers,baselineValue,underlyingAppearance,active,winner,fields,presentation,viewPerson,viewCarrier,knownRecords});
});
