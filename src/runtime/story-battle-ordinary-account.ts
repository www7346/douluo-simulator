import {hitInterferenceReading} from './hit-interference-reading';
const only=(v:any,keys:string[])=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>keys.includes(k));

/** Equivalent prose for an already aggregated interval, not a new combat simulation.
 * Unknown fields keep the structured record in the writing view instead of being discarded. */
export function ordinaryBattleAccountStatement(value:{exchanges:any[];resources:any[];recordedValues:any[];actualDescriptions:any[]}):string|null{
 const {exchanges,resources,recordedValues,actualDescriptions}=value;
 if(![exchanges,resources,recordedValues,actualDescriptions].every(Array.isArray))return null;
 const count=(v:any)=>Number.isSafeInteger(v)&&v>=0;
 const observation=(v:any,first:boolean)=>only(v,first?['sequence','round','before','after']:['sequence','round','after'])
  &&Number.isSafeInteger(v.sequence)&&v.sequence>0&&Number.isSafeInteger(v.round)&&v.round>0&&Number.isFinite(v.after)
  &&(!first||v.before===null||Number.isFinite(v.before));
 if(exchanges.some(g=>!only(g,['actorId','actorName','targetId','targetName','skill','sourceSequences','rounds','count','hit','miss','checkUnknown','affected','notAffected','affectedUnknown','checks','totals','outcomeKinds'])
  ||!['actorId','actorName','targetId','targetName'].every(k=>typeof g[k]==='string')
  ||!['count','hit','miss','checkUnknown','affected','notAffected','affectedUnknown'].every(k=>count(g[k]))
  ||!Array.isArray(g.sourceSequences)||g.sourceSequences.some((n:any)=>!Number.isSafeInteger(n)||n<1)
  ||!only(g.skill,['reference','name','soulPowerCost','castRank','sourceReading'])||typeof g.skill.name!=='string'||typeof g.skill.reference!=='string'
  ||g.skill.sourceReading!==undefined&&typeof g.skill.sourceReading!=='string'
  ||['soulPowerCost','castRank'].some(k=>g.skill[k]!==undefined&&!Number.isFinite(g.skill[k]))
  ||!only(g.rounds,['first','last'])||!count(g.rounds.first)||!count(g.rounds.last)
  ||!g.totals||typeof g.totals!=='object'||Array.isArray(g.totals)||Object.values(g.totals).some(v=>!Number.isFinite(v))
  ||!Array.isArray(g.outcomeKinds)||g.outcomeKinds.some((v:any)=>typeof v!=='string')
  ||!Array.isArray(g.checks)||g.checks.some((c:any)=>!only(c,['result','count'])||!count(c.count)||c.result!==null&&!only(c.result,['type','mode','attribute','hit','saved','success','critical','successEffect','interference']))))return null;
 if(resources.some(r=>!only(r,['actorId','name','beforeFirstAction','afterLastAction','paid'])||typeof r.actorId!=='string'||!['beforeFirstAction','afterLastAction','paid'].every(k=>Number.isFinite(r[k])))
  ||recordedValues.some(r=>!only(r,['subjectId','name','field','firstObservation','lastObservation','minimum','maximum'])||typeof r.subjectId!=='string'||typeof r.field!=='string'
   ||!observation(r.firstObservation,true)||!observation(r.lastObservation,false)||r.firstObservation.sequence>r.lastObservation.sequence||!['minimum','maximum'].every(k=>Number.isFinite(r[k])))
  ||actualDescriptions.some(r=>!only(r,['actorId','text'])||typeof r.actorId!=='string'||typeof r.text!=='string'))return null;
 const names=new Map<string,string>();
 for(const g of exchanges){names.set(g.actorId,g.actorName??g.actorId);names.set(g.targetId,g.targetName??g.targetId);}
 for(const r of resources)names.set(r.actorId,r.name??r.actorId);
 for(const r of recordedValues)names.set(r.subjectId,r.name??r.subjectId);
 const display=(id:string)=>{const name=names.get(id)??id;return [...names.values()].filter(n=>n===name).length>1?`${name}（${id}）`:name;};
 const lines:string[]=[];
 const actorIds=[...new Set(exchanges.map(g=>g.actorId))];
 if(actorIds.length)lines.push(`这段已结算交锋的行动者：${actorIds.map(display).join('、')}。`);
 // The last observed value can precede the end of this interval. Retain the
 // actual observation's time; a sparse effect receipt is not an end-state.
 for(const r of recordedValues){
  const first=r.firstObservation,last=r.lastObservation,at=(v:any)=>`第${v.round}回合第${v.sequence}项`;
  lines.push(`${display(r.subjectId)}的${r.field}记录：首次${at(first)}，该次前值${first.before===null?'未记录':first.before}、后值${first.after}；最后记录${at(last)}后值${last.after}；已记录数值范围${r.minimum}至${r.maximum}。`);
 }
 // Branch/effect shape can separate hits from misses in the evidence. Combine
 // only identical actor/target/cast records for reading the SAME interval;
 // retain check variants, consequence kinds, totals and every source sequence.
 const courses=new Map<string,any>();
 for(const source of exchanges){
  const key=JSON.stringify([source.actorId,source.targetId,source.skill]);let course=courses.get(key);
  if(!course){courses.set(key,structuredClone(source));continue;}
  course.sourceSequences.push(...source.sourceSequences);course.sourceSequences.sort((a:number,b:number)=>a-b);
  course.rounds.first=Math.min(course.rounds.first,source.rounds.first);course.rounds.last=Math.max(course.rounds.last,source.rounds.last);
  for(const field of ['count','hit','miss','checkUnknown','affected','notAffected','affectedUnknown'])course[field]+=source[field];
  for(const [field,amount] of Object.entries(source.totals))course.totals[field]=(course.totals[field]??0)+(amount as number);
  course.outcomeKinds=[...new Set([...course.outcomeKinds,...source.outcomeKinds])];
  for(const check of source.checks){const prior=course.checks.find((c:any)=>JSON.stringify(c.result)===JSON.stringify(check.result));if(prior)prior.count+=check.count;else course.checks.push(structuredClone(check));}
 }
 const uses=new Map<string,{header:string;records:string[]}>();
 if(courses.size>1)lines.push('以下各组是同一连续时段内交错发生的交锋，分别按行动者和对象合计：');
 for(const g of courses.values()){
  const cast=[g.skill.castRank===undefined?null:`施放阶位${g.skill.castRank}`,g.skill.soulPowerCost===undefined?null:`单次规则消耗${g.skill.soulPowerCost}魂力`].filter(Boolean).join('，');
  const key=JSON.stringify([g.actorId,g.targetId,g.skill]);
  let use=uses.get(key);
  if(!use){use={header:`${display(g.actorId)}以${g.skill.name}〔${g.skill.reference}〕${cast?`（${cast}）`:''}作用于${display(g.targetId)}${g.skill.sourceReading?`；${g.skill.sourceReading}`:''}：`,records:[]};uses.set(key,use);}
  const text=[`第${g.rounds.first}至${g.rounds.last}回合`];
  // These totals describe already settled outcomes of THIS actor/target
  // course. In particular zero life damage is a result, not an omitted value.
  const effectLabels:Record<string,string>={结算生命伤害:'实际生命伤害合计',护盾承担伤害:'护盾实际承担合计',装备减伤:'装备实际减伤合计',实际新增护盾:'实际新增护盾合计',提供护盾:'各次提供护盾参数合计',实际恢复生命:'实际恢复生命合计',实际恢复魂力:'实际恢复魂力合计'};
  if(Object.keys(g.totals).length)text.push(`${display(g.targetId)}承受这些行动的实际结果：`+Object.entries(g.totals).map(([k,v])=>
   k==='结算生命伤害'&&v===0?'没有造成生命伤害（合计0）':`${effectLabels[k]??k+'累计'}${v}`).join('，'));
  text.push(`${g.count}次目标结算，命中${g.hit}次、未命中${g.miss}次${g.checkUnknown?`、未记录命中判定${g.checkUnknown}次`:''}；分支生效${g.affected}次、未生效${g.notAffected}次${g.affectedUnknown?`、未记录生效判定${g.affectedUnknown}次`:''}`);
  if(g.outcomeKinds.length)text.push(`实际后果种类：${g.outcomeKinds.join('、')}`);
  // Hit counts are above. Other check results may explain partial success and remain explicit.
  const labels:Record<string,string>={type:'判定类型',mode:'判定方式',attribute:'判定属性',saved:'豁免成功',success:'检定成功',critical:'重击',successEffect:'成功效果'};
  for(const c of g.checks){
   const results=[...Object.entries(c.result??{}).filter(([k])=>k!=='hit'&&k!=='interference').map(([k,v])=>`${labels[k]}=${typeof v==='object'?JSON.stringify(v):v===true?'是':v===false?'否':v}`),...hitInterferenceReading(c.result)];
   if(results.length)text.push(`${c.count}次判定记录：${results.join('，')}`);
  }
  text.push(`对应第${g.sourceSequences.join('、')}项`);
  use.records.push(text.join('；')+'。');
 }
 for(const use of uses.values())lines.push(use.header,...use.records);
 for(const r of resources)lines.push(`${display(r.actorId)}在本段首次行动前魂力${r.beforeFirstAction}、最后一次行动后魂力${r.afterLastAction}，累计实际支付${r.paid}魂力。`);
 const descriptions=new Map<string,string[]>();
 for(const d of actualDescriptions){const texts=descriptions.get(d.actorId)??[];texts.push(d.text);descriptions.set(d.actorId,texts);}
 for(const [actorId,texts] of descriptions)lines.push(`${display(actorId)}相关的补充结算记录：${texts.join('；')}。`);
 return lines.join('\n');
}
