/** Ordered resource paths shared by the account and audit phase view. A reversal
 * or missing interval stays visible; matching endpoints never imply no damage. */
export function storyBattleResourceCourse(rows:any[],display:(id:string)=>string){
 const lines:string[]=[];
 const paths=new Map<string,{id:string;field:string;changes:any[]}>();
 for(const row of rows)for(const c of row.stateChanges??[]){
  if(!['生命','魂力','护盾'].includes(c.field)||!Number.isFinite(c.before)||!Number.isFinite(c.after)||c.before===c.after)continue;
  const key=JSON.stringify([c.subjectId,c.field]);
  const path=paths.get(key)??{id:c.subjectId,field:c.field,changes:[] as any[]};
  path.changes.push({...c,sequence:row.sequence});paths.set(key,path);
 }
 for(const path of paths.values()){
  // Preserve reversals and gaps: a loss followed by recovery is not "unchanged".
  const runs:any[][]=[];
  for(const c of path.changes){
   const previous=runs.at(-1)?.at(-1);
   if(previous&&previous.after===c.before&&Math.sign(previous.after-previous.before)===Math.sign(c.after-c.before))runs.at(-1)!.push(c);
   else runs.push([c]);
  }
  const descriptions=runs.map(run=>{
   const first=run[0],last=run.at(-1),range=first.sequence===last.sequence?`第${first.sequence}项`:`第${first.sequence}至${last.sequence}项`;
   const values=run.length<=4?[first.before,...run.map(c=>c.after)].join('→'):`${first.before}逐次${last.after>first.before?'升':'降'}至${last.after}（${run.length}次变化）`;
   return `${range}：${values}`;
  });
  lines.push(`${display(path.id)}的${path.field}经过：${descriptions.join('；随后')}。`);
 }
 return {lines,changedSubjects:new Set([...paths.values()].map(path=>JSON.stringify([path.id,path.field])))};
}

/** Audit phase reading. The author reads the same resource paths beside the
 * corresponding ordered account, not this second parallel progression. */
export function storyBattlePhaseAccount(battle:any,phase:any,rows:any[],display:(id:string)=>string){
 const lines:string[]=[`第${phase.roundRange.first}至${phase.roundRange.last}回合，第${phase.actionRange.first}至${phase.actionRange.last}项已结算行动。`];
 const results=new Map<string,{text:string;count:number}>();
 for(const row of rows){
  for(const result of row.results??[]){
   if(typeof result.statement!=='string')throw Error('阶段经过缺少实际目标结算说明');
   const effects=[...new Set<string>((result.effects??[]).filter((effect:any)=>effect.results?.length&&typeof effect.name==='string').map((effect:any)=>effect.name))];
   const text=result.statement+(effects.length?`；已记录的效果结算：${effects.join('、')}`:'');
   const key=JSON.stringify([row.actor.id,row.skill?.reference,result.targetId,result.branchId,result.sourceUnitId,result.sourceSkillId,result.domainId,result.trigger,text]);
   const existing=results.get(key);
   if(existing)existing.count+=(row.sourceSequences??[row.sequence]).length;
   else results.set(key,{text,count:(row.sourceSequences??[row.sequence]).length});
  }
 }
 if(results.size)lines.push('本阶段按施展者与对象汇总，以下各组的回合范围可以重叠：',...[...results.values()].map(r=>`${r.text}（${r.count}次目标结算）。`));
 const resources=storyBattleResourceCourse(rows,display);lines.push(...resources.lines);
 const complete=battle.completeFromStart===true&&Number.isSafeInteger(battle.evidenceCoverage?.actions)&&battle.evidenceCoverage.actions===battle.evidenceCoverage.stateLifecycle;
 if(complete&&phase.opening.known&&phase.closing.known){
  const active=new Set(rows.flatMap(row=>[row.actor.id,...(row.results??[]).map((r:any)=>r.targetId)]));
  for(const unit of phase.opening.units){
   const hp=unit.values['生命'],end=phase.closing.units.find((u:any)=>u.id===unit.id)?.values['生命'];
   if(active.has(unit.id)&&Number.isFinite(hp)&&hp===end&&!resources.changedSubjects.has(JSON.stringify([unit.id,'生命'])))
    lines.push(`${display(unit.id)}在这一阶段生命保持${hp}，没有新增生命损失或恢复。`);
  }
 }
 for(const row of rows){
  if(row.itemUse?.statement)lines.push(`第${row.sequence}项，${row.itemUse.statement}。`);
  if(row.stage)lines.push(`第${row.sequence}项，${display(row.actor.id)}：${row.stage}。`);
 }
 return lines.join('\n');
}
