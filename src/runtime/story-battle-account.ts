import {ordinaryBattleAccountStatement} from './story-battle-ordinary-account';
import {settledBattleChangesReading} from './story-battle-action-reading';
import {storyBattleResourceCourse} from './story-battle-phase-account';
const copy=<T>(value:T):T=>structuredClone(value);
const present=(value:any)=>value!==null&&value!==undefined&&(!Array.isArray(value)||value.length>0);
const totals:Record<string,string>={hpDamage:'结算生命伤害',shieldUsed:'护盾承担伤害',equipmentReduction:'装备减伤',offeredAmount:'提供护盾',lifeRestored:'实际恢复生命',soulPowerRestored:'实际恢复魂力'};

/** Read recorded position components, without inventing facing, metres or tactical success.
 * Both voluntary movement and displacement effects use the same settled position delta.
 * Unknown components remain in the event's full stateChanges for the author and audit.
 */
function positionTransition(before:any,after:any,display:(id:string)=>string){
 if(!before||!after||typeof before!=='object'||typeof after!=='object')return '';
 const descriptions:string[]=[];
 for(const key of ['距离区','战场坐标','高度','掩体','站位簇','地形标签','接战单位ID']){
  if(!Object.hasOwn(before,key)||!Object.hasOwn(after,key)||JSON.stringify(before[key])===JSON.stringify(after[key]))continue;
  const render=(v:any):string|null=>{
   if(key==='战场坐标')return v&&Number.isFinite(v.x)&&Number.isFinite(v.y)?`（${v.x}，${v.y}）`:null;
   if(key==='接战单位ID'&&Array.isArray(v))return v.length?v.map(display).join('、'):'无';
   if(Array.isArray(v)&&v.every(x=>typeof x==='string'))return v.length?v.join('、'):'无';
   return ['string','number','boolean'].includes(typeof v)?v===''?'无':String(v):null;
  };
  const from=render(before[key]),to=render(after[key]);
  if(from!==null&&to!==null)descriptions.push(`${key}从${from}变为${to}`);
 }
 return descriptions.join('，');
}

/** Recognise settled numeric exchanges, not names or prose. Unhandled consequences stay detailed. */
function ordinary(action:any){
 const x=action.execution;
 if(!x||!x.executedSkill||x.movement||x.battleResult||x.sourceItem||['participation','controlOrder','statusLifecycle','fieldLifecycle','statusEvents','traitEvents','martialSoulSwitch','retreatAssist','surrender','escape','ingestion','restraint','desireCheck','disguise','soulChange','exchangeIds','backlash'].some(k=>present(x[k])))return false;
 const c=x.actionStateBefore;
 if(c&&(c.mainAction?.reason||c.mainAction?.surprised||c.voluntaryMovementReason||c.silence?.length||c.cannotApproach?.length||c.cannotAttack?.length||c.canAttemptBreakFree||c.martialAvatarStatusId))return false;
 if(c?.power&&(c.power.soulPower.percent!==100||c.power.damagePercent!==100||c.power.permissions.length||c.power.sources.length))return false;
 if(c?.desire&&(c.desire.strength>0||c.desire.sourceIds?.length)||c?.exchanges?.length)return false;
 if(x.stateChanges.some((change:any)=>!['生命','魂力','护盾'].includes(change.field)||typeof change.before!=='number'||typeof change.after!=='number'||change.before>0&&change.after===0||change.before===0&&change.after>0))return false;
 return x.targetResults.length>0&&x.targetResults.every((target:any)=>{
  if(target.defeated||target.sourceUnitId||target.sourceSkillId||target.domainId||target.trigger||target.check?.critical||target.check?.interference)return false;
  return target.effects.every((effect:any)=>{
   if(!['payload.damage','payload.heal','payload.soul_restore','payload.shield'].includes(effect.effectId))return false;
   return effect.outcomes.every((outcome:any)=>{
    const v=outcome.value;
    if(!v||typeof v!=='object')return false;
    if(outcome.kind==='伤害防护结算'){
     const r=v.resistance;
     return r&&r.mode==='正常'&&r.multiplier===1&&r.absorbed===0&&r.penetration===0&&!r.sources?.length;
    }
    if(!['生命伤害结算','实际护盾变化','实际新增护盾','实际恢复生命','实际魂力变化','效果后的资源'].includes(outcome.kind))return false;
    return Object.entries(v).every(([key,value])=>{
     if(['nonlethalPrevented','absorbedAsShield'].includes(key))return value===0;
     if(key==='nonlethal')return value===false;
     if(key==='damageType')return typeof value==='string';
     return [...Object.keys(totals),'remainingHp','remainingSoulPower','temporaryHpBefore','temporaryHp','amount'].includes(key)&&typeof value==='number'&&Number.isFinite(value)&&value>=0;
    });
   });
  });
 });
}

