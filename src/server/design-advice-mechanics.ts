import {rules} from '../rules';

interface Row {effectId:string;params?:any;branchId?:string;activation?:string}
const structural=new Set(['release','targeting','check']);
const defaultShells=new Set(['release.touch','target.self','target.single','check.physical_attack','check.save']);
const same=(a:any,b:any)=>rules.abilities.hash(a)===rules.abilities.hash(b);
/** Only a registered same-branch dependency can justify replacing an invalid
 * generated shell. Payloads, branches and arbitrary stronger shells never qualify. */
export function requiredStructureCorrections(input:Row[]){
 const rows=structuredClone(input),changes:Array<{before:string;after:string;branchId?:string}>=[];
 const group=(row:Row)=>JSON.stringify([row.branchId??null,row.activation??'active']);
 for(const identity of new Set(rows.map(group))){
  const scoped=rows.filter(row=>group(row)===identity);
  const required=new Set<string>(scoped.flatMap(row=>rules.effects.EFFECT_REGISTRY[row.effectId]?.requires??[]));
  for(const family of structural){
   const expected=[...required].filter(id=>rules.effects.EFFECT_REGISTRY[id]?.family===family);
   const existing=scoped.filter(row=>rules.effects.EFFECT_REGISTRY[row.effectId]?.family===family);
   if(expected.length!==1||existing.length!==1||existing[0].effectId===expected[0]||!defaultShells.has(expected[0]))continue;
   const row=existing[0];changes.push({before:row.effectId,after:expected[0],branchId:row.branchId});row.effectId=expected[0];row.params=rules.effects.normalizeEffectParams(row.effectId,{},row.activation??'active');
  }
 }
 return {rows,changes};
}
/** An invalid/unknown node is not permission to invent a payload. Keep exact
 * registered occurrence ceilings per branch, including registered nodes whose
 * parameters need repair. Only a missing default structural shell may be added;
 * projectile/area/domain/extra targets or stronger checks are not format fixes. */
export function assertDesignRepairNodeEnvelope(before:Row[],after:Row[]):void {
 const fx=rules.effects,key=(row:Row)=>JSON.stringify([row.branchId??null,row.activation??'active']);
 const groups=new Set(before.map(key)),counts=new Map<string,number>(),families=new Set<string>(),added=new Set<string>();
 for(const row of before){const definition=fx.EFFECT_REGISTRY[row.effectId];if(!definition)continue;const group=key(row),id=group+':'+row.effectId;counts.set(id,(counts.get(id)??0)+1);families.add(group+':'+definition.family);}
 for(const row of after){
  const definition=fx.EFFECT_REGISTRY[row.effectId];if(!definition)throw Error('结构修复仍含未登记的效果节点');
  const group=key(row),id=group+':'+row.effectId,count=counts.get(id)??0;
  if(count){counts.set(id,count-1);continue;}
  const family=group+':'+definition.family,defaults=fx.normalizeEffectParams(row.effectId,{},row.activation??'active');
  const defaultParams=Object.entries(row.params??{}).every(([name,value])=>Object.hasOwn(defaults,name)&&same(value,defaults[name]));
  if(!groups.has(group)||!structural.has(definition.family)||!defaultShells.has(row.effectId)||families.has(family)||added.has(family)||!defaultParams)throw Error('结构修复不能新增原无的机械效果、次数或分支：'+row.effectId);
  added.add(family);
 }
 if([...counts.values()].some(count=>count>0))throw Error('结构修复不能删掉原已登记的效果或次数；请保留同一节点修正非法参数');
}

/** Recover only explicitly typed, registered penalty declarations, never infer
 * mechanics from prose. They remain subject to the same occurrence, parameter,
 * branch, source and budget checks as ordinary proposal nodes. */
export function declaredContractRepairEffects(rows:Row[]):Row[]{
 const result=structuredClone(rows),existing=new Map<string,number>(),seen=new Map<string,number>();
 const key=(r:Row)=>JSON.stringify([r.effectId,r.params??{},r.branchId??null,r.activation??'active']);
 for(const row of rows)existing.set(key(row),(existing.get(key(row))??0)+1);
 let visits=0;
 for(const row of rows.filter(r=>r.effectId==='trigger.contract')){
  const visit=(value:any,depth:number)=>{
   if(++visits>256||depth>8)throw Error('嵌套效果声明超过设计上限');
   let effectId:any,params:any;
   if(Array.isArray(value)&&value.length===2&&typeof value[0]==='string'){effectId=value[0];params=value[1];}
   else if(value&&typeof value==='object'&&!Array.isArray(value)&&typeof value.effectId==='string'&&Object.keys(value).every(k=>['effectId','params'].includes(k))){effectId=value.effectId;params=value.params;}
   if(effectId&&params&&typeof params==='object'&&!Array.isArray(params)&&rules.effects.EFFECT_REGISTRY[effectId]){
    const normalized=rules.effects.normalizeEffectParams(effectId,params,row.activation??'active');
    if(rules.effects.contractPenalty({effectId,params:normalized})){
     const found={effectId,params:structuredClone(params),branchId:row.branchId,activation:row.activation},id=key(found),count=(seen.get(id)??0)+1;seen.set(id,count);if(count>(existing.get(id)??0))result.push(found);return;
    }
   }
   if(value&&typeof value==='object')for(const child of Object.values(value))visit(child,depth+1);
  };
  visit(row.params,0);
 }
 if(result.length>40)throw Error('声明的效果超过完整设计上限');return result;
}
