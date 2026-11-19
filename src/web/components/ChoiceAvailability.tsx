import {useState} from 'react';

export interface ChoiceAvailabilityReport {
  requestedCount:number;
  actualCount:number;
  summary:string;
  details:string[];
}

export default function ChoiceAvailability({requestedCount,actualCount,explain,report}:{
  requestedCount:number;actualCount:number;explain?:()=>ChoiceAvailabilityReport|Promise<ChoiceAvailabilityReport>;report?:ChoiceAvailabilityReport;
}){
  const [inspection,setInspection]=useState<ChoiceAvailabilityReport|null>(null);
  const [failed,setFailed]=useState(false);
  const [loading,setLoading]=useState(false);
  if(!actualCount||actualCount>=requestedCount)return null;
  const details=report??inspection;
  return <details className="choice-availability" data-testid="choice-availability" onToggle={event=>{
    if(event.currentTarget.open&&!details&&!loading&&explain){
      setLoading(true);setFailed(false);
      void Promise.resolve().then(explain).then(setInspection,()=>setFailed(true)).finally(()=>setLoading(false));
    }
  }}>
    <summary>本次可选 {actualCount} / {requestedCount} 个方案 <span>查看数量不足的原因</span></summary>
    <div>{details?.details.map((text,index)=><p key={index}>{text}</p>)}
      {loading&&<p role="status">正在核对候选条件…</p>}
      {failed&&<p role="status">暂时无法核对全部原因。现有方案仍保留，重新打开说明可以重试。</p>}
    </div>
  </details>;
}
