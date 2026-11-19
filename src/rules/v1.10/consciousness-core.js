(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulConsciousness=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 // A provider owns its mechanical records. Identity, memory and growth stay on the person.
 const providers=new Map(),clone=v=>JSON.parse(JSON.stringify(v));
 function registerProvider(kind,provider){if(typeof kind!=='string'||!kind||typeof provider?.links!=='function'||typeof provider?.validProof!=='function')throw Error('意识载体缺少正式来源');if(providers.has(kind))throw Error('意识载体来源重复');providers.set(kind,provider);}
 function links(s){return [...providers].flatMap(([kind,p])=>p.links(s).map(row=>({...row,source:{kind,id:row.sourceId}})));}
 function carrierForPerson(s,personId){const rows=links(s).filter(r=>r.personId===personId);if(rows.length>1)throw Error('同一人物不能同时占用多个意识载体');return rows[0]??null;}
 function personForCarrier(s,unitId){const rows=links(s).filter(r=>r.unitId===unitId);if(rows.length>1)throw Error('同一载体不能同时容纳多个人物意识');return rows[0]??null;}
 function unitId(s,personId){return carrierForPerson(s,personId)?.unitId??personId;}
 function positionOf(s,personId){return globalThis.SoulScenePosition.positionOf(s,unitId(s,personId));}
 function proof(s,personId){const r=carrierForPerson(s,personId);return r?{personId:r.personId,unitId:r.unitId,controllerId:r.controllerId,source:clone(r.source)}:null;}
 function validProof(s,p,at,order){return !!p&&providers.get(p.source?.kind)?.validProof(s,p,at,order)===true;}
 function originalActionReason(s,personId){return carrierForPerson(s,personId)?'本人的意识正在投影中，原体不能同时行动':'';}
 function resistanceReason(s,actorId,{harmfulTargetIds=[],action=''}={}){const link=personForCarrier(s,actorId);if(!link?.forbidResistance)return '';if(harmfulTargetIds.includes(link.controllerId)||['flee','逃跑','认输','投降'].includes(action))return '投影受主人控制，不能伤害或违抗主人';return '';}
 function facts(s,personId){const p=proof(s,personId);return p?{...p,position:positionOf(s,personId),originalOccupied:true,meaning:'人物意识在当前载体上，亲历和交流记忆归本人；原体不能同时独立行动。'}:null;}
 function validate(s){const errors=[],people=new Set(),units=new Set();for(const r of links(s)){if(people.has(r.personId)||units.has(r.unitId)||!s.人物?.列表?.[r.personId]||s.人物.列表[r.personId].status==='dead'||!s.战斗单位?.列表?.[r.unitId]||s.人物.列表[r.unitId]||r.personId===r.unitId||!validProof(s,proof(s,r.personId),globalThis.SoulPersonCore.now(s),Infinity))errors.push('意识载体缺少唯一的正式人物与部署来源');people.add(r.personId);units.add(r.unitId);}return errors;}
 return Object.freeze({registerProvider,links,carrierForPerson,personForCarrier,unitId,positionOf,proof,validProof,originalActionReason,resistanceReason,facts,validate});
});
