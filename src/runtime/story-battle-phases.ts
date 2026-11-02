const copy=<T>(value:T):T=>structuredClone(value);
const fields:Record<string,string>={life:'存活状态',memberStatus:'参战状态',hp:'生命',hpMax:'生命上限',shield:'护盾',sp:'魂力',spMax:'魂力上限',position:'实际位置'};
const turningFields=new Set(['存活状态','参战状态','实际行动限制','持有技能','锁定魂力','每回合维持魂力']);
const snapshot=(frame:any)=>({units:(frame.units??[]).map((unit:any)=>({id:unit.id,name:unit.name,values:Object.fromEntries(Object.entries(fields).filter(([key])=>Object.hasOwn(unit,key)).map(([key,label])=>[label,copy(unit[key])]))}))});

/** Derived writing checkpoints, not world state. Never rerun combat or infer unrecorded changes.
 * Checkpoints cover recorded unit values; lifecycle/field events remain in the ordered actions.
 */
export function compileStoryBattlePhases(battle:any,recordedLifecycle:boolean[],eventEnds:ReadonlySet<number>=new Set()){
 const rows:any[]=battle.actions,phases:any[]=[];
 let state:any=snapshot(battle.opening),opening:any=copy(state),start=0;
 const name=(id:string)=>battle.opening.units.find((unit:any)=>unit.id===id)?.name??battle.closing.units.find((unit:any)=>unit.id===id)?.name??id;
 const stateAt=(value:any)=>value===null?{known:false,reason:'留存回执缺少中途状态变化，不能从最终状态倒推'}:{known:true,scope:'已记录的单位数值与行动条件；状态及区域生命周期仍按本段动作顺序',...copy(value)};
 const finish=(end:number,reasons:string[])=>{
  const actions=rows.slice(start,end+1),first=actions[0],last=actions.at(-1);
  phases.push({index:phases.length+1,actionRange:{first:first.sequence,last:(last.sourceSequences??[last.sequence]).at(-1)},roundRange:{first:first.round,last:last.round},
   sourceSequences:actions.flatMap(a=>a.sourceSequences??[a.sequence]),endingReasons:reasons,opening:stateAt(opening),closing:stateAt(state)});
  start=end+1;opening=copy(state);
 };
 let rawIndex=0;
 for(const [index,action] of rows.entries()){
  const reasons:string[]=[],sequences=action.sourceSequences??[action.sequence];
  const recorded=recordedLifecycle.slice(rawIndex,rawIndex+sequences.length).every(value=>value===true)&&rawIndex+sequences.length<=recordedLifecycle.length;
  rawIndex+=sequences.length;
  if(!recorded)state=null;
  for(const change of action.stateChanges??[]){
   if(state){
    let unit=state.units.find((u:any)=>u.id===change.subjectId);
    if(!unit){unit={id:change.subjectId,name:name(change.subjectId),values:{}};state.units.push(unit);}
    unit.values[change.field]=copy(change.after);
   }
   if(turningFields.has(change.field))reasons.push(`${name(change.subjectId)}的${change.field}改变`);
   else if(['生命','魂力','护盾'].includes(change.field)){
    if(change.after>change.before)reasons.push(`${name(change.subjectId)}的${change.field}恢复或增加`);
    else if(change.after===0&&change.before>0)reasons.push(`${name(change.subjectId)}的${change.field}耗尽`);
   }
  }
  for(const event of action.statusLifecycle??[])if(!['开始计时','持续时间减少'].includes(event.event))reasons.push(`${name(event.subjectId)}：${event.event}`);
  for(const event of action.fieldLifecycle??[])if(!['开始计时','持续时间减少'].includes(event.event))reasons.push(event.event);
  for(const event of action.statusEvents??[])if(['状态结束','维持中断','持续区域到期消失','领域结束','领域对抗后的生效状态','武魂真身结束','召唤单位的继承技能已撤销','召唤单位持续时间结束'].includes(event.meaning))reasons.push(event.meaning);
  for(const target of action.results??[])if(target.defeated===true)reasons.push(`${name(target.targetId)}被击败`);
  if(action.action==='防御')reasons.push(`${name(action.actor.id)}转入防御`);
  if(action.martialSoulSwitch)reasons.push('切换武魂');
  if(action.retreatAssist)reasons.push('协助撤退');
  if(action.escape)reasons.push('尝试脱离战斗');
  if(action.surrender)reasons.push('投降结算');
  if(action.stage)reasons.push(action.stage);
  if(action.battleResult)reasons.push('战斗终结');
  if(eventEnds.has(sequences.at(-1)))reasons.push('当前事件经过结束');
  if(index===rows.length-1){
   const closing=snapshot(battle.closing);
   if(state)for(const unit of closing.units){const previous=state.units.find((u:any)=>u.id===unit.id);if(previous)Object.assign(previous.values,unit.values);else state.units.push(unit);}
   else state=closing;
   reasons.push(battle.status==='已结束'?'留存战斗结束':'当前留存交锋结束');
  }
  if(reasons.length)finish(index,[...new Set(reasons)]);
 }
 return {scope:'按实际变化划分的连续动作阶段，保留全部动作顺序；中途检查点不包含赛后恢复',
  phases,openingOnly:rows.length===0?{opening:stateAt(snapshot(battle.opening)),closing:stateAt(snapshot(battle.closing)),settlement:battle.openingSettlement}:null,
  aftermath:battle.aftermath?{stage:'战斗终结之后的独立结算',facts:copy(battle.aftermath)}:null};
}
