(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulTangmenItemArt=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const names={'sleeve-arrow':'无声袖箭','boot-blade':'靴间飞刃','dragon-whisker':'龙须针','sand-shadow':'含沙射影','zhuge-crossbow':'诸葛神弩','twin-soul-balls':'子母追魂夺命胆','peacock-plume':'孔雀翎','rain-pear-needles':'暴雨梨花针','buddha-lotus':'佛怒唐莲'};
 const ENTRIES=Object.freeze(Object.entries(names).map(([id,name])=>Object.freeze({id,name,templateId:'tang-canon-'+id,presetId:'preset:tang-canon-'+id,artId:'item.tangmen.'+id,artPath:'/art/tangmen-canon-v1/'+id+'.webp'})));
 function get(item){const presetId=item?.presetId??item?.payload?.presetId??item?.mechanics?.presetId,templateId=item?.templateId;return ENTRIES.find(entry=>entry.presetId===presetId||entry.templateId===templateId)??null;}
 return Object.freeze({ENTRIES,get});
});
