import {storyBattleCheckpointSummary} from './story-battle-conclusion';
import {scalarBattleChangesReading,battleActionConditionsReading} from './story-battle-action-reading';
import {battleLifecycleReading} from './story-battle-lifecycle-reading';
import {storyBattlePhaseAccount} from './story-battle-phase-account';

const pivotal=new Set(['存活状态','参战状态','实际行动限制','持有技能','锁定魂力','每回合维持魂力']);
/** The narrative backbone of existing phases, independent of request capacity.
 * Every phase refers to the same original actions and checkpoints; no simulation,
 * future-state interpolation or prose-specific game flags are introduced. */
export function compileStoryBattleCourse(battle:any,process:any){
 const units=new Map<string,any>([...battle.opening.units,...battle.closing.units].map((u:any)=>[u.id,u]));
 const display=(id:string)=>{const name=units.get(id)?.name??id;return [...units.values()].filter(u=>u.name===name).length>1?`${name}（${id}）`:name;};
 const phases=process.phases.map((phase:any)=>{
  const selected=new Set<number>(phase.sourceSequences);
  const rows=battle.actions.filter((a:any)=>(a.sourceSequences??[a.sequence]).some((s:number)=>selected.has(s)));
  const covered=rows.flatMap((a:any)=>a.sourceSequences??[a.sequence]);
  if(JSON.stringify(covered)!==JSON.stringify(phase.sourceSequences))throw Error('战斗主线与阶段动作来源不一致');
  const turns=rows.flatMap((a:any)=>{
   const lines:string[]=[];
   if(a.stage)lines.push(`${display(a.actor.id)}：${a.stage}。`);
   for(const change of a.stateChanges??[]){
    if(!pivotal.has(change.field)&&!(['生命','魂力','护盾'].includes(change.field)&&(change.after>change.before||change.after===0&&change.before>0)))continue;
    const reading=scalarBattleChangesReading([change],display);
    if(reading)lines.push(...reading);
    else if(change.field==='实际行动限制'){
     const description=battleActionConditionsReading(change.after,'变化后');
     lines.push(`${display(change.subjectId)}的行动条件已改变${description?`：${description}`:'，具体条件保留于该项实际变化记录'}。`);
    }else lines.push(`${display(change.subjectId)}的${change.field}发生变化，具体内容保留于该项实际变化记录。`);
   }
   const lifecycle=battleLifecycleReading(a,display);
   if(lifecycle)for(const event of lifecycle)if(!['开始计时','持续时间减少'].includes(event.event))lines.push(event.statement);
   for(const result of a.results??[])if(result.defeated)lines.push(`${display(a.actor.id)}的本次行动结算：${result.statement??`${display(result.targetId)}被击败`}。`);
   if(a.action==='防御')lines.push(`${display(a.actor.id)}的本次记录为防御。`);
   if(a.martialSoulSwitch)lines.push(`${display(a.actor.id)}在本次记录中切换武魂。`);
   if(a.retreatAssist)lines.push(`${display(a.actor.id)}在本次记录中协助撤退。`);
   if(a.escape)lines.push(`${display(a.actor.id)}在本次记录中尝试脱离战斗，结果见同项结算。`);
   if(a.surrender)lines.push(`${display(a.actor.id)}在本次记录中作出投降结算。`);
   if(a.battleResult)lines.push('本次结算结束了战斗。');
   if(lines.length)for(const result of a.actualOutcomes??[])if(typeof result==='string')lines.push(result);else if(typeof result.statement==='string')lines.push(result.statement);
   return lines.length?[{sequence:a.sequence,actorId:a.actor.id,statement:[...new Set(lines)].join('\n')}]:[];
  });
  return {index:phase.index,actionRange:structuredClone(phase.actionRange),roundRange:structuredClone(phase.roundRange),sourceSequences:structuredClone(phase.sourceSequences),
   statement:storyBattlePhaseAccount(battle,phase,rows,display),
   opening:storyBattleCheckpointSummary(phase.opening,'这一阶段开始时'),turns,endingReasons:structuredClone(phase.endingReasons),closing:storyBattleCheckpointSummary(phase.closing,'这一阶段结束时')};
 });
 return {scope:'原始证据中的连续阶段索引与检查点；写作资料在account中按实际经过集中编译',phases,
  ...(process.openingOnly?{openingOnly:storyBattleCheckpointSummary(process.openingOnly.opening,'留存起点')+'\n'+storyBattleCheckpointSummary(process.openingOnly.closing,'留存终点')}:{})};
}
