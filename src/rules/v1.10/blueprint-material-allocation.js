(function attachBlueprintMaterials(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.SoulBlueprintMaterials=api;
})(typeof globalThis!=='undefined'?globalThis:this,function createBlueprintMaterials(){
  'use strict';

  function blueprintMaterialUpperBound(records, requiredValue, fullMask, clauseCount) {
    if (!records.length) return 0;
    const totalUnits=records.reduce((sum,record)=>sum+record.quantity,0);
    let upper = Math.min(totalUnits,Math.floor(records.reduce((sum,record)=>sum + record.unitValue*record.quantity,0)/requiredValue));
    for (let index=0; index<clauseCount; index+=1) {
      const bit = 1 << index;
      upper = Math.min(upper,records.reduce((sum,record)=>sum + (record.mask & bit ? record.quantity : 0),0));
    }
    if (fullMask && !records.some(record=>record.mask)) return 0;
    return Math.max(0,upper);
  }

  function batchPlanIsMinimal(plan, records, requiredValue, fullMask) {
    for (let index=0; index<plan.counts.length; index+=1) {
      if (plan.counts[index] < 1) continue;
      const value = plan.value-records[index].unitValue;
      if (value < requiredValue) continue;
      let mask=0;
      for (let cursor=0; cursor<plan.counts.length; cursor+=1) {
        const quantity=plan.counts[cursor]-(cursor===index?1:0);
        if (quantity>0) mask |= records[cursor].mask;
      }
      if (mask === fullMask) return false;
    }
    return true;
  }

  function* blueprintBatchCandidates(records, requiredValue, fullMask, clauseCount, reserveCount) {
    const suffixValue=Array(records.length+1).fill(0);
    const suffixMask=Array(records.length+1).fill(0);
    for(let index=records.length-1;index>=0;index-=1){
      suffixValue[index]=suffixValue[index+1]+records[index].unitValue*records[index].quantity;
      suffixMask[index]=suffixMask[index+1]|records[index].mask;
    }
    const counts=Array(records.length).fill(0);
    function* visit(index,value,mask,units){
      if(value>=requiredValue&&mask===fullMask){
        const plan={counts:[...counts],value,units};
        if(!batchPlanIsMinimal(plan,records,requiredValue,fullMask))return;
        const remaining=records.map((record,cursor)=>({...record,quantity:record.quantity-plan.counts[cursor]}));
        if(blueprintMaterialUpperBound(remaining,requiredValue,fullMask,clauseCount)<reserveCount)return;
        yield plan;
        return;
      }
      if(index>=records.length||value+suffixValue[index]<requiredValue||(mask|suffixMask[index])!==fullMask)return;
      const record=records[index];
      const missingValue=Math.max(0,requiredValue-value);
      const bridgeNeeded=(mask|record.mask)!==mask;
      const maximum=Math.min(record.quantity,Math.max(bridgeNeeded?1:0,Math.ceil(missingValue/record.unitValue)));
      for(let quantity=0;quantity<=maximum;quantity+=1){
        counts[index]=quantity;
        yield* visit(index+1,value+quantity*record.unitValue,quantity>0?mask|record.mask:mask,units+quantity);
      }
      counts[index]=0;
    }
    yield* visit(0,0,0,0);
  }

  function blueprintBatchPlanIsBetter(next,current){
    if(!current)return true;
    if(next.quantity!==current.quantity)return next.quantity>current.quantity;
    if(next.consumedValue!==current.consumedValue)return next.consumedValue<current.consumedValue;
    if(next.units!==current.units)return next.units<current.units;
    // The old eager search visited sorted batches and retained its first tied
    // plan. Compare that same sequence explicitly so lazy enumeration is exact.
    for(let a=next,b=current;a?.batch&&b?.batch;a=a.tail,b=b.tail){
      const order=a.batch.value-b.batch.value||a.batch.units-b.batch.units||JSON.stringify(a.batch.counts).localeCompare(JSON.stringify(b.batch.counts));
      if(order)return order<0;
    }
    return false;
  }

  // A fast result is accepted only with a lower-bound optimality certificate.
  // Otherwise the existing complete search remains authoritative.
  function minimumBlueprintBatch(records,requiredValue,fullMask,clauseCount){
   const cap=requiredValue+Math.max(...records.map(r=>r.unitValue))*Math.max(1,clauseCount);
   // The JSON count vector is the existing locale-aware tie breaker. Keep its text
   // as the DP path rather than serializing both competing arrays at every collision.
   let states=new Map([[0,{value:0,mask:0,units:0,path:'[]'}]]);
   for(const record of records){
    const next=new Map();
    for(const plan of states.values()){
     const prefix=plan.path==='[]'?'[':plan.path.slice(0,-1)+',';
     const maximum=Math.min(record.quantity,Math.floor((cap-plan.value)/record.unitValue));
     for(let count=0;count<=maximum;count++){
      const value=plan.value+record.unitValue*count,mask=count?plan.mask|record.mask:plan.mask,units=plan.units+count,key=value*(fullMask+1)+mask;
      const previous=next.get(key);
      if(previous&&previous.units<units)continue;
      const path=prefix+count+']';
      if(previous&&previous.units===units&&previous.path.localeCompare(path)<=0)continue;
      next.set(key,{value,mask,units,path});
     }
    }
    states=next;
   }
   const best=[...states.values()].filter(p=>p.value>=requiredValue&&p.mask===fullMask).sort((a,b)=>a.value-b.value||a.units-b.units||a.path.localeCompare(b.path))[0];
   return best?{value:best.value,mask:best.mask,units:best.units,counts:JSON.parse(best.path)}:null;
  }
  function certifiedBlueprintBatchPlan(records,requiredValue,fullMask,clauseCount,target,maximumOnly=false){
   if(!records.length||!Number.isInteger(target)||target<1||target>64||fullMask>1023)return null;
   const maxValue=Math.max(...records.map(r=>r.unitValue));
   if(requiredValue+maxValue*Math.max(1,clauseCount)>4096)return null;
   const independent=maximumOnly?null:minimumBlueprintBatch(records.map(r=>({...r,quantity:Math.ceil((requiredValue+maxValue*Math.max(1,clauseCount))/r.unitValue)})),requiredValue,fullMask,clauseCount);
   if(!maximumOnly&&!independent)return null;
   const remaining=records.map(r=>({...r})),batches=[];
   for(let index=0;index<target;index++){
    const batch=minimumBlueprintBatch(remaining,requiredValue,fullMask,clauseCount);if(!batch)return null;
    batches.push(batch);batch.counts.forEach((count,index)=>remaining[index].quantity-=count);
   }
   const plan={quantity:target,batches,consumedValue:batches.reduce((s,b)=>s+b.value,0),units:batches.reduce((s,b)=>s+b.units,0)};
   if(maximumOnly||batches.every(batch=>batch.value===independent.value&&batch.units===independent.units))return plan;
   if(plan.consumedValue!==target*requiredValue)return null;
   // Exact-value batches already attain the universal value lower bound. A
   // scarce-stock relaxation can additionally prove their minimum total units.
   for(let index=0;index<records.length;index++){
    if(!batches.some(batch=>batch.counts[index])||records[index].quantity>64)continue;
    if(blueprintScarcityUnitBound(records,requiredValue,clauseCount,target,index)===plan.units)return plan;
   }
   return null;
  }

  function blueprintScarcityUnitBound(records,value,clauseCount,target,scarce){
   if(!records.every(record=>Number.isInteger(record.unitValue)))return null;
   const bits=Array.from({length:clauseCount},(_,index)=>1<<index);
   // Drop duplicate/implied coverage clauses without changing legal batches.
   const essential=bits.filter((bit,index)=>!bits.some((other,otherIndex)=>other!==bit&&records.every(record=>!(record.mask&other)||record.mask&bit)&&(otherIndex<index||records.some(record=>record.mask&bit&&!(record.mask&other)))));
   const width=1<<essential.length,limit=Math.min(records[scarce].quantity,Math.floor(value*target/records[scarce].unitValue));
   const stride=width*(limit+1),size=(value+1)*stride,infinity=1000000000;
   if(size>2000000||limit>64)return null;
   const dp=new Int32Array(size).fill(infinity);dp[0]=0;
   for(let index=0;index<records.length;index++){
    const record=records[index],mask=essential.reduce((covered,bit,cursor)=>covered|(record.mask&bit?1<<cursor:0),0);
    let remaining=Math.min(record.quantity,Math.floor(value/record.unitValue));
    for(let chunk=1;remaining;chunk*=2){
     const take=Math.min(chunk,remaining);remaining-=take;
     const price=take*record.unitValue,usage=index===scarce?take:0;
     for(let total=value-price;total>=0;total--)for(let used=0;used<=limit-usage;used++)for(let covered=0;covered<width;covered++){
      const prior=dp[total*stride+used*width+covered];if(prior===infinity)continue;
      const next=(total+price)*stride+(used+usage)*width+(covered|mask);
      if(prior+take<dp[next])dp[next]=prior+take;
     }
    }
   }
   const costs=Array.from({length:limit+1},(_,used)=>dp[value*stride+used*width+width-1]);
   let total=Array(limit+1).fill(infinity);total[0]=0;
   // Other materials may be reused across relaxed batches; only this stock is
   // shared. Thus this lower bound can never exceed a real feasible plan.
   for(let batch=0;batch<target;batch++){
    const next=Array(limit+1).fill(infinity);
    for(let used=0;used<=limit;used++)if(total[used]<infinity)for(let count=0;count<=limit-used;count++)next[used+count]=Math.min(next[used+count],total[used]+costs[count]);
    total=next;
   }
   return Math.min(...total);
  }

  function allocate(originalRecords,requiredValue,clauseCount,requestedQuantity,maximumOnly,limit){
    const fullMask=(1<<clauseCount)-1;
    // Fingerprints distinguish provenance, but equal value/coverage is identical for
    // allocation. Solve once per mechanical class, then allocate back to real stacks.
    const groups=new Map();
    for(const record of originalRecords){
      const key=`${record.mask}|${record.unitValue}`;
      if(!groups.has(key))groups.set(key,{...record,quantity:0,members:[]});
      const group=groups.get(key);group.quantity+=record.quantity;group.members.push({...record});
    }
    const records=[...groups.values()];
    const solveTarget=target=>{
      const memo=new Map();
      const frameFor=(current,needed)=>{
      const key=current.map(record=>record.quantity).join(',');
      const upper=blueprintMaterialUpperBound(current,requiredValue,fullMask,clauseCount);
        const memoKey=`${key}|${needed}`;
        const candidates=needed>0&&upper>=needed?blueprintBatchCandidates(current,requiredValue,fullMask,clauseCount,needed-1):[][Symbol.iterator]();
        return {memoKey,current,needed,candidates,best:needed===0?{quantity:0,consumedValue:0,units:0,batch:null,tail:null}:null,pending:null};
      };
      const initialKey=`${records.map(record=>record.quantity).join(',')}|${target}`;
      const frames=[frameFor(records,target)];
      while(frames.length){
        const frame=frames[frames.length-1];
        if(frame.pending){
          if(!memo.has(frame.pending.memoKey)){frames.push(frameFor(frame.pending.remaining,frame.needed-1));continue;}
          const tail=memo.get(frame.pending.memoKey);
          if(tail){
            const candidate=frame.pending.candidate;
            const plan={quantity:1+tail.quantity,consumedValue:candidate.value+tail.consumedValue,units:candidate.units+tail.units,batch:candidate,tail};
            if(maximumOnly)return {quantity:target}; // A complete feasible leaf proves this target.
            if(blueprintBatchPlanIsBetter(plan,frame.best))frame.best=plan;
          }
          frame.pending=null;
          continue;
        }
        const next=frame.candidates.next();
        if(next.done){
          // Cache eviction changes only repeated work, never the selected plan.
          if(memo.size>=5000)memo.delete(memo.keys().next().value);
          memo.set(frame.memoKey,frame.best);frames.pop();continue;
        }
        const candidate=next.value;
        const remaining=frame.current.map((record,index)=>({...record,quantity:record.quantity-candidate.counts[index]}));
        const memoKey=`${remaining.map(record=>record.quantity).join(',')}|${frame.needed-1}`;
        frame.pending={candidate,remaining,memoKey};
      }
      return memo.get(initialKey);
    };
    const upper=Math.min(limit,blueprintMaterialUpperBound(records,requiredValue,fullMask,clauseCount));
    let winner=null;
    if(records.length===1&&records[0].mask===fullMask){
      const unitsEach=Math.ceil(requiredValue/records[0].unitValue);
      const maximum=Math.floor(records[0].quantity/unitsEach);
      if(maximumOnly)return {quantity:Math.min(maximum,upper)};
      const target=requestedQuantity ?? Math.min(maximum,upper);
      if(target<=maximum){
        winner={quantity:0,consumedValue:0,units:0,batch:null,tail:null};
        for(let count=0;count<target;count++)winner={quantity:winner.quantity+1,consumedValue:winner.consumedValue+unitsEach*records[0].unitValue,units:winner.units+unitsEach,batch:{counts:[unitsEach],value:unitsEach*records[0].unitValue,units:unitsEach},tail:winner};
      }
    }else if(records.every(record=>record.mask===fullMask&&record.unitValue>=requiredValue)){
      if(maximumOnly)return {quantity:upper};
      let needed=requestedQuantity ?? upper;
      if(needed<=upper){
        winner={quantity:0,consumedValue:0,units:0,batch:null,tail:null};
        const sorted=records.map((record,index)=>({record,index})).sort((a,b)=>a.record.unitValue-b.record.unitValue||a.index-b.index);
        for(const {record,index} of sorted){
          const amount=Math.min(record.quantity,needed);
          for(let count=0;count<amount;count+=1){
            const counts=Array(records.length).fill(0);counts[index]=1;
            winner={quantity:winner.quantity+1,consumedValue:winner.consumedValue+record.unitValue,units:winner.units+1,batch:{counts,value:record.unitValue,units:1},tail:winner};
          }
          needed-=amount;if(!needed)break;
        }
      }
    }else if(maximumOnly&&requestedQuantity===undefined){
      const feasible=quantity=>certifiedBlueprintBatchPlan(records,requiredValue,fullMask,clauseCount,quantity,true)
        ||globalThis.SoulBlueprintBatchOptimizer?.(records,requiredValue,fullMask,quantity)||solveTarget(quantity);
      if(upper===0||feasible(upper))return {quantity:upper};
      // Removing a finished batch always leaves a feasible smaller plan.
      let low=0,high=upper-1;
      while(low<high){
        const middle=Math.ceil((low+high)/2);
        if(feasible(middle))low=middle;
        else high=middle-1;
      }
      return {quantity:low};
    }else{
      // Asking for the largest full bill uses the same planner as entering its quantity.
      const minimum=requestedQuantity??1;
      for(let target=requestedQuantity??upper;target>=minimum&&target<=upper&&!winner;target--){
        const certified=certifiedBlueprintBatchPlan(records,requiredValue,fullMask,clauseCount,target)??globalThis.SoulBlueprintBatchOptimizer?.(records,requiredValue,fullMask,target);
        if(certified){
          winner={quantity:0,consumedValue:0,units:0,batch:null,tail:null};
          for(let index=certified.batches.length-1;index>=0;index--){
            const batch=certified.batches[index];
            winner={quantity:winner.quantity+1,consumedValue:winner.consumedValue+batch.value,units:winner.units+batch.units,batch,tail:winner};
          }
        }else winner=solveTarget(target);
      }
    }
    winner=winner??{quantity:0,consumedValue:0,units:0,batch:null,tail:null};
    if(maximumOnly)return {quantity:winner.quantity};
    const batches=[];
    for(let cursor=winner;cursor?.batch;cursor=cursor.tail){
      const allocations=[];
      cursor.batch.counts.forEach((quantity,index)=>{
        for(const member of records[index].members){
          const used=Math.min(quantity,member.quantity);
          if(used){allocations.push({fingerprint:member.fingerprint,quantity:used});member.quantity-=used;quantity-=used;}
          if(!quantity)break;
        }
      });
      batches.push({value:cursor.batch.value,surplus:cursor.batch.value-requiredValue,allocations});
    }
    const totals={};
    for(const batch of batches)for(const allocation of batch.allocations)totals[allocation.fingerprint]=(totals[allocation.fingerprint]??0)+allocation.quantity;
    return {quantity:batches.length,batches,allocations:Object.entries(totals).map(([fingerprint,quantity])=>({fingerprint,quantity})),consumedValue:winner.consumedValue};
  }

  return Object.freeze({allocate});
});
