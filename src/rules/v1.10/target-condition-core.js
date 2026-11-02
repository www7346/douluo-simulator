(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulTargetConditions=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clone=v=>JSON.parse(JSON.stringify(v));
 const FIELDS=Object.freeze({obedience:{type:'number',label:'对施术者的服从度'},gender:{type:'string',label:'性别'},age:{type:'number',label:'年龄'},level:{type:'number',label:'等级'},healthPercent:{type:'number',label:'生命比例'},soulPowerPercent:{type:'number',label:'魂力比例'},controlledByActor:{type:'boolean',label:'受本人有效控制'},incapacitated:{type:'boolean',label:'失能'},ownCaptive:{type:'boolean',label:'归本人看管'},sameScene:{type:'boolean',label:'同场'},unitKind:{type:'string',label:'对象类型'},status:{type:'set',label:'当前状态'}});
 const OPS=Object.freeze({string:['eq','ne','in','notIn'],number:['eq','ne','gt','gte','lt','lte','between'],boolean:['eq','ne'],set:['contains','notContains']});
 const CONDITIONAL_EFFECTS=Object.freeze(['payload.damage','payload.heal','payload.shield','status.poison','status.sleep','status.stun','status.bind','status.mark','status.slow','status.armor_break']);
 const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
 function normalize(input){
  let count=0;const seen=new Set();
  function visit(v,depth){
   if(depth>8||++count>64||!plain(v)||seen.has(v))throw Error('对象条件过深、循环或格式无效');seen.add(v);
   const keys=Object.keys(v);let out;
   if(keys.length===1&&['all','any','not'].includes(keys[0])){const key=keys[0];if(key==='not')out={not:visit(v.not,depth+1)};else{if(!Array.isArray(v[key])||!v[key].length||v[key].length>32)throw Error('组合条件必须包含1至32项');out={[key]:v[key].map(x=>visit(x,depth+1))};}}
   else{
    if(keys.length!==3||keys.some(k=>!['field','op','value'].includes(k))||!FIELDS[v.field]||!OPS[FIELDS[v.field].type].includes(v.op))throw Error('对象条件字段或比较方式无效');
    const type=FIELDS[v.field].type,val=v.value,numeric=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
    if(type==='number'&&(v.op==='between'?!(Array.isArray(val)&&val.length===2&&val.every(numeric)&&val[0]<=val[1]):!numeric(val)))throw Error('数值条件或区间无效');
    if(type==='boolean'&&typeof val!=='boolean')throw Error('状态条件须为布尔值');
    if(['string','set'].includes(type)){const values=['in','notIn'].includes(v.op)?val:[val];if(!Array.isArray(values)||!values.length||values.length>32||values.some(x=>typeof x!=='string'||!x.trim()||x.length>100))throw Error('对象条件取值无效');}
    if(v.field==='gender'&&(['in','notIn'].includes(v.op)?val:[val]).some(x=>!['男','女'].includes(x)))throw Error('性别条件须使用已登记性别');
    out={field:v.field,op:v.op,value:clone(val)};
   }
   seen.delete(v);return out;
  }
  return visit(input,0);
 }
 function validate(v){try{normalize(v);return {pass:true,errors:[]};}catch(e){return {pass:false,errors:[e.message]};}}
 function incapacitated(s,id){
  const u=s.战斗单位?.列表?.[id],p=s.人物?.列表?.[id],c=globalThis.SoulControlCore;
  if(!u&&!p)return null;if(p?.status==='dead'||u?.存活状态==='死亡'||p?.life?.death)return false;
  if(u&&(u.存活状态==='昏迷'||u.资源?.生命?.当前<=0))return true;
  if(c?.active(s,id).some(x=>['status.sleep','status.stun'].includes(x.模板ID)))return true;
  const r=c?.restrictions(s,id);return !!(r?.blocked?.movement?.length&&r?.blocked?.gesture?.length&&(u?.单位种类==='普通人'||c.combatSuppressed(s,id)));
 }
 function read(s,actorId,targetId,field){
  const p=s.人物?.列表?.[targetId],u=s.战斗单位?.列表?.[targetId];if(!p&&!u)return null;
  if(field==='obedience')return globalThis.SoulObedience?.value(s,targetId,actorId)??null;
  if(field==='gender'){const personId=globalThis.SoulConsciousness?.personForCarrier(s,targetId)?.personId??targetId,person=s.人物?.列表?.[personId];return ['男','女'].includes(person?.gender)?person.gender:null;}
  if(field==='age'){try{const personId=globalThis.SoulConsciousness?.personForCarrier(s,targetId)?.personId??targetId,f=globalThis.SoulPersonCore?.facts(s,personId);return f?.ageKnown?f.ageYears:null;}catch{return null;}}
  if(field==='level')return s.成长?.列表?.[targetId]?.魂力等级??u?.派生?.有效等级??u?.成长?.魂力等级??null;
  if(field==='incapacitated')return incapacitated(s,targetId);
  if(field==='controlledByActor')return !!globalThis.SoulResidentRealms?.controlQualification(s,actorId,targetId,false);
  if(field==='ownCaptive'){const c=globalThis.SoulCustodyCore?.active(s,targetId);return !!c&&c.custodianId===actorId&&c.arrangement?.kind!=='identity';}
  if(field==='sameScene'){try{return globalThis.SoulActionContext?.colocated(s,actorId,targetId)??null;}catch{return null;}}
  if(field==='unitKind')return u?.单位种类??null;
  if(field==='status')return globalThis.SoulControlCore?.active(s,targetId).map(x=>x.模板ID)??[];
  if(field==='healthPercent'||field==='soulPowerPercent'){const r=u?.资源?.[field==='healthPercent'?'生命':'魂力'];return r&&r.最大>0?r.当前/r.最大*100:null;}
  return null;
 }
 function describe(input){const v=normalize(input);if(v.all)return v.all.map(describe).join('，且');if(v.any)return '('+v.any.map(describe).join('，或')+')';if(v.not)return '不满足('+describe(v.not)+')';const names={eq:'为',ne:'不为',gt:'大于',gte:'至少',lt:'小于',lte:'至多',between:'介于',in:'属于',notIn:'不属于',contains:'包含',notContains:'不包含'};const value=typeof v.value==='boolean'?(v.value?'是':'否'):Array.isArray(v.value)?v.value.join('至'):v.value;return FIELDS[v.field].label+names[v.op]+value;}
 function evaluate(s,{actorId,targetId},input){
  const condition=normalize(input);
  function check(v){
   if(v.all||v.any){const key=v.all?'all':'any',values=v[key].map(check);return key==='all'?(values.includes(false)?false:values.includes(null)?null:true):(values.includes(true)?true:values.includes(null)?null:false);}
   if(v.not){const r=check(v.not);return r===null?null:!r;}
   const a=read(s,actorId,targetId,v.field),b=v.value;if(a===null||a===undefined)return null;
   return ({eq:()=>a===b,ne:()=>a!==b,gt:()=>a>b,gte:()=>a>=b,lt:()=>a<b,lte:()=>a<=b,between:()=>a>=b[0]&&a<=b[1],in:()=>b.includes(a),notIn:()=>!b.includes(a),contains:()=>a.includes(b),notContains:()=>!a.includes(b)})[v.op]();
  }
  const value=check(condition);return {pass:value===true,result:value===null?'unknown':value?'pass':'fail',reason:value===true?'':value===null?'目标资料不足，无法确认：'+describe(condition):'目标不满足：'+describe(condition)};
 }
 function skillReason(s,actorId,targetId,skill){return skill?.targetConditions?evaluate(s,{actorId,targetId},skill.targetConditions).reason:'';}
 return Object.freeze({FIELDS,OPS,CONDITIONAL_EFFECTS,normalize,validate,read,incapacitated,evaluate,describe,skillReason});
});
