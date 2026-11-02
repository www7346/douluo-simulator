import type {LegacyHighs} from 'highs';

interface Material {mask:number;unitValue:number;quantity:number}
interface Pattern {anchors:number[];counts:number[];value:number;units:number}
const MAX_PATTERNS=9000;

// A mandatory cover reserves physical stacks. Other units may use any remaining
// stock of their price. Every legal bill of materials has such a decomposition.
function covers(records:Material[],fullMask:number){
  const minimal:number[][]=[];
  for(let bit=1;bit<=fullMask;bit*=2){
    if(!(fullMask&bit))continue;
    const owners=records.flatMap((r,i)=>r.mask&bit?[i]:[]);
    if(!owners.length)return [];
    if(minimal.some(a=>a.every(i=>owners.includes(i))))continue;
    for(let i=minimal.length-1;i>=0;i--)if(owners.every(id=>minimal[i].includes(id)))minimal.splice(i,1);
    minimal.push(owners);
  }
  const result=new Map<string,number[]>();
  let steps=0;
  function visit(picked:number[],missing:number[][]){
    if(++steps>25000||result.size>180)return;
    if(!missing.length){
      const ids=[...picked].sort((a,b)=>a-b);
      if(ids.every(i=>ids.filter(j=>j!==i).reduce((mask,j)=>mask|records[j].mask,0)!==fullMask))result.set(ids.join(','),ids);
      return;
    }
    for(const id of missing[0])visit([...picked,id],missing.filter(g=>!g.includes(id)));
  }
  visit([],minimal.sort((a,b)=>a.length-b.length));
  return steps>25000||result.size>180?[]:[...result.values()];
}

export function optimizeBlueprint(solver:LegacyHighs,records:Material[],required:number,fullMask:number,target:number){
  if(target<8||target>64||records.length<6||records.length>80||fullMask>1023||required>4096)return null;
  const values=[...new Set(records.map(r=>r.unitValue))].sort((a,b)=>a-b);
  if(values.length>12||!values.every(v=>Number.isSafeInteger(v)&&v>0))return null;
  const anchors=covers(records,fullMask);
  if(!anchors.length)return null;
  const priceIndex=records.map(r=>values.indexOf(r.unitValue));
  const stock=values.map(v=>records.reduce((n,r)=>n+(r.unitValue===v?r.quantity:0),0));
  const maxValue=Math.max(...values);
  const weight=1+target*Math.max(records.length,Math.ceil((required+maxValue)/values[0]));
  if(!Number.isSafeInteger(weight*target*(required+maxValue)))return null;
  function solve(slack:number){
    const patterns:Pattern[]=[],max=required+slack;
    let visits=0;
    function fill(a:number[],counts:number[],i:number,value:number,units:number){
      if(++visits>1_500_000||patterns.length>MAX_PATTERNS||value>max)return;
      if(i===values.length){if(value>=required)patterns.push({anchors:a,counts:[...counts],value,units});return;}
      const before=counts[i],n=Math.min(stock[i]-before,Math.floor((max-value)/values[i]));
      for(let extra=0;extra<=n;extra++){
        counts[i]=before+extra;fill(a,counts,i+1,value+extra*values[i],units+extra);
        if(visits>1_500_000||patterns.length>MAX_PATTERNS)break;
      }
      counts[i]=before;
    }
    for(const a of anchors){const counts=values.map(()=>0);for(const id of a)counts[priceIndex[id]]++;
      fill(a,counts,0,a.reduce((v,id)=>v+records[id].unitValue,0),a.length);
      if(visits>1_500_000||patterns.length>MAX_PATTERNS)return null;
    }
    if(!patterns.length)return null;
    const constraints=new Map<string,string[]>(),limits=new Map<string,number>();
    function term(k:string,coefficient:number,id:string,limit:number){
      if(!constraints.has(k))constraints.set(k,[]);constraints.get(k)!.push(coefficient+' '+id);limits.set(k,limit);
    }
    const names=patterns.map((_,i)=>'p'+i);
    const objective=patterns.map((p,i)=>{
      p.counts.forEach((n,j)=>{if(n)term('price'+j,n,names[i],stock[j]);});
      p.anchors.forEach(j=>term('stock'+j,1,names[i],records[j].quantity));
      return ((p.value-required)*weight+p.units)+' '+names[i];
    });
    const model=['Minimize',' cost: '+objective.join(' + '),'Subject To',' count: '+names.join(' + ')+' = '+target,
      ...[...constraints].map(([k,terms])=>k+': '+terms.join(' + ')+' <= '+limits.get(k)),'Generals',' '+names.join(' '),'End'].join('\n');
    const solved=solver.solve(model,{output_flag:false,time_limit:4,threads:1,mip_rel_gap:0,random_seed:1});
    if(solved.Status!=='Optimal')return null;
    const chosen:Pattern[]=[];
    for(let i=0;i<names.length;i++){
      const raw=solved.Columns[names[i]]?.Primal??0,n=Math.round(raw);
      if(!Number.isFinite(raw)||Math.abs(n-raw)>1e-6||n<0||n>target||chosen.length+n>target)return null;
      for(let j=0;j<n;j++)chosen.push(patterns[i]);
    }
    if(chosen.length!==target)return null;
    const excess=chosen.reduce((s,p)=>s+p.value-required,0);
    return {chosen,excess};
  }
  // Once the single-batch excess bound covers the entire feasible plan's
  // excess, any omitted batch would cost more than the whole plan can spare.
  let slack=4;
  let solution=solve(slack);
  if(!solution){slack=16;solution=solve(slack);}
  if(!solution)return null;
  if(solution.excess>slack){slack=solution.excess;solution=solve(slack);}
  if(!solution||solution.excess>slack)return null;
  const needed=solution.chosen.map(p=>[...p.counts]),available=records.map(r=>r.quantity);
  const counts=solution.chosen.map((p,i)=>{
    const row=records.map(()=>0);
    for(const id of p.anchors){row[id]++;available[id]--;needed[i][priceIndex[id]]--;}
    return row;
  });
  if(available.some(n=>n<0))return null;
  for(let i=0;i<counts.length;i++)for(let j=0;j<records.length;j++){
    const k=priceIndex[j],n=Math.min(needed[i][k],available[j]);counts[i][j]+=n;available[j]-=n;needed[i][k]-=n;
  }
  if(needed.some(row=>row.some(n=>n!==0)))return null;
  const batches=counts.map(row=>({counts:row,units:row.reduce((a,b)=>a+b,0),value:row.reduce((n,q,j)=>n+q*records[j].unitValue,0)}))
    .sort((a,b)=>a.value-b.value||a.units-b.units||JSON.stringify(a.counts).localeCompare(JSON.stringify(b.counts)));
  if(batches.some(batch=>batch.value<required||batch.counts.reduce((m,n,i)=>n?m|records[i].mask:m,0)!==fullMask))return null;
  return {quantity:target,batches,consumedValue:batches.reduce((n,b)=>n+b.value,0),units:batches.reduce((n,b)=>n+b.units,0)};
}