/** An ordered, selective account of frozen events. These are author facts, never final novel prose.
 * Each ordinary interval retains who used what on whom, actual hit/miss counts, paid resources,
 * settled totals, known ranges, and exact provenance; important/non-numeric events remain intact.
 */
export function compileStoryBattleAccount(evidence:any,timeline:any[]){
 const passages:any[]=[],seenSkills=new Set<string>(),seenRelations=new Set<string>(),seenConsequences=new Set<string>();let pending:any[]=[];
 const names=new Map([...evidence.opening.units,...evidence.closing.units].map((u:any)=>[u.id,u.name]));
 const person=(id:string)=>({id,name:names.get(id)??id});
 const display=(id:string)=>{const label=names.get(id)??id;return [...names.values()].filter(n=>n===label).length>1?`${label}（${id}）`:label;};
 const concreteStatement=(row:any,closing=false)=>{
  // action is the request recorded by combat, not proof it ran. Restrictions
  // can consume the turn before any skill or non-skill action is performed.
  const lines=[`第${row.round}回合，按发生顺序第${row.sequence}项：${display(row.actor.id)}${row.skill?`使用${row.skill.name}`:row.action?`申报${row.action}`:'的留存行动'}。`];
  if(row.skill?.sourceReading)lines.push(row.skill.sourceReading+'。');
  if(row.stage)lines.push(row.stage);
  if(row.participation)lines.push('原远征合作已经失效，本次为本人自主求生，未继续执行旧队伍指令。');
  if(row.controlOrder)lines.push(row.controlOrder.failure?`原控制命令本次无法执行：${row.controlOrder.failure}。`:'本次动作按仍有效的控制命令执行。');
  if(row.movement){
   const move=row.movement;
   lines.push(`${display(row.actor.id)}完成${move.dash===true?'冲刺移动':'移动'}${Number.isFinite(move.distance)?`，规则记录的移动距离为${move.distance}距离区`:''}。`);
  }
  for(const result of row.results??[]){
   lines.push(`对象${display(result.targetId)}：${result.statement}。`);
  }
  const scalarChanges=settledBattleChangesReading(row.stateChanges??[],display);
  if(scalarChanges)lines.push(...scalarChanges);
  else for(const change of row.stateChanges??[]){
   const value=(v:any)=>change.field==='参战状态'?({active:'仍在参战',defeated:'已被击败',escaped:'已脱离战斗',surrendered:'已投降'} as Record<string,string>)[v]??String(v):String(v);
   const scalar=(v:any)=>v!==null&&['string','number','boolean'].includes(typeof v);
   const position=change.field==='实际位置'?positionTransition(change.before,change.after,display):'';
   lines.push(`${display(change.subjectId)}的${change.field}${position?`：${position}`:scalar(change.before)&&scalar(change.after)?`从${value(change.before)}变为${value(change.after)}`:'已发生记录中的变化'}${change.phase?`（${change.phase}）`:''}。`);
  }
  // The last exchanges explain the transition into the next interval. A hit
  // alone omits its actual outcome, even when the interval total is retained.
  for(const result of row.results??[])for(const effect of result.effects??[])for(const outcome of effect.results??[])lines.push(`${display(outcome.subjectId??result.targetId)}：${outcome.fact}。`);
  if(row.itemUse?.statement)lines.push(row.itemUse.statement+'。');
  if(row.resources)lines.push(row.resources+'。');
  if(!closing)for(const text of row.actualOutcomes??[])lines.push(text);
  return lines.join('');
 };
 const summarize=(pending:any[])=>{
  if(!pending.length)return;
  const groups=new Map<string,any>(),resources=new Map<string,any>(),values=new Map<string,any>(),descriptions=new Map<string,any>();
  const range=(id:string,field:string,before:number|undefined,after:number,action:any)=>{
   const key=JSON.stringify([id,field]),current=values.get(key);
   const observed={sequence:action.sequence,round:action.round,after};
   if(!current)values.set(key,{subjectId:id,name:names.get(id)??id,field,firstObservation:{...observed,before:before??null},lastObservation:observed,minimum:Math.min(before??after,after),maximum:Math.max(before??after,after)});
   else{current.lastObservation=observed;current.minimum=Math.min(current.minimum,before??after,after);current.maximum=Math.max(current.maximum,before??after,after);}
  };
  for(const {action,row} of pending){
   const x=action.execution,r=x.resources?.actorSoulPower;
   if(r){const prior=resources.get(action.actorId);if(prior){prior.paid+=r.spent;prior.afterLastAction=r.after;}else resources.set(action.actorId,{actorId:action.actorId,name:action.actorName,beforeFirstAction:r.before,afterLastAction:r.after,paid:r.spent});}
   for(const text of x.narrationFacts)descriptions.set(JSON.stringify([action.actorId,text]),{actorId:action.actorId,text});
   for(const c of x.stateChanges)range(c.subjectId,c.field,c.before,c.after,action);
   for(const target of x.targetResults){
    const signature=JSON.stringify([action.actorId,row.skill.reference,row.skill.castRank,row.skill.soulPowerCost,target.targetId,target.branchId,target.effects.map((e:any)=>[e.effectId,e.outcomes.map((o:any)=>o.value?.damageType??null)])]);
    let group=groups.get(signature);
    if(!group){group={actorId:action.actorId,actorName:action.actorName,targetId:target.targetId,targetName:names.get(target.targetId)??target.targetId,skill:copy(row.skill),sourceSequences:[],rounds:{first:action.round,last:action.round},count:0,hit:0,miss:0,checkUnknown:0,affected:0,notAffected:0,affectedUnknown:0,checks:[],totals:{},outcomeKinds:[]};delete group.skill.castIndex;groups.set(signature,group);}
    group.sourceSequences.push(action.sequence);group.rounds.last=action.round;
    group.count++;
    group[target.check?.hit===true?'hit':target.check?.hit===false?'miss':'checkUnknown']++;
    group[target.affected===true?'affected':target.affected===false?'notAffected':'affectedUnknown']++;
    const check=group.checks.find((c:any)=>JSON.stringify(c.result)===JSON.stringify(target.check));
    if(check)check.count++;else group.checks.push({result:copy(target.check),count:1});
    for(const effect of target.effects)for(const o of effect.outcomes){
     if(o.kind==='伤害防护结算')continue;
     const v=o.value,kind=[o.kind,v.damageType].filter(Boolean).join('·');
     if(!group.outcomeKinds.includes(kind))group.outcomeKinds.push(kind);
     for(const [key,value] of Object.entries(v)){
      const label=key==='amount'?({'payload.heal':'实际恢复生命','payload.soul_restore':'实际恢复魂力','payload.shield':'实际新增护盾'} as Record<string,string>)[effect.effectId]:totals[key];
      if(label)group.totals[label]=(group.totals[label]??0)+(value as number);
     }
     // Recorded remaining values provide endpoints, never a guessed pre-damage HP.
     if(typeof v.remainingHp==='number')range(o.subjectId,'效果后生命',undefined,v.remainingHp,action);
     if(typeof v.remainingSoulPower==='number')range(o.subjectId,'效果后魂力',undefined,v.remainingSoulPower,action);
     if(typeof v.temporaryHp==='number')range(o.subjectId,'效果后护盾',v.temporaryHpBefore,v.temporaryHp,action);
    }
   }
  }
  const first=pending[0].action,last=pending.at(-1).action,exchanges=[...groups.values()];
  const summary=ordinaryBattleAccountStatement({exchanges,resources:[...resources.values()],recordedValues:[...values.values()],actualDescriptions:[...descriptions.values()]});
  const lastByActor=new Map<string,any>();for(const entry of pending)lastByActor.set(entry.action.actorId,entry);
  const closingExchanges=[...lastByActor.values()].sort((a,b)=>a.action.sequence-b.action.sequence).map(({action,row})=>({
   sourceSequences:[action.sequence],round:action.round,actor:person(action.actorId),targets:row.results.map((r:any)=>({targetId:r.targetId})),skill:copy(row.skill),statement:concreteStatement(row,true),
  }));
  const resourceCourse=storyBattleResourceCourse(pending.map(p=>p.row),display).lines;
  return {kind:'交锋概括',sourceSequences:pending.map(p=>p.action.sequence),rounds:{first:first.round,last:last.round},...(summary===null?{}:{statement:summary}),resourceCourse,exchanges,resources:[...resources.values()],recordedValues:[...values.values()],actualDescriptions:[...descriptions.values()],closingExchanges};
 };
 const concretePassage=({action,row,beginsRecordedChange}:any)=>({kind:'具体经过',sourceSequences:[action.sequence],actor:person(action.actorId),statement:concreteStatement(row),event:copy(row),...(beginsRecordedChange?{beginsRecordedChange:true}:{})});
 const appendConcrete=(entry:any)=>passages.push(concretePassage(entry));
 const flush=()=>{
  if(!pending.length)return;
  // Interval totals and their last actual exchanges serve different purposes.
  // The compact closing records retain exact provenance without duplicating the
  // full action structures or turning a long battle back into a round-by-round log.
  const concrete=pending.map(concretePassage),summary=summarize(pending);
  // Aggregation serves repeated exchanges. A singleton or several distinct
  // actions have no repetition to condense; their ordered account is clearer.
  // Include the retained closing exchanges when measuring the whole reading,
  // otherwise a statistical paragraph can be longer than what it replaces.
  const repeated=summary?.exchanges.some(g=>new Set(g.sourceSequences).size>1);
  const summarizedLength=summary?.statement===undefined?Infinity:summary.statement.length+summary.closingExchanges.reduce((n,p)=>n+p.statement.length,0);
  if(repeated&&summarizedLength<concrete.reduce((n,p)=>n+p.statement.length,0))passages.push(summary);
  else passages.push(...concrete);
  pending=[];
 };
 evidence.actions.forEach((action:any,index:number)=>{
  const row=timeline[index],skillKey=JSON.stringify([action.actorId,row.skill?.reference]),firstUse=!!row.skill&&!seenSkills.has(skillKey);
  if(row.skill)seenSkills.add(skillKey);
  // First performed actor/target/source combinations are reading transitions.
  // Repeated alternation may still be summarized; this is never a combat flag.
  let firstRelation=false;
  for(const result of row.results??[]){
   const key=JSON.stringify([action.actorId,result.targetId,row.skill?.reference??row.action]);
   if(!seenRelations.has(key)){seenRelations.add(key);firstRelation=true;}
  }
  // First settled effects and first resource transitions are readable turning points.
  // They are distinct evidence: damage is not necessarily equal to lost HP. Missing
  // state deltas stay unknown; an explicit effect can still retain its exact onset.
  let firstConsequence=false;
  const retainFirst=(key:unknown[])=>{const id=JSON.stringify(key);if(!seenConsequences.has(id)){seenConsequences.add(id);firstConsequence=true;}};
  for(const change of action.execution?.stateChanges??[]){
   if(!['生命','魂力','护盾'].includes(change.field)||!Number.isFinite(change.before)||!Number.isFinite(change.after)||change.before===change.after)continue;
   retainFirst(['state',change.subjectId,change.field,Math.sign(change.after-change.before)]);
  }
  for(const target of action.execution?.targetResults??[])for(const effect of target.effects)for(const outcome of effect.outcomes){
   for(const key of ['hpDamage','shieldUsed','lifeRestored','soulPowerRestored','amount']){
    if(key==='amount'&&!['payload.heal','payload.soul_restore','payload.shield'].includes(effect.effectId))continue;
    if(Number.isFinite(outcome.value?.[key])&&outcome.value[key]>0)retainFirst(['effect',outcome.subjectId,effect.effectId,outcome.kind,key]);
   }
  }
  if(index!==0&&index!==evidence.actions.length-1&&!firstUse&&!firstRelation&&!firstConsequence&&ordinary(action))pending.push({action,row});
  else{flush();appendConcrete({action,row,beginsRecordedChange:firstUse||firstRelation||firstConsequence});}
 });
 flush();
 return {scope:'按发生顺序排列的本场实际经过。普通交锋在标明的区间内按施展者、对象与结果汇总，各组的回合范围可能重叠；组内来源编号与资源历程对应已结算行动，末次交锋单列。具体经过保留关键变化；战后恢复另列。',passages};
}
