import {useRef,useState} from 'react';
import {useGame,useGameController} from '../game-context';
import {useSceneQuery} from '../use-game-query';
import {describeError} from '../error-text';
import {Button} from '../components';
import QueryStatus from './QueryStatus';

type Quote={steps:number;score:number;spent:number};
type GrowthPlan={sourceKey:string;available:number;attributes:{attribute:string;base:number;options:Quote[]}[]};

function AllocationDraft({facts,disabled}:{facts:GrowthPlan;disabled:boolean}){
 const controller=useGameController(),[draft,setDraft]=useState<Record<string,number>>({}),[submitting,setSubmitting]=useState(false),[error,setError]=useState(''),inFlight=useRef(false);
 const selected=(row:GrowthPlan['attributes'][number])=>row.options[draft[row.attribute]??0];
 const spent=facts.attributes.reduce((total,row)=>total+selected(row).spent,0),remaining=facts.available-spent,locked=disabled||submitting;
 const change=(attribute:string,steps:number)=>{setError('');setDraft(current=>({...current,[attribute]:steps}));};
 async function confirm(){
  if(locked||inFlight.current||!spent)return;
  inFlight.current=true;setSubmitting(true);setError('');
  try{
   await controller.dispatch('growth.allocate-batch',{sourceKey:facts.sourceKey,allocations:facts.attributes.filter(row=>draft[row.attribute]>0).map(row=>({attribute:row.attribute,steps:draft[row.attribute]}))});
   setDraft({});
  }catch(reason){setError(describeError(reason));}
  finally{inFlight.current=false;setSubmitting(false);}
 }
 return <div className="growth-allocation" aria-label="属性分配方案">
  <p className="muted">先调整分配，确认后统一生效。</p>
  <div className="growth-allocation-grid">{facts.attributes.map(row=>{
   const quote=selected(row),steps=draft[row.attribute]??0,next=row.options[steps+1],canAdd=!!next&&next.spent-quote.spent<=remaining;
   return <div className={steps?'is-drafted':''} key={row.attribute}>
    <span>{row.attribute}</span><strong>{row.base}{steps>0&&<> → {quote.score}</>}</strong>
    <div className="growth-allocation-controls">
     <Button variant="ghost" aria-label={`减少${row.attribute}`} disabled={locked||steps===0} onClick={()=>change(row.attribute,steps-1)}>−</Button>
     <output aria-label={`${row.attribute}拟增加`}>+{steps}</output>
     <Button variant="ghost" aria-label={`增加${row.attribute}`} disabled={locked||!canAdd} data-testid={`allocate-${row.attribute}`} onClick={()=>change(row.attribute,steps+1)}>＋</Button>
    </div>
    <small>{steps?`消耗 ${quote.spent} 点`:row.base>=99?'已达上限':'尚未分配'}</small>
   </div>;
  })}</div>
  {error&&<p role="alert">{error}</p>}
  <div className="growth-allocation-footer">
   <p aria-live="polite">可用 <strong>{facts.available}</strong> 点 · 本次消耗 <strong>{spent}</strong> 点 · 剩余 <strong>{remaining}</strong> 点</p>
   <div><Button variant="ghost" disabled={locked||!spent} onClick={()=>{setDraft({});setError('');}}>重置分配</Button><Button disabled={locked||!spent} onClick={()=>void confirm()}>{submitting?'正在确认…':'确认加点'}</Button></div>
  </div>
 </div>;
}

export default function GrowthAllocation(){
 const {view}=useGame(),query=useSceneQuery<GrowthPlan>('presentation.growth-plan');
 return <><QueryStatus query={query}/>{query.data&&<AllocationDraft key={`${view.sessionId}:${query.data.sourceKey}`} facts={query.data} disabled={view.busy||query.loading||!!query.error}/>}</>;
}
