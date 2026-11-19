(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulAttributeLinks=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';const providers=new Map();
 function register(id,read){if(providers.has(id)||typeof read!=='function')throw Error('属性联结来源重复或无效');providers.set(id,read);}
 function sources(state,unitId){const seen=new Set(),rows=[];for(const [provider,read]of providers)for(const row of read(state,unitId)??[]){const key=provider+':'+row.sourceId;if(!row.sourceId||seen.has(key)||!Number.isFinite(row.percent)||row.percent<0||row.percent>100)throw Error('属性联结来源或增幅无效');seen.add(key);rows.push({...row,provider});}return rows;}
 function bonuses(state,unit){const rows=sources(state,unit.id),percent=rows.reduce((n,r)=>n+r.percent,0);return Object.fromEntries(Object.entries(unit.六维.有效).map(([key,value])=>[key,percent?Math.ceil(Number(value)*percent/100):0]));}
 return Object.freeze({register,sources,bonuses});
});
