(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulPartyQuota=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const providers=new Map();
 function register(id,provider,readCompanions=()=>[]){if(typeof id!=='string'||!id||typeof provider!=='function'||typeof readCompanions!=='function'||providers.has(id))throw Error('队伍名额来源无效或重复');providers.set(id,{provider,readCompanions});}
 function members(s,leaderId){return [...new Set([...providers.values()].flatMap(({provider})=>provider(s,leaderId)))];}
 function companions(s,leaderId){return [...providers.values()].flatMap(({readCompanions})=>readCompanions(s,leaderId));}
 function leaders(s,personId){return Object.keys(s.人物.列表).filter(id=>members(s,id).includes(personId));}
 return Object.freeze({register,members,companions,leaders});
});
