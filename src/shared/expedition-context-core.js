(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulExpeditionContext=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
 const phases=new Set(['awaiting-room','awaiting-narrative','combat','interaction','postcombat']);
 function instances(s){return [s.远征?.当前,...Object.values(plain(s.远征?.sessions)?s.远征.sessions:{})].filter(plain);}
 function participantIds(a,{presentOnly=false}={}){return a?[a.leaderId,...(a.companions??[]).filter(c=>!presentOnly||c.active).map(c=>c.unitId)]:[];}
 function unique(rows,label){if(rows.length>1)throw Error(`远征${label}同时指向多个实例`);return rows[0]??null;}
 function byId(s,id){return unique(instances(s).filter(a=>a.id===id),'编号');}
 function forActor(s,id,{presentOnly=true}={}){if(presentOnly&&s.人物?.列表?.[id]?.status==='dead')return null;return unique(instances(s).filter(a=>a.status==='active'&&participantIds(a,{presentOnly}).includes(id)),'人物');}
 function forBattle(s,id){return id?unique(instances(s).filter(a=>a.currentRoom?.battleId===id),'战斗'):null;}
 function forRosterUnit(s,id){return id?unique(instances(s).filter(a=>a.currentRoom?.roster?.some(u=>u.unitId===id)),'魂兽'):null;}
 function resolve(s,{actorId,sessionId,battleId}={}){
  const chosen=[];
  if(sessionId!==undefined){const a=byId(s,sessionId);if(!a)throw Error('指定远征实例不存在');chosen.push(a);}
  if(actorId!==undefined){const a=forActor(s,actorId);if(!a)throw Error('人物没有实际参与的远征');chosen.push(a);}
  if(battleId!==undefined){const a=forBattle(s,battleId);if(!a)throw Error('战斗不属于任何当前远征房间');chosen.push(a);}
  if(!chosen.length)throw Error('远征操作需要明确实例或实际人物');
  if(chosen.some(a=>a!==chosen[0]))throw Error('远征人物、实例与战斗不属于同一现场');
  return chosen[0];
 }
 function validate(s){
  const d=s.远征;if(d===undefined)return [];if(!plain(d))return ['远征集合无效'];
  const errors=[],ids=new Set(),people=new Map(),battles=new Set(),roster=new Set();
  if(d.当前!==null&&d.当前!==undefined&&!plain(d.当前))errors.push('当前远征结构无效');
  if(d.sessions!==undefined&&!plain(d.sessions))errors.push('独立远征实例表无效');
  for(const [key,a] of Object.entries(plain(d.sessions)?d.sessions:{}))if(!plain(a)||a.id!==key)errors.push('独立远征表键与实例编号不一致');
  for(const a of instances(s))try{
   if(typeof a.id!=='string'||!a.id||ids.has(a.id))throw Error('实例编号重复或缺失');ids.add(a.id);
   if(a.status!=='active'||!phases.has(a.phase)||!s.人物?.列表?.[a.leaderId]||!s.战斗单位?.列表?.[a.leaderId])throw Error('领队或阶段无效');
   if(!Array.isArray(a.companions)||a.companions.some(c=>!plain(c)||typeof c.active!=='boolean'))throw Error('同行名单无效');
   const members=participantIds(a),own=new Set();if(members.length>4)throw Error('人类出战保留名额超过四人');
   for(const id of members){const person=s.人物?.列表?.[id],unit=s.战斗单位?.列表?.[id];if(!person||person.combatantId&&(person.combatantId!==id||!unit)||unit&&person.combatantId!==id||own.has(id)||people.has(id))throw Error('人物不存在、重复或占用另一远征');own.add(id);people.set(id,a.id);}
   if((a===d.当前)!==participantIds(a,{presentOnly:true}).includes(s.角色?.主控单位ID))throw Error('玩家远征与独立实例存放位置不符');
   for(const id of participantIds(a,{presentOnly:true})){const p=s.人物.列表[id];if(p.status==='dead'){if(!p.life?.death?.position?.sceneId?.startsWith(`expedition:${a.id}:`))throw Error('死者缺少原远征现场');continue;}if(p.transit||String(p.locationId).startsWith('journey:')||p.spaceId||p.locationId!==a.entranceLocationId)throw Error('参与者没有本实例的实际地点');}
   if(!plain(a.map)||!plain(a.map.nodes)||!Array.isArray(a.completedNodeIds)||a.completedNodeIds.some(id=>!a.map.nodes[id]))throw Error('地图或已完成房间无效');
   const room=a.currentRoom,node=a.map.nodes[a.currentNodeId];
   if(a.phase==='awaiting-room'){if(a.currentNodeId!==''||room!==null)throw Error('房间间歇仍有当前房间');}
   else if(!plain(room)||!node||room.nodeId!==a.currentNodeId||room.type!==node.type||node.status!=='entered')throw Error('房间与本实例地图不一致');
   if(room?.battleId){
    if(battles.has(room.battleId))throw Error('战斗同时属于多个房间');battles.add(room.battleId);
    const b=s.战斗?.id===room.battleId?s.战斗:s.世界?.backgroundBattles?.[room.battleId],encounter=s.遭遇?.列表?.[room.encounterId];
    if(!b||room.battleId!==`battle-${a.id}-${room.nodeId}`||room.encounterId!==`encounter-${a.id}-${room.nodeId}`||!encounter)throw Error('房间战斗来源不存在或不符');
    if(!b.参与者ID列表?.includes(a.leaderId)||(room.roster??[]).some(u=>!b.参与者ID列表.includes(u.unitId)||!encounter.战斗单位ID列表?.includes(u.unitId)))throw Error('房间战斗与实际人类及魂兽名单不符');
   }
   for(const u of room?.roster??[]){if(roster.has(u.unitId))throw Error('魂兽同时属于多个房间');roster.add(u.unitId);}
   if(a.phase==='combat'&&!room.battleId||a.phase==='awaiting-narrative'&&(!room.narrativeRequest||room.battleId))throw Error('房间战斗与命名阶段不符');
  }catch(e){errors.push(`远征${a.id??''}无效：${e.message}`);}
  return errors;
 }
 return Object.freeze({instances,byId,participantIds,forActor,forBattle,forRosterUnit,resolve,validate});
});
