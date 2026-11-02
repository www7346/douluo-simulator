const only=(value:any,keys:string[])=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(key=>keys.includes(key));
const scalar=(value:any)=>value!==null&&['string','number','boolean'].includes(typeof value);
export function powerLimitReading(power:any):string{
 if(!power)return '';
 const p=power.soulPower;
 return `真实魂力${p.current}/${p.maximum}，开放比例${p.percent}%，封禁${p.withheld}，已有锁定${p.locked}，本次可支付${p.available}；伤害输出上限${power.damagePercent}%，最高许可${power.maximumCastRank}环阶。`;
}

/** Exact reading of recorded changes, not inferred restrictions or a second state. */
export function scalarBattleChangesReading(changes:any[],display:(id:string)=>string):string[]|null{
 if(!Array.isArray(changes)||changes.some(change=>!only(change,['subjectId','phase','field','before','after'])
  ||typeof change.subjectId!=='string'||typeof change.field!=='string'||!scalar(change.before)||!scalar(change.after)
  ||change.phase!==undefined&&typeof change.phase!=='string'))return null;
 const value=(field:string,v:any)=>field==='参战状态'?({active:'仍在参战',defeated:'已被击败',escaped:'已脱离战斗',surrendered:'已投降'} as Record<string,string>)[v]??String(v):String(v);
 return changes.map(change=>`${display(change.subjectId)}的${change.field}从${value(change.field,change.before)}变为${value(change.field,change.after)}${change.phase?`（${change.phase}）`:''}。`);
}

/** Positions are settled coordinates, never inferred tactical advantages. Keep
 * the full known endpoints (including unchanged cover/tags); unknown components
 * prevent replacement of the original record. */
export function settledBattleChangesReading(changes:any[],display:(id:string)=>string):string[]|null{
 if(!Array.isArray(changes))return null;
 const position=(value:any):Map<string,string>|null=>{
  if(!only(value,['距离区','战场坐标','高度','掩体','站位簇','地形标签','接战单位ID']))return null;
  const parts=new Map<string,string>();
  for(const [key,v] of Object.entries(value)){
   if(key==='战场坐标'){
    if(!only(v,['x','y'])||!Number.isFinite((v as any).x)||!Number.isFinite((v as any).y))return null;
    parts.set(key,`${key}（${(v as any).x}，${(v as any).y}）`);
   }else if(['地形标签','接战单位ID'].includes(key)){
    if(!Array.isArray(v)||v.some(x=>typeof x!=='string'))return null;
    parts.set(key,`${key}：${v.length?v.map(x=>key==='接战单位ID'?display(x):x).join('、'):'无'}`);
   }else{if(typeof v!=='string')return null;parts.set(key,`${key}：${v||'无'}`);}
  }
  return parts;
 };
 const lines:string[]=[];
 for(const change of changes){
  const ordinary=scalarBattleChangesReading([change],display);
  if(ordinary){lines.push(...ordinary);continue;}
  if(!only(change,['subjectId','phase','field','before','after'])||change.field!=='实际位置'||typeof change.subjectId!=='string'||change.phase!==undefined&&typeof change.phase!=='string')return null;
  const before=position(change.before),after=position(change.after);if(before===null||after===null)return null;
  const keys=[...before.keys()],matchingShape=keys.length===after.size&&keys.every(key=>after.has(key));
  // An unchanged component applies to both endpoints. State it once beside
  // the actual changes; compare raw identities, never just displayed names.
  const unchanged=matchingShape?keys.filter(key=>JSON.stringify(change.before[key])===JSON.stringify(change.after[key])):[];
  const changed=keys.filter(key=>!unchanged.includes(key)),compact=unchanged.length>0&&changed.length>0;
  const from=compact?changed.map(key=>before.get(key)):[...before.values()];
  const to=compact?changed.map(key=>after.get(key)):[...after.values()];
  lines.push(`${display(change.subjectId)}的实际位置从〔${from.join('，')}〕变为〔${to.join('，')}〕${compact?`；两端均保持〔${unchanged.map(key=>before.get(key)).join('，')}〕`:''}${change.phase?`（${change.phase}）`:''}。`);
 }
 return lines;
}

