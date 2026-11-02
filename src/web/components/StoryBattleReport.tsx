import {useState} from 'react';
import type {StoryStepResult} from '../../runtime/story-turns';
import './story-battle-report.css';

export function BattleActionJudgments({action}:{action:any}){return <details><summary>查看判定过程</summary>{(action.judgments??[]).map((section:any,index:number)=><div key={index}><strong>{section.title}</strong><ul>{section.lines.map((line:string,i:number)=><li key={i}>{line}</li>)}</ul></div>)}</details>;}

export function StoryBattleReports({results,battleId}:{results:StoryStepResult[];battleId?:string}){
 return <>{results.filter(r=>r.status==='succeeded'&&r.receipt?.report&&(!battleId||r.receipt.report.id===battleId)).map(r=><StoryBattleReport key={r.step} report={r.receipt!.report}/>)}</>;
}

export default function StoryBattleReport({report,expanded=false}:{report:any;expanded?:boolean}){
 const [shown,setShown]=useState(20);
 const opening=report.opening?.units??[],closing=report.closing?.units??[],actions=report.actions??[];
 const ids=[...new Set<string>([...opening,...closing].map((u:any)=>u.id))];
 return <section className="story-battle-report" aria-label="战报">
  <details open={expanded}><summary>战况总览 · {report.status==='已结束'?(report.outcome?.outcome??'已结束'):'进行中'} · {actions.length} 次行动</summary>
   {!report.completeFromStart&&<p>此记录从战斗中途开始，仅展示已记录的部分。</p>}
   {report.outcome?.outcome==='敌方逃散'&&<p>对手已离开战场；这不是击倒或抓捕记录。可展开末尾行动查看撤退判定。</p>}
   {report.aftermath?.summary&&<p>{report.aftermath.summary}</p>}
   <p>第 {report.opening?.round} 至 {report.closing?.round} 回合 · 显示交战时的数值；战利品请在战后领取。</p>
   <div className="story-battle-report__table"><table><caption>参战者起止状态</caption><thead><tr><th>人物</th><th>生命</th><th>魂力</th><th>结束状态</th></tr></thead><tbody>
    {ids.map(id=>{const before=opening.find((u:any)=>u.id===id),after=closing.find((u:any)=>u.id===id);return <tr key={id}><th scope="row">{after?.name??before?.name}</th><td>{before?`${before.hp}/${before.hpMax}`:'未记录'} → {after?`${after.hp}/${after.hpMax}`:'未记录'}</td><td>{before?`${before.sp}/${before.spMax}`:'未记录'} → {after?`${after.sp}/${after.spMax}`:'未记录'}</td><td>{after?.life??'未记录'}{after?.shield>0&&` · 护盾 ${after.shield}`}{after?.statuses?.length>0&&` · ${after.statuses.map((s:any)=>s.name).join('、')}`}</td></tr>;})}
   </tbody></table></div>
  </details>
  <details><summary>行动与判定 · {actions.length} 条</summary>
   {actions.slice(0,shown).map((action:any)=><div className="story-battle-report__action" key={action.id}><small>第 {action.round} 回合 · 行动 {action.sequence}</small><p>{action.summary??'此行动未保存展示摘要'}</p><BattleActionJudgments action={action}/></div>)}
   {shown<actions.length&&<button type="button" onClick={()=>setShown(n=>n+20)}>读取后续行动（剩余 {actions.length-shown} 条）</button>}
  </details>
 </section>;
}
