(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulCommerceContact=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const minute=time=>time?.day*1440+time?.hour*60+time?.minute;
 function findContact(state,left,right,at=minute(state.世界?.时间)){
  if(!left||!right||left===right||!Number.isFinite(at))return null;
  return Object.values(state.人物?.列表??{}).flatMap(person=>person.扩展?.社交约定??[]).findLast(record=>record.kind==='contact'&&record.channel==='soul-device'&&record.status==='completed'&&record.playerId!==record.personId&&[record.playerId,record.personId].includes(left)&&[record.playerId,record.personId].includes(right)&&record.events?.some(event=>event.status==='completed'&&event.channel==='soul-device'&&minute(event.time)<=at))??null;
 }
 return Object.freeze({findContact});
});