/** Convert the existing action-time flags as a unit. Unknown fields stay structured. */
export function battleActionConditionsReading(state:any,moment='行动开始时'):string|null{
 if(!only(state,['mainAction','voluntaryMovementReason','silence','cannotApproach','cannotAttack','canAttemptBreakFree','activeMartialSoulId','martialAvatarStatusId','restrictions','influence','power','desire','exchanges'])
  ||!only(state.mainAction,['surprised','reason'])||typeof state.mainAction.surprised!=='boolean'||typeof state.mainAction.reason!=='string'
  ||typeof state.voluntaryMovementReason!=='string'||typeof state.canAttemptBreakFree!=='boolean'
  ||typeof state.activeMartialSoulId!=='string'||state.martialAvatarStatusId!==null&&typeof state.martialAvatarStatusId!=='string'
  ||['silence','cannotApproach','cannotAttack'].some(key=>!Array.isArray(state[key])||state[key].some((value:any)=>typeof value!=='string')))return null;
 if(state.desire!==undefined&&(!only(state.desire,['strength','flare','penalty','focusBlocked','sourceIds','nextAt'])||state.desire.strength!==0||state.desire.flare!==false||state.desire.penalty!==0||state.desire.focusBlocked!==false||!Array.isArray(state.desire.sourceIds)||state.desire.sourceIds.length||state.desire.nextAt!==null))return null;
 if(state.exchanges!==undefined&&(!Array.isArray(state.exchanges)||state.exchanges.length))return null;
 // Active or unfamiliar control details keep their complete source structure.
 // Only an explicitly empty current control projection can be compressed.
 const restrictions=state.restrictions,influence=state.influence;
 const autonomy=influence?.autonomy;
 if(autonomy!==undefined&&(!only(autonomy,['controlled','puppet','canDecide','canSpeak','sources'])||autonomy.controlled!==false||autonomy.puppet!==false||autonomy.canDecide!==true||autonomy.canSpeak!==true||!Array.isArray(autonomy.sources)||autonomy.sources.length))return null;
 if(!only(restrictions,['blocked','sources','seals'])||!only(restrictions.blocked,[])
  ||!Array.isArray(restrictions.sources)||restrictions.sources.length||!Array.isArray(restrictions.seals)||restrictions.seals.length
  ||!only(influence,['autonomy','controlSources','pendingOrder','cognition'])||!Array.isArray(influence.controlSources)||influence.controlSources.length
  ||influence.pendingOrder!==null||!Array.isArray(influence.cognition)||influence.cognition.length)return null;
 const unrestricted=!state.mainAction.reason&&!state.mainAction.surprised&&!state.voluntaryMovementReason
  &&['silence','cannotApproach','cannotAttack'].every(key=>state[key].length===0);
 const limits=unrestricted?['主行动、主动移动、沉默、接近及攻击限制均无，未受突袭']:[`主行动限制${state.mainAction.reason||'无'}，受突袭${state.mainAction.surprised?'是':'否'}`,
  `主动移动限制${state.voluntaryMovementReason||'无'}`,
  ...([['silence','沉默来源'],['cannotApproach','不能接近来源'],['cannotAttack','不能攻击来源']] as const).map(([key,label])=>`${label}${state[key].length?state[key].join('、'):'无'}`)];
 const fields=[...limits,'附加能力条件限制无，行为控制与认知改变无',
  `可尝试挣脱${state.canAttemptBreakFree?'是':'否'}`,
  `当前武魂${state.activeMartialSoulId||'无'}`,
  `武魂真身状态${state.martialAvatarStatusId===null?'无':state.martialAvatarStatusId}`];
 return moment+'：'+fields.join('；')+'。'+powerLimitReading(state.power);
}
