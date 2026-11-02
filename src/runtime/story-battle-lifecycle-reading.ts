const record=(v:any)=>v&&typeof v==='object'&&!Array.isArray(v);
const exact=(v:any,keys:string[])=>record(v)&&keys.every(key=>Object.hasOwn(v,key))&&Object.keys(v).every(key=>keys.includes(key));
const text=(v:any):string=>typeof v==='string'?v||'空':typeof v==='boolean'?v?'是':'否':JSON.stringify(v);
const bag=(v:any)=>Object.entries(v).map(([key,value])=>`${key}：${text(value)}`).join('，')||'空';
const reasonNames:Record<string,string>={expired:'持续时间结束',consumed:'次数已消耗',damaged:'受到伤害',cleansed:'被净化',dispelled:'被驱散',revived:'复活时清理','domain-removed':'领域移除','domain-suppressed':'领域受压制','domain-membership-ended':'退出领域作用名单','attack-revealed':'攻击暴露','broken-free':'已挣脱','source-invalidated':'来源失效','source-incapacitated':'施术者失能','source-dead':'施术者死亡','source-soul-unavailable':'施术武魂不可用','source-item-lost':'来源物品失效','source-restraint-inactive':'拘束器不再生效','source-restraint-removed':'来源拘束器已拆除','target-dead':'受术者死亡','maintenance-broken':'维持中断','battle-ended':'战斗结束',manual:'手动解除','charges-consumed':'追击次数已耗尽','confluence-consumed':'剩余追击已合流','area-dispelled':'区域遮蔽已驱散','source-item-sealed':'来源装备的能力已被封锁'};
const STATUS_KEYS=['instanceId','effectId','name','family','negative','layers','strength','durationMode','remainingRounds','usesRemaining','state','sourceUnitId','sourceUnitName','sourceSkillId','sourceSkillName','sourceMartialSoulId','sourceRingId','sourceEffectId','sourceReceiptId','params','triggered','deferredFirstEnd'];
const STATUS_OPTIONAL=['sealedMartialSoulId','appliedAt','expiresAt','remainingMinutes','sourcePolicy'];
const STATUS_SOURCE=['effectId','family','sourceUnitId','sourceUnitName','sourceSkillId','sourceSkillName','sourceMartialSoulId','sourceRingId','sourceEffectId','sourceReceiptId'];
const pick=(v:any,keys:string[])=>Object.fromEntries(keys.map(key=>[key,structuredClone(v[key])]));

/** A reading of each recorded lifecycle event, retaining its order and snapshot.
 * Removal snapshots can still say active: the lifecycle event, not that old flag,
 * states what happened. No duration tick, effectiveness, or constraint is inferred.
 */
export function battleLifecycleReading(row:any,display:(id:string)=>string):any[]|null{
 const output:any[]=[];
 if(['statusLifecycle','fieldLifecycle'].some(key=>row[key]!==undefined&&!Array.isArray(row[key])))return null;
 for(const entry of row.statusLifecycle??[]){
  if(!exact(entry,['order','subjectId','phase','event','reason','status'])||!Number.isSafeInteger(entry.order)
   ||['subjectId','phase','event','reason'].some(key=>typeof entry[key]!=='string')||!exact(entry.status,[...STATUS_KEYS,...STATUS_OPTIONAL.filter(key=>Object.hasOwn(entry.status??{},key))]))return null;
  const s=entry.status;
  if(Object.hasOwn(s,'sealedMartialSoulId')&&typeof s.sealedMartialSoulId!=='string')return null;
  if(['世界分钟','来源有效'].includes(s.durationMode)&&(!Number.isSafeInteger(s.appliedAt)||typeof s.sourcePolicy!=='string'||s.expiresAt!==null&&!Number.isSafeInteger(s.expiresAt)||s.remainingMinutes!==null&&!Number.isSafeInteger(s.remainingMinutes)))return null;
  if(!record(s.params)||['layers','strength','remainingRounds','usesRemaining'].some(key=>!Number.isFinite(s[key]))
   ||['negative','triggered','deferredFirstEnd'].some(key=>typeof s[key]!=='boolean')
   ||STATUS_KEYS.filter(key=>!['params','layers','strength','remainingRounds','usesRemaining','negative','triggered','deferredFirstEnd'].includes(key)).some(key=>typeof s[key]!=='string'))return null;
  const reason=entry.reason?`；原因：${reasonNames[entry.reason]??entry.reason}`:'';
  output.push({kind:'status',order:entry.order,subjectId:entry.subjectId,phase:entry.phase,event:entry.event,instanceId:s.instanceId,
   statement:`${entry.phase}，${display(entry.subjectId)}：${entry.event}【${s.name}（${s.instanceId}）】${Object.keys(s.params).length?`，参数〔${bag(s.params)}〕`:''}${reason}。`,
   snapshotReading:`该事件留存快照：参数〔${bag(s.params)}〕；持续方式${s.durationMode||'空'}，${s.durationMode==='本场战斗'?'绑定当前战斗并持续供魂，无固定回合倒数':['世界分钟','来源有效'].includes(s.durationMode)?`施加时刻${s.appliedAt}，到期时刻${s.expiresAt??'依赖来源'}，剩余分钟${s.remainingMinutes??'依赖来源'}，依赖${s.sourcePolicy}`:`剩余回合记录${s.remainingRounds}`}，剩余次数记录${s.usesRemaining}；层数${s.layers}，强度${s.strength}，负面标记${text(s.negative)}；状态标记${s.state}，已触发${text(s.triggered)}，延后首次目标回合结束计数${text(s.deferredFirstEnd)}。`,
   source:{...pick(s,STATUS_SOURCE),reason:entry.reason}});
 }
 for(const entry of row.fieldLifecycle??[]){
  if(!exact(entry,['order','phase','event','reason','field'])||!Number.isSafeInteger(entry.order)||['phase','event','reason'].some(key=>typeof entry[key]!=='string'))return null;
  const f=entry.field,keys=['id','kind','source','params','remainingRounds','state','position',...(f?.kind==='domain'?['suppressorIds','memberIds']:[])];
  if(!exact(f,keys)||!['domain','zone'].includes(f.kind)||typeof f.id!=='string'||typeof f.state!=='string'
   ||!record(f.source)||!record(f.params)||!record(f.position)||!Number.isFinite(f.remainingRounds)
   ||f.kind==='domain'&&['suppressorIds','memberIds'].some(key=>!Array.isArray(f[key])||f[key].some((id:any)=>typeof id!=='string')))return null;
  output.push({kind:f.kind,order:entry.order,phase:entry.phase,event:entry.event,instanceId:f.id,sourceUnitId:f.source.单位ID??null,
   statement:`${entry.phase}，${f.kind==='domain'?'领域':'区域'}${f.id}：${entry.event}${entry.reason?`；原因：${reasonNames[entry.reason]??entry.reason}`:''}。`,
   snapshotReading:`该事件留存快照：参数〔${bag(f.params)}〕；位置〔${bag(f.position)}〕；剩余回合记录${f.remainingRounds}，状态标记${f.state}。`,
   ...(f.kind==='domain'?{suppressorIds:structuredClone(f.suppressorIds),memberIds:structuredClone(f.memberIds)}:{}),
   source:{...structuredClone(f.source),reason:entry.reason}});
 }
 if(new Set(output.map(entry=>entry.order)).size!==output.length)return null;
 return output.sort((a,b)=>a.order-b.order);
}
