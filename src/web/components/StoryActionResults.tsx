import React from 'react';
import {receiptSummary,materialName,playerText} from '../../runtime/player-text';
import type {StoryStepResult} from '../../runtime/story-turns';

const labels:Record<StoryStepResult['status'],string>={succeeded:'已完成',failed:'未成功',skipped:'未执行',described:'观察或交流',clarify:'待澄清'};

function HarvestDetails({receipt}:{receipt:Record<string,any>}){
 const harvests=receipt.type==='expedition-beast-harvested'?[receipt]:
  receipt.type==='expedition-beasts-harvested'&&Array.isArray(receipt.results)?receipt.results.filter(r=>r?.type==='expedition-beast-harvested'):[];
 if(!harvests.length)return null;
 return <div>
  <p>本次采集所得（暂存于本次探索）：</p>
  <ul>{harvests.flatMap((harvest,targetIndex)=>(Array.isArray(harvest.batches)?harvest.batches:[]).map((batch:Record<string,any>,batchIndex:number)=>
   <li key={`${targetIndex}:${batchIndex}`}>
    {materialName(batch,undefined)} × {batch.quantity} 份
    {batch.quality&&<> · 品质：{batch.quality}</>}
    {typeof batch.value==='number'&&Number.isFinite(batch.value)&&<> · 本批基准价值：{batch.value} 金币</>}
   </li>))}</ul>

 </div>;
}

/** Keep the settled result readable even when no novel could be saved. */
export default function StoryActionResults({results,expanded=false}:{results:StoryStepResult[];expanded?:boolean}){
 if(!results.length)return null;
 return <details className="story-action-results" open={expanded}>
  <summary>查看行动结果</summary>
  <ol>{results.map(result=>{
   const completed=result.status==='succeeded';
   const summary=completed&&result.receipt?receiptSummary('story.action',result.receipt,undefined):null;
   return <li key={result.step}>
    <strong>{labels[result.status]}</strong>
    {summary&&<p>{summary}</p>}
    {completed&&result.receipt&&<HarvestDetails receipt={result.receipt}/>}
    {result.receipt?.type==='party-message-sent'&&<ul aria-label="队伍消息送达情况">{result.receipt.message.audience.map((p:any)=><li key={p.personId}>{p.name} · {p.delivered?'已送达':p.reason}</li>)}</ul>}
    {result.reason&&<p>{playerText(result.reason,undefined)}</p>}
    <details><summary>对应的原话</summary><p className="story-chat__input">{result.source}</p></details>
   </li>;
  })}</ol>
 </details>;
}
