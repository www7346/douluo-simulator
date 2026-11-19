(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulPlayerAppearance=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const MAX_LENGTH=2000,clone=v=>JSON.parse(JSON.stringify(v)),hash=v=>globalThis.SoulAbilityContract.hash(v);
 const table=s=>s.扩展?.playerAppearanceEdits??{version:1,records:[]};
 const signed=r=>!!r&&r.hash===hash(Object.fromEntries(Object.entries(r).filter(([k])=>k!=='hash')));
 const stamp=r=>({...r,hash:hash(r)}),now=s=>globalThis.SoulPersonCore.now(s);
 const person=s=>s.人物?.列表?.[s.角色?.主控单位ID];
 function reason(s){
  const p=person(s);if(!p)return '请先创建人物';
  if(p.status==='dead'||s.战斗单位?.列表?.[p.id]?.存活状态==='死亡')return '人物已经死亡，当前无法修改样貌';
  if(s.战斗?.状态==='进行中')return '请在战斗结束后保存样貌描述';
  if(s.扩展?.story?.active&&s.扩展.story.active.status!=='complete')return '请先完成本轮对话或战报，再保存样貌描述';
  if(s.终局挑战?.当前?.projection?.scope==='historical-projection'||globalThis.SoulConsciousness?.carrierForPerson(s,p.id))return '请回到原身后保存样貌描述';
  const presentation=globalThis.SoulPersonPresentation;
  const base=s.扩展?.personaRewrites?.baselines?.[p.id]?.appearance;
  if(presentation?.active(s,p.id).length||presentation?.rewriteLayers(s,p.id).some(r=>Object.hasOwn(r.fields,'appearance')&&r.order>(base?.order??0)))return '当前有变身、伪装或外貌改造，请结束该效果后修改样貌描述';
  return '';
 }
 function preview(s){const p=person(s),blocked=reason(s);return {personId:p?.id??null,description:p?.appearance??'',maximumLength:MAX_LENGTH,available:!blocked,reason:blocked};}
 function apply(s,input,commandId){
  if(!input||Object.keys(input).some(k=>!['mode','description','expectedAppearance'].includes(k)))throw Error('样貌修改包含未开放的内容');
  if(!['correction','change'].includes(input.mode))throw Error('请选择修正文案或实际改变外貌');
  if(typeof input.description!=='string'||!input.description.trim()||input.description.length>MAX_LENGTH)throw Error('样貌描述请填写1至2000字');
  const blocked=reason(s);if(blocked)throw Error(blocked);
  const p=person(s),before={gender:p.gender??null,appearance:p.appearance??null};
  if(input.expectedAppearance!==before.appearance)throw Error('当前样貌已经变化，请重新打开后修改');
  const description=input.description.trim();if(description===before.appearance)throw Error('样貌描述没有变化');
  if(typeof commandId!=='string'||!commandId||table(s).records.some(r=>r.id==='player-appearance:'+commandId))throw Error('这次样貌修改已经处理');
  globalThis.SoulPersonRewrite.applyPresentation(s,p.id,['appearance']);
  const order=globalThis.SoulPersonCore.nextEventOrder(s),record=stamp({version:1,id:'player-appearance:'+commandId,commandId,actorId:p.id,targetId:p.id,mode:input.mode,before,after:{gender:before.gender,appearance:description},appliedAt:now(s),appliedOrder:order,turn:Math.max(0,Number(s.扩展?.story?.active?.number??s.扩展?.story?.nextTurn-1)||0),sourceRevision:s.系统.revision});
  s.扩展??={};s.扩展.playerAppearanceEdits??={version:1,records:[]};s.扩展.playerAppearanceEdits.records.push(record);
  p.appearance=description;if(s.角色.档案)s.角色.档案.外貌=description;
  // Capture the ordinary edit in the existing presentation baseline. Other fields and ended effects retain their original sources.
  globalThis.SoulPersonRewrite.applyPresentation(s,p.id,['appearance']);
  if(p.appearance!==description)throw Error('当前外貌来源已经变化，请重新打开后修改');
  const experience=input.mode==='change'?globalThis.SoulPersonChangeKnowledge.transition(s,{sourceKind:'appearance-edit',sourceId:record.id,targetId:p.id,before,after:record.after}):null;
  return {type:'player-appearance-edited',editId:record.id,mode:record.mode,personId:p.id,...(experience?{experienceId:experience.id}:{}),summary:input.mode==='correction'?'样貌描述已修正':'当前外貌已改变，亲眼见到的人会保留这次经历'};
 }
 /** This is a description reference for the author, never a witnessed physical event or remote visual knowledge. */
 function wording(s,viewerId){
  const p=person(s),rows=table(s).records,last=rows.at(-1);if(!p||last?.mode!=='correction'||last.after.appearance!==p.appearance)return null;
  if(viewerId!==p.id){try{if(!globalThis.SoulActionContext.perception(s,viewerId,p.id,'vision'))return null;}catch{return null;}
   const seen=globalThis.SoulPersonPresentation.presentation(s,p.id,viewerId);if(seen.disguised||seen.identityHidden)return null;
  }
  const revisions=[];for(let i=rows.length-1;i>=0&&rows[i].mode==='correction';i--)revisions.unshift(rows[i]);
  return {personId:p.id,kind:'description-correction',physicalChange:false,currentDescription:p.appearance,...(viewerId===p.id?{previousWording:revisions.slice(-6).map(r=>r.before.appearance)}:{}),sourceRevision:last.sourceRevision+1};
 }
 function validate(s){
  const db=s.扩展?.playerAppearanceEdits;if(db===undefined)return [];
  if(!db||db.version!==1||Object.keys(db).some(k=>!['version','records'].includes(k))||!Array.isArray(db.records))return ['样貌修改记录无效'];
  const errors=[],ids=new Set();let previousOrder=0;
  for(const r of db.records)try{
   if(!signed(r)||r.version!==1||r.id!=='player-appearance:'+r.commandId||typeof r.commandId!=='string'||!r.commandId||ids.has(r.id)||r.actorId!==s.角色.主控单位ID||r.targetId!==r.actorId||!person(s)||!['correction','change'].includes(r.mode)||!Number.isSafeInteger(r.appliedOrder)||r.appliedOrder<=previousOrder||r.appliedOrder>s.扩展.personEventSequence||!Number.isSafeInteger(r.appliedAt)||r.appliedAt<0||r.appliedAt>now(s)||!Number.isSafeInteger(r.sourceRevision)||r.sourceRevision<0||r.sourceRevision>=s.系统.revision||!Number.isSafeInteger(r.turn)||r.turn<0||r.turn>Math.max(0,Number(s.扩展?.story?.active?.number??s.扩展?.story?.nextTurn-1)||0))throw Error('来源');
   if(!r.before||!r.after||Object.keys(r.before).sort().join()!=='appearance,gender'||Object.keys(r.after).sort().join()!=='appearance,gender'||r.before.gender!==r.after.gender||r.before.appearance!==null&&typeof r.before.appearance!=='string'||typeof r.after.appearance!=='string'||!r.after.appearance.trim()||r.after.appearance.trim()!==r.after.appearance||r.after.appearance.length>MAX_LENGTH||r.before.appearance===r.after.appearance)throw Error('内容');
   const experiences=(s.扩展?.personaRewrites?.experiences??[]).filter(e=>e.sourceKind==='appearance-edit'&&e.sourceId===r.id);
   if(r.mode==='correction'?experiences.length!==0:experiences.length!==1)throw Error('变化经历');
   ids.add(r.id);previousOrder=r.appliedOrder;
  }catch{errors.push('样貌修改记录'+r?.id+'无效');}
  return errors;
 }
 return Object.freeze({MAX_LENGTH,table,preview,apply,wording,validate});
});
